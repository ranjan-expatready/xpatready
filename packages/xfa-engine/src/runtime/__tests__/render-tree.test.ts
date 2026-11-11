import { describe, expect, it } from 'vitest';
import { createImageContext } from '../../layout/image/index.js';
import { buildBmp, toBase64 } from '../../layout/image/__tests__/build-images.js';
import { block, PAGE_SET } from '../../layout/paginate/__tests__/helpers.js';
import { renderTreeSchema, type RenderItem, type RenderTree } from '../../layout/render-tree.js';
import { buildRenderTree } from '../../layout/tree/index.js';
import { RenderTreeCache } from '../render-tree-cache.js';
import { XfaRuntimeError } from '../errors.js';
import { layoutAccessOf } from '../layout-access.js';
import { MAX_LAYOUT_PASSES } from '../limits.js';
import type { FormRuntime } from '../options.js';
import { loaded, makeRuntime, onEvent, thrown } from './helpers.js';

/** `runtime.layout()` (W02-T12) on small synthetic forms: what is in the tree, in which order, and what is built when. */
const kindsOf = (items: readonly RenderItem[]): string[] => items.map((item) => item.kind);
const texts = (items: readonly RenderItem[]): string[] =>
  items.flatMap((item) => (item.kind === 'text' ? [item.lines.map((line) => line.runs.map((run) => run.text).join('')).join('\n')] : []));
const itemsOf = (tree: RenderTree, page = 0): RenderItem[] => tree.pages[page]?.items ?? [];
const parsed = (tree: RenderTree): RenderTree => renderTreeSchema.parse(tree);
async function form(body: string, extra: Parameters<typeof makeRuntime>[1] = {}): Promise<FormRuntime> {
  return loaded(body, { rootAttrs: 'layout="tb"', ...extra });
}

describe('layout(): the runtime state', () => {
  it('needs load() first, answers after it, and is refused once the runtime is disposed', async () => {
    const runtime = await makeRuntime(block('d', 10));
    expect(thrown(() => runtime.layout())).toMatchObject({ code: 'NOT_LOADED' });
    runtime.load();
    expect(parsed(runtime.layout()).pages).toHaveLength(1);
    runtime.dispose();
    expect(thrown(() => runtime.layout())).toBeInstanceOf(XfaRuntimeError);
    expect(thrown(() => runtime.layout())).toMatchObject({ code: 'DISPOSED' });
  });
});

describe('layout(): caching and laziness', () => {
  it('answers the same object until a write, builds one tree for a batch of writes, and builds again after the next write', async () => {
    const runtime = await form(`<field name="a" w="100pt" h="20pt"><ui><textEdit/></ui></field>`);
    const access = layoutAccessOf(runtime);
    const first = runtime.layout();
    expect(runtime.layout()).toBe(first);
    expect(access.treeBuilds).toBe(1);
    const settles = access.settles;
    for (let i = 0; i < 100; i += 1) runtime.setValue('a', `v${i}`);
    expect(access.treeBuilds).toBe(1);
    const second = runtime.layout();
    expect(second).not.toBe(first);
    expect(access.settles).toBe(settles + 1);
    expect(access.treeBuilds).toBe(2);
    expect(texts(itemsOf(second))).toEqual(['v99']);
    expect(runtime.layout()).toBe(second);
    // A write of the value already there is no change: nothing is laid out or built again.
    runtime.setValue('a', 'v99');
    expect(runtime.layout()).toBe(second);
    expect(access.treeBuilds).toBe(2);
  });

  it('a form still changing at the pass ceiling is a normal tree whose issues say so', async () => {
    const blink = `<field name="blink" w="30pt" h="10pt"><ui><textEdit/></ui></field><field name="flip" presence="hidden"><ui><textEdit/></ui>${onEvent('ready', 'blink.presence = blink.presence == "visible" ? "hidden" : "visible";', ' ref="$layout"')}</field>`;
    const runtime = await form(blink);
    expect(layoutAccessOf(runtime).layout().settled).toBe(false);
    const tree = parsed(runtime.layout());
    expect(tree.issues.map((i) => i.feature)).toContain(`the ready:$layout scripts still changed the form after ${MAX_LAYOUT_PASSES} layout passes (the last layout stands)`);
  });
});

