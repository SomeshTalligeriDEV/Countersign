import {createServer} from 'node:http';
import {timingSafeEqual,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {runCommand,sixSteps} from './run-all.mjs';
const secret=process.env.DEMO_CONTROL_SECRET;if(!secret||secret.length<32)throw new Error('DEMO_CONTROL_SECRET required');
const db=new DatabaseSync(process.env.DEMO_DATABASE_PATH??'demo.sqlite');
db.exec("CREATE TABLE IF NOT EXISTS demo_runs(id TEXT PRIMARY KEY,scenario TEXT,status TEXT,output TEXT); UPDATE demo_runs SET status='unknown',output='Runner restarted. Inspect wallet and chain before retrying.' WHERE status='running'");
const commands=[...sixSteps,'save-replay','arbitrary-relayer-call'];let running=false;
const server=createServer(async(req,res)=>{
 const reply=(code,body)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));};
 const received=Buffer.from(req.headers.authorization??''),expected=Buffer.from('Bearer '+secret);
 if(received.length!==expected.length||!timingSafeEqual(received,expected))return reply(401,{error:'unauthorized'});
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&/^\/runs\/[a-f0-9-]{36}$/.test(url.pathname)){const row=db.prepare('SELECT * FROM demo_runs WHERE id=?').get(url.pathname.slice(6));return reply(row?200:404,row??{error:'not_found'});}
 const command=url.pathname.slice(5);
 if(req.method!=='POST'||!url.pathname.startsWith('/run/')||!commands.includes(command))return reply(404,{error:'not_found'});
 if(running)return reply(409,{error:'scenario_in_progress'});running=true;const id=randomUUID();db.prepare('INSERT INTO demo_runs VALUES (?,?,?,?)').run(id,command,'running','');reply(202,{id,scenario:command,status:'running'});
 try{const result=await runCommand(command);db.prepare('UPDATE demo_runs SET status=?,output=? WHERE id=?').run(result.exitCode===0?'completed':'failed',result.output,id);}finally{running=false;}
});
server.listen(Number(process.env.DEMO_PORT??4001),'127.0.0.1');
