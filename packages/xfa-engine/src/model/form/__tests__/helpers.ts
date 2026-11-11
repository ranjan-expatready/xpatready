import type { Document } from '@xmldom/xmldom';
import { expect } from 'vitest';
import { XfaPdfError, type XfaPdfErrorCode } from '../../../pdf/errors.js';
import { parseXml } from '../../../xml/parse.js';
import { serializeXml } from '../../../xml/serialize.js';
import { loadTemplate } from '../../template/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { createFormDom, XfaFormError, type DataNode, type FormDom, type FormNode, type XfaFormErrorCode } from '../index.js';

export { must, caught } from '../../template/__tests__/helpers.js';

const XFA_DATA_NS = 'http://www.xfa.org/schema/xfa-data/1.0/';

/** A datasets packet: optional `lov` children of `xfa:datasets` before `xfa:data`, then the given data body. */
export function datasetsXml(data: string, lov = ''): string {
  return `<?xml version="1.0" encoding="UTF-8"?><xfa:datasets xmlns:xfa="${XFA_DATA_NS}">${lov}<xfa:data>${data}</xfa:data></xfa:datasets>`;
}

export interface Built {
  readonly dom: FormDom;
  readonly datasets: Document;
}

/** Template body inside the root subform `form1`, data body inside `xfa:data`. */
export function build(body: string, data = '<form1/>', lov = ''): Built {
  const datasets = parseXml(datasetsXml(data, lov));
  return { dom: createFormDom(loadTemplate(tpl(body)), datasets), datasets };
}

export function dataText(datasets: Document): string {
  return serializeXml(datasets);
}

/** Resolves `a.b[1].c` against the form tree from `dom.root` (index counts same-name siblings; test-only, T04 owns real SOM). */
export function at(dom: FormDom, path: string): FormNode {
  let current: FormNode = dom.root;
  for (const segment of path.split('.')) {
    const match = /^([^[\]]+)(?:\[(\d+)\])?$/.exec(segment);
    if (match === null) throw new Error(`bad test path segment "${segment}"`);
    const found = current.children.filter((c) => c.name === match[1])[Number(match[2] ?? '0')];
    if (found === undefined) throw new Error(`no node "${segment}" under ${current.className}:${current.name}`);
    current = found;
  }
  return current;
}

/** The first node of `className` called `name` anywhere in the live form tree (document order). */
export function find(dom: FormDom, className: string, name: string): FormNode {
  let found: FormNode | undefined;
  dom.walk((n) => {
    if (found === undefined && n.className === className && n.name === name) found = n;
  });
  if (found === undefined) throw new Error(`no ${className} "${name}"`);
  return found;
}

export function dataAt(dom: FormDom, path: string): DataNode {
  const node = at(dom, path).dataNode;
  if (node === null) throw new Error(`"${path}" has no bound data node`);
  return node;
}

/** Asserts `fn` throws an XfaPdfError of `code` and returns it. */
export function expectXfa(fn: () => unknown, code: XfaPdfErrorCode, match?: RegExp): XfaPdfError {
  let thrown: unknown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  expect(thrown, 'must throw a typed XfaPdfError').toBeInstanceOf(XfaPdfError);
  const err = thrown as XfaPdfError;
  expect(err.code).toBe(code);
  if (match !== undefined) expect(err.message).toMatch(match);
  return err;
}

export function expectForm(fn: () => unknown, code: XfaFormErrorCode, match?: RegExp): XfaFormError {
  let thrown: unknown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  expect(thrown, 'must throw a typed XfaFormError').toBeInstanceOf(XfaFormError);
  const err = thrown as XfaFormError;
  expect(err.code).toBe(code);
  if (match !== undefined) expect(err.message).toMatch(match);
  return err;
}

/** A text field with the given name and optional extra children. */
export const textField = (name: string, extra = ''): string => `<field name="${name}"><ui><textEdit/></ui>${extra}</field>`;
