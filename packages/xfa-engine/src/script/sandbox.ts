import { DefaultIntrinsics, Scope, type CustomizeVariantOptions, type QuickJSContext, type QuickJSHandle, type QuickJSRuntime, type QuickJSWASMModule } from 'quickjs-emscripten-core';
import { z } from 'zod';
import { Bridge, type BridgeFunction } from './bridge.js';
import { MAX_VALUE_DEPTH, bridgeValueSchema, callerNodeRefSchema } from './bridge-schema.js';
import type { BridgeValue, NodeRef, ScriptClock, ScriptHost, ScriptZone } from './bridge-types.js';
import { safeText } from '../pdf/safe-text.js';
import { XfaScriptError, type ScriptLimitKind, type ScriptLocation } from './errors.js';
import { isHostStackOverflow, limitKindOf, type GuestError } from './guest-error.js';
import { resolveLimits, type SandboxLimits } from './limits.js';
import { PRELUDE_SOURCE } from './prelude.js';
import { RegexLiteralGuard } from './regex-literals.js';
import { assertScriptObjectName, buildScriptObjectProgram } from './script-object.js';
import { createQuickJsModule } from './quickjs-loader.js';

export interface SandboxOptions {
  readonly host: ScriptHost;
  /** The `xfa` root object the guest sees as the global `xfa`. */
  readonly xfaRoot: NodeRef;
  /** Injected wall clock (D3); the guest `Date` is built on it. */
  readonly clock: ScriptClock;
  /** Injected timezone (D9); the guest `Date`'s local time is computed from it. Default: UTC. */
  readonly zone?: ScriptZone;
  /** Strict mode: touching an unsupported member is fatal (`UNSUPPORTED_MEMBER`). Default false. */
  readonly strict?: boolean;
  /** Overrides of the FD-38 security-invariant defaults (see `limits.ts`); budgets can only be tightened where noted there. */
  readonly limits?: Partial<SandboxLimits>;
  /** Where the QuickJS WebAssembly comes from, for hosts that must supply it (browser bundle, CDN, a shared compiled module). */
  readonly wasm?: SandboxWasmOptions;
}

export interface SandboxWasmOptions {
  readonly wasmLocation?: string;
  readonly wasmBinary?: ArrayBuffer;
  readonly wasmModule?: WebAssembly.Module;
}

export interface EvaluateOptions {
  /** Binds `this` in the script to this node. */
  readonly thisNode?: NodeRef;
  /** Evaluate as global code, so top-level declarations persist as globals for later `evaluate` calls. */
  readonly global?: boolean;
  /** Echoed in errors. */
  readonly event?: string;
  readonly nodeSom?: string;
}

export interface SandboxUsage {
  readonly runs: number;
  readonly bridgeCalls: number;
  readonly elapsedMs: number;
}

export interface SandboxDiagnostics {
  readonly memoryUsedBytes: number;
  readonly objectCount: number;
}

/** What starting this sandbox cost (A5): a private WASM module, then runtime + context + prelude. */
export interface SandboxTimings {
  readonly moduleInitMs: number;
  readonly setupMs: number;
}

/**
 * One form run's isolated script environment: its own QuickJS runtime + context, the guest prelude, and the host
 * bridge. Fails closed: after any fatal error (limit, bridge violation, host exception, strict unsupported member)
 * it is torn down and every later `evaluate` is a typed `SANDBOX_CLOSED`. A plain script error does not close it.
 */
