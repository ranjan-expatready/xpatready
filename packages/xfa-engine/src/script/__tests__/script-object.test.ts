import { afterEach, describe, expect, it } from 'vitest';
import { MAX_SCRIPT_AST_NODES } from '../ast.js';
import { nodeValue } from '../bridge-types.js';
import { buildScriptObjectProgram } from '../script-object.js';
import { XfaScriptError } from '../errors.js';
import { FakeHost } from './fake-host.js';
import { afterEachDispose, expectScriptError, makeHarness } from './helpers.js';

afterEach(afterEachDispose);

describe('script objects get their own scope (P2T05-F7)', () => {
  it('two objects that define the same helper name do not collide, and each calls its own, so per-form library copies with drift stay separate', async () => {
    const { sandbox } = await makeHarness();
    sandbox.defineScriptObject('libA', 'function helper() { return "A"; } function run() { return helper() + "-a"; }');
    sandbox.defineScriptObject('libB', 'function helper() { return "B"; } function run() { return helper() + "-b"; }');
    expect(sandbox.evaluate('[libA.run(), libA.helper(), libB.run(), libB.helper()]')).toEqual(['A-a', 'A', 'B-b', 'B']);
  });

  it('each object keeps private state, so a counter in one library is not shared with another', async () => {
    const { sandbox } = await makeHarness();
    const src = 'var count = 0; function inc() { return ++count; }';
    sandbox.defineScriptObject('first', src);
    sandbox.defineScriptObject('second', src);
    expect(sandbox.evaluate('[first.inc(), first.inc(), second.inc(), first.count, second.count]')).toEqual([1, 2, 1, 2, 1]);
  });

  it('an object can call another by its global name, so the form\'s libraries can use each other', async () => {
    const { sandbox } = await makeHarness();
    sandbox.defineScriptObject('util', 'function double(x) { return x * 2; }');
    sandbox.defineScriptObject('val', 'function check(x) { return util.double(x) + 1; }');
    expect(sandbox.evaluate('val.check(4)')).toBe(9);
  });

  it('vars and functions nested in blocks, loops and conditions at the top level are exported too, because they hoist to the object scope', async () => {
    const { sandbox } = await makeHarness();
    sandbox.defineScriptObject('lib', 'if (true) { var inBlock = 1; } for (var i = 0; i < 2; i++) { var inLoop = i; } switch (1) { case 1: var inSwitch = "s"; } try { var inTry = 2; } catch (e) { var inCatch = 3; } var plain = 4, other;');
    expect(sandbox.evaluate('[lib.inBlock, lib.inLoop, lib.inSwitch, lib.inTry, typeof lib.inCatch, lib.plain, typeof lib.other, lib.i]')).toEqual([1, 1, 's', 2, 'undefined', 4, 'undefined', 2]);
  });

  it('names declared inside functions are not exported, so helpers\' locals stay private', async () => {
    const { sandbox } = await makeHarness();
    sandbox.defineScriptObject('lib', 'function f() { var local = 1; function nested() {} return local; }');
    expect(sandbox.evaluate('[typeof lib.f, typeof lib.local, typeof lib.nested, lib.f()]')).toEqual(['function', 'undefined', 'undefined', 1]);
  });

  it('the object is a locked global, so a later script cannot swap a library for its own', async () => {
    const { sandbox } = await makeHarness();
    sandbox.defineScriptObject('lib', 'function id() { return "real"; }');
    sandbox.evaluate('lib = { id: function () { return "fake"; } };', { global: true });
    expect(sandbox.evaluate('lib.id()')).toBe('real');
  });

  it('a trailing line comment in the source does not swallow the wrapper, so ordinary files parse', async () => {
    const { sandbox } = await makeHarness();
    sandbox.defineScriptObject('lib', 'function f() { return 1; } // trailing comment');
    expect(sandbox.evaluate('lib.f()')).toBe(1);
  });

  it('top-level statements run once at definition, so initialisation code in a library executes', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { v: 5 });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({}, host);
    sandbox.defineScriptObject('lib', 'var seen = xfa.resolveNode("n").v; function get() { return seen; }');
    expect(sandbox.evaluate('lib.get()')).toBe(5);
    expect(host.traffic.filter((t) => t.startsWith('resolve:'))).toHaveLength(1);
  });
});

