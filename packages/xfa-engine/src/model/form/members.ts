import { z } from 'zod';
import { looksLikeMarkup } from '../template/index.js';
import { attributesOfClass, parseAttributeValue } from './attributes.js';
import { DataNode } from './data-node.js';
import type { FormDom } from './dom.js';
import type { ExpandoValue } from './expando.js';
import { invalidArgument } from './errors.js';
import * as items from './items.js';
import { FormNode } from './node.js';
import { NodeListNode, type DomNode } from './node-list.js';
import * as value from './value.js';

/** What a member read can produce for the bridge: primitives, a node, or a list of nodes. */
export type MemberValue = string | number | boolean | null | undefined | DomNode | readonly DomNode[];

/**
 * - `value`: a property and its current value.
 * - `method`: a callable member (the bridge returns a function bound to it).
 * - `deferred`: a real XFA member implemented by another layer (SOM resolution, event execution), not unsupported.
 * - `unsupported`: the engine models no such member of this node; the bridge logs it (strict mode: fatal).
 */
export type MemberResult =
  | { readonly kind: 'value'; readonly value: MemberValue }
  | { readonly kind: 'method' }
  | { readonly kind: 'deferred' }
  | { readonly kind: 'unsupported' };

/**
 * - `ok`: the property took the value.
 * - `deferred`: a real member another layer implements.
 * - `unsupported`: the engine models no such member and the node cannot hold one (the bridge logs it; strict mode: fatal).
 * - `expando`: the object model has no such property but the node is a container (subform, exclusion group, field), so the
 *   value was kept on that node for scripts to read back. It is not unsupported - Acrobat tolerates the write - and it is
 *   never written to the data or the template; the caller records a note.
 */
export type SetResult = 'ok' | 'deferred' | 'unsupported' | 'expando';

interface Member<N> {
  readonly get?: (node: N) => MemberValue;
  readonly set?: (node: N, input: unknown) => void;
  /** False for a node on which the setter would change nothing the engine reads: the write is then `unsupported`, not silently `ok`. */
  readonly writable?: (node: N) => boolean;
  readonly method?: (node: N, args: readonly unknown[]) => MemberValue;
}

type Table<N> = ReadonlyMap<string, Member<N>>;

const UNSUPPORTED: MemberResult = Object.freeze({ kind: 'unsupported' });
const METHOD: MemberResult = Object.freeze({ kind: 'method' });
const DEFERRED_RESULT: MemberResult = Object.freeze({ kind: 'deferred' });

/** Members of the XFA object model that other layers implement: SOM resolution (W01-T04), event execution (W02-T06). */
const DEFERRED_MEMBERS: ReadonlySet<string> = new Set([
  'resolveNode', 'resolveNodes', 'somExpression', 'execEvent', 'execCalculate', 'execInitialize', 'execValidate', 'recalculate',
]);

/** Names that must never reach a lookup: they are prototype keys, not XFA members. */
const FORBIDDEN_NAMES: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

const text = z.string();
const integer = z.number().int();

function arg<T>(schema: z.ZodType<T>, input: unknown, what: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw invalidArgument(`${what} was given an argument of the wrong type`);
  return parsed.data;
}

/** Runs a method that returns nothing; a method result is a member value, and nothing is `undefined`. */
const run = (fn: () => void): undefined => {
  fn();
  return undefined;
};

const nodeOrNull = (node: DomNode | undefined): DomNode | null => node ?? null;

// ---- form nodes ----------------------------------------------------------------------------------------------

type FormMember = Member<FormNode>;

const BASE: Readonly<Record<string, FormMember>> = {
  className: { get: (n) => n.className },
  name: { get: (n) => n.name },
  parent: { get: (n) => n.parent },
  nodes: { get: (n) => n.nodes },
  isPropertySpecified: { method: (n, a) => n.isSpecified(arg(text, a[0], 'isPropertySpecified')) },
  getElement: { method: (n, a) => nodeOrNull(n.element(arg(text, a[0], 'getElement'), a[1] === undefined ? 0 : arg(integer, a[1], 'getElement'))) },
};

