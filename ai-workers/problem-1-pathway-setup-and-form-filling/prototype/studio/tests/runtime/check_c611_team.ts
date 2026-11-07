// C6.11 checks (runtime lane, M3-A; BR-20, stand-ins SI-9 and SI-15): the Sample firm and the Sample solo firm, their
// users and duties, the case team (one representative of record, case officers), assign and reassign with history, IMM
// 5476's representative part from the representative of record and the "new IMM 5476" change event, and firm
// isolation. Every rule with a passing and a failing case: the pure rules (engine/runtime/team.ts, no server) and the API
// and database on an isolated copy where setup_visitor_visa.ts released the Visitor visa (vv.single). Sample data; no
// model call (US$0).
//   zsh studio/tools/isolated.sh runtime_m3a 4431 start && tsx --tsconfig studio/api/tsconfig.json studio/tests/runtime/setup_visitor_visa.ts 4431 xr_studio_runtime_m3a
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/runtime/check_c611_team.ts 4431 xr_studio_runtime_m3a
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cannotAssign, cannotBeOfficer, cannotRepresent, imm5476, openingTeam, representativeAnswers, representativeContact, representativeFacts, representativeLicence, licensingBodyKey, USES_REPRESENTATIVE, type Firm, type Member } from "../../engine/runtime/team.ts";
import { RUNTIME_ACTORS } from "../../api/src/core.ts";
import { FORMAT_CHECKS } from "../../engine/field-format.ts";
import { client, recorder } from "./api.ts";

const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_runtime_m3a";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const REP = "user-R", OFFICER = "user-O", SOLO = "user-S", CLIENT = "user-P", AUTHOR = "user-A";
const run = Date.now().toString(36);
const FIRMS = (JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "samples", "firms.json"), "utf8")) as { firms: Firm[] }).firms;
const firm = FIRMS.find((f) => f.key === "sample-firm")!, solo = FIRMS.find((f) => f.key === "sample-solo")!;

