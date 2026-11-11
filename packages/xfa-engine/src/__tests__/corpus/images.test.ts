import { bytesToHex } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { describe, expect, it } from 'vitest';
import type { LayoutBox } from '../../layout/box/index.js';
import { layoutFlow } from '../../layout/flow/index.js';
import { createImageContext, type ImageResource } from '../../layout/image/index.js';
import { RENDER_TREE_VERSION, renderTreeSchema, type RenderItem } from '../../layout/render-tree.js';
import type { FormNode } from '../../model/form/index.js';
import { files, load, nodesOf, textContext } from './text-corpus.js';

/**
 * W02-T11 A2 on the real forms. Both carry the same five embedded images (OVERVIEW survey): a 1147 x 279 one-bit BMP and a
 * 41 x 36 24-bit BMP (`aspect="actual"`), a JPEG, and the same one-bit 113 x 150 TIFF twice. The counts below were read from
 * the template XML itself (`<image` elements and their decoded sizes), not from the engine.
 */
const imageNodes = (nodes: FormNode[]): FormNode[] => nodes.filter((n) => n.childrenOfClass('value')[0]?.oneOfChild?.className === 'image');
const byName = (nodes: FormNode[], name: string): FormNode[] => nodes.filter((n) => n.name === name);

async function laidOut(file: string): Promise<{ readonly draws: FormNode[]; readonly boxes: Map<FormNode, LayoutBox> }> {
  const loaded = await load(file);
  const flow = layoutFlow(loaded.dom, textContext(loaded));
  const boxes = new Map<FormNode, LayoutBox>();
  const visit = (box: LayoutBox): void => {
    boxes.set(box.node, box);
    box.children.forEach(visit);
  };
  visit(flow.root);
  flow.masterPages.forEach((page) => page.boxes.forEach(visit));
  return { draws: imageNodes(nodesOf(loaded.dom, 'draw')), boxes };
}

