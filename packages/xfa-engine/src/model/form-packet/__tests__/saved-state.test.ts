import { describe, expect, it } from 'vitest';
import { at, build, datasetsXml } from '../../form/__tests__/helpers.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { formChecksum, MAX_SAVED_SKIPPED, readSavedState } from '../index.js';

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const BODY = '<subform name="A"><field name="X"><ui><textEdit/></ui></field><field name="Y"><ui><textEdit/></ui></field></subform>';
const DATA = '<form1><A><X/><Y/></A></form1>';

function savedState(form: (checksum: string) => string, maxDeltas?: number) {
  const { dom } = build(BODY, DATA);
  const template = enc(tpl(BODY));
  const datasets = enc(datasetsXml(DATA));
  return readSavedState(dom, { template, datasets, form: form(formChecksum([template, datasets])) }, maxDeltas === undefined ? undefined : { maxDeltas });
}

const PACKET = (sum: string): string =>
  `<form checksum="${sum}" xmlns="http://www.xfa.org/schema/xfa-form/2.8/"><subform name="form1"><subform name="A" presence="hidden">` +
  '<field name="X" access="readOnly"/><field name="Y" access="protected"/></subform></subform></form>';

describe('readSavedState: a saved form packet is read only when it verifies, and within its ceiling', () => {
  it('reads one delta per saved attribute', () => {
    const saved = savedState(PACKET);
    expect(saved.summary).toEqual({ status: 'restorable', deltas: 3, skipped: 0 });
    expect(saved.deltas.map((d) => [d.container.name, d.target, d.savedValue])).toEqual([
      ['A', 'presence', 'hidden'],
      ['X', 'access', 'readOnly'],
      ['Y', 'access', 'protected'],
    ]);
  });

  it('a packet over the delta ceiling is rejected whole, not read in part', () => {
    expect(savedState(PACKET, 2)).toEqual({ summary: { status: 'rejected', deltas: 0, skipped: 0 }, deltas: [] });
  });

  it('a packet that is not XML, has another root, or carries a checksum of the wrong length is rejected', () => {
    expect(savedState(() => '<form><unclosed>').summary.status).toBe('rejected');
    expect(savedState((sum) => `<template checksum="${sum}"/>`).summary.status).toBe('rejected');
    expect(savedState(() => '<form checksum="short"/>').summary.status).toBe('rejected');
  });
});

describe('readSavedState: same-named siblings are matched by position, and unmatched entries are capped', () => {
  const SIBLINGS = '<subform name="A"><field name="X"><ui><textEdit/></ui></field><field name="X"><ui><textEdit/></ui></field><field name="X"><ui><textEdit/></ui></field></subform>';
  const packet = (sum: string, inner: string): string =>
    `<form checksum="${sum}" xmlns="http://www.xfa.org/schema/xfa-form/2.8/"><subform name="form1"><subform name="A">${inner}</subform></subform></form>`;

  function read(body: string, inner: string, limits?: { maxSkipped?: number }) {
    const { dom } = build(body, '<form1/>');
    const template = enc(tpl(body));
    const datasets = enc(datasetsXml('<form1/>'));
    const saved = readSavedState(dom, { template, datasets, form: packet(formChecksum([template, datasets]), inner) }, limits);
    return { dom, saved };
  }

  it('the n-th saved element of a name goes to the n-th node of that name, and a surplus one is skipped', () => {
    const { dom, saved } = read(SIBLINGS, '<field name="X" access="readOnly"/><field name="X" access="protected"/><field name="X" access="nonInteractive"/><field name="X" access="readOnly"/>');
    expect(saved.summary).toEqual({ status: 'restorable', deltas: 3, skipped: 1 });
    const siblings = [0, 1, 2].map((i) => at(dom, `A.X[${i}]`));
    expect(saved.deltas.map((d) => d.container)).toEqual(siblings);
    expect(saved.deltas.map((d) => d.savedValue)).toEqual(['readOnly', 'protected', 'nonInteractive']);
  });

  it('a class and a name must both match: a saved exclGroup does not take a field of the same name', () => {
    const { saved } = read(SIBLINGS, '<exclGroup name="X" access="readOnly"/>');
    expect(saved.summary).toEqual({ status: 'restorable', deltas: 0, skipped: 1 });
  });

  it('a packet with more unmatched entries than the ceiling is rejected whole, as one past the delta ceiling is', () => {
    const unmatched = (n: number): string => '<field name="Nope"/>'.repeat(n);
    expect(read(SIBLINGS, unmatched(3), { maxSkipped: 3 }).saved.summary).toEqual({ status: 'restorable', deltas: 0, skipped: 3 });
    expect(read(SIBLINGS, unmatched(4), { maxSkipped: 3 }).saved).toEqual({ summary: { status: 'rejected', deltas: 0, skipped: 0 }, deltas: [] });
  });

  it('the default ceiling is applied when the caller sets none', () => {
    const unmatched = '<field name="Nope"/>'.repeat(MAX_SAVED_SKIPPED + 1);
    expect(read(SIBLINGS, unmatched).saved.summary.status).toBe('rejected');
  });
});
