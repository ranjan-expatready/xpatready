// M3-S2 checks (P-380, P-425, Bake plan row 18): a filing a "Who can be in this application" line adds when its rule
// holds on the person's own answers, on any combination, by configuration only. Each rule has a passing and a failing
// case: the save's rules (engine/people.ts), the release's check (engine/validate.ts), the rule listed for C3.6
// (engine/runtime/added-filings.ts addedFilingRules, which api/src/rule-facts.ts rulesOf lists), reading it on a case (engine/runtime/added-filings.ts) and filing and pricing it
// (engine/runtime/filings.ts). Made-up combination keys only ("x.any"): no pathway is named. No database, no server, no
// model call (US$0).
//   tsx studio/tests/runtime/check_added_filings.ts
import { factKey } from "../../contracts/resolver.ts";
import type { CaseFilings } from "../../contracts/runtime.ts";
import { checkPeople } from "../../engine/people.ts";
import { addedFilingRules, addedFilings } from "../../engine/runtime/added-filings.ts";
import { caseView, type Participant } from "../../engine/runtime/case.ts";
import { deriveFilings, rulesFrom, type FeeTable } from "../../engine/runtime/filings.ts";
import { releaseConditionFacts, type Snapshot } from "../../engine/snapshot.ts";
import { addedFilingProblems, checkCondition, validate, withdrawnFieldLines } from "../../engine/validate.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const FACT = "person.studies_long";
const RULE = { op: "eq", field: FACT, value: true, subjectKind: "PERSON" };
const ADDS = { filing: "Study permit", condition: RULE, conditionPlain: "the child will study for a long time", sourceQuote: "Made-up words for a pure check, with no page (not an IRCC value)." };
const ROLES = [
  { key: "principal", label: "Principal applicant", takesPartInCase: true, mayBeApplicant: true, retired: false },
  { key: "child", label: "Child", takesPartInCase: true, mayBeApplicant: true, retired: false },
  { key: "representative", label: "Representative", takesPartInCase: true, mayBeApplicant: false, retired: false },
];
const line = (role: string, extra: Record<string, unknown> = {}) => ({ role, min: role === "principal" ? 1 : 0, max: role === "principal" ? 1 : 3, applies: role !== "representative", ...extra });

const src = { page: "Made-up fee page", quote: "made up", read: "2026-11-11" };
const TABLE = { as_of: "2026-11-11", read: "2026-11-11", status: "Sample", lines: [
  { key: "app", label: "Application fee", status: "Sample", basis: "per_application", per_person_cad: 100, source: src },
  { key: "permit", label: "Permit fee", status: "Sample", basis: "per_application", per_person_cad: 150, roles: ["child"], source: src },
  { key: "main_only", label: "Principal's fee", status: "Sample", basis: "per_application", per_person_cad: 70, roles: ["principal"], source: src },
  { key: "bio", label: "Biometrics fee", status: "Sample", basis: "family_maximum", per_person_cad: 85, family_max: { cad: 170, from_people: 2 }, source: src },
], combinations: { "x.any": { label: "Any combination", lines: ["app", "permit", "main_only", "bio"], modes: { child: "on_principal" } } } } as unknown as FeeTable;
const TABLE_FOR_RELEASE = TABLE;

