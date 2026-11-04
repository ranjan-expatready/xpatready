// C8.2 Record the submission (runtime lane, M3-F; r5c BR-11, BR-12, BR-15, BR-21; AV-6, P-142 D7, P-155, P-168): the
// acceptance pack's rules (acceptance/C8.2.test.ts -1 to -12) through the API on an isolated copy, against a fixture
// filing in `ready_to_file` (C7.6's Ready to file, #861, is not on main yet: the fixture sets the stored status the
// Prepare view reads), plus the refusals and the read-only lock the pack does not reach. Sample data, no model call (US$0).
// It runs the pack's own setup on its copy first when the copy has no release 2 of Visitor visa yet.
//   zsh studio/tools/isolated.sh rt_c82 4431 start && tsx studio/tests/check_c82_record_api.ts 4431 xr_studio_rt_c82
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { CLIENT, DB, PORT, answer, call, fillEverything, firms, inDays, itemsOf, needVisitorVisa, openCase, prepare, sql, yearsAgo, type Prepare } from "../acceptance/lib/m3.ts";
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
const officer = f.officer!, rep = f.rep!;
type Rec = { portal: string | null; our_reference: string; submitted_on: string; application_number: string; fee_receipt: string | null; prepared_by: { id: string; name: string }; reviewed_by: { id: string; name: string } | null; ucis: { subject: string; uci: string }[]; corrections: { before: string; after: string; reason: string; by: string }[] };
type Filing = Prepare["filings"][number] & { record?: Rec; read_only?: boolean };
const filingsOf = (p: Prepare | null) => (p?.filings ?? []) as Filing[];
/** The fixture: every filing of the case stored as Ready to file (what C7.6's "Mark ready" writes). */
const fixtureReady = (caseId: string) => sql(`update filing set status='READY_TO_FILE' where case_id='${caseId}' and active`);

// A case with two adults, every fact answered and confirmed (so the forms have facts to file), both filings ready.
const c = await openCase(vv, [{ role: "principal", name: "Sample Client C", dob: yearsAgo(41) }, { role: "spouse_or_partner", name: "Sample Spouse C", dob: yearsAgo(39) }], { representative: rep, caseOfficers: [officer] });
const [P, S] = [c.subjects["Sample Client C"], c.subjects["Sample Spouse C"]];
await fillEverything(c.id);
let p = (await prepare(c.id, officer)).p;
const g = p?.groups[0];
const [fP, fS] = [filingsOf(p).find((x) => x.applicants[0]?.subject === P)?.id, filingsOf(p).find((x) => x.applicants[0]?.subject === S)?.id];
ok("setup: the case has one family group with the principal's and the spouse's filings", !!g && g.filings.length === 2 && !!fP && !!fS, p?.groups);
const line = (filing: string | undefined, n: string, ref: string) => ({ filing, our_reference: ref, submitted_on: inDays(0), application_number: n, fee_receipt: "SAMPLE-RECEIPT" });
const body = (over: Record<string, unknown> = {}) => ({ filings: [line(fP, "V300000101", "SAMPLE-REF-1"), line(fS, "V300000102", "SAMPLE-REF-2")], ucis: [{ subject: P, uci: "1111-1111" }, { subject: S, uci: "2222-2222" }], version: p?.version, ...over });
const record = (b: unknown, actor = officer) => call("PATCH", `/runtime/groups/${g?.id}/record`, b, actor);
const field = (r: { body: unknown }) => ((r.body as { errors?: { field: string }[] })?.errors ?? [])[0]?.field;

// Before Ready to file.
let r = await record(body());
ok("C8.2-1 fail (BR-11, P-168): recording is refused while the filings are not Ready to file (409, names the filings)", r.status === 409 && /ready to file/i.test(JSON.stringify(r.body)) && /Sample Client C/.test(JSON.stringify(r.body)), r.body);
ok("C8.2-1 data: nothing was recorded", sql(`select count(*) from filing_record where case_id='${c.id}'`) === "0" && sql(`select count(*) from filing where case_id='${c.id}' and status='SUBMITTED'`) === "0");

