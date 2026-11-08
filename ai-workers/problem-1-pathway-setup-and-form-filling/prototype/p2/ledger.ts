// Aggregate spend ledger for the P2 experiment. Every attempt (first try or retry) reserves its worst-case
// cost BEFORE the call; the reservation counts at worst case until settled with the provider's reported
// usage. A crash or an error without usage leaves the worst case counted. Append-only JSON lines.
import { closeSync, existsSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { hostname } from "node:os";
import { join } from "node:path";
import { EXPERIMENT_CAP_USD, MAX_ATTEMPTS, MODELS, OVERRIDE_TTL_MS, PRICE_PER_MTOK, WAVE1_CAP_USD, WAVE1_START } from "./policy.ts";

export class BudgetExceeded extends Error {}
/** Break n1 (N6): the short ledger lock is held by another process past the wait; a moment later it is free again. */
export class LedgerBusy extends BudgetExceeded {}
/** P-179: an override that cannot be recorded or used (why: "unknown", "other_run", "used", "expired", "ceiling", "held", "person", "limits"). */
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

/** A run card (P-110, P-295): the usual and the worst cost of one kind of paid run, stated before it starts and before
 *  the founder's Go. Token counts are the card's estimate until a finished run measures them; the price is this ledger's
 *  own (costUsd). Worst = every attempt the policy allows (MAX_ATTEMPTS) at the worst token counts; rounded up to cents. */
export type RunCard = { kind: string; model: string; attempts: number; usual: { input: number; output: number }; worst: { input: number; output: number }; basis: string };
export function runCardUsd(card: RunCard, units = 1): { usual_usd: number; worst_usd: number } {
  const up = (n: number) => Math.ceil(n * 100 - 1e-9) / 100;
  return { usual_usd: up(units * costUsd(card.model, card.usual.input, card.usual.output)), worst_usd: up(units * card.attempts * costUsd(card.model, card.worst.input, card.worst.output)) };
}
/** C6.5 part 3 (FQ-10): one letter of invitation read by AI vision (studio api/src/case-documents.ts). Not measured yet. */
export const LETTER_READ_CARD: RunCard = {
  kind: "document_read_letter", model: MODELS[0], attempts: MAX_ATTEMPTS,
  usual: { input: 3_400, output: 500 },
  worst: { input: 5 * 2_500 + 2_000, output: 2_000 },
  basis: "Estimate, not measured: usual = a one-page letter (about 1,600 image and 300 text tokens, 1,500 of instructions and the fact list) answered in about 500 tokens; worst = five pages (the reader's page cap) at 2,500 tokens each plus 2,000 of instructions, answered in up to 2,000 tokens, on every allowed attempt.",
};

type Entry =
  | { type: "reserve"; id: string; run_id: string; attempt: number; worst_usd: number; caller?: string; override_id?: string; at: string }
  | { type: "settle"; id: string; actual_usd: number; outcome: string; at: string }
  // P-179: a person's Continue past named limits for one run's worst case, and its one use to start that run.
  | { type: "override"; id: string; run_key: string; limits: OverrideLimit[]; worst_usd: number; by: string; at: string; expires_at: string; reason?: string }
  | { type: "override_use"; id: string; run_key: string; at: string };

const HOST = hostname();
/** Break N1 (N6): what a holder writes into a lock: this computer, its process id, and a random part of its own. */
const lockToken = () => `${HOST}:${process.pid}:${randomBytes(6).toString("hex")}`;
/** True when the lock names a process on this computer that has exited (a crash, SIGTERM, a kill). A lock from another
 *  computer, or in an older form, is never judged by its process. */
function holderGone(text: string): boolean {
  const m = /^(.+):(\d+):[0-9a-f]+$/.exec(text);
  if (!m || m[1] !== HOST || Number(m[2]) === process.pid) return false;
  try { process.kill(Number(m[2]), 0); return false; } catch (e) { return (e as { code?: string }).code === "ESRCH"; }
}
const isAmount = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isTime = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));
const isText = (v: unknown) => typeof v === "string" && v.length > 0;

