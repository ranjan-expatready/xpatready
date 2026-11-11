import { describe, expect, it } from 'vitest';
import { XfaRuntimeError } from '../errors.js';
import { calc, loaded, makeRuntime, onEvent, textField, thrown, variables } from './helpers.js';

const sumField = `${textField('sum', calc('this.rawValue = Number(x.rawValue) + Number(y.rawValue);'))}`;

describe('calculate: host-triggered recalculation and the settle loop', () => {
  it('setValue on an input recalculates the dependent field, so typing the phone parts updates the computed number', async () => {
    const rt = await loaded(`${textField('x')}${textField('y')}${sumField}`);
    rt.setValue('x', '2');
    rt.setValue('y', '3');
    expect(rt.getValue('sum')).toBe('5');
  });

  it('a dependency chain declared in reverse order settles over several passes, ending with every dependent correct', async () => {
    const body = `${textField('c', calc('this.rawValue = Number(b.rawValue) + 1;'))}${textField('b', calc('this.rawValue = Number(a.rawValue) + 1;'))}${textField('a')}`;
    const rt = await loaded(body);
    const result = rt.setValue('a', '1');
    expect(rt.getValue('b')).toBe('2');
    expect(rt.getValue('c')).toBe('3');
    expect(result.calcPasses).toBeGreaterThanOrEqual(2);
  });

  it('a calculate that never converges raises CALC_NOT_CONVERGED with the pass cap, not a hang, and aborts the run', async () => {
    const rt = await makeRuntime(textField('n', calc('this.rawValue = (Number(this.rawValue) || 0) + 1;')), { options: { limits: { maxCalcPasses: 3 } } });
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaRuntimeError);
    expect((error as XfaRuntimeError).code).toBe('CALC_NOT_CONVERGED');
    expect((error as XfaRuntimeError).message).toContain('3');
    expect(rt.state).toBe('aborted');
  });

  it('a write inside a calculate does not start another settle: two passes over a stable calculate run it exactly twice', async () => {
    const body = `${variables('<text name="runs">0</text>')}${textField('p', calc('runs.value = String(Number(runs.value) + 1); q.rawValue = "w"; this.rawValue = "pp";'))}${textField('q')}`;
    const rt = await loaded(body);
    expect(rt.getValue('runs')).toBe('2');
    expect(rt.getValue('q')).toBe('w');
  });

  it('the value a JavaScript calculate evaluates to is assigned to the field when it is a string, number, boolean or null, so `A.rawValue * B.rawValue` alone computes the field', async () => {
    const body = `${textField('a')}${textField('b')}${textField('product', calc('Number(a.rawValue) * Number(b.rawValue)'))}${textField('label', calc('"fixed"'))}${textField('flag', calc('1 == 1'))}${textField('cleared', calc('null'))}`;
    const rt = await loaded(body);
    rt.setValue('a', '6');
    rt.setValue('b', '7');
    expect(rt.getValue('product')).toBe('42');
    expect(rt.getValue('label')).toBe('fixed');
    expect(rt.getValue('flag')).toBe('1');
    expect(rt.getValue('cleared')).toBeNull();
  });

  it('a calculate whose value is undefined writes nothing (a trigger-style calculate ending in an untaken if), and so does a node result', async () => {
    const body = `${textField('x')}${textField('keep', `<value><text>kept</text></value>${calc('if (x.rawValue == "go") { var t = 1; }')}`)}${textField('node', `<value><text>nodekept</text></value>${calc('x')}`)}`;
    const rt = await loaded(body);
    expect(rt.getValue('keep')).toBe('kept');
    expect(rt.getValue('node')).toBe('nodekept');
  });

  it('an explicit rawValue write that is also the last expression keeps its value, and a later different completion value wins', async () => {
    const rt = await loaded(`${textField('same', calc('this.rawValue = "w"'))}${textField('later', calc('this.rawValue = "w"; "final"'))}`);
    expect(rt.getValue('same')).toBe('w');
    expect(rt.getValue('later')).toBe('final');
  });

  it('a FormCalc bare reference sets the field to the referenced field value, including each indexed same-name sibling', async () => {
    const body = `${textField('s1')}${textField('s2')}${textField('t', calc('s1', true))}${textField('t', calc('s2', true))}`;
    const rt = await loaded(body);
    rt.setValue('s1', 'AAA');
    rt.setValue('s2', 'BBB');
    expect(rt.getValue('t[0]')).toBe('AAA');
    expect(rt.getValue('t[1]')).toBe('BBB');
  });

  it('a FormCalc bare reference that names nothing raises FORMCALC_UNRESOLVED with the node, instead of writing null over the field', async () => {
    const rt = await makeRuntime(textField('t', calc('missing', true)));
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaRuntimeError);
    expect((error as XfaRuntimeError).code).toBe('FORMCALC_UNRESOLVED');
    expect((error as XfaRuntimeError).nodeSom).toBe('xfa[0].form[0].form1[0].t[0]');
  });

  it('calculates with no script, with a server-only script or with an error override are skipped', async () => {
    const body = `${textField('none', '<calculate override="error"/>')}${textField('srv', `<calculate><script contentType="application/x-javascript" runAt="server">this.rawValue = "bad";</script></calculate>`)}`;
    const rt = await loaded(body);
    expect(rt.getValue('none')).toBeNull();
    expect(rt.getValue('srv')).toBeNull();
  });

  it('an event that changes a value triggers recalculation, and one that changes nothing does not run the calculates again', async () => {
    const body = `${variables('<text name="runs">0</text>')}${textField('x', onEvent('click', 'this.rawValue = "7";'))}${textField('noop', onEvent('click', 'var z = 1;'))}${textField('d', calc('runs.value = String(Number(runs.value) + 1); this.rawValue = x.rawValue;'))}`;
    const rt = await loaded(body);
    const afterLoad = rt.getValue('runs');
    rt.event('noop', 'click');
    expect(rt.getValue('runs')).toBe(afterLoad);
    rt.event('x', 'click');
    expect(rt.getValue('d')).toBe('7');
    expect(Number(rt.getValue('runs'))).toBeGreaterThan(Number(afterLoad));
  });
});
