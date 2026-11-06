// Screen 02 slice 2, reused by Screen 04 (Screen 04 challenge B1, M1, M6): one record for a change to the shared library
// that a second person approves (LibraryChange), the one key generator (keyFor) and the one publisher both release paths
// call inside their transaction (publishLibraryChanges). A combination whose draft uses an item whose ADD is still
// waiting (or was returned) is not released: the item review cannot be skipped by releasing a combination.
import { recordedDerivation } from "../../../p5/transforms.ts";
import { ACCOUNT_WORDS } from "../../contracts/forms.ts";
import { acceptsWords, roleWords } from "../../contracts/form-library.ts";
import { HttpException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { LibraryChange, Origin, Prisma } from "@prisma/client";
import { normalizeLabel } from "../../contracts/programs.ts";
import { factName } from "../../engine/fact-name.ts";
import { isRuleWhy } from "../../engine/near.ts";
import { ACTORS, type Actor, type Db } from "./core.ts";
import { isLifecycleKind, publishLifecycle, withdrawLifecycle } from "./lifecycle.ts";
import { isItemLifecycle, lockItem } from "./library-items.ts";
import { fieldReaders, readerWords, type FieldReader } from "./where-used.ts";
import { ACTION_LABEL } from "../../contracts/lifecycle.ts";
import { fillsView, releaseFills } from "./who-fills.ts";
import { conditionView, COND_KIND, releaseCondition } from "./question-condition.ts";
import { ASK_ACTION, FORM_FIELD_KIND, formFieldView, releaseFormFieldCondition, restoreReplaced } from "./form-field-condition.ts";
import { dropFieldList, releaseFieldList } from "./answer-values.ts";
import { dropFactFromChanges, releaseSupplies, suppliesView, withdrawApprovedSupplies } from "./document-supplies.ts";
import { SUPPLIES_KIND } from "../../contracts/document-supplies.ts";

export const LIBRARY_KINDS = ["field", "section", "document_type", "check"] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];
export const KIND_NOUN: Record<string, string> = { library_form: "library form", answer_list: "answer list", form_accepts: "what IRCC accepts", form_role: "form", placement_fills: "a question", placement_condition: "when a question is asked", form_field_condition: "when a form field is filled", document_supplies: "the facts a document supplies", field: "shared field", section: "section", document_type: "document type", check: "check", structure_node: "structure name", combination: "combination" };
// The lifecycle words come from the one word set (contracts/lifecycle.ts, P-116 amended 28 Oct): Delete, Retire, Restore.
// "Remove" is kept for a form line taken off a combination (it stays in the library, P-123).
// QA-113: the action word already says "who fills", so its noun is "a question" ("Change who fills a question: …").
const ACTION_WORD: Record<string, string> = { ADD: "Add", DELETE: ACTION_LABEL.DELETE, RETIRE: ACTION_LABEL.RETIRE, RESTORE: ACTION_LABEL.RESTORE, EDIT_RULE: "Change the rule of", SET_ACCEPTS: "Set what IRCC accepts for", SET_ROLE: "Change the role of", SET_FILLS: "Change who fills", SET_CONDITION: "Change when it is asked:", SET_FORM_FIELD_CONDITION: "Change", SET_FORM_FIELD_QUESTION: "Change", SET_SUPPLIES: "Change", RENAME: "Rename" };
export const actionWord = (action: string, _kind?: string) => ACTION_WORD[action] ?? action;
/** The same word inside a sentence ("approved delete …", "set what IRCC accepts for …"): only its first letter lowered. */
export const actionVerb = (action: string, kind?: string) => { const w = actionWord(action, kind); return w[0].toLowerCase() + w.slice(1); };
/** What the change is about, as a noun ("this library form", "this change to what IRCC accepts"). */
const changeNoun = (kind: string) => (kind === "form_accepts" ? "change to what IRCC accepts" : kind === "form_role" ? "change of a form's role" : kind === "placement_fills" ? "change of who fills a question" : kind === "placement_condition" ? "change of when a question is asked" : kind === "form_field_condition" ? "change of when a form field is filled" : kind === SUPPLIES_KIND ? "change of the facts a document supplies" : KIND_NOUN[kind] ?? "change");
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
export async function sameName(db: Pick<Db, "canonicalField" | "libraryChange" | "proposalItem">, workspaceId: string, group: string, label: string, exceptItem?: string): Promise<{ label: string; valueType?: string } | null> {
  const want = normalizeLabel(label);
  const rows = await db.canonicalField.findMany({ where: { workspaceId, groupKey: group, status: { in: ["DRAFT", "PUBLISHED"] }, mergedIntoKey: null }, select: { canonicalFieldKey: true, label: true, aliases: true, valueType: true } });
  const lib = rows.find((r) => [r.label ?? "", ...r.aliases].some((x) => normalizeLabel(x) === want));
  if (lib) return { label: lib.label ?? factName(lib.canonicalFieldKey), valueType: lib.valueType };
  const open = await db.libraryChange.findMany({ where: { workspaceId, kind: "field", status: { in: ["WAITING", "APPROVED"] }, key: { startsWith: `${group}.` } }, select: { label: true } });
  const ch = open.find((c) => c.label && normalizeLabel(c.label) === want);
  if (ch) return { label: ch.label! };
  const decided = await db.proposalItem.findMany({ where: { workspaceId, choice: "NEW", decidedKey: { startsWith: `${group}.` }, run: { status: "COMPLETED" }, ...(exceptItem ? { id: { not: exceptItem } } : {}) }, select: { payload: true } });
  const it = decided.find((d) => { const l = (d.payload as { label?: string } | null)?.label; return !!l && normalizeLabel(l) === want; });
  return it ? { label: (it.payload as { label: string }).label } : null;
}

