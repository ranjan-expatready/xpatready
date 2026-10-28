// The Form library row's one written action (P-116 amended), kept apart from the Nest controller so a check can load it
// without decorators (R69-3).
import { WHY } from "../../contracts/lifecycle.ts";
import type { UsesView } from "../../contracts/structure.ts";

/** The row's one written action (P-116 amended), from the one guard's answers: my own waiting change can be withdrawn;
 *  anyone else's waiting change greys the row; a retired form is restored; otherwise Delete when nothing uses it, else
 *  Retire, greyed with the guard's own reason when it cannot be taken now. */
export function rowActionOf(retired: boolean, u: UsesView, pending: { id: string; action: string; proposedBy: string } | null, actorId?: string): { kind: "DELETE" | "RETIRE" | "RESTORE" | "WITHDRAW"; why: string | null; change_id: string | null } {
  if (pending) return pending.proposedBy === actorId ? { kind: "WITHDRAW", why: null, change_id: pending.id } : { kind: pending.action as "DELETE" | "RETIRE" | "RESTORE", why: WHY.waiting, change_id: null };
  if (retired) return { kind: "RESTORE", why: u.can.restore, change_id: null };
  if (!u.can.delete) return { kind: "DELETE", why: null, change_id: null };
  if (!u.can.retire) return { kind: "RETIRE", why: null, change_id: null };
  return u.released ? { kind: "RETIRE", why: u.can.retire, change_id: null } : { kind: "DELETE", why: u.can.delete, change_id: null };
}
