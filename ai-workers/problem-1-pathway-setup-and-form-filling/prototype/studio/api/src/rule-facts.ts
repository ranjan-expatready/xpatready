// C3.6 (P-158 (5); screens/W1-shared-library/plan-p158.md §5): "Add the fact this rule needs". A condition (on a form,
// a question or a document requirement), a rule or a check may read a fact that no form asks and the library does not
// have. Such a fact is never added from nothing: a person names the rule that reads it, gives its name, meaning and
// answer type, and the rules write one `field` proposal through the one door (insertProposals). Its source is the rule
// (key and sentence), its key is the one the rule already reads (never typed), and a second person approves it like
// any library item (proposals.ts LANDERS.field). No model call, US$0. Every value stays Sample (AGENTS rule 4).
import { createHash } from "node:crypto";
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { buildSnapshot, VALUE_TYPE_TO_DATA_TYPE, type Snapshot } from "../../engine/snapshot.ts";
import { canonical } from "../../../contracts/rules.ts";
import { normalizeLabel } from "../../contracts/programs.ts";
import { actorOf, Audit, Db, fail, need, readerOf, type Actor } from "./core.ts";
import { insertProposals } from "./proposals.ts";

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
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (typeof n.field === "string") out.add(n.field);
    (Array.isArray(n.args) ? n.args : []).forEach(walk); if (n.arg) walk(n.arg);
  };
  walk(tree);
  return [...out];
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

/** The facts the combination's rules read that neither the library nor a derived definition has, each with its rules.
 *  Pure: the screen's list and the add's checks use the same answer. */
export function missingRuleFacts(rules: RuleRef[], library: Set<string>, derived: Set<string>): { fact: string; rules: RuleRef[] }[] {
  const by = new Map<string, RuleRef[]>();
  for (const r of rules) for (const f of factsRead(r.tree)) if (!library.has(f) && !derived.has(f)) by.set(f, [...(by.get(f) ?? []), r]);
  return [...by].sort(([a], [b]) => a.localeCompare(b)).map(([fact, rs]) => ({ fact, rules: rs }));
}

export const AddRuleFact = z.object({
  fact: z.string({ error: "Name the fact the rule reads." }).trim().min(1, "Name the fact the rule reads.").max(120),
  rule: z.string({ error: "Name the rule that needs this fact: a fact no form asks is added only for a rule (P-158)." }).trim().min(1, "Name the rule that needs this fact: a fact no form asks is added only for a rule (P-158).").max(200),
  label: z.string({ error: "Give the fact a name a person reads." }).trim().min(2, "Give the fact a name a person reads (2 characters or more).").max(120),
  meaning: z.string({ error: "Say what the fact means." }).trim().min(10, "Say what the fact means, in a sentence (10 characters or more).").max(500),
  valueType: z.enum(RULE_FACT_TYPES as [string, ...string[]], { message: `Choose the answer type: ${RULE_FACT_TYPES.join(", ")}.` }),
}).strict();

@Injectable()
export class RuleFacts {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

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
      this.db.proposalItem.findMany({ where: { workspaceId: c.workspaceId, combinationId: c.id, kind: "field", status: "waiting", step: "rule_fact" }, select: { id: true, work: true } }),
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
    return { facts: missing.map((m) => ({ fact: m.fact, rules: m.rules.map(({ kind, key, sentence }) => ({ kind, key, sentence })), waitingProposal: waitingFor.get(m.fact) ?? null })), types: RULE_FACT_TYPES };
  }

  /** One `field` proposal for a fact a named rule reads, through the one door. */
  async add(actor: Actor, id: string, body: unknown) {
    need(actor, "author");
    const parsed = AddRuleFact.safeParse(body ?? {});
    if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Name the rule and describe the fact.");
    const b = parsed.data!;
    const c = await this.combination(id);
    const { rules, library, missing, waitingFor } = await this.state(c);
    const rule = rules.find((r) => r.key === b.rule);
    if (!rule) fail(`No condition, rule or check "${b.rule}" in this combination: a fact no form asks is added only for a rule that reads it (P-158).`);
    if (!factsRead(rule!.tree).includes(b.fact)) fail(`${rule!.sentence.split(":")[0]} does not read ${b.fact}: name the rule that needs it.`);
    if (library.has(b.fact)) fail(`${b.fact} is already in the library: the rule can use it as it is.`, HttpStatus.CONFLICT);
    if (!missing.some((m) => m.fact === b.fact)) fail(`${b.fact} is a derived fact, worked out from others: it is not asked.`, HttpStatus.CONFLICT);
    if (!FACT_KEY.test(b.fact)) fail(`The rule reads "${b.fact}", which is not a fact key (group.name): correct the rule first.`);
    if (waitingFor.has(b.fact)) fail(`A proposal to add ${b.fact} is already waiting on To review › Proposals: decide it there.`, HttpStatus.CONFLICT);
    const subject = b.fact.split(".")[0];
    const sha256 = createHash("sha256").update(canonical(rule!.tree as any)).digest("hex");
    const job = await this.db.draftingJob.create({ data: { workspaceId: c.workspaceId, combinationId: c.id, kind: "rule_fact", mode: "LOCAL", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
      message: `${actor.name} named ${rule!.sentence.split(":")[0]} as needing ${b.fact}: one library proposal (rules only, no AI, US$0).`, detail: { operation: "rule_fact", rule: rule!.key, ruleKind: rule!.kind, fact: b.fact } } });
    const [proposalId] = await insertProposals(this.db, c.workspaceId, [{
      kind: "field", runId: job.id, step: "rule_fact", scope: { formEdition: null, combinationId: c.id }, landsOn: "library", reuse: { match: "new", existingKey: null },
      payload: { kind: "field", label: b.label, aliases: [], meaning: b.meaning, valueType: b.valueType, subject, formBox: null },
      source: { file: `rule ${rule!.key} (${c.combinationKey})`, sha256, edition: null, page: null, quote: rule!.sentence, quoteFound: true, rule: { key: rule!.key, sentence: rule!.sentence } },
      rounds: { draft: null, check: null },
      rules: [{ rule: "named_rule_reads_fact", passed: true, why: null }, { rule: "not_in_library", passed: true, why: null }],
      agreement: "rules_only", confidence: "check", reason: "Added for a rule, with a meaning a person wrote: a second person checks the name and meaning.",
      origin: "rules", identity: { key: normalizeLabel(b.label), near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE",
      work: { ruleFact: b.fact, ruleKind: rule!.kind },
    }]);
    await this.audit.log(c.workspaceId, actor.id, "proposed", "rule fact", b.fact, `${actor.name} proposed the fact ${b.fact} ("${b.label}") for ${rule!.sentence.split(":")[0]} (Sample; a second person approves it)`, undefined, c.id);
    return { proposalId, fact: b.fact, rule: { key: rule!.key, sentence: rule!.sentence } };
  }
}

@Controller("api")
export class RuleFactsController {
  constructor(@Inject(RuleFacts) private readonly r: RuleFacts) {}
  @Get("combinations/:id/rule-facts") list(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { readerOf(a); return this.r.list(id); }
  @Post("combinations/:id/rule-facts") add(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.r.add(actorOf(a), id, b); }
}
