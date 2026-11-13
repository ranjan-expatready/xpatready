// node ov.js <width>: report horizontal overflow and elements wider than viewport
const {chromium}=require("playwright");(async()=>{const b=await chromium.connectOverCDP("http://localhost:9333");const p=b.contexts()[0].pages().find(x=>!x.url().startsWith("devtools"));
const w=+process.argv[2]; await p.setViewportSize({width:w,height:812}); await p.waitForTimeout(700);
const r=await p.evaluate((w)=>{const d=document.documentElement; const out=[...document.querySelectorAll("body *")].filter(e=>{const r=e.getBoundingClientRect();return r.right>w+1&&r.width>0&&getComputedStyle(e).position!=="fixed"}).filter(e=>!e.closest("[style*=overflow],.overflow-x-auto,.overflow-auto")).slice(0,8).map(e=>e.tagName+"."+String(e.className).slice(0,40)+" r="+Math.round(e.getBoundingClientRect().right)+" '"+(e.innerText||"").slice(0,40).replace(/\s+/g," ")+"'");return {scrollW:d.scrollWidth,clientW:d.clientWidth,out}},w);
console.log(JSON.stringify(r,null,1));
if(process.argv[3]) await p.screenshot({path:process.env.SP+"/walk/shots/"+process.argv[3]+".png",fullPage:false});
await p.setViewportSize({width:1440,height:1000});process.exit(0)})()
