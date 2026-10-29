// S6 slice 1a (P-149 one door; screens/W1-shared-library/plan-slice1.md): every AI, rules or person proposal enters the
// review queue here and nowhere else. insertProposals parses contract v2 (contracts/proposal-item.ts) and checks identity
// at write; decide accepts, edits or rejects, running the kind's lander inside the same transaction and checking identity
// again; undo takes a whole decision batch back within 10 s. A library lander writes the draft row and a WAITING
// LibraryChange carrying the batch id and the item id, so a second person still approves every new library item (BR-7).
// The free-add scan (tests/check_s6_p149.ts) refuses a library .create anywhere else.
import { HttpStatus } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma, ProposalItem as Row } from "@prisma/client";
import { ProposalItem, ProposalPayload, type ProposalKind } from "../../contracts/proposal-item.ts";
import { normalizeLabel } from "../../contracts/programs.ts";
import { subjectKindOf, VALUE_TYPE_TO_DATA_TYPE } from "../../engine/snapshot.ts";
import { fail, need, type Actor, type Audit, type Db } from "./core.ts";
import { keyFor } from "./library-changes.ts";

type Tx = Prisma.TransactionClient;
type Client = Db | Tx;
/** What a producer writes: the contract item without the ids, status and decision the server owns. */
export type NewProposal = Omit<ProposalItem, "id" | "status" | "decision">;
/** The server's working columns beside the contract (the field-map review's comparison and choice). */
export type Work = { choice?: string | null; decidedKey?: string | null; work?: unknown };

/** The kinds that land on the shared library, and so are checked against it by identity. */
export const LIBRARY_PROPOSAL_KINDS = ["field", "answer_list", "section", "document_type", "person_role"] as const;
const isLibraryKind = (k: string) => (LIBRARY_PROPOSAL_KINDS as readonly string[]).includes(k);

/** The identity key of a library kind under its rule (P-149 (2), Lead 29 Oct): a field, section or person role by its
 *  name, an answer list by its set of value codes (order ignored), a document type by its name and what it proves.
 *  The combination kinds keep the producer's key. */
export function identityKeyOf(p: ProposalPayload, given: string): string {
  switch (p.kind) {
    case "field": case "section": case "person_role": return normalizeLabel(p.label);
    case "answer_list": return [...new Set(p.values.map((v) => v.code))].sort().join(",");
    case "document_type": return `${normalizeLabel(p.name)}|${normalizeLabel(p.proves)}`;
    default: return given;
  }
}

/** The library item an identity key already names (an exact duplicate), or null. */
export async function sameInLibrary(db: Client, workspaceId: string, p: ProposalPayload): Promise<string | null> {
  const want = identityKeyOf(p, "");
  if (p.kind === "field") {
    const rows = await db.canonicalField.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] }, mergedIntoKey: null }, select: { canonicalFieldKey: true, label: true, aliases: true } });
    return rows.find((r) => [r.label ?? "", ...r.aliases].some((x) => x && normalizeLabel(x) === want))?.canonicalFieldKey ?? null;
  }
  if (p.kind === "section") {
    const rows = await db.logicalSection.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { sectionKey: true, title: true } });
    const names = new Set([want, ...p.aliases.map(normalizeLabel)]);
    return rows.find((r) => names.has(normalizeLabel(r.title)))?.sectionKey ?? null;
  }
  if (p.kind === "answer_list") {
    const rows = await db.answerList.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, include: { values: { select: { valueKey: true } } } });
    return rows.find((r) => [...new Set(r.values.map((v) => v.valueKey))].sort().join(",") === want)?.answerListKey ?? null;
  }
  if (p.kind === "document_type") {
    const rows = await db.documentType.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { documentTypeKey: true, name: true } });
    return rows.find((r) => normalizeLabel(r.name) === normalizeLabel(p.name))?.documentTypeKey ?? null;
  }
  return null;
}

const plainIssues = (e: { issues: { path: PropertyKey[]; message: string }[] }) => e.issues.slice(0, 3).map((i) => `${i.path.join(".") || "item"}: ${i.message}`).join("; ");

