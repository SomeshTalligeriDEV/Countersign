// Client for Biz Buddy's wallet (chupke), routed through our own /api/biz/*
// proxy. The proxy derives the user from the signed session cookie server-side
// — nothing here can act as another user. Contract: chupke/docs/PIE_INTEGRATION.md.

export type Quote = {
  card: string;
  decision: "auto" | "ask" | "deny";
  reason?: string;
  product?: string;
  total_inr?: number;
};

export type ChatReply = {
  reply: string;
  quote?: Quote;
  purchase?: unknown;
  blocked?: boolean;
  error?: string;
};

export type ConfirmReply = {
  status: "ok" | "duplicate" | "insufficient" | "failed" | "denied" | "cooling" | "no_pending_quote";
  reason?: string;
  minutes_left?: number;
  say?: string;
  error?: string;
};

export type Order = { product_id?: string; invoice_id: string; status: string };

export type Rules = { auto_under_inr: number; daily_cap_inr: number; blocked_brands: string[] };

async function post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`/api/biz${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const bizGuard = {
  chat: (text: string) => post<ChatReply>("/chat", { text }),
  confirm: () => post<ConfirmReply>("/confirm"),
  cancel: () => post<{ status: string }>("/cancel"),
  balance: () => post<{ balance_inr: number; error?: string }>("/balance"),
  orders: () => post<{ orders: Order[]; error?: string }>("/orders"),
  deposit: () => post<{ address: string; memo: string; zcash_uri: string; error?: string }>("/deposit"),
  rules: (patch: Partial<Record<"auto_under_inr" | "daily_cap_inr" | "block" | "unblock", unknown>> = {}) =>
    post<Rules & { error?: string }>("/rules", patch),
};
