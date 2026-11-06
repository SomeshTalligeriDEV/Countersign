# World documentation integration review

Reviewed 2026-11-06. The complete documentation index was fetched, then the relevant product pages below. This is not a claim to have read every page of every World product.

## Connected tooling

- World Docs MCP: https://docs.world.org/mcp, unauthenticated documentation search. Added project configuration for VS Code and Cursor; these clients must load the configuration. No World MCP tool is available in this running agent session.
- Developer Portal MCP: https://developer.world.org/api/mcp, authenticated using a team API key. Requires local account/team access. No app was created, modified, registered or submitted.
- For Codex, run in the normal laptop terminal:

```sh
codex mcp add world-docs -- npx -y mcp-remote https://docs.world.org/mcp --transport http-only
```

This writes client configuration outside this workspace and may download mcp-remote. It was not executed in this restricted session. Reload the client and check that search_world_documentation is available. Portal key setup must stay in local secret configuration; do not commit it or paste it into chat.

## Product compatibility

| Product | Countersign decision |
| --- | --- |
| Docs MCP | Development documentation lookup; not a runtime identity verifier |
| Developer Portal MCP | Inspect team/app before creating anything; credentials missing |
| Agent Pass OIDC | Existing docs/04 and root spec require issuer/JWKS, sub binding, max_age/auth_time and attestor signature; retain this requirement |
| IDKit 4 / Human in the Loop | Different proof protocol; not an OIDC ID token or a drop-in source of auth_time/sub. Requires a separately designed owner binding and freshness path before it can authorize a Countersign payment |
| AgentKit | Human-backed agent identity/x402 extension; does not replace company-owner approval or our treasury-funded mandate settlement |
| MiniKit / World Chain | Separate application/network scope; do not move official-USDT settlement off Whitechain Sepolia or execute mainnet registration |

The currently accessible World ID docs do not establish Agent Pass issuer endpoints or prove that our OIDC code matches live metadata. auth.world.org setup/OIDC pages remained inaccessible through the documentation browser. That is an unresolved verification gap, not evidence those services are retired.

## Security requirements carried forward

Preserve server-side verification, exact operation binding, persistent single-use consumption, server-owned environment selection and private server signing keys. A client success callback or LLM approval field cannot authorize spending. Sandbox/simulator verification must be labelled test evidence. Keep owner wallet signature and current onchain policy checks regardless of the World integration selected.

## Sources read live

- https://docs.world.org/llms.txt
- https://docs.world.org/model-context-protocol/world-docs
- https://docs.world.org/model-context-protocol/developer-portal
- https://docs.world.org/world-id/SKILL
- https://docs.world.org/world-id/idkit/integrate
- https://docs.world.org/agents/human-in-the-loop/integrate
- https://docs.world.org/agents/agent-kit/integrate
- https://docs.world.org/world-id/sandbox/sandbox-access
- https://docs.world.org/api-reference/developer-portal/verify

Several .md URLs failed while corresponding HTML pages loaded. The sandbox-access page describes human enrollment via the Developer Portal and device testing; it does not prove access to the separate Agent Pass OIDC sandbox.

## Remaining steps

1. Load Docs MCP in the local coding client.
2. Configure Developer Portal authentication locally, inspect team context and existing app config before creating resources. Portal credentials differ from OIDC client credentials.
3. Obtain and verify the Agent Pass guide/discovery and app registration for the selected sandbox issuer. Resolve any spec/API incompatibility explicitly; never silently convert an IDKit proof to an OIDC identity.
4. Install jose locally; run signed JWT failure/success fixtures, then one real issuer sign-in.
5. Finish browser routes/cookies, verified owner binding, owner signature and onchain settlement; record evidence before enabling the feature.