/** The one door: parses each item against contract v2, checks its identity, and writes them together (all or none).
 *  Refused: a malformed item (400), two items of one batch with the same identity, or a new library item that already
 *  exists in the library (409: reuse it instead). A waiting item of another run is caught again at approval. */
export async function insertProposals(db: Client, workspaceId: string, items: (NewProposal & Work)[]): Promise<string[]> {
  if (!items.length) return [];
  const rows: Prisma.ProposalItemCreateManyInput[] = [];
  const seen = new Set<string>();
  for (const [n, it] of items.entries()) {
    const { choice, decidedKey, work, ...item } = it;
    const parsed = ProposalItem.safeParse({ ...item, id: randomUUID(), status: "waiting", decision: null });
    if (!parsed.success) fail(`Proposal ${n + 1} (${item.kind ?? "no kind"}) does not follow the queue's contract: ${plainIssues(parsed.error)}.`);
    const x = parsed.data!;
    const key = identityKeyOf(x.payload, x.identity.key);
    if (isLibraryKind(x.kind) && x.identity.key !== key) fail(`Proposal ${n + 1} (${x.kind}): its identity key is "${x.identity.key}", but under its kind's rule it is "${key}".`);
    const one = `${x.kind}|${key}|${x.scope.formEdition ?? ""}|${x.scope.combinationId ?? ""}`;
    if (seen.has(one)) fail(`Proposal ${n + 1} (${x.kind} "${key}") is in this batch twice: one item per identity.`, HttpStatus.CONFLICT);
    seen.add(one);
    if (x.landsOn === "library" && x.reuse.match === "new") {
      const twin = await sameInLibrary(db, workspaceId, x.payload);
      if (twin) fail(`Proposal ${n + 1} (${x.kind}) is already in the library as ${twin}: propose reusing it instead.`, HttpStatus.CONFLICT);
    }
    rows.push({ id: x.id, workspaceId, kind: x.kind, runId: x.runId, step: x.step, formEdition: x.scope.formEdition, combinationId: x.scope.combinationId, landsOn: x.landsOn,
      reuse: x.reuse, payload: x.payload as Prisma.InputJsonValue, source: (x.source ?? undefined) as Prisma.InputJsonValue | undefined, rounds: x.rounds as Prisma.InputJsonValue,
      rules: x.rules, agreement: x.agreement, confidence: x.confidence, reason: x.reason, origin: x.origin, identity: x.identity, identityKey: key,
      relatesTo: x.relatesTo, revision: (x.revision ?? undefined) as Prisma.InputJsonValue | undefined, basis: x.basis,
      choice: choice ?? null, decidedKey: decidedKey ?? null, work: (work ?? undefined) as Prisma.InputJsonValue | undefined });
  }
  // The run an AI or rules item names is one of this workspace's steps (a DraftingJob), so its items go with it.
  const runIds = [...new Set(rows.map((r) => r.runId).filter(Boolean) as string[])];
  const known = new Set((await db.draftingJob.findMany({ where: { id: { in: runIds }, workspaceId }, select: { id: true } })).map((j) => j.id));
  const unknown = runIds.find((id) => !known.has(id));
  if (unknown) fail(`A proposal names a run that is not one of this workspace's steps (${unknown}).`);
  await db.proposalItem.createMany({ data: rows });
  return rows.map((r) => r.id!);
}

/** The field-map review's choice on one item (sources.ts decide): the contract status follows the choice. */
const STATUS_OF: Record<string, string> = { PENDING: "waiting", ACCEPTED: "accepted", CHANGED: "edited", NEW: "edited", RETURNED: "rejected" };
export async function recordChoice(db: Client, id: string, c: { choice: string; decidedKey: string | null; by: string | null; reason: string | null; payload?: ProposalPayload; work?: unknown }) {
  return db.proposalItem.update({ where: { id }, data: { choice: c.choice === "PENDING" ? null : c.choice, status: STATUS_OF[c.choice] ?? fail("Unknown choice."), decidedKey: c.decidedKey, decidedBy: c.by,
    decidedAt: c.by ? new Date() : null, decisionReason: c.reason, ...(c.payload ? { payload: c.payload as Prisma.InputJsonValue, identityKey: identityKeyOf(c.payload, "") } : {}), ...(c.work !== undefined ? { work: c.work as Prisma.InputJsonValue } : {}) } });
}

