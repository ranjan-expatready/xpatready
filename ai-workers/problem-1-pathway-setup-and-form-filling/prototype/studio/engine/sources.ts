// W1-15 Questions and documents, slice 1 (P-130; challenge.md M1–M6, m1, m2, Lead response 29 Oct): where the answer to
// each fact a combination's forms need comes from, per person role, worked out by rules from the snapshot:
// a document on that role's checklist that supplies it › the client › the agent. A person's choice over that default and
// the Pre-qualification tick are the snapshot's `fact_sources` (only when set). Pure: no database, no AI (US$0).
import { subjectsFor, type Person } from "./render.ts";
import { anyMapped, previewRender } from "./coverage.ts";
import type { Problem } from "./validate.ts";
import type { Snapshot } from "./snapshot.ts";

export const SOURCES = ["DOCUMENT", "CLIENT", "AGENT"] as const;
export type Source = (typeof SOURCES)[number];
/** Whom a supplied fact is about, from the holder of the document (the person the checklist line names). */
export const ABOUTS = ["holder", "holder.spouse", "holder.parent"] as const;
export type About = (typeof ABOUTS)[number];
export const SOURCE_WORDS: Record<Source, string> = { DOCUMENT: "Document", CLIENT: "Client", AGENT: "Agent" };

export type Supplier = { key: string; name: string; base: boolean };
type Req = { document_type_key?: string; document_type: string; who: string; base_or_conditional: string; condition?: any };
type DocType = { key: string; name: string; supplies_facts?: string[]; supplies_about?: Record<string, About> };

/** The facts a document type supplies, each with whom it is about (the holder unless the library says otherwise). */
export function suppliesOf(t: DocType): { fact: string; about: About }[] {
  return (t.supplies_facts ?? []).map((fact) => ({ fact, about: (t.supplies_about?.[fact] as About) ?? "holder" }));
}

const spouseOf = (people: Person[], id: string) => {
  const me = people.find((p) => p.id === id);
  if (me?.role === "principal") return people.find((p) => p.role === "spouse_or_partner")?.id ?? null;
  if (me?.role === "spouse_or_partner") return people.find((p) => p.role === "principal")?.id ?? null;
  return null;
};

/** Challenge M3: which checklist documents supply which fact about whom (per person, never combination-wide): a
 *  passport asked only of the principal supplies only the principal's facts. */
export function documentFacts(s: Snapshot, people: Person[]): Map<string, Map<string, Supplier[]>> {
  const out = new Map<string, Map<string, Supplier[]>>();
  const add = (about: string | null, fact: string, sup: Supplier) => {
    if (!about) return;
    const m = out.get(about) ?? new Map<string, Supplier[]>();
    const list = m.get(fact) ?? [];
    if (!list.some((x) => x.key === sup.key)) list.push(sup);
    m.set(fact, list); out.set(about, m);
  };
  for (const r of s.document_requirements as Req[]) {
    const t = (s.document_types as DocType[]).find((x) => x.key === r.document_type_key || x.name === r.document_type);
    if (!t) continue;
    const kind = r.condition?.subjectKind;
    if (kind === "DOCUMENT") continue;
    const holders = kind === "CASE" ? subjectsFor(people, r.who) : subjectsFor(people, r.who, kind === "EACH_APPLICANT" || kind === "EACH_PERSON" ? undefined : kind);
    const sup = { key: t.key, name: t.name, base: r.base_or_conditional === "base" };
    for (const h of holders) for (const { fact, about } of suppliesOf(t)) {
      if (about === "holder") add(h, fact, sup);
      else if (about === "holder.spouse") add(h === "case" ? null : spouseOf(people, h), fact, sup);
      else for (const n of ["parent_1", "parent_2"]) add(h === "case" ? null : `${h}/${n}`, fact, sup);
    }
  }
  // m1: a base requirement before a conditional one, then a stable order.
  for (const m of out.values()) for (const [f, list] of m) m.set(f, [...list].sort((a, b) => Number(b.base) - Number(a.base) || a.key.localeCompare(b.key)));
  return out;
}

