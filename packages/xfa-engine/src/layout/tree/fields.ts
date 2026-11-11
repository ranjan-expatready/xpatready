import { z } from 'zod';
import { effectiveAccess, type FormNode } from '../../model/form/index.js';
import { lists } from '../../model/form/items.js';
import { guarded } from '../box/border.js';
import { somOf, type IssueSink } from '../box/issues.js';
import type { LayoutBox, Rect } from '../box/types.js';
import { checkBoxOf, isChecked, type CheckBoxGeometry } from '../graphics/index.js';
import { MAX_FIELD_ITEMS, MAX_TEXT_CHARS } from '../limits.js';
import { accessSchema, widgetKindSchema, type RenderItem } from '../render-tree.js';
import { widgetOf, widgetTextRect, wrapsField } from '../text/index.js';
import { XfaLayoutError } from '../errors.js';

type FieldItem = Extract<RenderItem, { kind: 'field' }>;
type Widget = FieldItem['widget'];

/** `maxChars` as a template writes it: digits only (0 means no limit, and is read as none). */
const maxCharsSchema = z.string().regex(/^\d{1,9}$/).transform(Number);

/** The widgets that draw their value as text inside the widget region: the control sits where the engine laid the text. */
const INTERIOR_WIDGETS: ReadonlySet<Widget> = new Set<Widget>(['textEdit', 'numericEdit', 'passwordEdit', 'dateTimeEdit', 'choiceList', 'defaultUi']);

/** `text` cut to the ceiling of one text in the tree; a cut is reported against `node`, so a long value is never shortened silently. */
function clip(text: string, node: FormNode, sink: IssueSink, what: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  sink.add(node, `${what} longer than ${MAX_TEXT_CHARS} characters (cut)`);
  return text.slice(0, MAX_TEXT_CHARS);
}
const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** The leaves whose text names a field: a caption's `text` or `exData`, and the `speak` and `toolTip` of `assist`. */
const NAMING_LEAVES: ReadonlySet<string> = new Set(['text', 'exData', 'speak', 'toolTip']);

/** The plain text of a naming leaf, whitespace collapsed; empty for anything else (an image, a line) or nothing. */
const plainOf = (leaf: FormNode | undefined): string => (leaf === undefined || !NAMING_LEAVES.has(leaf.className) ? '' : collapse(leaf.plainText));

/** The accessible name of a field: its caption text, else `assist/speak`, else `assist/toolTip` (card W04-T19). */
function ariaLabelOf(field: FormNode): string {
  const caption = plainOf(field.childrenOfClass('caption')[0]?.childrenOfClass('value')[0]?.oneOfChild);
  if (caption !== '') return caption;
  const assist = field.childrenOfClass('assist')[0];
  const speak = plainOf(assist?.childrenOfClass('speak')[0]);
  return speak !== '' ? speak : plainOf(assist?.childrenOfClass('toolTip')[0]);
}

/** `value/text maxChars`: the most characters the field accepts; undefined when absent, 0 (no limit) or not a number (reported). */
function maxCharsOf(field: FormNode, sink: IssueSink): number | undefined {
  const text = field.childrenOfClass('value')[0]?.oneOfChild;
  const written = text?.className === 'text' ? text.attr('maxChars')?.trim() : undefined;
  if (text === undefined || written === undefined || written === '') return undefined;
  const parsed = maxCharsSchema.safeParse(written);
  if (!parsed.success) {
    sink.add(text, 'maxChars is not a whole number (no limit applied)');
    return undefined;
  }
  return parsed.data > 0 ? parsed.data : undefined;
}

/** The choice list of a field as the render tree carries it: stored value and shown label, capped. */
function itemsOf(field: FormNode, sink: IssueSink): { value: string; label: string }[] {
  const { labels, values } = lists(field);
  if (values.length > MAX_FIELD_ITEMS) sink.add(field, `choice list has more than ${MAX_FIELD_ITEMS} items (cut)`);
  return values.slice(0, MAX_FIELD_ITEMS).map((value, index) => ({ value: clip(value, field, sink, 'choice item'), label: clip(labels[index] ?? value, field, sink, 'choice item') }));
}

/** Where the control goes: the check square of a check button, the text interior of a text-like widget, else the widget region. */
function contentRectOf(box: LayoutBox, widget: Widget, check: CheckBoxGeometry | undefined, sink: IssueSink): Rect {
  if (widget === 'checkButton' && check !== undefined) return { ...check.square };
  if (INTERIOR_WIDGETS.has(widget)) return widgetTextRect(box.node, box.widgetRect, sink);
  return { ...box.widgetRect };
}

/**
 * The `field` item of a drawn field box (the interactive overlay the viewer places a control by), in the layout frame of
 * the box. `value` is the RAW stored value; what the field shows when it is not being edited is the box's `text` item.
 * `access` is the EFFECTIVE access: the field's own made at least as restrictive as every ancestor's (`effectiveAccess`; E11). A value the
 * schema has no name for (a widget class, the field's own `access`) is reported and read as `defaultUi` / `open` (an own `access` read as `open` still takes its ancestors').
 */
export function fieldItemOf(box: LayoutBox, sink: IssueSink): FieldItem {
  const node = box.node;
  const kind = widgetKindSchema.safeParse(widgetOf(node));
  if (!kind.success) sink.add(node, 'widget class not in the render tree (read as the default ui)');
  const widget: Widget = kind.success ? kind.data : 'defaultUi';
  const access = guarded(
    node,
    sink,
    'access',
    () => {
      const parsed = accessSchema.safeParse(node.access);
      if (!parsed.success) throw new XfaLayoutError('LAYOUT_UNSUPPORTED', 'access: value not supported (its own read as open, the ancestors\' still apply)');
      return effectiveAccess(node);
    },
    // The field's own value is unusable, so it counts as open; the ancestors' restriction still applies, as in `problems()`.
    effectiveAccess(node),
  );
  const raw = node.rawValue;
  const check = widget === 'checkButton' ? checkBoxOf(box, sink) : undefined;
  const maxChars = maxCharsOf(node, sink);
  const label = ariaLabelOf(node);
  const som = somOf(node);
  // `somOf` falls back to `class:name` for a path over the SOM ceiling (the same size as a short text, so it never needs a cut): that name does not resolve.
  if (!som.startsWith('xfa[0].')) sink.add(node, 'SOM expression not available (the overlay cannot be addressed by the runtime)');
  return {
    kind: 'field',
    som,
    widget,
    rect: { ...box.rect },
    contentRect: contentRectOf(box, widget, check, sink),
    access,
    presence: box.presence,
    value: raw === null ? '' : clip(String(raw), node, sink, 'field value'),
    ...(widget === 'choiceList' ? { items: itemsOf(node, sink) } : {}),
    ...(maxChars === undefined ? {} : { maxChars }),
    ...(widget === 'textEdit' ? { multiLine: wrapsField(node) } : {}),
    ...(label === '' ? {} : { ariaLabel: clip(label, node, sink, 'accessible name') }),
    ...(widget === 'checkButton' ? { checked: isChecked(node), ...(check === undefined ? {} : { mark: check.mark }) } : {}),
  };
}