/** The old review row shape the field-map page reads (web/src/pages/job.tsx), from a ProposalItem: 1b replaces the page. */
export function reviewRow(r: Row) {
  const w = (r.work ?? {}) as Record<string, any>, p = r.payload as Record<string, any>, src = r.source as { quote?: string } | null;
  const legacyKind: Record<string, string> = { requirement_line: "document_requirement", cross_check: "check" };
  return { id: r.id, workspaceId: r.workspaceId, jobId: r.runId, kind: w.legacyKind ?? legacyKind[r.kind] ?? r.kind, proposedKey: w.proposedKey ?? r.identityKey,
    proposedMeaning: p.meaning ?? "", proposedType: p.valueType ?? "", outcome: w.outcome ?? "NEW", matchedKey: w.matchedKey ?? null, candidates: w.candidates ?? [], persons: w.persons ?? [],
    boxes: w.boxes ?? [], evidence: w.evidence ?? {}, affected: w.affected ?? {}, reason: w.reason ?? r.reason ?? "", decision: r.choice ?? (r.status === "waiting" ? "PENDING" : r.status.toUpperCase()),
    decidedKey: r.decidedKey, decidedBy: r.decidedBy, decisionNote: r.decisionReason, decidedAt: r.decidedAt,
    payload: r.choice === "NEW" ? { label: p.label, reason: r.decisionReason, advisory: w.advisory ?? null } : w.legacyPayload ?? (r.kind === "field" ? null : p), sourceQuote: src?.quote ?? w.sourceQuote ?? null,
    status: r.status, confidence: r.confidence };
}

// ------------------------------------------------------------------ landers

type Landing = { ws: string; actor: Actor; batchId: string | null; itemId: string | null; reason: string | null; matches?: unknown; aiVerdict?: string | null; meaningChecked?: boolean; proposedBy?: string; sourceJobId?: string | null; combinationId?: string | null };
const waitingAdd = (tx: Tx, l: Landing, kind: string, key: string, label: string | null) => tx.libraryChange.create({ data: { workspaceId: l.ws, kind, key, label, action: "ADD", reason: l.reason,
  aiVerdict: l.aiVerdict ?? null, matches: (l.matches ?? []) as Prisma.InputJsonValue, meaningChecked: l.meaningChecked ?? false, status: "WAITING", proposedBy: l.proposedBy ?? l.actor.id, appliedBy: l.actor.id,
  sourceJobId: l.sourceJobId ?? null, combinationId: l.combinationId ?? null, proposalItemId: l.itemId, batchId: l.batchId } });

/** A new shared field as a draft row plus its ADD waiting for a second person. Also the field-map apply's writer. */
export async function landField(tx: Tx, l: Landing, f: { key: string; meaning: string; valueType: string; label?: string | null; sourceRef: string }) {
  const made = await tx.canonicalField.create({ data: { workspaceId: l.ws, canonicalFieldKey: f.key, version: 1, status: "DRAFT", meaning: f.meaning, valueType: f.valueType, dataType: (VALUE_TYPE_TO_DATA_TYPE as Record<string, string>)[f.valueType] ?? "STRING",
    scope: f.key.startsWith("case.") ? "CASE_LEVEL" : "CLIENT_LEVEL", subjectKind: subjectKindOf(f.key), origin: "AI_PROPOSAL", sourceRef: f.sourceRef, updatedBy: l.actor.id,
    ...(f.label ? { label: f.label, groupKey: f.key.split(".")[0], labelChecked: true } : {}) } as Prisma.CanonicalFieldUncheckedCreateInput });
  await waitingAdd(tx, l, "field", f.key, f.label ?? made.label ?? null);
  return made;
}

const taken = async (tx: Tx, ws: string) => new Set((await tx.canonicalField.findMany({ where: { workspaceId: ws }, select: { canonicalFieldKey: true } })).map((x) => x.canonicalFieldKey));
const slugKey = (label: string, used: Set<string>) => keyFor("x", label, used).slice(2);
const sourceRef = (r: Row, actor: Actor) => `${r.origin === "rules" ? "rules" : "AI"} run ${r.runId}; accepted by ${actor.id} on the review queue (item ${r.id})`;

