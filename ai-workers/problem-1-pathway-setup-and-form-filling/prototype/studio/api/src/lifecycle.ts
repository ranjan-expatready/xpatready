// P-116 (P-52 L1–L6 on every master), built with W1-03 and reused by W1-06, W1-08 and W1-09 (WAVE-1): the one guard
// for removing, retiring and restoring structure names and combinations, and the "where used" list shown before any
// action (addendum A1, A2). Each action is a LibraryChange (kind structure_node or combination) that a different person
// approves on To review (L4): an approved delete is applied at once (L1); an approved retire or restore is published by
// the next release (publishLifecycle, called by the one library publisher). Reorder is not here: it applies at once
// with an audit line (Lead, 26 Oct), in api/src/structure.ts.
import { HttpException, Inject, Injectable } from "@nestjs/common";
import type { FilingChannel, LibraryChange, Prisma, ProgramDef } from "@prisma/client";
import { LEVEL_OF, LEVEL_WORD, PATHWAY_TYPE_LABEL, type LifecycleAction, type PathwayType, type RowAction, type Use, type UsesView } from "../../contracts/structure.ts";
import { ACTORS, Audit, Db, need, Workspace, type Actor } from "./core.ts";
import { actionVerb, changeView } from "./library-changes.ts";
import { applyFills } from "./who-fills.ts";
import { applySupplies } from "./document-supplies.ts";
import { applySets } from "./document-sets.ts";
import { SETS_KIND } from "../../contracts/document-sets.ts";
import { applyMustVerify } from "./must-verify.ts";
import { applyProviders, PROVIDERS_KIND } from "./document-providers.ts"; // C6.14
import { MUST_VERIFY_KIND } from "../../contracts/must-verify.ts";
import { SUPPLIES_KIND } from "../../contracts/document-supplies.ts";
import { applyCondition, COND_KIND } from "./question-condition.ts";
import { applyFormFieldCondition, FORM_FIELD_KIND } from "./form-field-condition.ts";
import { RECHECK, WHY } from "../../contracts/lifecycle.ts";

/** The entity an audit line names for a library change (the same on every line about it). */
const entityOf = (kind: string) => (kind === "structure_node" ? "structure" : kind === "library_form" ? "form" : kind === "field" ? "field" : kind === "document_type" ? "document type" : kind === "section" ? "section" : "combination");
import { formUses, hasApprovedFile } from "./form-uses.ts";
import { applyItem, deleteOwnItem, isItemLifecycle, itemUses, ITEM_OWN_NOTE, recheckItem, undoOwnItem, ITEM_KINDS, type ItemKind } from "./library-items.ts";
import { rememberDeletion } from "./library-deletions.ts";
import { newestEdition } from "../../engine/programs.ts";
import { acceptsOf, allowedChannels, lineOf, notAcceptedWords, notNeededWords, type AcceptRecord } from "../../engine/channels.ts";
import { buildSnapshot } from "../../engine/snapshot.ts";
import type { Channel } from "../../contracts/forms.ts";

// S4 (m2): "library_form" is a Shared library › Forms entry, keyed by its form number (api/src/form-library.ts formUses).
export const LIFECYCLE_KINDS = ["structure_node", "combination", "library_form"] as const;
export type LifecycleKind = (typeof LIFECYCLE_KINDS)[number];
export const isLifecycleKind = (k: string): k is LifecycleKind => (LIFECYCLE_KINDS as readonly string[]).includes(k);
/** C11.9: a shared field or document type (its ADD keeps its own path in library-changes.ts). */
const isItem = (k: string): k is ItemKind => (ITEM_KINDS as readonly string[]).includes(k);
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
  const opened = open.has(node.programNodeKey) ? WHY.waiting : own && open.has(own.id) ? WHY.waitingCombination : null;
  const setup = below.find((n) => combos.some((c) => c.programDefId === n.id)); // the first in page order
  const underOpen = below.find((n) => open.has(n.programNodeKey) || combos.some((c) => c.programDefId === n.id && open.has(c.id)));
  const underRetired = below.find((n) => n.retiredAt);
  const active = [...new Set([...below.filter((n) => !n.retiredAt).map((n) => n.label), ...combos.filter((c) => !c.retired && c !== own).map((c) => below.find((n) => n.id === c.programDefId)?.label ?? node.label)])];
  // What blocks a Retire, said apart (QA-55): a name with a released combination in its branch is retired first; the
  // others were never released: a setup draft is released or discarded first; a branch with no combination at all is
  // deleted first, naming only its top name (its Delete takes the rest).
  const kids = new Map<string, ProgramDef[]>();
  for (const n of below) if (n.parentNodeKey) kids.set(n.parentNodeKey, [...(kids.get(n.parentNodeKey) ?? []), n]);
  const releasedAt = new Set(combos.filter((c) => c.released).map((c) => c.programDefId));
  const wasReleased = (n: ProgramDef): boolean => releasedAt.has(n.id) || (kids.get(n.programNodeKey) ?? []).some(wasReleased);
  const comboAt = new Set(combos.map((c) => c.programDefId));
  const hasCombo = (n: ProgramDef): boolean => comboAt.has(n.id) || (kids.get(n.programNodeKey) ?? []).some(hasCombo);
  const live = below.filter((n) => !n.retiredAt);
  const inUse = [...new Set([...live.filter(wasReleased).map((n) => n.label), ...combos.filter((c) => c.released && !c.retired && c !== own && !live.some((n) => n.id === c.programDefId)).map((c) => below.find((n) => n.id === c.programDefId)?.label ?? node.label)])];
  const drafts = [...new Set(live.filter((n) => comboAt.has(n.id) && !wasReleased(n)).map((n) => n.label))];
  const unusedKeys = new Set(live.filter((n) => !hasCombo(n)).map((n) => n.programNodeKey));
  const unused = [...new Set(live.filter((n) => unusedKeys.has(n.programNodeKey) && !unusedKeys.has(n.parentNodeKey ?? "")).map((n) => n.label))];
  return {
    delete: opened ?? (released ? WHY.released : node.retiredAt ? WHY.retiredNoDelete : own ? WHY.ownSetup : setup ? WHY.setupUnder(setup.label) : underOpen ? WHY.waitingUnder(underOpen.label) : underRetired ? WHY.retiredUnder(underRetired.label) : null),
    retire: opened ?? (node.retiredAt ? WHY.alreadyRetired : !released ? WHY.neverReleased : active.length ? (inUse.length || unused.length || drafts.length ? WHY.stillUsed(inUse, unused, drafts) : WHY.stillUsed(active)) : null),
    restore: opened ?? (!node.retiredAt ? WHY.notRetired : parent?.retiredAt ? WHY.parentRetired(parent.label) : null),
    withCombination: own && (node.retiredAt ? own.retired : !own.retired && own.released) ? own.id : null,
  };
}
/** S3 Start setup (M3): why a last-level name cannot begin its setup: it or a name above it is retired, or a change to it
 *  or a name above it is open (a waiting deletion would then be refused at approval). `chain` runs from the Pathway down
 *  to the name; `open` holds the keys of names with an open change. Null means it can. */
