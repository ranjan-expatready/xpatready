// Product Studio application service: programs and combinations, the shared library (versioned edits), the
// combination's own configuration, previews through the common renderer, validation, review and release.
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { ReviewSubmission } from "@prisma/client";
import { canRelease } from "../../../contracts/rules.ts";
import { peopleFor, render, kkey, type Known } from "../../engine/render.ts";
import { buildSnapshot, subjectKindOf, VALUE_TYPE_TO_DATA_TYPE, type Mode, type Snapshot } from "../../engine/snapshot.ts";
import { slug } from "../../engine/import.ts";
import { checkCondition, diff, validate } from "../../engine/validate.ts";
import { ACTORS, Audit, Db, fail, need, revise, strip, Workspace, type Actor } from "./core.ts";
import { itemsOf, mergeItems, publishLibraryChanges, unapprovedAdds, unapprovedWhy } from "./library-changes.ts";
import { cleanLabel, normalizeLabel } from "../../contracts/programs.ts";
import { newKeyProblem } from "../../../contracts/fact-key.ts";

const VALUE_TYPES = Object.keys(VALUE_TYPE_TO_DATA_TYPE);
const COLLECTED = ["client_questionnaire", "verified_document", "staff_working_view", "profile_record", "existing_record"];
export const WHO = ["each_applicant", "principal_applicant", "spouse_or_partner", "couple_once", "each_dependent_child", "each_person", "case", "representative"];

/** Business level names over the team's stored node kinds (see createNode). */
export const LEVEL: Record<string, { name: string; parent: string | null }> = { PATHWAY: { name: "Pathway", parent: null }, PROGRAM: { name: "Program", parent: "PATHWAY" }, STREAM: { name: "Category", parent: "PROGRAM" }, CATEGORY: { name: "Sub-category", parent: "STREAM" } };
const LOCATIONS = ["inside_canada", "outside_canada"];
/** A release publishes row by row in one transaction; Prisma's 5 s default ended it half-way on a busy machine (a 500
 *  on release while the lanes' suites ran, 23 Oct), so a release may take up to 30 s before it is rolled back. */
const RELEASE_TX = { timeout: 30_000, maxWait: 10_000 };

type Gate = { ok: true; sub: ReviewSubmission } | { ok: false; why: string };
/** QA-1's gate on loaded rows (pure): the newest submission, the items signed on it, the draft's fingerprint now. */
function gateOf(sub: ReviewSubmission | null, signed: Set<string>, sha256: string): Gate {
  if (!sub || sub.status !== "SUBMITTED") return { ok: false, why: sub?.status === "RETURNED" ? "Returned to the author: correct it and submit it again on its Review and release tab." : "Not submitted for review: submit it on its Review and release tab." };
  if (sub.draftSha256 !== sha256) return { ok: false, why: "The draft changed after it was submitted: submit it again on its Review and release tab." };
  const unsigned = (sub.changeSummary as { kind: string; key: string; needs_sme?: boolean }[]).filter((x) => x.needs_sme && !signed.has(`${x.kind}|${x.key}`)).length;
  if (unsigned) return { ok: false, why: `${unsigned} change${unsigned > 1 ? "s need" : " needs"} the content reviewer's SME sign-off.` };
  return { ok: true, sub };
}

