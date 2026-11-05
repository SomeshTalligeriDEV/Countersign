import { createServer } from 'node:http';
import { WhitechainRpc } from './rpc.mjs';

// Read-only diagnostics server. Payment mutations are not exposed until verified.
const rpc = process.env.WHITECHAIN_RPC_URL ? new WhitechainRpc(process.env.WHITECHAIN_RPC_URL) : null;
let lastStatus;
let pending;
async function chainStatus() {
  if (!rpc) throw new Error('rpc_not_configured');
  if (lastStatus && Date.now() - lastStatus.at < 5000) return lastStatus.data;
  pending ??= rpc.status().then(data => { lastStatus = {at:Date.now(),data}; return data; }).finally(()=>{pending=undefined;});
  return pending;
}
const server=createServer(async(req,res)=>{
 res.setHeader('content-type','application/json'); res.setHeader('cache-control','no-store');
 res.setHeader('x-content-type-options','nosniff');
 if(req.method!=='GET'){res.writeHead(405);res.end(JSON.stringify({error:'method_not_allowed'}));return;}
 if(req.url==='/health/live'){res.end(JSON.stringify({status:'alive'}));return;}
 if(req.url==='/v1/network'||req.url==='/health/ready'){
  try {const data=await chainStatus();res.end(JSON.stringify(data));}
  catch {res.writeHead(503);res.end(JSON.stringify({error:rpc?'chain_unavailable':'rpc_not_configured'}));}
  return;
 }
 res.writeHead(404);res.end(JSON.stringify({error:'not_found'}));
});
server.requestTimeout=10000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT??3001),process.env.HOST??'127.0.0.1');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
