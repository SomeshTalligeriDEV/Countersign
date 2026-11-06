import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {countersign} from '../../../packages/merchant/src/index.mjs';
const apiUrl=process.env.COUNTERSIGN_API??'http://127.0.0.1:3001';
const merchantId=process.env.MERCHANT_ID;
if(!/^0x[\da-fA-F]{64}$/.test(merchantId??''))throw new Error('MERCHANT_ID must be a registered bytes32 ID');
const db=new DatabaseSync(process.env.MERCHANT_DATABASE_PATH??'merchant.sqlite');
const cs=countersign({db,merchantId,apiUrl});
const charges={'/api/report':cs.charge({amount:'0.50'}),'/api/order-priced-report':cs.charge({amount:'40',approvalWindow:true})};
const server=createServer(async(req,res)=>{
 if(req.method!=='GET'||!Object.hasOwn(charges,req.url)){res.writeHead(404);return res.end();}
 await charges[req.url](req,res,async()=>{
  try{
   const result=await fetch(new URL('/v1/network',apiUrl),{signal:AbortSignal.timeout(10000),redirect:'error'});
   if(!result.ok)throw new Error('network_report_unavailable');
   const report=await result.json();res.setHeader('content-type','application/json');res.end(JSON.stringify({payment:req.countersign,report}));
  }catch{res.writeHead(503);res.end('{"error":"report_unavailable_retry_same_payment"}');}
 });
});
server.listen(Number(process.env.PORT??4000),'127.0.0.1');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
