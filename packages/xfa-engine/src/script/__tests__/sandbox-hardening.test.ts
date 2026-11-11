import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';
import { UNDEF, nodeValue } from '../bridge-types.js';
import { XfaScriptError } from '../errors.js';
import { isHostStackOverflow } from '../guest-error.js';
import { FakeHost } from './fake-host.js';
import { afterEachDispose, expectScriptError, makeHarness } from './helpers.js';

afterEach(afterEachDispose);

const CANARY = 'xfa.resolveNode("canary")';

describe('describing a thrown value never runs guest accessors (P2T05-F1)', () => {
  it.each([
    ['a message getter that allocates until the heap is gone', `throw { get message() { ${CANARY}; var s = "x"; for (;;) s += s; } }`],
    ['a name getter that spins', `throw { get name() { ${CANARY}; for (;;) {} } }`],
    ['a stack getter that allocates', `throw { get stack() { ${CANARY}; var a = []; for (;;) a.push({}); } }`],
    ['a getter inherited from a prototype', `var p = { get message() { ${CANARY}; for (;;) {} } }; throw Object.create(p)`],
    ['a getter installed on a real Error', `var e = new Error("x"); Object.defineProperty(e, "message", { get: function () { ${CANARY}; for (;;) {} } }); throw e`],
    ['a toString that allocates', `throw { toString: function () { ${CANARY}; var s = "x"; for (;;) s += s; } }`],
  ])('%s is reported as an ordinary script error without invoking it, so a thrown object cannot run code after the limits were lifted', async (_name, src) => {
    const host = new FakeHost();
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 400 } }, host);
    const started = performance.now();
    const error = expectScriptError(() => sandbox.evaluate(src));
    expect(error.code).toBe('SCRIPT_ERROR');
    expect(host.traffic).not.toContain('resolve:0:canary');
    expect(performance.now() - started).toBeLessThan(300);
    expect(sandbox.closed).toBe(false);
    expect(sandbox.evaluate('1 + 1')).toBe(2);
  });

  it('primitive throws keep their text, so `throw "message"` style forms remain diagnosable', async () => {
    const { sandbox } = await makeHarness();
    expect(expectScriptError(() => sandbox.evaluate('throw "plain text"')).message).toContain('plain text');
    expect(expectScriptError(() => sandbox.evaluate('throw 42')).message).toContain('42');
    expect(expectScriptError(() => sandbox.evaluate('throw null')).code).toBe('SCRIPT_ERROR');
    expect(expectScriptError(() => sandbox.evaluate('throw undefined')).code).toBe('SCRIPT_ERROR');
  });

  it('an ordinary Error still reports name, message and stack, so the accessor-free path loses no diagnostics', async () => {
    const { sandbox } = await makeHarness();
    const error = expectScriptError(() => sandbox.evaluate('function inner(){ throw new TypeError("bad thing"); } inner()'));
    expect(error.message).toContain('TypeError: bad thing');
    expect(error.guestStack).toContain('inner');
  });

  it('the heap cap used while reading an error is finite, so even a retained 8 MiB hoard cannot grow the WASM heap without bound', async () => {
    const { sandbox } = await makeHarness({ limits: { memoryLimitBytes: 8 * 1024 * 1024 } });
    const error = expectScriptError(() =>
      sandbox.evaluate('var hoard = []; try { for (;;) hoard.push({ k: hoard.length, v: "abc" + hoard.length }); } catch (e) {} throw { get message() { var big = []; for (;;) big.push({}); } }', { global: true }),
    );
    expect(['SCRIPT_ERROR', 'SCRIPT_LIMIT']).toContain(error.code);
  });
});