export interface Sandbox {
  /**
   * Runs a form script and returns its completion value (a plain object or function result is `{ $t: 'undef' }`).
   * Re-entrant: a host method may call `evaluate` again (bounded by `limits.nestedEvaluations`).
   * @throws XfaScriptError - never a bare engine error.
   */
  evaluate(source: string, options?: EvaluateOptions): BridgeValue;
  /**
   * Runs one script file in its own function scope and binds what it declares (top-level functions and vars) as a
   * locked global `name`, so `name.helper(...)` works from every later script while the file's own references stay
   * inside the file. The file must parse as ES3. Throws `INVALID_OPTIONS` for an unusable or taken name and
   * `SCRIPT_ERROR` for a parse or initialisation failure (the name then stays free).
   */
  defineScriptObject(name: string, source: string, options?: { readonly event?: string }): void;
  /**
   * Runs host-side work that belongs to a script but happens outside `evaluate` (binding a script's names, building its
   * location text) and charges the time it takes to the form-run budget, exactly as an outermost `evaluate` is charged.
   * Refuses to start when the budget is already spent and, once `run` returns, fails closed with `SCRIPT_LIMIT`
   * (`total-time`) when it spent the rest: host code cannot be interrupted, so the budget is enforced at the edges of
   * each piece of work, which bounds a pass of many scripts by the budget plus the longest single piece. Work started
   * inside a running script is already inside that script's own time and is run as is. A script `run` evaluates is
   * charged by `evaluate`, not twice. `where` names the script in the error and is read only when an error is thrown.
   * @throws XfaScriptError - `SANDBOX_CLOSED` when closed; `SCRIPT_LIMIT` when the budget is spent; anything `run` throws.
   */
  withinRunBudget<T>(run: () => T, where?: () => EvaluateOptions): T;
  /** True once the sandbox failed closed or was disposed (including a dispose deferred until the running script returns). */
  readonly closed: boolean;
  readonly usage: SandboxUsage;
  readonly timings: SandboxTimings;
  /**
   * Set when freeing the QuickJS runtime failed (a handle leak, or state corrupted by a hostile script). The runtime's
   * memory is abandoned with its private WASM module; the process and other sandboxes are unaffected. `undefined` is the healthy case.
   */
  readonly teardownFailure: unknown;
  /** Live guest heap figures, for leak tripwires and telemetry. Throws `SANDBOX_CLOSED` once closed. */
  diagnostics(): SandboxDiagnostics;
  /** Frees the QuickJS runtime. Idempotent; deferred if called from inside a running script. */
  dispose(): void;
}

const BRIDGE_FUNCTIONS: readonly BridgeFunction[] = ['get', 'set', 'call', 'resolve', 'host', 'log'];

const hasMethods = <T extends object>(names: readonly string[]) => (value: unknown): value is T =>
  typeof value === 'object' && value !== null && names.every((name) => typeof Reflect.get(value, name) === 'function');

const optionsSchema = z.object({
  host: z.custom<ScriptHost>(hasMethods(['get', 'set', 'call', 'resolve', 'host', 'log']), 'host must implement ScriptHost'),
  clock: z.custom<ScriptClock>(hasMethods(['now']), 'clock must have a now() function'),
  xfaRoot: callerNodeRefSchema,
  zone: z.custom<ScriptZone>((v) => hasMethods(['offsetMs'])(v) && typeof Reflect.get(v, 'fixed') === 'boolean', 'zone must have fixed and offsetMs()').optional(),
  strict: z.boolean().optional(),
  wasm: z
    .strictObject({
      wasmLocation: z.string().min(1).optional(),
      wasmBinary: z.instanceof(ArrayBuffer).optional(),
      wasmModule: z.instanceof(WebAssembly.Module).optional(),
    })
    .optional(),
});
const evaluateOptionsSchema = z.strictObject({
  thisNode: callerNodeRefSchema.optional(),
  global: z.boolean().optional(),
  event: z.string().max(256).optional(),
  nodeSom: z.string().max(1024).optional(),
});
const memoryUsageSchema = z.object({ memory_used_size: z.number(), obj_count: z.number() });
const limitKindSchema = z.enum(['array-length', 'string-work', 'regexp-source', 'string-length']);
const guestErrorSchema = z.strictObject({
  name: z.string().max(64),
  message: z.string().max(2000),
  stack: z.string().max(4000),
  internal: z.boolean(),
});
const envelopeSchema = z.union([
  z.strictObject({ ok: z.literal(true), value: bridgeValueSchema }),
  z.strictObject({ ok: z.literal(false), error: guestErrorSchema }),
]);

/**
 * FD-38 security invariant: extra heap granted only while the prelude reads a thrown value after a failure, so even
 * an out-of-memory error can be described. Finite on purpose: the description reads data properties only and
 * allocates a few small strings.
 */
const ERROR_HEADROOM_BYTES = 1024 * 1024;

/** Message of the guest-visible exception that unwinds a script after a fatal error; the caller sees the real `fatal` instead. */
const TERMINATED = 'sandbox terminated';

/**
 * FD-38 exemption (correctness constant): a zone offset is at most a day either way (real zones stay within +-14 hours).
 * A bigger number is a bug in the zone provider, not a setting, and would put local time more than a day from UTC.
 */
const MAX_ZONE_OFFSET_MS = 24 * 3_600_000;

