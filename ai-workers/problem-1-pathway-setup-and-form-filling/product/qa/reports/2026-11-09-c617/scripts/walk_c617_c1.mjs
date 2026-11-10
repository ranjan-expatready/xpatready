// Gate A part C1: a third case on the study permit (stage 1), opened by the officer; Client B looks at the first parts.
//   node walk_c617_c1.mjs <port> <outDir>
import { start } from "./lib.mjs";
const [port, out] = process.argv.slice(2);
const o = await start(port, out);
await o.p.goto("/cases"); await o.p.waitForLoadState("networkidle");
await o.p.getByRole("button", { name: "Open a case" }).click();
const d = o.p.getByRole("dialog"); await d.waitFor();
await d.getByLabel("Combination (released)").selectOption({ label: "Outside Canada · release 1" });
await d.getByLabel("Case reference").fill("QA-C617-CARRY");
await d.getByLabel("Principal applicant's name").fill("Sample Client C");
await d.getByLabel("Client login that answers").selectOption({ label: "Client B (simulated)" });
await d.getByRole("button", { name: "Open case" }).click();
await o.p.waitForURL(/\/cases\/[0-9a-f-]{36}/); const caseId = o.p.url().split("/").pop(); o.say("case", caseId);
await o.b.close();
const c = await start(port, out, "user-Q");
await c.p.goto(`/cases/${caseId}/questionnaire`); await c.p.waitForLoadState("networkidle"); await c.p.waitForTimeout(800);
c.say("stage-1 questionnaire", (await c.p.locator("main").innerText()).slice(0, 1500));
await c.p.getByRole("button", { name: /^Personal details/ }).first().click(); await c.p.waitForTimeout(800);
c.say("person part", (await c.p.locator("main").innerText()).slice(0, 1500));
const ctr = await c.p.locator("main").evaluate(e => [...e.querySelectorAll("input,select,textarea,button")].slice(0,30).map(x => `${x.tagName}:${x.type||""}:${(x.labels?.[0]?.innerText||x.getAttribute("aria-label")||x.innerText||"").trim().replace(/\s+/g," ").slice(0,70)}`));
console.log(ctr.join("\n"));
await c.b.close();
