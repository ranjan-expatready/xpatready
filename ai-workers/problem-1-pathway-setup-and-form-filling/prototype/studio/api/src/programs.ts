// Screen 01 (Programs): the combination catalogue, adding program nodes, creating a combination on a last-level node,
// attaching a library form to a row, the shared draft bar and one release for everything (P-23). Requests are parsed
// with the shared zod contract (contracts/programs.ts); every write checks the person's duty on the server.
// Row status and counts come from the same snapshots and validator the combination workspace uses (engine/programs.ts).
import { closingChange, recordAction, snapshotLines } from "./form-uses.ts";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { ProgramDef } from "@prisma/client";
import type { z } from "zod";
import { AddLineBody, problemWords, CatalogueQuery, cleanLabel, CreateCombinationBody, CreateNodeBody, DEFAULT_PARTICIPANTS, LEVEL_NAME, normalizeLabel, problemFromZod, ReleaseBody,
  type CatalogueGroup, type CatalogueLeaf, type CatalogueNode, type CatalogueResponse, type CombinationSummary, type ParticipantLine, type Status } from "../../contracts/programs.ts";
import { manifest } from "../../engine/import.ts";
import { acceptsOf, channelProblems, channelsView, filingKind } from "../../engine/channels.ts";
import { CHANNEL_WORDS, type Channel } from "../../contracts/forms.ts";
import { questionCounts } from "../../engine/runtime/questionnaires.ts";
import { checkedOf, comparePaths, formsWithoutFieldMap, isLive, missingItems, needsWork, newestEdition, waitsForPerson, nextActionOf, rowCounts, statusOf, STATUS_TEXT } from "../../engine/programs.ts";
import { buildSnapshot, buildSnapshots, type Snapshot } from "../../engine/snapshot.ts";
import { filedOf } from "../../engine/structure.ts";
import { forViewer, progressOf, setupChecklistOf, waitsForMap, type OfficialPages, type SetupInput } from "../../engine/setup-checklist.ts";
import type { CardSetup, ChipStatus, SetupChecklist, StepKey, ViewerChecklist } from "../../contracts/setup-checklist.ts";
import type { ProposalKind } from "../../contracts/proposal-item.ts";
import { PATHWAY_TYPE_LABEL, type PathwayType } from "../../contracts/structure.ts";
import { diff, sampleContentProblems, validate } from "../../engine/validate.ts";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ACTORS, Audit, Db, isDemoWorkspace, need, ROOT, Workspace, type Actor } from "./core.ts";
import { addFormLine } from "./form-lines.ts";
import { officialPagesOf as readOfficialPages } from "./official-pages.ts";
import { changeView, itemsOf, nearOf, unapprovedAdds, unapprovedWhy } from "./library-changes.ts";
import { openNodeKeys, startWhy } from "./lifecycle.ts";
import { Sources } from "./sources.ts";
import { emptyProblem, formLineProblem, Studio } from "./studio.ts";
import { draftSourceProblems } from "./source-register.ts";
import { filingProblems } from "../../engine/filing-modes.ts";
import { attachedNotSetUp, removedLines } from "../../contracts/counts.ts";
import { gatesOf, realBaseline, type Gate } from "./answer-key-gate.ts";
import { libraryType } from "../../engine/form-type.ts";

/** Parses a request body or query with its contract; a mismatch is a 400 Problem Details with field errors. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
}
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) => new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);

/** The derived definitions a snapshot carries, as the validator reads them. */
const derivedOf = (s: Snapshot) => (s.derived_fields as { id: string; calculation: string }[]).map((d) => ({ id: d.id, calculation: d.calculation }));
type SnapForm = { form_number: string; form_kind?: string | null; channel?: Channel; status?: string; condition_plain?: string | null };

type Row = {
  leaf: CatalogueLeaf; pathway: string; changes: number; errors: number; firstError: string | null; /** Opus review M1 (V3 B1): every draft error, the tagged "no field map" ones included: what holds a row back on the Release page, and its reason. */ holds: number; firstHold: string | null; hasContent: boolean;
  /** UX-A part 2: the draft's release-blocking errors as its Review and release tab counts them (with "Nothing to release
   *  yet" when it has no forms and no documents), and the first of them in words. */
  blockers?: { n: number; first: string | null; empty: boolean };
  searchText: string; docNames: string[];
  /** W1 setup checklist (slice A): the same for every viewer; forViewer adds the duty overlay after the cache. */
  setup: SetupChecklist;
};

/** The official-pages record of each combination (P-156 (2)): the forms lane's reader (F2, api/src/official-pages.ts). */
export const officialPagesOf = (db: Db, ids: string[]): Promise<Map<string, OfficialPages>> => readOfficialPages(db, ids);
/** The card's part of the checklist with this viewer's overlay (GET /catalogue: steps without their open items). */
export function cardSetup(c: SetupChecklist, actor: Actor): CardSetup {
  return { chip: c.chip, bar: c.bar, next: c.next, current: c.current, viewer: forViewer(c, actor), steps: c.steps.map(({ open: _open, ...s }) => s) };
}
/** The List's Progress sort (card v4): most urgent first. */
const CHIP_RANK: Record<ChipStatus, number> = { NOT_READY: 0, IN_PROGRESS: 1, NOT_STARTED: 2, LIVE: 3, RETIRED: 4 };
/** A name with no combination yet: Not started (or retired before it was set up). */
const notStartedInput = (retired: boolean): SetupInput => ({ combinationId: null, retired, release: null, pages: { state: "no_record" }, people: { roles: 0, applicants: 0, saved: false, tier: "expert" },
  forms: { lines: 0, fromLibrary: 0, draftable: 0, unmapped: 0, sources: 0 }, proposals: {}, problems: [], documents: { lines: 0, rolesWithout: 0 }, questions: 0, held: 0, running: null, changes: 0, review: { stage: "submit", submittedBy: null, authors: [] } });
/** Where a release stands (the gate's words, studio.ts gateOf): submit, then the expert signs, then a second person releases. */
const reviewStage = (g: { ok: boolean; why?: string } | undefined): "submit" | "sign" | "release" => g?.ok ? "release" : /sign-off/.test(g?.why ?? "") ? "sign" : "submit";

/** The labels from the program down to a node, for "Showing: Visitors › Super visa" on the list. */
function underPath(nodes: ProgramDef[], key: string) {
  const byKey = new Map(nodes.map((n) => [n.programNodeKey, n]));
  const out: string[] = [];
  for (let n = byKey.get(key); n && n.nodeKind !== "PATHWAY"; n = n.parentNodeKey ? byKey.get(n.parentNodeKey) : undefined) out.unshift(n.label);
  return out.length ? out : null;
}