export type FactSourceView = {
  role: string; fact: string; label: string; forms: string[];
  source: Source; document: Supplier | null; also: Supplier[];
  /** Rules (the default) or Person (a choice over it). */
  proposedBy: "Rules" | "Person";
  ruleSource: Source; ruleDocument: Supplier | null;
  prequalification: boolean; reason: string | null;
  /** P-97: placed in a section only the client answers. */
  clientOnly: boolean;
  /** A question is placed for it (the client can be asked; the fallback for a document fact). */
  placed: boolean;
};

const roleOf = (people: Person[], about: string) => about === "case" ? "case" : people.find((p) => p.id === about.split("/")[0])?.role ?? about;
const AGENT_FROM = new Set(["staff_working_view", "existing_record"]);
const isAgentFact = (fact: string) => fact.startsWith("representative.") || fact.startsWith("organisation.");

/** Every fact the combination's forms need, per person role, with where its answer comes from. The people are the
 *  combination's preview family (as the coverage gate uses), so a role the forms name is always present. */
export function factSources(s: Snapshot): FactSourceView[] {
  // Nothing mapped and nothing chosen: nothing to work out (the catalogue validates every combination).
  if (!anyMapped(s) && !(s.fact_sources ?? []).length) return [];
  const { people, r } = previewRender(s);
  const docs = documentFacts(s, people);
  const place = new Map<string, any>(); for (const p of s.placements as any[]) if (!place.has(p.fact)) place.set(p.fact, p);
  const meaning = new Map((s.canonical_fields as { id: string; meaning?: string }[]).map((f) => [f.id, f.meaning ?? f.id]));
  const chosen = new Map((s.fact_sources ?? []).map((x) => [`${x.role}|${x.fact}`, x]));
  const need = new Map<string, { role: string; fact: string; abouts: Set<string>; forms: Set<string> }>();
  for (const c of r.coverage) for (const b of c.boxes) {
    if (!b.fact || !b.about) continue;
    const role = roleOf(people, b.about), k = `${role}|${b.fact}`;
    const n = need.get(k) ?? { role, fact: b.fact, abouts: new Set<string>(), forms: new Set<string>() };
    n.abouts.add(b.about); n.forms.add(c.form); need.set(k, n);
  }
  // A tick or choice on a fact no form needs still shows, so it can be seen and cleared (validate warns).
  for (const x of chosen.values()) if (!need.has(`${x.role}|${x.fact}`)) need.set(`${x.role}|${x.fact}`, { role: x.role, fact: x.fact, abouts: new Set(), forms: new Set() });
  return [...need.values()].sort((a, b) => a.role.localeCompare(b.role) || a.fact.localeCompare(b.fact)).map((n) => {
    const p = place.get(n.fact);
    const suppliers = [...new Map([...n.abouts].flatMap((a) => docs.get(a)?.get(n.fact) ?? []).map((x) => [x.key, x])).values()].sort((a, b) => Number(b.base) - Number(a.base) || a.key.localeCompare(b.key));
    const clientOnly = !!p?.client_only;
    // Precedence (P-130): P-97 client-only › a document on this role's checklist › the agent's own facts › the client.
    const ruleSource: Source = clientOnly ? "CLIENT" : suppliers.length ? "DOCUMENT" : isAgentFact(n.fact) || n.role === "representative" || AGENT_FROM.has(p?.collected_from) ? "AGENT" : "CLIENT";
    const ruleDocument = ruleSource === "DOCUMENT" ? suppliers[0] : null;
    const c = chosen.get(`${n.role}|${n.fact}`);
    const source: Source = (c?.source as Source) ?? ruleSource;
    const document = source === "DOCUMENT" ? (c?.source === "DOCUMENT" ? suppliers.find((x) => x.key === c.document_type) ?? { key: c.document_type!, name: c.document_type!, base: false } : ruleDocument) : null;
    return { role: n.role, fact: n.fact, label: (meaning.get(n.fact) ?? n.fact).trim().replace(/\.$/, ""), forms: [...n.forms].sort(),
      source, document, also: suppliers.filter((x) => x.key !== document?.key), proposedBy: c?.source ? "Person" : "Rules", ruleSource, ruleDocument,
      prequalification: !!c?.prequalification, reason: c?.reason ?? null, clientOnly, placed: !!p && !p.rule_only };
  });
}

