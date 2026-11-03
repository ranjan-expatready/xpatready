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
import { closingChange } from "./form-uses.ts";
import { HttpException, HttpStatus, Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "@prisma/client";
import { costUsd } from "../../../p2/ledger.ts";
import { EXPERIMENT_CAP_USD, LEDGER_DIR, MAX_ATTEMPTS, MAX_PAID_ATTEMPTS_PER_FORM, OVERRIDE_CEILING_USD, RUN_CAP_USD } from "../../../p2/policy.ts";
import { ACTORS, Audit, Db, fail, need, PROTOTYPE, Workspace, type Actor } from "./core.ts";
/** A person by name on every AI work view (Screen 02 board view 10): never an internal id. */
const personName = (id: string) => ACTORS.find((a) => a.id === id)?.name ?? "A person";
/** A4 (Screen 02 slice 2, challenge point 5): a step's parts as it ran them, read-only, in plain counts. */
type PartState = { index: number; sections: string[]; fields: number; status: string; cost_usd?: number; error?: string | null };
const partsOf = (detail: unknown) => ((detail as { a4?: { parts?: PartState[] } } | null)?.a4?.parts ?? []).map((p) => ({ index: p.index, sections: p.sections, fields: p.fields, status: p.status, cost_usd: p.cost_usd ?? 0, message: p.error ?? null }));
type A4 = { total: number; reused: number; leftover: number };
const a4Of = (detail: unknown): A4 | null => { const a = (detail as { a4?: A4 } | null)?.a4; return a ? { total: a.total, reused: a.reused, leftover: a.leftover } : null; };
const partsLine = (all: ReturnType<typeof partsOf>) => { if (!all.length) return null; const n = (s: string) => all.filter((p) => p.status === s).length; return `${all.length} part${all.length === 1 ? "" : "s"} · ${[n("done") && `${n("done")} done`, n("failed") && `${n("failed")} failed`, n("running") && `${n("running")} running`, n("queued") && `${n("queued")} queued`, n("not started") && `${n("not started")} not started`].filter(Boolean).join(", ")}`; };
import { aiLive, overrideOf, Sources } from "./sources.ts";
import { plainRunText } from "./plain-run-text.ts";
import { runWorstUsd } from "../../engine/cost-check.ts";
import { effective } from "../../engine/snapshot.ts";
import { checkOverride, costPlanNow, endedOverrides, ledgerRead, overrideAllowed, recordOverride, spendOverride } from "./cost-gate.ts";
import { SpendLedger } from "../../../p2/ledger.ts";
import { OverrideStart, type OverrideRef } from "../../contracts/cost-check.ts";
import { paidRetryAllowed, paidRunAllowed, paidRunsOf } from "./rounds.ts";
/** C11.8 (P-175, one door rule as the finder): on a copy without the live switch no field-map step that would call the
 *  model starts, by Start or by Retry; the words name the free choice this panel offers (review m3: not "rules only"). */
export const FIELD_MAP_LIVE_OFF = "AI now is switched off on this copy: no paid AI call can start here. Choose Saved (US$0) to use the result of earlier real runs.";
/** A field-map target that would send a model call: a live draft that is not every field reused (those are US$0). */
const callsModel = (mode: string, t: { action: string; worst_usd: number }) => mode === "LIVE" && t.action === "draft" && t.worst_usd !== 0;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const MAX_PARALLEL = 2, MAX_ATTEMPTS_PER_SOURCE = 3;
const round = (n: number) => Math.round(n * 100) / 100;

type Mode = "LIVE" | "REPLAY" | "STUB";
export type Scope = { kind: "catalogue" | "program" | "combination" | "source"; ids: string[] };
type Action = "draft" | "reuse_saved_output" | "reuse_library" | "skip" | "not_eligible";
type Target = { combinationId: string; combination: string; program: string; attachmentId: string; source: string; action: Action; why: string; read_first?: boolean; run_file?: string; fingerprint?: string; expected_usd: number | null; worst_usd: number;
  /** A4: the draft reuse first and in parts (how many form fields the library fills, how many the AI sees, in how many parts). */
  a4?: { total: number; reused: number; reused_from: string[]; to_ai: number; parts: { index: number; sections: string[]; fields: number; worst_usd: number }[] };
  /** F3 D4, BR-7: the same file is being mapped in another combination (its job, for a link). */
  elsewhere?: { combination: string; job_href: string };
  /** P-179 Q2: the form has used its paid attempts; a person's Continue allows exactly one more run of it. */
  over_attempts?: boolean };

const ACTION_TEXT: Record<Action, string> = { draft: "Draft field map", reuse_saved_output: "Use the saved AI answer (no cost)", reuse_library: "Add from library", skip: "Skip", not_eligible: "Not eligible" };

/** A step the retry runs again: it failed, was blocked, or was cancelled before anything of it was sent (before it
 *  started, or with parts "not started": QA-32). The batch view says it per step, so the page offers Retry only where the
 *  server will retry (review of the qa Minors pass, 2). */
const retryable = (j: { status: string; message: string | null; detail: unknown }) => j.status === "FAILED" || j.status === "BLOCKED"
  || (j.status === "CANCELLED" && (!!j.message?.startsWith("Cancelled before it started") || ((j.detail as { a4?: { parts?: { status: string }[] } } | null)?.a4?.parts ?? []).some((p) => p.status === "not started")));

/** QA-62: the form finder keeps "<combination id>|<place>" as its scope (to find a combination's runs); people see the place. */
const scopeWords = (b: { operation: string; scopeLabel: string }) => (b.operation === "find_forms" && b.scopeLabel.includes("|") ? b.scopeLabel.slice(b.scopeLabel.indexOf("|") + 1) : b.scopeLabel);

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
    const comps = await this.db.combination.findMany({ where: { id: { in: combinationIds } }, include: { program: true, attachments: { orderBy: { createdAt: "asc" } }, forms: { select: { lineageKey: true, status: true, version: true, channel: true, form: { select: { editions: { select: { id: true, channel: true, portalKey: true } } } } } } } });
    // QA-163: a form already in a combination's configuration is skipped only when it has a field map (an edition the
    // snapshot reads with at least one effective field-map entry, engine/snapshot.ts); a form listed without one (the six's
    // IMM 5257 after Reset to the six) is drafted like any other, so Saved works at US$0.
    const mapped = await this.mappedEditions(comps.flatMap((c) => c.forms.flatMap((f) => f.form.editions.map((e) => e.id))));
    // Only an edition with its boxes mapped can be reused: an upload registers its edition before any map exists.
    const editions = await this.db.formEdition.findMany({ where: { workspaceId, maps: { some: {} } }, select: { sha256: true, editionLabel: true } });
    const jobs = await this.db.draftingJob.findMany({ where: { workspaceId, kind: { in: ["field_map", "reuse_map"] } }, orderBy: { startedAt: "desc" }, select: { id: true, attachmentId: true, status: true, kind: true, fingerprint: true, runId: true, mode: true, costUsd: true } });
    // Outside review 29 Oct: a form's paid runs across every batch and combination that holds the same file.
    const paidRunsOfFile = await this.paidRunsByFile(workspaceId, jobs);
    // P-80: files a second person approved in the product are drafted like official ones (the guard checks the approval).
    const inProduct = new Set((await this.db.approvedSource.findMany({ where: { workspaceId, kind: "form" }, select: { sha256: true } })).map((x) => x.sha256));
    // S4 (M3): an official download from canada.ca is admitted like the official library, live included.
    const downloaded = new Set((await this.db.officialDownload.findMany({ where: { workspaceId, kind: "form" }, select: { sha256: true } })).map((x) => x.sha256));
    for (const s of downloaded) inProduct.add(s);
    const order = new Map(combinationIds.map((id, i) => [id, i]));
    const targets: Target[] = [];
    const draftedHere = new Map<string, string>(); // form edition (file hash) → the combination whose draft covers it
    // S4 round 5 (P-116): a retired library form is hidden from AI: its file is never drafted, whatever the scope.
    const retiredShas = new Set((await this.db.formEdition.findMany({ where: { workspaceId, form: { retiredAt: { not: null } } }, select: { sha256: true } })).map((e) => e.sha256).filter(Boolean));
    const closingKeys = new Set((await this.db.libraryChange.findMany({ where: { workspaceId, kind: "library_form", action: { in: ["RETIRE", "DELETE"] }, status: { in: ["WAITING", "APPROVED"] } }, select: { key: true } })).map((x) => x.key));
    // F3 D4 (review Minor 5): who is mapping each file, read once for the whole plan, never once per source.
    const elsewhereOf = await this.mappingIndex(workspaceId, comps.flatMap((c) => c.attachments.map((a) => a.sha256)));
    for (const c of [...comps].sort((a, b) => order.get(a.id)! - order.get(b.id)!)) {
      const inConfig = new Set<string>();
      const byLineage = new Map<string, (typeof c.forms)[number]>();
      for (const f of c.forms) { const cur = byLineage.get(f.lineageKey); if (!cur || f.version > cur.version) byLineage.set(f.lineageKey, f); }
      // As the snapshot reads a line's editions: PDF ones, and an online version only on a line filed Online from this
      // combination's portal.
      const readsMap = (f: (typeof c.forms)[number]) => f.form.editions.some((e) => (e.channel !== "ONLINE" || (f.channel === "ONLINE" && e.portalKey === c.portalKey)) && mapped.has(e.id));
      for (const [k, f] of byLineage) if (f.status !== "RETIRED" && readsMap(f)) inConfig.add(k);
      for (const a of c.attachments) {
        if (attachmentId && a.id !== attachmentId) continue;
        const base = { combinationId: c.id, combination: c.label, program: c.program.label, attachmentId: a.id, source: a.edition ?? a.fileName, expected_usd: null as number | null, worst_usd: 0 };
        const approvedHere = !a.recognised && inProduct.has(a.sha256);
        if (!a.recognised && !approvedHere) { if (attachmentId) targets.push({ ...base, action: "not_eligible", why: "Not an approved file (neither in the official library nor approved in the product by a second person): never read or sent to the AI." }); continue; }
        if (a.kind !== "Form") { if (attachmentId) targets.push({ ...base, action: "not_eligible", why: "Checklist or instructions: field-map drafting applies to fillable forms only. Document requirements are authored by people." }); continue; }
        if (retiredShas.has(a.sha256)) { targets.push({ ...base, action: "not_eligible", why: "Retired in the library: AI does not draft it. Restore it there first." }); continue; }
        const formKey = (a.edition ?? "").split(" (")[0];
        if (closingKeys.has(formKey)) { targets.push({ ...base, action: "not_eligible", why: "A request to retire or delete it is open on To review: AI does not draft it until that is decided." }); continue; }
        const active = jobs.find((j) => j.attachmentId === a.id && (j.status === "QUEUED" || j.status === "RUNNING"));
        const waiting = jobs.find((j) => j.attachmentId === a.id && j.kind === "field_map" && j.status === "COMPLETED" && j.mode !== "STUB");
        if (inConfig.has(formKey)) { targets.push({ ...base, action: "skip", why: `${formKey} is already in this combination's configuration.` }); continue; }
        if (active) { targets.push({ ...base, action: "skip", why: "A step for this form is already queued or running." }); continue; }
        if (editions.some((e) => e.sha256 === a.sha256)) { targets.push({ ...base, action: "reuse_library", why: "The library holds this edition's reviewed field map: add it to the draft, no AI call, US$0." }); continue; }
        // F3 D4, BR-7 (P-38 "analysed once"): the same file being mapped in another combination is never drafted again,
        // even from the form's own Draft setup button (draftAgain) or from a saved answer; its decisions come here once
        // they are added to the draft.
        const elsewhere = elsewhereOf(a.sha256, a.id);
        if (elsewhere) { targets.push({ ...base, action: "skip", why: elsewhere.why, elsewhere: { combination: elsewhere.combination, job_href: elsewhere.href } }); continue; }
        if (waiting && !opts.draftAgain) { targets.push({ ...base, action: "skip", why: "An AI draft of this form is waiting for review; review it, or choose to draft again." }); continue; }
        if (draftedHere.has(a.sha256)) { targets.push({ ...base, action: "skip", why: `Same form as in ${draftedHere.get(a.sha256)}: review that draft once; once applied, add it here from the library.` }); continue; }
        draftedHere.set(a.sha256, c.label);
        const read_first = a.status === "RECOGNISED" || a.status === "READ_FAILED";
        // A paid call admits official inputs only today (p2/runner.ts): an approved form's live call waits for that change.
        if (approvedHere && !downloaded.has(a.sha256) && mode === "LIVE") { targets.push({ ...base, action: "not_eligible", read_first, why: "Approved in the product by a second person: drafted through the guarded stub pass (no cost). A live AI call for it is not open yet: the paid route admits only the official library's files." }); continue; }
        const inventoryFile = this.sources.inventoryOf(a);
        const prepared = inventoryFile ? this.sources.ensureJobFile({ officialFile: this.sources.draftName(a), inventoryFile }, await this.sources.printedEdition(a)) : null;
        const fingerprint = prepared ? sha(JSON.stringify({ input: prepared.inputSha, template: prepared.template, settings: prepared.settings, known: prepared.known })) : undefined;
        const all = prepared ? this.sources.savedRuns(prepared.jobId, prepared.inputSha) : [];
        // A3: a saved answer is used before paying again; one that failed only our own check is re-checked first.
        const usable = all.find((r) => r.valid) ?? all.find((r) => r.recheckable);
        const savedWhy = (r: NonNullable<typeof usable>) => `Saved AI answer for this same form${r.recheckable ? " (it failed an earlier check and is re-checked with today's rules first)" : r.rechecked ? " (re-checked with today's rules)" : ""}: no model call, US$0.`;
        if (mode === "REPLAY") {
          if (!usable) {
            // A form drafted in parts (A4) is saved part by part: Saved uses those parts when every part has a valid saved
            // answer for exactly its inputs, and is assembled as a live draft in parts would be (no model call, US$0). A
            // form with a part missing keeps waiting: never half-filled.
            const split = inventoryFile ? await this.sources.draftSplit(a, await this.sources.printedEdition(a), false) : null;
            const savedParts = split?.parts.filter((p) => p.saved_run).length ?? 0;
            if (split && split.parts.length && savedParts === split.parts.length) {
              const a4 = { total: split.plan.total, reused: split.plan.reused.length, reused_from: split.reusedFrom, to_ai: split.plan.leftover, parts: split.parts.map((p) => ({ index: p.index, sections: p.sections, fields: p.fields, worst_usd: 0, saved_answer: true, repeats_failed_run: null })) };
              targets.push({ ...base, action: "reuse_saved_output", read_first, fingerprint: sha(JSON.stringify({ fingerprint, parts: split.parts.map((p) => [p.file, p.saved_run]) })), a4, why: `Saved AI answers for each of its ${split.parts.length} parts (${split.plan.leftover} of ${split.plan.total} form fields${split.plan.reused.length ? `; ${split.plan.reused.length} reused from ${split.reusedFrom.join(", ")} without AI` : ""}): no model call, US$0.` }); continue;
            }
            if (split && savedParts) { targets.push({ ...base, action: "not_eligible", read_first, why: `Saved AI answers for ${savedParts} of its ${split.parts.length} parts only: it waits for Draft with AI, so it is never half-filled.` }); continue; }
            targets.push({ ...base, action: "not_eligible", read_first, why: read_first ? "No saved AI answer to use (the form has not been read yet)." : "No saved AI answer for this form; run it live." }); continue;
          }
          targets.push({ ...base, action: "reuse_saved_output", read_first, run_file: usable.file, fingerprint, why: savedWhy(usable) }); continue;
        }
        if (mode === "LIVE" && usable && !opts.draftAgain) { targets.push({ ...base, action: "reuse_saved_output", read_first, run_file: usable.file, fingerprint, why: savedWhy(usable) }); continue; }
        const repeat = mode === "LIVE" && prepared ? this.sources.repeatsFailedRun(prepared.jobId, prepared.draftInputs) : null;
        if (repeat) { targets.push({ ...base, action: "not_eligible", read_first, why: `A new paid call is refused: an earlier run asked the AI exactly this (same form, prompt, settings) and its answer failed our own check, so asking again would repeat it. Use the saved AI answer instead (no cost): it is re-checked with today's rules.` }); continue; }
        // A4: reuse first and in parts when the library already maps some of this form's fields or the form is large.
        const split = inventoryFile ? await this.sources.draftSplit(a, await this.sources.printedEdition(a), false) : null;
        const a4 = split ? { total: split.plan.total, reused: split.plan.reused.length, reused_from: split.reusedFrom, to_ai: split.plan.leftover, parts: split.parts.map((p) => ({ index: p.index, sections: p.sections, fields: p.fields, worst_usd: p.worst_usd, saved_answer: !!p.saved_run, repeats_failed_run: p.repeats_failed_run })) } : undefined;
        const est = mode !== "LIVE" ? { expected: 0, worst: 0 } : split ? { expected: null, worst: split.worst_usd } : this.estimate(prepared, all.filter((r) => r.valid || r.recheckable));
        const fp = split ? sha(JSON.stringify({ fingerprint, parts: split.parts.map((p) => p.file) })) : fingerprint;
        const how = split ? `in ${split.parts.length} part${split.parts.length === 1 ? "" : "s"} (${split.plan.leftover} of ${split.plan.total} form fields${split.plan.reused.length ? `; ${split.plan.reused.length} reused from ${split.reusedFrom.join(", ")} without AI` : ""})` : "";
        if (split && !split.parts.length) { targets.push({ ...base, action: "draft", read_first, fingerprint: fp, expected_usd: 0, worst_usd: 0, a4, why: `Every one of its ${split.plan.total} form fields is reused from ${split.reusedFrom.join(", ")} (same data path and caption): no AI call, US$0; a person reviews the result.` }); continue; }
        // P-179 Q2 (Lead, 30 Oct): a form with no paid attempt left is no longer refused outright: it is a draft over the
        // "attempts" limit, started only with a person's Continue, which allows exactly one more run of it.
        if (mode === "LIVE" && !paidRunAllowed(paidRunsOfFile(a.sha256))) { targets.push({ ...base, action: "draft", over_attempts: true, read_first, fingerprint: fp, expected_usd: est.expected, worst_usd: est.worst, ...(a4 ? { a4 } : {}), why: `This form has used its ${MAX_PAID_ATTEMPTS_PER_FORM} paid AI attempts (${MAX_ATTEMPTS} per run, counted across its runs): another paid run needs a person's Continue, which allows exactly one more. A saved AI answer, if there is one, can still be used at no cost.` }); continue; }
        targets.push({ ...base, action: "draft", read_first, fingerprint: fp, expected_usd: est.expected, worst_usd: est.worst, ...(a4 ? { a4 } : {}), why: `${approvedHere ? "Approved in the product by a second person, so it can be drafted. " : ""}${mode === "LIVE" ? `${read_first ? "Read the form on this computer, then a" : "A"} guarded live call${how ? ` ${how}` : ""} (stub pass first; up to ${2} attempts${split ? " per part" : ""}).` : `${read_first ? "Read the form, then the" : "The"} guarded stub pass${how ? ` ${how}` : ""}: no network, no cost, no AI content.`}` });
      }
    }
    const runnable = targets.filter((t) => t.action === "draft" || t.action === "reuse_saved_output" || t.action === "reuse_library");
    const totals = { targets: targets.length, model_calls: targets.filter((t) => t.action === "draft" && mode === "LIVE").length, steps: runnable.length, reuse: targets.filter((t) => t.action.startsWith("reuse")).length, skipped: targets.filter((t) => t.action === "skip").length, not_eligible: targets.filter((t) => t.action === "not_eligible").length,
      expected_usd: targets.some((t) => t.action === "draft" && t.expected_usd === null) ? null : round(targets.reduce((a, t) => a + (t.expected_usd ?? 0), 0)), worst_usd: round(targets.reduce((a, t) => a + t.worst_usd, 0)) };
    const ledger = this.sources.ledger();
    const plan_sha256 = sha(JSON.stringify({ mode, scope: scope.kind, targets: targets.map((t) => [t.combinationId, t.attachmentId, t.action, t.run_file ?? null, t.fingerprint ?? null, t.over_attempts ?? false]) }));
    // P-179: the one cost check (the shared ledger's numbers) and the run key a Continue names. A form drafted in parts is
    // one run per part, each held to the run cap on its own (found by check_cost_warning_browser: "run" was flagged).
    const { cost_check, run_key } = costPlanNow("draft_field_maps", plan_sha256, { worst: totals.worst_usd, expected: totals.expected_usd, run: Math.max(0, ...targets.flatMap((t) => t.a4?.parts.length ? t.a4.parts.map((x) => x.worst_usd) : [t.worst_usd])), spentForms: targets.filter((t) => t.over_attempts).map((t) => t.source) }, await endedOverrides(this.db));
    // C11.8 AT-1 (P-175): live is off unless the server switch is on, said before anything starts (as the finder's plan);
    // `blocked` is the one rule the panel and the door share: this live start would call the model and cannot.
    const live = { on: aiLive(), why: aiLive() ? null : FIELD_MAP_LIVE_OFF, blocked: !aiLive() && targets.some((t) => callsModel(mode, t)) };
    return { live, cost_check, run_key, max_paid_attempts_per_form: MAX_PAID_ATTEMPTS_PER_FORM, operation: "draft_field_maps", operation_label: "Draft field maps for added forms", capability_note: "AI drafts each form's field map (which fact fills each form field). Questions, sections and rules are not AI-drafted here (a checklist's document requirements are read below, under Checklists): people author them, and AI field maps only propose library fields.", scope: { ...scope, label }, mode, targets: targets.map((t) => ({ ...t, action_label: ACTION_TEXT[t.action] })), totals, ledger, per_run_cap_usd: RUN_CAP_USD, plan_sha256 };
  }

  /** QA-163: the form editions holding at least one field-map entry in effect in the draft (engine/snapshot.ts effective,
   *  the rows the snapshot's field_maps carry). One query for the whole plan. */
  private async mappedEditions(editionIds: string[]) {
    const ids = [...new Set(editionIds)];
    const rows = ids.length ? await this.db.formFieldMap.findMany({ where: { formEditionId: { in: ids } }, select: { id: true, formEditionId: true, dataPath: true, version: true, status: true, supersedesId: true } }) : [];
    return new Set(effective(rows, (m) => `${m.formEditionId}|${m.dataPath}`, "draft").map((m) => m.formEditionId));
  }

  /** Outside review 29 Oct (G4 per form): the paid live runs of each file (checksum), over every source that holds it, so
   *  a new batch (Draft again) and a retry count the same runs. A step whose source is gone counts under its own id. */
  private async paidRunsByFile(workspaceId: string, jobs: { attachmentId: string | null; kind: string; mode: string; status: string; costUsd: number | null }[]) {
    const ids = [...new Set(jobs.map((j) => j.attachmentId).filter((x): x is string => !!x))];
    const shaOf = new Map((await this.db.sourceAttachment.findMany({ where: { workspaceId, id: { in: ids } }, select: { id: true, sha256: true } })).map((x) => [x.id, x.sha256]));
    const byFile = new Map<string, typeof jobs>();
    for (const j of jobs) { const k = (j.attachmentId && shaOf.get(j.attachmentId)) || j.attachmentId || ""; byFile.set(k, [...(byFile.get(k) ?? []), j]); }
    return (sha256: string) => paidRunsOf(byFile.get(sha256) ?? []);
  }

  /** F3 D4: for each file (checksum), the draft of it being mapped in another source. A source's draft is its newest
   *  field-map step that is not a stub pass and is queued, running, done or applied: any other step (failed, stopped,
   *  blocked by the usage limit, a failed "add from the library") never hides a draft waiting for review (break M4,
   *  Lead check Major). It is being mapped while queued, running, or done with proposals to decide or not yet added to
   *  its draft. An applied one is in the library and is added from there. One set of queries for a whole plan. */
  async mappingIndex(workspaceId: string, sha256s: string[], db: Pick<Db, "sourceAttachment" | "draftingJob" | "proposalItem"> = this.db) {
    const shas = [...new Set(sha256s)];
    const atts = shas.length ? await db.sourceAttachment.findMany({ where: { workspaceId, sha256: { in: shas } }, select: { id: true, sha256: true, combination: { select: { label: true } } } }) : [];
    const jobs = atts.length ? await db.draftingJob.findMany({ where: { workspaceId, attachmentId: { in: atts.map((a) => a.id) }, kind: "field_map", mode: { not: "STUB" }, status: { in: ["QUEUED", "RUNNING", "COMPLETED", "APPLIED"] } }, orderBy: { startedAt: "desc" }, select: { id: true, attachmentId: true, combinationId: true, status: true } }) : [];
    const newest = new Map<string, (typeof jobs)[number]>();
    for (const j of jobs) if (j.attachmentId && !newest.has(j.attachmentId)) newest.set(j.attachmentId, j);
    const waiting = [...newest.values()].filter((j) => ["QUEUED", "RUNNING", "COMPLETED"].includes(j.status));
    const done = waiting.filter((j) => j.status === "COMPLETED").map((j) => j.id);
    const left = new Map(done.length ? (await db.proposalItem.groupBy({ by: ["runId"], where: { runId: { in: done }, status: "waiting" }, _count: true })).map((g) => [g.runId!, g._count] as const) : []);
    const of = new Map(atts.map((a) => [a.id, a]));
    return (sha256: string, attachmentId: string) => {
      const j = waiting.find((x) => x.attachmentId !== attachmentId && of.get(x.attachmentId!)?.sha256 === sha256);
      if (!j) return null;
      const combination = of.get(j.attachmentId!)!.combination.label, n = left.get(j.id) ?? 0;
      const state = j.status !== "COMPLETED" ? `the AI draft is ${j.status === "RUNNING" ? "running" : "queued"}` : n ? `${n} proposal${n === 1 ? "" : "s"} left · a content publisher` : "every proposal is decided · the configuration author adds them to the draft";
      return { combination, href: `/c/${j.combinationId}/jobs/${j.id}`, why: `Being mapped in ${combination}: ${state}. Its decisions are reused here once they are added to the draft; no second AI draft.` };
    };
  }

  /** F3 D4: one draft per file at a time, across combinations, for every way a draft step is queued (a launch, a retry:
   *  PR #36 review). Every file's lock is taken first, in one order (break m1: never a deadlock), then each file is
   *  re-checked inside the same transaction: a draft of it queued or running anywhere, or being mapped in another
   *  source, refuses the whole request (409, in words) before any step is inserted. */
  private async guardDrafts(tx: Prisma.TransactionClient, workspaceId: string, attachmentIds: string[]) {
    if (!attachmentIds.length) return;
    const shaOf = new Map((await tx.sourceAttachment.findMany({ where: { id: { in: attachmentIds } }, select: { id: true, sha256: true } })).map((a) => [a.id, a.sha256]));
    for (const sha of [...new Set(shaOf.values())].sort()) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`draft:${workspaceId}:${sha}`}))`;
    const elsewhereNow = await this.mappingIndex(workspaceId, [...shaOf.values()], tx);
    for (const id of attachmentIds) {
      const sha = shaOf.get(id); if (!sha) continue;
      const same = (await tx.sourceAttachment.findMany({ where: { workspaceId, sha256: sha }, select: { id: true } })).map((x) => x.id);
      const busy = await tx.draftingJob.findFirst({ where: { workspaceId, kind: "field_map", mode: { not: "STUB" }, status: { in: ["QUEUED", "RUNNING"] }, attachmentId: { in: same } }, include: { combination: { select: { label: true } } } });
      const other = busy ? null : elsewhereNow(sha, id);
      if (busy || other) fail(other?.why ?? `Being mapped in ${busy!.combination?.label ?? "the library"}: a draft of this same form was started a moment ago. Nothing new was started; open it there.`, HttpStatus.CONFLICT);
    }
  }

  /** Expected cost from the newest real run of the same input; worst case exactly as the ledger reserves it. */
  private estimate(prepared: any, saved: any[]) {
    const runsDir = join(PROTOTYPE, "p2", "runs");
    const all = prepared ? this.sources.savedRuns(prepared.jobId, prepared.inputSha) : [];
    const past = all.map((r) => { try { return JSON.parse(readFileSync(join(runsDir, r.file), "utf8")); } catch { return null; } }).filter(Boolean);
    const bytes = past.find((p: any) => p.launch_evidence?.request_bytes)?.launch_evidence.request_bytes ?? (prepared?.inventoryBytes ?? 200_000) + 30_000;
    const perAttempt = costUsd(prepared?.settings.model ?? "claude-opus-5-5", bytes + 2_000, prepared?.settings.max_output_tokens ?? 64_000);
    const worst = runWorstUsd(perAttempt, prepared?.settings.max_attempts ?? 2);
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
  async launch(actor: Actor, b: { scope: Scope; mode: Mode; idempotencyKey: string; planSha256: string; spendLimitUsd?: number; draftAgain?: boolean; overrideId?: string }) {
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
    // P-179: over a limit, a start needs a person's Continue (checked here, used once inside the transaction below); without
    // one it is refused as before.
    let override: OverrideRef | null = null;
    if (!plan.cost_check.ok && b.overrideId) override = checkOverride(actor, b.overrideId, plan);
    if (!override) {
      const spent = plan.targets.filter((t) => t.over_attempts);
      if (spent.length) fail(`${spent.length} form${spent.length > 1 ? "s have" : " has"} used ${spent.length > 1 ? "their" : "its"} ${MAX_PAID_ATTEMPTS_PER_FORM} paid AI attempts (${MAX_ATTEMPTS} per run, counted across its runs): another paid run needs a person's Continue. Nothing was started.`);
      // N6 (found by check_cost_override): a start that can spend nothing (a stub pass, saved answers) is never refused by
      // the cap, even with spend already past it (remaining below 0), as costCheck and reserve say.
      if (plan.totals.worst_usd > 0 && plan.totals.worst_usd > plan.ledger.remaining_usd + 1e-9) fail(`The worst case (US$${plan.totals.worst_usd.toFixed(2)}) is above what is left of the experiment cap (US$${plan.ledger.remaining_usd.toFixed(2)} of US$${EXPERIMENT_CAP_USD}).`);
      if (!plan.cost_check.ok) fail(plan.cost_check.words);
    }
    // C11.8 AT-2/AT-9b (P-175): a live start that would call the model is refused at the door on a copy without the switch:
    // after the cost refusals (their own words stay), before anything is queued or reserved and before a Continue is used
    // (it is used inside the transaction below); saved answers and reuse stay free in live mode.
    if (b.mode === "LIVE" && !aiLive() && run.some((t) => callsModel(b.mode, t))) fail(FIELD_MAP_LIVE_OFF, HttpStatus.CONFLICT);
    const created = await this.db.$transaction(async (tx) => {
      const batch = await tx.aiBatch.create({ data: { workspaceId, idempotencyKey: b.idempotencyKey, operation: plan.operation, scopeKind: b.scope.kind, scopeLabel: plan.scope.label, mode: b.mode, status: "QUEUED", planSha256: plan.plan_sha256, plan: { ...plan, ...(override ? { override } : {}) } as any, spendLimitUsd: limit, worstCaseUsd: plan.totals.worst_usd, expectedUsd: plan.totals.expected_usd, startedBy: actor.id, message: `${run.length} step${run.length === 1 ? "" : "s"} queued` } });
      const ids: string[] = [];
      // F3 D4: a stub pass is no draft to review (no AI, nothing to decide), so stub passes never wait for each other.
      await this.guardDrafts(tx, workspaceId, b.mode === "STUB" ? [] : run.filter((t) => t.action !== "reuse_library").map((t) => t.attachmentId));
      for (const t of run) {
        const j = await tx.draftingJob.create({ data: { workspaceId, combinationId: t.combinationId, attachmentId: t.attachmentId, batchId: batch.id, kind: t.action === "reuse_library" ? "reuse_map" : "field_map", mode: t.action === "reuse_library" ? "LOCAL" : t.action === "reuse_saved_output" ? "REPLAY" : b.mode, status: "QUEUED", fingerprint: t.fingerprint ?? null, startedBy: actor.id,
          runFile: t.run_file ? `prototype/p2/runs/${t.run_file}` : null, runId: t.run_file ? t.run_file.replace(/(\.reconverted)?\.json$/, "") : null, costUsd: t.action === "draft" && b.mode === "LIVE" ? null : 0,
          message: `Queued: ${ACTION_TEXT[t.action]}${t.read_first ? " (read the form first)" : ""}` } });
        ids.push(j.id);
      }
      // Review m1: the Continue is used last, once every refusal above has passed; a refusal of the use rolls this back.
      if (override) spendOverride(actor, override);
      return { batch, ids };
    }).catch(async (e) => {
      if ((e as any)?.code !== "P2002") throw e;
      // The same launch key arriving twice at once (double click, network retry): the first one won; return it.
      const same = await this.db.aiBatch.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: b.idempotencyKey } } });
      if (same) return { batch: same, ids: [] as string[], duplicate: true };
      fail("A step for one of these forms was started a moment ago (another launch). Nothing new was started; open the running work instead.", HttpStatus.CONFLICT);
    }) as { batch: any; ids: string[]; duplicate?: boolean };
    if (created.duplicate) return this.batch(created.batch.id);
    await this.audit.log(workspaceId, actor.id, "started", "AI work", created.batch.id, `${actor.name} started "${plan.operation_label}" for ${plan.scope.label} (${b.mode.toLowerCase()}): ${run.length} steps, worst case US$${plan.totals.worst_usd.toFixed(2)}, limit US$${limit.toFixed(2)}${override ? `; continued past ${override.limits.join(", ")} (override ${override.id})` : ""}`, { plan_sha256: plan.plan_sha256, idempotency_key: b.idempotencyKey, ...(override ? { override_id: override.id, run_key: override.run_key } : {}) });
    this.enqueue(created.ids);
    return this.batch(created.batch.id);
  }

  /** The source-level button: the same plan and launch with the scope narrowed to one form (D280 one path). */
  async launchSource(actor: Actor, attachmentId: string, mode: "live" | "replay" | "stub", runFile?: string, idempotencyKey?: string, overrideId?: string) {
    need(actor, "author");
    // QA-30: a request without a mode (or with another word) is a plain 400, never a 500 from reading a missing value.
    if (!["live", "replay", "stub"].includes(String(mode))) fail('Choose how to draft this form: live, replay or stub ("live" is a paid AI call, "replay" a saved run, "stub" no AI, US$0).', HttpStatus.BAD_REQUEST);
    const m = mode.toUpperCase() as Mode;
    // S4 round 4 (P-116): a retired library form, or one whose retire or delete is open, is not drafted by AI.
    const att = await this.db.sourceAttachment.findUnique({ where: { id: attachmentId }, select: { sha256: true, workspaceId: true } });
    const ed = att?.sha256 ? await this.db.formEdition.findFirst({ where: { workspaceId: att.workspaceId, sha256: att.sha256 }, select: { form: { select: { formKey: true, retiredAt: true } } } }) : null;
    if (ed?.form.retiredAt) fail(`${ed.form.formKey} is retired in the library: AI does not draft it. Restore it there first.`, HttpStatus.CONFLICT);
    if (ed && (await closingChange(this.db, att!.workspaceId, ed.form.formKey))) fail(`A request to retire or delete ${ed.form.formKey} is open on To review: AI does not draft it until that is decided.`, HttpStatus.CONFLICT);
    const scope: Scope = { kind: "source", ids: [attachmentId] };
    // Break m2: the same launch key sent again returns its run, before the re-plan (which would see that run as running).
    if (idempotencyKey) {
      const again = await this.db.aiBatch.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId: att?.workspaceId ?? (await this.ws.id()), idempotencyKey } } });
      // PR #121 review (Devin, security): a key belongs to one form's run; another form's key is refused, never answered
      // with that run (as the finder does for its own keys).
      if (again && (again.scopeKind !== "source" || !((again.plan as { scope?: { ids?: string[] } } | null)?.scope?.ids ?? []).includes(attachmentId))) fail("This launch key belongs to another run. Look at the plan again to start a new one.", HttpStatus.CONFLICT);
      if (again) return (await this.batch(again.id)).jobs[0];
    }
    const p = await this.plan(scope, m, { draftAgain: true });
    const t = p.targets[0];
    if (!t || t.action === "skip" || t.action === "not_eligible") fail(t?.why ?? "Nothing to draft for this source.", t?.why?.includes("already queued or running") || t?.elsewhere ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST);
    if (m === "REPLAY" && runFile && t.run_file !== runFile) fail("That saved run is not the newest valid run for this form; choose again.", HttpStatus.CONFLICT);
    const batch = await this.launch(actor, { scope, mode: m, idempotencyKey: idempotencyKey ?? `source-${attachmentId}-${Date.now()}`, planSha256: p.plan_sha256, draftAgain: true, overrideId });
    return batch.jobs[0];
  }

  /** P-179: POST /ai/overrides. A person's Continue past the limits of the start they looked at, made again now. Author
   *  only; refused (409, nothing recorded) when the plan changed, fits, or would pass the ceiling. */
  async override(actor: Actor, body: any, findPlan: (s: { combinationId: string; mode: string; pageUrl?: string; only?: string[] }) => Promise<{ run_key: string; cost_check: any; operation_label: string }>) {
    need(actor, "author");
    const s = OverrideStart.safeParse(body?.start);
    if (!s.success) fail(s.error.issues[0]?.message ?? "Say which start this Continue is for.");
    const start = s.data!;
    const plan = start.kind === "find_forms" ? await findPlan(start) : await this.plan(start.scope, start.mode, { draftAgain: start.draftAgain });
    const o = overrideAllowed(actor, body, plan);
    const r = recordOverride(actor, o, await endedOverrides(this.db));
    const workspaceId = await this.ws.id();
    // Review m6: the audit says what was over and why, not the dialog's instructions ("Continue records…; Cancel…").
    const why = (plan.cost_check.over as { words: string }[]).map((x) => x.words).join(" ");
    await this.audit.log(workspaceId, actor.id, "ai_override", "AI work", r.id, `${actor.name} chose Continue past ${o.limits.join(", ")} for "${plan.operation_label}"${r.again ? " again (their Continue from a moment ago, not used yet, is the one this click uses)" : ""}: this one run, worst case US$${o.worst_usd.toFixed(2)}. ${why}${o.reason ? ` Reason: ${o.reason}` : ""}`, { run_key: o.run_key, limits: o.limits, worst_usd: o.worst_usd, expires_at: r.expires_at, ...(r.again ? { again: true } : {}), ...(o.reason ? { reason: o.reason } : {}) });
    return { override_id: r.id, expires_at: r.expires_at };
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
      if (fault) { const a = await this.db.sourceAttachment.findUnique({ where: { id: j.attachmentId! } }); if (a && a.fileName === fault) throw new Error("Induced test fault: this form was stopped on purpose on this test copy. Retry the failed step; after three attempts it needs a person."); }
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
    return { ...b, scopeLabel: scopeWords(b!), started_by_name: personName(b!.startedBy), plan: undefined, plan_targets: plan.targets, totals: plan.totals, operation_label: plan.operation_label, capability_note: plan.capability_note,
      spent_usd: round(b!.jobs.reduce((a, j) => a + (j.costUsd ?? 0), 0)), jobs: b!.jobs.map((j) => ({ retryable: b!.operation !== "screen_map" && retryable(j) && j.attempt < MAX_ATTEMPTS_PER_SOURCE, needs_person: b!.operation !== "screen_map" && retryable(j) && j.attempt >= MAX_ATTEMPTS_PER_SOURCE, said: plainRunText(j.message), parts: partsOf(j.detail), a4: a4Of(j.detail), id: j.id, combinationId: j.combinationId, combination: j.combination?.label ?? "Library", program: j.combination?.program.label ?? null, source: atts.find((a) => a.id === j.attachmentId)?.edition ?? atts.find((a) => a.id === j.attachmentId)?.fileName, kind: j.kind, mode: j.mode, status: j.status, message: j.message, costUsd: j.costUsd, runId: j.runId, attempt: j.attempt, attachmentId: j.attachmentId, detail: undefined })) };
  }

  async batches() {
    const workspaceId = await this.ws.id();
    const list = await this.db.aiBatch.findMany({ where: { workspaceId }, orderBy: { startedAt: "desc" }, take: 50, include: { jobs: { select: { status: true, costUsd: true, detail: true } } } });
    return list.map((b) => ({ id: b.id, scopeKind: b.scopeKind, scopeLabel: scopeWords(b), mode: b.mode, status: b.status, message: b.message, startedBy: b.startedBy, started_by_name: personName(b.startedBy), startedAt: b.startedAt, finishedAt: b.finishedAt, worstCaseUsd: b.worstCaseUsd, steps: b.jobs.length, parts: partsLine(b.jobs.flatMap((j) => partsOf(j.detail))), spent_usd: round(b.jobs.reduce((a, j) => a + (j.costUsd ?? 0), 0)), counts: b.jobs.reduce((m: Record<string, number>, j) => ({ ...m, [j.status]: (m[j.status] ?? 0) + 1 }), {}) }));
  }

  async cancel(actor: Actor, id: string) {
    need(actor, "author");
    const b = await this.db.aiBatch.findUnique({ where: { id } });
    if (!b) fail("This AI work no longer exists.", HttpStatus.NOT_FOUND);
    if (["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"].includes(b!.status)) fail("This AI work has already finished.", HttpStatus.CONFLICT);
    await this.db.aiBatch.update({ where: { id }, data: { cancelRequested: true } });
    const stopped = await this.db.draftingJob.updateMany({ where: { batchId: id, status: "QUEUED" }, data: { status: "CANCELLED", message: "Cancelled before it started: nothing was sent.", finishedAt: new Date() } });
    // S4 (M7, P-110): a running step's AI call is ended too (its launcher's process group); counted at its reserved worst case.
    const runningJobs = await this.db.draftingJob.findMany({ where: { batchId: id, status: "RUNNING" }, select: { detail: true } });
    const ids = new Set(runningJobs.map((j) => (j.detail as { job_id?: string } | null)?.job_id).filter((x): x is string => !!x));
    const ended = this.sources.stopLaunches((jobId) => [...ids].some((x) => jobId === x || jobId.startsWith(`${x}-p`)));
    const running = runningJobs.length;
    await this.audit.log(b!.workspaceId, actor.id, "cancelled", "AI work", id, `${actor.name} stopped AI work for ${scopeWords(b!)}: ${stopped.count} queued steps stopped, ${running} running (${ended.length} AI call${ended.length === 1 ? "" : "s"} ended; a call already sent is counted at its reserved worst case; nothing of it is applied)`);
    await this.settle(id);
    return { stopped: stopped.count, still_running: running, ...(await this.batch(id)) };
  }

  /** Retries the failed or cancelled-before-start steps only; completed steps are never re-run or re-billed. */
  async retry(actor: Actor, id: string, b: { idempotencyKey?: string } = {}) {
    need(actor, "author");
    const batch = await this.db.aiBatch.findUnique({ where: { id }, include: { jobs: true } });
    if (!batch) fail("This AI work no longer exists.", HttpStatus.NOT_FOUND);
    if (batch!.jobs.some((j) => j.status === "QUEUED" || j.status === "RUNNING")) fail("Wait until the running steps finish.", HttpStatus.CONFLICT);
    // W1-02 (break m1): a screen-map draft (online versions, parked with the browser extension) is never run again.
    if (batch!.operation === "find_forms") fail("This was a form-finder run: start Find again on the combination instead.", HttpStatus.CONFLICT);
    if (batch!.operation === "screen_map") fail("This was a screen-map draft of an online version: online versions are parked with the browser extension (later wave), so it is not run again.", HttpStatus.CONFLICT);
    const latest = new Map<string, any>();
    for (const j of batch!.jobs) { const k = `${j.attachmentId}|${j.kind}`; const cur = latest.get(k); if (!cur || j.attempt > cur.attempt) latest.set(k, j); }
    // QA-32: a step cancelled part-way (its later parts "not started") is retried too: its finished parts reuse their
    // saved answers (US$0) and only the parts never sent are drafted.
    const redo = [...latest.values()].filter(retryable);
    if (!redo.length) fail("Nothing to retry: every step finished or ran to its end. To draft a form anew, start its draft again.");
    const over = redo.filter((j) => j.attempt >= MAX_ATTEMPTS_PER_SOURCE);
    if (over.length) fail(`${over.length} step${over.length > 1 ? "s have" : " has"} reached ${MAX_ATTEMPTS_PER_SOURCE} attempts; it needs a person, not another retry.`);
    // Lead 29 Oct (G4): a live form has one budget of paid attempts across its runs (p2/policy.ts), counted at the most
    // each run could use; stub runs cost nothing and keep the run limit above.
    // Outside review 29 Oct: and the form's paid runs in every other batch (a Draft again) count against the same budget.
    const liveJobs = await this.db.draftingJob.findMany({ where: { workspaceId: batch!.workspaceId, kind: "field_map", mode: "LIVE" }, select: { attachmentId: true, kind: true, mode: true, status: true, costUsd: true } });
    const paidRunsOfFile = await this.paidRunsByFile(batch!.workspaceId, liveJobs);
    const shaOf = new Map((await this.db.sourceAttachment.findMany({ where: { id: { in: redo.map((j) => j.attachmentId!).filter(Boolean) } }, select: { id: true, sha256: true } })).map((x) => [x.id, x.sha256]));
    const worstEach = (batch!.plan as any).targets as any[];
    // P-179 follow-up (31 Oct, question in the PR): a run started with a person's Continue past "attempts" may be retried:
    // the Continue covers that run, retries included. Money stays within what the person accepted: the ledger holds the
    // run's reservations to the override's worst case and total spend to the ceiling.
    const ov = overrideOf(batch!.plan);
    const continued = (j: { mode: string; kind: string; attachmentId: string | null }) => !!ov && j.mode === "LIVE" && j.kind === "field_map" && !!worstEach?.find((t) => t.attachmentId === j.attachmentId)?.over_attempts;
    const spent = redo.filter((j) => !continued(j) && (!paidRetryAllowed(j.mode, j.attempt) || (j.mode === "LIVE" && j.kind === "field_map" && !paidRunAllowed(paidRunsOfFile(shaOf.get(j.attachmentId!) ?? j.attachmentId ?? "")))));
    if (spent.length) fail(`${spent.length} form${spent.length > 1 ? "s have" : " has"} used ${spent.length > 1 ? "their" : "its"} ${MAX_PAID_ATTEMPTS_PER_FORM} paid AI attempts (${MAX_ATTEMPTS} per run); ${spent.length > 1 ? "they need" : "it needs"} a person, not another paid retry.`);
    const worst = round(redo.reduce((a, j) => a + (j.mode === "LIVE" ? (worstEach.find((t) => t.attachmentId === j.attachmentId)?.worst_usd ?? RUN_CAP_USD) : 0), 0));
    const ledger = this.sources.ledger();
    if (ov) {
      const planOv = (batch!.plan as { override?: { worst_usd?: number; limits?: string[] } } | null)?.override;
      // #131 review M1: a retry of a Continue run fits what is left of the worst case the person accepted (every attempt
      // of the run counts toward it); more needs a new look at the cost and a new Continue.
      // #131 review m3 (as break m7): only the person who chose Continue spends under it; anyone else starts again and
      // chooses Continue themselves.
      const by = ledgerRead(() => new SpendLedger(LEDGER_DIR).override(ov.id))?.by;
      // PR #131 Devin: only a retry that sends a paid live call spends under the Continue; a free step (a saved answer, a
      // reuse) is any author's to retry, as before.
      const paid = redo.some((j) => j.mode === "LIVE" && j.kind === "field_map");
      if (paid && by !== actor.id) fail("This run was continued past a cost limit by another person: only they can retry it. Start the draft again to look at the cost and choose Continue yourself.", HttpStatus.CONFLICT);
      const room = ledgerRead(() => new SpendLedger(LEDGER_DIR).overrideRoomUsd(ov.id));
      if (room === null || worst > room + 1e-9) fail(`This run has used its Continue: a retry could cost up to US$${worst.toFixed(2)}, and ${room === null ? "the Continue is not in the spend ledger" : `only US$${room.toFixed(2)} is left of the US$${(planOv?.worst_usd ?? 0).toFixed(2)} the person accepted`}. Start the draft again to look at the cost and choose Continue again.`, HttpStatus.CONFLICT);
      // #131 review m1: past the cap only when the Continue named it; then held to the ceiling (the cap + 10%).
      const pastCap = (planOv?.limits ?? []).includes("experiment");
      if (pastCap ? ledger.committed_usd + worst > OVERRIDE_CEILING_USD + 1e-9 : worst > ledger.remaining_usd + 1e-9) fail(pastCap ? `Retrying could take spend to US$${(ledger.committed_usd + worst).toFixed(2)}, past the US$${OVERRIDE_CEILING_USD.toFixed(2)} a Continue may allow. The founder must raise the cap.` : `Retrying could cost up to US$${worst.toFixed(2)}, more than is left of the experiment cap.`, HttpStatus.CONFLICT);
    } else if (worst > ledger.remaining_usd) fail(`Retrying could cost up to US$${worst.toFixed(2)}, more than is left of the experiment cap.`);
    // C11.8 review m1 (P-175): Retry is a second door, checked last (the cost refusals keep their words). On a copy
    // without the switch a live field-map step that would call the model is not queued again (it would fail and use up an
    // attempt): refused before anything is queued or counted.
    if (!aiLive() && redo.some((j) => j.kind === "field_map" && callsModel(j.mode, { action: "draft", worst_usd: worstEach?.find((t) => t.attachmentId === j.attachmentId)?.worst_usd ?? RUN_CAP_USD }))) fail(FIELD_MAP_LIVE_OFF, HttpStatus.CONFLICT);
    let ids: string[] = [];
    try {
      // PR #36 review: a retried draft takes the same file lock and re-check as a launch, so it never queues a second
      // draft of a file another combination started or finished meanwhile (refused before any step is inserted).
      ids = await this.db.$transaction(async (tx) => {
        await this.guardDrafts(tx, batch!.workspaceId, redo.filter((j) => j.kind === "field_map" && j.mode !== "STUB").map((j) => j.attachmentId!));
        const made: string[] = [];
        for (const j of redo) made.push((await tx.draftingJob.create({ data: { workspaceId: j.workspaceId, combinationId: j.combinationId, attachmentId: j.attachmentId, batchId: id, kind: j.kind, mode: j.mode, status: "QUEUED", fingerprint: j.fingerprint, runFile: j.mode === "REPLAY" ? j.runFile : null, runId: j.mode === "REPLAY" ? j.runId : null, costUsd: j.mode === "LIVE" ? null : 0, attempt: j.attempt + 1, startedBy: actor.id, message: `Queued: retry ${j.attempt + 1} of ${MAX_ATTEMPTS_PER_SOURCE}` } })).id);
        return made;
      });
    } catch (e) { if ((e as any)?.code === "P2002") fail("One of these forms already has a step running.", HttpStatus.CONFLICT); throw e; }
    await this.db.aiBatch.update({ where: { id }, data: { status: "QUEUED", cancelRequested: false, finishedAt: null, message: `Retrying ${ids.length} step${ids.length > 1 ? "s" : ""}` } });
    await this.audit.log(batch!.workspaceId, actor.id, "retried", "AI work", id, `${actor.name} retried ${ids.length} step${ids.length > 1 ? "s" : ""} (failed, blocked or cancelled before being sent) of the AI work for ${scopeWords(batch!)} (worst case US$${worst.toFixed(2)}); completed steps were not re-run`);
    this.enqueue(ids);
    return this.batch(id);
  }

  /** Reset hook: forget queued steps of the workspace that is about to be removed. */
  forgetQueue() { this.queue = []; }
  saved(file: string) { return existsSync(join(PROTOTYPE, "p2", "runs", file)); }
}
