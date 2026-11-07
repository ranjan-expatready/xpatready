// C6.15 (row B137; SA-1B-19, SA-1B-20): document substitute sets, the rules on their own. Pure: hand-built types and a
// minimal release; no server. The API, the release and a case are proved by acceptance/C6.15.test.ts on the checkpoint.
//   tsx studio/tests/check_c615_document_sets.ts
import { setsProblem, type StoredSet } from "../contracts/document-sets.ts";
import { lineSet, pickMember, setMet, setStatus, setWords, snapSets } from "../engine/document-sets.ts";
import { validate } from "../engine/validate.ts";
import type { Snapshot } from "../engine/snapshot.ts";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  C6.15: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d).slice(0, 240)}` : ""}`); };
const throws = (f: () => unknown) => { const r = f() as { problem?: string }; return r?.problem ?? ""; };

const types = new Map([
  ["birth", { name: "Birth certificate", status: "PUBLISHED", ownsSets: true }],
  ["baptism", { name: "Baptism record", status: "PUBLISHED", ownsSets: false }],
  ["school", { name: "School record", status: "PUBLISHED", ownsSets: false }],
  ["old", { name: "Old record", status: "RETIRED", ownsSets: false }],
  ["funds", { name: "Proof of funds", status: "PUBLISHED", ownsSets: true }],
]);
const W = { whenClient: "The country issued no birth certificate that year (Sample)." };
const BIRTH: StoredSet[] = [{ name: "Standard", mode: "any_one", members: [{ key: "birth" }, { key: "baptism", ...W }, { key: "school", whenClient: "No other record exists (Sample)." }] }];

