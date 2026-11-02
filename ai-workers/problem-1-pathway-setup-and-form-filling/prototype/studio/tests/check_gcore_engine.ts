// G-CORE B1 (P-253; concept screens/G-CORE-guarded-change/concept.md v2, approved on PR #504): the pure rules check
// R1–R8 and the review tier (engine/change-set.ts), with the engine's own verifiers passed in, as the API does. No
// server, no database, US$0. Every rule and every row of the duplicate and risk tables has a passing and a failing case.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_gcore_engine.ts
import fc from "fast-check";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonical } from "../../contracts/rules.ts";
import type { ChangeItem, MadeBy } from "../contracts/change-set.ts";
import { checkChangeSet, DUPLICATE_SCOPE, MERGE_HOPS_MAX, mergeDepth, RISK_TABLE, riskOf, VALUE_TYPES, type Context, type LibField, type Library } from "../engine/change-set.ts";
import { valueProblems } from "../engine/eligibility-gates.ts";
import { VALUE_TYPE_TO_DATA_TYPE } from "../engine/snapshot.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const V = { valueProblems, canonical: canonical as (t: never) => string };

// Sample library (names are Sample; keys follow the studio's shape).
const field = (key: string, label: string, valueType = "text", extra: Partial<LibField> = {}): LibField => ({ key, group: key.split(".")[0], label, aliases: [], valueType, answerListKey: null, status: "PUBLISHED", mergedInto: null, ...extra });
const lib: Library = {
  fields: [
    field("person.family_name", "Family name", "text", { aliases: ["Surname"] }), field("person.given_name", "Given name"),
    field("person.marital_status", "Marital status", "code", { answerListKey: "marital" }), field("person.age", "Age", "number"),
    field("person.country_of_birth", "Country of birth", "country", { answerListKey: "countries" }), field("person.civil_status", "Civil status", "code", { answerListKey: "marital" }),
    field("case.application_date", "Application date", "date"), field("person.old_name", "Old name", "text", { status: "RETIRED" }),
    field("person.nickname", "Nickname", "text", { status: "DRAFT", mergedInto: "person.given_name" }), field("person.has_children", "Has children", "yes_no"),
  ],
  sections: [{ key: "personal", title: "Personal details", status: "PUBLISHED" }, { key: "travel", title: "Travel history", status: "PUBLISHED" }, { key: "old", title: "Old section", status: "RETIRED" }],
  answerLists: [{ key: "marital", values: ["MARRIED", "SINGLE", "DIVORCED"], status: "PUBLISHED" }, { key: "countries", values: ["CAN", "IND", "FRA"], status: "PUBLISHED" }],
  documentTypes: [{ key: "passport", name: "Passport", proves: "identity", status: "PUBLISHED" }],
};
const ctx = (over: Partial<Context> = {}): Context => ({ library: lib, released: new Set(), derived: new Set(), ...over });
const check = (items: ChangeItem[], c: Context = ctx(), by: MadeBy = "person") => checkChangeSet(items, by, c, V);
const rules = (items: ChangeItem[], c?: Context, by?: MadeBy) => check(items, c, by).map((p) => p.rule);
const src = { kind: "form_box" as const, ref: "IMM 5257 box 1" };

