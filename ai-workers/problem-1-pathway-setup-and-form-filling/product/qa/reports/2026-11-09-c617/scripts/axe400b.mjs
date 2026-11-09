// Re-check of the 400 px contrast flag: the Start next dialog opened right after opening a case, axe at 0 ms and after 1 s.
import { createRequire } from "node:module";
import { start } from "./lib.mjs";
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright");
const [port] = process.argv.slice(2);
for (const k of [1, 2]) {
  const o = await start(port, "/tmp", "user-O", 400);
  await o.p.goto("/cases"); await o.p.waitForLoadState("networkidle");
  await o.p.getByRole("button", { name: "Open a case" }).click(); const d = o.p.getByRole("dialog"); await d.waitFor();
  await d.getByLabel("Combination (released)").selectOption({ label: "Outside Canada · release 1" });
  await d.getByLabel("Case reference").fill(`QA-C617-AXE-${k}`); await d.getByLabel("Principal applicant's name").fill("Sample Client X");
  await d.getByRole("button", { name: "Open case" }).click(); await o.p.waitForURL(/\/cases\/[0-9a-f-]{36}/); await o.p.waitForLoadState("networkidle"); await o.p.waitForTimeout(600);
  await o.p.getByRole("button", { name: /Start next stage/ }).click(); await o.p.getByRole("dialog").getByText("This cannot be undone.").waitFor();
  const at0 = (await new AxeBuilder({ page: o.p }).withRules(["color-contrast"]).analyze()).violations.flatMap(x => x.nodes.map(n => `${n.target} ${JSON.stringify(n.any[0]?.data)}`));
  await o.p.waitForTimeout(1000);
  const at1 = (await new AxeBuilder({ page: o.p }).withRules(["color-contrast"]).analyze()).violations.flatMap(x => x.nodes.map(n => `${n.target} ${JSON.stringify(n.any[0]?.data)}`));
  console.log(JSON.stringify({ run: k, at0ms: at0, after1s: at1 }));
  await o.b.close();
}
