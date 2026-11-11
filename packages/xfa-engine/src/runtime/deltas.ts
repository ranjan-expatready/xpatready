import type { FormNode } from '../model/form/index.js';
import type { Delta } from '../model/form-packet/index.js';
import { FN_MARKER, nodeList, UNDEF, UNSUPPORTED, XfaScriptError, type HostReply, type NodeListValue } from '../script/index.js';
import { DELTA_BASE, DELTA_SPAN, isDeltaId } from './pseudo-ids.js';

const DELTA_CLASS = 'delta';

/**
 * The saved form state as script objects (`form1.getDeltas()`, `delta.restore()`): each delta of the saved form packet is a
 * host object with an id from the delta range. A delta is not a form node: passed where a node is expected it is refused
 * like any other host object. `restore()` applies the saved value through the form DOM's own write path.
 */
export class DeltaObjects {
  readonly #deltas: readonly Delta[];

  constructor(deltas: readonly Delta[]) {
    this.#deltas = deltas.slice(0, DELTA_SPAN);
  }

  owns(id: number): boolean {
    return isDeltaId(id) && id - DELTA_BASE < this.#deltas.length;
  }

  /** `node.getDeltas()`: the deltas of `node` and every container below it, in saved order. */
  listFor(node: FormNode): NodeListValue {
    const refs = [];
    for (const [i, delta] of this.#deltas.entries()) {
      if (isWithin(delta.container, node)) refs.push({ id: DELTA_BASE + i, cls: DELTA_CLASS });
    }
    return nodeList(refs);
  }

  get(id: number, member: string): HostReply {
    const delta = this.#delta(id);
    switch (member) {
      case 'className':
        return DELTA_CLASS;
      case 'savedValue':
        return delta.savedValue;
      case 'currentValue':
        return delta.currentValue();
      case 'target':
        return delta.target;
      case 'restore':
        return FN_MARKER;
      default:
        return UNSUPPORTED;
    }
  }

  call(id: number, method: string): HostReply {
    const delta = this.#delta(id);
    if (method !== 'restore') return UNSUPPORTED;
    delta.restore();
    return UNDEF;
  }

  #delta(id: number): Delta {
    const delta = this.#deltas[id - DELTA_BASE];
    if (delta === undefined) throw new XfaScriptError('BRIDGE_VIOLATION', 'the script used a delta id the host never issued');
    return delta;
  }
}

function isWithin(node: FormNode, ancestor: FormNode): boolean {
  for (let at: FormNode | null = node; at !== null; at = at.parent) if (at === ancestor) return true;
  return false;
}
