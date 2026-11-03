// C7.5 Independent review of a filled form before it goes out (M3-E; r5c BR-19; P-71, P-110, P-121, P-141, P-164 (2);
// stand-in SI-6). Visitor visa part, US$0: rules cross-checks on every form (deterministic); the AI review of IMM 5257
// is only REPLAYED here from its saved run (the one live trial, about US$1, needs the founder's Go and is never made by
// a test); cost shown first; two rounds, High when both rounds and the rules agree, Low with both reasons when not;
// findings in the team's words (CRITICAL · MAJOR · MINOR · INFO; Rules · AI · Added by hand; Open → Acknowledged →
// Resolved, Waived for CRITICAL only); a finding warns, never blocks "Ready to file".
// Breadth, after Visitor visa: other form families one at a time with their own prompt and tests (SI-6).
// Part 1 (rules cross-checks and the finding's life): C7.5-10…13 run on rules findings until the saved AI review exists.
//   tsx studio/acceptance/C7.5.test.ts 4440 xr_studio_accept
import { CLIENT, FIXED, OFFICER, answer, call, confirmAll, fillEverything, filingOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, sql, yearsAgo, generateCopy } from "./lib/m3.ts";

type Finding = { id: string; filing: string; subject: string; form?: string; field?: string; severity: string; source: string; state: string; quote?: string; agreement?: "high" | "low"; reasons?: string[]; replayed?: boolean };