export function changeView(c: LibraryChange) {
  return { id: c.id, kind: c.kind, kind_word: c.action === ASK_ACTION ? "the question a form field asks" : KIND_NOUN[c.kind] ?? c.kind, key: c.key, label: c.label ?? c.key, action: c.action, action_word: actionWord(c.action, c.kind), reason: c.reason,
    ai_verdict: c.aiVerdict, matches: c.matches, status: c.status, proposed_by: nameOf(c.proposedBy), proposed_by_id: c.proposedBy, proposed_at: c.proposedAt,
    decided_by: nameOf(c.decidedBy), decided_at: c.decidedAt, decision_note: c.decisionNote, released_in: c.releasedIn, combination_id: c.combinationId, batch_id: c.batchId ?? null, // QA-193
    ...(c.kind === "form_accepts" ? { accepts: acceptsView(c) } : {}), ...(c.kind === "placement_fills" ? { fills: fillsView(c) } : {}), ...(c.kind === COND_KIND ? { condition: conditionView(c) } : {}), ...(c.kind === FORM_FIELD_KIND ? { form_field: formFieldView(c) } : {}), ...(c.kind === SUPPLIES_KIND ? { supplies: suppliesView(c) } : {}),
    ...(c.action === "RENAME" ? { rename: renameView(c) } : {}) }; // C4.9 (runtime lane); G-CORE B2 rename
}
/** C11.13 (P-120: "a near duplicate needs a one-line reason, shown to the second person at release"): for each change
 *  that came from a proposal close to an existing library item, the items it is close to (the library's name and key
 *  when the item is in the library, else the words the proposal gave) and the reason given. Read from the proposal's
 *  own identity, never parsed from the change's reason text. `given` is false when the reason is only the rule's own
 *  words for why it is near (the one door found the match itself and no person said why it is not the same); `by` says
 *  whose words a given reason is: the AI's (an AI-drafted item, review c1113 m1) or a person's. */
