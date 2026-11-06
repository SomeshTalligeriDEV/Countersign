import {clientIp} from './client-ip.mjs';
import {merchantService} from './merchant-service.mjs';
import {createOwnerBinding} from './owner-binding.mjs';
import {createApprovalService} from './approval-service.mjs';
import {attachRealtime} from './realtime.mjs';
import {relayConfig} from './relay-config.mjs';
import {privateKeyToAccount} from '../../../packages/shared/src/viem-runtime.mjs';
import {GasGuard} from './gasguard.mjs';
import {RelayLedger} from './relay-ledger.mjs';
import {Facilitator} from './facilitator.mjs';
import {createOwnerSignatureService} from './owner-signature.mjs';
import {createAttestorClient} from './attestor-client.mjs';
import { createOwnerSetup } from './owner-setup.mjs';
import { createWorldOidc } from './world-oidc.mjs';
import { createWorldHttp } from './world-http.mjs';
import { worldEnv } from './world-env.mjs';
import { Approvals } from './approvals.mjs';
import { observerFreshness } from './freshness.mjs';
import { ChainObserver } from './observer.mjs';
import { runObserver } from './observer-runner.mjs';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { WhitechainRpc } from './rpc.mjs';
import { openStore } from './store.mjs';
import { createHttpApp } from './http-app.mjs';
import { createChainAdapter } from './chain.mjs';

const db=openStore(process.env.DATABASE_PATH??'countersign.sqlite');
const rpc=process.env.WHITECHAIN_RPC_URL?new WhitechainRpc(process.env.WHITECHAIN_RPC_URL):null;
const relayOptions=relayConfig(process.env);
const relayAccount=relayOptions?privateKeyToAccount(process.env.RELAYER_KEY):undefined;
const chain=rpc&&process.env.MANDATE_ADDRESS&&process.env.REGISTRY_ADDRESS?createChainAdapter({rpcUrl:process.env.WHITECHAIN_RPC_URL,mandateAddress:process.env.MANDATE_ADDRESS,registryAddress:process.env.REGISTRY_ADDRESS,account:relayAccount}):null;
const observerName=chain&&process.env.DEPLOYMENT_BLOCK?`1874:${process.env.MANDATE_ADDRESS.toLowerCase()}`:null;
const freshness=observerFreshness();
const stopObserver=observerName?runObserver(new ChainObserver({db,chain,name:observerName,startBlock:process.env.DEPLOYMENT_BLOCK}),{onSuccess:result=>freshness.success(result),onError:()=>{freshness.failure();console.error('Observer stopped; inspect chain and reconcile cursor before restart.');}}):async()=>{};
const worldKeys=['WORLD_ISSUER','WORLD_CLIENT_ID','WORLD_CLIENT_SECRET','WORLD_REDIRECT_URI'];
const worldConfigured=worldKeys.every(key=>Boolean(process.env[key]));
const world=worldEnv();
if(worldKeys.some(key=>Boolean(process.env[key]))&&!worldConfigured)throw new Error('Incomplete World configuration');
let worldHttp,ownerWorldHttp,ownerBinding,approvalService;
if(worldConfigured){
 const callback=new URL(process.env.WORLD_REDIRECT_URI);
 if(callback.pathname!=='/auth/world/callback'||callback.search||callback.hash)throw new Error('World redirect must use /auth/world/callback without query or fragment');
 const oidc=await createWorldOidc({approvals:new Approvals(db),issuer:process.env.WORLD_ISSUER,clientId:process.env.WORLD_CLIENT_ID,clientSecret:process.env.WORLD_CLIENT_SECRET,redirectUri:process.env.WORLD_REDIRECT_URI,acr:process.env.WORLD_ACR||undefined});
 worldHttp=createWorldHttp({oidc,publicOrigin:callback.origin});
 if(chain){
  ownerBinding=createOwnerBinding({db,chain,issuer:process.env.WORLD_ISSUER,clientId:process.env.WORLD_CLIENT_ID});
  const onboardingOidc=await createWorldOidc({approvals:ownerBinding,issuer:process.env.WORLD_ISSUER,clientId:process.env.WORLD_CLIENT_ID,clientSecret:process.env.WORLD_CLIENT_SECRET,redirectUri:`${callback.origin}/auth/world/onboard/callback`,acr:process.env.WORLD_ACR||undefined});
  ownerWorldHttp=createWorldHttp({oidc:onboardingOidc,publicOrigin:callback.origin,pathPrefix:'/auth/world/onboard'});
  approvalService=createApprovalService({db,chain,mandateAddress:process.env.MANDATE_ADDRESS,ownerBinding:(id,owner)=>ownerBinding.lookup(id,owner)});
 }
}
const ledger=relayOptions?new RelayLedger({db,chain}):null;
if(ledger)await ledger.recover();
const facilitator=relayOptions?new Facilitator({db,chain,ledger,guard:new GasGuard(db,relayOptions),mandateAddress:process.env.MANDATE_ADDRESS}):null;
let ownerSignatures;
if(facilitator&&process.env.ATTESTOR_HMAC_SECRET){
 new Approvals(db);
 const attestor=createAttestorClient({db,chain,mandateAddress:process.env.MANDATE_ADDRESS,secret:process.env.ATTESTOR_HMAC_SECRET});
 ownerSignatures=createOwnerSignatureService({db,chain,attestor,executor:facilitator,mandateAddress:process.env.MANDATE_ADDRESS});
}

const ownerSetup=chain?createOwnerSetup({chain,mandateAddress:process.env.MANDATE_ADDRESS}):null;
const merchants=chain?merchantService({db,chain,mandateAddress:process.env.MANDATE_ADDRESS,registryAddress:process.env.REGISTRY_ADDRESS,observerName,observerHealthy:()=>freshness.healthy()}):null;
const handle=createHttpApp({db,chain,merchants,demoGuard:process.env.DEMO_MODE==='1'?facilitator?.guard:null,ownerSetup,worldHttp,ownerWorldHttp,ownerBinding,approvalService,ownerSignatures,observerName,observerHealthy:()=>freshness.healthy(),facilitator,networkStatus:async()=>{
 if(!rpc)throw new Error('rpc_not_configured');
 return {...await rpc.status(),observer:observerName?freshness.status():{state:'not_configured'},settlementEnabled:Boolean(facilitator)&&!relayOptions.paused,world:{env:world.env,issuer:world.issuer,configured:worldConfigured}};
}});
const server=createServer(async(req,res)=>{
 try{
  const init={method:req.method,headers:req.headers};
  if(!['GET','HEAD'].includes(req.method)){init.body=Readable.toWeb(req);init.duplex='half';}
  const request=new Request(new URL(req.url,'http://localhost'),init);
  const response=await handle(request,{ip:clientIp(req.socket.remoteAddress??'unknown',req.headers['x-countersign-client-ip'],process.env.TRUSTED_PROXY_IPS)});
  res.writeHead(response.status,Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500,{'content-type':'application/json'});res.end('{"error":"internal_error"}');}
});
const stopRealtime=process.env.WEBSOCKET_ENABLED==='1'?await attachRealtime({server,db,allowedOrigins:(process.env.WEBSOCKET_ORIGINS??'').split(',').filter(Boolean)}):()=>{};
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT??3001),process.env.HOST??'127.0.0.1');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopRealtime();server.close(async()=>{await stopObserver();db.close();process.exit(0);});});
