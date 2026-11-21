// FO-1b (BACKLOG row FO-1b; AG-4-62 rule 1, AG04-D17, AG04-D22; contracts §7 "Firm settings"): a staff member's starting
// hours are a copy of the firm's business hours setting (platform.business_hours, Sample Mon-Fri 09:00-17:00) in the
// firm's time zone (platform.time_zone). Business hours are used only for this copy; they never limit slots afterwards.
// A person who already has hours is left as they are (idempotent: a second run adds nothing), so the copy is for the
// people a caller names: a new staff member (PF-4's invitation acceptance and FO-3 call copyFirmHoursTo for that one
// person) and, once, the Sample firms' staff (seedSampleStaffHours, after seed-sample-firms.ts). A person who later
// clears every window and is named again gets the firm's hours back: callers name only new people.
// Weekday 0 = Sunday … 6 = Saturday, minutes since local midnight (AG-4-62 rules 2-3). Every value is Sample.
// Run: tsx api/src/front-office/booking-seed.ts   (after tsx api/src/platform/seed-sample-firms.ts)
import type { Prisma, PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { firmScope, touchFirm } from "../platform/firm-scope.ts";
import { readSampleFirms } from "../platform/seed-sample-firms.ts";
import { BUSINESS_HOURS, readSetting, TIME_ZONE } from "../platform/settings.ts";
import { logPort } from "../platform/observability/log.ts";

type Tx = Prisma.TransactionClient;
type BusinessHours = typeof BUSINESS_HOURS.default;
export const WEEKDAY: Record<BusinessHours[number]["day"], number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** The weekly windows a firm's business hours give, in fo_availability's terms. */
export function windowsOf(hours: BusinessHours): { weekday: number; startMinute: number; endMinute: number }[] {
  return hours.map((h) => ({ weekday: WEEKDAY[h.day], startMinute: minutesOf(h.opens), endMinute: minutesOf(h.closes) }))
    .sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
}

/**
 * Copies the firm's business hours to each named staff member of that firm who has no hours yet. A name that is not a
 * staff member of the firm is refused (nothing written). Returns the windows added.
 */
export async function copyFirmHoursTo(db: PrismaClient | Tx, firmId: string, staffIds: string[]): Promise<number> {
  const run = async (tx: Tx) => {
    const ids = [...new Set(staffIds)].sort();
    const staff = await tx.platformStaff.findMany({ where: firmScope(firmId, { id: { in: ids } }), select: { id: true } });
    if (staff.length !== ids.length) throw new Error(`copyFirmHoursTo: ${ids.length - staff.length} of the named people are not staff of firm ${firmId}`);
    const [hours, zone] = [await readSetting<BusinessHours>(tx, firmId, BUSINESS_HOURS.key), await readSetting<string>(tx, firmId, TIME_ZONE.key)];
    const windows = windowsOf(hours);
    let added = 0;
    for (const staffId of ids) {
      // One copy per person at a time (two runs at once would both find no hours).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fo-hours:${firmId}:${staffId}`}))`;
      if (await tx.foAvailability.count({ where: firmScope(firmId, { staffId }) })) continue;
      if (!windows.length) continue;
      added += (await tx.foAvailability.createMany({ data: windows.map((w) => ({ firmId, staffId, timeZone: zone, ...w })) })).count;
    }
    return added;
  };
  return "$transaction" in db ? (db as PrismaClient).$transaction(run) : run(db as Tx);
}

/** The Sample firms' staff get the firm's hours (those who have none). Returns the windows added per firm key. */
export async function seedSampleStaffHours(db: PrismaClient): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const f of readSampleFirms()) {
    const firm = await db.platformFirm.findUnique({ where: { key: f.key }, select: { id: true } });
    if (!firm) { out[f.key] = 0; continue; }
    const staff = await db.platformStaff.findMany({ where: firmScope(firm.id), select: { id: true } });
    out[f.key] = await copyFirmHoursTo(db, firm.id, staff.map((s) => s.id));
  }
  return out;
}

/** DEMO-LINK: the one Sample consultation type, so the Sample firm's public booking page (/book/sample-firm) is not empty.
 *  Every value is Sample: no fee, no official value; AG-4-66's Sample defaults for the timings. */
