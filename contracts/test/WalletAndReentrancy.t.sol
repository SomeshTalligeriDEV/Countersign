// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MandateTest, TestToken, Vm} from "./Mandate.t.sol";
import {Mandate} from "../src/Mandate.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract TestSmartWallet {
    address immutable controller;
    address immutable signer;

    constructor(address key) {
        controller = msg.sender;
        signer = key;
    }

    function execute(address target, bytes calldata data) external returns (bytes memory result) {
        require(msg.sender == controller, "not controller");
        (bool ok, bytes memory returned) = target.call(data);
        if (!ok) {
            assembly { revert(add(returned, 32), mload(returned)) }
        }
        return returned;
    }

    function isValidSignature(bytes32 digest, bytes calldata sig) external view returns (bytes4) {
        (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, sig);
        return err == ECDSA.RecoverError.NoError && recovered == signer ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}

contract ReenteringToken is TestToken {
    address target;
    bytes payload;

    function arm(address target_, bytes calldata payload_) external {
        target = target_;
        payload = payload_;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        (bool ok, bytes memory result) = target.call(payload);
        if (!ok) {
            assembly { revert(add(result, 32), mload(result)) }
        }
        return super.transferFrom(from, to, amount);
    }
}

contract WalletAndReentrancyTest is MandateTest {
    Vm constant cheat = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function testT29SmartWalletOwnerApprovesExactDigest() public {
        TestSmartWallet wallet = new TestSmartWallet(owner);
        Mandate.CreateParams memory p =
            Mandate.CreateParams(cheat.addr(2), cheat.addr(3), 50, 100, 10, 86400, 200000, bytes32(0));
        bytes32 smartId = abi.decode(
            wallet.execute(address(mandate), abi.encodeCall(Mandate.createMandate, (p, bytes32(0)))), (bytes32)
        );
        wallet.execute(address(mandate), abi.encodeCall(Mandate.setMerchant, (smartId, merchant, true)));
        token.mint(address(wallet), 100);
        wallet.execute(address(token), abi.encodeWithSignature("approve(address,uint256)", address(mandate), 100));
        Mandate.PaymentIntent memory i = intent(40, 1);
        i.mandateId = smartId;
        bytes32 intentDigest = mandate.hashIntent(i);
        bytes32 approval =
            mandate.hashApproval(Mandate.PaymentApproval(intentDigest, smartId, merchant, payout, 40, 2, 1100));
        Mandate.WorldAttestation memory att = Mandate.WorldAttestation(approval, keccak256("test-owner"), 1000);
        mandate.pay(
            i, signature(2, intentDigest), signature(1, approval), att, signature(3, mandate.hashAttestation(att))
        );
        require(token.balanceOf(address(wallet)) == 60 && token.balanceOf(payout) == 40, "wrong smart wallet transfer");
    }

    function testT24ReentrantTokenCannotExecuteSecondPayment() public {
        ReenteringToken evil = new ReenteringToken();
        Mandate guarded = new Mandate(address(evil), address(registry));
        Mandate.CreateParams memory p =
            Mandate.CreateParams(cheat.addr(2), cheat.addr(3), 50, 100, 10, 86400, 200000, bytes32(0));
        cheat.prank(owner);
        bytes32 evilId = guarded.createMandate(p, bytes32(0));
        cheat.prank(owner);
        guarded.setMerchant(evilId, merchant, true);
        evil.mint(owner, 100);
        cheat.prank(owner);
        evil.approve(address(guarded), 100);
        Mandate.PaymentIntent memory outer = intent(5, 1);
        outer.mandateId = evilId;
        Mandate.PaymentIntent memory inner = intent(5, 2);
        inner.mandateId = evilId;
        inner.nonce = 2;
        inner.orderId = bytes32(uint256(2));
        bytes memory innerSig = signature(2, guarded.hashIntent(inner));
        evil.arm(
            address(guarded),
            abi.encodeCall(Mandate.pay, (inner, innerSig, bytes(""), Mandate.WorldAttestation(0, 0, 0), bytes("")))
        );
        bytes memory outerSig = signature(2, guarded.hashIntent(outer));
        cheat.expectRevert(bytes4(keccak256("ReentrancyGuardReentrantCall()")));
        guarded.pay(outer, outerSig, "", Mandate.WorldAttestation(0, 0, 0), "");
        require(
            guarded.spent(evilId, 0) == 0 && !guarded.nonceUsed(evilId, 1) && !guarded.nonceUsed(evilId, 2),
            "reentrant effects persisted"
        );
        require(evil.balanceOf(owner) == 100 && evil.balanceOf(payout) == 0, "reentrant transfer");
    }
}
