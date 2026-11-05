// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Merchant-controlled payout registry. Every mutation invalidates old terms.
contract MerchantRegistry {
    struct Merchant {
        address owner;
        address payout;
        uint64 version;
        bool active;
    }
    mapping(bytes32 => Merchant) public merchants;

    error AlreadyRegistered();
    error InvalidPayout();
    error NotMerchantOwner();

    event MerchantRegistered(bytes32 indexed merchantId, address indexed owner, address payout);
    event PayoutUpdated(bytes32 indexed merchantId, address payout, uint64 version);
    event MerchantStatus(bytes32 indexed merchantId, bool active, uint64 version);

    function register(bytes32 merchantId, address payout) external {
        if (merchants[merchantId].owner != address(0)) revert AlreadyRegistered();
        if (payout == address(0)) revert InvalidPayout();
        merchants[merchantId] = Merchant(msg.sender, payout, 1, true);
        emit MerchantRegistered(merchantId, msg.sender, payout);
    }

    function updatePayout(bytes32 merchantId, address newPayout) external {
        Merchant storage merchant = merchants[merchantId];
        if (merchant.owner != msg.sender) revert NotMerchantOwner();
        if (newPayout == address(0)) revert InvalidPayout();
        merchant.payout = newPayout;
        merchant.version++;
        emit PayoutUpdated(merchantId, newPayout, merchant.version);
    }

    function setActive(bytes32 merchantId, bool active) external {
        Merchant storage merchant = merchants[merchantId];
        if (merchant.owner != msg.sender) revert NotMerchantOwner();
        merchant.active = active;
        merchant.version++;
        emit MerchantStatus(merchantId, active, merchant.version);
    }

    function get(bytes32 merchantId) external view returns (address payout, uint64 version, bool active) {
        Merchant storage merchant = merchants[merchantId];
        return (merchant.payout, merchant.version, merchant.active);
    }
}
