// G-CORE B1 (P-253; concept screens/G-CORE-guarded-change/concept.md v2, approved on PR #504): the pure rules check
// R1–R8 and the review tier (engine/change-set.ts), with the engine's own verifiers passed in, as the API does. No
// server, no database, US$0. Every rule and every row of the duplicate and risk tables has a passing and a failing case.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_gcore_engine.ts
import fc from "fast-check";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonical, validatePredicate } from "../../contracts/rules.ts";
import { ChangeSetBody, RAW_TREE_MAX, treeTooLarge, type ChangeItem, type MadeBy } from "../contracts/change-set.ts";
import { capProblems, swapMergedField, checkChangeSet, DUPLICATE_SCOPE, PROBLEMS_PER_ITEM, EXPERT_TARGETS, listId, MERGE_HOPS_MAX, mergeDepth, PROBLEMS_MAX, RISK_TABLE, riskOf, TREE_MAX, VALUE_TYPES, type Context, type LibField, type Library } from "../engine/change-set.ts";
import { valueProblems } from "../engine/eligibility-gates.ts";
import { nearMatches, nearWhy } from "../engine/near.ts";
import { VALUE_TYPE_TO_DATA_TYPE } from "../engine/snapshot.ts";
import { askedInOrder, isNode } from "../engine/validate.ts";

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
ok("G-CORE: one check returns at most PROBLEMS_MAX problems", capProblems(check(Array.from({ length: 50 }, (_, k) => ({ action: "rename", kind: "field", key: `person.nobody_${k}`, name: "x" }) as ChangeItem))).problems.length <= PROBLEMS_MAX && PROBLEMS_MAX === 200);

// ───────── Person and AI: the same check for the same action and items
ok("G-CORE: a person and the AI get the same check for the same items (only the tier differs)", JSON.stringify(check([height, cond({ op: "eq", field: "person.age", value: "x" })], ctx(), "person")) === JSON.stringify(check([height, cond({ op: "eq", field: "person.age", value: "x" })], ctx(), "ai")));


// ───────── Break round 2 (a21393c2): fixed with a failing case each
ok("G-CORE contract fail: a 10 000-deep tree is refused by the contract (a 400), measured without recursion (round 2 M1)", (() => { let t: object = { op: "eq", field: "person.age", value: 1 }; for (let k = 0; k < 10_000; k++) t = { op: "not", arg: t }; return treeTooLarge(root(t)) && !ChangeSetBody.safeParse({ items: [{ action: "set_condition", kind: "condition", key: "person.age", target: "question", tree: root(t) }] }).success; })());
ok("G-CORE contract pass: a real-sized tree passes the contract (the engine's 12 levels sit well inside it)", !treeTooLarge(root({ op: "and", args: [{ op: "eq", field: "person.age", value: 1 }, { op: "not", arg: { op: "eq", field: "person.age", value: 2 } }] })) && RAW_TREE_MAX.depth > TREE_MAX.depth * 2);
ok("G-CORE R7 pass: \"not (is off-list)\" is always true, so not R7 (round 2)", !rules([cond({ op: "not", arg: { op: "eq", field: "person.country_of_birth", value: "ATLANTIS" } })]).includes("R7"));
ok("G-CORE R7 pass: \"off-list or on-list\" can be true, so not R7 (round 2)", !rules([cond({ op: "or", args: [{ op: "eq", field: "person.country_of_birth", value: "ATLANTIS" }, { op: "eq", field: "person.country_of_birth", value: "CAN" }] })]).includes("R7"));
ok("G-CORE R7 fail: \"off-list and anything\" can never be true", rules([cond({ op: "and", args: [{ op: "eq", field: "person.country_of_birth", value: "ATLANTIS" }, { op: "eq", field: "person.age", value: 3 }] })]).includes("R7"));
ok("G-CORE R1 fail: a name that only looks blank (U+3164, U+2800), or with a soft hyphen or word joiner, is refused (round 2 n2)", ["ㅤㅤ", "⠀ab", "Fam­ily", "Fam⁠ily", "Fam\nily"].every((n) => rules([{ action: "rename", kind: "field", key: "person.given_name", name: n }]).includes("R1")));
ok("G-CORE R2 fail: a reason with a NUL character is refused (round 2 n2)", rules([{ ...height, reason: "No field holds\u0000 the height" }]).includes("R2"));
ok("G-CORE R1 pass: a key starting with a digit, as proposals' slugKey makes (\"2nd_passport\"), is a library key (round 2 n4)", !rules([{ action: "accept_proposal", kind: "document_type", key: "2nd_passport", name: "Second passport", proves: "identity", aliases: [], source: src, reason: "From the checklist" }]).includes("R1"));
ok("G-CORE R4 fail: a new field on a worked-out fact's key is refused (round 2 n4)", rules([{ ...height, key: "person.age_years" }], ctx({ derived: new Set(["person.age_years"]) })).includes("R4"));
ok("G-CORE R4 fail: a merge of A plus a condition reading A, or on A's question, in one set is refused (round 2 n1)",
  both([{ action: "merge", kind: "field", key: "person.civil_status", into: "person.marital_status" }, cond({ op: "eq", field: "person.civil_status", value: "SINGLE" })]) && both([{ action: "merge", kind: "field", key: "person.has_children", into: "person.age" }, cond({ op: "eq", field: "person.age", value: 3 })]));