// ───────── R1 type and format
ok("G-CORE R1 pass: a rename to a name of 2 to 80 characters passes", !check([{ action: "rename", kind: "field", key: "person.given_name", name: "First name" }]).length);
ok("G-CORE R1 fail: a one-character name, and an 81-character one, are refused", rules([{ action: "rename", kind: "field", key: "person.given_name", name: "F" }]).includes("R1") && rules([{ action: "rename", kind: "field", key: "person.given_name", name: "x".repeat(81) }]).includes("R1"));
ok("G-CORE R1 fail: a new field with a kind of answer the library does not know is refused", rules([{ action: "accept_proposal", kind: "field", key: "person.x", name: "Height", valueType: "colour", aliases: [], source: src, reason: "No field holds the height" }]).includes("R1"));
ok("G-CORE R1: the engine's kinds of answer are the snapshot's (engine/snapshot.ts VALUE_TYPE_TO_DATA_TYPE)", [...VALUE_TYPES].sort().join() === Object.keys(VALUE_TYPE_TO_DATA_TYPE).sort().join());
// ───────── R2 source and reason
const height: ChangeItem = { action: "accept_proposal", kind: "field", key: "person.height", name: "Height", valueType: "number", aliases: [], source: src, reason: "No field holds the height" };
ok("G-CORE R2 pass: a new item with a source and a reason passes", !check([height]).length, check([height]));
ok("G-CORE R2 fail: a new item with no source, or no reason in words, is refused", rules([{ ...height, source: null }]).includes("R2") && rules([{ ...height, reason: "??" }]).includes("R2"));
// ───────── R3 no exact duplicate: one pass and one fail per row of the table
ok("G-CORE R3 table: every row has a scope in words", Object.keys(DUPLICATE_SCOPE).length === 7 && Object.values(DUPLICATE_SCOPE).every((s) => s.length > 10));
ok("G-CORE R3 field:rename fail: another field's name or alias in the same group is refused, in today's words", (() => { const p = check([{ action: "rename", kind: "field", key: "person.given_name", name: "surname" }]); return p.some((x) => x.rule === "R3" && /is already the name of Family name in this group\. If they mean the same, merge them/.test(x.message)); })());
ok("G-CORE R3 field:rename pass: the same name in another group is allowed (as tests/check_s6_library_sources.ts)", !rules([{ action: "rename", kind: "field", key: "case.application_date", name: "Family name" }]).includes("R3"));
ok("G-CORE R3 field:alias fail and pass: an alias that is another field's name is refused; a new one passes", rules([{ action: "alias", kind: "field", key: "person.given_name", alias: "Family name" }]).includes("R3") && !check([{ action: "alias", kind: "field", key: "person.given_name", alias: "Forename" }]).length);
ok("G-CORE R3 section:rename fail: a retired section's title counts too", check([{ action: "rename", kind: "section", key: "travel", name: "old section" }]).some((p) => p.rule === "R3" && /There is already a section called "Old section"/.test(p.message)));
ok("G-CORE R3 section:rename pass: a title no section has passes", !check([{ action: "rename", kind: "section", key: "travel", name: "Trips abroad" }]).length);
ok("G-CORE R3 field:accept_proposal fail: a new field named like a field in ANY group is refused", rules([{ ...height, key: "case.surname", name: "Surname" }]).includes("R3"));
ok("G-CORE R3 field:accept_proposal pass: a name the library does not have passes", !rules([height]).includes("R3"));
ok("G-CORE R3 section:accept_proposal fail and pass: by title or the proposal's alias; a new title passes",
  rules([{ action: "accept_proposal", kind: "section", key: "s9", name: "Trips", aliases: ["Travel history"], source: src, reason: "No section holds trips" }]).includes("R3") && !rules([{ action: "accept_proposal", kind: "section", key: "s9", name: "Trips", aliases: [], source: src, reason: "No section holds trips" }]).includes("R3"));
ok("G-CORE R3 answer_list:accept_proposal fail and pass: the same codes in any order are a duplicate; other codes are not",
  rules([{ action: "accept_proposal", kind: "answer_list", key: "l9", name: "Status", values: ["single", "MARRIED", "Divorced"], aliases: [], source: src, reason: "From the form's choices" }]).includes("R3") && !rules([{ action: "accept_proposal", kind: "answer_list", key: "l9", name: "Status", values: ["YES", "NO"], aliases: [], source: src, reason: "From the form's choices" }]).includes("R3"));
ok("G-CORE R3 document_type:accept_proposal fail and pass: same name and same proof is a duplicate; another proof is not",
  rules([{ action: "accept_proposal", kind: "document_type", key: "d9", name: "passport", proves: "Identity", aliases: [], source: src, reason: "From the checklist" }]).includes("R3") && !rules([{ action: "accept_proposal", kind: "document_type", key: "d9", name: "Passport", proves: "travel history", aliases: [], source: src, reason: "From the checklist" }]).includes("R3"));
