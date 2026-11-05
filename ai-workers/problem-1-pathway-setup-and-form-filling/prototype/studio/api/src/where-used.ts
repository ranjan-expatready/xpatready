// SH2 (P-258, inside G-CORE P-253): the one where-used service. It reads the rows; the working-out is engine/where-used.ts
// (pure, P-249). Its callers: the shared library's used-in lists and lifecycle guard (library-sources.ts,
// library-items.ts), a library form's uses (form-uses.ts) and a new edition's impact review (impact.ts); next, G-CORE's
// impact preview. Other screens still read some uses themselves (lists of rules and checks, the reuse marks); they move
// here when they change. New features call it and never copy it (P-258).
import type { Prisma } from "@prisma/client";
import { conditionWords } from "../../engine/eligibility-gates.ts";
import { byItem, current, fieldComponents, fieldsOf, fieldUses, filingCombinations, formLineByCombination, formRuleKey, releaseUses } from "../../engine/where-used.ts";
import type { Db } from "./core.ts";
import { fullTrail, trailWords } from "../../engine/structure.ts";

type Client = Db | Prisma.TransactionClient;
/** The shared-library kinds that are used by combinations. */
export type UsedKind = "field" | "answer_list" | "section" | "document_type";
const LIVE = ["PUBLISHED", "DRAFT", "RETIRED"] as const;

/** The current mapped form fields (PR #96 finding (a): the newest version per edition and data path, so a mapping
 *  replaced by a newer one, or by one that maps nothing, no longer counts). */
export async function mappedBoxes(db: Client, workspaceId: string) {
  const rows = await db.formFieldMap.findMany({ where: { workspaceId, status: { in: [...LIVE] } }, include: { edition: true }, orderBy: [{ formEditionId: "asc" }, { dataPath: "asc" }] });
  return current(rows, (b) => `${b.formEditionId}|${b.dataPath}`).filter((b) => b.outcome === "mapped" && b.canonicalFieldKey);
}

/** Item key → the ids of the combinations using it (C3.13 where used; C11.9's lifecycle guard). A section is used where a
 *  combination selects it; a document type where a current checklist line lists it, takes it as an alternative, or a
 *  fact is read from it (SH2b); a field where engine fieldUses says; and an answer list where one of its fields is. */
export async function itemCombinations(db: Client, workspaceId: string, kind: UsedKind): Promise<Map<string, Set<string>>> {
  if (kind === "section") return byItem((await db.sqrSectionSelection.findMany({ where: { workspaceId } })).map((s) => [s.sectionKey, s.combinationId]));
  if (kind === "document_type") return byItem([...(await documentTypeUses(db, workspaceId))].map(([k, c]) => [k, c] as [string, string]));
  const [boxes, lines, rules, docs, checks, questions, picks] = await Promise.all([
    mappedBoxes(db, workspaceId),
    db.combinationForm.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.predicate.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.documentRequirement.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.check.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.sectionQuestion.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.sqrSectionSelection.findMany({ where: { workspaceId } }),
  ]);
  const pairs = fieldUses({ boxes, lines, rules, docs, checks, questions, picks });
  if (kind === "field") return byItem(pairs);
  const listOf = new Map<string, string | null>();
  for (const f of await db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "asc" } })) listOf.set(f.canonicalFieldKey, f.answerListKey);
  return byItem(pairs, (f) => listOf.get(f));
}

