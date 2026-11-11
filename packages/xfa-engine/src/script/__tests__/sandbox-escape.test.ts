import { afterEach, describe, expect, it } from 'vitest';
import { UNDEF, nodeValue, type HostReply } from '../bridge-types.js';
import { XfaScriptError } from '../errors.js';
import { FakeHost } from './fake-host.js';
import { afterEachDispose, expectScriptError, makeHarness } from './helpers.js';

afterEach(afterEachDispose);

/** Global names a fresh QuickJS context plus our three XFA globals may have. Anything else is a surprise to investigate. */
const EXPECTED_GLOBALS = new Set([
  'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'AggregateError', 'Array', 'Object', 'Function', 'Iterator', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', 'unescape', 'Infinity', 'NaN',
  'undefined', 'eval', 'Number', 'Boolean', 'String', 'Math', 'Reflect', 'Symbol', 'globalThis', 'BigInt', 'Date',
  'RegExp', 'JSON', 'Map', 'Set', 'WeakMap', 'WeakSet', 'ArrayBuffer', 'SharedArrayBuffer',
  'Uint8ClampedArray', 'Int8Array', 'Uint8Array', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array',
  'BigInt64Array', 'BigUint64Array', 'Float16Array', 'Float32Array', 'Float64Array', 'DataView',
  'xfa', 'app', 'console',
]);

describe('escape attempts reach only guest objects (A4)', () => {
  it('no host capability exists as a global, so a script cannot reach files, network, timers or the bridge itself', async () => {
    const { sandbox } = await makeHarness();
    const names = [
      'process', 'require', 'module', 'exports', 'Buffer', 'fetch', 'XMLHttpRequest', 'WebSocket', 'setTimeout',
      'setInterval', 'setImmediate', 'queueMicrotask', 'importScripts', 'WebAssembly', 'window', 'document', 'self',
      'global', 'std', 'os', 'print', 'scriptArgs', '__get', '__set', '__call', '__resolve', '__host', '__log', 'B',
      'localStorage', 'postMessage',
    ];
    const present = sandbox.evaluate(`var names = ${JSON.stringify(names)}; var out = []; for (var i = 0; i < names.length; i++) { if (typeof globalThis[names[i]] !== "undefined") out.push(names[i]); } out`);
    expect(present).toEqual([]);
  });

  it('the set of global names is exactly the known allowlist, so a runtime upgrade that adds a global is noticed', async () => {
    const { sandbox } = await makeHarness();
    const names = sandbox.evaluate('Object.getOwnPropertyNames(globalThis)');
    expect(Array.isArray(names)).toBe(true);
    const unexpected = (names as string[]).filter((n) => !EXPECTED_GLOBALS.has(n));
    expect(unexpected).toEqual([]);
  });

  it('Function("return this")() and constructor chains only return the guest global, never anything of the host', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'var g1 = Function("return this")(); var g2 = (function(){}).constructor("return this")(); var g3 = [].constructor.constructor("return this")(); var g4 = this.constructor.constructor("return this")(); [g1 === globalThis, g2 === globalThis, g3 === globalThis, g4 === globalThis, typeof g1.process, typeof g2.require, typeof g3.__get, typeof Function("return typeof process")()]',
    );
    expect(out).toEqual([true, true, true, true, 'undefined', 'undefined', 'undefined', 'string']);
    expect(sandbox.evaluate('Function("return typeof process")()')).toBe('undefined');
  });

  it('the xfa/app/console proxies expose no own keys and no path to the bridge, so enumeration and prototype walks find nothing to steal', async () => {
    const { sandbox } = await makeHarness({ strict: false });
    const out = sandbox.evaluate(
      'var seen = []; var objs = [xfa, app, console]; for (var i = 0; i < objs.length; i++) { var o = objs[i]; for (var k in o) seen.push(k); seen.push(Object.getOwnPropertyNames(o).length); var p = Object.getPrototypeOf(o); seen.push(p === Object.prototype); } seen',
    );
    expect(out).toEqual([0, true, 0, true, 0, true]);
  });

  it('xfa, app and console are installed read-only and hidden from enumeration, so a stray assignment in one script does not silently re-point the others', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'var out = []; var names = ["xfa", "app", "console"]; for (var i = 0; i < names.length; i++) { var d = Object.getOwnPropertyDescriptor(globalThis, names[i]); out.push(d.writable, d.configurable, d.enumerable); } out',
    );
    expect(out).toEqual([false, false, false, false, false, false, false, false, false]);
  });

  it('Date cannot be restored to the original constructor, so the injected clock cannot be bypassed', async () => {
    const { sandbox } = await makeHarness({ clock: { now: () => 5 } });
    const out = sandbox.evaluate(
      'var D = Object.getPrototypeOf(new Date()).constructor; var viaProto = new D().getTime(); var viaFn = Function("return new Date().getTime()")(); [viaProto, viaFn, Date === D]',
    );
    expect(out).toEqual([5, 5, true]);
  });

  it('reading constructor or __proto__ on a node never asks the host, so a table-backed host cannot be poisoned by member names', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', {});
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({ strict: false }, host);
    sandbox.evaluate('var n = xfa.resolveNode("n"); n.constructor; n.__proto__; n.prototype; n.__proto__ = "x"; n.constructor = 5; n["__proto__"];');
    expect(host.traffic.filter((t) => /constructor|__proto__|prototype/.test(t))).toEqual([]);
    expect(host.logs.map((l) => (l.payload as { member: string }).member)).toEqual([
      'constructor', '__proto__', 'prototype', '__proto__', 'constructor', '__proto__',
    ]);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('the same member names are refused on host services and dotted segments, so app.__proto__ never reaches the host', async () => {
    const host = new FakeHost();
    const { sandbox } = await makeHarness({ strict: false }, host);
    sandbox.evaluate('app.__proto__; app.constructor = 1; console.prototype; xfa.host.__proto__;');
    expect(host.traffic.filter((t) => t.startsWith('host:'))).toEqual([]);
  });

  it('a plain object cannot be passed to the host (only primitives, arrays and nodes), so guest objects never become host objects', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { rawValue: 'x' });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({}, host);
    const out = sandbox.evaluate(
      'var n = xfa.resolveNode("n"); var r = []; try { n.rawValue = { a: 1 }; } catch (e) { r.push(e.name); } try { n.rawValue = function(){}; } catch (e) { r.push(e.name); } try { n.rawValue = new Date(0); } catch (e) { r.push(e.name); } r',
    );
    expect(out).toEqual(['TypeError', 'TypeError', 'TypeError']);
    expect(host.sets).toEqual([]);
  });

  it('an oversized value is a typed SCRIPT_LIMIT before it reaches the host, so a script cannot push megabytes through the bridge', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { rawValue: 'x' });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({ limits: { payloadChars: 2000 } }, host);
    const error = expectScriptError(() => sandbox.evaluate('xfa.resolveNode("n").rawValue = new Array(5000).join("x");'));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'payload' });
    expect(host.sets).toEqual([]);
  });

  it('an oversized host reply is a typed SCRIPT_LIMIT, so a buggy or hostile data string cannot flood the guest heap', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { big: 'y'.repeat(5000) });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({ limits: { payloadChars: 2000 } }, host);
    const error = expectScriptError(() => sandbox.evaluate('xfa.resolveNode("n").big'));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'payload' });
  });

  it('an oversized script result is a typed SCRIPT_LIMIT, so the final return value cannot be used to flood the host', async () => {
    const { sandbox } = await makeHarness({ limits: { payloadChars: 2000 } });
    const error = expectScriptError(() => sandbox.evaluate('new Array(5000).join("z")'));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'payload' });
  });
});

