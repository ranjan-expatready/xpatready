// FO-3 (BACKLOG row FO-3; contracts §2.2 and §7 §2.2; AG-04 v2.1: AG-4-1..7, -11, -12, -14, -16..-19, -22, -25..-27,
// -29, -32, -34, -36..-39, -47, -53, -62, -63, -67; AG-02 AG-2-10, -26): the booking service. Public door first: a person
// books a free consultation from the firm's page and reschedules or cancels by the link in their email; staff create,
// reschedule, cancel and answer attendance through the same rules (routes wired once PF-4's guard is on main; until then
// these take PF-0p's StaffContext as an argument).
// Every change is one transaction: the booking row (FO-1b's database keeps sequence, the padded range, the no-overlap rule
// and token voiding), the arrival path for a new booking (ArrivalPort, keyed booking:<id>), a self-service token, one
// audit line through AuditPort.record(tx, …) and the outbox row (module_event) last. Mail and jobs run after the commit
// and never undo it (AG-4-34: a failed email or job never loses a booking). Reminders 24 h and 1 h before, and the
// attendance question 30 min after the end, are jobs on JobPort; a person answers the question, nothing marks a no-show
// by itself (AG-4-39). No money is taken at booking (card at booking is held, map row 44).
import { HttpException, HttpStatus } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { ArrivalPort } from "../../../../ports/arrival.ts";
import type { AuditPort } from "../../../../ports/audit.ts";
import type { ClockPort } from "../../../../ports/clock.ts";
import { EVENT } from "../../../../ports/events.ts";
import type { JobPort, JobRun } from "../../../../ports/jobs.ts";
import type { MailPort } from "../../../../ports/mail.ts";
import type { StaffContext } from "../../../../ports/staff.ts";
import { firmScope, notInFirm } from "../../platform/firm-scope.ts";
import { CLOSED_DAYS, readSetting, TIME_ZONE } from "../../platform/settings.ts";
import { bookingIcs, type InviteMethod } from "./ics.ts";
import { computeSlots, type HostWindow, type Range, type Slot } from "./slots.ts";
import { issueToken, liveToken } from "./tokens.ts";

type Tx = Prisma.TransactionClient;
type Status = "SCHEDULED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
type Mode = "VIDEO" | "PHONE" | "IN_PERSON";
const ACTIVE: Status[] = ["SCHEDULED", "RESCHEDULED"];
const MIN = 60_000, DAY = 24 * 60 * MIN;
/** A booking's transaction waits up to 10 s for a connection: writers of one busy slot queue on the no-overlap rule, and
 *  the 409 they end with is better than a pool time-out (P-562: sized for about 100 firms). */
const TX = { maxWait: 10_000, timeout: 20_000 };

export type BookingPorts = {
  audit: AuditPort<Tx>; clock: ClockPort; jobs: JobPort; mail: MailPort; arrival: ArrivalPort<Tx>;
  /** Where the public pages live (the firm's address once PF-25 lands): the self-service link is `<base>/book/<firm>/manage#<token>`. */
  publicBaseUrl: string;
  /** Public-door limits (contracts §0.6): requests per IP and per firm in a rolling window. */
  limits?: Partial<Limits>;
  /** The key that signs the form's load stamp (minimum fill time); random per process when absent. */
  formKey?: Buffer;
  /** Where after-commit failures are told (never thrown). */
  warn?: (msg: string) => void;
};
type Limits = { slotsPerIp: number; bookPerIp: number; bookPerFirm: number; tokenPerIp: number; windowMinutes: number; minFillSeconds: number };
const LIMITS: Limits = { slotsPerIp: 120, bookPerIp: 10, bookPerFirm: 200, tokenPerIp: 30, windowMinutes: 10, minFillSeconds: 3 };

// ------------------------------------------------------------------------------------------------------------- problems
const problem = (status: number, slug: string, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${slug}`, title, status, detail, ...extra }, status);
/** The one answer for an unknown firm, an unknown or inactive type, and a bad, used, voided or expired link (AG-4-17, -21
 *  rule 3; AG-4-36): nothing in it tells which. */
export const notFound = () => problem(404, "not-found", "Not found", "This booking page or link is not available.");
const refused = (detail: string, issues: string[] = []) => problem(400, "booking-refused", "Not booked", detail, issues.length ? { issues } : {});
const slotTaken = (slots: PublicSlot[]) => problem(409, "slot-taken", "That time was just taken", "Someone else booked that time a moment ago. Please choose another time.", { code: "SLOT_TAKEN", slots });
const tooLate = () => problem(409, "too-close-to-meeting", "Too close to the meeting", "Your meeting starts soon, so it can no longer be changed here. Please reply to your confirmation email or call the firm.", { code: "SELF_SERVICE_CLOSED" });
const forbidden = (key: string) => problem(403, "forbidden", "Not allowed", `This needs the permission ${key}.`);
const tooMany = () => problem(429, "too-many-requests", "Too many requests", "Please wait a few minutes and try again.");

// -------------------------------------------------------------------------------------------------------------- inputs
const ZONE_NAME = /^(UTC|[A-Z][A-Za-z]+(\/[A-Z0-9][A-Za-z0-9_+-]*)+)$/;
export const isZone = (s: string) => { if (!ZONE_NAME.test(s)) return false; try { new Intl.DateTimeFormat("en-CA", { timeZone: s }); return true; } catch { return false; } };
const Zone = z.string().max(64).refine(isZone, "an IANA time zone, e.g. America/Toronto");
const Instant = z.iso.datetime({ offset: true }).transform((s) => new Date(s));
const Name = z.string().trim().min(1, "required").max(100);
const MODES = ["VIDEO", "PHONE", "IN_PERSON"] as const;

export const PublicBookingBody = z.strictObject({
  givenNames: Name,
  familyName: Name,
  email: z.email().max(254),
  phone: z.string().trim().transform((p) => p.replace(/[\s.()-]/g, "")).pipe(z.string().regex(/^\+[1-9][0-9]{6,14}$/, "a phone number with its country code, e.g. +1 416 555 0100")).optional(),
  mode: z.enum(MODES),
  startsAt: Instant,
  timeZone: Zone,
  consent: z.literal(true, "Please tick the box to agree."),
  consentWordingId: z.uuid(),
  /** The honeypot: people leave it empty (AG-4-20 rule 3). */
  website: z.string().max(200).optional(),
  /** The stamp the slots answer gave when the form was drawn (minimum fill time). */
  formStamp: z.string().max(200),
});
export const StaffBookingBody = z.strictObject({
  typeId: z.uuid(), personId: z.uuid(), prospectId: z.uuid().optional(), mode: z.enum(MODES), startsAt: Instant, timeZone: Zone,
});
export const RescheduleBody = z.strictObject({ startsAt: Instant, timeZone: Zone.optional() });
export const SlotsQuery = z.object({ from: Instant.optional(), to: Instant.optional(), tz: Zone.optional() });

const parse = <T extends z.ZodType>(schema: T, body: unknown): z.output<T> => {
  const r = schema.safeParse(body ?? {});
  if (!r.success) throw refused("Please check the highlighted details.", r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`));
  return r.data;
};