@Injectable()
export class Studio {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  // ------------------------------------------------------------------ session and programs
  async session(actor: Actor) {
    const workspaceId = await this.ws.id();
    const [programs, fields, releases, jobs, sample] = await Promise.all([this.db.programDef.count({ where: { workspaceId, nodeKind: { not: "PATHWAY" } } }), this.db.canonicalField.count({ where: { workspaceId } }), this.db.configRelease.count({ where: { workspaceId } }), this.db.draftingJob.count({ where: { workspaceId } }), this.db.auditEvent.count({ where: { workspaceId, action: "loaded", entity: "sample inputs" } })]);
    // sampleLoaded: the sample inputs were loaded into this workspace, not merely "some program exists" (QA-12).
    return { actor, actors: ACTORS, workspace: { key: "demo", label: "Demo workspace (disposable)", id: workspaceId }, counts: { programs, fields, releases, jobs }, sampleLoaded: sample > 0 };
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
      if (!["INDIVIDUAL", "CORPORATE"].includes(b.clientType ?? "")) fail("A pathway says who the client is: Individual or Corporate (SA-1B-50).");
      const same = await this.db.programDef.findFirst({ where: { workspaceId, nodeKind: "PATHWAY", clientType: b.clientType } });
      if (same) fail(`The ${b.clientType!.toLowerCase()} pathway already exists ("${same.label}"); choose it instead of creating another.`, HttpStatus.CONFLICT);
    } else {
      if (!b.parentKey) fail(`Choose the ${LEVEL[L.parent!].name.toLowerCase()} this ${L.name.toLowerCase()} belongs to.`);
      parent = await this.db.programDef.findFirst({ where: { workspaceId, programNodeKey: b.parentKey } });
      if (!parent) fail(`That ${LEVEL[L.parent!].name.toLowerCase()} does not exist.`, HttpStatus.NOT_FOUND);
      if (parent.nodeKind !== L.parent) fail(`A ${L.name.toLowerCase()} belongs under a ${LEVEL[L.parent!].name.toLowerCase()}, not under a ${LEVEL[parent.nodeKind].name.toLowerCase()}.`);
      if (b.kind === "CATEGORY") { const row = await this.db.combination.findFirst({ where: { programDefId: parent.id } }); if (row) fail(`"${parent.label}" already has its own configuration row ("${row.label}"), so it is a full combination. A sub-category would put that row above a full combination (SA-1B-55/56); add sub-categories to a category without a row.`, HttpStatus.CONFLICT); }
    }
    let locations: string[] = [];
    if (b.kind === "STREAM" || b.kind === "CATEGORY") {
      locations = [...new Set<string>(b.allowedLocations ?? (parent?.allowedLocations?.length ? parent.allowedLocations : []))];
      if (!locations.length || locations.some((l) => !LOCATIONS.includes(l))) fail("Say where a case for it may be opened: inside Canada, outside Canada, or both (SA-1B-51: location is a case detail, allowed per category).");
    }
    // Same parent, same name (BR-6: compared ignoring case, spaces and punctuation): point to the existing record.
    const siblings = await this.db.programDef.findMany({ where: { workspaceId, nodeKind: b.kind, parentNodeKey: parent?.programNodeKey ?? null } });
    const dup = siblings.find((x) => normalizeLabel(x.label) === normalizeLabel(label));
    if (dup) { const detail = `"${dup.label}" already exists ${parent ? `under ${parent.label}` : "as a pathway"}: choose it instead.`; throw new HttpException({ type: "https://expatready.local/problems/name-already-used", title: "Name already used", status: 409, detail, errors: [{ field: "label", message: detail }], existing: { key: dup.programNodeKey, label: dup.label } }, HttpStatus.CONFLICT); }
    // The key is internal (BR-6 compares names, never keys): a name with no Latin letters or digits, or one that shares
    // its first 60 characters with a neighbour, still gets a key of its own (break M3).
    let key = b.key ?? `${parent ? `${parent.programNodeKey}.` : ""}${slug(label) || "item"}`;
    if (!b.key) for (let i = 2; await this.db.programDef.findFirst({ where: { workspaceId, programNodeKey: key }, select: { id: true } }); i++) key = `${key.replace(/-\d+$/, "")}-${i}`;
    // The database keeps one name per parent (QA-14): of two creates at the same moment, one wins and the other is told.
    const n = await this.db.programDef.create({ data: { workspaceId, programNodeKey: key, parentNodeKey: parent?.programNodeKey ?? null, nodeKind: b.kind, label, nameKey: normalizeLabel(label), description: b.description ?? null, sourceBasis: b.sourceBasis ?? parent?.sourceBasis ?? "SOURCE_BACKED", clientType: b.kind === "PATHWAY" ? b.clientType! : null, allowedLocations: locations, linkLabel: b.linkLabel ?? null, createdBy: actor.id, displayOrder: await this.db.programDef.count({ where: { workspaceId } }) } }).catch(async (e) => {
      if ((e as { code?: string }).code !== "P2002") throw e;
      const twin = await this.db.programDef.findFirst({ where: { workspaceId, parentNodeKey: parent?.programNodeKey ?? null, nameKey: normalizeLabel(label) } });
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
    return (await this.undecidedFormFields(combinationId, "DRAFT")).map((f) => ({ level: "error" as const, where: "Forms", item: f.form,
      message: `${f.n} form field${f.n === 1 ? " has" : "s have"} no decision in this draft (for example ${f.example}). Map each one, mark it "not a fact", or "filled by hand" with a reason on To review › Form fields (K1).` }));
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
    for (const r of rows) { const k = r.edition.form.formKey; const cur = by.get(k) ?? { form: k, n: 0, example: r.caption || r.dataPath }; cur.n++; by.set(k, cur); }
    return [...by.values()];
  }

  async createCombination(actor: Actor, b: { programKey: string; label?: string; participants: any[]; description?: string; sourceBasis?: "SOURCE_BACKED" | "ILLUSTRATIVE"; basisNote?: string; key?: string }) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const node = await this.db.programDef.findFirst({ where: { workspaceId, programNodeKey: b.programKey } });
    if (!node) fail("Choose the category (or sub-category) this configuration is for.", HttpStatus.NOT_FOUND);
    if (node!.nodeKind !== "STREAM" && node!.nodeKind !== "CATEGORY") fail(`A configuration row belongs to a full combination: a category, or its sub-category. "${node!.label}" is a ${LEVEL[node!.nodeKind].name.toLowerCase()} (SA-1B-55/56).`);
    if (await this.db.programDef.count({ where: { workspaceId, parentNodeKey: node!.programNodeKey } })) fail(`"${node!.label}" has sub-categories: choose one of them; each is its own full combination.`);
    const existing = await this.db.combination.findFirst({ where: { programDefId: node!.id } });
    if (existing) throw new HttpException({ statusCode: 409, message: `This full combination already has its configuration ("${existing.label}"). Open it instead of creating another (one row per full combination, SA-1B-55).`, existingId: existing.id }, HttpStatus.CONFLICT);
    const participants = this.checkParticipants(b.participants);
    const label = (b.label ?? "").trim() || node!.label;
    const key = b.key ?? node!.programNodeKey;
    const c = await this.db.combination.create({ data: { workspaceId, programDefId: node!.id, combinationKey: key, label, description: b.description ?? null, participants, sourceBasis: b.sourceBasis ?? node!.sourceBasis, basisNote: b.basisNote ?? null, createdBy: actor.id } })
      .catch((e) => { if ((e as any)?.code === "P2002") fail("This full combination was given its configuration a moment ago by someone else. Open it instead.", HttpStatus.CONFLICT); throw e; });
    await this.audit.log(workspaceId, actor.id, "created", "configuration row", key, `${actor.name} created the configuration row for ${node!.label}`, { participants }, c.id);
    return c;
  }

