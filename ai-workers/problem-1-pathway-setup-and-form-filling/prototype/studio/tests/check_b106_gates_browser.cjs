// B106 (row A4, C6.9, QA-244; concept product/screens/M3-A4/concept.md BR-1…BR-9, approved by the tech lead on #1172):
// the eligibility rules screen, by screens, as journey J-A4: the author adds "Passport number answered" on the Smart
// questionnaire (SQR) tab and saves; submits; the approver's release before the content reviewer's sign-off is refused;
// the author cannot release; the reviewer signs; the approver releases; a case opened after it lists the gate on its
// Eligibility page. Then the gate is removed the same way and a case opened before that release still lists it. One
// pass and one fail per business rule, axe (WCAG 2.2 AA) on the section and the open dialog, and no sideways scroll at
// 1024 px. Its own copy, Visitor visa set up by the fixture (A1, #1084, is not on main yet). Screenshots:
// product/screens/M3-A4/walk/. US$0, live AI off.
//   zsh studio/tools/isolated.sh b106 4448 start && node studio/tests/check_b106_gates_browser.cjs 4448 xr_studio_b106
const path = require("node:path"); const fs = require("node:fs"); const http = require("node:http"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4448), DB = process.argv[3] ?? "xr_studio_b106", BASE = `http://localhost:${PORT}`;
const STUDIO = path.join(__dirname, ".."), PROTO = path.join(STUDIO, ".."), OUT = path.join(PROTO, "..", "product", "screens", "M3-A4", "walk");
const PSQL = process.env.PSQL || "/opt/homebrew/opt/postgresql@18/bin/psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const TSX = path.join(STUDIO, "node_modules", ".bin", "tsx");
const AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B", OFFICER = "user-O";
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  C6.9: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d).slice(0, 400)}` : ""}`); };
/** node:http without keep-alive (tests/runtime/api.ts: fetch reuses sockets the server closed). */
const call = (method, p, body, actor = AUTHOR) => new Promise((res, rej) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const r = http.request({ host: "localhost", port: PORT, path: `/api${p}`, method, agent: false, headers: { "x-actor": actor, ...(data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {}) } }, (s) => {
    let t = ""; s.on("data", (c) => (t += c)); s.on("end", () => { let b = null; try { b = t ? JSON.parse(t) : null; } catch { b = t; } res({ status: s.statusCode, body: b }); });
  });
  r.on("error", rej); if (data) r.write(data); r.end();
});
const setup = (file) => { try { return { code: 0, out: execFileSync(TSX, [file, String(PORT), DB], { cwd: PROTO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; } catch (e) { return { code: e.status ?? 1, out: String(e.stdout ?? "") }; } };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // The fixture: Visitor visa, then its M3 set-up, which saves the two Sample gates by route (S7) and releases them (S8).
  // setup_vv_m3.ts exits 1 on its own known gaps (S2w, S7a: other rows); only S7 and S8 matter here.
  const s1 = setup("studio/tests/runtime/setup_visitor_visa.ts");
  ok("set-up: Visitor visa", s1.code === 0, s1.out.slice(-300));
  const s2 = setup("studio/acceptance/lib/setup_vv_m3.ts");
  ok("set-up: Visitor visa's two Sample gates saved and released (S7, S8)", /PASS\s+S7 \(M3-8\)/.test(s2.out) && /PASS\s+S8 release 2 approved/.test(s2.out), s2.out.split("\n").filter((l) => /FAIL/.test(l)));
  const vv = sql("select id from combination where combination_key = 'vv.single'");
  const gates = async () => (await call("GET", `/combinations/${vv}/eligibility-gates`)).body;
  const draft = async () => (await call("GET", `/combinations/${vv}`)).body;
  const openCase = async (ref) => (await call("POST", "/runtime/cases", { combinationId: vv, reference: ref, clientActor: "user-P", principal: { displayName: "Sample Client A" } }, OFFICER)).body?.id;
  const before = await gates();

  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium/chrome-linux/chrome") ? { executablePath: "/opt/pw-browsers/chromium/chrome-linux/chrome" } : fs.statSync("/opt/pw-browsers/chromium", { throwIfNoEntry: false })?.isFile() ? { executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] } : {}) });
  const as = async (actor, width = 1440) => { const c = await b.newContext({ viewport: { width, height: 900 } }); c.setDefaultNavigationTimeout(180_000); c.setDefaultTimeout(30_000); await c.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* blocked */ } }, actor); return c.newPage(); };
  const errors = [];
  const axeOf = async (p, what, scope) => { const r = await new AxeBuilder({ page: p }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); ok(`axe (WCAG 2.2 AA): ${what}`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)); };
  const section = (p) => p.locator("[data-eligibility-gates]:not([data-eligibility-gates=loading])");
  const openTab = async (p) => { await p.goto(`${BASE}/c/${vv}/questionnaires`, { waitUntil: "networkidle" }); await section(p).waitFor({ timeout: 60_000 }); await section(p).scrollIntoViewIfNeeded(); };
  const dialog = (p) => p.locator("[data-editor=eligibility]");
  const openDialog = async (p) => { await section(p).locator("[data-eligibility-edit]").click(); await dialog(p).waitFor(); };
  const row = (p, i) => p.locator(`[data-gate-row="${i}"]`);
  const setRule = async (p, i, field, op = "exists") => { await row(p, i).locator('input[aria-label="Field"]').first().fill(field); await row(p, i).locator('select[aria-label="Comparison"]').first().selectOption(op); await row(p, i).locator('input[aria-label="Field"]').first().blur(); };
  const save = async (p) => { await p.locator("[data-eligibility-save]").click(); };
  const saved = async (p) => { await p.getByText("Eligibility rules saved to the draft").first().waitFor(); await dialog(p).waitFor({ state: "detached" }); };

  // ------------------------------------------------------------------ BR-2: who may save
  const appr = await as(APPROVER); appr.on("pageerror", (e) => errors.push(String(e)));
  await openTab(appr);
  ok("BR-2 fail: the approver sees the rules read-only, with no Edit, and is told why", (await section(appr).locator("[data-eligibility-edit]").count()) === 0 && /An author changes these; you can read them/.test(await section(appr).innerText()));
  ok("BR-2 fail: the approver's save by route is refused 403 (not the author duty)", (await call("PUT", `/combinations/${vv}/eligibility-gates`, { gates: [] }, APPROVER)).status === 403);
  const rev = await as(REVIEWER); rev.on("pageerror", (e) => errors.push(String(e)));
  await openTab(rev);
  ok("BR-2 fail (m8): the content reviewer (expert duty, no author duty) has no Edit either", (await section(rev).locator("[data-eligibility-edit]").count()) === 0);
  const page = await as(AUTHOR); page.on("pageerror", (e) => errors.push(String(e)));
  await openTab(page);
  ok("BR-2 pass: the author has Edit", (await section(page).locator("[data-eligibility-edit]").count()) === 1);

  // ------------------------------------------------------------------ the section on the released fixture
  const sec = await section(page).innerText();
  const relNo = await section(page).locator("[data-eligibility-release]").getAttribute("data-eligibility-release");
  ok("section: the two released gates, each Released, with its rule in words and what Not met means", /Passport number and expiry date answered \(Sample\)/.test(sec) && /Answered no to the criminal history question \(Sample\)/.test(sec) && (sec.match(/Released\n/g) ?? []).length >= 2 && /Met when: Passport number is answered and Passport expiry date is answered/.test(sec) && /The representative reviews it/.test(sec), sec.slice(0, 600));
  ok("section (m2): its release number is the page header's (\"In Release N\")", !!relNo && new RegExp(`In Release ${relNo}\\b`).test(await page.locator("body").innerText()), relNo);
  ok("section (m3): nothing changed yet, so the draft matches the release", /Draft matches the release/.test(sec));
  ok("section: the four officer's-judgement lines and the disclaimer", /Has enough money for the stay/.test(sec) && /Will leave Canada at the end of the visit/.test(sec) && /Disclaimer:/.test(sec));
  await page.screenshot({ path: path.join(OUT, "1-section-released-1440.png"), fullPage: false });
  await section(page).screenshot({ path: path.join(OUT, "1-section-released-crop-1440.png") });
  await axeOf(page, "the eligibility rules section", "[data-eligibility-gates]");

  // ------------------------------------------------------------------ BR-1, BR-3: add a gate, refused first
  await openDialog(page);
  ok("BR-1: the dialog opens on the saved set (2 gates, 4 lines), each saved rule in the simple editor", (await page.locator("[data-gate-row]").count()) === 2 && (await dialog(page).locator('input[aria-label="Field"]').count()) === 3, await page.locator("[data-gate-row]").count());
  ok("BR-3 (Q1): no choice of whom a rule is checked for, it is 'each person'", (await dialog(page).locator('select[aria-label="Whom the condition is evaluated for"]').count()) === 0 && (await dialog(page).locator("[data-subject-fixed]").count()) === 2);
  const offered = await dialog(page).locator("datalist option").evaluateAll((os) => os.map((o) => o.value));
  ok("BR-3 (Q1): only the library's questions are offered, no calculated value", offered.length > 20 && !offered.some((v) => /\(calculated\)/.test(v)), offered.filter((v) => /calculated/.test(v)).slice(0, 3));
  // Break B1: a button inside the dialog never saves; only Save does.
  await row(page, 0).getByRole("button", { name: "Add a comparison" }).click();
  await page.waitForTimeout(800);
  ok("break B1: Add a comparison adds a row and saves nothing (the dialog stays, the version is unchanged)", (await dialog(page).count()) === 1 && (await row(page, 0).locator('input[aria-label="Field"]').count()) === 3 && (await gates()).version === before.version);
  await row(page, 0).getByRole("button", { name: "Remove this comparison" }).last().click();
  await page.waitForTimeout(800);
  ok("break B1: a comparison's bin removes it and saves nothing", (await dialog(page).count()) === 1 && (await row(page, 0).locator('input[aria-label="Field"]').count()) === 2 && (await gates()).version === before.version);
  await row(page, 1).locator("input").first().press("Enter");
  await page.waitForTimeout(800);
  ok("re-review N1: Enter in gate 2's label removes nothing from gate 1's rule and saves nothing", (await row(page, 0).locator('input[aria-label="Field"]').count()) === 2 && (await gates()).version === before.version && (await dialog(page).count()) === 1);
  await page.locator("[data-gate-add]").click();
  await page.waitForTimeout(800);
  ok("break B1: Add a gate saves nothing, so the new row shows no refusal before Save", (await dialog(page).count()) === 1 && !/Give the gate a label/.test(await dialog(page).innerText()) && (await gates()).version === before.version);
  // Break M1: a comparison with an empty value is met by nobody: said on the row, refused by the save.
  await row(page, 2).locator('input[aria-label="Field"]').first().fill("Passport number");
  await row(page, 2).locator('input[aria-label="Field"]').first().blur();
  ok("break M1: 'is' with no value is said on the row", (await row(page, 2).locator("[data-empty-value]").count()) === 1);
  await save(page);
  await page.getByText("Give the gate a label").first().waitFor();
  ok("break M1 fail: the save refuses the empty value on the gate's rule", /compares "Passport number" with an empty value/i.test(await dialog(page).innerText()));
  ok("break M1 fail: 'is one of' with no value is refused by route too", (await call("PUT", `/combinations/${vv}/eligibility-gates`, { gates: [...before.gates, { key: "gate.x", label: "X", condition: { op: "in", field: "person.passport_number", value: [] } }], judgement: before.judgement, version: before.version })).status === 400);
  await row(page, 2).locator('input[aria-label="Field"]').first().fill("");
  await row(page, 2).locator('input[aria-label="Field"]').first().blur();
  await save(page);
  await page.getByText("A gate needs a rule").first().waitFor();
  const err1 = await dialog(page).innerText();
  ok("BR-1 fail: an empty label and no rule are refused on their fields, in words", /Give the gate a label: what a person reads beside its result/.test(err1) && /A gate needs a rule the answers on file can settle/.test(err1), err1.slice(0, 500));
  ok("BR-1 fail: nothing was saved (the version is unchanged)", (await gates()).version === before.version);
  await axeOf(page, "the open dialog, with its field errors", "[role=dialog]");
  await row(page, 2).locator("input").first().fill("Passport number answered");
  await setRule(page, 2, "Passport number");
  await row(page, 2).getByLabel(/The representative reviews it/).check();
  await row(page, 2).getByLabel(/^Does not qualify$/).check();
  await page.screenshot({ path: path.join(OUT, "2-dialog-new-gate-1440.png") });
  await save(page); await saved(page);
  const g1 = await gates();
  const added = g1.gates.find((g) => g.label === "Passport number answered");
  ok("BR-1 pass: the gate is saved to the draft by screen, at the next version", !!added && g1.version === before.version + 1, g1);
  ok("BR-3 pass: stored as a rule per person (subjectKind PERSON): Passport number is answered", added?.condition?.subjectKind === "PERSON" && added?.condition?.op === "exists" && added?.condition?.field === "person.passport_number", added);
  ok("BR-4 pass (Q3): its key is made from the label", added?.key === "gate.passport_number_answered", added?.key);
  ok("BR-3: 'If not met: Does not qualify' (the default, P-236) is stored as no whenNotMet", added && added.whenNotMet === undefined, added);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok("BR-8a (m5): the save lost nothing: the two gates as they were, 'needs_review' kept, the 4 lines and the disclaimer", same(g1.gates.slice(0, 2), before.gates) && g1.gates[1].whenNotMet === "needs_review" && same(g1.judgement, before.judgement) && g1.disclaimer === before.disclaimer, { was: before.gates, now: g1.gates.slice(0, 2) });
  await section(page).locator('[data-gate="gate.passport_number_answered"]').waitFor();
  await section(page).locator('[data-eligibility-count="1"]').waitFor(); // the draft's change list is read after the gates
  const sec2 = await section(page).innerText();
  ok("BR-6: the new gate reads New in draft, and the draft count is 1 change", /Passport number answered\s+New in draft/.test(sec2) && /Draft: 1 change\b/.test(sec2), sec2.slice(0, 400));

  // ------------------------------------------------------------------ BR-4, BR-5, BR-7: rename, refusals, release check
  await openDialog(page);
  await row(page, 0).locator("input").first().fill("Passport number and expiry date on file (Sample)");
  await row(page, 2).locator("input").first().fill("Answered no to the criminal history question (Sample)");
  await page.locator("[data-judgement-add]").click();
  await dialog(page).locator("fieldset").nth(-1).locator("input").last().fill("x".repeat(121));
  await save(page);
  await page.getByText(/already reads/).first().waitFor();
  const err2 = await dialog(page).innerText();
  ok("BR-4 fail: two gates with the same words are refused on the label", /Gate 2 already reads "Answered no to the criminal history question \(Sample\)"/.test(err2), err2.slice(0, 600));
  ok("BR-5 fail: an officer's-judgement line of 121 characters is refused on its line", /Keep the officer's judgement line to 120 characters/.test(err2), err2.slice(0, 600));
  await row(page, 2).locator("input").first().fill("Passport number answered");
  await dialog(page).locator('button[aria-label^="Remove line 5"]').click();
  await save(page); await saved(page);
  const g2 = await gates(), d2 = await draft();
  ok("BR-4 pass: a renamed gate keeps its key, and Review lists it as changed (not removed and added)", g2.gates[0].key === "vv.travel_document" && g2.gates[0].label === "Passport number and expiry date on file (Sample)" && (d2.draft.changes ?? []).some((c) => c.kind === "Eligibility" && c.key === "vv.travel_document" && c.change === "changed"), g2.gates[0]);
  ok("BR-5 pass: the four lines are kept as they were", same(g2.judgement, before.judgement));
  // BR-7: a gate on a question this application never asks is said under that gate, in the release check's words.
  await openDialog(page);
  await page.locator("[data-gate-add]").click();
  await row(page, 3).locator("input").first().fill("Intended job title answered");
  await setRule(page, 3, "person.intended_job_title"); // a key typed is taken as the field (conditions.tsx keyOf)
  await row(page, 3).getByLabel(/The representative reviews it/).check();
  await save(page); await saved(page);
  ok("BR-3 pass: 'If not met: the representative reviews it' is stored as needs_review", (await gates()).gates.find((g) => g.key === "gate.intended_job_title_answered")?.whenNotMet === "needs_review");
  const probe = section(page).locator('[data-gate="gate.intended_job_title_answered"] [data-gate-problem]');
  await probe.first().waitFor();
  ok("BR-7 pass: the release check's problem shows under its gate", /which no case of this application is asked/.test(await probe.first().innerText()), await probe.first().innerText());
  await section(page).screenshot({ path: path.join(OUT, "3-section-problem-under-gate-1440.png") });
  await openDialog(page);
  await row(page, 3).getByRole("button", { name: /Remove the gate Intended job title/ }).click();
  ok("break m4: the keyboard lands on the confirm (Keep)", await page.evaluate(() => document.activeElement?.textContent === "Keep"));
  ok("remove: a saved gate asks first, with what happens to cases and tests", /Cases already open keep it; cases opened after this change is released do not\. A test that expects this gate fails/.test(await dialog(page).locator("[data-gate-confirm]").innerText()));
  await dialog(page).locator("[data-gate-confirm]").getByRole("button", { name: "Remove" }).click();
  await save(page); await saved(page);
  ok("BR-7 fail: with that gate gone, no Eligibility problem is left", !((await draft()).draft.problems ?? []).some((p) => p.where === "Eligibility"));

  // ------------------------------------------------------------------ BR-8: a stale save keeps the person's edits
  await openDialog(page);
  await row(page, 2).locator("input").first().fill("Passport number answered (edited)");
  const now = await gates();
  const other = await call("PUT", `/combinations/${vv}/eligibility-gates`, { gates: now.gates, judgement: now.judgement, disclaimer: now.disclaimer, version: now.version }, AUTHOR);
  await save(page);
  await page.getByText("Changed by someone else").first().waitFor();
  ok("BR-8 fail: a save over someone else's newer save is refused 409, saying who saved, and the edit is kept", other.status === 200 && /Configuration author saved these eligibility gates/.test(await dialog(page).innerText()) && (await row(page, 2).locator("input").first().inputValue()) === "Passport number answered (edited)");
  await dialog(page).getByRole("button", { name: "Reload" }).click();
  await page.waitForFunction(() => document.querySelector('[data-gate-row="2"] input')?.value === "Passport number answered");
  ok("BR-8 pass: Reload reads their version", (await row(page, 2).locator("input").first().inputValue()) === "Passport number answered");
  // Break m3: Cancel with unsaved edits asks first; dismissing keeps the dialog.
  await row(page, 2).locator("input").first().fill("Passport number answered (not kept)");
  let asked = "";
  page.once("dialog", (d) => { asked = d.message(); void d.dismiss(); });
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.waitForTimeout(300);
  ok("break m3: Cancel with unsaved edits asks first, and staying keeps them", /Discard your unsaved changes/.test(asked) && (await dialog(page).count()) === 1);
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Cancel" }).click();
  await dialog(page).waitFor({ state: "detached" });

  // ------------------------------------------------------------------ BR-6, J-A4: submit, sign, release, case check
  const caseBefore = await openCase(`ACC-B106-before-${Date.now() % 100000}`);
  const review = async (p) => { await p.goto(`${BASE}/c/${vv}/review`, { waitUntil: "networkidle" }); await p.getByRole("button", { name: /Approve and release/ }).waitFor({ timeout: 60_000 }); };
  const cycle = async (label) => {
    await review(page);
    await page.getByRole("button", { name: /Submit for review|Submit again/ }).click();
    await page.getByText("Submitted for review").first().waitFor();
    const eligRows = await page.locator("tr", { has: page.locator("td", { hasText: /^Eligibility$/ }) }).count();
    // m4: with a submission waiting, the section says a save changes the draft and must be submitted again.
    await openTab(page);
    const count = Number(await section(page).locator("[data-eligibility-count]").getAttribute("data-eligibility-count"));
    ok(`${label} (m3): the draft count is Review's Eligibility lines (${eligRows})`, count === eligRows && count > 0, { count, eligRows });
    ok(`${label} (m4): the section says a submission is waiting`, /A submission is waiting for review: saving changes the draft, so it must be submitted again/.test(await section(page).innerText()));
    // (a) the author cannot release: the button is off on screen, and the route says 403.
    await review(page);
    ok(`${label} (a): the author's Approve and release is off`, await page.getByRole("button", { name: /Approve and release/ }).isDisabled());
    ok(`${label} (a): the author's release by route is refused 403`, (await call("POST", `/combinations/${vv}/approve`, undefined, AUTHOR)).status === 403);
    // (b) the approver before the content reviewer signs: refused in words.
    await review(appr);
    await appr.getByRole("button", { name: /Approve and release/ }).click();
    await appr.getByText(/needs? the content reviewer's SME sign-off/).first().waitFor();
    ok(`${label} (b): the approver's release before the sign-off is refused, saying the SME sign-off is missing`, true);
    // (c) the reviewer signs every Eligibility line, then the approver releases.
    await review(rev);
    await rev.getByRole("button", { name: "Select all I can sign" }).click();
    await rev.getByRole("button", { name: /^Sign \d+/ }).click();
    await rev.getByText("Recorded").first().waitFor();
    await review(appr);
    await appr.getByRole("button", { name: /Approve and release/ }).click();
    await appr.getByText(/Released version \d+/).first().waitFor({ timeout: 120_000 });
    ok(`${label} (c): signed by the content reviewer, released by the approver`, true);
  };
  await openTab(page);
  await page.screenshot({ path: path.join(OUT, "4-section-before-submit-1440.png") });
  await cycle("J-A4 add");
  await openTab(page);
  await section(page).getByText("Draft matches the release").waitFor().catch(() => undefined);
  ok("BR-5 pass: with no disclaimer in the draft, the release carries the Sample default", /^Indicative only\./.test((await gates()).released?.disclaimer ?? ""));
  ok("BR-6: after release the new gate reads Released and the draft matches the release", /Passport number answered\s+Released/.test(await section(page).innerText()) && /Draft matches the release/.test(await section(page).innerText()));
  // The next case check uses it: a case opened now, on its Eligibility page, by screen.
  const off = await as(OFFICER); off.on("pageerror", (e) => errors.push(String(e)));
  const run = async (caseId, shot) => {
    await off.goto(`${BASE}/cases/${caseId}/eligibility`, { waitUntil: "networkidle" });
    await off.getByRole("button", { name: /Run case check|Run again/ }).first().click();
    await off.getByText(/Rules checked/).first().waitFor({ timeout: 60_000 });
    if (shot) await off.screenshot({ path: path.join(OUT, shot) });
    return off.locator("main, body").first().innerText();
  };
  const caseAfter = await openCase(`ACC-B106-after-${Date.now() % 100000}`);
  const t1 = await run(caseAfter, "5-case-check-lists-new-gate-1440.png");
  ok("J-A4 pass: a case opened after the release lists 'Passport number answered' as Not answered", /Passport number answered[\s\S]{0,200}Not answered|Not answered[\s\S]{0,200}Passport number answered/.test(t1), t1.slice(0, 600));
  const t0 = await run(caseBefore);
  ok("J-A4: a case opened before the release keeps its own release (no new gate)", !/Passport number answered\b(?! and)/.test(t0.replace(/Passport number and expiry date on file \(Sample\)/g, "")), t0.slice(0, 400));

  // Remove it the same way: Removed in draft; a case opened before that release still lists it (m1).
  await openTab(page); await openDialog(page);
  await row(page, 2).getByRole("button", { name: /Remove the gate Passport number answered/ }).click();
  await dialog(page).locator("[data-gate-confirm]").getByRole("button", { name: "Remove" }).click();
  await save(page); await saved(page);
  const removedRow = section(page).locator('[data-gate="gate.passport_number_answered"][data-gate-removed]');
  await removedRow.waitFor().catch(() => undefined); // the draft's change list is read after the gates
  ok("BR-6: a removed released gate shows struck through, Removed in draft", (await removedRow.count()) === 1 && /Removed in draft/.test(await removedRow.innerText()));
  await section(page).screenshot({ path: path.join(OUT, "6-section-removed-in-draft-1440.png") });
  await cycle("J-A4 remove");
  const t2 = await run(caseAfter);
  ok("m1: a case opened before the removal's release still lists the gate", /Passport number answered/.test(t2.replace(/Passport number and expiry date on file \(Sample\)/g, "")));
  const caseLast = await openCase(`ACC-B106-last-${Date.now() % 100000}`);
  const t3 = await run(caseLast, "7-case-check-after-removal-1440.png");
  ok("m1: a case opened after it does not", !/Passport number answered/.test(t3.replace(/Passport number and expiry date on file \(Sample\)/g, "")), t3.slice(0, 400));

  // ------------------------------------------------------------------ m9: a label with no Latin letter or digit
  await openTab(page); await openDialog(page);
  await page.locator("[data-gate-add]").click();
  const last = (await page.locator("[data-gate-row]").count()) - 1;
  await row(page, last).locator("input").first().fill("Паспорт указан");
  await setRule(page, last, "Passport number");
  await save(page); await saved(page);
  ok("BR-4 (m9): a label with no Latin letter gets the key gate.rule_1", (await gates()).gates.some((g) => g.key === "gate.rule_1" && g.label === "Паспорт указан"));

  // ------------------------------------------------------------------ 1024 px
  const small = await as(AUTHOR, 1024); small.on("pageerror", (e) => errors.push(String(e)));
  await openTab(small);
  ok("1024 px: no sideways scroll with the section", !(await small.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  await small.screenshot({ path: path.join(OUT, "8-section-1024.png") });
  await openDialog(small);
  ok("1024 px: the open dialog does not scroll sideways", !(await small.evaluate(() => { const d = document.querySelector("[role=dialog]"); return !d || [...d.querySelectorAll("*")].some((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== "visible" && getComputedStyle(e).overflowX !== "hidden") || document.documentElement.scrollWidth > window.innerWidth + 1; })));
  await small.screenshot({ path: path.join(OUT, "9-dialog-1024.png") });
  await small.close();

  // ------------------------------------------------------------------ BR-9: retired, read-only
  // Break m5: a save refused because the combination was retired while the dialog was open says so, not "changed by someone else".
  const late = await as(AUTHOR); late.on("pageerror", (e) => errors.push(String(e)));
  await openTab(late); await openDialog(late);
  await row(late, 0).locator("input").first().fill("Renamed after retiring");
  // Retired the way a person does it: proposed on Structure, approved, released (tests/check_w1_structure.ts).
  const ret = await call("POST", `/combinations/${vv}/retire`, { reason: "B106 read-only check (Sample)" });
  const appr2 = await call("POST", `/library/changes/${ret.body?.id}/approve`, {}, APPROVER);
  const pack = (await call("GET", "/draft", undefined, APPROVER)).body;
  const rel = await call("POST", "/pack/release", { expectedChanges: pack?.changes }, APPROVER);
  ok("BR-9 set-up: Visitor visa retired through Structure (proposed, approved, released)", ret.status < 300 && appr2.status < 300 && rel.status < 300 && sql(`select retired_at is not null from combination where id='${vv}'`) === "t", { ret: ret.body?.detail ?? ret.status, appr: appr2.body?.detail ?? appr2.status, rel: rel.body?.detail ?? rel.status });
  await save(late);
  await late.getByText("Not saved").first().waitFor();
  const lateText = await dialog(late).innerText();
  ok("break m5: a save after the combination was retired says it is retired, with no Reload", /is retired: its eligibility gates are not changed/.test(lateText) && !/Changed by someone else/.test(lateText), lateText.slice(0, 300));
  await late.close();
  await openTab(page);
  await section(page).getByText(/Retired: restore it on Structure/).waitFor().catch(() => undefined);
  ok("BR-9: a retired combination's rules are read-only, saying how to change them", (await section(page).locator("[data-eligibility-edit]").count()) === 0 && /Retired: restore it on Structure/.test(await section(page).innerText()));
  ok("BR-9: its save by route is refused 409", (await call("PUT", `/combinations/${vv}/eligibility-gates`, { gates: [], version: (await gates()).version })).status === 409);

  ok("no page errors", errors.length === 0, errors);
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); console.log(`\n${pass}/${pass + fail + 1} passed`); process.exit(1); });