/** Every use of every document type: [type, combination, how] (a line lists it, a line's alternative, a fact's source). */
async function documentTypeUses(db: Client, workspaceId: string): Promise<[string, string, "line" | "alternative" | "fact"][]> {
  const [reqs, facts] = await Promise.all([
    db.documentRequirement.findMany({ where: { workspaceId, status: { in: [...LIVE] } }, select: { combinationId: true, lineageKey: true, version: true, status: true, documentTypeKey: true, alternatives: true } }),
    db.factSource.findMany({ where: { workspaceId, status: { in: [...LIVE] } }, select: { combinationId: true, lineageKey: true, version: true, status: true, documentTypeKey: true } }),
  ]);
  const lines = current(reqs, (r) => `${r.combinationId}|${r.lineageKey}`);
  return [
    ...lines.map((r) => [r.documentTypeKey, r.combinationId, "line"] as [string, string, "line"]),
    ...lines.flatMap((r) => (Array.isArray(r.alternatives) ? (r.alternatives as unknown[]) : []).filter((k): k is string => typeof k === "string").map((k) => [k, r.combinationId, "alternative"] as [string, string, "alternative"])),
    ...current(facts, (f) => `${f.combinationId}|${f.lineageKey}`).filter((f) => f.documentTypeKey).map((f) => [f.documentTypeKey!, f.combinationId, "fact"] as [string, string, "fact"]),
  ];
}
/** For one document type: each combination using it and how (the guard says it in words). */
export async function documentTypeUseKinds(db: Client, workspaceId: string, key: string): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  for (const [k, c, how] of await documentTypeUses(db, workspaceId)) if (k === key) out.set(c, (out.get(c) ?? new Set()).add(how));
  return out;
}
/** Item key → the labels of the combinations using it, sorted (Library › Used in; a duplicate refusal's words). */
export async function usedInLabels(db: Client, workspaceId: string, kind: UsedKind): Promise<Map<string, string[]>> {
  return (await usedInBoth(db, workspaceId, kind)).labels;
}
/** C3.13 (BR-2): one where-used read for a list page: each item's combination ids that still exist (its usedBy count)
 *  and their labels (its Used in list), so the count and the list come from the same read. */
export async function usedInBoth(db: Client, workspaceId: string, kind: UsedKind): Promise<{ ids: Map<string, Set<string>>; labels: Map<string, string[]> }> {
  const [all, combos] = await Promise.all([itemCombinations(db, workspaceId, kind), db.combination.findMany({ where: { workspaceId }, select: { id: true, label: true } })]);
  const label = new Map(combos.map((c) => [c.id, c.label]));
  const ids = new Map([...all].map(([k, s]) => [k, new Set([...s].filter((id) => label.has(id)))] as [string, Set<string>]));
  const labels = new Map([...ids].map(([k, s]) => [k, [...new Set([...s].map((id) => label.get(id)!))].sort()] as [string, string[]]).filter(([, l]) => l.length));
  return { ids, labels };
}

/** Each combination's place as its full trail in words, Pathway type › Pathway › Program › Category › Sub-category (P-104,
 *  QA-150; engine/structure.ts fullTrail and trailWords: every list names a combination so). */
export async function combinationTrails(db: Client, workspaceId: string): Promise<Map<string, string>> {
  const [nodes, combos] = await Promise.all([
    db.programDef.findMany({ where: { workspaceId }, select: { programNodeKey: true, parentNodeKey: true, label: true, nodeKind: true, clientType: true } }),
    db.combination.findMany({ where: { workspaceId }, select: { id: true, label: true, program: { select: { programNodeKey: true } } } }),
  ]);
  const by = new Map(nodes.map((n) => [n.programNodeKey, n]));
  const out = new Map<string, string>();
  for (const c of combos) {
    const chain: (typeof nodes)[number][] = [];
    for (let n = by.get(c.program.programNodeKey); n; n = n.parentNodeKey ? by.get(n.parentNodeKey) : undefined) chain.unshift(n);
    out.set(c.id, chain.length ? trailWords(fullTrail(chain)) : c.label);
  }
  return out;
}

/** The rows a field's uses and readers are found in (SH2's own tables), with the facts read from document types. */
export async function fieldUseRows(db: Client, workspaceId: string) {
  const [boxes, lines, rules, docs, checks, questions, picks, facts] = await Promise.all([
    mappedBoxes(db, workspaceId),
    db.combinationForm.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.predicate.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.documentRequirement.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.check.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.sectionQuestion.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
    db.sqrSectionSelection.findMany({ where: { workspaceId } }),
    db.factSource.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
  ]);
  return { boxes, lines, rules, docs, checks, questions, picks, facts };
}

