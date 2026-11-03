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
import { CHANNELS, throughAccount, IRCC_ACCOUNTS, type Channel } from "../../contracts/forms.ts";
import { acceptsWords } from "../../contracts/form-library.ts";
import { START } from "../../contracts/start-setup.ts";
import { HttpException, HttpStatus, Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { manifest, slug } from "../../engine/import.ts";
import { editionMonth, newestEdition } from "../../engine/programs.ts";
import { libraryType } from "../../engine/form-type.ts";
import { compareRounds } from "../../engine/agreement.ts";
import { mentionsOf, officialUrl, pageLinks, pageText, parseFormPage, parseFormsIndex, textFingerprint } from "../../engine/canada.ts";
import { FinderBody, FinderLaunchBody, normaliseCode, type FinderMode } from "../../contracts/form-library.ts";
import { canadaSource, CanadaError, type CanadaSource } from "./canada.ts";
import { ACTORS, Audit, Db, need, PROTOTYPE, PY, ROOT, STUDIO, VAR, Workspace, type Actor } from "./core.ts";
import { aboutUsd, lastFinishedUsd } from "./finder-cost.ts";
import { aiLive, overrideOf, Sources, type LaunchOverride } from "./sources.ts";
import { checkOverride, costPlanNow, endedOverrides, spendOverride } from "./cost-gate.ts";
import { channelProposal, channelsFrom, channelsRead, recordedCopy, sampleFixtures, type ChannelProposal, type ChannelReading } from "./filing.ts";
import { WHO } from "./studio.ts";
import { linkFinderGuides } from "./guide-sources.ts";
import { LIVE_RUN, newestFirst, StepRunner, worstRoundUsd, type AiStep, type RoundOut, type SavedRun } from "./rounds.ts";
import { otherPages } from "../../engine/rounds.ts";
import { MAX_ATTEMPTS, OVERRIDE_TTL_MS } from "../../../p2/policy.ts";
import { forgetDeletion } from "./library-deletions.ts";
import { aiNamesOf, fullTrail, trailWords } from "../../engine/structure.ts";

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
// Break R5-1 (a stub pass is never replayed) and the saved-run key: engine/rounds.ts, shared by every AI step.
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
const RUNS = join(PROTOTYPE, "p2", "runs"), INVENTORY = join(PROTOTYPE, "p1", "inventory");
/** The finder's two AI steps on the shared step runner (api/src/rounds.ts): a draft and a blind checker round each. */
const FINDER_WORDS = { noSaved: "No saved AI answer for these exact pages yet. Run it live once (its cost is shown first) or use rules only.", badSaved: "The saved AI answer does not have the expected shape. Run it live or use rules only.", nothingUsed: "Nothing was attached." };
const AI_SETTINGS: Record<"find_guide" | "find_forms", AiStep> = {
  find_guide: { kind: "find_guide", jobBase: "studio-finder-guide", configurationVersion: "s4-form-finder", template: "find-guide.v1.md", check: "find-guide-check.v1.md", schema: "find-guide-output.v1.schema.json", effort: "low", max_output_tokens: 3000, shapeOk: (o) => shapeOk("find_guide", o), legacyKeys: LEGACY_RUN_KEYS, words: FINDER_WORDS },
  find_forms: { kind: "find_forms", jobBase: "studio-finder-forms", configurationVersion: "s4-form-finder", template: "find-forms.v2.md", check: "find-forms-check.v2.md", schema: "find-forms-output.v2.schema.json", replays: [{ template: "find-forms.v1.md", check: "find-forms-check.v1.md", label: "Saved before channels" }], effort: "medium", max_output_tokens: 10000, shapeOk: (o) => shapeOk("find_forms", o), legacyKeys: LEGACY_RUN_KEYS, words: FINDER_WORDS },
};
type AiKind = keyof typeof AI_SETTINGS;
const ATTACHABLE = new Set(["always", "condition", "alternative"]);
/** Library type: one rule (engine/form-type.ts), kept exported here for the library's import. */
export { libraryType };
const STOPWORDS = new Set(["and", "or", "the", "a", "an", "of", "for", "to", "in", "with", "your", "retail", "corporate", "employers", "temporary", "residence", "permanent", "canada", "application", "apply"]);
const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOPWORDS.has(w)).map((w) => w.replace(/s$/, ""));
const sameText = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

type Page = { url: string; title: string; kind: "package" | "guide"; text: string; sha256: string; inventory: { file: string; sha256: string } | null };
/** W1-10 slice 1 (prompt v2): each form also says how IRCC says it is filed (`channel`); answers saved with v1 have none. */
type Proposal = { code: string; title: string | null; applies: string; condition: string | null; who: string; quote: string; filed_note: string | null; channel?: ChannelReading };
export type FinderResult = {
  pages: { url: string; title: string; kind: string; read_by_ai: boolean }[];
  printed: string[];
  attach: { code: string; title: string | null; applies: string; condition: string | null; who: string; quote: string; filed_note: string | null; source: "library" | "downloaded" | "newer_file" ; edition?: string | null; line?: "added" | "already" | "removed_by_person" }[];
  /** C11.15 (P-156 (4)): `link`, where the file is on canada.ca when the download failed or was refused, for "Download from this link and upload". */
  missing: { code: string; title: string | null; why: string; quote: string; link?: string | null }[];
  decide: { code: string; draft: Proposal | null; check: Proposal | null; why: string }[];
  not_for: { code: string; applies: string; quote: string }[];
  /** QA-101 (P-118, P-156): forms the rounds named that the library types checklist, guide or document: kept in the
   *  library as sources AI reads, never attached as a filed line. */
  checklists?: { code: string; title: string | null; quote: string; kind: string; source: "library" | "downloaded" | "newer_file"; edition?: string | null }[];
  dropped: { code: string; why: string }[];
  rules_only?: { code: string; sentence: string }[];
  guide_choice?: { candidates: { title: string; url: string }[]; why: string };
  ai_inputs?: { file: string; sha256: string }[];
  /** C11.15 (review M1): a run for some forms only says, per form, what AI decided and what happened to its line. */
  redo?: { code: string; said: string }[];
  /** C-5 (P-140): per attached form, the channel proposed for a second person (ready or check) or listed (no change). */
  channels?: { code: string; outcome: "ready" | "check" | "listed" | "kept"; why: string | null; change_id?: string }[];
};

type GuideOut = { package_title: string | null; confidence: "high" | "low"; reason: string; others: string[] };
type FormsOut = { forms: Proposal[]; unresolved: { quote: string; reason: string }[] };
type Candidate = { title: string; url: string };
type GuideValue = { url: string; title: string | null; candidates?: Candidate[] };
/** The stored plan of a finder run, with its result once it ended. */
type FinderPlan = Awaited<ReturnType<Finder["plan"]>> & { result?: FinderResult };
const json = (v: unknown) => v as Prisma.InputJsonValue;
const countsOf = (d: unknown) => (d && typeof d === "object" ? (d as { done?: number; total?: number }) : null);
/** Outside review 29 Oct: a step's Details (the service's request id) for whoever opens them; never in the sentence. */
export const detailsOf = (d: unknown): string | null => (d && typeof d === "object" && typeof (d as { details?: unknown }).details === "string" ? (d as { details: string }).details : null);

