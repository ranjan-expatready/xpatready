import { afterEach, describe, expect, it } from 'vitest';
import type { ScriptZone } from '../bridge-types.js';
import { afterEachDispose, expectScriptError, makeHarness } from './helpers.js';

afterEach(afterEachDispose);

const HOUR = 3_600_000;
const MINUTE = 60_000;

/** A zone that never changes, `minutes` east of UTC. */
const fixedZone = (minutes: number): ScriptZone => ({ fixed: true, offsetMs: () => minutes * MINUTE });

/** A zone with daylight saving: +1h until the first switch, +2h until the second, +1h after. Pure arithmetic, no tz database. */
const SPRING = Date.UTC(2026, 2, 29, 1, 0, 0);
const AUTUMN = Date.UTC(2026, 9, 25, 1, 0, 0);
const switching: ScriptZone = { fixed: false, offsetMs: (t) => (t >= SPRING && t < AUTUMN ? 2 * HOUR : HOUR) };

/** Runs `run` with the process timezone set to `tz` and restores it afterwards. */
function underProcessZone<T>(tz: string, run: () => T): T {
  const before = process.env['TZ'];
  process.env['TZ'] = tz;
  try {
    return run();
  } finally {
    if (before === undefined) delete process.env['TZ'];
    else process.env['TZ'] = before;
  }
}

const at = (y: number, mo: number, d: number, h = 0, mi = 0): number => Date.UTC(y, mo, d, h, mi);
const clockAt = (t: number): { now: () => number } => ({ now: () => t });

