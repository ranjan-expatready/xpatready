// PF-21 (P-579, P-584 (8); BACKLOG row PF-21 = FO-13k rev 12's Done when; contracts §0, §7, §9): the firm's complaints
// record. A complaint made to the firm by a front-office person, a case party or another person (kind + the other
// module's id, never a foreign key into it: the id is not checked here, the other module owns it), each handling step,
// the outcome and the dates; an acknowledgement reminder to the handler on JobPort after the Sample period
// (business-days.ts) for s. 29's "promptly respond"; a closed complaint stays readable and changes only by a new event;
// never deleted. Code SOR/2022-128 s. 24(3)(r), s. 29, s. 37; legal reading Unconfirmed: no counsel; every field, list
// and period Sample until the College's by-laws are read.
// Who (Lead 47 on #1753): agent/complaint:record (Owner, Admin, Case Manager) records a complaint; agent/complaint:read
// (Owner, Admin) reads every one; record + read act on any; the handler reads and handles their own (steps, response,
// close) without either key. Anyone else gets the same 404 as for another firm's complaint (an id leaks nothing).
// Every change is one transaction: the event first, then the row (the database refuses a row change without its event),
// one AuditPort line (a failing audit rolls everything back). Job and mail calls run after the commit (JobPort and
// MailPort take no transaction): a rolled-back change never cancels a reminder or sends a mail.
// Not yet here (Lead 47's answers on #1753): the module events complaint.received / complaint.closed wait for
// ports/events.ts (FO-1a, #1742); routes wait for PF-4's @PermissionKeys.
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
/** The list's page size (and its largest). */
export const PAGE = 100;

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
/** The same two lists as the migration's plat_complaint_has_text: blanks of every width, invisible format marks, fillers
 *  and direction marks do not count as text; no C0 or C1 control character. */
const BLANK = "\\u0009-\\u000d\\u0020\\u0085\\u00a0\\u00ad\\u034f\\u061c\\u115f\\u1160\\u1680\\u180e\\u2000-\\u200f\\u2028-\\u202f\\u205f-\\u2064\\u2066-\\u206f\\u2800\\u3000\\u3164\\ufe00-\\ufe0f\\ufeff\\uffa0";
const FILLED = new RegExp(`[^${BLANK}]`);
const CONTROL = new RegExp("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u0084\\u0086-\\u009f]");
const LINE_BREAK = new RegExp("[\\u0009-\\u000d\\u0085\\u2028\\u2029]");
const text = (max: number, oneLine = false) => z.string().max(max, `at most ${max} characters`)
  .refine((s) => FILLED.test(s), "write something here")
  .refine((s) => !CONTROL.test(s), "remove the control characters")
  .refine((s) => !(oneLine && LINE_BREAK.test(s)), "keep this on one line");

const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/;
/** A real calendar date and time (no 31 February, no 24:00), with its offset, from the year 2000. */
export function isInstant(s: string): boolean {
  const m = ISO.exec(s);
  if (!m) return false;
  const [y, mo, d, h, mi, se] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? "0"].map(Number);
  if (y < 2000 || mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59 || se > 59) return false;
  if (m[7] !== "Z" && (Number(m[8]) > 14 || Number(m[9]) > 59)) return false;
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDate() === d && Number.isFinite(Date.parse(s));
}
const instant = z.string({ error: "a date and time is needed" }).refine(isInstant, "a real date and time from 2000 on, e.g. 2026-11-16T14:00:00Z").transform((s) => new Date(s));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = z.string().regex(UUID, "an id").transform((s) => s.toLowerCase());

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
export type ComplaintPage = { items: ComplaintView[]; next: string | null };
const isOverdue = (c: PlatComplaint, now: Date) => c.status === "OPEN" && !c.acknowledgedAt && now > c.acknowledgeBy;
const view = (c: PlatComplaint, now: Date, events?: PlatComplaintEvent[]): ComplaintView => {
  const { firmId: _f, ...rest } = c;
  return { ...rest, overdue: isOverdue(c, now), ...(events ? { events: events.map(({ firmId: _ef, seq: _s, ...e }) => e) } : {}) };
};
/** A list cursor: the last row's sort date and id, opaque to the caller. */
const cursorOf = (at: Date, id: string) => Buffer.from(`${at.toISOString()}|${id}`).toString("base64url");
function readCursor(s: string): { at: Date; id: string } {
  const [at, id] = Buffer.from(s, "base64url").toString("utf8").split("|");
  if (!at || !id || !UUID.test(id) || !isInstant(at)) return fieldErrors({ cursor: "start the list again" });
  return { at: new Date(at), id };
}

