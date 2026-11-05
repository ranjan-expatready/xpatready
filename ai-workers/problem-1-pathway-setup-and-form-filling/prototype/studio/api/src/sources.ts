// Sources and AI drafting: the normal upload path for official forms/guides, the local "read form" step, the guarded
// AI field-map draft (p2/launch.ts: stub pass, then the live call under the existing route, input allowlist, ledger
// and caps), a labelled replay of a saved real run, comparison with the shared library and the person's decisions.
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { runWorstUsd } from "../../engine/cost-check.ts";
import { execFile, execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { manifest, slug } from "../../engine/import.ts";
import { normalize, type LibraryField } from "../../engine/normalize.ts";
import { PRINTED_EDITION } from "../../engine/rounds.ts";
import { claimedTwice, compareMaps, formWords, mapRules, quoteOnForm, type MapField } from "../../engine/field-map-rounds.ts";
import { checkerRound } from "./field-map-check.ts";
import { EXPERIMENT_CAP_USD, LABEL, LEDGER_DIR, MAX_ATTEMPTS, PARTS_DIR, RUN_CAP_USD, WAVE1_CAP_USD, WAVE1_START } from "../../../p2/policy.ts";
import { canonical } from "../../../contracts/rules.ts";
import { costUsd, SpendLedger } from "../../../p2/ledger.ts";
import { effective, subjectKindOf, VALUE_TYPE_TO_DATA_TYPE } from "../../engine/snapshot.ts";
import { assembleMerged, flagNearDuplicates, partOutputTokens, planDraft, wholeFormOutput, type DraftPlan, type Prior } from "../../engine/parts.ts";
import { compareEditions } from "../../engine/programs.ts";
import { pdfBoxFormats } from "../../engine/field-format.ts";
import { checkedOutput, costBesideLimit, explainRun, failedOurCheck, isProviderLimit, sameDraftInputs, type DraftInputs, type FieldMapAnswer } from "../../engine/ai-run.ts";
import { newKeyProblem } from "../../../contracts/fact-key.ts";
import { reconvertFile } from "../../../p2/reconvert.ts";
import { addFormLine, resolveKey } from "./form-lines.ts";
import { lockItem, refuseRetired } from "./library-items.ts";
import { ledgerRead } from "./cost-gate.ts";
import { freeKey, sameName } from "./library-changes.ts";
import { BATCH_MAX, bulkWhy, decide, identityKeyOf, insertProposals, QUEUE_TX, landField, recordChoice, reviewRow, UNDO_SECONDS, type NewProposal, type Work } from "./proposals.ts";
import { cleanLabel, labelProblem } from "../../contracts/programs.ts";
import { START } from "../../contracts/start-setup.ts";
import { ACTORS, Audit, Db, fail, need, NODE, OFFICIAL, PROTOTYPE, PY, ROOT, SOLUTION, STUDIO, VAR, VAR_ROOT, Workspace, type Actor } from "./core.ts";
import { forgetDeletion } from "./library-deletions.ts";
const ACTOR_BY_ID = (id: string) => ACTORS.find((a) => a.id === id) ?? ACTORS[0];
/** The library revision a comparison was made against: every definition key, version and status. A different revision
 *  at apply time means the comparison is stale (D280). */
export async function libraryRevision(db: Db, workspaceId: string) {
  const rows = await db.canonicalField.findMany({ where: { workspaceId }, select: { canonicalFieldKey: true, version: true, status: true, meaning: true }, orderBy: [{ canonicalFieldKey: "asc" }, { version: "asc" }] });
  return { sha256: sha(rows.map((r) => `${r.canonicalFieldKey}|${r.version}|${r.status}|${r.meaning}`).join("\n")), fields: rows.length };
}

const run = promisify(execFile);
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
/** Induced slow step (isolated test server only, like STUDIO_FAULT_SOURCE): STUDIO_SLOW_TX="<file name>:<ms>" waits that
 *  long inside the field-map draft's transaction for that file, so the queue's transaction room is tested both ways;
 *  STUDIO_SLOW_APPLY the same inside that file's Apply (QA-144 part 1, tests/check_qa144_place_step.ts). */
const slowForTest = async (file: string, variable = "STUDIO_SLOW_TX") => { const [f, ms] = (process.env[variable] ?? "").split(":"); if (f && f === file && Number(ms) > 0) await new Promise((r) => setTimeout(r, Number(ms))); };
// QA-207: a previous edition of a fillable IRCC form (previous-editions/) is a Form too, so it is read and drafted.
const KIND: Record<string, string> = { forms: "Form", "previous-editions": "Form", checklists: "Document checklist", instructions: "Instructions", "web-pages": "Web page" };
/** The kind an official file attaches as, by its folder in official-sources/ircc (a path that leaves its folder is none). */
export const officialKind = (path: string) => (path.split("/").includes("..") ? undefined : KIND[path.split("/")[0]]) ?? "Official file";
const JOBS = join(PROTOTYPE, "p2", "jobs"), RUNS = join(PROTOTYPE, "p2", "runs");
/** Scaffolding (QA-34, P-69): an isolated test copy may start with STUDIO_FAKE_LAUNCHER naming the test fixture
 *  tests/fixtures/fake-launch.mjs, which stands in for the guarded launcher so the paid-call refusal and provider-limit
 *  paths are tested at US$0. Honoured only inside an isolated copy's own working folder (var/isolated-*) and only when the
 *  path resolves (links followed, relative to where launches run) to that one fixture: any other path is ignored and the
 *  guarded p2/launch.ts runs (PR 10 review). The demo and every real run always use p2/launch.ts. */
export const FAKE_LAUNCHER = join(STUDIO, "tests", "fixtures", "fake-launch.mjs");
export function launcherFor(requested: string | undefined, varRoot: string): string {
  const guarded = join(PROTOTYPE, "p2", "launch.ts");
  if (!requested || !/[/\\]isolated-[a-z0-9_]+$/.test(varRoot)) return guarded;
  try { return realpathSync(resolve(ROOT, requested)) === realpathSync(FAKE_LAUNCHER) ? FAKE_LAUNCHER : guarded; } catch { return guarded; }
}
const LAUNCHER = launcherFor(process.env.STUDIO_FAKE_LAUNCHER, VAR_ROOT);
/** True only on an isolated test copy whose launches go to the fake launcher: nothing it launches can reach a model. */
export const usesFakeLauncher = () => LAUNCHER === FAKE_LAUNCHER;
/** Induced missing saved answer (isolated test server only, like STUDIO_FAULT_SOURCE): STUDIO_HIDE_SAVED_RUNS="<text>"
 *  hides the saved runs whose file name contains it, so a form with a part missing can be tested without touching the
 *  committed runs. Honoured only on an isolated copy with the stand-in launcher and live AI off (review, Opus m3), so
 *  hiding a saved answer only makes a form wait; it never turns a free step into a paid one. */
const hiddenRun = (f: string) => { const h = process.env.STUDIO_HIDE_SAVED_RUNS; return !!h && /[/\\]isolated-[a-z0-9_]+$/.test(VAR_ROOT) && usesFakeLauncher() && !aiLive() && f.includes(h); };
/** Lead Critical 29 Oct (qa spent US$0.27 by one click on a test copy): every live AI call of this server (finder rounds,
 *  guide pick, field-map drafting, Who can be, anything through the launcher) needs the explicit switch
 *  STUDIO_AI_LIVE=approved at server start. isolated.sh and run-suites.sh never set it; a check that tests a live path
 *  names it in its own usage line, and :4400 sets it only when the founder chooses. Without it the launch is refused
 *  before any process starts: US$0. Read at each call, so a test copy's environment is what counts. */
export const aiLive = () => process.env.STUDIO_AI_LIVE === "approved";
/** P-179: the Continue a run was started with (kept on its plan): the launcher passes it to the ledger, which admits a
 *  reservation past a limit only with it (p2/launch.ts --override-id --run-key). */
export type LaunchOverride = { id: string; run_key: string };
export const overrideOf = (plan: unknown): LaunchOverride | undefined => { const o = (plan as { override?: LaunchOverride } | null)?.override; return o?.id && o.run_key ? { id: o.id, run_key: o.run_key } : undefined; };
/** The guarded launcher's arguments; an override goes only to a live call. */
export const launchArgs = (launcher: string, jobId: string, mode: "stub" | "live", approved: string[], ov?: LaunchOverride) =>
  [launcher, "--job", jobId, `--${mode}`, ...approved, ...(mode === "live" && ov ? ["--override-id", ov.id, "--run-key", ov.run_key] : [])];
const PROMPTS = join(PROTOTYPE, "p2", "prompts");
const EDITION = PRINTED_EDITION; // IMM or IRM (engine/rounds.ts)
/** P-80: where the drafting guard can check an approval made in the product (p2/policy.ts approvedSourcesDirOk): this
 *  copy's own workspace folder, so a demo reset removes it with the database row and test copies never share one. */
export const APPROVED_DIR = () => join(VAR("demo"), "approved-sources");
type Approval = { sha256: string; kind: string; code: string | null; edition: string | null; fileName: string; irccPage: string; uploadedBy: string; approvedBy: string; approvedAt: Date;
  /** S4 (M3): downloaded from canada.ca (or a hand upload equal to it): the record says so, not "a second person". */
  official?: { sourceUrl: string } };
/** P-80: the approval record and the approved PDF the guard checks (p2/guard.ts admitApproved), written when a second
 *  person approves a held file (intake.ts) and again from the database row when missing (approved before it existed). */
export function recordApproval(row: Approval, bytes: Buffer) {
  if (sha(bytes) !== row.sha256) fail("The stored file no longer has the approved checksum; upload the official PDF again.", HttpStatus.CONFLICT);
  const dir = APPROVED_DIR(); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${row.sha256}.pdf`), bytes);
  if (row.official) { writeFileSync(join(dir, `${row.sha256}.approval.json`), JSON.stringify({ contract: "official-download/v1", sha256: row.sha256, kind: row.kind, code: row.code, edition: row.edition, file_name: row.fileName, form_page: row.irccPage, source_url: row.official.sourceUrl, fetched_at: row.approvedAt.toISOString(), started_by: row.uploadedBy }, null, 1) + "\n"); return; }
  writeFileSync(join(dir, `${row.sha256}.approval.json`), JSON.stringify({ contract: "approved-source/v1", sha256: row.sha256, kind: row.kind, code: row.code, edition: row.edition, file_name: row.fileName, ircc_page: row.irccPage, uploaded_by: row.uploadedBy, approved_by: row.approvedBy, approved_at: row.approvedAt.toISOString() }, null, 1) + "\n");
}
const TITLES: Record<string, string> = { "IMM 5257": "Application for Temporary Resident Visa", "IMM 1295": "Application for Work Permit made Outside of Canada", "IMM 5707": "Family Information", "IMM 5409": "Statutory Declaration of Common-law Union", "IMM 5476": "Use of a Representative", "IMM 5475": "Authority to Release Personal Information to a Designated Individual", "IMM 5257 SCH1": "Schedule 1: Application for Temporary Residence" }; // P-171 (a); source: canada.ca application forms index and the IMM 5257 SCH1 page, read 29 Oct 2026

/** Break M6: one file per running launcher (its process group id), removed when it ends. */
const LAUNCHES = () => join(VAR_ROOT, "launches");
function endOrphanLaunches() {
  if (!existsSync(LAUNCHES())) return;
  for (const f of readdirSync(LAUNCHES()).filter((x) => x.endsWith(".pid"))) {
    const pid = Number(readFileSync(join(LAUNCHES(), f), "utf8"));
    rmSync(join(LAUNCHES(), f), { force: true });
    if (!Number.isInteger(pid) || pid <= 1) continue;
    // Only a process that is still a launcher of this copy is ended (a reused process id is left alone).
    let cmd = ""; try { cmd = execFileSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf8" }); } catch { continue; }
    if (!cmd.includes(LAUNCHER)) continue;
    try { process.kill(-pid, "SIGTERM"); } catch { /* already ended */ }
  }
}

/** The model a Live field-map draft calls (UX-A part 4 n1: named under Details (for admins) in the Draft dialog, never
 *  on its main path or in the job's progress words). */
export const DRAFT_MODEL = "claude-opus-5-5";

@Injectable()
export class Sources {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {
    // Break M6: a launcher left running by a server that stopped is ended now, so no call outlives the run it belongs to.
    endOrphanLaunches();
    // A job left "running" by a stopped server can never finish: say so instead of showing it as running forever.
    void this.db.draftingJob.updateMany({ where: { status: "RUNNING" }, data: { status: "FAILED", message: "The studio server stopped while this step was running; start it again.", finishedAt: new Date() } })
      // A screen-map draft's own AI work (QA-31) ends with it (none starts since W1-02 parked online versions; an older one
      // left running still ends).
      .then(() => this.db.aiBatch.updateMany({ where: { operation: "screen_map", status: { in: ["QUEUED", "RUNNING"] }, cancelRequested: true }, data: { status: "CANCELLED", message: "Cancelled; the studio server stopped before the draft ended.", finishedAt: new Date() } }))
      .then(() => this.db.aiBatch.updateMany({ where: { operation: "screen_map", status: { in: ["QUEUED", "RUNNING"] } }, data: { status: "FAILED", message: "The studio server stopped while this draft was running.", finishedAt: new Date() } }))
      .catch(() => undefined);
  }

  /** Attaches a file to a combination as a source and says whether AI may read it (only approved files, by checksum:
   *  the official library's, D147, or one a second person approved in the product, P-80). Uploads reach this through the one form intake (intake.ts); "+ Add" calls it for a library file. */
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
      // QA-207: a previous edition is named by the printed edition its manifest row records, not its descriptive label.
      kind = officialKind(item.path); edition = item.printed ?? item.edition;
      const known = await this.db.formEdition.findFirst({ where: { workspaceId: c.workspaceId, sha256: hash, maps: { some: {} } } });
      if (known) { status = "IN_LIBRARY"; detail = `Recognised: ${edition}. Its form fields are already mapped in the library, so no AI drafting is needed.`; }
      else if (kind === "Form") { status = "RECOGNISED"; detail = `Recognised: ${edition}, an approved official form. Next: AI drafts its field map.`; }
      else { status = "ATTACHED"; detail = `Recognised: ${edition}, an approved official source. Kept as a source document; its text supports requirements and citations.`; }
    }
    // P-80: approved in the product by a second person: a form is read on this computer and drafted like an official one
    // (the drafting guard checks the approval record written at approval); a checklist is kept as a source document.
    const inProduct = item ? null : await this.db.approvedSource.findUnique({ where: { workspaceId_sha256: { workspaceId: c.workspaceId, sha256: hash } } });
    if (inProduct) {
      kind = inProduct.kind === "checklist" ? "Document checklist" : "Form"; edition = inProduct.edition;
      const by = ACTOR_BY_ID(inProduct.approvedBy).name;
      const known = kind === "Form" ? await this.db.formEdition.findFirst({ where: { workspaceId: c.workspaceId, sha256: hash, maps: { some: {} } } }) : null;
      if (known) { status = "IN_LIBRARY"; detail = `Approved in the product by ${by}: ${edition}. Its form fields are already mapped in the library, so no AI drafting is needed.`; }
      else if (kind === "Form") { status = "RECOGNISED"; detail = `Approved in the product by ${by} (IRCC page ${inProduct.irccPage}): ${edition}. Next: read the form on this computer, then AI drafts its field map, as for an official form.`; }
      else { status = "ATTACHED"; detail = `Approved in the product by ${by} (IRCC page ${inProduct.irccPage}). Kept as a source document; its text supports requirements and citations.`; }
    }
    const a = await this.db.sourceAttachment.create({ data: { workspaceId: c.workspaceId, combinationId, kind, fileName: safe, storedPath: stored.replace(`${ROOT}/`, ""), sha256: hash, bytes: file.buffer.length, recognised: !!item, officialFile: item?.file ?? null, edition, approval: item?.approval ?? (inProduct ? `approved in the product (${inProduct.irccPage})` : null), status, statusDetail: detail, uploadedVia: via, uploadedBy: actor.id } });
    await this.audit.log(c.workspaceId, actor.id, "uploaded", "source", safe, `${actor.name} attached ${safe} to "${c.label}"${via === "SAMPLE" ? " (sample button)" : ""}: ${status === "HELD" ? "held, not recognised" : edition}`, { sha256: hash, via });
    return { attachment: a, duplicate: false, message: detail };
  }

  /** P-80: the product approval of a file that is not in the official library (a second person approved it), or null. */
  async approvedInProduct(a: { workspaceId: string; sha256: string; recognised: boolean }): Promise<Approval | null> {
    if (a.recognised) return null;
    const p = await this.db.approvedSource.findUnique({ where: { workspaceId_sha256: { workspaceId: a.workspaceId, sha256: a.sha256 } } });
    if (p) return p;
    // S4 (M3): an official download carries the manifest's evidence, so it is read and drafted like an official file.
    const d = await this.db.officialDownload.findUnique({ where: { workspaceId_sha256: { workspaceId: a.workspaceId, sha256: a.sha256 } } });
    return d ? { sha256: d.sha256, kind: d.kind === "checklist" ? "checklist" : "form", code: d.code, edition: d.edition, fileName: d.fileName, irccPage: d.formPageUrl, uploadedBy: d.startedBy, approvedBy: "official-download", approvedAt: d.fetchedAt, official: { sourceUrl: d.sourceUrl } } : null;
  }

  /** The file name a form's drafting job is known by: the official file's, or for a form approved in the product its
   *  checksum's (job ids studio-fieldmap-approved-<12 hex>, which the launcher is started for with the approved folder). */
  draftName(a: { officialFile: string | null; sha256: string }) { return a.officialFile ?? `approved-${a.sha256.slice(0, 12)}.pdf`; }

  async read(actor: Actor, attachmentId: string) {
    need(actor, "author");
    const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: attachmentId } });
    const approved = await this.approvedInProduct(a);
    if (!(a.recognised && a.officialFile) && !approved) fail("Only approved forms are read: a file of the official library, or one a second person approved in the product.");
    if (a.kind !== "Form") fail("This is a checklist or instructions, not a fillable form; it is kept as a source.");
    // The record the guard checks, written at approval; written again from the database row when it is missing.
    if (approved && !(existsSync(join(APPROVED_DIR(), `${a.sha256}.approval.json`)) && existsSync(join(APPROVED_DIR(), `${a.sha256}.pdf`)))) recordApproval(approved, readFileSync(resolve(ROOT, a.storedPath)));
    const job = await this.db.draftingJob.create({ data: { workspaceId: a.workspaceId, combinationId: a.combinationId, attachmentId, kind: "read_form", mode: "LOCAL", status: "RUNNING", message: "Reading the form's fields on this computer (no AI)", startedBy: actor.id } });
    try {
      const { stdout } = await run(PY, ["-I", join(STUDIO, "tools", "read_form.py"), ...(approved ? ["--approved", APPROVED_DIR(), a.sha256] : [a.officialFile!])], { cwd: ROOT, timeout: 120_000 });
      const r = JSON.parse(stdout.trim().split("\n").pop()!);
      if (!r.ok) throw new Error(r.error ?? r.status);
      await this.db.sourceAttachment.update({ where: { id: a.id }, data: { status: "READ", statusDetail: `Read: ${r.summary.entry_fields_bound} form fields, ${r.summary.required_fields} required, ${r.summary.choice_fields_with_options} with answer lists, ${r.summary.row_groups_fixed} repeating rows, ${r.summary.barcodes} barcodes. Next: draft its field map with AI.`, inventoryFile: r.inventory_file, inventorySummary: r.summary } });
      // QA-146 (C3.1): the library edition of this same file gets the inventory too, so its formats and answer lists are
      // read (field-format.ts and forms.ts go through the edition). An edition that already has one keeps it.
      if (r.inventory_file) await this.db.formEdition.updateMany({ where: { workspaceId: a.workspaceId, sha256: a.sha256, inventoryFile: null }, data: { inventoryFile: r.inventory_file } });
      await this.db.draftingJob.update({ where: { id: job.id }, data: { status: "COMPLETED", message: `Read ${r.summary.entry_fields_bound} form fields on this computer (no AI)${String(r.status).includes("DIFFERS") ? "; the stored form field list differs from this file and was kept as it was" : ""}.`, detail: r, finishedAt: new Date() } });
      await this.audit.log(a.workspaceId, actor.id, "read", "form", a.officialFile ?? a.fileName, `${actor.name} read ${a.edition}${approved ? " (approved in the product)" : ""}: ${r.summary.entry_fields_bound} form fields (${r.status})`);
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
    return readdirSync(RUNS).filter((f) => prefixes.some((p) => f.startsWith(p)) && f.endsWith(".json") && !f.includes(".reconverted") && !hiddenRun(f)).map((orig) => {
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
    const jobId = a.officialFile || (await this.approvedInProduct(a)) ? this.jobIdFor(this.draftName(a)) : null;
    const ledger = this.ledger();
    const inventory = this.inventoryOf(a);
    const invSha = inventory ? sha(readFileSync(join(SOLUTION, inventory))) : undefined;
    const saved_runs = jobId ? this.savedRuns(jobId, invSha).map(({ envelope: _e, ...r }) => r) : [];
    // A form drafted in parts (A4) is saved part by part: Saved uses them when every part has a saved answer (as the plan
    // does; Ai.plan REPLAY), so the dialog offers it at US$0 instead of only Live (review, Opus Major 2).
    const split = jobId && inventory && !saved_runs.some((r) => r.valid || r.recheckable) ? await this.draftSplit(a, await this.printedEdition(a), false) : null;
    const saved_parts = split?.parts.length ? { parts: split.parts.length, saved: split.parts.filter((p) => p.saved_run).length } : null;
    return { job_id: jobId, model: DRAFT_MODEL, saved_runs, saved_parts, key_present: existsSync(join(ROOT, ".tools", "solution-1-prototype", "secrets", "anthropic.env")), ledger };
  }

  ledger() {
    // P-179 break m4: the same sums reserve and the cost check use (SpendLedger), so a settle with no reservation is not
    // counted here either; before, this page and the cost check could give two totals. Review m4: cents as toFixed(2)
    // gives them (the cost check's words), never Math.round, so the page and the dialog show the same figure.
    const l = new SpendLedger(LEDGER_DIR);
    const { committed, wave } = ledgerRead(() => ({ committed: l.committed(), wave: l.committedSince(WAVE1_START) }));
    // S4 (m4, P-110): Wave 1's own cap (US$60) inside the experiment cap; plans show it and refuse above it.
    const remaining = Math.min(EXPERIMENT_CAP_USD - committed, WAVE1_CAP_USD - wave);
    const cents = (n: number) => Number(n.toFixed(2));
    return { committed_usd: cents(committed), cap_usd: EXPERIMENT_CAP_USD, remaining_usd: cents(remaining), per_run_cap_usd: RUN_CAP_USD,
      wave: { name: "Wave 1", cap_usd: WAVE1_CAP_USD, spent_usd: cents(wave), remaining_usd: cents(WAVE1_CAP_USD - wave), since: WAVE1_START.slice(0, 10) } };
  }

  /** The guarded job file for one form's field-map draft (P2 launch reads it). Returns the job id and input hash. */
  ensureJobFile(a: { officialFile: string | null; inventoryFile: string | null }, printedEdition?: string | null) {
    const jobId = this.jobIdFor(a.officialFile!);
    const inv = join(SOLUTION, a.inventoryFile!);
    const jobFile = join(JOBS, `${jobId}.json`);
    // v2 (23 Oct): the field naming rule in the prompt and the output schema (contracts/fact-key.ts), and the printed
    // edition read by the intake passed as a known fact (A6). v1 stays as the record of what earlier runs used.
    const invBytes = readFileSync(inv);
    // Break m5: an inventory that is not JSON gets the 64k settings here; its read or draft fails later, as before.
    const out = wholeFormOutput((() => { try { return JSON.parse(invBytes.toString("utf8")); } catch { return null; } })());
    const want = { job_id: jobId, kind: "field_map", combination: "studio", configuration_version: "studio-add-form", template: "field-map.v2.md", output_schema: "field-map-output.v2.schema.json",
      ...(printedEdition && EDITION.test(printedEdition) ? { known: { form_edition: printedEdition } } : {}),
      inputs: [{ file: a.inventoryFile, sha256: sha(invBytes) }],
      settings: { provider_route: "anthropic-api/aiw-d261-prototype-exception-aiw-d260", model: DRAFT_MODEL, effort: "high", timeout_ms: out.timeout_ms, max_attempts: MAX_ATTEMPTS, budget_usd: 5, max_output_tokens: out.max_output_tokens } }; // 64k: a full 242-box form needs 53-63k output (IMM 1295, 20 Oct); 32k truncated IMM 5257 (21 Oct 05:58Z); 128k from 240 fields (R-146)
    const have = existsSync(jobFile) ? readFileSync(jobFile, "utf8") : null;
    if (have !== JSON.stringify(want, null, 1) + "\n") writeFileSync(jobFile, JSON.stringify(want, null, 1) + "\n");
    const draftInputs: DraftInputs = { inputSha: want.inputs[0].sha256, templateSha: sha(readFileSync(join(PROMPTS, want.template))), schemaSha: sha(readFileSync(join(PROMPTS, want.output_schema))), model: want.settings.model, effort: want.settings.effort, maxOutputTokens: want.settings.max_output_tokens, known: want.known ?? null };
    return { jobId, inputSha: want.inputs[0].sha256, settings: want.settings, template: want.template, known: want.known ?? null, inventoryBytes: statSync(inv).size, draftInputs };
  }

  /** The form's box list: its own, or, before it is read here, the one the reader keeps for exactly this file (same
   *  checksum; reading never replaces it). Lets the plan find a saved AI answer before offering a paid call (A3). For a
   *  form approved in the product (P-80) that is the approved folder's inventory of the same checksum. */
  inventoryOf(a: { officialFile: string | null; inventoryFile: string | null; sha256: string }) {
    if (a.inventoryFile) return a.inventoryFile;
    const rel = a.officialFile ? `prototype/p1/inventory/${basename(a.officialFile).replace(/\.pdf$/, "")}.inventory.json` : relative(SOLUTION, join(APPROVED_DIR(), `${a.sha256}.inventory.json`));
    try { return JSON.parse(readFileSync(join(SOLUTION, rel), "utf8")).summary?.sha256 === a.sha256 ? rel : null; } catch { return null; }
  }

  /** A4: the released mappings earlier editions of the same form hold in the library (the newest released version of
   *  each form field; a newer edition wins for the same data path), with that edition's own choices for the field. A
   *  draft nobody has released yet is never reused (review 4). Never this file's own edition. */
  async priorMaps(workspaceId: string, formKey: string, exceptSha: string): Promise<Prior[]> {
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey } }, include: { editions: true } });
    const eds = (def?.editions ?? []).filter((e) => e.channel !== "ONLINE" && e.sha256 !== exceptSha).sort(compareEditions).reverse();
    const out = new Map<string, Prior>();
    for (const e of eds) {
      let options = new Map<string, unknown>(), kinds = new Map<string, string | null>();
      try {
        const fs = (JSON.parse(readFileSync(join(SOLUTION, e.inventoryFile!), "utf8")).fields as { data_path?: string; options_resolved?: unknown; options?: unknown; ui?: string | null }[]).filter((f) => f.data_path);
        options = new Map(fs.map((f) => [f.data_path!, f.options_resolved ?? f.options ?? null])); kinds = new Map(fs.map((f) => [f.data_path!, f.ui ?? null])); // QA-33: the kind of box too
      } catch { continue; } // no inventory: nothing to compare choices with, so nothing reused
      for (const m of effective(await this.db.formFieldMap.findMany({ where: { formEditionId: e.id } }), (x) => x.dataPath, "published"))
        if (!out.has(m.dataPath)) out.set(m.dataPath, { data_path: m.dataPath, caption: m.caption, outcome: m.outcome, fact: m.canonicalFieldKey, person: m.person, transform: m.transform, row: m.row, condition: m.condition, confidence: m.confidence, edition: e.editionLabel, options: options.get(m.dataPath) ?? null, ui: kinds.get(m.dataPath) ?? null });
    }
    return [...out.values()];
  }

  /** A4: the draft of one form, reuse first and in parts: null when one call over the whole form is all there is (no
   *  reuse, one part), so the whole-form job and its saved answers stay as they were. With `write`, the part files and
   *  their guarded jobs are written (p2/parts, p2/jobs); the guard admits a part only as an exact subset. */
  async draftSplit(a: { workspaceId: string; officialFile: string | null; inventoryFile: string | null; sha256: string; edition: string | null }, printedEdition: string | null, write: boolean) {
    const invRel = this.inventoryOf(a);
    if (!invRel) return null;
    const invBytes = readFileSync(join(SOLUTION, invRel)), inv = JSON.parse(invBytes.toString("utf8"));
    const formKey = (printedEdition ?? a.edition ?? "").split(" (")[0];
    // A merged field redirects; a field retired (or missing) is never reused (break m6): the AI or a person maps it.
    const newest = new Map<string, { status: string; mergedIntoKey: string | null }>();
    for (const r of await this.db.canonicalField.findMany({ where: { workspaceId: a.workspaceId }, orderBy: { version: "desc" }, select: { canonicalFieldKey: true, status: true, mergedIntoKey: true } })) if (!newest.has(r.canonicalFieldKey)) newest.set(r.canonicalFieldKey, r);
    const live = (k: string) => { let key = k; for (let n = 0; n < 5 && newest.get(key)?.mergedIntoKey; n++) key = newest.get(key)!.mergedIntoKey!; const f = newest.get(key); return f && f.status !== "RETIRED" ? key : null; };
    const plan = planDraft(inv, await this.priorMaps(a.workspaceId, formKey, a.sha256), { redirect: live });
    if (!plan.reused.length && plan.parts.length <= 1) return null;
    const whole = this.ensureJobFile({ officialFile: this.draftName(a), inventoryFile: invRel }, printedEdition);
    const invSha = sha(invBytes), stem = basename(invRel).replace(/\.inventory\.json$/, "");
    const parts = plan.parts.map((p) => {
      const body = { contract: "inventory-part/v1", parent: { file: invRel, sha256: invSha }, part: { index: p.index, count: p.count, section: p.sections.join(", ") }, summary: inv.summary, groups: inv.groups, presence_scripts: inv.presence_scripts, fields: p.fields };
      const bytes = JSON.stringify(body, null, 1) + "\n";
      const file = `${stem}.p${p.index}of${p.count}-${sha(canonical(p.fields as never)).slice(0, 12)}.part.json`;
      // The part's job id names its content, so two drafts at once (two copies, or a library change between them) never
      // run each other's part files (break M1).
      const jobId = `${whole.jobId}-p${p.index}of${p.count}-${sha(canonical(p.fields as never)).slice(0, 12)}`;
      const settings = { ...whole.settings, max_output_tokens: partOutputTokens(p.fields.length), timeout_ms: 600_000 };
      const job = { job_id: jobId, kind: "field_map", combination: "studio", configuration_version: "studio-add-form", template: "field-map-part.v1.md", output_schema: "field-map-output.v2.schema.json", ...(whole.known ? { known: whole.known } : {}), inputs: [{ file: `prototype/p2/parts/${file}`, sha256: sha(bytes) }], settings };
      if (write) {
        mkdirSync(PARTS_DIR, { recursive: true });
        if (!existsSync(join(PARTS_DIR, file)) || readFileSync(join(PARTS_DIR, file), "utf8") !== bytes) writeFileSync(join(PARTS_DIR, file), bytes);
        const jobFile = join(JOBS, `${jobId}.json`), text = JSON.stringify(job, null, 1) + "\n";
        if (!existsSync(jobFile) || readFileSync(jobFile, "utf8") !== text) writeFileSync(jobFile, text);
      }
      // Worst case exactly as the ledger reserves it: the part's request bound and its own output limit, per attempt. A
      // part with a valid saved answer for exactly these inputs costs nothing (review 5: a retry pays only what failed).
      const inputSha = sha(bytes);
      const draftInputs: DraftInputs = { inputSha, templateSha: sha(readFileSync(join(PROMPTS, job.template))), schemaSha: sha(readFileSync(join(PROMPTS, job.output_schema))), model: settings.model, effort: settings.effort, maxOutputTokens: settings.max_output_tokens, known: job.known ?? null };
      const saved = existsSync(RUNS) ? this.savedRuns(jobId, inputSha).find((r) => r.valid && sameDraftInputs(r.envelope, draftInputs)) : undefined;
      const repeats = saved ? null : this.repeatsFailedRun(jobId, draftInputs);
      const worst = saved || repeats ? 0 : runWorstUsd(costUsd(settings.model, bytes.length + 8_000, settings.max_output_tokens), settings.max_attempts);
      return { index: p.index, count: p.count, sections: p.sections, fields: p.fields.length, paths: p.fields.map((f) => f.data_path!), jobId, file, inputSha, saved_run: saved?.file ?? null, repeats_failed_run: repeats?.run_id ?? null, worst_usd: Math.round(worst * 100) / 100 };
    });
    return { plan: { total: plan.total, reused: plan.reused, leftover: plan.leftover } as Omit<DraftPlan, "parts">, parts, wholeJobId: whole.jobId, inventoryFile: invRel, inventorySha: invSha,
      // #131 review M1: rounded up to the cent, never down (the runner reserves each part's exact worst case).
      reusedFrom: [...new Set(plan.reused.map((r) => r.reused_from))], worst_usd: Math.ceil(parts.reduce((x, p) => x + p.worst_usd, 0) * 100 - 1e-6) / 100 };
  }

  /** The edition printed on the file, as the intake read it into the library (P-51); else the approved list's label. */
  async printedEdition(a: { workspaceId: string; sha256: string; edition: string | null }) {
    return (await this.db.formEdition.findFirst({ where: { workspaceId: a.workspaceId, sha256: a.sha256 }, select: { editionLabel: true } }))?.editionLabel ?? a.edition;
  }

  /** Runs one queued field-map step (api/src/ai.ts claims it first): read the form on this computer if needed, then
   *  replay a saved run, or the guarded stub pass and, for live, the paid call. */
  async runDraftStep(id: string) {
    const j = await this.db.draftingJob.findUniqueOrThrow({ where: { id }, include: { batch: { select: { plan: true } } } });
    // P-179: a person's Continue covers the run it started, including a retry of that same run (forms follow-up, 31 Oct;
    // question in the PR): every attempt of every step of the batch carries it, and the ledger still holds the run's
    // reservations to the worst case the person accepted and total spend to the ceiling (SpendLedger.overrideRefusal).
    const ov = j.mode === "LIVE" ? overrideOf(j.batch?.plan) : undefined;
    let a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: j.attachmentId! } });
    if (a.status === "RECOGNISED" || a.status === "READ_FAILED") {
      await this.db.draftingJob.update({ where: { id }, data: { message: "Reading the form's fields on this computer (no AI)" } });
      await this.read(ACTOR_BY_ID(j.startedBy), a.id);
      a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: a.id } });
    }
    if (a.status !== "READ" && a.status !== "DRAFTED") throw new Error(`The form is ${a.status.toLowerCase().replace(/_/g, " ")}; it cannot be drafted.`);
    const printed = await this.printedEdition(a);
    if (j.mode === "REPLAY" && j.runFile) return this.useSaved(id, a.id);
    if (j.mode === "REPLAY") {
      // Saved, drafted in parts: every part's saved answer, assembled; the launcher is never asked (US$0), so no part or
      // job file is written (write=false): Load sample leaves p2/jobs as committed (P-226, QA-145; check_d1_reset_to_six).
      const parts = await this.draftSplit(a, printed, false);
      if (!parts?.parts.length) throw new Error("No saved AI answer for this form: nothing was drafted or applied. Draft it with AI, or a person maps it.");
      return this.runParts(id, a, parts, "saved");
    }
    const split = await this.draftSplit(a, printed, true);
    if (split) return this.runParts(id, a, split, j.mode === "LIVE" ? "live" : "stub", ov);
    const { jobId } = this.ensureJobFile({ officialFile: this.draftName(a), inventoryFile: a.inventoryFile }, printed);
    await this.db.draftingJob.update({ where: { id }, data: { message: j.mode === "LIVE" ? "Stub pass of the guarded launch path, then the AI call" : "Stub pass of the guarded launch path (no network, no cost)", detail: { job_id: jobId, steps: [] } } });
    await this.launch(id, a.id, jobId, j.mode === "LIVE" ? "live" : "stub", ov);
  }

  /** A4: the parts of one form's draft, one at a time (each: the guarded stub pass, then for live the paid call), with
   *  progress per part; then one merged answer (reused entries + the parts' answers, near-duplicate names flagged) that
   *  is compared with the library like any draft. A part that fails fails the step: nothing is applied. */
  async runParts(id: string, a: { id: string; workspaceId: string }, split: NonNullable<Awaited<ReturnType<Sources["draftSplit"]>>>, mode: "stub" | "live" | "saved", ov?: LaunchOverride) {
    const { plan, parts } = split;
    const state = parts.map((p) => ({ index: p.index, sections: p.sections, fields: p.fields, job_id: p.jobId, status: "queued" as string, run_file: null as string | null, cost_usd: 0, error: null as string | null, saved: false, limit: false }));
    const reusedWords = plan.reused.length ? `${plan.reused.length} of ${plan.total} form fields reused from ${split.reusedFrom.join(", ")} without AI; ` : "";
    const progress = async () => {
      const done = state.filter((s) => s.status === "done").length, fieldsDone = state.filter((s) => s.status === "done").reduce((x, s) => x + s.fields, 0);
      const running = state.filter((s) => s.status === "running").map((s) => s.index);
      await this.db.draftingJob.update({ where: { id }, data: { message: `${reusedWords}${mode === "live" ? "AI draft" : mode === "saved" ? "saved AI answers" : "stub pass"} in ${parts.length} part${parts.length === 1 ? "" : "s"}: part ${done} of ${parts.length} done · ${fieldsDone} of ${plan.leftover} form fields${running.length ? ` (running: part ${running.join(" and ")})` : ""}.`,
        detail: { job_id: split.wholeJobId, a4: { total: plan.total, reused: plan.reused.length, reused_from: split.reusedFrom, leftover: plan.leftover, parts: state } } } });
    };
    const lastJson = (s: string) => { for (const l of s.trim().split("\n").reverse()) { try { return JSON.parse(l); } catch { /* not JSON */ } } return null; };
    // A cancel or a reset stops the parts not yet started (break M2): each would otherwise be a paid call.
    const wanted = async () => { const j = await this.db.draftingJob.findUnique({ where: { id }, include: { batch: true } }); return !!j && !j.batch?.cancelRequested && j.status === "RUNNING"; };
    const runPart = async (s: (typeof state)[number]) => {
      // STUDIO_PART_PAUSE_MS (isolated test server only, like STUDIO_FAULT_SOURCE): a pause before each part, so a cancel
      // can be shown to stop the parts not yet started. The demo server never sets it.
      if (process.env.STUDIO_PART_PAUSE_MS) await new Promise((r) => setTimeout(r, Number(process.env.STUDIO_PART_PAUSE_MS)));
      if (!(await wanted())) { s.status = "not started"; s.error = "cancelled or reset before this part started; nothing was sent"; return; }
      s.status = "running"; await progress();
      // Saved: each part's saved answer for exactly its inputs, or the part fails (the library changed since the plan);
      // nothing is sent and the launcher is not asked.
      if (mode === "saved") {
        const sp = parts.find((x) => x.index === s.index)!;
        if (sp.saved_run) { s.status = "done"; s.saved = true; s.run_file = `prototype/p2/runs/${sp.saved_run}`; }
        else { s.status = "failed"; s.error = "no saved AI answer for exactly this part now (its saved file is gone, or the library changed since the plan); nothing was sent"; }
        return;
      }
      const stub = await this.launchOnce(s.job_id, "stub"), sj = lastJson(stub.out);
      if (stub.stopped) { s.status = "not started"; s.error = "stopped during its stub pass (M7); nothing was sent"; return; }
      if (stub.code !== 0) { s.status = "failed"; s.error = `stub pass failed: ${this.plainRefusal(String(sj?.refused ?? stub.err).slice(-300))}`; return; }
      if (mode === "stub") { s.status = "done"; s.run_file = sj?.run_file ? String(sj.run_file).replace(`${SOLUTION}/`, "") : null; return; }
      const p = parts.find((x) => x.index === s.index)!;
      if (p.saved_run) { s.status = "done"; s.saved = true; s.run_file = `prototype/p2/runs/${p.saved_run}`; return; } // its saved answer, US$0
      if (p.repeats_failed_run) { s.status = "failed"; s.error = `a new paid call would repeat run ${p.repeats_failed_run}, which asked exactly this and whose answer failed our own check; a person maps this part, or the rule is reviewed`; return; }
      const live = await this.launchOnce(s.job_id, "live", wanted, ov), lj = lastJson(live.out);
      if (live.cancelled) { s.status = "not started"; s.error = "cancelled before its AI call (after its stub pass); nothing was sent"; return; }
      if (!lj?.run_file) { s.status = "failed"; s.error = String(lj?.refused ?? lj?.error ?? live.err.split("\n").filter(Boolean).slice(-2).join(" ")).slice(0, 300) || "the launcher stopped without a reason"; s.limit = /usage limit/i.test(s.error); return; }
      const rec = JSON.parse(readFileSync(lj.run_file, "utf8"));
      s.run_file = String(lj.run_file).replace(`${SOLUTION}/`, ""); s.cost_usd = rec.drafting_run?.usage?.cost_usd ?? 0;
      if (!/^completed/.test(rec.drafting_run?.status ?? "") || rec.contract_valid !== true) { s.status = "failed"; s.error = explainRun(rec).message; s.limit = isProviderLimit(rec); return; }
      s.status = "done";
    };
    try {
      await progress();
      const queue = [...state];
      // One part at a time: the experiment ledger admits one paid call at a time (p2/runner.ts holds its lock for the
      // call; break B3), so parts side by side would refuse each other. Parts stay small and each reports progress.
      for (let s = queue.shift(); s; s = queue.shift()) { await runPart(s); if (await this.db.draftingJob.findUnique({ where: { id } })) await progress(); }
      if (!(await this.db.draftingJob.findUnique({ where: { id } }))) return; // removed by a reset while running
      const cost = Math.round(state.reduce((x, s) => x + s.cost_usd, 0) * 100) / 100;
      if (state.some((s) => s.status === "not started")) {
        await this.db.draftingJob.update({ where: { id }, data: { status: "CANCELLED", costUsd: cost, finishedAt: new Date(), message: `Cancelled: ${state.filter((s) => s.status === "done").length} of ${parts.length} parts ran before the cancel; ${mode === "saved" ? "Saved never calls the AI" : "the rest were not sent"}. Nothing was applied. Cost US$${cost.toFixed(2)}.` } });
        return;
      }
      const failed = state.filter((s) => s.status !== "done");
      if (failed.length) {
        // Every part refused by the provider's account limit: BLOCKED, as for a whole-form draft (QA-34 tests found the
        // parts path said FAILED for the same refusal); nothing was drafted, and the way out is the same.
        if (failed.every((f) => f.limit)) {
          await this.db.draftingJob.update({ where: { id }, data: { status: "BLOCKED", costUsd: cost, finishedAt: new Date(), message: `Blocked by the AI provider's account usage limit: ${failed.length} of ${parts.length} parts were refused before any processing. Nothing was drafted or applied. Cost US$${cost.toFixed(2)}. Use a saved AI answer, or try again once access is restored.` } });
          return;
        }
        await this.db.draftingJob.update({ where: { id }, data: { status: "FAILED", costUsd: cost, finishedAt: new Date(), message: `${failed.length} of ${parts.length} parts did not finish (${failed.map((f) => `part ${f.index}: ${f.error}`).join("; ").slice(0, 500)}). Nothing was applied. Cost US$${cost.toFixed(2)}.` } });
        return;
      }
      if (mode === "stub" && parts.length) {
        await this.db.draftingJob.update({ where: { id }, data: { status: "COMPLETED", costUsd: 0, finishedAt: new Date(), message: `Stub pass completed for all ${parts.length} parts: the guarded path works for each part. ${reusedWords ? `${reusedWords[0].toUpperCase()}${reusedWords.slice(1).replace(/; $/, ". ")}` : ""}A stub has no AI content, so there is nothing to compare.` } });
        return;
      }
      // Cancelled while the last part's AI call ran: its answer is not compared or applied (as the cancel says).
      if (!(await wanted())) { await this.db.draftingJob.updateMany({ where: { id, status: "RUNNING" }, data: { status: "CANCELLED", costUsd: cost, finishedAt: new Date(), message: `Cancelled while the AI ran: the parts' answers were not compared or applied. Cost US$${cost.toFixed(2)}.` } }); return; }
      // One answer: the reused entries and every part's checked answer (p2/convert rules per part), in form order.
      // One record: the reused entries and every part's checked answer (p2/convert rules per part), in form order
      // (engine/parts.ts assembleMerged; every form field reused → no part, labelled as no AI).
      const lib = new Map((await this.db.canonicalField.findMany({ where: { workspaceId: a.workspaceId }, orderBy: { version: "desc" } })).map((r) => [r.canonicalFieldKey, { meaning: r.meaning, valueType: r.valueType }]));
      const runId = `${split.wholeJobId}-${parts.length ? "merged" : "reused"}-${new Date().toISOString().replace(/[-:.]/g, "").toLowerCase()}-${randomBytes(3).toString("hex")}`;
      const envelope = assembleMerged(state.map((s, i) => ({ part: s.index, sections: s.sections, fields: parts[i].paths, run_file: s.run_file, rec: JSON.parse(readFileSync(join(SOLUTION, s.run_file!), "utf8")) })), plan.reused,
        { runId, reusedFrom: split.reusedFrom, inventoryFile: split.inventoryFile, inventorySha: split.inventorySha, label: LABEL, library: lib });
      const dir = join(VAR("demo"), "merged-runs"); mkdirSync(dir, { recursive: true });
      const file = join(dir, `${runId}.json`); writeFileSync(file, JSON.stringify(envelope, null, 1) + "\n");
      await this.db.draftingJob.update({ where: { id }, data: { runId, runFile: file.replace(`${SOLUTION}/`, ""), costUsd: cost } });
      await this.ingest(id, a.id);
    } catch (e) {
      await this.db.draftingJob.update({ where: { id }, data: { status: "FAILED", message: (e as Error).message.slice(0, 500), finishedAt: new Date() } });
    }
  }

  /** A launcher refusal in plain words: its own reason, with the single-use ticket explained once. */
  plainRefusal(why: string) {
    return /launch ticket|screening digest/i.test(why) ? `the guarded launch refused this start (its single-use screening check did not match this run; start it again): ${why}` : why;
  }

  private launching: Promise<unknown> = Promise.resolve();
  /** The step is still wanted: it exists (no reset removed it), it runs, and nobody cancelled its AI work. */
  async stillWanted(id: string) { const j = await this.db.draftingJob.findUnique({ where: { id }, include: { batch: true } }); return !!j && j.status === "RUNNING" && !j.batch?.cancelRequested; }
  /** One run of the guarded launcher (p2/launch.ts) for a job file: the only way the Studio starts a drafting call. One
   *  launch at a time in this server, and a launch the experiment ledger refused because another runner (another copy)
   *  holds it is started again after a pause: refused before any call, so nothing was spent (break B3). */
  async launchOnce(jobId: string, mode: "stub" | "live", wanted?: () => Promise<boolean>, ov?: LaunchOverride): Promise<{ code: number; out: string; err: string; cancelled?: boolean; stopped?: boolean }> {
    if (mode === "live" && !aiLive()) return { code: 3, out: JSON.stringify({ refused: START.liveOff, live_off: true }) + "\n", err: "" };
    const turn = this.launching.then(async () => {
      for (let n = 0; ; n++) {
        // A cancel is honoured up to the moment a paid call starts (QA-31 break M1): a live launch can wait its turn behind
        // other launches, or for the ledger, for minutes; the step is asked again right before each attempt.
        if (mode === "live" && wanted && !(await wanted())) return { code: 0, out: "", err: "", cancelled: true };
        const r = await this.launchProcess(jobId, mode, mode === "live" ? ov : undefined);
        if (n >= 60 || !/ledger locked/i.test(r.out + r.err)) return r;
        await new Promise((res) => setTimeout(res, 2_000));
      }
    });
    this.launching = turn.catch(() => undefined);
    return turn;
  }

  private launchProcess(jobId: string, mode: "stub" | "live", ov?: LaunchOverride): Promise<{ code: number; out: string; err: string; stopped?: boolean }> {
    return new Promise((res) => {
      // P-80: a form approved in the product is admitted only from this copy's approved folder, named to the launcher.
      const approved = /^studio-fieldmap-approved-[0-9a-f]{12}/.test(jobId) ? ["--approved-dir", APPROVED_DIR()] : [];
      // S4 (M7, P-110): the launcher runs in its own process group, so Stop ends it and the drafting process it started.
      const p = spawn(NODE, launchArgs(LAUNCHER, jobId, mode, approved, ov), { cwd: ROOT, detached: true, env: { ...process.env, PATH: `${join(NODE, "..")}:${process.env.PATH}` } });
      this.children.set(jobId, p);
      const pidFile = join(LAUNCHES(), `${jobId}.pid`);
      try { mkdirSync(LAUNCHES(), { recursive: true }); writeFileSync(pidFile, String(p.pid ?? "")); } catch { /* the in-memory Stop still works */ }
      p.on("close", () => rmSync(pidFile, { force: true }));
      let out = "", err = "";
      p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
      p.on("close", (code, signal) => { if (this.children.get(jobId) === p) this.children.delete(jobId); res({ code: code ?? 1, out, err, ...(signal ? { stopped: true } : {}) }); });
    });
  }

  /** Launches running now, by job id (one at a time per job). */
  private children = new Map<string, ChildProcess>();
  /** S4 (M7): Stop really ends a running AI call: terminate the launcher's process group, then force it after 10 s. No
   *  call starts after it; a call already sent stays counted in the ledger at its reserved worst case (the provider
   *  may still bill it). Returns the job ids it stopped. */
  stopLaunches(match: (jobId: string) => boolean): string[] {
    const hit = [...this.children.entries()].filter(([id]) => match(id));
    for (const [, p] of hit) {
      const group = (sig: NodeJS.Signals) => { try { process.kill(-p.pid!, sig); } catch { /* already ended */ } };
      group("SIGTERM");
      setTimeout(() => { if (p.exitCode === null && p.signalCode === null) group("SIGKILL"); }, 10_000).unref();
    }
    return hit.map(([id]) => id);
  }

  async launch(id: string, attachmentId: string, jobId: string, mode: "live" | "stub", ov?: LaunchOverride) {
    const steps: any[] = [];
    const lastJson = (s: string) => { for (const l of s.trim().split("\n").reverse()) { try { return JSON.parse(l); } catch { /* not JSON */ } } return null; };
    try {
      const stub = await this.launchOnce(jobId, "stub");
      if (stub.stopped) { await this.db.draftingJob.updateMany({ where: { id, status: "RUNNING" }, data: { status: "CANCELLED", costUsd: 0, finishedAt: new Date(), message: "Cancelled before it started its AI call (stopped during the stub pass): nothing was sent. US$0.", detail: { job_id: jobId, steps } } }); return; }
      const sj = lastJson(stub.out);
      steps.push({ step: "stub pass", exit: stub.code, result: sj, error: stub.code ? stub.err.slice(-600) : undefined });
      if (stub.code !== 0) throw new Error(`stub pass failed: ${(sj?.refused ?? stub.err).toString().slice(-300)}`);
      if (mode === "stub") { await this.db.draftingJob.update({ where: { id }, data: { status: "COMPLETED", message: "Stub pass completed: the guarded path works. A stub has no AI content, so there is nothing to compare.", detail: { job_id: jobId, steps }, finishedAt: new Date(), costUsd: 0 } }); return; }
      const took = this.savedRuns(jobId).find((r) => r.duration_ms)?.duration_ms;
      await this.db.draftingJob.update({ where: { id }, data: { message: `Calling the AI (guarded path; up to US$5). ${took ? `The last real run of this form took about ${Math.max(1, Math.round(took / 60_000))} minutes.` : "A large form can take several minutes."} The whole form is drafted in one call, so there is no part-by-part progress yet.`, detail: { job_id: jobId, steps } } });
      const live = await this.launchOnce(jobId, "live", () => this.stillWanted(id), ov);
      if (live.cancelled) { await this.db.draftingJob.updateMany({ where: { id, status: "RUNNING" }, data: { status: "CANCELLED", costUsd: 0, finishedAt: new Date(), message: "Cancelled before it started its AI call (after the stub pass): nothing was sent. US$0.", detail: { job_id: jobId, steps } } }); return; }
      if (live.stopped) { await this.db.draftingJob.updateMany({ where: { id, status: "RUNNING" }, data: { status: "CANCELLED", finishedAt: new Date(), message: "Stopped while the AI call ran: the call was ended (M7). It stays counted at its reserved worst case; nothing of it is applied.", detail: { job_id: jobId, steps } } }); return; }
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
        // Outside review 29 Oct: only the refused attempt is free; an earlier attempt counted at its worst case stays counted.
        const kept = limit ? costBesideLimit(rec) : 0;
        await this.db.draftingJob.update({ where: { id }, data: { status: limit ? "BLOCKED" : "FAILED", runId: rec.drafting_run?.run_id, runFile, costUsd: limit ? kept : rec.drafting_run?.usage?.cost_usd ?? null, finishedAt: new Date(), detail: { job_id: jobId, steps, provider_status: rec.drafting_run?.status, ledger_correction: correction },
          message: limit ? `Blocked by the AI provider: the account's monthly usage limit refused the call before any processing (request ${rid ?? "id not returned"}). ${kept > 0 ? `Nothing was drafted; the refused call was settled at US$0 (AIW-D273), and an earlier attempt stays counted at US$${kept.toFixed(2)}.` : "Nothing was drafted or billed; the ledger's worst-case reservation was settled at US$0 (AIW-D273)."} Raise the limit in the Anthropic Console, then start the live draft again.` : `${explainRun(rec).message} Run ${rec.drafting_run?.run_id}.` } });
        return;
      }
      await this.db.draftingJob.update({ where: { id }, data: { runId: rec.drafting_run?.run_id, runFile, costUsd: rec.drafting_run?.usage?.cost_usd ?? null, detail: { job_id: jobId, steps } } });
      // Cancelled while the AI call ran: the answer stays in its run record, but is not compared or applied.
      if (!(await this.stillWanted(id))) { await this.db.draftingJob.updateMany({ where: { id, status: "RUNNING" }, data: { status: "CANCELLED", finishedAt: new Date(), message: `Cancelled while the AI call ran: its answer was kept in the run record but not compared or applied. Cost US$${Number(rec.drafting_run?.usage?.cost_usd ?? 0).toFixed(2)}.` } }); return; }
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
    const previousRows = opts.recompare ? await this.db.proposalItem.findMany({ where: { runId: jobId } }) : [];
    const previous = previousRows.map(reviewRow);
    // QA-193 (Devin on #740): a kept decision keeps the To review batch it was made in.
    const previousBatch = new Map(previous.map((o, i) => [o.proposedKey, previousRows[i].batchId]));
    const revision = await libraryRevision(this.db, job.workspaceId);
    const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: attachmentId } });
    const rec = JSON.parse(readFileSync(join(SOLUTION, job.runFile!), "utf8"));
    if (!rec.contract_valid || !rec.raw_output) { await this.db.draftingJob.update({ where: { id: jobId }, data: { status: "FAILED", message: `${explainRun(rec).message} Run ${rec.drafting_run?.run_id ?? "unknown"}.`, finishedAt: new Date() } }); return; }
    const out = checkedOutput(rec);
    const inv = JSON.parse(readFileSync(join(SOLUTION, a.inventoryFile!), "utf8"));
    const box = new Map<string, any>(inv.fields.filter((x: any) => x.data_path).map((x: any) => [x.data_path, x]));
    const entries = out.entries.map((e: any) => ({ ...e, caption: box.get(e.data_path)?.caption ?? null }));
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId: a.workspaceId }, orderBy: [{ version: "desc" }, { canonicalFieldKey: "asc" }] });
    const seen = new Set<string>(); const library: LibraryField[] = []; const redirects = new Map<string, string>();
    for (const r of rows) if (!seen.has(r.canonicalFieldKey)) { seen.add(r.canonicalFieldKey); if (r.mergedIntoKey) redirects.set(r.canonicalFieldKey, r.mergedIntoKey); else if (r.status !== "RETIRED") library.push({ key: r.canonicalFieldKey, meaning: r.meaning, valueType: r.valueType, status: r.status, aliases: r.aliases }); }
    const items = normalize(out.canonical_fields, entries, library, redirects);
    // A4: the same meaning proposed under two names in different parts is flagged for a person, never merged silently.
    flagNearDuplicates(items, rec.merged?.near_duplicates ?? []);
    const affected = await this.dependents(a.workspaceId, [...new Set(items.flatMap((i) => [i.matchedKey, ...i.candidates.map((c) => c.key)]).filter(Boolean) as string[])]);
    if (opts.recompare && job.status !== "COMPLETED") fail("Only a draft waiting for review can be compared again.", HttpStatus.CONFLICT);
    // S6 slice 1a: the comparison's proposals enter the one review queue through the door (contract v2); the comparison
    // itself (outcome, candidates, form fields, affected items) is the server's working column beside them.
    const libKeys = new Set(library.map((l) => l.key));
    // D3: the edition is a fact of the file (p2/convert.ts), never the model's reading: a saved answer that misread it (the
    // 21 Oct IMM 5257 run says 06-2018 for the 09-2023 file) still lands on the file's edition; the reading stays on the job.
    const fileEdition = (await this.printedEdition(a)) ?? null; // printedEdition falls back to the attachment's own label
    // G-CORE B4 (P-121): the blind checker round (api/src/field-map-check.ts), replayed when a checker run of exactly this
    // form's inputs is recorded, compared with the draft field by field; the rules run on both rounds' items.
    const chk = await checkerRound(this, rec, fileEdition);
    let cmp: ReturnType<typeof compareMaps> | null = null;
    if (chk.ok) {
      const cout = checkedOutput({ raw_output: JSON.stringify(chk.output) } as never);
      cmp = compareMaps(items, normalize(cout.canonical_fields, cout.entries.map((e) => ({ ...e, caption: box.get(e.data_path)?.caption ?? null })), library, redirects));
    }
    const formPaths = new Set(box.keys());
    const readingOf = (f: MapField) => `${f.proposedKey} (${f.proposedType}): ${f.boxes.length} form field${f.boxes.length === 1 ? "" : "s"}`.slice(0, 300);
    const draftRound = { from: (job.mode === "REPLAY" ? "replay" : "live") as "replay" | "live", runFile: job.runFile!.slice(0, 300), costUsd: Math.max(0, Number(job.costUsd ?? 0)) };
    // QA-191 (P-121): the rules run on both rounds: the quote is checked against the form's own words (never assumed found),
    // the kind of answer is one the library knows, and no form field is filled by two fields of the same round.
    const words = formWords(inv.fields ?? []);
    const valueTypes = new Set(Object.keys(VALUE_TYPE_TO_DATA_TYPE));
    const twiceDraft = claimedTwice(items), twiceCheck = claimedTwice(cmp ? [...[...cmp.byKey.values()].map((x) => x.check).filter((x): x is MapField => !!x), ...cmp.checkOnly] : []); // review m2: fields only the checker named count
    const quoteOfItem = (f: MapField) => (f as MapField & { evidence?: { quotes?: string[] } }).evidence?.quotes?.[0] ?? null;
    const quoteOf = (q?: string) => (q && /^[0-9a-f]{64}$/.test(a.sha256) ? { file: a.fileName.slice(0, 300), sha256: a.sha256, edition: a.edition?.slice(0, 60) ?? null, page: null, quote: q.slice(0, 1000), quoteFound: quoteOnForm(q, words), rule: null } : null);
    const proposals: (NewProposal & Work)[] = items.map((i) => {
      const near = i.candidates.filter((c) => c.score >= 0.55).map((c) => c.key).slice(0, 10);
      const reuses = !!i.recommendation.key && (i.recommendation.action === "reuse" || (i.recommendation.action === "decide" && libKeys.has(i.recommendation.key)));
      const ready = i.outcome === "REUSE" || (i.outcome === "NEW" && !near.length);
      const payload = { kind: "field" as const, label: i.proposedKey.slice(0, 120), aliases: [], meaning: i.proposedMeaning, valueType: i.proposedType, subject: null, formBox: null };
      // G-CORE B4: both readings kept; a disagreement is Decide with both reasons (P-121); no checker yet stays one round.
      const c = cmp?.byKey.get(i.proposedKey);
      const rounds = { draft: { ...draftRound, reading: readingOf(i), payload }, check: c?.check && chk.ok ? { reading: readingOf(c.check), payload: { ...payload, valueType: c.check.proposedType }, from: chk.from, runFile: chk.runFile.slice(0, 300), costUsd: chk.costUsd } : null };
      const rules = [...mapRules(i, formPaths, { quote: i.evidence.quotes[0], words, claimedTwice: twiceDraft, valueTypes, round: "draft" }),
        ...(c?.check ? mapRules(c.check, formPaths, { quote: quoteOfItem(c.check), words, claimedTwice: twiceCheck, valueTypes, round: "checker" }).map((r) => ({ ...r, rule: `checker_${r.rule}` })) : [])];
      const differ = c?.agreement === "differ";
      const confidence = differ ? "decide" as const : ready ? "ready" as const : i.outcome === "NEW" ? "check" as const : "decide" as const;
      const reason = differ ? `${c!.why}${i.reason ? ` Draft: ${i.reason}` : ""}`.slice(0, 500) : ready ? null : i.reason.slice(0, 500);
      return { kind: "field", runId: jobId, step: job.kind, scope: { formEdition: fileEdition?.slice(0, 60) ?? null, combinationId: job.combinationId }, landsOn: "library",
        reuse: reuses ? { match: "reuse", existingKey: i.recommendation.key } : { match: "new", existingKey: null }, payload, source: quoteOf(i.evidence.quotes[0]), rounds, rules,
        agreement: c ? c.agreement : "one_round", confidence, reason, origin: "ai",
        identity: { key: identityKeyOf(payload, ""), near, nearReason: near.length ? i.reason.slice(0, 300) : null }, relatesTo: null, revision: null, basis: "SAMPLE",
        work: { proposedKey: i.proposedKey, outcome: i.outcome, matchedKey: i.matchedKey, candidates: i.candidates, persons: i.persons, boxes: i.boxes, evidence: { ...i.evidence, recommendation: i.recommendation },
          affected: Object.fromEntries([i.matchedKey, ...i.candidates.map((c) => c.key)].filter(Boolean).map((k) => [k, affected.get(k!) ?? null])), reason: i.reason } };
    });
    await this.db.$transaction(async (tx) => { await tx.proposalItem.deleteMany({ where: { runId: jobId } }); await slowForTest(a.fileName); await insertProposals(tx, a.workspaceId, proposals); }, QUEUE_TX)
      // Past the room the transaction is rolled back: said in words for a person, never Prisma's text with a file path.
      .catch((e) => { if (/Transaction API error/.test(String((e as Error).message))) fail(`Putting ${a.edition ?? a.fileName}'s ${proposals.length} proposals on the review queue took longer than ${QUEUE_TX.timeout / 1000} s, so none was added. Run it again when the computer is less busy.`, HttpStatus.SERVICE_UNAVAILABLE); throw e; });
    // Re-compare (D280 stale result): a person's decision is kept when the comparison for that proposal is unchanged and
    // its decided key means what it meant (an existing field is still there; a new key has not been created meanwhile).
    let kept = 0, reopened = 0;
    if (previous.length) {
      for (const raw of await this.db.proposalItem.findMany({ where: { runId: jobId } })) {
        const it = reviewRow(raw);
        const old = previous.find((o) => o.proposedKey === it.proposedKey);
        if (!old || old.decision === "PENDING") continue;
        const topKeys = (x: any) => (x.candidates as any[]).slice(0, 3).map((c) => c.key).join(",");
        const wasExisting = !!old.decidedKey && (old.decidedKey === old.matchedKey || (old.candidates as any[]).some((c) => c.key === old.decidedKey) || old.outcome === "REUSE");
        const same = old.outcome === it.outcome && old.matchedKey === it.matchedKey && topKeys(old) === topKeys(it) && (old.decision === "RETURNED" || !old.decidedKey || libKeys.has(old.decidedKey) === wasExisting);
        if (same) {
          kept++;
          const p = raw.payload as Record<string, unknown>, oldPayload = old.payload as { label?: string; advisory?: unknown } | null;
          await recordChoice(this.db, it.id, { choice: old.decision, decidedKey: old.decidedKey, by: old.decidedBy, reason: old.decisionNote, batchId: previousBatch.get(it.proposedKey) ?? null, payload: { ...p, meaning: old.proposedMeaning, valueType: old.proposedType, ...(old.decision === "NEW" && oldPayload?.label ? { label: oldPayload.label } : {}) } as any,
            ...(old.decision === "NEW" ? { work: { ...(raw.work as object), advisory: oldPayload?.advisory ?? null } } : {}) });
          await this.db.proposalItem.update({ where: { id: it.id }, data: { decidedAt: old.decidedAt } });
        }
        else { reopened++; await this.db.proposalItem.update({ where: { id: it.id }, data: { decisionReason: `Decide again: the library changed since ${old.decidedBy}'s decision (${old.decision.toLowerCase()}${old.decidedKey ? ` → ${old.decidedKey}` : ""}).` } }); }
      }
    }
    const n = (o: string) => items.filter((i) => i.outcome === o).length;
    const needsPerson = (rec.conversion?.needs_person ?? []).length;
    const counts = { needs_person: needsPerson, boxes: out.entries.length, mapped: out.entries.filter((e: any) => e.outcome === "mapped").length, unresolved: out.entries.filter((e: any) => e.outcome === "unresolved").length, never_filled: out.entries.filter((e: any) => e.outcome === "never_filled").length, not_a_fact: out.entries.filter((e: any) => e.outcome === "not_a_fact").length, proposed_fields: items.length, reuse: n("REUSE"), new: n("NEW"), ambiguous: n("AMBIGUOUS"), conflict: n("CONFLICT") };
    await this.db.draftingJob.update({ where: { id: jobId }, data: { status: "COMPLETED", finishedAt: opts.recompare ? job.finishedAt : new Date(), message: `${job.mode === "REPLAY" ? `Saved AI answer${rec.merged?.parts.length ? `s of its ${rec.merged.parts.length} parts${rec.merged.reused ? `, ${rec.merged.reused} form fields reused without AI` : ""}${rec.merged.near_duplicates.length ? `, ${rec.merged.near_duplicates.length} near-duplicate names flagged` : ""}` : ""}${rec.reconverted ? ", re-checked with today's rules" : ""} (no model call, US$0). ` : `${rec.merged && !rec.merged.parts.length ? `Every form field reused from ${rec.merged.reused_from.join(", ")} without AI (US$0)` : "Live AI draft"}${rec.merged?.parts.length ? ` in ${rec.merged.parts.length} parts${rec.merged.reused ? `, ${rec.merged.reused} form fields reused without AI` : ""}${rec.merged.near_duplicates.length ? `, ${rec.merged.near_duplicates.length} near-duplicate names flagged` : ""}` : ""}. `}${counts.mapped} of ${counts.boxes} form fields mapped${needsPerson ? ` (${needsPerson} sent to a person: field name or entry rules)` : ""}; ${counts.proposed_fields} fields: ${counts.reuse} reuse, ${counts.new} new, ${counts.ambiguous} ambiguous, ${counts.conflict} conflicting.`, detail: { ...(job.detail as any), counts, form_edition_drafted: out.form_edition, conversion: rec.conversion ?? null, label: rec.label, usage: rec.drafting_run?.usage ?? null, prompt: rec.drafting_run?.settings?.prompt_version, library_revision: revision, ...(opts.recompare ? { recompared: { at: new Date().toISOString(), by: opts.recompare.id, kept, reopened } } : {}) } } });
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
    const { proposals, ...j } = await this.db.draftingJob.findUniqueOrThrow({ where: { id }, include: { proposals: true } });
    const rank: Record<string, number> = { CONFLICT: 0, AMBIGUOUS: 1, NEW: 2, REUSE: 3 };
    const a = j.attachmentId ? await this.db.sourceAttachment.findUnique({ where: { id: j.attachmentId } }) : null;
    // QA-75: the page's trail names the combination ("<combination> › Forms").
    const combination = j.combinationId ? await this.db.combination.findUnique({ where: { id: j.combinationId }, select: { id: true, label: true } }) : null;
    // C3.1 AT-8/9/9b (IRCC-F07): beside each form field, what its PDF box says (length, own choices, date pattern).
    const boxFormat = pdfBoxFormats(a?.inventoryFile);
    const withFormat = (r: ReturnType<typeof reviewRow>) => ({ ...r, boxes: (r.boxes as { data_path: string }[]).map((b) => ({ ...b, format: boxFormat(b.data_path) })) });
    return { ...j, attachment: a, combination, items: proposals.map(reviewRow).map(withFormat).sort((x, y) => rank[x.outcome] - rank[y.outcome] || x.proposedKey.localeCompare(y.proposedKey)), elapsed_s: Math.round(((j.finishedAt ?? new Date()).getTime() - j.startedAt.getTime()) / 1000) };
  }

  async decide(actor: Actor, jobId: string, itemId: string, body: unknown) {
    need(actor, "review");
    // Break M8: a decision is one of the five kinds, with bounded words and a known kind of value; anything else is a
    // plain 400, never stored (an unknown decision once mapped a form field to a key that is not in the library).
    if (!body || typeof body !== "object" || Array.isArray(body)) fail("Send the decision as one JSON object.");
    const b = body as { decision?: unknown; key?: unknown; note?: unknown; meaning?: unknown; valueType?: unknown; label?: unknown; reason?: unknown };
    if (!["ACCEPTED", "CHANGED", "RETURNED", "PENDING", "NEW"].includes(String(b.decision))) fail("Choose a decision: accept, change, return, undo or a new shared field.");
    const text = (v: unknown, max: number, what: string) => { if (v === undefined || v === null) return undefined; if (typeof v !== "string") fail(`${what} must be text.`); if ((v as string).length > max) fail(`Keep ${what.toLowerCase()} under ${max} characters.`); return v as string; };
    const d = { decision: b.decision as "ACCEPTED" | "CHANGED" | "RETURNED" | "PENDING" | "NEW", key: text(b.key, 200, "The key"), note: text(b.note, 300, "The reason"), meaning: text(b.meaning, 500, "The meaning"), valueType: text(b.valueType, 40, "The kind of value"), label: text(b.label, 200, "The name"), reason: text(b.reason, 300, "The reason") };
    if (d.valueType !== undefined && !(d.valueType in VALUE_TYPE_TO_DATA_TYPE)) fail(`Choose a kind of value from the list (${Object.keys(VALUE_TYPE_TO_DATA_TYPE).join(", ")}).`);
    return this.decideChecked(actor, jobId, itemId, d);
  }

  private async decideChecked(actor: Actor, jobId: string, itemId: string, b: { decision: "ACCEPTED" | "CHANGED" | "RETURNED" | "PENDING" | "NEW"; key?: string; note?: string; meaning?: string; valueType?: string; label?: string; reason?: string }) {
    const job = await this.db.draftingJob.findUniqueOrThrow({ where: { id: jobId } });
    // C2.6 (QA-157, P-149 one door): a checklist's lines are decided on the review queue, never here.
    if (job.kind === "checklist_draft") fail("A checklist's document lines are decided one by one on the review queue (To review), where accepting one writes it to the draft. Nothing was changed here.", HttpStatus.GONE);
    if (job.status === "APPLIED") fail("This draft is already applied to the configuration; change the definitions in the library instead.", HttpStatus.CONFLICT);
    const raw = await this.db.proposalItem.findUnique({ where: { id: itemId } });
    if (!raw) fail("This proposal does not exist.", HttpStatus.NOT_FOUND);
    const it = reviewRow(raw!);
    if (it.jobId !== jobId) fail("This proposal belongs to another draft.", HttpStatus.NOT_FOUND);
    if (it.kind !== "field" && (b.decision === "NEW" || b.decision === "CHANGED")) fail("A checklist proposal is accepted or returned; it is not a shared field.");
    let decidedKey: string | null = null;
    const rec = (it.evidence as any).recommendation;
    if (b.decision === "ACCEPTED") {
      decidedKey = rec?.key ?? it.matchedKey ?? it.proposedKey;
      // BR-7 (review Must 3): accepting a proposal that makes a new shared field while the library has one that could
      // fit needs the same reason as the new-field form; Accept is not a way round it.
      const inLibrary = await this.db.canonicalField.count({ where: { workspaceId: job.workspaceId, canonicalFieldKey: decidedKey! } });
      const best = ((it.candidates as { key: string; score: number }[]) ?? []).filter((c) => c.score >= 0.55).sort((x, y) => y.score - x.score)[0];
      if (!inLibrary && best && (b.note ?? "").trim().length < 8) fail(`This makes a new shared field, and the library already has one that could fit (${best.key}). Use that field, or say why this is a different meaning (8 characters or more).`);
    }
    if (b.decision === "CHANGED") {
      // A field merged into another redirects to it (P-65): the decision records the surviving id.
      const key = await resolveKey(this.db, job.workspaceId, b.key ?? fail("Choose the library field to use, or type a new key."));
      decidedKey = key;
      await refuseRetired(this.db, job.workspaceId, "field", [key]); // C11.9 review round 2 Major 1: a retired field takes no new form field
      const exists = await this.db.canonicalField.findFirst({ where: { workspaceId: job.workspaceId, canonicalFieldKey: key } });
      const problem = exists ? null : newKeyProblem(key);
      if (problem) fail(`A new key is area.name in lower case: ${problem}.`);
    }
    if (b.decision === "RETURNED" && !b.note?.trim()) fail("Say why it goes back, so its form fields show the reason.");
    if (b.decision === "NEW") return this.decideNew(actor, job, it, b);
    const edits = b.meaning || b.valueType ? { ...(raw!.payload as any), ...(b.meaning ? { meaning: b.meaning } : {}), ...(b.valueType ? { valueType: b.valueType } : {}) } : undefined;
    const u = reviewRow(await recordChoice(this.db, itemId, { choice: b.decision, decidedKey: b.decision === "RETURNED" || b.decision === "PENDING" ? null : decidedKey, by: b.decision === "PENDING" ? null : actor.id, reason: b.note ?? (b.meaning ? `meaning: ${b.meaning}` : null), payload: edits }));
    await this.audit.log(job.workspaceId, actor.id, "decided", "AI proposal", it.proposedKey, `${actor.name} ${b.decision.toLowerCase()} ${it.proposedKey}${decidedKey && decidedKey !== it.proposedKey ? ` → ${decidedKey}` : ""}${b.note ? `: ${b.note}` : ""}`);
    return u;
  }

  /** BR-7: a new shared field. The person types its name and meaning; the key is generated (keyFor), an exact duplicate
   *  name in the same group is refused without AI, and a reason is required when the advisory match disagrees (AI or
   *  the library saw a field that could fit). A different person approves it on To review (LibraryChange ADD at apply). */
  private async decideNew(actor: Actor, job: { id: string; workspaceId: string }, it: { id: string; proposedKey: string; proposedType: string; candidates: unknown }, b: { label?: string; meaning?: string; valueType?: string; reason?: string }) {
    const label = cleanLabel(b.label ?? "");
    const bad = labelProblem(label); if (bad) fail(bad);
    const meaning = (b.meaning ?? "").trim(); if (meaning.length < 8 || meaning.length > 500) fail("Say what the field means in a sentence (8 to 500 characters).");
    const group = it.proposedKey.split(".")[0];
    const best = ((it.candidates as { key: string; score: number }[]) ?? []).filter((c) => c.score >= 0.55).sort((x, y) => y.score - x.score)[0];
    const reason = (b.reason ?? "").trim();
    if (best && reason.length < 8) fail(`The library already has a field that could fit (${best.key}). Say why this is a different meaning.`);
    // One new name at a time per workspace (break M1: two decisions at the same moment both took the name).
    const u = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`new-field:${job.workspaceId}`}))`;
      const twin = await sameName(tx, job.workspaceId, group, label, it.id);
      if (twin) fail(`"${label}" is already a shared field in this group, or already chosen in an open draft (${twin.label}). Use that field instead.`, HttpStatus.CONFLICT);
      const taken = new Set([...(await tx.canonicalField.findMany({ where: { workspaceId: job.workspaceId }, select: { canonicalFieldKey: true } })).map((x) => x.canonicalFieldKey),
        ...(await tx.proposalItem.findMany({ where: { workspaceId: job.workspaceId, choice: "NEW", decidedKey: { not: null }, id: { not: it.id }, run: { status: { in: ["COMPLETED", "APPLIED"] } } }, select: { decidedKey: true } })).map((x) => x.decidedKey!),
        ...(await tx.proposalItem.findMany({ where: { runId: job.id, decidedKey: { not: null }, id: { not: it.id } }, select: { decidedKey: true } })).map((x) => x.decidedKey!)]);
      const key = await freeKey(tx, job.workspaceId, group, label, taken); // Breaker M1 on B83: never over a withdrawn field's readers
      const raw = await tx.proposalItem.findUniqueOrThrow({ where: { id: it.id } });
      return reviewRow(await recordChoice(tx, it.id, { choice: "NEW", decidedKey: key, by: actor.id, reason: reason || null,
        payload: { ...(raw.payload as any), label, meaning, ...(b.valueType ? { valueType: b.valueType } : {}) }, work: { ...(raw.work as object), advisory: best ? { key: best.key, score: best.score } : null } }));
    });
    const key = u.decidedKey!;
    await this.audit.log(job.workspaceId, actor.id, "decided", "AI proposal", it.proposedKey, `${actor.name} made "${label}" a new shared field (${key})${reason ? `: ${reason}` : ""}`);
    return u;
  }

  /** C3.2 (P-121, P-288 (2)): accepts the High exact reuse matches of one field-map draft together, through the queue's
   *  one door (proposals.ts decide), so each item is checked again by the rule engine, the batch gets one id and one
   *  Undo (POST /review/proposals/undo/:batchId) undoes it all. High = the rules pass and both AI rounds agree (bulkWhy);
   *  an exact reuse match that is not High stays undecided and is listed with its reason. New definitions are never
   *  accepted together: each makes a shared field, so each is decided on its own. */
  async acceptClean(actor: Actor, jobId: string, outcome: "REUSE" | "NEW" = "REUSE") {
    need(actor, "review");
    const job = await this.db.draftingJob.findUnique({ where: { id: jobId }, select: { kind: true, status: true, workspaceId: true } });
    if (!job) fail("This draft does not exist (the demo may have been reset).", HttpStatus.NOT_FOUND);
    // C2.6 (review Major 1 on #574, P-149 one door): a checklist's lines are never accepted together here.
    if (job!.kind === "checklist_draft") fail("A checklist's document lines are decided one by one on the review queue (To review), where accepting one writes it to the draft. Nothing was changed here.", HttpStatus.GONE);
    if (outcome !== "REUSE") fail("Only High exact reuse matches are accepted together (P-121): a new definition makes a shared field, so each is decided on its own. Nothing was accepted.", HttpStatus.CONFLICT);
    if (job!.status === "APPLIED") fail("This draft is already applied to the configuration; change the definitions in the library instead.", HttpStatus.CONFLICT);
    if (job!.status !== "COMPLETED") fail("The draft is not ready yet.", HttpStatus.CONFLICT);
    const rows = await this.db.proposalItem.findMany({ where: { runId: jobId, workspaceId: job!.workspaceId, status: "waiting" }, orderBy: { createdAt: "asc" } });
    const reuse = rows.filter((r) => reviewRow(r).outcome === "REUSE");
    const high = reuse.filter((r) => !bulkWhy(r)).slice(0, BATCH_MAX);
    const left = reuse.filter((r) => !high.includes(r)).map((r) => ({ id: r.id, key: reviewRow(r).proposedKey, why: bulkWhy(r) ?? `At most ${BATCH_MAX} are accepted at once: accept the rest together again.` }));
    if (!high.length) return { accepted: 0, outcome, batchId: null, undoSeconds: UNDO_SECONDS, left };
    const out = await decide(this.db, this.audit, actor, job!.workspaceId, high.map((r) => r.id), { action: "accept", reason: "Accepted with the other High exact reuse matches (P-121)." });
    return { accepted: out.items.length, outcome, batchId: out.batchId, undoSeconds: UNDO_SECONDS, left };
  }

  /** Applies the decided proposals to the combination's draft: the form edition and its box map, new field
   *  definitions, and the form in the combination. Everything lands as DRAFT; release follows review. */
  async apply(actor: Actor, jobId: string, b: { who?: string; title?: string }) {
    need(actor, "author");
    const { proposals, ...rest } = await this.db.draftingJob.findUniqueOrThrow({ where: { id: jobId }, include: { proposals: true } });
    const job = { ...rest, items: proposals.map(reviewRow) };
    const batchOf = new Map(proposals.map((p) => [p.id, p.batchId]));
    if (job.kind !== "field_map") fail("This is not a field-map draft: a checklist draft is applied with its own step.");
    if (job.status !== "COMPLETED") fail(job.status === "APPLIED" ? "Already applied." : "The draft is not ready.", HttpStatus.CONFLICT);
    // Break M1 across drafts: a new field this draft names must not have been created meanwhile by another draft.
    const clash = job.items.filter((i) => i.decision === "NEW" && i.decidedKey);
    const made = clash.length ? await this.db.canonicalField.findMany({ where: { workspaceId: job.workspaceId, canonicalFieldKey: { in: clash.map((i) => i.decidedKey!) } }, select: { canonicalFieldKey: true } }) : [];
    if (made.length) fail(`Decide again: ${made.map((m) => m.canonicalFieldKey).slice(0, 3).join(", ")} ${made.length === 1 ? "was" : "were"} created by another draft meanwhile. Use that field, or name a new one.`, HttpStatus.CONFLICT);
    const at = (job.detail as any)?.library_revision?.sha256;
    const now = await libraryRevision(this.db, job.workspaceId);
    if (at && at !== now.sha256) fail(`Stale: the shared library changed since this draft was compared with it (${(job.detail as any).library_revision.fields} → ${now.fields} definition rows). Compare again with the current library (no AI call); decisions that still hold are kept.`, HttpStatus.CONFLICT);
    const pending = job.items.filter((i) => i.decision === "PENDING");
    if (pending.length) fail(`${pending.length} proposal${pending.length > 1 ? "s are" : " is"} still undecided (for example ${pending[0].proposedKey}).`);
    const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: job.attachmentId! } });
    // An official file, or (P-80) one a second person approved in the product: the edition its approval names.
    const official = manifest().find((i) => i.sha256 === a.sha256), inProduct = official ? null : await this.approvedInProduct(a);
    if (!official && !inProduct?.edition) fail("This file is held until its source is verified, so its draft cannot be applied.", HttpStatus.CONFLICT);
    // QA-207 (#937 review M1): a previous edition is filed under the printed edition its manifest row records.
    const item: { file: string | null; edition: string; applicability: string } = official ? { ...official, edition: official.printed ?? official.edition } : { file: null, edition: inProduct!.edition!, applicability: `approved in the product (IRCC page ${inProduct!.irccPage})` };
    if (!EDITION.test(item.edition)) fail(`${item.edition} is not a printed form number and edition, so its draft cannot be filed under a form.`, HttpStatus.CONFLICT);
    const rec = JSON.parse(readFileSync(join(SOLUTION, job.runFile!), "utf8"));
    const out = checkedOutput(rec);
    const inv = JSON.parse(readFileSync(join(SOLUTION, a.inventoryFile!), "utf8"));
    const box = new Map<string, any>(inv.fields.filter((x: any) => x.data_path).map((x: any) => [x.data_path, x]));
    const decision = new Map(job.items.map((i) => [i.proposedKey, i]));
    const formKey = item.edition.split(" (")[0];
    const ws = job.workspaceId;
    const res = await this.db.$transaction(async (tx) => {
      const def = await tx.govFormDef.upsert({ where: { workspaceId_formKey: { workspaceId: ws, formKey } }, update: {}, create: { workspaceId: ws, formKey, displayName: b.title?.trim() || TITLES[formKey] || formKey, formKind: "data_form" } });
      await forgetDeletion(tx, ws, formKey); // X5 slice c
      // An edition uploaded to the library first (Screen 01, P-25) has no box map yet: the draft fills it in.
      let ed = (await tx.formEdition.findFirst({ where: { workspaceId: ws, sha256: a.sha256 } })) ?? (await tx.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId: ws, editionLabel: item.edition } } }));
      if (ed && (await tx.formFieldMap.count({ where: { formEditionId: ed.id } }))) fail(`${ed.editionLabel} already has a field map in the library.`, HttpStatus.CONFLICT);
      ed = ed ? await tx.formEdition.update({ where: { id: ed.id }, data: { govFormDefId: def.id, officialFile: item.file, inventoryFile: a.inventoryFile, dataBoundBoxes: out.entries.length } })
        : await tx.formEdition.create({ data: { workspaceId: ws, govFormDefId: def.id, editionLabel: item.edition, officialFile: item.file, sha256: a.sha256, inventoryFile: a.inventoryFile, dataBoundBoxes: out.entries.length } });
      let created = 0;
      for (const i of job.items.filter((x) => x.decision !== "RETURNED" && x.decidedKey)) {
        if (await tx.canonicalField.findFirst({ where: { workspaceId: ws, canonicalFieldKey: i.decidedKey! } })) continue;
        const p = (i.payload ?? {}) as { label?: string; reason?: string | null; advisory?: { key: string; score: number } | null };
        // Every new shared field waits for a second person on To review before any release carries it (BR-7, P-53): the
        // one lander writes the draft row and its ADD (S6 slice 1a).
        const top = ((i.candidates as { key: string; score: number }[]) ?? []).slice(0, 3);
        // QA-193 (P-121: the second person at release sees what was bulk-accepted; P-288 (2)): the library change carries the
        // decision it came from (the proposal's batch on To review or the page's accept together), never null, so the
        // approver sees the changes of one decision together and the release names it.
        await landField(tx, { ws, actor, batchId: batchOf.get(i.id) ?? null, itemId: i.id, reason: p.reason ?? i.decisionNote ?? null, matches: top, meaningChecked: i.decision === "NEW", proposedBy: i.decidedBy ?? actor.id, sourceJobId: job.id, combinationId: job.combinationId,
          aiVerdict: i.outcome === "NEW" && !top.some((c) => c.score >= 0.55) ? "No library field means the same." : top[0] ? `Could be ${top[0].key} (match ${Math.round(top[0].score * 100)}%).` : null },
          { key: i.decidedKey!, meaning: i.proposedMeaning, valueType: i.proposedType, label: p.label ?? null, sourceRef: `${job.mode === "REPLAY" ? "replayed " : ""}AI run ${job.runId}; decided by ${i.decidedBy}` });
        created++;
      }
      // C11.9 review round 2 Major 1: checked again under each field's lock, so a retire approved meanwhile refuses the apply.
      const mappedKeys = [...new Set((out.entries as { fact?: string | null }[]).map((e) => { const d = e.fact ? decision.get(e.fact) : undefined; return d?.decision === "RETURNED" ? null : (d?.decidedKey ?? e.fact ?? null); }).filter((k: unknown): k is string => typeof k === "string"))];
      await lockItem(tx, ws, "field", mappedKeys); await refuseRetired(tx, ws, "field", mappedKeys);
      await tx.formFieldMap.createMany({ data: out.entries.map((e: any) => {
        const d = e.fact ? decision.get(e.fact) : undefined;
        const returned = d?.decision === "RETURNED";
        return { workspaceId: ws, formEditionId: ed!.id, dataPath: e.data_path, caption: box.get(e.data_path)?.caption?.slice(0, 500) ?? null, heading: box.get(e.data_path)?.section ?? null,
          outcome: returned ? "unresolved" : e.outcome, person: e.person ?? null, row: e.row ?? null, canonicalFieldKey: returned ? null : (d?.decidedKey ?? e.fact ?? null),
          // A part of a composite library value (address) reads that value through the executor's part transformation.
          transform: !returned && d?.decidedKey && d.decidedKey !== e.fact && (d.evidence as any)?.recommendation?.transform && (d.evidence as any).recommendation.key === d.decidedKey ? (d.evidence as any).recommendation.transform : e.transform ?? null, condition: e.condition ?? null, confidence: e.confidence ?? null,
          // A4: an entry reused from an earlier edition of the form is a code match (no AI saw it), and says where from.
          evidenceQuote: e.reused_from ? `${e.evidence_quote ?? ""} (as released in ${e.reused_from})`.slice(0, 500) : e.evidence_quote ?? null, reason: returned ? `returned by ${d!.decidedBy}: ${d!.decisionNote}` : e.unresolved_reason ?? null, version: 1, status: "DRAFT", origin: e.reused_from ? "CODE_MATCH" : "AI_PROPOSAL", draftingRunId: job.runId, updatedBy: actor.id };
      }) });
      // On the combination already: kept as it is; removed earlier: added back (QA-13).
      await addFormLine(tx, { workspaceId: ws, combinationId: job.combinationId!, govFormDefId: def.id, formKey, who: b.who, origin: "AI_PROPOSAL", by: actor.id, sourceQuote: `${item.edition}: ${item.applicability}` });
      // Claimed inside the transaction: a second apply of the same draft (double click, two people) changes nothing.
      const claimed = await tx.draftingJob.updateMany({ where: { id: jobId, status: "COMPLETED" }, data: { status: "APPLIED", message: `${job.message} Applied to the draft by ${actor.name}.` } });
      if (!claimed.count) fail("Already applied.", HttpStatus.CONFLICT);
      await tx.sourceAttachment.update({ where: { id: a.id }, data: { status: "IN_LIBRARY", statusDetail: `Field map applied to the draft (${out.entries.length} form fields; ${created} new field definitions). Review and release it.` } });
      await slowForTest(a.fileName, "STUDIO_SLOW_APPLY");
      return { formKey, edition: item.edition, boxes: out.entries.length, new_fields: created, returned: job.items.filter((i) => i.decision === "RETURNED").length };
    }, QUEUE_TX)
      // QA-144 part 1: IMM 5257's 84 form fields took longer than Prisma's default 5 s on a busy computer and the person
      // read a 500; the apply gets the queue's room, and past it plain words (nothing applied, the draft stays as it was).
      .catch((e) => { if (/Transaction API error/.test(String((e as Error).message))) fail(`Applying ${item.edition}'s ${job.items.length} reviewed form fields took too long (the computer is busy), so nothing was applied. Apply it again when the computer is less busy.`, HttpStatus.SERVICE_UNAVAILABLE); throw e; });
    await this.audit.log(ws, actor.id, "applied", "AI draft", job.runId, `${actor.name} applied the reviewed AI draft of ${item.edition} to the draft: ${res.boxes} form fields, ${res.new_fields} new fields, ${res.returned} returned`, undefined, job.combinationId ?? undefined);
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
    if (!manifest().some((i) => i.sha256 === a.sha256) && !(await this.approvedInProduct(a))) fail("This file is held until its source is verified. It cannot be reused from the library.", HttpStatus.CONFLICT);
    const ed = await this.db.formEdition.findFirst({ where: { workspaceId: a.workspaceId, sha256: a.sha256, maps: { some: {} } }, include: { form: true } });
    if (!ed) fail("This form's fields are not mapped in the library yet; read it and draft its field map.");
    // A form removed from this combination can be reused again (QA-13): only the line's newest version counts.
    const added = await addFormLine(this.db, { workspaceId: a.workspaceId, combinationId: a.combinationId, govFormDefId: ed!.form.id, formKey: ed!.form.formKey, who: b.who, origin: "HUMAN", by: actor.id, sourceQuote: `${ed!.editionLabel}: reused from the library` });
    if (added === "already") fail(`${ed!.form.formKey} is already part of this combination.`, HttpStatus.CONFLICT);
    const comp = await this.db.combination.findUniqueOrThrow({ where: { id: a.combinationId } });
    await this.audit.log(a.workspaceId, actor.id, "reused", "form", ed!.form.formKey, `${actor.name} added ${ed!.editionLabel} to "${comp.label}" from the library (no AI drafting; its released field map is shared)`, undefined, a.combinationId);
    return { ok: true, form: ed!.form.formKey };
  }

  /** The library's forms for "+ Add" and the Forms page: each form, its editions and whether its boxes are mapped. */
  async libraryForms() {
    const workspaceId = await this.ws.id();
    const forms = await this.db.govFormDef.findMany({ where: { workspaceId }, orderBy: { formKey: "asc" }, include: { editions: { include: { _count: { select: { maps: true } } } }, usedBy: { where: { status: { not: "RETIRED" } }, select: { combinationId: true } } } });
    // P-80: a file a second person approved in the product is a library form too.
    const inProduct = new Set((await this.db.approvedSource.findMany({ where: { workspaceId }, select: { sha256: true } })).map((x) => x.sha256));
    // S4 (M2): a file the form finder downloaded from canada.ca (or a hand upload equal to it) is a library form too.
    const downloaded = (await this.db.officialDownload.findMany({ where: { workspaceId }, select: { sha256: true } })).map((x) => x.sha256);
    const approved = new Set([...manifest().map((i) => i.sha256), ...inProduct, ...downloaded]);
    // Historical workspaces may contain entries created before the source gate. Keep those out of
    // library pickers and usage summaries; a prior database row is not a source-verification decision.
    // W1-02 (P-102): forms come in only as PDFs; an online version (parked with the browser extension) is never listed as an
    // edition. A form the library holds only online (an older database) stays listed, with its uses, so it can get its PDF.
    const visible = forms.map((f) => ({ ...f, onlineOnly: f.editions.length > 0 && f.editions.every((e) => e.channel === "ONLINE"), editions: f.editions.filter((e) => e.channel !== "ONLINE" && approved.has(e.sha256)) })).filter((f) => f.editions.length || f.onlineOnly);
    // "Used by" (P-51): every combination that files the form or has one of its editions attached as a source.
    const shas = visible.flatMap((f) => f.editions.map((e) => e.sha256)).filter(Boolean) as string[];
    const att = await this.db.sourceAttachment.findMany({ where: { workspaceId, sha256: { in: shas } }, select: { sha256: true, combinationId: true } });
    return visible.map((f) => {
      const mine = new Set(f.editions.map((e) => e.sha256));
      const used = new Set([...f.usedBy.map((u) => u.combinationId), ...att.filter((a) => mine.has(a.sha256)).map((a) => a.combinationId)]);
      return { code: f.formKey, title: f.displayName, kind: f.formKind, usedBy: used.size, ...(f.onlineOnly ? { online_only: true } : {}),
        editions: [...f.editions.filter((e) => e.channel !== "ONLINE")].sort((a, b) => compareEditions(b, a)).map((e) => ({ label: e.editionLabel, channel: "PDF", mapped: e._count.maps > 0, boxes: e._count.maps, approved: !!e.officialFile || inProduct.has(e.sha256 ?? ""), approved_in_product: !e.officialFile && inProduct.has(e.sha256 ?? "") })),
        channels: [...new Set(f.editions.map((e) => (e.channel === "ONLINE" ? "Online" : "PDF")))] };
    });
  }

  officialLibrary() { return manifest().map((i) => ({ file: i.file, edition: i.edition, kind: officialKind(i.path), approval: i.approval, combination: i.combination, sha256: i.sha256 })); }
  async attachmentsOf(combinationId: string) { return this.db.sourceAttachment.findMany({ where: { combinationId }, orderBy: { createdAt: "asc" } }); }
  async download(id: string) { const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id } }); return { path: resolve(ROOT, a.storedPath), name: a.fileName }; }
}
export { slug };
