const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const BASE=path.resolve(__dirname,'..'),PAGE='file://'+path.join(BASE,'inputs/solution-1-one-pager.html'),OUT=path.join(BASE,'screenshots');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const results=[];
for(const w of [1280,1440,1920])for(const scheme of ['light','dark']){
 const c=await b.newContext({viewport:{width:w,height:1000},colorScheme:scheme});const p=await c.newPage();await p.goto(PAGE);await p.waitForSelector('body[data-ready="true"]');
 await p.screenshot({path:path.join(OUT,`${w}-${scheme}-top.png`)});
 const targets=['.stagestrip','.band-setup','.band-case','.band-change','#records','#controls','#evidence'];
 if(w===1440&&scheme==='light')targets.push('#who',...Array.from({length:7},(_,i)=>'#view-v'+(i+1)),'.techov');
 for(const sel of targets){const loc=p.locator(sel).first();if(!await loc.count())continue;await loc.evaluate(e=>{let n=e;while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement;}});await loc.scrollIntoViewIfNeeded();const name=sel.replace(/^[.#]/,'');await loc.screenshot({path:path.join(OUT,`${w}-${scheme}-${name}.png`)});}
 const geom=await p.evaluate(()=>{
  const R=e=>{let r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
  const cards=[...document.querySelectorAll('.mnode')].map(e=>({id:e.id,rect:R(e),sections:[...e.querySelectorAll('header,.mwho,.msec,.mgate,.mctl')].map(s=>({cls:s.className,text:s.innerText.slice(0,90),rect:R(s)}))}));
  const tables=[...document.querySelectorAll('main table,.blk table')].filter(e=>e.offsetParent!==null).map(e=>({section:e.closest('section')?.id,rect:R(e),cells:[...e.querySelectorAll('th,td')].filter(x=>x.scrollWidth>x.clientWidth+2).map(x=>({text:x.innerText.slice(0,100),w:x.clientWidth,sw:x.scrollWidth}))}));
  const empty=[...document.querySelectorAll('li')].filter(x=>x.getClientRects().length&&!x.innerText.trim()).map(x=>({html:x.outerHTML.slice(0,250),rect:R(x)}));
  const flows=[...document.querySelectorAll('.marr,.mwrap,.mrail')].map(e=>({cls:e.className,text:e.innerText,rect:R(e)}));
  return {pageWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,cards,tables,emptyListItems:empty,flows};
 });
 results.push({width:w,scheme,...geom});
 if(w===1440&&scheme==='light'){
  for(const id of ['st-3','3.2','7.1','9.6','st-9']){await p.evaluate(()=>S1.close());const selector=id.startsWith('st-')?`button[data-card="${id}"]`:`.eye[data-act="${id}"]`;const el=p.locator(selector).first();await el.scrollIntoViewIfNeeded();await el.click();await p.locator('#insp .body').evaluate(e=>e.scrollTop=0);await p.screenshot({path:path.join(OUT,`1440-light-open-${id}.png`)});}
 }
 await c.close();}
await b.close();fs.writeFileSync(path.join(__dirname,'desktop-geometry.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(x=>({width:x.width,scheme:x.scheme,empty:x.emptyListItems.length,overflow:x.tables.map(t=>({section:t.section,overflow:t.cells.length})),pageHeight:x.pageHeight}))));})();
