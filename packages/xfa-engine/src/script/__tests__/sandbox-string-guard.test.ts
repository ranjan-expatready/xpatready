import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SANDBOX_LIMITS, resolveLimits } from '../limits.js';
import { afterEachDispose, expectScriptError, makeHarness } from './helpers.js';

afterEach(afterEachDispose);

/*
 * Native string and RegExp builtins are loops QuickJS cannot interrupt (the interrupt is polled in bytecode only). The prelude
 * bounds the work BEFORE the native runs. These tests assert OUTCOMES (a typed SCRIPT_LIMIT, an identical result), never time:
 * the hostile inputs below are the ones that ran for hours before the guard, so a regression shows up as a hung test run, and
 * the ceilings are checked by count against shrunk limits.
 */

const HAY = '"a".repeat(8 * 1024 * 1024)';
const NEEDLE = '"a".repeat(4 * 1024 * 1024) + "b"';
const SETUP = `var h = ${HAY}; var n = ${NEEDLE}; `;
/** A pattern whose search cost is positions x length: a modest source over a huge input. */
const WIDE_RX = 'var rx = new RegExp("a".repeat(30000) + "b"); ';

const deadline = { runDeadlineMs: 300 } as const;

async function limitOf(src: string, limits: Record<string, number> = deadline): Promise<string | undefined> {
  const { sandbox } = await makeHarness({ limits });
  const error = expectScriptError(() => sandbox.evaluate(src));
  expect(error.code).toBe('SCRIPT_LIMIT');
  return error.limit;
}

describe('substring search is bounded by haystack x needle before the native runs', () => {
  it.each([
    ['indexOf', 'h.indexOf(n)'],
    ['lastIndexOf', 'h.lastIndexOf(n)'],
    ['includes', 'h.includes(n)'],
    ['split with a string separator', 'h.split(n).length'],
    ['replace with a string pattern', 'h.replace(n, "x")'],
    ['replaceAll with a string pattern', 'h.replaceAll(n, "x")'],
    ['indexOf on a String object', 'new String(h).indexOf(n)'],
    ['String.prototype.indexOf.call', 'String.prototype.indexOf.call(h, n)'],
    ['Reflect.apply of the prototype method', 'Reflect.apply(String.prototype.indexOf, h, [n])'],
    ['Function.prototype.call.call', 'Function.prototype.call.call(String.prototype.indexOf, h, n)'],
    ['a bound copy taken from the prototype', 'String.prototype.indexOf.bind(h)(n)'],
    ['a needle that is an object whose toString yields the needle', 'h.indexOf({ toString: function () { return n; } })'],
    ['a receiver that is an object whose toString yields the haystack', 'String.prototype.includes.call({ toString: function () { return h; } }, n)'],
    ['a separator that is an object whose toString yields the needle', 'h.split({ toString: function () { return n; } }).length'],
    ['a replace pattern that is an object whose toString yields the needle', 'h.replace({ toString: function () { return n; } }, "x")'],
    [
      'a separator that only claims to be a RegExp (toStringTag)',
      'var fake = { toString: function () { return n; } }; fake[Symbol.toStringTag] = "RegExp"; h.split(fake).length',
    ],
  ])('%s over 8 Mi x 4 Mi characters is SCRIPT_LIMIT string-work', async (_name, call) => {
    expect(await limitOf(SETUP + call)).toBe('string-work');
  });

  it('the work is positions x needle length against the ceiling: exactly at it passes, one position over is a limit', async () => {
    const { sandbox } = await makeHarness({ limits: { stringSearchWork: 1000 } });
    // 10-character needle: (109 - 10 + 1) x 10 = 1000 passes; (110 - 10 + 1) x 10 = 1010 does not.
    expect(sandbox.evaluate('"a".repeat(109).indexOf("a".repeat(9) + "b")')).toBe(-1);
    expect(expectScriptError(() => sandbox.evaluate('"a".repeat(110).indexOf("a".repeat(9) + "b")'))).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'string-work' });
  });

  it('a needle longer than the haystack costs nothing, however long it is', async () => {
    const { sandbox } = await makeHarness({ limits: { stringSearchWork: 1000 } });
    expect(sandbox.evaluate('"abc".indexOf("a".repeat(100000))')).toBe(-1);
  });

  it('the object coerces ONCE: the value the guard measured is the value the native searches (no second toString)', async () => {
    const { sandbox } = await makeHarness({ limits: { stringSearchWork: 1000 } });
    const out = sandbox.evaluate(
      'var calls = 0; var needle = { toString: function () { calls++; return calls === 1 ? "b" : "a".repeat(100000); } };' +
        ' var at = "aab".indexOf(needle); var thisCalls = 0; var self = { toString: function () { thisCalls++; return thisCalls === 1 ? "aab" : "a".repeat(100000); } };' +
        ' var at2 = String.prototype.indexOf.call(self, "b"); [at, calls, at2, thisCalls]',
    );
    expect(out).toEqual([2, 1, 2, 1]);
  });
});

