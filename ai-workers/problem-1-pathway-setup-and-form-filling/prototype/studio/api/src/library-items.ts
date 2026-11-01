// C11.9 (P-116, Screen 04 BR-8 to BR-10): delete, retire and restore of a shared field or a document type, with where
// used first. The one guard (api/src/lifecycle.ts) calls itemUses for the decision and applyItem at approval; the
// LibraryChange (kind field or document_type, action DELETE, RETIRE or RESTORE) waits for a different person. As for
// library forms (QA-64, P-116 amended 28 Oct), an approved retire or restore takes effect at approval; an approved
// delete removes the never-released item at once (L1). A field's ADD keeps its own path (library-changes.ts).
import { HttpException } from "@nestjs/common";
import type { LibraryChange, Prisma } from "@prisma/client";
import type { Use, UsesView } from "../../contracts/structure.ts";
import { WHY } from "../../contracts/lifecycle.ts";
import { normalizeLabel } from "../../contracts/programs.ts";
import { ACTORS, type Db } from "./core.ts";
import { combinationTrails } from "./form-uses.ts";
import { current, LibrarySources } from "./library-sources.ts";

export const ITEM_KINDS = ["field", "document_type"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];
const LIFECYCLE_ACTIONS = ["DELETE", "RETIRE", "RESTORE"];
/** A delete, retire or restore of a shared field or document type (never a field's ADD, which keeps its own path). */
export const isItemLifecycle = (c: Pick<LibraryChange, "kind" | "action">) => (ITEM_KINDS as readonly string[]).includes(c.kind) && LIFECYCLE_ACTIONS.includes(c.action);
const OPEN = ["WAITING", "RETURNED", "APPROVED"];
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
const nameOf = (id: string | null | undefined) => (id ? ACTORS.find((a) => a.id === id)?.name ?? "A person" : null);
const fieldWord = (key: string) => { const w = (key.split(".").pop() ?? key).replace(/_/g, " "); return w.charAt(0).toUpperCase() + w.slice(1); };