const VALUE: Readonly<Record<string, FormMember>> = {
  rawValue: { get: (n) => n.rawValue, set: (n, v) => value.writeRaw(n, v) },
  isNull: { get: (n) => n.isNull },
  formattedValue: { get: (n) => n.formattedValue },
};

const VALIDATION: Readonly<Record<string, FormMember>> = {
  mandatory: { get: (n) => n.mandatory, set: (n, v) => (n.mandatory = arg(text, v, 'mandatory')) },
  mandatoryMessage: { get: (n) => n.mandatoryMessage, set: (n, v) => (n.mandatoryMessage = arg(text, v, 'mandatoryMessage')) },
  validationMessage: { get: (n) => n.validationMessage, set: (n, v) => (n.validationMessage = arg(text, v, 'validationMessage')) },
  formatMessage: { get: (n) => n.formatMessage, set: (n, v) => (n.formatMessage = arg(text, v, 'formatMessage')) },
};

const DATA_BOUND: Readonly<Record<string, FormMember>> = { dataNode: { get: (n) => n.dataNode } };

const ITEMS: Readonly<Record<string, FormMember>> = {
  clearItems: { method: (n) => run(() => n.clearItems()) },
  addItem: { method: (n, a) => run(() => items.addItem(n, a[0], a[1])) },
  boundItem: { method: (n, a) => items.boundItem(n, a[0]) },
  selectedIndex: { get: (n) => n.selectedIndex, set: (n, v) => items.setSelectedIndex(n, v) },
  items: { get: (n) => nodeOrNull(n.childrenOfClass('items')[0]) },
};

/** Property children a script reaches by name, with the classes that own them (`field.border`, `border.edge`, `edge.color`, ...). */
const PROPERTY_OWNERS: ReadonlyMap<string, readonly string[]> = new Map([
  ['ui', ['field', 'draw']],
  ['border', ['subform', 'field', 'exclGroup', 'draw', 'textEdit', 'numericEdit', 'passwordEdit', 'choiceList', 'checkButton', 'dateTimeEdit', 'button', 'barcode', 'signature', 'imageEdit', 'defaultUi']],
  ['caption', ['field', 'exclGroup']],
  ['validate', ['field', 'exclGroup', 'subform']],
  ['assist', ['subform', 'field', 'exclGroup', 'draw']],
  ['value', ['field', 'draw', 'caption']],
  ['edge', ['border']],
  ['corner', ['border']],
  ['fill', ['border']],
  ['color', ['edge', 'corner', 'fill']],
  ['speak', ['assist']],
  ['toolTip', ['assist']],
]);

/** Classes whose text content is their `.value`. */
const CONTENT_CLASSES: ReadonlySet<string> = new Set(['text', 'integer', 'decimal', 'float', 'boolean', 'date', 'time', 'dateTime', 'exData', 'script', 'speak', 'toolTip', 'picture', 'ref']);

/**
 * Whether writing `.value` of a content node changes anything the engine reads. A picture is compiled from the template, a manifest `ref` is read
 * from the template's variables (a script reads it, as the barcode encoder does), and
 * an event or calculate script runs from the template text, so a write to either is dropped; a script object in `variables`
 * that holds markup is a data string a script reads back, so it can be rewritten.
 */
function contentWriteHasEffect(node: FormNode): boolean {
  if (node.className === 'picture' || node.className === 'ref') return false;
  if (node.className === 'script') return node.parent?.className === 'variables' && looksLikeMarkup(node.template.content);
  return true;
}

const ONE_OF_OWNERS: ReadonlySet<string> = new Set(['ui', 'value', 'fill']);

const formTables = new Map<string, Table<FormNode>>();