describe('a misbehaving host cannot confuse the guest (A4)', () => {
  async function withReply(reply: HostReply, options: Parameters<typeof makeHarness>[0] = {}) {
    const host = new FakeHost();
    const n = host.addNode('field', { weird: reply });
    host.onResolve('n', nodeValue(n));
    return { ...(await makeHarness(options, host)), host };
  }

  it.each<[string, unknown]>([
    ['unknown tag', { $t: 'proto' }],
    ['node with an extra key', { $t: 'node', id: 1, cls: 'x', secret: 'boom' }],
    ['node id that is not an integer', { $t: 'node', id: 1.5, cls: 'x' }],
    ['negative node id', { $t: 'node', id: -1, cls: 'x' }],
    ['plain host object', { rawValue: 'x' }],
    ['__proto__ key', JSON.parse('{"__proto__":{"polluted":true}}')],
    ['array nested beyond the depth cap', [[[[[[[[[[1]]]]]]]]]]],
    ['a function', () => 1],
  ])('a reply of shape "%s" is a typed BRIDGE_VIOLATION and fails the sandbox closed', async (_name, bad) => {
    const { sandbox } = await withReply(bad as HostReply);
    const error = expectScriptError(() => sandbox.evaluate('try { xfa.resolveNode("n").weird; } catch (e) {} 1'));
    expect(error.code).toBe('BRIDGE_VIOLATION');
    expect(sandbox.closed).toBe(true);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('a host exception is fatal and cannot be swallowed by the script, so a host bug never looks like script success', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', {}, { boom: () => { throw new Error('host bug'); } });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({}, host);
    const error = expectScriptError(() => sandbox.evaluate('try { xfa.resolveNode("n").boom(); } catch (e) {} "survived"', WHERE_SOM));
    expect(error.code).toBe('HOST_ERROR');
    expect(error.cause).toBeInstanceOf(Error);
    expect((error.cause as Error).message).toBe('host bug');
    expect(sandbox.closed).toBe(true);
  });

  it('a typed error thrown by the host surfaces unchanged, so the event engine can raise its own coded errors through the bridge', async () => {
    const mine = new XfaScriptError('SCRIPT_ERROR', 'engine says no');
    const host = new FakeHost();
    const n = host.addNode('field', {}, { boom: () => { throw mine; } });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({}, host);
    const error = expectScriptError(() => sandbox.evaluate('xfa.resolveNode("n").boom();'));
    expect(error).toBe(mine);
  });

  it('a host that throws from set is also fatal, so write failures are not lost', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { rawValue: 'x' });
    host.onResolve('n', nodeValue(n));
    host.set = () => { throw new TypeError('read-only form'); };
    const { sandbox } = await makeHarness({}, host);
    const error = expectScriptError(() => sandbox.evaluate('xfa.resolveNode("n").rawValue = "y";'));
    expect(error.code).toBe('HOST_ERROR');
  });

  it('a reply that is a valid value still works after an earlier error reply, so error handling is per call', async () => {
    const { sandbox } = await withReply(UNDEF);
    expect(sandbox.evaluate('typeof xfa.resolveNode("n").weird')).toBe('undefined');
  });
});

const WHERE_SOM = { event: 'initialize', nodeSom: 'form1.sub.field' } as const;
