// P-116 (P-52 L1–L6 on every master), built with W1-03 and reused by W1-06, W1-08 and W1-09 (WAVE-1): the one guard
// for removing, retiring and restoring structure names and combinations, and the "where used" list shown before any
// action (addendum A1, A2). Each action is a LibraryChange (kind structure_node or combination) that a different person
// approves on To review (L4): an approved delete is applied at once (L1); an approved retire or restore is published by
// the next release (publishLifecycle, called by the one library publisher). Reorder is not here: it applies at once
// with an audit line (Lead, 26 Oct), in api/src/structure.ts.
import { HttpException, Inject, Injectable } from "@nestjs/common";
import type { LibraryChange, Prisma, ProgramDef } from "@prisma/client";
import { LEVEL_OF, LEVEL_WORD, PATHWAY_TYPE_LABEL, type LifecycleAction, type PathwayType, type RowAction, type Use, type UsesView } from "../../contracts/structure.ts";
import { ACTORS, Audit, Db, need, Workspace, type Actor } from "./core.ts";
import { changeView } from "./library-changes.ts";

export const LIFECYCLE_KINDS = ["structure_node", "combination"] as const;
export type LifecycleKind = (typeof LIFECYCLE_KINDS)[number];
export const isLifecycleKind = (k: string): k is LifecycleKind => (LIFECYCLE_KINDS as readonly string[]).includes(k);
const OPEN = ["WAITING", "RETURNED", "APPROVED"]; // a change not yet applied or released: nothing else may start on it
const nameOf = (id: string | null | undefined) => (id ? ACTORS.find((a) => a.id === id)?.name ?? "A person" : null);
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);

type Graph = { nodes: ProgramDef[]; byKey: Map<string, ProgramDef>; kids: (k: string) => ProgramDef[] };
async function graph(db: Db | Prisma.TransactionClient, workspaceId: string): Promise<Graph> {
  const nodes = await db.programDef.findMany({ where: { workspaceId }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] });
  return { nodes, byKey: new Map(nodes.map((n) => [n.programNodeKey, n])), kids: (k) => nodes.filter((n) => n.parentNodeKey === k) };
}
/** The names from the Pathway down to a node (the type tab is the caller's). */
export function trailOf(g: Pick<Graph, "byKey">, key: string): string[] {
  const out: string[] = [];
  for (let n = g.byKey.get(key); n; n = n.parentNodeKey ? g.byKey.get(n.parentNodeKey) : undefined) out.unshift(n.label);
  return out;
}
/** The Pathway type (Retail or Corporate) a node sits under: its Pathway's client type. */
function pathwayTypeOf(g: Pick<Graph, "byKey">, key: string): PathwayType | null {
  for (let n = g.byKey.get(key); n; n = n.parentNodeKey ? g.byKey.get(n.parentNodeKey) : undefined) if (n.nodeKind === "PATHWAY") return (n.clientType as PathwayType) ?? null;
  return null;
}

/** What is known about one name for its lifecycle (P-116, P-128): the names under it, the combinations in that branch
 *  (its own one included) and every key with an open change (structure names by key, combinations by id). */
export type NodeFacts = {
  node: ProgramDef; below: ProgramDef[]; parent: ProgramDef | null;
  combos: { id: string; programDefId: string; released: boolean; retired: boolean }[];
  open: Set<string>;
};
/** The one rule for what a name's row may do, shared by the row (GET /structure) and the proposal (P-128 R3-2):
 *  Delete an unused branch as a whole (R3-4), never anything released (L2) or with a setup draft (L6); Retire a released
 *  name once nothing under it is active, a combination row's own released combination going with it (Lead, 28 Oct);
 *  Restore once the name above is not retired. A reason is why it cannot; null means it can. */
