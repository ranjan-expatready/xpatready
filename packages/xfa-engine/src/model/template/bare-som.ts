import { scanSom } from '../som/grammar.js';

/**
 * True when `text` is exactly one SOM reference the resolver can evaluate and nothing else: dotted segments, each a name
 * or `#class`, optionally followed by `[n]` or `[*]` (`Page5.TextField1[*]`, `a.#text`). No whitespace, operators, calls,
 * quotes, `$` shortcuts or relative indexes. This is the only FormCalc shape the engine evaluates (plan decision D5), and
 * it uses the resolver's own grammar (`scanSom`), so a script accepted when the template is loaded cannot be refused
 * by the resolver at run time. One forward pass, no regular expression, so a hostile script cannot make it backtrack.
 *
 * The resolver reads a hyphen as part of a name (a SOM string from JavaScript may name `Total-Discount`), but in FormCalc
 * it is the minus operator, so `Total-Discount` is arithmetic, not a reference; a hyphen in any segment is refused here.
 * It is the only FormCalc operator character the SOM name grammar admits.
 */
export function isBareSomReference(text: string): boolean {
  const scanned = scanSom(text);
  return scanned.ok && scanned.path.segments.every((segment) => !segment.text.includes('-'));
}
