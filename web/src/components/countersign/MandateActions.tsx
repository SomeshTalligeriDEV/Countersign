'use client';
import {useState} from 'react';
type Provider={request:(args:{method:string;params?:unknown[]})=>Promise<unknown>};
type Snapshot={mandateAddress:string;owner:string;paused:boolean;actions:{pause:string;unpause:string;revoke:string}};
export default function MandateActions({id,wallet,snapshot}:{id:string;wallet:string;snapshot:Snapshot}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[hash,setHash]=useState(''),[merchant,setMerchant]=useState('');
 async function act(action:'pause'|'unpause'|'revoke'|'allow'|'remove'){
  setBusy(true);setHash('');setStatus('Rechecking mandate and wallet…');
  try{
   const provider=(window as Window&{ethereum?:Provider}).ethereum;if(!provider)throw new Error('Wallet unavailable.');
   if(await provider.request({method:'eth_chainId'})!=='0x752')throw new Error('Select Whitechain Sepolia in your wallet.');
   const accounts=await provider.request({method:'eth_accounts'});
   if(!Array.isArray(accounts)||accounts[0]?.toLowerCase()!==wallet.toLowerCase())throw new Error('Wallet changed. Reconnect before continuing.');
   const response=await fetch(`/api/countersign/mandates/${id}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error('Cannot verify the current mandate.');
   const current:Snapshot=await response.json();
   if(current.owner.toLowerCase()!==wallet.toLowerCase()||current.mandateAddress.toLowerCase()!==snapshot.mandateAddress.toLowerCase())throw new Error('The connected wallet is not the recorded owner.');
   let data:string;
   if(action==='allow'||action==='remove'){
    if(!/^0x[\da-fA-F]{64}$/.test(merchant))throw new Error('Enter the registered bytes32 merchant ID.');
    const prepared=await fetch('/api/countersign/merchant-access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({owner:wallet,mandateId:id,merchantId:merchant,allowed:action==='allow'}),signal:AbortSignal.timeout(10000)});
    const tx=await prepared.json();if(!prepared.ok)throw new Error(tx.error??'Merchant access preparation failed.');
    if(tx.chainId!==1874||tx.to?.toLowerCase()!==current.mandateAddress.toLowerCase()||tx.from?.toLowerCase()!==wallet.toLowerCase()||tx.value!=='0x0'||!/^0x[\da-fA-F]+$/.test(tx.data))throw new Error('Invalid merchant access transaction.');
    data=tx.data;
   }else data=current.actions[action];
   const transaction={from:wallet,to:current.mandateAddress,data,value:'0x0'};
   await provider.request({method:'eth_call',params:[transaction,'latest']});
   if(await provider.request({method:'eth_chainId'})!=='0x752')throw new Error('Wallet network changed.');
   setStatus('Review the transaction in your wallet.');
   const txHash=await provider.request({method:'eth_sendTransaction',params:[transaction]});
   if(typeof txHash!=='string'||!/^0x[\da-fA-F]{64}$/.test(txHash))throw new Error('Wallet returned an invalid transaction hash.');
   setHash(txHash);setStatus('Submitted. Waiting for confirmation…');
   for(let attempt=0;attempt<45;attempt++){
    if(await provider.request({method:'eth_chainId'})!=='0x752')throw new Error('Network changed. Check the transaction on the explorer.');
    const receipt=await provider.request({method:'eth_getTransactionReceipt',params:[txHash]}) as {status?:string;blockNumber?:string;blockHash?:string}|null;
    if(receipt?.status==='0x0')throw new Error('Transaction reverted. The requested change was not applied.');
    if(receipt?.status==='0x1'&&receipt.blockNumber){
     const head=await provider.request({method:'eth_blockNumber'});
     if(typeof head==='string'&&BigInt(head)>=BigInt(receipt.blockNumber)+BigInt(3)){
      const block=await provider.request({method:'eth_getBlockByNumber',params:[receipt.blockNumber,false]}) as {hash?:string}|null;
      if(block?.hash&&block.hash===receipt.blockHash){setStatus('Transaction confirmed. The mandate view refreshes automatically.');return;}
     }
    }
    await new Promise(resolve=>setTimeout(resolve,2000));
   }
   setStatus('Still pending. Check the explorer; no confirmation is assumed.');
  }catch(error){const code=(error as {code?:number}).code;setStatus(code===4001?'Transaction declined in your wallet.':error instanceof Error?error.message:'Transaction unavailable.');}
  finally{setBusy(false);}
 }
 const allowed=wallet.toLowerCase()===snapshot.owner.toLowerCase();
 return <section className="mt-6 rounded-2xl border p-6"><h2 className="text-lg font-semibold">Owner controls</h2><p className="mt-2 text-sm">Pause blocks payments. Revoke invalidates outstanding signatures by changing the epoch; it does not permanently disable the agent. Your wallet pays testnet gas.</p><div className="mt-4 flex flex-wrap gap-3"><button disabled={!allowed||busy} onClick={()=>act(snapshot.paused?'unpause':'pause')} className="rounded-full border px-5 py-2 disabled:opacity-40">{snapshot.paused?'Unpause payments':'Pause payments'}</button><button disabled={!allowed||busy} onClick={()=>act('revoke')} className="rounded-full border px-5 py-2 disabled:opacity-40">Revoke outstanding signatures</button></div><div className="mt-6"><label htmlFor="merchant-access">Registered merchant ID</label><input id="merchant-access" className="mt-2 block w-full rounded-lg border p-3" value={merchant} onChange={event=>setMerchant(event.target.value)} disabled={busy}/><p className="mt-2 text-sm">Changing merchant access invalidates outstanding signatures.</p><div className="mt-3 flex gap-3"><button className="rounded-full border px-4 py-2 disabled:opacity-40" disabled={!allowed||busy||!merchant} onClick={()=>act('allow')}>Allow merchant</button><button className="rounded-full border px-4 py-2 disabled:opacity-40" disabled={!allowed||busy||!merchant} onClick={()=>act('remove')}>Remove merchant</button></div></div><p role="status" className="mt-4 text-sm">{status}</p>{hash&&<a className="mt-2 block underline" href={`https://explorer.testnet.whitechain.io/tx/${hash}`} target="_blank" rel="noopener noreferrer">View transaction ↗</a>}</section>;
}
