// S6 slice 1a (P-149 one door; screens/W1-shared-library/plan-slice1.md): every AI, rules or person proposal enters the
// review queue here and nowhere else. insertProposals parses contract v2 (contracts/proposal-item.ts) and checks identity
// at write; decide accepts, edits or rejects, running the kind's lander inside the same transaction and checking identity
// again; undo takes a whole decision batch back within 10 s. A library lander writes the draft row and a WAITING
// LibraryChange carrying the batch id and the item id, so a second person still approves every new library item (BR-7).
// The free-add scan (tests/check_s6_p149.ts) refuses a library .create anywhere else.
import { HttpStatus } from "@nestjs/common";
import { proposeConditionChange } from "./question-condition.ts";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma, ProposalItem as Row } from "@prisma/client";
import { ProposalItem, ProposalPayload, type ProposalKind } from "../../contracts/proposal-item.ts";
import { normalizeLabel } from "../../contracts/programs.ts";
import { subjectKindOf, VALUE_TYPE_TO_DATA_TYPE } from "../../engine/snapshot.ts";
import { fail, need, type Actor, type Audit, type Db } from "./core.ts";
import { keyFor } from "./library-changes.ts";
import { acceptPqrPick } from "./fact-sources.ts";
import { LibrarySources } from "./library-sources.ts";

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

/** The words a person reads for an item: its name, never an answer list's code list or hash (C3.4 review Minor 5). */
export function nameOf(p: ProposalPayload, given: string): string {
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
    return rows.find((r) => listIdentity(r.values.map((v) => v.valueKey)) === want)?.answerListKey ?? null;
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
    case "answer_list": return !!(await db.answerList.findFirst({ where: { workspaceId, answerListKey: key, status: live }, select: { id: true } }));
    case "document_type": return !!(await db.documentType.findFirst({ where: { workspaceId, documentTypeKey: key, status: live }, select: { id: true } }));
    case "person_role": return !!(await db.personRole.findFirst({ where: { workspaceId, roleKey: key, retiredAt: null }, select: { id: true } }));
    default: return false;
  }
}

const plainIssues = (e: { issues: { path: PropertyKey[]; message: string }[] }) => e.issues.slice(0, 3).map((i) => `${i.path.join(".") || "item"}: ${i.message}`).join("; ");

/** The one door: parses each item against contract v2, checks its identity, and writes them together (all or none).
 *  Refused: a malformed item (400), two items of one batch with the same identity, or a new library item that already
 *  exists in the library (409: reuse it instead). A waiting item of another run is caught again at approval. */
/** C11.13 (P-120 "with where used"): the combinations a library item is used in, in words, for a duplicate refusal.
 *  The same answer as Library › Where used (LibrarySources.usedIn reads only the database). */
