# HUMAN-RUN: ENS writes on Sepolia (UNEXECUTED)

Needs: Sepolia ETH, Foundry keystore (`cast wallet import ens-owner --interactive`), an owned ENSv2 parent name. Sepolia only.

1. Verify addresses at https://docs.ens.domains/learn/deployments#sepolia-ensv2 (ETHRegistry, VerifiableFactory, UserRegistryImpl, PermissionedResolverImpl).
2. Register parent (e.g. `countersign-demo.eth`) at https://sepolia.app.ens.domains (fee in Sepolia MockUSDC, mintable).
3. Deploy UserRegistry via `VerifiableFactory.deployProxy(USER_REGISTRY_IMPL, salt, initialize(grants))`, then `ETHRegistry.setSubregistry(labelhash(parent label), userRegistry)`.
4. Deploy one PermissionedResolver per agent via `deployProxy(PERMISSIONED_RESOLVER_IMPL, salt, initialize([{owner, roles}], []))`. Do NOT use ALL_ROLES for anyone but the owner; never setApprovalForAll.
5. Fill ENS_* vars from .env.example into a gitignored .env, then dry run: `set -a; . ./.env; set +a; pnpm ens:setup` and review the printed txs. Verify the ENS_ROLE_BITMAP for the subname against RegistryRolesLib (script default 1<<12 is an assumption).
6. Execute: `pnpm ens:setup -- --execute` (refuses if RPC chainId != 11155111). Creates subname, sets policy text records (countersign.limits / .merchants / .attestor / .mandate = eip155:1874:<Mandate>), grants agent key only `agent-endpoint[web]` and `agent-context`.
7. Verify: `pnpm ens:smoke <label>.<parent>` shows the records; set NEXT_PUBLIC_ENS_AGENT_NAME and check /owner shows "Live · Sepolia".
8. Revoke: `pnpm ens:setup -- --revoke --execute [--unregister]` clears policy records and revokes the agent's scoped roles. Also revoke on Whitechain (ENS revoke is not enforced by the Mandate contract).
