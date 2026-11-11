import { sha256 } from '@noble/hashes/sha2.js';
import { describe, expect, it, vi } from 'vitest';
import { layoutBoxes } from '../../box/build.js';
import type { LayoutBox } from '../../box/types.js';
import { build, find, ORIGIN } from '../../box/__tests__/helpers.js';
import { RENDER_TREE_VERSION, renderTreeSchema, type RenderItem, type RenderTree } from '../../render-tree.js';
import { MAX_IMAGE_RESOURCES, MAX_ISSUES } from '../../limits.js';
import { createImageContext } from '../context.js';
import { decodeImage } from '../decode.js';
import { MAX_IMAGE_TEXT_MEMO } from '../limits.js';
import { buildBmp, buildJpeg, buildTiff, limitsOf, long, short, toBase64 } from './helpers.js';

// Spies that call through: they count decodes and hashes without changing what either does.
vi.mock('../decode.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../decode.js')>();
  return { ...actual, decodeImage: vi.fn(actual.decodeImage) };
});
vi.mock('@noble/hashes/sha2.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@noble/hashes/sha2.js')>();
  return { ...actual, sha256: vi.fn(actual.sha256) };
});

const bmp = (width: number, height: number, fill = 0): Uint8Array => {
  const stride = Math.ceil((width * 3) / 4) * 4;
  return buildBmp({ width, height, bitsPerPixel: 24, rows: Array.from({ length: height }, () => new Array<number>(stride).fill(fill)) });
};
const GREY_TIFF = buildTiff({ tags: [long(256, 2), long(257, 2), short(258, 8), short(259, 1), short(262, 1), long(273), short(277, 1), long(278, 2), long(279)], strips: [[1, 2, 3, 4]] });

interface DrawOptions {
  readonly name?: string;
  readonly attrs?: string;
  readonly imageAttrs?: string;
  readonly data?: string;
  readonly children?: string;
  readonly size?: string;
}
const draw = ({ name = 'd', attrs = '', imageAttrs = '', data = '', children = '', size = 'x="0pt" y="0pt" w="100pt" h="50pt"' }: DrawOptions): string =>
  `<draw name="${name}" ${size} ${attrs}><value><image ${imageAttrs}>${data}</image></value>${children}</draw>`;

/** Lays the named draws of a template body out and returns the boxes. */
function boxesOf(body: string, names: readonly string[], className = 'draw'): LayoutBox[] {
  const dom = build(body).dom;
  return names.map((name) => layoutBoxes(find(dom, className, name), ORIGIN).box);
}

function oneDraw(options: DrawOptions): { readonly box: LayoutBox } {
  const [box] = boxesOf(draw(options), [options.name ?? 'd']);
  if (box === undefined) throw new Error('no box');
  return { box };
}

const asPlaceholder = (item: RenderItem | undefined): Extract<RenderItem, { kind: 'placeholder' }> => {
  expect(item?.kind).toBe('placeholder');
  return item as Extract<RenderItem, { kind: 'placeholder' }>;
};

const treeOf = (ctx: ReturnType<typeof createImageContext>, items: RenderItem[]): RenderTree => ({
  version: RENDER_TREE_VERSION,
  pages: [{ index: 0, widthPt: 612, heightPt: 792, items }],
  resources: { fonts: [], images: [...ctx.resources] },
  issues: [...ctx.issues],
});

const imageItem = (item: RenderItem | undefined): Extract<RenderItem, { kind: 'image' }> => {
  expect(item?.kind).toBe('image');
  return item as Extract<RenderItem, { kind: 'image' }>;
};

