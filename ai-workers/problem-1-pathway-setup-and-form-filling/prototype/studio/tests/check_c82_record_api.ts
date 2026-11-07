// C8.2 Record the submission (runtime lane, M3-F; r5c BR-11, BR-12, BR-15, BR-21; AV-6, P-142 D7, P-155, P-168): the
// acceptance pack's rules (acceptance/C8.2.test.ts -1 to -12) through the API on an isolated copy, against a fixture
// filing in `ready_to_file` (C7.6's Ready to file, #861, is not on main yet: the fixture sets the stored status the
// Prepare view reads), plus the refusals and the read-only lock the pack does not reach. Sample data, no model call (US$0).
// It runs the pack's own setup on its copy first when the copy has no release 2 of Visitor visa yet.
//   zsh studio/tools/isolated.sh rt_c82 4431 start && tsx studio/tests/check_c82_record_api.ts 4431 xr_studio_rt_c82
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { AUTHOR, CLIENT, DB, PORT, answer, call, sendFile, fillEverything, firms, inDays, itemsOf, needVisitorVisa, openCase, prepare, readyToFile, sql, yearsAgo, type Prepare } from "../acceptance/lib/m3.ts";
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
type Rec = { portal: string | null; our_reference: string; submitted_on: string; application_number: string; fee_receipt: string | null; fee_receipt_files?: { id: string; file_name: string; media_type: string; size_bytes: number; uploaded_by: string; uploaded_at: string }[]; prepared_by: { id: string; name: string }; reviewed_by: { id: string; name: string } | null; ucis: { subject: string; uci: string }[]; corrections: { before: string; after: string; reason: string; by: string }[] };
type Filing = Prepare["filings"][number] & { record?: Rec; read_only?: boolean };
const filingsOf = (p: Prepare | null) => (p?.filings ?? []) as Filing[];
/** Every filing of the case to Ready to file: C7.6's own way (readyToFile: review, warnings passed, Mark ready) once its
 *  routes are on main; until then (#861 not merged) the fixture writes the stored status "Mark ready" writes. Once C7.6
 *  is on main its view takes a stored Ready to file that is not ready back to Not started, so the fixture alone would not do. */
async function fixtureReady(caseId: string): Promise<string> {
  const real = await readyToFile(caseId, rep);
  if (real.length) return "C7.6";
  sql(`update filing set status='READY_TO_FILE' where case_id='${caseId}' and active`);
  return "fixture";
}

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

const how = await fixtureReady(c.id);
p = (await prepare(c.id, officer)).p;
ok(`C8.2-2 pass (${how}): both filings read Ready to file`, filingsOf(p).every((x) => x.status === "ready_to_file"), filingsOf(p).map((x) => x.status));

