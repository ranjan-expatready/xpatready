// B152 (runtime, C6.12 and C8.2; FQ-7; Devin on #1233): a recorded submission group keeps the fee lines and totals it
// was recorded with. On the configured checkpoint: a Visitor visa case with a principal and a child two days short of
// 14 (no biometrics for the child) is made Ready to file and recorded. Then the date moves on: the server has no test
// clock and answers are append-only (a trigger), so the child's date of birth is moved three days earlier through the
// answers route, which is what three days passing does to "age as at today" (the child is 14 now). GET /prepare still shows the recorded amounts on the recorded group, while an
// unrecorded case with the same move is priced again (control). Fail-first: before B152 the recorded group's
// biometrics total rose from CAD 85 to CAD 170 (total CAD 285 → CAD 370). No model call (US$0).
//   zsh studio/tools/isolated.sh rt_b152 4436 start, then Demo › Reset and Demo › Load the configured checkpoint as the author, then
//   tsx studio/tests/check_b152_recorded_fees_api.ts 4436 xr_studio_rt_b152
import { answer, call, firms, inDays, needVisitorVisa, openCase, prepare, readyToFile, sql, yearsAgo, OFFICER } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
type Total = { line: string; total_cents: number; basis?: string };
type Line = { filing: string; subject: string; key: string; amount_cents: number; exempt: boolean; reason: string };
type View = { version: string; groups: { id: string; filings: string[]; totals: Total[]; total_cents: number | null; fees_recorded?: { at: string } }[]; filings: { id: string; status: string }[]; fees: Line[] };
const view = async (id: string, actor: string) => (await prepare(id, actor)).p as unknown as View;
const feesOf = (v: View) => JSON.stringify({ totals: v.groups[0]?.totals.map((t) => [t.line, t.total_cents]), total: v.groups[0]?.total_cents, lines: v.fees.map((l) => [l.filing, l.subject, l.key, l.amount_cents, l.exempt]).sort() });
const BIO = (v: View) => v.groups[0]?.totals.find((t) => /biometric/i.test(t.line))?.total_cents ?? null;
/** "The date moves on" by `days`: the person's date of birth moves that many days earlier through the answers route
 *  (the person is that much older as at today), as the calendar passing would. */
const ageBy = async (caseId: string, subject: string, dob: string, days: number, actor: string) => (await answer(caseId, subject, "person.date_of_birth", new Date(Date.parse(`${dob}T12:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10), actor)).status;

(async () => {
  const vv = needVisitorVisa(), f = await firms(), officer = f.officer ?? OFFICER;
  const people = [{ role: "principal" as const, name: "Sample Client F", dob: yearsAgo(40) }, { role: "child" as const, name: "Sample Child F1", dob: yearsAgo(14, -2) }];
  const c = await openCase(vv, people, { representative: f.rep, caseOfficers: [officer] });
  const kid = c.subjects["Sample Child F1"];
  let v = await view(c.id, officer);
  ok("setup: a principal and a child two days short of 14: biometrics CAD 85 (the child pays none: under 14)", BIO(v) === 85_00 && v.fees.some((l) => l.subject === kid && /biometric/i.test(l.key) && l.exempt), v.groups[0]?.totals);
  ok("B152 data: before recording the group has no recorded fees", sql(`select count(*) from submission_group where case_id='${c.id}' and recorded_fees is not null`) === "0");
  const ready = await readyToFile(c.id, f.rep);
  v = await view(c.id, officer);
  ok("setup: both filings reach Ready to file", ready.length === 2 && v.filings.every((x) => x.status === "ready_to_file"), ready);
  const before = feesOf(v);
  const r = await call("PATCH", `/runtime/groups/${v.groups[0].id}/record`, { version: v.version, ucis: [], filings: v.filings.map((x, i) => ({ filing: x.id, our_reference: `SAMPLE-B152-${i + 1}`, submitted_on: inDays(0), application_number: `V30015200${i + 1}`, fee_receipt: "SAMPLE-RECEIPT" })) }, officer);
  ok("setup: the submission is recorded (200)", r.status === 200, [r.status, r.body?.detail]);
  v = await view(c.id, officer);
  ok("B152 pass: right after recording, the recorded group shows the same fees as the view it was recorded from", feesOf(v) === before && !!v.groups[0].fees_recorded?.at, { now: feesOf(v), before });
  ok("B152 data: the record wrote the group's fees once, with its total (CAD 285 = 2 × 100 + 85)", sql(`select (recorded_fees->>'total_cents') from submission_group where id='${v.groups[0].id}'`) === "28500");

  // The date moves on: the child is now 14 (four days later, as at today).
  const moved = await ageBy(c.id, kid, people[1].dob, 3, officer);
  ok("setup: the child's date of birth moved 3 days earlier (now 14 as at today)", moved < 300, moved);
  v = await view(c.id, officer);
  ok("B152 pass (fail-first): after the date moves, the recorded group still shows its recorded amounts (biometrics CAD 85, total CAD 285)", feesOf(v) === before && BIO(v) === 85_00 && v.groups[0].total_cents === 285_00, { now: feesOf(v), before });
  ok("B152 fail: the recorded group never gains the child's biometrics line as paid, although the child is 14 now", !v.fees.some((l) => l.subject === kid && /biometric/i.test(l.key) && !l.exempt), v.fees.filter((l) => l.subject === kid));

  // Control: an unrecorded case with the same move is priced again (only a recorded group is frozen).
  const u = await openCase(vv, [{ ...people[0], name: "Sample Client G" }, { ...people[1], name: "Sample Child G1" }], { representative: f.rep, caseOfficers: [officer] });
  const before2 = BIO(await view(u.id, officer));
  await ageBy(u.id, u.subjects["Sample Child G1"], people[1].dob, 3, officer);
  const after2 = await view(u.id, officer);
  ok("B152 fail (control): an unrecorded case is still worked out today: the same move adds the child's biometrics (CAD 85 → CAD 170, the family maximum)", before2 === 85_00 && BIO(after2) === 170_00 && !after2.groups[0].fees_recorded, [before2, BIO(after2)]);
  ok("B152 fail: a client cannot read the recorded fees (403)", (await call("GET", `/runtime/cases/${c.id}/prepare`, undefined, "user-P")).status === 403);
  process.exitCode = summary() ? 1 : 0;
})().catch((e) => { console.error(e); process.exitCode = 1; });
