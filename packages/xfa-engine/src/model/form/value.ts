import { z } from 'zod';
import { bindOf, pictureOf } from '../template/index.js';
import type { Picture } from '../picture/index.js';
import { parseAttributeValue } from './attributes.js';
import { nodeText } from './data-dom.js';
import { invalidArgument, invalidOperation, limitExceeded } from './errors.js';
import { MAX_VALUE_CHARS } from './limits.js';
import { lists } from './items.js';
import type { FormNode } from './node.js';

/** Value classes whose raw value is a number when the stored text is one. */
const NUMERIC_KINDS: ReadonlySet<string> = new Set(['integer', 'decimal', 'float', 'boolean']);

const rawInput = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const isRadio = (node: FormNode): boolean => node.className === 'field' && node.parent?.className === 'exclGroup';

function valueNodeOf(node: FormNode): FormNode | undefined {
  return node.children.find((c) => c.className === 'value');
}

function kindOf(node: FormNode): string {
  return valueNodeOf(node)?.oneOfChild?.className ?? 'text';
}

export const widgetOf = (node: FormNode): string | undefined => node.children.find((c) => c.className === 'ui')?.oneOfChild?.className;

const bindPicture = (node: FormNode): Picture | undefined => node.dom.pictureFor(bindOf(node.template)?.picture);
const formatPicture = (node: FormNode): Picture | undefined => node.dom.pictureFor(pictureOf(node.template.firstChild('format')));
const editPicture = (node: FormNode): Picture | undefined => node.dom.pictureFor(pictureOf(node.template.firstChild('ui')));

/** The text a container holds, not yet null-normalised: the bound data (read through the bind picture) or the node's own value text. */
function storedText(node: FormNode): string {
  const element = node.boundElement;
  if (element !== null) {
    const text = nodeText(element);
    if (text === '') return '';
    const parsed = bindPicture(node)?.parse(text);
    return parsed?.ok === true && parsed.canonical !== null ? parsed.canonical : text;
  }
  return valueNodeOf(node)?.oneOfChild?.plainText ?? '';
}

/** The `items` first value of a radio or check button: its "on" value. */
function onValueOf(field: FormNode): string | null {
  const first = field.children.find((c) => c.className === 'items')?.children[0];
  return first === undefined || first.plainText === '' ? null : first.plainText;
}

/** The canonical text of the node's value, null when empty. For a radio button: its on-value when the group holds it. */
export function readText(node: FormNode): string | null {
  if (node.className === 'subform') throw invalidOperation('a subform has no value');
  if (isRadio(node) && node.parent !== null) {
    const group = storedText(node.parent);
    const on = onValueOf(node);
    return group !== '' && on !== null && group === on ? on : null;
  }
  const text = storedText(node);
  return text === '' ? null : text;
}

const PLAIN_NUMBER = /^-?\d+(?:\.\d+)?$/;

/** `rawValue` as a script sees it: null when empty, a number for numeric value classes holding a number, else the text. */
export function readRaw(node: FormNode): string | number | null {
  const text = readText(node);
  if (text === null) return null;
  if (NUMERIC_KINDS.has(kindOf(node)) && PLAIN_NUMBER.test(text)) {
    const n = Number(text);
    if (Number.isFinite(n)) return n;
  }
  return text;
}

function coerce(input: unknown): string | null {
  const parsed = rawInput.safeParse(input);
  if (!parsed.success) throw invalidArgument('rawValue accepts a string, number, boolean or null');
  const v = parsed.data;
  if (v === null) return null;
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw invalidArgument('rawValue cannot be NaN or infinite');
    return String(v);
  }
  if (v.length > MAX_VALUE_CHARS) throw limitExceeded(`a value may hold at most ${MAX_VALUE_CHARS} characters`);
  return v;
}

function ensureContent(node: FormNode): FormNode {
  let holder = valueNodeOf(node);
  if (holder === undefined) {
    holder = node.dom.createNode('value', '');
    node.appendNode(holder);
  }
  let content = holder.oneOfChild;
  if (content === undefined) {
    content = node.dom.createNode('text', '');
    holder.appendNode(content);
  }
  return content;
}

/** Stores canonical text: into the bound data node through the bind picture (verbatim when the picture cannot show it), else into the node's own value. */
function writeStored(node: FormNode, text: string | null): void {
  const element = node.boundElement;
  if (element === null) {
    ensureContent(node).setPlainText(text ?? '');
    return;
  }
  let out = text ?? '';
  if (text !== null) {
    const shown = bindPicture(node)?.format(text);
    if (shown?.ok === true) out = shown.text;
  }
  node.dom.writeText(element, out);
}

function writeGroup(group: FormNode, text: string | null): void {
  const matches = text !== null && group.children.some((c) => c.className === 'field' && onValueOf(c) === text);
  writeStored(group, matches ? text : null);
}

/** `rawValue = v`: strings, numbers, booleans and null only; an exclusion group selects the child whose on-value matches (else clears). */
export function writeRaw(node: FormNode, input: unknown): void {
  node.assertWritable();
  const text = coerce(input);
  switch (node.className) {
    case 'exclGroup':
      writeGroup(node, text);
      return;
    case 'field':
    case 'draw':
      if (isRadio(node) && node.parent !== null) {
        const on = onValueOf(node);
        if (text !== null && text === on) writeGroup(node.parent, on);
        else if (on !== null && storedText(node.parent) === on) writeStored(node.parent, null);
        return;
      }
      writeStored(node, text);
      return;
    default:
      throw invalidOperation(`${node.className} has no value to assign`);
  }
}

export interface Formatted {
  readonly text: string;
  /** False when a format picture exists but could not show the (non-empty) value, which is then shown as it is. */
  readonly formatted: boolean;
}

/** The display text: the label of the selected choice, else the format picture applied to the value, else the value itself. */
export function formatted(node: FormNode): Formatted {
  const raw = readText(node);
  if (raw === null) return { text: '', formatted: true };
  if (widgetOf(node) === 'choiceList') {
    const { labels, values } = lists(node);
    const at = values.indexOf(raw);
    if (at >= 0) return { text: labels[at] ?? '', formatted: true };
  }
  const picture = formatPicture(node);
  if (picture === undefined) return { text: raw, formatted: true };
  const shown = picture.format(raw);
  return shown.ok ? { text: shown.text, formatted: true } : { text: raw, formatted: false };
}

/** Typed text through the edit picture: stored canonical when it parses, stored as typed (returning false) when it does not. */
export function commitInput(node: FormNode, text: string): boolean {
  if (text.length > MAX_VALUE_CHARS) throw limitExceeded(`a value may hold at most ${MAX_VALUE_CHARS} characters`);
  if (text === '') {
    writeRaw(node, null);
    return true;
  }
  const picture = editPicture(node);
  if (picture === undefined) {
    writeRaw(node, text);
    return true;
  }
  const parsed = picture.parse(text);
  if (parsed.ok && parsed.canonical !== null) {
    writeRaw(node, parsed.canonical);
    return true;
  }
  writeRaw(node, text);
  return false;
}

/** Writes an enumerated attribute (`presence`, `access`) after checking the value against the XFA enumeration. */
export function writeEnum(node: FormNode, name: string, input: unknown): void {
  node.assertWritable();
  node.setAttr(name, parseAttributeValue(node.className, name, input));
}
