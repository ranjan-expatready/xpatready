// C11.9 (P-116, Screen 04 BR-8 to BR-10): delete, retire and restore of a shared field or a document type, with where
// used first. The one guard (api/src/lifecycle.ts) calls itemUses for the decision and applyItem at approval; the
// LibraryChange (kind field or document_type, action DELETE, RETIRE or RESTORE) waits for a different person. As for
// library forms (QA-64, P-116 amended 28 Oct), an approved retire or restore takes effect at approval; an approved
// delete removes the never-released item at once (L1). A field's ADD keeps its own path (library-changes.ts).
import { HttpException } from "@nestjs/common";
import type { LibraryChange, Origin, Prisma } from "@prisma/client";
import type { Use, UsesView } from "../../contracts/structure.ts";
import { WHY } from "../../contracts/lifecycle.ts";
import { normalizeLabel } from "../../contracts/programs.ts";
import { ACTORS, type Db } from "./core.ts";
import { current } from "../../engine/where-used.ts";
import { combinationTrails, documentTypeUseKinds, itemCombinations, itemReleases } from "./where-used.ts";

export const ITEM_KINDS = ["field", "document_type", "section"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];
const LIFECYCLE_ACTIONS = ["DELETE", "RETIRE", "RESTORE"];
/** A delete, retire or restore of a shared field or document type (never a field's ADD, which keeps its own path). */
export const isItemLifecycle = (c: Pick<LibraryChange, "kind" | "action">) => (ITEM_KINDS as readonly string[]).includes(c.kind) && LIFECYCLE_ACTIONS.includes(c.action);
const OPEN = ["WAITING", "RETURNED", "APPROVED"];
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
const nameOf = (id: string | null | undefined) => (id ? ACTORS.find((a) => a.id === id)?.name ?? "A person" : null);
const fieldWord = (key: string) => { const w = (key.split(".").pop() ?? key).replace(/_/g, " "); return w.charAt(0).toUpperCase() + w.slice(1); };