export function nodeCan(f: NodeFacts): UsesView["can"] & { withCombination: string | null } {
  const { node, below, parent, combos, open } = f;
  const own = combos.find((c) => c.programDefId === node.id) ?? null;
  const released = combos.some((c) => c.released);
  const opened = open.has(node.programNodeKey) ? "A change to it is already open." : own && open.has(own.id) ? "A change to its combination is already open." : null;
  const setup = below.find((n) => combos.some((c) => c.programDefId === n.id)); // the first in page order
  const underOpen = below.find((n) => open.has(n.programNodeKey) || combos.some((c) => c.programDefId === n.id && open.has(c.id)));
  const underRetired = below.find((n) => n.retiredAt);
  const active = [...below.filter((n) => !n.retiredAt).map((n) => `"${n.label}" under it`), ...combos.filter((c) => !c.retired && c !== own).map((c) => `the combination "${below.find((n) => n.id === c.programDefId)?.label ?? "under it"}"`)];
  return {
    delete: opened ?? (released ? "It was released to firms, so it is retired, never deleted (L2)." : node.retiredAt ? "It is retired." : own ? "Its setup draft uses it." : setup ? `"${setup.label}" under it has a setup draft.` : underOpen ? `A change to "${underOpen.label}" under it is already open.` : underRetired ? `"${underRetired.label}" under it is retired.` : null),
    retire: opened ?? (node.retiredAt ? "It is already retired." : !released ? "It was never released: delete it instead (L1)." : active.length ? `Still used: ${active.slice(0, 3).join("; ")}${active.length > 3 ? ` and ${active.length - 3} more` : ""}: retire those first (L3).` : null),
    restore: opened ?? (!node.retiredAt ? "It is not retired." : parent?.retiredAt ? `"${parent.label}" above it is retired: restore it first.` : null),
    withCombination: own && (node.retiredAt ? own.retired : !own.retired && own.released) ? own.id : null,
  };
}
/** The row's one action (P-128 R3-2): Withdraw while a change waits, Restore when retired, Retire once released, else
 *  Delete; with why it cannot, and for a Delete the names that go with it. */
export function rowAction(f: NodeFacts, pending: boolean): RowAction {
  const can = nodeCan(f);
  if (pending) return { kind: "WITHDRAW", why: null, below: [], withCombination: false };
  if (f.node.retiredAt) return { kind: "RESTORE", why: can.restore, below: [], withCombination: !!can.withCombination };
  if (f.combos.some((c) => c.released)) return { kind: "RETIRE", why: can.retire, below: [], withCombination: !!can.withCombination };
  return { kind: "DELETE", why: can.delete, below: can.delete ? [] : f.below.map((n) => n.programNodeKey), withCombination: false };
}

@Injectable()
export class Lifecycle {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  private async pending(workspaceId: string, kind: LifecycleKind, key: string) {
    return this.db.libraryChange.findFirst({ where: { workspaceId, kind, key, status: { in: OPEN } }, orderBy: { proposedAt: "desc" } });
  }
  /** The facts for one name (NodeFacts), read now; `except` leaves out the change being approved. */
  async facts(workspaceId: string, g: Graph, key: string, except?: string): Promise<NodeFacts> {
    const node = g.byKey.get(key)!;
    const below = (k: string): ProgramDef[] => g.kids(k).flatMap((c) => [c, ...below(c.programNodeKey)]);
    const under = below(key);
    const ids = [node, ...under].map((n) => n.id);
    const combos = (await this.db.combination.findMany({ where: { workspaceId, programDefId: { in: ids } }, select: { id: true, programDefId: true, retiredAt: true, _count: { select: { releases: true } } } }))
      .map((c) => ({ id: c.id, programDefId: c.programDefId, released: c._count.releases > 0, retired: !!c.retiredAt }));
    const open = await this.db.libraryChange.findMany({ where: { workspaceId, status: { in: OPEN }, ...(except ? { id: { not: except } } : {}), OR: [{ kind: "structure_node", key: { in: [node, ...under].map((n) => n.programNodeKey) } }, { kind: "combination", key: { in: combos.map((c) => c.id) } }] }, select: { key: true } });
    return { node, below: under, parent: node.parentNodeKey ? g.byKey.get(node.parentNodeKey) ?? null : null, combos, open: new Set(open.map((o) => o.key)) };
  }