/** LANDERS[kind]: what accepting an item writes, inside decide's transaction. A kind with no lander yet is refused. */
export const LANDERS: Partial<Record<ProposalKind, (tx: Tx, r: Row, p: ProposalPayload, l: Landing) => Promise<string>>> = {
  async field(tx, r, p, l) {
    if (p.kind !== "field") fail("Wrong payload.");
    const f = p as Extract<ProposalPayload, { kind: "field" }>;
    const key = keyFor(f.subject ?? "case", f.label, await taken(tx, l.ws));
    await landField(tx, l, { key, meaning: f.meaning, valueType: f.valueType, label: f.label, sourceRef: sourceRef(r, l.actor) });
    return key;
  },
  async section(tx, r, p, l) {
    const s = p as Extract<ProposalPayload, { kind: "section" }>;
    const used = new Set((await tx.logicalSection.findMany({ where: { workspaceId: l.ws }, select: { sectionKey: true } })).map((x) => `x.${x.sectionKey}`));
    const key = slugKey(s.label, used);
    const order = 100 + (await tx.logicalSection.count({ where: { workspaceId: l.ws } }));
    await tx.logicalSection.create({ data: { workspaceId: l.ws, sectionKey: key, version: 1, status: "DRAFT", title: s.label, displayOrder: order, origin: "AI_PROPOSAL", updatedBy: l.actor.id } });
    await waitingAdd(tx, l, "section", key, s.label);
    return key;
  },
  async answer_list(tx, r, p, l) {
    const a = p as Extract<ProposalPayload, { kind: "answer_list" }>;
    const used = new Set((await tx.answerList.findMany({ where: { workspaceId: l.ws }, select: { answerListKey: true } })).map((x) => `x.${x.answerListKey}`));
    const key = slugKey(a.label, used);
    await tx.answerList.create({ data: { workspaceId: l.ws, answerListKey: key, version: 1, status: "DRAFT", label: a.label, origin: "AI_PROPOSAL", updatedBy: l.actor.id,
      values: { create: a.values.map((v, i) => ({ valueKey: v.code, label: v.label, sortOrder: i + 1 })) } } });
    await waitingAdd(tx, l, "answer_list", key, a.label);
    return key;
  },
  async document_type(tx, r, p, l) {
    const d = p as Extract<ProposalPayload, { kind: "document_type" }>;
    const used = new Set((await tx.documentType.findMany({ where: { workspaceId: l.ws }, select: { documentTypeKey: true } })).map((x) => `x.${x.documentTypeKey}`));
    const key = slugKey(d.name, used);
    await tx.documentType.create({ data: { workspaceId: l.ws, documentTypeKey: key, name: d.name, category: d.category || "client", suppliesFacts: d.suppliesFacts,
      readerProfile: { readerKind: d.readerKind, identityDocument: d.identityDocument, proves: d.proves }, version: 1, status: "DRAFT", origin: "AI_PROPOSAL", updatedBy: l.actor.id } });
    await waitingAdd(tx, l, "document_type", key, d.name);
    return key;
  },
};

/** The draft rows a library lander made, by kind (undo removes them while they are still untouched drafts). */
const LANDED: Record<string, (tx: Tx, ws: string, key: string) => Promise<unknown>> = {
  field: (tx, ws, key) => tx.canonicalField.deleteMany({ where: { workspaceId: ws, canonicalFieldKey: key, version: 1, status: "DRAFT" } }),
  section: (tx, ws, key) => tx.logicalSection.deleteMany({ where: { workspaceId: ws, sectionKey: key, version: 1, status: "DRAFT" } }),
  answer_list: (tx, ws, key) => tx.answerList.deleteMany({ where: { workspaceId: ws, answerListKey: key, version: 1, status: "DRAFT" } }),
  document_type: (tx, ws, key) => tx.documentType.deleteMany({ where: { workspaceId: ws, documentTypeKey: key, version: 1, status: "DRAFT" } }),
};

export const UNDO_SECONDS = 10;
export const BATCH_MAX = 200;
/** The field-map step's items map form fields as well, so they are decided on their form-field page (job.tsx) until
 *  that page folds into the queue with the edition drafts (1b, build-notes). */
