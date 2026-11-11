import { describe, expect, it } from 'vitest';
import { enc } from '../../__tests__/bytes.js';
import { isPdfString, type PdfDict, type PdfValue } from '../../types.js';
import { decryptIndirect } from '../decrypt-object.js';
import { createStandardHandler } from '../standard-handler.js';
import { AESV2_SAMPLE, encryptDictFor, name, nodeAesEncrypt, nodeObjectKey, str, unhex } from './vectors.js';

const iv = Uint8Array.from({ length: 16 }, (_, i) => i + 1);
const contents = Uint8Array.from({ length: 37 }, (_, i) => (i * 11 + 3) & 255); // not valid AES data on purpose

async function run(entries: [string, PdfValue][]): Promise<PdfDict> {
  const h = await createStandardHandler(encryptDictFor(AESV2_SAMPLE), unhex(AESV2_SAMPLE.id0));
  const sealed = nodeAesEncrypt(nodeObjectKey(h.fileKey, 12, 0), iv, enc('Signer'));
  const dict: PdfDict = new Map<string, PdfValue>([...entries, ['Name', str(sealed)]]);
  const out = await decryptIndirect(h, 12, 0, dict);
  if (!(out instanceof Map)) throw new Error('not a dictionary');
  return out;
}
const bytesOf = (v: PdfValue | undefined): Uint8Array => {
  if (!isPdfString(v)) throw new Error('not a string');
  return v.bytes;
};

describe('decryptIndirect: signature /Contents is never encrypted (ISO 32000-1 7.6.1)', () => {
  for (const type of ['Sig', 'DocTimeStamp']) {
    it(`/Type /${type}: /Contents stays raw (decrypting it fails or yields garbage) while /Name is decrypted`, async () => {
      const out = await run([['Type', name(type)], ['ByteRange', [0, 10, 20, 30]], ['Contents', str(contents)]]);
      expect(bytesOf(out.get('Contents'))).toEqual(contents);
      expect(bytesOf(out.get('Name'))).toEqual(enc('Signer'));
    });
  }

  it('a dictionary with /ByteRange but no /Type is still a signature dictionary (/Type is optional)', async () => {
    const out = await run([['ByteRange', [0, 10, 20, 30]], ['Contents', str(contents)]]);
    expect(bytesOf(out.get('Contents'))).toEqual(contents);
    expect(bytesOf(out.get('Name'))).toEqual(enc('Signer'));
  });

  it('a non-signature dictionary with /Contents still has it decrypted (the exemption is not blanket)', async () => {
    const h = await createStandardHandler(encryptDictFor(AESV2_SAMPLE), unhex(AESV2_SAMPLE.id0));
    const sealed = nodeAesEncrypt(nodeObjectKey(h.fileKey, 12, 0), iv, enc('page text'));
    const out = await decryptIndirect(h, 12, 0, new Map<string, PdfValue>([['Contents', str(sealed)]]));
    expect(out instanceof Map && bytesOf(out.get('Contents'))).toEqual(enc('page text'));
  });
});
