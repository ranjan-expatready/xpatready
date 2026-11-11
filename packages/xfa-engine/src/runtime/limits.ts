import { z } from 'zod';
import { DEFAULT_FORM_LIMITS } from '../model/form/index.js';
import { resolveLimits, type SandboxLimits } from '../script/limits.js';
import { MAX_EVENT_TEXT_CHARS, MAX_RECORDED_ENTRIES } from '../wire-limits.js';
import { XfaRuntimeError } from './errors.js';

/**
 * FD-38 exemption (correctness constant): most passes the calculate settle loop makes before it declares the form's
 * calculations non-convergent. A well-formed dependency chain settles in as many passes as it is long and the real
 * forms need one; ten leaves room for deeper chains while a calculate that changes a value on every pass (a counter)
 * is stopped immediately. A different ceiling cannot make a divergent form converge, so no firm or operator has a
 * reason to raise it; a caller may only tighten it.
 */
export const MAX_CALC_PASSES = 10;

/**
 * FD-38 exemption (security invariant): deepest nesting of the exec members (`execEvent`, `execInitialize`,
 * `execCalculate`, `execValidate`, `recalculate`: a script that runs a node's script, which runs another ...). Every level holds a QuickJS frame and a WebAssembly stack frame, so the depth is bounded
 * below the sandbox's own re-entrancy ceiling; the real forms nest two levels. A caller may only tighten it.
 */
export const MAX_EXEC_EVENT_DEPTH = 8;

/** Declared in `wire-limits.ts`, with their FD-38 arguments (the protocol's schemas need them without the engine). */
export { MAX_EVENT_TEXT_CHARS, MAX_RECORDED_ENTRIES };

/**
 * FD-38 exemption (security invariant): most bytes (UTF-16, two per character) all recorders together keep in one run.
 * The entry ceiling alone allows 100,000 entries of 64 KiB characters each; this bounds the total at 8 MiB, which holds
 * thousands of real messages (a few hundred bytes each). A caller may only tighten it.
 */
export const MAX_RECORDED_BYTES = 8 * 1024 * 1024;

/**
 * FD-38 exemption (security invariant): most distinct undeclared names one script may use. The binder resolves each one
 * against the form tree before the script runs (a set lookup per enclosing scope), so the count bounds that work, and
 * the size of the binding line the script gets, for a hostile script; the real forms' longest script names a few dozen,
 * so 2,000 leaves forty times that.
 */
export const MAX_FREE_NAMES_PER_SCRIPT = 2_000;

/**
 * FD-38 exemption (security invariant): most layout passes one layout settle makes. A pass paginates the form and runs its
 * `ready:$layout` scripts; a script that changes what the layout reads (a size, a presence, a value the layout shows)
 * asks for another pass, so a script that undoes or redoes its own change on every pass would otherwise repeat forever,
 * each pass a whole layout. A form whose scripts settle needs two passes (the change, then the pass that finds nothing to
 * change) and the real forms need one; four leaves room for a chain. A different ceiling cannot make a script that keeps
 * changing the form stop, so no firm or operator has a reason to raise it; a caller may only tighten it. Hitting it is
 * reported in the layout's `issues` and the last layout stands; the run is not aborted.
 */
export const MAX_LAYOUT_PASSES = 4;

export interface RuntimeOnlyLimits {
  readonly maxCalcPasses: number;
  readonly maxLayoutPasses: number;
  readonly maxExecEventDepth: number;
  readonly maxRecordedEntries: number;
  readonly maxRecordedBytes: number;
  /** Most nodes the form DOM may register (the model's own ceiling, tightened). */
  readonly maxFormNodes: number;
}

/** Everything a caller may tighten: the sandbox budgets plus the runtime ceilings above. Every key is optional. */
export type RuntimeLimits = Partial<SandboxLimits> & Partial<RuntimeOnlyLimits>;

const tighten = (ceiling: number) => z.number().int().positive().max(ceiling);

const runtimeOnlySchema = z.strictObject({
  maxCalcPasses: tighten(MAX_CALC_PASSES),
  maxLayoutPasses: tighten(MAX_LAYOUT_PASSES),
  maxExecEventDepth: tighten(MAX_EXEC_EVENT_DEPTH),
  maxRecordedEntries: tighten(MAX_RECORDED_ENTRIES),
  maxRecordedBytes: tighten(MAX_RECORDED_BYTES),
  maxFormNodes: tighten(DEFAULT_FORM_LIMITS.maxNodes),
}).partial();

const RUNTIME_KEYS: ReadonlySet<string> = new Set(['maxCalcPasses', 'maxLayoutPasses', 'maxExecEventDepth', 'maxRecordedEntries', 'maxRecordedBytes', 'maxFormNodes']);

export interface ResolvedLimits {
  readonly runtime: RuntimeOnlyLimits;
  readonly sandbox: SandboxLimits;
}

/**
 * Validates caller-supplied limits (unknown keys and values above a ceiling are `INVALID_OPTIONS`) and merges them
 * over the defaults. The sandbox keys are validated by the sandbox's own resolver.
 */
export function resolveRuntimeLimits(input: unknown): ResolvedLimits {
  const defaults: RuntimeOnlyLimits = {
    maxCalcPasses: MAX_CALC_PASSES,
    maxLayoutPasses: MAX_LAYOUT_PASSES,
    maxExecEventDepth: MAX_EXEC_EVENT_DEPTH,
    maxRecordedEntries: MAX_RECORDED_ENTRIES,
    maxRecordedBytes: MAX_RECORDED_BYTES,
    maxFormNodes: DEFAULT_FORM_LIMITS.maxNodes,
  };
  if (input === undefined) return { runtime: defaults, sandbox: resolveLimits(undefined) };
  const parsedRecord = z.record(z.string(), z.unknown()).safeParse(input);
  if (!parsedRecord.success) throw new XfaRuntimeError('INVALID_OPTIONS', 'limits must be an object', { cause: parsedRecord.error });
  const runtimePart: Record<string, unknown> = {};
  const sandboxPart: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsedRecord.data)) (RUNTIME_KEYS.has(key) ? runtimePart : sandboxPart)[key] = value;
  const runtime = runtimeOnlySchema.safeParse(runtimePart);
  if (!runtime.success) throw new XfaRuntimeError('INVALID_OPTIONS', 'invalid runtime limits (a limit can only be tightened)', { cause: runtime.error });
  try {
    return {
      runtime: { ...defaults, ...definedOnly(runtime.data) },
      sandbox: resolveLimits(sandboxPart),
    };
  } catch (error) {
    if (error instanceof z.ZodError) throw new XfaRuntimeError('INVALID_OPTIONS', 'invalid sandbox limits', { cause: error });
    throw error;
  }
}

function definedOnly(partial: Partial<Record<keyof RuntimeOnlyLimits, number | undefined>>): Partial<RuntimeOnlyLimits> {
  const out: { -readonly [K in keyof RuntimeOnlyLimits]?: number } = {};
  for (const key of RUNTIME_KEYS as ReadonlySet<keyof RuntimeOnlyLimits>) {
    const value = partial[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}
