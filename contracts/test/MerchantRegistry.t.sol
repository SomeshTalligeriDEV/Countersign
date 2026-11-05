// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {MerchantRegistry} from "../src/MerchantRegistry.sol";

contract Stranger {
    function change(MerchantRegistry registry, bytes32 id) external {
        registry.updatePayout(id, address(this));
    }
}

contract MerchantRegistryTest {
    function testVersionInvalidatesTermsOnEveryChange() public {
        MerchantRegistry registry = new MerchantRegistry();
        bytes32 id = keccak256("merchant");
        registry.register(id, address(1));
        registry.updatePayout(id, address(2));
        registry.setActive(id, false);
        (address payout, uint64 version, bool active) = registry.get(id);
        require(payout == address(2) && version == 3 && !active, "terms not invalidated");
    }

    function testStrangerCannotRedirectPayout() public {
        MerchantRegistry registry = new MerchantRegistry();
        bytes32 id = keccak256("merchant");
        registry.register(id, address(1));
        Stranger stranger = new Stranger();
        try stranger.change(registry, id) {
            revert("unauthorized mutation accepted");
        } catch (bytes memory reason) {
            require(bytes4(reason) == MerchantRegistry.NotMerchantOwner.selector, "wrong rejection");
        }
        (address payout,,) = registry.get(id);
        require(payout == address(1), "payout changed");
    }

    function testDuplicateCannotTakeOwnership() public {
        MerchantRegistry registry = new MerchantRegistry();
        bytes32 id = keccak256("merchant");
        registry.register(id, address(1));
        try registry.register(id, address(2)) {
            revert("duplicate accepted");
        } catch (bytes memory reason) {
            require(bytes4(reason) == MerchantRegistry.AlreadyRegistered.selector, "wrong rejection");
        }
    }
}
