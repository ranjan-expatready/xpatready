import { describe, expect, it } from 'vitest';
import { XfaScriptError } from '../../script/index.js';
import { MAX_SCRIPT_AST_NODES } from '../../script/ast.js';
import { freeNames } from '../free-names.js';
import { thrown } from './helpers.js';

describe('freeNames: which identifiers a form script leaves for the form tree to answer', () => {
  it('lists a bare name the script reads, in order of first use, so a sibling field referenced as `Year.rawValue` can be bound to its node', () => {
    expect(freeNames('Year.rawValue = null; Month.rawValue = Year.rawValue;')).toEqual(['Year', 'Month']);
  });

  it('does not list what the script declares itself (var, function, parameter, catch variable, named function expression)', () => {
    const src = [
      'var a = 1; function f(p) { var q = p; return q + a; }',
      'try { g(); } catch (e) { h(e); }',
      'var k = function named() { return named; };',
    ].join('\n');
    expect(freeNames(src)).toEqual(['g', 'h']);
  });

  it('does not list property names, object-literal keys or labels, which are not references', () => {
    const src = 'var o = { alpha: beta, "gamma": 1 }; o.delta.epsilon = zeta; outer: for (;;) { break outer; }';
    expect(freeNames(src)).toEqual(['beta', 'zeta']);
  });

  it('keeps a name free outside the function that declares it, so a local `i` in one helper does not hide a form field called `i` elsewhere', () => {
    const src = 'function inner() { var i = 0; return i; } i.rawValue = 1;';
    expect(freeNames(src)).toEqual(['i']);
  });

  it('lists a name used inside a nested function when no enclosing scope declares it, and not when an enclosing one does', () => {
    expect(freeNames('function a() { return function b() { return fieldX.rawValue; }; }')).toEqual(['fieldX']);
    expect(freeNames('var fieldX; function a() { return function b() { return fieldX; }; }')).toEqual([]);
  });

  it('lists an undeclared assignment target (an implicit global such as a loop counter), because the caller decides whether a node of that name exists', () => {
    expect(freeNames('for (i = 0; i < n; i++) { total += i; }')).toEqual(['i', 'n', 'total']);
  });

  it('counts `arguments` as declared inside a function and the language globals as ordinary free names (the caller filters those)', () => {
    expect(freeNames('function f() { return arguments.length; } Math.round(x);')).toEqual(['Math', 'x']);
  });

  it('refuses text that is not ES3 with a typed script error naming the parse problem, never a bare SyntaxError', () => {
    const error = thrown(() => freeNames('let x = 1;'));
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('SCRIPT_ERROR');
  });
});

describe('freeNames: a hostile script cannot overflow the host stack or make the analysis unbounded', () => {
  const shapes: readonly (readonly [string, (n: number) => string, readonly string[]])[] = [
    ['a member chain', (n) => `a${'.b'.repeat(n)};`, ['a']],
    ['a left-nested sum', (n) => `x = ${'a + '.repeat(n)}a;`, ['x', 'a']],
    ['a chain of calls', (n) => `f${'()'.repeat(n)};`, ['f']],
  ];

  it.each(shapes.flatMap(([name, build, names]) => [5_000, 50_000].map((n) => [name, n, build, names] as const)))(
    'walks %s of %i segments to its free names or stops with a typed script error, never a bare RangeError',
    (_name, n, build, names) => {
      let result: readonly string[] | undefined;
      const error = thrown(() => {
        result = freeNames(build(n));
      });
      if (error === undefined) expect(result).toEqual(names);
      else {
        expect(error).toBeInstanceOf(XfaScriptError);
        // SCRIPT_ERROR: the parser's own recursion gave out on a very deep sum, which it already reports as a parse failure.
        expect(['SCRIPT_LIMIT', 'SCRIPT_ERROR']).toContain((error as XfaScriptError).code);
      }
    },
  );

  it('a 5000-segment chain is analysed, not refused: a long but ordinary expression is no reason to fail the form', () => {
    expect(freeNames(`a${'.b'.repeat(5_000)};`)).toEqual(['a']);
  });

  it('keeps the order of first use through nested calls and functions', () => {
    expect(freeNames('f(b, g(c), function () { return d + e; }, h);')).toEqual(['f', 'b', 'g', 'c', 'd', 'e', 'h']);
  });

  it('a script whose syntax tree is larger than the ceiling is a typed SCRIPT_LIMIT before the walk runs away', () => {
    const error = thrown(() => freeNames('a;'.repeat(MAX_SCRIPT_AST_NODES)));
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('SCRIPT_LIMIT');
    expect((error as XfaScriptError).limit).toBe('source-size');
  });
});
