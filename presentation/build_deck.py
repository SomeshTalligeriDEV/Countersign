#!/usr/bin/env python3
"""Build a seven-slide native OOXML deck, vector PDF and offline HTML.
No external requests. All diagram labels remain editable PowerPoint objects.
"""
from pathlib import Path
import fitz, json, math, zipfile, hashlib, html, textwrap
from xml.sax.saxutils import escape
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parent
W,H=1600,900
INK='111B26';PAPER='F7F1E4';MINT='39D8AE';AMBER='F0B34F';RED='C74D58';MUTED='59635F';WHITE='FFFFFF';PALE='DDF4EA'
FONT='/System/Library/Fonts/Supplemental/Arial.ttf';BOLD='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
fonts={False:fitz.Font(fontfile=FONT),True:fitz.Font(fontfile=BOLD)}
slides=[];cur=None

def rect(x,y,w,h,fill=PAPER,stroke=INK,lw=3):cur['objects'].append(dict(kind='rect',x=x,y=y,w=w,h=h,fill=fill,stroke=stroke,lw=lw))
def poly(points,fill=INK,stroke=None,lw=2):cur['objects'].append(dict(kind='poly',points=points,fill=fill,stroke=stroke,lw=lw))
def txt(x,y,w,value,size=32,color=INK,bold=False,h=None,link=None):
 lines=[]
 for para in value.split('\n'):
  line=''
  for word in para.split(' '):
   trial=(line+' '+word).strip()
   if fonts[bold].text_length(trial,fontsize=size)>w and line:lines.append(line);line=word
   else:line=trial
  lines.append(line)
 height=h or len(lines)*size*1.35+8
 if len(lines)*size*1.16>height:raise ValueError('Text exceeds box: '+value)
 if x<0 or y<0 or x+w>W+1 or y+height>H+1:raise ValueError('Text outside slide: '+value)
 cur['objects'].append(dict(kind='text',x=x,y=y,w=w,h=height,text='\n'.join(lines),size=size,color=color,bold=bold,link=link))
def pic(name,x,y,w,h):cur['objects'].append(dict(kind='image',path='assets/'+name,x=x,y=y,w=w,h=h))
def line(x,y,x2,y2,color=INK,width=4):
 cur['objects'].append(dict(kind='line',x=x,y=y,x2=x2,y2=y2,color=color,width=width))
def arrow(x,y,x2,y2,color=INK):
 line(x,y,x2,y2,color);a=math.atan2(y2-y,x2-x)
 poly([(x2,y2),(x2-16*math.cos(a-.45),y2-16*math.sin(a-.45)),(x2-16*math.cos(a+.45),y2-16*math.sin(a+.45))],color)
def panel(x,y,w,h,fill=PAPER):
 rect(x+7,y+7,w,h,INK,None,0);rect(x,y,w,h,fill)
def badge(x,y,text,fill=MINT,width=250):
 poly([(x,y),(x+width,y),(x+width-12,y+42),(x,y+42)],fill)
 txt(x+14,y+8,width-30,text,21,INK,True,h=29)
def card(x,y,w,h,kicker,title,body,fill=PAPER):
 panel(x,y,w,h,fill);txt(x+22,y+16,w-44,kicker,21,MUTED,True)
 txt(x+22,y+51,w-44,title,35,INK,True)
 txt(x+22,y+109,w-44,body,27,INK)
def start(chapter,title,subtitle='',dark=False):
 global cur
 cur={'chapter':chapter,'title':title,'objects':[],'notes':'','sources':[]};slides.append(cur)
 rect(0,0,W,H,INK if dark else PAPER,None,0)
 badge(55,33,f'{len(slides):02} / {chapter}',MINT,365)
 heading_size=min(60,1470/fonts[True].text_length(title,fontsize=1))
 txt(65,96,1470,title,heading_size,WHITE if dark else INK,True)
 if subtitle:txt(68,174,1464,subtitle,26,'C9D8D2' if dark else MUTED)
 footer_color='C2D1CB' if dark else MUTED
 txt(65,851,1370,'COUNTERSIGN  /  Whitechain + World + ENSv2  /  7 Nov 2026  /  Sources in slide notes',19,footer_color)
 txt(1490,847,55,f'{len(slides):02}',25,footer_color,True)
def note(text,sources):cur['notes']=text;cur['sources']=sources

