const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const E=__dirname, OUT=path.join(E,'visuals'), PAGE='file://'+path.join(E,'../inputs-4.2/solution-1-one-pager.html');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});let metrics=[];
for(const w of [960,1280,1440,1920])for(const theme of ['light','dark']){
 const c=await b.newContext({viewport:{width:w,height:1000},colorScheme:theme}),p=await c.newPage();await p.goto(PAGE);await p.waitForSelector('body[data-ready="true"]');
 await p.screenshot({path:path.join(OUT,`${w}-${theme}-top.png`)});
 // Remove sticky positioning for section images only, after interaction tests have run separately.
 await p.addStyleTag({content:'.nav{position:static!important}'});
 for(const [id,sel] of [['setup','.band-setup'],['case','.band-case'],['change','.band-change'],['records','#records']]){
   const l=p.locator(sel).first();if(await l.count())await l.screenshot({path:path.join(OUT,`${w}-${theme}-${id}.png`)});
 }
 const tables=await p.evaluate(()=>[...document.querySelectorAll('td,th')].filter(e=>e.offsetParent&&e.scrollWidth>e.clientWidth+2).map(e=>({text:e.textContent.slice(0,90),sw:e.scrollWidth,cw:e.clientWidth})));
 metrics.push({w,theme,overflowingCells:tables});
 if(w===1440&&theme==='light')for(const v of ['v0','v1','v2','v3','v4','v5','v6','v7']){
   let l=p.locator(v==='v0'?'.techov':'#view-'+v).first();await l.evaluate(e=>{for(let n=e;n;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true});
   await l.screenshot({path:path.join(OUT,`1440-light-${v}.png`)});
 }
 for(const stage of ['st-6','st-8']){
   await p.evaluate(()=>S1.close());const l=p.locator(`button[data-card="${stage}"]`).first();await l.scrollIntoViewIfNeeded();await l.click();
   await p.screenshot({path:path.join(OUT,`${w}-${theme}-${stage}.png`)});
   const r=await p.evaluate(id=>{let a=document.getElementById(id),i=document.getElementById('insp'),r=a.getBoundingClientRect(),z=i.getBoundingClientRect();return {stage:id,paneWidth:z.width,paneLeft:z.left,stageRect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},paneRect:{left:z.left,right:z.right,top:z.top,bottom:z.bottom},horizontalOverlap:Math.max(0,Math.min(r.right,z.right)-Math.max(r.left,z.left))}},stage);metrics.push({w,theme,...r});
   await p.keyboard.press('Escape');
 }
 await c.close();
}
await b.close();fs.writeFileSync(path.join(E,'visual-metrics.json'),JSON.stringify(metrics,null,2));console.log('Desktop visual captures complete');})().catch(e=>{console.error(e);process.exitCode=1});
