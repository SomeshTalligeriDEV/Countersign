// Classifies real JSON-RPC/HTTP failures from Whitechain (op-reth/geth wording) and viem error chains.
export function classifyRpcError(error) {
  const parts = []; let status; let retryAfter;
  for (let e = error, depth = 0; e && depth < 8; e = e.cause, depth++) {
    parts.push(e.message, e.details, e.shortMessage);
    status ??= e.status ?? e.code;
    const header = e.headers?.get?.('retry-after');
    if (header && retryAfter === undefined) retryAfter = Number(header);
  }
  const text = parts.filter(Boolean).join(' ').toLowerCase();
  const retryMs = Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1000 : undefined;
  if (status === 429 || text.includes('429') || text.includes('too many requests') || text.includes('rate limit')) return { kind: 'rate_limited', retryMs };
  if (text.includes('already known') || text.includes('known transaction')) return { kind: 'already_known' };
  if (text.includes('nonce too low') || text.includes('nonce has already been used')) return { kind: 'nonce_too_low' };
  if (text.includes('replacement transaction underpriced') || text.includes('replacement underpriced')) return { kind: 'replacement_underpriced' };
  return { kind: 'unknown' };
}
