// 12 Nov re-run (QA-395, QA-396 retest): adds step 2c, the principal's Q8 A and Education Question 1 lines read Yes as the
// PDF copy writes them (setup prints them), and step 2d, the spouse's sheet (opened by its own case link) reads Q8 A No.
//   LIBDIR=<studio>/acceptance/lib tsx walk_c73.mts <port> <db> <case> <item> <filing> <outdir> <spouse item>
// qa gate A walk of C7.3 (the answer sheet's "Entered in the portal" tick, P-401) by screens, ending at the next
// capability's first step (C8.2 "Record the submission"). Case officer, 1024 px, mouse and keyboard on what the page shows;
// API reads only to compare the page with the server (never to act). US$0.
//   LIBDIR=<studio>/acceptance/lib tsx walk_c73.mts <port> <db> <case> <item> <filing> <outdir>
const [port, , caseId, itemId, fid, out, spouseItem] = process.argv.slice(2);
const { walker } = await import(`${process.env.LIBDIR}/browser.ts`);
const { call } = await import(`${process.env.LIBDIR}/m3.ts`);
const OFFICER = "user-O", CLIENT = "user-P", AUTHOR = "user-A";
const log = (...a: unknown[]) => console.log(...a);
const w = await walker(`http://127.0.0.1:${port}`);
let n = 0; const shot = async (p: any, name: string) => { const f = `${out}/${String(n++).padStart(2, "0")}-${name}.png`; await p.screenshot({ path: f, fullPage: true }); log("  shot", f); };
const sheetApi = async () => (await call("GET", `/runtime/items/${itemId}/answer-sheet`, undefined, OFFICER)).body as any;
const prepApi = async () => (await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, OFFICER)).body as any;
const fails: string[] = []; const check = (label: string, cond: boolean, detail?: unknown) => { log(`${cond ? "PASS" : "FAIL"}  ${label}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 400)); if (!cond) fails.push(label); };
try {
  const page = await w.open(OFFICER, 1024);
  // 1. The case page, as the case officer.
  await page.goto(`/cases/${caseId}`); await w.settle(page, "case");
  const header0 = (await page.getByText(/^Readiness:/).first().innerText().catch(() => "")).trim();
  const link = page.getByRole("link", { name: /Open answer sheet/ }).first();
  await link.scrollIntoViewIfNeeded();
  const lineText = (await link.locator("xpath=ancestor::*[self::li or self::p][1]").innerText().catch(() => "")).trim();
  log("case header:", header0, "| online line:", lineText.slice(0, 300));
  await shot(page, "case-online-line");
  check("1 the case's Online line offers \"Open answer sheet\" and reads To do", (await link.count()) === 1 && /To do/.test(lineText), lineText.slice(0, 200));
  // 2. Open the sheet by mouse.
  await link.click(); await w.settle(page, "sheet"); await page.locator("[data-section]").first().waitFor({ timeout: 20_000 });
  const s0 = await sheetApi(); const N = s0.sections.length;
  const prog0 = (await page.locator("[data-progress]").innerText()).trim();
  const state0 = (await page.locator("[data-item-state]").innerText()).trim();
  log("sheet:", N, "sections |", prog0, "|", state0);
  await shot(page, "sheet-nothing-ticked");
  check(`2 the sheet says "${N} of ${N} sections still to tick" and the item reads To do`, prog0.startsWith(`${N} of ${N} section`) && /To do/.test(state0), { prog0, state0 });
  // 2c. QA-396 / QA-395 retest on screen: the principal's recorded Yes/No lines.
  const lineOf = async (pg: any, re: RegExp) => { const tr = pg.locator("tr[data-answer]").filter({ hasText: re }).first(); return (await tr.count()) ? { text: (await tr.innerText()).replace(/\s+/g, " ").trim(), copy: (await tr.locator("[data-copy-text]").innerText()).trim() } : null; };
  const q8 = await lineOf(page, /Question 8 A/), edu = await lineOf(page, /Education Section Question 1/);
  await page.locator("tr[data-answer]").filter({ hasText: /Question 8 A/ }).first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, "principal-q8a-line");
  check("2c QA-395/QA-396: the principal's Q8 A line reads Yes (another country, 2 years in the past 5)", q8?.copy === "Yes", q8);
  await page.locator("tr[data-answer]").filter({ hasText: /Education Section Question 1/ }).first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, "principal-education-line");
  check("2c QA-396: the principal's Education Question 1 line reads Yes (one education entry)", edu?.copy === "Yes", edu);
  const schoolLines = await page.locator("tr[data-answer]").filter({ hasText: /Name of the school/ }).count();
  const prLines = await page.locator("tr[data-answer]").filter({ hasText: /previously resided/ }).allInnerTexts();
  check("2c QA-396: the entry's own values keep their own lines, each once (school once; the country of residence line is not doubled)", schoolLines === 1 && prLines.length <= 1, { schoolLines, prLines: prLines.map((x) => x.replace(/\s+/g, " ")) });
  // 2d. The spouse's sheet (read only): Q8 A No for an entry in the family's own country.
  if (spouseItem) {
    const sp = await w.open(OFFICER, 1024);
    await sp.goto(`/cases/${caseId}`); await w.settle(sp, "case (spouse)");
    const sl = sp.getByRole("link", { name: /Open answer sheet: IMM 5257 for Sample Spouse W/ }).first();
    if (await sl.count()) await sl.click(); else await sp.goto(`/cases/${caseId}/sheet/${spouseItem}`);
    await w.settle(sp, "spouse sheet"); await sp.locator("[data-section]").first().waitFor({ timeout: 20_000 });
    const sq8 = await lineOf(sp, /Question 8 A/), sedu = await lineOf(sp, /Education Section Question 1/);
    await sp.locator("tr[data-answer]").filter({ hasText: /Question 8 A/ }).first().scrollIntoViewIfNeeded().catch(() => {});
    await shot(sp, "spouse-q8a-line");
    check("2d QA-395: the spouse's Q8 A line reads No (India, the spouse's own country, one day in 2015)", sq8?.copy === "No", { linked: (await sl.count()) > 0, sq8, sedu });
    await sp.close();
  }
  const noSide = async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  // 3. Tick the first section by mouse.
  const t1 = s0.sections[0].title;
  await page.getByRole("button", { name: `Entered in the portal: ${t1}` }).click();
  const card1 = page.locator(`[data-section="${s0.sections[0].key}"]`);
  await card1.locator('[data-tick="entered"]').waitFor({ timeout: 15_000 });
  const pill1 = (await card1.locator("[data-section-state]").innerText()).trim();
  const s1 = await sheetApi();
  await shot(page, "first-ticked");
  check("3 a mouse tick shows who and when; the count drops by one; the server holds the tick by the officer", /^Entered by /.test(pill1) && (await page.locator("[data-progress]").innerText()).startsWith(`${N - 1} of ${N}`) && s1.sections[0].entered?.by === OFFICER, { pill1, server: s1.sections[0].entered });
  // 4. Take it off: empty reason refused on the field, then a reason.
  await card1.getByRole("button", { name: `Take the tick off ${t1}` }).click();
  const box = card1.getByLabel(/Why does the tick come off/);
  await box.waitFor({ timeout: 5_000 });
  await card1.locator('button[type="submit"]').click();
  const err = (await card1.locator('[role="alert"]').first().innerText().catch(() => "")).trim();
  await shot(page, "untick-no-reason");
  check("4a an empty reason is refused on the reason box, in plain words; the tick stays", err.length > 0 && !!(await sheetApi()).sections[0].entered, err);
  await box.fill("Typed the wrong passport number into the portal; re-entering (Sample, qa walk)");
  await page.keyboard.press("Enter");
  await card1.locator("[data-unticked]").waitFor({ timeout: 15_000 });
  const unt = (await card1.locator("[data-unticked]").innerText()).trim();
  await shot(page, "untick-with-reason");
  check("4b with a reason the tick comes off; the section says who, when and why; the count is back", /Reason: Typed the wrong passport/.test(unt) && (await page.locator("[data-progress]").innerText()).startsWith(`${N} of ${N}`) && !(await sheetApi()).sections[0].entered, unt);
  // 5. Tick every section: the first by keyboard (focus the button, Enter), the rest by mouse.
  const b1 = page.getByRole("button", { name: `Entered in the portal: ${t1}` });
  await b1.focus(); await page.keyboard.press("Enter");
  await card1.locator('[data-tick="entered"]').waitFor({ timeout: 15_000 });
  for (const x of s0.sections.slice(1)) {
    await page.getByRole("button", { name: `Entered in the portal: ${x.title}` }).click();
    await page.locator(`[data-section="${x.key}"] [data-tick="entered"]`).waitFor({ timeout: 15_000 });
  }
  await page.waitForTimeout(800);
  const progAll = (await page.locator("[data-progress]").innerText()).trim();
  const stateAll = (await page.locator("[data-item-state]").innerText()).trim();
  const sAll = await sheetApi();
  await shot(page, "every-section-ticked");
  check("5 every section ticked: \"Every section is ticked\", the item reads Done, the server holds N ticks", /^Every section is ticked/.test(progAll) && /Done/.test(stateAll) && sAll.sections.every((x: any) => x.entered), { progAll, stateAll });
  check("5b no sideways scroll at 1024 px", await noSide());
  // 6. Widths 400 and 1440 of the same sheet.
  for (const wd of [400, 1440]) { await page.setViewportSize({ width: wd, height: 900 }); await page.waitForTimeout(400); check(`6 no sideways scroll at ${wd} px`, await noSide()); await shot(page, `sheet-${wd}`); }
  await page.setViewportSize({ width: 1024, height: 900 });
  // 7. The client cannot see the sheet (wrong role by URL).
  const cp = await w.open(CLIENT, 1024);
  await cp.goto(`/cases/${caseId}/sheet/${itemId}`); await w.settle(cp, "client sheet"); await cp.waitForTimeout(1500);
  const cTicks = await cp.getByRole("button", { name: /^Entered in the portal/ }).count();
  const cText = (await cp.locator("main").innerText().catch(() => "")).slice(0, 300);
  await shot(cp, "client-by-url");
  check("7 the client opening the sheet's URL gets no tick button", cTicks === 0, cText);
  // 8. Back on the case: the Online line reads Done; readiness as before.
  await page.getByRole("link", { name: /^(Back to the case|.*Sample Client W.*|Case)/ }).first().click().catch(async () => { await page.goto(`/cases/${caseId}`); });
  await w.settle(page, "case again");
  if (!page.url().endsWith(`/cases/${caseId}`)) { log("  (breadcrumb went to", page.url(), "; opened the case by URL)"); await page.goto(`/cases/${caseId}`); await w.settle(page, "case again"); }
  const link2 = page.getByRole("link", { name: /Open answer sheet/ }).first(); await link2.scrollIntoViewIfNeeded();
  const line2 = (await link2.locator("xpath=ancestor::*[self::li or self::p][1]").innerText().catch(() => "")).trim();
  const header1 = (await page.getByText(/^Readiness:/).first().innerText().catch(() => "")).trim();
  await shot(page, "case-online-line-done");
  check("8 back on the case the Online line reads Done; the readiness header is unchanged by the ticks", /Done/.test(line2) && header1 === header0, { line2: line2.slice(0, 200), header0, header1 });
  // 9. Next capability's first step: Ready to file, then C8.2 "Record the submission…".
  const fig = page.locator(`[data-readiness-filing="${fid}"]`);
  await fig.scrollIntoViewIfNeeded(); await shot(page, "ready-to-file-before");
  await fig.locator("[data-mark-ready]").click();
  await page.locator(`[data-readiness-filing="${fid}"][data-status="ready_to_file"]`).waitFor({ timeout: 15_000 }).catch(() => {});
  await w.settle(page, "after Ready to file");
  // The submission opens once every filing is Ready to file: the officer presses it on each other filing too (enabled only).
  for (let k = 0; k < 4; k++) {
    const more = page.locator("[data-readiness-filing]:not([data-status=\"ready_to_file\"]) [data-mark-ready]:not([disabled])");
    if (!(await more.count())) break;
    const id = await more.first().locator("xpath=ancestor::*[@data-readiness-filing][1]").getAttribute("data-readiness-filing");
    await more.first().click();
    await page.locator(`[data-readiness-filing="${id}"][data-status="ready_to_file"]`).waitFor({ timeout: 15_000 }).catch(() => {});
    await w.settle(page, "Ready to file (other filing)"); log("  pressed Ready to file on filing", id);
  }
  const rtf = await page.locator(`[data-readiness-filing="${fid}"][data-status="ready_to_file"]`).count();
  const refusal = (await fig.locator("[data-refusal]").innerText().catch(() => "")).trim();
  await shot(page, "ready-to-file-pressed");
  check("9a the officer presses Ready to file; the filing reads Ready to file", rtf === 1, refusal.slice(0, 300));
  const rec = page.getByRole("button", { name: /Record the submission/ }).first();
  await rec.scrollIntoViewIfNeeded();
  check("9b C8.2's \"Record the submission…\" is offered and enabled", (await rec.count()) === 1 && await rec.isEnabled());
  await rec.click();
  const dlg = page.getByRole("dialog");
  await dlg.waitFor({ timeout: 10_000 });
  await shot(page, "record-dialog");
  // One set of fields per person in a family submission (12 Nov run 3: two "Application number" fields).
  const fillAll = async (label: string | RegExp, val: (i: number) => string) => { const l = dlg.getByLabel(label); const n = await l.count(); for (let i = 0; i < n; i++) await l.nth(i).fill(val(i)); return n; };
  const nApp = await fillAll("Application number", (i) => `V30000077${7 - i}`);
  const nRef = await fillAll("Our reference", (i) => `SAMPLE-QA-C73-${i + 1}`);
  const nUci = await fillAll(/UCI/, (i) => `1111-222${i}`);
  log("  dialog fields filled: application numbers", nApp, "references", nRef, "UCI", nUci);
  await dlg.getByRole("button", { name: "Record the submission", exact: true }).click();
  await dlg.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  await w.settle(page, "after record");
  const recErr = (await dlg.innerText().catch(() => "")).slice(0, 400);
  const prep = await prepApi();
  const f = (prep.filings ?? []).find((x: any) => x.id === fid);
  await shot(page, "recorded");
  check("9c the submission is recorded from the screen (the next capability's first step done)", f?.status === "submitted" || !!f?.record?.application_number, { status: f?.status, record: f?.record, dialog: recErr });
  // 10. The sheet after the record: read-only, no tick controls.
  await page.goto(`/cases/${caseId}/sheet/${itemId}`); await w.settle(page, "sheet after record"); await page.locator("[data-section]").first().waitFor({ timeout: 20_000 });
  const ctl = await page.getByRole("button", { name: /^(Entered|Take the tick off)/ }).count();
  const prog2 = (await page.locator("[data-progress]").innerText()).trim();
  await shot(page, "sheet-after-record");
  check("10 after the record the sheet shows no tick controls (read-only) and keeps its ticks", ctl === 0 && /^Every section is ticked/.test(prog2), { ctl, prog2 });
  const r = await call("POST", `/runtime/items/${itemId}/screens/${s0.sections[0].key}/unentered`, { reason: "probe after record (qa)", version: (await sheetApi()).sections[0].version, entered_at: (await sheetApi()).sections[0].entered?.at }, OFFICER);
  check("10b underneath: an untick after the record is refused (409)", r.status === 409, { status: r.status, body: r.body });
  check("11 no page error during the walk", w.errors.length === 0, w.errors);
} finally { await w.close(); log(fails.length ? `WALK: ${fails.length} FAIL: ${fails.join(" | ")}` : "WALK: all PASS"); process.exitCode = fails.length ? 1 : 0; }
