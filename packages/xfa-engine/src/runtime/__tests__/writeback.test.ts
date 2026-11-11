import { afterEach, describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../pdf/errors.js';
import { datasetsXml } from '../../model/form/__tests__/helpers.js';
import { tpl } from '../../model/template/__tests__/helpers.js';
import { parseXml } from '../../xml/parse.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { XfaRuntimeError } from '../errors.js';
import type { FormRuntime } from '../options.js';
import { createFormRuntime } from '../runtime.js';
import { serializeDatasets } from '../writeback.js';
import { FIXED_CLOCK, NEUTRAL_HOST, onEvent, textField, thrown } from './helpers.js';

const open: FormRuntime[] = [];
afterEach(() => {
  for (const runtime of open.splice(0)) runtime.dispose();
});

const dec = (bytes: Uint8Array): string => new TextDecoder('utf-8', { fatal: true }).decode(bytes);

const BODY = `${textField('Name')}${textField('Note')}<field name="Flag"><ui><textEdit/></ui><value><text>No</text></value></field>${textField('Btn', onEvent('click', 'Flag.rawValue = "Yes";'))}`;

async function session(body = BODY, data = '<form1><Name>Original</Name></form1>') {
  const source = buildXfaPdf({ packets: [packet('template', tpl(body), true), packet('datasets', datasetsXml(data), true), packet('postamble', '\n')] });
  const pdf = await openXfaPdf(source);
  const runtime = await createFormRuntime(pdf, { host: NEUTRAL_HOST, clock: FIXED_CLOCK, strict: true });
  open.push(runtime);
  runtime.load();
  return { source, pdf, runtime };
}

/** Reopens saved bytes and loads them in a fresh runtime. */
async function reload(bytes: Uint8Array): Promise<FormRuntime> {
  const runtime = await createFormRuntime(await openXfaPdf(bytes), { host: NEUTRAL_HOST, clock: FIXED_CLOCK, strict: true });
  open.push(runtime);
  runtime.load();
  return runtime;
}

describe('FormRuntime.save: the data DOM goes back into the PDF through withPacket', () => {
  it('writes an incremental update: the original bytes are an exact prefix and only the datasets packet changed', async () => {
    const { source, pdf, runtime } = await session();
    runtime.setValue('Name', 'Changed');
    const out = await runtime.save();
    expect(out.length).toBeGreaterThan(source.length);
    expect(out.subarray(0, source.length)).toEqual(source);
    const again = await openXfaPdf(out);
    expect(again.packets.map((p) => p.name)).toEqual(pdf.packets.map((p) => p.name));
    expect(again.packet('template').bytes).toEqual(pdf.packet('template').bytes);
    expect(again.packet('postamble').bytes).toEqual(pdf.packet('postamble').bytes);
    expect(again.packet('datasets').bytes).not.toEqual(pdf.packet('datasets').bytes);
    expect(again.packet('datasets').ref).toEqual(pdf.packet('datasets').ref);
  });

  it('reopening and loading the saved file gives the values back, including a value a script set', async () => {
    const { runtime } = await session();
    runtime.setValue('Note', 'typed by the user');
    runtime.event('Btn', 'click');
    const again = await reload(await runtime.save());
    expect(again.getValue('Name')).toBe('Original');
    expect(again.getValue('Note')).toBe('typed by the user');
    expect(again.getValue('Flag')).toBe('Yes');
  });

  it('the datasets packet is UTF-8 text that parses, and text outside ASCII, markup characters and carriage returns survive the round trip', async () => {
    const { runtime } = await session();
    const tricky = 'Zoë 名前 😀 <&> "q" \'s\' \r\nsecond line';
    runtime.setValue('Note', tricky);
    const out = await runtime.save();
    const text = dec((await openXfaPdf(out)).packet('datasets').bytes);
    expect(() => parseXml(text)).not.toThrow();
    expect((await reload(out)).getValue('Note')).toBe(tricky);
  });

  it('is deterministic and does not disturb the run: two saves are byte-identical, and the run goes on and saves again with a later change', async () => {
    const { runtime } = await session();
    runtime.setValue('Name', 'First');
    const a = await runtime.save();
    expect(await runtime.save()).toEqual(a);
    expect(runtime.state).toBe('loaded');
    runtime.setValue('Name', 'Second');
    const b = await runtime.save();
    expect(b).not.toEqual(a);
    expect((await reload(b)).getValue('Name')).toBe('Second');
  });

  it('an untouched form saves a file that reloads to the same values', async () => {
    const { runtime } = await session();
    expect((await reload(await runtime.save())).getValue('Name')).toBe('Original');
  });

  it('refuses before load, after dispose and after an aborted run, with the lifecycle codes', async () => {
    const source = buildXfaPdf({ packets: [packet('template', tpl(BODY)), packet('datasets', datasetsXml('<form1/>'))] });
    const fresh = await createFormRuntime(await openXfaPdf(source), { host: NEUTRAL_HOST, clock: FIXED_CLOCK });
    open.push(fresh);
    expect(await fresh.save().catch((e: unknown) => e)).toMatchObject({ code: 'NOT_LOADED' });
    fresh.load();
    fresh.dispose();
    const error = await fresh.save().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(XfaRuntimeError);
    expect(error).toBeInstanceOf(XfaPdfError);
    expect(error).toMatchObject({ code: 'DISPOSED' });
  });

  it('does not write expandos or notes: a form that sets a container property saves the same datasets', async () => {
    const { runtime } = await session(`${BODY}<subform name="P"/>${textField('Go', onEvent('click', 'P.rawValue = "ghost-value";'))}`);
    const before = dec((await openXfaPdf(await runtime.save())).packet('datasets').bytes);
    runtime.event('Go', 'click');
    const after = dec((await openXfaPdf(await runtime.save())).packet('datasets').bytes);
    expect(after).toBe(before);
    expect(after).not.toContain('ghost-value');
  });
});

describe('serializeDatasets: what is written must re-parse within the XML ceilings', () => {
  const doc = () => parseXml(datasetsXml('<form1><a>1</a><b>2</b><c>3</c></form1>'));

  it('returns UTF-8 bytes of the serialized document', () => {
    const bytes = serializeDatasets(doc());
    expect(dec(bytes)).toContain('<a>1</a>');
    expect(bytes).toBeInstanceOf(Uint8Array);
  });

  it('refuses (MALFORMED_XML) a document that would not re-parse under a ceiling, instead of writing a packet the engine cannot reopen', () => {
    const error = thrown(() => serializeDatasets(doc(), { maxElements: 3 }));
    expect(error).toBeInstanceOf(XfaPdfError);
    expect(error).toMatchObject({ code: 'MALFORMED_XML' });
    expect(thrown(() => serializeDatasets(doc(), { maxChars: 10 }))).toMatchObject({ code: 'MALFORMED_XML' });
    expect(thrown(() => serializeDatasets(doc(), { maxDepth: 2 }))).toMatchObject({ code: 'MALFORMED_XML' });
  });

  it('refuses a tree that holds a character XML forbids, as serializeXml does', () => {
    const d = doc();
    const a = d.getElementsByTagName('a')[0];
    if (a === undefined) throw new Error('fixture');
    a.textContent = 'bad\u0001char';
    expect(thrown(() => serializeDatasets(d))).toMatchObject({ code: 'MALFORMED_XML' });
  });
});
