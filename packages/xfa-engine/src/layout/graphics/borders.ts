import type { FormNode } from '../../model/form/index.js';
import { readableInsetsOf } from '../box/insets.js';
import type { IssueSink } from '../box/issues.js';
import type { BorderStyle, LayoutBox, Rect } from '../box/types.js';
import type { RenderItem } from '../render-tree.js';
import { insetRect } from '../text/value.js';
import { shapeItems, type OutlineOptions } from './outline.js';

/**
 * The reference rectangle of a border: `rect` less the border's own `margin` insets. Origin (PA-4): pdf.js v4.10.38
 * (Apache-2.0) `html_utils.js createWrapper` places the border element at the node's box offset by those insets
 * (`top = insets[0]`, `left = insets[3]`, and the width and height less the insets).
 */
function referenceRect(rect: Rect, border: FormNode | undefined, sink: IssueSink): Rect {
  const margin = border?.childrenOfClass('margin')[0];
  return margin === undefined || border === undefined ? rect : insetRect(rect, readableInsetsOf(border, sink, 'border margin'));
}

/** The paint of a container's own `border` around the whole box (caption and all). Nothing when the template writes no visible border. */
export function containerBorderItems(box: LayoutBox, sink: IssueSink): RenderItem[] {
  const style = box.borderStyle;
  if (style === undefined) return [];
  if (box.rotation !== 0) sink.add(box.node, `border on a box rotated ${box.rotation} degrees (drawn unrotated)`);
  return shapeItems(referenceRect(box.rect, box.node.childrenOfClass('border')[0], sink), style);
}

/**
 * The widget element of a field (`ui` > `textEdit`, `choiceList`, ...), or undefined for a field with no `ui`. `widgetOf`
 * (model/form/value.ts) answers the class name only; the layout needs the node for its margin, border and attributes.
 */
export const widgetNodeOf = (field: FormNode): FormNode | undefined => field.childrenOfClass('ui')[0]?.oneOfChild;

/** The paint of a widget's border around `region` (the widget region of its field, or the check box). */
export function widgetBorderItems(box: LayoutBox, region: Rect, sink: IssueSink, options: OutlineOptions = {}): RenderItem[] {
  const style: BorderStyle | undefined = box.widgetBorderStyle;
  if (style === undefined) return [];
  const widget = widgetNodeOf(box.node);
  return shapeItems(referenceRect(region, widget?.childrenOfClass('border')[0], sink), style, options);
}