/** B83 (breaker M1, M5): what can read a shared field, each named in words (never a key). */
export type FieldReader = { kind: "form_field" | "form_field_step" | "gate" | "rule" | "form_condition" | "document_condition" | "check" | "question_condition" | "fact_source" | "worked_out" | "document_type" | "document_type_change" | "waiting_supplies" | "waiting_change" | "waiting_draft" | "merge"; name: string; /** Where it is, when it belongs to one combination: its rule or check's key beside it. */ combinationId?: string; ref?: string };
const READING_DRAFTS = ["document_type", "condition", "form_check", "cross_check", "requirement_line", "comes_from", "pqr_pick"];
const DRAFT_WORD: Record<string, string> = { document_type: "a document type", condition: "a condition", form_check: "a check", cross_check: "a check", requirement_line: "a document line", comes_from: "where an answer comes from", pqr_pick: "a question pick" };
/** Everything that reads a shared field now, in this workspace: the one list, so an undo, a withdrawal and their words agree.
 *  A question that only asks the field is left out: it goes with a withdrawn field (library-changes.ts). */
export async function fieldReaders(db: Client, workspaceId: string, key: string): Promise<FieldReader[]> {
  const named = new RegExp(`(?<![\\w.])${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\w|\\.\\w)`);
  const reads = (x: unknown) => fieldsOf(x).includes(key);
  const r = await fieldUseRows(db, workspaceId);
  const out: FieldReader[] = [];
  const rows = await db.combination.findMany({ where: { workspaceId }, select: { id: true, label: true, eligibility: true } });
  const combos = new Map(rows.map((c) => [c.id, c.label]));
  const on = (id: string) => `on ${combos.get(id) ?? "a combination"}`;
  for (const c of rows) for (const g of ((c.eligibility as { gates?: { label: string; condition: unknown }[] } | null)?.gates ?? [])) if (reads(g.condition)) out.push({ kind: "gate", name: `the eligibility gate "${g.label}" on ${c.label}` });
  for (const b of r.boxes) {
    const name = `${b.edition.editionLabel}'s form field "${(b.caption ?? b.heading ?? "with no caption").trim().slice(0, 80)}"`;
    if (b.canonicalFieldKey === key) out.push({ kind: "form_field", name });
    else if ((b.transform && named.test(b.transform)) || (b.condition && named.test(b.condition))) out.push({ kind: "form_field_step", name });
  }
  const lines = current(r.lines, (l) => `${l.combinationId}|${l.lineageKey}`).filter((l) => reads(l.predicateJson));
  const docs = current(r.docs, (d) => `${d.combinationId}|${d.lineageKey}`).filter((d) => reads(d.predicateJson));
  const questions = current(r.questions, (q) => q.lineageKey).filter((q) => reads(q.predicateJson));
  const [forms, typeNames, asked] = await Promise.all([
    lines.length ? db.govFormDef.findMany({ where: { id: { in: lines.map((l) => l.govFormDefId) } }, select: { id: true, formKey: true } }) : [],
    docs.length ? db.documentType.findMany({ where: { workspaceId, documentTypeKey: { in: docs.map((d) => d.documentTypeKey) } }, orderBy: { version: "asc" }, select: { documentTypeKey: true, name: true } }) : [],
    questions.length ? db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: questions.map((q) => q.canonicalFieldKey) } }, orderBy: { version: "asc" }, select: { canonicalFieldKey: true, label: true, meaning: true } }) : [],
  ]);
  const formOf = new Map(forms.map((f) => [f.id, f.formKey])), typeOf = new Map(typeNames.map((t) => [t.documentTypeKey, t.name])), askedOf = new Map(asked.map((f) => [f.canonicalFieldKey, f.label ?? f.meaning ?? "a question"]));
  for (const l of lines) out.push({ kind: "form_condition", name: `the condition of ${formOf.get(l.govFormDefId) ?? "a form"} ${on(l.combinationId)}` });
  for (const d of docs) out.push({ kind: "document_condition", name: `the condition of the document line "${typeOf.get(d.documentTypeKey) ?? "a document"}" ${on(d.combinationId)}` });
  for (const q of questions) out.push({ kind: "question_condition", name: `the condition of the question "${askedOf.get(q.canonicalFieldKey) ?? "a question"}"` });
  for (const x of current(r.rules, (x) => `${x.combinationId}|${x.predicateKey}`)) if (reads(x.predicateJson)) out.push({ kind: "rule", name: `the rule "${x.thenPlain}" ${on(x.combinationId)}`, combinationId: x.combinationId, ref: x.predicateKey });
  for (const k of current(r.checks, (k) => `${k.combinationId}|${k.checkKey}`)) if (named.test(JSON.stringify(k.predicateJson ?? null))) out.push({ kind: "check", name: `the check "${(k.message ?? "with no message").slice(0, 80)}" ${on(k.combinationId)}`, combinationId: k.combinationId, ref: k.checkKey });
  for (const f of current(r.facts, (f) => `${f.combinationId}|${f.lineageKey}`)) if (f.canonicalFieldKey === key) out.push({ kind: "fact_source", name: `where this answer comes from ${on(f.combinationId)}` });
  for (const d of await db.derivedField.findMany({ where: { workspaceId, OR: [{ inputs: { has: key } }, { reference: key }] }, select: { plain: true } })) out.push({ kind: "worked_out", name: `the worked-out value "${d.plain ?? "with no words"}"` });
  const open = await db.libraryChange.findMany({ where: { workspaceId, kind: { in: ["placement_condition", "document_supplies"] }, status: { in: ["WAITING", "RETURNED", "APPROVED"] } }, select: { kind: true, key: true, label: true, status: true, matches: true } });
  const changing = new Set<string>();
  for (const c of open) {
    const after = (c.matches as { after?: unknown } | null)?.after;
    if (c.kind === "document_supplies") { if (Array.isArray(after) && after.includes(key)) { if (c.status === "APPROVED") changing.add(c.key); out.push({ kind: "waiting_supplies", name: `the change on To review "${c.label ?? "with no name"}"` }); } }
    else if (reads(after)) out.push({ kind: "waiting_change", name: `the change on To review "${c.label ?? "with no name"}"` });
  }
  const types = await db.documentType.findMany({ where: { workspaceId }, select: { documentTypeKey: true, name: true, version: true, status: true, suppliesFacts: true } });
  for (const t of current(types, (t) => t.documentTypeKey)) if (t.suppliesFacts.includes(key)) out.push({ kind: changing.has(t.documentTypeKey) ? "document_type_change" : "document_type", name: `the document type "${t.name}", which supplies it` });
  for (const m of await db.fieldMerge.findMany({ where: { workspaceId, status: "PROPOSED", OR: [{ keepKey: key }, { mergeKey: key }] }, select: { keepKey: true, mergeKey: true } })) {
    const other = await db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: m.keepKey === key ? m.mergeKey : m.keepKey }, orderBy: { version: "desc" }, select: { label: true, meaning: true } });
    out.push({ kind: "merge", name: `a proposed merge with "${other?.label ?? other?.meaning ?? "another field"}" on To review` });
  }
  for (const w of await db.proposalItem.findMany({ where: { workspaceId, status: "waiting", kind: { in: READING_DRAFTS } }, select: { kind: true, payload: true } })) {
    if (!named.test(JSON.stringify(w.payload ?? null))) continue;
    const p = w.payload as { label?: unknown; name?: unknown; message?: unknown } | null;
    const said = [p?.label, p?.name, p?.message].find((x) => typeof x === "string" && x.trim());
    out.push({ kind: "waiting_draft", name: `${DRAFT_WORD[w.kind] ?? "a draft"} waiting on To review${said ? ` ("${String(said).slice(0, 80)}")` : ""}` });
  }
  return out;
}
/** Readers in a sentence: the first three by name, then how many more. */
export const readerWords = (readers: { name: string }[]) => {
  const names = [...new Set(readers.map((r) => r.name))];
  return `${names.slice(0, 3).join("; ")}${names.length > 3 ? `; and ${names.length - 3} more` : ""}`;
};

