import { describe, expect, it } from 'vitest';
import type { LayoutBox } from '../../layout/box/types.js';
import type { LaidOutForm } from '../../layout/paginate/index.js';
import type { FormNode } from '../../model/form/index.js';
import { BODY_OPEN } from '../../layout/text/rich/__tests__/helpers.js';
import { XfaScriptError } from '../../script/index.js';
import { XfaRuntimeError } from '../errors.js';
import { layoutAccessOf } from '../layout-access.js';
import { MAX_LAYOUT_PASSES } from '../limits.js';
import type { FormRuntime } from '../options.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import { calc, makeRuntime, onEvent, thrown } from './helpers.js';

/**
 * Real `xfa.layout`, `ready:$layout` and per-page master values (W02-T09) on synthetic, fictitious forms: a cover page
 * area used once and a continuation page area used for every page after it, whose master pages draw `PAGE n OF m` through
 * `xfa:embed` of hidden fields that the form's own `ready:$layout` scripts fill from `xfa.layout`.
 */
const READY = ' ref="$layout"';
const hiddenCounter = (name: string, id: string, expression: string): string =>
  `<field name="${name}" id="${id}" presence="hidden"><ui><numericEdit/></ui>${onEvent('ready', `this.rawValue = ${expression};`, READY)}</field>`;
const embedOf = (id: string): string => `<span xfa:embedType="uri" xfa:embedMode="raw" xfa:embed="#${id}"></span>`;
const pagesDraw = (suffix: string): string =>
  `<draw name="Pages" x="0pt" y="5pt" w="200pt" h="12pt"><value><exData contentType="text/html">${BODY_OPEN}<p>PAGE<span style="xfa-spacerun:yes"> </span>${embedOf(`cur${suffix}`)} OF<span style="xfa-spacerun:yes"> </span>${embedOf(`tot${suffix}`)}</p></body></exData></value></draw>`;
const master = (name: string, suffix: string, attrs: string, extra = ''): string =>
  `<pageArea name="${name}" id="p${suffix}"><contentArea x="0pt" y="30pt" w="200pt" h="100pt"/><medium short="220pt" long="300pt"/>${attrs}${hiddenCounter(`Cur${suffix}`, `cur${suffix}`, 'xfa.layout.page(this)')}${hiddenCounter(`Tot${suffix}`, `tot${suffix}`, 'xfa.layout.pageCount()')}${pagesDraw(suffix)}${extra}</pageArea>`;
const PAGE_SET = (coverExtra = '', bodyExtra = ''): string => `<pageSet>${master('Cover', 'A', '<occur min="1" max="1"/>', coverExtra)}${master('Body', 'B', '', bodyExtra)}</pageSet>`;
/** A part of the form: a `tb` block of one fixed field; every part after the first starts a new page. */
const part = (n: number, inner = '', attrs = ''): string =>
  `<subform name="part${n}" layout="tb" w="100pt" ${attrs}>${n > 1 ? '<breakBefore targetType="pageArea" startNew="1"/>' : ''}<field name="note${n}" w="80pt" h="20pt"><ui><textEdit/></ui></field>${inner}</subform>`;
/** A log field of a fixed size, so that writing to it moves no box. */
const LOG = '<field name="log" w="100pt" h="10pt"><ui><textEdit/></ui></field>';
const append = (mark: string): string => `log.rawValue = (log.rawValue || "") + "${mark}";`;

async function form(body: string, options: Parameters<typeof makeRuntime>[1] = {}): Promise<FormRuntime> {
  const runtime = await makeRuntime(body, { rootAttrs: 'layout="tb"', ...options });
  runtime.load();
  return runtime;
}

const laidOf = (runtime: FormRuntime): LaidOutForm => layoutAccessOf(runtime).layout();
const textOf = (laid: LaidOutForm, page: number, name: string): string[] =>
  (laid.pages[page]?.master?.texts ?? []).filter((entry) => entry.box.node.name === name).map((entry) => (entry.value?.lines ?? []).map((line) => line.runs.map((run) => run.text).join('')).join('\n'));