ok("G-CORE R3 fail: two items of one change set giving the same new name are refused", rules([{ action: "rename", kind: "field", key: "person.given_name", name: "First name" }, { action: "rename", kind: "field", key: "person.age", name: "first NAME" }]).includes("R3"));
// ───────── R4 references intact
ok("G-CORE R4 fail: renaming a field not in the library, a retired field, or a merged field is refused",
  ["person.nobody", "person.old_name", "person.nickname"].every((k) => rules([{ action: "rename", kind: "field", key: k, name: "Something new" }]).includes("R4")));
ok("G-CORE R4 pass: a merge of two active fields of one kind and one list passes", !check([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }]).length);
ok("G-CORE R4 fail: a merge of different kinds, or of the same kind with different lists, is refused",
  check([{ action: "merge", kind: "field", key: "person.age", into: "person.given_name" }]).some((p) => p.rule === "R4" && /fields of different kinds are not the same meaning/.test(p.message))
  && check([{ action: "merge", kind: "field", key: "person.country_of_birth", into: "person.marital_status" }]).some((p) => p.rule === "R4"));
ok("G-CORE R4 fail: a condition reading a retired or unknown field is refused", rules([{ action: "set_condition", kind: "condition", key: "person.given_name", target: "question", tree: { op: "eq", field: "person.old_name", value: "x" } }]).includes("R4"));
// SH3 contract (#509, Q1): at most four hops of merged fields.
const chain = (n: number): Library => ({ ...lib, fields: [...lib.fields, field("person.c0", "Chain end", "text"), ...Array.from({ length: n }, (_, k) => field(`person.c${k + 1}`, `Chain ${k + 1}`, "text", { status: "RETIRED", mergedInto: `person.c${k}` })), field("person.keep", "Keep", "text")] });
ok("G-CORE: a merge making a chain of five is refused", (() => { const L = chain(4); return mergeDepth(L.fields, "person.c0") === 4 && check([{ action: "merge", kind: "field", key: "person.c0", into: "person.keep" }], ctx({ library: L })).some((p) => p.rule === "R4" && /a chain of 6 merged fields/.test(p.message)); })());
ok("G-CORE pass: a merge making a chain of four hops (five keys, the resolver's limit) is allowed", MERGE_HOPS_MAX === 4 && !check([{ action: "merge", kind: "field", key: "person.c0", into: "person.keep" }], ctx({ library: chain(3) })).length);
// ───────── R5 conflict (valueProblems, passed in)
const cond = (tree: unknown, key = "person.has_children"): ChangeItem => ({ action: "set_condition", kind: "condition", key, target: "question", tree });
ok("G-CORE R5 pass: a condition of the right type passes", !check([cond({ op: "eq", field: "person.marital_status", value: "MARRIED" })]).length);
ok("G-CORE R5 fail: one fact asked to be two values under \"and\" is refused, in names not codes", (() => { const p = check([cond({ op: "and", args: [{ op: "eq", field: "person.marital_status", value: "MARRIED" }, { op: "eq", field: "person.marital_status", value: "SINGLE" }] })]); return p.some((x) => x.rule === "R5" && /Marital status/.test(x.message) && !/person\.marital_status/.test(x.message)); })());
ok("G-CORE R5 fail: a value of the wrong type is refused", rules([cond({ op: "gt", field: "person.age", value: "ten" })]).includes("R5"));
// ───────── R6 redundancy
ok("G-CORE R6 fail: the same condition already on the target is refused", rules([cond({ op: "eq", field: "person.age", value: 3 })], ctx({ existing: [[{ value: 3, op: "eq", field: "person.age" }]] })).includes("R6"));
ok("G-CORE R6 fail: an \"or\" repeating one of its parts is refused", rules([cond({ op: "or", args: [{ op: "eq", field: "person.age", value: 3 }, { op: "eq", field: "person.age", value: 3 }] })]).includes("R6"));
ok("G-CORE R6 pass: a different condition from the one on the target passes", !rules([cond({ op: "eq", field: "person.age", value: 4 })], ctx({ existing: [[{ op: "eq", field: "person.age", value: 3 }]] })).includes("R6"));
// ───────── R7 a condition that can never be true
ok("G-CORE R7 fail: a value not on the field's list is refused", check([cond({ op: "eq", field: "person.country_of_birth", value: "ATLANTIS" })]).some((p) => p.rule === "R7" && /Country of birth/.test(p.message)));
ok("G-CORE R7 pass: a value on the list passes (any case)", !rules([cond({ op: "in", field: "person.country_of_birth", value: ["can", "IND"] })]).includes("R7"));
// ───────── R8 loop or unreachable: only what this change adds
const loop = "Questions decide each other in a loop: Has children and Age";
ok("G-CORE R8 fail: a new loop on a combination's draft is refused", rules([cond({ op: "eq", field: "person.age", value: 3 })], ctx({ order: [{ before: [], after: [loop] }] })).includes("R8"));
ok("G-CORE R8 pass: a loop that was already there is not this change's", !rules([cond({ op: "eq", field: "person.age", value: 3 })], ctx({ order: [{ before: [loop], after: [loop] }] })).includes("R8"));
// ───────── Merge rewrites (challenge M4): R5–R7 on every condition the swap rewrites
const rw = (before: unknown, after: unknown) => ctx({ rewrites: [[{ where: "Check k1 on Visitor visa", before, after }]] });
ok("G-CORE: a merge that would make a condition never true is refused", (() => {
  const before = { op: "and", args: [{ op: "eq", field: "person.civil_status", value: "SINGLE" }, { op: "eq", field: "person.marital_status", value: "MARRIED" }] };
  const after = { op: "and", args: [{ op: "eq", field: "person.marital_status", value: "SINGLE" }, { op: "eq", field: "person.marital_status", value: "MARRIED" }] };
  return check([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }], rw(before, after)).some((p) => p.rule === "R5" && /Check k1 on Visitor visa/.test(p.message));
})());
ok("G-CORE pass: a merge whose rewritten conditions stay sound passes", !check([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }], rw({ op: "eq", field: "person.civil_status", value: "SINGLE" }, { op: "eq", field: "person.marital_status", value: "SINGLE" })).length);