describe('ImageContext.draw: images become render-tree items and deduplicated resources', () => {
  it('draws a BMP inside the box: an image item, an rgba resource of width x height x 4 bytes, and a tree the schema accepts', () => {
    const ctx = createImageContext();
    const { box } = oneDraw({ imageAttrs: 'contentType="image/bmp"', data: toBase64(bmp(10, 10, 9)) });
    const item = imageItem(ctx.draw(box));
    expect(item).toMatchObject({ rect: { xPt: 0, yPt: 0, widthPt: 50, heightPt: 50 }, aspect: 'fit' });
    expect(item.imageId).toMatch(/^sha256:[0-9a-f]{64}$/);
    const [resource] = ctx.resources;
    expect(resource).toMatchObject({ id: item.imageId, format: 'rgba', widthPx: 10, heightPx: 10 });
    expect(resource?.bytes).toHaveLength(400);
    expect(ctx.issues).toEqual([]);
    expect(renderTreeSchema.safeParse(treeOf(ctx, [item])).success).toBe(true);
  });

  it('passes a JPEG through as its own bytes, and a TIFF is decoded', () => {
    const ctx = createImageContext();
    const jpeg = buildJpeg({ width: 40, height: 20, jfif: { units: 1, x: 72, y: 72 } });
    const dom = build(draw({ name: 'j', data: toBase64(jpeg), imageAttrs: 'contentType="image/jpeg"' }) + draw({ name: 't', data: toBase64(GREY_TIFF), imageAttrs: 'contentType="image/tif"' })).dom;
    const [j, t] = ['j', 't'].map((name) => layoutBoxes(find(dom, 'draw', name), ORIGIN).box);
    expect(imageItem(ctx.draw(j as LayoutBox)).rect).toEqual({ xPt: 0, yPt: 0, widthPt: 100, heightPt: 50 });
    imageItem(ctx.draw(t as LayoutBox));
    expect(ctx.resources.map((r) => [r.format, r.widthPx, r.heightPx])).toEqual([['jpeg', 40, 20], ['rgba', 2, 2]]);
    expect([...(ctx.resources[0]?.bytes ?? [])]).toEqual([...jpeg]);
  });

  it('shares one resource between identical images (same bytes, different base64 line breaks), and keeps different images apart', () => {
    const ctx = createImageContext();
    const file = bmp(4, 4, 3);
    const text = toBase64(file);
    const body = draw({ name: 'a', data: text }) + draw({ name: 'b', data: text.replace(/(.{8})/g, '$1\n') }) + draw({ name: 'c', data: toBase64(bmp(4, 4, 4)) });
    const [a, b, c] = boxesOf(body, ['a', 'b', 'c']).map((box) => imageItem(ctx.draw(box)));
    expect(a?.imageId).toBe(b?.imageId);
    expect(a?.imageId).not.toBe(c?.imageId);
    expect(ctx.resources).toHaveLength(2);
    expect(ctx.resources[0]?.bytes).toBe(ctx.resources[0]?.bytes);
  });

  it('ignores the declared content type: the bytes decide', () => {
    const ctx = createImageContext();
    const { box } = oneDraw({ imageAttrs: 'contentType="image/png"', data: toBase64(bmp(2, 2)) });
    expect(ctx.draw(box)?.kind).toBe('image');
  });

  it('applies the aspect attribute and the draw para alignment: always inside the box, so nothing needs clipping', () => {
    const ctx = createImageContext();
    const data = toBase64(bmp(96, 48)); // 72 x 36 pt at 96 dpi, in a 100 x 50 pt box
    const cases: [string, string, Record<string, unknown>][] = [
      ['', '', { aspect: 'fit', rect: { xPt: 0, yPt: 0, widthPt: 100, heightPt: 50 } }],
      ['aspect="actual"', '', { aspect: 'actual', rect: { xPt: 0, yPt: 0, widthPt: 72, heightPt: 36 } }],
      ['aspect="actual"', '<para hAlign="center" vAlign="middle"/>', { rect: { xPt: 14, yPt: 7, widthPt: 72, heightPt: 36 } }],
      ['aspect="actual"', '<para hAlign="right" vAlign="bottom"/>', { rect: { xPt: 28, yPt: 14, widthPt: 72, heightPt: 36 } }],
      ['', '<para hAlign="center" vAlign="middle"/>', { aspect: 'fit', rect: { xPt: 0, yPt: 0, widthPt: 100, heightPt: 50 } }],
      ['aspect="none"', '', { aspect: 'none', rect: { xPt: 0, yPt: 0, widthPt: 100, heightPt: 50 } }],
      ['aspect="width"', '', { aspect: 'width', rect: { xPt: 0, yPt: 0, widthPt: 100, heightPt: 50 } }],
      ['aspect="height"', '<para hAlign="right"/>', { aspect: 'height', rect: { xPt: 0, yPt: 0, widthPt: 100, heightPt: 50 } }],
    ];
    for (const [imageAttrs, children, expected] of cases) {
      const { box } = oneDraw({ imageAttrs, children, data });
      expect(ctx.draw(box), `${imageAttrs} ${children}`).toMatchObject(expected);
    }
    // 48 x 96 px = 36 x 72 pt: larger than the box in height. `actual` contains it (25 x 50 pt), `fit` too; `width` stretches.
    const tall = toBase64(bmp(48, 96));
    expect(ctx.draw(oneDraw({ imageAttrs: 'aspect="actual"', data: tall }).box)).toMatchObject({ rect: { xPt: 0, yPt: 0, widthPt: 25, heightPt: 50 } });
    expect(ctx.draw(oneDraw({ imageAttrs: 'aspect="actual"', children: '<para hAlign="center"/>', data: tall }).box)).toMatchObject({ rect: { xPt: 37.5, yPt: 0, widthPt: 25, heightPt: 50 } });
    expect(ctx.draw(oneDraw({ imageAttrs: 'aspect="width"', data: tall }).box)).toMatchObject({ rect: { xPt: 0, yPt: 0, widthPt: 100, heightPt: 50 } });
  });

  it('draws inside the margins: the content region of the draw, in the frame of the box', () => {
    const ctx = createImageContext();
    const [box] = boxesOf(draw({ name: 'm', size: 'x="10pt" y="20pt" w="100pt" h="60pt"', children: '<margin leftInset="5pt" topInset="4pt" rightInset="5pt" bottomInset="6pt"/>', data: toBase64(bmp(4, 4)) }), ['m']);
    expect(ctx.draw(box as LayoutBox)).toMatchObject({ rect: { xPt: 15, yPt: 24, widthPt: 50, heightPt: 50 } });
  });

  it('an aspect or alignment the engine does not model is reported and read as the default', () => {
    const ctx = createImageContext();
    expect(ctx.draw(oneDraw({ imageAttrs: 'aspect="cover"', data: toBase64(bmp(4, 4)) }).box)).toMatchObject({ aspect: 'fit' });
    expect(ctx.issues.map((i) => i.feature)).toEqual([expect.stringMatching(/^image aspect: aspect: value not supported/)]);
    const ctx2 = createImageContext();
    expect(ctx2.draw(oneDraw({ children: '<para hAlign="justify"/>', data: toBase64(bmp(4, 4)) }).box)).toMatchObject({ rect: { xPt: 0 } });
    expect(ctx2.issues.map((i) => i.feature)).toEqual(['para hAlign justify: an image is placed at the left']);
  });

  it('items with every aspect are valid in the render tree, and an unknown key (a clip is gone) or aspect is not', () => {
    const ctx = createImageContext();
    const { box } = oneDraw({ imageAttrs: 'aspect="width"', data: toBase64(bmp(48, 96)) });
    const item = imageItem(ctx.draw(box));
    expect(item).not.toHaveProperty('clip');
    for (const aspect of ['fit', 'actual', 'height', 'none', 'width'] as const) expect(renderTreeSchema.safeParse(treeOf(ctx, [{ ...item, aspect }])).success, aspect).toBe(true);
    expect(renderTreeSchema.safeParse(treeOf(ctx, [{ ...item, aspect: 'cover' } as unknown as RenderItem])).success).toBe(false);
    expect(renderTreeSchema.safeParse(treeOf(ctx, [{ ...item, clip: item.rect } as unknown as RenderItem])).success).toBe(false);
  });

  it('reads href and transferEncoding from the live form, so a value a script wrote is what is refused', () => {
    const ctx = createImageContext();
    const { box } = oneDraw({ data: toBase64(bmp(4, 4)) });
    expect(ctx.draw(box)?.kind).toBe('image');
    box.node.childrenOfClass('value')[0]?.oneOfChild?.setAttr('href', 'https://example.test/a.bmp');
    expect(ctx.draw(box)?.kind).toBe('placeholder');
    expect(ctx.issues.map((i) => i.feature)).toEqual(['image href: external images are never fetched']);
  });

  it('draws nothing for a box that is not drawn, or has no image', () => {
    const ctx = createImageContext();
    expect(ctx.draw(oneDraw({ attrs: 'presence="hidden"', data: toBase64(bmp(2, 2)) }).box)).toBeUndefined();
    const [text] = boxesOf('<draw name="t" x="0pt" y="0pt" w="9pt" h="9pt"><value><text>hi</text></value></draw>', ['t']);
    expect(ctx.draw(text as LayoutBox)).toBeUndefined();
    expect(ctx.resources).toEqual([]);
  });
});