/** C9.1 (P-32): the sections, document types, rules and checks the given shared fields touch on these combinations, each
 *  with its name in words (a section's title, a document type's name, a rule's "then", a check's message). */
export async function fieldComponentsOf(db: Client, workspaceId: string, fields: string[], combinationIds: string[]) {
  if (!fields.length || !combinationIds.length) return [];
  const rows = await fieldUseRows(db, workspaceId);
  const uses = fieldComponents(rows, fields, new Set(combinationIds));
  const keys = (k: string) => [...new Set(uses.filter((u) => u.kind === k).map((u) => u.key))];
  // A form's own rule is named by its condition in words, each shared field by its label (review m2).
  const lines = current(rows.lines, (l) => `${l.combinationId}|${l.lineageKey}`).filter((l) => uses.some((u) => u.kind === "rule" && u.key === formRuleKey(l.lineageKey) && u.combinationId === l.combinationId));
  const [sections, ruleFields, types] = await Promise.all([
    db.logicalSection.findMany({ where: { workspaceId, sectionKey: { in: keys("section") } }, orderBy: { version: "desc" }, distinct: ["sectionKey"], select: { sectionKey: true, title: true } }),
    db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: [...new Set(lines.flatMap((l) => fieldsOf(l.predicateJson)))] } }, orderBy: { version: "desc" }, distinct: ["canonicalFieldKey"], select: { canonicalFieldKey: true, label: true } }),
    db.documentType.findMany({ where: { workspaceId, documentTypeKey: { in: keys("document_type") } }, orderBy: { version: "desc" }, distinct: ["documentTypeKey"], select: { documentTypeKey: true, name: true } }),
  ]);
  const names = new Map<string, string>([
    ...sections.map((s) => [`section|${s.sectionKey}`, s.title] as [string, string]),
    ...types.map((t) => [`document_type|${t.documentTypeKey}`, t.name] as [string, string]),
    ...current(rows.rules, (x) => `${x.combinationId}|${x.predicateKey}`).map((x) => [`rule|${x.predicateKey}|${x.combinationId}`, x.thenPlain] as [string, string]),
    ...current(rows.checks, (k) => `${k.combinationId}|${k.checkKey}`).map((k) => [`check|${k.checkKey}|${k.combinationId}`, k.message ?? k.checkKey] as [string, string]),
    ...lines.map((l) => [`rule|${formRuleKey(l.lineageKey)}|${l.combinationId}`, `${l.lineageKey} is filed only when ${l.conditionPlain?.trim() || ruleFields.reduce((w, f) => w.split(f.canonicalFieldKey).join(f.label ?? f.canonicalFieldKey), conditionWords(l.predicateJson)) || "its condition holds"}`] as [string, string]),
  ]);
  return uses.map((u) => ({ ...u, label: names.get(`${u.kind}|${u.key}`) ?? names.get(`${u.kind}|${u.key}|${u.combinationId}`) ?? u.key }));
}

