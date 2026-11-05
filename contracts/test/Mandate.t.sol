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
}
