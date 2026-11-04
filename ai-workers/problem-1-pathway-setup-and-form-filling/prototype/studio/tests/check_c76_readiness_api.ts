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
// Breaker B1 recheck: with the new validated copy and a fresh review, it is ready again.
await validateRoundTrip(c.id, "IMM 5257", P);
r = await call("POST", `/runtime/filings/${fid}/review`, { note: "Reviewed again (Sample)" }, rep);
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
const noteBad = await call("POST", `/runtime/filings/${fid}/review`, { note: "Fine‮enif" }, "user-T");
const noteLong = await call("POST", `/runtime/filings/${fid}/review`, { note: "x".repeat(401) }, "user-T");
ok("B6 fail: a review note with a hidden direction mark, or over 400 characters, is refused (400), never cut", noteBad.status === 400 && noteLong.status === 400, [noteBad.status, noteLong.status]);
// B8: two passes at once record one row; a submitted filing is closed.
const both = await Promise.all([1, 2, 3].map(() => call("POST", `/runtime/filings/${fid}/warnings/representative_review/pass`, { reason: "Representative on leave; partner read it (Sample)" }, officer)));
ok("B8 fail: three passes of one line at once record it once (one 200, the others 409)", both.filter((x) => x.status === 200).length === 1 && both.filter((x) => x.status === 409).length === 2 && count(`select count(*) from readiness_pass where filing_id='${fid}' and code='representative_review'`) === 1, both.map((x) => x.status));
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
const waiting = (pf?.items ?? []).filter((i) => i.subject === S && i.kind === "form" && i.state === "cannot_start");
const frd = readinessOf(pf, filingOf(pf, S)?.id);
ok("B3 fail: a form that cannot start yet stands as a CRITICAL \"missing facts\" line naming the form", waiting.length > 0 && waiting.every((i) => (frd?.warns ?? []).some((w) => w.code === "missing_facts" && w.item === i.id && w.words.includes(i.form ?? "?"))), { waiting: waiting.map((i) => i.form), warns: (frd?.warns ?? []).map((w) => w.words.slice(0, 60)) });

// B9: in a firm with another representative, the one who prepared the filing is not "Self-reviewed".
const own = await openCase(vv, [{ role: "principal", name: "Sample Client G", dob: yearsAgo(39) }], { representative: rep, caseOfficers: [rep] });
const og = (await prepare(own.id, rep)).p?.filings[0]?.id;
r = await call("POST", `/runtime/filings/${og}/review`, { self: true, note: "I prepared and reviewed this filing myself" }, rep);
ok("B9 fail: in the Sample firm (another representative exists) the representative who prepared it cannot self-review (409)", r.status === 409 && count(`select count(*) from filing_review where filing_id='${og}'`) === 0, r.status);

// B7: accepted-until takes a plain day only.
const ed = sql(`select e.id from form_edition e join gov_form_def g on g.id=e.gov_form_def_id where g.form_key='IMM 5707' and e.channel <> 'ONLINE' limit 1`);
const until = await Promise.all(["2026-12-01T99:99:99", "2026-12-01T10:00:00Z", "0000-01-01", "1999-12-31", 20261201].map((d) => call("PATCH", `/editions/${ed}/accepted-until`, { acceptedUntil: d, reason: "Superseded edition (Sample)" }, AUTHOR)));
ok("B7 fail: a timestamp, year 0000 or 1999, or a number is refused (400), never a 500", until.every((x) => x.status === 400), until.map((x) => x.status));

process.exitCode = summary() ? 1 : 0;
