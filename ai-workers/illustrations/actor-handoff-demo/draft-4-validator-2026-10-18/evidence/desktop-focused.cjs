const fs=require('node:fs'),path=require('node:path');const{chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const BASE=path.resolve(__dirname,'..'),PAGE='file://'+path.join(BASE,'inputs/solution-1-one-pager.html');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const c=await b.newContext({viewport:{width:1440,height:1000}}),p=await c.newPage();await p.goto(PAGE);await p.waitForSelector('body[data-ready="true"]');
const data=await p.evaluate(()=>{
 const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
 const vis=e=>{const s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('template,details:not([open])');};
 const empty=[...document.querySelectorAll('li')].filter(e=>vis(e)&&!e.textContent.trim()).map(e=>({html:e.outerHTML,rect:rect(e)}));
 const terms=[...document.querySelectorAll('.terms dl,.terms .term,.terms')].map(e=>({cls:e.className,rect:rect(e),text:e.innerText.slice(0,100)}));
 const setup=[...document.querySelectorAll('.band-setup .mnode')].map(e=>({id:e.id,rect:rect(e),labels:[...e.querySelectorAll('.mlab')].map(x=>({text:x.textContent,rect:rect(x)}))}));
 return{emptyVisibleListItems:empty,terms,setup,mainWidth:document.querySelector('main').getBoundingClientRect().width};});
// Neutralize the sticky nav only for section captures; this does not test or change navigation behaviour.
await p.addStyleTag({content:'.nav{position:static!important}'});
for(const sel of ['.band-case','#view-v3','#view-v5','.techov']){let el=p.locator(sel).first();await el.evaluate(e=>{let n=e;while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement;}});await el.screenshot({path:path.join(BASE,'screenshots','1440-light-clean-'+sel.replace(/^[.#]/,'')+'.png')});}
// Assert the two new language/hold contradictions from the actual rendered templates.
const probes=await p.evaluate(()=>{const t=id=>document.getElementById('tpl-'+id).content.textContent.replace(/\s+/g,' ');const a=t('9.3'),hist=t('4.3');return{approvalSaysAllAmber:a.includes('acknowledges every amber'),approvalAlsoSaysAdvisoryListedOnly:a.includes('Advisory items are listed only'),historicalHoldDeferredUntilConfirmed:hist.includes('once confirmed, the mapping and its dependent work are held')};});
fs.writeFileSync(path.join(__dirname,'desktop-focused.json'),JSON.stringify({data,probes},null,2));console.log(JSON.stringify({emptyVisibleListItems:data.emptyVisibleListItems,probes}));await b.close();})();
