// Sources and AI drafting: the normal upload path for official forms/guides, the local "read form" step, the guarded
// AI field-map draft (p2/launch.ts: stub pass, then the live call under the existing route, input allowlist, ledger
// and caps), a labelled replay of a saved real run, comparison with the shared library and the person's decisions.
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import { manifest, slug } from "../../engine/import.ts";
import { normalize, type LibraryField } from "../../engine/normalize.ts";
import { EXPERIMENT_CAP_USD, RUN_CAP_USD } from "../../../p2/policy.ts";
import { subjectKindOf, VALUE_TYPE_TO_DATA_TYPE } from "../../engine/snapshot.ts";
import { compareEditions } from "../../engine/programs.ts";
import { checkedOutput, explainRun, failedOurCheck, isProviderLimit, sameDraftInputs, type DraftInputs } from "../../engine/ai-run.ts";
import { newKeyProblem } from "../../../contracts/fact-key.ts";
import { reconvertFile } from "../../../p2/reconvert.ts";
import { ACTORS, Audit, Db, fail, need, NODE, OFFICIAL, PROTOTYPE, PY, ROOT, SOLUTION, STUDIO, VAR, Workspace, type Actor } from "./core.ts";
const ACTOR_BY_ID = (id: string) => ACTORS.find((a) => a.id === id) ?? ACTORS[0];
/** The library revision a comparison was made against: every definition key, version and status. A different revision
 *  at apply time means the comparison is stale (D280). */
export async function libraryRevision(db: Db, workspaceId: string) {
  const rows = await db.canonicalField.findMany({ where: { workspaceId }, select: { canonicalFieldKey: true, version: true, status: true, meaning: true }, orderBy: [{ canonicalFieldKey: "asc" }, { version: "asc" }] });
  return { sha256: sha(rows.map((r) => `${r.canonicalFieldKey}|${r.version}|${r.status}|${r.meaning}`).join("\n")), fields: rows.length };
}

const run = promisify(execFile);
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const KIND: Record<string, string> = { forms: "Form", checklists: "Document checklist", instructions: "Instructions", "web-pages": "Web page" };
const JOBS = join(PROTOTYPE, "p2", "jobs"), RUNS = join(PROTOTYPE, "p2", "runs");
const PROMPTS = join(PROTOTYPE, "p2", "prompts");
const EDITION = /^IMM [0-9A-Z ]+ \([0-9]{2}-[0-9]{4}\)$/;
const TITLES: Record<string, string> = { "IMM 5257": "Application for Temporary Resident Visa", "IMM 1295": "Application for Work Permit made Outside of Canada", "IMM 5707": "Family Information", "IMM 5409": "Statutory Declaration of Common-law Union", "IMM 5476": "Use of a Representative", "IMM 5475": "Authority to Release Personal Information to a Designated Individual", "IMM 5257 SCH1": "Schedule 1: Background/Declaration" };

@Injectable()
export class Sources {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {
    // A job left "running" by a stopped server can never finish: say so instead of showing it as running forever.
    void this.db.draftingJob.updateMany({ where: { status: "RUNNING" }, data: { status: "FAILED", message: "The studio server stopped while this step was running; start it again.", finishedAt: new Date() } }).catch(() => undefined);
  }

  /** Attaches a file to a combination as a source and says whether AI may read it (only approved official files, by
   *  checksum, D147). Uploads reach this through the one form intake (intake.ts); "+ Add" calls it for a library file. */
  async attach(actor: Actor, combinationId: string, file: { originalname: string; buffer: Buffer }, via: "MANUAL" | "SAMPLE") {
    need(actor, "author");
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    if (!file?.buffer?.length) fail("The file is empty.");
    if (file.buffer.length > 25 * 1024 * 1024) fail("The file is larger than 25 MB.");
    const hash = sha(file.buffer);
    const dup = await this.db.sourceAttachment.findFirst({ where: { combinationId, sha256: hash } });
    if (dup) return { attachment: dup, duplicate: true, message: `Already attached as ${dup.fileName} (identical content); nothing added.` };
    const item = manifest().find((i) => i.sha256 === hash);
    const safe = basename(file.originalname).replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "upload.bin";
    const dir = join(VAR("demo"), "uploads"); mkdirSync(dir, { recursive: true });
    const stored = join(dir, `${hash.slice(0, 12)}-${safe}`);
    writeFileSync(stored, file.buffer);
    let status = "HELD", detail = "Not an approved official source (its content matches no file in the official library). It is kept as an attachment; it is not read or sent to the AI.";
    let edition: string | null = null, kind = "Unrecognised file";
    if (item) {
      kind = KIND[item.path.split("/")[0]] ?? "Official file"; edition = item.edition;
      const known = await this.db.formEdition.findFirst({ where: { workspaceId: c.workspaceId, sha256: hash, maps: { some: {} } } });
      if (known) { status = "IN_LIBRARY"; detail = `Recognised: ${item.edition}. Its boxes are already mapped in the library, so no AI drafting is needed.`; }
      else if (kind === "Form") { status = "RECOGNISED"; detail = `Recognised: ${item.edition}, an approved official form. Next: AI drafts its box map.`; }
      else { status = "ATTACHED"; detail = `Recognised: ${item.edition}, an approved official source. Kept as a source document; its text supports requirements and citations.`; }
    }
    const a = await this.db.sourceAttachment.create({ data: { workspaceId: c.workspaceId, combinationId, kind, fileName: safe, storedPath: stored.replace(`${ROOT}/`, ""), sha256: hash, bytes: file.buffer.length, recognised: !!item, officialFile: item?.file ?? null, edition, approval: item?.approval ?? null, status, statusDetail: detail, uploadedVia: via, uploadedBy: actor.id } });
    await this.audit.log(c.workspaceId, actor.id, "uploaded", "source", safe, `${actor.name} attached ${safe} to "${c.label}"${via === "SAMPLE" ? " (sample button)" : ""}: ${status === "HELD" ? "held, not recognised" : edition}`, { sha256: hash, via });
    return { attachment: a, duplicate: false, message: detail };
  }