// SA-1B-19 rules 1 to 6 (the publish checks), each with its words.
ok("SA-1B-19 r1-r3 pass: the example set (standard, then two alternatives with client words) is valid", setsProblem("birth", BIRTH, types) === null);
ok("SA-1B-19 r5 pass: no sets is valid (the type is its own only member)", setsProblem("birth", [], types) === null);
ok("SA-1B-19 r3 fail: an alternative without client words is refused, naming it", setsProblem("birth", [{ ...BIRTH[0], members: [{ key: "birth" }, { key: "baptism" }] }], types) === "Add the client wording for Baptism record.");
ok("SA-1B-19 r1 fail: the first set must be named Standard", /first set is named "Standard"/.test(setsProblem("birth", [{ ...BIRTH[0], name: "Other" }], types) ?? ""));
ok("SA-1B-19 r1 fail: two sets with one name (any letter case)", /Two sets are named/.test(setsProblem("birth", [BIRTH[0], { ...BIRTH[0], name: "standard" }], types) ?? ""));
ok("SA-1B-19 r4 fail: a type listed twice in a set", /listed twice/.test(setsProblem("birth", [{ ...BIRTH[0], members: [{ key: "birth" }, { key: "baptism", ...W }, { key: "baptism", ...W }] }], types) ?? ""));
ok("SA-1B-19 r6 fail: a retired member is refused, named", /Old record .* is retired/.test(setsProblem("birth", [{ ...BIRTH[0], members: [{ key: "birth" }, { key: "old", ...W }] }], types) ?? ""));
ok("SA-1B-19 r6 fail: a member that is not in the library is refused", /is not a document type in the library/.test(setsProblem("birth", [{ ...BIRTH[0], members: [{ key: "birth" }, { key: "nope", ...W }] }], types) ?? ""));
ok("SA-1B-19 r4 fail: no sets inside sets (a member that owns sets of its own)", /cannot be a member of another type's set/.test(setsProblem("birth", [{ ...BIRTH[0], members: [{ key: "birth" }, { key: "funds", ...W }] }], types) ?? ""));
ok("SA-1B-19 r2 fail: the standard (member 1) of an any-one set has no \"when acceptable\" words", /is the standard/.test(setsProblem("birth", [{ ...BIRTH[0], members: [{ key: "birth", ...W }, { key: "baptism", ...W }] }], types) ?? ""));
ok("SA-1B-152 r2 fail: an all-of set has no alternatives, so no \"when acceptable\" words", /every member is needed/.test(setsProblem("funds", [{ name: "Standard", mode: "all_together", members: [{ key: "baptism", ...W }, { key: "school" }] }], types) ?? ""));

// The release's copy and the line's set (SA-1B-20).
const name = (k: string) => types.get(k)?.name;
const FUNDS: StoredSet[] = [{ name: "Standard", mode: "all_together", members: [{ key: "baptism" }, { key: "school" }] }, { name: "Sponsor-funded", mode: "any_one", members: [{ key: "funds" }, { key: "baptism", ...W }] }];
const t = { key: "funds", name: "Proof of funds", sets: snapSets(FUNDS, name) };
ok("pass: the release names each member and keeps the words (staff words default to the client's)", t.sets?.[1].members[1].name === "Baptism record" && t.sets[1].members[1].when_staff === W.whenClient, t.sets);
ok("pass: a type with no sets carries none (its fingerprint keeps)", snapSets(null, name) === undefined && snapSets([], name) === undefined);
ok("SA-1B-20 r1 pass: no pick is the set named Standard", lineSet(t, null, "Proof of funds").set?.name === "Standard" && lineSet(t, "", "x").set?.name === "Standard");
ok("SA-1B-20 r1 pass: a pick by name (any letter case) is that set", lineSet(t, "sponsor-FUNDED", "x").set?.name === "Sponsor-funded");
ok("SA-1B-20 r3 fail: a set the type lacks is unresolved, in the requirement's words", lineSet(t, "Nope", "Proof of funds").problem === `Line "Proof of funds" names set "Nope", which does not exist.`);
ok("SA-1B-19 r5 pass: a type with no sets and no pick has no set (its own only member)", lineSet({ key: "a", name: "A" }, null, "A").set === null && lineSet({ key: "a", name: "A" }, "Standard", "A").problem === null);
ok("pass: the words say any one or all of, the standard first", setWords({ mode: "any_one", members: [{ name: "Birth certificate" }, { name: "Baptism record" }, { name: "School record" }] as never }) === "Any one of: Birth certificate (the standard), Baptism record or School record."
  && setWords({ mode: "all_together", members: [{ name: "Bank letter" }, { name: "Bank statements" }] as never }) === "All of: Bank letter and Bank statements.");

// Meeting the line (SA-1B-19 r1): any one of, one member; all of, every member.
const all = lineSet(t, null, "Proof of funds").set, any = lineSet(t, "Sponsor-funded", "Proof of funds").set;
ok("SA-1B-19 r1 fail: all of: one member alone does not meet the line, the other is still to come", !setMet(all, "funds", new Set(["baptism"])).met && setMet(all, "funds", new Set(["baptism"])).missing.join() === "school");
ok("SA-1B-19 r1 pass: all of: every member meets it", setMet(all, "funds", new Set(["baptism", "school"])).met);
ok("SA-1B-19 r1 pass: any one of: the alternative alone meets it", setMet(any, "funds", new Set(["baptism"])).met);
ok("SA-1B-19 r1 fail: any one of: a file of a type outside the set does not", !setMet(any, "funds", new Set(["school"])).met);
ok("pass: a line with no set is met by its own type only", setMet(null, "funds", new Set(["funds"])).met && !setMet(null, "funds", new Set(["baptism"])).met);
const line = { document: { key: "funds", name: "Proof of funds" }, set: all, label: "Proof of funds" };
ok("pass: the status says what is still to come, by name", setStatus(line, new Set(["baptism"]))?.words === "1 of 2 received; still to come: School record.");

// Which member a file is.
ok("pass: a file names its member", (pickMember({ ...line, set: any }, "baptism") as { name: string }).name === "Baptism record");
ok("pass: left out, it is the line's own type when that is a member", (pickMember({ ...line, set: any }, undefined) as { key: string }).key === "funds");
ok("fail: left out on a set that does not hold the line's own type: refused, naming the members", /Say which of the set's documents this file is: Baptism record, School record/.test(throws(() => pickMember(line, undefined))));
ok("fail: a member outside the set is refused", /not in the set this line uses/.test(throws(() => pickMember(line, "funds"))));
ok("fail: on a line with no set, another type is refused", /has no substitute set/.test(throws(() => pickMember({ ...line, set: null }, "baptism"))));

// The release check (SA-1B-20 r3): a line naming a missing set is an error, so the combination is not startable.
const snap = { canonical_fields: [], sections: [], placements: [], forms: [], field_maps: [], rules: [], checks: [], derived_fields: [], combination: { key: "x" },
  document_types: [t], document_requirements: [{ lineage: "l1", document_type: "Proof of funds", document_type_key: "funds", who: "principal_applicant", base_or_conditional: "base", condition: null, set_name: "Nope" }] } as unknown as Snapshot;
const errs = (() => { try { return validate(snap, [], []).filter((x: { level: string; message: string }) => x.level === "error").map((x: { message: string }) => x.message); } catch (e) { return [`crash: ${(e as Error).message}`]; } })();
ok("SA-1B-20 r3 fail: the release check names the line and the missing set as an error", errs.includes(`Line "Proof of funds" names set "Nope", which does not exist.`), errs);
const fine = (() => { try { return validate({ ...snap, document_requirements: [{ ...(snap.document_requirements[0] as object), set_name: "Sponsor-funded" }] } as unknown as Snapshot, [], []).filter((x: { message: string }) => /names set/.test(x.message)); } catch (e) { return [(e as Error).message]; } })();
ok("SA-1B-20 r3 pass: a set the type has raises no such error", fine.length === 0, fine);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
