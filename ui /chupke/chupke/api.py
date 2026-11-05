"""HTTP API so other agents (Pie, or anything else) can use Chupke Guard as a private wallet.

Run:  CHUPKE_API_KEY=... python -m chupke.api      (listens on :8787)

Every call is POST JSON with header  Authorization: Bearer <CHUPKE_API_KEY>
and a "user" field: the caller's stable user id (for Pie, its own user id).
The calling agent authenticates its users; Chupke trusts the API key, so keep
the key server-side and never in a phone app.

Same rules as Telegram: the model only proposes, code decides; spending rules,
Scam Shield, safety pause, duplicate stop and holds/refunds all apply.
"""
from __future__ import annotations

import asyncio
import hmac
import logging
import os
import time
from pathlib import Path
from contextlib import asynccontextmanager
from dataclasses import replace

import uvicorn
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import HTMLResponse, JSONResponse
from starlette.routing import Route
from telegram import Bot

from . import bot as core  # shares ledger, agent, rules, Bitrefill client and purchase logic
from . import scam_shield
from .zip321 import payment_uri

log = logging.getLogger("chupke.api")
API_KEY = os.environ.get("CHUPKE_API_KEY", "")


def _uid(body: dict) -> str:
    user = str(body.get("user", "")).strip()
    if not user:
        raise ValueError("missing user")
    return f"api:{user}"  # namespaced so API users never collide with Telegram ids


def _authorized(request: Request) -> bool:
    got = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    return bool(API_KEY) and hmac.compare_digest(got, API_KEY)


def endpoint(fn):
    async def handler(request: Request):
        if not _authorized(request):
            return JSONResponse({"error": "unauthorized"}, status_code=401)
        try:
            body = await request.json()
            uid = _uid(body)
        except Exception:
            return JSONResponse({"error": "send JSON with a 'user' field"}, status_code=400)
        core.ledger.ensure_user(uid)
        try:
            return JSONResponse(await fn(uid, body))
        except Exception:
            log.exception("api error")
            return JSONResponse({"error": "internal error"}, status_code=500)
    handler.raw = fn
    return handler


# ---- Pie Lite: browser voice front end, for the hackathon demo on a laptop ----
# Served at http://localhost:8787/pie. Only answers requests from this machine,
# so no API key ever reaches a browser. Off unless CHUPKE_PIE_DEMO=1.
PIE_HTML = (Path(__file__).parent / "static" / "pie.html")


def local_endpoint(handler):
    fn = handler.raw

    async def h(request: Request):
        host = request.client.host if request.client else ""
        if os.environ.get("CHUPKE_PIE_DEMO") != "1" or host not in {"127.0.0.1", "::1", "localhost", "testclient"}:
            return JSONResponse({"error": "Pie Lite is local-only"}, status_code=403)
        try:
            body = await request.json()
        except Exception:
            body = {}
        uid = f"api:pie-{str(body.get('user') or 'demo')[:40]}"
        core.ledger.ensure_user(uid)
        try:
            return JSONResponse(await fn(uid, body))
        except Exception:
            log.exception("pie error")
            return JSONResponse({"error": "internal error"}, status_code=500)
    return h


async def pie_page(request: Request):
    if os.environ.get("CHUPKE_PIE_DEMO") != "1":
        return JSONResponse({"error": "set CHUPKE_PIE_DEMO=1"}, status_code=403)
    return HTMLResponse(PIE_HTML.read_text())


@endpoint
async def deposit(uid, body):
    code = core.ledger.ensure_user(uid)
    return {
        "address": core.S.deposit_address,
        "memo": code,
        "zcash_uri": payment_uri(core.S.deposit_address, code),
        "note": "Send shielded testnet ZEC with this memo. Transparent deposits are ignored.",
    }


@endpoint
async def balance(uid, body):
    return {"balance_inr": round(core._inr_f(core.ledger.balance(uid)))}


@endpoint
async def chat(uid, body):
    """Natural-language request in; reply, plus a quote and the rules' decision if one was made."""
    text = str(body.get("text", ""))
    verdict = scam_shield.check_message(text)
    if verdict.blocked:
        return {"reply": "This looks like a known scam pattern, so I won't buy anything for it. " + scam_shield.HELP,
                "blocked": True}
    reply = await core.agent.chat(uid, text)
    if verdict.action == "warn":
        reply = "Heads up: " + scam_shield.HELP + " " + reply
    out = {"reply": reply}
    p = core.agent.pending.get(uid)
    if not p:
        return out
    action, why = core._mandate(uid, p)
    out["quote"] = {"card": p.card(), "decision": action, "reason": why,
                    "product": p.product_name, "total_inr": p.price_inr * p.quantity}
    if action == "deny":
        core.agent.pending.pop(uid, None)
    elif action == "auto":
        core.agent.pending.pop(uid, None)
        out["purchase"] = await core.execute_purchase(uid, p)
    else:
        out["next"] = "Read the card back to the user. If they say yes, call /v1/confirm."
    return out


