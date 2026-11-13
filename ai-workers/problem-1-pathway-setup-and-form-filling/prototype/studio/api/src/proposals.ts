// S6 slice 1a (P-149 one door; screens/W1-shared-library/plan-slice1.md): every AI, rules or person proposal enters the
// review queue here and nowhere else. insertProposals parses contract v2 (contracts/proposal-item.ts) and checks identity
// at write; decide accepts, edits or rejects, running the kind's lander inside the same transaction and checking identity
// again; undo takes a whole decision batch back within 10 s. A library lander writes the draft row and a WAITING
// LibraryChange carrying the batch id and the item id, so a second person still approves every new library item (BR-7).
// The free-add scan (tests/check_s6_p149.ts) refuses a library .create anywhere else.
import { HttpStatus } from "@nestjs/common";
import { proposeConditionChange } from "./question-condition.ts";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma, type ProposalItem as Row } from "@prisma/client";
import { ProposalItem, ProposalPayload, type ProposalKind } from "../../contracts/proposal-item.ts";
import { normalizeLabel } from "../../contracts/programs.ts";
import { DRAFT_FIELDS_STEP, FIELD_ID, FIELD_ID_MAX } from "./field-draft-items.ts";
import { effective, subjectKindOf, VALUE_TYPE_TO_DATA_TYPE } from "../../engine/snapshot.ts";
import { fail, need, SOLUTION, type Actor, type Audit, type Db } from "./core.ts";
import { freeKey, keyFor, refuseTakingOverReaders, withdrawnStillRead } from "./library-changes.ts";
import { checkedFieldValues, dropFieldList, type AnswerValue } from "./answer-values.ts";
import { acceptPqrPick } from "./fact-sources.ts";
import { usedInLabels } from "./where-used.ts";
import { lockItem, refuseRetired } from "./library-items.ts";
import { checkCondition } from "../../engine/validate.ts";
import { isRuleWhy, nearMatches } from "../../engine/near.ts";
import { p121Rating, P121_WHY, type Rateable } from "../../engine/agreement.ts";
import { STEPS_RULE } from "../../engine/field-map-rounds.ts";
import { aiReadsIdentity, identityOf } from "../../engine/identity-documents.ts";
import { canonical } from "../../../contracts/rules.ts";
import { fieldsOf } from "../../engine/masters-ai.ts";
import { printedChoices, type InvField } from "../../engine/printed-choices.ts";

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
/** An answer list's identity: its codes, sorted. A long list (a country list has 200 codes) is named by its count and a
 *  hash of the codes, so the key stays within the contract's 300 characters (C3.4); the library side uses the same rule. */
export function listIdentity(codes: string[]): string {
  const all = [...new Set(codes)].sort().join(",");
  return all.length <= 300 ? all : `codes:${new Set(codes).size}:${createHash("sha256").update(all).digest("hex").slice(0, 40)}`;
}

/** C2.6: a document line in words, "Passport information page copy · each applicant" (its payload has no label). */
export function lineTitle(p: { documentType?: unknown; roles?: unknown }): string {
  const t = String(p.documentType ?? "A document").replace(/_/g, " ").trim(), roles = Array.isArray(p.roles) ? p.roles.map((x) => String(x).replace(/_/g, " ")).join(", ") : "";
  return `${t ? t[0].toUpperCase() + t.slice(1) : "A document"}${roles ? ` · ${roles}` : ""}`.replace(/\bUs\b/, "US").slice(0, 160);
}
/** The words a person reads for an item: its name, never an answer list's code list or hash (C3.4 review Minor 5). */
export function nameOf(p: ProposalPayload, given: string): string {
  if (p.kind === "requirement_line") return lineTitle(p);
  if (p.kind === "form_check" || p.kind === "cross_check") return p.sentence; // QA-196 review m1: never its identity key
  const named = (p as { label?: unknown; name?: unknown }).label ?? (p as { name?: unknown }).name;
  return typeof named === "string" && named.trim() ? named : identityKeyOf(p, given);
}

export function identityKeyOf(p: ProposalPayload, given: string): string {
  switch (p.kind) {
    case "field": case "section": case "person_role": return normalizeLabel(p.label);
    case "answer_list": return listIdentity(p.values.map((v) => v.code));
    case "document_type": return `${normalizeLabel(p.name)}|${normalizeLabel(p.proves)}`;
    default: return given;
  }
}

/** C3.6 (break R2-M1): a draft list that a draft field names and that has no ADD of its own rides with that field; it is not a library item
 *  another proposal may reuse: it can still be undone or withdrawn with its field. */
export async function ridingLists(db: Client, workspaceId: string): Promise<Set<string>> {
  const named = await db.canonicalField.findMany({ where: { workspaceId, status: "DRAFT", answerListKey: { not: null } }, select: { answerListKey: true } });
  if (!named.length) return new Set();
  const drafts = await db.answerList.findMany({ where: { workspaceId, status: "DRAFT", answerListKey: { in: named.map((f) => f.answerListKey!) } }, select: { answerListKey: true } });
  if (!drafts.length) return new Set();
  const own = new Set((await db.libraryChange.findMany({ where: { workspaceId, kind: "answer_list", key: { in: drafts.map((d) => d.answerListKey) } }, select: { key: true } })).map((c) => c.key));
  return new Set(drafts.map((d) => d.answerListKey).filter((k) => !own.has(k)));
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
    const riding = await ridingLists(db, workspaceId);
    return rows.find((r) => !riding.has(r.answerListKey) && listIdentity(r.values.map((v) => v.valueKey)) === want)?.answerListKey ?? null;
  }
  if (p.kind === "document_type") {
    // The same identity as identityKeyOf: a name and what it proves (two proofs under one name are two items).
    const rows = await db.documentType.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { documentTypeKey: true, name: true, readerProfile: true } });
    return rows.find((r) => `${normalizeLabel(r.name)}|${normalizeLabel(String((r.readerProfile as { proves?: unknown } | null)?.proves ?? ""))}` === want)?.documentTypeKey ?? null;
  }
  return null;
}

/** Whether a library item a reuse names is still there to use: present, not retired, not merged away. */
async function usableInLibrary(db: Client, workspaceId: string, kind: string, key: string | null): Promise<boolean> {
  if (!key) return false;
  const live = { in: ["DRAFT", "PUBLISHED"] as ("DRAFT" | "PUBLISHED")[] };
  switch (kind) {
    case "field": return !!(await db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: key, status: live, mergedIntoKey: null }, select: { id: true } }));
    case "section": return !!(await db.logicalSection.findFirst({ where: { workspaceId, sectionKey: key, status: live }, select: { id: true } }));
    case "answer_list": return !(await ridingLists(db, workspaceId)).has(key) && !!(await db.answerList.findFirst({ where: { workspaceId, answerListKey: key, status: live }, select: { id: true } }));
    case "document_type": return !!(await db.documentType.findFirst({ where: { workspaceId, documentTypeKey: key, status: live }, select: { id: true } }));
    case "person_role": return !!(await db.personRole.findFirst({ where: { workspaceId, roleKey: key, retiredAt: null }, select: { id: true } }));
    default: return false;
  }
}

const plainIssues = (e: { issues: { path: PropertyKey[]; message: string }[] }) => e.issues.slice(0, 3).map((i) => `${i.path.join(".") || "item"}: ${i.message}`).join("; ");

/** The new fields other proposals are waiting to add to the library (QA-159: a near duplicate of one is caught too). */
export async function pendingNewFields(db: Client, workspaceId: string, except?: string[]): Promise<{ id: string; key: string | null; name: string; meaning: string | null }[]> {
  const rows = await db.proposalItem.findMany({ where: { workspaceId, kind: "field", landsOn: "library", status: "waiting", reuse: { path: ["match"], equals: "new" }, ...(except?.length ? { id: { notIn: except } } : {}) }, select: { id: true, payload: true, work: true } });
  return rows.map((r) => ({ id: r.id, key: ((r.work as { proposedKey?: string } | null)?.proposedKey) ?? null, name: String((r.payload as { label?: unknown }).label ?? ""), meaning: ((r.payload as { meaning?: string }).meaning) ?? null })).filter((x) => x.name);
}

/** The one door: parses each item against contract v2, checks its identity, and writes them together (all or none).
 *  Refused: a malformed item (400), two items of one batch with the same identity, or a new library item that already
 *  exists in the library (409: reuse it instead). A waiting item of another run is caught again at approval. */
/** C11.13 (P-120 "with where used"): the combinations a library item is used in, in words, for a duplicate refusal.
 *  The same answer as Library › Where used (LibrarySources.usedIn reads only the database). */
export async function whereUsedWords(db: Client, workspaceId: string, kind: string, key: string): Promise<string> {
  const k = (["field", "section", "document_type", "answer_list"] as const).find((x) => x === kind);
  if (!k) return "";
  // SH2b (qa minor 1 on #504): read from the one where-used service, not through a LibrarySources built without its services.
  const used = (await usedInLabels(db, workspaceId, k)).get(key) ?? [];
  return used.length ? `, used in ${used.slice(0, 5).join(", ")}${used.length > 5 ? ` and ${used.length - 5} more` : ""}` : ", used in no combination yet";
}