// Field checks (Problem Details naming the field).
r = await record(body({ filings: [{ ...line(fP, "", "SAMPLE-REF-1") }, line(fS, "V300000102", "SAMPLE-REF-2")] }));
ok("C8.2-3 fail: a missing application number is refused on its field (400)", r.status === 400 && /application number/i.test(JSON.stringify(r.body)) && field(r) === "filings.0.application_number", r.body);
r = await record(body({ filings: [line(fP, "12345", "SAMPLE-REF-1"), line(fS, "V300000102", "SAMPLE-REF-2")] }));
ok("C8.2-3 fail: an application number in the wrong shape is refused on its field (400, says the shape)", r.status === 400 && field(r) === "filings.0.application_number" && /look like/i.test(JSON.stringify(r.body)), r.body);
r = await record(body({ filings: [{ ...line(fP, "V300000101", "SAMPLE-REF-1"), submitted_on: inDays(2) }, line(fS, "V300000102", "SAMPLE-REF-2")] }));
ok("C8.2-4 fail: a submission date after today is refused on its field (400)", r.status === 400 && /today|future/i.test(JSON.stringify(r.body)) && field(r) === "filings.0.submitted_on", r.body);
r = await record(body({ filings: [{ ...line(fP, "V300000101", "SAMPLE-REF-1"), submitted_on: "2026-02-30" }, line(fS, "V300000102", "SAMPLE-REF-2")] }));
ok("C8.2-4 fail: a date that does not exist (30 February) is refused (400)", r.status === 400 && field(r) === "filings.0.submitted_on", r.body);
r = await record(body({ filings: [{ ...line(fP, "V300000101", "SAMPLE-REF-1"), submitted_on: "1985-01-01" }, line(fS, "V300000102", "SAMPLE-REF-2")] }));
ok("fail (break m): a date implausibly far in the past is refused (400; an earlier submission on a case taken over is allowed, break R2-m3)", r.status === 400 && field(r) === "filings.0.submitted_on" && /too far in the past/.test(JSON.stringify(r.body)), r.body);
r = await record(body({ filings: [{ ...line(fP, "", "SAMPLE-REF-1"), submitted_on: inDays(3) }, line(fS, "", "SAMPLE-REF-2")] }));
const fields = ((r.body as { errors?: { field: string }[] })?.errors ?? []).map((e) => e.field);
ok("fail (break m): every field's problem comes back at once, each on its field", r.status === 400 && ["filings.0.submitted_on", "filings.0.application_number", "filings.1.application_number"].every((x) => fields.includes(x)), fields);
r = await record(body({ ucis: [{ subject: P, uci: "hello world" }, { subject: S, uci: "2222-2222" }] }));
ok("fail (break M3): a UCI not in the release's shape for a UCI is refused on its field (400)", r.status === 400 && fields.length >= 0 && ((r.body as { errors?: { field: string }[] })?.errors ?? []).some((e) => e.field === "ucis.0.uci"), r.body);
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

// B149 (P-408): the fee receipt's evidence goes on a recorded filing only.
const receipt = (label: string) => Buffer.from(`%PDF-1.4\n% SYNTHETIC SPECIMEN: IRCC Transaction Approved page, ${label} (Sample)\n%%EOF\n`, "latin1");
const upload = (filing: string | undefined, file: Buffer, name = "transaction-approved.pdf", actor = officer) => sendFile(`/runtime/filings/${filing ?? "none"}/record/fee-receipt`, file, name, actor);
let u = await upload(fP, receipt("early"));
ok("B149 fail: a fee receipt before the submission is recorded is refused (409, says to record first), nothing stored", u.status === 409 && /Record the submission first/.test(JSON.stringify(u.body)) && sql(`select count(*) from fee_receipt_file where case_id='${c.id}'`) === "0", u);

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
// B149 (P-408; board agent-view frame 7): IRCC's "Transaction Approved" page is the fee receipt's evidence, apart from
// the typed number (optional: the browser walk records a filing with none).
u = await upload(fP, receipt("client C"), "Transaction Approved.pdf");
p = (await prepare(c.id, officer)).p;
let files = filingsOf(p).find((x) => x.id === fP)?.record?.fee_receipt_files ?? [];
const sha = createHash("sha256").update(receipt("client C")).digest("hex");
ok("B149 pass: the officer uploads the Transaction Approved page on a recorded filing (200); the record lists it with who and when",
  u.status === 200 && files.length === 1 && files[0].file_name === "Transaction Approved.pdf" && files[0].media_type === "application/pdf" && !!files[0].uploaded_by && !!files[0].uploaded_at, { u, files });
