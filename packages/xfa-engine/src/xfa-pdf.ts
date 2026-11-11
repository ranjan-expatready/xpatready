import { z } from 'zod';
import { readEmbeddedFonts, type EmbeddedFonts } from './layout/font/embedded.js';
import { XfaPdfError } from './pdf/errors.js';
import type { DecodeBudget } from './pdf/filters.js';
import { appendIncrementalUpdate } from './pdf/incremental-writer.js';
import { latin1 } from './pdf/latin1.js';
import { PdfReader } from './pdf/reader.js';
import { safeText } from './pdf/safe-text.js';
import { MAX_PDF_BYTES, pdfBytesSchema } from './wire-limits.js';
import { isPdfRef, isPdfStream, isPdfString, type PdfDict, type PdfRef, type PdfStream, type PdfValue } from './pdf/types.js';

export { MAX_PDF_BYTES, pdfBytesSchema };

const packetBytesSchema = z
  .instanceof(Uint8Array, { error: 'Packet bytes must be a Uint8Array' })
  .refine((b) => b.length <= MAX_PDF_BYTES, { error: `Packet bytes exceed ${MAX_PDF_BYTES} bytes` });

const replacementsSchema = z
  .array(z.object({ name: z.string(), bytes: packetBytesSchema }), { error: 'Packet replacements must be an array' })
  .min(1, { error: 'At least one packet must be replaced' })
  .refine((list) => new Set(list.map((e) => e.name)).size === list.length, { error: 'A packet is named more than once' });

/** One XFA packet (a named stream of the XDP package). */
export interface XfaPacket {
  /** Packet name from the /XFA array, decoded byte-for-byte as Latin-1 (a single-stream /XFA is named `xdp`). */
  readonly name: string;
  /** The packet's stream object (original object number, as used by qpdf and by incremental updates). */
  readonly ref: PdfRef;
  /** Decrypted and filter-decoded stream bytes. */
  readonly bytes: Uint8Array;
  /** UTF-8 decode of `bytes` (non-fatal: invalid sequences become U+FFFD; a leading BOM is dropped). */
  text(): string;
}

export interface XfaPdf {
  readonly packets: readonly XfaPacket[];
  /** The first packet called `name`; throws `PACKET_NOT_FOUND` when absent. */
  packet(name: string): XfaPacket;
  /** All packets' text concatenated in /XFA order (the XDP document). */
  xdpText(): string;
  /** Catalog `/NeedsRendering true`: the form is dynamic and must be rendered from its template. */
  readonly isDynamic: boolean;
  /** Catalog `/Perms` contains `/UR3` or the legacy `/UR` (usage rights: non-conforming edits invalidate them). */
  readonly hasUsageRights: boolean;
  /** The caller's input bytes, not copied. */
  readonly source: Uint8Array;
  /**
   * Returns a new PDF: the original bytes unchanged, followed by one incremental update that redefines the
   * packet's stream object (same number and generation) with `newBytes`, Flate-compressed and, for an
   * encrypted document, AESV2-encrypted. Deterministic: the same input gives identical bytes on the same runtime.
   * `source` and `newBytes` are copied when the call starts, and the write uses only state parsed at open time, so
   * the output never depends on the caller's buffer afterwards. Callers must still not mutate the buffer passed to
   * `openXfaPdf` while a write is in flight (a change before the call starts would be copied into the output).
   * Throws `PACKET_NOT_FOUND` for an unknown name and `MALFORMED` for invalid `newBytes`.
   */
  withPacket(name: string, newBytes: Uint8Array): Promise<Uint8Array>;
  /**
   * `withPacket` for several packets at once: ONE incremental update redefines every named packet's stream object, so a
   * reader never sees one packet changed without the others (the form packet's checksum covers the datasets). One entry
   * gives exactly the bytes `withPacket` gives. Throws `PACKET_NOT_FOUND` for an unknown name and `MALFORMED` for an empty
   * list, a packet named twice, or invalid bytes.
   */
  withPackets(entries: readonly PacketReplacement[]): Promise<Uint8Array>;
  /**
   * The font programs embedded in the form's default resources (`/AcroForm /DR /Font`: `/FontFile2` TrueType and
   * `/FontFile3 /OpenType`), decrypted and decoded through the same reader and budget as the packets. Fonts with no
   * measurable program (standard-14 names, Type 1, bare CFF) are not listed. Read once and memoised: the same result comes
   * back on every call, so repeated calls cost none of the decode budget. A form with more `/DR /Font` entries or embedded
   * fonts than the ceilings lists the first of them, and `issues` says so. Rejects `MALFORMED` for a malformed font
   * structure or programs over the total ceiling; that verdict is a fact of the document and is remembered, while a failure
   * that is not (anything other than a `MALFORMED` `XfaPdfError`) is forgotten so the next call reads again.
   */
  fonts(): Promise<EmbeddedFonts>;
}