/** A library form's line on each combination (the newest version, retired or not), with the combination's label. */
export async function formLines(db: Client, workspaceId: string, code: string) {
  return formLineByCombination(await db.combinationForm.findMany({ where: { workspaceId, lineageKey: code }, orderBy: { version: "desc" }, include: { combination: { select: { id: true, label: true } } } }));
}

/** The combinations that file a library form now (their newest line for it is not retired). */
export async function formCombinations(db: Client, workspaceId: string, code: string): Promise<{ id: string; label: string }[]> {
  return filingCombinations([...(await formLines(db, workspaceId, code)).values()]).map((l) => l.combination);
}

/** The releases that carry a library form, each with whether it is its combination's latest release. */
export async function formReleases(db: Client, workspaceId: string, code: string) {
  const rows = await db.$queryRaw<{ combination_id: string; version: number; latest: number; label: string }[]>`
    SELECT r.combination_id, r.version, (SELECT max(version) FROM config_release x WHERE x.combination_id = r.combination_id) AS latest, c.label
    FROM config_release r JOIN combination c ON c.id = r.combination_id
    WHERE r.workspace_id = ${workspaceId}::uuid AND r.snapshot->'forms' @> jsonb_build_array(jsonb_build_object('form_number', ${code}::text))`;
  const label = new Map(rows.map((r) => [r.combination_id, r.label]));
  return releaseUses(rows.map((r) => ({ combinationId: r.combination_id, version: r.version, latest: r.latest }))).map((r) => ({ ...r, label: label.get(r.combinationId)! }));
}