  /** Who a row's lines can name (SA-1B-57 "who"): roles and how many, used by the per-person preview. Family shape is
   *  applicability on one row, not a separate row (grounding audit finding 1). */
  checkParticipants(list: any[]) {
    if (!Array.isArray(list) || !list.length) fail("Add at least the principal applicant.");
    const roles = new Set(["principal", "spouse_or_partner", "child", "representative", "parent"]);
    if (!list.some((p) => p.role === "principal")) fail("A configuration row needs a principal applicant role.");
    return list.map((p) => {
      if (!roles.has(p.role)) fail(`Unknown participant role ${p.role}.`);
      const min = Number(p.min ?? 0), max = Number(p.max ?? 1);
      if (min < 0 || max < min || max > 9) fail(`${p.label ?? p.role}: the number of people must be between 0 and 9, minimum no more than maximum.`);
      return { role: p.role, label: String(p.label ?? p.role).slice(0, 60), min, max, preview: Math.max(min, Math.min(max, Number(p.preview ?? (min || 1)))), applies: p.role === "representative" ? false : p.applies !== false };
    });
  }

  async updateCombination(actor: Actor, id: string, b: { label?: string; description?: string; participants?: any[]; expectedLabel?: string; allowedLocations?: string[] }) {
    need(actor, "author");
    const c = await this.db.combination.findUniqueOrThrow({ where: { id } });
    // Where a case may be opened is a setting of the combination's node (SA-1B-51), kept with the program tree.
    if (b.allowedLocations !== undefined) {
      const locations = [...new Set(b.allowedLocations)];
      if (!locations.length || locations.some((l) => !LOCATIONS.includes(l))) fail("Choose at least one place a case can be opened from: inside Canada, outside Canada, or both.");
      await this.db.programDef.update({ where: { id: c.programDefId }, data: { allowedLocations: locations } });
      await this.audit.log(c.workspaceId, actor.id, "updated", "combination", c.combinationKey, `${actor.name} set where a case for "${c.label}" can be opened: ${locations.map((l) => l.replace("_", " ")).join(" or ")}`, { allowedLocations: locations }, c.id);
    }
    if (b.expectedLabel !== undefined && b.expectedLabel !== c.label) fail(`Someone renamed this combination to "${c.label}" while you were editing. Your change was not saved.`, HttpStatus.CONFLICT);
    const data: any = {};
    if (b.label !== undefined) data.label = b.label.trim() || fail("The name cannot be empty.");
    if (b.description !== undefined) data.description = b.description;
    if (b.participants) data.participants = this.checkParticipants(b.participants);
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
    const problems = await this.problems(c.workspaceId, snapshot, id);
    const sub = await this.db.reviewSubmission.findFirst({ where: { combinationId: id }, orderBy: { submittedAt: "desc" } });
    return {
      combination: { id: c.id, key: c.combinationKey, label: c.label, description: c.description, participants: c.participants, source_basis: c.sourceBasis, basis_note: await this.basisNote(c), created_by: c.createdBy },
      program: { key: (programNode ?? c.program).programNodeKey, label: (programNode ?? c.program).label, kind: (programNode ?? c.program).nodeKind, source_basis: (programNode ?? c.program).sourceBasis }, pathway: parent ? { key: parent.programNodeKey, label: parent.label, client_type: parent.clientType } : null,
      path: chain.map((n) => ({ key: n.programNodeKey, label: n.label, level: LEVEL[n.nodeKind].name })), allowed_locations: c.program.allowedLocations,
      attachments: c.attachments, jobs: c.jobs.map((j) => ({ ...j, detail: undefined })),
      releases: c.releases.map((r) => ({ id: r.id, version: r.version, release: r.packVersion?.version ?? r.version, sha256: r.sha256, status: r.status, released_at: r.releasedAt, author: r.authorId, submitter: r.submitterId, approver: ACTORS.find((x) => x.id === r.approverId)?.name ?? "Approver", summary: r.summary, basis: r.basis })),
      draft: { sha256, matches_release: !!last && last.sha256 === sha256, changes, problems, counts: this.counts(snapshot) },
      submission: sub ? { ...sub, stale: sub.status === "SUBMITTED" && sub.draftSha256 !== sha256 } : null,
    };
  }

  counts(s: Snapshot) {
    return { fields: s.canonical_fields.length, sections: s.sections.length, placements: s.placements.length, forms: s.forms.length, map_boxes: s.field_maps.reduce((a, m) => a + m.entries.length, 0), document_requirements: s.document_requirements.length, rules: s.rules.length, checks: s.checks.length };
  }