/** One packet to write with `XfaPdf.withPackets`. */
export interface PacketReplacement {
  readonly name: string;
  readonly bytes: Uint8Array;
}

/**
 * FD-38 exemption (security invariant): bound on a chain of references-to-references, so a hostile
 * cyclic `5 0 obj 5 0 R` cannot loop forever. Real files use one hop; no firm or operator has a reason to vary it.
 */
const MAX_REF_HOPS = 8;

/** Follows references until a direct value (or stream) is reached. */
async function deref(reader: PdfReader, v: PdfValue | PdfStream | undefined): Promise<PdfValue | PdfStream> {
  let cur: PdfValue | PdfStream = v ?? null;
  for (let hop = 0; !isPdfStream(cur) && isPdfRef(cur); hop++) {
    if (hop >= MAX_REF_HOPS) throw new XfaPdfError('MALFORMED', 'Reference chain is too long');
    cur = await reader.resolve(cur);
  }
  return cur;
}

async function derefDict(reader: PdfReader, v: PdfValue | undefined, what: string): Promise<PdfDict | undefined> {
  const d = await deref(reader, v);
  if (d === null) return undefined;
  if (!(d instanceof Map)) throw new XfaPdfError('MALFORMED', `${what} is not a dictionary`);
  return d;
}

function makePacket(name: string, ref: PdfRef, bytes: Uint8Array): XfaPacket {
  let cached: string | undefined;
  return {
    name,
    ref,
    bytes,
    text: () => (cached ??= new TextDecoder('utf-8', { fatal: false }).decode(bytes)),
  };
}

/** A packet with the stream dictionary it had at open time, so a later write never re-reads the caller's buffer. */
interface PacketSource {
  readonly packet: XfaPacket;
  readonly dict: PdfDict;
}

async function readPackets(reader: PdfReader, xfa: PdfValue): Promise<PacketSource[]> {
  // One hop only: for a single stream the packet `ref` must be the stream object's own number (a ref-to-ref is rejected).
  const direct = isPdfRef(xfa) ? await reader.resolve(xfa) : xfa;
  if (isPdfStream(direct)) {
    if (!isPdfRef(xfa)) throw new XfaPdfError('MALFORMED', '/XFA stream is not an indirect object');
    return [{ packet: makePacket('xdp', xfa, await reader.decodedStream(direct)), dict: direct.dict }];
  }
  if (!Array.isArray(direct)) throw new XfaPdfError('MALFORMED', '/XFA is neither an array nor a stream');
  if (direct.length === 0) throw new XfaPdfError('NOT_XFA', '/XFA array is empty');
  if (direct.length % 2 !== 0) throw new XfaPdfError('MALFORMED', '/XFA array must hold name/stream pairs');
  const packets: PacketSource[] = [];
  const seen = new Set<number>();
  // Sequential on purpose: the decode budget is checked, not reserved, so parallel decodes could overshoot it.
  for (let i = 0; i < direct.length; i += 2) {
    const nameValue = await deref(reader, direct[i]);
    const ref = direct[i + 1];
    if (!isPdfString(nameValue)) throw new XfaPdfError('MALFORMED', `/XFA entry ${i} is not a packet name string`);
    if (ref === undefined || !isPdfRef(ref)) throw new XfaPdfError('MALFORMED', `/XFA entry ${i + 1} is not a stream reference`);
    if (seen.has(ref.num)) throw new XfaPdfError('MALFORMED', `/XFA lists stream object ${ref.num} more than once (duplicate packet stream)`);
    seen.add(ref.num);
    const stream = await reader.resolve(ref);
    if (!isPdfStream(stream)) throw new XfaPdfError('MALFORMED', 'Object is not a stream');
    packets.push({ packet: makePacket(latin1(nameValue.bytes), ref, await reader.decodedStream(stream)), dict: stream.dict });
  }
  return packets;
}

/** Test-only knobs (not exported from the package index); production callers get the defaults. */
export interface XfaPdfInternals {
  /** Replaces the per-reader stream-memory budget (default `MAX_TOTAL_DECODED_BYTES`). */
  readonly budget?: DecodeBudget;
  /** Replaces the `withPacket` output ceiling (default `MAX_PDF_BYTES`). */
  readonly maxOutputBytes?: number;
  /** Called with the reader once it exists (tests inspect its cache). */
  readonly observeReader?: (reader: PdfReader) => void;
}