export const SAMPLE_TYPE = { firmKey: "sample-firm", hostActorId: "user-R", slug: "sample-free-consultation", name: "Free consultation (Sample)",
  description: "A first conversation about your plans. Sample consultation type for the demo.", minutes: 30 } as const;

/**
 * Adds SAMPLE_TYPE to the Sample firm, hosted by its Owner, once, inside the caller's transaction. A type is matched by
 * its slug only: one with that slug, even one a person deleted (soft) or edited, is never touched again; a person who
 * changes the slug gets a fresh Sample type on the next seed. The host gets the firm's hours only when they have none
 * (copyFirmHoursTo), so the page offers times. The firm's platform.bypass line (touchFirm) is written only when the type
 * is added; on the demo reset it runs in the Sample seed's own transaction (seedSampleFirms' `then`), where that firm
 * is touched already, so the reset still writes one seed line per firm (check_aud1a_insert_only.ts). The answer says
 * whether it added the type and, when not, why (logged at info by the callers).
 */
export async function addSampleConsultationType(tx: Tx): Promise<{ added: boolean; why: string }> {
  const firm = await tx.platformFirm.findUnique({ where: { key: SAMPLE_TYPE.firmKey }, select: { id: true } });
  if (!firm) return { added: false, why: `no firm ${SAMPLE_TYPE.firmKey} yet (PF-3's seed runs first)` };
  const host = await tx.platformStaff.findFirst({ where: firmScope(firm.id, { actorId: SAMPLE_TYPE.hostActorId }), select: { id: true } });
  if (!host) return { added: false, why: `the Owner ${SAMPLE_TYPE.hostActorId} is not staff of ${SAMPLE_TYPE.firmKey}` };
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fo-sample-type:${firm.id}`}))`;
  if (await tx.foConsultationType.findFirst({ where: firmScope(firm.id, { slug: SAMPLE_TYPE.slug }), select: { id: true } })) return { added: false, why: `a type with slug ${SAMPLE_TYPE.slug} is there already` };
  await touchFirm(tx, firm.id);   // PF-12b: the bypass line for this firm (nothing outside a bypass use; once per transaction)
  await copyFirmHoursTo(tx, firm.id, [host.id]);
  await tx.foConsultationType.create({ data: { firmId: firm.id, slug: SAMPLE_TYPE.slug, name: SAMPLE_TYPE.name, description: SAMPLE_TYPE.description,
    purpose: "FREE_CONSULT", modes: ["VIDEO", "PHONE"], hostStaffIds: [host.id], minutes: SAMPLE_TYPE.minutes } });
  return { added: true, why: "added" };
}

/** The same behind a savepoint, so a failure (an older schema, say) is logged and undoes only this step, never the
 *  caller's transaction (the Sample firms' seed). Returns whether it added the type. */
export async function addSampleConsultationTypeSafely(tx: Tx, where: string): Promise<boolean> {
  await tx.$executeRaw`SAVEPOINT demo_link_sample_type`;
  try {
    const r = await addSampleConsultationType(tx);
    await tx.$executeRaw`RELEASE SAVEPOINT demo_link_sample_type`;
    if (!r.added) console.info(`${where}: Sample consultation type not added (DEMO-LINK): ${r.why}`);
    return r.added;
  } catch (e) {
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT demo_link_sample_type`;
    logPort.error("demo_link_sample_type_failed", e, { at: where });   // PF-23m: the error object, never its text in the line
    return false;
  }
}

/** In a transaction of its own (the start-up seed, outside any bypass use). */
export const seedSampleConsultationType = (db: PrismaClient, where = "platform"): Promise<boolean> => db.$transaction((tx) => addSampleConsultationTypeSafely(tx, where));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");
  const url = process.env.DATABASE_URL ?? "postgresql://xr_studio@127.0.0.1:54329/xr_studio_demo";   // as core.ts DATABASE_URL
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, options: "-c TimeZone=UTC" }) });
  try { console.log(JSON.stringify(await seedSampleStaffHours(db))); } finally { await db.$disconnect(); }
}
