// C8.2 Filing records: portal, our reference, application number and UCI (M3-F; r5c BR-11, BR-15, BR-16, BR-21;
// AV-6, P-155, P-168). Visitor visa part: one "Record the submission" per submission group; per filing our reference,
// submitted on (not after today), the application number (required) and the fee receipt; a UCI per person; refused
// while a filing in the group is not Ready to file; recording makes the filings read-only; a second recording is
// refused; "Correct a number" keeps the history; the record reads "Prepared by · Reviewed by" as the review saw them,
// whoever records (QA-295: also when the representative of record records). B149 (P-408; board agent-view frame 7): the
// fee receipt's evidence is IRCC's "Transaction Approved" page, uploaded on the recorded filing; the typed number is optional.
// Breadth, after Visitor visa: the sponsorship + PR pair (two numbers, one group, no split), citizenship envelopes.
//   tsx studio/acceptance/C8.2.test.ts 4440 xr_studio_accept
import { CLIENT, OFFICER, call, firms, sendFile, inDays, main, needVisitorVisa, ok, openCase, prepare, readyToFile, sql, yearsAgo, answer, itemsOf } from "./lib/m3.ts";

await main("C8.2", "Record the submission per group (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? OFFICER;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }], { representative: f.rep, caseOfficers: [officer] });
  const [P, S] = [c.subjects["Sample Client A"], c.subjects["Sample Spouse A"]];
  let p = (await prepare(c.id, officer)).p;
  const g = p?.groups[0], [fP, fS] = [p?.filings.find((x) => x.applicants[0]?.subject === P)?.id, p?.filings.find((x) => x.applicants[0]?.subject === S)?.id];
  const body = (over: Record<string, unknown> = {}) => ({ filings: [{ filing: fP, our_reference: "SAMPLE-REF-1", submitted_on: inDays(0), application_number: "V300000001", fee_receipt: "SAMPLE-RECEIPT" }, { filing: fS, our_reference: "SAMPLE-REF-2", submitted_on: inDays(0), application_number: "V300000002", fee_receipt: "SAMPLE-RECEIPT" }], ucis: [{ subject: P, uci: "1111-1111" }, { subject: S, uci: "2222-2222" }], version: p?.version, ...over });

  let r = await call("PATCH", `/runtime/groups/${g?.id}/record`, body(), officer);
  ok("C8.2-1 fail (BR-11, P-168): recording is refused while the filings are not Ready to file (409, names the blocks)", r.status === 409 && /ready to file/i.test(JSON.stringify(r.body)), r.status);
  const ready = await readyToFile(c.id, f.rep);
  ok("C8.2-2 pass: both filings reach Ready to file (setup for the record)", ready.length === 2, ready);
  p = (await prepare(c.id, officer)).p;
  r = await call("PATCH", `/runtime/groups/${g?.id}/record`, body({ version: p?.version, filings: [{ ...body().filings[0], application_number: "" }, body().filings[1]] }), officer);
  ok("C8.2-3 fail: a missing application number is refused on its field (400, Problem Details)", r.status === 400 && /application number/i.test(JSON.stringify(r.body)), r.body);
  r = await call("PATCH", `/runtime/groups/${g?.id}/record`, body({ version: p?.version, filings: [{ ...body().filings[0], submitted_on: inDays(2) }, body().filings[1]] }), officer);
  ok("C8.2-4 fail: a submission date after today is refused on its field (400)", r.status === 400 && /today|future/i.test(JSON.stringify(r.body)), r.body);
  r = await call("PATCH", `/runtime/groups/${g?.id}/record`, body({ version: p?.version }), CLIENT);
  ok("C8.2-5 fail: a client cannot record the submission (403)", r.status === 403, r.status);
  r = await call("PATCH", `/runtime/groups/${g?.id}/record`, body({ version: p?.version }), officer);
  p = (await prepare(c.id, officer)).p;
  ok("C8.2-6 pass: one action records the whole group: each filing has its own number, status submitted", r.status === 200 && p?.filings.every((x) => x.status === "submitted") && p.filings.find((x) => x.id === fP)?.number === "V300000001" && p.filings.find((x) => x.id === fS)?.number === "V300000002", p?.filings);
  ok("C8.2-7 pass (data): the record keeps the portal, our reference, date, receipt, the UCI per person, Prepared by and Reviewed by",
    sql(`select portal || '|' || our_reference || '|' || prepared_by || '|' || reviewed_by from filing_record where filing_id='${fP}'`) === `APR_PORTAL|SAMPLE-REF-1|${officer}|${f.rep}` && sql(`select uci from filing_person_record where subject_id='${S}' and filing_id='${fS}'`) === "2222-2222");
  r = await call("PATCH", `/runtime/groups/${g?.id}/record`, body({ version: p?.version }), officer);
  ok("C8.2-8 fail (BR-15): a second recording is refused (409)", r.status === 409, r.status);
  r = await call("PATCH", `/runtime/items/${itemsOf(p, P, "IMM 5257")[0]?.id}/channel`, { channel: "PAPER", reason: "Accommodation (Sample)", version: p?.version }, officer);
  ok("C8.2-9 fail: after recording the filing is read-only: even an accepted channel change is refused (409)", r.status === 409, r.status);
  r = await call("POST", `/runtime/filings/${fP}/record/corrections`, { application_number: "V300000009" }, officer);
  ok("C8.2-10 fail: correcting a number without a reason is refused (400)", r.status === 400, r.status);
  r = await call("POST", `/runtime/filings/${fP}/record/corrections`, { application_number: "V300000009", reason: "Typo in the number (Sample)" }, officer);
  ok("C8.2-11 pass: \"Correct a number\" changes it and keeps the old one in the history with the reason", r.status === 200 && (await prepare(c.id, officer)).p?.filings.find((x) => x.id === fP)?.number === "V300000009" && sql(`select count(*) from filing_record_correction where filing_id='${fP}'`) === "1");
  // #924: the family name is entered by the officer from the passport (`collected_from: verified_document` in both Visitor
  // visa releases), so a client's change is refused (403) and nothing changes; the officer enters the corrected name.
  await answer(c.id, P, "person.family_name", "SAMPLEDY", officer);
  p = (await prepare(c.id, officer)).p;
  ok("C8.2-12 pass (BR-12, P-142 D7): a fact changed after filing marks the filed items \"Filed with an earlier value\" and opens a task to re-sign or tell IRCC (Unconfirmed: no counsel)",
    itemsOf(p, P).some((i) => i.state === "out_of_date" && /earlier value/i.test(i.reason ?? "")) && Number(sql(`select count(*) from case_task where case_id='${c.id}' and kind='after_filing_change'`) ?? 0) >= 1);
  // QA-295 (P-155 (1)): when the representative of record records, the record still names the case officer who prepared
  // and the representative who reviewed: never "Representative · Self-reviewed".
  const c2 = await openCase(vv, [{ role: "principal", name: "Sample Client B", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse B", dob: yearsAgo(38) }], { representative: f.rep, caseOfficers: [officer] });
  const ready2 = await readyToFile(c2.id, f.rep);
  let p2 = (await prepare(c2.id, officer)).p;
  const lines2 = (p2?.filings ?? []).map((x, i) => ({ filing: x.id, our_reference: `SAMPLE-REF-B${i + 1}`, submitted_on: inDays(0), application_number: `V30000001${i + 1}`, fee_receipt: "SAMPLE-RECEIPT" }));
  r = await call("PATCH", `/runtime/groups/${p2?.groups[0]?.id}/record`, { version: p2?.version, filings: lines2, ucis: [] }, f.rep!);
  ok("C8.2-13 pass (QA-295): the representative of record records the submission (200)", ready2.length === 2 && r.status === 200, [ready2.length, r.status, r.body?.detail]);
  ok("C8.2-14 pass (QA-295, data): the record names the case officer as preparer and the representative as reviewer, whoever recorded",
    sql(`select string_agg(distinct prepared_by || '|' || coalesce(reviewed_by, '-') || '|' || recorded_by, ',') from filing_record where case_id='${c2.id}'`) === `${officer}|${f.rep}|${f.rep}`,
    sql(`select string_agg(distinct prepared_by || '|' || coalesce(reviewed_by, '-') || '|' || recorded_by, ',') from filing_record where case_id='${c2.id}'`));
  p2 = (await prepare(c2.id, officer)).p;
  const recs = (p2?.filings ?? []).map((x) => (x as { record?: { prepared_by?: { id: string }; reviewed_by?: { id: string; self: boolean } | null } }).record);
  ok("C8.2-15 fail (QA-295): no filing the case officer prepared reads Self-reviewed", recs.length === 2 && recs.every((x) => x?.prepared_by?.id === officer && x?.reviewed_by?.id === f.rep && x?.reviewed_by?.self === false), recs);
  // QA-295 review M1: a filing made Ready to file with the review warning passed (no review): the representative records;
  // the record names the case officer as preparer and nobody as reviewer, never "Representative · Self-reviewed".
  const c3 = await openCase(vv, [{ role: "principal", name: "Sample Client C", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  const ready3 = await readyToFile(c3.id, null);
  let p3 = (await prepare(c3.id, officer)).p;
  r = await call("PATCH", `/runtime/groups/${p3?.groups[0]?.id}/record`, { version: p3?.version, filings: (p3?.filings ?? []).map((x, i) => ({ filing: x.id, our_reference: `SAMPLE-REF-C${i + 1}`, submitted_on: inDays(0), application_number: `V30000002${i + 1}`, fee_receipt: "SAMPLE-RECEIPT" })), ucis: [] }, f.rep!);
  const rec3 = sql(`select string_agg(distinct prepared_by || '|' || coalesce(reviewed_by, '-') || '|' || recorded_by, ',') from filing_record where case_id='${c3.id}'`);
  ok("C8.2-16 fail (QA-295 review M1): with the review passed, not done, the record names the officer and no reviewer (never Self-reviewed)", ready3.length === 1 && r.status === 200 && rec3 === `${officer}|-|${f.rep}`, [ready3.length, r.status, rec3]);
  p3 = (await prepare(c3.id, officer)).p;
  const v3 = (p3?.filings ?? []).map((x) => (x as { record?: { prepared_by?: { id: string }; reviewed_by?: unknown } }).record);
  ok("C8.2-17 pass (QA-295): its view names the officer as preparer and gives no reviewer", v3.length === 1 && v3[0]?.prepared_by?.id === officer && v3[0]?.reviewed_by === null, v3);

  // B149 (P-408): the fee receipt's evidence on the first case's recorded filing.
  const page = Buffer.from("%PDF-1.4\n% SYNTHETIC SPECIMEN: IRCC Transaction Approved page (Sample)\n%%EOF\n", "latin1");
  let u = await sendFile(`/runtime/filings/${fP}/record/fee-receipt`, page, "transaction-approved.pdf", CLIENT);
  ok("C8.2-18 fail (B149): a client cannot upload the fee receipt (403); nothing is stored", u.status === 403 && sql(`select count(*) from fee_receipt_file where filing_id='${fP}'`) === "0", u.status);
  u = await sendFile(`/runtime/filings/${fP}/record/fee-receipt`, page, "transaction-approved.pdf", officer);
  const files = ((await prepare(c.id, officer)).p?.filings.find((x) => x.id === fP) as { record?: { fee_receipt_files?: { file_name: string }[] } } | undefined)?.record?.fee_receipt_files ?? [];
  ok("C8.2-19 pass (B149): the officer uploads IRCC's Transaction Approved page as the fee receipt's evidence; the record lists it", u.status === 200 && files.length === 1 && files[0].file_name === "transaction-approved.pdf", { status: u.status, files });
});
