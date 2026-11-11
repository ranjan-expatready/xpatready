import { Worker } from 'node:worker_threads';
import { afterEach } from 'vitest';
import { assertDistFresh } from '../../__tests__/dist-fresh.js';
import type { FormSessionOptions } from '../form-session.js';
import { PROTOCOL_VERSION, parseResponse, type Op, type OpenRequest, type Response } from '../protocol.js';

/*
 * REFERENCE WATCHDOG (W03-T15): the contract the browser client implements in W04-T21, written once, small, against a real
 * `worker_threads` Worker so the kill is a real kill. Test-only; nothing under `src/` outside `__tests__` imports it.
 *
 * THE CONTRACT (plan decision D8 + PA-8)
 *  1. One form run per worker. The client owns the worker and the op log; the worker keeps no history.
 *  2. The op log holds the ops the session ANSWERED `applied` for (and the ops the `open` replayed), in order, each with its own
 *     `at`. An op joins the log only when its `applied` reply arrives. So the op in flight is never in the log. A `download` made with
 *     a pack runs the form's `preSave` handling, which changes the live form: its `downloaded` reply carries that as an op
 *     (`{ kind: 'preSave', at }`), and it joins the log when that reply arrives, so a rebuild reproduces the form that was saved.
 *  3. Every request has a deadline, in three classes. `requestDeadlineMs` is for the light requests (`op`, `layout`). `openDeadlineMs` is
 *     for an `open`, which replays the log. `heavyDeadlineMs` is for `snapshot`, `download` and a live `preSave` op: a snapshot is a save plus a whole second
 *     open and load of the form (the reopen check), and a download runs the form's `preSave` handlers over every node, so neither fits a
 *     light request's budget; it defaults to the `open` deadline of an empty log. `openDeadlineMs` may be a number or a function of
 *     the number of ops the `open` replays. All are the client's choice and must exceed the engine's own budgets (a request deadline above
 *     the per-script `runDeadlineMs` plus a layout), so a script the sandbox can stop is stopped by the sandbox and reported as
 *     `aborted`, not killed, and a healthy replay is never mistaken for a hang. Only a hang the sandbox cannot interrupt (native code)
 *     reaches the watchdog.
 *  4. Requests are serialised: ONE is in flight, the rest wait in the client's own FIFO queue. (The worker answers one request at a
 *     time, and a kill that finds several in flight would race their recoveries: double spawn, a healthy rebuilt worker
 *     terminated, a misattributed error.)
 *  5. When the deadline passes with no reply (or the worker dies), the client does NOT wait: it
 *       a. calls `worker.terminate()` (the only way out of native code the sandbox cannot interrupt),
 *       b. spawns a fresh worker (a fresh isolate: no state of the dead run survives),
 *       c. sends `open` with the same pdf/pack/host/timezone/`at` and `ops` = the log (which already excludes the failing op),
 *       d. surfaces a `WatchdogError` naming the failing op: its kind, its field SOM (setValue/event), and the index it would have had.
 *     The user's earlier work is back, the failing action is dropped and named, the client stays usable.
 *  6. Requests still WAITING in the queue when a kill happens are not run: each rejects with `WatchdogError` reason `superseded`
 *     ("not run; resend if wanted"). They never trigger a kill of their own, and their state is unknown to the user, so the client
 *     never silently re-runs them on the rebuilt session.
 *  7. If the rebuild's own `open` also misses its deadline or does not answer `opened`, or the very first `open` (no live session before
 *     it) hangs or fails, the client STOPS: terminates, no third attempt, reports `WatchdogError` with `rebuilt: null`. From then on every
 *     request (except a new `open`) rejects at once with reason `stopped`, spawning nothing (this includes a request queued while the
 *     failed rebuild was running: it is refused when its turn comes, never run); the page offers a reopen from the original file, which is a new `open`.
 *     An `open` that REPLACES a live session (the rebase: `snapshot`, then `open(bytes, ops: [])`) keeps the prior base and log until its
 *     `opened` arrives. If it hangs or the worker dies, the client rebuilds from the prior base and log, once, and throws a `WatchdogError`
 *     (requestKind `open`) whose `rebuilt` is the prior session's `opened` reply. If it is answered with anything but `opened`, the client
 *     reopens the prior base and log on the same worker, once, returns the reply as received, and `lastRestore` holds the prior session's
 *     `opened` reply. A rebase that succeeds replaces base and log.
 *     If the restoring `open` fails too, the client stops: for a hang as above, and for a refused (non-`opened`) replacing `open` a
 *     `WatchdogError` with reason `refused` and `rebuilt: null` is thrown. A FIRST `open` answered with anything but `opened` also stops the
 *     client (nothing to restore); its reply is returned as received. Requests queued behind an `open` that stops the client are `superseded` (rule 6).
 *  8. `dispose()` terminates the worker and rejects every request in flight or waiting with reason `disposed` (no kill, no rebuild); a kill that was mid-way when `dispose` ran does not rebuild.
 *  9. Replies are matched by `id` and parsed with the protocol's `parseResponse`; a reply that breaks the schema is a worker defect
 *     and is treated like a dead worker. Events ('message', 'error', 'exit') of a worker that is no longer the current one are ignored.
 * 10. REBASE (`rebase(at)`): `snapshot` with `at` (the `at` of the last log entry, the clock the client reopens with), then, only when it is
 *     `faithful`, an `open` of its bytes with `ops: []` and the SAME `answers`, pack, host and timezone as the open that built the run (the
 *     reopen takes the same load-time choice-box answers). A snapshot that is not faithful is returned as received and nothing changes.
 *
 * NOT covered here (W04-T21): `aborted`/`answerRequired` rebuilds (same step 5c, no terminate needed: the run is already freed),
 * the rebase POLICY (when to `snapshot` before `MAX_OPS_PER_OPEN`, see the contract block in `protocol.ts`), and the browser `Worker` constructor.
 */