export async function insertProposals(db: Client, workspaceId: string, items: (NewProposal & Work)[]): Promise<string[]> {
  if (!items.length) return [];
  const rows: Prisma.ProposalItemCreateManyInput[] = [];
  const seen = new Set<string>();
  // C11.13 (P-120: drafted once, reused): a library item drafted "new" for one form edition is the one "new" item; the
  // same identity drafted for another edition waits as a reuse of it, resolved when the first is accepted. One lock per
  // workspace inside a transaction, so two editions read at once still make one "new" item.
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`proposal-door:${workspaceId}`}))`;
  const firstNew = new Map<string, { id: string; edition: string | null }>();
  const batchNew: { key: string | null; name: string; meaning: string | null }[] = [];
  let nearPool: { key: string | null; name: string; meaning: string | null }[] | undefined;
  for (const [n, it] of items.entries()) {
    const { choice, decidedKey, work: given, ...item } = it; let work = given;
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
      if (twin) fail(`Proposal ${n + 1} (${x.kind}) is already in the library as ${twin}${await whereUsedWords(db, workspaceId, x.kind, twin)}: propose reusing it instead.`, HttpStatus.CONFLICT);
      const ident = `${x.kind}|${key}`;
      const first = firstNew.get(ident) ?? await db.proposalItem.findFirst({ where: { workspaceId, kind: x.kind, identityKey: key, landsOn: "library", status: "waiting", reuse: { path: ["match"], equals: "new" }, NOT: { formEdition: x.scope.formEdition } }, select: { id: true, formEdition: true }, orderBy: { createdAt: "asc" } })
        .then((r) => (r ? { id: r.id, edition: r.formEdition } : null));
      if (first && first.edition !== x.scope.formEdition) {
        x.reuse = { match: "reuse", existingKey: null }; x.relatesTo = first.id; work = { ...((work ?? {}) as object), twinOf: first.id };
        if (x.confidence === "ready") x.confidence = "check";
        x.reason = `The same item is drafted for ${(first.edition ?? "another form").trim()}. Whichever is accepted first adds it to the library; this one then reuses it.${x.reason ? ` ${x.reason}` : ""}`.slice(0, 500);
      } else if (!firstNew.has(ident)) firstNew.set(ident, { id: x.id, edition: x.scope.formEdition });
    }
    // QA-159 (G-CORE B1 R3): a new field near a library field, or near another new field waiting (in this batch or an
    // earlier run), is found here on the server with the one rule (engine/near.ts), not only when the producer says so.
    // QA-192 review M1: a twin (reuse of its first copy, no item yet) may add the item itself, so it is checked too.
    if (x.kind === "field" && x.landsOn === "library" && (x.reuse.match === "new" || (x.reuse.match === "reuse" && !x.reuse.existingKey))) {
      const p = x.payload as { label: string; meaning?: string };
      const me = { key: ((work as { proposedKey?: string } | null)?.proposedKey) ?? null, name: p.label, meaning: p.meaning ?? null };
      nearPool ??= [
        ...(await db.canonicalField.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] }, mergedIntoKey: null }, select: { canonicalFieldKey: true, label: true, meaning: true } }))
          .map((f) => ({ key: f.canonicalFieldKey, name: f.label || f.canonicalFieldKey, meaning: f.meaning })),
        ...(await pendingNewFields(db, workspaceId)),
      ]; // review r4-m1: read once per batch, not once per item
      const near = nearMatches(me, [...nearPool, ...batchNew]);
      if (near.length) x.identity = { ...x.identity, near: [...new Set([...x.identity.near, ...near.map((n) => n.name)])].slice(0, 10), nearReason: x.identity.nearReason ?? near[0].why };
      batchNew.push(me);
    }
    // QA-176 (P-121): Ready only with both AI rounds read and agreeing and every rule passed, whoever produced the item
    // (the replayed field-map runs have one round): the one rating, at the one door (engine/agreement.ts p121Rating).
    ({ confidence: x.confidence, reason: x.reason } = p121Rating(x));
    // C11.13 (BAND_TIPS): an item close to a library item is never Ready: a person reads the near match and its reason.
    if (x.identity.near.length && x.confidence === "ready") { x.confidence = "check"; x.reason = `Close to ${x.identity.near.slice(0, 3).join(", ")}: ${x.identity.nearReason}${x.reason ? ` ${x.reason}` : ""}`.slice(0, 500); }
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
/** A decision on the form-field page (or kept by a re-compare). QA-193 (Devin on #740): it is its own decision, so a
 *  To review batch it supersedes no longer names it; a re-compare passes the batch of the decision it keeps. */
export async function recordChoice(db: Client, id: string, c: { choice: string; decidedKey: string | null; by: string | null; reason: string | null; payload?: ProposalPayload; work?: unknown; batchId?: string | null }) {
  return db.proposalItem.update({ where: { id }, data: { choice: c.choice === "PENDING" ? null : c.choice, status: STATUS_OF[c.choice] ?? fail("Unknown choice."), decidedKey: c.decidedKey, decidedBy: c.by, batchId: c.batchId ?? null,
    decidedAt: c.by ? new Date() : null, decisionReason: c.reason, ...(c.payload ? { payload: c.payload as Prisma.InputJsonValue, identityKey: identityKeyOf(c.payload, "") } : {}), ...(c.work !== undefined ? { work: c.work as Prisma.InputJsonValue } : {}) } });
}

/** G-CORE B5 (P-288 (2)): accepting a field-map item on To review is the form-field page's Accept (sources.ts
 *  decideChecked): its recommended key is recorded, and the library changes only when the form's draft is applied.
 *  Checked again here: the draft is not applied yet, and a new field the library might already have needs the reason
 *  only its page asks for. */
async function acceptOnItsPage(tx: Tx, r: Row): Promise<string> {
  const job = r.runId ? await tx.draftingJob.findUnique({ where: { id: r.runId }, select: { status: true, workspaceId: true } }) : null;
  if (!job || job.status === "APPLIED") fail(`"${nameOf(r.payload as ProposalPayload, r.identityKey)}" belongs to a draft already applied to the configuration: change the definitions in the library instead.`, HttpStatus.CONFLICT);
  const w = (r.work ?? {}) as { evidence?: { recommendation?: { key?: string | null } }; matchedKey?: string | null; proposedKey?: string; candidates?: { key: string; score: number }[] };
  const key = w.evidence?.recommendation?.key ?? w.matchedKey ?? w.proposedKey ?? r.identityKey;
  const inLibrary = await tx.canonicalField.count({ where: { workspaceId: job!.workspaceId, canonicalFieldKey: key } });
  const best = (w.candidates ?? []).filter((c) => c.score >= 0.55).sort((x, y) => y.score - x.score)[0];
  if (!inLibrary && best) fail(`"${nameOf(r.payload as ProposalPayload, r.identityKey)}" makes a new shared field while the library has one that could fit (${best.key}): decide it on its form-field page, with a reason.`, HttpStatus.CONFLICT);
  return key;
}

/** BK-22 (#1695 C1): the words of an item's failed "steps the filler runs" rule (the draft round's), or null. */
export function stepsNotRunWhy(rules: unknown): string | null {
  return (Array.isArray(rules) ? (rules as { rule?: string; passed?: boolean; why?: string | null }[]) : []).find((x) => x?.rule === STEPS_RULE && x.passed === false)?.why ?? null;
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
    status: r.status, confidence: r.confidence,
    // BK-22 (#1695 C1): Field map review flags a step the filler cannot run (its rule's words), shown on the item.
    stepsNotRun: stepsNotRunWhy(r.rules),
    // C3.2 (P-121): why this waiting item cannot be accepted with the other exact reuse matches (null when it is High).
    bulkWhy: r.status === "waiting" ? bulkWhy(r) : null };
}

// ------------------------------------------------------------------ landers

type Landing = { ws: string; actor: Actor; batchId: string | null; itemId: string | null; reason: string | null; matches?: unknown; aiVerdict?: string | null; meaningChecked?: boolean; proposedBy?: string; sourceJobId?: string | null; combinationId?: string | null };
const waitingAdd = (tx: Tx, l: Landing, kind: string, key: string, label: string | null) => tx.libraryChange.create({ data: { workspaceId: l.ws, kind, key, label, action: "ADD", reason: l.reason,
  aiVerdict: l.aiVerdict ?? null, matches: (l.matches ?? []) as Prisma.InputJsonValue, meaningChecked: l.meaningChecked ?? false, status: "WAITING", proposedBy: l.proposedBy ?? l.actor.id, appliedBy: l.actor.id,
  sourceJobId: l.sourceJobId ?? null, combinationId: l.combinationId ?? null, proposalItemId: l.itemId, batchId: l.batchId } });

/** A new shared field as a draft row plus its ADD waiting for a second person. Also the field-map apply's writer. */
const sameList = (a: { valueKey: string; label: string; sortOrder: number }[], b: readonly AnswerValue[]) =>
  a.length === b.length && [...a].sort((x, y) => x.sortOrder - y.sortOrder).every((v, i) => v.valueKey === b[i].code && v.label === b[i].label);

/** The list a field's values land as: the released list with the same values (codes, words and order; break m3) is
 *  reused; else a new draft list that rides with the field (no ADD of its own: break B1). */
async function landAnswerList(tx: Tx, ws: string, actorId: string, label: string, values: readonly AnswerValue[], keyOf: (label: string, used: Set<string>) => string): Promise<string> {
  const released = await tx.answerList.findMany({ where: { workspaceId: ws, status: "PUBLISHED" }, include: { values: { select: { valueKey: true, label: true, sortOrder: true } } } });
  const same = released.find((x) => sameList(x.values, values));
  if (same) return same.answerListKey;
  const used = new Set((await tx.answerList.findMany({ where: { workspaceId: ws }, select: { answerListKey: true } })).map((x) => `x.${x.answerListKey}`));
  const key = keyOf(`${label} answers`, used);
  await tx.answerList.create({ data: { workspaceId: ws, answerListKey: key, version: 1, status: "DRAFT", label: `${label}: answers`, origin: "AI_PROPOSAL", updatedBy: actorId,
    values: { create: values.map((v, i) => ({ valueKey: v.code, label: v.label, sortOrder: i + 1 })) } } });
  return key;
}

export async function landField(tx: Tx, l: Landing, f: { key: string; meaning: string; valueType: string; label?: string | null; answerListKey?: string | null; sourceRef: string; origin?: "HUMAN" }) {
  const made = await tx.canonicalField.create({ data: { workspaceId: l.ws, canonicalFieldKey: f.key, version: 1, status: "DRAFT", meaning: f.meaning, valueType: f.valueType, dataType: (VALUE_TYPE_TO_DATA_TYPE as Record<string, string>)[f.valueType] ?? "STRING",
    scope: f.key.startsWith("case.") ? "CASE_LEVEL" : "CLIENT_LEVEL", subjectKind: subjectKindOf(f.key), origin: f.origin ?? "AI_PROPOSAL", sourceRef: f.sourceRef, updatedBy: l.actor.id,
    ...(f.answerListKey ? { answerListKey: f.answerListKey } : {}),
    ...(f.label ? { label: f.label, groupKey: f.key.split(".")[0], labelChecked: true } : {}) } as Prisma.CanonicalFieldUncheckedCreateInput });
  await waitingAdd(tx, l, "field", f.key, f.label ?? made.label ?? null);
  return made;
}

const taken = async (tx: Tx, ws: string) => new Set((await tx.canonicalField.findMany({ where: { workspaceId: ws }, select: { canonicalFieldKey: true } })).map((x) => x.canonicalFieldKey));
const slugKey = (label: string, used: Set<string>) => keyFor("x", label, used).slice(2);
const sourceRef = (r: Row, actor: Actor) => `${r.origin === "rules" ? "rules" : "AI"} run ${r.runId}; accepted by ${actor.id} on the review queue (item ${r.id})`;

/** C11.13 (P-120: a near duplicate's one-line reason is shown to the second person and at release): the library change
 *  a lander writes carries it beside the decider's reason, once. */
export function withNearReason(reason: string | null, identity: unknown): string | null {
  const id = identity as { near?: string[]; nearReason?: string | null } | null;
  if (!id?.near?.length || !id.nearReason || reason?.includes(id.nearReason)) return reason;
  return `${reason ? `${reason} ` : ""}Close to ${id.near.slice(0, 3).join(", ")}: ${id.nearReason}`.slice(0, 1000);
}

/** QA-192 (P-120, P-149 (2)): a person's one-line reason why an item close to a library item is not the same: the one its
 *  proposer gave (a person's words, never the rule's own or the AI's), or the decider's at accept. null when none. */
export function personNearReason(r: Pick<Row, "identity" | "origin">): string | null {
  const id = (r.identity ?? {}) as { near?: string[]; nearReason?: string | null; nearReasonBy?: string };
  if (!id.near?.length || !id.nearReason?.trim()) return null;
  if (id.nearReasonBy === "person") return id.nearReason;
  return r.origin === "ai" || isRuleWhy(id.nearReason) ? null : id.nearReason;
}

/** QA-192: whether accepting this item needs the decider's one-line reason (it adds to the library, is close to a library
 *  item, and no person has said why it is not the same). Field-map items are decided on their own page (BR-7). */
export function needsNearReason(r: Pick<Row, "id" | "identity" | "origin" | "landsOn" | "step" | "reuse" | "work" | "kind" | "payload">, libraryPool?: NearPool, twinReuses?: Set<string>): boolean {
  // Review M3: the same check decide() makes on a plain accept: the near list stored at proposal, and the library now.
  const near = [...(((r.identity ?? {}) as { near?: string[] }).near ?? []), ...(libraryPool && r.kind === "field" ? nearIn(libraryPool, r, r.payload) : [])];
  const reuse = (r.reuse ?? {}) as { match?: string; existingKey?: string | null };
  // A twin not yet resolved (reuse with no item) may add the item itself at accept (Devin on #726): counted as new.
  // Devin r3 on #726: a twin whose first copy is in the library now reuses it (decide() resolves it so), and needs none.
  const adds = reuse.match === "new" || (reuse.match === "reuse" && !reuse.existingKey && !!(r.work as { twinOf?: string } | null)?.twinOf && !twinReuses?.has(r.id));
  return r.landsOn === "library" && !ON_ITS_PAGE.has(r.step) && adds && !!near?.length && !personNearReason(r);
}

/** QA-192 (Devin r2 on #726, m-check): whether accepting `payload` as an edit of this item (the checker's reading on the
 *  queue) needs a person's reason: the same check decide() makes on an edit (the new name against the library and the
 *  other new fields waiting, never resting on the proposer's reason for the old name). */
export function needsNearReasonForEdit(r: Pick<Row, "id" | "landsOn" | "step" | "kind">, payload: unknown, libraryPool: NearPool, pending: (NearPool[number] & { id: string })[]): boolean {
  // Devin r3 on #726: an edit always lands its reading as a new item (a twin or a reuse match included), as decide() checks it.
  if (r.kind !== "field" || r.landsOn !== "library" || ON_ITS_PAGE.has(r.step)) return false;
  return nearIn([...libraryPool, ...pending.filter((x) => x.id !== r.id)], { work: null }, payload).length > 0;
}

/** Devin r3 on #726: the waiting twins that decide() would resolve to a reuse now (their first copy accepted and in the
 *  library, or the library already has the item), read once per request for the queue's "reason needed". */
export async function twinsThatReuse(db: Client, workspaceId: string, rows: Row[]): Promise<Set<string>> {
  const twins = rows.filter((r) => r.landsOn === "library" && (r.reuse as { match?: string; existingKey?: string | null } | null)?.match === "reuse" && !(r.reuse as { existingKey?: string | null }).existingKey && r.relatesTo && (r.work as { twinOf?: string } | null)?.twinOf);
  if (!twins.length) return new Set();
  const firsts = new Map((await db.proposalItem.findMany({ where: { id: { in: twins.map((t) => t.relatesTo!) } }, select: { id: true, status: true, decidedKey: true } })).map((f) => [f.id, f]));
  const out = new Set<string>();
  for (const t of twins) {
    const f = firsts.get(t.relatesTo!);
    if ((f?.decidedKey && ["accepted", "edited"].includes(f.status) && (await usableInLibrary(db, workspaceId, t.kind, f.decidedKey))) || (await sameInLibrary(db, workspaceId, t.payload as ProposalPayload))) out.add(t.id);
  }
  return out;
}

/** QA-192 (review M1–M3): what the one rule compares an item with at the decision, read once per request: the library's
 *  live fields, and (for an edit, whose new name no one has compared yet) the new fields waiting too. */
export type NearPool = { key: string | null; name: string; meaning: string | null }[];
export async function libraryNearPool(db: Client, workspaceId: string): Promise<NearPool> {
  return (await db.canonicalField.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] }, mergedIntoKey: null }, select: { canonicalFieldKey: true, label: true, meaning: true } }))
    .map((f) => ({ key: f.canonicalFieldKey, name: f.label || f.canonicalFieldKey, meaning: f.meaning }));
}
/** The names of the pool's items close to the item as it will land (its label and meaning), with the one rule. */
export function nearIn(pool: NearPool, r: Pick<Row, "work">, payload: unknown): string[] {
  const p = payload as { label?: string; meaning?: string };
  if (!p?.label) return [];
  return nearMatches({ key: ((r.work as { proposedKey?: string } | null)?.proposedKey) ?? null, name: p.label, meaning: p.meaning ?? null }, pool).map((n) => n.name);
}

/** "document type key|person" of every requirement the combination has now (each lineage's newest version, unless
 *  retired): a checklist line already there is never written twice (#277 review M2). */
export async function linesOnCombination(db: Client, combinationId: string): Promise<Set<string>> {
  const rows = await db.documentRequirement.findMany({ where: { combinationId }, select: { lineageKey: true, version: true, status: true, documentTypeKey: true, appliesToRoles: true } });
  const top = new Map<string, (typeof rows)[number]>();
  for (const r of rows) { const t = top.get(r.lineageKey); if (!t || r.version > t.version) top.set(r.lineageKey, r); }
  return new Set([...top.values()].filter((r) => r.status !== "RETIRED").map((r) => `${r.documentTypeKey}|${r.appliesToRoles}`));
}
/** Whose document a line is (the requirement writer's list, studio.ts WHO; kept here so the lander needs no Studio). */
const LINE_WHO = ["each_applicant", "principal_applicant", "spouse_or_partner", "couple_once", "each_dependent_child", "each_person", "case", "representative", "sponsor"];
const say = (k: string) => k.replace(/_/g, " ");

/** C2.6 (QA-157, P-149 one door): an accepted checklist line becomes a DRAFT document line of its combination, under the
 *  requirement writer's rules (studio.ts saveRequirement): a library document type that is not retired, a known person,
 *  a condition in the condition language when it is not always needed, never the same line twice. Its document type,
 *  when the library lacks it, is the document_type item proposed beside it (relatesTo): accepting the line accepts that
 *  item in the same decision, so it still waits for a second person (BR-7), and one Undo takes both back. */
async function landRequirementLine(tx: Tx, r: Row, p: ProposalPayload, l: Landing): Promise<string> {
  // Draft edits of a combination are the author duty (studio.ts saveRequirement; the old apply door needed it too).
  need(l.actor, "author");
  // Break M7 (#277): a stored line is checked before anything is written; a malformed one is refused in words.
  const parsed = ProposalPayload.safeParse(p);
  if (!parsed.success || parsed.data.kind !== "requirement_line") fail(`This document line is incomplete (${parsed.success ? "not a document line" : plainIssues(parsed.error)}): reject it, or edit it into a whole line.`);
  const q = parsed.data as Extract<ProposalPayload, { kind: "requirement_line" }>;
  if (!r.combinationId) fail("A document line belongs to a combination, and this proposal names none.");
  const live = { in: ["DRAFT", "PUBLISHED"] as ("DRAFT" | "PUBLISHED")[] };
  const inLibrary = async (k: string) => (await tx.documentType.findFirst({ where: { workspaceId: l.ws, status: live, OR: [{ documentTypeKey: k }, { name: { equals: k, mode: "insensitive" } }, { name: { equals: say(k), mode: "insensitive" } }] }, orderBy: { version: "desc" }, select: { documentTypeKey: true } }))?.documentTypeKey ?? null;
  let typeKey = await inLibrary(q.documentType);
  // The type proposed beside the line counts only while the line still names it (break M2: an edit naming another type
  // that the library lacks is refused, never quietly landed on the proposed one).
  const named = (r.payload as { documentType?: unknown }).documentType === q.documentType;
  const t = !typeKey && named && r.relatesTo ? await tx.proposalItem.findUnique({ where: { id: r.relatesTo } }) : null;
  if (t?.kind === "document_type") {
    const tn = String((t.payload as { name?: unknown }).name ?? q.documentType);
    if (t.status === "waiting") {
      if ((t.reuse as { match?: string }).match === "new") { const twin = await sameInLibrary(tx, l.ws, t.payload as ProposalPayload); if (twin) fail(`"${tn}" is already in the library as ${twin} (added since it was proposed): reject the document type proposal, then reject it and add the line by hand on the combination's Documents with ${twin}.`, HttpStatus.CONFLICT); }
      typeKey = await LANDERS.document_type!(tx, t, t.payload as ProposalPayload, { ...l, itemId: t.id, reason: `Accepted with its document line "${String((r.work as { label?: unknown } | null)?.label ?? q.documentType)}".` });
      await tx.proposalItem.update({ where: { id: t.id }, data: { status: "accepted", decidedBy: l.actor.id, decidedAt: new Date(), decisionReason: "Accepted with its document line.", batchId: l.batchId, decidedKey: typeKey,
        work: { ...((t.work ?? {}) as object), landedStamp: await stampOf(tx, l.ws, "document_type", typeKey!) } as Prisma.InputJsonValue } });
    } else if (["accepted", "edited"].includes(t.status) && t.decidedKey && (await usableInLibrary(tx, l.ws, "document_type", t.decidedKey))) typeKey = t.decidedKey;
    else fail(`Its document type "${tn}" was ${t.status === "rejected" ? "rejected" : "taken back"}, so the line has none: reject it and add the line by hand on the combination's Documents, with a document type of the library.`, HttpStatus.CONFLICT);
  }
  if (!typeKey) fail(`"${say(q.documentType)}" is not a document type in the shared library: reject it and add the line by hand on the combination's Documents, with a document type that is.`, HttpStatus.CONFLICT);
  await lockItem(tx, l.ws, "document_type", [typeKey]); await refuseRetired(tx, l.ws, "document_type", [typeKey]);
  const roles = [...new Set(q.roles)]; // break m1: a role named twice is one line
  const bad = roles.find((x) => !LINE_WHO.includes(x));
  if (bad) fail(`Whose document it is, "${say(bad)}", is not a choice: reject it and add the line by hand on the combination's Documents, for a person of Who can be.`);
  let tree: unknown = null;
  if (!q.always) {
    tree = q.condition?.tree;
    if (!tree || typeof tree !== "object") fail(`"${say(q.documentType)}" has no condition yet, and the checklist does not settle when it is needed, so it cannot be accepted as it stands: reject it and add the line by hand on the combination's Documents, with when it is needed (or as always needed).`, HttpStatus.CONFLICT);
    // The requirement writer's check: a draft may read a fact the library does not have yet (release blocks it, P-223 (a)).
    const all = await tx.canonicalField.findMany({ where: { workspaceId: l.ws }, orderBy: { version: "asc" }, select: { canonicalFieldKey: true, valueType: true, status: true } });
    const newest = new Map(all.map((f) => [f.canonicalFieldKey, f])); // each field's newest version (ordered by version)
    const retired = new Set([...newest.values()].filter((f) => f.status === "RETIRED").map((f) => f.canonicalFieldKey));
    const fields = new Map([...newest.values()].filter((f) => !retired.has(f.canonicalFieldKey)).map((f) => [f.canonicalFieldKey, f.valueType]));
    const derived = new Set((await tx.derivedField.findMany({ where: { workspaceId: l.ws }, select: { derivedKey: true } })).map((d) => d.derivedKey));
    // As the writer (studio.ts conditionErrors, C11.9 break M1): a retired field is named as retired and refused; a field
    // not in the library at all is allowed in a draft (release blocks it).
    const errs = checkCondition(tree, fields, derived).map((e) => { const m = /^reads (\S+), which is not in the library$/.exec(e); return m && retired.has(m[1]) ? `it reads "${m[1].split(".").pop()!.replace(/_/g, " ")}", a retired field: restore it in Shared library › Fields first, or choose another` : e; })
      .filter((e) => !/^reads [a-z][a-z0-9_]*\.[a-z0-9_.]+, which is not in the library$/.test(e));
    if (errs.length) fail(`Its condition does not fit the condition language yet (${errs[0]}): reject it and add the line by hand on the combination's Documents, with a condition that does.`);
  }
  const have = await linesOnCombination(tx, r.combinationId!);
  const twice = roles.find((x) => have.has(`${typeKey}|${x}`));
  if (twice) fail(`"${say(q.documentType)}" for ${say(twice)} is already on this combination: reject this one.`, HttpStatus.CONFLICT);
  const w = (r.work ?? {}) as { officialFile?: string; providedBy?: string };
  const src = r.source as { quote?: string; file?: string } | null;
  const keys: string[] = [];
  for (const role of roles) {
    let key = `${typeKey}:${role}`;
    if (await tx.documentRequirement.findFirst({ where: { combinationId: r.combinationId!, lineageKey: key }, select: { id: true } })) key = `${key}:${Date.now().toString(36)}`;
    await tx.documentRequirement.create({ data: { workspaceId: l.ws, combinationId: r.combinationId!, lineageKey: key, version: 1, status: "DRAFT", documentTypeKey: typeKey!, attachMode: q.always ? "COMBINATION_MANDATORY" : "ANSWER_CONDITIONAL",
      predicateJson: q.always ? Prisma.DbNull : (tree as Prisma.InputJsonValue), conditionPlain: q.always ? null : q.condition?.sentence ?? null, appliesToRoles: role, providedBy: w.providedBy ?? "client",
      sourceQuote: src?.quote ?? null, sourceFile: w.officialFile ?? (src?.file ? src.file.split("/").pop()! : null), alternatives: Prisma.DbNull, origin: "AI_PROPOSAL", updatedBy: l.actor.id } });
    keys.push(key);
  }
  return keys.join(",");
}

