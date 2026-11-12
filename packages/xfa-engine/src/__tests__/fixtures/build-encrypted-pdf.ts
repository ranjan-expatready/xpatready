/**
 * Synthetic AESV2-encrypted PDF for hostile-input tests. Reuses the Encrypt parameters of a qpdf-written
 * file (so the file key is known) and encrypts with node:crypto, independent of the engine.
 */
import { enc } from '../../pdf/__tests__/bytes.js';
import { hex, nodeAesEncrypt, nodeObjectKey, unhex, type KnownEncryption } from '../../pdf/security/__tests__/vectors.js';
import { HEADER, PdfOut, writeObj, writeStreamObj, writeTail, writeXrefTable } from './build-pdf.js';

export interface EncryptedPdfOptions {
  /** Raw (already "encrypted") bytes of stream object 2. */
  readonly streamRaw: Uint8Array;
  /** Raw bytes of the hex string /S in object 1. */
  readonly stringRaw: Uint8Array;
  /** Extra entries (without the /Length) written into stream object 2's dictionary. */
  readonly streamDict?: string;
  /** Replaces the trailer /ID entry text; `null` omits it. */
  readonly idText?: string | null;
}

const IV = Uint8Array.from({ length: 16 }, (_, i) => 0xa0 + i);

/** Valid AES ciphertext (IV || data) for object `num` of a file keyed by `k`. */
export function encryptedFor(k: KnownEncryption, num: number, plain: string): Uint8Array {
  return nodeAesEncrypt(nodeObjectKey(unhex(k.key), num, 0), IV, enc(plain));
}

/** The direct trailer /Encrypt entry (V4/R4/AESV2, empty user password) for a known-key file. */
export function encryptEntryText(k: KnownEncryption): string {
  return (
    `/Encrypt<</Filter/Standard/V 4/R 4/Length 128/CF<</StdCF<</CFM/AESV2/AuthEvent/DocOpen/Length 16>>>>` +
    `/StmF/StdCF/StrF/StdCF/O<${k.o}>/U<${k.u}>/P ${k.p}>>`
  );
}

/** Objects: 1 catalog with hex string /S, 2 stream. The /Encrypt dictionary is direct in the classic trailer. */
export function buildEncryptedPdf(k: KnownEncryption, o: EncryptedPdfOptions): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const o1 = writeObj(out, 1, `<</Type/Catalog/S<${hex(o.stringRaw)}>>>`);
  const o2 = writeStreamObj(out, 2, o.streamDict ?? '', o.streamRaw);
  const idText = o.idText === undefined ? `/ID[<${k.id0}><${k.id0}>]` : (o.idText ?? '');
  const encrypt = encryptEntryText(k);
  const x = writeXrefTable(out, [{ num: 0, free: true }, { num: 1, offset: o1 }, { num: 2, offset: o2 }], `/Size 3/Root 1 0 R${idText}${encrypt}`);
  writeTail(out, x);
  return out.toBytes();
}
