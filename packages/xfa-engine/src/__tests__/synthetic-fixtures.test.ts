import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderTreeSchema, RENDER_TREE_VERSION, WIDGET_KINDS, type RenderItem, type RenderTree } from '../layout/render-tree.js';
import { createFormRuntime } from '../runtime/runtime.js';
import { packFormDescriptorSchema } from '../runtime/pack.js';
import { openXfaPdf } from '../xfa-pdf.js';
import { buildSyntheticPdf, SYNTHETIC_HOST, SYNTHETIC_NOW, SYNTHETIC_PACK, syntheticDatasets, syntheticTemplate } from './fixtures/synthetic-form.js';

/**
 * The synthetic, content-neutral fixtures (W02-T12, plan decision D6) that the frontend is built against, committed under
 * `packages/xfa-engine/fixtures/synthetic/`:
 *   synthetic-form.pdf          the form (`fixtures/synthetic-form.ts`; XFA template and datasets, no font program)
 *   synthetic-form.pack.json    its Pack descriptor (the nodes of the Validate flow)
 *   synthetic-form.render-tree.json   `runtime.layout()` right after `load()`, with the fixed host identity and clock below.
 *       Every `Uint8Array` of the tree's resources is written `{ "$bytesBase64": "..." }` (the generic fallback font has no
 *       bytes, the one image holds its decoded pixels); `decodeTree` turns them back.
 *
 * This test rebuilds all three from the builder and compares them byte for byte with the committed files. It rewrites them only
 * when `UPDATE_SYNTHETIC_FIXTURES=1` is set. The builder is test-only TypeScript excluded from `dist`, which is why the
 * generator is a test.
 */
const DIR = new URL('../../fixtures/synthetic/', import.meta.url);
const FILES = { pdf: 'synthetic-form.pdf', pack: 'synthetic-form.pack.json', tree: 'synthetic-form.render-tree.json' } as const;
const UPDATE = process.env.UPDATE_SYNTHETIC_FIXTURES === '1';

const encodeBytes = (_key: string, value: unknown): unknown => (value instanceof Uint8Array ? { $bytesBase64: Buffer.from(value).toString('base64') } : value);
const decodeBytes = (_key: string, value: unknown): unknown => {
  if (typeof value === 'object' && value !== null && '$bytesBase64' in value && typeof value.$bytesBase64 === 'string') return new Uint8Array(Buffer.from(value.$bytesBase64, 'base64'));
  return value;
};
const encodeTree = (tree: RenderTree): string => `${JSON.stringify(tree, encodeBytes, 1)}\n`;
const decodeTree = (json: string): unknown => JSON.parse(json, decodeBytes);

async function runtimeOf(pdfBytes: Uint8Array) {
  const runtime = await createFormRuntime(await openXfaPdf(pdfBytes), { host: SYNTHETIC_HOST, clock: { now: () => SYNTHETIC_NOW }, strict: true });
  runtime.load();
  return runtime;
}

async function generated(): Promise<Record<keyof typeof FILES, Uint8Array>> {
  const pdf = buildSyntheticPdf();
  const runtime = await runtimeOf(pdf);
  const tree = runtime.layout();
  runtime.dispose();
  return {
    pdf,
    pack: new TextEncoder().encode(`${JSON.stringify(packFormDescriptorSchema.parse(SYNTHETIC_PACK), null, 1)}\n`),
    tree: new TextEncoder().encode(encodeTree(tree)),
  };
}

const itemsOf = (tree: RenderTree): RenderItem[] => tree.pages.flatMap((page) => page.items);
const kindsOf = (tree: RenderTree): Set<string> => new Set(itemsOf(tree).map((item) => item.kind));

