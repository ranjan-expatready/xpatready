import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../errors.js';
import { decodeStream } from '../filters.js';
import { PdfLexer } from '../lexer.js';
import { parseValue } from '../object-parser.js';
import { safeText } from '../safe-text.js';
import { readXrefChain } from '../xref.js';
import { enc } from './bytes.js';
import { expectMalformed } from './expect-malformed.js';

const hasControl = (m: string): boolean => /[\x00-\x1f\x7f-\xff]/.test(m);
const HOSTILE = 'k\x1bz'.repeat(66); // 200 file-controlled characters containing ESC bytes

function expectSafe(message: string): void {
  expect(hasControl(message)).toBe(false);
  expect(message.length).toBeLessThan(260);
}

describe('every site that echoes file text into an error message escapes and truncates it (F5)', () => {
  it('object parser: unexpected keyword', () => {
    const err = (() => {
      try {
        parseValue(new PdfLexer(enc(HOSTILE)));
      } catch (e) {
        return e;
      }
      throw new Error('expected a throw');
    })();
    expect(err).toBeInstanceOf(XfaPdfError);
    expectSafe((err as XfaPdfError).message);
    expect((err as XfaPdfError).message).toContain(safeText(HOSTILE));
  });

  it('xref table: bad entry type', async () => {
    const text = `%PDF-1.7\nxref\n0 1\n0000000000 65535 ${HOSTILE}\ntrailer\n<</Size 1>>\nstartxref\n9\n%%EOF\n`;
    const err = await expectMalformed(readXrefChain(enc(text)));
    expectSafe(err.message);
  });

  it('filters: unsupported single filter name and unsupported chain', async () => {
    const raw = new Uint8Array(4);
    const name = (value: string) => ({ kind: 'name' as const, value });
    expectSafe((await expectMalformed(decodeStream({ dict: new Map([['Filter', name(HOSTILE)]]), raw }))).message);
    const chain = Array.from({ length: 50 }, () => name(HOSTILE));
    expectSafe((await expectMalformed(decodeStream({ dict: new Map([['Filter', chain]]), raw }))).message);
  });
});
