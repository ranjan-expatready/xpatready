import { DOMParser, type Element } from '@xmldom/xmldom';
import type { XfaPdf } from '../../xfa-pdf.js';

/**
 * The oracle of the E10 tests: what the form's own files say is mandatory and visible, read from the PDF's template packet and
 * from the saved UI state in its `form` packet (the state Acrobat wrote into the file: it is what the form's own restore
 * script puts back when the form opens), by walking the XML directly. It calls no engine helper, so it cannot agree with the
 * engine by sharing its code.
 *
 * A field or exclusion group is expected in the list when, after the saved state is laid over the template, its `validate`
 * has `nullTest` error or warning, it is not a button or barcode, it is not inside an exclusion group, it is empty, and it
 * and every container above it have `presence` visible and no print-only `relevant`.
 */

export interface Expected {
  /** Canonical SOM from the root subform's parent, e.g. `xfa[0].form[0].form1[0].Page1[0]...`. */
  readonly som: string;
  readonly severity: 'error' | 'warning';
  /** The text of `validate/message/text[name=nullTest]` in the template, or null. */
  readonly message: string | null;
}

interface Override {
  readonly presence?: string;
  readonly nullTest?: string;
}

const CONTAINERS = new Set(['subform', 'subformSet', 'area', 'field', 'exclGroup']);

const elementsOf = (parent: Element, name?: string): Element[] =>
  Array.from(parent.childNodes).filter((n): n is Element => n.nodeType === 1 && (name === undefined || n.nodeName === name));

/**
 * Walks the named containers of a packet in document order. `visit` gets each with its canonical path (names and same-name
 * sibling indexes) and whether anything above it is hidden, and returns whether the containers below it are hidden, or
 * `undefined` to stop descending.
 */
function walkNamed(root: Element, visit: (element: Element, path: string, hiddenAbove: boolean) => boolean | undefined): void {
  const step = (parent: Element, parentPath: string, hiddenAbove: boolean): void => {
    const siblings = elementsOf(parent);
    siblings.forEach((child, position) => {
      if (!CONTAINERS.has(child.nodeName)) return;
      // XFA 3.3 SOM expressions: `name[n]` is the n-th of the siblings that answer to the name, whatever their class (a draw or a
      // subform of the same name counts); a node without a name is addressed `#class[n]`, counted over all siblings of that class.
      const given = child.getAttribute('name');
      const earlier = siblings.slice(0, position);
      const label = given === null || given === '' ? `#${child.nodeName}` : given;
      const index = earlier.filter((e) => (label.startsWith('#') ? e.nodeName === child.nodeName : e.getAttribute('name') === label)).length;
      const path = `${parentPath}.${label}[${index}]`;
      const below = visit(child, path, hiddenAbove);
      if (below !== undefined) step(child, path, below);
    });
  };
  step(root, 'xfa[0].form[0]', false);
}

function overridesOf(formPacket: string | undefined): Map<string, Override> {
  const map = new Map<string, Override>();
  if (formPacket === undefined) return map;
  const root = new DOMParser().parseFromString(formPacket, 'text/xml').documentElement;
  if (root === null) throw new Error('the form packet has no root element');
  walkNamed(root, (element, path) => {
    const presence = element.getAttribute('presence');
    const nullTest = elementsOf(element, 'validate')[0]?.getAttribute('nullTest') ?? null;
    if (presence !== null || nullTest !== null) map.set(path, { ...(presence === null ? {} : { presence }), ...(nullTest === null ? {} : { nullTest }) });
    return false;
  });
  return map;
}

const printOnly = (relevant: string | null): boolean => /^\+?print$/.test((relevant ?? '').trim().split(/\s+/)[0] ?? '');

/** What the template and saved state expect to be listed for the form as the PDF holds it (every field empty), in document order. */
export function expectedProblems(pdf: XfaPdf): Expected[] {
  const template = new DOMParser().parseFromString(pdf.packet('template').text(), 'text/xml');
  const saved = overridesOf(pdf.packets.find((p) => p.name === 'form')?.text());
  const out: Expected[] = [];
  if (template.documentElement === null) throw new Error('the template has no root element');
  walkNamed(template.documentElement, (element, path, hiddenAbove) => {
    const override = saved.get(path);
    const hidden = hiddenAbove || (override?.presence ?? element.getAttribute('presence') ?? 'visible') !== 'visible' || printOnly(element.getAttribute('relevant'));
    // A container below a hidden one is hidden; a field or an exclusion group is judged here, and what is inside an exclusion group is covered by the group.
    if (element.nodeName !== 'field' && element.nodeName !== 'exclGroup') return hidden;
    if (hidden) return undefined;
    const validate = elementsOf(element, 'validate')[0];
    const nullTest = override?.nullTest ?? validate?.getAttribute('nullTest') ?? 'disabled';
    const ui = elementsOf(element, 'ui')[0];
    const widget = element.nodeName === 'field' && ui !== undefined ? elementsOf(ui)[0]?.nodeName : undefined;
    const value = elementsOf(element, 'value')[0];
    const hasDefault = value !== undefined && elementsOf(value).some((n) => (n.textContent ?? '').trim() !== '');
    if ((nullTest === 'error' || nullTest === 'warning') && widget !== 'button' && widget !== 'barcode' && !hasDefault) {
      const message = validate === undefined ? undefined : elementsOf(validate, 'message')[0];
      const text = message === undefined ? undefined : elementsOf(message, 'text').find((t) => t.getAttribute('name') === 'nullTest');
      out.push({ som: path, severity: nullTest, message: text === undefined ? null : (text.textContent ?? '') });
    }
    return undefined;
  });
  return out;
}
