// Screen 01 (Programs): the combination catalogue, adding program nodes, creating a combination on a last-level node,
// attaching a library form to a row, the shared draft bar and one release for everything (P-23). Requests are parsed
// with the shared zod contract (contracts/programs.ts); every write checks the person's duty on the server.
// Row status and counts come from the same snapshots and validator the combination workspace uses (engine/programs.ts).
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { ProgramDef } from "@prisma/client";
import type { z } from "zod";
import { AddLineBody, CatalogueQuery, cleanLabel, CreateCombinationBody, CreateNodeBody, CreatePathBody, DEFAULT_PARTICIPANTS, LEVEL_NAME, normalizeLabel, problemFromZod, ReleaseBody,
  type CatalogueGroup, type CatalogueLeaf, type CatalogueNode, type CatalogueResponse, type CombinationSummary, type ParticipantLine, type Status } from "../../contracts/programs.ts";
import { manifest } from "../../engine/import.ts";
import { checkedOf, comparePaths, compareStatus, isLive, missingItems, needsWork, newestEdition, nextActionOf, rowCounts, statusOf, STATUS_TEXT } from "../../engine/programs.ts";
import { buildSnapshots, type Snapshot } from "../../engine/snapshot.ts";
import { diff, validate } from "../../engine/validate.ts";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Audit, Db, need, ROOT, Workspace, type Actor } from "./core.ts";
import { Sources } from "./sources.ts";
import { Studio } from "./studio.ts";

/** Parses a request body or query with its contract; a mismatch is a 400 Problem Details with field errors. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
}
export const PATHWAY_NODES = [["individual", "Individual", "INDIVIDUAL", "The applicant on the government form is a person."], ["corporate", "Corporate and employers", "CORPORATE", "The applicant on the government form is an employer or organisation."]] as const;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) => new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);

/** The derived definitions a snapshot carries, as the validator reads them. */
const derivedOf = (s: Snapshot) => (s.derived_fields as { id: string; calculation: string }[]).map((d) => ({ id: d.id, calculation: d.calculation }));
type SnapForm = { form_number: string; form_kind?: string | null };

