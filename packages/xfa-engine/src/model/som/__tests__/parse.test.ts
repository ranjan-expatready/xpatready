import { describe, expect, it } from 'vitest';
import { expectXfa, expectForm } from '../../form/__tests__/helpers.js';
import { MAX_SOM_CHARS, MAX_SOM_INDEX_DIGITS, MAX_SOM_SEGMENTS, parseSom } from '../index.js';

const seg = (kind: 'name' | 'class', text: string, index: number | 'all' = 0): { kind: string; text: string; index: number | 'all' } => ({ kind, text, index });

describe('parseSom: the grammar both forms use', () => {
  it('reads dotted names, [n] indexes, [*], #class selectors and defaults an absent index to 0', () => {
    expect(parseSom('Page1.PersonalDetails.Name.FamilyName').segments).toEqual([
      seg('name', 'Page1'),
      seg('name', 'PersonalDetails'),
      seg('name', 'Name'),
      seg('name', 'FamilyName'),
    ]);
    expect(parseSom('a.b[2].#text[1].c[*]').segments).toEqual([seg('name', 'a'), seg('name', 'b', 2), seg('class', 'text', 1), seg('name', 'c', 'all')]);
    expect(parseSom('ui.#textEdit').segments).toEqual([seg('name', 'ui'), seg('class', 'textEdit')]);
    expect(parseSom('#items').segments).toEqual([seg('class', 'items')]);
    expect(parseSom('Page4.BackgroundInfo.Choice[1]').segments.at(-1)).toEqual(seg('name', 'Choice', 1));
  });

  it('reads the absolute manifest and somExpression shape, including a trailing dataNode', () => {
    const parsed = parseSom('xfa[0].form[0].form1[0].Page1[0].X[0].dataNode');
    expect(parsed.segments.map((s) => s.text)).toEqual(['xfa', 'form', 'form1', 'Page1', 'X', 'dataNode']);
    expect(parsed.segments.every((s) => s.kind === 'name' && s.index === 0)).toBe(true);
  });

  it('accepts hyphens, underscores, digits after the first character and non-ASCII letters in a name', () => {
    expect(parseSom('_a-b_9.Prénom[0]').segments.map((s) => s.text)).toEqual(['_a-b_9', 'Prénom']);
  });

  it('reads a multi-digit index and the largest index it accepts', () => {
    expect(parseSom('a[12]').segments[0]?.index).toBe(12);
    expect(parseSom(`a[${'9'.repeat(MAX_SOM_INDEX_DIGITS)}]`).segments[0]?.index).toBe(Number('9'.repeat(MAX_SOM_INDEX_DIGITS)));
  });
});

describe('parseSom: grammar the engine does not implement is refused, never mis-resolved', () => {
  const unsupported: readonly (readonly [string, string])[] = [
    ['..', 'descendant search a..b'],
    ['a..b', 'descendant search a..b'],
    ['a.', 'trailing dot'],
    ['.a', 'leading dot'],
    ['$', 'bare $ shortcut'],
    ['$.rawValue', '$ shortcut'],
    ['$data.x', '$data shortcut'],
    ['$record.x', '$record shortcut'],
    ['$form.x', '$form shortcut'],
    ['$template.x', '$template shortcut'],
    ['!a', '! datasets shortcut'],
    ['a.[x=1]', 'predicate'],
    ['a[x=1]', 'predicate inside an index'],
    ['a[+1]', 'relative index'],
    ['a[-1]', 'relative index'],
    ['a.*', 'wildcard name'],
    ['*', 'wildcard name'],
    ['a b', 'space in a name'],
    [' a', 'leading space'],
    ['a ', 'trailing space'],
    ['a(b)', 'call syntax'],
    ['a[', 'unclosed index'],
    ['a[]', 'empty index'],
    ['a[1', 'unclosed index'],
    ['a[1]b', 'text after an index'],
    ['a[1][2]', 'two indexes'],
    ['a[*][0]', 'two indexes'],
    ['#', 'class selector without a class'],
    ['#1x', 'class selector starting with a digit'],
    ['a.#', 'class selector without a class'],
    ['1a', 'name starting with a digit'],
    ['a=b', 'comparison'],
    ['a"b', 'quote'],
    ['a\u0000b', 'control character'],
  ];
  it.each(unsupported)('%j is refused with UNSUPPORTED_FEATURE (%s)', (text) => {
    expectXfa(() => parseSom(text), 'UNSUPPORTED_FEATURE');
  });

  it('the message names the problem and echoes the input only through safeText (no raw control characters, bounded length)', () => {
    const err = expectXfa(() => parseSom(`\u001b[2Jevil${'x'.repeat(5000)}`), 'UNSUPPORTED_FEATURE');
    expect(err.message).not.toContain('\u001b');
    expect(err.message.length).toBeLessThan(400);
    expect(expectXfa(() => parseSom('a..b'), 'UNSUPPORTED_FEATURE').message).toMatch(/descendant|\.\./);
    expect(expectXfa(() => parseSom('$data.x'), 'UNSUPPORTED_FEATURE').message).toMatch(/\$/);
  });
});

