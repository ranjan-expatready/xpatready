// C7.6 Only a barcode form's own Validate stops "Ready to file" (M3-E; r5c BR-9, BR-21; L-SA3 under P-315, P-237,
// P-238; P-144, P-151, P-155). Visitor visa part, per filing, grouped by who owes it, never a percentage. The one block:
// IMM 5257 on PDF upload with no validated copy read back (P-144, VV-R18); it is never passed. CRITICAL warnings (the
// former blocks of P-71, P-136, P-151 (1), P-155, P-168), passed with a recorded reason or fixed: a required fact
// missing, unconfirmed or with a problem on that form (P-238; QA-122: an optional fact with a problem is still a problem
// on the form it fills); a required signature missing (IMM 5476 signed by hand and scanned); the representative's
// review not done; a form edition past IRCC's accepted-until date. Warnings, passed with a reason: a missing document,
// an AI finding (C7.5-8). P-315 rework (this PR): steps 2, 4, 7, 8, 12, 14 and 20 read the CRITICAL warnings where they
// read blocks; 6b and 22 are new (the barcode block cannot be passed, and stops Ready to file alone). The review's body
// (13, 14, 21) also sends the filing's facts_hash it read (breaker N1 on #861: a review is of the facts it saw).
// Breadth, after Visitor visa: the Express Entry police and medical block (P-172, the one named exception), Paper lines.
//   tsx studio/acceptance/C7.6.test.ts 4440 xr_studio_accept
import { CLIENT, call, fillEverything, firms, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, sql, validateRoundTrip, yearsAgo, agent, answer, confirmAll, filingOf, inDays, signByHand, expectedFor } from "./lib/m3.ts";

const codes = (x: { code: string }[] | undefined) => (x ?? []).map((b) => b.code);
/** P-315 (P-237, P-238): the CRITICAL warnings, the former blocks now passed with a reason. */
const critical = (x: { code: string; severity?: string }[] | undefined) => codes((x ?? []).filter((w) => w.severity === "critical"));
/** Row C4 (P-319, R1): the forms are the case's own lines from C1's expectedLines, never a form number written here: the
 *  barcode form (IMM 5257 on the fixture and on release 2), the form signed by hand and scanned (IMM 5476, which applies
 *  on the firm record's "uses a representative", so it is among the lines that wait on an answer) and the family form
 *  (IMM 5707 on the fixture, IMM 5645 on release 2). */
async function linesOf(caseId: string, name: string) {
  const e = (await expectedFor(caseId))?.[name], all = [...(e?.forms ?? []), ...(e?.waiting ?? [])];
  return { barcode: all.find((l) => l.barcode), handSigned: all.find((l) => l.handSigned)?.form, family: all.find((l) => l.family)?.form };
}
/** Row C4: a barcode form the release files Online (release 2: IMM 5257) makes no copy for filing, so it has no Validate
 *  to wait for. Under the founder's ruling Q3 (P-380; Sample until the immigration expert confirms; Unconfirmed: no
 *  counsel), the case officer switches this one person's barcode form to Paper with a written accommodation reason, so
 *  its copy is for filing and the steps below read its own Validate, as on the fixture, where the release line is
 *  already a PDF upload and nothing is changed. Paper is signed in pen: until its "signed in pen" step can be recorded
 *  (row B132), that CRITICAL signature stays on the checkpoint and C7.6-12 and -19 stay red; it is never passed here. */
async function asPaper(caseId: string, subject: string, form: string | undefined, channel: string | undefined, actor: string) {
  if (!form || channel !== "ONLINE") return;
  const q = (await prepare(caseId, actor)).p, it = itemsOf(q, subject, form)[0];
  const r = await call("PATCH", `/runtime/items/${it?.id}/channel`, { channel: "PAPER", reason: "Cannot apply online: accommodation (Sample)", version: q?.version }, actor);
  console.log(`NOTE  ${form} is Online on the release: ${r.status === 200 ? "switched to Paper for this person with an accommodation reason (founder Q3)" : "the switch to Paper was refused"} (${r.status})`);
}