function pure() {
  // The seeded file and the simulated people agree (same ids and duties).
  const users = FIRMS.flatMap((f) => f.users);
  ok("C6.11: every firm user is a simulated case person with the same duties", users.every((u) => { const a = RUNTIME_ACTORS.find((x) => x.id === u.id); return !!a && JSON.stringify([...a.duties].sort()) === JSON.stringify([...u.duties].sort()); }));
  ok("C6.11 fail: a client login is in no firm", !users.some((u) => u.id === CLIENT || u.id === "user-Q"));
  // A Sample firm (representative with licence body and number, a case officer) and a Sample solo firm (one person, three duties).
  ok("C6.11: the Sample firm has a licensed representative and a case officer", !cannotRepresent(firm, REP) && !!firm.users.find((u) => u.id === REP)?.licence?.body && !cannotBeOfficer(firm, OFFICER));
  ok("C6.11: the solo firm's one person holds representative, case officer and firm admin", solo.users.length === 1 && ["represent", "case", "firm_admin"].every((d) => solo.users[0].duties.includes(d as never)));
  // Representative of record: licensed users only.
  ok("C6.11 fail: a case officer without a licence cannot be the representative of record", /not a licensed representative/.test(cannotRepresent(firm, OFFICER) ?? ""));
  ok("C6.11 fail: another firm's person cannot be on this firm's case", cannotRepresent(firm, SOLO) === "That person is not in your firm." && cannotBeOfficer(firm, SOLO) === "That person is not in your firm.");
  // Opening team: defaults and choices.
  const t = openingTeam(firm, {});
  ok("C6.11: a case opens with the firm's representative and its case officer by default", !("field" in t) && t.representative === REP && JSON.stringify(t.officers) === JSON.stringify([OFFICER]), JSON.stringify(t));
  const s = openingTeam(solo, {});
  ok("C6.11: in a solo firm the same person is representative and case officer", !("field" in s) && s.representative === SOLO && JSON.stringify(s.officers) === JSON.stringify([SOLO]));
  const two: Firm = { ...firm, defaultRepresentative: undefined };
  const amb = openingTeam(two, {});
  ok("C6.11 fail: a firm with two representatives must choose one", "field" in amb && amb.field === "representative");
  const chosen = openingTeam(two, { representative: "user-T" });
  ok("C6.11: a chosen representative is kept", !("field" in chosen) && chosen.representative === "user-T");
  const badOff = openingTeam(firm, { caseOfficers: [CLIENT] });
  ok("C6.11 fail: a case officer must be firm staff who works on cases", "field" in badOff && badOff.field === "caseOfficers");
  // Who assigns: the firm admin only.
  ok("C6.11: the firm admin may assign the case team", cannotAssign(firm, REP) === null && cannotAssign(solo, SOLO) === null);
  ok("C6.11 fail: a case officer may not assign the case team", /Only the firm admin/.test(cannotAssign(firm, OFFICER) ?? ""));
  // IMM 5476 from the representative of record, and its change event.
  const at = (m: number) => new Date(Date.UTC(2026, 10, 1, 10, m));
  const one: Member[] = [{ userId: REP, role: "LEAD_REPRESENTATIVE", assignedBy: REP, assignedAt: at(0), endedAt: null, endedBy: null, endReason: null }];
  const f = representativeFacts(firm, one);
  ok("C6.11: IMM 5476's representative part fills from the representative of record (licence number and category)", f?.["representative.membership_id"] === "R000000" && f?.["representative.representative_category"] === "rcic");
  ok("C6.11 fail: no representative of record, nothing to fill", representativeFacts(firm, []) === null);
  // C7.7 (G25): IMM 5476's representative block (name, e-mail, office address and phone) from the firm record.
  const rc = representativeContact(firm, one), ra = representativeAnswers(firm, one);
  ok("C7.7 pass: the representative's name, e-mail, office address and phone come from the firm record, as confirmed answers about the representative", rc?.["person.family_name"] === "Representative" && typeof rc?.["person.email_address"] === "string" && rc?.["person.mailing_address_city"] === "Toronto" && (rc?.["person.telephone_number"] as { country_code?: string })?.country_code === "1" && ra.length === Object.keys(rc ?? {}).length + Object.keys(representativeLicence(firm, one) ?? {}).length && ra.every((a) => a.subjectId === "representative" && a.status === "VERIFIED" && a.channel === "firm_record" && a.actor === REP));
  const bare: Firm = { ...firm, office: { ...firm.office, unit: null }, users: firm.users.map((u) => ({ ...u, email: undefined })) };
  ok("C7.7 fail: no representative of record gives no answers; a value the firm record lacks is left out (asked as before), never blank", representativeAnswers(firm, []).length === 0 && representativeContact(firm, []) === null && !("person.email_address" in (representativeContact(bare, one) ?? {})) && !("person.mailing_address_unit" in (representativeContact(bare, one) ?? {})));
  // C6.11 (VV-R10, QA-152): IMM 5476's licence part and firm name from the representative of record, never typed per case.
  const lic = representativeLicence(firm, one);
  ok("C6.11 pass: IMM 5476's licence part (membership ID, category, licensing body as the library's key) and the firm's name come from the representative of record", lic?.["representative.membership_id"] === "R000000" && lic?.["representative.representative_category"] === "rcic" && lic?.["representative.licensing_body"] === "cicc" && lic?.["representative.organization_name"] === firm.name, lic);
  ok("C6.11 pass (break m6): a licence body gives the library's option key (CICC, a law society, the Chambre des notaires)", licensingBodyKey("CICC") === "cicc" && licensingBodyKey("Law Society of Ontario") === "law_society" && licensingBodyKey("Barreau du Québec") === "law_society" && licensingBodyKey("Chambre des notaires du Québec") === "chambre_notaires_quebec");
  ok("C6.11 fail (break m6): a body the library does not know gives no key, so the question stays asked", licensingBodyKey("Sample board") === null && !("representative.licensing_body" in (representativeLicence({ ...firm, users: firm.users.map((u) => (u.id === REP ? { ...u, licence: { ...u.licence!, body: "Sample board" } } : u)) }, one) ?? {})));
  const unlic: Firm = { ...firm, users: firm.users.map((u) => (u.id === REP ? { ...u, licence: null } : u)) };
  ok("C6.11 fail: no representative of record gives no licence part; a value the record lacks is left out (asked as before), never blank", representativeLicence(firm, []) === null && !("representative.membership_id" in (representativeLicence(unlic, one) ?? {})) && representativeLicence(unlic, one)?.["representative.organization_name"] === firm.name);
  const withCase = representativeAnswers(firm, one, "case-subject");
  ok("C6.11 pass: a case with a representative of record answers \"Uses a representative\" Yes for the application, from the firm record", withCase.some((x) => x.subjectId === "case-subject" && x.field === USES_REPRESENTATIVE && x.value === true && x.channel === "firm_record" && x.actor === REP));
  ok("C6.11 fail: without a representative of record nothing answers \"Uses a representative\"; without the case's subject it is not given", !representativeAnswers(firm, [], "case-subject").some((x) => x.field === USES_REPRESENTATIVE) && !ra.some((x) => x.field === USES_REPRESENTATIVE));
  // The firm record's e-mail passes IRCC's own e-mail check (engine/field-format.ts: 2 to 6 letters after the last dot),
  // so IMM 5476's representative section never shows "to fix" for a value nobody on the case can change.
  const email = (v: string) => FORMAT_CHECKS.email.test(v, {}, {}) === null;
  ok("C6.11 pass: every firm user's e-mail passes IRCC's e-mail check", FIRMS.every((x) => x.users.every((u) => !u.email || email(u.email))), FIRMS.flatMap((x) => x.users.map((u) => u.email)));
  ok("C6.11 fail: the old Sample address (7 letters after the last dot) does not", !email("representative@sample-firm.example"));
  const rcKeys = representativeContact(firm, one) ?? {};
  ok("C6.11 pass (ruling on #1072): the firm record's office and e-mail stay under the library's mailing keys (person.mailing_address_*, person.email_address, person.telephone_number)", rcKeys["person.mailing_address_city"] === "Toronto" && typeof rcKeys["person.email_address"] === "string" && !!rcKeys["person.telephone_number"], Object.keys(rcKeys));
  ok("C6.11 fail (ruling on #1072): never under the keys IMM 5475's designated individual reads on the checkpoint (person.address_*, person.email, person.phone_*)", !Object.keys(rcKeys).some((k) => /^person\.(address_|phone_|email$)/.test(k)), Object.keys(rcKeys));
  ok("C6.11 fail: the first representative asks for no new IMM 5476", imm5476(one).new_needed === false);
  const two5476: Member[] = [{ ...one[0], endedAt: at(5), endedBy: REP, endReason: "Sample reason" }, { userId: "user-T", role: "LEAD_REPRESENTATIVE", assignedBy: REP, assignedAt: at(5), endedAt: null, endedBy: null, endReason: null }];
  const ch = imm5476(two5476);
  ok("C6.11: a new representative of record asks for a new IMM 5476", ch.new_needed && ch.earlier === REP && ch.since?.getTime() === at(5).getTime());
}

