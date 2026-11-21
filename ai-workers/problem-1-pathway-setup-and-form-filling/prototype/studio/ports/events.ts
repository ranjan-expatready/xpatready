// The shared events contract (case-side contract v0.1 §1 rule 3, §4; platform-and-front-office contracts §0.5): the names
// of the events modules write to the outbox (module_event, PF-3) and the shapes their consumers read. Every module
// imports these from here and spells no event name itself. This folder imports only zod and its own files.
// FO-1a adds the first name it consumes; each later row adds the names and payloads it writes or reads.
import { z } from "zod";

/** Event names (module_event.type), one per line, owner module in the comment. */
export const EVENT = {
  /** A firm was created (platform, contracts §1.1). Front office seeds the firm's pipelines on it (FO-1a). */
  FIRM_CREATED: "firm.created",
  /** A firm became Active (Stripe `active`: after a paid invoice, or at trial end with a card while the first invoice is due; PF-5 part 2). */
  FIRM_ACTIVATED: "firm.activated",
  /** A firm's subscription status changed; payload old, new, reason (platform, PF-5 part 2). */
  FIRM_SUBSCRIPTION_CHANGED: "firm.subscription_changed",
  /** A firm went on payment hold: billing and the data download only (platform, PF-5 part 2; SA-4-25). */
  FIRM_PAYMENT_HOLD: "firm.payment_hold",
  /** A staff member's roles changed (platform, PF-4; contracts §1.2 events out). */
  STAFF_ROLES_CHANGED: "staff.roles_changed",
  /** A staff member was deactivated: their sessions ended at once (platform, PF-4; contracts §1.2 events out). */
  STAFF_DEACTIVATED: "staff.deactivated",
  /** A staff member joined by accepting an invitation (platform, PF-4b; contracts §1.2 events out). */
  STAFF_JOINED: "staff.joined",
  /** A consultation was booked (front office, FO-3; AG-4-47). Keys: bookingId and bookingId:sequence. */
  BOOKING_SCHEDULED: "booking.scheduled",
  /** A booking moved to a new time or host (FO-3). */
  BOOKING_RESCHEDULED: "booking.rescheduled",
  /** A booking was cancelled (FO-3). */
  BOOKING_CANCELLED: "booking.cancelled",
  /** The host answered "Attended" (FO-3; AG-4-39). */
  BOOKING_COMPLETED: "booking.completed",
  /** The host answered "No-show" (FO-3; AG-4-39). Never written by a job. */
  BOOKING_NO_SHOW: "booking.no_show",

  /** A complaint was recorded (platform register, PF-21; FO-13k rev 12). */
  COMPLAINT_RECEIVED: "complaint.received",
  /** A complaint was closed with its outcome (platform register, PF-21; FO-13k rev 12). */
  COMPLAINT_CLOSED: "complaint.closed",
  /** A firm's staff member raised a support ticket to us (platform, PF-18b; AG-16-63). The name is SA-10's domain event
   *  (04-Doc-2-SuperAdmin-Console.md: "support.ticket_created"), which our console (PF-17) consumes. */
  SUPPORT_TICKET_RAISED: "support.ticket_created",
  /** A retainer or consultation agreement was drafted from a template (front office, FO-5; contracts §2.3). */
  RETAINER_DRAFTED: "retainer.drafted",
  /** A retainer passed its send check and was sent (front office, FO-5; FO-6 adds the signing request; contracts §2.3). */
  RETAINER_SENT: "retainer.sent",
  /** A sent retainer was withdrawn with a reason (front office, FO-5; AG-5-34). */
  RETAINER_WITHDRAWN: "retainer.withdrawn",
  /** A retainer was recorded as signed on paper (front office, FO-5; AG-5-39; contracts §7 §2.3-§2.4). */
  RETAINER_SIGNED_OFFLINE: "retainer.signed_offline",
  /** A sent retainer's open request ended because an edit made a newer version (front office, FO-5f; payload `version` =
   *  the ended version, `reason` UPDATED). FO-6 cancels the signing request on it. */
  RETAINER_REQUEST_ENDED: "retainer.request_ended",

  /** A client identity check was recorded (front office, FO-13i; Code s. 24(2)(a)). Ids, the method and the detail names only. */
  IDENTITY_CHECKED: "identity.checked",
  /** A conflict-of-interest check was recorded or confirmed (front office, FO-13c; Code s. 15, 16). Ids and the result
   *  kind only, never a searched name, email or phone. The case side shows a conflict found on an existing client (s. 35(1)(c)). */
  CONFLICT_CHECKED: "conflict.checked",
  /** A lead arrived: by the web form or added by hand (front office, FO-2; AG-2-84). */
  LEAD_CREATED: "lead.created",
  /** A lead got an owner: Take it or Assign to (FO-2; AG-2-13c, AG-2-86). */
  LEAD_TAKEN: "lead.taken",
  /** A lead was closed with a reason (FO-2; AG-2-80). */
  LEAD_CLOSED: "lead.closed",
  /** A closed lead was reopened (FO-2; AG-2-80). */
  LEAD_REOPENED: "lead.reopened",
  /** A lead was engaged: a prospect was made from it (FO-2b for Corporate; contracts §2.1 "lead.engaged = prospect created"). */
  LEAD_ENGAGED: "lead.engaged",
  /** A prospect's type changed, Individual ↔ Corporate, before signing (FO-2b; AG-2-76 rule 13). */
  PROSPECT_TYPE_CHANGED: "prospect.type_changed",
  /** A prospect was won (contracts §2.6; its subject part is FO-2b's `ProspectWonSubject`, contracts §7 §2.6). */
  PROSPECT_WON: "prospect.won",
  /** A person moved a prospect between open stages (FO-2 part 3; AG-2-26 rule 10). */
  PROSPECT_STAGE_MOVED: "prospect.stage_moved",
  /** A prospect was marked lost with a reason (FO-2 part 3; AG-2-44). */
  PROSPECT_LOST: "prospect.lost",
  /** A Convert to client was undone while the client was empty (FO-2 part 3; AG-2-47 rule 18). */
  PROSPECT_UNCONVERTED: "prospect.unconverted",
  /** A call was logged on a lead or a prospect (FO-2 part 4; AG-2-37a): the audit action (no outbox row yet). */
  CALL_LOGGED: "call.logged",
  /** A note was added on a lead or a prospect (FO-2 part 4): the audit action (no outbox row). */
  NOTE_ADDED: "note.added",

  /** A case closed: withdrawn, or closed by staff with a reason (case side, CS-C1a; contract v0.1 §4). */
  CASE_CLOSED: "case.closed",
  /** A closed case was reopened with a reason, back at the stage it closed from (case side, CS-C1a; AG-7-13). */
  CASE_REOPENED: "case.reopened",
  /** A government step (an IRCC letter: biometrics, medical, ...) was recorded on a case (CS-DL3 part 1). Ids only. */
  CASE_MILESTONE_RECORDED: "case.milestone_recorded",
  /** A recorded government step was cancelled (a wrong due date is cancelled and recorded again; CS-DL3 part 1). Ids only. */
  CASE_MILESTONE_CANCELLED: "case.milestone_cancelled",
  /** The case side made a client from a won prospect (FO-8; P-560; case-side contract v0.1 §4). Written last in the
   *  transaction that makes the client; module_event.subject_id is the client id. */
  CLIENT_CREATED: "client.created",
  /** A case was opened (P-560; contract v0.1 §4). FO-8 writes it on the "Open a case?" offer path, in the opening's own
   *  transaction; a direct opening does not write it yet. module_event.subject_id is the case id. */
  CASE_OPENED: "case.opened",

  /** Two front-office persons or companies were merged (front office, FO-9b; AG-2-16; contract v0.1 §3.3, §7). Written
   *  last in the merge's transaction, the caller's when the case side merges a client. */
  PERSON_MERGED: "person.merged",
  /** A front-office merge was undone (front office, FO-9b). */
  PERSON_UNMERGED: "person.unmerged",
} as const;
export type EventName = (typeof EVENT)[keyof typeof EVENT];

