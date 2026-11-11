import { safeText } from '../pdf/safe-text.js';
import { FormNode, type FormDom } from '../model/form/index.js';
import { resolveNode } from '../model/som/index.js';
import { calculateOf, eventsOf, validateOf, type EventView, type ScriptView } from '../model/template/index.js';
import { XfaScriptError, type Sandbox } from '../script/index.js';
import { refOf } from './codec.js';
import { describeNode, type RunContext } from './context.js';
import { XfaRuntimeError } from './errors.js';
import { EventState } from './event-state.js';
import type { EngineActions } from './host.js';
import { masterPageOf } from './master-page.js';
import type { EventFields } from './options.js';
import type { ScopeBinder } from './scope.js';

export interface EngineDeps {
  readonly dom: FormDom;
  readonly sandbox: Sandbox;
  readonly context: RunContext;
  readonly binder: ScopeBinder;
  readonly maxCalcPasses: number;
  readonly maxExecEventDepth: number;
}

interface EventEntry {
  readonly node: FormNode;
  readonly view: EventView;
  /** The master page (`pageArea`) the node sits on; undefined for a node of the body of the form. */
  readonly area: FormNode | undefined;
}

interface CalcEntry {
  readonly node: FormNode;
  readonly script: ScriptView;
}

/** Classes that hold a value a calculate can change; the settle loop watches these. */
const VALUE_CLASSES: ReadonlySet<string> = new Set(['field', 'exclGroup', 'draw']);

/** The `ref` an event is for: a `ready` event with none is a `$form` ready (the XFA default). */
const eventRef = (view: EventView): string => (view.ref ?? '') === '' && view.activity === 'ready' ? '$form' : (view.ref ?? '');

/** The sandbox takes SOM text for error locations up to 1024 characters. */
const nodeSomOf = (node: FormNode): string => {
  const som = describeNode(node);
  return som.length > 1000 ? safeText(som, 1000, true) : som;
};

/** An event script that runs here: JavaScript, for the client, not empty. (FormCalc in an event has no effect to run.) */
const isRunnableEvent = (script: ScriptView | undefined): script is ScriptView =>
  script !== undefined && script.kind === 'javascript' && script.runAt !== 'server' && script.text.trim() !== '';

/** A calculate that runs here: JavaScript, or FormCalc (the gate already limits it to a bare SOM reference), for the client, not empty. */
const isRunnableCalculate = (script: ScriptView | undefined): script is ScriptView =>
  script !== undefined && (script.kind === 'javascript' || script.kind === 'formcalc') && script.runAt !== 'server' && script.text.trim() !== '';

/**
 * Runs the form's event and calculate scripts (W02-T06).
 *
 * LOAD ORDER (XFA 2.8 processing order; the phases are driven by the runtime): merge, `initialize` (document order, a
 * container before its children), calculate settle, `ready` with ref `$form`, layout, `ready` with ref `$layout` (the
 * layout settle of `LayoutSession`: body handlers once per pass, master-page handlers once per page instance, W02-T09),
 * `docReady` with ref `$host`. The viewer's validate pass between the settle and `ready` is
 * deliberately not run (W02-T07 decision; see `FormRuntime.load`).
 *
 * CALCULATE: every calculate script runs, in document order, pass after pass, until a whole pass changes no field value
 * (or the pass ceiling is hit: `CALC_NOT_CONVERGED`). A settle is started only by the host (after `setValue`, and after
 * a host-dispatched event that changed a value); a write a script makes inside a calculate never starts one, so a
 * calculate that writes another field cannot recurse. A JavaScript calculate's value is assigned to its field when it is
 * a string, number, boolean or null (undefined writes nothing); a FormCalc bare reference is assigned too (D5).
 *
 * `execEvent` and the other exec members are synchronous and re-entrant, sharing one nesting cap of `maxExecEventDepth` levels.
 */
export class EventEngine implements EngineActions {
  readonly #deps: EngineDeps;
  readonly #events = new Map<string, EventEntry[]>();
  readonly #calcs: CalcEntry[] = [];
  readonly #valueNodes: FormNode[] = [];
  #execDepth = 0;
  #settling = false;
  #scriptsRun = 0;

  constructor(deps: EngineDeps) {
    this.#deps = deps;
  }

