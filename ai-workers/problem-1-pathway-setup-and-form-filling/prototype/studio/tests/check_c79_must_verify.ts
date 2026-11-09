// C7.9 (row B142 = L-SA8; P-242, P-237; SA-1B-260 rule 3, SA-1B-261 rule 7): must verify before filing, the rules on
// their own. Pure: a hand-built release, answers and form facts; no server. The library, the release and a case are
// proved by acceptance/C7.9.test.ts on the checkpoint.
//   tsx studio/tests/check_c79_must_verify.ts
import { isVerified, mustVerifyFacts, unverifiedOf } from "../engine/runtime/must-verify.ts";
import { filingReadiness, isCritical, passKeys, type FormItem } from "../engine/runtime/readiness.ts";
import type { Answer } from "../engine/runtime/case.ts";
import type { Snapshot } from "../engine/snapshot.ts";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  C7.9: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d).slice(0, 240)}` : ""}`); };

const P = "p1", S = "s1", F = "person.passport_number";
const snap = (flag: boolean) => ({ canonical_fields: [{ id: F, meaning: "Passport number", ...(flag ? { must_verify: true } : {}) }, { id: "person.family_name", meaning: "Family name" }],
  placements: [{ fact: F, question_text: "Number of the passport or travel document" }] }) as unknown as Snapshot;
const ans = (subjectId: string, field: string, value: string, status: Answer["status"], channel: string): Answer => ({ id: `${subjectId}-${field}-${channel}`, subjectId, field, rowKey: null, value, status, channel, actor: "x", at: "2026-11-07T00:00:00Z" });
const fact = (about: string, f = F) => ({ box: `b-${f}`, fact: f, about, row: null, value: "v" });
/** As case-prepare reads answers: a relative's answers keyed `<person>/parent_1` (state()), the application's subject "case". */
const CASE_SUBJECT = "c1";
const R = { aboutOf: (id: string) => (id === CASE_SUBJECT ? "case" : id), liveRows: new Set<string>(["row-live"]) };

ok("pass: the release's flagged facts are read from it", mustVerifyFacts(snap(true)).has(F) && !mustVerifyFacts(snap(false)).has(F));
ok("SA-1B-260 r3 pass: a staff confirmation (VERIFIED) and a staff entry (Agent view) count as verified; a client's own does not",
  isVerified({ status: "VERIFIED", channel: "questionnaire" }) && isVerified({ status: "DECLARED", channel: "agent_view" }) && !isVerified({ status: "DECLARED", channel: "questionnaire" }));
