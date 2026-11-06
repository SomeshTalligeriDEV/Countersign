// Client ID Metadata Document for World IdP (discovery: client_id_metadata_document_supported). Public client + PKCE.
export function cimdDocument(clientId,redirectUri){
 const cb=new URL(redirectUri);
 if(new URL(clientId).origin!==cb.origin)throw new Error('cimd_origin_mismatch');
 return {client_id:clientId,client_name:'Countersign',client_uri:cb.origin,
  redirect_uris:[cb.href,`${cb.origin}/auth/world/onboard/callback`],
  grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none'};
}
