// Loads a released configuration (contract shape, e.g. p3/releases/c1-v3) into the database for one combination.
// Used by "Load sample inputs" so a demonstration starts from the reviewed release instead of re-running every paid
// AI draft; the rows are labelled IMPORTED_RELEASE with the release hash and the drafting run ids. Library rows
// (fields, sections, placements, document types, derived fields) are shared: an existing key is reused, never
// duplicated. A role filter makes a combination variant (for example "principal only") from the same release.
import type { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSnapshot, subjectKindOf, VALUE_TYPE_TO_DATA_TYPE } from "./snapshot.ts";
import { publishedNumbers, SAMPLE_LOADER, statesInDigits } from "./source-register.ts";
import { libraryType } from "./form-type.ts";

export const PROTOTYPE = join(import.meta.dirname, "..", "..");
export const SOLUTION = join(PROTOTYPE, "..");
export const OFFICIAL = join(SOLUTION, "official-sources", "ircc");
export const manifest = () => JSON.parse(readFileSync(join(OFFICIAL, "manifest.json"), "utf8")).items as any[];
/** W1-15 slice 1 (P-130, P-97; challenge M6, m2): Sample library data applied with the sample library (samples/). */
const QD = () => JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "questions-and-documents.json"), "utf8")) as { clientOnlySections: string[]; documentSupplies: Record<string, { facts: string[]; about: Record<string, string> }> };
/** P-319: the demo's form roles (samples/form-roles.json), set on the library forms that exist; a form added later gets
 *  its role when the next sample load or import runs. In the product an author sets a role per form (FormLibrary.setRole). */
export async function applySampleFormRoles(db: Pick<PrismaClient, "govFormDef">, workspaceId: string) {
  const { roles } = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "form-roles.json"), "utf8")) as { roles: Record<string, string> };
  for (const [formKey, formRole] of Object.entries(roles)) await db.govFormDef.updateMany({ where: { workspaceId, formKey, formRole: null }, data: { formRole } });
}
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);

/** Which facts each supported document type can supply: the P5 reader profiles (a maker Proposal, D36). */
export function readerProfiles(): Map<string, { kind: string; facts: string[] }> {
  const d = JSON.parse(readFileSync(join(PROTOTYPE, "p5", "reader", "doc-types.json"), "utf8"));
  const out = new Map<string, { kind: string; facts: string[] }>();
  for (const [kind, k] of Object.entries<any>(d.kinds)) for (const name of k.configuration_document_types ?? []) out.set(name, { kind, facts: (k.facts ?? []).map((f: any) => f.fact) });
  return out;
}

export type ImportOptions = { by: string; releaseLabel: string; releaseSha: string; keepWho?: (who: string) => boolean; keepForm?: (formNumber: string) => boolean; combinationStatus?: "DRAFT" | "PUBLISHED";
  /** G1 (M4): who writes the import's own source entries (default: the sample loader, never a person). */
  sourcesBy?: string };

