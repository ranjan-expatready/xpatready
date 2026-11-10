// Re-check 3 (after the fresh reader): the replay's own flow at 400 px with reduced motion (open a case → the "Case opened"
// toast → Start next stage), 3 runs; prints axe's measured colours for any contrast node, and whether the toast covers the button.
import { createRequire } from "node:module";
import { start } from "./lib.mjs";
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright");
const [port] = process.argv.slice(2);
for (const k of [1, 2, 3]) {
  process.env.REDUCED = "1";
  const o = await start(port, "/tmp", "user-O", 400);
  await o.p.goto("/cases"); await o.p.waitForLoadState("networkidle");
  await o.p.getByRole("button", { name: "Open a case" }).click(); const d = o.p.getByRole("dialog"); await d.waitFor();
  await d.getByLabel("Combination (released)").selectOption({ label: "Outside Canada · release 1" });
  await d.getByLabel("Case reference").fill(`QA-C617-AXED-${k}-${Date.now() % 100000}`); await d.getByLabel("Principal applicant's name").fill("Sample Client X");
  await d.getByRole("button", { name: "Open case" }).click(); await o.p.waitForURL(/\/cases\/[0-9a-f-]{36}/); await o.p.waitForLoadState("networkidle"); await o.p.waitForTimeout(600);
  await o.p.getByRole("button", { name: /Start next stage/ }).click(); await o.p.getByRole("dialog").getByText("This cannot be undone.").waitFor();
  const v = (await new AxeBuilder({ page: o.p }).withRules(["color-contrast"]).analyze()).violations.flatMap(x => x.nodes.map(n => `${n.target} ${JSON.stringify(n.any[0]?.data)} ${n.any[0]?.message ?? ""}`.slice(0, 400)));
  const btn = await o.p.locator('button[data-start-confirm="true"]').boundingBox();
  const toast = await o.p.getByText("Case opened").first().boundingBox().catch(() => null);
  const cancel = await o.p.getByRole("dialog").getByRole("button", { name: "Cancel" }).boundingBox();
  console.log(JSON.stringify({ run: k, contrast: v, confirm: btn, toast, cancel }));
  await o.b.close();
}
