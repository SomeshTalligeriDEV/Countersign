// Issuers from live discovery (auth.world.org/docs/guides/testing, fetched 2026-11-06).
export const WORLD_ISSUERS={sandbox:'https://sandbox.auth.world.org',production:'https://auth.world.org'};
/** WORLD_ENV picks the issuer; an explicit WORLD_ISSUER must agree with it. Defaults to sandbox. */
export function worldEnv(env=process.env){
 const name=env.WORLD_ENV||(env.WORLD_ISSUER===WORLD_ISSUERS.production?'production':'sandbox');
 const issuer=WORLD_ISSUERS[name];
 if(!issuer)throw new Error('unsupported_world_env');
 if(env.WORLD_ISSUER&&env.WORLD_ISSUER!==issuer)throw new Error('world_env_issuer_mismatch');
 return {env:name,issuer};
}
