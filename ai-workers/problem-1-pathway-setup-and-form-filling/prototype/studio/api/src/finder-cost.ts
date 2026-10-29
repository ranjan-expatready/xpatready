// S3 early look (4): the one "about" a form-finder run shows, the same on the Find forms button, its tip, the find plan
// and the run card. Its own file so the finder (plan), Start setup (the offer) and the run view import one rule.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PROTOTYPE, type Db } from "./core.ts";

const RUNS = join(PROTOTYPE, "p2", "runs");
const round2 = (n: number) => Math.round(n * 100) / 100;

/** What a live finder run usually costs: the mean of the saved live answers (a list round plus its checker round); null
 *  when none is saved yet (then only the worst case is said). */
export function usualLiveUsd(): number | null {
  if (!existsSync(RUNS)) return null;
  const cost = (check: boolean) => readdirSync(RUNS).filter((f) => f.startsWith(check ? "studio-finder-forms-check-" : "studio-finder-forms-") && (check || !f.startsWith("studio-finder-forms-check-")) && /-live-.*\.json$/.test(f))
    .map((f) => { try { return Number(JSON.parse(readFileSync(join(RUNS, f), "utf8"))?.drafting_run?.usage?.cost_usd ?? NaN); } catch { return NaN; } }).filter((n) => Number.isFinite(n) && n > 0);
  const [a, b] = [cost(false), cost(true)];
  return a.length && b.length ? round2(a.reduce((s, n) => s + n, 0) / a.length + b.reduce((s, n) => s + n, 0) / b.length) : null;
}

/** The saved answer's cost for this combination, else the last finished run of the same kind, else (live) the saved live
 *  answers' mean; null when nothing is known (never invented). */
export function aboutUsd(expected: number | null, lastFinished: number | null, live: boolean): number | null {
  return expected ?? lastFinished ?? (live ? usualLiveUsd() : null);
}

/** What the newest finished live run of an operation spent (the run card's "last finished run of the same kind"). */
export async function lastFinishedUsd(db: Db, workspaceId: string, operation: string, mode: string, notId?: string): Promise<number | null> {
  const prev = await db.aiBatch.findFirst({ where: { workspaceId, operation, mode, ...(notId ? { id: { not: notId } } : {}), status: { in: ["COMPLETED", "PARTIAL"] }, finishedAt: { not: null } }, orderBy: { finishedAt: "desc" }, include: { jobs: { select: { costUsd: true } } } });
  return prev ? round2(prev.jobs.reduce((a, j) => a + (j.costUsd ?? 0), 0)) : null;
}
