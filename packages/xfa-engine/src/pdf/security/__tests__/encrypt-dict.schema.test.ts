import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../errors.js';
import type { PdfValue } from '../../types.js';
import { parseEncryptDict } from '../encrypt-dict.schema.js';
import { AESV2_SAMPLE, CLEARTEXT_METADATA_SAMPLE, encryptDictFor, hex, name, str } from './vectors.js';

const bytes = (n: number): PdfValue => str(new Uint8Array(n));
const cf = (cfm: string): PdfValue => new Map<string, PdfValue>([['StdCF', new Map<string, PdfValue>([['CFM', name(cfm)]])]]);

function rejection(fn: () => unknown): XfaPdfError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(XfaPdfError);
    return e as XfaPdfError;
  }
  throw new Error('expected parseEncryptDict to throw');
}

describe('parseEncryptDict', () => {
  it('accepts the qpdf V4/R4/AESV2 dictionary and exposes bytes, P and the EncryptMetadata default', () => {
    const d = parseEncryptDict(encryptDictFor(AESV2_SAMPLE));
    expect(hex(d.O)).toBe(AESV2_SAMPLE.o);
    expect(hex(d.U)).toBe(AESV2_SAMPLE.u);
    expect(d.P).toBe(-4);
    expect(d.EncryptMetadata).toBe(true);
    expect(d.Length).toBe(128);
  });

  it('defaults /Length to 128 when the producer omits it (V4 allows that)', () => {
    expect(parseEncryptDict(encryptDictFor(AESV2_SAMPLE, { Length: undefined })).Length).toBe(128);
  });

  it('reads /EncryptMetadata false, which changes the file key', () => {
    expect(parseEncryptDict(encryptDictFor(CLEARTEXT_METADATA_SAMPLE)).EncryptMetadata).toBe(false);
  });

  it.each<[string, Record<string, PdfValue | undefined>, string]>([
    ['RC4 V2 handler', { V: 2 }, 'V'],
    ['AESV3 revision 6', { R: 6 }, 'R'],
    ['revision 3', { R: 3 }, 'R'],
    ['40-bit /Length', { Length: 40 }, 'Length'],
    ['RC4 crypt filter method (CFM V2)', { CF: cf('V2') }, 'CF.StdCF.CFM'],
    ['AESV3 crypt filter method', { CF: cf('AESV3') }, 'CF.StdCF.CFM'],
    ['no crypt filters', { CF: undefined }, 'CF'],
    ['public-key handler', { Filter: name('Adobe.PubSec') }, 'Filter'],
    ['Filter written as a string instead of a name', { Filter: { kind: 'string', bytes: new Uint8Array(8), hex: false } }, 'Filter'],
    ['missing /StmF (streams would be left in the clear)', { StmF: undefined }, 'StmF'],
    ['identity /StmF', { StmF: name('Identity') }, 'StmF'],
    ['different /StrF', { StrF: name('Other') }, 'StrF'],
    ['31-byte /O', { O: bytes(31) }, 'O'],
    ['missing /U', { U: undefined }, 'U'],
    ['/U as a name', { U: name('abc') }, 'U'],
    ['fractional /P', { P: 1.5 }, 'P'],
    ['/EncryptMetadata not a boolean', { EncryptMetadata: 1 }, 'EncryptMetadata'],
  ])('rejects %s with UNSUPPORTED_SECURITY naming /%s', (_title, override, key) => {
    const err = rejection(() => parseEncryptDict(encryptDictFor(AESV2_SAMPLE, override)));
    expect(err.code).toBe('UNSUPPORTED_SECURITY');
    expect(err.message).toContain(key);
  });

  it('error text carries no raw /O, /U or byte dump (A4)', () => {
    const err = rejection(() => parseEncryptDict(encryptDictFor(AESV2_SAMPLE, { V: 2, O: bytes(31) })));
    expect(err.message).not.toContain(AESV2_SAMPLE.o);
    expect(err.message).not.toContain(AESV2_SAMPLE.u);
    expect(err.message).not.toMatch(/[0-9a-f]{16}/);
  });

  it('an indirect reference inside the dictionary is unsupported, not silently dereferenced', () => {
    const err = rejection(() => parseEncryptDict(encryptDictFor(AESV2_SAMPLE, { CF: { kind: 'ref', num: 9, gen: 0 } })));
    expect(err.code).toBe('UNSUPPORTED_SECURITY');
  });

  it('a hostile "__proto__" key is inert (does not pollute Object.prototype)', () => {
    const dict = encryptDictFor(AESV2_SAMPLE, { ['__proto__']: new Map<string, PdfValue>([['polluted', true]]) });
    parseEncryptDict(dict);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('parseEncryptDict: /EFF and crypt-filter strictness (F4)', () => {
  const stdCf = new Map<string, PdfValue>([['CFM', name('AESV2')]]);

  it('accepts /EFF /StdCF (embedded-file streams use the same filter, as in real XFA forms)', () => {
    expect(() => parseEncryptDict(encryptDictFor(AESV2_SAMPLE, { EFF: name('StdCF') }))).not.toThrow();
  });

  it('rejects /EFF /Identity: embedded files would be left in the clear', () => {
    const err = rejection(() => parseEncryptDict(encryptDictFor(AESV2_SAMPLE, { EFF: name('Identity') })));
    expect(err.code).toBe('UNSUPPORTED_SECURITY');
    expect(err.message).toContain('EFF');
  });

  it('rejects an extra crypt filter next to StdCF in /CF', () => {
    const extra = new Map<string, PdfValue>([
      ['StdCF', stdCf],
      ['Other', new Map<string, PdfValue>([['CFM', name('None')]])],
    ]);
    const err = rejection(() => parseEncryptDict(encryptDictFor(AESV2_SAMPLE, { CF: extra })));
    expect(err.code).toBe('UNSUPPORTED_SECURITY');
    expect(err.message).toContain('CF');
  });

  it('tolerates unknown top-level keys (producers add private ones) without failing', () => {
    const d = parseEncryptDict(encryptDictFor(AESV2_SAMPLE, { ProducerPrivate: 7 }));
    expect(d.P).toBe(-4);
  });
});
