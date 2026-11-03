// W1-15 Questions and documents, slice 1 (P-130; challenge.md M1–M6, m1, m2, Lead response 29 Oct): where the answer to
// each fact a combination's forms need comes from, per person role, worked out by rules from the snapshot:
// a document on that role's checklist that supplies it › the client › the case officer. A person's choice over that default and
// the Pre-qualification tick are the snapshot's `fact_sources` (only when set). Pure: no database, no AI (US$0).
// SH3 (P-258): whose fact and who signs come from the one resolver (contracts/resolver.ts).
import { documentRole, documentSubjects, formSigners, lineHolders, roleOf, signsForOthers, type Person } from "./resolver.ts";
import { DOCUMENT_ABOUTS, sourceKey, type DocumentAbout } from "../contracts/resolver.ts";
import { anyMapped, previewRender } from "./coverage.ts";
import type { Problem } from "./validate.ts";
import type { Snapshot } from "./snapshot.ts";
import { lineOf } from "./channels.ts";
import { ProposalItem } from "../contracts/proposal-item.ts";

export const SOURCES = ["DOCUMENT", "CLIENT", "AGENT"] as const;
export type Source = (typeof SOURCES)[number];
/** Whom a supplied fact is about, from the holder of the document (the person the checklist line names): resolver R11. */
export const ABOUTS = DOCUMENT_ABOUTS;
export type About = DocumentAbout;
/** P-154: the words people read; AGENT stays the internal name (no data migration for a name). */
export const SOURCE_WORDS: Record<Source, string> = { DOCUMENT: "Document", CLIENT: "Client", AGENT: "Case officer" };

export type Supplier = { key: string; name: string; base: boolean };
type Req = { document_type_key?: string; document_type: string; who: string; base_or_conditional: string; condition?: any };
type DocType = { key: string; name: string; supplies_facts?: string[]; supplies_about?: Record<string, About> };

/** The facts a document type supplies, each with whom it is about (the holder unless the library says otherwise). */
export function suppliesOf(t: DocType): { fact: string; about: About }[] {
  return (t.supplies_facts ?? []).map((fact) => ({ fact, about: (t.supplies_about?.[fact] as About) ?? "holder" }));
}

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
    // Q2 (#325): the holders are the line's own "who" (lineHolders), whatever its condition is about.
    const holders = lineHolders(people, r.who);
    const sup = { key: t.key, name: t.name, base: r.base_or_conditional === "base" };
    for (const h of holders) for (const { fact, about } of suppliesOf(t)) for (const a of documentSubjects(people, h, about)) add(a, fact, sup);
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
  /** P-155(3): why the case officer enters a fact that is not a case officer's own (required for that choice). */
  sourceReason: string | null;
  /** P-97: placed in a section only the client answers. */
  clientOnly: boolean;
  /** A question is placed for it (the client can be asked; the fallback for a document fact). */
  placed: boolean;
  /** The case officer is offered as its source by default (agentRefusal without a reason). */
  agentOffered: boolean;
};

/** The one rule for the case officer as a source (P-155(3), founder 29 Oct): offered by default only for the case
 *  officer's own facts (the representative's, the office's and the case's); any other fact only with a written reason,
 *  shown on the row and named on Review for the second person at release; never a declaration (its own refusal). The
 *  save, the bulk change, the release check and the screen all read this. */
