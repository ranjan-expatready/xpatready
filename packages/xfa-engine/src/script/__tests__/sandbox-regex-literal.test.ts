import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_CACHED_SOURCES, RegexLiteralGuard, longestRegexLiteral } from '../regex-literals.js';
import { afterEachDispose, expectScriptError, makeHarness } from './helpers.js';

afterEach(afterEachDispose);

/*
 * A regular-expression LITERAL compiles in QuickJS without polling its interrupt, so the prelude's guard on the RegExp
 * constructor never sees it. These tests assert that the static pre-pass refuses an over-long literal with the same typed
 * error the runtime guard raises, and that nothing which is not a literal is mistaken for one. Limits are shrunk to 10.
 */

const LIMITS = { regexpSourceChars: 10 } as const;
const lit = (n: number, flags = ''): string => `/${'a'.repeat(n)}/${flags}`;

async function refusal(src: string): Promise<ReturnType<typeof expectScriptError>> {
  const { sandbox } = await makeHarness({ limits: LIMITS });
  return expectScriptError(() => sandbox.evaluate(src));
}

describe('a regex literal over regexpSourceChars is refused before it compiles', () => {
  it('passes a literal of exactly the limit and refuses one character over, with kind regexp-source', async () => {
    const { sandbox } = await makeHarness({ limits: LIMITS });
    expect(sandbox.evaluate(`${lit(10)}.source.length`)).toBe(10);
    expect(await refusal(`${lit(11)}.test("x")`)).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'regexp-source' });
  });

  it('raises the same error as the runtime guard on the constructor path', async () => {
    const viaLiteral = await refusal(`${lit(11)}.test("x")`);
    const viaConstructor = await refusal('new RegExp("a".repeat(11))');
    expect(viaLiteral.message).toBe(viaConstructor.message);
    expect(viaLiteral.code).toBe(viaConstructor.code);
  });

  it('fails the sandbox closed, as the runtime guard does', async () => {
    const { sandbox } = await makeHarness({ limits: LIMITS });
    expectScriptError(() => sandbox.evaluate(lit(11)));
    expect(expectScriptError(() => sandbox.evaluate('1')).code).toBe('SANDBOX_CLOSED');
  });

  it('ignores the flags when measuring the length', async () => {
    const { sandbox } = await makeHarness({ limits: LIMITS });
    expect(sandbox.evaluate(`${lit(10, 'gimy')}.flags`)).toBe('gimy');
    expect(longestRegexLiteral(lit(10, 'gimy'))).toBe(10);
  });

  it.each([
    ['inside a nested function', `function outer() { return function inner() { return ${lit(11)}.test("x"); }; }`],
    ['inside a template literal expression', `var s = \`v=\${${lit(11)}.test("x")}\`;`],
    ['after a division', `var d = 4 / 2; var r = ${lit(11)};`],
    ['as the body of an if statement', `if (true) ${lit(11)}.test("x");`],
    ['in an event-script style expression with a conditional', `var ok = (this.rawValue == null) ? false : ${lit(11)}.test(this.rawValue);`],
    ['after a deeply nested expression the parser cannot finish', `${'('.repeat(200_000)}1${')'.repeat(200_000)}; ${lit(11)}`],
  ])('refuses a literal %s', async (_name, src) => {
    expect(await refusal(src)).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'regexp-source' });
  });

  it('refuses a literal in a script object, reached through defineScriptObject', async () => {
    const { sandbox } = await makeHarness({ limits: LIMITS });
    const source = `function check(v) { return ${lit(11)}.test(v); }`;
    expect(expectScriptError(() => sandbox.defineScriptObject('lib', source))).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'regexp-source' });
  });

  it('carries the event location of the script that held the literal', async () => {
    const { sandbox } = await makeHarness({ limits: LIMITS });
    const error = expectScriptError(() => sandbox.evaluate(lit(11), { event: 'calculate', nodeSom: 'form1.page1.Total' }));
    expect(error).toMatchObject({ event: 'calculate', nodeSom: 'form1.page1.Total' });
  });
});

describe('text that only looks like a regex literal is not one', () => {
  const long = 'a'.repeat(11);
  it.each([
    ['a double-quoted string', `var s = "/${long}/";`],
    ['a single-quoted string', `var s = '/${long}/';`],
    ['a line comment', `// /${long}/\nvar n = 1;`],
    ['a block comment', `/* /${long}/ */ var n = 1;`],
    ['a template literal text', `var s = \`/${long}/\`;`],
    ['a division chain', `var q = 100 / ${long.length} / 2;`],
  ])('%s is not a literal', async (_name, src) => {
    expect(longestRegexLiteral(src)).toBe(0);
    const { sandbox } = await makeHarness({ limits: LIMITS });
    expect(() => sandbox.evaluate(src)).not.toThrow();
  });

  it('a long string that merely contains slashes passes while a short literal beside it also passes', async () => {
    const { sandbox } = await makeHarness({ limits: LIMITS });
    expect(sandbox.evaluate(`var p = "a/b/${long}/c"; /ab/.test("ab")`)).toBe(true);
  });
});

