import { malformed } from './errors.js';
import { CR, LF, PdfLexer, type PdfToken } from './lexer.js';
import { safeText } from './safe-text.js';
import { asNonNegInt, isPdfRef, type PdfDict, type PdfIndirect, type PdfRef, type PdfStream, type PdfValue } from './types.js';

const ENDSTREAM = 'endstream';

/**
 * FD-38 exemption (security invariant): hard stop for hostile `[[[[...` /
 * `<</A <</A ...` input in an uploaded PDF, so the recursive parser cannot be
 * driven into stack exhaustion. Real PDFs nest a handful of levels; no firm or
 * operator has a reason to raise it.
 */
const MAX_DEPTH = 256;

/** Resolves an indirect `/Length` to its integer value. Supplied by the xref layer (W01-T02). */
export type ResolveLength = (ref: PdfRef) => number;

/** The value of a non-negative safe-integer number token (object number / generation), else undefined. */
export function tokenIndex(t: PdfToken): number | undefined {
  return t.kind === 'number' && t.integer ? asNonNegInt(t.value) : undefined;
}

/**
 * Reports the memory a parse is about to commit, in bytes. The reader wires it to its `DecodeBudget`, which throws
 * MALFORMED when the per-reader total is spent; unit tests and one-off parses pass nothing.
 */
export type ParseCharge = (bytes: number) => void;

/**
 * Conservative accounting weight of one parsed node (a value, or a dictionary key): a JS object or array slot plus
 * its Map entry is 40-100 bytes. A weight, not a ceiling: the ceiling is the reader's `MAX_TOTAL_DECODED_BYTES`
 * (about 4 million nodes). Strings and names also pay for their bytes.
 */
export const PARSE_NODE_COST = 64;

/** Parses one object, recognising `n g R` as a reference. */
export function parseValue(lexer: PdfLexer, charge?: ParseCharge): PdfValue {
  return parseAt(lexer, 0, charge);
}

function parseAt(lexer: PdfLexer, depth: number, charge: ParseCharge | undefined): PdfValue {
  if (depth > MAX_DEPTH) throw malformed('Object nesting too deep', lexer.pos);
  const start = lexer.pos;
  const t = lexer.nextToken();
  switch (t.kind) {
    case 'eof':
      throw malformed('Unexpected end of data', start);
    case 'name':
      charge?.(PARSE_NODE_COST + t.value.length);
      return { kind: 'name', value: t.value };
    case 'string':
      charge?.(PARSE_NODE_COST + t.bytes.length);
      return { kind: 'string', bytes: t.bytes, hex: t.hex };
    case 'number':
      {
        charge?.(PARSE_NODE_COST);
        const index = tokenIndex(t);
        return index === undefined ? t.value : parseNumberOrRef(lexer, index);
      }
    case 'keyword':
      charge?.(PARSE_NODE_COST);
      if (t.value === 'true') return true;
      if (t.value === 'false') return false;
      if (t.value === 'null') return null;
      throw malformed(`Unexpected keyword "${safeText(t.value)}"`, start);
    case 'delim':
      if (t.value === '[' || t.value === '<<') {
        charge?.(PARSE_NODE_COST);
        return t.value === '[' ? parseArray(lexer, depth, charge) : parseDict(lexer, depth, charge);
      }
      throw malformed(`Unexpected "${t.value}"`, start);
  }
}

/** After an integer `num`: try `gen R`; otherwise rewind so the following tokens are untouched. */
function parseNumberOrRef(lexer: PdfLexer, num: number): PdfValue {
  const mark = lexer.pos;
  const gen = tokenIndex(lexer.nextToken());
  if (gen !== undefined) {
    const r = lexer.nextToken();
    if (r.kind === 'keyword' && r.value === 'R') return { kind: 'ref', num, gen };
  }
  lexer.pos = mark;
  return num;
}

function parseArray(lexer: PdfLexer, depth: number, charge: ParseCharge | undefined): PdfValue[] {
  const out: PdfValue[] = [];
  for (;;) {
    const mark = lexer.pos;
    const t = lexer.nextToken();
    if (t.kind === 'delim' && t.value === ']') return out;
    if (t.kind === 'eof') throw malformed('Unterminated array', mark);
    lexer.pos = mark;
    out.push(parseAt(lexer, depth + 1, charge));
  }
}