fixtureReady(c.id);
p = (await prepare(c.id, officer)).p;
ok("C8.2-2 pass (fixture): both filings read Ready to file", filingsOf(p).every((x) => x.status === "ready_to_file"), filingsOf(p).map((x) => x.status));

// Field checks (Problem Details naming the field).
r = await record(body({ filings: [{ ...line(fP, "", "SAMPLE-REF-1") }, line(fS, "V300000102", "SAMPLE-REF-2")] }));
ok("C8.2-3 fail: a missing application number is refused on its field (400)", r.status === 400 && /application number/i.test(JSON.stringify(r.body)) && field(r) === "filings.0.application_number", r.body);
r = await record(body({ filings: [line(fP, "12345", "SAMPLE-REF-1"), line(fS, "V300000102", "SAMPLE-REF-2")] }));
ok("C8.2-3 fail: an application number in the wrong shape is refused on its field (400, says the shape)", r.status === 400 && field(r) === "filings.0.application_number" && /look like/i.test(JSON.stringify(r.body)), r.body);
r = await record(body({ filings: [{ ...line(fP, "V300000101", "SAMPLE-REF-1"), submitted_on: inDays(2) }, line(fS, "V300000102", "SAMPLE-REF-2")] }));
ok("C8.2-4 fail: a submission date after today is refused on its field (400)", r.status === 400 && /today|future/i.test(JSON.stringify(r.body)) && field(r) === "filings.0.submitted_on", r.body);
r = await record(body({ filings: [{ ...line(fP, "V300000101", "SAMPLE-REF-1"), submitted_on: "2026-02-30" }, line(fS, "V300000102", "SAMPLE-REF-2")] }));
ok("C8.2-4 fail: a date that does not exist (30 February) is refused (400)", r.status === 400 && field(r) === "filings.0.submitted_on", r.body);
r = await record(body({ version: p?.version }), CLIENT);
ok("C8.2-5 fail: a client cannot record the submission (403)", r.status === 403, r.status);
r = await record(body({ filings: [line(fP, "V300000101", "SAMPLE-REF-1")] }));
ok("fail: one action records the whole group: a line missing for a filing is refused (400)", r.status === 400 && field(r) === "filings" && /every filing/i.test(JSON.stringify(r.body)), r.body);
r = await record(body({ filings: [line(fP, "V300000101", "SAMPLE-REF-1"), line(fS, "V300000101", "SAMPLE-REF-2")] }));
ok("fail: two filings of one submission with the same number are refused (400)", r.status === 400 && /same application number/i.test(JSON.stringify(r.body)), r.body);
r = await record(body({ ucis: [{ subject: c.caseSubject, uci: "3333-3333" }] }));
ok("fail: a UCI for someone not on the group's filings is refused on its field (400)", r.status === 400 && field(r) === "ucis.0.subject", r.body);
r = await record(body({ filings: [line(fP, "V300000101", " "), line(fS, "V300000102", "SAMPLE-REF-2")] }));
ok("fail: our reference is required (400)", r.status === 400 && /our reference/i.test(JSON.stringify(r.body)), r.body);
r = await record(body({ version: "stale-version" }));
ok("fail: a stale version is refused (409, Reload)", r.status === 409 && /reload/i.test(JSON.stringify(r.body)), r.body);
ok("data: none of the refusals recorded anything", sql(`select count(*) from filing_record where case_id='${c.id}'`) === "0" && sql(`select count(*) from filing_person_record where filing_id in ('${fP}','${fS}')`) === "0");

