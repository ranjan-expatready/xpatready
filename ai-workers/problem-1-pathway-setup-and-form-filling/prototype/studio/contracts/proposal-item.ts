// v2.1 (P-158, Lead 29 Oct, for screens' S6 slice 1 N-1): nothing enters the library by hand, so a person's Add is gone
// (no "person" origin, no add reason); a source may name the rule that needs the fact (rule key and its sentence).
// v2 (P-149, Lead 29 Oct; screens plan-p149.md §C): a person's Add is the same item (one door), with its reason, its identity,
// what it relates to and, for an edit, the meaning-change answer. v1 approved by the Lead 29 Oct (W1-10 challenge A3, Q-L2).
// The one review-queue item contract every AI, rules or person producer writes
// into S6's queue: S6's library drafts (fields, answer lists, sections, document types, form checks, person roles) and
// W1-10's per-combination drafts (conditions, requirement lines, cross-answer checks, where a fact comes from, PQR picks).
// Not used by any code yet: S6 slice 1 and W1-10 slice 2 build on it; any change goes through the Lead with the screens lane.
// Explanation and open points: product/screens/W1-ai-drafting/queue-item-contract.md. STANDARDS §6: contract first, zod.
// Every value a producer proposes is Sample until the immigration expert confirms it (AGENTS rule 4).
import { z } from "zod";

/** What is proposed. S6 drafts the library kinds when a form enters (on a click, P-138); W1-10 the combination kinds. */
export const PROPOSAL_KINDS = ["field", "answer_list", "section", "document_type", "form_check", "person_role", "condition", "requirement_line", "cross_check", "comes_from", "pqr_pick"] as const;
export type ProposalKind = (typeof PROPOSAL_KINDS)[number];

/** Where an accepted item lands: the shared library (every combination that uses it; a second person) or this combination. */
export const LandsOn = z.enum(["library", "combination"]);
/** How a document type is read (P-133, P-134). AI vision is never the reader of an identity document. */
export const ReaderKind = z.enum(["coded_lines", "printed_layout", "letter_or_record", "person_only"]);
/** The person roles of "Who can be in this application" (P-119), by key (S5's PersonRole). */
const Roles = z.array(z.string().min(1).max(60)).min(1).max(20);
/** P-149 (5): a worked example of a rule: a sample family's facts (field key → value) and the outcome the rule must give.
 *  AI drafts two or three per rule; the immigration expert (duty sme) confirms them; until then confirmedBy is null. */
export const ExampleCase = z.object({ facts: z.record(z.string().max(120), z.unknown()), expected: z.boolean(), confirmedBy: z.string().max(60).nullable() }).strict();
const Examples = z.array(ExampleCase).max(5);
/** A condition in the condition language (engine/validate.ts checkCondition) with its plain sentence and example cases. */
const Condition = z.object({ sentence: z.string().min(3).max(300), tree: z.unknown(), sharedConditionKey: z.string().max(120).nullable(), examples: Examples });
/** Other names the same item goes by (P-149 (2): a field or section is the same when its name or a synonym matches). */
const Aliases = z.array(z.string().min(1).max(120)).max(20);

