// C7.6 Ready to file (runtime lane; L-SA3 under P-315, P-237, P-238; P-155, P-151): the breaker's findings on #861,
// each as a failing case through the API on an isolated copy with the pack's own setup. B1 a filing marked Ready to
// file goes back to Not started when the barcode copy stops matching, and "Uploaded to IRCC" is then refused; B2 a
// review counts only from the representative of record now, for the facts as they are now; B3 a form that cannot start
// yet stays on the list; B4 a key of the wrong type is refused; B6 the review note follows the text rule; B7 accepted-
// until takes a plain day only; B8 repeats record nothing twice and a submitted filing is closed; B9 Self-reviewed is a
// solo firm's; B10 the database refuses passes the API never writes. Sample data, no model call (US$0).
// It runs the pack's own setup on its copy first when the copy has no release 2 of Visitor visa yet.
//   zsh studio/tools/isolated.sh rt_c76 4436 start && tsx studio/tests/check_c76_readiness_api.ts 4436 xr_studio_rt_c76
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { AUTHOR, CLIENT, DB, OFFICER, PORT, answer, call, firms, itemsOf, needVisitorVisa, openCase, prepare, readinessOf, readyToFile, sql, filingOf, yearsAgo, validateRoundTrip } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const releases = () => { try { return Number(sql(`select coalesce(max(r.version), 0) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single'`)); } catch { return 0; } };
const studio = join(import.meta.dirname, ".."), tsx = join(studio, "node_modules", ".bin", "tsx");
const setup = (file: string) => spawnSync(tsx, ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, file), String(PORT), DB], { cwd: join(studio, ".."), stdio: "ignore", timeout: 900_000 });
if (releases() < 1) setup("tests/runtime/setup_visitor_visa.ts");
if (releases() < 2) setup("acceptance/lib/setup_vv_m3.ts");
ok("setup: the copy has Visitor visa release 2 (the pack's setup)", releases() >= 2, releases());
const vv = needVisitorVisa();
const f = await firms();
const officer = f.officer ?? OFFICER, rep = f.rep ?? "user-R";
const codes = (x: { code: string }[] | undefined) => (x ?? []).map((b) => b.code);
const count = (q: string) => Number(sql(q) ?? 0);
/** The filing's facts fingerprint as the prepare view shows it (a review sends back the one it read, N1). */
const fh = async (caseId: string, filing: string, actor = officer) => readinessOf((await prepare(caseId, actor)).p, filing)?.facts_hash;

