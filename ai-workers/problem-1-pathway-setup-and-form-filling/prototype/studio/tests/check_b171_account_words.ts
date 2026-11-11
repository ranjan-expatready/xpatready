// B171 (C11.6, C8.2; B169 review M1 on #1523, EXPERIENCE §1 plain words): every IRCC account reads in words on the case
// side, from the Forms tab's own contract (contracts/forms.ts ACCOUNT_WORDS, throughAccount). Before this row the case
// page, the answer sheet and Prepare's portal_words named only the APR Portal and printed any other account's raw key
// ("Filed through PR_PORTAL" on a spousal sponsorship case once B169's data sets its account), and the submission
// record (web/src/runtime/submission.tsx) did the same. On the configured checkpoint (P-322):
//   R1 (API) a spousal sponsorship case (fs.spouse) on the PR Portal, as B169's data sets it: Prepare reads "Filed through
//      PR Portal: set by the combination, not on the case" (fail on main: "PR_PORTAL"); every account the Forms tab
//      offers reads its own words, paper reads "Filed on paper, with no IRCC account", never a raw key; the Visitor
//      visa's line stays word for word "Filed through APR Portal" (C11.6-1's wording, unchanged).
//   R2 (screen, 1440 px) the case page's account line and the IMM 0008 answer sheet's read "Filed through PR Portal".
//   R3 (screen, 1440 px) the submission record on a PR Portal case: the "Record the submission" dialog says "as IRCC
//      acknowledged it through PR Portal", and the recorded group reads "· through PR Portal" (fail on main: the raw key).
//      A Visitor visa case is made Ready to file C7.6's own way (readyToFile), then its combination is put on the PR
//      Portal for this check and put back after.
// Accounts are set in the copy's data (SQL), as the Forms tab's picker or B169's sample data would. Synthetic people; US$0.
//   zsh studio/tools/isolated.sh forms_b171 4451 start && tsx studio/tests/check_b171_account_words.ts 4451 xr_studio_forms_b171
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { ACCOUNT_WORDS, IRCC_ACCOUNTS } from "../contracts/forms.ts";
import { AUTHOR, FIXED, PORT, call, firms, inDays, main, needVisitorVisa, ok, openCase, prepare, readyToFile, sql, yearsAgo } from "../acceptance/lib/m3.ts";

const BASE = `http://localhost:${PORT}`, STUDIO = join(import.meta.dirname, "..");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "B171", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const TAIL = ": set by the combination, not on the case";
const RAW = /\b[A-Z]+_[A-Z_]+\b/; // an engine key such as PR_PORTAL, never shown to a person
type Prep = { portal: string | null; portal_words: string | null; version: string; items: { id: string; kind: string; form?: string; channel?: string }[]; filings: { id: string; status: string; applicants: { subject: string }[] }[]; groups: { id: string }[] };

