// Re-score gate A part 1: open a study-permit case by screens; read its Documents panel (QA-375's fix, #1477).
//   node walk_r1.mjs <port> <outDir>
import { start } from "./lib.mjs";
const [port, out] = process.argv.slice(2);
const o = await start(port, out);
await o.p.goto("/cases"); await o.p.waitForLoadState("networkidle");
await o.p.getByRole("button", { name: "Open a case" }).click();
const d = o.p.getByRole("dialog"); await d.waitFor();
await d.getByLabel("Combination (released)").selectOption({ label: "Outside Canada · release 1" });
await d.getByLabel("Case reference").fill("QA-C617-DOCS");
await d.getByLabel("Principal applicant's name").fill("Sample Client D");
await d.getByLabel("Client login that answers").selectOption({ label: "Client B (simulated)" });
await d.getByRole("button", { name: "Open case" }).click();
await o.p.waitForURL(/\/cases\/[0-9a-f-]{36}/); await o.p.waitForLoadState("networkidle"); await o.p.waitForTimeout(1000);
o.say("case", o.p.url().split("/").pop());
const m = await o.p.locator("main").innerText();
const i = m.indexOf("Documents"); o.say("documents panel", m.slice(i, i + 2500));
const docs = o.p.getByRole("heading", { name: /^Documents/ }).locator("xpath=ancestor::section[1]");
await o.shot("R01-stage1-documents-panel", docs);
const ctr = await docs.evaluate(e => [...e.querySelectorAll("button,input,a")].map(x => (x.innerText || x.getAttribute("aria-label") || x.type || "").trim().replace(/\s+/g, " ").slice(0, 70)));
o.say("documents controls", JSON.stringify(ctr));
o.say("errors", JSON.stringify(o.errors));
await o.b.close();
