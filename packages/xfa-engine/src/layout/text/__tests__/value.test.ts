import { describe, expect, it } from 'vitest';
import { captionTextOf, insetRect, valueTextOf, widgetOf, wrapsField } from '../value.js';
import { build, find, nodeOf, rect } from './helpers.js';

const draw = (inner: string): string => `<draw name="d" w="10pt" h="10pt">${inner}</draw>`;
const RICH = `<exData contentType="text/html"><body xmlns="http://www.w3.org/1999/xhtml"><p>Req <span>now</span></p></body></exData>`;

describe('valueTextOf', () => {
  it('a draw shows its text value; one with no value, a line, a rectangle or an image shows none', () => {
    expect(valueTextOf(nodeOf(draw('<value><text>Hello</text></value>'), 'draw', 'd'))).toEqual({ kind: 'text', text: 'Hello' });
    expect(valueTextOf(nodeOf(draw(''), 'draw', 'd'))).toEqual({ kind: 'none' });
    expect(valueTextOf(nodeOf(draw('<value><line/></value>'), 'draw', 'd'))).toEqual({ kind: 'none' });
    expect(valueTextOf(nodeOf(draw('<value><rectangle/></value>'), 'draw', 'd'))).toEqual({ kind: 'none' });
  });

  it('exData of markup is rich, with its markup as the form holds it; exData of plain text is text', () => {
    const rich = valueTextOf(nodeOf(draw(`<value>${RICH}</value>`), 'draw', 'd'));
    expect(rich.kind).toBe('rich');
    expect(rich.kind === 'rich' ? rich.markup : '').toContain('<p>Req <span>now</span></p>');
    const plain = valueTextOf(nodeOf(draw('<value><exData contentType="text/plain">just text</exData></value>'), 'draw', 'd'));
    expect(plain).toEqual({ kind: 'text', text: 'just text' });
  });

  it('a field shows its picture-formatted value, never the raw value', () => {
    const body = `<field name="Mo" w="10pt" h="10pt"><ui><textEdit/></ui><value><text/></value><format><picture>num{99}</picture></format><bind><picture>num{99}</picture></bind></field>`;
    const { dom } = build(body, '<form1><Mo>03</Mo></form1>');
    const mo = find(dom, 'field', 'Mo');
    expect(mo.rawValue).toBe('3');
    expect(valueTextOf(mo)).toEqual({ kind: 'text', text: '03' });
  });

  it('a choice list shows the label of the selected item, not its save value', () => {
    const body = `<field name="S"><ui><choiceList/></ui><items><text>Red</text><text>Green</text></items><items presence="hidden" save="1"><text>R</text><text>G</text></items></field>`;
    const { dom } = build(body, '<form1><S>G</S></form1>');
    expect(valueTextOf(find(dom, 'field', 'S'))).toEqual({ kind: 'text', text: 'Green' });
  });

  it('a field with no ui is a text box; a null value is empty text', () => {
    expect(valueTextOf(nodeOf('<field name="f"/>', 'field', 'f'))).toEqual({ kind: 'text', text: '' });
    expect(widgetOf(nodeOf('<field name="f"/>', 'field', 'f'))).toBe('defaultUi');
  });

  it('check boxes, buttons, passwords, barcodes, signatures and images draw no value text', () => {
    for (const widget of ['checkButton', 'button', 'passwordEdit', 'barcode', 'signature', 'imageEdit']) {
      const node = nodeOf(`<field name="f"><ui><${widget}/></ui><value><text>x</text></value></field>`, 'field', 'f');
      expect(valueTextOf(node), widget).toEqual({ kind: 'none' });
    }
  });

  it('subforms and other classes show none', () => {
    expect(valueTextOf(nodeOf('<subform name="s"/>', 'subform', 's'))).toEqual({ kind: 'none' });
  });
});

describe('captionTextOf and wrapsField', () => {
  const caption = (inner: string): ReturnType<typeof nodeOf> => nodeOf(`<field name="f"><ui><textEdit/></ui><caption>${inner}</caption></field>`, 'field', 'f').childrenOfClass('caption')[0] as never;

  it('reads the plain text of a caption, none for an empty caption element, rich for markup', () => {
    expect(captionTextOf(caption('<value><text>Name</text></value>'))).toEqual({ kind: 'text', text: 'Name' });
    expect(captionTextOf(caption(''))).toEqual({ kind: 'none' });
    const rich = captionTextOf(caption(`<value>${RICH}</value>`));
    expect(rich.kind).toBe('rich');
    expect(rich.kind === 'rich' ? rich.markup : '').toContain('<p>Req <span>now</span></p>');
  });

  it('only a multiLine text edit wraps', () => {
    const one = (ui: string): ReturnType<typeof nodeOf> => nodeOf(`<field name="f"><ui>${ui}</ui></field>`, 'field', 'f');
    expect(wrapsField(one('<textEdit multiLine="1"/>'))).toBe(true);
    expect(wrapsField(one('<textEdit/>'))).toBe(false);
    expect(wrapsField(one('<textEdit multiLine="0"/>'))).toBe(false);
    expect(wrapsField(one('<numericEdit/>'))).toBe(false);
  });
});

describe('insetRect', () => {
  it('removes the insets and never goes below zero', () => {
    expect(insetRect(rect(10, 20, 50, 30), { topPt: 1, rightPt: 2, bottomPt: 3, leftPt: 4 })).toEqual(rect(14, 21, 44, 26));
    expect(insetRect(rect(0, 0, 3, 3), { topPt: 5, rightPt: 5, bottomPt: 5, leftPt: 5 })).toEqual(rect(5, 5, 0, 0));
  });
});