// B1: Ready to file, then a fact the barcode form reads changes.
const c = await openCase(vv, [{ role: "principal", name: "Sample Client R", dob: yearsAgo(41) }], { representative: rep, caseOfficers: [officer] });
const P = c.subjects["Sample Client R"];
const ready = await readyToFile(c.id, rep);
let p = (await prepare(c.id, officer)).p;
const fid = filingOf(p, P)?.id ?? "";
ok("B1 setup: the filing reaches Ready to file", ready.includes(fid) && filingOf(p, P)?.status === "ready_to_file", ready);
let r = await call("POST", `/runtime/filings/${fid}/ready`, {}, officer);
ok("B8 pass: Ready to file again changes nothing and records nothing new (200, already)", r.status === 200 && r.body?.already === true && count(`select count(*) from audit_event where entity_key='${fid}' and action='ready_to_file'`) === 1, r.body);
await answer(c.id, P, "person.passport_number", "ZX9999999", officer);
p = (await prepare(c.id, officer)).p;
let rd = readinessOf(p, fid);
ok("B1 fail: a changed fact takes the filing back to Not started (stored), with the barcode block named", filingOf(p, P)?.status === "NOT_STARTED" && sql(`select status from filing where id='${fid}'`) === "NOT_STARTED" && codes(rd?.blocks).includes("barcode_not_validated"), { status: filingOf(p, P)?.status, blocks: codes(rd?.blocks) });
const i5476 = itemsOf(p, P, "IMM 5476")[0];
r = await call("POST", `/runtime/items/${i5476?.id}/sign-steps/uploaded_to_ircc`, {}, officer);
ok("B1 fail: \"Uploaded to IRCC\" is then refused (409), the hard stop is not skipped", r.status === 409, r.status);
// B2: the facts changed after the review, so the review is reopened.
ok("B2 fail: the review made before the change no longer counts; the CRITICAL warning says it was reviewed before", (rd?.warns ?? []).some((w) => w.code === "representative_review" && /reviewed on/.test(w.words)), codes(rd?.warns));
// N1 (round 2): a review of facts that changed after the representative read them is refused, never stamped.
const seen = await fh(c.id, fid, rep);
await answer(c.id, P, "person.passport_number", "ZX9999998", officer);
r = await call("POST", `/runtime/filings/${fid}/review`, { note: "Looked fine (Sample)", facts_hash: seen }, rep);
ok("N1 fail: a review sending the facts it read, after they changed, is refused (409), nothing stored", r.status === 409 && count(`select count(*) from filing_review where filing_id='${fid}' and note like 'Looked fine%'`) === 0, r.status);
r = await call("POST", `/runtime/filings/${fid}/review`, { note: "Looked fine (Sample)" }, rep);
ok("N1 fail: a review that does not say which facts it read is refused (400)", r.status === 400, r.status);
// Breaker B1 recheck: with the new validated copy and a fresh review, it is ready again.
await validateRoundTrip(c.id, "IMM 5257", P);
r = await call("POST", `/runtime/filings/${fid}/review`, { note: "Reviewed again (Sample)", facts_hash: await fh(c.id, fid, rep) }, rep);
rd = readinessOf((await prepare(c.id, officer)).p, fid);
ok("B2 pass: a fresh review by the representative of record clears it again", r.status === 200 && !codes(rd?.warns).includes("representative_review"), { status: r.status, warns: codes(rd?.warns) });
// B2: a new representative of record: the earlier one's review no longer counts.
const team = (await call("GET", `/runtime/cases/${c.id}/team`, undefined, rep)).body;
r = await call("PUT", `/runtime/cases/${c.id}/team/representative`, { userId: "user-T", reason: "Representative on leave (Sample)", expectedRepresentative: rep, version: team?.version }, rep);
rd = readinessOf((await prepare(c.id, officer)).p, fid);
ok("B2 fail: after the representative of record changes, the earlier representative's review no longer counts", r.status < 300 && codes(rd?.warns).includes("representative_review"), { status: r.status, warns: codes(rd?.warns) });
sql(`insert into filing_review (id, workspace_id, filing_id, reviewed_by, kind, licence_number, facts_hash) select gen_random_uuid(), workspace_id, id, '${CLIENT}', 'reviewed', 'X1', '${"0".repeat(64)}' from filing where id='${fid}' returning 1`);
rd = readinessOf((await prepare(c.id, officer)).p, fid);
ok("B2 fail (data): a review row written by anyone else (a client, in SQL) never counts", codes(rd?.warns).includes("representative_review"), codes(rd?.warns));

// B4, B6: bad shapes are refused.
r = await call("POST", `/runtime/filings/${fid}/warnings/representative_review/pass`, { reason: "Representative away (Sample)", key: 123 }, officer);
ok("B4 fail: a pass with a key that is not text is refused (400), nothing recorded", r.status === 400 && count(`select count(*) from readiness_pass where filing_id='${fid}' and code='representative_review'`) === 0, r.status);
const hT = await fh(c.id, fid, "user-T");
const noteBad = await call("POST", `/runtime/filings/${fid}/review`, { note: "Fine‮enif", facts_hash: hT }, "user-T");
const noteLong = await call("POST", `/runtime/filings/${fid}/review`, { note: "x".repeat(401), facts_hash: hT }, "user-T");
ok("B6 fail: a review note with a hidden direction mark, or over 400 characters, is refused (400), never cut", noteBad.status === 400 && noteLong.status === 400, [noteBad.status, noteLong.status]);
// B8: two passes at once record one row; a submitted filing is closed.
const both = await Promise.all([1, 2, 3].map(() => call("POST", `/runtime/filings/${fid}/warnings/representative_review/pass`, { reason: "Representative on leave; partner read it (Sample)" }, officer)));
ok("B8 fail: three passes of one line at once record it once (one 200, the others 409)", both.filter((x) => x.status === 200).length === 1 && both.filter((x) => x.status === 409).length === 2 && count(`select count(*) from readiness_pass where filing_id='${fid}' and code='representative_review'`) === 1, both.map((x) => x.status));
// N2 (round 2): a pass of "not reviewed" does not cover the filing once its facts change again.
await answer(c.id, P, "person.passport_number", "ZX9999997", officer);
rd = readinessOf((await prepare(c.id, officer)).p, fid);
ok("N2 fail: after a passed review warning, a further fact change opens the review warning again", codes(rd?.warns).includes("representative_review"), codes(rd?.warns));
sql(`update filing set status='SUBMITTED' where id='${fid}' returning 1`);
const closed = [await call("POST", `/runtime/filings/${fid}/review`, {}, "user-T"), await call("POST", `/runtime/filings/${fid}/warnings/missing_document/pass`, { reason: "Passport uploaded in the portal (Sample)" }, officer)];
ok("B8 fail: a filing recorded as submitted takes no review and no pass (409)", closed.every((x) => x.status === 409), closed.map((x) => x.status));
sql(`update filing set status='NOT_STARTED' where id='${fid}' returning 1`);