  async problems(workspaceId: string, s: Snapshot, combinationId?: string) {
    const structure = combinationId ? await this.structureProblems(combinationId) : [];
    const lib = (await this.db.canonicalField.findMany({ where: { workspaceId }, select: { canonicalFieldKey: true, valueType: true, status: true } })).filter((f) => f.status !== "RETIRED").map((f) => ({ key: f.canonicalFieldKey, valueType: f.valueType }));
    const carried = combinationId ? (await this.undecidedFormFields(combinationId, "PUBLISHED")).map((f) => ({ level: "warning" as const, where: "Forms", item: f.form, message: `Not decided yet (from an earlier release): ${f.n} form field${f.n === 1 ? "" : "s"} (for example ${f.example}). Decide them when this edition is drafted again.` })) : [];
    return [...structure, ...validate(s, lib, s.derived_fields.map((d) => ({ id: d.id, calculation: d.calculation }))), ...carried];
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
  async fields(q: { q?: string }) {
    const workspaceId = await this.ws.id();
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId }, orderBy: [{ canonicalFieldKey: "asc" }, { version: "desc" }] });
    const usage = await this.db.formFieldMap.groupBy({ by: ["canonicalFieldKey", "formEditionId"], where: { workspaceId, outcome: "mapped", status: { in: ["PUBLISHED", "DRAFT"] } }, _count: { _all: true } });
    const editions = new Map((await this.db.formEdition.findMany({ where: { workspaceId }, include: { form: true } })).map((e) => [e.id, e.form.formKey]));
    const placements = new Map((await this.db.sectionQuestion.findMany({ where: { workspaceId }, orderBy: { version: "desc" } })).map((p) => [p.canonicalFieldKey, p]));
    const latest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!latest.has(r.canonicalFieldKey)) latest.set(r.canonicalFieldKey, r);
    const needle = (q.q ?? "").toLowerCase();
    return [...latest.values()].filter((f) => !needle || f.canonicalFieldKey.includes(needle) || f.meaning.toLowerCase().includes(needle)).map((f) => {
      const u = usage.filter((x) => x.canonicalFieldKey === f.canonicalFieldKey);
      const forms = [...new Set(u.map((x) => editions.get(x.formEditionId)))].filter(Boolean);
      const p = placements.get(f.canonicalFieldKey);
      return { key: f.canonicalFieldKey, meaning: f.meaning, value_type: f.valueType, scope: f.scope, version: f.version, status: f.status, origin: f.origin, has_draft: f.status === "DRAFT", boxes: u.reduce((a, x) => a + x._count._all, 0), forms, placement: p ? { section: p.sectionKey, collected_from: p.collectedFrom } : null };
    });
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
    return {
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

  async createField(actor: Actor, b: { key: string; meaning: string; valueType: string }) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    const workspaceId = await this.ws.id();
    const keyProblem = newKeyProblem(b.key);
    if (keyProblem) fail(`A field key is area.name in lower case, for example person.previous_visa_refusal_country (areas: person, relationship, case, organisation, representative): ${keyProblem}.`);
    if (!b.meaning?.trim() || b.meaning.trim().length < 8) fail("Describe the meaning in a short sentence (it is what reviewers and the AI compare).");
    if (!VALUE_TYPES.includes(b.valueType)) fail(`Value type must be one of ${VALUE_TYPES.join(", ")}.`);
    if (await this.db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: b.key } })) fail(`${b.key} already exists: edit it instead, so every form keeps one definition.`, HttpStatus.CONFLICT);
    const f = await this.db.canonicalField.create({ data: { workspaceId, canonicalFieldKey: b.key, version: 1, status: "DRAFT", meaning: b.meaning.trim(), valueType: b.valueType, dataType: VALUE_TYPE_TO_DATA_TYPE[b.valueType], scope: b.key.startsWith("case.") ? "CASE_LEVEL" : "CLIENT_LEVEL", subjectKind: subjectKindOf(b.key), origin: "HUMAN", updatedBy: actor.id } });
    // Break M3: a field added in the library waits for a second person too, like one from an AI draft (B1).
    await this.db.libraryChange.create({ data: { workspaceId, kind: "field", key: b.key, label: f.label, action: "ADD", reason: "Added in the library by hand.", status: "WAITING", proposedBy: actor.id } });
    await this.audit.log(workspaceId, actor.id, "created", "field", b.key, `${actor.name} added field ${b.key} (draft); a second person approves it on To review`);
    return f;
  }

  async updateField(actor: Actor, key: string, b: { meaning?: string; valueType?: string; note?: string; retire?: boolean }) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    const workspaceId = await this.ws.id();
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key } });
    const merged = [...rows].sort((x, y) => y.version - x.version)[0]?.mergedIntoKey; // F1: a merged field only redirects (break m12)
    if (merged) fail(`${key} was merged into ${merged}: change that field instead.`, HttpStatus.CONFLICT);
    const changes: any = {};
    if (b.meaning !== undefined) { if (b.meaning.trim().length < 8) fail("Describe the meaning in a short sentence."); changes.meaning = b.meaning.trim(); }
    if (b.valueType !== undefined) { if (!VALUE_TYPES.includes(b.valueType)) fail("Unknown value type."); changes.valueType = b.valueType; changes.dataType = VALUE_TYPE_TO_DATA_TYPE[b.valueType]; }
    if (b.note !== undefined) changes.note = b.note;
    if (b.retire) changes.status = "RETIRED";
    const { row, created } = await revise(this.db.canonicalField, rows, changes, actor.id, (r) => ({ ...strip(r), origin: "HUMAN" }));
    if (b.retire && !created) await this.db.canonicalField.update({ where: { id: row.id }, data: { status: "RETIRED" } });
    await this.audit.log(workspaceId, actor.id, "updated", "field", key, `${actor.name} ${b.retire ? "retired" : "changed"} field ${key} (draft v${row.version})`, changes);
    return row;
  }

  async placeField(actor: Actor, key: string, b: { sectionKey: string; collectedFrom: string; repeats: string; tier?: string; questionText?: string; helpText?: string; condition?: any; conditionEffect?: string | null; conditionPlain?: string; ruleOnly?: boolean }) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    const workspaceId = await this.ws.id();
    if (!(await this.db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: key } }))) fail(`No field ${key}.`, HttpStatus.NOT_FOUND);
    if (!(await this.db.logicalSection.findFirst({ where: { workspaceId, sectionKey: b.sectionKey } }))) fail("Choose an existing section (or create one first).");
    if (!COLLECTED.includes(b.collectedFrom)) fail(`Collected from must be one of: ${COLLECTED.join(", ")}.`);
    if (!["once_per_case", "per_person", "per_row"].includes(b.repeats)) fail("Repeats must be once per case, per person or per row.");
    const types = await this.libraryTypes(workspaceId);
    if (b.condition) { const errs = checkCondition(b.condition, types.fields, types.derived); if (errs.length) fail(`Condition: ${errs.join("; ")}.`); if (!b.conditionEffect) fail("Choose what the condition does (show, hide, require or optional)."); }
    const data = { sectionKey: b.sectionKey, collectedFrom: b.collectedFrom, repeats: b.repeats, tier: b.tier ?? "case", questionText: b.questionText?.trim() || null, helpText: b.helpText?.trim() || null, predicateJson: b.condition ?? null, conditionEffect: (b.conditionEffect as any) ?? null, conditionPlain: b.conditionPlain ?? null, ruleOnly: !!b.ruleOnly };
    const rows = await this.db.sectionQuestion.findMany({ where: { workspaceId, lineageKey: key } });
    let row;
    if (!rows.length) {
      const order = await this.db.sectionQuestion.count({ where: { workspaceId, sectionKey: b.sectionKey } });
      row = await this.db.sectionQuestion.create({ data: { workspaceId, lineageKey: key, canonicalFieldKey: key, displayOrder: order + 1, ...data, version: 1, status: "DRAFT", origin: "HUMAN", updatedBy: actor.id } });
    } else row = (await revise(this.db.sectionQuestion, rows, { ...data, origin: "HUMAN" }, actor.id, strip)).row;
    await this.audit.log(workspaceId, actor.id, "updated", "placement", key, `${actor.name} placed ${key} in ${b.sectionKey} (${b.collectedFrom}${b.condition ? ", conditional" : ""}; draft v${row.version})`, data);
    return row;
  }

  async sections() {
    const workspaceId = await this.ws.id();
    const rows = await this.db.logicalSection.findMany({ where: { workspaceId }, orderBy: [{ displayOrder: "asc" }, { version: "desc" }] });
    const seen = new Set<string>();
    const qs = await this.db.sectionQuestion.groupBy({ by: ["sectionKey"], where: { workspaceId }, _count: { _all: true } });
    const sel = await this.db.sqrSectionSelection.groupBy({ by: ["sectionKey"], where: { workspaceId }, _count: { _all: true } });
    return rows.filter((r) => !seen.has(r.sectionKey) && seen.add(r.sectionKey)).map((r) => ({ key: r.sectionKey, title: r.title, meaning: r.meaning, version: r.version, status: r.status, origin: r.origin, questions: qs.find((x) => x.sectionKey === r.sectionKey)?._count._all ?? 0, combinations: sel.find((x) => x.sectionKey === r.sectionKey)?._count._all ?? 0 }));
  }

  async createSection(actor: Actor, b: { title: string; meaning?: string }) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    const workspaceId = await this.ws.id();
    if (!b.title?.trim()) fail("Give the section a title.");
    const key = slug(b.title);
    if (await this.db.logicalSection.findFirst({ where: { workspaceId, sectionKey: key } })) fail("A section with this title already exists; reuse it.", HttpStatus.CONFLICT);
    const s = await this.db.logicalSection.create({ data: { workspaceId, sectionKey: key, version: 1, status: "DRAFT", title: b.title.trim(), meaning: b.meaning ?? null, displayOrder: 100 + (await this.db.logicalSection.count({ where: { workspaceId } })), origin: "HUMAN", updatedBy: actor.id } });
    // A new section waits for a second person on To review before any release carries it (Lead re-check 25 Oct).
    await this.db.libraryChange.create({ data: { workspaceId, kind: "section", key, label: s.title, action: "ADD", reason: "Added by hand.", status: "WAITING", proposedBy: actor.id } });
    await this.audit.log(workspaceId, actor.id, "created", "section", key, `${actor.name} added section "${s.title}" (draft)`);
    return s;
  }

  async selectSection(actor: Actor, combinationId: string, sectionKey: string, on: boolean) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    if (on) { const n = await this.db.sqrSectionSelection.count({ where: { combinationId } }); await this.db.sqrSectionSelection.upsert({ where: { combinationId_sectionKey: { combinationId, sectionKey } }, update: {}, create: { workspaceId: c.workspaceId, combinationId, sectionKey, sectionOrder: n } }); }
    else await this.db.sqrSectionSelection.deleteMany({ where: { combinationId, sectionKey } });
    await this.audit.log(c.workspaceId, actor.id, "updated", "section selection", sectionKey, `${actor.name} ${on ? "added" : "removed"} section ${sectionKey} ${on ? "to" : "from"} "${c.label}"`, undefined, c.id);
    return { ok: true };
  }

  async documentTypes() {
    const workspaceId = await this.ws.id();
    const rows = await this.db.documentType.findMany({ where: { workspaceId }, orderBy: [{ name: "asc" }, { version: "desc" }] });
    const seen = new Set<string>();
    return rows.filter((r) => !seen.has(r.documentTypeKey) && seen.add(r.documentTypeKey));
  }

  async libraryTypes(workspaceId: string) {
    const fields = new Map((await this.db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "asc" } })).map((f) => [f.canonicalFieldKey, f.valueType]));
    const derived = new Set((await this.db.derivedField.findMany({ where: { workspaceId } })).map((d) => d.derivedKey));
    return { fields, derived };
  }

  async checkCondition(b: { condition: any }) {
    const workspaceId = await this.ws.id();
    const t = await this.libraryTypes(workspaceId);
    return { errors: checkCondition(b.condition, t.fields, t.derived) };
  }

  // ------------------------------------------------------------------ the combination's own configuration
  async saveRequirement(actor: Actor, combinationId: string, lineage: string | null, b: { documentTypeKey?: string; newTypeName?: string; attachMode: "COMBINATION_MANDATORY" | "ANSWER_CONDITIONAL"; condition?: any; conditionPlain?: string; appliesToRoles: string; providedBy?: string; sourceQuote?: string; sourceFile?: string; note?: string; retire?: boolean; baseRevision?: string }) {
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
    let typeKey = b.documentTypeKey;
    if (!typeKey && b.newTypeName?.trim()) {
      typeKey = slug(b.newTypeName);
      if (!(await this.db.documentType.findFirst({ where: { workspaceId, documentTypeKey: typeKey } }))) { await this.db.documentType.create({ data: { workspaceId, documentTypeKey: typeKey, name: b.newTypeName.trim(), category: b.providedBy ?? "client", version: 1, status: "DRAFT", origin: "HUMAN", updatedBy: actor.id } });
        // A new document type waits for a second person on To review, like a new field (Lead re-check 25 Oct).
        await this.db.libraryChange.create({ data: { workspaceId, kind: "document_type", key: typeKey, label: b.newTypeName.trim(), action: "ADD", reason: "Named while adding a document requirement.", status: "WAITING", proposedBy: actor.id, combinationId } }); }
    }
    if (!typeKey || !(await this.db.documentType.findFirst({ where: { workspaceId, documentTypeKey: typeKey } }))) fail("Choose a document type, or name a new one.");
    if (!WHO.includes(b.appliesToRoles)) fail("Choose whose document it is.");
    if (b.attachMode === "ANSWER_CONDITIONAL" && !b.condition) fail("A conditional requirement needs its condition.");
    if (b.condition) { const t = await this.libraryTypes(workspaceId); const errs = checkCondition(b.condition, t.fields, t.derived); if (errs.length) fail(`Condition: ${errs.join("; ")}.`); }
    const data = { documentTypeKey: typeKey!, attachMode: b.attachMode, predicateJson: b.attachMode === "ANSWER_CONDITIONAL" ? b.condition : null, conditionPlain: b.attachMode === "ANSWER_CONDITIONAL" ? (b.conditionPlain ?? null) : null, appliesToRoles: b.appliesToRoles, providedBy: b.providedBy ?? "client", sourceQuote: b.sourceQuote ?? null, sourceFile: b.sourceFile ?? null, note: b.note ?? null, origin: "HUMAN" as const };
    let row;
    if (!lineage) {
      let key = `${typeKey}:${b.appliesToRoles}`;
      if (await this.db.documentRequirement.findFirst({ where: { combinationId, lineageKey: key } })) key = `${key}:${Date.now().toString(36)}`;
      row = await this.db.documentRequirement.create({ data: { workspaceId, combinationId, lineageKey: key, ...data, version: 1, status: "DRAFT", updatedBy: actor.id } });
    } else { const rows = await this.db.documentRequirement.findMany({ where: { combinationId, lineageKey: lineage } }); this.sameRevision(rows, b.baseRevision); row = (await revise(this.db.documentRequirement, rows, data, actor.id, strip)).row; }
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
    const errs = checkCondition(b.condition, t.fields, t.derived);
    if (!b.condition || errs.length) fail(`Condition: ${errs.join("; ") || "missing"}.`);
    const data = { predicateJson: b.condition, whenPlain: b.whenPlain ?? null, thenPlain: b.thenPlain.trim(), forWhom: b.forWhom, sourceQuote: b.sourceQuote ?? null, origin: "HUMAN" as const };
    let row;
    if (!key) { const n = await this.db.predicate.count({ where: { combinationId } }); row = await this.db.predicate.create({ data: { workspaceId: c.workspaceId, combinationId, predicateKey: `R-${String(n + 1).padStart(2, "0")}-${Date.now().toString(36).slice(-3)}`, ...data, version: 1, status: "DRAFT", updatedBy: actor.id } }); }
    else { const rows = await this.db.predicate.findMany({ where: { combinationId, predicateKey: key } }); this.sameRevision(rows, b.baseRevision); row = (await revise(this.db.predicate, rows, data, actor.id, strip)).row; }
    await this.audit.log(c.workspaceId, actor.id, key ? "updated" : "created", "rule", row.predicateKey, `${actor.name} ${key ? "changed" : "added"} rule "${b.thenPlain.slice(0, 80)}" in "${c.label}" (draft v${row.version})`, data, combinationId);
    return row;
  }

  async saveForm(actor: Actor, combinationId: string, formKey: string, b: { who?: string; attachMode?: "COMBINATION_MANDATORY" | "ANSWER_CONDITIONAL"; condition?: any; conditionPlain?: string; retire?: boolean; baseRevision?: string }) {
    need(actor, "author"); // draft edits are the author duty, enforced here for every screen and direct call
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    const rows = await this.db.combinationForm.findMany({ where: { combinationId, lineageKey: formKey } });
    if (!rows.length) fail(`${formKey} is not part of this combination.`, HttpStatus.NOT_FOUND);
    // A removed line is not edited or removed again (break m5): add it back from the library first.
    if ([...rows].sort((x, y) => y.version - x.version)[0].status === "RETIRED") fail(`${formKey} was removed from this combination. Add it again from the library to change it.`, HttpStatus.CONFLICT);
    this.sameRevision(rows, b.baseRevision);
    const changes: any = {};
    if (b.retire) changes.status = "RETIRED";
    if (b.who) { if (!WHO.includes(b.who)) fail("Choose whose form it is."); changes.who = b.who; }
    if (b.attachMode) { changes.attachMode = b.attachMode; if (b.attachMode === "COMBINATION_MANDATORY") { changes.predicateJson = null; changes.conditionPlain = null; } }
    if (b.condition !== undefined && (b.attachMode ?? rows[0].attachMode) === "ANSWER_CONDITIONAL") { const t = await this.libraryTypes(c.workspaceId); const errs = checkCondition(b.condition, t.fields, t.derived); if (errs.length) fail(`Condition: ${errs.join("; ")}.`); changes.predicateJson = b.condition; changes.conditionPlain = b.conditionPlain ?? null; }
    const { row } = await revise(this.db.combinationForm, rows, { ...changes, origin: "HUMAN" }, actor.id, strip);
    // A released line's removal is a new version (revise makes it a draft): it must say RETIRED too, or the removal is lost.
    if (b.retire) await this.db.combinationForm.update({ where: { id: row.id }, data: { status: "RETIRED" } });
    await this.audit.log(c.workspaceId, actor.id, "updated", "form", formKey, `${actor.name} ${b.retire ? "removed" : "changed"} ${formKey} in "${c.label}" (draft v${row.version})`, changes, combinationId);
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
    need(actor, "review");
    const c = await this.db.combination.findUniqueOrThrow({ where: { id } });
    const { snapshot, sha256 } = await buildSnapshot(this.db, c.workspaceId, id, "draft");
    const last = await this.db.configRelease.findFirst({ where: { combinationId: id }, orderBy: { version: "desc" } });
    if (last?.sha256 === sha256) fail("Nothing has changed since the released version.");
    const errors = (await this.problems(c.workspaceId, snapshot, id)).filter((p) => p.level === "error");
    if (errors.length) fail(`Fix ${errors.length} problem${errors.length > 1 ? "s" : ""} before submitting: ${errors.slice(0, 3).map((e) => `${e.item}: ${e.message}`).join(" · ")}`);
    const changes = diff((last?.snapshot as any) ?? null, snapshot);
    // W1-02 (break M2): nothing to sign is nothing to release, even when the fingerprint moved (an older release's keys).
    // Refused before anything is written (PR #39 review): a waiting submission is never withdrawn by a refused one.
    if (last && !changes.length) fail("Nothing has changed since the released version.");
    await this.db.reviewSubmission.updateMany({ where: { combinationId: id, status: "SUBMITTED" }, data: { status: "WITHDRAWN", decisionNote: "replaced by a newer submission" } });
    const s = await this.db.reviewSubmission.create({ data: { workspaceId: c.workspaceId, combinationId: id, draftSha256: sha256, submittedBy: actor.id, status: "SUBMITTED", changeSummary: changes as any, decisionNote: note ?? null } });
    await this.audit.log(c.workspaceId, actor.id, "submitted", "configuration", c.combinationKey, `${actor.name} submitted "${c.label}" for review: ${changes.length} change${changes.length === 1 ? "" : "s"} (${changes.filter((x) => x.needs_sme).length} need the SME duty)`, { sha256 });
    return s;
  }

  async signoff(actor: Actor, id: string, b: { items: string[]; action: "signed" | "returned"; note?: string }) {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id } });
    const sub = await this.db.reviewSubmission.findFirst({ where: { combinationId: id, status: "SUBMITTED" }, orderBy: { submittedAt: "desc" } });
    if (!sub) fail("Nothing is waiting for review.");
    // A sign-off names at least one item, and the person who submitted does not sign their own submission (break m1).
    if (!b.items?.length) fail("Choose the changes you sign or return.");
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
    const blocking = (await this.problems(c.workspaceId, snapshot, id)).filter((p) => p.level === "error");
    if (blocking.length) fail(`Release refused: ${blocking.length} problem${blocking.length > 1 ? "s" : ""} (${blocking[0].item}: ${blocking[0].message})`, HttpStatus.CONFLICT);
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
    const changes = sub.changeSummary as any[];
    const release = await this.db.$transaction(async (tx) => {
      const pack = await this.newPackVersion(tx, c.workspaceId, authors, actor.id, { rows: 1, via: "combination review" });
      const out = await this.publishRow(tx, c, snapshot, sha256, { packVersionId: pack.id, authors, submitter: sub.submittedBy, approver: actor.id, summary: { changes: changes.length, sme_signed: changes.filter((x) => x.needs_sme).length, counts: this.counts(snapshot) } });
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
    const prepared: { c: { id: string; workspaceId: string; sourceBasis: string; label: string }; snapshot: Snapshot; sha256: string; authors: string[]; sub: ReviewSubmission }[] = [];
    for (const id of ids) {
      const c = await this.db.combination.findUniqueOrThrow({ where: { id }, include: { program: true } });
      const { snapshot, sha256 } = await buildSnapshot(this.db, workspaceId, id, "draft");
      const blocking = (await this.problems(workspaceId, snapshot, id)).filter((p) => p.level === "error");
      if (blocking.length) fail(`Release refused: "${c.label}" has ${blocking.length} problem${blocking.length > 1 ? "s" : ""} (${blocking[0].item}: ${blocking[0].message})`, HttpStatus.CONFLICT);
      const gate = await this.releaseGate(id, sha256);
      if (!gate.ok) { await this.audit.log(workspaceId, actor.id, "refused", "release", c.combinationKey, `Release refused: "${c.label}": ${gate.why}`); fail(`Release refused: "${c.label}": ${gate.why}`, HttpStatus.CONFLICT); }
      const waiting = await unapprovedAdds(this.db, workspaceId, itemsOf(snapshot));
      if (waiting.length) fail(`Release refused: "${c.label}": ${unapprovedWhy(waiting)}.`, HttpStatus.CONFLICT);
      prepared.push({ c, snapshot, sha256, authors: await this.draftAuthors(id, snapshot, workspaceId), sub: (gate as { sub: ReviewSubmission }).sub });
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
        const changes = p.sub.changeSummary as { needs_sme?: boolean }[];
        const r = await this.publishRow(tx, p.c, p.snapshot, p.sha256, { packVersionId: pack.id, authors: p.authors, submitter: p.sub.submittedBy, approver: actor.id, summary: { changes: changes.length, sme_signed: changes.filter((x) => x.needs_sme).length, counts: this.counts(p.snapshot) } });
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
      boxes: await publish(tx.formFieldMap, { workspaceId: ws, edition: { form: { usedBy: { some: { combinationId: id } } } } }),
      // The answer lists its choice fields take (F1): published with them, or the published copy loses them (runtime R1a, S-9).
      lists: await publish(tx.answerList, { workspaceId: ws, answerListKey: { in: snapshot.canonical_fields.flatMap((f) => (f.answer_list ? [f.answer_list.key] : [])) } }),
    };
    // A retired row released: the lineage it ends stays retired; its predecessor is superseded.
    for (const delegate of [tx.documentRequirement, tx.predicate, tx.combinationForm] as any[]) for (const x of await delegate.findMany({ where: { combinationId: id, status: "RETIRED", supersedesId: { not: null } } })) await delegate.update({ where: { id: x.supersedesId }, data: { status: "SUPERSEDED" } });
    // What is now published must be exactly the frozen, reviewed snapshot (break M1): an edit saved while the release ran
    // would otherwise be published unreviewed and missing from the release. Any difference rolls the whole release back.
    const published = await buildSnapshot(tx, ws, id, "published");
    if (published.sha256 !== sha256) fail(`Release refused: "${(c as { label?: string }).label ?? "a combination"}" was changed while it was being released, so nothing was released. Review the change, submit it again, then release.`, HttpStatus.CONFLICT);
    return { r, n, version };
  }

  async releases(combinationId?: string) {
    const workspaceId = await this.ws.id();
    const rows = await this.db.configRelease.findMany({ where: { workspaceId, ...(combinationId ? { combinationId } : {}) }, orderBy: { releasedAt: "desc" }, include: { combination: true } });
    return rows.map((r) => ({ id: r.id, combination: r.combination.label, combination_id: r.combinationId, version: r.version, sha256: r.sha256, status: r.status, released_at: r.releasedAt, author: r.authorId, submitter: r.submitterId, approver: r.approverId, summary: r.summary, basis: r.basis }));
  }

  async activity(limit = 200) {
    const workspaceId = await this.ws.id();
    return this.db.auditEvent.findMany({ where: { workspaceId }, orderBy: { at: "desc" }, take: limit });
  }
}
