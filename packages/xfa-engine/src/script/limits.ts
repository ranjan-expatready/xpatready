import { z } from 'zod';

/**
 * Budgets of one sandbox (one form run). Every default below is a security invariant (FD-38): they exist so a
 * hostile PDF's scripts cannot exhaust CPU, memory or the stack of the process that opens it. They are still
 * injectable - tests shrink them, and a deployment with a different risk appetite may pass its own - but nothing
 * a script, a form or a firm controls can raise them. One floor applies to a hosted worker session: it refuses a
 * `formRunDeadlineMs` below `MIN_FORM_RUN_DEADLINE_MS` (`worker/limits.ts`), because the op-log ceiling it also enforces is a count
 * that must fit this wall-clock budget.
 */
export interface SandboxLimits {
  /** Wall-clock budget of one outermost `evaluate`, host callbacks included. */
  readonly runDeadlineMs: number;
  /** Wall-clock budget of the whole form run (sum over all `evaluate` calls, and the host-side preparation of each script: `Sandbox.withinRunBudget`). */
  readonly formRunDeadlineMs: number;
  /** QuickJS heap cap. */
  readonly memoryLimitBytes: number;
  /** QuickJS stack cap. May be tightened but never raised above the default (see `DEFAULT_STACK_LIMIT_BYTES`). */
  readonly stackLimitBytes: number;
  /** Bridge calls allowed within one outermost `evaluate`. */
  readonly runBridgeCalls: number;
  /** Bridge calls allowed over the whole form run. */
  readonly formRunBridgeCalls: number;
  /** Longest JSON text accepted in either direction across the bridge, and longest returned script result. */
  readonly payloadChars: number;
  /** Longest script source accepted by `evaluate`. */
  readonly sourceChars: number;
  /** Deepest `evaluate` re-entrancy (a host method calling back into the sandbox). */
  readonly nestedEvaluations: number;
  /** Longest array the guest may hand to a native array builtin (QuickJS cannot interrupt those loops). */
  readonly arrayLength: number;
  /** Largest substring-search or RegExp-exec work (positions x pattern length) the guest may hand to a native string builtin. */
  readonly stringSearchWork: number;
  /** Longest RegExp source (characters) the guest may compile. */
  readonly regexpSourceChars: number;
  /** Longest string holding a non-ASCII character (characters) the guest may hand to a native Unicode normalization or collation builtin. */
  readonly normalizeChars: number;
}

/** FD-38 security invariant: default per-script wall-clock budget; generous for ~800 scripts, fatal for a spin loop. */
const DEFAULT_RUN_DEADLINE_MS = 5_000;
/** FD-38 security invariant: default wall-clock budget of a whole form run. */
const DEFAULT_FORM_RUN_DEADLINE_MS = 120_000;
/** FD-38 security invariant: default QuickJS heap cap (64 MiB); a form's scripts and 500 KB of data use a small fraction. */
const DEFAULT_MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;
/**
 * FD-38 security invariant: default QuickJS stack cap (256 KiB). Deep enough for any form recursion, and measured
 * to stay below the real WASM/V8 stack: at 384 KiB and above the engine overflows the host stack before its own check fires.
 */
const DEFAULT_STACK_LIMIT_BYTES = 256 * 1024;
/** FD-38 security invariant: default bridge calls per script run. */
const DEFAULT_RUN_BRIDGE_CALLS = 500_000;
/** FD-38 security invariant: default bridge calls per form run. */
const DEFAULT_FORM_RUN_BRIDGE_CALLS = 5_000_000;
/** FD-38 security invariant: default bridge/result payload cap (4 Mi characters); the largest legitimate value is a ~500 KB data string. */
const DEFAULT_PAYLOAD_CHARS = 4 * 1024 * 1024;
/** FD-38 security invariant: default script source cap (4 Mi characters). */
const DEFAULT_SOURCE_CHARS = 4 * 1024 * 1024;
/** FD-38 security invariant: default re-entrancy depth of `evaluate` (a wasm stack frame is held per level). */
const DEFAULT_NESTED_EVALUATIONS = 16;
/** FD-38 security invariant: default guest array length accepted by native builtins (4 Mi elements). */
const DEFAULT_ARRAY_LENGTH = 4 * 1024 * 1024;

