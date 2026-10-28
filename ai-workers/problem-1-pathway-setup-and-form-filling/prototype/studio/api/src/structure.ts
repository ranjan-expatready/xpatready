// W1-03 Structure (concept §3–§5, §9, §10b; P-104, P-112, P-115, P-116; addendum A1): the one checked entry point for
// new names (BR-3), the Pathway type as a fixed value with several Pathways per type (BR-1), the free "did you mean"
// check (BR-4, BR-5), rename that reaches firms with the next release (BR-6), where cases may be opened (M5), reorder
// at once with an audit line, and the lifecycle routes (api/src/lifecycle.ts). Contract: contracts/structure.ts.
import { Body, Controller, Delete, Get, Headers, HttpException, Inject, Injectable, Param, Patch, Post, Query } from "@nestjs/common";
import type { ProgramDef } from "@prisma/client";
import { normalizeLabel } from "../../contracts/programs.ts";
import { CreateStructureNodeBody, StructurePathBody, KIND_OF, LEVEL_OF, LEVEL_WORD, LifecycleBody, NameCheckBody, PARENT_LEVEL, PATHWAY_TYPE_LABEL, PatchStructureNodeBody, ReorderBody, StructureQuery,
  type Level, type LifecycleAction, type PathwayType, type StructureNode, type StructurePathResult } from "../../contracts/structure.ts";
import { checkName, type NameCandidate } from "../../engine/structure.ts";
import { actorOf, Audit, Db, need, readerOf, Workspace, type Actor } from "./core.ts";
import { Lifecycle, rowAction, trailOf } from "./lifecycle.ts";
import { parse, Programs } from "./programs.ts";
import { Studio } from "./studio.ts";
import { slug } from "../../engine/import.ts";

const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
const BOTH = ["inside_canada", "outside_canada"];

type Graph = { nodes: ProgramDef[]; byKey: Map<string, ProgramDef>; kids: (k: string | null, type?: PathwayType) => ProgramDef[] };