describe('the pre-pass keeps the ceilings of the other paths', () => {
  it('a source with no literal is still bounded by the source ceiling first', async () => {
    const { sandbox } = await makeHarness({ limits: { regexpSourceChars: 10, sourceChars: 50 } });
    expect(expectScriptError(() => sandbox.evaluate(`var s = "${'/'.repeat(60)}";`))).toMatchObject({ limit: 'source-size' });
  });

  it('a refused first evaluate adds only its own time to the run total, not time since the clock origin', async () => {
    const { sandbox } = await makeHarness({ limits: LIMITS });
    const before = performance.now();
    expectScriptError(() => sandbox.evaluate(lit(11)));
    const spanned = performance.now() - before;
    expect(Number.isFinite(sandbox.usage.elapsedMs)).toBe(true);
    expect(sandbox.usage.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(sandbox.usage.elapsedMs).toBeLessThanOrEqual(spanned);
  });
});

describe('the scan is lexical: it never compiles the pattern and does not need acorn to accept it', () => {
  // `a{2,1}` is a valid RegularExpressionLiteral token but a pattern acorn's validator refuses (numbers out of order).
  const invalid = 'a{2,1}';

  it('measures a literal whose pattern the stock acorn validator rejects', () => {
    expect(longestRegexLiteral(`var r = /${invalid}/;`)).toBe(invalid.length);
    expect(longestRegexLiteral(`var r = /(?<n>a)(?<n>b)/u;`)).toBe('(?<n>a)(?<n>b)'.length);
  });

  it('refuses such a literal when it is over the limit', async () => {
    expect(await refusal(`var r = /${invalid.repeat(3)}/;`)).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'regexp-source' });
  });

  it('keeps `/` inside a class and escaped characters inside the pattern', () => {
    expect(longestRegexLiteral('var r = /[/]\\/a/;')).toBe('[/]\\/a'.length);
  });

  it('never constructs a host RegExp from a guest pattern', () => {
    const construct = vi.spyOn(globalThis, 'RegExp');
    try {
      // A pattern the stock validator accepts: stock acorn would reach `new RegExp` with it, so this assertion bites.
      const pattern = 'b'.repeat(100);
      expect(longestRegexLiteral(`var r = /${pattern}/g;`)).toBe(pattern.length);
      expect(construct.mock.calls.some(([source]) => typeof source === 'string' && source.includes(pattern))).toBe(false);
    } finally {
      construct.mockRestore();
    }
  });
});

describe('the verdict cache', () => {
  const big = (n: number): string => `var r = /${'a'.repeat(20)}${n}/; // padding`;

  it('scans a source once and answers again from the cache', () => {
    const scan = vi.fn((source: string) => longestRegexLiteral(source));
    const guard = new RegexLiteralGuard(10, scan);
    expect(guard.exceeding(big(1))).toBeGreaterThan(10);
    expect(guard.exceeding(big(1))).toBeGreaterThan(10);
    expect(scan).toHaveBeenCalledTimes(1);
    expect(guard.size).toBe(1);
  });

  it('holds also a source longer than 64 Ki characters (the default limit)', () => {
    const scan = vi.fn(() => 0);
    const guard = new RegexLiteralGuard(2 ** 16, scan);
    const long = `${'a'.repeat(2 ** 16 + 10)}/`;
    guard.exceeding(long);
    guard.exceeding(long);
    expect(scan).toHaveBeenCalledTimes(1);
  });

  it('does not scan a source no longer than the limit, or one without a slash', () => {
    const scan = vi.fn(() => 0);
    const guard = new RegexLiteralGuard(10, scan);
    guard.exceeding('/ab/');
    guard.exceeding('a'.repeat(50));
    expect(scan).not.toHaveBeenCalled();
    expect(guard.size).toBe(0);
  });

  it('evicts the oldest verdict first, at the entry cap', () => {
    const scan = vi.fn(() => 0);
    const guard = new RegexLiteralGuard(10, scan);
    for (let i = 0; i < MAX_CACHED_SOURCES; i += 1) guard.exceeding(big(i));
    expect(guard.size).toBe(MAX_CACHED_SOURCES);
    guard.exceeding(big(MAX_CACHED_SOURCES));
    expect(guard.size).toBe(MAX_CACHED_SOURCES);
    expect(scan).toHaveBeenCalledTimes(MAX_CACHED_SOURCES + 1);
    guard.exceeding(big(1));
    expect(scan).toHaveBeenCalledTimes(MAX_CACHED_SOURCES + 1);
    guard.exceeding(big(0));
    expect(scan).toHaveBeenCalledTimes(MAX_CACHED_SOURCES + 2);
  });
});
