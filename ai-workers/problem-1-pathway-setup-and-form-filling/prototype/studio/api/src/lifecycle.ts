// P-116 (P-52 L1–L6 on every master), built with W1-03 and reused by W1-06, W1-08 and W1-09 (WAVE-1): the one guard
// for removing, retiring and restoring structure names and combinations, and the "where used" list shown before any
// action (addendum A1, A2). Each action is a LibraryChange (kind structure_node or combination) that a different person
// approves on To review (L4): an approved delete is applied at once (L1); an approved retire or restore is published by
// the next release (publishLifecycle, called by the one library publisher). Reorder is not here: it applies at once
// with an audit line (Lead, 26 Oct), in api/src/structure.ts.
import { HttpException, Inject, Injectable } from "@nestjs/common";
import type { LibraryChange, Prisma, ProgramDef } from "@prisma/client";
import { LEVEL_OF, LEVEL_WORD, type LifecycleAction, type Use, type UsesView } from "../../contracts/structure.ts";
import { ACTORS, Audit, Db, need, Workspace, type Actor } from "./core.ts";
import { changeView } from "./library-changes.ts";
import { formUses } from "./form-uses.ts";
import { newestEdition } from "../../engine/programs.ts";

// S4 (m2): "library_form" is a Shared library › Forms entry, keyed by its form number (api/src/form-library.ts formUses).
export const LIFECYCLE_KINDS = ["structure_node", "combination", "library_form"] as const;
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

@Injectable()
export class Lifecycle {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  private async pending(workspaceId: string, kind: LifecycleKind, key: string) {
    return this.db.libraryChange.findFirst({ where: { workspaceId, kind, key, status: { in: OPEN } }, orderBy: { proposedAt: "desc" } });
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
    const uses: Use[] = [];
    for (const c of g.kids(key)) uses.push({ kind: "child", label: trailOf(g, c.programNodeKey).join(" › "), href: `/structure?node=${encodeURIComponent(c.programNodeKey)}`, blocks: !c.retiredAt,
      why: c.retiredAt ? `${LEVEL_WORD[LEVEL_OF[c.nodeKind]]} under it, retired` : `${LEVEL_WORD[LEVEL_OF[c.nodeKind]]} under it: remove or retire it first` });
    for (const c of combos) {
      const at = g.nodes.find((n) => n.id === c.programDefId)!;
      const trail = trailOf(g, at.programNodeKey).join(" › ");
      uses.push({ kind: "combination", label: trail, href: `/c/${c.id}`, blocks: !c.retiredAt, why: c.retiredAt ? "Combination, retired" : c.releases.length ? "Combination released to firms: retire it first" : "Combination with setup: remove it first" });
      if (c.releases.length) uses.push({ kind: "release", label: `${trail} · Release ${c.releases[0].version}`, href: `/c/${c.id}`, blocks: false, why: "Kept by earlier releases (never changed)" });
      if (c._count.cases) uses.push({ kind: "case", label: `${trail} · ${c._count.cases} case${c._count.cases === 1 ? "" : "s"}`, href: null, blocks: false, why: "Open cases keep their release" });
    }
    const p = await this.pending(workspaceId, "structure_node", key);
    if (p) uses.push({ kind: "draft_change", label: `${p.action[0]}${p.action.slice(1).toLowerCase()} waiting (${p.status.toLowerCase()})`, href: `/review/change/${p.id}`, blocks: true, why: "A change to it is already open: approve, return or withdraw it first" });
    const released = combos.some((c) => c.releases.length > 0);
    const blocking = uses.filter((u) => u.blocks);
    const parent = node.parentNodeKey ? g.byKey.get(node.parentNodeKey) : null;
    const can = {
      delete: p ? "A change to it is already open." : released ? "It was released to firms, so it is retired, never deleted (L2)." : g.kids(key).length ? "Names are under it: remove them first (L6)." : combos.length ? "Its combination has setup: remove the combination first (L6)." : node.retiredAt ? "It is retired." : null,
      retire: p ? "A change to it is already open." : node.retiredAt ? "It is already retired." : !released ? "It was never released: remove it instead (L1)." : blocking.length ? `Still used: ${blocking.slice(0, 3).map((u) => u.label).join("; ")}${blocking.length > 3 ? ` and ${blocking.length - 3} more` : ""} (L3).` : null,
      restore: p ? "A change to it is already open." : !node.retiredAt ? "It is not retired." : parent?.retiredAt ? `"${parent.label}" above it is retired: restore it first.` : null,
    };
    return { key, label: node.label, trail: trailOf(g, key), retired: !!node.retiredAt, released, uses, can, pending: p ? { id: p.id, action: p.action as LifecycleAction, by: nameOf(p.proposedBy) } : null, history: await this.history(workspaceId, key) };
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
      retire: p ? "A change to it is already open." : c.retiredAt ? "It is already retired." : !released ? "It was never released: remove it instead (L1)." : null,
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