  /** Where a structure name is used (L3, L6): names under it, the combination on it and those below it, their releases
   *  and open cases. Retire is refused while a name or combination below it is not retired; open cases and earlier
   *  releases are listed but do not block (L3); delete needs it never released and used nowhere (L1). */
  async nodeUses(key: string): Promise<UsesView> {
    const workspaceId = await this.ws.id();
    const g = await graph(this.db, workspaceId);
    const node = g.byKey.get(key);
    if (!node) throw problem(404, "Not found", "That name is not in the Structure (it may have been removed or reset).");
    const below = (k: string): ProgramDef[] => g.kids(k).flatMap((c) => [c, ...below(c.programNodeKey)]);
    const subtree = [node, ...below(key)];
    const combos = await this.db.combination.findMany({ where: { workspaceId, programDefId: { in: subtree.map((n) => n.id) } }, select: { id: true, label: true, programDefId: true, retiredAt: true, releases: { select: { version: true }, orderBy: { version: "desc" }, take: 1 }, _count: { select: { cases: true } } } });
    // The decision is nodeCan's (shared with the row); this list says, line by line, what is under it and what uses it.
    const f = await this.facts(workspaceId, g, key);
    const { withCombination, ...can } = nodeCan(f);
    const uses: Use[] = [];
    for (const c of g.kids(key)) uses.push({ kind: "child", label: trailOf(g, c.programNodeKey).join(" › "), href: `/structure?node=${encodeURIComponent(c.programNodeKey)}`, blocks: !c.retiredAt,
      why: c.retiredAt ? `${LEVEL_WORD[LEVEL_OF[c.nodeKind]]} under it, retired` : `${LEVEL_WORD[LEVEL_OF[c.nodeKind]]} under it: deleted with it if nothing is used; retire it first to retire this one` });
    for (const c of combos) {
      const at = g.nodes.find((n) => n.id === c.programDefId)!;
      const trail = trailOf(g, at.programNodeKey).join(" › ");
      const mine = c.id === withCombination;
      uses.push({ kind: "combination", label: trail, href: `/c/${c.id}`, blocks: !c.retiredAt && !mine, why: c.retiredAt ? "Combination, retired" : mine ? `Its combination: ${node.retiredAt ? "restored" : "retired"} with it` : c.releases.length ? "Combination released to firms: retire it first" : "Combination with a setup draft: it can't be deleted" });
      if (c.releases.length) uses.push({ kind: "release", label: `${trail} · Release ${c.releases[0].version}`, href: `/c/${c.id}`, blocks: false, why: "Kept by earlier releases (never changed)" });
      if (c._count.cases) uses.push({ kind: "case", label: `${trail} · ${c._count.cases} case${c._count.cases === 1 ? "" : "s"}`, href: null, blocks: false, why: "Open cases keep their release" });
    }
    const p = await this.pending(workspaceId, "structure_node", key);
    if (p) uses.push({ kind: "draft_change", label: `${p.action[0]}${p.action.slice(1).toLowerCase()} waiting (${p.status.toLowerCase()})`, href: `/review/change/${p.id}`, blocks: true, why: "A change to it is already open: approve, return or withdraw it first" });
    const released = combos.some((c) => c.releases.length > 0);
    return { key, label: node.label, trail: trailOf(g, key), retired: !!node.retiredAt, released, uses, can, withCombination: !!withCombination, pending: p ? { id: p.id, action: p.action as LifecycleAction, by: nameOf(p.proposedBy) } : null, history: await this.history(workspaceId, key) };
  }