describe('layout(): the items of a page', () => {
  it('a box paints its graphics, then its text (value, then caption), then its field overlay', async () => {
    const field = `<field name="f" x="10pt" y="10pt" w="150pt" h="20pt"><ui><textEdit><border><edge thickness="0.5pt"/></border></textEdit></ui><caption placement="left" reserve="40pt"><value><text>Cap</text></value></caption><value><text>hello</text></value></field>`;
    const tree = parsed((await form(`<subform name="p" layout="position" w="200pt" h="60pt">${field}</subform>`)).layout());
    const items = itemsOf(tree);
    expect(kindsOf(items)).toEqual(['line', 'line', 'line', 'line', 'text', 'text', 'field']);
    expect(texts(items)).toEqual(['hello', 'Cap']);
    const overlay = items[6];
    expect(overlay).toMatchObject({ kind: 'field', widget: 'textEdit', value: 'hello', access: 'open', presence: 'visible', multiLine: false, ariaLabel: 'Cap' });
    const page = tree.pages[0];
    for (const item of items) {
      if (item.kind === 'line') continue;
      expect(item.rect.xPt, item.kind).toBeGreaterThanOrEqual(0);
      expect(item.rect.yPt, item.kind).toBeGreaterThanOrEqual(0);
      expect(item.rect.xPt + item.rect.widthPt, item.kind).toBeLessThanOrEqual(page?.widthPt ?? 0);
      expect(item.rect.yPt + item.rect.heightPt, item.kind).toBeLessThanOrEqual(page?.heightPt ?? 0);
    }
  });

  it('an image comes after its box graphics and before its text, and the image is a resource of the tree once however often it is used', async () => {
    const bmp = toBase64(buildBmp({ width: 2, height: 2, bitsPerPixel: 24, rows: [[255, 0, 0, 255, 255, 255, 0, 0], [0, 0, 255, 0, 255, 0, 0, 0]] }));
    const picture = (name: string): string => `<draw name="${name}" w="40pt" h="40pt"><value><image contentType="image/bmp">${bmp}</image></value><border><edge thickness="0.5pt"/></border></draw>`;
    const tree = parsed((await form(`<subform name="p" layout="tb" w="100pt">${picture('one')}${picture('two')}</subform>`)).layout());
    expect(kindsOf(itemsOf(tree))).toEqual(['line', 'line', 'line', 'line', 'image', 'line', 'line', 'line', 'line', 'image']);
    expect(tree.resources.images).toHaveLength(1);
    expect(tree.resources.images[0]).toMatchObject({ format: 'rgba', widthPx: 2, heightPx: 2 });
  });

  it('the resource bytes are the same array after an edit: shared with the engine cache (never detach them), not copied', async () => {
    const bmp = toBase64(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows: [[1, 2, 3, 0]] }));
    const runtime = await form(`<field name="a" w="50pt" h="20pt"><ui><textEdit/></ui></field><draw name="pic" w="40pt" h="40pt"><value><image contentType="image/bmp">${bmp}</image></value></draw>`);
    const before = runtime.layout().resources.images[0]?.bytes;
    runtime.setValue('a', 'edit');
    const after = runtime.layout().resources.images[0]?.bytes;
    expect(before).toBeDefined();
    expect(after).toBe(before);
    expect(before?.byteLength).toBe(4);
  });

  it('releasing the tree cache drops the tree and the decoded images, and the cache can build again', async () => {
    const bmp = toBase64(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows: [[1, 2, 3, 0]] }));
    const runtime = await form(`<draw name="pic" w="40pt" h="40pt"><value><image contentType="image/bmp">${bmp}</image></value></draw>`);
    const laid = layoutAccessOf(runtime).layout();
    const cache = new RenderTreeCache({ faces: [], issues: [] });
    const tree = cache.of(laid);
    expect(tree.resources.images).toHaveLength(1);
    expect(cache.cachedImages).toBe(1);
    cache.release();
    expect(cache.cachedImages).toBe(0);
    expect(cache.of(laid)).not.toBe(tree);
    expect(cache.builds).toBe(2);
  });

  it('each tree is one image pass: an image the form no longer shows leaves the resources, and what the last pass reported is not reported again', async () => {
    const bmp = toBase64(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows: [[9, 9, 9, 0]] }));
    const body =
      `<draw name="good" w="40pt" h="40pt"><value><image contentType="image/bmp">${bmp}</image></value></draw>` +
      `<draw name="bad" w="40pt" h="40pt"><value><image contentType="image/bmp">not an image</image></value></draw>` +
      `<field name="hide" w="10pt" h="10pt"><ui><button/></ui>${onEvent('click', 'good.presence = "hidden";')}</field>`;
    const runtime = await form(body);
    const first = runtime.layout();
    expect(first.resources.images).toHaveLength(1);
    expect(first.issues.filter((issue) => issue.feature.startsWith('image '))).toHaveLength(1);
    runtime.event('hide', 'click');
    const second = parsed(runtime.layout());
    expect(second.resources.images).toEqual([]);
    expect(itemsOf(second).filter((item) => item.kind === 'image')).toEqual([]);
    expect(second.issues.filter((issue) => issue.feature.startsWith('image '))).toHaveLength(1);
  });

  it('the master page of an instance comes first, and each page has its own page numbers', async () => {
    const counter = (name: string, id: string, expression: string): string => `<field name="${name}" id="${id}" presence="hidden"><ui><numericEdit/></ui>${onEvent('ready', `this.rawValue = ${expression};`, ' ref="$layout"')}</field>`;
    const embed = (id: string): string => `<span xfa:embedType="uri" xfa:embedMode="raw" xfa:embed="#${id}"></span>`;
    const area = (name: string, suffix: string, occur: string): string => {
      const draw = `<draw name="N" x="0pt" y="2pt" w="150pt" h="12pt"><value><exData contentType="text/html"><body xmlns="http://www.w3.org/1999/xhtml" xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><p>P${embed(`cur${suffix}`)}/${embed(`tot${suffix}`)}</p></body></exData></value></draw>`;
      return `<pageArea name="${name}" id="p${suffix}"><contentArea x="0pt" y="20pt" w="200pt" h="100pt"/><medium short="220pt" long="300pt"/>${occur}${counter(`Cur${suffix}`, `cur${suffix}`, 'xfa.layout.page(this)')}${counter(`Tot${suffix}`, `tot${suffix}`, 'xfa.layout.pageCount()')}${draw}</pageArea>`;
    };
    const set = `<pageSet>${area('First', 'A', '<occur min="1" max="1"/>')}${area('Rest', 'B', '')}</pageSet>`;
    const part = (n: number): string => `<subform name="part${n}" layout="tb" w="100pt">${n > 1 ? '<breakBefore targetType="pageArea" startNew="1"/>' : ''}${block(`b${n}`, 20, '', `<value><text>body ${n}</text></value>`)}</subform>`;
    const tree = parsed((await form(set + part(1) + part(2) + part(3))).layout());
    expect(tree.pages.map((page) => texts(page.items))).toEqual([['P1/3', 'body 1'], ['P2/3', 'body 2'], ['P3/3', 'body 3']]);
  });
});

