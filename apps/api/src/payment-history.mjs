const fields=['paymentId','mandateId','merchantId','payout','amount','refunded','status','txHash','explorerUrl'];
export function paymentHistory(db,observer,mandateId,offset=0){
 const rows=db.prepare('SELECT * FROM confirmed_payments WHERE observer=? AND lower(mandate_id)=? ORDER BY payment_id LIMIT 101 OFFSET ?').all(observer,mandateId.toLowerCase(),offset);
 return {payments:rows.slice(0,100).map(r=>({paymentId:r.payment_id,mandateId:r.mandate_id,merchantId:r.merchant_id,payout:r.payout,amount:r.amount,refunded:r.refunded,status:r.status,txHash:r.tx_hash,explorerUrl:`https://explorer.testnet.whitechain.io/tx/${r.tx_hash}`})),nextOffset:rows.length>100?offset+100:null};
}
export function paymentCsv(payments){
 const cell=value=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 return [fields.join(','),...payments.map(row=>fields.map(key=>cell(row[key])).join(','))].join('\r\n')+'\r\n';
}
