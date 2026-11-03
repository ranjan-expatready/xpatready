// S5 Questionnaires tab, slice 2 (P-119, Screen 03 challenge point 3; early-look fix 3): the questionnaire of one person
// role, read the way a case reads it. The largest Sample family the combination allows is run through caseView (agent
// mode, so every needed fact shows); for the role's person each question gives its wording, who fills it (from the
// question's placement, read-only here: C4.9 changes it in the library), the rule on it and the forms that need it.
// Coverage per person: asked of the client, filled by the case officer, and the gaps that block release. Field codes
// travel only for the side panel. Pure.
import { factName, render, type Person } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import { coverageGaps } from "../coverage.ts";
import { caseView, knownOf, type Participant } from "./case.ts";
import { familiesFor, familyPeople, sampleBirthDates } from "./preview.ts";
import { questionsFor } from "./question-count.ts";
import type { RoleQuestions } from "../../contracts/counts.ts";
import { filledByOf, type FamilyKey, type QuestionnaireRole, type QuestionnaireSection, type QuestionnairesView } from "../../contracts/workspace.ts";

type Line = { role: string; label?: string; min?: number; max?: number; applies?: boolean };
type Placement = { fact: string; section_id: string; question_text?: string | null; help_text?: string | null; collected_from?: string; condition_plain?: string | null; condition_effect?: string | null; repeats?: string };

/** The largest family the combination allows, with every other role it lists joining once. */
export function largest(s: Snapshot) {
  const participants = (s.combination.participants ?? []) as Line[];
  const fams = familiesFor(participants);
  const family = (fams.at(-1)?.key ?? "single") as FamilyKey;
  // UX-A part 1 (break 1): the Sample families have no single parent with children, so a combination allowing a child
  // but no spouse lost its Child chip and every count of the child's questions while the form facts (coverage's largest
  // household: each role allowed, two children at most) still counted them. The missing people join here, as coverage
  // reads the household, so questions and form facts count the same people.
  const people = familyPeople(participants, family);
  const lim = (role: string) => participants.find((p) => p.role === role);
  const sp = lim("spouse_or_partner"), ch = lim("child");
  if ((sp?.max ?? 0) > 0 && !people.some((p) => p.role === "spouse_or_partner")) people.splice(2, 0, { subjectId: "spouse", role: "spouse_or_partner", label: sp?.label ?? "Spouse or partner", applies: sp?.applies !== false });
  const kids = Math.min(ch?.max ?? 0, 2), have = people.filter((p) => p.role === "child").length;
  const at = people.findIndex((p) => !["case", "principal", "spouse_or_partner", "child"].includes(p.role));
  for (let i = have; i < kids; i++) people.splice(at < 0 ? people.length : at + (i - have), 0, { subjectId: `child-${i + 1}`, role: "child", label: `${ch?.label ?? "Child"} ${i + 1}`, applies: ch?.applies !== false });
  return { participants, family, people };
}

/** One person per role (the first of each) of the largest family, read through caseView in agent mode, so every
 *  needed question shows. */
function agentRead(s: Snapshot, today: Date) {
  const { participants, people } = largest(s);
  // One person per role (the first of each); the application's questions go with the principal, who answers them.
  const firstOf = new Map<string, Participant>();
  for (const p of people) if (p.role !== "case" && !firstOf.has(p.role)) firstOf.set(p.role, p);
  const answers = sampleBirthDates(s, people, today);
  const view = caseView(s, people, answers, [], "agent", today);
  return { participants, people, firstOf, answers, view };
}
const rolesOf = (r: ReturnType<typeof agentRead>): RoleQuestions[] => r.participants.filter((p) => r.firstOf.has(p.role))
  .map((p) => ({ role: p.role, label: p.label ?? p.role, questions: questionsFor(r.view, r.firstOf.get(p.role)!.subjectId) }));

/** UX-A part 1 (contracts/counts.ts): the one question count. Per person role, the questions of that role's
 *  questionnaire (the Questionnaires chips); `total`, their sum (the Overview, the setup strip, the Programs panel). */
export function questionCounts(s: Snapshot, today = new Date()): { roles: RoleQuestions[]; total: number } {
  const roles = rolesOf(agentRead(s, today));
  return { roles, total: roles.reduce((n, r) => n + r.questions, 0) };
}

