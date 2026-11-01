// WCAG 2.4.7 (focus visible), the handover of #210: `web/src/styles/index.css` removed the outline from every focused
// element app-wide. Now every keyboard-focused element shows a 2 px ring in the brand colour (--color-ring), or the ring a
// control draws itself. Walked by keyboard (Tab only) on three pages, Immigration programs, a combination's Forms tab and
// the Form library, in light and dark; axe (WCAG 2.2 AA) on each. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_focus 4443 start && node studio/tests/check_focus_ring_browser.cjs 4443
const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4443);
const BASE = `http://localhost:${PORT}`;
const TABS = 40; // Tab presses per page: past the top bar and the side menu, into the page itself
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${typeof detail === "string" ? detail.slice(0, 400) : JSON.stringify(detail).slice(0, 400)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" } }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  if (!(await api("/demo/status")).body?.loaded) step("setup: the sample loads", (await api("/demo/load", { method: "POST" })).status === 201);
  const vv = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.find((r) => r.label === "Visitor visa").combinationId;
  const PAGES = [["Immigration programs", "/", "main h1"], ["a combination's Forms tab", `/c/${vv}/forms`, "main h1"], ["the Form library", "/library/forms", "main h1"]];

  /** Tab through the page; for each focused element, whether it shows a focus indicator: an outline of at least 2 px
   *  that is not transparent, or a ring (box shadow) the control draws itself. */
  const walk = async () => {
    await p.locator("body").click({ position: { x: 2, y: 2 } }).catch(() => undefined);
    await p.evaluate(() => (document.activeElement)?.blur?.());
    const seen = [];
    for (let i = 0; i < TABS; i++) {
      await p.keyboard.press("Tab");
      await p.waitForTimeout(220); // the controls' own rings fade in (transition-all, 150 ms)
      const f = await p.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2 && !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(cs.outlineColor);
        // A ring: a box-shadow layer with a spread of at least 1 px in a colour that is not fully transparent.
        const ring = (cs.boxShadow ?? "none").split(/,(?![^(]*\))/).some((l) => { const spread = /(-?[\d.]+)px\s*$/.exec(l.trim()); return !!spread && parseFloat(spread[1]) >= 1 && !/rgba\(\d+, \d+, \d+, 0\)|\/ 0\)/.test(l); });
        const name = `${el.tagName.toLowerCase()}${el.getAttribute("role") ? `[${el.getAttribute("role")}]` : ""} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}"`;
        return { name, visible: !!(outline || ring), outline, outlineColor: cs.outlineColor, matches: el.matches(":focus-visible") };
      });
      if (f) seen.push(f);
    }
    return seen;
  };

  for (const scheme of ["light", "dark"]) {
    await p.goto(BASE); await p.evaluate((d) => { document.documentElement.setAttribute("data-theme", d); try { localStorage.setItem("xr-theme", d); } catch { /* ignore */ } }, scheme);
    for (const [label, url, ready] of PAGES) {
      await p.goto(`${BASE}${url}`); await p.locator(ready).first().waitFor({ timeout: 15000 });
      await p.evaluate((d) => document.documentElement.setAttribute("data-theme", d), scheme);
      await p.waitForTimeout(300);
      const seen = await walk();
      const bare = seen.filter((f) => f.matches && !f.visible);
      step(`WCAG 2.4.7 (${scheme}): on ${label}, every element reached by Tab shows a focus ring (${seen.length} stops)`, seen.length >= 10 && bare.length === 0, bare.length ? bare.map((f) => f.name) : `${seen.length} stops`);
      const ringColour = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-ring").trim());
      const outlined = seen.filter((f) => f.outline);
      step(`WCAG 2.4.7 (${scheme}): on ${label}, the app-wide ring is solid (not a see-through tint) in the brand ring colour`, outlined.length > 0 && outlined.every((f) => !/rgba\([^)]*, 0\.\d+\)/.test(f.outlineColor)), { ringColour, sample: outlined.slice(0, 2).map((f) => f.outlineColor) });
      if (scheme === "light") { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${label} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); }
    }
  }

  // Fail: the old reset put back (unlayered, as it was) leaves focused links and buttons with no ring, and this check sees it.
  await p.goto(BASE); await p.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await p.goto(`${BASE}/`); await p.locator("main h1").first().waitFor();
  await p.addStyleTag({ content: ":focus-visible { outline: none; }" });
  const without = await walk();
  step("WCAG 2.4.7 fail: with the old `:focus-visible { outline: none; }` back, this check finds focused elements with no ring", without.filter((f) => f.matches && !f.visible).length > 0, without.filter((f) => !f.visible).slice(0, 3).map((f) => f.name));

  step("no page errors", errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