/** The payload of each kind: only what a person accepts; ids the server owns are never typed by a producer. */
export const ProposalPayload = z.discriminatedUnion("kind", [
  /** C3.6 (Lead, 2 Nov): a choice fact may carry its answer values; on accept they land as its answer list. */
  z.object({ kind: z.literal("field"), label: z.string().min(1).max(120), aliases: Aliases, meaning: z.string().min(3).max(500), valueType: z.string().max(40), subject: z.string().max(60).nullable(), values: z.array(z.object({ code: z.string().regex(/^[a-z][a-z0-9_]{0,60}$/), label: z.string().min(1).max(200) }).strict()).min(2).max(400).optional(), formBox: z.object({ form: z.string(), edition: z.string(), box: z.string() }).nullable() }),
  /** Identity (Lead, 29 Oct): the set of value codes, order ignored. */
  z.object({ kind: z.literal("answer_list"), label: z.string().min(1).max(120), values: z.array(z.object({ code: z.string().regex(/^[a-z][a-z0-9_]{0,60}$/), label: z.string().min(1).max(200) }).strict()).min(1).max(400) }),
  /** Identity (Lead, 29 Oct): the name or a synonym. */
  z.object({ kind: z.literal("section"), label: z.string().min(1).max(120), aliases: Aliases, fieldKeys: z.array(z.string().max(120)).max(400) }),
  /** Identity (P-149 (2)): the name and what it proves. */
  z.object({ kind: z.literal("document_type"), name: z.string().min(1).max(120), proves: z.string().min(3).max(200), category: z.string().max(60), suppliesFacts: z.array(z.string().max(120)).max(100), readerKind: ReaderKind, identityDocument: z.boolean() }),
  /** QA-196 (tech lead, 4 Nov): severity is what a person chose before Accept (an edit): "block" is a serious warning
   *  (Library › Checks; checks warn, P-136); none means it warns. A cross-answer check below only warns. */
  z.object({ kind: z.literal("form_check"), sentence: z.string().min(3).max(300), tree: z.unknown(), reads: z.array(z.string().max(120)).min(1).max(20), examples: Examples, severity: z.enum(["block", "warn"]).optional() }),
  z.object({ kind: z.literal("person_role"), label: z.string().min(1).max(80), meaning: z.string().min(3).max(300), mayBeApplicant: z.boolean(), takesPartInCase: z.boolean() }),
  z.object({ kind: z.literal("condition"), target: z.object({ kind: z.enum(["question", "section", "form_line"]), key: z.string().max(120) }), roles: Roles, condition: Condition }),
  z.object({ kind: z.literal("requirement_line"), documentType: z.string().max(120), roles: Roles, always: z.boolean(), condition: Condition.nullable(), alternativeGroup: z.string().max(60).nullable() }),
  z.object({ kind: z.literal("cross_check"), sentence: z.string().min(3).max(300), tree: z.unknown(), reads: z.array(z.string().max(120)).min(2).max(20), severity: z.literal("warn"), examples: Examples }),
  /** Where a fact comes from (P-130; P-154 words: Document · Client · Case officer; "agent" is retired). */
  z.object({ kind: z.literal("comes_from"), factKey: z.string().max(120), role: z.string().max(60), from: z.enum(["document", "client", "case_officer"]), documentType: z.string().max(120).nullable() }),
  z.object({ kind: z.literal("pqr_pick"), factKey: z.string().max(120), role: z.string().max(60), reason: z.string().min(3).max(300) }),
]);
export type ProposalPayload = z.infer<typeof ProposalPayload>;

/** IRCC's line the proposal rests on (P-121): the rules find the quote in that file, or the item is dropped and listed. */
/** P-158 (5): when a rule needs the fact, the rule it rests on (its key and its sentence), beside the file and quote. */
export const RuleReference = z.object({ key: z.string().min(1).max(120), sentence: z.string().min(3).max(300) }).strict();
export const ProposalSource = z.object({ file: z.string().max(300), sha256: z.string().regex(/^[0-9a-f]{64}$/), edition: z.string().max(60).nullable(), page: z.number().int().positive().nullable(), quote: z.string().min(1).max(1000), quoteFound: z.boolean(), rule: RuleReference.nullable() });

/** One round's reading of the item (api/src/rounds.ts): a draft or the blind checker; rules-only producers have no rounds. */
export const RoundReading = z.object({ reading: z.string().max(300), payload: ProposalPayload, from: z.enum(["live", "replay"]), runFile: z.string().max(300), costUsd: z.number().min(0) });

/** The rules run on both rounds (P-121): each with its plain reason when it fails. */
export const RuleResult = z.object({ rule: z.string().max(80), passed: z.boolean(), why: z.string().max(300).nullable() });

