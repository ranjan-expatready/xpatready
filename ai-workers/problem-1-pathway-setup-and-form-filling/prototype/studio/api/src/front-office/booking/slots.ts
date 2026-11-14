// FO-3 (contracts §2.2, §7 §2.2; AG-4-1, -2, -3, -4, -5, -7, -12, -18, -53, -62, -66; BR-1, BR-2): which start times a
// consultation type offers. A pure function: the caller reads the rows (service.ts) and this decides, so every rule is
// tested without a database. A slot is offered when at least one of the type's active hosts is free for it, and its hosts
// are listed in the type's own order (the first free one takes it, AG-4-12 rules 2, 5).
//   * Hours: each host's weekly windows, read in the window's own IANA zone (AG-4-62 rules 2-4); a start every slot
//     interval (empty = the meeting's length, AG-4-1 rule 2) while the meeting still ends inside the window.
//   * DST (AG-4-1 rule 8): a wall time the clocks skip is not offered; a wall time that happens twice is offered once,
//     at its first moment.
//   * Never inside the shortest notice, never beyond the booking window (AG-4-4, -5, -66), never on a firm closed day
//     (AG-4-7; the date in the firm's zone, at the start and at the end), never during the host's time off (AG-4-62 rule
//     5), never where the padded range [start − gap before, end + gap after) meets one of the host's active bookings'
//     padded ranges (BR-3: the same rule the database's exclusion keeps).
// Times with @date-fns/tz (PF-L): tzOffset gives a zone's offset at a moment.
import { tzOffset } from "@date-fns/tz";

export type SlotType = {
  minutes: number; gapBeforeMinutes: number; gapAfterMinutes: number; minNoticeMinutes: number; windowDays: number;
  slotIntervalMinutes: number | null; hostStaffIds: string[];
};
export type HostWindow = { weekday: number; startMinute: number; endMinute: number; timeZone: string };
export type Range = { from: Date; to: Date };
export type SlotInput = {
  type: SlotType;
  /** The active hosts' windows by staff id (an inactive or unknown host is simply absent: never offered, AG-4-53). */
  hours: Map<string, HostWindow[]>;
  /** Padded ranges of each host's active bookings. */
  busy: Map<string, Range[]>;
  /** Each host's time off. */
  timeOff: Map<string, Range[]>;
  /** YYYY-MM-DD dates in the firm's zone. */
  closedDays: string[];
  firmZone: string;
  now: Date;
  from: Date;
  to: Date;
};
export type Slot = { startsAt: Date; endsAt: Date; staffIds: string[] };

const MIN = 60_000, DAY = 24 * 60 * MIN;

/** The moment a wall-clock time happens in `zone`: the first one when it happens twice, null when the clocks skip it. */
export function wallToUtc(y: number, month: number, d: number, minute: number, zone: string): Date | null {
  const wall = Date.UTC(y, month - 1, d, 0, minute);
  const offsets = new Set([tzOffset(zone, new Date(wall - DAY / 2)), tzOffset(zone, new Date(wall + DAY / 2)), tzOffset(zone, new Date(wall))]);
  const hits = [...offsets].map((off) => wall - off * MIN).filter((t) => tzOffset(zone, new Date(t)) * MIN === wall - t).sort((a, b) => a - b);
  return hits.length ? new Date(hits[0]) : null;
}

/** The calendar date (YYYY-MM-DD) and weekday (0 = Sunday) of a moment in `zone`. */
export function localDate(at: Date, zone: string): { y: number; m: number; d: number; iso: string; weekday: number } {
  const t = new Date(at.getTime() + tzOffset(zone, at) * MIN);
  const [y, m, d] = [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
  return { y, m, d, weekday: t.getUTCDay(), iso: `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

const meets = (a: Range, b: Range) => a.from < b.to && b.from < a.to;

export function computeSlots(i: SlotInput): Slot[] {
  const { type } = i;
  const earliest = Math.max(i.from.getTime(), i.now.getTime() + type.minNoticeMinutes * MIN);
  const latest = Math.min(i.to.getTime() - 1, i.now.getTime() + type.windowDays * DAY);
  if (earliest > latest) return [];
  const step = type.slotIntervalMinutes ?? type.minutes;
  const closed = new Set(i.closedDays);
  const byStart = new Map<number, Slot>();
  for (const staffId of type.hostStaffIds) {
    const windows = i.hours.get(staffId);
    if (!windows?.length) continue;
    const busy = i.busy.get(staffId) ?? [], off = i.timeOff.get(staffId) ?? [];
    for (const w of windows) {
      // Every calendar date the range can touch in the window's zone (one day either side covers any offset).
      const first = localDate(new Date(earliest - DAY), w.timeZone), last = localDate(new Date(latest + DAY), w.timeZone);
      for (let c = Date.UTC(first.y, first.m - 1, first.d); c <= Date.UTC(last.y, last.m - 1, last.d); c += DAY) {
        const cal = new Date(c), day = { y: cal.getUTCFullYear(), m: cal.getUTCMonth() + 1, d: cal.getUTCDate() };
        if (cal.getUTCDay() !== w.weekday) continue;
        for (let m = w.startMinute; m + type.minutes <= w.endMinute; m += step) {
          const start = wallToUtc(day.y, day.m, day.d, m, w.timeZone);
          if (!start) continue;
          const s = start.getTime(), e = s + type.minutes * MIN;
          if (s < earliest || s > latest) continue;
          if (closed.has(localDate(start, i.firmZone).iso) || closed.has(localDate(new Date(e - 1), i.firmZone).iso)) continue;
          const meeting = { from: start, to: new Date(e) };
          if (off.some((r) => meets(meeting, r))) continue;
          const padded = { from: new Date(s - type.gapBeforeMinutes * MIN), to: new Date(e + type.gapAfterMinutes * MIN) };
          if (busy.some((r) => meets(padded, r))) continue;
          const slot = byStart.get(s) ?? { startsAt: start, endsAt: new Date(e), staffIds: [] };
          if (!slot.staffIds.includes(staffId)) slot.staffIds.push(staffId);
          byStart.set(s, slot);
        }
      }
    }
  }
  const order = (id: string) => type.hostStaffIds.indexOf(id);
  return [...byStart.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .map((s) => ({ ...s, staffIds: s.staffIds.sort((a, b) => order(a) - order(b)) }));
}
