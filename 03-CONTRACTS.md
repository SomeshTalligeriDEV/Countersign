# 03 · Contracts Spec

**Stack:** Foundry, Solidity `0.8.30`, OpenZeppelin `5.x` (`EIP712`, `ECDSA`, `SignatureChecker`, `SafeERC20`, `ReentrancyGuard`).
**Compiler settings (from Whitechain's Foundry docs):** `solc = "0.8.30"` and `evm_version = "prague"` in `foundry.toml`. Verification fails if the compiler settings don't match what you deployed with.
**Chain:** Whitechain Sepolia `1874`. Token: USDT `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`. Read `decimals()` and never assume 6.

---

## 1. `MerchantRegistry.sol`

```solidity
struct Merchant { address owner; address payout; uint64 version; bool active; }
mapping(bytes32 => Merchant) public merchants;   // merchantId => Merchant

function register(bytes32 merchantId, address payout) external;      // msg.sender becomes owner; version = 1; active = true
function updatePayout(bytes32 merchantId, address newPayout) external; // onlyMerchantOwner; version++
function setActive(bytes32 merchantId, bool active) external;        // onlyMerchantOwner; version++
function get(bytes32 merchantId) external view returns (address payout, uint64 version, bool active);

event MerchantRegistered(bytes32 indexed merchantId, address indexed owner, address payout);
event PayoutUpdated(bytes32 indexed merchantId, address payout, uint64 version);
event MerchantStatus(bytes32 indexed merchantId, bool active, uint64 version);
```

Rules: `register` reverts if `merchantId` already exists. `payout != address(0)`. **Every change bumps `version`.** Signed payments carry `registryVersion`, so any registry change invalidates unexecuted approvals.

---

## 2. `Mandate.sol`

### 2.1 Storage

```solidity
struct Policy {
    address owner;          // == treasury (see 2.4). Signs approvals, admin.
    address agent;          // signs PaymentIntents
    address attestor;       // World attestation signer, set by owner
    uint128 perTxLimit;     // max single payment
    uint128 periodLimit;    // max total per period
    uint128 humanThreshold; // amount >= this needs 2-of-2 approval
    uint64  start;          // period anchor, immutable
    uint64  periodLength;   // seconds, immutable (e.g. 86400)
    uint64  expiry;         // mandate end (may mirror ENS expiry, see 06)
    uint64  epoch;          // authorization epoch, bumped on revoke/rotation/limit change
    bytes32 ensNamehash;    // optional commitment, 0 if unused
    bool    paused;
}
struct Payment { bytes32 mandateId; bytes32 merchantId; address payout; uint128 amount; uint128 refunded; }

mapping(bytes32 => Policy) public policies;                        // mandateId
mapping(bytes32 => mapping(bytes32 => bool)) public merchantAllowed;
mapping(bytes32 => mapping(uint256 => uint256)) public spent;     // mandateId => periodIndex => amount
mapping(bytes32 => mapping(uint256 => bool)) public nonceUsed;    // mandateId => nonce
mapping(bytes32 => Payment) public payments;                       // paymentId
IERC20 public immutable usdt;
MerchantRegistry public immutable registry;
uint64 public constant MAX_AUTH_AGE = 300;                         // World auth freshness, onchain
```

### 2.2 EIP-712

Domain: `name = "Countersign"`, `version = "1"`, `chainId = 1874`, `verifyingContract = address(Mandate)`.

```solidity
// Signed by policy.agent for every payment
struct PaymentIntent {
    bytes32 mandateId;
    bytes32 merchantId;
    address payout;          // must equal registry payout
    uint64  registryVersion; // must equal registry version
    uint256 amount;
    bytes32 orderId;
    bytes32 resourceHash;    // keccak256 of what is being bought (URL+method+body hash, or cart hash)
    uint256 nonce;
    uint64  epoch;
    uint64  deadline;
}

// Signed by policy.owner when amount >= humanThreshold
struct PaymentApproval {
    bytes32 intentDigest;    // EIP-712 digest of the PaymentIntent above
    bytes32 mandateId;
    bytes32 merchantId;
    address payout;
    uint256 amount;
    uint64  epoch;
    uint64  deadline;
}

// Signed by policy.attestor after the backend validates a fresh World sign-in
struct WorldAttestation {
    bytes32 approvalDigest;  // EIP-712 digest of the PaymentApproval
    bytes32 ownerSubHash;    // keccak256(iss || sub), recorded at onboarding
    uint64  authTime;        // id_token auth_time
}
```

The owner's `PaymentApproval` repeats `payout` and `amount` so the wallet prompt shows them in plain fields, not just a hash.

### 2.3 Functions

```solidity
function createMandate(CreateParams calldata p, bytes32 salt) external returns (bytes32 mandateId);
    // mandateId = keccak256(abi.encode(msg.sender, salt)); owner = msg.sender; start = block.timestamp; epoch = 1

function setMerchant(bytes32 mandateId, bytes32 merchantId, bool allowed) external;      // onlyOwner
function updateLimits(bytes32 mandateId, uint128 perTx, uint128 period, uint128 threshold) external;
    // onlyOwner; epoch++; NEVER touches spent[]; start/periodLength are immutable
function rotateAgent(bytes32 mandateId, address agent) external;                         // onlyOwner; epoch++
function setAttestor(bytes32 mandateId, address attestor) external;                      // onlyOwner; epoch++
function revoke(bytes32 mandateId) external;                                             // onlyOwner; epoch++
function setPaused(bytes32 mandateId, bool paused) external;                             // onlyOwner

function pay(
    PaymentIntent calldata i,
    bytes calldata agentSig,
    bytes calldata ownerSig,          // empty if below threshold
    WorldAttestation calldata att,    // zeroed if below threshold
    bytes calldata attestorSig        // empty if below threshold
) external nonReentrant returns (bytes32 paymentId);

function refund(bytes32 paymentId, uint128 amount) external nonReentrant;  // msg.sender == payments[paymentId].payout

function periodIndex(bytes32 mandateId) public view returns (uint256);     // (block.timestamp - start) / periodLength
function remaining(bytes32 mandateId) external view returns (uint256);
function hashIntent(PaymentIntent calldata i) public view returns (bytes32);
function hashApproval(PaymentApproval memory a) public view returns (bytes32);
```

### 2.4 Critical rule: owner == treasury

`createMandate` sets `owner = msg.sender` and pulls funds from `owner` only. **Never accept a `treasury` parameter.** Otherwise an attacker creates a mandate naming a victim who approved `Mandate` for their own mandate, and drains the victim's allowance. This is test T-01 in 07.

The treasury approves a **limited** allowance, for example `usdt.approve(Mandate, 200 * 10**decimals)`, never `type(uint256).max`. The UI shows the remaining allowance and a "Revoke allowance" button (`approve(Mandate, 0)`).

### 2.5 `pay()`: checks, then effects, then interaction

```text
CHECKS
 1  p = policies[i.mandateId]; require p.owner != 0                         -> UnknownMandate
 2  require !p.paused                                                       -> Paused
 3  require block.timestamp <= i.deadline                                   -> Expired
 4  require block.timestamp <  p.expiry                                     -> MandateExpired
 5  require i.epoch == p.epoch                                              -> StaleEpoch
 6  require !nonceUsed[i.mandateId][i.nonce]                                -> NonceUsed
 7  paymentId = keccak256(abi.encode(i.mandateId, i.merchantId, i.orderId))
    require payments[paymentId].amount == 0                                 -> AlreadyPaid
 8  require merchantAllowed[i.mandateId][i.merchantId]                      -> MerchantNotAllowed
 9  (payout, version, active) = registry.get(i.merchantId)
    require active && payout == i.payout && version == i.registryVersion    -> RegistryMismatch
10  require i.amount > 0 && i.amount <= p.perTxLimit                        -> OverPerTx
11  idx = periodIndex(i.mandateId)
    require spent[i.mandateId][idx] + i.amount <= p.periodLimit             -> OverPeriod
12  dI = hashIntent(i)
    require ECDSA.recover(dI, agentSig) == p.agent                          -> BadIntentSig
13  if i.amount >= p.humanThreshold:
      a  = PaymentApproval(dI, i.mandateId, i.merchantId, i.payout, i.amount, i.epoch, i.deadline)
      dA = hashApproval(a)
      require SignatureChecker.isValidSignatureNow(p.owner, dA, ownerSig)   -> BadOwnerSig
      require att.approvalDigest == dA                                      -> BadApproval
      require att.authTime <= block.timestamp
           && block.timestamp - att.authTime <= MAX_AUTH_AGE                -> StaleAuth
      dW = hashAttestation(att)
      require ECDSA.recover(dW, attestorSig) == p.attestor                  -> BadAttestation
EFFECTS
14  nonceUsed[...] = true; spent[...][idx] += i.amount
    payments[paymentId] = Payment(i.mandateId, i.merchantId, i.payout, i.amount, 0)
INTERACTION
15  usdt.safeTransferFrom(p.owner, i.payout, i.amount)
16  emit PaymentExecuted(paymentId, i.mandateId, i.merchantId, i.payout, i.amount, i.orderId, i.amount >= p.humanThreshold)
```

Use `ECDSA.recover` (rejects malleable `s`). `SignatureChecker` for the owner allows smart-contract wallets (ERC-1271).

### 2.6 `refund()`

```text
require msg.sender == payments[id].payout                         -> NotPayout
require amount > 0 && refunded + amount <= payments[id].amount    -> OverRefund
payments[id].refunded += amount
usdt.safeTransferFrom(msg.sender, policies[mandateId].owner, amount)
emit PaymentRefunded(id, amount, refunded)
```

Refunds never decrease `spent`. Budget accounting is monotonic, and that's deliberate.

### 2.7 Events and errors

```solidity
event MandateCreated(bytes32 indexed mandateId, address indexed owner, address agent);
event LimitsUpdated(bytes32 indexed mandateId, uint128 perTx, uint128 period, uint128 threshold, uint64 epoch);
event MerchantSet(bytes32 indexed mandateId, bytes32 indexed merchantId, bool allowed);
event Revoked(bytes32 indexed mandateId, uint64 newEpoch);
event PaymentExecuted(bytes32 indexed paymentId, bytes32 indexed mandateId, bytes32 indexed merchantId,
                      address payout, uint256 amount, bytes32 orderId, bool humanApproved);
event PaymentRefunded(bytes32 indexed paymentId, uint128 amount, uint128 totalRefunded);

error UnknownMandate(); error Paused(); error Expired(); error MandateExpired(); error StaleEpoch();
error NonceUsed(); error AlreadyPaid(); error MerchantNotAllowed(); error RegistryMismatch();
error OverPerTx(); error OverPeriod(); error BadIntentSig(); error BadOwnerSig(); error BadApproval();
error StaleAuth(); error BadAttestation(); error NotOwner(); error NotPayout(); error OverRefund();
```

Custom errors show clearly on Blockscout. Use them in the demo ("reverted: RegistryMismatch").

## 3. Deploy and verify

```bash
forge build
forge test -vvv
forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.whitechain.io --broadcast --private-key $DEPLOYER_KEY
```

Verify with Hardhat, the path Whitechain documents (Sourcify enabled, Blockscout explorer):

```bash
npx hardhat verify --network whitechainSepolia <REGISTRY_ADDRESS>
npx hardhat verify --network whitechainSepolia <MANDATE_ADDRESS> <USDT> <REGISTRY>
# if Blockscout matches a "verified twin": npx hardhat verify blockscout --force --network whitechainSepolia <addr>
```

Or with Foundry (from Whitechain's docs; the verifier URL must end with `/api/`):

```bash
forge verify-contract <MANDATE_ADDRESS> src/Mandate.sol:Mandate \
  --rpc-url https://rpc.testnet.whitechain.io/ \
  --verifier blockscout \
  --verifier-url https://explorer.testnet.whitechain.io/api/ \
  --constructor-args $(cast abi-encode "constructor(address,address)" $USDT $REGISTRY)
```

Put both verified links in the README.

## 4. Gas budget (for the relayer)

Whitechain fees are documented as "as low as $0.002". A `pay()` with a 2-of-2 approval is about 120k to 160k gas. Measure the real cost on the first testnet payment and put it in the README and GasGuard config.
