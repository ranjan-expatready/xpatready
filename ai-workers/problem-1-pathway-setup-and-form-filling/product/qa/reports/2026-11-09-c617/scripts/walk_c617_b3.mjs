// Gate A part B3: stage 2 after Start next stage: its forms (C7.8 additions of stage 1 must not cross), the ended stage's record.
//   node walk_c617_b3.mjs <port> <caseId> <outDir>
import { start } from "./lib.mjs";
const [port, caseId, out] = process.argv.slice(2);
const { b, p, errors, shot, say } = await start(port, out);
await p.goto(`/cases/${caseId}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
const m = await p.locator("main").innerText();
const i = m.indexOf("Prepare application");
say("prepare application (stage 2)", m.slice(i, i + 2500));
say("mentions IMM 0008 DEP", (m.match(/IMM 0008 DEP/g) || []).length);
say("mentions 'Added by the case officer'", (m.match(/Added by the case officer/g) || []).length);
say("IMM 5710 lines", (m.match(/IMM 5710[^\n]{0,120}/g) || []).join(" / "));
const prep = p.getByRole("heading", { name: /Prepare application/ }).first();
if (await prep.count()) { await prep.scrollIntoViewIfNeeded(); await shot("B07-stage-2-prepare-application", null); }
await p.getByRole("button", { name: /Study permit \(outside Canada\)/ }).click(); await p.waitForTimeout(900);
const panel = p.getByRole("dialog");
say("ended stage panel", await panel.innerText());
const ctr = await panel.evaluate(e => [...e.querySelectorAll("button,input,a")].map(x => (x.innerText||x.value||x.getAttribute("aria-label")||"").trim().slice(0,60)));
say("ended panel controls", JSON.stringify(ctr));
await shot("B08-ended-stage-read-only", panel);
say("errors", JSON.stringify(errors));
await b.close();
