const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true}),p=await (await b.newContext({viewport:{width:1440,height:950}})).newPage();
 await p.goto('file://'+path.join(__dirname,'../inputs/solution-1-one-pager.html'));await p.waitForSelector('body[data-ready="true"]');
 const r=await p.evaluate(()=>{
  const D=JSON.parse(document.getElementById('dg-data').textContent);
  return {mainText:document.querySelector('main').innerText,sections:[...document.querySelectorAll('main > section')].map(x=>({id:x.id,text:x.innerText})),
   maps:[...document.querySelectorAll('.band')].map(x=>({class:x.className,rows:[...x.querySelectorAll('.mgrid')].map(g=>({height:g.getBoundingClientRect().height,cards:[...g.querySelectorAll('.mnode')].map(c=>({id:c.id,h:c.getBoundingClientRect().height,w:c.getBoundingClientRect().width,words:c.innerText.split(/\s+/).length}))}))})),
   acts:Object.entries(D.acts).map(([id,x])=>({id,...x})),diagrams:Object.keys(D.views)};
 });
 fs.writeFileSync(path.join(__dirname,'semantic-observations.json'),JSON.stringify(r,null,2));
 fs.writeFileSync(path.join(__dirname,'main-content.md'),r.sections.map(x=>'## '+x.id+'\n'+x.text).join('\n\n'));
 // A tooltip that follows a page after its target has scrolled away hides other text.
 const el=p.locator('#dg-v7 [data-element-id="S7"]');await el.scrollIntoViewIfNeeded();const box=await el.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.waitForTimeout(250);
 const tip=()=>p.evaluate(()=>({shown:!document.getElementById('tip').hidden,text:document.getElementById('tip').innerText.slice(0,150)}));const hovered=await tip();await p.mouse.wheel(0,-2500);await p.waitForTimeout(250);const scrolled=await tip();
 fs.writeFileSync(path.join(__dirname,'tooltip-observation.json'),JSON.stringify({hovered,scrolled},null,2));
 console.log(JSON.stringify({sections:r.sections.map(x=>({id:x.id,words:x.text.split(/\s+/).length})),maps:r.maps,tooltip:{hovered,scrolled}}));await b.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