describe('layout(): a container cut across pages', () => {
  const group = (caption: string): string => `<exclGroup name="g" layout="tb" w="100pt">${caption}${[1, 2, 3].map((i) => block(`r${i}`, 40)).join('')}</exclGroup>`;
  const cap = (placement: string, text: string): string => `<caption placement="${placement}" reserve="12pt"><value><text>${text}</text></value></caption>`;

  it('a top caption is drawn once, on the first fragment, at its strip', async () => {
    const tree = parsed((await form(PAGE_SET + group(cap('top', 'QTOP')))).layout());
    expect(tree.pages).toHaveLength(2);
    expect(texts(itemsOf(tree, 0))).toEqual(['QTOP']);
    expect(texts(itemsOf(tree, 1))).toEqual([]);
    const text = itemsOf(tree, 0).find((item) => item.kind === 'text');
    expect(text).toMatchObject({ rect: { xPt: 10, yPt: 20, heightPt: 12 } });
  });

  it('a bottom caption is drawn once, on the last fragment, below its children (placed from the fragment, not from the unsplit box)', async () => {
    const tree = parsed((await form(PAGE_SET + group(cap('bottom', 'QBOT')))).layout());
    expect(texts(itemsOf(tree, 0))).toEqual([]);
    expect(texts(itemsOf(tree, 1))).toEqual(['QBOT']);
    const text = itemsOf(tree, 1).find((item) => item.kind === 'text');
    expect(text).toMatchObject({ rect: { xPt: 5, yPt: 55, heightPt: 12 } });
    expect(text?.kind === 'text' ? text.lines[0]?.yBaselinePt : 0).toBeGreaterThan(55);
    expect(text?.kind === 'text' ? text.lines[0]?.yBaselinePt : 0).toBeLessThan(67);
  });
});

