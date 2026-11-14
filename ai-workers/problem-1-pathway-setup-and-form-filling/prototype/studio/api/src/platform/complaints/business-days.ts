// PF-21: the acknowledgement date of a complaint, in the firm's own calendar. "Promptly respond" (Code SOR/2022-128 s. 29)
// is given a Sample period, ACK_BUSINESS_DAYS business days, until the College's by-laws are read: the deadline is the
// closing time of the Nth business day after the day the complaint was received, in the firm's time zone, where a business
// day is a weekday with opening hours (platform.business_hours) that is not a closed day (platform.closed_days). No date
// library: Intl gives the zone's offset (the same way settings.ts checks zone names).

/** Sample (FO-13k rev 12): 2 business days, to set from the by-laws once read. */
export const ACK_BUSINESS_DAYS = 2;

export type FirmCalendar = { zone: string; hours: { day: string; opens: string; closes: string }[]; closedDays: string[] };

const WEEKDAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function partsIn(zone: string, at: Date): Record<string, string> {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return Object.fromEntries(f.formatToParts(at).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
}

/** The zone's offset from UTC at an instant, in milliseconds. */
function offsetAt(zone: string, at: Date): number {
  const p = partsIn(zone, at);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(at.getTime() / 1000) * 1000;
}

/** The local date (YYYY-MM-DD) of an instant in a zone. */
export function localDate(zone: string, at: Date): string {
  const p = partsIn(zone, at);
  return `${p.year}-${p.month}-${p.day}`;
}

/** The instant of a local wall-clock time (date YYYY-MM-DD, time HH:MM) in a zone. */
export function zonedInstant(date: string, hhmm: string, zone: string): Date {
  const [y, m, d] = date.split("-").map(Number), [h, mi] = hhmm.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, mi);
  let at = wall - offsetAt(zone, new Date(wall));
  at = wall - offsetAt(zone, new Date(at));   // once more across a change of offset (daylight saving)
  return new Date(at);
}

const nextDate = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const weekdayOf = (date: string) => WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()];

/** The acknowledge-by instant: the closing time of the Nth business day after the received day. A firm with no opening
 *  day at all within a year falls back to N calendar days at 17:00 (never an endless walk). */
export function acknowledgeBy(receivedAt: Date, cal: FirmCalendar, days = ACK_BUSINESS_DAYS): Date {
  const closed = new Set(cal.closedDays), hours = new Map(cal.hours.map((h) => [h.day, h]));
  let date = localDate(cal.zone, receivedAt), counted = 0;
  for (let i = 0; i < 366; i++) {
    date = nextDate(date);
    const h = hours.get(weekdayOf(date));
    if (h && !closed.has(date) && ++counted === days) return zonedInstant(date, h.closes, cal.zone);
  }
  let fallback = localDate(cal.zone, receivedAt);
  for (let i = 0; i < days; i++) fallback = nextDate(fallback);
  return zonedInstant(fallback, "17:00", cal.zone);
}
