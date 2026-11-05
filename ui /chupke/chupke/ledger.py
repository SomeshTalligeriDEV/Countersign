"""Balances in zatoshis, keyed by a salted hash of the Telegram user id.

Privacy rules this file enforces:
- The raw Telegram id is never stored, only HMAC(salt, id).
- Purchases store amount and time only (needed for limits and cool-off),
  never the product, brand or voucher code.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
import time
from dataclasses import dataclass

ZATS_PER_ZEC = 100_000_000

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    uid_hash TEXT PRIMARY KEY,
    deposit_code TEXT UNIQUE NOT NULL,
    balance_zats INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS deposits (
    txid TEXT PRIMARY KEY,
    uid_hash TEXT NOT NULL,
    zats INTEGER NOT NULL,
    seen_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS spends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid_hash TEXT NOT NULL,
    zats INTEGER NOT NULL,
    at INTEGER NOT NULL,
    status TEXT NOT NULL  -- held | done | refunded
);
"""


class InsufficientFunds(Exception):
    pass


@dataclass
class Deposit:
    txid: str
    zats: int
    memo: str


class Ledger:
    def __init__(self, path: str, salt: str):
        self._db = sqlite3.connect(path, isolation_level=None, check_same_thread=False)
        self._db.executescript(SCHEMA)
        self._salt = salt.encode()

    # ---- identity -------------------------------------------------------
    def uid_hash(self, telegram_id: int) -> str:
        return hmac.new(self._salt, str(telegram_id).encode(), hashlib.sha256).hexdigest()

    def ensure_user(self, telegram_id: int) -> str:
        """Return the user's deposit code (put in the shielded memo), creating it if needed."""
        h = self.uid_hash(telegram_id)
        row = self._db.execute("SELECT deposit_code FROM users WHERE uid_hash=?", (h,)).fetchone()
        if row:
            return row[0]
        code = "CHUPKE-" + secrets.token_hex(4).upper()
        self._db.execute("INSERT INTO users(uid_hash, deposit_code) VALUES (?, ?)", (h, code))
        return code

    def balance(self, telegram_id: int) -> int:
        row = self._db.execute(
            "SELECT balance_zats FROM users WHERE uid_hash=?", (self.uid_hash(telegram_id),)
        ).fetchone()
        return row[0] if row else 0

    # ---- deposits -------------------------------------------------------
    def credit_deposit(self, dep: Deposit) -> str | None:
        """Credit a shielded deposit whose memo carries a deposit code.

        Returns the uid_hash credited, or None if the memo matches nobody or the
        txid was already credited (idempotent, so rescans are safe).
        """
        code = _extract_code(dep.memo)
        if not code or dep.zats <= 0:
            return None
        row = self._db.execute("SELECT uid_hash FROM users WHERE deposit_code=?", (code,)).fetchone()
        if not row:
            return None
        h = row[0]
        try:
            self._db.execute("BEGIN IMMEDIATE")
            self._db.execute(
                "INSERT INTO deposits(txid, uid_hash, zats, seen_at) VALUES (?,?,?,?)",
                (dep.txid, h, dep.zats, int(time.time())),
            )
            self._db.execute(
                "UPDATE users SET balance_zats = balance_zats + ? WHERE uid_hash=?", (dep.zats, h)
            )
            self._db.execute("COMMIT")
        except sqlite3.IntegrityError:
            self._db.execute("ROLLBACK")
            return None
        return h

    def credit_internal(self, uid_hash: str, zats: int) -> None:
        """Credit funds that arrived another way (a closed Shagun Pool)."""
        self._db.execute("UPDATE users SET balance_zats = balance_zats + ? WHERE uid_hash=?", (zats, uid_hash))

    # ---- spending (hold -> settle or refund) -----------------------------
    def hold(self, telegram_id: int, zats: int) -> int:
        """Atomically reserve funds before buying. Returns a spend id."""
        if zats <= 0:
            raise ValueError("amount must be positive")
        h = self.uid_hash(telegram_id)
        self._db.execute("BEGIN IMMEDIATE")
        cur = self._db.execute(
            "UPDATE users SET balance_zats = balance_zats - ? WHERE uid_hash=? AND balance_zats >= ?",
            (zats, h, zats),
        )
        if cur.rowcount != 1:
            self._db.execute("ROLLBACK")
            raise InsufficientFunds()
        cur = self._db.execute(
            "INSERT INTO spends(uid_hash, zats, at, status) VALUES (?,?,?, 'held')",
            (h, zats, int(time.time())),
        )
        self._db.execute("COMMIT")
        return cur.lastrowid

    def settle(self, spend_id: int) -> None:
        self._db.execute("UPDATE spends SET status='done' WHERE id=? AND status='held'", (spend_id,))

    def refund(self, spend_id: int) -> None:
        self._db.execute("BEGIN IMMEDIATE")
        row = self._db.execute(
            "SELECT uid_hash, zats FROM spends WHERE id=? AND status='held'", (spend_id,)
        ).fetchone()
        if row:
            self._db.execute("UPDATE spends SET status='refunded' WHERE id=?", (spend_id,))
            self._db.execute(
                "UPDATE users SET balance_zats = balance_zats + ? WHERE uid_hash=?", (row[1], row[0])
            )
        self._db.execute("COMMIT")

    def spent_since(self, telegram_id: int, seconds: int) -> int:
        row = self._db.execute(
            "SELECT COALESCE(SUM(zats),0) FROM spends WHERE uid_hash=? AND at>=? AND status!='refunded'",
            (self.uid_hash(telegram_id), int(time.time()) - seconds),
        ).fetchone()
        return row[0]


def _extract_code(memo: str) -> str | None:
    memo = (memo or "").upper()
    i = memo.find("CHUPKE-")
    if i < 0:
        return None
    code = memo[i : i + 15]
    return code if len(code) == 15 else None


def inr_to_zats(inr: float, inr_per_zec: float) -> int:
    return int(round(inr / inr_per_zec * ZATS_PER_ZEC))


def zats_to_inr(zats: int, inr_per_zec: float) -> float:
    return zats / ZATS_PER_ZEC * inr_per_zec
