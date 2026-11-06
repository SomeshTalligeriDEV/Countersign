"""Telegram front end. Run with: python -m chupke.bot"""
from __future__ import annotations

import asyncio
import logging
import time

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from . import config, scam_shield
from .agent import Proposal, ShoppingAgent
from .bitrefill import Bitrefill, find_invoice_id, find_redemption
from .ledger import InsufficientFunds, Ledger, inr_to_zats, zats_to_inr
from .zcash_wallet import make_wallet
from .zip321 import payment_uri
from .gifts import GiftVault
from .pools import Pools, public_status
from .mandate import RuleStore, decide

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
# Do not log message contents: httpx logs full URLs, which include the bot token.
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("chupke")

S = config.load()
ledger = Ledger(S.db_path, S.uid_salt)
bitrefill = Bitrefill(S.bitrefill_mcp_url, S.bitrefill_payment_method)
agent = ShoppingAgent(S.model, ledger, bitrefill, S.inr_per_zec)
wallet = make_wallet(S)
gifts = GiftVault(S.db_path)
pools = Pools(S.db_path)
rule_store = RuleStore(S.db_path)
BOT_USERNAME = ""  # filled in post_init
cooling: dict[int, tuple[Proposal, float]] = {}  # telegram id -> (proposal, ready_at)
last_buy: dict[int, tuple[str, float, float]] = {}  # telegram id -> (product_id, value, time)
DUPLICATE_WINDOW_S = 300
# uid_hash -> chat id, in memory only, so deposits can be announced without storing ids on disk.
chats: dict[str, int] = {}


def inr(zats: int) -> str:
    return f"Rs {zats_to_inr(zats, S.inr_per_zec):,.0f}"


def confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("Confirm", callback_data="confirm"),
          InlineKeyboardButton("Cancel", callback_data="cancel")]]
    )


async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    uid = update.effective_user.id
    if ctx.args and ctx.args[0].startswith("g_"):
        await claim_gift(update, ctx, ctx.args[0])
        return
    if ctx.args and ctx.args[0].startswith("p_"):
        await show_pool(update, ctx.args[0][2:])
        return
    code = ledger.ensure_user(uid)
    chats[ledger.uid_hash(uid)] = update.effective_chat.id
    await update.message.reply_text(
        "Namaste! I'm Chupke. Buy vouchers privately: no UPI history, no card trail.\n\n"
        "To top up, send shielded testnet ZEC to:\n"
        f"{S.deposit_address}\n\n"
        f"Put this in the memo: {code}\n"
        f"Or tap this one-tap payment link (ZIP 321, memo included):\n{payment_uri(S.deposit_address, code)}\n\n"
        "Then just tell me what you want, e.g. \"Rs 500 Swiggy card\".\n"
        "(Hackathon demo: testnet only, test purchases only.)"
    )


async def claim_gift(update: Update, ctx: ContextTypes.DEFAULT_TYPE, param: str) -> None:
    got = gifts.claim(param)
    if not got:
        await update.message.reply_text("This gift link has already been opened, has expired, or isn't valid.")
        return
    sender_hash, payload = got
    msg = await update.message.reply_text(
        "You've received a gift on Chupke!\n\n" + payload
        + f"\n\nThis message disappears in {S.code_ttl_s // 60} min and can't be forwarded, so redeem "
        "or note it now. Nobody from Chupke or the brand will ever ask you for this code.",
        protect_content=True,
    )
    asyncio.create_task(_delete_later(ctx.bot, update.effective_chat.id, msg.message_id, S.code_ttl_s))
    if sender_hash in chats:
        await ctx.bot.send_message(chats[sender_hash], "Your gift link was just opened.")


def _inr_f(zats: int) -> float:
    return zats_to_inr(zats, S.inr_per_zec)


