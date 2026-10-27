// Aggregate spend ledger for the P2 experiment. Every attempt (first try or retry) reserves its worst-case
// cost BEFORE the call; the reservation counts at worst case until settled with the provider's reported
// usage. A crash or an error without usage leaves the worst case counted. Append-only JSON lines.
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { join } from "node:path";
import { EXPERIMENT_CAP_USD, PRICE_PER_MTOK, WAVE1_CAP_USD, WAVE1_START } from "./policy.ts";

export class BudgetExceeded extends Error {}

/** Tokens the request can bill at most: one token per UTF-8 byte of the serialized request (a text token
 *  always spans at least one byte) plus a fixed margin for message framing. Text-only requests. */
export const inputTokenBound = (serializedRequest: string) => Buffer.byteLength(serializedRequest, "utf8") + 2_000;

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICE_PER_MTOK[model];
  if (!p) throw new BudgetExceeded(`no price recorded for ${model}`);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

type Entry =
  | { type: "reserve"; id: string; run_id: string; attempt: number; worst_usd: number; caller?: string; at: string }
  | { type: "settle"; id: string; actual_usd: number; outcome: string; at: string };

export class SpendLedger {
  readonly file: string;
  readonly capUsd: number;
  private lockFile: string;
  constructor(dir: string, capUsd: number = EXPERIMENT_CAP_USD) {
    this.capUsd = capUsd;
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, "spend.jsonl");
    this.lockFile = join(dir, "spend.lock");
  }

  private entries(): Entry[] {
    return existsSync(this.file) ? readFileSync(this.file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  }

  /** Appends one line before the call it covers. Node's permission model disables fsync (found when the
   *  isolated path was first executed, P1 revision 4), so inside the drafting process the line is handed to
   *  the operating system without fsync: it survives a crash of the drafting process, not a power loss or an
   *  operating-system crash. Outside the permission model it is fsynced as before. */
  private append(e: Entry) {
    const fd = openSync(this.file, "a");
    try {
      writeSync(fd, JSON.stringify(e) + "\n");
      if (!(process as unknown as { permission?: unknown }).permission) fsyncSync(fd);
    } finally { closeSync(fd); }
  }

  /** S4 (m4): US$ counted against the Wave 1 cap: attempts reserved since the wave started, as committed() counts them. */
  committedSince(sinceIso: string): number {
    const es = this.entries();
    const settled = new Map(es.filter((e) => e.type === "settle").map((e) => [e.id, (e as { actual_usd: number }).actual_usd]));
    return es.filter((e): e is Extract<Entry, { type: "reserve" }> => e.type === "reserve" && e.at >= sinceIso).reduce((sum, r) => sum + (settled.get(r.id) ?? r.worst_usd), 0);
  }

  /** US$ counted against the caps: settled attempts at their actual cost, unsettled ones at worst case. */
  committed(runId?: string): number {
    const es = this.entries();
    const settled = new Map(es.filter((e) => e.type === "settle").map((e) => [e.id, (e as { actual_usd: number }).actual_usd]));
    return es.filter((e): e is Extract<Entry, { type: "reserve" }> => e.type === "reserve" && (runId === undefined || e.run_id === runId))
      .reduce((sum, r) => sum + (settled.get(r.id) ?? r.worst_usd), 0);
  }

  /** Reserves an attempt's worst case, or refuses when it would pass the run cap or the experiment cap. */
  reserve(runId: string, attempt: number, worstUsd: number, runCapUsd: number, caller?: string): string {
    const total = this.committed(), run = this.committed(runId);
    if (total + worstUsd > this.capUsd) throw new BudgetExceeded(`experiment cap US$${this.capUsd}: committed ${total.toFixed(4)} + worst case ${worstUsd.toFixed(4)}`);
    if (run + worstUsd > runCapUsd) throw new BudgetExceeded(`run cap US$${runCapUsd}: committed ${run.toFixed(4)} + worst case ${worstUsd.toFixed(4)}`);
    const wave = this.committedSince(WAVE1_START);
    if (wave + worstUsd > WAVE1_CAP_USD) throw new BudgetExceeded(`Wave 1 cap US$${WAVE1_CAP_USD}: committed ${wave.toFixed(4)} since ${WAVE1_START.slice(0, 10)} + worst case ${worstUsd.toFixed(4)}`);
    const id = `${runId}#${attempt}#${Date.now()}`;
    this.append({ type: "reserve", id, run_id: runId, attempt, worst_usd: worstUsd, ...(caller ? { caller } : {}), at: new Date().toISOString() });
    return id;
  }

  settle(id: string, actualUsd: number, outcome: string) {
    this.append({ type: "settle", id, actual_usd: actualUsd, outcome, at: new Date().toISOString() });
  }

  /** One runner at a time: a second process is refused while the lock file exists. */
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    let fd: number;
    try { fd = openSync(this.lockFile, "wx"); } catch { throw new BudgetExceeded(`ledger locked by another runner (${this.lockFile})`); }
    closeSync(fd);
    try { return await fn(); } finally { unlinkSync(this.lockFile); }
  }
}
