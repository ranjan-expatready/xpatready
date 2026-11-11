import type { z } from 'zod';
import type { FormNode } from '../../model/form/index.js';
import { captionPlacementSchema } from '../../model/form/attributes.js';
import { XfaLayoutError } from '../errors.js';
import { enumAttr, lengthAttr } from './attributes.js';
import type { IssueSink } from './issues.js';
import { presenceSchema, type CaptionLayout, type CaptionPlacement, type Rect } from './types.js';

/**
 * What the text measure (W01-T05) will answer for a caption with no explicit `reserve`: the points the caption text
 * needs along the placement axis, or `'auto'` while the measure is not available. `contentRect` is the region the
 * caption is carved from, in the box's own frame. The layout asks once per caption (a growable box asks while sizing and
 * reuses the answer), and the answer must depend only on the arguments.
 */
export type CaptionReserveHook = (field: FormNode, placement: CaptionPlacement, contentRect: Rect) => number | 'auto';

/** The hook used until W01-T05 supplies one: every automatic reserve stays unresolved. */
export const unresolvedReserve: CaptionReserveHook = () => 'auto';

export interface CaptionSplit {
  readonly layout: CaptionLayout;
  /** The reserve asked for before it was cut to the region, in points; 0 while automatic or when the caption takes no space. */
  readonly requestedPt: number;
  /** The caption strip; absent when the caption is hidden (it takes no space). In the same frame as the content passed in. */
  readonly captionRect?: Rect;
  /** What the widget keeps of the content region. */
  readonly widgetRect: Rect;
}

function strip(content: Rect, placement: CaptionPlacement, reserve: number): { caption: Rect; widget: Rect } {
  switch (placement) {
    case 'top':
      return {
        caption: { ...content, heightPt: reserve },
        widget: { ...content, yPt: content.yPt + reserve, heightPt: content.heightPt - reserve },
      };
    case 'bottom':
      return {
        caption: { ...content, yPt: content.yPt + content.heightPt - reserve, heightPt: reserve },
        widget: { ...content, heightPt: content.heightPt - reserve },
      };
    case 'left':
      return {
        caption: { ...content, widthPt: reserve },
        widget: { ...content, xPt: content.xPt + reserve, widthPt: content.widthPt - reserve },
      };
    case 'right':
      return {
        caption: { ...content, xPt: content.xPt + content.widthPt - reserve, widthPt: reserve },
        widget: { ...content, widthPt: content.widthPt - reserve },
      };
  }
}

/**
 * Splits the content region of a field into its caption strip and the rest. The strip is `reserve` points deep along
 * the `placement` axis (`left` when absent). A caption with no `reserve`, or one of 0 or less (the XFA `-1`; pdf.js
 * `Caption[$toHTML]` treats `reserve <= 0` as automatic), asks `hook`;
 * until W01-T05 answers, it keeps no space and is flagged `auto`, with an issue. No caption element means no strip: the
 * XFA default caption is a property default, not something the template drew. A `hidden` or `inactive` caption takes no
 * space, an `invisible` one keeps it. A reserve larger than the region is cut to it (flagged `clamped`, with an issue).
 * An unmodelled placement (`inline`, or text that is no placement) carves nothing and is reported. Returns `undefined`
 * when nothing is carved.
 */
export function splitCaption(node: FormNode, content: Rect, sink: IssueSink, hook: CaptionReserveHook = unresolvedReserve): CaptionSplit | undefined {
  const caption = node.childrenOfClass('caption')[0];
  if (caption === undefined) return undefined;
  let placement: z.infer<typeof captionPlacementSchema>;
  let presence: CaptionLayout['presence'];
  let explicit: number | undefined;
  try {
    placement = enumAttr(caption, 'placement', captionPlacementSchema, 'left');
    presence = enumAttr(caption, 'presence', presenceSchema, 'visible');
    explicit = lengthAttr(caption, 'reserve');
  } catch (error) {
    if (!(error instanceof XfaLayoutError)) throw error;
    sink.add(node, `caption ${error.message}`);
    return undefined;
  }
  if (placement === 'inline') {
    sink.add(node, 'caption placement="inline" (not modelled)');
    return undefined;
  }
  if (presence === 'hidden' || presence === 'inactive') {
    return { layout: { placement, reservePt: 0, auto: false, clamped: false, presence }, requestedPt: 0, widgetRect: content };
  }
  const answer = explicit !== undefined && explicit > 0 ? explicit : hook(node, placement, content);
  const auto = answer === 'auto';
  if (auto) sink.add(node, 'caption reserve is automatic (text measure not available)');
  const wanted = auto ? 0 : answer;
  const along = placement === 'top' || placement === 'bottom' ? content.heightPt : content.widthPt;
  const reserve = Math.min(Math.max(wanted, 0), along);
  const clamped = reserve < wanted;
  if (clamped) sink.add(node, 'caption reserve larger than the content region (cut to fit)');
  const parts = strip(content, placement, reserve);
  return { layout: { placement, reservePt: reserve, auto, clamped, presence }, requestedPt: Math.max(wanted, 0), captionRect: parts.caption, widgetRect: parts.widget };
}
