"""Shagun Pool: anonymous group gifting with shielded ZEC.

Friends pay shielded ZEC with the pool's memo code. The bot never learns who
paid (shielded senders are hidden), and it stores no per-contribution amounts,
only a running total and a count. The total is shown only once at least
MIN_REVEAL people have contributed, so one person's amount can't be read off it.
"""
from __future__ import annotations

import secrets
import sqlite3
import time

from .ledger import Deposit

MIN_REVEAL = 3

SCHEMA = """
CREATE TABLE IF NOT EXISTS pools (
    code TEXT PRIMARY KEY,
    organizer_hash TEXT NOT NULL,
    title TEXT NOT NULL,
    target_zats INTEGER NOT NULL,
    total_zats INTEGER NOT NULL DEFAULT 0,
    contributors INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',   -- open | closed
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pool_seen (txid TEXT PRIMARY KEY);  -- idempotency only, no amounts
"""


class Pools:
    def __init__(self, path: str):
        self._db = sqlite3.connect(path, isolation_level=None, check_same_thread=False)
        self._db.executescript(SCHEMA)

    def create(self, organizer_hash: str, title: str, target_zats: int) -> str:
        code = "POOL-" + secrets.token_hex(4).upper()
        self._db.execute(
            "INSERT INTO pools(code, organizer_hash, title, target_zats, created_at) VALUES (?,?,?,?,?)",
            (code, organizer_hash, title[:80], target_zats, int(time.time())),
        )
        return code

    def get(self, code: str) -> dict | None:
        row = self._db.execute(
            "SELECT code, organizer_hash, title, target_zats, total_zats, contributors, status FROM pools WHERE code=?",
            (code.upper(),),
        ).fetchone()
        if not row:
            return None
        keys = ["code", "organizer_hash", "title", "target_zats", "total_zats", "contributors", "status"]
        return dict(zip(keys, row))

    def for_organizer(self, organizer_hash: str) -> list[dict]:
        codes = self._db.execute(
            "SELECT code FROM pools WHERE organizer_hash=? ORDER BY created_at DESC LIMIT 5", (organizer_hash,)
        ).fetchall()
        return [self.get(c[0]) for c in codes]

    def credit(self, dep: Deposit) -> dict | None:
        """Add a shielded contribution if its memo names an open pool. Returns the pool, or None."""
        code = _extract_pool_code(dep.memo)
        if not code or dep.zats <= 0:
            return None
        try:
            self._db.execute("BEGIN IMMEDIATE")
            self._db.execute("INSERT INTO pool_seen(txid) VALUES (?)", (dep.txid,))
            cur = self._db.execute(
                "UPDATE pools SET total_zats = total_zats + ?, contributors = contributors + 1 "
                "WHERE code=? AND status='open'",
                (dep.zats, code),
            )
            if cur.rowcount != 1:
                self._db.execute("ROLLBACK")
                return None
            self._db.execute("COMMIT")
        except sqlite3.IntegrityError:
            self._db.execute("ROLLBACK")
            return None
        return self.get(code)

    def close(self, code: str, organizer_hash: str) -> int:
        """Close the pool and return the total to move to the organizer's gift balance."""
        self._db.execute("BEGIN IMMEDIATE")
        row = self._db.execute(
            "SELECT total_zats FROM pools WHERE code=? AND organizer_hash=? AND status='open'",
            (code.upper(), organizer_hash),
        ).fetchone()
        if not row:
            self._db.execute("ROLLBACK")
            raise ValueError("no open pool with that code for you")
        self._db.execute("UPDATE pools SET status='closed' WHERE code=?", (code.upper(),))
        self._db.execute("COMMIT")
        return row[0]


def public_status(pool: dict, to_inr) -> str:
    """What anyone (including the organizer) may see about a pool."""
    n = pool["contributors"]
    target = f"Rs {to_inr(pool['target_zats']):,.0f}"
    if n >= MIN_REVEAL:
        # Rounded down to Rs 500 so one new contribution can't be read off by watching the total change.
        rounded = int(to_inr(pool["total_zats"]) // 500 * 500)
        total = f"about Rs {rounded:,} of {target}"
    else:
        total = f"total hidden until {MIN_REVEAL} people chip in (goal {target})"
    return f"{pool['title']}: {n} contribution{'s' if n != 1 else ''}, {total}. Status: {pool['status']}."


def _extract_pool_code(memo: str) -> str | None:
    memo = (memo or "").upper()
    i = memo.find("POOL-")
    code = memo[i : i + 13] if i >= 0 else ""
    return code if len(code) == 13 else None