/** What a `firm.created` consumer needs: the outbox row's type and firm (module_event's envelope, contracts §0.5). */
export const FirmCreated = z.object({ type: z.literal(EVENT.FIRM_CREATED), firmId: z.string().uuid() });
export type FirmCreated = z.infer<typeof FirmCreated>;

/** The payload PF-4 writes for `staff.roles_changed` and `staff.deactivated`: ids only (no name, email, role words or
 *  licence; a consumer reads the person's current roles from the platform). The firm is the outbox row's firm_id. */
export const StaffEventPayload = z.object({ staffId: z.string().uuid() }).strict();
export type StaffEventPayload = z.infer<typeof StaffEventPayload>;
/** The payload PF-4b writes for `staff.joined`: ids only (the staff member and the invitation accepted). */
export const StaffJoinedPayload = z.object({ staffId: z.string().uuid(), invitationId: z.string().uuid() }).strict();
export type StaffJoinedPayload = z.infer<typeof StaffJoinedPayload>;
/** What a consumer of either staff event needs: the outbox row's type and firm, and the payload's staff id. */
export const StaffRolesChanged = z.object({ type: z.literal(EVENT.STAFF_ROLES_CHANGED), firmId: z.string().uuid(), payload: StaffEventPayload });
export type StaffRolesChanged = z.infer<typeof StaffRolesChanged>;
export const StaffDeactivated = z.object({ type: z.literal(EVENT.STAFF_DEACTIVATED), firmId: z.string().uuid(), payload: StaffEventPayload });
export type StaffDeactivated = z.infer<typeof StaffDeactivated>;

