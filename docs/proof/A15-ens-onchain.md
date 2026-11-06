# A15: ENSv2 on Sepolia: agent identity + published policy (REAL)

Contracts verified against Blockscout-verified ENSv2 Sepolia sources (docs.ens.domains/learn/deployments) before any write: ETHRegistrar 0xf633…a3d3, ETHRegistry 0xd4eb…a8b4, VerifiableFactory 0xda70…2991, UserRegistryImpl 0x9bd8…366a, PermissionedResolverImpl 0x115e…2b2c, MockUSDC 0x240b…14aa. Role bits taken from the verified source (ROLE_SET_TEXT=1<<4, ROLE_SET_RESOLVER=1<<24; the script's earlier 1<<12 guess was ROLE_UNREGISTER and was fixed). Owner: ens-owner keystore 0x44046BF20B1122dfa3c55196A067c69fC78C921E.

| Step | Tx |
|---|---|
| Deploy our UserRegistry (subname registry) 0x4aDb9CecA5b9A70000C3F7Df5Af0831535f649Ca | [0x51f083de…efce9](https://sepolia.etherscan.io/tx/0x51f083de6d9e0efd09b0aaa547faa2b361e8f2db6ebbaab4230ab9c6402efce9) |
| Deploy agent1's own PermissionedResolver 0x64b67a1903eD1923F98A3a74Cc4Ed539be40d456 | [0xb023979f…c7c8](https://sepolia.etherscan.io/tx/0xb023979f0850361a41cbfc3d80a6100bc954cb03815225f212825e99c789c7c8) |
| Mint MockUSDC / approve registrar | [0x88116277…b80d](https://sepolia.etherscan.io/tx/0x88116277544486f8c3ede4e39d3fb10dbd2ce73dc2853c3cc35c0239e34ab80d) / [0x953fbb97…6d32](https://sepolia.etherscan.io/tx/0x953fbb97ec803394cd98be05dffafd5c72cf6aac9bc679f2f5e248f6cc9a6d32) |
| Commit + register countersign.eth (subregistry = our UserRegistry) | [0xf76420b2…bfce6](https://sepolia.etherscan.io/tx/0xf76420b21bd78553754b3a6d65840969071f2a60fd633526ec2262e8eeabfce6) / [0x94213abc…7331](https://sepolia.etherscan.io/tx/0x94213abc1d434ffe6def15d035717e80285286a7898d8fd216239246bbfc7331) |
| Register agent1.countersign.eth in our registry, resolver = its PermissionedResolver | [0x8e8059a2…accc](https://sepolia.etherscan.io/tx/0x8e8059a276c56052926fb66b41e9f11fc3d64d349a42308caea02e538674accc) |
| Policy text records (limits, merchants, attestor, mandate eip155:1874:…:mandateId, epoch) in one multicall | [0x4436dd31…d8b8](https://sepolia.etherscan.io/tx/0x4436dd310ccfb525b3d37f2151ffa705aa2acb08671f48ce8a1ab02c904fd8b8) |
| Enhanced Access Control: agent key gets setter role only for agent-endpoint[web] and agent-context | [0x2044945d…fd55](https://sepolia.etherscan.io/tx/0x2044945d65dd93749b0de5fe821888f87862295882e24fd1610a55c3101afd55), [0x8deb0e22…6418](https://sepolia.etherscan.io/tx/0x8deb0e22a936382e7192bf60eba796cab95fe3129f76e2683a25179f06c16418) |
| addr(agent1.countersign.eth) = agent 0x91E3…A293 | [0x9fcda5fd…0d31](https://sepolia.etherscan.io/tx/0x9fcda5fd1a8d5f4e068c0d9aad0e393f18af1394c59099df2403d6db404d0d31) |

Live read-back via Universal Resolver + drift check against the live Whitechain Mandate: docs/proof/A15-ens-live.txt — 7 MATCH (perTx, perPeriod, attestor, mandateAddress, chainId 1874, mandateId, epoch 5), merchantsHash MISSING on the chain side by design (Mandate stores a mapping, not a hash). Whitechain cannot read ENS; the Mandate enforces signed commitments; ENS is the agent's name, public policy mirror and role layer. Revoke flow (ENS clear + Mandate epoch bump) is built () but NOT executed, to keep the demo name live.
