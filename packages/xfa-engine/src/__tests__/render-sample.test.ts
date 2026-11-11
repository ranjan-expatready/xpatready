import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dashArrayOf } from '../layout/graphics/stroke.js';
import { renderTreeSchema, type RenderItem, type RenderTree } from '../layout/render-tree.js';
import { esc, imageDataUrl, isDumpFile, outDirAllowed, renderDump, renderIndexHtml, renderPageHtml } from '../../scripts/lib/render-html.mjs';
import { NEUTRAL_HOST, realLocation, repoRootOf } from '../../scripts/lib/sample-common.mjs';
import { assertDistFresh } from './dist-fresh.js';

/**
 * The static render dump (W02-T13): the pure HTML writer (`scripts/lib/render-html.mjs`) on the committed synthetic tree, and
 * the tool (`scripts/render-sample.mjs`) end to end on the committed synthetic PDF. Structure is asserted by counts and order,
 * never by time.
 */
const PACKAGE = fileURLToPath(new URL('../../', import.meta.url));
const hasGitAncestor = repoRootOf(PACKAGE) !== null;
const decodeBytes = (_key: string, value: unknown): unknown => {
  if (typeof value === 'object' && value !== null && '$bytesBase64' in value && typeof value.$bytesBase64 === 'string') return new Uint8Array(Buffer.from(value.$bytesBase64, 'base64'));
  return value;
};
const tree: RenderTree = renderTreeSchema.parse(JSON.parse(readFileSync(join(PACKAGE, 'fixtures/synthetic/synthetic-form.render-tree.json'), 'utf8'), decodeBytes));
const options = { dashArrayOf, args: { 'input pdf': 'synthetic-form.pdf' } };
const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1;
const kindCount = (items: readonly RenderItem[], kind: RenderItem['kind']): number => items.filter((item) => item.kind === kind).length;

describe('render dump of the synthetic tree', () => {
  const files = renderDump(tree, options);

  it('writes one file per page plus the index', () => {
    expect(files.map((f) => f.file)).toEqual(['page-01.html', 'page-02.html', 'page-03.html', 'index.html']);
    expect(tree.pages).toHaveLength(3);
  });

  it('draws every text item, field item and image item once, at the page size in points', () => {
    tree.pages.forEach((page, i) => {
      const html = files[i]!.html;
      expect(count(html, 'class="t"')).toBe(kindCount(page.items, 'text'));
      expect(count(html, 'class="f"')).toBe(kindCount(page.items, 'field'));
      expect(count(html, 'class="im"')).toBe(kindCount(page.items, 'image'));
      expect(count(html, 'class="ln"')).toBe(kindCount(page.items, 'line'));
      expect(html).toContain(`width:${page.widthPt}pt;height:${page.heightPt}pt`);
    });
  });

  it('tags each field with its widget kind and SOM and keeps the dash pattern of a dashed line', () => {
    const fields = tree.pages.flatMap((page) => page.items.filter((item) => item.kind === 'field'));
    expect(fields.length).toBeGreaterThan(0);
    const all = files.map((f) => f.html).join('\n');
    for (const field of fields) expect(all).toContain(`data-som="${esc(field.som)}"`);
    expect(all).toContain('data-widget="textEdit"');
    expect(all).toContain('title="textEdit | ');
    const dashed = tree.pages.flatMap((page) => page.items).find((item) => item.kind === 'line' && item.stroke === 'dashed');
    expect(dashed).toBeDefined();
    expect(all).toContain(`stroke-dasharray="${dashArrayOf('dashed', dashed!.kind === 'line' ? dashed!.thicknessPt : 1).join(' ')}"`);
  });

  it('is self-contained: no network reference, no script, a CSP that allows only inline style and data URLs', () => {
    for (const { html } of files) {
      expect(html).not.toMatch(/https?:/i);
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toMatch(/<link\b/i);
      expect(html).not.toMatch(/\son[a-z]+=/i);
      expect(html).toContain('default-src &#39;none&#39;');
    }
    expect(files[0]!.html).toContain('href="data:image/png;base64,iVBORw0KGgo');
  });

  it('draws the generic fallback font by its family, with no @font-face', () => {
    expect(files[0]!.html).not.toContain('@font-face');
    expect(files[0]!.html).toContain('font-family="Courier, monospace"');
  });

  it('lists pages, counts, issues and the arguments on the index', () => {
    const index = files[3]!.html;
    expect(count(index, '<a href="page-')).toBe(3);
    expect(index).toContain(`<strong>${tree.pages.length}</strong> page(s)`);
    expect(index).toContain('font.Courier');
    expect(index).toContain('synthetic-form.pdf');
  });

  it('paints items in array order, drawing and field layers alike', () => {
    const base = tree.pages[0]!;
    const marked = (som: string): RenderItem => ({ kind: 'field', som, widget: 'textEdit', rect: { xPt: 1, yPt: 1, widthPt: 5, heightPt: 5 }, contentRect: { xPt: 1, yPt: 1, widthPt: 5, heightPt: 5 }, access: 'open', presence: 'visible', value: '' });
    const text = (word: string): RenderItem => ({ kind: 'text', rect: { xPt: 0, yPt: 0, widthPt: 10, heightPt: 10 }, lines: [{ xPt: 0, yBaselinePt: 8, runs: [{ text: word, fontId: tree.resources.fonts[0]!.id, sizePt: 8, colour: [0, 0, 0] }] }] });
    const ordered: RenderTree = { ...tree, pages: [{ ...base, items: [text('FIRSTWORD'), marked('A.B'), text('SECONDWORD'), marked('C.D')] }], issues: [] };
    const html = renderPageHtml(ordered, 0, options);
    const at = ['FIRSTWORD', 'data-som="A.B"', 'SECONDWORD', 'data-som="C.D"'].map((needle) => html.indexOf(needle));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });
});

