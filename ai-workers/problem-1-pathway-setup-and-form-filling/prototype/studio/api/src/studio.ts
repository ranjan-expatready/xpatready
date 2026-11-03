// Product Studio application service: programs and combinations, the shared library (versioned edits), the
// combination's own configuration, previews through the common renderer, validation, review and release.
import { itemState, libraryFilter, lockItem, openItemChanges, originWords, refuseRetired, retiredFieldKeys } from "./library-items.ts";
import { current } from "../../engine/where-used.ts";
import { FILLS_LOCK } from "./who-fills.ts";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma, type ReviewSubmission } from "@prisma/client";
import { canRelease } from "../../../contracts/rules.ts";
import { peopleFor, render, kkey, type Known } from "../../engine/render.ts";
import { buildSnapshot, effective, snapshotHash, VALUE_TYPE_TO_DATA_TYPE, type Mode, type Snapshot } from "../../engine/snapshot.ts";
import { backgroundWords, familyFormWords, formNumberOf, isBackgroundQuestion, missingFamilyForm, NOT_A_FACT } from "../../engine/form-completeness.ts";
import { slug } from "../../engine/import.ts";
import { identityKeyOf, insertProposals } from "./proposals.ts";
import { nameKey, namedDocumentType, waitingDocumentType } from "./document-type-names.ts";
import { checkCondition, diff, ordinal, validate, isDemoSnapshot } from "../../engine/validate.ts";
import { ACTORS, Audit, Db, fail, isDemoWorkspace, need, revise, RUNTIME_ACTORS, strip, Workspace, WORKSPACE_KEY, type Actor } from "./core.ts";
import { itemsOf, mergeItems, publishLibraryChanges, unapprovedAdds, unapprovedWhy } from "./library-changes.ts";
import { recordAction, snapshotLines } from "./form-uses.ts";
import { acceptsOf } from "../../engine/channels.ts";
import { cleanLabel, normalizeLabel, problemFromZod, problemWords } from "../../contracts/programs.ts";
import { PreferencesBody, PROGRAMS_VIEWS, type Preferences, type ProgramsView } from "../../contracts/session.ts";
import { DocumentLineEdit, FormLineEdit, PeopleBody, UndoBody, type PersonRoleView } from "../../contracts/workspace.ts";
import { checkPeople, linesNamingRemoved } from "../../engine/people.ts";
import { filingProblems, filingWarnings, modeSent } from "../../engine/filing-modes.ts";
import { LibrarySources, type SourceLine } from "./library-sources.ts";
import { aiLive, usesFakeLauncher } from "./sources.ts";
import { checkFormat, fieldFormat, formatWords, type MappedBox } from "../../engine/field-format.ts";
import { releaseLabel } from "../../contracts/runtime.ts";
import { draftSourceProblems } from "./source-register.ts";
import { refuseBlocking } from "./refusal.ts";
import { gateOf as keyGateOf, keysUnchanged, runKeys, type Gate as KeyGate } from "./answer-key-gate.ts";
import type { Problem } from "../../engine/validate.ts";
/** G2 (C5.5, BR-8; shared with G1 BR-8): a refusal carries every blocking problem in `errors[]`, each in words; `detail`
 *  (and `message`, read by older callers) keeps the sentence the screens and checks already show. */
/** G2 BR-9: the keys a release rests on, frozen in its summary (only when the gate judged it). */
/** G2: a gate that adds no line, for judging the rest of a draft before its tests run (reviewer m2). */
const NO_KEY_GATE: KeyGate = { demo: false, judged: false, items: [], problems: [], evidence: [], keys: [] };
const keyEvidence = (g: KeyGate) => (g.judged ? { answer_keys: g.evidence } : {});
const staleKeys = (label: string): never => { throw new HttpException({ type: "https://expatready.local/problems/stale", title: "Changed by someone else", status: 409, statusCode: 409, detail: `Release refused: an answer-key test of "${label}" was changed or signed a moment ago. Open Review and release again.`, message: `Release refused: an answer-key test of "${label}" was changed or signed a moment ago. Open Review and release again.` }, HttpStatus.CONFLICT); };
/** G2 BR-9 (challenge m7): a key's expected values changed since the last release named it (another key version). */
const changedSince = (summary: unknown, k: { key_id: string; version: number; change_reason: string | null }) => {
  const before = ((summary as { answer_keys?: { key_id?: string; key_version?: number }[] } | null)?.answer_keys ?? []).find((e) => e.key_id === k.key_id);
  return before && before.key_version !== k.version ? { reason: k.change_reason } : null;
};
const refuse = (detail: string, problems: (Problem & { forms?: string[] })[], status = HttpStatus.BAD_REQUEST): never => {
  throw new HttpException({ type: "https://expatready.local/problems/draft-problems", title: status === HttpStatus.CONFLICT ? "Release refused" : "Fix the problems first", status, statusCode: status, detail, message: detail,
    errors: problems.map((p) => ({ where: p.where, item: p.item, label: p.label ?? null, forms: p.forms ?? [], message: problemWords(p) })) }, status);
};
/** C3.6 (P-223, option (a)): a draft condition may read a fact the library lacks; validate() keeps it as an error that
 *  blocks release, and Questionnaires › "Facts a rule needs that no form asks" offers the add. Other errors still refuse. */
const draftErrors = (errs: string[]) => errs.filter((e) => !/^reads [a-z][a-z0-9_]*\.[a-z0-9_.]+, which is not in the library$/.test(e));

const VALUE_TYPES = Object.keys(VALUE_TYPE_TO_DATA_TYPE);
/** S6 (2a), P-158 item 6: a list row's first source and how many more; an item with none is flagged, never blank. */
const SHORT: Partial<Record<SourceLine["kind"], string>> = { release: "From a reviewed release", ai_run: "From an AI run a person decided" };
/** P-162: a field's format in one line, or why there is none ("Format: not read yet" when no form field of it has
 *  been read; a field on no form says so). */
const formatLine = (boxes: MappedBox[] | undefined, valueType?: string | null) => {
  if (!boxes?.length) return { text: null, state: "no_form" as const };
  const f = fieldFormat(boxes, valueType);
  const text = formatWords(f);
  return text ? { text, state: "read" as const } : { text: null, state: f.read ? "none_on_form" as const : "not_read" as const };
};
const sourceSummary = (lines: SourceLine[] | undefined) => {
  const best = lines?.find((l) => !SHORT[l.kind]) ?? lines?.[0]; // a form box or checklist line before a release note
  return { source: best ? SHORT[best.kind] ?? best.text : null, more_sources: Math.max(0, (lines?.length ?? 0) - 1), unsourced: !lines?.length };
};
const COLLECTED = ["client_questionnaire", "verified_document", "staff_working_view", "profile_record", "existing_record"];
export const WHO = ["each_applicant", "principal_applicant", "spouse_or_partner", "couple_once", "each_dependent_child", "each_person", "case", "representative", "sponsor"];

/** Business level names over the team's stored node kinds (see createNode). */
export const LEVEL: Record<string, { name: string; parent: string | null }> = { PATHWAY: { name: "Pathway", parent: null }, PROGRAM: { name: "Program", parent: "PATHWAY" }, STREAM: { name: "Category", parent: "PROGRAM" }, CATEGORY: { name: "Sub-category", parent: "STREAM" } };
const LOCATIONS = ["inside_canada", "outside_canada"];
/** A release publishes row by row in one transaction; Prisma's 5 s default ended it half-way on a busy machine (a 500
 *  on release while the lanes' suites ran, 23 Oct), so a release may take up to 30 s before it is rolled back. */
const RELEASE_TX = { timeout: 30_000, maxWait: 10_000 };
/** " (for example "<the form's words>")", shortened as listRowsWords does, or nothing when no field has a caption. */
const forExample = (caption: string) => (caption ? ` (for example "${caption.length > 60 ? `${caption.slice(0, 57).replace(/\s+\S*$/, "")}…` : caption}")` : "");

type Gate = { ok: true; sub: ReviewSubmission } | { ok: false; why: string };
/** QA-1's gate on loaded rows (pure): the newest submission, the items signed on it, the draft's fingerprint now. */
function gateOf(sub: ReviewSubmission | null, signed: Set<string>, sha256: string): Gate {
  if (!sub || sub.status !== "SUBMITTED") return { ok: false, why: sub?.status === "RETURNED" ? "Returned to the author: correct it and submit it again on its Review and release tab." : "Not submitted for review: submit it on its Review and release tab." };
  if (sub.draftSha256 !== sha256) return { ok: false, why: "The draft changed after it was submitted: submit it again on its Review and release tab." };
  const unsigned = (sub.changeSummary as { kind: string; key: string; needs_sme?: boolean }[]).filter((x) => x.needs_sme && !signed.has(`${x.kind}|${x.key}`)).length;
  if (unsigned) return { ok: false, why: `${unsigned} change${unsigned > 1 ? "s need" : " needs"} the content reviewer's SME sign-off.` };
  return { ok: true, sub };
}

/** A role's label as this combination's list shows it. */
const participantsLabel = (list: { role: string; label?: string }[], role: string) => list.find((p) => p.role === role)?.label ?? role.replace(/_/g, " ");

/** Lead check L10: a retired combination is read-only; who can be in it changes only once it is restored. */
function retiredPeople(c: { label: string; retiredAt: Date | null }) {
  if (c.retiredAt) fail(`"${c.label}" is retired: who can be in it is not changed. Restore it on Structure first; open cases keep their release.`, HttpStatus.CONFLICT);
}

/** F8 (X1a, found in #113): a combination with no form and no document line has nothing a case could file or collect, so
 *  it is never submitted, signed off or released. It is a release problem (submit, approve, the release page, the Review
 *  tab read problems()), not a validator one: the Overview's missing list (engine/programs.ts, fed by validate()) already
 *  says "No forms yet" with its next step, once (review f8 M1, check_screen01_rules). */
// UX-A part 1 (review M1): "set up", in the words of contracts/counts.ts: a form attached but not set up is still on the
// combination ("2 forms · 0 set up"), so this never says "no forms" beside a count that says 2.
export const EMPTY_WORDS = "Nothing to release yet: no form is set up on this combination and it has no documents. Set up the forms it files (Find forms, add one from the Form library, or finish one attached) before sending it for review.";
export const emptyProblem = (s: Pick<Snapshot, "forms" | "document_requirements">) =>
  s.forms.length || (s.document_requirements ?? []).length ? [] : [{ level: "error" as const, where: "Release", item: "", message: EMPTY_WORDS }];