// (1) The save (engine/people.ts checkPeople).
{
  const good = checkPeople([line("principal", { filingMode: "files_own" }), line("child", { filingMode: "on_principal", addsFiling: ADDS })] as never, ROLES, true);
  ok("save pass: a line on the principal's application may add a filing; it is kept as saved", good.errors.length === 0 && JSON.stringify(good.lines[1].addsFiling) === JSON.stringify(ADDS), good.errors);
  const none = checkPeople([line("principal", { filingMode: "files_own" }), line("child", { addsFiling: ADDS })] as never, ROLES, true);
  ok("save pass: so may a line with no filing of its own", none.errors.length === 0 && !!none.lines[1].addsFiling, none.errors);
  const own = checkPeople([line("principal", { filingMode: "files_own" }), line("child", { filingMode: "files_own", addsFiling: ADDS })] as never, ROLES, true);
  ok("save fail: a line whose person files their own application cannot add one (one application per person)", own.errors.some((e) => e.field === "participants[1].addsFiling" && /already files their own application/.test(e.message)), own.errors);
  const main = checkPeople([line("principal", { filingMode: "files_own", addsFiling: ADDS })] as never, ROLES, true);
  ok("save fail: never on the principal's line", main.errors.some((e) => /already files their own application/.test(e.message)), main.errors);
  const rep = checkPeople([line("principal"), line("representative", { addsFiling: ADDS })] as never, ROLES, false);
  ok("save fail: never for a person who is never an applicant", rep.errors.some((e) => /never an applicant, so no filing can be added/.test(e.message)), rep.errors);
  const other = checkPeople([line("principal"), line("child", { filingMode: "on_principal", addsFiling: { ...ADDS, condition: { ...RULE, subjectKind: "SPOUSE" } } })] as never, ROLES, true);
  ok("save fail: the rule reads the line's own person, never another's", other.errors.some((e) => /reads their own answers/.test(e.message)), other.errors);
  const caseFact = checkPeople([line("principal"), line("child", { filingMode: "on_principal", addsFiling: { ...ADDS, condition: { op: "eq", field: "case.study_level", value: "x", subjectKind: "PERSON" } } })] as never, ROLES, true);
  ok("save fail (break M4): a rule reading a fact about the case is refused (one answer would add the filing for everyone)", caseFact.errors.some((e) => /only facts about the person/.test(e.message)), caseFact.errors);
  const half = checkPeople([line("principal"), line("child", { filingMode: "on_principal", addsFiling: { filing: "Study permit", condition: RULE } })] as never, ROLES, true);
  ok("save fail: without its words and its source it is refused in words", half.errors.some((e) => e.field === "participants[1].addsFiling" && /words|Quote/.test(e.message)), half.errors);
}

// (2) The release check and the rules C3.6 lists.
{
  const types = new Map([[FACT, "yes_no"]]);
  ok("release fail: a rule reading a fact the library lacks is refused in the library's words", checkCondition(RULE, new Map(), new Set()).some((e) => e === `reads ${FACT}, which is not in the library`));
  ok("release pass: a rule reading a library fact passes", checkCondition(RULE, types, new Set()).length === 0);
  const rules = addedFilingRules({ combination: { participants: [line("child", { addsFiling: ADDS }), line("principal")] } } as unknown as Snapshot);
  ok("C3.6 pass: the line's rule is a rule a fact can be added for (adds_filing.<role>), with its words and tree", rules.length === 1 && rules[0].key === "adds_filing.child" && rules[0].filing === "Study permit (child)" && rules[0].plain === ADDS.conditionPlain && rules[0].tree === RULE);
  ok("C3.6 fail: a line with no filing it adds lists no rule", addedFilingRules({ combination: { participants: [line("child"), line("principal")] } } as unknown as Snapshot).length === 0);
}

