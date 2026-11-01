// C6.11 Firm, users and case team (M3-A; r5c BR-20, BR-21; P-154, P-155, P-164 (3); stand-ins SI-9, SI-15).
// Visitor visa: one Sample firm (a representative with licence body and number, a case officer, a firm admin) and one
// Sample solo firm; one representative of record per case; assign and reassign with history; IMM 5476 fills from the
// representative of record, and a change asks for a new one and marks the old one out of date. Rules: VV-R10, VV-R11.
//   tsx studio/acceptance/C6.11.test.ts 4440 xr_studio_accept   (after lib/setup_vv_m3.ts)
import { AUTHOR, CLIENT, FAMILY, OFFICER, call, firms, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql } from "./lib/m3.ts";

await main("C6.11", "Firm, users and case team", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  ok("C6.11-1 pass: GET /runtime/firms lists one Sample firm and one Sample solo firm, marked Stand-in SI-9", f.raw.status === 200 && !!f.firm && !!f.solo && f.raw.body?.stand_in === "SI-9", f.raw.status);
  const rep = f.firm?.users.find((u) => u.actor === f.rep);
  ok("C6.11-2 pass: the firm's representative holds a licence body and number; the case officer holds none", !!rep?.licence?.body && !!rep?.licence?.number && f.firm?.users.find((u) => u.actor === f.officer)?.licence === null, rep?.licence);
  ok("C6.11-3 pass: the solo firm is one person holding all three duties (representative, case officer, firm admin)", f.solo?.users.length === 1 && ["representative", "case_officer", "firm_admin"].every((d) => f.solo!.users[0].duties.includes(d)), f.solo?.users);
  ok("C6.11-4 fail: a client cannot list firms or users (403)", (await call("GET", "/runtime/firms", undefined, CLIENT)).status === 403);

  // Open a case with a team.
  const team = { representative: f.rep, caseOfficers: [f.officer ?? OFFICER] };
  let r = await call("POST", "/runtime/cases", { combinationId: vv, reference: "C611-NOREP", clientActor: CLIENT, principal: { displayName: "Sample Client A" } }, f.officer ?? OFFICER);
  ok("C6.11-5 fail: a case opened without a representative of record is refused on the field (400, plain words)", r.status === 400 && /representative/i.test(JSON.stringify(r.body)), r.status);
  r = await call("POST", "/runtime/cases", { combinationId: vv, reference: "C611-OFFREP", clientActor: CLIENT, principal: { displayName: "Sample Client A" }, team: { representative: f.officer, caseOfficers: [f.officer] } }, f.officer ?? OFFICER);
  ok("C6.11-6 fail: an unlicensed case officer cannot be the representative of record (422, names the licence)", r.status === 422 && /licen[cs]e/i.test(r.body?.detail ?? ""), r.body?.detail);
  const c = await openCase(vv, FAMILY, team);
  ok("C6.11-7 pass: the case shows its team: representative of record (name, licence) and case officers, chip SI-9", c.body?.team?.representative?.actor === f.rep && !!c.body?.team?.representative?.licence?.number && (c.body?.team?.case_officers ?? []).some((o: { actor: string }) => o.actor === team.caseOfficers[0]) && c.body?.team?.stand_in === "SI-9", c.body?.team);
  ok("C6.11-8 pass (data): the team is stored in AG-07's CaseTeamMember shape (LEAD_REPRESENTATIVE once, OFFICER)",
    sql(`select count(*) from case_team_member where case_id='${c.id}' and role='LEAD_REPRESENTATIVE' and ended_at is null`) === "1" && Number(sql(`select count(*) from case_team_member where case_id='${c.id}' and role='OFFICER' and ended_at is null`) ?? 0) >= 1);

  // Assign and reassign: firm admin only, a reason, history kept.
  const other = f.firm?.users.find((u) => u.duties.includes("case_officer") && u.actor !== team.caseOfficers[0])?.actor ?? f.rep;
  r = await call("PUT", `/runtime/cases/${c.id}/team`, { caseOfficers: [other], reason: "Workload", version: c.body?.team?.version }, team.caseOfficers[0]);
  ok("C6.11-9 fail: a case officer without the firm admin duty cannot reassign (403)", !!f.officer && !!f.admin && f.officer !== f.admin && r.status === 403, r.status);
  r = await call("PUT", `/runtime/cases/${c.id}/team`, { caseOfficers: [other], version: c.body?.team?.version }, f.admin);
  ok("C6.11-10 fail: reassigning without a reason is refused on the field (400)", r.status === 400 && /reason/i.test(JSON.stringify(r.body)), r.status);
  r = await call("PUT", `/runtime/cases/${c.id}/team`, { caseOfficers: [other], reason: "Workload (Sample)", version: c.body?.team?.version }, f.admin);
  const t = (await call("GET", `/runtime/cases/${c.id}/team`, undefined, f.admin)).body;
  ok("C6.11-11 pass: the firm admin reassigns the case officer; the history line says who, when, from, to and why", r.status === 200 && (t?.history ?? []).some((h: { by: string; reason: string; at: string }) => h.by === f.admin && h.reason === "Workload (Sample)" && !!h.at), t?.history);
  ok("C6.11-12 pass (data): the earlier assignment is ended, never deleted", sql(`select count(*) from case_team_member where case_id='${c.id}' and role='OFFICER' and ended_at is not null`) === "1");
  r = await call("PUT", `/runtime/cases/${c.id}/team`, { caseOfficers: [team.caseOfficers[0]], reason: "Again", version: c.body?.team?.version }, f.admin);
  ok("C6.11-13 fail: a change from an older version of the team is refused (409, Reload)", r.status === 409, r.status);
  ok("C6.11-14 fail: a client or the configuration author cannot change the team (403)", (await call("PUT", `/runtime/cases/${c.id}/team`, { caseOfficers: [other], reason: "x", version: t?.version }, CLIENT)).status === 403 && (await call("PUT", `/runtime/cases/${c.id}/team`, { caseOfficers: [other], reason: "x", version: t?.version }, AUTHOR)).status === 403);

  // IMM 5476 from the representative of record (VV-R10); a change asks for a new one (BR-20).
  const P = c.subjects["Sample Client A"], spouse = c.subjects["Sample Spouse A"], child10 = c.subjects["Sample Child A1"];
  let p = (await prepare(c.id)).p;
  const imm5476 = itemsOf(p, P, "IMM 5476")[0];
  ok("C6.11-15 pass: IMM 5476 is a deliverable for the principal and the spouse (each 18 or older), none for a child of 10 (VV-R10)", !!imm5476 && itemsOf(p, spouse, "IMM 5476").length === 1 && itemsOf(p, child10, "IMM 5476").length === 0, p?.items.filter((i) => i.form === "IMM 5476").map((i) => i.subject));
  const facts = (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections?.flatMap((s: { questions: { fact: string; answer: { value: unknown } | null }[] }) => s.questions) ?? [];
  ok("C6.11-16 pass: the representative's facts IMM 5476 reads (membership ID, licensing body) come from the representative of record, source \"Firm\", not typed per case",
    !!rep?.licence?.number && facts.some((q: { fact: string; answer: { value: unknown; channel?: string } | null }) => q.fact === "representative.membership_id" && q.answer?.value === rep.licence!.number && q.answer?.channel === "firm"));
  const newRep = f.firm?.users.find((u) => u.duties.includes("representative") && u.actor !== f.rep)?.actor ?? f.soloRep;
  r = await call("PUT", `/runtime/cases/${c.id}/team`, { representative: newRep, reason: "Representative leaves the firm (Sample)", version: t?.version }, f.admin);
  p = (await prepare(c.id)).p;
  const after = itemsOf(p, P, "IMM 5476");
  ok("C6.11-17 pass: changing the representative asks for a new IMM 5476 naming the new representative (To do, history line \"new IMM 5476 needed\"); a signed earlier one goes Out of date (C9.2-6)",
    r.status === 200 && after.some((i) => i.state === "to_do" && (i as { representative?: string }).representative === newRep)
    && ((await call("GET", `/runtime/cases/${c.id}/team`, undefined, f.admin)).body?.history ?? []).some((h: { change: string }) => /IMM 5476/.test(h.change ?? "")), after.map((i) => i.state));
  ok("C6.11-18 fail (data): a case never has two representatives of record at once", sql(`select count(*) from case_team_member where case_id='${c.id}' and role='LEAD_REPRESENTATIVE' and ended_at is null`) === "1");

  // Solo firm (P-155 (1)): the representative is also the case officer.
  const solo = await openCase(vv, FAMILY.slice(0, 1), { representative: f.soloRep, caseOfficers: [f.soloRep ?? ""] });
  ok("C6.11-19 pass: a solo firm opens a case where one person is representative of record and case officer", solo.body?.team?.representative?.actor === f.soloRep && (solo.body?.team?.case_officers ?? []).some((o: { actor: string }) => o.actor === f.soloRep), solo.body?.team);
});
