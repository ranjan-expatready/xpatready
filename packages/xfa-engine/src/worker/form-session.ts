import type { RenderTree } from '../layout/render-tree.js';
import { safeText } from '../pdf/safe-text.js';
import { XfaPdfError } from '../pdf/errors.js';
import { XfaAnswerRequiredError, XfaRuntimeError } from '../runtime/errors.js';
import type { FormRuntime, LoadReport, ValidateResult } from '../runtime/options.js';
import { resolveRuntimeLimits, type RuntimeLimits } from '../runtime/limits.js';
import type { PackFormDescriptor } from '../runtime/pack.js';
import { createFormRuntime } from '../runtime/runtime.js';
import { XfaScriptError, type SandboxWasmOptions } from '../script/index.js';
import { openXfaPdf } from '../xfa-pdf.js';
import { structurallyEqual } from './structural-equal.js';
import { MAX_FAILURE_MESSAGE_CHARS, MAX_OPS_PER_OPEN, MIN_FORM_RUN_DEADLINE_MS, REPLAY_HEADROOM, WORST_MS_PER_OP } from './limits.js';
import type { Op, OpenRequest, Request, ResponseBody } from './protocol.js';

type Body<K extends ResponseBody['kind']> = Extract<ResponseBody, { kind: K }>;

/** `empty`: no run (never opened, disposed, or an `open` that failed). `ready`: a healthy run. `rebuild`: the run ended (abort or unanswered box) and was freed; only `open` or `dispose` is accepted. */
type Phase = 'empty' | 'ready' | 'rebuild';

export interface FormSessionOptions {
  /** Where the QuickJS WebAssembly comes from, for hosts that must supply it (see `FormRuntimeOptions.wasm`). */
  readonly wasm?: SandboxWasmOptions | undefined;
  /**
   * The engine budgets of every run this session builds. They are the deployment's choice, made where the session is hosted:
   * the page that opens a form cannot send them (the `open` request has no such member). Validated with the runtime's limits
   * schema when the session is created (`INVALID_OPTIONS` is thrown, not deferred to the first open).
   *
   * SIZING RULE. `MAX_OPS_PER_OPEN` is a count that guards a wall-clock budget: a replay of a log at the ceiling is charged against
   * `formRunDeadlineMs`. A deployment must keep `formRunDeadlineMs >= 2 x (MAX_OPS_PER_OPEN x the worst ms/op it measured on its
   * slowest supported device)`, and the client rebases its log (`snapshot`) well before the ceiling. The session enforces the floor
   * it can know, `MIN_FORM_RUN_DEADLINE_MS` (`MAX_OPS_PER_OPEN` x `WORST_MS_PER_OP` x `REPLAY_HEADROOM`, 120 s today; exported from `./worker`): a smaller `formRunDeadlineMs` is `INVALID_OPTIONS`.
   * The measured figure of the supported devices (Chrome, Safari) is the W04-T23 acceptance.
   */
  readonly limits?: RuntimeLimits | undefined;
}

/** A request the session refuses before it changes anything (a mistake of the client, not a failure of the form). */
class Refusal extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type Validation = NonNullable<Body<'applied'>['validation']>;

/** What one op did: the reply to send when it failed, else what it found out. */
type Applied = { readonly reply: ResponseBody } | { readonly validation: Validation | undefined; readonly validated: boolean | null };

/** The failure reply of a protocol-level refusal. */
const refusal = (code: string, message: string, opIndex?: number): Body<'failed'> => ({ kind: 'failed', code, message, ...(opIndex === undefined ? {} : { opIndex }) });

/** The reply to anything that reaches a session after it was closed (never posted: the transport is gone). */
const closedReply = (): Body<'failed'> => refusal('CLOSED', 'the session was closed');

const textOf = (error: unknown): string => safeText(error instanceof Error ? error.message : 'unexpected failure', MAX_FAILURE_MESSAGE_CHARS, true);

/** The engine's own error code, or INTERNAL for anything else (a defect: nothing else is expected to be thrown). */
const codeOf = (error: unknown): string => (error instanceof XfaPdfError || error instanceof Refusal ? error.code : 'INTERNAL');

/**
 * The bytes of a render-tree resource as a buffer of exactly their length. The tree's `bytes` are shared with the engine's
 * font and image caches: they are never transferred, and a view onto a larger buffer is copied so that structured
 * cloning does not carry the whole parent buffer along with it.
 */
