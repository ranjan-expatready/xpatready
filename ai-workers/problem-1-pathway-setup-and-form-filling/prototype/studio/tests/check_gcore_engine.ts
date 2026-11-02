// G-CORE B1 (P-253; concept screens/G-CORE-guarded-change/concept.md v2, approved on PR #504): the pure rules check
// R1–R8 and the review tier (engine/change-set.ts), with the engine's own verifiers passed in, as the API does. No
// server, no database, US$0. Every rule and every row of the duplicate and risk tables has a passing and a failing case.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_gcore_engine.ts
import fc from "fast-check";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonical, validatePredicate } from "../../contracts/rules.ts";
import type { ChangeItem, MadeBy } from "../contracts/change-set.ts";
import { checkChangeSet, DUPLICATE_SCOPE, EXPERT_TARGETS, listId, MERGE_HOPS_MAX, mergeDepth, PROBLEMS_MAX, RISK_TABLE, riskOf, TREE_MAX, VALUE_TYPES, type Context, type LibField, type Library } from "../engine/change-set.ts";
import { valueProblems } from "../engine/eligibility-gates.ts";
import { VALUE_TYPE_TO_DATA_TYPE } from "../engine/snapshot.ts";
import { isNode } from "../engine/validate.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const V = { valueProblems, canonical: canonical as (t: never) => string, shape: (t: unknown) => validatePredicate(t, isNode) };

// Sample library (names are Sample; keys follow the studio's shape).
const field = (key: string, label: string, valueType = "text", extra: Partial<LibField> = {}): LibField => { const f = { key, group: key.split(".")[0], label, aliases: [] as string[], valueType, answerListKey: null as string | null, status: "PUBLISHED", mergedInto: null as string | null, names: [] as string[], ...extra }; return { ...f, names: extra.names ?? ((f.status === "DRAFT" || f.status === "PUBLISHED") && !f.mergedInto ? [label, ...f.aliases] : []) }; };
const section = (key: string, title: string, status = "PUBLISHED") => ({ key, title, status, liveTitles: status === "RETIRED" ? [] : [title] });
const list = (key: string, values: string[]) => ({ key, values, status: "PUBLISHED", liveIds: [listId(values)] });
const lib: Library = {
  fields: [
    field("person.family_name", "Family name", "text", { aliases: ["Surname"] }), field("person.given_name", "Given name"),
    field("person.marital_status", "Marital status", "code", { answerListKey: "marital" }), field("person.age", "Age", "number"),
    field("person.country_of_birth", "Country of birth", "country", { answerListKey: "countries" }), field("person.civil_status", "Civil status", "code", { answerListKey: "marital" }),
    field("case.application_date", "Application date", "date"), field("person.old_name", "Old name", "text", { status: "RETIRED" }),
    field("person.nickname", "Nickname", "text", { status: "DRAFT", mergedInto: "person.given_name" }), field("person.has_children", "Has children", "yes_no"),
    // A draft rename over a published name: both names are live (review B1 M1).
    field("person.full_name", "Whole name (draft)", "text", { status: "DRAFT", names: ["Whole name (draft)", "Full Name"] }),
    field("person.eye_colour", "Eye colour", "code", { answerListKey: "colours" }),
  ],
  sections: [section("personal", "Personal details"), section("travel", "Travel history"), section("old", "Old section", "RETIRED")],
  answerLists: [list("marital", ["MARRIED", "SINGLE", "DIVORCED"]), list("countries", ["CAN", "IND", "FRA"]), list("colours", ["BLUE", "GREEN"]), list("riding", ["YES", "NO", "MAYBE"])],
  documentTypes: [{ key: "passport", name: "Passport", proves: "identity", status: "PUBLISHED", liveIds: ["passport|identity"] }],
};
const ctx = (over: Partial<Context> = {}): Context => ({ library: lib, released: new Set(), derived: new Set(), ...over });
const check = (items: ChangeItem[], c: Context = ctx(), by: MadeBy = "person") => checkChangeSet(items, by, c, V);
const rules = (items: ChangeItem[], c?: Context, by?: MadeBy) => check(items, c, by).map((p) => p.rule);
const src = { kind: "form_box" as const, ref: "IMM 5257 box 1" };
const root = (t: object) => ({ subjectKind: "PERSON", ...t });
const cond = (tree: object, key = "person.has_children"): ChangeItem => ({ action: "set_condition", kind: "condition", key, target: "question", tree: root(tree) });

