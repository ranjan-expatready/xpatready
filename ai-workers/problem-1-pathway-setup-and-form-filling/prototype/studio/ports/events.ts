// The shared events contract (case-side contract v0.1 §1 rule 3, §4; platform-and-front-office contracts §0.5): the names
// of the events modules write to the outbox (module_event, PF-3) and the shapes their consumers read. Every module
// imports these from here and spells no event name itself. This folder imports only zod and its own files.
// FO-1a adds the first name it consumes; each later row adds the names and payloads it writes or reads.
import { z } from "zod";

/** Event names (module_event.type), one per line, owner module in the comment. */
export const EVENT = {
  /** A firm was created (platform, contracts §1.1). Front office seeds the firm's pipelines on it (FO-1a). */
  FIRM_CREATED: "firm.created",

  /** A complaint was recorded (platform register, PF-21; FO-13k rev 12). */
  COMPLAINT_RECEIVED: "complaint.received",
  /** A complaint was closed with its outcome (platform register, PF-21; FO-13k rev 12). */
  COMPLAINT_CLOSED: "complaint.closed",
} as const;
export type EventName = (typeof EVENT)[keyof typeof EVENT];

/** What a `firm.created` consumer needs: the outbox row's type and firm (module_event's envelope, contracts §0.5). */
export const FirmCreated = z.object({ type: z.literal(EVENT.FIRM_CREATED), firmId: z.string().uuid() });
export type FirmCreated = z.infer<typeof FirmCreated>;

// PF-21 (FO-13k rev 12; Lead 47's answer 2 on #1753): the complaints register's two events, ids and facts only (never the
// complainant's name, contact or the summary). module_event.subject_id is the complaint's id.
const Uuid = z.string().uuid();
const ComplaintSubjectKind = z.enum(["FRONT_OFFICE_PERSON", "CASE_PARTY", "OTHER_PERSON"]);
/** `complaint.received`: who complained (the other module's id, none for another person) and when. */
export const ComplaintReceived = z.strictObject({
  type: z.literal(EVENT.COMPLAINT_RECEIVED), firmId: Uuid, complaintId: Uuid,
  subjectKind: ComplaintSubjectKind, subjectId: Uuid.nullable(), receivedAt: z.iso.datetime({ offset: true }),
});
export type ComplaintReceived = z.infer<typeof ComplaintReceived>;
/** `complaint.closed`: the outcome and when. */
export const ComplaintClosed = z.strictObject({
  type: z.literal(EVENT.COMPLAINT_CLOSED), firmId: Uuid, complaintId: Uuid,
  subjectKind: ComplaintSubjectKind, subjectId: Uuid.nullable(),
  outcome: z.enum(["RESOLVED", "UPHELD", "NOT_UPHELD", "WITHDRAWN", "REFERRED_TO_COLLEGE"]), closedAt: z.iso.datetime({ offset: true }),
});
export type ComplaintClosed = z.infer<typeof ComplaintClosed>;
