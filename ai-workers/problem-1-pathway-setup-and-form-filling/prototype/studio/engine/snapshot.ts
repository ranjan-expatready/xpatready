// Builds one combination's configuration from the database rows, in the same shape as the released-configuration
// contract (contracts/released-configuration.v0.schema.json, combination-config/v0), so the P5 case engine and this
// studio's renderer consume one format. mode "draft" takes each lineage's newest DRAFT row, else its PUBLISHED row;
// mode "published" takes PUBLISHED rows only. A released version is this snapshot frozen and hashed (ConfigRelease).
// Every list is sorted by its key so the same content always gives the same fingerprint.
import type { FormEdition, PrismaClient } from "@prisma/client";
import { canonical, sha256 } from "../../contracts/rules.ts";
import { compareEditions } from "./programs.ts";

export type Mode = "draft" | "published";
type Versioned = { status: string; version: number };

/** Newest effective row per lineage key. RETIRED as the newest row removes the lineage. */
export function effective<T extends Versioned>(rows: T[], keyOf: (r: T) => string, mode: Mode): T[] {
  const by = new Map<string, T[]>();
  for (const r of rows) { const k = keyOf(r); by.set(k, [...(by.get(k) ?? []), r]); }
  const out: T[] = [];
  for (const list of by.values()) {
    const sorted = [...list].sort((a, b) => b.version - a.version);
    const pick = mode === "draft" ? sorted.find((r) => r.status === "DRAFT") ?? sorted.find((r) => r.status === "PUBLISHED" || r.status === "RETIRED") : sorted.find((r) => r.status === "PUBLISHED" || r.status === "RETIRED");
    if (pick && pick.status !== "RETIRED") out.push(pick);
  }
  return out;
}

export const VALUE_TYPE_TO_DATA_TYPE: Record<string, "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM" | "COMPOSITE"> = {
  text: "STRING", yes_no: "BOOLEAN", date: "DATE", code: "ENUM", country: "ENUM", address: "COMPOSITE", number: "NUMBER", phone: "COMPOSITE", email: "STRING",
};
export const subjectKindOf = (key: string) => ({ person: "PERSON", relationship: "RELATIONSHIP", case: "CASE", organisation: "ORGANISATION", representative: "REPRESENTATIVE" } as Record<string, string>)[key.split(".")[0]] ?? "PERSON";

/** The fingerprint covers configuration content, not row bookkeeping: an item's version number and its DRAFT/PUBLISHED
 *  status change when a release publishes it, without changing what the configuration does. (Before 21 Oct the status
 *  was hashed, so a draft never matched its own release.) Behavioural fields such as a form's "always"/"conditional"
 *  status are kept. */
const BOOKKEEPING = new Set(["DRAFT", "PUBLISHED", "SUPERSEDED", "RETIRED"]);
export function content(x: any): any {
  if (Array.isArray(x)) return x.map(content);
  if (!x || typeof x !== "object") return x;
  const out: any = {};
  for (const [k, v] of Object.entries(x)) { if (k === "item_version" || (k === "status" && BOOKKEEPING.has(v as string))) continue; out[k] = content(v); }
  return out;
}

export type Snapshot = {
  contract_version: "combination-config/v0";
  combination: { key: string; label: string; program: string; pathway: string | null; participants: any[]; source_basis: string; basis_note: string | null; path?: string[]; client_type?: string | null; allowed_locations?: string[]; portal?: string };
  mode: Mode;
  canonical_fields: any[]; sections: any[]; placements: any[]; forms: any[]; field_maps: any[];
  document_requirements: any[]; document_types: any[]; rules: any[]; derived_fields: any[]; checks: any[];
  row_versions: Record<string, string>;
};

export async function buildSnapshot(db: PrismaClient, workspaceId: string, combinationId: string, mode: Mode): Promise<{ snapshot: Snapshot; sha256: string }> {
  return (await buildSnapshots(db, workspaceId, [combinationId], mode)).get(combinationId)!;
}

/** Many combinations at once (the catalogue overview): the shared library tables are read once, the per-combination
 *  tables with one query each, so 300 combinations cost about a dozen queries instead of a dozen per combination.
 *  Same assembly as buildSnapshot, so the fingerprints are identical. */