export type NearView = { items: { key: string | null; name: string }[]; reason: string; given: boolean; by: "person" | "ai" };
export async function nearOf(db: Db, workspaceId: string, changes: Pick<LibraryChange, "id" | "proposalItemId">[]): Promise<Map<string, NearView>> {
  const ids = [...new Set(changes.map((c) => c.proposalItemId).filter((x): x is string => !!x))];
  const out = new Map<string, NearView>();
  if (!ids.length) return out;
  const items = await db.proposalItem.findMany({ where: { workspaceId, id: { in: ids } }, select: { id: true, identity: true, origin: true } });
  const originOf = new Map(items.map((i) => [i.id, i.origin]));
  const near = new Map(items.map((i) => [i.id, i.identity as { near?: string[]; nearReason?: string | null; nearReasonBy?: string } | null]).filter(([, x]) => !!(x as { near?: string[] } | null)?.near?.length && !!(x as { nearReason?: string | null }).nearReason) as [string, { near: string[]; nearReason: string; nearReasonBy?: string }][]);
  if (!near.size) return out;
  const words = [...new Set([...near.values()].flatMap((x) => x.near))];
  const fields = await db.canonicalField.findMany({ where: { workspaceId, OR: [{ canonicalFieldKey: { in: words } }, { label: { in: words } }] }, orderBy: { version: "desc" }, select: { canonicalFieldKey: true, label: true } });
  const byKey = new Map<string, string>(), byName = new Map<string, string>();
  for (const f of fields) { if (!byKey.has(f.canonicalFieldKey)) byKey.set(f.canonicalFieldKey, f.label ?? f.canonicalFieldKey); if (f.label && !byName.has(normalizeLabel(f.label))) byName.set(normalizeLabel(f.label), f.canonicalFieldKey); }
  const item = (w: string) => byKey.has(w) ? { key: w, name: byKey.get(w)! } : byName.has(normalizeLabel(w)) ? { key: byName.get(normalizeLabel(w))!, name: w } : { key: null, name: w };
  for (const c of changes) { const x = c.proposalItemId ? near.get(c.proposalItemId) : undefined; if (x) out.set(c.id, { items: x.near.map(item), reason: x.nearReason, given: !isRuleWhy(x.nearReason), by: x.nearReasonBy === "person" || originOf.get(c.proposalItemId!) !== "ai" ? "person" : "ai" }); }
  return out;
}

/** G-CORE B2: what the second person compares on a rename: the name before and the name proposed. */
export function renameView(c: Pick<LibraryChange, "label" | "matches">) {
  const m = (c.matches ?? {}) as { before?: string; before_words?: string; undo_of?: string | null };
  return { before: m.before_words ?? m.before ?? null, after: c.label ?? null, undo: !!m.undo_of };
}

/** C11.18: what the second person compares: before → after, IRCC's line or the reason, and the form's canada.ca page. */
/** P-319 (review of #833, M1): a form's role change in words, built from what approval applies (never from its label). */
export function roleView(c: Pick<LibraryChange, "key" | "matches" | "reason">) {
  const m = (c.matches ?? {}) as { from?: string | null; to?: string | null };
  return { form: c.key, before: roleWords(m.from), after: roleWords(m.to), reason: c.reason ?? "" };
}
export function acceptsView(c: Pick<LibraryChange, "key" | "matches">) {
  const m = (c.matches ?? {}) as { account?: string; channels?: string[]; before?: string[] | null; quote?: string | null; reason?: string | null; form_page?: string | null; edition?: string; readings?: unknown; check?: string | null };
  // P-143: the account it is for; P-140 (C-5): the finder's two readings and, when they or the keyword rule disagree, why to check.
  return { form: c.key, edition: m.edition ?? null, account: ACCOUNT_WORDS[(m.account ?? "ANY") as "ANY"] ?? m.account, before: acceptsWords(m.before), after: acceptsWords(m.channels), quote: m.quote ?? null, reason: m.reason ?? null, form_page: m.form_page ?? null,
    ...(m.readings ? { readings: m.readings } : {}), check: m.check ?? null };
}

/** A second person decides (P-53 item 4, BR-9): never the person who proposed it. Claimed on its status, so two
 *  decisions at the same moment cannot both succeed. */