/** A form edition's printed captions by form field, read once per reading file (a committed reading does not change). */
/** A form edition's reading (its boxes), read once per file (a committed reading does not change). */
const READINGS = new Map<string, Map<string, InvField>>();
function readingOf(file: string | null): Map<string, InvField> {
  if (!file) return new Map();
  let m = READINGS.get(file);
  if (!m) { try { m = new Map(((JSON.parse(readFileSync(join(SOLUTION, file), "utf8")) as { fields?: InvField[] }).fields ?? []).map((x) => [x.data_path ?? "", x])); READINGS.set(file, m); } catch { return new Map(); } }
  return m;
}
export type CheckRead = { field: string; words: string; shared: string | null; sharedWords: string | null; values: { printed: string; shared: string | null }[] };
const fieldWords = (k: string) => { const w = (k.split(".").pop() ?? k).replace(/_/g, " "); return w.charAt(0).toUpperCase() + w.slice(1); };
const shortWords = (w: string) => (w.length > 70 ? `${w.slice(0, 68).trimEnd()}…` : w);
type Loose = { op?: unknown; field?: unknown; value?: unknown; args?: unknown; arg?: unknown; [k: string]: unknown };
/** The values a condition compares each field with (eq, neq, in), as written. */
function comparedValues(n: unknown, out = new Map<string, unknown[]>()): Map<string, unknown[]> {
  const o = n && typeof n === "object" && !Array.isArray(n) ? (n as Loose) : null;
  if (!o) return out;
  if (typeof o.field === "string" && ["eq", "neq", "in"].includes(String(o.op))) out.set(o.field, [...(out.get(o.field) ?? []), ...(Array.isArray(o.value) ? o.value : [o.value])]);
  if (Array.isArray(o.args)) o.args.forEach((a) => comparedValues(a, out));
  if (o.arg) comparedValues(o.arg, out);
  return out;
}
/** QA-196 review M1: a form check compares a form field with the form's printed choice words ("* Yes", "Other"); on the
 *  shared field the same answer is what the field holds (engine/qd-conditions.ts): a yes/no box (transform yes_no_code)
 *  true or false; a choice whose field map has an option map, the answer-list value whose form code that word prints.
 *  Anything else cannot be read on the shared field yet (undefined: the lander refuses it, fail closed). */