/** FD-38 exemption (correctness constant): ECMAScript's largest time value; instants asked of the zone are clamped to it. */
const MAX_TIME_VALUE_MS = 8.64e15;

/** What the guest gets when the caller injects no zone. */
const UTC_ZONE: ScriptZone = { fixed: true, offsetMs: () => 0 };

/** The prelude's view of the zone: the offset itself when it never changes, else 0 (the guest asks the host per instant). */
interface ZoneConfig {
  readonly fixed: boolean;
  readonly offsetMs: number;
}

function checkedOffset(offset: unknown): number {
  if (typeof offset !== 'number' || !Number.isFinite(offset) || Math.abs(offset) > MAX_ZONE_OFFSET_MS) return Number.NaN;
  return offset;
}

const pickRef = (ref: NodeRef): NodeRef => ({ id: ref.id, cls: ref.cls });

type GuestOutcome = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly error: GuestError };

const ABORTED: GuestError = { name: 'Error', message: 'script aborted by the engine', stack: undefined, internal: false };

export async function createSandbox(options: SandboxOptions): Promise<Sandbox> {
  const { limits, zone } = parseOptions(options);
  const started = performance.now();
  let module: QuickJSWASMModule;
  try {
    module = await createQuickJsModule(customizeFrom(options.wasm));
  } catch (error) {
    throw new XfaScriptError('HOST_ERROR', 'could not load the QuickJS WebAssembly module', { cause: error });
  }
  const moduleInitMs = performance.now() - started;
  return new QuickJsSandbox(module, options, limits, zone, moduleInitMs);
}

function customizeFrom(wasm: SandboxWasmOptions | undefined): CustomizeVariantOptions | undefined {
  if (wasm === undefined) return undefined;
  return {
    ...(wasm.wasmLocation === undefined ? {} : { wasmLocation: wasm.wasmLocation }),
    ...(wasm.wasmBinary === undefined ? {} : { wasmBinary: wasm.wasmBinary }),
    ...(wasm.wasmModule === undefined ? {} : { wasmModule: wasm.wasmModule }),
  };
}

function parseOptions(options: SandboxOptions): { readonly limits: SandboxLimits; readonly zone: ZoneConfig } {
  try {
    optionsSchema.parse(options);
    const zone = options.zone ?? UTC_ZONE;
    const offsetMs = zone.fixed ? checkedOffset(zone.offsetMs(0)) : 0;
    if (Number.isNaN(offsetMs)) throw new XfaScriptError('INVALID_OPTIONS', 'a fixed zone must answer a finite offset within one day');
    return { limits: resolveLimits(options.limits), zone: { fixed: zone.fixed, offsetMs } };
  } catch (error) {
    if (error instanceof z.ZodError) throw new XfaScriptError('INVALID_OPTIONS', 'invalid sandbox options', { cause: error });
    throw error;
  }
}

class QuickJsSandbox implements Sandbox {
  private readonly bridge: Bridge;
  private readonly frames: ScriptLocation[] = [];
  private readonly regexLiterals: RegexLiteralGuard;
  private runtime: QuickJSRuntime | undefined;
  private context: QuickJSContext | undefined;
  private execFn: QuickJSHandle | undefined;
  private fatal: XfaScriptError | undefined;
  private disposeRequested = false;
  private torn = false;
  private runs = 0;
  private totalElapsed = 0;
  private runStartedAt = 0;
  /** Depth of `withinRunBudget` sections open outside any script: work nested in one is already being timed by it. */
  private budgetDepth = 0;
  private deadlineAt = Number.POSITIVE_INFINITY;
  private deadlineKind: ScriptLimitKind = 'deadline';
  private poisoned = false;
  private teardownError: unknown;
  readonly timings: SandboxTimings;

  constructor(
    module: QuickJSWASMModule,
    private readonly options: SandboxOptions,
    private readonly limits: SandboxLimits,
    private readonly zone: ZoneConfig,
    moduleInitMs: number,
  ) {
    this.regexLiterals = new RegexLiteralGuard(limits.regexpSourceChars);
    this.bridge = new Bridge({ host: options.host, strict: options.strict ?? false, limits, locate: () => this.currentLocation() });
    const started = performance.now();
    try {
      this.initialise(module);
    } catch (error) {
      this.teardown();
      throw error;
    }
    this.timings = { moduleInitMs, setupMs: performance.now() - started };
  }

  get teardownFailure(): unknown {
    return this.teardownError;
  }