/** Work to run after the transaction commits (job and mail calls). */
type After = (() => Promise<void>)[];

// ------------------------------------------------------------------------------------------------------------- service
export class ComplaintsService {
  constructor(private readonly d: ComplaintDeps) {}

  private has = (ctx: StaffContext, key: string) => ctx.keys.includes(key);
  private handles = (ctx: StaffContext, c: PlatComplaint) => c.handlerStaffId === ctx.staffId.toLowerCase();
  /** Read: the read key, or the handler. */
  private canRead = (ctx: StaffContext, c: PlatComplaint) => this.has(ctx, COMPLAINT_KEYS.read) || this.handles(ctx, c);
  /** Act: the handler, or someone who holds both keys. */
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

  /** Locks one complaint of the firm for the rest of the transaction, or the 404 (another firm's, none, or not an id). */
  private async lock(tx: Tx, firmId: string, id: string): Promise<PlatComplaint> {
    if (typeof id !== "string" || !UUID.test(id)) return notFound();
    const scope = firmScope(firmId), key = id.toLowerCase();
    await tx.$queryRaw`SELECT id FROM "plat_complaint" WHERE firm_id = ${scope.firmId}::uuid AND id = ${key}::uuid FOR UPDATE`;
    return (await tx.platComplaint.findFirst({ where: firmScope(firmId, { id: key }) })) ?? notFound();
  }

