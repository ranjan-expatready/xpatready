import type { DomNode } from '../model/form/index.js';
import { isNameInScope } from '../model/som/index.js';
import { XfaScriptError } from '../script/index.js';
import { freeNames } from './free-names.js';
import { MAX_FREE_NAMES_PER_SCRIPT } from './limits.js';

/** Names the guest already owns: the ES3 library, the host objects and the engine's own globals. A form node never shadows them. */
const LANGUAGE_GLOBALS: ReadonlySet<string> = new Set([
  'Array', 'Boolean', 'Date', 'Error', 'EvalError', 'Function', 'Infinity', 'JSON', 'Math', 'NaN', 'Number', 'Object', 'RangeError',
  'ReferenceError', 'RegExp', 'String', 'SyntaxError', 'TypeError', 'URIError', 'decodeURI', 'decodeURIComponent', 'encodeURI',
  'encodeURIComponent', 'escape', 'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'undefined', 'unescape', 'arguments',
  'globalThis', 'Reflect', 'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet', 'xfa', 'app', 'console',
]);

export interface BinderLimits {
  /** The sandbox's script source limit: a longer script is refused before it is analysed (the sandbox would refuse it anyway). */
  readonly maxSourceChars: number;
  /** Most distinct undeclared names one script may use; defaults to `MAX_FREE_NAMES_PER_SCRIPT`. */
  readonly maxFreeNames?: number;
}

/**
 * XFA scripts name form objects by bare identifier (`Year.rawValue`, `globFirstField.value`, `form1.Page1...`): an
 * undeclared name is looked up through the form tree from the node the script belongs to. The sandbox runs plain
 * JavaScript, so before a script runs this binder finds its undeclared names, keeps those that name a node from the
 * script's scope (and are not a language global or a script object, which JavaScript resolves itself) and prepends one
 * `var` line that binds each to `xfa.resolveNode(name)`. The line adds no newline, so guest stack line numbers stay
 * those of the form's own script.
 *
 * Binding happens once per run of a script, when the form tree is as that run sees it; a name that names no node is
 * left alone (an implicit global such as a loop counter works as in the viewer).
 *
 * JAVASCRIPT GLOBAL BEFORE SOM (W02-T07): a name that an earlier script made a JavaScript global (an assignment to an
 * undeclared name) is NOT bound to a form node, even where a node of that name is in scope: the global wins. This is
 * decided from the guest's real state (`isGlobal`), never from analysis of what a script might do, so a name that is
 * not a global keeps binding to its node and the rule can never turn a working lookup into a `ReferenceError`. Only a
 * name some earlier script used while it named no node can be a global, so `isGlobal` is asked only for those (none
 * on the corpus forms). Acrobat parity of this ordering is unconfirmed: it is on the Plan 3 golden-corpus checklist.
 */
export class ScopeBinder {
  readonly #reserved: ReadonlySet<string>;
  readonly #isGlobal: (name: string) => boolean;
  readonly #maxSourceChars: number;
  readonly #maxFreeNames: number;
  readonly #cache = new WeakMap<object, readonly string[]>();
  /** Names a script has used while they named no node: the only names that can be implicit globals. */
  readonly #unbound = new Set<string>();

  /** `reserved` is shared and grows as script objects are defined; it is read at bind time. `isGlobal` asks the guest whether a name is a global. */
  constructor(reserved: ReadonlySet<string>, isGlobal: (name: string) => boolean, limits: BinderLimits) {
    this.#reserved = reserved;
    this.#isGlobal = isGlobal;
    this.#maxSourceChars = limits.maxSourceChars;
    this.#maxFreeNames = limits.maxFreeNames ?? MAX_FREE_NAMES_PER_SCRIPT;
  }

  /**
   * `text` with its scope bindings in front. `key` (the script's template node) caches the free-name analysis;
   * pass nothing for one-off text.
   */
  bind(scope: DomNode, text: string, key?: object): string {
    const bindings = this.#bindings(scope, text, key);
    return bindings.length === 0 ? text : `var ${bindings.join(',')};${text}`;
  }

  /**
   * The same for a script object (library). A `var` line would become a top-level variable of the library and so a
   * member of the exported object (a for-in would list the bound node names), so the library body runs inside a `with`
   * over a prototype-less object holding the bindings instead: its own declarations still hoist to the library scope
   * and are exported, the bound names are only reachable by lookup.
   */
  bindLibrary(scope: DomNode, text: string): string {
    const bindings = this.#bindings(scope, text, undefined);
    if (bindings.length === 0) return text;
    const members = bindings.map((b) => `o.${b};`).join('');
    return `with (function () { var o = Object.create(null); ${members} return o; }()) {${text}\n}`;
  }

  #bindings(scope: DomNode, text: string, key: object | undefined): string[] {
    let names = key === undefined ? undefined : this.#cache.get(key);
    if (names === undefined) {
      // Before any analysis: the sandbox refuses the same text, but only after the binder has parsed and resolved it.
      if (text.length > this.#maxSourceChars) {
        throw new XfaScriptError('SCRIPT_LIMIT', `script is longer than ${this.#maxSourceChars} characters`, { limit: 'source-size' });
      }
      names = freeNames(text);
      if (names.length > this.#maxFreeNames) {
        throw new XfaScriptError('SCRIPT_LIMIT', `script uses more than ${this.#maxFreeNames} distinct undeclared names`, { limit: 'source-size' });
      }
      if (key !== undefined) this.#cache.set(key, names);
    }
    const bindings: string[] = [];
    for (const name of names) {
      if (LANGUAGE_GLOBALS.has(name) || this.#reserved.has(name)) continue;
      if (!isNameInScope(scope, name)) {
        this.#unbound.add(name);
        continue;
      }
      if (this.#unbound.has(name) && this.#isGlobal(name)) continue;
      bindings.push(`${name}=xfa.resolveNode(${JSON.stringify(name)})`);
    }
    return bindings;
  }
}