  async read(actor: Actor, attachmentId: string) {
    need(actor, "author");
    const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: attachmentId } });
    if (!a.recognised || !a.officialFile) fail("Only recognised official forms are read.");
    if (a.kind !== "Form") fail("This is a checklist or instructions, not a fillable form; it is kept as a source.");
    const job = await this.db.draftingJob.create({ data: { workspaceId: a.workspaceId, combinationId: a.combinationId, attachmentId, kind: "read_form", mode: "LOCAL", status: "RUNNING", message: "Reading the form's boxes on this computer (no AI)", startedBy: actor.id } });
    try {
      const { stdout } = await run(PY, ["-I", join(STUDIO, "tools", "read_form.py"), a.officialFile!], { cwd: ROOT, timeout: 120_000 });
      const r = JSON.parse(stdout.trim().split("\n").pop()!);
      if (!r.ok) throw new Error(r.error ?? r.status);
      await this.db.sourceAttachment.update({ where: { id: a.id }, data: { status: "READ", statusDetail: `Read: ${r.summary.entry_fields_bound} data boxes, ${r.summary.required_fields} required, ${r.summary.choice_fields_with_options} with answer lists, ${r.summary.row_groups_fixed} repeating rows, ${r.summary.barcodes} barcodes. Next: draft its field map with AI.`, inventoryFile: r.inventory_file, inventorySummary: r.summary } });
      await this.db.draftingJob.update({ where: { id: job.id }, data: { status: "COMPLETED", message: `Read ${r.summary.entry_fields_bound} data boxes on this computer (no AI)${String(r.status).includes("DIFFERS") ? "; the stored box list differs from this file and was kept as it was" : ""}.`, detail: r, finishedAt: new Date() } });
      await this.audit.log(a.workspaceId, actor.id, "read", "form", a.officialFile, `${actor.name} read ${a.edition}: ${r.summary.entry_fields_bound} data boxes (${r.status})`);
      return { ok: true, summary: r.summary };
    } catch (e) {
      await this.db.draftingJob.update({ where: { id: job.id }, data: { status: "FAILED", message: (e as Error).message.slice(0, 400), finishedAt: new Date() } });
      await this.db.sourceAttachment.update({ where: { id: a.id }, data: { status: "READ_FAILED", statusDetail: `The form could not be read: ${(e as Error).message.slice(0, 200)}. Try again; if it fails again the form needs a person.` } });
      fail(`Reading failed: ${(e as Error).message.slice(0, 200)}`, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  jobIdFor(officialFile: string) { return `studio-fieldmap-${officialFile.replace(/\.pdf$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`; }

  /** Saved real (live) runs of this form's field-map job: the studio's own job, and the earlier P2 job for the same
   *  form (c1-fieldmap-<form>), when they drafted exactly the inventory the studio holds now (same SHA-256). */
  savedRuns(jobId: string, inventorySha?: string) {
    const stem = jobId.replace(/^studio-fieldmap-/, "").replace(/e$/, "");
    const prefixes = [`${jobId}-live-`, `c1-fieldmap-${stem}-live-`];
    // Usable only when the run completed with a valid, untruncated output; a refused or truncated run never is. A run
    // re-checked with today's rules (p2/reconvert.ts, no model call) is read from its .reconverted record; a run whose
    // full answer failed only our own check is "recheckable": a re-check may recover it at no cost (Lead check A3).
    return readdirSync(RUNS).filter((f) => prefixes.some((p) => f.startsWith(p)) && f.endsWith(".json") && !f.includes(".reconverted")).map((orig) => {
      const again = orig.replace(/\.json$/, ".reconverted.json");
      const f = existsSync(join(RUNS, again)) ? again : orig;
      const r = JSON.parse(readFileSync(join(RUNS, f), "utf8"));
      const input = r.drafting_run?.inputs?.official_files?.[0]?.sha256;
      const sameInput = !inventorySha || input === inventorySha;
      const valid = r.contract_valid === true && !!r.raw_output && !r.output_errors && /^completed/.test(r.drafting_run?.status ?? "") && sameInput;
      return { file: f, original: orig, run_id: r.drafting_run?.run_id, valid, rechecked: f !== orig, recheckable: !valid && sameInput && failedOurCheck(r), same_input: sameInput, at: r.drafting_run?.ended_at ?? r.drafting_run?.started_at, cost_usd: r.drafting_run?.usage?.cost_usd ?? null, duration_ms: r.drafting_run?.usage?.duration_ms ?? null, prompt: r.drafting_run?.settings?.prompt_version ?? null, status: r.drafting_run?.status, envelope: r };
    }).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }

  /** A saved run that asked exactly what a new call would ask and failed our own check: a new paid call is refused. */
  repeatsFailedRun(jobId: string, now: DraftInputs) {
    return this.savedRuns(jobId, now.inputSha).find((r) => !r.valid && failedOurCheck(r.envelope) && sameDraftInputs(r.envelope, now)) ?? null;
  }

  async draftOptions(attachmentId: string) {
    const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: attachmentId } });
    const jobId = a.officialFile ? this.jobIdFor(a.officialFile) : null;
    const ledger = this.ledger();
    const inventory = this.inventoryOf(a);
    const invSha = inventory ? sha(readFileSync(join(SOLUTION, inventory))) : undefined;
    return { job_id: jobId, saved_runs: jobId ? this.savedRuns(jobId, invSha).map(({ envelope: _e, ...r }) => r) : [], key_present: existsSync(join(ROOT, ".tools", "solution-1-prototype", "secrets", "anthropic.env")), ledger };
  }

  ledger() {
    const res = new Map<string, number>();
    for (const l of readFileSync(join(PROTOTYPE, "p2", "ledger", "spend.jsonl"), "utf8").split("\n").filter(Boolean)) { const r = JSON.parse(l); if (r.type === "reserve") res.set(r.id, r.worst_usd); else if (r.type === "settle") res.set(r.id, r.actual_usd); }
    const committed = [...res.values()].reduce((a, b) => a + b, 0);
    return { committed_usd: Math.round(committed * 100) / 100, cap_usd: EXPERIMENT_CAP_USD, remaining_usd: Math.round((EXPERIMENT_CAP_USD - committed) * 100) / 100, per_run_cap_usd: RUN_CAP_USD };
  }

  /** The guarded job file for one form's field-map draft (P2 launch reads it). Returns the job id and input hash. */
  ensureJobFile(a: { officialFile: string | null; inventoryFile: string | null }, printedEdition?: string | null) {
    const jobId = this.jobIdFor(a.officialFile!);
    const inv = join(SOLUTION, a.inventoryFile!);
    const jobFile = join(JOBS, `${jobId}.json`);
    // v2 (23 Oct): the field naming rule in the prompt and the output schema (contracts/fact-key.ts), and the printed
    // edition read by the intake passed as a known fact (A6). v1 stays as the record of what earlier runs used.
    const want = { job_id: jobId, kind: "field_map", combination: "studio", configuration_version: "studio-add-form", template: "field-map.v2.md", output_schema: "field-map-output.v2.schema.json",
      ...(printedEdition && EDITION.test(printedEdition) ? { known: { form_edition: printedEdition } } : {}),
      inputs: [{ file: a.inventoryFile, sha256: sha(readFileSync(inv)) }],
      settings: { provider_route: "anthropic-api/aiw-d261-prototype-exception-aiw-d260", model: "claude-opus-5-5", effort: "high", timeout_ms: 900000, max_attempts: 2, budget_usd: 5, max_output_tokens: 64000 } }; // 64k: a full 242-box form needs 53-63k output (IMM 1295, 20 Oct); 32k truncated IMM 5257 (21 Oct 05:58Z)
    const have = existsSync(jobFile) ? readFileSync(jobFile, "utf8") : null;
    if (have !== JSON.stringify(want, null, 1) + "\n") writeFileSync(jobFile, JSON.stringify(want, null, 1) + "\n");
    const draftInputs: DraftInputs = { inputSha: want.inputs[0].sha256, templateSha: sha(readFileSync(join(PROMPTS, want.template))), schemaSha: sha(readFileSync(join(PROMPTS, want.output_schema))), model: want.settings.model, effort: want.settings.effort, maxOutputTokens: want.settings.max_output_tokens, known: want.known ?? null };
    return { jobId, inputSha: want.inputs[0].sha256, settings: want.settings, template: want.template, known: want.known ?? null, inventoryBytes: statSync(inv).size, draftInputs };
  }

  /** The form's box list: its own, or, before it is read here, the one the reader keeps for exactly this file (same
   *  checksum; reading never replaces it). Lets the plan find a saved AI answer before offering a paid call (A3). */
  inventoryOf(a: { officialFile: string | null; inventoryFile: string | null; sha256: string }) {
    if (a.inventoryFile || !a.officialFile) return a.inventoryFile;
    const rel = `prototype/p1/inventory/${basename(a.officialFile).replace(/\.pdf$/, "")}.inventory.json`;
    try { return JSON.parse(readFileSync(join(SOLUTION, rel), "utf8")).summary?.sha256 === a.sha256 ? rel : null; } catch { return null; }
  }

  /** The edition printed on the file, as the intake read it into the library (P-51); else the approved list's label. */
  async printedEdition(a: { workspaceId: string; sha256: string; edition: string | null }) {
    return (await this.db.formEdition.findFirst({ where: { workspaceId: a.workspaceId, sha256: a.sha256 }, select: { editionLabel: true } }))?.editionLabel ?? a.edition;
  }

  /** Runs one queued field-map step (api/src/ai.ts claims it first): read the form on this computer if needed, then
   *  replay a saved run, or the guarded stub pass and, for live, the paid call. */
  async runDraftStep(id: string) {
    const j = await this.db.draftingJob.findUniqueOrThrow({ where: { id } });
    let a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: j.attachmentId! } });
    if (a.status === "RECOGNISED" || a.status === "READ_FAILED") {
      await this.db.draftingJob.update({ where: { id }, data: { message: "Reading the form's boxes on this computer (no AI)" } });
      await this.read(ACTOR_BY_ID(j.startedBy), a.id);
      a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: a.id } });
    }
    if (a.status !== "READ" && a.status !== "DRAFTED") throw new Error(`The form is ${a.status.toLowerCase().replace(/_/g, " ")}; it cannot be drafted.`);
    if (j.mode === "REPLAY") return this.useSaved(id, a.id);
    const { jobId } = this.ensureJobFile(a, await this.printedEdition(a));
    await this.db.draftingJob.update({ where: { id }, data: { message: j.mode === "LIVE" ? "Stub pass of the guarded launch path, then the AI call" : "Stub pass of the guarded launch path (no network, no cost)", detail: { job_id: jobId, steps: [] } } });
    await this.launch(id, a.id, jobId, j.mode === "LIVE" ? "live" : "stub");
  }

  private launchOnce(jobId: string, mode: "stub" | "live"): Promise<{ code: number; out: string; err: string }> {
    return new Promise((res) => {
      const p = spawn(NODE, [join(PROTOTYPE, "p2", "launch.ts"), "--job", jobId, `--${mode}`], { cwd: ROOT, env: { ...process.env, PATH: `${join(NODE, "..")}:${process.env.PATH}` } });
      let out = "", err = "";
      p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
      p.on("close", (code) => res({ code: code ?? 1, out, err }));
    });
  }

  async launch(id: string, attachmentId: string, jobId: string, mode: "live" | "stub") {
    const steps: any[] = [];
    const lastJson = (s: string) => { for (const l of s.trim().split("\n").reverse()) { try { return JSON.parse(l); } catch { /* not JSON */ } } return null; };
    try {
      const stub = await this.launchOnce(jobId, "stub");
      const sj = lastJson(stub.out);
      steps.push({ step: "stub pass", exit: stub.code, result: sj, error: stub.code ? stub.err.slice(-600) : undefined });
      if (stub.code !== 0) throw new Error(`stub pass failed: ${(sj?.refused ?? stub.err).toString().slice(-300)}`);
      if (mode === "stub") { await this.db.draftingJob.update({ where: { id }, data: { status: "COMPLETED", message: "Stub pass completed: the guarded path works. A stub has no AI content, so there is nothing to compare.", detail: { job_id: jobId, steps }, finishedAt: new Date(), costUsd: 0 } }); return; }
      const took = this.savedRuns(jobId).find((r) => r.duration_ms)?.duration_ms;
      await this.db.draftingJob.update({ where: { id }, data: { message: `Calling the AI (guarded path; Claude Opus 5.5; up to US$5). ${took ? `The last real run of this form took about ${Math.max(1, Math.round(took / 60_000))} minutes.` : "A large form can take several minutes."} The whole form is drafted in one call, so there is no part-by-part progress yet.`, detail: { job_id: jobId, steps } } });
      const live = await this.launchOnce(jobId, "live");
      const lj = lastJson(live.out);
      steps.push({ step: "live call", exit: live.code, result: lj, error: live.code ? live.err.slice(-800) : undefined });
      if (!lj?.run_file) {
        // No run record: refused before any call, or the launcher stopped. Say which, never an empty reason (A2).
        const why = (lj?.refused ?? lj?.error ?? live.err.split("\n").filter(Boolean).slice(-3).join(" ")).toString().trim() || `the launcher stopped (exit ${live.code}) without giving a reason`;
        const limit = /usage limit/i.test(why) || /usage limit/i.test(live.err);
        await this.db.draftingJob.update({ where: { id }, data: { status: limit ? "BLOCKED" : "FAILED", message: limit ? `Blocked by the AI provider's account usage limit (no cost): ${why.slice(0, 300)}. Use a saved AI answer, or try again once access is restored.` : `The AI step did not run: ${why.slice(0, 400)}. Nothing was drafted or applied.`, detail: { job_id: jobId, steps }, finishedAt: new Date() } });
        return;
      }
      const rec = JSON.parse(readFileSync(lj.run_file, "utf8"));
      const runFile = lj.run_file.replace(`${ROOT}/ai-workers/problem-1-pathway-setup-and-form-filling/`, "");
      if (!/^completed/.test(rec.drafting_run?.status ?? "") || rec.contract_valid !== true) {
        const errs = (rec.drafting_run?.attempts ?? []).map((a: any) => String(a.error ?? a.outcome)).join(" | ");
        const limit = isProviderLimit(rec);
        let correction: any = null;
        if (limit) { // AIW-D273: refused before processing, unbilled; the ledger's worst-case reservation is settled at 0, append-only
          try { const { stdout } = await run(PY, ["-I", join(STUDIO, "tools", "correct_unbilled_p2.py"), lj.run_file], { cwd: PROTOTYPE }); correction = JSON.parse(stdout.trim()); } catch (e) { correction = { error: (e as Error).message.slice(0, 200) }; }
        }
        const rid = /"request_id":"([^"]+)"/.exec(errs)?.[1];
        await this.db.draftingJob.update({ where: { id }, data: { status: limit ? "BLOCKED" : "FAILED", runId: rec.drafting_run?.run_id, runFile, costUsd: limit ? 0 : rec.drafting_run?.usage?.cost_usd ?? null, finishedAt: new Date(), detail: { job_id: jobId, steps, provider_status: rec.drafting_run?.status, ledger_correction: correction },
          message: limit ? `Blocked by the AI provider: the account's monthly usage limit refused the call before any processing (request ${rid ?? "id not returned"}). Nothing was drafted or billed; the ledger's worst-case reservation was settled at US$0 (AIW-D273). Raise the limit in the Anthropic Console, then start the live draft again.` : `${explainRun(rec).message} Run ${rec.drafting_run?.run_id}.` } });
        return;
      }
      await this.db.draftingJob.update({ where: { id }, data: { runId: rec.drafting_run?.run_id, runFile, costUsd: rec.drafting_run?.usage?.cost_usd ?? null, detail: { job_id: jobId, steps } } });
      await this.ingest(id, attachmentId);
    } catch (e) {
      await this.db.draftingJob.update({ where: { id }, data: { status: "FAILED", message: (e as Error).message.slice(0, 500), detail: { job_id: jobId, steps }, finishedAt: new Date() } });
    }
  }

  /** "Use the saved AI answer (no cost)": a saved run whose full answer failed only our own check is first re-checked
   *  with today's rules (p2/reconvert.ts, no model call); then the answer is compared with the library like any draft. */
  async useSaved(id: string, attachmentId: string) {
    const j = await this.db.draftingJob.findUniqueOrThrow({ where: { id } });
    const file = join(SOLUTION, j.runFile!);
    const rec = JSON.parse(readFileSync(file, "utf8"));
    if (rec.contract_valid !== true && failedOurCheck(rec) && !j.runFile!.includes(".reconverted")) {
      await this.db.draftingJob.update({ where: { id }, data: { message: "Re-checking the saved AI answer with today's rules (no model call)" } });
      const r = reconvertFile(file);
      if (!r.valid || !r.dest) {
        const now = r.dest ? JSON.parse(readFileSync(r.dest, "utf8")) : rec;
        await this.db.draftingJob.update({ where: { id }, data: { status: "FAILED", costUsd: 0, finishedAt: new Date(), message: `Re-checked with today's rules (no model call, US$0): still not usable. ${explainRun(now).message.replace(/ Cost US\$[0-9.]+\.$/, "")} A person maps this form, or the rule is reviewed.` } });
        return;
      }
      await this.db.draftingJob.update({ where: { id }, data: { runFile: r.dest.replace(`${SOLUTION}/`, "") } });
    }
    return this.ingest(id, attachmentId);
  }

  /** Reads a run record (live or replayed) and compares its proposals with the library. */
  async ingest(jobId: string, attachmentId: string, opts: { recompare?: Actor } = {}) {
    const job = await this.db.draftingJob.findUniqueOrThrow({ where: { id: jobId } });
    const previous = opts.recompare ? await this.db.normalizationItem.findMany({ where: { jobId } }) : [];
    const revision = await libraryRevision(this.db, job.workspaceId);
    const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: attachmentId } });
    const rec = JSON.parse(readFileSync(join(SOLUTION, job.runFile!), "utf8"));
    if (!rec.contract_valid || !rec.raw_output) { await this.db.draftingJob.update({ where: { id: jobId }, data: { status: "FAILED", message: `${explainRun(rec).message} Run ${rec.drafting_run?.run_id ?? "unknown"}.`, finishedAt: new Date() } }); return; }
    const out = checkedOutput(rec);
    const inv = JSON.parse(readFileSync(join(SOLUTION, a.inventoryFile!), "utf8"));
    const box = new Map<string, any>(inv.fields.filter((x: any) => x.data_path).map((x: any) => [x.data_path, x]));
    const entries = out.entries.map((e: any) => ({ ...e, caption: box.get(e.data_path)?.caption ?? null }));
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId: a.workspaceId }, orderBy: { version: "desc" } });
    const seen = new Set<string>(); const library: LibraryField[] = [];
    for (const r of rows) if (!seen.has(r.canonicalFieldKey)) { seen.add(r.canonicalFieldKey); if (r.status !== "RETIRED") library.push({ key: r.canonicalFieldKey, meaning: r.meaning, valueType: r.valueType, status: r.status }); }
    const items = normalize(out.canonical_fields, entries, library);
    const affected = await this.dependents(a.workspaceId, [...new Set(items.flatMap((i) => [i.matchedKey, ...i.candidates.map((c) => c.key)]).filter(Boolean) as string[])]);
    if (opts.recompare && job.status !== "COMPLETED") fail("Only a draft waiting for review can be compared again.", HttpStatus.CONFLICT);
    await this.db.normalizationItem.deleteMany({ where: { jobId } });
    await this.db.normalizationItem.createMany({ data: items.map((i) => ({ workspaceId: a.workspaceId, jobId, proposedKey: i.proposedKey, proposedMeaning: i.proposedMeaning, proposedType: i.proposedType, outcome: i.outcome, matchedKey: i.matchedKey,
      candidates: i.candidates as any, persons: i.persons, boxes: i.boxes as any, evidence: { ...i.evidence, recommendation: i.recommendation } as any, affected: Object.fromEntries([i.matchedKey, ...i.candidates.map((c) => c.key)].filter(Boolean).map((k) => [k, affected.get(k!) ?? null])) as any, reason: i.reason })) });
    // Re-compare (D280 stale result): a person's decision is kept when the comparison for that proposal is unchanged and
    // its decided key means what it meant (an existing field is still there; a new key has not been created meanwhile).
    let kept = 0, reopened = 0;
    if (previous.length) {
      const libKeys = new Set(library.map((l) => l.key));
      for (const it of await this.db.normalizationItem.findMany({ where: { jobId } })) {
        const old = previous.find((o) => o.proposedKey === it.proposedKey);
        if (!old || old.decision === "PENDING") continue;
        const topKeys = (x: any) => (x.candidates as any[]).slice(0, 3).map((c) => c.key).join(",");
        const wasExisting = !!old.decidedKey && (old.decidedKey === old.matchedKey || (old.candidates as any[]).some((c) => c.key === old.decidedKey) || old.outcome === "REUSE");
        const same = old.outcome === it.outcome && old.matchedKey === it.matchedKey && topKeys(old) === topKeys(it) && (old.decision === "RETURNED" || !old.decidedKey || libKeys.has(old.decidedKey) === wasExisting);
        if (same) { kept++; await this.db.normalizationItem.update({ where: { id: it.id }, data: { decision: old.decision, decidedKey: old.decidedKey, decidedBy: old.decidedBy, decisionNote: old.decisionNote, decidedAt: old.decidedAt, proposedMeaning: old.proposedMeaning, proposedType: old.proposedType } }); }
        else { reopened++; await this.db.normalizationItem.update({ where: { id: it.id }, data: { decisionNote: `Decide again: the library changed since ${old.decidedBy}'s decision (${old.decision.toLowerCase()}${old.decidedKey ? ` → ${old.decidedKey}` : ""}).` } }); }
      }
    }
    const n = (o: string) => items.filter((i) => i.outcome === o).length;
    const needsPerson = (rec.conversion?.needs_person ?? []).length;
    const counts = { needs_person: needsPerson, boxes: out.entries.length, mapped: out.entries.filter((e: any) => e.outcome === "mapped").length, unresolved: out.entries.filter((e: any) => e.outcome === "unresolved").length, never_filled: out.entries.filter((e: any) => e.outcome === "never_filled").length, not_a_fact: out.entries.filter((e: any) => e.outcome === "not_a_fact").length, proposed_fields: items.length, reuse: n("REUSE"), new: n("NEW"), ambiguous: n("AMBIGUOUS"), conflict: n("CONFLICT") };
    await this.db.draftingJob.update({ where: { id: jobId }, data: { status: "COMPLETED", finishedAt: opts.recompare ? job.finishedAt : new Date(), message: `${job.mode === "REPLAY" ? `Saved AI answer from run ${job.runId}${rec.reconverted ? ", re-checked with today's rules" : ""} (no model call, US$0). ` : `Live AI draft ${job.runId}. `}${counts.mapped} of ${counts.boxes} boxes mapped${needsPerson ? ` (${needsPerson} sent to a person: field name or entry rules)` : ""}; ${counts.proposed_fields} fields: ${counts.reuse} reuse, ${counts.new} new, ${counts.ambiguous} ambiguous, ${counts.conflict} conflicting.`, detail: { ...(job.detail as any), counts, form_edition_drafted: out.form_edition, conversion: rec.conversion ?? null, label: rec.label, usage: rec.drafting_run?.usage ?? null, prompt: rec.drafting_run?.settings?.prompt_version, library_revision: revision, ...(opts.recompare ? { recompared: { at: new Date().toISOString(), by: opts.recompare.id, kept, reopened } } : {}) } } });
    if (opts.recompare) await this.audit.log(job.workspaceId, opts.recompare.id, "re-compared", "AI draft", job.runId, `${opts.recompare.name} compared ${a.edition}'s AI draft with the current library again (no AI call): ${kept} decisions kept, ${reopened} to decide again`);
    await this.db.sourceAttachment.update({ where: { id: a.id }, data: { status: "DRAFTED", statusDetail: `AI draft ready to review: ${counts.reuse} reuse, ${counts.new} new, ${counts.ambiguous} ambiguous, ${counts.conflict} conflicting.` } });
    return this.job(jobId);
  }

  /** What depends on a library field: boxes per form, placements, conditions and combinations. */
  async dependents(workspaceId: string, keys: string[]) {
    const out = new Map<string, any>();
    if (!keys.length) return out;
    const boxes = await this.db.formFieldMap.findMany({ where: { workspaceId, canonicalFieldKey: { in: keys }, status: { in: ["PUBLISHED", "DRAFT"] } }, select: { canonicalFieldKey: true, person: true, edition: { select: { form: { select: { formKey: true } } } } } });
    const places = await this.db.sectionQuestion.findMany({ where: { workspaceId, canonicalFieldKey: { in: keys } }, orderBy: { version: "desc" } });
    const sections = new Map((await this.db.logicalSection.findMany({ where: { workspaceId } })).map((s) => [s.sectionKey, s.title]));
    const conds = [...(await this.db.combinationForm.findMany({ where: { workspaceId }, include: { form: true, combination: true } })).map((f) => ({ j: f.predicateJson, what: `form ${f.form.formKey} in ${f.combination.label}` })),
      ...(await this.db.documentRequirement.findMany({ where: { workspaceId }, include: { combination: true } })).map((r) => ({ j: r.predicateJson, what: `document "${r.documentTypeKey.replace(/_/g, " ")}" in ${r.combination.label}` })),
      ...(await this.db.predicate.findMany({ where: { workspaceId }, include: { combination: true } })).map((r) => ({ j: r.predicateJson, what: `rule "${r.thenPlain.slice(0, 60)}" in ${r.combination.label}` }))];
    for (const k of keys) {
      const b = boxes.filter((x) => x.canonicalFieldKey === k);
      const byForm: Record<string, number> = {};
      for (const x of b) byForm[x.edition.form.formKey] = (byForm[x.edition.form.formKey] ?? 0) + 1;
      const p = places.find((x) => x.canonicalFieldKey === k);
      out.set(k, { boxes_by_form: byForm, people: [...new Set(b.map((x) => x.person ?? "none"))], placement: p ? { section: sections.get(p.sectionKey) ?? p.sectionKey, collected_from: p.collectedFrom } : null,
        conditions: conds.filter((c) => c.j && JSON.stringify(c.j).includes(`"field":"${k}"`)).map((c) => c.what).slice(0, 8) });
    }
    return out;
  }

  async job(id: string) {
    const j = await this.db.draftingJob.findUniqueOrThrow({ where: { id }, include: { items: { orderBy: { proposedKey: "asc" } } } });
    const rank: Record<string, number> = { CONFLICT: 0, AMBIGUOUS: 1, NEW: 2, REUSE: 3 };
    const a = j.attachmentId ? await this.db.sourceAttachment.findUnique({ where: { id: j.attachmentId } }) : null;
    return { ...j, attachment: a, items: j.items.sort((x, y) => rank[x.outcome] - rank[y.outcome] || x.proposedKey.localeCompare(y.proposedKey)), elapsed_s: Math.round(((j.finishedAt ?? new Date()).getTime() - j.startedAt.getTime()) / 1000) };
  }

  async decide(actor: Actor, jobId: string, itemId: string, b: { decision: "ACCEPTED" | "CHANGED" | "RETURNED" | "PENDING"; key?: string; note?: string; meaning?: string; valueType?: string }) {
    need(actor, "review");
    const job = await this.db.draftingJob.findUniqueOrThrow({ where: { id: jobId } });
    if (job.status === "APPLIED") fail("This draft is already applied to the configuration; change the definitions in the library instead.", HttpStatus.CONFLICT);
    const it = await this.db.normalizationItem.findUniqueOrThrow({ where: { id: itemId } });
    let decidedKey: string | null = null;
    const rec = (it.evidence as any).recommendation;
    if (b.decision === "ACCEPTED") decidedKey = rec?.key ?? it.matchedKey ?? it.proposedKey;
    if (b.decision === "CHANGED") {
      const key = b.key ?? fail("Choose the library field to use, or type a new key.");
      decidedKey = key;
      const exists = await this.db.canonicalField.findFirst({ where: { workspaceId: job.workspaceId, canonicalFieldKey: key } });
      const problem = exists ? null : newKeyProblem(key);
      if (problem) fail(`A new key is area.name in lower case: ${problem}.`);
    }
    if (b.decision === "RETURNED" && !b.note?.trim()) fail("Say why it goes back, so the boxes show the reason.");
    const u = await this.db.normalizationItem.update({ where: { id: itemId }, data: { decision: b.decision, decidedKey: b.decision === "RETURNED" || b.decision === "PENDING" ? null : decidedKey, decidedBy: b.decision === "PENDING" ? null : actor.id, decisionNote: b.note ?? (b.meaning ? `meaning: ${b.meaning}` : null), decidedAt: b.decision === "PENDING" ? null : new Date(),
      ...(b.meaning ? { proposedMeaning: b.meaning } : {}), ...(b.valueType ? { proposedType: b.valueType } : {}) } });
    await this.audit.log(job.workspaceId, actor.id, "decided", "AI proposal", it.proposedKey, `${actor.name} ${b.decision.toLowerCase()} ${it.proposedKey}${decidedKey && decidedKey !== it.proposedKey ? ` → ${decidedKey}` : ""}${b.note ? `: ${b.note}` : ""}`);
    return u;
  }

  /** Accepts the clean proposals of one kind together: exact reuse matches, or new definitions with no similar library
   *  field. Ambiguous and conflicting items always need their own decision. */
  async acceptClean(actor: Actor, jobId: string, outcome: "REUSE" | "NEW" = "REUSE") {
    need(actor, "review");
    const items = (await this.db.normalizationItem.findMany({ where: { jobId, outcome, decision: "PENDING" } })).filter((i) => outcome === "REUSE" || !(i.candidates as any[]).some((c) => c.score >= 0.55));
    for (const i of items) await this.db.normalizationItem.update({ where: { id: i.id }, data: { decision: "ACCEPTED", decidedKey: outcome === "REUSE" ? i.matchedKey : i.proposedKey, decidedBy: actor.id, decidedAt: new Date(), decisionNote: outcome === "REUSE" ? "accepted with the other exact reuse matches" : "accepted with the other new definitions that have no similar library field" } });
    const job = await this.db.draftingJob.findUniqueOrThrow({ where: { id: jobId } });
    await this.audit.log(job.workspaceId, actor.id, "decided", "AI proposal", null, `${actor.name} accepted ${items.length} ${outcome === "REUSE" ? "exact reuse matches" : "new definitions"} together`);
    return { accepted: items.length, outcome };
  }

  /** Applies the decided proposals to the combination's draft: the form edition and its box map, new field
   *  definitions, and the form in the combination. Everything lands as DRAFT; release follows review. */
  async apply(actor: Actor, jobId: string, b: { who?: string; title?: string }) {
    need(actor, "author");
    const job = await this.db.draftingJob.findUniqueOrThrow({ where: { id: jobId }, include: { items: true } });
    if (job.status !== "COMPLETED") fail(job.status === "APPLIED" ? "Already applied." : "The draft is not ready.", HttpStatus.CONFLICT);
    const at = (job.detail as any)?.library_revision?.sha256;
    const now = await libraryRevision(this.db, job.workspaceId);
    if (at && at !== now.sha256) fail(`Stale: the shared library changed since this draft was compared with it (${(job.detail as any).library_revision.fields} → ${now.fields} definition rows). Compare again with the current library (no AI call); decisions that still hold are kept.`, HttpStatus.CONFLICT);
    const pending = job.items.filter((i) => i.decision === "PENDING");
    if (pending.length) fail(`${pending.length} proposal${pending.length > 1 ? "s are" : " is"} still undecided (for example ${pending[0].proposedKey}).`);
    const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: job.attachmentId! } });
    const item = manifest().find((i) => i.sha256 === a.sha256)!;
    const rec = JSON.parse(readFileSync(join(SOLUTION, job.runFile!), "utf8"));
    const out = checkedOutput(rec);
    const inv = JSON.parse(readFileSync(join(SOLUTION, a.inventoryFile!), "utf8"));
    const box = new Map<string, any>(inv.fields.filter((x: any) => x.data_path).map((x: any) => [x.data_path, x]));
    const decision = new Map(job.items.map((i) => [i.proposedKey, i]));
    const formKey = item.edition.split(" (")[0];
    const ws = job.workspaceId;
    const res = await this.db.$transaction(async (tx) => {
      const def = await tx.govFormDef.upsert({ where: { workspaceId_formKey: { workspaceId: ws, formKey } }, update: {}, create: { workspaceId: ws, formKey, displayName: b.title?.trim() || TITLES[formKey] || formKey, formKind: "data_form" } });
      // An edition uploaded to the library first (Screen 01, P-25) has no box map yet: the draft fills it in.
      let ed = (await tx.formEdition.findFirst({ where: { workspaceId: ws, sha256: a.sha256 } })) ?? (await tx.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId: ws, editionLabel: item.edition } } }));
      if (ed && (await tx.formFieldMap.count({ where: { formEditionId: ed.id } }))) fail(`${ed.editionLabel} already has a field map in the library.`, HttpStatus.CONFLICT);
      ed = ed ? await tx.formEdition.update({ where: { id: ed.id }, data: { govFormDefId: def.id, officialFile: item.file, inventoryFile: a.inventoryFile, dataBoundBoxes: out.entries.length } })
        : await tx.formEdition.create({ data: { workspaceId: ws, govFormDefId: def.id, editionLabel: item.edition, officialFile: item.file, sha256: a.sha256, inventoryFile: a.inventoryFile, dataBoundBoxes: out.entries.length } });
      let created = 0;
      for (const i of job.items.filter((x) => x.decision !== "RETURNED" && x.decidedKey)) {
        if (await tx.canonicalField.findFirst({ where: { workspaceId: ws, canonicalFieldKey: i.decidedKey! } })) continue;
        await tx.canonicalField.create({ data: { workspaceId: ws, canonicalFieldKey: i.decidedKey!, version: 1, status: "DRAFT", meaning: i.proposedMeaning, valueType: i.proposedType, dataType: VALUE_TYPE_TO_DATA_TYPE[i.proposedType] ?? "STRING", scope: i.decidedKey!.startsWith("case.") ? "CASE_LEVEL" : "CLIENT_LEVEL", subjectKind: subjectKindOf(i.decidedKey!), origin: "AI_PROPOSAL", sourceRef: `${job.mode === "REPLAY" ? "replayed " : ""}AI run ${job.runId}; decided by ${i.decidedBy}`, updatedBy: actor.id } });
        created++;
      }
      await tx.formFieldMap.createMany({ data: out.entries.map((e: any) => {
        const d = e.fact ? decision.get(e.fact) : undefined;
        const returned = d?.decision === "RETURNED";
        return { workspaceId: ws, formEditionId: ed!.id, dataPath: e.data_path, caption: box.get(e.data_path)?.caption?.slice(0, 500) ?? null, heading: box.get(e.data_path)?.section ?? null,
          outcome: returned ? "unresolved" : e.outcome, person: e.person ?? null, row: e.row ?? null, canonicalFieldKey: returned ? null : (d?.decidedKey ?? e.fact ?? null),
          // A part of a composite library value (address) reads that value through the executor's part transformation.
          transform: !returned && d?.decidedKey && d.decidedKey !== e.fact && (d.evidence as any)?.recommendation?.transform && (d.evidence as any).recommendation.key === d.decidedKey ? (d.evidence as any).recommendation.transform : e.transform ?? null, condition: e.condition ?? null, confidence: e.confidence ?? null,
          evidenceQuote: e.evidence_quote ?? null, reason: returned ? `returned by ${d!.decidedBy}: ${d!.decisionNote}` : e.unresolved_reason ?? null, version: 1, status: "DRAFT", origin: "AI_PROPOSAL", draftingRunId: job.runId, updatedBy: actor.id };
      }) });
      const existing = await tx.combinationForm.findFirst({ where: { combinationId: job.combinationId, lineageKey: formKey } });
      if (!existing) await tx.combinationForm.create({ data: { workspaceId: ws, combinationId: job.combinationId, govFormDefId: def.id, lineageKey: formKey, who: b.who ?? "each_applicant", attachMode: "COMBINATION_MANDATORY", version: 1, status: "DRAFT", origin: "AI_PROPOSAL", updatedBy: actor.id, sourceQuote: `${item.edition}: ${item.applicability}`.slice(0, 500) } });
      // Claimed inside the transaction: a second apply of the same draft (double click, two people) changes nothing.
      const claimed = await tx.draftingJob.updateMany({ where: { id: jobId, status: "COMPLETED" }, data: { status: "APPLIED", message: `${job.message} Applied to the draft by ${actor.name}.` } });
      if (!claimed.count) fail("Already applied.", HttpStatus.CONFLICT);
      await tx.sourceAttachment.update({ where: { id: a.id }, data: { status: "IN_LIBRARY", statusDetail: `Field map applied to the draft (${out.entries.length} boxes; ${created} new field definitions). Review and release it.` } });
      return { formKey, edition: item.edition, boxes: out.entries.length, new_fields: created, returned: job.items.filter((i) => i.decision === "RETURNED").length };
    });
    await this.audit.log(ws, actor.id, "applied", "AI draft", job.runId, `${actor.name} applied the reviewed AI draft of ${item.edition} to the draft: ${res.boxes} boxes, ${res.new_fields} new fields, ${res.returned} returned`, undefined, job.combinationId);
    return res;
  }

  /** Compares a waiting AI draft with the current library again (no AI call), keeping decisions that still hold. */
  async recompare(actor: Actor, jobId: string) {
    need(actor, "review");
    const job = await this.db.draftingJob.findUniqueOrThrow({ where: { id: jobId } });
    if (!job.attachmentId || !job.runFile) fail("This step has no AI output to compare.");
    return this.ingest(jobId, job.attachmentId!, { recompare: actor });
  }

  /** The form is already in the library (another combination released it): add it here, no AI drafting. */
  async reuseForm(actor: Actor, attachmentId: string, b: { who?: string }) {
    need(actor, "author");
    const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: attachmentId } });
    if (!manifest().some((i) => i.sha256 === a.sha256)) fail("This file is held until its source is verified. It cannot be reused from the library.", HttpStatus.CONFLICT);
    const ed = await this.db.formEdition.findFirst({ where: { workspaceId: a.workspaceId, sha256: a.sha256, maps: { some: {} } }, include: { form: true } });
    if (!ed) fail("This form's boxes are not mapped in the library yet; read it and draft its field map.");
    if (await this.db.combinationForm.findFirst({ where: { combinationId: a.combinationId, lineageKey: ed!.form.formKey } })) fail(`${ed!.form.formKey} is already part of this combination.`, HttpStatus.CONFLICT);
    await this.db.combinationForm.create({ data: { workspaceId: a.workspaceId, combinationId: a.combinationId, govFormDefId: ed!.form.id, lineageKey: ed!.form.formKey, who: b.who ?? "each_applicant", attachMode: "COMBINATION_MANDATORY", version: 1, status: "DRAFT", origin: "HUMAN", updatedBy: actor.id, sourceQuote: `${ed!.editionLabel}: reused from the library` } });
    const comp = await this.db.combination.findUniqueOrThrow({ where: { id: a.combinationId } });
    await this.audit.log(a.workspaceId, actor.id, "reused", "form", ed!.form.formKey, `${actor.name} added ${ed!.editionLabel} to "${comp.label}" from the library (no AI drafting; its released field map is shared)`, undefined, a.combinationId);
    return { ok: true, form: ed!.form.formKey };
  }

  /** The library's forms for "+ Add" and the Forms page: each form, its editions and whether its boxes are mapped. */
  async libraryForms() {
    const workspaceId = await this.ws.id();
    const forms = await this.db.govFormDef.findMany({ where: { workspaceId }, orderBy: { formKey: "asc" }, include: { editions: { include: { _count: { select: { maps: true } } } }, usedBy: { where: { status: { not: "RETIRED" } }, select: { combinationId: true } } } });
    const approved = new Set(manifest().map((i) => i.sha256));
    // Historical workspaces may contain entries created before the source gate. Keep those out of
    // library pickers and usage summaries; a prior database row is not a source-verification decision.
    const visible = forms.map((f) => ({ ...f, editions: f.editions.filter((e) => approved.has(e.sha256)) })).filter((f) => f.editions.length);
    // "Used by" (P-51): every combination that files the form or has one of its editions attached as a source.
    const shas = visible.flatMap((f) => f.editions.map((e) => e.sha256)).filter(Boolean) as string[];
    const att = await this.db.sourceAttachment.findMany({ where: { workspaceId, sha256: { in: shas } }, select: { sha256: true, combinationId: true } });
    return visible.map((f) => {
      const mine = new Set(f.editions.map((e) => e.sha256));
      const used = new Set([...f.usedBy.map((u) => u.combinationId), ...att.filter((a) => mine.has(a.sha256)).map((a) => a.combinationId)]);
      return { code: f.formKey, title: f.displayName, kind: f.formKind, usedBy: used.size,
        editions: [...f.editions].sort((a, b) => compareEditions(b, a)).map((e) => ({ label: e.editionLabel, mapped: e._count.maps > 0, boxes: e._count.maps, approved: !!e.officialFile })) };
    });
  }

  officialLibrary() { return manifest().map((i) => ({ file: i.file, edition: i.edition, kind: KIND[i.path.split("/")[0]] ?? "Official file", approval: i.approval, combination: i.combination, sha256: i.sha256 })); }
  async attachmentsOf(combinationId: string) { return this.db.sourceAttachment.findMany({ where: { combinationId }, orderBy: { createdAt: "asc" } }); }
  async download(id: string) { const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id } }); return { path: resolve(ROOT, a.storedPath), name: a.fileName }; }
}
export { slug };
