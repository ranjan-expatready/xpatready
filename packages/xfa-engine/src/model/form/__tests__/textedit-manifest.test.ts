import { describe, expect, it } from 'vitest';
import { resolveNode } from '../../som/index.js';
import { at, build, expectForm, must } from './helpers.js';
import type { FormNode } from '../index.js';

const widgetOf = (dom: ReturnType<typeof build>['dom'], field: string): FormNode => must(must(at(dom, field).property('ui')).oneOfChild, 'ui widget');

describe('textEdit scroll and multi-line attributes (colour helpers write them on the text widget)', () => {
  const { dom } = build(`<field name="F"><ui><textEdit/></ui></field>`);

  it('vScrollPolicy, hScrollPolicy and multiLine can be written and read back', () => {
    const widget = widgetOf(dom, 'F');
    expect(dom.set(widget, 'vScrollPolicy', 'off')).toBe('ok');
    expect(dom.set(widget, 'hScrollPolicy', 'auto')).toBe('ok');
    expect(dom.set(widget, 'multiLine', '1')).toBe('ok');
    expect(dom.get(widget, 'vScrollPolicy')).toEqual({ kind: 'value', value: 'off' });
    expect(dom.get(widget, 'hScrollPolicy')).toEqual({ kind: 'value', value: 'auto' });
    expect(dom.get(widget, 'multiLine')).toEqual({ kind: 'value', value: '1' });
  });

  it('a number is written as its text (multiLine = 0), and a value outside the allowed set is an INVALID_ARGUMENT', () => {
    const widget = widgetOf(dom, 'F');
    dom.set(widget, 'multiLine', 0);
    expect(dom.get(widget, 'multiLine')).toEqual({ kind: 'value', value: '0' });
    expectForm(() => dom.set(widget, 'vScrollPolicy', 'sideways'), 'INVALID_ARGUMENT');
    expectForm(() => dom.set(widget, 'multiLine', '2'), 'INVALID_ARGUMENT');
  });

  it('the attributes are not members of other widgets (a misspelt widget member stays unsupported)', () => {
    const other = build(`<field name="N"><ui><numericEdit/></ui></field>`);
    expect(other.dom.set(widgetOf(other.dom, 'N'), 'multiLine', '1')).toBe('unsupported');
  });
});

describe('manifest refs expose their text as value (the barcode encoder walks collection.nodes.item(i).value)', () => {
  const body = `<variables><manifest name="m1" id="x"><ref>form1.F</ref><ref>form1.G</ref></manifest></variables><field name="F"/><field name="G"/>`;
  const { dom } = build(body);

  it('item(i).value is the ref text, and resolving it names the node it points at', () => {
    const manifest = must(resolveNode(dom.root, 'm1')) as FormNode;
    const list = dom.get(manifest, 'nodes');
    expect(list.kind).toBe('value');
    const first = (list.kind === 'value' ? list.value : null) as { item(i: number): unknown };
    const ref = first.item(0) as FormNode;
    expect(ref.className).toBe('ref');
    expect(dom.get(ref, 'value')).toEqual({ kind: 'value', value: 'form1.F' });
    expect(resolveNode(dom.root, String(ref.nodeValue))).toBe(at(dom, 'F'));
  });

  it('a script cannot rewrite a ref: the write is unsupported, because the engine reads the template\'s refs', () => {
    const manifest = must(resolveNode(dom.root, 'm1')) as FormNode;
    const ref = must(manifest.children.find((c) => c.className === 'ref'));
    expect(dom.set(ref, 'value', 'form1.G')).toBe('unsupported');
  });
});