# 01 - Cover: illustration is narrative, not fabricated product evidence.
cur={'chapter':'THE PROBLEM','title':'Your agent. Your rules.','objects':[],'notes':'','sources':[]};slides.append(cur)
pic('countersign-cover.png',0,0,1600,900)
rect(0,0,680,900,INK,None,0)
rect(65,55,94,94,PAPER,None,0);pic('countersign-logo.png',65,55,94,94)
txt(182,73,450,'COUNTERSIGN',47,WHITE,True)
badge(65,181,'01 / THE PROBLEM',MINT,300)
txt(65,265,600,'Your agent.\nYour rules.',103,WHITE,True)
txt(70,529,535,'Let software request a purchase.\nKeep authority with the owner.',35,'D8E4DE')
line(70,662,602,662,MINT,4)
txt(70,693,540,'Whitechain settles.\nWorld authenticates.\nENS makes identity discoverable.',33,WHITE,True)
txt(70,834,550,'Somesh S. Talligeri • ETHGlobal Mumbai 2026',22,'D8E4DE')
panel(1060,707,470,122,PAPER);txt(1085,729,420,'“I can request.\nYou set the boundaries.”',31,INK,True)
note('Countersign addresses a specific authorization problem: an autonomous agent should be allowed to request a purchase without receiving unrestricted control of a treasury. It combines a Whitechain spending-policy contract, fresh World sandbox authentication plus an exact owner signature, and ENSv2 identity discovery and scoped record administration. The illustrations are fictional explanatory artwork; they are not screenshots, identity proofs or evidence of deployed behavior. No claim of independent audit, production readiness or a new cryptographic primitive is made. Intended users are organizations and developers integrating bounded agent purchases, not holders of a new project token.', ['README.md','docs/PROTOCOL_SPECIFICATION.md','research/paper/main.tex'])

# 02 - Full system roles and trust boundaries.
start('THE CAST','Three protocols. One bounded payment.','Each component has a different job. No identity record or login can move funds by itself.')
for x,k,t,b,c in [(65,'SETTLEMENT','Whitechain','Mandate + registry enforce\nthe official-USDT transfer.',PALE),(566,'HUMAN CHECKPOINT','World','Fresh sandbox authentication;\nthe owner still signs the payment.',PAPER),(1067,'AGENT IDENTITY','ENSv2','Discover the agent and inspect\nscoped record permissions.',PAPER)]:card(x,239,466,195,k,t,b,c)
roles=[('OWNER','Sets limits + allowance'),('AGENT','Signs exact intent'),('RELAYER','Checks + pays gas'),('MANDATE','Enforces + transfers')]
for i,(a,b) in enumerate(roles):
 x=65+i*379;panel(x,495,335,130,WHITE);txt(x+20,516,295,a,29,INK,True);txt(x+20,560,295,b,24)
 if i<3:arrow(x+340,559,x+372,559)
panel(65,678,710,130,PAPER);txt(88,696,660,'Merchant + SDK',31,INK,True);txt(88,742,660,'402 quote → confirmed receipt → deliver resource',27)
panel(810,678,723,130,PALE);txt(834,696,670,'Observer + application',31,INK,True);txt(834,742,670,'Logs → status → signed webhooks / history / CSV',26)
note('The owner is the treasury: createMandate uses msg.sender, not an arbitrary funding-account parameter. The owner approves a limited allowance to Mandate and chooses agent, attestor, limits, merchants and expiry. A separate merchant application integrates @countersign/merchant; @countersign/agent signs exact intents. The facilitator validates, simulates and reserves GasGuard budget before relay. The observer projects actual events, with three successor blocks as an application confirmation policy rather than irreversible L1 finality. Signed webhooks, receipt history and CSV export support merchant integration. Refunds are bounded by paid amount and require the original payout account to authorize and fund them; there is no forced reversal. API, attestor and RPC trust remain explicit. The latest README reports Cloudflare web and a Render API/attestor container, with ephemeral storage and idle-sleep limitations.', ['contracts/src/Mandate.sol','contracts/src/MerchantRegistry.sol','apps/api/src/facilitator.mjs','packages/merchant/src/index.mjs','packages/agent/','apps/attestor/','deploy/render-start.sh'])