  private async usesOf(kind: LifecycleKind, key: string) { return kind === "structure_node" ? this.nodeUses(key) : kind === "library_form" ? formUses(this.db, await this.ws.id(), key) : this.combinationUses(key); }
  private refusal(u: UsesView, action: LifecycleAction) { return action === "DELETE" ? u.can.delete : action === "RETIRE" ? u.can.retire : u.can.restore; }

  /** Delete, retire or restore proposed by an author: checked now, waiting for a different person (L4). */
  async propose(actor: Actor, kind: LifecycleKind, key: string, action: LifecycleAction, reason: string) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const u = await this.usesOf(kind, key);
    const no = this.refusal(u, action);
    if (no) throw problem(409, `Cannot ${action.toLowerCase()}`, no, { uses: u.uses });
    const label = kind === "structure_node" ? u.trail.join(" › ") : kind === "library_form" ? u.label : `${u.trail.join(" › ")}`;
    const c = await this.db.libraryChange.create({ data: { workspaceId, kind, key, label, action, reason, status: "WAITING", proposedBy: actor.id, combinationId: kind === "combination" ? key : null } });
    // Two proposals at the same moment: the older one stands, the newer one is withdrawn and the caller is told.
    const open = await this.db.libraryChange.findMany({ where: { workspaceId, kind, key, status: { in: OPEN } }, orderBy: [{ proposedAt: "asc" }, { id: "asc" }] });
    if (open[0]?.id !== c.id) {
      await this.db.libraryChange.update({ where: { id: c.id }, data: { status: "WITHDRAWN", decisionNote: "Another change to it was proposed at the same moment." } });
      throw problem(409, "Already open", "Another change to it was proposed at the same moment: see it on To review.", { uses: u.uses });
    }
    await this.audit.log(workspaceId, actor.id, "proposed", kind === "structure_node" ? "structure" : kind === "library_form" ? "form" : "combination", key, `${actor.name} proposed to ${action.toLowerCase()} "${label}": ${reason}`, undefined, kind === "combination" ? key : undefined);
    return changeView(c);
  }

  /** Checked again when a second person approves: something may have started using it since it was proposed. */
  async checkApprove(c: LibraryChange) {
    if (!isLifecycleKind(c.kind)) return;
    const u = await this.usesOf(c.kind, c.key).catch(() => null);
    if (!u) throw problem(409, "No longer there", "It was removed meanwhile: return this change.");
    const others = { ...u, uses: u.uses.filter((x) => x.kind !== "draft_change"), can: { delete: null, retire: null, restore: null } as UsesView["can"] };
    const again = c.kind === "combination" ? await this.recheckCombination(c, others) : await this.recheckNode(c, others); // a library form is checked like a name: released, or used
    if (again) throw problem(409, "No longer allowed", `${again} Return this change with that reason.`, { uses: u.uses });
  }
  private async recheckNode(c: LibraryChange, u: UsesView) {
    const blocking = u.uses.filter((x) => x.blocks);
    if (c.action === "DELETE") return u.released ? "It was released meanwhile." : blocking.length ? `Used meanwhile: ${blocking[0].label}.` : null;
    if (c.action === "RETIRE") return blocking.length ? `Used meanwhile: ${blocking[0].label}.` : null;
    return null;
  }
  private async recheckCombination(c: LibraryChange, u: UsesView) {
    if (c.action === "DELETE") return u.released ? "It was released meanwhile." : u.uses.some((x) => x.kind === "case") ? "It has cases now." : null;
    return null;
  }