  /** Scripts executed so far (event and calculate), `execEvent` included. */
  get scriptsRun(): number {
    return this.#scriptsRun;
  }

  /** Indexes the form's runnable events and calculates in document order. Call once, after the script objects exist. */
  indexForm(): void {
    this.#deps.dom.walk((node) => {
      if (VALUE_CLASSES.has(node.className)) this.#valueNodes.push(node);
      for (const view of eventsOf(node.template)) {
        if (!isRunnableEvent(view.script)) continue;
        const entry: EventEntry = { node, view, area: masterPageOf(node) };
        const list = this.#events.get(view.activity);
        if (list === undefined) this.#events.set(view.activity, [entry]);
        else list.push(entry);
      }
      const script = calculateOf(node.template)?.script;
      if (isRunnableCalculate(script)) this.#calcs.push({ node, script });
    });
  }

  // ---- load phases ---------------------------------------------------------------------------------------------

  /** Runs every indexed handler for `activity` (optionally only those whose `ref` is `ref`), in document order. */
  runPhase(activity: string, ref?: string): number {
    let count = 0;
    for (const entry of this.#events.get(activity) ?? []) {
      if (ref !== undefined && eventRef(entry.view) !== ref) continue;
      const script = entry.view.script;
      if (!isRunnableEvent(script)) continue;
      this.#runJavaScript(entry.node, activity, script, new EventState(activity, refOf(entry.node)));
      count += 1;
    }
    return count;
  }

  /**
   * The `ready` handlers with ref `$layout` of one part of the form, in document order: those of the master page `area`
   * (run once per page instance, W02-T09), or, with `area` undefined, those outside every master page.
   */
  runLayoutReady(area: FormNode | undefined): number {
    let count = 0;
    for (const entry of this.#events.get('ready') ?? []) {
      if (entry.area !== area || eventRef(entry.view) !== '$layout') continue;
      const script = entry.view.script;
      if (!isRunnableEvent(script)) continue;
      this.#runJavaScript(entry.node, 'ready', script, new EventState('ready', refOf(entry.node)));
      count += 1;
    }
    return count;
  }

  /** The handlers of one node for one activity (any `ref`), with `xfa.event` populated from `fields`. */
  runNodeEvents(node: FormNode, activity: string, fields?: EventFields): number {
    if (activity === 'calculate') {
      const calculate = calculateOf(node.template)?.script;
      if (!isRunnableCalculate(calculate)) return 0;
      this.#runCalculate(node, calculate);
      return 1;
    }
    const state = new EventState(activity, refOf(node), fields);
    let count = 0;
    for (const view of eventsOf(node.template)) {
      if (view.activity !== activity || !isRunnableEvent(view.script)) continue;
      this.#runJavaScript(node, activity, view.script, state);
      count += 1;
    }
    return count;
  }

  // ---- calculate -------------------------------------------------------------------------------------------------

  /** The values the settle loop watches, in a fixed order, for comparison. */
  fingerprint(): readonly (string | number | null)[] {
    return this.#valueNodes.map((node) => node.rawValue);
  }

  /** Runs the calculates until a pass changes no value. Returns the passes made (0 when the form has no calculate). */
  settle(): number {
    if (this.#calcs.length === 0 || this.#settling) return 0;
    this.#settling = true;
    try {
      for (let pass = 1; pass <= this.#deps.maxCalcPasses; pass += 1) {
        const before = this.fingerprint();
        for (const entry of this.#calcs) this.#runCalculate(entry.node, entry.script);
        if (sameValues(before, this.fingerprint())) return pass;
      }
    } finally {
      this.#settling = false;
    }
    throw new XfaRuntimeError('CALC_NOT_CONVERGED', `the calculate scripts still changed values after ${this.#deps.maxCalcPasses} passes`);
  }

  // ---- EngineActions (what a script may ask for) -------------------------------------------------------------------

  execEvent(node: FormNode, activity: string): void {
    this.#nested(() => this.runNodeEvents(node, activity));
  }

  execCalculate(node: FormNode): void {
    this.#nested(() => this.runNodeEvents(node, 'calculate'));
  }

  execInitialize(node: FormNode): void {
    this.#nested(() => this.runNodeEvents(node, 'initialize'));
  }

  /**
   * `execValidate()`: false when the node's `nullTest` is on and it is empty, or its validate script answers false (or 0);
   * otherwise true. The format test is not evaluated here: the form's own Validate button drives validation (W02-T07).
   */
  execValidate(node: FormNode): boolean {
    return this.#nested(() => {
      // The live null test (`mandatory`): a script may have changed `validate.nullTest` since the template was read, and the
      // form packet saves it. It falls back to the template's value, then to the XFA default.
      if (node.mandatory !== 'disabled' && (node.className === 'field' || node.className === 'exclGroup') && node.isNull) return false;
      const script = validateOf(node.template)?.script;
      if (!isRunnableEvent(script)) return true;
      const result = this.#runJavaScript(node, 'validate', script, new EventState('validate', refOf(node)));
      return result !== false && result !== 0;
    });
  }

  recalculate(): void {
    this.#nested(() => this.settle());
  }

  /** Runs `run` one level deeper in the exec nesting that every exec member shares, refusing past `maxExecEventDepth`. */
  #nested<T>(run: () => T): T {
    if (this.#execDepth >= this.#deps.maxExecEventDepth) {
      const where = this.#deps.context.location;
      throw new XfaScriptError('SCRIPT_LIMIT', `script nesting (execEvent, execInitialize, execCalculate, execValidate, recalculate) went more than ${this.#deps.maxExecEventDepth} levels deep`, {
        limit: 'nesting',
        ...(where === undefined ? {} : { location: where }),
      });
    }
    this.#execDepth += 1;
    try {
      return run();
    } finally {
      this.#execDepth -= 1;
    }
  }

  // ---- running one script ----------------------------------------------------------------------------------------------

  #runJavaScript(node: FormNode, activity: string, script: ScriptView, state: EventState): unknown {
    const { sandbox, context, binder } = this.#deps;
    // Binding the script's names and describing its node are host work that grows with the form (a wide scope's name set is
    // rebuilt after a structure change): they count against the form-run time budget like the script itself.
    const { program, options } = sandbox.withinRunBudget(
      () => ({ program: binder.bind(node, script.text, script.node), options: { thisNode: refOf(node), event: activity, nodeSom: nodeSomOf(node) } }),
      () => ({ event: activity, nodeSom: nodeSomOf(node) }),
    );
    context.enter(node, activity, state);
    try {
      this.#scriptsRun += 1;
      return sandbox.evaluate(program, options);
    } finally {
      context.leave();
    }
  }

  #runCalculate(node: FormNode, script: ScriptView): void {
    if (script.kind === 'javascript') {
      const result = this.#runJavaScript(node, 'calculate', script, new EventState('calculate', refOf(node)));
      // XFA calculate semantics: the script's value is the field's value (`A.rawValue * B.rawValue` alone computes it).
      // Only a scalar counts; undefined (a trigger-style calculate ending in an untaken `if`) and node results write nothing.
      if (VALUE_CLASSES.has(node.className) && (result === null || typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean')) node.rawValue = result;
      return;
    }
    this.#scriptsRun += 1;
    // The reference is resolved on the host, outside the sandbox: its time counts against the form-run budget too.
    const { sandbox } = this.#deps;
    const value = sandbox.withinRunBudget(
      () => this.#evaluateBareReference(node, script.text.trim()),
      () => ({ event: 'calculate', nodeSom: nodeSomOf(node) }),
    );
    node.rawValue = value;
  }

  /** FormCalc, plan decision D5: a bare SOM reference evaluates to the referenced node's value. */
  #evaluateBareReference(node: FormNode, expression: string): string | number | null {
    const { dom } = this.#deps;
    const target = resolveNode(node, expression);
    const read = target === null ? undefined : dom.get(target, target instanceof FormNode ? 'rawValue' : 'value');
    if (read?.kind !== 'value' || (read.value !== null && typeof read.value !== 'string' && typeof read.value !== 'number')) {
      const why = target === null ? 'names no node' : 'names a node that has no value';
      throw new XfaRuntimeError('FORMCALC_UNRESOLVED', `FormCalc reference "${safeText(expression, 80, true)}" ${why}`, { nodeSom: describeNode(node), event: 'calculate' });
    }
    return read.value;
  }
}

function sameValues(a: readonly (string | number | null)[], b: readonly (string | number | null)[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}