ok("B149 data: stored once, with the file's sha256, on that filing only", sql(`select sha256 || '|' || filing_id || '|' || uploaded_by from fee_receipt_file where case_id='${c.id}'`) === `${sha}|${fP}|${officer}`);
ok("B149 pass: the typed number and the upload are apart: the spouse's filing keeps its typed number and has no upload (the client's upload did not reach it)", filingsOf(p).find((x) => x.id === fS)?.record?.fee_receipt === "SAMPLE-RECEIPT" && (filingsOf(p).find((x) => x.id === fS)?.record?.fee_receipt_files ?? []).length === 0);
u = await upload(fP, receipt("client C, again"), "approved-2.pdf");
p = (await prepare(c.id, officer)).p;
files = filingsOf(p).find((x) => x.id === fP)?.record?.fee_receipt_files ?? [];
ok("B149 pass: a new upload keeps the earlier one (append-only); the newest is listed last", u.status === 200 && files.map((x) => x.file_name).join() === "Transaction Approved.pdf,approved-2.pdf");
// m3.ts sql answers null when the database refuses the statement.
const dbRefused = sql(`update fee_receipt_file set file_name='x' where case_id='${c.id}'`) === null;
ok("B149 fail (data): a stored receipt is never changed in place (the database refuses an UPDATE)", dbRefused && sql(`select count(*) from fee_receipt_file where case_id='${c.id}' and file_name='x'`) === "0");
const before = sql(`select count(*) from fee_receipt_file where case_id='${c.id}'`);
u = await upload(fP, receipt("client"), "x.pdf", CLIENT);
ok("B149 fail (permissions): the case's client cannot upload a fee receipt (403)", u.status === 403, u.status);
u = await upload(fP, receipt("author"), "x.pdf", AUTHOR);
ok("B149 fail (permissions): a configuration person is refused before the file is read (403)", u.status === 403, u.status);
u = await upload(fP, receipt("other firm"), "x.pdf", "user-S");
ok("B149 fail (permissions, break m2): another firm's staff cannot reach this case's filing: 404 \"No such filing.\", as for one that does not exist", u.status === 404 && /No such filing\./.test(JSON.stringify(u.body)), u);
u = await upload(fP, Buffer.concat([Buffer.from("%PDF-1.4\n", "latin1"), Buffer.alloc(20 * 1024 * 1024 + 1 - 9)]), "big.pdf");
ok("B149 fail (review M2, break m1): a page over 20 MB is refused (413) in its own words, naming 20 MB (not the intake's 25 MB)", u.status === 413 && /larger than 20 MB/.test(JSON.stringify(u.body)) && !/25 MB/.test(JSON.stringify(u.body)), u);
u = await upload(fP, Buffer.from("MZ\x90\x00 not a receipt", "latin1"), "receipt.pdf");
ok("B149 fail: a file that is not a PDF, JPEG or PNG by its bytes is refused (422), whatever its name", u.status === 422 && /PDF, JPEG or PNG/.test(JSON.stringify(u.body)), u);
u = await upload(fP, Buffer.alloc(0), "empty.pdf");
ok("B149 fail: an empty file is refused (400)", u.status === 400 && /empty/i.test(JSON.stringify(u.body)), u);
u = await upload("00000000-0000-0000-0000-000000000000", receipt("none"), "x.pdf");
ok("B149 fail: a filing that does not exist is 404", u.status === 404, u.status);
ok("B149 data: none of the refusals stored a row", sql(`select count(*) from fee_receipt_file where case_id='${c.id}'`) === before);
ok("B149 data: the audit line names no receipt number or file name", sql(`select count(*) from audit_event where entity='fee receipt' and summary like '%${c.id.slice(0, 8)}%' and summary not like '%approved-2%' and summary not like '%SAMPLE-RECEIPT%'`) === "2");
ok("C8.2-8 fail (BR-15): a second recording is refused (409)", r.status === 409 && /already recorded/i.test(JSON.stringify(r.body)) && /problems\/conflict/.test(JSON.stringify(r.body)), r.body);
// Review M1, break B1 and M1: the case's people are not changed once recorded.
r = await call("POST", `/runtime/cases/${c.id}/people`, { role: "child", displayName: "Sample Child C1" }, officer);
ok("fail (review M1, break M1): nobody is added to a recorded case (409); no new filing appears", r.status === 409 && /recorded as submitted/i.test(JSON.stringify(r.body)) && sql(`select count(*) from filing where case_id='${c.id}'`) === "2", r.body);
r = await call("PATCH", `/runtime/cases/${c.id}/people/${S}`, { applies: false }, officer);
ok("fail (review M1, break B1): a person on a recorded filing is not marked not travelling (409); the recorded filing stays", r.status === 409 && sql(`select active from filing where id='${fS}'`) === "t", r.body);