describe('the guest Date follows the injected zone, not the process timezone (plan decision D9)', () => {
  it('with no zone given the guest local time is UTC', async () => {
    const { sandbox } = await makeHarness();
    expect(sandbox.evaluate('var d = new Date(2026, 5, 15, 23, 30); [d.getTime(), d.getHours(), d.getTimezoneOffset(), d.toString()]')).toEqual([
      at(2026, 5, 15, 23, 30), 23, 0, 'Mon Jun 15 2026 23:30:00 GMT+0000',
    ]);
  });

  it('a fixed east-of-UTC zone moves every local getter, the date and the year across midnight', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(330), clock: clockAt(at(2026, 11, 31, 20, 0)) });
    const out = sandbox.evaluate(
      'var d = new Date(); [d.getFullYear(), d.getMonth(), d.getDate(), d.getDay(), d.getHours(), d.getMinutes(), d.getYear(), d.getTimezoneOffset(), d.getUTCDate(), d.getUTCHours()]',
    );
    expect(out).toEqual([2027, 0, 1, 5, 1, 30, 127, -330, 31, 20]);
  });

  it('a fixed west-of-UTC zone moves the date backwards', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(-480), clock: clockAt(at(2026, 0, 1, 3, 15)) });
    expect(sandbox.evaluate('var d = new Date(); [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getTimezoneOffset()]')).toEqual([2025, 11, 31, 19, 480]);
  });

  it('new Date(y, m, d, ...) reads its fields as local time in the zone, and a numeric time value is untouched', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(330) });
    expect(sandbox.evaluate('[new Date(2026, 5, 15, 23, 30).getTime(), new Date(2026, 5, 15).getTime(), new Date(99, 0, 1).getFullYear(), new Date(5, 0).getTime(), new Date(86400000).getTime()]')).toEqual([
      at(2026, 5, 15, 18, 0), at(2026, 5, 14, 18, 30), 1999, Date.UTC(1905, 0, 1) - 330 * MINUTE, 86_400_000,
    ]);
  });

  it('the leap-day probe the forms use (new Date(year, 1, 29).getDate() == 29) is right in any zone', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(-720) });
    expect(sandbox.evaluate('[new Date(2024, 1, 29).getDate(), new Date(2023, 1, 29).getDate(), new Date(2100, 1, 29).getDate()]')).toEqual([29, 1, 1]);
  });

  it('local setters edit the wall-clock fields of the zone and roll over like the language says', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(330), clock: clockAt(at(2026, 5, 15, 12, 0)) });
    const out = sandbox.evaluate(
      'var d = new Date(); d.setHours(0, 15); var a = d.getTime(); d.setDate(32); var b = [d.getMonth(), d.getDate()]; d.setMonth(0, 31); d.setFullYear(2028, 1, 29); var c = [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]; d.setMinutes(75); d.setSeconds(61, 5); [a, b, c, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]',
    );
    expect(out).toEqual([at(2026, 5, 14, 18, 45), [6, 2], [2028, 1, 29, 0, 15], 1, 16, 1, 5]);
  });

  it('setYear keeps the legacy two-digit rule, and setFullYear on an invalid date starts from the local epoch', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(60) });
    const out = sandbox.evaluate('var d = new Date(2020, 0, 1); d.setYear(95); var e = new Date(NaN); e.setFullYear(2001); [d.getFullYear(), e.getFullYear(), e.getHours(), isNaN(new Date(NaN).getHours())]');
    expect(out).toEqual([1995, 2001, 0, true]);
  });

  it('the string forms use the zone: offset in GMT+hhmm, and the locale forms match the engine\'s own shapes', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(-90), clock: clockAt(at(2026, 0, 5, 14, 3)) });
    const out = sandbox.evaluate('var d = new Date(); [d.toString(), d.toDateString(), d.toTimeString(), d.toLocaleString(), d.toLocaleDateString(), d.toLocaleTimeString(), Date(), String(new Date(NaN)), new Date(NaN).toLocaleString()]');
    expect(out).toEqual([
      'Mon Jan 05 2026 12:33:00 GMT-0130', 'Mon Jan 05 2026', '12:33:00 GMT-0130', '01/05/2026, 12:33:00 PM', '01/05/2026', '12:33:00 PM',
      'Mon Jan 05 2026 12:33:00 GMT-0130', 'Invalid Date', 'Invalid Date',
    ]);
  });

  it('string parsing: date-only and explicit-offset strings are absolute, local strings are read in the zone', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(330) });
    const out = sandbox.evaluate(
      '[Date.parse("2026-06-15"), Date.parse("2026-06-15T10:00:00Z"), Date.parse("2026-06-15T10:00:00+02:00"), Date.parse("2026-06-15T10:00:00"), new Date("Jun 15 2026 10:00:00").getTime(), Date.parse("Mon, 15 Jun 2026 10:00:00 GMT"), isNaN(Date.parse("not a date"))]',
    );
    expect(out).toEqual([at(2026, 5, 15), at(2026, 5, 15, 10), at(2026, 5, 15, 8), at(2026, 5, 15, 4, 30), at(2026, 5, 15, 4, 30), at(2026, 5, 15, 10), true]);
  });

  it('a trailing -dd or +dd is an offset only after a time of day: a date that merely ends in digits is read as local time in the zone, whatever the process timezone', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(330) });
    const src =
      '[Date.parse("10:00 2026-06-15"), Date.parse("2026-06-15 10:00"), Date.parse("2026-06-15 10:00:00-05:00"), Date.parse("2026-06-15T10:00:00+0200"), Date.parse("Jun 15 2026 10:00 +02:00"), isNaN(Date.parse("15-06-2026"))]';
    const expected = [at(2026, 5, 15, 4, 30), at(2026, 5, 15, 4, 30), at(2026, 5, 15, 15), at(2026, 5, 15, 8), at(2026, 5, 15, 8), true];
    for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Kolkata']) expect(underProcessZone(tz, () => sandbox.evaluate(src)), tz).toEqual(expected);
  });

  it('Date stays a real Date: instanceof, constructor identity, UTC getters and ISO output are unchanged by the zone', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(600), clock: clockAt(at(2026, 5, 15, 12)) });
    expect(sandbox.evaluate('var d = new Date(); [d instanceof Date, d.constructor === Date, d.toISOString(), d.getUTCHours(), Date.now(), Date.UTC(2000, 0, 1)]')).toEqual([
      true, true, '2026-06-15T12:00:00.000Z', 12, at(2026, 5, 15, 12), 946_684_800_000,
    ]);
  });

  it('a zone with daylight saving: an instant uses the offset in force at that instant', async () => {
    const { sandbox } = await makeHarness({ zone: switching });
    const out = sandbox.evaluate(
      'var w = new Date(Date.UTC(2026, 0, 15, 12)); var s = new Date(Date.UTC(2026, 6, 15, 12)); [w.getHours(), w.getTimezoneOffset(), s.getHours(), s.getTimezoneOffset(), new Date(Date.UTC(2026, 9, 25, 0, 59)).getHours(), new Date(Date.UTC(2026, 9, 25, 1, 0)).getHours()]',
    );
    expect(out).toEqual([13, -60, 14, -120, 2, 2]);
  });

  it('a local time that does not exist is read with the offset from before the switch, and one that happens twice picks the first', async () => {
    const { sandbox } = await makeHarness({ zone: switching });
    expect(sandbox.evaluate('[new Date(2026, 2, 29, 2, 30).getTime(), new Date(2026, 9, 25, 2, 30).getTime(), new Date(2026, 2, 29, 0, 30).getTime(), new Date(2026, 2, 29, 3, 30).getTime()]')).toEqual([
      at(2026, 2, 29, 1, 30), at(2026, 9, 25, 0, 30), at(2026, 2, 28, 23, 30), at(2026, 2, 29, 1, 30),
    ]);
  });

  it('a fixed zone is asked once when the sandbox is built and never again, a changing zone is asked on every conversion', async () => {
    let fixedCalls = 0;
    const fixed = await makeHarness({ zone: { fixed: true, offsetMs: () => { fixedCalls += 1; return HOUR; } } });
    const built = fixedCalls;
    fixed.sandbox.evaluate('new Date(2026, 0, 1).getHours() + new Date().getHours()');
    expect(fixedCalls).toBe(built);
    let changingCalls = 0;
    const changing = await makeHarness({ zone: { fixed: false, offsetMs: () => { changingCalls += 1; return HOUR; } } });
    changing.sandbox.evaluate('new Date(2026, 0, 1).getHours()');
    expect(changingCalls).toBeGreaterThanOrEqual(2);
  });

  it.each(['UTC', 'Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Auckland', 'Etc/GMT+12'])('output is identical when the process timezone is %s', async (tz) => {
    const { sandbox } = await makeHarness({ zone: fixedZone(330), clock: clockAt(at(2026, 11, 31, 20, 0)) });
    const src =
      'var d = new Date(); var e = new Date(2026, 2, 8, 2, 30); [d.getDate(), d.getHours(), d.getTimezoneOffset(), e.getTime(), e.toString(), Date.parse("2026-03-08T02:30:00"), new Date(2026, 0, 31).getDay(), d.toLocaleString()]';
    const reference = underProcessZone('UTC', () => sandbox.evaluate(src));
    expect(underProcessZone(tz, () => sandbox.evaluate(src))).toEqual(reference);
  });

  it('a daylight-saving zone is also independent of the process timezone', async () => {
    const { sandbox } = await makeHarness({ zone: switching });
    const src = 'var a = new Date(2026, 2, 29, 2, 30); var b = new Date(2026, 9, 25, 2, 30); [a.getTime(), b.getTime(), a.getHours(), b.getHours(), a.toString()]';
    const reference = underProcessZone('UTC', () => sandbox.evaluate(src));
    for (const tz of ['Asia/Kolkata', 'America/Los_Angeles', 'Europe/Dublin']) expect(underProcessZone(tz, () => sandbox.evaluate(src)), tz).toEqual(reference);
  });
});

