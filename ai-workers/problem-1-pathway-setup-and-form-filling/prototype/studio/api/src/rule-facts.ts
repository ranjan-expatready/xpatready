// C3.6 (P-158 (5); screens/W1-shared-library/plan-p158.md §5): "Add the fact this rule needs". A condition (on a form,
// a question or a document requirement), a rule or a check may read a fact that no form asks and the library does not
// have. Such a fact is never added from nothing: a person names the rule that reads it, gives its name, meaning and
// answer type, and the rules write one `field` proposal through the one door (insertProposals). Its source is the rule
// (key and sentence), its key is the one the rule already reads (never typed), and a second person approves it like
// any library item (proposals.ts LANDERS.field). No model call, US$0. Every value stays Sample (AGENTS rule 4).
import { createHash } from "node:crypto";
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { buildSnapshot, VALUE_TYPE_TO_DATA_TYPE, type Snapshot } from "../../engine/snapshot.ts";
import { canonical } from "../../../contracts/rules.ts";
type Json = Parameters<typeof canonical>[0];
import { normalizeLabel } from "../../contracts/programs.ts";
import { actorOf, Audit, Db, fail, need, readerOf, type Actor } from "./core.ts";
import { insertProposals } from "./proposals.ts";
import { answerValues } from "./answer-values.ts";
import { keyFor, refuseTakingOverReaders } from "./library-changes.ts";
import { LibrarySources } from "./library-sources.ts";

/** A rule that reads facts: where it sits, its key there, its sentence and its condition tree. */
export type RuleRef = { kind: "form" | "question" | "requirement" | "rule" | "check"; key: string; sentence: string; tree: unknown };
const WORD: Record<RuleRef["kind"], string> = { form: "Form condition", question: "Question condition", requirement: "Document condition", rule: "Rule", check: "Check" };
/** The answer types a rule-only fact can take (the library's types; engine/snapshot.ts). */
export const RULE_FACT_TYPES = Object.keys(VALUE_TYPE_TO_DATA_TYPE);
/** A fact key as the rules write it: a subject group and a name (person.has_visa_refusal). */
const FACT_KEY = /^[a-z][a-z0-9_]*\.[a-z0-9_.]+$/;

/** Every field key a condition tree reads (the same walk as engine/validate.ts checkCondition). */
export function factsRead(tree: unknown): string[] {
  const out = new Set<string>();
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    const o = n as { field?: unknown; args?: unknown; arg?: unknown };
    if (typeof o.field === "string") out.add(o.field);
    (Array.isArray(o.args) ? o.args : []).forEach(walk); if (o.arg) walk(o.arg);
  };
  walk(tree);
  return [...out];
}

/** C3.6 (break R2-M2): the words a rule compares a fact with (eq, in, …), so a choice's values can be checked against
 *  them: a rule that tests a value the list lacks would never hold. */
export function valuesCompared(tree: unknown, fact: string): string[] {
  const out = new Set<string>();
  // Devin review (yellow): a value is needed only where its absence makes the test impossible: a positive eq or in, or
  // a neq under a not. A not flips the sense (contracts/rules.ts evaluate); a positive neq or a negated eq needs none.
  const walk = (n: unknown, neg: boolean) => {
    if (!n || typeof n !== "object") return;
    const o = n as { op?: unknown; field?: unknown; value?: unknown; values?: unknown; args?: unknown; arg?: unknown };
    const needs = (!neg && (o.op === "eq" || o.op === "in")) || (neg && o.op === "neq");
    if (o.field === fact && needs) for (const v of [o.value, o.values].flat()) if (typeof v === "string") out.add(v);
    const flip = o.op === "not" ? !neg : neg;
    (Array.isArray(o.args) ? o.args : []).forEach((a) => walk(a, flip)); if (o.arg) walk(o.arg, flip);
  };
  walk(tree, false);
  return [...out];
}
/** Refuses a choice whose values miss a value a rule compares the fact with; every rule of the combination that reads
 *  the fact counts, not only the one named (Devin review, red). Returns the values all those rules need. */