/** Why the client gave up on a worker: it did not answer within the deadline, or it exited / broke the protocol. */
export type KillReason = 'deadline' | 'worker-exit';
/** Every reason a `WatchdogError` carries: a kill, or a request that was not run (superseded, stopped, disposed). */
/** `refused`: an `open` that replaced a live session was answered with something other than `opened`, and the prior session could not be restored. */
export type WatchdogReason = KillReason | 'superseded' | 'stopped' | 'disposed' | 'refused';

export class WatchdogError extends Error {
  constructor(
    message: string,
    readonly reason: WatchdogReason,
    /** Kind of the request that was in flight (or, for a request that was not run, the one that was refused). */
    readonly requestKind: string,
    /** Kind of the failing op, or null when the request was not an op. */
    readonly opKind: Op['kind'] | null,
    /** The failing op's field SOM; null for `validate` and `preSave` (they name no field) and for requests that are not ops. */
    readonly som: string | null,
    /** Index the failing op would have had in the log; null when the request was not an op or was not run. */
    readonly opIndex: number | null,
    /** The `opened` reply of the rebuilt session, or null when the rebuild failed too (or nothing was rebuilt). */
    readonly rebuilt: Response | null,
  ) {
    super(message);
    this.name = 'WatchdogError';
  }
}

/** Internal: why a request's promise was rejected. */
type Signal = KillReason | 'disposed' | 'stopped';
class KillSignal extends Error {
  constructor(readonly reason: Signal) {
    super(reason);
  }
}

/** The error of a request that was never run (superseded by a kill, refused after a stop, or cut off by `dispose`). */
function notRun(reason: 'superseded' | 'stopped' | 'disposed', requestKind: string, op: Op | null): WatchdogError {
  const som = somOf(op);
  const text = {
    superseded: 'was not run because an earlier request hung and the worker was replaced; resend it if still wanted',
    stopped: 'was not run: the client has stopped (the session could not be restored); reopen from the original file',
    disposed: 'was not run: the client was disposed',
  }[reason];
  return new WatchdogError(`the ${requestKind} request${som === null ? '' : ` on ${som}`} ${text}`, reason, requestKind, op?.kind ?? null, som, null, null);
}

/** The field an op names; null for ops that name none (`validate`, `preSave`) and for no op. */
function somOf(op: Op | null): string | null {
  return op === null || op.kind === 'validate' || op.kind === 'preSave' ? null : op.som;
}

