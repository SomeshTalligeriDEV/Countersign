// Independent decimal conversion; rewritten during the loop provenance audit.
function precision(decimals){
 if(!Number.isInteger(decimals)||decimals<0||decimals>255)throw new Error('invalid_token_decimals');
}
export function parseHumanAmount(input,decimals){
 precision(decimals);
 if(typeof input!=='string'||input.length>512||!/^\d+(\.\d+)?$/.test(input))throw new Error('invalid_amount');
 const point=input.indexOf('.');
 const places=point<0?0:input.length-point-1;
 if(places>decimals)throw new Error('amount_precision');
 let value=0n;
 for(const digit of input){if(digit==='.')continue;value=value*10n+BigInt(digit);if(value>=1n<<256n)throw new Error('amount_overflow');}
 value*=10n**BigInt(decimals-places);
 if(value>=1n<<256n)throw new Error('amount_overflow');
 return value.toString();
}
export function formatBaseUnits(input,decimals){
 precision(decimals);
 if(typeof input!=='string'||! /^(0|[1-9]\d{0,77})$/.test(input))throw new Error('invalid_base_units');
 const value=BigInt(input);if(value>=1n<<256n)throw new Error('amount_overflow');
 const factor=10n**BigInt(decimals);
 const fraction=(value%factor).toString().padStart(decimals,'0').replace(/0+$/,'');
 return fraction?`${value/factor}.${fraction}`:(value/factor).toString();
}