function sharedValue(v: unknown, m: { transform: string | null; optionMap: unknown }, box: InvField | undefined): unknown {
  if (typeof v !== "string") return undefined;
  const choices = box ? printedChoices(box) : [];
  const code = Array.isArray(choices) ? choices.find(([w]) => w === v)?.[1] : undefined;
  if (/^yes_no_code\b/.test((m.transform ?? "").trim())) {
    const word = [v, code ?? ""].map((x) => x.toLowerCase().replace(/[^a-z]/g, ""));
    return word.some((w) => w === "yes" || w === "y") ? true : word.some((w) => w === "no" || w === "n") ? false : undefined;
  }
  const map = (m.optionMap as { map?: Record<string, string> } | null)?.map;
  if (map && code !== undefined) return Object.entries(map).find(([, c]) => c === code)?.[0];
  return undefined;
}
function translated(n: unknown, field: (f: string) => string, value: (f: string, v: unknown) => unknown): unknown {
  const o = n && typeof n === "object" && !Array.isArray(n) ? (n as Loose) : null;
  if (!o) return n;
  const f = typeof o.field === "string" ? o.field : null;
  const compared = f !== null && ["eq", "neq", "in"].includes(String(o.op));
  return { ...o, ...(f !== null ? { field: field(f) } : {}), ...(compared ? { value: Array.isArray(o.value) ? o.value.map((v) => value(f!, v)) : value(f!, o.value) } : {}),
    ...(Array.isArray(o.args) ? { args: o.args.map((a) => translated(a, field, value)) } : {}), ...(o.arg ? { arg: translated(o.arg, field, value) } : {}) };
}
/** QA-196 (tech lead, 4 Nov): what a check reads, each as the shared field it becomes, for the lander and for To review.
 *  A form edition's check reads the form's own fields: each by its printed caption (the edition's reading), the shared
 *  field the edition's field map maps it to (null: not mapped yet), and each printed choice it compares with as that
 *  field's answer (null: not readable on the shared field yet). A guide's check reads answers: a shared field when the
 *  library has it, else its words (null: not in the library yet; a draft may read it, release warns). `tree` is the
 *  condition over the shared fields, or null while anything is not translated. */
export async function checkReads(db: Client, ws: string, r: Pick<Row, "formEdition" | "combinationId">, tree: unknown): Promise<{ reads: CheckRead[]; edition: { id: string; label: string; formId: string; formKey: string } | null; tree: unknown | null }> {
  const read = fieldsOf(tree), compared = comparedValues(tree);
  const names = async (keys: string[]) => new Map((await db.canonicalField.findMany({ where: { workspaceId: ws, canonicalFieldKey: { in: keys }, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "asc" }, select: { canonicalFieldKey: true, label: true } })).map((f) => [f.canonicalFieldKey, f.label?.trim() || fieldWords(f.canonicalFieldKey)]));
  if (r.combinationId || !r.formEdition) {
    const lib = await names(read);
    return { reads: read.map((f) => ({ field: f, words: lib.get(f) ?? fieldWords(f), shared: lib.has(f) ? f : null, sharedWords: lib.get(f) ?? null, values: [] })), edition: null, tree };
  }
  const ed = await db.formEdition.findFirst({ where: { workspaceId: ws, editionLabel: r.formEdition }, include: { form: { select: { id: true, formKey: true } } } });
  if (!ed) return { reads: read.map((f) => ({ field: f, words: f, shared: null, sharedWords: null, values: [] })), edition: null, tree: null };
  const maps = new Map(effective(await db.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath: { in: read } } }), (m) => m.dataPath, "draft").filter((m) => m.status !== "RETIRED" && m.outcome === "mapped" && m.canonicalFieldKey).map((m) => [m.dataPath, m]));
  const boxes = readingOf(ed.inventoryFile);
  const lib = await names([...maps.values()].map((m) => m.canonicalFieldKey!));
  const reads = read.map((f) => {
    const m = maps.get(f), k = m?.canonicalFieldKey ?? null;
    const values = [...new Set((compared.get(f) ?? []).map((v) => JSON.stringify(v)))].map((j) => { const v = JSON.parse(j) as unknown; const to = m ? sharedValue(v, m, boxes.get(f)) : undefined; return { printed: String(v), shared: to === undefined ? null : String(to) }; });
    return { field: f, words: shortWords(m?.caption?.trim() || boxes.get(f)?.caption?.trim() || f.split(".").slice(-2).join(".").replace(/\[0\]/g, "")), shared: k, sharedWords: k ? lib.get(k) ?? fieldWords(k) : null, values };
  });
  const whole = reads.every((x) => x.shared && x.values.every((v) => v.shared !== null));
  return { reads, edition: { id: ed.id, label: ed.editionLabel, formId: ed.form.id, formKey: ed.form.formKey },
    tree: whole ? translated(tree, (f) => maps.get(f)!.canonicalFieldKey!, (f, v) => sharedValue(v, maps.get(f)!, boxes.get(f))) : null };
}

/** QA-196 (P-149 (1) one door, P-120): an accepted AI check becomes a DRAFT check where checks live, on a combination
 *  (Library › Checks lists it, used in each), under the section-check writer's rules (studio.ts saveCheck): a condition in
 *  the condition language, never the same check twice in a draft. A guide's check lands on its own combination (a check
 *  over two answers or more is a cross-answer check). A form edition's check reads the form's own fields:
 *  each is read as the shared field the edition's field map maps it to, and the check lands on every combination whose
 *  draft files that form, under one key. A landed check warns, whatever the AI read (P-136: only two things block "Ready
 *  to file"), unless the person chose another severity before Accept. Its examples stay unconfirmed until the expert
 *  confirms (P-149 (5)). */
async function landCheck(tx: Tx, r: Row, p: ProposalPayload, l: Landing): Promise<string> {
  need(l.actor, "author"); // draft edits of a combination are the author duty (studio.ts saveCheck)
  const parsed = ProposalPayload.safeParse(p);
  if (!parsed.success || (parsed.data.kind !== "form_check" && parsed.data.kind !== "cross_check")) fail(`This check is incomplete (${parsed.success ? "not a check" : plainIssues(parsed.error)}): reject it.`);
  const c = parsed.data as Extract<ProposalPayload, { kind: "form_check" | "cross_check" }>;
  const work = (r.work ?? {}) as { group?: unknown };
  let tree = c.tree;
  let combos: { id: string; label: string }[];
  if (r.combinationId) {
    const one = await tx.combination.findUnique({ where: { id: r.combinationId }, select: { id: true, label: true } });
    if (!one) fail("The combination this check was drafted for is no longer there: reject it.", HttpStatus.NOT_FOUND);
    combos = [one!];
  } else {
    const got = await checkReads(tx, l.ws, r, c.tree), ed = got.edition, reads = got.reads;
    if (!ed) fail(`The form edition this check was drafted from (${r.formEdition ?? "none named"}) is no longer in the library: reject it.`, HttpStatus.CONFLICT);
    const unmapped = reads.filter((x) => !x.shared);
    if (unmapped.length) fail(`This check reads ${unmapped.length === 1 ? "a form field" : `${unmapped.length} form fields`} of ${ed!.label} that ${unmapped.length === 1 ? "is" : "are"} not mapped to a shared field yet (${unmapped.slice(0, 3).map((x) => `"${x.words}"`).join(", ")}${unmapped.length > 3 ? ", …" : ""}). Map ${unmapped.length === 1 ? "it" : "them"} on the form's field page first, then accept it again; or reject it.`, HttpStatus.CONFLICT);
    // Review M1: a printed choice the shared field cannot hold would never match an answer (contracts/rules.ts compares strictly).
    const odd = reads.flatMap((x) => x.values.filter((v) => v.shared === null).map((v) => ({ x, v })));
    if (odd.length) fail(`This check compares "${odd[0].x.words}" with "${odd[0].v.printed}", a choice printed on ${ed!.label} that the shared field ${odd[0].x.sharedWords} does not hold as an answer yet (its field map gives no answer for it). Set that form field's answers on its field map first, then accept it again; or reject it.`, HttpStatus.CONFLICT);
    tree = got.tree;
    const lines = effective(await tx.combinationForm.findMany({ where: { workspaceId: l.ws, govFormDefId: ed!.formId }, include: { combination: { select: { id: true, label: true } } } }), (x) => `${x.combinationId}|${x.lineageKey}`, "draft").filter((x) => x.status !== "RETIRED");
    combos = [...new Map(lines.map((x) => [x.combination.id, x.combination])).values()].sort((a, b) => a.label.localeCompare(b.label));
    if (!combos.length) fail(`No combination files ${ed!.formKey} yet, so this check has nowhere to apply: add the form to a combination's Forms first, then accept it; or reject it.`, HttpStatus.CONFLICT);
  }
  // As the section-check writer: a condition in the condition language; a field not in the library yet is allowed in a
  // draft (release warns), a retired one is refused (as the requirement lander, C11.9 break M1).
  const all = await tx.canonicalField.findMany({ where: { workspaceId: l.ws }, orderBy: { version: "asc" }, select: { canonicalFieldKey: true, valueType: true, status: true } });
  const newest = new Map(all.map((f) => [f.canonicalFieldKey, f]));
  const retired = new Set([...newest.values()].filter((f) => f.status === "RETIRED").map((f) => f.canonicalFieldKey));
  const fields = new Map([...newest.values()].filter((f) => !retired.has(f.canonicalFieldKey)).map((f) => [f.canonicalFieldKey, f.valueType]));
  const derived = new Set((await tx.derivedField.findMany({ where: { workspaceId: l.ws }, select: { derivedKey: true } })).map((d) => d.derivedKey));
  const gone = fieldsOf(tree).find((f) => retired.has(f));
  if (gone) fail(`It reads "${gone.split(".").pop()!.replace(/_/g, " ")}", a retired field: restore it in Shared library › Fields first, or reject it.`, HttpStatus.CONFLICT);
  const errs = checkCondition(tree, fields, derived).filter((e) => !/, which is not in the library$/.test(e));
  if (errs.length) fail(`Its condition does not fit the condition language (${errs[0]}): reject it, or edit its condition.`);
  const cross = c.kind === "cross_check";
  // Review m2 (P-153): only the guide prompt's own groups; any other word is an official rule (a section check would stop a
  // filing, P-136, and form_native or document_validity would never be evaluated).
  const group = cross ? "cross_record" : work.group === "readiness_warning" ? "readiness_warning" : "official_rule";
  // A landed check warns unless the person chose otherwise before Accept (an edit; tech lead, 4 Nov); a cross-answer one only warns.
  const severity = c.kind === "form_check" ? c.severity ?? "warn" : "warn";
  const appliesTo = fieldsOf(tree)[0] ?? null;
  const message = c.sentence.trim().slice(0, 500);
  const quote = ((r.source as { quote?: string } | null)?.quote ?? "").trim();
  const key = `AC-${createHash("sha256").update(r.id).digest("hex").slice(0, 10)}`;
  // Review B1: the AI writes a check's condition TRUE when the answers pass (p2/prompts/masters-*.v2.md); a stored check
  // fires when its condition holds (engine/render.ts, like a section check), so what lands is "not" the passing condition.
  const { subjectKind, ...passes } = (tree ?? {}) as { subjectKind?: unknown; [k: string]: unknown };
  const fires = { op: "not", arg: passes, ...(subjectKind !== undefined ? { subjectKind } : {}) };
  for (const k of combos) {
    const same = (await tx.check.findMany({ where: { combinationId: k.id, status: "DRAFT", checkGroup: group, appliesTo, message }, select: { predicateJson: true } })).some((x) => canonical(x.predicateJson as never) === canonical(fires as never));
    if (same) fail(`"${message}" is already in ${k.label}'s draft: reject this one.`, HttpStatus.CONFLICT);
    await tx.check.create({ data: { workspaceId: l.ws, combinationId: k.id, checkKey: key, checkGroup: group, appliesTo, predicateJson: fires as Prisma.InputJsonValue, severity, message, sourceQuote: quote.slice(0, 1000) || null, illustrative: !quote, version: 1, status: "DRAFT", origin: "AI_PROPOSAL", updatedBy: l.actor.id } });
  }
  return key;
}

