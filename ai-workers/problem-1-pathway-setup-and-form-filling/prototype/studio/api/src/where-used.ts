// SH2 (P-258, inside G-CORE P-253): the one where-used service. It reads the rows; the working-out is engine/where-used.ts
// (pure, P-249). Its callers: the shared library's used-in lists and lifecycle guard (library-sources.ts,
// library-items.ts), a library form's uses (form-uses.ts) and a new edition's impact review (impact.ts); next, G-CORE's
// impact preview. Other screens still read some uses themselves (lists of rules and checks, the reuse marks); they move
// here when they change. New features call it and never copy it (P-258).
import type { Prisma } from "@prisma/client";
import { byItem, current, fieldUses, filingCombinations, formLineByCombination, releaseUses } from "../../engine/where-used.ts";
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
  const [ids, combos] = await Promise.all([itemCombinations(db, workspaceId, kind), db.combination.findMany({ where: { workspaceId }, select: { id: true, label: true } })]);
  const label = new Map(combos.map((c) => [c.id, c.label]));
  return new Map([...ids].map(([k, s]) => [k, [...new Set([...s].map((id) => label.get(id)).filter((l): l is string => !!l))].sort()] as [string, string[]]).filter(([, l]) => l.length));
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
