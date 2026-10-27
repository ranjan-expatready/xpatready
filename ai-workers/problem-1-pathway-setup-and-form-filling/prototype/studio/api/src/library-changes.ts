// Screen 02 slice 2, reused by Screen 04 (Screen 04 challenge B1, M1, M6): one record for a change to the shared library
// that a second person approves (LibraryChange), the one key generator (keyFor) and the one publisher both release paths
// call inside their transaction (publishLibraryChanges). A combination whose draft uses an item whose ADD is still
// waiting (or was returned) is not released: the item review cannot be skipped by releasing a combination.
import { HttpException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { LibraryChange, Prisma } from "@prisma/client";
import { normalizeLabel } from "../../contracts/programs.ts";
import { ACTORS, type Actor, type Db } from "./core.ts";
import { isLifecycleKind, publishLifecycle, withdrawLifecycle } from "./lifecycle.ts";

export const LIBRARY_KINDS = ["field", "section", "document_type", "check"] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];
export const KIND_NOUN: Record<string, string> = { library_form: "library form", form_accepts: "what IRCC accepts", field: "shared field", section: "section", document_type: "document type", check: "check", structure_node: "structure name", combination: "combination" };
const ACTION_WORD: Record<string, string> = { ADD: "Add", DELETE: "Delete", RETIRE: "Retire", RESTORE: "Restore", EDIT_RULE: "Change the rule of", SET_ACCEPTS: "Set what IRCC accepts for" };
const nameOf = (id: string | null | undefined) => (id ? ACTORS.find((a) => a.id === id)?.name ?? "A person" : null);
const problem = (status: number, title: string, detail: string) => new HttpException({ type: `https://expatready.local/problems/${status}`, title, status, detail }, status);

/** A new shared field's key, from its subject's group and its name (P-34 Layer 1, Screen 04 M1): "person" + "Place of
 *  birth" → person.place_of_birth; a key already taken gets _2, _3… Keys are never typed by a person. A name with no
 *  Latin letters ("出生地") gets a short stable code from the name instead of a bare "field" (break m7); a long name is
 *  cut at a word, never mid-word. */
export function keyFor(group: string, label: string, taken: Set<string>): string {
  const g = group.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "case";
  let a = label.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (a.length > 60) a = a.slice(0, 60).replace(/_[^_]*$/, "") || a.slice(0, 60);
  if (!a) a = `field_${createHash("sha256").update(label.normalize("NFC")).digest("hex").slice(0, 6)}`;
  let key = `${g}.${a}`;
  for (let n = 2; taken.has(key); n++) key = `${g}.${a}_${n}`;
  return key;
}

/** Same name in the same group, ignoring case, spaces and punctuation: an exact duplicate, refused without AI (BR-7).
 *  It looks at the library, at new fields still waiting or approved, and at names already decided in any open AI draft
 *  (break M1: two proposals of one draft could take the same name). */
export async function sameName(db: Pick<Db, "canonicalField" | "libraryChange" | "normalizationItem">, workspaceId: string, group: string, label: string, exceptItem?: string): Promise<{ label: string } | null> {
  const want = normalizeLabel(label);
  const rows = await db.canonicalField.findMany({ where: { workspaceId, groupKey: group, status: { in: ["DRAFT", "PUBLISHED"] }, mergedIntoKey: null }, select: { canonicalFieldKey: true, label: true, aliases: true } });
  const lib = rows.find((r) => [r.label ?? "", ...r.aliases].some((x) => normalizeLabel(x) === want));
  if (lib) return { label: lib.label ?? lib.canonicalFieldKey };
  const open = await db.libraryChange.findMany({ where: { workspaceId, kind: "field", status: { in: ["WAITING", "APPROVED"] }, key: { startsWith: `${group}.` } }, select: { label: true } });
  const ch = open.find((c) => c.label && normalizeLabel(c.label) === want);
  if (ch) return { label: ch.label! };
  const decided = await db.normalizationItem.findMany({ where: { workspaceId, decision: "NEW", decidedKey: { startsWith: `${group}.` }, job: { status: "COMPLETED" }, ...(exceptItem ? { id: { not: exceptItem } } : {}) }, select: { payload: true } });
  const it = decided.find((d) => { const l = (d.payload as { label?: string } | null)?.label; return !!l && normalizeLabel(l) === want; });
  return it ? { label: (it.payload as { label: string }).label } : null;
}

