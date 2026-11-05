"""Gift links: buy a voucher for someone else without the code ever passing through the sender.

The voucher code is encrypted with a key that exists only inside the claim link
(t.me/<bot>?start=g_<id>_<key>). The database holds ciphertext, so the server
can't read a gift without the link. One claim per gift, then the record is wiped.
"""
from __future__ import annotations

import base64
import os
import secrets
import sqlite3
import time

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

SCHEMA = """
CREATE TABLE IF NOT EXISTS gifts (
    gift_id TEXT PRIMARY KEY,
    sender_hash TEXT NOT NULL,
    nonce BLOB NOT NULL,
    ciphertext BLOB NOT NULL,
    created_at INTEGER NOT NULL,
    claimed_at INTEGER
);
"""
GIFT_TTL_S = 30 * 86400


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


class GiftVault:
    def __init__(self, path: str):
        self._db = sqlite3.connect(path, isolation_level=None, check_same_thread=False)
        self._db.executescript(SCHEMA)

    def create(self, sender_hash: str, payload: str) -> str:
        """Encrypt payload (product name, note, codes) and return the start parameter for the link."""
        gift_id = secrets.token_hex(4)
        key = AESGCM.generate_key(bit_length=128)
        nonce = os.urandom(12)
        ct = AESGCM(key).encrypt(nonce, payload.encode(), gift_id.encode())
        self._db.execute(
            "INSERT INTO gifts(gift_id, sender_hash, nonce, ciphertext, created_at) VALUES (?,?,?,?,?)",
            (gift_id, sender_hash, nonce, ct, int(time.time())),
        )
        return f"g_{gift_id}_{_b64(key)}"  # about 33 chars, inside Telegram's 64-char limit

    def claim(self, start_param: str) -> tuple[str, str] | None:
        """Return (sender_hash, payload) once, then wipe the ciphertext. None if invalid or used."""
        try:
            _, gift_id, key_b64 = start_param.split("_", 2)
            key = _unb64(key_b64)
        except ValueError:
            return None
        self._db.execute("BEGIN IMMEDIATE")
        row = self._db.execute(
            "SELECT sender_hash, nonce, ciphertext, created_at FROM gifts WHERE gift_id=? AND claimed_at IS NULL",
            (gift_id,),
        ).fetchone()
        if not row or time.time() - row[3] > GIFT_TTL_S:
            self._db.execute("ROLLBACK")
            return None
        try:
            payload = AESGCM(key).decrypt(row[1], row[2], gift_id.encode()).decode()
        except Exception:
            self._db.execute("ROLLBACK")
            return None
        self._db.execute(
            "UPDATE gifts SET claimed_at=?, ciphertext=X'', nonce=X'' WHERE gift_id=?",
            (int(time.time()), gift_id),
        )
        self._db.execute("COMMIT")
        return row[0], payload
