/** Protocol constants from 03-CONTRACTS.md. Deployment addresses are never invented. */
export const CHAIN_ID = 1874;
export const USDT_ADDRESS = '0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7' as const;
export const paymentTypes = {
  PaymentIntent: [
    { name: 'mandateId', type: 'bytes32' },
    { name: 'merchantId', type: 'bytes32' },
    { name: 'payout', type: 'address' },
    { name: 'registryVersion', type: 'uint64' },
    { name: 'amount', type: 'uint256' },
    { name: 'orderId', type: 'bytes32' },
    { name: 'resourceHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'epoch', type: 'uint64' },
    { name: 'deadline', type: 'uint64' },
  ],
  PaymentApproval: [
    { name: 'intentDigest', type: 'bytes32' },
    { name: 'mandateId', type: 'bytes32' },
    { name: 'merchantId', type: 'bytes32' },
    { name: 'payout', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'epoch', type: 'uint64' },
    { name: 'deadline', type: 'uint64' },
  ],
  WorldAttestation: [
    { name: 'approvalDigest', type: 'bytes32' },
    { name: 'ownerSubHash', type: 'bytes32' },
    { name: 'authTime', type: 'uint64' },
  ],
} as const;

export function paymentDomain(verifyingContract: `0x${string}`) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(verifyingContract) || /^0x0{40}$/i.test(verifyingContract)) {
    throw new Error('A deployed Mandate address is required');
  }
  return { name: 'Countersign', version: '1', chainId: CHAIN_ID, verifyingContract } as const;
}
