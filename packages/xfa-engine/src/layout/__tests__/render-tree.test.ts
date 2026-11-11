import { describe, expect, it } from 'vitest';
import { MAX_SOM_CHARS } from '../../model/som/limits.js';
import { UI_WIDGET_CLASSES } from '../../model/template/node.js';
import { MAX_ISSUES, MAX_ITEMS_PER_PAGE, MAX_LINES_PER_TEXT, MAX_PAGES, MAX_RUNS_PER_LINE, MAX_SHORT_TEXT_CHARS, MAX_TEXT_CHARS } from '../limits.js';
import { RENDER_TREE_VERSION, renderTreeSchema, WIDGET_KINDS, type RenderTree } from '../render-tree.js';

const rect = { xPt: 10, yPt: 20, widthPt: 100, heightPt: 30 };
const black: [number, number, number] = [0, 0, 0];

/** One of every item kind, one font and one image of each format: the widest tree the contract allows. */
function fullTree(): RenderTree {
  return {
    version: RENDER_TREE_VERSION,
    pages: [
      {
        index: 0,
        widthPt: 612,
        heightPt: 792,
        items: [
          {
            kind: 'box',
            rect,
            fill: [255, 255, 255],
            edges: [{ side: 'top', thicknessPt: 0.5, colour: black, stroke: 'solid' }],
            corners: [{ corner: 'topLeft', radiusPt: 2, inverted: false, join: 'round' }],
          },
          {
            kind: 'text',
            rect,
            lines: [{ xPt: 11, yBaselinePt: 31, runs: [{ text: 'Hello', fontId: 'f0', sizePt: 10, colour: black, letterSpacingPt: 0.2 }, { text: ' world', fontId: 'f0', sizePt: 10, colour: [0, 0, 255] }] }],
          },
          { kind: 'line', x1Pt: 0, y1Pt: 0, x2Pt: 50, y2Pt: 0, thicknessPt: 0.28, colour: [0, 0, 255], stroke: 'solid' },
          { kind: 'image', imageId: 'i0', rect, aspect: 'fit' },
          {
            kind: 'field',
            som: 'form1.Page1.Name[0]',
            widget: 'textEdit',
            rect,
            contentRect: { xPt: 11, yPt: 21, widthPt: 98, heightPt: 28 },
            access: 'open',
            presence: 'visible',
            value: 'Ada',
            maxChars: 20,
            multiLine: false,
            ariaLabel: 'Name',
          },
          {
            kind: 'field',
            som: 'form1.Page1.Pick[0]',
            widget: 'choiceList',
            rect,
            contentRect: rect,
            access: 'readOnly',
            presence: 'visible',
            value: 'b',
            items: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
          },
          { kind: 'field', som: 'form1.Page1.Tick[0]', widget: 'checkButton', rect, contentRect: rect, access: 'open', presence: 'hidden', value: '1', mark: 'cross', checked: true },
          { kind: 'placeholder', rect, reason: 'barcode' },
        ],
      },
    ],
    resources: {
      fonts: [{ id: 'f0', family: 'Face One', weight: 'bold', posture: 'italic', format: 'opentype', bytes: new Uint8Array([1, 2, 3]) }],
      images: [
        { id: 'i0', format: 'rgba', widthPx: 1, heightPx: 1, bytes: new Uint8Array(4) },
        { id: 'i1', format: 'jpeg', widthPx: 8, heightPx: 8, bytes: new Uint8Array([255, 216]) },
      ],
    },
    issues: [{ som: 'form1.Page1', feature: 'comb field drawn as a plain box' }],
  };
}

const parse = (value: unknown): ReturnType<typeof renderTreeSchema.safeParse> => renderTreeSchema.safeParse(value);

