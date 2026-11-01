// qa after-merge 1 Nov, third round (main 63168762): a person's walk, headless, of #210 (X1 C3, the Overview's setup strip)
// and the header beside it. What the builder's check_x1_overview_strip_browser.cjs does not walk:
//   * every sample combination in setup: does the header's "Next step" name the same thing as the strip's ● Next item?
//     (QA-119; fails until #216 merges, then this is its retest),
//   * the immigration expert and a firm user (wrong role by URL) on the Overview,
//   * 200 % zoom (720 × 450 CSS px) and 1024 px: no sideways scroll, the first open link reachable by Tab,
//   * reload and Back after following a strip link: the strip comes back the same.
// Sample data (Load sample, the strip is not what loads it), no STUDIO_*_LIVE, US$0.
//   zsh studio/tools/isolated.sh qa_wk 4472 start && node studio/tests/qa/check_qa_am_1101c_walk.cjs 4472
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4472), BASE = `http://localhost:${PORT}`;
const SHOTS = path.resolve(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-11-01-after-merge-4"); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const step = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : ` — ${(typeof d === "string" ? d : JSON.stringify(d)).slice(0, 400)}`}`); };
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").replace(/[→]/g, "").trim().toLowerCase();

(async () => {
  const b = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : { channel: "chrome" }) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (u, actor = "user-A", method = "GET") => { const r = await p.request.fetch(`${BASE}/api${u}`, { method, headers: { "x-actor": actor } }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const actAs = async (a) => { await p.goto(BASE); await p.evaluate((x) => localStorage.setItem("xr-actor", x), a); };
  await actAs("user-A");
  if (!(await api("/demo/status")).body?.loaded) step("setup: Load sample", (await api("/demo/load", "user-A", "POST")).status === 201);
  const rows = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.filter((r) => r.combinationId);
  const strip = () => p.locator("[data-setup-strip]");
  const header = async () => {
    const box = p.locator("p", { hasText: /^Next step$/ }).first().locator("xpath=../..");
    const btn = box.locator("[data-next-step]");
    return (await btn.count()) ? await btn.innerText() : await box.innerText();
  };

  // ---------------------------------------------------------------- QA-119 retest: one next step per page
  const disagree = [], agree = [];
  for (const r of rows) {
    await p.goto(`${BASE}/c/${r.combinationId}/overview`);
    await strip().waitFor({ timeout: 15000 }).catch(() => {});
    if (!(await strip().count()) || (await strip().getAttribute("data-setup-strip")) === "retired") continue;
    const first = p.locator("[data-step-row][data-mark=next] [data-open-item], [data-step-row][data-mark=waiting] [data-open-item]").first();
    if (!(await first.count())) continue; // Live, nothing open
    const s = await first.innerText(), h = await header();
    (norm(h).includes(norm(s)) || norm(s).includes(norm(h).replace(/^next step /, "")) ? agree : disagree).push(`${r.label}: header "${norm(h)}" · strip "${norm(s)}"`);
  }
  step("QA-119 C11.10 (P-157, P-161): on every combination in setup the header's Next step and the strip's ● Next item say the same thing", disagree.length === 0, { disagree, agree: agree.length });
  if (disagree.length) await p.screenshot({ path: path.join(SHOTS, "01-qa119-header-vs-strip-1440.png") });

  const vv = rows.find((r) => r.nodeKey === "individual.visitors.visitor_visa")?.combinationId;
  // ---------------------------------------------------------------- 200 % zoom and 1024 px, keyboard
  for (const [w, h, name] of [[720, 450, "200% zoom"], [1024, 768, "1024 px"]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(`${BASE}/c/${vv}/overview`); await strip().waitFor();
    const side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    step(`C11.10 X1 ${name}: the page does not scroll sideways with the strip`, side <= 0, side);
    let reached = null;
    for (let i = 0; i < 60 && !reached; i++) { await p.keyboard.press("Tab"); reached = await p.evaluate(() => document.activeElement?.getAttribute("data-open-item")); }
    step(`C11.10 X1 ${name} keyboard: Tab reaches a strip link`, !!reached, reached);
    const ring = await p.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
    step(`C11.10 X1 ${name} keyboard: the focused strip link shows a ring`, ring && ring !== "none", ring);
    await p.screenshot({ path: path.join(SHOTS, `02-strip-${w}.png`), fullPage: true });
    const ax = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe ${name}: Overview clean`, ax.violations.length === 0, ax.violations.map((v) => v.id));
  }
  await p.setViewportSize({ width: 1440, height: 900 });

  // ---------------------------------------------------------------- follow a link, Back, reload: same strip
  await p.goto(`${BASE}/c/${vv}/overview`); await strip().waitFor();
  const before = await strip().innerText();
  await p.locator("[data-open-item]").first().click(); await p.waitForURL(/\/(forms|documents|questionnaires|review)/);
  await p.goBack(); await strip().waitFor();
  step("C11.10 X1 Back after a strip link: the Overview strip is shown again, unchanged", (await strip().innerText()) === before);
  await p.reload(); await strip().waitFor();
  step("C11.10 X1 reload: the strip is unchanged", (await strip().innerText()) === before);

  // ---------------------------------------------------------------- the immigration expert, and a firm user by URL
  await actAs("user-C"); await p.goto(`${BASE}/c/${vv}/overview`); await strip().waitFor();
  step("C11.10 X1 expert: the strip is shown and its legend reads", /✓ done/.test(await strip().innerText()));
  for (const a of ["user-O", "user-P"]) {
    await actAs(a); await p.goto(`${BASE}/c/${vv}/overview`); await p.waitForLoadState("networkidle");
    const t = await p.locator("main").innerText().catch(() => "");
    const shown = await strip().count();
    step(`C11.10 X1 wrong role (${a}) by URL: no setup strip, and the page says why in words`, shown === 0 && t.trim().length > 0 && !/undefined|null|\b[45]\d\d\b/.test(t), { shown, text: t.slice(0, 160) });
  }
  step("no page error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