@Injectable()
export class Programs {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Studio) private readonly studio: Studio, @Inject(Sources) private readonly sources: Sources) {}

  private cache: { key: string; rows: Row[]; nodes: ProgramDef[]; at: number } | null = null;
  /** UX-A part 1 (review m6): the question count per draft fingerprint and day (sample birth dates read the day), so a
   *  rebuild after an edit recounts only the combinations whose draft changed. Bounded. */
  private questionsBy = new Map<string, ReturnType<typeof questionCounts>>();
  private questionsOf(snapshot: Snapshot, sha256: string) {
    const key = `${sha256}|${new Date().toISOString().slice(0, 10)}`;
    let q = this.questionsBy.get(key);
    if (!q) { q = questionCounts(snapshot); if (this.questionsBy.size > 500) this.questionsBy.clear(); this.questionsBy.set(key, q); }
    return q;
  }

  /** Names the migration could not key in SQL (other scripts) get the app's own BR-6 key once per process (QA-14,
   *  break round 3). A name that would duplicate an earlier one keeps no key, as the migration does for duplicates. */
  private keyed = false;
  private async backfillNameKeys(workspaceId: string) {
    if (this.keyed) return; this.keyed = true;
    const open = await this.db.programDef.findMany({ where: { workspaceId, nameKey: null }, orderBy: { createdAt: "asc" } });
    for (const n of open) await this.db.programDef.update({ where: { id: n.id }, data: { nameKey: normalizeLabel(n.label) } }).catch((e) => { if ((e as { code?: string }).code !== "P2002") throw e; });
  }

  /** Every row's summary, recomputed only when the workspace changed: each write records an audit event and AI steps
   *  move job times, so the revision below changes with any edit (sample-data scale; stored summaries are the team's).
   *  A read creates nothing (W1-03 B1): the Pathway type is a fixed value and Pathways are names a person adds. */
  private async rows() {
    const workspaceId = await this.ws.id();
    await this.backfillNameKeys(workspaceId);
    const demo = isDemoWorkspace();
    const [a, j, p, h, se] = await Promise.all([
      this.db.auditEvent.aggregate({ where: { workspaceId }, _count: true, _max: { at: true } }),
      this.db.draftingJob.aggregate({ where: { workspaceId }, _count: true, _max: { startedAt: true, finishedAt: true } }),
      this.db.proposalItem.groupBy({ by: ["status"], where: { workspaceId }, _count: true }),
      this.db.intakeItem.groupBy({ by: ["status"], where: { workspaceId }, _count: true }),
      this.db.sourceEntry.aggregate({ where: { workspaceId }, _count: true, _max: { updatedAt: true } }), // G1: an entry written without an audit line (the sample load) still moves the revision
    ]);
    const key = JSON.stringify([workspaceId, a._count, a._max.at, j._count, j._max.startedAt, j._max.finishedAt, p, h, se._count, se._max.updatedAt]);
    if (this.cache?.key === key) return this.cache;
    const t0 = performance.now();
    const [nodes, combos, releases, jobs, items, lib, editions, heldItems, byKind, subs, lineRows] = await Promise.all([
      this.db.programDef.findMany({ where: { workspaceId }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] }),
      this.db.combination.findMany({ where: { workspaceId }, include: { attachments: { orderBy: { createdAt: "asc" }, select: { id: true, kind: true, recognised: true, sha256: true, edition: true, createdAt: true, officialFile: true } } } }),
      this.db.configRelease.findMany({ where: { workspaceId }, orderBy: { version: "desc" }, select: { combinationId: true, snapshot: true, sha256: true, releasedAt: true, packVersion: { select: { version: true } } } }),
      this.db.draftingJob.findMany({ where: { workspaceId, kind: { in: ["field_map", "reuse_map"] } }, orderBy: { startedAt: "desc" }, select: { id: true, combinationId: true, attachmentId: true, status: true, batchId: true, kind: true, mode: true } }),
      this.db.proposalItem.groupBy({ by: ["runId"], where: { workspaceId, status: "waiting" }, _count: true }),
      this.db.canonicalField.findMany({ where: { workspaceId }, select: { canonicalFieldKey: true, valueType: true, status: true } }),
      this.db.formEdition.findMany({ where: { workspaceId }, select: { sha256: true, maps: { select: { id: true }, take: 1 } } }),
      this.db.intakeItem.findMany({ where: { workspaceId, status: "HELD", outcome: "new_edition_held" }, select: { code: true, editionLabel: true, combinationId: true } }),
      // Setup checklist (concept §8): waiting proposals, one groupBy combination × form edition × kind.
      this.db.proposalItem.groupBy({ by: ["combinationId", "formEdition", "kind"], where: { workspaceId, status: "waiting" }, _count: true }),
      this.db.reviewSubmission.findMany({ where: { workspaceId }, orderBy: { submittedAt: "desc" }, select: { combinationId: true, submittedBy: true, status: true, draftSha256: true } }),
      // UX-A part 1: each combination's form line versions, newest first, for the forms removed in its draft.
      this.db.combinationForm.findMany({ where: { workspaceId }, orderBy: { version: "desc" }, select: { combinationId: true, lineageKey: true, status: true, updatedAt: true } }),
    ]);
    const submittedBy = new Map<string, string>();
    for (const x of subs) if (!submittedBy.has(x.combinationId)) submittedBy.set(x.combinationId, x.submittedBy);
    const pages = await officialPagesOf(this.db, combos.map((c) => c.id));
    // "New today": made by a person in the last day, after the sample load (the loader's own nodes are not new).
    const loadedAt = (await this.db.auditEvent.findFirst({ where: { workspaceId, action: "loaded" }, orderBy: { at: "desc" }, select: { at: true } }))?.at.getTime() ?? 0;
    const snaps = combos.length ? await buildSnapshots(this.db, workspaceId, combos.map((c) => c.id), "draft") : new Map();
    // Review step (addendum A3): the current draft passed review, read with the same gate the release uses.
    const gates = combos.length ? await this.studio.releaseGates(combos.map((c) => ({ combinationId: c.id, sha256: (snaps.get(c.id) as { sha256: string }).sha256 }))) : new Map();
    const library = lib.filter((f) => f.status !== "RETIRED").map((f) => ({ key: f.canonicalFieldKey, valueType: f.valueType }));
    // C11.12 (review M1 of PR 3): the draft's "Filing for <role>" lines, as the release check reads them (studio problems()).
    const personRoles = await this.studio.personRoles(workspaceId);
    // UX-A part 2 (break M1): what IRCC accepts per form, as the Review and release tab validates (studio.problems), so a
    // combination's blocking problems are the same number here, on its setup strip and on its Review tab.
    const accepts = await acceptsOf(this.db, workspaceId);
    const latest = new Map<string, (typeof releases)[number]>();
    for (const r of releases) if (!latest.has(r.combinationId)) latest.set(r.combinationId, r);
    // G2 (C5.5): the answer-key gate of every draft at once (one keys query), from stored runs only (BR-6).
    const lastSub = new Map<string, (typeof subs)[number]>();
    for (const x of subs) if (!lastSub.has(x.combinationId)) lastSub.set(x.combinationId, x);
    const relsOf = new Map<string, (typeof releases)[number][]>(); for (const r of releases) (relsOf.get(r.combinationId) ?? relsOf.set(r.combinationId, []).get(r.combinationId)!).push(r);
    const keyGates = combos.length ? await gatesOf(this.db, combos.map((c) => { const d = snaps.get(c.id) as { snapshot: Snapshot; sha256: string }, r = latest.get(c.id), sub = lastSub.get(c.id);
      return { combinationId: c.id, snapshot: d.snapshot, sha256: d.sha256, released: r ? { snapshot: r.snapshot, sha256: r.sha256 } : null, baseline: realBaseline(relsOf.get(c.id) ?? []), submitted: sub?.status === "SUBMITTED" && sub.draftSha256 === d.sha256 }; })) : new Map<string, Gate>();
    const mapped = new Set(editions.filter((e) => e.maps.length).map((e) => e.sha256));
    const pending = new Map(items.map((i) => [i.runId, i._count]));
    // The date each official file was downloaded (its leading ISO part: a hand fetch adds a note after it).
    const official = new Map((manifest() as { sha256: string; downloaded_utc?: string }[]).map((m) => [m.sha256, String(m.downloaded_utc ?? "").split(" ")[0]]));
    const byKey = new Map(nodes.map((n) => [n.programNodeKey, n]));
    const openNodes = await openNodeKeys(this.db, workspaceId); // S3 M3: names with an open change
    const chainOf = (key: string) => { const out: ProgramDef[] = []; for (let n = byKey.get(key); n; n = n.parentNodeKey ? byKey.get(n.parentNodeKey) : undefined) out.unshift(n); return out; };
    const now = new Date();
    const rows: Row[] = [];
    for (const n of nodes) {
      if ((n.nodeKind !== "STREAM" && n.nodeKind !== "CATEGORY") || nodes.some((x) => x.parentNodeKey === n.programNodeKey)) continue;
      const chain = chainOf(n.programNodeKey);
      const pw = chain.find((x) => x.nodeKind === "PATHWAY");
      const pathway = (pw?.clientType ?? "INDIVIDUAL") as PathwayType;
      const path = chain.filter((x) => x.nodeKind !== "PATHWAY").map((x) => x.label);
      const c = combos.find((x) => x.programDefId === n.id);
      const programKey = chain.find((x) => x.nodeKind === "PROGRAM")?.programNodeKey ?? "";
      const newToday = now.getTime() - n.createdAt.getTime() < 864e5 && n.createdAt.getTime() > loadedAt;
      const pathKeys = chain.filter((x) => x.nodeKind !== "PATHWAY").map((x) => x.programNodeKey as string);
      // BR-7: five parts, never blank; a combination or a name above it that a release retired is retired (P-116).
      const trail = [PATHWAY_TYPE_LABEL[pathway], pw?.label ?? "", ...path, ...(n.nodeKind === "STREAM" ? ["No sub-category"] : [])];
      const retired = !!c?.retiredAt || chain.some((x) => x.retiredAt);
      const base = { kind: "combination" as const, nodeKey: n.programNodeKey, label: n.label, level: (n.nodeKind === "STREAM" ? "Category" : "Sub-category") as CatalogueLeaf["level"], path, linkLabel: n.linkLabel, matches: [] as string[], programKey, pathKeys,
        pathwayType: pathway, pathwayKey: pw?.programNodeKey ?? "", pathwayLabel: pw?.label ?? "", trail, retired };
      const noteOf = (aiProposals: number, next: string | undefined, held: { edition: string }[] = []) => [n.linkLabel, aiProposals && next !== "review_proposals" ? `${aiProposals} AI proposal${aiProposals === 1 ? "" : "s"} to review` : null,
        held.length && next !== "see_new_edition" ? `New edition waiting: ${held.map((x) => x.edition).join(", ")}` : null, newToday ? "New today" : null].filter(Boolean).join(" · ");
      if (!c) {
        const nsSetup = setupChecklistOf(notStartedInput(retired), `${n.programNodeKey}|${key}`);
        rows.push({ pathway, changes: 0, errors: 0, firstError: null, holds: 0, firstHold: null, hasContent: false, searchText: path.join(" "), docNames: [],
          leaf: { ...base, combinationId: null, startWhy: startWhy(chain, openNodes), forms: [], filing: null, filed: "No forms yet", progress: progressOf(nsSetup), counts: null, status: "IN_SETUP", statusText: retired ? "Retired" : "Not started", missing: [{ code: "not_started", step: "Start setup", text: "Not started: no setup yet. Next step: Start setup." }], aiProposals: 0, aiRunning: null, release: null, checked: null, nextAction: nextActionOf({ exists: false, status: "IN_SETUP", forms: 0, sources: 0, draftable: 0, fromLibrary: [], running: null, proposals: [], changes: 0, missing: [] }), needs: !retired, needsYou: false, live: false, held: [], note: noteOf(0, "start") },
          setup: nsSetup });
        continue;
      }
      const { snapshot, sha256 } = snaps.get(c.id)! as { snapshot: Snapshot; sha256: string };
      const rel = latest.get(c.id);
      const participants = c.participants as ParticipantLine[];
      const structure = await this.studio.structureProblems(c.id);
      // C11.12: a released snapshot is never re-judged for filing modes (pinned releases are kept, BR-7); the draft is.
      const baseProblems = [...structure, ...filingProblems((snapshot.combination?.participants ?? []) as { role: string; label?: string; max: number; filingMode?: unknown }[], personRoles), ...validate(snapshot, library, derivedOf(snapshot), accepts)];
      // Status is about what firms can use: the released snapshot when there is one; the draft only explains In setup.
      const relSnap = rel?.snapshot as unknown as Snapshot | undefined;
      const hasContent = snapshot.forms.length + snapshot.sections.length + snapshot.document_requirements.length + snapshot.rules.length > 0;
      const changes = hasContent ? diff(relSnap ?? null, snapshot).length : 0;
      // G1 BR-7 (challenge M1): numbers without a source hold the draft back, never relProblems (a release keeps its
      // status); and only a draft that will be submitted (changes, or no release yet), so a Live row with no draft
      // changes never reads "Fix n problems" (tech lead on #568, G2 challenge; engine/setup-checklist.ts).
      const draftProblems = [...baseProblems, ...(changes > 0 || !rel ? [...draftSourceProblems(snapshot, demo), ...(demo ? [] : sampleContentProblems(snapshot))] : [])]; // C5.5: Sample content holds a real release (studio.problems)
      const relProblems = relSnap ? [...structure, ...validate(relSnap, library, derivedOf(relSnap))] : draftProblems;
      // G2 (challenge M1): only a draft with something to release is judged, so a Live, unchanged row keeps step 5 done.
      // Added to the draft's problems (the Release page holds the row on them), never to the released snapshot's.
      if (changes > 0 || !rel) draftProblems.push(...(keyGates.get(c.id)?.problems ?? []));
      const mine = jobs.filter((x) => x.combinationId === c.id);
      const latestPerSource = new Map<string, (typeof mine)[number]>();
      for (const x of mine) if (x.attachmentId && !latestPerSource.has(x.attachmentId)) latestPerSource.set(x.attachmentId, x);
      const proposals = [...latestPerSource.values()].filter((x) => x.kind === "field_map" && x.status === "COMPLETED" && x.mode !== "STUB").map((x) => ({ job: x.id, n: pending.get(x.id) ?? 0 }));
      const running = mine.find((x) => (x.status === "QUEUED" || x.status === "RUNNING") && x.batchId)?.batchId ?? null;
      const snapForms = snapshot.forms as SnapForm[];
      // UX-A part 1 (contracts/counts.ts): a form removed in this draft is not an attached form waiting to be set up.
      const formCodes = new Set([...snapForms.map((f) => f.form_number), ...removedLines(lineRows.filter((x) => x.combinationId === c.id)).map((x) => x.lineageKey)]);
      const sourceForms = attachedNotSetUp(c.attachments, formCodes);
      const draftable = sourceForms.filter((x) => !mapped.has(x.sha256) && !["COMPLETED", "QUEUED", "RUNNING", "APPLIED"].includes(latestPerSource.get(x.id)?.status ?? "")).length;
      const fromLibrary = [...new Set(sourceForms.filter((x) => mapped.has(x.sha256)).map((x) => (x.edition ?? "").split(" (")[0]))];
      const forms = [...snapForms.map((f) => { const document = (f.form_kind ?? "data_form") !== "data_form"; return { code: f.form_number, document, channel: f.channel ?? "PDF_UPLOAD", drafted: document || (snapshot.field_maps as { form_number: string }[]).some((m) => m.form_number === f.form_number) }; }), ...sourceForms.map((x) => ({ code: (x.edition ?? x.officialFile ?? x.id).split(" (")[0], drafted: false, document: false, inLibrary: mapped.has(x.sha256) }))]
        .filter((f, i, all) => all.findIndex((y) => y.code === f.code) === i).sort((x, y) => x.code.localeCompare(y.code));
      // The missing list and the next step read the same setup state, so they name the same step (Lead check item 1).
      const setup = { exists: true, forms: forms.length, sources: new Set(sourceForms.map((x) => (x.edition ?? x.officialFile ?? x.id).split(" (")[0])).size, draftable, fromLibrary, running, proposals };
      const missing = missingItems(relSnap ?? snapshot, participants, relProblems, setup);
      const status: Status = statusOf(!!rel, missing);
      const checked = checkedOf(c.attachments.map((x) => { const d = new Date(official.get(x.sha256) || x.createdAt); return Number.isNaN(d.getTime()) ? x.createdAt : d; }), now);
      const docNames = (snapshot.document_requirements as { document_type: string }[]).map((d) => d.document_type);
      // V3 B1: a form with no field map is counted once, as "Map N forms" (forms.unmapped), not again as an error here.
      const errors = draftProblems.filter((x) => x.level === "error" && !waitsForMap(x));
      const aiProposals = proposals.reduce((s, x) => s + x.n, 0);
      // New editions held for impact review (P-32) of a form this row files or has as a source, or uploaded on this row.
      const codes = new Set(forms.map((f) => f.code));
      const held = heldItems.filter((x) => x.combinationId === c.id || (x.code && codes.has(x.code))).map((x) => ({ code: x.code ?? "", edition: x.editionLabel ?? x.code ?? "" }))
        .filter((x, i, all) => all.findIndex((y) => y.edition === x.edition) === i);
      const nextAction = nextActionOf({ ...setup, status, changes, missing, held: held.length });
      // W1 setup checklist (slice A): the same data, read once into one input (concept §8).
      const proposalsOf: Partial<Record<ProposalKind, number>> = {};
      for (const g of byKind) if (g.combinationId === c.id || (!g.combinationId && g.formEdition && (codes.has(g.formEdition) || codes.has(g.formEdition.split(" (")[0])))) proposalsOf[g.kind as ProposalKind] = (proposalsOf[g.kind as ProposalKind] ?? 0) + g._count;
      // UX-A part 1 (contracts/counts.ts): the one question count, the Questionnaires chips' per role and their sum.
      const qc = hasContent ? this.questionsOf(snapshot, sha256) : null;
      const counts = hasContent ? { ...rowCounts(snapshot, participants), questions: qc!.total, questionsByRole: qc!.roles } : null;
      const roles = participants.filter((p) => p.max > 0);
      const applicantRoles = roles.filter((p) => p.role !== "representative" && p.applies !== false);
      const docLines = snapshot.document_requirements as { who?: unknown }[];
      const covers = (d: { who?: unknown }, role: string) => !Array.isArray(d.who) || !d.who.length || d.who.includes(role);
      const unmapped = formsWithoutFieldMap(snapshot).length; // QA-180: the rule release and Open a case read
      const by = c.participantsBy;
      const input: SetupInput = {
        combinationId: c.id, retired,
        release: rel ? { number: rel.packVersion?.version ?? 1, problems: relSnap ? relProblems : [] } : null,
        pages: pages.get(c.id) ?? { state: "no_record" },
        // participantsConfirmedAs is not stored yet (P-176, Q1 open): a saved list counts as confirmed, at the tier of the
        // person who saved it (the expert's duty: expert; anyone else: author).
        people: { roles: roles.length, applicants: applicantRoles.length, saved: !!by, confirmed: by ? { by, as: (ACTORS.find((a) => a.id === by)?.duties as readonly string[] | undefined)?.includes("sme") ? "expert" : "author" } : null, tier: "expert", reason: "Not confirmed yet" },
        // UX-A part 1 (review m4): the forms on it are the card's own list (`forms`, each form once by code).
        forms: { lines: snapForms.length, fromLibrary: fromLibrary.length, draftable, unmapped, sources: setup.sources, onCombination: forms.length },
        proposals: proposalsOf, problems: draftProblems,
        documents: { lines: docLines.length, rolesWithout: docLines.length ? applicantRoles.filter((r) => !docLines.some((d) => covers(d, r.role))).length : 0 },
        questions: qc?.total ?? 0,
        held: held.length, notStartable: status === "NOT_READY", notStartableWhy: status === "NOT_READY" ? missing.map((m) => ({ code: m.code, text: m.text })) : undefined,
        running: running ? { batchId: running, step: "forms" as StepKey } : null,
        changes,
        review: { stage: reviewStage(gates.get(c.id)), submittedBy: submittedBy.get(c.id) ?? null, authors: [] },
      };
      const checklist = setupChecklistOf(input, `${c.id}|${key}`);
      // G1 §4: a row held back only by numbers without a source says so with its count (the Release page's held reason);
      // otherwise its first own problem (G2: a test line names its key's label).
      const unsourced = errors.filter((x) => (x as { gate?: string }).gate === "no-source").length;
      const first = errors.find((x) => !(x as { gate?: string }).gate) ?? errors[0];
      const firstError = unsourced && unsourced === errors.length ? `${unsourced} number${unsourced === 1 ? " has" : "s have"} no source entry: fix on Review and release.` : first ? `${first.where === "Tests" ? (first as { label?: string }).label || first.item : first.item}: ${first.message}` : null;
      // Opus review M1 (V3 B1): the Release page holds a row on every draft error and names it. When only forms with no
      // field map hold it, the reason names them all (they are left out of `errors`, which counts work for the checklist).
      // G5 (C5.1, P-248): a draft with no form line is held on the Release page in its own words, first (its next step is
      // to add a form, before any other fix); Submit and Approve refuse it through studio.problems.
      const noFormLine = formLineProblem(snapshot);
      const holding = [...noFormLine, ...draftProblems.filter((x) => x.level === "error")];
      const unmappedHolds = holding.filter((x) => waitsForMap(x)).map((x) => x.item);
      const firstHold = noFormLine.length ? noFormLine[0].message : errors.length ? firstError : unmappedHolds.length ? `No form fields mapped yet for ${unmappedHolds.join(", ")}: map ${unmappedHolds.length === 1 ? "its" : "their"} form fields (Draft setup), or remove ${unmappedHolds.length === 1 ? "it" : "them"} from this combination.` : null;
      // UX-A part 2: what blocks the release, with "nothing to release yet" when the draft is empty (To review reads it).
      const empty = emptyProblem(snapshot), blocking = [...errors, ...empty, ...noFormLine];
      const said = (p: { item: string; message: string }) => `${p.item ? `${p.item}: ` : ""}${p.message.split(":")[0]}`;
      rows.push({ pathway, changes, errors: errors.length, firstError, holds: holding.length, firstHold, hasContent, docNames, blockers: { n: blocking.length, first: blocking[0] ? said(blocking[0]) : null, empty: empty.length > 0 },
        setup: checklist,
        searchText: [...path, ...forms.map((f) => f.code), ...docNames].join(" "),
        leaf: { ...base, combinationId: c.id, forms, filing: snapForms.length ? filingKind(snapForms) : null, filed: filedOf(snapForms), progress: progressOf(checklist), counts, status, statusText: retired ? "Retired" : status === "READY" ? `Live · Release ${rel!.packVersion?.version ?? 1}` : STATUS_TEXT[status],
          missing, aiProposals, aiRunning: running, release: rel ? { pack: rel.packVersion?.version ?? 1, at: rel.releasedAt.toISOString() } : null, checked,
          nextAction, needs: !retired && needsWork({ status, nextAction }), needsYou: !retired && waitsForPerson({ status, nextAction, aiProposals, held: held.length }), live: !retired && isLive({ status }), held, note: noteOf(aiProposals, nextAction?.kind, held) } });
    }
    this.cache = { key, rows, nodes, at: Math.round(performance.now() - t0) };
    return this.cache;
  }

  /** UX-A part 2 (P-273; UX baseline finding 2): each started, not retired combination's setup checklist, from the same
   *  cached rows as the Programs page, for To review's "Needs you" (release blockers and each combination's next step). */
  async setupStates() {
    const { rows } = await this.rows();
    return rows.filter((r) => r.leaf.combinationId && !r.leaf.retired).map((r) => ({ combinationId: r.leaf.combinationId!, path: [r.leaf.pathwayLabel, ...r.leaf.path].filter(Boolean).join(" › "), setup: r.setup, live: r.leaf.live, blockers: r.blockers ?? { n: 0, first: null, empty: false } }));
  }

  /** Each last-level name's combination state, for the Structure outline (counts, Live, has setup, retired). */
  /** With a person, "needs" is that person's Needs you (forViewer), the same count path as the Programs page (concept §8). */
  async leafStates(actor?: Actor) {
    const { rows } = await this.rows();
    return new Map(rows.map((r) => [r.leaf.nodeKey, { combinationId: r.leaf.combinationId, live: r.leaf.live, needs: actor ? !r.leaf.retired && !!forViewer(r.setup, actor).needsYou : r.leaf.needsYou, retired: r.leaf.retired, status: r.leaf.status, statusText: r.leaf.statusText }]));
  }

  /** S4 (SA-1B-90): what keeps a combination's newest release from being startable, read from the release alone: its
   *  snapshot through `missingItems`, every rule against the live library (`validate`), and the row's place in the
   *  structure. The draft's undecided form fields (`structureProblems`' K1 lines) are left out on purpose: they are work
   *  in the next draft, which the release gate checks; they never stop cases on a release that has not changed (review
   *  M1 on ea7f28b2). Empty = startable. The lines are the catalogue's words, for authors. */
  async startableMissing(combinationId: string, release: { snapshot: unknown }) {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId }, select: { workspaceId: true, participants: true } });
    const lib = await this.db.canonicalField.findMany({ where: { workspaceId: c.workspaceId }, select: { canonicalFieldKey: true, valueType: true, status: true } });
    const library = lib.filter((f) => f.status !== "RETIRED").map((f) => ({ key: f.canonicalFieldKey, valueType: f.valueType }));
    const relSnap = release.snapshot as unknown as Snapshot;
    const rowLevel = (await this.studio.structureProblems(combinationId)).filter((p) => p.where === "Row");
    return missingItems(relSnap, c.participants as ParticipantLine[], [...rowLevel, ...validate(relSnap, library, derivedOf(relSnap))]);
  }

  /** GET /catalogue: one request for the whole tree of one pathway, filtered and searched on the server. */
  async catalogue(query: unknown, actor?: Actor): Promise<CatalogueResponse> {
    const t0 = performance.now();
    const q = parse(CatalogueQuery, query);
    const { rows, nodes, at } = await this.rows();
    // A program or path that is not in this pathway (an old link, a typed URL) is ignored, not shown as an empty
    // contradiction (break m5): the answer says which scope it used.
    const nodeOf = new Map(nodes.map((n) => [n.programNodeKey, n]));
    // QA-49: the Structure's order (display order, then added first; the Structure reads nodes the same way), walked
    // depth first, is the page's order everywhere: cards, List rows and sections. A reorder on the Structure shows here.
    const childrenOf = new Map<string, typeof nodes>();
    for (const n of nodes) { const k = n.parentNodeKey ?? ""; childrenOf.set(k, [...(childrenOf.get(k) ?? []), n]); }
    const place = new Map<string, number>();
    const visit = (n: (typeof nodes)[number]) => { place.set(n.programNodeKey, place.size); for (const c of childrenOf.get(n.programNodeKey) ?? []) visit(c); };
    for (const n of childrenOf.get("") ?? []) visit(n);
    const structureOrder = (x: CatalogueLeaf, y: CatalogueLeaf) => (place.get(x.nodeKey) ?? 0) - (place.get(y.nodeKey) ?? 0) || comparePaths(x, y);
    const inThisPathway = (k: string) => { let n = nodeOf.get(k); while (n?.parentNodeKey) n = nodeOf.get(n.parentNodeKey); return !!n && n.programNodeKey !== k && n.clientType === q.pathway; };
    if (q.program && !inThisPathway(q.program)) q.program = "";
    if (q.under && !inThisPathway(q.under)) q.under = "";
    const words = normalizeLabel(q.q);
    const hit = (r: Row) => {
      if (!words) return [];
      const out: string[] = [];
      if (normalizeLabel(r.leaf.path.join(" ")).includes(words)) out.push("name");
      for (const f of r.leaf.forms) if (normalizeLabel(f.code).includes(words)) out.push(f.code);
      for (const d of r.docNames) if (normalizeLabel(d).includes(words)) out.push(`Document: ${d}`);
      return [...new Set(out)];
    };
    // Retired combinations (P-116) are left out of every view but "Retired" (addendum A2).
    const everyInPathway = rows.filter((r) => r.pathway === q.pathway);
    const inPathway = everyInPathway.filter((r) => q.filter === "retired" ? r.leaf.retired : !r.leaf.retired);
    const pwKey = nodes.some((n) => n.nodeKind === "PATHWAY" && n.clientType === q.pathway && !n.retiredAt && n.programNodeKey === q.pathwayKey) ? q.pathwayKey : "";
    const inProgram = inPathway.filter((r) => (!pwKey || r.leaf.pathwayKey === pwKey) && (!q.program || r.leaf.programKey === q.program) && (!q.under || r.leaf.pathKeys.includes(q.under)));
    const searched = inProgram.map((r) => ({ r, m: hit(r) })).filter((x) => !words || x.m.length);
    // With a person, "needs" (the filter and its count) is that person's Needs you, the card's rule (break-report m2).
    const needsYou = actor ? new Map(everyInPathway.map((r) => [r.leaf.nodeKey, !r.leaf.retired && !!forViewer(r.setup, actor).needsYou])) : null;
    const needsMe = (r: Row) => needsYou ? !!needsYou.get(r.leaf.nodeKey) : r.leaf.needsYou;
    const needsOf = (r: Row) => actor ? needsMe(r) : r.leaf.needs;
    // "Needs work" with nothing to do falls back to All, and says so (P-35, P-49).
    const fellBack = q.filter === "needs" && !searched.some((x) => needsOf(x.r));
    const filter = fellBack ? "all" : q.filter;
    // P-180: the status chips read the setup checklist's chip (Not ready folds into In progress); "Needs you" is the
    // viewer's own (an item on their duty and tier waits), so every count of it on the page is this person's.
    const chipOf = (r: Row) => r.setup.chip.status;
    const live = (r: Row) => chipOf(r) === "LIVE", inProgress = (r: Row) => chipOf(r) === "IN_PROGRESS" || chipOf(r) === "NOT_READY", notStarted = (r: Row) => chipOf(r) === "NOT_STARTED";
    const pass = (r: Row) => filter === "all" || filter === "retired" || (filter === "needs" ? needsOf(r) : filter === "live" ? live(r) : filter === "in_progress" ? inProgress(r) : filter === "ai_proposals" ? r.leaf.aiProposals > 0 : filter === "not_started" ? notStarted(r) : filter === "in_setup" ? r.leaf.status === "IN_SETUP" && !!r.leaf.combinationId : r.leaf.status === filter.toUpperCase());
    const chipAt = new Map(searched.map((x) => [x.r.leaf.nodeKey, chipOf(x.r)]));
    const shown = new Map(searched.filter((x) => pass(x.r)).map((x) => [x.r.leaf.nodeKey, { ...x.r.leaf, needsYou: needsMe(x.r), matches: x.m, ...(actor ? { setup: cardSetup(x.r.setup, actor) } : {}) }]));
    const on = (list: Row[]) => list.filter((r) => !r.leaf.retired);
    const count = (list: Row[]) => ({ needs: list.filter(needsOf).length, live: on(list).filter(live).length, all: on(list).length, ready: on(list).filter((r) => r.leaf.status === "READY").length, not_ready: on(list).filter((r) => r.leaf.status === "NOT_READY").length, in_setup: on(list).filter((r) => r.leaf.status === "IN_SETUP" && !!r.leaf.combinationId).length, in_progress: on(list).filter(inProgress).length, not_started: on(list).filter(notStarted).length, ai_proposals: list.filter((r) => r.leaf.aiProposals > 0).length, retired: list.filter((r) => r.leaf.retired).length });
    // W1-03 B1: every Pathway of the type, in Structure order (several per type).
    const pws = nodes.filter((n) => n.nodeKind === "PATHWAY" && n.clientType === q.pathway);
    const kids = (k: string) => nodes.filter((n) => n.parentNodeKey === k);
    const summarise = (leaves: CatalogueLeaf[]) => ({ IN_SETUP: leaves.filter((l) => l.status === "IN_SETUP").length, NOT_READY: leaves.filter((l) => l.status === "NOT_READY").length, READY: leaves.filter((l) => l.status === "READY").length, ai_proposals: leaves.filter((l) => l.aiProposals > 0).length, combinations: leaves.length });
    const allLeaves = new Map(inPathway.map((r) => [r.leaf.nodeKey, r.leaf]));
    const everyLeaf = new Set(everyInPathway.map((r) => r.leaf.nodeKey));
    const leavesUnder = (k: string): CatalogueLeaf[] => kids(k).flatMap((n) => allLeaves.get(n.programNodeKey) ? [allLeaves.get(n.programNodeKey)!] : leavesUnder(n.programNodeKey));
    const build = (n: ProgramDef): CatalogueNode | null => {
      const leaf = shown.get(n.programNodeKey);
      if (leaf) return leaf;
      if (allLeaves.has(n.programNodeKey) || everyLeaf.has(n.programNodeKey)) return null; // a leaf filtered out (or retired)
      const children = kids(n.programNodeKey).map(build).filter(Boolean) as CatalogueNode[];
      const filtering = filter !== "all" || !!words || !!q.program || !!q.under || !!pwKey;
      if (filtering && !children.length) return null;
      // A retired name with nothing shown under it is left out (it holds only retired combinations).
      if (n.retiredAt && !children.length) return null;
      return { kind: n.nodeKind === "PROGRAM" ? "program" : "category", nodeKey: n.programNodeKey, label: n.label, linkLabel: n.linkLabel, children, summary: summarise(leavesUnder(n.programNodeKey)) } satisfies CatalogueGroup;
    };
    const sections = pws.map((p) => {
      const t = kids(p.programNodeKey).map(build).filter(Boolean) as CatalogueGroup[];
      const mine = inPathway.filter((r) => r.leaf.pathwayKey === p.programNodeKey);
      return { pathwayKey: p.programNodeKey, label: p.label, combinations: mine.length, needs: mine.filter(needsMe).length, live: mine.filter(live).length, tree: t };
    });
    const tree = sections.flatMap((s) => s.tree);
    const other = q.pathway === "INDIVIDUAL" ? "CORPORATE" : "INDIVIDUAL";
    const progs = pws.flatMap((p) => kids(p.programNodeKey));
    const totals = { programs: progs.length, categories: progs.flatMap((p) => kids(p.programNodeKey)).length, combinations: inPathway.length };
    const programs = progs.map((p) => ({ key: p.programNodeKey as string, label: p.label as string, combinations: inPathway.filter((r) => r.leaf.programKey === p.programNodeKey).length, live: inPathway.filter((r) => r.leaf.programKey === p.programNodeKey && live(r)).length }))
      .sort((a, b) => a.label.localeCompare(b.label, "en-CA", { sensitivity: "base" }));
    return {
      pathway: q.pathway, filter, requestedFilter: q.filter, fellBack, q: q.q, program: q.program, under: q.under, sort: q.sort, pathwayKey: pwKey,
      underPath: q.under ? underPath(nodes, q.under) : null,
      /** Layout v2: one flat list in Program › Category › Sub-category order (route steps in step order), or by status. */
      // Card v4 (P-180): the Progress sort follows the chip the column shows (most urgent first: Not ready, In progress,
      // Not started, Live, Retired). The old status had no rank for a Not started row (NaN), so the sort fell back to
      // path order and ascending and descending were the same.
      rows: [...shown.values()].sort((x, y) => (q.sort === "path" ? 0 : (q.sort === "status" ? 1 : -1) * ((CHIP_RANK[chipAt.get(x.nodeKey)!] ?? 0) - (CHIP_RANK[chipAt.get(y.nodeKey)!] ?? 0))) || structureOrder(x, y)), programs,
      pathways: [["INDIVIDUAL", "Retail"], ["CORPORATE", "Corporate and employers"]].map(([v, l]) => ({ value: v, label: l, combinations: rows.filter((r) => r.pathway === v && !r.leaf.retired).length })),
      counts: { ...count(searched.map((x) => x.r)), retired: everyInPathway.filter((r) => r.leaf.retired).length }, totals, tree, sections,
      otherPathwayMatches: words ? rows.filter((r) => r.pathway === other && !r.leaf.retired && hit(r).length).length : 0,
      timing_ms: { rows: at, total: Math.round(performance.now() - t0) },
    };
  }

  /** The shared draft (P-23): every combination whose draft differs from its released snapshot, with what blocks it: a
   *  problem in the draft, a review step not done yet (submitted, unchanged since, expert changes signed; QA-1), or, for
   *  the person about to release, that they changed or submitted it themselves (BR-14, break M2), so the page never
   *  says "Will be released" for a row the server will refuse. `summary` (the draft bar on every page) skips the checks. */
  async draft(actor?: Actor | null, summary = false) {
    const workspaceId = await this.ws.id();
    const { rows } = await this.rows();
    const last = await this.db.packVersion.findFirst({ where: { workspaceId }, orderBy: { version: "desc" } });
    const changed = rows.filter((r) => r.changes > 0);
    const why = new Map<string, { why: string | null; self?: boolean }>();
    if (!summary && changed.length) {
      const snaps = await buildSnapshots(this.db, workspaceId, changed.map((r) => r.leaf.combinationId!), "draft");
      const gates = await this.studio.releaseGates(changed.map((r) => ({ combinationId: r.leaf.combinationId!, sha256: (snaps.get(r.leaf.combinationId!) as { sha256: string }).sha256 })));
      for (const r of changed) {
        const id = r.leaf.combinationId!;
        if (r.holds) { why.set(id, { why: r.firstHold }); continue; }
        const gate = gates.get(id)!;
        if (!gate.ok) { why.set(id, { why: gate.why }); continue; }
        const waiting = await unapprovedAdds(this.db, workspaceId, itemsOf((snaps.get(id) as { snapshot: Snapshot }).snapshot));
        if (waiting.length) { why.set(id, { why: `${unapprovedWhy(waiting).replace(/^it/, "It")}.` }); continue; }
        if (actor && (actor.duties as readonly string[]).includes("approve")) {
          if (gate.sub.submittedBy === actor.id) { why.set(id, { why: "You submitted it, so a different person releases it (BR-14).", self: true }); continue; }
          const { snapshot } = snaps.get(id) as { snapshot: Snapshot };
          if ((await this.studio.draftAuthors(id, snapshot, workspaceId)).includes(actor.id)) { why.set(id, { why: "You changed it, so a different person releases it (BR-14).", self: true }); continue; }
        }
        why.set(id, { why: null });
      }
    } else for (const r of changed) why.set(r.leaf.combinationId!, { why: r.holds ? r.firstHold : null });
    // Approved library changes travel with the shared draft and are released with it (Screen 02 slice 2, B1).
    // C11.13 (P-120): the Release page also lists the changes still waiting for a second person (never released, never
    // counted), and each near duplicate says what it is close to and why it is not the same. The draft bar (summary)
    // reads only the approved ones.
    const lib = await this.db.libraryChange.findMany({ where: { workspaceId, status: { in: summary ? ["APPROVED"] : ["APPROVED", "WAITING"] }, action: { in: ["ADD", "RETIRE", "RESTORE"] } }, orderBy: { proposedAt: "asc" } });
    const near = summary ? new Map() : await nearOf(this.db, workspaceId, lib);
    const library = lib.map((c) => ({ ...changeView(c), will_release: c.status === "APPROVED", near: near.get(c.id) ?? null }));
    const releasing = library.filter((l) => l.will_release);
    // C5.6 (P-240, G3): Sample content releases as a "Demo release".
    const changedIds = changed.map((r) => r.leaf.combinationId!).filter(Boolean);
    // Not released yet, so no snapshot: a Sample combination, or any current check marked Sample (illustrative). C5.5
    // BR-3: only in the demo workspace; anywhere else every release is real (and Sample content holds it).
    const demoIds = new Set(!isDemoWorkspace() ? [] : [...(await this.db.combination.findMany({ where: { id: { in: changedIds }, sourceBasis: "ILLUSTRATIVE" }, select: { id: true } })).map((c) => c.id),
      ...(await this.db.check.findMany({ where: { combinationId: { in: changedIds }, illustrative: true, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { combinationId: true } })).map((c) => c.combinationId),
      // G1 (tech lead on #558): a number answered by a Sample source entry makes its release a Demo release.
      ...await this.sampleSourced(workspaceId, changedIds)]);
    return {
      changes: changed.reduce((s, r) => s + r.changes, 0) + releasing.length,
      library, waiting_library: library.length - releasing.length,
      rows: changed.map((r) => { const w = why.get(r.leaf.combinationId!)!; return { combinationId: r.leaf.combinationId, label: r.leaf.label, path: r.leaf.path, changes: r.changes, held: !!w.why, why: w.why, self: !!w.self, released: !!r.leaf.release, demo: demoIds.has(r.leaf.combinationId!) }; }),
      last: last ? { version: last.version, at: last.releasedAt, approver: last.approverId } : null,
      next: (last?.version ?? 0) + 1,
    };
  }

  /** G1: the combinations among `ids` with a Sample source entry (its key carries the combination). One query each. */
  private async sampleSourced(workspaceId: string, ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const [combos, keys] = await Promise.all([this.db.combination.findMany({ where: { id: { in: ids } }, select: { id: true, combinationKey: true } }), this.db.sourceEntry.findMany({ where: { workspaceId, sample: true }, select: { itemKey: true } })]);
    return combos.filter((c) => keys.some((k) => k.itemKey.startsWith(`${c.combinationKey}/`))).map((c) => c.id);
  }

  /** POST /pack/release: one release for the whole shared draft. Rows that are held back (a problem, review not done,
   *  or changed or submitted by the person releasing: BR-14) stay at their last release and are listed; the rest get a
   *  frozen snapshot in the new version. Nothing releasable only because of the releaser's own work is a 403. */
  async release(actor: Actor, body: unknown) {
    need(actor, "approve");
    const b = parse(ReleaseBody, body);
    const d = await this.draft(actor);
    if (!d.changes) throw problem(409, "Nothing to release", "The shared draft has no changes since the last release.");
    if (b.expectedChanges !== d.changes) throw problem(409, "The draft changed", `The draft now has ${d.changes} changes, not ${b.expectedChanges}. Review the list again, then release.`);
    const include = d.rows.filter((r) => !r.held);
    const releasing = d.library.filter((l) => l.will_release);
    if (!include.length && !releasing.length) {
      const mine = d.rows.filter((r) => r.self).map((r) => r.label);
      if (mine.length) {
        await this.audit.log(await this.ws.id(), actor.id, "refused", "release", null, `Release refused: ${actor.name} changed or submitted ${mine.join(", ")}`);
        throw problem(403, "A different person must release", `You changed or submitted ${mine.slice(0, 3).join(", ")}${mine.length > 3 ? ` and ${mine.length - 3} more` : ""}, so a different person releases ${mine.length === 1 ? "it" : "them"} (BR-14).`);
      }
      const shown = d.rows.slice(0, 5).map((r) => `${r.label}: ${r.why}`).join(" · ");
      // G2 (breaker M1; BR-8, shared with G1): the refusal lists every blocking item of every held row in errors[] (a
      // row held by its review step or by who releases says that, once).
      // Devin on #568: each held row's problems come from the same check Submit and Approve use (studio.problems), read
      // only on this refusal path; a row held by its review step or by who releases says that reason too.
      const workspaceId = await this.ws.id();
      const errors: Record<string, unknown>[] = [];
      for (const r of d.rows) {
        const { snapshot } = await buildSnapshot(this.db, workspaceId, r.combinationId!, "draft");
        const own = (await this.studio.problems(workspaceId, snapshot, r.combinationId!)).filter((p) => p.level === "error");
        for (const p of own) errors.push({ combination: r.label, where: p.where, item: p.item, label: (p as { label?: string }).label ?? null, forms: (p as { forms?: string[] }).forms ?? [], message: problemWords(p), ...((p as { gate?: string }).gate ? { gate: (p as { gate?: string }).gate } : {}) }); // C5.5 (breaker F6): the gate stays named
        if (!own.length || !r.why || !own.some((p) => r.why!.includes(p.message))) errors.push({ combination: r.label, where: "Review", item: r.label, label: r.label, forms: [], message: `${r.label}: ${r.why}` });
      }
      throw problem(409, "Every change is held back", `Nothing can be released yet. ${shown}${d.rows.length > 5 ? ` · and ${d.rows.length - 5} more (see Review and release)` : ""}`, { errors });
    }
    const out = await this.studio.releaseRows(actor, include.map((r) => r.combinationId!), releasing.map((l) => l.id));
    this.cache = null;
    return { ...out, held: d.rows.filter((r) => r.held).map((r) => ({ label: r.label, why: r.why })) };
  }

  /** POST /program-nodes: a program, category or sub-category, chosen under its parent (BR-2, BR-6). */
  async createNode(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(CreateNodeBody, body);
    const workspaceId = await this.ws.id();
    const parent = await this.db.programDef.findFirst({ where: { workspaceId, programNodeKey: b.parentKey }, include: { combination: { include: { _count: { select: { forms: true, attachments: true, requirements: true } } } } } });
    if (!parent) throw problem(404, "Not found", "That parent does not exist (it may have been removed by a reset).", { errors: [{ field: "parentKey", message: "Choose an existing parent." }] });
    const want = { PROGRAM: "PATHWAY", STREAM: "PROGRAM", CATEGORY: "STREAM" }[b.kind];
    if (parent.nodeKind !== want) throw problem(400, "Wrong level", `A ${LEVEL_NAME[b.kind].toLowerCase()} goes under a ${LEVEL_NAME[want].toLowerCase()}, not under a ${LEVEL_NAME[parent.nodeKind].toLowerCase()}.`, { errors: [{ field: "parentKey", message: `Choose a ${LEVEL_NAME[want].toLowerCase()}.` }] });
    // P-26: adding the first sub-category under a category that already has its setup is refused, not split.
    if (b.kind === "CATEGORY" && parent.combination) throw problem(409, "Category already set up", `"${parent.label}" already has its own setup, so it is the combination. Adding a sub-category would leave that setup above a combination (BR-3, BR-4). Sub-categories can only be added to a category that has no setup of its own.`, { errors: [{ field: "parentKey", message: `"${parent.label}" already has setup.` }] });
    const siblings = await this.db.programDef.findMany({ where: { workspaceId, parentNodeKey: parent.programNodeKey } });
    const twin = siblings.find((s) => normalizeLabel(s.label) === normalizeLabel(b.label));
    if (twin) throw problem(409, "Name already used", `"${twin.label}" already exists under ${parent.label}. Choose it instead, or give the new one a different name.`, { errors: [{ field: "label", message: `"${twin.label}" already exists here (names are compared ignoring case, spaces and punctuation).` }], existing: { key: twin.programNodeKey, label: twin.label } });
    return this.studio.createNode(actor, { kind: b.kind, label: b.label, parentKey: parent.programNodeKey, allowedLocations: parent.allowedLocations.length ? parent.allowedLocations : ["inside_canada", "outside_canada"] });
  }

  /** POST /combinations: the one combination of a last-level node; asking again returns the existing one (idempotent). */
  async createCombination(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(CreateCombinationBody, body);
    const workspaceId = await this.ws.id();
    const node = await this.db.programDef.findFirst({ where: { workspaceId, programNodeKey: b.nodeKey }, include: { combination: true } });
    if (!node) throw problem(404, "Not found", "That category or sub-category does not exist.", { errors: [{ field: "nodeKey", message: "Choose an existing category or sub-category." }] });
    if (node.combination) return { created: false, combination: node.combination };
    // S3 M3: never under a retired name or a waiting change (the one guard's reason, the same words as the greyed button).
    const chain: ProgramDef[] = []; for (let x: ProgramDef | null = node; x; x = x.parentNodeKey ? await this.db.programDef.findFirst({ where: { workspaceId, programNodeKey: x.parentNodeKey } }) : null) chain.unshift(x);
    const why = startWhy(chain, await openNodeKeys(this.db, workspaceId));
    if (why) throw problem(409, "Can't start setup", why);
    if (node.nodeKind !== "STREAM" && node.nodeKind !== "CATEGORY") throw problem(400, "Wrong level", `A combination is a category or a sub-category, not a ${LEVEL_NAME[node.nodeKind].toLowerCase()} (BR-3).`, { errors: [{ field: "nodeKey", message: "Choose a category or sub-category." }] });
    if (await this.db.programDef.count({ where: { workspaceId, parentNodeKey: node.programNodeKey } })) throw problem(400, "Has sub-categories", `"${node.label}" has sub-categories: choose one of them. Each is its own combination (BR-3).`, { errors: [{ field: "nodeKey", message: "Choose a sub-category." }] });
    if (b.allowedLocations) await this.db.programDef.update({ where: { id: node.id }, data: { allowedLocations: b.allowedLocations } });
    try {
      const c = await this.studio.createCombination(actor, { programKey: node.programNodeKey, label: node.label, participants: b.participants ?? DEFAULT_PARTICIPANTS.map((p) => ({ ...p })) });
      return { created: true, combination: c };
    } catch (e) {
      const existing = await this.db.combination.findUnique({ where: { programDefId: node.id } });
      if (existing) return { created: false, combination: existing }; // a second click raced the first one
      throw e;
    }
  }

  /** POST /combinations/:id/lines {kind: FORM}: "+ Add" picks a form already in the library (BR-12, P-25). A form whose
   *  edition has its field map becomes a form line, filed as a PDF upload by default (F1); one without a field map is
   *  attached as a source for AI to draft. A removed form can be added again. */
  async addLine(actor: Actor, combinationId: string, body: unknown) {
    need(actor, "author");
    const b = parse(AddLineBody, body);
    const c = await this.db.combination.findUnique({ where: { id: combinationId } });
    if (!c) throw problem(404, "Not found", "That combination does not exist.");
    const form = await this.db.govFormDef.findFirst({ where: { workspaceId: c.workspaceId, formKey: b.formKey }, include: { editions: { include: { _count: { select: { maps: true } } } } } });
    if (!form) throw problem(404, "Not in the library", `${b.formKey} is not in the library. Upload the IRCC PDF to add it.`, { errors: [{ field: "formKey", message: "Choose a form from the library." }] });
    // S4 round 3 R3-1 (P-116): a retired form, or one whose retire or delete is open, gets no new use (form line or source).
    if (form.retiredAt) throw problem(409, "Retired", `${form.formKey} is retired in the library: restore it there first.`, { errors: [{ field: "formKey", message: "Retired." }] });
    const closing = await closingChange(this.db, c.workspaceId, form.formKey);
    if (closing) throw problem(409, "Being retired", `A request to ${closing.action.toLowerCase()} ${form.formKey} is open on To review: nothing new may use it until it is decided.`, { errors: [{ field: "formKey", message: "Being retired." }] });
    // C11.11 (QA-101): only a filed form becomes a form line; a guide or checklist is attached as a source below.
    const current = libraryType(form.formKind, form.displayName) === "form" ? newestEdition(form.editions.filter((e) => e._count.maps > 0 && e.channel !== "ONLINE")) : undefined;
    if (current) {
      const before = await snapshotLines(this.db, combinationId, [form.formKey]);
      const r = await addFormLine(this.db, { workspaceId: c.workspaceId, combinationId, govFormDefId: form.id, formKey: form.formKey, origin: "HUMAN", by: actor.id, sourceQuote: `${current.editionLabel}: added from the library` });
      if (r === "added") await recordAction(this.db, { workspaceId: c.workspaceId, combinationId, action: "attach", codes: [form.formKey], before, by: actor.id }); // S4 round 4 R4-6: one Undo covers it
      if (r === "already") throw problem(409, "Already on this combination", `${form.formKey} is already one of this combination's forms.`, { errors: [{ field: "formKey", message: "Already added." }] });
      await this.audit.log(c.workspaceId, actor.id, "reused", "form", form.formKey, `${actor.name} added ${current.editionLabel} to "${c.label}" from the library`, undefined, combinationId);
      this.cache = null;
      return { added: "form_line", form: form.formKey, edition: current.editionLabel };
    }
    const latest = newestEdition(form.editions.filter((e) => e.channel !== "ONLINE"));
    if (!latest?.storedPath) throw problem(409, "No file for this form", `${form.formKey} has no stored file to attach. Upload the IRCC PDF.`);
    const r = await this.sources.attach(actor, combinationId, { originalname: latest.officialFile ?? `${form.formKey}.pdf`, buffer: readFileSync(resolve(ROOT, latest.storedPath)) }, "MANUAL");
    this.cache = null;
    return { added: "source", form: form.formKey, edition: latest.editionLabel, message: r.message };
  }

  /** GET /path-options: what the path builder offers — the pathway's programs, their categories and sub-categories,
   *  each with how many combinations it holds and whether it already has its own setup — and every combination (both
   *  pathways) for the optional "Linked to". */
  async pathOptions(pathway: string) {
    const pw = pathway === "CORPORATE" ? "CORPORATE" : "INDIVIDUAL";
    const { rows, nodes } = await this.rows();
    // W1-03: every Pathway of the type; retired names are hidden from pickers (P-52 L2, P-116).
    const tops = nodes.filter((n) => n.nodeKind === "PATHWAY" && n.clientType === pw && !n.retiredAt);
    const kids = (k: string) => nodes.filter((n) => n.parentNodeKey === k && !n.retiredAt).sort((a, b) => a.label.localeCompare(b.label, "en-CA", { sensitivity: "base" }));
    const leafOf = new Map(rows.filter((r) => !r.leaf.retired).map((r) => [r.leaf.nodeKey, r.leaf]));
    const under = (k: string): number => (leafOf.has(k) ? 1 : 0) + kids(k).reduce((s, n) => s + under(n.programNodeKey), 0);
    const opt = (n: ProgramDef) => ({ key: n.programNodeKey, label: n.label, combinations: under(n.programNodeKey), hasSetup: !!leafOf.get(n.programNodeKey)?.combinationId, combinationId: leafOf.get(n.programNodeKey)?.combinationId ?? null });
    const programsOf = (top: ProgramDef) => kids(top.programNodeKey).map((p) => ({ ...opt(p), pathway: { key: top.programNodeKey, label: top.label }, categories: kids(p.programNodeKey).map((c) => ({ ...opt(c), subCategories: kids(c.programNodeKey).map(opt) })) }));
    return {
      pathway: pw,
      pathways: tops.map((t) => ({ key: t.programNodeKey, label: t.label, programs: programsOf(t) })),
      programs: tops.flatMap(programsOf),
      combinations: rows.map((r) => ({ nodeKey: r.leaf.nodeKey, pathway: r.pathway, path: r.leaf.path })).sort((a, b) => comparePaths({ path: a.path, linkLabel: null }, { path: b.path, linkLabel: null })),
    };
  }


  /** Files held by the form intake (P-51) that concern this combination: uploaded on it, or a new edition of one of its forms. */
  private async heldFor(workspaceId: string, combinationId: string, codes: Set<string>) {
    const rows = await this.db.intakeItem.findMany({ where: { workspaceId, status: "HELD" }, orderBy: { createdAt: "desc" } });
    return rows.filter((r) => r.combinationId === combinationId || (r.code && codes.has(r.code)))
      .map((r) => ({ id: r.id, file: r.fileName, code: r.code, edition: r.editionLabel, outcome: r.outcome, reason: r.reason, at: r.createdAt }));
  }

  /** GET /combinations/:id/summary: the combination page's header and Overview (P-50): its catalogue row (path with
   *  keys, status, missing list, next step) plus forms, sources and new editions held for impact review. */
  async summary(combinationId: string, actor?: Actor | null): Promise<CombinationSummary> {
    const c = await this.db.combination.findUnique({ where: { id: combinationId }, include: { program: true, attachments: { orderBy: { createdAt: "asc" } } } });
    if (!c) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    const { rows } = await this.rows();
    const row = rows.find((r) => r.leaf.combinationId === combinationId);
    // The draft's lines: the newest version of each lineage, unless that version removes it (CHECK M4: an older version
    // of a removed form, or a superseded one, is never shown as the current line).
    const forms = await this.db.combinationForm.findMany({ where: { combinationId, status: { not: "SUPERSEDED" } }, orderBy: { version: "desc" }, include: { form: { include: { editions: { include: { _count: { select: { maps: true } } } } } } } });
    const newest = new Map<string, (typeof forms)[number]>();
    for (const f of forms) if (!newest.has(f.lineageKey)) newest.set(f.lineageKey, f);
    const lines = [...newest.values()].filter((f) => f.status !== "RETIRED");
    // Channels (C1.6): each line's channel, the derived filing method, and the channel problems the validator raises at
    // release, from the same draft snapshot the review uses.
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, combinationId, "draft");
    const view = channelsView(snapshot);
    return {
      // W1 setup checklist (slice A): the full checklist, with this viewer's overlay when the request names one.
      setup: row ? ({ ...row.setup, ...(actor ? { viewer: forViewer(row.setup, actor) } : {}) } as SetupChecklist | ViewerChecklist) : null,
      row: row?.leaf ?? null, changes: row?.changes ?? 0, allowedLocations: c.program.allowedLocations, participants: c.participants,
      filing: filingKind(snapshot.forms as SnapForm[]), filingDetail: view.filing_method,
      channelProblems: channelProblems(snapshot, await acceptsOf(this.db, c.workspaceId)).filter((p) => p.where === "Forms"),
      forms: lines.sort((x, y) => x.lineageKey.localeCompare(y.lineageKey)).map((f) => {
        const e = newestEdition(f.form.editions.filter((x) => x._count.maps > 0 && x.channel !== "ONLINE"));
        return { code: f.form.formKey, title: f.form.displayName, document: f.form.formKind !== "data_form", who: f.who, when: f.attachMode === "COMBINATION_MANDATORY" ? "always" : f.conditionPlain ?? "only if", edition: e?.editionLabel ?? null, boxes: e?._count.maps ?? 0,
          channel: f.channel, channelWords: CHANNEL_WORDS[f.channel], signature: view.lines.find((l) => l.form === f.lineageKey)?.signature ?? null, signatureKind: f.signature };
      }),
      sources: c.attachments.map((x) => ({ id: x.id, kind: x.kind, name: x.edition ?? x.fileName, status: x.status, detail: x.statusDetail, at: x.createdAt })),
      held: await this.heldFor(c.workspaceId, combinationId, new Set((row?.leaf.forms ?? []).map((f) => f.code))),
    };
  }
}
