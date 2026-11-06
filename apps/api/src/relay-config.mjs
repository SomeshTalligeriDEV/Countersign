export function relayConfig(env){
 if(env.RELAYER_ENABLED!=='1')return null;
 if(!env.RELAYER_KEY||!env.WHITECHAIN_RPC_URL||!env.MANDATE_ADDRESS||!env.REGISTRY_ADDRESS||!/^\d+$/.test(env.DEPLOYMENT_BLOCK??''))throw new Error('incomplete_relayer_configuration');
 const integer=name=>{if(!/^[1-9]\d*$/.test(env[name]??''))throw new Error(`missing_or_invalid_${name}`);return BigInt(env[name]);};
 return {mandateAddress:env.MANDATE_ADDRESS,dailyWei:integer('GASGUARD_DAILY_WEI'),mandateDailyWei:integer('GASGUARD_MANDATE_DAILY_WEI'),maxFeePerGas:integer('GASGUARD_MAX_FEE_WEI'),paused:env.RELAYER_PAUSED==='1'};
}