describe('limit classification is by internal error identity, not message text (P2T05-F10)', () => {
  it.each(['stack overflow', 'out of memory', 'string too long', 'interrupted'])(
    'a script that throws new Error("%s") is an ordinary script error and does not close the sandbox',
    async (message) => {
      const { sandbox } = await makeHarness();
      const error = expectScriptError(() => sandbox.evaluate(`throw new Error("${message}")`));
      expect(error.code).toBe('SCRIPT_ERROR');
      expect(sandbox.closed).toBe(false);
    },
  );

  it('look-alike objects and SyntaxErrors with the same text are not limits either', async () => {
    const { sandbox } = await makeHarness();
    expect(expectScriptError(() => sandbox.evaluate('throw { name: "InternalError", message: "stack overflow" }')).code).toBe('SCRIPT_ERROR');
    expect(expectScriptError(() => sandbox.evaluate('throw new SyntaxError("stack overflow")')).code).toBe('SCRIPT_ERROR');
    expect(sandbox.closed).toBe(false);
  });

  it('a real engine stack overflow and out-of-memory are still limits', async () => {
    const a = await makeHarness();
    expect(expectScriptError(() => a.sandbox.evaluate('function f(){ return f() + 1; } f()')).limit).toBe('stack');
    const b = await makeHarness({ limits: { memoryLimitBytes: 8 * 1024 * 1024 } });
    expect(expectScriptError(() => b.sandbox.evaluate('var a = []; for (;;) a.push({});')).limit).toBe('memory');
  });

  it('eval recursion ends as a typed error either way and never hangs or aborts the module', async () => {
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 500 } });
    const error = expectScriptError(() => sandbox.evaluate('function f(){ return eval("f()"); } f()'));
    expect(['SCRIPT_ERROR', 'SCRIPT_LIMIT']).toContain(error.code);
  });
});

describe('host stack overflow recognition (P2T05-F11)', () => {
  it.each([
    ['V8 / Node', new RangeError('Maximum call stack size exceeded')],
    ['Safari', new RangeError('Maximum call stack size exceeded.')],
    ['Firefox', Object.assign(new Error('too much recursion'), { name: 'InternalError' })],
  ])('%s overflow is recognised', (_browser, error) => {
    expect(isHostStackOverflow(error)).toBe(true);
  });

  it('unrelated errors are not mistaken for it', () => {
    expect(isHostStackOverflow(new RangeError('invalid array length'))).toBe(false);
    expect(isHostStackOverflow(new Error('boom'))).toBe(false);
    expect(isHostStackOverflow('too much recursion')).toBe(false);
  });
});

describe('array-length guard coerces like the engine (P2T05-F2)', () => {
  it.each([
    ['a numeric string length', 'Array.prototype.indexOf.call({ length: "4294967295" }, 1)'],
    ['a fractional length', 'Array.prototype.indexOf.call({ length: 4294967295.5 }, 1)'],
    ['an object length with valueOf', 'Array.prototype.indexOf.call({ length: { valueOf: function () { return 4294967295; } } }, 1)'],
    ['an accessor length that changes between reads', 'var calls = 0; Array.prototype.indexOf.call({ get length() { return calls++ ? 4294967295 : 0; } }, 1)'],
    ['a prototype-inherited length', 'function F() {} F.prototype.length = 4294967295; Array.prototype.join.call(new F(), "")'],
    ['a spreadable array-like passed to concat', 'var o = { length: 4294967295 }; o[Symbol.isConcatSpreadable] = true; [].concat(o)'],
    ['Array.from over an array-like', 'Array.from({ length: 4294967295 })'],
    ['a length just over the cap through slice.call', 'Array.prototype.slice.call({ length: 4194305 })'],
  ])('%s is a typed SCRIPT_LIMIT, not a hang', async (_name, src) => {
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 400 } });
    const started = performance.now();
    expect(expectScriptError(() => sandbox.evaluate(src))).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'array-length' });
    expect(performance.now() - started).toBeLessThan(1500);
  });

  it('legitimate array-likes still work, so the guard does not break arguments, strings or small objects', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      '[Array.prototype.slice.call({ 0: "a", 1: "b", length: 2 }).join(""), Array.prototype.join.call("abc", "-"), (function () { return Array.prototype.slice.call(arguments).length; })(1, 2, 3), Array.prototype.indexOf.call({ length: "2", 1: "x" }, "x"), Array.from({ length: 3 }).length, [].concat([1], { length: 1, 0: "z" }).length]',
    );
    expect(out).toEqual(['ab', 'a-b-c', 3, 1, 3, 2]);
  });

  it('there is no Proxy for the script to put in front of an array, so a length trap cannot lie to the guard', async () => {
    const { sandbox } = await makeHarness();
    expect(sandbox.evaluate('typeof Proxy')).toBe('undefined');
  });
});