export function changeView(c: LibraryChange) {
  return { id: c.id, kind: c.kind, kind_word: KIND_NOUN[c.kind] ?? c.kind, key: c.key, label: c.label ?? c.key, action: c.action, action_word: ACTION_WORD[c.action] ?? c.action, reason: c.reason,
    ai_verdict: c.aiVerdict, matches: c.matches, status: c.status, proposed_by: nameOf(c.proposedBy), proposed_by_id: c.proposedBy, proposed_at: c.proposedAt,
    decided_by: nameOf(c.decidedBy), decided_at: c.decidedAt, decision_note: c.decisionNote, released_in: c.releasedIn, combination_id: c.combinationId };
}

/** A second person decides (P-53 item 4, BR-9): never the person who proposed it. Claimed on its status, so two
 *  decisions at the same moment cannot both succeed. */
export async function decideChange(db: Db, actor: Actor, id: string, decision: "approve" | "return", note?: string) {
  if (!(actor.duties as readonly string[]).includes("review")) throw problem(403, "Not allowed", `${actor.name} (simulated) does not hold the review duty.`);
  const c = await db.libraryChange.findUnique({ where: { id } });
  if (!c) throw problem(404, "Not found", "This library change does not exist (the demo may have been reset).");
  if (c.status !== "WAITING") throw problem(409, "Already decided", `This change is already ${c.status.toLowerCase()}.`);
  if (c.proposedBy === actor.id) throw problem(403, "A different person decides", `You proposed this ${KIND_NOUN[c.kind] ?? "change"}, so a different person approves or returns it.`);
  // Break M2: the person who applied the draft that created it is not the second person either.
  if (c.appliedBy === actor.id) throw problem(403, "A different person decides", `You applied the draft that created this ${KIND_NOUN[c.kind] ?? "change"}, so a different person approves or returns it.`);
  if (decision === "return" && !note?.trim()) throw problem(400, "Say why", "Say why it goes back, so the author can correct it.");
  if ((note ?? "").length > 300) throw problem(400, "Too long", "Keep the reason under 300 characters.");
  const done = await db.libraryChange.updateMany({ where: { id, status: "WAITING" }, data: { status: decision === "approve" ? "APPROVED" : "RETURNED", decidedBy: actor.id, decidedAt: new Date(), decisionNote: note?.trim() || null } });
  if (!done.count) throw problem(409, "Already decided", "Someone decided this change at the same moment. Refresh to see it.");
  return changeView((await db.libraryChange.findUnique({ where: { id } }))!);
}

export type Unapproved = { kind: "field" | "section" | "document_type"; key: string; label: string | null; status: "WAITING" | "RETURNED" | "NOT_PROPOSED" };
/** The shared library items a combination's draft uses, by kind (its snapshot's fields, sections and document types). */
export type LibraryItems = { field: string[]; section: string[]; document_type: string[] };
export const itemsOf = (s: { canonical_fields: { id: string }[]; sections: { id: string }[]; document_types: { key: string }[] }): LibraryItems =>
  ({ field: s.canonical_fields.map((f) => f.id), section: s.sections.map((x) => x.id), document_type: s.document_types.map((t) => t.key) });
export const mergeItems = (all: LibraryItems[]): LibraryItems => ({ field: all.flatMap((x) => x.field), section: all.flatMap((x) => x.section), document_type: all.flatMap((x) => x.document_type) });
/** The library items a combination's draft uses that a second person has not approved: an ADD still waiting or returned,
 *  and (break M3, Lead re-check 25 Oct) a brand-new item (draft rows only, never published) with no approved ADD at all,
 *  whichever route made it: shared fields, sections and document types alike. Its release is refused (409) until they
 *  are approved on To review. */
