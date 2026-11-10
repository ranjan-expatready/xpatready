// C8.2 filing record, slice 1 (runtime lane, M3-F; AG-7-95; tech lead on #509 Q4 and #541): the routes on an isolated
// copy with the Visitor visa released twice (as check_vv_prepare_api.ts). Each rule has a passing and a failing case:
// the application number on each filing (normalised, refused in the wrong shape, a stale read refused, cleared, the same
// number on another case warns and saves, audited without the number in its words), the UCI read from the person's own
// answer, and who may do it (a client 403, another firm's officer 404). Pack 4's acceptance/C8.2.test.ts (record the
// submission per group) waits for Ready to file (L-SA3, held): not run here. US$0.
//   zsh studio/tools/isolated.sh runtime_c82 4433 start && tsx studio/tests/check_c82_filing_record_api.ts 4433 xr_studio_runtime_c82
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";
import * as m3 from "../acceptance/lib/m3.ts"; // pack 4's helpers (open a case, prepare, answer), on this same copy

const PORT = Number(process.argv[2] ?? 4433), DB = process.argv[3] ?? "xr_studio_runtime_c82";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, "..");
const tsx = (file: string) => spawnSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, file), String(PORT), DB], { encoding: "utf8", timeout: 600_000 });
const releases = () => Number(sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") ?? 0);
type Rec = { our_reference: string; filings: { id: string; person: string; application_number: string | null; applicants: { subject: string; uci: string | null }[] }[]; warning?: string | null; note?: string };

(async () => {
  if (releases() === 0) ok("setup: release 1 of the Visitor visa", tsx("tests/runtime/setup_visitor_visa.ts").status === 0 && releases() === 1);
  if (releases() === 1) { tsx("acceptance/lib/setup_vv_m3.ts"); ok("setup: release 2 (pack 4 setup) with filing modes", releases() === 2); }
  const f = await m3.firms(), officer = f.officer ?? m3.OFFICER;
  const vv = m3.needVisitorVisa();
  const c = await m3.openCase(vv, [{ role: "principal", name: "Sample Client A", dob: m3.yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: m3.yearsAgo(38) }], { representative: f.rep, caseOfficers: [officer] });
  const [P, S] = [c.subjects["Sample Client A"], c.subjects["Sample Spouse A"]];
  const read = async (actor = officer) => { const r = await call("GET", `/runtime/cases/${c.id}/filing-record`, undefined, actor); return { r, rec: r.status === 200 ? r.body as Rec : null }; };
  let { r, rec } = await read();
  ok("C8.2 setup: before Prepare there are no filings, and the record says to open Prepare first", r.status === 200 && rec?.filings.length === 0 && /Prepare/.test(rec?.note ?? ""), r.body);
  await m3.prepare(c.id, officer);
  ({ r, rec } = await read());
  const fP = rec?.filings.find((x) => x.applicants.some((a) => a.subject === P)), fS = rec?.filings.find((x) => x.applicants.some((a) => a.subject === S));
  ok("C8.2 pass: the record shows our reference and one filing per person filing their own, with no number yet", rec?.our_reference === c.body?.reference && !!fP && !!fS && fP!.id !== fS!.id && rec!.filings.every((x) => x.application_number === null), rec);
  const put = (id: string | undefined, value: string | null, before: string | null, actor = officer) => call("PUT", `/runtime/filings/${id}/application-number`, { value, before }, actor);

  r = await put(fP?.id, " w12-345 6789 ", null);
  ok("C8.2 AG-7-95 r1 pass: a number is stored upper-case without spaces or hyphens", r.status === 200 && (r.body as Rec).filings.find((x) => x.id === fP?.id)?.application_number === "W123456789" && sql(`select application_number from filing where id='${fP?.id}'`) === "W123456789", r.body);
  r = await put(fS?.id, "IMM5476", null);
  ok("C8.2 AG-7-95 r1 fail: a form code is refused (422) with the shape, and nothing is saved", r.status === 422 && /W123456789/.test(JSON.stringify(r.body)) && sql(`select coalesce(application_number,'none') from filing where id='${fS?.id}'`) === "none", r.body);
  r = await put(fP?.id, "W223456789", null);
  ok("C8.2 fail: a number changed since it was read is refused (409), nothing overwritten", r.status === 409 && sql(`select application_number from filing where id='${fP?.id}'`) === "W123456789", r.status);
  r = await put(fP?.id, "W223456789", "W123456789", m3.CLIENT);
  ok("C8.2 fail: a client cannot set a filing's number (403)", r.status === 403, r.status);
  r = await put(fP?.id, "W223456789", "W123456789", "user-S");
  ok("C8.2 fail (C6.11): another firm's officer gets no such filing (404)", r.status === 404, r.status);
  r = await put(fP?.id, "W223456789", "W123456789");
  ok("C8.2 pass: the case officer changes it when the number read is the current one", r.status === 200 && sql(`select application_number from filing where id='${fP?.id}'`) === "W223456789", r.body);
  const audit = sql(`select summary || '|' || (detail->>'before') || '|' || (detail->>'after') from audit_event where entity='application number' and entity_key='${fP?.id}' order by at desc limit 1`) ?? sql(`select summary || '|' || (detail->>'before') || '|' || (detail->>'after') from audit_event where entity='application number' and entity_key='${fP?.id}' order by created_at desc limit 1`) ?? "";
  ok("C8.2 AG-7-95 safety: the change is audited with before and after, and the number is not in the audit's words", /changed the application number/.test(audit) && audit.endsWith("|W123456789|W223456789") && !/W\d/.test(audit.split("|")[0]), audit);

  // Devin on #553 (security): the activity feed shows the change to this firm's staff only, never to another firm's.
  type Ev = { entity: string; entityKey: string | null; detail?: { before?: string | null; after?: string | null } | null };
  const feed = async (actor: string) => { const x = await call("GET", "/activity", undefined, actor); return (x.status === 200 ? x.body as Ev[] : []).filter((e) => e.entity === "application number" && e.entityKey === fP?.id); };
  ok("C8.2 pass: the firm's own officer sees the number's change in the activity feed", (await feed(officer)).length >= 2);
  ok("C8.2 fail (C6.11, security): another firm's staff never see this case's application-number lines (nor their before and after)", (await feed("user-S")).length === 0);
  // Breaker M1 on #553: configuration people read every line of the feed, but never a government identifier in it.
  const cfg = await feed("user-A");
  ok("C8.2 fail (security, AG-7-95 safety): the activity feed never carries the numbers, for configuration people either (the audit row keeps them)", cfg.length >= 2 && cfg.every((e) => !e.detail) && (await feed(officer)).every((e) => !e.detail) && sql(`select count(*) from audit_event where entity='application number' and entity_key='${fP?.id}' and detail->>'after' is not null`) !== "0", cfg.map((e) => e.detail));

  // AG-7-95 r4: the same number on another case of the firm warns and saves.
  // Devin on #553: a person whose name reads like a case marker ("case ffffffff") must not move the line to another case.
  const c2 = await m3.openCase(vv, [{ role: "principal", name: "Sample case ffffffff", dob: m3.yearsAgo(30) }], { representative: f.rep, caseOfficers: [officer] });
  await m3.prepare(c2.id, officer);
  const f2 = ((await call("GET", `/runtime/cases/${c2.id}/filing-record`, undefined, officer)).body as Rec).filings[0];
  r = await put(f2?.id, "W223456789", null);
  const feed2 = ((await call("GET", "/activity", undefined, officer)).body as { entity: string; entityKey: string | null }[]).filter((e) => e.entity === "application number" && e.entityKey === f2?.id);
  ok("C8.2 pass (security): a person named \"Sample case ffffffff\" does not hide the line from the own firm (the case marker comes first)", feed2.length === 1, feed2.length);
  ok("C8.2 AG-7-95 r4 pass: the same number on another case warns with that case's reference, and is saved", r.status === 200 && (r.body as Rec).warning === `Already on case ${c.body?.reference}.` && sql(`select application_number from filing where id='${f2?.id}'`) === "W223456789", r.body);
  // Reviewer M2 on #553: the duplicate warning stays inside the firm: another firm saving the same number hears nothing.
  const solo = "user-S";
  const cs = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C82-SOLO-${Date.now().toString(36)}`, clientActor: m3.CLIENT, principal: { displayName: "Sample Client S" }, representative: solo, caseOfficers: [solo] }, solo);
  await call("GET", `/runtime/cases/${cs.body?.id}/prepare`, undefined, solo);
  const fSolo = ((await call("GET", `/runtime/cases/${cs.body?.id}/filing-record`, undefined, solo)).body as Rec | null)?.filings[0];
  r = await put(fSolo?.id, "W223456789", null, solo);
  ok("C8.2 AG-7-95 r4 fail (firm, C6.11): the same number on another firm's filing gives that firm no warning and names none of our cases", cs.status < 300 && r.status === 200 && (r.body as Rec).warning === null && !JSON.stringify(r.body).includes(c.body?.reference ?? "@@"), { open: cs.status, put: r.status, warning: (r.body as Rec | null)?.warning });
  // Reviewer m1 on #553: a filing no longer on the application (its person stopped applying) is not changed.
  sql(`update filing set active=false where id='${fS?.id}'`);
  r = await put(fS?.id, "V300000003", null);
  ok("C8.2 fail: a filing that is no longer on the application is not changed (409)", r.status === 409 && sql(`select coalesce(application_number,'none') from filing where id='${fS?.id}'`) === "none", r.status);
  sql(`update filing set active=true where id='${fS?.id}'`);
  r = await put(fS?.id, "V300000002", null);
  ok("C8.2 AG-7-95 r4 fail: a number on no other filing gives no warning", r.status === 200 && (r.body as Rec).warning === null, r.body);
  r = await put(fS?.id, null, "V300000002");
  ok("C8.2 pass: the number is cleared (null), and the audit says cleared", r.status === 200 && sql(`select coalesce(application_number,'none') from filing where id='${fS?.id}'`) === "none" && /cleared the application number/.test(sql(`select string_agg(summary, ' ') from audit_event where entity_key='${fS?.id}'`) ?? ""), r.body);

  // The UCI is the person's own answer (AG-7-95 r2: one per person), read through the person scope, never copied.
  ok("C8.2 fail: with no UCI answered the applicant's UCI is empty", (await read()).rec?.filings.find((x) => x.id === fS?.id)?.applicants[0]?.uci === null);
  const a = await m3.answer(c.id, S, "person.uci", "0123456789", officer); // the officer enters it (from a document or record)
  ok("C8.2 pass: the spouse's UCI answered on the spouse shows on the spouse's filing, and only there", a.status < 300 && (await read()).rec?.filings.find((x) => x.id === fS?.id)?.applicants[0]?.uci === "0123456789" && (await read()).rec?.filings.find((x) => x.id === fP?.id)?.applicants[0]?.uci === null, a.body);
  ok("C8.2 pass (data): no UCI is copied onto the filing (the person's answer is the one record)", sql(`select count(*) from client_canonical_answer where subject_id='${S}' and canonical_field_key='person.uci' and superseded_by_id is null`) === "1");
  r = await call("GET", `/runtime/cases/${c.id}/filing-record`, undefined, m3.CLIENT);
  ok("C8.2 fail: a client cannot read the filing record (403)", r.status === 403, r.status);
  process.exitCode = summary() ? 1 : 0; // B160: a red line fails the suite (run-suites.sh judges the exit code; before, it always exited 0)
})();
