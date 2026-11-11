import { z } from 'zod';
import type { FormNode } from './node.js';

/** The `access` values of a container (XFA 3.3). */
export const accessSchema = z.enum(['open', 'nonInteractive', 'protected', 'readOnly']);
export type Access = z.infer<typeof accessSchema>;

/** How much each value restricts: the most restrictive of a container's own and its ancestors' applies. */
const RESTRICTION: Readonly<Record<Access, number>> = { open: 0, readOnly: 1, protected: 2, nonInteractive: 3 };

/** The more restrictive of two values. */
export const moreRestrictive = (a: Access, b: Access): Access => (RESTRICTION[b] > RESTRICTION[a] ? b : a);

/**
 * The access a container really has: its own `access`, made at least as restrictive as every ancestor's. Since XFA 2.8 the
 * `access` of a subform (or an exclusion group) applies to every container beneath it, and the most restrictive one wins
 * (Adobe Designer Scripting Reference, "access": `protected` containers generate no events, `readOnly` ones only the events
 * that are not direct changes to the content, `nonInteractive` ones cannot be updated interactively). The order is
 * nonInteractive over protected over readOnly over open (main-session ruling, E11). A value outside the enumeration reads as `open`.
 * This is the one place the ancestor walk is made; the layout and the runtime both call it.
 */
export function effectiveAccess(node: FormNode): Access {
  let result: Access = 'open';
  for (let current: FormNode | null = node; current !== null; current = current.parent) {
    const own = accessSchema.safeParse(current.access);
    if (own.success) result = moreRestrictive(result, own.data);
  }
  return result;
}
