import { describe, expect, it } from 'vitest';
import { cleanXmlText } from '../../../xml/chars.js';
import { at, build, datasetsXml } from '../../form/__tests__/helpers.js';
import type { FormNode } from '../../form/index.js';
import { resolveNode } from '../../som/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { captureItemsBaseline, formPacketText, readSavedState } from '../index.js';
import { buildFormPacket } from '../serialize.js';

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const UNBOUND = (name: string): string => `<field name="${name}"><bind match="none"/><ui><textEdit/></ui></field>`;
const CAPTIONED = (name: string): string => `<field name="${name}"><ui><textEdit/></ui><caption><value><text>c</text></value></caption></field>`;
const LIST = '<field name="Pick"><bind match="none"/><ui><choiceList/></ui><items><text>old</text></items></field>';

/** Saves the form, re-opens it on a fresh form of the same template and returns what was restored. */
function roundTrip(body: string, change: (dom: ReturnType<typeof build>['dom']) => void) {
  const { dom } = build(body);
  const baseline = captureItemsBaseline(dom);
  change(dom);
  const template = enc(tpl(body));
  const datasets = enc(datasetsXml('<form1/>'));
  const form = formPacketText(dom, template, datasets, baseline);
  const saved = readSavedState(build(body).dom, { template, datasets, form });
  return { form, saved };
}

describe('cleanXmlText: text XML cannot hold is cleaned, clean text is returned as is (L5-F1)', () => {
  it('turns vertical tab and form feed into a line feed and drops every other forbidden character', () => {
    expect(cleanXmlText('a\u000Bb')).toBe('a\nb');
    expect(cleanXmlText('a\u000Cb')).toBe('a\nb');
    expect(cleanXmlText('a\u0001b\u0000c\u001Fd￾e￿f')).toBe('abcdef');
    expect(cleanXmlText('a\uD800')).toBe('a');
    expect(cleanXmlText('\uDC00b')).toBe('b');
    expect(cleanXmlText('x𐀀y')).toBe('x𐀀y');
  });

  it('keeps tab, line feed, carriage return and the very same string when nothing is forbidden', () => {
    const clean = 'a\tb\nc\rd é 😀';
    expect(cleanXmlText(clean)).toBe(clean);
    expect(cleanXmlText('')).toBe('');
  });
});

describe('text written to a form node is cleaned, so the form packet always saves and re-opens (L5-F1)', () => {
  it.each([
    ['vertical tab', 'a\u000Bb', 'a\nb'],
    ['form feed', 'a\u000Cb', 'a\nb'],
    ['control character', 'a\u0001b', 'ab'],
    ['lone surrogate', 'a\uD800b', 'ab'],
  ])('an unbound field set to a value with a %s keeps the cleaned value, and every delta is restored', (_what, written, cleaned) => {
    const body = UNBOUND('U') + UNBOUND('V');
    const { saved } = roundTrip(body, (dom) => {
      at(dom, 'V').rawValue = 'kept';
      at(dom, 'U').rawValue = written;
      expect(at(dom, 'U').rawValue).toBe(cleaned);
    });
    expect(saved.summary).toEqual({ status: 'restorable', deltas: 2, skipped: 0 });
    expect(saved.deltas.map((d) => [d.container.name, d.savedValue])).toEqual([['U', cleaned], ['V', 'kept']]);
  });

  it('a bound field set to such a value stores the cleaned value in the data', () => {
    const { dom } = build('<field name="F"><ui><textEdit/></ui></field>', '<form1><F>v</F></form1>');
    at(dom, 'F').rawValue = 'a\u000Bb\u0001';
    expect(at(dom, 'F').rawValue).toBe('a\nb');
  });

  it('addItem cleans the display and save text, and the lists are restored', () => {
    const { dom } = build(LIST);
    const field = at(dom, 'Pick');
    field.addItem('Al\u000Bberta', 'A\u0001B');
    const baseline = captureItemsBaseline(build(LIST).dom);
    const template = enc(tpl(LIST));
    const datasets = enc(datasetsXml('<form1/>'));
    const form = formPacketText(dom, template, datasets, baseline);
    expect(form).toContain('Al\nberta');
    expect(form).toContain('>AB<');
    const saved = readSavedState(build(LIST).dom, { template, datasets, form });
    expect(saved.summary.status).toBe('restorable');
    expect(saved.deltas.length).toBeGreaterThan(0);
  });

  it('a caption written with such text is cleaned, and its delta is restored', () => {
    const body = CAPTIONED('C');
    const { form, saved } = roundTrip(body, (dom) => {
      const caption = resolveNode(at(dom, 'C'), 'caption.value.text') as FormNode;
      caption.setPlainText('x\u000By');
      expect(caption.plainText).toBe('x\ny');
    });
    expect(form).toContain('x\ny');
    expect(saved.summary).toEqual({ status: 'restorable', deltas: 1, skipped: 0 });
  });

  it('a node value and an attribute written with such text are cleaned', () => {
    const { dom } = build(CAPTIONED('C'));
    const caption = resolveNode(at(dom, 'C'), 'caption.value.text') as FormNode;
    caption.nodeValue = 'p\u000Cq';
    expect(caption.nodeValue).toBe('p\nq');
    at(dom, 'C').setAttr('presence', 'vis\u0001ible');
    expect(at(dom, 'C').attr('presence')).toBe('visible');
  });

  it('clean text is stored exactly as given', () => {
    const body = UNBOUND('U');
    const { saved } = roundTrip(body, (dom) => {
      at(dom, 'U').rawValue = 'tab\there\nline é 😀';
      expect(at(dom, 'U').rawValue).toBe('tab\there\nline é 😀');
    });
    expect(saved.deltas.map((d) => d.savedValue)).toEqual(['tab\there\nline é 😀']);
  });
});

