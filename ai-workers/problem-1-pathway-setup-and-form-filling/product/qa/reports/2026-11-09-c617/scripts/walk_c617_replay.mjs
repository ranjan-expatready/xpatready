// Headless replay at 400 and 1024 px, twice each (flakiness), of C6.17's states, with axe (WCAG 2.2 A/AA) and a sideways-scroll
// check per state. Writes only a fresh study case per pass (opened by screens, its Start next dialog opened then cancelled).
//   node walk_c617_replay.mjs <port> <carryCaseId> <outDir>
import { createRequire } from "node:module";
import { start } from "./lib.mjs";
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright");
const [port, carry, out] = process.argv.slice(2);
const results = [];
for (const width of [400, 1024]) for (const pass of [1, 2]) {
  const o = await start(port, out, "user-O", width);
  const check = async (state) => {
    const v = (await new AxeBuilder({ page: o.p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
    const sideways = await o.p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    results.push({ width, pass, state, axe: v.map((x) => `${x.id}(${x.nodes.length}): ${x.nodes[0]?.target}`), sideways });
    if (pass === 1) await o.shot(`R-${width}-${state}`, null);
  };
  try {
    await o.p.goto("/cases"); await o.p.waitForLoadState("networkidle");
    await o.p.getByRole("button", { name: "Open a case" }).click();
    const d = o.p.getByRole("dialog"); await d.waitFor();
    await d.getByLabel("Combination (released)").selectOption({ label: "With an LMIA – inside Canada · release 1" });
    await d.getByText("Earlier stages").waitFor(); await check("open-later-stage");
    await d.getByLabel("Combination (released)").selectOption({ label: "Outside Canada · release 1" });
    await d.getByLabel("Case reference").fill(`QA-C617-R${width}-${pass}`); await d.getByLabel("Principal applicant's name").fill("Sample Client R");
    await d.getByRole("button", { name: "Open case" }).click();
    await o.p.waitForURL(/\/cases\/[0-9a-f-]{36}/); await o.p.waitForLoadState("networkidle"); await o.p.waitForTimeout(600);
    await o.p.getByRole("button", { name: /Start next stage/ }).click();
    const dlg = o.p.getByRole("dialog"); await dlg.getByText("This cannot be undone.").waitFor(); await check("start-next-dialog");
    await dlg.getByRole("button", { name: "Cancel" }).click(); await o.p.waitForTimeout(400);
    const still = await o.p.getByRole("button", { name: /Start next stage/ }).count();
    await o.p.goto(`/cases/${carry}`); await o.p.waitForLoadState("networkidle"); await o.p.waitForTimeout(600);
    await o.p.getByRole("button", { name: /Study permit \(outside Canada\)/ }).click(); await o.p.getByRole("dialog").waitFor(); await o.p.waitForTimeout(400);
    await check("ended-stage-panel");
    results.push({ width, pass, state: "cancel leaves stage 1 current (Start next stage still offered)", ok: still === 1, errors: o.errors });
  } catch (e) { results.push({ width, pass, state: "FAILED", error: String(e).slice(0, 300) }); }
  await o.b.close();
}
for (const r of results) console.log(JSON.stringify(r));
