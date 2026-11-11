import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadFonts } from '../../layout/font/catalogue.js';
import type { EmbeddedFont } from '../../layout/font/embedded.js';
import { measure } from '../../layout/font/measure.js';
import { createFontResolver, DEFAULT_TYPEFACE } from '../../layout/font/resolve.js';
import { readRenderCache } from '../../layout/render-cache.js';
import { attrWithDefault, loadTemplate, type TemplateModel } from '../../model/template/index.js';
import { must } from '../../model/template/__tests__/helpers.js';
import { openXfaPdf, type XfaPdf } from '../../xfa-pdf.js';

// Set by scripts/run-corpus.mjs (absolute path). Running this file directly without it must fail loudly.
const dir = process.env.XFA_CORPUS_DIR;
if (dir === undefined || dir === '') throw new Error('NOT EXECUTED: XFA_CORPUS_DIR is not set; run via `pnpm test:corpus`');

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
if (files.length === 0) throw new Error(`NOT EXECUTED: no *.pdf files in ${dir}`);

/** Embedded program resource names per known corpus file (planner discovery 2026-10-18; the spike's object numbers, W01-T02). */
const EXPECTED: Readonly<Record<string, readonly string[]>> = {
  'imm1295e.pdf': ['CourierStd', 'CourierStd-Bold', 'MyriadPro-Bold', 'MyriadPro-It', 'MyriadPro-Regular'],
  'imm5257e.pdf': ['CourierNewPSMT', 'CourierStd', 'CourierStd-Bold', 'MyriadPro-Bold', 'MyriadPro-It', 'MyriadPro-Regular'],
};

/** The renderCache oracle's run widths agree with the sum of `hmtx` advances to 5 millipoints (W01-T02 Q4); the oracle is whole millipoints, so 0.0055 only absorbs float noise. */
const RUN_TOLERANCE_PT = 0.0055;

/** Design units per `hmtx` advance of "A", "B", "C" in MyriadPro-Regular, read independently from the extracted program (Python, W01-T03 2026-10-18). */
const MYRIAD_REGULAR_ABC = [612, 542, 580];

interface Opened {
  readonly pdf: XfaPdf;
  readonly fonts: readonly EmbeddedFont[];
  readonly model: TemplateModel;
}

async function open(file: string): Promise<Opened> {
  const pdf = await openXfaPdf(new Uint8Array(readFileSync(join(dir ?? '', file))));
  return { pdf, fonts: (await pdf.fonts()).fonts, model: loadTemplate(pdf.packet('template').text()) };
}

const typefacesOf = (model: TemplateModel): string[] =>
  model.nodes.filter((n) => n.className === 'font').map((n) => attrWithDefault(n, 'typeface') ?? DEFAULT_TYPEFACE);

/** WinAnsi code -> Unicode, for the codes the standard defines (0x7F, 0x81, 0x8D, 0x8F, 0x90, 0x9D are undefined; 0xAD is the soft hyphen, where Myriad's /Widths and hmtx differ, W01-T02 Q2). */
function winAnsiChar(code: number): string | undefined {
  if ([0x7f, 0x81, 0x8d, 0x8f, 0x90, 0x9d, 0xad].includes(code)) return undefined;
  return new TextDecoder('windows-1252').decode(Uint8Array.of(code));
}

for (const file of files) {
  describe(`embedded fonts of ${file}`, () => {
    it('lists the embedded programs of the known forms, each parsed as an sfnt (A1)', async () => {
      const { fonts } = await open(file);
      const expected = EXPECTED[file];
      if (expected !== undefined) expect(fonts.map((f) => f.resourceName)).toEqual(expected);
      const started = performance.now();
      const { faces, issues } = loadFonts(fonts);
      expect(issues).toEqual([]);
      expect(faces).toHaveLength(fonts.length);
      console.info(`[fonts] ${file}: ${faces.length} programs parsed in ${(performance.now() - started).toFixed(1)} ms (measured, not asserted)`);
      expect(new Set(fonts.map((f) => f.fontId)).size, 'fontIds are unique').toBe(fonts.length);
    });

    it('/Widths agrees with the hmtx advances for every WinAnsi code (A1: T02 tolerance, half a unit in a thousand)', async () => {
      const { fonts } = await open(file);
      const { faces } = loadFonts(fonts);
      let compared = 0;
      faces.forEach((face, i) => {
        const font = must(fonts[i]);
        const widths = font.widths;
        if (widths === undefined) return;
        for (let code = 32; code <= 255; code++) {
          const ch = winAnsiChar(code);
          const width = widths[code - (font.firstChar ?? 0)];
          if (ch === undefined || width === undefined) continue;
          const advance = must(face.metrics.advance(ch.codePointAt(0) ?? 0), `${font.resourceName} maps ${code} ${ch.codePointAt(0)}`);
          expect(Math.abs((advance * 1000) / face.metrics.unitsPerEm - width), `${font.resourceName} code ${code}`).toBeLessThanOrEqual(0.5);
          compared += 1;
        }
      });
      expect(compared).toBeGreaterThan(500);
    });

    it('resolves the template typefaces: Myriad Pro by weight and posture, the default to Courier Std, Courier New to its own program (A2)', async () => {
      const { fonts, model } = await open(file);
      const { faces } = loadFonts(fonts);
      const resolver = createFontResolver(faces, typefacesOf(model));
      expect(resolver.resolve('Myriad Pro', 'normal', 'normal').fontId).toBe('font:MyriadPro-Regular');
      expect(resolver.resolve('Myriad Pro', 'bold', 'normal').fontId).toBe('font:MyriadPro-Bold');
      expect(resolver.resolve('Myriad Pro', 'normal', 'italic').fontId).toBe('font:MyriadPro-It');
      expect(resolver.resolve(undefined, 'normal', 'normal').fontId).toBe('font:CourierStd');
      expect(resolver.resolve(undefined, 'bold', 'normal').fontId).toBe('font:CourierStd-Bold');
      expect(resolver.issues()).toEqual([]);
      const courierNew = resolver.resolve('Courier New', 'normal', 'normal');
      if (fonts.some((f) => f.resourceName === 'CourierNewPSMT')) {
        expect(courierNew.fontId).toBe('font:CourierNewPSMT');
        expect(resolver.issues()).toEqual([]);
      } else {
        expect(courierNew.fontId, 'not embedded: the embedded Courier face stands in, so the render tree has a font resource for it (SF-5)').toBe('font:CourierStd');
        expect(resolver.issues()).toEqual(['font.Courier New (Courier Std used)']);
      }
      const unknown = resolver.resolve('No Such Typeface', 'normal', 'normal');
      expect(unknown.fontId, 'the most-used embedded typeface of the template').toBe('font:MyriadPro-Regular');
      expect(resolver.resolve('no such typeface', 'bold', 'normal').fontId).toBe('font:MyriadPro-Bold');
      expect(resolver.issues().filter((i) => i === 'font.No Such Typeface')).toHaveLength(1);
    });

    it('every typeface the template names resolves to an embedded program (the two real forms need no fallback)', async () => {
      const { fonts, model } = await open(file);
      const resolver = createFontResolver(loadFonts(fonts).faces, typefacesOf(model));
      const used = new Set(model.nodes.filter((n) => n.className === 'font').map((n) => `${attrWithDefault(n, 'typeface') ?? DEFAULT_TYPEFACE}|${attrWithDefault(n, 'weight')}`));
      for (const key of used) {
        const [typeface, weight] = key.split('|');
        resolver.resolve(typeface, weight === 'bold' ? 'bold' : 'normal', 'normal');
      }
      expect(resolver.issues()).toEqual([]);
    });
  });
}