export async function unapprovedAdds(db: Pick<Db, "libraryChange" | "canonicalField" | "logicalSection" | "documentType">, workspaceId: string, items: LibraryItems): Promise<Unapproved[]> {
  const kinds = (["field", "section", "document_type"] as const).filter((k) => items[k].length);
  if (!kinds.length) return [];
  const changes = await db.libraryChange.findMany({ where: { workspaceId, action: "ADD", OR: kinds.map((k) => ({ kind: k, key: { in: items[k] } })) }, orderBy: { proposedAt: "desc" } });
  const latest = new Map<string, LibraryChange>(); for (const c of changes) if (!latest.has(`${c.kind}|${c.key}`)) latest.set(`${c.kind}|${c.key}`, c);
  const out: Unapproved[] = [];
  for (const c of latest.values()) if (c.status === "WAITING" || c.status === "RETURNED") out.push({ kind: c.kind as Unapproved["kind"], key: c.key, label: c.label, status: c.status });
  const rows: { kind: Unapproved["kind"]; key: string; status: string; label: string | null }[] = [
    ...(items.field.length ? (await db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: items.field } }, select: { canonicalFieldKey: true, status: true, label: true } })).map((r) => ({ kind: "field" as const, key: r.canonicalFieldKey, status: r.status, label: r.label })) : []),
    ...(items.section.length ? (await db.logicalSection.findMany({ where: { workspaceId, sectionKey: { in: items.section } }, select: { sectionKey: true, status: true, title: true } })).map((r) => ({ kind: "section" as const, key: r.sectionKey, status: r.status, label: r.title })) : []),
    ...(items.document_type.length ? (await db.documentType.findMany({ where: { workspaceId, documentTypeKey: { in: items.document_type } }, select: { documentTypeKey: true, status: true, name: true } })).map((r) => ({ kind: "document_type" as const, key: r.documentTypeKey, status: r.status, label: r.name })) : []),
  ];
  const ids = [...new Set(rows.map((r) => `${r.kind}|${r.key}`))];
  for (const id of ids) {
    const mine = rows.filter((r) => `${r.kind}|${r.key}` === id);
    if (!mine.every((r) => r.status === "DRAFT")) continue;
    const ch = latest.get(id);
    if (!ch || ch.status === "WITHDRAWN") out.push({ kind: mine[0].kind, key: mine[0].key, label: mine[0].label, status: "NOT_PROPOSED" });
  }
  return out;
}
export const unapprovedWhy = (rows: Unapproved[]) => {
  const why = rows.every((r) => r.status === "RETURNED") ? "returned to the author: correct it or withdraw it on To review" : rows.every((r) => r.status === "NOT_PROPOSED") ? "not approved by a second person: propose it on To review" : "waiting for a second person on To review";
  const fields = rows.every((r) => r.kind === "field");
  const noun = fields ? (rows.length === 1 ? "a new shared field that is" : "new shared fields that are") : (rows.length === 1 ? `a new ${KIND_NOUN[rows[0].kind]} that is` : "new library items that are");
  return `it uses ${rows.slice(0, 3).map((r) => `"${r.label ?? r.key}"`).join(", ")}${rows.length > 3 ? ` and ${rows.length - 3} more` : ""}, ${noun} ${why}`;
};

/** B1 (break B1): the person who proposed a returned new field (or an author) corrects its name, meaning or reason and
 *  sends it to a second person again. */