// The record.
r = await record(body());
p = (await prepare(c.id, officer)).p;
const recP = filingsOf(p).find((x) => x.id === fP), recS = filingsOf(p).find((x) => x.id === fS);
ok("C8.2-6 pass: one action records the whole group: each filing has its own number, status submitted", r.status === 200 && filingsOf(p).every((x) => x.status === "submitted") && recP?.number === "V300000101" && recS?.number === "V300000102", r.body ?? filingsOf(p));
ok("C8.2-7 pass (data): the record keeps the portal, our reference, date, receipt, the UCI per person, Prepared by and Reviewed by",
  sql(`select portal || '|' || our_reference || '|' || submitted_on || '|' || fee_receipt || '|' || prepared_by || '|' || reviewed_by from filing_record where filing_id='${fP}'`) === `APR_PORTAL|SAMPLE-REF-1|${inDays(0)}|SAMPLE-RECEIPT|${officer}|${rep}` && sql(`select uci from filing_person_record where subject_id='${S}' and filing_id='${fS}'`) === "2222-2222",
  sql(`select portal || '|' || our_reference || '|' || prepared_by || '|' || coalesce(reviewed_by, '-') from filing_record where filing_id='${fP}'`));
ok("C8.2-7 pass (view): the Prepare view reads Prepared by · Reviewed by with names, the UCIs and read-only",
  recP?.record?.prepared_by.id === officer && recP.record.reviewed_by?.id === rep && !!recP.record.reviewed_by?.name && recP.record.ucis.some((u) => u.subject === P && u.uci === "1111-1111") && recP.read_only === true, recP?.record);
ok("data: the filing's own application number follows the record (slice 1's filing record reads it)", sql(`select application_number from filing where id='${fS}'`) === "V300000102");
ok("data: the audit line names no application number or UCI", sql(`select count(*) from audit_event where entity='submission group' and entity_key='${g?.id}' and summary not like '%V3000001%' and summary not like '%1111-1111%'`) === "1");
r = await record(body({ version: p?.version }));
ok("C8.2-8 fail (BR-15): a second recording is refused (409)", r.status === 409 && /already recorded/i.test(JSON.stringify(r.body)), r.status);

// The read-only lock.
const imm = itemsOf(p, P, "IMM 5257")[0];
r = await call("PATCH", `/runtime/items/${imm?.id}/channel`, { channel: "PAPER", reason: "Accommodation (Sample)", version: p?.version }, officer);
ok("C8.2-9 fail: after recording the filing is read-only: even an accepted channel change is refused (409)", r.status === 409 && /read-only/i.test(JSON.stringify(r.body)), r.body);
r = await call("POST", `/runtime/groups/${g?.id}/split`, { filing: fS, reason: "Split after filing (Sample)", version: p?.version }, officer);
ok("fail (lock): a recorded group cannot be split (409)", r.status === 409 && /read-only/i.test(JSON.stringify(r.body)), r.body);
r = await call("PUT", `/runtime/filings/${fP}/application-number`, { value: "V300000199", before: "V300000101" }, officer);
ok("fail (lock): the filing record's own number route is refused once recorded (409, says Correct a number)", r.status === 409 && /correct a number/i.test(JSON.stringify(r.body)) && sql(`select application_number from filing where id='${fP}'`) === "V300000101", r.body);

// Correct a number.
r = await call("POST", `/runtime/filings/${fP}/record/corrections`, { application_number: "V300000109" }, officer);
ok("C8.2-10 fail: correcting a number without a reason is refused (400, names the reason)", r.status === 400 && field(r) === "reason", r.body);
r = await call("POST", `/runtime/filings/${fP}/record/corrections`, { application_number: "bad", reason: "Typo (Sample)" }, officer);
ok("fail: a corrected number in the wrong shape is refused (400)", r.status === 400 && field(r) === "application_number", r.body);
r = await call("POST", `/runtime/filings/${fP}/record/corrections`, { application_number: "V300000101", reason: "Typo (Sample)" }, officer);
ok("fail: the same number again is not a correction (400)", r.status === 400 && /already recorded/i.test(JSON.stringify(r.body)), r.body);
r = await call("POST", `/runtime/filings/${fP}/record/corrections`, { application_number: "V300000109", reason: "Typo (Sample)" }, CLIENT);
ok("fail: a client cannot correct a number (403)", r.status === 403, r.status);
r = await call("POST", `/runtime/filings/${fP}/record/corrections`, { application_number: "V300000109", reason: "Typo in the number (Sample)" }, officer);
p = (await prepare(c.id, officer)).p;
const corr = filingsOf(p).find((x) => x.id === fP);
ok("C8.2-11 pass: \"Correct a number\" changes it and keeps the old one in the history with the reason", r.status === 200 && corr?.number === "V300000109" && sql(`select count(*) from filing_record_correction where filing_id='${fP}'`) === "1"
  && corr.record?.corrections[0]?.before === "V300000101" && corr.record.corrections[0].after === "V300000109" && /Typo/.test(corr.record.corrections[0].reason), corr?.record);