export function startWhy(chain: Pick<ProgramDef, "label" | "retiredAt" | "programNodeKey">[], open: Set<string>): string | null {
  const node = chain[chain.length - 1], above = chain.slice(0, -1).reverse();
  if (!node) return null;
  if (node.retiredAt) return WHY.startRetired;
  const gone = above.find((n) => n.retiredAt);
  if (gone) return WHY.startRetiredAbove(gone.label);
  if (open.has(node.programNodeKey)) return WHY.startWaiting(null);
  const waits = above.find((n) => open.has(n.programNodeKey));
  return waits ? WHY.startWaiting(waits.label) : null;
}
/** The keys of structure names with an open change (waiting, returned or approved and not yet applied). */
export async function openNodeKeys(db: Db | Prisma.TransactionClient, workspaceId: string) {
  return new Set((await db.libraryChange.findMany({ where: { workspaceId, kind: "structure_node", status: { in: OPEN } }, select: { key: true } })).map((c) => c.key));
}

/** An author's own never-approved draft (P-116 amended 28 Oct): deletable, and every name in the branch was added by
 *  this person (names are never approved on their own; once released or used they are not deletable at all). */
export const ownDraft = (f: NodeFacts, actorId: string | undefined) => !!actorId && actorId !== SAMPLE_CREATOR && !nodeCan(f).delete && [f.node, ...f.below].every((n) => n.createdBy === actorId);
/** The creator recorded on names that Load sample added (lead review, 28 Oct): never a person, so never an own draft;
 *  their deletes go to the second person. */
export const SAMPLE_CREATOR = "sample-inputs";
/** The row's one action (P-128 R3-2): Withdraw while a change waits, Restore when retired, Retire once released, else
 *  Delete; with why it cannot, for a Delete the names that go with it, and whether it is deleted at once. */
export function rowAction(f: NodeFacts, pending: { action: LifecycleAction; mine: boolean; status: string; proposer: string } | null, actorId?: string): RowAction {
  const can = nodeCan(f);
  // N7 break B4: the proposer's own waiting change can be withdrawn; anyone else's greys the row (as the Form library).
  if (pending) return pending.mine ? { kind: "WITHDRAW", why: null, below: [], withCombination: false, immediate: false } : { kind: pending.action, why: pending.status === "RETURNED" ? WHY.returnedToOther(pending.proposer) : WHY.waiting, below: [], withCombination: false, immediate: false };
  if (f.node.retiredAt) return { kind: "RESTORE", why: can.restore, below: [], withCombination: !!can.withCombination, immediate: false };
  if (f.combos.some((c) => c.released)) return { kind: "RETIRE", why: can.retire, below: [], withCombination: !!can.withCombination, immediate: false };
  return { kind: "DELETE", why: can.delete, below: can.delete ? [] : f.below.map((n) => n.programNodeKey), withCombination: false, immediate: ownDraft(f, actorId) };
}
const OWN_DRAFT_NOTE = "Deleted at once: the author's own draft, never approved, released or used.";
const RECHECK_UNDONE = "Undone at once.";

/** G-CORE B2: an action whose approval re-check and apply another service owns (the rename door, rename-door.ts). The
 *  service registers itself at start-up, so this file never imports it (no import cycle). */
