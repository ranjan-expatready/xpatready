import { MAX_SOM_CHARS, MAX_SOM_INDEX_DIGITS, MAX_SOM_NAME_CHARS, MAX_SOM_SEGMENTS } from './limits.js';

/**
 * The SOM grammar, with no dependency on the form DOM or the error classes, so the template feature gate (a FormCalc
 * script that is one bare reference) and the run-time resolver decide with the SAME rules: whatever the resolver
 * would refuse, the gate refuses when the template is loaded. `parseSom` turns a refusal into its typed error.
 */

/**
 * One step of a SOM path. `name` matches children called `text` (an unnamed child answers to its class name too);
 * `class` (written `#text`) matches children of that class whatever their name. `index` picks the n-th match, or all.
 */
export interface SomSegment {
  readonly kind: 'name' | 'class';
  readonly text: string;
  readonly index: number | 'all';
}

export interface SomPath {
  readonly segments: readonly SomSegment[];
}

/** Why an expression was refused: wrongly typed or empty (`invalid`), over a ceiling (`limit`), or valid SOM the engine does not implement (`unsupported`). */
export interface SomRefusal {
  readonly ok: false;
  readonly kind: 'invalid' | 'limit' | 'unsupported';
  readonly detail: string;
}

export type SomScan = { readonly ok: true; readonly path: SomPath } | SomRefusal;

const refuse = (kind: SomRefusal['kind'], detail: string): SomRefusal => ({ ok: false, kind, detail });

const DOT = 46;
const HASH = 35;
const OPEN = 91;
const CLOSE = 93;
const STAR = 42;
const PLUS = 43;
const MINUS = 45;
const DOLLAR = 36;
const BANG = 33;
const UNDERSCORE = 95;

