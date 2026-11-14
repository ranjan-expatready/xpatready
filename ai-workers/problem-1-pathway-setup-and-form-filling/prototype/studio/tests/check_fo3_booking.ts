// FO-3 (BACKLOG row FO-3; contracts §2.2, §7 §2.2; AG-04 v2.1; AG-02 AG-2-10, -26): the booking API. Every line of the
// row's "Done when", each with a passing and a failing case, on PF-0p's fake clock, jobs and mail and the ArrivalPort fake,
// against a scratch database that gets every migration (FO-1b's booking tables and their rules are real). The public door
// is also called over HTTP through a child Nest app (this file with --serve) with the real read guard. No model call (US$0). Dropped at the end.
//   tsx studio/tests/check_fo3_booking.ts
import "reflect-metadata";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fakeArrival, type FakeArrival } from "../ports/arrival.ts";
import { fakeAudit, type AuditPort } from "../ports/audit.ts";
import { FakeClock } from "../ports/clock.ts";
import { EVENT } from "../ports/events.ts";
import { fakeJobs } from "../ports/jobs.ts";
import { fakeMail, type FakeMail } from "../ports/mail.ts";
import { fakeStaff, type StaffContext } from "../ports/staff.ts";
import { copyFirmHoursTo } from "../api/src/front-office/booking-seed.ts";
import { bookingIcs, fold } from "../api/src/front-office/booking/ics.ts";
import { BookingService, PublicBookingBody, type BookingPorts } from "../api/src/front-office/booking/service.ts";
import { computeSlots, wallToUtc } from "../api/src/front-office/booking/slots.ts";
import { issueToken } from "../api/src/front-office/booking/tokens.ts";
import { auditEvent } from "../api/src/platform/audit/audit-event.ts";
import { CLOSED_DAYS, writeSetting } from "../api/src/platform/settings.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations");
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const DB = `xr_studio_fo3_${process.pid}`, URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
const TZ = "America/Toronto";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
/** The thrown HTTP problem's status and body (or null when nothing was thrown). */
const thrown = async (f: () => unknown): Promise<{ status: number; body: Record<string, unknown> } | null> => {
  try { await f(); return null; } catch (e) {
    const x = e as { getStatus?: () => number; getResponse?: () => unknown; message?: string };
    return x.getStatus ? { status: x.getStatus(), body: x.getResponse!() as Record<string, unknown> } : { status: 0, body: { message: String(x.message ?? e) } };
  }
};
/** A Toronto wall time as a moment ("2026-10-26 09:00"). */
const at = (s: string, zone = TZ) => { const [d, t] = s.split(" "); const [y, m, dd] = d.split("-").map(Number); const [h, mi] = t.split(":").map(Number); const r = wallToUtc(y, m, dd, h * 60 + mi, zone); if (!r) throw new Error(`no such time ${s}`); return r; };
const iso = (s: string) => at(s).toISOString();
const has = (slots: { startsAt: string }[], s: string) => slots.some((x) => x.startsAt === iso(s));

if (process.argv.includes("--serve")) await serve();
execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", DB]);
execFileSync(join(BIN, "createdb"), [...PG, DB]);
for (const d of readdirSync(MIG).filter((x) => /^\d{14}_/.test(x)).sort()) execFileSync(join(BIN, "psql"), [URL, "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIG, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });
process.env.DATABASE_URL = URL;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL, options: "-c TimeZone=UTC" }) });
let server: ChildProcess | null = null;