ok("G-CORE R4 fail: a condition on a retired field's question is refused (round 2 n1)", check([cond({ op: "eq", field: "person.age", value: 3 }, "person.old_name")]).some((p) => p.rule === "R4" && /retired: its question takes no new condition/.test(p.message)));
ok("G-CORE tier: an accepted proposal is the AI's item for the expert step, whoever sends the check (round 2)", riskOf([item("field:accept_proposal")], "person", new Set()).expert_at_release);
ok("G-CORE cap: every item keeps its first problems, and truncated says more were found (round 2 n3)", (() => {
  const ps = [...Array.from({ length: 300 }, () => ({ rule: "R1" as const, item: 0, message: "x" })), { rule: "R1" as const, item: 7, message: "y" }];
  const c = capProblems(ps); return c.truncated && c.problems.filter((p) => p.item === 0).length === PROBLEMS_PER_ITEM && c.problems.some((p) => p.item === 7);
})());
ok("G-CORE cap pass: a short list is kept whole, not truncated", !capProblems([{ rule: "R1", item: 0, message: "x" }]).truncated);

// ───────── QA-159 (Major): a near duplicate needs a reason that names it, and is never Ready (engine/near.ts, R3)
ok("G-CORE near pass: QA-159's pair is near (one name holds the other), by key and by name", nearWhy("person.full_name_as_on_travel_document", "person.full_name") === "one name holds the other" && nearWhy("Full name as on travel document", "Full name") === "one name holds the other");
ok("G-CORE near pass: the same words in another order, and the same meaning under two names, are near", nearWhy("Name of family", "Family name") === "the same words in another order" && nearWhy("Surname", "Last name", { a: "The family name.", b: "the family name" }) === "the same meaning under two names");
ok("G-CORE near fail: names sharing one word only are not near (Family name / Given name)", nearWhy("Family name", "Given name") === null && nearWhy("person.family_name", "person.given_name") === null);
// QA-159 retest (3 Nov, C11.14): the three pairs still Ready on both sides after Reset to the six, and singular/plural.
ok("C11.14 QA-159 near pass: a one-word name inside a longer one is near (email / email address, citizenship / citizenship country, occupation / occupation title), by key and by name", nearWhy("person.email", "person.email_address") === "one name holds the other" && nearWhy("Citizenship", "Citizenship country") === "one name holds the other" && nearWhy("person.occupation_title", "person.occupation") === "one name holds the other", [nearWhy("person.email", "person.email_address"), nearWhy("Citizenship", "Citizenship country")]);
ok("C11.14 QA-159 near pass: the same name in the singular and the plural is near (given name / given names, other given name / other given names, country / countries)", nearWhy("person.given_name", "person.given_names") === "the same name in the singular and the plural" && nearWhy("Other given names", "Other given name") === "the same name in the singular and the plural" && nearWhy("Country of residence", "Countries of residence") === "the same name in the singular and the plural", nearWhy("person.given_name", "person.given_names"));
ok("C11.14 QA-159 near fail: two longer names sharing one word stay apart (family name / given name, email address / home address), and a word that only ends in s is not a plural (address / addresses is near, status / statu is not made)", nearWhy("person.family_name", "person.given_name") === null && nearWhy("Email address", "Home address") === null && nearWhy("Address", "Addresses") === "the same name in the singular and the plural" && nearWhy("Status", "Statu") === null, [nearWhy("Email address", "Home address"), nearWhy("Address", "Addresses"), nearWhy("Status", "Statu")]);
ok("C11.14 QA-159 near fail: one word in common is not near when neither name is that one word (date of birth / place of birth)", nearWhy("Date of birth", "Place of birth") === null && nearWhy("person.date_of_birth", "person.place_of_birth") === null);
ok("C11.14 QA-159 near fail: a one-word name of another group is not near by its name (organisation.name \"Name\" / person.given_name \"Given name\"); in the same group it is", nearMatches({ key: "person.given_name", name: "Given name" }, [{ key: "organisation.name", name: "Name" }]).length === 0 && nearMatches({ key: "person.email_address", name: "Email address" }, [{ key: "person.email", name: "Email" }]).length === 1, nearMatches({ key: "person.given_name", name: "Given name" }, [{ key: "organisation.name", name: "Name" }]));
ok("C11.14 QA-159 near fail (review m1 on #700): a one-word name in the middle of a longer one is not near (citizenship / subject of citizenship revocation)", nearWhy("person.subject_of_citizenship_revocation", "person.citizenship") === null && nearWhy("Subject of citizenship revocation", "Citizenship") === null, nearWhy("person.subject_of_citizenship_revocation", "person.citizenship"));
ok("C11.14 near pass (Devin on #700): a plural in -es whose singular ends in -us or -e is the same name (status / statuses, Marital status / Marital statuses, cause / causes)", nearWhy("Marital status", "Marital statuses") === "the same name in the singular and the plural" && nearWhy("person.status", "person.statuses") === "the same name in the singular and the plural" && nearWhy("Cause", "Causes") === "the same name in the singular and the plural" && nearMatches({ key: "person.marital_statuses", name: "Marital statuses" }, [{ key: "person.marital_status", name: "Marital status" }]).length === 1, [nearWhy("Marital status", "Marital statuses"), nearWhy("Cause", "Causes")]);
ok("G-CORE near fail: an exact same key or name is left to the exact check", nearMatches({ key: "person.age", name: "Age" }, [{ key: "person.age", name: "Age" }]).length === 0);
ok("G-CORE near: keys are compared within one group only (case.full_name is not near person.full_name_as_on_travel_document by key)", nearMatches({ key: "case.full_name", name: "Case reference" }, [{ key: "person.full_name_as_on_travel_document", name: "Travel name" }]).length === 0);
const travelName: ChangeItem = { action: "accept_proposal", kind: "field", key: "person.full_name_as_on_travel_document", name: "Full name as on travel document", valueType: "text", aliases: [], source: src, reason: "IMM 5604 asks for the name exactly as printed" };
ok("G-CORE R3 near fail: a new field near a library field (QA-159), with a reason that does not name it, is refused", check([travelName]).some((p) => p.rule === "R3" && /is close to Whole name \(draft\) \(one name holds the other\)/.test(p.message)), check([travelName]));
ok("G-CORE R3 near pass: the same field with a reason that says why the near one does not fit passes R3", !rules([{ ...travelName, reason: "Whole name (draft) holds the current name; this is the name exactly as printed on the travel document" }]).includes("R3"));
ok("G-CORE R3 near fail: a new field near one another proposal is waiting to add is refused too", check([{ ...travelName, key: "person.travel_doc_name", name: "Name on travel document as printed", reason: "From IMM 5604" }], ctx({ pendingNew: [{ key: "person.printed_name", name: "Printed name on travel document" }] })).some((p) => p.rule === "R3" && /Printed name on travel document/.test(p.message)));
const qa159 = ctx({ pendingNew: [{ key: "person.full_name", name: "Full name" }] });
const nearFull = (reason: string) => check([{ ...travelName, reason }], qa159).some((p) => p.rule === "R3" && /is close to Full name/.test(p.message));
ok("G-CORE R3 near fail (review r4-M1): a reason that only describes the item itself (its own name holds the near one's) does not count as naming it", nearFull("The full name as on travel document is asked on IMM 5604 box 2"));
ok("G-CORE R3 near pass (review r4-M1): a reason that names the near field apart from the item's own name passes", !nearFull("Full name holds the name in daily use; IMM 5604 asks for the name exactly as printed on the travel document"));
ok("G-CORE R3 near fail: the item's own key in the reason does not count either", nearFull("person.full_name_as_on_travel_document is asked on IMM 5604"));
ok("G-CORE R3 near fail (review r5-m1): the own name with commas or extra spaces still does not count", nearFull("The Full  Name, as on travel document, is asked on IMM 5604 box 2"));
const birth = ctx({ pendingNew: [{ key: "person.birth_place", name: "Birth place" }] });
const mother = (reason: string): ChangeItem => ({ action: "accept_proposal", kind: "field", key: "person.mother_birth_place", name: "Birth place of mother", valueType: "text", aliases: [], source: src, reason });
const nearBirth = (reason: string) => check([mother(reason)], birth).some((p) => p.rule === "R3" && /is close to Birth place/.test(p.message));
ok("G-CORE R3 near fail (review r5-m1): words that only contain the near name (\"rebirth places\" for \"Birth place\") do not name it", nearBirth("From the rebirth places register on IMM 5406"));
ok("G-CORE R3 near pass (review r5-m1): naming the near field as words, with punctuation around it, passes", !nearBirth("Not Birth place (the person's own): the mother's, from IMM 5406"));
ok("G-CORE R3 near pass: a new field near nothing passes", !rules([height]).includes("R3"));
ok("G-CORE tier: a near-duplicate new field is never direct (a new item waits for a second person)", riskOf([travelName], "ai", new Set()).tier === "second_person");

