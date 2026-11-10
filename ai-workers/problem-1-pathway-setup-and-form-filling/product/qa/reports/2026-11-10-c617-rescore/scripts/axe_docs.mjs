// axe (WCAG 2.2 A/AA) and sideways scroll on the work stage's Documents panel (QA-375's fix), 400 and 1024 px, twice each.
import { createRequire } from "node:module";
import { start } from "./lib.mjs";
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright");
const [port, caseId, out] = process.argv.slice(2);
for (const width of [400, 1024]) for (const pass of [1, 2]) {
  const o = await start(port, out, "user-O", width);
  await o.p.goto(`/cases/${caseId}`); await o.p.waitForLoadState("networkidle"); await o.p.waitForTimeout(800);
  const panel = o.p.locator("[data-documents-panel]"); await panel.scrollIntoViewIfNeeded();
  const v = (await new AxeBuilder({ page: o.p }).include("[data-documents-panel]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  const sideways = await o.p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  console.log(JSON.stringify({ width, pass, state: "work-stage documents panel (On file line)", axe: v.map((x) => `${x.id}(${x.nodes.length}): ${x.nodes[0]?.target}`), sideways, errors: o.errors }));
  if (pass === 1) await o.shot(`R-${width}-stage2-documents`, panel);
  await o.b.close();
}