describe('parseSom: argument checks and hostile input', () => {
  it('a non-string or empty expression is an invalid argument a script can catch', () => {
    expectForm(() => parseSom(''), 'INVALID_ARGUMENT');
    expectForm(() => parseSom(42 as unknown as string), 'INVALID_ARGUMENT');
    expectForm(() => parseSom(null as unknown as string), 'INVALID_ARGUMENT');
    expectForm(() => parseSom(undefined as unknown as string), 'INVALID_ARGUMENT');
  });

  it('a 10-million-character expression is refused by length before it is scanned, fast', () => {
    const started = Date.now();
    expectForm(() => parseSom('a'.repeat(10_000_000)), 'LIMIT');
    expectForm(() => parseSom(`${'a'.repeat(MAX_SOM_CHARS)}x`), 'LIMIT');
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('an expression of exactly the character ceiling is parsed and one character more is refused (the ceiling is not off by one)', () => {
    const parts: string[] = [];
    let used = 0;
    while (used + 251 <= MAX_SOM_CHARS) {
      parts.push('a'.repeat(250));
      used += 251;
    }
    const exact = `${parts.join('.')}.${'b'.repeat(MAX_SOM_CHARS - used)}`;
    expect(exact).toHaveLength(MAX_SOM_CHARS);
    expect(parseSom(exact).segments).toHaveLength(parts.length + 1);
    expectForm(() => parseSom(`${exact}b`), 'LIMIT');
  });

  it('too many segments is a LIMIT error even when the text is short', () => {
    expect(parseSom(Array.from({ length: MAX_SOM_SEGMENTS }, () => 'a').join('.')).segments).toHaveLength(MAX_SOM_SEGMENTS);
    expectForm(() => parseSom(Array.from({ length: MAX_SOM_SEGMENTS + 1 }, () => 'a').join('.')), 'LIMIT');
  });

  it('a name longer than the name ceiling and an index with too many digits are LIMIT errors', () => {
    expectForm(() => parseSom('a'.repeat(300)), 'LIMIT');
    expectForm(() => parseSom(`a[${'1'.repeat(MAX_SOM_INDEX_DIGITS + 1)}]`), 'LIMIT');
  });

  it('inputs that would make a backtracking matcher blow up are linear: repeated brackets, repeated hashes, near-miss names', () => {
    const started = Date.now();
    for (const text of ['a['.repeat(4000), '#'.repeat(4000), `${'a'.repeat(250)}!`, 'a.'.repeat(300) + '[', `${'a[1]'.repeat(1000)}`, '['.repeat(MAX_SOM_CHARS)]) {
      let caught: unknown;
      try {
        parseSom(text);
      } catch (e) {
        caught = e;
      }
      expect(caught, `must throw for ${text.slice(0, 12)}`).toBeInstanceOf(Error);
    }
    expect(Date.now() - started).toBeLessThan(500);
  });
});
