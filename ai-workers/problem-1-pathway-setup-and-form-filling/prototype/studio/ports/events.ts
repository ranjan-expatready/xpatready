// The shared events contract (case-side contract v0.1 §1 rule 3, §4; platform-and-front-office contracts §0.5): the names
// of the events modules write to the outbox (module_event, PF-3) and the shapes their consumers read. Every module
// imports these from here and spells no event name itself. This folder imports only zod and its own files.
// FO-1a adds the first name it consumes; each later row adds the names and payloads it writes or reads.
import { z } from "zod";

/** Event names (module_event.type), one per line, owner module in the comment. */
export const EVENT = {
  /** A firm was created (platform, contracts §1.1). Front office seeds the firm's pipelines on it (FO-1a). */
  FIRM_CREATED: "firm.created",
  /** A staff member's roles changed (platform, PF-4; contracts §1.2 events out). */
  STAFF_ROLES_CHANGED: "staff.roles_changed",
  /** A staff member was deactivated: their sessions ended at once (platform, PF-4; contracts §1.2 events out). */
  STAFF_DEACTIVATED: "staff.deactivated",
} as const;
export type EventName = (typeof EVENT)[keyof typeof EVENT];

/** What a `firm.created` consumer needs: the outbox row's type and firm (module_event's envelope, contracts §0.5). */
export const FirmCreated = z.object({ type: z.literal(EVENT.FIRM_CREATED), firmId: z.string().uuid() });
export type FirmCreated = z.infer<typeof FirmCreated>;

/** The payload PF-4 writes for `staff.roles_changed` and `staff.deactivated`: ids only (no name, email, role words or
 *  licence; a consumer reads the person's current roles from the platform). The firm is the outbox row's firm_id. */
export const StaffEventPayload = z.object({ staffId: z.string().uuid() }).strict();
export type StaffEventPayload = z.infer<typeof StaffEventPayload>;
/** What a consumer of either staff event needs: the outbox row's type and firm, and the payload's staff id. */
export const StaffRolesChanged = z.object({ type: z.literal(EVENT.STAFF_ROLES_CHANGED), firmId: z.string().uuid(), payload: StaffEventPayload });
export type StaffRolesChanged = z.infer<typeof StaffRolesChanged>;
export const StaffDeactivated = z.object({ type: z.literal(EVENT.STAFF_DEACTIVATED), firmId: z.string().uuid(), payload: StaffEventPayload });
export type StaffDeactivated = z.infer<typeof StaffDeactivated>;
