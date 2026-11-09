// Builds one combination's configuration from the database rows, in the same shape as the released-configuration
// contract (contracts/released-configuration.v0.schema.json, combination-config/v0), so the P5 case engine and this
// studio's renderer consume one format. mode "draft" takes each lineage's newest DRAFT row, else its PUBLISHED row;
// mode "published" takes PUBLISHED rows only. A released version is this snapshot frozen and hashed (ConfigRelease).
// Every list is sorted by its key so the same content always gives the same fingerprint.
import { fingerprintLine } from "./channels.ts";
import { markOf } from "./field-scope.ts"; // C3.16: a placement carries its field's new scope (household, organisation) only
import type { CanonicalField, FormEdition, FormFieldMap, PrismaClient } from "@prisma/client";
import { canonical, sha256 } from "../../contracts/rules.ts";
import { compareEditions } from "./programs.ts";
import { gateFacts, snapshotEligibility, type SnapshotEligibility } from "./eligibility-gates.ts";
import { frozenSources, publishedNumbers, type FrozenSource, type SourceEntry } from "./source-register.ts";
import { snapSets } from "./document-sets.ts";

export type Mode = "draft" | "published";
type Versioned = { status: string; version: number; id?: string; supersedesId?: string | null };

/** Newest effective row per lineage key. RETIRED as the newest row removes the lineage. With `heldRetires` (a
 *  combination's own lines: documents, rules, forms, checks), a removal saved over a released row waits for its release:
 *  in the published view the released row stands until a release supersedes it (W1-15 slice 3, open point 3). */
export function effective<T extends Versioned>(rows: T[], keyOf: (r: T) => string, mode: Mode, heldRetires = false): T[] {
  const by = new Map<string, T[]>();
  for (const r of rows) { const k = keyOf(r); by.set(k, [...(by.get(k) ?? []), r]); }
  const out: T[] = [];
  for (const list of by.values()) {
    const sorted = [...list].sort((a, b) => b.version - a.version);
    const pick = mode === "draft" ? sorted.find((r) => r.status === "DRAFT") ?? sorted.find((r) => r.status === "PUBLISHED" || r.status === "RETIRED") : sorted.find((r) => r.status === "PUBLISHED" || r.status === "RETIRED");
    const held = heldRetires && mode === "published" && pick?.status === "RETIRED" && pick.supersedesId ? sorted.find((r) => r.id === pick.supersedesId && r.status === "PUBLISHED") : undefined;
    if (held) out.push(held);
    else if (pick && pick.status !== "RETIRED") out.push(pick);
  }
  return out;
}

export const VALUE_TYPE_TO_DATA_TYPE: Record<string, "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM" | "COMPOSITE"> = {
  text: "STRING", yes_no: "BOOLEAN", date: "DATE", code: "ENUM", country: "ENUM", address: "COMPOSITE", number: "NUMBER", phone: "COMPOSITE", email: "STRING",
  // P-47 question types (C4.4). "document" is not one: an upload is a checklist line, not a question (P-130).
  long_text: "STRING", multi_choice: "ENUM", person_name: "COMPOSITE", period_history: "COMPOSITE", declaration: "BOOLEAN",
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
  /** W1-15 slice 1: a person's choices over the rules' source per fact and person role, and the Pre-qualification
   *  ticks; present only when the combination has any (engine/sources.ts), so other configurations keep their fingerprint. */
  fact_sources?: { role: string; fact: string; source: "DOCUMENT" | "CLIENT" | "AGENT" | null; document_type: string | null; prequalification: boolean; reason: string | null; source_reason?: string; origin: string }[];
  /** C6.9 part 1 (BR-1, BR-6): the eligibility gates, officer's judgement lines and disclaimer, frozen with the release;
   *  present only when the combination has gates or judgement lines, so other configurations keep their fingerprint. */
  eligibility?: SnapshotEligibility;
  /** G1 (C5.4) BR-9: the source entries of the numbers it publishes, frozen with the release; present only when there are
   *  any (the fact_sources pattern), so other configurations keep their fingerprint. */
  sources?: FrozenSource[];
  /** C4.2 (P-91, P-294 (B)): the plain title of each section a pulled question sits in that the combination did not
   *  choose (forms pull their questions, so "taken out" still asks them). Released with the combination, so a renamed
   *  section reaches its cases (review M2 on #866); present only when there are any, so other configurations keep
   *  their fingerprint. Without it a pulled question showed its section's raw key. */
  section_titles?: { id: string; title: string }[];
  row_versions: Record<string, string>;
};

