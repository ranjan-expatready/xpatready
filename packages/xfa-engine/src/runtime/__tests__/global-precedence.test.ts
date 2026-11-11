import { describe, expect, it } from 'vitest';
import { loaded, onEvent, textField } from './helpers.js';

/** `shared` is a field of subform B only; subform A's scope cannot reach it. */
const subformA = (script: string): string => `<subform name="A">${textField('a1', onEvent('initialize', script))}</subform>`;
const subformB = (script: string): string =>
  `<subform name="B">${textField('shared')}${textField('b1', onEvent('initialize', script))}</subform>`;

describe('a name an earlier script made a JavaScript global wins over a form node of the same name', () => {
  it('control: with no earlier global, the bare name is the form node (SOM binding, as before)', async () => {
    const rt = await loaded(`${subformB('this.rawValue = typeof shared;')}${subformA('this.rawValue = "ran";')}`);
    expect(rt.getValue('B.b1')).toBe('object');
  });

  it('a global created by an earlier script (implicit assignment) is what a later script sees under that name, even where a node of that name is in scope', async () => {
    const rt = await loaded(`${subformA('shared = 7;')}${subformB('this.rawValue = typeof shared + ":" + shared;')}`);
    expect(rt.getValue('B.b1')).toBe('number:7');
  });

  it('the global stays one variable: a later script that assigns it changes it for every script after, and does not shadow it with a local', async () => {
    const rt = await loaded(
      `${subformA('shared = 7;')}${subformB('shared = shared + 1; this.rawValue = String(shared);')}<subform name="C">${textField('c1', onEvent('initialize', 'this.rawValue = String(shared);'))}</subform>`,
    );
    expect(rt.getValue('B.b1')).toBe('8');
    expect(rt.getValue('C.c1')).toBe('8');
  });

  it('the node is still reachable by a qualified name, so nothing becomes unreachable', async () => {
    const rt = await loaded(
      `${subformA('shared = 7;')}${subformB('B.shared.rawValue = "via-node"; this.rawValue = B.shared.rawValue + ":" + shared;')}`,
    );
    expect(rt.getValue('B.b1')).toBe('via-node:7');
    expect(rt.getValue('B.shared')).toBe('via-node');
  });

  it('a name that is not (yet) a JavaScript global keeps binding to its node: the rule never turns a working lookup into a ReferenceError', async () => {
    const rt = await loaded(`${subformA('if (false) { shared = 1; }')}${subformB('this.rawValue = typeof shared;')}`);
    expect(rt.getValue('B.b1')).toBe('object');
  });

  it('script objects and language globals are untouched by the rule', async () => {
    const rt = await loaded(
      `<variables><script name="lib" contentType="application/x-javascript">function twice(n) { return n * 2; }</script></variables>${subformA('this.rawValue = String(lib.twice(4)) + Math.max(1, 2);')}`,
    );
    expect(rt.getValue('A.a1')).toBe('82');
  });
});
