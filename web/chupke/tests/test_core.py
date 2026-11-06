import json

import pytest

from chupke import scam_shield
from chupke.ledger import Deposit, InsufficientFunds, Ledger, inr_to_zats
from chupke.zcash_wallet import _parse_transfers


@pytest.mark.parametrize("text", [
    "my boss asked me to buy 10 apple gift cards for a client",
    "CBI officer said I am under digital arrest, pay fine",
    "courier parcel seized, customs fine needed",
    "your PAN KYC expired, update now",
    "buy amazon card and send the code to this number",
    "sir ne bola apple card le lo aur code bhej do",
])
def test_scam_scripts_blocked(text):
    assert scam_shield.check_message(text).blocked


@pytest.mark.parametrize("text", [
    "Rs 500 swiggy card please",
    "BookMyShow voucher for saturday night",
    "recharge my jio 299",
])
def test_normal_requests_allowed(text):
    assert scam_shield.check_message(text).action == "allow"


def test_cooloff_rules():
    assert scam_shield.needs_cooloff("Apple Gift Card", 5000, 1, 0)
    assert scam_shield.needs_cooloff("Swiggy", 500, 3, 0)
    assert scam_shield.needs_cooloff("Swiggy", 2000, 1, 9000)
    assert not scam_shield.needs_cooloff("Swiggy", 500, 1, 0)


def test_ledger_deposit_hold_refund(tmp_path):
    lg = Ledger(str(tmp_path / "t.db"), "salt")
    code = lg.ensure_user(42)
    assert lg.ensure_user(42) == code
    dep = Deposit(txid="abc", zats=inr_to_zats(1000, 3000), memo=f"hi {code.lower()}")
    assert lg.credit_deposit(dep)
    assert lg.credit_deposit(dep) is None  # same txid twice is ignored
    assert lg.balance(42) == dep.zats
    sid = lg.hold(42, dep.zats)
    assert lg.balance(42) == 0
    with pytest.raises(InsufficientFunds):
        lg.hold(42, 1)
    lg.refund(sid)
    assert lg.balance(42) == dep.zats
    lg.refund(sid)  # double refund is a no-op
    assert lg.balance(42) == dep.zats


def test_ledger_stores_no_raw_ids(tmp_path):
    path = tmp_path / "t.db"
    lg = Ledger(str(path), "salt")
    lg.ensure_user(987654321)
    assert b"987654321" not in path.read_bytes()


def test_unknown_memo_not_credited(tmp_path):
    lg = Ledger(str(tmp_path / "t.db"), "salt")
    assert lg.credit_deposit(Deposit("t1", 100, "CHUPKE-DEADBEEF")) is None


def test_parse_transfers_skips_transparent_and_sent():
    raw = "syncing...\n" + json.dumps({"value_transfers": [
        {"kind": "received", "txid": "a", "value": 5, "pool": "orchard", "memos": ["CHUPKE-00000001"]},
        {"kind": "received", "txid": "b", "value": 5, "pool": "transparent", "memos": []},
        {"kind": "sent", "txid": "c", "value": 5, "memos": []},
    ]})
    deps = _parse_transfers(raw)
    assert [d.txid for d in deps] == ["a"]


def test_zip321_uri():
    import base64
    from chupke.zip321 import payment_uri
    uri = payment_uri("utest1abc", "CHUPKE-0000ABCD", 0.5)
    assert uri.startswith("zcash:utest1abc?amount=0.5&memo=")
    memo = uri.split("memo=")[1].split("&")[0]
    assert base64.urlsafe_b64decode(memo + "=" * (-len(memo) % 4)).decode() == "CHUPKE-0000ABCD"


def test_gift_link_roundtrip_and_single_use(tmp_path):
    from chupke.gifts import GiftVault
    path = tmp_path / "g.db"
    v = GiftVault(str(path))
    param = v.create("sender", "Swiggy Rs 500\nCODE-1234")
    assert len(param) <= 64 and param.startswith("g_")
    assert b"CODE-1234" not in path.read_bytes()  # only ciphertext at rest
    assert v.claim(param) == ("sender", "Swiggy Rs 500\nCODE-1234")
    assert v.claim(param) is None  # one claim only


def test_gift_wrong_key_rejected(tmp_path):
    from chupke.gifts import GiftVault
    v = GiftVault(str(tmp_path / "g.db"))
    param = v.create("s", "x")
    gid = param.split("_")[1]
    assert v.claim(f"g_{gid}_AAAAAAAAAAAAAAAAAAAAAA") is None
    assert v.claim(param) == ("s", "x")  # a wrong-key attempt doesn't burn the gift


@pytest.mark.parametrize("name,blocked", [("Rahul", False), ("Mom", False), ("my boss", True), ("Amazon customer care", True)])
def test_gift_recipient_check(name, blocked):
    assert scam_shield.check_gift_recipient(name).blocked is blocked


def test_quote_card_shows_price_restrictions_and_refund_warning():
    from chupke.agent import Proposal
    p = Proposal("swiggy-in", "Swiggy Rs 500", 500, 512, quantity=2, restrictions="India only, online")
    c = p.card()
    assert "Rs 1,024" in c and "India only, online" in c and "refunded" in c
    assert "ask me" in Proposal("x", "X", 1, 1).card()


def test_shagun_pool_hides_amounts_and_is_idempotent(tmp_path):
    from chupke.pools import Pools, public_status, MIN_REVEAL
    path = tmp_path / "p.db"
    pl = Pools(str(path))
    code = pl.create("org", "Priya's wedding", 5000)
    to_inr = lambda z: z  # identity for the test
    assert pl.credit(Deposit("t1", 1111, f"for {code.lower()}"))
    assert pl.credit(Deposit("t1", 1111, code)) is None  # same tx twice
    s = public_status(pl.get(code), to_inr)
    assert "1111" not in s and "hidden" in s
    pl.credit(Deposit("t2", 2000, code)); pl.credit(Deposit("t3", 500, code))
    s = public_status(pl.get(code), to_inr)
    assert "3 contributions" in s and "about Rs 3,500" in s
    with pytest.raises(ValueError):
        pl.close(code, "someone-else")
    assert pl.close(code, "org") == 3611
    assert pl.credit(Deposit("t4", 10, code)) is None  # closed pool takes nothing
    assert b"1111" not in path.read_bytes()  # per-person amounts never stored


def test_mandate_decisions(tmp_path):
    from chupke.mandate import RuleStore, Rules, decide
    r = Rules(auto_under_inr=200, daily_cap_inr=1000, blocked_brands=("apple",))
    assert decide(r, "Swiggy Rs 150", 150, 0, False, [])[0] == "auto"
    assert decide(r, "Swiggy Rs 500", 500, 0, False, [])[0] == "ask"
    assert decide(r, "Swiggy Rs 150", 150, 0, True, [])[0] == "ask"           # gifts always ask
    assert decide(r, "Swiggy Rs 150", 150, 0, False, ["x"])[0] == "ask"       # cool-off beats auto
    assert decide(r, "Apple Rs 100", 100, 0, False, [])[0] == "deny"          # blocked brand
    assert decide(r, "Swiggy Rs 150", 150, 900, False, [])[0] == "deny"       # daily cap
    assert decide(Rules(), "Swiggy", 10, 0, False, [])[0] == "ask"            # default: always ask
    store = RuleStore(str(tmp_path / "r.db"))
    store.set("u", r)
    assert store.get("u") == r and store.get("nobody") == Rules()