/** LANDERS[kind]: what accepting an item writes, inside decide's transaction. A kind with no lander yet is refused. */
export const LANDERS: Partial<Record<ProposalKind, (tx: Tx, r: Row, p: ProposalPayload, l: Landing) => Promise<string>>> = {
  /** C4.11 part 3 (forms lane): a waiting library change for a second person (question-condition.ts), never a direct edit. */
  async condition(tx, _r, p, l) {
    if (p.kind !== "condition") fail("Wrong payload.");
    return proposeConditionChange(tx, l, p as Extract<ProposalPayload, { kind: "condition" }>);
  },
  async field(tx, r, p, l) {
    if (p.kind !== "field") fail("Wrong payload.");
    const f = p as Extract<ProposalPayload, { kind: "field" }>;
    const used = await taken(tx, l.ws);
    // C3.6 (P-158 (5)): a fact added for a rule keeps the key that rule already reads (never typed), and names the rule.
    const ruleFact = (r.work as { ruleFact?: unknown } | null)?.ruleFact;
    // B102 (A6, break MA2, MA3, review R3-M1 (a)): a worked-out value's key is taken: a fact is asked or worked out, never
    // both, whichever was written first (the add for a rule is refused here; an add by name, renamed or not, gets another key).
    const worked = new Set((await tx.derivedField.findMany({ where: { workspaceId: l.ws }, select: { derivedKey: true } })).map((d) => d.derivedKey));
    if (typeof ruleFact === "string" && worked.has(ruleFact)) fail(`${ruleFact} is worked out (Smart questionnaire (SQR) › Facts a rule needs › Work it out instead), so it is not asked: reject this one.`, HttpStatus.CONFLICT);
    for (const k of worked) used.add(k);
    const rule = (r.source as { rule?: { key: string; sentence: string } | null } | null)?.rule;
    if (typeof ruleFact === "string" && used.has(ruleFact)) {
      const retired = await tx.canonicalField.findFirst({ where: { workspaceId: l.ws, canonicalFieldKey: ruleFact, status: "RETIRED", mergedIntoKey: null }, select: { id: true } });
      fail(retired ? `${ruleFact} is a retired library field: reject this one and restore it in Library › Fields.` : `${ruleFact} is already in the library (added since it was proposed): reject this one; the rule can use it as it is.`, HttpStatus.CONFLICT);
    }
    if (typeof ruleFact === "string") await refuseTakingOverReaders(tx, l.ws, ruleFact, r.combinationId, rule?.key); // Breaker M9 on B83: checked again as it lands
    // C11.13 (review of #427): a field drafted from a form edition keeps the id the AI proposed (the key later drafts are
    // matched by), when it is a library key and still free; otherwise a key is made from the name, as for any field.
    const proposed = r.step === DRAFT_FIELDS_STEP ? (r.work as { proposedKey?: unknown } | null)?.proposedKey : undefined;
    const draftedKey = typeof proposed === "string" && proposed.length <= FIELD_ID_MAX && FIELD_ID.test(proposed) && !used.has(proposed) && !(await withdrawnStillRead(tx, l.ws, proposed)) ? proposed : null;
    // A drafted field whose proposed id is taken gets a key from that id's own name (its label may carry the area or a
    // number added to keep names apart); every other field keeps its whole label, as before (Devin #427).
    const proposedName = typeof proposed === "string" && proposed.includes(".") ? proposed.split(".").slice(1).join(" ").replace(/_/g, " ") : null;
    const key = typeof ruleFact === "string" ? ruleFact : draftedKey ?? await freeKey(tx, l.ws, f.subject ?? "case", proposedName ?? f.label, used); // Breaker M1 on B83
    // C3.6 (Lead, 2 Nov): a choice fact's answer values land as its answer list, checked again here so an edit on To
    // review passes the add's rules (break M2); the list rides with the field (api/src/answer-values.ts).
    const values = checkedFieldValues(f.valueType, f.values, r.step === "rule_fact"); // both add routes (review m-r2a)
    // Review m-r3a: an edit cannot drop a value the rule compares the fact with.
    const ruleValues = (r.work as { ruleValues?: unknown } | null)?.ruleValues;
    const lacking = values && Array.isArray(ruleValues) ? ruleValues.filter((v): v is string => typeof v === "string" && !values.some((x) => x.code === v)) : [];
    if (lacking.length) fail(`${rule?.sentence.split(":")[0] ?? "The rule"} compares this fact with ${lacking.map((m) => `"${m}"`).join(", ")}, which is not among the answer values (${values!.map((v) => v.code).join(", ")}): add it as a value, or reject this one.`);
    const answerListKey = values ? await landAnswerList(tx, l.ws, l.actor.id, f.label, values, slugKey) : null;
    await landField(tx, l, { key, meaning: f.meaning, valueType: f.valueType, label: f.label, answerListKey, sourceRef: rule ? `Needed by ${rule.sentence}; ${sourceRef(r, l.actor)}` : sourceRef(r, l.actor) });
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
    // QA-195 (break B1; P-134, P-153 (1)): the one door holds the identity rule whoever made or edited the proposal: an
    // identity document by its flag, category or name is never given an AI reader, and is recorded as one.
    const no = docTypeWhy(p);
    if (no) fail(no, HttpStatus.CONFLICT);
    const identityDocument = identityOf(d);
    const used = new Set((await tx.documentType.findMany({ where: { workspaceId: l.ws }, select: { documentTypeKey: true } })).map((x) => `x.${x.documentTypeKey}`));
    const key = slugKey(d.name, used);
    await tx.documentType.create({ data: { workspaceId: l.ws, documentTypeKey: key, name: d.name, category: d.category || "client", suppliesFacts: d.suppliesFacts,
      readerProfile: { readerKind: d.readerKind, identityDocument, proves: d.proves }, version: 1, status: "DRAFT",
      // C3.6: a type a person named while adding a requirement is the person's (made by: person), as before it went through
      // the queue; its author is the namer (decide passes them as proposedBy), so their own-draft Delete stays (C11.9).
      ...(r.step === "requirement_type" ? { origin: "HUMAN" as const, updatedBy: l.proposedBy ?? l.actor.id } : { origin: "AI_PROPOSAL" as const, updatedBy: l.actor.id }) } });
    await waitingAdd(tx, l, "document_type", key, d.name);
    return key;
  },
  requirement_line: landRequirementLine,
  form_check: landCheck,
  cross_check: landCheck,
};

/** C4.7 (P-76, P-149 one door): a pre-qualification pick lands on this combination, not the library. Accept writes the
 *  tick through the same draft row and refusals as a person's tick (fact-sources.ts acceptPqrPick), inside decide's
 *  transaction; the draft row it replaced is kept in the item's work, so Undo puts it back as it was. */
async function landPqrPick(tx: Tx, r: Row, p: ProposalPayload, l: Landing): Promise<{ key: string; work: PqrWork }> {
  if (p.kind !== "pqr_pick") fail("Wrong payload.");
  // Break B5: an edit changes only a pick's reason; the question and the person it ticks are the pick itself.
  const was = r.payload as { factKey?: string; role?: string };
  if ((p as { factKey: string }).factKey !== was.factKey || (p as { role: string }).role !== was.role) fail("An edit changes only the pick's reason. To ask another question, remove this pick and tick that question on the Smart questionnaire (SQR) tab.", HttpStatus.CONFLICT);
  const lineageKey = `${(p as { role: string }).role}|${(p as { factKey: string }).factKey}`;
  const before = r.combinationId ? await tx.factSource.findFirst({ where: { combinationId: r.combinationId, lineageKey }, orderBy: { version: "desc" } }) : null;
  const item = { id: r.id, kind: r.kind, runId: r.runId, step: r.step, scope: { formEdition: r.formEdition, combinationId: r.combinationId }, landsOn: r.landsOn, reuse: r.reuse, payload: p,
    source: r.source ?? null, rounds: r.rounds, rules: r.rules, agreement: r.agreement, confidence: r.confidence, reason: r.reason, origin: r.origin, identity: r.identity,
    relatesTo: r.relatesTo, revision: r.revision ?? null, status: "waiting", decision: null, basis: r.basis };
  await acceptPqrPick(tx, l.actor, item, { view: false });
  const made = await tx.factSource.findFirst({ where: { combinationId: r.combinationId!, lineageKey }, orderBy: { version: "desc" } });
  const { updatedAt, ...kept } = before ?? ({} as NonNullable<typeof before>);
  return { key: lineageKey, work: { pqrRowId: made!.id, pqrBefore: before?.status === "DRAFT" ? { ...kept, updatedAt: updatedAt.toISOString() } : null } };
}
type PqrWork = { pqrRowId: string; pqrBefore: Record<string, unknown> | null };
const pqrStamp = (tx: Tx, combinationId: string | null, key: string) => tx.factSource.findMany({ where: { combinationId: combinationId ?? "", lineageKey: key }, orderBy: { version: "asc" }, select: { id: true, version: true, status: true, updatedAt: true } });

/** The draft rows a library lander made, by kind (undo removes them while they are still untouched drafts). */
const LANDED: Record<string, (tx: Tx, ws: string, key: string) => Promise<unknown>> = {
  field: (tx, ws, key) => tx.canonicalField.deleteMany({ where: { workspaceId: ws, canonicalFieldKey: key, version: 1, status: "DRAFT" } }),
  section: (tx, ws, key) => tx.logicalSection.deleteMany({ where: { workspaceId: ws, sectionKey: key, version: 1, status: "DRAFT" } }),
  answer_list: (tx, ws, key) => tx.answerList.deleteMany({ where: { workspaceId: ws, answerListKey: key, version: 1, status: "DRAFT" } }),
  document_type: (tx, ws, key) => tx.documentType.deleteMany({ where: { workspaceId: ws, documentTypeKey: key, version: 1, status: "DRAFT" } }),
};
/** A landed item's rows as they stand (every version, its last change; an answer list's values too). Stored at the
 *  decision and compared at Undo, so an edit made after the accept is never erased by it (Lead review of PR #96 (1)). */