// ───────── R1 type and format
ok("G-CORE R1 pass: a rename to a name of 2 to 80 characters passes", !check([{ action: "rename", kind: "field", key: "person.given_name", name: "First name" }]).length);
ok("G-CORE R1 fail: a one-character name, and an 81-character one, are refused", rules([{ action: "rename", kind: "field", key: "person.given_name", name: "F" }]).includes("R1") && rules([{ action: "rename", kind: "field", key: "person.given_name", name: "x".repeat(81) }]).includes("R1"));
ok("G-CORE R1 pass: a rename to \"12\" is allowed, as today's door allows it (2 to 80 characters)", !check([{ action: "rename", kind: "field", key: "person.given_name", name: "12" }]).length);
ok("G-CORE R1 fail: a new item named \"12\" is refused (a new item's name has a letter)", check([{ ...({ action: "accept_proposal", kind: "field", key: "person.h", valueType: "number", aliases: [], source: { kind: "form_box", ref: "IMM 5257 box 1" }, reason: "No field holds it" } as const), name: "12" }]).some((p) => p.rule === "R1" && /at least one letter/.test(p.message)));
ok("G-CORE R1 fail: a name with a direction-override or zero-width character is refused (breaker minor)", ["\u202eeman ylimaF", "Family\u200bname"].every((n) => check([{ action: "rename", kind: "field", key: "person.given_name", name: n }]).some((p) => p.rule === "R1" && /invisible or direction/.test(p.message))));
ok("G-CORE R1 fail: a key that is not a library key is refused (breaker M8)", check([{ action: "rename", kind: "field", key: "Bad Key!! <script>", name: "Fine name" }]).some((p) => p.rule === "R1" && /lower-case words/.test(p.message)));
ok("G-CORE R1 fail: a condition outside the closed vocabulary is refused, never crashing (breaker M1, M2)", [{ op: "and", args: 5 }, {}, "ab", { length: 2 }, { op: "bogus" }, { op: "not", arg: 5 }, [], { op: "in", field: "person.age", value: "abc" }].every((t) => { const p = check([{ action: "set_condition", kind: "condition", key: "person.has_children", target: "question", tree: typeof t === "object" && !Array.isArray(t) ? root(t) : t }]); return p.some((x) => x.rule === "R1"); }));
ok("G-CORE R1 fail: a condition deeper than the limit is refused before any verifier runs (a 10 000-deep \"not\" chain)", (() => { let t: object = { op: "eq", field: "person.age", value: 1 }; for (let k = 0; k < 10_000; k++) t = { op: "not", arg: t }; const p = check([{ action: "set_condition", kind: "condition", key: "person.has_children", target: "question", tree: root(t) }]); return TREE_MAX.depth === 12 && p.length === 1 && p[0].rule === "R1"; })());
ok("G-CORE R1 pass: a condition at the depth limit is read", !check([cond((() => { let t: object = { op: "eq", field: "person.age", value: 1 }; for (let k = 0; k < TREE_MAX.depth - 1; k++) t = { op: "not", arg: t }; return t; })())]).some((p) => p.rule === "R1"));
ok("G-CORE R1 fail: a condition on a form line, document line, rule or check is not this check's yet (breaker M5)", (["form_line", "document_line", "rule", "check"] as const).every((target) => check([{ action: "set_condition", kind: "condition", key: "person.has_children", target, tree: root({ op: "eq", field: "person.age", value: 1 }) }]).some((p) => p.rule === "R1" && /own page/.test(p.message))));
ok("G-CORE R1 fail: a new field with a kind of answer the library does not know is refused", rules([{ action: "accept_proposal", kind: "field", key: "person.x", name: "Height", valueType: "colour", aliases: [], source: src, reason: "No field holds the height" }]).includes("R1"));
ok("G-CORE R1: the engine's kinds of answer are the snapshot's (engine/snapshot.ts VALUE_TYPE_TO_DATA_TYPE)", [...VALUE_TYPES].sort().join() === Object.keys(VALUE_TYPE_TO_DATA_TYPE).sort().join());
// ───────── R2 source and reason
const height: ChangeItem = { action: "accept_proposal", kind: "field", key: "person.height", name: "Height", valueType: "number", aliases: [], source: src, reason: "No field holds the height" };
ok("G-CORE R2 pass: a new item with a source and a reason passes", !check([height]).length, check([height]));
ok("G-CORE R2 fail: a new item with no source, or no reason in words, is refused", rules([{ ...height, source: null }]).includes("R2") && rules([{ ...height, reason: "??" }]).includes("R2"));
// ───────── R3 no exact duplicate: one pass and one fail per row of the table
ok("G-CORE R3 table: every row has a scope in words", Object.keys(DUPLICATE_SCOPE).length === 7 && Object.values(DUPLICATE_SCOPE).every((s) => s.length > 10));
ok("G-CORE R3 field:rename fail: another field's name or alias in the same group is refused, in today's words", (() => { const p = check([{ action: "rename", kind: "field", key: "person.given_name", name: "surname" }]); return p.some((x) => x.rule === "R3" && /is already the name of Family name in this group\. If they mean the same, merge them/.test(x.message)); })());
ok("G-CORE R3 field:rename fail: an older live version's name counts (a draft rename over a published name, review B1 M1)", check([{ action: "rename", kind: "field", key: "person.given_name", name: "full name" }]).some((p) => p.rule === "R3"));
ok("G-CORE R3 field:accept_proposal fail: an older live version's name counts for the AI too", rules([{ ...height, key: "person.fn", name: "Full Name" }]).includes("R3"));
ok("G-CORE R3 field:rename pass: the same name in another group is allowed (as tests/check_s6_library_sources.ts)", !rules([{ action: "rename", kind: "field", key: "case.application_date", name: "Family name" }]).includes("R3"));
ok("G-CORE R3 field:alias fail and pass: an alias that is another field's name is refused; a new one passes", rules([{ action: "alias", kind: "field", key: "person.given_name", alias: "Family name" }]).includes("R3") && !check([{ action: "alias", kind: "field", key: "person.given_name", alias: "Forename" }]).length);
ok("G-CORE R3 section:rename fail: a retired section's title counts too", check([{ action: "rename", kind: "section", key: "travel", name: "old section" }]).some((p) => p.rule === "R3" && /There is already a section called "Old section"/.test(p.message)));
ok("G-CORE R3 section:rename pass: a title no section has passes", !check([{ action: "rename", kind: "section", key: "travel", name: "Trips abroad" }]).length);
ok("G-CORE R3 field:accept_proposal fail: a new field named like a field in ANY group is refused", rules([{ ...height, key: "case.surname", name: "Surname" }]).includes("R3"));
ok("G-CORE R3 field:accept_proposal pass: a name the library does not have passes", !rules([height]).includes("R3"));
ok("G-CORE R3 section:accept_proposal fail and pass: by title or the proposal's alias; a new title passes",
  rules([{ action: "accept_proposal", kind: "section", key: "s9", name: "Trips", aliases: ["Travel history"], source: src, reason: "No section holds trips" }]).includes("R3") && !rules([{ action: "accept_proposal", kind: "section", key: "s9", name: "Trips", aliases: [], source: src, reason: "No section holds trips" }]).includes("R3"));