function ruleValuesKnown(all: RuleRef[], fact: string, values: { code: string; label: string }[] | undefined): string[] {
  const needed = [...new Set(all.flatMap((r) => valuesCompared(r.tree, fact)))];
  if (!values) return needed;
  const codes = new Set(values.map((v) => v.code));
  for (const r of all) {
    const missing = valuesCompared(r.tree, fact).filter((v) => !codes.has(v));
    if (missing.length) fail(`${r.sentence.split(":")[0]} compares ${fact} with ${missing.map((m) => `"${m}"`).join(", ")}, which is not among the answer values (${values.map((v) => v.code).join(", ")}): add it as a value, or correct the rule.`);
  }
  return needed;
}

const clip = (s: string) => (s.length > 300 ? `${s.slice(0, 297)}...` : s);
/** The combination's rules that carry a condition, with a plain sentence each (never empty: the key stands in). */
export function rulesOf(s: Snapshot): RuleRef[] {
  const say = (k: RuleRef["kind"], key: string, plain: unknown) => clip(`${WORD[k]} ${key}: ${typeof plain === "string" && plain.trim() ? plain.trim() : "no sentence yet"}`);
  const out: RuleRef[] = [];
  for (const f of s.forms) if (f.condition) out.push({ kind: "form", key: f.form_number, sentence: say("form", f.form_number, f.condition_plain), tree: f.condition });
  for (const p of s.placements) if (p.condition) out.push({ kind: "question", key: p.lineage ?? p.fact, sentence: say("question", p.fact, p.condition_plain), tree: p.condition });
  for (const d of s.document_requirements) if (d.condition) out.push({ kind: "requirement", key: d.lineage ?? d.document_type, sentence: say("requirement", d.document_type, d.condition_plain), tree: d.condition });
  for (const r of s.rules) if (r.when) out.push({ kind: "rule", key: r.id, sentence: say("rule", r.id, [r.when_plain, r.then].filter(Boolean).join(", then ")), tree: r.when });
  for (const c of s.checks) if (c.condition && typeof c.condition === "object") out.push({ kind: "check", key: c.id, sentence: say("check", c.id, c.message), tree: c.condition });
  return out;
}

/** Every rule a person can name for a new fact: the ones with a condition, plus the combination's rules without one. */
export function namedRules(s: Snapshot): RuleRef[] {
  const all = rulesOf(s);
  for (const r of s.rules) if (!all.some((x) => x.kind === "rule" && x.key === r.id)) all.push({ kind: "rule", key: r.id, sentence: clip(`Rule ${r.id}: ${[r.when_plain, r.then].filter(Boolean).join(", then ") || "no sentence yet"}`), tree: r.when ?? null });
  return all;
}

/** The facts the combination's rules read that neither the library nor a derived definition has, each with its rules.
 *  Pure: the screen's list and the add's checks use the same answer. */
export function missingRuleFacts(rules: RuleRef[], library: Set<string>, derived: Set<string>): { fact: string; rules: RuleRef[] }[] {
  const by = new Map<string, RuleRef[]>();
  for (const r of rules) for (const f of factsRead(r.tree)) if (!library.has(f) && !derived.has(f)) by.set(f, [...(by.get(f) ?? []), r]);
  return [...by].sort(([a], [b]) => a.localeCompare(b)).map(([fact, rs]) => ({ fact, rules: rs }));
}

/** C3.6 (Lead, 2 Nov; runtime-3's R3): the answer values a choice fact carries (api/src/answer-values.ts). */
export { answerValues, CHOICE_TYPES } from "./answer-values.ts";
const ValueLabels = z.array(z.string({ error: "Write each answer value as words." }).max(200, "Keep each answer value under 200 characters."), { error: "Write the answer values as a list of words, one per value." }).max(400, "At most 400 answer values.").optional();

export const AddRuleFact = z.object({
  fact: z.string({ error: "Name the fact the rule reads." }).trim().min(1, "Name the fact the rule reads.").max(120),
  rule: z.string({ error: "Name the rule that needs this fact: a fact no form asks is added only for a rule that reads it." }).trim().min(1, "Name the rule that needs this fact: a fact no form asks is added only for a rule that reads it.").max(200),
  label: z.string({ error: "Give the fact a name a person reads." }).trim().min(2, "Give the fact a name a person reads (2 characters or more).").max(120),
  meaning: z.string({ error: "Say what the fact means." }).trim().min(10, "Say what the fact means, in a sentence (10 characters or more).").max(500),
  valueType: z.enum(RULE_FACT_TYPES as [string, ...string[]], { message: `Choose the answer type: ${RULE_FACT_TYPES.join(", ")}.` }),
  values: ValueLabels,
}).strict();