  get closed(): boolean {
    return this.torn || this.disposeRequested || this.fatal !== undefined;
  }

  get usage(): SandboxUsage {
    return { runs: this.runs, bridgeCalls: this.bridge.totalCalls, elapsedMs: this.totalElapsed };
  }

  diagnostics(): SandboxDiagnostics {
    const { runtime, context } = this.live();
    return Scope.withScope((scope) => {
      const usage = scope.manage(runtime.computeMemoryUsage());
      const parsed = memoryUsageSchema.parse(context.dump(usage));
      return { memoryUsedBytes: parsed.memory_used_size, objectCount: parsed.obj_count };
    });
  }

  dispose(): void {
    if (this.torn) return;
    if (this.frames.length > 0) {
      this.disposeRequested = true;
      return;
    }
    this.teardown();
  }

  defineScriptObject(name: string, source: string, options: { readonly event?: string } = {}): void {
    if (this.closed) throw new XfaScriptError('SANDBOX_CLOSED', 'sandbox is closed');
    assertScriptObjectName(name);
    if (source.length > this.limits.sourceChars) {
      this.refuse(this.limitError('source-size', `script object "${safeText(name, 64, true)}" is longer than ${this.limits.sourceChars} characters`));
    }
    const program = buildScriptObjectProgram(name, source);
    const where = { global: true, event: options.event ?? 'defineScriptObject', nodeSom: name };
    if (this.evaluate(`${JSON.stringify(name)} in globalThis`, where) === true) {
      throw new XfaScriptError('INVALID_OPTIONS', `"${name}" is already a global name and cannot be a script object name`);
    }
    this.evaluate(program, where);
  }

  evaluate(source: string, options: EvaluateOptions = {}): BridgeValue {
    this.validateEvaluateOptions(options);
    if (this.closed) throw new XfaScriptError('SANDBOX_CLOSED', 'sandbox is closed', { location: this.locationOf(options) });
    const outermost = this.frames.length === 0;
    this.frames.push(this.locationOf(options));
    try {
      this.admit(source, outermost);
      return this.conclude(this.runGuestGuarded(source, options));
    } catch (error) {
      throw this.failFor(error);
    } finally {
      this.frames.pop();
      if (outermost) this.finishOutermost();
    }
  }

  withinRunBudget<T>(run: () => T, where?: () => EvaluateOptions): T {
    if (this.closed) throw new XfaScriptError('SANDBOX_CLOSED', 'sandbox is closed', { location: this.locationOfLazily(where) });
    if (this.frames.length > 0 || this.budgetDepth > 0) return run();
    if (this.totalElapsed >= this.limits.formRunDeadlineMs) this.exhausted(where);
    const started = performance.now();
    const chargedBefore = this.totalElapsed;
    let result: T;
    this.budgetDepth += 1;
    try {
      result = run();
    } finally {
      this.budgetDepth -= 1;
      // A script `run` evaluated added its own time to the total; only the rest of the section is host time.
      this.totalElapsed += Math.max(0, performance.now() - started - (this.totalElapsed - chargedBefore));
    }
    if (this.totalElapsed >= this.limits.formRunDeadlineMs) this.exhausted(where);
    return result;
  }

  // ----------------------------------------------------------------------------------------------- set-up

  private initialise(module: QuickJSWASMModule): void {
    const runtime = module.newRuntime();
    this.runtime = runtime;
    runtime.setMemoryLimit(this.limits.memoryLimitBytes);
    runtime.setMaxStackSize(this.limits.stackLimitBytes);
    runtime.setInterruptHandler(() => this.shouldInterrupt());
    // No Promise: nothing in an ES3 form needs it, and without it no job queue can outlive a script run.
    const context = runtime.newContext({ intrinsics: { ...DefaultIntrinsics, Promise: false } });
    this.context = context;
    this.execFn = Scope.withScope((scope) => {
      const bridgeObject = scope.manage(context.newObject());
      const expose = (name: string, run: (argument: QuickJSHandle) => QuickJSHandle): void => {
        const fn = scope.manage(context.newFunction(name, (argument) => this.guestCall(() => run(argument))));
        context.setProp(bridgeObject, name, fn);
      };
      for (const name of BRIDGE_FUNCTIONS) {
        expose(name, (payload) => context.newString(this.bridge.dispatch(name, context.getString(payload))));
      }
      // Internal imports of the prelude (not part of `ScriptHost`): the injected clock, the native-loop guard, and
      // the finite extra heap used while a thrown value is described. They share the bridge's fatal-error path.
      expose('now', () => context.newNumber(this.clockReading()));
      expose('tz', (instant) => context.newNumber(this.zoneReading(context.getNumber(instant))));
      expose('limit', (kind) => this.guestLimit(context.getString(kind)));
      expose('headroom', () => this.grantHeadroom(context));

      const factory = scope.manage(context.unwrapResult(context.evalCode(PRELUDE_SOURCE, 'xfa-prelude.js', { type: 'global' })));
      const config = scope.manage(
        context.newString(
          JSON.stringify({
            xfa: pickRef(this.options.xfaRoot),
            arrayLength: this.limits.arrayLength,
            stringSearchWork: this.limits.stringSearchWork,
            regexpSourceChars: this.limits.regexpSourceChars,
            normalizeChars: this.limits.normalizeChars,
            valueDepth: MAX_VALUE_DEPTH,
            zone: this.zone,
          }),
        ),
      );
      return context.unwrapResult(context.callFunction(factory, context.undefined, [bridgeObject, config]));
    });
  }

