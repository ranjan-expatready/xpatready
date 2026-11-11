import { describe, expect, it } from 'vitest';
import { layoutBoxes } from '../../box/build.js';
import type { LayoutBox } from '../../box/types.js';
import { itemSchema } from '../../render-tree.js';
import { layoutBoxTexts, toTextItem } from '../box-text.js';
import { createCaptionReserve } from '../caption-reserve.js';
import { FALLBACK_FONT_ID } from '../types.js';
import { MAX_FONT_NAME_CHARS } from '../../font/limits.js';
import { build, emptyTextContext, find, rect } from './helpers.js';

/** Without embedded fonts every typeface is the fixed-pitch Courier fallback: at 10 pt a character is 6 pt, ascent 6.27, descent 3.73, pitch 12. */
const FRAME = rect(0, 0, 0, 0);

function run(body: string, className: string, name: string, data = '<form1/>'): { boxes: ReturnType<typeof layoutBoxTexts>; box: LayoutBox; ctx: ReturnType<typeof emptyTextContext>; boxIssues: readonly { som: string; feature: string }[] } {
  const ctx = emptyTextContext();
  const { box, issues } = layoutBoxes(find(build(body, data).dom, className, name), FRAME, { captionReserve: createCaptionReserve(ctx) });
  return { boxes: layoutBoxTexts(box, ctx), box, ctx, boxIssues: issues };
}
const features = (ctx: ReturnType<typeof emptyTextContext>): string[] => ctx.sink.issues.map((i) => i.feature).filter((f) => !f.startsWith('font.'));

describe('layoutBoxTexts: draws', () => {
  it('lays a draw out in its content rectangle, in the local frame of the draw, and the item in the layout frame', () => {
    const { boxes, box } = run(
      '<draw name="d" x="10pt" y="20pt" w="100pt" h="30pt"><margin leftInset="4pt" topInset="2pt" rightInset="6pt" bottomInset="0pt"/><value><text>Hello</text></value><para vAlign="middle"/></draw>',
      'draw',
      'd',
    );
    expect(boxes).toHaveLength(1);
    const text = boxes[0]?.value;
    expect(text?.region).toEqual(rect(4, 2, 90, 28));
    expect(text?.lines).toHaveLength(1);
    expect(text?.lines[0]?.xPt).toBe(4);
    expect(text?.lines[0]?.yBaselinePt).toBeCloseTo(2 + (28 - 10) / 2 + 6.27, 6);
    const item = toTextItem(box, text ?? (undefined as never));
    expect(item.rect).toEqual(rect(14, 22, 90, 28));
    expect(item.lines[0]?.xPt).toBe(14);
    expect(item.lines[0]?.yBaselinePt).toBeCloseTo(20 + 2 + (28 - 10) / 2 + 6.27, 6);
    expect(item.lines[0]?.runs[0]?.fontId).toBe(FALLBACK_FONT_ID);
    expect(() => itemSchema.parse(item)).not.toThrow();
  });

  it('wraps a draw to its width but not a draw whose width the template leaves open', () => {
    const wrapped = run('<draw name="d" w="20pt" h="40pt"><value><text>ab cd ef</text></value></draw>', 'draw', 'd').boxes[0]?.value;
    expect(wrapped?.lines.map((l) => l.runs[0]?.text)).toEqual(['ab ', 'cd ', 'ef']);
    const open = run('<draw name="d" h="40pt"><value><text>ab cd ef</text></value></draw>', 'draw', 'd').boxes[0]?.value;
    expect(open?.lines.map((l) => l.runs[0]?.text)).toEqual(['ab cd ef']);
  });

  it('does not lay out hidden, invisible or print-only boxes, or anything inside them', () => {
    for (const attrs of ['presence="hidden"', 'presence="invisible"', 'relevant="print"']) {
      const body = `<subform name="s" w="100pt" h="100pt" ${attrs}><draw name="d" w="40pt" h="40pt"><value><text>x</text></value></draw></subform>`;
      expect(run(body, 'subform', 's').boxes, attrs).toEqual([]);
    }
  });

  it('lays rich text out as runs and reports a box turned a quarter turn', () => {
    const rich = run('<draw name="d" w="40pt" h="40pt"><value><exData contentType="text/html"><body xmlns="http://www.w3.org/1999/xhtml"><p>x</p></body></exData></value></draw>', 'draw', 'd');
    expect(rich.boxes).toHaveLength(1);
    expect(rich.boxes[0]?.value?.lines.map((l) => l.runs.map((r) => r.text))).toEqual([['x']]);
    expect(features(rich.ctx)).toEqual([]);
    const turned = run('<draw name="d" w="40pt" h="10pt" rotate="90"><value><text>x</text></value></draw>', 'draw', 'd');
    expect(turned.boxes).toHaveLength(1);
    expect(features(turned.ctx)).toEqual(['text in a box rotated 90 degrees (laid out unrotated)']);
  });
});

