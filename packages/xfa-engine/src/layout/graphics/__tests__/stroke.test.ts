import { describe, expect, it } from 'vitest';
import { XfaLayoutError } from '../../errors.js';
import { strokeSchema } from '../../render-tree.js';
import { darker, dashArrayOf, lighter, strokeParts } from '../stroke.js';

describe('strokeParts', () => {
  const base = [100, 100, 100] as const;

  it('a plain or broken stroke is one part of the edge colour, whatever the side', () => {
    for (const stroke of ['solid', 'dashed', 'dotted', 'dashDot', 'dashDotDot'] as const) {
      for (const side of ['top', 'right', 'bottom', 'left'] as const) expect(strokeParts(stroke, side, base)).toEqual([{ colour: base, stroke, share: 1 }]);
    }
  });

  it('lowered is dark on the top and left and light on the bottom and right', () => {
    expect(strokeParts('lowered', 'top', base)).toEqual([{ colour: [50, 50, 50], stroke: 'solid', share: 1 }]);
    expect(strokeParts('lowered', 'left', base)).toEqual([{ colour: [50, 50, 50], stroke: 'solid', share: 1 }]);
    expect(strokeParts('lowered', 'bottom', base)).toEqual([{ colour: [178, 178, 178], stroke: 'solid', share: 1 }]);
    expect(strokeParts('lowered', 'right', base)).toEqual([{ colour: [178, 178, 178], stroke: 'solid', share: 1 }]);
  });

  it('raised is the reverse of lowered', () => {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const lowered = strokeParts('lowered', side, base)[0]?.colour;
      const raised = strokeParts('raised', side, base)[0]?.colour;
      expect(raised).not.toEqual(lowered);
      expect([lowered, raised].sort()).toEqual([[178, 178, 178], [50, 50, 50]]);
    }
    expect(strokeParts('raised', 'top', base)[0]?.colour).toEqual([178, 178, 178]);
  });

  it('etched is two half bands, outer dark then inner light on the top and left, the opposite on the bottom and right', () => {
    expect(strokeParts('etched', 'top', base)).toEqual([
      { colour: [50, 50, 50], stroke: 'solid', share: 0.5 },
      { colour: [178, 178, 178], stroke: 'solid', share: 0.5 },
    ]);
    expect(strokeParts('etched', 'bottom', base).map((p) => p.colour)).toEqual([[178, 178, 178], [50, 50, 50]]);
  });

  it('embossed is the reverse of etched on every side', () => {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      expect(strokeParts('embossed', side, base).map((p) => p.colour)).toEqual(strokeParts('etched', side, base).map((p) => p.colour).reverse());
    }
  });

  it('every stroke name of the render tree is handled and its shares add up to the whole thickness', () => {
    for (const stroke of strokeSchema.options) {
      const parts = strokeParts(stroke, 'top', base);
      expect(parts.reduce((sum, part) => sum + part.share, 0)).toBe(1);
      for (const part of parts) expect(['solid', 'dashed', 'dotted', 'dashDot', 'dashDotDot']).toContain(part.stroke);
    }
  });

  it('black keeps its dark tone and lightens to mid grey; white darkens to mid grey and keeps its light tone', () => {
    expect(darker([0, 0, 0])).toEqual([0, 0, 0]);
    expect(lighter([0, 0, 0])).toEqual([128, 128, 128]);
    expect(darker([255, 255, 255])).toEqual([128, 128, 128]);
    expect(lighter([255, 255, 255])).toEqual([255, 255, 255]);
  });
});

describe('dashArrayOf', () => {
  it('a solid stroke has no dash pattern', () => {
    expect(dashArrayOf('solid', 2)).toEqual([]);
  });

  it('dashed, dotted, dash-dot and dash-dot-dot are patterns scaled by the thickness', () => {
    expect(dashArrayOf('dashed', 2)).toEqual([6, 4]);
    expect(dashArrayOf('dotted', 2)).toEqual([2, 2]);
    expect(dashArrayOf('dashDot', 1)).toEqual([3, 2, 1, 2]);
    expect(dashArrayOf('dashDotDot', 1)).toEqual([3, 2, 1, 2, 1, 2]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])('a thickness of %s is refused with a typed error, never turned into a pattern', (thickness) => {
    expect(() => dashArrayOf('dashed', thickness)).toThrow(XfaLayoutError);
    expect(() => dashArrayOf('solid', thickness)).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
  });

  it('a stroke name the tree does not have is refused with a typed error', () => {
    expect(() => {
      Reflect.apply(dashArrayOf, undefined, ['wavy', 1]);
    }).toThrow(XfaLayoutError);
  });

  it('a thickness of 0 is accepted', () => {
    expect(dashArrayOf('dashed', 0)).toEqual([0, 0]);
  });

  it('answers for every stroke name of the tree: the 3D styles are solid bands (strokeParts), so they have no pattern', () => {
    for (const stroke of ['lowered', 'raised', 'etched', 'embossed'] as const) expect(dashArrayOf(stroke, 3)).toEqual([]);
  });
});