type Row = {
  leaf: CatalogueLeaf; pathway: string; changes: number; errors: number; firstError: string | null; hasContent: boolean;
  searchText: string; docNames: string[];
};

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

  /** The two pathways are fixed values (BR-1, SA-1B-50), not content: they exist in every workspace, sample data or not,
   *  so the first program can be added to an empty workspace. */
  async ensurePathways(workspaceId: string) {
    for (const [key, label, clientType, description] of PATHWAY_NODES) {
      if (await this.db.programDef.findFirst({ where: { workspaceId, nodeKind: "PATHWAY", clientType } })) continue;
      await this.db.programDef.create({ data: { workspaceId, programNodeKey: key, nodeKind: "PATHWAY", label, clientType, description, sourceBasis: "SOURCE_BACKED", createdBy: "system" } }).catch((e) => { if (e?.code !== "P2002") throw e; });
    }
  }

  /** Every row's summary, recomputed only when the workspace changed: each write records an audit event and AI steps
   *  move job times, so the revision below changes with any edit (sample-data scale; stored summaries are the team's). */
  private async rows() {
    const workspaceId = await this.ws.id();
    await this.ensurePathways(workspaceId);
    const [a, j, p, h] = await Promise.all([
      this.db.auditEvent.aggregate({ where: { workspaceId }, _count: true, _max: { at: true } }),
      this.db.draftingJob.aggregate({ where: { workspaceId }, _count: true, _max: { startedAt: true, finishedAt: true } }),
      this.db.normalizationItem.groupBy({ by: ["decision"], where: { workspaceId }, _count: true }),
      this.db.intakeItem.groupBy({ by: ["status"], where: { workspaceId }, _count: true }),
    ]);
    const key = JSON.stringify([workspaceId, a._count, a._max.at, j._count, j._max.startedAt, j._max.finishedAt, p, h]);
    if (this.cache?.key === key) return this.cache;
    const t0 = performance.now();
    const [nodes, combos, releases, jobs, items, lib, editions, heldItems] = await Promise.all([
      this.db.programDef.findMany({ where: { workspaceId }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] }),
      this.db.combination.findMany({ where: { workspaceId }, include: { attachments: { select: { id: true, kind: true, recognised: true, sha256: true, edition: true, createdAt: true, officialFile: true } } } }),
      this.db.configRelease.findMany({ where: { workspaceId }, orderBy: { version: "desc" }, select: { combinationId: true, snapshot: true, releasedAt: true, packVersion: { select: { version: true } } } }),
      this.db.draftingJob.findMany({ where: { workspaceId, kind: { in: ["field_map", "reuse_map"] } }, orderBy: { startedAt: "desc" }, select: { id: true, combinationId: true, attachmentId: true, status: true, batchId: true, kind: true, mode: true } }),
      this.db.normalizationItem.groupBy({ by: ["jobId"], where: { workspaceId, decision: "PENDING" }, _count: true }),
      this.db.canonicalField.findMany({ where: { workspaceId }, select: { canonicalFieldKey: true, valueType: true, status: true } }),
      this.db.formEdition.findMany({ where: { workspaceId }, select: { sha256: true, maps: { select: { id: true }, take: 1 } } }),
      this.db.intakeItem.findMany({ where: { workspaceId, status: "HELD", outcome: "new_edition_held" }, select: { code: true, editionLabel: true, combinationId: true } }),
    ]);
    // "New today": made by a person in the last day, after the sample load (the loader's own nodes are not new).
    const loadedAt = (await this.db.auditEvent.findFirst({ where: { workspaceId, action: "loaded" }, orderBy: { at: "desc" }, select: { at: true } }))?.at.getTime() ?? 0;
    const snaps = combos.length ? await buildSnapshots(this.db, workspaceId, combos.map((c) => c.id), "draft") : new Map();
    const library = lib.filter((f) => f.status !== "RETIRED").map((f) => ({ key: f.canonicalFieldKey, valueType: f.valueType }));
    const latest = new Map<string, (typeof releases)[number]>();
    for (const r of releases) if (!latest.has(r.combinationId)) latest.set(r.combinationId, r);
    const mapped = new Set(editions.filter((e) => e.maps.length).map((e) => e.sha256));
    const pending = new Map(items.map((i) => [i.jobId, i._count]));
    // The date each official file was downloaded (its leading ISO part: a hand fetch adds a note after it).
    const official = new Map((manifest() as { sha256: string; downloaded_utc?: string }[]).map((m) => [m.sha256, String(m.downloaded_utc ?? "").split(" ")[0]]));
    const byKey = new Map(nodes.map((n) => [n.programNodeKey, n]));
    const chainOf = (key: string) => { const out: ProgramDef[] = []; for (let n = byKey.get(key); n; n = n.parentNodeKey ? byKey.get(n.parentNodeKey) : undefined) out.unshift(n); return out; };
    const now = new Date();
    const rows: Row[] = [];
    for (const n of nodes) {
      if ((n.nodeKind !== "STREAM" && n.nodeKind !== "CATEGORY") || nodes.some((x) => x.parentNodeKey === n.programNodeKey)) continue;
      const chain = chainOf(n.programNodeKey);
      const pathway = chain.find((x) => x.nodeKind === "PATHWAY")?.clientType ?? "INDIVIDUAL";
      const path = chain.filter((x) => x.nodeKind !== "PATHWAY").map((x) => x.label);
      const c = combos.find((x) => x.programDefId === n.id);
      const programKey = chain.find((x) => x.nodeKind === "PROGRAM")?.programNodeKey ?? "";
      const newToday = now.getTime() - n.createdAt.getTime() < 864e5 && n.createdAt.getTime() > loadedAt;
      const pathKeys = chain.filter((x) => x.nodeKind !== "PATHWAY").map((x) => x.programNodeKey as string);
      const base = { kind: "combination" as const, nodeKey: n.programNodeKey, label: n.label, level: (n.nodeKind === "STREAM" ? "Category" : "Sub-category") as CatalogueLeaf["level"], path, linkLabel: n.linkLabel, matches: [] as string[], programKey, pathKeys };
      const noteOf = (aiProposals: number, next: string | undefined, held: { edition: string }[] = []) => [n.linkLabel, aiProposals && next !== "review_proposals" ? `${aiProposals} AI proposal${aiProposals === 1 ? "" : "s"} to review` : null,
        held.length && next !== "see_new_edition" ? `New edition waiting: ${held.map((x) => x.edition).join(", ")}` : null, newToday ? "New today" : null].filter(Boolean).join(" · ");
      if (!c) {
        rows.push({ pathway, changes: 0, errors: 0, firstError: null, hasContent: false, searchText: path.join(" "), docNames: [],
          leaf: { ...base, combinationId: null, forms: [], counts: null, status: "IN_SETUP", statusText: "Not started", missing: [{ code: "not_started", step: "Add sources", text: "Not started: no setup yet. Next step: Add sources." }], aiProposals: 0, aiRunning: null, release: null, checked: null, nextAction: nextActionOf({ exists: false, status: "IN_SETUP", forms: 0, sources: 0, draftable: 0, fromLibrary: [], running: null, proposals: [], changes: 0, missing: [] }), needs: true, live: false, held: [], note: noteOf(0, "start") } });
        continue;
      }
      const { snapshot } = snaps.get(c.id)! as { snapshot: Snapshot };
      const rel = latest.get(c.id);
      const participants = c.participants as ParticipantLine[];
      const structure = await this.studio.structureProblems(c.id);
      const draftProblems = [...structure, ...validate(snapshot, library, derivedOf(snapshot))];
      // Status is about what firms can use: the released snapshot when there is one; the draft only explains In setup.
      const relSnap = rel?.snapshot as unknown as Snapshot | undefined;
      const relProblems = relSnap ? [...structure, ...validate(relSnap, library, derivedOf(relSnap))] : draftProblems;
      const hasContent = snapshot.forms.length + snapshot.sections.length + snapshot.document_requirements.length + snapshot.rules.length > 0;
      const changes = hasContent ? diff(relSnap ?? null, snapshot).length : 0;
      const mine = jobs.filter((x) => x.combinationId === c.id);
      const latestPerSource = new Map<string, (typeof mine)[number]>();
      for (const x of mine) if (x.attachmentId && !latestPerSource.has(x.attachmentId)) latestPerSource.set(x.attachmentId, x);
      const proposals = [...latestPerSource.values()].filter((x) => x.kind === "field_map" && x.status === "COMPLETED" && x.mode !== "STUB").map((x) => ({ job: x.id, n: pending.get(x.id) ?? 0 }));
      const running = mine.find((x) => (x.status === "QUEUED" || x.status === "RUNNING") && x.batchId)?.batchId ?? null;
      const snapForms = snapshot.forms as SnapForm[];
      const formCodes = new Set(snapForms.map((f) => f.form_number));
      const sourceForms = c.attachments.filter((x) => x.recognised && x.kind === "Form" && !formCodes.has((x.edition ?? "").split(" (")[0]));
      const draftable = sourceForms.filter((x) => !mapped.has(x.sha256) && !["COMPLETED", "QUEUED", "RUNNING", "APPLIED"].includes(latestPerSource.get(x.id)?.status ?? "")).length;
      const fromLibrary = [...new Set(sourceForms.filter((x) => mapped.has(x.sha256)).map((x) => (x.edition ?? "").split(" (")[0]))];
      const forms = [...snapForms.map((f) => { const document = (f.form_kind ?? "data_form") !== "data_form"; return { code: f.form_number, document, drafted: document || (snapshot.field_maps as { form_number: string }[]).some((m) => m.form_number === f.form_number) }; }), ...sourceForms.map((x) => ({ code: (x.edition ?? x.officialFile ?? "Form").split(" (")[0], drafted: false, document: false, inLibrary: mapped.has(x.sha256) }))]
        .filter((f, i, all) => all.findIndex((y) => y.code === f.code) === i).sort((x, y) => x.code.localeCompare(y.code));
      // The missing list and the next step read the same setup state, so they name the same step (Lead check item 1).
      const setup = { exists: true, forms: forms.length, sources: new Set(sourceForms.map((x) => (x.edition ?? x.officialFile ?? x.id).split(" (")[0])).size, draftable, fromLibrary, running, proposals };
      const missing = missingItems(relSnap ?? snapshot, participants, relProblems, setup);
      const status: Status = statusOf(!!rel, missing);
      const checked = checkedOf(c.attachments.map((x) => { const d = new Date(official.get(x.sha256) || x.createdAt); return Number.isNaN(d.getTime()) ? x.createdAt : d; }), now);
      const docNames = (snapshot.document_requirements as { document_type: string }[]).map((d) => d.document_type);
      const errors = draftProblems.filter((x) => x.level === "error");
      const aiProposals = proposals.reduce((s, x) => s + x.n, 0);
      // New editions held for impact review (P-32) of a form this row files or has as a source, or uploaded on this row.
      const codes = new Set(forms.map((f) => f.code));
      const held = heldItems.filter((x) => x.combinationId === c.id || (x.code && codes.has(x.code))).map((x) => ({ code: x.code ?? "", edition: x.editionLabel ?? x.code ?? "" }))
        .filter((x, i, all) => all.findIndex((y) => y.edition === x.edition) === i);
      const nextAction = nextActionOf({ ...setup, status, changes, missing, held: held.length });
      rows.push({ pathway, changes, errors: errors.length, firstError: errors[0] ? `${errors[0].item}: ${errors[0].message}` : null, hasContent, docNames,
        searchText: [...path, ...forms.map((f) => f.code), ...docNames].join(" "),
        leaf: { ...base, combinationId: c.id, forms, counts: hasContent ? rowCounts(snapshot, participants) : null, status, statusText: status === "READY" ? `Live · Release ${rel!.packVersion?.version ?? 1}` : STATUS_TEXT[status],
          missing, aiProposals, aiRunning: running, release: rel ? { pack: rel.packVersion?.version ?? 1, at: rel.releasedAt.toISOString() } : null, checked,
          nextAction, needs: needsWork({ status, nextAction }), live: isLive({ status }), held, note: noteOf(aiProposals, nextAction?.kind, held) } });
    }
    this.cache = { key, rows, nodes, at: Math.round(performance.now() - t0) };
    return this.cache;
  }

  /** GET /catalogue: one request for the whole tree of one pathway, filtered and searched on the server. */
  async catalogue(query: unknown): Promise<CatalogueResponse> {
    const t0 = performance.now();
    const q = parse(CatalogueQuery, query);
    const { rows, nodes, at } = await this.rows();
    // A program or path that is not in this pathway (an old link, a typed URL) is ignored, not shown as an empty
    // contradiction (break m5): the answer says which scope it used.
    const nodeOf = new Map(nodes.map((n) => [n.programNodeKey, n]));
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
    const inPathway = rows.filter((r) => r.pathway === q.pathway);
    const inProgram = inPathway.filter((r) => (!q.program || r.leaf.programKey === q.program) && (!q.under || r.leaf.pathKeys.includes(q.under)));
    const searched = inProgram.map((r) => ({ r, m: hit(r) })).filter((x) => !words || x.m.length);
    // "Needs work" with nothing to do falls back to All, and says so (P-35, P-49).
    const fellBack = q.filter === "needs" && !searched.some((x) => x.r.leaf.needs);
    const filter = fellBack ? "all" : q.filter;
    const pass = (r: Row) => filter === "all" || (filter === "needs" ? r.leaf.needs : filter === "live" ? r.leaf.live : filter === "ai_proposals" ? r.leaf.aiProposals > 0 : r.leaf.status === filter.toUpperCase());
    const shown = new Map(searched.filter((x) => pass(x.r)).map((x) => [x.r.leaf.nodeKey, { ...x.r.leaf, matches: x.m }]));
    const count = (list: Row[]) => ({ needs: list.filter((r) => r.leaf.needs).length, live: list.filter((r) => r.leaf.live).length, all: list.length, ready: list.filter((r) => r.leaf.status === "READY").length, not_ready: list.filter((r) => r.leaf.status === "NOT_READY").length, in_setup: list.filter((r) => r.leaf.status === "IN_SETUP").length, ai_proposals: list.filter((r) => r.leaf.aiProposals > 0).length });
    const pw = nodes.find((n) => n.nodeKind === "PATHWAY" && n.clientType === q.pathway);
    const kids = (k: string) => nodes.filter((n) => n.parentNodeKey === k);
    const summarise = (leaves: CatalogueLeaf[]) => ({ IN_SETUP: leaves.filter((l) => l.status === "IN_SETUP").length, NOT_READY: leaves.filter((l) => l.status === "NOT_READY").length, READY: leaves.filter((l) => l.status === "READY").length, ai_proposals: leaves.filter((l) => l.aiProposals > 0).length, combinations: leaves.length });
    const allLeaves = new Map(inPathway.map((r) => [r.leaf.nodeKey, r.leaf]));
    const leavesUnder = (k: string): CatalogueLeaf[] => kids(k).flatMap((n) => allLeaves.get(n.programNodeKey) ? [allLeaves.get(n.programNodeKey)!] : leavesUnder(n.programNodeKey));
    const build = (n: ProgramDef): CatalogueNode | null => {
      const leaf = shown.get(n.programNodeKey);
      if (leaf) return leaf;
      if (allLeaves.has(n.programNodeKey)) return null; // a leaf filtered out
      const children = kids(n.programNodeKey).map(build).filter(Boolean) as CatalogueNode[];
      const filtering = filter !== "all" || !!words || !!q.program || !!q.under;
      if (filtering && !children.length) return null;
      return { kind: n.nodeKind === "PROGRAM" ? "program" : "category", nodeKey: n.programNodeKey, label: n.label, linkLabel: n.linkLabel, children, summary: summarise(leavesUnder(n.programNodeKey)) } satisfies CatalogueGroup;
    };
    const tree = pw ? (kids(pw.programNodeKey).map(build).filter(Boolean) as CatalogueGroup[]) : [];
    const other = q.pathway === "INDIVIDUAL" ? "CORPORATE" : "INDIVIDUAL";
    const totals = { programs: pw ? kids(pw.programNodeKey).length : 0, categories: pw ? kids(pw.programNodeKey).flatMap((p) => kids(p.programNodeKey)).length : 0, combinations: inPathway.length };
    const programs = (pw ? kids(pw.programNodeKey) : []).map((p) => ({ key: p.programNodeKey as string, label: p.label as string, combinations: inPathway.filter((r) => r.leaf.programKey === p.programNodeKey).length }))
      .sort((a, b) => a.label.localeCompare(b.label, "en-CA", { sensitivity: "base" }));
    return {
      pathway: q.pathway, filter, requestedFilter: q.filter, fellBack, q: q.q, program: q.program, under: q.under, sort: q.sort,
      underPath: q.under ? underPath(nodes, q.under) : null,
      /** Layout v2: one flat list in Program › Category › Sub-category order (route steps in step order), or by status. */
      rows: [...shown.values()].sort((x, y) => (q.sort === "path" ? 0 : (q.sort === "status" ? 1 : -1) * compareStatus(x, y)) || comparePaths(x, y)), programs,
      pathways: [["INDIVIDUAL", "Individual"], ["CORPORATE", "Corporate and employers"]].map(([v, l]) => ({ value: v, label: l, combinations: rows.filter((r) => r.pathway === v).length })),
      counts: count(searched.map((x) => x.r)), totals, tree,
      otherPathwayMatches: words ? rows.filter((r) => r.pathway === other && hit(r).length).length : 0,
      timing_ms: { rows: at, total: Math.round(performance.now() - t0) },
    };
  }

  /** The shared draft (P-23): every combination whose draft differs from its released snapshot, with what blocks it. */
  async draft() {
    const workspaceId = await this.ws.id();
    const { rows } = await this.rows();
    const last = await this.db.packVersion.findFirst({ where: { workspaceId }, orderBy: { version: "desc" } });
    const changed = rows.filter((r) => r.changes > 0);
    return {
      changes: changed.reduce((s, r) => s + r.changes, 0),
      rows: changed.map((r) => ({ combinationId: r.leaf.combinationId, label: r.leaf.label, path: r.leaf.path, changes: r.changes, held: r.errors > 0, why: r.firstError, released: !!r.leaf.release })),
      last: last ? { version: last.version, at: last.releasedAt, approver: last.approverId } : null,
      next: (last?.version ?? 0) + 1,
    };
  }

  /** POST /pack/release: one release for the whole shared draft. A different person from every author releases
   *  (BR-14); rows whose draft has errors are held back and listed; the rest get a frozen snapshot in the new version. */
  async release(actor: Actor, body: unknown) {
    need(actor, "approve");
    const b = parse(ReleaseBody, body);
    const d = await this.draft();
    if (!d.changes) throw problem(409, "Nothing to release", "The shared draft has no changes since the last release.");
    if (b.expectedChanges !== d.changes) throw problem(409, "The draft changed", `The draft now has ${d.changes} changes, not ${b.expectedChanges}. Review the list again, then release.`);
    const include = d.rows.filter((r) => !r.held);
    if (!include.length) throw problem(409, "Every change is held back", `Fix the problems first: ${d.rows.map((r) => `${r.label}: ${r.why}`).join(" · ")}`);
    const out = await this.studio.releaseRows(actor, include.map((r) => r.combinationId!));
    this.cache = null;
    return { ...out, held: d.rows.filter((r) => r.held).map((r) => ({ label: r.label, why: r.why })) };
  }

  /** POST /program-nodes: a program, category or sub-category, chosen under its parent (BR-2, BR-6). */
  async createNode(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(CreateNodeBody, body);
    const workspaceId = await this.ws.id();
    await this.ensurePathways(workspaceId);
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
   *  edition has its boxes mapped becomes a form line; one without a map is attached as a source for AI to draft. */
  async addLine(actor: Actor, combinationId: string, body: unknown) {
    need(actor, "author");
    const b = parse(AddLineBody, body);
    const c = await this.db.combination.findUnique({ where: { id: combinationId } });
    if (!c) throw problem(404, "Not found", "That combination does not exist.");
    const form = await this.db.govFormDef.findFirst({ where: { workspaceId: c.workspaceId, formKey: b.formKey }, include: { editions: { include: { _count: { select: { maps: true } } } } } });
    if (!form) throw problem(404, "Not in the library", `${b.formKey} is not in the library. Upload the IRCC PDF to add it.`, { errors: [{ field: "formKey", message: "Choose a form from the library." }] });
    const current = newestEdition(form.editions.filter((e) => e._count.maps > 0));
    const already = await this.db.combinationForm.findFirst({ where: { combinationId, lineageKey: form.formKey, status: { not: "RETIRED" } } });
    if (already) throw problem(409, "Already on this combination", `${form.formKey} is already one of this combination's forms.`, { errors: [{ field: "formKey", message: "Already added." }] });
    if (current) {
      await this.db.combinationForm.create({ data: { workspaceId: c.workspaceId, combinationId, govFormDefId: form.id, lineageKey: form.formKey, who: "each_applicant", attachMode: "COMBINATION_MANDATORY", version: 1, status: "DRAFT", origin: "HUMAN", updatedBy: actor.id, sourceQuote: `${current.editionLabel}: added from the library` } });
      await this.audit.log(c.workspaceId, actor.id, "reused", "form", form.formKey, `${actor.name} added ${current.editionLabel} to "${c.label}" from the library`, undefined, combinationId);
      this.cache = null;
      return { added: "form_line", form: form.formKey, edition: current.editionLabel };
    }
    const latest = newestEdition(form.editions);
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
    const top = nodes.find((n) => n.nodeKind === "PATHWAY" && n.clientType === pw);
    const kids = (k: string) => nodes.filter((n) => n.parentNodeKey === k).sort((a, b) => a.label.localeCompare(b.label, "en-CA", { sensitivity: "base" }));
    const leafOf = new Map(rows.map((r) => [r.leaf.nodeKey, r.leaf]));
    const under = (k: string): number => (leafOf.has(k) ? 1 : 0) + kids(k).reduce((s, n) => s + under(n.programNodeKey), 0);
    const opt = (n: ProgramDef) => ({ key: n.programNodeKey, label: n.label, combinations: under(n.programNodeKey), hasSetup: !!leafOf.get(n.programNodeKey)?.combinationId });
    return {
      pathway: pw,
      programs: top ? kids(top.programNodeKey).map((p) => ({ ...opt(p), categories: kids(p.programNodeKey).map((c) => ({ ...opt(c), subCategories: kids(c.programNodeKey).map(opt) })) })) : [],
      combinations: rows.map((r) => ({ nodeKey: r.leaf.nodeKey, pathway: r.pathway, path: r.leaf.path })).sort((a, b) => comparePaths({ path: a.path, linkLabel: null }, { path: b.path, linkLabel: null })),
    };
  }

  /** POST /combinations/path: the path builder's one request. Every level is checked first (right level, a new name
   *  not already used under its parent (BR-6), no sub-category under a category that has its own setup (P-26), a
   *  category with sub-categories is not itself a combination (BR-3)); only then are the new levels and the combination
   *  created. A path that already exists returns its combination (created: false), so the screen can open it. */
  async createPath(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(CreatePathBody, body);
    const workspaceId = await this.ws.id();
    await this.ensurePathways(workspaceId);
    const all = await this.db.programDef.findMany({ where: { workspaceId }, include: { combination: true } });
    const byKey = new Map(all.map((n) => [n.programNodeKey, n]));
    const kidsOf = (k: string | null) => all.filter((n) => n.parentNodeKey === k);
    const pathwayNode = all.find((n) => n.nodeKind === "PATHWAY" && n.clientType === b.pathway)!;
    const errors: { field: string; message: string }[] = [];
    type Level = { existing: (typeof all)[number] | null; label: string };
    const pick = (field: string, want: string, parent: Level | null, lv: { key: string } | { create: string } | null): Level | null => {
      if (!lv) return null;
      if ("key" in lv) {
        const n = byKey.get(lv.key);
        if (!n || n.nodeKind !== want || (parent?.existing && n.parentNodeKey !== parent.existing.programNodeKey) || (parent && !parent.existing)) { errors.push({ field, message: `Choose a ${LEVEL_NAME[want].toLowerCase()} from the list.` }); return null; }
        return { existing: n, label: n.label };
      }
      if (parent?.existing) {
        const twin = kidsOf(parent.existing.programNodeKey).find((s) => normalizeLabel(s.label) === normalizeLabel(lv.create));
        if (twin) { errors.push({ field, message: `"${twin.label}" already exists under ${parent.existing.label}: choose it instead (names are compared ignoring case, spaces and punctuation).` }); return null; }
      }
      return { existing: null, label: lv.create };
    };
    const pathwayLevel: Level = { existing: pathwayNode, label: pathwayNode.label };
    const program = pick("program", "PROGRAM", pathwayLevel, b.program);
    const category = program ? pick("category", "STREAM", program, b.category) : null;
    const sub = category ? pick("subCategory", "CATEGORY", category, b.subCategory) : null;
    if (category?.existing) {
      const hasKids = kidsOf(category.existing.programNodeKey).length > 0;
      if (!b.subCategory && hasKids) errors.push({ field: "subCategory", message: `"${category.label}" has sub-categories: choose one of them, or add a new one. Each is its own combination (BR-3).` });
      if (b.subCategory && category.existing.combination) errors.push({ field: "subCategory", message: `"${category.label}" already has its own setup, so it is the combination. Sub-categories can only be added to a category without setup (P-26).` });
    }
    let linkLabel: string | null = null;
    if (b.link) {
      const target = byKey.get(b.link.nodeKey);
      const chain: ProgramDef[] = [];
      for (let n = target; n; n = n.parentNodeKey ? byKey.get(n.parentNodeKey) : undefined) chain.unshift(n);
      if (!target || (target.nodeKind !== "STREAM" && target.nodeKind !== "CATEGORY") || kidsOf(target.programNodeKey).length) errors.push({ field: "link", message: "Choose an existing combination." });
      else {
        const otherPathway = chain[0]?.clientType && chain[0].clientType !== b.pathway ? `${chain[0].clientType === "CORPORATE" ? "Corporate" : "Individual"} › ` : "";
        linkLabel = `${b.link.kind === "follows" ? "Follows" : "Supported by"}: ${otherPathway}${chain.filter((n) => n.nodeKind !== "PATHWAY").map((n) => n.label).join(" › ")}`;
      }
    }
    if (errors.length) throw new HttpException({ type: "https://expatready.local/problems/validation", title: "The path needs fixing", status: 400, detail: errors.map((e) => e.message).join(" "), errors }, HttpStatus.BAD_REQUEST);
    const leafLevel = sub ?? category!;
    if (leafLevel.existing?.combination) return { created: false, nodeKey: leafLevel.existing.programNodeKey, combination: leafLevel.existing.combination };
    // Writes, in order; the checks above already passed for every level.
    const locations = ["inside_canada", "outside_canada"];
    const made = async (lv: Level, kind: "PROGRAM" | "STREAM" | "CATEGORY", parentKey: string, link?: string | null) =>
      lv.existing ?? (await this.studio.createNode(actor, { kind, label: lv.label, parentKey, allowedLocations: kind === "PROGRAM" ? undefined : locations, linkLabel: link ?? undefined }));
    const p = await made(program!, "PROGRAM", pathwayNode.programNodeKey);
    const c = await made(category!, "STREAM", p.programNodeKey, sub ? null : linkLabel);
    const leaf = sub ? await made(sub, "CATEGORY", c.programNodeKey, linkLabel) : c;
    if (leaf.programNodeKey && linkLabel && (sub ? sub.existing : category!.existing)) await this.db.programDef.update({ where: { id: leaf.id }, data: { linkLabel } });
    const r = await this.createCombination(actor, { nodeKey: leaf.programNodeKey });
    this.cache = null;
    return { created: r.created, nodeKey: leaf.programNodeKey, combination: r.combination };
  }

  /** Files held by the form intake (P-51) that concern this combination: uploaded on it, or a new edition of one of its forms. */
  private async heldFor(workspaceId: string, combinationId: string, codes: Set<string>) {
    const rows = await this.db.intakeItem.findMany({ where: { workspaceId, status: "HELD" }, orderBy: { createdAt: "desc" } });
    return rows.filter((r) => r.combinationId === combinationId || (r.code && codes.has(r.code)))
      .map((r) => ({ id: r.id, file: r.fileName, code: r.code, edition: r.editionLabel, outcome: r.outcome, reason: r.reason, at: r.createdAt }));
  }

  /** GET /combinations/:id/summary: the combination page's header and Overview (P-50): its catalogue row (path with
   *  keys, status, missing list, next step) plus forms, sources and new editions held for impact review. */
  async summary(combinationId: string): Promise<CombinationSummary> {
    const c = await this.db.combination.findUnique({ where: { id: combinationId }, include: { program: true, attachments: { orderBy: { createdAt: "asc" } } } });
    if (!c) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    const { rows } = await this.rows();
    const row = rows.find((r) => r.leaf.combinationId === combinationId);
    const forms = await this.db.combinationForm.findMany({ where: { combinationId, status: { not: "RETIRED" } }, include: { form: { include: { editions: { include: { _count: { select: { maps: true } } } } } } } });
    const lines = [...new Map(forms.sort((x, y) => y.version - x.version).map((f) => [f.lineageKey, f])).values()];
    return {
      row: row?.leaf ?? null, changes: row?.changes ?? 0, allowedLocations: c.program.allowedLocations, participants: c.participants,
      forms: lines.map((f) => { const e = newestEdition(f.form.editions.filter((x) => x._count.maps > 0)); return { code: f.form.formKey, title: f.form.displayName, document: f.form.formKind !== "data_form", who: f.who, when: f.attachMode === "COMBINATION_MANDATORY" ? "always" : f.conditionPlain ?? "only if", edition: e?.editionLabel ?? null, boxes: e?._count.maps ?? 0 }; }),
      sources: c.attachments.map((x) => ({ id: x.id, kind: x.kind, name: x.edition ?? x.fileName, status: x.status, detail: x.statusDetail, at: x.createdAt })),
      held: await this.heldFor(c.workspaceId, combinationId, new Set((row?.leaf.forms ?? []).map((f) => f.code))),
    };
  }
}
