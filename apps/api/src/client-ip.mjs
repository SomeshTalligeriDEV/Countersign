import { isIP } from 'node:net';
// The forwarded x-countersign-client-ip is honoured only when the TCP peer is listed in TRUSTED_PROXY_IPS
// (comma-separated) and the value parses as IPv4/IPv6; otherwise the peer address is used.
export function clientIp(peer, forwarded, trustedList = '') {
  const trusted = String(trustedList).split(',').map(s => s.trim()).filter(Boolean);
  const value = String(forwarded ?? '').trim();
  return trusted.includes(peer) && isIP(value) ? value : peer;
}
