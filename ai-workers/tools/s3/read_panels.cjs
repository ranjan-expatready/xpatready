// Reads every distinct detail panel of the one-pager (adapted from the integrated audit's read-panels.cjs for the draft 4 cohesion pass).
// Run: node tools/s3/read_panels.cjs. Writes checks/one-pager-draft-4-panels/{panels.json,all-panels.md} and a few screenshots.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const OUTD=path.join(__dirname,'../../checks/one-pager-draft-4-panels');
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true});
 const ctx=await b.newContext({viewport:{width:1440,height:950}}),p=await ctx.newPage();
 const out={run:new Date().toISOString(),panels:[],failures:[]};
 await p.goto('file://'+path.join(__dirname,'../../problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html'));await p.waitForSelector('body[data-ready="true"]');
 const ids=await p.evaluate(()=>{const d=JSON.parse(document.querySelector('#dg-data').textContent);return [...Object.keys(d.acts).map(id=>({id,kind:'activity'})),...Object.keys(d.cards).map(id=>({id,kind:'other'}))];});
 for(const entry of ids){
  const oldExample=p.locator('#insp .ex-btn');
  if(await oldExample.count()&&(await oldExample.getAttribute('aria-expanded'))==='true')await oldExample.click();
  await p.evaluate(()=>S1.close());
  const selector=entry.kind==='activity'?'.eye[data-act="'+entry.id+'"]':'button[data-card="'+entry.id+'"]';
  const loc=p.locator(selector).first();
  try{
   await loc.evaluate(el=>{let a=el.parentElement;while(a){if(a.tagName==='DETAILS')a.open=true;a=a.parentElement;}});
   await loc.scrollIntoViewIfNeeded();await loc.click({timeout:5000});
   const panel=await p.evaluate(()=>{
    const el=document.querySelector('#insp'),bod=el.querySelector('.body');
    const defaultVisible=bod.innerText;
    const details=[...bod.querySelectorAll('details')].map(d=>({heading:d.querySelector('summary').textContent,open:d.open,text:d.textContent.trim()}));
    const pairs=[...bod.querySelectorAll('.ten dt')].map(dt=>({label:dt.textContent,value:dt.nextElementSibling.textContent}));
    return {title:el.querySelector('h2').textContent,defaultVisible,defaultWords:defaultVisible.trim().split(/\s+/).length,pairs,details,
      human:bod.querySelector('.human')?.textContent||null,io:[...bod.querySelectorAll('.io li')].map(li=>li.textContent),
      bodyHeight:bod.clientHeight,scrollHeight:bod.scrollHeight,hash:location.hash};
   });
   await p.locator('#insp details').evaluateAll(ds=>ds.forEach(d=>d.open=true));
   const example=p.locator('#insp .ex-btn');if(await example.count()&&(await example.getAttribute('aria-expanded'))!=='true')await example.click();
   panel.full=await p.locator('#insp .body').innerText();
   panel.fullWords=panel.full.trim().split(/\s+/).length;
   panel.examples=await p.locator('#insp .example').allTextContents();
   out.panels.push({...entry,...panel});
   if(['st-A','st-3','st-5','3.2','5.1','7.1','8.3','9.3','9.4','9.5','10.2'].includes(entry.id)){
    await p.locator('#insp .body').evaluate(el=>el.scrollTop=0);
    await p.screenshot({path:path.join(OUTD,'panel-'+entry.id+'.png')});
   }
  }catch(e){out.failures.push({...entry,error:e.message});}
 }
 await ctx.close();await b.close();
 fs.writeFileSync(path.join(OUTD,'panels.json'),JSON.stringify(out,null,2));
 fs.writeFileSync(path.join(OUTD,'all-panels.md'),out.panels.map(x=>'## '+x.id+' — '+x.title+'\n\n'+x.full+'\n').join('\n'));
 console.log(JSON.stringify({count:out.panels.length,failures:out.failures,words:out.panels.reduce((s,x)=>s+x.fullWords,0),panels:out.panels.map(x=>({id:x.id,title:x.title,defaultWords:x.defaultWords,fullWords:x.fullWords,defaultHeight:x.scrollHeight}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
