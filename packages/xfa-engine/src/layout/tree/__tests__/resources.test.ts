import { describe, expect, it } from 'vitest';
import type { LoadedFont } from '../../font/catalogue.js';
import { MAX_FONT_RESOURCES } from '../../limits.js';
import type { RenderItem } from '../../render-tree.js';
import { FALLBACK_FONT_ID } from '../../text/index.js';
import { fontResources } from '../resources.js';

type TextItem = Extract<RenderItem, { kind: 'text' }>;

const face = (fontId: string, extra: Partial<LoadedFont> = {}): LoadedFont => ({
  fontId,
  family: `Family ${fontId}`,
  weight: 'normal',
  posture: 'normal',
  format: 'opentype',
  bytes: new Uint8Array([1, 2, 3]),
  metrics: { unitsPerEm: 1000, ascent: 800, descent: 200, lineGap: 0, glyphCount: 1, notdefAdvance: 500, weightClass: undefined, macBold: false, macItalic: false, advance: () => 500 },
  ...extra,
});
const rect = { xPt: 0, yPt: 0, widthPt: 10, heightPt: 10 };
const text = (...fontIds: string[]): TextItem => ({ kind: 'text', rect, lines: [{ xPt: 0, yBaselinePt: 8, runs: fontIds.map((fontId) => ({ text: 'a', fontId, sizePt: 10, colour: [0, 0, 0] as [number, number, number] })) }] });
const idsOf = (items: readonly TextItem[]): string[] => items.flatMap((item) => item.lines.flatMap((line) => line.runs.map((run) => run.fontId)));

describe('fontResources: the fonts of a tree, once', () => {
  it('lists only the faces the runs use, in the document order, with their program bytes shared (not copied)', () => {
    const faces = [face('a'), face('b'), face('c', { weight: 'bold', posture: 'italic', format: 'truetype' })];
    const { fonts, notes } = fontResources(faces, [text('c', 'a', 'c')]);
    expect(fonts.map((font) => font.id)).toEqual(['a', 'c']);
    expect(fonts[1]).toMatchObject({ id: 'c', family: 'Family c', weight: 'bold', posture: 'italic', format: 'truetype' });
    expect(fonts[0]?.bytes).toBe(faces[0]?.bytes);
    expect(notes).toEqual([]);
  });

  it('a run with no program behind it gets one generic Courier resource with no bytes, after the embedded faces', () => {
    const { fonts, notes } = fontResources([face('a')], [text('a', FALLBACK_FONT_ID), text(FALLBACK_FONT_ID)]);
    expect(fonts.map((font) => font.id)).toEqual(['a', FALLBACK_FONT_ID]);
    expect(fonts[1]).toEqual({ id: FALLBACK_FONT_ID, family: 'Courier', weight: 'normal', posture: 'normal', format: 'truetype', bytes: new Uint8Array(0) });
    expect(notes).toEqual([]);
  });

  it('no text, no fonts', () => {
    expect(fontResources([face('a')], [])).toEqual({ fonts: [], notes: [] });
  });

  it('a run naming a face the document does not hold is re-pointed to the fallback, with a note', () => {
    const items = [text('a', 'ghost')];
    const { fonts, notes } = fontResources([face('a')], items);
    expect(idsOf(items)).toEqual(['a', FALLBACK_FONT_ID]);
    expect(fonts.map((font) => font.id)).toEqual(['a', FALLBACK_FONT_ID]);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.feature).toContain('fallback font');
  });

  it('more faces than the tree may carry: the first ones stay, the rest take the fallback, and the count still fits', () => {
    const faces = Array.from({ length: MAX_FONT_RESOURCES + 5 }, (_, i) => face(`f${i}`));
    const items = [text(...faces.map((f) => f.fontId))];
    const { fonts, notes } = fontResources(faces, items);
    expect(fonts).toHaveLength(MAX_FONT_RESOURCES);
    expect(fonts[MAX_FONT_RESOURCES - 1]?.id).toBe(FALLBACK_FONT_ID);
    const known = new Set(fonts.map((font) => font.id));
    expect(idsOf(items).every((id) => known.has(id))).toBe(true);
    expect(idsOf(items).filter((id) => id === FALLBACK_FONT_ID)).toHaveLength(6);
    expect(notes).toHaveLength(1);
  });

  it('exactly the maximum number of faces, all embedded and no fallback, is kept whole', () => {
    const faces = Array.from({ length: MAX_FONT_RESOURCES }, (_, i) => face(`f${i}`));
    const { fonts, notes } = fontResources(faces, [text(...faces.map((f) => f.fontId))]);
    expect(fonts).toHaveLength(MAX_FONT_RESOURCES);
    expect(notes).toEqual([]);
  });
});
