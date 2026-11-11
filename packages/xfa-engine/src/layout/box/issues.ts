import type { FormNode } from '../../model/form/index.js';
import { somExpressionOf } from '../../model/som/index.js';
import { safeText } from '../../pdf/safe-text.js';
import { MAX_ISSUES } from '../limits.js';
import type { BoxIssue } from './types.js';

const NAME_ECHO_CHARS = 40;

/** The node's SOM expression, or `class:name` for a node that has none (a created node not yet appended). */
export function somOf(node: FormNode): string {
  try {
    return somExpressionOf(node);
  } catch {
    return `${node.className}:${safeText(node.name, NAME_ECHO_CHARS, true)}`;
  }
}

/**
 * Collects the layout's `issues`: a feature met but not supported, or a fallback taken, each naming the node (SOM) and
 * the feature, in the shape of the render tree's `issues`. Holds at most `MAX_ISSUES`; the rest are counted in
 * `dropped`, so a hostile template cannot make the list grow without bound.
 *
 * The SOM expression of a node costs a scan of its earlier siblings, so `add` only remembers the node and the feature;
 * the expression is worked out when `issues` is read, once per node per read however many issues it has. A layout that probes a
 * large container (a presence look-ahead, a caption measure) therefore pays nothing for what it throws away.
 */
export class IssueSink {
  readonly #pending: { readonly node: FormNode; readonly feature: string }[] = [];
  readonly #read: BoxIssue[] = [];
  #dropped = 0;

  add(node: FormNode, feature: string): void {
    if (this.#pending.length >= MAX_ISSUES) {
      this.#dropped += 1;
      return;
    }
    this.#pending.push({ node, feature });
  }

  get issues(): readonly BoxIssue[] {
    // The cache lives for this pass only: a sink is reused across layout runs (`TextContext`), and a script may reshape the
    // form between them, so an expression worked out in an earlier pass can be stale.
    const soms = new Map<FormNode, string>();
    for (let at = this.#read.length; at < this.#pending.length; at += 1) {
      const entry = this.#pending[at];
      if (entry === undefined) break;
      let som = soms.get(entry.node);
      if (som === undefined) {
        som = somOf(entry.node);
        soms.set(entry.node, som);
      }
      this.#read.push({ som, feature: entry.feature });
    }
    return this.#read;
  }

  /** True once the list holds `MAX_ISSUES` entries: nothing more is kept, so a caller may stop tracking what it has reported. */
  get full(): boolean {
    return this.#pending.length >= MAX_ISSUES;
  }

  /** How many issues were not kept because the list was full. */
  get dropped(): number {
    return this.#dropped;
  }
}

/** A sink that keeps nothing and computes nothing: what a probe that must not report is given. It is always `full`, and its `issues` stay empty. */
class DiscardingSink extends IssueSink {
  override add(): void {}

  override get full(): boolean {
    return true;
  }
}

const DISCARD = new DiscardingSink();

/** A sink whose issues nobody reads: for a probe that must not report (the caption probe of a growable box, a presence look-ahead). It stores and computes nothing, so one is shared. */
export const discardingSink = (): IssueSink => DISCARD;
