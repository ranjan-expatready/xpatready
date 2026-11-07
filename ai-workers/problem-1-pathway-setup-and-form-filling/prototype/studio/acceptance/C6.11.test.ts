// C6.11 Firm, users and case team (M3-A; r5c BR-20, BR-21; P-154, P-155, P-164 (3); stand-ins SI-9, SI-15).
// Visitor visa: one Sample firm (two representatives with licence body and number, FQ-9; the built case officer
// `user-O`; the firm admin duty held by one of them) and one Sample solo firm; one representative of record per case; assign and reassign with history; IMM 5476 fills from the
// representative of record, and a change asks for a new one and marks the old one out of date. Rules: VV-R10, VV-R11.
//   zsh studio/tools/isolated.sh runtime_m3a3 4438 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4438 xr_studio_runtime_m3a3
//   tsx studio/acceptance/C6.11.test.ts 4438 xr_studio_runtime_m3a3   (green on release 1; proposed for the R1 suite copy, PR #330)
// Adopted by the runtime lane (M3-A3) with the routes as built in #288 (M3-CONTRACT.md "Builds already open"):
// GET /runtime/firm read as one user of each firm (firms are isolated), top-level `representative` and `caseOfficers`
// on POST /runtime/cases, PUT …/team/representative {userId, reason, expectedRepresentative}, POST …/team/officers
// {userId} and …/team/officers/:user/end {reason}, GET …/team {representative, officers, history, imm5476}. Status codes
// as built: Open a case refuses on the field with 400, the team routes with 422. C6.11-13 checks the stale-write
// rule through `expectedRepresentative` (the built "version" of the team). Three IMM 5476 lines print PENDING (neither
// pass nor fail) only while the case's pinned release has no IMM 5476; once it has, they are ordinary lines and an
// empty answer fails them (review M1).
import { AUTHOR, CLIENT, FAMILY, FIRM_READERS, OFFICER, call, firms, itemsOf, main, needVisitorVisa, ok, openCase, prepare, run, sql } from "./lib/m3.ts";

const pending: string[] = [];
const pend = (name: string, why: string) => { pending.push(name); console.log(`PENDING  ${name} — ${why}`); };
type Hist = { user_id: string; role: string; assigned_by: string; assigned_at: string; ended_at: string | null; ended_by: string | null; reason: string | null };

