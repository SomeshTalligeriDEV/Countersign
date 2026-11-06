import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {countersign} from '../../../packages/merchant/src/index.mjs';
import {verifyWebhook} from '../../../packages/merchant/src/webhooks.mjs';
const apiUrl=process.env.COUNTERSIGN_API??'http://127.0.0.1:3001';
const merchantId=process.env.MERCHANT_ID;
if(!/^0x[\da-fA-F]{64}$/.test(merchantId??''))throw new Error('MERCHANT_ID must be a registered bytes32 ID');
const db=new DatabaseSync(process.env.MERCHANT_DATABASE_PATH??'merchant.sqlite');
const cs=countersign({db,merchantId,apiUrl});
const charges={'/api/report':cs.charge({amount:'0.50'}),'/api/order-priced-report':cs.charge({amount:process.env.ORDER_AMOUNT??'40',approvalWindow:true})};
// Signed webhook receiver: verifies HMAC over the raw bytes, dedupes by event id.
db.exec('CREATE TABLE IF NOT EXISTS webhook_events(id TEXT PRIMARY KEY,type TEXT,received_at INTEGER)');
async function webhook(req,res){
 const secret=process.env.WEBHOOK_SECRET;if(!secret){res.writeHead(404);return res.end();}
 const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>65536){res.writeHead(413);return res.end();}chunks.push(c);}
 const body=Buffer.concat(chunks);
 if(!verifyWebhook(secret,body,req.headers['x-countersign-signature'])){console.log('webhook REJECTED: bad signature');res.writeHead(401);return res.end();}
 const id=String(req.headers['x-countersign-event-id']??'');let type='unknown';try{type=JSON.parse(body).type;}catch{}
 const fresh=db.prepare('INSERT OR IGNORE INTO webhook_events VALUES (?,?,?)').run(id,type,Math.floor(Date.now()/1000)).changes;
 console.log(`webhook verified ${fresh?'new':'duplicate'} ${type} ${id}`);res.writeHead(200);res.end();
}
const server=createServer(async(req,res)=>{
 if(req.method==='POST'&&req.url==='/webhooks/countersign')return webhook(req,res);
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