type Version = { id: string; status: string; version: number; updatedBy?: string };
/** C11.9 (P-116 amended): the note on an own draft deleted at once (its Undo puts the same rows back). */
export const ITEM_OWN_NOTE = "Deleted at once: the author's own draft, never approved, released or used.";
const KIND_WORD: Record<ItemKind, string> = { field: "field", document_type: "document type", section: "section" };
const LIST_WORD: Record<ItemKind, string> = { field: "Fields", document_type: "Document types", section: "Sections" };
async function versionsOf(db: Db | Prisma.TransactionClient, kind: ItemKind, workspaceId: string, key: string) {
  if (kind === "field") return (await db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" }, select: { id: true, status: true, version: true, label: true, labelChecked: true, mergedIntoKey: true, groupKey: true, updatedBy: true } })).map((r) => ({ ...r, name: (r.labelChecked && r.label) || fieldWord(key) }));
  if (kind === "section") return (await db.logicalSection.findMany({ where: { workspaceId, sectionKey: key }, orderBy: { version: "desc" }, select: { id: true, status: true, version: true, title: true, updatedBy: true } })).map((r) => ({ ...r, name: r.title }));
  return (await db.documentType.findMany({ where: { workspaceId, documentTypeKey: key }, orderBy: { version: "desc" }, select: { id: true, status: true, version: true, name: true, updatedBy: true } }));
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
export async function itemUses(db: Db, workspaceId: string, kind: ItemKind, key: string, except?: string, actorId?: string): Promise<UsesView> {
  const versions = await versionsOf(db, kind, workspaceId, key);
  if (!versions.length) throw problem(404, "Not in the library", `${key} is not in the shared library (it may have been deleted or reset).`);
  const name = versions[0].name;
  const st = stateOf(versions);
  // Break round 2 (Major 1): a merged field only redirects (F1, concept M4): it is never retired, restored or deleted.
  const merged = kind === "field" ? (versions as { mergedIntoKey?: string | null }[]).find((r) => r.mergedIntoKey)?.mergedIntoKey ?? null : null;
  // SH2 (P-258): the combinations using it come from the one where-used service.
  const [ids, trails, combos] = await Promise.all([
    // SH2b: every use, a document type's alternatives and fact sources included, comes from the one service.
    itemCombinations(db, workspaceId, kind).then((m) => new Set(m.get(key) ?? [])),
    combinationTrails(db, workspaceId),
    db.combination.findMany({ where: { workspaceId }, select: { id: true, label: true, retiredAt: true } }),
  ]);
  const combo = new Map(combos.map((c) => [c.id, c]));
  // SH2b review m4: say how a combination uses a document type (a line, another line's alternative, the document a fact
  // is read from), so the person knows what to change there.
  const how = kind === "document_type" ? await documentTypeUseKinds(db, workspaceId, key) : new Map<string, Set<string>>();
  const docWhy = (id: string) => {
    const k = how.get(id) ?? new Set(["line"]);
    const words = [k.has("line") && "its document checklist lists it", k.has("alternative") && "a checklist line takes it as an alternative", k.has("fact") && "a fact is read from it"].filter(Boolean) as string[];
    return `${words.join("; ").replace(/^./, (c) => c.toUpperCase())}: change that there first`;
  };
  const uses: Use[] = [];
  for (const id of [...ids].sort((a, b) => (trails.get(a) ?? "").localeCompare(trails.get(b) ?? ""))) {
    const c = combo.get(id); if (!c) continue;
    const label = trails.get(id) ?? c.label;
    // Break M3: a retired combination's draft still names it, so it blocks a delete (never a retire: it keeps it).
    uses.push(c.retiredAt ? { kind: "combination", label, href: `/c/${id}`, blocks: true, retireOk: true, why: "Combination retired: it keeps it, so it can be retired, not deleted" }
      : { kind: "combination", label, href: kind === "document_type" ? `/c/${id}/documents` : `/c/${id}`, blocks: true, why: kind === "document_type" ? docWhy(id) : kind === "section" ? "Its questionnaire uses it: remove it there first" : "Its setup reads it: remove it there first" });
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
  // C11.9 sections: the questions placed in it: they stop a delete (they would be left without a section), not a retire.
  if (kind === "section") {
    const qs = current(await db.sectionQuestion.findMany({ where: { workspaceId, sectionKey: key }, select: { lineageKey: true, version: true, status: true } }), (q) => q.lineageKey);
    if (qs.length) uses.push({ kind: "child", label: `${qs.length} question${qs.length === 1 ? "" : "s"} placed in it`, href: "/library/fields", blocks: true, retireOk: true, why: "Questions are placed in it: it can be retired, not deleted" });
  }
  // Releases keep it, never changed (L2): listed, never blocking.
  const released = await itemReleases(db, workspaceId, kind, key);
  const newest = new Map<string, number>(); for (const r of released) if (!newest.has(r.combinationId)) newest.set(r.combinationId, r.version);
  for (const [cid, v] of newest) uses.push({ kind: "release", label: `${trails.get(cid) ?? combo.get(cid)?.label ?? "A combination"} · release ${v}`, href: `/c/${cid}/review`, blocks: false, why: "Kept by its releases and their open cases (never changed)" });
  // Break round 2 (Major 3): a waiting change of who fills its question is an open change of the field too.
  // Round 3 Major 4: the author's own new item still waiting (its ADD, by them) is part of their own draft, not a block.
  const ownAdd = actorId ? await db.libraryChange.findFirst({ where: { workspaceId, kind, key, action: "ADD", status: { in: ["WAITING", "RETURNED"] }, proposedBy: actorId }, select: { id: true, status: true } }) : null;
  const pending = await db.libraryChange.findFirst({ where: { workspaceId, kind: kind === "field" ? { in: ["field", "placement_fills"] } : kind === "section" ? { in: ["section", "section_background"] } : kind, key, status: { in: OPEN }, ...(ownAdd && !(versions as Version[]).some((r) => r.status !== "DRAFT") ? { NOT: { id: ownAdd.id } } : {}), ...(except ? { id: { not: except } } : {}) }, orderBy: { proposedAt: "desc" } });
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
  // P-116 amended (pack 3): the author's own draft, never released, used nowhere, is deleted at once, with Undo.
  const immediate = !merged && !pending && !st.released && !released.length && !stops.length && !!actorId && (versions as Version[]).every((r) => r.status === "DRAFT" && r.updatedBy === actorId);
  const history = (await db.auditEvent.findMany({ where: { workspaceId, entityKey: key, combinationId: null }, orderBy: { at: "desc" }, take: 10, select: { at: true, actor: true, summary: true } })).map((r) => ({ at: r.at.toISOString(), by: nameOf(r.actor) ?? (r.actor === "system" ? "The studio" : r.actor), what: r.summary }));
  return { key, label: name, trail: [name], retired: st.retired, released: st.released || released.length > 0, uses,
    can: {
      delete: p ?? (st.retired ? WHY.retiredNoDelete : st.released || released.length ? WHY.released : stops.length ? WHY.usedByDelete(stops[0].label) : null),
      retire: p ?? (st.retired ? WHY.alreadyRetired : !st.released ? WHY.neverReleased : st.draft ? WHY.draftVersion : stopsRetire.length ? WHY.usedBy(stopsRetire.map((u) => u.label)) : null),
      restore: p ?? (!st.retired ? WHY.notRetired : nameTaken),
    },
    immediate,
    pending: pending && pending.action !== "ADD" ? { id: pending.id, action: pending.action as "DELETE" | "RETIRE" | "RESTORE", by: nameOf(pending.proposedBy) } : null, history };
}

/** C11.9 (break M1, review Ma2/Ma3): a retired shared field or document type takes no new use and no edit. Every write
 *  route that names one calls this (field edits, rename, placement, document lines and their alternatives, conditions). */
export async function refuseRetired(db: Db | Prisma.TransactionClient, workspaceId: string, kind: ItemKind, keys: (string | null | undefined)[]) {
  for (const key of [...new Set(keys.filter((k): k is string => !!k))]) {
    const v = await versionsOf(db, kind, workspaceId, key);
    if (v.length && stateOf(v).retired) throw problem(409, "Retired", `The ${KIND_WORD[kind]} "${v[0].name}" is retired: it takes no new use or change. Restore it in Shared library › ${LIST_WORD[kind]} first, or choose another.`, { key });
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
  const set = (id: string, status: "PUBLISHED" | "RETIRED") => kind === "field" ? tx.canonicalField.update({ where: { id }, data: { status } }) : kind === "section" ? tx.logicalSection.update({ where: { id }, data: { status } }) : tx.documentType.update({ where: { id }, data: { status } });
  if (c.action === "RETIRE") { const cur = v.find((r) => r.status === "PUBLISHED"); if (!cur) throw problem(409, "No longer allowed", "It has no published version to retire: return this change."); await set(cur.id, "RETIRED"); }
  else if (c.action === "RESTORE") { const cur = v.find((r) => r.status === "RETIRED"); if (!cur) throw problem(409, "No longer allowed", "It is not retired: return this change."); await set(cur.id, "PUBLISHED"); }
  else {
    if (!v.length || v.some((r) => r.status !== "DRAFT")) throw problem(409, "No longer allowed", "It was released meanwhile: return this change, and retire it instead.");
    if (kind === "field") {
      await tx.sectionQuestion.deleteMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" } });
      await tx.canonicalField.deleteMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" } });
    } else if (kind === "section") await tx.logicalSection.deleteMany({ where: { workspaceId: c.workspaceId, sectionKey: c.key, status: "DRAFT" } });
    else await tx.documentType.deleteMany({ where: { workspaceId: c.workspaceId, documentTypeKey: c.key, status: "DRAFT" } });
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

/** C3.13 BR-2 (Screen 04 concept, STANDARDS §3.5): a list row's status worked out in words, beside the raw status: a change
 *  waiting for the second person (its ADD, delete, retire or restore) says so; then Retired, Released (any version left
 *  draft), else Draft. A returned change is back with its author, so the row keeps its own state. */
export const STATUS_WORDS = ["Released", "Draft", "Waiting for a second person", "Retired"] as const;
export function statusWords(st: { retired: boolean; released: boolean }, open?: { status: string }): (typeof STATUS_WORDS)[number] {
  return open?.status === "WAITING" ? "Waiting for a second person" : st.retired ? "Retired" : st.released ? "Released" : "Draft";
}
/** C3.13 BR-2: who made an item, in words (AI or a person; the sample setup's items came from a reviewed release). */
const ORIGIN_WORDS: Record<Origin, string> = { // typed by the enum: a new origin must be given its words here
  AI_PROPOSAL: "AI · proposed, accepted by a person",
  AI_FOUND: "AI · picked by the form finder",
  HUMAN: "Person",
  CODE_MATCH: "Person · accepted a match found without AI",
  IMPORTED_RELEASE: "From a reviewed release",
};
export const originWords = (origin: Origin) => ORIGIN_WORDS[origin];

/** C3.13 BR-3 and BR-10 (Screen 04 §6, `GET /library/:kind?q=&section=&status=&origin=`): one filter for a library list.
 *  q matches the item's own words (name, meaning, key, aliases) or, ignoring spaces and case, the start of the code or
 *  number of a form that fills it ("imm5707" or "5707" finds IMM 5707; 3 characters at least, review c313 m2). status: released · draft · waiting · retired · all; without it the list leaves
 *  retired items out, as pickers need (C11.9; `retired=all` or `retired=only` still work). origin: ai · person · release. */
const STATUS_PARAM: Record<string, (typeof STATUS_WORDS)[number] | "all"> = { released: "Released", draft: "Draft", waiting: "Waiting for a second person", retired: "Retired", all: "all" };
const ORIGIN_PARAM: Record<string, Origin[]> = { ai: ["AI_PROPOSAL", "AI_FOUND"], person: ["HUMAN", "CODE_MATCH"], release: ["IMPORTED_RELEASE"] };
const compact = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
/** A form code typed from its start, or from its number ("imm5707", "5707", "imm 57"), never a letter or digit inside it. */
export const formCodeStarts = (form: string, code: string) => { const c = compact(form); return c.startsWith(code) || c.replace(/^\p{L}+/u, "").startsWith(code); };
type ListQuery = { q?: string; retired?: string; section?: string; status?: string; origin?: string };
export function libraryFilter<R extends { retired: boolean; status_words: string; origin: Origin }>(q: ListQuery, texts: (r: R) => string[], forms: (r: R) => string[] = () => [], section?: (r: R) => string | null) {
  const status = q.status?.trim().toLowerCase() || undefined, origin = q.origin?.trim().toLowerCase() || undefined;
  if (status && !STATUS_PARAM[status]) throw problem(400, "Unknown status", `There is no status "${q.status}": use released, draft, waiting, retired or all.`);
  if (origin && !ORIGIN_PARAM[origin]) throw problem(400, "Unknown origin", `There is no origin "${q.origin}": use ai, person or release.`);
  const needle = (q.q ?? "").trim().toLowerCase(), code = compact(needle);
  return (r: R) => {
    // Retired items show only under Retired (BR-10); a retired item with a restore waiting is still under Retired.
    const shown = status === "all" ? true : status === "retired" ? r.retired : status ? r.status_words === STATUS_PARAM[status] : q.retired === "all" ? true : q.retired === "only" ? r.retired : !r.retired;
    if (!shown) return false;
    if (origin && !ORIGIN_PARAM[origin].includes(r.origin)) return false;
    if (q.section && section && section(r) !== q.section) return false;
    return !needle || texts(r).some((t) => t.toLowerCase().includes(needle)) || (code.length >= 3 && forms(r).some((f) => formCodeStarts(f, code)));
  };
}

/** C11.9: a list row's lifecycle state (P-116 row action): the one written action from the state and its open change.
 *  The guard's decision (and every use) is read when the row's action is opened (GET …/uses, where used first). */
export function itemState(v: Version[], open?: { id: string; action: string; status: string; by: string | null; by_id: string }, kind: ItemKind = "field") {
  const st = stateOf(v);
  // A document type's waiting ADD keeps its state's action, greyed on the row (its addition is decided on To review).
  return { retired: st.retired, released: st.released, status_words: statusWords(st, open), row_action: open && !(open.action === "ADD" && kind !== "field") ? "WITHDRAW" : st.retired ? "RESTORE" : st.released ? "RETIRE" : "DELETE", change: open ?? null };
}

// ── C11.9 (P-116 amended, pack 3): the author's own draft deleted at once, and its Undo ──
type Row = Record<string, unknown>;
/** Deletes an own never-released, unused draft at once (checked again under its lock) and records it as one change the
 *  author can undo; returns that change. */
export async function deleteOwnItem(db: Db, actorId: string, workspaceId: string, kind: ItemKind, key: string, label: string, reason: string): Promise<LibraryChange> {
  return db.$transaction(async (tx) => {
    await lockItem(tx, workspaceId, kind, [key]);
    const u = await itemUses(tx as unknown as Db, workspaceId, kind, key, undefined, actorId);
    if (!u.immediate) throw problem(409, "Cannot delete at once", u.can.delete ?? "It changed meanwhile: reload it.");
    let rows: Row[] = [], questions: Row[] = [];
    if (kind === "field") {
      questions = await tx.sectionQuestion.findMany({ where: { workspaceId, canonicalFieldKey: key, status: "DRAFT" } }) as Row[];
      rows = await tx.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key } }) as Row[];
      await tx.sectionQuestion.deleteMany({ where: { workspaceId, canonicalFieldKey: key, status: "DRAFT" } });
      await tx.canonicalField.deleteMany({ where: { workspaceId, canonicalFieldKey: key } });
    } else if (kind === "section") {
      rows = await tx.logicalSection.findMany({ where: { workspaceId, sectionKey: key } }) as Row[];
      await tx.logicalSection.deleteMany({ where: { workspaceId, sectionKey: key } });
    } else {
      rows = await tx.documentType.findMany({ where: { workspaceId, documentTypeKey: key } }) as Row[];
      await tx.documentType.deleteMany({ where: { workspaceId, documentTypeKey: key } });
    }
    // Round 3 Major 4: their own waiting ADD goes with it (withdrawn), and comes back with an Undo.
    const add = await tx.libraryChange.findFirst({ where: { workspaceId, kind, key, action: "ADD", status: { in: ["WAITING", "RETURNED"] }, proposedBy: actorId }, select: { id: true, status: true, decidedBy: true, decidedAt: true, decisionNote: true } });
    if (add) await tx.libraryChange.update({ where: { id: add.id }, data: { status: "WITHDRAWN", decidedBy: actorId, decidedAt: new Date(), decisionNote: "Withdrawn: its author deleted their own draft." } });
    return tx.libraryChange.create({ data: { workspaceId, kind, key, label, action: "DELETE", reason, status: "RELEASED", proposedBy: actorId, decidedBy: actorId, decidedAt: new Date(), decisionNote: ITEM_OWN_NOTE,
      matches: { rows, questions, add } as unknown as Prisma.InputJsonValue } });
  });
}
/** A stored row, ready to create again (nulls left to the column's default, so a null JSON column is never written). */
const again = (r: Row) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null));
/** Undo of an own-draft delete: the same rows come back, unless the key was taken meanwhile. */
export async function undoOwnItem(db: Db, actorId: string, c: LibraryChange): Promise<void> {
  if (c.proposedBy !== actorId) throw problem(403, "Not yours", "Only the person who deleted it can undo it.");
  const kind = c.kind as ItemKind;
  const m = (c.matches ?? {}) as { rows?: Row[]; questions?: Row[]; add?: { id: string; status: string; decidedBy: string | null; decidedAt: string | null; decisionNote: string | null } | null };
  await db.$transaction(async (tx) => {
    await lockItem(tx, c.workspaceId, kind, [c.key]);
    if ((await versionsOf(tx, kind, c.workspaceId, c.key)).length) throw problem(409, "Cannot undo", `Something named ${c.key} was added meanwhile: add it again instead.`);
    const done = await tx.libraryChange.updateMany({ where: { id: c.id, status: "RELEASED", decisionNote: ITEM_OWN_NOTE }, data: { status: "WITHDRAWN", decisionNote: "Undone: it is back." } });
    if (!done.count) throw problem(409, "Cannot undo", "It was undone already.");
    // Round 4 Major 2: the ADD comes back exactly as it was, with the second person's decision and note.
    if (m.add) await tx.libraryChange.update({ where: { id: m.add.id }, data: { status: m.add.status, decidedBy: m.add.decidedBy, decidedAt: m.add.decidedAt ? new Date(m.add.decidedAt) : null, decisionNote: m.add.decisionNote } });
    for (const r of m.rows ?? []) {
      if (kind === "field") await tx.canonicalField.create({ data: again(r) as Prisma.CanonicalFieldUncheckedCreateInput });
      else if (kind === "section") await tx.logicalSection.create({ data: again(r) as Prisma.LogicalSectionUncheckedCreateInput });
      else await tx.documentType.create({ data: again(r) as Prisma.DocumentTypeUncheckedCreateInput });
    }
    // Round 3 Major 2: a draft question goes back only into a section that is still there and not retired.
    for (const q of m.questions ?? []) {
      const sk = String(q.sectionKey ?? "");
      const sv = await versionsOf(tx, "section", c.workspaceId, sk);
      if (!sv.length) throw problem(409, "Cannot undo", `Its question's section "${sk.replace(/_/g, " ")}" was deleted meanwhile: add the field to a section again instead. Nothing was undone.`);
      if (stateOf(sv).retired) throw problem(409, "Cannot undo", `Its question's section "${sv[0].name}" is retired now: restore that section first. Nothing was undone.`);
      await tx.sectionQuestion.create({ data: again(q) as Prisma.SectionQuestionUncheckedCreateInput });
    }
  });
}

/** C11.9 (P-116): the author sets the filing order of a combination's forms: every current form line, each once. */
export async function reorderForms(db: Db, actor: { id: string; name: string; duties: readonly string[] }, combinationId: string, body: unknown) {
  if (!(actor.duties as readonly string[]).includes("author")) throw problem(403, "Not allowed", `${actor.name} (simulated) does not hold the author duty.`);
  const c = await db.combination.findUnique({ where: { id: combinationId }, select: { id: true, workspaceId: true, label: true, retiredAt: true } });
  if (!c) throw problem(404, "Not found", "This combination does not exist (the demo may have been reset).");
  if (c.retiredAt) throw problem(409, "Retired", `"${c.label}" is retired: its forms are not changed. Restore it on Structure first.`);
  // The screen sends form numbers (forms), a direct call may send line keys (lines); both name every current line once.
  const byForm = (body as { forms?: unknown } | null)?.forms;
  let lines = (body as { lines?: unknown } | null)?.lines;
  if (Array.isArray(byForm) && byForm.every((x) => typeof x === "string")) {
    const rows = current(await db.combinationForm.findMany({ where: { combinationId }, select: { lineageKey: true, version: true, status: true, form: { select: { formKey: true } } } }), (l) => l.lineageKey);
    lines = (byForm as string[]).map((code) => rows.find((r) => r.form.formKey === code)?.lineageKey ?? code);
  }
  if (!Array.isArray(lines) || !lines.every((x) => typeof x === "string")) throw problem(400, "Check the request", "Give the form lines in the order they are filed (lines: a list of line keys).");
  const now = current(await db.combinationForm.findMany({ where: { combinationId }, select: { lineageKey: true, version: true, status: true } }), (l) => l.lineageKey).map((l) => l.lineageKey);
  const given = lines as string[];
  const missing = now.filter((k) => !given.includes(k)), extra = given.filter((k) => !now.includes(k));
  if (missing.length || extra.length || new Set(given).size !== given.length) throw problem(400, "Every form once", `The filing order lists every form of "${c.label}" once.${missing.length ? ` Missing: ${missing.join(", ")}.` : ""}${extra.length ? ` Not its forms: ${extra.join(", ")}.` : ""}${new Set(given).size !== given.length ? " One is listed twice." : ""} Nothing changed.`);
  await db.combination.update({ where: { id: combinationId }, data: { formOrder: given } });
  await db.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: "reordered", entity: "form", entityKey: combinationId, combinationId, summary: `${actor.name} set the filing order of "${c.label}"'s forms (draft): ${given.join(", ")}`.slice(0, 600) } });
  return { lines: given };
}
