// Server-side adapter imports; never import signing accounts into browser components.
export { hashMessage, keccak256, decodeFunctionData, encodeFunctionData, createPublicClient, createWalletClient, defineChain, http, zeroHash, zeroAddress, erc20Abi } from 'viem';
export { privateKeyToAccount } from 'viem/accounts';
