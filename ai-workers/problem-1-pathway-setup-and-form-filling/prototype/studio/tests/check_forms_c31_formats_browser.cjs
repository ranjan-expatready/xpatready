// C3.1 (P-162) in the browser at 1440 and 1024 px: every Fields row shows "Format: …" (or why there is none) under its
// meaning; the UCI field page has a Format panel with each rule, the form field that sets it and the form's own words;
// rules not checked on answers say why; no page says "box" (P-63); no sideways scroll; axe (WCAG 2.2 AA). Sample inputs;
// no AI call (US$0). Screenshots into product/screens/C3.1-field-formats/.
//   zsh studio/tools/isolated.sh forms_c31ui 4452 start && node studio/tests/check_forms_c31_formats_browser.cjs 4452
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4452), BASE = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "..", "..", "..", "product", "screens", "C3.1-field-formats"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const go = async (u) => { await p.goto(`${BASE}${u}`); await p.waitForLoadState("networkidle"); await p.waitForFunction(() => !!document.querySelector("main h1"), null, { timeout: 30000 }); };
  const fits = () => p.evaluate(() => { const f = document.querySelector("main table").parentElement; return { ok: f.scrollWidth <= f.clientWidth + 1, scroll: f.scrollWidth, width: f.clientWidth }; });
  const axe = async (name) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations; step(`axe: ${name} has no WCAG A/AA violation`, !v.length, v.map((x) => `${x.id}: ${x.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    const loaded = await api("/demo/load", { method: "POST" });
    step("setup: sample inputs loaded (or already on this copy)", loaded.status === 201 || loaded.status === 409, loaded.status);
    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      await p.setViewportSize({ width: w, height: h });
      await go("/library/fields");
      await p.waitForSelector("main table tbody tr [data-format]", { timeout: 30000 });
      const rows = await p.locator("main table tbody tr").count(), formatted = await p.locator("main table tbody tr [data-format]").count();
      step(`C3.1 P-162 pass (${w}): every Fields row shows its format or why it has none`, rows > 100 && formatted === rows, `${formatted} of ${rows}`);
      const text = await p.locator("main").innerText();
      step(`C3.1 P-63 fail (${w}): the Fields page never says "box"`, !/\bbox(es)?\b/i.test(text), text.match(/.{0,40}\bbox(es)?\b.{0,40}/i)?.[0]);
      const f = await fits(); step(`C3.1 QA-39 (${w}): the Fields table fits without sideways scroll`, f.ok, JSON.stringify(f));
      await p.getByLabel("Search fields").fill("uci");
      const uci = p.locator("main table tbody tr", { hasText: "person.uci" });
      await uci.waitFor({ timeout: 30000 });
      step(`C3.1 P-162 pass (${w}): the UCI row reads "Format: At most 10 characters · Digits only"`, /Format: At most 10 characters · Digits only/.test(await uci.innerText()), await uci.innerText());
      if (w === 1440) { await p.screenshot({ path: path.join(SHOTS, "fields-list-1440.png") }); await axe("Fields with formats"); }
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    await go("/library/fields/person.uci");
    const panel = p.locator("[data-format-panel]");
    await panel.locator("table").waitFor({ timeout: 30000 });
    const pt = await panel.innerText();
    step("C3.1 P-162 pass: the UCI field page has a Format panel with each rule, its form field and the form's own words", /Digits only/.test(pt) && /IMM 1295 \(09-2023\), "UCI" \(the form's own check\)/.test(pt) && /The correct format is: Numeric characters/.test(pt) && /At most 10 characters/.test(pt), pt.slice(0, 260));
    step("C3.1 P-63 fail: the Format panel never says \"box\" or \"maxChars\"", !/\bbox(es)?\b|maxChars/i.test(pt), pt.match(/.{0,30}(\bbox|maxChars).{0,30}/i)?.[0]);
    await panel.screenshot({ path: path.join(SHOTS, "field-format-panel-1440.png") });
    await axe("UCI field page");
    // A phone field: the pieces the form splits out are listed as not checked, with why (review M2).
    const phones = (await api("/library/fields")).body.filter((x) => x.key === "person.phone_number" && x.format?.state === "read");
    if (phones.length) {
      await go(`/library/fields/${encodeURIComponent(phones[0].key)}`);
      const ph = await p.locator("[data-format-panel]").innerText();
      step("C3.1 M2 pass: a phone field lists the rules it does not check on answers, with why", /not checked on answers here/.test(ph) && /a piece the form splits out/.test(ph), ph.slice(0, 260));
    } else step("C3.1 M2 pass: a phone field with a read format exists in the sample", false, "none found");
    step("no page error", !errs.length, errs.join(" | "));
  } finally { await b.close(); }
  console.log(`\n${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