function buildFormTable(className: string): Table<FormNode> {
  const table = new Map<string, FormMember>(Object.entries(BASE));
  const add = (members: Readonly<Record<string, FormMember>>): void => {
    for (const [name, member] of Object.entries(members)) table.set(name, member);
  };
  if (className === 'field' || className === 'exclGroup') add({ ...VALUE, ...VALIDATION, ...DATA_BOUND });
  if (className === 'field') add(ITEMS);
  if (className === 'draw') add(VALUE);
  if (className === 'subform') add(DATA_BOUND);
  if (className === 'form') add({ remerge: { method: (n) => run(() => n.dom.remerge()) } });
  if (className === 'form') add({ createNode: { method: (n, a) => n.dom.createNode(arg(text, a[0], 'createNode'), a[1] === undefined ? '' : arg(text, a[1], 'createNode')) } });
  if (CONTENT_CLASSES.has(className)) {
    add({ value: { get: (n) => n.nodeValue, set: (n, v) => (n.nodeValue = arg(text, v, 'value')), writable: contentWriteHasEffect } });
  }
  if (ONE_OF_OWNERS.has(className)) add({ oneOfChild: { get: (n) => nodeOrNull(n.oneOfChild) } });
  for (const [property, owners] of PROPERTY_OWNERS) {
    if (!owners.includes(className)) continue;
    // `edge` and `corner` answer the first of the four, like `border.edge` in a script.
    if (!table.has(property)) table.set(property, { get: (n) => nodeOrNull(property === 'edge' || property === 'corner' ? n.element(property, 0) : n.property(property)) });
  }
  for (const attribute of attributesOfClass(className)?.keys() ?? []) {
    if (!table.has(attribute)) {
      table.set(attribute, {
        get: (n) => n.attr(attribute) ?? '',
        set: (n, v) => n.setAttr(attribute, parseAttributeValue(className, attribute, v)),
      });
    }
  }
  return table;
}

function formTable(className: string): Table<FormNode> {
  let table = formTables.get(className);
  if (table === undefined) {
    table = buildFormTable(className);
    formTables.set(className, table);
  }
  return table;
}

// ---- data nodes and node lists ---------------------------------------------------------------------------------

const flagSchema = z.union([z.boolean(), z.number()]).optional();

/** An XFA boolean argument: true/false or a number (0 is false), absent is false. */
function flag(input: unknown, what: string): boolean {
  const given = arg(flagSchema, input, what);
  return given === true || (typeof given === 'number' && given !== 0);
}

const DATA_BASE: Table<DataNode> = new Map<string, Member<DataNode>>([
  ['className', { get: (n) => n.className }],
  ['name', { get: (n) => n.name }],
  ['parent', { get: (n) => n.parent }],
  ['nodes', { get: (n) => n.nodes }],
  // A script sees an empty data value as null (the form libraries test `item.value == null` and `String(item.lic.value)`).
  ['value', { get: (n) => (n.className !== 'dataValue' || n.value === '' ? null : n.value), set: (n, v) => (n.value = v === null ? '' : String(arg(z.union([z.string(), z.number(), z.boolean()]), v, 'value'))) }],
  ['saveXML', { method: (n) => n.saveXML() }],
  ['loadXML', { method: (n, a) => run(() => n.loadXML(arg(text, a[0], 'loadXML'), flag(a[1], 'loadXML'), flag(a[2], 'loadXML'))) }],
]);

const DATA_MODEL: Table<DataNode> = new Map<string, Member<DataNode>>([
  ...DATA_BASE,
  ['createNode', { method: (n, a) => n.dom.createDataNode(arg(z.enum(['dataGroup', 'dataValue']), a[0], 'createNode'), arg(text, a[1], 'createNode')) }],
]);

const LIST: Table<NodeListNode> = new Map<string, Member<NodeListNode>>([
  ['className', { get: (n) => n.className }],
  ['length', { get: (n) => n.length }],
  ['item', { method: (n, a) => n.item(arg(integer, a[0], 'item')) }],
  ['append', { method: (n, a) => run(() => n.append(asNode(n, a[0]))) }],
  ['remove', { method: (n, a) => run(() => n.remove(asNode(n, a[0]))) }],
]);