ok("G-CORE R3 answer_list:accept_proposal fail and pass: the same codes in any order are a duplicate; other codes are not",
  rules([{ action: "accept_proposal", kind: "answer_list", key: "l9", name: "Status", values: ["SINGLE", "MARRIED", "DIVORCED", "SINGLE"], aliases: [], source: src, reason: "From the form's choices" }]).includes("R3") && !rules([{ action: "accept_proposal", kind: "answer_list", key: "l9", name: "Status", values: ["YES", "NO"], aliases: [], source: src, reason: "From the form's choices" }]).includes("R3"));
ok("G-CORE R3 answer_list: codes are matched exactly, as proposals.ts listIdentity does (other case is another list)", !rules([{ action: "accept_proposal", kind: "answer_list", key: "l9", name: "Status", values: ["single", "married", "divorced"], aliases: [], source: src, reason: "From the form's choices" }]).includes("R3"));
const ridingItem: ChangeItem = { action: "accept_proposal", kind: "answer_list", key: "l8", name: "Answer", values: ["MAYBE", "NO", "YES"], aliases: [], source: src, reason: "From the form's choices" };
ok("G-CORE R3 answer_list fail and pass: a list riding with a draft field is not reusable, so not a duplicate (proposals.ts ridingLists)", rules([ridingItem]).includes("R3") && !rules([ridingItem], ctx({ riding: new Set(["riding"]) })).includes("R3"));
ok("G-CORE R3 document_type:accept_proposal fail and pass: same name and same proof is a duplicate; another proof is not",
  rules([{ action: "accept_proposal", kind: "document_type", key: "d9", name: "passport", proves: "Identity", aliases: [], source: src, reason: "From the checklist" }]).includes("R3") && !rules([{ action: "accept_proposal", kind: "document_type", key: "d9", name: "Passport", proves: "travel history", aliases: [], source: src, reason: "From the checklist" }]).includes("R3"));