await main("B171", "every IRCC account in words on the case, the answer sheet and the submission record (API and screen; US$0)", async () => {
  const released = () => sql(`select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='fs.spouse'`) !== "0";
  if (!released()) {
    await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
    const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
    ok("setup: Demo › Load the configured checkpoint", l.status === 201 || l.status === 200, l.status);
  }
  const fs = sql(`select id from combination where combination_key='fs.spouse'`), vv = needVisitorVisa();
  ok("setup: spousal sponsorship (fs.spouse) and the Visitor visa are released on the checkpoint", released() && !!fs && !!vv);
  if (!fs || !vv) return;
  const fsBefore = sql(`select coalesce(portal_key, '') from combination where id='${fs}'`) ?? "", vvBefore = sql(`select coalesce(portal_key, '') from combination where id='${vv}'`) ?? "";
  const setAccount = (id: string, a: string) => sql(`update combination set portal_key=${a ? `'${a}'` : "null"} where id='${id}'`);
  const f = await firms();
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  try {
    // R1: spousal sponsorship on the PR Portal (B169's data; on main before B169 it has no account).
    setAccount(fs, "PR_PORTAL");
    const c = await openCase(fs, [{ role: "principal", name: "Sample Sponsor B171", dob: FIXED.dob }]);
    const prep = async (id: string, actor?: string) => (await prepare(id, actor)).p as unknown as Prep | null;
    let p = await prep(c.id);
    ok("B171-1 pass (API): a spousal sponsorship case on the PR Portal reads \"Filed through PR Portal\" (fail on main: \"PR_PORTAL\")", p?.portal === "PR_PORTAL" && p.portal_words === `Filed through PR Portal${TAIL}`, p?.portal_words);
    const words: Record<string, string | null> = {};
    for (const a of IRCC_ACCOUNTS) { setAccount(fs, a); words[a] = (await prep(c.id))?.portal_words ?? null; }
    ok("B171-2 pass (API): every account the Forms tab offers reads the Forms tab's own words on the case", IRCC_ACCOUNTS.filter((a) => a !== "PAPER").every((a) => words[a] === `Filed through ${ACCOUNT_WORDS[a]}${TAIL}`), words);
    ok("B171-3 pass (API): paper reads \"Filed on paper, with no IRCC account\"", words.PAPER === `Filed on paper, with no IRCC account${TAIL}`, words.PAPER);
    ok("B171-4 fail (API): no account ever shows its raw key on the case", Object.values(words).every((w) => !!w && !RAW.test(w)), words);
    setAccount(fs, "PR_PORTAL");

    // R2: the case page and the IMM 0008 answer sheet, at 1440 px, as the case officer.
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(BASE); await page.evaluate((a) => localStorage.setItem("xr-actor", a), c.officer);
    const settle = async () => { await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30_000 }); await page.waitForTimeout(300); };
    await page.goto(`${BASE}/cases/${c.id}`);
    const head = page.locator("[data-item-channels] [data-portal]");
    await head.waitFor({ timeout: 30_000 }); await settle();
    const caseLine = await head.innerText();
    await head.scrollIntoViewIfNeeded(); await page.screenshot({ path: join(SHOTS, "01-fs-case-pr-portal-1440.png") });
    ok("B171-5 pass (screen): the case page says \"Filed through PR Portal\", never the raw key", caseLine.includes(`Filed through PR Portal${TAIL}`) && !RAW.test(caseLine), caseLine);
    const sheet = (p?.items ?? []).find((i) => i.kind === "form" && i.form === "IMM 0008" && i.channel === "ONLINE");
    ok("setup: the case's IMM 0008 is filed Online (it has an answer sheet)", !!sheet, p?.items.map((i) => [i.form, i.channel]));
    if (sheet) {
      await page.goto(`${BASE}/cases/${c.id}/sheet/${sheet.id}`);
      const line = page.locator("[data-answer-sheet] [data-portal]");
      await line.waitFor({ timeout: 30_000 }); await settle();
      const sheetLine = await line.innerText();
      await page.screenshot({ path: join(SHOTS, "02-fs-imm0008-sheet-pr-portal-1440.png") });
      ok("B171-6 pass (screen): the IMM 0008 answer sheet says \"Filed through PR Portal\", never the raw key", sheetLine.includes(`Filed through PR Portal${TAIL}`) && !RAW.test(sheetLine), sheetLine);
    }

    // R3: the submission record on a PR Portal case (a Visitor visa case made Ready to file, then its account moved).
    const r = await openCase(vv, [{ role: "principal", name: "Sample Client B171", dob: yearsAgo(40) }], { representative: f.rep!, caseOfficers: [f.officer!] });
    await readyToFile(r.id, f.rep!);
    p = await prep(r.id, f.officer!);
    ok("pass (API): the Visitor visa's line is unchanged: \"Filed through APR Portal\" (C11.6-1)", p?.portal_words === `Filed through APR Portal${TAIL}`, p?.portal_words);
    setAccount(vv, "PR_PORTAL");
    p = await prep(r.id, f.officer!);
    ok("setup: the Visitor visa case is Ready to file, its combination now on the PR Portal", !!p && p.filings.length > 0 && p.filings.every((x) => x.status === "ready_to_file") && p.portal === "PR_PORTAL", p?.filings.map((x) => x.status));
    await page.evaluate((a) => localStorage.setItem("xr-actor", a), f.officer!);
    const panel = page.locator("[data-submission]");
    await page.goto(`${BASE}/cases/${r.id}`); await panel.locator("[data-submission-group]").first().waitFor({ timeout: 30_000 }); await settle();
    const btn = panel.getByRole("button", { name: "Record the submission…" });
    await btn.focus(); await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog"); await dialog.waitFor({ timeout: 10_000 }); await page.waitForTimeout(250);
    const said = await dialog.innerText();
    await page.screenshot({ path: join(SHOTS, "03-record-dialog-pr-portal-1440.png") });
    ok("B171-7 pass (screen): the Record the submission dialog says \"as IRCC acknowledged it through PR Portal\" (fail on main: the raw key)", said.includes("as IRCC acknowledged it through PR Portal.") && !RAW.test(said), said.slice(0, 300));
    await page.keyboard.press("Escape"); await dialog.waitFor({ state: "detached", timeout: 10_000 });
    const fl = p!.filings[0], g = p!.groups[0];
    const rec = await call("PATCH", `/runtime/groups/${g.id}/record`, { filings: [{ filing: fl.id, our_reference: "SAMPLE-B171", submitted_on: inDays(0), application_number: "V300000171", fee_receipt: "SAMPLE-RECEIPT" }], ucis: [{ subject: fl.applicants[0].subject, uci: "1111-1711" }], version: p!.version }, f.officer!);
    ok("setup: the submission is recorded through the PR Portal", rec.status < 300 && sql(`select portal from filing_record where filing_id='${fl.id}'`) === "PR_PORTAL", { status: rec.status, body: rec.body?.detail });
    await page.goto(`${BASE}/cases/${r.id}`); await panel.locator("[data-submission-group]").first().waitFor({ timeout: 30_000 }); await settle();
    await panel.getByText(/Submitted on/).first().waitFor({ timeout: 30_000 });
    const recorded = await panel.innerText();
    await panel.scrollIntoViewIfNeeded(); await page.screenshot({ path: join(SHOTS, "04-recorded-pr-portal-1440.png") });
    ok("B171-8 pass (screen): the recorded submission reads \"· through PR Portal\" (fail on main: the raw key)", /Submitted on\s+[^\n]* · through PR Portal/.test(recorded) && !/PR_PORTAL/.test(recorded), recorded.slice(0, 400));
    await ctx.close();
  } finally {
    setAccount(fs, fsBefore); setAccount(vv, vvBefore);
    await b.close();
  }
});
