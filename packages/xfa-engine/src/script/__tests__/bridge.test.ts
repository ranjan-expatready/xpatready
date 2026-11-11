import { describe, expect, it } from 'vitest';
import { Bridge } from '../bridge.js';
import { UNDEF, nodeValue } from '../bridge-types.js';
import { XfaScriptError } from '../errors.js';
import { DEFAULT_SANDBOX_LIMITS } from '../limits.js';
import { FakeHost } from './fake-host.js';
import { expectScriptError } from './helpers.js';

function makeBridge(host = new FakeHost(), strict = true, limits = DEFAULT_SANDBOX_LIMITS): { bridge: Bridge; host: FakeHost } {
  const bridge = new Bridge({ host, strict, limits });
  bridge.beginRun();
  return { bridge, host };
}

describe('Bridge wire validation (the host side of every guest call)', () => {
  it('a valid get is answered with the host reply as JSON, so the guest wrapper receives exactly what the host decided', () => {
    const { bridge, host } = makeBridge();
    const n = host.addNode('field', { rawValue: 'abc' });
    expect(JSON.parse(bridge.dispatch('get', JSON.stringify([n.id, 'rawValue'])))).toBe('abc');
  });

  it.each([
    ['not JSON', '{nope'],
    ['not an array', '{"id":1}'],
    ['wrong arity', '[1]'],
    ['string id', '["1","rawValue"]'],
    ['negative id', '[-1,"rawValue"]'],
    ['fractional id', '[1.5,"rawValue"]'],
    ['unsafe-integer id', '[9007199254740993,"rawValue"]'],
    ['empty member name', '[1,""]'],
    ['member name over the cap', `[1,"${'m'.repeat(500)}"]`],
    ['member that is not a string', '[1,5]'],
  ])('get with %s is a BRIDGE_VIOLATION, so a forged call cannot reach the host', (_name, payload) => {
    const { bridge, host } = makeBridge();
    host.addNode('field', { rawValue: 'abc' });
    const error = expectScriptError(() => bridge.dispatch('get', payload));
    expect(error.code).toBe('BRIDGE_VIOLATION');
    expect(host.traffic).toEqual([]);
  });

  it('a payload nested 200000 levels deep is a typed BRIDGE_VIOLATION, never a leaked RangeError', () => {
    const { bridge } = makeBridge();
    const deep = `[1,"x",${'['.repeat(200_000)}${']'.repeat(200_000)}]`;
    const error = expectScriptError(() => bridge.dispatch('set', deep));
    expect(error.code).toBe('BRIDGE_VIOLATION');
  });

  it('a set value with a __proto__ key is rejected before any host code runs, so prototype pollution via the bridge is impossible', () => {
    const { bridge, host } = makeBridge();
    const n = host.addNode('field', { rawValue: 'a' });
    const error = expectScriptError(() => bridge.dispatch('set', `[${n.id},"rawValue",{"__proto__":{"polluted":true}}]`));
    expect(error.code).toBe('BRIDGE_VIOLATION');
    expect(host.sets).toEqual([]);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('call arguments are validated element by element, so a smuggled plain object inside args is rejected', () => {
    const { bridge, host } = makeBridge();
    const n = host.addNode('field', {}, { m: () => UNDEF });
    expect(JSON.parse(bridge.dispatch('call', JSON.stringify([n.id, 'm', [1, 'two', null, true, [3]]])))).toEqual({ $t: 'undef' });
    const error = expectScriptError(() => bridge.dispatch('call', `[${n.id},"m",[{"a":1}]]`));
    expect(error.code).toBe('BRIDGE_VIOLATION');
  });

  it('call with more than the argument cap is rejected, so a script cannot allocate a million-element argument list in the host', () => {
    const { bridge, host } = makeBridge();
    const n = host.addNode('field', {}, { m: () => UNDEF });
    const error = expectScriptError(() => bridge.dispatch('call', JSON.stringify([n.id, 'm', new Array(1000).fill(1)])));
    expect(error.code).toBe('BRIDGE_VIOLATION');
  });

  it('a payload longer than the cap is a SCRIPT_LIMIT before parsing, so parse cost is bounded by the cap', () => {
    const { bridge } = makeBridge(new FakeHost(), true, { ...DEFAULT_SANDBOX_LIMITS, payloadChars: 100 });
    const error = expectScriptError(() => bridge.dispatch('set', `[1,"x","${'a'.repeat(200)}"]`));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'payload' });
  });

  it('a log payload with a __proto__ or constructor key is rejected, so diagnostics cannot be used to poison the host log sink', () => {
    const { bridge, host } = makeBridge();
    for (const payload of ['["note",{"__proto__":{"x":1}}]', '["note",{"constructor":{"prototype":{"x":1}}}]', '["note",{"a":{"prototype":1}}]']) {
      expect(expectScriptError(() => bridge.dispatch('log', payload)).code).toBe('BRIDGE_VIOLATION');
    }
    expect(host.logs).toEqual([]);
  });

  it('a log payload nested beyond the depth cap is rejected, so a log call cannot be a stack bomb', () => {
    const { bridge } = makeBridge();
    const deep = `["note",${'{"a":'.repeat(50)}1${'}'.repeat(50)}]`;
    expect(expectScriptError(() => bridge.dispatch('log', deep)).code).toBe('BRIDGE_VIOLATION');
  });

  it('an unknown log kind is a BRIDGE_VIOLATION, so the guest cannot invent new host-visible event types', () => {
    const { bridge } = makeBridge();
    expect(expectScriptError(() => bridge.dispatch('log', '["shell",{}]')).code).toBe('BRIDGE_VIOLATION');
  });

  it('an unsupported log is forwarded to the host in lenient mode and fatal in strict mode', () => {
    const lenient = makeBridge(new FakeHost(), false);
    lenient.bridge.dispatch('log', '["unsupported",{"class":"field","member":"x"}]');
    expect(lenient.host.logs).toEqual([{ kind: 'unsupported', payload: { class: 'field', member: 'x' } }]);

    const strict = makeBridge(new FakeHost(), true);
    const error = expectScriptError(() => strict.bridge.dispatch('log', '["unsupported",{"class":"field","member":"x"}]'));
    expect(error).toMatchObject({ code: 'UNSUPPORTED_MEMBER', member: 'field.x' });
    expect(strict.host.logs).toHaveLength(1);
  });

  it('forbidden member names are answered UNSUPPORTED without calling the host, on node and host-service channels alike', () => {
    const { bridge, host } = makeBridge();
    const n = host.addNode('field', {});
    for (const [fn, payload] of [
      ['get', `[${n.id},"__proto__"]`],
      ['get', `[${n.id},"constructor"]`],
      ['set', `[${n.id},"prototype",1]`],
      ['call', `[${n.id},"constructor",[]]`],
      ['host', '["get","app.__proto__",[]]'],
      ['host', '["call","console.constructor",[]]'],
    ] as const) {
      expect(JSON.parse(bridge.dispatch(fn, payload))).toEqual({ $t: 'unsupported' });
    }
    expect(host.traffic).toEqual([]);
  });

  it('per-run and per-form call counters are enforced from the bridge itself', () => {
    const { bridge, host } = makeBridge(new FakeHost(), true, { ...DEFAULT_SANDBOX_LIMITS, runBridgeCalls: 3, formRunBridgeCalls: 6 });
    const n = host.addNode('field', { v: 1 });
    const get = (): string => bridge.dispatch('get', JSON.stringify([n.id, 'v']));
    get(); get(); get();
    expect(expectScriptError(get)).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'run-bridge-calls' });
    bridge.beginRun();
    get(); get();
    bridge.beginRun();
    expect(expectScriptError(get)).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'bridge-calls' });
    expect(bridge.totalCalls).toBe(7);
  });

  it('a host reply that fails the contract is a BRIDGE_VIOLATION naming the channel, not a guest-visible oddity', () => {
    const { bridge, host } = makeBridge();
    const n = host.addNode('field', { weird: { $t: 'wat' } as never });
    const error = expectScriptError(() => bridge.dispatch('get', JSON.stringify([n.id, 'weird'])));
    expect(error.code).toBe('BRIDGE_VIOLATION');
    expect(error.message).toContain('get');
  });

  it('resolve passes the expression and many-flag through, and node results keep their class', () => {
    const { bridge, host } = makeBridge();
    const target = host.addNode('field', {});
    host.onResolve('a.b', nodeValue(target));
    expect(JSON.parse(bridge.dispatch('resolve', '[0,"a.b",false]'))).toEqual({ $t: 'node', id: target.id, cls: 'field' });
    expect(JSON.parse(bridge.dispatch('resolve', '[0,"zzz",true]'))).toEqual({ $t: 'nodes', nodes: [] });
  });

  it('a thrown non-typed host error is wrapped as HOST_ERROR with the cause kept', () => {
    const host = new FakeHost();
    host.get = () => { throw new RangeError('deep'); };
    const { bridge } = makeBridge(host);
    const error = expectScriptError(() => bridge.dispatch('get', '[0,"x"]'));
    expect(error).toBeInstanceOf(XfaScriptError);
    expect(error.code).toBe('HOST_ERROR');
    expect(error.cause).toBeInstanceOf(RangeError);
  });
});