  /** Where a combination is used (addendum A2): its own releases do not count as a use of itself, so a Live combination
   *  can be retired; the release that carries the retire stops new cases, open cases keep their pin. */
  async combinationUses(id: string): Promise<UsesView> {
    const workspaceId = await this.ws.id();
    const c = await this.db.combination.findFirst({ where: { id, workspaceId }, include: { program: true, releases: { select: { version: true }, orderBy: { version: "desc" } }, _count: { select: { cases: true } } } });
    if (!c) throw problem(404, "Not found", "That combination does not exist (it may have been removed or reset).");
    const g = await graph(this.db, workspaceId);
    const trail = trailOf(g, c.program.programNodeKey);
    const uses: Use[] = [];
    if (c.releases.length) uses.push({ kind: "release", label: `Release ${c.releases.map((r) => r.version).join(", ")}`, href: `/c/${c.id}`, blocks: false, why: "Kept by earlier releases (never changed)" });
    if (c._count.cases) uses.push({ kind: "case", label: `${c._count.cases} case${c._count.cases === 1 ? "" : "s"}`, href: null, blocks: false, why: "Open cases keep their release" });
    const p = await this.pending(workspaceId, "combination", id);
    if (p) uses.push({ kind: "draft_change", label: `${p.action[0]}${p.action.slice(1).toLowerCase()} waiting (${p.status.toLowerCase()})`, href: `/review/change/${p.id}`, blocks: true, why: "A change to it is already open: approve, return or withdraw it first" });
    const released = c.releases.length > 0;
    const can = {
      delete: p ? "A change to it is already open." : released ? "It was released to firms, so it is retired, never deleted (L2)." : c._count.cases ? "It has cases." : c.retiredAt ? "It is retired." : null,
      retire: p ? "A change to it is already open." : c.retiredAt ? "It is already retired." : !released ? "It was never released: delete it instead (L1)." : null,
      restore: p ? "A change to it is already open." : !c.retiredAt ? "It is not retired." : c.program.retiredAt ? `"${c.program.label}" is retired: restore it on the Structure first.` : null,
    };
    return { key: id, label: c.label, trail, retired: !!c.retiredAt, released, uses, can, pending: p ? { id: p.id, action: p.action as LifecycleAction, by: nameOf(p.proposedBy) } : null, history: await this.history(workspaceId, id, false) };
  }

  /** A name's or combination's own Activity lines, newest first (the detail panel's History). */
  private async history(workspaceId: string, key: string, node = true) {
    // A rename also writes one line per combination below it (for its draft authors): the name's own lines only.
    const rows = await this.db.auditEvent.findMany({ where: { workspaceId, entityKey: key, ...(node ? { combinationId: null } : {}) }, orderBy: { at: "desc" }, take: 10, select: { at: true, actor: true, summary: true } });
    return rows.map((r) => ({ at: r.at.toISOString(), by: nameOf(r.actor) ?? (r.actor === "system" ? "The studio" : r.actor), what: r.summary }));
  }

  private async usesOf(kind: LifecycleKind, key: string) { return kind === "structure_node" ? this.nodeUses(key) : this.combinationUses(key); }
  private refusal(u: UsesView, action: LifecycleAction) { return action === "DELETE" ? u.can.delete : action === "RETIRE" ? u.can.retire : u.can.restore; }