describe('the committed synthetic fixtures', () => {
  it('regenerate byte for byte (and are rewritten only with UPDATE_SYNTHETIC_FIXTURES=1)', async () => {
    const made = await generated();
    const again = await generated();
    for (const key of Object.keys(FILES) as (keyof typeof FILES)[]) expect(Buffer.from(again[key]).equals(Buffer.from(made[key])), `${FILES[key]} differs between two builds`).toBe(true);
    if (UPDATE) {
      mkdirSync(DIR, { recursive: true });
      for (const key of Object.keys(FILES) as (keyof typeof FILES)[]) writeFileSync(new URL(FILES[key], DIR), made[key]);
    }
    for (const key of Object.keys(FILES) as (keyof typeof FILES)[]) {
      const url = new URL(FILES[key], DIR);
      expect(existsSync(url), `${FILES[key]} is not committed: run with UPDATE_SYNTHETIC_FIXTURES=1`).toBe(true);
      expect(Buffer.from(made[key]).equals(readFileSync(url)), `${FILES[key]} is out of date: run with UPDATE_SYNTHETIC_FIXTURES=1 and review the diff`).toBe(true);
    }
  });

  it('name no real form, country, regulator or product: a denylist over every committed file and the packets of the PDF', async () => {
    // Whole words, as the gate treats them; the base64 payloads (one token) cannot match a word.
    const denied = [
      /\b(?:IMM|IRCC|CRS|LMIA|PNP|RCIC|CICC|USCIS|UKVI|MARA|SkillSelect|EB-[1-5]|H-1B)\d*\b/,
      /\b(?:Canada|Canadian|Ontario|Quebec|Alberta|Australia|Australian|India|Indian|America|American|Britain|British|England|Germany|France|China|Mexico|Philippines|Nigeria)\b/i,
      /\b(?:immigration|visa|passport|citizenship|permit|asylum|refugee|sponsor|work permit|study permit|express entry|government|ministry|home office|department of)\b/i,
      /\b(?:Adobe|Acrobat|Myriad|LiveCycle|Designer)\b/i,
    ];
    const pdf = await openXfaPdf(readFileSync(new URL(FILES.pdf, DIR)));
    const texts: Record<string, string> = {
      'the template packet': pdf.packet('template').text(),
      'the datasets packet': pdf.packet('datasets').text(),
      [FILES.pack]: readFileSync(new URL(FILES.pack, DIR), 'utf8'),
      [FILES.tree]: readFileSync(new URL(FILES.tree, DIR), 'utf8'),
      'the template builder': syntheticTemplate(),
      'the datasets builder': syntheticDatasets(),
    };
    for (const [where, text] of Object.entries(texts)) for (const pattern of denied) expect(text.match(pattern)?.[0], `${where} matches ${pattern}`).toBeUndefined();
    // The PDF is built from nothing but the two packets and the structure around them.
    expect(pdf.packets.map((p) => p.name)).toEqual(['template', 'datasets']);
  });

  it('the committed render tree passes renderTreeSchema, is version 2, and survives a structured clone', () => {
    const tree = renderTreeSchema.parse(decodeTree(readFileSync(new URL(FILES.tree, DIR), 'utf8')));
    expect(tree.version).toBe(RENDER_TREE_VERSION);
    expect(renderTreeSchema.parse(structuredClone(tree))).toEqual(tree);
  });

  it('the committed Pack descriptor is the builder\'s and a valid descriptor', () => {
    expect(packFormDescriptorSchema.parse(JSON.parse(readFileSync(new URL(FILES.pack, DIR), 'utf8')))).toEqual(SYNTHETIC_PACK);
  });
});

describe('what the synthetic form covers', () => {
  it('has at least two pages, with the page numbers its master pages draw from xfa.layout, every item kind, and the generic fallback font', () => {
    const tree = renderTreeSchema.parse(decodeTree(readFileSync(new URL(FILES.tree, DIR), 'utf8')));
    expect(tree.pages.length).toBeGreaterThanOrEqual(2);
    const lines = (page: RenderTree['pages'][number]): string[] =>
      page.items.flatMap((item) => (item.kind === 'text' ? item.lines.map((line) => line.runs.map((run) => run.text).join('')) : []));
    expect(tree.pages.map((page) => lines(page).filter((line) => line.startsWith('PAGE')))).toEqual([['PAGE 1 OF 3'], ['PAGE 2 OF 3'], ['PAGE 3 OF 3']]);
    expect(kindsOf(tree)).toEqual(new Set(['box', 'text', 'line', 'image', 'field']));
    expect(tree.resources.fonts.map((font) => font.id)).toEqual(['fallback:Courier']);
    expect(tree.resources.images).toHaveLength(1);
    expect(tree.issues).toEqual([{ som: 'xfa[0].form[0].form1[0].Intro[0].Blurb[0]', feature: 'font.Courier' }]);
  });

  it('draws every widget kind but the barcode, which waits for the form\'s own Validate', () => {
    const tree = renderTreeSchema.parse(decodeTree(readFileSync(new URL(FILES.tree, DIR), 'utf8')));
    const widgets = new Set(itemsOf(tree).flatMap((item) => (item.kind === 'field' ? [item.widget] : [])));
    expect(widgets).toEqual(new Set(WIDGET_KINDS.filter((kind) => kind !== 'barcode')));
  });

  it('runs the Validate flow of its Pack descriptor: incomplete, then complete with the barcode field drawn as a placeholder', async () => {
    const runtime = await runtimeOf(buildSyntheticPdf());
    const first = runtime.validate(SYNTHETIC_PACK);
    expect(first).toMatchObject({ complete: false, flag: 'No', barcodesPresence: 'hidden' });
    expect(first.firstMissingField).toBe('xfa[0].form[0].form1[0].Details[0].Name[0]');
    expect(first.messages.map((m) => m.text)).toEqual(['Name is required']);
    expect(itemsOf(runtime.layout()).some((item) => item.kind === 'placeholder' && item.reason === 'barcode')).toBe(false);
    runtime.setValue('Details.Name', 'Test Person');
    const second = runtime.validate(SYNTHETIC_PACK);
    expect(second).toMatchObject({ complete: true, flag: 'Yes', firstMissingField: null, barcodesPresence: 'visible' });
    const tree = renderTreeSchema.parse(runtime.layout());
    expect(itemsOf(tree).filter((item) => item.kind === 'placeholder' && item.reason === 'barcode')).toHaveLength(1);
    expect(itemsOf(tree).some((item) => item.kind === 'field' && item.widget === 'barcode')).toBe(true);
    expect(runtime.encodeBarcodes(SYNTHETIC_PACK).payloads).toEqual(['SAMPLE|Test Person']);
    runtime.dispose();
  });

  it('a click on its message-box button records one choice box, answered by the host\'s injected answer', async () => {
    const runtime = await runtimeOf(buildSyntheticPdf());
    runtime.event('Summary.AskBtn', 'click');
    expect(runtime.messages.map((m) => [m.text, m.icon, m.buttons])).toEqual([['Continue?', 2, 1]]);
    runtime.dispose();
  });
});