describe('ImageContext.draw: an image that cannot be drawn is a placeholder and an issue, and the others are unaffected', () => {
  const ok = toBase64(bmp(4, 4));
  const failures: [string, DrawOptions, RegExp][] = [
    ['a truncated BMP', { data: toBase64(bmp(4, 4).subarray(0, 60)) }, /^image truncated: /],
    ['a compressed TIFF', { data: toBase64(buildTiff({ tags: [long(256, 2), long(257, 2), short(258, 8), short(259, 5), short(262, 1), long(273), long(278, 2), long(279)], strips: [[1, 2, 3, 4]] })) }, /^image unsupported: tiff LZW/],
    ['a PNG', { data: toBase64(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0)) }, /^image unsupported: PNG image/],
    ['an external href', { imageAttrs: 'href="https://example.test/a.bmp"', data: '' }, /^image href: external images are never fetched/],
    ['a package encoding', { imageAttrs: 'transferEncoding="package"', data: ok }, /^image transferEncoding package/],
    ['no data', { data: '' }, /^image malformed: image has no data/],
    ['bad base64', { data: 'not*base64' }, /^image malformed: image base64 has a character/],
    ['a huge header', { data: toBase64(buildBmp({ width: 0x7fffffff, height: 0x7fffffff, bitsPerPixel: 24, rows: [[0, 0, 0, 0]] })) }, /^image limit: /],
  ];

  it.each(failures)('%s', (_, options, feature) => {
    const ctx = createImageContext();
    const body = draw({ ...options, name: 'bad' }) + draw({ name: 'good', data: ok });
    const [bad, good] = boxesOf(body, ['bad', 'good']);
    const placeholder = asPlaceholder(ctx.draw(bad as LayoutBox));
    expect(placeholder.rect).toEqual({ xPt: 0, yPt: 0, widthPt: 100, heightPt: 50 });
    expect(placeholder.reason.length).toBeGreaterThan(0);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0]?.feature).toMatch(feature);
    expect(ctx.issues[0]?.som).toContain('bad');
    expect(ctx.draw(good as LayoutBox)?.kind).toBe('image');
    expect(ctx.resources).toHaveLength(1);
    expect(renderTreeSchema.safeParse(treeOf(ctx, [placeholder, imageItem(ctx.draw(good as LayoutBox))])).success).toBe(true);
  });

  it('an image in a field (user images are out of scope) and a region with no area are placeholders too', () => {
    const ctx = createImageContext();
    const field = '<field name="f" x="0pt" y="0pt" w="40pt" h="40pt"><ui><imageEdit/></ui><value><image>' + ok + '</image></value></field>';
    const [f] = boxesOf(field, ['f'], 'field');
    asPlaceholder(ctx.draw(f as LayoutBox));
    expect(ctx.issues.map((i) => i.feature)).toEqual(['image in a field (imageEdit): not drawn']);
    const ctx2 = createImageContext();
    asPlaceholder(ctx2.draw(oneDraw({ size: 'x="0pt" y="0pt" w="0pt" h="50pt"', data: ok }).box));
    expect(ctx2.issues.map((i) => i.feature)).toEqual(['image region has no area']);
  });

  it('reports a failing image once per node however often it is drawn, and echoes none of the image text', () => {
    const ctx = createImageContext();
    const { box } = oneDraw({ data: 'secret-' + '*'.repeat(10) });
    ctx.draw(box);
    ctx.draw(box);
    expect(ctx.issues).toHaveLength(1);
    expect(JSON.stringify(ctx.issues)).not.toContain('secret');
  });
});