try {
  // ---------------------------------------------------------------------------------------------------------- set-up
  const ws = await db.workspace.create({ data: { key: "fo3-check", label: "FO-3 check" } });
  const firm = (key: string, status: "ACTIVE" | "PAYMENT_HOLD" = "ACTIVE") => db.platformFirm.create({ data: { key, operatingName: `Sample ${key}`, countryCode: "CA", status, contactEmail: `${key}@firm.example` } });
  const [A, B, H] = [await firm("fo3-a"), await firm("fo3-b"), await firm("fo3-hold", "PAYMENT_HOLD")];
  const staff = (firmId: string, n: string, status: "ACTIVE" | "SUSPENDED" = "ACTIVE") => db.platformStaff.create({ data: { firmId, email: `${n}@staff.example`, displayName: `Sample ${n}`, status } });
  const [A1, A2, A3, B1, H1] = [await staff(A.id, "a1"), await staff(A.id, "a2"), await staff(A.id, "a3", "SUSPENDED"), await staff(B.id, "b1"), await staff(H.id, "h1")];
  await copyFirmHoursTo(db, A.id, [A1.id, A2.id, A3.id]);
  await copyFirmHoursTo(db, B.id, [B1.id]);
  await copyFirmHoursTo(db, H.id, [H1.id]);
  await writeSetting(db, { firmId: A.id, key: CLOSED_DAYS.key, value: ["2026-10-28"], by: "seed:fo3", workspaceId: ws.id });
  const type = (firmId: string, slug: string, hosts: string[], extra: Record<string, unknown> = {}) => db.foConsultationType.create({ data: { firmId, slug, name: `Free consultation ${slug}`, modes: ["VIDEO", "PHONE"], hostStaffIds: hosts, minutes: 30, ...extra } });
  const T = {
    base: await type(A.id, "free", [A1.id]),
    team: await type(A.id, "team", [A1.id, A2.id]),
    every15: await type(A.id, "every15", [A1.id], { slotIntervalMinutes: 15 }),
    short: await type(A.id, "short", [A1.id], { windowDays: 2 }),
    susp: await type(A.id, "susp", [A3.id, A2.id]),
    suspOnly: await type(A.id, "susp-only", [A3.id]),
    off: await type(A.id, "retired", [A1.id], { active: false }),
    b: await type(B.id, "free", [B1.id]),
    hold: await type(H.id, "free", [H1.id]),
    race: await type(A.id, "race", [A2.id], { gapAfterMinutes: 0 }),
  };

  const clock = new FakeClock(at("2026-10-26 08:00"));   // Monday, EDT
  const make = (o: Partial<BookingPorts> & { mail?: FakeMail; arrival?: FakeArrival } = {}) => {
    const mail = o.mail ?? fakeMail({ now: () => clock.now() }), arrival = o.arrival ?? fakeArrival(), audit = o.audit ?? fakeAudit(), jobs = o.jobs ?? fakeJobs(clock);
    const warnings: string[] = [];
    const svc = new BookingService(db, { audit: audit as AuditPort<never>, clock, jobs, mail, arrival, publicBaseUrl: "http://localhost:4430", limits: { bookPerIp: 1000, bookPerFirm: 1000, slotsPerIp: 1000, tokenPerIp: 1000, ...o.limits }, warn: (m) => warnings.push(m) });
    return { svc, mail, arrival, audit, jobs, warnings };
  };
  const main = make();
  await main.svc.registerJobs();
  const S = main.svc;
  const days = (from: string, to: string) => ({ from: iso(from), to: iso(to), tz: TZ });
  /** A filled form for a slug: the stamp from the slots answer, then 5 s of "typing". */
  const form = async (svc: BookingService, slug: string, startsAt: string, who = "ana", extra: Record<string, unknown> = {}, firmKey = A.key) => {
    const page = await svc.publicSlots(firmKey, slug, {}, "10.0.0.1");
    await clock.advance({ seconds: 5 });
    return { givenNames: "Ana", familyName: `Sample ${who}`, email: `${who}@client.example`, mode: "VIDEO", startsAt: iso(startsAt), timeZone: TZ, consent: true, consentWordingId: page.consent!.wordingId, formStamp: page.formStamp, ...extra };
  };
  /** A public answer with the booking's own row beside it (the public answer carries no ids: the test reads them from
   *  the database by the link's selector). */
  const full = async <R extends { manageToken: string }>(r: R) => {
    const tok = await db.foBookingToken.findUniqueOrThrow({ where: { id: r.manageToken.split(".")[0] } });
    const b = await db.foBooking.findUniqueOrThrow({ where: { id: tok.bookingId } });
    return { ...r, answer: r, id: b.id, staffId: b.staffId, personId: b.personId, prospectId: b.prospectId, sequence: b.sequence };
  };
  const book = async (svc: BookingService, slug: string, startsAt: string, who?: string, extra?: Record<string, unknown>) => full(await svc.publicBook(A.key, slug, await form(svc, slug, startsAt, who, extra), "10.0.0.1"));
  const IDS = ["id", "staffId", "personId", "prospectId", "typeId", "firmId"];
  const noIds = (x: object) => !Object.keys(x).some((k) => IDS.includes(k)) && !JSON.stringify(x).includes(A1.id) && !JSON.stringify(x).includes(A2.id);

  // ------------------------------------------------------------------------------------------------- slots: the rules
  const mon = (await S.publicSlots(A.key, "free", days("2026-10-26 00:00", "2026-10-27 00:00"), "ip")).slots;
  ok("FO-3 slots pass: 12:00 Monday is offered (inside the host's hours, after the 4 h shortest notice from 08:00)", has(mon, "2026-10-26 12:00"), mon.slice(0, 3));
  ok("FO-3 slots fail: 11:30 Monday is inside the shortest notice and not offered", !has(mon, "2026-10-26 11:30"));
  ok("FO-3 slots fail: no slot ends after the host's 17:00 (16:30 is the last start)", has(mon, "2026-10-26 16:30") && !has(mon, "2026-10-26 17:00"));
  ok("FO-3 slots: each slot is labelled in the visitor's zone", mon.every((s) => s.label.endsWith(`(${TZ})`)));
  const wed = (await S.publicSlots(A.key, "free", days("2026-10-28 00:00", "2026-10-30 00:00"), "ip")).slots;
  ok("FO-3 slots fail: a slot on a firm closed day (28 Oct) is not offered", !wed.some((s) => s.startsAt < iso("2026-10-29 00:00")));
  ok("FO-3 slots pass: the next open day (29 Oct) is offered", has(wed, "2026-10-29 09:00"));
  ok("FO-3 slots pass: a 15-minute interval offers 12:15; fail: the default interval (the meeting's length) does not",
    has((await S.publicSlots(A.key, "every15", days("2026-10-26 00:00", "2026-10-27 00:00"), "ip")).slots, "2026-10-26 12:15") && !has(mon, "2026-10-26 12:15"));
  const shortW = (await S.publicSlots(A.key, "short", days("2026-10-26 00:00", "2026-10-31 00:00"), "ip")).slots;
  ok("FO-3 slots pass: inside a 2-day booking window 27 Oct is offered; fail: 29 Oct (beyond it) is not", has(shortW, "2026-10-27 10:00") && !has(shortW, "2026-10-29 10:00"));
  ok("FO-3 slots fail: a type whose only host is suspended offers nothing (AG-4-53)", (await S.publicSlots(A.key, "susp-only", days("2026-10-26 00:00", "2026-11-02 00:00"), "ip")).slots.length === 0);
  const susp = await book(S, "susp", "2026-10-27 15:00", "susp");
  ok("FO-3 slots pass: a type with a suspended host and an active one offers times, and books the active one", susp.staffId === A2.id, susp);
  await db.foTimeOff.create({ data: { firmId: A.id, staffId: A1.id, startsAt: at("2026-10-27 09:00"), endsAt: at("2026-10-27 12:00"), createdBy: "seed:fo3" } });
  const tue = (await S.publicSlots(A.key, "free", days("2026-10-27 00:00", "2026-10-28 00:00"), "ip")).slots;
  ok("FO-3 slots fail: time off (Tue 09:00-12:00) removes 10:00; pass: 13:00 is offered", !has(tue, "2026-10-27 10:00") && has(tue, "2026-10-27 13:00"));

  // DST (AG-4-1 rule 8), on the slot rule itself: 1 Nov 2026 in Toronto repeats 01:00-01:59; 8 Mar 2026 skips 02:00-02:59.
  const dstType = { minutes: 30, gapBeforeMinutes: 0, gapAfterMinutes: 0, minNoticeMinutes: 0, windowDays: 400, slotIntervalMinutes: null, hostStaffIds: ["h"] };
  const night = (date: string, now: string) => computeSlots({ type: dstType, hours: new Map([["h", [{ weekday: 0, startMinute: 0, endMinute: 240, timeZone: TZ }]]]), busy: new Map(), timeOff: new Map(), closedDays: [], firmZone: TZ, now: new Date(now), from: new Date(`${date}T00:00:00Z`), to: new Date(`${date}T23:59:00Z`) });
  const fall = night("2026-11-01", "2026-10-01T00:00:00Z");
  const label = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  ok("FO-3 DST pass: on 1 Nov 2026 (America/Toronto) 01:30 is offered once, at its first moment (05:30Z)", fall.filter((s) => label(s.startsAt) === "01:30").length === 1 && fall.some((s) => s.startsAt.toISOString() === "2026-11-01T05:30:00.000Z"), fall.map((s) => s.startsAt.toISOString()));
  ok("FO-3 DST fail: the second 01:30 (06:30Z) is not offered again", !fall.some((s) => s.startsAt.toISOString() === "2026-11-01T06:30:00.000Z"));
  const spring = night("2026-03-08", "2026-02-01T00:00:00Z");
  ok("FO-3 DST fail: on 8 Mar 2026 the skipped 02:00 and 02:30 are not offered; pass: 03:00 is", !spring.some((s) => ["02:00", "02:30"].includes(label(s.startsAt))) && spring.some((s) => label(s.startsAt) === "03:00") && spring.length === 6, spring.map((s) => label(s.startsAt)));

  // ------------------------------------------------------------------------------------- one door, one identical 404
  const nf = async (f: () => unknown) => JSON.stringify((await thrown(f))?.body ?? null);
  const nfs = [await nf(() => S.publicSlots("no-such-firm", "free", {}, "ip")), await nf(() => S.publicSlots(A.key, "no-such-type", {}, "ip")), await nf(() => S.publicSlots(A.key, "retired", {}, "ip")), await nf(() => S.publicSlots(H.key, "free", {}, "ip"))];
  ok("FO-3 door: an unknown firm, an unknown slug, an inactive type and a firm on payment hold give the identical 404", new Set(nfs).size === 1 && JSON.parse(nfs[0]).status === 404, nfs);
  ok("FO-3 door fail: a firm key with a NUL byte or capitals gives the same identical 404 (break B-7)", await nf(() => S.publicSlots("fo3-a\u0000", "free", {}, "ip")) === nfs[0] && await nf(() => S.publicSlots("FO3-A", "free", {}, "ip")) === nfs[0]);
  ok("FO-3 door pass: a known firm and active type answers its page (no host named)", !JSON.stringify(await S.publicSlots(A.key, "free", {}, "ip")).includes(A1.id));

  // ----------------------------------------------------------------------------------------------- booking: the form
  const ref = async (body: Record<string, unknown>) => (await thrown(async () => S.publicBook(A.key, "free", body, "ip")))?.status;
  const good = await form(S, "free", "2026-10-29 09:00", "form");
  ok("FO-3 form fail: no consent tick → 400", await ref({ ...good, consent: false }) === 400);
  ok("FO-3 form fail: a missing last name → 400", await ref({ ...good, familyName: "" }) === 400);
  ok("FO-3 form fail: phone mode without a phone → 400", await ref({ ...good, mode: "PHONE" }) === 400);
  ok("FO-3 form fail: a mode the type does not offer → 400", await ref({ ...good, mode: "IN_PERSON" }) === 400);
  ok("FO-3 form fail: the honeypot filled → 400", await ref({ ...good, website: "http://spam.example" }) === 400);
  ok("FO-3 form fail: another consent wording than the firm's → 409", await ref({ ...good, consentWordingId: "00000000-0000-4000-8000-000000000bad" }) === 409);
  ok("FO-3 form fail: a forged form stamp → 400", await ref({ ...good, formStamp: `${clock.now().getTime() - 60_000}.forged` }) === 400);
  const fast = await S.publicSlots(A.key, "free", {}, "ip");
  ok("FO-3 form fail: sent 1 s after the page loaded (minimum fill time) → 400", await ref({ ...good, formStamp: fast.formStamp }) === 400);
  ok("FO-3 form fail: an invisible-only name, a right-to-left override, U+2028 → 400 (break B-9)", await ref({ ...good, givenNames: "\u200b" }) === 400 && await ref({ ...good, familyName: "Ann\u202eX" }) === 400 && await ref({ ...good, familyName: "A\u2028B" }) === 400);
  ok("FO-3 form fail: a Hangul filler, RLM, ALM or tag characters → 400 (break B-9 round 2)", await ref({ ...good, givenNames: "\u3164" }) === 400 && await ref({ ...good, givenNames: "Ana\u200f" }) === 400 && await ref({ ...good, givenNames: "Ana\u061c" }) === 400 && await ref({ ...good, givenNames: "Ana\u{e0041}" }) === 400);
  ok("FO-3 form pass: a name in another script (Arabic, Korean, accented Latin) is taken by the name rule", ["\u0639\u0644\u064a", "\uc9c0\ubbfc", "Zo\u00eb", "O'Brien-Smith"].every((n) => PublicBookingBody.shape.givenNames.safeParse(n).success) && !PublicBookingBody.shape.givenNames.safeParse("\u3164").success);
  ok("FO-3 form fail: a zone the database does not take (Etc/GMT0) → 400, never 500 (break B-2)", await ref({ ...good, timeZone: "Etc/GMT0" }) === 400);
  ok("FO-3 form fail: a start in year 0001 → 400; slots asked from year 0001 → 400 (break B-2)", await ref({ ...good, startsAt: "0001-01-01T10:00:00Z" }) === 400 && (await thrown(() => S.publicSlots(A.key, "free", { from: "0001-01-01T00:00:00Z" }, "ip")))?.status === 400);
  ok("FO-3 form fail: a line break in a name → 400 (never 500)", await ref({ ...good, givenNames: "Ana\r\nBcc: x@y.example" }) === 400);
  const phoneOk = await full(await S.publicBook(A.key, "free", { ...good, mode: "PHONE", phone: "+1 416 555 0100" }, "ip"));
  const caps = await full(await S.publicBook(A.key, "free", { ...(await form(S, "free", "2026-10-29 11:00", "caps")), timeZone: "America/TORONTO" }, "ip"));
  ok("FO-3 form pass: America/TORONTO is kept in IANA's spelling, America/Toronto (break B-10)", (await db.foBooking.findUniqueOrThrow({ where: { id: caps.id } })).visitorTimeZone === TZ);
  const lim3 = make({ limits: { bookPerFirm: 3 } });
  const realForm = await form(lim3.svc, "free", "2026-10-29 10:00", "notblocked");
  for (let i = 0; i < 10; i++) await thrown(() => lim3.svc.publicBook(A.key, "free", {}, `198.51.100.${i}`));
  // B-3 round 2: well-formed, stamped forms for a time never offered (one stamp reused) do not count either.
  for (let i = 0; i < 10; i++) await thrown(() => lim3.svc.publicBook(A.key, "free", { ...realForm, startsAt: iso("2026-11-01 08:00"), email: `bot${i}@client.example` }, `198.51.100.${50 + i}`));
  ok("FO-3 door pass: empty posts and stamped forms for a never-offered time from 20 addresses do not use up the firm's limit; a real booking still goes through (break B-3)", (await lim3.svc.publicBook(A.key, "free", realForm, "203.0.113.9")).status === "SCHEDULED");
  for (const t of ["2026-10-29 12:00", "2026-10-29 13:00"]) await lim3.svc.publicBook(A.key, "free", { ...(await form(lim3.svc, "free", t, `fill${t.slice(-5, -3)}`)) }, `203.0.113.${t.slice(-5, -3)}`);
  ok("FO-3 door fail: once the firm's limit (3 here) of real bookings is reached, the next well-formed form → 429", (await thrown(async () => lim3.svc.publicBook(A.key, "free", await form(lim3.svc, "free", "2026-10-29 14:00", "over"), "203.0.113.77")))?.status === 429);
  const reads = make({ limits: { slotsPerIp: 2 } });
  for (let i = 0; i < 30; i++) for (let k = 0; k < 2; k++) await reads.svc.publicSlots(A.key, "free", {}, `192.0.2.${i}`);
  ok("FO-3 door pass: 30 addresses reading the page to their own limit never close it for a new visitor (break R2-1); fail: the third read from one of them → 429",
    (await reads.svc.publicSlots(A.key, "free", {}, "192.0.2.200")).slots.length > 0 && (await thrown(() => reads.svc.publicSlots(A.key, "free", {}, "192.0.2.1")))?.status === 429);
  ok("FO-3 door: the public booking answer names no host, person, prospect or type (contracts §0.6); fail-proof: the row has them", noIds(phoneOk.answer) && !!phoneOk.staffId && !!phoneOk.personId, phoneOk.answer);
  ok("FO-3 form pass: phone mode with a phone, consent ticked → booked SCHEDULED", phoneOk.status === "SCHEDULED" && phoneOk.mode === "PHONE" && !!phoneOk.manageToken, phoneOk);

  // ------------------------------------------------------------------------------------- 20 at once for one slot
  const race = make();
  const raceForms = await Promise.all(Array.from({ length: 20 }, (_, i) => form(race.svc, "race", "2026-11-02 10:00", `race${i}`)));
  await clock.advance({ seconds: 5 });
  const results = await Promise.allSettled(raceForms.map((f) => race.svc.publicBook(A.key, "race", f, "ip")));
  const won = results.filter((r) => r.status === "fulfilled").length;
  const lost = results.filter((r) => r.status === "rejected" && (r.reason as { getStatus?: () => number }).getStatus?.() === 409 && ((r.reason as { getResponse: () => { code?: string } }).getResponse().code === "SLOT_TAKEN")).length;
  ok("FO-3 race: 20 parallel requests for one slot → exactly one booked, 19 answered 409 SLOT_TAKEN", won === 1 && lost === 19, { won, lost, other: results.filter((r) => r.status === "rejected").map((r) => { const x = (r as PromiseRejectedResult).reason as { getResponse?: () => unknown }; return x.getResponse ? JSON.stringify(x.getResponse()).slice(0, 200) : String(x).slice(0, 200); }).filter((t) => !t.includes("SLOT_TAKEN")).slice(0, 3) });
  ok("FO-3 race: one row in the database for that host and time", await db.foBooking.count({ where: { firmId: A.id, typeId: T.race.id, startsAt: at("2026-11-02 10:00") } }) === 1);

  // --------------------------------------------------------------------------------------- gaps and the first free host
  const g = await book(S, "free", "2026-10-30 13:00", "gap");
  const fri = (await S.publicSlots(A.key, "free", days("2026-10-30 00:00", "2026-10-31 00:00"), "ip")).slots;
  ok("FO-3 gaps fail: with 10 min after a 13:00 booking, the host's 13:30 is not offered; pass: 14:00 is", g.staffId === A1.id && !has(fri, "2026-10-30 13:30") && has(fri, "2026-10-30 14:00"));
  const t1 = await book(S, "team", "2026-10-30 13:00", "team1");
  const t2 = await book(S, "team", "2026-10-30 15:00", "team2");
  ok("FO-3 first free host: A1 is busy at 13:00 → the team booking goes to A2; pass: at 15:00 the first listed host (A1) takes it", t1.staffId === A2.id && t2.staffId === A1.id, [t1.staffId, t2.staffId]);

  // ---------------------------------------------------------------------------------- hours never move a booking
  const before = await db.foBooking.findUniqueOrThrow({ where: { id: g.id } });
  await db.foAvailability.deleteMany({ where: { firmId: A.id, staffId: A1.id, weekday: 5 } });
  const after = await db.foBooking.findUniqueOrThrow({ where: { id: g.id } });
  ok("FO-3 hours pass: removing the host's Friday hours leaves the Friday booking as it was", after.startsAt.getTime() === before.startsAt.getTime() && after.status === before.status && after.sequence === before.sequence);
  ok("FO-3 hours fail: the change took effect for new bookings (no Friday slot for A1 any more)", (await S.publicSlots(A.key, "free", days("2026-11-06 00:00", "2026-11-07 00:00"), "ip")).slots.length === 0);
  await copyFirmHoursTo(db, A.id, [A1.id]);   // back (Friday only was removed, so nothing else is copied)
  ok("FO-3 hours: the copy back is refused for a person who still has hours (FO-1b's rule), so Friday stays empty", (await S.publicSlots(A.key, "free", days("2026-11-06 00:00", "2026-11-07 00:00"), "ip")).slots.length === 0);
  await db.foAvailability.create({ data: { firmId: A.id, staffId: A1.id, weekday: 5, startMinute: 540, endMinute: 1020, timeZone: TZ } });

  // ------------------------------------------------------------------------------------------- the arrival path
  const arr = make();
  const n1 = await book(arr.svc, "free", "2026-11-03 09:00", "newbie");
  ok("FO-3 arrival pass: a new email runs the arrival path once, keyed booking:<id>, and makes one lead", arr.arrival.calls.length === 1 && arr.arrival.calls[0].key === `booking:${n1.id}` && arr.arrival.leads.length === 1 && n1.personId === arr.arrival.calls[0].result.personId);
  const pros = arr.arrival.addProspect(A.id, "pat@client.example", "ENGAGED");
  const p1 = await book(arr.svc, "free", "2026-11-03 10:00", "pat");
  const p2 = await book(arr.svc, "free", "2026-11-03 11:00", "pat");
  const moved = arr.arrival.prospects.find((p) => p.id === pros.id)!;
  ok("FO-3 arrival: a booker with an open prospect makes no new lead (still 1 lead)", arr.arrival.leads.length === 1, arr.arrival.leads);
  ok("FO-3 arrival: the prospect moves to Consult once, with the cause \"consult booked\" (a second booking moves nothing)", moved.stage === "CONSULT" && moved.causes.length === 1 && moved.causes[0] === "consult booked" && p1.prospectId === pros.id && p2.prospectId === pros.id, moved);
  arr.arrival.addProspect(A.id, "two@client.example", "NEW"); arr.arrival.addProspect(A.id, "two@client.example", "ENGAGED");
  const two = await book(arr.svc, "free", "2026-11-03 13:00", "two");
  ok("FO-3 arrival fail: a person with two open prospects moves neither, and the booking names no prospect", two.prospectId === null && arr.arrival.prospects.filter((p) => p.causes.length).length === 1);
  const arrFail = make({ arrival: fakeArrival({ failOn: () => true }) });
  ok("FO-3 arrival fail: a failing arrival path rolls the booking back (nothing saved)", (await thrown(async () => book(arrFail.svc, "free", "2026-11-03 14:00", "rollback"))) !== null && await db.foBooking.count({ where: { firmId: A.id, startsAt: at("2026-11-03 14:00") } }) === 0);

  // --------------------------------------------------------------------------------------------- audit and outbox
  const aud = make({ audit: fakeAudit({ failOn: (e) => e.action === "booking.scheduled" }) });
  const evBefore = await db.moduleEvent.count();
  ok("FO-3 audit fail: a forced audit failure rolls the booking back (no booking, no token, no event)",
    (await thrown(async () => book(aud.svc, "free", "2026-11-03 15:00", "audfail"))) !== null && await db.foBooking.count({ where: { firmId: A.id, startsAt: at("2026-11-03 15:00") } }) === 0 && await db.moduleEvent.count() === evBefore);
  const real = make({ audit: auditEvent as AuditPort<never> });
  const r1 = await book(real.svc, "free", "2026-11-03 15:00", "audok");
  const lines = await db.auditEvent.findMany({ where: { entityKey: r1.id } });
  ok("FO-3 audit pass: the booking wrote one audit_event line in its transaction (real interim adapter, platform-audit workspace)", lines.length === 1 && lines[0].action === "booking.scheduled" && lines[0].actor === "system:booking-page" && !JSON.stringify(lines[0].detail).includes("@"), lines);
  const ev = await db.moduleEvent.findMany({ where: { subjectId: r1.id } });
  ok("FO-3 event: one booking.scheduled outbox row, key <id>:0, ids only (no name or email)", ev.length === 1 && ev[0].type === EVENT.BOOKING_SCHEDULED && (ev[0].payload as { key: string }).key === `${r1.id}:0` && !JSON.stringify(ev[0].payload).includes("@"), ev);
  ok("FO-3 audit: each booking made so far wrote exactly one booking.scheduled line (main service)", [susp, phoneOk, caps, g, t1, t2].every((b) => (main.audit as ReturnType<typeof fakeAudit>).entries.filter((e) => e.entityKey === b.id && e.action === "booking.scheduled").length === 1));

  // ------------------------------------------------------------------------------- mail after commit, never losing
  const broken = make({ mail: fakeMail({ failOn: () => true }) });
  const mb = await book(broken.svc, "free", "2026-11-03 16:00", "nomail");
  ok("FO-3 mail pass: a throwing mail adapter still saves the booking (SCHEDULED in the database) and the failure is told",
    (await db.foBooking.findUniqueOrThrow({ where: { id: mb.id } })).status === "SCHEDULED" && broken.warnings.some((w) => /emails/.test(w)), broken.warnings);
  const conf = main.mail.inbox("form@client.example");
  ok("FO-3 mail pass: the booker's confirmation carries the self-service link and the time in their zone; fail: it holds no host id", conf.length === 1 && conf[0].text.includes(`/book/${A.key}/manage#${phoneOk.manageToken}`) && conf[0].text.includes(`(${TZ})`) && !conf[0].text.includes(A1.id), conf[0]?.text);

  // ---------------------------------------------------------------------------------------------------- the invite
  const icsOf = (m: { attachments?: { bytes: Uint8Array }[] }) => new TextDecoder().decode(m.attachments![0].bytes);
  const inv = icsOf(conf[0]);
  ok("FO-3 ics: METHOD:REQUEST, a stable UID, SEQUENCE:0, DTSTART in UTC, CRLF lines", /METHOD:REQUEST\r\n/.test(inv) && inv.includes(`UID:${phoneOk.id}@booking.expatready.com`) && inv.includes("SEQUENCE:0\r\n") && inv.includes(`DTSTART:${iso("2026-10-29 09:00").replace(/[-:]/g, "").replace(".000", "")}`), inv);
  const unfolded = inv.replace(/\r\n /g, "");
  ok("FO-3 ics fail: no answer the person typed is inside (no phone; the booker's email only on the attendee line)", !unfolded.includes("+14165550100") && (unfolded.match(/form@client\.example/g) ?? []).length === 1 && /ATTENDEE[^\r]*form@client\.example/.test(unfolded), unfolded);
  const long = fold(`DESCRIPTION:${"é".repeat(60)}`);
  ok("FO-3 ics: lines fold at 75 octets without splitting a character", long.split("\r\n ").every((l, i) => Buffer.byteLength(l) <= (i ? 74 : 75)) && long.replace(/\r\n /g, "") === `DESCRIPTION:${"é".repeat(60)}`);
  ok("FO-3 ics: text is escaped (comma, semicolon, newline)", bookingIcs({ bookingId: phoneOk.id, sequence: 1, method: "CANCEL", startsAt: new Date(), endsAt: new Date(), stamp: new Date(), summary: "a,b;c\nd", description: "x", organizer: { name: "F", email: "f@x.example" }, attendee: { name: "P", email: "p@x.example" } }).includes("SUMMARY:a\\,b\\;c\\nd"));

  // ------------------------------------------------------------------------------------------ self-service tokens
  const sv = await book(S, "free", "2026-11-04 10:00", "self");
  const second = await db.$transaction((tx) => issueToken(tx, A.id, sv.id, new Date(sv.endsAt)));
  ok("FO-3 tokens pass: two live links for one booking both open it", (await S.manageView(sv.manageToken, "ip")).status === "SCHEDULED" && (await S.manageView(second, "ip")).status === "SCHEDULED");
  // M2 (review): a reschedule to the booking's own time writes nothing: no audit line, no event, the links and reminders stay.
  const evSame = await db.moduleEvent.count({ where: { subjectId: sv.id } }), audSame = (main.audit as ReturnType<typeof fakeAudit>).entries.length;
  const same = await S.selfReschedule(sv.manageToken, { startsAt: iso("2026-11-04 10:00") }, "ip");
  ok("FO-3 reschedule: to its own time → no event, no audit line, sequence 0, both links still live, the reminders still waiting",
    same.status === "SCHEDULED" && same.manageToken === sv.manageToken && await db.moduleEvent.count({ where: { subjectId: sv.id } }) === evSame && (main.audit as ReturnType<typeof fakeAudit>).entries.length === audSame
      && (await db.foBooking.findUniqueOrThrow({ where: { id: sv.id } })).sequence === 0 && (await S.manageView(second, "ip")).status === "SCHEDULED"
      && (main.jobs as ReturnType<typeof fakeJobs>).jobs.filter((j) => j.key.startsWith(`booking:${sv.id}:0:`) && j.status === "waiting").length === 3);
  const mv1 = await full(await S.selfReschedule(sv.manageToken, { startsAt: iso("2026-11-04 11:00") }, "ip"));
  ok("FO-3 door: the public reschedule answer names no host, person, prospect or type", noIds(mv1.answer), mv1.answer);
  const nfBody = await nf(() => S.manageView(sv.manageToken, "ip"));
  ok("FO-3 tokens fail: after a reschedule both old links give the identical not-found; pass: the new link works",
    nfBody === nfs[0] && await nf(() => S.manageView(second, "ip")) === nfs[0] && (await S.manageView(mv1.manageToken, "ip")).status === "RESCHEDULED", nfBody);
  const mv2 = await full(await S.selfReschedule(mv1.manageToken, { startsAt: iso("2026-11-04 14:00") }, "ip"));
  ok("FO-3 reschedule pass: a RESCHEDULED booking reschedules again (sequence 2); the host is kept when free", mv2.status === "RESCHEDULED" && mv2.sequence === 2 && mv2.staffId === A1.id, mv2);
  ok("FO-3 reschedule fail: to a time that is not offered (Sunday) → 409 SLOT_TAKEN with fresh times", (await thrown(() => S.selfReschedule(mv2.manageToken, { startsAt: iso("2026-11-08 10:00") }, "ip")))?.body.code === "SLOT_TAKEN");
  const upd = main.mail.inbox("self@client.example");
  ok("FO-3 ics: the update keeps the UID and carries SEQUENCE:2", upd.length === 3 && icsOf(upd[2]).includes(`UID:${sv.id}@booking.expatready.com`) && icsOf(upd[2]).includes("SEQUENCE:2\r\n"), upd.map((m) => m.subject));
  const garbage = await nf(() => S.manageView("not-a-token", "ip")), forged = await nf(() => S.manageView(`${mv2.manageToken.split(".")[0]}.${"A".repeat(43)}`, "ip"));
  ok("FO-3 tokens fail: a malformed token and a right selector with a wrong verifier give the identical not-found", garbage === nfs[0] && forged === nfs[0]);
  const cxAnswer = await S.selfCancel(mv2.manageToken, "ip");
  const cx = { ...cxAnswer, ...(await db.foBooking.findUniqueOrThrow({ where: { id: sv.id }, select: { sequence: true } })) };
  ok("FO-3 door: the public cancel answer names no host, person, prospect or type", noIds(cxAnswer), cxAnswer);
  ok("FO-3 cancel pass: cancelled by link (sequence 3); METHOD:CANCEL with the same UID", cx.status === "CANCELLED" && cx.sequence === 3 && /METHOD:CANCEL\r\n/.test(icsOf(main.mail.inbox("self@client.example")[3])) && icsOf(main.mail.inbox("self@client.example")[3]).includes(`UID:${sv.id}@`));
  ok("FO-3 cancel fail: the used link now gives the identical not-found; pass: the freed 14:00 is offered again",
    await nf(() => S.selfCancel(mv2.manageToken, "ip")) === nfs[0] && has((await S.publicSlots(A.key, "free", days("2026-11-04 00:00", "2026-11-05 00:00"), "ip")).slots, "2026-11-04 14:00"));

  // a firm on hold answers its links like its page (break B-5)
  const held = await book(S, "free", "2026-11-04 15:00", "held");
  await db.platformFirm.update({ where: { id: A.id }, data: { status: "PAYMENT_HOLD" } });
  const heldNf = await nf(() => S.manageView(held.manageToken, "ip")), heldMove = (await thrown(() => S.selfReschedule(held.manageToken, { startsAt: iso("2026-11-04 16:00") }, "ip")))?.status;
  await db.platformFirm.update({ where: { id: A.id }, data: { status: "ACTIVE" } });
  ok("FO-3 tokens fail: while the firm is on payment hold its links give the identical not-found and move nothing; pass: back to Active, the link works",
    heldNf === nfs[0] && heldMove === 404 && (await db.foBooking.findUniqueOrThrow({ where: { id: held.id } })).startsAt.getTime() === at("2026-11-04 15:00").getTime() && (await S.manageView(held.manageToken, "ip")).status === "SCHEDULED");

  // the self-service limit (4 h) and the end of the meeting
  const lim = await book(S, "free", "2026-11-05 10:00", "limit");
  const back = clock.now();
  await clock.set(at("2026-11-05 05:30"));
  ok("FO-3 limit pass: 4 h 30 min before, the link can still change it", (await S.manageView(lim.manageToken, "ip")).canChange === true);
  await clock.set(at("2026-11-05 07:00"));
  const view = await S.manageView(lim.manageToken, "ip");
  ok("FO-3 limit fail: 3 h before, the page says to reply or call, and a reschedule or cancel is refused 409",
    view.canChange === false && /reply to your confirmation email or call/.test(view.message ?? "") && (await thrown(() => S.selfCancel(lim.manageToken, "ip")))?.body.code === "SELF_SERVICE_CLOSED" && (await thrown(() => S.selfReschedule(lim.manageToken, { startsAt: iso("2026-11-05 15:00") }, "ip")))?.status === 409);
  await clock.set(at("2026-11-05 10:31"));
  ok("FO-3 tokens fail: after the meeting's end the link gives the identical not-found", await nf(() => S.manageView(lim.manageToken, "ip")) === nfs[0]);
  await clock.set(back);

  // -------------------------------------------------------------------- reminders, attendance question, no auto no-show
  const rem = make();
  await rem.svc.registerJobs();
  const ctxA = fakeStaff({ firmId: A.id, firmKey: A.key, staffId: A1.id, keys: ["agent/booking:create", "agent/booking:edit", "agent/booking:list"] });
  await clock.set(at("2026-11-02 08:00"));
  const rb = await book(rem.svc, "free", "2026-11-06 10:00", "remind");
  const scheduled = rem.jobs as ReturnType<typeof fakeJobs>;
  ok("FO-3 reminders: 24 h and 1 h reminders and the attendance question are queued on JobPort with sequence keys",
    ["reminder-24h", "reminder-1h", "attendance"].every((k) => scheduled.jobs.some((j) => j.key === `booking:${rb.id}:0:${k}`)) && scheduled.jobs.find((j) => j.key.endsWith(":0:reminder-24h"))!.runAt.getTime() === at("2026-11-05 10:00").getTime());
  await clock.set(at("2026-11-05 10:01"));
  const remMails = () => rem.mail.inbox("remind@client.example").filter((m) => m.templateKey?.startsWith("booking.reminder"));
  ok("FO-3 reminders pass: the 24 h reminder is sent at its time", remMails().length === 1 && remMails()[0].templateKey === "booking.reminder_24h");
  const moved2 = await rem.svc.staffReschedule(ctxA, rb.id, { startsAt: iso("2026-11-06 14:00") });
  await clock.set(at("2026-11-06 09:30"));
  const oneHour = () => remMails().filter((m) => m.templateKey === "booking.reminder_1h");
  ok("FO-3 reminders fail: after a reschedule the old 1 h reminder (09:00) is not sent", oneHour().length === 0, remMails().map((m) => m.templateKey));
  ok("FO-3 reminders: the moved meeting (Fri 14:00) got its own 24 h reminder (Thu 14:00)", remMails().filter((m) => m.templateKey === "booking.reminder_24h").length === 2);
  await clock.set(at("2026-11-06 13:01"));
  ok("FO-3 reminders pass: the new 1 h reminder (13:00) is sent once", oneHour().length === 1 && moved2.sequence === 1);
  await clock.set(at("2026-11-06 15:01"));
  ok("FO-3 attendance: 30 min after the end the host is asked \"Did they attend?\"", rem.mail.inbox("a1@staff.example").some((m) => m.templateKey === "booking.attendance_ask"));
  ok("FO-3 attendance: the question is due on the host's list", (await rem.svc.attendanceDue(ctxA)).some((b) => b.id === rb.id));
  await clock.set(at("2026-11-10 12:00"));
  ok("FO-3 attendance fail: four days later nothing has marked it (still RESCHEDULED, no no-show event)",
    (await db.foBooking.findUniqueOrThrow({ where: { id: rb.id } })).status === "RESCHEDULED" && await db.moduleEvent.count({ where: { subjectId: rb.id, type: EVENT.BOOKING_NO_SHOW } }) === 0);
  const att = await rem.svc.recordAttendance(ctxA, rb.id, "COMPLETED");
  const ns = await rem.svc.recordAttendance(ctxA, rb.id, "NO_SHOW");
  ok("FO-3 attendance pass: a person answers Attended (booking.completed), then changes it to No-show (booking.no_show)",
    att.status === "COMPLETED" && ns.status === "NO_SHOW" && await db.moduleEvent.count({ where: { subjectId: rb.id, type: { in: [EVENT.BOOKING_COMPLETED, EVENT.BOOKING_NO_SHOW] } } }) === 2);
  await clock.set(back);
  const early = await book(S, "free", "2026-11-09 10:00", "early");
  ok("FO-3 attendance fail: before the meeting has started → 409", (await thrown(() => S.recordAttendance(ctxA, early.id, "COMPLETED")))?.status === 409);

  // ---------------------------------------------------------------------------------- staff services and the firm wall
  const ctxA2 = fakeStaff({ firmId: A.id, firmKey: A.key, staffId: A2.id, keys: [] });
  const ctxB = fakeStaff({ firmId: B.id, firmKey: B.key, staffId: B1.id, keys: ["agent/booking:create", "agent/booking:edit", "agent/booking:list"] });
  const pid = main.arrival.addPerson(A.id, { givenNames: "Lee", familyName: "Sample", email: "lee@client.example" });
  const sb = { typeId: T.base.id, personId: pid, mode: "VIDEO", startsAt: iso("2026-11-09 11:00"), timeZone: TZ };
  ok("FO-3 staff fail: creating without agent/booking:create → 403", (await thrown(() => S.staffCreate(ctxA2, sb)))?.status === 403);
  const sc = await S.staffCreate(ctxA, sb);
  // M4 (review): a staff booking moves the person's only open prospect to Consult through the port; the prospect is never
  // taken from the body; a person of another firm is 404.
  const kim = main.arrival.addPerson(A.id, { givenNames: "Kim", familyName: "Sample", email: "kim@client.example" });
  const kimPros = main.arrival.addProspect(A.id, "kim@client.example", "ENGAGED");
  const kb = await S.staffCreate(ctxA, { ...sb, personId: kim, startsAt: iso("2026-11-09 13:00") });
  const kimNow = main.arrival.prospects.find((p) => p.id === kimPros.id)!;
  ok("FO-3 staff pass: a staff booking moves the person's only open prospect to Consult with its cause, and names it", kb.prospectId === kimPros.id && kimNow.stage === "CONSULT" && kimNow.causes.join() === "consult booked", { kb, kimNow });
  const bPerson = main.arrival.addPerson(B.id, { givenNames: "Bo", familyName: "Sample", email: "bo@client.example" });
  ok("FO-3 staff fail: a prospect id in the body is refused (400); a person of firm B booked by firm A → 404, nothing saved",
    (await thrown(() => S.staffCreate(ctxA, { ...sb, prospectId: kimPros.id, startsAt: iso("2026-11-09 14:00") })))?.status === 400
      && (await thrown(() => S.staffCreate(ctxA, { ...sb, personId: bPerson, startsAt: iso("2026-11-09 14:00") })))?.status === 404
      && await db.foBooking.count({ where: { firmId: A.id, startsAt: at("2026-11-09 14:00") } }) === 0);
  ok("FO-3 staff fail: a booking id that is not a uuid → 404 (never 500)", (await thrown(() => S.staffGet(ctxA, "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz")))?.status === 404 && (await thrown(() => S.staffCancel(ctxA, "------------------------------------")))?.status === 404);

  // M3 (review): every change writes one audit line in its transaction; a forced audit failure rolls each one back.
  const auditLines = (id: string, action: string) => (main.audit as ReturnType<typeof fakeAudit>).entries.filter((e) => e.entityKey === id && e.action === action).length;
  for (const [action, run, check] of [
    ["booking.rescheduled", (svc: BookingService) => svc.staffReschedule(ctxA, kb.id, { startsAt: iso("2026-11-09 15:00") }), async () => (await db.foBooking.findUniqueOrThrow({ where: { id: kb.id } })).startsAt.getTime() === at("2026-11-09 13:00").getTime()],
    ["booking.cancelled", (svc: BookingService) => svc.staffCancel(ctxA, kb.id), async () => (await db.foBooking.findUniqueOrThrow({ where: { id: kb.id } })).status !== "CANCELLED"],
    ["booking.completed", (svc: BookingService) => svc.recordAttendance(ctxA, susp.id, "COMPLETED"), async () => (await db.foBooking.findUniqueOrThrow({ where: { id: susp.id } })).status === "SCHEDULED"],
  ] as const) {
    const id = action === "booking.completed" ? susp.id : kb.id;
    if (action === "booking.completed") await clock.set(at("2026-10-27 15:31"));   // after the meeting began
    const failing = make({ audit: fakeAudit({ failOn: (e) => e.action === action }), arrival: main.arrival });
    const ev0 = await db.moduleEvent.count({ where: { subjectId: id } });
    ok(`FO-3 audit fail: a forced audit failure on ${action} rolls it back (row unchanged, no event)`, String((await thrown(() => run(failing.svc)))?.body.message ?? "").includes("forced audit failure") && await check() && await db.moduleEvent.count({ where: { subjectId: id } }) === ev0);
    await run(S);
    ok(`FO-3 audit pass: ${action} wrote exactly one audit line and one event`, auditLines(id, action) === 1 && await db.moduleEvent.count({ where: { subjectId: id } }) === ev0 + 1, auditLines(id, action));
    if (action === "booking.completed") await clock.set(back);
  }
  ok("FO-3 staff pass: a staff member with the key books for a person (no arrival run, audit actor staff:<id>)", sc.status === "SCHEDULED" && sc.personId === pid && (main.audit as ReturnType<typeof fakeAudit>).entries.at(-1)?.actor === `staff:${A1.id}`);
  ok("FO-3 staff fail: firm B's staff reading, moving or cancelling firm A's booking → 404 (never 403)",
    (await thrown(() => S.staffGet(ctxB, sc.id)))?.status === 404 && (await thrown(() => S.staffCancel(ctxB, sc.id)))?.status === 404 && (await thrown(() => S.staffReschedule(ctxB, sc.id, { startsAt: iso("2026-11-09 13:00") })))?.status === 404);
  ok("FO-3 staff fail: firm B cannot book firm A's type (404)", (await thrown(() => S.staffCreate(ctxB, sb)))?.status === 404);
  const listA2 = await S.staffList(ctxA2, { from: iso("2026-10-26 00:00"), to: iso("2026-11-14 00:00") });
  const listA = await S.staffList(ctxA, { from: iso("2026-10-26 00:00"), to: iso("2026-11-14 00:00") });
  ok("FO-3 staff list: without agent/booking:list a person sees only the bookings they host; pass: with it, the firm's",
    listA2.length > 0 && listA2.every((b) => b.staffId === A2.id) && listA.some((b) => b.staffId === A1.id) && listA.length > listA2.length);
  ok("FO-3 staff fail: the host without the edit key may not cancel (403)", (await thrown(() => S.staffCancel(ctxA2, t1.id)))?.status === 403);
  const scx = await S.staffCancel(ctxA, sc.id);
  ok("FO-3 staff pass: cancel by staff → CANCELLED, booking.cancelled event", scx.status === "CANCELLED" && await db.moduleEvent.count({ where: { subjectId: sc.id, type: EVENT.BOOKING_CANCELLED } }) === 1);
  ok("FO-3 no money: no booking route or table takes a payment (no amount, card or price field in the answer)", !/amount|price|card|payment/i.test(JSON.stringify(sc)));

  // --------------------------------------------------------------------------------------- over HTTP, with the guard
  // The app's decorators need the api's tsconfig, so the route checks run in a child of this file (`--serve`): the real
  // controller and read guard on this scratch database, its own fake clock at Mon 26 Oct 08:00, 5 slot reads per IP.
  const child = spawn(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), import.meta.filename, "--serve"], { env: { ...process.env, DATABASE_URL: URL }, stdio: ["ignore", "pipe", "inherit"] });
  server = child;
  const base = await new Promise<string>((resolve, reject) => {
    let out = "";
    child.stdout.on("data", (d: Buffer) => { out += d; const m = /^LISTEN (\S+)$/m.exec(out); if (m) resolve(m[1]); });
    child.on("exit", (c) => reject(new Error(`the route server stopped (${c}): ${out}`)));
    setTimeout(() => reject(new Error(`the route server did not start in 60 s: ${out}`)), 60_000).unref();
  });
  const get = async (p: string) => { const r = await fetch(`${base}${p}`); return { status: r.status, body: await r.text() }; };
  const h1 = await get(`/api/public/firms/${A.key}/book/free/slots`);
  ok("FO-3 http pass: the slots route answers 200 with no person header (open door)", h1.status === 200 && JSON.parse(h1.body).slots.length > 0, h1.status);
  const hs = [await get(`/api/public/firms/nope/book/free/slots`), await get(`/api/public/firms/${A.key}/book/nope/slots`), await get(`/api/public/firms/${A.key}/book/retired/slots`), await get(`/api/public/bookings/not-a-token`)];
  ok("FO-3 http fail: unknown firm, unknown slug, inactive type and a bad link → 404 with the identical body", hs.every((r) => r.status === 404) && new Set(hs.map((r) => r.body)).size === 1, hs);
  const many = [];
  for (let i = 0; i < 4; i++) many.push((await get(`/api/public/firms/${A.key}/book/free/slots`)).status);
  ok("FO-3 http fail: past 5 slot reads from one IP in the window (the 404s count too) → 429 (rate limit); pass: the fifth is 200", many[0] === 200 && many.slice(1).every((s) => s === 429), many);
  const post = await fetch(`${base}/api/public/firms/${A.key}/book/free/bookings`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ givenNames: "x" }) });
  ok("FO-3 http fail: a POST with a half-filled form → 400 with the issues listed, nothing booked", post.status === 400 && Array.isArray((await post.json()).issues));
} catch (e) {
  fail++;
  console.log(`FAIL  FO-3 check stopped: ${e instanceof Error ? e.stack : String(e)}`);
} finally {
  server?.kill();
  await db.$disconnect();
  execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", DB]);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

/** The child: the public controller with the real read guard, on the parent's database (DATABASE_URL). Never returns. */
async function serve(): Promise<never> {
  const { NestFactory, APP_GUARD } = await import("@nestjs/core");
  const { Module } = await import("@nestjs/common");
  const core = await import("../api/src/core.ts");
  const pc = await import("../api/src/front-office/booking/public.controller.ts");
  const clock = new FakeClock(at("2026-10-26 08:00"));
  const ports: BookingPorts = { audit: fakeAudit() as AuditPort<never>, clock, jobs: fakeJobs(clock), mail: fakeMail(), arrival: fakeArrival(), publicBaseUrl: "http://localhost", limits: { slotsPerIp: 5 } };
  class TestModule {}
  Module({ controllers: [pc.BookingPublicController], providers: [core.Db, pc.Booking, { provide: pc.BOOKING_PORTS, useValue: ports }, { provide: APP_GUARD, useClass: core.ConfigReadGuard }] })(TestModule);
  const nest = await NestFactory.create(TestModule, { logger: false });
  await nest.listen(0, "127.0.0.1");
  console.log(`LISTEN ${(await nest.getUrl()).replace("[::1]", "127.0.0.1")}`);
  return new Promise<never>(() => {});
}
