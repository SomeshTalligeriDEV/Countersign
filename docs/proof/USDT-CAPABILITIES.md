# Official USDT on Whitechain Sepolia — capability check (REAL, read-only)

Token: `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7` · RPC `https://rpc.testnet.whitechain.io` · `cast 1.9.0` · run 2026-11-06.
All calls are `eth_call` / `eth_getStorageAt` / `eth_getCode`. No transaction was sent, no key used.

## Result

| Capability | Result | Evidence |
|---|---|---|
| Chain | 1874 | `cast chain-id` → `1874` |
| Metadata | `Tether USD` / `USDT` / **6 decimals** | name/symbol/decimals below (app still reads `decimals()` at runtime) |
| Proxy | EIP-1967 proxy, impl `0x26425662d126412128967ecf0a02ec48573026f7` | implementation slot read |
| EIP-2612 `permit` | **PRESENT** | `DOMAIN_SEPARATOR()` and `nonces(address)` return; `permit` selector `0xd505accf` is in the impl dispatcher; a call with deadline=1 reverts `ERC20Permit: expired deadline` (reached permit logic, not a missing-function revert). `PERMIT_TYPEHASH()` getter is **not** exposed (reverts) — not needed by clients. |
| EIP-3009 `transferWithAuthorization` | **PRESENT** | `TRANSFER_WITH_AUTHORIZATION_TYPEHASH()` = standard `keccak256("TransferWithAuthorization(...)")`; selectors `0xe3ee160e` (v,r,s) and `0xcf092995` (bytes sig) in dispatcher; call with junk sig reverts `TetherToken: invalid signature`. |
| EIP-3009 `receiveWithAuthorization` | **PRESENT** | `RECEIVE_WITH_AUTHORIZATION_TYPEHASH()` = standard hash; selectors `0xef55bec6`, `0x88b7ab63` in dispatcher |
| EIP-3009 `cancelAuthorization` / `authorizationState` | PRESENT | selector `0x5a049a70`; `authorizationState(addr,0x0)` → `false` |
| `eip712Domain()` (EIP-5267), `version()` | ABSENT | both revert with empty data — domain `name`/`version` for signing must be determined another way (UNVERIFIED: not brute-forced against DOMAIN_SEPARATOR) |
| Unknown selector baseline | `doesNotExist()` reverts with no data | distinguishes "missing" from "present but rejected" |

**Not proven:** no successful signed permit or EIP-3009 transfer was executed (UNEXECUTED — needs a funded test wallet). Countersign's current Mandate flow uses `approve` + `transferFrom` and does not depend on either.

## Commands and real output

```
$ R=https://rpc.testnet.whitechain.io; T=0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7
$ cast chain-id --rpc-url $R
1874
$ cast call $T "name()(string)" --rpc-url $R
"Tether USD"
$ cast call $T "symbol()(string)" --rpc-url $R
"USDT"
$ cast call $T "decimals()(uint8)" --rpc-url $R
6
$ cast call $T "DOMAIN_SEPARATOR()(bytes32)" --rpc-url $R
0xcdcfacb6b15c8238b4e5fbb47bdb83b7f83f50a531d264bf9763d2bd1d3d2a25
$ cast call $T "nonces(address)(uint256)" 0x0000000000000000000000000000000000000001 --rpc-url $R
0
$ cast call $T "authorizationState(address,bytes32)(bool)" 0x…01 0x00…00 --rpc-url $R
false
$ cast call $T "eip712Domain()" --rpc-url $R
Error: server returned an error response: error code 3: execution reverted
$ cast call $T "version()(string)" --rpc-url $R
Error: server returned an error response: error code 3: execution reverted
$ cast call $T "TRANSFER_WITH_AUTHORIZATION_TYPEHASH()(bytes32)" --rpc-url $R
0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267
$ cast keccak "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267
$ cast call $T "RECEIVE_WITH_AUTHORIZATION_TYPEHASH()(bytes32)" --rpc-url $R
0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8
$ cast keccak "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8
$ cast call $T "PERMIT_TYPEHASH()(bytes32)" --rpc-url $R
Error: server returned an error response: error code 3: execution reverted
$ cast storage $T 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc --rpc-url $R
0x00000000000000000000000026425662d126412128967ecf0a02ec48573026f7
$ cast code $T --rpc-url $R | wc -c          # proxy
    4457
$ cast code 0x26425662d126412128967ecf0a02ec48573026f7 --rpc-url $R | wc -c   # implementation
   32137
# PUSH4 <selector> occurrences in implementation bytecode (grep "63<sel>"):
0xe3ee160e transferWithAuthorization(...,uint8,bytes32,bytes32)  2
0xcf092995 transferWithAuthorization(...,bytes)                  2
0xef55bec6 receiveWithAuthorization(...,uint8,bytes32,bytes32)   2
0x88b7ab63 receiveWithAuthorization(...,bytes)                   2
0x5a049a70 cancelAuthorization(address,bytes32,uint8,bytes32,bytes32) 2
0xd505accf permit(address,address,uint256,uint256,uint8,bytes32,bytes32) 1
0x7ecebe00 nonces(address) 1
0x3644e515 DOMAIN_SEPARATOR() 2
# raw eth_call responses:
permit(0x…01,0x…02,1,deadline=1,27,0x…01,0x…01)
{"jsonrpc":"2.0","error":{"code":3,"message":"execution reverted: ERC20Permit: expired deadline",...},"id":1}
transferWithAuthorization(0x…01,0x…02,1,0,99999999999,0x…01,27,0x…01,0x…01)
{"jsonrpc":"2.0","error":{"code":3,"message":"execution reverted: TetherToken: invalid signature",...},"id":1}
doesNotExist()
{"jsonrpc":"2.0","error":{"code":3,"message":"execution reverted"},"id":1}
```