@Injectable()
export class Studio {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(LibrarySources) private readonly lib: LibrarySources) {}

  // ------------------------------------------------------------------ session and programs
  async session(actor: Actor) {
    const workspaceId = await this.ws.id();
    // "Structure exists" counts any name, Pathways included (W1-03 B1: after Reset the Structure is empty in both tabs).
    const [programs, fields, releases, jobs, sample] = await Promise.all([this.db.programDef.count({ where: { workspaceId } }), this.db.canonicalField.count({ where: { workspaceId } }), this.db.configRelease.count({ where: { workspaceId } }), this.db.draftingJob.count({ where: { workspaceId } }), this.db.auditEvent.count({ where: { workspaceId, action: "loaded", entity: "sample inputs" } })]);
    // sampleLoaded: the sample inputs were loaded into this workspace, not merely "some program exists" (QA-12).
    return { actor, actors: ACTORS, workspace: { key: WORKSPACE_KEY, label: isDemoWorkspace() ? "Demo workspace (disposable)" : `Workspace ${WORKSPACE_KEY} (not the demo)`, demo: isDemoWorkspace(), id: workspaceId }, counts: { programs, fields, releases, jobs }, sampleLoaded: sample > 0, preferences: await this.preferences(actor.id),
      // C11.8 (additive): whether live AI is on and which launcher this copy uses, so a check can tell a copy whose live
      // calls go to the stand-in launcher (nothing reaches a model) from one without the switch. Read only; sets nothing.
      ai: { live: aiLive(), launcher: usesFakeLauncher() ? "stand-in" : "guarded" } };
  }

  /** C11.10 (P-115): a person's own view choices. Only known keys and values are kept (contracts/session.ts). */
  private async preferences(actorId: string): Promise<Preferences> {
    const rows = await this.db.personPreference.findMany({ where: { actor: actorId } });
    const out: Preferences = {};
    for (const r of rows) if (r.key === "programsView" && (PROGRAMS_VIEWS as readonly string[]).includes(r.value)) out.programsView = r.value as ProgramsView;
    return out;
  }

  /** PATCH /session/preferences: saves this person's choice for them only; nothing else changes, nothing is audited. */
  async setPreferences(actor: Actor, body: unknown): Promise<Preferences> {
    const parsed = PreferencesBody.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === undefined) continue;
      await this.db.personPreference.upsert({ where: { actor_key: { actor: actor.id, key } }, create: { actor: actor.id, key, value }, update: { value } });
    }
    return this.preferences(actor.id);
  }

  /** The programme structure (SA-1B-50/51, D285): Pathway (who the client is: Individual or Corporate) › Program › Category
   *  › optional Sub-category. Stored with the team's ProgramNodeKind depth order (PATHWAY › PROGRAM › STREAM › CATEGORY,
   *  contracts pack-domain-bodies.ts:141): level 3 STREAM holds the business "Category", level 4 CATEGORY the business
   *  "Sub-category". The adapter is positional and named in LEVEL; persisted meanings are not changed. */
  async createNode(actor: Actor, b: { kind: "PATHWAY" | "PROGRAM" | "STREAM" | "CATEGORY"; label: string; parentKey?: string; description?: string; sourceBasis?: "SOURCE_BACKED" | "ILLUSTRATIVE"; key?: string; clientType?: string; allowedLocations?: string[]; linkLabel?: string }) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const label = cleanLabel(b.label ?? "");
    if (!["PATHWAY", "PROGRAM", "STREAM", "CATEGORY"].includes(b.kind)) fail("Unknown level.");
    const L = LEVEL[b.kind];
    if (!label) fail(`Give the ${L.name.toLowerCase()} a name.`);
    let parent: any = null;
    if (b.kind === "PATHWAY") {
      if (b.parentKey) fail("A pathway is the top level; it has no parent.");
      // W1-03 (P-104, B1): several Pathways per Pathway type; the type itself is a fixed value, never a row.
      if (!["INDIVIDUAL", "CORPORATE"].includes(b.clientType ?? "")) fail("A pathway belongs to a Pathway type: Retail or Corporate and employers (SA-1B-50).");
    } else {
      if (!b.parentKey) fail(`Choose the ${LEVEL[L.parent!].name.toLowerCase()} this ${L.name.toLowerCase()} belongs to.`);
      parent = await this.db.programDef.findFirst({ where: { workspaceId, programNodeKey: b.parentKey } });
      if (!parent) fail(`That ${LEVEL[L.parent!].name.toLowerCase()} does not exist.`, HttpStatus.NOT_FOUND);
      if (parent.retiredAt) fail(`"${parent.label}" is retired: restore it first, or choose another (P-116).`, HttpStatus.CONFLICT);
      if (parent.nodeKind !== L.parent) fail(`A ${L.name.toLowerCase()} belongs under a ${LEVEL[L.parent!].name.toLowerCase()}, not under a ${LEVEL[parent.nodeKind].name.toLowerCase()}.`);
      if (b.kind === "CATEGORY") { const row = await this.db.combination.findFirst({ where: { programDefId: parent.id } }); if (row) fail(`"${parent.label}" already has its own configuration row ("${row.label}"), so it is a full combination. A sub-category would put that row above a full combination (SA-1B-55/56); add sub-categories to a category without a row.`, HttpStatus.CONFLICT); }
    }
    let locations: string[] = [];
    if (b.kind === "STREAM" || b.kind === "CATEGORY") {
      locations = [...new Set<string>(b.allowedLocations ?? (parent?.allowedLocations?.length ? parent.allowedLocations : []))];
      if (!locations.length || locations.some((l) => !LOCATIONS.includes(l))) fail("Say where a case for it may be opened: inside Canada, outside Canada, or both (SA-1B-51: location is a case detail, allowed per category).");
    }
    // Same parent, same name (BR-6: compared ignoring case, spaces and punctuation): point to the existing record.
    // Pathways are compared within their type (W1-03 BR-4): the same name may stand in both tabs.
    const siblings = await this.db.programDef.findMany({ where: { workspaceId, nodeKind: b.kind, parentNodeKey: parent?.programNodeKey ?? null, ...(b.kind === "PATHWAY" ? { clientType: b.clientType } : {}) } });
    const dup = siblings.find((x) => normalizeLabel(x.label) === normalizeLabel(label));
    if (dup) { const detail = `"${dup.label}" already exists ${parent ? `under ${parent.label}` : "as a pathway"}: choose it instead.`; throw new HttpException({ type: "https://expatready.local/problems/name-already-used", title: "Name already used", status: 409, detail, errors: [{ field: "label", message: detail }], existing: { key: dup.programNodeKey, label: dup.label } }, HttpStatus.CONFLICT); }
    // The key is internal (BR-6 compares names, never keys): a name with no Latin letters or digits, or one that shares
    // its first 60 characters with a neighbour, still gets a key of its own (break M3).
    let key = b.key ?? `${parent ? `${parent.programNodeKey}.` : ""}${slug(label) || "item"}`;
    if (!b.key) for (let i = 2; await this.db.programDef.findFirst({ where: { workspaceId, programNodeKey: key }, select: { id: true } }); i++) key = `${key.replace(/-\d+$/, "")}-${i}`;
    // The database keeps one name per parent (QA-14): of two creates at the same moment, one wins and the other is told.
    const n = await this.db.programDef.create({ data: { workspaceId, programNodeKey: key, parentNodeKey: parent?.programNodeKey ?? null, nodeKind: b.kind, label, nameKey: normalizeLabel(label), description: b.description ?? null, sourceBasis: b.sourceBasis ?? parent?.sourceBasis ?? "SOURCE_BACKED", clientType: b.kind === "PATHWAY" ? b.clientType! : null, allowedLocations: locations, linkLabel: b.linkLabel ?? null, createdBy: actor.id, displayOrder: await this.db.programDef.count({ where: { workspaceId } }) } }).catch(async (e) => {
      if ((e as { code?: string }).code !== "P2002") throw e;
      const twin = await this.db.programDef.findFirst({ where: { workspaceId, parentNodeKey: parent?.programNodeKey ?? null, nameKey: normalizeLabel(label), ...(b.kind === "PATHWAY" ? { clientType: b.clientType } : {}) } });
      // The other unique value is the internal key: a different name that made the same key at the same moment.
      const detail = twin ? `"${twin.label}" already exists ${parent ? `under ${parent.label}` : "as a pathway"}: choose it instead.` : "Another item was created here at the same moment: try again.";
      throw new HttpException({ type: "https://expatready.local/problems/name-already-used", title: "Name already used", status: 409, detail, errors: [{ field: "label", message: detail }], ...(twin ? { existing: { key: twin.programNodeKey, label: twin.label } } : {}) }, HttpStatus.CONFLICT);
    });
    await this.audit.log(workspaceId, actor.id, "created", L.name.toLowerCase(), key, `${actor.name} created ${L.name.toLowerCase()} "${n.label}"${parent ? ` under ${parent.label}` : ""}`);
    return n;
  }

  /** The masters a configuration path is chosen from (D285): every node with its business level, parent, client type,
   *  allowed locations, children and its configuration row if it has one. */
  async masters() {
    const workspaceId = await this.ws.id();
    const [nodes, rows] = await Promise.all([this.db.programDef.findMany({ where: { workspaceId }, orderBy: [{ displayOrder: "asc" }, { label: "asc" }] }), this.db.combination.findMany({ where: { workspaceId }, select: { id: true, label: true, programDefId: true } })]);
    return nodes.map((n) => ({ key: n.programNodeKey, label: n.label, kind: n.nodeKind, level: LEVEL[n.nodeKind].name, parent: n.parentNodeKey, client_type: n.clientType, allowed_locations: n.allowedLocations, source_basis: n.sourceBasis, children: nodes.filter((x) => x.parentNodeKey === n.programNodeKey).length, row: rows.find((r) => r.programDefId === n.id) ?? null }));
  }

  /** Whether a configuration row sits at a full combination (SA-1B-55/56). Publishing blocks one that does not. */
  async structureProblems(combinationId: string): Promise<{ level: "error"; where: string; item: string; message: string }[]> {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId }, include: { program: true } });
    const kids = await this.db.programDef.count({ where: { workspaceId: c.workspaceId, parentNodeKey: c.program.programNodeKey } });
    if (c.program.nodeKind !== "STREAM" && c.program.nodeKind !== "CATEGORY") return [{ level: "error", where: "Row", item: c.combinationKey, message: `This configuration is attached to a ${LEVEL[c.program.nodeKind].name.toLowerCase()} ("${c.program.label}"), above a full combination. Publishing is blocked: attach configuration to a category, or to its sub-category (SA-1B-55/56).` }];
    if (kids) return [{ level: "error", where: "Row", item: c.combinationKey, message: `"${c.program.label}" now has sub-categories, so this row sits above a full combination. Publishing is blocked (SA-1B-56).` }];
    return [...(await this.undecidedFormFields(combinationId, "DRAFT")).map((f) => ({ level: "error" as const, where: "Forms", item: f.form,
      message: `${f.n} form field${f.n === 1 ? " has" : "s have"} no decision in this draft${forExample(f.example)}. Map each one, mark it "not a fact", or "filled by hand" with a reason on To review › Form fields (K1).` })),
      ...await this.completenessProblems(combinationId, c.workspaceId)];
  }

  /** C3.8 (engine/form-completeness.ts): [IRCC-F08] a Background information question left as "not a fact" on one of the
   *  combination's forms in this draft (decided before the refusal, or so drafted), and [IRCC-F09] the family information
   *  form its application package lists (a source form attached to it) missing from its forms. Both block release. The
   *  forms are the draft's own lines (Devin on #691: a form removed in the draft, its RETIRED line over a PUBLISHED one,
   *  is no longer checked); every PDF edition of each is checked, as the snapshot and the filler carry them all. */
  async completenessProblems(combinationId: string, workspaceId: string): Promise<{ level: "error"; where: string; item: string; message: string }[]> {
    const [lines, attached] = await Promise.all([
      this.db.combinationForm.findMany({ where: { combinationId }, select: { id: true, lineageKey: true, version: true, status: true, supersedesId: true, form: { select: { formKey: true } } } }),
      this.db.sourceAttachment.findMany({ where: { combinationId, kind: "Form" }, select: { edition: true } }),
    ]);
    const forms = [...new Set(effective(lines, (l) => l.lineageKey, "draft").map((l) => l.form.formKey))];
    const maps = forms.length ? await this.db.formFieldMap.findMany({ where: { workspaceId, dataPath: { contains: "BackgroundInfo" }, status: { in: ["DRAFT", "PUBLISHED"] }, edition: { form: { workspaceId, formKey: { in: forms } } } }, select: { id: true, formEditionId: true, dataPath: true, caption: true, outcome: true, version: true, status: true, supersedesId: true, edition: { select: { form: { select: { formKey: true } } } } } }) : [];
    const out: { level: "error"; where: string; item: string; message: string }[] = [];
    for (const r of effective(maps, (m) => `${m.formEditionId}|${m.dataPath}`, "draft"))
      if (NOT_A_FACT.has(r.outcome) && isBackgroundQuestion(r.dataPath)) out.push({ level: "error", where: "Forms", item: r.edition.form.formKey, message: backgroundWords(r.caption) });
    const missing = missingFamilyForm(attached.map((a) => formNumberOf(a.edition)), forms);
    if (missing) out.push({ level: "error", where: "Forms", item: missing, message: familyFormWords(missing) });
    return out;
  }

  /** K1 (Screen 02 challenge point 2): form fields of the combination's forms that have no decision, per form. DRAFT rows
   *  are an edition changed in this draft (they block release); PUBLISHED rows were carried from an earlier release (a
   *  warning until that edition is drafted again). */
  async undecidedFormFields(combinationId: string, status: "DRAFT" | "PUBLISHED") {
    const found = await this.db.formFieldMap.findMany({ where: { outcome: "unresolved", status, edition: { form: { usedBy: { some: { combinationId, status: { not: "RETIRED" } } } } } }, select: { id: true, dataPath: true, caption: true, edition: { select: { form: { select: { formKey: true } } } } } });
    // A carried row already decided in a newer draft version is not counted again (review Should).
    const later = status === "PUBLISHED" && found.length ? new Set((await this.db.formFieldMap.findMany({ where: { supersedesId: { in: found.map((r) => r.id) } }, select: { supersedesId: true } })).map((r) => r.supersedesId)) : new Set<string | null>();
    const rows = found.filter((r) => !later.has(r.id));
    const by = new Map<string, { form: string; n: number; example: string }>();
    // The example is the form's own words (a field's caption), never its PDF path (IMM_5476[0].Page1[0]…, #118 review).
    for (const r of rows) { const k = r.edition.form.formKey; const cur = by.get(k) ?? { form: k, n: 0, example: "" }; cur.n++; if (!cur.example && r.caption?.trim()) cur.example = r.caption.trim(); by.set(k, cur); }
    return [...by.values()];
  }

  async createCombination(actor: Actor, b: { programKey: string; label?: string; participants: any[]; description?: string; sourceBasis?: "SOURCE_BACKED" | "ILLUSTRATIVE"; basisNote?: string; key?: string }) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const node = await this.db.programDef.findFirst({ where: { workspaceId, programNodeKey: b.programKey } });
    if (!node) fail("Choose the category (or sub-category) this configuration is for.", HttpStatus.NOT_FOUND);
    if (node!.retiredAt) fail(`"${node!.label}" is retired: restore it on the Structure first (P-116).`, HttpStatus.CONFLICT);
    if (node!.nodeKind !== "STREAM" && node!.nodeKind !== "CATEGORY") fail(`A configuration row belongs to a full combination: a category, or its sub-category. "${node!.label}" is a ${LEVEL[node!.nodeKind].name.toLowerCase()} (SA-1B-55/56).`);
    if (await this.db.programDef.count({ where: { workspaceId, parentNodeKey: node!.programNodeKey } })) fail(`"${node!.label}" has sub-categories: choose one of them; each is its own full combination.`);
    const existing = await this.db.combination.findFirst({ where: { programDefId: node!.id } });
    if (existing) throw new HttpException({ statusCode: 409, message: `This full combination already has its configuration ("${existing.label}"). Open it instead of creating another (one row per full combination, SA-1B-55).`, existingId: existing.id }, HttpStatus.CONFLICT);
    const participants = await this.checkParticipants(workspaceId, b.participants);
    const label = (b.label ?? "").trim() || node!.label;
    const key = b.key ?? node!.programNodeKey;
    const c = await this.db.combination.create({ data: { workspaceId, programDefId: node!.id, combinationKey: key, label, description: b.description ?? null, participants, sourceBasis: b.sourceBasis ?? node!.sourceBasis, basisNote: b.basisNote ?? null, createdBy: actor.id } })
      .catch((e) => { if ((e as any)?.code === "P2002") fail("This full combination was given its configuration a moment ago by someone else. Open it instead.", HttpStatus.CONFLICT); throw e; });
    await this.audit.log(workspaceId, actor.id, "created", "configuration row", key, `${actor.name} started setting up ${node!.label}`, { participants }, c.id);
    return c;
  }

  /** Who a row's lines can name (SA-1B-57 "who"): roles and how many, used by the per-person preview. Family shape is
   *  applicability on one row, not a separate row (grounding audit finding 1). S5 (M3): the roles are the shared
   *  library's person roles, never a list in code; older callers (New combination, the sample loader) are not strict, so
   *  an applicant tick on a role that may not be an applicant is set to "no" rather than refused. */
  async checkParticipants(workspaceId: string, list: any[], strict = false) {
    if (!Array.isArray(list) || !list.length) fail("Add at least the principal applicant.");
    // C11.12 BR-5: a line sent without a tick takes it from its mode (Declared only, co-filing: no), else yes as before.
    const lines = list.map((p) => ({ ...p, min: Number(p.min ?? 0), max: Number(p.max ?? 1), applies: typeof p.applies === "boolean" ? p.applies : !["declared_only", "co_files"].includes(String(modeSent(p))) }));
    if (lines.some((p) => !Number.isInteger(p.min) || !Number.isInteger(p.max) || p.min < 0 || p.max > 9)) fail("The number of people must be a whole number between 0 and 9, minimum no more than maximum.");
    const { errors, lines: ok } = checkPeople(lines, await this.personRoles(workspaceId), strict);
    if (errors.length) throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 400, detail: errors[0].message, errors }, HttpStatus.BAD_REQUEST);
    return ok.map((p) => ({ role: p.role, label: String(p.label).slice(0, 60), min: p.min, max: p.max, preview: Math.max(p.min, Math.min(p.max, Number(p.preview ?? (p.min || 1)))), applies: p.applies, ...(p.filingMode ? { filingMode: p.filingMode } : {}), ...(p.quote ? { quote: p.quote } : {}), ...(p.origin ? { origin: p.origin } : {}) }));
  }

  /** The shared library's person roles (M3; GET /library/roles), in display order. */
  async personRoles(workspaceId?: string): Promise<PersonRoleView[]> {
    const ws = workspaceId ?? await this.ws.id();
    const rows = await this.db.personRole.findMany({ where: { workspaceId: ws }, orderBy: [{ displayOrder: "asc" }, { label: "asc" }] });
    return rows.map((r) => ({ key: r.roleKey, label: r.label, meaning: r.meaning, takesPartInCase: r.takesPartInCase, mayBeApplicant: r.mayBeApplicant, basis: r.basis, builtIn: r.builtIn, retired: !!r.retiredAt }));
  }

  /** "Who can be in this application" (S5, M4): saved only at the version read (a stale save is a 409 naming who saved
   *  and when); a save that leaves form lines naming nobody asks first; every save is one audit row holding the list
   *  before it, which Undo restores. */
  async savePeople(actor: Actor, id: string, body: unknown) {
    need(actor, "author");
    const parsed = PeopleBody.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const b = parsed.data;
    const c = await this.db.combination.findUnique({ where: { id } });
    if (!c) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    retiredPeople(c!);
    if (c!.participantsVersion !== b.version) await this.stalePeople(c!);
    const participants = await this.checkParticipants(c!.workspaceId, b.participants, true);
    if (!b.confirmRemove) {
      const lines = (await this.currentLines(id)).map((l) => ({ form: l.form.formKey, who: l.who }));
      const hit = linesNamingRemoved(c!.participants as any[], participants, lines);
      if (hit.length) throw new HttpException({ type: "https://expatready.local/problems/confirm", title: "Confirm the change", status: 409, detail: `${hit.map((h) => h.form).join(", ")} ${hit.length === 1 ? "names" : "name"} a person you removed (${[...new Set(hit.flatMap((h) => h.roles))].map((r) => participantsLabel(c!.participants as any[], r)).join(", ")}). Save anyway, or keep the person.`, confirm: true, lines: hit }, HttpStatus.CONFLICT);
    }
    // C11.12 BR-7 (P-233 (3)): a mode IRCC's guide contradicts is saved with a warning, never refused.
    return { ...(await this.writePeople(actor, c!, participants, "updated")), warnings: filingWarnings(c!.combinationKey, participants) };
  }

  /** Undo the last save of "Who can be in this application", while nothing was saved after it. */
  async undoPeople(actor: Actor, id: string, body: unknown) {
    need(actor, "author");
    const parsed = UndoBody.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const c = await this.db.combination.findUnique({ where: { id } });
    if (!c) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    retiredPeople(c!);
    if (c!.participantsVersion !== parsed.data.version) await this.stalePeople(c!);
    const last = await this.lastPeopleSave(id);
    if (!last || last.action !== "updated" || (last.detail as any)?.version !== c!.participantsVersion) fail("There is nothing to undo: the last change to who can be in this application was already undone, or was not made on this screen.", HttpStatus.CONFLICT);
    // Lead check L6: a release is never undone, as on the Forms tab ("Released since").
    if (await this.releasedSince(id, last!.at)) fail("Released since: that change was released meanwhile, and a release is never undone. Change who can be in a new draft.", HttpStatus.CONFLICT);
    return this.writePeople(actor, c!, (last!.detail as any).before, "undone");
  }

  /** When "Who can be in this application" was last saved, by whom, and whether Undo is offered. */
  async peopleState(id: string) {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id } });
    const last = await this.lastPeopleSave(id);
    const by = [...ACTORS].find((a) => a.id === (c.participantsBy ?? last?.actor))?.name ?? null;
    const canUndo = !c.retiredAt && !!last && last.action === "updated" && (last.detail as any)?.version === c.participantsVersion && !(await this.releasedSince(id, last.at));
    return { version: c.participantsVersion, savedBy: c.participantsBy ? by : null, savedAt: c.participantsBy && last ? last.at.toISOString() : null, canUndo };
  }

  private async writePeople(actor: Actor, c: { id: string; workspaceId: string; combinationKey: string; label: string; participants: any; participantsVersion: number }, participants: any[], action: "updated" | "undone") {
    const version = c.participantsVersion + 1;
    const done = await this.db.combination.updateMany({ where: { id: c.id, participantsVersion: c.participantsVersion }, data: { participants, participantsVersion: version, participantsBy: actor.id } });
    if (!done.count) await this.stalePeople(await this.db.combination.findUniqueOrThrow({ where: { id: c.id } }));
    const words = participants.map((p) => `${p.label} (${p.min === p.max ? p.min : `${p.min}–${p.max}`}${p.applies ? ", applicant" : ""})`).join(", ");
    await this.audit.log(c.workspaceId, actor.id, action, "people", c.combinationKey, `${actor.name} ${action === "undone" ? "undid the last change to" : "changed"} who can be in "${c.label}": ${words}`, { before: c.participants, after: participants, version }, c.id);
    return { participants, version };
  }

  /** Whether a release of the combination was made after `at` (Lead check L6). */
  private async releasedSince(id: string, at: Date) {
    return !!(await this.db.configRelease.findFirst({ where: { combinationId: id, releasedAt: { gt: at } }, select: { id: true } }));
  }

  private lastPeopleSave(id: string) {
    return this.db.auditEvent.findFirst({ where: { combinationId: id, entity: "people" }, orderBy: { at: "desc" } });
  }

  /** 409 with who saved last and when, and their version (STANDARDS §4). */
  private async stalePeople(c: { id: string; participants: any; participantsVersion: number; participantsBy: string | null }): Promise<never> {
    const last = await this.lastPeopleSave(c.id);
    const who = [...ACTORS].find((a) => a.id === (c.participantsBy ?? last?.actor))?.name ?? "Someone else";
    const when = last ? `at ${last.at.toISOString().slice(11, 16)} UTC` : "a moment ago";
    throw new HttpException({ type: "https://expatready.local/problems/stale", title: "Changed by someone else", status: 409, detail: `${who} changed who can be in this application ${when}. Reload their version, then make your change again.`, current: { participants: c.participants, version: c.participantsVersion } }, HttpStatus.CONFLICT);
  }

  /** The newest live row of each form line of a combination's draft. */
  private async currentLines(combinationId: string) {
    const rows = await this.db.combinationForm.findMany({ where: { combinationId }, include: { form: true }, orderBy: { version: "desc" } });
    const seen = new Set<string>();
    return rows.filter((r) => { if (seen.has(r.lineageKey)) return false; seen.add(r.lineageKey); return r.status !== "RETIRED"; });
  }

  async updateCombination(actor: Actor, id: string, b: { label?: string; description?: string; participants?: any[]; expectedLabel?: string; allowedLocations?: string[] }) {
    need(actor, "author");
    const c = await this.db.combination.findUniqueOrThrow({ where: { id } });
    // C11.16 (P-125 (1)(3)): the name and the place come from Program structure only. The setup cannot rename the
    // combination nor move it to another Pathway, Program, Category or Sub-category; nothing is written (checked
    // first, review M1: before any other part of the request is saved).
    const PLACE = ["label", "programKey", "nodeKey", "programDefId", "pathwayType", "pathway", "program", "category", "subCategory", "combinationKey"];
    const asked = PLACE.filter((k) => (b as Record<string, unknown>)[k] !== undefined && !(k === "label" && b.label === c.label));
    if (asked.length) fail(asked.includes("label") ? `The name "${c.label}" comes from Program structure: rename it there. Nothing was changed.` : `Where "${c.label}" sits comes from Program structure: a setup cannot move to another place. Nothing was changed.`);
    // Where a case may be opened is a setting of the combination's node (SA-1B-51), kept with the program tree.
    if (b.allowedLocations !== undefined) {
      const locations = [...new Set(b.allowedLocations)];
      if (!locations.length || locations.some((l) => !LOCATIONS.includes(l))) fail("Choose at least one place a case can be opened from: inside Canada, outside Canada, or both.");
      await this.db.programDef.update({ where: { id: c.programDefId }, data: { allowedLocations: locations } });
      await this.audit.log(c.workspaceId, actor.id, "updated", "combination", c.combinationKey, `${actor.name} set where a case for "${c.label}" can be opened: ${locations.map((l) => l.replace("_", " ")).join(" or ")}`, { allowedLocations: locations }, c.id);
    }
    if (b.expectedLabel !== undefined && b.expectedLabel !== c.label) fail(`Someone renamed this combination to "${c.label}" while you were editing. Your change was not saved.`, HttpStatus.CONFLICT);
    const data: any = {};
    if (b.description !== undefined) data.description = b.description;
    // S5 (M4): people saved here too move the version on, so the editor's guard holds.
    if (b.participants) { data.participants = await this.checkParticipants(c.workspaceId, b.participants); data.participantsVersion = c.participantsVersion + 1; data.participantsBy = actor.id; }
    const done = await this.db.combination.updateMany({ where: { id, label: c.label }, data });
    if (!done.count) fail("The combination changed while saving; reload and try again.", HttpStatus.CONFLICT);
    const u = await this.db.combination.findUniqueOrThrow({ where: { id } });
    await this.audit.log(c.workspaceId, actor.id, "updated", "combination", c.combinationKey, `${actor.name} updated combination "${u.label}"`, data, c.id);
    return u;
  }

  // ------------------------------------------------------------------ combination overview
  /** The sample loader's note describes a combination as loaded ("attached; not set up yet"). Once a person has changed
   *  or released it, that description is out of date: the page then says only that it is Sample (QA-42). */
  private async basisNote(c: { id: string; workspaceId: string; combinationKey: string; basisNote: string | null }) {
    if (!c.basisNote) return null;
    const loaded = await this.db.auditEvent.findFirst({ where: { workspaceId: c.workspaceId, action: "loaded", entity: "sample inputs" }, orderBy: { at: "desc" }, select: { at: true } });
    // Some steps name the combination by id, others by key (submitted, released): either counts.
    const since = loaded ? await this.db.auditEvent.count({ where: { workspaceId: c.workspaceId, at: { gt: loaded.at }, OR: [{ combinationId: c.id }, { entityKey: c.combinationKey }] } }) : 0;
    return since ? "Sample: from the sample inputs; its setup has changed since they were loaded." : c.basisNote;
  }

  async combination(id: string) {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id }, include: { program: true, attachments: { orderBy: { createdAt: "asc" } }, releases: { orderBy: { version: "desc" }, include: { packVersion: { select: { version: true } } } }, jobs: { orderBy: { startedAt: "desc" }, take: 20 } } });
    const nodes = await this.db.programDef.findMany({ where: { workspaceId: c.workspaceId } });
    const chain: any[] = []; for (let n: any = c.program; n; n = n.parentNodeKey ? nodes.find((x) => x.programNodeKey === n.parentNodeKey) : null) chain.unshift(n);
    const programNode = chain.find((n) => n.nodeKind === "PROGRAM"), parent = chain.find((n) => n.nodeKind === "PATHWAY") ?? null;
    const { snapshot, sha256 } = await buildSnapshot(this.db, c.workspaceId, id, "draft");
    const last = c.releases[0];
    const changes = diff((last?.snapshot as any) ?? null, snapshot);
    const gate = await keyGateOf(this.db, id, snapshot, sha256); // G2 (C5.5): answer-key tests, read only
    const problems = await this.problems(c.workspaceId, snapshot, id, gate);
    const sub = await this.db.reviewSubmission.findFirst({ where: { combinationId: id }, orderBy: { submittedAt: "desc" } });
    return {
      combination: { id: c.id, key: c.combinationKey, label: c.label, description: c.description, participants: c.participants, source_basis: c.sourceBasis, basis_note: await this.basisNote(c), created_by: c.createdBy },
      program: { key: (programNode ?? c.program).programNodeKey, label: (programNode ?? c.program).label, kind: (programNode ?? c.program).nodeKind, source_basis: (programNode ?? c.program).sourceBasis }, pathway: parent ? { key: parent.programNodeKey, label: parent.label, client_type: parent.clientType } : null,
      path: chain.map((n) => ({ key: n.programNodeKey, label: n.label, level: LEVEL[n.nodeKind].name })), allowed_locations: c.program.allowedLocations,
      attachments: c.attachments, jobs: c.jobs.map((j) => ({ ...j, detail: undefined })),
      releases: c.releases.map((r) => ({ id: r.id, version: r.version, demo: isDemoSnapshot(r.snapshot), release: r.packVersion?.version ?? r.version, label: releaseLabel(r), sha256: r.sha256, status: r.status, released_at: r.releasedAt, author: r.authorId, submitter: r.submitterId, approver: ACTORS.find((x) => x.id === r.approverId)?.name ?? "Approver", summary: r.summary, basis: r.basis })),
      draft: { sha256, matches_release: !!last && last.sha256 === sha256, changes, problems, counts: this.counts(snapshot),
        // G2 BR-9: what a release would rest on (per item and key), and whether it would be a Demo release.
        answer_keys: { demo: gate.demo, judged: gate.judged, items: gate.items.map((i) => ({ ...i, keys: i.keys.map((k) => ({ ...k, changed_since_release: changedSince(last?.summary, k) })) })) } },
      submission: sub ? { ...sub, stale: sub.status === "SUBMITTED" && sub.draftSha256 !== sha256 } : null,
    };
  }

  counts(s: Snapshot) {
    return { fields: s.canonical_fields.length, sections: s.sections.length, placements: s.placements.length, forms: s.forms.length, map_boxes: s.field_maps.reduce((a, m) => a + m.entries.length, 0), document_requirements: s.document_requirements.length, rules: s.rules.length, checks: s.checks.length };
  }

  async problems(workspaceId: string, s: Snapshot, combinationId?: string, gate?: KeyGate) {
    const structure = combinationId ? await this.structureProblems(combinationId) : [];
    const lib = (await this.db.canonicalField.findMany({ where: { workspaceId }, select: { canonicalFieldKey: true, valueType: true, status: true } })).filter((f) => f.status !== "RETIRED").map((f) => ({ key: f.canonicalFieldKey, valueType: f.valueType }));
    const carried = combinationId ? (await this.undecidedFormFields(combinationId, "PUBLISHED")).map((f) => ({ level: "warning" as const, where: "Forms", item: f.form, message: `Not decided yet (from an earlier release): ${f.n} form field${f.n === 1 ? "" : "s"}${forExample(f.example)}. Decide them when this edition is drafted again.` })) : [];
    // C11.12 BR-7: a new release needs a filing mode on every role that may be an applicant (pinned releases are kept;
    // engine/filing-modes.ts FILING_NOT_SET_BLOCKS).
    const roles = await this.personRoles(workspaceId);
    const filing = filingProblems((s.combination?.participants ?? []) as { role: string; label?: string; max: number; filingMode?: unknown }[], roles);
    // G1 BR-7 (challenge M1): every published number needs a source entry; the draft only, never a released snapshot.
    // Only a draft that will be submitted (it differs from its release, or there is none): a Live row with no draft
    // changes lists none, as on the catalogue (tech lead on #568; EXPERIENCE §2.5, one status everywhere).
    const last = s.mode === "draft" && combinationId ? await this.db.configRelease.findFirst({ where: { combinationId }, orderBy: { version: "desc" }, select: { sha256: true } }) : null;
    const sources = s.mode === "draft" && (!last || last.sha256 !== snapshotHash(s)) ? draftSourceProblems(s, isDemoWorkspace()) : [];
    // G1: the numbers without a source come after the validator's own errors, so a list cut at its first lines still
    // shows those (the Review tab shows eight).
    // G2 (C5.5): the answer-key gate's lines, in the same list as every other problem (one list on Review and release).
    const tests = combinationId ? (gate ?? (await keyGateOf(this.db, combinationId, s, (await buildSnapshot(this.db, workspaceId, combinationId, "draft")).sha256))).problems : [];
    const all = [...structure, ...filing, ...emptyProblem(s), ...validate(s, lib, s.derived_fields.map((d) => ({ id: d.id, calculation: d.calculation })), await acceptsOf(this.db, workspaceId)), ...sources, ...carried, ...tests]; // L4: what IRCC accepts
    // C2.12 (plan F3a-1, BR-10): each problem names the forms it touches, so a form's path shows its own: a Forms problem its form,
    // any other the forms whose field map reads that item as a fact; none otherwise.
    const formsOf = new Map<string, Set<string>>();
    for (const m of s.field_maps) for (const e of m.entries) if (e.fact) (formsOf.get(e.fact) ?? formsOf.set(e.fact, new Set()).get(e.fact)!).add(m.form_number);
    return all.map((p) => ({ ...p, forms: p.where === "Forms" ? [p.item] : p.where === "Tests" ? ((p as { forms?: string[] }).forms ?? []) : [...(formsOf.get(p.item) ?? [])].sort() }));
  }

  async config(id: string, mode: Mode) {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id } });
    if (mode === "published") {
      const r = await this.db.configRelease.findFirst({ where: { combinationId: id }, orderBy: { version: "desc" } });
      if (r) return { mode, release: { version: r.version, sha256: r.sha256 }, snapshot: r.snapshot };
    }
    const { snapshot, sha256 } = await buildSnapshot(this.db, c.workspaceId, id, mode);
    return { mode, sha256, snapshot, revisions: await this.revisions(id) };
  }

  // ------------------------------------------------------------------ preview through the common renderer
  async preview(id: string, q: { mode?: Mode | "release"; profile?: string; answers?: string; people?: string }) {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id } });
    let snapshot: Snapshot, label: string, sha: string;
    if (q.mode === "release" || q.mode === "published") {
      const r = await this.db.configRelease.findFirst({ where: { combinationId: id }, orderBy: { version: "desc" } });
      if (!r) fail("This combination has no released version yet; preview the draft instead.", HttpStatus.NOT_FOUND);
      snapshot = r!.snapshot as any; sha = r!.sha256; label = `Released version ${r!.version}`;
    } else { const b = await buildSnapshot(this.db, c.workspaceId, id, "draft"); snapshot = b.snapshot; sha = b.sha256; label = "Draft preview (not released)"; }
    const participants = (c.participants as any[]).map((p) => ({ ...p }));
    if (q.people) { const want = JSON.parse(q.people) as Record<string, number>; for (const p of participants) if (want[p.role] !== undefined) p.preview = Math.max(p.min, Math.min(p.max, Number(want[p.role]))); }
    const people = peopleFor(participants);
    const known: Known = new Map();
    if (q.profile && q.profile !== "none") {
      const prof = await this.db.sampleProfile.findFirst({ where: { workspaceId: c.workspaceId, profileKey: q.profile }, include: { facts: true } });
      if (prof) for (const f of prof.facts) if (f.personId === "case" || f.personId.split("/")[0] === "representative" || people.some((p) => p.id === f.personId.split("/")[0])) known.set(kkey(f.personId, f.canonicalFieldKey, f.row), { value: f.value, status: "confirmed", source: f.source });
    }
    if (q.answers) for (const [k, v] of Object.entries<any>(JSON.parse(q.answers))) { if (v === "" || v === null) known.delete(k); else known.set(k, { value: v, status: "answered", source: "answered on this preview screen (not saved, not confirmed)" }); }
    const out = render(snapshot, people, known);
    // W1-02 (review M1): the forms filed Online, which the product does not fill until the browser extension returns.
    const online_forms = (snapshot.forms as { form_number: string; channel?: string }[]).filter((f) => f.channel === "ONLINE").map((f) => f.form_number);
    return { label, mode: q.mode === "release" || q.mode === "published" ? "release" : "draft", sha256: sha, combination: snapshot.combination, participants, online_forms, ...out };
  }

  // ------------------------------------------------------------------ the shared library
  /** Each field's mapped form fields by form edition (draft or published), and the form numbers that fill it: the row's
   *  "forms" list, and the count C3.13 says beside it (one reading for both). */
  private async formUsage(workspaceId: string) {
    const usage = await this.db.formFieldMap.groupBy({ by: ["canonicalFieldKey", "formEditionId"], where: { workspaceId, outcome: "mapped", status: { in: ["PUBLISHED", "DRAFT"] } }, _count: { _all: true } });
    const editions = new Map((await this.db.formEdition.findMany({ where: { workspaceId }, include: { form: true } })).map((e) => [e.id, e.form.formKey]));
    const formsOf = new Map<string, string[]>(), boxesOf = new Map<string, number>();
    for (const u of usage) {
      if (!u.canonicalFieldKey) continue;
      const form = editions.get(u.formEditionId), had = formsOf.get(u.canonicalFieldKey) ?? [];
      if (form && !had.includes(form)) had.push(form);
      formsOf.set(u.canonicalFieldKey, had); boxesOf.set(u.canonicalFieldKey, (boxesOf.get(u.canonicalFieldKey) ?? 0) + u._count._all);
    }
    return { formsOf, boxesOf };
  }

  /** C3.13 BR-3 (Screen 04 §6): search by name, meaning, alias or form code; ?section=, ?status=, ?origin= filters.
   *  `?retired=` (C11.9) stays: "all" for the whole list, "only" for the retired ones. */
  async fields(q: { q?: string; retired?: string; section?: string; status?: string; origin?: string }) {
    const workspaceId = await this.ws.id();
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId }, orderBy: [{ canonicalFieldKey: "asc" }, { version: "desc" }] });
    const { formsOf, boxesOf } = await this.formUsage(workspaceId);
    const questions = await this.db.sectionQuestion.findMany({ where: { workspaceId }, orderBy: { version: "desc" } });
    // C3.13 review M1: a field's placement is its newest question (rows come newest first); the oldest used to win, so a
    // re-placed field showed, and was filtered by, the section it had left.
    const placements = new Map<string, (typeof questions)[number]>(); for (const p of questions) if (!placements.has(p.canonicalFieldKey)) placements.set(p.canonicalFieldKey, p);
    // C3.13 BR-2: the sections that ask a field are its current (draft or published) questions' sections.
    const sectionsOf = new Map<string, Set<string>>();
    for (const x of current(questions, (r) => r.lineageKey)) sectionsOf.set(x.canonicalFieldKey, (sectionsOf.get(x.canonicalFieldKey) ?? new Set()).add(x.sectionKey));
    const latest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!latest.has(r.canonicalFieldKey)) latest.set(r.canonicalFieldKey, r);
    const versionsBy = new Map<string, typeof rows>(); for (const r of rows) versionsBy.set(r.canonicalFieldKey, [...(versionsBy.get(r.canonicalFieldKey) ?? []), r]);
    const [src, { ids, labels: used }, open] = await Promise.all([this.lib.all("field", workspaceId), this.lib.usedInBoth("field", workspaceId), openItemChanges(this.db, workspaceId, "field")]);
    const fmt = await this.fieldBoxes(workspaceId);
    const list = [...latest.values()].map((f) => {
      const forms = formsOf.get(f.canonicalFieldKey) ?? [];
      const p = placements.get(f.canonicalFieldKey);
      // C3.13 BR-2: where used as counts that say what they count: forms that fill it (the forms listed), combinations
      // using it (the where-used service, SH2), sections asking it.
      const usedBy = { forms: forms.length, combinations: ids.get(f.canonicalFieldKey)?.size ?? 0, sections: sectionsOf.get(f.canonicalFieldKey)?.size ?? 0 };
      const state = itemState(versionsBy.get(f.canonicalFieldKey) ?? [], open.get(f.canonicalFieldKey));
      return { key: f.canonicalFieldKey, meaning: f.meaning, value_type: f.valueType, scope: f.scope, version: f.version, status: f.status, origin: f.origin, origin_words: originWords(f.origin), has_draft: f.status === "DRAFT", boxes: boxesOf.get(f.canonicalFieldKey) ?? 0, forms, usedBy, placement: p ? { section: p.sectionKey, collected_from: p.collectedFrom } : null, name: (f.labelChecked && f.label) || null, aliases: f.aliases, ...sourceSummary(src.get(f.canonicalFieldKey)), used_in: used.get(f.canonicalFieldKey) ?? [], format: formatLine(fmt.get(f.canonicalFieldKey), f.valueType), ...state };
    });
    return list.filter(libraryFilter(q, (r) => [r.key, r.meaning, r.name ?? "", latest.get(r.key)?.label ?? "", ...r.aliases], (r) => r.forms, (r) => r.placement?.section ?? null));
  }

  /** P-162 (C3.1): each field's current mapped form fields with their edition's inventory, for its format. Only the
   *  newest version per edition and form field counts, while it maps this field. */
  private async fieldBoxes(workspaceId: string, key?: string): Promise<Map<string, MappedBox[]>> {
    const rows = await this.db.formFieldMap.findMany({ where: { workspaceId, ...(key ? { canonicalFieldKey: key } : {}), status: { in: ["PUBLISHED", "DRAFT"] } }, include: { edition: { include: { form: true } } }, orderBy: { version: "desc" } });
    const seen = new Set<string>(), out = new Map<string, MappedBox[]>();
    for (const r of rows) {
      const id = `${r.formEditionId}|${r.dataPath}`;
      if (seen.has(id)) continue; seen.add(id);
      if (r.outcome !== "mapped" || !r.canonicalFieldKey) continue;
      out.set(r.canonicalFieldKey, [...(out.get(r.canonicalFieldKey) ?? []), { form: r.edition.editionLabel, inventoryFile: r.edition.inventoryFile, dataPath: r.dataPath, caption: r.caption, transform: r.transform }]);
    }
    return out;
  }

  /** P-162: a shared field's format, read from its form fields (`GET /library/fields/:key/format`). */
  async fieldFormatOf(key: string) {
    const workspaceId = await this.ws.id();
    const field = await this.db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" }, select: { valueType: true } });
    if (!field) fail(`${key} is not in the shared library.`, HttpStatus.NOT_FOUND);
    const boxes = (await this.fieldBoxes(workspaceId, key)).get(key) ?? [];
    const f = fieldFormat(boxes, field!.valueType);
    return { key, ...f, line: formatLine(boxes, field!.valueType), forms: [...new Set(boxes.map((b) => b.form))] };
  }

  /** P-162: the fixed format checks run on a value, as a case would (`POST /library/fields/:key/format-check`). */
  async checkFieldFormat(key: string, body: unknown) {
    const b = (body ?? {}) as { value?: unknown; country?: unknown; other_date?: unknown };
    if (!("value" in (b as object))) fail("Give the value to check.", HttpStatus.BAD_REQUEST);
    const f = await this.fieldFormatOf(key);
    const problems = checkFormat(f, b.value, { country: typeof b.country === "string" ? b.country : null, otherDate: typeof b.other_date === "string" ? b.other_date : null });
    return { key, value: b.value, ok: !problems.length, problems, format: f.line };
  }

  async field(key: string) {
    const workspaceId = await this.ws.id();
    const versions = await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" } });
    if (!versions.length) fail(`No field ${key}.`, HttpStatus.NOT_FOUND);
    const boxes = await this.db.formFieldMap.findMany({ where: { workspaceId, canonicalFieldKey: key, status: { in: ["PUBLISHED", "DRAFT"] } }, include: { edition: { include: { form: true } } }, orderBy: [{ formEditionId: "asc" }, { dataPath: "asc" }] });
    const placements = await this.db.sectionQuestion.findMany({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" } });
    const sections = await this.db.logicalSection.findMany({ where: { workspaceId } });
    const needle = `"field":"${key}"`;
    const has = (j: unknown) => !!j && JSON.stringify(j).replace(/\s/g, "").includes(needle);
    const [forms, reqs, rules, checks, comps] = await Promise.all([this.db.combinationForm.findMany({ where: { workspaceId }, include: { form: true } }), this.db.documentRequirement.findMany({ where: { workspaceId } }), this.db.predicate.findMany({ where: { workspaceId } }), this.db.check.findMany({ where: { workspaceId } }), this.db.combination.findMany({ where: { workspaceId } })]);
    const compLabel = new Map(comps.map((c) => [c.id, c.label]));
    const types = await this.db.documentType.findMany({ where: { workspaceId } });
    const format = fieldFormat((await this.fieldBoxes(workspaceId, key)).get(key) ?? [], versions[0].valueType);
    return {
      format,
      versions: versions.map((v) => ({ ...v })), current: versions[0],
      used_by: Object.values(boxes.reduce((a: any, b) => { const k = b.edition.editionLabel; a[k] ??= { form: b.edition.form.formKey, edition: k, boxes: [] as any[] }; a[k].boxes.push({ data_path: b.dataPath, caption: b.caption, person: b.person, row: b.row, transform: b.transform, status: b.status, origin: b.origin }); return a; }, {})),
      placements: placements.map((p) => ({ ...p, section_title: sections.find((s) => s.sectionKey === p.sectionKey)?.title ?? p.sectionKey })),
      conditions: [
        ...forms.filter((f) => has(f.predicateJson)).map((f) => ({ kind: "Form", item: f.form.formKey, combination: compLabel.get(f.combinationId), plain: f.conditionPlain })),
        ...reqs.filter((r) => has(r.predicateJson)).map((r) => ({ kind: "Document requirement", item: types.find((t) => t.documentTypeKey === r.documentTypeKey)?.name ?? r.documentTypeKey, combination: compLabel.get(r.combinationId), plain: r.conditionPlain })),
        ...rules.filter((r) => has(r.predicateJson)).map((r) => ({ kind: "Rule", item: r.thenPlain, combination: compLabel.get(r.combinationId), plain: r.whenPlain })),
        ...checks.filter((r) => has(r.predicateJson)).map((r) => ({ kind: "Check", item: r.checkKey, combination: compLabel.get(r.combinationId), plain: r.message })),
      ],
      supplied_by_documents: types.filter((t) => t.suppliesFacts.includes(key)).map((t) => t.name),
    };
  }

  async updateField(actor: Actor, key: string, b: { meaning?: string; valueType?: string; note?: string; retire?: boolean }) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    // C11.9 (break B1, review Ma4): retiring goes through the one guard (where used first, a second person), never here.
    if (b.retire !== undefined) throw new HttpException({ type: "https://expatready.local/problems/use-retire", title: "Use Retire", status: 410, detail: `A shared field is retired with POST /api/library/fields/${key}/retire (where used first; a second person approves), not by editing it.` }, HttpStatus.GONE);
    const workspaceId = await this.ws.id();
    await refuseRetired(this.db, workspaceId, "field", [key]); // review Ma2: editing a retired field never brings it back
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key } });
    const merged = [...rows].sort((x, y) => y.version - x.version)[0]?.mergedIntoKey; // F1: a merged field only redirects (break m12)
    if (merged) fail(`${key} was merged into ${merged}: change that field instead.`, HttpStatus.CONFLICT);
    const changes: any = {};
    if (b.meaning !== undefined) { if (b.meaning.trim().length < 8) fail("Describe the meaning in a short sentence."); changes.meaning = b.meaning.trim(); }
    if (b.valueType !== undefined) { if (!VALUE_TYPES.includes(b.valueType)) fail("Unknown value type."); changes.valueType = b.valueType; changes.dataType = VALUE_TYPE_TO_DATA_TYPE[b.valueType]; }
    if (b.note !== undefined) changes.note = b.note;
    if (b.retire) changes.status = "RETIRED";
    // C11.9 break round 2 (Major 2): checked again and written under the item's lock, so a retire approved at the same moment waits.
    const { row, created } = await this.db.$transaction(async (tx) => {
      await lockItem(tx, workspaceId, "field", [key]); await refuseRetired(tx, workspaceId, "field", [key]);
      return revise(tx.canonicalField, await tx.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key } }), changes, actor.id, (r: typeof rows[number]) => ({ ...strip(r), origin: "HUMAN" }));
    });
    if (b.retire && !created) await this.db.canonicalField.update({ where: { id: row.id }, data: { status: "RETIRED" } });
    await this.audit.log(workspaceId, actor.id, "updated", "field", key, `${actor.name} ${b.retire ? "retired" : "changed"} field ${key} (draft v${row.version})`, changes);
    return row;
  }

  async placeField(actor: Actor, key: string, b: { sectionKey: string; collectedFrom: string; repeats: string; tier?: string; questionText?: string; helpText?: string; condition?: any; conditionEffect?: string | null; conditionPlain?: string; ruleOnly?: boolean }) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    const workspaceId = await this.ws.id();
    if (!(await this.db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: key } }))) fail(`No field ${key}.`, HttpStatus.NOT_FOUND);
    await refuseRetired(this.db, workspaceId, "field", [key]); // C11.9 break M1: a retired field takes no new placement
    if (!(await this.db.logicalSection.findFirst({ where: { workspaceId, sectionKey: b.sectionKey } }))) fail("Choose an existing section (or create one first).");
    await refuseRetired(this.db, workspaceId, "section", [b.sectionKey]); // C11.9: a retired section takes no new question
    if (!COLLECTED.includes(b.collectedFrom)) fail(`Collected from must be one of: ${COLLECTED.join(", ")}.`);
    if (!["once_per_case", "per_person", "per_row"].includes(b.repeats)) fail("Repeats must be once per case, per person or per row.");
    const types = await this.libraryTypes(workspaceId);
    if (b.condition) { const errs = draftErrors(this.conditionErrors(b.condition, types)); if (errs.length) fail(`Condition: ${errs.join("; ")}.`); if (!b.conditionEffect) fail("Choose what the condition does (show, hide, require or optional)."); }
    const data = { sectionKey: b.sectionKey, collectedFrom: b.collectedFrom, repeats: b.repeats, tier: b.tier ?? "case", questionText: b.questionText?.trim() || null, helpText: b.helpText?.trim() || null, predicateJson: b.condition ?? null, conditionEffect: (b.conditionEffect as any) ?? null, conditionPlain: b.conditionPlain ?? null, ruleOnly: !!b.ruleOnly };
    const rows = await this.db.sectionQuestion.findMany({ where: { workspaceId, lineageKey: key } });
    // C4.9 (P-97): who fills an existing placement changes only through a library change with a second person (who-fills.ts).
    const now = [...rows].sort((a, b) => b.version - a.version).find((r) => r.status === "DRAFT" || r.status === "PUBLISHED");
    if (now && now.collectedFrom !== b.collectedFrom) fail(FILLS_LOCK, HttpStatus.CONFLICT);
    // C11.9 break round 2 (Major 2): checked again and written under the field's lock (a retire approved at once waits).
    const row = await this.db.$transaction(async (tx) => {
      await lockItem(tx, workspaceId, "field", [key]); await refuseRetired(tx, workspaceId, "field", [key]);
      await lockItem(tx, workspaceId, "section", [b.sectionKey]); await refuseRetired(tx, workspaceId, "section", [b.sectionKey]); // round 3 Major 1
      if (!rows.length) {
        const order = await tx.sectionQuestion.count({ where: { workspaceId, sectionKey: b.sectionKey } });
        return tx.sectionQuestion.create({ data: { workspaceId, lineageKey: key, canonicalFieldKey: key, displayOrder: order + 1, ...data, version: 1, status: "DRAFT", origin: "HUMAN", updatedBy: actor.id } });
      }
      return (await revise(tx.sectionQuestion, rows, { ...data, origin: "HUMAN" }, actor.id, strip)).row;
    });
    await this.audit.log(workspaceId, actor.id, "updated", "placement", key, `${actor.name} placed ${key} in ${b.sectionKey} (${b.collectedFrom}${b.condition ? ", conditional" : ""}; draft v${row.version})`, data);
    return row;
  }

  async sections() {
    const workspaceId = await this.ws.id();
    const rows = await this.db.logicalSection.findMany({ where: { workspaceId }, orderBy: [{ displayOrder: "asc" }, { version: "desc" }] });
    const seen = new Set<string>();
    const qs = await this.db.sectionQuestion.groupBy({ by: ["sectionKey"], where: { workspaceId }, _count: { _all: true } });
    const sel = await this.db.sqrSectionSelection.groupBy({ by: ["sectionKey"], where: { workspaceId }, _count: { _all: true } });
    const [src, { ids, labels: used }, open, { formsOf }, questions] = await Promise.all([this.lib.all("section", workspaceId), this.lib.usedInBoth("section", workspaceId), openItemChanges(this.db, workspaceId, "section"), this.formUsage(workspaceId),
      this.db.sectionQuestion.findMany({ where: { workspaceId } })]);
    // C3.13 BR-2: a section is used by the forms that fill a field its current questions ask, and by the combinations that
    // choose it; no section holds another, so its sections count is 0.
    const formsIn = new Map<string, Set<string>>();
    for (const x of current(questions, (r) => r.lineageKey)) for (const f of formsOf.get(x.canonicalFieldKey) ?? []) formsIn.set(x.sectionKey, (formsIn.get(x.sectionKey) ?? new Set()).add(f));
    return rows.filter((r) => !seen.has(r.sectionKey) && seen.add(r.sectionKey)).map((r) => ({ ...itemState(rows.filter((x) => x.sectionKey === r.sectionKey), open.get(r.sectionKey), "section"), ...sourceSummary(src.get(r.sectionKey)), used_in: used.get(r.sectionKey) ?? [], usedBy: { forms: formsIn.get(r.sectionKey)?.size ?? 0, combinations: ids.get(r.sectionKey)?.size ?? 0, sections: 0 }, key: r.sectionKey, title: r.title, meaning: r.meaning, version: r.version, status: r.status, origin: r.origin, origin_words: originWords(r.origin), questions: qs.find((x) => x.sectionKey === r.sectionKey)?._count._all ?? 0, combinations: sel.find((x) => x.sectionKey === r.sectionKey)?._count._all ?? 0 }));
  }

  /** QA-93 (P-116): removing answers with the place the section had, so Undo adds it back in the same place. */
  async selectSection(actor: Actor, combinationId: string, sectionKey: string, on: boolean, b?: { sectionOrder?: unknown }) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    // F6 C4.8: the section choice is a draft change of this combination, so it follows the same locks as every other one.
    if (c.retiredAt) fail(`"${c.label}" is retired: its questionnaire is not changed. Restore it on Structure first; open cases keep their release.`, HttpStatus.CONFLICT);
    const section = await this.db.logicalSection.findFirst({ where: { workspaceId: c.workspaceId, sectionKey }, orderBy: { version: "desc" } });
    if (on && !section) fail("That section is not in the shared library (it may have been removed by a reset). Reload, then choose one from the list.", HttpStatus.NOT_FOUND);
    if (on) await refuseRetired(this.db, c.workspaceId, "section", [sectionKey]); // C11.9: a retired section takes no new combination
    const title = section?.title ?? "That section";
    let sectionOrder: number | null = null;
    // #201 review m3: adding a section already chosen, or removing one that is not, changes nothing and writes no history.
    const had = await this.db.sqrSectionSelection.findFirst({ where: { combinationId, sectionKey } });
    if (on === !!had) return { ok: true, sectionOrder: had?.sectionOrder ?? null };
    if (on) {
      const back = Number.isInteger(b?.sectionOrder) && (b!.sectionOrder as number) >= 0 ? b!.sectionOrder as number : null;
      // C4.1 review m1: a new section goes after the last place in use (never a place another section has).
      const n = back ?? ((await this.db.sqrSectionSelection.aggregate({ where: { combinationId }, _max: { sectionOrder: true } }))._max.sectionOrder ?? -1) + 1;
      // C11.9 round 3 Major 1: checked again and written under the section's lock (a retire approved at once waits).
      await this.db.$transaction(async (tx) => {
        await lockItem(tx, c.workspaceId, "section", [sectionKey]); await refuseRetired(tx, c.workspaceId, "section", [sectionKey]);
        await tx.sqrSectionSelection.upsert({ where: { combinationId_sectionKey: { combinationId, sectionKey } }, update: {}, create: { workspaceId: c.workspaceId, combinationId, sectionKey, sectionOrder: n } });
      });
    } else {
      sectionOrder = had!.sectionOrder;
      await this.db.sqrSectionSelection.deleteMany({ where: { combinationId, sectionKey } });
    }
    await this.audit.log(c.workspaceId, actor.id, "updated", "section selection", sectionKey, `${actor.name} ${on ? "added" : "removed"} the section "${title}" ${on ? "to" : "from"} the questionnaire of "${c.label}"`, undefined, c.id);
    return { ok: true, sectionOrder };
  }

  /** C4.1 (P-216): the combination's sections in its own order, with the library title of each (one title everywhere). */
  async sectionOrder(combinationId: string) {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    const rows = await this.db.sqrSectionSelection.findMany({ where: { combinationId }, orderBy: [{ sectionOrder: "asc" }, { sectionKey: "asc" }] });
    const lib = await this.db.logicalSection.findMany({ where: { workspaceId: c.workspaceId, sectionKey: { in: rows.map((r) => r.sectionKey) } }, orderBy: { version: "desc" } });
    const title = (k: string) => lib.find((x) => x.sectionKey === k)?.title ?? k;
    return { order: rows.map((r) => ({ key: r.sectionKey, title: title(r.sectionKey) })) };
  }

  /** C4.1 (P-216 answer 1): Move up / Move down on a section header. One move is one draft change of this combination,
   *  released with it (C4.8); the order is the same for every person. `seen` is the order the author was looking at: a
   *  move from an older order is refused (409), so two authors never undo each other's move without knowing. */
  async moveSection(actor: Actor, combinationId: string, sectionKey: string, b: unknown) {
    need(actor, "author");
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    if (c.retiredAt) fail(`"${c.label}" is retired: its questionnaire is not changed. Restore it on Structure first; open cases keep their release.`, HttpStatus.CONFLICT);
    const body = (b ?? {}) as { direction?: unknown; seen?: unknown };
    if (body.direction !== "up" && body.direction !== "down") fail('Say which way to move the section: "up" or "down".', HttpStatus.BAD_REQUEST);
    if (!Array.isArray(body.seen) || !body.seen.every((x) => typeof x === "string")) fail("The order you were looking at was not sent. Reload the tab, then move the section again.", HttpStatus.BAD_REQUEST);
    const up = body.direction === "up";
    const { order } = await this.sectionOrder(combinationId);
    const keys = order.map((x) => x.key);
    const at = keys.indexOf(sectionKey);
    if (at < 0) fail("That section is not one this combination chose, so it has no place of its own to move. Its questions follow the sections chosen here; add the section first.", HttpStatus.CONFLICT);
    const title = order[at].title;
    const seen = (body.seen as string[]).filter((k) => keys.includes(k));
    if (seen.length !== keys.length || seen.some((k, i) => k !== keys[i])) fail("The sections were reordered since you opened this tab. Reload to see the order now, then move it again.", HttpStatus.CONFLICT);
    if (up && at === 0) fail(`"${title}" is already the first section.`, HttpStatus.CONFLICT);
    if (!up && at === keys.length - 1) fail(`"${title}" is already the last section.`, HttpStatus.CONFLICT);
    const to = up ? at - 1 : at + 1;
    [keys[at], keys[to]] = [keys[to], keys[at]];
    await this.db.$transaction(keys.map((k, i) => this.db.sqrSectionSelection.update({ where: { combinationId_sectionKey: { combinationId, sectionKey: k } }, data: { sectionOrder: i } })));
    const nth = ordinal(to + 1);
    await this.audit.log(c.workspaceId, actor.id, "updated", "section selection", sectionKey, `${actor.name} moved the section "${title}" ${body.direction} in the questionnaire of "${c.label}": now ${nth} of ${keys.length}`, undefined, c.id);
    return { ok: true, position: to + 1, of: keys.length, order: keys.map((k) => ({ key: k, title: order.find((x) => x.key === k)!.title })) };
  }

  async documentTypes() {
    const workspaceId = await this.ws.id();
    const rows = await this.db.documentType.findMany({ where: { workspaceId }, orderBy: [{ name: "asc" }, { version: "desc" }] });
    const seen = new Set<string>();
    const [src, { ids, labels: used }, open] = await Promise.all([this.lib.all("document_type", workspaceId), this.lib.usedInBoth("document_type", workspaceId), openItemChanges(this.db, workspaceId, "document_type")]);
    // C3.13 BR-2: a document type is used by the combinations whose checklist lists it, takes it as an alternative or reads
    // a fact from it (SH2b); no form fills it and no section holds it, so those counts are 0.
    return rows.filter((r) => !seen.has(r.documentTypeKey) && seen.add(r.documentTypeKey)).map((r) => ({ ...r, origin_words: originWords(r.origin), ...sourceSummary(src.get(r.documentTypeKey)), used_in: used.get(r.documentTypeKey) ?? [], usedBy: { forms: 0, combinations: ids.get(r.documentTypeKey)?.size ?? 0, sections: 0 }, ...itemState(rows.filter((x) => x.documentTypeKey === r.documentTypeKey), open.get(r.documentTypeKey), "document_type") }));
  }

  async libraryTypes(workspaceId: string) {
    // C11.9 (break M1): a retired field is no longer offered to conditions, so a new condition cannot read it.
    const retired = await retiredFieldKeys(this.db, workspaceId);
    const fields = new Map((await this.db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "asc" } })).filter((f) => !retired.has(f.canonicalFieldKey)).map((f) => [f.canonicalFieldKey, f.valueType]));
    const derived = new Set((await this.db.derivedField.findMany({ where: { workspaceId } })).map((d) => d.derivedKey));
    return { fields, derived, retired };
  }

  /** UX-A part 4 (break R2-M2): every calculated value a condition may read (the check accepts them), with its plain words. */
  async derivedValues() {
    const workspaceId = await this.ws.id();
    return (await this.db.derivedField.findMany({ where: { workspaceId }, orderBy: { derivedKey: "asc" } })).map((d) => ({ key: d.derivedKey, plain: d.plain ?? d.calculation, executable: d.executable }));
  }

  /** The engine's condition check, with a retired field named as retired, never "not in the library" (C11.9 review minor). */
  private conditionErrors(condition: unknown, t: { fields: Map<string, string>; derived: Set<string>; retired: Set<string> }) {
    return checkCondition(condition, t.fields, t.derived).map((e) => { const m = /^reads (\S+), which is not in the library$/.exec(e); return m && t.retired.has(m[1]) ? `reads "${m[1].split(".").pop()!.replace(/_/g, " ")}", a retired field: restore it in Shared library › Fields first, or choose another` : e; });
  }

  async checkCondition(b: { condition: any }) {
    const workspaceId = await this.ws.id();
    const t = await this.libraryTypes(workspaceId);
    return { errors: this.conditionErrors(b.condition, t) };
  }

  // ------------------------------------------------------------------ the combination's own configuration
  async saveRequirement(actor: Actor, combinationId: string, lineage: string | null, b: { documentTypeKey?: string; newTypeName?: string; documentTypeName?: string; proves?: string; attachMode: "COMBINATION_MANDATORY" | "ANSWER_CONDITIONAL"; condition?: any; conditionPlain?: string; appliesToRoles: string; providedBy?: string; sourceQuote?: string; sourceFile?: string; note?: string; alternatives?: string[]; retire?: boolean; baseRevision?: string }) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    const workspaceId = c.workspaceId;
    if (b.retire && lineage) {
      const rows = await this.db.documentRequirement.findMany({ where: { combinationId, lineageKey: lineage } });
      const { row } = await revise(this.db.documentRequirement, rows, { status: "RETIRED" }, actor.id, strip);
      await this.db.documentRequirement.update({ where: { id: row.id }, data: { status: "RETIRED" } });
      await this.audit.log(workspaceId, actor.id, "retired", "document requirement", lineage, `${actor.name} removed document requirement ${lineage} from "${c.label}" (draft)`, undefined, combinationId);
      return row;
    }
    // Break m (#573): text fields are text; a number or an object is refused in words, never a 500 or "[object Object]".
    const TEXT: [string, unknown][] = [["The document type", b.documentTypeKey], ["The new document type's name", b.documentTypeName], ["The new document type's name", b.newTypeName], ["What it proves", b.proves], ["Provided by", b.providedBy], ["The source quote", b.sourceQuote]];
    for (const [what, v] of TEXT) if (v !== undefined && v !== null && typeof v !== "string") fail(`${what} must be text.`);
    let typeKey = b.documentTypeKey;
    const MODES = ["COMBINATION_MANDATORY", "ANSWER_CONDITIONAL"];
    const lineProblems = async () => { // the line's own checks, run before a name is proposed too (review m2: nothing unchecked waits)
      if ((!lineage || b.attachMode !== undefined) && !MODES.includes(b.attachMode)) fail("Choose whether the document is always needed or only when a condition is true.");
      if (!WHO.includes(b.appliesToRoles)) fail("Choose whose document it is.");
      if (b.attachMode === "ANSWER_CONDITIONAL" && !b.condition) fail("A conditional requirement needs its condition.");
      if (b.condition) { const t = await this.libraryTypes(workspaceId); const errs = draftErrors(this.conditionErrors(b.condition, t)); if (errs.length) fail(`Condition: ${errs.join("; ")}.`); }
    };
    // C3.6 (P-149, P-158): a document type named while adding a requirement is never written by hand. A name the library
    // has (live or retired, matched as the library's lander keys it and by its normalised name) is that type, as before; a
    // new name waits as one library proposal on To review › Proposals, and the line is added with it once it is accepted.
    const typeName = cleanLabel(String(b.documentTypeName ?? b.newTypeName ?? ""));
    if (!typeKey && typeName) {
      if (!normalizeLabel(typeName)) fail("Give the new document type a name with letters or numbers.");
      typeKey = (await namedDocumentType(this.db, workspaceId, typeName)) ?? undefined;
      if (!typeKey) {
        // Review m1: an edit never proposes; the line would keep its old type while the words said "add the line with it".
        if (lineage) fail(`"${typeName}" is not in the library. To give this line a new document type, add a new line with that name (it waits as a library proposal), then remove this one; or choose a library type here.`, HttpStatus.CONFLICT);
        if (typeName.length > 120) fail("Keep the document type's name under 120 characters.");
        await lineProblems();
        // Review M1: the identity is the name and what it proves (P-149 (2)); the default proves names no combination, so
        // the same name from two combinations is one item.
        const proves = (b.proves?.trim() || "Not stated yet: the person who named it did not say; the second person may state it before accepting.").slice(0, 200);
        const payload = { kind: "document_type" as const, name: typeName, proves, category: (b.providedBy ?? "client").slice(0, 60), suppliesFacts: [], readerKind: "person_only" as const, identityDocument: false };
        const quote = b.sourceQuote?.trim() ? ` The author's source: "${b.sourceQuote.trim().slice(0, 300)}".` : "";
        const norm = nameKey(typeName);
        const proposalId = await this.db.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`requirement-type:${workspaceId}:${norm}`}))`;
          // Review M1: a waiting proposal for the same name (any letter case, spacing, punctuation or Latin accent, from any
          // combination or from AI drafting) is this one.
          const twin = await waitingDocumentType(tx, workspaceId, typeName);
          if (twin !== null) fail(`A proposal to add the document type "${twin}" is already waiting on To review › Proposals: decide it there, then add the line with it.`, HttpStatus.CONFLICT);
          const job = await tx.draftingJob.create({ data: { workspaceId, combinationId, kind: "requirement_type", mode: "LOCAL", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
            message: `${actor.name} named a new document type while adding a requirement to "${c.label}": one library proposal (no AI, US$0).`, detail: { operation: "requirement_type", name: typeName } } });
          const [id] = await insertProposals(tx, workspaceId, [{
            kind: "document_type", runId: job.id, step: "requirement_type", scope: { formEdition: null, combinationId }, landsOn: "library", reuse: { match: "new", existingKey: null },
            payload, source: null, rounds: { draft: null, check: null }, rules: [{ rule: "not_in_library", passed: true, why: null }],
            agreement: "rules_only", confidence: "check", reason: `Named by a person while adding a document requirement to "${c.label}": a second person checks the name and what it proves.${quote}`.slice(0, 500),
            origin: "rules", identity: { key: identityKeyOf(payload, ""), near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE",
          }]);
          return id;
        }, { timeout: 30_000, maxWait: 10_000 });
        await this.audit.log(workspaceId, actor.id, "proposed", "document type", typeName, `${actor.name} proposed the document type "${typeName}" while adding a requirement to "${c.label}" (Sample; a second person approves it)`, undefined, combinationId);
        return { status: "waiting" as const, proposalId, message: `"${typeName}" waits for a second person on To review › Proposals. Once it is accepted, choose it here and save the line.` };
      }
    }
    if (!typeKey || !(await this.db.documentType.findFirst({ where: { workspaceId, documentTypeKey: typeKey } }))) fail("Choose a document type, or name a new one.");
    await refuseRetired(this.db, workspaceId, "document_type", [typeKey, ...(Array.isArray(b.alternatives) ? b.alternatives : [])]); // C11.9 break M1
    await lineProblems();
    // W1-15 slice 3: alternatives are other library document types; any one of them counts instead of this line's.
    const alternatives = [...new Set((Array.isArray(b.alternatives) ? b.alternatives : []).filter((k) => typeof k === "string" && k && k !== typeKey))];
    if (alternatives.length) { const known = await this.db.documentType.findMany({ where: { workspaceId, documentTypeKey: { in: alternatives } }, select: { documentTypeKey: true } });
      const missing = alternatives.filter((k) => !known.some((t) => t.documentTypeKey === k)); if (missing.length) fail(`An alternative must be a document type in the library: ${missing.join(", ")} is not.`); }
    const data = { alternatives: alternatives.length ? alternatives : Prisma.DbNull, documentTypeKey: typeKey!, attachMode: b.attachMode, predicateJson: b.attachMode === "ANSWER_CONDITIONAL" ? b.condition : null, conditionPlain: b.attachMode === "ANSWER_CONDITIONAL" ? (b.conditionPlain ?? null) : null, appliesToRoles: b.appliesToRoles, providedBy: b.providedBy ?? "client", sourceQuote: b.sourceQuote ?? null, sourceFile: b.sourceFile ?? null, note: b.note ?? null, origin: "HUMAN" as const };
    // C11.9 break round 2 (Major 2): the type and its alternatives are checked again and the line written under their
    // locks, so a retire approved at the same moment either waits for this line (and is refused) or refuses it.
    const typeKeys = [typeKey!, ...alternatives];
    const row = await this.db.$transaction(async (tx) => {
      await lockItem(tx, workspaceId, "document_type", typeKeys); await refuseRetired(tx, workspaceId, "document_type", typeKeys);
      // C3.6 (review round 3): read again under the lock, so a type an Undo removed meanwhile is never written onto a line.
      const still = new Set((await tx.documentType.findMany({ where: { workspaceId, documentTypeKey: { in: typeKeys } }, select: { documentTypeKey: true } })).map((t) => t.documentTypeKey));
      const gone = typeKeys.find((k) => !still.has(k));
      if (gone) fail(gone === typeKey ? "Choose a document type, or name a new one: this one is no longer in the library." : `An alternative must be a document type in the library: ${gone} is not.`);
      if (!lineage) {
        let key = `${typeKey}:${b.appliesToRoles}`;
        if (await tx.documentRequirement.findFirst({ where: { combinationId, lineageKey: key } })) key = `${key}:${Date.now().toString(36)}`;
        return tx.documentRequirement.create({ data: { workspaceId, combinationId, lineageKey: key, ...data, version: 1, status: "DRAFT", updatedBy: actor.id } });
      }
      const rows = await tx.documentRequirement.findMany({ where: { combinationId, lineageKey: lineage } }); this.sameRevision(rows, b.baseRevision); return (await revise(tx.documentRequirement, rows, data, actor.id, strip)).row;
    });
    await this.audit.log(workspaceId, actor.id, lineage ? "updated" : "created", "document requirement", row.lineageKey, `${actor.name} ${lineage ? "changed" : "added"} a ${b.attachMode === "ANSWER_CONDITIONAL" ? "conditional" : "base"} document requirement in "${c.label}" (draft v${row.version})`, data, combinationId);
    return row;
  }

  async saveRule(actor: Actor, combinationId: string, key: string | null, b: { condition: any; whenPlain?: string; thenPlain: string; forWhom: string; sourceQuote?: string; retire?: boolean; baseRevision?: string }) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    if (b.retire && key) { const { row } = await revise(this.db.predicate, await this.db.predicate.findMany({ where: { combinationId, predicateKey: key } }), { status: "RETIRED" }, actor.id, strip); await this.db.predicate.update({ where: { id: row.id }, data: { status: "RETIRED" } }); return row; }
    if (!b.thenPlain?.trim()) fail("Say what the rule does, in plain words.");
    if (!WHO.includes(b.forWhom)) fail("Choose whom the rule is evaluated for.");
    const t = await this.libraryTypes(c.workspaceId);
    const errs = draftErrors(this.conditionErrors(b.condition, t));
    if (!b.condition || errs.length) fail(`Condition: ${errs.join("; ") || "missing"}.`);
    const data = { predicateJson: b.condition, whenPlain: b.whenPlain ?? null, thenPlain: b.thenPlain.trim(), forWhom: b.forWhom, sourceQuote: b.sourceQuote ?? null, origin: "HUMAN" as const };
    let row;
    if (!key) { const n = await this.db.predicate.count({ where: { combinationId } }); row = await this.db.predicate.create({ data: { workspaceId: c.workspaceId, combinationId, predicateKey: `R-${String(n + 1).padStart(2, "0")}-${Date.now().toString(36).slice(-3)}`, ...data, version: 1, status: "DRAFT", updatedBy: actor.id } }); }
    else { const rows = await this.db.predicate.findMany({ where: { combinationId, predicateKey: key } }); this.sameRevision(rows, b.baseRevision); row = (await revise(this.db.predicate, rows, data, actor.id, strip)).row; }
    await this.audit.log(c.workspaceId, actor.id, key ? "updated" : "created", "rule", row.predicateKey, `${actor.name} ${key ? "changed" : "added"} rule "${b.thenPlain.slice(0, 80)}" in "${c.label}" (draft v${row.version})`, data, combinationId);
    return row;
  }

  /** RT-7, P-47 tier 2 (C4.4 part 2): the author adds a section check to a combination's draft, as data: a condition in
   *  the closed vocabulary (engine/validate.ts), the words shown when it fires, and the fact it sits on (default: the
   *  first fact the condition reads). No source quote: labelled Sample (illustrative). It goes out with the next release. */
  async saveCheck(actor: Actor, combinationId: string, raw: unknown) {
    // The database keeps a condition's keys in its own order: compare them sorted.
    const canonical = (v: unknown): string => Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(",")}}` : JSON.stringify(v);
    const b = (raw ?? {}) as { group?: unknown; appliesTo?: unknown; condition?: unknown; message?: unknown; sourceQuote?: unknown };
    need(actor, "author"); // draft edits are the author duty
    const c = await this.db.combination.findUnique({ where: { id: combinationId } });
    if (!c) fail("No such combination.", HttpStatus.NOT_FOUND);
    if ((b.group ?? "section_check") !== "section_check") fail("Only a section check can be added here (group \"section_check\").");
    const message = (typeof b.message === "string" ? b.message : "").trim();
    if (message.length < 5) fail("Say what the person should check, in plain words (at least 5 characters).");
    const t = await this.libraryTypes(c!.workspaceId);
    const errs = checkCondition(b.condition, t.fields, t.derived);
    if (!b.condition || errs.length) fail(`Condition: ${errs.join("; ") || "missing"}.`);
    const condField = (b.condition as { field?: unknown }).field;
    const appliesTo = typeof b.appliesTo === "string" ? b.appliesTo : typeof condField === "string" ? condField : null;
    const quote = typeof b.sourceQuote === "string" ? b.sourceQuote.trim() : "";
    if (!appliesTo || !t.fields.has(appliesTo)) fail("Name the question the check sits on: a field of the library (for example case.funds_available_cad).");
    // Review c44-part2 m1: the same check twice in the draft (a double click) is refused, never saved again.
    const same = (await this.db.check.findMany({ where: { combinationId, checkGroup: "section_check", status: "DRAFT", appliesTo, message: message.slice(0, 500) } }))
      .some((x) => canonical(x.predicateJson) === canonical(b.condition));
    if (same) fail("This check is already in the draft.", HttpStatus.CONFLICT);
    const n = await this.db.check.count({ where: { combinationId } });
    const row = await this.db.check.create({ data: { workspaceId: c!.workspaceId, combinationId, checkKey: `SC-${String(n + 1).padStart(2, "0")}-${Date.now().toString(36).slice(-3)}`, checkGroup: "section_check", appliesTo, predicateJson: b.condition as Prisma.InputJsonValue, severity: "warn", message: message.slice(0, 500), sourceQuote: quote || null, illustrative: !quote, version: 1, status: "DRAFT", origin: "HUMAN", updatedBy: actor.id } });
    await this.audit.log(c!.workspaceId, actor.id, "created", "check", row.checkKey, `${actor.name} added section check "${message.slice(0, 80)}" in "${c!.label}" (draft v1${row.illustrative ? ", Sample" : ""})`, { appliesTo, condition: b.condition }, combinationId);
    return { key: row.checkKey, group: row.checkGroup, applies_to: row.appliesTo, condition: row.predicateJson, message: row.message, illustrative: row.illustrative, status: row.status, version: row.version };
  }

  async saveForm(actor: Actor, combinationId: string, formKey: string, b: { who?: string; attachMode?: "COMBINATION_MANDATORY" | "ANSWER_CONDITIONAL"; condition?: any; conditionPlain?: string; retire?: boolean; baseRevision?: string; minAge?: number | null; signedBy?: string | null; copies?: number }) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    const rows = await this.db.combinationForm.findMany({ where: { combinationId, lineageKey: formKey } });
    if (!rows.length) fail(`${formKey} is not part of this combination.`, HttpStatus.NOT_FOUND);
    // A removed line is not edited or removed again (break m5): add it back from the library first.
    if ([...rows].sort((x, y) => y.version - x.version)[0].status === "RETIRED") fail(`${formKey} was removed from this combination. Add it again from the library to change it.`, HttpStatus.CONFLICT);
    this.sameRevision(rows, b.baseRevision);
    const before = await snapshotLines(this.db, combinationId, [formKey]); // S4: one Undo per combination draft
    const changes: any = {};
    if (b.retire) changes.status = "RETIRED";
    if (b.who) { if (!WHO.includes(b.who)) fail("Choose whose form it is."); changes.who = b.who; }
    // S5: minimum age and who signs (contracts/workspace.ts); field errors as Problem Details.
    const line = FormLineEdit.safeParse({ minAge: b.minAge, signedBy: b.signedBy, copies: b.copies });
    if (!line.success) throw new HttpException(problemFromZod(line.error), HttpStatus.BAD_REQUEST);
    // C1.8 (review m2): a checklist (document) line is never filed, so it has no copies; the screen does not offer it.
    if (line.data.copies !== undefined && (await this.db.govFormDef.findUniqueOrThrow({ where: { id: rows[0].govFormDefId }, select: { formKind: true } })).formKind === "document") {
      const doc = DocumentLineEdit.safeParse({ copies: line.data.copies });
      if (!doc.success) throw new HttpException(problemFromZod(doc.error), HttpStatus.BAD_REQUEST);
    }
    // Break m3: a removal stores no line settings sent with it (they would come back unseen when the form is added again).
    if (!b.retire) for (const k of ["minAge", "signedBy", "copies"] as const) if (line.data[k] !== undefined) changes[k] = line.data[k];
    // M1: "Only if" in words with no rule yet is allowed (a person turns it into a rule later); release refuses it
    // until it has one (engine/validate.ts), and Preview says "Cannot tell yet: no rule".
    if (b.conditionPlain !== undefined && b.condition === undefined && (b.attachMode ?? rows[0].attachMode) === "ANSWER_CONDITIONAL") changes.conditionPlain = b.conditionPlain.trim() || null;
    if (b.attachMode) { changes.attachMode = b.attachMode; if (b.attachMode === "COMBINATION_MANDATORY") { changes.predicateJson = null; changes.conditionPlain = null; } }
    if (b.condition !== undefined && (b.attachMode ?? rows[0].attachMode) === "ANSWER_CONDITIONAL") { const t = await this.libraryTypes(c.workspaceId); const errs = draftErrors(this.conditionErrors(b.condition, t)); if (errs.length) fail(`Condition: ${errs.join("; ")}.`); changes.predicateJson = b.condition; changes.conditionPlain = b.conditionPlain ?? null; }
    const { row } = await revise(this.db.combinationForm, rows, { ...changes, origin: "HUMAN" }, actor.id, strip);
    // A released line's removal is a new version (revise makes it a draft): it must say RETIRED too, or the removal is lost.
    if (b.retire) await this.db.combinationForm.update({ where: { id: row.id }, data: { status: "RETIRED" } });
    await this.audit.log(c.workspaceId, actor.id, "updated", "form", formKey, `${actor.name} ${b.retire ? "removed" : "changed"} ${formKey} in "${c.label}" (draft v${row.version})`, changes, combinationId);
    await recordAction(this.db, { workspaceId: c.workspaceId, combinationId, action: b.retire ? "remove" : "edit", codes: [formKey], before, by: actor.id });
    return row;
  }

  /** Optimistic concurrency for draft edits: the editor sends the revision it opened (the newest row's save time). If
   *  someone saved this item since, the change is refused rather than silently overwriting theirs. */
  private sameRevision(rows: { version: number; updatedAt: Date; updatedBy: string }[], base?: string) {
    if (!base) return;
    const newest = [...rows].sort((a, b) => b.version - a.version)[0];
    if (newest && newest.updatedAt.toISOString() !== base) fail(`Changed by ${ACTORS.find((a) => a.id === newest.updatedBy)?.name ?? newest.updatedBy} at ${newest.updatedAt.toISOString().slice(11, 19)} UTC while you were editing. Your change was not saved; reopen the item to see the current version.`, HttpStatus.CONFLICT);
  }

  /** Revision tokens for the draft editors (not part of the configuration or its fingerprint). */
  async revisions(combinationId: string) {
    const [f, r, p] = await Promise.all([this.db.combinationForm.findMany({ where: { combinationId }, select: { lineageKey: true, version: true, updatedAt: true } }), this.db.documentRequirement.findMany({ where: { combinationId }, select: { lineageKey: true, version: true, updatedAt: true } }), this.db.predicate.findMany({ where: { combinationId }, select: { predicateKey: true, version: true, updatedAt: true } })]);
    const out: Record<string, string> = {};
    const put = (k: string, v: number, at: Date) => { const cur = out[`${k}#v`]; if (cur === undefined || Number(cur) < v) { out[`${k}#v`] = String(v); out[k] = at.toISOString(); } };
    for (const x of f) put(`form:${x.lineageKey}`, x.version, x.updatedAt);
    for (const x of r) put(`requirement:${x.lineageKey}`, x.version, x.updatedAt);
    for (const x of p) put(`rule:${x.predicateKey}`, x.version, x.updatedAt);
    return Object.fromEntries(Object.entries(out).filter(([k]) => !k.endsWith("#v")));
  }

  // ------------------------------------------------------------------ review and release (D254 duties)
  async draftAuthors(combinationId: string, s: Snapshot, workspaceId: string): Promise<string[]> {
    const ids = new Set<string>();
    const draftRows = await Promise.all([
      this.db.canonicalField.findMany({ where: { workspaceId, status: "DRAFT", canonicalFieldKey: { in: s.canonical_fields.map((f) => f.id) } }, select: { updatedBy: true } }),
      this.db.sectionQuestion.findMany({ where: { workspaceId, status: "DRAFT", lineageKey: { in: s.placements.map((p) => p.lineage) } }, select: { updatedBy: true } }),
      this.db.documentRequirement.findMany({ where: { combinationId, status: { in: ["DRAFT", "RETIRED"] } }, select: { updatedBy: true } }),
      this.db.predicate.findMany({ where: { combinationId, status: { in: ["DRAFT", "RETIRED"] } }, select: { updatedBy: true } }),
      this.db.combinationForm.findMany({ where: { combinationId, status: { in: ["DRAFT", "RETIRED"] } }, select: { updatedBy: true } }),
      this.db.formFieldMap.findMany({ where: { workspaceId, status: "DRAFT", edition: { form: { usedBy: { some: { combinationId } } } } }, select: { updatedBy: true }, distinct: ["updatedBy"] }),
      this.db.draftingJob.findMany({ where: { combinationId, kind: "field_map" }, select: { startedBy: true } }),
    ]);
    for (const list of draftRows) for (const r of list as any[]) ids.add(r.updatedBy ?? r.startedBy);
    // Edits that leave no draft row (people on the row, section selection, removals, names, shared definitions this
    // row uses) are authored too: every authoring event since the last release counts (grounding audit finding 2).
    const comp = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId }, include: { program: true } });
    const since = (await this.db.configRelease.findFirst({ where: { combinationId }, orderBy: { version: "desc" } }))?.releasedAt ?? new Date(0);
    const keys = [...new Set([...s.canonical_fields.map((f) => f.id), ...s.sections.map((x) => x.id), ...s.placements.flatMap((p) => [p.lineage, p.fact]), ...(s.document_types ?? []).map((t: any) => t.key), ...(s.derived_fields ?? []).map((d) => d.id), comp.program.programNodeKey])];
    const events = await this.db.auditEvent.findMany({ where: { workspaceId, at: { gt: since }, action: { in: ["created", "updated", "retired", "renamed", "applied", "reused"] }, OR: [{ combinationId }, { combinationId: null, entityKey: { in: keys } }] }, select: { actor: true } });
    for (const e of events) ids.add(e.actor);
    return [...ids];
  }

  async review(id: string) {
    const o = await this.combination(id);
    const sub = o.submission;
    const signoffs = sub ? await this.db.reviewSignoff.findMany({ where: { submissionId: sub.id }, orderBy: { at: "asc" } }) : [];
    return { ...o, signoffs };
  }

  async submit(actor: Actor, id: string, note?: string) {
    need(actor, "author"); // audit D-2: only the author submits (an approver submitting deadlocks release, BR-14)
    const c = await this.db.combination.findUniqueOrThrow({ where: { id } });
    const { snapshot, sha256 } = await buildSnapshot(this.db, c.workspaceId, id, "draft");
    const last = await this.db.configRelease.findFirst({ where: { combinationId: id }, orderBy: { version: "desc" } });
    if (last?.sha256 === sha256) fail("Nothing has changed since the released version.");
    await runKeys(this.db, this.audit, actor, c, snapshot, sha256); // G2 BR-6 (SA-1B-296 r3): the tests run at Submit
    const errors = (await this.problems(c.workspaceId, snapshot, id, await keyGateOf(this.db, id, snapshot, sha256))).filter((p) => p.level === "error");
    refuseBlocking(errors, HttpStatus.BAD_REQUEST, "Fix the problems before submitting: "); // G1 BR-8: every blocking item in errors[], never only the first
    if (errors.length) refuse(`Fix ${errors.length} problem${errors.length > 1 ? "s" : ""} before submitting: ${errors.slice(0, 3).map(problemWords).join(" · ")}`, errors); // S5: a coverage gap is said in words, never by its field code
    const changes = diff((last?.snapshot as any) ?? null, snapshot);
    // W1-02 (break M2): nothing to sign is nothing to release, even when the fingerprint moved (an older release's keys).
    // Refused before anything is written (PR #39 review): a waiting submission is never withdrawn by a refused one.
    if (last && !changes.length) fail("Nothing has changed since the released version.");
    await this.db.reviewSubmission.updateMany({ where: { combinationId: id, status: "SUBMITTED" }, data: { status: "WITHDRAWN", decisionNote: "replaced by a newer submission" } });
    const s = await this.db.reviewSubmission.create({ data: { workspaceId: c.workspaceId, combinationId: id, draftSha256: sha256, submittedBy: actor.id, status: "SUBMITTED", changeSummary: changes as any, decisionNote: note ?? null } });
    await this.audit.log(c.workspaceId, actor.id, "submitted", "configuration", c.combinationKey, `${actor.name} submitted "${c.label}" for review: ${changes.length} change${changes.length === 1 ? "" : "s"} (${changes.filter((x) => x.needs_sme).length} need the SME duty)`, { sha256 });
    return s;
  }

  async signoff(actor: Actor, id: string, body?: { items?: string[]; action?: "signed" | "returned"; note?: string }) {
    // audit D-1: no body, or no action, is a 400 in plain words, never a TypeError (500).
    const b = (body && typeof body === "object" ? body : {}) as { items: string[]; action: "signed" | "returned"; note?: string };
    if (b.action !== undefined && b.action !== "signed" && b.action !== "returned") fail("Say whether you are signing these changes or returning them to the author.");
    const c = await this.db.combination.findUniqueOrThrow({ where: { id } });
    const sub = await this.db.reviewSubmission.findFirst({ where: { combinationId: id, status: "SUBMITTED" }, orderBy: { submittedAt: "desc" } });
    if (!sub) fail("Nothing is waiting for review.");
    // A sign-off names at least one item, and the person who submitted does not sign their own submission (break m1).
    if (!Array.isArray(b.items) || !b.items.length) fail("Choose the changes you sign or return.");
    if (!b.action) fail("Say whether you are signing these changes or returning them to the author.");
    if (b.action === "signed" && sub!.submittedBy === actor.id) fail("You submitted this, so a different person signs it.", HttpStatus.FORBIDDEN);
    const changes = sub!.changeSummary as any[];
    const needsSme = (ref: string) => changes.find((x) => `${x.kind}|${x.key}` === ref)?.needs_sme;
    for (const ref of b.items) {
      if (!changes.some((x) => `${x.kind}|${x.key}` === ref)) fail(`${ref} is not in this submission.`);
      need(actor, needsSme(ref) ? "sme" : "review");
    }
    if (b.action === "returned" && !b.note?.trim()) fail("Say why you are returning it, so the author can correct it.");
    await this.db.reviewSignoff.createMany({ data: b.items.map((itemRef) => ({ workspaceId: c.workspaceId, submissionId: sub!.id, itemRef, duty: needsSme(itemRef) ? "sme" : "review", actorId: actor.id, action: b.action, note: b.note ?? null })) });
    if (b.action === "returned") await this.db.reviewSubmission.update({ where: { id: sub!.id }, data: { status: "RETURNED", decidedBy: actor.id, decidedAt: new Date(), decisionNote: b.note } });
    await this.audit.log(c.workspaceId, actor.id, b.action, "configuration", c.combinationKey, `${actor.name} ${b.action === "signed" ? "signed" : "returned"} ${b.items.length} item${b.items.length > 1 ? "s" : ""} of "${c.label}"${b.note ? `: ${b.note}` : ""}`);
    return { ok: true };
  }

  async approve(actor: Actor, id: string) {
    need(actor, "approve");
    const c = await this.db.combination.findUniqueOrThrow({ where: { id }, include: { program: true } });
    const { snapshot, sha256 } = await buildSnapshot(this.db, c.workspaceId, id, "draft");
    // Re-checked at approval, not only at submission: a row that has since fallen above a full combination, or a draft
    // that now has errors, is not released.
    // G2 (reviewer m2; check_f8_empty_release): the draft's own problems first, as before, without the answer-key lines
    // (they are judged after the tests run, below); then the review and self-approval refusals; only then the tests run.
    const own = (await this.problems(c.workspaceId, snapshot, id, NO_KEY_GATE)).filter((p) => p.level === "error");
    refuseBlocking(own, HttpStatus.CONFLICT, "Release refused: "); // G1 BR-8
    if (own.length) refuse(`Release refused: ${own.length} problem${own.length > 1 ? "s" : ""} (${problemWords(own[0])})`, own, HttpStatus.CONFLICT);
    // The same review gate as the shared Release page (QA-1, review should 2).
    const gate = await this.releaseGate(id, sha256);
    if (!gate.ok) { await this.audit.log(c.workspaceId, actor.id, "refused", "release", c.combinationKey, `Release refused: ${gate.why}`); fail(`Release refused: ${gate.why}`, HttpStatus.CONFLICT); }
    // A new shared field this draft uses is approved by a second person first (Screen 02 slice 2, B1).
    const waiting = await unapprovedAdds(this.db, c.workspaceId, itemsOf(snapshot));
    if (waiting.length) fail(`Release refused: ${unapprovedWhy(waiting)}.`, HttpStatus.CONFLICT);
    const sub = (gate as { sub: ReviewSubmission }).sub;
    const authors = await this.draftAuthors(id, snapshot, c.workspaceId);
    for (const author of authors) {
      const check = canRelease({ author: { user_id: author, role: "content_publisher" }, submitter: { user_id: sub.submittedBy, role: "content_publisher" }, approver: { user_id: actor.id, role: "content_publisher" }, configuration_sha256: sha256 }, sub.draftSha256);
      if (!check.ok) { await this.audit.log(c.workspaceId, actor.id, "refused", "release", c.combinationKey, `Release refused: ${check.reason}`); fail(`Release refused: ${check.reason.replace("self-approval refused: approver is the author", "you changed this draft, so a different person releases it (BR-14)").replace("self-approval refused: approver is the submitter", "you submitted it, so a different person releases it (BR-14)")}.`, HttpStatus.CONFLICT); }
    }
    // G2 BR-6: the tests run again at release, on this exact draft, before it is judged (after the review and self-approval refusals: round-2 review m4).
    await runKeys(this.db, this.audit, actor, c, snapshot, sha256);
    const keyGate = await keyGateOf(this.db, id, snapshot, sha256);
    const blocking = (await this.problems(c.workspaceId, snapshot, id, keyGate)).filter((p) => p.level === "error");
    if (blocking.length) refuse(`Release refused: ${blocking.length} problem${blocking.length > 1 ? "s" : ""} (${problemWords(blocking[0])})`, blocking, HttpStatus.CONFLICT);
    const changes = sub.changeSummary as any[];
    const release = await this.db.$transaction(async (tx) => {
      if (!(await keysUnchanged(tx, id, keyGate.keys))) staleKeys(c.label); // G2 BR-6 (challenge m8)
      const pack = await this.newPackVersion(tx, c.workspaceId, authors, actor.id, { rows: 1, via: "combination review" });
      const out = await this.publishRow(tx, c, snapshot, sha256, { packVersionId: pack.id, authors, submitter: sub.submittedBy, approver: actor.id, summary: { changes: changes.length, sme_signed: changes.filter((x) => x.needs_sme).length, counts: this.counts(snapshot), ...keyEvidence(keyGate) } });
      await tx.reviewSubmission.update({ where: { id: sub.id }, data: { status: "APPROVED", decidedBy: actor.id, decidedAt: new Date() } });
      const library = await publishLibraryChanges(tx, c.workspaceId, pack.version, { items: itemsOf(snapshot) });
      return { ...out, pack: pack.version, library };
    }, RELEASE_TX);
    await this.audit.log(c.workspaceId, actor.id, "released", "configuration", c.combinationKey, `${actor.name} approved and released "${c.label}" in Release ${release.pack}; ${Object.entries(release.n).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(", ") || "no draft rows"} published`, { sha256, published: release.n, pack_version: release.pack }, id);
    return { version: release.version, pack: release.pack, sha256, published: release.n, library: release.library };
  }

  /** The review steps a draft must have passed before anyone releases it, wherever the release is started (QA-1): it was
   *  submitted, it has not changed since, and every change that needs the SME duty is signed. The shared Release page
   *  holds a row back with this reason; both release routes refuse a release that skips it. */
  async releaseGate(combinationId: string, sha256: string): Promise<Gate> {
    const sub = await this.db.reviewSubmission.findFirst({ where: { combinationId }, orderBy: { submittedAt: "desc" } });
    const signed = sub ? (await this.db.reviewSignoff.findMany({ where: { submissionId: sub.id, action: "signed" }, select: { itemRef: true } })).map((x) => x.itemRef) : [];
    return gateOf(sub, new Set(signed), sha256);
  }
  /** The same gate for many rows at once (the Release page): two queries, not two per row (break m7). */
  async releaseGates(rows: { combinationId: string; sha256: string }[]): Promise<Map<string, Gate>> {
    const subs = await this.db.reviewSubmission.findMany({ where: { combinationId: { in: rows.map((r) => r.combinationId) } }, orderBy: { submittedAt: "desc" } });
    const latest = new Map<string, ReviewSubmission>();
    for (const x of subs) if (!latest.has(x.combinationId)) latest.set(x.combinationId, x);
    const signed = await this.db.reviewSignoff.findMany({ where: { submissionId: { in: [...latest.values()].map((x) => x.id) }, action: "signed" }, select: { submissionId: true, itemRef: true } });
    return new Map(rows.map((r) => { const sub = latest.get(r.combinationId) ?? null; return [r.combinationId, gateOf(sub, new Set(signed.filter((x) => x.submissionId === sub?.id).map((x) => x.itemRef)), r.sha256)]; }));
  }

  /** One release for the whole shared draft (P-23): every listed combination gets a frozen snapshot in one new pack
   *  version, in one transaction. Each one must have passed review (releaseGate, QA-1), and the person releasing must
   *  not have authored or submitted any of it (BR-14, server-side). */
  async releaseRows(actor: Actor, ids: string[], libraryIds?: string[]) {
    need(actor, "approve");
    const workspaceId = await this.ws.id();
    const prepared: { c: { id: string; workspaceId: string; sourceBasis: string; label: string }; snapshot: Snapshot; sha256: string; authors: string[]; sub: ReviewSubmission; keyGate: KeyGate }[] = [];
    for (const id of ids) {
      const c = await this.db.combination.findUniqueOrThrow({ where: { id }, include: { program: true } });
      const { snapshot, sha256 } = await buildSnapshot(this.db, workspaceId, id, "draft");
      // G2 (reviewer m2): the draft's own problems first, without the answer-key lines; the tests run after the cheap refusals.
      const own = (await this.problems(workspaceId, snapshot, id, NO_KEY_GATE)).filter((p) => p.level === "error");
      refuseBlocking(own, HttpStatus.CONFLICT, `Release refused: "${c.label}": `); // G1 BR-8
      if (own.length) refuse(`Release refused: "${c.label}" has ${own.length} problem${own.length > 1 ? "s" : ""} (${problemWords(own[0])})`, own, HttpStatus.CONFLICT);
      const gate = await this.releaseGate(id, sha256);
      if (!gate.ok) { await this.audit.log(workspaceId, actor.id, "refused", "release", c.combinationKey, `Release refused: "${c.label}": ${gate.why}`); fail(`Release refused: "${c.label}": ${gate.why}`, HttpStatus.CONFLICT); }
      const waiting = await unapprovedAdds(this.db, workspaceId, itemsOf(snapshot));
      if (waiting.length) fail(`Release refused: "${c.label}": ${unapprovedWhy(waiting)}.`, HttpStatus.CONFLICT);
      await runKeys(this.db, this.audit, actor, c, snapshot, sha256); // G2 BR-6 (reviewer m2: after the cheap refusals): the tests run again at release
      const keyGate = await keyGateOf(this.db, id, snapshot, sha256);
      const blocking = (await this.problems(workspaceId, snapshot, id, keyGate)).filter((p) => p.level === "error");
      if (blocking.length) refuse(`Release refused: "${c.label}" has ${blocking.length} problem${blocking.length > 1 ? "s" : ""} (${problemWords(blocking[0])})`, blocking, HttpStatus.CONFLICT);
      prepared.push({ c, snapshot, sha256, authors: await this.draftAuthors(id, snapshot, workspaceId), sub: (gate as { sub: ReviewSubmission }).sub, keyGate });
    }
    const submitted = prepared.filter((p) => p.sub.submittedBy === actor.id).map((p) => p.c.label);
    if (submitted.length) {
      await this.audit.log(workspaceId, actor.id, "refused", "release", null, `Release refused: ${actor.name} submitted ${submitted.join(", ")}`);
      throw new HttpException({ type: "https://expatready.local/problems/self-approval", title: "A different person must release", status: 403, detail: `You submitted ${submitted.slice(0, 3).join(", ")}${submitted.length > 3 ? ` and ${submitted.length - 3} more` : ""} for review, so a different person releases it (BR-14).` }, HttpStatus.FORBIDDEN);
    }
    const authors = [...new Set(prepared.flatMap((p) => p.authors))];
    if (authors.includes(actor.id)) {
      const mine = prepared.filter((p) => p.authors.includes(actor.id)).map((p) => p.c.label);
      await this.audit.log(workspaceId, actor.id, "refused", "release", null, `Release refused: ${actor.name} changed ${mine.join(", ")} in this draft`);
      throw new HttpException({ type: "https://expatready.local/problems/self-approval", title: "A different person must release", status: 403, detail: `You made changes in this draft (${mine.slice(0, 3).join(", ")}${mine.length > 3 ? ` and ${mine.length - 3} more` : ""}), so a different person releases it (BR-14).` }, HttpStatus.FORBIDDEN);
    }
    const out = await this.db.$transaction(async (tx) => {
      const pack = await this.newPackVersion(tx, workspaceId, authors, actor.id, { rows: prepared.length, via: "shared draft" });
      const rows = [];
      for (const p of prepared) {
        if (!(await keysUnchanged(tx, p.c.id, p.keyGate.keys))) staleKeys(p.c.label); // G2 BR-6 (challenge m8)
        const changes = p.sub.changeSummary as { needs_sme?: boolean }[];
        const r = await this.publishRow(tx, p.c, p.snapshot, p.sha256, { packVersionId: pack.id, authors: p.authors, submitter: p.sub.submittedBy, approver: actor.id, summary: { changes: changes.length, sme_signed: changes.filter((x) => x.needs_sme).length, counts: this.counts(p.snapshot), ...keyEvidence(p.keyGate) } });
        await tx.reviewSubmission.update({ where: { id: p.sub.id }, data: { status: "APPROVED", decidedBy: actor.id, decidedAt: new Date() } });
        rows.push({ label: p.c.label, version: r.version });
      }
      // Approved library changes go into the same release (P-23 one release for everything; Screen 04 B1).
      const library = await publishLibraryChanges(tx, workspaceId, pack.version, { ids: libraryIds ?? [], items: mergeItems(prepared.map((p) => itemsOf(p.snapshot))) });
      return { pack: pack.version, rows, library };
    }, RELEASE_TX);
    await this.audit.log(workspaceId, actor.id, "released", "pack", String(out.pack), `${actor.name} released Release ${out.pack}: ${[...out.rows.map((r) => r.label), ...out.library.map((l) => `${l.action.toLowerCase()} ${l.label}`)].join(", ")}`, { rows: out.rows, library: out.library, authors });
    return out;
  }

  private async newPackVersion(tx: any, workspaceId: string, authors: string[], approver: string, summary: Record<string, unknown>) {
    const last = await tx.packVersion.findFirst({ where: { workspaceId }, orderBy: { version: "desc" } });
    return tx.packVersion.create({ data: { workspaceId, version: (last?.version ?? 0) + 1, authorIds: authors, approverId: approver, summary } });
  }

  /** Freezes one combination's draft as its next row snapshot and publishes the draft rows it carries; what they replace
   *  is superseded. Runs inside the caller's transaction. */
  private async publishRow(tx: any, c: { id: string; workspaceId: string; sourceBasis: string }, snapshot: Snapshot, sha256: string, m: { packVersionId: string; authors: string[]; submitter: string; approver: string; summary: Record<string, unknown> }) {
    const id = c.id, ws = c.workspaceId;
    const last = await tx.configRelease.findFirst({ where: { combinationId: id }, orderBy: { version: "desc" } });
    const version = (last?.version ?? 0) + 1;
    if (last) await tx.configRelease.update({ where: { id: last.id }, data: { status: "SUPERSEDED" } });
    const r = await tx.configRelease.create({ data: { workspaceId: ws, combinationId: id, version, status: "RELEASED", snapshot: snapshot as any, sha256, summary: m.summary as any, authorId: m.authors.join(","), submitterId: m.submitter, approverId: m.approver, packVersionId: m.packVersionId, basis: c.sourceBasis === "ILLUSTRATIVE" ? "Illustrative combination: not source-verified for this program; prototype only" : "Source-backed configuration; prototype only, not specialist-confirmed for production" } });
    const publish = async (delegate: any, where: any) => {
      const drafts = await delegate.findMany({ where: { ...where, status: "DRAFT" } });
      for (const d of drafts) { if (d.supersedesId) await delegate.update({ where: { id: d.supersedesId }, data: { status: "SUPERSEDED" } }); await delegate.update({ where: { id: d.id }, data: { status: "PUBLISHED" } }); }
      return drafts.length;
    };
    const n = {
      fields: await publish(tx.canonicalField, { workspaceId: ws, canonicalFieldKey: { in: snapshot.canonical_fields.map((f) => f.id) } }),
      placements: await publish(tx.sectionQuestion, { workspaceId: ws, lineageKey: { in: snapshot.placements.map((p) => p.lineage) } }),
      sections: await publish(tx.logicalSection, { workspaceId: ws, sectionKey: { in: snapshot.sections.map((x) => x.id) } }),
      documentTypes: await publish(tx.documentType, { workspaceId: ws, documentTypeKey: { in: snapshot.document_requirements.map((d) => d.document_type_key) } }),
      requirements: await publish(tx.documentRequirement, { combinationId: id }), rules: await publish(tx.predicate, { combinationId: id }), forms: await publish(tx.combinationForm, { combinationId: id }), checks: await publish(tx.check, { combinationId: id }),
      factSources: await publish(tx.factSource, { combinationId: id }), // W1-15 slice 1
      boxes: await publish(tx.formFieldMap, { workspaceId: ws, edition: { form: { usedBy: { some: { combinationId: id } } } } }),
      // The answer lists its choice fields take (F1): published with them, or the published copy loses them (runtime R1a, S-9).
      lists: await publish(tx.answerList, { workspaceId: ws, answerListKey: { in: snapshot.canonical_fields.flatMap((f) => (f.answer_list ? [f.answer_list.key] : [])) } }),
    };
    // A retired row released: the lineage it ends stays retired; its predecessor is superseded.
    // Checks too (Lead check slice 3): effective's held retires cover them, so a released retire must supersede here.
    for (const delegate of [tx.documentRequirement, tx.predicate, tx.combinationForm, tx.check] as any[]) for (const x of await delegate.findMany({ where: { combinationId: id, status: "RETIRED", supersedesId: { not: null } } })) await delegate.update({ where: { id: x.supersedesId }, data: { status: "SUPERSEDED" } });
    // What is now published must be exactly the frozen, reviewed snapshot (break M1): an edit saved while the release ran
    // would otherwise be published unreviewed and missing from the release. Any difference rolls the whole release back.
    const published = await buildSnapshot(tx, ws, id, "published");
    if (published.sha256 !== sha256) fail(`Release refused: "${(c as { label?: string }).label ?? "a combination"}" was changed while it was being released, so nothing was released. Review the change, submit it again, then release.`, HttpStatus.CONFLICT);
    return { r, n, version };
  }

  async releases(combinationId?: string) {
    const workspaceId = await this.ws.id();
    const rows = await this.db.configRelease.findMany({ where: { workspaceId, ...(combinationId ? { combinationId } : {}) }, orderBy: { releasedAt: "desc" }, include: { combination: true } });
    return rows.map((r) => ({ id: r.id, combination: r.combination.label, combination_id: r.combinationId, version: r.version, sha256: r.sha256, status: r.status, released_at: r.releasedAt, author: r.authorId, submitter: r.submitterId, approver: r.approverId, names: { author: peopleNames(r.authorId), submitter: peopleNames(r.submitterId), approver: peopleNames(r.approverId) }, summary: r.summary, basis: r.basis,
      // C5.6 (P-240, G3): Sample content is a "Demo release", never counted as a real publish (derived on read).
      demo: isDemoSnapshot(r.snapshot) }));
  }

  /** C6.11 review Major 1: firm staff read the configuration lines and their own firm's case lines only; another firm's
   *  case events (opened, team, people, answers, sections, form copies) are left out. Case lines name their case as
   *  "case <first 8 of its id>". Configuration people read every line, as before. */
  async activity(limit = 200, firmKey: string | null = null) {
    const workspaceId = await this.ws.id();
    const rows = await this.db.auditEvent.findMany({ where: { workspaceId }, orderBy: { at: "desc" }, take: firmKey ? limit * 5 : limit });
    let kept = rows;
    if (firmKey) {
      const own = new Set((await this.db.case.findMany({ where: { workspaceId, firmKey }, select: { id: true } })).map((c) => c.id.slice(0, 8)));
      kept = rows.filter((e) => {
        if (!CASE_ENTITIES.has(e.entity)) return true;
        const id = e.entity === "case" && e.entityKey ? e.entityKey.slice(0, 8) : /\bcase ([0-9a-f]{8})\b/.exec(e.summary)?.[1];
        return !!id && own.has(id);
      }).slice(0, limit);
    }
    // C8.2 (breaker M1 on #553): government identifiers never travel in the feed; the audit row keeps them (AG-7-95).
    return kept.map((e) => ({ ...e, ...(e.entity === "application number" ? { detail: null } : {}), who: peopleNames(e.actor) }));
  }
}

/** The audit entities written by case work (runtime.ts, fill-case.ts, team.ts). */
const CASE_ENTITIES = new Set(["case", "person", "case fact", "row", "group", "section", "form copy", "item", "submission group", "application number" /* C8.2 */]);

/** QA-74: the simulated people's names for stored ids (one id, or several joined by commas), never "user-A" on screen. */
const PEOPLE: readonly { id: string; name: string }[] = [...ACTORS, ...RUNTIME_ACTORS];
export const peopleNames = (ids: string | null) => (ids ?? "").split(",").filter(Boolean).map((id) => PEOPLE.find((p) => p.id === id.trim())?.name ?? id).join(", ");
