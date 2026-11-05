"""API + purchase flow tests with Bitrefill faked (no network). Real Bitrefill is tested at the venue."""
import os
import tempfile

os.environ.setdefault("TELEGRAM_BOT_TOKEN", "x")
os.environ.setdefault("BITREFILL_MCP_URL", "https://example.invalid")
os.environ.setdefault("ZCASH_DEPOSIT_UA", "utest1demo")
os.environ.setdefault("CHUPKE_UID_SALT", "salt")
os.environ.setdefault("ANTHROPIC_API_KEY", "x")
os.environ["CHUPKE_DB"] = os.path.join(tempfile.mkdtemp(), "api.db")
os.environ["CHUPKE_API_KEY"] = "k"

import pytest
from starlette.testclient import TestClient

from chupke import api
from chupke import bot as core
from chupke.agent import Proposal
from chupke.ledger import Deposit, inr_to_zats

H = {"Authorization": "Bearer k"}
api.API_KEY = "k"


@pytest.fixture
def client(monkeypatch):
    async def fake_buy(product_id, value, package_id=None):
        return {"invoice_id": "inv-1"}

    async def fake_wait(invoice_id, timeout_s=120):
        return {"status": "complete", "orders": [{"redemption_code": "SWIGGY-TEST-123"}]}

    monkeypatch.setattr(core.bitrefill, "buy", fake_buy)
    monkeypatch.setattr(core.bitrefill, "wait_for_codes", fake_wait)
    core.last_buy.clear()
    return TestClient(api.app)  # not a context manager, so startup (network) doesn't run


def fund(uid, inr):
    code = core.ledger.ensure_user(uid)
    core.ledger.credit_deposit(Deposit(f"tx-{uid}-{inr}", inr_to_zats(inr, core.S.inr_per_zec), code))


def test_auth_required(client):
    assert client.post("/v1/balance", json={"user": "a"}).status_code == 401
    assert client.post("/v1/balance", json={"user": "a"}, headers={"Authorization": "Bearer nope"}).status_code == 401


def test_deposit_info(client):
    r = client.post("/v1/deposit", json={"user": "alice"}, headers=H).json()
    assert r["address"] == "utest1demo" and r["memo"].startswith("CHUPKE-") and r["zcash_uri"].startswith("zcash:")


def test_scam_text_blocked_without_calling_ai(client):
    r = client.post("/v1/chat", json={"user": "a", "text": "my boss asked me to buy apple cards for a client"}, headers=H).json()
    assert r["blocked"] is True


def test_confirm_buys_holds_and_blocks_duplicates(client):
    uid = "api:bob"
    fund(uid, 1000)
    core.agent.pending[uid] = Proposal("swiggy-in", "Swiggy Rs 500", 500, 500, restrictions="India")
    r = client.post("/v1/confirm", json={"user": "bob"}, headers=H).json()
    assert r["status"] == "ok" and r["codes"] == ["redemption_code: SWIGGY-TEST-123"] and r["balance_inr"] == 500
    core.agent.pending[uid] = Proposal("swiggy-in", "Swiggy Rs 500", 500, 500)
    assert client.post("/v1/confirm", json={"user": "bob"}, headers=H).json()["status"] == "duplicate"
    assert core.ledger.balance(uid) == inr_to_zats(1000, core.S.inr_per_zec) - inr_to_zats(500, core.S.inr_per_zec)  # charged once


def test_failed_purchase_refunds(client, monkeypatch):
    async def boom(*a, **k):
        raise RuntimeError("bitrefill down")
    monkeypatch.setattr(core.bitrefill, "buy", boom)
    uid = "api:carol"
    fund(uid, 300)
    core.agent.pending[uid] = Proposal("swiggy-in", "Swiggy Rs 200", 200, 200)
    assert client.post("/v1/confirm", json={"user": "carol"}, headers=H).json()["status"] == "failed"
    assert core.ledger.balance(uid) == inr_to_zats(300, core.S.inr_per_zec)


def test_rules_deny_over_cap(client):
    uid = "api:dev"
    fund(uid, 5000)
    client.post("/v1/rules", json={"user": "dev", "daily_cap_inr": 100}, headers=H)
    core.agent.pending[uid] = Proposal("swiggy-in", "Swiggy Rs 500", 500, 500)
    r = client.post("/v1/confirm", json={"user": "dev"}, headers=H).json()
    assert r["status"] == "denied" and "daily limit" in r["reason"]


def test_gift_purchase_returns_link_not_code(client):
    uid = "api:erin"
    fund(uid, 1000)
    core.BOT_USERNAME = "chupke_bot"
    core.agent.pending[uid] = Proposal("swiggy-in", "Swiggy Rs 200", 200, 200, gift_to="Rahul", gift_note="Happy Diwali")
    r = client.post("/v1/confirm", json={"user": "erin"}, headers=H).json()
    assert r["status"] == "ok" and "codes" not in r and r["gift_link"].startswith("https://t.me/chupke_bot?start=g_")


def test_pie_lite_local_only_and_works(client, monkeypatch):
    monkeypatch.setenv("CHUPKE_PIE_DEMO", "1")
    assert "Pie Lite" in client.get("/pie").text
    r = client.post("/pie/deposit", json={}).json()   # TestClient host is "testclient" (treated as local)
    assert r["memo"].startswith("CHUPKE-")
    uid = "api:pie-demo"
    fund(uid, 1000)
    core.agent.pending[uid] = Proposal("swiggy-in", "Swiggy Rs 100", 100, 100)
    assert client.post("/pie/confirm", json={}).json()["status"] == "ok"
    monkeypatch.setenv("CHUPKE_PIE_DEMO", "0")
    assert client.post("/pie/balance", json={}).status_code == 403
