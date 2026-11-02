// C4.11 "Draft questions and documents" (P-130 steps, P-131, P-121; W1-questions-and-documents concept §4,
// W1-ai-drafting plan §1): the rules parts of the one run, pure (no database, no AI, US$0). The API (api/src/draft-qd.ts)
// runs them as steps of one run and shows each on the shared run card. Each step returns what it found, said in words.
//   step 1 facts per person role (factSources) · step 3 facts per document (the library's suppliesFacts) ·
//   step 4 where each answer comes from (factSources' rule source, P-130 precedence) · step 7 the rules checks.
// Every value is Sample until the immigration expert confirms it (AGENTS rule 4).
import type { Snapshot } from "./snapshot.ts";
import { coverageGaps } from "./coverage.ts";
import { factSourceProblems, factSources, SOURCE_WORDS, who, type Source } from "./sources.ts";
import { askedInOrder } from "./validate.ts";

export const QD_OPERATION = "draft_questions_documents";
/** The seven steps, in order (concept §4). `ai` marks a step that reads IRCC's files with AI (live or saved). */
export const QD_STEPS = [
  { kind: "qd_facts", label: "Facts each person gives, from the forms' field maps", ai: false },
  { kind: "qd_documents", label: "Documents each person gives, and when, from IRCC's checklist and guide", ai: true },
  { kind: "qd_document_facts", label: "Which facts each document supplies", ai: false },
  { kind: "qd_sources", label: "Where each answer comes from: a document, the client or the case officer", ai: false },
  { kind: "qd_conditions", label: "Questions asked only in some cases, and their conditions", ai: true },
  { kind: "pqr_picks", label: "Prospect questionnaire (PQR) picks, each with its reason", ai: true },
  { kind: "qd_check", label: "Rules check the whole draft", ai: false },
] as const;
export type QdKind = (typeof QD_STEPS)[number]["kind"];

/** Step 1: the facts the forms need, per person role (the combination's largest household, as coverage reads it). */
export function factsPerRole(s: Snapshot): { roles: { role: string; label: string; facts: number }[]; total: number } {
  const by = new Map<string, number>();
  for (const f of factSources(s)) if (f.forms.length) by.set(f.role, (by.get(f.role) ?? 0) + 1);
  const roles = [...by].map(([role, facts]) => ({ role, label: who(s, role), facts })).sort((a, b) => b.facts - a.facts || a.role.localeCompare(b.role));
  return { roles, total: roles.reduce((a, r) => a + r.facts, 0) };
}

/** Step 3: for each document on the combination's checklist, the facts the library says it supplies. A document type
 *  the library supplies no facts for is listed: reading its facts is AI work for a new type (C3.4), not drafted here. */
export function documentFacts(s: Snapshot): { documents: { key: string; name: string; facts: number }[]; noFacts: string[] } {
  const types = new Map((s.document_types ?? []).map((t) => [t.key, t]));
  const seen = new Map<string, { key: string; name: string; facts: number }>();
  for (const r of s.document_requirements as { document_type_key?: string; document_type: string }[]) {
    const key = r.document_type_key ?? r.document_type;
    if (seen.has(key)) continue;
    const t = types.get(key);
    seen.set(key, { key, name: t?.name ?? r.document_type, facts: t?.supplies_facts?.length ?? 0 });
  }
  const documents = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { documents, noFacts: documents.filter((d) => !d.facts).map((d) => d.name) };
}

/** Step 4: where each answer comes from by the rules (P-130: client-only › a document on that person's checklist › the
 *  case officer's own facts › the client), and how many a person has already changed. The rules' choice applies until a
 *  person changes it on the Questions tab, so nothing is written here. */
export function sourceCounts(s: Snapshot): { counts: Record<Source, number>; changedByPerson: number; total: number } {
  const counts: Record<Source, number> = { DOCUMENT: 0, CLIENT: 0, AGENT: 0 };
  let changedByPerson = 0, total = 0;
  for (const f of factSources(s)) { if (!f.forms.length) continue; total++; counts[f.source]++; if (f.proposedBy === "Person") changedByPerson++; }
  return { counts, changedByPerson, total };
}
export const sourceWords = (c: ReturnType<typeof sourceCounts>) =>
  `${c.total} answer${c.total === 1 ? "" : "s"}: ${(Object.keys(c.counts) as Source[]).map((k) => `${SOURCE_WORDS[k]} ${c.counts[k]}`).join(" · ")}${c.changedByPerson ? ` (${c.changedByPerson} chosen by a person)` : ""}`;

/** The four rules checks of concept §4, each a finding with the rule it breaks (step 7). */
export const QD_RULES = {
  one_source: "Every form field has exactly one source",
  asked_first: "Every deciding fact is asked before what depends on it",
  pqr_subset: "The Prospect questionnaire (PQR) asks only what the Smart questionnaire asks (PQR ⊂ SQR)",
  document_on_checklist: "Every document fact's document is on the checklist",
} as const;
export type QdRule = keyof typeof QD_RULES;
export type QdFinding = { rule: QdRule; level: "error" | "warning"; message: string };

export function qdChecks(s: Snapshot): QdFinding[] {
  const out: QdFinding[] = [];
  for (const g of coverageGaps(s)) out.push({ rule: "one_source", level: "error", message: `${g.role}: "${g.fact}" is read by ${g.forms.join(", ")}, but ${g.why}.` });
  for (const p of factSourceProblems(s)) {
    const rule: QdRule = /Prospect questionnaire \(PQR\)|pre-qualification/i.test(p.message) ? "pqr_subset" : /not on this person's checklist|which is asked only in some cases|if it cannot be read/i.test(p.message) ? "document_on_checklist" : "one_source";
    out.push({ rule, level: p.level, message: p.message });
  }
  for (const p of askedInOrder(s)) out.push({ rule: "asked_first", level: p.level, message: p.message });
  return out;
}

/** The step-7 summary in words: per rule, passed or how many findings. */
export function checkWords(f: QdFinding[]): string {
  const errors = f.filter((x) => x.level === "error").length, warnings = f.length - errors;
  if (!f.length) return `All four rules pass: ${Object.values(QD_RULES).join("; ")}.`;
  return `${errors} problem${errors === 1 ? "" : "s"}${warnings ? ` and ${warnings} warning${warnings === 1 ? "" : "s"}` : ""} for a person to fix; each names its rule.`;
}