function parseDict(lexer: PdfLexer, depth: number, charge: ParseCharge | undefined): PdfDict {
  const dict: PdfDict = new Map();
  for (;;) {
    const at = lexer.pos;
    const key = lexer.nextToken();
    if (key.kind === 'delim' && key.value === '>>') return dict;
    if (key.kind === 'eof') throw malformed('Unterminated dictionary', at);
    if (key.kind !== 'name') throw malformed('Dictionary key must be a name', at);
    charge?.(PARSE_NODE_COST + key.value.length);
    dict.set(key.value, parseAt(lexer, depth + 1, charge));
  }
}

function expectKeyword(lexer: PdfLexer, word: string): void {
  const at = lexer.pos;
  const t = lexer.nextToken();
  if (t.kind !== 'keyword' || t.value !== word) throw malformed(`Expected "${word}"`, at);
}

function expectIndex(lexer: PdfLexer, what: string): number {
  const at = lexer.pos;
  const index = tokenIndex(lexer.nextToken());
  if (index === undefined) throw malformed(`Expected ${what}`, at);
  return index;
}

/** Parses `num gen obj … endobj` at `offset`, including a `stream … endstream` body. */
export function parseIndirectAt(bytes: Uint8Array, offset: number, resolveLength?: ResolveLength, charge?: ParseCharge): PdfIndirect {
  if (!Number.isInteger(offset) || offset < 0 || offset >= bytes.length) {
    throw malformed('Object offset outside file', offset);
  }
  const lexer = new PdfLexer(bytes, offset);
  const num = expectIndex(lexer, 'object number');
  const gen = expectIndex(lexer, 'generation number');
  expectKeyword(lexer, 'obj');
  const value = parseValue(lexer, charge);

  const at = lexer.pos;
  const next = lexer.nextToken();
  if (next.kind === 'keyword' && next.value === 'endobj') return { num, gen, value };
  if (next.kind === 'keyword' && next.value === 'stream') {
    if (!(value instanceof Map)) throw malformed('"stream" must follow a dictionary', at);
    const stream = readStreamBody(lexer, value, resolveLength);
    expectKeyword(lexer, 'endobj');
    return { num, gen, value: stream };
  }
  throw malformed('Expected "endobj"', at);
}

function readStreamBody(lexer: PdfLexer, dict: PdfDict, resolveLength?: ResolveLength): PdfStream {
  const { bytes } = lexer;
  // ISO 32000-1 §7.3.8.1: "stream" is followed by CRLF or LF (never a bare CR).
  let start = lexer.pos;
  if (bytes[start] === CR && bytes[start + 1] === LF) start += 2;
  else if (bytes[start] === LF) start += 1;
  else throw malformed('"stream" must be followed by CRLF or LF', start);

  const length = lengthOf(dict.get('Length'), resolveLength, start);
  if (start + length > bytes.length) throw malformed('Stream /Length runs past end of file', start);
  const end = start + length;
  // /Length must land on `endstream`, allowing at most ONE EOL (CRLF, LF or CR) before it.
  let at = end;
  if (bytes[at] === CR && bytes[at + 1] === LF) at += 2;
  else if (bytes[at] === CR || bytes[at] === LF) at += 1;
  for (let i = 0; i < ENDSTREAM.length; i++) {
    if (bytes[at + i] !== ENDSTREAM.charCodeAt(i)) throw malformed('Stream /Length does not land on endstream', end);
  }
  lexer.pos = at + ENDSTREAM.length;
  return { dict, raw: bytes.slice(start, end) };
}

function lengthOf(raw: PdfValue | undefined, resolveLength: ResolveLength | undefined, at: number): number {
  let value = raw;
  if (isPdfRef(raw)) {
    if (!resolveLength) throw malformed('Indirect /Length without a resolver', at);
    value = resolveLength(raw);
  }
  const length = asNonNegInt(value);
  if (length === undefined) throw malformed('Stream /Length missing or not a non-negative integer', at);
  return length;
}