export const CASE_OFFICER_NEEDS_REASON = "The case officer enters only the representative's, the office's and the case's own details. To have the case officer enter this answer, write why; a second person reviews it at release.";
const REASON_MIN = 5;
/** QA-95: a reason was written but is too short to say anything; the words say what is missing, not that nothing was written. */
export const CASE_OFFICER_REASON_SHORT = `Write at least ${REASON_MIN} characters: why the case officer enters it.`;
export function agentRefusal(f: Pick<FactSourceView, "ruleSource" | "clientOnly">, reason?: string | null): string | null {
  if (f.clientOnly || f.ruleSource === "AGENT") return null;
  const n = (reason ?? "").trim().length;
  return n >= REASON_MIN ? null : n ? CASE_OFFICER_REASON_SHORT : CASE_OFFICER_NEEDS_REASON;
}

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
  const chosen = new Map((s.fact_sources ?? []).map((x) => [sourceKey(x.role, x.fact), x]));
  const need = new Map<string, { role: string; fact: string; abouts: Set<string>; forms: Set<string> }>();
  for (const c of r.coverage) for (const b of c.boxes) {
    if (!b.fact || !b.about) continue;
    const role = roleOf(people, b.about), k = sourceKey(role, b.fact);
    const n = need.get(k) ?? { role, fact: b.fact, abouts: new Set<string>(), forms: new Set<string>() };
    n.abouts.add(b.about); n.forms.add(c.form); need.set(k, n);
  }
  // A tick or choice on a fact no form needs still shows, so it can be seen and cleared (validate warns).
  for (const x of chosen.values()) if (!need.has(sourceKey(x.role, x.fact))) need.set(sourceKey(x.role, x.fact), { role: x.role, fact: x.fact, abouts: new Set(), forms: new Set() });
  return [...need.values()].sort((a, b) => a.role.localeCompare(b.role) || a.fact.localeCompare(b.fact)).map((n) => {
    const p = place.get(n.fact);
    const suppliers = [...new Map([...n.abouts].flatMap((a) => docs.get(a)?.get(n.fact) ?? []).map((x) => [x.key, x])).values()].sort((a, b) => Number(b.base) - Number(a.base) || a.key.localeCompare(b.key));
    const clientOnly = !!p?.client_only;
    // Precedence (P-130): P-97 client-only › a document on this role's checklist › the agent's own facts › the client.
    const ruleSource: Source = clientOnly ? "CLIENT" : suppliers.length ? "DOCUMENT" : isAgentFact(n.fact) || n.role === "representative" || AGENT_FROM.has(p?.collected_from) ? "AGENT" : "CLIENT";
    const ruleDocument = ruleSource === "DOCUMENT" ? suppliers[0] : null;
    const c = chosen.get(sourceKey(n.role, n.fact));
    const source: Source = (c?.source as Source) ?? ruleSource;
    const document = source === "DOCUMENT" ? (c?.source === "DOCUMENT" ? suppliers.find((x) => x.key === c.document_type) ?? { key: c.document_type!, name: c.document_type!, base: false } : ruleDocument) : null;
    return { role: n.role, fact: n.fact, label: (meaning.get(n.fact) ?? n.fact).trim().replace(/\.$/, ""), forms: [...n.forms].sort(),
      source, document, also: suppliers.filter((x) => x.key !== document?.key), proposedBy: c?.source ? "Person" : "Rules", ruleSource, ruleDocument,
      prequalification: !!c?.prequalification, reason: c?.reason ?? null, sourceReason: c?.source === "AGENT" ? c?.source_reason ?? null : null, clientOnly, placed: !!p && !p.rule_only,
      agentOffered: !clientOnly && agentRefusal({ ruleSource, clientOnly }) === null };
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
    if (f.clientOnly && f.source !== "CLIENT") say("error", f, `is a declaration or background answer: only the client gives it, never ${f.source === "DOCUMENT" ? "a document" : "the case officer"}. Set Comes from to Client.`);
    if (f.source === "DOCUMENT") {
      if (person && !f.also.concat(f.ruleDocument ? [f.ruleDocument] : []).some((x) => x.key === f.document?.key)) say("error", f, `comes from ${f.document?.name ?? "a document"}, but that document is not on this person's checklist or does not supply it. Add it to the Documents tab, or choose Client or Case officer.`);
      else if (!f.placed) say(f.document?.base ? "warning" : "error", f, f.document?.base ? `comes from ${f.document.name}; if it cannot be read, nobody is asked for it. Add a question for it as the fallback.` : `comes from ${f.document?.name}, which is asked only in some cases: when it is not asked, nobody gives this answer. Add a question for it, or choose Client.`);
    }
    if (person && f.source === "CLIENT" && !f.placed) say("error", f, "comes from the client, but no question asks it. Add the question, or choose another source.");
    if (person && f.source === "AGENT" && !f.placed && !isAgentFact(f.fact) && f.role !== "representative") say("error", f, "comes from the case officer, but no place lets the case officer enter it. Add it to the Agent view, or choose another source.");
    if (person && f.source === "AGENT" && agentRefusal(f, f.sourceReason)) say("error", f, "comes from the case officer without a written reason. Write why in its details, or choose the client or a document.");
    if (f.prequalification) {
      if (f.source === "AGENT") say("error", f, "is ticked for the Prospect questionnaire (PQR), but it comes from the case officer: a prospect is asked only what they can answer. Untick it, or choose Client or Document.");
      else if (!f.placed) say("error", f, "is ticked for the Prospect questionnaire (PQR), but no question asks it, so the prospect cannot be asked. Add the question, or untick it.");
    }
  }
  return out;
}

