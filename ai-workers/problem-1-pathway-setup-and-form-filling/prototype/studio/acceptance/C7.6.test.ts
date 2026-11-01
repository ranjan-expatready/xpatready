// C7.6 Only the form's own Validate and missing or conflicting facts, plus the hard blocks, stop "Ready to file"
// (M3-E; r5c BR-9, BR-21; P-71, P-136, P-144, P-151, P-155, P-168). Visitor visa part, per filing, grouped by who owes
// it, never a percentage. Blocks: a required fact missing, unconfirmed or with a problem on that form (P-71; QA-122: an
// optional fact with a problem is still a problem on the form it fills); IMM 5257 on PDF upload with no validated copy
// read back (P-144, VV-R18); a required signature missing (IMM 5476 signed by hand and scanned); the representative's
// review not done; a form edition past IRCC's accepted-until date (P-151). Everything else warns and is passed with a
// reason: a missing document, an AI finding (C7.5-8).
// Breadth, after Visitor visa: the Express Entry police and medical block (P-172), Paper lines.
//   tsx studio/acceptance/C7.6.test.ts 4440 xr_studio_accept
import { CLIENT, call, fillEverything, firms, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, sendFile, signedScan, sql, validateRoundTrip, yearsAgo, agent, answer, filingOf, generateCopy } from "./lib/m3.ts";

const codes = (x: { code: string }[] | undefined) => (x ?? []).map((b) => b.code);

