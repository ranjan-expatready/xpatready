const path=require('node:path');const {chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const p=await (await b.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true})).newPage();
await p.goto('file://'+path.join(__dirname,'current-f351d479','solution-1-one-pager.html'));await p.waitForSelector('body[data-ready="true"]');
const res=await p.evaluate(()=>{
  const out=[];
  for(const t of document.querySelectorAll('main table')){
    if(!t.offsetParent) continue;
    let scroller=null;
    for(let e=t.parentElement;e&&e!==document.body;e=e.parentElement){const o=getComputedStyle(e).overflowX;if(o!=='visible'){scroller={tag:e.tagName,cls:e.className,o:o,sw:e.scrollWidth,cw:e.clientWidth};break;}}
    const cells=[...t.querySelectorAll('tbody td, tbody th')];const over=cells.filter(c=>c.scrollWidth>c.clientWidth+1).length;
    out.push({sec:(t.closest('section')||{}).id,cls:t.className,tw:Math.round(t.getBoundingClientRect().width),scroller:scroller,cellsOverflowing:over});
  }
  return out;});
console.log(JSON.stringify(res));
await b.close();})();
