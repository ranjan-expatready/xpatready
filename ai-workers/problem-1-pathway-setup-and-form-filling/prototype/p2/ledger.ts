// Aggregate spend ledger for the P2 experiment. Every attempt (first try or retry) reserves its worst-case
// cost BEFORE the call; the reservation counts at worst case until settled with the provider's reported
// usage. A crash or an error without usage leaves the worst case counted. Append-only JSON lines.
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { EXPERIMENT_CAP_USD, OVERRIDE_TTL_MS, PRICE_PER_MTOK, WAVE1_CAP_USD, WAVE1_START } from "./policy.ts";

export class BudgetExceeded extends Error {}
/** P-179: an override that cannot be recorded or used (why: "unknown", "other_run", "used", "expired", "ceiling", "person", "limits"). */
export class OverrideRefused extends Error {
  readonly why: string;
  constructor(why: string, message: string) { super(message); this.why = why; } // no parameter property: the drafting process runs this file with Node's type stripping
}

/** P-179: the limits a person may Continue past. "attempts" is the API's (paid attempts per form); the ledger checks the others. */
export const OVERRIDE_LIMITS = ["run", "attempts", "experiment", "wave"] as const;
export type OverrideLimit = (typeof OVERRIDE_LIMITS)[number];

/** Tokens the request can bill at most: one token per UTF-8 byte of the serialized request (a text token
 *  always spans at least one byte) plus a fixed margin for message framing. Text-only requests. */
export const inputTokenBound = (serializedRequest: string) => Buffer.byteLength(serializedRequest, "utf8") + 2_000;

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICE_PER_MTOK[model];
  if (!p) throw new BudgetExceeded(`no price recorded for ${model}`);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

type Entry =
  | { type: "reserve"; id: string; run_id: string; attempt: number; worst_usd: number; caller?: string; override_id?: string; at: string }
  | { type: "settle"; id: string; actual_usd: number; outcome: string; at: string }
  // P-179: a person's Continue past named limits for one run's worst case, and its one use to start that run.
  | { type: "override"; id: string; run_key: string; limits: OverrideLimit[]; worst_usd: number; by: string; at: string; expires_at: string; reason?: string }
  | { type: "override_use"; id: string; run_key: string; at: string };

export class SpendLedger {
  readonly file: string;
  readonly capUsd: number;
  private lockFile: string;
  private reserveLockFile: string;
  constructor(dir: string, capUsd: number = EXPERIMENT_CAP_USD) {
    this.capUsd = capUsd;
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, "spend.jsonl");
    this.lockFile = join(dir, "spend.lock");
    this.reserveLockFile = join(dir, "spend.reserve.lock");
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

  /** P-179: the most a click may take total spend to: the cap + 10% (US$132 for the US$120 experiment cap). */
  get ceilingUsd(): number { return Math.round(this.capUsd * 1.1 * 100) / 100; }

  /** P-179: records a person's Continue past `limits` for one run (run_key), for that run's worst case only. Refused when
   *  it would take spend past the ceiling (nothing is written), for no person or the system, or for no limit. */
  recordOverride(o: { run_key: string; limits: OverrideLimit[]; worst_usd: number; by: string; reason?: string }): { id: string; expires_at: string } {
    if (!o.by || o.by === "system") throw new OverrideRefused("person", "only a person may continue past a cost limit");
    if (!o.run_key) throw new OverrideRefused("other_run", "an override names the run it is for");
    if (!o.limits.length || !o.limits.every((l) => (OVERRIDE_LIMITS as readonly string[]).includes(l)) || new Set(o.limits).size !== o.limits.length) throw new OverrideRefused("limits", `an override names one or more of the limits ${OVERRIDE_LIMITS.join(", ")}`);
    if (!Number.isFinite(o.worst_usd) || o.worst_usd < 0) throw new OverrideRefused("limits", `worst case must be a number of US$ at or above 0 (got ${o.worst_usd})`);
    return this.atomically(() => {
      const total = this.committed();
      if (total + o.worst_usd > this.ceilingUsd) throw new OverrideRefused("ceiling", `ceiling US$${this.ceilingUsd}: committed ${total.toFixed(4)} + worst case ${o.worst_usd.toFixed(4)}; the founder must raise the cap`);
      const at = new Date(), id = `override-${at.getTime()}-${randomBytes(4).toString("hex")}`, expires_at = new Date(at.getTime() + OVERRIDE_TTL_MS).toISOString();
      this.append({ type: "override", id, run_key: o.run_key, limits: o.limits, worst_usd: o.worst_usd, by: o.by, at: at.toISOString(), expires_at, ...(o.reason ? { reason: o.reason } : {}) });
      return { id, expires_at };
    });
  }

  /** P-179: an override starts its own run once, within its time. Records the use; refuses an unknown, another run's, a used
   *  or an expired one. */
  useOverride(id: string, runKey: string): Extract<Entry, { type: "override" }> {
    return this.atomically(() => {
      const es = this.entries();
      const o = es.find((e): e is Extract<Entry, { type: "override" }> => e.type === "override" && e.id === id);
      if (!o) throw new OverrideRefused("unknown", "no such override");
      if (o.run_key !== runKey) throw new OverrideRefused("other_run", "this override is for another run");
      if (es.some((e) => e.type === "override_use" && e.id === id)) throw new OverrideRefused("used", "this override was already used; one click covers one run");
      if (Date.now() > Date.parse(o.expires_at)) throw new OverrideRefused("expired", `this override expired at ${o.expires_at}; look at the cost again`);
      this.append({ type: "override_use", id, run_key: runKey, at: new Date().toISOString() });
      return o;
    });
  }