/** `libraryTitles` (QA-172): every library section's title by key, for a question placed in a section the combination
 *  has not chosen (its snapshot carries only the chosen ones); without it the section showed its raw key. */
export function questionnairesView(s: Snapshot, roleIn: string | undefined, whereUsed: Map<string, number>, today = new Date(), libraryTitles: Map<string, string> = new Map()): QuestionnairesView {
  const read = agentRead(s, today);
  const { participants, people, firstOf, answers, view } = read;
  const renderPeople: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role, label: p.label, applies: p.applies }));
  const r = render(s, renderPeople, knownOf(s, people, answers, [], today).known, { today });
  const gapsAll = coverageGaps(s);
  const mine = (person: string) => (x: string) => x === person || (person === "principal" && x === "case");
  const gapsOf = (role: string) => gapsAll.filter((g) => g.role === role || (role === "principal" && g.role === "the application"));
  const roles: QuestionnaireRole[] = rolesOf(read).map((r) => ({ ...r, gaps: gapsOf(r.role).length }));
  const role = roles.some((x) => x.role === roleIn) ? roleIn! : roles[0]?.role ?? "principal";
  const person = firstOf.get(role)?.subjectId ?? "principal";
  const field = new Map((s.canonical_fields as { id: string; meaning?: string; value_type?: string }[]).map((f) => [f.id, f]));
  const place = new Map((s.placements as Placement[]).map((p) => [p.fact, p]));
  const titles = new Map((s.sections as { id: string; title: string }[]).map((x) => [x.id, x.title]));
  const byId = new Map<string, QuestionnaireSection>();
  for (const part of view.sections.filter((x) => mine(person)(x.subjectId))) {
    const sec = byId.get(part.section) ?? { id: part.section, title: titles.get(part.section) ?? libraryTitles.get(part.section) ?? part.title, questions: [] };
    for (const q of part.questions) {
      if (sec.questions.some((x) => x.fact === q.fact)) continue;
      const p = place.get(q.fact), f = field.get(q.fact);
      sec.questions.push({
        fact: q.fact, wording: p?.question_text?.trim() || factName(q.fact), asked: !!p?.question_text?.trim(), meaning: f?.meaning ?? q.label, help: p?.help_text ?? null, answerType: f?.value_type ?? "text",
        filledBy: filledByOf(p), onlyIf: p?.condition_plain ? `${(p.condition_effect ?? "SHOW") === "HIDE" ? "Hidden when" : "Only if"} ${p.condition_plain}` : null,
        neededBy: [...new Set(q.fills.map((x) => x.form))], group: !!q.group, required: q.required, whereUsed: whereUsed.get(q.fact) ?? 0, collectedFrom: p?.collected_from ?? null,
      });
    }
    byId.set(part.section, sec);
  }
  // Sections the combination uses that ask nobody anything still show, in the configuration's order (P-174: the section
  // choice decides which empty sections show; this is where one is removed). QA-117: a section that asks another person
  // (or the application, with the principal) is theirs, not an empty section of this person.
  const askedSomeone = new Set(view.sections.filter((x) => x.questions.length).map((x) => x.section));
  for (const x of s.sections as { id: string; title: string }[]) if (!byId.has(x.id) && !askedSomeone.has(x.id)) byId.set(x.id, { id: x.id, title: x.title, questions: [] });
  const order = (s.sections as { id: string }[]).map((x) => x.id);
  const sections = [...byId.values()].sort((a, b) => (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999));
  // Coverage for this person: every fact a form field needs, by who covers it.
  const needed = new Set<string>();
  for (const c of r.coverage) for (const b of c.boxes) if (b.fact && b.about && !b.about.includes("/") && mine(person)(b.about)) needed.add(b.fact);
  const gaps = gapsOf(role);
  const gapFacts = new Set(gaps.map((g) => g.fact));
  const covered = [...needed].filter((f) => !gapFacts.has(f));
  const client = covered.filter((f) => filledByOf(place.get(f)) === "CLIENT").length;
  return {
    roles, role,
    coverage: { needed: needed.size, client, officer: covered.length - client, gaps: gaps.map((g) => ({ fact: g.fact, meaning: field.get(g.fact)?.meaning ?? g.fact, forms: g.forms, boxes: g.boxes })) },
    sections, notAsked: view.summary.not_asked,
  };
}