// B10: the database refuses passes the API never writes.
// The helper answers null when the database refuses a statement (acceptance/lib/m3.ts sql); a stored row answers "1".
const bad = (cols: string) => sql(`insert into readiness_pass (id, workspace_id, filing_id, code, keys, severity, reason, passed_by) select gen_random_uuid(), workspace_id, id, ${cols}, 'user-O' from filing where id='${fid}' returning 1`) === null;
ok("B10 pass (data): the same insert with a known code, a key and its own severity is stored (the refusals above are the checks)", !bad(`'missing_document', array['k-sql'], 'warning', 'Reason (Sample)'`));
ok("B10 fail (data): an unknown code, no keys, or a severity that does not go with the code is refused by the database", bad(`'nope', array['k'], 'warning', 'Reason (Sample)'`) && bad(`'missing_document', array[]::text[], 'warning', 'Reason (Sample)'`) && bad(`'missing_facts', array['k'], 'warning', 'Reason (Sample)'`) && bad(`'missing_document', array['k'], 'critical', 'Reason (Sample)'`));

// B3: a form that cannot start yet (no date of birth) is named, never dropped.
const fam = await openCase(vv, [{ role: "principal", name: "Sample Client F", dob: yearsAgo(44) }, { role: "spouse_or_partner", name: "Sample Spouse F", dob: null }], { representative: rep, caseOfficers: [officer] });
const pf = (await prepare(fam.id, officer)).p, S = fam.subjects["Sample Spouse F"];
// Row C9 (QA-246): a form that cannot start yet is listed apart from the forms to fill, in /prepare's `waiting`.
const waiting = ((pf as { waiting?: NonNullable<typeof pf>["items"] } | null)?.waiting ?? []).filter((i) => i.subject === S && i.kind === "form" && i.state === "cannot_start");
const frd = readinessOf(pf, filingOf(pf, S)?.id);
// N6 (round 2): a stored pass whose reason the rule refuses never takes its line: a real pass is still possible.
const line = (frd?.warns ?? []).find((w) => w.code === "missing_facts" && w.key);
sql(`insert into readiness_pass (id, workspace_id, filing_id, code, keys, severity, reason, passed_by) select gen_random_uuid(), workspace_id, id, 'missing_facts', array['${line?.key ?? "x"}'], 'critical', 'a' || repeat(chr(8288), 4), 'user-O' from filing where id='${filingOf(pf, S)?.id}' returning 1`);
r = await call("POST", `/runtime/filings/${filingOf(pf, S)?.id}/warnings/missing_facts/pass`, { reason: "Spouse sends the date of birth today (Sample)", key: line?.key }, officer);
ok("N6 fail: a stored pass the rule refuses (hidden characters) never blocks a real pass of its line (200)", !!line && r.status === 200, r.status);
ok("B3 fail: a form that cannot start yet stands as a CRITICAL \"missing facts\" line naming the form", waiting.length > 0 && waiting.every((i) => (frd?.warns ?? []).some((w) => w.code === "missing_facts" && w.item === i.id && w.words.includes(i.form ?? "?"))), { waiting: waiting.map((i) => i.form), warns: (frd?.warns ?? []).map((w) => w.words.slice(0, 60)) });