ok("G-CORE R3 fail: two items of one change set giving the same new name in one group are refused", rules([{ action: "rename", kind: "field", key: "person.given_name", name: "First name" }, { action: "rename", kind: "field", key: "person.age", name: "first NAME" }]).includes("R3"));
ok("G-CORE R3 pass: the same new name in two different groups in one set is allowed, as each alone (review m5)", !rules([{ action: "rename", kind: "field", key: "person.given_name", name: "Start date" }, { action: "rename", kind: "field", key: "case.application_date", name: "Start date" }]).includes("R3"));
// Breaker M3: one change per item in a set (cycles, chains the hop limit would not see, a merge plus a rename).
const both = (items: ChangeItem[]) => check(items).some((p) => p.rule === "R4" && /one change per item/.test(p.message));
ok("G-CORE R4 fail: A into B plus B into A in one set (a cycle) is refused", both([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }, { action: "merge", kind: "field", key: "person.marital_status", into: "person.civil_status" }]));
ok("G-CORE R4 fail: A into B plus B into C (a chain) and A into B plus A into C are refused", both([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }, { action: "merge", kind: "field", key: "person.marital_status", into: "person.eye_colour" }]) && both([{ action: "merge", kind: "field", key: "person.given_name", into: "person.family_name" }, { action: "merge", kind: "field", key: "person.given_name", into: "person.full_name" }]));
ok("G-CORE R4 fail: a merge plus a rename of the same field, and two renames of one field, are refused", both([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }, { action: "rename", kind: "field", key: "person.civil_status", name: "Status now" }]) && both([{ action: "rename", kind: "field", key: "person.age", name: "Age now" }, { action: "rename", kind: "field", key: "person.age", name: "Age today" }]));
ok("G-CORE R4 pass: changes to different items in one set are allowed", !both([{ action: "rename", kind: "field", key: "person.age", name: "Age now" }, { action: "rename", kind: "field", key: "person.given_name", name: "Forename" }]));
// ───────── R4 references intact
ok("G-CORE R4 fail: renaming a field not in the library, a retired field, or a merged field is refused",
  ["person.nobody", "person.old_name", "person.nickname"].every((k) => rules([{ action: "rename", kind: "field", key: k, name: "Something new" }]).includes("R4")));
