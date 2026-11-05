"""Bitrefill through its MCP server, held as a local MCP client session.

Why a local client instead of the API's server-side MCP connector: our code
must sit between the model and `buy-products`. The model only gets the
read-only tools. Buying happens in bot.py after the user taps Confirm,
Scam Shield passes and funds are held.

!! VERIFY AT THE VENUE: run `python -m chupke.bitrefill` to print the real
tool schemas, then fix the argument names in `buy()` if they differ.
"""
from __future__ import annotations

import asyncio
import json
import logging
from contextlib import AsyncExitStack

from anthropic.lib.tools.mcp import async_mcp_tool
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

log = logging.getLogger(__name__)

READ_ONLY_TOOLS = {"search-products", "get-product-details", "get-invoice-by-id"}


class Bitrefill:
    def __init__(self, url: str, payment_method: str = "balance"):
        self.url = url
        self.payment_method = payment_method
        self._stack = AsyncExitStack()
        self.session: ClientSession | None = None
        self.tools = []

    async def start(self) -> None:
        read, write, *_ = await self._stack.enter_async_context(streamable_http_client(self.url))
        self.session = await self._stack.enter_async_context(ClientSession(read, write))
        await self.session.initialize()
        self.tools = (await self.session.list_tools()).tools
        log.info("Bitrefill MCP tools: %s", [t.name for t in self.tools])

    async def close(self) -> None:
        await self._stack.aclose()

    def agent_tools(self):
        """Read-only Bitrefill tools the model may call by itself."""
        return [async_mcp_tool(t, self.session) for t in self.tools if t.name in READ_ONLY_TOOLS]

    async def _call(self, name: str, args: dict) -> dict:
        res = await self.session.call_tool(name, args)
        text = "".join(getattr(c, "text", "") for c in res.content)
        if res.isError:
            raise RuntimeError(f"{name} failed: {text[:500]}")
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"raw": text}

    async def buy(self, product_id: str, value: float, package_id: str | None = None) -> dict:
        # Shape from Bitrefill's CLI docs: cart_items '{"product_id": "steam-usa", "package_id": 10}'
        # where package_id is the denomination. Check `python -m chupke.bitrefill` at the venue.
        item = {"product_id": product_id, "package_id": package_id or _num(value)}
        return await self._call(
            "buy-products",
            {"cart_items": [item], "payment_method": self.payment_method, "return_payment_link": False},
        )

    async def wait_for_codes(self, invoice_id: str, timeout_s: int = 120) -> dict:
        """Poll the invoice until it completes; returns the invoice (with orders and codes)."""
        loop = asyncio.get_running_loop()
        deadline = loop.time() + timeout_s
        while True:
            inv = await self._call("get-invoice-by-id", {"invoice_id": invoice_id})
            status = str(inv.get("status", inv.get("invoice", {}).get("status", ""))).lower()
            if status in {"complete", "completed"}:
                return inv
            if status in {"failed", "expired", "cancelled", "canceled"}:
                raise RuntimeError(f"invoice {invoice_id} ended as {status}")
            if loop.time() > deadline:
                raise TimeoutError(f"invoice {invoice_id} still {status or 'pending'}")
            await asyncio.sleep(3)


def _num(v: float):
    return int(v) if float(v).is_integer() else v


def find_invoice_id(result: dict) -> str | None:
    for key in ("invoice_id", "id"):
        if key in result:
            return str(result[key])
    inv = result.get("invoice")
    if isinstance(inv, dict):
        return find_invoice_id(inv)
    return None


def find_redemption(invoice: dict) -> list[str]:
    """Collect anything that looks like a code, PIN or redemption link from an invoice."""
    found: list[str] = []

    def walk(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if isinstance(v, str) and any(w in k.lower() for w in ("code", "pin", "link", "redemption")):
                    found.append(f"{k}: {v}")
                else:
                    walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)

    walk(invoice.get("orders", invoice))
    return found


if __name__ == "__main__":  # print the real tool schemas
    import os

    async def _main():
        b = Bitrefill(os.environ["BITREFILL_MCP_URL"])
        await b.start()
        for t in b.tools:
            print(f"\n## {t.name}\n{t.description}\n{json.dumps(t.inputSchema, indent=2)}")
        await b.close()

    asyncio.run(_main())
