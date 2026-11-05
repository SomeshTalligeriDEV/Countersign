// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerchantRegistry} from "./MerchantRegistry.sol";

contract Mandate is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Policy {
        address owner;
        address agent;
        address attestor;
        uint128 perTxLimit;
        uint128 periodLimit;
        uint128 humanThreshold;
        uint64 start;
        uint64 periodLength;
        uint64 expiry;
        uint64 epoch;
        bytes32 ensNamehash;
        bool paused;
    }

    struct CreateParams {
        address agent;
        address attestor;
        uint128 perTxLimit;
        uint128 periodLimit;
        uint128 humanThreshold;
        uint64 periodLength;
        uint64 expiry;
        bytes32 ensNamehash;
    }

    struct Payment {
        bytes32 mandateId;
        bytes32 merchantId;
        address payout;
        uint128 amount;
        uint128 refunded;
    }

    struct PaymentIntent {
        bytes32 mandateId;
        bytes32 merchantId;
        address payout;
        uint64 registryVersion;
        uint256 amount;
        bytes32 orderId;
        bytes32 resourceHash;
        uint256 nonce;
        uint64 epoch;
        uint64 deadline;
    }

    struct PaymentApproval {
        bytes32 intentDigest;
        bytes32 mandateId;
        bytes32 merchantId;
        address payout;
        uint256 amount;
        uint64 epoch;
        uint64 deadline;
    }

    struct WorldAttestation {
        bytes32 approvalDigest;
        bytes32 ownerSubHash;
        uint64 authTime;
    }

    mapping(bytes32 => Policy) public policies;
    mapping(bytes32 => mapping(bytes32 => bool)) public merchantAllowed;
    mapping(bytes32 => mapping(uint256 => uint256)) public spent;
    mapping(bytes32 => mapping(uint256 => bool)) public nonceUsed;
    mapping(bytes32 => Payment) public payments;
    IERC20 public immutable usdt;
    MerchantRegistry public immutable registry;
    uint64 public constant MAX_AUTH_AGE = 300;
    bytes32 private constant INTENT_TYPEHASH = keccak256(
        "PaymentIntent(bytes32 mandateId,bytes32 merchantId,address payout,uint64 registryVersion,uint256 amount,bytes32 orderId,bytes32 resourceHash,uint256 nonce,uint64 epoch,uint64 deadline)"
    );
    bytes32 private constant APPROVAL_TYPEHASH = keccak256(
        "PaymentApproval(bytes32 intentDigest,bytes32 mandateId,bytes32 merchantId,address payout,uint256 amount,uint64 epoch,uint64 deadline)"
    );
    bytes32 private constant ATTESTATION_TYPEHASH =
        keccak256("WorldAttestation(bytes32 approvalDigest,bytes32 ownerSubHash,uint64 authTime)");

    error UnknownMandate();
    error Paused();
    error Expired();
    error MandateExpired();
    error StaleEpoch();
    error NonceUsed();
    error AlreadyPaid();
    error MerchantNotAllowed();
    error RegistryMismatch();
    error OverPerTx();
    error OverPeriod();
    error BadIntentSig();
    error BadOwnerSig();
    error BadApproval();
    error StaleAuth();
    error BadAttestation();
    error NotOwner();
    error NotPayout();
    error OverRefund();
    error InvalidPolicy();
    error AlreadyExists();

    event MandateCreated(bytes32 indexed mandateId, address indexed owner, address agent);
    event LimitsUpdated(bytes32 indexed mandateId, uint128 perTx, uint128 period, uint128 threshold, uint64 epoch);
    event MerchantSet(bytes32 indexed mandateId, bytes32 indexed merchantId, bool allowed);
    event Revoked(bytes32 indexed mandateId, uint64 newEpoch);
    event AgentRotated(bytes32 indexed mandateId, address agent, uint64 epoch);
    event AttestorChanged(bytes32 indexed mandateId, address attestor, uint64 epoch);
    event PauseChanged(bytes32 indexed mandateId, bool paused);
    event PaymentExecuted(
        bytes32 indexed paymentId,
        bytes32 indexed mandateId,
        bytes32 indexed merchantId,
        address payout,
        uint256 amount,
        bytes32 orderId,
        bool humanApproved
    );
    event PaymentRefunded(bytes32 indexed paymentId, uint128 amount, uint128 totalRefunded);

    constructor(address token, address merchantRegistry) EIP712("Countersign", "1") {
        if (token.code.length == 0 || merchantRegistry.code.length == 0) revert InvalidPolicy();
        usdt = IERC20(token);
        registry = MerchantRegistry(merchantRegistry);
    }

    modifier onlyOwner(bytes32 id) {
        if (policies[id].owner != msg.sender) revert NotOwner();
        _;
    }

    function createMandate(CreateParams calldata p, bytes32 salt) external returns (bytes32 id) {
        if (p.agent == address(0) || p.attestor == address(0) || p.periodLength == 0 || p.expiry <= block.timestamp) {
            revert InvalidPolicy();
        }
        _validateLimits(p.perTxLimit, p.periodLimit, p.humanThreshold);
        id = keccak256(abi.encode(msg.sender, salt));
        if (policies[id].owner != address(0)) revert AlreadyExists();
        policies[id] = Policy(
            msg.sender,
            p.agent,
            p.attestor,
            p.perTxLimit,
            p.periodLimit,
            p.humanThreshold,
            uint64(block.timestamp),
            p.periodLength,
            p.expiry,
            1,
            p.ensNamehash,
            false
        );
        emit MandateCreated(id, msg.sender, p.agent);
    }

    function setMerchant(bytes32 id, bytes32 merchantId, bool allowed) external onlyOwner(id) {
        merchantAllowed[id][merchantId] = allowed;
        // Re-enabling a merchant must not revive previously authorized intents.
        policies[id].epoch++;
        emit MerchantSet(id, merchantId, allowed);
    }

    function updateLimits(bytes32 id, uint128 perTx, uint128 period, uint128 threshold) external onlyOwner(id) {
        _validateLimits(perTx, period, threshold);
        Policy storage p = policies[id];
        p.perTxLimit = perTx;
        p.periodLimit = period;
        p.humanThreshold = threshold;
        p.epoch++;
        emit LimitsUpdated(id, perTx, period, threshold, p.epoch);
    }

    function rotateAgent(bytes32 id, address agent) external onlyOwner(id) {
        if (agent == address(0)) revert InvalidPolicy();
        policies[id].agent = agent;
        policies[id].epoch++;
        emit AgentRotated(id, agent, policies[id].epoch);
    }

    function setAttestor(bytes32 id, address attestor) external onlyOwner(id) {
        if (attestor == address(0)) revert InvalidPolicy();
        policies[id].attestor = attestor;
        policies[id].epoch++;
        emit AttestorChanged(id, attestor, policies[id].epoch);
    }

    function revoke(bytes32 id) external onlyOwner(id) {
        policies[id].epoch++;
        emit Revoked(id, policies[id].epoch);
    }

    function setPaused(bytes32 id, bool paused) external onlyOwner(id) {
        policies[id].paused = paused;
        emit PauseChanged(id, paused);
    }

    function periodIndex(bytes32 id) public view returns (uint256) {
        Policy storage p = policies[id];
        if (p.owner == address(0)) revert UnknownMandate();
        return (block.timestamp - p.start) / p.periodLength;
    }

    function remaining(bytes32 id) external view returns (uint256) {
        uint256 used = spent[id][periodIndex(id)];
        uint256 limit = policies[id].periodLimit;
        return used >= limit ? 0 : limit - used;
    }

    function hashIntent(PaymentIntent calldata i) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(INTENT_TYPEHASH, i)));
    }

    function hashApproval(PaymentApproval memory a) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(APPROVAL_TYPEHASH, a)));
    }

    function hashAttestation(WorldAttestation calldata a) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(ATTESTATION_TYPEHASH, a)));
    }

    function pay(
        PaymentIntent calldata i,
        bytes calldata agentSig,
        bytes calldata ownerSig,
        WorldAttestation calldata att,
        bytes calldata attestorSig
    ) external nonReentrant returns (bytes32 paymentId) {
        Policy storage p = policies[i.mandateId];
        if (p.owner == address(0)) revert UnknownMandate();
        if (p.paused) revert Paused();
        if (block.timestamp > i.deadline) revert Expired();
        if (block.timestamp >= p.expiry) revert MandateExpired();
        if (i.epoch != p.epoch) revert StaleEpoch();
        if (nonceUsed[i.mandateId][i.nonce]) revert NonceUsed();
        paymentId = keccak256(abi.encode(i.mandateId, i.merchantId, i.orderId));
        if (payments[paymentId].amount != 0) revert AlreadyPaid();
        if (!merchantAllowed[i.mandateId][i.merchantId]) revert MerchantNotAllowed();
        (address payout, uint64 version, bool active) = registry.get(i.merchantId);
        if (!active || payout != i.payout || version != i.registryVersion) revert RegistryMismatch();
        if (i.amount == 0 || i.amount > p.perTxLimit) revert OverPerTx();
        uint256 idx = periodIndex(i.mandateId);
        if (spent[i.mandateId][idx] + i.amount > p.periodLimit) revert OverPeriod();
        bytes32 digest = hashIntent(i);
        (address signer, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, agentSig);
        if (err != ECDSA.RecoverError.NoError || signer != p.agent) revert BadIntentSig();
        bool humanApproved = i.amount >= p.humanThreshold;
        if (humanApproved) _checkApproval(i, p, digest, ownerSig, att, attestorSig);
        nonceUsed[i.mandateId][i.nonce] = true;
        spent[i.mandateId][idx] += i.amount;
        payments[paymentId] = Payment(i.mandateId, i.merchantId, i.payout, uint128(i.amount), 0);
        usdt.safeTransferFrom(p.owner, i.payout, i.amount);
        emit PaymentExecuted(paymentId, i.mandateId, i.merchantId, i.payout, i.amount, i.orderId, humanApproved);
    }

    function refund(bytes32 id, uint128 amount) external nonReentrant {
        Payment storage payment = payments[id];
        if (msg.sender != payment.payout) revert NotPayout();
        if (amount == 0 || uint256(payment.refunded) + amount > payment.amount) revert OverRefund();
        payment.refunded += amount;
        usdt.safeTransferFrom(msg.sender, policies[payment.mandateId].owner, amount);
        emit PaymentRefunded(id, amount, payment.refunded);
    }

    function _checkApproval(
        PaymentIntent calldata i,
        Policy storage p,
        bytes32 digest,
        bytes calldata ownerSig,
        WorldAttestation calldata att,
        bytes calldata attestorSig
    ) private view {
        bytes32 approval = hashApproval(
            PaymentApproval(digest, i.mandateId, i.merchantId, i.payout, i.amount, i.epoch, i.deadline)
        );
        if (!SignatureChecker.isValidSignatureNow(p.owner, approval, ownerSig)) revert BadOwnerSig();
        if (att.approvalDigest != approval) revert BadApproval();
        if (att.authTime > block.timestamp || block.timestamp - att.authTime > MAX_AUTH_AGE) revert StaleAuth();
        (address signer, ECDSA.RecoverError err,) = ECDSA.tryRecover(hashAttestation(att), attestorSig);
        if (err != ECDSA.RecoverError.NoError || signer != p.attestor) revert BadAttestation();
    }

    function _validateLimits(uint128 perTx, uint128 period, uint128 threshold) private pure {
        if (perTx == 0 || period == 0 || perTx > period || threshold == 0) revert InvalidPolicy();
    }
}
