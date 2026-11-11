import type { Element } from '@xmldom/xmldom';
import { afterEach, describe, expect, it } from 'vitest';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { datasetsXml } from '../../model/form/__tests__/helpers.js';
import { formChecksum } from '../../model/form-packet/checksum.js';
import { tpl } from '../../model/template/__tests__/helpers.js';
import { parseXml } from '../../xml/parse.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import type { FormRuntime } from '../options.js';
import { createFormRuntime } from '../runtime.js';
import { FIXED_CLOCK, NEUTRAL_HOST, onEvent, textField } from './helpers.js';

const open: FormRuntime[] = [];
afterEach(() => {
  for (const runtime of open.splice(0)) runtime.dispose();
});

const FORM_NS = 'http://www.xfa.org/schema/xfa-form/2.8/';
/** The restore loop the real forms run on docReady (restoreState is manual: the form's own script decides). */
const RESTORE = 'var oList = this.getDeltas(); for (i = 0; i < oList.length; i++) { oList.item(i).restore(); }';

const CLICK = [
  'Phone.NA.presence = "visible";',
  'Phone.Intl.presence = "hidden";',
  'Phone.NA.Area.mandatory = "error";',
  'Phone.NA.Area.access = "readOnly";',
  'Phone.NA.Area.caption.value.text.value = "*Area";',
  'Phone.NA.Area.border.fill.color.value = "1,2,3";',
  'List.clearItems(); List.addItem("One", "1"); List.addItem("Two", "2");',
  'flag.value = "true";',
  'Memo.rawValue = "kept in the form";',
].join('\n');

const body = (docReady: string): string =>
  [
    '<variables><text name="flag">false</text></variables>',
    '<subform name="Phone"><field name="Type"><ui><textEdit/></ui></field>',
    '<subform name="NA" presence="invisible"><field name="Area"><ui><textEdit/></ui><caption><value><text>Area</text></value></caption></field></subform>',
    `<subform name="Intl">${textField('Number')}</subform></subform>`,
    '<field name="List"><ui><choiceList/></ui><items><text>A</text></items></field>',
    '<field name="Memo"><ui><textEdit/></ui><bind match="none"/></field>',
    textField('Btn', onEvent('click', CLICK)),
    docReady === '' ? '' : onEvent('docReady', docReady, ' ref="$host"'),
  ].join('');

const DATA = '<form1><Phone><Type>02</Type><NA><Area/></NA><Intl><Number/></Intl></Phone><List/><Btn/></form1>';
const BLANK_FORM = `<form xmlns="${FORM_NS}"\n><subform name="form1"\n/></form\n>`;

/** `formPacket` null: a PDF without a form packet. */
function sourcePdf(docReady = RESTORE, formPacket: string | null = BLANK_FORM, data = DATA): Uint8Array {
  const packets = [packet('template', tpl(body(docReady))), packet('datasets', datasetsXml(data))];
  if (formPacket !== null) packets.push(packet('form', formPacket));
  packets.push(packet('</xdp:xdp>', '\n'));
  return buildXfaPdf({ packets });
}

async function runtimeOf(bytes: Uint8Array): Promise<FormRuntime> {
  const runtime = await createFormRuntime(await openXfaPdf(bytes), { host: NEUTRAL_HOST, clock: FIXED_CLOCK, strict: true });
  open.push(runtime);
  return runtime;
}

/** Loads the source form, clicks the button that changes the UI state, and saves. */
async function savedAfterClick(docReady = RESTORE): Promise<Uint8Array> {
  const runtime = await runtimeOf(sourcePdf(docReady));
  runtime.load();
  runtime.event('Btn', 'click');
  return runtime.save();
}

const elements = (parent: Element): Element[] => Array.from(parent.childNodes).filter((n): n is Element => n.nodeType === 1);
const child = (parent: Element, tag: string, name?: string): Element | undefined =>
  elements(parent).find((e) => e.localName === tag && (name === undefined || e.getAttribute('name') === name));
function walkTo(root: Element, path: readonly (readonly [string, string?])[]): Element {
  let at = root;
  for (const [tag, name] of path) {
    const next = child(at, tag, name);
    if (next === undefined) throw new Error(`no <${tag}${name === undefined ? '' : ` name="${name}"`}> under <${at.localName}>`);
    at = next;
  }
  return at;
}