type Version = { id: string; status: string; version: number };
async function versionsOf(db: Db | Prisma.TransactionClient, kind: ItemKind, workspaceId: string, key: string) {
  if (kind === "field") return (await db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" }, select: { id: true, status: true, version: true, label: true, labelChecked: true, mergedIntoKey: true, groupKey: true } })).map((r) => ({ ...r, name: (r.labelChecked && r.label) || fieldWord(key) }));
  return (await db.documentType.findMany({ where: { workspaceId, documentTypeKey: key }, orderBy: { version: "desc" }, select: { id: true, status: true, version: true, name: true } }));
}
/** Its state from its versions: released once any version left draft; retired when no version is published or draft. */
/** Break round 2 (Major 1): every action of an item is serialised on one advisory lock, taken inside the transaction
 *  that checks it and writes: the approval (applyItem) and each write that gives it a new use (refuseRetired callers). */
export async function lockItem(tx: Prisma.TransactionClient, workspaceId: string, kind: ItemKind, keys: (string | null | undefined)[]) {
  for (const key of [...new Set(keys.filter((k): k is string => !!k))].sort()) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`library-item:${workspaceId}:${kind}:${key}`}))::text AS locked`;
}
export const stateOf = (v: Version[]) => ({ released: v.some((r) => r.status !== "DRAFT"), retired: v.some((r) => r.status === "RETIRED") && !v.some((r) => r.status === "PUBLISHED" || r.status === "DRAFT"), draft: v.some((r) => r.status === "DRAFT") });

/** Where a shared field or document type is used (L3, L6), and what may be done with it now. `except` leaves one change
 *  out of the open-change check (the returned change being sent again, or the one being approved). */
export async function itemUses(db: Db, workspaceId: string, kind: ItemKind, key: string, except?: string): Promise<UsesView> {
  const versions = await versionsOf(db, kind, workspaceId, key);
  if (!versions.length) throw problem(404, "Not in the library", `${key} is not in the shared library (it may have been deleted or reset).`);
  const name = versions[0].name;
  const st = stateOf(versions);
  // Break round 2 (Major 1): a merged field only redirects (F1, concept M4): it is never retired, restored or deleted.
  const merged = kind === "field" ? (versions as { mergedIntoKey?: string | null }[]).find((r) => r.mergedIntoKey)?.mergedIntoKey ?? null : null;
  // Only its database is read here (usedInIds needs no workspace service or audit).
  const lib = new LibrarySources(db, undefined as never, undefined as never);
  const [ids, trails, combos] = await Promise.all([
    lib.usedInIds(kind, workspaceId).then(async (m) => {
      const s = new Set(m.get(key) ?? []);
      // Break M4: a document type is also used as another line's alternative, and as the document a fact is read from.
      if (kind === "document_type") {
        const [reqs, facts] = await Promise.all([
          db.documentRequirement.findMany({ where: { workspaceId }, select: { combinationId: true, lineageKey: true, version: true, status: true, alternatives: true } }),
          db.factSource.findMany({ where: { workspaceId }, select: { combinationId: true, lineageKey: true, version: true, status: true, documentTypeKey: true } }),
        ]);
        for (const r of current(reqs, (r) => `${r.combinationId}|${r.lineageKey}`)) if (Array.isArray(r.alternatives) && (r.alternatives as unknown[]).includes(key)) s.add(r.combinationId);
        for (const f of current(facts, (f) => `${f.combinationId}|${f.lineageKey}`)) if (f.documentTypeKey === key) s.add(f.combinationId);
      }
      return s;
    }),
    combinationTrails(db, workspaceId),
    db.combination.findMany({ where: { workspaceId }, select: { id: true, label: true, retiredAt: true } }),
  ]);
  const combo = new Map(combos.map((c) => [c.id, c]));
  const uses: Use[] = [];
  for (const id of [...ids].sort((a, b) => (trails.get(a) ?? "").localeCompare(trails.get(b) ?? ""))) {
    const c = combo.get(id); if (!c) continue;
    const label = trails.get(id) ?? c.label;
    // Break M3: a retired combination's draft still names it, so it blocks a delete (never a retire: it keeps it).
    uses.push(c.retiredAt ? { kind: "combination", label, href: `/c/${id}`, blocks: true, retireOk: true, why: "Combination retired: it keeps it, so it can be retired, not deleted" }
      : { kind: "combination", label, href: kind === "document_type" ? `/c/${id}/documents` : `/c/${id}`, blocks: true, why: kind === "document_type" ? "Its document checklist lists it: remove the line there first" : "Its setup reads it: remove it there first" });
  }
  // A field read by a form field of a library form no combination uses yet: it blocks a delete, never a retire.
  if (kind === "field") {
    const boxes = await db.formFieldMap.findMany({ where: { workspaceId, canonicalFieldKey: key, outcome: "mapped", status: { in: ["DRAFT", "PUBLISHED"] } }, select: { edition: { select: { editionLabel: true } } } });
    if (boxes.length) { const forms = [...new Set(boxes.map((b) => b.edition.editionLabel))]; uses.push({ kind: "form_field", label: `${boxes.length} form field${boxes.length === 1 ? "" : "s"} on ${forms.slice(0, 2).join(", ")}${forms.length > 2 ? ` and ${forms.length - 2} more` : ""}`, href: `/library/fields/${encodeURIComponent(key)}`, blocks: true, retireOk: true, why: "Its form fields read it: it can be retired, not deleted" }); }
  }
  // Break minor: a draft question that asks it in a section no combination selects is removed with a delete: said, never silent.
  if (kind === "field") {
    const qs = current(await db.sectionQuestion.findMany({ where: { workspaceId, canonicalFieldKey: key }, select: { lineageKey: true, sectionKey: true, version: true, status: true } }), (q) => q.lineageKey);
    // Pack 3 (P-116): for a released field the draft question stops a retire (a draft still asks it); a never-released
    // field's delete removes it with the field, said in the confirm.
    for (const q of qs) if (q.status === "DRAFT") uses.push(st.released
      ? { kind: "placement", label: `Draft question in ${q.sectionKey.replace(/_/g, " ")}`, href: `/library/sections`, blocks: true, why: "A draft question asks it: remove it there first" }
      : { kind: "placement", label: `Draft question in ${q.sectionKey.replace(/_/g, " ")}`, href: `/library/sections`, blocks: false, why: "Not released: a delete removes this draft question with the field" });
  }
  // Break round 2 minor: a document type that supplies it reads it (as the merge treats it): it can be retired, not deleted.
  if (kind === "field") {
    const types = current(await db.documentType.findMany({ where: { workspaceId, suppliesFacts: { has: key } }, select: { documentTypeKey: true, name: true, version: true, status: true } }), (t) => t.documentTypeKey);
    for (const t of types) uses.push({ kind: "form_field", label: `Document type "${t.name}" supplies it`, href: "/library/documents", blocks: true, retireOk: true, why: "A document type supplies it: it can be retired, not deleted" });
  }
  // Releases keep it, never changed (L2): listed, never blocking.
  const path = kind === "field" ? "canonical_fields" : "document_types", prop = kind === "field" ? "id" : "key";
  const released = await db.$queryRaw<{ combination_id: string; version: number }[]>`
    SELECT r.combination_id, r.version FROM config_release r WHERE r.workspace_id = ${workspaceId}::uuid AND r.snapshot->${path} @> jsonb_build_array(jsonb_build_object(${prop}::text, ${key}::text)) ORDER BY r.version DESC`;
  const newest = new Map<string, number>(); for (const r of released) if (!newest.has(r.combination_id)) newest.set(r.combination_id, Number(r.version));
  for (const [cid, v] of newest) uses.push({ kind: "release", label: `${trails.get(cid) ?? combo.get(cid)?.label ?? "A combination"} · release ${v}`, href: `/c/${cid}/review`, blocks: false, why: "Kept by its releases and their open cases (never changed)" });
  // Break round 2 (Major 3): a waiting change of who fills its question is an open change of the field too.
  const pending = await db.libraryChange.findFirst({ where: { workspaceId, kind: kind === "field" ? { in: ["field", "placement_fills"] } : kind, key, status: { in: OPEN }, ...(except ? { id: { not: except } } : {}) }, orderBy: { proposedAt: "desc" } });
  if (pending) uses.push({ kind: "draft_change", label: `${pending.action === "ADD" ? "Add" : pending.action[0] + pending.action.slice(1).toLowerCase()} waiting (${pending.status.toLowerCase()})`, href: `/review/change/${pending.id}`, blocks: true, why: "A change to it is already open: approve, return or withdraw it first" });
  const p = merged ? `It was merged into ${merged}: it only points there now, so it is never deleted, retired or restored.` : pending ? WHY.waiting : null;
  // Break round 2 (Major 4): a restore brings its name back: refused while another current field of its group answers to it.
  let nameTaken: string | null = null;
  if (kind === "field" && st.retired) {
    const me = versions[0] as { label?: string | null; groupKey?: string | null; name: string };
    const group = me.groupKey ?? key.split(".")[0], want = normalizeLabel(me.name);
    const others = current(await db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { not: key }, OR: [{ groupKey: group }, { groupKey: null, canonicalFieldKey: { startsWith: `${group}.` } }] }, select: { canonicalFieldKey: true, version: true, status: true, label: true, labelChecked: true, aliases: true, mergedIntoKey: true } }), (r) => r.canonicalFieldKey);
    const twin = others.find((r) => !r.mergedIntoKey && [r.labelChecked ? r.label ?? "" : "", ...r.aliases].some((x) => x && normalizeLabel(x) === want));
    if (twin) nameTaken = `Can't restore yet: "${me.name}" is now also a name of ${(twin.labelChecked && twin.label) || twin.canonicalFieldKey}. Rename one of them, or remove that alias, first.`;
  }
  const stops = uses.filter((u) => u.blocks && u.kind !== "draft_change");
  const stopsRetire = stops.filter((u) => !u.retireOk);
  const history = (await db.auditEvent.findMany({ where: { workspaceId, entityKey: key, combinationId: null }, orderBy: { at: "desc" }, take: 10, select: { at: true, actor: true, summary: true } })).map((r) => ({ at: r.at.toISOString(), by: nameOf(r.actor) ?? (r.actor === "system" ? "The studio" : r.actor), what: r.summary }));
  return { key, label: name, trail: [name], retired: st.retired, released: st.released || released.length > 0, uses,
    can: {
      delete: p ?? (st.retired ? WHY.retiredNoDelete : st.released || released.length ? WHY.released : stops.length ? WHY.usedByDelete(stops[0].label) : null),
      retire: p ?? (st.retired ? WHY.alreadyRetired : !st.released ? WHY.neverReleased : st.draft ? WHY.draftVersion : stopsRetire.length ? WHY.usedBy(stopsRetire.map((u) => u.label)) : null),
      restore: p ?? (!st.retired ? WHY.notRetired : nameTaken),
    },
    pending: pending && pending.action !== "ADD" ? { id: pending.id, action: pending.action as "DELETE" | "RETIRE" | "RESTORE", by: nameOf(pending.proposedBy) } : null, history };
}