/** What a booking event carries (module_event.payload, FO-3): ids and facts, never the person's details. */
export const BookingEvent = z.object({
  key: z.string(), bookingId: z.string().uuid(), sequence: z.number().int().min(0),
  status: z.enum(["SCHEDULED", "RESCHEDULED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
  typeId: z.string().uuid(), staffId: z.string().uuid(), personId: z.string().uuid().nullable(), prospectId: z.string().uuid().nullable(),
  mode: z.enum(["VIDEO", "PHONE", "IN_PERSON"]), startsAt: z.string(), endsAt: z.string(), bookerTimeZone: z.string(),
});
export type BookingEvent = z.infer<typeof BookingEvent>;

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

/** The payload FO-5 writes for every retainer.* event: ids and facts only (no name, email or licence; a consumer reads the
 *  retainer itself). The firm is the outbox row's firm_id. */
export const RetainerEventPayload = z.object({
  retainerId: z.string().uuid(),
  kind: z.enum(["RETAINER", "CONSULTATION"]),
  prospectId: z.string().uuid().nullable(),
  version: z.number().int().min(1),
  /** Signed offline only: whether this made the prospect WON (false when it already was, or for a consultation agreement). */
  prospectWon: z.boolean().optional(),
  /** retainer.request_ended only: why the request ended (an edit made a newer version). */
  reason: z.enum(["UPDATED"]).optional(),
}).strict();
export type RetainerEventPayload = z.infer<typeof RetainerEventPayload>;

/** The payload FO-13i writes for `identity.checked`: ids, the method and the names of the corroborated details only
 *  (never the document's number, its last 4 characters, its type or country, the copy's key or a link; a consumer reads
 *  the check). The firm is the outbox row's firm_id; module_event.subject_id is the check's id. */
export const IdentityCheckedPayload = z.strictObject({
  checkId: Uuid, personId: Uuid, checkedBy: Uuid,
  method: z.enum(["IN_PERSON", "VIDEO", "DOCUMENT_COPY", "OTHER"]),
  details: z.array(z.enum(["NAME", "HOME_ADDRESS", "PHONE", "EMAIL", "BUSINESS_DETAILS"])).min(1).max(5),
  copyKept: z.boolean(),
});
export type IdentityCheckedPayload = z.infer<typeof IdentityCheckedPayload>;
/** `conflict.checked` (FO-13c): written when a check is recorded and again when one with hidden matches is confirmed.
 *  `result` is null while hidden matches wait for a confirmation; `clientAlready` is true when the prospect was already
 *  won (a conflict found after signing, s. 35(1)(c): the case side shows it, nothing ends by itself). */
export const ConflictCheckedPayload = z.strictObject({
  checkId: Uuid, prospectId: Uuid, partyKind: z.enum(["PERSON", "COMPANY"]), personId: Uuid.nullable(), companyId: Uuid.nullable(),
  result: z.enum(["NO_CONFLICT", "POTENTIAL_CONFLICT", "CONFLICT_CANNOT_ACT"]).nullable(), hiddenMatches: z.boolean(), confirmed: z.boolean(), clientAlready: z.boolean(),
});
export type ConflictCheckedPayload = z.infer<typeof ConflictCheckedPayload>;
/** The payload FO-2 writes for every lead.* event: ids and facts only (no name, email or phone; a consumer reads the lead
 *  itself). The firm is the outbox row's firm_id; module_event.subject_id is the lead's id. */
export const LeadEventPayload = z.object({
  leadId: z.string().uuid(),
  personId: z.string().uuid(),
  door: z.enum(["WEB_FORM", "MANUAL", "BOOKING"]),
  state: z.enum(["OPEN", "ENGAGED", "CLOSED"]),
  ownerStaffId: z.string().uuid().nullable(),
  /** lead.created only: the person of the firm with the same email or phone, flagged and never linked (AG-2-84). */
  possibleMatchPersonId: z.string().uuid().nullable().optional(),
  /** lead.closed only: the reason's key (AG-2-80 rule 2; its name for it). */
  closeReasonKey: z.string().optional(),
}).strict();
export type LeadEventPayload = z.infer<typeof LeadEventPayload>;

/** The payload FO-2b writes for `lead.engaged` and `prospect.type_changed`: ids and facts only (a consumer reads the
 *  prospect). module_event.subject_id is the prospect's id. */
export const ProspectEventPayload = z.strictObject({
  prospectId: Uuid, leadId: Uuid, type: z.enum(["INDIVIDUAL", "CORPORATE"]), stageKey: z.string(),
  subjectPersonId: Uuid.nullable(), subjectCompanyId: Uuid.nullable(), primaryContactPersonId: Uuid, ownerStaffId: Uuid.nullable(),
  /** prospect.type_changed only: where it came from (AG-2-76 §9). */
  fromType: z.enum(["INDIVIDUAL", "CORPORATE"]).optional(), fromStageKey: z.string().optional(),
});
export type ProspectEventPayload = z.infer<typeof ProspectEventPayload>;

/** The payload FO-2 part 3 writes for `prospect.stage_moved`, `prospect.lost` and `prospect.unconverted`: ids and keys
 *  only (never a note or a reason's words). module_event.subject_id is the prospect's id. */
export const ProspectMovePayload = z.strictObject({
  prospectId: Uuid, leadId: Uuid, type: z.enum(["INDIVIDUAL", "CORPORATE"]), fromStageKey: z.string(), stageKey: z.string(),
  ownerStaffId: Uuid.nullable(),
  /** Why it moved (contracts §2.1 "with cause"; fo_stage_move.cause): PERSON for a person's move, Mark lost and Undo convert. */
  cause: z.enum(["PERSON", "BOOKING", "RETAINER_SENT", "RETAINER_EXECUTED", "SIGNED_OFFLINE", "CONVERT", "CHANGE_TYPE"]),
  /** prospect.lost only: the reason's key (AG-2-44 rule 2). */
  lostReasonKey: z.string().optional(),
});
export type ProspectMovePayload = z.infer<typeof ProspectMovePayload>;

/** One line of a "what happened" timeline (FO-2 part 4; review D10: every reader of what happened uses this one shape,
 *  never its own). `kind` says where the line was read from: an audit line, an outbox event with no audit line of its
 *  own, a logged call or a note. `type` is the audit action, the event type, `call` or `note`; `refId` the row's id. */
export const TimelineLine = z.strictObject({
  at: z.string().datetime({ offset: true }), kind: z.enum(["AUDIT", "EVENT", "CALL", "NOTE"]), type: z.string().min(1),
  actor: z.string().nullable(), actorName: z.string().nullable(), summary: z.string(), refId: Uuid.nullable(),
});
export type TimelineLine = z.infer<typeof TimelineLine>;

/** The subject part of `prospect.won` (contracts §7 §2.6, AG-2-77 rule 2): a person, or a company with its name and its
 *  live contacts with their roles, linked and never copied (rule 7). The case side makes a person or a company client
 *  from it (FO-8). The rest of the payload (§2.6: won_via, owner, answers…) is the writer's (FO-2 part 3, FO-6). */
const WonContact = z.strictObject({
  personId: Uuid, givenNames: z.string().nullable(), familyName: z.string().nullable(), email: z.string().nullable(), phone: z.string().nullable(),
  roles: z.array(z.enum(["PRIMARY", "SIGNATORY", "HR", "BILLING", "OTHER"])).min(1), primaryContact: z.boolean(),
});
export const ProspectWonSubject = z.discriminatedUnion("subject", [
  z.strictObject({ subject: z.literal("PERSON"), personId: Uuid }),
  z.strictObject({ subject: z.literal("COMPANY"), company: z.strictObject({ id: Uuid, name: z.string().min(1) }), contacts: z.array(WonContact).min(1) }),
]);
export type ProspectWonSubject = z.infer<typeof ProspectWonSubject>;
/** The payload of `prospect.won` (contracts §2.6, P-559 (4); written by Convert in FO-2 part 3, AG-2-47 rule 16): the
 *  contract's fields, with FO-2b's subject part beside them. The person's facts travel as canonical answer keys; a field
 *  the front office does not hold is null (`person.current_residence_country` is not stored yet), never guessed. */
export const ProspectWonPayload = z.strictObject({
  firm_id: Uuid, firm_key: z.string().min(1), prospect_id: Uuid, lead_id: Uuid, won_via: z.enum(["E_SIGNED", "SIGNED_OFFLINE", "CONVERTED"]),
  retainer_id: Uuid.nullable(), representative_staff_id: Uuid.nullable(), representative_actor_id: z.string().nullable(), owner_staff_id: Uuid.nullable(),
  interested_in: z.strictObject({ serviceId: Uuid, label: z.string(), combinationId: Uuid.nullable() }).nullable(),
  answers: z.strictObject({
    "person.given_names": z.string().nullable(), "person.family_name": z.string().nullable(), "person.email": z.string().nullable(),
    "person.phone_number": z.string().nullable(), "person.current_residence_country": z.string().nullable(),
  }),
  consent_ids: z.array(Uuid), sealed_retainer_sha256: z.string().nullable(),
  /** FO-2 part 3 additions: the type, where it was won from, whether a retainer is signed ("Retainer not signed"), and FO-2b's subject part. */
  type: z.enum(["INDIVIDUAL", "CORPORATE"]), fromStageKey: z.string(), retainerSigned: z.boolean(), subject: ProspectWonSubject,
});
export type ProspectWonPayload = z.infer<typeof ProspectWonPayload>;

// CS-C1a (case-side contract v0.1 §4): the case side's close and reopen events, ids and facts only (never the reason's
// words: a reason is free text and may hold personal data; a consumer reads the case). The firm is the outbox row's
// firm_id and module_event.subject_id is the case id. clientId stays null until CS-K1 gives every case a client.
const CaseClientType = z.enum(["INDIVIDUAL", "CORPORATE"]).nullable();
/** `case.closed`: why (the contract's DECISION | WITHDRAWAL) and the close outcome. */
export const CaseClosedPayload = z.strictObject({
  caseId: Uuid, clientId: Uuid.nullable(), clientType: CaseClientType,
  reason: z.enum(["DECISION", "WITHDRAWAL"]), outcome: z.enum(["WITHDRAWN", "COMPLETED", "CLOSED_BY_STAFF"]),
  closedAt: z.iso.datetime({ offset: true }),
});
export type CaseClosedPayload = z.infer<typeof CaseClosedPayload>;
/** `case.reopened`: the stage it returned to and the outcome it was closed with. */
export const CaseReopenedPayload = z.strictObject({
  caseId: Uuid, clientId: Uuid.nullable(), clientType: CaseClientType,
  stageId: Uuid.nullable(), previousOutcome: z.enum(["WITHDRAWN", "COMPLETED", "CLOSED_BY_STAFF"]),
  reopenedAt: z.iso.datetime({ offset: true }),
});
export type CaseReopenedPayload = z.infer<typeof CaseReopenedPayload>;
/** `case.milestone_recorded` and `case.milestone_cancelled` (CS-DL3 part 1): the case and the step, ids only (never the
 *  note, the reference or a reason: a consumer reads the step). */
export const CaseMilestonePayload = z.strictObject({ caseId: Uuid, milestoneId: Uuid });
export type CaseMilestonePayload = z.infer<typeof CaseMilestonePayload>;

// FO-8 (P-560; case-side contract v0.1 §4, front-office contracts §2.6): what the case side writes back, ids and codes only
// (never a name: a consumer reads the client or the case). The firm is also the outbox row's firm_id.
/** `client.created`: the won prospect and the client made from it (client_number is the client code, CL-00001). */
export const ClientCreatedPayload = z.strictObject({ firm_id: Uuid, prospect_id: Uuid, client_id: Uuid, client_number: z.string().regex(/^CL-\d{5,}$/) });
export type ClientCreatedPayload = z.infer<typeof ClientCreatedPayload>;
/** `case.opened`: the case opened from a won prospect's offer (client_type is the Pathway's, as `case.closed` carries it). */
export const CaseOpenedPayload = z.strictObject({
  firm_id: Uuid, prospect_id: Uuid.nullable(), client_id: Uuid, case_id: Uuid, case_number: z.string().min(1), client_type: z.enum(["INDIVIDUAL", "CORPORATE"]).nullable(),
});
export type CaseOpenedPayload = z.infer<typeof CaseOpenedPayload>;

// FO-9b part 0: the person merge events, ids only (never a name, email or phone; a consumer reads the records). The firm
// is the outbox row's firm_id and module_event.subject_id is the survivor's id. `mergeRef` is PersonMergePort's merge_ref.
export const PersonMergePayload = z.strictObject({ mergeRef: Uuid, kind: z.enum(["PERSON", "COMPANY"]), survivorId: Uuid, loserId: Uuid });
export type PersonMergePayload = z.infer<typeof PersonMergePayload>;
/** What a consumer of `person.merged` or `person.unmerged` needs: the outbox row's type and firm, and the payload. */
export const PersonMerged = z.strictObject({ type: z.literal(EVENT.PERSON_MERGED), firmId: Uuid, payload: PersonMergePayload });
export type PersonMerged = z.infer<typeof PersonMerged>;
export const PersonUnmerged = z.strictObject({ type: z.literal(EVENT.PERSON_UNMERGED), firmId: Uuid, payload: PersonMergePayload });
export type PersonUnmerged = z.infer<typeof PersonUnmerged>;

// PF-18b (AG-16-63): a support ticket raised, ids only (never the ticket's words, its page or a file: a consumer reads the
// ticket). The firm is the outbox row's firm_id and module_event.subject_id is the ticket id.
export const SupportTicketRaised = z.strictObject({
  type: z.literal(EVENT.SUPPORT_TICKET_RAISED), firmId: Uuid, ticketId: Uuid, raisedBy: Uuid, files: z.number().int().min(0).max(3),
  createdAt: z.iso.datetime({ offset: true }),
});
export type SupportTicketRaised = z.infer<typeof SupportTicketRaised>;
