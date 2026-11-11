import type { ScriptLimitKind } from './errors.js';

/** A thrown value reduced to plain data by the prelude (own data properties only; no accessor ever runs). */
export interface GuestError {
  readonly name: string;
  readonly message: string;
  readonly stack: string | undefined;
  /** True when the prelude saw an instance of the engine's own `InternalError` class. */
  readonly internal: boolean;
}

/**
 * QuickJS reports its own resource failures as `InternalError`s with fixed messages (verified against the pinned
 * 0.32.0 build). The class is the discriminator - a script's `throw new Error("stack overflow")` is an ordinary
 * script error - and the prelude removes the `InternalError` global, so a script can only mint one by borrowing the
 * constructor of an engine error it already caught, which at worst ends its own run.
 * Returns which budget the error belongs to, or `undefined` for a normal script error.
 */
export function limitKindOf(error: GuestError): ScriptLimitKind | undefined {
  if (!error.internal) return undefined;
  switch (error.message) {
    case 'stack overflow':
      return 'stack';
    case 'out of memory':
    case 'string too long':
      return 'memory';
    case 'interrupted':
      return 'deadline';
    default:
      return undefined;
  }
}

/**
 * True for the error a JS engine throws out of the WASM when QuickJS native recursion outruns the real host stack:
 * V8/JavaScriptCore "Maximum call stack size exceeded" (a RangeError) and Firefox "too much recursion" (an
 * InternalError). Matched by text because the class differs between engines.
 */
export function isHostStackOverflow(error: unknown): boolean {
  return error instanceof Error && /call stack size|too much recursion/i.test(error.message);
}