sql(`update filing_record_correction set reason='x' where filing_id='${fP}'`); // refused by the trigger (sql answers null)
ok("data: a correction is never changed in place (append-only)", /Typo/.test(sql(`select reason from filing_record_correction where filing_id='${fP}'`) ?? ""));
const unrecorded = await openCase(vv, [{ role: "principal", name: "Sample Client D", dob: yearsAgo(30) }], { representative: rep, caseOfficers: [officer] });
const fD = filingsOf((await prepare(unrecorded.id, officer)).p)[0]?.id;
r = await call("POST", `/runtime/filings/${fD}/record/corrections`, { application_number: "V300000110", reason: "Typo (Sample)" }, officer);
ok("fail: a filing that is not recorded has no number to correct (409)", r.status === 409, r.body);

// A fact changed after filing (BR-12, P-142 D7).
ok("pass: before a change, no item is \"Filed with an earlier value\" and no task is open", !itemsOf(p, P).some((i) => i.state === "out_of_date") && sql(`select count(*) from case_task where case_id='${c.id}'`) === "0", itemsOf(p, P).map((i) => i.state));
const changedBy = await answer(c.id, P, "person.family_name", "SAMPLEDY", officer); // from the passport (verified_document)
ok("setup: the officer enters the corrected family name after filing (facts stay the person's, never locked)", changedBy.status < 300, changedBy.body);
p = (await prepare(c.id, officer)).p;
ok("C8.2-12 pass (BR-12, P-142 D7): a fact changed after filing marks the filed items \"Filed with an earlier value\" and opens a task to re-sign or tell IRCC (Unconfirmed: no counsel)",
  itemsOf(p, P).some((i) => i.state === "out_of_date" && /earlier value/i.test(i.reason ?? "") && /no counsel/i.test(i.reason ?? "")) && Number(sql(`select count(*) from case_task where case_id='${c.id}' and kind='after_filing_change'`) ?? 0) >= 1, itemsOf(p, P).map((i) => [i.form, i.state, i.reason]));
ok("pass: the reason says whose fact changed, in words (never the fact's key)", itemsOf(p, P).some((i) => /Sample Client C's family name changed after IMM 5257/.test(i.reason ?? "")) && !itemsOf(p, P).some((i) => /person\.family_name/.test(i.reason ?? "")), itemsOf(p, P).map((i) => i.reason));
const filedOf = (i: unknown) => (i as { filed?: { current: boolean } }).filed;
ok("pass: a filed form that does not read the changed fact stays as it was (the spouse's IMM 5476)", itemsOf(p, S, "IMM 5476").every((i) => filedOf(i)?.current === true && i.state !== "out_of_date") && itemsOf(p, S, "IMM 5476").length === 1, itemsOf(p, S, "IMM 5476"));
ok("pass: the spouse's forms that read the principal's name (IMM 5257 spouse part) are marked too", itemsOf(p, S, "IMM 5257").every((i) => i.state === "out_of_date"), itemsOf(p, S).map((i) => [i.form, i.state]));
const tasks = sql(`select count(*) from case_task where case_id='${c.id}'`);
await prepare(c.id, officer);
ok("pass: reading again opens no second task for the same change", sql(`select count(*) from case_task where case_id='${c.id}'`) === tasks, tasks);
ok("pass: the Prepare view lists the open task", ((p as unknown as { tasks?: { kind: string; state: string }[] }).tasks ?? []).some((t) => t.kind === "after_filing_change" && t.state === "open"), (p as unknown as { tasks?: unknown }).tasks);

process.exitCode = summary() ? 1 : 0;
