import { describe, expect, expectTypeOf, it } from 'vitest';
import { XfaFormError, type XfaFormErrorCode } from '../model/form/index.js';
import { XfaPdfError, type XfaErrorCode } from '../pdf/errors.js';
import { XfaRuntimeError, type XfaRuntimeErrorCode } from '../runtime/errors.js';
import { calc, loaded, makeRuntime, onEvent, textField, thrown } from '../runtime/__tests__/helpers.js';
import { XfaScriptError, type XfaScriptErrorCode } from '../script/index.js';

/** Every code string the three subclasses used before they joined the family: none may change. */
const SCRIPT_CODES = ['SCRIPT_LIMIT', 'SCRIPT_ERROR', 'UNSUPPORTED_MEMBER', 'BRIDGE_VIOLATION', 'HOST_ERROR', 'SANDBOX_CLOSED', 'INVALID_OPTIONS'] as const;
const FORM_CODES = ['INVALID_ARGUMENT', 'INVALID_OPERATION', 'LIMIT'] as const;
const RUNTIME_CODES = ['INVALID_OPTIONS', 'INVALID_ARGUMENT', 'NODE_NOT_FOUND', 'NOT_LOADED', 'ALREADY_LOADED', 'RUN_ABORTED', 'DISPOSED', 'CALC_NOT_CONVERGED', 'FORMCALC_UNRESOLVED'] as const;
const PDF_CODES = ['MALFORMED', 'UNSUPPORTED_SECURITY', 'WRONG_PASSWORD', 'NOT_XFA', 'PACKET_NOT_FOUND', 'MALFORMED_XML', 'UNSUPPORTED_FEATURE'] as const;

describe('one error family: a caller needs a single instanceof XfaPdfError', () => {
  it('the script, form and runtime errors are XfaPdfError subclasses and keep their own class, name and code', () => {
    const script = new XfaScriptError('SCRIPT_LIMIT', 'too long', { limit: 'deadline', location: { event: 'click', nodeSom: 'a.b' } });
    const form = new XfaFormError('LIMIT', 'too many');
    const run = new XfaRuntimeError('NOT_LOADED', 'call load() first');
    for (const [error, name, code] of [[script, 'XfaScriptError', 'SCRIPT_LIMIT'], [form, 'XfaFormError', 'LIMIT'], [run, 'XfaRuntimeError', 'NOT_LOADED']] as const) {
      expect(error).toBeInstanceOf(XfaPdfError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(name);
      expect(error.code).toBe(code);
    }
    expect(script).toBeInstanceOf(XfaScriptError);
    expect(script.limit).toBe('deadline');
    expect(script.message).toBe('too long (event=click, node=a.b)');
    expect(form).not.toBeInstanceOf(XfaScriptError);
    expect(run).not.toBeInstanceOf(XfaFormError);
  });

  it('the plain XfaPdfError is not any of the subclasses, so callers can still tell a bad file from a failed run', () => {
    const plain = new XfaPdfError('MALFORMED', 'bad');
    expect(plain).not.toBeInstanceOf(XfaScriptError);
    expect(plain).not.toBeInstanceOf(XfaFormError);
    expect(plain).not.toBeInstanceOf(XfaRuntimeError);
    expect(plain.name).toBe('XfaPdfError');
  });

  it('the cause option still travels through every subclass', () => {
    const cause = new Error('inner');
    expect(new XfaScriptError('HOST_ERROR', 'x', { cause }).cause).toBe(cause);
    expect(new XfaFormError('INVALID_ARGUMENT', 'x', { cause }).cause).toBe(cause);
    expect(new XfaRuntimeError('INVALID_ARGUMENT', 'x', { cause }).cause).toBe(cause);
  });

  it('the codes are one union: every previous code string is an XfaErrorCode, and each class keeps its own narrower type', () => {
    const all: readonly XfaErrorCode[] = [...PDF_CODES, ...SCRIPT_CODES, ...FORM_CODES, ...RUNTIME_CODES];
    expect(new Set(all).size).toBe(PDF_CODES.length + SCRIPT_CODES.length + FORM_CODES.length + RUNTIME_CODES.length - 2);
    expectTypeOf<XfaScriptErrorCode>().toExtend<XfaErrorCode>();
    expectTypeOf<XfaFormErrorCode>().toExtend<XfaErrorCode>();
    expectTypeOf<XfaRuntimeErrorCode>().toExtend<XfaErrorCode>();
    expectTypeOf<XfaScriptError['code']>().toEqualTypeOf<XfaScriptErrorCode>();
    expectTypeOf<XfaFormError['code']>().toEqualTypeOf<XfaFormErrorCode>();
    expectTypeOf<XfaRuntimeError['code']>().toEqualTypeOf<XfaRuntimeErrorCode>();
    expectTypeOf<XfaPdfError['code']>().toEqualTypeOf<XfaErrorCode>();
  });

  it('a form script that throws surfaces from load() as an XfaPdfError (SCRIPT_ERROR) with the form location', async () => {
    const rt = await makeRuntime(textField('a', onEvent('initialize', 'throw new Error("boom");')));
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaPdfError);
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaPdfError).code).toBe('SCRIPT_ERROR');
  });

  it('a caller mistake after load is an XfaPdfError too', async () => {
    const rt = await loaded(textField('a'));
    const error = thrown(() => rt.setValue('nope', 'x'));
    expect(error).toBeInstanceOf(XfaPdfError);
    expect((error as XfaPdfError).code).toBe('NODE_NOT_FOUND');
  });
});

