import type { CaptionReserveHook } from '../box/caption.js';
import { readableInsetsOf } from '../box/insets.js';
import type { TextContext } from './context.js';
import { layoutText } from './layout.js';
import { textStyleOf } from './style.js';
import type { LaidOutText } from './types.js';
import { layoutRichSource } from './rich/source.js';
import { captionTextOf } from './value.js';

/**
 * The caption auto-reserve (`reserve` absent, 0 or -1): the room the caption text needs along the placement axis, plus
 * the caption's own margin on that axis. For `left` / `right` it is the width of the widest line, the text wrapped to the
 * content region width; for `top` / `bottom` the height of the text block wrapped to that width.
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `src/core/xfa/template.js` `Caption[$toHTML]` takes the reserve from the measured caption
 * (`w` for left / right / inline, `h` for top / bottom) when `reserve <= 0`, from `layoutNode` and `TextMeasure`. Differences:
 * the measure here is the exact hmtx width without pdf.js's 1.02 width factor, and the caption's `margin` and `para`
 * margins are included, because the strip has to hold the text inside them (pdf.js leaves the margin to CSS).
 * No XFA 3.3 page is cited (the specification PDF is unreachable from the session that wrote this) and no renderCache
 * record measures a field caption, so the margin inclusion is a judgement the corpus cannot confirm.
 *
 * An empty caption reserves nothing (0). A rich-text (exData) caption is laid out by `rich/` and measured the same way (a
 * caption that fails to lay out reserves 0 and is reported). The answer depends only on
 * the arguments and the form DOM, so the layout may ask once and reuse it.
 */
export function createCaptionReserve(ctx: TextContext): CaptionReserveHook {
  return (field, placement, contentRect) => {
    const caption = field.childrenOfClass('caption')[0];
    const source = caption === undefined ? undefined : captionTextOf(caption);
    if (caption === undefined || source === undefined || source.kind === 'none') return 0;
    if (source.kind === 'text' && source.text === '') return 0;
    const insets = readableInsetsOf(caption, ctx.sink, 'caption margin');
    const style = textStyleOf(caption, ctx.sink);
    const width = Math.max(0, contentRect.widthPt - insets.leftPt - insets.rightPt);
    // A region with no width yet (a field with no `w`) cannot wrap the text: one character per line would be nonsense.
    const region = { xPt: 0, yPt: 0, widthPt: width, heightPt: Math.max(0, contentRect.heightPt) };
    let laid: LaidOutText;
    if (source.kind === 'rich') {
      const outcome = layoutRichSource(source.markup, caption, style, region, width > 0, ctx);
      // A rich caption that cannot be laid out keeps no room (it is a placeholder, with an `issues` entry).
      if (outcome.kind === 'failed') return 0;
      laid = outcome.text;
    } else {
      laid = layoutText({ text: source.text, style, region, wrap: width > 0 }, ctx.depsFor(caption));
    }
    // Nothing to draw (empty markup, `<p/>`) reserves nothing, as empty plain text does.
    if (laid.lines.length === 0) return 0;
    if (placement === 'left' || placement === 'right') {
      // The first line starts `textIndent` further in, so it needs that much more room than its text.
      const first = laid.lines[0];
      const indented = first === undefined ? 0 : first.fitWidthPt + Math.max(0, style.textIndentPt);
      const widest = laid.lines.reduce((most, line, index) => Math.max(most, index === 0 ? indented : line.fitWidthPt), 0);
      return widest + style.marginLeftPt + style.marginRightPt + insets.leftPt + insets.rightPt;
    }
    return laid.extent.heightPt + insets.topPt + insets.bottomPt;
  };
}
