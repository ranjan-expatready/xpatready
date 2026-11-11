/**
 * The XFA Scripting Object Model resolver (W01-T04): the expressions the two real forms use, from any node.
 *
 * - `resolveNode(from, expression)` / `resolveNodes(from, expression)`: unqualified names searched outward through the
 *   enclosing scopes (a container's `variables` members included), `[n]` / `[*]` indexes, `#class` selectors, the rooted
 *   `xfa.form` / `xfa.template` / `xfa.datasets` / `xfa.data` forms, and a trailing `.dataNode`.
 * - `isNameInScope(from, name)`: whether a bare name resolves from `from`, answered without listing the nodes it names.
 * - `somExpressionOf(node)`: the canonical absolute expression that resolves back to the same node.
 * - `parseSom(expression)`: the parsed path. Grammar outside the supported set is refused with `UNSUPPORTED_FEATURE`.
 *
 * Pseudo-properties such as `value` and `rawValue` are member access, handled by the script bridge, not by the resolver.
 */
export { somExpressionOf } from './expression.js';
export { MAX_SOM_CHARS, MAX_SOM_INDEX_DIGITS, MAX_SOM_NAME_CHARS, MAX_SOM_RESULTS, MAX_SOM_SEGMENTS } from './limits.js';
export { isSomName, parseSom, type SomPath, type SomSegment } from './parse.js';
export { isNameInScope, resolveNode, resolveNodes } from './resolve.js';
