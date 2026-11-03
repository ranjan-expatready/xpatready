// C9.1 PR 2 (P-227, P-275): the launcher job files of the one paid run of "Draft with AI" on a held new edition, for the
// Mac paid runner: IMM 5476 (11-2025) held over the 2021 edition (DEMO.md row 17). Made by the app's own code
// (api/src/impact-ai.ts: compareBoxes → the changed boxes, impactPart → the part the guard admits, impactStep →
// rounds.ts roundJob), so a result recorded through p2/launch.ts is exactly the saved run the app replays for this
// comparison. No database, no model call, US$0. The part file is regenerated (p2/parts is never committed): --write
// writes it with the jobs, byte for byte, and the job pins its checksum.
//   tsx --tsconfig studio/api/tsconfig.json studio/tools/c91-impact-job.ts            plan: changed boxes, jobs, usual and worst cost
//   tsx --tsconfig studio/api/tsconfig.json studio/tools/c91-impact-job.ts --write    also writes p2/parts/<part> and p2/jobs/<job>.json (both rounds)
// Then, on the Mac paid runner only, with the tech lead's Go: p2/launch.ts --job <draft job> --stub, then --live; the same for
// the checker job. Usual = one attempt per round at half the output limit, input tokens per byte as measured on 30 Oct (an
// estimate, labelled so); worst = what the launcher reserves (both attempts at the output limit, the job's budget).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { costUsd } from "../../p2/ledger.ts";
import { RUN_CAP_USD } from "../../p2/policy.ts";
import type { Job } from "../../p2/prompt.ts";
import { PROTOTYPE } from "../api/src/core.ts";
import { changedBoxes, compareBoxes, impactContext, impactPart, impactStep, inventoryFields, writePart } from "../api/src/impact-ai.ts";
import { roundJob } from "../api/src/rounds.ts";
import { costsOf, measuredTokensPerByte } from "./track-a-jobs.ts";

/** The comparison of DEMO.md row 17: the held edition and the library edition, by their committed inventories. */
export const C91 = { printed: "IMM 5476 (11-2025)", held: "prototype/p1/inventory/imm5476e.inventory.json", library: "prototype/p1/inventory/imm5476e-2021.inventory.json", batch: "c91-paid" };

/** Both rounds' jobs, exactly as the app's live click would write them (its batch word aside, which only names the job). */
export function c91Jobs() {
  const rows = compareBoxes(inventoryFields(C91.held), inventoryFields(C91.library), new Map());
  const changed = changedBoxes(rows);
  const part = impactPart(C91.held, changed);
  const step = impactStep(C91.printed, changed);
  const ctx = impactContext(C91.printed, part, C91.batch);
  return { changed, rows, part, step, jobs: [false, true].map((isCheck) => ({ label: isCheck ? "checker round (blind)" : "draft round", job: roundJob(step, isCheck, ctx) as Job })) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { changed, rows, part, jobs } = c91Jobs();
  const write = process.argv.includes("--write");
  if (write) writePart(part);
  console.log(`C9.1 ${C91.printed} over the 2021 edition: ${changed.length} new and reworded boxes (${rows.filter((r) => r.change === "new").length} new, ${rows.filter((r) => r.change === "reworded").length} reworded) of ${rows.filter((r) => r.change !== "removed").length}; part ${part.rel} (${part.text.length} bytes, sha256 ${part.sha256.slice(0, 12)})`);
  let worst = 0, usual = 0;
  for (const { label, job } of jobs) {
    const file = join(PROTOTYPE, "p2", "jobs", `${job.job_id}.json`);
    if (write) { writeFileSync(file, JSON.stringify(job, null, 1) + "\n"); console.log(`wrote p2/jobs/${job.job_id}.json  (${label})`); }
    let c: ReturnType<typeof costsOf>;
    try { c = costsOf(job); } catch (e) { console.log(`  ${label}: ${job.job_id}  not admitted: ${String((e as Error).message).slice(0, 200)} (run with --write first)`); continue; }
    const u = costUsd(String(job.settings.model), Math.round(c.request_bytes * measuredTokensPerByte()), Math.round(Number(job.settings.max_output_tokens) / 2));
    worst += c.worst_usd; usual += u;
    console.log(`  ${label}: ${job.job_id}  worst US$${c.worst_usd.toFixed(2)} (${job.settings.max_attempts} × US$${c.per_attempt_worst_usd.toFixed(2)}; request ${c.request_bytes} bytes, output ≤ ${job.settings.max_output_tokens})  usual ~US$${u.toFixed(2)}  budget US$${c.budget_usd.toFixed(2)}${c.fits_budget ? "" : "  ← ABOVE ITS BUDGET"}`);
    if (write && readFileSync(file, "utf8") !== JSON.stringify(job, null, 1) + "\n") throw new Error(`${file} did not write as derived`);
  }
  console.log(`  total: worst US$${worst.toFixed(2)}, usual ~US$${usual.toFixed(2)} (run cap US$${RUN_CAP_USD.toFixed(2)} per round)`);
}