describe('script object input is validated', () => {
  it.each([
    ['not ES3 (arrow function)', 'var f = () => 1;'],
    ['not ES3 (let)', 'let x = 1;'],
    ['not ES3 (template literal)', 'var s = `x`;'],
    ['not ES3 (getter in object literal)', 'var o = { get a() { return 1; } };'],
    ['a syntax error', 'function ('],
    ['a top-level return', 'var x = 1; return x;'],
    ['an attempt to close the wrapper', '}); steal(); (function () {'],
    ['an unterminated comment', '/* never closed'],
  ])('%s is a typed SCRIPT_ERROR naming the object, and nothing is defined', async (_name, src) => {
    const { sandbox } = await makeHarness();
    const error = expectScriptError(() => sandbox.defineScriptObject('validateForm', src));
    expect(error.code).toBe('SCRIPT_ERROR');
    expect(error.message).toContain('validateForm');
    expect(sandbox.evaluate('typeof validateForm')).toBe('undefined');
    expect(sandbox.closed).toBe(false);
  });

  it.each(['xfa', 'Date', 'Array', '__proto__', 'constructor', '1abc', 'a-b', '', 'with space', 'class', 'function'])(
    'the name %j is refused, so an object cannot shadow a built-in, a reserved word or a prototype key',
    async (name) => {
      const { sandbox } = await makeHarness();
      expect(expectScriptError(() => sandbox.defineScriptObject(name, 'var x = 1;')).code).toBe('INVALID_OPTIONS');
    },
  );

  it('defining the same name twice is refused, so a second copy cannot silently replace the first', async () => {
    const { sandbox } = await makeHarness();
    sandbox.defineScriptObject('lib', 'function f() { return 1; }');
    expect(expectScriptError(() => sandbox.defineScriptObject('lib', 'function f() { return 2; }')).code).toBe('INVALID_OPTIONS');
    expect(sandbox.evaluate('lib.f()')).toBe(1);
  });

  it('an object whose top-level code throws is a SCRIPT_ERROR and the name stays free', async () => {
    const { sandbox } = await makeHarness();
    const error = expectScriptError(() => sandbox.defineScriptObject('lib', 'throw new Error("init failed");'));
    expect(error.code).toBe('SCRIPT_ERROR');
    expect(sandbox.evaluate('typeof lib')).toBe('undefined');
    sandbox.defineScriptObject('lib', 'function f() { return 1; }');
    expect(sandbox.evaluate('lib.f()')).toBe(1);
  });

  it('a source over the size cap is a typed SCRIPT_LIMIT before parsing, so a huge file cannot reach the parser', async () => {
    const { sandbox } = await makeHarness({ limits: { sourceChars: 500 } });
    const error = expectScriptError(() => sandbox.defineScriptObject('lib', `var s = "${'a'.repeat(1000)}";`));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'source-size' });
  });

  it('a closed sandbox refuses definitions with SANDBOX_CLOSED', async () => {
    const { sandbox } = await makeHarness();
    sandbox.dispose();
    expect(expectScriptError(() => sandbox.defineScriptObject('lib', 'var x = 1;')).code).toBe('SANDBOX_CLOSED');
  });
});

describe('script object analysis is bounded (a hostile library cannot overflow the host stack)', () => {
  it.each([5_000, 50_000])('a variable initialised from a %i-segment member chain builds its program or stops with a typed SCRIPT_LIMIT, never a bare RangeError', (n) => {
    const source = `var x = a${'.b'.repeat(n)};`;
    let program: string | undefined;
    const error = (() => {
      try {
        program = buildScriptObjectProgram('lib', source);
        return undefined;
      } catch (e) {
        return e;
      }
    })();
    if (error === undefined) expect(program).toContain('"x"');
    else {
      expect(error).toBeInstanceOf(XfaScriptError);
      expect((error as XfaScriptError).code).toBe('SCRIPT_LIMIT');
    }
  });

  it('a 5000-segment chain is accepted and exports its name', () => {
    expect(buildScriptObjectProgram('lib', `var x = a${'.b'.repeat(5_000)};`)).toContain('Object.defineProperty(__xfaExports, "x"');
  });

  it('keeps the export order of the declarations (document order), nested blocks included', () => {
    const program = buildScriptObjectProgram('lib', 'var a; if (1) { var b; function c() {} } for (var d;;) { var e; }');
    const order = ['"a"', '"b"', '"c"', '"d"', '"e"'].map((n) => program.indexOf(`__xfaExports, ${n}`));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
  });

  it('a syntax tree over the node ceiling is a typed SCRIPT_LIMIT', () => {
    const error = expectScriptError(() => buildScriptObjectProgram('lib', 'a;'.repeat(MAX_SCRIPT_AST_NODES)));
    expect(error.code).toBe('SCRIPT_LIMIT');
    expect(error.limit).toBe('source-size');
  });
});