/** C11.9 (break M1, review Ma2/Ma3): a retired shared field or document type takes no new use and no edit. Every write
 *  route that names one calls this (field edits, rename, placement, document lines and their alternatives, conditions). */
export async function refuseRetired(db: Db | Prisma.TransactionClient, workspaceId: string, kind: ItemKind, keys: (string | null | undefined)[]) {
  for (const key of [...new Set(keys.filter((k): k is string => !!k))]) {
    const v = await versionsOf(db, kind, workspaceId, key);
    if (v.length && stateOf(v).retired) throw problem(409, "Retired", `${kind === "field" ? "The field" : "The document type"} "${v[0].name}" is retired: it takes no new use or change. Restore it in Shared library › ${kind === "field" ? "Fields" : "Document types"} first, or choose another.`, { key });
  }
}
/** The keys of retired shared fields (conditions may not read them, C11.9). */
export async function retiredFieldKeys(db: Db, workspaceId: string): Promise<Set<string>> {
  const rows = await db.canonicalField.findMany({ where: { workspaceId }, select: { canonicalFieldKey: true, status: true, version: true } });
  const by = new Map<string, Version[]>(); for (const r of rows) by.set(r.canonicalFieldKey, [...(by.get(r.canonicalFieldKey) ?? []), { id: "", status: r.status, version: r.version }]);
  return new Set([...by].filter(([, v]) => stateOf(v).retired).map(([k]) => k));
}

