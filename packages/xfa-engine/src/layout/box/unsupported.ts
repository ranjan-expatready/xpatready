import { z } from 'zod';
import type { FormNode } from '../../model/form/index.js';
import { safeText } from '../../pdf/safe-text.js';
import { XfaLayoutError } from '../errors.js';
import { enumAttr } from './attributes.js';
import { LAYOUT_MODES, type LayoutMode } from './types.js';

const layoutSchema = z.enum(LAYOUT_MODES);

/** Classes whose `layout` places their children (an `area` is always positioned). */
export const CONTAINER_CLASSES: ReadonlySet<string> = new Set(['subform', 'exclGroup', 'area']);

/** The `layout` of a subform or exclGroup (`position` by the XFA default); `position` for an area; undefined for anything else. */
export function layoutModeOf(node: FormNode): LayoutMode | undefined {
  if (node.className === 'area') return 'position';
  if (node.className !== 'subform' && node.className !== 'exclGroup') return undefined;
  return enumAttr(node, 'layout', layoutSchema, 'position');
}

/**
 * The layout feature `node` uses that the engine does not model, or `undefined`: `lr-tb`, `rl-tb` and `rl-row` layouts, a `colSpan`
 * other than the default 1, a `comb` widget, an `overflow` element, and a `layout` value that is not an XFA layout. The
 * flowed layouts `tb`, `row` and `table` are modelled (by W01-T07), not unsupported.
 */
export function unsupportedFeatureOf(node: FormNode): string | undefined {
  try {
    const mode = layoutModeOf(node);
    if (mode === 'lr-tb' || mode === 'rl-tb' || mode === 'rl-row') return `layout="${mode}"`;
  } catch (error) {
    if (error instanceof XfaLayoutError) return error.message;
    throw error;
  }
  const colSpan = node.attr('colSpan')?.trim();
  if (colSpan !== undefined && colSpan !== '' && colSpan !== '1') return `colSpan="${safeText(colSpan)}"`;
  if (node.childrenOfClass('overflow')[0] !== undefined) return 'overflow';
  const widget = node.childrenOfClass('ui')[0]?.oneOfChild;
  if (widget !== undefined && widget.childrenOfClass('comb')[0] !== undefined) return 'comb';
  return undefined;
}
