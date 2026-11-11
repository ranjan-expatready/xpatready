import { describe, expect, it } from 'vitest';
import { build, dataText, expectForm, find, textField } from './helpers.js';
import { MAX_EXPANDO_CHARS, MAX_EXPANDOS } from '../limits.js';
import type { DomNode } from '../node-list.js';

const body = `<subform name="S">${textField('F')}<exclGroup name="G">${textField('Yes')}${textField('No')}</exclGroup><draw name="D"><value><text>t</text></value></draw></subform><subform name="Other"/>`;
const setup = () => {
  const built = build(body);
  const { dom } = built;
  return { ...built, S: find(dom, 'subform', 'S'), G: find(dom, 'exclGroup', 'G'), F: find(dom, 'field', 'F'), D: find(dom, 'draw', 'D'), Other: find(dom, 'subform', 'Other') };
};

describe('an unknown property written on a subform, exclusion group or field is a per-node expando', () => {
  it('is stored and read back on that node (the radio "No" handler sets subform.rawValue and may read it)', () => {
    const { dom, S, G, F } = setup();
    for (const [node, name] of [[S, 'rawValue'], [G, 'extra'], [F, 'extra']] as const) {
      expect(dom.get(node, name)).toEqual({ kind: 'unsupported' });
      expect(dom.set(node, name, 'v1')).toBe('expando');
      expect(dom.get(node, name)).toEqual({ kind: 'value', value: 'v1' });
    }
  });

  it('keeps strings, numbers, booleans and null exactly, and a later write replaces the earlier one', () => {
    const { dom, S } = setup();
    for (const value of ['text', 7, 0, true, false, null, '']) {
      expect(dom.set(S, 'ActualNumber', value)).toBe('expando');
      expect(dom.get(S, 'ActualNumber')).toEqual({ kind: 'value', value });
    }
  });

  it('can hold a node of this form (a script may stash a reference)', () => {
    const { dom, S, F } = setup();
    expect(dom.set(S, 'ref', F as DomNode)).toBe('expando');
    expect(dom.get(S, 'ref')).toEqual({ kind: 'value', value: F });
  });

  it('is per node: the same name on another node is untouched and still unsupported there', () => {
    const { dom, S, Other } = setup();
    dom.set(S, 'rawValue', 'x');
    expect(dom.get(Other, 'rawValue')).toEqual({ kind: 'unsupported' });
  });

  it('never reaches the datasets: the serialized data is byte-identical before and after', () => {
    const { dom, datasets, S, F } = setup();
    const before = dataText(datasets);
    dom.set(S, 'rawValue', 'secret');
    dom.set(F, 'extra', 'secret');
    expect(dataText(datasets)).toBe(before);
    expect(dataText(datasets)).not.toContain('secret');
  });

  it('never reaches the template: the read-only template view has no such member, and the mirror of a template node is unaffected', () => {
    const { dom, S } = setup();
    dom.set(S, 'rawValue', 'x');
    const view = dom.template;
    const templateS = view.children.flatMap((c) => c.children).find((c) => c.className === 'subform' && c.name === 'S');
    expect(templateS).toBeDefined();
    expect(dom.get(templateS as DomNode, 'rawValue')).toEqual({ kind: 'unsupported' });
  });

  it('is not an expando on the read-only template view: writing there is the usual INVALID_OPERATION', () => {
    const { dom } = setup();
    const templateS = dom.template.children.flatMap((c) => c.children).find((c) => c.className === 'subform' && c.name === 'S');
    expectForm(() => dom.set(templateS as DomNode, 'rawValue', 'x'), 'INVALID_OPERATION');
  });

  it('is only for containers: a draw (or any other class) still reports an unknown member as unsupported', () => {
    const { dom, D } = setup();
    expect(dom.set(D, 'rawValueX', 'x')).toBe('unsupported');
    expect(dom.get(D, 'rawValueX')).toEqual({ kind: 'unsupported' });
  });

  it('does not shadow a real member: a read-only member stays unsupported to write, and a member that has a setter still takes the write', () => {
    const { dom, S, F } = setup();
    expect(dom.set(S, 'className', 'x')).toBe('unsupported');
    expect(dom.set(F, 'parent', null)).toBe('unsupported');
    expect(dom.set(F, 'rawValue', 'typed')).toBe('ok');
    expect(dom.get(F, 'rawValue')).toEqual({ kind: 'value', value: 'typed' });
  });

  it('tolerates the name of an existing child (the Clear button assigns a field of the subform) but a read still answers the child', () => {
    const { dom, S, F } = setup();
    expect(dom.set(S, 'F', null)).toBe('expando');
    expect(dom.get(S, 'F')).toEqual({ kind: 'value', value: F });
  });

  it('refuses the prototype-reaching names (set and get), and pollutes nothing', () => {
    const { dom, S } = setup();
    for (const name of ['__proto__', 'constructor', 'prototype']) {
      expect(dom.set(S, name, 'x')).toBe('unsupported');
      expect(dom.get(S, name)).toEqual({ kind: 'unsupported' });
    }
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
    expect(({} as Record<string, unknown>)['x']).toBeUndefined();
  });

  it('holds only scalars and nodes: an array or object value is INVALID_ARGUMENT', () => {
    const { dom, S } = setup();
    expectForm(() => dom.set(S, 'list', [1, 2]), 'INVALID_ARGUMENT');
    expectForm(() => dom.set(S, 'obj', { a: 1 }), 'INVALID_ARGUMENT');
    expect(dom.get(S, 'list')).toEqual({ kind: 'unsupported' });
  });

  describe('ceilings (security invariants: a script cannot grow memory through expandos)', () => {
    it('too many distinct properties on the whole form is LIMIT', () => {
      const { dom, S, Other } = setup();
      const nodes = [S, Other];
      expectForm(() => {
        for (let i = 0; i <= MAX_EXPANDOS; i += 1) dom.set(nodes[i % 2] as DomNode, `p${i}`, i);
      }, 'LIMIT');
    });

    it('rewriting one property any number of times never counts twice', () => {
      const { dom, S } = setup();
      for (let i = 0; i < MAX_EXPANDOS * 2; i += 1) expect(dom.set(S, 'same', i)).toBe('expando');
    });

    it('too many characters of string values is LIMIT, and overwriting a long value with a short one frees the room', () => {
      const { dom, S } = setup();
      const big = 'x'.repeat(MAX_EXPANDO_CHARS);
      expect(dom.set(S, 'a', big)).toBe('expando');
      expectForm(() => dom.set(S, 'b', 'y'), 'LIMIT');
      expect(dom.set(S, 'a', 'short')).toBe('expando');
      expect(dom.set(S, 'b', 'y')).toBe('expando');
    });

    it('a failed write leaves the earlier value in place', () => {
      const { dom, S } = setup();
      dom.set(S, 'a', 'x'.repeat(MAX_EXPANDO_CHARS));
      expectForm(() => dom.set(S, 'a', 'x'.repeat(MAX_EXPANDO_CHARS + 1)), 'LIMIT');
      expect(dom.get(S, 'a')).toEqual({ kind: 'value', value: 'x'.repeat(MAX_EXPANDO_CHARS) });
    });
  });
});