/** The approval re-check (before the click and at the click): the same rule as the proposal, read without this change. */
export async function recheckItem(db: Db, c: LibraryChange): Promise<string | null> {
  const u = await itemUses(db, c.workspaceId, c.kind as ItemKind, c.key, c.id).catch(() => null);
  if (!u) return "It was deleted meanwhile: return this change.";
  const no = c.action === "DELETE" ? u.can.delete : c.action === "RETIRE" ? u.can.retire : u.can.restore;
  return no ? `Changed since it was proposed: ${no.replace(/^Can't [a-z]+( yet)?: /, "").replace(/^./, (x) => x.toLowerCase())}` : null;
}

/** Applied at approval, inside one transaction: retire turns its published version to retired, restore turns the newest
 *  retired version back to published, delete removes its never-released draft rows (and a draft question that asks it). */
export async function applyItem(tx: Prisma.TransactionClient, c: LibraryChange): Promise<boolean> {
  const kind = c.kind as ItemKind;
  // Break M2: only a change still APPROVED is applied; the guarded write locks its row, so a withdraw at the same
  // moment waits and then finds nothing open (withdrawLifecycle's own guarded write).
  const note = c.decisionNote ?? (c.action === "DELETE" ? "Deleted at approval (never released, used nowhere)." : c.action === "RETIRE" ? "Retired at approval: hidden from pickers and AI now; earlier releases and open cases keep it." : "Restored at approval: back in pickers and AI now.");
  await lockItem(tx, c.workspaceId, kind, [c.key]);
  const won = await tx.libraryChange.updateMany({ where: { id: c.id, status: "APPROVED" }, data: { status: "RELEASED", decisionNote: note } });
  if (!won.count) throw problem(409, "No longer open", "This change was withdrawn or decided meanwhile: nothing was applied.");
  // Break M1: the same rule once more inside the transaction (a use added since the approver's click hands it back).
  const u = await itemUses(tx as unknown as Db, c.workspaceId, kind, c.key, c.id).catch(() => null);
  const no = !u ? "It was deleted meanwhile." : c.action === "DELETE" ? u.can.delete : c.action === "RETIRE" ? u.can.retire : u.can.restore;
  if (no) {
    const back = `Not applied: ${no}`.slice(0, 600);
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RETURNED", decisionNote: back } });
    await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: "system", action: "returned", entity: kind === "field" ? "field" : "document type", entityKey: c.key, summary: `The approval did not ${c.action.toLowerCase()} ${c.key}: ${no}`.slice(0, 600) } });
    return false;
  }
  const v = await versionsOf(tx, kind, c.workspaceId, c.key);
  const set = (id: string, status: "PUBLISHED" | "RETIRED") => kind === "field" ? tx.canonicalField.update({ where: { id }, data: { status } }) : tx.documentType.update({ where: { id }, data: { status } });
  if (c.action === "RETIRE") { const cur = v.find((r) => r.status === "PUBLISHED"); if (!cur) throw problem(409, "No longer allowed", "It has no published version to retire: return this change."); await set(cur.id, "RETIRED"); }
  else if (c.action === "RESTORE") { const cur = v.find((r) => r.status === "RETIRED"); if (!cur) throw problem(409, "No longer allowed", "It is not retired: return this change."); await set(cur.id, "PUBLISHED"); }
  else {
    if (!v.length || v.some((r) => r.status !== "DRAFT")) throw problem(409, "No longer allowed", "It was released meanwhile: return this change, and retire it instead.");
    if (kind === "field") {
      await tx.sectionQuestion.deleteMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" } });
      await tx.canonicalField.deleteMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" } });
    } else await tx.documentType.deleteMany({ where: { workspaceId: c.workspaceId, documentTypeKey: c.key, status: "DRAFT" } });
  }
  return true;
}

