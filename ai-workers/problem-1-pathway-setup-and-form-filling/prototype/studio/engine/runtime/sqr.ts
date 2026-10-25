// The SQR tab (Screen 03 S2, concept §4): the questionnaire of one person role, read the way a case reads it. The largest
// Sample family the combination allows is run through caseView (agent mode, so every needed fact shows), and for the
// role's person each question says how it is asked, who fills it, which forms need it and the rule on it. Needed-fact
// coverage (BR-7) per role: asked of the client, filled by the case officer, and the gaps that block release.
import { render, type Person, type Role } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import { coverageGaps } from "../coverage.ts";
import { caseView, knownOf, type Participant } from "./case.ts";
import { familiesFor, familyPeople, sampleBirthDates } from "./preview.ts";
import { CLIENT_ONLY_SECTIONS, FILLED_BY, filledByOf, type FamilyKey, type FilledBy, type SqrRole, type SqrSection, type SqrView } from "../../contracts/workspace.ts";

/** The largest family the combination allows (the most people, so every role has a person). */
export function largest(s: Snapshot) {
  const participants = (s.combination.participants ?? []) as { role: string; label?: string; min?: number; max?: number; applies?: boolean }[];
  const fams = familiesFor(participants);
  const family = (fams[fams.length - 1]?.key ?? "single") as FamilyKey;
  const people = familyPeople(participants, family);
  // Every other role the combination has (a representative, a parent) gets one person too, so its facts and gaps show
  // on the SQR tab (a gap nobody can see could never be fixed there).
  for (const p of participants) if ((p.max ?? 0) > 0 && !people.some((x) => x.role === p.role)) people.push({ subjectId: p.role, role: p.role as Role, label: p.label ?? p.role, applies: p.role !== "representative" && p.applies !== false });
  return { participants, family, people };
}

export function sqrView(s: Snapshot, roleIn: string | undefined, whereUsed: Map<string, number>, today = new Date()): SqrView {
  const { participants, people } = largest(s);
  // One person per role (the first of each); the application's questions go with the principal, who answers them.
  const firstOf = new Map<string, Participant>();
  for (const p of people) if (p.role !== "case" && !firstOf.has(p.role)) firstOf.set(p.role, p);
  const answers = sampleBirthDates(s, people, today);
  const view = caseView(s, people, answers, [], "agent", today);
  const renderPeople: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies }));
  const r = render(s, renderPeople, knownOf(s, people, answers, [], today).known, { today });
  const gapsAll = coverageGaps(s);
  const mine = (person: string) => (x: string) => x === person || (person === "principal" && x === "case");
  const roles: SqrRole[] = participants.filter((p) => firstOf.has(p.role)).map((p) => {
    const person = firstOf.get(p.role)!.subjectId;
    return { role: p.role, label: p.label ?? p.role, person, questions: view.sections.filter((x) => mine(person)(x.subjectId)).reduce((n, x) => n + x.questions.length, 0), gaps: gapsAll.filter((g) => g.role === p.role || (p.role === "principal" && g.role === "the application")).length };
  });
  const role = roles.some((x) => x.role === roleIn) ? roleIn! : roles[0]?.role ?? "principal";
  const person = firstOf.get(role)?.subjectId ?? "principal";
  const field = new Map((s.canonical_fields as { id: string; meaning?: string; filled_by?: string }[]).map((f) => [f.id, f]));
  const place = new Map((s.placements as { fact: string; section_id: string; question_text?: string | null; collected_from?: string; condition_plain?: string | null; condition_effect?: string | null }[]).map((p) => [p.fact, p]));
  const selected = new Set((s.sections as { id: string }[]).map((x) => x.id));
  const titles = new Map((s.sections as { id: string; title: string }[]).map((x) => [x.id, x.title]));
  const parts = view.sections.filter((x) => mine(person)(x.subjectId));
  const byId = new Map<string, SqrSection>();
  for (const part of parts) {
    const sec = byId.get(part.section) ?? { id: part.section, title: titles.get(part.section) ?? part.title, selected: selected.has(part.section), questions: [] };
    for (const q of part.questions) {
      if (sec.questions.some((x) => x.fact === q.fact)) continue;
      const p = place.get(q.fact), f = field.get(q.fact);
      sec.questions.push({ fact: q.fact, label: q.label, asked_as: p?.question_text ?? null, meaning: f?.meaning ?? q.fact, filled_by: filledByOf(f, p), filled_by_set: !!f?.filled_by,
        client_only: (CLIENT_ONLY_SECTIONS as readonly string[]).includes(p?.section_id ?? ""), needed_by: [...new Set(q.fills.map((x) => x.form))], rule: p?.condition_plain ? `${(p.condition_effect ?? "SHOW").toLowerCase()} when ${p.condition_plain}` : null,
        group: !!q.group, required: q.required, where_used: whereUsed.get(q.fact) ?? 0 });
    }
    byId.set(part.section, sec);
  }
  // Selected sections that ask this person nothing still show (with no questions), in the configuration's order.
  for (const x of s.sections as { id: string; title: string }[]) if (!byId.has(x.id)) byId.set(x.id, { id: x.id, title: x.title, selected: true, questions: [] });
  const order = (s.sections as { id: string }[]).map((x) => x.id);
  const sections = [...byId.values()].sort((a, b) => (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999));
  // Coverage for this role's person: every fact a form field needs, by who covers it.
  const needed = new Map<string, string>();
  for (const c of r.coverage) for (const b of c.boxes) if (b.fact && b.about && mine(person)(b.about.split("/")[0]) && !b.about.includes("/")) needed.set(b.fact, b.coverage);
  const gaps = gapsAll.filter((g) => g.role === role || (role === "principal" && g.role === "the application"));
  const gapFacts = new Set(gaps.map((g) => g.fact));
  const client = [...needed.keys()].filter((f) => !gapFacts.has(f) && filledByOf(field.get(f), place.get(f)) === "CLIENT").length;
  return { roles, role, person, coverage: { needed: needed.size, client, officer: needed.size - client - [...needed.keys()].filter((f) => gapFacts.has(f)).length, gaps }, sections, not_asked: view.summary.not_asked };
}

export const filledByWords = (k: FilledBy) => FILLED_BY[k];