describe('iterator-protocol consumers are guarded (P2T05-F3)', () => {
  const sparse = 'var a = []; a[4294967294] = 1; ';
  it.each([
    ['values()', 'a.values()'],
    ['keys()', 'a.keys()'],
    ['entries()', 'a.entries()'],
    ['[Symbol.iterator]()', 'a[Symbol.iterator]()'],
    ['new Set(a)', 'new Set(a)'],
    ['new Map(a)', 'new Map(a)'],
    ['Array.from(a)', 'Array.from(a)'],
    ['spread', '[].concat([...a])'],
    ['for-of', 'for (var v of a) {}'],
    ['Object.fromEntries(a)', 'Object.fromEntries(a)'],
    ['new Uint8Array(a)', 'new Uint8Array(a)'],
    ['Uint8Array.from(a)', 'Uint8Array.from(a)'],
  ])('%s over a billion-element array is a typed SCRIPT_LIMIT immediately', async (_name, body) => {
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 1000 } });
    const started = performance.now();
    expect(expectScriptError(() => sandbox.evaluate(sparse + body))).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'array-length' });
    expect(performance.now() - started).toBeLessThan(400);
  });

  it('ordinary iteration still works and values is still the default iterator, so for-of, spread and Set are unchanged', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'var t = []; for (var v of [1, 2, 3]) t.push(v); [t.join(""), [...[4, 5]].length, new Set([1, 1, 2]).size, Array.prototype.values === Array.prototype[Symbol.iterator], Array.from("ab").join(""), Object.fromEntries([["k", 1]]).k]',
    );
    expect(out).toEqual(['123', 2, 2, true, 'ab', 1]);
  });
});

describe('node ids cannot be forged through a list (P2T05-F4)', () => {
  async function withList() {
    const host = new FakeHost();
    const a = host.addNode('field', {});
    const b = host.addNode('field', {});
    const sink = host.addNode('subform', {}, { take: () => UNDEF });
    host.onResolve('items', { $t: 'nodes', nodes: [a, b] });
    host.onResolve('sink', nodeValue(sink));
    return { ...(await makeHarness({}, host)), a, b, sink };
  }

  it('a list exposes no symbol or hidden property that holds its member ids, so there is nothing to edit', async () => {
    const { sandbox } = await withList();
    const out = sandbox.evaluate(
      'var l = xfa.resolveNodes("items"); [Object.getOwnPropertySymbols(l).length, Object.getOwnPropertyNames(l).join(",")]',
    );
    expect(out).toEqual([0, '0,1,length,item']);
  });

  it('a list sent back to the host carries the real ids, so legitimate round-trips still work', async () => {
    const { sandbox, host, a, b, sink } = await withList();
    sandbox.evaluate('xfa.resolveNode("sink").take(xfa.resolveNodes("items"));');
    expect(host.traffic).toContain(`call:${sink.id}:take`);
    expect(a.id).not.toBe(b.id);
  });

  it('replacing a list entry with a made-up id object is refused in the guest and the host is never called with it', async () => {
    const { sandbox, host, sink } = await withList();
    const out = sandbox.evaluate(
      'var l = xfa.resolveNodes("items"); l[0] = { id: 999, cls: "field" }; var r; try { xfa.resolveNode("sink").take(l); r = "sent"; } catch (e) { r = e.name; } r',
    );
    expect(out).toBe('TypeError');
    expect(host.traffic.filter((t) => t === `call:${sink.id}:take`)).toEqual([]);
  });

  it('a hand-built object with id/cls fields is not accepted as a node, so ids cannot be minted by the script', async () => {
    const { sandbox, host } = await withList();
    const out = sandbox.evaluate('var r; try { xfa.resolveNode("sink").take({ $t: "node", id: 5, cls: "field" }); r = "sent"; } catch (e) { r = e.name; } r');
    expect(out).toBe('TypeError');
    expect(host.traffic.filter((t) => t.startsWith('call:'))).toEqual([]);
  });
});