  // --------------------------------------------------------------------------------------- guest callbacks

  /**
   * Runs one guest -> host call. Whatever goes wrong - a host exception, a contract violation, a limit - is recorded
   * as fatal and unwinds the guest with a generic error; the caller of `evaluate` sees the recorded error instead.
   */
  private guestCall(run: () => QuickJSHandle): QuickJSHandle {
    if (this.fatal !== undefined) throw new Error(TERMINATED);
    try {
      return run();
    } catch (error) {
      this.setFatal(error instanceof XfaScriptError ? error : this.hostFailure(error));
      throw new Error(TERMINATED);
    }
  }

  private clockReading(): number {
    const reading = this.options.clock.now();
    if (!Number.isFinite(reading)) throw this.fail('BRIDGE_VIOLATION', 'injected clock returned a non-finite time');
    return reading;
  }

  /** The offset of the injected zone at a UTC instant; only a zone that changes is ever asked (a fixed zone's offset is in the prelude's config). */
  private zoneReading(instant: number): number {
    const zone = this.options.zone;
    const asked = Math.max(-MAX_TIME_VALUE_MS, Math.min(MAX_TIME_VALUE_MS, Number.isNaN(instant) ? 0 : instant));
    const offset = zone === undefined ? 0 : checkedOffset(zone.offsetMs(asked));
    if (Number.isNaN(offset)) throw this.fail('BRIDGE_VIOLATION', 'injected zone returned an offset that is not a finite number within one day');
    return offset;
  }

  private guestLimit(kind: string): never {
    const parsed = limitKindSchema.parse(kind);
    const messages = {
      'array-length': `array longer than ${this.limits.arrayLength} elements passed to a native builtin`,
      'string-work': `native string search or RegExp exec of more than ${this.limits.stringSearchWork} character comparisons (positions x pattern length)`,
      'regexp-source': `RegExp source longer than ${this.limits.regexpSourceChars} characters`,
      'string-length': `non-ASCII string longer than ${this.limits.normalizeChars} characters passed to normalize or localeCompare`,
    } as const;
    throw this.limitError(parsed, messages[parsed]);
  }

  private grantHeadroom(context: QuickJSContext): QuickJSHandle {
    this.live().runtime.setMemoryLimit(this.limits.memoryLimitBytes + ERROR_HEADROOM_BYTES);
    return context.undefined;
  }

  private shouldInterrupt(): boolean {
    if (this.fatal !== undefined) return true;
    if (this.frames.length === 0 || performance.now() <= this.deadlineAt) return false;
    this.setFatal(this.deadlineError(this.deadlineKind));
    return true;
  }

  // ------------------------------------------------------------------------------------------ evaluation

  private validateEvaluateOptions(options: EvaluateOptions): void {
    const parsed = evaluateOptionsSchema.safeParse(options);
    if (!parsed.success) throw new XfaScriptError('INVALID_OPTIONS', 'invalid evaluate options', { cause: parsed.error });
  }