ok("G-CORE R4 pass: a merge of two active fields of one kind and one list passes", !check([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }]).length);
ok("G-CORE R4 fail: a merge of different kinds, or of the same kind with different lists, is refused",
  check([{ action: "merge", kind: "field", key: "person.age", into: "person.given_name" }]).some((p) => p.rule === "R4" && /fields of different kinds are not the same meaning/.test(p.message))
  && check([{ action: "merge", kind: "field", key: "person.country_of_birth", into: "person.marital_status" }]).some((p) => p.rule === "R4"));
ok("G-CORE R4 fail: a condition reading a retired field is refused", rules([cond({ op: "eq", field: "person.old_name", value: "x" })]).includes("R4"));
ok("G-CORE R4 fail: a condition reading a field not in the library is refused", check([cond({ op: "eq", field: "person.no_such", value: "x" })]).some((p) => p.rule === "R4" && /not in the library/.test(p.message)));
ok("G-CORE R4 fail: merging a field into itself is refused", check([{ action: "merge", kind: "field", key: "person.age", into: "person.age" }]).some((p) => p.rule === "R4" && /two different fields/.test(p.message)));
ok("G-CORE R4 fail: merging into a retired or a merged field is refused", ["person.old_name", "person.nickname"].every((k) => check([{ action: "merge", kind: "field", key: "person.given_name", into: k }]).some((p) => p.rule === "R4" && /not an active field/.test(p.message))));
ok("G-CORE R4 fail: merging two choice fields with different lists is refused (same kind, other list)", check([{ action: "merge", kind: "field", key: "person.eye_colour", into: "person.marital_status" }]).some((p) => p.rule === "R4" && /different lists of choices/.test(p.message)));
ok("G-CORE R4 fail: a new item on a key already in the library is refused (breaker M8)", check([{ ...height, key: "person.family_name", name: "Height" }]).some((p) => p.rule === "R4" && /already taken/.test(p.message)));
ok("G-CORE R4 fail: a condition on a question no section asks is refused", check([cond({ op: "eq", field: "person.age", value: 3 })], ctx({ existing: [null] })).some((p) => p.rule === "R4" && /nowhere to go/.test(p.message)));
// SH3 contract (#509, Q1): at most four hops of merged fields.
const chain = (n: number): Library => ({ ...lib, fields: [...lib.fields, field("person.c0", "Chain end", "text"), ...Array.from({ length: n }, (_, k) => field(`person.c${k + 1}`, `Chain ${k + 1}`, "text", { status: "RETIRED", mergedInto: `person.c${k}` })), field("person.keep", "Keep", "text")] });
ok("G-CORE: a merge making a chain of five is refused", (() => { const L = chain(4); return mergeDepth(L.fields, "person.c0") === 4 && check([{ action: "merge", kind: "field", key: "person.c0", into: "person.keep" }], ctx({ library: L })).some((p) => p.rule === "R4" && /a chain of 5 merges; at most 4 are followed/.test(p.message)); })());
ok("G-CORE pass: a merge making a chain of four hops (five keys, the resolver's limit) is allowed", MERGE_HOPS_MAX === 4 && !check([{ action: "merge", kind: "field", key: "person.c0", into: "person.keep" }], ctx({ library: chain(3) })).length);
// ───────── R5 conflict (valueProblems, passed in)
ok("G-CORE R5 pass: a condition of the right type passes", !check([cond({ op: "eq", field: "person.marital_status", value: "MARRIED" })]).length);
ok("G-CORE R5 fail: one fact asked to be two values under \"and\" is refused, in names not codes", (() => { const p = check([cond({ op: "and", args: [{ op: "eq", field: "person.marital_status", value: "MARRIED" }, { op: "eq", field: "person.marital_status", value: "SINGLE" }] })]); return p.some((x) => x.rule === "R5" && /Marital status/.test(x.message) && !/person\.marital_status/.test(x.message)); })());
ok("G-CORE R5 fail: a value of the wrong type is refused", rules([cond({ op: "gt", field: "person.age", value: "ten" })]).includes("R5"));
// ───────── R6 redundancy
ok("G-CORE R6 fail: the same condition already on the target is refused", rules([cond({ op: "eq", field: "person.age", value: 3 })], ctx({ existing: [[root({ value: 3, op: "eq", field: "person.age" })]] })).includes("R6"));
ok("G-CORE R6 fail: an \"or\" repeating one of its parts is refused", rules([cond({ op: "or", args: [{ op: "eq", field: "person.age", value: 3 }, { op: "eq", field: "person.age", value: 3 }] })]).includes("R6"));
ok("G-CORE R6 pass: a different condition from the one on the target passes", !rules([cond({ op: "eq", field: "person.age", value: 4 })], ctx({ existing: [[root({ op: "eq", field: "person.age", value: 3 })]] })).includes("R6"));
// ───────── R7 a condition that can never be true
ok("G-CORE R7 fail: a value not on the field's list is refused", check([cond({ op: "eq", field: "person.country_of_birth", value: "ATLANTIS" })]).some((p) => p.rule === "R7" && /Country of birth/.test(p.message)));
ok("G-CORE R7 pass: values on the list pass", !rules([cond({ op: "in", field: "person.country_of_birth", value: ["CAN", "IND"] })]).includes("R7"));
ok("G-CORE R7 fail: codes are compared exactly, as the evaluator does (\"can\" is never CAN)", rules([cond({ op: "eq", field: "person.country_of_birth", value: "can" })]).includes("R7"));
ok("G-CORE R7 pass: \"is not\" with a value off the list is always true, so it is not R7 (review m3)", !rules([cond({ op: "neq", field: "person.country_of_birth", value: "ATLANTIS" })]).includes("R7"));
ok("G-CORE R7 pass: \"is one of\" with one value on the list can be true", !rules([cond({ op: "in", field: "person.country_of_birth", value: ["CAN", "ATLANTIS"] })]).includes("R7"));
// ───────── R8 loop or unreachable: only what this change adds
const loop = "Questions decide each other in a loop: Has children and Age";
ok("G-CORE R8 fail: a new loop on a combination's draft is refused, naming the combination", check([cond({ op: "eq", field: "person.age", value: 3 })], ctx({ order: [[{ combination: "Visitor visa", before: [], after: [loop] }]] })).some((p) => p.rule === "R8" && /Visitor visa/.test(p.message)));
ok("G-CORE R8 pass: a loop that was already there is not this change's", !rules([cond({ op: "eq", field: "person.age", value: 3 })], ctx({ order: [[{ combination: "Visitor visa", before: [loop], after: [loop] }]] })).includes("R8"));
ok("G-CORE R8 fail: a new loop on combination B is not hidden by the same loop already on A (review m4)", rules([cond({ op: "eq", field: "person.age", value: 3 })], ctx({ order: [[{ combination: "A", before: [loop], after: [loop] }, { combination: "B", before: [], after: [loop] }]] })).includes("R8"));
ok("G-CORE R8 fail: a merge that makes a question decide itself is refused (review B1 M3: R8 runs on a merge)", rules([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }], ctx({ order: [[{ combination: "Visitor visa", before: [], after: [loop] }]] })).includes("R8"));
// ───────── Merge rewrites (challenge M4): R5–R7 on every condition the swap rewrites
const rw = (before: unknown, after: unknown) => ctx({ rewrites: [[{ where: "Check k1 on Visitor visa", before, after }]] });
ok("G-CORE: a merge that would make a condition never true is refused", (() => {
  const before = root({ op: "and", args: [{ op: "eq", field: "person.civil_status", value: "SINGLE" }, { op: "eq", field: "person.marital_status", value: "MARRIED" }] });
  const after = root({ op: "and", args: [{ op: "eq", field: "person.marital_status", value: "SINGLE" }, { op: "eq", field: "person.marital_status", value: "MARRIED" }] });
  return check([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }], rw(before, after)).some((p) => p.rule === "R5" && /Check k1 on Visitor visa/.test(p.message));
})());
ok("G-CORE pass: a merge whose rewritten conditions stay sound passes", !check([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }], rw(root({ op: "eq", field: "person.civil_status", value: "SINGLE" }), root({ op: "eq", field: "person.marital_status", value: "SINGLE" }))).length);
ok("G-CORE pass: a problem the condition already had before the merge is not the merge's (only new problems count)", (() => {
  const bad = (f: string) => root({ op: "and", args: [{ op: "eq", field: "person.age", value: 1 }, { op: "eq", field: "person.age", value: 2 }, { op: "eq", field: f, value: "SINGLE" }] });
  return !check([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }], rw(bad("person.civil_status"), bad("person.marital_status"))).length;
})());

