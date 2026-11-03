// F6 / C4.6 (runtime lane; P-62 §7, P-102, P-143): on the Preview tab, each person's Forms panel says what that person
// gets per channel ("Principal applicant gets: 1 filled on the portal (later wave) · 4 filled PDFs to upload · 1 PDF to
// print, sign and mail · 2 PDFs to sign"), the Online group says the portal screens come in a later wave and that no PDF
// is made, and each line that a person signs carries its signature in words. Walked in a real browser after the author
// sets the lines on the Forms tab's own route; screenshots at 1440 and 1024 in
// screens/W1-questions-and-documents/screenshots/c46-preview-channels/, axe (WCAG 2.2 AA) on each state. US$0.
//   zsh studio/tools/isolated.sh runtime_c46 4435 start && node studio/tests/check_c46_preview_channels_browser.cjs 4435 xr_studio_runtime_c46
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4435), DB = process.argv[3] ?? "xr_studio_runtime_c46";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "c46-preview-channels"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const KEYS = /\b[a-z]+_[a-z_]+\b/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); let body = null; try { body = await r.json(); } catch { body = null; } return { status: r.status(), body }; };
  // Waits fail loudly: a page that never settles is a failure, not a pass.
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }); await p.waitForTimeout(300); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  await p.goto(BASE); await p.evaluate(() => { localStorage.setItem("xr-actor", "user-A"); });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const go = async (person) => { await p.goto(`${BASE}/c/${wp}/preview?person=${person}`); await p.locator("[data-preview]").waitFor(); await settle(); };

  // ======================================================== before: PDFs only, nothing to sign, no Online group
  await go("principal");
  const line0 = await p.locator("[data-outputs-line]").innerText();
  step("C4.6 pass: the principal's Forms panel counts what they get per channel", /Principal applicant gets: 5 filled PDFs to upload/.test(line0) && !/document checklist/.test(line0), line0);
  // C11.11 (QA-101): the sample's checklists (IMM 5488, IMM 5905) are its sources, never form lines, so the panel neither
  // lists nor counts them (before: "2 document checklists (read, not filed)").
  step("C4.6 Major 1 fail (C11.11): a document checklist is never counted as a filled PDF, nor listed as a form line", !/7 filled PDFs/.test(line0) && (await p.locator('[data-preview-form="IMM 5488"], [data-preview-form="IMM 5905"]').count()) === 0, line0);
  step("C4.6 fail: with no signed or Online line, the count names nothing to sign and no portal", !/to sign|portal/.test(line0) && (await p.locator('[data-output-group="ONLINE"]').count()) === 0 && (await p.locator("[data-to-sign]").count()) === 0, line0);

  // ======================================================== the author sets Online, Paper and a hand-signed upload
  const set = (code, data) => api(`/combinations/${wp}/forms/${encodeURIComponent(code)}/channel`, { method: "PATCH", data });
  const rs = [await set("IMM 1295", { channel: "ONLINE" }), await set("IMM 5707", { channel: "PAPER" }), await set("IMM 5257 SCH1", { channel: "PDF_UPLOAD", signature: "HAND_SCANNED" })];
  step("setup: three lines changed on the Forms tab's route", rs.every((r) => r.status < 300), rs.map((r) => r.status).join(","));
  await go("principal");
  const line1 = await p.locator("[data-outputs-line]").innerText();
  step("C4.6 pass: the count names the portal (later wave), the PDFs to upload, to print and mail, and the PDFs to sign", /1 filled on the portal \(later wave\)/.test(line1) && /3 filled PDFs to upload/.test(line1) && /1 PDF to print, sign in pen and mail/.test(line1) && /1 PDF to sign by hand and scan/.test(line1) && !/document checklist/.test(line1), line1);
  const onlineGroup = p.locator('[data-output-group="ONLINE"]');
  const note = await onlineGroup.locator("[data-later-wave]").innerText();
  step("C4.6 pass: the Online group says the portal screens come in a later wave and that no PDF is made", /later wave/.test(note) && /no PDF/.test(note) && (await onlineGroup.locator('[data-preview-form="IMM 1295"]').count()) === 1, note);
  const online1295 = await onlineGroup.locator('[data-preview-form="IMM 1295"]').innerText();
  step("C11.1 pass: the Online line itself says 'Online (later wave)' (not only its group's heading) and offers no Fill PDF", /Online \(later wave\)/.test(online1295) && !/Fill PDF/.test(online1295), online1295.slice(0, 160));
  step("C11.1 fail: a line filed another way (Paper, PDF upload) carries no later-wave mark", (await p.locator('[data-output-group="PAPER"] [data-later-wave-pill], [data-output-group="PDF_UPLOAD"] [data-later-wave-pill]').count()) === 0);
  step("C4.6 pass: the Paper line says it is signed in pen", /Signed in pen/.test(await p.locator('[data-output-group="PAPER"] [data-preview-form="IMM 5707"] [data-to-sign]').innerText()));
  step("C4.6 pass: the hand-signed upload says so", /Signed by hand and scanned/.test(await p.locator('[data-output-group="PDF_UPLOAD"] [data-preview-form="IMM 5257 SCH1"] [data-to-sign]').innerText()));
  // C11.11: the unsigned PDF uploads are now IMM 5475 and IMM 5476 (filed once for the application), not the checklist.
  const plainUploads = p.locator('[data-preview-form="IMM 5475"], [data-preview-form="IMM 5476"]');
  step("C4.6 fail: a PDF upload with no signature carries no signature pill", (await plainUploads.count()) > 0 && (await plainUploads.locator("[data-to-sign]").count()) === 0, await plainUploads.count());
  const forms = await p.locator("section[aria-labelledby=pv-f]").innerText();
  step("C4.6 fail-guard: no system name in the Forms panel", !KEYS.test(forms), forms.match(KEYS)?.[0]);
  step("C4.6 m1 fail-guard: no decision number in the Forms panel", !/P-\d+/.test(forms), forms.match(/P-\d+/)?.[0]);
  await state("principal-channels");

  // ======================================================== another person: their own lines
  await go("spouse");
  const line2 = await p.locator("[data-outputs-line]").innerText();
  step("C4.6 pass: the spouse's count is their own (their IMM 1295 on the portal, IMM 5707 in pen)", /^Spouse or partner gets:/.test(line2) && /1 filled on the portal/.test(line2) && /PDF to print, sign in pen and mail/.test(line2), line2);
  step("C4.6 fail: a form filed once for the application is not counted for the spouse", (await p.locator('[data-preview-form="IMM 5475"]').count()) === 0);
  step("C4.6 Major 2 fail: before it is Online, the couple's IMM 5409 has no later-wave words", (await p.locator('[data-preview-form="IMM 5409"] [data-later-wave-line]').count()) === 0);
  step("setup: IMM 5409 (filed once for the couple) set to Online", (await set("IMM 5409", { channel: "ONLINE" })).status < 300);
  await go("spouse");
  const coupleLine = await p.locator('[data-output-group="COUPLE"] [data-preview-form="IMM 5409"]').innerText();
  step("C4.6 Major 2 pass: an Online line filed for the couple says the portal screens come in a later wave", /later wave/.test(coupleLine) && /no PDF/.test(coupleLine), coupleLine);
  await state("spouse-channels");

  // ======================================================== the released preview keeps the released lines
  await p.goto(`${BASE}/c/${wp}/preview?person=principal&release=1`); await p.locator("[data-preview]").waitFor(); await settle();
  step("C4.6 fail: the released preview shows no Online group until the change is released", (await p.locator('[data-output-group="ONLINE"]').count()) === 0 && !/portal/.test(await p.locator("[data-outputs-line]").innerText()));

  step("no page errors", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