const r3 = (n: number): string => String(Math.round(n * 1000) / 1000);
const textItemsOf = (page: RenderTree['pages'][number]) => page.items.filter((item): item is Extract<RenderItem, { kind: 'text' }> => item.kind === 'text');

describe('placement is exact (T13-F3)', () => {
  const files = renderDump(tree, options);
  const page0 = tree.pages[0]!;
  const html0 = files[0]!.html;

  it('writes the first text line at the tree x and baseline', () => {
    const line = textItemsOf(page0)[0]!.lines[0]!;
    expect(line.xPt).toBe(10);
    expect(html0).toContain(`<text xml:space="preserve" x="${r3(line.xPt)}" y="${r3(line.yBaselinePt)}">`);
  });

  it('writes the first box as the tree path and fill', () => {
    const box = page0.items.find((item) => item.kind === 'box')!;
    expect(box.kind === 'box' && box.rect).toEqual({ xPt: 170, yPt: 101, widthPt: 60, heightPt: 30 });
    expect(html0).toContain('<path class="b" d="M170 101H230V131H170V101Z" fill="rgb(200,220,240)"/>');
  });

  it('writes the first field at its rect in points', () => {
    const page = tree.pages[1]!;
    const field = page.items.find((item) => item.kind === 'field')!;
    expect(field.kind === 'field' && field.rect).toEqual({ xPt: 10, yPt: 40, widthPt: 260, heightPt: 18 });
    expect(files[1]!.html).toContain('style="left:10pt;top:40pt;width:260pt;height:18pt"');
  });

  it('draws a box (bx) and a placeholder (ph) once each per tree item', () => {
    tree.pages.forEach((page, i) => {
      expect(count(files[i]!.html, 'class="bx"')).toBe(kindCount(page.items, 'box'));
      expect(count(files[i]!.html, 'class="ph"')).toBe(kindCount(page.items, 'placeholder'));
    });
    expect(count(html0, 'class="bx"')).toBe(1);
  });

  it('defines a clip path per text item and points each text group at its own through --c', () => {
    tree.pages.forEach((page, i) => {
      const html = files[i]!.html;
      const texts = textItemsOf(page);
      expect(count(html, '<clipPath id=')).toBe(texts.length);
      const ids = [...html.matchAll(/<clipPath id="([^"]+)">/g)].map((m) => m[1]!);
      expect(new Set(ids).size).toBe(texts.length);
      for (const id of ids) expect(html).toContain(`<g class="t" style="--c:url(#${id})">`);
    });
    const first = textItemsOf(page0)[0]!.rect;
    expect(html0).toContain(`<rect x="${r3(first.xPt)}" y="${r3(first.yPt)}" width="${r3(first.widthPt)}" height="${r3(first.heightPt)}"/></clipPath>`);
  });
});