export async function buildSnapshots(db: PrismaClient, workspaceId: string, combinationIds: string[], mode: Mode): Promise<Map<string, { snapshot: Snapshot; sha256: string }>> {
  const ws = { workspaceId };
  const inComp = { combinationId: { in: combinationIds } };
  const [comps, nodes, fields, sections, questions, allSel, allForms, allReq, doctypes, allRules, derived, allChecks, answerLists] = await Promise.all([
    db.combination.findMany({ where: { id: { in: combinationIds } }, include: { program: true } }), db.programDef.findMany({ where: ws }),
    db.canonicalField.findMany({ where: ws }), db.logicalSection.findMany({ where: ws }), db.sectionQuestion.findMany({ where: ws }),
    db.sqrSectionSelection.findMany({ where: inComp, orderBy: { sectionOrder: "asc" } }),
    db.combinationForm.findMany({ where: inComp, include: { form: { include: { editions: true } } } }),
    db.documentRequirement.findMany({ where: inComp }), db.documentType.findMany({ where: ws }),
    db.predicate.findMany({ where: inComp }), db.derivedField.findMany({ where: ws }), db.check.findMany({ where: inComp }),
    db.answerList.findMany({ where: ws, include: { values: { orderBy: { sortOrder: "asc" } } } }),
  ]);
  if (comps.length !== new Set(combinationIds).size) throw new Error("Combination not found");
  const allEditionIds = [...new Set(allForms.flatMap((f) => f.form.editions.map((e) => e.id)))];
  const allMaps = allEditionIds.length ? await db.formFieldMap.findMany({ where: { formEditionId: { in: allEditionIds } }, orderBy: { dataPath: "asc" } }) : [];
  // The shared library is resolved once per request, not once per row (the 371-row catalogue spent most of its time here).
  // Each shared form edition's effective boxes, computed on first use and reused by every row that files the form.
  const mapsByEdition = new Map<string, any[]>(); for (const m of allMaps) mapsByEdition.set(m.formEditionId, [...(mapsByEdition.get(m.formEditionId) ?? []), m]);
  const entryCache = new Map<string, any[]>();
  const entriesOf = (editionId: string) => { let e = entryCache.get(editionId); if (!e) { e = effective(mapsByEdition.get(editionId) ?? [], (m: any) => m.dataPath, mode); entryCache.set(editionId, e); } return e; };
  // F1: answer lists by key (a field's values, for the option-map checks), newest effective version of each.
  const lists = new Map(effective(answerLists, (l) => l.answerListKey, mode).map((l) => [l.answerListKey, l.values.map((v) => ({ key: v.valueKey, label: v.label }))]));
  const shared = { lists, entriesOf, effFields: effective(fields, (f) => f.canonicalFieldKey, mode), effSections: effective(sections, (x) => x.sectionKey, mode), effQuestions: effective(questions, (q) => q.lineageKey, mode), effTypes: effective(doctypes, (t) => t.documentTypeKey, mode) };
  const group = <T extends { combinationId: string }>(rows: T[]) => { const m = new Map<string, T[]>(); for (const r of rows) m.set(r.combinationId, [...(m.get(r.combinationId) ?? []), r]); return m; };
  const gSel = group(allSel), gForms = group(allForms), gReq = group(allReq), gRules = group(allRules), gChecks = group(allChecks);
  const by = <T extends { combinationId: string }>(g: Map<string, T[]>, id: string) => g.get(id) ?? [];
  const out = new Map<string, { snapshot: Snapshot; sha256: string }>();
  for (const comp of comps) {
    // The row's full path, pathway first (SA-1B-55): Pathway › Program › Category › Sub-category.
    const chain: any[] = []; for (let n: any = comp.program; n; n = n.parentNodeKey ? nodes.find((x) => x.programNodeKey === n.parentNodeKey) : null) chain.unshift(n);
    out.set(comp.id, assemble(comp, chain, mode, { fields, sections, questions, doctypes, derived, selections: by(gSel, comp.id), cforms: by(gForms, comp.id), requirements: by(gReq, comp.id), rules: by(gRules, comp.id), checks: by(gChecks, comp.id), allMaps, shared }));
  }
  return out;
}

/** W1-02 (break M2): kept as before the park, so a release made with a portal or an Online line keeps its fingerprint on
 *  an older database; a database made since holds no portal or online version, so these keys never appear there.
 *  F1 (CHECK fixes): what the channel rules need to know about a line's form beyond its field maps, only when it matters,
 *  so configurations without online versions keep their fingerprint: an Online line's approved online versions from
 *  the portal (none, or how many, mapped or not), and a form the library has only online (a PDF line has nothing to fill). */
function formEditions(f: { channel?: string | null; form: { editions: FormEdition[] } }, portalKey: string | null) {
  const eds = f.form.editions;
  const online = eds.filter((e) => e.channel === "ONLINE"), pdf = eds.filter((e) => e.channel !== "ONLINE");
  return { ...(f.channel === "ONLINE" ? { online_versions: online.filter((e) => e.portalKey === portalKey).length } : {}), ...(online.length && !pdf.length ? { online_only: true } : {}) };
}

