// QA-295 (Bug · Major, proposed; C8.2, P-155 (1)): the recorded submission must name who prepared the filing and who
// reviewed it, whoever presses "Record the submission". Today it stores the person who records as the preparer
// (api/src/submission.ts: preparedBy = actor), so when the representative of record records a filing the case officer
// prepared and the representative reviewed, the read-only record reads "Representative · Self-reviewed".
// FAILS today; PASSES when the record keeps the preparer the review saw. US$0, no model call.
//   tsx studio/tests/qa/check_qa295_prepared_by.ts <port> <database>     (an isolated copy on the configured checkpoint)
import { OFFICER, call, firms, inDays, main, needVisitorVisa, ok, openCase, prepare, readyToFile, sql, yearsAgo } from "../../acceptance/lib/m3.ts";

await main("QA-295", "The recorded submission keeps who prepared and who reviewed (P-155 (1))", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? OFFICER;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client Q", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse Q", dob: yearsAgo(38) }], { representative: f.rep, caseOfficers: [officer] });
  const ready = await readyToFile(c.id, f.rep);
  ok("QA-295-1 pass: both filings Ready to file, reviewed by the representative of record (setup)", ready.length === 2, ready);
  let p = (await prepare(c.id, officer)).p;
  const kinds = sql(`select string_agg(distinct kind || ':' || reviewed_by, ',') from filing_review r join filing fl on fl.id = r.filing_id where fl.case_id = '${c.id}'`);
  ok("QA-295-2 pass: the review is a second person's review, not a self-review (setup)", kinds === `reviewed:${f.rep}`, kinds);
  const g = p?.groups[0];
  const lines = (p?.filings ?? []).map((x, i) => ({ filing: x.id, our_reference: `SAMPLE-QA295-${i + 1}`, submitted_on: inDays(0), application_number: `W30000029${i + 1}` }));
  const r = await call("PATCH", `/runtime/groups/${g?.id}/record`, { version: p?.version, filings: lines, ucis: [] }, f.rep!);
  ok("QA-295-3 pass: the representative of record records the submission (200)", r.status === 200, r.status);
  const rows = sql(`select string_agg(distinct prepared_by || '|' || coalesce(reviewed_by, '-'), ',') from filing_record where case_id = '${c.id}'`);
  ok("QA-295-4 pass (P-155 (1)): the record names the case officer as preparer and the representative as reviewer", rows === `${officer}|${f.rep}`, rows);
  p = (await prepare(c.id, officer)).p;
  const shown = JSON.stringify(p);
  ok("QA-295-5 pass: no recorded filing reads Self-reviewed when another person prepared it", /"prepared_by"/.test(shown) && !/"self":\s*true/.test(shown), shown.match(/"reviewed_by":\{[^}]*\}/g)?.slice(0, 2));
});