// B9, review m8 (BR-21: "a solo firm, or the representative did it all"): the representative who was the case's only
// officer self-reviews; once another officer worked on it, even after leaving it (N4), that is refused.
const own = await openCase(vv, [{ role: "principal", name: "Sample Client G", dob: yearsAgo(39) }], { representative: rep, caseOfficers: [rep] });
const og = (await prepare(own.id, rep)).p?.filings[0]?.id ?? "";
r = await call("POST", `/runtime/filings/${og}/review`, { self: true, note: "I prepared and reviewed this filing myself", facts_hash: await fh(own.id, og, rep) }, rep);
ok("B9 pass (BR-21): the representative who did it all self-reviews, logged Self-reviewed", r.status === 200 && r.body?.kind === "self_reviewed", r.body);
const two = await openCase(vv, [{ role: "principal", name: "Sample Client H", dob: yearsAgo(38) }], { representative: rep, caseOfficers: [rep] });
const tg = (await prepare(two.id, rep)).p?.filings[0]?.id ?? "";
const add = await call("POST", `/runtime/cases/${two.id}/team/officers`, { userId: officer }, rep);
// BK-18 (QA-448): the other officer really works on the case — being named on the team is not work, so N4's refusal
// stands on what the case holds (the officer's own answer), not on a team row.
await answer(two.id, two.subjects["Sample Client H"], "person.passport_number", "ZX9999991", officer);
const end = await call("POST", `/runtime/cases/${two.id}/team/officers/${rep}/end`, { reason: "Handing the case over (Sample)" }, rep);
r = await call("POST", `/runtime/filings/${tg}/review`, { note: "Reviewed (Sample)", facts_hash: await fh(two.id, tg, rep) }, rep);
const r2 = await call("POST", `/runtime/filings/${tg}/review`, { self: true, note: "I prepared and reviewed this filing myself", facts_hash: await fh(two.id, tg, rep) }, rep);
ok("N4 fail: a representative who prepared it with another officer who worked on it too (and then left the officer list) cannot review it, as a second person or as Self-reviewed (409)", add.status < 300 && end.status < 300 && r.status === 409 && r2.status === 409 && count(`select count(*) from filing_review where filing_id='${tg}'`) === 0, [add.status, end.status, r.status, r2.status]);

// BK-18 (QA-448, P-525 (1), P-510 (4), P-154): walk 1's step S8 through the routes. The case team has a case officer who
// does nothing; the representative opens the case, does the work and reviews it. The record is one person's: the
// representative is asked for the statement (400) and the review is logged Self-reviewed, never as a second person's.
const stamp = Date.now().toString(36);
const newCase = async (ref: string, name: string, who: string) => {
  const made = await call("POST", "/runtime/cases", { combinationId: vv, reference: `ACC-${ref}-${stamp}`, clientActor: CLIENT, principal: { displayName: name }, representative: rep, caseOfficers: [officer] }, who);
  return { id: made.body?.id as string, subject: (made.body?.people ?? []).find((x: { role: string }) => x.role === "principal")?.subject_id as string, status: made.status };
};
const s8 = await newCase("BK18", "Sample Client W", rep);
await answer(s8.id, s8.subject, "person.passport_number", "ZX9999992", rep); // the representative does the work
const sg = (await prepare(s8.id, rep)).p?.filings[0]?.id ?? "";
const asked = await call("POST", `/runtime/filings/${sg}/review`, { note: "Reviewed (Sample)", facts_hash: await fh(s8.id, sg, rep) }, rep);
const said = await call("POST", `/runtime/filings/${sg}/review`, { self: true, note: "I prepared and reviewed this filing myself", facts_hash: await fh(s8.id, sg, rep) }, rep);
ok("BK-18 (QA-448) fail before, pass after: a case officer on the team who did nothing never makes the representative's own work a second person's review — the statement is asked for (400), then it is logged Self-reviewed", s8.status < 300 && asked.status === 400 && said.status === 200 && said.body?.kind === "self_reviewed", [s8.status, asked.status, said.status, said.body?.kind]);