/** An `open` request without the envelope and the log. `pdf` is any `Uint8Array`; the session's schema checks it. */
export type OpenParams = Omit<OpenRequest, 'v' | 'id' | 'kind' | 'ops' | 'pdf'> & { readonly pdf: Uint8Array };

export interface WatchdogOptions {
  /** Per-request deadline in ms. Must exceed the engine's per-script budget (`runDeadlineMs`) plus a layout. */
  readonly requestDeadlineMs: number;
  /**
   * Deadline of an `open` (including the rebuild after a kill) in ms, or a function of the number of ops it replays; defaults to
   * `requestDeadlineMs`. An `open` replays the whole log under the engine's total-time budget (`formRunDeadlineMs`, measured about
   * 40 ms per value-changing op), so a real client sets it from the log length or at least above `formRunDeadlineMs`; a deadline
   * shorter than a healthy replay would kill a healthy worker.
   */
  readonly openDeadlineMs?: number | ((opCount: number) => number);
  /**
   * Deadline of a `snapshot` or `download` in ms (rule 3). A snapshot saves and then opens the form a second time; a download runs
   * `preSave` over every node. Defaults to the `open` deadline of an empty log.
   */
  readonly heavyDeadlineMs?: number;
  /** Engine budgets of the hosted session (the deployment's, not the page's). */
  readonly session?: FormSessionOptions;
}

/** What the last kill cost, for the card's Evidence (recorded, never asserted). */
export interface KillTimings {
  /** Deadline fired -> `terminate()` resolved. */
  readonly terminateMs: number;
  /** `terminate()` resolved -> the rebuilt session's `opened` arrived (spawn + load + replay of the log). */
  readonly rebuildMs: number;
}

/**
 * The worker side: a CommonJS eval entry (no extra file) that hosts `serveFormSession` on the worker's parent port. It imports the
 * BUILT package (`dist/worker/index.js`, the file `exports["./worker"]` points at), because Node cannot run this package's
 * TypeScript source directly (parameter properties are not strippable) and a bundler is not part of this repo's test setup.
 * `assertDistFresh` (shared test helper) refuses to start when `dist` is missing or older than `src`. `workerData.options` is the deployment's `FormSessionOptions`.
 */
const DIST_ENTRY = new URL('../../../dist/worker/index.js', import.meta.url).href;
const ENTRY_SOURCE = `
const { parentPort, workerData } = require('node:worker_threads');
import(${JSON.stringify(DIST_ENTRY)}).then((worker) => worker.serveFormSession(parentPort, workerData.options));
`;

interface Pending {
  readonly resolve: (reply: Response) => void;
  readonly reject: (reason: KillSignal) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/** The session an `open` replaces: what a restore reopens (rule 7). */
interface Prior {
  readonly base: OpenParams;
  readonly log: readonly Op[];
}

/** A request waiting its turn in the client's FIFO queue (contract rule 4). */
interface Job {
  readonly kind: string;
  readonly op: Op | null;
  readonly run: () => Promise<Response>;
  readonly resolve: (reply: Response) => void;
  readonly reject: (error: unknown) => void;
}

const live = new Set<ReferenceWatchdog>();
afterEach(async () => {
  // A worker must never outlive its test: a stuck one would keep the vitest process alive. Assert it, do not hope.
  const clients = [...live];
  live.clear();
  await Promise.all(clients.map((watchdog) => watchdog.dispose()));
  const leaked = clients.filter((watchdog) => watchdog.running !== 0 || watchdog.spawned !== watchdog.terminated);
  if (leaked.length > 0) throw new Error(`worker leak: ${leaked.map((w) => `spawned ${w.spawned}, terminated ${w.terminated}, still running ${w.running}`).join('; ')}`);
});

export class ReferenceWatchdog {
  readonly #options: WatchdogOptions;
  #worker: Worker | null = null;
  #nextId = 0;
  readonly #pending = new Map<number, Pending>();
  readonly #queue: Job[] = [];
  #busy = false;
  /** True until the first `open` is accepted, and again after the client gave up or was disposed (contract rules 7 and 8). */
  #stopped = true;
  /** Bumped by `dispose`, so a kill that was mid-way knows not to rebuild. */
  #epoch = 0;
  #base: OpenParams | null = null;
  readonly #log: Op[] = [];
  readonly #running = new Set<Worker>();
  /** Workers started over this client's life (the first plus one per recovery). */
  spawned = 0;
  /** Workers this client terminated. */
  terminated = 0;
  lastKill: KillTimings | null = null;
  /** After an `open` that replaced a live session and was answered with anything but `opened`: the prior session's `opened` reply once it was restored; null otherwise (rule 7). */
  lastRestore: Response | null = null;

