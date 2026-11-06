// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {Mandate} from "../src/Mandate.sol";
import {MerchantRegistry} from "../src/MerchantRegistry.sol";
import {TestToken} from "./Mandate.t.sol";
interface VectorVm {
    function chainId(uint256 id) external;
    function etch(address target, bytes calldata code) external;
    function readFile(string calldata path) external view returns (string memory);
    function parseJsonBytes32(string calldata json, string calldata key) external pure returns (bytes32);
    function parseJsonAddress(string calldata json, string calldata key) external pure returns (address);
    function parseJsonUint(string calldata json, string calldata key) external pure returns (uint256);
}
contract DigestVectorsTest {
    VectorVm constant vm = VectorVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    function testA14SharedFixedDigestVectors() public {
        string memory json = vm.readFile("../packages/shared/vectors/payment.json");
        vm.chainId(vm.parseJsonUint(json, ".domain.chainId"));
        TestToken token = new TestToken();
        MerchantRegistry registry = new MerchantRegistry();
        Mandate implementation = new Mandate(address(token), address(registry));
        address verifier = vm.parseJsonAddress(json, ".domain.verifyingContract");
        // Local-only runtime placement fixes the verifying address without changing production hashing.
        vm.etch(verifier, address(implementation).code);
        Mandate target = Mandate(verifier);
        Mandate.PaymentIntent memory i = Mandate.PaymentIntent(
            vm.parseJsonBytes32(json,".intent.mandateId"), vm.parseJsonBytes32(json,".intent.merchantId"),
            vm.parseJsonAddress(json,".intent.payout"), uint64(vm.parseJsonUint(json,".intent.registryVersion")),
            vm.parseJsonUint(json,".intent.amount"), vm.parseJsonBytes32(json,".intent.orderId"),
            vm.parseJsonBytes32(json,".intent.resourceHash"), vm.parseJsonUint(json,".intent.nonce"),
            uint64(vm.parseJsonUint(json,".intent.epoch")), uint64(vm.parseJsonUint(json,".intent.deadline"))
        );
        bytes32 intentDigest = target.hashIntent(i);
        require(intentDigest == vm.parseJsonBytes32(json,".expected.intent"), "intent digest mismatch");
        Mandate.PaymentApproval memory a = Mandate.PaymentApproval(intentDigest,i.mandateId,i.merchantId,i.payout,i.amount,i.epoch,i.deadline);
        bytes32 approvalDigest = target.hashApproval(a);
        require(approvalDigest == vm.parseJsonBytes32(json,".expected.approval"), "approval digest mismatch");
        Mandate.WorldAttestation memory att = Mandate.WorldAttestation(approvalDigest,
            vm.parseJsonBytes32(json,".attestation.ownerSubHash"), uint64(vm.parseJsonUint(json,".attestation.authTime")));
        require(target.hashAttestation(att) == vm.parseJsonBytes32(json,".expected.attestation"), "attestation digest mismatch");
    }
}
