import type { DomNode } from '../model/form/index.js';

/**
 * Remembers the first non-empty text a script writes to chosen nodes' `value` while a watch is armed. The forms keep the
 * SOM of their first missing field in a text variable and clear it themselves before Validate returns, so the only
 * moment it can be read is the write. A watch records; it never changes what the script writes or reads.
 */
export class ValueWatch {
  readonly #armed = new Map<DomNode, string | null>();

  /** Starts watching `node`, forgetting anything recorded for it before. */
  arm(node: DomNode): void {
    this.#armed.set(node, null);
  }

  /** Stops watching `node` and returns the first non-empty text written to its `value` since `arm`, or null. */
  take(node: DomNode): string | null {
    const seen = this.#armed.get(node) ?? null;
    this.#armed.delete(node);
    return seen;
  }

  /** Called for every successful script write to a node member. */
  record(node: DomNode, member: string, written: unknown): void {
    if (member === 'value' && typeof written === 'string' && written !== '' && this.#armed.get(node) === null) this.#armed.set(node, written);
  }
}
