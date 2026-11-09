// Gate A part C3, the next capability's first step on the new stage: Client B on the work permit's questionnaire (C6.2)
// sees the person answers read where they are and the application's question asked again, answers it; the officer then
// generates a copy of IMM 5710 (C7.1) from the case. 1440 px, by screens.   node walk_c617_c3.mjs <port> <caseId> <outDir>
import { start } from "./lib.mjs";
const [port, caseId, out] = process.argv.slice(2);
const c = await start(port, out, "user-Q");
await c.p.goto(`/cases/${caseId}/questionnaire`); await c.p.waitForLoadState("networkidle"); await c.p.waitForTimeout(800);
c.say("stage-2 questionnaire", (await c.p.locator("main").innerText()).slice(0, 1400));
await c.shot("C05-stage2-questionnaire-start", c.p.locator("main"));
// Opens the "Personal details" part whose text matches re (the person's: "Answering for"; the application's: "whole application").
const openPart = async (re) => { const n = await c.p.getByRole("button", { name: /^Personal details/ }).count();
  for (let k = 0; k < n; k++) { await c.p.getByRole("button", { name: /^Personal details/ }).nth(k).click(); await c.p.waitForTimeout(700);
    if (re.test(await c.p.locator("main").innerText())) return true; await c.p.getByRole("button", { name: "Back", exact: true }).click(); await c.p.waitForTimeout(500); } return false; };
// person part: answers read where they are
await openPart(/Answering for/);
const fam = await c.p.getByLabel("Family name as shown on passport or travel document").inputValue();
const giv = await c.p.getByLabel("Given name(s) as shown on passport or travel document").inputValue();
const mar = await c.p.getByLabel("Current marital status").inputValue();
const uci = await c.p.getByLabel("Unique Client Identifier assigned by IRCC").inputValue();
c.say("stage-2 person part values", JSON.stringify({ fam, giv, mar, uci, female: await c.p.getByLabel("F Female").isChecked() }));
await c.shot("C06-stage2-person-answers-read-where-they-are", c.p.locator("main"));
await c.p.getByRole("button", { name: "Back", exact: true }).click(); await c.p.waitForTimeout(600);
// application part asked again
await c.p.goto(`/cases/${caseId}/questionnaire`); await c.p.waitForLoadState("networkidle"); await c.p.waitForTimeout(600);
{ const n = await c.p.getByRole("button", { name: /^Personal details/ }).count(); await c.p.getByRole("button", { name: /^Personal details/ }).nth(n - 1).click(); await c.p.waitForTimeout(800); }
const found = /whole application/.test(await c.p.locator("main").innerText());
const radios = c.p.locator("main input[type=radio]");
const checked = await radios.evaluateAll(e => e.map(x => `${x.labels?.[0]?.innerText}:${x.checked}`));
c.say("application part found / already checked", `${found} / ${JSON.stringify(checked)}`);
await c.shot("C07-stage2-application-question-asked-again", c.p.locator("main"));
await radios.nth(3).check(); // "authorizes IRCC and the CBSA to release information": No (stage 1 said No too; asked again here)
await c.p.getByRole("button", { name: "Save and come back later" }).click(); await c.p.waitForTimeout(1200);
c.say("after save", (await c.p.locator("main").innerText()).slice(0, 300));
c.say("client errors", JSON.stringify(c.errors));
await c.b.close();
// officer: stage panels and a copy of IMM 5710 on the new stage
const o = await start(port, out);
await o.p.goto(`/cases/${caseId}`); await o.p.waitForLoadState("networkidle"); await o.p.waitForTimeout(800);
await o.p.getByRole("button", { name: /Work permit with an LMIA/ }).click(); await o.p.waitForTimeout(700);
o.say("current stage panel", await o.p.getByRole("dialog").innerText());
await o.shot("C08-current-stage-panel", o.p.getByRole("dialog"));
await o.p.keyboard.press("Escape"); await o.p.waitForTimeout(300);
await o.p.getByRole("button", { name: /Study permit \(outside Canada\)/ }).click(); await o.p.waitForTimeout(700);
o.say("ended stage panel", await o.p.getByRole("dialog").innerText());
await o.shot("C09-ended-stage-panel-key-details", o.p.getByRole("dialog"));
await o.p.keyboard.press("Escape"); await o.p.waitForTimeout(300);
const h = o.p.getByRole("heading", { name: /IMM 5710 for Sample Client C/ });
const card = h.locator("xpath=ancestor::*[.//button[normalize-space()='Generate a copy']][1]");
await card.getByRole("button", { name: "Generate a copy" }).click(); await o.p.waitForTimeout(4000); await o.p.waitForLoadState("networkidle");
o.say("IMM 5710 card after copy", (await card.innerText()).slice(0, 900));
await o.shot("C10-stage2-imm5710-copy-made", card);
o.say("officer errors", JSON.stringify(o.errors));
await o.b.close();
