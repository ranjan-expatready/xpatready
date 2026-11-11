import { describe, expect, it } from 'vitest';
import { FormNode, XfaFormError } from '../index.js';
import { at, build, dataText, expectForm, must, textField } from './helpers.js';

describe('failures a script can cause are catchable XfaFormErrors (F6)', () => {
  it('saveXML over a data tree that cannot serialize is an INVALID_OPERATION XfaFormError (it was the loader error class, which a script cannot catch)', () => {
    const { dom, datasets } = build(textField('F'), '<form1><F>v</F></form1>');
    const f = must(must(dom.data.child('form1')).child('F'));
    // Tamper with the DOM underneath the engine, as no script write can after F5.
    (f.element as { appendChild(n: unknown): void }).appendChild(datasets.createTextNode('a\u000Bb'));
    expectForm(() => dom.call(dom.data, 'saveXML', []), 'INVALID_OPERATION');
  });

  it('createNode refuses a name no data element can carry for a class that binds, up front (INVALID_ARGUMENT), but accepts any name for a class that never binds', () => {
    const { dom } = build(textField('F'));
    for (const className of ['field', 'subform', 'exclGroup']) {
      expectForm(() => dom.createNode(className, 'has space'), 'INVALID_ARGUMENT', /name/i);
      expectForm(() => dom.createNode(className, '9lead'), 'INVALID_ARGUMENT');
      expectForm(() => dom.createNode(className, 'a.b'), 'INVALID_ARGUMENT');
    }
    expect(dom.createNode('field', 'Good_name-1')).toBeInstanceOf(FormNode);
    expect(dom.createNode('field', '')).toBeInstanceOf(FormNode);
    expect(dom.createNode('text', 'has space')).toBeInstanceOf(FormNode);
  });

  it('remerge validates every name before it unbinds anything: a bad node fails with INVALID_ARGUMENT and the form keeps its bindings (it used to throw half-way through, leaving the form unbound)', () => {
    const { dom, datasets } = build(textField('F'), '<form1><F>keep</F></form1>');
    // A bindable node whose name `createNode` would have refused, put there the way only a bug could.
    const stray = new FormNode(dom, dom.standIn('field', 'bad name'), false);
    dom.root.appendNode(stray);
    const before = dataText(datasets);
    let thrown: unknown;
    try {
      dom.remerge();
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(XfaFormError);
    expect((thrown as XfaFormError).code).toBe('INVALID_ARGUMENT');
    expect(at(dom, 'F').rawValue).toBe('keep');
    expect(at(dom, 'F').dataNode).not.toBeNull();
    expect(dataText(datasets)).toBe(before);
  });

  it('a data node created with an invalid name is INVALID_ARGUMENT as before', () => {
    const { dom } = build(textField('F'));
    expectForm(() => dom.createDataNode('dataGroup', 'bad name'), 'INVALID_ARGUMENT');
  });
});