# 03 - ENS permissions, not magical cross-chain authorization.
start('DISCOVER & DELEGATE','A name is not spending authority.','ENSv2 makes identity and record-write permissions inspectable; Whitechain remains financially authoritative.')
panel(65,240,595,520,INK)
txt(94,268,533,'countersign.eth',46,WHITE,True)
line(121,335,121,382,MINT,5);line(121,382,174,382,MINT,5)
txt(186,351,440,'agent1.countersign.eth',34,MINT,True)
txt(94,437,530,'UserRegistry\nDedicated PermissionedResolver\nEnhanced Access Control',29,WHITE)
badge(95,595,'SEPOLIA • 11155111',AMBER,310)
txt(95,656,522,'Recorded setup + scoped grants.\nLive negative/revoke tests still open.',26,'D8E4DE')
card(708,240,825,195,'OWNER-CONTROLLED','Policy + administration','Owner controls protected policy records and grants.\nThe agent cannot gain spending power by editing metadata.',PAPER)
card(708,468,825,195,'AGENT-SCOPED','Endpoint + context','Scoped text-key roles cover agent-endpoint[web]\nand agent-context. Scope is resolver-wide, not per-name.',PALE)
rect(708,699,825,111,INK,None,0);txt(733,718,774,'Passport: compare pinned reads; show MISMATCH,\nSTALE, UNVERIFIED or RPC_ERROR honestly.',27,WHITE)
note('Recorded ENS identity: agent1.countersign.eth on Ethereum Sepolia chain 11155111. UserRegistry 0x4aDb9CecA5b9A70000C3F7Df5Af0831535f649Ca; PermissionedResolver 0x64b67a1903eD1923F98A3a74Cc4Ed539be40d456. Official ENSv2 documentation confirms that text-key roles apply across a resolver instance, not one name; a dedicated resolver is part of agent isolation. Endpoint/context keys follow draft ENSIP-26; countersign policy records are application-specific. Historical drift reported 7/8 comparisons: the merchant-set aggregate is missing because the deployed contract uses a mapping, not a directly comparable set hash. Do not manufacture 8/8. Missing governance/name binding also prevents whole-passport VERIFIED. The optional persistent monitor fails closed for affected relayed requests; it does not block direct Whitechain calls that satisfy contract policy. ENS revocation and Whitechain epoch changes are separate, non-atomic operations. Fork interfaces compile, but deployed-state negative/revocation execution remains unverified in saved acceptance records.', ['packages/ens/src/','packages/ens/fork/Delegation.t.sol','docs/proof/A15-ens-onchain.md','docs/release/ENS-MONITOR.md','https://docs.ens.domains/ensv2/permissioned-resolver/'])