describe('FormRuntime.save writes the UI state as the form packet', () => {
  it('replaces the datasets and form packets together, with a checksum over the template and the saved datasets', async () => {
    const source = sourcePdf();
    const saved = await savedAfterClick();
    const before = await openXfaPdf(source);
    const after = await openXfaPdf(saved);
    expect(saved.subarray(0, source.length)).toEqual(source);
    expect(after.packet('template').bytes).toEqual(before.packet('template').bytes);
    expect(after.packet('form').ref).toEqual(before.packet('form').ref);
    const root = parseXml(after.packet('form').text()).documentElement;
    expect(root?.localName).toBe('form');
    expect(root?.namespaceURI).toBe(FORM_NS);
    expect(root?.getAttribute('checksum')).toBe(formChecksum([after.packet('template').bytes, after.packet('datasets').bytes]));
  });

  it('holds the properties scripts set, in the template structure, with an instance manager before each subform and nothing else', async () => {
    const text = (await openXfaPdf(await savedAfterClick())).packet('form').text();
    const root = parseXml(text).documentElement;
    if (root === null) throw new Error('no root');
    const form1 = walkTo(root, [['subform', 'form1']]);
    const phone = walkTo(form1, [['subform', 'Phone']]);
    expect(elements(phone).map((e) => `${e.localName}:${e.getAttribute('name')}`)).toEqual(['instanceManager:_NA', 'subform:NA', 'instanceManager:_Intl', 'subform:Intl']);
    expect(walkTo(phone, [['subform', 'NA']]).getAttribute('presence')).toBe('visible');
    expect(walkTo(phone, [['subform', 'Intl']]).getAttribute('presence')).toBe('hidden');
    const area = walkTo(phone, [['subform', 'NA'], ['field', 'Area']]);
    expect(area.getAttribute('access')).toBe('readOnly');
    expect(walkTo(area, [['validate']]).getAttribute('nullTest')).toBe('error');
    expect(walkTo(area, [['caption'], ['value'], ['text']]).textContent).toBe('*Area');
    expect(walkTo(area, [['border'], ['fill'], ['color']]).getAttribute('value')).toBe('1,2,3');
    const lists = elements(walkTo(form1, [['field', 'List']])).filter((e) => e.localName === 'items');
    expect(lists.map((l) => [l.getAttribute('save') ?? '', elements(l).map((t) => t.textContent)])).toEqual([
      ['', ['One', 'Two']],
      ['1', ['1', '2']],
    ]);
    expect(elements(walkTo(form1, [['variables']])).map((t) => t.textContent)).toEqual(['true']);
    expect(walkTo(form1, [['field', 'Memo'], ['value'], ['text']]).textContent).toBe('kept in the form');
    expect(child(phone, 'field', 'Type')).toBeUndefined();
    expect(text).not.toMatch(/<(script|event|bind|pageSet)\b/);
    expect(text.startsWith(`<form checksum="`)).toBe(true);
    expect(text).toMatch(/<subform name="form1"\n>/);
  });

  it('is idempotent: reopening, restoring and saving again writes the same form packet', async () => {
    const first = await savedAfterClick();
    const again = await runtimeOf(first);
    again.load();
    const second = await again.save();
    expect((await openXfaPdf(second)).packet('form').text()).toBe((await openXfaPdf(first)).packet('form').text());
  });

  it('a PDF without a form packet is saved as before: only the datasets change', async () => {
    const runtime = await runtimeOf(sourcePdf(RESTORE, null));
    const report = runtime.load();
    expect(report.savedState).toEqual({ status: 'none', deltas: 0, skipped: 0 });
    runtime.event('Btn', 'click');
    const after = await openXfaPdf(await runtime.save());
    expect(after.packets.map((p) => p.name)).toEqual(['template', 'datasets', '</xdp:xdp>']);
  });
});