export type PublicSlot = { startsAt: string; endsAt: string; label: string };
type TypeRow = Awaited<ReturnType<Tx["foConsultationType"]["findFirstOrThrow"]>>;
type BookingRow = Awaited<ReturnType<Tx["foBooking"]["findFirstOrThrow"]>>;
type Actor = { word: string; staffId?: string };
type AfterCommit = { booking: BookingRow; type: TypeRow; method: InviteMethod; kind: "booked" | "moved" | "cancelled"; token?: string; oldSequence?: number };

/** A wall time in a zone for people: "Sunday, November 1, 2026 at 1:30 a.m. (America/Toronto)". */
export const wallLabel = (at: Date, zone: string) => `${new Intl.DateTimeFormat("en-CA", { timeZone: zone, dateStyle: "full", timeStyle: "short" }).format(at)} (${zone})`;
const MODE_WORDS: Record<Mode, string> = { VIDEO: "Video call", PHONE: "Phone call", IN_PERSON: "In person" };

export class BookingService {
  private readonly limits: Limits;
  private readonly formKey: Buffer;
  private readonly hits = new Map<string, number[]>();
  private readonly warn: (msg: string) => void;

  constructor(private readonly db: PrismaClient, private readonly ports: BookingPorts) {
    this.limits = { ...LIMITS, ...ports.limits };
    this.formKey = ports.formKey ?? randomBytes(32);
    this.warn = ports.warn ?? ((m) => console.warn(`[booking] ${m}`));
  }

  /** The job workers: the reminders and the attendance question. Call once at start-up. */
  async registerJobs(): Promise<void> {
    await this.ports.jobs.handle("booking.reminder", (job) => this.runReminder(job));
    await this.ports.jobs.handle("booking.attendance_ask", (job) => this.runAttendanceAsk(job));
  }

  // ================================================================================================== the public door
  /** The type a public page names: an ACTIVE or TRIAL firm's active free-consultation type, by slug; else the one 404. */
  private async publicType(db: Tx | PrismaClient, firmKey: unknown, slug: unknown) {
    if (typeof firmKey !== "string" || typeof slug !== "string" || firmKey.length > 80 || slug.length > 80) throw notFound();
    const firm = await db.platformFirm.findUnique({ where: { key: firmKey }, select: { id: true, key: true, status: true, operatingName: true, contactEmail: true } });
    if (!firm || !["ACTIVE", "TRIAL"].includes(firm.status)) throw notFound();
    const type = await db.foConsultationType.findFirst({ where: firmScope(firm.id, { slug, active: true, purpose: "FREE_CONSULT" as const }) });
    if (!type) throw notFound();
    return { firm, type };
  }

  /** GET slots: the type's page data, the free start times in [from, to) shown in the visitor's zone, the firm's consent
   *  sentence and the form's load stamp. Hosts are never named. */
  async publicSlots(firmKey: string, slug: string, query: unknown, ip: string) {
    this.limit(`slots:ip:${ip}`, this.limits.slotsPerIp);
    const { firm, type } = await this.publicType(this.db, firmKey, slug);
    const q = parse(SlotsQuery, query);
    const firmZone = await readSetting<string>(this.db, firm.id, TIME_ZONE.key);
    const tz = q.tz ?? firmZone;
    const now = this.ports.clock.now();
    const from = q.from ?? now, to = q.to ?? new Date(from.getTime() + 14 * DAY);
    if (!(from < to) || to.getTime() - from.getTime() > 62 * DAY) throw refused("Ask for at most 62 days of times, from before to.");
    const slots = await this.slotsFor(this.db, firm.id, type, from, to);
    const consent = await this.ports.arrival.bookingConsentWording(this.db as unknown as Tx, firm.id);
    return {
      firm: { name: firm.operatingName },
      type: { name: type.name, minutes: type.minutes, modes: type.modes, phoneNeededFor: ["PHONE"], meetingLink: null },
      timeZone: tz,
      consent: consent ? { wordingId: consent.wordingId, text: consent.text } : null,
      slots: slots.map((s) => this.publicSlot(s, tz)),
      formStamp: this.stamp(firm.id, now),
    };
  }

