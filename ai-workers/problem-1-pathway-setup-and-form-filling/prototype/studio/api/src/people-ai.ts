// S5 slice 3 (runtime lane; challenge slice plan 3, P-119, P-121, P-123; Lead 28 Oct): "Who can be in this application"
// filled from the combination's IRCC guide. The guide is the one the form finder read and linked as a source
// (guide-sources.ts); its text inventory is the input. Three ways, each said with its cost before it runs:
//   rules  — words in the guide name a spouse, children, a sponsor or representative (US$0, no AI);
//   replay — the saved real answers of the two AI rounds for this exact guide and prompt (US$0);
//   live   — a draft round and an independent checker round through the guarded launcher (worst case shown first;
//            only inside the founder-approved live trials, P-110 amended).
// Every line keeps a quote that must be found in the guide text; with AI, only lines both rounds agree on are proposed,
// the rest are "to decide". Nothing is saved here: the person accepts the proposal into the editor and saves it, where
// the rules on Save apply (studio.savePeople). Which people apply is Sample until the immigration expert confirms.
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { costUsd, inputTokenBound } from "../../../p2/ledger.ts";
import { RUN_CAP_USD } from "../../../p2/policy.ts";
import { slug } from "../../engine/import.ts";
import { ProposePeopleBody, type PeoplePlan, type PeopleProposal, type ProposedPerson } from "../../contracts/workspace.ts";
import { Audit, Db, need, PROTOTYPE, SOLUTION, type Actor } from "./core.ts";
import { inventoryFor } from "./finder.ts";
import { GUIDE_SOURCE_KIND } from "./guide-sources.ts";
import { Sources } from "./sources.ts";
import { Studio } from "./studio.ts";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const round2 = (n: number) => Math.round(n * 100) / 100;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
const RUNS = join(PROTOTYPE, "p2", "runs"), JOBS = join(PROTOTYPE, "p2", "jobs"), PROMPTS = join(PROTOTYPE, "p2", "prompts");
const ROUTE = "anthropic-api/aiw-d261-prototype-exception-aiw-d260", MODEL = "claude-opus-5-5";
const AI = { template: "who-can-be.v1.md", check: "who-can-be-check.v1.md", schema: "who-can-be-output.v1.schema.json", effort: "low", max_output_tokens: 3000 } as const;
const LIVE_RUN = /-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/;
const sameText = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const STEPS_AI = [
  { n: 1, label: "Read the combination's guide (rules)", uses_ai: false },
  { n: 2, label: "AI lists who the guide lets this application include", uses_ai: true },
  { n: 3, label: "A second AI round checks it without seeing the first answer", uses_ai: true },
  { n: 4, label: "Rules keep only lines whose quote is in the guide and both rounds agree on", uses_ai: false },
];
const STEPS_RULES = [{ n: 1, label: "Read the combination's guide (rules)", uses_ai: false }, { n: 2, label: "Rules find the people the guide names, each with its sentence", uses_ai: false }];

type Answer = { people: { role: string; min: number; max: number; applies: boolean; quote: string; why: string | null }[]; unresolved: { passage: string; reason: string }[] };
type Guide = { code: string; title: string; url: string; text: string; input: { file: string; sha256: string } | null; trail: string };

/** Rules only: the guide's sentences that name each kind of person (the first that also speaks of including or
 *  accompanying wins). How many is a Sample default a person sets; a sponsor or representative never applies. */
const RULES: { role: string; re: RegExp; prefer: RegExp; min: number; max: number; applies: boolean }[] = [
  { role: "spouse_or_partner", re: /\b(spouse|common-law partner)\b/i, prefer: /\b(accompan|famil|includ|travel)/i, min: 0, max: 1, applies: true },
  { role: "child", re: /\bdependent child(ren)?\b/i, prefer: /\b(accompan|famil|includ|travel)/i, min: 0, max: 4, applies: true },
  { role: "sponsor", re: /\b(your sponsor|a sponsor)\b/i, prefer: /\b(support|sponsor)/i, min: 0, max: 1, applies: false },
  { role: "representative", re: /\brepresentative\b/i, prefer: /\b(use|appoint|authoriz)/i, min: 0, max: 1, applies: false },
];
export function rulesReading(text: string): Answer {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 20 && s.length < 400);
  const principal = sentences.find((s) => /\b(you|applicant)\b/i.test(s) && /\bappl(y|ication)\b/i.test(s)) ?? sentences[0] ?? "";
  const people: Answer["people"] = principal ? [{ role: "principal", min: 1, max: 1, applies: true, quote: principal, why: "Rules: the guide is written to the person applying." }] : [];
  for (const r of RULES) {
    const hits = sentences.filter((s) => r.re.test(s));
    const quote = hits.find((s) => r.prefer.test(s)) ?? hits[0];
    if (quote) people.push({ role: r.role, min: r.min, max: r.max, applies: r.applies, quote, why: `Rules: the guide names this person; how many is a Sample default (${r.min} to ${r.max}).` });
  }
  return { people, unresolved: [] };
}

