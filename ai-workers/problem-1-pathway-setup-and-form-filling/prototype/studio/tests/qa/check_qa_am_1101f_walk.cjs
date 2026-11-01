// qa after-merge 1 Nov, seventh round (main 73396df2; qa-2): a person's walk of what merged since 25cefb67 that the
// builders' own checks do not walk as a person, followed through the Visitor visa (P-220):
//   * #113 C10.1: on a blank copy, the author opens Demo › "Load the configured checkpoint…", reads what it brings, loads
//     it, reads the row-by-row result; the menu then says to reset first; a second load by API is refused in words.
//   * #275 C11.12 (P-209, X1c): after the checkpoint, the Visitor visa's "Who can be in this application" names the
//     principal "Principal applicant" (no bare "Applicant" label for the role).
//   * #113 C3.11: on the Visitor visa's Documents tab, every form line filed as a hand-signed scan shows its
//     "<form> signed by hand and scanned" line for the principal (reported, with the lines found).
//   * 1440, 1024 and 400 px on the result dialog, axe (serious and critical) on the dialog and the Documents tab.
// Blank isolated copy (the checkpoint is under test, so no Load sample first, P-33), no STUDIO_*_LIVE, US$0.
//   zsh studio/tools/isolated.sh qa_jn 4474 start && node studio/tests/qa/check_qa_am_1101f_walk.cjs 4474 xr_studio_qa_jn
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4474), BASE = `http://localhost:${PORT}`;
const SHOTS = path.resolve(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-11-01-after-merge-7"); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const step = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : ` — ${(typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`}`); };
const info = (n, d) => console.log(`INFO  ${n} — ${(typeof d === "string" ? d : JSON.stringify(d)).slice(0, 900)}`);

(async () => {
  const b = await chromium.launch({ headless: !process.env.QA_HEADED, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : { channel: "chrome" }) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (u, actor = "user-A", method = "GET", data) => { const r = await p.request.fetch(`${BASE}/api${u}`, { method, timeout: 600000, headers: { "x-actor": actor, ...(data !== undefined ? { "content-type": "application/json" } : {}) }, data: data === undefined ? undefined : JSON.stringify(data) }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const axe = async (what, include) => { let a = new AxeBuilder({ page: p }); if (include) a = a.include(include); const r = await a.analyze(); const bad = r.violations.filter((v) => ["serious", "critical"].includes(v.impact)); step(`${what}: axe has no serious or critical violation`, bad.length === 0, bad.map((v) => `${v.id}: ${v.nodes.length}`)); };
  await p.goto(BASE); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A")); await p.reload();
  step("setup: the copy is blank (nothing loaded)", (await api("/demo/status")).body?.programsExist === false);

  // ---- C10.1: the configured checkpoint through the Demo menu
  await p.getByRole("button", { name: /^Demo/ }).click();
  const conf = p.getByRole("menuitem", { name: /Load the configured checkpoint/ });
  step("C10.1: the Demo menu offers \"Load the configured checkpoint…\"", await conf.isVisible().catch(() => false));
  await conf.click();
  const dlg = p.getByRole("dialog");
  await dlg.waitFor();
  const brings = (await dlg.innerText()).replace(/\s+/g, " ");
  step("C10.1: the dialog says what it brings and that rules are not bypassed, before anything happens", /Load the configured checkpoint\?/.test(brings) && /left undone and says why/.test(brings), brings.slice(0, 300));
  await p.screenshot({ path: path.join(SHOTS, "c101-confirm-1440.png") });
  await axe("C10.1 confirm dialog", "[role=dialog]");
  const t0 = Date.now();
  await dlg.getByRole("button", { name: /Load the configured checkpoint/ }).dblclick(); // a person's double click
  const result = p.locator("[data-conf-result]");
  await result.waitFor({ timeout: 900000 });
  const secs = Math.round((Date.now() - t0) / 1000);
  const rows = await p.locator("[data-conf-row]").evaluateAll((rs) => rs.map((r) => ({ row: r.getAttribute("data-conf-row"), status: r.getAttribute("data-status"), text: r.innerText.replace(/\s+/g, " ").slice(0, 160) })));
  info(`C10.1: result rows after ${secs} s`, rows.map((r) => `${r.row}:${r.status}`));
  for (const r of rows.filter((r) => r.status !== "done")) info(`C10.1 row ${r.row} (${r.status})`, r.text);
  step("C10.1: the result lists the DEMO.md rows, each with a status in words", rows.length >= 10 && rows.every((r) => r.status), rows.length);
  step("C10.1: a double click on Load loaded once (one result, no error toast)", (await p.locator("[data-conf-result]").count()) === 1 && !(await p.getByText(/already has names/).isVisible().catch(() => false)));
  for (const w of [1440, 1024, 400]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(200);
    const over = await p.locator("[role=dialog]").evaluate((d) => d.scrollWidth - d.clientWidth);
    step(`C10.1 @${w}: the result dialog has no sideways scroll`, over <= 1, over);
    await p.screenshot({ path: path.join(SHOTS, `c101-result-${w}.png`) });
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await axe("C10.1 result dialog", "[role=dialog]");
  await p.keyboard.press("Escape");
  step("C10.1: Esc closes the result", !(await result.isVisible().catch(() => false)));
  await p.getByRole("button", { name: /^Demo/ }).click();
  const again = await p.getByRole("menuitem", { name: /Load the configured checkpoint/ }).innerText();
  step("C10.1 fail: once loaded, the menu says to reset first", /reset first/i.test(again), again);
  await p.keyboard.press("Escape");
  const twice = await api("/demo/load", "user-A", "POST", { sample: "configured" });
  step("C10.1 fail: a second load by API is refused in words (409), nothing doubled", twice.status === 409 && /Reset/.test(twice.body?.detail ?? ""), twice);
  const wrong = await api("/demo/load", "user-P", "POST", { sample: "configured" });
  info("C10.1: the client (user-P) calling the loader", { status: wrong.status, detail: wrong.body?.detail });

  // ---- C11.12 and C3.11 on the Visitor visa
  const DB = process.argv[3] ?? "xr_studio_qa_jn";
  const vv = require("node:child_process").execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", DB, "-Atc", "select id from combination where combination_key='vv.single'"]).toString().trim();
  step("setup: the Visitor visa combination is found", !!vv, vv);
  if (vv) {
    await p.goto(`${BASE}/c/${vv}/questionnaires`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
    const body = (await p.locator("main").innerText()).replace(/\s+/g, " ");
    const who = body.match(/Who can be in this application.{0,400}/)?.[0] ?? "";
    info("C11.12: the Visitor visa's people as a person reads them", who.slice(0, 400) || body.slice(0, 400));
    step("C11.12 (P-209): the principal's label reads \"Principal applicant\"", /Principal applicant/.test(body), who.slice(0, 200));
    await p.screenshot({ path: path.join(SHOTS, "c1112-vv-people-1440.png") });

    await p.goto(`${BASE}/c/${vv}/documents?role=principal`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
    const docs = (await p.locator("main").innerText()).replace(/\s+/g, " ");
    const scans = docs.match(/[A-Z]{2,4} ?\d{4}[A-Z0-9 ]{0,6} signed by hand and scanned/g) ?? [];
    info("C3.11: signed-scan lines on the Visitor visa principal's checklist", scans);
    await p.screenshot({ path: path.join(SHOTS, "c311-vv-documents-1440.png"), fullPage: true });
    await axe("C3.11 Visitor visa Documents tab");
  }
  step("no page errors in the walk", errs.length === 0, errs.slice(0, 3));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(2); });