  /** POST a booking from the public page. */
  async publicBook(firmKey: string, slug: string, body: unknown, ip: string) {
    this.limit(`book:ip:${ip}`, this.limits.bookPerIp);
    const { firm, type } = await this.publicType(this.db, firmKey, slug);
    this.limit(`book:firm:${firm.id}`, this.limits.bookPerFirm);
    const b = parse(PublicBookingBody, body);
    if (b.website) throw refused("We could not take this booking. Please try again.");
    this.checkStamp(firm.id, b.formStamp);
    if (!type.modes.includes(b.mode)) throw refused("Please choose one of the ways to meet offered.", ["mode: not offered for this consultation"]);
    if (b.mode === "PHONE" && !b.phone) throw refused("Please give a phone number for a phone call.", ["phone: required for a phone call"]);
    const wording = await this.ports.arrival.bookingConsentWording(this.db as unknown as Tx, firm.id);
    if (!wording) throw notFound();
    if (wording.wordingId.toLowerCase() !== b.consentWordingId.toLowerCase()) throw problem(409, "consent-wording-changed", "Please reload", "The firm's agreement text has changed. Please reload the page and tick the box again.");
    const person = { givenNames: b.givenNames, familyName: b.familyName, email: b.email, ...(b.phone ? { phone: b.phone } : {}) };
    const out = await this.create(firm.id, type, { startsAt: b.startsAt, mode: b.mode, timeZone: b.timeZone }, { word: "system:booking-page" },
      async (tx, bookingId) => this.ports.arrival.bookingArrived(tx, { firmId: firm.id, person, consent: { wordingId: wording.wordingId, givenAt: this.ports.clock.now() }, bookingId }));
    return out;
  }

  /** GET the self-service view by token: what, when, and whether it can still be changed here. */
  async manageView(token: string, ip: string) {
    this.limit(`token:ip:${ip}`, this.limits.tokenPerIp);
    const { booking, type } = await this.byToken(this.db, token);
    const open = this.selfServiceOpen(booking, type);
    return {
      status: booking.status, typeName: type.name, mode: booking.mode, startsAt: booking.startsAt.toISOString(), endsAt: booking.endsAt.toISOString(),
      timeZone: booking.visitorTimeZone, label: wallLabel(booking.startsAt, booking.visitorTimeZone),
      canChange: open, message: open ? null : "Your meeting starts soon, so it can no longer be changed here. Please reply to your confirmation email or call the firm.",
    };
  }

  /** GET the times a self-service reschedule may move to (the same type's slots; the booking's own time is free to it). */
  async manageSlots(token: string, query: unknown, ip: string) {
    this.limit(`token:ip:${ip}`, this.limits.tokenPerIp);
    const { booking, type } = await this.byToken(this.db, token);
    if (!this.selfServiceOpen(booking, type)) throw tooLate();
    const q = parse(SlotsQuery, query);
    const now = this.ports.clock.now(), from = q.from ?? now, to = q.to ?? new Date(from.getTime() + 14 * DAY);
    if (!(from < to) || to.getTime() - from.getTime() > 62 * DAY) throw refused("Ask for at most 62 days of times, from before to.");
    const tz = q.tz ?? booking.visitorTimeZone;
    return { timeZone: tz, slots: (await this.slotsFor(this.db, booking.firmId, type, from, to, booking.id)).map((s) => this.publicSlot(s, tz)) };
  }

  async selfReschedule(token: string, body: unknown, ip: string) {
    this.limit(`token:ip:${ip}`, this.limits.tokenPerIp);
    const b = parse(RescheduleBody, body);
    const { booking } = await this.byToken(this.db, token);
    return this.move(booking.firmId, booking.id, b.startsAt, b.timeZone, { word: "system:booking-link" }, token);
  }

  async selfCancel(token: string, ip: string) {
    this.limit(`token:ip:${ip}`, this.limits.tokenPerIp);
    const { booking } = await this.byToken(this.db, token);
    return this.cancelBooking(booking.firmId, booking.id, { word: "system:booking-link" }, token);
  }

  // ========================================================================================= staff (services until PF-4)
  async staffCreate(ctx: StaffContext, body: unknown) {
    need(ctx, "agent/booking:create");
    const b = parse(StaffBookingBody, body);
    const type = await this.db.foConsultationType.findFirst({ where: firmScope(ctx.firmId, { id: b.typeId, active: true }) });
    if (!type) throw notInFirm("consultation type");
    if (!type.modes.includes(b.mode)) throw refused("Please choose one of the ways to meet offered.", ["mode: not offered for this consultation"]);
    const contact = await this.ports.arrival.contactOf(this.db as unknown as Tx, ctx.firmId, b.personId);
    if (!contact) throw notInFirm("person");
    return this.create(ctx.firmId, type, { startsAt: b.startsAt, mode: b.mode, timeZone: b.timeZone }, staffActor(ctx),
      async () => ({ personId: b.personId, ...(b.prospectId ? { prospectId: b.prospectId } : {}) }));
  }

  async staffReschedule(ctx: StaffContext, bookingId: string, body: unknown) {
    need(ctx, "agent/booking:edit");
    const b = parse(RescheduleBody, body);
    await this.staffBooking(ctx, bookingId);
    return this.move(ctx.firmId, bookingId, b.startsAt, b.timeZone, staffActor(ctx));
  }

  async staffCancel(ctx: StaffContext, bookingId: string) {
    need(ctx, "agent/booking:edit");
    await this.staffBooking(ctx, bookingId);
    return this.cancelBooking(ctx.firmId, bookingId, staffActor(ctx));
  }

