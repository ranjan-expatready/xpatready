// Condition language (AIW-D264): the vocabulary equals the team's closed list, the portable contract accepts
// and refuses the right shapes, age is derived from the date of birth at an explicit reference date with
// boundary and missing-input cases, and evaluation never guesses a missing answer. No AI call.
import { Ajv } from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ageInYears, daysUntil, evaluate, PREDICATE_OPS, validatePredicate, type PredicateNode } from "../contracts/rules.ts";

const P = join(import.meta.dirname, "..");
const TEAM = join(P, "..", "..", "..", "code", "ERv2-sanitized@22f1d12-2026-10-19", "packages", "contracts", "src", "schemas", "predicate.ts");
const results: [string, boolean][] = [];
const t = (name: string, pass: boolean) => results.push([name, pass]);

// 1. Vocabulary: the team's PREDICATE_OPS list, read from the captured file (read only).
const team = readFileSync(TEAM, "utf8");
const block = /export const PREDICATE_OPS = \[([\s\S]*?)\] as const;/.exec(team)?.[1] ?? "";
const teamOps = [...block.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
t(`vocabulary equals the team's closed list (${teamOps.join(", ")})`, JSON.stringify(teamOps) === JSON.stringify([...PREDICATE_OPS]));
const schema = JSON.parse(readFileSync(join(P, "contracts", "predicate.v0.schema.json"), "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false }); ajv.addSchema(schema);
const node = ajv.getSchema("https://expatready.local/contracts/predicate.v0.json#/definitions/node")!;
const schemaOps = new Set<string>(schema.definitions.node.oneOf.flatMap((v: any) => v.properties.op.enum ?? [v.properties.op.const]));
t("the portable contract admits exactly the same 11 operators", schemaOps.size === 11 && [...PREDICATE_OPS].every((o) => schemaOps.has(o)));

// 2. Shapes: the official condition 'aged 18 or older' and refusals.
const adult = { subjectKind: "APPLICANT", op: "gte", field: "person.age_years", value: 18 };
t("'aged 18 or older' is a valid root condition", validatePredicate(adult, node).length === 0);
const nested = { subjectKind: "PRINCIPAL", op: "and", args: [{ op: "in", field: "relationship.type", value: ["common_law"] }, { op: "not", arg: { op: "exists", field: "person.previous_marriage_end_date" } }] };
t("nested and / in / not / exists is valid", validatePredicate(nested, node).length === 0);
t("an operator outside the vocabulary is refused (count)", validatePredicate({ subjectKind: "APPLICANT", op: "count", field: "x", value: 1 }, node).length > 0);
t("a root without subjectKind is refused", validatePredicate({ op: "eq", field: "x", value: 1 }, node).length > 0);
t("a child carrying subjectKind is refused", validatePredicate({ subjectKind: "A", op: "not", arg: { subjectKind: "B", op: "exists", field: "x" } }, node).length > 0);
t("an ordered comparison with a boolean value is refused", validatePredicate({ subjectKind: "A", op: "gt", field: "x", value: true }, node).length > 0);
t("and with no arguments is refused", validatePredicate({ subjectKind: "A", op: "and", args: [] }, node).length > 0);
t("null as a comparison value is refused", validatePredicate({ subjectKind: "A", op: "eq", field: "x", value: null }, node).length > 0);

// 3. Age: deterministic, at an explicit reference date.
t("18th birthday on the reference date: 18", ageInYears("2008-10-20", "2026-10-20") === 18);
t("the day before the 18th birthday: 17", ageInYears("2008-10-21", "2026-10-20") === 17);
t("the day after: 18", ageInYears("2008-10-19", "2026-10-20") === 18);
t("born 29 February: still 17 on 28 February of a non-leap year", ageInYears("2008-02-29", "2026-02-28") === 17);
t("born 29 February: 18 on 1 March of a non-leap year", ageInYears("2008-02-29", "2026-03-01") === 18);
t("born 29 February: 16 on 29 February of a leap year (2024)", ageInYears("2008-02-29", "2024-02-29") === 16);
t("missing date of birth: cannot tell (undefined)", ageInYears(undefined, "2026-10-20") === undefined && ageInYears("", "2026-10-20") === undefined);
t("missing reference date: cannot tell", ageInYears("2008-10-20", undefined) === undefined);
t("impossible date (2023-02-29): cannot tell", ageInYears("2023-02-29", "2026-10-20") === undefined);
t("date of birth after the reference date: cannot tell", ageInYears("2027-01-01", "2026-10-20") === undefined);
t("days until expiry: 70", daysUntil("2026-12-29", "2026-10-20") === 70);
t("days until expiry crosses a leap day correctly", daysUntil("2028-03-01", "2028-02-28") === 2);

// 4. Evaluation never guesses: missing input gives cannot_tell, naming what is missing.
const age = [{ id: "person.age_years", calculation: "age_in_years", inputs: ["person.date_of_birth"], reference: "case.application_date" }];
const tree = { op: "gte", field: "person.age_years", value: 18 } as PredicateNode;
t("adult on the application date: IMM 5707 applies", evaluate(tree, { "person.date_of_birth": "1990-04-12", "case.application_date": "2026-10-20" }, age).result === true);
t("a 9-year-old: does not apply", evaluate(tree, { "person.date_of_birth": "2017-01-20", "case.application_date": "2026-10-20" }, age).result === false);
const noDob = evaluate(tree, { "case.application_date": "2026-10-20" }, age);
t("missing date of birth: cannot_tell, naming the date of birth", noDob.result === "cannot_tell" && noDob.missing.includes("person.date_of_birth"));
const noRef = evaluate(tree, { "person.date_of_birth": "1990-04-12" }, age);
t("missing reference date: cannot_tell, naming it", noRef.result === "cannot_tell" && noRef.missing.includes("case.application_date"));
t("a calculation without a tested helper refuses to run (count of people)", (() => { try { evaluate(tree, {}, [{ id: "case.children", calculation: "count_people_in_role", inputs: [], reference: "x" }]); return false; } catch (e) { return /no tested helper/.test((e as Error).message); } })());
t("or with one true branch is true even if another is unknown", evaluate({ op: "or", args: [{ op: "eq", field: "a", value: 1 }, { op: "eq", field: "b", value: 2 }] }, { a: 1 }).result === true);
t("and with one unknown branch and no false is cannot_tell", evaluate({ op: "and", args: [{ op: "eq", field: "a", value: 1 }, { op: "eq", field: "b", value: 2 }] }, { a: 1 }).result === "cannot_tell");
t("exists on a missing fact is false (not cannot_tell)", evaluate({ op: "exists", field: "b" }, {}).result === false);

for (const [n, p] of results) console.log(`${p ? "PASS" : "FAIL"}  ${n}`);
const failed = results.filter(([, p]) => !p).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