describe('CALC_NOT_CONVERGED reaches the caller as the same typed error on every path (T06-F4)', () => {
  // The calculate diverges only once Gate is "go", so the form loads and the runaway is started later, three different ways.
  const body = [
    textField('Gate'),
    textField('Counter', calc('if (Gate.rawValue == "go") { this.rawValue = (Number(this.rawValue) || 0) + 1; }')),
    textField('Trigger', onEvent('click', 'Gate.rawValue = "go"; this.recalculate();')),
    textField('Quiet', onEvent('click', 'Gate.rawValue = "go";')),
  ].join('');
  const options = { options: { limits: { maxCalcPasses: 3 } } } as const;

  async function runaway(start: (rt: Awaited<ReturnType<typeof loaded>>) => void): Promise<{ error: unknown; state: string }> {
    const rt = await loaded(body, options);
    const error = thrown(() => start(rt));
    return { error, state: rt.state };
  }

  it.each([
    ['setValue settles after the write', (rt: Awaited<ReturnType<typeof loaded>>) => rt.setValue('Gate', 'go')],
    ['a host event that changed a value settles afterwards', (rt: Awaited<ReturnType<typeof loaded>>) => rt.event('Quiet', 'click')],
    ['a script that calls recalculate() itself', (rt: Awaited<ReturnType<typeof loaded>>) => rt.event('Trigger', 'click')],
  ])('%s: XfaRuntimeError CALC_NOT_CONVERGED, never a HOST_ERROR wrapper, and the run is aborted', async (_label, start) => {
    const { error, state } = await runaway(start);
    expect(error).toBeInstanceOf(XfaRuntimeError);
    expect(error).not.toBeInstanceOf(XfaScriptError);
    expect((error as XfaRuntimeError).code).toBe('CALC_NOT_CONVERGED');
    expect(state).toBe('aborted');
  });

  it('after the failure every further call is RUN_ABORTED', async () => {
    const rt = await loaded(body, options);
    thrown(() => rt.event('Trigger', 'click'));
    expect((thrown(() => rt.setValue('Gate', 'x')) as XfaRuntimeError).code).toBe('RUN_ABORTED');
  });
});

describe('a model LIMIT aborts the run the same way whether a script or the caller caused it', () => {
  const TOO_LONG = 4 * 1024 * 1024 + 1;

  it('a script that runs the form past its node ceiling ends the run with SCRIPT_LIMIT form-size', async () => {
    const script = 'for (var i = 0; i < 5000; i++) { xfa.form.createNode("text", "n" + i); }';
    const rt = await makeRuntime(textField('a', onEvent('initialize', script)), { options: { limits: { maxFormNodes: 200 } } });
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'form-size' });
    expect(rt.state).toBe('aborted');
  });

  it('setValue with an over-long value is the same error (SCRIPT_LIMIT form-size), not a raw form error, and the run is aborted', async () => {
    const rt = await loaded(textField('a'));
    const error = thrown(() => rt.setValue('a', 'x'.repeat(TOO_LONG)));
    expect(error).toBeInstanceOf(XfaScriptError);
    expect(error).not.toBeInstanceOf(XfaFormError);
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'form-size' });
    expect(rt.state).toBe('aborted');
    expect((thrown(() => rt.getValue('a')) as XfaRuntimeError).code).toBe('RUN_ABORTED');
  });
});