const isAsciiLetter = (c: number): boolean => (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
const isDigit = (c: number): boolean => c >= 48 && c <= 57;
/** Single-character tests (no repetition, so no backtracking): a non-ASCII letter or mark may start a name, a digit may continue it. */
const NON_ASCII_START = /^[\p{L}\p{M}]$/u;
const NON_ASCII_CONTINUE = /^[\p{L}\p{M}\p{N}]$/u;

/** Length (1 or 2 UTF-16 units) of the name character at `at` when it is one, else 0. `start` selects the stricter first-character rule. */
function nameCharLength(text: string, at: number, start: boolean): number {
  const c = text.charCodeAt(at);
  if (c < 0x80) {
    if (isAsciiLetter(c) || c === UNDERSCORE) return 1;
    return !start && (isDigit(c) || c === MINUS) ? 1 : 0;
  }
  const cp = text.codePointAt(at) ?? c;
  if (!(start ? NON_ASCII_START : NON_ASCII_CONTINUE).test(String.fromCodePoint(cp))) return 0;
  return cp > 0xffff ? 2 : 1;
}

/**
 * True when `name` can be written as a plain SOM name: a letter or underscore, then letters, digits, `_` or `-`
 * (Unicode letters, digits and marks included), at most `MAX_SOM_NAME_CHARS` long. Anything else (a dot, a space, a
 * leading digit) has no plain spelling and is addressed by `#class[n]`.
 */
export function isSomName(name: string): boolean {
  if (name.length === 0 || name.length > MAX_SOM_NAME_CHARS) return false;
  for (let i = 0, step = 0; i < name.length; i += step) {
    step = nameCharLength(name, i, i === 0);
    if (step === 0) return false;
  }
  return true;
}

/** Reads a name at `from`; returns the index after it, or `from` when none starts there, or a refusal past the name ceiling. */
function readName(text: string, from: number): number | SomRefusal {
  let i = from;
  for (;;) {
    const step = i < text.length ? nameCharLength(text, i, i === from) : 0;
    if (step === 0) return i;
    i += step;
    if (i - from > MAX_SOM_NAME_CHARS) return refuse('limit', `a SOM name may hold at most ${MAX_SOM_NAME_CHARS} characters`);
  }
}

/** Reads `[n]` or `[*]` at `from` (which holds `[`); returns the index and the position after `]`. */
function readIndex(text: string, from: number): { index: number | 'all'; end: number } | SomRefusal {
  let i = from + 1;
  const c = text.charCodeAt(i);
  if (c === STAR) {
    if (text.charCodeAt(i + 1) !== CLOSE) return refuse('unsupported', `an index must be a number or * and then ] (position ${i + 1})`);
    return { index: 'all', end: i + 2 };
  }
  if (c === PLUS || c === MINUS) return refuse('unsupported', 'a relative index [+n] / [-n] is not supported');
  const digits = i;
  while (i < text.length && isDigit(text.charCodeAt(i))) {
    i += 1;
    if (i - digits > MAX_SOM_INDEX_DIGITS) return refuse('limit', `a SOM index may have at most ${MAX_SOM_INDEX_DIGITS} digits`);
  }
  if (i === digits || text.charCodeAt(i) !== CLOSE) return refuse('unsupported', `an index must be a number or * and then ] (position ${from})`);
  return { index: Number(text.slice(digits, i)), end: i + 1 };
}

/** Says why the character at `at`, where a segment must start, cannot start one. */
function badSegmentStart(text: string, at: number): SomRefusal {
  const c = text.charCodeAt(at);
  if (at >= text.length) return refuse('unsupported', 'the expression ends with a dot');
  if (c === DOT) return refuse('unsupported', at === 0 ? 'a leading dot is not supported' : 'descendant search (..) is not supported');
  if (c === DOLLAR) return refuse('unsupported', 'the $ shortcuts ($, $data, $form, $record, ...) are not supported');
  if (c === BANG) return refuse('unsupported', 'the ! datasets shortcut is not supported');
  if (c === STAR) return refuse('unsupported', 'a * wildcard name is not supported (use [*] after a name)');
  if (c === OPEN) return refuse('unsupported', 'a predicate [..] is not supported');
  return refuse('unsupported', `unexpected character at position ${at}`);
}

/**
 * Scans a SOM expression: dotted segments, each a name or `#class`, optionally followed by one `[n]` or `[*]`.
 * Everything else (`..`, `$` and `!` shortcuts, predicates, relative indexes, wildcards, whitespace, calls) is refused
 * rather than mis-resolved. One forward pass over at most `MAX_SOM_CHARS` characters, no regular expression over the
 * expression, so hostile text cannot make it backtrack or run long. Never throws.
 */
export function scanSom(expression: string): SomScan {
  if (typeof expression !== 'string' || expression.length === 0) return refuse('invalid', 'a SOM expression must be a non-empty string');
  if (expression.length > MAX_SOM_CHARS) return refuse('limit', `a SOM expression may hold at most ${MAX_SOM_CHARS} characters`);
  const segments: SomSegment[] = [];
  let i = 0;
  for (;;) {
    if (segments.length >= MAX_SOM_SEGMENTS) return refuse('limit', `a SOM expression may have at most ${MAX_SOM_SEGMENTS} segments`);
    const kind = expression.charCodeAt(i) === HASH ? 'class' : 'name';
    const from = kind === 'class' ? i + 1 : i;
    const end = readName(expression, from);
    if (typeof end !== 'number') return end;
    if (end === from) return kind === 'class' ? refuse('unsupported', `a # selector needs a class name (position ${i})`) : badSegmentStart(expression, i);
    i = end;
    let index: number | 'all' = 0;
    if (expression.charCodeAt(i) === OPEN) {
      const read = readIndex(expression, i);
      if ('ok' in read) return read;
      index = read.index;
      i = read.end;
    }
    segments.push({ kind, text: expression.slice(from, end), index });
    if (i >= expression.length) return { ok: true, path: { segments } };
    if (expression.charCodeAt(i) !== DOT) return refuse('unsupported', `unexpected character at position ${i}`);
    i += 1;
  }
}