describe.each(files)('the embedded images of real form %s', (file) => {
  it('five images decode: four distinct resources (the two identical TIFFs share one) of the sizes the files declare, with no issue', async () => {
    const { draws, boxes } = await laidOut(file);
    expect(draws.map((d) => d.name).sort()).toEqual(['Image2', 'arrow', 'arrow', 'flag', 'wordmark']);
    const ctx = createImageContext();
    const items = draws.map((node) => {
      const box = boxes.get(node);
      expect(box, `box of ${node.name}`).toBeDefined();
      expect(box?.drawn, `${node.name} is drawn`).toBe(true);
      return ctx.draw(box as LayoutBox);
    });
    expect(items.map((item) => item?.kind)).toEqual(['image', 'image', 'image', 'image', 'image']);
    expect(ctx.issues).toEqual([]);

    const resources = ctx.resources;
    expect(resources.map((r) => [r.format, r.widthPx, r.heightPx]).sort()).toEqual([
      ['jpeg', 2228, 223],
      ['rgba', 113, 150],
      ['rgba', 1147, 279],
      ['rgba', 41, 36],
    ]);
    const arrows = items.filter((_, i) => draws[i]?.name === 'arrow').map((item) => (item as Extract<RenderItem, { kind: 'image' }>).imageId);
    expect(arrows).toHaveLength(2);
    expect(arrows[0]).toBe(arrows[1]);
    for (const r of resources) if (r.format === 'rgba') expect(r.bytes).toHaveLength(r.widthPx * r.heightPx * 4);
    expect(renderTreeSchema.safeParse({ version: RENDER_TREE_VERSION, pages: [{ index: 0, widthPt: 612, heightPt: 792, items: items as RenderItem[] }], resources: { fonts: [], images: [...resources] }, issues: [] }).success).toBe(true);
  });

  it('draws each image in its box by its aspect: logo fitted and centred, flag fitted, arrows fitted, the stop hand at its actual size', async () => {
    const { draws, boxes } = await laidOut(file);
    const ctx = createImageContext();
    const item = (name: string): Extract<RenderItem, { kind: 'image' }> => {
      const node = byName(draws, name)[0] as FormNode;
      return ctx.draw(boxes.get(node) as LayoutBox) as Extract<RenderItem, { kind: 'image' }>;
    };
    const box = (name: string): LayoutBox => boxes.get(byName(draws, name)[0] as FormNode) as LayoutBox;

    // wordmark: 1147 x 279 px at 300 dpi (275.28 x 66.96 pt) fitted into 72 x 18 pt, centred (para hAlign center, vAlign middle).
    const wordmark = item('wordmark');
    expect(wordmark.aspect).toBe('fit');
    expect(wordmark.rect.widthPt).toBeCloseTo(72, 2);
    expect(wordmark.rect.heightPt).toBeCloseTo((279 / 1147) * 72, 2);
    expect(wordmark.rect.yPt - box('wordmark').widgetRect.yPt).toBeCloseTo((18 - (279 / 1147) * 72) / 2, 2);

    // flag: 2228 x 223 px (JFIF 1080 dpi) fitted into 201.6 x 18 pt: limited by height, left and top.
    const flag = item('flag');
    expect(flag.rect.heightPt).toBeCloseTo(18, 2);
    expect(flag.rect.widthPt).toBeCloseTo((2228 / 223) * 18, 2);
    expect(flag.rect.xPt).toBeCloseTo(box('flag').widgetRect.xPt, 6);

    // arrow: 113 x 150 px fitted into 6.775 x 9.383 pt: limited by width.
    const arrow = item('arrow');
    expect(arrow.rect.widthPt).toBeCloseTo(box('arrow').widgetRect.widthPt, 2);
    expect(arrow.rect.heightPt).toBeCloseTo((150 / 113) * arrow.rect.widthPt, 2);

    // Image2 (the stop hand): `aspect="actual"`, 41 x 36 px at 96 dpi = 30.75 x 27 pt = its 10.848 x 9.525 mm box, to a hundredth of a point.
    const hand = item('Image2');
    expect(hand.aspect).toBe('actual');
    expect(hand.rect.widthPt).toBeCloseTo(box('Image2').widgetRect.widthPt, 1);
    expect(hand.rect.heightPt).toBeCloseTo(box('Image2').widgetRect.heightPt, 1);
    expect(hand.rect.widthPt).toBeCloseTo((41 * 72) / 96, 1);
  });

  it('decodes pixels, not just sizes: the logo is bilevel black and white, the TIFF arrow is bilevel, and nothing is fully transparent', async () => {
    const { draws, boxes } = await laidOut(file);
    const ctx = createImageContext();
    for (const node of draws) ctx.draw(boxes.get(node) as LayoutBox);
    const rgba = ctx.resources.filter((r): r is ImageResource & { format: 'rgba' } => r.format === 'rgba');
    for (const r of rgba) {
      expect(r.bytes.every((_, i) => i % 4 !== 3 || r.bytes[i] === 255), 'opaque').toBe(true);
    }
    const bilevel = rgba.filter((r) => r.widthPx === 1147 || r.widthPx === 113);
    expect(bilevel).toHaveLength(2);
    for (const r of bilevel) {
      const distinct = new Set<number>();
      for (let i = 0; i < r.bytes.length; i += 4) distinct.add((r.bytes[i] ?? 0) * 65536 + (r.bytes[i + 1] ?? 0) * 256 + (r.bytes[i + 2] ?? 0));
      expect([...distinct].sort()).toEqual([0, 0xffffff]);
    }
  });

  it('decodes pixel for pixel what an independent decoder (macOS ImageIO, through `sips -s format png`) decodes: the RGB of the logo, the stop hand and the arrow', async () => {
    const { draws, boxes } = await laidOut(file);
    const ctx = createImageContext();
    for (const node of draws) ctx.draw(boxes.get(node) as LayoutBox);
    const rgbHash = (r: ImageResource): string => {
      const rgb = new Uint8Array(r.widthPx * r.heightPx * 3);
      for (let i = 0; i < r.widthPx * r.heightPx; i += 1) rgb.set(r.bytes.subarray(i * 4, i * 4 + 3), i * 3);
      return bytesToHex(sha256(rgb)).slice(0, 16);
    };
    const hashes = Object.fromEntries(ctx.resources.filter((r) => r.format === 'rgba').map((r) => [`${r.widthPx}x${r.heightPx}`, rgbHash(r)]));
    // Provenance of the pinned hashes (the oracle is Apple's ImageIO, not this engine), produced once on 2026-10-19 on
    // macOS 26.4.1 (build 25E253) with /usr/bin/sips-316 and Python 3.14.7 (`python3 -I`, standard library only):
    //   1. Base64-decode the text of each `<image>` of imm5257e.pdf's template packet to wordmark.bmp, hand.bmp, arrow.tif.
    //   2. `sips -s format png <file> --out <file>.png` for each of the three.
    //   3. Decode each PNG (non-interlaced; zlib inflate; scanline filters 0-4 undone) to RGB: sips wrote the 1-bit BMP as 8-bit
    //      grey, the 24-bit BMP as 8-bit RGB and the 1-bit TIFF as 1-bit grey (a set bit expanded to 255).
    //   4. sha256 of the width x height x 3 RGB bytes, first 16 hex characters.
    // imm1295e.pdf carries the same five files byte for byte (checked by sha256), so the one set of hashes serves both forms.
    expect(hashes).toEqual({ '1147x279': 'd6ca426a1d92a23a', '41x36': 'cff9e41d415c43ed', '113x150': '7ad35fb98d035e61' });
  });

  it('a second pass reuses the decodes: the same resource bytes, the same ids', async () => {
    const { draws, boxes } = await laidOut(file);
    const ctx = createImageContext();
    for (const node of draws) ctx.draw(boxes.get(node) as LayoutBox);
    const first = ctx.resources;
    ctx.startPass();
    for (const node of draws) ctx.draw(boxes.get(node) as LayoutBox);
    expect(ctx.resources.map((r) => r.id)).toEqual(first.map((r) => r.id));
    ctx.resources.forEach((r, i) => expect(r.bytes).toBe(first[i]?.bytes));
  });
});
