const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true}),c=await b.newContext({viewport:{width:1440,height:950}}),p=await c.newPage();
 await p.goto('file://'+path.join(__dirname,'solution-1-one-pager.html'));await p.waitForSelector('body[data-ready="true"]');
 await p.locator('button[data-card="st-A"]').first().click();
 const parent=await p.locator('#insp h2').textContent();
 await p.locator('#insp .fl-link[data-act="6.1"]').click();
 const out=await p.evaluate(()=>({child:document.querySelector('#insp h2').textContent,hash:location.hash,buttons:[...document.querySelectorAll('#insp button')].map(x=>x.textContent.trim()),links:[...document.querySelectorAll('#insp a')].map(x=>x.textContent.trim()),width:document.querySelector('#insp').getBoundingClientRect().width,bodyHeight:document.querySelector('#insp .body').clientHeight}));
 out.parent=parent;out.explicitBackVisible=out.buttons.concat(out.links).some(x=>/back|return to|new client/i.test(x));
 await p.keyboard.press('Escape');out.closeFocus=await p.evaluate(()=>({card:document.activeElement.dataset.card||null,act:document.activeElement.dataset.act||null}));
 fs.writeFileSync(path.join(__dirname,'navigation-observations.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
 await c.close();await b.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