export type ApprovalHook = { check(c: LibraryChange): Promise<void>; apply(actor: Actor, c: LibraryChange): Promise<void> };
export const APPROVAL_HOOKS = new Map<string, ApprovalHook>();

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
      delete: p ? WHY.waiting : released ? WHY.released : c._count.cases ? WHY.hasCases : c.retiredAt ? WHY.retiredNoDelete : null,
      retire: p ? WHY.waiting : c.retiredAt ? WHY.alreadyRetired : !released ? WHY.neverReleased : null,
      restore: p ? WHY.waiting : !c.retiredAt ? WHY.notRetired : c.program.retiredAt ? `"${c.program.label}" is retired: restore it on the Structure first.` : null,
    };
    return { key: id, label: c.label, trail, retired: !!c.retiredAt, released, uses, can, pending: p ? { id: p.id, action: p.action as LifecycleAction, by: nameOf(p.proposedBy) } : null, history: await this.history(workspaceId, id, false) };
  }

  /** A name's or combination's own Activity lines, newest first (the detail panel's History). */
  private async history(workspaceId: string, key: string, node = true) {
    // A rename also writes one line per combination below it (for its draft authors): the name's own lines only.
    const rows = await this.db.auditEvent.findMany({ where: { workspaceId, entityKey: key, ...(node ? { combinationId: null } : {}) }, orderBy: { at: "desc" }, take: 10, select: { at: true, actor: true, summary: true } });
    return rows.map((r) => ({ at: r.at.toISOString(), by: nameOf(r.actor) ?? (r.actor === "system" ? "The studio" : r.actor), what: r.summary }));
  }

  private async usesOf(kind: LifecycleKind | ItemKind, key: string, actorId?: string) { if (isItem(kind)) return itemUses(this.db, await this.ws.id(), kind, key, undefined, actorId); return kind === "structure_node" ? this.nodeUses(key) : kind === "library_form" ? formUses(this.db, await this.ws.id(), key) : this.combinationUses(key); }
  private refusal(u: UsesView, action: LifecycleAction) { return action === "DELETE" ? u.can.delete : action === "RETIRE" ? u.can.retire : u.can.restore; }

  /** Delete, retire or restore proposed by an author: checked now, waiting for a different person (L4). */
  async propose(actor: Actor, kind: LifecycleKind | ItemKind, key: string, action: LifecycleAction, reason: string) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const u = await this.usesOf(kind, key, actor.id);
    const no = this.refusal(u, action);
    if (no) throw problem(409, `Cannot ${action.toLowerCase()}`, no, { uses: u.uses });
    // C11.9 (P-116 amended, pack 3): the author's own never-released, unused draft is deleted at once, with Undo.
    if (isItem(kind) && action === "DELETE" && u.immediate) {
      const c = await deleteOwnItem(this.db, actor.id, workspaceId, kind, key, u.label, reason);
      await this.audit.log(workspaceId, actor.id, "deleted", entityOf(kind), key, `${actor.name} deleted "${u.label}": their own draft, never approved, released or used`);
      return { ...changeView(c), immediate: true };
    }
    if (kind === "structure_node" && action === "DELETE") {
      const g = await graph(this.db, workspaceId), f = await this.facts(workspaceId, g, key);
      if (ownDraft(f, actor.id)) return this.deleteOwnDraft(actor, workspaceId, g, f, reason);
    }
    let label = u.label, matches: string[] = [];
    if (kind !== "library_form" && !isItem(kind)) {
      // QA-51 (BR-7): the trail starts with the Pathway type, as on the Structure: both types can hold the same names.
      const at = kind === "structure_node" ? key : (await this.db.combination.findUnique({ where: { id: key }, select: { program: { select: { programNodeKey: true } } } }))?.program.programNodeKey;
      const type = at ? pathwayTypeOf(await graph(this.db, workspaceId), at) : null;
      label = [...(type ? [PATHWAY_TYPE_LABEL[type]] : []), ...u.trail].join(" › ");
    }
    // What the approver approves, stored with the change (Lead, 28 Oct): a Delete lists every name of its branch (R3-4);
    // a combination row's Retire or Restore names the combination that goes with it.
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
    await this.audit.log(workspaceId, actor.id, "proposed", entityOf(kind), key, `${actor.name} proposed to ${actionVerb(action, kind)} "${label}": ${reason}`, undefined, kind === "combination" ? key : undefined);
    return changeView(c);
  }

  /** Send again (QA-59): the author answers a returned change and sends it back to a second person, checked by the
   *  same rule as a new proposal (nodeCan, read without this change); a branch delete lists its branch as it is now. */
  async resubmit(actor: Actor, c: LibraryChange, reason: string) {
    need(actor, "author");
    // N7 break B1: only the proposer sends a returned remove, retire or restore again, as only they withdraw it; another
    // author sending it again could then approve it alone (the second-person check knows only the proposer).
    if (c.proposedBy !== actor.id) throw problem(403, "Not yours", `Only the person who proposed a change can send it again. ${ACTORS.find((a) => a.id === c.proposedBy)?.name ?? "Another person"} proposed this one: ask them to correct or withdraw it.`);
    if (c.status !== "RETURNED") throw problem(409, "Not returned", `Only a returned change is sent again; this one is ${c.status.toLowerCase()}.`);
    const why = reason.trim();
    if (why.length < 3 || why.length > 300) throw problem(400, "Say what changed", "Say what changed, for the second person (3 to 300 characters).");
    let matches = Array.isArray(c.matches) ? (c.matches as string[]) : [];
    if (c.kind === "structure_node") {
      const g = await graph(this.db, c.workspaceId);
      if (!g.byKey.get(c.key)) throw problem(409, "No longer there", RECHECK.gone);
      const f = await this.facts(c.workspaceId, g, c.key, c.id), can = nodeCan(f);
      const no = c.action === "DELETE" ? can.delete : c.action === "RETIRE" ? can.retire : can.restore;
      if (no) throw problem(409, `Cannot ${c.action.toLowerCase()}`, no);
      matches = c.action === "DELETE" ? [c.key, ...f.below.map((n) => n.programNodeKey)] : can.withCombination ? [`combination:${can.withCombination}`] : [];
    } else if (c.kind === "library_form") {
      // PR #67 review: a returned form delete, retire or restore is checked again by the form's own rule, leaving this
      // change out of the open-change check (it is the change being sent again), never as a combination.
      const u = await formUses(this.db, c.workspaceId, c.key, c.id).catch(() => null);
      if (!u) throw problem(409, "No longer there", RECHECK.gone);
      const no = c.action === "DELETE" ? u.can.delete : c.action === "RETIRE" ? u.can.retire : u.can.restore;
      if (no) throw problem(409, `Cannot ${actionVerb(c.action, c.kind)}`, no, { uses: u.uses });
      matches = []; // as proposed: a form's change lists nothing with it
    } else if (isItemLifecycle(c)) {
      // C11.9: a shared field's or document type's change is checked again by its own rule, leaving this change out.
      const no = await recheckItem(this.db, c);
      if (no) throw problem(409, `Cannot ${actionVerb(c.action, c.kind)}`, no);
      matches = [];
    } else {
      const u = await this.combinationUses(c.key).catch(() => null);
      if (!u) throw problem(409, "No longer there", RECHECK.gone);
      const no = await this.recheckCombination(c, u);
      if (no) throw problem(409, `Cannot ${c.action.toLowerCase()}`, no);
    }
    const done = await this.db.libraryChange.updateMany({ where: { id: c.id, status: "RETURNED" }, data: { status: "WAITING", reason: why, matches, decidedBy: null, decidedAt: null, version: { increment: 1 }, decisionNote: `Sent again after: ${c.decisionNote ?? "returned"}`.slice(0, 300) } });
    if (!done.count) throw problem(409, "Changed meanwhile", "Someone changed this at the same moment. Refresh to see it.");
    await this.audit.log(c.workspaceId, actor.id, "proposed", entityOf(c.kind), c.key, `${actor.name} sent again ${actionVerb(c.action, c.kind)} "${c.label}": ${why}`, undefined, c.kind === "combination" ? c.key : undefined);
    return changeView((await this.db.libraryChange.findUnique({ where: { id: c.id } }))!);
  }

  /** An author's own draft is deleted at once, branch included, leaves first (P-116 amended): the change is recorded as
   *  done, with every row kept in it so Undo can bring them back exactly. */
  private async deleteOwnDraft(actor: Actor, workspaceId: string, g: Graph, f: NodeFacts, reason: string) {
    const rows = [f.node, ...f.below];
    const depth = (n: ProgramDef) => { let d = 0; for (let x = n; x.parentNodeKey; x = g.byKey.get(x.parentNodeKey)!) d++; return d; };
    const label = [PATHWAY_TYPE_LABEL[(pathwayTypeOf(g, f.node.programNodeKey) ?? "INDIVIDUAL") as PathwayType], ...trailOf(g, f.node.programNodeKey)].join(" › ");
    const c = await this.db.$transaction(async (tx) => {
      if (await tx.combination.count({ where: { programDefId: { in: rows.map((n) => n.id) } } })) throw problem(409, "Cannot delete", WHY.ownSetup);
      for (const n of [...rows].sort((a, b) => depth(b) - depth(a))) await tx.programDef.delete({ where: { id: n.id } });
      return tx.libraryChange.create({ data: { workspaceId, kind: "structure_node", key: f.node.programNodeKey, label, action: "DELETE", reason, status: "RELEASED", proposedBy: actor.id, decidedBy: actor.id, decidedAt: new Date(), decisionNote: OWN_DRAFT_NOTE,
        matches: { keys: rows.map((n) => n.programNodeKey), rows: [...rows].sort((a, b) => depth(a) - depth(b)) } as unknown as Prisma.InputJsonValue } });
    });
    await this.audit.log(workspaceId, actor.id, "deleted", "structure", f.node.programNodeKey, `${actor.name} deleted "${label}"${f.below.length ? ` and the ${f.below.length} names under it` : ""}: their own draft, never approved, released or used`);
    return { ...changeView(c), immediate: true };
  }
  /** Undo of an own-draft delete: the same rows come back, parents first, unless a name now holds one of their places. */
  async undoOwnDelete(actor: Actor, id: string) {
    need(actor, "author");
    const c = await this.db.libraryChange.findUnique({ where: { id } });
    if (c && isItemLifecycle(c) && c.action === "DELETE" && c.decisionNote === ITEM_OWN_NOTE) {
      await undoOwnItem(this.db, actor.id, c);
      await this.audit.log(c.workspaceId, actor.id, "restored", entityOf(c.kind), c.key, `${actor.name} undid deleting "${c.label ?? c.key}": it is back`);
      return changeView((await this.db.libraryChange.findUnique({ where: { id } }))!);
    }
    if (!c || c.kind !== "structure_node" || c.action !== "DELETE" || c.status !== "RELEASED" || c.decisionNote !== OWN_DRAFT_NOTE) throw problem(409, "Cannot undo", "Only a delete of your own draft can be undone here.");
    if (c.proposedBy !== actor.id) throw problem(403, "Not yours", "Only the person who deleted it can undo it.");
    const rows = ((c.matches as { rows?: Record<string, unknown>[] }).rows ?? []) as (ProgramDef & Record<string, unknown>)[];
    await this.db.$transaction(async (tx) => {
      const g = await graph(tx, c.workspaceId);
      const top = rows[0];
      if (rows.some((r) => g.byKey.has(r.programNodeKey))) throw problem(409, "Cannot undo", "A name was added in its place meanwhile: add it again with Add.");
      if (top?.parentNodeKey && (!g.byKey.has(top.parentNodeKey) || g.byKey.get(top.parentNodeKey)!.retiredAt)) throw problem(409, "Cannot undo", "The name above it is gone or retired: add it again with Add.");
      for (const r of rows) await tx.programDef.create({ data: r as unknown as Prisma.ProgramDefUncheckedCreateInput });
      await tx.libraryChange.update({ where: { id }, data: { status: "WITHDRAWN", decisionNote: RECHECK_UNDONE } });
    }).catch((e) => { if ((e as { code?: string }).code === "P2002") throw problem(409, "Cannot undo", "A name was added in its place meanwhile: add it again with Add."); throw e; });
    await this.audit.log(c.workspaceId, actor.id, "restored", "structure", c.key, `${actor.name} undid deleting "${c.label}": it is back`);
    return changeView((await this.db.libraryChange.findUnique({ where: { id } }))!);
  }
  /** ReviewCard (P-116 amended): the approval re-check, run now, so the approver sees it before the click. */
  async recheck(c: LibraryChange): Promise<{ ok: boolean; text: string; kept: string[] } | null> {
    // G-CORE B2: a waiting rename is checked again by its door, said before the click (the same check the approval runs).
    const hook = APPROVAL_HOOKS.get(c.action);
    if (hook) { if (c.status !== "WAITING") return null; try { await hook.check(c); return { ok: true, text: "Checked again just now: nothing blocks it.", kept: [] }; } catch (e) { const b = e instanceof HttpException ? (e.getResponse() as { detail?: string }) : null; return { ok: false, text: (b?.detail ?? "The check could not run: refresh and try again.").replace(/ Return this rename[^.]*\./, ""), kept: [] }; } }
    if ((!isLifecycleKind(c.kind) && !isItemLifecycle(c)) || c.status !== "WAITING") return null;
    const u = await this.usesOf(c.kind as LifecycleKind | ItemKind, c.key).catch(() => null);
    if (!u) return { ok: false, text: RECHECK.gone, kept: [] };
    const others = { ...u, uses: u.uses.filter((x) => x.kind !== "draft_change"), can: { delete: null, retire: null, restore: null } as UsesView["can"] };
    const again = await this.againFor(c, others);
    return { ok: !again, text: again ?? RECHECK.clear, kept: u.uses.filter((x) => !x.blocks && x.kind !== "draft_change").map((x) => x.label) };
  }

  /** Checked again when a second person approves: something may have started using it since it was proposed. */
  async checkApprove(c: LibraryChange) {
    const hook = APPROVAL_HOOKS.get(c.action); if (hook) return hook.check(c); // G-CORE B2: a rename (rename-door.ts)
    // Break m5: what IRCC accepts is approved for the edition it was proposed for; a newer edition since is refused.
    if (c.kind === "form_accepts") {
      const proposed = (c.matches as { edition?: string } | null)?.edition;
      const def = await this.db.govFormDef.findFirst({ where: { workspaceId: c.workspaceId, formKey: c.key }, include: { editions: true } });
      const current = def ? newestEdition(def.editions.filter((e) => e.channel !== "ONLINE")) : null;
      if (proposed && current && current.editionLabel !== proposed) throw problem(409, "A new edition arrived", `This was proposed for ${proposed}; the library's current edition is now ${current.editionLabel}. Return it with that reason, and propose what IRCC accepts for the new edition.`);
      return;
    }
    if (!isLifecycleKind(c.kind) && !isItemLifecycle(c)) return;
    const u = await this.usesOf(c.kind as LifecycleKind | ItemKind, c.key).catch(() => null);
    if (!u) throw problem(409, "No longer there", RECHECK.gone);
    const others = { ...u, uses: u.uses.filter((x) => x.kind !== "draft_change"), can: { delete: null, retire: null, restore: null } as UsesView["can"] };
    const again = await this.againFor(c, others);
    if (again) throw problem(409, "No longer allowed", `${again} Return this change with that reason.`, { uses: u.uses });
  }
  /** The one approval re-check, for the ReviewCard before the click and for the approval itself (P-116 amended). */
  private async againFor(c: LibraryChange, others: UsesView): Promise<string | null> {
    if (c.kind === "structure_node") return this.recheckNode(c);
    if (isItemLifecycle(c)) return recheckItem(this.db, c);
    if (c.kind !== "library_form") return this.recheckCombination(c, others);
    const again = this.recheckForm(c, others);
    // Break round 2 N1: a file of the form approved since the delete was asked is kept (P-51): retire it instead.
    if (!again && c.action === "DELETE") {
      const def = await this.db.govFormDef.findFirst({ where: { workspaceId: c.workspaceId, formKey: c.key }, include: { editions: { select: { sha256: true } } } });
      if (def && (await hasApprovedFile(this.db, c.workspaceId, def.editions.map((e) => e.sha256).filter((x): x is string => !!x)))) return RECHECK.used("Can't delete: its file was approved meanwhile, so it is kept. Retire it instead.");
    }
    return again;
  }
  /** S4: a library form is checked again as it was proposed (P-116): released, or used somewhere it was not before. */
  private recheckForm(c: LibraryChange, u: UsesView) {
    const blocking = u.uses.filter((x) => x.blocks);
    if (c.action === "DELETE") return u.released ? RECHECK.used(WHY.released) : blocking.length ? RECHECK.used(`Can't delete: ${blocking[0].label} uses it.`) : null;
    if (c.action === "RETIRE") { const b = blocking.filter((x) => !x.retireOk); return b.length ? RECHECK.used(WHY.stillUsed([b[0].label])) : null; }
    return null;
  }
  /** The same rule as the proposal (nodeCan), read again without this change; a Delete also refuses a branch that holds
   *  a name it did not list (R3-4: approval deletes exactly what was proposed). */
  private async recheckNode(c: LibraryChange) {
    const g = await graph(this.db, c.workspaceId), f = await this.facts(c.workspaceId, g, c.key, c.id), can = nodeCan(f);
    if (c.action === "DELETE") {
      const listed = new Set(Array.isArray(c.matches) && c.matches.length ? (c.matches as string[]) : [c.key]);
      const extra = f.below.find((n) => !listed.has(n.programNodeKey));
      if (extra) return RECHECK.added(extra.label);
      return can.delete ? RECHECK.used(can.delete) : null;
    }
    if (c.action === "RETIRE") return can.retire ? RECHECK.used(can.retire) : null;
    return can.restore;
  }
  private async recheckCombination(c: LibraryChange, u: UsesView) {
    if (c.action === "DELETE") return u.released ? "It was released meanwhile." : u.uses.some((x) => x.kind === "case") ? "It has cases now." : null;
    return null;
  }

  /** Break M5: what approving a change to what IRCC accepts would break, named before the click: every combination still
   *  in use whose line for the form is filed in a way the new record no longer allows (its release then shows the error
   *  until the line is chosen again). Read for the combination's own IRCC account, as on the Forms tab (C-3). */
  async acceptsImpact(c: LibraryChange): Promise<{ combination: string; label: string; channel: Channel; words: string }[]> {
    const m = c.matches as { account?: string; channels?: string[] };
    if (c.kind !== "form_accepts" || c.status !== "WAITING" || !m.channels?.length) return [];
    const account = m.account ?? "ANY";
    const next: AcceptRecord[] = [...((await acceptsOf(this.db, c.workspaceId)).get(c.key) ?? []).filter((r) => r.account !== account), { account, channels: m.channels as Channel[], basis: "PERSON_SAMPLE", quote: null }];
    const combos = await this.db.combination.findMany({ where: { workspaceId: c.workspaceId, retiredAt: null, forms: { some: { form: { formKey: c.key } } } }, select: { id: true, label: true, portalKey: true }, orderBy: { label: "asc" } });
    const out: { combination: string; label: string; channel: Channel; words: string }[] = [];
    for (const k of combos) {
      const { snapshot } = await buildSnapshot(this.db, c.workspaceId, k.id, "draft");
      const line = (snapshot.forms as { form_number: string; form_kind?: string | null; channel?: string | null; signature?: string | null }[]).find((f) => f.form_number === c.key);
      if (!line || (line.form_kind ?? "data_form") !== "data_form") continue;
      const { channel } = lineOf(line), after = allowedChannels(next, k.portalKey);
      if (after.channels.includes(channel)) continue;
      out.push({ combination: k.id, label: k.label, channel, words: after.record && channel !== "NOT_NEEDED" ? notAcceptedWords(c.key, channel, after.record) : notNeededWords(c.key, k.portalKey) });
    }
    return out;
  }

  /** C11.18 (P-143: per IRCC account): the approved channels go on the form's current edition for that account, "Set by a
   *  person · Sample" (the expert confirms later); a finder proposal (P-140, C-5) keeps its basis, AI_SAMPLE. */
  private async applyAccepts(actor: Actor, c: LibraryChange) {
    const m = c.matches as { account?: string; channels?: string[]; quote?: string | null; reason?: string | null; source?: string; form_page?: string | null };
    const def = await this.db.govFormDef.findFirst({ where: { workspaceId: c.workspaceId, formKey: c.key }, include: { editions: true } });
    const current = def ? newestEdition(def.editions.filter((e) => e.channel !== "ONLINE")) ?? null : null;
    await this.db.$transaction(async (tx) => {
      if (current && m.channels?.length) {
        const account = m.account ?? "ANY", data = { channels: m.channels as FilingChannel[], basis: m.source === "finder" ? "AI_SAMPLE" : "PERSON_SAMPLE", quote: (m.quote ?? `Set by a person: ${m.reason ?? ""}`).slice(0, 400), sourceUrl: m.form_page ?? null, readOn: new Date(), setBy: actor.id, setAt: new Date() };
        await tx.formEditionAccept.upsert({ where: { formEditionId_account: { formEditionId: current.id, account } }, create: { workspaceId: c.workspaceId, formEditionId: current.id, account, ...data }, update: data });
      }
      await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", decisionNote: c.decisionNote ?? "Applied at approval (what IRCC accepts; Sample until the expert confirms)." } });
    });
    await this.audit.log(c.workspaceId, actor.id, "approved", "form", c.key, `${actor.name} approved what IRCC accepts for ${c.key}: ${c.label ?? ""}`);
  }

  /** P-319 (Lead 4 on #833, P-149): a form's role, applied when a second person approves; only from the role it was
   *  proposed against (changed since: refused, the change waits again). The change and its Activity line together. */
  private async applyRole(actor: Actor, c: LibraryChange) {
    const m = c.matches as { from?: string | null; to?: string | null };
    await this.db.$transaction(async (tx) => {
      const moved = await tx.govFormDef.updateMany({ where: { workspaceId: c.workspaceId, formKey: c.key, retiredAt: null, formRole: m.from ?? null }, data: { formRole: m.to ?? null } });
      if (!moved.count) throw problem(409, "Changed meanwhile", `${c.key}'s role is no longer what this change was proposed against (or the form was retired). It still waits: return it, and its proposer withdraws it and proposes again.`);
      await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", decisionNote: c.decisionNote ?? "Applied at approval; each combination's next release names it for the immigration expert." } });
      await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: "approved", entity: "form", entityKey: c.key, summary: `${actor.name} approved ${c.label ?? c.key}: it applies now, and goes out with each combination's next release`.slice(0, 600), detail: { from: m.from ?? null, to: m.to ?? null, change: c.id } } });
    });
  }

  /** After approval: a delete is applied at once (L1: never released, used nowhere). Retire and restore wait for the
   *  release (publishLifecycle). */
  async afterApprove(actor: Actor, c: LibraryChange) {
    const hook = APPROVAL_HOOKS.get(c.action); if (hook) return hook.apply(actor, c); // G-CORE B2: a rename, checked again and applied
    if (c.kind === "form_accepts") return this.applyAccepts(actor, c);
    if (c.kind === "form_role") return this.applyRole(actor, c); // P-319 (Lead 4 on #833): a form's role, at a second person's approval
    if (c.kind === COND_KIND) return applyCondition(this.db, this.audit, actor, c); // C4.11 part 3 (forms lane): a draft question version with its condition
    if (c.kind === FORM_FIELD_KIND) return applyFormFieldCondition(this.db, this.audit, actor, c); // B86: a draft form field holding the condition
    if (c.kind === "placement_fills") return applyFills(this.db, this.audit, actor, c); // C4.9 (runtime lane): a draft placement
    if (c.kind === SUPPLIES_KIND) return applySupplies(this.db, this.audit, actor, c); // C4.5: a draft document type with its facts
    if (c.kind === SETS_KIND) return applySets(this.db, this.audit, actor, c); // C6.15: a draft document type with its substitute sets
    if (c.kind === PROVIDERS_KIND) return applyProviders(this.db, this.audit, actor, c); // C6.14: a draft document type with its provider roles
    if (c.kind === MUST_VERIFY_KIND) return applyMustVerify(this.db, this.audit, actor, c); // C7.9: a draft field with its must-verify flag
    // QA-64, P-116 amended (28 Oct): a library retire or restore takes effect at approval (a structure name or a
    // combination waits for the release). The same check as at a release: a draft listing the form again hands it back.
    if (c.kind === "library_form" && (c.action === "RETIRE" || c.action === "RESTORE")) {
      const done = await this.db.$transaction(async (tx) => {
        if (!(await applyFormLifecycle(tx, c))) return false;
        await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", decisionNote: c.decisionNote ?? (c.action === "RETIRE" ? "Retired at approval: hidden from pickers and AI now; earlier releases and open cases keep it." : "Restored at approval: back in pickers and AI now.") } });
        return true;
      });
      if (done) await this.audit.log(c.workspaceId, actor.id, c.action === "RETIRE" ? "retired" : "restored", "form", c.key, `${actor.name} approved ${actionVerb(c.action, c.kind)} "${c.label ?? c.key}": it takes effect now`);
      return;
    }
    // C11.9: a shared field's or document type's delete, retire or restore is applied at approval (as a library form's).
    if (isItemLifecycle(c)) {
      if (!(await this.db.$transaction((tx) => applyItem(tx, c)))) return;
      const what = c.action === "DELETE" ? "deleted (never released, used nowhere)" : c.action === "RETIRE" ? "retired now: hidden from pickers and AI; earlier releases and open cases keep it" : "restored now: back in pickers and AI";
      await this.audit.log(c.workspaceId, actor.id, c.action === "DELETE" ? "deleted" : c.action === "RETIRE" ? "retired" : "restored", entityOf(c.kind), c.key, `${actor.name} approved ${actionVerb(c.action, c.kind)} "${c.label ?? c.key}": ${what}`);
      return;
    }
    if (!isLifecycleKind(c.kind) || c.action !== "DELETE") return;
    let gone = 1;
    const done = await this.db.$transaction(async (tx) => {
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
      } else if (c.kind === "library_form") {
        // Never released and used nowhere (checked again above): its editions and their stored rows go with it.
        const def = await tx.govFormDef.findFirst({ where: { workspaceId: c.workspaceId, formKey: c.key }, include: { editions: { select: { sha256: true } } } });
        if (def && !(await tx.combinationForm.count({ where: { govFormDefId: def.id } })) && !(await hasApprovedFile(tx, c.workspaceId, def.editions.map((e) => e.sha256).filter((x): x is string => !!x)))) {
          await tx.govFormDef.delete({ where: { id: def.id } });
          // X5 slice c (the tech lead on #138): remembered, so a later fill from IRCC's forms list does not list it again.
          await rememberDeletion(tx, c.workspaceId, c.key, actor.id, c.id);
        } else {
          // Break M1: never report a delete that did not happen. It is handed back with the reason.
          await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RETURNED", decisionNote: "Not deleted: a combination still has a line for this form (perhaps retired), or its file is approved. Retire it instead." } });
          return false;
        }
      } else {
        const subs = (await tx.reviewSubmission.findMany({ where: { combinationId: c.key }, select: { id: true } })).map((s) => s.id);
        await tx.reviewSignoff.deleteMany({ where: { submissionId: { in: subs } } });
        await tx.reviewSubmission.deleteMany({ where: { id: { in: subs } } });
        await tx.intakeItem.updateMany({ where: { combinationId: c.key }, data: { combinationId: null } });
        await tx.combination.delete({ where: { id: c.key } });
        // N8 (F2) break m4: its official-page record goes with it, after the combination's row (review of 7bc2dc02, 1: a
        // confirm holding that row's lock has then finished, so its record cannot land after this delete).
        await tx.officialPagesRecord.deleteMany({ where: { combinationId: c.key } });
      }
      await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", decisionNote: c.decisionNote ?? (c.kind === "library_form" ? "Deleted at approval: it left the library (never released)." : "Deleted at approval (never released).") } });
      return true;
    });
    if (!done) return;
    await this.audit.log(c.workspaceId, actor.id, "deleted", entityOf(c.kind), c.key, c.kind === "library_form" ? `${actor.name} approved deleting "${c.label ?? c.key}": it left the library (never released, used nowhere)` : `${actor.name} approved deleting "${c.label ?? c.key}"${gone > 1 ? ` and the ${gone - 1} names under it` : ""}: deleted (never released, used nowhere)`);
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
  await db.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: "withdrawn", entity: entityOf(c.kind), entityKey: c.key, summary: `${actor.name} withdrew "${actionVerb(c.action, c.kind)} ${c.label ?? c.key}": ${why}`.slice(0, 600) } });
  return changeView((await db.libraryChange.findUnique({ where: { id: c.id } }))!);
}

