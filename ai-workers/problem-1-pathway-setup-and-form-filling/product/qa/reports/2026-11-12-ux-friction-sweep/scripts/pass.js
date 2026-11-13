const {chromium}=require("playwright");(async()=>{const b=await chromium.connectOverCDP("http://localhost:9333");const p=b.contexts()[0].pages().find(x=>!x.url().startsWith("devtools"));
const r=await p.evaluate(async ({cid,actor})=>{const H={"x-actor":actor,"content-type":"application/json"};
 const v=await (await fetch(`/api/runtime/cases/${cid}/prepare`,{headers:H})).json();
 const out=[]; const filings=v.filings||v.items||[];
 const keys=Object.keys(v); 
 for(const f of filings){ const lines=(f.readiness?.lines||f.lines||f.open||[]); for(const l of lines){ if(l.severity==="block"||l.kind==="block") continue; if(l.passed) continue;
   const res=await fetch(`/api/runtime/filings/${f.id}/warnings/${encodeURIComponent(l.code)}/pass`,{method:"POST",headers:H,body:JSON.stringify({reason:"Sample walk: passed for the qa sweep",key:l.key})}); out.push(res.status+" "+(l.code||"").slice(0,40)); }
   const rd=await fetch(`/api/runtime/filings/${f.id}/ready`,{method:"POST",headers:H,body:"{}"}); out.push("ready "+rd.status+" "+(await rd.text()).slice(0,200)); }
 return {keys, n:filings.length, fkeys: filings[0]?Object.keys(filings[0]):[], out};
},{cid:process.argv[2],actor:process.argv[3]});
console.log(JSON.stringify(r,null,1).slice(0,3000));process.exit(0)})()