const STAMP: Record<string, (tx: Tx, ws: string, key: string) => Promise<unknown>> = {
  field: (tx, ws, key) => tx.canonicalField.findMany({ where: { workspaceId: ws, canonicalFieldKey: key }, orderBy: { version: "asc" }, select: { version: true, status: true, updatedAt: true } }),
  section: (tx, ws, key) => tx.logicalSection.findMany({ where: { workspaceId: ws, sectionKey: key }, orderBy: { version: "asc" }, select: { version: true, status: true, updatedAt: true } }),
  answer_list: (tx, ws, key) => tx.answerList.findMany({ where: { workspaceId: ws, answerListKey: key }, orderBy: { version: "asc" }, select: { version: true, status: true, updatedAt: true, values: { orderBy: { valueKey: "asc" }, select: { valueKey: true, label: true, sortOrder: true } } } }),
  document_type: (tx, ws, key) => tx.documentType.findMany({ where: { workspaceId: ws, documentTypeKey: key }, orderBy: { version: "asc" }, select: { version: true, status: true, updatedAt: true } }),
  // QA-196: an accepted check's rows on every combination it landed on.
  form_check: (tx, ws, key) => checkStamp(tx, ws, key),
  cross_check: (tx, ws, key) => checkStamp(tx, ws, key),
};
const checkStamp = (tx: Tx, ws: string, key: string) => tx.check.findMany({ where: { workspaceId: ws, checkKey: key }, orderBy: [{ combinationId: "asc" }, { version: "asc" }], select: { combinationId: true, version: true, status: true, updatedAt: true } });
/** C2.6: a document line a checklist item landed, as it stands (its lineages on its combination). */
const lineStamp = (tx: Tx, combinationId: string, key: string) => tx.documentRequirement.findMany({ where: { combinationId, lineageKey: { in: key.split(",") } }, orderBy: [{ lineageKey: "asc" }, { version: "asc" }], select: { lineageKey: true, version: true, status: true, updatedAt: true } });
const stampOf = async (tx: Tx, ws: string, kind: string, key: string, combinationId?: string | null) =>
  kind === "requirement_line" ? (combinationId ? JSON.stringify(await lineStamp(tx, combinationId, key)) : null) : STAMP[kind] ? JSON.stringify(await STAMP[kind](tx, ws, key)) : null;

export const UNDO_SECONDS = 10;
export const BATCH_MAX = 200;
/** Room for a batch's work inside one transaction (runtime lane, cross-lane fix, 30 Oct): the queue's transactions run a
 *  library query per item (identity check, lander, stamp), up to BATCH_MAX items or one form's whole field-map draft.
 *  Under load that passed Prisma's 5 s default and the step failed with "Transaction API error" (S7 six load, IMM 5257
 *  Schedule 1 and IMM 5707). Every queue transaction takes this option. */
export const QUEUE_TX = { timeout: 60_000, maxWait: 10_000 };
/** The field-map step's items map form fields as well, so they are decided on their form-field page (job.tsx) until
 *  that page folds into the queue with the edition drafts (1b, build-notes). A checklist draft's requirement lines
 *  (C2.6) are decided here, on the queue, like every other item (QA-157, P-149 one door: LANDERS.requirement_line). */
export const ON_ITS_PAGE = new Set(["field_map"]);
/** The page an ON_ITS_PAGE step is decided on, in words. */
export const PAGE_WORDS: Record<string, string> = { field_map: "form-field page, where its form fields are mapped too" };
/** Why an item cannot be accepted with others (P-121, P-158): only Ready items, never a rules item landing on the
 *  library. null when it can. */
/** P-296 (1) (tech lead, on #661): an AI-proposed new field definition is never accepted with others, on either door
 *  (the form-field page, To review): it adds to the shared library, so each is decided on its own. */
export const NEW_FIELD_ALONE = "A new shared field is decided on its own (only High reuse matches are accepted together): open it on its form-field page.";
/** P-299 (tech lead, on #699): the same rule for every other step (edition field drafts included): a field that would
 *  add to the library is accepted on its own. */
export const NEW_FIELD_ALONE_QUEUE = "A new shared field is decided on its own (only High reuse matches are accepted together): open it and accept it alone.";
/** P-305 (tech lead, P-299 extended): nothing new to the shared library is accepted in bulk, answer lists included;
 *  bulk is only for clean reuse. */
export const NEW_ITEM_ALONE_QUEUE = "It adds a new item to the shared library, so it is decided on its own (only High reuse matches are accepted together): open it and accept it alone.";
/** P-305 review M1: an AI condition changes when a shared question is asked, for every combination that asks it (a
 *  library change for a second person), so it is never accepted with others either. */
export const CONDITION_ALONE = "It changes when a shared question is asked, for every combination that asks it, so it is decided on its own: open it and accept it alone.";
/** P-305 review m1: a checklist line that would land its new document type with it adds to the library too. */
export const LINE_WITH_NEW_TYPE_ALONE = "It adds its new document type to the shared library with it, so it is decided on its own: open it and accept it alone.";
/** QA-195 (P-134, P-153 (1)): why a document type row's payload cannot be accepted, in plain words. The caller decides
 *  by the row's kind, never the payload's (break B1): a stored payload that does not follow the contract (no kind, an
 *  unknown reader, a name that is not text) is refused as such, and an identity document (by its flag, category or name,
 *  engine/identity-documents.ts) given a reader that is AI is refused by P-134. One sentence for the lander, a reuse
 *  accept (which runs no lander) and the bulk box, so a row stored before the masters guard knew names is refused everywhere. */
export function docTypeWhy(p: unknown): string | null {
  const parsed = ProposalPayload.safeParse(p);
  if (!parsed.success || parsed.data.kind !== "document_type") return `This document type proposal does not follow the queue's contract${parsed.success ? " (it is not a document type)" : `: ${plainIssues(parsed.error)}`}. Reject it; nothing was written.`;
  const d = parsed.data;
  return aiReadsIdentity(d) ? `"${d.name}" is an identity document: AI never reads it (P-134). Choose its coded lines, its printed layout or a person's reading.` : null;
}
export function bulkWhy(r: Pick<Row, "confidence" | "origin" | "landsOn" | "step"> & { kind?: string; relatesTo?: string | null; reuse?: unknown; agreement?: string; rounds?: unknown; rules?: unknown; reason?: string | null; work?: unknown; payload?: unknown }): string | null {
  // QA-195: an identity document with an AI reader is never accepted, alone or with others; the box says why first.
  const identity = r.kind === "document_type" ? docTypeWhy(r.payload) : null;
  if (identity) return identity;
  // G-CORE B5 (P-288 (2)): a field-map item is ticked with others on To review like any item when it is Ready (High:
  // both rounds agree and the rules pass, re-rated here from what is stored); otherwise the box says why, in P-121's
  // words. It still opens on its form-field page.
  if (ON_ITS_PAGE.has(r.step)) {
    if (r.confidence === "ready" && r.rounds !== undefined && r.rules !== undefined) {
      const again = p121Rating({ origin: r.origin as "ai" | "rules", agreement: r.agreement ?? "", rounds: r.rounds as Rateable["rounds"], rules: r.rules as Rateable["rules"], confidence: "ready", reason: null });
      if (again.confidence !== "ready") return again.reason;
    }
    if (r.confidence !== "ready") return r.agreement === "one_round" ? P121_WHY.oneRound : r.agreement === "differ" ? "The two AI readings differ: open it on its form-field page and choose." : "It needs a check first: open it on its form-field page and decide it on its own.";
    // P-296 (1): only an exact reuse match goes with others; a new definition (or an unclear match) never does.
    if ((r.work as { outcome?: string } | null | undefined)?.outcome !== "REUSE") return NEW_FIELD_ALONE;
  }
  // QA-176 (P-121): an AI item never goes with others without both rounds agreeing, even one stored Ready before the fix.
  if (r.confidence === "ready" && r.origin === "ai" && r.agreement && r.agreement !== "agreed") return r.agreement === "one_round" ? P121_WHY.oneRound : P121_WHY.differ;
  // C2.6 (QA-157): a one-round Decide item is one its source leaves to a person (e.g. the visa office), not two readings.
  if (r.confidence !== "ready") return r.confidence === "check" ? "It needs a check first: open it and decide it on its own." : r.agreement === "one_round" ? "Its source leaves it to a person: open it and decide it on its own." : "Its two readings differ: open it and choose.";
  if (r.origin === "rules" && r.landsOn === "library") return "A rules item that adds to the shared library is accepted on its own.";
  // P-299, P-305: nothing that would add to the library (not a reuse) is accepted with others, whatever its kind or step.
  if (r.landsOn === "library" && (r.reuse as { match?: string } | null | undefined)?.match === "new") return r.kind === "field" ? NEW_FIELD_ALONE_QUEUE : NEW_ITEM_ALONE_QUEUE;
  // P-305 review M1 and m1: an item that lands on the combination but writes a library change with it is alone too.
  if (r.kind === "condition") return CONDITION_ALONE;
  if (r.kind === "requirement_line" && r.relatesTo && (r.reuse as { match?: string } | null | undefined)?.match === "new") return LINE_WITH_NEW_TYPE_ALONE;
  return null;
}
/** QA-192 review r3 M4 (P-121): why an item that needs a person's near reason cannot be ticked with others. */
export const NEAR_BULK_WHY = "It is close to a library item: open it and say why it is not the same.";
export type Decision = { action: "accept" | "edit" | "reject"; reason?: string | null; payload?: unknown };
/** QA-206 (P-158, PRODUCT §4): the words a section with no printed heading carries (form-masters.ts rules pass) until a
 *  person names it; it is never accepted under its placeholder, so a client never sees one as a questionnaire section. */
