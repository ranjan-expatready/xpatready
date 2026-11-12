import type { Document } from '@xmldom/xmldom';
import type { XmlLimits } from '../xml/limits.js';
import { parseXml } from '../xml/parse.js';
import { serializeXml } from '../xml/serialize.js';

/**
 * The datasets packet of a run as the UTF-8 bytes to write back (W02-T08). The whole `xfa:datasets` document is serialized
 * - the list-of-values children and the other packets' parts stay exactly where the form's data left them - and the
 * text is parsed again under the XML ceilings before it is returned, so the engine never writes a packet it could not reopen
 * (`MALFORMED_XML` when a script grew the data past a ceiling or left a character XML forbids). `limits` may only tighten
 * the ceilings (tests); production callers get the defaults.
 */
export function serializeDatasets(datasets: Document, limits?: Partial<XmlLimits>): Uint8Array {
  const text = serializeXml(datasets);
  parseXml(text, limits === undefined ? undefined : { limits });
  return new TextEncoder().encode(text);
}
