// Gate A part B2: add IMM 5710 (a form of the NEXT stage's release) to stage 1, then Start next stage by the dialog.
//   node walk_c617_b2.mjs <port> <caseId> <outDir>
import { start } from "./lib.mjs";
const [port, caseId, out] = process.argv.slice(2);
const { b, p, errors, shot, say } = await start(port, out);
await p.goto(`/cases/${caseId}`); await p.waitForLoadState("networkidle");
const addBtn = p.getByRole("button", { name: /Add a form to .*filing/ }).first();
await addBtn.scrollIntoViewIfNeeded(); await addBtn.click();
const panel = p.getByRole("dialog"); await panel.waitFor(); await p.waitForTimeout(500);
await panel.getByRole("combobox").fill("IMM 5710"); await p.waitForTimeout(900);
await panel.locator(`[data-addable="IMM 5710"]`).click(); await p.waitForTimeout(600);
await panel.getByRole("button", { name: /^Add to / }).click(); await p.waitForTimeout(1500);
const m = await p.locator("main").innerText();
say("added rows on stage 1", (m.match(/IMM [0-9A-Z ]+ for Sample Client S[^\n]*/g) || []).join(" / "));
// Start next stage
await p.getByRole("button", { name: /Start next stage/ }).click();
const dlg = p.getByRole("dialog"); await dlg.waitFor(); await p.waitForTimeout(1200);
say("start dialog", await dlg.innerText());
await shot("B04-start-next-dialog", dlg);
const confirmBtn = dlg.getByRole("button", { name: /^Start/ }).last();
say("confirm label", await confirmBtn.innerText());
await confirmBtn.click(); await p.waitForTimeout(1200);
say("after press without reason", (await dlg.innerText()).slice(-700));
await shot("B05-reason-required", dlg);
await dlg.getByLabel(/[Rr]eason/).fill("The study permit application was filed by the client before we took over (Sample, qa gate A).");
await confirmBtn.click();
await p.waitForTimeout(3000); await p.waitForLoadState("networkidle");
const toast = await p.locator("[role=status],[role=alert]").allInnerTexts();
say("toast", toast.join(" | "));
await shot("B06-started", null);
const m2 = await p.locator("main").innerText();
say("stages after", m2.slice(m2.indexOf("Stages"), m2.indexOf("Stages") + 400));
say("errors", JSON.stringify(errors));
await b.close();
