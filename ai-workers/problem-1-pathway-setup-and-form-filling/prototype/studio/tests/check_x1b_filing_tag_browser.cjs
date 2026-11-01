// X1b (P-208, founder on the tech lead's recommendation, #173): the Programs list card shows each combination's filing
// method as a small tag: PDF only · Online only · Mixed. The words are the catalogue's C1.6 filing (engine/channels.ts,
// never recounted on the page); no tag while a combination has no form lines. Walked in a real browser; axe (WCAG 2.2
// AA). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_x1b 4444 start && node studio/tests/check_x1b_filing_tag_browser.cjs 4444
const fs = require("node:fs"); const path = require("node:path");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4444);
const BASE = `http://localhost:${PORT}`;
const SHOTS = path.resolve(__dirname, "..", "..", "..", "product", "screens", "F1-setup", "screenshots", "x1b"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${typeof detail === "string" ? detail.slice(0, 300) : JSON.stringify(detail).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  if (!(await api("/demo/status")).body?.loaded) step("setup: the sample loads", (await api("/demo/load", { method: "POST" })).status === 201);
  const rows = async () => (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.filter((r) => r.combinationId);
  const card = (label) => p.locator(`article[data-label="${label}"]`);
  const tagOf = async (label) => { const t = card(label).locator("[data-filing-tag]"); return (await t.count()) ? { tag: await t.getAttribute("data-filing-tag"), shown: (await t.locator("[aria-hidden]").innerText()).trim(), title: await t.getAttribute("title") } : null; };
  const openList = async () => { await p.goto(`${BASE}/?f=all`); await p.locator("article[data-label]").first().waitFor({ timeout: 15000 }); };

  // ---------------------------------------------------------------- every card: the tag is the catalogue's filing
  await openList();
  const all = await rows();
  const bad = [];
  for (const r of all) {
    if (!(await card(r.label).count())) continue;
    const t = await tagOf(r.label);
    const want = r.filing ? (r.filing.startsWith("Mixed") ? "Mixed" : r.filing) : null;
    if ((t?.tag ?? null) !== want || (t && t.shown !== want)) bad.push(`${r.label}: tag ${t?.shown} vs filing ${r.filing}`);
  }
  step("C1.6 X1b (P-208): every card's filing tag is the catalogue's filing (PDF only · Online only · Mixed)", bad.length === 0 && all.some((r) => r.filing), bad.length ? bad : all.map((r) => `${r.label}: ${r.filing}`));
  const none = all.find((r) => !r.filing);
  step("C1.6 X1b fail: a combination with no form lines has no filing tag (nothing is guessed)", !!none && (await tagOf(none.label)) === null, none?.label);
  const pdf = all.find((r) => r.filing === "PDF only");
  step("C1.6 X1b: a PDF-only combination's card reads 'PDF only'", !!pdf && (await tagOf(pdf.label))?.shown === "PDF only", pdf?.label);
  await p.screenshot({ path: path.join(SHOTS, "01-cards-filing-tags-1440.png") });

  // ---------------------------------------------------------------- Mixed and Online only, set through the forms API
  const forms = (await api(`/combinations/${pdf.combinationId}/summary`)).body.forms.filter((f) => !f.document);
  const setChannel = (code, channel) => api(`/combinations/${pdf.combinationId}/forms/${encodeURIComponent(code)}/channel`, { method: "PATCH", data: { channel } });
  if (forms.length >= 2) {
    const r1 = await setChannel(forms[0].code, "ONLINE");
    await openList();
    const mixed = await tagOf(pdf.label);
    step("C1.6 X1b: one line online and one PDF → the card reads 'Mixed', with the full words on hover and for screen readers", r1.status === 200 && mixed?.shown === "Mixed" && /Mixed: online and PDF/.test(mixed.title ?? "") && /Filed: Mixed: online and PDF/.test(await card(pdf.label).locator("[data-filing-tag] .sr-only").innerText()), { status: r1.status, mixed });
    // Back to one channel: every form line on PDF upload again (IRCC takes each of these as a PDF).
    for (const f of forms) await setChannel(f.code, "PDF_UPLOAD");
  }
  await openList();
  const online = await tagOf(pdf.label);
  const after = (await rows()).find((r) => r.label === pdf.label).filing;
  step("C1.6 X1b: every form line on PDF upload again → the card reads 'PDF only', the same as the catalogue", after === "PDF only" && online?.shown === "PDF only", { online, after });
  step("C1.6 X1b fail: the card does not keep 'Mixed' once the lines are on one channel again", online?.shown !== "Mixed");

  const ax = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  step("axe: the Programs cards with filing tags have no WCAG A/AA violation", ax.violations.length === 0, ax.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  for (const w of [400, 1024]) { await p.setViewportSize({ width: w, height: 900 }); await openList(); step(`C1.6 X1b: at ${w} px the tag fits the card (no sideways scroll)`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1))); }
  step("no page errors", errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
