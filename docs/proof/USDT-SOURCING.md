# Official test USDT sourcing — re-run 2026-11-06T14:07:25Z

$ cast call USDT owner()
0x8790832Ba493Cc16a4dBC5c961B0C4950632799c

$ eth_call mint(deployer, 1 USDT) from deployer (simulation, nothing sent)
execution reverted: Ownable: caller is not the owner
execution reverted: Ownable: caller is not the owner

$ Portal bridge testnet USDT on Whitechain (docs.whitechain.io/build/bridge/portal-bridge.md)
| USDT | Whitechain Sepolia | [`0xaa7962d073935D387e8d442DA1D7149C81388f46`](https://explorer.testnet.whitechain.io/address/0xaa7962d073935D387e8d442DA1D7149C81388f46) |

Conclusion: only the token owner can mint; the Portal bridge delivers a different token than official USDT 0xcedfB561…; the 7 test USDT used here were provided to the deployer by a human (WAITING-ON-HUMAN step, see HUMAN-RUN.md).