# 04 - Payment sequence with plain meaning.
start('AUTOMATIC PAYMENT','0.50 USDT: request → signature → receipt.','Example amount from recorded testnet payments. The current policy, not this illustration, decides execution.')
steps=[('01','Connect + configure','Owner selects agent, merchants,\nlimits, expiry and limited allowance.'),('02','Merchant quotes','HTTP 402 returns exact amount,\npayout, order and resource terms.'),('03','Agent signs','EIP-712 binds chain, contract,\nnonce, epoch and payment terms.'),('04','Relay preflight','Verify, simulate and reserve\nbounded GasGuard capacity.'),('05','Contract settles','Check policy + signature; transfer\nofficial USDT from owner to payout.'),('06','Observe + deliver','Confirmed event → receipt,\nwebhook and merchant response.')]
for i,(num,title,body) in enumerate(steps):
 x=65+(i%3)*501;y=242+(i//3)*250
 card(x,y,466,215,num,title,body,PALE if i in [2,4] else PAPER)
 if i%3<2:arrow(x+472,y+101,x+495,y+101)
rect(65,769,1468,56,INK,None,0);txt(87,779,1420,'Agent needs no USDT or WBT for this path. Relayer pays execution gas; treasury setup still costs gas.',26,WHITE)
note('Automatic payments occur below the configured humanThreshold, never above hard perTx/period caps. At or above the threshold the contract requires additional approval. PaymentIntent fields: mandateId, merchantId, payout, registryVersion, amount, orderId, resourceHash, nonce, epoch, deadline. EIP-712 domain is Countersign version 1, runtime chain ID and verifying Mandate. Token identity is immutable deployment state. Runtime token decimals are read rather than assuming six in general code. Chain 1874 official USDT: 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7. Mandate: 0x923298375911A173da34C715da2718c0c9889EbA. Registry: 0x2686f693A2C959568e650e0A5563E6244f2329E2. The deployed route uses approve + transferFrom; no successful permit/EIP-3009 flow or universal gasless onboarding is claimed. README at commit 5688b18 records the later 0.50 transfer linked below; this presentation pass could not freshly retrieve the RPC/explorer. Ledger persists transaction bytes/hash/nonce before broadcast; ambiguous submissions require reconciliation. One relayer signer/process and incomplete OP fee accounting remain limitations.', ['contracts/src/Mandate.sol','apps/api/src/relay-ledger.mjs','apps/api/src/gasguard.mjs','apps/api/src/observer.mjs','https://explorer.testnet.whitechain.io/tx/0x3b7fe78d21cf28f3fe883a04ed7617bba6a22f62889775da41ccd465c27009d9'])

# 05 - Human approval comic.
start('HUMAN CHECKPOINT','A login is not a payment approval.','World authenticates the session. The owner and attestor bind their signatures to the exact payment.')
pic('countersign-approval-comic.png',65,228,1468,500)
for x,num,title,body in [(65,'01','REVIEW','Exact amount, merchant and payout'),(563,'02','AUTHENTICATE','Fresh World sandbox login + binding'),(1061,'03','COUNTERSIGN','Owner approval + separate attestation')]:
 rect(x,618,472,111,PAPER,INK,3);txt(x+17,632,435,num+' / '+title,27,INK,True);txt(x+17,674,435,body,23)
rect(65,755,1468,70,INK,None,0);txt(88,767,1420,'1.50 USDT sandbox-approved payment is recorded. Denied, expired or mismatched attempts must fail.',26,WHITE)
note('Historical proof A2-world-approval records a 1.50-USDT payment after a World sandbox sign-in, owner signature and attestor signing; command order-40 used a configured 1.50 price and 1.00 threshold. World sandbox identities are mocked test identities, not production personhood. OIDC authorization-code flow uses PKCE S256, max_age=0, random state, browser binding and a nonce combining stored approval digest with fresh randomness. jose/JWKS validates ID-token signature, issuer/audience, nonce, timestamps, subject and configured assurance. world_ok is not permission to pay. The owner signs PaymentApproval binding intentDigest, mandate, merchant, payout, amount, epoch and deadline; ERC-1271 owners are supported. The separate attestor reads/recomputes stored digests and signs WorldAttestation, including authTime. Contract MAX_AUTH_AGE is 300 seconds; API approval/freshness window is at most 120 seconds and intent deadlines still apply. The onchain contract trusts the attestor for identity interpretation; it does not validate a World token itself. Session/origin-checked cancellation cannot erase exported signatures. Failed/denied/expired/wrong_human/stale_auth paths include local fixtures; preserve the separate historical live refusal records. The artwork is explanatory, not a phone screenshot or successful live demonstration.', ['apps/api/src/world-oidc.mjs','apps/api/src/approvals.mjs','apps/api/src/owner-signature.mjs','apps/attestor/','docs/proof/A2-world-approval.md','https://auth.world.org/docs/guides/step-up','https://explorer.testnet.whitechain.io/tx/0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531'])

# 06 - Attacks and precise limitations.
start('THE DEFENSE','Signed terms. Enforced limits. Explicit failures.','Local adversarial execution tests support these checks. Live evidence is narrower and separately labeled.')
attacks=[('AMOUNT / AGENT','Changed amount or wrong signer','BadIntentSig'),('PAYOUT / MERCHANT','Changed payout or registry version','RegistryMismatch'),('BUDGET','Per-payment or period cap exceeded','OverPerTx / OverPeriod'),('REPLAY','Consumed nonce or paid order','NonceUsed / AlreadyPaid'),('EPOCH','Old signature after included revoke','StaleEpoch'),('HUMAN CHECK','Missing owner or stale attestation','BadOwnerSig / StaleAuth')]
for i,(k,title,err) in enumerate(attacks):
 x=65+(i%3)*501;y=240+(i//3)*226
 panel(x,y,466,193,PAPER);badge(x+17,y+16,k,AMBER,430);txt(x+23,y+79,420,title,28,INK,True);txt(x+23,y+144,420,err,25,RED,True)
rect(65,721,1468,104,INK,None,0)
txt(88,736,1418,'Boundaries matter: ENS changes are not a kill switch. Pause/unpause can revive unused signatures.\nRefunds need merchant consent and funds. RPC observations are not cryptographic state proofs.',25,WHITE)
note('pay() checks mandate existence, pause, signed deadline, mandate expiry, epoch, consumed nonce, paid order, merchant allowlist, active registry payout/version, perTx/period bounds, agent signature and threshold approvals before state updates and transfer. nonReentrant and SafeERC20 protect token-call behavior. Spending counters persist across limit/agent/attestor changes and refunds. Revoke increments epoch: it invalidates old-epoch authorizations after inclusion, but a fresh signature by the still-authorized agent can execute. Pause does not increment epoch; an unused unexpired signature may revive on unpause. API-level GasGuard rejection is not an onchain revert; a simulated revert is not a mined transaction either. Not every test label represents unique coverage: inherited Solidity tests repeat. The current evidence verifier validates file integrity separately from receipt/calldata, token events and reconstructible historical policy under RPC trust; unsupported historical ERC-1271 or ambiguous same-block state remains UNVERIFIED. Threats not solved include compromised owner keys, misleading trusted display, malicious merchant delivery, backend/attestor collusion, threshold splitting within budget and deep-reorg consequences. No independent audit or formal proof is claimed.', ['contracts/src/Mandate.sol','contracts/test/AdversarialEdges.t.sol','contracts/test/MandateInvariant.t.sol','packages/ens/src/payment-evidence.mjs','docs/release/SECURITY-REVIEW.md','docs/ASSUMPTIONS_AND_LIMITATIONS.md'])

# 07 - Evidence, source and honest next action.
start('THE EVIDENCE','Inspect the proof. Keep the gaps visible.','A testnet systems-security implementation, not a production-readiness or prize guarantee.',True)
for x,n,label in [(65,'157','NODE TESTS • rerun this pass'),(566,'131','SOLIDITY EXECUTIONS • recorded'),(1067,'3','SHARED DIGEST VECTORS • recorded')]:
 rect(x,237,466,170,PAPER,None,0);txt(x+24,250,415,n,85,INK,True);txt(x+25,354,414,label,22,INK,True)
panel(65,447,710,298,PAPER);txt(89,466,660,'RECORDED / REPORTED',29,INK,True)
txt(89,518,660,'Whitechain: official-USDT payments\nWorld: sandbox approval-to-payment\nENS: registry, resolver and scoped grants\nHosting + 2:39 video: latest README record',29,INK)
panel(812,447,721,298,PAPER);txt(837,466,668,'STILL OPEN',29,RED,True)
txt(837,518,666,'ENS deployed-state negative/revoke tests\nBrowser: 35 passed / 5 failed; fixes pending rerun\nTwo historical demos remain 5/6 each\nResearch revision + independent review',27,INK)
txt(66,786,1460,'Explore the source → github.com/SomeshTalligeriDEV/ETHGLOBAL',31,MINT,True,link='https://github.com/SomeshTalligeriDEV/ETHGLOBAL')
note('Current presentation pass reran npm test: 157 passed, zero failed/skipped, log presentation/evidence/node-tests.txt. The 131 Solidity executions and three cross-language vectors are from preserved release logs, not newly rerun for this deck; Solidity count includes inherited repetitions and benchmark cases. Human browser production build passed at an earlier checkout; 35 browser fixtures passed and 5 failed, with source fixes awaiting rerun. ENS fork compilation is distinct from execution. Two historical six-step runs remain 5/6; later standalone payments do not retroactively finish those runs. Latest README at 5688b18 reports Cloudflare frontend https://countersign.someshtalligeri12.workers.dev and Render API https://countersign-api-44lz.onrender.com, a 2:39 video, and a later 0.50 payment. Endpoint retrieval failed in this pass, so current uptime/video playback is unverified. Render notes disclose ephemeral disk and API/attestor co-location; process separation is not strong key isolation. The user supplied https://zenodo.org/records/24025815, but this pass could not retrieve its metadata/PDF; do not invent a DOI, deposited version, license or peer review. A local revision gives Whitechain, World and ENS equal architectural/evaluation attention. Historical gas observations remain single-case local mock-token measurements, not network benchmarks. AI assisted code/research/artwork/deck generation; artwork is original illustrative output. Prior-code creation dates, contributor rights and submission eligibility remain human responsibilities. Next action: inspect contracts and transaction evidence, complete missing live/browser tests, review the balanced paper and verify the intended published version.', ['presentation/evidence/node-tests.txt','docs/evidence/final-video-checks/local/checks.json','docs/evidence/acceptance/20261107T000728602239Z/results.json','README.md','research/PUBLICATION-STATUS.md','https://github.com/SomeshTalligeriDEV/ETHGLOBAL','https://zenodo.org/records/24025815'])

# Render editable vector PDF and image previews from the same layout model.
def rgb(s):return tuple(int(s[i:i+2],16)/255 for i in (0,2,4))
doc=fitz.open()
for n,s in enumerate(slides,1):
 page=doc.new_page(width=W,height=H);page.insert_font(fontname='Deck',fontfile=FONT);page.insert_font(fontname='DeckBold',fontfile=BOLD)
 for o in s['objects']:
  k=o['kind']
  if k=='rect':page.draw_rect(fitz.Rect(o['x'],o['y'],o['x']+o['w'],o['y']+o['h']),color=rgb(o['stroke']) if o['stroke'] else None,fill=rgb(o['fill']) if o['fill'] else None,width=o['lw'])
  elif k=='poly':page.draw_polyline(o['points']+[o['points'][0]],color=rgb(o['stroke']) if o['stroke'] else None,fill=rgb(o['fill']),width=o['lw'])
  elif k=='line':page.draw_line((o['x'],o['y']),(o['x2'],o['y2']),color=rgb(o['color']),width=o['width'])
  elif k=='image':page.insert_image(fitz.Rect(o['x'],o['y'],o['x']+o['w'],o['y']+o['h']),filename=str(ROOT/o['path']),keep_proportion=False)
  elif k=='text':
   box=fitz.Rect(o['x'],o['y'],o['x']+o['w'],o['y']+o['h'])
   remaining=page.insert_textbox(box,o['text'],fontname='DeckBold' if o['bold'] else 'Deck',fontsize=o['size'],color=rgb(o['color']),lineheight=1.15)
   if remaining<0:raise ValueError(f"PDF text clipped on slide {n}: {o['text']} ({remaining})")
   if o['link']:page.insert_link({'kind':fitz.LINK_URI,'from':box,'uri':o['link']})
 page.get_pixmap(matrix=fitz.Matrix(.8,.8),alpha=False).save(ROOT/'previews'/f'slide-{n:02}.png')
doc.set_metadata({'title':'Countersign: Whitechain, World and ENSv2','author':'Somesh S. Talligeri','subject':'Seven-slide illustrated project explainer; evidence and limitations included','creator':'Countersign reproducible deck builder'})
doc.save(ROOT/'COUNTERSIGN-7-Slide-Comic-Deck.pdf',garbage=4,deflate=True)
(ROOT/'deck-layout.json').write_text(json.dumps(slides,ensure_ascii=False,indent=2))

# Native Office Open XML package. Images are raster; text/diagrams are editable.
NS='xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'
REL='http://schemas.openxmlformats.org/package/2006/relationships';OD='http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
EMU=7620
q=lambda x:str(round(x*EMU))
head='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
def relations(rows):return head+f'<Relationships xmlns="{REL}">'+''.join(f'<Relationship Id="{i}" Type="{OD+t}" Target="{escape(target)}"'+(' TargetMode="External"' if external else '')+'/>' for i,t,target,external in rows)+'</Relationships>'
group='<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
def fill(c):return f'<a:solidFill><a:srgbClr val="{c}"/></a:solidFill>' if c else '<a:noFill/>'
def shape(o,idx,rs,media):
 k=o['kind'];name=escape(o.get('text',k)[:90],{'"':'&quot;'})
 if k=='poly':
  pts=o['points'];x=min(t[0] for t in pts);y=min(t[1] for t in pts);w=max(t[0] for t in pts)-x;h=max(t[1] for t in pts)-y
 elif k=='line':x=min(o['x'],o['x2']);y=min(o['y'],o['y2']);w=max(abs(o['x2']-o['x']),.1);h=max(abs(o['y2']-o['y']),.1)
 else:x,y,w,h=(o[t] for t in ['x','y','w','h'])
 transform=f'<a:xfrm><a:off x="{q(x)}" y="{q(y)}"/><a:ext cx="{q(w)}" cy="{q(h)}"/></a:xfrm>'
 if k=='image':
  rid='rId'+str(len(rs)+1);rs.append((rid,'image','../media/'+Path(o['path']).name,False));media.add(o['path'])
  return f'<p:pic><p:nvPicPr><p:cNvPr id="{idx}" name="{name}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>{transform}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>'
 if k in ['poly','line']:
  points=pts if k=='poly' else [(o['x'],o['y']),(o['x2'],o['y2'])]
  path=f'<a:moveTo><a:pt x="{q(points[0][0]-x)}" y="{q(points[0][1]-y)}"/></a:moveTo>'+''.join(f'<a:lnTo><a:pt x="{q(px-x)}" y="{q(py-y)}"/></a:lnTo>' for px,py in points[1:])+('<a:close/>' if k=='poly' else '')
  geom=f'<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="{q(w)}" h="{q(h)}" fill="'+('norm' if k=='poly' else 'none')+f'">{path}</a:path></a:pathLst></a:custGeom>'
 else:geom='<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
 fc=o.get('fill') if k!='text' else None;sc=o.get('stroke') if k!='line' else o['color'];lw=o.get('lw',o.get('width',0))
 style=fill(fc)+f'<a:ln w="{q(lw)}">{fill(sc)}</a:ln>'
 body=''
 if k=='text':
  link=''
  if o['link']:
   rid='rId'+str(len(rs)+1);rs.append((rid,'hyperlink',o['link'],True));link=f'<a:hlinkClick r:id="{rid}"/>'
  paragraphs=[]
  for ln in o['text'].split('\n'):
   prop=f'lang="en-US" sz="{round(o["size"]*60)}" b="{int(o["bold"])}"'
   paragraphs.append(f'<a:p><a:pPr><a:lnSpc><a:spcPct val="115000"/></a:lnSpc><a:spcAft><a:spcPts val="0"/></a:spcAft></a:pPr><a:r><a:rPr {prop}>{fill(o["color"])}<a:latin typeface="Arial"/>{link}</a:rPr><a:t>{escape(ln)}</a:t></a:r><a:endParaRPr {prop}/></a:p>')
  body='<p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t"/><a:lstStyle/>'+''.join(paragraphs)+'</p:txBody>'
 return f'<p:sp><p:nvSpPr><p:cNvPr id="{idx}" name="{name}"/><p:cNvSpPr'+(' txBox="1"' if k=='text' else '')+f'/><p:nvPr/></p:nvSpPr><p:spPr>{transform}{geom}{style}</p:spPr>{body}</p:sp>'

package={};media=set();overrides=[]
def put(path,data,ctype=None):
 package[path]=data.encode() if isinstance(data,str) else data
 if ctype:overrides.append((path,ctype))
P='application/vnd.openxmlformats-officedocument.presentationml.'
put('_rels/.rels',relations([('rId1','officeDocument','ppt/presentation.xml',False)]))
rels=[('rId1','slideMaster','slideMasters/slideMaster1.xml',False),('rId2','notesMaster','notesMasters/notesMaster1.xml',False)]
for n,s in enumerate(slides,1):
 rs=[('rId1','slideLayout','../slideLayouts/slideLayout1.xml',False),('rId2','notesSlide',f'../notesSlides/notesSlide{n}.xml',False)]
 xml=''.join(shape(o,i+2,rs,media) for i,o in enumerate(s['objects']))
 put(f'ppt/slides/slide{n}.xml',head+f'<p:sld {NS}><p:cSld name="{escape(s["title"])}"><p:spTree>{group}{xml}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>',P+'slide+xml')
 put(f'ppt/slides/_rels/slide{n}.xml.rels',relations(rs));rels.append((f'rId{n+2}','slide',f'slides/slide{n}.xml',False))
 text=s['notes']+'\n\nSources:\n'+'\n'.join(s['sources'])
 body=''.join('<a:p><a:r><a:rPr lang="en-US" sz="1200"/><a:t>'+escape(line)+'</a:t></a:r></a:p>' for line in text.split('\n'))
 nt='<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide notes"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>'+body+'</p:txBody></p:sp>'
 put(f'ppt/notesSlides/notesSlide{n}.xml',head+f'<p:notes {NS}><p:cSld><p:spTree>{group}{nt}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>',P+'notesSlide+xml')
 put(f'ppt/notesSlides/_rels/notesSlide{n}.xml.rels',relations([('rId1','notesMaster','../notesMasters/notesMaster1.xml',False),('rId2','slide',f'../slides/slide{n}.xml',False)]))
put('ppt/presentation.xml',head+f'<p:presentation {NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:notesMasterIdLst><p:notesMasterId r:id="rId2"/></p:notesMasterIdLst><p:sldIdLst>'+''.join(f'<p:sldId id="{255+n}" r:id="rId{n+2}"/>' for n in range(1,8))+f'</p:sldIdLst><p:sldSz cx="{q(W)}" cy="{q(H)}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>',P+'presentation.main+xml')
put('ppt/_rels/presentation.xml.rels',relations(rels))
clr='<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>'
put('ppt/slideMasters/slideMaster1.xml',head+f'<p:sldMaster {NS}><p:cSld><p:spTree>{group}</p:spTree></p:cSld>{clr}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>',P+'slideMaster+xml')
put('ppt/slideMasters/_rels/slideMaster1.xml.rels',relations([('rId1','slideLayout','../slideLayouts/slideLayout1.xml',False),('rId2','theme','../theme/theme1.xml',False)]))
put('ppt/slideLayouts/slideLayout1.xml',head+f'<p:sldLayout {NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>{group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>',P+'slideLayout+xml')
put('ppt/slideLayouts/_rels/slideLayout1.xml.rels',relations([('rId1','slideMaster','../slideMasters/slideMaster1.xml',False)]))
put('ppt/notesMasters/notesMaster1.xml',head+f'<p:notesMaster {NS}><p:cSld><p:spTree>{group}</p:spTree></p:cSld>{clr}<p:notesStyle/></p:notesMaster>',P+'notesMaster+xml')
put('ppt/notesMasters/_rels/notesMaster1.xml.rels',relations([('rId1','theme','../theme/theme1.xml',False)]))
colors={'dk1':INK,'lt1':WHITE,'dk2':MUTED,'lt2':PAPER,'accent1':MINT,'accent2':AMBER,'accent3':RED,'accent4':'6385A0','accent5':'8DB7A8','accent6':'9D8870','hlink':'007B67','folHlink':'586C87'}
clrs=''.join(f'<a:{k}><a:srgbClr val="{v}"/></a:{k}>' for k,v in colors.items())
styles='<a:fillStyleLst>'+fill(MINT)*3+'</a:fillStyleLst><a:lnStyleLst>'+''.join(f'<a:ln w="{x}">{fill(INK)}<a:prstDash val="solid"/></a:ln>' for x in [9525,25400,38100])+'</a:lnStyleLst><a:effectStyleLst>'+'<a:effectStyle><a:effectLst/></a:effectStyle>'*3+'</a:effectStyleLst><a:bgFillStyleLst>'+fill(PAPER)*3+'</a:bgFillStyleLst>'
put('ppt/theme/theme1.xml',head+f'<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Countersign Ink and Mint"><a:themeElements><a:clrScheme name="Countersign">{clrs}</a:clrScheme><a:fontScheme name="Arial"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Countersign">{styles}</a:fmtScheme></a:themeElements></a:theme>','application/vnd.openxmlformats-officedocument.theme+xml')
for path in media:put('ppt/media/'+Path(path).name,(ROOT/path).read_bytes())
ct=head+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>'+''.join(f'<Override PartName="/{path}" ContentType="{kind}"/>' for path,kind in overrides)+'</Types>'
put('[Content_Types].xml',ct)
with zipfile.ZipFile(ROOT/'COUNTERSIGN-7-Slide-Comic-Deck.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for path,data in package.items():z.writestr(path,data)
notes='# Countersign: seven-slide reader and speaker notes\n\nIllustrations are explanatory, not screenshots. Public links are reported separately from fresh verification.\n\n'
for i,s in enumerate(slides,1):notes+=f'## {i}. {s["title"]}\n\n{s["notes"]}\n\nSources:\n\n'+''.join(f'- {a}\n' for a in s['sources'])+'\n'
(ROOT/'SPEAKER-NOTES.md').write_text(notes)
content=''.join(f'<section class="slide" id="s{i}"><img src="previews/slide-{i:02}.png" alt="Slide {i}: {html.escape(s["title"])}"><details><summary>Read explanation and evidence</summary><p>{html.escape(s["notes"])}</p><ul>'+''.join(f'<li>{html.escape(a)}</li>' for a in s['sources'])+'</ul></details></section>' for i,s in enumerate(slides,1))
htmlpage='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Countersign | Seven illustrated chapters</title><style>:root{--c-bg:#111b26;--c-text:#f7f1e4;--c-primary:#39d8ae;--c-bg-card:#1b2933;--font-display:Arial,sans-serif}*{box-sizing:border-box}body{background:var(--c-bg);color:var(--c-text);font:18px/1.6 var(--font-display);margin:0}nav{position:sticky;top:0;display:flex;justify-content:space-between;background:#111b26f5;padding:14px 3%;z-index:2}a{color:var(--c-primary)}.slide{max-width:1400px;margin:28px auto}.slide img{width:100%;height:auto;display:block;border:1px solid #59635f}details{background:var(--c-bg-card);padding:18px 28px}summary{cursor:pointer;color:var(--c-primary)}p{max-width:95ch}li{overflow-wrap:anywhere}@media print{nav,details{display:none}.slide{break-after:page;margin:0}body{background:white}}@media(prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}</style><nav><strong>COUNTERSIGN / 7 CHAPTERS</strong><span><a href="COUNTERSIGN-7-Slide-Comic-Deck.pptx">PowerPoint</a> · <a href="COUNTERSIGN-7-Slide-Comic-Deck.pdf">PDF</a></span></nav>'''+content+'''<script>document.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft'].includes(e.key))return;const slides=[...document.querySelectorAll('.slide')];let i=slides.findIndex(s=>s.getBoundingClientRect().bottom>120);i=Math.max(0,Math.min(slides.length-1,i+(e.key==='ArrowRight'?1:-1)));slides[i].scrollIntoView()})</script></html>'''
(ROOT/'index.html').write_text(htmlpage)
print('Built',len(slides),'slides: PPTX + PDF + HTML + notes.')
