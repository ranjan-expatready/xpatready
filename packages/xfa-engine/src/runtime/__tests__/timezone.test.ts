import { describe, expect, it } from 'vitest';
import { XfaRuntimeError } from '../errors.js';
import { timezoneSchema } from '../timezone.js';
import { loaded, makeRuntime, onEvent, textField, thrown } from './helpers.js';
import type { FormRuntimeOptions } from '../options.js';

/** A one-field form whose initialize script writes the result of `expression` into the field. */
const probeForm = (expression: string): string => textField('out', onEvent('initialize', `this.rawValue = String(${expression});`));

async function probe(expression: string, options: Partial<FormRuntimeOptions> = {}): Promise<string> {
  const rt = await loaded(probeForm(expression), { options });
  return String(rt.getValue('out'));
}

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

const HOURS_AT_CLOCK = 'new Date().getHours()';

describe('the timezone option (plan decision D9)', () => {
  it('omitted, local time is UTC: the injected clock reads 12:00 whatever the process timezone is', async () => {
    for (const tz of ['Asia/Kolkata', 'America/Los_Angeles']) {
      expect(await underProcessZone(tz, () => probe(HOURS_AT_CLOCK)), tz).toBe('12');
    }
  });

  it.each([
    ['UTC', '12'],
    ['+05:30', '17'],
    ['-08:00', '4'],
    ['+14:00', '2'],
    ['Asia/Kolkata', '17'],
    ['America/New_York', '8'],
    ['Pacific/Auckland', '0'],
  ])('timezone %s puts the 12:00 UTC clock at hour %s', async (timezone, hour) => {
    expect(await probe(HOURS_AT_CLOCK, { timezone })).toBe(hour);
  });

  it('an IANA zone follows daylight saving: the same wall-clock reading is a different instant in summer and winter', async () => {
    const options = { timezone: 'America/New_York' };
    expect(await probe('new Date(2026, 0, 15, 9, 0).getTime()', options)).toBe(String(Date.UTC(2026, 0, 15, 14, 0)));
    expect(await probe('new Date(2026, 6, 15, 9, 0).getTime()', options)).toBe(String(Date.UTC(2026, 6, 15, 13, 0)));
    expect(await probe('new Date(2026, 6, 15).getTimezoneOffset()', options)).toBe('240');
    expect(await probe('new Date(2026, 0, 15).getTimezoneOffset()', options)).toBe('300');
  });

  it('a wall-clock time the zone skips, and one it repeats, are read the language\'s way (offset before the switch; first occurrence)', async () => {
    const options = { timezone: 'America/New_York' };
    expect(await probe('new Date(2026, 2, 8, 2, 30).getTime()', options)).toBe(String(Date.UTC(2026, 2, 8, 7, 30)));
    expect(await probe('new Date(2026, 10, 1, 1, 30).getTime()', options)).toBe(String(Date.UTC(2026, 10, 1, 5, 30)));
  });

  it('a zone with a half-hour daylight-saving step and a southern-hemisphere zone work through the same path', async () => {
    expect(await probe('new Date(2026, 0, 15, 12, 0).getTimezoneOffset()', { timezone: 'Australia/Lord_Howe' })).toBe('-660');
    expect(await probe('new Date(2026, 5, 15, 12, 0).getTimezoneOffset()', { timezone: 'Australia/Lord_Howe' })).toBe('-630');
  });

  it('the form\'s own century arithmetic and date probe agree with the zone', async () => {
    const expression = '[new Date().getYear() + 1900, new Date().getMonth() + 1, new Date().getDate(), new Date(2024, 1, 29).getDate()].join("-")';
    expect(await probe(expression, { timezone: '+14:00' })).toBe('2026-6-16-29');
    expect(await probe(expression, { timezone: '-12:00' })).toBe('2026-6-15-29');
  });

  it.each(['UTC', 'Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Auckland'])('with timezone America/New_York the output is identical when the process timezone is %s', async (tz) => {
    const expression = '[new Date().toString(), new Date(2026, 2, 8, 2, 30).getTime(), new Date(2026, 10, 1, 1, 30).getTime(), Date.parse("2026-11-01T01:30:00"), new Date().getHours()].join("|")';
    const reference = await underProcessZone('UTC', () => probe(expression, { timezone: 'America/New_York' }));
    expect(await underProcessZone(tz, () => probe(expression, { timezone: 'America/New_York' }))).toBe(reference);
    expect(reference).toBe(`Mon Jun 15 2026 08:00:00 GMT-0400|${Date.UTC(2026, 2, 8, 7, 30)}|${Date.UTC(2026, 10, 1, 5, 30)}|${Date.UTC(2026, 10, 1, 5, 30)}|8`);
  });
});

describe('the timezone option is validated', () => {
  it.each([
    ['empty', ''],
    ['unknown name', 'Mars/Phobos'],
    ['offset without colon', '+0530'],
    ['offset hours out of range', '+24:00'],
    ['offset minutes out of range', '+05:60'],
    ['offset without sign', '05:30'],
    ['too long', 'Z'.repeat(65)],
    ['not text', 530],
  ])('%s is INVALID_OPTIONS naming the option', async (_name, timezone) => {
    const error = thrown(() => timezoneSchema.parse(timezone));
    expect(error).toBeDefined();
    const created = await makeRuntime(textField('a'), { options: { timezone: timezone as never } }).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(created).toBeInstanceOf(XfaRuntimeError);
    expect((created as XfaRuntimeError).code).toBe('INVALID_OPTIONS');
    expect((created as XfaRuntimeError).message).toContain('timezone');
  });

  it('UTC and signed offsets parse to fixed zones, a name to a zone that changes', () => {
    expect(timezoneSchema.parse('UTC')).toMatchObject({ fixed: true });
    expect(timezoneSchema.parse('-03:30').offsetMs(0)).toBe(-(3 * 60 + 30) * 60_000);
    const named = timezoneSchema.parse('America/New_York');
    expect(named.fixed).toBe(false);
    expect([named.offsetMs(Date.UTC(2026, 0, 15)), named.offsetMs(Date.UTC(2026, 6, 15))]).toEqual([-5 * 3_600_000, -4 * 3_600_000]);
  });

  it('a zone name reads offsets across the whole time range without throwing (historic seconds, years before 1 AD)', () => {
    const named = timezoneSchema.parse('America/New_York');
    for (const t of [-8.64e15, -62_198_755_200_000, -2_000_000_000_000, 0, 8.64e15]) {
      const offset = named.offsetMs(t);
      expect(Number.isFinite(offset), String(t)).toBe(true);
      expect(Math.abs(offset), String(t)).toBeLessThanOrEqual(24 * 3_600_000);
    }
  });
});