describe('the writer leaves out a unit whose text XML cannot hold, and nothing else (L5-F1 backstop)', () => {
  it('a caption that reaches the writer with a forbidden character is omitted whole; its neighbours are written', () => {
    const body = CAPTIONED('A') + CAPTIONED('B') + CAPTIONED('Z');
    const { dom } = build(body);
    const baseline = captureItemsBaseline(dom);
    for (const name of ['A', 'B', 'Z']) at(dom, name).setAttr('presence', 'hidden');
    const caption = resolveNode(at(dom, 'B'), 'caption.value.text') as FormNode;
    caption.setPlainText('fine');
    Object.defineProperty(caption, 'plainText', { get: () => 'bad\u000Btext' });
    const form = buildFormPacket(dom, 'k'.repeat(28), baseline);
    expect(form).not.toContain('\u000B');
    expect(form).toContain('name="A"');
    expect(form).toContain('name="Z"');
    expect(form).not.toContain('bad');
    const template = enc(tpl(body));
    const datasets = enc(datasetsXml('<form1/>'));
    const text = formPacketText(dom, template, datasets, baseline);
    const saved = readSavedState(build(body).dom, { template, datasets, form: text });
    expect(saved.summary.status).toBe('restorable');
    expect(saved.deltas.map((d) => [d.container.name, d.target])).toEqual(
      expect.arrayContaining([['A', 'presence'], ['B', 'presence'], ['Z', 'presence']]),
    );
  });

  it('an unbound value that reaches the writer with a forbidden character is omitted; the other value is kept', () => {
    const body = UNBOUND('U') + UNBOUND('V');
    const { dom } = build(body);
    const baseline = captureItemsBaseline(dom);
    at(dom, 'U').rawValue = 'x';
    at(dom, 'V').rawValue = 'kept';
    const content = resolveNode(at(dom, 'U'), 'value.text') as FormNode;
    Object.defineProperty(content, 'plainText', { get: () => 'x\u0001' });
    const template = enc(tpl(body));
    const datasets = enc(datasetsXml('<form1/>'));
    const form = formPacketText(dom, template, datasets, baseline);
    const saved = readSavedState(build(body).dom, { template, datasets, form });
    expect(saved.deltas.map((d) => [d.container.name, d.savedValue])).toEqual([['V', 'kept']]);
  });

  it('a choice list with an item that reaches the writer with a forbidden character is left out whole; a neighbouring field is kept', () => {
    const body = LIST + CAPTIONED('C');
    const { dom } = build(body);
    const baseline = captureItemsBaseline(dom);
    at(dom, 'Pick').addItem('fine', 'f');
    at(dom, 'C').setAttr('presence', 'hidden');
    const item = at(dom, 'Pick').childrenOfClass('items')[0]?.children[0];
    if (item === undefined) throw new Error('no item');
    Object.defineProperty(item, 'plainText', { get: () => 'bad\u0001' });
    const form = buildFormPacket(dom, 'k'.repeat(28), baseline);
    expect(form).not.toContain('\u0001');
    expect(form).not.toContain('name="Pick"');
    expect(form).toContain('name="C"');
    expect(() => formPacketText(dom, enc(tpl(body)), enc(datasetsXml('<form1/>')), baseline)).not.toThrow();
  });
});
