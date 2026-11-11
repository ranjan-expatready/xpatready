// Gate A part A: open a case at a later stage (BR-3, P-412 F13 (c)) as the case officer, 1440 px, by screens only.
//   node walk_c617_a.mjs <port> <outDir>
import { start } from "./lib.mjs";
const [port, out] = process.argv.slice(2);
const { b, p, errors, shot, say } = await start(port, out);
await p.goto("/cases"); await p.waitForLoadState("networkidle");
await p.getByRole("button", { name: "Open a case" }).click();
const d = p.getByRole("dialog"); await d.waitFor();
await d.getByLabel("Combination (released)").selectOption({ label: "With an LMIA – inside Canada · release 1" });
await d.getByText("Earlier stages").waitFor();
await d.getByLabel(/Done before we started/).check();
await d.getByLabel("UCI (optional)").fill("AB-12");
await d.getByLabel("Study permit valid until (optional)").fill("2027-02-03");
await d.getByLabel("Case reference").fill("QA-C617-LATER");
await d.getByLabel("Principal applicant's name").fill("Sample Client L");
await shot("A01-open-later-stage-filled", d);
await d.getByRole("button", { name: "Open case" }).click(); await p.waitForTimeout(1500);
say("after bad UCI", await d.innerText().catch(() => "(dialog gone) " + p.url()));
await shot("A02-bad-uci-refused", d);
await d.getByLabel("UCI (optional)").fill("12345678");
await d.getByRole("button", { name: "Open case" }).click();
await p.waitForURL(/\/cases\/[0-9a-f-]{36}/, { timeout: 30000 }); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1000);
say("case url", p.url());
say("case page", (await p.locator("main").innerText()).slice(0, 2500));
await shot("A03-case-at-later-stage", null);
const btns = await p.getByRole("button").evaluateAll(e=>e.map(x=>x.innerText.trim()).filter(Boolean));
say("buttons", JSON.stringify(btns));
say("errors", JSON.stringify(errors));
await b.close();