describe('layoutBoxTexts: fields and captions', () => {
  const field = (ui: string, extra = '', attrs = 'w="100pt" h="20pt"'): string => `<field name="f" ${attrs}><ui>${ui}</ui>${extra}</field>`;

  it('lays out the display value in the widget rectangle less the widget margin', () => {
    const body = field('<textEdit><margin leftInset="3pt" topInset="1pt" rightInset="2pt" bottomInset="1pt"/></textEdit>', '<value><text>abc</text></value><caption placement="left" reserve="30pt"/>');
    const text = run(body, 'field', 'f').boxes[0]?.value;
    expect(text?.region).toEqual(rect(33, 1, 65, 18));
    expect(text?.lines[0]?.xPt).toBe(33);
  });

  it('a single-line field never wraps; a multiLine one wraps to its width', () => {
    const value = '<value><text>ab cd ef</text></value>';
    const one = run(field('<textEdit/>', value, 'w="30pt" h="40pt"'), 'field', 'f').boxes[0]?.value;
    expect(one?.lines).toHaveLength(1);
    expect(one?.overflow.horizontal).toBe(true);
    const many = run(field('<textEdit multiLine="1"/>', value, 'w="20pt" h="40pt"'), 'field', 'f').boxes[0]?.value;
    expect(many?.lines.map((l) => l.runs[0]?.text)).toEqual(['ab ', 'cd ', 'ef']);
  });

  it('a check button or button draws no value text', () => {
    expect(run(field('<checkButton/>', '<value><text>1</text></value>'), 'field', 'f').boxes).toEqual([]);
    expect(run(field('<button/>'), 'field', 'f').boxes).toEqual([]);
  });

  it('lays the caption out in the caption strip, with its own font, and no caption line crosses into the widget', () => {
    const body = field('<textEdit/>', '<value><text>v</text></value><caption placement="top" reserve="14pt"><font size="8pt"/><value><text>Family name</text></value><margin topInset="1pt" bottomInset="1pt" leftInset="2pt" rightInset="0pt"/></caption>');
    const { boxes, box } = run(body, 'field', 'f');
    const entry = boxes[0];
    expect(entry?.caption?.region).toEqual(rect(2, 1, 98, 12));
    expect(entry?.caption?.lines[0]?.runs[0]?.sizePt).toBe(8);
    const widgetTop = box.widgetRect.yPt - box.rect.yPt;
    const captionBottom = (entry?.caption?.lines[0]?.yBaselinePt ?? 0) + 8 * 0.373;
    expect(captionBottom).toBeLessThanOrEqual(widgetTop);
    expect(entry?.value?.region.yPt).toBe(14);
  });

  it('a hidden caption has no text; an exclusion group lays out its caption', () => {
    const hidden = run(field('<textEdit/>', '<caption reserve="14pt" presence="hidden"><value><text>Hidden</text></value></caption>'), 'field', 'f').boxes;
    expect(hidden).toEqual([]);
    const group = run('<exclGroup name="g" w="100pt" h="30pt"><caption placement="top" reserve="10pt"><value><text>Pick one</text></value></caption></exclGroup>', 'exclGroup', 'g').boxes;
    expect(group).toHaveLength(1);
    expect(group[0]?.caption?.lines[0]?.runs[0]?.text).toBe('Pick one');
  });
});

describe('layoutBoxTexts: hostile and unusual input', () => {
  it('a typeface longer than the font-name ceiling is reported and the default font is used, in a value and in a caption, without throwing', () => {
    const long = 'T'.repeat(MAX_FONT_NAME_CHARS + 44);
    const value = run(`<draw name="d" w="40pt" h="20pt"><font typeface="${long}"/><value><text>Hello</text></value></draw>`, 'draw', 'd');
    expect(value.boxes[0]?.value?.lines[0]?.runs[0]?.text).toBe('Hello');
    expect(features(value.ctx)).toEqual([`font typeface: longer than ${MAX_FONT_NAME_CHARS} characters (the default typeface is used)`]);
    const caption = run(`<field name="f" w="100pt" h="30pt"><ui><textEdit/></ui><caption><font typeface="${long}"/><value><text>Name</text></value></caption></field>`, 'field', 'f');
    expect(caption.box.caption?.reservePt).toBeGreaterThan(0);
    expect(caption.boxes[0]?.caption?.lines).toHaveLength(1);
    expect(features(caption.ctx)).toContain(`font typeface: longer than ${MAX_FONT_NAME_CHARS} characters (the default typeface is used)`);
  });

  it('a run whose typeface has no embedded program carries the fallback font id and an issue naming the typeface (the render tree needs a resource for it: W02-T12)', () => {
    const { boxes, ctx } = run('<draw name="d" w="40pt" h="20pt"><font typeface="Courier"/><value><text>Hi</text></value></draw>', 'draw', 'd');
    expect(boxes[0]?.value?.lines[0]?.runs[0]?.fontId).toBe(FALLBACK_FONT_ID);
    expect(ctx.sink.issues.map((i) => i.feature)).toContain('font.Courier');
  });

  it('a multiLine field and a caption in a region with no width stay unwrapped', () => {
    const flat = run('<field name="f" h="40pt"><ui><textEdit multiLine="1"/></ui><value><text>ab cd ef</text></value></field>', 'field', 'f');
    expect(flat.boxes[0]?.value?.lines).toHaveLength(1);
    const captioned = run('<field name="f" h="40pt"><ui><textEdit/></ui><caption placement="top" reserve="20pt"><value><text>ab cd ef</text></value></caption></field>', 'field', 'f');
    expect(captioned.boxes[0]?.caption?.lines).toHaveLength(1);
  });

  it('toTextItem carries a non-zero letter spacing into the run and leaves the lines it was given alone', () => {
    const { boxes, box } = run('<draw name="d" x="5pt" y="6pt" w="100pt" h="20pt"><font letterSpacing="1pt"/><value><text>ab</text></value></draw>', 'draw', 'd');
    const text = boxes[0]?.value;
    const item = toTextItem(box, text ?? (undefined as never));
    expect(item.lines[0]?.runs[0]?.letterSpacingPt).toBe(1);
    expect(item.lines[0]?.xPt).toBe(5);
    expect(text?.lines[0]?.xPt).toBe(0);
    expect(() => itemSchema.parse(item)).not.toThrow();
  });
});