const REGULAR = 'imm1295e.pdf';
describe('measurement against the corpus', () => {
  it('measure("ABC", MyriadPro-Regular, 10) is the sum of the hmtx advances x 10 / unitsPerEm (A1)', async () => {
    const file = files.includes(REGULAR) ? REGULAR : must(files[0]);
    const { fonts } = await open(file);
    const { faces } = loadFonts(fonts);
    const face = must(faces.find((f) => f.fontId === 'font:MyriadPro-Regular'));
    const sum = MYRIAD_REGULAR_ABC.reduce((a, b) => a + b, 0);
    expect(measure('ABC', face.metrics, 10).widthPt).toBe((sum * 10) / face.metrics.unitsPerEm);
    expect(measure('ABC', face.metrics, 10).widthPt).toBeCloseTo(17.34, 10);
    expect([...'ABC'].map((c) => face.metrics.advance(c.charCodeAt(0)))).toEqual(MYRIAD_REGULAR_ABC);
    const widths = must(fonts.find((f) => f.resourceName === 'MyriadPro-Regular')?.widths);
    expect(measure('ABC', face.metrics, 10).widthPt).toBeCloseTo(([...'ABC'].reduce((acc, c) => acc + must(widths[c.charCodeAt(0)]), 0) * 10) / 1000, 1);
    expect(face.metrics.ascent + face.metrics.descent + face.metrics.lineGap).toBe(1200);
  });

  it('Courier Std has one long metric for 382 glyphs, and still answers every character with 600', async () => {
    const { fonts } = await open(REGULAR);
    const courier = must(loadFonts(fonts).faces.find((f) => f.fontId === 'font:CourierStd'));
    expect(courier.metrics.glyphCount).toBe(382);
    expect(courier.metrics.advance('W'.charCodeAt(0))).toBe(600);
    expect(courier.metrics.advance(0xe9)).toBe(600);
  });

  for (const file of files) {
    it(`${file}: the width of every run followed by another on its line equals the distance to the next run, within 5 millipoints (renderCache oracle)`, async () => {
      const { fonts, model } = await open(file);
      const resolver = createFontResolver(loadFonts(fonts).faces, typefacesOf(model));
      let pairs = 0;
      let worst = 0;
      for (const node of model.nodes.filter((n) => n.renderCache.length > 0)) {
        const runs = readRenderCache(node.renderCache).textRuns;
        for (let i = 0; i + 1 < runs.length; i++) {
          const run = must(runs[i]);
          const next = must(runs[i + 1]);
          // A run that is only a space and sits apart from its neighbour is a positioned spacer (the mixed-font script-message draw
          // places three of them at fixed offsets), not a measured width; every other adjacent pair on a baseline is a width.
          if (Math.abs(run.baselineYPt - next.baselineYPt) > 0.001 || next.xPt <= run.xPt || run.text.trim() === '') continue;
          const font = resolver.resolve(run.typeface, run.bold ? 'bold' : 'normal', 'normal');
          const residual = Math.abs(next.xPt - run.xPt - measure(run.text, font.metrics, run.sizePt).widthPt);
          worst = Math.max(worst, residual);
          pairs += 1;
        }
      }
      expect(pairs).toBeGreaterThanOrEqual(5);
      expect(worst).toBeLessThanOrEqual(RUN_TOLERANCE_PT);
    });
  }
});