  /** The attendance answer (AG-4-39): COMPLETED or NO_SHOW, by a person, once the meeting has started; it may be changed
   *  later. The host answers their own; others need agent/booking:edit. */
  async recordAttendance(ctx: StaffContext, bookingId: string, outcome: unknown) {
    const o = parse(z.enum(["COMPLETED", "NO_SHOW"]), outcome);
    const own = await this.staffBooking(ctx, bookingId);
    if (own.staffId !== ctx.staffId) need(ctx, "agent/booking:edit");
    const now = this.ports.clock.now();
    const done = await this.db.$transaction(async (tx) => {
      const b = await this.lock(tx, ctx.firmId, bookingId);
      if (b.startsAt > now) throw problem(409, "too-early", "Not yet", "Attendance is recorded once the meeting has started.");
      if (!["SCHEDULED", "RESCHEDULED", "COMPLETED", "NO_SHOW"].includes(b.status)) throw problem(409, "not-active", "Cancelled", "A cancelled booking has no attendance.");
      if (b.status === o) return b;
      const after = await tx.foBooking.update({ where: { id: b.id }, data: { status: o } });
      await this.ports.audit.record(tx, { firmId: ctx.firmId, actor: staffActor(ctx).word, action: o === "COMPLETED" ? "booking.completed" : "booking.no_show", entity: "fo_booking", entityKey: b.id,
        summary: `Attendance recorded: ${o === "COMPLETED" ? "attended" : "did not attend"}.`, detail: { bookingId: b.id, from: b.status, to: o, sequence: after.sequence } });
      await this.outbox(tx, after, o === "COMPLETED" ? EVENT.BOOKING_COMPLETED : EVENT.BOOKING_NO_SHOW);
      return after;
    }, TX);
    return this.view(done);
  }

  /** Bookings whose attendance question is due (30 min after the end, still unanswered): the host's own, or the firm's
   *  with agent/booking:list. Nothing answers them by itself. */
  async attendanceDue(ctx: StaffContext) {
    const now = this.ports.clock.now();
    const rows = await this.db.foBooking.findMany({ where: firmScope(ctx.firmId, { status: { in: ACTIVE }, endsAt: { lte: new Date(now.getTime() - 30 * MIN) }, ...(ctx.keys.includes("agent/booking:list") ? {} : { staffId: ctx.staffId }) }), orderBy: { endsAt: "asc" } });
    return rows.map((r) => this.view(r));
  }

  /** The staff list (AG-4-67): the firm's bookings with agent/booking:list, else the person's own as host. */
  async staffList(ctx: StaffContext, query: unknown) {
    const q = parse(z.object({ from: Instant, to: Instant, staff: z.uuid().optional() }), query);
    if (!(q.from < q.to) || q.to.getTime() - q.from.getTime() > 92 * DAY) throw refused("Ask for at most 92 days, from before to.");
    const all = ctx.keys.includes("agent/booking:list");
    const staffId = all ? q.staff : ctx.staffId;
    const rows = await this.db.foBooking.findMany({ where: firmScope(ctx.firmId, { startsAt: { lt: q.to }, endsAt: { gt: q.from }, ...(staffId ? { staffId } : {}) }), orderBy: { startsAt: "asc" } });
    return rows.map((r) => this.view(r));
  }

  async staffGet(ctx: StaffContext, bookingId: string) { return this.view(await this.staffBooking(ctx, bookingId)); }

  // ========================================================================================================== writes
  private async create(firmId: string, type: TypeRow, at: { startsAt: Date; mode: Mode; timeZone: string }, actor: Actor,
    arrive: (tx: Tx, bookingId: string) => Promise<{ personId: string; prospectId?: string }>) {
    for (let attempt = 0; ; attempt++) {
      const bookingId = randomUUID();
      try {
        const done = await this.db.$transaction(async (tx) => {
          const slot = await this.freeSlot(tx, firmId, type, at.startsAt);
          const row = await tx.foBooking.create({ data: { id: bookingId, firmId, typeId: type.id, staffId: slot.staffIds[0], mode: at.mode, startsAt: slot.startsAt, endsAt: slot.endsAt, visitorTimeZone: at.timeZone } });
          const who = await arrive(tx, bookingId);
          const booking = await tx.foBooking.update({ where: { id: row.id }, data: { personId: who.personId, prospectId: who.prospectId ?? null } });
          const token = await issueToken(tx, firmId, booking.id, booking.endsAt);
          await this.ports.audit.record(tx, { firmId, actor: actor.word, action: "booking.scheduled", entity: "fo_booking", entityKey: booking.id,
            summary: `Consultation booked (${type.name}).`, detail: { bookingId: booking.id, typeId: type.id, staffId: booking.staffId, personId: who.personId, prospectId: who.prospectId ?? null, startsAt: booking.startsAt.toISOString(), sequence: booking.sequence } });
          await this.outbox(tx, booking, EVENT.BOOKING_SCHEDULED);
          return { booking, token };
        }, TX);
        await this.afterCommit({ booking: done.booking, type, method: "REQUEST", kind: "booked", token: done.token });
        return { ...this.view(done.booking), manageToken: done.token, label: wallLabel(done.booking.startsAt, done.booking.visitorTimeZone) };
      } catch (e) {
        // Another booking took the host between the slot check and the write (the database's no-overlap rule, or the
        // deadlock PostgreSQL reports when two writers of one range wait on each other): try again, which re-reads the
        // free hosts; when the retries are spent, the visitor gets fresh times.
        // No free host at that time (read after the host locks): fresh times, read after the transaction has ended.
        if (e instanceof NoSlot) throw slotTaken(await this.nextSlots(firmId, type, at));
        if (!isContention(e)) throw e;
        if (attempt >= type.hostStaffIds.length + 4) throw slotTaken(await this.nextSlots(firmId, type, at));
        await new Promise((r) => setTimeout(r, 5 + Math.floor(Math.random() * 20)));
      }
    }
  }

