export class WhitechainRpc {
  constructor(url, fetcher = fetch) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) throw new Error('rpc_requires_https');
    this.url = url;
    this.fetcher = fetcher;
  }
  async call(method, params = []) {
    const response = await this.fetcher(this.url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('rpc_unavailable');
    const data = await response.json();
    if (data.error || data.id !== 1 || data.jsonrpc !== '2.0' || data.result === undefined) throw new Error('rpc_invalid_response');
    return data.result;
  }
  async status() {
    const chainId = await this.call('eth_chainId');
    if (chainId !== '0x752') throw new Error('wrong_chain');
    const [block, decimals, code] = await Promise.all([
      this.call('eth_blockNumber'),
      this.call('eth_call', [{ to: '0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7', data: '0x313ce567' }, 'latest']),
      this.call('eth_getCode', ['0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7', 'latest']),
    ]);
    if (!/^0x[0-9a-fA-F]+$/.test(block) || !/^0x[0-9a-fA-F]{64}$/.test(decimals) || BigInt(decimals) > 255n || !/^0x[0-9a-fA-F]+$/.test(code) || code === '0x0') throw new Error('invalid_token_or_block');
    return { chainId: 1874, block: BigInt(block).toString(), tokenDecimals: Number(BigInt(decimals)), checkedAt: new Date().toISOString() };
  }
}
