import type { z } from 'zod';
import { XfaPdfError } from '../pdf/errors.js';
import { safeText } from '../pdf/safe-text.js';
import type { LaidOutForm } from '../layout/paginate/index.js';
import type { RenderTree } from '../layout/render-tree.js';
import { createFormDom, DataNode, FormNode, XfaFormError, type DomNode, type FormDom } from '../model/form/index.js';
import { widgetOf } from '../model/form/value.js';
import { captureItemsBaseline, formPacketText, readSavedState, type ItemsBaseline, type SavedFormState } from '../model/form-packet/index.js';
import { resolveNode } from '../model/som/index.js';
import { parseTemplate } from '../model/template/index.js';
import { parseXml } from '../xml/parse.js';
import { serializeXml } from '../xml/serialize.js';
import type { XfaPacket, XfaPdf } from '../xfa-pdf.js';
import { createSandbox, XfaScriptError, type Sandbox, type SandboxUsage } from '../script/index.js';
import { describeNode, RunContext } from './context.js';
import { DeltaObjects } from './deltas.js';
import { EventEngine } from './engine.js';
import { formSizeLimit, XfaRuntimeError } from './errors.js';
import { FormScriptHost } from './host.js';
import { registerLayoutAccess } from './layout-access.js';
import { LayoutSession, readLayoutFonts } from './layout-session.js';
import { RenderTreeCache } from './render-tree-cache.js';
import { resolveRuntimeLimits } from './limits.js';
import { parsePackDescriptor, runEncodeBarcodes, runValidate, type PackFormDescriptor, type PackHost } from './pack.js';
import { ValueWatch } from './value-watch.js';
import { serializeDatasets } from './writeback.js';
import {
  activitySchema,
  eventFieldsSchema,
  parseOptions,
  parsePdf,
  somTextSchema,
  valueSchema,
  type BarcodePayloads,
  type ClearButtonReport,
  type EventFields,
  type EventResult,
  type FormRuntime,
  type FormRuntimeOptions,
  type HostRequestRecord,
  type LoadReport,
  type MessageRecord,
  type NoteRecord,
  type ProblemList,
  type RuntimeState,
  type SetValueResult,
  type UnsupportedRecord,
  type ValidateResult,
} from './options.js';
import { listProblems } from './problems.js';
import { checkUserAction, userActionSchema, type UserAction, type UserActionCheck } from './user-access.js';
import { PseudoNodes } from './pseudo.js';
import { Recorder } from './recorder.js';
import { ScopeBinder } from './scope.js';
import { defineScriptObjects } from './script-objects.js';
import { HostServices } from './services.js';
import { XFA_ROOT_ID } from './pseudo-ids.js';

/**
 * A runtime failure raised while a script ran (`recalculate()` that does not settle) leaves the sandbox wrapped as a
 * `HOST_ERROR` carrying it. The caller gets the typed original, the same error as when the host started the settle itself.
 */
const surfaced = (error: unknown): unknown =>
  error instanceof XfaScriptError && error.code === 'HOST_ERROR' && error.cause instanceof XfaRuntimeError ? error.cause : error;

const invalid = (message: string, cause?: unknown): XfaRuntimeError => new XfaRuntimeError('INVALID_ARGUMENT', message, { cause });

function parseArgument<S extends z.ZodType>(schema: S, input: unknown, what: string): z.output<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw invalid(`${what} is not valid`, parsed.error);
  return parsed.data;
}

/**
 * Creates the runtime of one form run over an opened XFA PDF (public API).
 *
 * Validates the arguments (`INVALID_ARGUMENT` for a first argument that is not an opened `XfaPdf`, `INVALID_OPTIONS` for
 * bad options), parses and gates the template, merges it with the datasets (both `XfaPdfError` on a form the engine
 * cannot run), creates the sandbox, and returns a runtime in state `created`; nothing of the form runs until `load()`. The
 * caller owns the run's lifetime: `dispose()` frees the QuickJS runtime. Plan decision D8 applies: this runs inside a
 * killable isolate (worker thread) in every integration.
 */