/** P-149 (2): the item's identity key under its kind's rule, and the existing items it nearly matches (a rules shortlist).
 *  An exact duplicate never becomes an item (refused at write and again at approval); a near one needs a reason. */
export const Identity = z.object({ key: z.string().min(1).max(300), near: z.array(z.string().max(120)).max(10), nearReason: z.string().min(3).max(300).nullable() }).strict();
/** P-149 (4): an edit of an approved item: which item and version it changes, and the answer to "Does this change the meaning,
 *  answer type or allowed values?". `forced` is the server's: a changed answer type or set of values is always yes. A yes
 *  carries the line on what happens to the item's users (the second person and the expert read it). */
export const Revision = z.object({ ofKey: z.string().min(1).max(120), fromVersion: z.number().int().min(1), meaningChange: z.object({ answer: z.boolean(), forced: z.boolean(), usersLine: z.string().min(3).max(500).nullable() }).strict() }).strict();

/** engine/agreement.ts compareRounds, said per item. A person's or a rules-only item has no AI rounds: rules_only. */
export const Agreement = z.enum(["agreed", "differ", "one_round", "rules_only"]);
/** The three words a person reads (P-123): Ready to accept · Check · Decide. Bulk accept for "ready" only (P-121). */
export const Confidence = z.enum(["ready", "check", "decide"]);

export const ProposalItem = z.object({
  id: z.string().uuid(),
  kind: z.enum(PROPOSAL_KINDS),
  /** The run and its step that produced it (AI or rules work names it; the acceptance rate is per step, P-130 §6.3). */
  runId: z.string().uuid(), step: z.string().max(60),
  /** Where it was drafted: a form edition (S6, one draft per edition) or a combination (W1-10). */
  scope: z.object({ formEdition: z.string().max(60).nullable(), combinationId: z.string().uuid().nullable() }),
  landsOn: LandsOn,
  /** P-120: an existing library item it reuses (by key), or new. */
  reuse: z.object({ match: z.enum(["reuse", "new"]), existingKey: z.string().max(120).nullable() }),
  payload: ProposalPayload,
  source: ProposalSource.nullable(),
  rounds: z.object({ draft: RoundReading.nullable(), check: RoundReading.nullable() }),
  rules: z.array(RuleResult),
  agreement: Agreement,
  confidence: Confidence,
  /** Why it is Check or Decide, in plain words (both readings kept); null when Ready. */
  reason: z.string().max(500).nullable(),
  /** Who made it: AI or the rules (P-158 (1): nothing enters the library by hand). */
  origin: z.enum(["ai", "rules"]),
  identity: Identity,
  /** The item this one follows from, e.g. a placement proposed after its field (P-149 "where it applies"). */
  relatesTo: z.string().uuid().nullable(),
  /** Set when the item changes an approved one (P-149 (3), (4)); null for a new item. */
  revision: Revision.nullable(),
  /** waiting → accepted / edited / rejected (with a reason) → undone within the batch's Undo; the second person is S6's. */
  status: z.enum(["waiting", "accepted", "edited", "rejected", "undone"]),
  decision: z.object({ by: z.string().max(60), at: z.string().datetime(), reason: z.string().max(300).nullable(), batchId: z.string().uuid().nullable() }).nullable(),
  /** Sample until the immigration expert confirms (AGENTS rule 4). */
  basis: z.enum(["SAMPLE", "EXPERT"]),
}).strict().superRefine((x, ctx) => {
  const say = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  if (x.kind !== x.payload.kind) say("payload", "The payload is of another kind than the item.");
  if (x.identity.near.length && !x.identity.nearReason) say("identity", "It is close to an existing item: say why it is not the same.");
  const m = x.revision?.meaningChange;
  if (m?.forced && !m.answer) say("revision", "A changed answer type or set of values changes the meaning: the answer is yes.");
  if (m?.answer && !m.usersLine) say("revision", "Say what happens to the items that use it.");
});
export type ProposalItem = z.infer<typeof ProposalItem>;