describe('RegExp: source length is capped at construction, and every exec is bounded by source x input', () => {
  it.each([
    ['new RegExp with a 4 Mi-character literal source', 'new RegExp("a".repeat(4 * 1024 * 1024) + "b")'],
    ['RegExp() called without new', 'RegExp("a".repeat(4 * 1024 * 1024) + "b")'],
    ['with the i flag', 'new RegExp("a".repeat(4 * 1024 * 1024) + "b", "i")'],
    ['a quadratic-to-compile alternation', 'new RegExp("a|".repeat(262144) + "b")'],
    ['a source that is an object whose toString yields the big source', 'new RegExp({ toString: function () { return "a".repeat(4 * 1024 * 1024); } })'],
    ['compile() on an existing regexp', '/x/.compile("a".repeat(4 * 1024 * 1024))'],
    ['String.match with a string pattern (the engine builds the RegExp)', SETUP + 'h.match(n)'],
    ['String.search with a string pattern', SETUP + 'h.search(n)'],
    ['String.matchAll with a string pattern', SETUP + 'h.matchAll(n)'],
    ['String.match with an object pattern that coerces to a big source', SETUP + 'h.match({ toString: function () { return n; } })'],
  ])('%s is SCRIPT_LIMIT regexp-source', async (_name, call) => {
    expect(await limitOf(call)).toBe('regexp-source');
  });

  it.each([
    ['test', 'rx.test(h)'],
    ['exec', 'rx.exec(h)'],
    ['String.search with the RegExp', 'h.search(rx)'],
    ['String.replace with the RegExp', 'h.replace(rx, "")'],
    ['String.split with the RegExp', 'h.split(rx).length'],
    ['String.match with the RegExp', 'h.match(rx)'],
    ['String.match with a global RegExp', 'h.match(new RegExp("a".repeat(30000) + "b", "g"))'],
    ['RegExp.prototype[Symbol.replace] called directly', 'RegExp.prototype[Symbol.replace].call(rx, h, "")'],
    ['RegExp.prototype[Symbol.split] called directly', 'RegExp.prototype[Symbol.split].call(rx, h)'],
    ['Reflect.apply of exec', 'Reflect.apply(RegExp.prototype.exec, rx, [h])'],
    ['a long counted-quantifier source', 'h = "a".repeat(4 * 1024 * 1024); var big = new RegExp("a{1,3}".repeat(8000) + "b"); big.test(h)'],
  ])('%s of a 30,000-character source over 8 Mi characters is SCRIPT_LIMIT string-work', async (_name, call) => {
    expect(await limitOf('var h = ' + HAY + '; ' + WIDE_RX + call)).toBe('string-work');
  });

  it('the exec ceiling is source length x input length, and the source cap is in characters: both exact at the edge', async () => {
    const { sandbox } = await makeHarness({ limits: { stringSearchWork: 1000, regexpSourceChars: 10 } });
    expect(sandbox.evaluate('new RegExp("abcde").test("x".repeat(200))')).toBe(false); // 5 x 200 = 1000
    expect(expectScriptError(() => sandbox.evaluate('new RegExp("abcde").test("x".repeat(201))'))).toMatchObject({ limit: 'string-work' });
  });

  it('the source cap passes a source of exactly the cap and stops one character over', async () => {
    const { sandbox } = await makeHarness({ limits: { regexpSourceChars: 10 } });
    expect(sandbox.evaluate('new RegExp("a".repeat(10)).source')).toBe('aaaaaaaaaa');
    expect(expectScriptError(() => sandbox.evaluate('new RegExp("a".repeat(11))'))).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'regexp-source' });
  });

  it('catastrophic backtracking is still stopped by the run deadline (QuickJS polls the interrupt in the matcher), not by these guards', async () => {
    expect(await limitOf('/(a+)+$/.test("a".repeat(40) + "b")', { runDeadlineMs: 200 })).toBe('deadline');
  });
});

