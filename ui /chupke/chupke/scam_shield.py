"""Scam Shield: catch the scripts Indian gift-card and crypto scams use.

Runs in code, before and after the model, so a prompt injection cannot turn it off.
Sources for the patterns: Bengaluru "boss" Apple-voucher scam (Rs 4.35 lakh),
Pune "digital arrest" scams paid in Bitcoin / Amazon codes, Mumbai Police
gift-card advisories.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

HELP = (
    "Real police, CBI, customs, banks or bosses never ask for gift cards or crypto. "
    "If someone is pressuring you, stop and call the cybercrime helpline 1930 "
    "or report at cybercrime.gov.in."
)

# (label, regex). Kept deliberately readable so judges can audit them.
SCAM_PATTERNS: list[tuple[str, str]] = [
    ("boss_request", r"\b(boss|manager|director|ceo|sir|madam)\b.{0,40}\b(asked|told|wants|needs|said|bol[ae])\b"),
    ("for_client", r"\b(for|to) (a |the |my |our )?clients?\b"),
    ("digital_arrest", r"\b(digital arrest|arrest warrant|cbi|ncb|ed officer|enforcement directorate|cyber ?cell)\b"),
    ("police_fine", r"\b(police|customs|courier|fedex|parcel)\b.{0,40}\b(fine|penalty|clear|seized|case)\b"),
    ("kyc_update", r"\b(kyc|pan|aadhaar)\b.{0,30}\b(update|verify|block(ed)?|expire[ds]?|suspend(ed)?)\b"),
    ("send_code", r"\b(send|share|forward|bhej(o|na|do)?|de do)\b.{0,30}\b(code|codes|pin|voucher|card number)\b"),
    ("refund_or_prize", r"\b(lottery|prize|refund|cashback|reward)\b.{0,30}\b(claim|processing|fee|unlock)\b"),
    ("urgent_secret", r"\b(urgent(ly)?|jaldi|abhi ke abhi|don'?t tell|kisi ko mat|secret(ly)?)\b"),
]

# Brands scammers prefer because codes are easy to resell.
HIGH_RISK_BRANDS = re.compile(r"\b(apple|itunes|google ?play|amazon|steam|flipkart)\b", re.I)


@dataclass
class Verdict:
    action: str  # allow | warn | block
    reasons: list[str] = field(default_factory=list)

    @property
    def blocked(self) -> bool:
        return self.action == "block"


def check_message(text: str) -> Verdict:
    """Check a user message for scam scripts."""
    t = (text or "").lower()
    hits = [label for label, rx in SCAM_PATTERNS if re.search(rx, t)]
    if not hits:
        return Verdict("allow")
    strong = {"boss_request", "digital_arrest", "police_fine", "kyc_update", "send_code", "for_client"}
    if strong.intersection(hits):
        return Verdict("block", hits)
    return Verdict("warn", hits)


def needs_cooloff(product_name: str, value_inr: float, quantity: int, recent_inr: float) -> list[str]:
    """Rules for orders that wait before going through. Returns reasons (empty = no wait)."""
    reasons = []
    if HIGH_RISK_BRANDS.search(product_name or "") and value_inr >= 2000:
        reasons.append("high-risk brand above Rs 2,000")
    if quantity > 2:
        reasons.append("more than 2 cards in one order")
    if recent_inr + value_inr * quantity > 10000:
        reasons.append("more than Rs 10,000 in 24 hours")
    return reasons


RISKY_RECIPIENT = re.compile(
    r"\b(boss|manager|director|ceo|client|customer|officer|police|cbi|customs|support|"
    r"care|agent|bank|seller|buyer|recruiter|hr)\b",
    re.I,
)


def check_gift_recipient(name: str | None) -> Verdict:
    """Gift links are a scam vector when the 'recipient' is the scammer."""
    if name and RISKY_RECIPIENT.search(name):
        return Verdict("block", ["risky_gift_recipient"])
    return Verdict("allow")
