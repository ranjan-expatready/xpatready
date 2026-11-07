// C6.4 (tech lead on #1073, Q1 option 1): a combination's conditional document lines and the facts they read
// (samples/conditional-documents.json; Sample, cited word for word, Unconfirmed: expert; data, not code, P-319), after
// the checklist's own lines (300, 310, 320) and before the Approver approves each new document type (330). Moved here
// from demo.ts by B120's step layout (M3 fix F2 on #1073); the behaviour is the same.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STUDIO, type Actor } from "../../../core.ts";
import { keepChosenEveryones, type PlacedFromParts } from "../../../form-part-placements.ts";
import { decide } from "../../../proposals.ts";
import { RuleFacts } from "../../../rule-facts.ts";
import { Screen02 } from "../../../screen02.ts";
import { Studio } from "../../../studio.ts";
import { WorkedOut } from "../../../worked-out.ts";
import type { CheckpointContext } from "../_context.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";
import { factsOf } from "./_facts-asked.ts";
import { placed } from "./_placed.ts";

/** Conditional document lines per combination, with the facts their conditions read. */
export const CONDITIONAL_DOCUMENTS = join(STUDIO, "samples", "conditional-documents.json");
/** B102 (A6): a fact a line reads that is worked out from library dates (WorkedOut, "Work it out instead"), and the date
 *  about the case it is worked out on, added through C3.6's door when the library lacks it. */
type WorkedOutSpec = { fact: string; calculation: string; from: string; on: { fact: string; label: string; meaning: string; question: string; beside: string[]; nearReason?: string } };
type ConditionalDocuments = { lines: { type: string; who: string; condition: unknown; conditionPlain: string; sourceQuote: string; sourceFile: string }[]; facts: { fact: string; label: string; meaning: string; values: string[]; question: string; beside: string[] }[]; worked_out?: WorkedOutSpec[] };

/** Each line on Documents as the author (Configuration › Documents); a type the library lacks waits as a proposal the
 *  content reviewer accepts (C3.6). Then each fact a line reads is added for that line's rule with its answer values
 *  (Questionnaires › "Facts a rule needs"), accepted by the content reviewer and approved into the library by the Approver,
 *  and asked per person beside the fact it is about (Library › Fields › placement), as acceptance/lib/setup_vv_m3.ts S6
 *  and S6a do by route. A step a rule refuses is named in `refused`, never dropped. Returns how many lines went in and the
 *  lines that wait for their facts, each named. A waiting line is not a refusal (#1073 after B120, the tech lead on CI at
 *  ad82c03ec): it waits by design for a fact a later row adds (the minor's lines read `person.age_years`, row B102), so
 *  it is named in the load's log, never on row 7, which is partial only while something is refused or a section waits
 *  for a name (C10.1, QA-206, B78). */
