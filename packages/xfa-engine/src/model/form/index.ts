/**
 * The form DOM (W01-T03): the template model merged with the datasets, with one write path for everything a run changes.
 *
 * - `createFormDom(model, datasets)` merges by implicit ("once") binding and returns a `FormDom`: `form` (`xfa.form`),
 *   `root` (the root subform), `datasets` / `data`, a read-only `template` view, node ids, creation and member dispatch.
 * - `FormNode` carries `rawValue`, `isNull`, `formattedValue`, `presence`, `access`, `mandatory`, the three messages,
 *   `nodes`, `dataNode`, choice-list methods and property-node access (`property`, `element`, `oneOfChild`); a property the
 *   template omits is created from the XFA defaults on first read and listed on first write, with a stable identity.
 * - `FormDom.get / set / call` are the per-class dispatch the script bridge sits on: a member is a value, a method, a
 *   `deferred` member (SOM resolution and event execution belong to other layers) or `unsupported`.
 * - Form-DOM state that the data does not hold (presence, access, captions, item lists, ...) is saved to and read from the
 *   `form` packet by `model/form-packet`, through `FormNode.writtenAttributeNames` / `hasWrittenText` and the write path.
 *
 * The template model is never written; the datasets document is mutated in place.
 */
export { accessSchema, effectiveAccess, moreRestrictive, type Access } from './access.js';
export { createFormDom, FormDom } from './dom.js';
export { DataNode, type DataClassName } from './data-node.js';
export { XfaFormError, type XfaFormErrorCode } from './errors.js';
export { DEFAULT_FORM_LIMITS, type FormLimits, type FormOptions } from './limits.js';
export type { MemberResult, MemberValue, SetResult } from './members.js';
export { FormNode } from './node.js';
export { NodeListNode, type DomNode } from './node-list.js';
