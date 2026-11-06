// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {Mandate} from "../src/Mandate.sol";
import {MerchantRegistry} from "../src/MerchantRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface PaymentVm {
    function envAddress(string calldata) external returns (address);
    function envUint(string calldata) external returns (uint256);
    function addr(uint256) external returns (address);
    function sign(uint256, bytes32) external returns (uint8, bytes32, bytes32);
    function startBroadcast() external;
    function stopBroadcast() external;
}

interface DecimalsToken {
    function decimals() external view returns (uint8);
}

contract FirstPayment {
    using SafeERC20 for IERC20;
    PaymentVm constant vm = PaymentVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant TOKEN = 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7;
    event Paid(bytes32 mandateId, bytes32 merchantId, bytes32 paymentId, uint256 amount);

    function run() external {
        require(block.chainid == 1874, "testnet only");
        Mandate mandate = Mandate(vm.envAddress("MANDATE_ADDRESS"));
        MerchantRegistry registry = MerchantRegistry(vm.envAddress("REGISTRY_ADDRESS"));
        address owner = vm.envAddress("OWNER_ADDRESS");
        address payout = vm.envAddress("DEMO_PAYOUT");
        address attestor = vm.envAddress("ATTESTOR_ADDRESS");
        require(payout != owner && payout != address(0), "distinct payout required");
        require(
            address(mandate.usdt()) == TOKEN && address(mandate.registry()) == address(registry), "deployment mismatch"
        );
        uint8 decimals = DecimalsToken(TOKEN).decimals();
        require(decimals > 0 && decimals <= 36, "unsupported decimals");
        uint256 amount = 5 * 10 ** (decimals - 1);
        require(IERC20(TOKEN).balanceOf(owner) >= amount, "fund owner with official test USDT");
        uint256 agentKey = vm.envUint("DEMO_AGENT_KEY");
        bytes32 salt = keccak256(abi.encode(owner, block.timestamp, block.number));
        bytes32 merchantId = keccak256(abi.encode("Countersign demo", salt));
        bytes32 mandateId = keccak256(abi.encode(owner, salt));
        uint256 beforeBalance = IERC20(TOKEN).balanceOf(payout);
        vm.startBroadcast();
        registry.register(merchantId, payout);
        mandate.createMandate(
            Mandate.CreateParams(
                vm.addr(agentKey),
                attestor,
                uint128(amount * 4),
                uint128(amount * 10),
                uint128(amount * 2),
                1 days,
                uint64(block.timestamp + 1 days),
                bytes32(0)
            ),
            salt
        );
        mandate.updateLimits(mandateId, uint128(amount * 4), uint128(amount * 10), uint128(amount * 2));
        mandate.setMerchant(mandateId, merchantId, true);
        IERC20(TOKEN).forceApprove(address(mandate), amount);
        vm.stopBroadcast();
        Mandate.PaymentIntent memory intent = Mandate.PaymentIntent(
            mandateId,
            merchantId,
            payout,
            1,
            amount,
            keccak256(abi.encode(salt, "report")),
            keccak256("GET /api/report"),
            1,
            3,
            uint64(block.timestamp + 180)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agentKey, mandate.hashIntent(intent));
        vm.startBroadcast();
        bytes32 paymentId =
            mandate.pay(intent, abi.encodePacked(r, s, v), "", Mandate.WorldAttestation(bytes32(0), bytes32(0), 0), "");
        vm.stopBroadcast();
        require(IERC20(TOKEN).balanceOf(payout) == beforeBalance + amount, "settlement mismatch");
        emit Paid(mandateId, merchantId, paymentId, amount);
    }
}
