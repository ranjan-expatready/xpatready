import { describe, expect, it } from 'vitest';
import { enc } from '../../__tests__/bytes.js';
import type { PdfDict, PdfString, PdfValue } from '../../types.js';
import { mapStrings } from '../map-strings.js';

const str = (s: string): PdfString => ({ kind: 'string', bytes: enc(s), hex: false });
const upper = (s: PdfString): Promise<PdfString> => Promise.resolve({ kind: 'string', bytes: enc(String.fromCharCode(...s.bytes).toUpperCase()), hex: true });

describe('mapStrings', () => {
  it('maps strings nested in arrays and dictionaries and leaves every other value alone (a missed nesting level leaves plaintext or ciphertext behind)', async () => {
    const input: PdfValue = new Map<string, PdfValue>([
      ['A', str('a')],
      ['N', 5],
      ['L', [str('b'), [str('c')], null, true]],
      ['D', new Map<string, PdfValue>([['K', str('d')], ['Name', { kind: 'name', value: 'x' }]])],
    ]);
    const out = await mapStrings(input, upper);
    const expected: PdfValue = new Map<string, PdfValue>([
      ['A', { kind: 'string', bytes: enc('A'), hex: true }],
      ['N', 5],
      ['L', [{ kind: 'string', bytes: enc('B'), hex: true }, [{ kind: 'string', bytes: enc('C'), hex: true }], null, true]],
      ['D', new Map<string, PdfValue>([['K', { kind: 'string', bytes: enc('D'), hex: true }], ['Name', { kind: 'name', value: 'x' }]])],
    ]);
    expect(out).toEqual(expected);
  });

  it('does not modify its input (the caller\'s dictionary is shared state)', async () => {
    const d: PdfDict = new Map<string, PdfValue>([['A', str('a')]]);
    await mapStrings(d, upper);
    expect(d.get('A')).toEqual(str('a'));
  });

  it('leaves a signature dictionary\'s /Contents untouched, recognised by /Type /Sig, /Type /DocTimeStamp or /ByteRange (ISO 32000-1 7.6.1: that value is never encrypted)', async () => {
    const sigs: PdfDict[] = [
      new Map<string, PdfValue>([['Type', { kind: 'name', value: 'Sig' }], ['Contents', str('c')], ['Name', str('n')]]),
      new Map<string, PdfValue>([['Type', { kind: 'name', value: 'DocTimeStamp' }], ['Contents', str('c')]]),
      new Map<string, PdfValue>([['ByteRange', [0, 1, 2, 3]], ['Contents', str('c')]]),
    ];
    for (const sig of sigs) {
      const out = await mapStrings(sig, upper);
      expect(out instanceof Map ? out.get('Contents') : undefined).toEqual(str('c'));
    }
    const named = await mapStrings(sigs[0] as PdfDict, upper);
    expect(named instanceof Map ? named.get('Name') : undefined).toEqual({ kind: 'string', bytes: enc('N'), hex: true });
  });

  it('applies the callback one string at a time in document order (the AES calls share a decode budget and must not fan out)', async () => {
    const order: string[] = [];
    let running = 0;
    let peak = 0;
    await mapStrings([str('1'), [str('2')], new Map<string, PdfValue>([['k', str('3')]])], async (s) => {
      running += 1;
      peak = Math.max(peak, running);
      await Promise.resolve();
      order.push(String.fromCharCode(...s.bytes));
      running -= 1;
      return s;
    });
    expect(order).toEqual(['1', '2', '3']);
    expect(peak).toBe(1);
  });
});
