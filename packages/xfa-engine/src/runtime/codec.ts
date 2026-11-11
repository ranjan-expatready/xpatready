import type { DomNode, FormDom, MemberValue } from '../model/form/index.js';
import { XfaFormError } from '../model/form/index.js';
import { nodeList, nodeValue, UNDEF, XfaScriptError, type BridgeValue, type NodeRef } from '../script/index.js';
import { isPseudoId } from './pseudo-ids.js';

export const refOf = (node: DomNode): NodeRef => ({ id: node.id, cls: node.className });

/** A model member value as the bridge carries it: scalars as they are, nodes as `{id, cls}` handles, lists as snapshots. */
export function encodeMember(value: MemberValue): BridgeValue {
  if (value === undefined) return UNDEF;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return encodeNumber(value);
  if (Array.isArray(value)) return nodeList(value.map(refOf));
  return nodeValue(refOf(value as DomNode));
}

export function encodeNumber(value: number): BridgeValue {
  if (Number.isFinite(value)) return value;
  return { $t: 'num', v: Number.isNaN(value) ? 'NaN' : value > 0 ? 'Infinity' : '-Infinity' };
}

const isTagged = (value: BridgeValue): value is Extract<BridgeValue, { readonly $t: string }> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A bridge value as the model takes it: scalars as they are, `undef` as undefined, non-finite numbers restored, node
 * handles as the nodes themselves. An id that names no node is a forged or stale value: the bridge fails closed.
 * A handle to a host object that is not a form node (`xfa.event`) is an ordinary, catchable argument error.
 */
export function decodeValue(dom: FormDom, value: BridgeValue): unknown {
  if (Array.isArray(value)) return value.map((v: BridgeValue) => decodeValue(dom, v));
  if (!isTagged(value)) return value;
  switch (value.$t) {
    case 'undef':
      return undefined;
    case 'num':
      return value.v === 'NaN' ? Number.NaN : value.v === 'Infinity' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    case 'node':
      return nodeById(dom, value.id);
    case 'nodes':
      return value.nodes.map((n) => nodeById(dom, n.id));
  }
}

/** The node behind a bridge id. */
export function nodeById(dom: FormDom, id: number): DomNode {
  if (isPseudoId(id)) throw new XfaFormError('INVALID_ARGUMENT', 'a host object cannot be used as a form node here');
  const node = dom.nodeById(id);
  if (node === undefined) throw new XfaScriptError('BRIDGE_VIOLATION', 'the script used a node id the host never issued');
  return node;
}
