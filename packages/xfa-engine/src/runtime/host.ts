import { safeText } from '../pdf/safe-text.js';
import { resolveNode, resolveNodes, somExpressionOf } from '../model/som/index.js';
import { FormNode, XfaFormError, type DomNode, type FormDom } from '../model/form/index.js';
import {
  FN_MARKER,
  UNDEF,
  UNSUPPORTED,
  XfaScriptError,
  errorReply,
  nodeList,
  nodeValue,
  type BridgeValue,
  type HostOp,
  type HostReply,
  type JsonValue,
  type LogKind,
  type NodeId,
  type ScriptHost,
} from '../script/index.js';
import { decodeValue, encodeMember, nodeById, refOf } from './codec.js';
import type { DeltaObjects } from './deltas.js';
import type { RunContext } from './context.js';
import { activitySchema } from './options.js';
import { formSizeLimit } from './errors.js';
import { EVENT_ID, LAYOUT_ID, LOG_ID, XFA_ROOT_ID } from './pseudo-ids.js';
import type { PseudoNodes } from './pseudo.js';
import type { Recorder } from './recorder.js';
import type { HostServices } from './services.js';
import type { ValueWatch } from './value-watch.js';

/**
 * What the host can ask the event engine to do on a script's behalf (`execEvent` and friends). Bound after the engine
 * exists: the engine needs the sandbox, and the sandbox needs this host.
 */
export interface EngineActions {
  execEvent(node: FormNode, activity: string): void;
  execCalculate(node: FormNode): void;
  execInitialize(node: FormNode): void;
  execValidate(node: FormNode): boolean;
  recalculate(): void;
}

export interface HostDeps {
  readonly dom: FormDom;
  readonly context: RunContext;
  readonly recorder: Recorder;
  readonly services: Pick<HostServices, 'handle'>;
  readonly pseudo: Pick<PseudoNodes, 'get' | 'set' | 'call' | 'rootMember'>;
  /** Told of every script write that took effect (W02-T07: how the first missing field is captured). */
  readonly watch?: Pick<ValueWatch, 'record'>;
  /** The saved form state as `delta` objects (`getDeltas()`); absent or empty when the PDF has none that verifies. */
  readonly deltas?: Pick<DeltaObjects, 'owns' | 'get' | 'call' | 'listFor'>;
}

/** Members only the event engine can carry out. They are methods of a form node. */
const ENGINE_METHODS: ReadonlySet<string> = new Set(['execEvent', 'execCalculate', 'execInitialize', 'execValidate', 'recalculate']);

/**
 * `ScriptHost` over the form DOM (W02-T06): the guest holds only node ids; this class turns every get / set / call /
 * resolve the guest makes into a form-DOM operation and maps the outcome to a bridge reply.
 *
 * THE ONE MAPPING FROM MODEL OUTCOMES TO HOST REPLIES (W01 wave-gate F6; tested in `host.test.ts`):
 *
 *  - a value        -> the value, encoded for the bridge (nodes as `{id, cls}` handles, never host objects);
 *  - a method       -> `FN_MARKER` on `get`, so the guest builds a callable bound to (node, member);
 *  - `unsupported`  -> `UNSUPPORTED`: the guest logs it (the unsupported record); strict mode makes it fatal;
 *  - `expando`      -> the write succeeded (the container keeps the value); recorded as a note, never as unsupported;
 *  - `deferred`     -> handled HERE, never by the model: `resolveNode(s)` and `somExpression` (SOM layer), `execEvent`,
 *                      `execCalculate`, `execInitialize`, `execValidate` and `recalculate` (event engine), `getDeltas`
 *                      (the saved form state as `delta` objects, see `deltas.ts`);
 *  - `XfaFormError` `INVALID_ARGUMENT` / `INVALID_OPERATION` -> `errorReply`: an ordinary, catchable guest `Error`,
 *                      because a script can cause it and a form may try/catch it;
 *  - `XfaFormError` `LIMIT` -> FATAL `XfaScriptError` `SCRIPT_LIMIT` (`form-size`): it bounds resources, so a script
 *                      must not be able to absorb it in a try/catch loop;
 *  - any `XfaPdfError` at run time -> FATAL `HOST_ERROR` (propagated; the bridge wraps it with the cause): it signals a
 *                      load-time or integrity problem (an unsupported SOM grammar, a broken packet), not a script mistake;
 *  - an `XfaScriptError` (a limit, a bridge violation, an unknown node id) and any untyped throw -> fatal, unchanged.
 *
 * Two small normalisations live here because they are about the guest, not the model: assigning `null` to the `value`
 * of a text node stores the empty string (XFA's null text), and a node id the host never issued is a forged value.
 */