function assemble(comp: any, chain: any[], mode: Mode, rows: { fields: any[]; sections: any[]; questions: any[]; doctypes: any[]; derived: any[]; selections: any[]; cforms: any[]; requirements: any[]; rules: any[]; checks: any[]; allMaps: any[]; shared: { lists: Map<string, { key: string; label: string }[]>; effFields: any[]; effSections: any[]; effQuestions: any[]; effTypes: any[]; entriesOf: (editionId: string) => any[] } }): { snapshot: Snapshot; sha256: string } {
  const { derived, selections, cforms, requirements, rules, checks, allMaps, shared } = rows;
  const rv: Record<string, string> = {};
  const note = (kind: string, key: string, r: { version: number; status: string }) => { rv[`${kind}:${key}`] = `v${r.version} ${r.status}`; };

  const forms = effective(cforms, (r) => r.lineageKey, mode);
  // F1: PDF editions first, as before; an online version only on a line filed Online, from the combination's portal.
  // New keys appear only when set, so a configuration without channels keeps its fingerprint.
  const fieldMaps = [...forms].sort((a, b) => a.lineageKey.localeCompare(b.lineageKey)).flatMap((f) => [
    ...(f.form.editions as FormEdition[]).filter((e) => e.channel !== "ONLINE").sort(compareEditions),
    ...(f.form.editions as FormEdition[]).filter((e) => e.channel === "ONLINE" && f.channel === "ONLINE" && e.portalKey === comp.portalKey).sort((a, b) => (a.capturedOn?.toISOString() ?? "").localeCompare(b.capturedOn?.toISOString() ?? "") || a.editionLabel.localeCompare(b.editionLabel, "en", { numeric: true })),
  ].map((e) => {
    const entries = shared.entriesOf(e.id);
    const online = e.channel === "ONLINE" ? { channel: "ONLINE", portal: e.portalKey, captured_on: e.capturedOn?.toISOString().slice(0, 10) ?? null, recheck_by: e.recheckBy?.toISOString().slice(0, 10) ?? null, content_sha256: e.contentSha256 } : {};
    return { form_number: f.form.formKey, form_edition: e.editionLabel, official_file: e.officialFile, form_sha256: e.sha256, inventory_file: e.inventoryFile, ...online,
      entries: entries.map((m) => ({ data_path: m.dataPath, caption: m.caption, heading: m.heading, outcome: m.outcome, person: m.person, row: m.row, fact: m.canonicalFieldKey, transform: m.transform, condition: m.condition, confidence: m.confidence, evidence_quote: m.evidenceQuote, unresolved_reason: m.reason, item_version: m.version, status: m.status, origin: m.origin,
        ...(m.screenKey ? { screen: m.screenKey, screen_order: m.screenOrder, input_order: m.inputOrder } : {}), ...(m.optionMap ? { option_map: m.optionMap } : {}), ...(m.listPurpose ? { list_purpose: m.listPurpose } : {}) })) };
  })).filter((m) => m.entries.length);

  // The library is shared; a combination's snapshot carries the fields, sections and placements its forms and
  // selected sections use, plus every field its conditions read.
  const { effFields, effSections, effQuestions, effTypes } = shared;
  const effReq = effective(requirements, (r) => r.lineageKey, mode);
  const effRules = effective(rules, (r) => r.predicateKey, mode);
  const effChecks = effective(checks, (c) => c.checkKey, mode);
  const selected = new Set(selections.map((s) => s.sectionKey));
  const used = new Set<string>();
  for (const m of fieldMaps) for (const e of m.entries) if (e.fact) used.add(e.fact);
  const conds = [...forms.map((f) => f.predicateJson), ...effReq.map((r) => r.predicateJson), ...effRules.map((r) => r.predicateJson), ...effQuestions.map((q) => q.predicateJson)];
  for (const c of conds) if (c) for (const m of JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)) used.add(m[1]);
  for (const d of derived) if ([...used].includes(d.derivedKey)) for (const i of [...d.inputs, d.reference]) used.add(i);
  const placements = effQuestions.filter((q) => selected.has(q.sectionKey) || used.has(q.canonicalFieldKey));
  for (const p of placements) used.add(p.canonicalFieldKey);

  const snapshot: Snapshot = {
    contract_version: "combination-config/v0",
    combination: { key: comp.combinationKey, label: comp.label, program: (chain.find((n) => n.nodeKind === "PROGRAM") ?? comp.program).label, pathway: chain.find((n) => n.nodeKind === "PATHWAY")?.label ?? null, participants: comp.participants as any[], source_basis: comp.sourceBasis, basis_note: comp.basisNote,
      path: chain.map((n) => n.label), client_type: chain.find((n) => n.nodeKind === "PATHWAY")?.clientType ?? null, allowed_locations: comp.program.allowedLocations ?? [], ...(comp.portalKey ? { portal: comp.portalKey } : {}) },
    mode,
    canonical_fields: effFields.filter((f) => used.has(f.canonicalFieldKey)).sort((a, b) => a.canonicalFieldKey.localeCompare(b.canonicalFieldKey)).map((f) => { note("field", f.canonicalFieldKey, f); return { id: f.canonicalFieldKey, meaning: f.meaning, value_type: f.valueType, data_type: f.dataType, scope: f.scope, item_version: f.version, status: f.status, origin: f.origin, ...(f.answerListKey && shared.lists.has(f.answerListKey) ? { answer_list: { key: f.answerListKey, values: shared.lists.get(f.answerListKey) } } : {}) }; }),
    sections: selections.map((s) => effSections.find((x) => x.sectionKey === s.sectionKey)).filter(Boolean).map((s) => { note("section", s!.sectionKey, s!); return { id: s!.sectionKey, title: s!.title, meaning: s!.meaning, item_version: s!.version, status: s!.status }; }),
    placements: placements.sort((a, b) => a.sectionKey.localeCompare(b.sectionKey) || a.displayOrder - b.displayOrder).map((q) => { note("placement", q.lineageKey, q); return { lineage: q.lineageKey, fact: q.canonicalFieldKey, section_id: q.sectionKey, order: q.displayOrder, question_text: q.questionText, help_text: q.helpText, repeats: q.repeats, tier: q.tier, collected_from: q.collectedFrom, client_visible: q.clientVisible, condition: q.predicateJson, condition_effect: q.conditionEffect, condition_plain: q.conditionPlain, rule_only: q.ruleOnly, item_version: q.version, status: q.status }; }),
    forms: forms.sort((a, b) => a.lineageKey.localeCompare(b.lineageKey)).map((f) => { note("form", f.lineageKey, f); return { form_number: f.form.formKey, title: f.form.displayName, form_kind: f.form.formKind, who: f.who, status: f.attachMode === "COMBINATION_MANDATORY" ? "always" : "conditional", condition: f.predicateJson, condition_plain: f.conditionPlain, source_quote: f.sourceQuote, item_version: f.version, origin: f.origin, ...(f.channel && f.channel !== "PDF_UPLOAD" ? { channel: f.channel } : {}), ...formEditions(f, comp.portalKey),
      // S5: only when set, so a line that keeps the defaults keeps its fingerprint (no draft change appears).
      ...(f.minAge ? { min_age: f.minAge } : {}), ...(f.signedBy ? { signed_by: f.signedBy } : {}) }; }),
    field_maps: fieldMaps,
    document_requirements: effReq.sort((a, b) => a.lineageKey.localeCompare(b.lineageKey)).map((r) => { note("requirement", r.lineageKey, r); return { lineage: r.lineageKey, document_type: effTypes.find((t) => t.documentTypeKey === r.documentTypeKey)?.name ?? r.documentTypeKey, document_type_key: r.documentTypeKey, who: r.appliesToRoles, provided_by: r.providedBy, base_or_conditional: r.attachMode === "COMBINATION_MANDATORY" ? "base" : "conditional", condition: r.predicateJson, condition_plain: r.conditionPlain, source_quote: r.sourceQuote, source_file: r.sourceFile, note: r.note, item_version: r.version, status: r.status, origin: r.origin }; }),
    document_types: effTypes.filter((t) => effReq.some((r) => r.documentTypeKey === t.documentTypeKey)).sort((a, b) => a.documentTypeKey.localeCompare(b.documentTypeKey)).map((t) => ({ key: t.documentTypeKey, name: t.name, category: t.category, supplies_facts: t.suppliesFacts, reader_profile: t.readerProfile })),
    rules: effRules.sort((a, b) => a.predicateKey.localeCompare(b.predicateKey)).map((r) => { note("rule", r.predicateKey, r); return { id: r.predicateKey, when: r.predicateJson, when_plain: r.whenPlain, then: r.thenPlain, for_whom: r.forWhom, source_quote: r.sourceQuote, item_version: r.version, status: r.status, origin: r.origin }; }),
    derived_fields: [...derived].sort((a, b) => a.derivedKey.localeCompare(b.derivedKey)).map((d) => ({ id: d.derivedKey, calculation: d.calculation, inputs: d.inputs, reference: d.reference, plain: d.plain, executable: d.executable })),
    checks: effChecks.sort((a, b) => a.checkKey.localeCompare(b.checkKey)).map((c) => ({ id: c.checkKey, group: c.checkGroup, applies_to: c.appliesTo, condition: c.predicateJson, severity: c.severity, message: c.message, source_quote: c.sourceQuote, illustrative: c.illustrative, item_version: c.version })),
    row_versions: rv,
  };
  const { row_versions: _rv, mode: _m, ...hashed } = snapshot;
  return { snapshot, sha256: sha256(canonical(content(hashed) as any)) };
}
