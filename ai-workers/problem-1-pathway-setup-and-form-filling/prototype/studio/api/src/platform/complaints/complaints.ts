// PF-21 (P-579, P-584 (8); BACKLOG row PF-21 = FO-13k rev 12's Done when; contracts §0, §7, §9): the firm's complaints
// record. A complaint made to the firm by a front-office person, a case party or another person (kind + the other
// module's id, never a foreign key into it), each handling step, the outcome and the dates; an acknowledgement reminder to
// the handler on JobPort after the Sample period (business-days.ts) for s. 29's "promptly respond"; a closed complaint
// stays readable and changes only by a new event; never deleted. Code SOR/2022-128 s. 24(3)(r), s. 29, s. 37; legal
// reading Unconfirmed: no counsel; every field, list and period Sample until the College's by-laws are read.
// Who: the permission keys agent/complaint:record (record, act on any) and agent/complaint:read (read any) — Owner and
// Admin by the row; the handler reads and acts on their own complaint without them. Anyone else gets the same 404 as for
// another firm's complaint (an id leaks nothing). Every change is one transaction: the row, its event, one AuditPort line
// (a failing audit rolls everything back), and for a new complaint the reminder job (keyed, so it never queues twice).
// The database refuses what the service refuses too (migration 20261114200000_pf21_complaints).
import { HttpException, HttpStatus } from "@nestjs/common";
import type { PlatComplaint, PlatComplaintEvent, Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { AuditPort } from "../../../../ports/audit.ts";
import type { ClockPort } from "../../../../ports/clock.ts";
import type { JobPort } from "../../../../ports/jobs.ts";
import type { MailPort } from "../../../../ports/mail.ts";
import type { StaffContext } from "../../../../ports/staff.ts";
import { firmScope } from "../firm-scope.ts";
import { BUSINESS_HOURS, CLOSED_DAYS, readSetting, TIME_ZONE } from "../settings.ts";
import { acknowledgeBy, type FirmCalendar } from "./business-days.ts";

export const COMPLAINT_KEYS = { record: "agent/complaint:record", read: "agent/complaint:read" } as const;
export const ACK_REMINDER_JOB = "platform.complaint.ack-reminder";
export const ackReminderKey = (complaintId: string) => `plat-complaint-ack:${complaintId}`;
const SYSTEM_ACTOR = "system:complaint-ack-reminder";

type Tx = Prisma.TransactionClient;
export type ComplaintDeps = { db: PrismaClient; audit: AuditPort; jobs: JobPort; clock: ClockPort; mail: MailPort };

// ------------------------------------------------------------------------------------------------------------- problems
const problem = (status: number, code: string, title: string, detail: string, extra: Record<string, unknown> = {}): never => {
  throw new HttpException({ type: `https://expatready.local/problems/${code}`, title, status, detail, code: code.toUpperCase().replace(/-/g, "_"), ...extra }, status as HttpStatus);
};
const notFound = (): never => problem(404, "not-found", "Not found", "No such complaint.");
/** Field errors, one message per field (the screen shows each at its field). */
const fieldErrors = (fields: Record<string, string>): never => problem(422, "complaint-fields", "Check the highlighted fields", "Some fields need a change.", { fields });
const closedRefused = (): never => problem(409, "complaint-closed", "This complaint is closed", "A closed complaint is not changed: add a note instead.");

// ------------------------------------------------------------------------------------------------------------- input
const TEXT_FILLED = /[^\s ​‌‍⁠﻿]/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const LINE_CONTROL = /[\n\r\t]/;
const text = (max: number, oneLine = false) => z.string().max(max, `at most ${max} characters`)
  .refine((s) => TEXT_FILLED.test(s), "write something here")
  .refine((s) => !CONTROL.test(s) && !(oneLine && LINE_CONTROL.test(s)), "remove the control characters");
const instant = z.string({ error: "a date and time is needed" }).refine((s) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(s) && Number.isFinite(Date.parse(s)), "a date and time, e.g. 2026-11-16T14:00:00Z").transform((s) => new Date(s));
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "an id").transform((s) => s.toLowerCase());