async function api() {
  const vv = sql("select id from combination where combination_key='vv.single'");
  if (!vv) { console.log("Run setup_visitor_visa.ts first."); process.exitCode = 2; return; }
  const open = (ref: string, actor: string, extra: Record<string, unknown> = {}) => call("POST", "/runtime/cases", { combinationId: vv, reference: ref, clientActor: CLIENT, principal: { displayName: "Client A" }, ...extra }, actor);

  // Firm and users.
  const fr = await call("GET", "/runtime/firm", undefined, OFFICER);
  ok("C6.11: staff read their firm and its users, with the Stand-in words", fr.status === 200 && fr.body.key === "sample-firm" && fr.body.users.length === 3 && fr.body.stand_in?.id === "SI-9", fr.status);
  const fc = await call("GET", "/runtime/firm", undefined, CLIENT), fa = await call("GET", "/runtime/firm", undefined, AUTHOR), fn = await call("GET", "/runtime/firm", undefined, null);
  ok("C6.11 fail: a client and a configuration person read no firm (403); nobody 401", fc.status === 403 && fa.status === 403 && fn.status === 401, `${fc.status} ${fa.status} ${fn.status}`);

  // Opening a case on the released Visitor visa with its team.
  const a = await open(`C611-A-${run}`, OFFICER);
  ok("C6.11: a case officer opens a Visitor visa case; the team is the representative of record and the case officer", a.status === 201 && a.body.team?.representative?.id === REP && a.body.team?.officers?.map((o: { id: string }) => o.id).join() === OFFICER && a.body.team?.stand_in?.id === "SI-9", JSON.stringify(a.body.team ?? a.body).slice(0, 300));
  const id = a.body.id as string;
  ok("C6.11: the database holds one current representative and one case officer for the case", sql(`select string_agg(role||':'||user_id, ',' order by role) from case_team_member where case_id='${id}' and ended_at is null`) === `LEAD_REPRESENTATIVE:${REP},OFFICER:${OFFICER}`);
  const bad = await open(`C611-B-${run}`, OFFICER, { representative: OFFICER });
  ok("C6.11 fail: opening with an unlicensed representative is refused on the field (400), nothing created", bad.status === 400 && bad.body.errors?.[0]?.field === "representative" && sql(`select count(*) from runtime_case where reference='C611-B-${run}'`) === "0", bad.status);
  const other = await open(`C611-C-${run}`, OFFICER, { caseOfficers: [SOLO] });
  ok("C6.11 fail: another firm's person cannot be a case officer here (400)", other.status === 400 && other.body.errors?.[0]?.field === "caseOfficers", other.status);
  const s = await open(`C611-S-${run}`, SOLO);
  ok("C6.11: a solo firm opens a case with one person as representative and case officer", s.status === 201 && s.body.team?.representative?.id === SOLO && s.body.team?.officers?.[0]?.id === SOLO && s.body.team?.firm?.solo === true, s.status);
  const sid = s.body.id as string;

  // Firm isolation.
  const cross = await call("GET", `/runtime/cases/${id}`, undefined, SOLO), crossBack = await call("GET", `/runtime/cases/${sid}`, undefined, OFFICER);
  ok("C6.11 fail: staff of one firm reach none of another firm's cases (404 both ways)", cross.status === 404 && crossBack.status === 404, `${cross.status} ${crossBack.status}`);
  const own = await call("GET", `/runtime/cases/${id}`, undefined, REP);
  ok("C6.11: every staff member of the firm reaches its case", own.status === 200);
  const listO = (await call("GET", "/runtime/cases", undefined, OFFICER)).body.cases as { id: string }[], listS = (await call("GET", "/runtime/cases", undefined, SOLO)).body.cases as { id: string }[];
  ok("C6.11: each firm's case list holds its own cases only", listO.some((c) => c.id === id) && !listO.some((c) => c.id === sid) && listS.some((c) => c.id === sid) && !listS.some((c) => c.id === id));
  const cl = await call("GET", `/runtime/cases/${id}`, undefined, CLIENT);
  ok("C6.11 fail: the client's case read carries no team (client screens after M3)", cl.status === 200 && cl.body.team === undefined, cl.status);

  // C6.11: "Uses a representative" is the case team's, never typed (422, nothing stored).
  const caseSubj = (a.body.people ?? []).find((p: { role: string }) => p.role === "case")?.subject_id;
  const typed = await call("PUT", `/runtime/cases/${id}/answers/${caseSubj}/case.uses_representative`, { value: false, expectedId: null }, OFFICER);
  ok("C6.11 fail: \"Uses a representative\" cannot be typed on a case with a representative of record (422), nothing stored", !!caseSubj && typed.status === 422 && /case team/.test(typed.body?.detail ?? "") && sql(`select count(*) from client_canonical_answer where subject_id='${caseSubj}' and canonical_field_key='case.uses_representative'`) === "0", typed.status);
  // Reassign: firm admin only, licensed only, a reason, history kept, IMM 5476 change event.
  const t0 = await call("GET", `/runtime/cases/${id}/team`, undefined, OFFICER);
  ok("C6.11: the team read gives IMM 5476's representative part from the representative of record", t0.status === 200 && t0.body.imm5476?.facts?.["representative.membership_id"] === "R000000" && t0.body.imm5476.new_needed === false && t0.body.may_assign === false, t0.status);
  const byOfficer = await call("PUT", `/runtime/cases/${id}/team/representative`, { userId: REP, reason: "Sample reason" }, OFFICER);
  ok("C6.11 fail: a case officer cannot change the representative (403)", byOfficer.status === 403, byOfficer.status);
  const same = await call("PUT", `/runtime/cases/${id}/team/representative`, { userId: REP, reason: "Sample reason" }, REP);
  ok("C6.11 fail: naming the current representative again changes nothing (409)", same.status === 409 && sql(`select count(*) from case_team_member where case_id='${id}' and role='LEAD_REPRESENTATIVE'`) === "1", same.status);
  const noReason = await call("PUT", `/runtime/cases/${id}/team/representative`, { userId: REP }, REP);
  ok("C6.11 fail: a change without a reason is refused (400)", noReason.status === 400, noReason.status);
  const unlicensed = await call("PUT", `/runtime/cases/${id}/team/representative`, { userId: OFFICER, reason: "Sample reason" }, REP);
  ok("C6.11 fail: an unlicensed person cannot become the representative of record (422)", unlicensed.status === 422 && unlicensed.body.errors?.[0]?.field === "userId", unlicensed.status);
  const soloSame = await call("PUT", `/runtime/cases/${sid}/team/representative`, { userId: REP, reason: "Sample reason" }, SOLO);
  ok("C6.11 fail: the solo firm cannot name another firm's representative (422)", soloSame.status === 422, soloSame.status);

  const moved = await call("PUT", `/runtime/cases/${id}/team/representative`, { userId: "user-T", reason: "Sample: the first representative is away" }, REP);
  const mh = (moved.body.history ?? []) as { user_id: string; role: string; ended_at: string | null; reason: string | null }[];
  ok("C6.11: the firm admin changes the representative of record; the earlier one stays in the history with the reason", moved.status === 200 && moved.body.representative?.id === "user-T" && mh.some((h) => h.user_id === REP && h.role === "LEAD_REPRESENTATIVE" && h.ended_at && h.reason === "Sample: the first representative is away"), moved.status);
  ok("C6.11: the change asks for a new IMM 5476, filled from the new representative", moved.body.imm5476?.new_needed === true && moved.body.imm5476.earlier === REP && moved.body.imm5476.facts?.["representative.membership_id"] === "R000002");
  const head = await call("GET", `/runtime/cases/${id}`, undefined, OFFICER);
  ok("C6.11: the case header's team follows the change", head.body.team?.representative?.id === "user-T");
  // The database keeps the rules even if the service is bypassed.
  let twoReps = "";
  try { sql(`insert into case_team_member (id, workspace_id, case_id, user_id, role, assigned_by) select gen_random_uuid(), workspace_id, id, 'user-X', 'LEAD_REPRESENTATIVE', 'test' from runtime_case where id='${id}'`); twoReps = "inserted"; } catch (e) { twoReps = String((e as Error).message); }
  ok("C6.11 fail: the database refuses a second current representative of record on a case", /case_team_member_one_representative/.test(twoReps), twoReps.slice(0, 160));
  let noWhy = "";
  try { sql(`update case_team_member set ended_at=now(), ended_by='test' where case_id='${id}' and role='OFFICER'`); noWhy = "updated"; } catch (e) { noWhy = String((e as Error).message); }
  ok("C6.11 fail: the database refuses ending an assignment without a reason", /case_team_member_ended_check/.test(noWhy), noWhy.slice(0, 160));

  // Case officers: add and take off with history.
  const addRep = await call("POST", `/runtime/cases/${id}/team/officers`, { userId: REP }, REP);
  ok("C6.11: the firm admin assigns a second case officer", addRep.status === 201 && addRep.body.officers.length === 2, addRep.status);
  const again = await call("POST", `/runtime/cases/${id}/team/officers`, { userId: REP }, REP);
  ok("C6.11 fail: the same person twice as case officer is refused (409)", again.status === 409, again.status);
  const offAdd = await call("POST", `/runtime/cases/${id}/team/officers`, { userId: OFFICER }, OFFICER);
  ok("C6.11 fail: a case officer cannot assign (403)", offAdd.status === 403, offAdd.status);
  const end = await call("POST", `/runtime/cases/${id}/team/officers/${OFFICER}/end`, { reason: "Sample: moved to another case" }, REP);
  const hist = (end.body.history ?? []) as { user_id: string; role: string; ended_at: string | null; reason: string | null; ended_by: string | null }[];
  ok("C6.11: taking a case officer off keeps the history (who, when, why)", end.status === 201 && end.body.officers.map((o: { id: string }) => o.id).join() === REP && hist.some((h) => h.user_id === OFFICER && h.ended_at && h.ended_by === "Representative (Sample)" && h.reason === "Sample: moved to another case"), end.status);
  const endAgain = await call("POST", `/runtime/cases/${id}/team/officers/${OFFICER}/end`, { reason: "Sample: again" }, REP);
  ok("C6.11 fail: taking off someone who is not on the case is refused (404)", endAgain.status === 404, endAgain.status);
  const back = await call("POST", `/runtime/cases/${id}/team/officers`, { userId: OFFICER }, REP);
  ok("C6.11: reassigning the case officer adds a new row; the earlier one stays in the history", back.status === 201 && sql(`select count(*) from case_team_member where case_id='${id}' and user_id='${OFFICER}' and role='OFFICER'`) === "2");
  const notAdminEnd = await call("POST", `/runtime/cases/${id}/team/officers/${REP}/end`, { reason: "Sample: not the admin" }, "user-T");
  ok("C6.11 fail: a representative who is not firm admin cannot take a case officer off (403)", notAdminEnd.status === 403, notAdminEnd.status);
  const blank = await call("POST", `/runtime/cases/${id}/team/officers/${REP}/end`, { reason: "\u0301\u0301\u0301\u0301\u0301\u0301" }, REP);
  ok("C6.11 fail: a reason of marks only is refused (400), nothing ended", blank.status === 400 && sql(`select count(*) from case_team_member where case_id='${id}' and user_id='${REP}' and role='OFFICER' and ended_at is null`) === "1", blank.status);
  const stale = await call("PUT", `/runtime/cases/${id}/team/representative`, { userId: REP, reason: "Sample: from a stale tab", expectedRepresentative: REP }, REP);
  ok("C6.11 fail: a change from a stale view (it expected another representative) is refused (409)", stale.status === 409 && (await call("GET", `/runtime/cases/${id}/team`, undefined, REP)).body.representative?.id === "user-T", stale.status);
  const fresh = await call("PUT", `/runtime/cases/${id}/team/representative`, { userId: REP, reason: "Sample: back from leave", expectedRepresentative: "user-T" }, REP);
  ok("C6.11: a change from the current view goes through", fresh.status === 200 && fresh.body.representative?.id === REP, fresh.status);

  // Firm isolation beyond the case: activity, references, idempotency keys (review Major 1, break M1–M3).
  const actS = (await call("GET", "/activity", undefined, SOLO)).body as { summary: string; entity: string; entityKey: string | null }[];
  const actR = (await call("GET", "/activity", undefined, REP)).body as { summary: string; entity: string; entityKey: string | null }[];
  ok("C6.11 fail: another firm's case lines are not in a firm's activity", !actS.some((e) => e.summary.includes(id.slice(0, 8))), actS.filter((e) => e.summary.includes(id.slice(0, 8))).length);
  ok("C6.11: a firm's own case lines are in its activity, with names, not ids", actS.some((e) => e.summary.includes(sid.slice(0, 8))) && actR.some((e) => e.summary.includes(id.slice(0, 8)) && /Second representative \(Sample\)/.test(e.summary)) && !actR.some((e) => /\buser-[A-Z]\b/.test(e.summary) && e.summary.includes(id.slice(0, 8))));
  const reuse = await open(`C611-A-${run}`, SOLO);
  ok("C6.11: another firm may use the same case reference", reuse.status === 201, reuse.status);
  const dupe = await open(`C611-A-${run}`, OFFICER);
  ok("C6.11 fail: the same reference twice in one firm is refused (409)", dupe.status === 409, dupe.status);
  const key = `c611-shared-${run}`;
  const k1 = await open(`C611-K1-${run}`, OFFICER, { idempotencyKey: key }), k2 = await open(`C611-K2-${run}`, SOLO, { idempotencyKey: key });
  ok("C6.11: an idempotency key is the firm's own (another firm's same key opens its own case)", k1.status === 201 && k2.status === 201 && k1.body.id !== k2.body.id, `${k1.status} ${k2.status}`);
  const k3 = await open(`C611-K1-${run}`, OFFICER, { idempotencyKey: key });
  ok("C6.11 fail: the same key again in the same firm answers with that firm's case, nothing new", k3.status === 201 && k3.body.id === k1.body.id && k3.body.created === false, k3.status);
  const audit = sql(`select string_agg(action, ',' order by at) from audit_event where entity='case' and entity_key='${id}'`);
  ok("C6.11: each assignment is in the audit trail", /opened.*officer_assigned.*officer_ended.*officer_assigned/.test(audit), audit);
  ok("C6.11 fail: audit lines carry no typed values (the reason stays in the history only)", !sql(`select coalesce(string_agg(summary, ' '), '') from audit_event where entity='case' and entity_key='${id}'`).includes("moved to another case"));
}

async function main() {
  pure();
  await api();
  summary();
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