/** The releases that carry a shared field, section or document type, newest first (releases keep it, never changed, L2). */
export async function itemReleases(db: Client, workspaceId: string, kind: "field" | "section" | "document_type", key: string) {
  const path = kind === "field" ? "canonical_fields" : kind === "section" ? "sections" : "document_types", prop = kind === "document_type" ? "key" : "id";
  const rows = await db.$queryRaw<{ combination_id: string; version: number }[]>`
    SELECT r.combination_id, r.version FROM config_release r WHERE r.workspace_id = ${workspaceId}::uuid AND r.snapshot->${path} @> jsonb_build_array(jsonb_build_object(${prop}::text, ${key}::text)) ORDER BY r.version DESC`;
  return rows.map((r) => ({ combinationId: r.combination_id, version: Number(r.version) }));
}

/** The open cases on these combinations (each stays on the release it started on). */
export async function openCases(db: Client, combinationIds: string[]): Promise<number> {
  return combinationIds.length ? db.case.count({ where: { combinationId: { in: combinationIds }, status: "OPEN" } }) : 0;
}

/** The open cases on these combinations, per pinned release (each case stays on the release it was opened on; every case
 *  pins at open, runtime.ts). A case with no pin yet is counted with `release: null`. */
export async function openCasesByRelease(db: Client, combinationIds: string[]): Promise<{ combinationId: string; release: number | null; cases: number }[]> {
  if (!combinationIds.length) return [];
  const [cases, pins] = await Promise.all([
    db.case.findMany({ where: { combinationId: { in: combinationIds }, status: "OPEN" }, select: { id: true, combinationId: true } }),
    db.packWorkPin.findMany({ where: { combinationId: { in: combinationIds } }, select: { caseId: true, configReleaseId: true } }),
  ]);
  const versions = new Map((await db.configRelease.findMany({ where: { id: { in: [...new Set(pins.map((p) => p.configReleaseId))] } }, select: { id: true, version: true } })).map((r) => [r.id, r.version]));
  const releaseOf = new Map(pins.map((p) => [p.caseId, versions.get(p.configReleaseId) ?? null]));
  const counts = new Map<string, { combinationId: string; release: number | null; cases: number }>();
  for (const c of cases) { const release = releaseOf.get(c.id) ?? null, k = `${c.combinationId}|${release}`; const row = counts.get(k) ?? { combinationId: c.combinationId, release, cases: 0 }; row.cases++; counts.set(k, row); }
  return [...counts.values()].sort((a, b) => a.combinationId.localeCompare(b.combinationId) || (a.release ?? 0) - (b.release ?? 0));
}
