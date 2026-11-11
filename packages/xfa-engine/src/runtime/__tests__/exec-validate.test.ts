import { describe, expect, it } from 'vitest';
import { loaded, onEvent, textField } from './helpers.js';

const validator = (script: string): string => `<validate><script contentType="application/x-javascript">${script}</script></validate>`;

describe('execEvent("validate"): the radio "Yes" handlers ask a field to run its validate script', () => {
  const body = [
    textField('Mark'),
    textField('Target', validator('Mark.rawValue = "validated"; true;')),
    textField('Btn', onEvent('click', 'Target.execEvent("validate");')),
    textField('Bad', onEvent('click', 'try { Target.execEvent("bogus"); Mark.rawValue = "no error"; } catch (e) { Mark.rawValue = "caught"; }')),
  ].join('');

  it('runs the node\'s validate script, as execValidate() does, in strict mode', async () => {
    const rt = await loaded(body, { options: { strict: true } });
    rt.event('Btn', 'click');
    expect(rt.getValue('Mark')).toBe('validated');
    expect(rt.unsupported).toEqual([]);
  });

  it('a node with no validate script is a no-op, and a name that is no activity at all is still a catchable error', async () => {
    const rt = await loaded(`${body}${textField('Plain', onEvent('click', 'Mark.rawValue = "plain";'))}${textField('Go', onEvent('click', 'Plain.execEvent("validate");'))}`, { options: { strict: true } });
    rt.event('Go', 'click');
    expect(rt.getValue('Mark')).toBeNull();
    rt.event('Bad', 'click');
    expect(rt.getValue('Mark')).toBe('caught');
  });
});

describe('execValidate(): the null test is the node\'s live value, which a script may have changed', () => {
  const run = async (probe: string, script: string): Promise<string | number | null> => {
    const rt = await loaded([probe, textField('Out'), textField('Btn', onEvent('click', script))].join(''), { options: { strict: true } });
    rt.event('Btn', 'click');
    expect(rt.unsupported).toEqual([]);
    return rt.getValue('Out');
  };

  it('a script that turns the null test on makes an empty field fail, though its template has it disabled', async () => {
    const probe = textField('Probe', '<validate nullTest="disabled"/>');
    expect(await run(probe, 'Out.rawValue = String(Probe.execValidate());')).toBe('true');
    expect(await run(probe, 'Probe.validate.nullTest = "error"; Out.rawValue = String(Probe.execValidate());')).toBe('false');
  });

  it('a script that turns the null test off makes an empty field pass, though its template has it on', async () => {
    const probe = textField('Probe', '<validate nullTest="error"/>');
    expect(await run(probe, 'Out.rawValue = String(Probe.execValidate());')).toBe('false');
    expect(await run(probe, 'Probe.validate.nullTest = "disabled"; Out.rawValue = String(Probe.execValidate());')).toBe('true');
  });

  it('a field whose template has no validate element takes a null test a script sets', async () => {
    const probe = textField('Probe');
    expect(await run(probe, 'Probe.validate.nullTest = "error"; Out.rawValue = String(Probe.execValidate());')).toBe('false');
  });
});