describe('ImageContext: budgets and passes', () => {
  it('holds the images of one form to the decoded-byte budget: the first fits, the next does not, and says so', () => {
    const ctx = createImageContext(limitsOf({ maxTotalBytes: 700 }));
    const body = draw({ name: 'a', data: toBase64(bmp(10, 10, 1)) }) + draw({ name: 'b', data: toBase64(bmp(10, 10, 2)) }) + draw({ name: 'c', data: toBase64(bmp(10, 10, 1)) });
    const [a, b, c] = boxesOf(body, ['a', 'b', 'c']);
    expect(ctx.draw(a as LayoutBox)?.kind).toBe('image');
    asPlaceholder(ctx.draw(b as LayoutBox));
    expect(ctx.issues[0]?.feature).toMatch(/^image limit: /);
    // The identical third image costs nothing more.
    expect(ctx.draw(c as LayoutBox)?.kind).toBe('image');
    expect(ctx.resources).toHaveLength(1);
  });

  it('refuses a form that uses more distinct images than the render tree can hold', () => {
    const ctx = createImageContext();
    const count = MAX_IMAGE_RESOURCES + 1;
    const body = Array.from({ length: count }, (_, i) => draw({ name: `d${i}`, data: toBase64(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows: [[i & 255, i >> 8, 7, 0]] })) })).join('');
    const names = Array.from({ length: count }, (_, i) => `d${i}`);
    const kinds = boxesOf(body, names).map((box) => ctx.draw(box)?.kind);
    expect(kinds.filter((k) => k === 'image')).toHaveLength(MAX_IMAGE_RESOURCES);
    expect(kinds.at(-1)).toBe('placeholder');
    expect(ctx.resources).toHaveLength(MAX_IMAGE_RESOURCES);
  });

  it('a new pass starts with empty resources and issues but keeps the decode of an image the last pass used, and drops one it did not', () => {
    const ctx = createImageContext();
    const body = draw({ name: 'a', data: toBase64(bmp(4, 4, 1)) }) + draw({ name: 'b', data: toBase64(bmp(4, 4, 2)) });
    const [a, b] = boxesOf(body, ['a', 'b']) as [LayoutBox, LayoutBox];
    ctx.draw(a);
    ctx.draw(b);
    const first = ctx.resources.map((r) => r.bytes);
    ctx.startPass();
    expect(ctx.resources).toEqual([]);
    expect(ctx.issues).toEqual([]);
    ctx.draw(a);
    expect(ctx.resources[0]?.bytes).toBe(first[0]);
    ctx.startPass(); // b was not used in the pass just ended
    ctx.draw(b);
    expect(ctx.resources[0]?.bytes).not.toBe(first[1]);
    expect([...(ctx.resources[0]?.bytes ?? [])]).toEqual([...first[1] ?? []]);
  });

  it('a failure caused by the budget of a pass is not remembered for the next pass', () => {
    const ctx = createImageContext(limitsOf({ maxTotalBytes: 500 }));
    const body = draw({ name: 'a', data: toBase64(bmp(10, 10, 1)) }) + draw({ name: 'b', data: toBase64(bmp(10, 10, 2)) });
    const [a, b] = boxesOf(body, ['a', 'b']) as [LayoutBox, LayoutBox];
    ctx.draw(a);
    expect(ctx.draw(b)?.kind).toBe('placeholder');
    ctx.startPass();
    expect(ctx.draw(b)?.kind).toBe('image');
  });
});

