const path=require('node:path');const fs=require('node:fs');const {chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
await p.goto('file://'+path.join(__dirname,'current-f351d479','solution-1-one-pager.html'));await p.waitForSelector('body[data-ready="true"]');
await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
const t=await p.evaluate(()=>{const tpl=[...document.querySelectorAll('template')].map(x=>x.content.textContent).join('\n');const svg=[...document.querySelectorAll('svg text')].map(x=>x.textContent).join(' | ');return document.body.innerText+'\n'+tpl+'\n'+svg;});
fs.writeFileSync(path.join(__dirname,'rendered-text-f351d479.txt'),t);
for(const w of ['release','Release','package','Package','message','specialist','Specialist','master','copies','Copy','copy ','confirmed','Pathway Configurator','licensed representative','Licensed representative','inbox','report to support']){const re=new RegExp('.{0,50}'+w+'.{0,40}','g');const m=t.match(re)||[];console.log(`[${w}] ${m.length}`,JSON.stringify(m.slice(0,4)));}
await b.close();})();
