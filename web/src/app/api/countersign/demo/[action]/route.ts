const commands=['buy-report','tamper-amount','tamper-payout','order-40','over-budget','save-replay','replay-after-revoke','arbitrary-relayer-call'];
async function handle(request:Request,action:string){
 const headers={'Cache-Control':'no-store'};
 if(process.env.DEMO_MODE!=='1'||!process.env.DEMO_CONTROL_SECRET)return Response.json({error:'Demo runner is not configured.'},{status:503,headers});
 if(request.method==='POST'&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Same-origin request required.'},{status:403,headers});
 const path=request.method==='POST'&&commands.includes(action)?`/run/${action}`:request.method==='GET'&&/^[a-f0-9-]{36}$/.test(action)?`/runs/${action}`:null;
 if(!path)return Response.json({error:'Invalid demo command.'},{status:400,headers});
 try{const response=await fetch(`http://127.0.0.1:4001${path}`,{method:request.method,headers:{authorization:`Bearer ${process.env.DEMO_CONTROL_SECRET}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});return Response.json(await response.json(),{status:response.status,headers});}
 catch{return Response.json({error:'Demo runner unavailable. Check the runner before retrying.'},{status:503,headers});}
}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){return handle(request,(await params).action);}
export async function GET(request:Request,{params}:{params:Promise<{action:string}>}){return handle(request,(await params).action);}