export class FormScriptHost implements ScriptHost {
  readonly #deps: HostDeps;
  #actions: EngineActions | undefined;

  constructor(deps: HostDeps) {
    this.#deps = deps;
  }

  bindActions(actions: EngineActions): void {
    this.#actions = actions;
  }

  get(id: NodeId, prop: string): HostReply {
    if (id === XFA_ROOT_ID) return this.#guard(() => this.#getRoot(prop));
    if (id === EVENT_ID || id === LAYOUT_ID || id === LOG_ID) return this.#deps.pseudo.get(id, prop);
    const { deltas } = this.#deps;
    if (deltas?.owns(id) === true) return this.#guard(() => deltas.get(id, prop));
    const node = nodeById(this.#deps.dom, id);
    return this.#guard(() => this.#getMember(node, prop));
  }

  set(id: NodeId, prop: string, value: BridgeValue): HostReply {
    const { dom, pseudo, watch } = this.#deps;
    if (id === XFA_ROOT_ID) return UNSUPPORTED;
    if (id === EVENT_ID || id === LAYOUT_ID || id === LOG_ID) return this.#guard(() => pseudo.set(id, prop, decodeValue(dom, value)));
    if (this.#deps.deltas?.owns(id) === true) return UNSUPPORTED;
    const node = nodeById(dom, id);
    return this.#guard(() => {
      let input = decodeValue(dom, value);
      if (input === null && prop === 'value' && node instanceof FormNode) input = '';
      const outcome = dom.set(node, prop, input);
      if (outcome === 'expando') {
        // A property the object model lacks, kept on the container (Acrobat tolerates the write): a note, not an unsupported member.
        this.#deps.recorder.addNote({ class: node.className, member: safeText(prop, 64) });
        return UNDEF;
      }
      if (outcome !== 'ok') return UNSUPPORTED;
      watch?.record(node, prop, input);
      return UNDEF;
    });
  }

  call(id: NodeId, method: string, args: readonly BridgeValue[]): HostReply {
    const { dom, pseudo } = this.#deps;
    if (id === XFA_ROOT_ID) return UNSUPPORTED;
    const decoded = (): unknown[] => args.map((a) => decodeValue(dom, a));
    if (id === EVENT_ID || id === LAYOUT_ID || id === LOG_ID) return this.#guard(() => pseudo.call(id, method, decoded()));
    const { deltas } = this.#deps;
    if (deltas?.owns(id) === true) return this.#guard(() => deltas.call(id, method));
    const node = nodeById(dom, id);
    return this.#guard(() => this.#callMember(node, method, decoded()));
  }

