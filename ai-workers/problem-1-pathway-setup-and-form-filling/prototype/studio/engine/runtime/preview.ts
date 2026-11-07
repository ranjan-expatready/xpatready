// S5 Preview (P-37, P-47; Screen 03 challenge point 1, Lead 25 Oct): a Sample family is turned into the people and
// answers of an unsaved case and read through the runtime's own caseView, so the author sees exactly what a case on
// this configuration would ask, in the same order, with the same groups and checks. Documents and forms come from the
// same render call the case reads. Pure: no database, no clock beyond `today`.
import { render, type Person } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import { caseView, knownOf, type Answer, type Participant } from "./case.ts";
import { CHANNEL_WORDS, SIGNATURE_WORDS, type Channel, type Signature } from "../../contracts/forms.ts";
import { lineOf } from "../channels.ts";
import { questionsFor } from "./question-count.ts";
import { isAskedRelative } from "./relatives.ts";
import { MINOR, ONLINE_LATER_WAVE } from "../../contracts/runtime.ts";
import { minorFromAnswers, signersOf } from "./signing.ts";
import { FAMILIES, type FamilyKey, type OutputGroup, type PreviewForm, type PreviewSets, type PreviewSign, type PreviewView } from "../../contracts/workspace.ts";
import { caseSuppliers, documentFacts, factSources, prequalification, SOURCE_WORDS, suppliesOf } from "../sources.ts";
import { FILING, sourceKey } from "../../contracts/resolver.ts"; // SH3 R8

type Line = { role: string; label?: string; min?: number; max?: number; applies?: boolean };
const limits = (participants: Line[], role: string) => { const p = participants.find((x) => x.role === role); return { min: p?.min ?? 0, max: p?.max ?? 0, label: p?.label, applies: p?.applies !== false }; };
/** The roles a Sample family is made of; any other role the combination lists (a sponsor, a representative) joins once. */
const FAMILY_ROLES = ["principal", "spouse_or_partner", "child"];

/** The families this combination's people allow (spouse and children within their fewest and most). */
export function familiesFor(participants: Line[]) {
  const sp = limits(participants, "spouse_or_partner"), ch = limits(participants, "child");
  return FAMILIES.filter((f) => f.spouse >= sp.min && f.spouse <= sp.max && f.children >= ch.min && f.children <= ch.max).map((f) => ({ key: f.key, label: f.label }));
}

/** A family's people, shaped as a runtime case's participants (the application, the principal, a spouse, children, and
 *  one of each other person the combination lists). */
export function familyPeople(participants: Line[], family: FamilyKey): Participant[] {
  const f = FAMILIES.find((x) => x.key === family)!;
  const label = (role: string, fallback: string) => limits(participants, role).label ?? fallback;
  return [
    { subjectId: "case", role: "case", label: "The application", applies: true },
    { subjectId: "principal", role: "principal", label: label("principal", "Principal applicant"), applies: true },
    ...(f.spouse ? [{ subjectId: "spouse", role: "spouse_or_partner", label: label("spouse_or_partner", "Spouse or partner"), applies: limits(participants, "spouse_or_partner").applies }] : []),
    ...Array.from({ length: f.children }, (_, i) => ({ subjectId: `child-${i + 1}`, role: "child", label: `${label("child", "Child")} ${i + 1}`, applies: limits(participants, "child").applies })),
    ...participants.filter((p) => !FAMILY_ROLES.includes(p.role) && (p.max ?? 0) > 0).map((p) => ({ subjectId: p.role, role: p.role, label: p.label ?? p.role, applies: p.applies !== false })),
  ];
}

/** Sample ages of a family's people, so a line's minimum age shows working: adults 38 and 36, children 8 then 16, any
 *  other person 45. Never a real person; the date is worked out from `today`, a month before the birthday. */
export const SAMPLE_AGES: Record<string, number> = { principal: 38, spouse: 36, "child-1": 8, "child-2": 16 };
export function sampleBirthDates(s: Snapshot, people: Participant[], today: Date, always = false): Answer[] {
  if (!always && !(s.canonical_fields as { id: string }[]).some((f) => f.id === MINOR.birthDateField)) return [];
  return people.filter((p) => p.role !== "case").map((p) => {
    const d = new Date(Date.UTC(today.getUTCFullYear() - (SAMPLE_AGES[p.subjectId] ?? 45), today.getUTCMonth(), today.getUTCDate()));
    d.setUTCMonth(d.getUTCMonth() - 1);
    return { id: `sample:${p.subjectId}|${MINOR.birthDateField}`, subjectId: p.subjectId, field: MINOR.birthDateField, rowKey: null, value: d.toISOString().slice(0, 10), status: "VERIFIED" as const, channel: "sample_family", actor: "sample", at: today.toISOString() };
  });
}

