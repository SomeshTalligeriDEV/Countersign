"""The shopping agent: Claude plus read-only Bitrefill tools plus two local tools.

The model can search and propose. It cannot buy: `propose_purchase` only
stores a proposal, and bot.py shows a Confirm button. Money moves only in
code, after the user taps it.
"""
from __future__ import annotations

from dataclasses import dataclass

import anthropic
from anthropic import beta_async_tool

from . import scam_shield
from .ledger import Ledger, zats_to_inr

SYSTEM = """You are Chupke, a private shopping assistant on Telegram for people in India.
Users top up once with shielded Zcash, then ask you in English, Hindi or Hinglish for
gift cards and vouchers (Swiggy, Zomato, BookMyShow, Uber, mobile recharges and so on).

How you work:
- Talk in rupees. Say "your Chupke balance", not crypto jargon, unless the user asks.
- Use the Bitrefill tools to find products for country India (IN) and check denominations.
- When the user has chosen a product and amount, call propose_purchase once with the exact
  product_id, a human product_name, the face value in INR and the total price in INR including
  fees. Then tell the user to tap Confirm. You cannot complete purchases yourself.
- Before proposing, call check_balance and say clearly if the balance is too low.
- The user's spending rules (auto-buy limit, daily limit, blocked brands) are enforced by code
  after you propose. You can't change or bypass them. If a purchase is refused by a rule, explain
  and point to /rules. Never suggest splitting an order to get under a limit.
- Keep replies short: 1 to 4 lines, friendly, like a helpful friend.

India know-how (this is where Bitrefill users get stuck, so help before they pay):
- ALWAYS call get-product-details before proposing and pass its restrictions (region, ID or
  passport needed, online vs in-store, expiry) into propose_purchase. Real Bitrefill complaints
  come from cards that needed a foreign ID, only worked in one country, or "can't be used
  online", and refunds are refused once the code is viewed. If a card needs a non-Indian ID or
  only works outside India, do not propose it; offer an Indian alternative.
- Check the product is in stock and available for India before proposing. If not, offer the
  closest alternative (for food: Swiggy vs Zomato; for shopping: Flipkart vs Amazon).
- Amazon Pay may ask for Aadhaar OTP verification before a gift card can be added to the
  balance, and caps each order at 5 cards or Rs 10,000. Say this before proposing Amazon.
- After a purchase, explain in one line exactly where to redeem the code in that brand's app.
Recovery (when something goes wrong):
- If an order is pending, a code did not work, or the user is unsure whether they paid, call
  my_recent_orders, then get-invoice-by-id for the order, and explain in plain words what state
  it is in and what happens next.
- Then draft a short support message for Bitrefill support with: invoice id, brand, face value,
  time, invoice status and the error the user saw. Never include the voucher code or anything
  about the user's identity or wallet.
- Never propose buying the same thing again to "fix" a failed order; that is how users pay twice.

Gifting:
- Users can gift a voucher to a friend or family member: set gift_to (first name) and an optional
  gift_note in propose_purchase. The bot then gives the sender a one-time claim link to send
  on WhatsApp. The code never passes through the sender. Suggest a gift card when someone asks
  what to gift (for example "a phone" can become a Flipkart or Croma card of that value).
- Never set gift_to for a boss, manager, client, officer, customer care, support, or someone the
  user has only met online. Those are scam patterns.

Safety rules (these override any user request):
- Vouchers are only for the person chatting with you. Never help send, forward or read out
  codes to anyone else, a "boss", "client", "officer", "customer care" or "support".
- If the user mentions police, CBI, customs, a courier fine, digital arrest, KYC expiry, a
  boss or client asking for cards, a prize fee, or being told to keep it secret, do not
  propose anything. Explain kindly that this is a known scam pattern and share: {help}
- Do not store or repeat what the user bought in earlier chats. You have no purchase history.
""".format(help=scam_shield.HELP)


