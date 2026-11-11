import { afterEach, describe, expect, it } from 'vitest';
import { UNDEF, nodeValue, type BridgeValue } from '../bridge-types.js';
import { FakeHost } from './fake-host.js';
import { afterEachDispose, expectScriptError, makeHarness } from './helpers.js';

afterEach(afterEachDispose);

const WHERE = { event: 'calculate', nodeSom: 'form1.page1.amount' } as const;

function busyWait(ms: number): void {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // spin: simulates a slow host callback
  }
}

describe('hard limits kill hostile scripts with a typed SCRIPT_LIMIT (A3)', () => {
  it('an infinite loop is killed within the deadline and names the event and node, so a spin loop cannot hang the form run', async () => {
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 60 } });
    const started = performance.now();
    const error = expectScriptError(() => sandbox.evaluate('while (true) {}', WHERE));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'deadline', event: 'calculate', nodeSom: 'form1.page1.amount' });
    expect(performance.now() - started).toBeLessThan(2000);
    expect(sandbox.closed).toBe(true);
  });

  it('try/catch inside the script cannot swallow the deadline, so a form that catches everything still dies', async () => {
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 60 } });
    const error = expectScriptError(() => sandbox.evaluate('try { for (;;) {} } catch (e) { "survived" } finally { "still" }'));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'deadline' });
  });

  it('a memory bomb (growing array of objects) hits the heap cap, so the host process is not exhausted', async () => {
    const { sandbox } = await makeHarness({ limits: { memoryLimitBytes: 8 * 1024 * 1024 } });
    const error = expectScriptError(() => sandbox.evaluate('var a = []; for (;;) { a.push({ x: a.length, y: "abc" + a.length }); }', WHERE));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'memory' });
  });

  it('a memory bomb that keeps its data in globals is still a typed SCRIPT_LIMIT, so reading the error back does not itself run out of heap', async () => {
    const { sandbox } = await makeHarness({ limits: { memoryLimitBytes: 8 * 1024 * 1024 } });
    const error = expectScriptError(() => sandbox.evaluate('var hoard = []; for (;;) { hoard.push({ x: hoard.length, y: "abc" + hoard.length }); }', { global: true }));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'memory' });
    expect(sandbox.teardownFailure).toBeUndefined();
  });

  it('string doubling is stopped with a SCRIPT_LIMIT, so `s += s` cannot allocate gigabytes', async () => {
    const { sandbox } = await makeHarness({ limits: { memoryLimitBytes: 8 * 1024 * 1024 } });
    const error = expectScriptError(() => sandbox.evaluate('var s = "x"; for (;;) { s += s; }'));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'memory' });
  });

  it('unbounded recursion hits the stack cap, so a self-calling function cannot crash the host', async () => {
    const { sandbox } = await makeHarness();
    const error = expectScriptError(() => sandbox.evaluate('function f(){ return f() + 1; } f()', WHERE));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'stack' });
  });

  it('recursion that a script wraps in try/catch still ends the run (here by the deadline, since retrying after each overflow is exponential), so catching the overflow does not defeat the limits', async () => {
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 300 } });
    const error = expectScriptError(() => sandbox.evaluate('function f(){ try { return f(); } catch (e) { return f(); } } f()'));
    expect(error.code).toBe('SCRIPT_LIMIT');
    expect(['stack', 'deadline']).toContain(error.limit);
  });

  it('native recursion that outruns the host stack (String of a deeply nested array) is a typed SCRIPT_LIMIT and the next sandbox is unaffected, so a RangeError from the WASM never leaks', async () => {
    const { sandbox } = await makeHarness();
    const error = expectScriptError(() => sandbox.evaluate('var a = []; for (var i = 0; i < 20000; i++) a = [a]; String(a).length'));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'stack' });
    const next = await makeHarness();
    expect(next.sandbox.evaluate('[1, 2, 3].join("-")')).toBe('1-2-3');
  });

  it.each([
    ['indexOf', 'var a = []; a[4294967294] = 1; a.indexOf(2)'],
    ['join', 'var a = []; a[4294967294] = 1; a.join("")'],
    ['reverse', 'var a = []; a[4294967294] = 1; a.reverse()'],
    ['slice', 'var a = []; a[4294967294] = 1; a.slice(0)'],
    ['forEach', 'var a = []; a[4294967294] = 1; a.forEach(function(){})'],
    ['concat of a huge argument', 'var a = []; a[4294967294] = 1; [1].concat(a)'],
    ['Array.prototype.indexOf.call on an array-like', 'Array.prototype.indexOf.call({ length: 4294967295 }, 1)'],
  ])('native array builtin `%s` over a billion-element array is a typed SCRIPT_LIMIT, not a hang', async (_name, src) => {
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 300 } });
    const started = performance.now();
    const error = expectScriptError(() => sandbox.evaluate(src));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'array-length' });
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it('after a limit the sandbox is closed and refuses further scripts, so a half-run form cannot continue', async () => {
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 50 } });
    expectScriptError(() => sandbox.evaluate('for (;;) {}'));
    const error = expectScriptError(() => sandbox.evaluate('1 + 1'));
    expect(error.code).toBe('SANDBOX_CLOSED');
  });

  it('a fresh sandbox works right after another was killed, so one hostile PDF does not poison the process', async () => {
    const first = await makeHarness({ limits: { runDeadlineMs: 50 } });
    expectScriptError(() => first.sandbox.evaluate('for (;;) {}'));
    const second = await makeHarness();
    expect(second.sandbox.evaluate('6 * 7')).toBe(42);
  });

  it('ordinary legacy-sized work stays inside the default limits, so the defaults are not set so tight that real forms trip them', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate('var t = 0; for (var i = 0; i < 300000; i++) { t += i % 7; } var s = []; for (var j = 0; j < 20000; j++) s.push("v" + j); [t, s.join("").length]');
    expect(out).toEqual([899_997, 108_890]);
  });
});