  resolve(fromId: NodeId, expression: string, many: boolean): HostReply {
    const { dom, context } = this.#deps;
    // The root (and the host objects) have no scope of their own: `xfa.resolveNode` resolves from the running script's node.
    const rooted = fromId === XFA_ROOT_ID || fromId === EVENT_ID || fromId === LAYOUT_ID || fromId === LOG_ID;
    const from: DomNode = rooted ? (context.current ?? dom.root) : nodeById(dom, fromId);
    return this.#guard(() => {
      if (many) return nodeList(resolveNodes(from, expression).map(refOf));
      const found = resolveNode(from, expression);
      return found === null ? null : nodeValue(refOf(found));
    });
  }

  host(op: HostOp, member: string, args: readonly BridgeValue[]): HostReply {
    const { dom, services } = this.#deps;
    return this.#guard(() => services.handle(op, member, args.map((a) => decodeValue(dom, a))));
  }

  log(kind: LogKind, payload: JsonValue): void {
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return;
    const text = (key: string): string => {
      const value: unknown = Reflect.get(payload, key);
      return typeof value === 'string' ? safeText(value, 64, true) : '?';
    };
    const record = { class: text('class'), member: text('member') };
    if (kind === 'note') this.#deps.recorder.addNote(record);
    else this.#deps.recorder.addUnsupported(record);
  }

  // ---- the outcome mapping -----------------------------------------------------------------------------------

  #guard(run: () => HostReply): HostReply {
    try {
      return run();
    } catch (error) {
      if (error instanceof XfaFormError) {
        if (error.code === 'LIMIT') {
          throw formSizeLimit(error, this.#deps.context.location);
        }
        return errorReply(safeText(error.message, 1000, true));
      }
      // XfaPdfError and everything untyped are fatal: the bridge wraps a non-XfaScriptError as HOST_ERROR with the cause.
      throw error;
    }
  }

  // ---- members -----------------------------------------------------------------------------------------------

  #getRoot(prop: string): HostReply {
    const { dom, pseudo } = this.#deps;
    const pseudoMember = pseudo.rootMember(prop);
    if (pseudoMember !== undefined) return pseudoMember;
    switch (prop) {
      case 'form':
        return nodeValue(refOf(dom.form));
      case 'template':
        return nodeValue(refOf(dom.template));
      case 'datasets':
        return nodeValue(refOf(dom.datasets));
      case 'data':
        return nodeValue(refOf(dom.data));
      default:
        return UNSUPPORTED;
    }
  }

  #getMember(node: DomNode, prop: string): HostReply {
    if (isGetDeltas(node, prop)) return FN_MARKER;
    const result = this.#deps.dom.get(node, prop);
    switch (result.kind) {
      case 'value':
        return encodeMember(result.value);
      case 'method':
        return FN_MARKER;
      case 'unsupported':
        return UNSUPPORTED;
      case 'deferred':
        if (prop === 'somExpression') return somExpressionOf(node);
        return node instanceof FormNode && ENGINE_METHODS.has(prop) ? FN_MARKER : UNSUPPORTED;
    }
  }

  #callMember(node: DomNode, method: string, args: readonly unknown[]): HostReply {
    if (node instanceof FormNode) {
      if (isGetDeltas(node, method)) return this.#deps.deltas?.listFor(node) ?? nodeList([]);
      if (ENGINE_METHODS.has(method)) return this.#engineCall(node, method, args);
    }
    const result = this.#deps.dom.call(node, method, args);
    return result.kind === 'value' ? encodeMember(result.value) : UNSUPPORTED;
  }

  #engineCall(node: FormNode, method: string, args: readonly unknown[]): HostReply {
    const actions = this.#actions;
    if (actions === undefined) throw new XfaScriptError('HOST_ERROR', 'the event engine is not bound to the host yet');
    switch (method) {
      case 'execEvent': {
        // `validate` is not an XFA event activity, but forms ask for it (`field.execEvent("validate")`): it runs the validate script.
        if (args[0] === 'validate') {
          actions.execValidate(node);
          return UNDEF;
        }
        const parsed = activitySchema.safeParse(args[0]);
        if (!parsed.success) throw new XfaFormError('INVALID_ARGUMENT', 'execEvent takes an XFA event activity name');
        actions.execEvent(node, parsed.data);
        return UNDEF;
      }
      case 'execCalculate':
        actions.execCalculate(node);
        return UNDEF;
      case 'execInitialize':
        actions.execInitialize(node);
        return UNDEF;
      case 'execValidate':
        return actions.execValidate(node);
      default:
        actions.recalculate();
        return UNDEF;
    }
  }
}

/** The one method of the form model the DOM does not carry: `subform.getDeltas()`, the saved form state of its subtree (`deltas.ts`). */
function isGetDeltas(node: DomNode, member: string): boolean {
  return member === 'getDeltas' && node instanceof FormNode && node.className === 'subform';
}
