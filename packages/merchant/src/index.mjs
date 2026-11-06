import { createCharge } from './charge.mjs';
import { facilitatorApi } from './api.mjs';

export function countersign({db,merchantId,apiUrl,api,clock}){
 const run=createCharge({db,merchantId,api:api??facilitatorApi(apiUrl),clock});
 return {
  charge({amount,approvalWindow=false}){
   return async(req,res,next)=>{
    const respond=(status,body)=>{res.statusCode=status;res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');res.end(JSON.stringify(body));};
    try{
     const header=req.headers['x-payment'];let payment;
     if(header!==undefined){
      if(typeof header!=='string'||header.length>12000||!/^[A-Za-z0-9_-]+$/.test(header))return respond(400,{error:'invalid_payment_header'});
      try{payment=JSON.parse(Buffer.from(header,'base64url').toString('utf8'));}catch{return respond(400,{error:'invalid_payment_header'});}
      if(!payment||typeof payment!=='object'||Array.isArray(payment))return respond(400,{error:'invalid_payment_header'});
     }
     // Express body parsers must retain the original bytes in req.rawBody.
     if(!['GET','HEAD'].includes(req.method)&&!Buffer.isBuffer(req.rawBody))return respond(400,{error:'raw_body_required'});
     const result=await run({method:req.method,url:req.originalUrl??req.url,body:req.rawBody??new Uint8Array(),amount:typeof amount==='function'?amount(req):amount,payment,approvalWindow});
     if(result.status!==200)return respond(result.status,result.body);
     req.countersign=result.body;
     res.setHeader('x-payment-response',Buffer.from(JSON.stringify(result.body)).toString('base64url'));
     return next();
    }catch{return respond(503,{error:'payment_service_unavailable'});}
   };
  },
 };
}