export async function createFormRuntime(pdf: XfaPdf, options: FormRuntimeOptions): Promise<FormRuntime> {
  parsePdf(pdf);
  const parsed = parseOptions(options);
  const limits = resolveRuntimeLimits(parsed.limits);
  const model = parseTemplate(pdf.packet('template').text());
  const dom = createFormDom(model, parseXml(pdf.packet('datasets').text()), { limits: { maxNodes: limits.runtime.maxFormNodes } });
  // The UI state saved beside the data, as the form's own restore script will ask for it (only when its checksum verifies).
  const saved = readSavedState(dom, { template: pdf.packet('template').bytes, datasets: pdf.packet('datasets').bytes, form: formPacketOf(pdf)?.text() });
  const itemsBaseline = captureItemsBaseline(dom);

  const context = new RunContext();
  const recorder = new Recorder(limits.runtime.maxRecordedEntries, limits.runtime.maxRecordedBytes, () => context.location);
  const answer = parsed.messageBoxResult ?? ((): number => 1);
  const services = new HostServices({ dom, context, recorder, identity: parsed.host, answer });
  const fonts = await readLayoutFonts(pdf);
  const trees = new RenderTreeCache(fonts);
  const layout = new LayoutSession({ dom, model, fonts, maxPasses: limits.runtime.maxLayoutPasses });
  const pseudo = new PseudoNodes(context, recorder, layout);
  const watch = new ValueWatch();
  const host = new FormScriptHost({ dom, context, recorder, services, pseudo, watch, deltas: new DeltaObjects(saved.deltas) });
  const sandbox = await createSandbox({
    host,
    xfaRoot: { id: XFA_ROOT_ID, cls: 'xfa' },
    clock: parsed.clock,
    ...(parsed.timezone === undefined ? {} : { zone: parsed.timezone }),
    strict: parsed.strict ?? false,
    limits: limits.sandbox,
    ...(parsed.wasm === undefined ? {} : { wasm: parsed.wasm }),
  });
  const reserved = new Set<string>();
  const binder = new ScopeBinder(reserved, (name) => sandbox.evaluate(`${JSON.stringify(name)} in globalThis`, { global: true, event: 'scopeBind' }) === true, {
    maxSourceChars: limits.sandbox.sourceChars,
  });
  const engine = new EventEngine({ dom, sandbox, context, binder, maxCalcPasses: limits.runtime.maxCalcPasses, maxExecEventDepth: limits.runtime.maxExecEventDepth });
  host.bindActions(engine);
  layout.bind({ engine, sandbox });
  const runtime = new Runtime({ pdf, dom, sandbox, context, recorder, engine, binder, reserved, watch, layout, trees, maxLayoutPasses: limits.runtime.maxLayoutPasses, savedState: saved.summary, itemsBaseline });
  registerLayoutAccess(runtime, {
    dom,
    layout: () => runtime.laidOut(),
    fontIssues: layout.fontIssues,
    get settles() {
      return layout.settles;
    },
    get treeBuilds() {
      return trees.builds;
    },
  });
  return runtime;
}

/** The PDF's `form` packet (the saved UI state), or undefined when it has none. */
function formPacketOf(pdf: XfaPdf): XfaPacket | undefined {
  return pdf.packets.find((p) => p.name === 'form');
}

interface RuntimeParts {
  readonly pdf: XfaPdf;
  readonly dom: FormDom;
  readonly sandbox: Sandbox;
  readonly context: RunContext;
  readonly recorder: Recorder;
  readonly engine: EventEngine;
  readonly binder: ScopeBinder;
  readonly reserved: Set<string>;
  readonly watch: ValueWatch;
  readonly layout: LayoutSession;
  /** The render tree of the current layout (`FormRuntime.layout`). */
  readonly trees: RenderTreeCache;
  readonly maxLayoutPasses: number;
  readonly savedState: SavedFormState;
  /** The item lists as the merge left them: a list that differs at save time is UI state (`captureItemsBaseline`). */
  readonly itemsBaseline: ItemsBaseline;
}