export class SpendLedger {
  readonly file: string;
  readonly capUsd: number;
  private lockFile: string;
  private reserveLockFile: string;
  private waitMs: number;
  /** `waitMs`: how long a read-then-write waits for another process's short lock (break n1: the API waits 2 s, not 10 s,
   *  because the wait holds its one thread). */
  constructor(dir: string, capUsd: number = EXPERIMENT_CAP_USD, opts: { waitMs?: number } = {}) {
    this.capUsd = capUsd;
    this.waitMs = opts.waitMs ?? 10_000;
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, "spend.jsonl");
    this.lockFile = join(dir, "spend.lock");
    this.reserveLockFile = join(dir, "spend.reserve.lock");
  }

  private entries(): Entry[] {
    if (!existsSync(this.file)) return [];
    // P-179 break m6: a line that is not JSON stops every start in words (it stopped them before too, as a bare SyntaxError).
    const es: Entry[] = readFileSync(this.file, "utf8").split("\n").filter(Boolean).map((l, i) => {
      try { return JSON.parse(l); } catch { throw new BudgetExceeded(`the shared ledger ${this.file} has a line (${i + 1}) that is not a ledger entry; no AI start is counted until it is fixed`); }
    });
    // P-179 break M1, N6 (break n4, review n3): every line the caps and the Continues read is checked, so one line that is
    // not well formed (no amount, text, below 0, no time, an unknown limit) stops every start in words instead of
    // switching a cap off, lowering what is held, never expiring, or failing as a TypeError.
    for (const e of es) {
      const x = e as Record<string, unknown>, bad = (what: string) => { throw new BudgetExceeded(`the shared ledger ${this.file} has a ${String(x.type)} line (${typeof x.id === "string" ? x.id : "no id"}) whose ${what}; no AI start is counted until it is fixed`); };
      if (x.type === "reserve") { if (!isAmount(x.worst_usd)) bad("amount is not a number of US$ at or above 0"); if (!isTime(x.at)) bad("time is missing or not a date"); }
      else if (x.type === "settle") { if (!isAmount(x.actual_usd)) bad("amount is not a number of US$ at or above 0"); }
      else if (x.type === "override") {
        if (!isAmount(x.worst_usd)) bad("amount is not a number of US$ at or above 0");
        if (!isText(x.id) || !isText(x.run_key) || !isText(x.by)) bad("id, run or person is missing");
        if (!Array.isArray(x.limits) || !x.limits.length || !x.limits.every((l) => (OVERRIDE_LIMITS as readonly unknown[]).includes(l))) bad("limits are not a list of known limits");
        if (!isTime(x.at) || !isTime(x.expires_at)) bad("time or expiry is missing or not a date");
      } else if (x.type === "override_use") { if (!isText(x.id) || !isText(x.run_key)) bad("id or run is missing"); }
    }
    return es;
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
    return this.counted((r) => r.at >= sinceIso);
  }

  /** US$ counted against the caps: settled attempts at their actual cost, unsettled ones at worst case. */
  committed(runId?: string): number {
    return this.counted((r) => runId === undefined || r.run_id === runId);
  }

  /** P-179 break M1: every amount the caps add up is a number of US$ at or above 0. One line that is not (no amount, text,
   *  below 0) would make the sum NaN or lower it and so switch the caps off; it stops every reservation instead, in words. */
  private counted(keep: (r: Extract<Entry, { type: "reserve" }>) => boolean): number {
    const es = this.entries(); // every amount checked there
    const settled = new Map(es.filter((e) => e.type === "settle").map((e) => [e.id, (e as { actual_usd: number }).actual_usd]));
    return es.filter((e): e is Extract<Entry, { type: "reserve" }> => e.type === "reserve" && keep(e)).reduce((sum, r) => sum + (settled.get(r.id) ?? r.worst_usd), 0);
  }

  /** P-179: the most a click may take total spend to: the cap + 10% (US$132 for the US$120 experiment cap). */
  get ceilingUsd(): number { return Math.round(this.capUsd * 1.1 * 100) / 100; }

  /** P-179 break m3, N6 (review N2, break n2): US$ that recorded Continues still hold against the ceiling. A Continue holds
   *  its worst case, less what its run has reserved already, until it expires (10 minutes): unused, and also used while its
   *  run waits in the queue and has not reserved yet (break n2). Continues for the same run key can start one run only (the
   *  plan changes once it starts), so they hold once. `except`: the run key being looked at, which holds nothing against
   *  itself (review N2: a person's own Continue from a moment ago no longer blocks their retry). `ended`: Continues whose run
   *  has ended (the API knows: finished, failed or stopped), which hold nothing more. */
  heldByOverridesUsd(es: Entry[] = this.entries(), now = Date.now(), except?: string, ended: ReadonlySet<string> = new Set()): number {
    const reserved = new Map<string, number>();
    for (const e of es) if (e.type === "reserve" && e.override_id) reserved.set(e.override_id, (reserved.get(e.override_id) ?? 0) + e.worst_usd);
    const byRun = new Map<string, number>();
    for (const o of es) {
      if (o.type !== "override" || o.run_key === except || ended.has(o.id) || Date.parse(o.expires_at) < now) continue;
      byRun.set(o.run_key, Math.max(byRun.get(o.run_key) ?? 0, Math.max(0, o.worst_usd - (reserved.get(o.id) ?? 0))));
    }
    return [...byRun.values()].reduce((a, v) => a + v, 0);
  }

  /** P-179: records a person's Continue past `limits` for one run (run_key), for that run's worst case only. Refused when
   *  it would take spend past the ceiling (nothing is written), for no person or the system, or for no limit. */
  recordOverride(o: { run_key: string; limits: OverrideLimit[]; worst_usd: number; by: string; reason?: string }, opts: { ended?: ReadonlySet<string> } = {}): { id: string; expires_at: string; again?: boolean } {
    if (!o.by || o.by === "system") throw new OverrideRefused("person", "only a person may continue past a cost limit");
    if (!o.run_key) throw new OverrideRefused("other_run", "an override names the run it is for");
    if (!o.limits.length || !o.limits.every((l) => (OVERRIDE_LIMITS as readonly string[]).includes(l)) || new Set(o.limits).size !== o.limits.length) throw new OverrideRefused("limits", `an override names one or more of the limits ${OVERRIDE_LIMITS.join(", ")}`);
    if (!Number.isFinite(o.worst_usd) || o.worst_usd < 0) throw new OverrideRefused("limits", `worst case must be a number of US$ at or above 0 (got ${o.worst_usd})`);
    return this.atomically(() => {
      const es = this.entries(), now = Date.now();
      // Review N2: this person's own Continue for this same run, unused and not expired (a launch refused after the click
      // leaves it so), is the one this click means: it is used again, not recorded twice.
      const used = new Set(es.filter((e) => e.type === "override_use").map((e) => e.id)), same = (a: string[]) => [...a].sort().join();
      const mine = es.find((e): e is Extract<Entry, { type: "override" }> => e.type === "override" && e.run_key === o.run_key && e.by === o.by && !used.has(e.id) && Date.parse(e.expires_at) >= now && e.worst_usd >= o.worst_usd - 1e-9 && same(e.limits) === same(o.limits));
      // Break 3 m7: it is used again only while it still fits the ceiling (spend may have arrived since).
      if (mine && this.committed() + o.worst_usd <= this.ceilingUsd) return { id: mine.id, expires_at: mine.expires_at, again: true };
      const total = this.committed(), held = this.heldByOverridesUsd(es, now, o.run_key, opts.ended), usd = (n: number) => `US$${n.toFixed(2)}`;
      if (total + o.worst_usd > this.ceilingUsd) throw new OverrideRefused("ceiling", `ceiling US$${this.ceilingUsd}: committed ${total.toFixed(4)} + worst case ${o.worst_usd.toFixed(4)}; the founder must raise the cap`);
      // Break m3: other Continues not started yet hold their worst case too, so two of them cannot together pass the ceiling.
      // Review N2: that wait ends by itself (they start or expire within 10 minutes), so the words say wait, not the founder.
      if (total + held + o.worst_usd > this.ceilingUsd) throw new OverrideRefused("held", `Other Continues chosen in the last 10 minutes still hold ${usd(held)} until their runs start; with them, this run could take spend to ${usd(total + held + o.worst_usd)}, past the ${usd(this.ceilingUsd)} a click may allow. Wait a few minutes, then look at the cost again`);
      const at = new Date(), id = `override-${at.getTime()}-${randomBytes(4).toString("hex")}`, expires_at = new Date(at.getTime() + OVERRIDE_TTL_MS).toISOString();
      this.append({ type: "override", id, run_key: o.run_key, limits: o.limits, worst_usd: o.worst_usd, by: o.by, at: at.toISOString(), expires_at, ...(o.reason ? { reason: o.reason } : {}) });
      return { id, expires_at };
    });
  }

  /** P-179: a recorded override, read only (the API compares it with the plan before using it), or null. */
  override(id: string): Extract<Entry, { type: "override" }> | null {
    return this.entries().find((e): e is Extract<Entry, { type: "override" }> => e.type === "override" && e.id === id) ?? null;
  }

  /** P-179: an override starts its own run once, within its time, for the person who recorded it. Records the use; refuses
   *  an unknown, another run's, another person's (break m7, when `by` is given), a used or an expired one. */
  useOverride(id: string, runKey: string, by?: string): Extract<Entry, { type: "override" }> {
    return this.atomically(() => {
      const es = this.entries();
      const o = es.find((e): e is Extract<Entry, { type: "override" }> => e.type === "override" && e.id === id);
      if (!o) throw new OverrideRefused("unknown", "no such override");
      if (o.run_key !== runKey) throw new OverrideRefused("other_run", "this override is for another run");
      if (by !== undefined && o.by !== by) throw new OverrideRefused("person", "this override was recorded by another person; only they may use it");
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
    // P-179 break B1, QA-90 §9: the stub caller never spends (its usage is 0 tokens), so it reserves US$0 and counts
    // nothing toward any cap; before, it reserved the paid call's worst case and a Continue never got past it.
    if (caller === "stub") worstUsd = 0;
    // QA-90: every copy shares one ledger, so two processes may reserve at the same moment; the read of what is committed
    // and the append are one step under a short lock, so the caps count both.
    return this.atomically(() => this.reserveNow(runId, attempt, worstUsd, runCapUsd, caller, opts));
  }

  private reserveNow(runId: string, attempt: number, worstUsd: number, runCapUsd: number, caller: string | undefined, opts: { overrideId?: string; runKey?: string }): string {
    const total = this.committed(), run = this.committed(runId), wave = this.committedSince(WAVE1_START);
    const passed: [OverrideLimit, string][] = [];
    // A US$0 reservation passes no limit, even with spend already past one (as costCheck says: a free start fits).
    const adds = worstUsd > 0;
    if (adds && total + worstUsd > this.capUsd) passed.push(["experiment", `experiment cap US$${this.capUsd}: committed ${total.toFixed(4)} + worst case ${worstUsd.toFixed(4)}`]);
    if (adds && run + worstUsd > runCapUsd) passed.push(["run", `run cap US$${runCapUsd}: committed ${run.toFixed(4)} + worst case ${worstUsd.toFixed(4)}`]);
    if (adds && wave + worstUsd > WAVE1_CAP_USD) passed.push(["wave", `Wave 1 cap US$${WAVE1_CAP_USD}: committed ${wave.toFixed(4)} since ${WAVE1_START.slice(0, 10)} + worst case ${worstUsd.toFixed(4)}`]);
    if (passed.length) {
      if (!opts.overrideId) throw new BudgetExceeded(passed[0][1]);
      const why = this.overrideRefusal(opts.overrideId, opts.runKey, passed.map(([l]) => l), worstUsd, total);
      if (why) throw new BudgetExceeded(`${passed[0][1]}; the override does not admit it: ${why}`);
    } else if (opts.overrideId && adds) {
      // #131 review M1: a reservation that carries a person's Continue stays within the worst case they accepted even
      // when it passes no money limit (a Continue past "attempts" only): every attempt and every retry of that run counts
      // toward it, so one click never pays for more than the person said yes to.
      const room = this.overrideRoomUsd(opts.overrideId);
      if (room === null) throw new BudgetExceeded(`this run carries an override the ledger does not know (${opts.overrideId})`);
      if (worstUsd > room + 1e-9) throw new BudgetExceeded(`this run would reserve US$${worstUsd.toFixed(4)} more under its override, above the US$${room.toFixed(4)} left of the worst case the person accepted`);
    }
    const id = `${runId}#${attempt}#${Date.now()}`;
    this.append({ type: "reserve", id, run_id: runId, attempt, worst_usd: worstUsd, ...(caller ? { caller } : {}), ...(opts.overrideId ? { override_id: opts.overrideId } : {}), at: new Date().toISOString() });
    return id;
  }

  /** #131 review M1: what is left of a Continue's accepted worst case after its run's reservations (at their worst case),
   *  or null for an unknown override. */
  overrideRoomUsd(overrideId: string): number | null {
    const es = this.entries();
    const o = es.find((e): e is Extract<Entry, { type: "override" }> => e.type === "override" && e.id === overrideId);
    if (!o) return null;
    const used = es.filter((e): e is Extract<Entry, { type: "reserve" }> => e.type === "reserve" && e.override_id === overrideId).reduce((a, r) => a + r.worst_usd, 0);
    return Math.max(0, o.worst_usd - used);
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

  /** QA-90: the short exclusive section every read-then-write of the ledger uses (reserve, Continue), also for a tool that
   *  rewrites the file (seed-shared-ledger, review m8), so no line another copy appends meanwhile is lost. */
  withReserveLock<T>(fn: () => T): T { return this.atomically(fn); }

  /** QA-90: a short exclusive section (milliseconds) around a read-then-append. Waits up to 10 s for another process; a
   *  lock older than 30 s is left over from a crash and is broken (breakStaleLock). Each holder writes its own token into
   *  the lock, so on the way out it removes only its own. */
  private atomically<T>(fn: () => T): T {
    const until = Date.now() + this.waitMs, token = lockToken();
    for (;;) {
      if (this.takeLock(this.reserveLockFile, token)) break;
      // A lock older than 30 s, or whose process has exited (break n1: at once, not after 30 s), is left over from a crash.
      if (this.breakStaleLock(this.reserveLockFile, (text, ageMs) => ageMs > 30_000 || holderGone(text))) continue;
      if (Date.now() > until) throw new LedgerBusy(`ledger busy: another process held ${this.reserveLockFile} for ${Math.round(this.waitMs / 1000)} s`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
    }
    try { return fn(); } finally { this.dropLock(this.reserveLockFile, token); }
  }

  /** Takes a lock with its holder's token already inside: the token is written to a file of this process's own, then
   *  linked to the lock's name (a link fails when the name exists), so no other process ever sees a lock without its
   *  holder (break N1: before, an empty lock could be seen between its creation and the write). True: taken. */
  private takeLock(file: string, token: string): boolean {
    const mine = `${file}.new-${process.pid}-${randomBytes(4).toString("hex")}`;
    const fd = openSync(mine, "wx");
    try { writeSync(fd, token); } finally { closeSync(fd); }
    try { linkSync(mine, file); return true; } catch { return false; } finally { try { unlinkSync(mine); } catch { /* gone */ } }
  }

  /** On the way out, a holder removes only its own lock (review m9). */
  private dropLock(file: string, token: string) {
    try { if (readFileSync(file, "utf8") === token) unlinkSync(file); } catch { /* already gone */ }
  }

  /** Review m9: two waiters may both find the same crashed lock. Before, the slower one then deleted the fresh lock the
   *  faster one had just taken, and both entered. Now the old lock is moved aside (a rename: only one waiter can move it)
   *  and looked at once moved: a lock that is not stale after all (a waiter's fresh one) is put back. True: try again. */
  private breakStaleLock(file: string, stale: (text: string, ageMs: number) => boolean): boolean {
    const look = (f: string) => { try { const st = statSync(f); return { text: readFileSync(f, "utf8"), age: Date.now() - st.mtimeMs, ino: st.ino }; } catch { return null; } };
    const first = look(file);
    if (!first) return true; // gone meanwhile
    if (!stale(first.text, first.age)) return false;
    // PR #121 review (Devin): two breakers interleaving could move aside a fresh lock one of them had just taken, leaving
    // the name free for a third. Breakers now take turns under a short breaker's lock of their own, and the one whose
    // turn it is looks at the lock again: a fresh lock taken meanwhile is never touched. A breaker's lock left by a crash
    // (a turn takes microseconds) is cleared after 5 s.
    const turn = `${file}.break`;
    try { closeSync(openSync(turn, "wx")); } catch {
      // #121 review 6, Minor 4: a turn left by a crash is moved aside and looked at once moved (as the lock is), so a
      // fresh turn another breaker took meanwhile is put back, never deleted.
      try {
        if (Date.now() - statSync(turn).mtimeMs > 5_000) {
          const asideTurn = `${turn}.stale-${process.pid}-${randomBytes(4).toString("hex")}`;
          renameSync(turn, asideTurn);
          try { if (Date.now() - statSync(asideTurn).mtimeMs <= 5_000) linkSync(asideTurn, turn); } catch { /* a newer turn is there: it stays */ }
          try { unlinkSync(asideTurn); } catch { /* gone */ }
        }
      } catch { /* gone or moved by another waiter */ }
      return false; // another breaker's turn: wait, then look again
    }
    try {
      const now = look(file);
      if (!now) return true;
      if (now.ino !== first.ino || !stale(now.text, now.age)) return now.ino !== first.ino;
      const aside = `${file}.stale-${process.pid}-${randomBytes(4).toString("hex")}`;
      try { renameSync(file, aside); } catch { return true; }
      const moved = look(aside);
      // Only the stale holder itself releasing in this very instant could have swapped the file: put a fresh one back.
      try { if (moved && (moved.ino !== now.ino || !stale(moved.text, moved.age))) linkSync(aside, file); } catch { /* a newer lock is there: it stays */ }
      try { unlinkSync(aside); } catch { /* gone */ }
      return true;
    } finally { try { unlinkSync(turn); } catch { /* gone */ } }
  }

  settle(id: string, actualUsd: number, outcome: string) {
    if (!Number.isFinite(actualUsd) || actualUsd < 0) throw new BudgetExceeded(`a settled cost must be a number of US$ at or above 0 (got ${actualUsd})`); // break M1
    // Break n5: under the short lock, so the seed tool's read-and-replace never drops a settle appended meanwhile, and
    // never outside it (PR #121 review, Devin: an unlocked append could be replaced by a seed's snapshot). Break 3 m3 is
    // answered in the callers instead: a settle refused as busy leaves the reservation at its worst case (the safe side)
    // and never makes the runner or the reader call the model again (settleOrKeep).
    this.atomically(() => this.append({ type: "settle", id, actual_usd: actualUsd, outcome, at: new Date().toISOString() }));
  }

  /** Break 3 m3 / PR #121 review: a settle that cannot be written now (the ledger is busy or unreadable) is not a failed
   *  call: the reservation stays counted at its worst case, which over-counts and never under-counts. Answers why the
   *  settle was not written, or null. */
  settleOrKeep(id: string, actualUsd: number, outcome: string): string | null {
    try { this.settle(id, actualUsd, outcome); return null; } catch (e) { if (e instanceof BudgetExceeded) return e.message; throw e; }
  }

  /** One runner at a time: a second process is refused while another holds the lock. Break N1 (N6): the lock names its
   *  holder (computer and process id); a lock whose process has exited (a crash, or Stop's SIGTERM, which skips
   *  `finally`) is broken, so a crashed run no longer stops every copy's AI steps until a person deletes the file. An
   *  empty lock (written before the holder was named) is broken once an hour old. */
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const token = lockToken();
    let taken = this.takeLock(this.lockFile, token);
    // A few short tries: another breaker's turn lasts microseconds.
    for (let i = 0; !taken && i < 20; i++) {
      if (!this.breakStaleLock(this.lockFile, (text, ageMs) => holderGone(text) || (text === "" && ageMs > 3_600_000))) {
        if (!existsSync(`${this.lockFile}.break`)) break; // a live holder: refused
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5); continue;
      }
      taken = this.takeLock(this.lockFile, token);
    }
    if (!taken) throw new BudgetExceeded(`ledger locked by another runner (${this.lockFile})`);
    try { return await fn(); } finally { this.dropLock(this.lockFile, token); }
  }
}