  /** Reserves an attempt's worst case, or refuses when it would pass the run cap, the experiment cap or the Wave 1 cap. P-179:
   *  a limit is passed only with an override a person recorded and used for this run (runKey) that names that limit, while
   *  this run's reservations stay within the override's worst case and total spend within the ceiling. */
  reserve(runId: string, attempt: number, worstUsd: number, runCapUsd: number, caller?: string, opts: { overrideId?: string; runKey?: string } = {}): string {
    // S4 break minor: a worst case that is not a number, or below zero, would let any call through the caps.
    if (!Number.isFinite(worstUsd) || worstUsd < 0) throw new BudgetExceeded(`worst case must be a number of US$ at or above 0 (got ${worstUsd})`);
    // QA-90: every copy shares one ledger, so two processes may reserve at the same moment; the read of what is committed
    // and the append are one step under a short lock, so the caps count both.
    return this.atomically(() => this.reserveNow(runId, attempt, worstUsd, runCapUsd, caller, opts));
  }

  private reserveNow(runId: string, attempt: number, worstUsd: number, runCapUsd: number, caller: string | undefined, opts: { overrideId?: string; runKey?: string }): string {
    const total = this.committed(), run = this.committed(runId), wave = this.committedSince(WAVE1_START);
    const passed: [OverrideLimit, string][] = [];
    if (total + worstUsd > this.capUsd) passed.push(["experiment", `experiment cap US$${this.capUsd}: committed ${total.toFixed(4)} + worst case ${worstUsd.toFixed(4)}`]);
    if (run + worstUsd > runCapUsd) passed.push(["run", `run cap US$${runCapUsd}: committed ${run.toFixed(4)} + worst case ${worstUsd.toFixed(4)}`]);
    if (wave + worstUsd > WAVE1_CAP_USD) passed.push(["wave", `Wave 1 cap US$${WAVE1_CAP_USD}: committed ${wave.toFixed(4)} since ${WAVE1_START.slice(0, 10)} + worst case ${worstUsd.toFixed(4)}`]);
    if (passed.length) {
      if (!opts.overrideId) throw new BudgetExceeded(passed[0][1]);
      const why = this.overrideRefusal(opts.overrideId, opts.runKey, passed.map(([l]) => l), worstUsd, total);
      if (why) throw new BudgetExceeded(`${passed[0][1]}; the override does not admit it: ${why}`);
    }
    const id = `${runId}#${attempt}#${Date.now()}`;
    this.append({ type: "reserve", id, run_id: runId, attempt, worst_usd: worstUsd, ...(caller ? { caller } : {}), ...(opts.overrideId ? { override_id: opts.overrideId } : {}), at: new Date().toISOString() });
    return id;
  }

  /** Why an override cannot pass these limits for this reservation, or null when it can. */
  private overrideRefusal(overrideId: string, runKey: string | undefined, limits: OverrideLimit[], worstUsd: number, total: number): string | null {
    const es = this.entries();
    const o = es.find((e): e is Extract<Entry, { type: "override" }> => e.type === "override" && e.id === overrideId);
    if (!o) return "no such override";
    if (!runKey || o.run_key !== runKey) return "it is for another run";
    if (!es.some((e) => e.type === "override_use" && e.id === overrideId)) return "it was not used to start this run";
    const missing = limits.filter((l) => !o.limits.includes(l));
    if (missing.length) return `it does not name the ${missing.join(" and ")} limit`;
    const used = es.filter((e): e is Extract<Entry, { type: "reserve" }> => e.type === "reserve" && e.override_id === overrideId).reduce((a, r) => a + r.worst_usd, 0);
    if (used + worstUsd > o.worst_usd + 1e-9) return `this run would reserve US$${(used + worstUsd).toFixed(4)}, above the US$${o.worst_usd.toFixed(4)} worst case the person accepted`;
    if (total + worstUsd > this.ceilingUsd) return `past the US$${this.ceilingUsd} ceiling; the founder must raise the cap`;
    return null;
  }

  /** QA-90: a short exclusive section (milliseconds) around a read-then-append. Waits up to 10 s for another process; a
   *  lock older than 30 s is left over from a crash and is removed. */
  private atomically<T>(fn: () => T): T {
    const until = Date.now() + 10_000;
    for (;;) {
      try { closeSync(openSync(this.reserveLockFile, "wx")); break; } catch {
        try { if (Date.now() - statSync(this.reserveLockFile).mtimeMs > 30_000) { unlinkSync(this.reserveLockFile); continue; } } catch { continue; }
        if (Date.now() > until) throw new BudgetExceeded(`ledger busy: another process held ${this.reserveLockFile} for 10 s`);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
      }
    }
    try { return fn(); } finally { try { unlinkSync(this.reserveLockFile); } catch { /* already gone */ } }
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
