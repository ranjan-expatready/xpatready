const fs=require("fs");const sel=require("./sel.json");const jl=fs.readFileSync("joblist.txt","utf8").trim().split("\n").map(l=>l.split(" "));
const out=[];const seen=new Set();
for(const r of sel){ if(seen.has(r.id))continue;seen.add(r.id);
  const jobs=JSON.parse(fs.readFileSync(`jobs/${r.id}.json`)).jobs;
  const shards=jobs.filter(j=>/^shard/.test(j.name)&&j.conclusion!=="skipped");
  let range=null,mode=null,why=null; const suites={}; const setup={};
  for(const j of shards){ const p=`logs/${j.id}.txt`; if(!fs.existsSync(p))continue; const t=fs.readFileSync(p,"utf8");
    range=range||(t.match(/RANGE: ([0-9a-f]{40}\.\.[0-9a-f]{40})/)||[])[1];
    const a=t.match(/\*\*Every suite runs\*\* for \S+ \((\d+) files changed\): (.*)/); if(a){mode="ALL";why=a[2];}
    const b=t.match(/\*\*(\d+) suites chosen\*\*/); if(b){mode="PICK";why=b[1];}
    for(const m of t.matchAll(/\| (check_\S+) \| (PASS|FAIL|quarantined|skipped) \| (\d*) ?s? ?\| ([^\n]*)/g)) suites[m[1]]={st:m[2],t:+m[3]||0,shard:j.name,last:m[4].slice(0,80)};
    const st=Object.fromEntries(j.steps.map(s=>[s.name.split(" ")[0]+" "+(s.name.split(" ")[1]||""),(new Date(s.completed_at)-new Date(s.started_at))/1000]));
    setup[j.name]={total:(new Date(j.completed_at)-new Date(j.started_at))/1000, steps:j.steps.map(s=>[s.name.slice(0,40),(new Date(s.completed_at)-new Date(s.started_at))/1000,s.conclusion])};
  }
  const kindJob=jobs.find(j=>j.name==="kind");
  out.push({...r,dur:(new Date(r.end)-new Date(r.start))/60000,nShards:shards.length,range,mode,why,suites,setup});
}
fs.writeFileSync("runs.json",JSON.stringify(out,null,1));
for(const o of out) console.log(o.id,o.concl.padEnd(7),o.pr,o.dur.toFixed(1).padStart(5),o.nShards,o.mode||"-",(o.why||"").slice(0,70), Object.values(o.suites).filter(s=>s.st==="FAIL").length+" fail");
