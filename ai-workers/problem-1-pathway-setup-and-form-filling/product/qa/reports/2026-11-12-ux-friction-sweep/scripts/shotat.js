// node shotat.js <actor label> <url> <text to scroll to> <shot> [width]
const {chromium}=require("playwright");(async()=>{const b=await chromium.connectOverCDP("http://localhost:9333");const p=b.contexts()[0].pages().find(x=>!x.url().startsWith("devtools"));
const [who,url,txt,shot,w]=process.argv.slice(2); await p.setViewportSize({width:+(w||1440),height:+(w||1440)<600?812:1000});
const sel=p.locator("header select"); const cur=await sel.evaluate(s=>s.options[s.selectedIndex].text).catch(()=>""); if(cur!==who){await sel.selectOption({label:who}).catch(()=>{}); await p.waitForTimeout(1500);}
await p.goto("http://localhost:4472"+url); await p.waitForTimeout(3500);
if(txt){ const l=p.getByText(txt,{exact:false}).first(); await l.scrollIntoViewIfNeeded().catch(e=>console.log("no text")); await p.evaluate(()=>window.scrollBy(0,-120)); await p.waitForTimeout(400);}
const found=await p.evaluate((t)=>document.body.innerText.includes(t),process.argv[6]||"");
console.log("ok", found);
await p.screenshot({path:process.env.SP+"/walk/shots/"+shot+".png"}); await p.setViewportSize({width:1440,height:1000}); process.exit(0)})()