export async function resubmitChange(db: Db, actor: Actor, id: string, b: { label?: string; meaning?: string; reason?: string }) {
  const c = await db.libraryChange.findUnique({ where: { id } });
  if (!c) throw problem(404, "Not found", "This library change does not exist (the demo may have been reset).");
  if (c.status !== "RETURNED") throw problem(409, "Not returned", `Only a returned change is corrected and sent again; this one is ${c.status.toLowerCase()}.`);
  if (c.proposedBy !== actor.id && !(actor.duties as readonly string[]).includes("author")) throw problem(403, "Not allowed", "The person who proposed it, or a configuration author, corrects it.");
  const reason = (b.reason ?? "").trim();
  if (reason.length < 8 || reason.length > 300) throw problem(400, "Say what changed", "Say what you corrected, so the second person can check it (8 to 300 characters).");
  const label = b.label === undefined ? c.label : b.label.normalize("NFKC").replace(/[\p{Cf}]/gu, "").trim().replace(/\s+/g, " ");
  if (label !== null && (!label || label.length > 120 || !/[\p{L}\p{N}]/u.test(label))) throw problem(400, "Check the name", "Give the field a name of letters or digits, under 120 characters.");
  const meaning = b.meaning === undefined ? undefined : b.meaning.trim();
  if (meaning !== undefined && (meaning.length < 8 || meaning.length > 500)) throw problem(400, "Check the meaning", "Say what the field means in a sentence (8 to 500 characters).");
  if (label && label !== c.label) { const twin = await sameName(db, c.workspaceId, c.key.split(".")[0], label); if (twin) throw problem(409, "Name already used", `"${label}" is already a shared field in this group (${twin.label}).`); }
  return db.$transaction(async (tx) => {
    const done = await tx.libraryChange.updateMany({ where: { id, status: "RETURNED" }, data: { status: "WAITING", label, reason, decidedBy: null, decidedAt: null, version: { increment: 1 }, decisionNote: `Corrected after: ${c.decisionNote ?? "returned"}`.slice(0, 300) } });
    if (!done.count) throw problem(409, "Changed meanwhile", "Someone changed this at the same moment. Refresh to see it.");
    if (c.kind === "field") await tx.canonicalField.updateMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" }, data: { ...(label ? { label, labelChecked: true } : {}), ...(meaning ? { meaning } : {}), updatedBy: actor.id } });
    return changeView((await tx.libraryChange.findUnique({ where: { id } }))!);
  });
}

/** B1 (break B1): an author withdraws a new field that is waiting or returned. It leaves the draft: the form fields that
 *  read it go back to "no decision" (K1), and its never-released draft rows are removed. Nothing released changes. */
export async function withdrawChange(db: Db, actor: Actor, id: string, note?: string) {
  if (!(actor.duties as readonly string[]).includes("author")) throw problem(403, "Not allowed", `${actor.name} (simulated) does not hold the author duty.`);
  const c = await db.libraryChange.findUnique({ where: { id } });
  if (!c) throw problem(404, "Not found", "This library change does not exist (the demo may have been reset).");
  if (isLifecycleKind(c.kind)) return withdrawLifecycle(db, actor, c, note); // W1-03: remove, retire or restore (P-116)
  if (c.kind !== "field" || c.action !== "ADD" || !["WAITING", "RETURNED"].includes(c.status)) throw problem(409, "Cannot withdraw", "Only a new shared field that is waiting or returned is withdrawn.");
  const why = (note ?? "").trim();
  if (why.length < 3 || why.length > 300) throw problem(400, "Say why", "Say why it is withdrawn (3 to 300 characters).");
  return db.$transaction(async (tx) => {
    if (await tx.canonicalField.count({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: { not: "DRAFT" } } })) throw problem(409, "Already released", "This field was released meanwhile; retire it in the library instead.");
    const done = await tx.libraryChange.updateMany({ where: { id, status: { in: ["WAITING", "RETURNED"] } }, data: { status: "WITHDRAWN", decidedBy: actor.id, decidedAt: new Date(), decisionNote: why } });
    if (!done.count) throw problem(409, "Changed meanwhile", "Someone decided this at the same moment. Refresh to see it.");
    const maps = await tx.formFieldMap.updateMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" }, data: { outcome: "unresolved", canonicalFieldKey: null, transform: null, person: null, reason: `The new field "${c.label ?? c.key}" was withdrawn: ${why}`.slice(0, 500), updatedBy: actor.id } });
    await tx.sectionQuestion.deleteMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT", version: 1 } });
    await tx.canonicalField.deleteMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" } });
    return { ...changeView((await tx.libraryChange.findUnique({ where: { id } }))!), form_fields_reopened: maps.count };
  });
}