function ownBytes(bytes: Uint8Array): Uint8Array {
  return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength ? bytes : bytes.slice();
}

/** The tree as it is posted: same data, resource bytes owned (see `ownBytes`). The engine's tree is untouched. */
function postable(tree: RenderTree): RenderTree {
  return {
    ...tree,
    resources: {
      fonts: tree.resources.fonts.map((font) => ({ ...font, bytes: ownBytes(font.bytes) })),
      images: tree.resources.images.map((image) => ({ ...image, bytes: ownBytes(image.bytes) })),
    },
  };
}

function reportOf(report: LoadReport): Body<'opened'>['report'] {
  // `elapsedMs` is wall-clock: left out, so the same inputs always produce the same reply (replay determinism).
  return { scriptObjects: report.scriptObjects, scriptsRun: report.scriptsRun, byPhase: { ...report.byPhase }, calcPasses: report.calcPasses, savedState: { ...report.savedState } };
}

function validationOf(result: ValidateResult): Validation {
  return { complete: result.complete, flag: result.flag, firstMissingField: result.firstMissingField, notes: [...result.notes], barcodesPresence: result.barcodesPresence };
}

/**
 * Checks that the four nodes of the pack descriptor exist in the form and are of the kind the runtime's `validate` and
 * `encodeBarcodes` need, through the public runtime API and with reads only, before any op can click or change anything. A
 * descriptor that does not fit the form fails the open (`PACK_UNRESOLVED`, naming the key) rather than failing later in the
 * middle of a Validate click that had already changed the form.
 */
function probePack(runtime: FormRuntime, pack: PackFormDescriptor): void {
  const probes: readonly (readonly [keyof PackFormDescriptor, () => unknown])[] = [
    ['validateButton', () => runtime.children(pack.validateButton)],
    ['validatedFlag', () => runtime.getValue(pack.validatedFlag)],
    ['firstMissingField', () => runtime.getProperty(pack.firstMissingField, 'name')],
    ['barcodes', () => [runtime.getProperty(pack.barcodes, 'presence'), runtime.children(pack.barcodes, 'field')]],
  ];
  for (const [key, probe] of probes) {
    try {
      probe();
    } catch (error) {
      if (error instanceof XfaPdfError) throw new Refusal('PACK_UNRESOLVED', `pack.${key} does not fit this form (${textOf(error)})`);
      throw error;
    }
  }
}

/**
 * One viewer's form run behind the worker protocol (plan decision D8: exactly one `FormRuntime`, one form per worker).
 *
 * The session is a state machine over `Phase`. It never lets a form failure escape as an exception: a request ends in a
 * `ResponseBody`. Two kinds of failure are told apart by the runtime itself:
 *  - the engine refused a caller mistake before changing anything (`runtime.state` still `loaded`): `failed`, the run
 *    lives on, nothing changed;
 *  - the run ended (a script failure or limit, `ANSWER_REQUIRED`, or anything unexpected): the run is freed and the session
 *    wants a rebuild (PA-8): the client sends `open` again with its op log (less the op that failed, or with the answer).
 *
 * Clock and answers. The form's clock reads the `at` of the op that is running (`open`: its own `at`; `download`: its
 * `at`; `layout`: the last one), so replaying the same log reproduces the same state. A choice box (`buttons` other than
 * 0 = OK only) takes the op's next answer, in order; with none left it ends the run with `ANSWER_REQUIRED`. After every
 * op the layout is settled under that op's clock, so the state after op k depends on ops 0..k alone, in a live session and in a replay.
 * Answers an op did not consume are ignored. The `open`'s own `answers` serve the boxes the form raises while it loads and makes
 * its first layout; one it cannot answer is `answerRequired` with `opIndex` null.
 *
 * The session counts the ops applied in the run (`opCount`) and can write its state as PDF bytes (`snapshot`), so that a client
 * can rebase a long log (contract in `protocol.ts`). `cancel()` is for the transport closing: an `open` in flight frees what it builds.
 */
export class FormSession {
  readonly #options: FormSessionOptions;
  #phase: Phase = 'empty';
  #runtime: FormRuntime | undefined;
  #pack: PackFormDescriptor | undefined;
  /** What the check runtime of a snapshot needs of the open that built the run (`answers`: the open's own, for the boxes the form raises while it loads). */
  #identity: { readonly host: OpenRequest['host']; readonly timezone: string; readonly answers: readonly number[] } | undefined;
  #lastTree: RenderTree | undefined;
  #now = 0;
  #answers: readonly number[] = [];
  #answered = 0;
  /** Ops applied in the current run (replayed plus live), reported as `opCount`. */
  #opCount = 0;
  #cancelled = false;

