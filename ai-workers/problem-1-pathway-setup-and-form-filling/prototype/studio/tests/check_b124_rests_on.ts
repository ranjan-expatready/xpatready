// B124 (M3 row A8, P-393; review Major 1 on ca72fa195): which unconfirmed answers a gate's Met or Not met rests on
// (engine/runtime/eligibility.ts restsOn). Pure: a hand-built Known and a snapshot with no calculations; no server.
//   tsx studio/tests/check_b124_rests_on.ts
import { restsOn } from "../engine/runtime/eligibility.ts";
import { kkey, type Known } from "../engine/render.ts";
import type { Snapshot } from "../engine/snapshot.ts";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  C6.9: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d)}` : ""}`); };
const S = { derived_fields: [] } as unknown as Snapshot, P = "p1";
const known = (facts: Record<string, [unknown, "confirmed" | "answered"]>) => new Map(Object.entries(facts).map(([f, [value, status]]) => [kkey(P, f), { value, status }])) as unknown as Known;
const gate = (condition: Record<string, unknown>) => ({ key: "g", label: "G", condition: { subjectKind: "PERSON", ...condition } });
const has = (f: string) => ({ op: "exists", field: f });
const same = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// "or": met on a confirmed branch, so the other branch's unconfirmed answer decides nothing.
ok("B124 pass: an \"or\" gate met on a confirmed answer rests on nothing, though its other branch is unconfirmed", same(restsOn(S, known({ "person.a": ["A1", "confirmed"], "person.b": ["B1", "answered"] }), gate({ op: "or", args: [has("person.a"), has("person.b")] }), P, "met", ["person.b"]), []));
ok("B124 pass: an \"or\" gate met on two unconfirmed answers rests on both (only together do they decide)", same(restsOn(S, known({ "person.a": ["A1", "answered"], "person.b": ["B1", "answered"] }), gate({ op: "or", args: [has("person.a"), has("person.b")] }), P, "met", ["person.a", "person.b"]), ["person.a", "person.b"]));
ok("B124 pass: an \"and\" gate met on two unconfirmed answers rests on each", same(restsOn(S, known({ "person.a": ["A1", "answered"], "person.b": ["B1", "answered"] }), gate({ op: "and", args: [has("person.a"), has("person.b")] }), P, "met", ["person.a", "person.b"]), ["person.a", "person.b"]));
ok("B124 pass: an \"and\" gate met with one answer confirmed rests only on the unconfirmed one", same(restsOn(S, known({ "person.a": ["A1", "confirmed"], "person.b": ["B1", "answered"] }), gate({ op: "and", args: [has("person.a"), has("person.b")] }), P, "met", ["person.b"]), ["person.b"]));
// Not met: an "and" failed on a confirmed answer does not rest on its other, unconfirmed one.
ok("B124 fail: an \"and\" gate not met on a confirmed answer does not rest on its other, unconfirmed answer", same(restsOn(S, known({ "person.a": ["no", "confirmed"], "person.b": ["B1", "answered"] }), gate({ op: "and", args: [{ op: "eq", field: "person.a", value: "yes" }, has("person.b")] }), P, "not_met", ["person.b"]), []));
ok("B124 pass: a gate not met on an unconfirmed answer rests on it", same(restsOn(S, known({ "person.a": ["no", "answered"] }), gate({ op: "eq", field: "person.a", value: "yes" }), P, "not_met", ["person.a"]), ["person.a"]));
ok("B124 fail: a gate not answered rests on nothing (it gives Possibly eligible, unchanged)", same(restsOn(S, known({}), gate(has("person.a")), P, "not_answered", []), []));
ok("B124 fail: with nothing unconfirmed, a gate rests on nothing", same(restsOn(S, known({ "person.a": ["A1", "confirmed"] }), gate(has("person.a")), P, "met", []), []));
// Re-review on 06cc27a24: the cases where no single answer changes the gate.
const yes = (f: string) => ({ op: "eq", field: f, value: "yes" });
const abcU = known({ "person.a": ["yes", "answered"], "person.b": ["yes", "answered"], "person.c": ["no", "answered"] });
ok("B124 pass: an \"or\" met on A and B (C false), all unconfirmed, rests on A and B, never on C", same(restsOn(S, abcU, gate({ op: "or", args: [yes("person.a"), yes("person.b"), yes("person.c")] }), P, "met", ["person.a", "person.b", "person.c"]), ["person.a", "person.b"]));
const failU = known({ "person.a": ["no", "answered"], "person.b": ["no", "answered"], "person.c": ["yes", "answered"] });
ok("B124 pass: an \"and\" failed on A and B (C passes), all unconfirmed, rests on A and B, never on C", same(restsOn(S, failU, gate({ op: "and", args: [yes("person.a"), yes("person.b"), yes("person.c")] }), P, "not_met", ["person.a", "person.b", "person.c"]), ["person.a", "person.b"]));
const allU = known({ "person.a": ["yes", "answered"], "person.b": ["yes", "answered"], "person.c": ["yes", "answered"] });
ok("B124 pass: (A or B) and C, met on three unconfirmed answers, rests on all three", same(restsOn(S, allU, gate({ op: "and", args: [{ op: "or", args: [yes("person.a"), yes("person.b")] }, yes("person.c")] }), P, "met", ["person.a", "person.b", "person.c"]), ["person.a", "person.b", "person.c"]));
// An application fact is held by the case, not the person (aboutOf): taking it away must take the case's answer.
const caseK = new Map([[kkey("case", "case.funds"), { value: 8000, status: "answered" }]]) as unknown as Known;
ok("B124 pass: a gate on an application fact (held by the case) rests on that answer", same(restsOn(S, caseK, gate({ op: "gte", field: "case.funds", value: 5000 }), P, "met", ["case.funds"]), ["case.funds"]));
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
