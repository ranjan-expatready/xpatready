// C8.2 Record the submission in the browser, as a person (runtime lane, M3-F; r5c BR-11, BR-12, BR-15, BR-21; P-155,
// P-168): the case officer on a Visitor visa case of two adults. The "Submission to IRCC" panel says the button opens once
// every filing is Ready to file; with both filings Ready to file (a fixture: C7.6's Ready to file, #861, is not on main
// yet) "Record the submission…" opens one dialog for the group: a missing application number and a date after today are
// refused on their own fields; recorded, the group reads "Recorded · read-only" with Prepared by · Reviewed by and the
// UCIs; "Correct a number…" refuses an empty reason, then keeps the old number in the history; a fact changed after
// filing shows the task to re-sign or tell IRCC. Keyboard only, 1440 and 1024 px, axe (WCAG 2.2 AA) on each state, no
// sideways scroll, and the data underneath. Screenshots in product/screens/C8.2/screenshots/. No model call (US$0).
//   zsh studio/tools/isolated.sh rt_c82b 4432 start && tsx studio/tests/check_c82_record_browser.ts 4432 xr_studio_rt_c82b
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { DB, PORT, answer, fillEverything, firms, inDays, needVisitorVisa, openCase, prepare, readyToFile, sql, yearsAgo } from "../acceptance/lib/m3.ts";

const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "C8.2", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };

const releases = () => Number(sql(`select coalesce(max(r.version), 0) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single'`) ?? 0);
const setup = (file: string) => spawnSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, file), String(PORT), DB], { cwd: join(STUDIO, ".."), stdio: "ignore", timeout: 900_000 });
if (releases() < 1) setup("tests/runtime/setup_visitor_visa.ts");
if (releases() < 2) setup("acceptance/lib/setup_vv_m3.ts");
ok("setup: the copy has Visitor visa release 2 (the pack's setup)", releases() >= 2, releases());
const vv = needVisitorVisa();
const f = await firms();
const officer = f.officer!, rep = f.rep!;
const c = await openCase(vv, [{ role: "principal", name: "Sample Client E", dob: yearsAgo(42) }, { role: "spouse_or_partner", name: "Sample Spouse E", dob: yearsAgo(40) }], { representative: rep, caseOfficers: [officer] });
const [P, S] = [c.subjects["Sample Client E"], c.subjects["Sample Spouse E"]];
await fillEverything(c.id);
const p0 = (await prepare(c.id, officer)).p;
const fP = p0?.filings.find((x) => x.applicants[0]?.subject === P)?.id, fS = p0?.filings.find((x) => x.applicants[0]?.subject === S)?.id;
ok("setup: a family group with the principal's and the spouse's filings, every fact answered and confirmed", !!fP && !!fS && p0?.groups.length === 1, p0?.groups);