class Runtime implements FormRuntime {
  readonly #parts: RuntimeParts;
  #state: RuntimeState = 'created';

  constructor(parts: RuntimeParts) {
    this.#parts = parts;
  }

  get state(): RuntimeState {
    return this.#state;
  }

  get messages(): readonly MessageRecord[] {
    return this.#parts.recorder.messages;
  }

  get focus(): readonly string[] {
    return this.#parts.recorder.focus;
  }

  get unsupported(): readonly UnsupportedRecord[] {
    return this.#parts.recorder.unsupported;
  }

  get requests(): readonly HostRequestRecord[] {
    return this.#parts.recorder.requests;
  }

  get notes(): readonly NoteRecord[] {
    return this.#parts.recorder.notes;
  }

  get console(): readonly string[] {
    return this.#parts.recorder.console;
  }

  get usage(): SandboxUsage {
    return this.#parts.sandbox.usage;
  }

  load(): LoadReport {
    if (this.#state === 'loaded') throw new XfaRuntimeError('ALREADY_LOADED', 'this runtime has already loaded its form (one form run per runtime)');
    this.#assertUsable();
    const { engine, sandbox, dom, context, binder, reserved } = this.#parts;
    const started = performance.now();
    const byPhase: Record<string, number> = {};
    return this.#guarded(() => {
      const scriptObjects = defineScriptObjects({ dom, sandbox, context, binder, reserved });
      engine.indexForm();
      let before = engine.scriptsRun;
      const phase = (name: string, run: () => unknown): void => {
        run();
        byPhase[name] = engine.scriptsRun - before;
        before = engine.scriptsRun;
      };
      phase('initialize', () => engine.runPhase('initialize'));
      let calcPasses = 0;
      phase('calculate', () => {
        calcPasses = engine.settle();
      });
      // The form's own restore (its ready:$form or docReady script) may put back values that have no data binding (a barcode field's text).
      // The calculates that copy them ran earlier while those fields were still empty, so they settle once more after a phase that changed a value, within the same run and budgets.
      const settleIfChanged = (previous: readonly (string | number | null)[]): void => {
        const now = engine.fingerprint();
        if (now.length === previous.length && now.every((value, i) => value === previous[i])) return;
        const beforeCalc = engine.scriptsRun;
        calcPasses += engine.settle();
        byPhase.calculate = (byPhase.calculate ?? 0) + (engine.scriptsRun - beforeCalc);
        before = engine.scriptsRun;
      };
      const beforeReady = engine.fingerprint();
      phase('ready:$form', () => engine.runPhase('ready', '$form'));
      settleIfChanged(beforeReady);
      phase('ready:$layout', () => this.#settleLayout());
      const beforeDocReady = engine.fingerprint();
      phase('docReady', () => engine.runPhase('docReady'));
      settleIfChanged(beforeDocReady);
      // A docReady handler may have written: the layout is current when load() returns, and the scripts that follow it are the layout's.
      const beforeLast = engine.scriptsRun;
      this.#settleLayout();
      byPhase['ready:$layout'] = (byPhase['ready:$layout'] ?? 0) + (engine.scriptsRun - beforeLast);
      this.#state = 'loaded';
      return { scriptObjects, scriptsRun: engine.scriptsRun, byPhase, calcPasses, elapsedMs: performance.now() - started, savedState: this.#parts.savedState };
    });
  }

  setValue(som: string, value: string | number | boolean | null): SetValueResult {
    this.#assertLoaded();
    const text = parseArgument(somTextSchema, som, 'the SOM expression');
    const input = parseArgument(valueSchema, value, 'the value');
    const node = this.#resolve(text);
    this.#write(node, input);
    // The layout follows lazily (the next dispatch, `layout()` or save): a batch of writes costs one layout.
    return this.#guarded(() => ({ calcPasses: this.#parts.engine.settle() }));
  }

  event(som: string, activity: string, fields?: EventFields): EventResult {
    this.#assertLoaded();
    const text = parseArgument(somTextSchema, som, 'the SOM expression');
    const name = parseArgument(activitySchema, activity, 'the event activity');
    const given = fields === undefined ? undefined : parseArgument(eventFieldsSchema, fields, 'the event fields');
    const node = this.#resolve(text);
    if (!(node instanceof FormNode)) throw invalid('events are dispatched to form nodes, not data nodes');
    return this.#dispatched((engine) => engine.runNodeEvents(node, name, given));
  }

  broadcast(activity: string): EventResult {
    this.#assertLoaded();
    const name = parseArgument(activitySchema, activity, 'the event activity');
    return this.#dispatched((engine) => engine.runPhase(name));
  }

  children(som: string, className?: string): readonly string[] {
    this.#assertLoaded();
    const node = this.#resolve(parseArgument(somTextSchema, som, 'the SOM expression'));
    const wanted = className === undefined ? undefined : parseArgument(somTextSchema, className, 'the class name');
    if (!(node instanceof FormNode)) throw invalid('children are listed for form nodes, not data nodes');
    return node.children.filter((child) => wanted === undefined || child.className === wanted).map(describeNode);
  }

  validate(pack: PackFormDescriptor): ValidateResult {
    this.#assertLoaded();
    return runValidate(this.#packHost(), parsePackDescriptor(pack));
  }

  problems(): ProblemList {
    this.#assertLoaded();
    return listProblems(this.#parts.dom);
  }

  checkUserAction(som: string, action: UserAction): UserActionCheck {
    this.#assertLoaded();
    const text = parseArgument(somTextSchema, som, 'the SOM expression');
    const given = parseArgument(userActionSchema, action, 'the user action');
    let node: DomNode;
    try {
      node = this.#resolve(text);
    } catch (error) {
      if (error instanceof XfaRuntimeError && (error.code === 'NODE_NOT_FOUND' || error.code === 'INVALID_ARGUMENT')) return { allowed: true };
      throw error;
    }
    return node instanceof FormNode ? checkUserAction(node, given) : { allowed: true };
  }

  clearButton(pack: PackFormDescriptor): ClearButtonReport {
    this.#assertLoaded();
    const { clearButton } = parsePackDescriptor(pack);
    if (clearButton === undefined) return { status: 'absent' };
    let node: DomNode;
    try {
      node = this.#resolve(clearButton);
    } catch (error) {
      // A SOM that is not valid, or names nothing, is a mistake of the pack, reported as data; any other failure is not ours to hide.
      if (error instanceof XfaRuntimeError && (error.code === 'NODE_NOT_FOUND' || error.code === 'INVALID_ARGUMENT')) {
        return { status: 'issue', code: 'CLEAR_BUTTON_UNRESOLVED', message: `pack.clearButton names no node in this form (${safeText(clearButton, 120, true)})` };
      }
      throw error;
    }
    if (!(node instanceof FormNode) || node.className !== 'field' || widgetOf(node) !== 'button') {
      return { status: 'issue', code: 'CLEAR_BUTTON_NOT_A_BUTTON', message: `pack.clearButton does not name a button field (${safeText(clearButton, 120, true)})` };
    }
    return { status: 'found', som: describeNode(node) };
  }

  encodeBarcodes(pack: PackFormDescriptor): BarcodePayloads {
    this.#assertLoaded();
    return runEncodeBarcodes(this.#packHost(), parsePackDescriptor(pack));
  }

  saveDatasets(): string {
    this.#assertLoaded();
    // What the layout scripts write into the data is part of the data: the layout settles before it is read.
    this.#guarded(() => this.#settleLayout());
    return serializeXml(this.#parts.dom.datasetsDocument);
  }

  async save(): Promise<Uint8Array> {
    this.#assertLoaded();
    // Serialized and checked before the first await, so a later change to the form cannot reach this file.
    this.#guarded(() => this.#settleLayout());
    const { pdf, dom, itemsBaseline } = this.#parts;
    const datasets = serializeDatasets(dom.datasetsDocument);
    // The UI state goes beside the data, in the same update, with a checksum over the template and these datasets.
    if (formPacketOf(pdf) === undefined) return pdf.withPacket('datasets', datasets);
    const form = new TextEncoder().encode(formPacketText(dom, pdf.packet('template').bytes, datasets, itemsBaseline));
    return pdf.withPackets([
      { name: 'datasets', bytes: datasets },
      { name: 'form', bytes: form },
    ]);
  }

  #watchFirstWrite(som: string): () => string | null {
    const node = this.#resolve(parseArgument(somTextSchema, som, 'the SOM expression'));
    const { watch } = this.#parts;
    watch.arm(node);
    return () => watch.take(node);
  }

  getValue(som: string): string | number | null {
    this.#assertLoaded();
    const node = this.#resolve(parseArgument(somTextSchema, som, 'the SOM expression'));
    const { dom } = this.#parts;
    const attempt = (member: string): string | number | null | undefined => {
      const read = dom.get(node, member);
      if (read.kind !== 'value') return undefined;
      return read.value === null || typeof read.value === 'string' || typeof read.value === 'number' ? read.value : undefined;
    };
    const value = node instanceof FormNode && (node.className === 'field' || node.className === 'exclGroup' || node.className === 'draw') ? attempt('rawValue') : attempt('value');
    if (value === undefined) throw invalid('the node has no value to read');
    return value;
  }

  getProperty(som: string, member: string): string | number | boolean | null {
    this.#assertLoaded();
    const node = this.#resolve(parseArgument(somTextSchema, som, 'the SOM expression'));
    const name = parseArgument(somTextSchema, member, 'the member name');
    const read = this.#parts.dom.get(node, name);
    const value = read.kind === 'value' ? read.value : undefined;
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    throw invalid(`"${name}" is not a scalar member of the node`);
  }

  layout(): RenderTree {
    const laid = this.laidOut();
    try {
      return this.#parts.trees.of(laid);
    } catch (error) {
      // A form ceiling met while the tree reads the form ends the run exactly as it does in a script or `setValue`.
      if (error instanceof XfaFormError && error.code === 'LIMIT') throw this.#abort(formSizeLimit(error));
      throw error;
    }
  }

  /** The layout of the form as it stands (see `RuntimeLayoutAccess.layout`). */
  laidOut(): LaidOutForm {
    this.#assertLoaded();
    return this.#guarded(() => {
      this.#settleLayout();
      const { current } = this.#parts.layout;
      if (current === undefined) throw new XfaRuntimeError('NOT_LOADED', 'the layout has not been made');
      return current;
    });
  }

  dispose(): void {
    if (this.#state === 'disposed') return;
    this.#parts.layout.release();
    this.#parts.trees.release();
    const aborted = this.#state === 'aborted';
    this.#state = 'disposed';
    if (!aborted) this.#parts.sandbox.dispose();
  }

  /** Frees the sandbox after a failure. A teardown problem never replaces the failure that caused it, which the caller is about to see. */
  #release(): void {
    try {
      this.#parts.sandbox.dispose();
    } catch {
      // The sandbox records its own teardown failure; the error that aborted the run is the one to report.
    }
  }

  // ---- internals -------------------------------------------------------------------------------------------------

  /** What the pack helpers (`validate`, `encodeBarcodes`) are built on: the public members they use, plus the write-watch that only they need. */
  #packHost(): PackHost {
    const { recorder } = this.#parts;
    return {
      event: (som, activity) => this.event(som, activity),
      broadcast: (activity) => this.broadcast(activity),
      getValue: (som) => this.getValue(som),
      getProperty: (som, member) => this.getProperty(som, member),
      children: (som, className) => this.children(som, className),
      get messages() {
        return recorder.messages;
      },
      get focus() {
        return recorder.focus;
      },
      watchFirstWrite: (som) => this.#watchFirstWrite(som),
    };
  }

  #assertUsable(): void {
    if (this.#state === 'disposed') throw new XfaRuntimeError('DISPOSED', 'this runtime has been disposed');
    if (this.#state === 'aborted') throw new XfaRuntimeError('RUN_ABORTED', 'an earlier failure aborted this form run; create a new runtime');
  }

  #assertLoaded(): void {
    this.#assertUsable();
    if (this.#state === 'created') throw new XfaRuntimeError('NOT_LOADED', 'call load() first');
  }

  /**
   * Runs work that can fail inside a script. Any failure aborts the run: a script may have been interrupted half way,
   * so the form state is undefined and no more work is accepted (documented behaviour; the sandbox is disposed).
   */
  #guarded<T>(run: () => T): T {
    try {
      return run();
    } catch (error) {
      throw this.#abort(surfaced(error));
    }
  }

  /** Ends the run after a failure (the sandbox is freed, no more work is accepted) and returns the error for the caller to throw. */
  #abort<E>(error: E): E {
    this.#state = 'aborted';
    this.#release();
    return error;
  }

