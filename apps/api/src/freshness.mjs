/** Health of this process's observer, not a promise of instantaneous finality. */
export function observerFreshness({clock=()=>Date.now(),maxAgeMs=15000}={}){
 let last=null,failed=false;
 return {
  success(result){last={...result,checkedAt:clock()};failed=false;},
  failure(){failed=true;},
  status(){
   const age=last?clock()-last.checkedAt:null;
   const state=failed?'stopped':!last?'starting':age<0||age>maxAgeMs?'stale':!last.caughtUp?'backfilling':'current';
   return {state,head:last?.head??null,confirmedThrough:last?.confirmedThrough??null,checkedAt:last?new Date(last.checkedAt).toISOString():null,confirmationBlocks:3,pollIntervalMs:2000};
  },
  healthy(){return this.status().state==='current';},
 };
}
