import { isIP } from 'node:net';

// Headers for web -> API calls: carries the end user's IP (x-forwarded-for first hop) when it parses as IPv4/IPv6.
// The API only honours it when the immediate peer is in TRUSTED_PROXY_IPS.
export function forwardHeaders(request: Request, extra: Record<string, string> = {}): Record<string, string> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  return isIP(ip) ? { ...extra, 'x-countersign-client-ip': ip } : extra;
}