// ───────── Review by risk: one pass and one fail per row (table-driven)
const item = (k: string): ChangeItem => { const [kind, action] = k.split(":"); return { action, kind, key: "person.given_name", name: "First name", alias: "Forename", into: "person.family_name", target: "question", tree: {}, aliases: [] } as unknown as ChangeItem; };
for (const [k, row] of Object.entries(RISK_TABLE)) ok(`G-CORE tier ${k}: ${row.tier} for a person, nothing raising it`, riskOf([item(k)], "person", new Set()).tier === row.tier);
ok("G-CORE tier: a rename of a field a released combination uses needs a second person (P-266)", (() => { const t = riskOf([item("field:rename")], "person", new Set(["field:person.given_name"])); return t.tier === "second_person" && t.why.some((w) => /P-266/.test(w)); })());
ok("G-CORE tier: a rename of a field no release uses stays direct and logged (P-96)", riskOf([item("field:rename")], "person", new Set(["field:person.other"])).tier === "direct");
ok("G-CORE tier: an AI change is never direct, even wording", riskOf([item("field:alias")], "ai", new Set()).tier === "second_person");
const condOn = (target: string) => ({ action: "set_condition", kind: "condition", key: "person.x", target, tree: {} }) as unknown as ChangeItem;
ok("G-CORE tier: the expert signs a rule, document line, check or form-line condition, and AI items, at release, as today (validate.ts needs_sme)", [...EXPERT_TARGETS].every((t) => riskOf([condOn(t)], "person", new Set()).expert_at_release) && riskOf([item("field:accept_proposal")], "ai", new Set()).expert_at_release);
ok("G-CORE tier: a person's question condition and a person's rename have no expert step (review B1 M5)", !riskOf([condOn("question")], "person", new Set()).expert_at_release && !riskOf([item("field:rename")], "person", new Set()).expert_at_release);
ok("G-CORE tier: the AI's question condition does have it (an AI-made item)", riskOf([condOn("question")], "ai", new Set()).expert_at_release);
ok("G-CORE tier: the set's tier is its riskiest item's", riskOf([item("field:rename"), item("field:merge")], "person", new Set()).tier === "second_person");
ok("G-CORE tier: the words say who acts next", /second person/.test(riskOf([item("field:merge")], "person", new Set()).words) && /immigration expert signs it at release/.test(riskOf([condOn("rule")], "person", new Set()).words));
ok("G-CORE: one check returns at most PROBLEMS_MAX problems", check(Array.from({ length: 50 }, (_, k) => ({ action: "rename", kind: "field", key: `person.nobody_${k}`, name: "x" }) as ChangeItem)).length <= PROBLEMS_MAX && PROBLEMS_MAX === 200);

