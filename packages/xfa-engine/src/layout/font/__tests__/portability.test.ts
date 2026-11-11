import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { loadFonts } from '../catalogue.js';
import { measure } from '../measure.js';
import { createFontResolver } from '../resolve.js';
import { parseFontMetrics } from '../sfnt.js';
import { cmapFormat4, syntheticFont } from './build-sfnt.js';

const here = new URL('../', import.meta.url);

describe('the font layer runs in a browser worker (A4)', () => {
  it('no source file of the layer imports a node module or names Buffer, a canvas, the DOM or process', () => {
    const sources = readdirSync(here).filter((f) => f.endsWith('.ts'));
    expect(sources.length).toBeGreaterThanOrEqual(8);
    for (const file of sources) {
      const code = readFileSync(new URL(file, here), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code, file).not.toMatch(/from\s+['"]node:|require\(|\bBuffer\b|\b[Cc]anvas\b|OffscreenCanvas|\bdocument\b|\bprocess\b|\bwindow\b/);
    }
  });

  it('parses, resolves and measures with Buffer, process and the DOM hidden', () => {
    vi.stubGlobal('Buffer', undefined);
    vi.stubGlobal('process', undefined);
    try {
      const program = syntheticFont({ advances: [500, 600], cmap: cmapFormat4({ 65: 1 }) });
      const { faces } = loadFonts([{ fontId: 'font:A', resourceName: 'A', baseFont: 'A', flags: 32, program, programKind: 'opentype' }]);
      const resolved = createFontResolver(faces, ['A']).resolve('A', 'normal', 'normal');
      expect(measure('AA', resolved.metrics, 10).widthPt).toBe(12);
      expect(parseFontMetrics(program).advance(65)).toBe(600);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
