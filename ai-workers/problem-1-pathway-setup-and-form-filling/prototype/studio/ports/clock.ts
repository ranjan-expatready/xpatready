// PF-0p (rows rev 16): the clock port. Code that decides by time (expiry, reminders, trial ends, due dates) asks the
// clock, never `new Date()`, so a test can set and advance it. This folder imports only zod and its own files.

export interface ClockPort {
  now(): Date;
}

/** The real clock (no service behind it, so it lives with the port). */
export const systemClock: ClockPort = { now: () => new Date() };

type Listener = (now: Date) => Promise<void> | void;

/** A clock a test moves. `set` and `advance` wait for whatever listens (fakeJobs runs due jobs then): await them. */
export class FakeClock implements ClockPort {
  private at: number;
  private readonly listeners: Listener[] = [];
  constructor(start: Date | string = "2026-11-24T14:00:00.000Z") { this.at = toMs(start); }
  now(): Date { return new Date(this.at); }
  /** Moves the clock to `to` (either way). */
  async set(to: Date | string): Promise<void> { this.at = toMs(to); await this.tell(); }
  /** Moves the clock forward by milliseconds, or by { days, hours, minutes, seconds }; never backward. */
  async advance(by: number | { days?: number; hours?: number; minutes?: number; seconds?: number }): Promise<void> {
    const ms = typeof by === "number" ? by : ((by.days ?? 0) * 24 * 60 + (by.hours ?? 0) * 60 + (by.minutes ?? 0)) * 60_000 + (by.seconds ?? 0) * 1000;
    if (!Number.isFinite(ms) || ms < 0) throw new RangeError(`FakeClock.advance: ${JSON.stringify(by)} is not a forward step`);
    this.at += ms;
    await this.tell();
  }
  /** Called after each move (in the order added). */
  onChange(fn: Listener): void { this.listeners.push(fn); }
  private async tell() { for (const fn of this.listeners) await fn(this.now()); }
}

function toMs(d: Date | string): number {
  const ms = (typeof d === "string" ? new Date(d) : d).getTime();
  if (!Number.isFinite(ms)) throw new RangeError(`FakeClock: ${String(d)} is not a time`);
  return ms;
}
