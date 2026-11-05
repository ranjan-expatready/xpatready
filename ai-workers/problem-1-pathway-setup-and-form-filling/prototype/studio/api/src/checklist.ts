// Screen 02 slice 3, K2 (C3.4, C2.6): AI drafts document requirements (and later sections, rules and checks) from a
// combination's official checklist. Live waits for the founder's OK on its cost (challenge point 3, Lead response: IMM
// 5483, Sample estimate under US$0.50, cap US$5) and is refused with that reason. Two passes run at US$0:
//  - stub: proves the path with no network and no AI content, so it proposes nothing;
//  - replay (C2.6, F4, P-219): the newest saved real AI reading of exactly this checklist edition (same inventory text,
//    checked by checksum) is read into document requirement proposals, and the document types the library lacks, in
//    the one review queue (insertProposals, P-149). Only the lines the AI read from this checklist itself are proposed,
//    each one's quote found in the checklist's text, else dropped and listed (P-121). One AI round and no checker round,
//    so every item reads "Check" (or "Decide" where the checklist leaves it to the visa office), never "Ready".
//    Saved readings today: IMM 5488 (10-2024) and IMM 5484 (05-2026) (prototype/p2/runs/*-requirements-live-*).
//    B82 (QA-233): a line's condition may read a fact the library lacks, which release rightly refuses, so the fact its
//    condition reads is proposed with the line through the library-add step (conditionFactItems): a person accepts it and
//    a second person approves it, as for a fact added for a rule (C3.6, rule-facts.ts, proposals.ts LANDERS.field).
// Accepting a line on To review writes it as a draft document line (proposals.ts LANDERS.requirement_line, QA-157); the
// old apply door here answers 410.
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { actorOf, Audit, Db, fail, need, Workspace, type Actor } from "./core.ts";
import { Studio } from "./studio.ts";
import { identityKeyOf, insertProposals, linesOnCombination, QUEUE_TX, type NewProposal, type Work } from "./proposals.ts";
import { factsRead, RULE_FACT_TYPES, valuesCompared } from "./rule-facts.ts";
import { isChoice } from "./answer-values.ts";
import { combinationTrails } from "./where-used.ts";
import type { ProposalPayload } from "../../contracts/proposal-item.ts";

export { linesOnCombination } from "./proposals.ts";
export const CHECKLIST_KINDS = ["document_requirement", "section", "rule", "check"] as const;
export { inventoryOf, linesOf, savedReading, treeOf, wordsOf, type ReadLine, type RequirementProposal, type SavedReading } from "./saved-readings.ts";
import { linesOf, partFits, savedReading, wordsOf, type ReadLine, type RequirementProposal, type SavedFact } from "./saved-readings.ts";
import { normalizeLabel } from "../../contracts/programs.ts";
import { CODED_IDENTITY, isIdentityName, isPassportPhoto } from "../../engine/identity-documents.ts";