  /** Runs a dispatch of event handlers and settles the calculates if it changed a value. A failure in a script aborts the run. */
  #dispatched(run: (engine: EventEngine) => number): EventResult {
    const { engine } = this.#parts;
    return this.#guarded(() => {
      // The writes since the last layout (setValue, the previous dispatch) reach the layout before this script looks at it: xfa.layout and the ready:$layout side effects are current.
      this.#settleLayout();
      const before = engine.fingerprint();
      const scriptsRun = run(engine);
      const after = engine.fingerprint();
      const changed = before.length !== after.length || before.some((v, i) => v !== after[i]);
      const calcPasses = changed ? engine.settle() : 0;
      return { scriptsRun, calcPasses };
    });
  }

  /**
   * Brings the layout up to date when the form's revision moved since it was made (a no-op otherwise), and returns the layout
   * scripts it ran. When those scripts wrote, the calculates that read what they wrote settle again, and if that wrote too the
   * layout is made once more; the loop is bounded by `maxLayoutPasses` rounds (the calculate settle has its own ceiling), and
   * a form still changing at the end is flagged on its layout.
   */
  #settleLayout(): number {
    const { layout, engine, dom, maxLayoutPasses } = this.#parts;
    let scripts = 0;
    for (let round = 1; ; round += 1) {
      const done = layout.settle();
      scripts += done.scripts;
      if (!done.wrote) return scripts;
      const before = dom.revision;
      engine.settle();
      if (dom.revision === before) return scripts;
      if (round >= maxLayoutPasses) {
        layout.markUnsettled(round);
        return scripts;
      }
    }
  }

  #resolve(som: string): DomNode {
    let found: DomNode | null;
    try {
      found = resolveNode(this.#parts.dom.root, som);
    } catch (error) {
      if (error instanceof XfaPdfError) throw invalid(`the SOM expression cannot be resolved: ${error.message}`, error);
      throw error;
    }
    if (found === null) throw new XfaRuntimeError('NODE_NOT_FOUND', 'the SOM expression names no node');
    return found;
  }

  /**
   * The write of `setValue`: the node takes the value as its raw value. A refusal by the model is the caller's mistake and
   * aborts nothing; a form ceiling (`LIMIT`) ends the run exactly as it does when a script hits it.
   */
  #write(node: DomNode, value: string | number | boolean | null): void {
    try {
      if (node instanceof FormNode) node.rawValue = value;
      else if (node instanceof DataNode) node.value = value === null ? '' : String(value);
      else throw invalid('the node cannot take a value');
    } catch (error) {
      if (error instanceof XfaFormError) {
        if (error.code === 'LIMIT') throw this.#abort(formSizeLimit(error));
        throw invalid(`the node refused the value: ${error.message}`, error);
      }
      throw error;
    }
  }
}
