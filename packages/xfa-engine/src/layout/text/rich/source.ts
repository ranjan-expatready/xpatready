import type { FormNode } from '../../../model/form/index.js';
import { XfaFormError } from '../../../model/form/errors.js';
import { XfaPdfError } from '../../../pdf/errors.js';
import { safeText } from '../../../pdf/safe-text.js';
import type { Rect } from '../../box/types.js';
import { lengthAttr } from '../../box/attributes.js';
import { guarded } from '../../box/border.js';
import type { TextContext } from '../context.js';
import type { LaidOutText, TextStyle } from '../types.js';
import { layoutRich } from './layout.js';

/** The result of laying out one rich block: its lines, or the reason it could not be (the draw becomes a placeholder). */
export type RichOutcome = { readonly kind: 'laid'; readonly text: LaidOutText } | { readonly kind: 'failed'; readonly reason: string };

/**
 * `para tabDefault` of the owner, in points (a bare number is `TEMPLATE_LENGTH_UNIT`, like every template length); `undefined`
 * when absent (then the default interval applies). A value that is not a length, or not positive, is reported against the
 * `para` and the default interval is used.
 */
function tabIntervalOf(owner: FormNode, ctx: TextContext): number | undefined {
  const para = owner.childrenOfClass('para')[0];
  if (para === undefined) return undefined;
  const points = guarded(para, ctx.sink, 'para tabDefault', () => lengthAttr(para, 'tabDefault'), undefined);
  if (points === undefined) return undefined;
  if (points > 0) return points;
  ctx.sink.add(para, `para tabDefault ${points}pt is not positive (the default tab interval is used)`);
  return undefined;
}

/**
 * Lays out the exData markup of `owner` (a draw, a field or a caption). Malformed markup, a refused construct (DOCTYPE),
 * an exceeded ceiling or a hostile line is caught HERE, once per block: the failure is recorded as an `issues` entry against
 * `owner` and returned as `failed`, so the draw becomes a placeholder and the rest of the form still lays out. Only
 * errors of the engine's own typed family are caught, except a form error (`XfaFormError`); anything else is a bug or a
 * document-wide failure and propagates.
 */
export function layoutRichSource(markup: string, owner: FormNode, style: TextStyle, region: Rect, wrap: boolean, ctx: TextContext): RichOutcome {
  try {
    const tabIntervalPt = tabIntervalOf(owner, ctx);
    const text = layoutRich({ markup, style, region, wrap, ...(tabIntervalPt === undefined ? {} : { tabIntervalPt }) }, ctx.depsFor(owner), ctx.embed);
    return { kind: 'laid', text };
  } catch (error) {
    // The parser's failures are plain `XfaPdfError`s, so this cannot narrow to `XfaLayoutError`; a form error (a `LIMIT` on the whole document) is not this block's.
    if (!(error instanceof XfaPdfError) || error instanceof XfaFormError) throw error;
    const reason = `rich text could not be laid out: ${safeText(error.message, 120)}`;
    ctx.sink.add(owner, reason);
    return { kind: 'failed', reason };
  }
}