describe('render tree contract (A4)', () => {
  it('a tree with every item kind survives structured clone and parse unchanged, bytes included', () => {
    const tree = fullTree();
    const result = parse(structuredClone(tree));
    expect(result.success).toBe(true);
    expect(result.data).toEqual(tree);
  });

  it('a tree without binary resources survives JSON.parse(JSON.stringify()) and parse unchanged (the worker may use either transport)', () => {
    const tree: RenderTree = { ...fullTree(), resources: { fonts: [], images: [] } };
    const withoutImage = { ...tree, pages: tree.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.kind !== 'image' && item.kind !== 'text') })) };
    const result = parse(JSON.parse(JSON.stringify(withoutImage)));
    expect(result.success).toBe(true);
    expect(result.data).toEqual(withoutImage);
  });

  it('an empty tree (no pages) is valid: a form with nothing visible still lays out', () => {
    expect(parse({ version: RENDER_TREE_VERSION, pages: [], resources: { fonts: [], images: [] }, issues: [] }).success).toBe(true);
  });

  it('refuses a wrong version, a wrong item kind and an unknown key at every level (a silent extra field would hide a contract drift)', () => {
    const tree = fullTree();
    expect(parse({ ...tree, version: RENDER_TREE_VERSION + 1 }).success).toBe(false);
    expect(parse({ ...tree, version: 1 }).success).toBe(false);
    // Bumped from 1 in W02-T12: the image and field items changed after version 1 was set, before any consumer pinned it.
    expect(RENDER_TREE_VERSION).toBe(2);
    expect(parse({ ...tree, extra: 1 }).success).toBe(false);
    const page = tree.pages[0];
    if (page === undefined) throw new Error('fixture');
    expect(parse({ ...tree, pages: [{ ...page, items: [{ kind: 'sparkle', rect }] }] }).success).toBe(false);
    expect(parse({ ...tree, pages: [{ ...page, extra: true }] }).success).toBe(false);
    expect(parse({ ...tree, pages: [{ ...page, items: [{ kind: 'placeholder', rect: { ...rect, extra: 1 }, reason: 'x' }] }] }).success).toBe(false);
    expect(parse({ ...tree, pages: [{ ...page, items: [{ kind: 'placeholder', rect, reason: 'x', extra: 1 }] }] }).success).toBe(false);
  });

  it('refuses NaN, Infinity, a negative size and a zero-size page (a NaN position would reach the browser as a broken style)', () => {
    const page = (items: unknown[], widthPt = 612): unknown => ({ version: RENDER_TREE_VERSION, pages: [{ index: 0, widthPt, heightPt: 792, items }], resources: { fonts: [], images: [] }, issues: [] });
    expect(parse(page([{ kind: 'placeholder', rect: { ...rect, xPt: Number.NaN }, reason: 'x' }])).success).toBe(false);
    expect(parse(page([{ kind: 'placeholder', rect: { ...rect, yPt: Number.POSITIVE_INFINITY }, reason: 'x' }])).success).toBe(false);
    expect(parse(page([{ kind: 'placeholder', rect: { ...rect, widthPt: -1 }, reason: 'x' }])).success).toBe(false);
    expect(parse(page([{ kind: 'placeholder', rect: { ...rect, heightPt: -0.5 }, reason: 'x' }])).success).toBe(false);
    expect(parse(page([], 0)).success).toBe(false);
    expect(parse(page([{ kind: 'placeholder', rect, reason: 'x' }])).success).toBe(true);
  });

  it('colours are integer r,g,b triples in 0..255', () => {
    const base = fullTree();
    const lineWith = (colour: unknown): unknown => ({ ...base, pages: [{ index: 0, widthPt: 10, heightPt: 10, items: [{ kind: 'line', x1Pt: 0, y1Pt: 0, x2Pt: 1, y2Pt: 1, thicknessPt: 1, colour, stroke: 'solid' }] }], resources: { fonts: [], images: [] } });
    expect(parse(lineWith([0, 0, 255])).success).toBe(true);
    for (const bad of [[0, 0, 256], [0, 0, -1], [0.5, 0, 0], [0, 0], [0, 0, 0, 0], '0,0,0']) expect(parse(lineWith(bad)).success, JSON.stringify(bad)).toBe(false);
  });

  it('every hostile-size cap rejects one past the limit and accepts the limit itself', () => {
    const base = fullTree();
    const emptyResources = { fonts: [], images: [] };
    const placeholder = { kind: 'placeholder', rect, reason: 'x' };
    const pageWith = (items: unknown[]): unknown => ({ ...base, pages: [{ index: 0, widthPt: 10, heightPt: 10, items }], resources: emptyResources, issues: [] });
    expect(parse(pageWith(new Array(MAX_ITEMS_PER_PAGE).fill(placeholder))).success).toBe(true);
    expect(parse(pageWith(new Array(MAX_ITEMS_PER_PAGE + 1).fill(placeholder))).success).toBe(false);

    const pages = (n: number): unknown => ({ ...base, pages: Array.from({ length: n }, (_, index) => ({ index, widthPt: 10, heightPt: 10, items: [] })), resources: emptyResources, issues: [] });
    expect(parse(pages(MAX_PAGES)).success).toBe(true);
    expect(parse(pages(MAX_PAGES + 1)).success).toBe(false);

    const run = { text: 'a', fontId: 'f0', sizePt: 10, colour: black };
    const withFont = (items: unknown[]): unknown => ({ ...base, pages: [{ index: 0, widthPt: 10, heightPt: 10, items }], resources: { fonts: fullTree().resources.fonts, images: [] }, issues: [] });
    const textWith = (lines: unknown[]): unknown => withFont([{ kind: 'text', rect, lines }]);
    const line = (runs: unknown[]): unknown => ({ xPt: 0, yBaselinePt: 0, runs });
    expect(parse(textWith(new Array(MAX_LINES_PER_TEXT).fill(line([run])))).success).toBe(true);
    expect(parse(textWith(new Array(MAX_LINES_PER_TEXT + 1).fill(line([run])))).success).toBe(false);
    expect(parse(textWith([line(new Array(MAX_RUNS_PER_LINE).fill(run))])).success).toBe(true);
    expect(parse(textWith([line(new Array(MAX_RUNS_PER_LINE + 1).fill(run))])).success).toBe(false);
    expect(parse(textWith([line([{ ...run, text: 'a'.repeat(MAX_TEXT_CHARS) }])])).success).toBe(true);
    expect(parse(textWith([line([{ ...run, text: 'a'.repeat(MAX_TEXT_CHARS + 1) }])])).success).toBe(false);

    const fieldWith = (extra: object): unknown =>
      pageWith([{ kind: 'field', som: 'a', widget: 'textEdit', rect, contentRect: rect, access: 'open', presence: 'visible', value: '', ...extra }]);
    expect(parse(fieldWith({ value: 'a'.repeat(MAX_TEXT_CHARS) })).success).toBe(true);
    expect(parse(fieldWith({ value: 'a'.repeat(MAX_TEXT_CHARS + 1) })).success).toBe(false);
    expect(parse(fieldWith({ som: 'a'.repeat(MAX_SHORT_TEXT_CHARS) })).success).toBe(true);
    expect(parse(fieldWith({ som: 'a'.repeat(MAX_SHORT_TEXT_CHARS + 1) })).success).toBe(false);
    expect(parse(fieldWith({ som: '' })).success).toBe(false);
    expect(parse(fieldWith({ maxChars: 0 })).success).toBe(false);
    expect(parse(fieldWith({ maxChars: 1.5 })).success).toBe(false);
    expect(parse({ ...base, issues: new Array(MAX_ISSUES + 1).fill({ som: 'a', feature: 'x' }) }).success).toBe(false);
  });

  it('a font resource with no bytes names a generic family (the fallback typeface), and a checked flag is a boolean', () => {
    const tree = fullTree();
    const generic = { id: 'fallback:Courier', family: 'Courier', weight: 'normal', posture: 'normal', format: 'truetype', bytes: new Uint8Array(0) };
    expect(parse({ ...tree, resources: { ...tree.resources, fonts: [...tree.resources.fonts, generic] } }).success).toBe(true);
    const page = tree.pages[0];
    if (page === undefined) throw new Error('fixture');
    const tick = { kind: 'field', som: 'a', widget: 'checkButton', rect, contentRect: rect, access: 'open', presence: 'visible', value: '', checked: 'yes' };
    expect(parse({ ...tree, pages: [{ ...page, items: [tick] }] }).success).toBe(false);
  });

  it('the short-text ceiling for a SOM is the SOM resolver ceiling (a longer SOM could never have been produced by the runtime)', () => {
    expect(MAX_SHORT_TEXT_CHARS).toBe(MAX_SOM_CHARS);
  });

  it('the widget list is exactly the template widget classes (a drift would let a widget through or refuse a real one)', () => {
    expect(new Set(WIDGET_KINDS)).toEqual(UI_WIDGET_CLASSES);
    expect(WIDGET_KINDS.length).toBe(UI_WIDGET_CLASSES.size);
  });

  it('a run naming a font, or an image item naming an image, that the resources do not hold is refused (the browser would draw nothing and say nothing)', () => {
    const tree = fullTree();
    const noFonts = { ...tree, resources: { ...tree.resources, fonts: [] } };
    expect(parse(noFonts).success).toBe(false);
    const noImages = { ...tree, resources: { ...tree.resources, images: [] } };
    expect(parse(noImages).success).toBe(false);
  });

  it('two resources with one id are refused', () => {
    const tree = fullTree();
    const font = tree.resources.fonts[0];
    if (font === undefined) throw new Error('fixture');
    expect(parse({ ...tree, resources: { ...tree.resources, fonts: [font, font] } }).success).toBe(false);
  });

  it('an rgba image whose byte length is not width x height x 4 is refused, and a resource over its byte ceiling is refused', () => {
    const tree = fullTree();
    const rgba = { id: 'i0', format: 'rgba', widthPx: 2, heightPx: 2, bytes: new Uint8Array(4) };
    expect(parse({ ...tree, resources: { ...tree.resources, images: [rgba] } }).success).toBe(false);
    expect(parse({ ...tree, resources: { ...tree.resources, images: [{ ...rgba, bytes: new Uint8Array(16) }] } }).success).toBe(true);
    expect(parse({ ...tree, resources: { ...tree.resources, images: [{ ...rgba, widthPx: 0, heightPx: 0, bytes: new Uint8Array(0) }] } }).success).toBe(false);
  });

  it('binary resources must be Uint8Array: a plain array of numbers (a JSON round trip) is refused instead of copied', () => {
    const tree = fullTree();
    const font = tree.resources.fonts[0];
    if (font === undefined) throw new Error('fixture');
    expect(parse({ ...tree, resources: { ...tree.resources, fonts: [{ ...font, bytes: [1, 2, 3] }] } }).success).toBe(false);
  });
});
