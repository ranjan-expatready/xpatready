import { MAX_TEXT_CHARS } from '../../limits.js';
import { normalizeLineBreaks } from '../wrap.js';
import type { StyleInfo } from './metrics.js';
import type { EmbedResolver, RichParagraph } from './types.js';

/** The character stream of one paragraph: its text with a style per UTF-16 unit and the places where a `br` or the paragraph end forces a line end. */
export interface Flow {
  readonly text: string;
  /** The style index of each UTF-16 unit of `text`. */
  readonly styleAt: readonly number[];
  /** Prefix advances: `prefix[i]` is the width of `text.slice(0, i)`; a tab counts as one tab interval. */
  readonly prefix: Float64Array;
  /** Offsets just after each forced line end (a `br`, then the paragraph end when it is not the last paragraph). The last equals `text.length`. */
  readonly hardEnds: readonly number[];
  /** True when the paragraph's text ends with a `br` (or an embedded line break): its closing space is the break's, not the paragraph's. */
  readonly endsWithBreak: boolean;
}

export interface FlowBudget {
  /** Characters still allowed in the whole text (shared by all paragraphs). */
  remaining: number;
  cut: boolean;
}

/**
 * Builds the character stream of a paragraph (pdf.js `P[$pushGlyphs]` / `Br[$pushGlyphs]`): atoms in order, a tab as `\t`, an
 * embed as the text of the field it names (missing: reported, nothing), and each line break as a space in the style of the
 * element that carries it. The break at the end of a paragraph is the paragraph's own style, not that of its last span (the
 * renderCache oracle shows a bold paragraph's closing space bold after a regular span). The last paragraph has no closing
 * break. Text past the shared budget is cut. `tabPt` is the width a tab adds to the prefix sums while breaking.
 */
export function buildFlow(paragraph: RichParagraph, last: boolean, infos: readonly StyleInfo[], embed: EmbedResolver | undefined, tabPt: number, budget: FlowBudget, report: (feature: string) => void): Flow {
  let text = '';
  const styleAt: number[] = [];
  const hardEnds: number[] = [];
  const put = (value: string, style: number): void => {
    const taken = Math.min(value.length, budget.remaining);
    if (taken < value.length) {
      if (!budget.cut) report(`text longer than ${MAX_TEXT_CHARS} characters (cut)`);
      budget.cut = true;
    }
    if (taken <= 0) return;
    // A cut must not split a surrogate pair.
    const end = taken < value.length && value.charCodeAt(taken - 1) >= 0xd800 && value.charCodeAt(taken - 1) <= 0xdbff ? taken - 1 : taken;
    text += value.slice(0, end);
    for (let i = 0; i < end; i += 1) styleAt.push(style);
    budget.remaining -= end;
  };
  for (const atom of paragraph.atoms) {
    if (atom.kind === 'text') put(atom.text, atom.style);
    else if (atom.kind === 'tab') put('\t', atom.style);
    else if (atom.kind === 'break') {
      put(' ', atom.style);
      hardEnds.push(text.length);
    } else {
      const found = embed?.(atom.id);
      if (found === undefined) {
        report(`rich.embed.missing: #${atom.id.slice(0, 40)}`);
        continue;
      }
      const lines = normalizeLineBreaks(atom.mode === 'raw' ? found.raw : found.formatted).split('\n');
      lines.forEach((line, index) => {
        if (index > 0) {
          put(' ', atom.style);
          hardEnds.push(text.length);
        }
        put(line, atom.style);
      });
    }
  }
  if (!last) put(' ', paragraph.style);
  const endsWithBreak = hardEnds[hardEnds.length - 1] === text.length && text.length > 0;
  if (hardEnds[hardEnds.length - 1] !== text.length) hardEnds.push(text.length);

  const prefix = new Float64Array(text.length + 1);
  let at = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    const info = infos[styleAt[at] ?? 0];
    const advance = codePoint === 9 ? tabPt : (info?.advance(codePoint) ?? 0);
    const before = prefix[at] ?? 0;
    for (let k = 1; k < character.length; k += 1) prefix[at + k] = before;
    prefix[at + character.length] = before + advance;
    at += character.length;
  }
  return { text, styleAt, prefix, hardEnds, endsWithBreak };
}
