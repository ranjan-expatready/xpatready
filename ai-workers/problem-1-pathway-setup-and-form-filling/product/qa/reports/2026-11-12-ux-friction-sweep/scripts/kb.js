const {chromium}=require("playwright");(async()=>{const b=await chromium.connectOverCDP("http://localhost:9333");const p=b.contexts()[0].pages().find(x=>!x.url().startsWith("devtools"));
const f=async()=>p.evaluate(()=>{const a=document.activeElement; return (a.tagName+" "+(a.getAttribute("aria-label")||a.innerText||a.name||"").replace(/\s+/g," ").slice(0,50))+" inDialog="+!!a.closest("[role=dialog]")});
await p.locator("header select").selectOption({label:"Case officer"}); await p.waitForTimeout(1500);
await p.goto("http://localhost:4472/cases"); await p.waitForTimeout(2500);
const ob=p.getByRole("button",{name:"Open a case"}); await ob.focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(800);
console.log("after open:", await f());
const seen=[]; for(let i=0;i<14;i++){ await p.keyboard.press("Tab"); seen.push(await f()); }
console.log("tabs:", seen.join(" | "));
// empty submit
await p.getByRole("dialog").getByRole("button",{name:"Open case"}).click(); await p.waitForTimeout(800);
console.log("after empty submit focus:", await f());
console.log("errors:", await p.evaluate(()=>[...document.querySelectorAll("[role=dialog] [role=alert], [role=dialog] [id$=error], [role=dialog] .text-danger")].map(e=>e.innerText).join(" / ")));
await p.keyboard.press("Escape"); await p.waitForTimeout(600);
console.log("after Escape:", await f(), "dialog open:", await p.getByRole("dialog").count());
// case page: Add child dialog via keyboard, Escape, focus return
await p.goto("http://localhost:4472/cases/eabf10aa-7acb-441d-b6be-24b05613c96f"); await p.waitForTimeout(3500);
const ac=p.getByRole("button",{name:/Add child/}); await ac.focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(700); console.log("add child open:", await f());
await p.keyboard.press("Escape"); await p.waitForTimeout(500); console.log("add child closed:", await f());
// client: save with a wrong value, where is focus
await p.locator("header select").selectOption({label:"Client A"}); await p.waitForTimeout(1500);
await p.goto("http://localhost:4472/cases/eabf10aa-7acb-441d-b6be-24b05613c96f/questionnaire?part=1"); await p.waitForTimeout(3000);
const tu=p.getByLabel("Tuition cost of the studies"); await tu.fill("about 5000"); await p.getByRole("button",{name:"Save and continue"}).click(); await p.waitForTimeout(1500);
console.log("client save err focus:", await f(), "| summary:", await p.evaluate(()=>[...document.querySelectorAll("main [role=alert]")].map(e=>e.innerText.replace(/\s+/g," ").slice(0,200)).join(" / ")));
await p.screenshot({path:process.env.SP+"/walk/shots/70-client-error.png"});
await tu.fill("5000"); await p.getByRole("button",{name:"Save and continue"}).click(); await p.waitForTimeout(1500);
process.exit(0)})()