  /** Delete, retire or restore proposed by an author: checked now, waiting for a different person (L4). */
  async propose(actor: Actor, kind: LifecycleKind, key: string, action: LifecycleAction, reason: string) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const u = await this.usesOf(kind, key);
    const no = this.refusal(u, action);
    if (no) throw problem(409, `Cannot ${action.toLowerCase()}`, no, { uses: u.uses });
    // QA-51 (BR-7): the trail starts with the Pathway type, as on the Structure: both types can hold the same names.
    const at = kind === "structure_node" ? key : (await this.db.combination.findUnique({ where: { id: key }, select: { program: { select: { programNodeKey: true } } } }))?.program.programNodeKey;
    const type = at ? pathwayTypeOf(await graph(this.db, workspaceId), at) : null;
    const label = [...(type ? [PATHWAY_TYPE_LABEL[type]] : []), ...u.trail].join(" › ");
    // What the approver approves, stored with the change (Lead, 28 Oct): a Delete lists every name of its branch (R3-4);
    // a combination row's Retire or Restore names the combination that goes with it.
    let matches: string[] = [];
    if (kind === "structure_node") {
      const g = await graph(this.db, workspaceId), f = await this.facts(workspaceId, g, key), withC = nodeCan(f).withCombination;
      matches = action === "DELETE" ? [key, ...f.below.map((n) => n.programNodeKey)] : withC ? [`combination:${withC}`] : [];
    }
    const c = await this.db.libraryChange.create({ data: { workspaceId, kind, key, label, action, reason, status: "WAITING", proposedBy: actor.id, combinationId: kind === "combination" ? key : null, matches } });
    // Two proposals at the same moment: the older one stands, the newer one is withdrawn and the caller is told.
    const open = await this.db.libraryChange.findMany({ where: { workspaceId, kind, key, status: { in: OPEN } }, orderBy: [{ proposedAt: "asc" }, { id: "asc" }] });
    if (open[0]?.id !== c.id) {
      await this.db.libraryChange.update({ where: { id: c.id }, data: { status: "WITHDRAWN", decisionNote: "Another change to it was proposed at the same moment." } });
      throw problem(409, "Already open", "Another change to it was proposed at the same moment: see it on To review.", { uses: u.uses });
    }
    await this.audit.log(workspaceId, actor.id, "proposed", kind === "structure_node" ? "structure" : "combination", key, `${actor.name} proposed to ${action.toLowerCase()} "${label}": ${reason}`, undefined, kind === "combination" ? key : undefined);
    return changeView(c);
  }

  /** Checked again when a second person approves: something may have started using it since it was proposed. */
  async checkApprove(c: LibraryChange) {
    if (!isLifecycleKind(c.kind)) return;
    const u = await this.usesOf(c.kind, c.key).catch(() => null);
    if (!u) throw problem(409, "No longer there", "It was deleted meanwhile: return this change.");
    const others = { ...u, uses: u.uses.filter((x) => x.kind !== "draft_change"), can: { delete: null, retire: null, restore: null } as UsesView["can"] };
    const again = c.kind === "structure_node" ? await this.recheckNode(c) : await this.recheckCombination(c, others);
    if (again) throw problem(409, "No longer allowed", `${again} Return this change with that reason.`, { uses: u.uses });
  }
  /** The same rule as the proposal (nodeCan), read again without this change; a Delete also refuses a branch that holds
   *  a name it did not list (R3-4: approval deletes exactly what was proposed). */
  private async recheckNode(c: LibraryChange) {
    const g = await graph(this.db, c.workspaceId), f = await this.facts(c.workspaceId, g, c.key, c.id), can = nodeCan(f);
    if (c.action === "DELETE") {
      const listed = new Set(Array.isArray(c.matches) && c.matches.length ? (c.matches as string[]) : [c.key]);
      const extra = f.below.find((n) => !listed.has(n.programNodeKey));
      if (extra) return `Changed since it was proposed: "${extra.label}" was added under it.`;
      return can.delete ? `Used meanwhile: ${can.delete}` : null;
    }
    if (c.action === "RETIRE") return can.retire ? `Used meanwhile: ${can.retire}` : null;
    return can.restore;
  }
  private async recheckCombination(c: LibraryChange, u: UsesView) {
    if (c.action === "DELETE") return u.released ? "It was released meanwhile." : u.uses.some((x) => x.kind === "case") ? "It has cases now." : null;
    return null;
  }

  /** After approval: a delete is applied at once (L1: never released, used nowhere). Retire and restore wait for the
   *  release (publishLifecycle). */
  async afterApprove(actor: Actor, c: LibraryChange) {
    if (!isLifecycleKind(c.kind) || c.action !== "DELETE") return;
    let gone = 1;
    await this.db.$transaction(async (tx) => {
      if (c.kind === "structure_node") {
        // R3-4: exactly the listed branch, leaves first, all or nothing; a setup or a name added meanwhile stops it all.
        const listed = Array.isArray(c.matches) && c.matches.length ? (c.matches as string[]) : [c.key];
        const g = await graph(tx, c.workspaceId);
        const under = (k: string): ProgramDef[] => g.kids(k).flatMap((x) => [x, ...under(x.programNodeKey)]);
        const branch = [g.byKey.get(c.key), ...under(c.key)].filter((n): n is ProgramDef => !!n);
        if (branch.some((n) => !listed.includes(n.programNodeKey)) || await tx.combination.count({ where: { programDefId: { in: branch.map((n) => n.id) } } }))
          throw problem(409, "No longer allowed", "Changed since it was proposed: return this change.");
        const depth = (n: ProgramDef) => { let d = 0; for (let x = n; x.parentNodeKey; x = g.byKey.get(x.parentNodeKey)!) d++; return d; };
        for (const n of [...branch].sort((a, b) => depth(b) - depth(a))) await tx.programDef.delete({ where: { id: n.id } });
        gone = branch.length;
      } else {
        const subs = (await tx.reviewSubmission.findMany({ where: { combinationId: c.key }, select: { id: true } })).map((s) => s.id);
        await tx.reviewSignoff.deleteMany({ where: { submissionId: { in: subs } } });
        await tx.reviewSubmission.deleteMany({ where: { id: { in: subs } } });
        await tx.intakeItem.updateMany({ where: { combinationId: c.key }, data: { combinationId: null } });
        await tx.combination.delete({ where: { id: c.key } });
      }
      await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", decisionNote: c.decisionNote ?? "Deleted at approval (never released)." } });
    });
    await this.audit.log(c.workspaceId, actor.id, "deleted", c.kind === "structure_node" ? "structure" : "combination", c.key, `${actor.name} approved deleting "${c.label ?? c.key}"${gone > 1 ? ` and the ${gone - 1} names under it` : ""}: deleted (never released, used nowhere)`);
  }

}

