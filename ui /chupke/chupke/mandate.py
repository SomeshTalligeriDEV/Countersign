"""Spending rules (the "mandate") the user sets and the AI can't change.

The agent may only propose. This module decides, in plain code, whether a
proposal is bought automatically, needs a tap, or is refused.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass

SCHEMA = """
CREATE TABLE IF NOT EXISTS rules (
    uid_hash TEXT PRIMARY KEY,
    auto_under_inr REAL NOT NULL DEFAULT 0,     -- 0 = always ask
    daily_cap_inr REAL NOT NULL DEFAULT 5000,
    blocked_brands TEXT NOT NULL DEFAULT ''     -- comma separated, lower case
);
"""


@dataclass
class Rules:
    auto_under_inr: float = 0
    daily_cap_inr: float = 5000
    blocked_brands: tuple[str, ...] = ()

    def describe(self) -> str:
        auto = f"buy by myself under Rs {self.auto_under_inr:,.0f}" if self.auto_under_inr > 0 else "always ask you first"
        blocked = ", ".join(self.blocked_brands) or "none"
        return (
            f"Your rules:\n- I {auto}\n- Daily limit: Rs {self.daily_cap_inr:,.0f}\n- Blocked brands: {blocked}\n\n"
            "Change them: /autobuy 200 · /dailycap 2000 · /block apple · /unblock apple"
        )


class RuleStore:
    def __init__(self, path: str):
        self._db = sqlite3.connect(path, isolation_level=None, check_same_thread=False)
        self._db.executescript(SCHEMA)

    def get(self, uid_hash: str) -> Rules:
        row = self._db.execute(
            "SELECT auto_under_inr, daily_cap_inr, blocked_brands FROM rules WHERE uid_hash=?", (uid_hash,)
        ).fetchone()
        if not row:
            return Rules()
        return Rules(row[0], row[1], tuple(b for b in row[2].split(",") if b))

    def set(self, uid_hash: str, rules: Rules) -> None:
        self._db.execute(
            "INSERT INTO rules(uid_hash, auto_under_inr, daily_cap_inr, blocked_brands) VALUES (?,?,?,?) "
            "ON CONFLICT(uid_hash) DO UPDATE SET auto_under_inr=excluded.auto_under_inr, "
            "daily_cap_inr=excluded.daily_cap_inr, blocked_brands=excluded.blocked_brands",
            (uid_hash, max(0.0, rules.auto_under_inr), max(0.0, rules.daily_cap_inr), ",".join(rules.blocked_brands)),
        )


def decide(rules: Rules, product_name: str, total_inr: float, spent_today_inr: float,
           is_gift: bool, cooloff_reasons: list[str]) -> tuple[str, str]:
    """Return (action, reason). action is 'auto', 'ask' or 'deny'."""
    name = (product_name or "").lower()
    for brand in rules.blocked_brands:
        if brand and brand in name:
            return "deny", f"you blocked {brand}"
    if spent_today_inr + total_inr > rules.daily_cap_inr:
        left = max(0.0, rules.daily_cap_inr - spent_today_inr)
        return "deny", f"over your daily limit (Rs {left:,.0f} left today)"
    if cooloff_reasons:
        return "ask", "safety pause: " + ", ".join(cooloff_reasons)
    if is_gift:
        return "ask", "gifts always need your tap"
    if rules.auto_under_inr > 0 and total_inr <= rules.auto_under_inr:
        return "auto", f"under your auto-buy limit of Rs {rules.auto_under_inr:,.0f}"
    return "ask", "needs your OK"