describe('bridge callbacks all fail through one fatal path (P2T05-F5)', () => {
  it('a clock that throws is a fatal HOST_ERROR and the script cannot catch it', async () => {
    const { sandbox } = await makeHarness({ clock: { now: () => { throw new Error('clock broke'); } } });
    const error = expectScriptError(() => sandbox.evaluate('try { new Date(); } catch (e) {} "survived"'));
    expect(error.code).toBe('HOST_ERROR');
    expect((error.cause as Error).message).toBe('clock broke');
    expect(sandbox.closed).toBe(true);
  });

  it('a typed error from the clock surfaces unchanged', async () => {
    const mine = new XfaScriptError('SCRIPT_ERROR', 'no clock available');
    const { sandbox } = await makeHarness({ clock: { now: () => { throw mine; } } });
    expect(expectScriptError(() => sandbox.evaluate('Date.now()'))).toBe(mine);
  });

  it('a clock that returns a non-number is a fatal BRIDGE_VIOLATION, so the guest never sees NaN time', async () => {
    const { sandbox } = await makeHarness({ clock: { now: () => Number.NaN } });
    expect(expectScriptError(() => sandbox.evaluate('Date.now()')).code).toBe('BRIDGE_VIOLATION');
  });

  it.each([
    ['clock is not an object', { clock: 5 }],
    ['clock.now is not a function', { clock: { now: 'later' } }],
    ['host is missing methods', { host: {} }],
    ['host is null', { host: null }],
  ])('invalid options (%s) are a typed INVALID_OPTIONS', async (_name, bad) => {
    await expect(makeHarness(bad as never)).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
  });
});

describe('the script cannot reach the prelude through engine introspection (P2T05-F9)', () => {
  it('this QuickJS build has no Error.prepareStackTrace / captureStackTrace hook, and assigning one has no effect', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'var called = false; Error.prepareStackTrace = function () { called = true; return "pwned"; }; var s = new Error("x").stack; [typeof Error.captureStackTrace, called, s === "pwned"]',
    );
    expect(out).toEqual(['undefined', false, false]);
  });

  it('caller / callee.caller / arguments.caller give a script no function of the prelude', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'function probe() { var seen = []; try { seen.push(typeof probe.caller); } catch (e) { seen.push("threw"); } try { seen.push(typeof arguments.callee.caller); } catch (e) { seen.push("threw"); } try { seen.push(typeof arguments.caller); } catch (e) { seen.push("threw"); } return seen; } probe()',
    );
    expect(out).toEqual(['undefined', 'undefined', 'undefined']);
    const top = sandbox.evaluate('var r; try { r = typeof arguments.callee.caller; } catch (e) { r = "threw"; } r');
    expect(['undefined', 'threw']).toContain(top);
  });

  it('a function called back from the bridge cannot walk to its caller either', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { v: 1 }, { m: () => 1 });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({}, host);
    const out = sandbox.evaluate(
      'var node = xfa.resolveNode("n"); var target = { toString: function () { var c; try { c = typeof arguments.callee.caller; } catch (e) { c = "threw"; } return c; } }; "" + target',
    );
    expect(['undefined', 'threw']).toContain(out);
  });
});

describe('the prelude does not depend on mutable globals (P2T05-F12)', () => {
  it('replacing eval in global mode cannot hijack the script runner', async () => {
    const { sandbox } = await makeHarness();
    sandbox.evaluate('eval = function () { return "HIJACKED"; };', { global: true });
    expect(sandbox.evaluate('1 + 1')).toBe(2);
    sandbox.evaluate('Object.defineProperty(globalThis, "eval", { value: function () { return "HIJACKED"; } });', { global: true });
    expect(sandbox.evaluate('2 + 2')).toBe(4);
  });

  it('replacing the built-ins the prelude uses cannot break or redirect the bridge', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { v: 7 }, { m: () => 'called' });
    host.onResolve('n', nodeValue(n));
    host.onResolve('all', { $t: 'nodes', nodes: [n] });
    const { sandbox } = await makeHarness({}, host);
    sandbox.evaluate(
      'var boom = function () { throw new Error("hijacked"); }; Number = boom; String = boom; isFinite = boom; Math.floor = boom; Error = boom; TypeError = boom; Symbol = boom; Object.getOwnPropertyDescriptor = boom; Object.getPrototypeOf = boom; Object.defineProperty = boom; Object.create = boom; JSON.parse = boom; JSON.stringify = boom; Array.isArray = boom; Map = boom; WeakMap = boom;',
      { global: true },
    );
    const out = sandbox.evaluate('var node = xfa.resolveNode("n"); node.v = node.v + 1; [node.v, node.m(), xfa.resolveNodes("all").length]');
    expect(out).toEqual([8, 'called', 1]);
  });
});