/** Tweaks are answers typed on the preview ("subject|fact" → yes or no): declared, never confirmed. */
export function tweakAnswers(tweaks: Record<string, boolean>, today: Date): Answer[] {
  return Object.entries(tweaks).map(([k, value]) => { const [subjectId, field] = k.split("|"); return { id: `tweak:${k}`, subjectId, field, rowKey: null, value, status: "DECLARED", channel: "preview", actor: "preview", at: today.toISOString() }; });
}

/** Preview (Lead Q2, P-130): whose checklist lines can supply a fact about `subjectId`: the person's own line for a fact
 *  about its holder, the partner's for a fact about the holder's spouse. C3.16 (break round 3, M1): a marked Household or
 *  Organisation fact is asked once on the case, but the checklist lines are per person, so the members whose own
 *  documents supply it count too (caseSuppliers).
 */
export function documentLineHolders(s: Snapshot, people: Person[], subjectId: string, fact: string, abouts: Set<string>, partnerOf: (id: string) => string | null): Set<string> {
  // Review 2, M1: the application's own line (who: "case") always counts for a fact on the case, marked or not (as on main).
  const from = subjectId === FILING ? [FILING, ...caseSuppliers(s, people, fact)] : [subjectId];
  return new Set(from.flatMap((m) => [abouts.has("holder") ? m : null, abouts.has("holder.spouse") ? partnerOf(m) : null]).filter((x): x is string => !!x));
}

/** The preview for one family and one person: what the client sees (caseView's output unchanged), the documents and the
 *  forms, each saying why. The family defaults to the largest one the people allow. */
/** C4.5: the Preview key prefix that tries a person's document as missing or unreadable ("missing:principal|passport…"). */
export const MISSING = "missing:";