export const UNNAMED_WHY = "Give the section a name before it is accepted.";
/** A placeholder name, however it is spaced or cased ("Unnamed  section 2 of IMM 5475"). */
const isPlaceholder = (label: string) => normalizeLabel(label).startsWith("unnamedsection");
/** The C3.4 rules pass's step (form-masters.ts MASTERS_STEP; named here so this module does not import that one). */
const MASTERS_SECTIONS_STEP = "masters_edition";

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
    // C2.6 break M3: the items are locked first, so an accept and a reject of the same item at the same moment cannot
    // both succeed; the second waits, then reads the first's decision and is refused as already decided.
    const valid = ids.filter((x) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x));
    if (valid.length) await tx.$queryRaw`SELECT id FROM proposal_item WHERE id = ANY(${valid}::uuid[]) ORDER BY id FOR UPDATE`;
    const rows = await tx.proposalItem.findMany({ where: { id: { in: valid }, workspaceId } });
    if (rows.length !== new Set(ids).size) fail("A proposal was not found (the demo may have been reset).", HttpStatus.NOT_FOUND);
    const done = rows.filter((r) => r.status !== "waiting");
    if (done.length) fail(`${done.length === 1 ? "A proposal is" : `${done.length} proposals are`} already decided (${done[0].status}); an approved item changes only as a revision.`, HttpStatus.CONFLICT);
    // G-CORE B5 (P-288 (2)): a field-map item is accepted here as on its page (the same choice); edited or rejected there.
    const elsewhere = d.action !== "accept" ? rows.find((r) => ON_ITS_PAGE.has(r.step)) : undefined;
    if (elsewhere) fail(`"${String((elsewhere.payload as { label?: unknown }).label ?? identityKeyOf(elsewhere.payload as ProposalPayload, elsewhere.identityKey))}" is decided on its ${PAGE_WORDS[elsewhere.step] ?? "own page"}.`, HttpStatus.CONFLICT);
    // P-121: several at once is for Ready items only, and never a rules item that adds to the library (1b).
    let libPool: NearPool | null = null; // QA-192 review M3: read once per decision
    if (d.action === "accept" && rows.length > 1) {
      // QA-192 review r3 M4: an item that needs a person's near reason is accepted on its own, as the queue says.
      libPool = await libraryNearPool(tx, workspaceId);
      const reuses = await twinsThatReuse(tx, workspaceId, rows);
      const no = rows.map((r) => [r, bulkWhy(r) ?? (needsNearReason(r, libPool!, reuses) ? NEAR_BULK_WHY : null)] as const).filter(([, why]) => why);
      if (no.length) fail(`Only Ready items are accepted together. ${no.length === 1 ? "One item" : `${no.length} items`} cannot be: "${nameOf(no[0][0].payload as ProposalPayload, no[0][0].identityKey)}" (${no[0][1]}). Nothing was accepted.`, HttpStatus.CONFLICT);
    }
    const out: { id: string; landedAs: string | null; joined?: boolean }[] = [];
    for (const r of rows) {
      let payload = r.payload as ProposalPayload;
      if (d.action === "edit") {
        const p = ProposalPayload.safeParse(d.payload);
        if (!p.success) fail(`The edited proposal does not follow the contract: ${plainIssues(p.error)}.`);
        if (p.data!.kind !== r.kind) fail("An edit keeps the proposal's kind.");
        payload = p.data!;
      }
      // QA-206: a section the rules pass found no printed heading for is accepted only under a name a person gives it.
      // A rules-pass section drafted before printed headings were read (no "printed_heading" rule result; Devin review on
      // #883) may carry the PDF's internal part name ("Page wrapper"), and its edition's one draft (P-138) is never redone:
      // it too is accepted only as an edit with a name a person typed (keeping its name is then the person's choice).
      // A reuse of a named library item adds no name to the library (it lands on that item), so it is left as it was
      // (review r5 M6: an edit lands a new item, except a held section named what the library holds (B78), so refusing its plain accept would make a duplicate). A twin waiting
      // on another edition's copy (reuse with no key yet) may still resolve to a new item below, so it stays guarded
      // (Devin review on c0f65af62).
      const reuseOf = r.reuse as { match?: string; existingKey?: string | null } | null;
      let lands = reuseOf?.match === "reuse" ? reuseOf.existingKey ?? null : null;
      const oldShape = r.kind === "section" && r.step === MASTERS_SECTIONS_STEP && r.origin === "rules" && !((r.rules ?? []) as { rule?: unknown }[]).some((x) => x?.rule === "printed_heading");
      if (oldShape && reuseOf?.match === "reuse" && !lands && r.relatesTo) {
        // A twin: it lands on its first copy's item when that one is in the library, as the resolution below finds it.
        const first = await tx.proposalItem.findUnique({ where: { id: r.relatesTo }, select: { status: true, decidedKey: true } });
        lands = first?.decidedKey && ["accepted", "edited"].includes(first.status) && (await usableInLibrary(tx, workspaceId, r.kind, first.decidedKey)) ? first.decidedKey : await sameInLibrary(tx, workspaceId, payload);
      }
      const legacy = oldShape && !lands;
      if (d.action !== "reject" && r.kind === "section" && ((r.work as { unnamed?: unknown } | null)?.unnamed === true || legacy)) {
        const was = String((r.payload as { label?: unknown }).label ?? ""), now = String((payload as { label?: unknown }).label ?? "");
        if (d.action === "accept" || isPlaceholder(now) || (!legacy && normalizeLabel(now) === normalizeLabel(was)))
          fail(legacy ? `"${was}" was drafted before the form's printed headings were read, so its name may be the PDF's own part name. ${UNNAMED_WHY} Keeping this name is fine once you have checked it.${rows.length > 1 ? " Nothing was accepted." : ""}`
            : `"${was}" has no name from the form yet. ${UNNAMED_WHY}${rows.length > 1 ? " Nothing was accepted." : ""}`, HttpStatus.CONFLICT);
      }
      let landedAs: string | null = null, reused = false, joined = false, pqr: (PqrWork & { stamp: string }) | null = null;
      let resolved: { match: string; existingKey: string | null } | null = null;
      // QA-192 (P-120: a near duplicate needs a one-line reason, shown to the second person at release): an item that adds
      // to the library while close to a library item is accepted only with a person's reason why it is not the same, its
      // proposer's or, when none, the decider's (8 characters or more); it is kept as the item's near reason.
      const nearIds = (r.identity ?? {}) as { near?: string[]; nearReason?: string | null; nearReasonBy?: string };
      let identity = r.identity as Prisma.InputJsonValue | null, nearGiven = false;
      if (d.action !== "reject") {
        // B78 (review M1): a section waiting for a name, given a name the library already holds, is that section: it lands
        // there with the person's name on the item, so its form fields are asked there and no second section is made.
        const namedTwin = d.action === "edit" && r.kind === "section" && r.landsOn === "library" && (r.work as { unnamed?: unknown } | null)?.unnamed === true ? await sameInLibrary(tx, workspaceId, payload) : null;
        if (!namedTwin && r.landsOn === "library" && (r.reuse as { match: string }).match === "new") {
          const twin = await sameInLibrary(tx, workspaceId, payload);
          if (twin) fail(`"${nameOf(payload, r.identityKey)}" is already in the library as ${twin} (added since it was proposed): reject this one, or reuse that item.`, HttpStatus.CONFLICT);
        }
        const reuse = r.reuse as { match: string; existingKey: string | null };
        if (namedTwin) { resolved = { match: "reuse", existingKey: namedTwin }; reuse.match = resolved.match; reuse.existingKey = resolved.existingKey; joined = true; }
        // P-120: a reuse adds nothing to the library; it records the existing item it uses, if that is still there.
        // C11.13 (review M1–M2): a twin drafted for another edition reuses the item its first copy added; when that one
        // is not in the library (waiting, rejected or undone), the twin adds it itself, unless the library already has it.
        if (r.landsOn === "library" && reuse.match === "reuse" && !reuse.existingKey && r.relatesTo && (r.work as { twinOf?: string } | null)?.twinOf) {
          const first = await tx.proposalItem.findUnique({ where: { id: r.relatesTo }, select: { status: true, decidedKey: true } });
          const key = first?.decidedKey && ["accepted", "edited"].includes(first.status) && (await usableInLibrary(tx, workspaceId, r.kind, first.decidedKey)) ? first.decidedKey : await sameInLibrary(tx, workspaceId, payload);
          resolved = key ? { match: "reuse", existingKey: key } : { match: "new", existingKey: null };
          reuse.match = resolved.match; reuse.existingKey = resolved.existingKey;
          // P-305: a twin whose first copy is not in the library adds the item itself, so it is no longer a clean reuse.
          if (resolved.match === "new" && d.action === "accept" && rows.length > 1) fail(`"${nameOf(payload, r.identityKey)}" cannot be accepted with others: its first copy (drafted for another form) is not accepted or not in the library yet, so accepting it would add the item to the shared library. Accept it on its own. Nothing was accepted.`, HttpStatus.CONFLICT);
        }
        // Devin on #726 and review M1–M2: checked after a twin's reuse choice is resolved, on the item as it will land: the
        // near list is found again with the one rule (an edit's new name, a twin the door did not check) and joined to
        // what the producer said.
        // Review M3: a plain accept compares with the library only (a waiting item proposed later carries the pair itself);
        // an edit's new name is compared with the waiting new fields too. Review r2 m2: an edit never rests on the
        // proposer's reason for the old name.
        // Devin r3 on #726: an edit lands its reading as a new item (only an accept, or a held section's name the library holds, reuses), so every edit that lands
        // on the library is checked, a resolved twin or a reuse match included.
        if (r.landsOn === "library" && !ON_ITS_PAGE.has(r.step) && (d.action === "edit" || (reuse.match === "new" && !personNearReason(r)))) {
          let found: string[] = [];
          if (r.kind === "field") {
            libPool ??= await libraryNearPool(tx, workspaceId);
            // Devin r2 on #726: an edit's new name lands under a key built from it, so the proposer's key never hides a match.
            found = d.action === "edit" ? nearIn([...libPool, ...(await pendingNewFields(tx, workspaceId, [r.id]))], { work: null }, payload) : nearIn(libPool, r, payload);
          }
          const near = [...new Set([...(d.action === "edit" ? [] : (nearIds.near ?? [])), ...found])].filter(Boolean).slice(0, 10);
          if (near.length) {
            if (!reason || reason.length < 8) fail(`"${nameOf(payload, r.identityKey)}" is close to ${near.slice(0, 3).join(", ")}: say in one line why it is not the same (8 characters or more). The second person sees it at release.`);
            if (isRuleWhy(reason!)) fail(`Say in your own words why "${nameOf(payload, r.identityKey)}" is not the same as ${near[0]}; the rule's own words are not a reason.`); // review m2
            identity = { ...nearIds, near, nearReason: reason, nearReasonBy: "person" } as Prisma.InputJsonValue; nearGiven = true;
          } else if (d.action === "edit" && nearIds.near?.length) {
            // Devin r2 on #726: an edit no longer close to anything drops the old name's near list, so the approver is not
            // told it is close to a field it is not (Undo puts the old list back).
            identity = { ...nearIds, near: [], nearReason: null, nearReasonBy: null } as Prisma.InputJsonValue; nearGiven = true;
          }
        }
        // QA-195 (P-134): checked on the item as it will land, before the reuse branch (which runs no lander), so a row
        // stored with an AI reader for an identity document is refused here too, alone or in a batch.
        const noIdentity = r.kind === "document_type" ? docTypeWhy(payload) : null;
        if (noIdentity) fail(noIdentity, HttpStatus.CONFLICT);
        if (r.landsOn === "library" && reuse.match === "reuse" && (d.action === "accept" || namedTwin)) {
          if (!(await usableInLibrary(tx, workspaceId, r.kind, reuse.existingKey))) fail(`"${nameOf(payload, r.identityKey)}" reuses ${reuse.existingKey ?? "no item"}, which is not in the library (retired, merged or never added): reject this proposal, or edit it into a new item.`, HttpStatus.CONFLICT);
          // QA-195 break B2 (P-134): a reuse never lands on a library document type that is itself an identity document
          // read by AI (one stored before the guard knew names): its reader is corrected in the library first.
          if (r.kind === "document_type") {
            const lib = await tx.documentType.findFirst({ where: { workspaceId, documentTypeKey: reuse.existingKey! }, orderBy: { version: "desc" }, select: { name: true, category: true, readerProfile: true } });
            const rp = (lib?.readerProfile ?? {}) as { readerKind?: unknown; identityDocument?: unknown };
            if (lib && aiReadsIdentity({ name: lib.name, category: lib.category, identityDocument: rp.identityDocument === true, readerKind: String(rp.readerKind ?? "") }))
              fail(`"${lib.name}" in the library is an identity document with a reader that is AI (P-134), so nothing may reuse it: give it its coded lines, its printed layout or a person's reading in the library first. Nothing was accepted.`, HttpStatus.CONFLICT);
          }
          landedAs = reuse.existingKey; reused = true;
        } else if (ON_ITS_PAGE.has(r.step)) {
          landedAs = await acceptOnItsPage(tx, r); reused = true; // nothing lands in the library before its draft is applied
        } else if (r.kind === "pqr_pick") {
          const got = await landPqrPick(tx, r, payload, { ws: workspaceId, actor, batchId, itemId: r.id, reason: reason ?? r.reason });
          landedAs = got.key; pqr = { ...got.work, stamp: JSON.stringify(await pqrStamp(tx, r.combinationId, got.key)) };
        } else {
          const land = LANDERS[r.kind as ProposalKind];
          if (!land) fail(`A ${r.kind.replace(/_/g, " ")} proposal is accepted with its own step, not yet on this queue.`, HttpStatus.CONFLICT);
          // C3.6 (#523 Question 1): a type a person named while adding a requirement keeps that person as its proposer (as
          // before it went through the queue), read from the server's own run, so their "Delete your own unapproved type" stays.
          const namer = r.step === "requirement_type" && r.runId ? (await tx.draftingJob.findFirst({ where: { id: r.runId, workspaceId, kind: "requirement_type" }, select: { startedBy: true } }))?.startedBy : null;
          landedAs = await land!(tx, r, payload, { ws: workspaceId, actor, batchId, itemId: r.id, reason: withNearReason(reason ?? r.reason, identity), proposedBy: namer ?? actor.id, combinationId: r.combinationId, sourceJobId: r.runId });
        }
      }
      // What a library lander wrote, as it stands now: Undo refuses once it has changed (PR #96 review (1)).
      const landedStamp = landedAs && !reused ? await stampOf(tx, workspaceId, r.kind, landedAs, r.combinationId) : null;
      const work = { ...((r.work ?? {}) as object), ...(d.action === "edit" ? { beforeEdit: r.payload } : {}), ...(landedStamp ? { landedStamp } : {}), ...(pqr ? { pqr } : {}), ...(nearGiven ? { nearBefore: r.identity } : {}) };
      await tx.proposalItem.update({ where: { id: r.id }, data: { status: d.action === "accept" ? "accepted" : d.action === "edit" ? "edited" : "rejected", decidedBy: actor.id, decidedAt: new Date(), ...(ON_ITS_PAGE.has(r.step) ? { choice: "ACCEPTED" } : {}),
        decisionReason: reason, batchId, decidedKey: landedAs, ...(resolved && d.action !== "reject" ? { reuse: resolved } : {}),
        ...(d.action === "edit" || landedStamp || pqr || nearGiven ? { work: work as Prisma.InputJsonValue } : {}), ...(nearGiven ? { identity: identity as Prisma.InputJsonValue } : {}),
        // An edit keeps the item's own reading beside it, so Undo puts the item back as it was proposed (1b).
        ...(d.action === "edit" ? { payload: payload as Prisma.InputJsonValue, identityKey: identityKeyOf(payload, r.identityKey) } : {}) } });
      out.push({ id: r.id, landedAs, ...(joined ? { joined } : {}) });
    }
    return out;
  // Review M2 (#282): a bulk accept of up to BATCH_MAX picks checks each against the combination inside this one
  // transaction; Prisma's 5 s default ended batches above about 45 picks with nothing accepted.
  }, { ...QUEUE_TX, timeout: 120_000 });
  await audit.log(workspaceId, actor.id, "decided", "proposals", batchId, `${actor.name} ${d.action === "accept" ? "accepted" : d.action === "edit" ? "edited and accepted" : "rejected"} ${landed.length} proposal${landed.length === 1 ? "" : "s"}${reason ? `: ${reason}` : ""}`, { n: landed.length }); // QA-193 review M1: how many it made, so Undo knows when one left the batch since
  return { batchId, items: landed };
}

