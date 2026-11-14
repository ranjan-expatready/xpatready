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
import { firmScope } from "../platform/firm-scope.ts";
import { readSampleFirms } from "../platform/seed-sample-firms.ts";
import { BUSINESS_HOURS, readSetting, TIME_ZONE } from "../platform/settings.ts";

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");
  const url = process.env.DATABASE_URL ?? "postgresql://xr_studio@127.0.0.1:54329/xr_studio_demo";   // as core.ts DATABASE_URL
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, options: "-c TimeZone=UTC" }) });
  try { console.log(JSON.stringify(await seedSampleStaffHours(db))); } finally { await db.$disconnect(); }
}