// ───────── Review threads on #556 (Devin): fixed with a failing case each
const snap = { placements: [{ fact: "person.a", condition: { subjectKind: "PERSON", op: "eq", field: "person.b", value: true }, condition_effect: "SHOW" }, { fact: "person.b" }], document_types: [], derived_fields: [], field_maps: [], forms: [], rules: [], document_requirements: [], canonical_fields: [{ id: "person.a", meaning: "A" }, { id: "person.b", meaning: "B" }] } as unknown as Parameters<typeof askedInOrder>[0];
const loops = (x: typeof snap) => askedInOrder(x).map((p) => p.message).filter((m) => /decide each other in a loop/.test(m));
ok("G-CORE R8 merge (thread 1) pass: the merge simulation moves the merged field's questions too (fact), not only conditions", (() => { const after = swapMergedField(snap, "person.a", "person.b"); return after.placements.every((p) => p.fact === "person.b"); })());
ok("G-CORE R8 merge (thread 1) fail: merging A into B, where A's question is shown when B is true, makes B decide itself: the loop is found", loops(snap).length === 0 && loops(swapMergedField(snap, "person.a", "person.b")).length > 0);
ok("G-CORE R8 merge (thread 1): rewriting conditions alone (the old simulation) would have missed it", loops(JSON.parse(JSON.stringify(snap).split('"field":"person.a"').join('"field":"person.b"'))).length === 0);
ok("G-CORE R3 near (thread 2) fail: a new field near a field's OLDER live name, with a reason naming neither, is refused", check([{ action: "accept_proposal", kind: "field", key: "case.full_name_note", name: "Full Name on travel record", valueType: "text", aliases: [], source: src, reason: "From IMM 5604" }]).some((p) => p.rule === "R3" && /is close to/.test(p.message)));
ok("G-CORE R3 near (thread 2) pass: naming any one live name of that field passes (one entry per field)", !check([{ action: "accept_proposal", kind: "field", key: "case.full_name_note", name: "Full Name on travel record", valueType: "text", aliases: [], source: src, reason: "Not Whole name (draft): the name as printed on the record" }]).some((p) => p.rule === "R3"));
ok("G-CORE R4 (thread 3) pass: two conditions on different questions reading the same field are independent", !both([cond({ op: "eq", field: "person.age", value: 3 }, "person.has_children"), cond({ op: "eq", field: "person.age", value: 4 }, "person.marital_status")]));
ok("G-CORE R4 (thread 3) fail: two conditions on the same question in one set still clash", both([cond({ op: "eq", field: "person.age", value: 3 }), cond({ op: "eq", field: "person.age", value: 4 })]));
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
