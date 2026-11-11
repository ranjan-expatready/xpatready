import { describe, expect, it } from 'vitest';
import { IssueSink } from '../../box/issues.js';
import { DEFAULT_TEXT_STYLE, textStyleOf } from '../style.js';
import { nodeOf } from './helpers.js';

const draw = (inner: string, attrs = 'w="100pt" h="20pt"'): string => `<draw name="d" ${attrs}>${inner}</draw>`;
const read = (inner: string): { style: ReturnType<typeof textStyleOf>; sink: IssueSink } => {
  const sink = new IssueSink();
  return { style: textStyleOf(nodeOf(draw(inner), 'draw', 'd'), sink), sink };
};

describe('textStyleOf', () => {
  it('reads every font and para attribute, a colour and units other than points', () => {
    const { style, sink } = read(
      `<font typeface="Myriad Pro" size="7pt" weight="bold" posture="italic" letterSpacing="1pt" baselineShift="0.5mm"><fill><color value="255, 0, 10"/></fill></font>` +
        `<para hAlign="center" vAlign="bottom" marginLeft="2pt" marginRight="3pt" textIndent="-4pt" spaceAbove="5pt" spaceBelow="0.1in" lineHeight="8pt"/>`,
    );
    expect(style).toEqual({
      typeface: 'Myriad Pro',
      weight: 'bold',
      posture: 'italic',
      sizePt: 7,
      letterSpacingPt: 1,
      baselineShiftPt: (0.5 * 72) / 25.4,
      colour: [255, 0, 10],
      hAlign: 'center',
      vAlign: 'bottom',
      marginLeftPt: 2,
      marginRightPt: 3,
      textIndentPt: -4,
      spaceAbovePt: 5,
      spaceBelowPt: 7.2,
      lineHeightPt: 8,
    });
    expect(sink.issues).toEqual([]);
  });

  it('a node with no font and no para has the XFA defaults, and the built-in defaults agree with the template model defaults', () => {
    const none = read('');
    expect(none.style).toEqual(DEFAULT_TEXT_STYLE);
    const bare = read('<font/><para/>');
    expect(bare.style).toEqual({ ...DEFAULT_TEXT_STYLE, typeface: 'Courier' });
    expect(nodeOf(draw('<font/>'), 'draw', 'd').childrenOfClass('font')[0]?.attr('size')).toBe('10pt');
  });

  it('a script-set attribute is what is read, not the template text', () => {
    const node = nodeOf(draw('<font size="10pt"/><para hAlign="left"/>'), 'draw', 'd');
    node.childrenOfClass('font')[0]?.setAttr('size', '12pt');
    node.childrenOfClass('para')[0]?.setAttr('hAlign', 'right');
    const style = textStyleOf(node, new IssueSink());
    expect(style.sizePt).toBe(12);
    expect(style.hAlign).toBe('right');
  });

  it('reports a value the engine does not model and uses the default, never silently', () => {
    const { style, sink } = read(
      `<font size="10px" weight="heavy" posture="oblique" letterSpacing="1em" baselineShift="2furlong"><fill><color value="300,0,0"/></fill></font>` +
        `<para hAlign="diagonal" vAlign="sideways" marginLeft="-3pt" lineHeight="7bananas"/>`,
    );
    expect(style).toEqual({ ...DEFAULT_TEXT_STYLE, typeface: 'Courier' });
    const features = sink.issues.map((i) => i.feature.split(':')[0]);
    expect(features).toEqual(
      expect.arrayContaining(['font size', 'font weight', 'font posture', 'font letterSpacing', 'font baselineShift', 'font colour', 'para hAlign', 'para vAlign', 'para lineHeight']),
    );
    expect(sink.issues.some((i) => i.feature.includes('marginLeft is negative'))).toBe(true);
  });

  it('a size that is zero or negative is reported and read as the default size', () => {
    for (const size of ['0pt', '-5pt']) {
      const { style, sink } = read(`<font size="${size}"/>`);
      expect(style.sizePt).toBe(10);
      expect(sink.issues[0]?.feature).toContain('is not positive');
    }
  });
});