await main("C7.6", "Ready to file: the blocks and the warnings (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? "user-O";
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client A"];
  const L = await linesOf(c.id, "Sample Client A"), BC = L.barcode?.form, HS = L.handSigned, FAM = L.family;
  await asPaper(c.id, P, BC, L.barcode?.channel, officer);
  let p = (await prepare(c.id, officer)).p;
  const BCC = BC ? itemsOf(p, P, BC)[0]?.channel : undefined; // the item's channel after the switch (review m2)
  const fid = filingOf(p, P)?.id;
  let rd = readinessOf(p, fid);
  ok("C7.6-1 pass: readiness is per filing with blocks and warnings, each saying who owes it and what it unblocks; no percentage", !!rd && Array.isArray(rd.blocks) && Array.isArray(rd.warns) && rd.blocks.every((b) => !!b.words) && !/%/.test(JSON.stringify(rd)), rd);
  ok(`C7.6-2 fail (P-238): with facts unanswered, ${BC} has a CRITICAL \"missing facts\" warning (never a block)`, !!BC && rd?.ready === false && critical(rd?.warns).includes("missing_facts") && !codes(rd?.blocks).includes("missing_facts"), { blocks: codes(rd?.blocks), warns: codes(rd?.warns) });
  let r = await call("POST", `/runtime/filings/${fid}/ready`, {}, officer);
  ok("C7.6-3 fail: \"Ready to file\" is refused by the server (409) and lists the blocks", r.status === 409 && Array.isArray(r.body?.blocks) && r.body.blocks.length > 0, r.status);

  await fillEverything(c.id);
  // QA-122: an optional fact with a problem, confirmed, still blocks the form it fills.
  // Row C4: release 2 asks the principal no optional fact at all (121 questions, all required, on the checkpoint), so
  // where the release has no optional date on the barcode form a required one stands in (not the date of birth or an
  // expiry date, which other rules read); the rule tested is the same (P-47 saved and flagged; a CRITICAL "fact with a
  // problem" on the form it fills), and its earlier answer is put back after. The fixture still takes the optional one.
  type DateQ = { subjectId: string; fact: string; required: boolean; hidden: boolean; group: string | null; value_type: string; collected_from: string; fills: { form: string }[]; answer: { value?: unknown } | null };
  const v = await agent(c.id);
  const dates = ((v?.sections ?? []) as { questions: DateQ[] }[]).flatMap((s) => s.questions)
    .filter((q) => q.subjectId === P && !q.hidden && !q.group && q.value_type === "date" && q.fills.some((x) => x.form === BC) && q.fact !== "person.date_of_birth" && !/expiry/.test(q.fact));
  const opt = dates.find((q) => !q.required) ?? dates.find((q) => q.required), kind = opt ? (opt.required ? "required: the release has no optional date there" : "optional") : "none found";
  // The principal answers their own date (P-78: counts as confirmed). P-47 (contracts/runtime.ts PutAnswer):
  // an invalid value is saved and flagged, never refused, so QA-122's fix is that it blocks the form it fills.
  const by = opt?.collected_from === "client_questionnaire" ? CLIENT : officer;
  const bad = opt ? await answer(c.id, P, opt.fact, "1990-13-45", by) : null;
  if (opt && by !== CLIENT) await confirmAll(c.id, P);
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  ok(`C7.6-4 fail (QA-122, P-238): a date given as 1990-13-45 (an optional one where the release has one, else a required one; here ${kind}) is saved and flagged (P-47) and is a CRITICAL "fact with a problem" on ${BC}`, !!opt && (bad?.status ?? 0) < 300 && critical(rd?.warns).includes("fact_problem") && (rd?.warns ?? []).some((b) => b.code === "fact_problem" && !!BC && b.words.includes(BC)), { fact: opt?.fact, status: bad?.status, warns: codes(rd?.warns) });
  if (opt) await answer(c.id, P, opt.fact, typeof opt.answer?.value === "string" ? opt.answer.value : "1990-01-15", by);
  await fillEverything(c.id);
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  ok("C7.6-5 pass: with every fact confirmed, the fact warnings are gone", !!rd && ![...codes(rd?.blocks), ...codes(rd?.warns)].some((x) => ["missing_facts", "fact_problem", "open_check"].includes(x)), codes(rd?.warns));
  ok(`C7.6-6 fail (P-144, VV-R18): ${BC} on ${BCC === "PAPER" ? "Paper" : "PDF upload"} with no validated copy read back blocks`, codes(rd?.blocks).includes("barcode_not_validated") && (rd?.blocks ?? []).some((b) => b.code === "barcode_not_validated" && !!BC && b.words.includes(BC)));
  r = await call("POST", `/runtime/filings/${fid}/warnings/barcode_not_validated/pass`, { reason: "Validated outside the case (Sample)" }, officer);
  ok("C7.6-6b fail (P-237): the barcode block cannot be passed, even with a reason (409, nothing recorded)", r.status === 409 && Number(sql(`select count(*) from readiness_pass where filing_id='${fid}'`) ?? 0) === 0, r.status);
  ok(`C7.6-7 fail (P-136, P-237): ${HS} (signed by hand and scanned) with no signed scan is a CRITICAL "missing signature" warning`, (rd?.warns ?? []).some((b) => b.code === "missing_signature" && b.severity === "critical" && !!HS && b.words.includes(HS)) && !codes(rd?.blocks).includes("missing_signature"), codes(rd?.warns));
  ok("C7.6-8 fail (P-155, P-237): the representative's review not done is a CRITICAL warning", critical(rd?.warns).includes("representative_review") && !codes(rd?.blocks).includes("representative_review"));
  ok("C7.6-9 pass: a missing document (passport not received) only warns", codes(rd?.warns).includes("missing_document") && !codes(rd?.blocks).includes("missing_document"));

  // Clear each block the way the item's channel requires.
  ok(`C7.6-10 pass: ${BC} validated copy read back (the built C-9 route)`, !!BC && !!(await validateRoundTrip(c.id, BC, P)));
  const iHS = HS ? itemsOf(p, P, HS)[0] : undefined;
  const signed = HS ? await signByHand(c.id, iHS?.id, HS, P) : 0; // print → signed by hand → scan, in order (C8.1-3)

  ok(`C7.6-11 pass: ${HS} printed, signed by hand, and its scan uploaded`, signed === 201, signed);
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  ok("C7.6-12 pass: the barcode block and the signature warning are gone; of the CRITICAL warnings only the review remains", !codes(rd?.blocks).length && !codes(rd?.warns).includes("missing_signature") && critical(rd?.warns).join() === "representative_review", { blocks: codes(rd?.blocks), warns: codes(rd?.warns) });
  r = await call("POST", `/runtime/filings/${fid}/review`, { note: "Reviewed (Sample)", facts_hash: rd?.facts_hash }, officer);
  ok("C7.6-13 fail (P-155): a case officer cannot do the representative's review (403)", !!f.rep && officer !== f.rep && r.status === 403, r.status);
  r = await call("POST", `/runtime/filings/${fid}/review`, { note: "Reviewed (Sample)", facts_hash: rd?.facts_hash }, f.rep ?? ""); // #861 N1: the facts it read
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  ok("C7.6-14 pass: the representative of record reviews; the warning clears; the record will read \"Prepared by · Reviewed by\"", r.status === 200 && !codes(rd?.warns).includes("representative_review") && r.body?.reviewed_by === f.rep, r.body);
  r = await call("POST", `/runtime/filings/${fid}/ready`, {}, officer);
  ok("C7.6-15 fail: with only warnings left, Ready to file still needs each warning passed with a reason (409 names them)", r.status === 409 && codes(r.body?.warns).includes("missing_document"), r.body);
  r = await call("POST", `/runtime/filings/${fid}/warnings/missing_document/pass`, {}, officer);
  ok("C7.6-16 fail: passing a warning without a reason is refused (400)", r.status === 400, r.status);
  r = await call("POST", `/runtime/filings/${fid}/warnings/missing_document/pass`, { reason: "Passport uploaded in the portal directly (Sample)" }, officer);
  ok("C7.6-17 pass: a permitted person passes the warning with a written reason, recorded", r.status === 200 && Number(sql(`select count(*) from readiness_pass where filing_id='${fid}'`) ?? 0) === 1);
  ok("C7.6-18 fail: a client cannot pass warnings or mark ready (403)", (await call("POST", `/runtime/filings/${fid}/ready`, {}, CLIENT)).status === 403);
  r = await call("POST", `/runtime/filings/${fid}/ready`, {}, officer);
  ok("C7.6-19 pass: Ready to file succeeds; the filing's status is ready_to_file", r.status === 200 && filingOf((await prepare(c.id, officer)).p, P)?.status === "ready_to_file", r.body);

  // P-151, BR-9 block 3 (needs W1-16 edition attributes): before IRCC's accepted-until date an older edition warns with
  // "Adopt update"; after it, it blocks. Every PDF edition of the family form (row C4: from expectedLines) is set, then
  // restored, so later tests are untouched.
  const eds = FAM && /^[A-Z0-9 ]+$/.test(FAM) ? (sql(`select e.id from form_edition e join gov_form_def g on g.id=e.gov_form_def_id where g.form_key='${FAM}' and e.channel <> 'ONLINE'`) ?? "").split("\n").filter(Boolean) : [];
  const setUntil = async (d: string | null) => { let ok2 = eds.length > 0; for (const e of eds) ok2 = (await call("PATCH", `/editions/${e}/accepted-until`, { acceptedUntil: d, reason: "Superseded edition (Sample)" }, "user-A")).status < 300 && ok2; return ok2; };
  const soon = await setUntil(inDays(10));
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  ok(`C7.6-20a pass (P-151): before ${FAM}'s accepted-until date it only warns, with "Adopt update"`, soon && codes(rd?.warns).includes("edition_superseded") && /Adopt update/.test(JSON.stringify(rd?.warns)) && !codes(rd?.blocks).includes("edition_expired"), rd);
  const past = await setUntil(yearsAgo(0, 1));
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  ok(`C7.6-20 fail (P-151, P-237): after ${FAM}'s accepted-until date it is a CRITICAL warning (no longer "Adopt update"), never a block`, past && critical(rd?.warns).includes("edition_expired") && !codes(rd?.warns).includes("edition_superseded") && !codes(rd?.blocks).length, { blocks: codes(rd?.blocks), warns: codes(rd?.warns) });
  ok("C7.6-20b pass: the dates are restored for the tests that follow", await setUntil(null));


  // Solo firm: "Self-reviewed".
  const solo = await openCase(vv, [{ role: "principal", name: "Sample Client S", dob: yearsAgo(30) }], { representative: f.soloRep, caseOfficers: [f.soloRep ?? ""] });
  const SL = await linesOf(solo.id, "Sample Client S");
  await asPaper(solo.id, solo.subjects["Sample Client S"], SL.barcode?.form, SL.barcode?.channel, f.soloRep ?? "");
  const sp = (await prepare(solo.id, f.soloRep ?? "")).p, sf = sp?.filings[0]?.id;
  r = await call("POST", `/runtime/filings/${sf}/review`, { self: true, note: "I prepared and reviewed this filing myself", facts_hash: readinessOf(sp, sf)?.facts_hash }, f.soloRep ?? "");
  ok("C7.6-21 pass: a solo representative's review is logged \"Self-reviewed\" with name, licence number and time, never as a second person", r.status === 200 && r.body?.kind === "self_reviewed" && !!r.body?.licence_number, r.body);

  // P-315 (P-237, P-238): with facts still missing, every warning (CRITICAL ones too) is passed with a reason; Ready to
  // file is then refused by the barcode form's own Validate alone.
  let srd = readinessOf((await prepare(solo.id, f.soloRep ?? "")).p, sf);
  const passedAll = critical(srd?.warns).includes("missing_facts");
  for (const w of [...new Set(codes(srd?.warns))]) passedAll && (await call("POST", `/runtime/filings/${sf}/warnings/${w}/pass`, { reason: "Client confirms the answers by phone today (Sample)" }, f.soloRep ?? ""));
  srd = readinessOf((await prepare(solo.id, f.soloRep ?? "")).p, sf);
  r = await call("POST", `/runtime/filings/${sf}/ready`, {}, f.soloRep ?? "");
  ok(`C7.6-22 fail (P-315): missing facts passed as a CRITICAL warning with a reason, Ready to file is still refused by ${SL.barcode?.form}'s missing Validate alone (409)`, !!SL.barcode?.form && passedAll && !srd?.warns.length && (srd?.passed ?? []).some((x) => x.code === "missing_facts") && r.status === 409 && codes(r.body?.blocks).join() === "barcode_not_validated" && !codes(r.body?.warns).length, { status: r.status, blocks: codes(r.body?.blocks), warns: codes(r.body?.warns) });
});
