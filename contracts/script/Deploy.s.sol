// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {Mandate} from "../src/Mandate.sol";
import {MerchantRegistry} from "../src/MerchantRegistry.sol";

interface DeployVm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

interface TokenMetadata {
    function decimals() external view returns (uint8);
}

contract Deploy {
    DeployVm constant vm = DeployVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant USDT = 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7;
    event Deployment(address registry, address mandate, address token, uint8 decimals);

    function run() external returns (MerchantRegistry registry, Mandate mandate) {
        require(block.chainid == 1874, "Whitechain Sepolia only");
        require(USDT.code.length > 0, "official USDT missing");
        uint8 decimals = TokenMetadata(USDT).decimals();
        vm.startBroadcast();
        registry = new MerchantRegistry();
        mandate = new Mandate(USDT, address(registry));
        vm.stopBroadcast();
        emit Deployment(address(registry), address(mandate), USDT, decimals);
    }
}
