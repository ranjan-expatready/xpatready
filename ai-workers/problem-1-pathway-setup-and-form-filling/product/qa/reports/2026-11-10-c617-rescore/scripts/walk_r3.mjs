// Re-score gate A part 3: the next capability's first step on the new stage (C6.4): the officer checks the passport line
// that says "On file from Study permit …: check it", opens its menu and uploads this application's copy; the line is
// Received on the work stage. Then the ended stage's panel with its own documents. 1440 px.
//   node walk_r3.mjs <port> <caseId> <outDir>
import { start } from "./lib.mjs";
const [port, caseId, out] = process.argv.slice(2);
const o = await start(port, out);
const { p } = o;
await p.goto(`/cases/${caseId}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
const line = (label) => p.locator("[data-documents-panel] [data-line]").filter({ has: p.locator("[data-line-label]", { hasText: new RegExp(`^${label}$`) }) }).first();
const pp2 = line("Passport or travel document information page photocopy");
await pp2.waitFor();
await o.shot("R07-stage2-passport-on-file-line", pp2);
await pp2.locator("[data-line-menu]").click(); await p.waitForTimeout(300);
o.say("stage-2 passport line menu", await p.locator("[role=menu]").innerText().catch(() => "no menu"));
await o.shot("R08-stage2-line-menu", null);
const chooser = p.waitForEvent("filechooser"); await p.locator('[data-action="upload"]').click();
await (await chooser).setFiles({ name: "sample-passport-work.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% Sample synthetic passport copy for the work permit (qa C6.17 re-score walk)\n") });
await pp2.locator("[data-state-words]", { hasText: "Received" }).waitFor({ timeout: 15000 });
o.say("stage-2 passport line after upload", await pp2.innerText());
o.say("stage-2 panel count", (await p.locator("[data-documents-panel]").innerText()).match(/\d+ of \d+ received/)?.[0]);
await o.shot("R09-stage2-passport-received", p.locator("[data-documents-panel]"));
await p.getByRole("button", { name: /Study permit \(outside Canada\)/ }).click(); await p.waitForTimeout(800);
o.say("ended stage panel", await p.getByRole("dialog").innerText());
await o.shot("R10-ended-stage-own-documents", p.getByRole("dialog"));
o.say("errors", JSON.stringify(o.errors));
await o.b.close();