describe('bridge-call and form-run budgets', () => {
  it('too many bridge calls in one run is SCRIPT_LIMIT and cannot be caught by the script, so a loop hammering the host stops', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { v: 1 });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({ limits: { runBridgeCalls: 50 } }, host);
    const error = expectScriptError(() =>
      sandbox.evaluate('var n = xfa.resolveNode("n"); var t = 0; for (var i = 0; i < 1000; i++) { try { t += n.v; } catch (e) {} } t', WHERE),
    );
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'run-bridge-calls', event: 'calculate' });
  });

  it('the per-run counter resets for the next run but the form-run total does not, so many small scripts cannot add up to unbounded work', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { v: 1 });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({ limits: { runBridgeCalls: 40, formRunBridgeCalls: 70 } }, host);
    const script = 'var n = xfa.resolveNode("n"); for (var i = 0; i < 25; i++) { n.v; }';
    sandbox.evaluate(script);
    sandbox.evaluate(script);
    const error = expectScriptError(() => sandbox.evaluate(script));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'bridge-calls' });
  });

  it('slow host callbacks count against the whole-form time budget, so the sum of many scripts is bounded', async () => {
    const host = new FakeHost();
    const slow = host.addNode('field', {}, { slow: () => { busyWait(50); return UNDEF; } });
    host.onResolve('slow', nodeValue(slow));
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 1000, formRunDeadlineMs: 80 } }, host);
    sandbox.evaluate('xfa.resolveNode("slow").slow();');
    const error = expectScriptError(() => sandbox.evaluate('xfa.resolveNode("slow").slow(); for (;;) {}'));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'total-time' });
  });

  it('host work done outside any script counts against the whole-form time budget, so per-script preparation cannot run unbounded between scripts', async () => {
    const { sandbox } = await makeHarness({ limits: { formRunDeadlineMs: 80 } });
    expect(sandbox.withinRunBudget(() => { busyWait(50); return 'prepared'; })).toBe('prepared');
    const error = expectScriptError(() => sandbox.withinRunBudget(() => busyWait(50), () => WHERE));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'total-time', event: 'calculate', nodeSom: 'form1.page1.amount' });
    expect(sandbox.closed).toBe(true);
    expect(sandbox.usage.elapsedMs).toBeGreaterThanOrEqual(80);
  });

  it('once the form-run budget is spent by host work the sandbox is closed, and later host work is refused without running', async () => {
    const { sandbox } = await makeHarness({ limits: { formRunDeadlineMs: 40 } });
    expectScriptError(() => sandbox.withinRunBudget(() => busyWait(60)));
    let ran = false;
    expect(expectScriptError(() => sandbox.withinRunBudget(() => { ran = true; })).code).toBe('SANDBOX_CLOSED');
    expect(ran).toBe(false);
  });

  it('a script run inside budgeted host work is counted once, so preparation plus evaluate are not double-charged', async () => {
    const host = new FakeHost();
    const slow = host.addNode('field', {}, { slow: () => { busyWait(50); return UNDEF; } });
    host.onResolve('slow', nodeValue(slow));
    const { sandbox } = await makeHarness({ limits: { formRunDeadlineMs: 80 } }, host);
    sandbox.withinRunBudget(() => sandbox.evaluate('xfa.resolveNode("slow").slow();'));
    expect(sandbox.usage.elapsedMs).toBeGreaterThanOrEqual(50);
    expect(sandbox.usage.elapsedMs).toBeLessThan(80);
    expect(sandbox.closed).toBe(false);
  });

  it('host work inside a running script is not charged a second time, so a nested execEvent preparation costs what it took', async () => {
    const host = new FakeHost();
    const holder: { run?: () => void } = {};
    const node = host.addNode('field', {}, { prepare: () => { holder.run?.(); return UNDEF; } });
    host.onResolve('n', nodeValue(node));
    const { sandbox } = await makeHarness({ limits: { formRunDeadlineMs: 80 } }, host);
    holder.run = () => sandbox.withinRunBudget(() => busyWait(50));
    sandbox.evaluate('xfa.resolveNode("n").prepare();');
    expect(sandbox.usage.elapsedMs).toBeLessThan(80);
    expect(sandbox.closed).toBe(false);
  });

  it('usage reports runs, bridge calls and elapsed time, so the engine can show how close a form came to its budget', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { v: 1 });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({}, host);
    sandbox.evaluate('xfa.resolveNode("n").v;');
    sandbox.evaluate('1;');
    expect(sandbox.usage.runs).toBe(2);
    expect(sandbox.usage.bridgeCalls).toBe(2);
    expect(sandbox.usage.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});

