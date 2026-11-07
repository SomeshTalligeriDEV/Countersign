import {readPassport,whitechainPassportClient} from '../../../../../../../packages/ens/src/passport.mjs';
import {sepoliaClient} from '../../../../../../../packages/ens/src/index.mjs';
import {planPassportRevocation} from '../../../../../../../packages/ens/src/revocation.mjs';
export async function POST(request:Request,{params}:{params:Promise<{name:string}>}){
 const headers={'Cache-Control':'no-store'}, {name}=await params;
 if(name.length>255||!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(name))return Response.json({status:'BLOCKED',reason:'Invalid ENS name.',steps:[],canBroadcast:false},{status:400,headers});
 const anchors={mandateAddress:process.env.COUNTERSIGN_MANDATE_ADDRESS,paymentOwner:process.env.COUNTERSIGN_REVOCATION_OWNER,registry:process.env.ENS_EXPECTED_REGISTRY,ensOwner:process.env.ENS_EXPECTED_OWNER,resolver:process.env.ENS_EXPECTED_RESOLVER};
 if(!anchors.mandateAddress||!Object.values(anchors).every(v=>typeof v==='string'&&/^0x[\da-fA-F]{40}$/.test(v)))return Response.json({mode:'READ_ONLY_PLAN',status:'BLOCKED',reason:'Configure independent treasury, registry, ENS owner and resolver anchors before preparing a revocation.',steps:[],canBroadcast:false},{status:503,headers});
 try{
  const declared=Number(request.headers.get('content-length')??0);if(declared>8192)throw Error();
  // Read incrementally so a request without Content-Length cannot allocate an unbounded body.
  const reader=request.body?.getReader();let size=0,text='';if(reader){const decoder=new TextDecoder();for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();throw Error();}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}
  const body=text?JSON.parse(text):{};
  const snapshot=await readPassport({name,ensClient:sepoliaClient(process.env.ENS_SEPOLIA_RPC_URL||undefined),paymentClient:whitechainPassportClient(process.env.WHITECHAIN_RPC_URL||undefined),mandateAddress:anchors.mandateAddress,expectedRegistry:anchors.registry,expectedOwner:anchors.ensOwner,expectedResolver:anchors.resolver});
  return Response.json(planPassportRevocation({snapshot,anchors,intent:body.intent??undefined}),{headers});
 }catch{return Response.json({mode:'READ_ONLY_PLAN',status:'BLOCKED',reason:'Unable to prepare from current confirmed chain reads. No transaction was sent.',steps:[],canBroadcast:false},{status:503,headers});}
}