  private notFuture(fields: Record<string, Date | undefined>) {
    const now = this.d.clock.now(), bad: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) if (v && v > now) bad[k] = "this date is in the future";
    if (Object.keys(bad).length) fieldErrors(bad);
  }

  /** Runs a transaction, then (only once it committed) its after-commit work. */
  private async commit<T>(work: (tx: Tx, after: After) => Promise<T>): Promise<T> {
    const after: After = [];
    const out = await this.d.db.$transaction((tx) => work(tx, after));
    for (const f of after) await f();
    return out;
  }

  /** Records a complaint (key agent/complaint:record): the RECEIVED event, the row, one audit line; after the commit,
   *  the reminder job (keyed by the complaint, so it never queues twice). */
  async record(ctx: StaffContext, input: unknown): Promise<ComplaintView> {
    if (!this.has(ctx, COMPLAINT_KEYS.record)) problem(403, "not-allowed", "Not allowed", "Recording a complaint needs the permission to record complaints.");
    const v = parse(RecordComplaint, input);
    this.notFuture({ receivedAt: v.receivedAt });
    const firmId = firmScope(ctx.firmId).firmId, now = this.d.clock.now();
    return this.commit(async (tx, after) => {
      if (!(await this.activeStaff(tx, firmId, v.handlerStaffId))) fieldErrors({ handlerStaffId: "choose an active staff member of your firm" });
      const due = acknowledgeBy(v.receivedAt, await this.calendar(tx, firmId));
      const c = await tx.platComplaint.create({ data: {
        firmId, subjectKind: v.subjectKind, subjectId: v.subjectId ?? null, complainantName: v.complainantName ?? null, complainantContact: v.complainantContact ?? null,
        receivedAt: v.receivedAt, channel: v.channel, category: v.category, summary: v.summary, handlerStaffId: v.handlerStaffId,
        acknowledgeBy: due, recordedBy: this.actor(ctx),
      } });
      await tx.platComplaintEvent.create({ data: { firmId, complaintId: c.id, kind: "RECEIVED", at: v.receivedAt, actor: this.actor(ctx), detail: { channel: v.channel, category: v.category, handlerStaffId: v.handlerStaffId } } });
      await this.d.audit.record(tx, { firmId, actor: this.actor(ctx), action: "complaint.record", entity: "plat_complaint", entityKey: c.id, summary: `Complaint recorded (${v.category.toLowerCase()}, by ${v.subjectKind.toLowerCase().replace(/_/g, " ")}); acknowledge by ${due.toISOString()}`, detail: { complaintId: c.id, subjectKind: v.subjectKind, subjectId: v.subjectId ?? null, handlerStaffId: v.handlerStaffId } });
      after.push(() => this.d.jobs.schedule(ACK_REMINDER_JOB, due, { firmId, complaintId: c.id }, { key: ackReminderKey(c.id), firmId }));
      return view(c, now);
    });
  }

  /** One complaint with its events in order, for a person who may read it; otherwise the same 404 as another firm's. */
  async get(ctx: StaffContext, id: string): Promise<ComplaintView> {
    if (typeof id !== "string" || !UUID.test(id)) return notFound();
    const c = await this.d.db.platComplaint.findFirst({ where: firmScope(ctx.firmId, { id: id.toLowerCase() }) });
    if (!c || !this.canRead(ctx, c)) return notFound();
    const events = await this.d.db.platComplaintEvent.findMany({ where: firmScope(ctx.firmId, { complaintId: c.id }), orderBy: { seq: "asc" } });
    return view(c, this.d.clock.now(), events);
  }

  /** The list, a page at a time (`next` is the cursor of the next page, null at the end): open, closed or all newest
   *  received first; overdue (open, not acknowledged, past its date) the longest overdue first. A person without the
   *  read key sees only the complaints they handle. */
  async list(ctx: StaffContext, viewName: string = "open", page: { cursor?: string; limit?: number } = {}): Promise<ComplaintPage> {
    if (!(LIST_VIEWS as readonly string[]).includes(viewName)) fieldErrors({ view: `one of ${LIST_VIEWS.join(", ")}` });
    const limit = page.limit ?? PAGE;
    if (!Number.isInteger(limit) || limit < 1 || limit > PAGE) fieldErrors({ limit: `a whole number from 1 to ${PAGE}` });
    const now = this.d.clock.now(), v = viewName as ListView, byDue = v === "overdue";
    const mine = this.has(ctx, COMPLAINT_KEYS.read) ? {} : { handlerStaffId: ctx.staffId.toLowerCase() };
    const where: Prisma.PlatComplaintWhereInput = v === "open" ? { status: "OPEN" } : v === "closed" ? { status: "CLOSED" } : byDue ? { status: "OPEN", acknowledgedAt: null, acknowledgeBy: { lt: now } } : {};
    const cur = page.cursor ? readCursor(page.cursor) : null;
    const after: Prisma.PlatComplaintWhereInput = !cur ? {} : byDue
      ? { OR: [{ acknowledgeBy: { gt: cur.at } }, { acknowledgeBy: cur.at, id: { gt: cur.id } }] }
      : { OR: [{ receivedAt: { lt: cur.at } }, { receivedAt: cur.at, id: { gt: cur.id } }] };
    const rows = await this.d.db.platComplaint.findMany({
      where: firmScope(ctx.firmId, { AND: [where, mine, after] }),
      orderBy: byDue ? [{ acknowledgeBy: "asc" }, { id: "asc" }] : [{ receivedAt: "desc" }, { id: "asc" }],
      take: limit + 1,
    });
    const items = rows.slice(0, limit), last = items.at(-1);
    return { items: items.map((c) => view(c, now)), next: rows.length > limit && last ? cursorOf(byDue ? last.acknowledgeBy : last.receivedAt, last.id) : null };
  }

  /** One change to a complaint by a person who may act on it: lock, check, event, row, audit — one transaction; its
   *  after-commit work (a job cancel) only once it committed. */
  private change(ctx: StaffContext, id: string, act: (tx: Tx, c: PlatComplaint, after: After) => Promise<{ action: string; summary: string; detail?: Record<string, unknown> }>): Promise<ComplaintView> {
    const firmId = firmScope(ctx.firmId).firmId;
    return this.commit(async (tx, after) => {
      const c = await this.lock(tx, firmId, id);
      if (!this.canRead(ctx, c)) return notFound();
      if (!this.canAct(ctx, c)) problem(403, "not-allowed", "Not allowed", "Changing a complaint needs the permissions to read and record complaints, or being its handler.");
      const r = await act(tx, c, after);
      await this.d.audit.record(tx, { firmId, actor: this.actor(ctx), action: r.action, entity: "plat_complaint", entityKey: c.id, summary: r.summary, detail: { complaintId: c.id, ...(r.detail ?? {}) } });
      return view((await tx.platComplaint.findFirst({ where: firmScope(firmId, { id: c.id }) }))!, this.d.clock.now());
    });
  }

  private event(tx: Tx, ctx: StaffContext, c: PlatComplaint, kind: PlatComplaintEvent["kind"], at: Date, note?: string, detail?: Record<string, unknown>) {
    return tx.platComplaintEvent.create({ data: { firmId: c.firmId, complaintId: c.id, kind, at, actor: this.actor(ctx), note: note ?? null, ...(detail ? { detail: detail as Prisma.InputJsonValue } : {}) } });
  }
  private where = (c: PlatComplaint) => ({ firmId_id: { firmId: c.firmId, id: c.id } });

  /** The complaint was acknowledged to the complainant (once, no later than the response); the reminder is cancelled
   *  after the commit. */
  acknowledge(ctx: StaffContext, id: string, input: unknown) {
    const v = parse(At, input);
    this.notFuture({ at: v.at });
    return this.change(ctx, id, async (tx, c, after) => {
      if (c.status === "CLOSED") closedRefused();
      if (c.acknowledgedAt) problem(409, "complaint-acknowledged", "Already acknowledged", "The acknowledgement is recorded once.");
      if (v.at < c.receivedAt) fieldErrors({ at: "the acknowledgement comes after the complaint was received" });
      if (c.responseSentAt && v.at > c.responseSentAt) fieldErrors({ at: "the acknowledgement comes no later than the response" });
      await this.event(tx, ctx, c, "ACKNOWLEDGED", v.at, v.note);
      await tx.platComplaint.update({ where: this.where(c), data: { acknowledgedAt: v.at } });
      after.push(() => this.d.jobs.cancel(ackReminderKey(c.id)));
      return { action: "complaint.acknowledge", summary: `Complaint acknowledged at ${v.at.toISOString()}` };
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

  /** The firm's response was sent (once, no earlier than the acknowledgement). */
  responseSent(ctx: StaffContext, id: string, input: unknown) {
    const v = parse(At, input);
    this.notFuture({ at: v.at });
    return this.change(ctx, id, async (tx, c) => {
      if (c.status === "CLOSED") closedRefused();
      if (c.responseSentAt) problem(409, "complaint-responded", "Response already recorded", "The response date is recorded once.");
      if (v.at < (c.acknowledgedAt ?? c.receivedAt)) fieldErrors({ at: c.acknowledgedAt ? "the response comes after the acknowledgement" : "the response comes after the complaint was received" });
      await this.event(tx, ctx, c, "RESPONSE_SENT", v.at, v.note);
      await tx.platComplaint.update({ where: this.where(c), data: { responseSentAt: v.at } });
      return { action: "complaint.response", summary: `Response to a complaint sent at ${v.at.toISOString()}` };
    });
  }

  /** A new handler (both keys): an active staff member of the firm. */
  changeHandler(ctx: StaffContext, id: string, input: unknown) {
    const v = parse(Handler, input);
    return this.change(ctx, id, async (tx, c) => {
      if (!this.has(ctx, COMPLAINT_KEYS.record) || !this.has(ctx, COMPLAINT_KEYS.read)) problem(403, "not-allowed", "Not allowed", "Changing the handler needs the permissions to read and record complaints.");
      if (c.status === "CLOSED") closedRefused();
      if (v.handlerStaffId === c.handlerStaffId) fieldErrors({ handlerStaffId: "this person already handles it" });
      if (!(await this.activeStaff(tx, c.firmId, v.handlerStaffId))) fieldErrors({ handlerStaffId: "choose an active staff member of your firm" });
      await this.event(tx, ctx, c, "HANDLER_CHANGED", this.d.clock.now(), v.note, { from: c.handlerStaffId, to: v.handlerStaffId });
      await tx.platComplaint.update({ where: this.where(c), data: { handlerStaffId: v.handlerStaffId } });
      return { action: "complaint.handler", summary: "Complaint handler changed", detail: { from: c.handlerStaffId, to: v.handlerStaffId } };
    });
  }

  /** Closes with an outcome (once, no earlier than the acknowledgement and the response): the CLOSED event first, then
   *  the row; the reminder is cancelled after the commit. */
  close(ctx: StaffContext, id: string, input: unknown) {
    const v = parse(Close, input);
    this.notFuture({ at: v.at });
    return this.change(ctx, id, async (tx, c, after) => {
      if (c.status === "CLOSED") closedRefused();
      const floor = [c.receivedAt, c.acknowledgedAt, c.responseSentAt].filter((d): d is Date => !!d).reduce((a, b) => (b > a ? b : a));
      if (v.at < floor) fieldErrors({ at: "the close comes after the complaint was received, acknowledged and answered" });
      await this.event(tx, ctx, c, "CLOSED", v.at, v.note, { outcome: v.outcome });
      await tx.platComplaint.update({ where: this.where(c), data: { status: "CLOSED", outcome: v.outcome, closedAt: v.at } });
      after.push(() => this.d.jobs.cancel(ackReminderKey(c.id)));
      return { action: "complaint.close", summary: `Complaint closed: ${v.outcome.toLowerCase().replace(/_/g, " ")}`, detail: { outcome: v.outcome } };
    });
  }

  /** Complaints are kept (map row 105's keep period) and never deleted by anyone: always refused, for every key. */
  async remove(_ctx: StaffContext, _id: string): Promise<never> {
    return problem(405, "complaint-kept", "Complaints are kept", "A complaint is never deleted. Close it with an outcome, or add a note.");
  }

  /** The reminder job (JobPort): once, only while the complaint is open and not acknowledged, to the handler, or to the
   *  firm's active Owners and Admins when the handler is no longer active. The mail names no complainant and no summary
   *  (the handler opens the record) and gives the date in the firm's zone; it is sent after the commit, so a rolled-back
   *  run sends nothing (the job runs again). */
  async runAckReminder(payload: unknown): Promise<"sent" | "skipped"> {
    const p = z.object({ firmId: uuid, complaintId: uuid }).safeParse(payload);
    if (!p.success) return "skipped";
    const { firmId, complaintId } = p.data;
    let mails: { to: string; text: string; replyTo?: string }[] = [];
    const out = await this.commit(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "plat_complaint" WHERE firm_id = ${firmId}::uuid AND id = ${complaintId}::uuid FOR UPDATE`;
      const c = await tx.platComplaint.findFirst({ where: firmScope(firmId, { id: complaintId }) });
      if (!c || c.status === "CLOSED" || c.acknowledgedAt) return "skipped" as const;
      if (await tx.platComplaintEvent.findFirst({ where: firmScope(firmId, { complaintId, kind: "REMINDER_SENT" as const }), select: { id: true } })) return "skipped" as const;
      const handler = await tx.platformStaff.findFirst({ where: firmScope(firmId, { id: c.handlerStaffId, status: "ACTIVE" as const }), select: { email: true } });
      const to = handler ? [handler.email] : (await tx.platformStaff.findMany({
        where: firmScope(firmId, { status: "ACTIVE" as const, grants: { some: { role: { in: ["OWNER", "ADMIN"] as ("OWNER" | "ADMIN")[] }, endedAt: null } } }), select: { email: true }, orderBy: { email: "asc" },
      })).map((s) => s.email);
      const firm = await tx.platformFirm.findFirst({ where: { id: firmScope(firmId).firmId }, select: { contactEmail: true } });
      const zone = await readSetting<string>(tx, firmId, TIME_ZONE.key);
      const due = new Intl.DateTimeFormat("en-CA", { timeZone: zone, dateStyle: "long", timeStyle: "short" }).format(c.acknowledgeBy);
      const now = this.d.clock.now();
      await tx.platComplaintEvent.create({ data: { firmId, complaintId, kind: "REMINDER_SENT", at: now, actor: SYSTEM_ACTOR, detail: { handlerStaffId: c.handlerStaffId, handlerActive: !!handler, recipients: to.length } } });
      await this.d.audit.record(tx, { firmId, actor: SYSTEM_ACTOR, action: "complaint.reminder", entity: "plat_complaint", entityKey: complaintId, summary: handler ? "Acknowledgement reminder sent to the handler" : "Acknowledgement reminder sent to the firm's Owners and Admins (the handler is not active)", detail: { complaintId, handlerStaffId: c.handlerStaffId, recipients: to.length } });
      const text = handler
        ? `A complaint you handle was due to be acknowledged by ${due} (${zone}). Open it in Complaints (reference ${complaintId}) and record the acknowledgement.`
        : `A complaint was due to be acknowledged by ${due} (${zone}), and its handler is no longer active. Open it in Complaints (reference ${complaintId}), choose a new handler and record the acknowledgement.`;
      mails = to.map((t) => ({ to: t, text, replyTo: firm?.contactEmail }));
      return "sent" as const;
    });
    for (const m of mails) await this.d.mail.send({ firmId, to: m.to, ...(m.replyTo ? { replyTo: m.replyTo } : {}), subject: "A complaint is waiting for its acknowledgement", text: m.text, class: "TRANSACTIONAL", templateKey: "platform.complaint.ack-reminder" });
    return out;
  }
}

/** Registers the reminder job's handler with the job worker. PF-0p's brief names no handler call on JobPort; this one
 *  line follows whatever PF-0p and PF-14 settle (the builder adapts it when PF-0p merges). */
export function registerComplaintJobs(jobs: JobPort, service: ComplaintsService): void {
  jobs.handle(ACK_REMINDER_JOB, async (payload) => { await service.runAckReminder(payload); });
}
