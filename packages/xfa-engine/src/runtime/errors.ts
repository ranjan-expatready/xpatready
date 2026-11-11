import { XfaPdfError } from '../pdf/errors.js';
import { safeText } from '../pdf/safe-text.js';
import type { XfaFormError } from '../model/form/errors.js';
import type { MessageBoxCall } from './options.js';
import { XfaScriptError, type ScriptLocation } from '../script/errors.js';

/**
 * Typed failures of the form runtime itself (as opposed to a form script, which fails with `XfaScriptError`, or the
 * form DOM, which fails with `XfaFormError`). All three are `XfaPdfError` subclasses.
 */
export type XfaRuntimeErrorCode =
  /** The options given to `createFormRuntime` are malformed or ask for something the engine does not provide. */
  | 'INVALID_OPTIONS'
  /** A call argument (SOM text, activity name, value, event field) is malformed. The run stays usable. */
  | 'INVALID_ARGUMENT'
  /** The SOM text resolves to no node. The run stays usable. */
  | 'NODE_NOT_FOUND'
  /** `setValue` / `event` / `getValue` before `load()`. */
  | 'NOT_LOADED'
  /** `load()` called twice: one form run per runtime. */
  | 'ALREADY_LOADED'
  /** An earlier script or runtime failure aborted this run; its state is undefined and it accepts no more work. */
  | 'RUN_ABORTED'
  /** The runtime was disposed. */
  | 'DISPOSED'
  /** The calculate scripts still changed values after the pass ceiling: the form's calculations do not settle. */
  | 'CALC_NOT_CONVERGED'
  /** A FormCalc reference calculate names no node. */
  | 'FORMCALC_UNRESOLVED'
  /**
   * A choice message box (buttons other than OK-only) was raised and the caller's `messageBoxResult` answered `null`
   * ("unanswered"). Not a script failure: the form did nothing wrong. The run is aborted like any other (its state is
   * undefined, `XfaAnswerRequiredError.call` carries the box); the host asks its user and runs the form again with the answer.
   */
  | 'ANSWER_REQUIRED';

export interface XfaRuntimeErrorOptions {
  readonly cause?: unknown;
  /** Canonical SOM of the node the failure concerns. Form-controlled text: clipped and escaped before it is echoed. */
  readonly nodeSom?: string | undefined;
  readonly event?: string | undefined;
}

export class XfaRuntimeError extends XfaPdfError {
  declare readonly code: XfaRuntimeErrorCode;
  readonly nodeSom: string | undefined;
  readonly event: string | undefined;

  constructor(code: XfaRuntimeErrorCode, message: string, options: XfaRuntimeErrorOptions = {}) {
    const where: string[] = [];
    if (options.event !== undefined) where.push(`event=${safeText(options.event, 80, true)}`);
    if (options.nodeSom !== undefined) where.push(`node=${safeText(options.nodeSom, 200, true)}`);
    super(code, where.length === 0 ? message : `${message} (${where.join(', ')})`, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'XfaRuntimeError';
    this.nodeSom = options.nodeSom === undefined ? undefined : safeText(options.nodeSom, 200, true);
    this.event = options.event === undefined ? undefined : safeText(options.event, 80, true);
  }
}

/** `ANSWER_REQUIRED`: the run needs the user's answer to `call` and the host gave none (see `FormRuntimeOptions.messageBoxResult`). */
export class XfaAnswerRequiredError extends XfaRuntimeError {
  readonly call: MessageBoxCall;

  constructor(call: MessageBoxCall, options: Pick<XfaRuntimeErrorOptions, 'nodeSom' | 'event'> = {}) {
    super('ANSWER_REQUIRED', 'a message box needs an answer the host did not give', options);
    this.name = 'XfaAnswerRequiredError';
    this.call = call;
  }
}

/**
 * The ONE mapping of a form DOM `LIMIT` to the run's error: fatal `SCRIPT_LIMIT` (`form-size`), whether a script caused it
 * (through the host bridge) or the caller did (`setValue`). It bounds resources, so a script cannot absorb it in a try/catch loop.
 */
export function formSizeLimit(error: XfaFormError, where?: ScriptLocation): XfaScriptError {
  return new XfaScriptError('SCRIPT_LIMIT', safeText(error.message, 200, true), { limit: 'form-size', cause: error, ...(where === undefined ? {} : { location: where }) });
}