@Injectable()
export class Checklists {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Studio) private readonly studio: Studio) {}

  async draft(actor: Actor, attachmentId: string, body: { mode?: string }) {
    need(actor, "author");
    const a = await this.db.sourceAttachment.findUnique({ where: { id: attachmentId } }).catch(() => null);
    if (!a) fail("This source does not exist.", HttpStatus.NOT_FOUND);
    if (!a!.recognised || a!.kind !== "Document checklist") fail("Only an approved official document checklist is drafted into requirements.");
    // One open draft per checklist (break m9: twenty clicks made twenty drafts): the open one is returned.
    const mode = body?.mode ?? "stub";
    if (mode === "replay") return this.replay(actor, a!);
    if (mode !== "stub") fail("A live draft from a checklist waits for the founder's OK on its cost (Sample estimate under US$0.50, capped at US$5). Replay a saved reading, or run the stub pass to see the path.", HttpStatus.CONFLICT);
    // Looked up and created under one lock per checklist, so drafts started at the same moment share one job.
    const { job, made } = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checklist-draft:${attachmentId}`}))`;
      const open = await tx.draftingJob.findFirst({ where: { attachmentId, kind: "checklist_draft", mode: "STUB", status: "COMPLETED" }, orderBy: { startedAt: "desc" } });
      if (open) return { job: open, made: false };
      return { made: true, job: await tx.draftingJob.create({ data: { workspaceId: a!.workspaceId, combinationId: a!.combinationId, attachmentId: a!.id, kind: "checklist_draft", mode: "STUB", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
      message: `Stub pass of the checklist drafting path for ${a!.edition ?? a!.fileName}: no network, no cost, no AI content, so nothing is proposed. A live draft proposes the document requirements with the checklist's own words beside each.`,
      detail: { operation: "draft_from_checklist", source: a!.edition, kinds: CHECKLIST_KINDS } } }) };
    });
    if (!made) return job;
    await this.audit.log(a!.workspaceId, actor.id, "started", "checklist draft", a!.edition ?? a!.fileName, `${actor.name} ran the stub pass of the checklist drafting path on ${a!.edition ?? a!.fileName} (no AI, US$0)`, undefined, a!.combinationId);
    return job;
  }

  /** The saved readings this combination's checklists have (the launch panel offers Replay only where one exists). */
  async readings(combinationId: string) {
    const list = await this.db.sourceAttachment.findMany({ where: { combinationId, kind: "Document checklist", recognised: true }, select: { id: true, officialFile: true } });
    return list.map((a) => { const r = savedReading(a.officialFile); return { attachmentId: a.id, saved: !!r, runFile: r?.runFile ?? null, lines: r ? linesOf(r, a.officialFile ?? "").lines.length : 0 }; });
  }

  /** C2.6: the saved reading replayed into requirement_line proposals (US$0), written through the queue's one door
   *  (insertProposals, P-149; QA-157). One open replay per checklist: while one still has lines waiting on To review, a
   *  second click returns it (break m9), under the same per-checklist lock as the stub pass. Rules (QA-157):
   *   - a line under another program's part of the checklist (IMM 5484 page 2, the Super visa's) is not proposed here;
   *   - a line the checklist sends to the visa office ("Refer to the responsible visa office") waits as Decide, never as
   *     always needed: a person decides it, with the visa office's instructions;
   *   - a document type the library lacks is proposed to the library (P-149 (2): its name and what it proves), and an
   *     identity document is read by its coded lines, never AI vision (P-134); its line waits beside it. */
  async replay(actor: Actor, a: { id: string; workspaceId: string; combinationId: string; edition: string | null; fileName: string; officialFile: string | null }) {
    const r = savedReading(a.officialFile);
    if (!r) fail(`No saved AI reading of ${a.edition ?? a.fileName} yet, so there is nothing to replay. A live reading waits for the founder's OK on its cost (Sample estimate under US$0.50, capped at US$5); the stub pass shows the path.`, HttpStatus.CONFLICT);
    const name = a.edition ?? a.fileName, file = a.officialFile ?? a.fileName;
    const types = await this.db.documentType.findMany({ where: { workspaceId: a.workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { documentTypeKey: true, name: true } });
    const combo = await this.db.combination.findUniqueOrThrow({ where: { id: a.combinationId }, select: { label: true } });
    const trail = `${(await combinationTrails(this.db, a.workspaceId)).get(a.combinationId) ?? ""} ${combo.label}`;
    const read = linesOf(r!, name), dropped = read.dropped, have = await linesOnCombination(this.db, a.combinationId);
    const typeOf = (n: string) => types.find((t) => t.documentTypeKey === n || t.name.toLowerCase() === n.toLowerCase() || t.name.toLowerCase() === typeName(n).toLowerCase());
    const lines = read.lines.filter((l) => {
      if (l.part && !partFits(l.part, trail)) { dropped.push(`${typeName(l.document_type)} (under the checklist's "${l.part}" part, another program than ${combo.label})`); return false; }
      const t = typeOf(l.document_type); if (t && have.has(`${t.documentTypeKey}|${l.who}`)) { dropped.push(`${typeName(l.document_type)} for ${l.who.replace(/_/g, " ")} (already on this combination)`); return false; }
      return true;
    });
    const source = (quote: string) => ({ file: r!.inventory, sha256: r!.sha256, edition: a.edition, page: null, quote, quoteFound: true, rule: null });
    const quoteRule = [{ rule: "quote_in_source", passed: true, why: null }];
    const round = (reading: string, payload: ProposalPayload) => ({ draft: { reading: reading.slice(0, 300), payload, from: "replay" as const, runFile: r!.runFile, costUsd: 0 }, check: null });
    // One document type proposal per type the library lacks (the first line that names it carries its quote).
    const newTypes = new Map<string, { payload: DocTypePayload; quote: string }>();
    for (const l of lines) if (!typeOf(l.document_type) && !newTypes.has(wordsOf(l.document_type))) newTypes.set(wordsOf(l.document_type), { payload: docTypeOf(l, name), quote: l.quote });
    const typeItems = (runId: string): NewProposal[] => [...newTypes.values()].map(({ payload, quote }) => ({ kind: "document_type", runId, step: "checklist_draft", scope: { formEdition: null, combinationId: a.combinationId }, landsOn: "library",
      reuse: { match: "new", existingKey: null }, payload, source: source(quote), rounds: round(`${payload.name}: ${payload.proves}`, payload), rules: quoteRule, agreement: "one_round", confidence: "check",
      reason: `Not in the shared library yet: ${name} asks for it. One AI round, so check its name and what it proves; a second person approves it once accepted.${payload.identityDocument ? " An identity document: read by its machine-readable (coded) lines, never by AI vision." : ""}`.slice(0, 500),
      origin: "ai", identity: { key: identityKeyOf(payload, ""), near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE" }));
    const lineItems = (runId: string, typeIds: Map<string, string>): (NewProposal & Work)[] => lines.map((l) => {
      const key = `requirement_line:${a.combinationId}:${wordsOf(l.document_type)}:${l.who}`.slice(0, 300);
      const match = typeOf(l.document_type);
      const legacy: RequirementProposal = { document_type: l.document_type, who: l.who, base_or_conditional: l.base_or_conditional, condition_plain: l.condition_plain, condition_tree: l.condition_tree, provided_by: l.provided_by };
      const payload = { kind: "requirement_line" as const, documentType: match?.documentTypeKey ?? l.document_type, roles: [l.who], always: l.base_or_conditional === "base", condition: l.condition_plain ? { sentence: l.condition_plain, tree: l.condition_tree ?? null, sharedConditionKey: null, examples: [] } : null, alternativeGroup: null };
      const reading = `${typeName(l.document_type)}: ${l.office ? "the visa office decides" : l.condition_plain ?? "always"}, for ${l.who.replace(/_/g, " ")}`;
      const why = l.office ? `${name} says "${l.note}": the checklist does not settle when it is needed, so a person decides. ${l.condition_tree ? `Accept writes it with the AI's draft condition ("${l.condition_plain}"); if that is not right, reject it and add the line by hand on the combination's Documents.` : `It has no condition, so Accept is refused: reject it and add the line by hand on the combination's Documents, with when it is needed.`}${l.reason ? ` The AI's reading: ${l.reason}` : ""}` : l.reason;
      return { kind: "requirement_line", runId, step: "checklist_draft", scope: { formEdition: null, combinationId: a.combinationId }, landsOn: "combination",
        reuse: { match: match ? "reuse" : "new", existingKey: match?.documentTypeKey ?? null }, payload, source: source(l.quote), rounds: round(reading, payload), rules: quoteRule,
        agreement: "one_round", confidence: l.office ? "decide" : "check", reason: why ? why.slice(0, 500) : null, origin: "ai", identity: { key, near: [], nearReason: null },
        relatesTo: match ? null : typeIds.get(wordsOf(l.document_type)) ?? null, revision: null, basis: "SAMPLE",
        work: { proposedKey: key, sourceQuote: l.quote, reason: l.reason ?? "", officialFile: file, providedBy: l.provided_by, label: `${typeName(l.document_type)} · ${l.who.replace(/_/g, " ")}`.slice(0, 160), legacyPayload: { ...payload, ...legacy } } };
    });
    const { job, made, proposed } = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checklist-draft:${a.id}`}))`;
      // The open replay: one whose lines still wait on To review (once every line is decided, a new replay may run).
      const open = await tx.draftingJob.findFirst({ where: { attachmentId: a.id, kind: "checklist_draft", mode: "REPLAY", status: "COMPLETED", proposals: { some: { status: "waiting" } } }, orderBy: { startedAt: "desc" } });
      if (open) return { job: open, made: false, proposed: 0 };
      const job = await tx.draftingJob.create({ data: { workspaceId: a.workspaceId, combinationId: a.combinationId, attachmentId: a.id, kind: "checklist_draft", mode: "REPLAY", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
        message: "", detail: { operation: "draft_from_checklist", source: a.edition, kinds: CHECKLIST_KINDS, runFile: r!.runFile } } });
      const ids = await insertProposals(tx, a.workspaceId, typeItems(job.id));
      const typeIds = new Map([...newTypes.keys()].map((k, i) => [k, ids[i]] as [string, string]));
      // B82: read under the door's lock, so two checklists read at once propose one fact once.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`proposal-door:${a.workspaceId}`}))`;
      const facts = conditionFacts(lines, r!.facts, await factsKnown(tx, a.workspaceId));
      await insertProposals(tx, a.workspaceId, facts.propose.map((f) => factItem(f, job.id, a.combinationId, r!.runFile, source(f.lines[0].quote), name)));
      await insertProposals(tx, a.workspaceId, lineItems(job.id, typeIds));
      const office = lines.filter((l) => l.office).length;
      const message = `Replayed the saved AI reading of ${name} (US$0): ${lines.length} document requirement${lines.length === 1 ? "" : "s"} proposed with the checklist's own words beside each${newTypes.size ? `, and ${newTypes.size} document type${newTypes.size === 1 ? "" : "s"} the shared library lacks` : ""}${facts.propose.length ? `, and ${facts.propose.length} fact${facts.propose.length === 1 ? "" : "s"} their conditions read that the library lacks` : ""}${facts.held.length ? `; ${facts.held.length} fact${facts.held.length === 1 ? "" : "s"} not proposed: ${facts.held.join("; ")}` : ""}${dropped.length ? `; ${dropped.length} left out by the rules: ${dropped.join("; ")}` : ""}. They are decided one by one on To review. One AI round, no checker round yet, so each one reads Check${office ? `, and the ${office} the checklist leaves to the visa office read Decide` : ""}. Every value is Sample until the immigration expert confirms it.`;
      const done = await tx.draftingJob.update({ where: { id: job.id }, data: { message, detail: { operation: "draft_from_checklist", source: a.edition, kinds: CHECKLIST_KINDS, runFile: r!.runFile, proposed: lines.length, types: newTypes.size, facts: facts.propose.map((f) => f.fact), factsHeld: facts.held, dropped } } });
      return { job: done, made: true, proposed: lines.length };
    }, QUEUE_TX);
    if (made) await this.audit.log(a.workspaceId, actor.id, "started", "checklist draft", name, `${actor.name} replayed the saved AI reading of ${name}: ${proposed} document requirements proposed${newTypes.size ? `, ${newTypes.size} new document types` : ""}${dropped.length ? `, ${dropped.length} left out` : ""} (US$0)`, undefined, a.combinationId);
    return job;
  }

  /** The old door (P-149 one door; QA-157): a checklist draft was once applied here, straight to the draft. Its lines are
   *  now decided one by one on To review, whose lander writes each through the same rules; this answers 410 and writes
   *  nothing. A field-map draft is not a checklist draft (404, as before). */
  async apply(actor: Actor, jobId: string) {
    need(actor, "author");
    const job = await this.db.draftingJob.findUnique({ where: { id: jobId }, select: { kind: true, combinationId: true } }).catch(() => null);
    if (!job || job.kind !== "checklist_draft") fail("This is not a checklist draft.", HttpStatus.NOT_FOUND);
    fail(`A checklist's document lines are decided one by one on the review queue now (To review › ${job!.combinationId ? "this combination" : "its group"}), where accepting one writes it to the draft. Nothing was written here.`, HttpStatus.GONE);
  }
}

type DocTypePayload = Extract<ProposalPayload, { kind: "document_type" }>;
type FieldPayload = Extract<ProposalPayload, { kind: "field" }>;
/** What the library and the queue already hold, by fact key and by name. */
type FactsKnown = { live: Set<string>; retired: Set<string>; named: Map<string, string>; retiredNames?: Map<string, string>; waitingKeys: Set<string>; waitingNames: Set<string> };
/** One fact a checklist's lines read and the library lacks. */
export type ConditionFact = { fact: string; lines: ReadLine[]; label: string; meaning: string; valueType: string; compared: string[]; defined: SavedFact | null };
/** A fact key as the rules write it (rule-facts.ts). */
const FACT_KEY = /^[a-z][a-z0-9_]*\.[a-z0-9_.]+$/;
/** An answer value's code, as the queue's contract takes it. */
const VALUE_CODE = /^[a-z][a-z0-9_]{0,60}$/;

async function factsKnown(tx: Parameters<typeof insertProposals>[0], ws: string): Promise<FactsKnown> {
  const [fields, derived, waiting] = await Promise.all([
    tx.canonicalField.findMany({ where: { workspaceId: ws }, select: { canonicalFieldKey: true, label: true, aliases: true, status: true, mergedIntoKey: true } }),
    tx.derivedField.findMany({ where: { workspaceId: ws }, select: { derivedKey: true } }),
    tx.proposalItem.findMany({ where: { workspaceId: ws, kind: "field", status: "waiting" }, select: { identityKey: true, work: true } }),
  ]);
  const usable = fields.filter((f) => f.status !== "RETIRED" && !f.mergedIntoKey);
  const gone = fields.filter((f) => f.status === "RETIRED");
  return { live: new Set([...usable.map((f) => f.canonicalFieldKey), ...derived.map((d) => d.derivedKey)]), retired: new Set(gone.map((f) => f.canonicalFieldKey)),
    retiredNames: new Map(gone.filter((f) => f.label && !f.mergedIntoKey).map((f) => [`${f.canonicalFieldKey.split(".")[0]}|${normalizeLabel(f.label!)}`, f.canonicalFieldKey])), // a retired field keeps its name in its group
    named: new Map(usable.flatMap((f) => [f.label ?? "", ...f.aliases].filter(Boolean).map((n) => [normalizeLabel(n), f.canonicalFieldKey] as [string, string]))), // as the door's sameInLibrary
    waitingKeys: new Set(waiting.map((w) => (w.work as { ruleFact?: unknown; proposedKey?: unknown } | null)).flatMap((w) => [w?.ruleFact, w?.proposedKey]).filter((k): k is string => typeof k === "string")),
    waitingNames: new Set(waiting.map((w) => w.identityKey).filter((k): k is string => !!k)) };
}

/** An answer type from how the condition tests the fact, when the reading gave none (true/false: yes or no; a date: a
 *  date; a number or an ordered test: a number; a word: a choice). */
function typeFromTests(lines: ReadLine[], fact: string): string {
  let found = "text";
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    const o = n as { field?: unknown; op?: unknown; value?: unknown; args?: unknown; arg?: unknown };
    if (o.field === fact) found = typeof o.value === "boolean" ? "yes_no" : typeof o.value === "string" && /^\d{4}-\d{2}-\d{2}/.test(o.value) ? "date" : typeof o.value === "number" || ["gt", "gte", "lt", "lte"].includes(String(o.op)) ? "number" : "code";
    (Array.isArray(o.args) ? o.args : []).forEach(walk); if (o.arg) walk(o.arg);
  };
  lines.forEach((l) => walk(l.condition_tree));
  return found;
}

/** B82 (QA-233; pure): the facts these lines' conditions read that the library lacks, one each. `propose` are proposed
 *  with the lines. `held` says, in words, each one that cannot be: release keeps refusing its line until a person settles
 *  it. A fact another proposal is already adding is neither (that proposal is the one a person decides). */
export function conditionFacts(lines: ReadLine[], defined: SavedFact[], known: FactsKnown): { propose: ConditionFact[]; held: string[] } {
  const by = new Map<string, ReadLine[]>();
  for (const l of lines) for (const f of factsRead(l.condition_tree)) by.set(f, [...(by.get(f) ?? []), l]);
  const propose: ConditionFact[] = [], held: string[] = [], names = new Set<string>();
  for (const [fact, read] of [...by].sort(([x], [y]) => x.localeCompare(y))) {
    if (known.live.has(fact) || known.waitingKeys.has(fact)) continue;
    if (!FACT_KEY.test(fact)) { held.push(`"${fact}" is not a fact key (group.name), so correct its condition`); continue; }
    if (known.retired.has(fact)) { held.push(`${fact} is a retired library field: restore it in Library › Fields`); continue; }
    const def = defined.find((d) => d.id === fact) ?? null;
    const label = typeName(fact.split(".").slice(1).join(" ")).replace(/\bus\b/gi, "US").slice(0, 120), name = normalizeLabel(label);
    const twin = known.named.get(name);
    if (twin) { held.push(`${fact} has the name of the library's ${twin}: correct the condition to read it`); continue; }
    const retiredTwin = known.retiredNames?.get(`${fact.split(".")[0]}|${name}`);
    if (retiredTwin) { held.push(`${fact} has the name of the retired library field ${retiredTwin}: restore it in Library › Fields, or correct the condition`); continue; }
    if (known.waitingNames.has(name) || names.has(name)) { held.push(`${fact}: a proposal named "${label}" is already waiting on To review, so decide that first`); continue; }
    names.add(name);
    const type = def?.valueType && RULE_FACT_TYPES.includes(def.valueType) ? def.valueType : typeFromTests(read, fact);
    const words = def?.meaning ?? read.map((l) => l.condition_plain).find((c) => c && c.length >= 10) ?? `Read by the condition of ${typeName(read[0].document_type)}.`;
    const compared = [...new Set(read.flatMap((l) => valuesCompared(l.condition_tree, fact)))];
    // No card takes answer values, so a choice is proposed only when the conditions give at least two that land as they are.
    if (isChoice(type) && (compared.length < 2 || !compared.every((v) => VALUE_CODE.test(v)))) { held.push(`${fact} is a choice whose answer values the reading does not give: accept its line, then add it with its values under Smart questionnaire › Add the fact this rule needs`); continue; }
    propose.push({ fact, lines: read, label, meaning: words.slice(0, 500), valueType: type, compared, defined: def });
  }
  return { propose, held };
}

/** One `field` proposal for a fact a line's condition reads: it keeps the key the condition reads (the lander's ruleFact),
 *  and waits as Decide when only lines the checklist leaves to the visa office read it. Sample, as every item here. */
function factItem(f: ConditionFact, runId: string, combinationId: string, runFile: string, source: NewProposal["source"], checklist: string): NewProposal & Work {
  const docs = [...new Set(f.lines.map((l) => typeName(l.document_type)))], first = f.lines[0];
  const sentence = `Document condition ${typeName(first.document_type)}: ${first.condition_plain ?? "no sentence yet"}`.slice(0, 300);
  const values = isChoice(f.valueType) ? f.compared.map((code) => ({ code, label: typeName(code) })) : undefined; // conditionFacts: two or more
  const payload: FieldPayload = { kind: "field", label: f.label, aliases: [], meaning: f.meaning, valueType: f.valueType, subject: f.fact.split(".")[0], ...(values ? { values } : {}), formBox: null };
  const why = `${docs.join(", ")} ${docs.length === 1 ? "reads" : "read"} this fact and the library lacks it, so a release would be refused. ${f.defined?.derived ? "The saved reading works it out from other facts, and no calculation here does that, so it is proposed as a fact a person answers. " : f.defined ? "" : "The saved reading does not define it, so its meaning is the condition's words. "}One AI round: check its name, meaning and answer type; a second person approves it once accepted.${isChoice(f.valueType) ? " Its answer values are only the ones the conditions test. If it needs others, reject this one, accept its line, and add the fact with all its values under Smart questionnaire › Add the fact this rule needs." : ""}`;
  const reading = `${f.label}, read by ${checklist}'s conditions: ${f.defined?.plain ?? f.meaning}`;
  return { kind: "field", runId, step: "checklist_draft", scope: { formEdition: null, combinationId }, landsOn: "library", reuse: { match: "new", existingKey: null }, payload,
    source: source ? { ...source, rule: { key: first.document_type, sentence } } : null, rounds: { draft: { reading: reading.slice(0, 300), payload, from: "replay", runFile, costUsd: 0 }, check: null },
    rules: [{ rule: "quote_in_source", passed: true, why: null }, { rule: "condition_reads_fact", passed: true, why: null }, { rule: "not_in_library", passed: true, why: null }],
    agreement: "one_round", confidence: f.lines.every((l) => l.office) ? "decide" : "check", reason: why.slice(0, 500), origin: "ai", identity: { key: normalizeLabel(f.label), near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE",
    work: { ruleFact: f.fact, ruleKind: "requirement", ruleValues: f.compared } };
}
/** "passport_information_page_copy" → "Passport information page copy" (a person reads names, never keys). */
export const typeName = (t: string) => { const w = t.replace(/[_\s]+/g, " ").trim(); return w ? (w[0].toUpperCase() + w.slice(1)).replace(/\bUs\b/, "US") : t; };
const cut = (t: string, n: number) => (t.length <= n ? t : `${t.slice(0, n - 2).trimEnd()}…"`);
/** P-134: a passport or travel document is an identity document read by its coded (machine-readable) lines. */
const IDENTITY = CODED_IDENTITY;
/** The document type a checklist line names, as a library proposal (Sample): its name, what it proves (the checklist's
 *  own words), and how it is read (P-133, P-134: identity documents by coded lines; photos by a person; else a record). */
export function docTypeOf(l: ReadLine, checklist: string): DocTypePayload {
  // The document named, never its quote: "proof of legal status… listed on your passport" is not a passport (C2.6 shots).
  // QA-195 (break B2): every identity document by the shared list is never AI-read; only a passport or travel document
  // (never a passport-size photo) is read by its coded lines, any other by a person.
  const words = l.document_type.replace(/_/g, " ");
  const coded = IDENTITY.test(words) && !isPassportPhoto(words), identity = coded || isIdentityName(words);
  const photo = /\bphoto/i.test(words); // break m2: "visa_application_photos"
  return { kind: "document_type", name: typeName(l.document_type).slice(0, 120), proves: cut(`What ${checklist} asks for: "${l.quote}"`, 200),
    category: l.provided_by === "other" ? "other" : "client", suppliesFacts: [], readerKind: coded ? "coded_lines" : identity || photo ? "person_only" : "letter_or_record", identityDocument: identity };
}

@Controller("api")
export class ChecklistsController {
  constructor(@Inject(Checklists) private readonly c: Checklists) {}
  @Post("attachments/:id/draft-checklist") draft(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.c.draft(actorOf(a), id, (b ?? {}) as { mode?: string }); }
  @Get("combinations/:id/checklist-readings") readings(@Param("id") id: string) { return this.c.readings(id); }
  @Post("jobs/:id/apply-checklist") apply(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { return this.c.apply(actorOf(a), id); }
}