export async function decideChange(db: Pick<Db, "libraryChange" | "changeSet"> | Prisma.TransactionClient, actor: Actor, id: string, decision: "approve" | "return", note?: string) {
  if (!(actor.duties as readonly string[]).includes("review")) throw problem(403, "Not allowed", `${actor.name} (simulated) does not hold the review duty.`);
  const c = await db.libraryChange.findUnique({ where: { id } });
  if (!c) throw problem(404, "Not found", "This library change does not exist (the demo may have been reset).");
  if (c.status !== "WAITING") throw problem(409, "Already decided", `This change is already ${c.status.toLowerCase()}.`);
  if (c.proposedBy === actor.id) throw problem(403, "A different person decides", `You proposed this ${c.action === ASK_ACTION ? "change of the question a form field asks" : changeNoun(c.kind)}, so a different person approves or returns it.`);
  // Break M2: the person who applied the draft that created it is not the second person either.
  if (c.appliedBy === actor.id) throw problem(403, "A different person decides", `You applied the draft that created this ${c.action === ASK_ACTION ? "change of the question a form field asks" : changeNoun(c.kind)}, so a different person approves or returns it.`);
  if (decision === "return" && !note?.trim()) throw problem(400, "Say why", "Say why it goes back, so the author can correct it.");
  if ((note ?? "").length > 300) throw problem(400, "Too long", "Keep the reason under 300 characters.");
  const write = async (w: Pick<Db, "libraryChange" | "changeSet"> | Prisma.TransactionClient) => {
    const done = await w.libraryChange.updateMany({ where: { id, status: "WAITING" }, data: { status: decision === "approve" ? "APPROVED" : "RETURNED", decidedBy: actor.id, decidedAt: new Date(), decisionNote: note?.trim() || null } });
    if (!done.count) throw problem(409, "Already decided", "Someone decided this change at the same moment. Refresh to see it.");
    // G-CORE B2 (review M1): a returned change's change set (a rename through the door) stops waiting, in the same write.
    if (decision === "return") await w.changeSet.updateMany({ where: { libraryChangeId: id, status: "waiting" }, data: { status: "undone" } });
    if (decision === "return" && c.kind === FORM_FIELD_KIND) await restoreReplaced(w as Prisma.TransactionClient, c); // B88 review M3
  };
  if ("$transaction" in db && typeof db.$transaction === "function") await (db as Db).$transaction((tx) => write(tx)); else await write(db);
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

/** B1 (break B1): the person who proposed a returned new field corrects its name, meaning or reason and sends it to a
 *  second person again. Only they do (P-193, B50): another author who corrected it could then approve it alone. */
export async function resubmitChange(db: Db, actor: Actor, id: string, b: { label?: string; meaning?: string; reason?: string }) {
  const c = await db.libraryChange.findUnique({ where: { id } });
  if (!c) throw problem(404, "Not found", "This library change does not exist (the demo may have been reset).");
  if (c.status !== "RETURNED") throw problem(409, "Not returned", `Only a returned change is corrected and sent again; this one is ${c.status.toLowerCase()}.`);
  // P-319 (review of #833, M1 and M2): a role change has nothing to correct but the role, so it is never sent again with
  // other words: its proposer withdraws it and proposes the role again (POST /library/forms/:code/role).
  if (c.kind === "form_role") throw problem(409, "Propose it again", "A returned role change is not sent again: withdraw it, then propose the form's role again on its form.");
  // C4.5: likewise the facts a document supplies: withdrawn, then proposed again with their official words.
  if (c.kind === SUPPLIES_KIND) throw problem(409, "Propose it again", "A returned change of the facts a document supplies is not sent again: withdraw it, then propose the facts again on its document type.");
  // B86 BR-7: likewise a form field's condition: proposing again runs its checks again.
  if (c.kind === FORM_FIELD_KIND) throw problem(409, "Propose it again", c.action === ASK_ACTION ? "A returned change of a form field is not sent again: withdraw it, then ask the Yes/No as its deciding question again." : "A returned change of a form field is not sent again: withdraw it, then confirm the form field again.");
  // G-CORE B2: a rename is sent again through its door (the check runs again), never corrected here.
  if (c.action === "RENAME") throw problem(409, "Rename it again", "A returned rename is not sent again from here: rename it again on its page, where the check runs again.");
  if (c.proposedBy !== actor.id) throw problem(403, "Not yours", `Only the person who proposed a change can correct it and send it again. ${ACTORS.find((a) => a.id === c.proposedBy)?.name ?? "Another person"} proposed this one: ask them to correct or withdraw it.`);
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

/** A Yes/No form field worked out from whether other answers are recorded ("derived: … recorded -> yes_no_code"). */
export const isWorkedOutYesNo = (transform: string | null | undefined) => !!recordedDerivation(transform) && /\byes_no_code\b/.test(transform ?? "");
type AskedRow = { canonicalFieldKey: string | null; transform: string | null; condition: string | null; conditionRule: unknown; outcome: string; person: string | null; row: number | null; optionMap: unknown; listPurpose: unknown; status: string };
/** B83 (BR-9, breaker M3): a draft row over a released one that differs from it only by this ask: with the ask taken back
 *  it is no change at all, so it goes, and the release sees none. */
export const onlyThisAsk = (cur: AskedRow, under: AskedRow | null | undefined, fact: string) => !!under && cur.status === "DRAFT" && under.canonicalFieldKey === fact && under.transform === cur.transform && under.condition === cur.condition && JSON.stringify(under.conditionRule ?? null) === JSON.stringify(cur.conditionRule ?? null) && under.outcome === cur.outcome && under.person === cur.person && under.row === cur.row && JSON.stringify(under.optionMap) === JSON.stringify(cur.optionMap) && JSON.stringify(under.listPurpose) === JSON.stringify(cur.listPurpose);
/** B83 (review R5, breaker M11): what an ask replaced on a draft row, kept with the ask's history line, so taking it back by
 *  either door is not a person's decision about the mapping (`needs_sme` counts an AI proposal's origin). */
export async function whatAskReplaced(tx: Prisma.TransactionClient, workspaceId: string, editionId: string, dataPath: string) {
  const asked = await tx.auditEvent.findFirst({ where: { workspaceId, entity: "form field", entityKey: dataPath, action: "decided", detail: { path: ["edition"], equals: editionId } }, orderBy: { at: "desc" }, select: { detail: true } });
  return (asked?.detail as { undo?: { origin: Origin; confidence: string | null; evidenceQuote: string | null; reason: string | null } } | null)?.undo ?? null;
}
/** What a withdrawal leaves reading the field (tech lead on breaker M5), for To review's words before and after the press.
 *  Its form fields are not among them, nor a change of a document's facts: the withdrawal puts those right itself. */
const PUT_RIGHT = new Set<FieldReader["kind"]>(["form_field", "waiting_supplies", "document_type_change"]);
export async function readersLeftByWithdrawal(db: Parameters<typeof fieldReaders>[0], workspaceId: string, key: string) {
  const all = await fieldReaders(db, workspaceId, key);
  return { readers: all.filter((r) => !PUT_RIGHT.has(r.kind)), takenOut: all.filter((r) => r.kind === "waiting_supplies") };
}
/** Breaker M1: a new field's key. A withdrawn field's key is free again only when nothing still reads it: otherwise the new
 *  field would take over its readers in silence, with another meaning, and the hold on them would go. */
export async function freeKey(db: Parameters<typeof fieldReaders>[0], workspaceId: string, group: string, label: string, taken: Set<string>) {
  for (;;) {
    const key = keyFor(group, label, taken);
    if (!(await withdrawnStillRead(db, workspaceId, key))) return key;
    taken.add(key);
  }
}
/** Breaker M7, M8 on B83: what a draft reads beyond its own fields (a document type's facts, a check, where an answer comes
 *  from): a new field still waiting there would be released unapproved, and could then be withdrawn from under it. */
export async function waitingSupplied(db: Pick<Db, "libraryChange">, workspaceId: string, s: { canonical_fields: { id: string }[]; document_types: { supplies_facts?: string[] }[]; checks?: { condition?: unknown }[]; fact_sources?: { fact: string }[] }): Promise<Unapproved[]> {
  const used = new Set(s.canonical_fields.map((f) => f.id));
  const read = (c: unknown) => (c ? [...JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]) : []);
  const keys = [...new Set([...s.document_types.flatMap((t) => t.supplies_facts ?? []), ...(s.checks ?? []).flatMap((c) => read(c.condition)), ...(s.fact_sources ?? []).map((f) => f.fact)])].filter((k) => !used.has(k));
  if (!keys.length) return [];
  const rows = await db.libraryChange.findMany({ where: { workspaceId, kind: "field", action: "ADD", key: { in: keys }, status: { in: ["WAITING", "RETURNED"] } }, select: { key: true, label: true, status: true } });
  return rows.map((c) => ({ kind: "field" as const, key: c.key, label: c.label, status: c.status as Unapproved["status"] }));
}
/** Breaker M6, M9 on B83: a withdrawn field's key given a new meaning for one rule would take over its other readers in
 *  silence: they are changed first, by name. Asked when the fact is proposed and again when it lands. */
export async function refuseTakingOverReaders(db: Parameters<typeof fieldReaders>[0], workspaceId: string, key: string, combinationId: string | null | undefined, ruleKey: string | null | undefined) {
  if (!(await db.libraryChange.count({ where: { workspaceId, kind: "field", action: "ADD", status: "WITHDRAWN", key } }))) return;
  const others = (await fieldReaders(db, workspaceId, key)).filter((r) => !(r.combinationId === combinationId && r.ref === ruleKey));
  if (others.length) throw problem(409, "Still read", `This fact was a new field that was withdrawn, and ${readerWords(others)} still ${others.length === 1 ? "reads" : "read"} it. Point ${others.length === 1 ? "it" : "them"} at another field first: a new meaning here would change what ${others.length === 1 ? "it means" : "they mean"}.`);
}
/** What holds a combination's release: unapproved items it uses, and new fields its document types supply. */
export async function unapprovedOf(db: Pick<Db, "libraryChange" | "canonicalField" | "logicalSection" | "documentType">, workspaceId: string, s: Parameters<typeof itemsOf>[0] & Parameters<typeof waitingSupplied>[2]) {
  const out = await unapprovedAdds(db, workspaceId, itemsOf(s));
  return [...out, ...(await waitingSupplied(db, workspaceId, s)).filter((w) => !out.some((o) => o.kind === w.kind && o.key === w.key))];
}
/** A withdrawn new field's key that something still reads. */
export async function withdrawnStillRead(db: Parameters<typeof fieldReaders>[0], workspaceId: string, key: string) {
  return !!(await db.libraryChange.count({ where: { workspaceId, kind: "field", action: "ADD", status: "WITHDRAWN", key } })) && !!(await fieldReaders(db, workspaceId, key)).length;
}

/** B1 (break B1): an author withdraws a new field that is waiting or returned. It leaves the draft: the form fields that
 *  read it go back to "no decision" (K1), and its never-released draft rows are removed. Nothing released changes.
 *  B83 (breaker M2): the field's lock comes first, so an ask choosing it runs wholly before or wholly after; `guard` runs
 *  under that lock and may refuse (Undo: nothing else may read it). Tech lead on breaker M5: To review's withdraw is never
 *  refused for a reader: its answer names them, and each holds Submit by name (engine/validate.ts withdrawnFieldLines). */
export async function withdrawChange(db: Db, actor: Actor, id: string, note?: string, guard?: (tx: Prisma.TransactionClient) => Promise<void>) {
  if (!(actor.duties as readonly string[]).includes("author")) throw problem(403, "Not allowed", `${actor.name} (simulated) does not hold the author duty.`);
  const c = await db.libraryChange.findUnique({ where: { id } });
  if (!c) throw problem(404, "Not found", "This library change does not exist (the demo may have been reset).");
  // DV-bb-9: only the person who proposed a change withdraws it, whatever its kind (as only they undo their own delete).
  if (c.proposedBy !== actor.id) throw problem(403, "Not yours", `Only the person who proposed a change can withdraw it. ${ACTORS.find((a) => a.id === c.proposedBy)?.name ?? "Another person"} proposed this one: ask them to withdraw it.`);
  if (isLifecycleKind(c.kind) || isItemLifecycle(c)) return withdrawLifecycle(db, actor, c, note); // W1-03: remove, retire or restore (P-116); C11.9 fields and document types
  // C4.5 (break M2): an approved change of a document's facts not released yet is withdrawn by its proposer; its draft
  // goes back to the facts it had before.
  if (c.kind === SUPPLIES_KIND && c.status === "APPROVED") {
    const why = (note ?? "").trim();
    if (why.length < 3 || why.length > 300) throw problem(400, "Say why", "Say why it is withdrawn (3 to 300 characters).");
    return db.$transaction(async (tx) => { await withdrawApprovedSupplies(tx, actor, c, why); return changeView((await tx.libraryChange.findUnique({ where: { id } }))!); });
  }
  // P-319 (review of #833, M2): a waiting or returned role change is withdrawn like a rename: nothing was applied.
  const renaming = (c.action === "RENAME" || c.kind === "form_role" || c.kind === SUPPLIES_KIND || c.kind === FORM_FIELD_KIND) && ["WAITING", "RETURNED"].includes(c.status); // C4.5: nothing applied before approval
  if (!renaming && (c.kind !== "field" || c.action !== "ADD" || !["WAITING", "RETURNED"].includes(c.status))) throw problem(409, "Cannot withdraw", "Only a new shared field, a rename or a form's role change that is waiting or returned, or a change of the facts a document supplies that is not released yet, is withdrawn.");
  const why = (note ?? "").trim();
  if (why.length < 3 || why.length > 300) throw problem(400, "Say why", "Say why it is withdrawn (3 to 300 characters).");
  // G-CORE B2: a withdrawn rename changes nothing (the name was never changed).
  if (renaming) return db.$transaction(async (tx) => {
    const done = await tx.libraryChange.updateMany({ where: { id, status: { in: ["WAITING", "RETURNED"] } }, data: { status: "WITHDRAWN", decidedBy: actor.id, decidedAt: new Date(), decisionNote: why } });
    if (!done.count) throw problem(409, "Changed meanwhile", "Someone decided this at the same moment. Refresh to see it.");
    await tx.changeSet.updateMany({ where: { libraryChangeId: id, status: "waiting" }, data: { status: "undone" } }); // review M1: ended, not applied
    await restoreReplaced(tx, c); // B88 review M3: the approved change it closed is put back
    return changeView((await tx.libraryChange.findUnique({ where: { id } }))!);
  });
  return db.$transaction(async (tx) => {
    await lockItem(tx, c.workspaceId, "field", [c.key]);
    await guard?.(tx);
    if (await tx.canonicalField.count({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: { not: "DRAFT" } } })) throw problem(409, "Already released", "This field was released meanwhile; retire it in the library instead.");
    const done = await tx.libraryChange.updateMany({ where: { id, status: { in: ["WAITING", "RETURNED"] } }, data: { status: "WITHDRAWN", decidedBy: actor.id, decidedAt: new Date(), decisionNote: why } });
    if (!done.count) throw problem(409, "Changed meanwhile", "Someone decided this at the same moment. Refresh to see it.");
    const { readers } = await readersLeftByWithdrawal(tx, c.workspaceId, c.key);
    // Breaker M2: an open change of a document's facts naming it would publish a fact that does not exist, and hold every
    // combination that lists the document, whatever it reads: the field comes out of the change.
    const takenOut = await dropFactFromChanges(tx, actor, c.workspaceId, c.key, c.label ?? "a new field", why);
    // BR-10 (B83, challenge M2): a form field asked as its own question goes back to worked out, keeping the QA-165 check;
    // "unresolved" would lose it and hold release. Its fact is not among the facts its step names (engine/runtime/forms.ts).
    // Breaker B1, m3: only while it is still a draft. M3: a draft that only held this ask goes. m1: a named fact retired
    // since leaves the row to "no decision", which To review lists.
    let restored = 0;
    for (const m of await tx.formFieldMap.findMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" } })) {
      const named = isWorkedOutYesNo(m.transform) ? recordedDerivation(m.transform)!.facts : [];
      if (!named.length || named.includes(c.key)) continue;
      if (!(await tx.canonicalField.count({ where: { workspaceId: c.workspaceId, canonicalFieldKey: named[0], status: { in: ["DRAFT", "PUBLISHED"] } } }))) continue;
      const under = m.supersedesId ? await tx.formFieldMap.findUnique({ where: { id: m.supersedesId } }) : null;
      const back = onlyThisAsk(m, under, named[0]) ? await tx.formFieldMap.deleteMany({ where: { id: m.id, status: "DRAFT" } })
        : await tx.formFieldMap.updateMany({ where: { id: m.id, status: "DRAFT" }, data: { canonicalFieldKey: named[0], updatedBy: actor.id, ...((under?.canonicalFieldKey !== c.key ? await whatAskReplaced(tx, c.workspaceId, m.formEditionId, m.dataPath) : null) ?? { reason: `The new field "${c.label ?? c.key}" was withdrawn: worked out from other answers again.`.slice(0, 500) }) } });
      if (!back.count) throw problem(409, "Changed meanwhile", "A form field reading it changed at the same moment. Refresh to see it.");
      restored++;
    }
    const maps = await tx.formFieldMap.updateMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" }, data: { outcome: "unresolved", canonicalFieldKey: null, transform: null, person: null, reason: `The new field "${c.label ?? c.key}" was withdrawn: ${why}`.slice(0, 500), updatedBy: actor.id } });
    await tx.sectionQuestion.deleteMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT", version: 1 } });
    const lists = await tx.canonicalField.findMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" }, select: { answerListKey: true } });
    await tx.canonicalField.deleteMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" } });
    for (const x of lists) await dropFieldList(tx, c.workspaceId, x.answerListKey); // C3.6: its own draft list goes with it
    // Breaker m8: BR-10 changes form fields, so the history says so. QA-263: a configuration line reaches every firm's staff
    // (case-feed.ts), so it says what happened and never the typed reason; that stays on the change, as its note.
    await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: "decided", entity: "shared field", entityKey: c.key, summary: `${actor.name} withdrew the new field "${c.label ?? c.key}" (the reason is on the change). ${restored} form field${restored === 1 ? "" : "s"} back to worked out, ${maps.count} to no decision${readers.length ? `; still read by ${readers.map((r) => r.name).join("; ")}` : ""}`.slice(0, 600) } });
    return { ...changeView((await tx.libraryChange.findUnique({ where: { id } }))!), form_fields_reopened: maps.count, form_fields_restored: restored, readers: readers.map((r) => r.name), taken_out_of: takenOut };
  }, { timeout: 30_000, maxWait: 10_000 }); // the readers are read under the lock, on a busy machine too (the same room as an ask)
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
      // C3.6 (break B1): a new field's draft answer list is released with the field it rides with.
      if (c.kind === "field") for (const d of await tx.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: c.key, status: "DRAFT" }, select: { answerListKey: true } })) await releaseFieldList(tx, workspaceId, d.answerListKey);
      for (const d of rows.filter((r) => r.status === "DRAFT")) { if (d.supersedesId) await setStatus(tx, c.kind, d.supersedesId, "SUPERSEDED"); await setStatus(tx, c.kind, d.id, "PUBLISHED"); }
    } else {
      const from = c.action === "RETIRE" ? "PUBLISHED" : "RETIRED", to = c.action === "RETIRE" ? "RETIRED" : "PUBLISHED";
      const cur = rows.filter((r) => r.status === from).sort((x, y) => y.version - x.version)[0];
      if (cur) await setStatus(tx, c.kind, cur.id, to);
    }
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  // C4.9 (runtime lane, P-97): an approved change of who fills is released once its placement draft is published.
  out.push(...(await releaseFills(tx, workspaceId, pack)));
  out.push(...(await releaseCondition(tx, workspaceId, pack))); // C4.11 part 3 (forms lane)
  out.push(...(await releaseFormFieldCondition(tx, workspaceId, pack))); // B86
  out.push(...(await releaseSupplies(tx, workspaceId, pack))); // C4.5
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
  // S6 1b (owed from 1a): an answer list has no supersedes link; a new version replaces the older published one.
  if (kind === "answer_list") return (await tx.answerList.findMany({ where: { workspaceId, answerListKey: key }, select: { id: true, status: true, version: true } })).map((r) => ({ ...r, supersedesId: null }));
  return null;
}
async function setStatus(tx: Prisma.TransactionClient, kind: string, id: string, status: Status) {
  if (kind === "field") await tx.canonicalField.update({ where: { id }, data: { status } });
  else if (kind === "section") await tx.logicalSection.update({ where: { id }, data: { status } });
  else if (kind === "document_type") await tx.documentType.update({ where: { id }, data: { status } });
  else if (kind === "answer_list") await tx.answerList.update({ where: { id }, data: { status } });
}