/** The add by a rule's key (Day-0 acceptance C3.6, P-158 (5)): the person names the rule and says the fact in words;
 *  the system builds the key (subject.name), so a typed key is refused. A name close to a live field's needs a reason. */
export const FACT_SUBJECTS = ["person", "case", "application", "sponsor", "employer"] as const;
export const AddFactForRule = z.object({
  label: z.string({ error: "Give the fact a name a person reads." }).trim().min(2, "Give the fact a name a person reads (2 characters or more).").max(120),
  meaning: z.string({ error: "Say what the fact means." }).trim().min(10, "Say what the fact means, in a sentence (10 characters or more).").max(500),
  valueType: z.enum(RULE_FACT_TYPES as [string, ...string[]], { message: `Choose the answer type: ${RULE_FACT_TYPES.join(", ")}.` }),
  subject: z.enum(FACT_SUBJECTS, { message: `Say whom the fact is about: ${FACT_SUBJECTS.join(", ")}.` }).default("person"),
  values: ValueLabels,
  nearReason: z.string().trim().min(10, "Say in a sentence why it is not the same as the field it is close to (10 characters or more).").max(300).optional(),
}).strict();

/** A label's words, for the near-duplicate test (lowercase letters and digits). */
const wordsOf = (s: string) => s.normalize("NFKC").toLocaleLowerCase("en-CA").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
/** Pure: the live labels a new name is close to: one's words appear, in order, inside the other's, and they differ. */
export function nearLabels(label: string, live: string[]): string[] {
  const a = wordsOf(label).join(" ");
  const inside = (x: string, y: string) => ` ${y} `.includes(` ${x} `);
  // m1 (review c36 r2): a one-word library name ("Name", "Email") is inside too many names to count as close.
  return live.filter((l) => { const w = wordsOf(l), b = w.join(" "); return w.length > 1 && !!a && a !== b && (inside(b, a) || (wordsOf(label).length > 1 && inside(a, b))); });
}