/** PQR ⊂ SQR ∪ the client's checklist documents (Lead Q1): the ticked facts, each with how it is asked and confirmed. */
export function prequalification(s: Snapshot): { role: string; fact: string; label: string; source: Source; document: string | null }[] {
  return factSources(s).filter((f) => f.prequalification && f.source !== "AGENT" && f.placed).map((f) => ({ role: f.role, fact: f.fact, label: f.label, source: f.source, document: f.document?.name ?? null }));
}

/** C4.7 stand-in producer (Lead, 29 Oct: one door, P-149): until W1-10 step 7 drafts PQR picks with AI, the rules propose
 *  one per fact a rule of the combination reads (directly, or through a derived field such as an age), for each person
 *  role whose forms need it, that a prospect can answer (Client or Document, a question asks it) and that is not ticked.
 *  Each is a contract v2.1 queue item (contracts/proposal-item.ts), origin "rules", never labelled AI; it enters S6's one
 *  queue through api/src/pqr-drafts.ts ("Rules only", C4.7). Pure: no database, no AI (US$0). */
export function pqrPicksByRules(s: Snapshot, combinationId: string, runId: string, newId: () => string): ProposalItem[] {
  const fieldsOf = (c: unknown) => c ? [...JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]) : [];
  const derived = new Map((s.derived_fields as { id: string; inputs?: string[]; reference?: string }[]).map((d) => [d.id, [...(d.inputs ?? []), ...(d.reference ? [d.reference] : [])]]));
  const readBy = new Map<string, string>();
  for (const r of s.rules as { id: string; when: unknown; when_plain?: string; then?: string }[]) {
    const words = `${r.when_plain ?? r.then ?? r.id}`.trim().replace(/\.$/, "");
    for (const f of fieldsOf(r.when)) for (const x of [f, ...(derived.get(f) ?? [])]) if (!readBy.has(x)) readBy.set(x, words);
  }
  return factSources(s).filter((f) => readBy.has(f.fact) && f.placed && f.source !== "AGENT" && !f.prequalification && f.forms.length).map((f): ProposalItem => ProposalItem.parse({
    id: newId(), kind: "pqr_pick", runId, step: "pqr_picks_by_rules", scope: { formEdition: null, combinationId }, landsOn: "combination",
    reuse: { match: "new", existingKey: null },
    payload: { kind: "pqr_pick", factKey: f.fact, role: f.role, reason: `A rule of this combination reads it: ${readBy.get(f.fact)}.`.slice(0, 300) },
    source: null, rounds: { draft: null, check: null }, rules: [{ rule: "pqr_subset_of_sqr", passed: true, why: null }],
    agreement: "rules_only", confidence: "check", reason: "Proposed by the rules from what this combination's rules read; the immigration expert confirms at release.",
    origin: "rules", identity: { key: sourceKey(f.role, f.fact), near: [], nearReason: null }, relatesTo: null, revision: null,
    status: "waiting", decision: null, basis: "SAMPLE",
  }));
}

/** P-132: the country PQR is a view, never a record: each combination's released PQR ticks (its newest release), one line
 *  per fact and person role, with the combinations that ask it. A draft tick is not in it until its combination releases. */