const ROLE_WORDS: Record<string, string> = { case: "The application", principal: "Principal applicant", spouse_or_partner: "Spouse or partner", child: "Child", representative: "Representative", sponsor: "Sponsor" };
export const who = (s: Snapshot, role: string) => ((s.combination.participants ?? []) as { role: string; label?: string }[]).find((p) => p.role === role)?.label ?? ROLE_WORDS[role] ?? role;
/** A fact in its own words for Review lines ("Organisation name"), never its system key (Lead check W1). */
export const factWords = (s: Snapshot, fact: string) => {
  const m = ((s.canonical_fields as { id: string; meaning?: string }[]).find((f) => f.id === fact)?.meaning ?? fact).trim().replace(/\.$/, "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};

/** C4.10 (P-130, challenge M2, M4, m2; Lead Q1–Q3): release refuses a source nobody can reach, a Pre-qualification tick
 *  with nothing to ask it, and a document or agent source on a client-only fact; a document fact with no fallback
 *  question is a warning when the document is always needed and an error when it is conditional. */
export function factSourceProblems(s: Snapshot): Problem[] {
  const out: Problem[] = [];
  const say = (level: "error" | "warning", f: FactSourceView, message: string) => out.push({ level, where: "Questions", item: f.fact, label: f.label, role: f.role, message: `${who(s, f.role)}: "${f.label}" ${message}` });
  for (const f of factSources(s)) {
    const person = f.proposedBy === "Person";
    if (!f.forms.length && (person || f.prequalification)) say("warning", f, "has a choice saved, but no form of this combination needs it any more. Clear it.");
    if (f.clientOnly && f.source !== "CLIENT") say("error", f, `is a declaration or background answer: only the client gives it, never ${f.source === "DOCUMENT" ? "a document" : "the agent"}. Set Comes from to Client.`);
    if (f.source === "DOCUMENT") {
      if (person && !f.also.concat(f.ruleDocument ? [f.ruleDocument] : []).some((x) => x.key === f.document?.key)) say("error", f, `comes from ${f.document?.name ?? "a document"}, but that document is not on this person's checklist or does not supply it. Add it to the Documents tab, or choose Client or Agent.`);
      else if (!f.placed) say(f.document?.base ? "warning" : "error", f, f.document?.base ? `comes from ${f.document.name}; if it cannot be read, nobody is asked for it. Add a question for it as the fallback.` : `comes from ${f.document?.name}, which is asked only in some cases: when it is not asked, nobody gives this answer. Add a question for it, or choose Client.`);
    }
    if (person && f.source === "CLIENT" && !f.placed) say("error", f, "comes from the client, but no question asks it. Add the question, or choose another source.");
    if (person && f.source === "AGENT" && !f.placed && !isAgentFact(f.fact) && f.role !== "representative") say("error", f, "comes from the agent, but no place lets the agent enter it. Add it to the case officer's view, or choose another source.");
    if (f.prequalification) {
      if (f.source === "AGENT") say("error", f, "is ticked for pre-qualification, but it comes from the agent: a prospect is asked only what they can answer. Untick it, or choose Client or Document.");
      else if (!f.placed) say("error", f, "is ticked for pre-qualification, but no question asks it, so the prospect cannot be asked. Add the question, or untick it.");
    }
  }
  return out;
}

/** PQR ⊂ SQR ∪ the client's checklist documents (Lead Q1): the ticked facts, each with how it is asked and confirmed. */
export function prequalification(s: Snapshot): { role: string; fact: string; label: string; source: Source; document: string | null }[] {
  return factSources(s).filter((f) => f.prequalification && f.source !== "AGENT" && f.placed).map((f) => ({ role: f.role, fact: f.fact, label: f.label, source: f.source, document: f.document?.name ?? null }));
}