export async function whereUsedWords(db: Client, workspaceId: string, kind: string, key: string): Promise<string> {
  const k = (["field", "section", "document_type", "answer_list"] as const).find((x) => x === kind);
  if (!k) return "";
  const used = (await new LibrarySources(db as unknown as Db, undefined as never, undefined as never).usedIn(k, workspaceId)).get(key) ?? [];
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
/** C3.6: a field's answer values as an answer list: the live list with the same codes, else a new draft one waiting. */
async function landValues(tx: Tx, l: Landing, label: string, values: { code: string; label: string }[]): Promise<string> {
  const want = listIdentity(values.map((v) => v.code));
  const rows = await tx.answerList.findMany({ where: { workspaceId: l.ws, status: { in: ["DRAFT", "PUBLISHED"] } }, include: { values: { select: { valueKey: true } } } });
  const same = rows.find((x) => listIdentity(x.values.map((v) => v.valueKey)) === want);
  if (same) return same.answerListKey;
  const used = new Set((await tx.answerList.findMany({ where: { workspaceId: l.ws }, select: { answerListKey: true } })).map((x) => `x.${x.answerListKey}`));
  const key = slugKey(`${label} answers`, used);
  await tx.answerList.create({ data: { workspaceId: l.ws, answerListKey: key, version: 1, status: "DRAFT", label: `${label}: answers`, origin: "AI_PROPOSAL", updatedBy: l.actor.id,
    values: { create: values.map((v, i) => ({ valueKey: v.code, label: v.label, sortOrder: i + 1 })) } } });
  await waitingAdd(tx, l, "answer_list", key, `${label}: answers`);
  return key;
}

export async function landField(tx: Tx, l: Landing, f: { key: string; meaning: string; valueType: string; label?: string | null; answerListKey?: string | null; sourceRef: string }) {
  const made = await tx.canonicalField.create({ data: { workspaceId: l.ws, canonicalFieldKey: f.key, version: 1, status: "DRAFT", meaning: f.meaning, valueType: f.valueType, dataType: (VALUE_TYPE_TO_DATA_TYPE as Record<string, string>)[f.valueType] ?? "STRING",
    scope: f.key.startsWith("case.") ? "CASE_LEVEL" : "CLIENT_LEVEL", subjectKind: subjectKindOf(f.key), origin: "AI_PROPOSAL", sourceRef: f.sourceRef, updatedBy: l.actor.id,
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
    const rule = (r.source as { rule?: { key: string; sentence: string } | null } | null)?.rule;
    if (typeof ruleFact === "string" && used.has(ruleFact)) {
      const retired = await tx.canonicalField.findFirst({ where: { workspaceId: l.ws, canonicalFieldKey: ruleFact, status: "RETIRED", mergedIntoKey: null }, select: { id: true } });
      fail(retired ? `${ruleFact} is a retired library field: reject this one and restore it in Library › Fields.` : `${ruleFact} is already in the library (added since it was proposed): reject this one; the rule can use it as it is.`, HttpStatus.CONFLICT);
    }
    const key = typeof ruleFact === "string" ? ruleFact : keyFor(f.subject ?? "case", f.label, used);
    // C3.6 (Lead, 2 Nov): a choice fact's answer values land as its answer list: an identical live list is reused (the
    // identity rule: the set of codes), else a new draft list waits for the second person beside the field.
    const answerListKey = f.values?.length ? await landValues(tx, l, f.label, f.values) : null;
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
    const used = new Set((await tx.documentType.findMany({ where: { workspaceId: l.ws }, select: { documentTypeKey: true } })).map((x) => `x.${x.documentTypeKey}`));
    const key = slugKey(d.name, used);
    await tx.documentType.create({ data: { workspaceId: l.ws, documentTypeKey: key, name: d.name, category: d.category || "client", suppliesFacts: d.suppliesFacts,
      readerProfile: { readerKind: d.readerKind, identityDocument: d.identityDocument, proves: d.proves }, version: 1, status: "DRAFT", origin: "AI_PROPOSAL", updatedBy: l.actor.id } });
    await waitingAdd(tx, l, "document_type", key, d.name);
    return key;
  },
};

/** C4.7 (P-76, P-149 one door): a pre-qualification pick lands on this combination, not the library. Accept writes the
 *  tick through the same draft row and refusals as a person's tick (fact-sources.ts acceptPqrPick), inside decide's
 *  transaction; the draft row it replaced is kept in the item's work, so Undo puts it back as it was. */
async function landPqrPick(tx: Tx, r: Row, p: ProposalPayload, l: Landing): Promise<{ key: string; work: PqrWork }> {
  if (p.kind !== "pqr_pick") fail("Wrong payload.");
  // Break B5: an edit changes only a pick's reason; the question and the person it ticks are the pick itself.
  const was = r.payload as { factKey?: string; role?: string };
  if ((p as { factKey: string }).factKey !== was.factKey || (p as { role: string }).role !== was.role) fail("An edit changes only the pick's reason. To ask another question, remove this pick and tick that question on the Questionnaires tab.", HttpStatus.CONFLICT);
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
};
const stampOf = async (tx: Tx, ws: string, kind: string, key: string) => (STAMP[kind] ? JSON.stringify(await STAMP[kind](tx, ws, key)) : null);

export const UNDO_SECONDS = 10;
export const BATCH_MAX = 200;
/** Room for a batch's work inside one transaction (runtime lane, cross-lane fix, 30 Oct): the queue's transactions run a
 *  library query per item (identity check, lander, stamp), up to BATCH_MAX items or one form's whole field-map draft.
 *  Under load that passed Prisma's 5 s default and the step failed with "Transaction API error" (S7 six load, IMM 5257
 *  Schedule 1 and IMM 5707). Every queue transaction takes this option. */
export const QUEUE_TX = { timeout: 60_000, maxWait: 10_000 };
/** The field-map step's items map form fields as well, so they are decided on their form-field page (job.tsx) until
 *  that page folds into the queue with the edition drafts (1b, build-notes). A checklist draft's requirement lines
 *  (C2.6) are decided and applied together on their checklist page (job.tsx ChecklistJob), which writes them through
 *  the requirement writer with their conditions; the queue lists them with the link (#277 review M1). */
export const ON_ITS_PAGE = new Set(["field_map", "checklist_draft"]);
/** The page an ON_ITS_PAGE step is decided on, in words. */
export const PAGE_WORDS: Record<string, string> = { field_map: "form-field page, where its form fields are mapped too", checklist_draft: "checklist page, where the checklist's lines are decided and applied together" };
/** Why an item cannot be accepted with others (P-121, P-158): only Ready items, never a rules item landing on the
 *  library. null when it can. */
export function bulkWhy(r: Pick<Row, "confidence" | "origin" | "landsOn" | "step">): string | null {
  if (ON_ITS_PAGE.has(r.step)) return `It is decided on its ${(PAGE_WORDS[r.step] ?? "own page").split(",")[0]}.`;
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
    if (elsewhere) fail(`"${String((elsewhere.payload as { label?: unknown }).label ?? identityKeyOf(elsewhere.payload as ProposalPayload, elsewhere.identityKey))}" is decided on its ${PAGE_WORDS[elsewhere.step] ?? "own page"}.`, HttpStatus.CONFLICT);
    // P-121: several at once is for Ready items only, and never a rules item that adds to the library (1b).
    if (d.action === "accept" && rows.length > 1) {
      const no = rows.map((r) => [r, bulkWhy(r)] as const).filter(([, why]) => why);
      if (no.length) fail(`Only Ready items are accepted together. ${no.length === 1 ? "One item" : `${no.length} items`} cannot be: "${nameOf(no[0][0].payload as ProposalPayload, no[0][0].identityKey)}" (${no[0][1]}). Nothing was accepted.`, HttpStatus.CONFLICT);
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
      let landedAs: string | null = null, reused = false, pqr: (PqrWork & { stamp: string }) | null = null;
      let resolved: { match: string; existingKey: string | null } | null = null;
      if (d.action !== "reject") {
        if (r.landsOn === "library" && (r.reuse as { match: string }).match === "new") {
          const twin = await sameInLibrary(tx, workspaceId, payload);
          if (twin) fail(`"${nameOf(payload, r.identityKey)}" is already in the library as ${twin} (added since it was proposed): reject this one, or reuse that item.`, HttpStatus.CONFLICT);
        }
        const reuse = r.reuse as { match: string; existingKey: string | null };
        // P-120: a reuse adds nothing to the library; it records the existing item it uses, if that is still there.
        // C11.13 (review M1–M2): a twin drafted for another edition reuses the item its first copy added; when that one
        // is not in the library (waiting, rejected or undone), the twin adds it itself, unless the library already has it.
        if (r.landsOn === "library" && reuse.match === "reuse" && !reuse.existingKey && r.relatesTo && (r.work as { twinOf?: string } | null)?.twinOf) {
          const first = await tx.proposalItem.findUnique({ where: { id: r.relatesTo }, select: { status: true, decidedKey: true } });
          const key = first?.decidedKey && ["accepted", "edited"].includes(first.status) && (await usableInLibrary(tx, workspaceId, r.kind, first.decidedKey)) ? first.decidedKey : await sameInLibrary(tx, workspaceId, payload);
          resolved = key ? { match: "reuse", existingKey: key } : { match: "new", existingKey: null };
          reuse.match = resolved.match; reuse.existingKey = resolved.existingKey;
        }
        if (r.landsOn === "library" && reuse.match === "reuse" && d.action === "accept") {
          if (!(await usableInLibrary(tx, workspaceId, r.kind, reuse.existingKey))) fail(`"${nameOf(payload, r.identityKey)}" reuses ${reuse.existingKey ?? "no item"}, which is not in the library (retired, merged or never added): reject this proposal, or edit it into a new item.`, HttpStatus.CONFLICT);
          landedAs = reuse.existingKey; reused = true;
        } else if (r.kind === "pqr_pick") {
          const got = await landPqrPick(tx, r, payload, { ws: workspaceId, actor, batchId, itemId: r.id, reason: reason ?? r.reason });
          landedAs = got.key; pqr = { ...got.work, stamp: JSON.stringify(await pqrStamp(tx, r.combinationId, got.key)) };
        } else {
          const land = LANDERS[r.kind as ProposalKind];
          if (!land) fail(`A ${r.kind.replace(/_/g, " ")} proposal is accepted with its own step, not yet on this queue.`, HttpStatus.CONFLICT);
          landedAs = await land!(tx, r, payload, { ws: workspaceId, actor, batchId, itemId: r.id, reason: withNearReason(reason ?? r.reason, r.identity), proposedBy: actor.id, combinationId: r.combinationId, sourceJobId: r.runId });
        }
      }
      // What a library lander wrote, as it stands now: Undo refuses once it has changed (PR #96 review (1)).
      const landedStamp = landedAs && !reused ?await stampOf(tx, workspaceId, r.kind, landedAs) : null;
      const work = { ...((r.work ?? {}) as object), ...(d.action === "edit" ? { beforeEdit: r.payload } : {}), ...(landedStamp ? { landedStamp } : {}), ...(pqr ? { pqr } : {}) };
      await tx.proposalItem.update({ where: { id: r.id }, data: { status: d.action === "accept" ? "accepted" : d.action === "edit" ? "edited" : "rejected", decidedBy: actor.id, decidedAt: new Date(),
        decisionReason: reason, batchId, decidedKey: landedAs, ...(resolved && d.action !== "reject" ? { reuse: resolved } : {}),
        ...(d.action === "edit" || landedStamp || pqr ? { work: work as Prisma.InputJsonValue } : {}),
        // An edit keeps the item's own reading beside it, so Undo puts the item back as it was proposed (1b).
        ...(d.action === "edit" ? { payload: payload as Prisma.InputJsonValue, identityKey: identityKeyOf(payload, r.identityKey) } : {}) } });
      out.push({ id: r.id, landedAs });
    }
    return out;
  // Review M2 (#282): a bulk accept of up to BATCH_MAX picks checks each against the combination inside this one
  // transaction; Prisma's 5 s default ended batches above about 45 picks with nothing accepted.
  }, { ...QUEUE_TX, timeout: 120_000 });
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
    // C11.13 (review M3): an item this batch added that another accepted item now reuses is not taken away under it.
    const added = rows.filter((r) => r.decidedKey && (r.reuse as { match?: string } | null)?.match !== "reuse");
    const keys = added.map((r) => r.decidedKey!);
    const users = keys.length ? await tx.proposalItem.findMany({ where: { workspaceId, status: { in: ["accepted", "edited"] }, decidedKey: { in: keys }, reuse: { path: ["match"], equals: "reuse" }, NOT: { batchId } }, select: { kind: true, decidedKey: true, formEdition: true } }) : [];
    const user = users.find((u) => added.some((r) => r.kind === u.kind && r.decidedKey === u.decidedKey));
    if (user) fail(`${user.decidedKey} is now reused by an item accepted for ${user.formEdition ?? "another source"}, so Undo would take it away under that item. Nothing was undone: undo that decision first, or retire the item in the shared library.`, HttpStatus.CONFLICT);
    // PR #96 review (1): an item edited after the accept is not erased by Undo; the library keeps the person's edit.
    for (const r of rows) {
      const { landedStamp } = (r.work ?? {}) as { landedStamp?: string };
      if (landedStamp && r.decidedKey && (await stampOf(tx, workspaceId, r.kind, r.decidedKey)) !== landedStamp)
        fail(`"${nameOf(r.payload as ProposalPayload, r.identityKey)}" was changed after it was accepted, so Undo would erase that change. Nothing was undone: retire or delete it in the shared library instead.`, HttpStatus.CONFLICT);
    }
    // C4.7: an accepted pick's tick is taken back only while it is the draft the accept wrote (not changed or released
    // since); the draft it replaced comes back as it was.
    for (const r of rows) {
      const { pqr } = (r.work ?? {}) as { pqr?: PqrWork & { stamp: string } };
      if (!pqr || !r.decidedKey) continue;
      if (JSON.stringify(await pqrStamp(tx, r.combinationId, r.decidedKey)) !== pqr.stamp)
        fail(`A pre-qualification tick this decision made was changed or released after it was accepted, so Undo would erase that change. Nothing was undone: change it on the Questionnaires tab instead.`, HttpStatus.CONFLICT);
      await tx.factSource.delete({ where: { id: pqr.pqrRowId } });
      if (pqr.pqrBefore) await tx.factSource.create({ data: { ...(pqr.pqrBefore as Prisma.FactSourceUncheckedCreateInput), updatedAt: new Date(String(pqr.pqrBefore.updatedAt)) } });
    }
    for (const c of adds) await LANDED[c.kind]?.(tx, workspaceId, c.key);
    await tx.libraryChange.deleteMany({ where: { workspaceId, batchId } });
    for (const r of rows) {
      const { beforeEdit, landedStamp, pqr, ...work } = (r.work ?? {}) as { beforeEdit?: ProposalPayload; landedStamp?: string; pqr?: unknown };
      await tx.proposalItem.update({ where: { id: r.id }, data: { status: "waiting", decidedBy: null, decidedAt: null, decisionReason: null, batchId: null, decidedKey: null,
        ...((r.work as { twinOf?: string } | null)?.twinOf ? { reuse: { match: "reuse", existingKey: null } } : {}),
        ...(beforeEdit || landedStamp || pqr ? { work: work as Prisma.InputJsonValue } : {}),
        ...(beforeEdit ? { payload: beforeEdit as Prisma.InputJsonValue, identityKey: identityKeyOf(beforeEdit, r.identityKey) } : {}) } });
    }
    return rows.length;
  }, QUEUE_TX);
  await audit.log(workspaceId, actor.id, "undone", "proposals", batchId, `${actor.name} undid a decision on ${res} proposal${res === 1 ? "" : "s"}`);
  return { undone: res };
}