@Injectable()
export class Structure {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit,
    @Inject(Studio) private readonly studio: Studio, @Inject(Programs) private readonly programs: Programs, @Inject(Lifecycle) private readonly lifecycle: Lifecycle) {}

  private async graph(workspaceId: string): Promise<Graph> {
    const nodes = await this.db.programDef.findMany({ where: { workspaceId }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] });
    const byKey = new Map(nodes.map((n) => [n.programNodeKey, n]));
    return { nodes, byKey, kids: (k, type) => nodes.filter((n) => n.parentNodeKey === k && (k !== null || n.clientType === type)) };
  }
  /** The Pathway type a node sits in: its Pathway's client type. */
  private typeOf(g: Graph, n: ProgramDef | undefined): PathwayType | null {
    for (let x = n; x; x = x.parentNodeKey ? g.byKey.get(x.parentNodeKey) : undefined) if (x.nodeKind === "PATHWAY") return (x.clientType as PathwayType) ?? null;
    return null;
  }
  /** Every name of one level in one Pathway type, with its trail (the "did you mean" candidates, BR-5). */
  private sameLevel(g: Graph, type: PathwayType, level: Level): NameCandidate[] {
    return g.nodes.filter((n) => n.nodeKind === KIND_OF[level] && this.typeOf(g, n) === type)
      .map((n) => ({ key: n.programNodeKey, label: n.label, parentKey: n.parentNodeKey, trail: [PATHWAY_TYPE_LABEL[type], ...trailOf(g, n.programNodeKey)].concat(n.retiredAt ? ["(retired)"] : []) }));
  }

  /** GET /structure: the outline of one Pathway type, with what each name holds and any open lifecycle change. */
  async list(query: unknown) {
    const q = parse(StructureQuery, query);
    const workspaceId = await this.ws.id();
    const g = await this.graph(workspaceId);
    const leaves = await this.programs.leafStates();
    const pending = new Map((await this.db.libraryChange.findMany({ where: { workspaceId, kind: "structure_node", status: { in: ["WAITING", "RETURNED", "APPROVED"] } } })).map((c) => [c.key, { id: c.id, action: c.action as LifecycleAction }]));
    // "Used by" on each line (P-127 (1)): the releases that hold a combination and the cases open on it.
    const combos = await this.db.combination.findMany({ where: { workspaceId }, select: { id: true, programDefId: true, retiredAt: true, _count: { select: { releases: true, cases: { where: { status: "OPEN" } } } } } });
    const used = new Map(combos.map((c) => [c.id, c._count]));
    // Each row's one action (P-128 R3-2), by the same rule as a proposal (lifecycle.ts nodeCan), read in bulk here.
    const comboOf = new Map(combos.map((c) => [c.programDefId, { id: c.id, programDefId: c.programDefId, released: c._count.releases > 0, retired: !!c.retiredAt }]));
    const open = new Set((await this.db.libraryChange.findMany({ where: { workspaceId, status: { in: ["WAITING", "RETURNED", "APPROVED"] }, kind: { in: ["structure_node", "combination"] } }, select: { key: true } })).map((c) => c.key));
    const under = (k: string): ProgramDef[] => g.kids(k).flatMap((c) => [c, ...under(c.programNodeKey)]);
    const actionOf = (n: ProgramDef) => { const below = under(n.programNodeKey); return rowAction({ node: n, below, parent: n.parentNodeKey ? g.byKey.get(n.parentNodeKey) ?? null : null, combos: [n, ...below].flatMap((x) => comboOf.get(x.id) ?? []), open }, pending.has(n.programNodeKey)); };
    const out: StructureNode[] = [];
    const walk = (n: ProgramDef): { combinations: number; live: number; needs: number } => {
      const kids = g.kids(n.programNodeKey);
      const own = leaves.get(n.programNodeKey);
      // needs: combinations below it waiting on a person (S2 fix 6, engine waitsForPerson), for the Pathway cards.
      let combinations = own && !own.retired ? 1 : 0, live = own?.live ? 1 : 0, needs = own?.needs ? 1 : 0;
      const view: StructureNode = { key: n.programNodeKey, level: LEVEL_OF[n.nodeKind], parentKey: n.parentNodeKey, label: n.label, pathwayType: q.pathwayType, allowedLocations: n.allowedLocations,
        order: n.displayOrder, combinations: 0, live: 0, needs: 0, hasSetup: !!own?.combinationId, meaningChecked: false, version: n.version, retired: !!n.retiredAt, pending: pending.get(n.programNodeKey) ?? null, action: actionOf(n),
        combination: own ? { id: own.combinationId, status: own.status, statusText: own.statusText, retired: own.retired,
          releases: own.combinationId ? used.get(own.combinationId)?.releases ?? 0 : 0, openCases: own.combinationId ? used.get(own.combinationId)?.cases ?? 0 : 0 } : null };
      if (q.retired === "1" || !n.retiredAt) out.push(view);
      for (const k of kids) { const s = walk(k); combinations += s.combinations; live += s.live; needs += s.needs; }
      view.combinations = combinations; view.live = live; view.needs = needs;
      return { combinations, live, needs };
    };
    for (const p of g.kids(null, q.pathwayType).filter((n) => n.nodeKind === "PATHWAY")) walk(p);
    return { pathwayType: q.pathwayType, typeLabel: PATHWAY_TYPE_LABEL[q.pathwayType], nodes: out, empty: !out.length,
      meaningCheck: { on: false, why: "The AI meaning check is off: only the spelling check runs, and names are shown as Not meaning-checked (P-95)." } };
  }

  /** The parent a new name goes under, checked (right level, same type, not retired). */
  private parentFor(g: Graph, type: PathwayType, level: Level, parentKey: string | null) {
    const want = PARENT_LEVEL[level];
    if (!want) { if (parentKey) throw problem(400, "Wrong level", "A pathway is the top level under its type; it has no parent.", { errors: [{ field: "parentKey", message: "Leave it empty for a pathway." }] }); return null; }
    if (!parentKey) throw problem(400, "Choose where it belongs", `Choose the ${LEVEL_WORD[want].toLowerCase()} it belongs to.`, { errors: [{ field: "parentKey", message: `Choose a ${LEVEL_WORD[want].toLowerCase()}.` }] });
    const parent = g.byKey.get(parentKey);
    if (!parent) throw problem(404, "Not found", "That parent is not in the Structure (it may have been removed or reset).", { errors: [{ field: "parentKey", message: "Choose an existing parent." }] });
    if (parent.nodeKind !== KIND_OF[want]) throw problem(400, "Wrong level", `A ${LEVEL_WORD[level].toLowerCase()} goes under a ${LEVEL_WORD[want].toLowerCase()}, not under a ${LEVEL_WORD[LEVEL_OF[parent.nodeKind]].toLowerCase()}.`, { errors: [{ field: "parentKey", message: `Choose a ${LEVEL_WORD[want].toLowerCase()}.` }] });
    if (this.typeOf(g, parent) !== type) throw problem(400, "Other Pathway type", `"${parent.label}" is under ${PATHWAY_TYPE_LABEL[this.typeOf(g, parent) ?? "INDIVIDUAL"]}, not ${PATHWAY_TYPE_LABEL[type]} (BR-8: the two types are separate).`, { errors: [{ field: "parentKey", message: "Choose a parent in this tab." }] });
    if (parent.retiredAt) throw problem(409, "Parent retired", `"${parent.label}" is retired: restore it first, or choose another parent.`, { errors: [{ field: "parentKey", message: `"${parent.label}" is retired.` }] });
    return parent;
  }

  /** POST /structure/name-check: exact twin under the same parent (refused on save) and close names (warned). US$0. */
  async nameCheck(body: unknown) {
    const b = parse(NameCheckBody, body);
    const g = await this.graph(await this.ws.id());
    return checkName(b.label, b.parentKey, this.sameLevel(g, b.pathwayType, b.level));
  }

  /** POST /structure/meaning-check: built behind the paid-run switch, which is off (P-95, concept BR-5): no AI call. */
  async meaningCheck(actor: Actor) {
    need(actor, "author");
    throw problem(403, "Paid runs off", "The AI meaning check is off, so no AI was called and nothing was spent. The spelling check still runs; the name is saved as Not meaning-checked.", { code: "paid_runs_off" });
  }

  /** POST /structure/nodes: the one way a new name enters (BR-3), checked as in name-check; a leaf is listed at once as
   *  a Not started combination (BR-2, M6). */
  async create(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(CreateStructureNodeBody, body);
    const workspaceId = await this.ws.id();
    const g = await this.graph(workspaceId);
    const parent = this.parentFor(g, b.pathwayType, b.level, b.parentKey);
    // P-26: a category that already has its own setup is the combination; a sub-category would sit above it.
    if (b.level === "subCategory" && parent && (await this.db.combination.count({ where: { programDefId: parent.id } }))) throw problem(409, "Category already set up", `"${parent.label}" already has its own setup, so it is the combination. A sub-category would leave that setup above a combination.`, { code: "category_has_setup", errors: [{ field: "parentKey", message: `"${parent.label}" already has setup.` }] });
    const kind = KIND_OF[b.level];
    const allowedLocations = kind === "STREAM" ? (b.allowedLocations ?? BOTH) : kind === "CATEGORY" ? (b.allowedLocations ?? (parent?.allowedLocations.length ? parent.allowedLocations : BOTH)) : undefined;
    if (b.allowedLocations && !allowedLocations) throw problem(400, "Not for this level", "Where cases may be opened is set on a category or sub-category.", { errors: [{ field: "allowedLocations", message: "Only categories and sub-categories have it." }] });
    const check = checkName(b.label, b.parentKey, this.sameLevel(g, b.pathwayType, b.level));
    if (check.exact) throw problem(409, "Name already used", `"${check.exact.label}" already exists ${parent ? `under ${parent.label}` : `in ${PATHWAY_TYPE_LABEL[b.pathwayType]}`}: choose it instead (names are compared ignoring case, spaces and punctuation).`, { existing: check.exact, errors: [{ field: "label", message: `"${check.exact.label}" already exists here.` }] });
    if (check.close.length && b.decision !== "add_anyway") throw problem(409, "Close names", `Did you mean ${check.close.slice(0, 3).map((c) => `"${c.trail.join(" › ")}"`).join(", ")}? Choose it, or add the new name anyway.`, { code: "close_names", close: check.close });
    const n = await this.studio.createNode(actor, { kind, label: b.label, parentKey: parent?.programNodeKey, clientType: kind === "PATHWAY" ? b.pathwayType : undefined, allowedLocations, sourceBasis: "ILLUSTRATIVE" });
    if (check.close.length) await this.audit.log(workspaceId, actor.id, "added anyway", "structure", n.programNodeKey, `${actor.name} added "${n.label}" although close names exist: ${check.close.map((c) => `${c.trail.join(" › ")} (${c.why})`).join("; ")}`.slice(0, 600));
    return { key: n.programNodeKey, level: b.level, parentKey: n.parentNodeKey, label: n.label, pathwayType: b.pathwayType, allowedLocations: n.allowedLocations, version: n.version, meaningChecked: false,
      combination: kind === "STREAM" || kind === "CATEGORY" ? "Not started" : null, close: check.close };
  }

  /** POST /structure/path (P-127): the "Add to Program structure" dialog. Every level is checked first (right parent,
   *  same type, not retired, no exact twin, close names unless "add anyway", P-26 for a category with setup); then one
   *  transaction writes only the new names, all or nothing. No setup is created: the leaf is listed as Not started. */
  async path(actor: Actor, body: unknown): Promise<StructurePathResult> {
    need(actor, "author");
    const b = parse(StructurePathBody, body);
    const workspaceId = await this.ws.id();
    const g = await this.graph(workspaceId);
    const steps: { level: Level; pick: { key: string } | { label: string } | null | undefined }[] = [
      { level: "pathway", pick: b.pathway }, { level: "program", pick: b.program }, { level: "category", pick: b.category }, { level: "subCategory", pick: b.subCategory }];
    const used = steps.filter((x) => x.pick);
    // A level needs the one above it (AD-1); "None" ends the path at its category.
    for (let i = 1; i < steps.length; i++) if (steps[i].pick && !steps[i - 1].pick) throw problem(400, "Fill the level above", `Choose the ${LEVEL_WORD[steps[i - 1].level].toLowerCase()} first.`, { errors: [{ field: steps[i - 1].level, message: `Choose the ${LEVEL_WORD[steps[i - 1].level].toLowerCase()}.` }] });
    if (b.subCategory === null && !b.category) throw problem(400, "Fill the level above", "Choose the category first.", { errors: [{ field: "category", message: "Choose the category." }] });
    type Plan = { level: Level; existing: ProgramDef | null; label: string; parentKey: string | null; parentNew: boolean; close: ReturnType<typeof checkName>["close"] };
    const plan: Plan[] = [];
    for (const step of used) {
      const above = plan[plan.length - 1];
      const field = step.level;
      if ("key" in step.pick!) {
        if (above && !above.existing) throw problem(400, "Under a new name", `Under a new ${LEVEL_WORD[above.level].toLowerCase()} every level is new: type the ${LEVEL_WORD[step.level].toLowerCase()}'s name.`, { errors: [{ field, message: "Type a new name here." }] });
        const n = g.byKey.get(step.pick!.key);
        if (!n || n.nodeKind !== KIND_OF[step.level]) throw problem(404, "Not found", `That ${LEVEL_WORD[step.level].toLowerCase()} is not in the Program structure (it may have been removed or renamed).`, { errors: [{ field, message: "Choose one from the list." }] });
        if ((n.parentNodeKey ?? null) !== (above?.existing?.programNodeKey ?? null) || (step.level === "pathway" && n.clientType !== b.pathwayType)) throw problem(400, "Not under the level above", `"${n.label}" is not under the ${above ? `${LEVEL_WORD[above.level].toLowerCase()} "${above.label}"` : `Pathway type ${PATHWAY_TYPE_LABEL[b.pathwayType]}`}.`, { errors: [{ field, message: "Choose one from the list." }] });
        if (n.retiredAt) throw problem(409, "Retired", `"${n.label}" is retired: restore it first, or choose another.`, { errors: [{ field, message: `"${n.label}" is retired.` }] });
        plan.push({ level: step.level, existing: n, label: n.label, parentKey: n.parentNodeKey, parentNew: false, close: [] });
      } else {
        const label = step.pick!.label;
        const parentKey = above ? (above.existing?.programNodeKey ?? `new:${above.level}`) : null;
        if (step.level === "subCategory" && above?.existing && (await this.db.combination.count({ where: { programDefId: above.existing.id } }))) throw problem(409, "Category already set up", `"${above.label}" already has its own setup, so it is the combination. A sub-category would leave that setup above a combination.`, { code: "category_has_setup", errors: [{ field, message: `"${above.label}" already has setup.` }] });
        const check = checkName(label, parentKey, this.sameLevel(g, b.pathwayType, step.level));
        const at = above ? `under ${above.label}` : `in ${PATHWAY_TYPE_LABEL[b.pathwayType]}`;
        if (check.exact) throw problem(409, "Name already used", `"${check.exact.label}" already exists ${at}: choose it instead.`, { existing: check.exact, errors: [{ field, message: `"${check.exact.label}" already exists ${at}.` }] });
        plan.push({ level: step.level, existing: null, label, parentKey, parentNew: !!above && !above.existing, close: check.close });
      }
    }
    const fresh = plan.filter((x) => !x.existing);
    const last = plan[plan.length - 1];
    // "None" on a category that already has sub-categories cannot be the combination (AD-2): asked before "already
    // there", which would wrongly call that category a combination (drift check 5).
    if (b.subCategory === null && last.level === "category" && last.existing && g.kids(last.existing.programNodeKey).length) throw problem(400, "Choose a sub-category", `"${last.label}" has sub-categories: choose one of them, or add a new one.`, { errors: [{ field: "subCategory", message: "Choose a sub-category." }] });
    if (!fresh.length) throw problem(409, "Already in the structure", `${plan.map((x) => x.label).join(" › ")} is already in the Program structure.`, { code: "exists", existing: { key: last.existing!.programNodeKey, label: last.label } });
    const close = fresh.filter((x) => x.close.length);
    if (close.length && b.decision !== "add_anyway") throw problem(409, "Close names", `Did you mean ${close.flatMap((x) => x.close.slice(0, 2)).map((c) => `"${c.trail.join(" › ")}"`).join(", ")}? Use the existing name, or add yours anyway.`, { code: "close_names", close: close.flatMap((x) => x.close), errors: close.map((x) => ({ field: x.level, message: `Did you mean ${x.close.slice(0, 2).map((c) => `"${c.label}"`).join(" or ")}?` })) });
    if (b.allowedLocations && last.level !== "category" && last.level !== "subCategory") throw problem(400, "Not for this level", "Where cases may be opened is set on a category or sub-category.", { errors: [{ field: "allowedLocations", message: "Only categories and sub-categories have it." }] });
    const created = await this.db.$transaction(async (tx) => {
      const out: { level: Level; key: string; label: string; parentKey: string | null }[] = [];
      let parent: { key: string; locations: string[] } | null = null;
      let order = await tx.programDef.count({ where: { workspaceId } });
      for (const x of plan) {
        if (x.existing) { parent = { key: x.existing.programNodeKey, locations: x.existing.allowedLocations }; continue; }
        const kind = KIND_OF[x.level];
        const locations: string[] = kind === "STREAM" ? (x === last ? b.allowedLocations ?? BOTH : BOTH) : kind === "CATEGORY" ? (b.allowedLocations ?? (parent?.locations.length ? parent.locations : BOTH)) : [];
        let key: string = `${parent ?`${parent.key}.` : ""}${slug(x.label) || "item"}`;
        for (let i = 2; await tx.programDef.findFirst({ where: { workspaceId, programNodeKey: key }, select: { id: true } }); i++) key = `${key.replace(/-\d+$/, "")}-${i}`;
        await tx.programDef.create({ data: { workspaceId, programNodeKey: key, parentNodeKey: parent?.key ?? null, nodeKind: kind, label: x.label, nameKey: normalizeLabel(x.label), sourceBasis: "ILLUSTRATIVE", clientType: kind === "PATHWAY" ? b.pathwayType : null, allowedLocations: locations, createdBy: actor.id, displayOrder: order++ } });
        out.push({ level: x.level, key, label: x.label, parentKey: parent?.key ?? null });
        parent = { key, locations };
      }
      return out;
    }).catch((e) => {
      if ((e as { code?: string }).code === "P2002") throw problem(409, "Added at the same moment", "Someone added one of these names at the same moment, so nothing was added. Look again and choose the existing name.", { code: "race" });
      throw e;
    });
    for (const c of created) {
      const x = plan.find((p) => p.label === c.label && p.level === c.level)!;
      await this.audit.log(workspaceId, actor.id, "created", LEVEL_WORD[c.level].toLowerCase(), c.key, `${actor.name} added ${LEVEL_WORD[c.level].toLowerCase()} "${c.label}" to the Program structure${c.parentKey ? ` under ${g.byKey.get(c.parentKey)?.label ?? created.find((y) => y.key === c.parentKey)?.label ?? c.parentKey}` : ` in ${PATHWAY_TYPE_LABEL[b.pathwayType]}`}${x.close.length ? ` although close names exist: ${x.close.map((k) => k.trail.join(" › ")).join("; ")}` : ""}`.slice(0, 600));
    }
    const leafKey = last.existing?.programNodeKey ?? created[created.length - 1].key;
    const isLeaf = (last.level === "category" && b.subCategory !== undefined) || last.level === "subCategory" || (last.level === "category" && !last.existing);
    return { created: created.map(({ level, key, label }) => ({ level, key, label })), leaf: { level: last.level, key: leafKey }, trail: [PATHWAY_TYPE_LABEL[b.pathwayType], ...plan.map((x) => x.label)], combination: isLeaf ? "Not started" : null };
  }

  /** PATCH /structure/nodes/:key: rename (BR-6: setup shows it at once; each combination under it gets one name-only
   *  change and firms see it with the next release) and where cases may be opened (a setup change that needs the
   *  expert tick at release, engine/validate.ts). Refused with the current row when someone saved it meanwhile. */
  async patch(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const b = parse(PatchStructureNodeBody, body);
    const workspaceId = await this.ws.id();
    const g = await this.graph(workspaceId);
    const n = g.byKey.get(key);
    if (!n) throw problem(404, "Not found", "That name is not in the Structure (it may have been removed or reset).");
    const view = { key, label: n.label, allowedLocations: n.allowedLocations, version: n.version };
    if (n.version !== b.version) throw problem(409, "Changed meanwhile", `Someone saved "${n.label}" after you opened it. Here it is now; make your change again.`, { code: "stale", current: view });
    if (n.retiredAt) throw problem(409, "Retired", `"${n.label}" is retired: restore it first.`);
    const level = LEVEL_OF[n.nodeKind], type = this.typeOf(g, n)!;
    const data: { label?: string; nameKey?: string; allowedLocations?: string[] } = {};
    let close: ReturnType<typeof checkName>["close"] = [];
    if (b.label !== undefined && b.label !== n.label) {
      const check = checkName(b.label, n.parentNodeKey, this.sameLevel(g, type, level), key);
      if (check.exact) throw problem(409, "Name already used", `"${check.exact.label}" already exists here: choose another name.`, { existing: check.exact, errors: [{ field: "label", message: `"${check.exact.label}" already exists here.` }] });
      if (check.close.length && b.decision !== "add_anyway") throw problem(409, "Close names", `Did you mean ${check.close.slice(0, 3).map((c) => `"${c.trail.join(" › ")}"`).join(", ")}? Keep the old name, or rename anyway.`, { code: "close_names", close: check.close });
      close = check.close;
      data.label = b.label; data.nameKey = normalizeLabel(b.label);
    }
    if (b.allowedLocations) {
      if (n.nodeKind !== "STREAM" && n.nodeKind !== "CATEGORY") throw problem(400, "Not for this level", "Where cases may be opened is set on a category or sub-category.", { errors: [{ field: "allowedLocations", message: "Only categories and sub-categories have it." }] });
      if ([...b.allowedLocations].sort().join() !== [...n.allowedLocations].sort().join()) data.allowedLocations = b.allowedLocations;
    }
    if (!Object.keys(data).length) return { ...view, changed: false, affected: 0 };
    const below = (k: string): ProgramDef[] => g.kids(k).flatMap((c) => [c, ...below(c.programNodeKey)]);
    const affected = await this.db.combination.findMany({ where: { workspaceId, programDefId: { in: [n, ...below(key)].map((x) => x.id) } }, select: { id: true, programDefId: true } });
    const saved = await this.db.$transaction(async (tx) => {
      const done = await tx.programDef.updateMany({ where: { id: n.id, version: b.version }, data: { ...data, version: { increment: 1 } } });
      if (!done.count) return null;
      // The combination on this name carries the same name (its row label), so lists and releases agree.
      if (data.label) await tx.combination.updateMany({ where: { programDefId: n.id }, data: { label: data.label } });
      return tx.programDef.findUniqueOrThrow({ where: { id: n.id } });
    }).catch((e) => { if ((e as { code?: string }).code === "P2002") throw problem(409, "Name already used", "Another name like it was saved here at the same moment: choose another name."); throw e; });
    if (!saved) { const now = await this.db.programDef.findUniqueOrThrow({ where: { id: n.id } }); throw problem(409, "Changed meanwhile", `Someone saved "${now.label}" at the same moment. Here it is now; make your change again.`, { code: "stale", current: { key, label: now.label, allowedLocations: now.allowedLocations, version: now.version } }); }
    const what = [data.label ? `renamed "${n.label}" to "${data.label}"` : null, data.allowedLocations ? `set where cases may be opened to ${data.allowedLocations.join(" and ").replace(/_/g, " ")}` : null].filter(Boolean).join(" and ");
    const note = `${actor.name} ${what}${close.length ? ` although close names exist (${close.map((c) => c.label).join(", ")})` : ""}${affected.length ? `: ${affected.length} combination${affected.length === 1 ? "" : "s"} get a change for the next release` : ""}`;
    await this.audit.log(workspaceId, actor.id, data.label ? "renamed" : "updated", "structure", key, note);
    // Each affected combination's draft now differs from its release: its author list includes this person (BR-14).
    for (const c of affected) await this.audit.log(workspaceId, actor.id, data.label ? "renamed" : "updated", "structure", key, `${note} (this combination)`, undefined, c.id);
    return { key, label: saved.label, allowedLocations: saved.allowedLocations, version: saved.version, changed: true, affected: affected.length };
  }

  /** POST /structure/reorder: one parent's names in a new order, at once, with an audit line (Lead, 26 Oct: display
   *  order is not release content, so no second person). The list must be exactly that parent's names. */
  async reorder(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(ReorderBody, body);
    const workspaceId = await this.ws.id();
    const g = await this.graph(workspaceId);
    if (b.parentKey && !g.byKey.get(b.parentKey)) throw problem(404, "Not found", "That parent is not in the Structure.");
    if (b.parentKey && this.typeOf(g, g.byKey.get(b.parentKey)) !== b.pathwayType) throw problem(400, "Other Pathway type", "That parent is in the other tab.");
    const kids = b.parentKey ? g.kids(b.parentKey) : g.kids(null, b.pathwayType);
    const want = new Set(kids.map((k) => k.programNodeKey));
    if (b.keys.length !== want.size || new Set(b.keys).size !== b.keys.length || !b.keys.every((k) => want.has(k))) throw problem(409, "Changed meanwhile", "The list does not match the names there now (one was added or removed meanwhile). Refresh and reorder again.", { current: kids.map((k) => k.programNodeKey) });
    await this.db.$transaction(b.keys.map((k, i) => this.db.programDef.updateMany({ where: { workspaceId, programNodeKey: k }, data: { displayOrder: i } })));
    const parent = b.parentKey ? g.byKey.get(b.parentKey)!.label : PATHWAY_TYPE_LABEL[b.pathwayType];
    await this.audit.log(workspaceId, actor.id, "reordered", "structure", b.parentKey, `${actor.name} reordered the names under ${parent}: ${b.keys.map((k) => g.byKey.get(k)!.label).join(", ")}`);
    return { parentKey: b.parentKey, keys: b.keys };
  }

  async propose(actor: Actor, kind: "structure_node" | "combination", key: string, action: LifecycleAction, body: unknown) {
    const b = parse(LifecycleBody, body);
    return this.lifecycle.propose(actor, kind, key, action, b.reason);
  }
}