/** A library form's retire or restore, applied (at approval since QA-64; at the release for one approved before). Checked
 *  again first (round 3 major): a draft that lists the form again keeps it, and the retire goes back, said in History. */
async function applyFormLifecycle(tx: Prisma.TransactionClient, c: LibraryChange, at: "approval" | "release" = "approval"): Promise<boolean> {
  const data = c.action === "RETIRE" ? { retiredAt: new Date(), retiredBy: c.proposedBy } : { retiredAt: null, retiredBy: null };
  if (c.action === "RETIRE") {
    const using = await tx.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM (SELECT DISTINCT ON (f.combination_id, f.lineage_key) f.status FROM combination_form f JOIN gov_form_def d ON d.id = f.gov_form_def_id WHERE d.workspace_id = ${c.workspaceId}::uuid AND d.form_key = ${c.key} ORDER BY f.combination_id, f.lineage_key, f.version DESC) x WHERE x.status <> 'RETIRED'`;
    if (Number(using[0]?.n ?? 0) > 0) {
      const note = "Not retired: a combination lists this form again. Remove it there, then ask again.";
      await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RETURNED", decisionNote: note } });
      await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: "system", action: "returned", entity: "form", entityKey: c.key, summary: `The ${at} did not retire ${c.key}: ${note}` } }); // round 4 R4-3
      return false;
    }
  }
  await tx.govFormDef.updateMany({ where: { workspaceId: c.workspaceId, formKey: c.key }, data });
  return true;
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
  } else if (c.kind === "library_form") {
    // A form's change approved before QA-64 (retire at approval) still takes effect with the release, by the same rule.
    if (!(await applyFormLifecycle(tx, c, "release"))) return false;
  } else await tx.combination.updateMany({ where: { id: c.key, workspaceId: c.workspaceId }, data });
  return true;
}
