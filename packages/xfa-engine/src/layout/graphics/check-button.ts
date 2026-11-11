import { z } from 'zod';
import type { FormNode } from '../../model/form/index.js';
import { enumAttr, sizeAttr } from '../box/attributes.js';
import { guarded } from '../box/border.js';
import { readableInsetsOf } from '../box/insets.js';
import type { IssueSink } from '../box/issues.js';
import type { LayoutBox, Rect, RgbColour } from '../box/types.js';
import type { RenderItem } from '../render-tree.js';
import { textStyleOf } from '../text/style.js';
import { insetRect } from '../text/value.js';
import { widgetBorderItems, widgetNodeOf } from './borders.js';
import { markItems, type MarkKind } from './marks.js';

const shapeSchema = z.enum(['square', 'round']);
const markSchema = z.enum(['default', 'check', 'circle', 'cross', 'diamond', 'square', 'star']);

/**
 * FD-38 exemption (correctness constant): the XFA default side of a check box, 10 pt (`checkButton size`; the same value
 * pdf.js v4.10.38 `template.js CheckButton` gives it, Apache-2.0).
 */
const DEFAULT_SIZE_PT = 10;

/**
 * FD-38 exemption (correctness constant): the "on" value of a check box or radio button that lists no item, `on`
 * (pdf.js v4.10.38 `CheckButton[$toHTML]`, Apache-2.0: `items[0] !== undefined ? items[0] : "on"`).
 */
const DEFAULT_ON_VALUE = 'on';

/**
 * FD-38 exemption (correctness constant): what a field holding no value reads as, `off` (pdf.js `CheckButton[$toHTML]`:
 * `field.value?.[$text]() || "off"`).
 */
const NO_VALUE = 'off';

/**
 * True when the field holds its "on" value. Read from the form DOM now, so a value a script or the user wrote is what is
 * drawn (a toggle redraws on the next layout).
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js CheckButton[$toHTML]`: `on` is the first item of the field's
 * first `items` list, else `"on"`; the value is the field's text, else `"off"`; the box is checked when the value equals
 * `on`. (`off` is the second item, else `"off"`; it never decides the state.) A radio button in an exclusion group
 * reads as its on value when the group holds it, as the form model answers, and `"off"` otherwise.
 */
export function isChecked(field: FormNode): boolean {
  const first = field.childrenOfClass('items')[0]?.children[0]?.plainText;
  const on = first ?? DEFAULT_ON_VALUE;
  const raw = field.rawValue;
  const value = raw === null || String(raw) === '' ? NO_VALUE : String(raw);
  return value === on;
}

/** `default` is the viewer's own mark: the check for a square box, the circle for a round one (UNCONFIRMED against Acrobat; the corpus writes `check`). */
const resolvedMark = (mark: z.infer<typeof markSchema>, shape: z.infer<typeof shapeSchema>): MarkKind => (mark === 'default' ? (shape === 'round' ? 'circle' : 'check') : mark);

/**
 * Where the check box sits in the widget region: `size` square (cut to the room), placed by the field's own `para`
 * (`hAlign` left / center / right, `vAlign` top / middle / bottom). UNCONFIRMED against Acrobat (pdf.js uses a native
 * input): both real forms write `hAlign="left" vAlign="middle"` on every check box.
 */
function boxRect(area: Rect, sidePt: number, hAlign: string, vAlign: string): Rect {
  const x = hAlign === 'right' ? area.xPt + area.widthPt - sidePt : hAlign === 'center' ? area.xPt + (area.widthPt - sidePt) / 2 : area.xPt;
  const y = vAlign === 'bottom' ? area.yPt + area.heightPt - sidePt : vAlign === 'middle' ? area.yPt + (area.heightPt - sidePt) / 2 : area.yPt;
  return { xPt: x, yPt: y, widthPt: sidePt, heightPt: sidePt };
}

/** The check box of a check button field: its square in the widget region and the mark it shows when checked. */
export interface CheckBoxGeometry {
  readonly square: Rect;
  readonly shape: z.infer<typeof shapeSchema>;
  readonly mark: MarkKind;
  /** The field's text colour, the colour of the mark. */
  readonly colour: RgbColour;
}

/**
 * Where a check box or radio button is and what mark it shows: `size` square (cut to the room) placed by the field's own
 * `para`, or `undefined` when the box has no size (reported: a box of no size is not drawn). `default` mark resolves by shape.
 * The caller has found the field's `ui` to be a check button.
 */
export function checkBoxOf(box: LayoutBox, sink: IssueSink): CheckBoxGeometry | undefined {
  const widget = widgetNodeOf(box.node);
  if (widget === undefined) return undefined;
  const size = guarded(widget, sink, 'checkButton size', () => sizeAttr(widget, 'size', sink), undefined) ?? DEFAULT_SIZE_PT;
  const shape = guarded(widget, sink, 'checkButton shape', () => enumAttr(widget, 'shape', shapeSchema, 'square'), 'square');
  const mark = guarded(widget, sink, 'checkButton mark', () => enumAttr(widget, 'mark', markSchema, 'default'), 'default');
  const area = insetRect(box.widgetRect, readableInsetsOf(widget, sink, 'checkButton margin'));
  const style = textStyleOf(box.node, sink);
  const side = Math.min(size, area.widthPt, area.heightPt);
  if (!(side > 0)) {
    if (!(size > 0)) sink.add(box.node, `checkButton size ${size}pt (a box of no size is not drawn)`);
    return undefined;
  }
  return { square: boxRect(area, side, style.hAlign, style.vAlign), shape, mark: resolvedMark(mark, shape), colour: style.colour };
}

/**
 * The paint of a check box or radio button field (the caller has found its `ui` to be a check button): the box with the
 * widget's border and fill (round for `shape="round"`), and the mark when the field holds its on value. A `size` of 0
 * draws a box of no size, as pdf.js does (`style.width = style.height = size`): nothing is painted and it is reported,
 * never promoted to the 10 pt default.
 */
export function checkButtonItems(box: LayoutBox, sink: IssueSink): RenderItem[] {
  const widget = widgetNodeOf(box.node);
  const geometry = checkBoxOf(box, sink);
  if (widget === undefined || geometry === undefined) return [];
  const { square, shape } = geometry;
  const items = widgetBorderItems(box, square, sink, shape === 'round' ? { roundRadiusPt: square.widthPt / 2 } : {});
  if (widget.attr('allowNeutral') === '1') sink.add(box.node, 'checkButton allowNeutral="1" (the neutral state is drawn as unchecked)');
  if (isChecked(box.node)) items.push(...markItems(geometry.mark, square, geometry.colour));
  return items;
}
