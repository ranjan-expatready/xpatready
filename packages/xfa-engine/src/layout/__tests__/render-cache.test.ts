import { describe, expect, it } from 'vitest';
import { XfaLayoutError } from '../errors.js';
import { readRenderCache } from '../render-cache.js';

const BOUNDS = 'bounds 348569 7966 0 0 1417 1418 0 0';
const RUN = 'textRun 14 Applicant Name 0 1417 6667 0 0 0 "Myriad Pro" 0 0 7000 ISO-8859-1';

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(XfaLayoutError);
    return (error as XfaLayoutError).code;
  }
  throw new Error('expected readRenderCache to throw');
}

describe('readRenderCache: the template renderCache processing instructions as typed records (A3)', () => {
  it('reads bounds in millipoints as points and keeps the unconfirmed fields raw', () => {
    const cache = readRenderCache([BOUNDS]);
    expect(cache.bounds).toEqual({
      widthPt: 348.569,
      heightPt: 7.966,
      leftInsetPt: 1.417,
      topInsetPt: 1.418,
      rawMp: [348569, 7966, 0, 0, 1417, 1418, 0, 0],
    });
  });

  it('reads a textRun: text counted in UTF-8 bytes, position, colour, face, style flags and size', () => {
    const [run] = readRenderCache([RUN]).textRuns;
    expect(run).toMatchObject({ text: 'Applicant Name', xPt: 1.417, baselineYPt: 6.667, colour: [0, 0, 0], typeface: 'Myriad Pro', bold: false, sizePt: 7, encoding: 'ISO-8859-1' });
  });

  it('counts the text length in UTF-8 bytes, not characters (a form with an accented capital would otherwise misparse)', () => {
    const [run] = readRenderCache(['textRun 46 IMMIGRATION, RÉFUGIÉS ET CITOYENNETÉ CANADA 0 1417 13117 0 0 0 "Myriad Pro" 0 0 6000 ISO-8859-1']).textRuns;
    expect(run?.text).toBe('IMMIGRATION, RÉFUGIÉS ET CITOYENNETÉ CANADA');
    const [quoted] = readRenderCache(['textRun 7 ‘a’ 0 0 0 0 0 0 "F" 1 0 7000 ISO-8859-1']).textRuns;
    expect(quoted).toMatchObject({ text: '‘a’', bold: true });
  });

  it('keeps leading and trailing spaces of the text, and text that looks like numbers or quotes', () => {
    const runs = readRenderCache(['textRun 6 a "b"  0 0 0 0 0 0 "F" 0 0 7000 ISO-8859-1', 'textRun 3 1 2 0 5 6 0 0 255 "F" 0 0 7000 ISO-8859-1']).textRuns;
    expect(runs.map((r) => r.text)).toEqual(['a "b" ', '1 2']);
    expect(runs[1]).toMatchObject({ xPt: 0.005, baselineYPt: 0.006, colour: [0, 0, 255] });
  });

  it('reads a line as two endpoints in points and a colour; the last number stays raw', () => {
    const [line] = readRenderCache(['line 155945 145460 188957 145460 0 0 255 280']).lines;
    expect(line).toEqual({ x1Pt: 155.945, y1Pt: 145.46, x2Pt: 188.957, y2Pt: 145.46, colour: [0, 0, 255], rawLastMp: 280 });
  });

  it('keeps subset lines as raw text and unknown targets apart, without failing (they are not oracles)', () => {
    const cache = readRenderCache(['subset "Myriad Pro" 0 1 ISO-8859-1 4 4 1 0054s', 'futureThing 1 2 3']);
    expect(cache.subsets).toEqual(['"Myriad Pro" 0 1 ISO-8859-1 4 4 1 0054s']);
    expect(cache.unrecognised).toEqual(['futureThing 1 2 3']);
    expect(cache.bounds).toBeUndefined();
    expect(cache.textRuns).toEqual([]);
    expect(cache.lines).toEqual([]);
  });

  it('an empty list reads as an empty cache', () => {
    expect(readRenderCache([])).toEqual({ bounds: undefined, textRuns: [], lines: [], subsets: [], unrecognised: [] });
  });

  it('refuses malformed records of a known kind with INVALID_ARGUMENT (never NaN, never a partial record)', () => {
    for (const bad of [
      'bounds 1 2 3',
      'bounds 1 2 0 0 0 0 0 x',
      'bounds 1 2 0 0 0 0 0 0 9',
      'line 1 2 3',
      'textRun',
      'textRun x a',
      'textRun 99 short 0 0 0 0 0 0 "F" 0 0 7000 ISO-8859-1',
      'textRun 2 ab 0 0 0 0 0 0 F 0 0 7000 ISO-8859-1',
      'textRun 2 ab 0 0 0 300 0 0 "F" 0 0 7000 ISO-8859-1',
      'textRun 2 ab 0 0 0 0 0 0 "F" 2 0 7000 ISO-8859-1',
      'textRun 2 ab 0 0 0 0 0 0 "F" 0 0 0 ISO-8859-1',
    ]) {
      expect(codeOf(() => readRenderCache([bad])), bad).toBe('INVALID_ARGUMENT');
    }
  });

  it('a text length that ends inside a multi-byte character is malformed, not a half character', () => {
    expect(codeOf(() => readRenderCache(['textRun 1 é 0 0 0 0 0 0 "F" 0 0 7000 ISO-8859-1']))).toBe('INVALID_ARGUMENT');
  });

  it('refuses a second bounds record on one node (a node has one box)', () => {
    expect(codeOf(() => readRenderCache([BOUNDS, BOUNDS]))).toBe('INVALID_ARGUMENT');
  });

  it('a hostile entry list is bounded: an entry over the length ceiling is refused before parsing', () => {
    expect(codeOf(() => readRenderCache([`textRun 99999999 ${'a'.repeat(300_000)}`]))).toBe('INVALID_ARGUMENT');
  });
});
