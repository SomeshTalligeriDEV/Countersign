/** No fixture verifier fallback: this always performs jose cryptographic verification. */
export async function verifyWorldToken({token,keys,issuer,clientId,nonce,acr,now}){
 const {jwtVerify}=await import('jose');
 const {payload}=await jwtVerify(token,keys,{issuer,audience:clientId,algorithms:['RS256'],requiredClaims:['exp','iat','sub','auth_time','nonce'],currentDate:new Date(now*1000),clockTolerance:0});
 if(payload.nonce!==nonce)throw new Error('invalid_nonce');
 if(!Number.isInteger(payload.iat)||payload.iat>now)throw new Error('invalid_issued_at');
 if(acr&&payload.acr!==acr)throw new Error('world_acr_mismatch');
 return payload;
}
