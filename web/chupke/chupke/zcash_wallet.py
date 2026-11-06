"""Detect shielded testnet deposits.

Design: every user pays the same shielded unified address and puts their
deposit code (CHUPKE-XXXXXXXX) in the encrypted memo. Only the wallet holder
can read memos, so nobody watching the chain can link a payment to a
Telegram user.

Ideal production setup: the bot server holds only a viewing key (UFVK) and
the spend key stays offline. zingo-cli can import a UFVK as a watch-only
wallet; do that if a mentor confirms it works on today's testnet.

!! VERIFY AT THE VENUE: zingo-cli's command names and JSON fields change
between releases. Run `python -m chupke.zcash_wallet` and fix
`_parse_transfers` to match what your installed version prints. It should
take 5 minutes.
"""
from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

from .ledger import Deposit

log = logging.getLogger(__name__)


class ZingoWallet:
    def __init__(self, cli: str, data_dir: str, server: str):
        self.base = [cli, "--chain", "testnet", "--server", server, "--data-dir", data_dir]

    async def _run(self, *cmd: str) -> str:
        proc = await asyncio.create_subprocess_exec(
            *self.base, *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        out, err = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"zingo-cli {' '.join(cmd)} failed: {err.decode()[-500:]}")
        return out.decode()

    async def scan(self) -> list[Deposit]:
        await self._run("sync", "run")
        raw = await self._run("value_transfers")
        return _parse_transfers(raw)


def _parse_transfers(raw: str) -> list[Deposit]:
    """Pull incoming shielded transfers with memos out of zingo-cli output."""
    # zingo-cli may print log lines before the JSON; start at the first bracket.
    starts = [i for i in (raw.find("["), raw.find("{")) if i >= 0]
    start = min(starts) if starts else 0
    try:
        data = json.loads(raw[start:])
    except json.JSONDecodeError:
        log.warning("Could not parse zingo-cli output; adjust _parse_transfers. Got: %s", raw[:300])
        return []
    items = data.get("value_transfers", data) if isinstance(data, dict) else data
    deposits = []
    for vt in items or []:
        kind = str(vt.get("kind", vt.get("type", ""))).lower()
        if "receiv" not in kind and "incoming" not in kind:
            continue
        pool = str(vt.get("pool", vt.get("pool_type", "shielded"))).lower()
        if "transparent" in pool:
            continue  # only shielded deposits count; that is the point of the app
        memos = vt.get("memos") or [vt.get("memo", "")]
        deposits.append(
            Deposit(
                txid=str(vt.get("txid")),
                zats=int(vt.get("value", vt.get("amount", 0))),
                memo=" ".join(m for m in memos if m),
            )
        )
    return deposits


class DevWallet:
    """Reads deposits from a JSON file. For local testing only, never for the demo:
    a demo with this backend scores Works 1 (mocked)."""

    def __init__(self, path: str):
        self.path = Path(path)

    async def scan(self) -> list[Deposit]:
        if not self.path.exists():
            return []
        return [Deposit(**d) for d in json.loads(self.path.read_text())]


def make_wallet(settings):
    if settings.wallet_backend == "dev":
        log.warning("DEV wallet backend in use: deposits are NOT real. Do not demo with this.")
        return DevWallet(settings.dev_deposits_file)
    return ZingoWallet(settings.zingo_cli, settings.zingo_data_dir, settings.lightwalletd)


if __name__ == "__main__":  # quick check of the real wallet at the venue
    from . import config

    s = config.load()
    w = ZingoWallet(s.zingo_cli, s.zingo_data_dir, s.lightwalletd)
    for d in asyncio.run(w.scan()):
        print(d)
