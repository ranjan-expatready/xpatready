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
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