export type CountryPqrLine = { role: string; roleLabel: string; fact: string; label: string; combinations: { id: string; label: string; release: number }[] };
export function countryPqr(released: { combinationId: string; version: number; snapshot: Snapshot }[]): { lines: CountryPqrLine[]; combinations: number } {
  const lines = new Map<string, CountryPqrLine>();
  let asking = 0;
  for (const r of [...released].sort((a, b) => a.snapshot.combination.label.localeCompare(b.snapshot.combination.label))) {
    const ticks = prequalification(r.snapshot);
    if (ticks.length) asking++;
    for (const t of ticks) {
      const k = sourceKey(t.role, t.fact);
      const line = lines.get(k) ?? { role: t.role, roleLabel: who(r.snapshot, t.role), fact: t.fact, label: factWords(r.snapshot, t.fact), combinations: [] };
      line.combinations.push({ id: r.combinationId, label: r.snapshot.combination.label, release: r.version });
      lines.set(k, line);
    }
  }
  return { lines: [...lines.values()].sort((a, b) => b.combinations.length - a.combinations.length || a.roleLabel.localeCompare(b.roleLabel) || a.label.localeCompare(b.label)), combinations: asking };
}

// ------------------------------------------------------------------ W1-15 slice 3: each person's checklist (board v2 frame 3)

export type ChecklistFact = { fact: string; label: string; about: About; aboutRole: string | null; takenOut: boolean };
export type ChecklistLine = {
  lineage: string; role: string; document: { key: string; name: string }; who: string; base: boolean; when: string;
  providedBy: string; alternatives: { key: string; name: string }[]; supplies: ChecklistFact[]; aboutOthers: number;
  quote: string | null; status: string; origin: string; position: number | null;
  /** Its place on this checklist: the set position, else its place in the default order (always first, then by name). */
  rank: number;
  /** C3.11: a line worked out from a form line (never stored), with why it is there; changed only on that form line. */
  automatic?: { form: string; reason: string };
};

/** C3.11 (P-62 §3, P-143): a form line filed as PDF upload, signed by hand and scanned, asks each person who signs it for the signed, scanned
 *  copy. Worked out from the line's channel and "Signed by" (engine/channels.ts rule: never stored), so changing the
 *  channel takes it away at once and a release carries it with the line. Who signs (contracts/workspace.ts SIGNED_BY,
 *  Sample): not set or "the person" = each person the form is about; "a parent, for a minor" = the principal for a
 *  child's form, the person otherwise; "the principal, for the family" = the principal; "the person and the
 *  representative" = both; "no signature" = nobody (a signed upload with no signer is a release error, validate.ts). */
export const SIGNED_SCAN = "signed_scan";
const WHO_OF_ROLE: Record<string, string> = { principal: "principal_applicant", spouse_or_partner: "spouse_or_partner", child: "each_dependent_child", representative: "representative", sponsor: "sponsor" };
export function signedScanLines(s: Snapshot): ChecklistLine[] {
  const { people } = previewRender(s);
  const out: ChecklistLine[] = [];
  for (const f of s.forms as { form_number: string; title?: string; form_kind?: string; who: string; status?: string; condition?: { subjectKind?: string } | null; condition_plain?: string | null; channel?: string; signature?: string; signed_by?: string }[]) {
    const line = lineOf(f);
    if (line.channel !== "PDF_UPLOAD" || line.signature !== "HAND_SCANNED" || (f.form_kind ?? "data_form") === "document") continue;
    // X9b (#113 review m6): the one "who signs" rule (render.ts formSigners), read per person role on the preview people.
    const signers = new Map<string, boolean>();
    for (const [id, rows] of formSigners(people, f.who, f.signed_by)) { const role = roleOf(people, id); signers.set(role, (signers.get(role) ?? false) || signsForOthers(id, rows)); }
    const base = (f.status ?? "always") === "always";
    for (const [role, forOthers] of signers) {
      const reason = `${f.form_number} is filed as PDF upload, signed by hand and scanned: it is printed, signed by hand${forOthers ? " (for the family members it is about)" : ""}, scanned and uploaded.`;
      out.push({
        lineage: `${SIGNED_SCAN}:${f.form_number}:${role}`, role, document: { key: `${SIGNED_SCAN}.${f.form_number}`, name: `${f.form_number} signed by hand and scanned` }, who: WHO_OF_ROLE[role] ?? role,
        base, when: base ? "Always" : (f.condition_plain ?? "Only if its form applies"), providedBy: "client", alternatives: [], supplies: [], aboutOthers: 0,
        quote: null, status: "AUTOMATIC", origin: "FORM_LINE", position: null, rank: 0, automatic: { form: f.form_number, reason },
      });
    }
  }
  return out;
}
/** Each person role's checklist: the lines that name it (per person, as documentFacts reads them), what each supplies
 *  and about whom, and whether slice 1's rules take that answer out of the questionnaire (its source for that person is
 *  this document). Order: the set position, then base before conditional, then the name. Pure: no database. */