  private async move(firmId: string, bookingId: string, startsAt: Date, zone: string | undefined, actor: Actor, token?: string) {
    let attempt = 0;
    for (;;) {
      try {
        const done = await this.db.$transaction(async (tx) => {
          const b = await this.lock(tx, firmId, bookingId);
          const type = await tx.foConsultationType.findFirstOrThrow({ where: firmScope(firmId, { id: b.typeId }) });
          if (token) await this.recheckToken(tx, token, b, type);
          if (!ACTIVE.includes(b.status)) throw problem(409, "not-active", "Not changed", "This booking is no longer active.");
          const slot = await this.freeSlot(tx, firmId, type, startsAt, b.id);
          const staffId = slot.staffIds.includes(b.staffId) ? b.staffId : slot.staffIds[0];
          const after = await tx.foBooking.update({ where: { id: b.id }, data: { startsAt: slot.startsAt, endsAt: slot.endsAt, staffId, status: "RESCHEDULED", ...(zone ? { visitorTimeZone: zone } : {}) } });
          const newToken = await issueToken(tx, firmId, after.id, after.endsAt);
          await this.ports.audit.record(tx, { firmId, actor: actor.word, action: "booking.rescheduled", entity: "fo_booking", entityKey: b.id,
            summary: "Consultation moved to a new time.", detail: { bookingId: b.id, fromStartsAt: b.startsAt.toISOString(), toStartsAt: after.startsAt.toISOString(), fromStaffId: b.staffId, toStaffId: staffId, sequence: after.sequence } });
          await this.outbox(tx, after, EVENT.BOOKING_RESCHEDULED);
          return { booking: after, type, token: newToken, oldSequence: b.sequence };
        }, TX);
        await this.afterCommit({ booking: done.booking, type: done.type, method: "REQUEST", kind: "moved", token: done.token, oldSequence: done.oldSequence });
        return { ...this.view(done.booking), manageToken: done.token, label: wallLabel(done.booking.startsAt, done.booking.visitorTimeZone) };
      } catch (e) {
        if (!(e instanceof NoSlot) && !isContention(e)) throw e;
        if (e instanceof NoSlot || attempt++ >= 4) {
          const b = await this.db.foBooking.findFirstOrThrow({ where: firmScope(firmId, { id: bookingId }) });
          const type = await this.db.foConsultationType.findFirstOrThrow({ where: firmScope(firmId, { id: b.typeId }) });
          throw slotTaken(await this.nextSlots(firmId, type, { startsAt, timeZone: zone ?? b.visitorTimeZone }, bookingId));
        }
        await new Promise((r) => setTimeout(r, 5 + Math.floor(Math.random() * 20)));
      }
    }
  }

  private async cancelBooking(firmId: string, bookingId: string, actor: Actor, token?: string) {
    const done = await this.db.$transaction(async (tx) => {
      const b = await this.lock(tx, firmId, bookingId);
      const type = await tx.foConsultationType.findFirstOrThrow({ where: firmScope(firmId, { id: b.typeId }) });
      if (token) await this.recheckToken(tx, token, b, type);
      if (!ACTIVE.includes(b.status)) throw problem(409, "not-active", "Not changed", "This booking is no longer active.");
      const after = await tx.foBooking.update({ where: { id: b.id }, data: { status: "CANCELLED" } });
      await this.ports.audit.record(tx, { firmId, actor: actor.word, action: "booking.cancelled", entity: "fo_booking", entityKey: b.id,
        summary: "Consultation cancelled.", detail: { bookingId: b.id, from: b.status, sequence: after.sequence } });
      await this.outbox(tx, after, EVENT.BOOKING_CANCELLED);
      return { booking: after, type, oldSequence: b.sequence };
    }, TX);
    await this.afterCommit({ booking: done.booking, type: done.type, method: "CANCEL", kind: "cancelled", oldSequence: done.oldSequence });
    return this.view(done.booking);
  }

  /** The outbox row, written last in its transaction (contracts §0.5); keys bookingId and bookingId:sequence (AG-4-47). */
  private async outbox(tx: Tx, b: BookingRow, type: string) {
    await tx.moduleEvent.create({ data: { firmId: b.firmId, type, subjectId: b.id, occurredAt: this.ports.clock.now(), payload: {
      key: `${b.id}:${b.sequence}`, bookingId: b.id, sequence: b.sequence, status: b.status, typeId: b.typeId, staffId: b.staffId, personId: b.personId, prospectId: b.prospectId,
      mode: b.mode, startsAt: b.startsAt.toISOString(), endsAt: b.endsAt.toISOString(), visitorTimeZone: b.visitorTimeZone,
    } } });
  }

