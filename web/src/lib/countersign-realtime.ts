// Public endpoint only. Events invalidate views; they never authorize payment.
const listeners=new Set<()=>void>();
let socket:WebSocket|null=null,timer:ReturnType<typeof setTimeout>|undefined,retry=1000;
function connect(){
 const endpoint=process.env.NEXT_PUBLIC_COUNTERSIGN_WS_URL;
 if(!endpoint||!listeners.size)return;
 try{
  const url=new URL(endpoint);
  if(url.protocol!=='wss:'&&!(url.protocol==='ws:'&&['localhost','127.0.0.1'].includes(url.hostname)))return;
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/v1/events')return;
  socket=new WebSocket(url);
  socket.onopen=()=>{retry=1000;};
  socket.onmessage=event=>{try{const data=JSON.parse(event.data);if(data.type==='state_changed'&&Number.isSafeInteger(data.revision))for(const refresh of listeners)refresh();}catch{/* Ignore malformed notifications; polling stays active. */}};
  socket.onerror=()=>socket?.close();
  socket.onclose=()=>{socket=null;if(listeners.size){timer=setTimeout(connect,retry);retry=Math.min(retry*2,30000);}};
 }catch{/* Existing polling remains available. */}
}
export function subscribeRealtime(refresh:()=>void){
 listeners.add(refresh);if(!socket&&!timer)connect();
 return ()=>{listeners.delete(refresh);if(!listeners.size){clearTimeout(timer);timer=undefined;if(socket){socket.onclose=null;socket.close();socket=null;}retry=1000;}};
}
