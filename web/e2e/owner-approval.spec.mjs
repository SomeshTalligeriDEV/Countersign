import {test,expect} from '@playwright/test';
const owner='0x'+'1'.repeat(40),contract='0x'+'2'.repeat(40),id='0x'+'a'.repeat(64),approval='12345678-1234-1234-1234-123456789012';
async function wallet(page){await page.addInitScript(({owner})=>{window.ethereum={request:async({method})=>{if(['eth_requestAccounts','eth_accounts'].includes(method))return [owner];if(method==='eth_chainId')return '0x752';if(method==='eth_signTypedData_v4')return '0x'+'a'.repeat(130);throw new Error('Unexpected wallet method: '+method);},on(){},removeListener(){}};},{owner});}
test('owner setup reviews a fixture plan without sending before confirmation',async({page})=>{
 await wallet(page);let prepared=0;
 await page.route('**/api/countersign/setup',async route=>{prepared++;await route.fulfill({json:{chainId:1874,owner,token:'0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7',mandateAddress:contract,mandateId:id,warning:'Fixture plan only',transactions:[{chainId:1874,from:owner,to:contract,data:'0x1234',value:'0x0',purpose:'Limited approve'},{chainId:1874,from:owner,to:contract,data:'0x1234',value:'0x0',purpose:'Create mandate'}]}});});
 await page.goto('/owner');await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
 for(const [label,value]of [['Agent wallet',owner],['Attestor wallet',contract],['Maximum per payment (USDT)','2'],['Period budget (USDT)','10'],['Human approval threshold (USDT)','1'],['Total token allowance (USDT)','5'],['Period length (seconds)','3600'],['Expiry (Unix seconds)','2000000000']])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByRole('button',{name:'Review setup',exact:true}).click();await expect(page.getByRole('button',{name:'Confirm step 1 in wallet'})).toBeVisible();expect(prepared).toBe(1);
});
test('approval page signs only world_ok terms and reports submitted without claiming settled',async({page})=>{
 await wallet(page);let signed=0;
 await page.route(`**/api/countersign/approvals/${approval}`,route=>route.fulfill({json:{approvalId:approval,status:'world_ok',expiresAt:Math.floor(Date.now()/1000)+120,formattedAmount:'40',approvalDigest:id,owner,worldStartUrl:'https://sandbox.auth.world.org/authorize',intent:{amount:'40000000',payout:contract,merchantId:id,orderId:id,deadline:'2000000000'},typedData:{domain:{chainId:1874,verifyingContract:contract},types:{},primaryType:'PaymentApproval',message:{}}}}));
 await page.route(`**/api/countersign/approvals/${approval}/owner-signature`,async route=>{signed++;await route.fulfill({json:{status:'submitted'}});});
 await page.goto(`/approve/${approval}`);await page.getByRole('button',{name:'Sign exact payment approval'}).click();await expect(page.getByText('Payment submitted. Awaiting confirmed contract events.')).toBeVisible();expect(signed).toBe(1);
});
test('approval network failure never exposes an actionable signing button',async({page})=>{
 await wallet(page);await page.route(`**/api/countersign/approvals/${approval}`,route=>route.fulfill({status:503,json:{error:'Fixture service unavailable'}}));await page.goto(`/approve/${approval}`);await expect(page.getByText('Fixture service unavailable')).toBeVisible();await expect(page.getByRole('button',{name:'Sign exact payment approval'})).toHaveCount(0);
});
