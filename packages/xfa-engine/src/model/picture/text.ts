import { safeText } from '../../pdf/safe-text.js';
import { unsupportedPicture } from './errors.js';
import type { PictureClause } from './types.js';

const SLOT = '9';
const TEXT_LITERALS = '- ()./';

const isDigit = (code: number): boolean => code >= 48 && code <= 57;

/** Compiles a `text{pattern}` clause: `9` is exactly one ASCII digit; `-`, space, `(`, `)`, `.` and `/` are literals. */
export function compileText(pattern: string): PictureClause {
  let slots = 0;
  for (const char of pattern) {
    if (char === SLOT) slots += 1;
    else if (!TEXT_LITERALS.includes(char)) {
      throw unsupportedPicture(`text pattern has an unsupported symbol "${safeText(char)}" in "${safeText(pattern)}"`);
    }
  }
  if (slots === 0) throw unsupportedPicture(`text pattern has no digit slot: "${safeText(pattern)}"`);
  return {
    category: 'text',
    parse(input) {
      if (input.length !== pattern.length) return undefined;
      let canonical = '';
      for (let i = 0; i < pattern.length; i += 1) {
        const expected = pattern.charAt(i);
        if (expected === SLOT) {
          if (!isDigit(input.charCodeAt(i))) return undefined;
          canonical += input.charAt(i);
        } else if (input.charAt(i) !== expected) return undefined;
      }
      return canonical;
    },
    format(canonical) {
      if (canonical.length !== slots) return undefined;
      let out = '';
      let next = 0;
      for (const char of pattern) {
        if (char !== SLOT) {
          out += char;
          continue;
        }
        if (!isDigit(canonical.charCodeAt(next))) return undefined;
        out += canonical.charAt(next);
        next += 1;
      }
      return out;
    },
  };
}
