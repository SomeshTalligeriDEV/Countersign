"""ZIP 321 payment links (zcash:...), so any wallet (Zodl, Zingo, Noir Wallet) can pay in one tap."""
from __future__ import annotations

import base64
from urllib.parse import quote


def payment_uri(address: str, memo: str, amount_zec: float | None = None, label: str = "Chupke top-up") -> str:
    memo_b64 = base64.urlsafe_b64encode(memo.encode()).decode().rstrip("=")
    parts = [f"memo={memo_b64}", f"label={quote(label)}"]
    if amount_zec:
        parts.insert(0, f"amount={amount_zec:.8f}".rstrip("0").rstrip("."))
    return f"zcash:{address}?" + "&".join(parts)