const client = [ans(P, F, "AB123", "DECLARED", "questionnaire")];
let u = unverifiedOf(snap(true), client, [fact(P)], R);
ok("SA-1B-261 r7 fail: a client-typed flagged value, unchecked: unverified, in the question's words", u.length === 1 && u[0].label === "Number of the passport or travel document" && u[0].key.startsWith(`${F}|${P}|`), u);
ok("pass: the same value without the flag in the release: nothing", unverifiedOf(snap(false), client, [fact(P)], R).length === 0);
ok("pass: a staff-confirmed value: nothing", unverifiedOf(snap(true), [ans(P, F, "AB123", "VERIFIED", "confirm_section")], [fact(P)]).length === 0);
ok("pass: a staff-entered value: nothing", unverifiedOf(snap(true), [ans(P, F, "AB123", "DECLARED", "agent_view")], [fact(P)]).length === 0);
ok("pass: a flagged fact the form does not write: nothing", unverifiedOf(snap(true), client, [fact(P, "person.family_name")], R).length === 0);
ok("pass: another person's unchecked value does not count for this person's line", unverifiedOf(snap(true), [ans(S, F, "X", "DECLARED", "questionnaire")], [fact(P)]).length === 0);
ok("fail: the principal's answer for another person (the questionnaire) is client-given: unverified", unverifiedOf(snap(true), [ans(S, F, "X", "DECLARED", "questionnaire")], [fact(S)]).length === 1);
const k2 = unverifiedOf(snap(true), [{ ...ans(P, F, "ZZ999", "DECLARED", "questionnaire"), id: "a-new-answer" }], [fact(P)])[0]?.key; // a new value is a new answer
ok("pass: a new value gives a new key (a pass covers only the value it was given for)", !!k2 && k2 !== u[0].key);
ok("review S2 pass: the key names the answer, never the value itself", !u[0].key.includes("AB123") && u[0].key.endsWith(client[0].id));
// Review M1 on #1282: the whole "about" is matched: a parent's value and the application's value are judged on their own.
const PAR = `${S}/parent_1`;
let m1 = unverifiedOf(snap(true), [ans(PAR, F, "X1", "DECLARED", "questionnaire")], [fact(PAR)], R);
ok("review M1 fail: a parent's client-given value of a flagged fact (IMM 5645's mother) is unverified, and the line names the relative", m1.length === 1 && /\(their parent 1\)$/.test(m1[0].label), m1);
ok("review M1 pass: the person's own answer does not stand in for their parent's (no answer about the parent: nothing)", unverifiedOf(snap(true), [ans(S, F, "X", "DECLARED", "questionnaire")], [fact(PAR)], R).length === 0);
m1 = unverifiedOf(snap(true), [ans(CASE_SUBJECT, F, "X2", "DECLARED", "questionnaire")], [fact("case")], R);
ok("review M1 fail: an application-level client-given value (about \"case\") is unverified", m1.length === 1 && /\(the application\)$/.test(m1[0].label), m1);
const rowAns = (rowKey: string): Answer => ({ ...ans(P, F, "R", "DECLARED", "questionnaire"), id: `row-${rowKey}`, rowKey });
ok("review S1 pass: a removed row's answer is never read (only a live row's counts)", unverifiedOf(snap(true), [rowAns("row-gone")], [fact(P)], R).length === 0 && unverifiedOf(snap(true), [rowAns("row-live")], [fact(P)], R).length === 1);

// Ready to file: a CRITICAL line, passable with a reason, never a block.
const item = (unverified: FormItem["unverified"]): FormItem => ({ form: "IMM 5257", subject: P, person: "Sample Client A", channel: "PDF_UPLOAD", readiness: { ready: true, missing: [] } as never,
  needsValidate: false, validatedCurrent: true, signature: "NONE", signed: true, unverified });
const run = (unverified: FormItem["unverified"], passes: never[] = []) => filingReadiness({ filing: "f1", forms: [item(unverified)], reviewed: true, passes, today: "2026-11-07" } as never);
let r = run(u);
const line = r.warns.find((w) => w.code === "must_verify");
ok("P-237 fail: an unverified value is a CRITICAL warning on Ready to file, not a block", !!line && line.severity === "critical" && isCritical("must_verify") && !r.blocks.length && /^CRITICAL: IMM 5257 for Sample Client A: "Number of the passport or travel document" not verified/.test(line.words) && !r.ready, line);
const keys = passKeys(r, "must_verify");
r = run(u, [{ code: "must_verify", keys, reason: "Checked by phone (Sample)", by: "user-O", at: "2026-11-07T01:00:00Z" }] as never);
ok("P-237 pass: passed with a reason, it is no longer open and the filing can be ready", !r.warns.some((w) => w.code === "must_verify") && r.passed.some((x) => x.code === "must_verify") && r.ready, { warns: r.warns.map((w) => w.code), ready: r.ready });
r = run([{ ...u[0], key: k2! }], [{ code: "must_verify", keys, reason: "Checked by phone (Sample)", by: "user-O", at: "2026-11-07T01:00:00Z" }] as never);
ok("fail: the pass does not cover a later value", r.warns.some((w) => w.code === "must_verify"));
ok("pass: nothing unverified, no line", !run([]).warns.some((w) => w.code === "must_verify") && !run(undefined).warns.some((w) => w.code === "must_verify"));

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