describe('SG-F1: the RegExp bound cannot be routed around by removing or shadowing `exec` or a Symbol method', () => {
  /** A cheap-to-compile LINEAR literal (it bypasses regexpSourceChars: it is built by eval) and a long input. */
  const LIT = 'var rx = eval("/" + "a".repeat(1000000) + "b/"); var rg = eval("/" + "a".repeat(1000000) + "b/g"); var h = "a".repeat(8 * 1024 * 1024); function own(o, k, v) { Object.defineProperty(o, k, { value: v, configurable: true, writable: true }); } ';
  it.each([
    ['exec nulled on the instance, test', 'own(rx, "exec", null); rx.test(h)'],
    ['exec nulled on the instance, prototype exec called on it', 'own(rx, "exec", null); RegExp.prototype.exec.call(rx, h)'],
    ['exec nulled on the instance, String.replace', 'own(rx, "exec", null); h.replace(rx, "")'],
    ['exec nulled on the instance, String.search', 'own(rx, "exec", null); h.search(rx)'],
    ['exec nulled on the instance, String.match', 'own(rx, "exec", null); h.match(rx)'],
    ['exec nulled on the instance, String.split', 'own(rx, "exec", null); h.split(rx)'],
    ['exec nulled on the instance, String.matchAll', 'own(rg, "exec", null); Array.from(h.matchAll(rg))'],
    ['exec set to a non-function on the instance (own property)', 'own(rx, "exec", 5); rx.test(h)'],
    ['exec assigned null on the instance by plain assignment (the write is refused by the locked prototype)', 'rx.exec = null; rx.test(h)'],
    ['Symbol.replace assigned null on the instance by plain assignment', 'rx[Symbol.replace] = null; h.replace(rx, "")'],
    ['exec deleted from the prototype', 'delete RegExp.prototype.exec; rx.test(h)'],
    ['exec assigned null on the prototype', 'RegExp.prototype.exec = null; rx.test(h)'],
    ['exec redefined on the prototype', 'try { Object.defineProperty(RegExp.prototype, "exec", { value: null }); } catch (e) {} rx.test(h)'],
    ['test replaced on the prototype', 'RegExp.prototype.test = function () { return false; }; RegExp.prototype.exec = null; rx.test(h)'],
    ['Symbol.replace nulled on the instance', 'own(rx, Symbol.replace, null); h.replace(rx, "")'],
    ['Symbol.replace nulled on the instance, replaceAll', 'own(rg, Symbol.replace, null); h.replaceAll(rg, "")'],
    ['Symbol.split removed on the instance', 'own(rx, Symbol.split, undefined); h.split(rx)'],
    ['Symbol.match nulled on the instance', 'own(rx, Symbol.match, null); h.match(rx)'],
    ['Symbol.search nulled on the instance', 'own(rx, Symbol.search, null); h.search(rx)'],
    ['Symbol.matchAll nulled on the instance', 'own(rg, Symbol.matchAll, null); Array.from(h.matchAll(rg))'],
    ['Symbol.replace deleted from the prototype', 'delete RegExp.prototype[Symbol.replace]; h.replace(rx, "")'],
    ['a prototype Symbol method called with the engine fallback after exec nulled', 'own(rx, "exec", null); RegExp.prototype[Symbol.replace].call(rx, h, "")'],
    [
      'a subclass-style override of exec that delegates to the prototype exec',
      'class Sub extends RegExp { exec(s) { return RegExp.prototype.exec.call(this, s); } } Object.setPrototypeOf(rx, Sub.prototype); rx.test(h)',
    ],
    ['an instance whose own constructor is set, split', 'rx.constructor = RegExp; h.split(rx)'],
  ])('%s is SCRIPT_LIMIT string-work', async (_name, call) => {
    expect(await limitOf(LIT + call)).toBe('string-work');
  });

  it.each([
    ['split', 'var small = /x/; small.constructor = { [Symbol.species]: function () { return rx; } }; h.split(small).length'],
    ['matchAll', 'var small = /x/g; small.constructor = { [Symbol.species]: function () { return rg; } }; Array.from(h.matchAll(small)).length'],
  ])('a species redirect cannot swap the searched RegExp for a long one behind the measure (%s runs the small one)', async (_name, call) => {
    const { sandbox } = await makeHarness({ limits: deadline });
    expect(sandbox.evaluate(LIT + 'h = "a".repeat(2000); ' + call)).toBe(call.startsWith('var small = /x/;') ? 1 : 0);
  });

  it('the entry points are non-writable and non-configurable, and a write fails silently (sloppy) or throws (strict)', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'var keys = ["exec", "test", "constructor", Symbol.match, Symbol.matchAll, Symbol.replace, Symbol.search, Symbol.split];' +
        ' var seen = keys.map(function (k) { var d = Object.getOwnPropertyDescriptor(RegExp.prototype, k); return [d.writable, d.configurable, d.enumerable]; });' +
        ' var before = RegExp.prototype.exec; RegExp.prototype.exec = null; var same = RegExp.prototype.exec === before;' +
        ' var sp = Object.getOwnPropertyDescriptor(RegExp, Symbol.species).configurable; [seen, same, sp]',
    );
    expect(out).toEqual([Array.from({ length: 8 }, () => [false, false, false]), true, false]);
    expect(expectScriptError(() => sandbox.evaluate('"use strict"; RegExp.prototype.exec = null;'))).toMatchObject({ code: 'SCRIPT_ERROR' });
  });

  it('replaceAll and matchAll still refuse a non-global RegExp, and an instance Symbol override still wins over the default', async () => {
    const { sandbox } = await makeHarness();
    expect(expectScriptError(() => sandbox.evaluate('"aa".replaceAll(/a/, "b")')).message).toContain('TypeError');
    expect(expectScriptError(() => sandbox.evaluate('"aa".matchAll(/a/)')).message).toContain('TypeError');
    expect(sandbox.evaluate('var r = /a/; Object.defineProperty(r, Symbol.replace, { value: function (s, v) { return "custom:" + s + v; } }); "xa".replace(r, "!")')).toBe('custom:xa!');
  });
});

