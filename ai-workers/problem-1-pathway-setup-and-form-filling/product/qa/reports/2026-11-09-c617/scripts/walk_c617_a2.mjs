// Gate A part A2: the done-before stage's own record, and the strip (deadline Sample).   node walk_c617_a2.mjs <port> <caseId> <outDir>
import { start } from "./lib.mjs";
const [port, caseId, out] = process.argv.slice(2);
const { b, p, errors, shot, say } = await start(port, out);
await p.goto(`/cases/${caseId}`); await p.waitForLoadState("networkidle");
const strip = p.getByRole("button", { name: /Study permit \(outside Canada\)/ }).locator("xpath=ancestor::section[1]");
await shot("A04-stages-strip", strip);
await p.getByRole("button", { name: /Study permit \(outside Canada\)/ }).click(); await p.waitForTimeout(800);
const panel = p.getByRole("dialog");
say("done-before panel", await panel.innerText());
await shot("A05-done-before-stage-record", panel);
const inputs = await panel.evaluate(e => [...e.querySelectorAll("input,button,select,textarea")].map(x => `${x.tagName}:${x.getAttribute("aria-label")||""}:${(x.innerText||x.value||"").trim().slice(0,60)}:${x.disabled?"disabled":""}`));
say("panel controls", JSON.stringify(inputs));
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
await p.getByRole("button", { name: /Work permit with an LMIA/ }).click(); await p.waitForTimeout(800);
say("current panel", await p.getByRole("dialog").innerText().catch(()=>"no dialog"));
await shot("A06-current-stage-panel", p.getByRole("dialog"));
say("errors", JSON.stringify(errors));
await b.close();