async def pool_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """/pool 5000 Priya's wedding"""
    uid = update.effective_user.id
    ledger.ensure_user(uid)
    chats[ledger.uid_hash(uid)] = update.effective_chat.id
    try:
        target = float(ctx.args[0])
        title = " ".join(ctx.args[1:]).strip() or "Group gift"
    except (IndexError, ValueError):
        await update.message.reply_text("Usage: /pool <goal in rupees> <title>\ne.g. /pool 5000 Priya's wedding shagun")
        return
    code = pools.create(ledger.uid_hash(uid), title, inr_to_zats(target, S.inr_per_zec))
    link = f"https://t.me/{BOT_USERNAME}?start=p_{code}"
    await update.message.reply_text(
        f"Shagun Pool created: {title} (goal Rs {target:,.0f}).\n\n"
        f"Share this link in your WhatsApp group:\n{link}\n\n"
        "Everyone pays privately with shielded ZEC. Nobody, not even you, sees who gave how much. "
        "I only show the total once 3 people have chipped in.\n"
        f"When you're ready: /poolclose {code}"
    )


async def show_pool(update: Update, code: str) -> None:
    pool = pools.get(code)
    if not pool:
        await update.message.reply_text("That pool doesn't exist.")
        return
    msg = public_status(pool, _inr_f)
    if pool["status"] == "open":
        msg += (
            "\n\nTo chip in, send any amount of shielded testnet ZEC to:\n"
            f"{S.deposit_address}\nMemo: {pool['code']}\n"
            f"Or tap: {payment_uri(S.deposit_address, pool['code'], label=pool['title'])}\n\n"
            "Your amount stays private, even from the organiser."
        )
    await update.message.reply_text(msg)


async def pools_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    mine = pools.for_organizer(ledger.uid_hash(update.effective_user.id))
    if not mine:
        await update.message.reply_text("You have no pools. Start one: /pool 5000 Priya's wedding")
        return
    await update.message.reply_text("\n".join(f"{p['code']}: {public_status(p, _inr_f)}" for p in mine))


async def poolclose_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    uid = update.effective_user.id
    h = ledger.uid_hash(uid)
    try:
        total = pools.close(ctx.args[0], h)
    except (IndexError, ValueError):
        await update.message.reply_text("Usage: /poolclose POOL-XXXXXXXX (only the organiser can close it)")
        return
    ledger.credit_internal(h, total)
    await update.message.reply_text(
        f"Pool closed. Rs {_inr_f(total):,.0f} moved to your balance for the gift.\n"
        "Now just tell me, e.g. \"gift Priya a Rs 5000 Flipkart card, note: Congratulations from all of us!\""
    )