export const ON_ITS_PAGE = new Set(["field_map"]);
/** Why an item cannot be accepted with others (P-121, P-158): only Ready items, never a rules item landing on the
 *  library. null when it can. */
export function bulkWhy(r: Pick<Row, "confidence" | "origin" | "landsOn" | "step">): string | null {
  if (ON_ITS_PAGE.has(r.step)) return "It is decided on its form-field page.";
  if (r.confidence !== "ready") return r.confidence === "check" ? "It needs a check first: open it and decide it on its own." : "Its two readings differ: open it and choose.";
  if (r.origin === "rules" && r.landsOn === "library") return "A rules item that adds to the shared library is accepted on its own.";
  return null;
}
export type Decision = { action: "accept" | "edit" | "reject"; reason?: string | null; payload?: unknown };

/** Accept, edit or reject waiting items together (one batch, one Undo). Every item is checked before anything is
 *  written; an accepted or edited library item runs its lander and is checked against the library again (identity at
 *  approval). Returns the batch id and what each item landed as. */
export async function decide(db: Db, audit: Audit, actor: Actor, workspaceId: string, ids: string[], d: Decision) {
  need(actor, "review");
  if (!["accept", "edit", "reject"].includes(d.action)) fail("Choose accept, edit or reject.");
  if (!ids.length || ids.length > BATCH_MAX) fail(`Choose between 1 and ${BATCH_MAX} proposals.`);
  if (d.action === "edit" && ids.length !== 1) fail("Edit one proposal at a time.");
  const reason = d.reason?.trim() || null;
  if (d.action === "reject" && (!reason || reason.length < 3)) fail("Say why it is rejected (3 characters or more): the producer learns from it.");
  if (reason && reason.length > 300) fail("Keep the reason under 300 characters.");
  const batchId = randomUUID();
  const landed = await db.$transaction(async (tx) => {
    const rows = await tx.proposalItem.findMany({ where: { id: { in: ids }, workspaceId } });
    if (rows.length !== new Set(ids).size) fail("A proposal was not found (the demo may have been reset).", HttpStatus.NOT_FOUND);
    const done = rows.filter((r) => r.status !== "waiting");
    if (done.length) fail(`${done.length === 1 ? "A proposal is" : `${done.length} proposals are`} already decided (${done[0].status}); an approved item changes only as a revision.`, HttpStatus.CONFLICT);
    const elsewhere = rows.find((r) => ON_ITS_PAGE.has(r.step));
    if (elsewhere) fail(`"${identityKeyOf(elsewhere.payload as ProposalPayload, elsewhere.identityKey)}" is decided on its form-field page, where its form fields are mapped too.`, HttpStatus.CONFLICT);
    // P-121: several at once is for Ready items only, and never a rules item that adds to the library (1b).
    if (d.action === "accept" && rows.length > 1) {
      const no = rows.map((r) => [r, bulkWhy(r)] as const).filter(([, why]) => why);
      if (no.length) fail(`Only Ready items are accepted together. ${no.length === 1 ? "One item" : `${no.length} items`} cannot be: "${identityKeyOf(no[0][0].payload as ProposalPayload, no[0][0].identityKey)}" (${no[0][1]}). Nothing was accepted.`, HttpStatus.CONFLICT);
    }
    const out: { id: string; landedAs: string | null }[] = [];
    for (const r of rows) {
      let payload = r.payload as ProposalPayload;
      if (d.action === "edit") {
        const p = ProposalPayload.safeParse(d.payload);
        if (!p.success) fail(`The edited proposal does not follow the contract: ${plainIssues(p.error)}.`);
        if (p.data!.kind !== r.kind) fail("An edit keeps the proposal's kind.");
        payload = p.data!;
      }
      let landedAs: string | null = null;
      if (d.action !== "reject") {
        if (r.landsOn === "library" && (r.reuse as { match: string }).match === "new") {
          const twin = await sameInLibrary(tx, workspaceId, payload);
          if (twin) fail(`"${identityKeyOf(payload, r.identityKey)}" is already in the library as ${twin} (added since it was proposed): reject this one, or reuse that item.`, HttpStatus.CONFLICT);
        }
        const reuse = r.reuse as { match: string; existingKey: string | null };
        // P-120: a reuse adds nothing to the library; it records the existing item it uses.
        if (r.landsOn === "library" && reuse.match === "reuse" && d.action === "accept") landedAs = reuse.existingKey;
        else {
          const land = LANDERS[r.kind as ProposalKind];
          if (!land) fail(`A ${r.kind.replace(/_/g, " ")} proposal is accepted with its own step, not yet on this queue.`, HttpStatus.CONFLICT);
          landedAs = await land!(tx, r, payload, { ws: workspaceId, actor, batchId, itemId: r.id, reason: reason ?? r.reason, proposedBy: actor.id, combinationId: r.combinationId, sourceJobId: r.runId });
        }
      }
      await tx.proposalItem.update({ where: { id: r.id }, data: { status: d.action === "accept" ? "accepted" : d.action === "edit" ? "edited" : "rejected", decidedBy: actor.id, decidedAt: new Date(),
        decisionReason: reason, batchId, decidedKey: landedAs,
        // An edit keeps the item's own reading beside it, so Undo puts the item back as it was proposed (1b).
        ...(d.action === "edit" ? { payload: payload as Prisma.InputJsonValue, identityKey: identityKeyOf(payload, r.identityKey), work: { ...((r.work ?? {}) as object), beforeEdit: r.payload } as Prisma.InputJsonValue } : {}) } });
      out.push({ id: r.id, landedAs });
    }
    return out;
  });
  await audit.log(workspaceId, actor.id, "decided", "proposals", batchId, `${actor.name} ${d.action === "accept" ? "accepted" : d.action === "edit" ? "edited and accepted" : "rejected"} ${landed.length} proposal${landed.length === 1 ? "" : "s"}${reason ? `: ${reason}` : ""}`);
  return { batchId, items: landed };
}