describe('a misbehaving zone is a fatal host problem, never silent time', () => {
  it('a zone that throws closes the sandbox with HOST_ERROR the script cannot catch', async () => {
    const { sandbox } = await makeHarness({ zone: { fixed: false, offsetMs: () => { throw new Error('zone broke'); } } });
    const error = expectScriptError(() => sandbox.evaluate('try { new Date(2026, 0, 1); } catch (e) {} "survived"'));
    expect(error.code).toBe('HOST_ERROR');
    expect(sandbox.closed).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 25 * HOUR, -25 * HOUR])('a zone that answers %s is a BRIDGE_VIOLATION', async (answer) => {
    const { sandbox } = await makeHarness({ zone: { fixed: false, offsetMs: () => answer } });
    expect(expectScriptError(() => sandbox.evaluate('new Date(2026, 0, 1).getHours()')).code).toBe('BRIDGE_VIOLATION');
  });

  it.each([
    ['not an object', 5],
    ['no offsetMs function', { fixed: true }],
    ['fixed is not a boolean', { fixed: 'yes', offsetMs: () => 0 }],
    ['a fixed offset beyond a day', { fixed: true, offsetMs: () => 25 * HOUR }],
  ])('an unusable zone option (%s) is INVALID_OPTIONS', async (_name, zone) => {
    await expect(makeHarness({ zone: zone as unknown as ScriptZone })).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
  });

  it('a script that hammers the zone host function is stopped by the run deadline like any other loop', async () => {
    const { sandbox } = await makeHarness({ zone: { fixed: false, offsetMs: () => HOUR }, limits: { runDeadlineMs: 300 } });
    const error = expectScriptError(() => sandbox.evaluate('for (;;) { new Date(2026, 0, 1).getHours(); }'));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'deadline' });
  });

  it('a script that replaces the engine\'s UTC getters or RegExp#exec cannot redirect the zone-aware Date', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(330), clock: clockAt(at(2026, 5, 15, 12)) });
    const out = sandbox.evaluate(
      'Date.prototype.getUTCHours = function () { return 99; }; Date.prototype.setUTCHours = function () { return 99; }; Date.prototype.getTime = function () { return 0; }; RegExp.prototype.exec = function () { return null; }; var d = new Date(); [d.getHours(), new Date(2026, 5, 15, 23, 30).valueOf() === Date.UTC(2026, 5, 15, 18, 0), Date.parse("2026-06-15T10:00:00")]',
    );
    expect(out).toEqual([17, true, at(2026, 5, 15, 4, 30)]);
  });

  it('a script cannot reach the zone host function or the process-local getter through Date', async () => {
    const { sandbox } = await makeHarness({ zone: fixedZone(330), clock: clockAt(at(2026, 5, 15, 12)) });
    const out = sandbox.evaluate('var D = Object.getPrototypeOf(new Date()).constructor; var n = new D(); [D === Date, n.getHours(), new Function("return new Date().getHours()")()]');
    expect(out).toEqual([true, 17, 17]);
  });
});
