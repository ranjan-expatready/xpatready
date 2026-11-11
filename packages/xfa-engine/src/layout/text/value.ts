import type { FormNode } from '../../model/form/index.js';
import { widgetOf as formWidgetOf } from '../../model/form/value.js';
import { localContentRect, readableInsetsOf } from '../box/insets.js';
import type { IssueSink } from '../box/issues.js';
import type { Insets, Rect } from '../box/types.js';

/** What a node shows as text. `rich` is exData markup (laid out by `rich/`, W01-T06) with the markup as the form holds it now; `none` is a node with no text to draw. */
export type TextSource = { readonly kind: 'text'; readonly text: string } | { readonly kind: 'rich'; readonly markup: string } | { readonly kind: 'none' };

const NONE: TextSource = { kind: 'none' };

/** The widgets whose field shows its value as text (a `ui` left out is the default widget, a text box). Password, check, button, barcode, signature and image widgets show none. */
const TEXT_WIDGETS: ReadonlySet<string> = new Set(['textEdit', 'numericEdit', 'dateTimeEdit', 'choiceList', 'defaultUi']);

/** The widget class of a field (`defaultUi` when it writes none); undefined for a node that is not a field. */
export const widgetOf = (field: FormNode): string | undefined => (field.className === 'field' ? (formWidgetOf(field) ?? 'defaultUi') : undefined);

const contentOf = (owner: FormNode): FormNode | undefined => owner.childrenOfClass('value')[0]?.oneOfChild;

/**
 * The text a draw or field displays: for a draw its value; for a field the display value (`formattedValue`: the picture
 * applied to the value, or the label of the selected choice), never `rawValue`. A field whose widget draws no text, or
 * whose value is not text (image, line, rectangle, arc), shows none.
 */
export function valueTextOf(node: FormNode): TextSource {
  if (node.className !== 'draw' && node.className !== 'field') return NONE;
  if (node.className === 'field' && !TEXT_WIDGETS.has(widgetOf(node) ?? '')) return NONE;
  const content = contentOf(node);
  if (node.className === 'draw' && content === undefined) return NONE;
  if (content !== undefined && ['image', 'line', 'rectangle', 'arc'].includes(content.className)) return NONE;
  if (content?.isRich === true) return { kind: 'rich', markup: content.nodeValue };
  return { kind: 'text', text: node.formattedValue };
}

/** The text of a caption: its `value` (plain `text`, or `exData` of plain type), or `rich` for markup. */
export function captionTextOf(caption: FormNode): TextSource {
  const content = contentOf(caption);
  if (content === undefined || ['image', 'line', 'rectangle', 'arc'].includes(content.className)) return NONE;
  return content.isRich ? { kind: 'rich', markup: content.nodeValue } : { kind: 'text', text: content.plainText };
}

/** True when a field's text box wraps: its `textEdit` is `multiLine="1"`. Every other widget shows one line. */
export const wrapsField = (field: FormNode): boolean => {
  const widget = field.childrenOfClass('ui')[0]?.oneOfChild;
  return widget?.className === 'textEdit' && widget.attr('multiLine') === '1';
};

/** `rect` less `insets`, never below zero in either direction (the box layer's `localContentRect`, moved to the rectangle's origin). */
export const insetRect = (rect: Rect, insets: Insets): Rect => {
  const inner = localContentRect(rect, insets);
  return { ...inner, xPt: rect.xPt + inner.xPt, yPt: rect.yPt + inner.yPt };
};

/** The inner rectangle of a field's widget: the widget region less the margin of the widget element (`ui > textEdit > margin`); a margin that cannot be read is reported and read as none. */
export function widgetTextRect(field: FormNode, widgetRect: Rect, sink: IssueSink): Rect {
  const widget = field.childrenOfClass('ui')[0]?.oneOfChild;
  return widget === undefined ? widgetRect : insetRect(widgetRect, readableInsetsOf(widget, sink, 'widget margin'));
}