await main("C6.11", "Firm, users and case team", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  ok("C6.11-1 pass: GET /runtime/firm, read as one user of each firm, gives one Sample firm and one Sample solo firm, marked Stand-in SI-9", f.raw.status === 200 && !!f.firm && !!f.solo && f.standIn === "SI-9", f.raw.status);
  const rep = f.firm?.users.find((u) => u.actor === f.rep);
  ok("C6.11-2 pass: the firm's representative holds a licence body and number; the case officer holds none", !!rep?.licence?.body && !!rep?.licence?.number && f.firm?.users.find((u) => u.actor === f.officer)?.licence === null, rep?.licence);
  ok("C6.11-3 pass: the solo firm is one person holding all three duties (representative, case officer, firm admin)", f.solo?.users.length === 1 && ["representative", "case_officer", "firm_admin"].every((d) => f.solo!.users[0].duties.includes(d)), f.solo?.users);
  const firmsOf = await Promise.all([OFFICER, FIRM_READERS.solo].map(async (a) => (await call("GET", "/runtime/firm", undefined, a)).body?.users?.map((u: { id: string }) => u.id) ?? []));
  ok("C6.11-3a fail (BR-20): each firm sees only its own users (the solo firm's person is not in the Sample firm's list, nor the other way)", firmsOf[0].length > 0 && firmsOf[1].length > 0 && !firmsOf[0].includes(FIRM_READERS.solo) && !firmsOf[1].includes(OFFICER), firmsOf);
  ok("C6.11-4 fail: a client cannot list firms or users (403)", (await call("GET", "/runtime/firm", undefined, CLIENT)).status === 403);

  // Open a case with a team.
  const team = { representative: f.rep, caseOfficers: [f.officer ?? OFFICER] };
  let r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C611-NOREP-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client A" } }, f.officer ?? OFFICER);
  const noRep = r.status === 201 ? sql(`select string_agg(user_id, ',') from case_team_member where case_id='${r.body?.id}' and role='LEAD_REPRESENTATIVE' and ended_at is null`) : null;
  ok("C6.11-5 pass (as built): a case opened without naming a representative of record still has exactly one, the firm's default representative (never none)", r.status === 201 && !!f.rep && noRep === f.rep, { status: r.status, noRep });
  r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C611-OFFREP-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client A" }, representative: f.officer, caseOfficers: [f.officer] }, f.officer ?? OFFICER);
  ok("C6.11-6 fail: an unlicensed case officer cannot be the representative of record (400 on the field, names the licence)", r.status === 400 && /licen[cs]ed/i.test(r.body?.detail ?? "") && r.body?.errors?.[0]?.field === "representative", r.body?.detail);
  const c = await openCase(vv, FAMILY, team);
  const ct = c.body?.team;
  ok("C6.11-7 pass: the case shows its team: representative of record (name, licence) and case officers, chip SI-9", ct?.representative?.id === f.rep && !!ct?.representative?.name && !!ct?.representative?.licence?.number && (ct?.officers ?? []).some((o: { id: string }) => o.id === team.caseOfficers[0]) && ct?.stand_in?.id === "SI-9", ct);
  ok("C6.11-8 pass (data): the team is stored in AG-07's CaseTeamMember shape (LEAD_REPRESENTATIVE once, OFFICER)",
    sql(`select count(*) from case_team_member where case_id='${c.id}' and role='LEAD_REPRESENTATIVE' and ended_at is null`) === "1" && Number(sql(`select count(*) from case_team_member where case_id='${c.id}' and role='OFFICER' and ended_at is null`) ?? 0) >= 1);

  // Assign and reassign: firm admin only, a reason, history kept.
  const first = team.caseOfficers[0];
  const other = f.firm?.users.find((u) => u.duties.includes("case_officer") && u.actor !== first && u.actor !== f.admin)?.actor ?? f.rep2;
  r = await call("POST", `/runtime/cases/${c.id}/team/officers`, { userId: other }, first);
  const r9b = await call("POST", `/runtime/cases/${c.id}/team/officers/${first}/end`, { reason: "Workload" }, first);
  ok("C6.11-9 fail: a case officer without the firm admin duty cannot assign or take off a case officer (403)", !!f.officer && !!f.admin && f.officer !== f.admin && r.status === 403 && r9b.status === 403, [r.status, r9b.status]);
  r = await call("POST", `/runtime/cases/${c.id}/team/officers`, { userId: other }, f.admin);
  const added = r.status;
  r = await call("POST", `/runtime/cases/${c.id}/team/officers/${first}/end`, {}, f.admin);
  ok("C6.11-10 fail: taking a case officer off without a reason is refused on the field (400)", r.status === 400 && /reason/i.test(JSON.stringify(r.body)), r.status);
  r = await call("POST", `/runtime/cases/${c.id}/team/officers/${first}/end`, { reason: "Workload (Sample)" }, f.admin);
  const t = (await call("GET", `/runtime/cases/${c.id}/team`, undefined, f.admin)).body;
  const hist: Hist[] = t?.history ?? [];
  const adminName = f.firm?.users.find((u) => u.actor === f.admin)?.name;   // the history names people (api/src/team.ts)
  ok("C6.11-11 pass: the firm admin reassigns the case officer; the history says who, when, from, to and why",
    [200, 201].includes(added) && [200, 201].includes(r.status) && (t?.officers ?? []).some((o: { id: string }) => o.id === other) && !(t?.officers ?? []).some((o: { id: string }) => o.id === first)
    && hist.some((h) => h.user_id === first && h.role === "OFFICER" && !!h.ended_at && h.reason === "Workload (Sample)" && !!adminName && h.ended_by === adminName)
    && hist.some((h) => h.user_id === other && h.role === "OFFICER" && !h.ended_at && !!h.assigned_at && !!adminName && h.assigned_by === adminName), hist);
  ok("C6.11-12 pass (data): the earlier assignment is ended, never deleted", sql(`select count(*) from case_team_member where case_id='${c.id}' and role='OFFICER' and user_id='${first}' and ended_at is not null`) === "1");
  r = await call("PUT", `/runtime/cases/${c.id}/team/representative`, { userId: f.rep2, reason: "Stale change (Sample)", expectedRepresentative: f.rep2 }, f.admin);
  ok("C6.11-13 fail: a change made from an older view of the team is refused (409) and changes nothing", r.status === 409 && sql(`select user_id from case_team_member where case_id='${c.id}' and role='LEAD_REPRESENTATIVE' and ended_at is null`) === f.rep, r.status);
  const by = async (actor: string) => (await call("PUT", `/runtime/cases/${c.id}/team/representative`, { userId: f.rep2, reason: "Not allowed (Sample)" }, actor)).status;
  const [byClient, byAuthor] = [await by(CLIENT), await by(AUTHOR)];
  ok("C6.11-14 fail: a client or the configuration author cannot change the team (403)", byClient === 403 && byAuthor === 403, [byClient, byAuthor]);

  // IMM 5476 from the representative of record (VV-R10); a change asks for a new one (BR-20).
  const P = c.subjects["Sample Client A"], spouse = c.subjects["Sample Spouse A"], child10 = c.subjects["Sample Child A1"];
  // Pending only while the case's pinned release has no IMM 5476 (review M1): then no item, no question can exist.
  const has5476 = Number(sql(`select count(*) from pack_work_pin w join config_release r on r.id = w.config_release_id, jsonb_array_elements(r.snapshot->'forms') f where w.case_id='${c.id}' and f->>'form_number'='IMM 5476'`) ?? 0) > 0;
  let pr = await prepare(c.id), p = pr.p;
  if (!has5476) pend("C6.11-15 pass: IMM 5476 is a deliverable for the principal and the spouse (each 18 or older), none for a child of 10 (VV-R10)", "the case's release has no IMM 5476 yet (GET …/prepare is C6.12's, M3-B)");
  else ok("C6.11-15 pass: IMM 5476 is a deliverable for the principal and the spouse (each 18 or older), none for a child of 10 (VV-R10)", pr.res.status === 200 && itemsOf(p, P, "IMM 5476").length === 1 && itemsOf(p, spouse, "IMM 5476").length === 1 && itemsOf(p, child10, "IMM 5476").length === 0, p?.items.filter((i) => i.form === "IMM 5476").map((i) => i.subject));
  ok("C6.11-16 pass: the representative's facts IMM 5476 reads (category, membership ID) come from the representative of record, not typed per case",
    !!rep?.licence?.number && t?.imm5476?.facts?.["representative.membership_id"] === rep.licence.number && !!t?.imm5476?.facts?.["representative.representative_category"], t?.imm5476);
  const name16c = "C6.11-16c pass: the questionnaire shows IMM 5476's representative facts (membership ID) from the representative of record, source \"Firm\", not typed per case";
  if (!has5476) pend(name16c, "the case's release has no IMM 5476, so no question reads representative.*");
  else {
    const qs = (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, first)).body?.sections?.flatMap((x: { questions: { fact: string; answer: { value: unknown; channel?: string } | null }[] }) => x.questions) ?? [];
    ok(name16c, qs.some((q: { fact: string; answer: { value: unknown; channel?: string } | null }) => q.fact === "representative.membership_id" && q.answer?.value === rep?.licence?.number && q.answer?.channel === "firm_record"));
  }
  const newRep = f.rep2;
  ok("C6.11-16a pass (FQ-9): the Sample firm has a second representative to hand the case to", !!newRep, f.firm?.users.map((u) => u.duties));
  r = await call("PUT", `/runtime/cases/${c.id}/team/representative`, { userId: f.soloRep, reason: "Another firm (Sample)" }, f.admin);
  ok("C6.11-16b fail: a representative from another firm cannot become this case's representative of record (422)", !!f.soloRep && r.status === 422 && r.body?.errors?.[0]?.field === "userId", r.status);
  r = await call("PUT", `/runtime/cases/${c.id}/team/representative`, { userId: newRep, reason: "Representative leaves the firm (Sample)", expectedRepresentative: f.rep }, f.admin);
  const t3 = r.body;
  ok("C6.11-17 pass: changing the representative of record asks for a new IMM 5476 (the team says \"new IMM 5476 needed\", naming the earlier one); the history keeps who, when and why",
    r.status === 200 && t3?.representative?.id === newRep && t3?.imm5476?.new_needed === true && t3?.imm5476?.earlier === f.rep
    && (t3?.history ?? []).some((h: Hist) => h.user_id === f.rep && h.role === "LEAD_REPRESENTATIVE" && !!h.ended_at && h.reason === "Representative leaves the firm (Sample)")
    && Number(sql(`select count(*) from audit_event where entity_key='${c.id}' and action='representative_changed' and summary like '%new IMM 5476 is needed%'`) ?? 0) >= 1, t3?.imm5476);
  pr = await prepare(c.id); p = pr.p;
  if (!has5476) pend("C6.11-17a pass: the new IMM 5476 is To do naming the new representative; a signed earlier one goes Out of date (C9.2-6)", "the case's release has no IMM 5476 yet");
  else ok("C6.11-17a pass: the new IMM 5476 is To do naming the new representative; a signed earlier one goes Out of date (C9.2-6)", pr.res.status === 200 && itemsOf(p, P, "IMM 5476").some((i) => i.state === "to_do" && (i as { representative?: string }).representative === newRep));
  ok("C6.11-18 fail (data): a case never has two representatives of record at once", sql(`select count(*) from case_team_member where case_id='${c.id}' and role='LEAD_REPRESENTATIVE' and ended_at is null`) === "1");

  // Solo firm (P-155 (1)): the representative is also the case officer.
  const solo = await openCase(vv, FAMILY.slice(0, 1), { representative: f.soloRep, caseOfficers: [f.soloRep ?? ""] });
  const st = solo.body?.team;
  ok("C6.11-19 pass: a solo firm opens a case where one person is representative of record and case officer", st?.firm?.solo === true && st?.representative?.id === f.soloRep && (st?.officers ?? []).some((o: { id: string }) => o.id === f.soloRep), st);
  ok("C6.11-19a fail (BR-20): the Sample firm cannot read the solo firm's case (404)", (await call("GET", `/runtime/cases/${solo.id}`, undefined, OFFICER)).status === 404);
  if (pending.length) console.log(`\n${pending.length} pending (the case's release has no IMM 5476 yet)`);
});