// (2b) The release's checks of the line (engine/validate.ts addedFilingProblems).
{
  const TYPES = new Map([[FACT, "yes_no"]]);
  const relP = (lineExtra: Record<string, unknown>, repeats = "per_person", key = "x.any", o: { types?: Map<string, string>; placed?: Set<string>; docFacts?: Set<string>; derived?: Set<string> } = {}) => addedFilingProblems({ combination: { key, participants: [line("principal", { filingMode: "files_own" }), line("child", { filingMode: "on_principal", ...lineExtra })] }, placements: [{ fact: FACT, repeats }] } as unknown as Snapshot, o.types ?? TYPES, o.derived ?? new Set(), o.placed ?? new Set([FACT]), o.docFacts ?? new Set(), TABLE_FOR_RELEASE);
  const rel = (...a: Parameters<typeof relP>) => relP(...a).map((p) => p.message);
  const BOTH = { ...ADDS, fee: ["permit", "bio"] };
  ok("release pass: a line on the principal's application, its fact asked per person, naming every fee line that charges a child (per application, family maximum)", relP({ addsFiling: BOTH }).length === 0, rel({ addsFiling: BOTH }));
  // Review M2 (round 2), V3: the rule's fact must be asked of someone (or supplied by a document, or worked out).
  ok("release fail (V3): a rule reading a fact nobody in this combination is asked is refused, in words", rel({ addsFiling: BOTH }, "per_person", "x.any", { placed: new Set() }).some((m) => m === `The rule reads ${FACT}, but nobody is asked it in this combination, so the filing could never be added. Ask it in the questionnaire, or change the rule.`), rel({ addsFiling: BOTH }, "per_person", "x.any", { placed: new Set() }));
  ok("release pass (V3): the same fact supplied by a document, or worked out by the library, is accepted", rel({ addsFiling: BOTH }, "per_person", "x.any", { placed: new Set(), docFacts: new Set([FACT]) }).length === 0 && rel({ addsFiling: BOTH }, "per_person", "x.any", { placed: new Set(), derived: new Set([FACT]) }).length === 0);
  // V9: the rule's condition is checked against the library (checkCondition), on the line itself.
  const unknown = rel({ addsFiling: BOTH }, "per_person", "x.any", { types: new Map() });
  ok("release fail (V9): a rule reading a fact the library lacks is refused on the line", unknown.some((m) => m === `Condition reads ${FACT}, which is not in the library.`), unknown);
  const badNode = rel({ addsFiling: { ...BOTH, condition: { op: "nope", field: FACT, value: true, subjectKind: "PERSON" } } });
  ok("release fail (V9): a rule that is not a valid condition is refused on the line", badNode.some((m) => /^Condition /.test(m)), badNode);
  ok("release pass (V9): a rule reading a library fact with a valid condition raises no condition line", !rel({ addsFiling: BOTH }).some((m) => /^Condition /.test(m)));
  // Review n1: a per-person or family-maximum line charging the role that the line does not name: a warning, in words.
  const short = relP({ addsFiling: { ...ADDS, fee: "permit" } });
  ok("release warn (n1): naming only the per-application line leaves the family-maximum biometrics line out: a warning naming it (the total would be short)", short.length === 1 && short[0].level === "warning" && /"Biometrics fee" \(bio\) charges each child/.test(short[0].message) && /total can be short/.test(short[0].message), short);
  ok("release pass (n1): an unnamed per-application line (the principal's application fee) or a line not reaching a child raises no warning", !relP({ addsFiling: BOTH }).some((p) => /\b(app|main_only)\b/.test(p.message)));
  ok("release pass (n1): naming no fee line raises no warning (the case is left unpriced in words, never short)", relP({ addsFiling: ADDS }).length === 0, rel({ addsFiling: ADDS }));
  ok("release fail (break M4): its fact asked once for the case is refused", rel({ addsFiling: ADDS }, "once_per_case").some((m) => /asked once for the case/.test(m)));
  ok("release fail (review m4): a line saved without a mode whose built-in default is files own is refused", rel({ filingMode: null, addsFiling: ADDS }, "per_person", "vv.single").some((m) => /already files their own application/.test(m)));
  ok("release fail (break m9): on a line that files its own application it is refused", rel({ filingMode: "files_own", addsFiling: ADDS }).some((m) => /already files their own application/.test(m)));
  ok("release fail (break m6, M2): a fee line not among the combination's, or not reaching the person, is refused", rel({ addsFiling: { ...ADDS, fee: "nope" } }).some((m) => /nope is not among/.test(m)) && rel({ addsFiling: { ...ADDS, fee: "main_only" } }).some((m) => /main_only is not among/.test(m)));
  ok("release pass (review M1): a per-person fee line reaching the child may be named (no refusal)", !relP({ addsFiling: { ...ADDS, fee: "bio" } }).some((p) => p.level === "error"));
}

