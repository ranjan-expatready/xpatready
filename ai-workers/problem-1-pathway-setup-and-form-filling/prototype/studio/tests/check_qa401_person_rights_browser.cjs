// QA-401 (Major, journey; qa walk 0; P-456 (3), P-484: a change of person by the frame's picker is a login, and every
// open page re-reads the current person's rights). On the representative's review (C8.3), a person change in the frame's
// picker kept the previous person's rights until a reload: the Representative read "You can read this review" with no
// Approve, and the other way round an officer saw Approve and was refused 403. Walked at 1440 px in a real browser:
// the Case officer opens round 2 (read-only line, no Approve or Send back); the picker → Representative of record: the
// read-only line is gone and Approve and Send back show; the picker → Case officer: the read-only line is back and no
// Approve shows from the first frame after the change (fail side: a stale Approve could be pressed). The data comes from tests/runtime/setup_c83_walk.ts (the product's own routes), as
// check_c83_review_browser.cjs. No model call (US$0).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_qa401 4447 start && node studio/tests/check_qa401_person_rights_browser.cjs 4447 xr_studio_screens_qa401
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const STUDIO = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2] ?? 4447), DB = process.argv[3] ?? "xr_studio_screens_qa401", BASE = `http://localhost:${PORT}`;
const PSQL = process.env.PSQL || (fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql");
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const tsx = (f) => spawnSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, f), String(PORT), DB], { encoding: "utf8", timeout: 900000, maxBuffer: 1 << 26 });
const T = { timeout: 30000 };
let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) { pass++; console.log(`PASS  ${name}`); } else { fail++; console.log(`FAIL  ${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail).slice(0, 400)}`}`); } };

(async () => {
  if (sql("select count(*) from combination where combination_key='vv.single'") === "0") {
    const done = ["tests/runtime/setup_visitor_visa.ts", "acceptance/lib/setup_vv_m3.ts"].map((f) => `${f}: exit ${tsx(f).status}`);
    ok("setup: a fresh copy gets the released Visitor visa combination", sql("select count(*) from combination where combination_key='vv.single'") !== "0", done);
  }
  const s = tsx("tests/runtime/setup_c83_walk.ts");
  const d = JSON.parse(String(s.stdout).trim().split("\n").pop() || "{}");
  ok("setup: a case with round 2 sent for review, through the product's routes", !!d.caseId && !!d.r2 && !!d.officer && !!d.rep, { exit: s.status, err: String(s.stderr).slice(-400) });
  const browser = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await ctx.addInitScript((a) => { if (!localStorage.getItem("xr-actor")) localStorage.setItem("xr-actor", a); }, d.officer);
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const picker = p.locator('select[aria-label="Simulated person"]');
  const readOnly = p.locator("[data-read-only]"), approve = p.locator("[data-approve]"), back = p.locator("[data-send-back]");
  // Sampled every animation frame from the change on: did Approve ever show for a person who may not decide?
  // Starts at the picker's change event (Approve before it is the previous person's, rightly shown), then every frame.
  const watchApprove = () => p.evaluate(() => { window.__sawApprove = false; window.__watching = true; const sel = document.querySelector('select[aria-label="Simulated person"]'); const tick = () => { if (document.querySelector("[data-approve]")) window.__sawApprove = true; if (window.__watching) requestAnimationFrame(tick); }; sel.addEventListener("change", () => requestAnimationFrame(tick), { once: true }); });
  const stopWatch = () => p.evaluate(() => { window.__watching = false; return window.__sawApprove; });
  try {
    const review = `${BASE}/cases/${d.caseId}/representative-review/${d.r2}`;
    // 1 The Case officer reads round 2: the read-only line, no Approve or Send back.
    await p.goto(review); await readOnly.waitFor(T);
    ok("QA-401: the Case officer reads the review (\"You can read this review\")", (await readOnly.count()) === 1);
    ok("QA-401 fail side: the Case officer has no Approve and no Send back", (await approve.count()) === 0 && (await back.count()) === 0);
    // 2 The frame's picker → the Representative of record, on the same page, no reload.
    await picker.selectOption(d.rep);
    await approve.waitFor(T).catch(() => {});
    ok("QA-401: after the picker's change to the Representative, Approve and Send back show without a reload", (await approve.count()) === 1 && (await back.count()) === 1, { approve: await approve.count(), back: await back.count() });
    ok("QA-401: the officer's read-only line is gone for the Representative", (await readOnly.count()) === 0, await readOnly.allInnerTexts().catch(() => []));
    ok("QA-401: the page stayed (no reload, same address)", p.url() === review, p.url());
    // 3 The reverse: the picker → the Case officer: read-only again, and no Approve at any moment after the change.
    await watchApprove();
    await picker.selectOption(d.officer);
    await readOnly.waitFor(T).catch(() => {});
    await p.waitForTimeout(500);
    const saw = await stopWatch();
    ok("QA-401 (reverse): after the picker's change to the Case officer, the read-only line is back", (await readOnly.count()) === 1);
    ok("QA-401 fail side (reverse): the Case officer never sees Approve after the change, not even for a moment (a stale Approve was refused 403)", !saw && (await approve.count()) === 0 && (await back.count()) === 0, { saw });
    // 4 The same on the way back to the Representative, a second time (the change is not a one-off).
    await picker.selectOption(d.rep); await approve.waitFor(T).catch(() => {});
    ok("QA-401: a second change back to the Representative shows Approve again", (await approve.count()) === 1 && (await readOnly.count()) === 0);
    // 5 The reverse from a fresh page: loaded as the Representative (Approve shows), then the picker → Case officer.
    await p.evaluate((a) => localStorage.setItem("xr-actor", a), d.rep);
    await p.goto(review); await approve.waitFor(T);
    ok("QA-401 (reverse, fresh page): loaded as the Representative, Approve shows", (await approve.count()) === 1);
    await watchApprove();
    await picker.selectOption(d.officer);
    await readOnly.waitFor(T).catch(() => {});
    await p.waitForTimeout(500);
    const stale = await stopWatch();
    ok("QA-401 (reverse, fresh page): after the picker's change to the Case officer, the read-only line shows and Approve and Send back are gone", (await readOnly.count()) === 1 && (await approve.count()) === 0 && (await back.count()) === 0, { readOnly: await readOnly.count(), approve: await approve.count() });
    ok("QA-401 fail side (reverse, fresh page): Approve is gone from the first frame after the change, never left for the officer to press", !stale && (await approve.count()) === 0, { stale });
    ok("no page error", errors.length === 0, errors);
  } catch (e) {
    ok("the walk ran to its end", false, String(e).slice(0, 400));
  } finally {
    await browser.close();
  }
  console.log(`${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})();
