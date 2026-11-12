/** Builds small XFA-bearing PDFs (classic xref) for packet-extraction tests. */
import { enc } from '../../pdf/__tests__/bytes.js';
import { HEADER, PdfOut, writeObj, writeStreamObj, writeTail, writeXrefTable, zlib, type TableEntry } from './build-pdf.js';

export interface FixturePacket {
  /** Written as a hex string so any byte value is possible. */
  readonly nameBytes: Uint8Array;
  readonly content: Uint8Array;
  /** Flate-compress the stream (default false). */
  readonly compress?: boolean;
  /** Extra stream-dictionary text, e.g. `/Subtype/XML/Note(hi)` (written before /Length). */
  readonly dictExtra?: string;
  /** Store /Length as an indirect object (number `LENGTH_OBJ_BASE + i`), so reading the stream needs a second pass over the file. */
  readonly indirectLength?: boolean;
}

export const packet = (name: string, content: string, compress = false, dictExtra?: string, indirectLength = false): FixturePacket => ({
  nameBytes: enc(name),
  content: enc(content),
  compress,
  ...(dictExtra === undefined ? {} : { dictExtra }),
  ...(indirectLength ? { indirectLength } : {}),
});

export interface XfaPdfOptions {
  /** `array`: direct /XFA array; `indirect-array`: /XFA is a reference to an array object; `single`: /XFA is one stream; `single-via-ref`: /XFA points at an object that is itself only a reference to the stream; `none`: AcroForm without /XFA; `no-acroform`. */
  readonly layout?: 'array' | 'indirect-array' | 'single' | 'single-via-ref' | 'none' | 'no-acroform';
  readonly packets?: readonly FixturePacket[];
  /** Emit /NeedsRendering with this literal (default: absent). */
  readonly needsRendering?: 'true' | 'false';
  /** Emit /Perms with a /UR3 (`ur3`), a legacy /UR (`ur`), or only /DocMDP (`docmdp-only`); absent when undefined. */
  readonly perms?: 'ur3' | 'ur' | 'docmdp-only';
  /** Store /AcroForm as object 3 instead of inline in the catalog. */
  readonly acroFormIndirect?: boolean;
  /** Replace the /XFA array text entirely (hostile shapes). */
  readonly rawXfaArray?: string;
  /** Extra entries written into the /AcroForm dictionary verbatim, e.g. `/DR 5` (a hostile default-resources value). */
  readonly acroFormExtra?: string;
}

export const DEFAULT_PACKETS: readonly FixturePacket[] = [
  packet('template', '<template xmlns="urn:x">T</template>', true),
  packet('datasets', '\n\n<xfa:datasets xmlns:xfa="urn:y"><xfa:data/></xfa:datasets>\n'),
  packet('</xdp:xdp>', '\n'),
];

/** Object numbers: 1 catalog, 2 pages, 3 AcroForm (when indirect), 4 UR3 dict, 5 indirect XFA array, 10+i packet streams. */
export const PACKET_OBJ_BASE = 10;
/** Object number of the indirect /Length of packet i (see `FixturePacket.indirectLength`). */
export const LENGTH_OBJ_BASE = 30;

export function buildXfaPdf(opts: XfaPdfOptions = {}): Uint8Array {
  const layout = opts.layout ?? 'array';
  const packets = opts.packets ?? DEFAULT_PACKETS;
  const out = new PdfOut();
  out.push(HEADER);
  const entries: TableEntry[] = [{ num: 0, free: true }];
  const add = (num: number, offset: number): void => void entries.push({ num, offset });

  const hex = (b: Uint8Array): string => Array.from(b, (c) => c.toString(16).padStart(2, '0')).join('');
  const refs = packets.map((_, i) => `${PACKET_OBJ_BASE + i} 0 R`);
  const arrayText = opts.rawXfaArray ?? `[${packets.map((p, i) => `<${hex(p.nameBytes)}> ${refs[i]}`).join(' ')}]`;

  let xfaEntry = '';
  if (layout === 'array') xfaEntry = `/XFA ${arrayText}`;
  if (layout === 'indirect-array') xfaEntry = '/XFA 5 0 R';
  if (layout === 'single') xfaEntry = `/XFA ${refs[0]}`;
  if (layout === 'single-via-ref') xfaEntry = '/XFA 5 0 R';
  const acroForm = `<</Fields[]${xfaEntry}${opts.acroFormExtra ?? ''}>>`;
  const catalogParts = ['/Type/Catalog/Pages 2 0 R'];
  if (layout !== 'no-acroform') catalogParts.push(opts.acroFormIndirect === true ? '/AcroForm 3 0 R' : `/AcroForm ${acroForm}`);
  if (opts.needsRendering !== undefined) catalogParts.push(`/NeedsRendering ${opts.needsRendering}`);
  if (opts.perms === 'ur3') catalogParts.push('/Perms<</DocMDP 6 0 R/UR3 4 0 R>>');
  if (opts.perms === 'ur') catalogParts.push('/Perms<</DocMDP 6 0 R/UR 4 0 R>>');
  if (opts.perms === 'docmdp-only') catalogParts.push('/Perms<</DocMDP 6 0 R>>');

  add(1, writeObj(out, 1, `<<${catalogParts.join('')}>>`));
  add(2, writeObj(out, 2, '<</Type/Pages/Kids[]/Count 0>>'));
  if (opts.acroFormIndirect === true && layout !== 'no-acroform') add(3, writeObj(out, 3, acroForm));
  add(4, writeObj(out, 4, '<</Type/Sig>>'));
  if (layout === 'indirect-array') add(5, writeObj(out, 5, arrayText));
  if (layout === 'single-via-ref') add(5, writeObj(out, 5, refs[0] ?? 'null'));
  add(6, writeObj(out, 6, '<</Type/Sig>>'));
  if (layout !== 'none' && layout !== 'no-acroform') {
    const used = layout === 'single' || layout === 'single-via-ref' ? packets.slice(0, 1) : packets;
    used.forEach((p, i) => {
      const data = p.compress === true ? zlib(p.content) : p.content;
      const dictBody = `${p.compress === true ? '/Filter/FlateDecode' : ''}${p.dictExtra ?? ''}`;
      const lengthText = p.indirectLength === true ? `${LENGTH_OBJ_BASE + i} 0 R` : undefined;
      add(PACKET_OBJ_BASE + i, writeStreamObj(out, PACKET_OBJ_BASE + i, dictBody, data, lengthText));
      if (lengthText !== undefined) add(LENGTH_OBJ_BASE + i, writeObj(out, LENGTH_OBJ_BASE + i, String(data.length)));
    });
  }
  const size = Math.max(...entries.map((e) => e.num)) + 1;
  const x = writeXrefTable(out, entries, `/Size ${size}/Root 1 0 R`);
  writeTail(out, x);
  return out.toBytes();
}