describe('the clip is a CSS toggle, off by default (T13-F2)', () => {
  const html = files0();
  function files0(): string {
    return renderDump(tree, options)[0]!.html;
  }

  it('has a #clip checkbox that is not checked, and a label for it', () => {
    expect(html).toMatch(/<input type="checkbox" id="clip" hidden>/);
    expect(html).not.toMatch(/id="clip"[^>]*checked/);
    expect(html).toContain('for="clip"');
    expect(html).toContain('Clip text to its box');
  });

  it('applies the clip only when #clip is checked, so unchecked text is drawn in full', () => {
    expect(html).toContain('#clip:checked~.page .t{clip-path:var(--c)}');
    expect(html).not.toMatch(/clip-path="/);
    expect(html).not.toMatch(/(^|\n)\.t\{/);
  });

  it('explains the toggle on the index page', () => {
    expect(renderDump(tree, options).at(-1)!.html).toContain('Clip text to its box');
  });
});

describe('spaces in text are kept (T13-F1)', () => {
  const spaced: RenderItem = { kind: 'text', rect: { xPt: 0, yPt: 0, widthPt: 100, heightPt: 20 }, lines: [{ xPt: 5, yBaselinePt: 8, runs: [{ text: '   X  Y', fontId: tree.resources.fonts[0]!.id, sizePt: 8, colour: [0, 0, 0] }] }] };
  const html = renderPageHtml({ ...tree, pages: [{ ...tree.pages[0]!, items: [spaced] }], issues: [] }, 0, options);

  it('marks every text element xml:space="preserve" and keeps the run text verbatim', () => {
    expect(html).toContain('>   X  Y</tspan>');
    expect(count(html, '<text ')).toBe(count(html, '<text xml:space="preserve" '));
  });

  it('carries the white-space:pre rule for SVG text in the page style', () => {
    expect(html).toContain('.page>svg text{white-space:pre}');
  });

  it('also preserves the text of a placeholder', () => {
    const ph: RenderItem = { kind: 'placeholder', rect: { xPt: 1, yPt: 1, widthPt: 50, heightPt: 20 }, reason: 'a  b' };
    const out = renderPageHtml({ ...tree, pages: [{ ...tree.pages[0]!, items: [ph] }], issues: [] }, 0, options);
    expect(out).toContain('<text xml:space="preserve" ');
  });
});

describe('text beyond its box is listed on the index (T13-F2)', () => {
  const region = { xPt: 0, yPt: 0, widthPt: 100, heightPt: 10 };
  const run = { text: 'W', fontId: tree.resources.fonts[0]!.id, sizePt: 8, colour: [0, 0, 0] as [number, number, number] };
  const inside: RenderItem = { kind: 'text', rect: region, lines: [{ xPt: 2, yBaselinePt: 8, runs: [run] }] };
  const below: RenderItem = { kind: 'text', rect: region, lines: [{ xPt: 2, yBaselinePt: 8, runs: [run] }, { xPt: 2, yBaselinePt: 40, runs: [run] }] };
  const left: RenderItem = { kind: 'text', rect: region, lines: [{ xPt: -6, yBaselinePt: 8, runs: [run] }] };
  const index = renderIndexHtml({ ...tree, pages: [{ ...tree.pages[0]!, items: [inside, below, left] }], issues: [] }, {});

  it('counts text items with a line outside their rect, per page', () => {
    expect(index).toContain('<th>Text outside its box</th>');
    expect(index).toContain('<td>0</td><td>2</td><td>(none)</td>');
  });
});

describe('dump files and real locations', () => {
  it('knows which names are a previous dump', () => {
    expect(['page-01.html', 'page-12.html', 'index.html'].every(isDumpFile)).toBe(true);
    expect(['notes.txt', 'page-x.html', 'index.htm', 'page-01.html.bak'].some(isDumpFile)).toBe(false);
  });

  it('keeps one neutral host identity', () => {
    expect(NEUTRAL_HOST.appType).toBe('xfa-engine');
  });

  it('resolves a not-yet-existing path under a symlink through the link (T13-F6)', () => {
    const base = realpathSync(mkdtempSync(join(tmpdir(), 'xfa-real-')));
    try {
      const target = join(base, 'target');
      mkdirSync(target);
      const link = join(base, 'link');
      symlinkSync(target, link);
      const absent = join(link, 'not', 'yet', 'here');
      expect(realLocation(absent)).toBe(join(target, 'not', 'yet', 'here'));
      expect(realLocation(link)).toBe(target);
      expect(realLocation(join(base, 'plain', 'x'))).toBe(join(base, 'plain', 'x'));
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('hostile text stays inert', () => {
  const hostile = '<script>alert(1)</script>"\'&<img src=x onerror=alert(1)>';
  const base = tree.pages[0]!;
  const items: RenderItem[] = [
    { kind: 'text', rect: { xPt: 0, yPt: 0, widthPt: 10, heightPt: 10 }, lines: [{ xPt: 0, yBaselinePt: 8, runs: [{ text: hostile, fontId: tree.resources.fonts[0]!.id, sizePt: 8, colour: [0, 0, 0] }] }] },
    { kind: 'field', som: hostile, widget: 'textEdit', rect: { xPt: 1, yPt: 1, widthPt: 5, heightPt: 5 }, contentRect: { xPt: 1, yPt: 1, widthPt: 5, heightPt: 5 }, access: 'open', presence: 'visible', value: hostile },
    { kind: 'placeholder', rect: { xPt: 1, yPt: 1, widthPt: 5, heightPt: 5 }, reason: hostile },
  ];
  const evil: RenderTree = { ...tree, pages: [{ ...base, items }], issues: [{ som: hostile, feature: hostile }] };

  it('escapes text runs, field attributes, placeholder reasons, issues and arguments', () => {
    const outputs = renderDump(evil, { dashArrayOf, args: { [hostile]: hostile } }).map((f) => f.html);
    for (const html of outputs) {
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toContain('<img');
      expect(html).not.toContain('"\'&<');
    }
    expect(outputs[0]).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(outputs[1]).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('replaces control characters HTML cannot carry', () => {
    expect(esc('a\u0000b\u001fc')).toBe('a�b�c');
  });
});

describe('image data URLs', () => {
  it('encodes decoded pixels as a PNG and passes a JPEG through', () => {
    const png = imageDataUrl({ id: 'i', format: 'rgba', widthPx: 1, heightPx: 1, bytes: new Uint8Array([1, 2, 3, 255]) });
    expect(png.startsWith('data:image/png;base64,iVBORw0KGgo')).toBe(true);
    const jpeg = imageDataUrl({ id: 'j', format: 'jpeg', widthPx: 1, heightPx: 1, bytes: new Uint8Array([0xff, 0xd8, 0xff]) });
    expect(jpeg).toBe('data:image/jpeg;base64,/9j/');
  });
  it('index page lists zero issues as none', () => {
    expect(renderIndexHtml({ ...tree, issues: [] }, {})).toContain('<p>None.</p>');
  });
});

describe('output directory policy', () => {
  const root = '/work/repo';
  it('allows a directory outside the repository and one under .superpowers/xfa-render', () => {
    expect(outDirAllowed('/tmp/out', root)).toBe(true);
    expect(outDirAllowed('/work/repo-other/out', root)).toBe(true);
    expect(outDirAllowed('/work/repo/.superpowers/xfa-render/a/blank', root)).toBe(true);
    expect(outDirAllowed('/tmp/out', null)).toBe(true);
  });
  it('refuses every other path inside the repository', () => {
    expect(outDirAllowed('/work/repo', root)).toBe(false);
    expect(outDirAllowed('/work/repo/out', root)).toBe(false);
    expect(outDirAllowed('/work/repo/.superpowers/xfa-render', root)).toBe(false);
    expect(outDirAllowed('/work/repo/.superpowers/other', root)).toBe(false);
    expect(outDirAllowed('/work/repo/packages/xfa-engine/dump', root)).toBe(false);
  });
});

// The tool imports the built package (`dist`): a missing or stale build FAILS these (the package test script builds first), never skips them.
describe('sample:render end to end (needs the built package)', () => {
  beforeAll(() => assertDistFresh('dist/index.js'));
  const temp = realpathSync(mkdtempSync(join(tmpdir(), 'xfa-render-')));
  afterAll(() => rmSync(temp, { recursive: true, force: true }));
  const pdf = join(PACKAGE, 'fixtures/synthetic/synthetic-form.pdf');
  const pack = join(PACKAGE, 'fixtures/synthetic/synthetic-form.pack.json');
  const run = (...args: string[]) => spawnSync(process.execPath, [join(PACKAGE, 'scripts/render-sample.mjs'), ...args], { encoding: 'utf8', timeout: 120_000 });

  it('writes the blank form, one file per page, into a directory outside the repository', () => {
    const out = join(temp, 'blank');
    const result = run(pdf, out, '--clock', '2026-06-15T12:00:00Z');
    expect(result.status, result.stderr).toBe(0);
    expect(readdirSync(out).sort()).toEqual(['index.html', 'page-01.html', 'page-02.html', 'page-03.html']);
    expect(readFileSync(join(out, 'index.html'), 'utf8')).toContain('(none: form as opened)');
  });

  it('writes the fixture value into the page and records a Validate run', () => {
    const fixture = join(temp, 'fixture.json');
    writeFileSync(fixture, JSON.stringify({ 'Details.Name': 'Zed Fictitious' }));
    const out = join(temp, 'validated');
    const result = run(pdf, out, '--fixture', fixture, '--pack', pack, '--validate', '--tz', 'UTC', '--clock', '2026-06-15T12:00:00Z');
    expect(result.status, result.stderr).toBe(0);
    const all = readdirSync(out).map((name) => readFileSync(join(out, name), 'utf8')).join('\n');
    expect(all).toContain('Zed Fictitious');
    expect(readFileSync(join(out, 'index.html'), 'utf8')).toMatch(/validate<\/th><td>(complete|NOT complete)/);
  });

  it('replaces the files of an earlier run in the same directory', () => {
    const out = join(temp, 'blank');
    writeFileSync(join(out, 'page-09.html'), 'stale');
    expect(run(pdf, out, '--clock', '2026-06-15T12:00:00Z').status).toBe(0);
    expect(readdirSync(out)).not.toContain('page-09.html');
  });

  it('refuses a non-empty directory that holds other files unless --force is given (T13-F5)', () => {
    const out = join(temp, 'foreign');
    mkdirSync(out);
    writeFileSync(join(out, 'notes.txt'), 'keep me');
    writeFileSync(join(out, 'page-01.html'), 'old');
    const refused = run(pdf, out, '--clock', '2026-06-15T12:00:00Z');
    expect(refused.status).toBe(2);
    expect(refused.stderr).toContain('--force');
    expect(readFileSync(join(out, 'notes.txt'), 'utf8')).toBe('keep me');
    expect(readFileSync(join(out, 'page-01.html'), 'utf8')).toBe('old');
    expect(run(pdf, out, '--clock', '2026-06-15T12:00:00Z', '--force').status).toBe(0);
    expect(readFileSync(join(out, 'notes.txt'), 'utf8')).toBe('keep me');
    expect(readFileSync(join(out, 'page-01.html'), 'utf8')).toContain('<!doctype html>');
  });

  it('refuses a Validate without a pack, a lone host option and a bad clock (exit 2)', () => {
    expect(run(pdf, join(temp, 'x'), '--validate').status).toBe(2);
    expect(run(pdf, join(temp, 'x'), '--host-name', 'Only').status).toBe(2);
    expect(run(pdf, join(temp, 'x'), '--clock', 'yesterday').status).toBe(2);
  });

  // The tool finds the repository by a `.git` ancestor; the policy itself is proven by the pure `outDirAllowed` tests.
  it.skipIf(!hasGitAncestor)('refuses a directory inside the repository (exit 2)', () => {
    expect(run(pdf, join(PACKAGE, 'dump-should-not-exist')).status).toBe(2);
    expect(existsSync(join(PACKAGE, 'dump-should-not-exist'))).toBe(false);
  });
});