// The read-only lock.
const imm = itemsOf(p, P, "IMM 5257")[0];
r = await call("PATCH", `/runtime/items/${imm?.id}/channel`, { channel: "PAPER", reason: "Accommodation (Sample)", version: p?.version }, officer);
ok("C8.2-9 fail: after recording the filing is read-only: even an accepted channel change is refused (409)", r.status === 409 && /read-only/i.test(JSON.stringify(r.body)), r.body);
r = await call("POST", `/runtime/groups/${g?.id}/split`, { filing: fS, reason: "Split after filing (Sample)", version: p?.version }, officer);
ok("fail (lock): a recorded group cannot be split (409)", r.status === 409 && /read-only/i.test(JSON.stringify(r.body)), r.body);
r = await call("PUT", `/runtime/filings/${fP}/application-number`, { value: "V300000199", before: "V300000101" }, officer);
ok("fail (lock): the filing record's own number route is refused once recorded (409, says Correct a number)", r.status === 409 && /correct a number/i.test(JSON.stringify(r.body)) && sql(`select application_number from filing where id='${fP}'`) === "V300000101", r.body);

// Correct a number.
r = await call("POST", `/runtime/filings/${fP}/record/corrections`, { application_number: "V300000102", reason: "Typo (Sample)" }, officer);
ok("fail (review M2, break M2): a correction to the number of another filing of the same submission is refused (400)", r.status === 400 && field(r) === "application_number" && /another filing of this submission/i.test(JSON.stringify(r.body)) && sql(`select application_number from filing_record where filing_id='${fP}'`) === "V300000101", r.body);
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
// Break M3: a person's UCI is corrected with a reason, the old one kept; the wrong shape is refused.
r = await call("POST", `/runtime/filings/${fS}/record/corrections`, { uci: { subject: S, uci: "hello" }, reason: "Typo (Sample)" }, officer);
ok("fail (break M3): a corrected UCI not in the release's shape is refused (400, on the UCI)", r.status === 400 && field(r) === "uci.uci", r.body);
r = await call("POST", `/runtime/filings/${fS}/record/corrections`, { uci: { subject: S, uci: "2222-3333" }, reason: "Letter shows another UCI (Sample)" }, officer);
const recS2 = filingsOf((await prepare(c.id, officer)).p).find((x) => x.id === fS)?.record;
ok("pass (break M3): a person's UCI is corrected with a reason; the old one stays in the history", r.status === 200 && sql(`select uci from filing_person_record where filing_id='${fS}' and subject_id='${S}'`) === "2222-3333"
  && (recS2?.corrections as unknown as { field: string; before: string; after: string }[] | undefined)?.some((x) => x.field === "uci" && x.before === "2222-2222" && x.after === "2222-3333"), recS2);
sql(`update filing_record set our_reference='x' where filing_id='${fP}'`); // refused by the trigger (sql answers null)
ok("data (break m): a record changes in place only in its application number", sql(`select our_reference from filing_record where filing_id='${fP}'`) === "SAMPLE-REF-1");
ok("data: a correction is never changed in place (append-only)", /Typo/.test(sql(`select reason from filing_record_correction where filing_id='${fP}'`) ?? ""));
const unrecorded = await openCase(vv, [{ role: "principal", name: "Sample Client D", dob: yearsAgo(30) }], { representative: rep, caseOfficers: [officer] });
const fD = filingsOf((await prepare(unrecorded.id, officer)).p)[0]?.id;
r = await call("POST", `/runtime/filings/${fD}/record/corrections`, { application_number: "V300000110", reason: "Typo (Sample)" }, officer);
ok("fail: a filing that is not recorded has no number to correct (409)", r.status === 409, r.body);

