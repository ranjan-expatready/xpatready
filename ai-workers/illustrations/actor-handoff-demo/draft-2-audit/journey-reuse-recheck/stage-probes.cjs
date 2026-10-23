const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),out={run:new Date().toISOString(),stages:[]};
 for(const width of [1280,1440]){
  const ctx=await browser.newContext({viewport:{width,height:950}}),p=await ctx.newPage();
  await p.goto('file://'+path.join(__dirname,'solution-1-one-pager.html'));
  await p.waitForSelector('body[data-ready="true"]');
  for(const stage of ['st-3','st-5','st-6','st-9','st-12']){
   await p.evaluate(()=>S1.close());
   const eye=p.locator('#'+stage+' .seye');await eye.scrollIntoViewIfNeeded();await eye.click();
   const r=await p.evaluate(stage=>{
    const card=document.getElementById(stage),eye=card.querySelector('.seye'),insp=document.getElementById('insp');
    const c=card.getBoundingClientRect(),e=eye.getBoundingClientRect(),i=insp.getBoundingClientRect();
    const hit=document.elementFromPoint(e.left+e.width/2,e.top+e.height/2);
    return {stage,card:{left:c.left,right:c.right,top:c.top,bottom:c.bottom},panel:{left:i.left,right:i.right},
     eyeCovered:insp.contains(hit),horizontalOverlap:Math.max(0,Math.min(c.right,i.right)-Math.max(c.left,i.left)),
     panelSide:insp.classList.contains('left')?'left':'right'};
   },stage);out.stages.push({width,...r});
   if(stage==='st-3'||stage==='st-5')await p.screenshot({path:path.join(__dirname,`${width}-${stage}-open.png`)});
  }
  await ctx.close();
 }
 await browser.close();fs.writeFileSync(path.join(__dirname,'stage-observations.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
