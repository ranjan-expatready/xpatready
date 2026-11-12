import { attributesOfClass } from '../form/attributes.js';
import { UI_WIDGET_CLASSES } from '../template/index.js';

/**
 * What the form packet may carry, one list for writing and reading, so the engine never writes state it would refuse to
 * restore. A saved packet is untrusted input: only these classes are matched, and only settable attributes come back.
 * Behaviour-bearing classes (`script`, `event`, `calculate`, `bind`, `occur`, ...) are deliberately absent, as is the
 * layout (`pageSet`; plan decision D4) and rich text (`exData`), which the engine does not write as packet state.
 */

/** Containers that appear, by name, in the form packet's tree. */
export const CONTAINER_CLASSES: ReadonlySet<string> = new Set(['subform', 'field', 'exclGroup', 'draw', 'area']);

/** Leaf classes whose text is UI state (a caption, a list item, an unbound value, a tool tip). */
export const TEXT_CLASSES: ReadonlySet<string> = new Set(['text', 'integer', 'decimal', 'float', 'boolean', 'date', 'time', 'dateTime', 'toolTip', 'speak']);

/** Property classes the packet carries below a container. */
export const PROPERTY_CLASSES: ReadonlySet<string> = new Set([
  'ui',
  ...UI_WIDGET_CLASSES,
  'border', 'edge', 'corner', 'fill', 'color', 'solid', 'linear', 'radial', 'pattern', 'stipple',
  'caption', 'value', 'validate', 'items', 'assist', 'font', 'margin', 'para', 'comb',
  ...TEXT_CLASSES,
]);

/** Classes with positional slots (a border's four edges and corners): matched by index, so lower slots are always written. */
export const SLOTTED_CLASSES: ReadonlySet<string> = new Set(['edge', 'corner']);

/** The attributes of an `items` list that the packet records (a display list and a hidden save list). */
export const ITEMS_ATTRIBUTES: readonly string[] = ['save', 'presence'];

/** True when `name` is an attribute a script may set on `className` (the same allow-list the object model enforces). */
export function isSettable(className: string, name: string): boolean {
  return attributesOfClass(className)?.has(name) === true;
}