describe('getDeltas / restore: the saved UI state comes back when the form asks for it', () => {
  it('the docReady restore loop brings back presence, access, mandatory, captions, colours, items, text variables and unbound values', async () => {
    const runtime = await runtimeOf(await savedAfterClick());
    const report = runtime.load();
    expect(report.savedState.status).toBe('restorable');
    expect(report.savedState.deltas).toBeGreaterThan(8);
    expect(report.savedState.skipped).toBe(0);
    expect(runtime.getProperty('Phone.NA', 'presence')).toBe('visible');
    expect(runtime.getProperty('Phone.Intl', 'presence')).toBe('hidden');
    expect(runtime.getProperty('Phone.NA.Area', 'mandatory')).toBe('error');
    expect(runtime.getProperty('Phone.NA.Area', 'access')).toBe('readOnly');
    expect(runtime.getValue('Phone.NA.Area.caption.value.text')).toBe('*Area');
    expect(runtime.getProperty('Phone.NA.Area.border.fill.color', 'value')).toBe('1,2,3');
    const [display, save] = runtime.children('List', 'items');
    expect(runtime.children(display ?? '').map((s) => runtime.getValue(s))).toEqual(['One', 'Two']);
    expect(runtime.children(save ?? '').map((s) => runtime.getValue(s))).toEqual(['1', '2']);
    expect(runtime.getValue('flag')).toBe('true');
    expect(runtime.getValue('Memo')).toBe('kept in the form');
    expect(runtime.getValue('Phone.Type')).toBe('02');
  });

  it('nothing is restored when the form does not ask (restoreState is manual): the template state stands', async () => {
    const runtime = await runtimeOf(await savedAfterClick(''));
    expect(runtime.load().savedState.status).toBe('restorable');
    expect(runtime.getProperty('Phone.NA', 'presence')).toBe('invisible');
    expect(runtime.getProperty('Phone.NA.Area', 'access')).toBe('open');
  });

  it('a form packet whose checksum does not match the template and datasets is ignored (the data changed after the state was saved)', async () => {
    const saved = await openXfaPdf(await savedAfterClick());
    const changed = await saved.withPacket('datasets', new TextEncoder().encode(datasetsXml(DATA.replace('<Type>02</Type>', '<Type>03</Type>'))));
    const runtime = await runtimeOf(changed);
    expect(runtime.load().savedState).toEqual({ status: 'rejected', deltas: 0, skipped: 0 });
    expect(runtime.getProperty('Phone.NA', 'presence')).toBe('invisible');
  });

  it('a form packet without a checksum is ignored', async () => {
    const runtime = await runtimeOf(sourcePdf(RESTORE, `<form xmlns="${FORM_NS}"><subform name="form1"><subform name="Phone"><subform name="NA" presence="visible"/></subform></subform></form>`));
    expect(runtime.load().savedState.status).toBe('rejected');
    expect(runtime.getProperty('Phone.NA', 'presence')).toBe('invisible');
  });

  it('delta objects: length, item(), className, savedValue, currentValue, target; a subform lists only its own deltas; a delta is not a form node', async () => {
    // The first run (before any save) has no saved state: the probe only speaks when there are deltas.
    const probe = [
      'var all = this.getDeltas(); var mine = Phone.getDeltas(); var d = mine.item(0);',
      'if (all.length > 0) {',
      '  console.println(all.length > mine.length && mine.length > 0);',
      '  console.println(d.className + "|" + typeof d.savedValue + "|" + typeof d.currentValue + "|" + typeof d.target);',
      '  try { Phone.nodes.append(d); console.println("appended"); } catch (e) { console.println("refused"); }',
      '}',
      RESTORE,
    ].join('\n');
    const runtime = await runtimeOf(await savedAfterClick(probe));
    runtime.load();
    expect(runtime.console).toEqual(['true', 'delta|string|string|string', 'refused']);
    expect(runtime.unsupported).toEqual([]);
    expect(runtime.getProperty('Phone.NA', 'presence')).toBe('visible');
  });
});

describe('getDeltas / restore: a saved form packet is untrusted input', () => {
  /** A form packet with a valid checksum but hostile content: only allow-listed state may come back. */
  function hostile(): Uint8Array {
    const template = tpl(body(RESTORE));
    const datasets = datasetsXml(DATA);
    const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
    const sum = formChecksum([enc(template), enc(datasets)]);
    const form = [
      `<form checksum="${sum}" xmlns="${FORM_NS}"><subform name="form1">`,
      '<field name="Btn"><event activity="click"><script>Phone.presence = "hidden";</script></event></field>',
      '<subform name="Phone" presence="bogus" access="readOnly" match="none">',
      '<field name="Type"><value><text>EVIL</text></value></field>',
      '<subform name="NA"><field name="Area"><caption><value><text>restored</text></value></caption></field></subform>',
      '</subform>',
      '<subform name="Nope" presence="hidden"/>',
      '</subform></form>',
    ].join('');
    return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasets), packet('form', form)] });
  }

  it('restores allow-listed, valid state and skips scripts, events, invalid values, unknown attributes, bound values and unknown nodes', async () => {
    const runtime = await runtimeOf(hostile());
    const report = runtime.load();
    expect(report.savedState).toEqual({ status: 'restorable', deltas: 2, skipped: 5 });
    expect(runtime.getProperty('Phone', 'access')).toBe('readOnly');
    expect(runtime.getProperty('Phone', 'presence')).toBe('visible');
    expect(runtime.getValue('Phone.NA.Area.caption.value.text')).toBe('restored');
    expect(runtime.getValue('Phone.Type')).toBe('02');
    runtime.event('Btn', 'click');
    expect(runtime.getProperty('Phone.NA', 'presence')).toBe('visible');
  });
});