/** Routes (contract: contracts/structure.ts). Every write checks the person's duty on the server. */
@Controller("api")
export class StructureController {
  constructor(@Inject(Structure) private readonly s: Structure, @Inject(Lifecycle) private readonly l: Lifecycle) {}
  @Get("structure") list(@Headers("x-actor") a: string | undefined, @Query() q: unknown) { readerOf(a); return this.s.list(q); }
  @Post("structure/name-check") nameCheck(@Headers("x-actor") a: string | undefined, @Body() b: unknown) { readerOf(a); return this.s.nameCheck(b); }
  @Post("structure/meaning-check") meaning(@Headers("x-actor") a?: string) { return this.s.meaningCheck(actorOf(a)); }
  @Post("structure/path") path(@Headers("x-actor") a: string | undefined, @Body() b: unknown) { return this.s.path(actorOf(a), b); }
  @Post("structure/nodes") create(@Headers("x-actor") a: string | undefined, @Body() b: unknown) { return this.s.create(actorOf(a), b); }
  @Patch("structure/nodes/:key") patch(@Headers("x-actor") a: string | undefined, @Param("key") k: string, @Body() b: unknown) { return this.s.patch(actorOf(a), k, b); }
  @Post("structure/reorder") reorder(@Headers("x-actor") a: string | undefined, @Body() b: unknown) { return this.s.reorder(actorOf(a), b); }
  @Get("structure/nodes/:key/uses") nodeUses(@Headers("x-actor") a: string | undefined, @Param("key") k: string) { readerOf(a); return this.l.nodeUses(k); }
  @Delete("structure/nodes/:key") del(@Headers("x-actor") a: string | undefined, @Param("key") k: string, @Body() b: unknown) { return this.s.propose(actorOf(a), "structure_node", k, "DELETE", b); }
  @Post("structure/nodes/:key/retire") retire(@Headers("x-actor") a: string | undefined, @Param("key") k: string, @Body() b: unknown) { return this.s.propose(actorOf(a), "structure_node", k, "RETIRE", b); }
  @Post("structure/nodes/:key/restore") restore(@Headers("x-actor") a: string | undefined, @Param("key") k: string, @Body() b: unknown) { return this.s.propose(actorOf(a), "structure_node", k, "RESTORE", b); }
  @Get("combinations/:id/uses") comboUses(@Param("id") id: string) { return this.l.combinationUses(id); }
  @Delete("combinations/:id") comboDel(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.s.propose(actorOf(a), "combination", id, "DELETE", b); }
  @Post("combinations/:id/retire") comboRetire(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.s.propose(actorOf(a), "combination", id, "RETIRE", b); }
  @Post("combinations/:id/restore") comboRestore(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.s.propose(actorOf(a), "combination", id, "RESTORE", b); }
}