export const SUBJECT_KINDS = ["FRONT_OFFICE_PERSON", "CASE_PARTY", "OTHER_PERSON"] as const;
export const CHANNELS = ["EMAIL", "PHONE", "IN_PERSON", "LETTER", "WEB_FORM", "OTHER"] as const;
export const CATEGORIES = ["SERVICE", "FEES", "COMMUNICATION", "CONDUCT", "PRIVACY", "OTHER"] as const;
export const OUTCOMES = ["RESOLVED", "UPHELD", "NOT_UPHELD", "WITHDRAWN", "REFERRED_TO_COLLEGE"] as const;

export const RecordComplaint = z.object({
  subjectKind: z.enum(SUBJECT_KINDS, { error: "choose who made the complaint" }),
  subjectId: uuid.optional(),
  complainantName: text(200, true).optional(),
  complainantContact: text(320, true).optional(),
  receivedAt: instant,
  channel: z.enum(CHANNELS, { error: "choose how it was received" }),
  category: z.enum(CATEGORIES, { error: "choose what it is about" }),
  summary: text(4000),
  handlerStaffId: uuid,
}).strict().superRefine((v, c) => {
  if (v.subjectKind === "OTHER_PERSON") {
    if (v.subjectId) c.addIssue({ code: "custom", path: ["subjectId"], message: "another person has no record to link" });
    if (!v.complainantName) c.addIssue({ code: "custom", path: ["complainantName"], message: "the person's name is needed" });
  } else if (!v.subjectId) c.addIssue({ code: "custom", path: ["subjectId"], message: "choose the person" });
});
export type RecordComplaint = z.input<typeof RecordComplaint>;

const At = z.object({ at: instant, note: text(4000).optional() }).strict();
const Step = z.object({ kind: z.enum(["STEP", "NOTE"]), note: text(4000), at: instant.optional() }).strict();
const Handler = z.object({ handlerStaffId: uuid, note: text(4000).optional() }).strict();
const Close = z.object({ outcome: z.enum(OUTCOMES, { error: "choose the outcome" }), at: instant, note: text(4000) }).strict();
export const LIST_VIEWS = ["open", "overdue", "closed", "all"] as const;
export type ListView = (typeof LIST_VIEWS)[number];

function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const r = schema.safeParse(input ?? {});
  if (r.success) return r.data;
  const fields: Record<string, string> = {};
  for (const i of r.error.issues) { const k = i.path.length ? i.path.join(".") : (i.code === "unrecognized_keys" ? (i as { keys?: string[] }).keys?.join(",") ?? "_" : "_"); fields[k] ??= i.code === "invalid_type" && i.input === undefined ? "this is needed" : i.message; }
  return fieldErrors(fields);
}

// ------------------------------------------------------------------------------------------------------------- views
export type ComplaintView = Omit<PlatComplaint, "firmId"> & { overdue: boolean; events?: Omit<PlatComplaintEvent, "firmId" | "seq">[] };
const isOverdue = (c: PlatComplaint, now: Date) => c.status === "OPEN" && !c.acknowledgedAt && now > c.acknowledgeBy;
const view = (c: PlatComplaint, now: Date, events?: PlatComplaintEvent[]): ComplaintView => {
  const { firmId: _f, ...rest } = c;
  return { ...rest, overdue: isOverdue(c, now), ...(events ? { events: events.map(({ firmId: _ef, seq: _s, ...e }) => e) } : {}) };
};

// ------------------------------------------------------------------------------------------------------------- service
export class ComplaintsService {
  constructor(private readonly d: ComplaintDeps) {}