const valuesOf = (laid: LaidOutForm, page: number): Record<string, unknown> =>
  Object.fromEntries([...(laid.masterValues[page] ?? new Map<FormNode, string | number | null>())].map(([node, value]) => [node.name, value]));
const flat = (boxes: readonly LayoutBox[]): LayoutBox[] => boxes.flatMap((box) => [box, ...flat(box.children)]);
const boxNamed = (laid: LaidOutForm, name: string): LayoutBox | undefined => laid.pages.flatMap((page) => page.contentAreas.flatMap((area) => flat(area.boxes))).find((box) => box.node.name === name);

describe('per-page master values', () => {
  it('each page instance of a master page draws its own page number, although the continuation pages share one page area', async () => {
    const runtime = await form(PAGE_SET() + part(1) + part(2) + part(3));
    const laid = laidOf(runtime);
    expect(laid.pages.map((p) => p.pageArea?.name)).toEqual(['Cover', 'Body', 'Body']);
    expect([0, 1, 2].map((i) => textOf(laid, i, 'Pages'))).toEqual([['PAGE 1 OF 3'], ['PAGE 2 OF 3'], ['PAGE 3 OF 3']]);
    // The fields hold the page as text: the template gives them no numeric value class (the oracle's float is a value class the template does not state).
    expect([0, 1, 2].map((i) => valuesOf(laid, i))).toEqual([
      { CurA: '1', TotA: '3' },
      { CurB: '2', TotB: '3' },
      { CurB: '3', TotB: '3' },
    ]);
    // Two instances of one page area have a master page each, not one shared layout.
    expect(laid.pages[1]?.master).not.toBe(laid.pages[2]?.master);
    expect(laid.pages[1]?.master?.pageArea).toBe(laid.pages[2]?.master?.pageArea);
  });

  it('the node-keyed text map holds the flow only: master text is per page, in pages[i].master', async () => {
    const laid = laidOf(await form(PAGE_SET() + part(1) + part(2)));
    expect([...laid.texts.keys()].map((n) => n.name)).not.toContain('Pages');
  });

  it('a form with no page set has one page and no master values; xfa.layout answers 1 / 1', async () => {
    const runtime = await form(`${LOG}<field name="where" w="100pt" h="10pt"><ui><textEdit/></ui>${onEvent('ready', 'this.rawValue = xfa.layout.page(this) + "/" + xfa.layout.pageCount();', READY)}</field>`);
    expect(runtime.getValue('where')).toBe('1/1');
    const laid = laidOf(runtime);
    expect(laid.pages).toHaveLength(1);
    expect(laid.masterValues).toEqual([new Map()]);
  });

  it('the master-page scripts run once per page instance, in page order: three pages, three runs, not one per pass and not one per page area', async () => {
    const mark = (m: string): string => onEvent('ready', append(m), READY);
    const field = (suffix: string, m: string): string => `<field name="Mark${suffix}" presence="hidden"><ui><textEdit/></ui>${mark(m)}</field>`;
    const runtime = await form(LOG + PAGE_SET(field('A', 'C'), field('B', 'B')) + part(1) + part(2) + part(3));
    expect(runtime.getValue('log')).toBe('CBB');
    expect(laidOf(runtime).passes).toBe(1);
  });
});

