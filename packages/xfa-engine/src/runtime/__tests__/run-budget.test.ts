import { describe, expect, it } from 'vitest';
import { XfaScriptError } from '../../script/index.js';
import { calc, loaded, makeRuntime, textField, thrown } from './helpers.js';

const WIDTH = 20_000;
const CHURNERS = 150;

/**
 * A subform `wide` of `WIDTH` plain fields (so a scope's name set is expensive to rebuild) holding `CHURNERS` fields whose
 * calculate moves a child (a structure change) and then names a free name, which the binder resolves against `wide`.
 */
const churned = (): string => {
  const plain = Array.from({ length: WIDTH }, (_, i) => `<field name="p${i}"/>`).join('');
  const script = 'wide.nodes.append(p0); this.rawValue = Number(p1.rawValue) + 1;';
  const churners = Array.from({ length: CHURNERS }, (_, i) => textField(`c${i}`, calc(script))).join('');
  return `<subform name="wide">${plain}${churners}</subform>`;
};

describe('host-side preparation of a script counts against the form-run time budget (L3-F1)', () => {
  it('a calculate pass whose binding work is slow (a wide scope rebuilt after every structure change) ends with SCRIPT_LIMIT total-time instead of running unbounded', async () => {
    const runtime = await makeRuntime(churned(), { options: { limits: { formRunDeadlineMs: 200 } } });
    const error = thrown(() => runtime.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'total-time' });
  }, 120_000);

  it('the same form under the default budget loads, so ordinary forms are unaffected', async () => {
    const runtime = await loaded(churned());
    expect(runtime.state).toBe('loaded');
  }, 120_000);
});
