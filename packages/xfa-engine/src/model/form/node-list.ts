import type { DataNode } from './data-node.js';
import type { FormDom } from './dom.js';
import type { FormNode } from './node.js';

export type DomNode = FormNode | DataNode | NodeListNode;

/** What a node list reads and writes: the children of one owner, as the owner keeps them. */
export interface ListSource {
  size(): number;
  at(index: number): DomNode | undefined;
  add(node: DomNode): void;
  delete(node: DomNode): void;
}

/**
 * The `nodes` property of a form node or data node: XFA's node list (`item(i)`, `length`, `append`, `remove`). It is a
 * node of its own so a script can hold it and so the bridge can address it by id; it owns no state, every call goes
 * to the owner's `ListSource`.
 */
export class NodeListNode {
  readonly id: number;
  readonly className = 'nodeList';
  readonly name = '';
  readonly #source: ListSource;
  readonly owner: DomNode;

  constructor(dom: FormDom, owner: DomNode, source: ListSource) {
    this.owner = owner;
    this.#source = source;
    this.id = dom.register(this);
  }

  get parent(): DomNode {
    return this.owner;
  }

  get length(): number {
    return this.#source.size();
  }

  /** The `index`-th child, or null when out of range (XFA answers null, not an error). */
  item(index: number): DomNode | null {
    return Number.isInteger(index) && index >= 0 ? (this.#source.at(index) ?? null) : null;
  }

  append(node: DomNode): void {
    this.#source.add(node);
  }

  remove(node: DomNode): void {
    this.#source.delete(node);
  }
}
