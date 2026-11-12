import { describe, expect, it } from 'vitest';
import { borderStyleOf, widgetBorderStyleOf } from '../border.js';
import { IssueSink } from '../issues.js';
import { field, nodeOf } from './helpers.js';

const edge = (attrs = '', colour = ''): string => `<edge ${attrs}>${colour === '' ? '' : `<color value="${colour}"/>`}</edge>`;
const corner = (attrs = ''): string => `<corner ${attrs}/>`;
const bordered = (inner: string, attrs = ''): ReturnType<typeof nodeOf> => nodeOf(field('w="20pt" h="10pt"', `<border ${attrs}>${inner}</border>`), 'field', 'f');
const style = (inner: string, attrs = '', sink = new IssueSink()): ReturnType<typeof borderStyleOf> => borderStyleOf(bordered(inner, attrs), sink);

describe('borderStyleOf: presence', () => {
  it('is undefined when the template writes no border (the default border node is not drawn)', () => {
    expect(borderStyleOf(nodeOf(field('w="20pt" h="10pt"'), 'field', 'f'), new IssueSink())).toBeUndefined();
  });

  it('is undefined when the border is hidden, fill included', () => {
    expect(style(`${edge()}<fill><color value="1,2,3"/></fill>`, 'presence="hidden"')).toBeUndefined();
  });
});

describe('borderStyleOf: the edge repeat rule', () => {
  const thick = (n: number): string => edge(`thickness="${n}pt"`);
  const sides = (inner: string): number[] => (style(inner)?.edges ?? []).map((e) => e.thicknessPt);

  it('one edge applies to all four sides', () => {
    expect(sides(thick(1))).toEqual([1, 1, 1, 1]);
  });

  it('two edges repeat the last: top, then right, bottom and left (pdf.js Border $getExtra, PA-4)', () => {
    expect(sides(thick(1) + thick(2))).toEqual([1, 2, 2, 2]);
  });

  it('three edges repeat the last: top, right, then bottom and left', () => {
    expect(sides(thick(1) + thick(2) + thick(3))).toEqual([1, 2, 3, 3]);
  });

  it('a fifth edge is not used and is reported, not dropped silently', () => {
    const sink = new IssueSink();
    const five = [1, 2, 3, 4, 5].map(thick).join('');
    expect(style(five, '', sink)?.edges.map((e) => e.thicknessPt)).toEqual([1, 2, 3, 4]);
    expect(sink.issues.map((i) => i.feature)).toEqual([expect.stringContaining('5 edge elements')]);
  });

  it('four edges raise no issue', () => {
    const sink = new IssueSink();
    style([1, 2, 3, 4].map(thick).join(''), '', sink);
    expect(sink.issues).toEqual([]);
  });

  it('four edges are top, right, bottom, left', () => {
    expect(sides(thick(1) + thick(2) + thick(3) + thick(4))).toEqual([1, 2, 3, 4]);
    expect((style(thick(1) + thick(2) + thick(3) + thick(4))?.edges ?? []).map((e) => e.side)).toEqual(['top', 'right', 'bottom', 'left']);
  });

  it('a border with no edge element gets four default edges: solid, 0.5 pt, black, visible', () => {
    expect(style('')?.edges).toEqual(
      (['top', 'right', 'bottom', 'left'] as const).map((side) => ({ side, visible: true, thicknessPt: 0.5, colour: [0, 0, 0], stroke: 'solid' })),
    );
  });
});

describe('borderStyleOf: edge properties', () => {
  it('reads thickness in mm, stroke, colour (spaces allowed) and a hidden edge as not visible', () => {
    const first = style(edge('thickness="25.4mm" stroke="dashed"', '255, 10 ,0') + edge('presence="hidden"'))?.edges;
    expect(first?.[0]).toMatchObject({ visible: true, stroke: 'dashed', colour: [255, 10, 0] });
    expect(first?.[0]?.thicknessPt).toBeCloseTo(72, 6);
    expect(first?.[1]?.visible).toBe(false);
  });

  it('an unusable colour falls back to black with an issue, never a wrong colour', () => {
    const sink = new IssueSink();
    expect(style(edge('', '300,0,0'), '', sink)?.edges[0]?.colour).toEqual([0, 0, 0]);
    expect(sink.issues[0]?.feature).toContain('colour');
  });

  it('a negative thickness or radius is read as 0 and reported', () => {
    const sink = new IssueSink();
    const s = style(edge('thickness="-2pt"') + corner('radius="-3pt"'), '', sink);
    expect(s?.edges[0]?.thicknessPt).toBe(0);
    expect(s?.corners[0]?.radiusPt).toBe(0);
    expect(sink.issues.map((i) => i.feature).sort()).toEqual([expect.stringContaining('radius is negative'), expect.stringContaining('thickness is negative')]);
  });

  it('colour text is checked by the render tree colour schema: spaces are fine, 3 channels of 0 to 255 only', () => {
    for (const bad of ['1,2', '1,2,3,4', '256,0,0', '-1,0,0', '1.5,0,0', 'red', '']) {
      const sink = new IssueSink();
      expect(style(edge('', bad), '', sink)?.edges[0]?.colour, bad).toEqual([0, 0, 0]);
      expect(sink.issues.length, bad).toBe(bad === '' ? 0 : 1);
    }
    expect(style(edge('', ' 0 , 128 ,255 '))?.edges[0]?.colour).toEqual([0, 128, 255]);
  });

  it('an unknown stroke falls back to solid with an issue', () => {
    const sink = new IssueSink();
    expect(style(edge('stroke="wavy"'), '', sink)?.edges[0]?.stroke).toBe('solid');
    expect(sink.issues[0]?.feature).toContain('stroke');
  });
});

