import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../pdf/errors.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { datasetsXml } from '../../model/form/__tests__/helpers.js';
import { tpl } from '../../model/template/__tests__/helpers.js';
import { XfaRuntimeError } from '../errors.js';
import { createFormRuntime } from '../runtime.js';
import { FIXED_CLOCK, NEUTRAL_HOST, loaded, makeRuntime, onEvent, textField, thrown } from './helpers.js';

const pdfFor = async (templateXml: string) =>
  openXfaPdf(buildXfaPdf({ packets: [packet('template', templateXml), packet('datasets', datasetsXml('<form1/>'))] }));

describe('createFormRuntime options and lifecycle', () => {
  it('a host identity missing a field is INVALID_OPTIONS, because the engine has no default that could impersonate a viewer', async () => {
    const pdf = await pdfFor(tpl(textField('a')));
    const { name: _name, ...partial } = NEUTRAL_HOST;
    const error = await createFormRuntime(pdf, { host: partial as never, clock: FIXED_CLOCK }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(XfaRuntimeError);
    expect((error as XfaRuntimeError).code).toBe('INVALID_OPTIONS');
  });

  it('an unknown option key is rejected, so a misspelt limit is not silently ignored', async () => {
    const pdf = await pdfFor(tpl(textField('a')));
    const error = await createFormRuntime(pdf, { host: NEUTRAL_HOST, clock: FIXED_CLOCK, strcit: true } as never).catch((e: unknown) => e);
    expect((error as XfaRuntimeError).code).toBe('INVALID_OPTIONS');
  });

  it('a limit above its ceiling or an unknown limit is rejected: runtime ceilings can only be tightened', async () => {
    const pdf = await pdfFor(tpl(textField('a')));
    const tooHigh = await createFormRuntime(pdf, { host: NEUTRAL_HOST, clock: FIXED_CLOCK, limits: { maxCalcPasses: 1_000_000 } }).catch((e: unknown) => e);
    expect((tooHigh as XfaRuntimeError).code).toBe('INVALID_OPTIONS');
    const unknown = await createFormRuntime(pdf, { host: NEUTRAL_HOST, clock: FIXED_CLOCK, limits: { bogus: 1 } as never }).catch((e: unknown) => e);
    expect((unknown as XfaRuntimeError).code).toBe('INVALID_OPTIONS');
  });

  it('a timezone that is not UTC, a fixed offset or a known zone name is INVALID_OPTIONS (validated by the same schema as every other option)', async () => {
    const pdf = await pdfFor(tpl(textField('a')));
    const error = await createFormRuntime(pdf, { host: NEUTRAL_HOST, clock: FIXED_CLOCK, timezone: 'Nowhere/Land' }).catch((e: unknown) => e);
    expect((error as XfaRuntimeError).code).toBe('INVALID_OPTIONS');
    expect((error as XfaRuntimeError).message).toContain('timezone');
  });

  it('a template the engine cannot run is refused at creation with the model\'s UNSUPPORTED_FEATURE, not at the first event', async () => {
    const pdf = await pdfFor(tpl('<subformSet name="s"/>'));
    const error = await createFormRuntime(pdf, { host: NEUTRAL_HOST, clock: FIXED_CLOCK }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(XfaPdfError);
    expect((error as XfaPdfError).code).toBe('UNSUPPORTED_FEATURE');
  });

  it('operations before load() are NOT_LOADED and a second load() is ALREADY_LOADED', async () => {
    const rt = await makeRuntime(textField('a'));
    expect((thrown(() => rt.setValue('a', 'x')) as XfaRuntimeError).code).toBe('NOT_LOADED');
    expect((thrown(() => rt.event('a', 'click')) as XfaRuntimeError).code).toBe('NOT_LOADED');
    rt.load();
    expect((thrown(() => rt.load()) as XfaRuntimeError).code).toBe('ALREADY_LOADED');
    expect(rt.state).toBe('loaded');
  });

  it('after dispose every operation is DISPOSED and dispose is idempotent', async () => {
    const rt = await loaded(textField('a'));
    rt.dispose();
    rt.dispose();
    expect(rt.state).toBe('disposed');
    expect((thrown(() => rt.setValue('a', 'x')) as XfaRuntimeError).code).toBe('DISPOSED');
  });

  it('setValue validates its arguments (SOM text, scalar value) and a bad call leaves the run usable', async () => {
    const rt = await loaded(textField('a'));
    expect((thrown(() => rt.setValue('', 'x')) as XfaRuntimeError).code).toBe('INVALID_ARGUMENT');
    expect((thrown(() => rt.setValue('a', { x: 1 } as never)) as XfaRuntimeError).code).toBe('INVALID_ARGUMENT');
    expect((thrown(() => rt.setValue('missing', 'x')) as XfaRuntimeError).code).toBe('NODE_NOT_FOUND');
    rt.setValue('a', 'fine');
    expect(rt.getValue('a')).toBe('fine');
  });

  it('getValue reads a field (typed), a text variable and a data node, and refuses a node with no value', async () => {
    const body = `<variables><text name="t">tv</text></variables>${textField('a')}<subform name="s"/>`;
    const rt = await loaded(body, { data: '<form1><a>dv</a></form1>' });
    expect(rt.getValue('a')).toBe('dv');
    expect(rt.getValue('t')).toBe('tv');
    expect(rt.getValue('xfa.data.form1.a')).toBe('dv');
    expect((thrown(() => rt.getValue('s')) as XfaRuntimeError).code).toBe('INVALID_ARGUMENT');
  });

  it('getProperty reads a scalar member of any node (presence, className, selectedIndex) and refuses a member that is a node, so callers can inspect effects without holding model objects', async () => {
    const body = `<field name="c"><ui><choiceList/></ui>${onEvent('initialize', 'this.presence = "hidden"; this.addItem("One", "1");')}</field>`;
    const rt = await loaded(body);
    expect(rt.getProperty('c', 'presence')).toBe('hidden');
    expect(rt.getProperty('c', 'className')).toBe('field');
    expect(rt.getProperty('c', 'selectedIndex')).toBe(-1);
    expect((thrown(() => rt.getProperty('c', 'parent')) as XfaRuntimeError).code).toBe('INVALID_ARGUMENT');
    expect((thrown(() => rt.getProperty('c', 'noSuchMember')) as XfaRuntimeError).code).toBe('INVALID_ARGUMENT');
    expect(rt.unsupported).toEqual([]);
  });

  it('the runtime object carries the FormRuntime members only: the pack helpers\' write-watch is not part of the public surface', async () => {
    const rt = await makeRuntime(textField('a'));
    expect('watchFirstWrite' in rt).toBe(false);
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(rt)).filter((name) => name.startsWith('watch'))).toEqual([]);
  });

  it('load() reports what it did: scripts run, calculate passes and script objects, so the evidence line has numbers', async () => {
    const rt = await makeRuntime(`<variables><script name="l" contentType="application/x-javascript">var q = 1;</script></variables>${textField('a', onEvent('initialize', 'this.rawValue = "v";'))}`);
    const report = rt.load();
    expect(report.scriptObjects).toBe(1);
    expect(report.scriptsRun).toBe(1);
    expect(report.calcPasses).toBe(0);
    expect(report.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