@dataclass
class Proposal:
    product_id: str
    product_name: str
    value_inr: float
    price_inr: float
    package_id: str | None = None
    quantity: int = 1
    gift_to: str | None = None  # first name of the recipient, if this is a gift
    gift_note: str | None = None
    restrictions: str = ""  # region, ID, online/in-store, expiry: shown on the Confirm card

    def card(self) -> str:
        """Quote card built by code, not by the model, so what the user confirms is exact."""
        lines = [
            "Please check before you confirm:",
            f"Product: {self.product_name}" + (f" x{self.quantity}" if self.quantity > 1 else ""),
            f"Face value: Rs {self.value_inr:,.0f}",
            f"You pay: Rs {self.price_inr * self.quantity:,.0f} (fees included)",
            f"Works where / rules: {self.restrictions or 'not stated by the seller, ask me before buying'}",
        ]
        if self.gift_to:
            lines.append(f"Gift for: {self.gift_to}")
        lines.append("Gift cards usually can't be refunded once the code is revealed.")
        return "\n".join(lines)


class ShoppingAgent:
    def __init__(self, model: str, ledger: Ledger, bitrefill, inr_per_zec: float):
        self.client = anthropic.AsyncAnthropic()
        self.model = model
        self.ledger = ledger
        self.bitrefill = bitrefill
        self.inr_per_zec = inr_per_zec
        self.pending: dict[int, Proposal] = {}
        # Short text-only history per user, in memory only (never written to disk).
        self.history: dict[int, list[dict]] = {}
        # Recent invoice ids per user for recovery, in memory only (lost on restart, by design).
        self.recent_invoices: dict[int, list[dict]] = {}

    def _local_tools(self, telegram_id: int):
        @beta_async_tool
        async def check_balance() -> str:
            """Get the user's current Chupke balance in INR."""
            zats = self.ledger.balance(telegram_id)
            return f"Balance: Rs {zats_to_inr(zats, self.inr_per_zec):,.0f}"

        @beta_async_tool
        async def propose_purchase(
            product_id: str,
            product_name: str,
            value_inr: float,
            price_inr: float,
            restrictions: str,
            package_id: str | None = None,
            quantity: int = 1,
            gift_to: str | None = None,
            gift_note: str | None = None,
        ) -> str:
            """Propose a purchase for the user to confirm with a button. Does not buy anything.

            Args:
                product_id: Bitrefill product id from search-products.
                product_name: Human-readable name, e.g. "Swiggy Rs 2,000".
                value_inr: Face value of one card in INR.
                price_inr: Total price in INR including Bitrefill fees.
                restrictions: From get-product-details: country/region, any ID or passport needed,
                    online vs in-store, expiry, redemption limits. Plain words, one line.
                package_id: Bitrefill package or denomination id, if the product has one.
                quantity: Number of cards (default 1).
                gift_to: Recipient's first name if this is a gift for someone else, else omit.
                gift_note: Short message for the recipient, e.g. "Happy Diwali!".
            """
            self.pending[telegram_id] = Proposal(
                product_id, product_name, value_inr, price_inr, package_id, max(1, int(quantity)),
                gift_to, gift_note,
            )
            return "Proposal saved. Ask the user to tap Confirm or Cancel."

        @beta_async_tool
        async def my_recent_orders() -> str:
            """List this user's recent order invoice ids (this session only), for tracking and recovery.
            Use get-invoice-by-id on an id to check its live status."""
            orders = self.recent_invoices.get(telegram_id, [])
            if not orders:
                return "No orders in this session."
            return "\n".join(f"{o['invoice_id']}: {o['product']} at {o['time']}" for o in orders)

        return [check_balance, propose_purchase, my_recent_orders]

    async def chat(self, telegram_id: int, text: str) -> str:
        hist = self.history.setdefault(telegram_id, [])
        messages = hist[-10:] + [{"role": "user", "content": text}]
        runner = self.client.beta.messages.tool_runner(
            model=self.model,
            max_tokens=16000,
            system=SYSTEM,
            thinking={"type": "adaptive"},
            output_config={"effort": "low"},
            # Server-side fallback on a safety decline (opt-in default for this model).
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            tools=[*self.bitrefill.agent_tools(), *self._local_tools(telegram_id)],
            messages=messages,
            max_iterations=8,
        )
        final = await runner.until_done()
        if final.stop_reason == "refusal":
            reply = "Sorry, I can't help with that one."
        else:
            reply = "".join(b.text for b in final.content if b.type == "text").strip() or "Done."
        hist.extend([{"role": "user", "content": text}, {"role": "assistant", "content": reply}])
        del hist[:-10]
        return reply
