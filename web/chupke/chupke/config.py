"""Settings, read from environment variables (see .env.example)."""
from __future__ import annotations

import os
from dataclasses import dataclass

try:  # optional: load a local .env when python-dotenv is installed
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover
    pass


def _req(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable {name}")
    return value


@dataclass(frozen=True)
class Settings:
    telegram_token: str
    bitrefill_mcp_url: str  # https://api.bitrefill.com/mcp/<API_KEY>
    # Shielded unified address users pay into (testnet, starts with "utest1").
    deposit_address: str
    # Salt for hashing Telegram user ids before they touch the database.
    uid_salt: str
    db_path: str = "chupke.sqlite3"
    model: str = "claude-opus-5-5"
    # zingo | dev  ("dev" reads deposits from a JSON file - local testing only, never for the demo)
    wallet_backend: str = "zingo"
    zingo_cli: str = "zingo-cli"
    zingo_data_dir: str = "./zingo-wallet"
    lightwalletd: str = "https://testnet.zec.rocks:443"
    dev_deposits_file: str = "dev_deposits.json"
    # Display rate for testnet TAZ. TAZ has no market price, so this is a
    # declared demo rate. Say so in the README and the privacy note.
    inr_per_zec: float = 3000.0
    scan_interval_s: int = 30
    code_ttl_s: int = 120  # voucher message is deleted after this many seconds
    cooloff_s: int = 600   # Scam Shield pause for risky orders
    bitrefill_payment_method: str = "balance"


def load() -> Settings:
    return Settings(
        telegram_token=_req("TELEGRAM_BOT_TOKEN"),
        bitrefill_mcp_url=_req("BITREFILL_MCP_URL"),
        deposit_address=_req("ZCASH_DEPOSIT_UA"),
        uid_salt=_req("CHUPKE_UID_SALT"),
        db_path=os.environ.get("CHUPKE_DB", "chupke.sqlite3"),
        model=os.environ.get("CHUPKE_MODEL", "claude-opus-5-5"),
        wallet_backend=os.environ.get("CHUPKE_WALLET", "zingo"),
        zingo_cli=os.environ.get("ZINGO_CLI", "zingo-cli"),
        zingo_data_dir=os.environ.get("ZINGO_DATA_DIR", "./zingo-wallet"),
        lightwalletd=os.environ.get("ZCASH_LIGHTWALLETD", "https://testnet.zec.rocks:443"),
        dev_deposits_file=os.environ.get("CHUPKE_DEV_DEPOSITS", "dev_deposits.json"),
        inr_per_zec=float(os.environ.get("CHUPKE_INR_PER_ZEC", "3000")),
        scan_interval_s=int(os.environ.get("CHUPKE_SCAN_INTERVAL", "30")),
        code_ttl_s=int(os.environ.get("CHUPKE_CODE_TTL", "120")),
        cooloff_s=int(os.environ.get("CHUPKE_COOLOFF", "600")),
        bitrefill_payment_method=os.environ.get("BITREFILL_PAYMENT_METHOD", "balance"),
    )
