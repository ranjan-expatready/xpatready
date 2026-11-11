import { z } from 'zod';
import type { ScriptZone } from '../script/index.js';

/**
 * FD-38 exemption (security invariant): longest timezone text, in characters, the runtime accepts. The text comes from
 * the caller's configuration and is handed to `Intl`; the longest IANA name is well under this.
 */
export const MAX_TIMEZONE_CHARS = 64;

const MINUTE_MS = 60_000;
const SECOND_MS = 1000;

/** The only fixed zone with a name: no offset, no daylight saving. */
const UTC_NAME = 'UTC';

/** `+hh:mm` / `-hh:mm`, hours 00-23, minutes 00-59 (so always inside one day either way). */
const FIXED_OFFSET = /^([+-])([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * ECMAScript's time values reach 8.64e15 ms either side of the epoch. A zone's wall clock for an instant within two days
 * of that edge would fall outside the range, so instants asked of a zone are clamped two days inside it (the zone data
 * has no rule there anyway: the offset is the earliest or latest one it knows).
 */
const QUERY_BOUND_MS = 8.64e15 - 2 * 86_400_000;

const utc: ScriptZone = { fixed: true, offsetMs: () => 0 };

/** Why a timezone text cannot be used, or the zone it names. */
type ZoneOutcome = { readonly zone: ScriptZone } | { readonly problem: string };

const fixedZone = (sign: number, hours: number, minutes: number): ScriptZone => {
  const offset = sign * (hours * 60 + minutes) * MINUTE_MS;
  return { fixed: true, offsetMs: () => offset };
};

function partNumber(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const part = parts.find((p) => p.type === type);
  return part === undefined ? Number.NaN : Number(part.value);
}

/** The offset of an IANA zone at a UTC instant, read off `Intl`: the zone's wall-clock fields at that instant, minus the instant. */
function ianaZone(name: string): ZoneOutcome {
  if (typeof Intl === 'undefined') return { problem: 'IANA zone names need Intl, which this runtime lacks; give a fixed offset such as "+05:30"' };
  let format: Intl.DateTimeFormat;
  try {
    // Region-free locale with Latin digits: only numeric parts are read, so no region is needed (and none is hardcoded).
    format = new Intl.DateTimeFormat('en', {
      timeZone: name, numberingSystem: 'latn', hourCycle: 'h23', era: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
  } catch {
    return { problem: `"${name}" is not a timezone this runtime knows (use "UTC", a fixed offset such as "+05:30", or an IANA name)` };
  }
  const offsetMs = (utcMs: number): number => {
    const whole = Math.floor(Math.max(-QUERY_BOUND_MS, Math.min(QUERY_BOUND_MS, utcMs)) / SECOND_MS) * SECOND_MS;
    const parts = format.formatToParts(new Date(whole));
    const era = parts.find((p) => p.type === 'era')?.value ?? 'AD';
    const printedYear = partNumber(parts, 'year');
    const wall = new Date(0);
    wall.setUTCFullYear(era.startsWith('B') ? 1 - printedYear : printedYear, partNumber(parts, 'month') - 1, partNumber(parts, 'day'));
    wall.setUTCHours(partNumber(parts, 'hour'), partNumber(parts, 'minute'), partNumber(parts, 'second'), 0);
    return wall.getTime() - whole;
  };
  return { zone: { fixed: false, offsetMs } };
}

function zoneFor(text: string): ZoneOutcome {
  if (text === UTC_NAME) return { zone: utc };
  const fixed = FIXED_OFFSET.exec(text);
  if (fixed !== null) return { zone: fixedZone(fixed[1] === '-' ? -1 : 1, Number(fixed[2]), Number(fixed[3])) };
  // Intl also reads other offset spellings ("+0530"); one spelling keeps configuration unambiguous.
  if (text.startsWith('+') || text.startsWith('-')) return { problem: `"${text}" is not a fixed offset; write it as "+hh:mm" or "-hh:mm"` };
  return ianaZone(text);
}

/**
 * The `timezone` option of `createFormRuntime` (plan decision D9): where a form's local time is. `"UTC"`, a fixed offset
 * `"+05:30"` / `"-08:00"`, or an IANA zone name (resolved through `Intl`, so daylight-saving rules are the platform's).
 * Anything else is a validation issue. It becomes the `ScriptZone` the sandbox's guest `Date` runs on.
 */
export const timezoneSchema = z
  .string()
  .min(1)
  .max(MAX_TIMEZONE_CHARS)
  .transform((text, ctx): ScriptZone => {
    const outcome = zoneFor(text);
    if ('zone' in outcome) return outcome.zone;
    ctx.issues.push({ code: 'custom', message: outcome.problem, input: text });
    return z.NEVER;
  });