  constructor(options: WatchdogOptions) {
    this.#options = options;
    live.add(this);
    assertDistFresh();
  }

  /** The ops the client would replay on a rebuild (copy). */
  get log(): readonly Op[] {
    return [...this.#log];
  }

  /** Workers that have been started and have not yet exited (the real count, not our bookkeeping). */
  get running(): number {
    return this.#running.size;
  }

  /** Opens the form on a fresh worker. `ops` is a log to replay (empty for a first open). Throws `WatchdogError` if the open itself hangs. Also the way out of `stopped`. An `open` over a live session is the rebase (rule 7): the prior session survives its failure. */
  open(params: OpenParams, ops: readonly Op[] = []): Promise<Response> {
    return this.#enqueue('open', null, () => this.#openNow(params, ops));
  }

  /** Rule 10: snapshot at `at`, then reopen its bytes with the same answers, pack, host and timezone and an empty log. A snapshot that is not faithful is returned as received. */
  rebase(at: number): Promise<Response> {
    return this.#enqueue('rebase', null, async () => {
      const base = this.#base;
      if (base === null) throw notRun('stopped', 'rebase', null);
      let snap: Response;
      try {
        snap = await this.#request({ kind: 'snapshot', at });
      } catch (reason) {
        throw await this.#recover(reason, 'snapshot', null);
      }
      if (snap.kind !== 'snapshotted' || !snap.faithful) return snap;
      return this.#openNow({ ...base, pdf: snap.bytes, at }, []);
    });
  }

