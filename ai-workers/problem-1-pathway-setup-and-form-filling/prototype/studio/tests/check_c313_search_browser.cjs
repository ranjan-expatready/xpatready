// C3.13 BR-3 in the browser at 1440 and 400 px (forms lane): Shared library › Fields finds a field by one of its aliases
// or by the code of a form that fills it, typed with or without its space, as GET /library/fields?q= does; a search that
// matches nothing shows no row. Sample inputs; no AI call (US$0). axe (WCAG 2.2 AA) on the searched list.
//   zsh studio/tools/isolated.sh c313_search 4460 start && node studio/tests/check_c313_search_browser.cjs 4460
const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4460), BASE = `http://localhost:${PORT}`;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data, timeout: init.timeout ?? 30000 }); let body = null; try { body = await r.json(); } catch { /* not JSON */ } return { status: r.status(), body }; };
  const rows = () => p.locator("main table tbody tr[data-item]").evaluateAll((trs) => trs.map((t) => t.getAttribute("data-item")));
  const search = async (text) => { const box = p.getByRole("textbox", { name: "Search fields" }); await box.fill(text); await p.waitForTimeout(250); return rows(); };
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    const loaded = await api("/demo/load", { method: "POST", timeout: 180000 });
    step("setup: sample inputs loaded", loaded.status === 201, [loaded.status, loaded.body?.detail]);
    const fields = (await api("/library/fields")).body;
    const form = fields.find((f) => f.forms.length)?.forms[0];
    const fillers = fields.filter((f) => f.forms.includes(form)).map((f) => f.key).sort();
    const target = fields.find((f) => f.status === "PUBLISHED").key, alias = `Browser alias ${Date.now().toString(36)}`;
    const a = await api(`/library/fields/${encodeURIComponent(target)}/aliases`, { method: "POST", data: { alias } });
    step("setup: an alias is added to a released field", a.status < 300, a.status);

    for (const [w, h] of [[1440, 900], [400, 860]]) {
      await p.setViewportSize({ width: w, height: h });
      await p.goto(`${BASE}/library/fields`); await p.waitForLoadState("networkidle");
      await p.getByRole("textbox", { name: "Search fields" }).waitFor({ timeout: 30000 });
      const placeholder = await p.getByRole("textbox", { name: "Search fields" }).getAttribute("placeholder");
      step(`C3.13 BR-3 (${w}): the search box says it finds an alias or a form code`, /alias/.test(placeholder) && /form code/.test(placeholder), placeholder);
      const spaced = (await search(form)).sort(), tight = (await search(form.replace(/\s+/g, "").toLowerCase())).sort();
      step(`C3.13 BR-3 pass (${w}): "${form}" lists exactly the fields that form fills, typed with or without the space`, spaced.length > 0 && spaced.join() === fillers.join() && tight.join() === spaced.join(), [spaced.length, tight.length, fillers.length]);
      const byAlias = await search(alias.toLowerCase());
      step(`C3.13 BR-3 pass (${w}): the alias, typed in lower case, finds its field and only it`, byAlias.length === 1 && byAlias[0] === target, byAlias);
      if (w === 1440) { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations; step("axe: the searched Fields list has no WCAG A/AA violation", !v.length, v.map((x) => x.id).join(", ")); }
      const none = await search("zz-no-such-thing-zz");
      step(`C3.13 BR-3 fail (${w}): a search that matches nothing shows no row`, none.length === 0, none.length);
    }
    step("no page error", !errs.length, errs.join(" | "));
  } catch (e) { step("ran to the end", false, e.stack); }
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})();