/** Undo a decision batch within 10 s: its landed draft rows and waiting ADDs are removed and its items wait again on
 *  the queue as they were proposed (1b: "undone" left them nowhere; the activity log keeps the undo). Only the person
 *  who decided, only while every ADD is still waiting. */
export async function undo(db: Db, audit: Audit, actor: Actor, workspaceId: string, batchId: string) {
  need(actor, "review");
  const res = await db.$transaction(async (tx) => {
    const rows = await tx.proposalItem.findMany({ where: { workspaceId, batchId } });
    if (!rows.length) fail("No decision with this id.", HttpStatus.NOT_FOUND);
    if (rows.some((r) => r.decidedBy !== actor.id)) fail("Only the person who decided can undo it.", HttpStatus.FORBIDDEN);
    if (rows.some((r) => r.status === "undone")) fail("Already undone.", HttpStatus.CONFLICT);
    const at = Math.max(...rows.map((r) => r.decidedAt?.getTime() ?? 0));
    if (Date.now() - at > UNDO_SECONDS * 1000) fail(`Undo is offered for ${UNDO_SECONDS} seconds; after that, retire or delete the item in the library.`, HttpStatus.CONFLICT);
    const adds = await tx.libraryChange.findMany({ where: { workspaceId, batchId } });
    if (adds.some((c) => c.status !== "WAITING")) fail("A second person has already decided one of these items: it cannot be undone here.", HttpStatus.CONFLICT);
    for (const c of adds) await LANDED[c.kind]?.(tx, workspaceId, c.key);
    await tx.libraryChange.deleteMany({ where: { workspaceId, batchId } });
    for (const r of rows) {
      const { beforeEdit, ...work } = (r.work ?? {}) as { beforeEdit?: ProposalPayload };
      await tx.proposalItem.update({ where: { id: r.id }, data: { status: "waiting", decidedBy: null, decidedAt: null, decisionReason: null, batchId: null, decidedKey: null,
        ...(beforeEdit ? { payload: beforeEdit as Prisma.InputJsonValue, identityKey: identityKeyOf(beforeEdit, r.identityKey), work: work as Prisma.InputJsonValue } : {}) } });
    }
    return rows.length;
  });
  await audit.log(workspaceId, actor.id, "undone", "proposals", batchId, `${actor.name} undid a decision on ${res} proposal${res === 1 ? "" : "s"}`);
  return { undone: res };
}
