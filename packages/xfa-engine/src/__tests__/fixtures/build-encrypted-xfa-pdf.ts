/**
 * Synthetic AESV2-encrypted XFA PDF (known file key, so the encryption is independent of the engine).
 * Objects: 1 catalog, 2 pages, 3 AcroForm, 5 /XFA array (encrypted name strings), 10 template, 11 datasets
 * (dictionary carries an encrypted /Note string and a /DL), then the xref section. `xref: 'stream'` mirrors
 * the real-world layout (xref stream, PNG predictor, direct /Encrypt in the stream dictionary).
 */
import { enc } from '../../pdf/__tests__/bytes.js';
import { AESV2_SAMPLE, hex, nodeAesEncrypt, nodeObjectKey, unhex, type KnownEncryption } from '../../pdf/security/__tests__/vectors.js';
import { encryptEntryText } from './build-encrypted-pdf.js';
import { HEADER, PdfOut, writeObj, writeStreamObj, writeTail, writeXrefStream, writeXrefTable, zlib, type TableEntry, type XrefRow } from './build-pdf.js';

export const ENCRYPTED_TEMPLATE = '<template xmlns="urn:x">encrypted template</template>';
export const ENCRYPTED_DATASETS = '\n\n<xfa:datasets xmlns:xfa="urn:y"><xfa:data><a/></xfa:data></xfa:datasets>\n';
export const DATASETS_NOTE = 'Secret packet note';
export const DATASETS_OBJ = 11;
export const TEMPLATE_OBJ = 10;

const IV = Uint8Array.from({ length: 16 }, (_, i) => 0x30 + i);

export interface EncryptedXfaOptions {
  readonly xref?: 'table' | 'stream';
  readonly key?: KnownEncryption;
}

export function buildEncryptedXfaPdf(opts: EncryptedXfaOptions = {}): Uint8Array {
  const k = opts.key ?? AESV2_SAMPLE;
  const seal = (num: number, plain: Uint8Array): Uint8Array => nodeAesEncrypt(nodeObjectKey(unhex(k.key), num, 0), IV, plain);
  const sealedHex = (num: number, text: string): string => hex(seal(num, enc(text)));

  const out = new PdfOut();
  out.push(HEADER);
  const offsets = new Map<number, number>();
  offsets.set(1, writeObj(out, 1, '<</Type/Catalog/Pages 2 0 R/AcroForm 3 0 R/NeedsRendering true>>'));
  offsets.set(2, writeObj(out, 2, '<</Type/Pages/Kids[]/Count 0>>'));
  offsets.set(3, writeObj(out, 3, '<</Fields[]/XFA 5 0 R>>'));
  offsets.set(5, writeObj(out, 5, `[<${sealedHex(5, 'template')}> ${TEMPLATE_OBJ} 0 R <${sealedHex(5, 'datasets')}> ${DATASETS_OBJ} 0 R]`));
  const sealedStream = (num: number, text: string, extra: string): number =>
    writeStreamObj(out, num, `/Filter/FlateDecode${extra}`, seal(num, zlib(enc(text))));
  offsets.set(TEMPLATE_OBJ, sealedStream(TEMPLATE_OBJ, ENCRYPTED_TEMPLATE, ''));
  offsets.set(DATASETS_OBJ, sealedStream(DATASETS_OBJ, ENCRYPTED_DATASETS, `/Subtype/XML/Note<${sealedHex(DATASETS_OBJ, DATASETS_NOTE)}>/DL ${ENCRYPTED_DATASETS.length}`));

  const trailerBody = `/Root 1 0 R/ID[<${k.id0}><${k.id0}>]${encryptEntryText(k)}`;
  const size = DATASETS_OBJ + 1;
  if (opts.xref === 'stream') {
    const xrefNum = size;
    const xo = out.length;
    const rows: XrefRow[] = [{ type: 0, f2: 0, f3: 255 }];
    for (let n = 1; n <= xrefNum; n++) {
      const at = n === xrefNum ? xo : offsets.get(n);
      rows.push(at === undefined ? { type: 0, f2: 0, f3: 0 } : { type: 1, f2: at, f3: 0 });
    }
    writeXrefStream(out, xrefNum, rows, `/Size ${xrefNum + 1}${trailerBody}`);
    writeTail(out, xo);
  } else {
    const entries: TableEntry[] = [{ num: 0, free: true }];
    for (const [num, offset] of offsets) entries.push({ num, offset });
    writeTail(out, writeXrefTable(out, entries, `/Size ${size}${trailerBody}`));
  }
  return out.toBytes();
}
