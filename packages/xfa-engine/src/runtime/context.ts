import { somExpressionOf } from '../model/som/index.js';
import { FormNode, type DomNode } from '../model/form/index.js';
import type { ScriptLocation } from '../script/index.js';
import { safeText } from '../pdf/safe-text.js';
import type { EventState } from './event-state.js';

interface Frame {
  readonly node: DomNode;
  readonly activity: string;
  readonly event: EventState | undefined;
}

/** SOM of a node for diagnostics: the canonical expression, or a class:name label when the node has no place in a model. */
export function describeNode(node: DomNode): string {
  try {
    return somExpressionOf(node);
  } catch {
    return `${node.className}:${safeText(node instanceof FormNode ? node.name : '', 40, true)}`;
  }
}

/**
 * Which script is running, as a stack (an `execEvent` nests). Unqualified SOM names in the guest resolve from the
 * innermost node (the host owns that context; the sandbox only forwards the root id), `xfa.event` is the innermost
 * dispatch's state, and an error names the innermost node and activity.
 */
export class RunContext {
  readonly #frames: Frame[] = [];

  enter(node: DomNode, activity: string, event?: EventState): void {
    this.#frames.push({ node, activity, event });
  }

  leave(): void {
    this.#frames.pop();
  }

  get depth(): number {
    return this.#frames.length;
  }

  get current(): DomNode | undefined {
    return this.#frames.at(-1)?.node;
  }

  get activity(): string | undefined {
    return this.#frames.at(-1)?.activity;
  }

  /** `xfa.event` of the innermost dispatch that has one. */
  get eventState(): EventState | undefined {
    for (let i = this.#frames.length - 1; i >= 0; i -= 1) {
      const event = this.#frames[i]?.event;
      if (event !== undefined) return event;
    }
    return undefined;
  }

  get location(): ScriptLocation | undefined {
    const frame = this.#frames.at(-1);
    return frame === undefined ? undefined : { event: frame.activity, nodeSom: describeNode(frame.node) };
  }
}