@Injectable()
export class RuleFacts {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(LibrarySources) private readonly sources: LibrarySources) {}

  private async combination(id: string) {
    const c = await this.db.combination.findUnique({ where: { id }, select: { id: true, workspaceId: true, combinationKey: true } }).catch(() => null);
    if (!c) fail("This combination does not exist.", HttpStatus.NOT_FOUND);
    return c!;
  }

  private async state(c: { id: string; workspaceId: string }) {
    const [{ snapshot }, fields, derived, waiting] = await Promise.all([
      buildSnapshot(this.db, c.workspaceId, c.id, "draft"),
      this.db.canonicalField.findMany({ where: { workspaceId: c.workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } }),
      this.db.derivedField.findMany({ where: { workspaceId: c.workspaceId }, select: { derivedKey: true } }),
      this.db.proposalItem.findMany({ where: { workspaceId: c.workspaceId, kind: "field", status: "waiting", work: { path: ["ruleFact"], not: Prisma.AnyNull } }, select: { id: true, work: true } }), // B82: a checklist's reading proposes these too, once per library
    ]);
    const rules = rulesOf(snapshot);
    const library = new Set(fields.map((f) => f.canonicalFieldKey));
    const missing = missingRuleFacts(rules, library, new Set(derived.map((d) => d.derivedKey)));
    const waitingFor = new Map(waiting.map((w) => [String((w.work as { ruleFact?: unknown } | null)?.ruleFact ?? ""), w.id]));
    return { rules, library, missing, waitingFor };
  }

  /** The facts this combination's rules need that no form asks, with the rules that read each and any waiting proposal. */
  async list(id: string) {
    const c = await this.combination(id);
    const { missing, waitingFor } = await this.state(c);
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, c.id, "draft");
    return { facts: missing.map((m) => ({ fact: m.fact, rules: m.rules.map(({ kind, key, sentence }) => ({ kind, key, sentence })), waitingProposal: waitingFor.get(m.fact) ?? null })), types: RULE_FACT_TYPES,
      rules: namedRules(snapshot).map(({ kind, key, sentence }) => ({ kind, key, sentence })), subjects: FACT_SUBJECTS };
  }

  /** One `field` proposal for a fact a named rule reads, through the one door. */
  async add(actor: Actor, id: string, body: unknown) {
    need(actor, "author");
    const parsed = AddRuleFact.safeParse(body ?? {});
    if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Name the rule and describe the fact.");
    const b = parsed.data!;
    const values = answerValues(b.valueType, b.values);
    const c = await this.combination(id);
    const { rules, library, missing, waitingFor } = await this.state(c);
    const rule = rules.find((r) => r.key === b.rule);
    if (!rule) fail(`No condition, rule or check "${b.rule}" in this combination: a fact no form asks is added only for a rule that reads it.`);
    if (!factsRead(rule!.tree).includes(b.fact)) fail(`${rule!.sentence.split(":")[0]} does not read ${b.fact}: name the rule that needs it.`);
    const ruleValues = ruleValuesKnown(rules.filter((r) => factsRead(r.tree).includes(b.fact)), b.fact, values);
    if (library.has(b.fact)) fail(`${b.fact} is already in the library: the rule can use it as it is.`, HttpStatus.CONFLICT);
    await refuseTakingOverReaders(this.db, c.workspaceId, b.fact, c.id, b.rule); // Breaker M6 on B83
    // MA3 (review c36 r3): a retired field keeps its key, so it cannot be added again: it is restored.
    if (await this.db.canonicalField.findFirst({ where: { workspaceId: c.workspaceId, canonicalFieldKey: b.fact, status: "RETIRED", mergedIntoKey: null }, select: { id: true } }))
      fail(`${b.fact} is a retired library field: restore it in Library › Fields, and the rule can read it again.`, HttpStatus.CONFLICT);
    // m7 (review c36 r3): one waiting item per name across the workspace, as on the add by a rule's key.
    if (await this.db.proposalItem.findFirst({ where: { workspaceId: c.workspaceId, kind: "field", status: "waiting", identityKey: normalizeLabel(b.label) }, select: { id: true } }))
      fail(`A proposal to add "${b.label}" is already waiting on To review › Proposals: decide it there.`, HttpStatus.CONFLICT);
    if (!missing.some((m) => m.fact === b.fact)) fail(`${b.fact} is a derived fact, worked out from others: it is not asked.`, HttpStatus.CONFLICT);
    if (!FACT_KEY.test(b.fact)) fail(`The rule reads "${b.fact}", which is not a fact key (group.name): correct the rule first.`);
    if (waitingFor.has(b.fact)) fail(`A proposal to add ${b.fact} is already waiting on To review › Proposals: decide it there.`, HttpStatus.CONFLICT);
    const subject = b.fact.split(".")[0];
    const sha256 = createHash("sha256").update(canonical(rule!.tree as Json)).digest("hex");
    // M2 (review c36): parallel adds of one fact make one proposal. The waiting check and the write run under one lock
    // per combination and fact, so a second add waits, then sees the first and is refused (409).
    const { proposalId } = await this.db.$transaction(async (tx) => {
    // B102 (A6, review R3-M1 (b)): per workspace, as the library's fields and worked-out values are (it was per combination).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`rule-fact:${c.workspaceId}:${b.fact}`}))`;
    if (await tx.proposalItem.findFirst({ where: { workspaceId: c.workspaceId, kind: "field", status: "waiting", work: { path: ["ruleFact"], equals: b.fact } }, select: { id: true } }))
      fail(`A proposal to add ${b.fact} is already waiting on To review › Proposals: decide it there.`, HttpStatus.CONFLICT);
    // B102 (A6, break MA2): "Work it out instead" takes the same lock (api/src/worked-out.ts), so a fact is never both.
    if (await tx.derivedField.findFirst({ where: { workspaceId: c.workspaceId, derivedKey: b.fact }, select: { id: true } }))
      fail(`${b.fact} is worked out (Work it out instead), so it is not asked.`, HttpStatus.CONFLICT);
    const job = await tx.draftingJob.create({ data: { workspaceId: c.workspaceId, combinationId: c.id, kind: "rule_fact", mode: "LOCAL", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
      message: `${actor.name} named ${rule!.sentence.split(":")[0]} as needing ${b.fact}: one library proposal (rules only, no AI, US$0).`, detail: { operation: "rule_fact", rule: rule!.key, ruleKind: rule!.kind, fact: b.fact } } });
    const [proposalId] = await insertProposals(tx, c.workspaceId, [{
      kind: "field", runId: job.id, step: "rule_fact", scope: { formEdition: null, combinationId: c.id }, landsOn: "library", reuse: { match: "new", existingKey: null },
      payload: { kind: "field", label: b.label, aliases: [], meaning: b.meaning, valueType: b.valueType, subject, ...(values ? { values } : {}), formBox: null },
      source: { file: `rule ${rule!.key} (${c.combinationKey})`, sha256, edition: null, page: null, quote: rule!.sentence, quoteFound: true, rule: { key: rule!.key, sentence: rule!.sentence } },
      rounds: { draft: null, check: null },
      rules: [{ rule: "named_rule_reads_fact", passed: true, why: null }, { rule: "not_in_library", passed: true, why: null }],
      agreement: "rules_only", confidence: "check", reason: "Added for a rule, with a meaning a person wrote: a second person checks the name and meaning.",
      origin: "rules", identity: { key: normalizeLabel(b.label), near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE",
      work: { ruleFact: b.fact, ruleKind: rule!.kind, ruleValues }, // review m-r3a: re-checked at landing
    }]);
    return { proposalId };
    }, { timeout: 30_000, maxWait: 10_000 });
    await this.audit.log(c.workspaceId, actor.id, "proposed", "rule fact", b.fact, `${actor.name} proposed the fact ${b.fact} ("${b.label}") for ${rule!.sentence.split(":")[0]} (Sample; a second person approves it)`, undefined, c.id);
    return { proposalId, fact: b.fact, rule: { key: rule!.key, sentence: rule!.sentence } };
  }

  /** C3.6 (Day-0 acceptance): one `field` proposal for a new fact a named rule needs; the key is built, never typed. */
  async addForRule(actor: Actor, id: string, ruleKey: string, body: unknown) {
    if (body && typeof body === "object" && ("key" in body || "fact" in body)) fail("Name the fact in words only: the system builds its key from the subject and the name, so a typed key is not accepted.");
    const parsed = AddFactForRule.safeParse(body ?? {});
    if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Name the fact in words.");
    const b = parsed.data!;
    const values = answerValues(b.valueType, b.values);
    const c = await this.combination(id);
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, c.id, "draft");
    const rule = namedRules(snapshot).find((r) => r.key === ruleKey);
    if (!rule) fail(`No rule, check or condition "${ruleKey}" in this combination: name a rule it has.`, HttpStatus.NOT_FOUND);
    need(actor, "author");
    const fields = await this.db.canonicalField.findMany({ where: { workspaceId: c.workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true, label: true } });
    const same = fields.find((f) => f.label && normalizeLabel(f.label) === normalizeLabel(b.label));
    if (same) {
      const used = (await this.sources.usedIn("field", c.workspaceId)).get(same.canonicalFieldKey) ?? [];
      fail(`"${b.label}" is already the library field ${same.canonicalFieldKey}, used in ${used.length ? used.join(", ") : "no combination yet"}: the rule can read it as it is.`, HttpStatus.CONFLICT);
    }
    // MA1 (review c36 r2): a retired field keeps its name (canonical_field_name, per group), so the name is refused now,
    // in words, rather than at accept with the database's duplicate error.
    const retired = (await this.db.canonicalField.findMany({ where: { workspaceId: c.workspaceId, status: "RETIRED", mergedIntoKey: null, label: { not: null }, groupKey: b.subject }, select: { canonicalFieldKey: true, label: true } }))
      .find((f) => normalizeLabel(f.label!) === normalizeLabel(b.label) && !fields.some((x) => x.canonicalFieldKey === f.canonicalFieldKey));
    if (retired) fail(`"${b.label}" is the name of the retired library field ${retired.canonicalFieldKey}: restore it in Library › Fields, or choose another name.`, HttpStatus.CONFLICT);
    const near = nearLabels(b.label, fields.map((f) => f.label ?? "").filter(Boolean)).slice(0, 5);
    if (near.length && !b.nearReason) fail(`"${b.label}" is close to the library's ${near.map((n) => `"${n}"`).join(", ")}: say why it is not the same (a one-line reason the second person reads), or use the existing field.`);
    // MA1 (review c36 r2): the key shown here is a preview against every key, retired ones included; the lander builds
    // it again from the item as decided (name and subject may be edited at accept), so it never freezes.
    const all = await this.db.canonicalField.findMany({ where: { workspaceId: c.workspaceId }, select: { canonicalFieldKey: true } });
    const key = keyFor(b.subject, b.label, new Set(all.map((f) => f.canonicalFieldKey)));
    // B102 (A6, break MA3): a name whose key is a worked-out value is refused, since the lander builds the key from the
    // name again (it would land as the worked-out key: asked and worked out at once).
    if (await this.db.derivedField.findFirst({ where: { workspaceId: c.workspaceId, derivedKey: key }, select: { id: true } }))
      fail(`"${b.label}" would be added as ${key}, which is worked out (Work it out instead): the rule reads it as it is, or choose another name.`, HttpStatus.CONFLICT);
    const ruleValues = ruleValuesKnown(namedRules(snapshot).filter((r) => factsRead(r.tree).includes(key)), key, values); // break R2-M2: rules that already read the built key
    const sha256 = createHash("sha256").update(canonical((rule!.tree ?? {}) as Json)).digest("hex");
    const name = rule!.sentence.split(":")[0];
    const { proposalId } = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`rule-fact:${c.workspaceId}:${normalizeLabel(b.label)}`}))`;
      if (await tx.proposalItem.findFirst({ where: { workspaceId: c.workspaceId, kind: "field", status: "waiting", identityKey: normalizeLabel(b.label) }, select: { id: true } }))
        fail(`A proposal to add "${b.label}" is already waiting on To review › Proposals: decide it there.`, HttpStatus.CONFLICT);
      const job = await tx.draftingJob.create({ data: { workspaceId: c.workspaceId, combinationId: c.id, kind: "rule_fact", mode: "LOCAL", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
        message: `${actor.name} named ${name} as needing "${b.label}": one library proposal (rules only, no AI, US$0).`, detail: { operation: "rule_fact", rule: rule!.key, ruleKind: rule!.kind, fact: key } } });
      const [proposalId] = await insertProposals(tx, c.workspaceId, [{
        kind: "field", runId: job.id, step: "rule_fact", scope: { formEdition: null, combinationId: c.id }, landsOn: "library", reuse: { match: "new", existingKey: null },
        payload: { kind: "field", label: b.label, aliases: [], meaning: b.meaning, valueType: b.valueType, subject: b.subject, ...(values ? { values } : {}), formBox: null },
        source: { file: `rule ${rule!.key} (${c.combinationKey})`, sha256, edition: null, page: null, quote: rule!.sentence, quoteFound: true, rule: { key: rule!.key, sentence: rule!.sentence } },
        rounds: { draft: null, check: null },
        rules: [{ rule: "named_rule_exists", passed: true, why: null }, { rule: "not_in_library", passed: true, why: null }, ...(near.length ? [{ rule: "near_duplicate_reason", passed: true, why: b.nearReason ?? null }] : [])],
        agreement: "rules_only", confidence: "check", reason: "Added for a rule, with a meaning a person wrote; not meaning-checked (P-95): a second person checks the name and meaning.",
        origin: "rules", identity: { key: normalizeLabel(b.label), near, nearReason: b.nearReason ?? null }, relatesTo: null, revision: null, basis: "SAMPLE",
        work: { forRule: rule!.key, ruleKind: rule!.kind, keyPreview: key, ruleValues },
      }]);
      return { proposalId };
    }, { timeout: 30_000, maxWait: 10_000 });
    await this.audit.log(c.workspaceId, actor.id, "proposed", "rule fact", key, `${actor.name} proposed the fact ${key} ("${b.label}") for ${name} (Sample; not meaning-checked; a second person approves it)`, undefined, c.id);
    return { proposalId, key, keyIsPreview: true, meaningChecked: false, rule: { key: rule!.key, sentence: rule!.sentence } };
  }
}

@Controller("api")
export class RuleFactsController {
  constructor(@Inject(RuleFacts) private readonly r: RuleFacts) {}
  @Get("combinations/:id/rule-facts") list(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { readerOf(a); return this.r.list(id); }
  @Post("combinations/:id/rules/:key/fact") addForRule(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Param("key") key: string, @Body() b: unknown) { return this.r.addForRule(actorOf(a), id, key, b); }
  @Post("combinations/:id/rule-facts") add(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.r.add(actorOf(a), id, b); }
}