  // =================================================================================================== after commit
  /** Emails and jobs after the commit. Each step is tried on its own; a failure is told, never thrown (AG-4-34). */
  private async afterCommit(a: AfterCommit) {
    const { booking: b } = a;
    const keys = (seq: number) => ({ r24: `booking:${b.id}:${seq}:reminder-24h`, r1: `booking:${b.id}:${seq}:reminder-1h`, ask: `booking:${b.id}:${seq}:attendance` });
    const safe = async (what: string, f: () => Promise<unknown>) => { try { await f(); } catch (e) { this.warn(`${what} for booking ${b.id} failed after commit: ${e instanceof Error ? e.message : String(e)}`); } };
    if (a.oldSequence !== undefined) { const k = keys(a.oldSequence); for (const key of [k.r24, k.r1, k.ask]) await safe("cancel job", () => this.ports.jobs.cancel(key)); }
    if (a.kind !== "cancelled") {
      const k = keys(b.sequence), now = this.ports.clock.now().getTime(), opts = { firmId: b.firmId };
      for (const [key, at, kind] of [[k.r24, b.startsAt.getTime() - DAY, "24h"], [k.r1, b.startsAt.getTime() - 60 * MIN, "1h"]] as const)
        if (at > now) await safe(`reminder ${kind}`, () => this.ports.jobs.schedule("booking.reminder", new Date(at), { bookingId: b.id, sequence: b.sequence, kind }, { ...opts, key }));
      await safe("attendance question", () => this.ports.jobs.schedule("booking.attendance_ask", new Date(b.endsAt.getTime() + 30 * MIN), { bookingId: b.id, sequence: b.sequence }, { ...opts, key: k.ask }));
    }
    await safe("emails", () => this.sendBookingMail(a));
  }

  private async sendBookingMail(a: AfterCommit) {
    const { booking: b, type } = a;
    const firm = await this.db.platformFirm.findUniqueOrThrow({ where: { id: b.firmId }, select: { key: true, operatingName: true, contactEmail: true } });
    const host = await this.db.platformStaff.findFirstOrThrow({ where: firmScope(b.firmId, { id: b.staffId }), select: { email: true, displayName: true } });
    const person = b.personId ? await this.ports.arrival.contactOf(this.db as unknown as Tx, b.firmId, b.personId) : null;
    const zone = b.visitorTimeZone, when = wallLabel(b.startsAt, zone), how = MODE_WORDS[b.mode as Mode];
    const where = b.mode === "VIDEO" ? (type.meetingLink ?? "Your join link will follow.") : b.mode === "PHONE" ? "The firm will call you." : "At the firm's office.";
    const invite = (attendee: { name: string; email: string }) => ({ filename: "invite.ics", contentType: `text/calendar; charset=utf-8; method=${a.method}`, bytes: new TextEncoder().encode(bookingIcs({
      bookingId: b.id, sequence: b.sequence, method: a.method, startsAt: b.startsAt, endsAt: b.endsAt, stamp: this.ports.clock.now(),
      summary: `${type.name} with ${firm.operatingName}`, description: `${how}. ${where}`, location: b.mode === "VIDEO" ? (type.meetingLink ?? undefined) : undefined,
      organizer: { name: firm.operatingName, email: firm.contactEmail }, attendee,
    })) });
    const verb = a.kind === "booked" ? "is booked" : a.kind === "moved" ? "has moved" : "is cancelled";
    if (person) {
      const name = `${person.givenNames} ${person.familyName}`;
      const link = a.token ? `\n\nTo reschedule or cancel: ${this.manageLink(firm.key, a.token)}` : "";
      await this.ports.mail.send({ firmId: b.firmId, to: person.email, replyTo: firm.contactEmail, class: "TRANSACTIONAL", templateKey: `booking.${a.kind}`,
        subject: `Your ${type.name} ${verb}`, text: `Hello ${person.givenNames},\n\nYour ${type.name} with ${firm.operatingName} ${verb}${a.kind === "cancelled" ? "" : `: ${when}. ${how}. ${where}`}${link}\n\nReplies to this email reach the firm.`,
        attachments: [invite({ name, email: person.email })] });
    }
    // The host's copy holds only what runs the meeting (AG-4-42).
    await this.ports.mail.send({ firmId: b.firmId, to: host.email, replyTo: firm.contactEmail, class: "SERVICE", templateKey: `booking.host_${a.kind}`,
      subject: `Consultation ${verb}: ${wallLabel(b.startsAt, zone)}`, text: `${type.name} ${verb}: ${when}. ${how}.`, attachments: [invite({ name: host.displayName, email: host.email })] });
  }

  private async runReminder(job: JobRun) {
    const p = z.object({ bookingId: z.uuid(), sequence: z.number().int(), kind: z.enum(["24h", "1h"]) }).parse(job.payload);
    if (!job.firmId) return;
    const b = await this.db.foBooking.findFirst({ where: firmScope(job.firmId, { id: p.bookingId }) });
    if (!b || !ACTIVE.includes(b.status) || b.sequence !== p.sequence || !b.personId) return;   // moved, cancelled or answered since
    const type = await this.db.foConsultationType.findFirstOrThrow({ where: firmScope(b.firmId, { id: b.typeId }) });
    const firm = await this.db.platformFirm.findUniqueOrThrow({ where: { id: b.firmId }, select: { operatingName: true, contactEmail: true } });
    const person = await this.ports.arrival.contactOf(this.db as unknown as Tx, b.firmId, b.personId);
    if (!person) return;
    await this.ports.mail.send({ firmId: b.firmId, to: person.email, replyTo: firm.contactEmail, class: "SERVICE", templateKey: `booking.reminder_${p.kind}`,
      subject: `Reminder: your ${type.name} ${p.kind === "24h" ? "tomorrow" : "in one hour"}`, text: `Hello ${person.givenNames},\n\nThis is a reminder of your ${type.name} with ${firm.operatingName}: ${wallLabel(b.startsAt, b.visitorTimeZone)}. ${MODE_WORDS[b.mode as Mode]}.\n\nReplies to this email reach the firm.` });
  }