/** The author withdraws an open change (the Undo of L1, while it is waiting, returned, or approved and not yet
 *  released). Reached through POST /library/changes/:id/withdraw (library-changes.ts withdrawChange). */
export async function withdrawLifecycle(db: Db, actor: Actor, c: LibraryChange, note?: string) {
  need(actor, "author");
  const why = (note ?? "").trim();
  if (why.length < 3 || why.length > 300) throw problem(400, "Say why", "Say why it is withdrawn (3 to 300 characters).");
  const done = await db.libraryChange.updateMany({ where: { id: c.id, status: { in: OPEN } }, data: { status: "WITHDRAWN", decidedBy: actor.id, decidedAt: new Date(), decisionNote: why } });
  if (!done.count) throw problem(409, "Cannot withdraw", `This change is ${c.status.toLowerCase()}: nothing to withdraw.`);
  await db.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: "withdrawn", entity: c.kind === "structure_node" ? "structure" : "combination", entityKey: c.key, summary: `${actor.name} withdrew "${c.action.toLowerCase()} ${c.label ?? c.key}": ${why}`.slice(0, 600) } });
  return changeView((await db.libraryChange.findUnique({ where: { id: c.id } }))!);
}

/** Called by the one library publisher inside the release transaction: an approved retire or restore of a structure
 *  name or a combination takes effect with this release. Returns false for any other kind. */
export async function publishLifecycle(tx: Prisma.TransactionClient, c: LibraryChange): Promise<boolean> {
  if (!isLifecycleKind(c.kind) || (c.action !== "RETIRE" && c.action !== "RESTORE")) return false;
  const data = c.action === "RETIRE" ? { retiredAt: new Date(), retiredBy: c.proposedBy } : { retiredAt: null, retiredBy: null };
  if (c.kind === "structure_node") {
    await tx.programDef.updateMany({ where: { workspaceId: c.workspaceId, programNodeKey: c.key }, data });
    // A combination row's own combination goes with its name (P-128, Lead 28 Oct), named in the change when proposed.
    const withC = (Array.isArray(c.matches) ? (c.matches as string[]) : []).find((m) => m.startsWith("combination:"))?.slice("combination:".length);
    if (withC) await tx.combination.updateMany({ where: { id: withC, workspaceId: c.workspaceId }, data });
  } else await tx.combination.updateMany({ where: { id: c.key, workspaceId: c.workspaceId }, data });
  return true;
}
