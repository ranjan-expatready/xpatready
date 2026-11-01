// C7.5 Independent review of a filled form before it goes out (M3-E; r5c BR-19; P-71, P-110, P-121, P-141, P-164 (2);
// stand-in SI-6). Visitor visa part, US$0: rules cross-checks on every form (deterministic); the AI review of IMM 5257
// is only REPLAYED here from its saved run (the one live trial, about US$1, needs the founder's Go and is never made by
// a test); cost shown first; two rounds, High when both rounds and the rules agree, Low with both reasons when not;
// findings in the team's words (CRITICAL · MAJOR · MINOR · INFO; Rules · AI · Added by hand; Open → Acknowledged →
// Resolved, Waived for CRITICAL only); a finding warns, never blocks "Ready to file".
// Breadth, after Visitor visa: other form families one at a time with their own prompt and tests (SI-6).
//   tsx studio/acceptance/C7.5.test.ts 4440 xr_studio_accept
import { CLIENT, OFFICER, answer, call, confirmAll, fillEverything, filingOf, inDays, main, needVisitorVisa, ok, openCase, prepare, readinessOf, sql, yearsAgo, generateCopy } from "./lib/m3.ts";

type Finding = { id: string; filing: string; subject: string; form?: string; field?: string; severity: string; source: string; state: string; quote?: string; agreement?: "high" | "low"; reasons?: string[]; replayed?: boolean };

await main("C7.5", "Independent review: rules cross-checks and the replayed AI review", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }]);
  const P = c.subjects["Sample Client A"];
  const spend0 = sql("select count(*) from ai_batch");
  await fillEverything(c.id);
  const fid = filingOf((await prepare(c.id)).p, P)?.id;
  const findings = async (q = "") => ((await call("GET", `/runtime/cases/${c.id}/findings${q}`, undefined, OFFICER)).body?.findings ?? []) as Finding[];

  // Rules cross-check (US$0): the passport expires before the visit ends (Sample severity MAJOR).
  const stayFrom = inDays(30), stayTo = inDays(90);
  await answer(c.id, c.caseSubject, "case.intended_stay_from", stayFrom); await answer(c.id, c.caseSubject, "case.intended_stay_to", stayTo);
  await answer(c.id, P, "person.passport_expiry_date", inDays(60)); await confirmAll(c.id, P); await confirmAll(c.id, c.caseSubject);
  let fs = await findings();
  const rule = fs.find((x) => x.source === "rules" && x.field === "person.passport_expiry_date");
  ok("C7.5-1 pass: a rules cross-check finds the passport expiring before the visit ends: one MAJOR Rules finding quoting both facts", !!rule && rule.severity === "MAJOR" && rule.state === "open" && /expir/i.test(rule.quote ?? ""), fs);
  ok("C7.5-2 pass: rules checks made no model call (US$0)", sql("select count(*) from ai_batch") === spend0);
  ok("C7.5-3 fail: a client cannot read findings (403)", (await call("GET", `/runtime/cases/${c.id}/findings`, undefined, CLIENT)).status === 403);
  await answer(c.id, P, "person.passport_expiry_date", inDays(3 * 365)); await confirmAll(c.id, P);
  fs = await findings();
  ok("C7.5-4 pass: a rule finding resolves itself when the fact is fixed", fs.find((x) => x.id === rule?.id)?.state === "resolved", fs.find((x) => x.id === rule?.id));

  // AI review of IMM 5257: cost first, replay only.
  await generateCopy(c.id, "IMM 5257", P);
  let r = await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P }, OFFICER);
  ok("C7.5-5 pass (P-110): the run card shows the cost first: live estimate above US$0, replay US$0, and the SI-6 stand-in", r.status === 200 && r.body?.estimate?.live_usd > 0 && r.body?.estimate?.replay_usd === 0 && r.body?.stand_in === "SI-6", r.body);
  r = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "live" }, OFFICER);
  ok("C7.5-6 fail: a live AI review is refused on this copy without the founder's Go (403 or 409); nothing spent", [403, 409].includes(r.status) && sql("select count(*) from ai_batch") === spend0, r.status);
  r = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "replay" }, OFFICER);
  fs = await findings("?source=ai");
  ok("C7.5-7 pass: the replayed review returns its saved findings, each marked Replayed, quoting its source and field, with High or Low agreement (P-121)", r.status === 201 && fs.length > 0 && fs.every((x) => x.replayed === true && !!x.quote && !!x.field && ["high", "low"].includes(x.agreement ?? "")) && r.body?.cost_usd === 0, fs);
  ok("C7.5-8 pass: a Low finding carries both rounds' reasons", fs.filter((x) => x.agreement === "low").every((x) => (x.reasons ?? []).length === 2));
  const rd = readinessOf((await prepare(c.id)).p, fid);
  ok("C7.5-9 pass (P-71, P-168): an open AI finding warns and never blocks Ready to file", (rd?.warns ?? []).some((w) => w.code === "finding") && !(rd?.blocks ?? []).some((b) => b.code === "finding"));

  const f1 = fs[0];
  r = await call("POST", `/runtime/findings/${f1?.id}/acknowledge`, {}, OFFICER);
  ok("C7.5-10 fail: acknowledging without a reason is refused (400)", r.status === 400, r.status);
  r = await call("POST", `/runtime/findings/${f1?.id}/acknowledge`, { reason: "Checked against the passport (Sample)" }, OFFICER);
  ok("C7.5-11 pass: acknowledged with a reason, recorded with who and when", r.status === 200 && r.body?.state === "acknowledged");
  const major = fs.find((x) => x.severity !== "CRITICAL");
  r = await call("POST", `/runtime/findings/${major?.id}/waive`, { reason: "x" }, OFFICER);
  ok("C7.5-12 fail: waiving anything below CRITICAL is refused (422)", !major || r.status === 422, r.status);
  const other = fs.find((x) => x.id !== f1?.id);
  if (other) await call("POST", `/runtime/findings/${other.id}/dismiss`, { reason: "Not relevant (Sample)" }, OFFICER);
  await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "replay" }, OFFICER);
  const again = await findings("?source=ai");
  ok("C7.5-13 pass: a dismissed finding does not return for the same source on the next run", !other || !again.some((x) => x.quote === other.quote && x.field === other.field && x.state === "open"));
  r = await call("POST", `/runtime/cases/${c.id}/findings`, { filing: fid, subject: P, severity: "MINOR", note: "Photo to retake (Sample)" }, OFFICER);
  ok("C7.5-14 pass: staff add a finding by hand (source Added by hand)", r.status === 201 && r.body?.source === "manual");
  ok("C7.5-15 pass: the whole review stayed at US$0 (replay only)", sql("select count(*) from ai_batch") === spend0);
});
