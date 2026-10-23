const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true}), out={};
 const file='file://'+path.join(__dirname,'inputs/ai-workers/problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html');
 const c=await b.newContext({viewport:{width:1440,height:950}}),p=await c.newPage();await p.goto(file);await p.waitForSelector('body[data-ready="true"]');
 out.diagramLabelClipping=await p.evaluate(()=>[...document.querySelectorAll('.dg')].flatMap(d=>{
  const db=d.getBoundingClientRect();return [...d.querySelectorAll('svg text')].map(t=>{const r=t.getBoundingClientRect();return {view:d.id,text:t.textContent,left:Math.round(r.left-db.left),right:Math.round(r.right-db.left),top:Math.round(r.top-db.top),bottom:Math.round(r.bottom-db.top),width:db.width,height:db.height};}).filter(t=>t.left<0||t.right>t.width+1||t.top<0||t.bottom>t.height+1);
 }));
 await p.setViewportSize({width:375,height:950});await p.reload();await p.waitForSelector('body[data-ready="true"]');
 await p.locator('#view-v5 .fl-open[data-act="8.4"]').scrollIntoViewIfNeeded();await p.locator('#view-v5 .fl-open[data-act="8.4"]').click();
 await p.locator('.nav select').click();
 out.phoneBackgroundClick=await p.evaluate(()=>({inspectorOpen:!document.querySelector('#insp').hidden,activeTag:document.activeElement.tagName,activeInsideDialog:document.querySelector('#insp').contains(document.activeElement)}));
 await c.close();await b.close();fs.writeFileSync(path.join(__dirname,'followup-observations.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
