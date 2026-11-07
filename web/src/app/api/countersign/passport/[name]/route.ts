import {readPassport,whitechainPassportClient} from '../../../../../../../packages/ens/src/passport.mjs';
import {sepoliaClient} from '../../../../../../../packages/ens/src/index.mjs';
const recordedMandate='0x923298375911A173da34C715da2718c0c9889EbA';
export async function GET(_request:Request,{params}:{params:Promise<{name:string}>}){
 const {name}=await params;const headers={'Cache-Control':'no-store'};
 if(name.length>255||!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(name))return Response.json({status:'UNVERIFIED',error:'Invalid ENS name.'},{status:400,headers});
 try{
  const result=await readPassport({name,ensClient:sepoliaClient(process.env.ENS_SEPOLIA_RPC_URL||undefined),paymentClient:whitechainPassportClient(process.env.WHITECHAIN_RPC_URL||undefined),mandateAddress:process.env.COUNTERSIGN_MANDATE_ADDRESS||recordedMandate});
  return Response.json(result,{headers});
 }catch{return Response.json({status:'RPC_ERROR',error:'Cannot verify both chain snapshots. No authority is assumed.'},{status:503,headers});}
}
