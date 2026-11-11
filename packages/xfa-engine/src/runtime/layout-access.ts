import { z } from 'zod';
import type { LaidOutForm } from '../layout/paginate/index.js';
import type { FormDom } from '../model/form/index.js';
import { XfaRuntimeError } from './errors.js';
import type { FormRuntime } from './options.js';

/**
 * What the engine's own tests and the render tree (W02-T12) read from a runtime besides its public members: the form DOM it
 * runs and the layout it keeps. Not part of `FormRuntime` and not exported from the package index: a runtime is registered
 * here by `createFormRuntime`, and `layoutAccessOf` hands the registration back for that runtime only.
 */
export interface RuntimeLayoutAccess {
  /** The form DOM the runtime's scripts run on. */
  readonly dom: FormDom;
  /**
   * The layout of the form as it stands. It is brought up to date here first when the form changed since the last layout
   * (`setValue` does not lay out; dispatches, saves and the end of `load()` do). Like any call that runs scripts, a script
   * failure aborts the run. `NOT_LOADED` before `load()`.
   */
  layout(): LaidOutForm;
  /** The `font.*` issues of the document's fonts (`XfaPdf.fonts()` and the program reader), for the render tree's `issues`. */
  readonly fontIssues: readonly string[];
  /** How many layout settles the runtime has run: a call that found the layout current is not one (the layout is made lazily, so a batch of writes is one). */
  readonly settles: number;
  /** How many render trees `runtime.layout()` has built: a call that found its tree cached is not one. */
  readonly treeBuilds: number;
}

const registry = new WeakMap<object, RuntimeLayoutAccess>();

const accessSchema = z.custom<RuntimeLayoutAccess>((value) => typeof value === 'object' && value !== null && typeof Reflect.get(value, 'layout') === 'function');

/** Records the layout access of a runtime. Called once by `createFormRuntime`. */
export function registerLayoutAccess(runtime: FormRuntime, access: RuntimeLayoutAccess): void {
  registry.set(runtime, accessSchema.parse(access));
}

/** The layout access of a runtime made by `createFormRuntime`; `INVALID_ARGUMENT` for anything else. */
export function layoutAccessOf(runtime: FormRuntime): RuntimeLayoutAccess {
  const found = registry.get(runtime);
  if (found === undefined) throw new XfaRuntimeError('INVALID_ARGUMENT', 'the argument is not a runtime made by createFormRuntime');
  return found;
}
