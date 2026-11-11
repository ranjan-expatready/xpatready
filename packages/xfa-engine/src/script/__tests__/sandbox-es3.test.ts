import { afterEach, describe, expect, it } from 'vitest';
import { afterEachDispose, makeHarness } from './helpers.js';
import { FakeHost } from './fake-host.js';

afterEach(afterEachDispose);

describe('ES3 form-script semantics inside the sandbox (A1)', () => {
  it('hoisted function declarations and recursion work, so library scripts that call helpers defined later do not break', async () => {
    const { sandbox } = await makeHarness();
    expect(sandbox.evaluate('r(5); function r(n){ return n <= 1 ? 1 : n * r(n - 1); }')).toBe(120);
  });

  it('`arguments` and Array.prototype.slice.call(arguments) work, so variadic helpers see every actual parameter', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'function f(){ var a = Array.prototype.slice.call(arguments); return [arguments.length, a.length, a[2]]; } f("x", "y", "z")',
    );
    expect(out).toEqual([3, 3, 'z']);
  });

  it('switch honours fall-through and default, so field-type dispatch picks the right branch', async () => {
    const { sandbox } = await makeHarness();
    const src = (v: string): string =>
      `var out = ""; switch ("${v}") { case "a": out += "A"; case "b": out += "B"; break; case "c": out += "C"; break; default: out += "D"; } out`;
    expect(sandbox.evaluate(src('a'))).toBe('AB');
    expect(sandbox.evaluate(src('c'))).toBe('C');
    expect(sandbox.evaluate(src('z'))).toBe('D');
  });

  it('try/catch/finally runs the finally block on both paths, so cleanup code in validators still executes', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'var log = []; function t(fail){ try { log.push("try"); if (fail) throw new Error("boom"); } catch (e) { log.push("catch:" + e.message); } finally { log.push("finally"); } } t(false); t(true); log',
    );
    expect(out).toEqual(['try', 'finally', 'try', 'catch:boom', 'finally']);
  });

  it('RegExp.prototype.compile re-targets a regexp object, so the legacy validators that reuse one object keep matching', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'var re = new RegExp("a+", "g"); var first = re.test("caat"); re.compile("^[0-9]+$"); [first, re.test("123"), re.test("12a")]',
    );
    expect(out).toEqual([true, true, false]);
  });

  it('function references can be passed, stored and called as values, so callback-style helpers work', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'function twice(fn, x){ return fn(fn(x)); } function inc(n){ return n + 1; } var table = [inc, function(n){ return n * 10; }]; [twice(inc, 1), table[1](4), (function(){ return typeof inc; })()]',
    );
    expect(out).toEqual([3, 40, 'function']);
  });

  it('Date is driven by the injected clock, so two runs of the same form agree and nothing drifts with the real time', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate('var d = new Date(); [d.getTime(), Date.now(), d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]');
    expect(out).toEqual([Date.UTC(2026, 5, 15, 12, 0, 0), Date.UTC(2026, 5, 15, 12, 0, 0), 2026, 5, 15]);
  });

  it('Date#getYear keeps its legacy years-since-1900 meaning, so the form\'s century arithmetic is not off by 1900', async () => {
    const { sandbox } = await makeHarness();
    expect(sandbox.evaluate('[new Date().getYear(), new Date(2020, 0, 5).getYear(), new Date(1999, 11, 31).getYear()]')).toEqual([126, 120, 99]);
  });

  it('Date still supports explicit construction, parsing, UTC and instanceof, so only the "now" source was replaced', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'var d = new Date(2024, 1, 29); [d instanceof Date, d.getMonth(), d.getDate(), Date.UTC(2000, 0, 1), Date.parse("2001-02-03T04:05:06Z"), typeof Date(), Date.prototype.constructor === Date, d.constructor === Date]',
    );
    expect(out).toEqual([true, 1, 29, 946684800000, Date.UTC(2001, 1, 3, 4, 5, 6), 'string', true, true]);
  });

  it('the guest cannot reach the real clock, so a script cannot make payloads non-deterministic', async () => {
    const { sandbox } = await makeHarness({ clock: { now: () => 86_400_000 } });
    expect(sandbox.evaluate('[new Date().getTime(), Date.now(), Date().indexOf("1970") >= 0, new Date.prototype.constructor().getTime()]')).toEqual([
      86_400_000, 86_400_000, true, 86_400_000,
    ]);
  });

  it('a sandbox pair with the same clock and scripts yields identical results, so repeated form runs are reproducible', async () => {
    const a = await makeHarness();
    const b = await makeHarness();
    const src = 'var d = new Date(); [d.getTime(), String(d.getYear()), Math.floor(d.getTime() / 1000)]';
    expect(a.sandbox.evaluate(src)).toEqual(b.sandbox.evaluate(src));
  });

  it('a plain object or function result is reported as undefined rather than leaking a guest reference', async () => {
    const { sandbox } = await makeHarness({}, new FakeHost());
    expect(sandbox.evaluate('({ a: 1 })')).toEqual({ $t: 'undef' });
    expect(sandbox.evaluate('(function(){})')).toEqual({ $t: 'undef' });
  });

  it('non-finite numbers survive the result channel, so NaN from a failed parse is not silently turned into null', async () => {
    const { sandbox } = await makeHarness();
    expect(sandbox.evaluate('0/0')).toEqual({ $t: 'num', v: 'NaN' });
    expect(sandbox.evaluate('-1/0')).toEqual({ $t: 'num', v: '-Infinity' });
    expect(sandbox.evaluate('[1/0, null, undefined, "s", true]')).toEqual([{ $t: 'num', v: 'Infinity' }, null, { $t: 'undef' }, 's', true]);
  });
});