// ───────── Person and AI: the same check for the same action and items
ok("G-CORE: a person and the AI get the same check for the same items (only the tier differs)", JSON.stringify(check([height, cond({ op: "eq", field: "person.age", value: "x" })], ctx(), "person")) === JSON.stringify(check([height, cond({ op: "eq", field: "person.age", value: "x" })], ctx(), "ai")));

// ───────── STANDARDS §7 properties
const prop = (name: string, p: fc.IProperty<unknown[]>) => { let err = ""; try { fc.assert(p, { numRuns: 200 }); } catch (e) { err = String(e).slice(0, 300); } ok(name, !err, err); };
const anyItem = fc.oneof(
  fc.record({ action: fc.constant("rename" as const), kind: fc.constantFrom("field" as const, "section" as const), key: fc.constantFrom("person.given_name", "person.age", "travel", "personal", "nobody"), name: fc.constantFrom("First name", "Surname", "Travel history", "x", "Trips") }),
  fc.record({ action: fc.constant("merge" as const), kind: fc.constant("field" as const), key: fc.constantFrom("person.civil_status", "person.age"), into: fc.constantFrom("person.marital_status", "person.given_name") }),
  fc.record({ action: fc.constant("set_condition" as const), kind: fc.constant("condition" as const), key: fc.constant("person.has_children"), target: fc.constant("question" as const), tree: fc.constantFrom(root({ op: "eq", field: "person.age", value: 1 }), root({ op: "eq", field: "person.country_of_birth", value: "XX" })) }),
);
prop("G-CORE property: the check never changes its input", fc.property(fc.array(anyItem, { maxLength: 6 }), (items) => { const before = JSON.stringify([items, lib]); check(items as ChangeItem[]); return JSON.stringify([items, lib]) === before; }));
prop("G-CORE property: the problems found do not depend on the order of the items (apart from which copy a within-set duplicate names)", fc.property(fc.array(anyItem, { maxLength: 6 }), (items) => {
  const key = (ps: { rule: string; item: number; message: string }[], its: unknown[]) => ps.filter((p) => !/is given twice|one change per item/.test(p.message)).map((p) => `${p.rule}|${JSON.stringify(its[p.item])}|${p.message}`).sort().join("\n");
  const rev = [...items].reverse();
  return key(check(items as ChangeItem[]), items) === key(check(rev as ChangeItem[]), rev);
}));
prop("G-CORE property: the tier only rises when items are added", fc.property(fc.array(anyItem, { minLength: 1, maxLength: 4 }), anyItem, (items, extra) => {
  const rank = (t: string) => (t === "direct" ? 0 : 1);
  return rank(riskOf([...items, extra] as ChangeItem[], "person", new Set()).tier) >= rank(riskOf(items as ChangeItem[], "person", new Set()).tier);
}));