await main("C7.6", "Ready to file: the blocks and the warnings (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? "user-O";
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client A"];
  let p = (await prepare(c.id, officer)).p;
  const fid = filingOf(p, P)?.id;
  let rd = readinessOf(p, fid);
  ok("C7.6-1 pass: readiness is per filing with blocks and warnings, each saying who owes it and what it unblocks; no percentage", !!rd && Array.isArray(rd.blocks) && Array.isArray(rd.warns) && rd.blocks.every((b) => !!b.words) && !/%/.test(JSON.stringify(rd)), rd);
  ok("C7.6-2 fail (P-71): with facts unanswered, IMM 5257 blocks with \"missing facts\"", rd?.ready === false && codes(rd?.blocks).includes("missing_facts"), codes(rd?.blocks));
  let r = await call("POST", `/runtime/filings/${fid}/ready`, {}, officer);
  ok("C7.6-3 fail: \"Ready to file\" is refused by the server (409) and lists the blocks", r.status === 409 && Array.isArray(r.body?.blocks) && r.body.blocks.length > 0, r.status);

  await fillEverything(c.id);
  // QA-122: an optional fact with a problem, confirmed, still blocks the form it fills.
  const v = await agent(c.id);
  const opt = v?.sections?.flatMap((s: { questions: { subjectId: string; fact: string; required: boolean; hidden: boolean; group: string | null; value_type: string; fills: { form: string }[] }[] }) => s.questions)
    .find((q: { subjectId: string; required: boolean; hidden: boolean; group: string | null; value_type: string; fills: { form: string }[] }) => q.subjectId === P && !q.required && !q.hidden && !q.group && q.value_type === "date" && q.fills.some((x) => x.form === "IMM 5257"));
  if (opt) { await answer(c.id, P, opt.fact, "1990-13-45"); const sec = v.sections.find((s: { questions: { fact: string }[] }) => s.questions.some((q) => q.fact === opt.fact)); const seen = (await agent(c.id)).sections.find((s: { section: string; subjectId: string }) => s.section === sec.section && s.subjectId === P).questions.map((q: { answer: { id: string } | null }) => q.answer?.id).filter(Boolean); await call("POST", `/runtime/cases/${c.id}/sections/${sec.section}/confirm`, { subjectId: P, seen }, "user-O"); }
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  ok("C7.6-4 fail (QA-122): an optional date confirmed as 1990-13-45 blocks IMM 5257 as a fact with a problem", !!opt && codes(rd?.blocks).includes("fact_problem") && rd!.blocks.some((b) => b.words.includes("IMM 5257")), { fact: opt?.fact, blocks: codes(rd?.blocks) });
  if (opt) await answer(c.id, P, opt.fact, "1990-01-15");
  await fillEverything(c.id);
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  ok("C7.6-5 pass: with every fact confirmed, the fact blocks are gone", !codes(rd?.blocks).some((x) => ["missing_facts", "fact_problem", "open_check"].includes(x)), codes(rd?.blocks));
  ok("C7.6-6 fail (P-144, VV-R18): IMM 5257 on PDF upload with no validated copy read back blocks", codes(rd?.blocks).includes("barcode_not_validated") && rd!.blocks.some((b) => b.code === "barcode_not_validated" && /IMM 5257/.test(b.words)));
  ok("C7.6-7 fail (P-136): IMM 5476 (signed by hand and scanned) with no signed scan blocks as a missing required signature", rd!.blocks.some((b) => b.code === "missing_signature" && /IMM 5476/.test(b.words)), codes(rd?.blocks));
  ok("C7.6-8 fail (P-155): the representative's review not done blocks", codes(rd?.blocks).includes("representative_review"));
  ok("C7.6-9 pass: a missing document (passport not received) only warns", codes(rd?.warns).includes("missing_document") && !codes(rd?.blocks).includes("missing_document"));

  // Clear each block the way the item's channel requires.
  ok("C7.6-10 pass: IMM 5257 validated copy read back (the built C-9 route)", !!(await validateRoundTrip(c.id, "IMM 5257", P)));
  const i5476 = itemsOf(p, P, "IMM 5476")[0];
  await generateCopy(c.id, "IMM 5476", P); // print → sign by hand → scan (P-143)
  const scan = await sendFile(`/runtime/items/${i5476?.id}/signed-scan`, signedScan("IMM 5476"), "imm5476-signed.pdf", officer);
  ok("C7.6-11 pass: the signed scan of IMM 5476 is uploaded", scan.status === 201, scan.status);
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  ok("C7.6-12 pass: the barcode and signature blocks are gone; only the review remains", !codes(rd?.blocks).includes("barcode_not_validated") && !codes(rd?.blocks).includes("missing_signature") && codes(rd?.blocks).includes("representative_review"), codes(rd?.blocks));
  r = await call("POST", `/runtime/filings/${fid}/review`, { note: "Reviewed (Sample)" }, officer);
  ok("C7.6-13 fail (P-155): a case officer cannot do the representative's review (403)", r.status === 403 || officer === f.rep, r.status);
  r = await call("POST", `/runtime/filings/${fid}/review`, { note: "Reviewed (Sample)" }, f.rep ?? "");
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  ok("C7.6-14 pass: the representative of record reviews; the block clears; the record will read \"Prepared by · Reviewed by\"", r.status === 200 && !codes(rd?.blocks).includes("representative_review") && r.body?.reviewed_by === f.rep, r.body);
  r = await call("POST", `/runtime/filings/${fid}/ready`, {}, officer);
  ok("C7.6-15 fail: with only warnings left, Ready to file still needs each warning passed with a reason (409 names them)", r.status === 409 && codes(r.body?.warns).includes("missing_document"), r.body);
  r = await call("POST", `/runtime/filings/${fid}/warnings/missing_document/pass`, {}, officer);
  ok("C7.6-16 fail: passing a warning without a reason is refused (400)", r.status === 400, r.status);
  r = await call("POST", `/runtime/filings/${fid}/warnings/missing_document/pass`, { reason: "Passport uploaded in the portal directly (Sample)" }, officer);
  ok("C7.6-17 pass: a permitted person passes the warning with a written reason, recorded", r.status === 200 && Number(sql(`select count(*) from readiness_pass where filing_id='${fid}'`) ?? 0) === 1);
  ok("C7.6-18 fail: a client cannot pass warnings or mark ready (403)", (await call("POST", `/runtime/filings/${fid}/ready`, {}, CLIENT)).status === 403);
  r = await call("POST", `/runtime/filings/${fid}/ready`, {}, officer);
  ok("C7.6-19 pass: Ready to file succeeds; the filing's status is ready_to_file", r.status === 200 && filingOf((await prepare(c.id, officer)).p, P)?.status === "ready_to_file", r.body);

  // P-151: an edition past IRCC's accepted-until date blocks (needs W1-16 edition attributes).
  const ed = sql(`select e.id from form_edition e join gov_form_def g on g.id=e.gov_form_def_id where g.form_key='IMM 5707' limit 1`);
  r = await call("PATCH", `/editions/${ed}/accepted-until`, { acceptedUntil: yearsAgo(0, 1), reason: "Superseded edition (Sample)" }, "user-A");
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  ok("C7.6-20 fail (P-151): IMM 5707's edition past its accepted-until date blocks (\"Adopt update\")", r.status < 300 && codes(rd?.blocks).includes("edition_expired"), codes(rd?.blocks));

  // Solo firm: "Self-reviewed".
  const solo = await openCase(vv, [{ role: "principal", name: "Sample Client S", dob: yearsAgo(30) }], { representative: f.soloRep, caseOfficers: [f.soloRep ?? ""] });
  const sf = (await prepare(solo.id, f.soloRep ?? "")).p?.filings[0]?.id;
  r = await call("POST", `/runtime/filings/${sf}/review`, { self: true, note: "I prepared and reviewed this filing myself" }, f.soloRep ?? "");
  ok("C7.6-21 pass: a solo representative's review is logged \"Self-reviewed\" with name, licence number and time, never as a second person", r.status === 200 && r.body?.kind === "self_reviewed" && !!r.body?.licence_number, r.body);
});
