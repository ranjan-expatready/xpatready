import { XfaPdfError } from '../pdf/errors.js';
import { safeText } from '../pdf/safe-text.js';
import { FormNode, type FormDom } from '../model/form/index.js';
import { variablesOf, type ScriptObject } from '../model/template/index.js';
import { XfaScriptError, type Sandbox } from '../script/index.js';
import type { RunContext } from './context.js';
import type { ScopeBinder } from './scope.js';

export interface ScriptObjectDeps {
  readonly dom: FormDom;
  readonly sandbox: Sandbox;
  readonly context: RunContext;
  readonly binder: ScopeBinder;
  /** Names of script objects; filled here, shared with the binder. */
  readonly reserved: Set<string>;
}

/** A string literal for ES3 source: `JSON.stringify`, with the two line separators ES3 would read as line ends escaped. */
const literal = (text: string): string =>
  JSON.stringify(text).replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));

function refuse(feature: string): XfaPdfError {
  return new XfaPdfError('UNSUPPORTED_FEATURE', `Unsupported XFA feature: ${feature}`);
}

/**
 * Defines the form's script objects in the sandbox, once per run, in document order (W02-T06):
 *
 *  - a JavaScript object is evaluated by the sandbox in its own function scope and bound as a locked global with its
 *    top-level functions and vars as members (`validateForm.fn(...)`), so libraries that carry the same helper name
 *    cannot collide. Names it uses without declaring that name a form node (`Page1`, a manifest, a text variable) are
 *    bound against the root subform, the container that holds the `variables` block;
 *  - a data object (an XML string kept in a script object, such as a lookup table) is a locked global `{ value }`;
 *  - text variables and manifests need no definition: scripts reach them as nodes through the form tree.
 *
 * Only the root subform's objects are supported; one declared elsewhere would need a scope the sandbox's flat global
 * namespace cannot give it, so it is refused rather than bound to the wrong scope.
 *
 * @returns how many script objects were defined.
 */
export function defineScriptObjects(deps: ScriptObjectDeps): number {
  const { dom, sandbox, context, binder, reserved } = deps;
  const root = dom.root;
  for (const node of dom.model.nodes) {
    if (node.className !== 'variables' || node.parent === root.template) continue;
    if (node.children.some((c) => c.className === 'script')) throw refuse('script object declared outside the root subform');
  }
  const objects = variablesOf(root.template).scriptObjects.filter((o) => o.name !== '' && o.text.trim() !== '');
  // Every name is reserved before any program is built, so a library that calls a later one by name never binds that name to a node.
  for (const object of objects) reserved.add(object.name);
  context.enter(root, 'scriptObject');
  try {
    for (const object of objects) sandbox.defineScriptObject(object.name, programFor(object, root, binder), { event: 'scriptObject' });
  } finally {
    context.leave();
  }
  return objects.length;
}

function programFor(object: ScriptObject, root: FormNode, binder: ScopeBinder): string {
  if (object.kind === 'data') return `var value = ${literal(object.text)};`;
  if (object.kind !== 'javascript') throw refuse(`script object "${safeText(object.name)}" in ${safeText(object.contentType)}`);
  try {
    return binder.bindLibrary(root, object.text);
  } catch (error) {
    if (error instanceof XfaScriptError && error.code === 'SCRIPT_ERROR') {
      throw new XfaScriptError('SCRIPT_ERROR', `script object "${safeText(object.name, 64, true)}" is not valid ES3 JavaScript: ${safeText(error.message, 200, true)}`, {
        cause: error,
        location: { event: 'scriptObject', nodeSom: object.name },
      });
    }
    throw error;
  }
}
