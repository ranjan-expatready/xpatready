import { parseXml } from '../../xml/parse.js';
import { plainTextOf } from '../template/rich-text.js';

const ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/** Text as it is written inside markup. */
export function escapeMarkup(text: string): string {
  let out = '';
  for (const c of text) out += ESCAPES[c] ?? c;
  return out;
}

/**
 * The plain-text projection of a markup string a script assigned to rich text. The string need not be a single
 * element (a script may prefix a marker to the markup), so it is wrapped before parsing; text that is not well formed
 * markup (or is refused by the XML parser's safety rules) is its own projection. Never throws.
 */
export function plainFromMarkup(markup: string): string {
  if (!markup.includes('<')) return markup;
  try {
    const doc = parseXml(`<r>${markup}</r>`);
    return doc.documentElement === null ? markup : plainTextOf(doc.documentElement);
  } catch {
    return markup;
  }
}
