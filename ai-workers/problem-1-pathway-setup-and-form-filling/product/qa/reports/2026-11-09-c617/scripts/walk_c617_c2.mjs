// Gate A part C2: Client B answers on stage 1 (a person part and an application part), then the officer starts the next stage
// with the ending stage's key details. 1440 px, by screens.   node walk_c617_c2.mjs <port> <caseId> <outDir>
import { start } from "./lib.mjs";
const [port, caseId, out] = process.argv.slice(2);
const c = await start(port, out, "user-Q");
await c.p.goto(`/cases/${caseId}/questionnaire`); await c.p.waitForLoadState("networkidle"); await c.p.waitForTimeout(800);
// application part ("Answered once for the whole application")
await c.p.getByRole("button", { name: /^Personal details/ }).first().click(); await c.p.waitForTimeout(700);
await c.p.getByLabel("English").check();
const radios = c.p.locator("main input[type=radio]");
await radios.nth(2).check(); await radios.nth(5).check();
await c.shot("C01-stage1-application-part-answered", c.p.locator("main"));
await c.p.getByRole("button", { name: "Save and come back later" }).click(); await c.p.waitForTimeout(1200);
// person part
await c.p.goto(`/cases/${caseId}/questionnaire`); await c.p.waitForLoadState("networkidle"); await c.p.waitForTimeout(600);
await c.p.getByRole("button", { name: /^Personal details/ }).nth(1).click(); await c.p.waitForTimeout(700);
await c.p.getByLabel("Family name as shown on passport or travel document").fill("Sample");
await c.p.getByLabel("Given name(s) as shown on passport or travel document").fill("Client C");
await c.p.getByLabel("Current marital status").selectOption({ label: "Single" });
await c.p.getByLabel("F Female").check();
await c.shot("C02-stage1-person-part-answered", c.p.locator("main"));
await c.p.getByRole("button", { name: "Save and come back later" }).click(); await c.p.waitForTimeout(1200);
c.say("client errors", JSON.stringify(c.errors));
await c.b.close();
// the officer: Start next stage with key details
const o = await start(port, out);
await o.p.goto(`/cases/${caseId}`); await o.p.waitForLoadState("networkidle"); await o.p.waitForTimeout(800);
const m = await o.p.locator("main").innerText(); const i = m.indexOf("questions for this household"); o.say("household", m.slice(Math.max(0, i - 5), i + 120));
await o.p.getByRole("button", { name: /Start next stage/ }).click();
const dlg = o.p.getByRole("dialog"); await dlg.waitFor(); await o.p.waitForTimeout(1200);
await dlg.getByLabel("UCI (optional)").fill("87654321");
await dlg.getByLabel("Study permit valid until (optional)").fill("2027-05-31");
await o.p.waitForTimeout(800);
o.say("start dialog with key details", await dlg.innerText());
await o.shot("C03-start-next-dialog-key-details", dlg);
await dlg.getByLabel(/^Reason/).fill("The study permit was decided before we took the case; no filing record kept (Sample, qa gate A).");
await dlg.getByRole("button", { name: /^Start / }).last().click();
await o.p.waitForTimeout(3000); await o.p.waitForLoadState("networkidle");
const m2 = await o.p.locator("main").innerText();
o.say("stages after", m2.slice(m2.indexOf("Stages"), m2.indexOf("Stages") + 400));
await o.shot("C04-started-strip-deadline", o.p.getByRole("heading", { name: "Stages" }).locator("xpath=ancestor::section[1]"));
o.say("officer errors", JSON.stringify(o.errors));
await o.b.close();