// A fact changed after filing (BR-12, P-142 D7).
ok("pass: before a change, no item is \"Filed with an earlier value\" and no task is open", !itemsOf(p, P).some((i) => i.state === "out_of_date") && sql(`select count(*) from case_task where case_id='${c.id}'`) === "0", itemsOf(p, P).map((i) => i.state));
// Break M4: the same value typed again (left unconfirmed) is no change: no item marked, no task.
const filedName = JSON.parse(sql(`select value_json from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name' and superseded_by_id is null`) ?? "null");
await answer(c.id, P, "person.family_name", filedName, officer);
p = (await prepare(c.id, officer)).p;
ok("pass (break M4): the same family name typed again is no change after filing: nothing marked, no task", !itemsOf(p, P).some((i) => i.state === "out_of_date") && sql(`select count(*) from case_task where case_id='${c.id}'`) === "0", itemsOf(p, P).map((i) => i.state));
const changedBy = await answer(c.id, P, "person.family_name", "SAMPLEDY", officer); // from the passport (verified_document)
ok("setup: the officer enters the corrected family name after filing (facts stay the person's, never locked)", changedBy.status < 300, changedBy.body);
p = (await prepare(c.id, officer)).p;
ok("C8.2-12 pass (BR-12, P-142 D7): a fact changed after filing marks the filed items \"Filed with an earlier value\" and opens a task to re-sign or tell IRCC (Unconfirmed: no counsel)",
  itemsOf(p, P).some((i) => i.state === "out_of_date" && /earlier value/i.test(i.reason ?? "") && /no counsel/i.test(i.reason ?? "")) && Number(sql(`select count(*) from case_task where case_id='${c.id}' and kind='after_filing_change'`) ?? 0) >= 1, itemsOf(p, P).map((i) => [i.form, i.state, i.reason]));
ok("pass: the reason says whose fact changed, in words (never the fact's key)", itemsOf(p, P).some((i) => /Sample Client C's answer to “[^”]+” changed after Sample Client C's IMM 5257/.test(i.reason ?? "")) && !itemsOf(p, P).some((i) => /person\.family_name/.test(i.reason ?? "")), itemsOf(p, P).map((i) => i.reason));
const filedOf = (i: unknown) => (i as { filed?: { current: boolean } }).filed;
ok("pass: a filed form that does not read the changed fact stays as it was (the spouse's IMM 5476)", itemsOf(p, S, "IMM 5476").every((i) => filedOf(i)?.current === true && i.state !== "out_of_date") && itemsOf(p, S, "IMM 5476").length === 1, itemsOf(p, S, "IMM 5476"));
ok("pass: the spouse's forms that read the principal's name (IMM 5257 spouse part) are marked too", itemsOf(p, S, "IMM 5257").every((i) => i.state === "out_of_date"), itemsOf(p, S).map((i) => [i.form, i.state]));
const tasks = sql(`select count(*) from case_task where case_id='${c.id}'`);
await prepare(c.id, officer);
ok("pass: reading again opens no second task for the same change", sql(`select count(*) from case_task where case_id='${c.id}'`) === tasks, tasks);
ok("pass: the Prepare view lists the open task", ((p as unknown as { tasks?: { kind: string; state: string }[] }).tasks ?? []).some((t) => t.kind === "after_filing_change" && t.state === "open"), (p as unknown as { tasks?: unknown }).tasks);

// Break M4: the name changed back to the value filed: the forms read current again and their tasks close by themselves.
await answer(c.id, P, "person.family_name", filedName, officer);
p = (await prepare(c.id, officer)).p;
ok("pass (break M4): the value changed back to the one filed: no form is marked and every task closed by itself", !itemsOf(p, P).some((i) => i.state === "out_of_date") && sql(`select count(*) from case_task where case_id='${c.id}' and state='open'`) === "0" && Number(sql(`select count(*) from case_task where case_id='${c.id}' and state='done' and done_by='rules'`)) >= 1,
  sql(`select string_agg(state, ',') from case_task where case_id='${c.id}'`));

