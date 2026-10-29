// PROPOSAL (W1-10 challenge A3, Lead Q-L2, 29 Oct): the one review-queue item contract every AI or rules producer writes
// into S6's queue: S6's library drafts (fields, answer lists, sections, document types, form checks, person roles) and
// W1-10's per-combination drafts (conditions, requirement lines, cross-answer checks, where a fact comes from, PQR picks).
// Not used by any code yet: the Lead approves it with the screens lane before S6 slice 1 and W1-10 slice 2 build on it.
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
/** A condition in the condition language (engine/validate.ts checkCondition) with its plain sentence. */
const Condition = z.object({ sentence: z.string().min(3).max(300), tree: z.unknown(), sharedConditionKey: z.string().max(120).nullable() });

/** The payload of each kind: only what a person accepts; ids the server owns are never typed by a producer. */
export const ProposalPayload = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("field"), label: z.string().min(1).max(120), meaning: z.string().min(3).max(500), valueType: z.string().max(40), subject: z.string().max(60).nullable(), formBox: z.object({ form: z.string(), edition: z.string(), box: z.string() }).nullable() }),
  z.object({ kind: z.literal("answer_list"), label: z.string().min(1).max(120), choices: z.array(z.string().min(1).max(200)).min(1).max(400) }),
  z.object({ kind: z.literal("section"), label: z.string().min(1).max(120), fieldKeys: z.array(z.string().max(120)).max(400) }),
  z.object({ kind: z.literal("document_type"), name: z.string().min(1).max(120), category: z.string().max(60), suppliesFacts: z.array(z.string().max(120)).max(100), readerKind: ReaderKind, identityDocument: z.boolean() }),
  z.object({ kind: z.literal("form_check"), sentence: z.string().min(3).max(300), tree: z.unknown(), reads: z.array(z.string().max(120)).min(1).max(20) }),
  z.object({ kind: z.literal("person_role"), label: z.string().min(1).max(80), meaning: z.string().min(3).max(300), mayBeApplicant: z.boolean(), takesPartInCase: z.boolean() }),
  z.object({ kind: z.literal("condition"), target: z.object({ kind: z.enum(["question", "section", "form_line"]), key: z.string().max(120) }), roles: Roles, condition: Condition }),
  z.object({ kind: z.literal("requirement_line"), documentType: z.string().max(120), roles: Roles, always: z.boolean(), condition: Condition.nullable(), alternativeGroup: z.string().max(60).nullable() }),
  z.object({ kind: z.literal("cross_check"), sentence: z.string().min(3).max(300), tree: z.unknown(), reads: z.array(z.string().max(120)).min(2).max(20), severity: z.literal("warn") }),
  z.object({ kind: z.literal("comes_from"), factKey: z.string().max(120), role: z.string().max(60), from: z.enum(["document", "client", "agent"]), documentType: z.string().max(120).nullable() }),
  z.object({ kind: z.literal("pqr_pick"), factKey: z.string().max(120), role: z.string().max(60), reason: z.string().min(3).max(300) }),
]);
export type ProposalPayload = z.infer<typeof ProposalPayload>;

/** IRCC's line the proposal rests on (P-121): the rules find the quote in that file, or the item is dropped and listed. */
export const ProposalSource = z.object({ file: z.string().max(300), sha256: z.string().regex(/^[0-9a-f]{64}$/), edition: z.string().max(60).nullable(), page: z.number().int().positive().nullable(), quote: z.string().min(1).max(1000), quoteFound: z.boolean() });

/** One round's reading of the item (api/src/rounds.ts): a draft or the blind checker; rules-only producers have no rounds. */
export const RoundReading = z.object({ reading: z.string().max(300), payload: ProposalPayload, from: z.enum(["live", "replay"]), runFile: z.string().max(300), costUsd: z.number().min(0) });

/** The rules run on both rounds (P-121): each with its plain reason when it fails. */
export const RuleResult = z.object({ rule: z.string().max(80), passed: z.boolean(), why: z.string().max(300).nullable() });

/** engine/agreement.ts compareRounds, said per item. */
export const Agreement = z.enum(["agreed", "differ", "one_round", "rules_only"]);
/** The three words a person reads (P-123): Ready to accept · Check · Decide. Bulk accept for "ready" only (P-121). */
export const Confidence = z.enum(["ready", "check", "decide"]);

export const ProposalItem = z.object({
  id: z.string().uuid(),
  kind: z.enum(PROPOSAL_KINDS),
  /** The run and its step that produced it (AI work names it; the acceptance rate is per step, P-130 §6.3). */
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
  /** Who made it (P-149: one door): AI, the rules, or a person through the one Add (the marked exception). */
  origin: z.enum(["ai", "rules", "person"]),
  /** waiting → accepted / edited / rejected (with a reason) → undone within the batch's Undo; the second person is S6's. */
  status: z.enum(["waiting", "accepted", "edited", "rejected", "undone"]),
  decision: z.object({ by: z.string().max(60), at: z.string().datetime(), reason: z.string().max(300).nullable(), batchId: z.string().uuid().nullable() }).nullable(),
  /** Sample until the immigration expert confirms (AGENTS rule 4). */
  basis: z.enum(["SAMPLE", "EXPERT"]),
}).strict();
export type ProposalItem = z.infer<typeof ProposalItem>;