  private has = (ctx: StaffContext, key: string) => ctx.keys.includes(key);
  private handles = (ctx: StaffContext, c: PlatComplaint) => c.handlerStaffId === ctx.staffId.toLowerCase();
  /** Read: the read key, or the handler. */
  private canRead = (ctx: StaffContext, c: PlatComplaint) => this.has(ctx, COMPLAINT_KEYS.read) || this.handles(ctx, c);
  /** Act: someone who may read it and holds the record key, or the handler. */
  private canAct = (ctx: StaffContext, c: PlatComplaint) => this.handles(ctx, c) || (this.has(ctx, COMPLAINT_KEYS.read) && this.has(ctx, COMPLAINT_KEYS.record));
  private actor = (ctx: StaffContext) => `staff:${ctx.staffId.toLowerCase()}`;

  private async calendar(db: Tx | PrismaClient, firmId: string): Promise<FirmCalendar> {
    return {
      zone: await readSetting<string>(db, firmId, TIME_ZONE.key),
      hours: await readSetting<FirmCalendar["hours"]>(db, firmId, BUSINESS_HOURS.key),
      closedDays: await readSetting<string[]>(db, firmId, CLOSED_DAYS.key),
    };
  }

  /** The handler must be an active staff member of the firm (the foreign key proves the firm; this the state). */
  private async activeStaff(tx: Tx, firmId: string, staffId: string): Promise<boolean> {
    return !!(await tx.platformStaff.findFirst({ where: firmScope(firmId, { id: staffId, status: "ACTIVE" as const }), select: { id: true } }));
  }

  /** Locks one complaint of the firm for the rest of the transaction, or the 404 (another firm's, or none). */
  private async lock(tx: Tx, firmId: string, id: string): Promise<PlatComplaint> {
    const scope = firmScope(firmId);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound();
    await tx.$queryRaw`SELECT id FROM "plat_complaint" WHERE firm_id = ${scope.firmId}::uuid AND id = ${id.toLowerCase()}::uuid FOR UPDATE`;
    return (await tx.platComplaint.findFirst({ where: firmScope(firmId, { id: id.toLowerCase() }) })) ?? notFound();
  }

