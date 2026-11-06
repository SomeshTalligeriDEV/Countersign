// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {Mandate} from "../src/Mandate.sol";
import {MerchantRegistry} from "../src/MerchantRegistry.sol";
import {TestToken, Vm} from "./Mandate.t.sol";

contract MandateHandler {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    Mandate public mandate;
    TestToken public token;
    bytes32 public id;
    bytes32 constant MERCHANT = keccak256("invariant-merchant");
    uint64 public epoch = 2;
    uint128 public limit = 100;
    uint256 public totalPaid;
    uint256 public totalRefunded;
    uint256 public successfulPayments;
    mapping(uint256 => uint256) public expectedSpent;
    bytes32[] public paymentIds;
    mapping(bytes32 => uint128) public paid;
    mapping(bytes32 => uint128) public refunded;
    bool public violation;

    constructor() {
        MerchantRegistry registry = new MerchantRegistry();
        token = new TestToken();
        mandate = new Mandate(address(token), address(registry));
        registry.register(MERCHANT, address(this));
        Mandate.CreateParams memory p =
            Mandate.CreateParams(vm.addr(2), vm.addr(3), 50, 100, 51, 86400, type(uint64).max, bytes32(0));
        id = mandate.createMandate(p, bytes32(0));
        mandate.setMerchant(id, MERCHANT, true);
        token.mint(address(this), 1000000);
        token.approve(address(mandate), 1000000);
    }

    function pay(uint256 amountSeed, uint256 nonceSeed, uint256 orderSeed) external {
        uint256 amount = amountSeed % 70;
        uint256 nonce = nonceSeed % 128;
        bytes32 order = bytes32(orderSeed % 128);
        Mandate.PaymentIntent memory i = Mandate.PaymentIntent(
            id, MERCHANT, address(this), 1, amount, order, bytes32(0), nonce, epoch, uint64(block.timestamp + 60)
        );
        bytes32 paymentId = keccak256(abi.encode(id, MERCHANT, order));
        uint256 idx = mandate.periodIndex(id);
        bool used = mandate.nonceUsed(id, nonce);
        bool shouldPass =
            amount > 0 && amount <= 50 && expectedSpent[idx] + amount <= limit && !used && paid[paymentId] == 0;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, mandate.hashIntent(i));
        try mandate.pay(i, abi.encodePacked(r, s, v), "", Mandate.WorldAttestation(0, 0, 0), "") returns (
            bytes32 result
        ) {
            if (!shouldPass || result != paymentId) violation = true;
            expectedSpent[idx] += amount;
            totalPaid += amount;
            successfulPayments++;
            paymentIds.push(paymentId);
            paid[paymentId] = uint128(amount);
            if (!mandate.nonceUsed(id, nonce)) violation = true;
        } catch {
            if (shouldPass) violation = true;
        }
        if (mandate.spent(id, idx) != expectedSpent[idx]) violation = true;
    }

    function updateLimits(uint256 seed) external {
        // Keep the new cap >= spent so I2 can be asserted at every step.
        uint256 idx = mandate.periodIndex(id);
        uint256 next = expectedSpent[idx] + 50 + seed % 200;
        limit = uint128(next);
        mandate.updateLimits(id, 50, limit, 51);
        epoch++;
        if (mandate.spent(id, idx) != expectedSpent[idx]) violation = true;
    }

    function revoke() external {
        uint256 idx = mandate.periodIndex(id);
        mandate.revoke(id);
        epoch++;
        if (mandate.spent(id, idx) != expectedSpent[idx]) violation = true;
    }

    function refund(uint256 indexSeed, uint128 amountSeed) external {
        if (paymentIds.length == 0) return;
        bytes32 paymentId = paymentIds[indexSeed % paymentIds.length];
        uint128 amount = amountSeed % 70;
        bool shouldPass = amount > 0 && uint256(refunded[paymentId]) + amount <= paid[paymentId];
        uint256 idx = mandate.periodIndex(id);
        try mandate.refund(paymentId, amount) {
            if (!shouldPass) violation = true;
            refunded[paymentId] += amount;
            totalRefunded += amount;
        } catch {
            if (shouldPass) violation = true;
        }
        if (mandate.spent(id, idx) != expectedSpent[idx]) violation = true;
    }

    function warp(uint256 seed) external {
        uint256 oldIdx = mandate.periodIndex(id);
        vm.warp(block.timestamp + seed % 172801);
        if (mandate.spent(id, oldIdx) != expectedSpent[oldIdx]) violation = true;
    }

    function check() external view {
        require(!violation, "handler observed invariant violation");
        uint256 idx = mandate.periodIndex(id);
        require(mandate.spent(id, idx) == expectedSpent[idx], "spending history mismatch");
        require(expectedSpent[idx] <= limit, "period cap exceeded");
        require(totalRefunded <= totalPaid, "refund total exceeded payments");
        for (uint256 n; n < paymentIds.length; n++) {
            (,,, uint128 amount, uint128 returned) = mandate.payments(paymentIds[n]);
            require(amount == paid[paymentIds[n]] && returned == refunded[paymentIds[n]], "payment record mismatch");
            require(returned <= amount, "over refund");
        }
    }
}

contract MandateInvariantTest {
    MandateHandler public handler;
    address[] private targets;

    function setUp() public {
        handler = new MandateHandler();
        targets.push(address(handler));
        // Seed real activity to avoid an invariant suite that only checks empty storage.
        handler.pay(5, 1, 1);
        require(handler.successfulPayments() == 1, "seed payment failed");
    }

    function targetContracts() external view returns (address[] memory) {
        return targets;
    }

    function invariant_T30AccountingReplayAndRefundBounds() public view {
        handler.check();
    }
}