export function previewFamily(s: Snapshot, family: FamilyKey | "", person: string, tweaks: Record<string, boolean>, today = new Date(), label = "Draft (not released)"): PreviewView {
  const participants = (s.combination.participants ?? []) as Line[];
  const families = familiesFor(participants);
  const fam = families.some((f) => f.key === family) ? (family as FamilyKey) : (families.at(-1)?.key ?? "single");
  const people = familyPeople(participants, fam);
  const renderPeople: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role, label: p.label, applies: p.applies }));
  const ids = new Set(people.map((p) => p.subjectId));
  const kept = Object.fromEntries(Object.entries(tweaks).filter(([k, v]) => !k.startsWith(MISSING) && ids.has(k.split("|")[0]) && typeof v === "boolean"));
  // C4.5 (P-130): "missing:<person>|<document type>" tries the case where that person's document is missing or cannot be
  // read: its facts are asked instead (never an answer, so it is kept apart from the yes/no tweaks).
  const missing = new Set(Object.entries(tweaks).filter(([k, v]) => k.startsWith(MISSING) && v === true && ids.has(k.slice(MISSING.length).split("|")[0])).map(([k]) => k.slice(MISSING.length)));
  const sample = sampleBirthDates(s, people, today), answers = [...sample, ...tweakAnswers(kept, today)];
  // C4.6 (re-test 3 Nov): the Sample family's ages (child 8, child 16) decide its forms and who signs even before the
  // combination asks a date of birth, so "from age 18" shows working; the questions stay as a case would get them, and
  // release still refuses a minimum age nobody is asked a date of birth for (engine/validate.ts).
  const ages = sample.length ? sample : sampleBirthDates(s, people, today, true);
  const r = render(s, renderPeople, knownOf(s, people, [...ages, ...tweakAnswers(kept, today)], [], today).known, { today });
  // Where each fact's answer comes from, per person role (W1-15 slice 1, P-130): the rules' default or a person's choice.
  const sources = new Map(factSources(s).map((f) => [sourceKey(f.role, f.fact), f]));
  const roleOf = (subjectId: string) => people.find((p) => p.subjectId === subjectId)?.role ?? subjectId;
  const docFacts = documentFacts(s, renderPeople);
  const partnerOf = (id: string) => { const me = roleOf(id), other = me === "principal" ? "spouse_or_partner" : me === "spouse_or_partner" ? "principal" : null; return other ? people.find((p) => p.role === other)?.subjectId ?? null : null; };
  // Lead Q2: the client view skips a fact a document supplies when that document is needed from its holder for this family
  // (the holder, or the partner for a partner's fact); otherwise the question is the fallback and is asked (P-130).
  const fromDocument = (subjectId: string, fact: string): string | null => {
    const f = sources.get(sourceKey(roleOf(subjectId), fact));
    if (f?.source !== "DOCUMENT" || !f.document) return null;
    const key = f.document.key, name = f.document.name;
    if (!(docFacts.get(subjectId)?.get(fact) ?? []).some((x) => x.key === key)) return null;
    // Review Minor (preview.ts:80): the needed line must be the one that supplies this fact about this person: the
    // person's own document for a fact about its holder, the partner's for a fact about the holder's spouse.
    const t = (s.document_types as Parameters<typeof suppliesOf>[0][]).find((x) => x.key === key);
    const abouts = new Set((t ? suppliesOf(t) : []).filter((x) => x.fact === fact).map((x) => x.about));
    const holders = documentLineHolders(s, renderPeople, subjectId, fact, abouts, partnerOf);
    return r.checklist.some((d) => holders.has(d.person) && d.status === "Needed" && (d.document_type_key === key || d.requirement === name) && !missing.has(`${d.person}|${key}`)) ? name : null;
  };
  // B128 (#1256, merge batch #1280, C4.1): a case asks a person's parents on their own key (engine/runtime/relatives.ts);
  // the Preview shows, counts and skips by document only the people of its Sample family (its parts, chips and the
  // passport's facts are per person), so its questionnaire leaves the relatives out, as its parts and counts do (review
  // m4 on #1256: the Preview showing the parents is a follow-up). A parent's "Family name" is never a passport fact.
  const sqrView = caseView(s, people, answers, [], "sqr", today, [], { skipDocumentFacts: fromDocument });
  const questionnaire = { ...sqrView, sections: sqrView.sections.filter((x) => !isAskedRelative(x.subjectId)), checks: sqrView.checks.filter((x) => !isAskedRelative(x.subjectId)) };
  const agentView = caseView(s, people, answers, [], "agent", today);
  // The answers that change what applies: yes/no questions from the family before any tweak (so a tweak never vanishes
  // once answered).
  const base = render(s, renderPeople, knownOf(s, people, ages, [], today).known, { today });
  const subjectOf = (about: string) => (about === "case" ? "case" : about.split("/")[0]);
  const tweakList = base.deciders.filter((d) => d.value_type === "yes_no" && !d.about.includes("/") && ids.has(subjectOf(d.about))).map((d) => {
    const key = `${subjectOf(d.about)}|${d.fact}`;
    return { key, subjectId: subjectOf(d.about), fact: d.fact, label: d.meaning, about: d.about_label, value: key in kept ? kept[key] : null };
  });
  // C4.6: each line's channel and signature as the release reads them (a line released before W1-10 included).
  const lineAt = new Map((s.forms as { form_number: string; channel?: string; signature?: string }[]).map((f) => [f.form_number, lineOf(f)]));
  // Review Major 1: a document checklist is read, never filed, so it is not a PDF a person gets.
  const checklists = new Set((s.forms as { form_number: string; form_kind?: string | null }[]).filter((f) => f.form_kind === "document").map((f) => f.form_number));
  const channelOf = new Map([...lineAt].map(([k, v]) => [k, v.channel]));
  const chosen = people.some((p) => p.subjectId === person && p.role !== "case") ? person : "principal";
  // The application's own questions, documents and forms are shown with the principal applicant, who answers them.
  const mine = (id: string) => (x: string) => x === id || (id === "principal" && x === "case");
  // The one count (journey item 8): every question for the person in the agent view, hidden ones included, as the
  // Questionnaires tab counts its chip; `asked` is what the client is asked of them.
  // UX-A part 1: counted by the one function the Questionnaires chips use (each fact once per section).
  const count = (v: typeof questionnaire, id: string, shown: boolean) => questionsFor(v, id, shown);
  // C4.6: a form filed for the application (its rule is about the case) or once per couple is its own group, shown once
  // with the person who files it; every other form by its filing channel.
  const formDef = new Map((s.forms as { form_number: string; who: string; signed_by?: string; condition?: { subjectKind?: string } | null }[]).map((f) => [f.form_number, f]));
  const groupOf = (form: string, ch: Channel): OutputGroup => { const d = formDef.get(form); return d?.who === "case" || d?.condition?.subjectKind === "CASE" ? "APPLICATION" : d?.who === "couple_once" ? "COUPLE" : ch; };
  // C4.6 (IRCC-P2-06, P2-09): who signs each form and how, by the resolver's one rule (R7 via signersOf).
  const minor = minorFromAnswers(ages, today);
  const signOf = (form: string, subject: string): PreviewSign | null => {
    const d = formDef.get(form), ch = channelOf.get(form) ?? "PDF_UPLOAD", sig: Signature = lineAt.get(form)?.signature ?? "NONE";
    if (!d) return null;
    return signWords(ch, sig, checklists.has(form), signersOf(renderPeople, subject, d.who, d.signed_by, minor), roleOf(subject), minor(subject), people.find((p) => p.subjectId === subject)?.label);
  };
  const entry = (f: (typeof r.forms)[number], subject: string): PreviewForm => {
    const ch = channelOf.get(f.form) ?? "PDF_UPLOAD", sig: Signature = lineAt.get(f.form)?.signature ?? "NONE";
    return { form: f.form, title: f.title, applies: f.applies, why: f.why, channel: ch, channelWords: ch === "ONLINE" ? ONLINE_LATER_WAVE : CHANNEL_WORDS[ch], noRule: !!(f as { no_rule?: boolean }).no_rule, group: groupOf(f.form, ch), ...outputOf(ch, sig, checklists.has(f.form)), sign: signOf(f.form, subject) };
  };
  // C4.6 (IRCC-P2-09): the representative files no form of their own but signs each applicant's form a line says "the
  // person and the representative" sign: their preview lists each such form once, naming whose forms they sign.
  const signedForOthers = (id: string): PreviewForm[] => {
    if (roleOf(id) !== "representative") return [];
    const byForm = new Map<string, (typeof r.forms)[number][]>();
    for (const f of r.forms) if (f.applies !== false && f.person !== id && formDef.get(f.form)?.signed_by === "person_and_representative" && !checklists.has(f.form)) byForm.set(f.form, [...(byForm.get(f.form) ?? []), f]);
    return [...byForm].map(([form, rows]) => {
      const e = entry(rows[0], rows[0].person), whose = [...new Set(rows.map((x) => x.person_label))].join(", ");
      const applies = rows.some((x) => x.applies === true) ? true : "cannot_tell" as const;
      return { ...e, applies, noRule: rows.every((x) => !!(x as { no_rule?: boolean }).no_rule), why: `Signed by the representative on each applicant's own ${form}: ${whose}. ${rows[0].why}`, sign: e.sign ? { by: `The representative, with ${whose}`, how: e.sign.how } : null };
    });
  };
  const forPerson = (id: string) => ({
    documents: r.checklist.filter((d) => mine(id)(d.person) && d.status !== "Not needed"),
    forms: [...r.forms.filter((f) => mine(id)(f.person) && f.applies !== false).map((f) => entry(f, f.person === "case" ? id : f.person)), ...signedForOthers(id)],
    questions: count(agentView, id, false),
    asked: count(questionnaire, id, true),
  });
  const fromWords = (subjectId: string, fact: string, collected: string) => {
    const f = sources.get(sourceKey(roleOf(subjectId), fact));
    if (!f) return collected === "client_questionnaire" || collected === "profile_record" ? SOURCE_WORDS.CLIENT : SOURCE_WORDS.AGENT;
    return f.source === "DOCUMENT" ? `${SOURCE_WORDS.DOCUMENT} · ${f.document?.name ?? "a document"}` : SOURCE_WORDS[f.source];
  };
  // Lead Q1: the information line only ("Passport fills 7 answers"): every answer of the person a needed document fills,
  // whether the client view would otherwise ask it or the case officer enters it from the document.
  const filledByDocuments = (id: string) => {
    const by = new Map<string, string[]>();
    for (const x of agentView.sections.filter((x) => mine(id)(x.subjectId))) for (const q of x.questions) {
      const doc = fromDocument(x.subjectId, q.fact);
      if (doc && !(by.get(doc) ?? []).includes(q.label)) by.set(doc, [...(by.get(doc) ?? []), q.label]);
    }
    return [...by].map(([document, facts]) => ({ document, facts }));
  };
  // C4.5: the person's needed documents that supply a fact, each one the author can try as missing (and back).
  const missingChoices = (id: string) => {
    const supplying = new Set((s.document_types as Parameters<typeof suppliesOf>[0][]).filter((t) => suppliesOf(t).length).map((t) => t.key));
    const seen = new Map<string, { key: string; document: string; marked: boolean }>();
    for (const d of r.checklist) if (d.person === id && d.status === "Needed" && d.document_type_key && supplying.has(d.document_type_key) && !seen.has(d.document_type_key))
      seen.set(d.document_type_key, { key: `${MISSING}${id}|${d.document_type_key}`, document: d.requirement, marked: missing.has(`${id}|${d.document_type_key}`) });
    return [...seen.values()];
  };
  const chosenRole = roleOf(chosen);
  const sets: PreviewSets = {
    pqr: prequalification(s).filter((t) => t.role === chosenRole || (chosenRole === "principal" && t.role === "case")).map((t) => ({ fact: t.fact, label: t.label, from: t.source === "DOCUMENT" ? `${SOURCE_WORDS.DOCUMENT} · ${t.document ?? "a document"}` : SOURCE_WORDS.CLIENT })),
    sqr: { asked: count(questionnaire, chosen, true), fromDocuments: filledByDocuments(chosen), missing: missingChoices(chosen) },
    agent: {
      questions: count(agentView, chosen, false),
      sections: agentView.sections.filter((x) => mine(chosen)(x.subjectId)).map((x) => ({ section: x.section, title: x.title, about: x.about_label,
        questions: x.questions.map((q) => ({ fact: q.fact, label: q.label, from: fromWords(x.subjectId, q.fact, q.collected_from), hidden: q.hidden })) })),
    },
  };
  return {
    label, families, family: fam, person: chosen,
    people: people.filter((p) => p.role !== "case").map((p) => { const x = forPerson(p.subjectId); return { subjectId: p.subjectId, role: p.role, label: p.label, questions: x.questions, asked: x.asked, documents: x.documents.length, forms: x.forms.length }; }),
    questionnaire,
    documents: forPerson(chosen).documents.map((d) => ({ requirement: d.requirement, status: d.status, why: d.why, provided_by: d.provided_by })),
    forms: forPerson(chosen).forms,
    tweaks: tweakList,
    sets,
  };
}