  /** The attendance question: the host is asked; nothing is recorded until a person answers (AG-4-39 rules 1-4). */
  private async runAttendanceAsk(job: JobRun) {
    const p = z.object({ bookingId: z.uuid(), sequence: z.number().int() }).parse(job.payload);
    if (!job.firmId) return;
    const b = await this.db.foBooking.findFirst({ where: firmScope(job.firmId, { id: p.bookingId }) });
    if (!b || !ACTIVE.includes(b.status) || b.sequence !== p.sequence) return;
    const host = await this.db.platformStaff.findFirstOrThrow({ where: firmScope(b.firmId, { id: b.staffId }), select: { email: true } });
    const firm = await this.db.platformFirm.findUniqueOrThrow({ where: { id: b.firmId }, select: { contactEmail: true } });
    await this.ports.mail.send({ firmId: b.firmId, to: host.email, replyTo: firm.contactEmail, class: "SERVICE", templateKey: "booking.attendance_ask",
      subject: "Did they attend?", text: `Your consultation of ${wallLabel(b.startsAt, b.visitorTimeZone)} has ended. Please record whether the person attended (Attended or No-show).` });
  }

  // ========================================================================================================= helpers
  private async slotsFor(db: Tx | PrismaClient, firmId: string, type: TypeRow, from: Date, to: Date, ignoreBookingId?: string): Promise<Slot[]> {
    const hosts = await db.platformStaff.findMany({ where: firmScope(firmId, { id: { in: type.hostStaffIds }, status: "ACTIVE" as const }), select: { id: true } });
    const ids = hosts.map((h) => h.id);
    const pad = 2 * DAY;
    const [windows, offs, busyRows, closedDays, firmZone] = await Promise.all([
      db.foAvailability.findMany({ where: firmScope(firmId, { staffId: { in: ids } }) }),
      db.foTimeOff.findMany({ where: firmScope(firmId, { staffId: { in: ids }, startsAt: { lt: new Date(to.getTime() + pad) }, endsAt: { gt: new Date(from.getTime() - pad) } }) }),
      ids.length ? db.$queryRaw<{ staff_id: string; lo: Date; hi: Date }[]>`SELECT staff_id::text, lower(block_range) AS lo, upper(block_range) AS hi FROM fo_booking
        WHERE firm_id = ${firmScope(firmId).firmId}::uuid AND staff_id = ANY(${ids}::uuid[]) AND status IN ('SCHEDULED', 'RESCHEDULED')
          AND block_range && tstzrange(${new Date(from.getTime() - pad)}::timestamptz, ${new Date(to.getTime() + pad)}::timestamptz)
          AND (${ignoreBookingId ?? null}::uuid IS NULL OR id <> ${ignoreBookingId ?? null}::uuid)` : Promise.resolve([]),
      readSetting<string[]>(db, firmId, CLOSED_DAYS.key),
      readSetting<string>(db, firmId, TIME_ZONE.key),
    ]);
    const group = <T,>(rows: T[], key: (r: T) => string, val: (r: T) => Range | HostWindow) => { const m = new Map<string, never[]>(); for (const r of rows) { const k = key(r); m.set(k, [...(m.get(k) ?? []), val(r) as never]); } return m; };
    return computeSlots({
      type, hours: group(windows, (w) => w.staffId, (w) => ({ weekday: w.weekday, startMinute: w.startMinute, endMinute: w.endMinute, timeZone: w.timeZone })),
      timeOff: group(offs, (o) => o.staffId, (o) => ({ from: o.startsAt, to: o.endsAt })),
      busy: group(busyRows, (r) => r.staff_id, (r) => ({ from: new Date(r.lo), to: new Date(r.hi) })),
      closedDays, firmZone, now: this.ports.clock.now(), from, to,
    });
  }

  /** The slot at exactly `startsAt`, re-checked inside the write (AG-4-25), or 409 with fresh times. Writers for the same
   *  hosts queue first on one transaction lock per host (taken in id order, so two writers never wait on each other): the
   *  second then sees the first's booking and answers 409 instead of meeting it in the no-overlap rule, which stays the
   *  database's last word (BR-3). */
  private async freeSlot(tx: Tx, firmId: string, type: TypeRow, startsAt: Date, ignoreBookingId?: string): Promise<Slot> {
    for (const staffId of [...type.hostStaffIds].sort()) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fo-booking-host:${staffId}`}))`;
    const slot = (await this.slotsFor(tx, firmId, type, startsAt, new Date(startsAt.getTime() + 1), ignoreBookingId)).find((s) => s.startsAt.getTime() === startsAt.getTime());
    if (!slot) throw new NoSlot();
    return slot;
  }

  private async nextSlots(firmId: string, type: TypeRow, at: { startsAt: Date; timeZone: string }, ignore?: string): Promise<PublicSlot[]> {
    const from = new Date(Math.max(this.ports.clock.now().getTime(), at.startsAt.getTime() - DAY));
    return (await this.slotsFor(this.db, firmId, type, from, new Date(from.getTime() + 7 * DAY), ignore)).slice(0, 10).map((s) => this.publicSlot(s, at.timeZone));
  }

  private publicSlot(s: Slot, tz: string): PublicSlot { return { startsAt: s.startsAt.toISOString(), endsAt: s.endsAt.toISOString(), label: wallLabel(s.startsAt, tz) }; }

  private async lock(tx: Tx, firmId: string, bookingId: string): Promise<BookingRow> {
    const id = firmScope(firmId).firmId;
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return notInFirm("booking");
    await tx.$queryRaw`SELECT id FROM fo_booking WHERE firm_id = ${id}::uuid AND id = ${bookingId}::uuid FOR UPDATE`;
    const b = await tx.foBooking.findFirst({ where: firmScope(firmId, { id: bookingId }) });
    return b ?? notInFirm("booking");
  }

