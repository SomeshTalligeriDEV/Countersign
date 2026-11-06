// W5: FIXTURE/MOCKED-WALLET coverage of all five routes. No real wallet, no chain, all APIs mocked.
import {test,expect} from '@playwright/test';
const owner='0x'+'1'.repeat(40),contract='0x'+'2'.repeat(40),id='0x'+'a'.repeat(64),approval='12345678-1234-1234-1234-123456789012';
const proof=name=>`../../docs/proof/W5-${name}.png`;
async function wallet(page){await page.addInitScript(({owner})=>{window.ethereum={request:async({method})=>{if(['eth_requestAccounts','eth_accounts'].includes(method))return [owner];if(method==='eth_chainId')return '0x752';if(method==='eth_signTypedData_v4')return '0x'+'a'.repeat(130);throw new Error('Unexpected wallet method: '+method);},on(){},removeListener(){}};},{owner});}

test('W5 /owner renders setup form with mocked wallet connected',async({page})=>{
 await wallet(page);await page.goto('/owner');await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
 await expect(page.getByLabel('Agent wallet',{exact:true})).toBeVisible();await page.screenshot({path:proof('owner'),fullPage:true});
});
test('W5 /approve/[id] shows world_ok fixture approval',async({page})=>{
 await wallet(page);
 await page.route(`**/api/countersign/approvals/${approval}`,route=>route.fulfill({json:{approvalId:approval,status:'world_ok',expiresAt:Math.floor(Date.now()/1000)+120,formattedAmount:'40',approvalDigest:id,owner,worldStartUrl:'https://sandbox.auth.world.org/authorize',intent:{amount:'40000000',payout:contract,merchantId:id,orderId:id,deadline:'2000000000'},typedData:{domain:{chainId:1874,verifyingContract:contract},types:{},primaryType:'PaymentApproval',message:{}}}}));
 await page.goto(`/approve/${approval}`);await expect(page.getByRole('button',{name:'Sign exact payment approval'})).toBeVisible();await page.screenshot({path:proof('approve'),fullPage:true});
});
test('W5 /merchant reads fixture registry profile and payment history',async({page})=>{
 await wallet(page);
 await page.route(`**/api/countersign/merchants/${id}`,route=>route.fulfill({json:{merchantId:id,registryAddress:contract,owner,payout:contract,active:true,registered:true,version:'1',decimals:6,paymentHistoryState:'current',payments:[{payment_id:id,amount:'40000000',status:'settled',tx_hash:id}]}}));
 await page.goto('/merchant');await page.getByLabel('Merchant ID').fill(id);await page.getByRole('button',{name:'Read registry'}).click();
 await expect(page.getByText('Registered merchant')).toBeVisible();await expect(page.getByText('40 USDT · settled')).toBeVisible();await page.screenshot({path:proof('merchant'),fullPage:true});
});
test('W5 /demo runs a fixture scenario and surfaces tx hash',async({page})=>{
 await page.route('**/api/countersign/demo/buy-report',route=>route.fulfill({json:{id:'run-1'}}));
 await page.route('**/api/countersign/demo/run-1',route=>route.fulfill({json:{status:'done',output:JSON.stringify({txHash:id})}}));
 await page.goto('/demo');await page.getByRole('button',{name:'buy-report'}).click();
 await expect(page.getByRole('link',{name:`${id} ↗`})).toBeVisible();await page.screenshot({path:proof('demo'),fullPage:true});
});
test('W5 /r/[paymentId] shows fixture receipt; invalid id rejected',async({page})=>{
 await page.route(`**/api/countersign/receipts/${id}`,route=>route.fulfill({json:{paymentId:id,amount:'40000000',refunded:'0',decimals:6,status:'settled',mandateId:id,merchantId:id,payout:contract,humanApproved:true,txHash:id,checkedAt:new Date().toISOString()}}));
 await page.goto(`/r/${id}`);await expect(page.getByText('40 USDT')).toBeVisible();await expect(page.getByText('Payment confirmed')).toBeVisible();await page.screenshot({path:proof('r'),fullPage:true});
 await page.goto('/r/not-an-id');await expect(page.getByRole('heading',{name:'Invalid payment ID'})).toBeVisible();
});
