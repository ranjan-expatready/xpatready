import { safeText } from '../pdf/safe-text.js';
import { XfaScriptError } from './errors.js';

/**
 * FD-38 exemption (security invariant): most syntax-tree nodes one pass of the host's analysis of a script may walk before
 * it refuses the script. Each pass (the free-name declarations, the free-name walk, the script-object exports) counts
 * against a budget of its own, so the ceiling is the same for an event script and a script object. The passes are
 * iterative, so this bounds their time and memory rather than the host stack; a script gets one node for about every two characters of source at best, so the sandbox's own source ceiling
 * (4 Mi characters) is not far above it, while the largest real script is a few thousand nodes.
 */
export const MAX_SCRIPT_AST_NODES = 1_000_000;

/** A node of the tree `acorn` parses a script into. */
export interface AstNode {
  readonly type: string;
  readonly [key: string]: unknown;
}

export const isNode = (value: unknown): value is AstNode =>
  typeof value === 'object' && value !== null && typeof Reflect.get(value, 'type') === 'string';

/** The message `acorn` raises (as a `SyntaxError`) when its own recursion runs out of host stack on deeply nested source. */
const PARSER_STACK_MESSAGE = 'Not enough stack space to parse input';

/**
 * The typed error for source `acorn` could not parse. A parser that ran out of stack (a `RangeError`, or `acorn`'s own
 * stack message) is nesting past what the host can hold, which a limit names: `SCRIPT_LIMIT` (`source-size`). Any other
 * failure is the script's own syntax error, `SCRIPT_ERROR`. `subject` names what was parsed (`script`, `script object "x"`).
 */
export function parseFailure(error: unknown, subject: string): XfaScriptError {
  if (error instanceof RangeError || (error instanceof SyntaxError && error.message.startsWith(PARSER_STACK_MESSAGE))) {
    return new XfaScriptError('SCRIPT_LIMIT', `${subject} is nested too deeply to analyse`, { limit: 'source-size', cause: error });
  }
  const reason = error instanceof Error ? error.message : 'parse error';
  return new XfaScriptError('SCRIPT_ERROR', `${subject} is not valid ES3 JavaScript: ${safeText(reason, 200, true)}`, { cause: error });
}

/** Counts the nodes one analysis visits; the visit past `MAX_SCRIPT_AST_NODES` is a typed `SCRIPT_LIMIT`. */
export class AstBudget {
  #left = MAX_SCRIPT_AST_NODES;

  spend(): void {
    this.#left -= 1;
    if (this.#left < 0) {
      throw new XfaScriptError('SCRIPT_LIMIT', `script has more than ${MAX_SCRIPT_AST_NODES} syntax tree nodes`, { limit: 'source-size' });
    }
  }
}

/**
 * Pushes the object-valued members of `node` (child nodes and arrays of them) onto an explicit walk stack so they pop in
 * source order. The walks use a stack of their own instead of recursion: a hostile script nests as deep as it has
 * characters, and a recursive walk would end in a bare `RangeError` instead of a typed error.
 */
export function pushChildren(node: AstNode, stack: unknown[], skipKeys?: ReadonlySet<string>): void {
  const entries = Object.entries(node);
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const [key, value] = entries[i] as [string, unknown];
    if (typeof value === 'object' && value !== null && !skipKeys?.has(key)) stack.push(value);
  }
}

/** Pushes the elements of an array onto a walk stack so they pop in order. */
export function pushAll(items: readonly unknown[], stack: unknown[]): void {
  for (let i = items.length - 1; i >= 0; i -= 1) stack.push(items[i]);
}