describe('xfa.layout from a form script', () => {
  const asker = (script: string): string => `<field name="where" w="100pt" h="10pt"><ui><textEdit/></ui>${script}</field>`;

  it('page(node) is the page of the first box of the node, pageCount() the number of pages; a hidden node has no box and is page 0', async () => {
    const hidden = '<subform name="gone" presence="hidden" layout="tb" w="10pt"><field name="g" w="5pt" h="5pt"><ui><textEdit/></ui></field></subform>';
    const script = onEvent('ready', 'this.rawValue = [xfa.layout.page(part3.note3), xfa.layout.page(part2), xfa.layout.page(note1), xfa.layout.page(gone), xfa.layout.pageCount()].join("/");', READY);
    const runtime = await form(PAGE_SET() + hidden + part(1, asker(script)) + part(2) + part(3));
    expect(runtime.getValue('part1.where')).toBe('3/2/1/0/3');
  });

  it('before the first layout (initialize, calculate, ready of the form) there are no pages: page() and pageCount() are 0', async () => {
    const runtime = await form(PAGE_SET() + part(1, asker(onEvent('initialize', 'this.rawValue = xfa.layout.page(this) + "/" + xfa.layout.pageCount();'))));
    expect(runtime.getValue('part1.where')).toBe('0/0');
  });

  it('a script can catch the error for a call that is not a form node; the run goes on', async () => {
    const script = onEvent('ready', 'var seen = []; try { xfa.layout.page("x"); } catch (e) { seen.push("string"); } try { xfa.layout.page(); } catch (e) { seen.push("none"); } this.rawValue = seen.join(",");', READY);
    const runtime = await form(PAGE_SET() + part(1, asker(script)));
    expect(runtime.getValue('part1.where')).toBe('string,none');
    expect(runtime.state).toBe('loaded');
  });

  it('every other xfa.layout member stays unsupported: strict mode makes it fatal, lenient mode records it', async () => {
    const script = onEvent('ready', 'xfa.layout.relayout();', READY);
    const strict = await makeRuntime(PAGE_SET() + part(1, asker(script)), { rootAttrs: 'layout="tb"' });
    const error = thrown(() => strict.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('UNSUPPORTED_MEMBER');
    expect((error as XfaScriptError).member).toBe('layout.relayout');
    const probe = onEvent('ready', 'this.rawValue = typeof xfa.layout.relayout;', READY);
    const lenient = await makeRuntime(PAGE_SET() + part(1, asker(probe)), { rootAttrs: 'layout="tb"', options: { strict: false } });
    lenient.load();
    expect(lenient.getValue('part1.where')).toBe('undefined');
    expect(lenient.unsupported).toContainEqual({ class: 'layout', member: 'relayout' });
  });
});

describe('re-layout follows the form', () => {
  const grower = (extra = ''): string => `<field name="grow" w="50pt" ${extra}><ui><textEdit multiLine="1"/></ui></field>`;
  const after = '<draw name="after" w="40pt" h="10pt"/>';

  it('a value that makes a growable field taller moves what follows it, in the next layout()', async () => {
    const runtime = await form(PAGE_SET() + part(1, grower() + after));
    const y0 = boxNamed(laidOf(runtime), 'after')?.rect.yPt ?? Number.NaN;
    runtime.setValue('part1.grow', 'aaaa bbbb cccc dddd');
    const y1 = boxNamed(laidOf(runtime), 'after')?.rect.yPt ?? Number.NaN;
    expect(y1).toBeGreaterThan(y0);
    runtime.setValue('part1.grow', null);
    expect(boxNamed(laidOf(runtime), 'after')?.rect.yPt).toBe(y0);
  });

  it('a presence written by a script takes the box out of the flow and gives its room to what follows', async () => {
    const hide = `<field name="hide" w="10pt" h="10pt"><ui><textEdit/></ui>${onEvent('click', 'grow.presence = "hidden";')}</field>`;
    const runtime = await form(PAGE_SET() + part(1, grower('h="30pt"') + after + hide));
    const before = boxNamed(laidOf(runtime), 'after')?.rect.yPt ?? Number.NaN;
    runtime.event('part1.hide', 'click');
    const laid = laidOf(runtime);
    expect(boxNamed(laid, 'after')?.rect.yPt).toBe(before - 30);
    expect(boxNamed(laid, 'grow')).toBeUndefined();
  });

  it('a call that writes nothing is not a re-layout: the layout is the same object at the same revision; a write of the value already there is the same', async () => {
    const runtime = await form(PAGE_SET() + part(1, grower() + after));
    const access = layoutAccessOf(runtime);
    runtime.setValue('part1.grow', 'one');
    const first = access.layout();
    const revision = access.dom.revision;
    runtime.setValue('part1.grow', 'one');
    runtime.getValue('part1.grow');
    runtime.children('part1');
    expect(access.dom.revision).toBe(revision);
    expect(access.layout()).toBe(first);
    runtime.setValue('part1.grow', 'two');
    expect(access.dom.revision).toBeGreaterThan(revision);
    expect(access.layout()).not.toBe(first);
  });

  it('the page count and every page\'s numbers follow a change that adds a page', async () => {
    const toggle = `<field name="more" w="10pt" h="10pt"><ui><textEdit/></ui>${onEvent('click', 'part4.presence = "visible";')}</field>`;
    const runtime = await form(PAGE_SET() + part(1, toggle) + part(2) + part(3) + part(4, '', 'presence="hidden"'));
    expect([0, 1, 2].map((i) => textOf(laidOf(runtime), i, 'Pages')[0])).toEqual(['PAGE 1 OF 3', 'PAGE 2 OF 3', 'PAGE 3 OF 3']);
    runtime.event('part1.more', 'click');
    const laid = laidOf(runtime);
    expect(laid.pages).toHaveLength(4);
    expect([0, 1, 2, 3].map((i) => textOf(laid, i, 'Pages')[0])).toEqual(['PAGE 1 OF 4', 'PAGE 2 OF 4', 'PAGE 3 OF 4', 'PAGE 4 OF 4']);
    expect(laid.passes).toBe(1);
  });

  it('ready:$layout fires again after a change that moved a box, and not after one that moved nothing', async () => {
    // The script writes a long text into a growable field (the layout changes) and marks the log (a fixed field: nothing moves).
    const sizer = `<field name="sizer" presence="hidden"><ui><textEdit/></ui>${onEvent('ready', `${append('L')} grow.rawValue = "aaaa bbbb cccc dddd";`, READY)}</field>`;
    const runtime = await form(LOG + PAGE_SET() + part(1, grower() + sizer));
    // Pass 1: the script grew the field. Pass 2: it ran again, wrote what was there, marked the log, and nothing moved.
    expect(runtime.getValue('log')).toBe('LL');
    expect(laidOf(runtime).passes).toBe(2);
    expect(laidOf(runtime).settled).toBe(true);
    const plain = await form(LOG + PAGE_SET() + part(1, `<field name="mark" presence="hidden"><ui><textEdit/></ui>${onEvent('ready', append('L'), READY)}</field>`));
    expect(plain.getValue('log')).toBe('L');
    expect(laidOf(plain).passes).toBe(1);
  });

  it('a script that changes the layout on every run stops at the pass bound: the last layout stands, an issue says so, and the run goes on', async () => {
    const blink = `<field name="blink" w="30pt" h="10pt"><ui><textEdit/></ui></field><field name="flip" presence="hidden"><ui><textEdit/></ui>${onEvent('ready', `${append('L')} blink.presence = blink.presence == "visible" ? "hidden" : "visible";`, READY)}</field>`;
    const runtime = await form(LOG + PAGE_SET() + part(1, blink));
    expect(runtime.getValue('log')).toBe('L'.repeat(MAX_LAYOUT_PASSES));
    const laid = laidOf(runtime);
    expect(laid.passes).toBe(MAX_LAYOUT_PASSES);
    expect(laid.settled).toBe(false);
    expect(laid.issues.map((i) => i.feature)).toContain(`the ready:$layout scripts still changed the form after ${MAX_LAYOUT_PASSES} layout passes (the last layout stands)`);
    expect(runtime.state).toBe('loaded');
    // Nothing written since: asking again repeats nothing.
    expect(laidOf(runtime)).toBe(laid);
    expect(runtime.getValue('log')).toBe('L'.repeat(MAX_LAYOUT_PASSES));
    // A later write starts a new settle, bounded the same way.
    runtime.setValue('part1.note1', 'again');
    laidOf(runtime);
    expect(String(runtime.getValue('log')).length).toBeLessThanOrEqual(2 * MAX_LAYOUT_PASSES);
    expect(laidOf(runtime).passes).toBeLessThanOrEqual(MAX_LAYOUT_PASSES);
  });

  it('the pass bound is tightened by the maxLayoutPasses limit and cannot be raised', async () => {
    const blink = `<field name="blink" w="30pt" h="10pt"><ui><textEdit/></ui></field><field name="flip" presence="hidden"><ui><textEdit/></ui>${onEvent('ready', `${append('L')} blink.presence = blink.presence == "visible" ? "hidden" : "visible";`, READY)}</field>`;
    const runtime = await form(LOG + PAGE_SET() + part(1, blink), { options: { limits: { maxLayoutPasses: 2 } } });
    expect(runtime.getValue('log')).toBe('LL');
    const raised = await makeRuntime(LOG, { rootAttrs: 'layout="tb"', options: { limits: { maxLayoutPasses: MAX_LAYOUT_PASSES + 1 } } }).catch((e: unknown) => e);
    expect(raised).toMatchObject({ code: 'INVALID_OPTIONS' });
  });

  it('a master-page script that writes to the body asks for a layout, not for another run of every page: once per instance still', async () => {
    const touch = (m: string): string => `<field name="Touch${m}" presence="hidden"><ui><textEdit/></ui>${onEvent('ready', append(m), READY)}</field>`;
    const runtime = await form(LOG + PAGE_SET(touch('C'), touch('B')) + part(1) + part(2) + part(3));
    expect(runtime.getValue('log')).toBe('CBB');
    runtime.setValue('part1.note1', 'changed');
    laidOf(runtime);
    // The write makes the layout again (once, lazily), and the master scripts run once per page instance on it.
    expect(String(runtime.getValue('log'))).toBe('CBBCBB');
  });
});

describe('the layout is made lazily, with the same view for every script', () => {
  const grower = '<field name="grow" w="50pt"><ui><textEdit multiLine="1"/></ui></field>';
  const LONG = 'aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj';
  const ask = (script: string): string => `<field name="ask" w="10pt" h="10pt"><ui><textEdit/></ui>${script}</field>`;
  const countPages = 'this.rawValue = String(xfa.layout.pageCount());';

  it('a hundred writes and one layout() are one settle, and a write alone settles nothing', async () => {
    const runtime = await form(PAGE_SET() + part(1, grower));
    const access = layoutAccessOf(runtime);
    const base = access.settles;
    for (let i = 0; i < 100; i += 1) runtime.setValue('part1.note1', `value ${i}`);
    expect(access.settles).toBe(base);
    const laid = access.layout();
    expect(access.settles).toBe(base + 1);
    expect(laid.revision).toBe(access.dom.revision);
    access.layout();
    expect(access.settles).toBe(base + 1);
  });

  it('a script dispatched after a write sees the layout of that write: the page count a long text caused', async () => {
    const runtime = await form(PAGE_SET() + part(1, grower + ask(onEvent('click', countPages))));
    runtime.event('part1.ask', 'click');
    expect(runtime.getValue('part1.ask')).toBe('1');
    runtime.setValue('part1.grow', LONG);
    runtime.event('part1.ask', 'click');
    const pages = laidOf(runtime).pages.length;
    expect(pages).toBeGreaterThan(1);
    expect(runtime.getValue('part1.ask')).toBe(String(pages));
    // A broadcast is a dispatch too (Validate and the barcode encoding go through event and broadcast).
    runtime.setValue('part1.grow', null);
    const probe = await form(PAGE_SET() + part(1, grower + ask(onEvent('preSave', countPages))));
    probe.setValue('part1.grow', LONG);
    probe.broadcast('preSave');
    expect(probe.getValue('part1.ask')).toBe(String(pages));
  });

  it('the dispatch that follows a write also sees the ready:$layout side effects of that write, not the ones before it', async () => {
    const stamp = `<field name="stamp" presence="hidden"><ui><textEdit/></ui>${onEvent('ready', 'pc.rawValue = xfa.layout.pageCount();', READY)}</field>`;
    const runtime = await form(`<field name="pc" w="20pt" h="10pt"><ui><textEdit/></ui></field>${PAGE_SET()}${part(1, grower + stamp + ask(onEvent('click', 'this.rawValue = pc.rawValue;')))}`);
    runtime.setValue('part1.grow', LONG);
    runtime.event('part1.ask', 'click');
    expect(runtime.getValue('part1.ask')).toBe(String(laidOf(runtime).pages.length));
    expect(laidOf(runtime).pages.length).toBeGreaterThan(1);
  });

  it('save and the datasets read settle first: what the layout scripts wrote into the data is in the saved file', async () => {
    const stamp = `<field name="stamp" presence="hidden"><ui><textEdit/></ui>${onEvent('ready', 'pc.rawValue = xfa.layout.pageCount();', READY)}</field>`;
    const runtime = await form(`<field name="pc" w="20pt" h="10pt"><ui><textEdit/></ui></field>${PAGE_SET()}${part(1, grower + stamp)}`);
    expect(runtime.saveDatasets()).toContain('<pc>1</pc>');
    runtime.setValue('part1.grow', LONG);
    expect(runtime.saveDatasets()).toContain(`<pc>${laidOf(runtime).pages.length}</pc>`);
    expect(laidOf(runtime).pages.length).toBeGreaterThan(1);
    runtime.setValue('part1.grow', null);
    const bytes = await runtime.save();
    expect(runtime.saveDatasets()).toContain('<pc>1</pc>');
    expect((await openXfaPdf(bytes)).packet('datasets').text()).toContain('<pc>1</pc>');
    // The master-page values are the layout's, not form state: the form packet never carries them (`pageSet` is not packet state).
    expect(laidOf(runtime).masterValues[0]).toBeDefined();
  });
});

describe('the layout is current when load() returns', () => {
  it('a docReady handler that adds a page is laid out before load() returns, and its layout scripts are counted in the phase', async () => {
    const more = `<field name="more" w="10pt" h="10pt"><ui><textEdit/></ui>${onEvent('docReady', 'part3.presence = "visible";', ' ref="$host"')}</field>`;
    const runtime = await makeRuntime(PAGE_SET() + part(1, more) + part(2) + part(3, '', 'presence="hidden"'), { rootAttrs: 'layout="tb"' });
    const report = runtime.load();
    const access = layoutAccessOf(runtime);
    const settles = access.settles;
    const laid = access.layout();
    expect(access.settles).toBe(settles);
    expect(laid.pages).toHaveLength(3);
    expect([0, 1, 2].map((i) => textOf(laid, i, 'Pages')[0])).toEqual(['PAGE 1 OF 3', 'PAGE 2 OF 3', 'PAGE 3 OF 3']);
    // Two pages' scripts before docReady (2 x 2), three pages' after it (3 x 2).
    expect(report.byPhase['ready:$layout']).toBe(4 + 6);
    expect(report.scriptsRun).toBeGreaterThanOrEqual(10);
  });
});

describe('the calculates that read what a layout script wrote', () => {
  const src = (script: string): string => `<field name="src" w="20pt" h="10pt"><ui><textEdit/></ui><value><integer/></value>${script}</field>`;
  const dst = `<field name="dst" w="20pt" h="10pt"><ui><textEdit/></ui><value><integer/></value>${calc('src.rawValue * 2')}</field>`;

  it('settle again after the layout scripts have run, so the form shows the calculated value', async () => {
    const runtime = await form(src(onEvent('ready', 'this.rawValue = 5;', READY)) + dst + PAGE_SET() + part(1));
    expect(runtime.getValue('dst')).toBe(10);
  });

  it('a layout script and a calculate that keep feeding each other stop at the pass bound: flagged on the layout, the run goes on', async () => {
    const runtime = await form(src(onEvent('ready', 'this.rawValue = (this.rawValue || 0) + 1;', READY)) + dst + PAGE_SET() + part(1));
    expect(runtime.getValue('src')).toBe(MAX_LAYOUT_PASSES);
    const laid = laidOf(runtime);
    expect(laid.settled).toBe(false);
    expect(laid.issues.map((i) => i.feature)).toContain(`the ready:$layout scripts and the calculates they feed still changed the form after ${MAX_LAYOUT_PASSES} rounds (the last layout stands)`);
    expect(runtime.state).toBe('loaded');
    expect(runtime.getValue('dst')).toBe(MAX_LAYOUT_PASSES * 2);
    expect(laidOf(runtime)).toBe(laid);
  });
});

describe('fonts the engine refuses', () => {
  it('cost the layout its embedded faces and are listed; the form still loads, runs its scripts and lays out (before the layout, a runtime never read the fonts)', async () => {
    const runtime = await makeRuntime(PAGE_SET() + part(1) + part(2), { rootAttrs: 'layout="tb"', acroFormExtra: '/DR 5' });
    runtime.load();
    expect(layoutAccessOf(runtime).fontIssues).toEqual(['font.resources.unreadable.MALFORMED']);
    const laid = laidOf(runtime);
    expect(laid.pages).toHaveLength(2);
    expect([0, 1].map((i) => textOf(laid, i, 'Pages')[0])).toEqual(['PAGE 1 OF 2', 'PAGE 2 OF 2']);
    expect(runtime.state).toBe('loaded');
  });
});

describe('script budgets hold for the layout scripts', () => {
  it('a ready:$layout script is stopped by the per-run bridge-call budget, a typed SCRIPT_LIMIT, not a hang', async () => {
    const script = onEvent('ready', 'var n = 0; for (var i = 0; i < 5000; i += 1) { n += xfa.layout.pageCount(); } this.rawValue = n;', READY);
    const runtime = await makeRuntime(PAGE_SET() + part(1, `<field name="spin" w="10pt" h="10pt"><ui><textEdit/></ui>${script}</field>`), { rootAttrs: 'layout="tb"', options: { limits: { runBridgeCalls: 200 } } });
    const error = thrown(() => runtime.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'run-bridge-calls' });
    expect(runtime.state).toBe('aborted');
  });

  it('the layout scripts count against the whole-form bridge-call budget: one call fewer than a normal load needs ends the load with a typed limit', async () => {
    const normal = await makeRuntime(PAGE_SET() + part(1) + part(2) + part(3), { rootAttrs: 'layout="tb"' });
    const report = normal.load();
    // Three page instances, two master scripts each: the phase that ran them is counted.
    expect(report.byPhase['ready:$layout']).toBe(6);
    const tight = await makeRuntime(PAGE_SET() + part(1) + part(2) + part(3), { rootAttrs: 'layout="tb"', options: { limits: { formRunBridgeCalls: normal.usage.bridgeCalls - 1 } } });
    const error = thrown(() => tight.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'bridge-calls' });
  });
});

describe('the layout access', () => {
  it('belongs to runtimes made by createFormRuntime, needs a loaded form, and ends with the run', async () => {
    const runtime = await makeRuntime(PAGE_SET() + part(1), { rootAttrs: 'layout="tb"' });
    const access = layoutAccessOf(runtime);
    expect(thrown(() => access.layout())).toMatchObject({ code: 'NOT_LOADED' });
    runtime.load();
    expect(access.layout().pages).toHaveLength(1);
    expect(thrown(() => layoutAccessOf({} as never))).toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(thrown(() => layoutAccessOf({} as never))).toBeInstanceOf(XfaRuntimeError);
    runtime.dispose();
    expect(thrown(() => access.layout())).toMatchObject({ code: 'DISPOSED' });
  });
});