/**
 * FD-38 security invariant: default ceiling on the work (positions x pattern length) of one native substring search or
 * RegExp exec (2^30, about 1.07e9 character comparisons). QuickJS polls its interrupt in bytecode only, and these loops are
 * native: `indexOf`, `lastIndexOf`, `includes`, string `split`/`replace`/`replaceAll`, and a RegExp whose source is long (the
 * matcher polls per backtrack, not per literal character, so a long literal source delays the stop by seconds to minutes),
 * cost haystack x needle and no deadline can stop them. Measured on the development machine: a search at the ceiling takes
 * about 0.5 s and a RegExp at the ceiling is stopped by the run deadline within tens of milliseconds. The real forms search
 * with needles of at most about 20 characters in strings of at most a few hundred kilobytes (about 1e7 at the extreme), so
 * the ceiling is about 100 times the largest real use. Nothing a script, a form or a firm controls can raise it.
 */
const MAX_STRING_SEARCH_WORK = 2 ** 30;
/**
 * FD-38 security invariant: default ceiling on the length of a RegExp source the guest may compile (2^16 characters).
 * QuickJS compiles a regular expression natively and without polling its interrupt, and the compile is quadratic in the number
 * of alternatives (a 524,288-character alternation takes seconds, a 2 Mi one minutes); a source of this length compiles in
 * about 0.1 s. The real forms' longest regular expression is about 20 characters, so the ceiling is over 3000 times it.
 */
const MAX_REGEXP_SOURCE_CHARS = 2 ** 16;
/**
 * FD-38 security invariant: default ceiling on the length of a non-ASCII string handed to `normalize` or `localeCompare`
 * (2^15 characters; an ASCII string is linear and uncapped). Canonical reordering of a run of combining marks is quadratic and native: 32,769 characters take about 0.8 s,
 * 131,073 take about 13 s, and a few hundred thousand take minutes. The real forms never normalize and compare only field
 * values of a few hundred characters, so the ceiling is over 100 times the largest real use.
 */
const MAX_NORMALIZE_CHARS = 2 ** 15;

export const DEFAULT_SANDBOX_LIMITS: SandboxLimits = Object.freeze({
  runDeadlineMs: DEFAULT_RUN_DEADLINE_MS,
  formRunDeadlineMs: DEFAULT_FORM_RUN_DEADLINE_MS,
  memoryLimitBytes: DEFAULT_MEMORY_LIMIT_BYTES,
  stackLimitBytes: DEFAULT_STACK_LIMIT_BYTES,
  runBridgeCalls: DEFAULT_RUN_BRIDGE_CALLS,
  formRunBridgeCalls: DEFAULT_FORM_RUN_BRIDGE_CALLS,
  payloadChars: DEFAULT_PAYLOAD_CHARS,
  sourceChars: DEFAULT_SOURCE_CHARS,
  nestedEvaluations: DEFAULT_NESTED_EVALUATIONS,
  arrayLength: DEFAULT_ARRAY_LENGTH,
  stringSearchWork: MAX_STRING_SEARCH_WORK,
  regexpSourceChars: MAX_REGEXP_SOURCE_CHARS,
  normalizeChars: MAX_NORMALIZE_CHARS,
});

const positiveInt = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

const limitsOverrideSchema = z.strictObject({
  runDeadlineMs: positiveInt,
  formRunDeadlineMs: positiveInt,
  memoryLimitBytes: positiveInt,
  // Tighten-only: above the measured-safe default the engine overflows the host stack before its own check fires.
  stackLimitBytes: positiveInt.max(DEFAULT_STACK_LIMIT_BYTES),
  runBridgeCalls: positiveInt,
  formRunBridgeCalls: positiveInt,
  payloadChars: positiveInt,
  sourceChars: positiveInt,
  nestedEvaluations: positiveInt,
  arrayLength: positiveInt,
  stringSearchWork: positiveInt,
  regexpSourceChars: positiveInt,
  normalizeChars: positiveInt,
}).partial();

/** Validates caller-supplied overrides (unknown keys and non-positive values are rejected) and merges them over the defaults. */
export function resolveLimits(overrides: Partial<SandboxLimits> | undefined): SandboxLimits {
  if (overrides === undefined) return DEFAULT_SANDBOX_LIMITS;
  const parsed = limitsOverrideSchema.parse(overrides);
  return Object.freeze({ ...DEFAULT_SANDBOX_LIMITS, ...definedOnly(parsed) });
}

function definedOnly(partial: { readonly [K in keyof SandboxLimits]?: number | undefined }): Partial<SandboxLimits> {
  const out: { -readonly [K in keyof SandboxLimits]?: number } = {};
  for (const key of Object.keys(DEFAULT_SANDBOX_LIMITS) as (keyof SandboxLimits)[]) {
    const value = partial[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}