// (2c) The rule outside the helper: a withdrawn field's line, validate()'s own wiring, and the facts that travel with
// the release (engine/validate.ts withdrawnFieldLines, validate; engine/snapshot.ts releaseConditionFacts).
{
  const ADDS_OK = { ...ADDS, fee: ["permit", "bio"] };
  const bare = (participants: unknown[], placements: unknown[] = [{ lineage: "q1", fact: FACT, section_id: "study", order: 1, question_text: "Will this person study for a long time?", repeats: "per_person", tier: "case", collected_from: "staff_working_view" }]) => ({ combination: { key: "x.none", participants }, forms: [], field_maps: [], document_requirements: [], rules: [], checks: [], derived_fields: [], document_types: [], fact_sources: [], placements, sections: [{ id: "study", title: "Study" }], section_titles: [], canonical_fields: [{ id: FACT, value_type: "yes_no", meaning: "Studies for a long time", group: "person" }] }) as unknown as Snapshot;
  const withRule = [line("principal", { filingMode: "files_own" }), line("child", { label: "Child", filingMode: "on_principal", addsFiling: ADDS_OK })];
  const noRule = [line("principal", { filingMode: "files_own" }), line("child", { label: "Child", filingMode: "on_principal" })];
  // V8: withdrawing the field the rule reads names the rule, never the key.
  const gone = new Map([[FACT, "Studies for a long time"]]);
  const w = withdrawnFieldLines(bare(withRule), gone);
  ok("release fail (V8): withdrawing the field the rule reads holds release on the rule, by its name and the field's", w.some((p) => p.where === "Who can be in this application" && p.label === `The rule that adds "Study permit" for Child` && p.message === `It reads "Studies for a long time", a new field that was withdrawn. Point it at another field, or remove it.`), w);
  ok("release pass (V8): with no rule on the line, or the field still in the library, no such line", !withdrawnFieldLines(bare(noRule), gone).some((p) => p.where === "Who can be in this application") && withdrawnFieldLines(bare(withRule), new Map([["person.other", "Other"]])).length === 0);
  // V7: validate() itself runs the line's checks (the tests above call the helper; this one calls validate).
  const LIB = [{ key: FACT, valueType: "yes_no" }];
  const vFail = validate(bare(withRule, []), LIB, []).filter((p) => p.where === "Who can be in this application");
  ok("release fail (V7): validate() refuses a line whose rule's fact nobody is asked", vFail.some((p) => p.level === "error" && /nobody is asked it in this combination/.test(p.message)), vFail);
  const vPass = validate(bare(withRule), LIB, []).filter((p) => p.where === "Who can be in this application");
  ok("release pass (V7): validate() raises nothing on the line once the fact is asked per person", vPass.length === 0, vPass);
  // S1: the rule's facts travel with the release (engine/snapshot.ts assemble seeds the facts a release carries from these).
  const FORM_COND = { op: "eq", field: "person.form_fact", value: true, subjectKind: "PERSON" };
  const facts = releaseConditionFacts([FORM_COND, null], withRule);
  ok("snapshot pass (S1): the fact a line's added filing reads travels with the release, beside the forms' own", facts.has(FACT) && facts.has("person.form_fact"), [...facts]);
  ok("snapshot fail (S1): a line with no rule adds no fact (only the forms' own travel)", [...releaseConditionFacts([FORM_COND], noRule)].join() === "person.form_fact" && releaseConditionFacts([], "not a list").size === 0);
}

// (3) Reading it on a case (engine/runtime/added-filings.ts).
const p = (id: string, role: Participant["role"], applies = true): Participant => ({ subjectId: id, role, label: id === "P" ? "Client A" : `Child ${id}`, applies });
const PEOPLE = [{ subjectId: "K", role: "case", label: "Case", applies: true } as Participant, p("P", "principal"), p("C1", "child"), p("C2", "child"), p("C3", "child"), p("C4", "child", false)];
const snap = (participants: unknown[]) => ({ combination: { key: "x.any", participants }, derived_fields: [] }) as unknown as Snapshot;
const S = snap([line("principal", { filingMode: "files_own" }), line("child", { filingMode: "on_principal", addsFiling: { ...ADDS, fee: "permit" } })]);
const known = new Map<string, unknown>([[factKey("C1", FACT), { value: true }], [factKey("C2", FACT), { value: false }], [factKey("C4", FACT), { value: true }]]);
{
  const a = addedFilings(S, known as never, PEOPLE);
  ok("case pass: a child answered Yes adds the filing, with its fee line", a.size === 1 && a.get("C1")?.filing === "Study permit" && a.get("C1")?.fee === "permit", [...a]);
  ok("case fail: answered No, not answered yet, or not travelling adds nothing", !a.has("C2") && !a.has("C3") && !a.has("C4"));
  // Review M2 (round 2), A1: a list of fee lines is carried to the case as it was released.
  const listed = addedFilings(snap([line("principal", { filingMode: "files_own" }), line("child", { filingMode: "on_principal", addsFiling: { ...ADDS, fee: ["permit", "bio"] } })]), known as never, PEOPLE);
  ok("case pass (A1): a line naming a list of fee lines carries the list to the case", JSON.stringify(listed.get("C1")?.fee) === JSON.stringify(["permit", "bio"]), [...listed]);
  const mixed = addedFilings(snap([line("principal", { filingMode: "files_own" }), line("child", { filingMode: "on_principal", addsFiling: { ...ADDS, fee: ["permit", 7] } })]), known as never, PEOPLE);
  ok("case fail (A1): a list with a non-key in it carries no fee line (the case is left unpriced, in words)", mixed.has("C1") && mixed.get("C1")!.fee === undefined, [...mixed]);
  ok("case fail: a release whose lines add nothing adds nothing", addedFilings(snap([line("principal"), line("child", { filingMode: "on_principal" })]), known as never, PEOPLE).size === 0);
}