await main("C7.5", "Independent review: rules cross-checks and the replayed AI review", async () => {
  const vv = needVisitorVisa();
  // FIXED values throughout, so the saved AI review recorded once replays on the same form values (FQ-10).
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: FIXED.dob }]);
  const P = c.subjects["Sample Client A"];
  const spend0 = sql("select count(*) from ai_batch");
  await fillEverything(c.id);
  const fid = filingOf((await prepare(c.id)).p, P)?.id;
  const findings = async (q = "") => ((await call("GET", `/runtime/cases/${c.id}/findings${q}`, undefined, OFFICER)).body?.findings ?? []) as Finding[];

  // Rules cross-check (US$0): the passport expires before the visit ends (Sample severity MAJOR).
  const stayFrom = FIXED.stayFrom, stayTo = FIXED.stayTo;
  await answer(c.id, c.caseSubject, "case.intended_stay_from", stayFrom); await answer(c.id, c.caseSubject, "case.intended_stay_to", stayTo);
  await answer(c.id, P, "person.passport_expiry_date", "2030-03-20"); await confirmAll(c.id, P); await confirmAll(c.id, c.caseSubject);
  let fs = await findings();
  const rule = fs.find((x) => x.source === "rules" && x.field === "person.passport_expiry_date");
  ok("C7.5-1 pass: a rules cross-check finds the passport expiring before the visit ends: one MAJOR Rules finding quoting both facts", !!rule && rule.severity === "MAJOR" && rule.state === "open" && /expir/i.test(rule.quote ?? ""), fs);
  ok("C7.5-2 pass: rules checks made no model call (US$0)", !!rule && sql("select count(*) from ai_batch") === spend0);
  ok("C7.5-3 fail: a client cannot read findings (403)", (await call("GET", `/runtime/cases/${c.id}/findings`, undefined, CLIENT)).status === 403);
  await answer(c.id, P, "person.passport_expiry_date", FIXED.expiry); await confirmAll(c.id, P);
  fs = await findings();
  ok("C7.5-4 pass: a rule finding resolves itself when the fact is fixed", fs.find((x) => x.id === rule?.id)?.state === "resolved", fs.find((x) => x.id === rule?.id));

  // AI review of IMM 5257: cost first, replay only.
  await generateCopy(c.id, "IMM 5257", P);
  let r = await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P }, OFFICER);
  ok("C7.5-5 pass (P-110): the run card shows the cost first: live estimate above US$0, replay US$0, and the SI-6 stand-in", r.status === 200 && r.body?.estimate?.live_usd > 0 && r.body?.estimate?.replay_usd === 0 && r.body?.stand_in === "SI-6", r.body);
  // Never a live request from a test (P-175): the card says live needs the founder's Go; only replay is sent.
  ok("C7.5-6 pass: the card says a live review is not allowed without the founder's Go", r.body?.live_allowed === false, r.body?.live_allowed);
  ok("C7.5-6b precondition (FQ-10): a saved AI review of IMM 5257 for these fixed values is recorded (the one live trial, about US$1, SI-6, with the founder's Go; until then C7.5-7…13 stay red); replay is keyed on the form edition and its field values, not the PDF checksum", r.body?.replay_available === true, r.body?.replay_available);
  r = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "replay" }, OFFICER);
  fs = await findings("?source=ai");
  ok("C7.5-7 pass: the replayed review returns its saved findings, each marked Replayed, quoting its source and field, with High or Low agreement (P-121)", r.status === 201 && fs.length > 0 && fs.every((x) => x.replayed === true && !!x.quote && !!x.field && ["high", "low"].includes(x.agreement ?? "")) && r.body?.cost_usd === 0, fs);
  ok("C7.5-8 pass: the saved run has a Low finding, and every Low finding carries both rounds' reasons", fs.some((x) => x.agreement === "low") && fs.filter((x) => x.agreement === "low").every((x) => (x.reasons ?? []).length === 2));
  const rd = readinessOf((await prepare(c.id)).p, fid);
  ok("C7.5-9 pass (P-71, P-168): an open AI finding warns and never blocks Ready to file", (rd?.warns ?? []).some((w) => w.code === "finding") && !(rd?.blocks ?? []).some((b) => b.code === "finding"));

  // A finding's life (C7.5-10…13) is the same whatever its source. Until the saved AI review is recorded (C7.5-6b, part 2)
  // it is proved on rules findings: the visit's dates and the passport made to disagree twice (two MAJOR Rules findings).
  let pool = fs, poolSource = "ai";
  if (!pool.length) {
    await answer(c.id, c.caseSubject, "case.intended_stay_to", "2030-02-01"); await answer(c.id, P, "person.passport_expiry_date", "2030-01-15");
    await confirmAll(c.id, P); await confirmAll(c.id, c.caseSubject);
    pool = (await findings("?source=rules")).filter((x) => x.state === "open"); poolSource = "rules";
  }
  const f1 = pool[0];
  r = await call("POST", `/runtime/findings/${f1?.id}/acknowledge`, {}, OFFICER);
  ok("C7.5-10 fail: acknowledging without a reason is refused (400)", r.status === 400, r.status);
  r = await call("POST", `/runtime/findings/${f1?.id}/acknowledge`, { reason: "Checked against the passport (Sample)" }, OFFICER);
  ok("C7.5-11 pass: acknowledged with a reason, recorded with who and when", r.status === 200 && r.body?.state === "acknowledged");
  const major = pool.find((x) => x.severity !== "CRITICAL");
  r = await call("POST", `/runtime/findings/${major?.id}/waive`, { reason: "x" }, OFFICER);
  ok("C7.5-12 fail: waiving anything below CRITICAL is refused (422); the saved run needs a non-CRITICAL finding", !!major && r.status === 422, r.status);
  const other = pool.find((x) => x.id !== f1?.id);
  if (other) await call("POST", `/runtime/findings/${other.id}/dismiss`, { reason: "Not relevant (Sample)" }, OFFICER);
  // The next run: the replayed AI review again, or (rules) the next read, which runs the rules on the same facts.
  if (poolSource === "ai") await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "replay" }, OFFICER);
  const again = await findings(`?source=${poolSource}`);
  ok("C7.5-13 pass: a dismissed finding does not return for the same source on the next run (the saved run needs two findings)", !!other && !again.some((x) => x.quote === other.quote && x.field === other.field && x.state === "open"));
  r = await call("POST", `/runtime/cases/${c.id}/findings`, { filing: fid, subject: P, severity: "MINOR", note: "Photo to retake (Sample)" }, OFFICER);
  ok("C7.5-14 pass: staff add a finding by hand (source Added by hand)", r.status === 201 && r.body?.source === "manual");
  ok("C7.5-15 pass: the whole review stayed at US$0 (replay only)", fs.length > 0 && sql("select count(*) from ai_batch") === spend0);
});
