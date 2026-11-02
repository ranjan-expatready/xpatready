// UX-A part 1 (P-273; contracts/counts.ts): the count definitions as pure rules, a pass and a fail case each, including
// the breaker's three states (break-report-part1.md): a role no Sample family holds, a form removed before a release, a
// form attached twice or not recognised. No server, no database, no model call (US$0).
//   tsx studio/tests/check_uxa1_counts_rules.ts
import { attachedNotSetUp, factsByPerson, formsWords, personFactRows, personFactsWords, removedInDraft, removedLines, toDoWords, toFixWords } from "../contracts/counts.ts";
import { questionsFor } from "../engine/runtime/question-count.ts";
import { largest } from "../engine/runtime/questionnaires.ts";
import type { Snapshot } from "../engine/snapshot.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  UX-A1: ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };

// Forms words.
ok("forms words pass: all set up reads \"8 forms\"", formsWords({ total: 8, setUp: 8 }) === "8 forms");
ok("forms words fail case: attached, none set up reads \"2 forms · 0 set up\" (never \"0 forms\")", formsWords({ total: 2, setUp: 0 }) === "2 forms · 0 set up");
ok("badge words say what they count", toDoWords(4) === "4 to do" && toFixWords(1) === "1 to fix");

// Removed forms (break 2).
const day = (d: number) => new Date(Date.UTC(2026, 10, d));
const rows = [
  { lineageKey: "IMM 1295", status: "RETIRED", updatedAt: day(1), version: 2 }, { lineageKey: "IMM 1295", status: "PUBLISHED", updatedAt: day(1), version: 1 },
  { lineageKey: "IMM 5475", status: "RETIRED", updatedAt: day(3), version: 2 },
  { lineageKey: "IMM 5409", status: "DRAFT", updatedAt: day(3), version: 1 },
];
const release = day(2);
ok("removed pass: a removal after the last release is in this draft (Undo)", removedInDraft(rows, release).map((r) => r.lineageKey).join() === "IMM 5475");
ok("removed fail case (break 2): a removal released before is still removed, never attached-and-waiting", removedLines(rows).map((r) => r.lineageKey).sort().join() === "IMM 1295,IMM 5475");

// Attached, not set up (break 3).
const att = [
  { kind: "Form", recognised: true, edition: "IMM 5409 (09-2023)" }, { kind: "Form", recognised: true, edition: "IMM 5409 (09-2023)" },
  { kind: "Unrecognised file", recognised: false, edition: null }, { kind: "Checklist", recognised: true, edition: "IMM 5484 (05-2026)" },
  { kind: "Form", recognised: false, edition: "IMM 5645 (03-2024)" }, // re-break N1: approved in the product (P-80)
  { kind: "Form", recognised: true, edition: "IMM 1295 (12-2024)" }, { kind: "Form", recognised: true, edition: "IMM 5257 (09-2023)" },
];
const pending = attachedNotSetUp(att, ["IMM 5257", ...removedLines(rows).map((r) => r.lineageKey)]);
ok("attached pass: one row per form number not yet a line, a form approved in the product included (re-break N1)", pending.map((a) => a.edition).join() === "IMM 5409 (09-2023),IMM 5645 (03-2024)", pending);
ok("attached fail case (break 3): the same form attached twice is one form; an unknown file and a checklist are none; a removed form is not waiting", pending.length === 2);

// Form facts per person.
const roles = [{ role: "spouse_or_partner", label: "Spouse or partner", facts: 101 }, { role: "principal", label: "Principal applicant", facts: 98 }, { role: "case", label: "The application", facts: 22 }, { role: "child", label: "Child", facts: 97 }];
const by = factsByPerson(roles);
ok("facts pass: the application's facts go with the principal applicant, the total unchanged", by.find((r) => r.role === "principal")?.facts === 120 && by.reduce((n, r) => n + r.facts, 0) === 318 && !by.some((r) => r.role === "case"), by);
const rowsF = [...Array(98)].map(() => ({ role: "principal" })).concat([...Array(22)].map(() => ({ role: "case" })), [...Array(101)].map(() => ({ role: "spouse_or_partner" })));
ok("facts pass: the Questionnaires rows of a person follow the same rule (120 for the principal, 101 for the spouse)", personFactRows(rowsF, "principal").length === 120 && personFactRows(rowsF, "spouse_or_partner").length === 101);
ok("facts words name the application's share", personFactsWords(120, 22) === "120 form facts (22 of them once for the application)" && personFactsWords(101, 0) === "101 form facts");

// Questions: each fact once per section, the application's with the principal.
const view = { sections: [
  { section: "s1", subjectId: "case", questions: [{ fact: "a" }, { fact: "b" }] },
  { section: "s2", subjectId: "principal", questions: [{ fact: "c" }, { fact: "d", hidden: true }] },
  { section: "s2", subjectId: "principal", questions: [{ fact: "c" }] },
  { section: "s2", subjectId: "spouse", questions: [{ fact: "c" }] },
] };
ok("questions pass: the principal has the application's questions and their own, each fact once per section", questionsFor(view, "principal") === 4);
ok("questions fail case: a fact repeated in one section is one question; another person's are not counted", questionsFor(view, "spouse") === 1);
ok("questions: shown leaves out a question a rule hides", questionsFor(view, "principal", true) === 3);

// The largest household (break 1): a role no Sample family holds still has its person.
const snap = (participants: unknown[]) => ({ combination: { participants } }) as unknown as Snapshot;
const single = largest(snap([{ role: "principal", min: 1, max: 1 }, { role: "child", min: 0, max: 4, label: "Child" }, { role: "representative", min: 0, max: 1, label: "Representative" }]));
ok("people fail case (break 1): a combination allowing children but no spouse reads two children, as the form facts do", single.people.filter((p) => p.role === "child").length === 2 && !single.people.some((p) => p.role === "spouse_or_partner") && single.people.some((p) => p.role === "representative"), single.people.map((p) => p.subjectId));
const couple = largest(snap([{ role: "principal", min: 1, max: 1 }, { role: "spouse_or_partner", min: 0, max: 1 }, { role: "child", min: 0, max: 4 }]));
ok("people pass: a couple with children reads the Sample family as before (one spouse, two children)", couple.people.filter((p) => p.role === "child").length === 2 && couple.people.filter((p) => p.role === "spouse_or_partner").length === 1, couple.people.map((p) => p.subjectId));
const alone = largest(snap([{ role: "principal", min: 1, max: 1 }]));
ok("people pass: a principal alone reads no one else", alone.people.filter((p) => p.role !== "case").map((p) => p.role).join() === "principal");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