@Injectable()
export class PeopleFromGuide {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Sources) private readonly sources: Sources, @Inject(Studio) private readonly studio: Studio, @Inject(Audit) private readonly audit: Audit) {}

  /** The combination's guide: the one linked as its source (the finder read it, or Load sample linked it). */
  private async guide(combinationId: string): Promise<Guide> {
    const c = await this.db.combination.findUnique({ where: { id: combinationId } });
    if (!c) throw problem(404, "Not found", "That combination does not exist.");
    const shas = (await this.db.sourceAttachment.findMany({ where: { combinationId }, select: { sha256: true } })).map((a) => a.sha256);
    const ed = shas.length ? await this.db.formEdition.findFirst({ where: { workspaceId: c.workspaceId, sha256: { in: shas }, form: { formKind: "guide" } }, include: { form: true } }) : null;
    if (!ed?.form.formPageUrl) throw problem(409, "No guide yet", `"${c.label}" has no IRCC guide among its sources yet: finding its forms (Start setup) reads and links it. Then fill this from the guide.`);
    const input = inventoryFor(ed.form.formPageUrl);
    let text = "";
    // The official text inventory (inventoryFor: "prototype/p1/inventory/…", under the solution folder) is what AI may read.
    if (input) { try { text = String(JSON.parse(readFileSync(join(SOLUTION, input.file), "utf8")).text ?? ""); } catch { text = ""; } }
    if (!text) throw problem(409, "Guide not readable", `${ed.form.formKey}'s text is not on this computer yet, so it cannot be read here. Find the forms again to read it.`);
    return { code: ed.form.formKey, title: ed.form.displayName, url: ed.form.formPageUrl, text, input, trail: c.label };
  }

  /** The plan: the steps and the most it can cost, said before anything runs (STANDARDS: cost first). */
  async plan(combinationId: string, body: unknown): Promise<PeoplePlan> {
    const b = ProposePeopleBody.safeParse(body ?? {});
    if (!b.success) throw problem(400, "Check the request", "Choose rules only, saved AI answers or AI now.", { errors: [{ field: "mode", message: "Choose how to fill it." }] });
    const g = await this.guide(combinationId);
    const worst = b.data.mode === "live" ? round2(2 * Math.min(RUN_CAP_USD, costUsd(MODEL, inputTokenBound(g.text), AI.max_output_tokens) * 2)) : 0;
    const steps = b.data.mode === "rules" ? STEPS_RULES : STEPS_AI;
    const note = b.data.mode === "replay" ? "Uses the answers AI gave for this exact guide and prompt before (US$0); with none saved yet, it says so and nothing changes." : b.data.mode === "rules" ? "No AI: rules find the sentences that name each person. How many is a Sample default you check." : "Two AI rounds read the guide; only lines both agree on, with their sentence in the guide, are proposed.";
    const ledger = this.sources.ledger();
    return { mode: b.data.mode, guide: { code: g.code, title: g.title, url: g.url }, steps, totals: { worst_usd: worst, remaining_usd: ledger.remaining_usd }, note, plan_sha256: sha(JSON.stringify({ combinationId, mode: b.data.mode, guide: g.input?.sha256 ?? sha(g.text), worst })) };
  }

  /** Runs the plan and returns a proposal for the editor (never saved here). */
  async propose(actor: Actor, combinationId: string, body: unknown): Promise<PeopleProposal> {
    need(actor, "author");
    const plan = await this.plan(combinationId, body);
    const b = ProposePeopleBody.parse(body);
    if (b.planSha256 !== plan.plan_sha256) throw problem(409, "Look at the plan again", "The guide or the cost changed since you looked: check the plan again before it runs.", { plan });
    if (plan.mode === "live" && plan.totals.worst_usd > plan.totals.remaining_usd + 1e-9) throw problem(409, "Over the spending cap", `The worst case (US$${plan.totals.worst_usd.toFixed(2)}) is above what is left of the AI spending cap (US$${plan.totals.remaining_usd.toFixed(2)}).`);
    const c = (await this.db.combination.findUnique({ where: { id: combinationId } }))!;
    const g = await this.guide(combinationId);
    const roles = new Map((await this.studio.personRoles(c.workspaceId)).filter((r) => r.takesPartInCase && !r.retired).map((r) => [r.key, r]));
    const inGuide = (q: string) => !!q && sameText(g.text).includes(sameText(q));
    const out: PeopleProposal = { mode: plan.mode, guide: plan.guide, people: [], to_decide: [], dropped: [], usd: 0, from: plan.mode === "rules" ? "rules" : null, run_files: [], note: "" };
    const keep = (p: Answer["people"][number], agreed: boolean): ProposedPerson | null => {
      const r = roles.get(p.role);
      if (!r) { out.dropped.push({ role: p.role, why: "Not a person role in the library that takes part in a case (Shared library › Person roles)." }); return null; }
      if (!inGuide(p.quote)) { out.dropped.push({ role: p.role, why: "Its sentence is not in the guide text, so it is not proposed." }); return null; }
      const applies = r.mayBeApplicant ? p.applies : false;
      return { role: p.role, label: r.label, min: p.role === "principal" ? 1 : Math.min(p.min, p.max), max: p.role === "principal" ? 1 : p.max, applies, quote: p.quote.slice(0, 400), why: p.why ?? null, agreed };
    };
    if (plan.mode === "rules") {
      for (const p of rulesReading(g.text).people) { const k = keep(p, true); if (k) out.people.push(k); }
    } else {
      const draft = await this.round(false, c.combinationKey, g, plan.mode);
      const check = draft.ok ? await this.round(true, c.combinationKey, g, plan.mode) : null;
      out.usd = round2((draft.costUsd ?? 0) + (check?.costUsd ?? 0));
      out.run_files = [draft.runFile, check?.runFile].filter((x): x is string => !!x);
      if (!draft.ok || !check?.ok) { out.note = (!draft.ok ? draft.reason : check?.reason) ?? "The AI step did not finish."; out.from = null; return out; }
      out.from = draft.from === "live" || check.from === "live" ? "live" : "replay";
      const two = new Map(check.output!.people.map((p) => [p.role, p]));
      for (const p of draft.output!.people) {
        const q = two.get(p.role);
        if (q && q.min === p.min && q.max === p.max && q.applies === p.applies) { const k = keep(p, true); if (k) out.people.push(k); }
        else out.to_decide.push({ role: p.role, draft: `${p.min} to ${p.max}${p.applies ? ", applies" : ""}`, check: q ? `${q.min} to ${q.max}${q.applies ? ", applies" : ""}` : "not named", why: q ? "The two rounds read it differently." : "Only one round named this person." });
      }
      for (const q of check.output!.people) if (!draft.output!.people.some((p) => p.role === q.role)) out.to_decide.push({ role: q.role, draft: "not named", check: `${q.min} to ${q.max}${q.applies ? ", applies" : ""}`, why: "Only one round named this person." });
    }
    if (!out.people.some((p) => p.role === "principal")) out.to_decide.push({ role: "principal", draft: "—", check: "—", why: "The guide sentence for the person applying was not found; the principal stays as it is." });
    out.note = out.note || `${out.people.length} line${out.people.length === 1 ? "" : "s"} proposed from ${g.code}${out.to_decide.length ? `, ${out.to_decide.length} to decide` : ""}. Nothing is saved until you accept and save. Sample until the immigration expert confirms.`;
    await this.audit.log(c.workspaceId, actor.id, "proposed", "people", c.combinationKey, `${actor.name} filled "Who can be" for "${c.label}" from ${g.code} (${plan.mode === "rules" ? "rules only" : plan.mode === "replay" ? "saved AI answers" : "AI now"}, US$${out.usd.toFixed(2)}): ${out.people.map((p) => p.role).join(", ") || "nothing proposed"}`, { mode: plan.mode, run_files: out.run_files }, combinationId);
    return out;
  }

  /** One AI round: the newest saved real run of exactly this job (same guide, same prompt, this combination), or a
   *  guarded live call through the launcher (stub pass first), as the form finder does. */
  private async round(isCheck: boolean, combinationKey: string, g: Guide, mode: "replay" | "live"): Promise<{ ok: boolean; output?: Answer; costUsd: number; from?: "replay" | "live"; runFile?: string; reason?: string }> {
    if (!g.input) return { ok: false, costUsd: 0, reason: `${g.code} is not among the official files the AI may read, so only rules can fill this.` };
    const template = isCheck ? AI.check : AI.template, base = `studio-who-can-be${isCheck ? "-check" : ""}`;
    const tsha = sha(readFileSync(join(PROMPTS, template)));
    const inputs = [g.input];
    if (mode === "replay") {
      const mine = new RegExp(`^${base}-${isCheck ? "" : "(?!check-)"}.+-live-\\d{8}t\\d{9}z-[a-z0-9]+\\.json$`);
      const files = existsSync(RUNS) ? readdirSync(RUNS).filter((f) => mine.test(f) && LIVE_RUN.test(f)).sort((a, b) => b.slice(b.lastIndexOf("-live-")).localeCompare(a.slice(a.lastIndexOf("-live-")))) : [];
      for (const f of files) {
        try {
          const r = JSON.parse(readFileSync(join(RUNS, f), "utf8"));
          if (r.caller !== "live" || r.drafting_run?.status !== "completed" || r.contract_valid !== true || r.launch_evidence?.template_sha256 !== tsha || JSON.stringify(r.drafting_run?.inputs?.official_files) !== JSON.stringify(inputs) || r.drafting_run?.inputs?.combination !== combinationKey) continue;
          const o = JSON.parse(String(r.raw_output)) as Answer;
          if (Array.isArray(o?.people)) return { ok: true, output: o, costUsd: 0, from: "replay", runFile: `prototype/p2/runs/${f}` };
        } catch { /* unreadable: an older one may do */ }
      }
      return { ok: false, costUsd: 0, reason: `No saved AI answer for ${g.code} and this prompt yet: it is recorded once in a founder-approved live trial. Use rules only meanwhile.` };
    }
    const jobId = `${base}-${slug(combinationKey).slice(0, 30).replace(/_/g, "-")}-${sha(`${combinationKey}|${g.input.sha256}|${Date.now()}`).slice(0, 8)}`;
    const job = { job_id: jobId, kind: "who_can_be", combination: combinationKey, configuration_version: "s5-who-can-be", template, output_schema: AI.schema, inputs,
      settings: { provider_route: ROUTE, model: MODEL, effort: AI.effort, timeout_ms: 300_000, max_attempts: 2, budget_usd: 1, max_output_tokens: AI.max_output_tokens }, known: { combination_trail: g.trail } };
    mkdirSync(JOBS, { recursive: true });
    writeFileSync(join(JOBS, `${jobId}.json`), JSON.stringify(job, null, 1) + "\n");
    try {
      const last = (o: string) => { for (const l of o.trim().split("\n").reverse()) { try { return JSON.parse(l); } catch { /* not JSON */ } } return null; };
      const stub = await this.sources.launchOnce(jobId, "stub");
      if (stub.code !== 0) return { ok: false, costUsd: 0, reason: `The guarded AI route refused the job before any call: ${String(last(stub.out)?.refused ?? stub.err).trim().slice(-300)}` };
      const live = await this.sources.launchOnce(jobId, "live");
      const lj = last(live.out);
      if (!lj?.run_file) return { ok: false, costUsd: 0, reason: `The AI step did not run: ${String(lj?.refused ?? lj?.error ?? live.err).trim().slice(-300)}` };
      const rec = JSON.parse(readFileSync(lj.run_file, "utf8"));
      const cost = Number(rec.drafting_run?.usage?.cost_usd ?? 0);
      if (rec.drafting_run?.status !== "completed" || rec.contract_valid !== true) return { ok: false, costUsd: cost, reason: "The AI answer could not be used. Nothing was proposed." };
      const o = JSON.parse(String(rec.raw_output)) as Answer;
      return Array.isArray(o?.people) ? { ok: true, output: o, costUsd: cost, from: "live", runFile: String(lj.run_file).replace(`${SOLUTION}/`, "") } : { ok: false, costUsd: cost, reason: "The AI answer did not have the expected shape." };
    } finally { rmSync(join(JOBS, `${jobId}.json`), { force: true }); }
  }
}
