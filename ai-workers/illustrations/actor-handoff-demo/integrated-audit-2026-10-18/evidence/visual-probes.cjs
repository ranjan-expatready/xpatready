const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const OUT=path.join(__dirname,'../screenshots'),PAGE='file://'+path.join(__dirname,'../inputs/solution-1-one-pager.html');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),observations=[];
 for(const width of [1440,1280,768,375])for(const scheme of ['light','dark']){
  const ctx=await browser.newContext({viewport:{width,height:950},colorScheme:scheme,isMobile:width<600,hasTouch:width<1000});
  const p=await ctx.newPage();await p.goto(PAGE);await p.waitForSelector('body[data-ready="true"]');
  await p.screenshot({path:path.join(OUT,`${width}-${scheme}-top.png`)});
  const sections=width===1440&&scheme==='light'?['#overview','#records','#view-ov',...Array.from({length:7},(_,i)=>'#view-v'+(i+1))]:['#overview','#records'];
  for(const selector of sections){
   const el=p.locator(selector);if(!await el.count())continue;
   await el.evaluate(e=>{let a=e;while(a){if(a.tagName==='DETAILS')a.open=true;a=a.parentElement;}});
   await el.scrollIntoViewIfNeeded();await el.screenshot({path:path.join(OUT,`${width}-${scheme}-${selector.slice(1)}.png`)});
  }
  const r=await p.evaluate(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
   const cells=[...document.querySelectorAll('#records th,#records td')].map(e=>({text:e.innerText.slice(0,110),client:e.clientWidth,scroll:e.scrollWidth,rect:rect(e)}));
   const headings=[...document.querySelectorAll('main h2, main h3, #overview h2')].slice(0,25).map(e=>({text:e.textContent,rect:rect(e)}));
   return {pageWidth:innerWidth,bodyScrollWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,recordsOverflow:cells.filter(e=>e.scroll>e.client+2),recordsHeight:document.querySelector('#records')?.getBoundingClientRect().height,headings};
  });
  observations.push({width,scheme,...r});await ctx.close();
 }
 // Every stage at common desktop widths: selected item must stay visible beside the panel.
 const occlusion=[];
 for(const width of [1000,1100,1280,1440,1760,1920]){
  const ctx=await browser.newContext({viewport:{width,height:950}}),p=await ctx.newPage();await p.goto(PAGE);await p.waitForSelector('body[data-ready="true"]');
  const ids=await p.locator('.mnode:has(.det)').evaluateAll(es=>es.map(e=>e.id));const bad=[];
  for(const id of ids){
   await p.locator('#'+id+' .det').scrollIntoViewIfNeeded();await p.locator('#'+id+' .det').click();
   const r=await p.evaluate(id=>{const a=document.getElementById(id).getBoundingClientRect(),b=document.getElementById('insp').getBoundingClientRect();return {horizontal:Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left)),vertical:Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))};},id);
   if(r.horizontal>1&&r.vertical>1)bad.push({id,...r});await p.keyboard.press('Escape');
  }
  occlusion.push({width,checked:ids.length,bad});await ctx.close();
 }
 await browser.close();fs.writeFileSync(path.join(__dirname,'visual-observations.json'),JSON.stringify({observations,occlusion},null,2));
 console.log(JSON.stringify({records:observations.map(x=>({width:x.width,scheme:x.scheme,overflow:x.recordsOverflow.length,height:x.recordsHeight,pageHeight:x.pageHeight})),occlusion}));
})().catch(e=>{console.error(e);process.exitCode=1;});
