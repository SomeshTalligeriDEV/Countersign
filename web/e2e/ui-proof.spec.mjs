// F4: FIXTURE/MOCKED-WALLET screenshots (desktop 1280, mobile 390) + axe a11y scan of every Countersign route. All APIs mocked.
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {appendFileSync,writeFileSync} from 'node:fs';
const owner='0x'+'1'.repeat(40),contract='0x'+'2'.repeat(40),id='0x'+'a'.repeat(64),approval='12345678-1234-1234-1234-123456789012';
const out='../../docs/proof/ui';
async function fixtures(page){
 await page.addInitScript(({owner})=>{window.ethereum={request:async({method})=>{if(['eth_requestAccounts','eth_accounts'].includes(method))return [owner];if(method==='eth_chainId')return '0x752';throw new Error('Unexpected wallet method: '+method);},on(){},removeListener(){}};},{owner});
 await page.route('**/api/network',r=>r.fulfill({json:{chainId:1874,block:'1',tokenDecimals:6,checkedAt:new Date().toISOString(),world:{env:'sandbox',configured:true}}}));
 await page.route(`**/api/countersign/approvals/${approval}`,r=>r.fulfill({json:{approvalId:approval,status:'world_ok',expiresAt:Math.floor(Date.now()/1000)+120,formattedAmount:'40',approvalDigest:id,owner,worldStartUrl:'https://sandbox.auth.world.org/authorize',intent:{amount:'40000000',payout:contract,merchantId:id,orderId:id,deadline:'2000000000'},typedData:{domain:{chainId:1874,verifyingContract:contract},types:{},primaryType:'PaymentApproval',message:{}}}}));
 await page.route(`**/api/countersign/receipts/${id}`,r=>r.fulfill({json:{paymentId:id,amount:'40000000',refunded:'0',decimals:6,status:'settled',mandateId:id,merchantId:id,payout:contract,humanApproved:true,txHash:id,checkedAt:new Date().toISOString()}}));
}
const routes=[['home','/','Bounded payments'],['owner','/owner','Your spending mandate'],['approve',`/approve/${approval}`,'Review this payment'],['merchant','/merchant',null],['demo','/demo','Live demo console'],['r',`/r/${id}`,'Payment receipt']];
test.beforeAll(()=>writeFileSync(`${out}/a11y.txt`,`axe-core scan (wcag2a, wcag2aa) ${new Date().toISOString()}\n`));
for(const [name,path,heading] of routes)test(`F4 ${name} screenshots + a11y`,async({page})=>{
 await fixtures(page);
 for(const [kind,width,height] of [['desktop',1280,800],['mobile',390,844]]){
  await page.setViewportSize({width,height});await page.goto(path);
  if(heading)await expect(page.getByRole('heading',{level:1,name:heading})).toBeVisible();else await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({path:`${out}/${name}-${kind}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${name} ${kind} has no horizontal scroll`).toBe(true);
 }
 const {violations}=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();
 appendFileSync(`${out}/a11y.txt`,`\n${path}: ${violations.length} violation(s)\n`+violations.map(v=>`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s)) e.g. ${v.nodes[0]?.target.join(' ')}`).join('\n')+(violations.length?'\n':''));
 expect(violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)).toEqual([]);
});