/** C4.6 (P-62 §7, P-102, P-143): what one form line gives the person, in words: its signature ("PDF to sign" when a
 *  person signs it by hand or in pen) and, for an Online line, that the portal screens come in a later wave. Extra
 *  fields on the preview form (contracts/workspace.ts is builder B1's file; the web reads them as optional). */
export const LATER_WAVE_ONLINE = "Typed into the IRCC account from the answer sheet by the case officer. The product makes no PDF for it: portal screens come with the browser extension in a later wave.";
export function outputOf(ch: Channel, sig: Signature, checklist = false): { signature: Signature; signatureWords: string; toSign: boolean; laterWave: string | null; checklist: boolean } {
  if (checklist) return { signature: "NONE", signatureWords: SIGNATURE_WORDS.NONE, toSign: false, laterWave: null, checklist: true };
  return { signature: sig, signatureWords: SIGNATURE_WORDS[sig], toSign: sig === "HAND_SCANNED" || sig === "PEN", laterWave: ch === "ONLINE" ? LATER_WAVE_ONLINE : null, checklist: false };
}

/** C4.6: "how" a form is signed, in words, by its line's signature. */
export const SIGN_HOW: Record<Signature, string> = {
  HAND_SCANNED: "By hand on the printed PDF, then scanned and uploaded",
  PEN: "In pen on the printed form, then mailed",
  TYPED_NAME: "By typing their name on the form",
  NONE: "On the form; how it is signed is not set on this line yet",
};
/** C4.6 (IRCC-P2-06, VV-R09): anyone under 18 has their form signed by a parent or legal guardian. Guide 5256, "To
 *  complete your form": "If you are less than 18 years of age, your form must be signed by one of your parents or a legal
 *  guardian." (page date 2026-03-31; read 2026-11-01; product/compliance-trace.md). */