  /** Pre-flight for one `evaluate`: size, nesting and (for an outermost run) arming the time budget. */
  private admit(source: string, outermost: boolean): void {
    // Armed first, so the static scan below is charged to the run and a refusal adds this run's own time, never time since the clock's origin.
    if (outermost) this.runStartedAt = performance.now();
    if (source.length > this.limits.sourceChars) {
      throw this.limitError('source-size', `script is longer than ${this.limits.sourceChars} characters`);
    }
    if (this.frames.length > this.limits.nestedEvaluations) {
      throw this.limitError('nesting', `script re-entered the sandbox more than ${this.limits.nestedEvaluations} levels deep`);
    }
    // Every script source enters QuickJS through `evaluate` (a script object as the program `buildScriptObjectProgram` wraps), so this is the one place a regular-expression literal is seen before it compiles.
    if (this.regexLiterals.exceeding(source) !== undefined) this.guestLimit('regexp-source');
    if (!outermost) return;
    this.runs += 1;
    this.bridge.beginRun();
    const remaining = this.limits.formRunDeadlineMs - this.totalElapsed;
    if (remaining <= 0) throw this.limitError('total-time', `form run exceeded ${this.limits.formRunDeadlineMs} ms`);
    const total = remaining < this.limits.runDeadlineMs;
    this.deadlineKind = total ? 'total-time' : 'deadline';
    this.deadlineAt = this.runStartedAt + (total ? remaining : this.limits.runDeadlineMs);
  }

  /**
   * Runs the script, turning an exception thrown out of the WASM itself (QuickJS native recursion outrunning the
   * host stack, a trap) into a typed error. After that the runtime's state is unknown, so it is never freed again:
   * it is abandoned together with its private module.
   */
  private runGuestGuarded(source: string, options: EvaluateOptions): GuestOutcome {
    try {
      return this.runGuest(source, options);
    } catch (error) {
      if (error instanceof XfaScriptError) throw error;
      this.poisoned = true;
      if (isHostStackOverflow(error)) throw this.limitError('stack', 'guest native recursion exhausted the host stack');
      throw this.hostFailure(error);
    }
  }

  private runGuest(source: string, options: EvaluateOptions): GuestOutcome {
    const { runtime, context } = this.live();
    const execFn = this.execFn;
    if (execFn === undefined) throw new XfaScriptError('SANDBOX_CLOSED', 'sandbox is closed');
    try {
      return Scope.withScope((scope) => {
        const code = scope.manage(context.newString(source));
        const thisNode = scope.manage(context.newString(options.thisNode === undefined ? '' : JSON.stringify(pickRef(options.thisNode))));
        const asGlobal = options.global === true ? context.true : context.false;
        const result = scope.manage(context.callFunction(execFn, context.undefined, [code, thisNode, asGlobal]));
        // The prelude catches everything catchable and returns an envelope; an error handle here is an engine
        // abort (the interrupt), which `fatal` already explains. Its content is never read: it is guest-reachable.
        if (result.error !== undefined) return { ok: false, error: ABORTED };
        return { ok: true, text: context.getString(result.value) };
      });
    } finally {
      this.restoreHeapCap(runtime);
    }
  }

  /** Puts the heap cap back after a failure lifted it; a runtime a trap unwound through may refuse, and is abandoned anyway. */
  private restoreHeapCap(runtime: QuickJSRuntime): void {
    try {
      runtime.setMemoryLimit(this.limits.memoryLimitBytes);
    } catch (error) {
      if (!this.poisoned) throw error;
    }
  }

  /** Turns a finished guest call into a value, or throws the typed error that explains why there is none. */
  private conclude(outcome: GuestOutcome): BridgeValue {
    if (this.fatal !== undefined) throw this.fatal;
    if (!outcome.ok) throw this.errorFromGuest(outcome.error);
    if (outcome.text.length > this.limits.payloadChars) {
      throw this.limitError('payload', `script result is longer than ${this.limits.payloadChars} characters`);
    }
    const parsed = envelopeSchema.safeParse(JSON.parse(outcome.text));
    if (!parsed.success) throw this.fail('BRIDGE_VIOLATION', 'script result violates the wire contract');
    if (!parsed.data.ok) throw this.errorFromGuest({ ...parsed.data.error, stack: parsed.data.error.stack === '' ? undefined : parsed.data.error.stack });
    return parsed.data.value;
  }

  private errorFromGuest(error: GuestError): XfaScriptError {
    const kind = limitKindOf(error);
    if (kind !== undefined) return this.limitError(kind, `guest engine reported "${safeText(error.message, 64, true)}"`);
    return new XfaScriptError('SCRIPT_ERROR', `${safeText(error.name, 64, true)}: ${safeText(error.message, 400, true)}`, {
      location: this.currentLocation(),
      ...(error.stack === undefined ? {} : { guestStack: safeText(error.stack, 1500, true) }),
    });
  }