export function checklist(s: Snapshot): { role: string; label: string; lines: ChecklistLine[] }[] {
  const { people } = previewRender(s);
  const sources = new Map(factSources(s).map((f) => [sourceKey(f.role, f.fact), f]));
  const meaning = new Map((s.canonical_fields as { id: string; meaning?: string }[]).map((f) => [f.id, (f.meaning ?? f.id).trim().replace(/\.$/, "")]));
  const types = s.document_types as DocType[];
  const byRole = new Map<string, ChecklistLine[]>();
  for (const r of s.document_requirements as any[]) {
    const t = types.find((x) => x.key === r.document_type_key || x.name === r.document_type);
    const holders = lineHolders(people, r.who); // Q2 (#325): one rule with Preview and the case's checklist
    const roles = [...new Set(holders.map((h) => roleOf(people, h)))];
    for (const role of roles) {
      const holder = holders.find((h) => roleOf(people, h) === role)!;
      const supplies = (t ? suppliesOf(t) : []).map(({ fact, about }) => {
        const aboutRole = documentRole(people, holder, about) || null;
        const src = aboutRole ? sources.get(sourceKey(aboutRole, fact)) : undefined;
        return { fact, label: meaning.get(fact) ?? fact, about, aboutRole, takenOut: !!src && src.source === "DOCUMENT" && src.document?.key === t!.key };
      });
      const line: ChecklistLine = {
        lineage: r.lineage, role, document: { key: t?.key ?? r.document_type_key, name: t?.name ?? r.document_type }, who: r.who,
        base: r.base_or_conditional === "base", when: r.base_or_conditional === "base" ? "Always" : (r.condition_plain ?? "Only if its condition holds"),
        providedBy: r.provided_by, alternatives: ((r.alternatives ?? []) as string[]).map((k) => ({ key: k, name: types.find((x) => x.key === k)?.name ?? k })),
        supplies, aboutOthers: supplies.filter((x) => x.about !== "holder").length, quote: r.source_quote ?? null, status: r.status, origin: r.origin, position: r.position ?? null, rank: 0,
      };
      byRole.set(role, [...(byRole.get(role) ?? []), line]);
    }
  }
  // A move sets the position of only the two lines it swaps (api/src/person-checklist.ts): every other line keeps its
  // place in the default order, so one move is two draft changes, never the whole checklist.
  const byDefault = (a: ChecklistLine, b: ChecklistLine) => Number(b.base) - Number(a.base) || a.document.name.localeCompare(b.document.name) || a.lineage.localeCompare(b.lineage);
  for (const list of byRole.values()) [...list].sort(byDefault).forEach((l, i) => { l.rank = l.position ?? (i + 1) * 10; });
  // C3.11: the signed scans follow the requirement lines, in form order (they cannot be moved: they follow the form line).
  for (const l of signedScanLines(s)) { const list = byRole.get(l.role) ?? []; l.rank = 100_000 + list.length; byRole.set(l.role, [...list, l]); }
  const order = (a: ChecklistLine, b: ChecklistLine) => a.rank - b.rank || byDefault(a, b);
  const roles = [...new Set(people.map((p) => p.role as string)), "case"];
  return roles.filter((r) => byRole.has(r)).map((role) => ({ role, label: who(s, role), lines: byRole.get(role)!.sort(order) }));
}
