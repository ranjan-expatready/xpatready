// qa C6.5 headless replay (read-only) of the walked case's three drawers at 400, 1024 and 1440 px, twice: the words a
// person reads, no sideways scroll, axe WCAG 2.2 AA on the drawer, time to open. US$0. Usage (from studio/):
// node replay.mjs <port> <caseId>   (SUBJECTS, CASESUBJECT in the environment)
import { createRequire } from "node:module";
const req = createRequire(`${process.cwd()}/`);
const { chromium } = req("playwright"); const AxeBuilder = req("@axe-core/playwright").default;
const [port, caseId] = process.argv.slice(2);
const P = JSON.parse(process.env.SUBJECTS), CS = process.env.CASESUBJECT;
const id = (f) => f.replace(/[^a-z0-9_]/gi, "-");
const views = [
  ["the application · Details of visit to Canada", CS, "case.funds_available_cad", /Funds available for the stay, in Canadian dollars: CAD 14,200 · Used/],
  ["Spouse A · Personal details", P["Sample Spouse A"], "relationship.union_start_date", /14 Jun 2019 · Used/],
  ["Child A1 · Personal details", P["Sample Child A1"], "person.date_of_birth", /Copy of the minor's birth certificate: read by a person\. Check its values against it\./],
];
const b = await chromium.launch({ channel: "chrome" }); let fails = 0, n = 0;
for (const round of [1, 2]) for (const w of [400, 1024, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, timezoneId: "Asia/Kolkata", baseURL: `http://127.0.0.1:${port}` });
  await ctx.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  for (const [name, s, f, want] of views) {
    await p.goto(`/cases/${caseId}#a-${s}-${id(f)}`); await p.waitForLoadState("networkidle");
    const sec = p.locator(`[id^="s-${s}-"]`).filter({ has: p.locator(`#a-${s}-${id(f)}`) }).first();
    const t0 = Date.now(); await sec.locator("[data-fill-from-documents]").click();
    const d = p.locator("[data-documents-drawer]"); await d.waitFor(); await p.waitForLoadState("networkidle"); const ms = Date.now() - t0;
    const text = (await d.innerText()).replace(/\s+/g, " ");
    const sideways = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const axe = await new AxeBuilder({ page: p }).include("[data-documents-drawer]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const ok = want.test(text) && !sideways && axe.violations.length === 0 && !errs.length; n++; if (!ok) fails++;
    console.log(`${ok ? "PASS" : "FAIL"}  round ${round} · ${w} px · ${name}: words ${want.test(text) ? "as walked" : "DIFFER: " + text.slice(0, 200)} · sideways scroll ${sideways ? "YES" : "none"} · axe ${axe.violations.length ? axe.violations.map((v) => v.id).join(",") : "0 violations"} · opened in ${ms} ms${errs.length ? " · page errors " + errs.join("; ") : ""}`);
    await p.keyboard.press("Escape");
  }
  await ctx.close();
}
console.log(`${n - fails}/${n} passed`); await b.close(); process.exit(fails ? 1 : 0);