/** Undo a decision batch within 10 s: its landed draft rows and waiting ADDs are removed and its items wait again on
 *  the queue as they were proposed (1b: "undone" left them nowhere; the activity log keeps the undo). Only the person
 *  who decided, only while every ADD is still waiting. */
const PAGE_DECIDED_SINCE = "One of these items was decided again on its form-field page since, so Undo would erase that decision. Nothing was undone: change it on that page.";
export async function undo(db: Db, audit: Audit, actor: Actor, workspaceId: string, batchId: string) {
  need(actor, "review");
  const res = await db.$transaction(async (tx) => {
    const rows = await tx.proposalItem.findMany({ where: { workspaceId, batchId } });
    // C3.2 AT-9: an Undo clears the items' batch id, so the same Undo again finds none; the activity log still has the
    // undo, so it is refused as done (409), not as unknown.
    if (!rows.length && await tx.auditEvent.count({ where: { workspaceId, action: "undone", entity: "proposals", entityKey: batchId } })) fail("Already undone: these proposals wait on the queue again. Nothing was changed.", HttpStatus.CONFLICT);
    // QA-193 review M1 and Devin on #740: a decision on the form-field page takes the item out of the batch (recordChoice),
    // and a re-compare re-writes the items under new ids (keeping the batch of a kept decision, reopening the others). So
    // the decision's log says how many items it made: when fewer carry the batch now, one was decided again since and the
    // decision is never undone from here. (A decision logged before this has no count and is checked as before.)
    if (!(await tx.auditEvent.count({ where: { workspaceId, action: "undone", entity: "proposals", entityKey: batchId } }))) {
      const made = (await tx.auditEvent.findFirst({ where: { workspaceId, action: "decided", entity: "proposals", entityKey: batchId }, select: { detail: true } }))?.detail as { n?: number } | null;
      if (typeof made?.n === "number" && rows.length < made.n) fail(PAGE_DECIDED_SINCE, HttpStatus.CONFLICT);
    }
    if (!rows.length) fail("No decision with this id.", HttpStatus.NOT_FOUND);
    if (rows.some((r) => r.decidedBy !== actor.id)) fail("Only the person who decided can undo it.", HttpStatus.FORBIDDEN);
    if (rows.some((r) => r.status === "undone")) fail("Already undone.", HttpStatus.CONFLICT);
    const at = Math.max(...rows.map((r) => r.decidedAt?.getTime() ?? 0));
    if (Date.now() - at > UNDO_SECONDS * 1000) fail(`Undo is offered for ${UNDO_SECONDS} seconds; after that, retire or delete the item in the library.`, HttpStatus.CONFLICT);
    const adds = await tx.libraryChange.findMany({ where: { workspaceId, batchId } });
    if (adds.some((c) => c.status !== "WAITING")) fail("A second person has already decided one of these items: it cannot be undone here.", HttpStatus.CONFLICT);
    // G-CORE B5: a field-map item accepted here goes back only while its draft is not applied and nobody decided it again
    // on its form-field page.
    const onPage = rows.filter((r) => ON_ITS_PAGE.has(r.step));
    if (onPage.some((r) => r.choice !== "ACCEPTED")) fail(PAGE_DECIDED_SINCE, HttpStatus.CONFLICT);
    if (onPage.length && await tx.draftingJob.count({ where: { id: { in: [...new Set(onPage.map((r) => r.runId).filter((x): x is string => !!x))] }, status: "APPLIED" } })) fail("The form's draft was applied to the configuration since, so Undo would leave its form fields mapped. Nothing was undone: change the mapping in the library instead.", HttpStatus.CONFLICT);
    // C11.13 (review M3): an item this batch added that another accepted item now reuses is not taken away under it.
    const added = rows.filter((r) => r.decidedKey && (r.reuse as { match?: string } | null)?.match !== "reuse");
    const keys = added.map((r) => r.decidedKey!);
    const users = keys.length ? await tx.proposalItem.findMany({ where: { workspaceId, status: { in: ["accepted", "edited"] }, decidedKey: { in: keys }, reuse: { path: ["match"], equals: "reuse" }, NOT: { batchId } }, select: { kind: true, decidedKey: true, formEdition: true } }) : [];
    const user = users.find((u) => added.some((r) => r.kind === u.kind && r.decidedKey === u.decidedKey));
    if (user) fail(`${user.decidedKey} is now reused by an item accepted for ${user.formEdition ?? "another source"}, so Undo would take it away under that item. Nothing was undone: undo that decision first, or retire the item in the shared library.`, HttpStatus.CONFLICT);
    // C3.6 (break M1 on #573) and C2.6 (break M1 on #574): a document type this batch added that a line outside this
    // batch now uses (as its type or an alternative) is not taken away under that line. The lines this batch wrote itself
    // (a C2.6 checklist line accepted with its new type) go with it, so one Undo still takes both back. The line door
    // takes the same per-item lock (studio.ts saveRequirement, library-items.ts lockItem).
    const typeKeys = [...new Set([...adds.filter((c) => c.kind === "document_type").map((c) => c.key), ...added.filter((r) => r.kind === "document_type").map((r) => r.decidedKey!)])].sort();
    if (typeKeys.length) {
      await lockItem(tx, workspaceId, "document_type", typeKeys);
      const own = new Set(rows.filter((r) => r.kind === "requirement_line" && r.decidedKey && r.combinationId).flatMap((r) => r.decidedKey!.split(",").map((k) => `${r.combinationId}|${k}`)));
      for (const k of typeKeys) {
        const using = (await tx.documentRequirement.findMany({ where: { workspaceId, status: { not: "RETIRED" }, OR: [{ documentTypeKey: k }, { alternatives: { array_contains: [k] } }] }, select: { combinationId: true, lineageKey: true, combination: { select: { label: true } } } }))
          .find((d) => !own.has(`${d.combinationId}|${d.lineageKey}`));
        if (using) fail(`The document type ${k} is already used by a checklist line on ${using.combination.label}, so Undo would take it away under that line. Nothing was undone: remove that line (or undo its decision) first, or retire the type in the shared library.`, HttpStatus.CONFLICT);
      }
    }
    // PR #96 review (1): an item edited after the accept is not erased by Undo; the library keeps the person's edit.
    for (const r of rows) {
      const { landedStamp } = (r.work ?? {}) as { landedStamp?: string };
      if (landedStamp && r.decidedKey && (await stampOf(tx, workspaceId, r.kind, r.decidedKey, r.combinationId)) !== landedStamp)
        fail(`"${nameOf(r.payload as ProposalPayload, r.identityKey)}" was changed after it was accepted, so Undo would erase that change. Nothing was undone: ${r.kind === "requirement_line" ? "change or remove the line on the combination's Documents instead" : r.kind === "form_check" || r.kind === "cross_check" ? "change the check on its combination's draft instead" : "retire or delete it in the shared library instead"}.`, HttpStatus.CONFLICT);
    }
    // C4.7: an accepted pick's tick is taken back only while it is the draft the accept wrote (not changed or released
    // since); the draft it replaced comes back as it was.
    for (const r of rows) {
      const { pqr } = (r.work ?? {}) as { pqr?: PqrWork & { stamp: string } };
      if (!pqr || !r.decidedKey) continue;
      if (JSON.stringify(await pqrStamp(tx, r.combinationId, r.decidedKey)) !== pqr.stamp)
        fail(`A Prospect questionnaire (PQR) tick this decision made was changed or released after it was accepted, so Undo would erase that change. Nothing was undone: change it on the Smart questionnaire (SQR) tab instead.`, HttpStatus.CONFLICT);
      await tx.factSource.delete({ where: { id: pqr.pqrRowId } });
      if (pqr.pqrBefore) await tx.factSource.create({ data: { ...(pqr.pqrBefore as Prisma.FactSourceUncheckedCreateInput), updatedAt: new Date(String(pqr.pqrBefore.updatedAt)) } });
    }
    // C3.6 (break B2): a field's own draft list goes with it, unless another field uses it.
    const lists = await tx.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: adds.filter((c) => c.kind === "field").map((c) => c.key) }, status: "DRAFT", version: 1 }, select: { answerListKey: true } });
    for (const c of adds) await LANDED[c.kind]?.(tx, workspaceId, c.key);
    // C2.6: the draft document lines a checklist item wrote (unchanged since, checked above) go with it.
    for (const r of rows) if (r.kind === "requirement_line" && r.decidedKey && r.combinationId) await tx.documentRequirement.deleteMany({ where: { combinationId: r.combinationId, lineageKey: { in: r.decidedKey.split(",") }, version: 1, status: "DRAFT" } });
    // QA-196: the draft checks an accepted check wrote, on each combination (unchanged since, checked above), go with it.
    for (const r of rows) if ((r.kind === "form_check" || r.kind === "cross_check") && r.decidedKey) await tx.check.deleteMany({ where: { workspaceId, checkKey: r.decidedKey, version: 1, status: "DRAFT" } });
    for (const x of lists) await dropFieldList(tx, workspaceId, x.answerListKey);
    await tx.libraryChange.deleteMany({ where: { workspaceId, batchId } });
    for (const r of rows) {
      const { beforeEdit, landedStamp, pqr, nearBefore, ...work } = (r.work ?? {}) as { beforeEdit?: ProposalPayload; landedStamp?: string; pqr?: unknown; nearBefore?: unknown };
      await tx.proposalItem.update({ where: { id: r.id }, data: { status: "waiting", decidedBy: null, decidedAt: null, decisionReason: null, batchId: null, decidedKey: null, ...(ON_ITS_PAGE.has(r.step) ? { choice: null } : {}),
        ...((r.work as { twinOf?: string } | null)?.twinOf ? { reuse: { match: "reuse", existingKey: null } } : {}),
        ...(r.kind === "section" && (r.work as { unnamed?: unknown } | null)?.unnamed === true ? { reuse: { match: "new", existingKey: null } } : {}), // B78: it waits for a name again
        ...(beforeEdit || landedStamp || pqr || nearBefore ? { work: work as Prisma.InputJsonValue } : {}), ...(nearBefore ? { identity: nearBefore as Prisma.InputJsonValue } : {}),
        ...(beforeEdit ? { payload: beforeEdit as Prisma.InputJsonValue, identityKey: identityKeyOf(beforeEdit, r.identityKey) } : {}) } });
    }
    return rows.length;
  }, QUEUE_TX);
  await audit.log(workspaceId, actor.id, "undone", "proposals", batchId, `${actor.name} undid a decision on ${res} proposal${res === 1 ? "" : "s"}`);
  return { undone: res };
}
