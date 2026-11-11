import { XfaPdfError } from '../pdf/errors.js';

/**
 * Typed failures of the script sandbox, members of the `XfaPdfError` family (one `instanceof` for callers). Every
 * failure the sandbox can produce is one of these - a hostile or buggy form script must never surface as a bare
 * `RangeError`, a QuickJS internal error, or a hang.
 */
export type XfaScriptErrorCode =
  /** A time, memory, stack, call-count or payload budget was exceeded. The sandbox is closed (fails closed). */
  | 'SCRIPT_LIMIT'
  /** The form's own script threw (or could not be compiled). The sandbox stays usable. */
  | 'SCRIPT_ERROR'
  /** Strict mode only: a script touched a member the host does not implement. The sandbox is closed. */
  | 'UNSUPPORTED_MEMBER'
  /** A bridge payload or host reply broke the wire contract (malformed, forbidden key, wrong shape). Closed. */
  | 'BRIDGE_VIOLATION'
  /** The host implementation threw something that is not an `XfaScriptError`. The sandbox is closed. */
  | 'HOST_ERROR'
  /** `evaluate` was called on a sandbox that already failed closed or was disposed. */
  | 'SANDBOX_CLOSED'
  /** The caller passed options the sandbox refuses (unknown limit, non-positive budget, malformed root node). */
  | 'INVALID_OPTIONS';

/** Which budget a `SCRIPT_LIMIT` error refers to. */
export type ScriptLimitKind =
  | 'deadline'
  | 'total-time'
  | 'memory'
  | 'stack'
  | 'array-length'
  /** A native substring search or RegExp exec whose work (positions x pattern length) is over `stringSearchWork`. */
  | 'string-work'
  /** A RegExp source longer than `regexpSourceChars`. */
  | 'regexp-source'
  /** A string over `normalizeChars` handed to `normalize` or `localeCompare`. */
  | 'string-length'
  | 'run-bridge-calls'
  | 'bridge-calls'
  | 'payload'
  | 'nesting'
  | 'source-size'
  /** The form DOM ceiling (nodes, items, value size) a script ran into (W02-T06). */
  | 'form-size'
  /** A host recorder (message boxes, focus requests, console lines) reached its entry ceiling (W02-T06). */
  | 'output';

/** Where in the form run a script was executing; supplied by the caller, echoed in errors. */
export interface ScriptLocation {
  readonly event?: string | undefined;
  readonly nodeSom?: string | undefined;
}

export interface XfaScriptErrorOptions {
  readonly cause?: unknown;
  readonly limit?: ScriptLimitKind | undefined;
  readonly location?: ScriptLocation | undefined;
  /** Stack trace reported by the guest engine (already clipped and escaped). */
  readonly guestStack?: string | undefined;
  /** Member name for `UNSUPPORTED_MEMBER` (already clipped and escaped). */
  readonly member?: string | undefined;
}

export class XfaScriptError extends XfaPdfError {
  declare readonly code: XfaScriptErrorCode;
  readonly limit: ScriptLimitKind | undefined;
  readonly event: string | undefined;
  readonly nodeSom: string | undefined;
  readonly guestStack: string | undefined;
  readonly member: string | undefined;

  constructor(code: XfaScriptErrorCode, message: string, options: XfaScriptErrorOptions = {}) {
    super(code, `${message}${describeLocation(options.location)}`, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'XfaScriptError';
    this.limit = options.limit;
    this.event = options.location?.event;
    this.nodeSom = options.location?.nodeSom;
    this.guestStack = options.guestStack;
    this.member = options.member;
  }
}

function describeLocation(location: ScriptLocation | undefined): string {
  if (location === undefined) return '';
  const parts: string[] = [];
  if (location.event !== undefined) parts.push(`event=${location.event}`);
  if (location.nodeSom !== undefined) parts.push(`node=${location.nodeSom}`);
  return parts.length === 0 ? '' : ` (${parts.join(', ')})`;
}