describe('layout(): fonts', () => {
  it('a document with no font programs has one generic fallback resource, and every run names it (the tree is schema valid)', async () => {
    const draw = `<draw name="d" w="150pt" h="20pt"><font typeface="Wombat" size="12pt"/><value><text>Typed in an unknown face</text></value></draw>`;
    const tree = parsed((await form(draw)).layout());
    expect(tree.resources.fonts).toEqual([{ id: 'fallback:Courier', family: 'Courier', weight: 'normal', posture: 'normal', format: 'truetype', bytes: new Uint8Array(0) }]);
    const runs = itemsOf(tree).flatMap((item) => (item.kind === 'text' ? item.lines.flatMap((line) => line.runs) : []));
    expect(runs.length).toBeGreaterThan(0);
    expect(new Set(runs.map((run) => run.fontId))).toEqual(new Set(['fallback:Courier']));
    expect(tree.issues.map((issue) => issue.feature)).toContain('font.Wombat');
  });

  it('a form with no text has no font resource', async () => {
    expect(parsed((await form(block('d', 10))).layout()).resources.fonts).toEqual([]);
  });

  it('the document font issues reach the tree issues (a hostile default-resources entry costs the faces, not the form)', async () => {
    const runtime = await form(`<draw name="d" w="100pt" h="20pt"><value><text>t</text></value></draw>`, { acroFormExtra: '/DR 5' });
    const tree = parsed(runtime.layout());
    expect(tree.issues.some((issue) => issue.feature.startsWith('font.resources.unreadable.') && issue.som === '')).toBe(true);
    expect(layoutAccessOf(runtime).fontIssues.length).toBeGreaterThan(0);
  });
});

describe('layout(): the item ceiling of a page', () => {
  it('a page past the ceiling is cut with one issue naming the box, and the other pages and the whole tree stay valid', async () => {
    const part = (n: number): string => `<subform name="part${n}" layout="tb" w="100pt">${n > 1 ? '<breakBefore targetType="pageArea" startNew="1"/>' : ''}${[1, 2, 3].map((i) => block(`b${n}_${i}`, 10, '', '<border><edge thickness="0.5pt"/></border>')).join('')}</subform>`;
    const runtime = await form(PAGE_SET + part(1) + part(2));
    const laid = layoutAccessOf(runtime).layout();
    // Each box paints four edges: 12 items a page; a ceiling of 10 stops page 1 and page 2 at 10, a ceiling of 12 stops neither.
    const input = { laid, faces: [], fontIssues: [], images: createImageContext() };
    const cut = renderTreeSchema.parse(buildRenderTree(input, { maxItemsPerPage: 10 }));
    expect(cut.pages.map((page) => page.items.length)).toEqual([10, 10]);
    expect(cut.issues.filter((issue) => issue.feature.includes('more than 10 items'))).toHaveLength(2);
    expect(cut.issues[0]?.feature).toMatch(/^page 1 has more than 10 items/);
    expect(cut.issues[0]?.som).toContain('part1');
    const whole = renderTreeSchema.parse(buildRenderTree(input, { maxItemsPerPage: 12 }));
    expect(whole.pages.map((page) => page.items.length)).toEqual([12, 12]);
    expect(whole.issues.filter((issue) => issue.feature.includes('items'))).toEqual([]);
  });

  it('refuses a ceiling that is not a whole number from 1 to the security invariant', async () => {
    const runtime = await form(block('d', 10));
    const input = { laid: layoutAccessOf(runtime).layout(), faces: [], fontIssues: [], images: createImageContext() };
    for (const bad of [0, -1, 1.5, Number.NaN, 50_001]) expect(thrown(() => buildRenderTree(input, { maxItemsPerPage: bad }))).toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});