export const GUARDIAN_WORDS = "A parent or legal guardian, for them (under 18)";
/** Who signs one form for one person and how, in words, from the signers R7 names ("person", "parent", "principal",
 *  "representative"; engine/runtime/signing.ts). Null when nobody signs it: a checklist, Not needed, a line set to No
 *  signature, or an Online line with no method (the portal's own declaration, not ours to record). A minor is never their
 *  own signer: a parent or legal guardian signs for them (IRCC-P2-06); the line's Sample rule "a parent, for a minor"
 *  names the principal as that parent. */
export function signWords(ch: Channel, sig: Signature, checklist: boolean, signers: string[], role: string, isMinor: boolean | undefined, label?: string): PreviewSign | null {
  if (checklist || ch === "NOT_NEEDED" || !signers.length || (ch === "ONLINE" && sig === "NONE")) return null;
  const self = role === "principal" ? "The principal applicant themselves" : `${label ?? "The person"} themselves`;
  const words = signers.map((w) => w === "person" ? (isMinor ? GUARDIAN_WORDS : self) : w === "parent" ? "The principal applicant, as their parent (under 18)" : w === "principal" ? "The principal applicant, for the family" : w === "representative" ? "the representative" : w);
  const by = [...new Set(words)].join(" and ");
  return { by: by.charAt(0).toUpperCase() + by.slice(1), how: SIGN_HOW[sig] };
}