async function conditionalDocumentLines(ctx: CheckpointContext, author: Actor, reviewer: Actor, approver: Actor, workspaceId: string, combinationId: string, spec: ConditionalDocuments, parts: PlacedFromParts, placedFacts: string[], refused: string[], say: (e: unknown) => string) {
  const db = ctx.db, studio = ctx.get(Studio), ruleFacts = ctx.get(RuleFacts), library = ctx.get(Screen02);
  type Save = Parameters<Studio["saveRequirement"]>[3];
  let n = 0;
  // A line goes in only when each fact its condition reads is in the library, is a calculated fact, or is one this step
  // adds; otherwise the release would be refused ("reads …, which is not in the library"), so the line waits and is named.
  const known = new Set([...(await db.canonicalField.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } })).map((f) => f.canonicalFieldKey),
    ...(await db.derivedField.findMany({ where: { workspaceId }, select: { derivedKey: true } })).map((d) => d.derivedKey), ...spec.facts.map((f) => f.fact), ...(spec.worked_out ?? []).map((w) => w.fact)]);
  const waiting: string[] = [];
  for (const l of spec.lines) {
    const missing = [...factsOf(l.condition)].filter((f) => !known.has(f));
    if (missing.length) { waiting.push(`${l.type} (its condition reads ${missing.join(", ")}, which this library neither holds nor calculates)`); continue; }
    const line = { attachMode: "ANSWER_CONDITIONAL" as const, appliesToRoles: l.who, providedBy: "client", condition: l.condition, conditionPlain: l.conditionPlain, sourceQuote: l.sourceQuote, sourceFile: l.sourceFile };
    try {
      const r = (await studio.saveRequirement(author, combinationId, null, { ...line, documentTypeName: l.type } as Save)) as { proposalId?: string } | null;
      if (r && r.proposalId) {
        const key = ((await decide(db, ctx.audit, reviewer, workspaceId, [r.proposalId], { action: "accept", reason: "Accepted by the sample loader: a document line the official words call for, cited (Sample, Unconfirmed: expert; C6.4)." })).items[0] as { landedAs?: string } | undefined)?.landedAs;
        if (!key) { refused.push(`${l.type}: its document type was not accepted`); continue; }
        await studio.saveRequirement(author, combinationId, null, { ...line, documentTypeKey: key } as Save);
      }
      n++;
    } catch (e) { refused.push(`${l.type}: ${say(e)}`); }
  }
  if (!n) return { n, waiting }; // no line reads the facts, so they are not added (C3.6 adds a fact only for a rule that reads it)
  const needed = (await ruleFacts.list(combinationId)).facts;
  for (const f of spec.facts) {
    try {
      if (!(await db.canonicalField.count({ where: { workspaceId, canonicalFieldKey: f.fact, status: { in: ["DRAFT", "PUBLISHED"] } } }))) {
        const rule = needed.find((x) => x.fact === f.fact)?.rules[0]?.key;
        if (!rule) { refused.push(`${f.fact}: no rule on this combination reads it, so it is not added`); continue; }
        const { proposalId } = await ruleFacts.add(author, combinationId, { fact: f.fact, rule, label: f.label, meaning: f.meaning, valueType: "code", values: f.values });
        await decide(db, ctx.audit, reviewer, workspaceId, [proposalId], { action: "accept", reason: "Accepted by the sample loader: the fact a document line reads, with its answer values (Sample; C6.4)." });
        for (const ch of await db.libraryChange.findMany({ where: { workspaceId, status: "WAITING", kind: "field", key: f.fact }, select: { id: true } }))
          await library.decideLibraryChange(approver, ch.id, "approve", "Approved by the sample loader as the second person (C6.4, a fact a document line reads).");
      }
      // A fact another combination asked already keeps its one placement (QA-227: the library's questions are shared).
      if (await db.sectionQuestion.count({ where: { workspaceId, canonicalFieldKey: f.fact, status: { not: "RETIRED" } } })) continue;
      const near = await db.sectionQuestion.findMany({ where: { workspaceId, canonicalFieldKey: { in: f.beside } }, select: { canonicalFieldKey: true, sectionKey: true } });
      const beside = f.beside.map((k) => near.find((x) => x.canonicalFieldKey === k)).find(Boolean);
      if (!beside) { refused.push(`${f.fact}: none of ${f.beside.join(", ")} is asked in a section`); continue; }
      await studio.placeField(author, f.fact, { sectionKey: beside.sectionKey, collectedFrom: "client_questionnaire", repeats: "per_person", tier: "case", questionText: f.question });
      placedFacts.push(f.fact);
      await keepChosenEveryones(db, studio, author, combinationId, new Set([beside.sectionKey]), parts);
    } catch (e) { refused.push(`${f.fact}: ${say(e)}`); }
  }
  for (const w of spec.worked_out ?? []) await workOut(ctx, author, reviewer, approver, workspaceId, combinationId, w, parts, placedFacts, refused, say);
  // A line whose fact did not reach the library (or was not worked out) is taken back, so the release is never refused
  // over it (break m6).
  const inLib = new Set([...(await db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: spec.facts.map((f) => f.fact) }, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } })).map((f) => f.canonicalFieldKey),
    ...(await db.derivedField.findMany({ where: { workspaceId }, select: { derivedKey: true } })).map((d) => d.derivedKey)]);
  const lost = [...spec.facts.map((f) => f.fact), ...(spec.worked_out ?? []).map((w) => w.fact)].filter((f) => !inLib.has(f));
  if (lost.length) {
    for (const r of await db.documentRequirement.findMany({ where: { combinationId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { lineageKey: true, predicateJson: true } })) {
      if (![...factsOf(r.predicateJson)].some((f) => lost.includes(f))) continue;
      try { await studio.saveRequirement(author, combinationId, r.lineageKey, { retire: true } as Save); n--; refused.push(`${r.lineageKey}: taken back, its condition reads ${lost.join(", ")}, which did not reach the library`); }
      catch (e) { refused.push(`${r.lineageKey}: ${say(e)}`); }
    }
  }
  return { n, waiting };
}