// (3b) The questionnaire asks the rule's question of each person of the line who applies (engine/render.ts deciders).
{
  const base = { combination: { key: "x.any", participants: [line("principal", { filingMode: "files_own" }), line("child", { filingMode: "on_principal", addsFiling: ADDS })] }, forms: [], field_maps: [], document_requirements: [], rules: [], checks: [], derived_fields: [], document_types: [], placements: [{ lineage: "q1", fact: FACT, section_id: "study", order: 1, question_text: "Will this person study for a long time?", repeats: "per_person", tier: "case", collected_from: "staff_working_view" }], sections: [{ id: "study", title: "Study" }], canonical_fields: [{ id: FACT, value_type: "yes_no", meaning: "Studies for a long time", group: "person" }] };
  const asked = (s: unknown, answers: unknown[] = []) => caseView(s as Snapshot, PEOPLE, answers as never, [], "agent" as never).sections.flatMap((x) => x.questions.filter((q: { fact: string }) => q.fact === FACT).map((q: { subjectId: string }) => q.subjectId));
  const open = asked(base);
  ok("questionnaire pass: the rule's question is asked of each child who applies, never the principal or a child not travelling", ["C1", "C2", "C3"].every((c) => open.includes(c)) && !open.includes("P") && !open.includes("C4"), open);
  ok("questionnaire pass: an answered Yes keeps the question on the case (it can be changed back)", asked(base, [{ subjectId: "C1", field: FACT, value: true }]).includes("C1"));
  const noRule = { ...base, combination: { key: "x.any", participants: [line("principal"), line("child", { filingMode: "on_principal" })] } };
  ok("questionnaire fail: without the line's rule nothing reads the question, so it is not asked", asked(noRule).length === 0, asked(noRule));
}