/** The open delete, retire or restore of each item of one kind, for the list rows (one read per page). */
export async function openItemChanges(db: Db, workspaceId: string, kind: ItemKind) {
  // Break minor: a new field still waiting (its ADD) offers Withdraw on its row, never Delete (library-changes.ts withdraws it).
  const rows = await db.libraryChange.findMany({ where: { workspaceId, kind, action: { in: [...LIFECYCLE_ACTIONS, "ADD"] }, status: { in: OPEN } }, orderBy: { proposedAt: "desc" }, select: { id: true, key: true, action: true, status: true, proposedBy: true } });
  const out = new Map<string, { id: string; action: string; status: string; by: string | null; by_id: string }>();
  for (const r of rows) if (!out.has(r.key)) out.set(r.key, { id: r.id, action: r.action, status: r.status, by: nameOf(r.proposedBy), by_id: r.proposedBy });
  return out;
}

/** C11.9: a list row's lifecycle state (P-116 row action): the one written action from the state and its open change.
 *  The guard's decision (and every use) is read when the row's action is opened (GET …/uses, where used first). */
export function itemState(v: Version[], open?: { id: string; action: string; status: string; by: string | null; by_id: string }, kind: ItemKind = "field") {
  const st = stateOf(v);
  // A document type's waiting ADD keeps its state's action, greyed on the row (its addition is decided on To review).
  return { retired: st.retired, released: st.released, row_action: open && !(open.action === "ADD" && kind === "document_type") ? "WITHDRAW" : st.retired ? "RESTORE" : st.released ? "RETIRE" : "DELETE", change: open ?? null };
}
