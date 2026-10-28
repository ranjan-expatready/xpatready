// S4 form finder (W1-06, P-123; challenge.md M2–M6, m1, m3): for one combination, find its canada.ca application page
// and guide, let AI list the forms they name (a draft round and an independent checker round, P-121), check every
// answer with rules, take each form from the library or download it from canada.ca, store it once and attach it with
// no confirm step, marked "Picked by AI · Sample" until the immigration expert signs off at release review.
//
// The honest split (concept §2): AI decides only which forms the pages ask for and under what condition. Finding the
// page, the lookup, the download, the identity read from the file, the checksum and the duplicate check are rules.
//  - one AiBatch (operation find_forms) per run, with six tracked steps (DraftingJob kind finder_*, status WAITING until
//    started, so the field-map worker in ai.ts never picks them up);
//  - AI calls go only through the guarded launcher (p2/launch.ts, stub pass first, ledger, run cap); replays reuse a
//    saved real run of the same job, inputs and prompt (US$0); "rules" lists the printed numbers and attaches nothing;
//  - an answer whose quote is not on the page, or whose number is not printed on it, is dropped and listed;
//  - High = both rounds name the form with the same reading and the rules pass: attached. A disagreement is "Decide"
//    (a person attaches or not, P-121); "separate application" and "not needed" are listed, never attached;
//  - downloads only from canada.ca (engine/canada.ts officialUrl), from the form's own page, checked like a manifest file
//    and recorded as an official download (M2): no second person. Same printed edition, different file: the library's
//    edition stays and the form is marked "Newer file on canada.ca" (M6); a newer edition is held for impact review.
import { HttpException, HttpStatus, Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { costUsd, inputTokenBound } from "../../../p2/ledger.ts";
import { RUN_CAP_USD } from "../../../p2/policy.ts";
import { manifest, slug } from "../../engine/import.ts";
import { editionMonth, newestEdition } from "../../engine/programs.ts";
import { compareRounds } from "../../engine/agreement.ts";
import { mentionsOf, officialUrl, pageLinks, pageText, parseFormPage, parseFormsIndex, textFingerprint } from "../../engine/canada.ts";
import { FinderBody, FinderLaunchBody, normaliseCode, type FinderMode } from "../../contracts/form-library.ts";
import { canadaSource, CanadaError, type CanadaSource } from "./canada.ts";
import { ACTORS, Audit, Db, need, PROTOTYPE, PY, ROOT, SOLUTION, STUDIO, VAR, Workspace, type Actor } from "./core.ts";
import { Sources } from "./sources.ts";
import { channelsFrom, recordedCopy, sampleFixtures } from "./filing.ts";
import { WHO } from "./studio.ts";

const run = promisify(execFile);
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const round2 = (n: number) => Math.round(n * 100) / 100;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw problem(400, "Check the request", r.error.issues[0]?.message ?? "Some values are not valid.", { errors: r.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) });
  return r.data;
}

export const FINDER_OPERATION = "find_forms";
/** Lead decision 28 Oct (drift check #9): a saved answer belongs to the combination itself, by its key, which no rename
 *  changes (round 3 R3-2); a same-named combination anywhere else never gets it. A run records the key as its job's
 *  combination; the 27 Oct live pass, made before that, is named in samples/finder-saved-runs.json. A run with neither
 *  is never replayed. */
const LEGACY_RUN_KEYS: Record<string, string> = (() => { try { return JSON.parse(readFileSync(join(STUDIO, "samples", "finder-saved-runs.json"), "utf8")).runs ?? {}; } catch { return {}; } })();
const runKey = (r: SavedRun): string | null => { const c = r.drafting_run?.inputs?.combination; return c && !c.includes(" › ") ? c : LEGACY_RUN_KEYS[r.file] ?? null; };
/** Break R5-1: a saved real run ends "-live-<time>-<id>.json"; a stub pass ends "-stub-…", even when the place's own
 *  name holds the word "live" (a "Live-in caregiver" combination), so it is never replayed as the AI's answer. */
const LIVE_RUN = /-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/;
/** Saved run files, newest first by the time in their name (after "-live-"), whatever the job id before it. */
const newestFirst = (a: string, b: string) => b.slice(b.lastIndexOf("-live-")).localeCompare(a.slice(a.lastIndexOf("-live-")));
/** Break minor 1: an answer is used only in the shape its schema promises (a wrong shape never crashes the run). */
function shapeOk(kind: "find_guide" | "find_forms", o: unknown): boolean {
  const x = o as Record<string, unknown> | null;
  if (!x || typeof x !== "object") return false;
  if (kind === "find_guide") return (x.package_title === null || typeof x.package_title === "string") && (x.confidence === "high" || x.confidence === "low") && Array.isArray(x.others ?? []);
  return Array.isArray(x.forms) && x.forms.every((f) => !!f && typeof f === "object" && typeof (f as Proposal).code === "string" && typeof (f as Proposal).quote === "string" && typeof (f as Proposal).applies === "string" && typeof (f as Proposal).who === "string");
}
export { channelsFrom };
export const INDEX_URL = "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides.html";
const STEPS = [
  { kind: "finder_guide", label: "Find the application page and guide", ai: true },
  { kind: "finder_read", label: "Read the page and guide (rules: every form number printed on them)", ai: false },
  { kind: "finder_propose", label: "AI lists the forms the pages ask for", ai: true },
  { kind: "finder_check", label: "A second AI round checks it without seeing the first answer", ai: true },
  { kind: "finder_fetch", label: "Take each form from the library or download it from canada.ca", ai: false },
  { kind: "finder_attach", label: "Attach the forms to this combination", ai: false },
] as const;
type StepKind = (typeof STEPS)[number]["kind"];
const JOBS = join(PROTOTYPE, "p2", "jobs"), RUNS = join(PROTOTYPE, "p2", "runs"), PROMPTS = join(PROTOTYPE, "p2", "prompts"), INVENTORY = join(PROTOTYPE, "p1", "inventory");
const ROUTE = "anthropic-api/aiw-d261-prototype-exception-aiw-d260", MODEL = "claude-opus-5-5";
const AI_SETTINGS = {
  find_guide: { template: "find-guide.v1.md", check: "find-guide-check.v1.md", schema: "find-guide-output.v1.schema.json", effort: "low", max_output_tokens: 3000 },
  find_forms: { template: "find-forms.v1.md", check: "find-forms-check.v1.md", schema: "find-forms-output.v1.schema.json", effort: "medium", max_output_tokens: 10000 },
} as const;
type AiKind = keyof typeof AI_SETTINGS;
const ATTACHABLE = new Set(["always", "condition", "alternative"]);
const STOPWORDS = new Set(["and", "or", "the", "a", "an", "of", "for", "to", "in", "with", "your", "retail", "corporate", "employers", "temporary", "residence", "permanent", "canada", "application", "apply"]);
const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOPWORDS.has(w)).map((w) => w.replace(/s$/, ""));
const sameText = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

type Page = { url: string; title: string; kind: "package" | "guide"; text: string; sha256: string; inventory: { file: string; sha256: string } | null };
type Proposal = { code: string; title: string | null; applies: string; condition: string | null; who: string; quote: string; filed_note: string | null };
export type FinderResult = {
  pages: { url: string; title: string; kind: string; read_by_ai: boolean }[];
  printed: string[];
  attach: { code: string; title: string | null; applies: string; condition: string | null; who: string; quote: string; filed_note: string | null; source: "library" | "downloaded" | "newer_file" ; edition?: string | null; line?: "added" | "already" | "removed_by_person" }[];
  missing: { code: string; title: string | null; why: string; quote: string }[];
  decide: { code: string; draft: Proposal | null; check: Proposal | null; why: string }[];
  not_for: { code: string; applies: string; quote: string }[];
  dropped: { code: string; why: string }[];
  rules_only?: { code: string; sentence: string }[];
  guide_choice?: { candidates: { title: string; url: string }[]; why: string };
  ai_inputs?: { file: string; sha256: string }[];
};

/** One AI round's outcome: an answer (live or replayed) or a plain reason it has none. */
type RoundOut<T> = { ok: true; output: T; costUsd: number; from: "live" | "replay"; runFile: string } | { ok: false; reason: string; costUsd: number; blocked?: boolean; cancelled?: boolean };
type GuideOut = { package_title: string | null; confidence: "high" | "low"; reason: string; others: string[] };
type FormsOut = { forms: Proposal[]; unresolved: { quote: string; reason: string }[] };
type Candidate = { title: string; url: string };
type GuideValue = { url: string; title: string | null; candidates?: Candidate[] };
/** A saved run record of the guarded launcher, read loosely (only what replay compares). */
type SavedRun = { file: string; drafting_run?: { status?: string; usage?: { cost_usd?: number }; inputs?: { official_files?: unknown; combination?: string } }; contract_valid?: boolean; launch_evidence?: { template_sha256?: string; known?: { combination_trail?: string } }; raw_output?: unknown };
/** The stored plan of a finder run, with its result once it ended. */
type FinderPlan = Awaited<ReturnType<Finder["plan"]>> & { result?: FinderResult };
const json = (v: unknown) => v as Prisma.InputJsonValue;
const countsOf = (d: unknown) => (d && typeof d === "object" ? (d as { done?: number; total?: number }) : null);

/** Where a combination sits, by names (the AI's only known fact besides the pages). */
async function trailOf(db: Db, combinationId: string): Promise<{ id: string; workspaceId: string; label: string; trail: string[] }> {
  const c = await db.combination.findUnique({ where: { id: combinationId }, include: { program: true } });
  if (!c) throw problem(404, "Not found", "That combination does not exist.");
  const nodes = await db.programDef.findMany({ where: { workspaceId: c.workspaceId }, select: { programNodeKey: true, parentNodeKey: true, label: true } });
  const by = new Map(nodes.map((n) => [n.programNodeKey, n]));
  const trail: string[] = [];
  for (let n = by.get(c.program.programNodeKey); n; n = n.parentNodeKey ? by.get(n.parentNodeKey) : undefined) trail.unshift(n.label);
  return { id: c.id, workspaceId: c.workspaceId, label: c.label, trail };
}

