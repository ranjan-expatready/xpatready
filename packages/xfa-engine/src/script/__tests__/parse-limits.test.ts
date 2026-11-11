import { describe, expect, it } from 'vitest';
import { freeNames } from '../../runtime/free-names.js';
import { MAX_SCRIPT_AST_NODES, parseFailure } from '../ast.js';
import { buildScriptObjectProgram } from '../script-object.js';
import { expectScriptError } from './helpers.js';

/** Both analyses of a script that parse it: the binder's free names and the script-object exports. */
const analyses: readonly (readonly [string, (source: string) => unknown])[] = [
  ['freeNames', (source) => freeNames(source)],
  ['buildScriptObjectProgram', (source) => buildScriptObjectProgram('lib', source)],
];

describe('a script nested past what the parser can hold is a typed SCRIPT_LIMIT, not a syntax error (L2-F3)', () => {
  const deep: readonly (readonly [string, string])[] = [
    ['a chain of 20,000 else-ifs', 'if(a){}' + ' else if(a){}'.repeat(20_000)],
    ['100,000 nested parentheses', `${'('.repeat(100_000)}1${')'.repeat(100_000)}`],
    ['100,000 nested array literals', `${'['.repeat(100_000)}${']'.repeat(100_000)}`],
  ];

  describe.each(analyses)('%s', (_name, analyse) => {
    it.each(deep)('%s', (_shape, source) => {
      const error = expectScriptError(() => analyse(source));
      expect(error.code).toBe('SCRIPT_LIMIT');
      expect(error.limit).toBe('source-size');
    });

    it('a genuine syntax error is still SCRIPT_ERROR', () => {
      expect(expectScriptError(() => analyse('var = ;')).code).toBe('SCRIPT_ERROR');
      expect(expectScriptError(() => analyse('let x = 1;')).code).toBe('SCRIPT_ERROR');
    });
  });

  it('the shared mapping: stack exhaustion (a RangeError, or the parser\'s own message) is a limit, anything else a script error', () => {
    expect(parseFailure(new RangeError('Maximum call stack size exceeded'), 'script').code).toBe('SCRIPT_LIMIT');
    expect(parseFailure(new SyntaxError('Not enough stack space to parse input (1:49560)'), 'script').code).toBe('SCRIPT_LIMIT');
    expect(parseFailure(new SyntaxError('Unexpected token (1:4)'), 'script').code).toBe('SCRIPT_ERROR');
    expect(parseFailure('not an error object', 'script').code).toBe('SCRIPT_ERROR');
  });
});

describe('an event script and a script object have the same node ceiling (L2-F4)', () => {
  // About 600,000 nodes (the program, then a statement and an identifier per `a;`): under the ceiling for one pass over the tree.
  const source = 'a;'.repeat(300_000);

  it('a script of about 600,000 nodes is analysed by both, though the free-name analysis walks the tree twice', () => {
    expect(source.length).toBeLessThan(4 * 1024 * 1024);
    expect(freeNames(source)).toEqual(['a']);
    expect(buildScriptObjectProgram('lib', source)).toContain('__xfaExports');
  });

  it('a script over the ceiling is refused by both', () => {
    for (const [, analyse] of analyses) {
      const error = expectScriptError(() => analyse('a;'.repeat(MAX_SCRIPT_AST_NODES / 2 + 1)));
      expect(error.code).toBe('SCRIPT_LIMIT');
    }
  });
});
