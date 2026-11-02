// C3.13 in the browser at 1440 and 1024 px (screens lane, swarm builder J5; Screen 04 BR-4): Fields, Sections and Document
// types each offer a Combination chooser; with one chosen the list keeps only what it uses, says the totals ("uses 18
// sections · 0 reused · 18 new here") and marks each row Reused or New here; the choice stays in the address; a
// combination that uses nothing says so. Sample inputs; no AI call (US$0). Screenshots into
// product/screens/04-shared-library/screenshots/c313/, axe (WCAG 2.2 AA) on each state.
//   zsh studio/tools/isolated.sh screens_reuseui 4448 start && node studio/tests/check_c313_reuse_browser.cjs 4448
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4448), BASE = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "..", "..", "..", "product", "screens", "04-shared-library", "screenshots", "c313"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data, ...(init.timeout ? { timeout: init.timeout } : {}) }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const go = async (u) => { await p.goto(`${BASE}${u}`); await p.waitForLoadState("networkidle"); await p.waitForFunction(() => !!document.querySelector("main h1"), null, { timeout: 30000 }); };
  const settle = async () => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(300); };
  const main = () => p.locator("main").innerText();
  const axe = async (name) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations; step(`axe: ${name} has no WCAG A/AA violation`, !v.length, v.map((x) => `${x.id}: ${x.nodes.length}`).join(", ")); };
  const fits = () => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    // Nightly 41381724752 (Mac): the sample load answered something other than 201 on a fresh copy (cause not known yet);
    // the step now records [status, detail] so the next run shows why. 180 s as the other suites allow for this setup.
    const loaded = await api("/demo/load", { method: "POST", timeout: 180000 });
    step("setup: sample inputs loaded", loaded.status === 201, [loaded.status, loaded.body?.detail]);
    const combos = (await api("/library/reuse/sections")).body.combinations;
    const vv = combos.find((c) => c.key === "vv.single");
    const s0 = (await api("/library/sections")).body.find((s) => s.used_in.includes("With an LMIA"));

    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      await p.setViewportSize({ width: w, height: h });
      await go("/library/sections");
      const all = await p.locator("main table tbody tr").count();
      const chooser = p.getByRole("combobox", { name: "Combination" });
      step(`C3.13 (${w}): Sections offers a Combination chooser, All combinations first, each with how many it uses`, (await chooser.count()) === 1 && /All combinations/.test(await chooser.locator("option").first().innerText()) && /With an LMIA \(18 used\)/.test(await chooser.innerText()), await chooser.innerText());
      await chooser.selectOption("wp.family"); await settle();
      let t = await main();
      step(`C3.13 BR-4 pass (${w}): with a combination chosen, the totals show and every row is marked New here`, /With an LMIA uses 18 sections · 0 reused · 18 new here/.test(t) && (await p.locator("main table tbody tr").count()) === 18 && (await p.locator("main table tbody tr", { hasText: "New here" }).count()) === 18, t.slice(0, 400));
      step(`C3.13 (${w}): the choice is kept in the address`, /[?&]combination=wp\.family/.test(p.url()), p.url());
      await p.screenshot({ path: path.join(SHOTS, `sections-lmia-${w}.png`), fullPage: true });
      step(`C3.13 (${w}): no sideways scroll with the chooser and totals`, await fits());
      await axe(`Sections filtered to a combination (${w})`);
      await chooser.selectOption("vv.single"); await settle();
      t = await main();
      step(`C3.13 BR-4 fail (${w}): a combination that uses nothing says so, and lists nothing`, /Visitor visa uses no sections yet/.test(t) && (await p.locator("main table").count()) === 0, t.slice(0, 300));
      await chooser.selectOption(""); await settle();
      step(`C3.13 (${w}): All combinations brings the whole list back, without marks or totals`, (await p.locator("main table tbody tr").count()) === all && !/new here|Reused/.test(await main()) && !/combination=/.test(p.url()));
    }
    await p.setViewportSize({ width: 1440, height: 900 });

    // A second combination reuses one section: marked Reused, its title naming who brought it in.
    step("setup: Visitor visa picks a section the LMIA combination uses", (await api(`/combinations/${vv.id}/sections/${s0.key}`, { method: "POST", data: {} })).status === 201);
    await go("/library/sections?combination=vv.single");
    const t = await main();
    const mark = p.locator("main table tbody tr").first().getByText("Reused", { exact: true });
    step("C3.13 BR-4 pass: opened from the address, the second combination's section is Reused, brought in by the first", /Visitor visa uses 1 section · 1 reused · 0 new here/.test(t) && (await mark.count()) === 1 && /from With an LMIA/.test(await p.locator("main table tbody tr").first().locator("[data-reused]").innerText()), t.slice(0, 300));
    await p.screenshot({ path: path.join(SHOTS, "sections-visitor-reused-1440.png"), fullPage: true });
    await axe("Sections with a Reused row");
    await go("/library/fields?combination=vv.single");
    const ft = await main();
    step("C3.13 BR-4 pass: Fields shows the same for the fields that section asks (all Reused)", /Visitor visa uses \d+ fields? · (\d+) reused · 0 new here/.test(ft) && (await p.locator("main table tbody tr", { hasText: "New here" }).count()) === 0 && (await p.locator("main table tbody tr").count()) > 0, ft.slice(0, 300));
    await p.screenshot({ path: path.join(SHOTS, "fields-visitor-1440.png"), fullPage: false });
    await axe("Fields filtered to a combination");
    await go("/library/documents?combination=wp.family");
    const dt = await main();
    // The number is read from the API (where used), not written in: the sample's checklist can change (it was 26, then 22).
    const lmiaTypes = (await (await p.request.fetch(`${BASE}/api/library/document-types`, { headers: { "x-actor": "user-A" } })).json()).filter((t) => t.used_in.includes("With an LMIA")).length;
    step("C3.13 BR-4 pass: Document types shows the totals and marks for the chosen combination (as many as where used counts)", lmiaTypes > 0 && new RegExp(`With an LMIA uses ${lmiaTypes} document types · 0 reused · ${lmiaTypes} new here`).test(dt) && (await p.locator("main table tbody tr", { hasText: "New here" }).count()) === lmiaTypes, `${lmiaTypes}: ${dt.slice(0, 300)}`);
    await p.screenshot({ path: path.join(SHOTS, "document-types-lmia-1440.png"), fullPage: false });
    await axe("Document types filtered to a combination");
    await go("/library/fields?combination=no.such");
    const said = await p.getByRole("alert").filter({ hasText: "not in this workspace" }).waitFor({ timeout: 20000 }).then(() => true, () => false);
    step("C3.13 fail: an unknown combination in the address is said in words, not an empty or broken page", said && (await p.locator("main table tbody tr").count()) > 0, (await main()).slice(0, 300));
    step("no page error", !errs.length, errs.join(" | "));
  } catch (e) { step("ran to the end", false, e.stack); }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
