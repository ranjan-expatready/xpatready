// C11.7 part 2 (P-297 (2), P-295): the paid-runner jobs for the forms whose field map has never been drafted: each form's
// draft round (the job file the six's load writes through api/src/sources.ts ensureJobFile, unchanged) and its blind
// checker round (api/src/field-map-check.ts checkerJob → api/src/rounds.ts roundJob, the same code the app replays by),
// with their usual and worst cost. No model call, US$0.
//   DATABASE_URL=<a copy after Demo › Reset to the six> tsx --tsconfig studio/api/tsconfig.json studio/tools/field-map-new-jobs.ts           plan: the Go table
//   DATABASE_URL=<…the same copy…> tsx --tsconfig studio/api/tsconfig.json studio/tools/field-map-new-jobs.ts --write   also writes the checker job files
// Run Demo › Reset to the six on a copy first: the load writes p2/jobs/studio-fieldmap-<form>.json for every form that
// waits for "Draft with AI"; the forms are the ones that copy's six left waiting (no field-map proposal).
// Worst = what p2/runner.ts reserves (track-a-jobs.ts costsOf: bounded input tokens, the job's output limit, every
// attempt). Usual = this request's bytes at the cost per request byte of the field-map drafts already recorded (an
// estimate, labelled so; never a cap). Smallest worst first: the order to run them.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Job } from "../../p2/prompt.ts";
import { checkerJob } from "../api/src/field-map-check.ts";
import { PROTOTYPE } from "../api/src/core.ts";
import { roundJob } from "../api/src/rounds.ts";
import { costsOf, jobText } from "./track-a-jobs.ts";

const JOBS = join(PROTOTYPE, "p2", "jobs"), RUNS = join(PROTOTYPE, "p2", "runs");
/** A whole-form draft job the load writes (not a part job, not a checker job). */
const DRAFT_JOB = /^studio-fieldmap-(?!check-)[a-z0-9_]+e\.json$/;

/** The forms of the copy's six that wait for "Draft with AI": a form edition on the six with no field-map proposal
 *  (the load replays every saved draft that matches, so what is left has never been drafted), by file name without
 *  ".pdf" ("imm5669e"). Needs DATABASE_URL: a copy after Demo › Reset to the six. */
export async function waitingForms(): Promise<Set<string>> {
  const { Db } = await import("../api/src/core.ts");
  const db = new Db();
  try {
    const rows = await db.$queryRawUnsafe<{ official_file: string }[]>(
      `select e.official_file from form_edition e join gov_form_def g on g.id = e.gov_form_def_id
       where g.form_kind = 'data_form' and e.official_file is not null
         and e.edition_label not in (select distinct form_edition from proposal_item where kind = 'field' and form_edition is not null)`);
    if (!(await db.formEdition.count())) throw new Error("no library forms in this database: run Demo › Reset to the six on the copy first");
    return new Set(rows.map((r) => r.official_file.replace(/\.pdf$/i, "")));
  } finally { await db.$disconnect(); }
}

/** Cost per request byte of the field-map drafts recorded so far (their own usage and request bytes). */
export function costPerByte(runs = RUNS): { usdPerByte: number; from: number } {
  let usd = 0, bytes = 0, from = 0;
  for (const f of existsSync(runs) ? readdirSync(runs) : []) {
    if (!/^studio-fieldmap-[a-z0-9_]+e-live-.*\.json$/.test(f)) continue;
    try {
      const r = JSON.parse(readFileSync(join(runs, f), "utf8"));
      const c = Number(r.drafting_run?.usage?.cost_usd), b = Number(r.launch_evidence?.request_bytes);
      if (r.contract_valid === true && c > 0 && b > 0) { usd += c; bytes += b; from++; }
    } catch { /* an unreadable record is not evidence */ }
  }
  return { usdPerByte: bytes ? usd / bytes : 0, from };
}

/** The never-drafted forms' draft and checker jobs, with their costs, smallest worst first. */
export function newJobs(forms: Set<string>, jobs = JOBS, runs = RUNS): NewJob[] {
  const rate = costPerByte(runs).usdPerByte;
  const out: NewJob[] = [];
  for (const f of readdirSync(jobs).filter((x) => DRAFT_JOB.test(x)).sort()) {
    const draft = JSON.parse(readFileSync(join(jobs, f), "utf8")) as Job & { known?: { form_edition?: string } };
    const form = (draft.inputs?.[0]?.file ?? "").split("/").pop()!.replace(/\.inventory\.json$/, "");
    if (!forms.has(form)) continue;
    const edition = draft.known?.form_edition;
    const c = edition ? checkerJob({ drafting_run: { inputs: { official_files: draft.inputs }, settings: draft.settings as { max_output_tokens?: number; timeout_ms?: number } } }, edition) : null;
    if (!edition || !c) throw new Error(`${f}: no printed edition or no inputs, so its checker round cannot be made`);
    for (const [round, job] of [["draft", draft], ["checker", roundJob(c.step, true, c.ctx) as Job]] as const) {
      const k = costsOf(job);
      out.push({ edition, round, job, request_bytes: k.request_bytes, usual_usd: rate ? k.request_bytes * rate : k.usual_usd, worst_usd: k.worst_usd, budget_usd: k.budget_usd, fits_budget: k.fits_budget, under_run_cap: k.under_run_cap });
    }
  }
  return out.sort((a, b) => a.worst_usd - b.worst_usd || a.edition.localeCompare(b.edition) || a.round.localeCompare(b.round));
}

const usd = (n: number) => `US$${n.toFixed(2)}`;

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const forms = await waitingForms();
  const plans = newJobs(forms);
  const missing = [...forms].filter((f) => !plans.some((p) => p.job.inputs[0]?.file.endsWith(`/${f}.inventory.json`)));
  if (missing.length) throw new Error(`no draft job file for ${missing.join(", ")}: run Demo › Reset to the six on this copy (it writes them)`);
  if (process.argv.includes("--write")) for (const p of plans.filter((x) => x.round === "checker")) { writeFileSync(join(JOBS, `${p.job.job_id}.json`), jobText(p.job)); console.log(`wrote p2/jobs/${p.job.job_id}.json  (${p.edition})`); }
  const { from } = costPerByte();
  console.log(`Usual: an estimate at the cost per request byte of ${from} recorded field-map drafts; worst: what the runner reserves (every attempt).`);
  console.log("| # | Form edition | Round | Job | Request | Usual (est.) | Worst | Fits the job budget |");
  console.log("|---|---|---|---|---|---|---|---|");
  plans.forEach((p, i) => console.log(`| ${i + 1} | ${p.edition} | ${p.round} | \`${p.job.job_id}\` | ${Math.round(p.request_bytes / 1024)} KB | ${usd(p.usual_usd)} | ${usd(p.worst_usd)} | ${p.fits_budget ? "yes" : `no (budget ${usd(p.budget_usd)})`} |`));
  let u = 0, w = 0; for (const p of plans) { u += p.usual_usd; w += p.worst_usd; }
  console.log(`| | **${plans.length} jobs** | | | | **${usd(u)}** | **${usd(w)}** | |`);
}