  /** C11.18: the approved channels go on the form's current edition, "Set by a person · Sample" (the expert confirms later). */
  private async applyAccepts(actor: Actor, c: LibraryChange) {
    const m = c.matches as { channels?: string; quote?: string | null; reason?: string | null };
    const def = await this.db.govFormDef.findFirst({ where: { workspaceId: c.workspaceId, formKey: c.key }, include: { editions: true } });
    const current = def ? newestEdition(def.editions.filter((e) => e.channel !== "ONLINE")) ?? null : null;
    await this.db.$transaction(async (tx) => {
      if (current) await tx.formEdition.update({ where: { id: current.id }, data: { acceptedChannels: m.channels ?? null, acceptedBasis: "PERSON_SAMPLE", acceptedQuote: m.quote ?? `Set by a person: ${m.reason ?? ""}`.slice(0, 400) } });
      await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", decisionNote: c.decisionNote ?? "Applied at approval (what IRCC accepts; Sample until the expert confirms)." } });
    });
    await this.audit.log(c.workspaceId, actor.id, "approved", "form", c.key, `${actor.name} approved what IRCC accepts for ${c.key}: ${c.label ?? ""}`);
  }

  /** After approval: a delete is applied at once (L1: never released, used nowhere). Retire and restore wait for the
   *  release (publishLifecycle). */
  async afterApprove(actor: Actor, c: LibraryChange) {
    if (c.kind === "form_accepts") return this.applyAccepts(actor, c);
    if (!isLifecycleKind(c.kind) || c.action !== "DELETE") return;
    await this.db.$transaction(async (tx) => {
      if (c.kind === "structure_node") {
        const n = await tx.programDef.findFirst({ where: { workspaceId: c.workspaceId, programNodeKey: c.key }, include: { combination: true } });
        if (n && !n.combination && !(await tx.programDef.count({ where: { workspaceId: c.workspaceId, parentNodeKey: c.key } }))) await tx.programDef.delete({ where: { id: n.id } });
      } else if (c.kind === "library_form") {
        // Never released and used nowhere (checked again above): its editions and their stored rows go with it.
        const def = await tx.govFormDef.findFirst({ where: { workspaceId: c.workspaceId, formKey: c.key }, include: { editions: { select: { sha256: true } } } });
        if (def && !(await tx.combinationForm.count({ where: { govFormDefId: def.id } }))) {
          await tx.officialDownload.deleteMany({ where: { workspaceId: c.workspaceId, sha256: { in: def.editions.map((e) => e.sha256).filter(Boolean) as string[] } } });
          await tx.govFormDef.delete({ where: { id: def.id } });
        }
      } else {
        const subs = (await tx.reviewSubmission.findMany({ where: { combinationId: c.key }, select: { id: true } })).map((s) => s.id);
        await tx.reviewSignoff.deleteMany({ where: { submissionId: { in: subs } } });
        await tx.reviewSubmission.deleteMany({ where: { id: { in: subs } } });
        await tx.intakeItem.updateMany({ where: { combinationId: c.key }, data: { combinationId: null } });
        await tx.combination.delete({ where: { id: c.key } });
      }
      await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", decisionNote: c.decisionNote ?? "Removed at approval (never released)." } });
    });
    await this.audit.log(c.workspaceId, actor.id, "deleted", c.kind === "structure_node" ? "structure" : c.kind === "library_form" ? "form" : "combination", c.key, `${actor.name} approved removing "${c.label ?? c.key}": removed (never released, used nowhere)`);
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
  if (c.kind === "structure_node") await tx.programDef.updateMany({ where: { workspaceId: c.workspaceId, programNodeKey: c.key }, data });
  else if (c.kind === "library_form") await tx.govFormDef.updateMany({ where: { workspaceId: c.workspaceId, formKey: c.key }, data });
  else await tx.combination.updateMany({ where: { id: c.key, workspaceId: c.workspaceId }, data });
  return true;
}