// ───────── Review by risk: one pass and one fail per row (table-driven)
const item = (k: string): ChangeItem => { const [kind, action] = k.split(":"); return { action, kind, key: "person.given_name", name: "First name", alias: "Forename", into: "person.family_name", target: "question", tree: {}, aliases: [] } as unknown as ChangeItem; };
for (const [k, row] of Object.entries(RISK_TABLE)) ok(`G-CORE tier ${k}: ${row.tier} for a person, nothing raising it`, riskOf([item(k)], "person", new Set()).tier === row.tier);
ok("G-CORE tier: a rename of a field a released combination uses needs a second person (P-266)", (() => { const t = riskOf([item("field:rename")], "person", new Set(["field:person.given_name"])); return t.tier === "second_person" && t.why.some((w) => /P-266/.test(w)); })());
ok("G-CORE tier: a rename of a field no release uses stays direct and logged (P-96)", riskOf([item("field:rename")], "person", new Set(["field:person.other"])).tier === "direct");
ok("G-CORE tier: an AI change is never direct, even wording", riskOf([item("field:alias")], "ai", new Set()).tier === "second_person");
ok("G-CORE tier: the expert signs conditions and AI items at release, as today; a person's rename has no expert step", riskOf([item("condition:set_condition")], "person", new Set()).expert_at_release && riskOf([item("field:accept_proposal")], "ai", new Set()).expert_at_release && !riskOf([item("field:rename")], "person", new Set()).expert_at_release);
ok("G-CORE tier: the set's tier is its riskiest item's", riskOf([item("field:rename"), item("field:merge")], "person", new Set()).tier === "second_person");
ok("G-CORE tier: the words say who acts next", /second person/.test(riskOf([item("field:merge")], "person", new Set()).words) && /immigration expert signs it at release/.test(riskOf([item("condition:set_condition")], "person", new Set()).words));

