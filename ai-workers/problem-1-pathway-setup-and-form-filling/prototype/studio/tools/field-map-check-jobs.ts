// G-CORE B4 (P-121; QA-176 Part B): the launcher job files of the field-map checker rounds the Mac paid runner records,
// one per form edition the six replay a field-map draft for, made by the app's own code (api/src/field-map-check.ts
// checkerJob → api/src/rounds.ts roundJob), so a run recorded through p2/launch.ts is exactly the checker round the
// form's draft then replays. No model call, US$0.
//   DATABASE_URL=<an isolated copy after Demo › Reset to the six> tsx --tsconfig studio/api/tsconfig.json studio/tools/field-map-check-jobs.ts           plan: the Go table
//   DATABASE_URL=<…the same copy…> tsx --tsconfig studio/api/tsconfig.json studio/tools/field-map-check-jobs.ts --write   writes the job files to p2/jobs
// Usual = the form's own draft run as recorded (the checker reads the same inventory and drafts the whole map again; an
// estimate, labelled so); worst = what p2/runner.ts reserves for the job (track-a-jobs.ts costsOf: the finished
// request's bounded input tokens, the job's output limit, both attempts). Smallest worst first, the order to run them.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Job } from "../../p2/prompt.ts";
import { checkerJob } from "../api/src/field-map-check.ts";
import { PROTOTYPE, SOLUTION } from "../api/src/core.ts";
import { roundJob } from "../api/src/rounds.ts";
import { costsOf, jobText } from "./track-a-jobs.ts";

const JOBS = join(PROTOTYPE, "p2", "jobs");
export type CheckerPlan = { edition: string; draftRun: string; items: number; job: Job; usual_usd: number; worst_usd: number; budget_usd: number; fits_budget: boolean };

/** The checker jobs for every field-map draft the copy's six replay, with their costs, smallest worst first. */
export async function checkerPlans(): Promise<CheckerPlan[]> {
  const { Db } = await import("../api/src/core.ts");
  const db = new Db();
  try {
    const rows = await db.$queryRawUnsafe<{ edition: string; run_file: string; items: bigint }[]>(
      `select p.form_edition as edition, j.run_file, count(distinct p.identity_key) as items from drafting_job j join proposal_item p on p.run_id = j.id
       where j.kind = 'field_map' and p.kind = 'field' and j.run_file is not null group by p.form_edition, j.run_file order by 1`);
    if (!rows.length) throw new Error("no field-map drafts in this database: run Demo › Reset to the six on the copy first");
    const out: CheckerPlan[] = [];
    for (const r of rows) {
      const draft = JSON.parse(readFileSync(join(SOLUTION, r.run_file), "utf8"));
      const j = checkerJob(draft, r.edition);
      if (!j) throw new Error(`${r.edition}: its edition or inputs are not known, so no checker job can be made`);
      const job = roundJob(j.step, true, j.ctx) as Job;
      const c = costsOf(job);
      out.push({ edition: r.edition, draftRun: r.run_file.split("/").pop()!, items: Number(r.items), job, usual_usd: Number(draft.drafting_run?.usage?.cost_usd ?? c.usual_usd), worst_usd: c.worst_usd, budget_usd: c.budget_usd, fits_budget: c.fits_budget });
    }
    return out.sort((a, b) => a.worst_usd - b.worst_usd || a.edition.localeCompare(b.edition));
  } finally { await db.$disconnect(); }
}

const usd = (n: number) => `US$${n.toFixed(2)}`;

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const plans = await checkerPlans();
  if (process.argv.includes("--write")) for (const p of plans) { writeFileSync(join(JOBS, `${p.job.job_id}.json`), jobText(p.job)); console.log(`wrote p2/jobs/${p.job.job_id}.json  (${p.edition})`); }
  console.log("| # | Form edition | Items | Checker job | Usual (est.) | Worst | Fits the job budget |");
  console.log("|---|---|---|---|---|---|---|");
  plans.forEach((p, i) => console.log(`| ${i + 1} | ${p.edition} | ${p.items} | \`${p.job.job_id}\` | ${usd(p.usual_usd)} | ${usd(p.worst_usd)} | ${p.fits_budget ? "yes" : `no (budget ${usd(p.budget_usd)})`} |`));
  let u = 0, w = 0; for (const p of plans) { u += p.usual_usd; w += p.worst_usd; }
  console.log(`| | **All ${plans.length}** | ${plans.reduce((n, p) => n + p.items, 0)} | | **${usd(u)}** | **${usd(w)}** | |`);
}
