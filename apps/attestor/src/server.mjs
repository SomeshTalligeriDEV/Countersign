import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {openStore} from '../../api/src/store.mjs';
import {Approvals} from '../../api/src/approvals.mjs';
import {privateKeyToAccount} from '../../../packages/shared/src/viem-runtime.mjs';
import {createAttestor} from './attestor.mjs';
import {createAttestorHttp} from './http-app.mjs';
for(const key of ['DATABASE_PATH','MANDATE_ADDRESS','ATTESTOR_KEY','ATTESTOR_HMAC_SECRET'])if(!process.env[key])throw new Error(`Missing ${key}`);
const db=openStore(process.env.DATABASE_PATH);
new Approvals(db);
const service=createAttestor({db,mandateAddress:process.env.MANDATE_ADDRESS,account:privateKeyToAccount(process.env.ATTESTOR_KEY)});
const handle=createAttestorHttp({service,secret:process.env.ATTESTOR_HMAC_SECRET});
const server=createServer(async(req,res)=>{
 try{
  if(req.method==='GET'&&req.url==='/health/live'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end('{"status":"alive"}');return;}
  const init={method:req.method,headers:req.headers};
  if(!['GET','HEAD'].includes(req.method)){init.body=Readable.toWeb(req);init.duplex='half';}
  const result=await handle(new Request(new URL(req.url,'http://127.0.0.1'),init));
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
 }catch{res.writeHead(500);res.end();}
});
server.requestTimeout=10000;server.headersTimeout=5000;
server.listen(Number(process.env.ATTESTOR_PORT??3002),'127.0.0.1');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