/** B102 (A6): the date about the case through C3.6's door when the library lacks it (Add a fact a rule needs, named by
 *  a line that reads the worked-out fact; accepted by the content reviewer, approved by the Approver), asked once per
 *  case beside a date the case already asks; then the fact worked out through the route the screen calls
 *  ("Work it out instead"). A step a rule refuses is named in `refused`, never dropped. */
async function workOut(ctx: CheckpointContext, author: Actor, reviewer: Actor, approver: Actor, workspaceId: string, combinationId: string, w: WorkedOutSpec, parts: PlacedFromParts, placedFacts: string[], refused: string[], say: (e: unknown) => string) {
  const db = ctx.db, studio = ctx.get(Studio), ruleFacts = ctx.get(RuleFacts), library = ctx.get(Screen02);
  if (await db.derivedField.count({ where: { workspaceId, derivedKey: w.fact } })) return; // another combination worked it out already
  try {
    if (!(await db.canonicalField.count({ where: { workspaceId, canonicalFieldKey: w.on.fact, status: { in: ["DRAFT", "PUBLISHED"] } } }))) {
      const rule = (await ruleFacts.list(combinationId)).facts.find((x) => x.fact === w.fact)?.rules[0]?.key;
      if (!rule) { refused.push(`${w.fact}: no rule on this combination reads it, so it is not worked out`); return; }
      const { proposalId, key } = await ruleFacts.addForRule(author, combinationId, rule, { label: w.on.label, meaning: w.on.meaning, valueType: "date", subject: w.on.fact.split(".")[0], ...(w.on.nearReason ? { nearReason: w.on.nearReason } : {}) });
      if (key !== w.on.fact) { refused.push(`${w.fact}: the date about the case would land as ${key}, not ${w.on.fact}, so it is not worked out`); return; }
      await decide(db, ctx.audit, reviewer, workspaceId, [proposalId], { action: "accept", reason: "Accepted by the sample loader: the date about the case a worked-out age is measured on (Sample; C6.4, B102)." });
      for (const ch of await db.libraryChange.findMany({ where: { workspaceId, status: "WAITING", kind: "field", key: w.on.fact }, select: { id: true } }))
        await library.decideLibraryChange(approver, ch.id, "approve", "Approved by the sample loader as the second person (C6.4, B102: the date a worked-out age is measured on).");
    }
    if (!(await db.sectionQuestion.count({ where: { workspaceId, canonicalFieldKey: w.on.fact, status: { not: "RETIRED" } } }))) {
      const near = await db.sectionQuestion.findMany({ where: { workspaceId, canonicalFieldKey: { in: w.on.beside } }, select: { canonicalFieldKey: true, sectionKey: true } });
      const beside = w.on.beside.map((k) => near.find((x) => x.canonicalFieldKey === k)).find(Boolean);
      if (!beside) { refused.push(`${w.on.fact}: none of ${w.on.beside.join(", ")} is asked in a section`); return; }
      await studio.placeField(author, w.on.fact, { sectionKey: beside.sectionKey, collectedFrom: "staff_working_view", repeats: "once_per_case", tier: "case", questionText: w.on.question });
      placedFacts.push(w.on.fact);
      await keepChosenEveryones(db, studio, author, combinationId, new Set([beside.sectionKey]), parts);
    }
    await ctx.get(WorkedOut).add(author, combinationId, w.fact, { calculation: w.calculation, from: w.from, on: w.on.fact });
  } catch (e) { refused.push(`${w.fact}: ${say(e)}`); }
}

export default {
  async run(ctx, cc) {
    if (!cc.setup) return;
    const out = formSetup(ctx);
    let conditional: ConditionalDocuments | string | undefined;
    try { conditional = (JSON.parse(readFileSync(CONDITIONAL_DOCUMENTS, "utf8")) as Record<string, ConditionalDocuments | string>)[cc.key ?? ""]; }
    catch (e) { out.refused.push(`samples/conditional-documents.json could not be read, so no conditional document line was added: ${(e as Error).message.slice(0, 200)}`); }
    if (!conditional || typeof conditional !== "object") return;
    const d = await conditionalDocumentLines(ctx, ctx.author, ctx.sme, ctx.approver, ctx.workspaceId, cc.c.id, conditional, placed(cc).p!, out.placedFacts, out.refused, ctx.said);
    out.documentLines += d.n;
    ctx.log.push(`  ${cc.key}: ${d.n} conditional document lines in, ${d.waiting.length} waiting for the facts their condition reads (samples/conditional-documents.json; Sample, Unconfirmed: expert)${d.waiting.length ? `: ${d.waiting.join("; ")}` : ""}`);
  },
} satisfies CombinationStep;
