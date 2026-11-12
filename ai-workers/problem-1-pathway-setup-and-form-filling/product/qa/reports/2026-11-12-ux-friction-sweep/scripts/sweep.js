const {chromium}=require("playwright");(async()=>{const b=await chromium.connectOverCDP("http://localhost:9333");const p=b.contexts()[0].pages().find(x=>!x.url().startsWith("devtools"));
const B="http://localhost:4472", VV="/cases/1e4b7974-8824-4727-be5f-7e69052b6f3b", SPC="/cases/eabf10aa-7acb-441d-b6be-24b05613c96f";
const list=[["Configuration author","/", "s01-programs"],["Configuration author","/c/22a8e7e6-70bb-4e6b-a4e4-7b90c2daaddc","s02-vv-overview"],["Configuration author","/c/22a8e7e6-70bb-4e6b-a4e4-7b90c2daaddc/documents","s03-vv-documents"],["Configuration author","/c/22a8e7e6-70bb-4e6b-a4e4-7b90c2daaddc/review","s04-vv-review-tab"],["Approver","/release","s05-release"],["Case officer","/cases","s06-cases"],["Case officer",VV,"s07-vv-case"],["Case officer",SPC,"s08-sp-case"],["Representative",VV+"/representative-review/52e576f7-e7a5-4bc1-9a5f-52b6697cdddf","s09-rep-review"],["Client A",SPC+"/questionnaire","s10-client-tasks"],["Client A",SPC+"/questionnaire?part=1","s11-client-part1"]];
await p.setViewportSize({width:375,height:812});
for(const [who,url,shot] of list){
  const sel=p.locator("header select"); if(await sel.count()){ const cur=await sel.evaluate(s=>s.options[s.selectedIndex].text); if(cur!==who){ await sel.selectOption({label:who}).catch(()=>{}); await p.waitForTimeout(1500);} }
  await p.goto(B+url); await p.waitForTimeout(3500);
  const r=await p.evaluate(()=>{const d=document.documentElement; const w=d.clientWidth; const off=[...document.querySelectorAll("main *")].filter(e=>{const r=e.getBoundingClientRect();return r.right>w+2&&r.width>0}).filter(e=>{let q=e.parentElement; while(q){const s=getComputedStyle(q); if(/auto|scroll|hidden/.test(s.overflowX)) return false; q=q.parentElement;} return true}).slice(0,4).map(e=>e.tagName+" '"+(e.innerText||"").slice(0,40).replace(/\s+/g," ")+"' right="+Math.round(e.getBoundingClientRect().right));
   const small=[...document.querySelectorAll("main button, main a")].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&(r.height<24||r.width<24)}).length;
   const pick=document.querySelector("header select"); const pw=pick?Math.round(pick.getBoundingClientRect().width):0;
   return {scrollW:d.scrollWidth,clientW:w,off,smallTargets:small,pickerW:pw,h1:document.querySelector("h1")?.innerText?.slice(0,50)}});
  console.log(shot, who, JSON.stringify(r));
  await p.screenshot({path:process.env.SP+"/walk/shots/"+shot+"-375.png"});
}
await p.setViewportSize({width:1440,height:1000}); process.exit(0)})()
