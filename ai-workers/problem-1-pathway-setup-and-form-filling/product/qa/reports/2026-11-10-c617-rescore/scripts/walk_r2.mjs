// Re-score gate A part 2 (QA-375 by screens): on the study permit, the officer uploads the passport copy through the line's
// menu; Start next stage (the dialog's documents); the work stage's own fresh lines with "On file from Study permit …: check
// it"; the ended stage's own documents. 1440 px.   node walk_r2.mjs <port> <caseId> <outDir>
import { start } from "./lib.mjs";
const [port, caseId, out] = process.argv.slice(2);
const o = await start(port, out);
const { p } = o;
await p.goto(`/cases/${caseId}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
const line = (label) => p.locator("[data-documents-panel] [data-line]").filter({ has: p.locator("[data-line-label]", { hasText: new RegExp(`^${label}$`) }) }).first();
const passport = line("Passport information page copy");
await passport.waitFor(); await passport.locator("[data-line-menu]").click(); await p.waitForTimeout(300);
o.say("line menu (stage 1)", (await p.locator("[role=menu]").innerText().catch(() => "no menu")));
const chooser = p.waitForEvent("filechooser"); await p.locator('[data-action="upload"]').click();
await (await chooser).setFiles({ name: "sample-passport-qa.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% Sample synthetic passport copy (qa C6.17 re-score walk)\n") });
await passport.locator("[data-state-words]", { hasText: "Received" }).waitFor({ timeout: 15000 });
o.say("passport line after upload", await passport.innerText());
await o.shot("R02-stage1-passport-uploaded", p.locator("[data-documents-panel]"));
// Start next stage
await p.locator("[data-start-next]").click(); const dlg = p.locator("[data-start-dialog]"); await dlg.waitFor(); await p.waitForTimeout(900);
o.say("start dialog", await dlg.innerText());
o.say("dialog documents", await p.locator("[data-start-documents]").innerText().catch(() => "(none)"));
await o.shot("R03-start-next-dialog-documents", dlg);
await dlg.getByLabel("UCI (optional)").fill("23456789");
await dlg.getByLabel("Study permit valid until (optional)").fill("2027-04-30");
await dlg.getByLabel("Reason").fill("The client filed the study permit before we took the case; no filing record kept (Sample, qa re-score).");
await p.locator("[data-start-confirm]").click(); await dlg.waitFor({ state: "detached" }); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
o.say("toast", await p.locator("[aria-live=polite].fixed").innerText().catch(() => "(no toast)"));
await o.shot("R04-started-toast", null);
const docs2 = p.locator("[data-documents-panel]");
o.say("stage-2 documents panel", await docs2.innerText());
await o.shot("R05-stage2-documents-on-file", docs2);
const pp2 = line("Passport or travel document information page photocopy");
await pp2.locator("[data-line-menu]").click(); await p.waitForTimeout(300);
o.say("stage-2 passport line menu", await p.locator("[role=menu]").innerText().catch(() => "no menu"));
await p.keyboard.press("Escape");
await p.getByRole("button", { name: /Study permit \(outside Canada\)/ }).click(); await p.waitForTimeout(800);
o.say("ended stage panel", await p.getByRole("dialog").innerText());
await o.shot("R06-ended-stage-own-documents", p.getByRole("dialog"));
o.say("errors", JSON.stringify(o.errors));
await o.b.close();