// ───────── Person and AI: the same check for the same action and items
ok("G-CORE: a person and the AI get the same check for the same items (only the tier differs)", JSON.stringify(check([height, cond({ op: "eq", field: "person.age", value: "x" })], ctx(), "person")) === JSON.stringify(check([height, cond({ op: "eq", field: "person.age", value: "x" })], ctx(), "ai")));

// ───────── STANDARDS §7 properties
const prop = (name: string, p: fc.IProperty<unknown[]>) => { let err = ""; try { fc.assert(p, { numRuns: 200 }); } catch (e) { err = String(e).slice(0, 300); } ok(name, !err, err); };
const anyItem = fc.oneof(
  fc.record({ action: fc.constant("rename" as const), kind: fc.constantFrom("field" as const, "section" as const), key: fc.constantFrom("person.given_name", "person.age", "travel", "personal", "nobody"), name: fc.constantFrom("First name", "Surname", "Travel history", "x", "Trips") }),
  fc.record({ action: fc.constant("merge" as const), kind: fc.constant("field" as const), key: fc.constantFrom("person.civil_status", "person.age"), into: fc.constantFrom("person.marital_status", "person.given_name") }),
  fc.record({ action: fc.constant("set_condition" as const), kind: fc.constant("condition" as const), key: fc.constant("person.has_children"), target: fc.constant("question" as const), tree: fc.constantFrom({ op: "eq", field: "person.age", value: 1 }, { op: "eq", field: "person.country_of_birth", value: "XX" }) }),
);
prop("G-CORE property: the check never changes its input", fc.property(fc.array(anyItem, { maxLength: 6 }), (items) => { const before = JSON.stringify([items, lib]); check(items as ChangeItem[]); return JSON.stringify([items, lib]) === before; }));
prop("G-CORE property: the problems found do not depend on the order of the items (apart from which copy a within-set duplicate names)", fc.property(fc.array(anyItem, { maxLength: 6 }), (items) => {
  const key = (ps: { rule: string; item: number; message: string }[], its: unknown[]) => ps.filter((p) => !/is given twice/.test(p.message)).map((p) => `${p.rule}|${JSON.stringify(its[p.item])}|${p.message}`).sort().join("\n");
  const rev = [...items].reverse();
  return key(check(items as ChangeItem[]), items) === key(check(rev as ChangeItem[]), rev);
}));
prop("G-CORE property: the tier only rises when items are added", fc.property(fc.array(anyItem, { minLength: 1, maxLength: 4 }), anyItem, (items, extra) => {
  const rank = (t: string) => (t === "direct" ? 0 : 1);
  return rank(riskOf([...items, extra] as ChangeItem[], "person", new Set()).tier) >= rank(riskOf(items as ChangeItem[], "person", new Set()).tier);
}));

// ───────── P-249: the engine module is lift-ready (every import, multi-line or dynamic, read)
const importsOf = (code: string) => [...code.matchAll(/\bfrom\s+"([^"]+)"|\bimport\s*\(\s*["']([^"']+)["']|^\s*import\s+"([^"]+)"/gm)].map((m) => m[1] ?? m[2] ?? m[3]);
const engineSrc = readFileSync(join(import.meta.dirname, "..", "engine", "change-set.ts"), "utf8");
ok("G-CORE P-249 pass: engine/change-set.ts imports only the label rule, its contract and SH2's pure module", importsOf(engineSrc).sort().join() === ["../contracts/change-set.ts", "../contracts/programs.ts", "./where-used.ts"].join() && !/\brequire\s*\(/.test(engineSrc), importsOf(engineSrc));
ok("G-CORE P-249 fail: importing validate.ts (it reads files at load) would be caught", !(importsOf(engineSrc + '\nimport { askedInOrder } from "./validate.ts";\n').sort().join() === ["../contracts/change-set.ts", "../contracts/programs.ts", "./where-used.ts"].join()));

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