  constructor(options: FormSessionOptions = {}) {
    // Throws INVALID_OPTIONS for a limit the engine refuses: the deployment's mistake, found when the session is created.
    if (options.limits !== undefined) {
      const resolved = resolveRuntimeLimits(options.limits);
      // The count ceiling guards a wall-clock budget (see `FormSessionOptions.limits`): a budget below the floor aborts a replay of a full log.
      if (resolved.sandbox.formRunDeadlineMs < MIN_FORM_RUN_DEADLINE_MS) {
        throw new XfaRuntimeError(
          'INVALID_OPTIONS',
          `limits.formRunDeadlineMs (${resolved.sandbox.formRunDeadlineMs} ms) is below ${MIN_FORM_RUN_DEADLINE_MS} ms, which is MAX_OPS_PER_OPEN (${MAX_OPS_PER_OPEN}) x ${WORST_MS_PER_OP} ms x ${REPLAY_HEADROOM}: a replay of a full log would exhaust it; raise it, or do not set it`,
        );
      }
    }
    this.#options = options;
  }

  async handle(request: Request): Promise<ResponseBody> {
    if (this.#cancelled) return closedReply();
    switch (request.kind) {
      case 'open':
        return this.#open(request);
      case 'op':
        return this.#live(request.op);
      case 'layout':
        return this.#layout();
      case 'download':
        return this.#download(request.at);
      case 'snapshot':
        return this.#snapshot(request.at);
      case 'problems':
        return this.#problems();
      case 'dispose':
        this.dispose();
        return { kind: 'disposed' };
    }
  }

  /**
   * The transport closed. Takes effect at once and for good: a request that is awaiting the PDF or the runtime frees what it
   * built at its next step instead of keeping it, and no request is accepted. The caller disposes after that request ends.
   */
  cancel(): void {
    this.#cancelled = true;
  }

  /** Frees the run; the session accepts a new `open` afterwards. */
  dispose(): void {
    this.#free('empty');
  }

  /** Frees the run (if any) and moves to `phase`. */
  #free(phase: Phase): void {
    const runtime = this.#runtime;
    this.#runtime = undefined;
    this.#pack = undefined;
    this.#lastTree = undefined;
    this.#phase = phase;
    try {
      runtime?.dispose();
    } catch {
      // The run is already unusable; a teardown problem must not replace the reply the client is waiting for.
    }
  }

  #refused(): Body<'failed'> | undefined {
    if (this.#phase === 'ready') return undefined;
    return this.#phase === 'rebuild'
      ? refusal('NEEDS_REBUILD', 'the run ended; send open again with the op log')
      : refusal('NOT_OPEN', 'no form is open; send open first');
  }

  // ---- open and replay ------------------------------------------------------------------------------------------------