// BK-18 review B1 and M1: the case officer only opens the case; the representative does the work. Opening a case is not
// preparing its filings, so the review is the representative's own (Self-reviewed), never refused as a second person's.
const b1 = await newCase("BK18B1", "Sample Client V", officer);
await answer(b1.id, b1.subject, "person.passport_number", "ZX9999993", rep);
const b1f = (await prepare(b1.id, rep)).p?.filings[0]?.id ?? "";
const b1Asked = await call("POST", `/runtime/filings/${b1f}/review`, { note: "Reviewed (Sample)", facts_hash: await fh(b1.id, b1f, rep) }, rep);
const b1Did = await call("POST", `/runtime/filings/${b1f}/review`, { self: true, note: "I prepared and reviewed this filing myself", facts_hash: await fh(b1.id, b1f, rep) }, rep);
ok("BK-18 (review B1, M1) fail: opening a case is not preparing it — the representative who did the work self-reviews (400 then Self-reviewed), never a 409 naming a case officer who only opened it", b1Asked.status === 400 && b1Did.status === 200 && b1Did.body?.kind === "self_reviewed", [b1Asked.status, b1Did.status, b1Did.body?.kind, b1Asked.body?.detail]);

// BK-18 review B2 / breaker B3: the record says what was true when the review was made. Work done afterwards (here the
// case officer passing a warning with a reason, which leaves the review standing) never rewrites it.
const b1Warn = (readinessOf((await prepare(b1.id, rep)).p, b1f)?.warns ?? []).find((w: { code: string }) => w.code !== "representative_review");
const b1Passed = await call("POST", `/runtime/filings/${b1f}/warnings/${encodeURIComponent(b1Warn?.code ?? "")}/pass`, { reason: "The client sends it today (Sample)", key: b1Warn?.key }, officer);
const b1After = readinessOf((await prepare(b1.id, rep)).p, b1f) as { reviewed?: { kind: string }; prepared_by?: string[] } | undefined;
ok("BK-18 (review B2, breaker B3) fail: a case officer's later work does not turn a recorded self-review into a two-person record", b1Passed.status === 200 && b1After?.reviewed?.kind === "self_reviewed" && JSON.stringify(b1After?.prepared_by) === JSON.stringify([rep]), { passed: b1Passed.status, reviewed: b1After?.reviewed ?? null, prepared_by: b1After?.prepared_by ?? null });

// BK-18 review M2 / breaker B2: work that leaves no answer of its own still counts. The case officer passes a warning
// with a written reason; the representative who did the rest can no longer review it as a second person (BR-8, 409).
const m2 = await newCase("BK18M2", "Sample Client U", rep);
await answer(m2.id, m2.subject, "person.passport_number", "ZX9999994", rep);
const m2f = (await prepare(m2.id, rep)).p?.filings[0]?.id ?? "";
const m2Warn = (readinessOf((await prepare(m2.id, rep)).p, m2f)?.warns ?? []).find((w: { code: string }) => w.code !== "representative_review");
const m2Pass = await call("POST", `/runtime/filings/${m2f}/warnings/${encodeURIComponent(m2Warn?.code ?? "")}/pass`, { reason: "The client sends it today (Sample)", key: m2Warn?.key }, officer);
const m2Review = await call("POST", `/runtime/filings/${m2f}/review`, { self: true, note: "I prepared and reviewed this filing myself", facts_hash: await fh(m2.id, m2f, rep) }, rep);
ok("BK-18 (review M2, breaker B2) fail: a second person's work that leaves no answer row (a warning passed with a reason) still makes them a preparer, so the review is refused as a second person's (409)", m2Pass.status === 200 && m2Review.status === 409, [m2Warn?.code, m2Pass.status, m2Review.status]);

// B7: accepted-until takes a plain day only.
const ed = sql(`select e.id from form_edition e join gov_form_def g on g.id=e.gov_form_def_id where g.form_key='IMM 5707' and e.channel <> 'ONLINE' limit 1`);
const until = await Promise.all(["2026-12-01T99:99:99", "2026-12-01T10:00:00Z", "0000-01-01", "1999-12-31", 20261201].map((d) => call("PATCH", `/editions/${ed}/accepted-until`, { acceptedUntil: d, reason: "Superseded edition (Sample)" }, AUTHOR)));
ok("B7 fail: a timestamp, year 0000 or 1999, or a number is refused (400), never a 500", until.every((x) => x.status === 400), until.map((x) => x.status));

process.exitCode = summary() ? 1 : 0;