/** A source_entry row as the engine reads it (one shape for the snapshot, the gate and the API). */
export const sourceEntryOf = (r: { itemKind: string; itemKey: string; valuePath: string; value: string; citationUrl: string | null; citationPage: string | null; citationQuote: string | null; citationDate: Date | null; nonePublished: boolean; nonePublishedReason: string | null; sample: boolean }): SourceEntry => ({
  kind: r.itemKind, key: r.itemKey, address: r.valuePath, value: r.value,
  cited: r.citationUrl ? { url: r.citationUrl, page: r.citationPage, quote: r.citationQuote ?? "", date: r.citationDate ? r.citationDate.toISOString().slice(0, 10) : "" } : null,
  none_published: r.nonePublished ? { reason: r.nonePublishedReason ?? "" } : null, sample: r.sample,
});

/** The release fingerprint of a snapshot as stored: the same expression assemble() uses (C6.12 break B2: a route that
 *  stores what a release says re-checks the snapshot against its release's sha256, since a row can be edited underneath). */
export function snapshotHash(snapshot: Snapshot): string {
  const { row_versions: _rv, mode: _m, ...hashed } = snapshot;
  return sha256(canonical(content({ ...hashed, forms: hashed.forms.map(fingerprintLine) }) as Parameters<typeof canonical>[0]));
}

export async function buildSnapshot(db: PrismaClient, workspaceId: string, combinationId: string, mode: Mode): Promise<{ snapshot: Snapshot; sha256: string }> {
  return (await buildSnapshots(db, workspaceId, [combinationId], mode)).get(combinationId)!;
}

/** Many combinations at once (the catalogue overview): the shared library tables are read once, the per-combination
 *  tables with one query each, so 300 combinations cost about a dozen queries instead of a dozen per combination.
 *  Same assembly as buildSnapshot, so the fingerprints are identical. */