describe('re-entrancy (a host method calling back into the sandbox, e.g. execEvent)', () => {
  it('a nested evaluate returns its value to the outer script, so execEvent can run another event script', async () => {
    const host = new FakeHost();
    const holder: { run?: (src: string) => BridgeValue } = {};
    const node = host.addNode('field', {}, { nest: () => holder.run?.('40 + 2') ?? null });
    host.onResolve('n', nodeValue(node));
    const { sandbox } = await makeHarness({}, host);
    holder.run = (src) => sandbox.evaluate(src);
    expect(sandbox.evaluate('xfa.resolveNode("n").nest() + 1')).toBe(43);
  });

  it('unbounded mutual re-entry is capped with SCRIPT_LIMIT, so an event that triggers itself cannot exhaust the wasm stack', async () => {
    const host = new FakeHost();
    const holder: { run?: (src: string) => BridgeValue } = {};
    const node = host.addNode('field', {}, { again: () => holder.run?.('xfa.resolveNode("n").again()') ?? null });
    host.onResolve('n', nodeValue(node));
    const { sandbox } = await makeHarness({ limits: { nestedEvaluations: 4 } }, host);
    holder.run = (src) => sandbox.evaluate(src);
    const error = expectScriptError(() => sandbox.evaluate('xfa.resolveNode("n").again()', WHERE));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'nesting' });
    expect(sandbox.closed).toBe(true);
  });

  it('a fatal error inside a nested evaluate aborts the outer script too, and the sandbox is torn down once the outermost call returns', async () => {
    const host = new FakeHost();
    const holder: { run?: (src: string) => BridgeValue } = {};
    const node = host.addNode('field', {}, { inner: () => holder.run?.('while (true) {}') ?? null });
    host.onResolve('n', nodeValue(node));
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 60 } }, host);
    holder.run = (src) => sandbox.evaluate(src);
    const error = expectScriptError(() => sandbox.evaluate('try { xfa.resolveNode("n").inner(); } catch (e) {} "after"'));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'deadline' });
    expect(sandbox.closed).toBe(true);
  });
});
