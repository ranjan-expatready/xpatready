// C6.9 Staff eligibility page (M3-D; r5c BR-14; P-77, P-141, P-164 (1); stand-in SI-1). Visitor visa part: the gates
// are rules as data on the release (lib/setup_vv_m3.ts S7, Sample values from canada.ca's eligibility list, VV-R01);
// an adapter fills AG-03's result shape with three outcomes and no score; each run is a frozen snapshot with the rules
// version, a disclaimer and who ran it; only facts settle gates (travel document, convictions); money, health, ties
// and leaving are the officer's judgement (FQ-5); override needs a reason; out of date when a fact changes. Rules only, no AI.
// The judgement items on IRCC's list (ties, leaving at the end of the visit) are shown as the officer's judgement,
// never as gates (FQ-5).
// Breadth, after Visitor visa: score grids, cut-off bands and what-if advice (SI-2, the team's AG-03).
// Needs first, on a fresh copy, in this order (else it stops with exit 2, "Setup missing"; tech lead on #677):
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/tests/runtime/setup_visitor_visa.ts 4440 xr_studio_accept
//   tsx studio/acceptance/lib/setup_vv_m3.ts 4440 xr_studio_accept      (exits 1 on its own known gaps; fine)
//   tsx studio/acceptance/C6.9.test.ts 4440 xr_studio_accept
import { CLIENT, OFFICER, answer, call, main, needVisitorVisa, ok, openCase, sql, yearsAgo, inDays } from "./lib/m3.ts";

type Result = { programKey: string; outcome: string; score: number | null; maxScore: number | null; failedGates: string[]; missingInputs: string[]; breakdown: Record<string, unknown>; recommendations: unknown[]; gates: { key: string; state: "met" | "not_met" | "not_answered"; facts: string[] }[]; judgement?: string[] };
type Assessment = { id: string; packId: string; packVersion: string | number; rulesAsOfByProgram: Record<string, string>; disclaimerText: string; createdBy: string; createdAt: string; source: string; out_of_date?: boolean; results: Result[] };
const OUTCOMES = ["LIKELY_ELIGIBLE", "ELIGIBLE_BELOW_CUTOFF", "POSSIBLY_ELIGIBLE", "NOT_ELIGIBLE"];

