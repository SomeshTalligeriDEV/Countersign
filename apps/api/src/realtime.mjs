/** Public invalidation notifications only: no identity, signatures or payment payloads. */
export async function attachRealtime({server,db,allowedOrigins,WebSocketServerClass}){
 if(!allowedOrigins?.length)throw new Error('websocket_origins_required');
 for(const value of allowedOrigins){const url=new URL(value);if(url.origin!==value||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))throw new Error('invalid_websocket_origin');}
 const WebSocketServer=WebSocketServerClass??(await import('ws')).WebSocketServer;
 const wss=new WebSocketServer({noServer:true,maxPayload:1024,perMessageDeflate:false});
 let revision=0,last=Number(db.prepare('SELECT total_changes() AS n').get().n),version=Number(db.prepare('PRAGMA data_version').get().data_version);
 const payload=()=>JSON.stringify({type:'state_changed',revision});
 const upgrade=(request,socket,head)=>{
  let path;try{path=new URL(request.url,'http://localhost').pathname;}catch{socket.destroy();return;}
  if(path!=='/v1/events'||!allowedOrigins.includes(request.headers.origin)||wss.clients.size>=32){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(request,socket,head,ws=>wss.emit('connection',ws));
 };
 server.on('upgrade',upgrade);
 wss.on('connection',ws=>{
  ws.alive=true;ws.on('error',()=>{});ws.on('pong',()=>{ws.alive=true;});
  ws.on('message',()=>ws.close(1008,'Read-only stream'));
  ws.send(payload()); // Reconnect always triggers a fresh authoritative read.
 });
 const changes=setInterval(()=>{
  const next=Number(db.prepare('SELECT total_changes() AS n').get().n);
  const nextVersion=Number(db.prepare('PRAGMA data_version').get().data_version);
  if(next===last&&nextVersion===version)return;last=next;version=nextVersion;revision++;
  for(const ws of wss.clients){if(ws.readyState!==1)continue;if(ws.bufferedAmount>65536){ws.terminate();continue;}ws.send(payload());}
 },1000);
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},30000);
 changes.unref();heartbeat.unref();
 return ()=>{clearInterval(changes);clearInterval(heartbeat);server.removeListener('upgrade',upgrade);for(const ws of wss.clients)ws.terminate();wss.close();};
}