/** Where a combination sits, by names (the AI's only known fact besides the pages). */
/** `trail` is what the AI is given and what its saved answers were made with, so it never changes; `full_trail` is the
 *  five-part trail a person reads (P-104, QA-150). */
export async function trailOf(db: Db, combinationId: string): Promise<{ id: string; workspaceId: string; label: string; trail: string[]; full_trail: string[] }> {
  const c = await db.combination.findUnique({ where: { id: combinationId }, include: { program: true } });
  if (!c) throw problem(404, "Not found", "That combination does not exist.");
  const nodes = await db.programDef.findMany({ where: { workspaceId: c.workspaceId }, select: { programNodeKey: true, parentNodeKey: true, label: true, nodeKind: true, clientType: true } });
  const by = new Map(nodes.map((n) => [n.programNodeKey, n]));
  const chain: (typeof nodes)[number][] = [];
  for (let n = by.get(c.program.programNodeKey); n; n = n.parentNodeKey ? by.get(n.parentNodeKey) : undefined) chain.unshift(n);
  return { id: c.id, workspaceId: c.workspaceId, label: c.label, trail: chain.map((n) => n.label), full_trail: fullTrail(chain) };
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

/** C11.15 (review M1): what a run for one form found about it, in one sentence (the line is never changed silently). */
export function onlyWords(code: string, r: FinderResult, line: "added" | "already" | "removed_by_person" | undefined): string {
  if (line === "added") return `${code}: both AI rounds name it for this combination; it is attached (Picked by AI · Sample).`;
  if (line === "already") return `${code}: both AI rounds name it again; its line is unchanged.`;
  if (line === "removed_by_person") return `${code}: both AI rounds name it, but a person removed it from this combination, so it is not attached back (Add back is on the Forms tab).`;
  const d = r.decide.find((x) => x.code === code);
  if (d) return `${code}: the two AI rounds disagree (${d.why}); its line is unchanged and a person decides.`;
  const n = r.not_for.find((x) => x.code === code);
  if (n) return `${code}: the pages name it as ${n.applies === "separate_application" ? "a separate application" : "not needed here"}; its line is unchanged. Remove it if it does not apply.`;
  const c = (r.checklists ?? []).find((x) => x.code === code);
  if (c) return `${code}: it is a ${c.kind} the pages name: kept in the library as a source, never filed; its line is unchanged.`;
  const m = r.missing.find((x) => x.code === code);
  if (m) return `${code}: not found this time (${m.why.replace(/\.$/, "")}); its line is unchanged.`;
  const x = r.dropped.find((y) => y.code === code);
  if (x) return `${code}: AI's answer about it failed the rules (${x.why.replace(/\.$/, "")}); its line is unchanged.`;
  return `${code}: AI did not name it on these pages this time; its line is unchanged. Remove it if it no longer applies.`;
}

@Injectable()
export class Finder implements OnModuleInit {
  private canada: CanadaSource = canadaSource();
  /** The shared step runner (W1-10 slice 0): every AI round of the finder goes through it. */
  private readonly rounds: StepRunner;
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Sources) private readonly sources: Sources) { this.rounds = new StepRunner(sources); }

  /** A finder run left running by a stopped server can never finish: say so, instead of showing it as running forever. */
  async onModuleInit() {
    const open = await this.db.aiBatch.findMany({ where: { operation: FINDER_OPERATION, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } });
    for (const b of open) {
      await this.db.draftingJob.updateMany({ where: { batchId: b.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "The studio server stopped before this step ended." } });
      await this.db.aiBatch.update({ where: { id: b.id }, data: { status: "FAILED", finishedAt: new Date(), message: "The studio server stopped while finding forms. Find again." } });
    }
  }

  /** P-179: the Continue each running finder run was started with, by run id. */
  private overrides = new Map<string, LaunchOverride>();

  /** Test seam: an isolated test copy swaps the canada.ca source (never the demo). */
  useCanada(c: CanadaSource) { this.canada = c; }

  // ------------------------------------------------------------------ plan and launch
  /** What a run will do, what it may cost and the fingerprint the launch must repeat (the person saw this plan). */
  async plan(combinationId: string, body: unknown, opts: { fresh?: boolean } = {}) {
    combinationId = combinationId.toLowerCase(); // C11.15 break B1: one combination, one spelling (locks and run keys use it)
    const b = parse(FinderBody, body);
    const c = await trailOf(this.db, combinationId);
    if (b.pageUrl) { const u = officialUrl(b.pageUrl); if (!u.ok) throw problem(400, "Only canada.ca pages", `${u.why} Paste the address of the official application or guide page on canada.ca.`, { errors: [{ field: "pageUrl", message: u.why }] }); }
    // C11.15 Redo with AI, stage "find" (P-123): the application page is found again, never the remembered one.
    const remembered = b.pageUrl || opts.fresh ? null : await this.rememberedPages(combinationId);
    const ledger = this.sources.ledger();
    // Cost: each AI round's worst case as the ledger reserves it (inputs bounded by bytes, both attempts); replay and rules US$0.
    // QA-98: each AI step states the reserve it carries (the page pick's two rounds, then one forms round each), so the
    // button's tip and the Find dialog say the same per-step figures and their sum is the one "at most".
    const pagePicked = !!(remembered || b.pageUrl);
    const roundUsd = (k: AiKind) => worstRoundUsd(AI_SETTINGS[k], k === "find_guide" ? 120_000 : 160_000);
    const stepRounds: Partial<Record<StepKind, AiKind[]>> = b.mode === "live" ? { finder_guide: pagePicked ? [] : ["find_guide", "find_guide"], finder_propose: ["find_forms"], finder_check: ["find_forms"] } : {};
    const steps = STEPS.map((s, i) => {
      const r = stepRounds[s.kind] ?? [];
      return { n: i + 1, kind: s.kind, label: s.kind === "finder_guide" && pagePicked ? "Use the application page already chosen (no AI round)" : s.label, uses_ai: s.ai && b.mode !== "rules" && !(s.kind === "finder_guide" && pagePicked), chosen: s.kind === "finder_guide" && pagePicked, worst_usd: r.length ? Math.ceil(Math.round(r.reduce((a, k) => a + roundUsd(k), 0) * 1e6) / 1e4) / 100 : null };
    });
    const rounds = Object.values(stepRounds).flat() as AiKind[];
    // Each step's reserve in cents rounded up (never below what the ledger reserves); the sum is the plan's "at most".
    const worst = round2(steps.reduce((a, s) => a + (s.worst_usd ?? 0), 0));
    const expected = b.mode === "live" ? this.expectedUsd(c.trail) : 0;
    // S3 early look (4): the one "about" (finder-cost.ts), the same on the Find button, this plan and the run card.
    const about = b.mode === "live" ? aboutUsd(expected, await lastFinishedUsd(this.db, await this.ws.id(), FINDER_OPERATION, "LIVE"), true) : 0;
    const plan = { operation: FINDER_OPERATION, operation_label: "Find this combination's forms", combination: { id: c.id, label: c.label, trail: c.full_trail, ai_trail: c.trail }, mode: b.mode, page_url: b.pageUrl ?? remembered?.package ?? null, only: b.only ?? null, steps,
      totals: { worst_usd: worst, expected_usd: expected, about_usd: about, ai_rounds: rounds.length }, ledger, live: { on: aiLive(), why: aiLive() ? null : START.liveOff },
      note: b.mode === "rules" ? "Rules only: every form number printed on the pages is listed for you to attach by hand; nothing is attached, because AI did not decide which apply." : b.mode === "replay" ? "Saved AI answers for these exact pages are replayed: US$0. A page with no saved answer stops with the reason." : `Live AI: two rounds per question, at most US$${worst.toFixed(2)} (usually much less; at most ${MAX_ATTEMPTS} paid attempts per round). Downloads from canada.ca cost nothing.`,
      targets: [] as unknown[] };
    // Lead 29 Oct (CI on #94/#96): the plan's "about" is part of what the person saw, so a click on a button whose cost words
    // changed meanwhile is refused ("Look at the plan again"), never started with other words.
    const plan_sha256 = sha(JSON.stringify({ c: c.id, mode: b.mode, page: plan.page_url, only: plan.only, steps: steps.map((s) => s.kind + s.uses_ai), worst, about }));
    // P-179: the one cost check (each round is held to the run cap on its own) and the run key a Continue names.
    const { cost_check, run_key } = costPlanNow(FINDER_OPERATION, plan_sha256, { worst, expected, run: Math.max(0, ...steps.map((s) => s.worst_usd ?? 0)) }, await endedOverrides(this.db));
    return { ...plan, plan_sha256, cost_check, run_key };
  }

  private expectedUsd(trail: string[]): number | null {
    const key = slug(trail.join(" ")).slice(0, 40);
    let total = 0, found = false;
    for (const prefix of [`studio-finder-forms-${key}`, `studio-finder-forms-check-${key}`]) {
      const r = this.rounds.savedRuns(prefix)[0] ?? this.rounds.savedRunsLike(prefix)[0];
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
  async launch(actor: Actor, combinationId: string, body: unknown, opts: { fresh?: boolean } = {}) {
    combinationId = combinationId.toLowerCase(); // C11.15 break B1: one combination, one spelling (locks and run keys use it)
    need(actor, "author");
    const b = parse(FinderLaunchBody, body);
    const workspaceId = await this.ws.id();
    const again = await this.db.aiBatch.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: b.idempotencyKey } } });
    if (again && !again.scopeLabel.startsWith(`${combinationId}|`)) throw problem(409, "Key already used", "This launch key belongs to another run. Look at the plan again to start a new one.");
    if (again) return this.view(again.id);
    if (b.mode === "live" && !aiLive()) throw problem(409, "AI now is switched off", START.liveOff);
    const plan = await this.plan(combinationId, { mode: b.mode, pageUrl: b.pageUrl, only: b.only }, opts);
    if (plan.plan_sha256 !== b.planSha256) throw problem(409, "Look at the plan again", "Something changed since you looked at the plan (the pages, the mode or the cost). Look at it again before starting.");
    // P-179: over a limit, a start needs a person's Continue (checked here, used once inside the transaction below); without
    // one it is refused as before.
    const override = !plan.cost_check.ok && b.overrideId ? checkOverride(actor, b.overrideId, plan) : null;
    if (!override && b.mode === "live" && plan.totals.worst_usd > plan.ledger.remaining_usd + 1e-9) throw problem(409, "Over the spending cap", `The worst case (US$${plan.totals.worst_usd.toFixed(2)}) is above what is left of the AI spending cap (US$${plan.ledger.remaining_usd.toFixed(2)}). Nothing was started; use saved AI answers or rules only.`);
    if (!override && !plan.cost_check.ok) throw problem(409, "Over a cost limit", plan.cost_check.words);
    let batchId: string;
    try {
      batchId = await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`finder:${combinationId}`}))`;
        const active = await tx.aiBatch.findFirst({ where: { workspaceId, operation: FINDER_OPERATION, scopeLabel: { startsWith: `${combinationId}|` }, status: { in: ["QUEUED", "RUNNING"] } } });
        if (active) throw problem(409, "Already finding", "The form finder is already running for this combination: watch it, or stop it first.", { runId: active.id });
        const batch = await tx.aiBatch.create({ data: { workspaceId, idempotencyKey: b.idempotencyKey, operation: FINDER_OPERATION, scopeKind: "combination", scopeLabel: `${combinationId}|${trailWords(plan.combination.trail)}`, mode: b.mode.toUpperCase(), status: "QUEUED", planSha256: plan.plan_sha256, plan: json(override ? { ...plan, override } : plan), spendLimitUsd: Math.max(plan.totals.worst_usd, 0.01), worstCaseUsd: plan.totals.worst_usd, expectedUsd: plan.totals.expected_usd, startedBy: actor.id, message: "Finding forms" } });
        await tx.draftingJob.createMany({ data: STEPS.map((s, i) => ({ workspaceId, combinationId, batchId: batch.id, kind: s.kind, mode: s.ai ? b.mode.toUpperCase() : "LOCAL", status: "WAITING", message: "Waits for the step before it", startedBy: actor.id, startedAt: new Date(Date.now() + i) })) });
        // Review m1: the Continue is used last, after "Already finding" and the key; a refusal of the use rolls this back.
        if (override) spendOverride(actor, override);
        return batch.id;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") { const b2 = await this.db.aiBatch.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: b.idempotencyKey } } }); if (b2) return this.view(b2.id); }
      throw e;
    }
    await this.audit.log(workspaceId, actor.id, "started", "form finder", combinationId, `${actor.name} started the form finder for "${plan.combination.label}" (${b.mode === "live" ? `live AI, at most US$${plan.totals.worst_usd.toFixed(2)}` : b.mode === "replay" ? "saved AI answers, US$0" : "rules only, US$0"})${override ? `; continued past ${override.limits.join(", ")} (override ${override.id})` : ""}`, override ? { override_id: override.id, run_key: override.run_key } : undefined, combinationId);
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
    await linkFinderGuides(this.db, batchId, b!.startedBy); // S5 slice 3 (runtime lane, Lead decision): the guides it read become the combination's sources
  }

  /** The six steps, in order; each records its status, words, cost and what it found. */
  async execute(batchId: string) {
    const b = await this.db.aiBatch.update({ where: { id: batchId }, data: { status: "RUNNING" } });
    const plan = b.plan as unknown as FinderPlan;
    // P-179: the Continue this run was started with goes to each of its live rounds (the ledger checks it again).
    const ov = overrideOf(b.plan);
    if (ov) { this.overrides.set(batchId, ov); setTimeout(() => this.overrides.delete(batchId), OVERRIDE_TTL_MS + 60 * 60_000).unref(); }
    const mode: FinderMode = plan.mode;
    const combinationId: string = plan.combination.id;
    // The names the AI is given (a plan stored before QA-150 has only `trail`, which then held them).
    const names: string[] = aiNamesOf(plan.combination);
    const trail = names.join(" › ");
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
      const sure = this.sureMatch(names, idx.packages);
      if (sure.match) return { status: "COMPLETED", message: `Rules found a sure match: "${sure.match.title}". No AI call was made.`, detail: { candidates: sure.candidates }, value: { url: sure.match.url, title: sure.match.title } };
      if (mode === "rules") return { status: "NEEDS_PERSON", message: "Rules found no sure match and AI is off: choose the application page.", detail: { candidates: sure.candidates }, value: { url: "", title: null, candidates: sure.candidates } };
      const inv = inventoryFor(INDEX_URL);
      if (!inv) return { status: "NEEDS_PERSON", message: "canada.ca's list is not among the recorded pages AI may read: choose the application page.", detail: { candidates: sure.candidates }, value: { url: "", title: null, candidates: sure.candidates } };
      await set("AI picks the application package (round 1 of 2)");
      const d = await this.aiRound<GuideOut>("find_guide", false, trail, combinationKey, [inv], mode, wanted, batchId);
      await set("A second AI round checks the pick without seeing the first (round 2 of 2)", { costUsd: d.costUsd });
      // QA-89: the checker round is sent only when the first round answered; a failed first round ends the pick here.
      const k: RoundOut<GuideOut> = d.ok ? await this.aiRound<GuideOut>("find_guide", true, trail, combinationKey, [inv], mode, wanted, batchId) : { ok: false, costUsd: 0, reason: d.reason };
      const cost = round2(d.costUsd + k.costUsd);
      // Outside review 29 Oct: the failed round's request id goes to this step's Details, as the later steps' do.
      const details = !d.ok ? d.details : !k.ok ? k.details : undefined;
      if (!d.ok || !k.ok) return { status: (!d.ok && d.blocked) || (!k.ok && k.blocked) ? "BLOCKED" : "NEEDS_PERSON", message: `${mode === "live" ? "AI could not pick the page: " : ""}${(!d.ok ? d.reason : !k.ok ? k.reason : "").replace(/\.+\s*$/, "")}. Choose the application page.`, costUsd: cost, detail: { candidates: sure.candidates, ...(details ? { details } : {}) }, value: { url: "", title: null, candidates: sure.candidates } };
      const byTitle = (t: string | null) => (t ? idx.packages.find((p) => sameText(p.title) === sameText(t)) : undefined);
      const a = byTitle(d.output.package_title), c = byTitle(k.output.package_title);
      // At most 5 other pages from each round, kept in code (engine/rounds.ts otherPages): the provider refuses maxItems.
      const cands = [...new Map([a, c, ...[...otherPages(d.output.others), ...otherPages(k.output.others)].map(byTitle), ...sure.candidates].filter((p): p is Candidate => !!p).map((p) => [p.url, { title: p.title, url: p.url }] as const)).values()].slice(0, 10);
      if (a && c && a.url === c.url && d.output.confidence === "high" && k.output.confidence === "high") return { status: "COMPLETED", message: `AI picked "${a.title}"; the second round agrees. US$${cost.toFixed(2)}.`, costUsd: cost, detail: { candidates: cands, draft: d.output, check: k.output }, value: { url: a.url, title: a.title } };
      return { status: "NEEDS_PERSON", message: `The two AI rounds did not agree on one page${a ? ` (first: "${a.title}"` : ""}${c ? `${a ? "; " : " ("}second: "${c.title}"` : ""}${a || c ? ")" : ""}. Choose the application page.`, costUsd: cost, detail: { candidates: cands, draft: d.output, check: k.output }, value: { url: "", title: null, candidates: cands } };
    });
    if (!index || index.status !== "COMPLETED") {
      const c = index?.value?.candidates ?? [];
      if (index?.status === "NEEDS_PERSON" || index?.status === "BLOCKED") result.guide_choice = { candidates: c, why: "Choose the application page: the finder could not pick one for sure." };
      return this.finish(batchId, index?.status === "NEEDS_PERSON" || index?.status === "BLOCKED" ? "NEEDS_PERSON" : "FAILED", index?.status === "NEEDS_PERSON" ? "No application page could be chosen. Choose it on the combination's Forms tab." : "The finder could not find the application page.", result);
    }

    // 2. Read the application page and the guide it links (rules: every form number printed on them).
    const read = await this.step(batchId, "finder_read", async (set) => {
      const pages: Page[] = [];
      const pkg = await this.canada.get(index.value.url, "html");
      const html = pkg.bytes.toString("utf8");
      pages.push({ url: index.value.url, title: index.value.title ?? (/<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? "Application page").replace(/\s*-\s*Canada\.ca\s*$/i, "").trim(), kind: "package", text: pageText(html), sha256: pkg.sha256, inventory: inventoryFor(index.value.url) });
      // A page may link more than one guide (the study permit page also links the inside-Canada guide): the one whose
      // name shares most words with the trail is read; a tie keeps the first.
      const want = new Set(words(names.slice(1).join(" ")));
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
    let draft: Proposal[] = [], check: Proposal[] = [], earlier: string | undefined;
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
          : { status: o.blocked ? "BLOCKED" : o.cancelled ? "CANCELLED" : "FAILED", message: o.reason, costUsd: o.costUsd, ...(o.details ? { detail: { details: o.details } } : {}), value: o };
      });
      const r2 = r1?.status === "COMPLETED" ? await this.step<RoundOut<FormsOut> | null>(batchId, "finder_check", async (set) => {
        await set(mode === "live" ? "The checker reads the same pages without seeing the first answer" : "Replaying the saved checker answer (US$0)");
        const o = await this.aiRound<FormsOut>("find_forms", true, trail, combinationKey, inputs, mode, wanted, batchId);
        return o.ok ? { status: "COMPLETED", message: `The checker listed ${o.output.forms.length} form${o.output.forms.length === 1 ? "" : "s"} (${o.from === "replay" ? "saved answer, US$0" : `US$${o.costUsd.toFixed(2)}`}).`, costUsd: o.costUsd, detail: { run_file: o.runFile, from: o.from }, value: o }
          : { status: o.blocked ? "BLOCKED" : o.cancelled ? "CANCELLED" : "FAILED", message: o.reason, costUsd: o.costUsd, ...(o.details ? { detail: { details: o.details } } : {}), value: o };
      }) : null;
      if (!r1 || r1.status !== "COMPLETED" || !r2 || r2.status !== "COMPLETED") {
        result.rules_only = printed;
        return this.finish(batchId, r1?.status === "BLOCKED" || r2?.status === "BLOCKED" ? "FAILED" : "FAILED", `AI did not finish (${(r2 ?? r1)?.status?.toLowerCase() ?? "stopped"}): the form numbers printed on the pages are listed for you; nothing was attached.`, result);
      }
      draft = (r1.value as Extract<RoundOut<FormsOut>, { ok: true }>).output.forms.map((p) => ({ ...p, code: normaliseCode(p.code) }));
      earlier = (r1.value as Extract<RoundOut<FormsOut>, { ok: true }>).earlier ?? (r2.value as Extract<RoundOut<FormsOut>, { ok: true }>).earlier;
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
        const got = await this.formFor(b.workspaceId, p, rows, actor.id, batchId).catch((e): { missing: string; link?: string } => ({ missing: e instanceof CanadaError ? e.message : `Could not get ${p.code}: ${(e as Error).message.slice(0, 200)}` }));
        if ("missing" in got) result.missing.push({ code: p.code, title: p.title, why: got.missing, quote: p.quote, link: got.link ?? null });
        else out.push({ ...p, source: got.source, edition: got.edition });
      }
      const dl = out.filter((x) => x.source === "downloaded").length;
      return { status: result.missing.length ? "PARTIAL" : "COMPLETED", message: `${out.length - dl} in the library, ${dl} downloaded from canada.ca, ${result.missing.length} not found. US$0.`, detail: { done: n, total: toFetch.length }, value: out };
    });
    // QA-101 (P-118, P-156: checklists are read, never filed): a checklist, guide or document the rounds named is kept in
    // the library as a source and listed as such; only filed forms go on to be lines.
    const got = fetched?.value ?? [];
    const kinds = got.length ? await this.db.govFormDef.findMany({ where: { workspaceId: b.workspaceId, formKey: { in: got.map((f) => f.code) } }, select: { formKey: true, formKind: true, displayName: true } }) : [];
    // QA-101: what the library types checklist or guide is read, never filed (QA-101 review M2: the library's own rule).
    const notFiled = new Map(kinds.filter((k) => libraryType(k.formKind, k.displayName) !== "form").map((k) => [k.formKey, libraryType(k.formKind, k.displayName)]));
    result.checklists = got.filter((f) => notFiled.has(f.code)).map((f) => ({ code: f.code, title: f.title, quote: f.quote, kind: notFiled.get(f.code)!, source: f.source, edition: f.edition ?? null }));
    const found = got.filter((f) => !notFiled.has(f.code));

    // 6. Attach with no confirm step (P-123): one change on the forms list, undoable while the draft is open.
    await this.step(batchId, "finder_attach", async () => {
      const kept = result.checklists?.length ? ` ${result.checklists.length} kept in the library as ${result.checklists.length === 1 ? "a checklist" : "checklists"} (read, never filed).` : "";
      if (!found.length) return { status: "COMPLETED", message: `Nothing to attach.${kept}`, value: null };
      const lines = await this.attachFound(b.workspaceId, combinationId, found, actor, batchId);
      for (const f of found) f.line = lines[f.code];
      const failed = found.filter((f) => !lines[f.code]);
      for (const f of failed) result.missing.push({ code: f.code, title: f.title, why: `${f.code} was not attached: it is retired or being retired in the library, or its answer did not fit the line. Check it in Shared library › Forms.`, quote: f.quote });
      const added = Object.values(lines).filter((x) => x === "added").length;
      const removed = Object.values(lines).filter((x) => x === "removed_by_person").length;
      return { status: "COMPLETED", message: `${added} attached automatically (Picked by AI · Sample), ${found.length - added - removed} already on this combination${removed ? `, ${removed} not attached back (a person removed ${removed === 1 ? "it" : "them"})` : ""}.${kept}`, value: null };
    });
    result.attach = found.filter((f) => f.line);
    // C-5 (P-140): each attached form's channel is proposed for a second person, never written here.
    if (mode !== "rules") {
      result.channels = [];
      for (const f of result.attach) {
        const p = channelProposal(draft.find((x) => x.code === f.code)?.channel, check.find((x) => x.code === f.code)?.channel, f.filed_note, (q) => !!sameText(q) && allText.includes(sameText(q)), earlier);
        result.channels.push(await this.proposeChannel(b.workspaceId, f.code, p, actor.id));
      }
    }
    // C11.15 review M1: a run for some forms only (Redo with AI, Find again for one form) reports only those forms, and
    // says per form what AI decided and what happened to its line, so a Redo never reads as a find of the whole combination.
    if (only) {
      const mine = (c: string) => only.includes(c);
      result.missing = result.missing.filter((m) => mine(m.code)); result.decide = result.decide.filter((d) => mine(d.code));
      result.not_for = result.not_for.filter((n) => mine(n.code)); result.dropped = result.dropped.filter((d) => mine(d.code));
      result.checklists = (result.checklists ?? []).filter((c) => mine(c.code));
      result.redo = only.map((code) => ({ code, said: onlyWords(code, result, found.find((f) => f.code === code)?.line) }));
      const problems = result.missing.length + result.decide.length + result.dropped.length;
      return this.finish(batchId, problems ? "PARTIAL" : "COMPLETED", result.redo.map((r) => r.said).join(" "), result);
    }
    const problems = result.missing.length + result.decide.length + result.dropped.length;
    await this.audit.log(b.workspaceId, actor.id, "found", "form finder", combinationId, `The form finder attached ${found.filter((f) => f.line === "added").length} form${found.length === 1 ? "" : "s"} to "${plan.combination.label}" (Picked by AI · Sample); ${result.missing.length} not found, ${result.decide.length} to decide`, { attach: found.map((f) => f.code), missing: result.missing.map((m) => m.code) }, combinationId);
    return this.finish(batchId, problems ? "PARTIAL" : "COMPLETED", `${found.length} form${found.length === 1 ? "" : "s"} attached or already there, ${result.missing.length} not found, ${result.decide.length} to decide.`, result);
  }

  /** C-5 (P-140): one form's proposed channel as a "what IRCC accepts" change waiting for a second person, with IRCC's
   *  sentence and both readings; Check when they or the keyword rule disagree. Nothing when no sentence was found, when a
   *  change for the form already waits, or when the library already says the same for that account ("kept"). */
  private async proposeChannel(workspaceId: string, code: string, p: ChannelProposal, by: string): Promise<NonNullable<FinderResult["channels"]>[number]> {
    if (p.outcome === "listed") return { code, outcome: "listed", why: p.why };
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: code } }, include: { editions: { include: { accepts: true } } } });
    const current = def ? newestEdition(def.editions.filter((e) => e.channel !== "ONLINE")) : null;
    if (!def || !current || def.formKind !== "data_form") return { code, outcome: "listed", why: `${code} is not a form that is filed, so nothing was proposed.` };
    const same = current.accepts.find((a) => a.account === p.account);
    if (same && [...same.channels].sort().join() === [...p.channels].sort().join()) return { code, outcome: "kept", why: "The library already records this." };
    if (await this.db.libraryChange.findFirst({ where: { workspaceId, kind: "form_accepts", key: code, status: { in: ["WAITING", "RETURNED", "APPROVED"] } } })) return { code, outcome: "kept", why: "A change to what IRCC accepts already waits for a second person." };
    const label = `${code} · IRCC accepts${p.account === "ANY" ? "" : ` ${throughAccount(p.account)}`}: ${acceptsWords(p.channels)}${p.outcome === "check" ? " · Check" : ""}`;
    // Review S5: two finds proposing for the same form at once both pass the check above; the database keeps one open
    // change per form (library_change_one_open), so the later find says "kept" instead of failing on its refusal.
    const c = await this.db.libraryChange.create({ data: { workspaceId, kind: "form_accepts", key: code, label, action: "SET_ACCEPTS", reason: `canada.ca: "${p.quote.slice(0, 380)}"`, status: "WAITING", proposedBy: by,
      matches: { source: "finder", account: p.account, channels: p.channels, quote: p.quote.slice(0, 400), reason: null, edition: current.editionLabel, before: same?.channels ?? null, form_page: def.formPageUrl ?? current.formPageUrl ?? null, readings: p.readings, check: p.why } as Prisma.InputJsonValue } })
      .catch((e) => { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null; throw e; });
    if (!c) return { code, outcome: "kept", why: "A change to what IRCC accepts already waits for a second person." };
    await this.audit.log(workspaceId, by, "proposed", "form", code, `The form finder proposed that IRCC accepts ${code} as ${acceptsWords(p.channels)} (${p.outcome === "check" ? `Check: ${p.why}` : "both rounds agree"}); waits for a second person`);
    return { code, outcome: p.outcome, why: p.why, change_id: c.id };
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
  /** One AI round on the shared step runner: replay the newest saved real run of exactly this job (same pages, same
   *  prompt, same combination), or a guarded live call. */
  async aiRound<T>(kind: AiKind, isCheck: boolean, trail: string, combinationKey: string, inputs: { file: string; sha256: string }[], mode: FinderMode, wanted: () => Promise<boolean>, batchId?: string): Promise<RoundOut<T>> {
    return this.rounds.round<T>(AI_SETTINGS[kind], isCheck, { trail, contextKey: combinationKey, inputs, mode, wanted, batchId, override: batchId ? this.overrides.get(batchId) : undefined });
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
      await forgetDeletion(tx, workspaceId, key); // X5 slice c
      const have = await tx.formEdition.findFirst({ where: { workspaceId, govFormDefId: def.id, contentSha256: fp } });
      if (have) { await tx.formEdition.update({ where: { id: have.id }, data: { checkedAt: new Date() } }); return; }
      await tx.formEdition.createMany({ data: [{ workspaceId, govFormDefId: def.id, editionLabel: label, sha256: fileSha, contentSha256: fp, storedPath: stored.replace(`${ROOT}/`, ""), origin: "DOWNLOADED", formPageUrl: url, sourceUrl: url, canadaUpdated: modified, checkedAt: new Date() }], skipDuplicates: true }); // a guide is read by AI, never filed: no record of what IRCC accepts
      await tx.officialDownload.createMany({ data: [{ workspaceId, sha256: fileSha, kind: "guide", code: key, edition: label, title, formPageUrl: url, sourceUrl: url, fileName: basename(stored), storedPath: stored.replace(`${ROOT}/`, ""), bytes: bytes.length, basis: "download", batchId, startedBy: by }], skipDuplicates: true });
    });
  }

  /** One form for the combination: the library's current edition, or its PDF downloaded from canada.ca (M2, M6). */
  private async formFor(workspaceId: string, p: Proposal, rows: { code: string; title: string; pageUrl: string; kind: string }[], by: string, batchId: string): Promise<{ source: "library" | "downloaded" | "newer_file"; edition: string | null } | { missing: string; link?: string }> {
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
        if (usable.some((e) => e.sha256 === pdf.sha256)) {
          await this.db.formEdition.updateMany({ where: { workspaceId, sha256: pdf.sha256 }, data: { checkedAt: new Date(), canadaUpdated: fp.lastUpdated, formPageUrl: row.pageUrl, sourceUrl: pdfUrl } });
          // X5 break (0796fc0c) M16, m46: the library's file is canada.ca's own bytes, as a "Check against canada.ca" would find:
          // it gets the same guarded baseline (the index date as it stands, never lowered) and loses a stale new-file marker.
          if (def?.indexDateModified) await this.db.formEdition.updateMany({ where: { workspaceId, sha256: pdf.sha256, OR: [{ indexDateSeenCurrent: null }, { indexDateSeenCurrent: { lt: def.indexDateModified } }] }, data: { indexDateSeenCurrent: def.indexDateModified } });
          // Break / review (521bc9c4) m51, m49: only the marker this run read is cleared (another run may have marked a newer file meanwhile).
          for (const e of usable) if (e.sha256 === pdf.sha256 && e.newerFileSha256) await this.db.formEdition.updateMany({ where: { id: e.id, newerFileSha256: e.newerFileSha256 }, data: { newerFileSha256: null } });
          return mine;
        }
        const r = await this.storeDownloaded(workspaceId, p, row, fp, pdfUrl, pdf.bytes, by, batchId, def?.indexDateModified ?? null);
        return "missing" in r ? mine : r;
      } catch (e) { if (e instanceof CanadaError) return mine; throw e; }
    }
    if (!row) return { missing: `${p.code} is not on canada.ca's list of forms. It may be a visa-office document: upload its PDF.` };
    // C11.15 (P-156 (4)): a download that fails says where the file is: "Download from this link and upload" (the PDF's
    // link once the page named one, else the form's canada.ca page).
    let pdfUrl: string | undefined;
    const got = async () => {
      const fp = parseFormPage((await this.canada.get(row.pageUrl, "html")).bytes.toString("utf8"));
      pdfUrl = fp.pdfUrls.find((u) => officialUrl(u).ok);
      if (!pdfUrl) return { fp, pdf: null };
      return { fp, pdf: await this.canada.get(pdfUrl, "pdf") };
    };
    let fetched: Awaited<ReturnType<typeof got>>;
    try { fetched = await got(); } catch (e) {
      if (!(e instanceof CanadaError)) throw e;
      return { missing: `${p.code} could not be downloaded from canada.ca. ${e.message}`, link: pdfUrl ?? row.pageUrl };
    }
    const { fp, pdf } = fetched;
    if (!pdf || !pdfUrl) return { missing: `${p.code}'s canada.ca page has no PDF to download (it may be online only). Upload its PDF if IRCC publishes one.`, link: row.pageUrl };
    return this.storeDownloaded(workspaceId, p, row, fp, pdfUrl, pdf.bytes, by, batchId, def?.indexDateModified ?? null);
  }

  /** Editions a combination may use: PDF, and on the manifest, approved in the product or officially downloaded. */
  private async usableEditions<E extends { sha256: string | null; channel: string }>(workspaceId: string, editions: E[]): Promise<E[]> {
    const shas = editions.map((e) => e.sha256).filter(Boolean) as string[];
    if (!shas.length) return [];
    const ok = new Set([...manifest().map((i) => i.sha256), ...(await this.db.approvedSource.findMany({ where: { workspaceId, sha256: { in: shas } }, select: { sha256: true } })).map((x) => x.sha256), ...(await this.db.officialDownload.findMany({ where: { workspaceId, sha256: { in: shas } }, select: { sha256: true } })).map((x) => x.sha256)]);
    return editions.filter((e) => e.channel !== "ONLINE" && e.sha256 && ok.has(e.sha256));
  }

  /** Reads the downloaded file's identity (rules, no AI), checks it is the form asked for, and stores it once. */
  private async storeDownloaded(workspaceId: string, p: Proposal, row: { code: string; title: string; pageUrl: string; kind: string }, page: { lastUpdated: string | null }, pdfUrl: string, bytes: Buffer, by: string, batchId: string, indexAtStart: string | null): Promise<{ source: "library" | "downloaded" | "newer_file"; edition: string | null } | { missing: string; link?: string }> {
    const fileSha = sha(bytes);
    const name = basename(new URL(pdfUrl).pathname).replace(/[^A-Za-z0-9._-]/g, "_").slice(-80);
    const stored = join(this.libDir(), `${fileSha.slice(0, 12)}-${name}`);
    if (!existsSync(stored)) writeFileSync(stored, bytes);
    // #261 m3: a reader that crashes or times out still says where the file is (the PDF's link), never the generic message.
    const unread = { missing: `${p.code} was downloaded from canada.ca, but its form number and edition could not be read from the file. Upload it by hand for a person to check.`, link: pdfUrl };
    let read: { ok?: boolean; code?: string; edition_label?: string; language?: string; kind?: string; title?: string; published?: string };
    try {
      const { stdout } = await run(PY, ["-I", join(STUDIO, "tools", "read_form_identity.py"), stored], { cwd: ROOT, timeout: 60_000 });
      read = JSON.parse(stdout.trim().split("\n").pop()!);
    } catch { return unread; }
    if (!read.ok || !read.code || !read.edition_label) return unread;
    const id = { ...read, code: read.code, edition_label: read.edition_label };
    // #261 m2: the file just refused is the wrong one, so the link is the form's canada.ca page, not that file.
    if (normaliseCode(id.code) !== p.code) return { missing: `canada.ca's file for ${p.code} reads as ${id.code}: not stored. Upload the right PDF by hand.`, link: row.pageUrl };
    if (id.language === "fr") return { missing: `canada.ca's file for ${p.code} is the French version: not stored.`, link: row.pageUrl };
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
    try {
      await this.db.$transaction(async (tx) => {
        const d = def ?? (await tx.govFormDef.upsert({ where: { workspaceId_formKey: { workspaceId, formKey: p.code } }, update: {}, create: { workspaceId, formKey: p.code, displayName: id.title || row.title || p.code, formKind: kind === "checklist" ? "checklist" : "data_form", formPageUrl: row.pageUrl } }));
        await forgetDeletion(tx, workspaceId, p.code); // X5 slice c: Find again, a person's click, took it from canada.ca
        await tx.formEdition.create({ data: { workspaceId, govFormDefId: d.id, editionLabel: id.edition_label, published: id.published ?? "", sha256: fileSha, storedPath: stored.replace(`${ROOT}/`, ""), origin: "DOWNLOADED", formPageUrl: row.pageUrl, sourceUrl: pdfUrl, canadaUpdated: page.lastUpdated, checkedAt: new Date(), indexDateSeenCurrent: indexAtStart } }); // X5 break (0796fc0c) M16: just taken from canada.ca, so current at the index date read before the download (break 521bc9c4 m49: never a date a fill set while it downloaded). C-5: what IRCC accepts is proposed for a person after attach, never written here
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
    const steps = STEPS.map((s, i) => { const j = b.jobs.find((x) => x.kind === s.kind); return { n: i + 1, kind: s.kind, label: s.label, status: j?.status ?? "WAITING", message: j?.message ?? null, usd: j?.costUsd ?? 0, started_at: j?.status === "WAITING" ? null : j?.startedAt ?? null, finished_at: j?.finishedAt ?? null, details: detailsOf(j?.detail), counts: countsOf(j?.detail)?.total ? { done: countsOf(j!.detail)!.done ?? 0, total: countsOf(j!.detail)!.total!, unit: "forms" } : null }; });
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
      let out: FormsOut | null = null; try { const r = JSON.parse(readFileSync(join(RUNS, f), "utf8")) as SavedRun; if (r.caller !== "live" || r.drafting_run?.status !== "completed" || r.contract_valid !== true) continue; out = JSON.parse(String(r.raw_output)) as FormsOut; } catch { continue; }
      for (const f of out?.forms ?? []) { const c = normaliseCode(f.code); if (f.filed_note && channelsRead(f.filed_note) && !notes.has(c)) notes.set(c, f.filed_note); }
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
      if ((await this.db.formEditionAccept.count({ where: { formEditionId: current.id } })) || d.formKind === "document" || d.formKind === "checklist") continue;
      const note = notes.get(normaliseCode(d.formKey)), fixed = fx.accepts[normaliseCode(d.formKey)];
      // P-140 (C-5): a saved AI answer's line is proposed for a second person (Check: read by the keyword rule), never written.
      if (note && !fixed) { const r = await this.proposeChannel(workspaceId, d.formKey, channelProposal(undefined, undefined, note, () => true, "Saved before channels"), "system"); if (r.outcome !== "listed") acceptsSaved++; }
      else if (fixed) {
        // Nothing invented: the fixture's line must be on this form's own recorded canada.ca page.
        const page = d.formPageUrl ?? (await this.db.govFormDef.findUnique({ where: { id: d.id }, select: { formPageUrl: true } }))?.formPageUrl;
        let said = false;
        if (page) try { said = sameText(pageText((await this.canada.get(page, "html")).bytes.toString("utf8"))).includes(sameText(fixed.quote)); } catch (e) { if (!(e instanceof CanadaError)) throw e; }
        if (!said) { notUsed.push(`${d.formKey}: its line is not on its recorded canada.ca page`); continue; }
        const channels = ({ PDF: ["PDF_UPLOAD"], ONLINE: ["ONLINE"], PDF_OR_ONLINE: ["PDF_UPLOAD", "ONLINE"] } as const)[fixed.channels];
        await this.db.formEditionAccept.create({ data: { workspaceId, formEditionId: current.id, account: "ANY", channels: [...channels], basis: "SAMPLE_FIXTURE", quote: fixed.quote.slice(0, 400), sourceUrl: page, readOn: new Date(), setBy: "system" } }); accepts++;
      }
    }
    // C-12 (P-171 (3)) and plan §8 Q1: the founder's records and the sample accounts, Sample, each with its basis.
    const extra = (() => { try { return JSON.parse(readFileSync(fixtureFile ?? join(STUDIO, "samples", "form-library-sample.json"), "utf8")) as { founder_accepts?: { records?: { form: string; account: string; channels: string[] }[] }; accounts?: { combinations?: Record<string, { account: string; url: string }> } }; } catch { return {}; } })();
    // A founder's record for a form the library does not hold yet waits for it (said once, never "not used").
    const waiting: string[] = [];
    for (const r of extra.founder_accepts?.records ?? []) {
      const d = defs.find((x) => normaliseCode(x.formKey) === normaliseCode(r.form)), current = d ? newestEdition(d.editions.filter((e) => e.channel !== "ONLINE")) : null;
      if (!current && d === undefined) { waiting.push(r.form); continue; }
      if (!current || !(IRCC_ACCOUNTS as readonly string[]).includes(r.account) || !r.channels.every((c) => (CHANNELS as readonly string[]).includes(c))) { notUsed.push(`${r.form}: the founder's record (P-171) was not used: ${current ? "not a known account or channel" : "the form is not in the library"}`); continue; }
      await this.db.formEditionAccept.upsert({ where: { formEditionId_account: { formEditionId: current.id, account: r.account } }, update: {}, create: { workspaceId, formEditionId: current.id, account: r.account, channels: r.channels as Channel[], basis: "FOUNDER_SAMPLE", quote: null, setBy: "system" } }); accepts++;
    }
    for (const [key, a] of Object.entries(extra.accounts?.combinations ?? {})) {
      if (!(IRCC_ACCOUNTS as readonly string[]).includes(a.account)) { notUsed.push(`${key}: not a known IRCC account`); continue; }
      // A released combination keeps its account as released: only rows without a release take it.
      await this.db.combination.updateMany({ where: { workspaceId, combinationKey: key, portalKey: null, releases: { none: {} } }, data: { portalKey: a.account } });
    }
    return { pages, accepts, acceptsSaved, guides, noGuide, notUsed, note: waiting.length ? `the founder's records for ${[...new Set(waiting)].join(", ")} (P-171) wait for the form to be in the library` : null };
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
    const live = this.rounds.liveJob(batchId);
    if (live) this.sources.stopLaunches((jobId) => jobId === live);
    await this.audit.log(b.workspaceId, actor.id, "stopped", "form finder", batchId, `${actor.name} stopped the form finder for ${b.scopeLabel.includes("|") ? b.scopeLabel.slice(b.scopeLabel.indexOf("|") + 1) : "a combination"}`);
    // C11.15 AT-24: the run ends at its next step boundary (well under a second without a live call): Stop answers with
    // that end when it comes within 3 s, else "Stopping" as before (a live call's launcher may take up to 10 s to end).
    for (const until = Date.now() + 3000; Date.now() < until;) {
      const now = await this.db.aiBatch.findUnique({ where: { id: batchId }, select: { status: true } });
      if (!now || !["QUEUED", "RUNNING"].includes(now.status)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    return this.view(batchId);
  }

  /** GET /combinations/:id/forms/find/latest (S5's Forms tab, one read): every form the newest finder run proposed, with
   *  its state now (a person may have removed it, or uploaded it, since the run). TO_DECIDE and NOT_FOR_THIS_APPLICATION
   *  are added to S5's six states: the two AI rounds disagreed (a person decides, P-121), or the page names it as a
   *  separate application. */
  async latestForms(combinationId: string) {
    combinationId = combinationId.toLowerCase(); // C11.15 break B1: one combination, one spelling (locks and run keys use it)
    const run = await this.latest(combinationId);
    if (!run) return { run: null, forms: [] };
    // C11.15 review M1: the list is the newest find of the whole combination; a newer run for some forms only (Redo,
    // Find again for one form) that ended replaces just those forms' rows, so a Redo of one form never hides the others.
    const runs = await this.db.aiBatch.findMany({ where: { operation: FINDER_OPERATION, scopeLabel: { startsWith: `${combinationId}|` } }, orderBy: { startedAt: "desc" }, select: { id: true, plan: true, status: true } });
    const onlyOf = (p: unknown) => ((p as FinderPlan | null)?.only ?? null) as string[] | null;
    const full = runs.find((x) => !onlyOf(x.plan));
    const r: FinderResult = structuredClone((full?.plan as unknown as FinderPlan | undefined)?.result ?? { pages: [], printed: [], attach: [], missing: [], decide: [], not_for: [], dropped: [] });
    const runOf = new Map<string, string>();
    const newer = full ? runs.slice(0, runs.indexOf(full)) : runs;
    for (const x of newer.reverse().filter((y) => ["COMPLETED", "PARTIAL"].includes(y.status) && onlyOf(y.plan))) {
      const o = (x.plan as unknown as FinderPlan).result;
      if (!o) continue;
      for (const code of onlyOf(x.plan)!) {
        const has = [o.attach, o.missing, o.decide, o.not_for, o.checklists ?? []].some((l) => l.some((e) => e.code === code));
        if (!has) continue; // AI did not name it this time: the earlier row stays (the run's own words say so)
        r.attach = r.attach.filter((e) => e.code !== code); r.missing = r.missing.filter((e) => e.code !== code); r.decide = r.decide.filter((e) => e.code !== code); r.not_for = r.not_for.filter((e) => e.code !== code); r.checklists = (r.checklists ?? []).filter((e) => e.code !== code);
        r.attach.push(...o.attach.filter((e) => e.code === code)); r.missing.push(...o.missing.filter((e) => e.code === code)); r.decide.push(...o.decide.filter((e) => e.code === code)); r.not_for.push(...o.not_for.filter((e) => e.code === code)); r.checklists.push(...(o.checklists ?? []).filter((e) => e.code === code));
        runOf.set(code, x.id);
      }
    }
    const codes = [...(r?.attach ?? []).map((a) => a.code), ...(r?.missing ?? []).map((m) => m.code), ...(r?.decide ?? []).map((d) => d.code), ...(r?.not_for ?? []).map((n) => n.code), ...(r?.checklists ?? []).map((c) => c.code)];
    const lines = await this.db.combinationForm.findMany({ where: { combinationId, lineageKey: { in: codes } }, orderBy: { version: "desc" } });
    const line = (c: string) => lines.find((l) => l.lineageKey === c);
    const held = await this.db.intakeItem.findMany({ where: { forCombinationId: combinationId, forCode: { in: codes }, status: "HELD" }, select: { forCode: true } });
    const stateOf = (c: string, base: string) => { const l = line(c); if (l?.status === "RETIRED") return "REMOVED_BY_PERSON"; if ((base === "NOT_FOUND" || base === "TO_DECIDE") && l) return "ATTACHED"; /* QA-102: a form already on this combination is not offered again */ if (base === "NOT_FOUND" && held.some((h) => h.forCode === c)) return "UPLOAD_WAITING_SECOND_PERSON"; return base; };
    const forms = [
      ...(r?.attach ?? []).map((a) => ({ code: a.code, title: a.title, quote: a.quote, conditionPlain: a.applies === "always" ? null : a.condition ?? a.quote, who: a.who, state: stateOf(a.code, a.source === "downloaded" ? "DOWNLOADED_ATTACHED" : a.source === "newer_file" ? "NEWER_FILE_SAME_EDITION" : "ATTACHED"), edition: a.edition ?? null })),
      ...(r?.missing ?? []).map((m) => ({ code: m.code, title: m.title, quote: m.quote, conditionPlain: null, who: null, state: stateOf(m.code, "NOT_FOUND"), why: m.why, link: m.link ?? null })),
      ...(r?.decide ?? []).map((d) => ({ code: d.code, title: (d.draft ?? d.check)?.title ?? null, quote: (d.draft ?? d.check)?.quote ?? null, conditionPlain: (d.draft ?? d.check)?.condition ?? null, who: (d.draft ?? d.check)?.who ?? null, state: stateOf(d.code, "TO_DECIDE"), why: d.why })),
      ...(r?.not_for ?? []).map((n) => ({ code: n.code, title: null, quote: n.quote, conditionPlain: null, who: null, state: "NOT_FOR_THIS_APPLICATION" })),
      ...(r?.checklists ?? []).map((c) => ({ code: c.code, title: c.title, quote: c.quote, conditionPlain: null, who: null, state: "CHECKLIST_IN_LIBRARY", edition: c.edition ?? null })),
    ].map((f) => ({ ...f, lineId: line(f.code)?.id ?? null, lineVersion: line(f.code)?.version ?? null, runId: runOf.get(f.code) ?? full?.id ?? run.id }));
    // S3 item 5: a run that could not pick the application page says so on the Forms tab, with the pages it saw, so the
    // person chooses one there and finds again (never a dead end).
    return { run: { id: run.id, status: run.status, mode: run.mode, finished_at: run.finished_at }, forms, sample_note: run.sample_note, page_choice: run.result?.guide_choice ?? null };
  }

  /** The combination's newest finder run (S5's Forms tab reads this; slice 1 serves it to the scripted journey). */
  async latest(combinationId: string) {
    combinationId = combinationId.toLowerCase(); // C11.15 break B1: one combination, one spelling (locks and run keys use it)
    const b = await this.db.aiBatch.findFirst({ where: { operation: FINDER_OPERATION, scopeLabel: { startsWith: `${combinationId}|` } }, orderBy: { startedAt: "desc" } });
    return b ? this.view(b.id) : null;
  }
}

export { STEPS as FINDER_STEPS };
