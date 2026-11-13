// node ev.js '<expression evaluated in page>'  -> prints result
const {chromium}=require("playwright");(async()=>{const b=await chromium.connectOverCDP("http://localhost:9333");const p=b.contexts()[0].pages().find(x=>!x.url().startsWith("devtools"));
const r=await p.evaluate(new Function("return ("+process.argv[2]+")"));console.log(typeof r==="string"?r:JSON.stringify(r,null,0));process.exit(0)})().catch(e=>{console.log("ERR",String(e).split("\n")[0]);process.exit(1)})