/** A text inventory under p1/inventory made from a manifest file whose URL is this page (the guard admits only these). */
export function inventoryFor(url: string): { file: string; sha256: string } | null {
  if (!existsSync(INVENTORY)) return null;
  const items = manifest();
  for (const f of readdirSync(INVENTORY).filter((x) => x.endsWith(".text.inventory.json")).sort()) {
    const bytes = readFileSync(join(INVENTORY, f));
    let inv: { summary?: { url?: string; file?: string; sha256?: string } }; try { inv = JSON.parse(bytes.toString("utf8")); } catch { continue; }
    const s = inv?.summary ?? {};
    if (s.url !== url) continue;
    if (!items.some((i) => `official-sources/ircc/${i.path}` === s.file && i.sha256 === s.sha256)) continue;
    return { file: `prototype/p1/inventory/${f}`, sha256: sha(bytes) };
  }
  return null;
}

@Injectable()
export class Finder implements OnModuleInit {
  private canada: CanadaSource = canadaSource();
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Sources) private readonly sources: Sources) {}

  /** A finder run left running by a stopped server can never finish: say so, instead of showing it as running forever. */
  async onModuleInit() {
    const open = await this.db.aiBatch.findMany({ where: { operation: FINDER_OPERATION, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } });
    for (const b of open) {
      await this.db.draftingJob.updateMany({ where: { batchId: b.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "The studio server stopped before this step ended." } });
      await this.db.aiBatch.update({ where: { id: b.id }, data: { status: "FAILED", finishedAt: new Date(), message: "The studio server stopped while finding forms. Find again." } });
    }
  }

  /** Test seam: an isolated test copy swaps the canada.ca source (never the demo). */
  useCanada(c: CanadaSource) { this.canada = c; }

  // ------------------------------------------------------------------ plan and launch
  /** What a run will do, what it may cost and the fingerprint the launch must repeat (the person saw this plan). */
  async plan(combinationId: string, body: unknown) {
    const b = parse(FinderBody, body);
    const c = await trailOf(this.db, combinationId);
    if (b.pageUrl) { const u = officialUrl(b.pageUrl); if (!u.ok) throw problem(400, "Only canada.ca pages", `${u.why} Paste the address of the official application or guide page on canada.ca.`, { errors: [{ field: "pageUrl", message: u.why }] }); }
    const remembered = b.pageUrl ? null : await this.rememberedPages(combinationId);
    const ledger = this.sources.ledger();
    const steps = STEPS.map((s, i) => ({ n: i + 1, kind: s.kind, label: s.label, uses_ai: s.ai && b.mode !== "rules" }));
    // Cost: each AI round's worst case as the ledger reserves it (inputs bounded by bytes, both attempts); replay and rules US$0.
    const rounds = b.mode === "live" ? [...(remembered || b.pageUrl ? [] : ["find_guide", "find_guide"] as const), "find_forms", "find_forms"] as AiKind[] : [];
    const worst = round2(rounds.reduce((a, k) => a + Math.min(RUN_CAP_USD, costUsd(MODEL, inputTokenBound("x".repeat(k === "find_guide" ? 120_000 : 160_000)), AI_SETTINGS[k].max_output_tokens) * 2), 0));
    const expected = b.mode === "live" ? this.expectedUsd(c.trail) : 0;
    const plan = { operation: FINDER_OPERATION, operation_label: "Find this combination's forms", combination: { id: c.id, label: c.label, trail: c.trail }, mode: b.mode, page_url: b.pageUrl ?? remembered?.package ?? null, only: b.only ?? null, steps,
      totals: { worst_usd: worst, expected_usd: expected, ai_rounds: rounds.length }, ledger,
      note: b.mode === "rules" ? "Rules only: every form number printed on the pages is listed for you to attach by hand; nothing is attached, because AI did not decide which apply." : b.mode === "replay" ? "Saved AI answers for these exact pages are replayed: US$0. A page with no saved answer stops with the reason." : `Live AI: two rounds per question, at most US$${worst.toFixed(2)} (usually much less). Downloads from canada.ca cost nothing.`,
      targets: [] as unknown[] };
    const plan_sha256 = sha(JSON.stringify({ c: c.id, mode: b.mode, page: plan.page_url, only: plan.only, steps: steps.map((s) => s.kind + s.uses_ai), worst }));
    return { ...plan, plan_sha256 };
  }

  private expectedUsd(trail: string[]): number | null {
    const key = slug(trail.join(" ")).slice(0, 40);
    let total = 0, found = false;
    for (const prefix of [`studio-finder-forms-${key}`, `studio-finder-forms-check-${key}`]) {
      const r = this.savedRuns(prefix)[0] ?? this.savedRunsLike(prefix)[0];
      if (r) { total += Number(r.drafting_run?.usage?.cost_usd ?? 0); found = true; }
    }
    return found ? round2(total) : null;
  }

  /** The pages a combination's last finished run used ("remembered" so Find again does not search again). */
  private async rememberedPages(combinationId: string): Promise<{ package: string } | null> {
    const last = await this.db.aiBatch.findFirst({ where: { operation: FINDER_OPERATION, scopeKind: "combination", scopeLabel: { startsWith: `${combinationId}|` }, status: { in: ["COMPLETED", "PARTIAL"] } }, orderBy: { startedAt: "desc" } });
    const url = (last?.plan as unknown as FinderPlan | undefined)?.result?.pages?.find((p) => p.kind === "package")?.url;
    return url ? { package: url } : null;
  }

  /** Launch: the same plan fingerprint, one run per combination at a time, the same key returns the same run. */
  async launch(actor: Actor, combinationId: string, body: unknown) {
    need(actor, "author");
    const b = parse(FinderLaunchBody, body);
    const workspaceId = await this.ws.id();
    const again = await this.db.aiBatch.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: b.idempotencyKey } } });
    if (again && !again.scopeLabel.startsWith(`${combinationId}|`)) throw problem(409, "Key already used", "This launch key belongs to another run. Look at the plan again to start a new one.");
    if (again) return this.view(again.id);
    const plan = await this.plan(combinationId, { mode: b.mode, pageUrl: b.pageUrl, only: b.only });
    if (plan.plan_sha256 !== b.planSha256) throw problem(409, "Look at the plan again", "Something changed since you looked at the plan (the pages, the mode or the cost). Look at it again before starting.");
    if (b.mode === "live" && plan.totals.worst_usd > plan.ledger.remaining_usd + 1e-9) throw problem(409, "Over the spending cap", `The worst case (US$${plan.totals.worst_usd.toFixed(2)}) is above what is left of the AI spending cap (US$${plan.ledger.remaining_usd.toFixed(2)}). Nothing was started; use saved AI answers or rules only.`);
    let batchId: string;
    try {
      batchId = await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`finder:${combinationId}`}))`;
        const active = await tx.aiBatch.findFirst({ where: { workspaceId, operation: FINDER_OPERATION, scopeLabel: { startsWith: `${combinationId}|` }, status: { in: ["QUEUED", "RUNNING"] } } });
        if (active) throw problem(409, "Already finding", "The form finder is already running for this combination: watch it, or stop it first.", { runId: active.id });
        const batch = await tx.aiBatch.create({ data: { workspaceId, idempotencyKey: b.idempotencyKey, operation: FINDER_OPERATION, scopeKind: "combination", scopeLabel: `${combinationId}|${plan.combination.trail.join(" › ")}`, mode: b.mode.toUpperCase(), status: "QUEUED", planSha256: plan.plan_sha256, plan: json(plan), spendLimitUsd: Math.max(plan.totals.worst_usd, 0.01), worstCaseUsd: plan.totals.worst_usd, expectedUsd: plan.totals.expected_usd, startedBy: actor.id, message: "Finding forms" } });
        await tx.draftingJob.createMany({ data: STEPS.map((s, i) => ({ workspaceId, combinationId, batchId: batch.id, kind: s.kind, mode: s.ai ? b.mode.toUpperCase() : "LOCAL", status: "WAITING", message: "Waits for the step before it", startedBy: actor.id, startedAt: new Date(Date.now() + i) })) });
        return batch.id;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") { const b2 = await this.db.aiBatch.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: b.idempotencyKey } } }); if (b2) return this.view(b2.id); }
      throw e;
    }
    await this.audit.log(workspaceId, actor.id, "started", "form finder", combinationId, `${actor.name} started the form finder for "${plan.combination.label}" (${b.mode === "live" ? `live AI, at most US$${plan.totals.worst_usd.toFixed(2)}` : b.mode === "replay" ? "saved AI answers, US$0" : "rules only, US$0"})`, undefined, combinationId);
    void this.execute(batchId).catch(async (e) => {
      await this.db.aiBatch.updateMany({ where: { id: batchId, status: { in: ["QUEUED", "RUNNING"] } }, data: { status: "FAILED", finishedAt: new Date(), message: `The form finder stopped: ${(e as Error).message.slice(0, 300)}` } });
    });
    return this.view(batchId);
  }

  // ------------------------------------------------------------------ the run
  private async step<T>(batchId: string, kind: StepKind, fn: (set: (m: string, extra?: { costUsd?: number; detail?: unknown }) => Promise<void>) => Promise<{ status: string; message: string; costUsd?: number; detail?: unknown; value: T }>): Promise<{ status: string; value: T } | null> {
    const b = await this.db.aiBatch.findUnique({ where: { id: batchId } });
    const job = await this.db.draftingJob.findFirst({ where: { batchId, kind } });
    if (!b || !job) return null;
    if (b.cancelRequested) { await this.db.draftingJob.updateMany({ where: { batchId, status: "WAITING" }, data: { status: "CANCELLED", finishedAt: new Date(), message: "Stopped before it started." } }); return null; }
    await this.db.draftingJob.update({ where: { id: job.id }, data: { status: "RUNNING", startedAt: new Date(), message: "Running" } });
    const set = async (m: string, extra: { costUsd?: number; detail?: unknown } = {}) => { await this.db.draftingJob.update({ where: { id: job.id }, data: { message: m, ...(extra.costUsd !== undefined ? { costUsd: extra.costUsd } : {}), ...(extra.detail !== undefined ? { detail: json(extra.detail) } : {}) } }); };
    try {
      const r = await fn(set);
      await this.db.draftingJob.update({ where: { id: job.id }, data: { status: r.status, message: r.message, costUsd: r.costUsd ?? 0, detail: r.detail === undefined ? undefined : json(r.detail), finishedAt: new Date() } });
      return { status: r.status, value: r.value };
    } catch (e) {
      const msg = e instanceof CanadaError ? e.message : `This step stopped: ${(e as Error).message.slice(0, 300)}`;
      await this.db.draftingJob.update({ where: { id: job.id }, data: { status: "FAILED", message: msg, finishedAt: new Date() } });
      return { status: "FAILED", value: null as T };
    }
  }

  private async finish(batchId: string, status: string, message: string, result: FinderResult) {
    const cut = await this.db.draftingJob.count({ where: { batchId, status: { in: ["WAITING", "CANCELLED"] } } });
    await this.db.draftingJob.updateMany({ where: { batchId, status: "WAITING" }, data: { status: "SKIPPED", finishedAt: new Date(), message: "Not needed after the step before it." } });
    const b = await this.db.aiBatch.findUnique({ where: { id: batchId } });
    const cancelled = b?.cancelRequested && cut > 0; // a Stop that came after the work was done does not call it stopped
    await this.db.aiBatch.update({ where: { id: batchId }, data: { status: cancelled ? "CANCELLED" : status, finishedAt: new Date(), message: cancelled ? `Stopped by a person. ${message}` : message, plan: json({ ...(b!.plan as object), result }) } });
  }

  /** The six steps, in order; each records its status, words, cost and what it found. */
  async execute(batchId: string) {
    const b = await this.db.aiBatch.update({ where: { id: batchId }, data: { status: "RUNNING" } });
    const plan = b.plan as unknown as FinderPlan;
    const mode: FinderMode = plan.mode;
    const combinationId: string = plan.combination.id;
    const trail = (plan.combination.trail as string[]).join(" › ");
    // The combination itself (its key): what a saved answer belongs to (Lead decision 28 Oct).
    const combinationKey = (await this.db.combination.findUnique({ where: { id: combinationId }, select: { combinationKey: true } }))?.combinationKey ?? combinationId;
    const actor = ACTORS.find((a) => a.id === b.startedBy) ?? ACTORS[0];
    const result: FinderResult = { pages: [], printed: [], attach: [], missing: [], decide: [], not_for: [], dropped: [] };
    const wanted = async () => !(await this.db.aiBatch.findUnique({ where: { id: batchId } }))?.cancelRequested;

    // 1. The application page (and its guide): a person's choice, the remembered page, a sure rules match, or AI's pick.
    const index = await this.step<GuideValue>(batchId, "finder_guide", async (set) => {
      if (plan.page_url) return { status: "COMPLETED", message: "Using the page you chose (or the one this combination used before). No AI call.", value: { url: plan.page_url as string, title: null as string | null } };
      await set("Reading canada.ca's list of application packages");
      const got = await this.canada.get(INDEX_URL, "html");
      const idx = parseFormsIndex(got.bytes.toString("utf8"));
      const sure = this.sureMatch(plan.combination.trail, idx.packages);
      if (sure.match) return { status: "COMPLETED", message: `Rules found a sure match: "${sure.match.title}". No AI call was made.`, detail: { candidates: sure.candidates }, value: { url: sure.match.url, title: sure.match.title } };
      if (mode === "rules") return { status: "NEEDS_PERSON", message: "Rules found no sure match and AI is off: choose the application page.", detail: { candidates: sure.candidates }, value: { url: "", title: null, candidates: sure.candidates } };
      const inv = inventoryFor(INDEX_URL);
      if (!inv) return { status: "NEEDS_PERSON", message: "canada.ca's list is not among the recorded pages AI may read: choose the application page.", detail: { candidates: sure.candidates }, value: { url: "", title: null, candidates: sure.candidates } };
      await set("AI picks the application package (round 1 of 2)");
      const d = await this.aiRound<GuideOut>("find_guide", false, trail, combinationKey, [inv], mode, wanted, batchId);
      await set("A second AI round checks the pick without seeing the first (round 2 of 2)", { costUsd: d.costUsd });
      const k = await this.aiRound<GuideOut>("find_guide", true, trail, combinationKey, [inv], mode, wanted, batchId);
      const cost = round2(d.costUsd + k.costUsd);
      if (!d.ok || !k.ok) return { status: (!d.ok && d.blocked) || (!k.ok && k.blocked) ? "BLOCKED" : "NEEDS_PERSON", message: `AI could not pick the page: ${!d.ok ? d.reason : !k.ok ? k.reason : ""}. Choose the application page.`, costUsd: cost, detail: { candidates: sure.candidates }, value: { url: "", title: null, candidates: sure.candidates } };
      const byTitle = (t: string | null) => (t ? idx.packages.find((p) => sameText(p.title) === sameText(t)) : undefined);
      const a = byTitle(d.output.package_title), c = byTitle(k.output.package_title);
      const cands = [...new Map([a, c, ...[...(d.output.others ?? []), ...(k.output.others ?? [])].map(byTitle), ...sure.candidates].filter((p): p is Candidate => !!p).map((p) => [p.url, { title: p.title, url: p.url }] as const)).values()].slice(0, 10);
      if (a && c && a.url === c.url && d.output.confidence === "high" && k.output.confidence === "high") return { status: "COMPLETED", message: `AI picked "${a.title}"; the second round agrees. US$${cost.toFixed(2)}.`, costUsd: cost, detail: { candidates: cands, draft: d.output, check: k.output }, value: { url: a.url, title: a.title } };
      return { status: "NEEDS_PERSON", message: `The two AI rounds did not agree on one page${a ? ` (first: "${a.title}"` : ""}${c ? `${a ? "; " : " ("}second: "${c.title}"` : ""}${a || c ? ")" : ""}. Choose the application page.`, costUsd: cost, detail: { candidates: cands, draft: d.output, check: k.output }, value: { url: "", title: null, candidates: cands } };
    });
    if (!index || index.status !== "COMPLETED") {
      const c = index?.value?.candidates ?? [];
      if (index?.status === "NEEDS_PERSON" || index?.status === "BLOCKED") result.guide_choice = { candidates: c, why: "Choose the application page: the finder could not pick one for sure." };
      return this.finish(batchId, index?.status === "NEEDS_PERSON" || index?.status === "BLOCKED" ? "NEEDS_PERSON" : "FAILED", index?.status === "NEEDS_PERSON" ? "Choose the application page, then Find again." : "The finder could not find the application page.", result);
    }

    // 2. Read the application page and the guide it links (rules: every form number printed on them).
    const read = await this.step(batchId, "finder_read", async (set) => {
      const pages: Page[] = [];
      const pkg = await this.canada.get(index.value.url, "html");
      const html = pkg.bytes.toString("utf8");
      pages.push({ url: index.value.url, title: index.value.title ?? (/<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? "Application page").replace(/\s*-\s*Canada\.ca\s*$/i, "").trim(), kind: "package", text: pageText(html), sha256: pkg.sha256, inventory: inventoryFor(index.value.url) });
      // A page may link more than one guide (the study permit page also links the inside-Canada guide): the one whose
      // name shares most words with the trail is read; a tie keeps the first.
      const want = new Set(words(plan.combination.trail.slice(1).join(" ")));
      const guides = pageLinks(html, index.value.url).filter((l) => /\/guide-\d+/.test(l.url) || /^guide \d+/i.test(l.text));
      const guide = guides.map((l, i) => ({ l, i, s: words(`${l.text} ${l.url.split("/").pop()}`).filter((w) => want.has(w)).length })).sort((a, b) => b.s - a.s || a.i - b.i)[0]?.l;
      if (guide) {
        await set(`Reading ${guide.text}`);
        try {
          const g = await this.canada.get(guide.url, "html");
          const gh = g.bytes.toString("utf8");
          // The guide's own title (a link may say only "Read the instruction guide").
          const gTitle = (/<title>([^<]*)<\/title>/i.exec(gh)?.[1] ?? guide.text).replace(/\s*-\s*Canada\.ca\s*$/i, "").trim();
          guide.text = gTitle;
          pages.push({ url: guide.url, title: gTitle, kind: "guide", text: pageText(gh), sha256: g.sha256, inventory: inventoryFor(guide.url) });
          await this.storeGuide(b.workspaceId, guide.url, guide.text, gh, g.bytes, actor.id, batchId);
        } catch (e) { if (!(e instanceof CanadaError)) throw e; await set(`The guide could not be read (${e.message}); the application page is used alone.`); }
      }
      const printed = [...new Map(pages.flatMap((p) => mentionsOf(p.text)).map((m) => [normaliseCode(m.code), { code: normaliseCode(m.code), sentence: m.sentence }])).values()];
      return { status: "COMPLETED", message: `Read ${pages.length} page${pages.length === 1 ? "" : "s"}: ${printed.length} form number${printed.length === 1 ? "" : "s"} printed on ${pages.length === 1 ? "it" : "them"}. US$0.`, detail: { pages: pages.map((p) => ({ url: p.url, title: p.title, kind: p.kind, sha256: p.sha256, inventory: p.inventory?.file ?? null })), printed }, value: { pages, printed } };
    });
    if (!read || read.status !== "COMPLETED") return this.finish(batchId, "FAILED", "The finder could not read the application page.", result);
    const { pages, printed } = read.value;
    result.pages = pages.map((p) => ({ url: p.url, title: p.title, kind: p.kind, read_by_ai: !!p.inventory && mode !== "rules" }));
    result.printed = printed.map((p) => p.code);
    const allText = sameText(pages.map((p) => p.text).join("\n"));
    const printedSet = new Set(printed.map((p) => p.code));

    // 3–4. Two AI rounds over the recorded pages (rules only: the printed numbers are listed for a person, none attached).
    let draft: Proposal[] = [], check: Proposal[] = [];
    if (mode === "rules") {
      result.rules_only = printed;
      for (const k of ["finder_propose", "finder_check"] as const) await this.db.draftingJob.updateMany({ where: { batchId, kind: k }, data: { status: "SKIPPED", finishedAt: new Date(), costUsd: 0, message: "Rules only: AI did not run." } });
    } else {
      const inputs = pages.map((p) => p.inventory).filter(Boolean) as { file: string; sha256: string }[];
      result.ai_inputs = inputs;
      const noInputs = !inputs.length ? "None of these pages is among the recorded canada.ca pages AI may read." : null;
      const r1 = await this.step<RoundOut<FormsOut> | null>(batchId, "finder_propose", async (set) => {
        if (noInputs) return { status: "FAILED", message: `${noInputs} Use rules only, or record the page first.`, value: null as RoundOut<FormsOut> | null };
        await set(mode === "live" ? "AI reads the pages (guarded live call; stub pass first)" : "Replaying the saved AI answer for these exact pages (US$0)");
        const o = await this.aiRound<FormsOut>("find_forms", false, trail, combinationKey, inputs, mode, wanted, batchId);
        return o.ok ? { status: "COMPLETED", message: `AI listed ${o.output.forms.length} form${o.output.forms.length === 1 ? "" : "s"} (${o.from === "replay" ? "saved answer, US$0" : `US$${o.costUsd.toFixed(2)}`}).`, costUsd: o.costUsd, detail: { run_file: o.runFile, from: o.from }, value: o }
          : { status: o.blocked ? "BLOCKED" : o.cancelled ? "CANCELLED" : "FAILED", message: o.reason, costUsd: o.costUsd, value: o };
      });
      const r2 = r1?.status === "COMPLETED" ? await this.step<RoundOut<FormsOut> | null>(batchId, "finder_check", async (set) => {
        await set(mode === "live" ? "The checker reads the same pages without seeing the first answer" : "Replaying the saved checker answer (US$0)");
        const o = await this.aiRound<FormsOut>("find_forms", true, trail, combinationKey, inputs, mode, wanted, batchId);
        return o.ok ? { status: "COMPLETED", message: `The checker listed ${o.output.forms.length} form${o.output.forms.length === 1 ? "" : "s"} (${o.from === "replay" ? "saved answer, US$0" : `US$${o.costUsd.toFixed(2)}`}).`, costUsd: o.costUsd, detail: { run_file: o.runFile, from: o.from }, value: o }
          : { status: o.blocked ? "BLOCKED" : o.cancelled ? "CANCELLED" : "FAILED", message: o.reason, costUsd: o.costUsd, value: o };
      }) : null;
      if (!r1 || r1.status !== "COMPLETED" || !r2 || r2.status !== "COMPLETED") {
        result.rules_only = printed;
        return this.finish(batchId, r1?.status === "BLOCKED" || r2?.status === "BLOCKED" ? "FAILED" : "FAILED", `AI did not finish (${(r2 ?? r1)?.status?.toLowerCase() ?? "stopped"}): the form numbers printed on the pages are listed for you; nothing was attached.`, result);
      }
      draft = (r1.value as Extract<RoundOut<FormsOut>, { ok: true }>).output.forms.map((p) => ({ ...p, code: normaliseCode(p.code) }));
      check = (r2.value as Extract<RoundOut<FormsOut>, { ok: true }>).output.forms.map((p) => ({ ...p, code: normaliseCode(p.code) }));
    }

    // Rules on both rounds: the quote must be on the page and the number printed on it; then agreement decides.
    // The guide read in step 2 is not a form to find: AI often names it in form style ("IMM 5256" for Guide 5256; seen
    // in both live rounds on 27 Oct). It is already in the library, so it is neither dropped nor attached here.
    const guideNumbers = new Set(pages.filter((p) => p.kind === "guide").map((p) => /guide-(\d{3,5})/.exec(p.url)?.[1]).filter(Boolean));
    const notGuide = (p: Proposal) => !guideNumbers.has(/^IMM (\d{3,5})$/.exec(p.code)?.[1] ?? "");
    const answers = (xs: Proposal[]) => xs.filter(notGuide).map((p) => ({ key: p.code, reading: p.applies, item: p }));
    // P-121 (engine/agreement.ts, shared with S6): rules on both rounds, agreement decides.
    const sentenceOf = new Map(printed.map((x) => [x.code, sameText(x.sentence)]));
    const digits = (c: string) => /\d{3,5}/.exec(c)?.[0] ?? c;
    // Round 4 review M2: or it sits right under a heading or line that prints the number (within 300 characters before it).
    const underIt = (q: string, d: string) => { for (let i = allText.indexOf(q); i >= 0; i = allText.indexOf(q, i + 1)) if (allText.slice(Math.max(0, i - 300), i).includes(d)) return true; return false; };
    const rule = ({ item }: { item: Proposal }) => {
      if (!printedSet.has(item.code)) return `${item.code} is not printed on the pages: AI named it from elsewhere, so it was dropped.`;
      const q = sameText(item.quote ?? "");
      if (!q || !allText.includes(q)) return `The quoted line for ${item.code} is not on the page, so the answer was dropped.`;
      // Break M2: a snippet ("the", ".") is no evidence: the line must be a real phrase that speaks about this form.
      if (q.length < 15 || !(q.includes(digits(item.code)) || (sentenceOf.get(item.code) ?? "").includes(q) || underIt(q, digits(item.code)))) return `The quoted line for ${item.code} does not speak about it (too short, or about something else), so the answer was dropped.`;
      if (!WHO.includes(item.who)) return `The answer for ${item.code} names a person the studio does not know ("${String(item.who).slice(0, 40)}"), so it was dropped.`;
      return null;
    };
    const rounds = compareRounds(answers(draft), answers(check), rule);
    result.dropped.push(...rounds.dropped.map((d) => ({ code: d.key, why: d.why })));
    result.decide.push(...rounds.decide.map((d) => ({ code: d.key, draft: d.draft, check: d.check, why: d.why })));
    const accepted = rounds.agreed.filter((a) => ATTACHABLE.has(a.item.applies)).map((a) => a.item);
    result.not_for.push(...rounds.agreed.filter((a) => !ATTACHABLE.has(a.item.applies)).map((a) => ({ code: a.key, applies: a.item.applies, quote: a.item.quote })));
    const only: string[] | null = plan.only;
    const toFetch = only ? accepted.filter((p) => only.includes(p.code)) : accepted;

    // 5. Each form: from the library, else from canada.ca (its own page, its PDF), stored once.
    const fetched = await this.step(batchId, "finder_fetch", async (set) => {
      if (!toFetch.length) return { status: "COMPLETED", message: mode === "rules" ? "Rules only: nothing to take or download." : "No form to take or download.", value: [] as FinderResult["attach"] };
      const idxHtml = (await this.canada.get(INDEX_URL, "html")).bytes.toString("utf8");
      const rows = parseFormsIndex(idxHtml).rows;
      const out: FinderResult["attach"] = [];
      let n = 0;
      for (const p of toFetch) {
        if (!(await wanted())) break;
        n++;
        await set(`Form ${n} of ${toFetch.length}: ${p.code}`, { detail: { done: n - 1, total: toFetch.length } });
        const got = await this.formFor(b.workspaceId, p, rows, actor.id, batchId).catch((e) => ({ missing: e instanceof CanadaError ? e.message : `Could not get ${p.code}: ${(e as Error).message.slice(0, 200)}` }));
        if ("missing" in got) result.missing.push({ code: p.code, title: p.title, why: got.missing, quote: p.quote });
        else out.push({ ...p, source: got.source, edition: got.edition });
      }
      const dl = out.filter((x) => x.source === "downloaded").length;
      return { status: result.missing.length ? "PARTIAL" : "COMPLETED", message: `${out.length - dl} in the library, ${dl} downloaded from canada.ca, ${result.missing.length} not found. US$0.`, detail: { done: n, total: toFetch.length }, value: out };
    });
    const found = fetched?.value ?? [];

    // 6. Attach with no confirm step (P-123): one change on the forms list, undoable while the draft is open.
    await this.step(batchId, "finder_attach", async () => {
      if (!found.length) return { status: "COMPLETED", message: "Nothing to attach.", value: null };
      const lines = await this.attachFound(b.workspaceId, combinationId, found, actor, batchId);
      for (const f of found) f.line = lines[f.code];
      const failed = found.filter((f) => !lines[f.code]);
      for (const f of failed) result.missing.push({ code: f.code, title: f.title, why: `${f.code} was not attached: it is retired or being retired in the library, or its answer did not fit the line. Check it in Shared library › Forms.`, quote: f.quote });
      const added = Object.values(lines).filter((x) => x === "added").length;
      const removed = Object.values(lines).filter((x) => x === "removed_by_person").length;
      return { status: "COMPLETED", message: `${added} attached automatically (Picked by AI · Sample), ${found.length - added - removed} already on this combination${removed ? `, ${removed} not attached back (a person removed ${removed === 1 ? "it" : "them"})` : ""}.`, value: null };
    });
    result.attach = found.filter((f) => f.line);
    const problems = result.missing.length + result.decide.length + result.dropped.length;
    await this.audit.log(b.workspaceId, actor.id, "found", "form finder", combinationId, `The form finder attached ${found.filter((f) => f.line === "added").length} form${found.length === 1 ? "" : "s"} to "${plan.combination.label}" (Picked by AI · Sample); ${result.missing.length} not found, ${result.decide.length} to decide`, { attach: found.map((f) => f.code), missing: result.missing.map((m) => m.code) }, combinationId);
    return this.finish(batchId, problems ? "PARTIAL" : "COMPLETED", `${found.length} form${found.length === 1 ? "" : "s"} attached or already there, ${result.missing.length} not found, ${result.decide.length} to decide.`, result);
  }

  /** A sure rules match: the one package whose name covers the trail's last names better than any other (US$0). */
  sureMatch(trail: string[], packages: { title: string; url: string }[]) {
    const want = new Set(words(trail.slice(1).join(" ")));
    const last = new Set(words(trail[trail.length - 1] ?? ""));
    const scored = packages.map((p) => { const w = new Set(words(p.title)); const hit = [...want].filter((x) => w.has(x)).length; const lastHit = [...last].filter((x) => w.has(x)).length; return { ...p, score: hit + lastHit * 2 - Math.max(0, w.size - hit), lastAll: lastHit === last.size && last.size > 0 }; })
      .filter((p) => p.score > 0).sort((a, b) => b.score - a.score);
    const uniq = [...new Map(scored.map((s) => [s.url, s])).values()];
    const candidates = uniq.slice(0, 10).map((s) => ({ title: s.title, url: s.url }));
    const [top, second] = uniq;
    const match = top && top.lastAll && (!second || top.score - second.score >= 1.5) ? { title: top.title, url: top.url } : null;
    return { match, candidates };
  }

  // ------------------------------------------------------------------ AI rounds (guarded route only)
  /** Saved runs whose job id starts with this prefix and has the trail fingerprint after it (job ids since the fix). */
  private savedRunsLike(prefix: string): SavedRun[] {
    if (!existsSync(RUNS)) return [];
    return readdirSync(RUNS).filter((f) => f.startsWith(`${prefix}-`) && LIVE_RUN.test(f)).sort(newestFirst).map((f): SavedRun | null => { try { return { ...JSON.parse(readFileSync(join(RUNS, f), "utf8")), file: f }; } catch { return null; } }).filter((r): r is SavedRun => !!r);
  }

  private savedRuns(prefix: string): SavedRun[] {
    if (!existsSync(RUNS)) return [];
    return readdirSync(RUNS).filter((f) => f.startsWith(`${prefix}-live-`) && f.endsWith(".json")).sort().reverse()
      .map((f): SavedRun | null => { try { return { ...JSON.parse(readFileSync(join(RUNS, f), "utf8")), file: f }; } catch { return null; } }).filter((r): r is SavedRun => !!r);
  }

  /** One AI round: replay the newest saved real run of exactly this job (same pages, same prompt), or a guarded live call. */
  async aiRound<T>(kind: AiKind, isCheck: boolean, trail: string, combinationKey: string, inputs: { file: string; sha256: string }[], mode: FinderMode, wanted: () => Promise<boolean>, batchId?: string): Promise<RoundOut<T>> {
    const s = AI_SETTINGS[kind];
    const template = isCheck ? s.check : s.template;
    const base = `studio-finder-${kind === "find_guide" ? "guide" : "forms"}${isCheck ? "-check" : ""}`;
    // Break M5: the trail's own fingerprint makes the job id unique (two siblings never share one, so Stop ends only this run).
    // Round 2 N3: and of this run, so two combinations with the same names (another pathway) never share one either.
    const jobId = `${base}-${slug(trail).slice(0, 40).replace(/_/g, "-")}-${sha(`${batchId ?? ""}|${trail}`).slice(0, 8)}`;
    const tsha = sha(readFileSync(join(PROMPTS, template)));
    const same = (r: SavedRun) => r?.drafting_run?.status === "completed" && r.contract_valid === true && r.launch_evidence?.template_sha256 === tsha && JSON.stringify(r.drafting_run?.inputs?.official_files) === JSON.stringify(inputs) && runKey(r) === combinationKey && typeof r.raw_output === "string";
    if (mode === "replay") {
      // Break M7, round 2 N4, round 3 R3-2: a saved answer is found by what the AI was given (the same pages, the same prompt)
      // and by the combination's key, never by a file name or names; another combination's answer is never reused. Round 2 m-a: an
      // unreadable or wrong-shape answer is skipped and an older good one is used.
      const mine = new RegExp(`^${base}-${isCheck ? "" : "(?!check-)"}.+-live-\\d{8}t\\d{9}z-[a-z0-9]+\\.json$`);
      const r = (existsSync(RUNS) ? readdirSync(RUNS).filter((f) => mine.test(f)).sort(newestFirst) : []).map((f): SavedRun | null => { try { return { ...JSON.parse(readFileSync(join(RUNS, f), "utf8")), file: f }; } catch { return null; } }).find((x): x is SavedRun => !!x && same(x) && (() => { try { return shapeOk(kind, JSON.parse(String(x.raw_output))); } catch { return false; } })());
      if (!r) return { ok: false, costUsd: 0, reason: "No saved AI answer for these exact pages yet. Run it live once (its cost is shown first) or use rules only." };
      const saved = JSON.parse(String(r.raw_output)) as T;
      if (!shapeOk(kind, saved)) return { ok: false, costUsd: 0, reason: "The saved AI answer does not have the expected shape. Run it live or use rules only." };
      return { ok: true, output: saved, costUsd: 0, from: "replay", runFile: `prototype/p2/runs/${r.file}` };
    }
    const job = { job_id: jobId, kind, combination: combinationKey, configuration_version: "s4-form-finder", template, output_schema: s.schema, inputs,
      settings: { provider_route: ROUTE, model: MODEL, effort: s.effort, timeout_ms: 300_000, max_attempts: 2, budget_usd: 1, max_output_tokens: s.max_output_tokens }, known: { combination_trail: trail } };
    mkdirSync(JOBS, { recursive: true });
    writeFileSync(join(JOBS, `${jobId}.json`), JSON.stringify(job, null, 1) + "\n");
    if (batchId) this.liveJobs.set(batchId, jobId);
    try { return await this.launchRound<T>(kind, jobId, wanted); } finally {
      // Review major 7: the job file is only the launcher's input; the run record keeps it. Nothing is left in the source tree.
      if (batchId) this.liveJobs.delete(batchId);
      rmSync(join(JOBS, `${jobId}.json`), { force: true });
    }
  }

  /** The job running now for each finder run (its exact launcher job id), so Stop ends that call and no other. */
  private liveJobs = new Map<string, string>();

  private async launchRound<T>(kind: AiKind, jobId: string, wanted: () => Promise<boolean>): Promise<RoundOut<T>> {
    const last = (out: string) => { for (const l of out.trim().split("\n").reverse()) { try { return JSON.parse(l); } catch { /* not JSON */ } } return null; };
    const stub = await this.sources.launchOnce(jobId, "stub");
    const sj = last(stub.out);
    if (stub.stopped) return { ok: false, cancelled: true, costUsd: 0, reason: "Stopped during the free stub pass: nothing was sent." };
    if (stub.code !== 0) return { ok: false, costUsd: 0, reason: `The guarded AI route refused the job before any call: ${String(sj?.refused ?? stub.err).trim().slice(-300) || `the launcher stopped (exit ${stub.code})`}` };
    const live = await this.sources.launchOnce(jobId, "live", wanted);
    if (live.cancelled) return { ok: false, cancelled: true, costUsd: 0, reason: "Stopped before the AI call was sent: nothing was charged." };
    if (live.stopped) return { ok: false, cancelled: true, costUsd: 0, reason: "Stopped while the AI call ran: the call was ended. It stays counted at its reserved worst case (the provider may still bill it); nothing of it is used." };
    const lj = last(live.out);
    if (!lj?.run_file) {
      const why = String(lj?.refused ?? lj?.error ?? live.err.split("\n").filter(Boolean).slice(-2).join(" ")).trim() || `the launcher stopped (exit ${live.code})`;
      const limit = /usage limit/i.test(why + live.err);
      return { ok: false, blocked: limit, costUsd: 0, reason: limit ? "The AI provider's usage limit refused the call before any processing: nothing was charged. Use saved AI answers or rules only, or try later." : `The AI step did not run: ${why.slice(0, 300)}` };
    }
    const rec = JSON.parse(readFileSync(lj.run_file, "utf8"));
    const cost = Number(rec.drafting_run?.usage?.cost_usd ?? 0);
    if (rec.drafting_run?.status !== "completed" || rec.contract_valid !== true || typeof rec.raw_output !== "string") {
      const limit = /usage limit/i.test(JSON.stringify(rec.drafting_run?.attempts ?? []));
      return { ok: false, blocked: limit, costUsd: limit ? 0 : cost, reason: limit ? "The AI provider's usage limit refused the call before any processing: nothing was charged." : `The AI answer could not be used (${rec.drafting_run?.status ?? "no status"}${rec.output_errors ? ": it did not match the expected shape" : ""}). Nothing was attached.` };
    }
    let output: T; try { output = JSON.parse(rec.raw_output); } catch { return { ok: false, costUsd: cost, reason: "The AI answer was not readable. Nothing was attached." }; }
    if (!shapeOk(kind, output)) return { ok: false, costUsd: cost, reason: "The AI answer did not have the expected shape. Nothing was attached." };
    return { ok: true, output, costUsd: cost, from: "live", runFile: String(lj.run_file).replace(`${SOLUTION}/`, "") };
  }

  /** Q-L1: a hand upload is an official download when its checksum equals the PDF behind the canada.ca form page's link
   *  (canada.ca's list → the form's page → its PDF). Returns the form page, or null (not equal, not found, canada.ca
   *  not answering: the upload is then held for a second person as before). */
  async fingerprintMatch(workspaceId: string, code: string, fileSha: string, stored: string, fileName: string, bytes: number, by: string): Promise<string | null> {
    try {
      const rows = parseFormsIndex((await this.canada.get(INDEX_URL, "html")).bytes.toString("utf8")).rows;
      const row = rows.find((r) => normaliseCode(r.code) === normaliseCode(code));
      if (!row) return null;
      const page = parseFormPage((await this.canada.get(row.pageUrl, "html")).bytes.toString("utf8"));
      const pdfUrl = page.pdfUrls.find((u) => officialUrl(u).ok);
      if (!pdfUrl) return null;
      const pdf = await this.canada.get(pdfUrl, "pdf");
      if (pdf.sha256 !== fileSha) return null;
      await this.db.officialDownload.createMany({ data: [{ workspaceId, sha256: fileSha, kind: row.kind, code: normaliseCode(code), edition: null, title: row.title, formPageUrl: row.pageUrl, sourceUrl: pdfUrl, fileName, storedPath: stored.replace(`${ROOT}/`, ""), bytes, basis: "fingerprint_match", startedBy: by }], skipDuplicates: true });
      return row.pageUrl;
    } catch (e) {
      if (e instanceof CanadaError) return null;
      throw e;
    }
  }

  // ------------------------------------------------------------------ library: store once
  private libDir() { const d = join(VAR("demo"), "library"); mkdirSync(d, { recursive: true }); return d; }

  /** A guide page goes into the library once (M5): identified by its text fingerprint, read by AI, never filled. */
  private async storeGuide(workspaceId: string, url: string, title: string, html: string, bytes: Buffer, by: string, batchId: string | null) {
    const code = /guide\s*(\d{3,5})/i.exec(title)?.[1] ?? /guide-(\d{3,5})/.exec(url)?.[1];
    if (!code) return;
    const key = `Guide ${code}`, fp = textFingerprint(html);
    // The page's own "Date modified" when it prints one; otherwise the label says when it was read (never presented as IRCC's date).
    const modified = /dateModified[^0-9]*([0-9]{4}-[0-9]{2}-[0-9]{2})/.exec(html)?.[1] ?? /Date modified:[^0-9]*([0-9]{4}-[0-9]{2}-[0-9]{2})/.exec(html)?.[1] ?? null;
    const label = `${key} (${modified ?? `read ${new Date().toISOString().slice(0, 10)}`})`;
    const fileSha = sha(bytes);
    const stored = join(this.libDir(), `${fileSha.slice(0, 12)}-guide-${code}.html`);
    if (!existsSync(stored)) writeFileSync(stored, bytes);
    await this.db.$transaction(async (tx) => {
      const def = await tx.govFormDef.upsert({ where: { workspaceId_formKey: { workspaceId, formKey: key } }, update: { formPageUrl: url }, create: { workspaceId, formKey: key, displayName: title.replace(/^guide\s*\d+\s*[-–:]?\s*/i, "") || key, formKind: "guide", formPageUrl: url } });
      const have = await tx.formEdition.findFirst({ where: { workspaceId, govFormDefId: def.id, contentSha256: fp } });
      if (have) { await tx.formEdition.update({ where: { id: have.id }, data: { checkedAt: new Date() } }); return; }
      await tx.formEdition.createMany({ data: [{ workspaceId, govFormDefId: def.id, editionLabel: label, sha256: fileSha, contentSha256: fp, storedPath: stored.replace(`${ROOT}/`, ""), origin: "DOWNLOADED", formPageUrl: url, sourceUrl: url, canadaUpdated: modified, checkedAt: new Date(), acceptedChannels: "READ_BY_AI", acceptedBasis: null }], skipDuplicates: true });
      await tx.officialDownload.createMany({ data: [{ workspaceId, sha256: fileSha, kind: "guide", code: key, edition: label, title, formPageUrl: url, sourceUrl: url, fileName: basename(stored), storedPath: stored.replace(`${ROOT}/`, ""), bytes: bytes.length, basis: "download", batchId, startedBy: by }], skipDuplicates: true });
    });
  }

  /** One form for the combination: the library's current edition, or its PDF downloaded from canada.ca (M2, M6). */
  private async formFor(workspaceId: string, p: Proposal, rows: { code: string; title: string; pageUrl: string; kind: string }[], by: string, batchId: string): Promise<{ source: "library" | "downloaded" | "newer_file"; edition: string | null } | { missing: string }> {
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: p.code } }, include: { editions: true } });
    if (def?.retiredAt) return { missing: `${p.code} is retired in the library: restore it there, or upload a newer edition.` };
    const usable = await this.usableEditions(workspaceId, def?.editions ?? []);
    const row = rows.find((r) => normaliseCode(r.code) === p.code);
    if (usable.length) {
      // In the library: used as it is. canada.ca is still compared (US$0), so a republished file or a newer edition is
      // noticed (M6) and the library shows when it last checked (m5); canada.ca not answering changes nothing.
      const mine = { source: "library" as const, edition: newestEdition(usable)!.editionLabel };
      if (!row) return mine;
      try {
        const fp = parseFormPage((await this.canada.get(row.pageUrl, "html")).bytes.toString("utf8"));
        const pdfUrl = fp.pdfUrls.find((u) => officialUrl(u).ok);
        if (!pdfUrl) return mine;
        const pdf = await this.canada.get(pdfUrl, "pdf");
        if (def && !def.formPageUrl) await this.db.govFormDef.update({ where: { id: def.id }, data: { formPageUrl: row.pageUrl } });
        if (usable.some((e) => e.sha256 === pdf.sha256)) { await this.db.formEdition.updateMany({ where: { workspaceId, sha256: pdf.sha256 }, data: { checkedAt: new Date(), canadaUpdated: fp.lastUpdated, formPageUrl: row.pageUrl, sourceUrl: pdfUrl } }); return mine; }
        const r = await this.storeDownloaded(workspaceId, p, row, fp, pdfUrl, pdf.bytes, by, batchId);
        return "missing" in r ? mine : r;
      } catch (e) { if (e instanceof CanadaError) return mine; throw e; }
    }
    if (!row) return { missing: `${p.code} is not on canada.ca's list of forms. It may be a visa-office document: upload its PDF.` };
    const page = await this.canada.get(row.pageUrl, "html");
    const fp = parseFormPage(page.bytes.toString("utf8"));
    const pdfUrl = fp.pdfUrls.find((u) => officialUrl(u).ok);
    if (!pdfUrl) return { missing: `${p.code}'s canada.ca page has no PDF to download (it may be online only). Upload its PDF if IRCC publishes one.` };
    const pdf = await this.canada.get(pdfUrl, "pdf");
    return this.storeDownloaded(workspaceId, p, row, fp, pdfUrl, pdf.bytes, by, batchId);
  }

  /** Editions a combination may use: PDF, and on the manifest, approved in the product or officially downloaded. */
  private async usableEditions<E extends { sha256: string | null; channel: string }>(workspaceId: string, editions: E[]): Promise<E[]> {
    const shas = editions.map((e) => e.sha256).filter(Boolean) as string[];
    if (!shas.length) return [];
    const ok = new Set([...manifest().map((i) => i.sha256), ...(await this.db.approvedSource.findMany({ where: { workspaceId, sha256: { in: shas } }, select: { sha256: true } })).map((x) => x.sha256), ...(await this.db.officialDownload.findMany({ where: { workspaceId, sha256: { in: shas } }, select: { sha256: true } })).map((x) => x.sha256)]);
    return editions.filter((e) => e.channel !== "ONLINE" && e.sha256 && ok.has(e.sha256));
  }

  /** Reads the downloaded file's identity (rules, no AI), checks it is the form asked for, and stores it once. */
  private async storeDownloaded(workspaceId: string, p: Proposal, row: { code: string; title: string; pageUrl: string; kind: string }, page: { lastUpdated: string | null }, pdfUrl: string, bytes: Buffer, by: string, batchId: string): Promise<{ source: "library" | "downloaded" | "newer_file"; edition: string | null } | { missing: string }> {
    const fileSha = sha(bytes);
    const name = basename(new URL(pdfUrl).pathname).replace(/[^A-Za-z0-9._-]/g, "_").slice(-80);
    const stored = join(this.libDir(), `${fileSha.slice(0, 12)}-${name}`);
    if (!existsSync(stored)) writeFileSync(stored, bytes);
    const { stdout } = await run(PY, ["-I", join(STUDIO, "tools", "read_form_identity.py"), stored], { cwd: ROOT, timeout: 60_000 });
    const id = JSON.parse(stdout.trim().split("\n").pop()!);
    if (!id.ok || !id.code || !id.edition_label) return { missing: `${p.code} was downloaded from canada.ca, but its form number and edition could not be read from the file. Upload it by hand for a person to check.` };
    if (normaliseCode(id.code) !== p.code) return { missing: `canada.ca's file for ${p.code} reads as ${id.code}: not stored. Upload the right PDF by hand.` };
    if (id.language === "fr") return { missing: `canada.ca's file for ${p.code} is the French version: not stored.` };
    const kind = row.kind === "checklist" || id.kind === "checklist" ? "checklist" : "form";
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: p.code } }, include: { editions: true } });
    const same = def?.editions.find((e) => e.sha256 === fileSha);
    if (same) return { source: "library", edition: same.editionLabel };
    const sameLabel = await this.db.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId, editionLabel: id.edition_label } } });
    // M6: IRCC republished the same printed edition under a new file: the library's edition stays in use; a person decides.
    if (sameLabel) { await this.db.formEdition.update({ where: { id: sameLabel.id }, data: { newerFileSha256: fileSha, checkedAt: new Date() } }); return { source: "newer_file", edition: sameLabel.editionLabel }; }
    const pdfEditions = (def?.editions ?? []).filter((e) => e.channel !== "ONLINE");
    if (pdfEditions.length && editionMonth(id.edition_label) > editionMonth(newestEdition(pdfEditions)!.editionLabel)) {
      // A newer printed edition: held for today's edition impact review; the combination keeps the current edition.
      await this.recordDownload(workspaceId, fileSha, kind, p.code, id.edition_label, id.title ?? row.title, row.pageUrl, pdfUrl, stored, bytes.length, by, batchId);
      await this.db.intakeItem.createMany({ data: [{ workspaceId, fileName: name, storedPath: stored.replace(`${ROOT}/`, ""), sha256: fileSha, bytes: bytes.length, kind, code: p.code, title: id.title ?? row.title, editionLabel: id.edition_label, published: id.published ?? null, outcome: "new_edition_held", status: "HELD", reason: `Newer than the library's ${newestEdition(pdfEditions)!.editionLabel} (downloaded from canada.ca)`, createdBy: by, irccPage: row.pageUrl }], skipDuplicates: true });
      return { source: "library", edition: newestEdition(pdfEditions)!.editionLabel };
    }
    if (pdfEditions.length) return { source: "library", edition: newestEdition(pdfEditions)!.editionLabel }; // older on canada.ca: keep ours
    await this.recordDownload(workspaceId, fileSha, kind, p.code, id.edition_label, id.title ?? row.title, row.pageUrl, pdfUrl, stored, bytes.length, by, batchId);
    const accepted = kind === "checklist" ? "READ_BY_AI" : channelsFrom(p.filed_note); // never invented: no line, no value
    try {
      await this.db.$transaction(async (tx) => {
        const d = def ?? (await tx.govFormDef.upsert({ where: { workspaceId_formKey: { workspaceId, formKey: p.code } }, update: {}, create: { workspaceId, formKey: p.code, displayName: id.title || row.title || p.code, formKind: kind === "checklist" ? "checklist" : "data_form", formPageUrl: row.pageUrl } }));
        await tx.formEdition.create({ data: { workspaceId, govFormDefId: d.id, editionLabel: id.edition_label, sha256: fileSha, storedPath: stored.replace(`${ROOT}/`, ""), origin: "DOWNLOADED", formPageUrl: row.pageUrl, sourceUrl: pdfUrl, canadaUpdated: page.lastUpdated, checkedAt: new Date(), acceptedChannels: accepted, acceptedBasis: accepted ? "AI_SAMPLE" : null, acceptedQuote: accepted ? p.filed_note : null } });
      });
    } catch (e) {
      // Another run stored the same edition a moment ago: use it (nothing is downloaded twice into the library).
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
    return { source: "downloaded", edition: id.edition_label };
  }

  private async recordDownload(workspaceId: string, fileSha: string, kind: string, code: string, edition: string, title: string | null, pageUrl: string, pdfUrl: string, stored: string, bytes: number, by: string, batchId: string) {
    await this.db.officialDownload.createMany({ data: [{ workspaceId, sha256: fileSha, kind, code, edition, title, formPageUrl: pageUrl, sourceUrl: pdfUrl, fileName: basename(stored), storedPath: stored.replace(`${ROOT}/`, ""), bytes, basis: "download", batchId, startedBy: by }], skipDuplicates: true });
  }

  /** Attaches every found form as a draft line (AI_FOUND), as one change for Undo. Never raises a duplicate. */
  private async attachFound(workspaceId: string, combinationId: string, found: FinderResult["attach"], actor: Actor, batchId: string): Promise<Record<string, "added" | "already" | "removed_by_person">> {
    const { oneAtATime } = await import("./form-uses.ts");
    return oneAtATime(combinationId, () => this.attachFoundNow(workspaceId, combinationId, found, actor, batchId));
  }
  private async attachFoundNow(workspaceId: string, combinationId: string, found: FinderResult["attach"], actor: Actor, batchId: string): Promise<Record<string, "added" | "already" | "removed_by_person">> {
    const out: Record<string, "added" | "already" | "removed_by_person"> = {};
    const { addFormLine } = await import("./form-lines.ts");
    const { snapshotLines, recordAction } = await import("./form-uses.ts");
    const codes = found.map((f) => f.code);
    const before = await snapshotLines(this.db, combinationId, codes);
    for (const f of found) {
      // S5 ask: a form a person removed from this combination is never attached back by Find again or Redo ("Add back").
      const newest = before.filter((r) => r.lineageKey === f.code).sort((a, b) => b.version - a.version)[0];
      if (newest?.status === "RETIRED") { out[f.code] = "removed_by_person"; continue; }
      const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: f.code } } });
      if (!def) continue;
      // Round 2 N2: a retired form, or one with a retire or delete open, is not attached (listed as missing instead).
      if (def.retiredAt || (await this.db.libraryChange.count({ where: { workspaceId, kind: "library_form", key: def.formKey, action: { in: ["RETIRE", "DELETE"] }, status: { in: ["WAITING", "APPROVED"] } } }))) continue;
      try { out[f.code] = await addFormLine(this.db, { workspaceId, combinationId, govFormDefId: def.id, formKey: f.code, who: f.who, origin: "AI_FOUND", by: actor.id, sourceQuote: f.quote,
        attachMode: f.applies === "always" ? "COMBINATION_MANDATORY" : "ANSWER_CONDITIONAL", conditionPlain: f.applies === "always" ? null : (f.condition ?? f.quote).slice(0, 300), finderBatchId: batchId }); } catch { /* reported as not attached below */ }
    }
    if (Object.values(out).includes("added")) await recordAction(this.db, { workspaceId, combinationId, action: "finder_attach", codes, before, by: actor.id, batchId });
    return out;
  }

  // ------------------------------------------------------------------ views
  async view(batchId: string) {
    const b = await this.db.aiBatch.findUnique({ where: { id: batchId }, include: { jobs: { orderBy: { startedAt: "asc" } } } });
    if (!b || b.operation !== FINDER_OPERATION) throw problem(404, "Not found", "This form-finder run no longer exists (the demo workspace may have been reset).");
    const plan = b.plan as unknown as FinderPlan;
    const spent = round2(b.jobs.reduce((a, j) => a + (j.costUsd ?? 0), 0));
    const steps = STEPS.map((s, i) => { const j = b.jobs.find((x) => x.kind === s.kind); return { n: i + 1, kind: s.kind, label: s.label, status: j?.status ?? "WAITING", message: j?.message ?? null, usd: j?.costUsd ?? 0, started_at: j?.status === "WAITING" ? null : j?.startedAt ?? null, finished_at: j?.finishedAt ?? null, counts: countsOf(j?.detail)?.total ? { done: countsOf(j!.detail)!.done ?? 0, total: countsOf(j!.detail)!.total!, unit: "forms" } : null }; });
    const current = steps.find((s) => s.status === "RUNNING") ?? null;
    return { id: b.id, label: plan.operation_label, combination: plan.combination, mode: plan.mode, status: b.status, message: b.message, step: current ? { n: current.n, m: steps.length, label: current.label } : null, steps,
      started_at: b.startedAt, finished_at: b.finishedAt, elapsed_ms: (b.finishedAt ?? new Date()).getTime() - b.startedAt.getTime(), usd: { spent, worst: b.worstCaseUsd }, result: plan.result ?? null, sample_note: "Which forms apply is Sample until the immigration expert confirms." };
  }

  /** Load sample (S4 change 4, US$0; Lead note 28 Oct): each library form gets its canada.ca page, "Last updated" and PDF
   *  link from the recorded copies (rules), and what IRCC accepts from a saved real finder answer that quotes how it is
   *  filed (AI · Sample) or else from the Sample fixtures (samples/form-library-sample.json: IRCC's own sentence on the
   *  recorded page). Each sample combination's guide comes from the fixtures too, by the combination's key; rules find
   *  it for a combination the fixtures do not name. Nothing is invented: what neither names stays "Not set yet" (C11.18). */
  async fillSample(workspaceId: string, fixtureFile?: string): Promise<{ pages: number; accepts: number; acceptsSaved: number; guides: number; noGuide: string[]; notUsed: string[]; note: string | null }> {
    let pages = 0, accepts = 0, acceptsSaved = 0, guides = 0;
    const noGuide: string[] = [];
    const fx = sampleFixtures(fixtureFile), notUsed = [...fx.problems];
    const defs = await this.db.govFormDef.findMany({ where: { workspaceId, formKind: { not: "guide" } }, include: { editions: true } });
    let rows: { code: string; pageUrl: string }[] = [];
    let packages: Candidate[] = [];
    try { const idx = parseFormsIndex((await this.canada.get(INDEX_URL, "html")).bytes.toString("utf8")); rows = idx.rows; packages = idx.packages; } catch (e) { if (!(e instanceof CanadaError)) throw e; return { pages, accepts, acceptsSaved, guides, noGuide, notUsed, note: `canada.ca's list could not be read (${e.message})` }; }
    const guideCount = () => this.db.govFormDef.count({ where: { workspaceId, formKind: "guide" } });
    for (const c of await this.db.combination.findMany({ where: { workspaceId }, select: { id: true, label: true, combinationKey: true } })) {
      try {
        const named = fx.guides[c.combinationKey];
        let guide: { url: string; bytes: Buffer; text: string } | null = null;
        if (named) {
          if (!named.url) { noGuide.push(`${c.label}: ${named.why ?? "no guide"}`); continue; }
          const bytes = named.recorded ? recordedCopy(named.url, named.recorded) : (await this.canada.get(named.url, "html")).bytes;
          guide = { url: named.url, bytes, text: named.url.split("/").pop()!.replace(/\.html$/, "") };
        } else {
          // Review major 2: a combination the fixtures do not name: its guide by rules alone (a sure match, US$0).
          const { trail } = await trailOf(this.db, c.id);
          const sure = this.sureMatch(trail, packages).match;
          if (!sure) { noGuide.push(`${c.label}: no sure match on canada.ca's list`); continue; }
          const html = (await this.canada.get(sure.url, "html")).bytes.toString("utf8");
          const want = new Set(words(trail.slice(1).join(" ")));
          const link = pageLinks(html, sure.url).filter((l) => /\/guide-\d+/.test(l.url) || /^guide \d+/i.test(l.text)).map((l, i) => ({ l, i, s: words(`${l.text} ${l.url.split("/").pop()}`).filter((w) => want.has(w)).length })).sort((a, b) => b.s - a.s || a.i - b.i)[0]?.l;
          if (!link) { noGuide.push(`${c.label}: its application page links no guide`); continue; }
          guide = { url: link.url, bytes: (await this.canada.get(link.url, "html")).bytes, text: link.text };
        }
        const gh = guide.bytes.toString("utf8"), before = await guideCount();
        await this.storeGuide(workspaceId, guide.url, (/<title>([^<]*)<\/title>/i.exec(gh)?.[1] ?? guide.text).replace(/\s*-\s*Canada\.ca\s*$/i, "").trim(), gh, guide.bytes, "system", null);
        guides += (await guideCount()) - before;
      } catch (e) { if (!(e instanceof CanadaError)) throw e; noGuide.push(`${c.label}: ${e.message}`); }
    }
    const notes = new Map<string, string>();
    // Every saved real finder answer, of any combination (both rounds): file names studio-finder-forms[-check]-<place>-live-….
    // What IRCC accepts is the form's own, whichever combination the answer was for.
    const saved = existsSync(RUNS) ? readdirSync(RUNS).filter((f) => f.startsWith("studio-finder-forms-") && LIVE_RUN.test(f)).sort(newestFirst) : [];
    for (const f of saved) {
      let out: FormsOut | null = null; try { const r = JSON.parse(readFileSync(join(RUNS, f), "utf8")) as SavedRun; if (r.drafting_run?.status !== "completed" || r.contract_valid !== true) continue; out = JSON.parse(String(r.raw_output)) as FormsOut; } catch { continue; }
      for (const f of out?.forms ?? []) { const c = normaliseCode(f.code); if (f.filed_note && channelsFrom(f.filed_note) && !notes.has(c)) notes.set(c, f.filed_note); }
    }
    for (const d of defs) {
      const current = newestEdition(d.editions.filter((e) => e.channel !== "ONLINE"));
      if (!current) continue;
      const row = rows.find((x) => normaliseCode(x.code) === normaliseCode(d.formKey));
      const fixedPage = fx.pages[normaliseCode(d.formKey)];
      if (!d.formPageUrl && (row || fixedPage)) {
        try {
          if (row) {
            const fp = parseFormPage((await this.canada.get(row.pageUrl, "html")).bytes.toString("utf8"));
            const pdfUrl = fp.pdfUrls.find((u) => officialUrl(u).ok) ?? null;
            await this.db.formEdition.update({ where: { id: current.id }, data: { formPageUrl: row.pageUrl, canadaUpdated: fp.lastUpdated, checkedAt: new Date(), ...(pdfUrl ? { sourceUrl: pdfUrl } : {}) } });
          }
          const url = row?.pageUrl ?? fixedPage!.url;
          if (!row) await this.db.formEdition.update({ where: { id: current.id }, data: { formPageUrl: url } });
          await this.db.govFormDef.update({ where: { id: d.id }, data: { formPageUrl: url } });
          pages++;
        } catch (e) {
          if (!(e instanceof CanadaError)) throw e;
          // The form's own page is not among the recorded copies: canada.ca's own list still names its address (rules).
          await this.db.govFormDef.update({ where: { id: d.id }, data: { formPageUrl: row!.pageUrl } });
          await this.db.formEdition.update({ where: { id: current.id }, data: { formPageUrl: row!.pageUrl } });
          pages++;
        }
      }
      if (current.acceptedChannels || d.formKind === "document" || d.formKind === "checklist") continue;
      const note = notes.get(normaliseCode(d.formKey)), fixed = fx.accepts[normaliseCode(d.formKey)];
      if (note) { await this.db.formEdition.update({ where: { id: current.id }, data: { acceptedChannels: channelsFrom(note), acceptedBasis: "AI_SAMPLE", acceptedQuote: note.slice(0, 400) } }); accepts++; acceptsSaved++; }
      else if (fixed) {
        // Nothing invented: the fixture's line must be on this form's own recorded canada.ca page.
        const page = d.formPageUrl ?? (await this.db.govFormDef.findUnique({ where: { id: d.id }, select: { formPageUrl: true } }))?.formPageUrl;
        let said = false;
        if (page) try { said = sameText(pageText((await this.canada.get(page, "html")).bytes.toString("utf8"))).includes(sameText(fixed.quote)); } catch (e) { if (!(e instanceof CanadaError)) throw e; }
        if (!said) { notUsed.push(`${d.formKey}: its line is not on its recorded canada.ca page`); continue; }
        await this.db.formEdition.update({ where: { id: current.id }, data: { acceptedChannels: fixed.channels, acceptedBasis: "SAMPLE_FIXTURE", acceptedQuote: fixed.quote.slice(0, 400) } }); accepts++;
      }
    }
    return { pages, accepts, acceptsSaved, guides, noGuide, notUsed, note: null };
  }

  /** Stop: no step starts after it and no AI call is sent after it; a call already sent is recorded at its cost (the
   *  launcher process is ended in slice 2, M7). Finished steps keep their results. */
  async stop(actor: Actor, batchId: string) {
    need(actor, "author");
    const b = await this.db.aiBatch.findUnique({ where: { id: batchId } });
    if (!b || b.operation !== FINDER_OPERATION) throw problem(404, "Not found", "This form-finder run no longer exists.");
    if (!["QUEUED", "RUNNING"].includes(b.status)) throw problem(409, "Already ended", `This run has already ended (${b.status.toLowerCase()}).`);
    await this.db.aiBatch.update({ where: { id: batchId }, data: { cancelRequested: true, message: "Stopping" } });
    // M7: an AI round running now is ended (its launcher's process group): terminate, then force after 10 s.
    const live = this.liveJobs.get(batchId);
    if (live) this.sources.stopLaunches((jobId) => jobId === live);
    await this.audit.log(b.workspaceId, actor.id, "stopped", "form finder", batchId, `${actor.name} stopped the form finder for ${b.scopeLabel.split("|")[1] ?? "a combination"}`);
    return this.view(batchId);
  }

  /** GET /combinations/:id/forms/find/latest (S5's Forms tab, one read): every form the newest finder run proposed, with
   *  its state now (a person may have removed it, or uploaded it, since the run). TO_DECIDE and NOT_FOR_THIS_APPLICATION
   *  are added to S5's six states: the two AI rounds disagreed (a person decides, P-121), or the page names it as a
   *  separate application. */
  async latestForms(combinationId: string) {
    const run = await this.latest(combinationId);
    if (!run) return { run: null, forms: [] };
    const r: FinderResult | null = run.result;
    const codes = [...(r?.attach ?? []).map((a) => a.code), ...(r?.missing ?? []).map((m) => m.code), ...(r?.decide ?? []).map((d) => d.code), ...(r?.not_for ?? []).map((n) => n.code)];
    const lines = await this.db.combinationForm.findMany({ where: { combinationId, lineageKey: { in: codes } }, orderBy: { version: "desc" } });
    const line = (c: string) => lines.find((l) => l.lineageKey === c);
    const held = await this.db.intakeItem.findMany({ where: { forCombinationId: combinationId, forCode: { in: codes }, status: "HELD" }, select: { forCode: true } });
    const stateOf = (c: string, base: string) => { const l = line(c); if (l?.status === "RETIRED") return "REMOVED_BY_PERSON"; if (base === "NOT_FOUND" && l) return "ATTACHED"; if (base === "NOT_FOUND" && held.some((h) => h.forCode === c)) return "UPLOAD_WAITING_SECOND_PERSON"; return base; };
    const forms = [
      ...(r?.attach ?? []).map((a) => ({ code: a.code, title: a.title, quote: a.quote, conditionPlain: a.applies === "always" ? null : a.condition ?? a.quote, who: a.who, state: stateOf(a.code, a.source === "downloaded" ? "DOWNLOADED_ATTACHED" : a.source === "newer_file" ? "NEWER_FILE_SAME_EDITION" : "ATTACHED") })),
      ...(r?.missing ?? []).map((m) => ({ code: m.code, title: m.title, quote: m.quote, conditionPlain: null, who: null, state: stateOf(m.code, "NOT_FOUND"), why: m.why })),
      ...(r?.decide ?? []).map((d) => ({ code: d.code, title: (d.draft ?? d.check)?.title ?? null, quote: (d.draft ?? d.check)?.quote ?? null, conditionPlain: (d.draft ?? d.check)?.condition ?? null, who: (d.draft ?? d.check)?.who ?? null, state: stateOf(d.code, "TO_DECIDE"), why: d.why })),
      ...(r?.not_for ?? []).map((n) => ({ code: n.code, title: null, quote: n.quote, conditionPlain: null, who: null, state: "NOT_FOR_THIS_APPLICATION" })),
    ].map((f) => ({ ...f, lineId: line(f.code)?.id ?? null, lineVersion: line(f.code)?.version ?? null, runId: run.id }));
    return { run: { id: run.id, status: run.status, mode: run.mode, finished_at: run.finished_at }, forms, sample_note: run.sample_note };
  }

  /** The combination's newest finder run (S5's Forms tab reads this; slice 1 serves it to the scripted journey). */
  async latest(combinationId: string) {
    const b = await this.db.aiBatch.findFirst({ where: { operation: FINDER_OPERATION, scopeLabel: { startsWith: `${combinationId}|` } }, orderBy: { startedAt: "desc" } });
    return b ? this.view(b.id) : null;
  }
}

export { STEPS as FINDER_STEPS };
