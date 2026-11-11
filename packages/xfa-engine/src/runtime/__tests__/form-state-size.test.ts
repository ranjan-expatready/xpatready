import { afterEach, describe, expect, it } from 'vitest';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { datasetsXml } from '../../model/form/__tests__/helpers.js';
import { tpl } from '../../model/template/__tests__/helpers.js';
import { MAX_XML_CHARS } from '../../xml/limits.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import type { FormRuntime } from '../options.js';
import { createFormRuntime } from '../runtime.js';
import { FIXED_CLOCK, NEUTRAL_HOST, onEvent, textField } from './helpers.js';

const open: FormRuntime[] = [];
afterEach(() => {
  for (const runtime of open.splice(0)) runtime.dispose();
});

const FORM_NS = 'http://www.xfa.org/schema/xfa-form/2.8/';
/** Sets two 2 MiB runs of "&" (10 MiB each once escaped in a packet, 20 MiB together) as unbound values, and hides a small field. */
const CLICK = 'var s = "&"; for (var i = 0; i < 21; i++) { s += s; } MemoA.rawValue = s; MemoB.rawValue = s; Small.presence = "hidden";';
const memo = (name: string): string => `<field name="${name}"><ui><textEdit/></ui><bind match="none"/></field>`;
const BODY = `${textField('Small')}${memo('MemoA')}${memo('MemoB')}${textField('Btn', onEvent('click', CLICK))}`;
const DATA = '<form1><Small/><Btn/></form1>';
const BLANK_FORM = `<form xmlns="${FORM_NS}"\n><subform name="form1"\n/></form\n>`;

async function runtimeOf(): Promise<FormRuntime> {
  const bytes = buildXfaPdf({
    packets: [packet('template', tpl(BODY)), packet('datasets', datasetsXml(DATA)), packet('form', BLANK_FORM), packet('</xdp:xdp>', '\n')],
  });
  const runtime = await createFormRuntime(await openXfaPdf(bytes), { host: NEUTRAL_HOST, clock: FIXED_CLOCK, strict: true });
  open.push(runtime);
  return runtime;
}

describe('FormRuntime.save keeps a PDF saveable when the UI state is too large for the form packet (L4-F1)', () => {
  it('values that together escape past the XML ceiling: the one that does not fit is left out of the packet, the save succeeds and the rest of the state reads back', async () => {
    const runtime = await runtimeOf();
    runtime.load();
    runtime.event('Btn', 'click');
    const saved = await openXfaPdf(await runtime.save());
    const form = saved.packet('form').text();
    expect(form.length).toBeLessThanOrEqual(MAX_XML_CHARS);
    expect(form).toContain('presence="hidden"');
    expect(form.split('&amp;').length - 1).toBe(2 * 1024 * 1024);
    const again = await createFormRuntime(saved, { host: NEUTRAL_HOST, clock: FIXED_CLOCK, strict: true });
    open.push(again);
    expect(again.load().savedState).toEqual({ status: 'restorable', deltas: 2, skipped: 0 });
  }, 60_000);
});
