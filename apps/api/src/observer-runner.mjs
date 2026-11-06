// Stops on any non-transient error (e.g. reorg/state mismatch must be reconciled by a human).
// Transient RPC failures (timeouts, dropped connections, 429) retry with capped backoff instead of halting.
export function isTransientRpcError(error){
 for(let e=error;e;e=e.cause){
  const name=e.name??'',msg=String(e.message??'');
  if(['TimeoutError','HttpRequestError'].includes(name)||/rpc_rate_limited|timed out|fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(msg))return true;
 }
 return false;
}
export function runObserver(observer,{onError=()=>{},onSuccess=()=>{},onRetry=()=>{},intervalMs=2000,isTransient=isTransientRpcError,maxBackoffMs=30000}={}){
 let stopped=false,timer,active=Promise.resolve(),failures=0;
 function tick(){
  let delay=intervalMs;
  active=observer.tick().then(result=>{failures=0;onSuccess(result);}).catch(error=>{
   if(!stopped&&isTransient(error)){failures++;delay=Math.min(maxBackoffMs,intervalMs*2**failures);onRetry(error,failures);return;}
   stopped=true;onError(error);
  }).finally(()=>{if(!stopped)timer=setTimeout(tick,delay);});
 }
 tick();
 return async()=>{stopped=true;clearTimeout(timer);await active;};
}
