// C11.8 (P-110): the words of a failed field-map run, pure (no database), so a no-server check proves them
// (tests/check_forms_c118_words.ts). Used by api/src/runs.ts.

/** C11.8 AT-3 (P-110): what went wrong, in words: the run's own message unless it is only a count ("0 done, 1 failed …")
 *  or repeats the step, then the failed step's own words with its name; never only "see the details". */
export function errorWhat(runMessage: string | null | undefined, step: { label: string; message?: string | null }): string {
  const own = runMessage && !/^\d+ done, \d+ failed/.test(runMessage) && runMessage !== step.message ? runMessage : null;
  return own ?? (step.message ? `${step.label}: ${step.message}` : `${step.label} did not finish; its step above says why.`);
}

/** The failed step of a field-map run among the latest attempt of each form (steps are one per job, in job order). */
export function latestFailed<S extends { status: string }>(jobs: { attachmentId: string | null; kind: string; attempt: number }[], steps: S[]): S | undefined {
  const latest = new Map<string, number>();
  jobs.forEach((j, i) => { const k = `${j.attachmentId}|${j.kind}`, cur = latest.get(k); if (cur === undefined || j.attempt >= jobs[cur].attempt) latest.set(k, i); });
  const last = new Set(latest.values());
  return steps.filter((s, i) => last.has(i) && ["FAILED", "BLOCKED", "NEEDS_PERSON"].includes(s.status)).at(-1);
}
