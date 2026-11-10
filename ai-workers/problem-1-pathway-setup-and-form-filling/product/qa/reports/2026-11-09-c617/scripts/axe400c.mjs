// Re-check 2: the confirm button hovered and focused, 400 px.
import { createRequire } from "node:module";
import { start } from "./lib.mjs";
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright");
const [port, caseId] = process.argv.slice(2);
const o = await start(port, "/tmp", "user-O", 400);
await o.p.goto(`/cases/${caseId}`); await o.p.waitForLoadState("networkidle"); await o.p.waitForTimeout(600);
await o.p.getByRole("button", { name: /Start next stage/ }).click(); await o.p.getByRole("dialog").getByText("This cannot be undone.").waitFor();
const btn = o.p.locator('button[data-start-confirm="true"]');
const cc = async () => (await new AxeBuilder({ page: o.p }).withRules(["color-contrast"]).analyze()).violations.flatMap(x => x.nodes.map(n => `${n.target} ${JSON.stringify(n.any[0]?.data)}`));
await btn.hover(); await o.p.waitForTimeout(300); const hov = await cc(); await btn.screenshot({ path: "/tmp/claude-0/btn-hover.png" });
await o.p.mouse.move(5, 5); await btn.focus(); await o.p.waitForTimeout(300); const foc = await cc();
console.log(JSON.stringify({ hovered: hov, focused: foc, colors: await btn.evaluate(e => { const s = getComputedStyle(e); return [s.color, s.backgroundColor]; }) }));
await o.b.close();