describe('Unicode normalization is bounded by length (its canonical reordering is quadratic in a run of combining marks)', () => {
  const COMBINING = '"a" + "\\u0301".repeat(65536) + "\\u0316".repeat(65536)';
  it.each([
    ['normalize NFD', `(${COMBINING}).normalize("NFD")`],
    ['normalize NFC', `(${COMBINING}).normalize("NFC")`],
    ['normalize NFKD', `(${COMBINING}).normalize("NFKD")`],
    ['localeCompare, which normalizes both operands, as the receiver', `(${COMBINING}).localeCompare("a")`],
    ['localeCompare as the argument', `"a".localeCompare(${COMBINING})`],
  ])('%s of a 131,073-character string is SCRIPT_LIMIT string-length', async (_name, call) => {
    expect(await limitOf(call)).toBe('string-length');
  });

  it('an all-ASCII string cannot hold a combining mark: it normalizes and compares in linear time, so the ceiling does not apply', async () => {
    const { sandbox } = await makeHarness({ limits: { normalizeChars: 100 } });
    expect(sandbox.evaluate('"a".repeat(100000).normalize("NFC").length')).toBe(100000);
    expect(sandbox.evaluate('"a".repeat(100000).localeCompare("a".repeat(100000))')).toBe(0);
  });

  it('the length ceiling is in characters: exactly at it passes, one over is a limit', async () => {
    const { sandbox } = await makeHarness({ limits: { normalizeChars: 100 } });
    expect(sandbox.evaluate('"e\\u0301".repeat(50).normalize("NFC").length')).toBe(50);
    expect(expectScriptError(() => sandbox.evaluate('"\\u00e9".repeat(101).normalize("NFC")'))).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'string-length' });
  });
});

describe('the guarded builtins keep their shape', () => {
  const NAMES = ['indexOf', 'lastIndexOf', 'includes', 'split', 'replace', 'replaceAll', 'match', 'matchAll', 'search', 'normalize', 'localeCompare'] as const;

  it.each(NAMES)('String.prototype.%s keeps its name, length, attributes and stays out of for-in', async (name) => {
    const { sandbox } = await makeHarness();
    const native = Object.getOwnPropertyDescriptor(String.prototype, name);
    const seen = sandbox.evaluate(
      `var d = Object.getOwnPropertyDescriptor(String.prototype, "${name}"); var f = d.value; [typeof f, f.name, f.length, d.writable, d.configurable, d.enumerable]`,
    );
    expect(seen).toEqual(['function', name, (native?.value as { length: number }).length, true, true, false]);
  });

  it('RegExp keeps its name, length, prototype link and construct/call behaviour, and exec/compile keep theirs', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate(
      'var rx = /a(b)/g; var again = RegExp(rx); var made = new RegExp(rx, "i");' +
        ' [RegExp.name, RegExp.length, RegExp.prototype.constructor === RegExp, rx.constructor === RegExp, Object.getPrototypeOf(rx) === RegExp.prototype,' +
        ' again === rx, made.flags, made instanceof RegExp, RegExp("x").source, new RegExp("x", "gi").flags, RegExp.prototype.exec.name, RegExp.prototype.exec.length,' +
        ' RegExp.prototype.compile.name, RegExp.prototype.compile.length, Object.keys(RegExp.prototype).length, typeof RegExp[Symbol.species], RegExp[Symbol.species] === RegExp]',
    );
    expect(out).toEqual(['RegExp', 2, true, true, true, true, 'i', true, 'x', 'gi', 'exec', 1, 'compile', 2, 0, 'function', true]);
  });

  it('a subclass of RegExp still constructs through the guard (new.target is honoured)', async () => {
    const { sandbox } = await makeHarness();
    const out = sandbox.evaluate('class Sub extends RegExp {} var s = new Sub("a+", "g"); [s instanceof Sub, s instanceof RegExp, s.test("caat"), s.source]');
    expect(out).toEqual([true, true, true, 'a+']);
  });
});

