import { isIP } from 'node:net';

// Headers for web -> API calls: carries the end user's IP when it parses as IPv4/IPv6.
// Never the leftmost x-forwarded-for hop (client-controlled). We take the entry appended by our own
// edge: WEB_TRUSTED_HOPS counts trusted proxies in front of the web app (default 1 = rightmost entry).
// The header is built fresh here, so a client-supplied x-countersign-client-ip is never passed through.
// The API only honours it when the immediate peer is in TRUSTED_PROXY_IPS.
export function forwardHeaders(request: Request, extra: Record<string, string> = {}): Record<string, string> {
  const hops = (request.headers.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const trusted = Math.max(1, Number(process.env.WEB_TRUSTED_HOPS ?? '1') || 1);
  const ip = hops.length >= trusted ? hops[hops.length - trusted] : '';
  const { 'x-countersign-client-ip': _drop, ...clean } = extra;
  void _drop;
  return isIP(ip) ? { ...clean, 'x-countersign-client-ip': ip } : clean;
}