await main("C6.9", "Staff eligibility page (Visitor visa gates, stand-in SI-1)", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }]);
  const P = c.subjects["Sample Client A"];
  const spend0 = sql("select count(*) from ai_batch");
  const assess = async (actor = OFFICER, reason?: string) => call("POST", `/runtime/cases/${c.id}/assessments`, { person: P, ...(reason ? { reason } : {}) }, actor);
  const vvResult = (a: Assessment | undefined) => a?.results?.find((x) => x.programKey === "vv.single");

  ok("C6.9-1 fail: a client cannot run or read an assessment (403); the client never sees a verdict", (await assess(CLIENT)).status === 403 && (await call("GET", `/runtime/cases/${c.id}/assessments`, undefined, CLIENT)).status === 403);
  let r = await assess();
  let a = r.body as Assessment | undefined, res = vvResult(a);
  ok("C6.9-2 pass: a run returns AG-03's shape: pack id and version (our release pin), rules as at, disclaimer, who and when, source stand-in", r.status === 201 && !!a?.packId && a?.packVersion !== undefined && !!a?.rulesAsOfByProgram?.["vv.single"] && (a?.disclaimerText ?? "").length > 20 && a?.createdBy === OFFICER && a?.source === "stand-in", a);
  ok("C6.9-3 pass: with passport and convictions unanswered: Possibly eligible, needs those facts (missing inputs named)", res?.outcome === "POSSIBLY_ELIGIBLE" && ["person.passport_number", "person.criminal_history"].every((f) => res!.missingInputs.includes(f)), res);
  ok("C6.9-4 pass: each gate shows Met, Not met or Not answered with the facts it reads", (res?.gates ?? []).length === 2 && res!.gates.every((g) => ["met", "not_met", "not_answered"].includes(g.state) && g.facts.length > 0), res?.gates);
  ok("C6.9-5 pass: the officer's judgement items (money for the stay, good health, ties, leaving at the end) are listed, never gates (FQ-5)", (res?.judgement ?? []).length === 4 && !(res?.gates ?? []).some((g) => /money|funds|health|ties|leave/i.test(g.key)), res?.judgement);
  ok("C6.9-6 pass (SI-1 adapter): never below the cut-off, no score, no breakdown, no recommendations", OUTCOMES.includes(res?.outcome ?? "") && res?.outcome !== "ELIGIBLE_BELOW_CUTOFF" && res?.score === null && res?.maxScore === null && Object.keys(res?.breakdown ?? {}).length === 0 && (res?.recommendations ?? []).length === 0);

  for (const [f, val] of [["person.passport_number", "SAMPLEP12"], ["person.passport_expiry_date", inDays(3 * 365)], ["person.criminal_history", true]] as const) await answer(c.id, P, f, val);
  await answer(c.id, c.caseSubject, "case.funds_available_cad", "8000");
  r = await assess(OFFICER, "Facts added");
  res = vvResult(r.body);
  // P-230 (1) (BACKLOG R4): the background gate's "when not met" is needs_review (S7), so a Yes is never a hard Not
  // eligible: Possibly eligible, the gate named for the representative's review (the outcome set is unchanged).
  ok("C6.9-7 fail: a conviction answered yes is not met and goes to the representative's review: Possibly eligible, never Not eligible (P-230 (1))", res?.outcome === "POSSIBLY_ELIGIBLE" && ((res as Result & { reviewGates?: string[] })?.reviewGates ?? []).includes("vv.no_convictions") && !(res?.failedGates ?? []).includes("vv.no_convictions") && res!.gates.find((g) => g.key === "vv.no_convictions")?.state === "not_met", res);
  await answer(c.id, P, "person.criminal_history", false);
  const first = a?.id;
  const firstJson = sql(`select result_json::text from assessment where id='${first}'`);
  r = await assess(OFFICER, "Conviction answer corrected");
  res = vvResult(r.body);
  ok("C6.9-8 pass: every gate met gives Likely eligible", res?.outcome === "LIKELY_ELIGIBLE" && res!.gates.every((g) => g.state === "met"), res);
  ok("C6.9-9 pass (AG-3-1): an earlier run is a frozen snapshot; it is unchanged and marked out of date after the facts changed", sql(`select result_json::text from assessment where id='${first}'`) === firstJson && !!firstJson
    && (await call("GET", `/runtime/cases/${c.id}/assessments`, undefined, OFFICER)).body?.assessments?.find((x: Assessment) => x.id === first)?.out_of_date === true);
  await answer(c.id, P, "person.passport_number", "SAMPLEP13");
  r = await assess(OFFICER);
  ok("C6.9-10 fail (AG-3-28): running again after a change without a reason is refused (400)", r.status === 400 && /reason/i.test(JSON.stringify(r.body)), r.status);

  const latest = ([...((await call("GET", `/runtime/cases/${c.id}/assessments`, undefined, OFFICER)).body?.assessments ?? [])] as Assessment[]).sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0] as Assessment | undefined;
  r = await call("POST", `/runtime/assessments/${latest?.id}/override`, { programKey: "vv.single", fromOutcome: "LIKELY_ELIGIBLE", label: "Refer to the representative" }, OFFICER);
  ok("C6.9-11 fail: an override without a reason is refused on the field (400)", r.status === 400 && /reason/i.test(JSON.stringify(r.body)), r.status);
  r = await call("POST", `/runtime/assessments/${latest?.id}/override`, { programKey: "vv.single", fromOutcome: "LIKELY_ELIGIBLE", label: "Refer to the representative", reason: "Earlier refusal (Sample)" }, OFFICER);
  ok("C6.9-12 pass: an override with a reason is kept beside the result (AssessmentOverride), the result itself unchanged", r.status === 201 && sql(`select count(*) from assessment_override where assessment_id='${latest?.id}'`) === "1" && vvResult((await call("GET", `/runtime/assessments/${latest?.id}`, undefined, OFFICER)).body)?.outcome === "LIKELY_ELIGIBLE");
  r = await call("POST", `/runtime/assessments/${latest?.id}/review`, { note: "Seen (Sample)" }, OFFICER);
  ok("C6.9-13 pass: Mark reviewed records reviewer, time and note", r.status === 200 && !!r.body?.reviewedAt && r.body?.reviewedBy === OFFICER, r.body);
  ok("C6.9-14 pass: the page is rules only: no model call in any run", !!latest?.id && sql("select count(*) from ai_batch") === spend0);
  ok("C6.9-15 pass: the list says which stand-in fills it (SI-1, a row in STAND-INS.md)", (await call("GET", `/runtime/cases/${c.id}/assessments`, undefined, OFFICER)).body?.stand_in === "SI-1");
});