  async #openNow(params: OpenParams, ops: readonly Op[]): Promise<Response> {
    // A live session is one that was not stopped; after a stop the open is a first open again.
    const prior: Prior | null = !this.#stopped && this.#base !== null ? { base: this.#base, log: [...this.#log] } : null;
    this.#stopped = false;
    this.lastRestore = null;
    if (prior === null) {
      this.#base = null;
      this.#log.splice(0);
    }
    await this.#stopWorker();
    this.#spawn();
    let reply: Response;
    try {
      reply = await this.#request({ kind: 'open', ...params, ops: [...ops] });
    } catch (reason) {
      throw await this.#recover(reason, 'open', null, prior);
    }
    if (reply.kind === 'opened') {
      this.#base = params;
      this.#log.splice(0, this.#log.length, ...ops);
      return reply;
    }
    if (prior === null) {
      // A first open that was refused leaves nothing to keep: the client stops (rule 7) and the caller reads the reply.
      this.#supersedeQueued();
      this.#stopped = true;
      await this.#stopWorker();
      return reply;
    }
    this.lastRestore = await this.#restore(prior, false);
    if (this.lastRestore === null) {
      this.#supersedeQueued();
      throw new WatchdogError(`the open request was answered ${reply.kind} and the prior session could not be restored; the client has stopped`, 'refused', 'open', null, null, null, null);
    }
    return reply;
  }

  /** Rule 6: requests waiting in the queue when the client is stopped or the worker replaced are not run. */
  #supersedeQueued(): void {
    for (const job of this.#queue.splice(0)) job.reject(notRun('superseded', job.kind, job.op));
  }

  /** Sends one op. On `applied` it joins the log. On a missed deadline: kill, respawn, reopen from the log (without this op), throw `WatchdogError`. */
  op(op: Op): Promise<Response> {
    return this.#enqueue('op', op, async () => {
      let reply: Response;
      try {
        reply = await this.#request({ kind: 'op', op });
      } catch (reason) {
        throw await this.#recover(reason, 'op', op);
      }
      if (reply.kind === 'applied') this.#log.push(op);
      return reply;
    });
  }

  /** Any other request (`layout`, `download`, `snapshot`), with the deadline of its class (rule 3) and the same recovery. (The session's own `dispose` request is not used: `dispose()` below ends the worker.) */
  send(body: { readonly kind: 'layout' } | { readonly kind: 'download' | 'snapshot'; readonly at: number }): Promise<Response> {
    return this.#enqueue(body.kind, null, async () => {
      let reply: Response;
      try {
        reply = await this.#request(body);
      } catch (reason) {
        throw await this.#recover(reason, body.kind, null);
      }
      // The download's preSave handling changed the live form: it is part of the log from the moment its reply arrives (rule 2).
      if (reply.kind === 'downloaded' && reply.op !== undefined) this.#log.push(reply.op);
      return reply;
    });
  }

  /** Stops the worker, if any, and rejects every request in flight or waiting (reason `disposed`). Safe to call twice. */
  async dispose(): Promise<void> {
    this.#epoch += 1;
    this.#stopped = true;
    const worker = this.#worker;
    this.#worker = null;
    this.#failAll('disposed');
    for (const job of this.#queue.splice(0)) job.reject(notRun('disposed', job.kind, job.op));
    if (worker !== null) {
      this.terminated += 1;
      await worker.terminate();
    }
  }

  #enqueue(kind: string, op: Op | null, run: () => Promise<Response>): Promise<Response> {
    if (this.#stopped && kind !== 'open') return Promise.reject(notRun('stopped', kind, op));
    return new Promise<Response>((resolve, reject) => {
      this.#queue.push({ kind, op, run, resolve, reject });
      void this.#pump();
    });
  }

  async #pump(): Promise<void> {
    if (this.#busy) return;
    this.#busy = true;
    try {
      for (let job = this.#queue.shift(); job !== undefined; job = this.#queue.shift()) {
        // Rule 7 also covers a request queued while a kill was rebuilding and the rebuild then failed: it is refused, not run.
        if (this.#stopped && job.kind !== 'open') {
          job.reject(notRun('stopped', job.kind, job.op));
          continue;
        }
        try {
          job.resolve(await job.run());
        } catch (error) {
          job.reject(error);
        }
      }
    } finally {
      this.#busy = false;
    }
  }

  async #stopWorker(): Promise<void> {
    const worker = this.#worker;
    this.#worker = null;
    if (worker !== null) {
      this.terminated += 1;
      await worker.terminate();
    }
  }

  #spawn(): void {
    const worker = new Worker(ENTRY_SOURCE, { eval: true, workerData: { options: this.#options.session ?? {} } });
    this.spawned += 1;
    this.#worker = worker;
    this.#running.add(worker);
    worker.on('message', (data: unknown) => {
      if (this.#worker !== worker) return;
      const parsed = parseResponse(data);
      if (!parsed.success || parsed.data.id === null) {
        this.#failAll('worker-exit');
        return;
      }
      const pending = this.#pending.get(parsed.data.id);
      if (pending === undefined) return;
      clearTimeout(pending.timer);
      this.#pending.delete(parsed.data.id);
      pending.resolve(parsed.data);
    });
    // 'error' (uncaught in the worker) is followed by 'exit'; either one means the run is gone, but only for the CURRENT worker.
    worker.on('error', () => {
      if (this.#worker === worker) this.#failAll('worker-exit');
    });
    worker.on('exit', () => {
      this.#running.delete(worker);
      if (this.#worker === worker) this.#failAll('worker-exit');
    });
  }

  #failAll(reason: Signal): void {
    for (const [id, pending] of [...this.#pending]) {
      clearTimeout(pending.timer);
      this.#pending.delete(id);
      pending.reject(new KillSignal(reason));
    }
  }

  /** The deadline of a request of `kind`; `opCount` is the number of ops an `open` replays (rule 3: light, open and heavy classes). */
  deadlineMsFor(kind: string, opCount = 0): number {
    const { requestDeadlineMs, openDeadlineMs, heavyDeadlineMs } = this.#options;
    const open = (count: number): number => {
      const configured = openDeadlineMs ?? requestDeadlineMs;
      return typeof configured === 'function' ? configured(count) : configured;
    };
    if (kind === 'open') return open(opCount);
    if (kind === 'snapshot' || kind === 'download' || kind === 'preSave') return heavyDeadlineMs ?? (typeof openDeadlineMs === 'function' ? openDeadlineMs(0) : (openDeadlineMs ?? requestDeadlineMs));
    return requestDeadlineMs;
  }

  #deadlineOf(body: Record<string, unknown>): number {
    // A live preSave op is the form's save handling over every node, as a download runs it: the heavy class, not the light one of other ops.
    const op = body.kind === 'op' ? body.op : undefined;
    const kind = typeof op === 'object' && op !== null && 'kind' in op && op.kind === 'preSave' ? 'preSave' : String(body.kind);
    return this.deadlineMsFor(kind, Array.isArray(body.ops) ? body.ops.length : 0);
  }

  #request(body: Record<string, unknown>): Promise<Response> {
    const deadlineMs = this.#deadlineOf(body);
    const worker = this.#worker;
    if (worker === null) return Promise.reject<Response>(new KillSignal('stopped'));
    this.#nextId += 1;
    const id = this.#nextId;
    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new KillSignal('deadline'));
      }, deadlineMs);
      this.#pending.set(id, { resolve, reject, timer });
      worker.postMessage({ v: PROTOCOL_VERSION, id, ...body });
    });
  }

  /** A request failed: a disposed client just reports it; anything else is a kill. */
  async #recover(reason: unknown, requestKind: string, op: Op | null, prior: Prior | null = null): Promise<WatchdogError> {
    const signal = asSignal(reason);
    if (signal === 'disposed' || signal === 'stopped') return notRun(signal, requestKind, op);
    return this.#kill(signal, requestKind, op, prior);
  }

  /** Reopens the prior session's base and log (rule 7), on a fresh worker when `fresh`; the client stops when that fails too. Returns the `opened` reply, or null. */
  async #restore(prior: Prior, fresh: boolean): Promise<Response | null> {
    const epoch = this.#epoch;
    if (fresh) {
      this.#spawn();
    }
    let reply: Response | null;
    try {
      reply = await this.#request({ kind: 'open', ...prior.base, ops: [...prior.log] });
    } catch {
      reply = null;
    }
    if (reply?.kind === 'opened') {
      this.#base = prior.base;
      this.#log.splice(0, this.#log.length, ...prior.log);
      return reply;
    }
    if (this.#epoch === epoch) this.#stopped = true;
    await this.#stopWorker();
    return null;
  }

  /** Contract rules 5 to 7: reject the waiting requests, terminate, respawn, reopen from the log (for a replacing `open`: the prior session), stop if that fails; return the error to throw. */
  async #kill(reason: KillReason, requestKind: string, op: Op | null, prior: Prior | null): Promise<WatchdogError> {
    // What a rebuild reopens: the prior session for an `open` that replaced one; for any other request the current base and log. A first `open` has none (rule 7).
    const source: Prior | null = requestKind === 'open' ? prior : this.#base === null ? null : { base: this.#base, log: [...this.#log] };
    const epoch = this.#epoch;
    const startedKill = performance.now();
    this.#supersedeQueued();
    await this.#stopWorker();
    const terminatedAt = performance.now();
    const som = somOf(op);
    const opIndex = op === null ? null : this.#log.length;
    const what = op === null ? `the ${requestKind} request` : `${op.kind} op${som === null ? '' : ` on ${som}`} (would be op ${opIndex})`;
    const why = reason === 'deadline' ? 'did not answer in time' : 'ended the worker';
    let rebuilt: Response | null = null;
    if (source !== null && this.#epoch === epoch && !this.#stopped) {
      rebuilt = await this.#restore(source, true);
      this.lastKill = { terminateMs: terminatedAt - startedKill, rebuildMs: performance.now() - terminatedAt };
    } else {
      if (this.#epoch === epoch) this.#stopped = true;
      this.lastKill = { terminateMs: terminatedAt - startedKill, rebuildMs: 0 };
    }
    const outcome = rebuilt?.kind === 'opened' ? (requestKind === 'open' ? ' and the prior session restored' : ' and the session rebuilt without it') : ' and the session could not be rebuilt; the client has stopped';
    return new WatchdogError(`${what} ${why}; the worker was stopped${outcome}`, reason, requestKind, op?.kind ?? null, som, opIndex, rebuilt);
  }
}

function asSignal(value: unknown): Signal {
  return value instanceof KillSignal ? value.reason : 'worker-exit';
}
