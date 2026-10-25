// Screen 02 slice 2, reused by Screen 04 (Screen 04 challenge B1, M1, M6): one record for a change to the shared library
// that a second person approves (LibraryChange), the one key generator (keyFor) and the one publisher both release paths
// call inside their transaction (publishLibraryChanges). A combination whose draft uses an item whose ADD is still
// waiting (or was returned) is not released: the item review cannot be skipped by releasing a combination.
import { HttpException, HttpStatus } from "@nestjs/common";
import type { LibraryChange } from "@prisma/client";
import { normalizeLabel } from "../../contracts/programs.ts";
import { ACTORS, type Actor, type Db } from "./core.ts";

export const LIBRARY_KINDS = ["field", "section", "document_type", "check"] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];
export const KIND_NOUN: Record<string, string> = { field: "shared field", section: "section", document_type: "document type", check: "check" };
const ACTION_WORD: Record<string, string> = { ADD: "Add", DELETE: "Delete", RETIRE: "Retire", RESTORE: "Restore", EDIT_RULE: "Change the rule of" };
const nameOf = (id: string | null | undefined) => (id ? ACTORS.find((a) => a.id === id)?.name ?? "A person" : null);
const problem = (status: number, title: string, detail: string) => new HttpException({ type: `https://expatready.local/problems/${status}`, title, status, detail }, status);

/** A new shared field's key, from its subject's group and its name (P-34 Layer 1, Screen 04 M1): "person" + "Place of
 *  birth" → person.place_of_birth; a key already taken gets _2, _3… Keys are never typed by a person. */
export function keyFor(group: string, label: string, taken: Set<string>): string {
  const g = group.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "case";
  const a = label.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "field";
  let key = `${g}.${a}`;
  for (let n = 2; taken.has(key); n++) key = `${g}.${a}_${n}`;
  return key;
}

/** Same name in the same group, ignoring case, spaces and punctuation: an exact duplicate, refused without AI (BR-7). */
export async function sameName(db: Pick<Db, "canonicalField">, workspaceId: string, group: string, label: string, except?: string) {
  const want = normalizeLabel(label);
  const rows = await db.canonicalField.findMany({ where: { workspaceId, groupKey: group, status: { in: ["DRAFT", "PUBLISHED"] }, mergedIntoKey: null }, select: { canonicalFieldKey: true, label: true, aliases: true } });
  return rows.find((r) => r.canonicalFieldKey !== except && [r.label ?? "", ...r.aliases].some((x) => normalizeLabel(x) === want)) ?? null;
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
  if (decision === "return" && !note?.trim()) throw problem(400, "Say why", "Say why it goes back, so the author can correct it.");
  const done = await db.libraryChange.updateMany({ where: { id, status: "WAITING" }, data: { status: decision === "approve" ? "APPROVED" : "RETURNED", decidedBy: actor.id, decidedAt: new Date(), decisionNote: note?.trim() || null } });
  if (!done.count) throw problem(409, "Already decided", "Someone decided this change at the same moment. Refresh to see it.");
  return changeView((await db.libraryChange.findUnique({ where: { id } }))!);
}

/** The keys a combination's draft uses whose ADD is not approved yet: its release is refused (409) until a second
 *  person approves them on To review. */
export async function unapprovedAdds(db: Pick<Db, "libraryChange">, workspaceId: string, fieldKeys: string[]) {
  if (!fieldKeys.length) return [];
  return db.libraryChange.findMany({ where: { workspaceId, kind: "field", action: "ADD", status: { in: ["WAITING", "RETURNED"] }, key: { in: fieldKeys } } });
}
export const unapprovedWhy = (rows: LibraryChange[]) => `it uses ${rows.slice(0, 3).map((r) => `"${r.label ?? r.key}"`).join(", ")}${rows.length > 3 ? ` and ${rows.length - 3} more` : ""}, ${rows.length === 1 ? "a new shared field that is" : "new shared fields that are"} ${rows.every((r) => r.status === "RETURNED") ? "returned to the author" : "waiting for a second person on To review"}`;

/** The one publisher (B1): every APPROVED change goes into this pack version, called by the shared release and by a
 *  single combination's approval inside their transaction. ADD publishes the item's draft rows (already published when a
 *  released combination carries it), RETIRE takes effect now, RESTORE brings a retired item back. DELETE never reaches a
 *  release (approved deletes are removed at once, Screen 04 L1); EDIT_RULE is Screen 04's and stays approved here. */
export async function publishLibraryChanges(tx: any, workspaceId: string, pack: number) {
  const approved: LibraryChange[] = await tx.libraryChange.findMany({ where: { workspaceId, status: "APPROVED", action: { in: ["ADD", "RETIRE", "RESTORE"] } }, orderBy: { proposedAt: "asc" } });
  const out: { kind: string; key: string; label: string; action: string }[] = [];
  for (const c of approved) {
    const at = DELEGATE[c.kind];
    if (!at) continue;
    const delegate = tx[at.model], where = { workspaceId, [at.key]: c.key };
    if (c.action === "ADD") {
      for (const d of await delegate.findMany({ where: { ...where, status: "DRAFT" } })) { if (d.supersedesId) await delegate.update({ where: { id: d.supersedesId }, data: { status: "SUPERSEDED" } }); await delegate.update({ where: { id: d.id }, data: { status: "PUBLISHED" } }); }
    } else {
      const from = c.action === "RETIRE" ? "PUBLISHED" : "RETIRED", to = c.action === "RETIRE" ? "RETIRED" : "PUBLISHED";
      const cur = await delegate.findFirst({ where: { ...where, status: from }, orderBy: { version: "desc" } });
      if (cur) await delegate.update({ where: { id: cur.id }, data: { status: to } });
    }
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  return out;
}
const DELEGATE: Record<string, { model: string; key: string }> = { field: { model: "canonicalField", key: "canonicalFieldKey" }, section: { model: "logicalSection", key: "sectionKey" }, document_type: { model: "documentType", key: "documentTypeKey" } };
