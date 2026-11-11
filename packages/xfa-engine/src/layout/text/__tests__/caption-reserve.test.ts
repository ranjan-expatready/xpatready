import { describe, expect, it } from 'vitest';
import { layoutBoxes } from '../../box/build.js';
import type { CaptionReserveHook } from '../../box/caption.js';
import { createCaptionReserve } from '../caption-reserve.js';
import { build, emptyTextContext, find, rect } from './helpers.js';

/** Fixed-pitch Courier fallback at 10 pt: 6 pt per character, block of one line 10 pt, pitch 12. */
const field = (caption: string, attrs = 'w="200pt" h="40pt"'): string => `<field name="f" ${attrs}><ui><textEdit/></ui>${caption}</field>`;
const hookOn = (body: string): { ask: (placement: 'left' | 'right' | 'top' | 'bottom', width?: number) => number | 'auto' } => {
  const ctx = emptyTextContext();
  const hook = createCaptionReserve(ctx);
  const node = find(build(body).dom, 'field', 'f');
  return { ask: (placement, width = 200) => hook(node, placement, rect(0, 0, width, 40)) };
};
const text = (t: string, extra = ''): string => `<caption${extra}><value><text>${t}</text></value></caption>`;

describe('createCaptionReserve', () => {
  it('left and right reserve the width of the text', () => {
    const { ask } = hookOn(field(text('Family')));
    expect(ask('left')).toBe(36);
    expect(ask('right')).toBe(36);
  });

  it('top and bottom reserve the height of the text block: one line is ascent + descent, n lines add a pitch each', () => {
    expect(hookOn(field(text('Family'))).ask('top')).toBe(10);
    expect(hookOn(field(text('a\nb\nc'))).ask('bottom')).toBe(34);
  });

  it('adds the caption margin and the paragraph margins on the placement axis', () => {
    const margin = '<margin leftInset="2pt" rightInset="3pt" topInset="1pt" bottomInset="4pt"/>';
    const caption = `<caption><para marginLeft="5pt" marginRight="1pt" spaceAbove="2pt" spaceBelow="3pt"/>${margin}<value><text>Family</text></value></caption>`;
    const { ask } = hookOn(field(caption));
    expect(ask('left')).toBe(36 + 5 + 1 + 2 + 3);
    expect(ask('top')).toBe(10 + 2 + 3 + 1 + 4);
  });

  it('a positive text indent adds to the width the first line needs, and a small lineHeight does not shrink a top or bottom reserve', () => {
    const caption = (para: string): string => `<caption>${para}<value><text>Family</text></value></caption>`;
    expect(hookOn(field(caption('<para textIndent="10pt"/>'))).ask('left')).toBe(46);
    expect(hookOn(field(caption('<para textIndent="-10pt"/>'))).ask('left')).toBe(36);
    expect(hookOn(field(caption('<para vAlign="middle" lineHeight="1pt"/>'))).ask('top')).toBe(10);
    expect(hookOn(field(caption('<para vAlign="bottom" lineHeight="1pt"/>'))).ask('bottom')).toBe(10);
  });

  it('a content region with no width yet lays the caption out unwrapped instead of one character per line', () => {
    const { ask } = hookOn(field(text('ab cd')));
    expect(ask('top', 0)).toBe(10);
    expect(ask('left', 0)).toBe(30);
  });

  it('wraps the text to the content region: a top caption grows with the lines, a left caption stops at the widest line', () => {
    const { ask } = hookOn(field(text('ab cd ef')));
    expect(ask('top', 14)).toBe(34);
    expect(ask('left', 14)).toBe(12);
    expect(ask('left', 1000)).toBe(48);
  });

  it('an empty caption reserves nothing and a rich-text caption reserves the width of its text', () => {
    expect(hookOn(field(text(''))).ask('left')).toBe(0);
    expect(hookOn(field('<caption/>')).ask('left')).toBe(0);
    const rich = `<caption><value><exData contentType="text/html"><body xmlns="http://www.w3.org/1999/xhtml"><p>x</p></body></exData></value></caption>`;
    expect(hookOn(field(rich)).ask('left')).toBe(6);
  });

  it('an explicit reserve is the box layout\'s: the hook is not asked, and an automatic one is asked exactly once even when the box grows to its children', () => {
    const asked: string[] = [];
    const ctx = emptyTextContext();
    const inner = createCaptionReserve(ctx);
    const spy: CaptionReserveHook = (f, p, r) => {
      asked.push(f.name);
      return inner(f, p, r);
    };
    const explicit = find(build(field(text('Family', ' reserve="20pt"'))).dom, 'field', 'f');
    expect(layoutBoxes(explicit, rect(0, 0, 0, 0), { captionReserve: spy }).box.caption?.reservePt).toBe(20);
    expect(asked).toEqual([]);
    const group = `<exclGroup name="g" w="200pt"><caption placement="top"><value><text>Family</text></value></caption><field name="r" x="0pt" y="0pt" w="10pt" h="10pt"><ui><checkButton/></ui></field></exclGroup>`;
    const growable = find(build(group).dom, 'exclGroup', 'g');
    const { box } = layoutBoxes(growable, rect(0, 0, 0, 0), { captionReserve: spy });
    expect(asked).toEqual(['g']);
    expect(box.caption).toMatchObject({ reservePt: 10, auto: false });
    expect(box.rect.heightPt).toBe(20);
  });

  it('through the box layout the strip holds the text and the widget keeps the rest, side by side without overlap', () => {
    const node = find(build(field(text('Family'), 'x="5pt" y="5pt" w="100pt" h="20pt"')).dom, 'field', 'f');
    const { box, issues } = layoutBoxes(node, rect(0, 0, 0, 0), { captionReserve: createCaptionReserve(emptyTextContext()) });
    expect(box.caption).toMatchObject({ placement: 'left', reservePt: 36, auto: false, clamped: false });
    expect(box.captionRect).toEqual(rect(5, 5, 36, 20));
    expect(box.widgetRect).toEqual(rect(41, 5, 64, 20));
    expect(issues).toEqual([]);
  });
});