export async function importConfiguration(db: PrismaClient, workspaceId: string, combinationId: string, config: any, o: ImportOptions) {
  const ws = { workspaceId };
  const src = `${o.releaseLabel} ${o.releaseSha.slice(0, 12)}`;
  const counts: Record<string, number> = {};
  const inc = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };
  const keepWho = o.keepWho ?? (() => true), keepForm = o.keepForm ?? (() => true);
  const cs = o.combinationStatus ?? "PUBLISHED";

  // ---------------------------------------------------------------- shared library
  const existingFields = new Set((await db.canonicalField.findMany({ where: ws, select: { canonicalFieldKey: true } })).map((f) => f.canonicalFieldKey));
  const newFields = config.canonical_fields.filter((f: any) => !existingFields.has(f.id));
  await db.canonicalField.createMany({ data: newFields.map((f: any) => ({ ...ws, canonicalFieldKey: f.id, version: 1, status: "PUBLISHED", meaning: f.meaning, valueType: f.value_type,
    dataType: VALUE_TYPE_TO_DATA_TYPE[f.value_type] ?? "STRING", scope: f.id.startsWith("case.") ? "CASE_LEVEL" : "CLIENT_LEVEL", subjectKind: subjectKindOf(f.id), origin: "IMPORTED_RELEASE",
    sourceRef: `${src}; proposed by ${(f.proposed_by ?? []).join(", ")}`.slice(0, 900), updatedBy: o.by })) });
  inc("library fields added", newFields.length); inc("library fields reused", config.canonical_fields.length - newFields.length);

  const existingSections = new Set((await db.logicalSection.findMany({ where: ws, select: { sectionKey: true } })).map((s) => s.sectionKey));
  const qd = QD();
  await db.logicalSection.createMany({ data: config.sections.filter((s: any) => !existingSections.has(s.id)).map((s: any, i: number) => ({ ...ws, sectionKey: s.id, version: 1, status: "PUBLISHED", title: s.title, meaning: s.meaning, displayOrder: i, clientOnly: qd.clientOnlySections.includes(s.id), origin: "IMPORTED_RELEASE", updatedBy: o.by })) });
  await db.sqrSectionSelection.createMany({ data: config.sections.map((s: any, i: number) => ({ ...ws, combinationId, sectionKey: s.id, sectionOrder: i })), skipDuplicates: true });

  const existingPlacements = new Set((await db.sectionQuestion.findMany({ where: ws, select: { lineageKey: true } })).map((q) => q.lineageKey));
  const order = new Map<string, number>();
  const newPlacements = config.placements.filter((p: any) => !existingPlacements.has(p.fact));
  await db.sectionQuestion.createMany({ data: newPlacements.map((p: any) => { const n = (order.get(p.section_id) ?? 0) + 1; order.set(p.section_id, n); return {
    ...ws, lineageKey: p.fact, sectionKey: p.section_id, canonicalFieldKey: p.fact, displayOrder: n, helpText: p.reason ?? null, repeats: p.repeats, tier: p.tier, collectedFrom: p.collected_from,
    clientVisible: p.client_visible !== false, version: 1, status: "PUBLISHED", origin: "IMPORTED_RELEASE", updatedBy: o.by }; }) });
  inc("question placements added", newPlacements.length);

  const derivedKeys = new Set((await db.derivedField.findMany({ where: ws, select: { derivedKey: true } })).map((d) => d.derivedKey));
  await db.derivedField.createMany({ data: config.derived_fields.filter((d: any) => !derivedKeys.has(d.id)).map((d: any) => ({ ...ws, derivedKey: d.id, calculation: d.calculation, inputs: d.inputs, reference: d.reference, plain: d.plain, executable: !!d.executable })), skipDuplicates: true });

  const profiles = readerProfiles();
  const typeKeys = new Set((await db.documentType.findMany({ where: ws, select: { documentTypeKey: true } })).map((t) => t.documentTypeKey));
  const reqs = config.document_requirements.filter((d: any) => d.status !== "dismissed" && keepWho(d.who));
  for (const d of reqs) {
    const key = slug(d.document_type);
    if (typeKeys.has(key)) continue;
    typeKeys.add(key);
    const prof = profiles.get(d.document_type), more = qd.documentSupplies[key];
    await db.documentType.create({ data: { ...ws, documentTypeKey: key, name: d.document_type, category: d.provided_by ?? "client", version: 1, status: "PUBLISHED", origin: "IMPORTED_RELEASE", updatedBy: o.by, suppliesFacts: [...new Set([...(prof?.facts ?? []), ...(more?.facts ?? [])])], ...(more && Object.keys(more.about).length ? { suppliesAbout: more.about } : {}), readerProfile: prof ? { kind: prof.kind, basis: "P5 reader profile (maker Proposal; the release does not record it, D36)" } : undefined } });
    inc("document types added");
  }

  // ---------------------------------------------------------------- the combination's own configuration
  const lineageOf = (d: Quoted, i: number) => `${slug(d.document_type ?? "")}:${d.who}`.slice(0, 120) + ((reqs as Quoted[]).findIndex((x) => slug(x.document_type ?? "") === slug(d.document_type ?? "") && x.who === d.who) === i ? "" : `:${i}`);
  await db.documentRequirement.createMany({ data: reqs.map((d: any, i: number) => ({ ...ws, combinationId, lineageKey: lineageOf(d, i),
    documentTypeKey: slug(d.document_type), attachMode: d.base_or_conditional === "base" ? "COMBINATION_MANDATORY" : "ANSWER_CONDITIONAL", predicateJson: d.condition ?? undefined, conditionPlain: d.condition_plain, appliesToRoles: d.who,
    providedBy: d.provided_by ?? "client", sourceQuote: d.source_quote, sourceFile: d.source_file, note: d.reason ?? null, version: 1, status: cs, origin: "IMPORTED_RELEASE", updatedBy: o.by })) });
  inc("document requirements", reqs.length);

  const items = manifest();
  const keptForms = config.forms.filter((x: any) => keepWho(x.who) && keepForm(x.form_number));
  for (const f of keptForms) {
    const map = config.field_maps.find((m: any) => m.form_edition.startsWith(`${f.form_number} (`));
    const def = await db.govFormDef.upsert({ where: { workspaceId_formKey: { workspaceId, formKey: f.form_number } }, update: {}, create: { ...ws, formKey: f.form_number, displayName: f.title, formKind: map ? "data_form" : "document" } });
    await db.libraryFormDeletion.deleteMany({ where: { workspaceId, formKey: f.form_number } }); // X5 slice c: the sample load adds it back
    // C11.11 (QA-101): a checklist the release lists among its forms (IMM 5488, IMM 5905 in c1-v3) stays in the library
    // and is the combination's source, read by AI; it is never a filed form line, so the import makes no line for it.
    if (libraryType(def.formKind, def.displayName) !== "form") { inc("checklists kept as sources (not filed)"); continue; }
    await db.combinationForm.create({ data: { ...ws, combinationId, govFormDefId: def.id, lineageKey: f.form_number, who: f.who, attachMode: f.status === "always" ? "COMBINATION_MANDATORY" : "ANSWER_CONDITIONAL",
      predicateJson: f.condition ?? undefined, conditionPlain: f.condition_plain, sourceQuote: f.source_quote, version: 1, status: f.status === "dismissed" ? "RETIRED" : cs, origin: "IMPORTED_RELEASE", updatedBy: o.by } });
    inc("forms");
    if (!map) continue;
    const item = items.find((i) => i.sha256 === map.form_sha256);
    // The same file may already be in the library (the form intake added it when it was uploaded, without a box map).
    let ed = (await db.formEdition.findFirst({ where: { workspaceId, sha256: map.form_sha256 } })) ?? (await db.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId, editionLabel: map.form_edition } } }));
    if (ed && (await db.formFieldMap.count({ where: { formEditionId: ed.id } }))) continue; // the edition and its map are shared by every combination that files this form
    const invFile = item ? `prototype/p1/inventory/${item.file.replace(".pdf", "")}.inventory.json` : null;
    const inv = invFile ? JSON.parse(readFileSync(join(SOLUTION, invFile), "utf8")) : { fields: [] };
    const box = new Map<string, any>(inv.fields.filter((x: any) => x.data_path).map((x: any) => [x.data_path, x]));
    const data = { govFormDefId: def.id, officialFile: item?.file ?? null, inventoryFile: invFile, dataBoundBoxes: map.entries.length };
    ed = ed ? await db.formEdition.update({ where: { id: ed.id }, data }) : await db.formEdition.create({ data: { ...ws, ...data, editionLabel: map.form_edition, sha256: map.form_sha256 } });
    await db.formFieldMap.createMany({ data: map.entries.map((e: any) => ({ ...ws, formEditionId: ed!.id, dataPath: e.data_path, caption: box.get(e.data_path)?.caption?.slice(0, 500) ?? null, heading: box.get(e.data_path)?.section ?? null,
      outcome: e.outcome, person: e.person ?? null, row: e.row ?? null, canonicalFieldKey: e.fact ?? null, transform: e.transform ?? null, condition: e.condition ?? null, confidence: e.confidence ?? null,
      evidenceQuote: e.evidence_quote ?? null, reason: e.unresolved_reason ?? null, version: 1, status: "PUBLISHED", origin: "IMPORTED_RELEASE", draftingRunId: (map.drafting_run_id ?? null), updatedBy: o.by })) });
    inc("field map entries (form fields)", map.entries.length);
  }

  await applySampleFormRoles(db, workspaceId); // P-319: before any snapshot of this combination is built
  const rules = config.rules.filter((r: any) => keepWho(r.for_whom) && (!/form ((?:IMM|IRM) [\d ]+[A-Z0-9 ]*)/.test(r.then) || keepForm((/form ((?:IMM|IRM) [0-9]+(?: SCH1)?)/.exec(r.then) ?? [])[1] ?? "")));
  await db.predicate.createMany({ data: rules.map((r: any, i: number) => ({ ...ws, combinationId, predicateKey: `R-${String(i + 1).padStart(2, "0")}`, predicateJson: r.when, whenPlain: r.when_plain ?? null, thenPlain: r.then, forWhom: r.for_whom, sourceQuote: r.source_quote, version: 1, status: cs, origin: "IMPORTED_RELEASE", updatedBy: o.by })) });
  inc("rules", rules.length);
  const checks = config.checks.filter((c: any) => c.group !== "form_native");
  await db.check.createMany({ data: checks.map((c: any) => ({ ...ws, combinationId, checkKey: c.id, checkGroup: c.group, appliesTo: c.applies_to ?? null, predicateJson: c.condition ?? undefined, severity: c.severity,
    message: [c.condition_plain, c.user_action].filter(Boolean).join(" ").slice(0, 900) || null, sourceQuote: c.source_quote ?? null, version: 1, status: cs, origin: "IMPORTED_RELEASE", updatedBy: o.by })) });
  inc("checks (form-native form field checks stay with the field map)", checks.length);

  // ---------------------------------------------------------------- G1 (C5.4) scaffolding, concept §6 M4
  // The release's own citations, written here, before the caller freezes Release 1, so Release 1 carries them and
  // nothing reads "changed since Release 1" after Reset. Cited only where the item's own quote states the number in
  // digits, with the official file's address and download date from the manifest; written by the sample loader.
  const own = new Map<string, { quote?: string; file?: string }>();
  for (const f of keptForms) own.set(`form:${f.form_number}`, { quote: f.source_quote, file: f.source_file });
  (reqs as Quoted[]).forEach((d, i) => own.set(`doc:${lineageOf(d, i)}`, { quote: d.source_quote, file: d.source_file }));
  (rules as Quoted[]).forEach((r, i) => own.set(`R-${String(i + 1).padStart(2, "0")}`, { quote: r.source_quote, file: r.source_file }));
  for (const c of checks) own.set(c.id, { quote: c.source_quote, file: c.source_file });
  const comp = await db.combination.findUniqueOrThrow({ where: { id: combinationId }, select: { combinationKey: true } });
  const { snapshot } = await buildSnapshot(db, workspaceId, combinationId, "draft");
  const fileOf = (path?: string) => { const base = (path ?? "").split("/").pop()?.split(".")[0] ?? ""; return base ? (items as ManifestItem[]).find((m) => String(m.file).split(".")[0] === base && /^https:\/\//.test(m.url ?? "")) : undefined; };
  const cited = publishedNumbers(snapshot).flatMap((n) => {
    const it = own.get(n.key.slice(comp.combinationKey.length + 1)), m = fileOf(it?.file);
    if (!it || !m || !statesInDigits(it.quote, n.value)) return [];
    const by = o.sourcesBy ?? SAMPLE_LOADER;
    return [{ ...ws, itemKind: n.kind, itemKey: n.key, valuePath: n.address, value: n.value, citationUrl: m.url, citationPage: String(m.edition ?? m.file).slice(0, 200), citationQuote: quoteAround(String(it.quote), n.value),
      citationDate: new Date(`${String(m.downloaded_utc).slice(0, 10)}T00:00:00Z`), createdBy: by, updatedBy: by }];
  });
  if (cited.length) await db.sourceEntry.createMany({ data: cited, skipDuplicates: true });
  inc("source entries (numbers its own quote states)", cited.length);
  return counts;
}

/** What the source entries read of a release line and of a manifest item (G1, M4). */
type Quoted = { document_type?: string; who?: string; source_quote?: string; source_file?: string };
type ManifestItem = { file: string; url?: string; edition?: string; downloaded_utc?: string };

/** At most 300 characters of a quote, keeping the words that state the value (the source_entry limit). */
function quoteAround(q: string, value: string): string {
  const t = q.replace(/\s+/g, " ").trim();
  if ([...t].length <= 300) return t;
  const at = Math.max(0, t.search(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
  const from = Math.max(0, at - 140);
  return t.slice(from, from + 300).trim();
}

/** The made-up family (expected/p5-case-c1.json) as an existing sample record: confirmed facts for previews and the
 *  PDF proof. Never an AI result and never sent to any model. */
export function sampleFamilyFacts(): { people: any[]; facts: { personId: string; key: string; row: number | null; value: unknown; source: string }[] } {
  const v = JSON.parse(readFileSync(join(PROTOTYPE, "expected", "p5-case-c1.json"), "utf8"));
  const pid = (about: string) => about.replace(/^client-a/, "principal").replace(/^partner/, "spouse_or_partner").replace(/^child$/, "child-1");
  const fix = v.changes?.lead_dob_typo;
  const facts = [...v.answers, ...v.staff_facts, ...v.profile_facts].map((a: any) => ({ personId: pid(a.about), key: a.fact, row: a.row ?? null,
    value: fix && a.about === fix.about && a.fact === fix.fact ? fix.document_value : a.value, source: `existing sample record (made-up family, ${a.step ? `${a.step} answer` : "staff/profile fact"})` }));
  return { people: [{ id: "principal", role: "principal", label: "Client A" }, { id: "spouse_or_partner", role: "spouse_or_partner", label: "Partner" }, { id: "child-1", role: "child", label: "Child" }, { id: "representative", role: "representative", label: "Representative" }], facts };
}
