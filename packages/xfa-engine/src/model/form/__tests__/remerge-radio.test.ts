import { describe, expect, it } from 'vitest';
import { at, build, dataText, textField } from './helpers.js';

const XFA_DATA_NS = 'http://www.xfa.org/schema/xfa-data/1.0/';

// Radio buttons inside an exclusion group bind nothing, so their names need not be data element names.
const radios = (names: string[]): string =>
  `<exclGroup name="G">${names.map((n) => `<field name="${n}"><ui><checkButton/></ui><items><text>${n.length}</text></items></field>`).join('')}</exclGroup>`;
const body = `${textField('F')}${radios(['Réponse', '1st', 'a.b'])}`;

describe('remerge checks exactly what the merge binds (L2-F3)', () => {
  it('a form whose radio buttons have names no data element can carry loads and remerges (the pre-check used to visit them and throw)', () => {
    const { dom } = build(body, '<form1><F>keep</F></form1>');
    expect(() => dom.remerge()).not.toThrow();
    expect(at(dom, 'F').rawValue).toBe('keep');
  });

  it('removing xfa:data re-merges automatically and later writes are saved (the automatic remerge used to throw and leave the form bound to detached data)', () => {
    const { dom, datasets } = build(body, '<form1><F>old</F></form1>');
    dom.call(dom.datasets.nodes, 'remove', [dom.data]);
    at(dom, 'F').rawValue = 'new';
    expect(dataText(datasets)).toContain('<F>new</F>');
  });

  it('a loadXML overwrite of the form data rebinds the form', () => {
    const { dom, datasets } = build(body, '<form1><F>old</F></form1>');
    dom.call(dom.data, 'loadXML', ['<form1><F>fresh</F></form1>', 0, 1]);
    expect(at(dom, 'F').rawValue).toBe('fresh');
    at(dom, 'F').rawValue = 'w';
    expect(dataText(datasets)).toContain('<F>w</F>');
    dom.call(dom.datasets, 'loadXML', [`<x><xfa:data xmlns:xfa="${XFA_DATA_NS}"><form1><F>again</F></form1></xfa:data></x>`, 1, 1]);
    expect(at(dom, 'F').rawValue).toBe('again');
  });
});