describe('WASM loading option (P2T05-F13)', () => {
  const wasmPath = createRequire(import.meta.url).resolve('@jitl/quickjs-wasmfile-release-sync/wasm');

  function wasmBytes(): ArrayBuffer {
    const buf = readFileSync(wasmPath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  it('explicit wasm bytes are used, so a browser can supply them from a CDN or bundle', async () => {
    const { sandbox } = await makeHarness({ wasm: { wasmBinary: wasmBytes() } });
    expect(sandbox.evaluate('6 * 7')).toBe(42);
  });

  it('garbage bytes make creation fail with a typed error, which proves the option reaches the loader', async () => {
    await expect(makeHarness({ wasm: { wasmBinary: new Uint8Array([1, 2, 3, 4]).buffer } })).rejects.toMatchObject({ code: 'HOST_ERROR' });
  });

  it('a pre-compiled module can be shared across sandboxes, so compile cost is paid once', async () => {
    const compiled = new WebAssembly.Module(wasmBytes());
    const a = await makeHarness({ wasm: { wasmModule: compiled } });
    const b = await makeHarness({ wasm: { wasmModule: compiled } });
    expect([a.sandbox.evaluate('1 + 1'), b.sandbox.evaluate('2 + 2')]).toEqual([2, 4]);
  });

  it('a location that does not exist fails typed, not with a raw filesystem error', async () => {
    await expect(makeHarness({ wasm: { wasmLocation: '/nonexistent/quickjs.wasm' } })).rejects.toMatchObject({ code: 'HOST_ERROR' });
  });

  it('unknown wasm option keys are refused', async () => {
    await expect(makeHarness({ wasm: { bogus: true } as never })).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
  });
});

describe('limits can only be tightened (P2T05-F14)', () => {
  it('a stack limit above the measured-safe default is refused, because above it the engine overflows the host stack first', async () => {
    await expect(makeHarness({ limits: { stackLimitBytes: 512 * 1024 } })).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
    await expect(makeHarness({ limits: { stackLimitBytes: 256 * 1024 + 1 } })).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
  });

  it('a smaller stack limit is accepted', async () => {
    const { sandbox } = await makeHarness({ limits: { stackLimitBytes: 64 * 1024 } });
    expect(sandbox.evaluate('1')).toBe(1);
  });
});

describe('limit tests that can fail (P2T05-F15)', () => {
  const depth = 'function f(n) { return n === 0 ? 0 : 1 + f(n - 1); } f(800)';

  it('a recursion that fits the default stack cap overflows a 64 KiB cap, so removing setMaxStackSize would fail this test', async () => {
    const roomy = await makeHarness();
    expect(roomy.sandbox.evaluate(depth)).toBe(800);
    const tight = await makeHarness({ limits: { stackLimitBytes: 64 * 1024 } });
    expect(expectScriptError(() => tight.sandbox.evaluate(depth))).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'stack' });
  });

  it('catastrophic regexp backtracking is stopped by the deadline, so ReDoS cannot hang a form run', async () => {
    const { sandbox } = await makeHarness({ limits: { runDeadlineMs: 150 } });
    const started = performance.now();
    const error = expectScriptError(() => sandbox.evaluate(`/(a+)+$/.test("${'a'.repeat(40)}b")`));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'deadline' });
    expect(performance.now() - started).toBeLessThan(2000);
  });
});

describe('results nested deeper than the wire allows (P2T05-F16)', () => {
  it('a too-deep or cyclic result is reported as undefined instead of failing the whole sandbox', async () => {
    const { sandbox } = await makeHarness();
    expect(sandbox.evaluate('var a = []; var cur = a; for (var i = 0; i < 12; i++) { var n = []; cur[0] = n; cur = n; } a')).toEqual({ $t: 'undef' });
    expect(sandbox.evaluate('var c = []; c[0] = c; c')).toEqual({ $t: 'undef' });
    expect(sandbox.closed).toBe(false);
    expect(sandbox.evaluate('[[1, [2, [3]]]]')).toEqual([[1, [2, [3]]]]);
  });

  it('a too-deep argument is a catchable TypeError in the script and never reaches the host', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { rawValue: 'x' });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({}, host);
    const out = sandbox.evaluate(
      'var a = []; var cur = a; for (var i = 0; i < 12; i++) { var m = []; cur[0] = m; cur = m; } var r; try { xfa.resolveNode("n").rawValue = a; r = "sent"; } catch (e) { r = e.name; } r',
    );
    expect(out).toBe('TypeError');
    expect(host.sets).toEqual([]);
    expect(sandbox.closed).toBe(false);
  });
});
