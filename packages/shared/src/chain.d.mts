export declare const USDT_ADDRESS: '0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7';
export declare const EXPLORER_URL: 'https://explorer.testnet.whitechain.io';
export declare const whitechainSepolia: {
  readonly id: 1874; readonly name: string; readonly testnet: true;
  readonly nativeCurrency: { name: string; symbol: string; decimals: number };
  readonly rpcUrls: { default: { http: readonly string[]; webSocket?: readonly string[] } };
  readonly blockExplorers: { default: { name: string; url: string; apiUrl: string } };
  readonly contracts: { multicall3: { address: `0x${string}` } };
};
export declare function withRpc(url: string): typeof whitechainSepolia;
export declare function explorerTx(hash: string): string;
export declare function explorerAddress(address: string): string;