describe('ImageContext: nothing is decoded for an image the form may not hold (T11-F1, F4, F5)', () => {
  const tinyBmp = (i: number): string => toBase64(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows: [[i & 255, i >> 8, 7, 0]] }));
  const bigBmp = (i: number): string => toBase64(buildBmp({ width: 512, height: 512, bitsPerPixel: 1, palette: [[0, 0, 0], [i & 255, 255, 255]], rows: Array.from({ length: 512 }, () => new Array<number>(64).fill(0xaa)) }));

  it('an image past the distinct-image ceiling is refused before it is decoded or cached (the decode count stays at the ceiling, the cache holds only the ceiling)', () => {
    const ctx = createImageContext();
    const body = Array.from({ length: MAX_IMAGE_RESOURCES }, (_, i) => draw({ name: `t${i}`, data: tinyBmp(i) })).join('') + [1, 2, 3].map((i) => draw({ name: `b${i}`, data: bigBmp(i) })).join('');
    const names = [...Array.from({ length: MAX_IMAGE_RESOURCES }, (_, i) => `t${i}`), 'b1', 'b2', 'b3'];
    vi.mocked(decodeImage).mockClear();
    const kinds = boxesOf(body, names).map((box) => ctx.draw(box)?.kind);
    expect(kinds.slice(0, MAX_IMAGE_RESOURCES).every((k) => k === 'image')).toBe(true);
    expect(kinds.slice(MAX_IMAGE_RESOURCES)).toEqual(['placeholder', 'placeholder', 'placeholder']);
    expect(vi.mocked(decodeImage)).toHaveBeenCalledTimes(MAX_IMAGE_RESOURCES);
    expect(ctx.cached).toBe(MAX_IMAGE_RESOURCES);
    expect(ctx.issues).toHaveLength(3);
    for (const issue of ctx.issues) expect(issue.feature).toMatch(/^image limit: form uses more than 256 distinct images/);
    // Drawn again in the same pass they are still refused without a decode; an image already in use is not refused.
    const again = boxesOf(body, ['b1', 't0']).map((box) => ctx.draw(box)?.kind);
    expect(again).toEqual(['placeholder', 'image']);
    expect(vi.mocked(decodeImage)).toHaveBeenCalledTimes(MAX_IMAGE_RESOURCES);
  });

  it('a JPEG is charged its decoded size (width x height x 4) to the form budget, so large JPEGs are refused', () => {
    const ctx = createImageContext();
    const jpeg = (i: number): string => toBase64(buildJpeg({ width: 4096, height: 4096, jfif: { units: 1, x: 72 + i, y: 72 } }));
    const body = [0, 1, 2].map((i) => draw({ name: `j${i}`, data: jpeg(i) })).join('');
    const kinds = boxesOf(body, ['j0', 'j1', 'j2']).map((box) => ctx.draw(box)?.kind);
    expect(kinds).toEqual(['image', 'image', 'placeholder']); // 2 x 64 MiB fills the 128 MiB budget
    expect(ctx.issues[0]?.feature).toMatch(/^image limit: /);
    expect(ctx.resources).toHaveLength(2);
    const small = createImageContext(limitsOf({ maxTotalBytes: 40_000 }));
    const [a, b] = boxesOf(draw({ name: 'a', data: toBase64(buildJpeg({ width: 100, height: 100 })) }) + draw({ name: 'b', data: toBase64(buildJpeg({ width: 100, height: 101 })) }), ['a', 'b']);
    expect(small.draw(a as LayoutBox)?.kind).toBe('image');
    expect(small.draw(b as LayoutBox)?.kind).toBe('placeholder');
  });

  it('an unexpected error (an allocation RangeError) is a `limit` failure of that image, not `malformed`, and is not remembered', () => {
    const ctx = createImageContext();
    const { box } = oneDraw({ data: tinyBmp(9) });
    vi.mocked(decodeImage).mockImplementationOnce(() => {
      throw new RangeError('Array buffer allocation failed');
    });
    const placeholder = asPlaceholder(ctx.draw(box));
    expect(placeholder.reason).toBe('image not drawn (limit)');
    expect(ctx.issues.map((i) => i.feature)).toEqual(['image limit: image decoding ran out of memory or failed unexpectedly']);
    expect(ctx.cached).toBe(0);
    expect(ctx.draw(box)?.kind).toBe('image');
  });
});

