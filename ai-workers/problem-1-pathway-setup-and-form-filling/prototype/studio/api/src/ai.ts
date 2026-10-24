// Scoped AI work (D280): one governed path for every AI entry point. The catalogue toolbar, a program row, a
// combination and a single source all ask for a plan (targets, eligible sources, reuse, skips, cost) and launch the
// same batch of small tracked steps. Nothing here adds a model, provider or input: field-map drafting still runs
// through the P2 guarded launch (stub pass first, per-run cap, ledger), and replays reuse saved real runs, labelled.
//
// Controls, each enforced by the server or the database rather than by the screen:
//  - idempotency: a launch carries a key; the same key returns the same batch (unique per workspace);
//  - one active step per source and kind: a partial unique index refuses a second QUEUED/RUNNING step;
//  - the plan the person saw is re-made at launch and must have the same fingerprint, otherwise "review again";
//  - the batch's worst case must fit the person's batch limit and the experiment cap before anything is queued;
//  - bounded concurrency (2 steps at once) and bounded retries (3 attempts per source);
//  - cancel stops queued steps; a running paid call cannot be recalled, so its output is kept but never applied;
//  - restart: queued steps resume, running steps are marked interrupted; reset: steps of a removed workspace stop.
import { HttpException, HttpStatus, Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { costUsd } from "../../../p2/ledger.ts";
import { EXPERIMENT_CAP_USD, RUN_CAP_USD } from "../../../p2/policy.ts";
import { ACTORS, Audit, Db, fail, need, PROTOTYPE, Workspace, type Actor } from "./core.ts";
import { Sources } from "./sources.ts";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const MAX_PARALLEL = 2, MAX_ATTEMPTS_PER_SOURCE = 3;
const round = (n: number) => Math.round(n * 100) / 100;
type Mode = "LIVE" | "REPLAY" | "STUB";
export type Scope = { kind: "catalogue" | "program" | "combination" | "source"; ids: string[] };
type Action = "draft" | "reuse_saved_output" | "reuse_library" | "skip" | "not_eligible";
type Target = { combinationId: string; combination: string; program: string; attachmentId: string; source: string; action: Action; why: string; read_first?: boolean; run_file?: string; fingerprint?: string; expected_usd: number | null; worst_usd: number };

const ACTION_TEXT: Record<Action, string> = { draft: "Draft field map", reuse_saved_output: "Use the saved AI answer (no cost)", reuse_library: "Add from library", skip: "Skip", not_eligible: "Not eligible" };

@Injectable()
export class Ai implements OnModuleInit {
  private queue: string[] = [];
  private active = 0;
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Sources) private readonly sources: Sources) {}

  /** Restart recovery. Queued steps never started, so they resume; Sources marks running ones interrupted. */
  async onModuleInit() {
    await new Promise((r) => setTimeout(r, 300));
    const queued = await this.db.draftingJob.findMany({ where: { status: "QUEUED" }, orderBy: { startedAt: "asc" }, select: { id: true } });
    this.enqueue(queued.map((q) => q.id));
  }

  // ------------------------------------------------------------------ plan
  async plan(scope: Scope, mode: Mode, opts: { draftAgain?: boolean } = {}) {
    if (!["LIVE", "REPLAY", "STUB"].includes(mode)) fail("Choose live, replay or stub.");
    const workspaceId = await this.ws.id();
    const { combinationIds, attachmentId, label } = await this.resolve(workspaceId, scope);
    const comps = await this.db.combination.findMany({ where: { id: { in: combinationIds } }, include: { program: true, attachments: { orderBy: { createdAt: "asc" } }, forms: { select: { lineageKey: true, status: true, version: true } } } });
    // Only an edition with its boxes mapped can be reused: an upload registers its edition before any map exists.
    const editions = await this.db.formEdition.findMany({ where: { workspaceId, maps: { some: {} } }, select: { sha256: true, editionLabel: true } });
    const jobs = await this.db.draftingJob.findMany({ where: { workspaceId, kind: { in: ["field_map", "reuse_map"] } }, orderBy: { startedAt: "desc" }, select: { id: true, attachmentId: true, status: true, kind: true, fingerprint: true, runId: true, mode: true } });
    const order = new Map(combinationIds.map((id, i) => [id, i]));
    const targets: Target[] = [];
    const draftedHere = new Map<string, string>(); // form edition (file hash) → the combination whose draft covers it
    for (const c of [...comps].sort((a, b) => order.get(a.id)! - order.get(b.id)!)) {
      const inConfig = new Set<string>();
      const byLineage = new Map<string, { status: string; version: number }>();
      for (const f of c.forms) { const cur = byLineage.get(f.lineageKey); if (!cur || f.version > cur.version) byLineage.set(f.lineageKey, f); }
      for (const [k, f] of byLineage) if (f.status !== "RETIRED") inConfig.add(k);
      for (const a of c.attachments) {
        if (attachmentId && a.id !== attachmentId) continue;
        const base = { combinationId: c.id, combination: c.label, program: c.program.label, attachmentId: a.id, source: a.edition ?? a.fileName, expected_usd: null as number | null, worst_usd: 0 };
        if (!a.recognised) { if (attachmentId) targets.push({ ...base, action: "not_eligible", why: "Not an approved official file: never read or sent to the AI." }); continue; }
        if (a.kind !== "Form") { if (attachmentId) targets.push({ ...base, action: "not_eligible", why: "Checklist or instructions: field-map drafting applies to fillable forms only. Document requirements are authored by people." }); continue; }
        const formKey = (a.edition ?? "").split(" (")[0];
        const active = jobs.find((j) => j.attachmentId === a.id && (j.status === "QUEUED" || j.status === "RUNNING"));
        const waiting = jobs.find((j) => j.attachmentId === a.id && j.kind === "field_map" && j.status === "COMPLETED" && j.mode !== "STUB");
        if (inConfig.has(formKey)) { targets.push({ ...base, action: "skip", why: `${formKey} is already in this combination's configuration.` }); continue; }
        if (active) { targets.push({ ...base, action: "skip", why: "A step for this form is already queued or running." }); continue; }
        if (editions.some((e) => e.sha256 === a.sha256)) { targets.push({ ...base, action: "reuse_library", why: "The library holds this edition's reviewed field map: add it to the draft, no AI call, US$0." }); continue; }
        if (waiting && !opts.draftAgain) { targets.push({ ...base, action: "skip", why: "An AI draft of this form is waiting for review; review it, or choose to draft again." }); continue; }
        if (draftedHere.has(a.sha256)) { targets.push({ ...base, action: "skip", why: `Same form as in ${draftedHere.get(a.sha256)}: review that draft once; once applied, add it here from the library.` }); continue; }
        draftedHere.set(a.sha256, c.label);
        const read_first = a.status === "RECOGNISED" || a.status === "READ_FAILED";
        const inventoryFile = this.sources.inventoryOf(a);
        const prepared = inventoryFile ? this.sources.ensureJobFile({ officialFile: a.officialFile, inventoryFile }, await this.sources.printedEdition(a)) : null;
        const fingerprint = prepared ? sha(JSON.stringify({ input: prepared.inputSha, template: prepared.template, settings: prepared.settings, known: prepared.known })) : undefined;
        const all = prepared ? this.sources.savedRuns(prepared.jobId, prepared.inputSha) : [];
        // A3: a saved answer is used before paying again; one that failed only our own check is re-checked first.
        const usable = all.find((r) => r.valid) ?? all.find((r) => r.recheckable);
        const savedWhy = (r: NonNullable<typeof usable>) => `Saved AI answer from run ${r.run_id} (same form; prompt ${r.prompt ?? "unknown"}${r.recheckable ? "; it failed an earlier check and is re-checked with today's rules first" : r.rechecked ? "; re-checked with today's rules" : ""}): no model call, US$0.`;
        if (mode === "REPLAY") {
          if (!usable) { targets.push({ ...base, action: "not_eligible", read_first, why: read_first ? "No saved AI answer to use (the form has not been read yet)." : "No saved AI answer for this form; run it live." }); continue; }
          targets.push({ ...base, action: "reuse_saved_output", read_first, run_file: usable.file, fingerprint, why: savedWhy(usable) }); continue;
        }
        if (mode === "LIVE" && usable && !opts.draftAgain) { targets.push({ ...base, action: "reuse_saved_output", read_first, run_file: usable.file, fingerprint, why: savedWhy(usable) }); continue; }
        const repeat = mode === "LIVE" && prepared ? this.sources.repeatsFailedRun(prepared.jobId, prepared.draftInputs) : null;
        if (repeat) { targets.push({ ...base, action: "not_eligible", read_first, why: `A new paid call is refused: run ${repeat.run_id} asked the AI exactly this (same form, prompt, settings) and its answer failed our own check, so asking again would repeat it. Use the saved AI answer instead (no cost): it is re-checked with today's rules.` }); continue; }
        const est = mode === "LIVE" ? this.estimate(prepared, all.filter((r) => r.valid || r.recheckable)) : { expected: 0, worst: 0 };
        targets.push({ ...base, action: "draft", read_first, fingerprint, expected_usd: est.expected, worst_usd: est.worst, why: mode === "LIVE" ? `${read_first ? "Read the form on this computer, then a" : "A"} guarded live call (stub pass first; up to ${2} attempts).` : `${read_first ? "Read the form, then the" : "The"} guarded stub pass: no network, no cost, no AI content.` });
      }
    }
    const runnable = targets.filter((t) => t.action === "draft" || t.action === "reuse_saved_output" || t.action === "reuse_library");
    const totals = { targets: targets.length, model_calls: targets.filter((t) => t.action === "draft" && mode === "LIVE").length, steps: runnable.length, reuse: targets.filter((t) => t.action.startsWith("reuse")).length, skipped: targets.filter((t) => t.action === "skip").length, not_eligible: targets.filter((t) => t.action === "not_eligible").length,
      expected_usd: targets.some((t) => t.action === "draft" && t.expected_usd === null) ? null : round(targets.reduce((a, t) => a + (t.expected_usd ?? 0), 0)), worst_usd: round(targets.reduce((a, t) => a + t.worst_usd, 0)) };
    const ledger = this.sources.ledger();
    const plan_sha256 = sha(JSON.stringify({ mode, scope: scope.kind, targets: targets.map((t) => [t.combinationId, t.attachmentId, t.action, t.run_file ?? null, t.fingerprint ?? null]) }));
    return { operation: "draft_field_maps", operation_label: "Draft field maps for added forms", capability_note: "AI drafts each form's field map (which fact fills each form field). Questions, sections, document requirements and rules are not AI-drafted here: people author them, and AI field maps only propose library fields.", scope: { ...scope, label }, mode, targets: targets.map((t) => ({ ...t, action_label: ACTION_TEXT[t.action] })), totals, ledger, per_run_cap_usd: RUN_CAP_USD, plan_sha256 };
  }

  /** Expected cost from the newest real run of the same input; worst case exactly as the ledger reserves it. */
  private estimate(prepared: any, saved: any[]) {
    const runsDir = join(PROTOTYPE, "p2", "runs");
    const all = prepared ? this.sources.savedRuns(prepared.jobId, prepared.inputSha) : [];
    const past = all.map((r) => { try { return JSON.parse(readFileSync(join(runsDir, r.file), "utf8")); } catch { return null; } }).filter(Boolean);
    const bytes = past.find((p: any) => p.launch_evidence?.request_bytes)?.launch_evidence.request_bytes ?? (prepared?.inventoryBytes ?? 200_000) + 30_000;
    const perAttempt = costUsd(prepared?.settings.model ?? "claude-opus-5-5", bytes + 2_000, prepared?.settings.max_output_tokens ?? 64_000);
    const worst = round(Math.min(RUN_CAP_USD, perAttempt * (prepared?.settings.max_attempts ?? 2)));
    const lastOk = saved.length ? past.find((p: any) => p.drafting_run?.run_id === saved[0].run_id && p.drafting_run?.usage?.cost_usd) : null;
    return { expected: lastOk?.drafting_run?.usage?.cost_usd != null ? round(lastOk.drafting_run.usage.cost_usd) : null, worst };
  }

  private async resolve(workspaceId: string, scope: Scope): Promise<{ combinationIds: string[]; attachmentId?: string; label: string }> {
    if (!scope?.kind || !Array.isArray(scope.ids)) fail("Say what the AI should work on.");
    if (scope.kind === "source") {
      const a = await this.db.sourceAttachment.findFirst({ where: { id: scope.ids[0], workspaceId }, include: { combination: true } });
      if (!a) fail("That source does not exist in this workspace.", HttpStatus.NOT_FOUND);
      return { combinationIds: [a!.combinationId], attachmentId: a!.id, label: `${a!.edition ?? a!.fileName} in ${a!.combination.label}` };
    }
    if (scope.kind === "program") {
      const nodes = await this.db.programDef.findMany({ where: { workspaceId } });
      const p = nodes.find((n) => n.programNodeKey === scope.ids[0]);
      if (!p) fail("That program does not exist.", HttpStatus.NOT_FOUND);
      const keys = new Set([p!.programNodeKey]);
      for (let grew = true; grew;) { grew = false; for (const n of nodes) if (n.parentNodeKey && keys.has(n.parentNodeKey) && !keys.has(n.programNodeKey)) { keys.add(n.programNodeKey); grew = true; } }
      const comps = await this.db.combination.findMany({ where: { workspaceId, program: { programNodeKey: { in: [...keys] } } }, orderBy: { createdAt: "asc" }, select: { id: true } });
      return { combinationIds: comps.map((c) => c.id), label: `All combinations of ${p!.label}` };
    }
    if (!scope.ids.length) fail("Select at least one combination.");
    if (scope.ids.length > 400) fail("Select at most 400 combinations per launch.");
    const found = await this.db.combination.findMany({ where: { id: { in: scope.ids }, workspaceId }, select: { id: true, label: true } });
    if (found.length !== new Set(scope.ids).size) fail("One or more selected combinations no longer exist; refresh the list.", HttpStatus.CONFLICT);
    return { combinationIds: scope.ids, label: scope.kind === "combination" ? found[0].label : `${found.length} selected combination${found.length === 1 ? "" : "s"}` };
  }

  // ------------------------------------------------------------------ launch
  async launch(actor: Actor, b: { scope: Scope; mode: Mode; idempotencyKey: string; planSha256: string; spendLimitUsd?: number; draftAgain?: boolean }) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    if (!b.idempotencyKey || b.idempotencyKey.length < 8) fail("Missing launch key.");
    const again = await this.db.aiBatch.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: b.idempotencyKey } } });
    if (again) return this.batch(again.id); // the same launch, sent twice: nothing new starts
    const plan = await this.plan(b.scope, b.mode, { draftAgain: b.draftAgain });
    if (plan.plan_sha256 !== b.planSha256) fail("The work changed since you reviewed it (a source, a draft or a running step changed). Review the updated plan, then start again.", HttpStatus.CONFLICT);
    const run = plan.targets.filter((t) => t.action === "draft" || t.action === "reuse_saved_output" || t.action === "reuse_library");
    if (!run.length) fail("Nothing to do: every target is skipped or not eligible.");
    const limit = b.spendLimitUsd ?? plan.totals.worst_usd;
    if (plan.totals.worst_usd > limit + 1e-9) fail(`The worst case (US$${plan.totals.worst_usd.toFixed(2)}) is above this launch's limit (US$${limit.toFixed(2)}). Narrow the selection or raise the limit.`);
    if (plan.totals.worst_usd > plan.ledger.remaining_usd + 1e-9) fail(`The worst case (US$${plan.totals.worst_usd.toFixed(2)}) is above what is left of the experiment cap (US$${plan.ledger.remaining_usd.toFixed(2)} of US$${EXPERIMENT_CAP_USD}).`);
    const created = await this.db.$transaction(async (tx) => {
      const batch = await tx.aiBatch.create({ data: { workspaceId, idempotencyKey: b.idempotencyKey, operation: plan.operation, scopeKind: b.scope.kind, scopeLabel: plan.scope.label, mode: b.mode, status: "QUEUED", planSha256: plan.plan_sha256, plan: plan as any, spendLimitUsd: limit, worstCaseUsd: plan.totals.worst_usd, expectedUsd: plan.totals.expected_usd, startedBy: actor.id, message: `${run.length} step${run.length === 1 ? "" : "s"} queued` } });
      const ids: string[] = [];
      for (const t of run) {
        const j = await tx.draftingJob.create({ data: { workspaceId, combinationId: t.combinationId, attachmentId: t.attachmentId, batchId: batch.id, kind: t.action === "reuse_library" ? "reuse_map" : "field_map", mode: t.action === "reuse_library" ? "LOCAL" : t.action === "reuse_saved_output" ? "REPLAY" : b.mode, status: "QUEUED", fingerprint: t.fingerprint ?? null, startedBy: actor.id,
          runFile: t.run_file ? `prototype/p2/runs/${t.run_file}` : null, runId: t.run_file ? t.run_file.replace(/(\.reconverted)?\.json$/, "") : null, costUsd: t.action === "draft" && b.mode === "LIVE" ? null : 0,
          message: `Queued: ${ACTION_TEXT[t.action]}${t.read_first ? " (read the form first)" : ""}` } });
        ids.push(j.id);
      }
      return { batch, ids };
    }).catch(async (e) => {
      if ((e as any)?.code !== "P2002") throw e;
      // The same launch key arriving twice at once (double click, network retry): the first one won; return it.
      const same = await this.db.aiBatch.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: b.idempotencyKey } } });
      if (same) return { batch: same, ids: [] as string[], duplicate: true };
      fail("A step for one of these forms was started a moment ago (another launch). Nothing new was started; open the running work instead.", HttpStatus.CONFLICT);
    }) as { batch: any; ids: string[]; duplicate?: boolean };
    if (created.duplicate) return this.batch(created.batch.id);
    await this.audit.log(workspaceId, actor.id, "started", "AI work", created.batch.id, `${actor.name} started "${plan.operation_label}" for ${plan.scope.label} (${b.mode.toLowerCase()}): ${run.length} steps, worst case US$${plan.totals.worst_usd.toFixed(2)}, limit US$${limit.toFixed(2)}`, { plan_sha256: plan.plan_sha256, idempotency_key: b.idempotencyKey });
    this.enqueue(created.ids);
    return this.batch(created.batch.id);
  }

  /** The source-level button: the same plan and launch with the scope narrowed to one form (D280 one path). */
  async launchSource(actor: Actor, attachmentId: string, mode: "live" | "replay" | "stub", runFile?: string, idempotencyKey?: string) {
    need(actor, "author");
    const m = mode.toUpperCase() as Mode;
    const scope: Scope = { kind: "source", ids: [attachmentId] };
    const p = await this.plan(scope, m, { draftAgain: true });
    const t = p.targets[0];
    if (!t || t.action === "skip" || t.action === "not_eligible") fail(t?.why ?? "Nothing to draft for this source.", t?.why?.includes("already queued or running") ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST);
    if (m === "REPLAY" && runFile && t.run_file !== runFile) fail("That saved run is not the newest valid run for this form; choose again.", HttpStatus.CONFLICT);
    const batch = await this.launch(actor, { scope, mode: m, idempotencyKey: idempotencyKey ?? `source-${attachmentId}-${Date.now()}`, planSha256: p.plan_sha256, draftAgain: true });
    return batch.jobs[0];
  }

  // ------------------------------------------------------------------ worker
  private enqueue(ids: string[]) { this.queue.push(...ids); this.pump(); }
  private pump() {
    // STUDIO_HOLD_QUEUE=1 (isolated test server only) keeps steps queued, so restart recovery, cancel-before-start and
    // reset-while-pending can be shown deterministically. The demo server never sets it.
    if (process.env.STUDIO_HOLD_QUEUE === "1") return;
    while (this.active < MAX_PARALLEL && this.queue.length) {
      const id = this.queue.shift()!;
      this.active++;
      void this.step(id).catch(() => undefined).finally(() => { this.active--; this.pump(); });
    }
  }

  private async step(id: string) {
    const j = await this.db.draftingJob.findUnique({ where: { id }, include: { batch: true } });
    if (!j || j.status !== "QUEUED") return;
    if (j.batch?.cancelRequested) { await this.db.draftingJob.updateMany({ where: { id, status: "QUEUED" }, data: { status: "CANCELLED", message: "Cancelled before it started: nothing was sent.", finishedAt: new Date() } }); return this.settle(j.batchId); }
    const claimed = await this.db.draftingJob.updateMany({ where: { id, status: "QUEUED" }, data: { status: "RUNNING", startedAt: new Date() } });
    if (!claimed.count) return;
    if (j.batchId) await this.db.aiBatch.updateMany({ where: { id: j.batchId, status: "QUEUED" }, data: { status: "RUNNING" } });
    try {
      const fault = process.env.STUDIO_FAULT_SOURCE; // induced test fault, only in an isolated test server started with this variable
      if (fault) { const a = await this.db.sourceAttachment.findUnique({ where: { id: j.attachmentId! } }); if (a && a.fileName === fault) throw new Error(`Induced test fault for ${fault} (STUDIO_FAULT_SOURCE, test server only)`); }
      const actor = ACTORS.find((a) => a.id === j.startedBy) ?? ACTORS[0];
      if (j.kind === "reuse_map") {
        const r = await this.sources.reuseForm(actor, j.attachmentId!, {});
        await this.db.draftingJob.updateMany({ where: { id, status: "RUNNING" }, data: { status: "APPLIED", costUsd: 0, finishedAt: new Date(), message: `Added ${r.form} from the library to the draft (reviewed field map; no AI call).` } });
      } else {
        await this.sources.runDraftStep(id);
      }
      const after = await this.db.draftingJob.findUnique({ where: { id }, include: { batch: true } });
      if (after?.batch?.cancelRequested && after.status === "COMPLETED")
        await this.db.draftingJob.update({ where: { id }, data: { status: "CANCELLED", message: `${after.message} Cancelled while running: ${after.mode === "LIVE" ? `the AI call had already been sent (US$${Number(after.costUsd ?? 0).toFixed(2)})` : "the step had already started"}; its output is kept as a record and will not be applied. Drafting again reuses it without a new model call.` } });
    } catch (e) {
      const msg = e instanceof HttpException ? String(e.getResponse() && typeof e.getResponse() === "object" ? (e.getResponse() as any).message : e.getResponse()) : (e as Error).message;
      await this.db.draftingJob.updateMany({ where: { id, status: "RUNNING" }, data: { status: "FAILED", message: msg.slice(0, 500), finishedAt: new Date() } }).catch(() => undefined);
    }
    await this.settle(j.batchId);
  }

  /** Batch status from its steps. A failed step never discards its successful siblings. */
  private async settle(batchId: string | null) {
    if (!batchId) return;
    const b = await this.db.aiBatch.findUnique({ where: { id: batchId }, include: { jobs: { select: { status: true, costUsd: true } } } });
    if (!b) return; // the workspace was reset while the step ran: nothing to record
    const s = b.jobs.map((j) => j.status);
    if (s.some((x) => x === "QUEUED" || x === "RUNNING")) return;
    const ok = s.filter((x) => x === "COMPLETED" || x === "APPLIED").length, bad = s.filter((x) => x === "FAILED" || x === "BLOCKED").length, cancelled = s.filter((x) => x === "CANCELLED").length;
    const status = b.cancelRequested ? "CANCELLED" : bad && ok ? "PARTIAL" : bad ? "FAILED" : "COMPLETED";
    const spent = round(b.jobs.reduce((a, j) => a + (j.costUsd ?? 0), 0));
    await this.db.aiBatch.update({ where: { id: batchId }, data: { status, finishedAt: new Date(), message: `${ok} done, ${bad} failed, ${cancelled} cancelled · spent US$${spent.toFixed(2)}` } });
  }

  // ------------------------------------------------------------------ views and controls
  async batch(id: string) {
    const b = await this.db.aiBatch.findUnique({ where: { id }, include: { jobs: { orderBy: { startedAt: "asc" }, include: { combination: { select: { label: true, program: { select: { label: true } } } } } } } });
    if (!b) fail("This AI work no longer exists (the demo workspace may have been reset).", HttpStatus.NOT_FOUND);
    const atts = await this.db.sourceAttachment.findMany({ where: { id: { in: b!.jobs.map((j) => j.attachmentId!).filter(Boolean) } }, select: { id: true, edition: true, fileName: true } });
    const plan = b!.plan as any;
    return { ...b, plan: undefined, plan_targets: plan.targets, totals: plan.totals, operation_label: plan.operation_label, capability_note: plan.capability_note,
      spent_usd: round(b!.jobs.reduce((a, j) => a + (j.costUsd ?? 0), 0)), jobs: b!.jobs.map((j) => ({ id: j.id, combinationId: j.combinationId, combination: j.combination.label, program: j.combination.program.label, source: atts.find((a) => a.id === j.attachmentId)?.edition ?? atts.find((a) => a.id === j.attachmentId)?.fileName, kind: j.kind, mode: j.mode, status: j.status, message: j.message, costUsd: j.costUsd, runId: j.runId, attempt: j.attempt, attachmentId: j.attachmentId, detail: undefined })) };
  }

  async batches() {
    const workspaceId = await this.ws.id();
    const list = await this.db.aiBatch.findMany({ where: { workspaceId }, orderBy: { startedAt: "desc" }, take: 50, include: { jobs: { select: { status: true, costUsd: true } } } });
    return list.map((b) => ({ id: b.id, scopeKind: b.scopeKind, scopeLabel: b.scopeLabel, mode: b.mode, status: b.status, message: b.message, startedBy: b.startedBy, startedAt: b.startedAt, finishedAt: b.finishedAt, worstCaseUsd: b.worstCaseUsd, steps: b.jobs.length, spent_usd: round(b.jobs.reduce((a, j) => a + (j.costUsd ?? 0), 0)), counts: b.jobs.reduce((m: Record<string, number>, j) => ({ ...m, [j.status]: (m[j.status] ?? 0) + 1 }), {}) }));
  }

  async cancel(actor: Actor, id: string) {
    need(actor, "author");
    const b = await this.db.aiBatch.findUnique({ where: { id } });
    if (!b) fail("This AI work no longer exists.", HttpStatus.NOT_FOUND);
    if (["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"].includes(b!.status)) fail("This AI work has already finished.", HttpStatus.CONFLICT);
    await this.db.aiBatch.update({ where: { id }, data: { cancelRequested: true } });
    const stopped = await this.db.draftingJob.updateMany({ where: { batchId: id, status: "QUEUED" }, data: { status: "CANCELLED", message: "Cancelled before it started: nothing was sent.", finishedAt: new Date() } });
    const running = await this.db.draftingJob.count({ where: { batchId: id, status: "RUNNING" } });
    await this.audit.log(b!.workspaceId, actor.id, "cancelled", "AI work", id, `${actor.name} cancelled AI work for ${b!.scopeLabel}: ${stopped.count} queued steps stopped, ${running} already running (a sent AI call cannot be recalled; its output will not be applied)`);
    await this.settle(id);
    return { stopped: stopped.count, still_running: running, ...(await this.batch(id)) };
  }

  /** Retries the failed or cancelled-before-start steps only; completed steps are never re-run or re-billed. */
  async retry(actor: Actor, id: string, b: { idempotencyKey?: string } = {}) {
    need(actor, "author");
    const batch = await this.db.aiBatch.findUnique({ where: { id }, include: { jobs: true } });
    if (!batch) fail("This AI work no longer exists.", HttpStatus.NOT_FOUND);
    if (batch!.jobs.some((j) => j.status === "QUEUED" || j.status === "RUNNING")) fail("Wait until the running steps finish.", HttpStatus.CONFLICT);
    const latest = new Map<string, any>();
    for (const j of batch!.jobs) { const k = `${j.attachmentId}|${j.kind}`; const cur = latest.get(k); if (!cur || j.attempt > cur.attempt) latest.set(k, j); }
    const redo = [...latest.values()].filter((j) => j.status === "FAILED" || j.status === "BLOCKED" || (j.status === "CANCELLED" && j.message?.startsWith("Cancelled before it started")));
    if (!redo.length) fail("Nothing to retry: no step failed.");
    const over = redo.filter((j) => j.attempt >= MAX_ATTEMPTS_PER_SOURCE);
    if (over.length) fail(`${over.length} step${over.length > 1 ? "s have" : " has"} reached ${MAX_ATTEMPTS_PER_SOURCE} attempts; it needs a person, not another retry.`);
    const worstEach = (batch!.plan as any).targets as any[];
    const worst = round(redo.reduce((a, j) => a + (j.mode === "LIVE" ? (worstEach.find((t) => t.attachmentId === j.attachmentId)?.worst_usd ?? RUN_CAP_USD) : 0), 0));
    const ledger = this.sources.ledger();
    if (worst > ledger.remaining_usd) fail(`Retrying could cost up to US$${worst.toFixed(2)}, more than is left of the experiment cap.`);
    const ids: string[] = [];
    try {
      for (const j of redo) ids.push((await this.db.draftingJob.create({ data: { workspaceId: j.workspaceId, combinationId: j.combinationId, attachmentId: j.attachmentId, batchId: id, kind: j.kind, mode: j.mode, status: "QUEUED", fingerprint: j.fingerprint, runFile: j.mode === "REPLAY" ? j.runFile : null, runId: j.mode === "REPLAY" ? j.runId : null, costUsd: j.mode === "LIVE" ? null : 0, attempt: j.attempt + 1, startedBy: actor.id, message: `Queued: retry ${j.attempt + 1} of ${MAX_ATTEMPTS_PER_SOURCE}` } })).id);
    } catch (e) { if ((e as any)?.code === "P2002") fail("One of these forms already has a step running.", HttpStatus.CONFLICT); throw e; }
    await this.db.aiBatch.update({ where: { id }, data: { status: "QUEUED", cancelRequested: false, finishedAt: null, message: `Retrying ${ids.length} step${ids.length > 1 ? "s" : ""}` } });
    await this.audit.log(batch!.workspaceId, actor.id, "retried", "AI work", id, `${actor.name} retried ${ids.length} failed step${ids.length > 1 ? "s" : ""} of the AI work for ${batch!.scopeLabel} (worst case US$${worst.toFixed(2)}); completed steps were not re-run`);
    this.enqueue(ids);
    return this.batch(id);
  }

  /** Reset hook: forget queued steps of the workspace that is about to be removed. */
  forgetQueue() { this.queue = []; }
  saved(file: string) { return existsSync(join(PROTOTYPE, "p2", "runs", file)); }
}
