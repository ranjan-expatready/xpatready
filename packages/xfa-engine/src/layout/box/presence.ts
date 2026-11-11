import type { FormNode } from '../../model/form/index.js';
import { safeText } from '../../pdf/safe-text.js';
import { enumAttr } from './attributes.js';
import type { IssueSink } from './issues.js';
import { presenceSchema, type PresenceState } from './types.js';

/** How much each presence hides: a child takes the stronger of its own and its parent's. */
const HIDING: Readonly<Record<PresenceState, number>> = { visible: 0, invisible: 1, hidden: 2, inactive: 3 };

/** The presence the form DOM holds for `node` (a script write, else the template, else `visible`). */
export function ownPresence(node: FormNode): PresenceState {
  return enumAttr(node, 'presence', presenceSchema, 'visible');
}

/** Screen-view semantics: a hidden or inactive container hides its subtree, an invisible one keeps its subtree invisible. */
export function effectivePresence(own: PresenceState, inherited: PresenceState): PresenceState {
  return HIDING[own] >= HIDING[inherited] ? own : inherited;
}

/** `visible` and `invisible` take room in a flow; only `visible` is drawn. */
export function flagsOf(presence: PresenceState): { readonly occupiesSpace: boolean; readonly drawn: boolean } {
  return { occupiesSpace: presence === 'visible' || presence === 'invisible', drawn: presence === 'visible' };
}

/** The first token of a `relevant` list names a view and is not an exclusion: `print` or `+print`. Only that form is print-only. */
function isPrintOnlyText(text: string): boolean {
  const first = text.trim().split(/\s+/)[0] ?? '';
  return first === 'print' || first === '+print';
}

/**
 * The `relevant` attribute as written, kept on the box for a later print path. The viewer is a screen view, so
 * `-print` (relevant everywhere but print) changes nothing here. `print` (or `+print`) as the first token is print-only
 * and the box is not shown on screen (`isPrintOnly`; pdf.js `isPrintOnly` marks the same boxes `xfaPrintOnly`, which
 * the screen stylesheet hides). Any other value is reported, not acted on.
 */
export function relevantOf(node: FormNode, sink: IssueSink): string | undefined {
  const text = node.attr('relevant');
  if (text === undefined || text.trim() === '') return undefined;
  if (text.trim() !== '-print' && !isPrintOnlyText(text)) sink.add(node, `relevant="${safeText(text)}" (only -print and print are modelled; kept, screen visibility unchanged)`);
  return text;
}

/** True when `relevant` (as `relevantOf` returns it) makes the box print-only: it takes no room and is not drawn on screen. */
export function isPrintOnly(relevant: string | undefined): boolean {
  return relevant !== undefined && isPrintOnlyText(relevant);
}

/**
 * The effective presence of `node` under a parent of presence `inherited`, and the `relevant` attribute it was read with:
 * the node's own presence (print-only `relevant` counts as hidden), made at least as hidden as its parent's. Problems with
 * the node's own attributes are `XfaLayoutError`s; `sink` collects the `relevant` values that are not modelled.
 */
export function presenceOf(node: FormNode, inherited: PresenceState, sink: IssueSink): { readonly presence: PresenceState; readonly relevant: string | undefined } {
  const relevant = relevantOf(node, sink);
  const own = ownPresence(node);
  return { presence: effectivePresence(isPrintOnly(relevant) ? effectivePresence(own, 'hidden') : own, inherited), relevant };
}