describe('ImageContext: an unchanged image is not hashed again on every re-layout (T11-F10)', () => {
  const data = (i: number): string => toBase64(bmp(4, 4, i));

  it('hashes once across draws and passes, hashes again for a changed text, and forgets an image a pass did not use', () => {
    const ctx = createImageContext();
    const [a, b] = boxesOf(draw({ name: 'a', data: data(1) }) + draw({ name: 'b', data: data(2) }), ['a', 'b']) as [LayoutBox, LayoutBox];
    vi.mocked(sha256).mockClear();
    ctx.draw(a);
    ctx.draw(a);
    ctx.startPass();
    ctx.draw(a);
    expect(vi.mocked(sha256)).toHaveBeenCalledTimes(1);
    ctx.draw(b);
    expect(vi.mocked(sha256)).toHaveBeenCalledTimes(2);
    // A pass that uses neither forgets both; the next pass that uses a hashes it again.
    ctx.startPass();
    ctx.startPass();
    ctx.draw(a);
    expect(vi.mocked(sha256)).toHaveBeenCalledTimes(3);
    // The text a script writes is a different string: hashed once, and the id follows the bytes.
    const image = a.node.childrenOfClass('value')[0]?.oneOfChild;
    if (image === undefined) throw new Error('no image node');
    image.nodeValue = data(5);
    expect(ctx.draw(a)).toMatchObject({ kind: 'image' });
    expect(vi.mocked(sha256)).toHaveBeenCalledTimes(4);
  });

  it('remembers at most MAX_IMAGE_TEXT_MEMO texts: the variants past it are hashed on every pass', () => {
    const ctx = createImageContext();
    const base = data(3);
    const variants = MAX_IMAGE_TEXT_MEMO + 10;
    const body = Array.from({ length: variants }, (_, i) => draw({ name: `v${i}`, data: base + ' '.repeat(i + 1) })).join('');
    const boxes = boxesOf(body, Array.from({ length: variants }, (_, i) => `v${i}`));
    for (const box of boxes) ctx.draw(box);
    expect(ctx.resources).toHaveLength(1);
    ctx.startPass();
    vi.mocked(sha256).mockClear();
    for (const box of boxes) ctx.draw(box);
    expect(vi.mocked(sha256)).toHaveBeenCalledTimes(10);
  });
});

describe('ImageContext: issues are bounded however many images fail (T11 gap)', () => {
  it('saturates at MAX_ISSUES: every bad image still gets its placeholder, and the list never grows past the ceiling', () => {
    const ctx = createImageContext();
    const count = MAX_ISSUES + 5;
    const body = `<subform name="s" x="0pt" y="0pt" w="10pt" h="10pt">${Array.from({ length: count }, (_, i) => draw({ name: `d${i}`, data: '*' })).join('')}</subform>`;
    const { box } = layoutBoxes(find(build(body).dom, 'subform', 's'), ORIGIN);
    expect(box.children).toHaveLength(count);
    const kinds = box.children.map((child) => ctx.draw(child)?.kind);
    expect(kinds.every((k) => k === 'placeholder')).toBe(true);
    expect(ctx.issues).toHaveLength(MAX_ISSUES);
    // The five past the ceiling are counted, so the tree can say they were lost.
    expect(ctx.dropped).toBe(5);
  });
});
