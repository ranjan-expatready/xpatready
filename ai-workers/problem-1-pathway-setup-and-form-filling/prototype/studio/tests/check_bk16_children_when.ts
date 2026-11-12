// BK-16 PR 1 (P-490, the tech lead's ruling on #1614; C4.1, C10.1): offline checks of the generic "who" for the principal
// applicant always and each dependent child while the line's condition holds for that child
// (contracts/resolver.ts principal_and_children_when). No database, no browser, no AI; a hand-made snapshot that names
// no real form, combination or program (the data that uses it is BK-16 PR 2). The rules:
//   R1 the principal applicant gets the form, and the line's condition is never read for them;
//   R2 a spouse or partner, and a child who does not apply, never get it;
//   R3 a child gets it only when the condition holds for them (Yes), never on No;
//   R4 a child not answered yet gets no form (never "cannot tell", never an error), and the question is still asked;
//   R5 a line with no condition gives no child the form (never an error), and release warns (a warning, not an error);
//   R6 every other "who" is unchanged (each_applicant with the same condition still waits on an unanswered person).
// Sample people; US$0.
//   tsx studio/tests/check_bk16_children_when.ts
import { kkey, render, type Known, type Person } from "../engine/render.ts";
import { subjectsFor } from "../engine/resolver.ts";
import { notApplyingWhy } from "../engine/runtime/forms.ts";
import type { Participant, Answer } from "../engine/runtime/case.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { validate } from "../engine/validate.ts";
import { PRINCIPAL_CHILDREN_WHEN, WHO_HOLDERS } from "../contracts/resolver.ts";
import { WHO_WORDS } from "../contracts/lines-bulk.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };

const STUDIES = "person.studies_long";
const cond = { subjectKind: "EACH_APPLICANT", op: "eq", field: STUDIES, value: true };
const line = (form: string, who: string, condition: object | null) => ({ form_number: form, title: form, who, status: condition ? "conditional" : "always", condition, condition_plain: condition ? "the person studies for a long course" : null, min_age: null });
const snapOf = (forms: object[]) => ({
  contract_version: "combination-config/v0", combination: { key: "t", label: "t", program: "p", pathway: null, participants: [], source_basis: "SOURCE_BACKED", basis_note: null }, mode: "draft",
  canonical_fields: [{ id: STUDIES, meaning: "Studies for a long course", value_type: "boolean" }, { id: "person.school_name", meaning: "School name", value_type: "text" }, { id: "person.mother_name", meaning: "Mother's name", value_type: "text" }],
  sections: [{ id: "background", title: "Background" }],
  placements: [STUDIES, "person.school_name", "person.mother_name"].map((fact) => ({ lineage: fact, fact, section_id: "background", repeats: "per_person", collected_from: "client_questionnaire", rule_only: fact === STUDIES })),
  forms,
  field_maps: [
    { form_number: "STUDY", form_edition: "STUDY (01-2026)", entries: [{ data_path: "a", outcome: "mapped", person: "form_subject", fact: "person.school_name" }] },
    { form_number: "OTHER", form_edition: "OTHER (01-2026)", entries: [{ data_path: "b", outcome: "mapped", person: "form_subject", fact: "person.mother_name" }] },
  ],
  document_requirements: [], document_types: [], rules: [], derived_fields: [], checks: [], row_versions: {},
} as unknown as Snapshot);
const snap = snapOf([line("STUDY", PRINCIPAL_CHILDREN_WHEN, cond), line("OTHER", "each_applicant", cond)]);

const p = (id: string, role: string, applies = true): Person => ({ id, role, label: id, applies });
const family = [p("principal", "principal"), p("spouse", "spouse_or_partner"), p("child-yes", "child"), p("child-no", "child"), p("child-open", "child"), p("child-away", "child", false)];
const answers: Record<string, boolean> = { "child-yes": true, "child-no": false };
const knownOf = (a: Record<string, boolean>): Known => new Map(Object.entries(a).map(([id, v]) => [kkey(id, STUDIES), { value: v, status: "answered" as const, source: "Sample" }]));
const r = render(snap, family, knownOf(answers));
const row = (form: string, id: string) => r.forms.find((f) => f.form === form && f.person === id);
const asks = (id: string, fact: string) => r.coverage.some((c) => c.applies !== false && c.boxes.some((b) => b.about === id && b.fact === fact));
const deciding = (id: string) => r.questions.find((q) => q.about === id && q.fact === STUDIES);

ok("BK-16 R1 pass: the principal gets the form without answering its condition, and is asked its facts", row("STUDY", "principal")?.applies === true && asks("principal", "person.school_name"), row("STUDY", "principal"));
ok("BK-16 R1 fail-guard: the condition is not asked of the principal for this form", !(deciding("principal")?.decides ?? []).some((d) => d.startsWith("whether STUDY")), deciding("principal"));
ok("BK-16 R2: a spouse or partner has no row for the form at all", !row("STUDY", "spouse"), r.forms.filter((f) => f.form === "STUDY").map((f) => f.person));
ok("BK-16 R2: a child who does not apply (not travelling) has no row", !row("STUDY", "child-away"));
ok("BK-16 R2 (resolver): the line reaches the principal and each child who applies, never the spouse",
  JSON.stringify(subjectsFor(family, PRINCIPAL_CHILDREN_WHEN)) === JSON.stringify(["principal", "child-yes", "child-no", "child-open"]), subjectsFor(family, PRINCIPAL_CHILDREN_WHEN));