@endpoint
async def confirm(uid, body):
    if uid in core.cooling:
        p, ready_at = core.cooling[uid]
        if time.time() < ready_at:
            return {"status": "cooling", "minutes_left": int((ready_at - time.time()) // 60) + 1}
        core.cooling.pop(uid)
    else:
        p = core.agent.pending.pop(uid, None)
        if not p:
            return {"status": "no_pending_quote"}
        action, why = core._mandate(uid, p)
        if action == "deny":
            return {"status": "denied", "reason": why}
        recent = core._inr_f(core.ledger.spent_since(uid, 86400))
        reasons = scam_shield.needs_cooloff(p.product_name, p.value_inr, p.quantity, recent)
        if reasons:
            core.cooling[uid] = (p, time.time() + core.S.cooloff_s)
            return {"status": "cooling", "reasons": reasons, "minutes_left": core.S.cooloff_s // 60,
                    "say": "Scammers rely on panic, so this order waits. " + scam_shield.HELP}
    return await core.execute_purchase(uid, p)


@endpoint
async def cancel(uid, body):
    core.agent.pending.pop(uid, None)
    core.cooling.pop(uid, None)
    return {"status": "cancelled"}


@endpoint
async def orders(uid, body):
    out = []
    for o in core.agent.recent_invoices.get(uid, [])[-5:]:
        try:
            inv = await core.bitrefill._call("get-invoice-by-id", {"invoice_id": o["invoice_id"]})
            status = inv.get("status") or inv.get("invoice", {}).get("status", "unknown")
        except Exception:
            status = "could not check"
        out.append({**o, "status": status})
    return {"orders": out}


@endpoint
async def rules(uid, body):
    h = core.ledger.uid_hash(uid)
    r = core.rule_store.get(h)
    if "auto_under_inr" in body:
        r = replace(r, auto_under_inr=float(body["auto_under_inr"]))
    if "daily_cap_inr" in body:
        r = replace(r, daily_cap_inr=float(body["daily_cap_inr"]))
    if body.get("block"):
        r = replace(r, blocked_brands=tuple(sorted(set(r.blocked_brands) | {str(body["block"]).lower()})))
    if body.get("unblock"):
        r = replace(r, blocked_brands=tuple(b for b in r.blocked_brands if b != str(body["unblock"]).lower()))
    core.rule_store.set(h, r)
    return {"auto_under_inr": r.auto_under_inr, "daily_cap_inr": r.daily_cap_inr,
            "blocked_brands": list(r.blocked_brands), "text": r.describe()}


async def _scan_loop():
    while True:
        try:
            for dep in await core.wallet.scan():
                if not core.pools.credit(dep):
                    core.ledger.credit_deposit(dep)
        except Exception:
            log.exception("deposit scan failed")
        await asyncio.sleep(core.S.scan_interval_s)


async def _startup():
    if not API_KEY and os.environ.get("CHUPKE_PIE_DEMO") != "1":
        raise RuntimeError("Set CHUPKE_API_KEY (or CHUPKE_PIE_DEMO=1 for the local voice demo)")
    core.BOT_USERNAME = (await Bot(core.S.telegram_token).get_me()).username  # gift claim links open in Telegram
    await core.bitrefill.start()
    # Run the deposit scanner here only if the Telegram bot isn't running alongside.
    if os.environ.get("CHUPKE_API_SCAN") == "1":
        asyncio.create_task(_scan_loop())


async def _shutdown():
    await core.bitrefill.close()


ROUTES = [Route(f"/v1/{n}", f, methods=["POST"]) for n, f in {
    "deposit": deposit, "balance": balance, "chat": chat, "confirm": confirm,
    "cancel": cancel, "orders": orders, "rules": rules,
}.items()]
ROUTES += [Route("/pie", pie_page, methods=["GET"])] + [
    Route(f"/pie/{n}", local_endpoint(f), methods=["POST"])
    for n, f in {"deposit": deposit, "balance": balance, "chat": chat, "confirm": confirm,
                 "cancel": cancel, "orders": orders, "rules": rules}.items()
]

@asynccontextmanager
async def lifespan(_app):
    await _startup()
    yield
    await _shutdown()


app = Starlette(routes=ROUTES, lifespan=lifespan)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("CHUPKE_API_PORT", "8787")))