describe('under the ceilings the guarded builtins return exactly what the native ones do', () => {
  /**
   * A seeded PRNG drives small strings over an alphabet that exercises regex metacharacters, `$` replacement patterns, line
   * breaks and combining marks. The same program runs in Node (the oracle: V8's builtins) and in the sandbox (QuickJS behind the
   * guards). Locale-dependent comparison is restricted to ASCII, where both engines agree.
   */
  const PROGRAM = `(function () {
    var seed = 12345;
    function next() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed; }
    var atoms = ["a", "b", "ab", "aa", "\\n", "$", ".", " ", "\\u00e9", "e\\u0301", "\\u0301", "x"];
    function str(max) { var n = next() % (max + 1), s = ""; for (var i = 0; i < n; i++) { s += atoms[next() % atoms.length]; } return s; }
    var out = [];
    function rec(label, fn) { try { out.push(label + "=" + JSON.stringify(fn())); } catch (e) { out.push(label + "!" + e.name); } }
    function allMatches(s, rx) { var r = []; var m; var g = new RegExp(rx.source, "g"); while ((m = g.exec(s)) !== null) { r.push([m.index, m[0]]); if (m[0] === "") { g.lastIndex++; } } return r; }
    var regexes = [/a+/g, /(a|b)b/, /^\\s*$/m, /\\$/, /b*/g, /(x)?a/g, /[^a]/, /e\\u0301|\\u00e9/g, /a$/m, /\\n/];
    for (var c = 0; c < 400; c++) {
      var s = str(14), t = str(3), p = next() % 6 - 1;
      rec("i", function () { return [s.indexOf(t), s.indexOf(t, p), s.lastIndexOf(t), s.lastIndexOf(t, p), s.includes(t), s.includes(t, p)]; });
      rec("se", function () { return [s.startsWith(t), s.endsWith(t), s.startsWith(t, p)]; });
      rec("sp", function () { return [s.split(t), s.split(t, 2), s.split(t, 0), s.split(), s.split(undefined, 1)]; });
      rec("re", function () { return [s.replace(t, "[$&]"), s.replace(t, "$$"), s.replace(t, function (m, o) { return "<" + o + ">"; }), s.replace(t, "")]; });
      rec("ra", function () { return [s.replaceAll(t, "-"), s.replaceAll(t, function (m, o) { return o; })]; });
      rec("nm", function () { return [s.normalize(), s.normalize("NFD"), s.normalize("NFKC")]; });
      rec("pr", function () { return [String.prototype.indexOf.call(12345, "3"), "x1y".indexOf(1), "undefinedx".indexOf(), "nullx".indexOf(null), "true".includes(true), "a,b".split(","), "a1b".split(1)]; });
      rec("nl", function () { return [String.prototype.indexOf.call(null, "a")]; });
      rec("sy", function () { return [s.indexOf(Symbol("x"))]; });
      rec("rg", function () { return [s.includes(/a/)]; });
      rec("sw", function () { return [s.startsWith(/a/)]; });
      rec("ob", function () { return [s.indexOf({ toString: function () { return t; } }), String.prototype.indexOf.call({ toString: function () { return s; } }, t), s.split({ toString: function () { return t; } })]; });
      rec("lc", function () { var a = s.replace(/[^a-z]/g, ""), b = t.replace(/[^a-z]/g, ""); var v = a.localeCompare(b); return v < 0 ? -1 : v > 0 ? 1 : 0; });
      for (var r = 0; r < regexes.length; r++) {
        (function (rx) {
          rec("rx" + r, function () {
            var g = new RegExp(rx.source, rx.flags);
            return [rx.test(s), new RegExp(rx.source, rx.flags).exec(s), s.search(rx), s.replace(rx, "#"), s.split(rx), s.match(rx), allMatches(s, rx), g.test(s), g.lastIndex];
          });
        })(regexes[r]);
      }
      rec("ms", function () { var q = t.replace(/[^ab. ]/g, ""); return [s.match(q), s.search(q), s.replace(new RegExp(q), "!"), Array.from(s.matchAll(q)).map(function (m) { return m.index; })]; });
      rec("ra2", function () { return [s.replaceAll(/a/g, "-"), Array.from(s.matchAll(/a|b/g)).map(function (m) { return m.index; })]; });
      rec("ra3", function () { return [s.replaceAll(/a/, "-")]; });
      rec("ma3", function () { return [s.matchAll(/a/)]; });
      rec("ctor", function () { var q = t.replace(/[^ab ]/g, ""); var x = new RegExp(q, "g"); return [x.source, x.flags, RegExp(q).test(s), RegExp(x) === x, x.compile("b+", "i").test("ABB")]; });
    }
    return JSON.stringify(out);
  })()`;

  it('400 seeded cases across every guarded builtin produce the same record in the sandbox as in Node', async () => {
    const { sandbox } = await makeHarness();
    const guarded = sandbox.evaluate(PROGRAM);
    const native = runInNewContext(PROGRAM) as string;
    expect(typeof guarded).toBe('string');
    const g = JSON.parse(guarded as string) as string[];
    const n = JSON.parse(native) as string[];
    expect(g.length).toBe(n.length);
    expect(g.filter((entry, i) => entry !== n[i]).slice(0, 3).map((entry) => entry)).toEqual([]);
    // The record is not vacuous: it holds successes and the TypeErrors for symbols, null receivers and RegExp arguments.
    expect(g.some((entry) => entry.startsWith('i='))).toBe(true);
    expect(g.filter((entry) => entry.endsWith('!TypeError')).length).toBeGreaterThan(1000);
  });

  it.each([
    ['indexOf', '"hello world".indexOf("o w")', 4],
    ['indexOf from a position', '"hello world".indexOf("o", 5)', 7],
    ['lastIndexOf', '"hello world".lastIndexOf("o")', 7],
    ['includes', '"hello world".includes("lo w")', true],
    ['split on a string', '"a-b-c".split("-").join("|")', 'a|b|c'],
    ['split with a limit', '"a-b-c".split("-", 2).join("|")', 'a|b'],
    ['replace the first', '"a-b-c".replace("-", "+")', 'a+b-c'],
    ['replace with a function', '"a-b".replace("-", function (m, i) { return "[" + m + i + "]"; })', 'a[-1]b'],
    ['replaceAll', '"a-b-c".replaceAll("-", "+")', 'a+b+c'],
    ['regexp replace global', '"a b  c".replace(/ +/g, "_")', 'a_b_c'],
    ['regexp test with lastIndex', 'var r = /a/g; r.test("aa"); r.lastIndex', 1],
    ['search with a string', '"xxabc".search("abc")', 2],
    ['match with a string', '"xxabc".match("b")[0]', 'b'],
    ['normalize', '"e\\u0301".normalize("NFC").length', 1],
    ['the trim idiom used by the forms', '"  x ".replace(/^\\s+|\\s+$/g, "")', 'x'],
  ])('%s', async (_name, src, expected) => {
    const { sandbox } = await makeHarness();
    expect(sandbox.evaluate(src)).toBe(expected);
  });
});

describe('the new limits are configuration, validated like the others', () => {
  it('have positive defaults and can be overridden, but only with positive integers and known names', () => {
    expect(DEFAULT_SANDBOX_LIMITS.stringSearchWork).toBe(2 ** 30);
    expect(DEFAULT_SANDBOX_LIMITS.regexpSourceChars).toBe(2 ** 16);
    expect(DEFAULT_SANDBOX_LIMITS.normalizeChars).toBe(2 ** 15);
    expect(resolveLimits({ stringSearchWork: 5 }).stringSearchWork).toBe(5);
    expect(() => resolveLimits({ stringSearchWork: 0 })).toThrow();
    expect(() => resolveLimits({ regexpSourceChars: -1 })).toThrow();
    expect(() => resolveLimits({ normalizeChars: 1.5 })).toThrow();
  });
});
