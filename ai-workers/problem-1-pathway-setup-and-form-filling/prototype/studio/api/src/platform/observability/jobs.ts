// PF-23 (NFR5-14; SA-11-37: "mail, letter and payment-notice jobs never log subjects, bodies or file names"): a job
// handler wrapped so each run writes one job line (queue, job id, outcome, duration, how long it waited; also its
// metrics) and a failure writes the error's class, code and frames, never the payload or the message. PF-14's worker
// wraps every handler with it; until PF-14 is on main, PF-0p's fake JobPort can run wrapped handlers too.
import { jobLine } from "./metrics.ts";
import { log } from "./log.ts";
import { redactText } from "./redact.ts";

export type JobRun = { id: string; createdAt?: Date | null; data?: unknown };

const idOf = (s: string) => (/^[A-Za-z0-9_.:-]{1,120}$/.test(s) ? redactText(s) : "[not an id]");

export function observeJob<J extends JobRun, R>(queue: string, handler: (job: J) => Promise<R>, now: () => number = Date.now): (job: J) => Promise<R> {
  const q = idOf(queue);
  return async (job: J) => {
    const t0 = now(), ageMs = job.createdAt ? t0 - job.createdAt.getTime() : null;
    try {
      const r = await handler(job);
      jobLine({ queue: q, jobId: idOf(job.id), ok: true, durationMs: now() - t0, ageMs });
      return r;
    } catch (e) {
      jobLine({ queue: q, jobId: idOf(job.id), ok: false, durationMs: now() - t0, ageMs });
      log().write("error", "job_error", { queue: q, jobId: idOf(job.id), error: e });
      throw e;
    }
  };
}