/** The one publisher (B1): every APPROVED change goes into this pack version, called by the shared release and by a
 *  single combination's approval inside their transaction. ADD publishes the item's draft rows (already published when a
 *  released combination carries it), RETIRE takes effect now, RESTORE brings a retired item back. DELETE never reaches a
 *  release (approved deletes are removed at once, Screen 04 L1); EDIT_RULE is Screen 04's and stays approved here. */
export async function publishLibraryChanges(tx: Prisma.TransactionClient, workspaceId: string, pack: number, only: { ids?: string[]; items?: LibraryItems }) {
  // Only what the releaser saw (break m15): the shared release passes the changes its Release page listed; a single
  // combination's approval passes the fields that combination uses (the shared release passes both). A change approved
  // in between, used by nothing released now, waits for the next release.
  const approved: LibraryChange[] = await tx.libraryChange.findMany({ where: { workspaceId, status: "APPROVED", action: { in: ["ADD", "RETIRE", "RESTORE"] }, OR: [...(only.ids?.length ? [{ id: { in: only.ids } }] : []), ...(only.items ? (["field", "section", "document_type"] as const).filter((k) => only.items![k].length).map((k) => ({ kind: k, key: { in: only.items![k] } })) : [])] }, orderBy: { proposedAt: "asc" } });
  const out: { kind: string; key: string; label: string; action: string }[] = [];
  for (const c of approved) {
    const rows = await versionsOf(tx, c.kind, workspaceId, c.key);
    // W1-03 (P-116, api/src/lifecycle.ts): a structure name or a combination is retired or restored by this release.
    if (!rows && !(await publishLifecycle(tx, c))) continue;
    if (!rows) {
      await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
      out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
      continue;
    }
    if (c.action === "ADD") {
      for (const d of rows.filter((r) => r.status === "DRAFT")) { if (d.supersedesId) await setStatus(tx, c.kind, d.supersedesId, "SUPERSEDED"); await setStatus(tx, c.kind, d.id, "PUBLISHED"); }
    } else {
      const from = c.action === "RETIRE" ? "PUBLISHED" : "RETIRED", to = c.action === "RETIRE" ? "RETIRED" : "PUBLISHED";
      const cur = rows.filter((r) => r.status === from).sort((x, y) => y.version - x.version)[0];
      if (cur) await setStatus(tx, c.kind, cur.id, to);
    }
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  return out;
}
type Status = "DRAFT" | "PUBLISHED" | "SUPERSEDED" | "RETIRED";
type Version = { id: string; status: Status; version: number; supersedesId: string | null };
const pick = { id: true, status: true, version: true, supersedesId: true } as const;
/** The versions of one library item, by kind (fields, sections, document types); null for a kind this publisher does not
 *  publish (checks belong to their combination). */
async function versionsOf(tx: Prisma.TransactionClient, kind: string, workspaceId: string, key: string): Promise<Version[] | null> {
  if (kind === "field") return tx.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key }, select: pick });
  if (kind === "section") return tx.logicalSection.findMany({ where: { workspaceId, sectionKey: key }, select: pick });
  if (kind === "document_type") return tx.documentType.findMany({ where: { workspaceId, documentTypeKey: key }, select: pick });
  return null;
}
async function setStatus(tx: Prisma.TransactionClient, kind: string, id: string, status: Status) {
  if (kind === "field") await tx.canonicalField.update({ where: { id }, data: { status } });
  else if (kind === "section") await tx.logicalSection.update({ where: { id }, data: { status } });
  else if (kind === "document_type") await tx.documentType.update({ where: { id }, data: { status } });
}
