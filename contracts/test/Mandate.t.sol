// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {Mandate} from "../src/Mandate.sol";
import {MerchantRegistry} from "../src/MerchantRegistry.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface Vm {
    function addr(uint256 key) external returns (address);
    function sign(uint256 key, bytes32 digest) external returns (uint8, bytes32, bytes32);
    function prank(address sender) external;
    function expectRevert(bytes4 selector) external;
    function warp(uint256 timestamp) external;
    function expectRevert() external;
    function chainId(uint256 id) external;
    function getChainId() external view returns (uint256);
}

/// @dev Local test token only; never deployed to Whitechain.
contract TestToken is ERC20 {
    constructor() ERC20("Local test", "TEST") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MandateTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    TestToken token;
    MerchantRegistry registry;
    Mandate mandate;
    bytes32 id;
    bytes32 merchant = keccak256("merchant");
    address owner;
    address payout = address(0xBEEF);

    function setUp() public {
        vm.warp(1000);
        owner = vm.addr(1);
        token = new TestToken();
        registry = new MerchantRegistry();
        mandate = new Mandate(address(token), address(registry));
        registry.register(merchant, payout);
        Mandate.CreateParams memory p =
            Mandate.CreateParams(vm.addr(2), vm.addr(3), 50, 100, 10, 86400, 200000, bytes32(0));
        vm.prank(owner);
        id = mandate.createMandate(p, bytes32(0));
        vm.prank(owner);
        mandate.setMerchant(id, merchant, true);
        token.mint(owner, 200);
        vm.prank(owner);
        token.approve(address(mandate), 200);
    }

    function intent(uint256 amount, uint256 nonce) internal view returns (Mandate.PaymentIntent memory) {
        return Mandate.PaymentIntent(id, merchant, payout, 1, amount, bytes32(nonce), bytes32(0), nonce, 2, 1100);
    }

    function signature(uint256 key, bytes32 digest) internal returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function pay(Mandate.PaymentIntent memory i) internal returns (bytes32) {
        bytes memory sig = signature(2, mandate.hashIntent(i));
        return mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testSmallPaymentMovesOnlyOwnerFunds() public {
        pay(intent(5, 1));
        require(token.balanceOf(owner) == 195 && token.balanceOf(payout) == 5, "wrong transfer");
        require(mandate.spent(id, 0) == 5, "missing spend");
    }

    function testT02TamperedAmount() public {
        Mandate.PaymentIntent memory i = intent(5, 1);
        bytes memory sig = signature(2, mandate.hashIntent(i));
        i.amount = 6;
        vm.expectRevert(Mandate.BadIntentSig.selector);
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testT04PayoutVersionChanged() public {
        Mandate.PaymentIntent memory i = intent(5, 1);
        bytes memory sig = signature(2, mandate.hashIntent(i));
        registry.updatePayout(merchant, address(123));
        vm.expectRevert(Mandate.RegistryMismatch.selector);
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testT10NonceReplay() public {
        Mandate.PaymentIntent memory i = intent(5, 1);
        bytes memory sig = signature(2, mandate.hashIntent(i));
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
        vm.expectRevert(Mandate.NonceUsed.selector);
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testT12HumanThresholdRequiresOwner() public {
        Mandate.PaymentIntent memory i = intent(10, 1);
        bytes memory sig = signature(2, mandate.hashIntent(i));
        vm.expectRevert(Mandate.BadOwnerSig.selector);
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testHumanApprovalSettlesExactDigest() public {
        Mandate.PaymentIntent memory i = intent(40, 1);
        bytes32 digest = mandate.hashIntent(i);
        bytes32 approval = mandate.hashApproval(Mandate.PaymentApproval(digest, id, merchant, payout, 40, 2, 1100));
        Mandate.WorldAttestation memory att = Mandate.WorldAttestation(approval, keccak256("local-test-identity"), 1000);
        mandate.pay(i, signature(2, digest), signature(1, approval), att, signature(3, mandate.hashAttestation(att)));
        require(token.balanceOf(payout) == 40, "not settled");
    }

    function testT16RevocationRejectsUnusedIntent() public {
        Mandate.PaymentIntent memory i = intent(5, 1);
        bytes memory sig = signature(2, mandate.hashIntent(i));
        vm.prank(owner);
        mandate.revoke(id);
        vm.expectRevert(Mandate.StaleEpoch.selector);
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testT08LimitChangePreservesSpend() public {
        pay(intent(5, 1));
        vm.prank(owner);
        mandate.updateLimits(id, 50, 150, 10);
        require(mandate.spent(id, 0) == 5 && mandate.remaining(id) == 145, "budget reset");
    }

    function testT27RefundCannotExceedPaymentOrRestoreBudget() public {
        bytes32 paymentId = pay(intent(5, 1));
        vm.prank(payout);
        token.approve(address(mandate), 5);
        vm.prank(payout);
        mandate.refund(paymentId, 3);
        require(mandate.spent(id, 0) == 5, "refund restored budget");
        vm.expectRevert(Mandate.OverRefund.selector);
        vm.prank(payout);
        mandate.refund(paymentId, 3);
    }

    function rejected(Mandate.PaymentIntent memory i, bytes4 error) internal {
        bytes memory sig = signature(2, mandate.hashIntent(i));
        vm.expectRevert(error);
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testT03TamperedPayout() public {
        Mandate.PaymentIntent memory i = intent(5, 1);
        bytes memory sig = signature(2, mandate.hashIntent(i));
        i.payout = address(123);
        vm.expectRevert(Mandate.RegistryMismatch.selector);
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testT05InactiveMerchant() public {
        registry.setActive(merchant, false);
        rejected(intent(5, 1), Mandate.RegistryMismatch.selector);
    }

    function testT06HardPerTransactionCap() public {
        rejected(intent(51, 1), Mandate.OverPerTx.selector);
    }

    function testT07CumulativePeriodCap() public {
        for (uint256 n = 1; n <= 11; n++) {
            pay(intent(9, n));
        }
        rejected(intent(2, 12), Mandate.OverPeriod.selector);
        require(mandate.spent(id, 0) == 99, "failed payment changed spend");
    }

    function testT09PeriodRolloverPreservesHistory() public {
        pay(intent(5, 1));
        vm.warp(87400);
        Mandate.PaymentIntent memory i = intent(7, 2);
        i.deadline = 87500;
        pay(i);
        require(mandate.spent(id, 0) == 5 && mandate.spent(id, 1) == 7, "period accounting corrupted");
    }

    function testT11DuplicateOrderNewNonce() public {
        pay(intent(5, 1));
        Mandate.PaymentIntent memory i = intent(5, 2);
        i.orderId = bytes32(uint256(1));
        rejected(i, Mandate.AlreadyPaid.selector);
    }

    function testT18ExpiredIntent() public {
        vm.warp(1101);
        rejected(intent(5, 1), Mandate.Expired.selector);
    }

    function testT19ExpiredMandate() public {
        vm.warp(200000);
        Mandate.PaymentIntent memory i = intent(5, 1);
        i.deadline = 200100;
        rejected(i, Mandate.MandateExpired.selector);
    }

    function testT20PausedMandate() public {
        vm.prank(owner);
        mandate.setPaused(id, true);
        rejected(intent(5, 1), Mandate.Paused.selector);
    }

    function testT21MerchantNotAllowed() public {
        vm.prank(owner);
        mandate.setMerchant(id, merchant, false);
        Mandate.PaymentIntent memory i = intent(5, 1);
        i.epoch = 3;
        rejected(i, Mandate.MerchantNotAllowed.selector);
    }

    function testT26UnauthorizedRefund() public {
        bytes32 paymentId = pay(intent(5, 1));
        vm.expectRevert(Mandate.NotPayout.selector);
        mandate.refund(paymentId, 1);
    }

    function testT28AllAdministrativeCallsRequireOwner() public {
        vm.expectRevert(Mandate.NotOwner.selector);
        mandate.revoke(id);
        vm.expectRevert(Mandate.NotOwner.selector);
        mandate.setPaused(id, true);
        vm.expectRevert(Mandate.NotOwner.selector);
        mandate.setMerchant(id, merchant, false);
        vm.expectRevert(Mandate.NotOwner.selector);
        mandate.updateLimits(id, 1, 2, 1);
        vm.expectRevert(Mandate.NotOwner.selector);
        mandate.rotateAgent(id, address(123));
        vm.expectRevert(Mandate.NotOwner.selector);
        mandate.setAttestor(id, address(123));
    }

    function testZeroAmountCannotBypassOrderDeduplication() public {
        rejected(intent(0, 1), Mandate.OverPerTx.selector);
    }

    function approvalFailure(uint64 authTime, uint256 attestorKey, bool mismatch, bytes4 expected) internal {
        Mandate.PaymentIntent memory i = intent(40, 1);
        bytes32 digest = mandate.hashIntent(i);
        bytes32 approval = mandate.hashApproval(Mandate.PaymentApproval(digest, id, merchant, payout, 40, 2, 1100));
        Mandate.WorldAttestation memory att = Mandate.WorldAttestation(
            mismatch ? bytes32(uint256(123)) : approval, keccak256("local-test-identity"), authTime
        );
        bytes memory agentSig = signature(2, digest);
        bytes memory ownerSig = signature(1, approval);
        bytes memory attestorSig = signature(attestorKey, mandate.hashAttestation(att));
        vm.expectRevert(expected);
        mandate.pay(i, agentSig, ownerSig, att, attestorSig);
        require(mandate.spent(id, 0) == 0 && token.balanceOf(owner) == 200, "rejection changed funds");
    }

    function testT13AttestationMustBindOwnerApproval() public {
        approvalFailure(1000, 3, true, Mandate.BadApproval.selector);
    }

    function testT14WrongAttestorCannotApprove() public {
        approvalFailure(1000, 4, false, Mandate.BadAttestation.selector);
    }

    function testT15StaleAndFutureAuthentication() public {
        approvalFailure(699, 3, false, Mandate.StaleAuth.selector);
        approvalFailure(1001, 3, false, Mandate.StaleAuth.selector);
    }

    function testT22DifferentChainSignatureRejected() public {
        Mandate.PaymentIntent memory i = intent(5, 1);
        // Read through a cheatcode: Solidity assumes block.chainid is constant
        // during a transaction, but vm.chainId intentionally violates that assumption.
        uint256 originalChain = vm.getChainId();
        bytes32 originalDigest = mandate.hashIntent(i);
        vm.chainId(originalChain + 1);
        require(vm.getChainId() == originalChain + 1, "foreign chain not installed");
        bytes32 foreignDigest = mandate.hashIntent(i);
        require(foreignDigest != originalDigest, "digest must bind chain ID");
        bytes memory sig = signature(2, foreignDigest);
        vm.chainId(originalChain);
        require(vm.getChainId() == originalChain, "original chain not restored");
        require(mandate.hashIntent(i) == originalDigest, "original digest not restored");
        vm.expectRevert(Mandate.BadIntentSig.selector);
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
        require(!mandate.nonceUsed(id, 1) && mandate.spent(id, 0) == 0, "foreign signature changed accounting");
        require(token.balanceOf(owner) == 200 && token.balanceOf(payout) == 0, "foreign signature moved funds");
    }

    function testT22DifferentContractSignatureRejected() public {
        Mandate other = new Mandate(address(token), address(registry));
        Mandate.PaymentIntent memory i = intent(5, 1);
        bytes memory sig = signature(2, other.hashIntent(i));
        vm.expectRevert(Mandate.BadIntentSig.selector);
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testT23MalleableSignatureRejected() public {
        Mandate.PaymentIntent memory i = intent(5, 1);
        (uint8 v, bytes32 r, bytes32 lowS) = vm.sign(2, mandate.hashIntent(i));
        uint256 order = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
        bytes memory sig = abi.encodePacked(r, bytes32(order - uint256(lowS)), uint8(v == 27 ? 28 : 27));
        vm.expectRevert(Mandate.BadIntentSig.selector);
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testT25InsufficientAllowanceRollsBackAllEffects() public {
        vm.prank(owner);
        token.approve(address(mandate), 4);
        Mandate.PaymentIntent memory i = intent(5, 1);
        bytes memory sig = signature(2, mandate.hashIntent(i));
        vm.expectRevert();
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
        require(!mandate.nonceUsed(id, 1), "nonce consumed on revert");
        require(mandate.spent(id, 0) == 0, "spend consumed on revert");
        require(token.balanceOf(owner) == 200 && token.balanceOf(payout) == 0, "funds moved");
        // Retrying the exact signed intent must work after restoring the allowance.
        vm.prank(owner);
        token.approve(address(mandate), 5);
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
    }

    function testT01AttackerCannotUseVictimAllowance() public {
        address attacker = vm.addr(4);
        Mandate.CreateParams memory p =
            Mandate.CreateParams(vm.addr(2), vm.addr(3), 50, 100, 10, 86400, 200000, bytes32(0));
        vm.prank(attacker);
        bytes32 attackId = mandate.createMandate(p, bytes32(0));
        vm.prank(attacker);
        mandate.setMerchant(attackId, merchant, true);
        Mandate.PaymentIntent memory i = intent(5, 1);
        i.mandateId = attackId;
        bytes memory sig = signature(2, mandate.hashIntent(i));
        vm.expectRevert();
        mandate.pay(i, sig, "", Mandate.WorldAttestation(0, 0, 0), "");
        require(token.balanceOf(owner) == 200, "victim drained");
        require(token.allowance(owner, address(mandate)) == 200, "victim allowance consumed");
    }

    function testT17PolicyChangesInvalidateFullApproval() public {
        Mandate.PaymentIntent memory i = intent(40, 1);
        bytes32 digest = mandate.hashIntent(i);
        bytes32 approval = mandate.hashApproval(Mandate.PaymentApproval(digest, id, merchant, payout, 40, 2, 1100));
        Mandate.WorldAttestation memory att = Mandate.WorldAttestation(approval, keccak256("local-test-identity"), 1000);
        bytes memory agentSig = signature(2, digest);
        bytes memory ownerSig = signature(1, approval);
        bytes memory attestorSig = signature(3, mandate.hashAttestation(att));
        vm.prank(owner);
        mandate.updateLimits(id, 50, 150, 10);
        vm.expectRevert(Mandate.StaleEpoch.selector);
        mandate.pay(i, agentSig, ownerSig, att, attestorSig);
        vm.prank(owner);
        mandate.rotateAgent(id, address(123));
        vm.expectRevert(Mandate.StaleEpoch.selector);
        mandate.pay(i, agentSig, ownerSig, att, attestorSig);
        vm.prank(owner);
        mandate.setAttestor(id, address(456));
        vm.expectRevert(Mandate.StaleEpoch.selector);
        mandate.pay(i, agentSig, ownerSig, att, attestorSig);
    }

    function testLoweredBudgetSaturatesRemainingWithoutResettingSpent() public {
        for (uint256 n = 1; n <= 10; n++) {
            pay(intent(9, n));
        }
        vm.prank(owner);
        mandate.updateLimits(id, 10, 50, 10);
        require(mandate.spent(id, 0) == 90, "lowering cap reset spending");
        require(mandate.remaining(id) == 0, "remaining underflow");
        Mandate.PaymentIntent memory i = intent(1, 11);
        i.epoch = 3;
        rejected(i, Mandate.OverPeriod.selector);
        require(!mandate.nonceUsed(id, 11), "rejection consumed nonce");
    }

    function testT16RevocationRejectsFullySignedHumanApproval() public {
        Mandate.PaymentIntent memory i = intent(40, 1);
        bytes32 digest = mandate.hashIntent(i);
        bytes32 approval = mandate.hashApproval(Mandate.PaymentApproval(digest, id, merchant, payout, 40, 2, 1100));
        Mandate.WorldAttestation memory att = Mandate.WorldAttestation(approval, keccak256("local-test-identity"), 1000);
        bytes memory agentSig = signature(2, digest);
        bytes memory ownerSig = signature(1, approval);
        bytes memory attestorSig = signature(3, mandate.hashAttestation(att));
        vm.prank(owner);
        mandate.revoke(id);
        vm.expectRevert(Mandate.StaleEpoch.selector);
        mandate.pay(i, agentSig, ownerSig, att, attestorSig);
        require(token.balanceOf(owner) == 200 && mandate.spent(id, 0) == 0, "revoked approval spent funds");
    }

    function testT08RaisedLimitAllowsOnlyUnspentRemainder() public {
        for (uint256 n = 1; n <= 10; n++) {
            pay(intent(9, n));
        }
        vm.prank(owner);
        mandate.updateLimits(id, 50, 110, 51);
        require(mandate.spent(id, 0) == 90 && mandate.remaining(id) == 20, "spent reset");
        Mandate.PaymentIntent memory i = intent(20, 11);
        i.epoch = 3;
        pay(i);
        i = intent(1, 12);
        i.epoch = 3;
        rejected(i, Mandate.OverPeriod.selector);
        require(mandate.spent(id, 0) == 110, "wrong final spent");
    }
}
