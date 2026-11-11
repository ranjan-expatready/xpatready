import { z } from 'zod';
import { effectiveAccess, type Access, type FormNode } from '../model/form/index.js';
import { widgetOf } from '../model/form/value.js';
import { activitySchema } from './wire-schemas.js';

/** What a user does to a container: types or picks a value (`setValue`), or fires an event on it (a click, entering it, ...). */
export const userActionSchema = z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('setValue') }), z.strictObject({ kind: z.literal('event'), activity: activitySchema })]);
export type UserAction = z.infer<typeof userActionSchema>;

/** `allowed`, or refused with the container's effective access and a reason fit to show. */
export type UserActionCheck = { readonly allowed: true } | { readonly allowed: false; readonly access: Exclude<Access, 'open'>; readonly reason: string };

/**
 * Whether a USER action on `node` is allowed by its effective access (`effectiveAccess`: its own and its ancestors'). Form scripts are
 * not asked: a script keeps setting a locked field, as in Adobe's products.
 *
 * Rules, from Adobe's Designer Scripting Reference ("access"): an `open` container accepts everything. A `protected` container
 * "does not generate any events", so nothing a user does reaches it. A `nonInteractive` container is not updated interactively (the
 * most restrictive value), so it takes nothing either. A `readOnly` container can be viewed and tabbed into and "generates a subset of
 * events (those not associated with the user making direct changes to the content)": entering, leaving and the mouse events are
 * allowed, a `change` or a value written by the user is not, and a click is refused only on a check button (a radio button of an
 * exclusion group is one too), the one widget a click toggles and so changes the content; a click on a button or any other widget
 * changes nothing and is allowed. Reading a click as a "direct change" only where it toggles is ours: the reference does not name widgets.
 */
export function checkUserAction(node: FormNode, action: UserAction): UserActionCheck {
  const access = effectiveAccess(node);
  if (access === 'open') return { allowed: true };
  if (access === 'readOnly') {
    const changes = action.kind === 'setValue' || action.activity === 'change' || (action.activity === 'click' && node.className === 'field' && widgetOf(node) === 'checkButton');
    if (!changes) return { allowed: true };
  }
  const what = action.kind === 'setValue' ? 'a value' : `the ${action.activity} event`;
  return { allowed: false, access, reason: `${what} cannot be given by the user to a container whose access is ${access}` };
}