  /** Normalises anything thrown while evaluating into an `XfaScriptError`, recording it as fatal when it is. */
  private failFor(error: unknown): XfaScriptError {
    const typed = error instanceof XfaScriptError ? error : this.hostFailure(error);
    if (typed.code !== 'SCRIPT_ERROR' && typed.code !== 'INVALID_OPTIONS' && typed.code !== 'SANDBOX_CLOSED') this.setFatal(typed);
    return typed;
  }

  private finishOutermost(): void {
    this.totalElapsed += performance.now() - this.runStartedAt;
    this.deadlineAt = Number.POSITIVE_INFINITY;
    if (this.fatal !== undefined || this.disposeRequested) this.teardown();
  }

  // ------------------------------------------------------------------------------------------ errors

  /** Records a fatal error raised outside any running script and closes the sandbox now (inside a script, the outermost run closes it). */
  private refuse(error: XfaScriptError): never {
    this.setFatal(error);
    if (this.frames.length === 0) this.teardown();
    throw error;
  }

  /** The form-run budget is spent by host work outside any script: fails closed with the same `total-time` error a script would get. */
  private exhausted(where: (() => EvaluateOptions) | undefined): never {
    this.refuse(this.limitErrorAt('total-time', `form run exceeded ${this.limits.formRunDeadlineMs} ms`, this.locationOfLazily(where)));
  }

  private setFatal(error: XfaScriptError): void {
    this.fatal ??= error;
  }

  private hostFailure(error: unknown): XfaScriptError {
    return new XfaScriptError('HOST_ERROR', 'unexpected failure while running a script', { cause: error, location: this.currentLocation() });
  }

  private fail(code: XfaScriptError['code'], message: string): XfaScriptError {
    return new XfaScriptError(code, message, { location: this.currentLocation() });
  }

  private limitError(kind: ScriptLimitKind, message: string): XfaScriptError {
    return this.limitErrorAt(kind, message, this.currentLocation());
  }

  private limitErrorAt(kind: ScriptLimitKind, message: string, location: ScriptLocation | undefined): XfaScriptError {
    return new XfaScriptError('SCRIPT_LIMIT', message, { limit: kind, location });
  }

  private deadlineError(kind: ScriptLimitKind): XfaScriptError {
    const message =
      kind === 'total-time' ? `form run exceeded ${this.limits.formRunDeadlineMs} ms` : `script ran longer than ${this.limits.runDeadlineMs} ms`;
    return this.limitError(kind, message);
  }

  private currentLocation(): ScriptLocation | undefined {
    return this.frames.at(-1);
  }

  private locationOfLazily(where: (() => EvaluateOptions) | undefined): ScriptLocation | undefined {
    return where === undefined ? undefined : this.locationOf(where());
  }

  private locationOf(options: EvaluateOptions): ScriptLocation {
    return {
      ...(options.event === undefined ? {} : { event: safeText(options.event, 80, true) }),
      ...(options.nodeSom === undefined ? {} : { nodeSom: safeText(options.nodeSom, 200, true) }),
    };
  }

  // ------------------------------------------------------------------------------------------ teardown

  private live(): { runtime: QuickJSRuntime; context: QuickJSContext } {
    if (this.torn || this.runtime === undefined || this.context === undefined) {
      throw new XfaScriptError('SANDBOX_CLOSED', 'sandbox is closed');
    }
    return { runtime: this.runtime, context: this.context };
  }

  /**
   * Releases every QuickJS handle: function handle, then context, then runtime. A leaked object handle makes the
   * runtime free abort loudly; that is recorded in `teardownFailure`, and thrown only when no fatal error already
   * explains the closure (a hostile script can corrupt the runtime, and its typed error is the better report).
   */
  private teardown(): void {
    if (this.torn) return;
    this.torn = true;
    const { execFn, context, runtime } = this;
    this.execFn = undefined;
    this.context = undefined;
    this.runtime = undefined;
    if (this.poisoned) return;
    try {
      try {
        if (execFn?.alive) execFn.dispose();
        if (context?.alive) context.dispose();
      } finally {
        if (runtime?.alive) runtime.dispose();
      }
    } catch (error) {
      this.teardownError = error;
      if (this.fatal === undefined) throw error;
    }
  }
}