  private async byToken(db: Tx | PrismaClient, token: string) {
    const t = await liveToken(db, token, this.ports.clock.now());
    if (!t) throw notFound();
    const booking = await db.foBooking.findFirst({ where: firmScope(t.firmId, { id: t.bookingId }) });
    if (!booking || !ACTIVE.includes(booking.status)) throw notFound();
    const type = await db.foConsultationType.findFirstOrThrow({ where: firmScope(t.firmId, { id: booking.typeId }) });
    return { booking, type, token: t };
  }

  /** Inside the change's transaction, after the row lock: the token is still live for this booking, and the self-service
   *  limit has not passed (AG-4-37 rule 5). */
  private async recheckToken(tx: Tx, token: string, b: BookingRow, type: TypeRow) {
    const t = await liveToken(tx, token, this.ports.clock.now());
    if (!t || t.bookingId !== b.id || !ACTIVE.includes(b.status)) throw notFound();
    if (!this.selfServiceOpen(b, type)) throw tooLate();
  }

  private selfServiceOpen(b: BookingRow, type: TypeRow) { return this.ports.clock.now().getTime() < b.startsAt.getTime() - type.selfServiceLimitMinutes * MIN; }

  private async staffBooking(ctx: StaffContext, bookingId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return notInFirm("booking");
    const b = await this.db.foBooking.findFirst({ where: firmScope(ctx.firmId, { id: bookingId }) });
    if (!b) return notInFirm("booking");
    if (b.staffId !== ctx.staffId && !ctx.keys.includes("agent/booking:list")) return notInFirm("booking");
    return b;
  }

  private view(b: BookingRow) {
    return { id: b.id, status: b.status as Status, sequence: b.sequence, typeId: b.typeId, staffId: b.staffId, personId: b.personId, prospectId: b.prospectId, mode: b.mode,
      startsAt: b.startsAt.toISOString(), endsAt: b.endsAt.toISOString(), timeZone: b.visitorTimeZone };
  }

  private manageLink(firmKey: string, token: string) { return `${this.ports.publicBaseUrl.replace(/\/+$/, "")}/book/${encodeURIComponent(firmKey)}/manage#${token}`; }

  // ---------------------------------------------------------------------------------------------- public-door guards
  /** A rolling-window limit per key (contracts §0.6; sized for about 100 firms in one process, P-562). */
  private limit(key: string, max: number) {
    const now = this.ports.clock.now().getTime(), since = now - this.limits.windowMinutes * MIN;
    const list = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (list.length >= max) { this.hits.set(key, list); throw tooMany(); }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 50_000) for (const [k, v] of this.hits) if (!v.some((t) => t > since)) this.hits.delete(k);
  }

  /** The form's load stamp: `<ms>.<hmac>` over the firm and the time the slots were read. */
  stamp(firmId: string, at: Date): string {
    const ms = String(at.getTime());
    return `${ms}.${createHmac("sha256", this.formKey).update(`${firmId.toLowerCase()}|${ms}`).digest("base64url")}`;
  }

  /** The minimum fill time (AG-4-20 rule 3): a form sent sooner than a person could fill it, or with a stamp that is not
   *  ours, is refused; a stamp older than 2 hours asks for a reload. */
  private checkStamp(firmId: string, stamp: string) {
    const [ms, mac] = stamp.split(".");
    const want = Buffer.from(this.stamp(firmId, new Date(Number(ms))).split(".")[1] ?? "");
    const have = Buffer.from(mac ?? "");
    if (!/^\d{1,15}$/.test(ms ?? "") || have.length !== want.length || !timingSafeEqual(have, want)) throw refused("We could not take this booking. Please reload the page and try again.");
    const age = this.ports.clock.now().getTime() - Number(ms);
    if (age < this.limits.minFillSeconds * 1000) throw refused("We could not take this booking. Please try again.");
    if (age > 2 * 60 * MIN) throw refused("This page was open for a long time. Please reload it to see the latest times.");
  }
}

/** No free host at the asked time, found inside the write; the caller answers 409 with fresh times once the transaction
 *  has ended (reading them inside it would hold a second connection). */
class NoSlot extends Error {}

export const staffActor = (ctx: StaffContext): Actor => ({ word: `staff:${ctx.staffId}`, staffId: ctx.staffId });
function need(ctx: StaffContext, key: string) { if (!ctx.keys.includes(key)) throw forbidden(key); }

/** Two writers of one slot: the database's no-overlap refusal (23P01 on fo_booking_no_overlap), or the deadlock (40P01)
 *  or serialization failure (40001) PostgreSQL may report instead when two inserts wait on each other's range; however
 *  the driver wraps it. Each is answered by re-reading the free hosts. */
export function isContention(e: unknown): boolean {
  const seen = new Set<unknown>();
  const walk = (x: unknown, depth: number): boolean => {
    if (!x || typeof x !== "object" || seen.has(x) || depth > 6) return false;
    seen.add(x);
    const o = x as Record<string, unknown>;
    if (["23P01", "40P01", "40001"].some((c) => o.code === c || o.originalCode === c) || (typeof o.message === "string" && /fo_booking_no_overlap|23P01|exclusion constraint|deadlock detected|could not serialize/.test(o.message))) return true;
    return ["cause", "meta", "driverAdapterError", "error"].some((k) => walk(o[k], depth + 1));
  };
  return walk(e, 0);
}