export async function buildSnapshots(db: PrismaClient, workspaceId: string, combinationIds: string[], mode: Mode): Promise<Map<string, { snapshot: Snapshot; sha256: string }>> {
  const ws = { workspaceId };
  const inComp = { combinationId: { in: combinationIds } };
  const [comps, nodes, fields, sections, questions, allSel, allForms, allReq, doctypes, allRules, derived, allChecks, answerLists, allSources, allEntries] = await Promise.all([
    db.combination.findMany({ where: { id: { in: combinationIds } }, include: { program: true } }), db.programDef.findMany({ where: ws }),
    db.canonicalField.findMany({ where: ws }), db.logicalSection.findMany({ where: ws }), db.sectionQuestion.findMany({ where: ws }),
    db.sqrSectionSelection.findMany({ where: inComp, orderBy: [{ sectionOrder: "asc" }, { sectionKey: "asc" }] }), // C4.1 m1: ties read the same everywhere
    db.combinationForm.findMany({ where: inComp, include: { form: { include: { editions: true } } } }),
    db.documentRequirement.findMany({ where: inComp }), db.documentType.findMany({ where: ws }),
    db.predicate.findMany({ where: inComp }), db.derivedField.findMany({ where: ws }), db.check.findMany({ where: inComp }),
    db.answerList.findMany({ where: ws, include: { values: { orderBy: { sortOrder: "asc" } } } }),
    db.factSource.findMany({ where: inComp }),
    // G1 BR-7: the workspace's source entries, read once for every combination (challenge M1: both pages agree).
    db.sourceEntry.findMany({ where: ws }),
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
  const gSel = group(allSel), gForms = group(allForms), gReq = group(allReq), gRules = group(allRules), gChecks = group(allChecks), gSources = group(allSources);
  const by = <T extends { combinationId: string }>(g: Map<string, T[]>, id: string) => g.get(id) ?? [];
  const entries = allEntries.map(sourceEntryOf);
  const out = new Map<string, { snapshot: Snapshot; sha256: string }>();
  for (const comp of comps) {
    // The row's full path, pathway first (SA-1B-55): Pathway › Program › Category › Sub-category.
    const chain: any[] = []; for (let n: any = comp.program; n; n = n.parentNodeKey ? nodes.find((x) => x.programNodeKey === n.parentNodeKey) : null) chain.unshift(n);
    out.set(comp.id, assemble(comp, chain, mode, { fields, sections, questions, doctypes, derived, selections: by(gSel, comp.id), cforms: by(gForms, comp.id), requirements: by(gReq, comp.id), rules: by(gRules, comp.id), checks: by(gChecks, comp.id), sources: by(gSources, comp.id), entries: entries.filter((e) => e.key.startsWith(`${comp.combinationKey}/`)), allMaps, shared }));
  }
  return out;
}

/** One map row as a snapshot carries it (one shape for a release and for a form added to a case, C7.8 BR-4). */
export const snapEntry = (m: FormFieldMap) => ({ data_path: m.dataPath, caption: m.caption, heading: m.heading, outcome: m.outcome, person: m.person, row: m.row, fact: m.canonicalFieldKey, transform: m.transform, condition: m.condition, confidence: m.confidence, evidence_quote: m.evidenceQuote, unresolved_reason: m.reason, item_version: m.version, status: m.status, origin: m.origin,
  ...(m.screenKey ? { screen: m.screenKey, screen_order: m.screenOrder, input_order: m.inputOrder } : {}), ...(m.optionMap ? { option_map: m.optionMap } : {}), ...(m.listPurpose ? { list_purpose: m.listPurpose } : {}), ...(m.conditionRule ? { condition_rule: m.conditionRule } : {}) });
/** One fact definition as a snapshot carries it (the same for a release and for a form added to a case, C7.8 BR-4). */
export const snapField = (f: CanonicalField, lists: Map<string, { key: string; label: string }[]>) => ({ id: f.canonicalFieldKey, meaning: f.meaning, value_type: f.valueType, data_type: f.dataType, scope: f.scope, item_version: f.version, status: f.status, origin: f.origin, ...(f.mustVerifyBeforeFiling ? { must_verify: true } : {}), ...(f.answerListKey && lists.has(f.answerListKey) ? { answer_list: { key: f.answerListKey, values: lists.get(f.answerListKey) } } : {}) });

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

/** C11.9: sort form lines by the combination's filing order (null: by line key, today's order and hash). */
const byFilingOrder = (order: unknown) => {
  const at = new Map((Array.isArray(order) ? order : []).map((k, i) => [String(k), i]));
  return (a: { lineageKey: string }, b: { lineageKey: string }) => (at.get(a.lineageKey) ?? Infinity) - (at.get(b.lineageKey) ?? Infinity) || a.lineageKey.localeCompare(b.lineageKey);
};
/** C6.15 (SA-1B-19): a type's substitute sets travel with the release, each member named, only when it has some (so a
 *  type without sets keeps its fingerprint). */
function docSets(t: { sets?: unknown }, effTypes: { documentTypeKey: string; name: string }[], all: { documentTypeKey: string; name: string; status: string; version: number }[]) {
  // Break F3: a member is named from the library even when it is retired (never its key), and a retired one is marked so
  // the release check refuses it (SA-1B-19 rule 6).
  const newest = (k: string) => all.filter((x) => x.documentTypeKey === k).sort((a, b) => b.version - a.version)[0];
  const sets = snapSets(t.sets, (k) => effTypes.find((x) => x.documentTypeKey === k)?.name ?? newest(k)?.name, (k) => newest(k)?.status === "RETIRED");
  return sets ? { sets } : {};
}
function assemble(comp: any, chain: any[], mode: Mode, rows: { fields: any[]; sections: any[]; questions: any[]; doctypes: any[]; derived: any[]; selections: any[]; cforms: any[]; requirements: any[]; rules: any[]; checks: any[]; sources?: any[]; entries?: SourceEntry[]; allMaps: any[]; shared: { lists: Map<string, { key: string; label: string }[]>; effFields: any[]; effSections: any[]; effQuestions: any[]; effTypes: any[]; entriesOf: (editionId: string) => any[] } }): { snapshot: Snapshot; sha256: string } {
  const { derived, selections, cforms, requirements, rules, checks, allMaps, shared } = rows;
  const effSources = effective(rows.sources ?? [], (r: any) => r.lineageKey, mode).filter((r: any) => r.status !== "RETIRED" && (r.source || r.prequalification));
  const rv: Record<string, string> = {};
  const note = (kind: string, key: string, r: { version: number; status: string }) => { rv[`${kind}:${key}`] = `v${r.version} ${r.status}`; };

  const forms = effective(cforms, (r) => r.lineageKey, mode, true);
  // F1: PDF editions first, as before; an online version only on a line filed Online, from the combination's portal.
  // New keys appear only when set, so a configuration without channels keeps its fingerprint.
  const fieldMaps = [...forms].sort((a, b) => a.lineageKey.localeCompare(b.lineageKey)).flatMap((f) => [
    ...(f.form.editions as FormEdition[]).filter((e) => e.channel !== "ONLINE").sort(compareEditions),
    ...(f.form.editions as FormEdition[]).filter((e) => e.channel === "ONLINE" && f.channel === "ONLINE" && e.portalKey === comp.portalKey).sort((a, b) => (a.capturedOn?.toISOString() ?? "").localeCompare(b.capturedOn?.toISOString() ?? "") || a.editionLabel.localeCompare(b.editionLabel, "en", { numeric: true })),
  ].map((e) => {
    const entries = shared.entriesOf(e.id);
    const online = e.channel === "ONLINE" ? { channel: "ONLINE", portal: e.portalKey, captured_on: e.capturedOn?.toISOString().slice(0, 10) ?? null, recheck_by: e.recheckBy?.toISOString().slice(0, 10) ?? null, content_sha256: e.contentSha256 } : {};
    return { form_number: f.form.formKey, form_edition: e.editionLabel, official_file: e.officialFile, form_sha256: e.sha256, inventory_file: e.inventoryFile, ...online,
      entries: entries.map(snapEntry) };
  })).filter((m) => m.entries.length);

  // The library is shared; a combination's snapshot carries the fields, sections and placements its forms and
  // selected sections use, plus every field its conditions read.
  const { effFields, effSections, effQuestions, effTypes } = shared;
  const effReq = effective(requirements, (r) => r.lineageKey, mode, true);
  const effRules = effective(rules, (r) => r.predicateKey, mode, true);
  const effChecks = effective(checks, (c) => c.checkKey, mode, true);
  const selected = new Set(selections.map((s) => s.sectionKey));
  const used = new Set<string>();
  for (const m of fieldMaps) for (const e of m.entries) if (e.fact) used.add(e.fact);
  const conditionFields = (c: unknown) => { if (c) for (const m of JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)) used.add(m[1]); };
  for (const c of [...forms.map((f) => f.predicateJson), ...effReq.map((r) => r.predicateJson), ...effRules.map((r) => r.predicateJson)]) conditionFields(c);
  // Lead check L5: a minimum age is decided by each person's date of birth, so its question travels with the forms.
  if (forms.some((f) => f.minAge)) used.add("person.date_of_birth");
  // QA-262: only the questions this combination places read in their conditions, repeated until nothing new is placed. A
  // condition on a library question it does not ask stays out: a release publishes only what its snapshot carries, so
  // another combination's draft condition here would differ from the published snapshot and refuse every release.
  let placements: typeof effQuestions = [];
  for (let size = -1; size !== used.size;) {
    size = used.size;
    for (const d of derived) if ([...used].includes(d.derivedKey)) for (const i of [...d.inputs, d.reference]) used.add(i);
    placements = effQuestions.filter((q) => selected.has(q.sectionKey) || used.has(q.canonicalFieldKey));
    for (const q of placements) conditionFields(q.predicateJson);
  }
  // W1-15 (P-97): a placement in a section only the client answers says so (only then, so the fingerprint keeps).
  const clientOnly = new Set(effSections.filter((x: any) => x.clientOnly).map((x: any) => x.sectionKey));
  for (const p of placements) used.add(p.canonicalFieldKey);
  // C6.9 BR-5: the facts the gates read travel with the release (their words), added after placements and after the
  // derived-input expansion on purpose: a gate never places a question or pulls in a derived value's inputs by itself.
  // The release check (engine/eligibility-gates.ts gateProblems) refuses a gate fact no case is asked, a derived one too.
  const eligibility = snapshotEligibility(comp.eligibility);
  for (const f of gateFacts(eligibility)) used.add(f);

  const snapshot: Snapshot = {
    contract_version: "combination-config/v0",
    combination: { key: comp.combinationKey, label: comp.label, program: (chain.find((n) => n.nodeKind === "PROGRAM") ?? comp.program).label, pathway: chain.find((n) => n.nodeKind === "PATHWAY")?.label ?? null, participants: comp.participants as any[], source_basis: comp.sourceBasis, basis_note: comp.basisNote,
      path: chain.map((n) => n.label), client_type: chain.find((n) => n.nodeKind === "PATHWAY")?.clientType ?? null, allowed_locations: comp.program.allowedLocations ?? [], ...(comp.portalKey ? { portal: comp.portalKey } : {}) },
    mode,
    canonical_fields: effFields.filter((f) => used.has(f.canonicalFieldKey)).sort((a, b) => a.canonicalFieldKey.localeCompare(b.canonicalFieldKey)).map((f) => { note("field", f.canonicalFieldKey, f); return snapField(f, shared.lists); }),
    sections: selections.map((s) => effSections.find((x) => x.sectionKey === s.sectionKey)).filter(Boolean).map((s) => { note("section", s!.sectionKey, s!); return { id: s!.sectionKey, title: s!.title, meaning: s!.meaning, item_version: s!.version, status: s!.status }; }),
    placements: placements.sort((a, b) => a.sectionKey.localeCompare(b.sectionKey) || a.displayOrder - b.displayOrder || a.lineageKey.localeCompare(b.lineageKey)).map((q) => { note("placement", q.lineageKey, q); return { lineage: q.lineageKey, fact: q.canonicalFieldKey, section_id: q.sectionKey, order: q.displayOrder, question_text: q.questionText, help_text: q.helpText, repeats: q.repeats, tier: q.tier, collected_from: q.collectedFrom, client_visible: q.clientVisible, condition: q.predicateJson, condition_effect: q.conditionEffect, condition_plain: q.conditionPlain, rule_only: q.ruleOnly, ...(clientOnly.has(q.sectionKey) ? { client_only: true } : {}), ...markOf(effFields.find((f) => f.canonicalFieldKey === q.canonicalFieldKey)?.scope), item_version: q.version, status: q.status }; }),
    // C11.9 (P-116): the combination's filing order when one is set (lineage keys); lines it does not name follow by key.
    forms: forms.sort(byFilingOrder(comp.formOrder)).map((f) => { note("form", f.lineageKey, f); return { form_number: f.form.formKey, title: f.form.displayName, form_kind: f.form.formKind, ...(f.form.formRole ? { form_role: f.form.formRole } : {}), who: f.who, status: f.attachMode === "COMBINATION_MANDATORY" ? "always" : "conditional", condition: f.predicateJson, condition_plain: f.conditionPlain, source_quote: f.sourceQuote, item_version: f.version, origin: f.origin, ...(f.channel && f.channel !== "PDF_UPLOAD" ? { channel: f.channel } : {}), ...(f.signature && f.signature !== "NONE" ? { signature: f.signature } : {}), ...formEditions(f, comp.portalKey),
      // S5: only when set, so a line that keeps the defaults keeps its fingerprint (no draft change appears).
      ...(f.minAge ? { min_age: f.minAge } : {}), ...(f.signedBy ? { signed_by: f.signedBy } : {}), ...(f.copies && f.copies > 1 ? { copies: f.copies } : {}) }; }),
    field_maps: fieldMaps,
    document_requirements: effReq.sort((a, b) => a.lineageKey.localeCompare(b.lineageKey)).map((r) => { note("requirement", r.lineageKey, r); return { lineage: r.lineageKey, document_type: effTypes.find((t) => t.documentTypeKey === r.documentTypeKey)?.name ?? r.documentTypeKey, document_type_key: r.documentTypeKey, who: r.appliesToRoles, provided_by: r.providedBy, base_or_conditional: r.attachMode === "COMBINATION_MANDATORY" ? "base" : "conditional", condition: r.predicateJson, condition_plain: r.conditionPlain, source_quote: r.sourceQuote, source_file: r.sourceFile, note: r.note, ...(r.position != null ? { position: r.position } : {}), ...(Array.isArray(r.alternatives) && r.alternatives.length ? { alternatives: r.alternatives } : {}), ...(r.setName ? { set_name: r.setName } : {}), item_version: r.version, status: r.status, origin: r.origin }; }),
    document_types: effTypes.filter((t) => effReq.some((r) => r.documentTypeKey === t.documentTypeKey)).sort((a, b) => a.documentTypeKey.localeCompare(b.documentTypeKey)).map((t) => ({ key: t.documentTypeKey, name: t.name, category: t.category, supplies_facts: t.suppliesFacts, ...(t.suppliesAbout && Object.keys(t.suppliesAbout).length ? { supplies_about: t.suppliesAbout } : {}), reader_profile: t.readerProfile, ...docSets(t, effTypes, rows.doctypes) })),
    rules: effRules.sort((a, b) => a.predicateKey.localeCompare(b.predicateKey)).map((r) => { note("rule", r.predicateKey, r); return { id: r.predicateKey, when: r.predicateJson, when_plain: r.whenPlain, then: r.thenPlain, for_whom: r.forWhom, source_quote: r.sourceQuote, item_version: r.version, status: r.status, origin: r.origin }; }),
    derived_fields: [...derived].sort((a, b) => a.derivedKey.localeCompare(b.derivedKey)).map((d) => ({ id: d.derivedKey, calculation: d.calculation, inputs: d.inputs, reference: d.reference, plain: d.plain, executable: d.executable })),
    checks: effChecks.sort((a, b) => a.checkKey.localeCompare(b.checkKey)).map((c) => ({ id: c.checkKey, group: c.checkGroup, applies_to: c.appliesTo, condition: c.predicateJson, severity: c.severity, message: c.message, source_quote: c.sourceQuote, illustrative: c.illustrative, item_version: c.version })),
    ...(effSources.length ? { fact_sources: effSources.sort((a: any, b: any) => a.lineageKey.localeCompare(b.lineageKey)).map((r: any) => { note("fact source", r.lineageKey, r); return { role: r.role, fact: r.canonicalFieldKey, source: r.source ?? null, document_type: r.documentTypeKey ?? null, prequalification: r.prequalification, reason: r.reason ?? null, ...(r.sourceReason ? { source_reason: r.sourceReason } : {}), origin: r.origin }; }) } : {}),
    ...(eligibility ? { eligibility } : {}),
    row_versions: rv,
  };
  // G1 BR-9: only entries that answer a number this snapshot publishes, and only when there are any.
  if (rows.entries?.length) { const frozen = frozenSources(publishedNumbers(snapshot), rows.entries); if (frozen.length) snapshot.sources = frozen; }
  // C4.2 (P-91): the titles of the sections pulled questions sit in that this combination did not choose (words only).
  const pulled = [...new Set(placements.map((q) => q.sectionKey).filter((k) => !selected.has(k)))].sort();
  const titled = pulled.map((k) => effSections.find((x) => x.sectionKey === k)).filter(Boolean).map((x) => ({ id: x!.sectionKey as string, title: x!.title as string }));
  if (titled.length) snapshot.section_titles = titled;
  const { row_versions: _rv, mode: _m, ...hashed } = snapshot;
  // C-8 (W1-10 slice 1): a PDF upload signed by hand and scanned is fingerprinted in its old spelling, so a combination
  // released before the slice does not show "changed since release".
  return { snapshot, sha256: sha256(canonical(content({ ...hashed, forms: hashed.forms.map(fingerprintLine) }) as any)) };
}
