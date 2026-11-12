import { afterEach, describe, expect, it } from 'vitest';
import { nodeValue } from '../bridge-types.js';
import { FakeHost } from './fake-host.js';
import { afterEachDispose, expectScriptError, makeHarness } from './helpers.js';

afterEach(afterEachDispose);

// QuickJS aborts the whole WASM module ("Assertion failed: list_empty(&rt->gc_obj_list)") when a runtime is freed
// while any object/function handle is still live. Every disposal below therefore doubles as a handle-leak check.
describe('every QuickJS handle is released on every path', () => {
  it('create/evaluate/dispose repeated 30 times leaves no live object handle (the runtime free would abort otherwise)', async () => {
    for (let i = 0; i < 30; i++) {
      const host = new FakeHost();
      const n = host.addNode('field', { v: i }, { m: () => 1 });
      host.onResolve('n', nodeValue(n));
      const { sandbox } = await makeHarness({}, host);
      expect(sandbox.evaluate('var n = xfa.resolveNode("n"); n.m() + n.v + xfa.resolveNodes("x").length')).toBe(1 + i);
      sandbox.dispose();
    }
  });

  it('a sandbox that failed on each kind of fatal error disposes cleanly', async () => {
    const cases: { name: string; src: string; setup?: (h: FakeHost) => void; opts?: Parameters<typeof makeHarness>[0] }[] = [
      { name: 'deadline', src: 'for (;;) {}', opts: { limits: { runDeadlineMs: 30 } } },
      { name: 'memory', src: 'var a = []; for (;;) a.push({});', opts: { limits: { memoryLimitBytes: 4 * 1024 * 1024 } } },
      { name: 'stack', src: 'function f(){ return f(); } f()' },
      { name: 'strict unsupported', src: 'xfa.nosuch' },
      { name: 'host error', src: 'xfa.boom()', setup: (h) => { h.node(h.root).methods.set('boom', () => { throw new Error('x'); }); } },
    ];
    for (const c of cases) {
      const host = new FakeHost();
      c.setup?.(host);
      const { sandbox } = await makeHarness(c.opts ?? {}, host);
      expectScriptError(() => sandbox.evaluate(c.src));
      expect(sandbox.closed, c.name).toBe(true);
      expect(sandbox.teardownFailure, c.name).toBeUndefined();
      sandbox.dispose();
    }
    const after = await makeHarness();
    expect(after.sandbox.evaluate('1')).toBe(1);
  });

  it('a script error leaves the sandbox open and its heap does not grow across many runs, so long form runs do not leak guest objects', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { v: 1 });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({}, host);
    const run = (): void => {
      sandbox.evaluate('var n = xfa.resolveNode("n"); n.v; xfa.resolveNodes("none"); [1, 2, { }].length');
      expectScriptError(() => sandbox.evaluate('throw new Error("e")'));
    };
    for (let i = 0; i < 20; i++) run();
    const before = sandbox.diagnostics();
    for (let i = 0; i < 300; i++) run();
    const after = sandbox.diagnostics();
    expect(after.objectCount - before.objectCount).toBeLessThan(20);
    expect(after.memoryUsedBytes - before.memoryUsedBytes).toBeLessThan(64 * 1024);
  });

  it('dispose is idempotent and later use is a typed SANDBOX_CLOSED', async () => {
    const { sandbox } = await makeHarness();
    sandbox.dispose();
    sandbox.dispose();
    expect(sandbox.closed).toBe(true);
    expect(expectScriptError(() => sandbox.evaluate('1')).code).toBe('SANDBOX_CLOSED');
    expect(() => sandbox.diagnostics()).toThrow();
  });

  it('dispose called from inside a host callback is deferred until the outermost evaluate returns, so the context is never freed under a running script', async () => {
    const host = new FakeHost();
    const holder: { dispose?: () => void } = {};
    const node = host.addNode('field', {}, { stop: () => { holder.dispose?.(); return 5; } });
    host.onResolve('n', nodeValue(node));
    const { sandbox } = await makeHarness({}, host);
    holder.dispose = () => sandbox.dispose();
    expect(sandbox.evaluate('xfa.resolveNode("n").stop() + 1')).toBe(6);
    expect(sandbox.closed).toBe(true);
  });

  it('invalid options are a typed INVALID_OPTIONS, so a bad limit never starts a half-configured sandbox', async () => {
    await expect(makeHarness({ limits: { runDeadlineMs: -5 } })).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
    await expect(makeHarness({ limits: { bogus: 1 } as never })).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
  });
});
