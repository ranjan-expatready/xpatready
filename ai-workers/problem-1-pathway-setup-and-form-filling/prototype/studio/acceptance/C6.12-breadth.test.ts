// C6.12 breadth (F6, 3 Nov; tech lead on #677 and #686, P-290): one check per reason C6.12 "Filings and fees derived from
// the case" is Partial in qa/CAPABILITIES.md ("Not built: sponsorship's two filings, the child study-permit question,
// other combinations, the screen (the case page shows no filings or fees)"). Each reads what a person would see once that
// part is built, so this pack is red until then and C6.12 stays Partial while it is (Works needs this pack and
// acceptance/C6.12.test.ts green). Kept apart from C6.12.test.ts, the Visitor visa part, because
// tests/check_vv_prepare_api.ts runs that one as a regression check and needs it green (README: a builder moves a pack
// into the suites when it passes). Rules and one browser read; no model call (US$0).
// Held parts (tech lead, Lead 30 on #1233, 7 Nov; P-284, P-334 (6), P-330 (7)): -22 (sponsorship) and -23 (the child
// study question) are outside the Visitor visa journey under the founder's answer to Q1 (6 Nov, P-380), rows S1 and S2.
// While its part is still absent (-22: no fs.spouse entry in the fee table; -23: no release asks the question) each prints
// HELD with that reason and is never counted green or red; once its part exists it is an ordinary PASS or FAIL again
// (the self-releasing guard of C11.3.test.ts AT-5). C6.12 counts Works on the Visitor visa part only (P-380 Q1).
// Needs first, on a fresh copy: tests/runtime/setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts (as C6.12).
//   tsx studio/acceptance/C6.12-breadth.test.ts 4440 xr_studio_accept
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { FEE_TABLE } from "../engine/runtime/filings.ts";
import { FAMILY, OFFICER, PORT, answer, call, main, needVisitorVisa, ok, openCase, sql } from "./lib/m3.ts";

let heldN = 0;
const HELD_WHY = "held: outside the Visitor visa journey under the founder's answer to Q1 (6 Nov, P-380); rows S1 and S2 after M3";
/** A step of a held part (P-284): PASS when green; red while its part is still absent (`still`), it prints HELD with the
 *  decision that holds it and counts nothing; red for any other reason, it is a FAIL (QA-215 break 3). Never green. */