describe('borderStyleOf: corners', () => {
  it('default to four square corners of radius 0', () => {
    const corners = style(edge())?.corners;
    expect(corners?.map((c) => c.corner)).toEqual(['topLeft', 'topRight', 'bottomRight', 'bottomLeft']);
    expect(corners?.every((c) => c.radiusPt === 0 && c.join === 'square' && !c.inverted)).toBe(true);
  });

  it('one corner applies to all four; radius, inverted and join are read', () => {
    const corners = style(edge() + corner('radius="3pt" inverted="1" join="round"'))?.corners;
    expect(corners).toHaveLength(4);
    expect(corners?.every((c) => c.radiusPt === 3 && c.inverted && c.join === 'round')).toBe(true);
  });

  it('two corners repeat the last, three repeat the last (pdf.js Border $toStyle)', () => {
    const radii = (n: number): number[] => style(edge() + [1, 2, 3].slice(0, n).map((r) => corner(`radius="${r}pt"`)).join(''))?.corners.map((c) => c.radiusPt) ?? [];
    expect(radii(2)).toEqual([1, 2, 2, 2]);
    expect(radii(3)).toEqual([1, 2, 3, 3]);
  });

  it('more than four corners are reported', () => {
    const sink = new IssueSink();
    style(edge() + corner().repeat(5), '', sink);
    expect(sink.issues.map((i) => i.feature)).toEqual([expect.stringContaining('5 corner elements')]);
  });

  it('four corners keep their own radius', () => {
    const four = [1, 2, 3, 4].map((r) => corner(`radius="${r}pt"`)).join('');
    expect(style(edge() + four)?.corners.map((c) => c.radiusPt)).toEqual([1, 2, 3, 4]);
  });
});

describe('borderStyleOf: fill and hand', () => {
  it('reads a solid fill colour', () => {
    expect(style(`${edge()}<fill><color value="10,20,30"/></fill>`)?.fill).toEqual([10, 20, 30]);
  });

  it('a fill with no colour is the XFA default fill colour (white)', () => {
    expect(style(`${edge()}<fill/>`)?.fill).toEqual([255, 255, 255]);
  });

  it('no fill element, or a hidden fill, leaves fill absent', () => {
    expect(style(edge())?.fill).toBeUndefined();
    expect(style(`${edge()}<fill presence="hidden"><color value="1,1,1"/></fill>`)?.fill).toBeUndefined();
  });

  it('a gradient or pattern fill is drawn as its colour and reported', () => {
    const sink = new IssueSink();
    expect(style(`${edge()}<fill><linear/><color value="5,6,7"/></fill>`, '', sink)?.fill).toEqual([5, 6, 7]);
    expect(sink.issues[0]?.feature).toContain('linear');
  });

  it('hand is recorded as -1, 0 or 1 for left, even (default) and right', () => {
    expect(style(edge())?.hand).toBe(0);
    expect(style(edge(), 'hand="left"')?.hand).toBe(-1);
    expect(style(edge(), 'hand="right"')?.hand).toBe(1);
  });
});

describe('widgetBorderStyleOf', () => {
  it('reads the border of the widget, separate from the container border', () => {
    const node = nodeOf(
      field('w="20pt" h="10pt"', `<border>${edge('thickness="2pt"')}</border>`).replace('<ui><textEdit/></ui>', `<ui><textEdit><border>${edge('thickness="1pt"')}</border></textEdit></ui>`),
      'field',
      'f',
    );
    const sink = new IssueSink();
    expect(borderStyleOf(node, sink)?.edges[0]?.thicknessPt).toBe(2);
    expect(widgetBorderStyleOf(node, sink)?.edges[0]?.thicknessPt).toBe(1);
  });

  it('is undefined for a widget without a border, and for a node without a widget', () => {
    expect(widgetBorderStyleOf(nodeOf(field('w="20pt" h="10pt"'), 'field', 'f'), new IssueSink())).toBeUndefined();
    expect(widgetBorderStyleOf(nodeOf('<draw name="d" w="2pt" h="2pt"/>', 'draw', 'd'), new IssueSink())).toBeUndefined();
  });
});