// (4) Filing and pricing it (engine/runtime/filings.ts), from a made-up fee table.
type D = Extract<CaseFilings, { derived: true }>;
const modes = new Map([["child", "on_principal" as const]]);
const derive = (adds?: Map<string, { filing: string; fee?: string }>) => deriveFilings("x.any", PEOPLE.slice(0, 4), (k) => rulesFrom(TABLE, k), { modes, ...(adds ? { adds } : {}) }) as D;
{
  const base = derive();
  ok("filing fail (no Yes): the children are on the principal's application, one filing", base.filings.length === 1 && base.filings[0].applicants.length === 3);
  const yes = derive(new Map([["C1", { filing: "Study permit", fee: "permit" }]]));
  const own = yes.filings.find((f) => f.owner?.subject === "C1");
  ok("filing pass: a Yes adds the child's own filing, named by the line, in the family's submission", yes.filings.length === 2 && !!own && own.label === "Study permit: Child C1" && own.mode === "files_own" && own.group === yes.filings[0].group && own.applicants.length === 1, yes.filings.map((f) => f.label));
  ok("filing pass: the child is no longer on the principal's application", !yes.filings[0].applicants.some((a) => a.subject === "C1") && yes.filings[0].applicants.length === 2);
  const fee = (filing: string, line: string) => yes.fees.filter((f) => f.filing === filing && f.line === line);
  ok("fee pass: the named per-application line is charged on the added filing (CAD 150), never another per-application line", fee(own!.id, "permit").length === 1 && fee(own!.id, "permit")[0].amount_cents === 150_00 && fee(own!.id, "app").length === 0, yes.fees);
  ok("fee pass (break M1): the principal's application is charged as before, and no line the child's line does not name counts the child (biometrics: 2 people)", fee(yes.filings[0].id, "app")[0]?.amount_cents === 100_00 && fee(yes.filings[0].id, "main_only")[0]?.amount_cents === 70_00 && yes.groups[0].totals.find((t) => t.line === "bio")?.people === 2 && !yes.fees.some((f) => f.person === "C1" && f.line !== "permit") && yes.groups[0].total_cents === 100_00 + 70_00 + 150_00 + 170_00, yes.groups[0].totals);
  ok("fee pass (break M3): a line limited to children (roles) is never charged on the principal's application", fee(yes.filings[0].id, "permit").length === 0);
  const both = derive(new Map([["C1", { filing: "Study permit", fee: ["permit", "bio"] }]]));
  ok("fee pass: a line naming biometrics too counts the child in the family maximum (3 people, capped)", both.groups[0].totals.find((t) => t.line === "bio")?.people === 3 && both.groups[0].totals.find((t) => t.line === "bio")?.total_cents === 170_00 && both.fees_worked_out === true);
  const notTheirs = derive(new Map([["C1", { filing: "Study permit", fee: ["permit", "main_only"] }]]));
  ok("fee fail (break M2): a named line not reaching the child's role leaves the case unpriced, in words", notTheirs.fees_worked_out === false && /each reaching a child/.test(notTheirs.fees_why ?? ""), notTheirs.fees_why);
  const unnamed = derive(new Map([["C1", { filing: "Study permit" }]]));
  ok("fee fail: an added filing whose line names no fee line charges nothing on the case and says why (never a short total)", unnamed.fees_worked_out === false && unnamed.groups.every((g) => g.total_cents === null) && /is added by its rule/.test(unnamed.fees_why ?? "") && unnamed.filings.length === 2, unnamed.fees_why);
  const wrong = derive(new Map([["C1", { filing: "Study permit", fee: "bio" }]]));
  ok("fee pass (review M1): a named per-person line charges the child once, on their own filing, and no per-application line does", wrong.fees_worked_out === true && wrong.fees.filter((f) => f.person === "C1" && f.line === "bio").length === 1 && !wrong.fees.some((f) => f.person === "C1" && f.line !== "bio"), wrong.fees.filter((f) => f.person === "C1"));
  const looseOf = (adds?: Map<string, { filing: string }>) => deriveFilings("x.any", PEOPLE.slice(0, 3), () => undefined, { modes: new Map([["principal", "files_own" as const]]), ...(adds ? { adds } : {}) }) as D;
  const loose = looseOf(new Map([["C1", { filing: "Study permit" }]])), bare = looseOf();
  ok("filing pass: a line with no filing of its own adds it on a Yes (no fee lines: no amount, in words)", loose.filings.some((f) => f.owner?.subject === "C1" && f.label === "Study permit: Child C1") && !loose.not_filing.some((n) => n.subject === "C1") && loose.groups.every((g) => g.total_cents === null), loose.filings.map((f) => f.label));
  ok("filing fail: without the Yes that child files nothing and says why", !bare.filings.some((f) => f.owner?.subject === "C1") && bare.not_filing.some((n) => n.subject === "C1" && /no filing is set/.test(n.why)));
  const none = deriveFilings("x.none", PEOPLE.slice(0, 2), () => undefined, {}) as CaseFilings;
  ok("B164 pass: with no filing modes and no fee row, the words say what is missing, never a slice of combinations", none.derived === false && !/not derived yet for this combination|fees (are )?not worked out yet/i.test(none.why) && /Who can be in this application/.test(none.why));
}

process.exitCode = summary() ? 1 : 0;