const held = (name: string, still: boolean, c: unknown, detail?: unknown) => { if (c || !still) return ok(name, c, detail); heldN++; console.log(`HELD  ${name} — ${HELD_WHY}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };

await main("C6.12 breadth", "Filings and fees: the parts C6.12 is Partial for", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY); // a Visitor visa family case, for the case page (C6.12-25)
  type TableLine = { key: string; label?: string; basis?: string; family_max?: unknown };
  type TableCombo = { label?: string; lines?: string[]; modes?: Record<string, string> };
  const lines = (Array.isArray(FEE_TABLE.lines) ? FEE_TABLE.lines : []) as unknown as TableLine[];
  const combos = (FEE_TABLE.combinations ?? {}) as unknown as Record<string, TableCombo>;
  // (1) Spouse or partner sponsorship: two filings (sponsorship, PR) in one submission group.
  const fsReleased = Number(sql("select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='fs.spouse'") ?? 0);
  const fsTable = combos["fs.spouse"];
  held("C6.12-22 pass (Partial: sponsorship): spouse or partner sponsorship is two filings, the sponsorship and the PR application, in one submission group — Spouse or common-law partner is released and its fee lines are set per filing", !fsTable, fsReleased > 0 && !!fsTable && (fsTable.lines ?? []).some((k) => /sponsorship/.test(k)) && (fsTable.lines ?? []).some((k) => /^pr_/.test(k)) && Object.values(fsTable.modes ?? {}).some((m) => /co_file/.test(m)),
    { released: fsReleased, feeTable: fsTable ?? "no fs.spouse entry in samples/fee-table.json (only vv.single today)" });
  // (2) The case officer's question for an accompanying child of a student or worker.
  const studyQ = Number(sql("select count(*) from config_release where snapshot::text ~* '(study|studies)[^\"]{0,40}(6|six) months or more'") ?? 0);
  held("C6.12-23 pass (Partial: child study question): a release of a student or worker combination asks the case officer \"will this child study 6 months or more?\" (yes adds a study permit filing)", studyQ === 0, studyQ > 0, { releasesWithTheQuestion: studyQ });
  // M3-S2 (review m3): the question reaches a case and its answer adds the filing, on a case of the combination whose
  // release carries the rule (by data: the release whose line adds a filing; no combination is named here).
  const withRule = sql("select r.combination_id from config_release r where exists (select 1 from jsonb_array_elements(r.snapshot->'combination'->'participants') p where p ? 'addsFiling') order by r.released_at desc, r.version desc limit 1");
  const rule = withRule ? JSON.parse(sql(`select p::text from config_release r, jsonb_array_elements(r.snapshot->'combination'->'participants') p where r.combination_id = '${withRule}' and p ? 'addsFiling' order by r.released_at desc, r.version desc limit 1`) ?? "null") as { role: string; addsFiling: { filing: string; condition: { field: string } } } | null : null;
  const caseStep = `C6.12-23 pass (case): the case officer's Yes adds the person's own "${rule?.addsFiling.filing ?? "added"}" filing; a No leaves the other on their line's own filing, never the added one (the principal's, or their own: BK-15, P-486) (GET …/filings and …/prepare agree)`;
  // Review n2: no release carrying the rule is never silent: HELD while the part is absent (no release asks the
  // question), else a FAIL (the question is released but the rule that reads it is not, e.g. step 085 was taken back).
  if (!withRule || !rule) held(caseStep, studyQ === 0, false, { why: "no release carries a line whose rule adds a filing (step 085 refused or taken back: see the checkpoint's row 7)", releasesWithTheQuestion: studyQ });
  else {
    const yearsAgo = (n: number) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - n); return d.toISOString().slice(0, 10); };
    const k = await openCase(withRule, [{ role: "principal", name: "Sample Applicant M", dob: yearsAgo(35) }, { role: rule.role, name: "Sample Person M1", dob: yearsAgo(10) }, { role: rule.role, name: "Sample Person M2", dob: yearsAgo(8) }] as never);
    const filings = async () => (await call("GET", `/runtime/cases/${k.id}/filings`, undefined, k.officer)).body as { filings?: { label: string; owner?: { subject: string }; applicants: { subject: string }[] }[] };
    const own = (b: Awaited<ReturnType<typeof filings>>, who: string) => (b.filings ?? []).find((f) => f.owner?.subject === k.subjects[who]);
    const before = await filings();
    const a1 = await answer(k.id, k.subjects["Sample Person M1"], rule.addsFiling.condition.field, true), a2 = await answer(k.id, k.subjects["Sample Person M2"], rule.addsFiling.condition.field, false);
    const after = await filings(), prep = (await call("GET", `/runtime/cases/${k.id}/prepare`, undefined, k.officer)).body as { filings?: { label?: string }[] };
    ok(caseStep,
      own(before, "Sample Person M1")?.label !== `${rule.addsFiling.filing}: Sample Person M1` && a1.status === 200 && a2.status === 200 && own(after, "Sample Person M1")?.label === `${rule.addsFiling.filing}: Sample Person M1` && own(after, "Sample Person M2")?.label !== `${rule.addsFiling.filing}: Sample Person M2`
        && (after.filings ?? []).some((f) => f.applicants.some((a) => a.subject === k.subjects["Sample Person M2"])) && (prep.filings ?? []).some((f) => f.label === `${rule.addsFiling.filing}: Sample Person M1`),
      { before: before.filings?.map((f) => f.label), after: after.filings?.map((f) => f.label) });
  }
  // (3) Other combinations: extensions, study and work permits have their fees, with no family maximum.
  const other = lines.filter((l) => /study|work|extension/i.test(`${l.key} ${l.label ?? ""}`));
  ok("C6.12-24 pass (Partial: other combinations): the fee table prices study permits, work permits and extensions, none with a family maximum", ["study", "work", "extension"].every((w) => other.some((l) => new RegExp(w, "i").test(`${l.key} ${l.label ?? ""}`))) && other.every((l) => !l.family_max && l.basis !== "family_maximum"),
    { lines: lines.map((l) => l.key), combinations: Object.keys(combos) });
  // (4) The screen: the case officer sees the filings and fees on the case page.
  const browser = await chromium.launch(existsSync("/opt/google/chrome/chrome") || process.platform === "darwin" ? { channel: "chrome" } : {});
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* private window */ } }, OFFICER);
    const pg = await ctx.newPage();
    await pg.goto(`http://localhost:${PORT}/cases/${c.id}`);
    await pg.waitForLoadState("networkidle", { timeout: 30_000 }); // throws on a time-out (a wait fails loudly)
    await pg.getByText(/Sample Client A/).first().waitFor({ timeout: 30_000 });
    const page = (await pg.locator("body").innerText()).replace(/\s+/g, " ");
    ok("C6.12-25 pass (Partial: the screen): the case page shows the case's filings and fees (visitor visa CAD 100 each, biometrics CAD 170 for the family)", /visitor visa fee/i.test(page) && /CAD\s?100/.test(page) && /biometric/i.test(page) && /CAD\s?170/.test(page), page.match(/.{0,60}(fee|CAD).{0,60}/i)?.[0] ?? "no fee or CAD on the case page");
  } finally { await browser.close(); }
  if (heldN) console.log(`\n${heldN} held (not counted): ${HELD_WHY}`);
});