  async #open(request: OpenRequest): Promise<ResponseBody> {
    if (this.#cancelled) return closedReply();
    if (this.#phase === 'ready') return refusal('ALREADY_OPEN', 'a form is already open; dispose it first');
    this.#free('empty');
    try {
      const pdf = await openXfaPdf(request.pdf);
      if (this.#cancelled) return closedReply();
      this.#now = request.at;
      // The open's own answers serve the boxes the form raises while it loads and lays out; each op then brings its own.
      this.#answers = request.answers ?? [];
      this.#answered = 0;
      this.#opCount = 0;
      const runtime = await createFormRuntime(pdf, {
        host: request.host,
        clock: { now: () => this.#now },
        timezone: request.timezone,
        ...(this.#options.limits === undefined ? {} : { limits: this.#options.limits }),
        messageBoxResult: (call) => (call.buttons === 0 ? 1 : (this.#answers[this.#answered++] ?? null)),
        ...(this.#options.wasm === undefined ? {} : { wasm: this.#options.wasm }),
      });
      if (this.#cancelled) {
        // Closed while the runtime was being built: nothing may keep it.
        try {
          runtime.dispose();
        } catch {
          // Already unusable; the session is gone.
        }
        return closedReply();
      }
      this.#runtime = runtime;
      this.#pack = request.pack;
      this.#identity = { host: request.host, timezone: request.timezone, answers: request.answers ?? [] };
      const report = runtime.load();
      this.#lastTree = runtime.layout();
      const loadRequests = runtime.requests.map((request) => ({ ...request }));
      if (request.pack !== undefined) probePack(runtime, request.pack);
      for (const [index, op] of request.ops.entries()) {
        const done = this.#apply(runtime, op, index);
        if ('reply' in done) return done.reply;
      }
      this.#phase = 'ready';
      // After the replay, so the clear button is looked for in the form as the user left it. A pack whose clear button does not fit is a typed result, not a failed open.
      const clearButton = request.pack === undefined ? undefined : runtime.clearButton(request.pack);
      return { kind: 'opened', renderTree: postable(this.#lastTree), report: reportOf(report), opCount: this.#opCount, ...(clearButton === undefined ? {} : { clearButton }), ...(loadRequests.length === 0 ? {} : { requests: loadRequests }) };
    } catch (error) {
      if (error instanceof XfaAnswerRequiredError) {
        // The form raised a choice box while it loaded and the open's `answers` ran out: the open itself is what needs the answer.
        this.#free('rebuild');
        return { kind: 'answerRequired', call: { ...error.call }, opIndex: null };
      }
      this.#free('empty');
      return refusal(codeOf(error), textOf(error));
    }
  }

  // ---- live ops -------------------------------------------------------------------------------------------------------

  #live(op: Op): ResponseBody {
    const refused = this.#refused();
    if (refused !== undefined) return refused;
    const runtime = this.#runtime;
    if (runtime === undefined) return refusal('NOT_OPEN', 'no form is open; send open first');
    // The client was to rebase before this: nothing is applied and the run is kept, so `snapshot` still works. The last slot is reserved for a download.
    if (this.#opCount >= MAX_OPS_PER_OPEN - 1) return refusal('LOG_FULL', `the session holds ${this.#opCount} ops, and the last of ${MAX_OPS_PER_OPEN} is kept for a download; take a snapshot and open again from it`);
    // A user op on a container whose effective access forbids it is refused before anything runs: the run is kept, the op is not applied
    // and not counted, so the client does not log it and a replay never meets it. (A replayed op is not asked: it was accepted when it
    // was first applied, and scripts, which keep setting locked fields, are never asked.)
    if (op.kind === 'setValue' || op.kind === 'event') {
      try {
        const check = runtime.checkUserAction(op.som, op.kind === 'setValue' ? { kind: 'setValue' } : { kind: 'event', activity: op.activity });
        if (!check.allowed) return refusal('ACCESS_DENIED', check.reason);
      } catch (error) {
        return this.#failure(runtime, error, null);
      }
    }
    const messagesBefore = runtime.messages.length;
    const focusBefore = runtime.focus.length;
    const requestsBefore = runtime.requests.length;
    const before = this.#lastTree;
    // A live op has no index in the log: its failures say `null`, "the op of this request".
    const done = this.#apply(runtime, op, null);
    if ('reply' in done) return done.reply;
    const tree = this.#lastTree;
    const requests = runtime.requests.slice(requestsBefore).map((request) => ({ ...request }));
    return {
      kind: 'applied',
      // The engine answers the same tree object while nothing changed the form: then the client's copy is current.
      ...(tree === undefined || tree === before ? {} : { renderTree: postable(tree) }),
      messages: runtime.messages.slice(messagesBefore).map((message) => ({ ...message })),
      focus: runtime.focus.slice(focusBefore),
      ...(requests.length === 0 ? {} : { requests }),
      issues: tree?.issues ?? [],
      ...(done.validation === undefined ? {} : { validation: done.validation }),
      opCount: this.#opCount,
    };
  }

  /**
   * Runs one op and settles the layout under its clock. `index` is the op's place in the replayed log, null for a live op. On
   * failure the session has already moved to its next phase (a freed run for one that ended) and the reply is ready to send.
   *
   * A `validate` op clicks the form's own Validate button first and reads the outcome after. The pack was probed at open, so
   * once the click has started, an engine error is a state the click already changed: the run ends (`aborted`), it is never a
   * kept-run `failed`. A `preSave` op is the form's save handling as `download` runs it (`encodeBarcodes`): the validated flag is
   * read first (a read that changes nothing, so its failure leaves the run), then the `preSave` broadcast starts and from there
   * any error ends the run. `asksWhenOp` is false for a download, which carries no answers: a choice box then ends the run `aborted`.
   */
  #apply(runtime: FormRuntime, op: Op, index: number | null, asksWhenOp = true): Applied {
    // A preSave op carries no answers, wherever it comes from (a download, a live op, a replay): a choice box there can never be answered.
    const asks = asksWhenOp && op.kind !== 'preSave';
    this.#now = op.at;
    this.#answers = op.kind === 'preSave' ? [] : (op.answers ?? []);
    this.#answered = 0;
    let clicked = false;
    try {
      let validation: Validation | undefined;
      let validated: boolean | null = null;
      if (op.kind === 'setValue') runtime.setValue(op.som, op.value);
      else if (op.kind === 'event') runtime.event(op.som, op.activity, op.fields);
      else if (op.kind === 'preSave') {
        if (this.#pack === undefined) throw new Refusal('NO_PACK', 'preSave needs the pack descriptor given at open');
        runtime.getValue(this.#pack.validatedFlag);
        clicked = true;
        validated = runtime.encodeBarcodes(this.#pack).validated;
      } else {
        if (this.#pack === undefined) throw new Refusal('NO_PACK', 'validate needs the pack descriptor given at open');
        clicked = true;
        validation = validationOf(runtime.validate(this.#pack));
      }
      this.#lastTree = runtime.layout();
      this.#opCount += 1;
      return { validation, validated };
    } catch (error) {
      return { reply: this.#failure(runtime, error, index, { asks, endsRun: clicked }) };
    }
  }

  // ---- layout, download -----------------------------------------------------------------------------------------------

  #layout(): ResponseBody {
    const refused = this.#refused();
    if (refused !== undefined) return refused;
    const runtime = this.#runtime;
    if (runtime === undefined) return refusal('NOT_OPEN', 'no form is open; send open first');
    try {
      this.#lastTree = runtime.layout();
      return { kind: 'laidOut', renderTree: postable(this.#lastTree) };
    } catch (error) {
      return this.#failure(runtime, error, null);
    }
  }

  /** Every field failing its own declarative validation (`FormRuntime.problems`). A read: no clock, no log entry, no `opCount`. */
  #problems(): ResponseBody {
    const refused = this.#refused();
    if (refused !== undefined) return refused;
    const runtime = this.#runtime;
    if (runtime === undefined) return refusal('NOT_OPEN', 'no form is open; send open first');
    try {
      const { problems, truncated } = runtime.problems();
      return { kind: 'problemList', problems: problems.map((problem) => ({ ...problem })), truncated };
    } catch (error) {
      return this.#failure(runtime, error, null);
    }
  }

  /**
   * The state as PDF bytes, for the client to rebase its op log on (see the contract in `protocol.ts`). It is `runtime.save()`
   * (no `preSave` handling, no barcode encoding: those are `download`'s) plus a check: `faithful` is true only when reopening
   * the saved bytes, under `at`, reproduces this run's render tree and datasets.
   */
  async #snapshot(at: number): Promise<ResponseBody> {
    const refused = this.#refused();
    if (refused !== undefined) return refused;
    const runtime = this.#runtime;
    if (runtime === undefined) return refusal('NOT_OPEN', 'no form is open; send open first');
    // The live form settles under the clock the check will read, as `download` does: save()'s settle and the check agree on `at`.
    this.#now = at;
    this.#answers = [];
    this.#answered = 0;
    try {
      const saved = await runtime.save();
      if (this.#cancelled) return closedReply();
      const tree = runtime.layout();
      const datasets = runtime.saveDatasets();
      const faithful = await this.#reopens(saved, at, tree, datasets);
      if (this.#cancelled) return closedReply();
      // A copy of exactly the file's bytes, as in `download`: the caller may transfer its buffer, the engine keeps its own.
      return { kind: 'snapshotted', bytes: saved.slice(), faithful };
    } catch (error) {
      return this.#failure(runtime, error, null);
    }
  }

  /**
   * Opens `saved` in a separate runtime (same host, timezone, limits and wasm; clock `at`; no ops; the open's own `answers`,
   * consumed in order like the open did) and compares it with the live run. A choice box left unanswered, any failure, or any difference is false. The check runtime is always disposed.
   */
  async #reopens(saved: Uint8Array, at: number, tree: RenderTree, datasets: string): Promise<boolean> {
    const identity = this.#identity;
    if (identity === undefined) return false;
    let check: FormRuntime | undefined;
    let answered = 0;
    try {
      const pdf = await openXfaPdf(saved);
      if (this.#cancelled) return false;
      check = await createFormRuntime(pdf, {
        host: identity.host,
        clock: { now: () => at },
        timezone: identity.timezone,
        ...(this.#options.limits === undefined ? {} : { limits: this.#options.limits }),
        messageBoxResult: (call) => (call.buttons === 0 ? 1 : (identity.answers[answered++] ?? null)),
        ...(this.#options.wasm === undefined ? {} : { wasm: this.#options.wasm }),
      });
      if (this.#cancelled) return false;
      check.load();
      return structurallyEqual(check.layout(), tree) && check.saveDatasets() === datasets;
    } catch {
      return false;
    } finally {
      try {
        check?.dispose();
      } catch {
        // The check is over; a teardown problem changes nothing.
      }
    }
  }

  /**
   * The PDF with the data written back. With a pack, the form's `preSave` handling comes first as an op (`{ kind: 'preSave', at }`,
   * applied as an op: it counts toward `opCount`, is refused with `LOG_FULL` once `opCount` reaches `MAX_OPS_PER_OPEN` (live edits stop at `MAX_OPS_PER_OPEN - 1`, the last slot being reserved for it), and is answered as `downloaded.op`
   * for the client's log), so a replay reproduces the live form that was saved. Without a pack nothing runs before the save.
   */
  async #download(at: number): Promise<ResponseBody> {
    const refused = this.#refused();
    if (refused !== undefined) return refused;
    const runtime = this.#runtime;
    if (runtime === undefined) return refusal('NOT_OPEN', 'no form is open; send open first');
    let entry: Extract<Op, { kind: 'preSave' }> | undefined;
    let validated: boolean | null = null;
    const requestsBefore = runtime.requests.length;
    if (this.#pack !== undefined) {
      if (this.#opCount >= MAX_OPS_PER_OPEN) return refusal('LOG_FULL', `the session holds ${MAX_OPS_PER_OPEN} ops; take a snapshot and open again from it`);
      const op: Extract<Op, { kind: 'preSave' }> = { kind: 'preSave', at };
      const done = this.#apply(runtime, op, null, false);
      if ('reply' in done) return done.reply;
      entry = op;
      validated = done.validated;
    } else {
      this.#now = at;
      this.#answers = [];
      this.#answered = 0;
    }
    try {
      const saved = await runtime.save();
      // A copy of exactly the file's bytes, so the caller may transfer its buffer: the engine keeps its own.
      const requests = runtime.requests.slice(requestsBefore).map((request) => ({ ...request }));
      return { kind: 'downloaded', bytes: saved.slice(), validated, ...(entry === undefined ? {} : { op: entry }), ...(requests.length === 0 ? {} : { requests }) };
    } catch (error) {
      // The preSave handling changed the live form, so after it no error leaves the run healthy.
      return this.#failure(runtime, error, null, { asks: false, endsRun: entry !== undefined });
    }
  }

  // ---- failures -------------------------------------------------------------------------------------------------------

  /**
   * Maps what a run threw to the reply, and frees the run when it ended. `opIndex` is the failing op's index in a replayed log,
   * or null (a live op, or work that is not an op). `asks` is true for an op: a choice box without an answer is `answerRequired`
   * for it, and `aborted` for work that cannot be answered (a layout, snapshot or download). `endsRun` is true when the engine
   * may already have changed the form (after a Validate click, or once a `preSave` broadcast started), so no error there leaves the run healthy.
   * A caller mistake the engine refused before changing anything leaves the run healthy (`failed`); everything else ends it.
   */
  #failure(runtime: FormRuntime, error: unknown, opIndex: number | null, how: { readonly asks: boolean; readonly endsRun: boolean } = { asks: false, endsRun: false }): ResponseBody {
    const mistake = !how.endsRun && (error instanceof Refusal || (runtime.state === 'loaded' && error instanceof XfaPdfError));
    if (mistake) {
      // During an open the log is bad, and there is no run to keep.
      if (this.#phase !== 'ready') this.#free('empty');
      return refusal(codeOf(error), textOf(error), opIndex ?? undefined);
    }
    this.#free('rebuild');
    if (error instanceof XfaAnswerRequiredError && how.asks) return { kind: 'answerRequired', call: { ...error.call }, opIndex };
    const limit = error instanceof XfaScriptError ? error.limit : undefined;
    const som = error instanceof XfaScriptError || error instanceof XfaRuntimeError ? error.nodeSom : undefined;
    return {
      kind: 'aborted',
      reason: { code: codeOf(error), ...(limit === undefined ? {} : { limit }), message: textOf(error) },
      ...(som === undefined ? {} : { som }),
      opIndex,
    };
  }
}