  private notFuture(fields: Record<string, Date | undefined>) {
    const now = this.d.clock.now(), bad: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) if (v && v > now) bad[k] = "this date is in the future";
    if (Object.keys(bad).length) fieldErrors(bad);
  }

  /** Records a complaint (key agent/complaint:record): the row, its RECEIVED event, one audit line and the reminder. */
  async record(ctx: StaffContext, input: unknown): Promise<ComplaintView> {
    if (!this.has(ctx, COMPLAINT_KEYS.record)) problem(403, "not-allowed", "Not allowed", "Recording a complaint needs the permission to record complaints.");
    const v = parse(RecordComplaint, input);
    this.notFuture({ receivedAt: v.receivedAt });
    const firmId = firmScope(ctx.firmId).firmId, now = this.d.clock.now();
    return this.d.db.$transaction(async (tx) => {
      if (!(await this.activeStaff(tx, firmId, v.handlerStaffId))) fieldErrors({ handlerStaffId: "choose an active staff member of your firm" });
      const due = acknowledgeBy(v.receivedAt, await this.calendar(tx, firmId));
      const c = await tx.platComplaint.create({ data: {
        firmId, subjectKind: v.subjectKind, subjectId: v.subjectId ?? null, complainantName: v.complainantName ?? null, complainantContact: v.complainantContact ?? null,
        receivedAt: v.receivedAt, channel: v.channel, category: v.category, summary: v.summary, handlerStaffId: v.handlerStaffId,
        acknowledgeBy: due, recordedBy: this.actor(ctx),
      } });
      await tx.platComplaintEvent.create({ data: { firmId, complaintId: c.id, kind: "RECEIVED", at: v.receivedAt, actor: this.actor(ctx), detail: { channel: v.channel, category: v.category, handlerStaffId: v.handlerStaffId } } });
      await this.d.audit.record(tx, { firmId, actor: this.actor(ctx), action: "complaint.record", entity: "plat_complaint", entityKey: c.id, summary: `Complaint recorded (${v.category.toLowerCase()}, by ${v.subjectKind.toLowerCase().replace(/_/g, " ")}); acknowledge by ${due.toISOString()}`, detail: { complaintId: c.id, subjectKind: v.subjectKind, subjectId: v.subjectId ?? null, handlerStaffId: v.handlerStaffId } });
      await this.d.jobs.schedule(ACK_REMINDER_JOB, due, { firmId, complaintId: c.id }, { key: ackReminderKey(c.id), firmId });
      return view(c, now);
    });
  }

  /** One complaint with its events, for a person who may read it; otherwise the same 404 as another firm's. */
  async get(ctx: StaffContext, id: string): Promise<ComplaintView> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound();
    const c = await this.d.db.platComplaint.findFirst({ where: firmScope(ctx.firmId, { id: id.toLowerCase() }) });
    if (!c || !this.canRead(ctx, c)) return notFound();
    const events = await this.d.db.platComplaintEvent.findMany({ where: firmScope(ctx.firmId, { complaintId: c.id }), orderBy: { seq: "asc" } });
    return view(c, this.d.clock.now(), events);
  }

  /** The list: open, overdue (open, not acknowledged, past its date), closed or all; a person without the read key sees
   *  only the complaints they handle. Newest received first. */
  async list(ctx: StaffContext, viewName: string = "open"): Promise<ComplaintView[]> {
    if (!(LIST_VIEWS as readonly string[]).includes(viewName)) fieldErrors({ view: `one of ${LIST_VIEWS.join(", ")}` });
    const now = this.d.clock.now(), v = viewName as ListView;
    const mine = this.has(ctx, COMPLAINT_KEYS.read) ? {} : { handlerStaffId: ctx.staffId.toLowerCase() };
    const where: Prisma.PlatComplaintWhereInput = v === "open" ? { status: "OPEN" } : v === "closed" ? { status: "CLOSED" } : v === "overdue" ? { status: "OPEN", acknowledgedAt: null, acknowledgeBy: { lt: now } } : {};
    const rows = await this.d.db.platComplaint.findMany({ where: firmScope(ctx.firmId, { ...where, ...mine }), orderBy: [{ receivedAt: "desc" }, { id: "asc" }], take: 500 });
    return rows.map((c) => view(c, now));
  }

  /** One change to an open complaint by a person who may act on it: lock, check, event, row, audit — one transaction. */
  private async change(ctx: StaffContext, id: string, act: (tx: Tx, c: PlatComplaint) => Promise<{ action: string; summary: string; detail?: Record<string, unknown>; after?: (tx: Tx) => Promise<void> }>): Promise<ComplaintView> {
    const firmId = firmScope(ctx.firmId).firmId;
    return this.d.db.$transaction(async (tx) => {
      const c = await this.lock(tx, firmId, id);
      if (!this.canRead(ctx, c)) return notFound();
      if (!this.canAct(ctx, c)) problem(403, "not-allowed", "Not allowed", "Changing a complaint needs the permission to record complaints, or being its handler.");
      const r = await act(tx, c);
      await this.d.audit.record(tx, { firmId, actor: this.actor(ctx), action: r.action, entity: "plat_complaint", entityKey: c.id, summary: r.summary, detail: { complaintId: c.id, ...(r.detail ?? {}) } });
      await r.after?.(tx);
      const now = this.d.clock.now();
      return view((await tx.platComplaint.findFirst({ where: firmScope(firmId, { id: c.id }) }))!, now);
    });
  }

  private event(tx: Tx, ctx: StaffContext, c: PlatComplaint, kind: PlatComplaintEvent["kind"], at: Date, note?: string, detail?: Record<string, unknown>) {
    return tx.platComplaintEvent.create({ data: { firmId: c.firmId, complaintId: c.id, kind, at, actor: this.actor(ctx), note: note ?? null, ...(detail ? { detail: detail as Prisma.InputJsonValue } : {}) } });
  }

  /** The complaint was acknowledged to the complainant (once); the reminder is cancelled. */
  acknowledge(ctx: StaffContext, id: string, input: unknown) {
    const v = parse(At, input);
    this.notFuture({ at: v.at });
    return this.change(ctx, id, async (tx, c) => {
      if (c.status === "CLOSED") closedRefused();
      if (c.acknowledgedAt) problem(409, "complaint-acknowledged", "Already acknowledged", "The acknowledgement is recorded once.");
      if (v.at < c.receivedAt) fieldErrors({ at: "the acknowledgement comes after the complaint was received" });
      await this.event(tx, ctx, c, "ACKNOWLEDGED", v.at, v.note);
      await tx.platComplaint.update({ where: { firmId_id: { firmId: c.firmId, id: c.id } }, data: { acknowledgedAt: v.at } });
      return { action: "complaint.acknowledge", summary: `Complaint acknowledged at ${v.at.toISOString()}`, after: () => this.d.jobs.cancel(ackReminderKey(c.id)) };
    });
  }

  /** A handling step or a note. A closed complaint takes a note only (a new event; nothing on the record changes). */
  addStep(ctx: StaffContext, id: string, input: unknown) {
    const v = parse(Step, input);
    this.notFuture({ at: v.at });
    return this.change(ctx, id, async (tx, c) => {
      if (c.status === "CLOSED" && v.kind !== "NOTE") closedRefused();
      const at = v.at ?? this.d.clock.now();
      if (at < c.receivedAt) fieldErrors({ at: "a step comes after the complaint was received" });
      await this.event(tx, ctx, c, v.kind, at, v.note);
      return { action: v.kind === "NOTE" ? "complaint.note" : "complaint.step", summary: v.kind === "NOTE" ? "Note added to a complaint" : "Handling step added to a complaint" };
    });
  }

  /** The firm's response was sent (once). */
  responseSent(ctx: StaffContext, id: string, input: unknown) {
    const v = parse(At, input);
    this.notFuture({ at: v.at });
    return this.change(ctx, id, async (tx, c) => {
      if (c.status === "CLOSED") closedRefused();
      if (c.responseSentAt) problem(409, "complaint-responded", "Response already recorded", "The response date is recorded once.");
      if (v.at < c.receivedAt) fieldErrors({ at: "the response comes after the complaint was received" });
      await this.event(tx, ctx, c, "RESPONSE_SENT", v.at, v.note);
      await tx.platComplaint.update({ where: { firmId_id: { firmId: c.firmId, id: c.id } }, data: { responseSentAt: v.at } });
      return { action: "complaint.response", summary: `Response to a complaint sent at ${v.at.toISOString()}` };
    });
  }

  /** A new handler (key agent/complaint:record only): an active staff member of the firm. */
  changeHandler(ctx: StaffContext, id: string, input: unknown) {
    const v = parse(Handler, input);
    return this.change(ctx, id, async (tx, c) => {
      if (!this.has(ctx, COMPLAINT_KEYS.record) || !this.has(ctx, COMPLAINT_KEYS.read)) problem(403, "not-allowed", "Not allowed", "Changing the handler needs the permissions to read and record complaints.");
      if (c.status === "CLOSED") closedRefused();
      if (v.handlerStaffId === c.handlerStaffId) fieldErrors({ handlerStaffId: "this person already handles it" });
      if (!(await this.activeStaff(tx, c.firmId, v.handlerStaffId))) fieldErrors({ handlerStaffId: "choose an active staff member of your firm" });
      await this.event(tx, ctx, c, "HANDLER_CHANGED", this.d.clock.now(), v.note, { from: c.handlerStaffId, to: v.handlerStaffId });
      await tx.platComplaint.update({ where: { firmId_id: { firmId: c.firmId, id: c.id } }, data: { handlerStaffId: v.handlerStaffId } });
      return { action: "complaint.handler", summary: "Complaint handler changed", detail: { from: c.handlerStaffId, to: v.handlerStaffId } };
    });
  }

  /** Closes with an outcome (once): the CLOSED event first, then the row; the reminder is cancelled. */
  close(ctx: StaffContext, id: string, input: unknown) {
    const v = parse(Close, input);
    this.notFuture({ at: v.at });
    return this.change(ctx, id, async (tx, c) => {
      if (c.status === "CLOSED") closedRefused();
      if (v.at < c.receivedAt) fieldErrors({ at: "the close comes after the complaint was received" });
      await this.event(tx, ctx, c, "CLOSED", v.at, v.note, { outcome: v.outcome });
      await tx.platComplaint.update({ where: { firmId_id: { firmId: c.firmId, id: c.id } }, data: { status: "CLOSED", outcome: v.outcome, closedAt: v.at } });
      return { action: "complaint.close", summary: `Complaint closed: ${v.outcome.toLowerCase().replace(/_/g, " ")}`, detail: { outcome: v.outcome }, after: () => this.d.jobs.cancel(ackReminderKey(c.id)) };
    });
  }

  /** Complaints are kept (map row 105's keep period) and never deleted by anyone: always refused, for every key. */
  async remove(_ctx: StaffContext, _id: string): Promise<never> {
    return problem(405, "complaint-kept", "Complaints are kept", "A complaint is never deleted. Close it with an outcome, or add a note.");
  }

  /** The reminder job (JobPort): once, to the handler, only while the complaint is open and not acknowledged. The mail
   *  names no complainant and no summary: the handler opens the record. */
  async runAckReminder(payload: unknown): Promise<"sent" | "skipped"> {
    const p = z.object({ firmId: uuid, complaintId: uuid }).safeParse(payload);
    if (!p.success) return "skipped";
    const { firmId, complaintId } = p.data;
    return this.d.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "plat_complaint" WHERE firm_id = ${firmId}::uuid AND id = ${complaintId}::uuid FOR UPDATE`;
      const c = await tx.platComplaint.findFirst({ where: firmScope(firmId, { id: complaintId }) });
      if (!c || c.status === "CLOSED" || c.acknowledgedAt) return "skipped";
      if (await tx.platComplaintEvent.findFirst({ where: firmScope(firmId, { complaintId, kind: "REMINDER_SENT" as const }), select: { id: true } })) return "skipped";
      const handler = await tx.platformStaff.findFirst({ where: firmScope(firmId, { id: c.handlerStaffId }), select: { email: true } });
      const now = this.d.clock.now();
      await tx.platComplaintEvent.create({ data: { firmId, complaintId, kind: "REMINDER_SENT", at: now, actor: SYSTEM_ACTOR, detail: { handlerStaffId: c.handlerStaffId, acknowledgeBy: c.acknowledgeBy.toISOString() } } });
      await this.d.audit.record(tx, { firmId, actor: SYSTEM_ACTOR, action: "complaint.reminder", entity: "plat_complaint", entityKey: complaintId, summary: "Acknowledgement reminder sent to the handler", detail: { complaintId, handlerStaffId: c.handlerStaffId } });
      if (handler) await this.d.mail.send({ firmId, to: handler.email, subject: "A complaint is waiting for its acknowledgement", text: `A complaint you handle was due to be acknowledged by ${c.acknowledgeBy.toISOString()}. Open it in Complaints (reference ${complaintId}) and record the acknowledgement.`, class: "TRANSACTIONAL", templateKey: "platform.complaint.ack-reminder" });
      return "sent";
    });
  }
}

/** Registers the reminder job's handler (JobPort's worker side). */
export function registerComplaintJobs(jobs: JobPort, service: ComplaintsService): void {
  jobs.handle(ACK_REMINDER_JOB, async (payload) => { await service.runAckReminder(payload); });
}