async def balance(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(f"Your Chupke balance: {inr(ledger.balance(update.effective_user.id))}")


async def forget(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    uid = update.effective_user.id
    agent.history.pop(uid, None)
    agent.pending.pop(uid, None)
    agent.recent_invoices.pop(uid, None)
    cooling.pop(uid, None)
    await update.message.reply_text("Done. I've forgotten this chat and your order list.")


async def on_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    uid = update.effective_user.id
    text = update.message.text or ""
    ledger.ensure_user(uid)
    chats[ledger.uid_hash(uid)] = update.effective_chat.id

    verdict = scam_shield.check_message(text)
    if verdict.blocked:
        log.info("Scam Shield block: %s", verdict.reasons)  # reasons only, never the text
        await update.message.reply_text(
            "Ruko, this looks like a known scam pattern, so I won't buy anything for this.\n\n"
            + scam_shield.HELP
        )
        return

    await ctx.bot.send_chat_action(update.effective_chat.id, ChatAction.TYPING)
    try:
        reply = await agent.chat(uid, text)
    except Exception:
        log.exception("agent error")
        reply = "Something went wrong on my side. Please try again."
    if verdict.action == "warn":
        reply = "Heads up: " + scam_shield.HELP + "\n\n" + reply

    proposal = agent.pending.get(uid)
    await update.message.reply_text(reply)
    if not proposal:
        return
    action, why = _mandate(uid, proposal)
    if action == "deny":
        agent.pending.pop(uid, None)
        await update.message.reply_text(f"Not buying this: {why}. /rules to see or change your limits.")
    elif action == "auto":
        agent.pending.pop(uid, None)
        await update.message.reply_text(proposal.card().replace("Please check before you confirm:", f"Auto-approved ({why}):"))
        await buy(update.effective_chat.id, uid, proposal, ctx)
    else:
        await update.message.reply_text(proposal.card(), reply_markup=confirm_keyboard())


def _mandate(uid: int, p: Proposal) -> tuple[str, str]:
    """The user's rules, applied in code. The AI never sees or changes this decision."""
    if p.gift_to and scam_shield.check_gift_recipient(p.gift_to).blocked:
        return "deny", "gifts to a boss, client, officer or support person are a known scam"
    spent = zats_to_inr(ledger.spent_since(uid, 86400), S.inr_per_zec)
    total = p.price_inr * p.quantity
    cool = scam_shield.needs_cooloff(p.product_name, p.value_inr, p.quantity, spent)
    return decide(rule_store.get(ledger.uid_hash(uid)), p.product_name, total, spent, bool(p.gift_to), cool)


async def rules_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(rule_store.get(ledger.uid_hash(update.effective_user.id)).describe())


async def _update_rules(update: Update, ctx: ContextTypes.DEFAULT_TYPE, field: str) -> None:
    from dataclasses import replace
    h = ledger.uid_hash(update.effective_user.id)
    r = rule_store.get(h)
    arg = " ".join(ctx.args).strip().lower()
    try:
        if field == "auto":
            r = replace(r, auto_under_inr=float(arg))
        elif field == "cap":
            r = replace(r, daily_cap_inr=float(arg))
        elif field == "block" and arg:
            r = replace(r, blocked_brands=tuple(sorted(set(r.blocked_brands) | {arg})))
        elif field == "unblock" and arg:
            r = replace(r, blocked_brands=tuple(b for b in r.blocked_brands if b != arg))
        else:
            raise ValueError
    except ValueError:
        await update.message.reply_text("Usage: /autobuy 200 · /dailycap 2000 · /block apple · /unblock apple")
        return
    rule_store.set(h, r)
    await update.message.reply_text(r.describe())


async def autobuy_cmd(update, ctx): await _update_rules(update, ctx, "auto")
async def dailycap_cmd(update, ctx): await _update_rules(update, ctx, "cap")
async def block_cmd(update, ctx): await _update_rules(update, ctx, "block")
async def unblock_cmd(update, ctx): await _update_rules(update, ctx, "unblock")


async def on_button(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    q = update.callback_query
    await q.answer()
    uid = q.from_user.id

    if q.data == "cancel":
        agent.pending.pop(uid, None)
        cooling.pop(uid, None)
        await q.edit_message_reply_markup(None)
        await q.message.reply_text("Cancelled. Nothing was charged.")
        return

    # Confirm
    if uid in cooling:
        proposal, ready_at = cooling[uid]
        if time.time() < ready_at:
            mins = int((ready_at - time.time()) // 60) + 1
            await q.message.reply_text(f"Still in the safety pause. Try again in about {mins} min.")
            return
        cooling.pop(uid)
    else:
        proposal = agent.pending.pop(uid, None)
        if not proposal:
            await q.message.reply_text("That offer expired. Tell me again what you want.")
            return
        action, why = _mandate(uid, proposal)
        if action == "deny":
            await q.message.reply_text(f"Not buying this: {why}.\n\n" + scam_shield.HELP)
            return
        recent = zats_to_inr(ledger.spent_since(uid, 86400), S.inr_per_zec)
        reasons = scam_shield.needs_cooloff(
            proposal.product_name, proposal.value_inr, proposal.quantity, recent
        )
        if reasons:
            cooling[uid] = (proposal, time.time() + S.cooloff_s)
            await q.message.reply_text(
                f"Safety pause ({', '.join(reasons)}). Scammers rely on panic, so big or unusual "
                f"orders wait {S.cooloff_s // 60} minutes. If nobody is pressuring you, tap Confirm "
                "again after that.\n\n" + scam_shield.HELP,
                reply_markup=confirm_keyboard(),
            )
            return

    await q.edit_message_reply_markup(None)
    await buy(q.message.chat_id, uid, proposal, ctx)


async def orders(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    uid = update.effective_user.id
    items = agent.recent_invoices.get(uid, [])
    if not items:
        await update.message.reply_text("No orders in this session.")
        return
    lines = []
    for o in items[-5:]:
        try:
            inv = await bitrefill._call("get-invoice-by-id", {"invoice_id": o["invoice_id"]})
            status = inv.get("status") or inv.get("invoice", {}).get("status", "unknown")
        except Exception:
            status = "could not check"
        lines.append(f"{o['product']} ({o['time']}): {status}\n  invoice {o['invoice_id']}")
    await update.message.reply_text(
        "Your recent orders:\n" + "\n".join(lines)
        + "\n\nSomething wrong? Just tell me, e.g. \"my Swiggy code didn't work\"."
    )


async def execute_purchase(uid, p: Proposal, gift_link_base: str | None = None) -> dict:
    """Buy in code (shared by Telegram and the HTTP API). Never called by the model.

    Returns a dict with status: ok | duplicate | insufficient | failed.
    """
    prev = last_buy.get(uid)
    if prev and prev[0] == p.product_id and prev[1] == p.value_inr and time.time() - prev[2] < DUPLICATE_WINDOW_S:
        return {"status": "duplicate"}
    total_inr = p.price_inr * p.quantity
    try:
        spend_id = ledger.hold(uid, inr_to_zats(total_inr, S.inr_per_zec))
    except InsufficientFunds:
        return {"status": "insufficient", "balance_inr": round(_inr_f(ledger.balance(uid)))}
    try:
        result = await bitrefill.buy(p.product_id, p.value_inr, p.package_id)
        invoice_id = find_invoice_id(result)
        if not invoice_id:
            raise RuntimeError(f"no invoice id in {str(result)[:200]}")
        invoice = await bitrefill.wait_for_codes(invoice_id)
        codes = find_redemption(invoice)
        if not codes:
            raise RuntimeError("invoice complete but no code found")
    except Exception:
        log.exception("purchase failed")
        ledger.refund(spend_id)
        return {"status": "failed"}

    ledger.settle(spend_id)
    last_buy[uid] = (p.product_id, p.value_inr, time.time())
    when = time.strftime("%d %b %H:%M", time.localtime())
    agent.recent_invoices.setdefault(uid, []).append(
        {"invoice_id": invoice_id, "product": p.product_name, "time": when}
    )
    del agent.recent_invoices[uid][:-10]
    out = {
        "status": "ok", "product": p.product_name, "quantity": p.quantity, "total_inr": total_inr,
        "invoice_id": invoice_id, "time": when, "balance_inr": round(_inr_f(ledger.balance(uid))),
    }
    if p.gift_to:
        payload = f"{p.product_name}" + (f"\n\"{p.gift_note}\"" if p.gift_note else "") + "\n" + "\n".join(codes)
        base = gift_link_base or f"https://t.me/{BOT_USERNAME}?start="
        out["gift_to"] = p.gift_to
        out["gift_link"] = base + gifts.create(ledger.uid_hash(uid), payload)
    else:
        out["codes"] = codes
    return out


async def buy(chat_id: int, uid: int, p: Proposal, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await ctx.bot.send_message(chat_id, f"Buying {p.product_name}...")
    r = await execute_purchase(uid, p)
    if r["status"] == "duplicate":
        await ctx.bot.send_message(
            chat_id,
            "You bought exactly this a few minutes ago, so I've stopped to avoid paying twice. "
            "Check /orders. If you really want another, ask again in 5 minutes.",
        )
        return
    if r["status"] == "insufficient":
        await ctx.bot.send_message(chat_id, f"Not enough balance. You have Rs {r['balance_inr']:,}. /start shows how to top up.")
        return
    if r["status"] == "failed":
        await ctx.bot.send_message(chat_id, "The purchase didn't go through, so I refunded your balance.")
        return
    if "gift_link" in r:
        await ctx.bot.send_message(
            chat_id,
            f"Gift for {r['gift_to']} is ready. Send them this link on WhatsApp:\n{r['gift_link']}\n\n"
            "It opens once, only inside Telegram, and you'll get a ping when it's opened. "
            "The code itself never passes through you.",
        )
    else:
        # protect_content stops forwarding and saving, which blocks the "send me the code" scam.
        msg = await ctx.bot.send_message(
            chat_id,
            f"{p.product_name}\n" + "\n".join(r["codes"])
            + f"\n\nThis message disappears in {S.code_ttl_s // 60} min and can't be forwarded. "
            "Never share it with anyone who asks for it.",
            protect_content=True,
        )
        asyncio.create_task(_delete_later(ctx.bot, chat_id, msg.message_id, S.code_ttl_s))
    # Private receipt: shown in chat, never stored. Enough for support, nothing about the wallet.
    await ctx.bot.send_message(
        chat_id,
        f"Receipt\n{p.product_name} x{p.quantity}\nPaid: Rs {r['total_inr']:,.0f} from your shielded balance\n"
        f"Bitrefill invoice: {r['invoice_id']}\nTime: {r['time']}\n"
        f"Balance left: Rs {r['balance_inr']:,}\n\n"
        "Keep the invoice id for support. /orders tracks it.",
    )


async def _delete_later(bot, chat_id: int, message_id: int, delay: int) -> None:
    await asyncio.sleep(delay)
    try:
        await bot.delete_message(chat_id, message_id)
    except Exception:
        log.warning("could not delete voucher message")


async def scan_deposits(app: Application) -> None:
    while True:
        try:
            for dep in await wallet.scan():
                pool = pools.credit(dep)
                if pool:
                    if pool["organizer_hash"] in chats:
                        await app.bot.send_message(
                            chats[pool["organizer_hash"]],
                            f"Someone just chipped in to {pool['title']} "
                            f"({pool['contributors']} so far). Amounts stay private. /pools for the total.",
                        )
                    continue
                h = ledger.credit_deposit(dep)
                if h and h in chats:
                    await app.bot.send_message(
                        chats[h],
                        f"Top-up received: {inr(dep.zats)} (shielded).\n"
                        f"Testnet tx: https://testnet.zcashexplorer.app/transactions/{dep.txid}",
                    )
                elif h:
                    log.info("credited a deposit for a user with no open chat")
        except Exception:
            log.exception("deposit scan failed")
        await asyncio.sleep(S.scan_interval_s)


async def post_init(app: Application) -> None:
    global BOT_USERNAME
    BOT_USERNAME = (await app.bot.get_me()).username
    await bitrefill.start()
    app.create_task(scan_deposits(app))


async def post_shutdown(app: Application) -> None:
    await bitrefill.close()


def main() -> None:
    app = (
        Application.builder()
        .token(S.telegram_token)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("balance", balance))
    app.add_handler(CommandHandler("forget", forget))
    app.add_handler(CommandHandler("orders", orders))
    app.add_handler(CommandHandler("rules", rules_cmd))
    app.add_handler(CommandHandler("autobuy", autobuy_cmd))
    app.add_handler(CommandHandler("dailycap", dailycap_cmd))
    app.add_handler(CommandHandler("block", block_cmd))
    app.add_handler(CommandHandler("unblock", unblock_cmd))
    app.add_handler(CommandHandler("pool", pool_cmd))
    app.add_handler(CommandHandler("pools", pools_cmd))
    app.add_handler(CommandHandler("poolclose", poolclose_cmd))
    app.add_handler(CallbackQueryHandler(on_button))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    app.run_polling()


if __name__ == "__main__":
    main()