/** Opens a (possibly AESV2-encrypted) PDF and extracts its XFA packets. Throws `XfaPdfError`; `NOT_XFA` when there is no /AcroForm /XFA. */
export function openXfaPdf(bytes: Uint8Array): Promise<XfaPdf> {
  return openXfaPdfInternal(bytes, {});
}

export async function openXfaPdfInternal(bytes: Uint8Array, internals: XfaPdfInternals): Promise<XfaPdf> {
  const checked = pdfBytesSchema.safeParse(bytes);
  if (!checked.success) {
    throw new XfaPdfError('MALFORMED', checked.error.issues.map((i) => i.message).join('; '));
  }
  const reader = await PdfReader.open(bytes, internals.budget);
  internals.observeReader?.(reader);
  const catalog = await derefDict(reader, reader.trailer.get('Root'), 'Catalog');
  if (catalog === undefined) throw new XfaPdfError('MALFORMED', 'Trailer has no /Root catalog');
  const acroForm = await derefDict(reader, catalog.get('AcroForm'), '/AcroForm');
  const xfa = acroForm?.get('XFA');
  if (xfa === undefined || xfa === null) throw new XfaPdfError('NOT_XFA', 'PDF has no /AcroForm /XFA entry');

  const sources = await readPackets(reader, xfa);
  const packets = sources.map((s) => s.packet);
  const needsRendering = await deref(reader, catalog.get('NeedsRendering'));
  const perms = await derefDict(reader, catalog.get('Perms'), '/Perms');
  const hasEntry = (key: string): boolean => {
    const v = perms?.get(key);
    return v !== undefined && v !== null;
  };

  // Everything the handle needs later (packets, dicts, flags) is already in hand; do not keep decrypted stream bytes alive.
  reader.releaseCache();

  let embeddedFonts: Promise<EmbeddedFonts> | undefined;
  /** The embedded fonts, read once. A `MALFORMED` rejection is deterministic (the document is what it is) and stays remembered; any other failure is forgotten, so the next call reads again. */
  const readFonts = (): Promise<EmbeddedFonts> => {
    if (embeddedFonts !== undefined) return embeddedFonts;
    const read = readEmbeddedFonts(reader, acroForm, {
      value: (v) => deref(reader, v),
      dict: (v, what) => derefDict(reader, v, what),
    });
    embeddedFonts = read;
    void read.catch((error: unknown) => {
      const deterministic = error instanceof XfaPdfError && error.code === 'MALFORMED';
      if (!deterministic && embeddedFonts === read) embeddedFonts = undefined;
    });
    return read;
  };

  const findPacket = (name: string): XfaPacket => {
    const found = packets.find((p) => p.name === name);
    if (found === undefined) throw new XfaPdfError('PACKET_NOT_FOUND', `No XFA packet named "${safeText(name)}"`);
    return found;
  };

  const writePackets = async (entries: readonly PacketReplacement[]): Promise<Uint8Array> => {
    // Snapshots first, before any await: the caller may mutate its buffers as soon as this call returns a promise.
    const snapshot = bytes.slice();
    const checked = replacementsSchema.safeParse(entries);
    if (!checked.success) throw new XfaPdfError('MALFORMED', checked.error.issues.map((i) => i.message).join('; '));
    const replacements = checked.data.map((entry) => {
      const plaintext = entry.bytes.slice();
      const target = findPacket(entry.name);
      const dict = sources.find((s) => s.packet === target)?.dict;
      if (dict === undefined) throw new XfaPdfError('MALFORMED', `Packet "${safeText(entry.name)}" has no stream dictionary`);
      return { ref: target.ref, dict, plaintext };
    });
    const out = await appendIncrementalUpdate(snapshot, reader, replacements);
    if (out.length > (internals.maxOutputBytes ?? MAX_PDF_BYTES)) throw new XfaPdfError('MALFORMED', 'Output exceeds MAX_PDF_BYTES');
    return out;
  };

  return {
    packets,
    packet: findPacket,
    xdpText: () => packets.map((p) => p.text()).join(''),
    withPacket(name: string, newBytes: Uint8Array): Promise<Uint8Array> {
      return writePackets([{ name, bytes: newBytes }]);
    },
    withPackets(entries: readonly PacketReplacement[]): Promise<Uint8Array> {
      return writePackets(entries);
    },
    fonts: readFonts,
    isDynamic: needsRendering === true,
    hasUsageRights: hasEntry('UR3') || hasEntry('UR'),
    source: bytes,
  };
}
