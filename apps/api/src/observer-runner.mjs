export function runObserver(observer,{onError=()=>{},onSuccess=()=>{},intervalMs=2000}={}){
 let stopped=false,timer,active=Promise.resolve();
 function tick(){
  active=observer.tick().then(onSuccess).catch(error=>{stopped=true;onError(error);}).finally(()=>{if(!stopped)timer=setTimeout(tick,intervalMs);});
 }
 tick();
 return async()=>{stopped=true;clearTimeout(timer);await active;};
}