ok("BK-16 R3 pass: a child answered Yes gets the form and is asked its facts", row("STUDY", "child-yes")?.applies === true && asks("child-yes", "person.school_name"));
ok("BK-16 R3 fail: a child answered No gets no form and is not asked its facts", row("STUDY", "child-no")?.applies === false && !asks("child-no", "person.school_name"));
ok("BK-16 R4: a child not answered yet gets no form: applies is false (never \"cannot tell\") and nothing is missing", row("STUDY", "child-open")?.applies === false && (row("STUDY", "child-open")?.missing ?? ["x"]).length === 0 && !asks("child-open", "person.school_name"), row("STUDY", "child-open"));
ok("BK-16 R4: the question that decides it is still asked of that child, as a deciding question", deciding("child-open")?.status === "needs an answer" && (deciding("child-open")?.decides ?? []).some((d) => d === "whether STUDY applies to child-open"), deciding("child-open"));
ok("BK-16 R4: once answered, it is kept on the case for the children it decided", (deciding("child-yes")?.decides ?? []).includes("whether STUDY applies to child-yes") && (deciding("child-no")?.decides ?? []).includes("whether STUDY applies to child-no"));
// Review m2: an answer the principal gave is never kept as deciding this line for them (only for each child).
const withPrincipal = render(snap, family, knownOf({ ...answers, principal: true }));
const principalQ = withPrincipal.questions.find((q) => q.about === "principal" && q.fact === STUDIES);
ok("BK-16 R1 (review m2): the principal's own answer is never kept as deciding the line for them", !(principalQ?.decides ?? []).some((d) => d.startsWith("whether STUDY")) && withPrincipal.forms.find((f) => f.form === "STUDY" && f.person === "principal")?.applies === true, principalQ?.decides);
const why = (id: string) => row("STUDY", id)?.why ?? "";
ok("BK-16 words: each holder's reason says the rule for them", /^always for the principal applicant; for a child, only when the person studies for a long course$/.test(why("principal")) && /^for a child, when the person studies/.test(why("child-yes"))
  && /^for a child, only when the person studies for a long course$/.test(why("child-no")) && /\(not answered yet\)$/.test(why("child-open")), [why("principal"), why("child-yes"), why("child-no"), why("child-open")]);

// R6: every other "who" is unchanged: each_applicant with the same condition reaches the spouse and waits on anyone unanswered.
ok("BK-16 R6 (unchanged): each_applicant with the same condition still reaches the spouse and the principal and cannot tell while unanswered", row("OTHER", "spouse")?.applies === "cannot_tell" && row("OTHER", "principal")?.applies === "cannot_tell" && row("OTHER", "child-open")?.applies === "cannot_tell" && row("OTHER", "child-yes")?.applies === true && row("OTHER", "child-no")?.applies === false);

// R5: a line with no condition: the principal only, no child, never an error; release warns.
const bare = snapOf([line("STUDY", PRINCIPAL_CHILDREN_WHEN, null)]);
const rb = render(bare, family, knownOf(answers));
const rowB = (id: string) => rb.forms.find((f) => f.form === "STUDY" && f.person === id);
ok("BK-16 R5: with no condition the principal gets the form and no child does (Yes or not), with no \"cannot tell\"", rowB("principal")?.applies === true && ["child-yes", "child-no", "child-open"].every((c) => rowB(c)?.applies === false), rb.forms.map((f) => [f.person, f.applies]));
ok("BK-16 R5 words: a child's reason says the line has no condition", /line has no condition/.test(rowB("child-yes")?.why ?? ""), rowB("child-yes")?.why);
const types = [{ key: STUDIES, valueType: "boolean" }, { key: "person.school_name", valueType: "text" }, { key: "person.mother_name", valueType: "text" }];
const vb = validate(bare, types, []).filter((x) => x.item === "STUDY" && /no child ever gets it/.test(x.message));
ok("BK-16 R5: release warns (never an error) that no child ever gets a line with no condition", vb.length === 1 && vb[0].level === "warning", vb);
const vc = validate(snap, types, []).filter((x) => x.item === "STUDY" && /no child ever gets it/.test(x.message));
ok("BK-16 R5 fail-guard: the warning is not given when the line has its condition", vc.length === 0, vc);

// The case's words for a form a child does not get (engine/runtime/forms.ts notApplyingWhy), as the Forms list shows them.
const people: Participant[] = family.map((x) => ({ subjectId: x.id, role: x.role as Participant["role"], label: x.label, applies: x.applies }));
const ans = (id: string, v: boolean): Answer => ({ id: `a-${id}`, subjectId: id, field: STUDIES, rowKey: null, value: v, status: "DECLARED", channel: "OFFICER", actor: "Sample", at: "2026-11-12T00:00:00Z" });
const words = (fact: string) => (fact === STUDIES ? "Studies for a long course" : fact);
const caseAnswers = [ans("child-yes", true), ans("child-no", false)];
const open = notApplyingWhy(snap, people, caseAnswers, [], "STUDY", "child-open", words);
const no = notApplyingWhy(snap, people, caseAnswers, [], "STUDY", "child-no", words);
const none = notApplyingWhy(bare, people, caseAnswers, [], "STUDY", "child-yes", words);
ok("BK-16 case words: a child not answered yet reads as waiting for their answer, not as a No", /only when "Studies for a long course" is Yes; their answer is not given yet/.test(open), open);
ok("BK-16 case words: a child answered No reads as the rule's No", /only when "Studies for a long course" is Yes; their answer is not Yes/.test(no), no);
ok("BK-16 case words: with no condition on the line, the words say so", /line has no condition/.test(none), none);

ok("BK-16 contract: the who is described and worded for the Forms and Documents tabs", typeof WHO_HOLDERS[PRINCIPAL_CHILDREN_WHEN as keyof typeof WHO_HOLDERS] === "string" && /each child while its condition holds/.test(WHO_WORDS[PRINCIPAL_CHILDREN_WHEN] ?? ""));

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