// Break R2-B1: a UCI travels in no activity line: another firm sees none of this case's lines, and no reader sees a UCI.
// (C8.1's "sign step" and "signed scan" lines reach other firms on main already: reported to the tech lead on #924.)
type Line = { entity: string; summary: string; detail: unknown };
const feedOf = async (who: string) => ((await call("GET", "/activity", undefined, who)).body ?? []) as Line[];
const mine = (l: Line) => l.summary.includes(c.id.slice(0, 8)) && ["submission group", "application number", "person", "fee receipt"].includes(l.entity) && /UCI|submission|application number|fee receipt/i.test(l.summary);
const [feedS, feedA] = [await feedOf("user-S"), await feedOf("user-A")];
ok("fail (break R2-B1): another firm's feed has none of this case's record, number or UCI lines, and no feed carries a UCI or a number",
  !feedS.some(mine) && feedA.some((l) => mine(l) && /UCI/.test(l.summary)) && ![feedS, feedA].some((f) => /2222-3333|2222-2222|1111-1111|V30000010/.test(JSON.stringify(f))), { other: feedS.filter(mine).map((l) => l.summary) });

// Break R2-M1: a record and "not travelling" sent at the same time never both pass (the people are checked under the lock).
// Break R2-M2 on the same cases: a form filed with an answer left unconfirmed does not read out of date after filing.
for (const k of [1, 2]) {
  const rc = await openCase(vv, [{ role: "principal", name: `Sample Client R${k}`, dob: yearsAgo(41) }, { role: "spouse_or_partner", name: `Sample Spouse R${k}`, dob: yearsAgo(39) }], { representative: rep, caseOfficers: [officer] });
  const [rP, rS] = [rc.subjects[`Sample Client R${k}`], rc.subjects[`Sample Spouse R${k}`]];
  await fillEverything(rc.id);
  const typed = JSON.parse(sql(`select value_json from client_canonical_answer where subject_id='${rP}' and canonical_field_key='person.family_name' and superseded_by_id is null`) ?? "null");
  await answer(rc.id, rP, "person.family_name", typed, officer); // the same value again, left unconfirmed
  await fixtureReady(rc.id);
  const rp = (await prepare(rc.id, officer)).p;
  const fs = rp?.filings.map((x) => x.id) ?? [];
  const [rec, move, put] = await Promise.all([
    call("PATCH", `/runtime/groups/${rp?.groups[0]?.id}/record`, { filings: fs.map((id, i) => line(id, `V30000${k}20${i}`, `SAMPLE-R${k}-${i}`)), ucis: [], version: rp?.version }, officer),
    call("PATCH", `/runtime/cases/${rc.id}/people/${rS}`, { applies: false }, officer),
    // Devin on #924: slice 1's PUT application-number at the same moment never leaves the filing and its record apart.
    call("PUT", `/runtime/filings/${fs[0]}/application-number`, { value: `V30000${k}299`, before: null }, officer),
  ]);
  ok(`fail (Devin on #924, run ${k}): a record and the old number route at once never leave a filing's number and its record apart`,
    sql(`select count(*) from filing f join filing_record r on r.filing_id = f.id where f.case_id='${rc.id}' and f.application_number <> r.application_number`) === "0", { record: rec.status, put: put.status });
  const active = sql(`select count(*) from filing where case_id='${rc.id}' and active`), records = sql(`select count(*) from filing_record where case_id='${rc.id}'`);
  ok(`fail (break R2-M1, run ${k}): a record and "not travelling" at once never both pass; a recorded filing never goes inactive`, !(rec.status === 200 && move.status === 200) && (records === "0" || active === records), { record: rec.status, move: move.status, active, records });
  if (rec.status === 200) {
    const after = (await prepare(rc.id, officer)).p;
    ok(`pass (break R2-M2, run ${k}): a form filed with an answer left unconfirmed does not read out of date after filing`, !itemsOf(after, rP).some((i) => i.state === "out_of_date") && sql(`select count(*) from case_task where case_id='${rc.id}'`) === "0", itemsOf(after, rP).map((i) => [i.form, i.state]));
  }
}

process.exitCode = summary() ? 1 : 0;
