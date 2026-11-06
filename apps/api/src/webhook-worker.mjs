import { signWebhook } from '../../../packages/merchant/src/webhooks.mjs';
const delays=[60,300,1800,7200];
// resolveMerchant and deliver are server-owned dependencies. Never accept a
// destination URL from a payment request; production transport must restrict egress.
export class WebhookWorker {
 constructor({db,resolveMerchant,deliver,clock=()=>Math.floor(Date.now()/1000)}) {
  Object.assign(this,{db,resolveMerchant,deliver,clock});this.running=false;
 }
 async tick(){
  if(this.running)return;this.running=true;
  try{
   const rows=this.db.prepare("SELECT * FROM outbox WHERE status='pending' AND next_at<=? ORDER BY next_at,id LIMIT 20").all(this.clock());
   for(const row of rows){
    try{
     const event=JSON.parse(row.payload);
     const source=this.db.prepare('SELECT * FROM confirmed_payments WHERE payment_id=? AND observer=?').get(event.data.paymentId,event.data.observer);
     if(!source)throw new Error('payment_missing');
     const merchant=await this.resolveMerchant(source.merchant_id);
     if(!merchant)throw new Error('merchant_not_configured');
     const body=Buffer.from(row.payload);
     const headers={'content-type':'application/json','x-countersign-signature':signWebhook(merchant.secret,body,this.clock()),'idempotency-key':source.payment_id,'x-countersign-event-id':row.id};
     const result=await this.deliver({merchant,body,headers,signal:AbortSignal.timeout(10000)});
     if(!result.ok)throw new Error('delivery_failed');
     this.db.prepare("UPDATE outbox SET status='delivered',attempts=attempts+1 WHERE id=?").run(row.id);
    }catch{
     const retry=delays[row.attempts];
     this.db.prepare('UPDATE outbox SET attempts=attempts+1,status=?,next_at=? WHERE id=?').run(retry===undefined?'failed':'pending',this.clock()+(retry??0),row.id);
    }
   }
  }finally{this.running=false;}
 }
}