const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
const p = await ctx.newPage(); const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), officer);
const panel = () => p.locator("[data-submission]");
const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30_000 }); await p.waitForTimeout(300); };
const open = async () => { await p.goto(`${BASE}/cases/${c.id}`); await panel().waitFor({ timeout: 30_000 }); await p.locator("[data-submission-group]").first().waitFor({ timeout: 30_000 }); await settle(); };
let n = 0;
async function state(name: string, scope = "[data-submission]") {
  n++; const base = `${String(n).padStart(2, "0")}-${name}`;
  await settle();
  if (scope === "[data-submission]") await panel().scrollIntoViewIfNeeded();
  await p.screenshot({ path: join(SHOTS, `${base}-1440.png`) });
  const v = (await new AxeBuilder({ page: p }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`axe: ${name}: no WCAG 2.2 A/AA violation`, v.length === 0, v.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target}`));
  await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
  if (scope === "[data-submission]") await panel().scrollIntoViewIfNeeded();
  await p.screenshot({ path: join(SHOTS, `${base}-1024.png`) });
  ok(`1024 px: ${name} has no sideways page scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
}
/** Focus a control and press it from the keyboard. */
const press = async (loc: ReturnType<Page["locator"]>) => { await loc.focus(); await p.keyboard.press("Enter"); };
const dialog = () => p.getByRole("dialog");
const filingBox = (id: string | undefined) => dialog().locator(`[data-record-filing="${id}"]`);
/** Type into a field from the keyboard (select what is there first). */
const type = async (loc: ReturnType<Page["locator"]>, text: string) => { await loc.focus(); await p.keyboard.press("ControlOrMeta+a"); await p.keyboard.press("Backspace"); if (text) await p.keyboard.type(text); };

try {
  // 1. Not ready yet: the button says why it is not open.
  await open();
  const recordBtn = panel().getByRole("button", { name: "Record the submission…" });
  ok("C8.2-1 (screen): before Ready to file the button is not open and the panel says why, in words", await recordBtn.isDisabled() && /Opens once every filing is Ready to file: Sample Client E \(Not started\), Sample Spouse E \(Not started\)/.test(await panel().innerText()), await panel().innerText());
  await state("not-ready");

  // 2. Ready to file (fixture), the dialog for the whole group.
  // C7.6's own way once its routes are on main (#861); until then the fixture writes the stored status "Mark ready" writes.
  if (!(await readyToFile(c.id, rep)).length) sql(`update filing set status='READY_TO_FILE' where case_id='${c.id}' and active`);
  await open();
  ok("pass: both filings read Ready to file and the button opens", (await panel().locator('[data-status="ready_to_file"]').count()) === 2 && await recordBtn.isEnabled());
  await state("ready");
  await press(recordBtn);
  await dialog().waitFor();
  ok("pass: one dialog for the whole group: a section per filing and a UCI per person", (await dialog().locator("[data-record-filing]").count()) === 2 && /Sample Client E’s UCI/.test(await dialog().innerText()) && /Sample Spouse E’s UCI/.test(await dialog().innerText()));
  ok("a11y: focus starts in the first filing's application number", await p.evaluate(() => (document.activeElement as HTMLInputElement | null)?.closest("[data-record-filing]") !== null && document.activeElement?.tagName === "INPUT"));
  await p.keyboard.type("V300000201");
  await type(filingBox(fP).getByLabel("Submitted on"), "");
  await p.locator("[data-record-filing] input[type=date]").first().fill(inDays(2));
  await type(filingBox(fP).getByLabel("Fee receipt number (optional)"), "SAMPLE-RECEIPT-E");
  // B149 (P-408; board agent-view frame 7): IRCC's "Transaction Approved" page as the fee receipt's evidence, chosen in the dialog.
  // Review M2: a file that is not a PDF, JPEG or PNG by its bytes is refused on its own field at once, and nothing is recorded.
  await filingBox(fP).locator("[data-receipt-input]").setInputFiles({ name: "receipt.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ not a page", "latin1") });
  await filingBox(fP).getByText(/not a PDF, JPEG or PNG/).waitFor({ timeout: 10_000 });
  await press(dialog().getByRole("button", { name: "Record the submission", exact: true }));
  ok("B149 C8.2 fail (screen, review M2): a chosen file that is not a page is refused on its field before anything is saved", /not a PDF, JPEG or PNG/.test(await filingBox(fP).innerText()) && (await dialog().count()) === 1 && sql(`select count(*) from filing_record where case_id='${c.id}'`) === "0" && await p.evaluate(() => !!document.activeElement?.matches("[data-receipt-input]")));
  await filingBox(fP).locator("[data-receipt-input]").setInputFiles({ name: "transaction-approved-E.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% SYNTHETIC SPECIMEN: IRCC Transaction Approved page (Sample)\n%%EOF\n", "latin1") });
  // Review M2: a page refused by the server after the record is saved (here a refusal put in place by the walk) is named in
  // a notice that stays, never only a toast.
  await filingBox(fS).locator("[data-receipt-input]").setInputFiles({ name: "spouse-page.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% SYNTHETIC SPECIMEN (Sample)\n%%EOF\n", "latin1") });
  await p.route(`**/api/runtime/filings/${fS}/record/fee-receipt`, (r) => r.fulfill({ status: 409, contentType: "application/problem+json", body: JSON.stringify({ title: "Refused", status: 409, detail: "The page could not be stored just now. Nothing was stored." }) }), { times: 1 });
  await type(dialog().getByLabel("Sample Client E’s UCI"), "1111-2222");
  await press(dialog().getByRole("button", { name: "Record the submission", exact: true }));
  await filingBox(fP).getByText(/after today/).waitFor({ timeout: 10_000 });
  ok("C8.2-4 (screen): a date after today is refused on its own field, nothing recorded", /after today/.test(await filingBox(fP).innerText()) && sql(`select count(*) from filing_record where case_id='${c.id}'`) === "0");
  await p.locator("[data-record-filing] input[type=date]").first().fill(inDays(0));
  await press(dialog().getByRole("button", { name: "Record the submission", exact: true }));
  await filingBox(fS).getByText(/application number/i).nth(1).waitFor({ timeout: 10_000 });
  ok("C8.2-3 (screen): the spouse's missing application number is refused on its own field", /Give the application number IRCC gave this filing/.test(await filingBox(fS).innerText()) && !/Give the application number IRCC gave this filing/.test(await filingBox(fP).innerText()), await filingBox(fS).innerText());
  await state("refused-on-the-field", "[role=dialog]");
  await type(filingBox(fS).getByLabel("Application number"), "V300000202");
  await press(dialog().getByRole("button", { name: "Record the submission", exact: true }));
  await dialog().waitFor({ state: "detached", timeout: 15_000 });
  // The submission's own record, in its panel: BK-18 (QA-448) put data-record on the readiness line too, which is on the
  // page before anything is recorded, so a page-wide wait read the panel while it still said Ready to file.
  await panel().locator("[data-record]").first().waitFor({ timeout: 15_000 });
  const text = await panel().innerText();
  ok("C8.2-6 (screen): recorded: the group reads Recorded · read-only, each filing Submitted with its own number", /Recorded · read-only/.test(text) && (await panel().locator('[data-status="submitted"]').count()) === 2 && /V300000201/.test(text) && /V300000202/.test(text), text);
  // BK-18 (QA-448, P-510 (4), P-154): the case officer did the work and the representative reviewed it, so both records
  // name two people (never Self-reviewed), and the readiness line says the same as the submission's record.
  const lines = await p.locator("[data-reviewed]").evaluateAll((e) => e.map((x) => [x.getAttribute("data-record"), (x as HTMLElement).innerText]));
  ok("C8.2-7 (screen): the record reads Prepared by · Reviewed by, the fee receipt and the UCI", /Prepared by · Reviewed by\s*Case officer · Representative/.test(text) && /SAMPLE-RECEIPT-E/.test(text) && /Sample Client E: 1111-2222/.test(text)
    && lines.length === 2 && lines.every(([k, t]) => k === "two-people" && /^Prepared by · Reviewed by: Case officer \(Sample\) · reviewed by Representative \(Sample\) \(licence R000000\), /.test(t ?? "")), { text, lines });
  // B149: the page chosen in the dialog is stored with the record; the spouse's filing has none and offers the upload.
  await panel().locator(`[data-submission-filing="${fP}"] [data-receipt-file]`).waitFor({ timeout: 15_000 });
  const receiptP = await panel().locator(`[data-submission-filing="${fP}"] [data-fee-receipt]`).innerText(), receiptS = await panel().locator(`[data-submission-filing="${fS}"] [data-fee-receipt]`).innerText();
  ok("B149 C8.2 (screen): the record shows the Transaction Approved page chosen in the dialog, with the typed number", /Transaction Approved page: transaction-approved-E\.pdf/.test(receiptP) && /Receipt number: SAMPLE-RECEIPT-E/.test(receiptP) && sql(`select count(*) from fee_receipt_file where filing_id='${fP}'`) === "1", receiptP);
  ok("B149 C8.2 (screen): a filing without one says so and offers the upload; the typed number stays optional", /No Transaction Approved page uploaded/.test(receiptS) && /No receipt number typed/.test(receiptS) && (await panel().getByRole("button", { name: /^Upload the Transaction Approved page… for / }).count()) === 1, receiptS);
  const missed = await panel().locator("[data-receipt-missed]").innerText().catch(() => "");
  ok("B149 C8.2 fail (screen, review M2): the spouse's page refused after recording is named in a notice that stays, saying where to upload it again", /Recorded, but a fee receipt page was not stored/.test(missed) && /Sample Spouse E’s Transaction Approved page: The page could not be stored just now/.test(missed) && /Upload it again/.test(missed), missed);
  await p.waitForTimeout(10_000); // longer than a toast stays
  ok("B149 C8.2 (screen): the notice is still there after the toasts have gone", (await panel().locator("[data-receipt-missed]").count()) === 1);
  // Review M1 (WCAG 2.4.3): an upload from the filing leaves focus on its button.
  await panel().locator(`[data-submission-filing="${fS}"] input[type=file]`).setInputFiles({ name: "spouse-page-2.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% SYNTHETIC SPECIMEN (Sample)\n%%EOF\n", "latin1") });
  await panel().locator(`[data-submission-filing="${fS}"] [data-receipt-file]`).waitFor({ timeout: 15_000 });
  await p.waitForTimeout(300);
  ok("B149 C8.2 pass (screen, review M1): after an upload from the filing, the page is listed and focus is on its upload button", sql(`select count(*) from fee_receipt_file where filing_id='${fS}'`) === "1" && await p.evaluate((id) => !!document.activeElement?.closest(`[data-submission-filing="${id}"]`) && !!document.activeElement?.matches("[data-receipt-upload]"), fS));
  await press(panel().getByRole("button", { name: "Dismiss" }));
  await p.waitForTimeout(200);
  ok("B149 C8.2 (screen, WCAG 2.4.3): Dismiss removes the notice and puts focus on the panel's heading", (await panel().locator("[data-receipt-missed]").count()) === 0 && await p.evaluate(() => document.activeElement?.id === "submission-h"));
  ok("C8.2-8 (screen): the button is gone once recorded (one record per group)", (await panel().getByRole("button", { name: "Record the submission…" }).count()) === 0);
  ok("a11y: focus is back on the panel after the dialog closes", await p.evaluate(() => !!document.activeElement?.closest("[data-submission]")));
  ok("data: the records under the screen: two filing rows, one UCI, Prepared by the officer, Reviewed by the representative",
    sql(`select count(*) from filing_record where case_id='${c.id}' and prepared_by='${officer}' and reviewed_by='${rep}'`) === "2" && sql(`select uci from filing_person_record where filing_id='${fP}'`) === "1111-2222");
  await state("recorded");

  // 3. Correct a number.
  await press(panel().locator(`[data-submission-filing="${fP}"]`).getByRole("button", { name: "Correct a number…" }));
  await dialog().waitFor();
  await type(dialog().getByLabel("Corrected application number"), "V300000209");
  await press(dialog().getByRole("button", { name: "Correct the number" }));
  await dialog().getByText(/Give the reason/).waitFor({ timeout: 10_000 });
  ok("C8.2-10 (screen): an empty reason is refused on the Reason field; the number is unchanged", /Give the reason/.test(await dialog().innerText()) && sql(`select application_number from filing_record where filing_id='${fP}'`) === "V300000201");
  await state("correct-needs-a-reason", "[role=dialog]");
  await type(dialog().getByLabel("Reason"), "Typo in the number (Sample)");
  await press(dialog().getByRole("button", { name: "Correct the number" }));
  await dialog().waitFor({ state: "detached", timeout: 15_000 });
  await panel().locator("[data-corrections]").waitFor({ timeout: 15_000 });
  const corr = await panel().locator(`[data-submission-filing="${fP}"]`).innerText();
  ok("C8.2-11 (screen): the new number shows and the old one stays in the history with who and the reason", /V300000209/.test(corr) && /Case officer corrected V300000201 to V300000209: “Typo in the number \(Sample\)”/.test(corr), corr);
  await state("corrected");

  // 3b. The spouse's UCI, not given when recording, added later with a reason (break M3).
  await press(panel().getByRole("button", { name: "Add Sample Spouse E’s UCI" }));
  await dialog().waitFor();
  await type(dialog().getByLabel("UCI", { exact: true }), "hello");
  await type(dialog().getByLabel("Reason"), "From IRCC's letter (Sample)");
  await press(dialog().getByRole("button", { name: "Add the UCI" }));
  await dialog().getByRole("alert").filter({ hasText: /UCI/ }).waitFor({ timeout: 10_000 });
  await p.waitForTimeout(200);
  ok("fail (break M3, screen): a UCI in the wrong shape is refused on the UCI field, focus on it, no toast over the dialog", await p.evaluate(() => document.activeElement?.getAttribute("aria-invalid") === "true") && (await p.locator("[aria-live=polite]").filter({ hasText: /as IRCC wrote it/ }).count()) === 0);
  await type(dialog().getByLabel("UCI", { exact: true }), "3333-4444");
  await press(dialog().getByRole("button", { name: "Add the UCI" }));
  await dialog().waitFor({ state: "detached", timeout: 15_000 });
  await panel().locator(`[data-uci="${S}"]`).getByText("3333-4444").waitFor({ timeout: 15_000 });
  ok("pass (break M3, screen): the spouse's UCI shows, and the history says it was added with the reason", /added Sample Spouse E’s UCI 3333-4444: “From IRCC's letter \(Sample\)”/.test(await panel().locator(`[data-submission-filing="${fS}"]`).innerText()), await panel().locator(`[data-submission-filing="${fS}"]`).innerText());

  // 4. A fact changed after filing (the officer enters a corrected name from the passport).
  await answer(c.id, P, "person.family_name", "SAMPLEDE", officer);
  await open();
  const tasks = p.locator("[data-after-filing-tasks]");
  await tasks.waitFor({ timeout: 15_000 });
  ok("C8.2-12 (screen): a fact changed after filing shows the tasks to re-sign or tell IRCC, whose fact in words (Unconfirmed: no counsel)",
    /Sample Client E's answer to “[^”]+” changed after Sample Spouse E's IMM 5257 was filed/.test(await tasks.innerText()) && /no counsel/.test(await tasks.innerText()) && !/person\.family_name/.test(await tasks.innerText()), await tasks.innerText());
  await state("after-filing-task");
  ok("no page errors", errs.length === 0, errs);
} catch (e) {
  ok(`the walk ran to its end (stopped: ${(e as Error).message.split("\n")[0]})`, false);
  await p.screenshot({ path: join(SHOTS, "zz-stopped-1440.png") }).catch(() => undefined);
}
await b.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
