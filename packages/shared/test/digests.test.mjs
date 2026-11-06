import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashTypedData } from 'viem';
import { paymentTypes, paymentDomain } from '../src/index.ts';
const vector = JSON.parse(readFileSync(new URL('../vectors/payment.json', import.meta.url), 'utf8'));
for (const [name, type] of [['intent','PaymentIntent'],['approval','PaymentApproval'],['attestation','WorldAttestation']]) {
  test(`A-14 ${type} matches fixed independently encoded digest`, () => {
    const domain = paymentDomain(vector.domain.verifyingContract);
    assert.deepEqual(domain, vector.domain);
    const actual = hashTypedData({ domain, types: paymentTypes, primaryType: type, message: vector[name] });
    assert.equal(actual, vector.expected[name]);
    assert.notEqual(hashTypedData({domain:{...domain,chainId:1},types:paymentTypes,primaryType:type,message:vector[name]}),actual);
  });
}