// ───────── P-249: the engine module is lift-ready, through its whole import chain (review m8: the scan follows imports)
const importsOf = (code: string) => [...code.replace(/^\s*import\s+type\b[^;]*;/gm, "").matchAll(/\bfrom\s+"([^"]+)"|\bimport\s*\(\s*["']([^"']+)["']|^\s*import\s+"([^"]+)"/gm)].map((m) => m[1] ?? m[2] ?? m[3]);
/** Every file the module loads (type-only imports load nothing), and every outside package it loads. */
function importChain(file: string, seen = new Map<string, string[]>()): Map<string, string[]> {
  if (seen.has(file)) return seen;
  const code = readFileSync(file, "utf8"), imps = importsOf(code);
  seen.set(file, [...imps, ...(/\brequire\s*\(/.test(code) ? ["require()"] : [])]);
  for (const i of imps) if (i.startsWith(".")) importChain(join(file, "..", i), seen);
  return seen;
}
const PURE_OUTSIDE = new Set(["zod"]);
const outside = (m: Map<string, string[]>) => [...m.values()].flat().filter((i) => !i.startsWith(".") && !PURE_OUTSIDE.has(i));
const files = importChain(join(import.meta.dirname, "..", "engine", "change-set.ts"));
ok("G-CORE P-249 pass: engine/change-set.ts and everything it loads import no database, framework, file or vendor module", outside(files).length === 0 && files.size >= 3, { outside: outside(files), files: [...files.keys()].map((f) => f.split("/studio/")[1]) });
ok("G-CORE P-249 fail: a value import of validate.ts (it reads files at load) anywhere in the chain is caught", (() => { const m = new Map(files); m.set("planted", ["node:fs"]); return outside(m).includes("node:fs"); })() && importsOf('import type { X } from "./validate.ts";\nimport { y } from "./validate.ts";').length === 1);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
