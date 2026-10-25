// Preview by person (Screen 03 S1, BR-15, challenge point 1): a Sample family is turned into the people and answers of an
// unsaved case and read through the runtime's own caseView, so the author sees exactly what a case on this configuration
// would ask, in the same order, with the same groups and checks. Documents and forms come from the same render call the
// case reads. Pure: no database, no clock beyond `today`.
import { render, type Person, type Role } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import { caseView, knownOf, type Answer, type Participant } from "./case.ts";
import { CHANNEL_WORDS, type Channel } from "../../contracts/forms.ts";
import { MINOR } from "../../contracts/runtime.ts";
import { FAMILIES, type FamilyKey, type PreviewView } from "../../contracts/workspace.ts";

type Line = { role: string; label?: string; min?: number; max?: number };
const limits = (participants: Line[], role: string) => { const p = participants.find((x) => x.role === role); return { min: p?.min ?? 0, max: p?.max ?? 0, label: p?.label }; };

/** The families this combination's people allow (spouse and children within their minimum and maximum). */
export function familiesFor(participants: Line[]) {
  const sp = limits(participants, "spouse_or_partner"), ch = limits(participants, "child");
  return FAMILIES.filter((f) => f.spouse >= sp.min && f.spouse <= sp.max && f.children >= ch.min && f.children <= ch.max).map((f) => ({ key: f.key, label: f.label }));
}

/** A family's people, shaped as a runtime case's participants (the application, the principal, a spouse, children). */
export function familyPeople(participants: Line[], family: FamilyKey): Participant[] {
  const f = FAMILIES.find((x) => x.key === family)!;
  const label = (role: string, fallback: string) => limits(participants, role).label ?? fallback;
  return [
    { subjectId: "case", role: "case", label: "The application", applies: true },
    { subjectId: "principal", role: "principal", label: label("principal", "Principal applicant"), applies: true },
    ...(f.spouse ? [{ subjectId: "spouse", role: "spouse_or_partner" as const, label: label("spouse_or_partner", "Spouse or partner"), applies: true }] : []),
    ...Array.from({ length: f.children }, (_, i) => ({ subjectId: `child-${i + 1}`, role: "child" as const, label: `${label("child", "Child")} ${i + 1}`, applies: true })),
    // A combination with a sponsor (Sample role, S2) previews every family with one; the sponsor files no application.
    ...(limits(participants, "sponsor").max ? [{ subjectId: "sponsor", role: "sponsor" as const, label: label("sponsor", "Sponsor"), applies: false }] : []),
  ];
}

/** Sample ages of a family's people (Lead early look S1, change 1), so a line's minimum age shows working: adults 38 and
 *  36, children 8 then 16, a sponsor 45. Never a real person; the date is worked out from `today` a month before the birthday. */
export const SAMPLE_AGES: Record<string, number> = { principal: 38, spouse: 36, "child-1": 8, "child-2": 16, sponsor: 45 };
export function sampleBirthDates(s: Snapshot, people: Participant[], today: Date): Answer[] {
  if (!(s.canonical_fields as { id: string }[]).some((f) => f.id === MINOR.birthDateField)) return [];
  return people.filter((p) => SAMPLE_AGES[p.subjectId] !== undefined).map((p) => {
    const d = new Date(Date.UTC(today.getUTCFullYear() - SAMPLE_AGES[p.subjectId], today.getUTCMonth(), today.getUTCDate()));
    d.setUTCMonth(d.getUTCMonth() - 1);
    return { id: `sample:${p.subjectId}|${MINOR.birthDateField}`, subjectId: p.subjectId, field: MINOR.birthDateField, rowKey: null, value: d.toISOString().slice(0, 10), status: "VERIFIED" as const, channel: "sample_family", actor: "sample", at: today.toISOString() };
  });
}

/** Tweaks are answers typed on the preview ("subject|fact" → yes or no): declared, never confirmed. */
export function tweakAnswers(tweaks: Record<string, boolean>, today: Date): Answer[] {
  return Object.entries(tweaks).map(([k, value]) => { const [subjectId, field] = k.split("|"); return { id: `tweak:${k}`, subjectId, field, rowKey: null, value, status: "DECLARED", channel: "preview", actor: "preview", at: today.toISOString() }; });
}

/** The whole preview for one family, one person and one mode ("sqr": what the client sees; "agent": every fact and the
 *  form fields it fills). The questionnaire is caseView's output unchanged. */
export function previewFamily(s: Snapshot, family: FamilyKey, person: string, mode: "sqr" | "agent", tweaks: Record<string, boolean>, today = new Date(), label = "Draft preview (not released)"): PreviewView {
  const participants = (s.combination.participants ?? []) as Line[];
  const families = familiesFor(participants);
  const fam = families.some((f) => f.key === family) ? family : (families[0]?.key ?? "single");
  const people = familyPeople(participants, fam);
  const renderPeople: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies }));
  const ids = new Set(people.map((p) => p.subjectId));
  const kept = Object.fromEntries(Object.entries(tweaks).filter(([k, v]) => ids.has(k.split("|")[0]) && typeof v === "boolean"));
  const sample = sampleBirthDates(s, people, today), answers = [...sample, ...tweakAnswers(kept, today)];
  const questionnaire = caseView(s, people, answers, [], mode, today);
  const r = render(s, renderPeople, knownOf(s, people, answers, [], today).known, { today });
  // The tweaks: yes/no questions that decide what applies, from the family before any tweak (so a tweak never vanishes
  // once answered).
  const base = render(s, renderPeople, knownOf(s, people, sample, [], today).known, { today });
  const subjectOf = (about: string) => (about === "case" ? "case" : about.split("/")[0]);
  const tweakList = base.deciders.filter((d) => d.value_type === "yes_no" && !d.about.includes("/") && ids.has(subjectOf(d.about))).map((d) => {
    const key = `${subjectOf(d.about)}|${d.fact}`;
    return { key, subjectId: subjectOf(d.about), fact: d.fact, label: d.meaning, about: d.about_label, value: key in kept ? kept[key] : null };
  });
  const channelOf = new Map((s.forms as { form_number: string; channel?: Channel }[]).map((f) => [f.form_number, f.channel ?? "PDF_UPLOAD"]));
  const chosen = people.some((p) => p.subjectId === person && p.role !== "case") ? person : "principal";
  // The application's own questions, documents and forms are shown with the principal applicant, who answers them.
  const mine = (id: string) => (x: string) => x === id || (id === "principal" && x === "case");
  const forPerson = (id: string) => ({
    documents: r.checklist.filter((d) => mine(id)(d.person) && d.status !== "Not needed"),
    forms: r.forms.filter((f) => mine(id)(f.person) && f.applies !== false),
    questions: questionnaire.sections.filter((x) => mine(id)(x.subjectId)).reduce((n, x) => n + x.questions.length, 0),
  });
  return {
    label, families, family: fam, person: chosen, mode,
    people: people.filter((p) => p.role !== "case").map((p) => { const x = forPerson(p.subjectId); return { subjectId: p.subjectId, role: p.role, label: p.label, questions: x.questions, documents: x.documents.length, forms: x.forms.length }; }),
    questionnaire,
    documents: forPerson(chosen).documents.map((d) => ({ requirement: d.requirement, status: d.status, why: d.why, provided_by: d.provided_by })),
    forms: forPerson(chosen).forms.map((f) => { const ch = channelOf.get(f.form) ?? "PDF_UPLOAD"; return { form: f.form, title: f.title, applies: f.applies, why: f.why, channel: ch, channelWords: CHANNEL_WORDS[ch] }; }),
    tweaks: tweakList,
  };
}
