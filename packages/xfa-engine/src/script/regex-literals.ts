import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { Parser, tokTypes, type Token, type TokenType } from 'acorn';

/** The members of acorn's lexer the regular-expression scan below reads; acorn's type declarations omit them. */
interface LexerInternals {
  readonly input: string;
  pos: number;
  readWord1(): string;
  raise(pos: number, message: string): never;
  finishToken(type: TokenType, value: unknown): void;
}

/** The line terminators that end a regular-expression literal early (ECMAScript LineTerminator). */
const LINE_TERMINATOR = /[\n\r\u2028\u2029]/;

/**
 * `acorn` with its regular-expression token reader replaced by the lexical scan of the specification's
 * RegularExpressionLiteral and nothing more. The stock reader validates the pattern and then compiles it with the host's
 * own `new RegExp` before it reports the token: a pattern of millions of characters would be compiled by V8 on the host, and
 * a pattern acorn's validator refuses would raise before the token is reported although QuickJS may accept it. This scan
 * walks to the closing `/` (a `\` escapes the next character, a `/` inside `[...]` does not close the literal), reads the
 * flags, and reports `{ pattern, flags }`; the pattern is never compiled or validated here.
 */
const LexicalParser = Parser.extend((Base) =>
  class extends Base {
    readRegexp(): void {
      const lexer = this as unknown as LexerInternals;
      const start = lexer.pos;
      let escaped = false;
      let inClass = false;
      for (;;) {
        if (lexer.pos >= lexer.input.length) lexer.raise(start, 'Unterminated regular expression');
        const ch = lexer.input.charAt(lexer.pos);
        if (LINE_TERMINATOR.test(ch)) lexer.raise(start, 'Unterminated regular expression');
        if (escaped) escaped = false;
        else if (ch === '[') inClass = true;
        else if (ch === ']' && inClass) inClass = false;
        else if (ch === '/' && !inClass) break;
        else escaped = ch === '\\';
        lexer.pos += 1;
      }
      const pattern = lexer.input.slice(start, lexer.pos);
      lexer.pos += 1;
      const flags = lexer.readWord1();
      lexer.finishToken(tokTypes.regexp, { pattern, flags, value: null });
    }
  },
);

/** The pattern length of a `regexp` token (its `value` is `{ pattern, flags }`; the flags are not part of the length). */
const regexPatternLength = (token: Token): number => {
  const value: unknown = Reflect.get(token, 'value');
  if (typeof value !== 'object' || value === null) return 0;
  const pattern: unknown = Reflect.get(value, 'pattern');
  return typeof pattern === 'string' ? pattern.length : 0;
};

const isRegexToken = (token: Token): boolean => token.type.label === 'regexp';

const PARSE_OPTIONS = { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, allowHashBang: true } as const;

/**
 * The pattern length (characters, flags excluded) of the longest regular-expression literal in `source`, or 0 when it has
 * none. The text is parsed with `acorn`, the parser the host already uses for free names and script objects, at the newest
 * dialect (QuickJS compiles ES2023, so a template literal or an arrow function must not hide a literal); the parser's token
 * stream is the answer, so a `/` inside a string, a comment or a division is never a literal and no syntax tree is walked.
 * A source the parser refuses (a syntax error, or nesting past the host stack) is scanned again with the tokenizer, which
 * is flat and cannot overflow, up to the point it can no longer read: QuickJS then rejects the same text with its own error,
 * and a literal placed after a deep nesting cannot slip past the check by making the parser fail.
 */
export function longestRegexLiteral(source: string): number {
  let longest = 0;
  const note = (token: Token): void => {
    if (isRegexToken(token)) longest = Math.max(longest, regexPatternLength(token));
  };
  try {
    LexicalParser.parse(source, { ...PARSE_OPTIONS, onToken: note });
    return longest;
  } catch {
    longest = 0;
  }
  try {
    for (const token of LexicalParser.tokenizer(source, PARSE_OPTIONS)) note(token);
  } catch {
    // Unreadable from here on; whatever was read before is the best static answer.
  }
  return longest;
}

/**
 * FD-38 security invariant: verdicts kept per sandbox. A hostile form cannot raise it, and it bounds what the cache
 * retains to this many 32-byte digests plus a length each (the sources themselves are never held), whatever the scripts
 * are. The real forms have a few hundred distinct scripts, so a script that is run again and again is almost always a hit.
 */
export const MAX_CACHED_SOURCES = 256;

/**
 * The static pre-pass of the RegExp source bound (FD-38): refuses, before QuickJS sees it, a regular-expression literal
 * whose pattern is longer than `limit`. QuickJS compiles a literal natively and without polling its interrupt, so the
 * runtime guard in the prelude (which only sees `new RegExp(...)` and its relatives) cannot bound it. A string built at run
 * time and compiled by `eval` or `Function` is not visible here and stays covered only by the runtime guard and the watchdog.
 * A pattern cannot be longer than the text that holds it, so a source no longer than `limit` is never scanned; the verdict
 * for a script that is run again and again (a calculation) is remembered under the SHA-256 of its text.
 */
export class RegexLiteralGuard {
  readonly #verdicts = new Map<string, number>();
  readonly #scan: (source: string) => number;

  constructor(
    private readonly limit: number,
    scan: (source: string) => number = longestRegexLiteral,
  ) {
    this.#scan = scan;
  }

  /** How many verdicts are held. */
  get size(): number {
    return this.#verdicts.size;
  }

  /** The pattern length of the longest literal in `source` when it is over the limit, else `undefined`. */
  exceeding(source: string): number | undefined {
    if (source.length <= this.limit || !source.includes('/')) return undefined;
    const key = `${source.length}:${bytesToHex(sha256(new TextEncoder().encode(source)))}`;
    let longest = this.#verdicts.get(key);
    if (longest === undefined) {
      longest = this.#scan(source);
      const oldest = this.#verdicts.keys().next();
      if (this.#verdicts.size >= MAX_CACHED_SOURCES && !oldest.done) this.#verdicts.delete(oldest.value);
      this.#verdicts.set(key, longest);
    }
    return longest > this.limit ? longest : undefined;
  }
}