function asNode(list: NodeListNode, input: unknown): DomNode {
  if (input instanceof FormNode || input instanceof DataNode || input instanceof NodeListNode) {
    if (input !== list) return input;
  }
  throw invalidArgument('a node list takes a node of this form');
}

// ---- dispatch --------------------------------------------------------------------------------------------------

function lookup(node: DomNode, name: string): Member<never> | undefined {
  if (node instanceof FormNode) return formTable(node.className).get(name);
  if (node instanceof DataNode) return (node.className === 'dataModel' ? DATA_MODEL : DATA_BASE).get(name);
  return LIST.get(name);
}

/** A child called `name`, else (form nodes) a child of that class, which is how `caption.value.text` reaches the text node. */
function childNamed(dom: FormDom, node: DomNode, name: string): DomNode | undefined {
  return dom.namedChildren(node, name)[0] ?? (node instanceof FormNode ? node.childrenOfClass(name)[0] : undefined);
}

/**
 * Reads `node.name`: a table member first, then a deferred member, then a child of that name (how `Page1.PersonalDetails.Name` is walked).
 * A member name wins over a same-named child (a field called `name` or `value` is reached through `resolveNode`, not by
 * property access), which is also how the XFA scripting model orders them; neither real form has such a clash.
 */
export function getMember(dom: FormDom, node: DomNode, name: string): MemberResult {
  if (FORBIDDEN_NAMES.has(name)) return UNSUPPORTED;
  const member = lookup(node, name);
  if (member?.get !== undefined) return { kind: 'value', value: member.get(node as never) };
  if (member?.method !== undefined) return METHOD;
  if (DEFERRED_MEMBERS.has(name) && !(node instanceof NodeListNode)) return DEFERRED_RESULT;
  const child = childNamed(dom, node, name);
  if (child !== undefined) return { kind: 'value', value: child };
  return node instanceof FormNode && node.hasExpando(name) ? { kind: 'value', value: node.expando(name) } : UNSUPPORTED;
}

/** The classes whose nodes hold properties the object model does not define (see `SetResult`). */
const EXPANDO_CLASSES: ReadonlySet<string> = new Set(['subform', 'exclGroup', 'field']);

function expandoValue(input: unknown): ExpandoValue {
  if (input === undefined || input === null || typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return input;
  if (input instanceof FormNode || input instanceof DataNode || input instanceof NodeListNode) return input;
  throw invalidArgument('a property the object model does not define holds a string, number, boolean, null or a node');
}

/**
 * Writes `node.name = input`. A member with no setter is `unsupported` (class name, parent and the like are read-only);
 * a name the node's class does not define at all, on a container, is kept as an expando. That includes the name of one of
 * its children (the Clear button assigns `AltPhone.ActualNumber = null`, and `ActualNumber` is a field of `AltPhone`): the
 * write is tolerated and stored, but a read still answers the child, so the form keeps reaching the field it names.
 */
export function setMember(_dom: FormDom, node: DomNode, name: string, input: unknown): SetResult {
  if (FORBIDDEN_NAMES.has(name)) return 'unsupported';
  const member = lookup(node, name);
  if (member?.set === undefined) {
    if (DEFERRED_MEMBERS.has(name)) return 'deferred';
    if (member !== undefined || !(node instanceof FormNode) || !EXPANDO_CLASSES.has(node.className)) return 'unsupported';
    node.setExpando(name, expandoValue(input));
    return 'expando';
  }
  if (member.writable?.(node as never) === false) return 'unsupported';
  member.set(node as never, input);
  return 'ok';
}

/** Calls `node.name(...args)`. */
export function callMember(_dom: FormDom, node: DomNode, name: string, args: readonly unknown[]): MemberResult {
  if (FORBIDDEN_NAMES.has(name)) return UNSUPPORTED;
  const member = lookup(node, name);
  if (member?.method !== undefined) return { kind: 'value', value: member.method(node as never, args) };
  return DEFERRED_MEMBERS.has(name) && !(node instanceof NodeListNode) ? DEFERRED_RESULT : UNSUPPORTED;
}
