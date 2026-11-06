// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {MandateTest, Vm} from "./Mandate.t.sol";
import {Mandate} from "../src/Mandate.sol";

contract RejectNativePayout {
    receive() external payable {
        revert("no native payments");
    }

    fallback() external payable {
        revert("no arbitrary calls");
    }
}

/// @notice NEW TESTS: UNEXECUTED until human forge output is supplied.
contract AdversarialEdgesTest is MandateTest {
    Vm private constant riskVm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function execute(Mandate.PaymentIntent memory i, bytes memory sig) internal returns (bytes32) {
        return mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testRiskRevokeFrontRunsInFlightPayment() public {
        Mandate.PaymentIntent memory i = intent(6, 1);
        bytes memory sig = signature(2, mandate.hashIntent(i));
        riskVm.prank(owner);
        mandate.revoke(id);
        riskVm.expectRevert(Mandate.StaleEpoch.selector);
        execute(i, sig);
        require(!mandate.nonceUsed(id, 1) && mandate.spent(id, 0) == 0, "revoked intent mutated accounting");
    }

    function testRiskAllowanceExhaustedMidSequenceRollsBack() public {
        pay(intent(6, 1));
        Mandate.PaymentIntent memory i = intent(6, 2);
        bytes memory sig = signature(2, mandate.hashIntent(i));
        riskVm.prank(owner);
        token.approve(address(mandate), 0);
        riskVm.expectRevert();
        execute(i, sig);
        require(
            !mandate.nonceUsed(id, 2) && mandate.spent(id, 0) == 6 && token.balanceOf(payout) == 6, "partial effects"
        );
        riskVm.prank(owner);
        token.approve(address(mandate), 6);
        execute(i, sig);
        require(mandate.spent(id, 0) == 12, "valid retry after allowance failed");
    }

    function testRiskThirdPartyCannotGriefNonceWithInvalidSignature() public {
        Mandate.PaymentIntent memory i = intent(6, 1);
        bytes memory invalid = signature(4, mandate.hashIntent(i));
        bytes memory valid = signature(2, mandate.hashIntent(i));
        riskVm.prank(address(0xBAD));
        riskVm.expectRevert(Mandate.BadIntentSig.selector);
        execute(i, invalid);
        require(!mandate.nonceUsed(id, 1), "attacker consumed nonce");
        execute(i, valid);
        require(mandate.nonceUsed(id, 1), "valid agent could not use nonce");
    }

    function testRiskRefundAfterRevokeAndPausePreservesSpend() public {
        bytes32 paymentId = pay(intent(6, 1));
        riskVm.prank(payout);
        token.approve(address(mandate), 6);
        riskVm.prank(owner);
        mandate.revoke(id);
        riskVm.prank(payout);
        mandate.refund(paymentId, 2);
        riskVm.prank(owner);
        mandate.setPaused(id, true);
        riskVm.prank(payout);
        mandate.refund(paymentId, 2);
        require(
            token.balanceOf(owner) == 198 && token.balanceOf(payout) == 2 && mandate.spent(id, 0) == 6,
            "refund reset spend or failed"
        );
    }

    function testRiskPeriodBoundaryExactly() public {
        pay(intent(6, 1));
        riskVm.warp(87399);
        require(mandate.periodIndex(id) == 0 && mandate.remaining(id) == 94, "early rollover");
        riskVm.warp(87400);
        require(mandate.periodIndex(id) == 1 && mandate.remaining(id) == 100, "boundary rollover wrong");
        Mandate.PaymentIntent memory i = intent(6, 2);
        i.deadline = 87500;
        pay(i);
        require(mandate.spent(id, 0) == 6 && mandate.spent(id, 1) == 6, "history corrupted");
    }

    function testRiskRegistryChangeSameBlockRejectsCachedTerms() public {
        Mandate.PaymentIntent memory i = intent(6, 1);
        bytes memory sig = signature(2, mandate.hashIntent(i));
        registry.updatePayout(merchant, payout); // Same address, same block; version still invalidates.
        riskVm.expectRevert(Mandate.RegistryMismatch.selector);
        execute(i, sig);
        require(!mandate.nonceUsed(id, 1) && token.balanceOf(payout) == 0, "stale registry consumed payment");
    }

    function testRiskMalformedAndOversizedAgentSignatures() public {
        Mandate.PaymentIntent memory i = intent(6, 1);
        riskVm.expectRevert(Mandate.BadIntentSig.selector);
        execute(i, hex"1234");
        bytes memory huge = new bytes(4096);
        riskVm.expectRevert(Mandate.BadIntentSig.selector);
        execute(i, huge);
        require(!mandate.nonceUsed(id, 1), "malformed signature consumed nonce");
    }

    function testRiskMalformedHumanSignaturesCannotConsumeIntent() public {
        Mandate.PaymentIntent memory i = intent(40, 1);
        bytes32 digest = mandate.hashIntent(i);
        bytes32 approval = mandate.hashApproval(Mandate.PaymentApproval(digest, id, merchant, payout, 40, 2, 1100));
        Mandate.WorldAttestation memory att = Mandate.WorldAttestation(approval, keccak256("fixture"), 1000);
        bytes memory agentSig = signature(2, digest);
        bytes memory ownerSig = signature(1, approval);
        bytes memory attestorSig = signature(3, mandate.hashAttestation(att));
        bytes memory huge = new bytes(4096);
        riskVm.expectRevert(Mandate.BadOwnerSig.selector);
        mandate.pay(i, agentSig, huge, att, attestorSig);
        riskVm.expectRevert(Mandate.BadAttestation.selector);
        mandate.pay(i, agentSig, ownerSig, att, huge);
        require(!mandate.nonceUsed(id, 1) && mandate.spent(id, 0) == 0, "bad human signatures mutated accounting");
    }

    function testRiskRevertingPayoutDoesNotReceiveNativeCallback() public {
        RejectNativePayout wallet = new RejectNativePayout();
        registry.updatePayout(merchant, address(wallet));
        Mandate.PaymentIntent memory i = intent(6, 1);
        i.payout = address(wallet);
        i.registryVersion = 2;
        pay(i);
        require(token.balanceOf(address(wallet)) == 6 && mandate.spent(id, 0) == 6, "ERC20 payout failed");
        // Standard ERC20 does not invoke receiver fallback; no native ETH is sent.
        (bool ok,) = address(wallet).call("");
        require(!ok, "payout fallback should reject");
    }
}
