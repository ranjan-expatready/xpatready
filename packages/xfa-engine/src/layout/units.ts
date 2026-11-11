import { safeText } from '../pdf/safe-text.js';
import { XfaLayoutError } from './errors.js';
import { MAX_MEASURE_CHARS, MAX_MEASURE_LIST_CHARS, MAX_MEASURE_LIST_ITEMS } from './limits.js';

/**
 * The units of an XFA measurement that the engine converts. `mp` (millipoint, 1/1000 pt) is the unit of the numbers in the
 * template's `renderCache` processing instructions; the real templates write only `mm`, `pt` and `in`. Anything else
 * (`px`, `em`, `pc`, `%`) is refused with `LAYOUT_UNSUPPORTED`, never read as a point.
 */
export type LengthUnit = 'in' | 'cm' | 'mm' | 'pt' | 'mp';

/**
 * What a template length (`x`, `w`, insets, `size`, ...) written without a unit means: the one rule every template caller
 * passes as `defaultUnit`. Inches is the XFA measurement convention as recalled from the specification; it is NOT yet
 * confirmed against the XFA 3.3 text (unreachable from the session that wrote this), and pdf.js reads a bare number as
 * points. Neither corpus form writes a unit-less template length, so no corpus value depends on it; confirm at wave close.
 */
export const TEMPLATE_LENGTH_UNIT: LengthUnit = 'in';

const POINTS_PER_INCH = 72;
const MM_PER_INCH = 25.4;

/** FD-38 exemption (correctness constant): points per unit, from the definitions 1 in = 72 pt = 25.4 mm = 2.54 cm and 1 mp = 0.001 pt. */
const POINTS_PER: Readonly<Record<LengthUnit, number>> = {
  in: POINTS_PER_INCH,
  cm: (POINTS_PER_INCH * 10) / MM_PER_INCH,
  mm: POINTS_PER_INCH / MM_PER_INCH,
  pt: 1,
  mp: 0.001,
};

const NUMBER_PREFIX = /^[+-]?(?:\d+\.?\d*|\.\d+)/;
const PADDING = /^[ \t\r\n]+|[ \t\r\n]+$/g;

function isLengthUnit(unit: string): unit is LengthUnit {
  return Object.hasOwn(POINTS_PER, unit);
}

function fail(code: 'LAYOUT_UNSUPPORTED' | 'INVALID_ARGUMENT', attribute: string, text: string, why: string): XfaLayoutError {
  return new XfaLayoutError(code, `${attribute}: ${why} (${safeText(text)})`);
}

/**
 * Converts one XFA measurement (`7.62mm`, `10.8pt`, `0.25in`, `-1`) to points. `defaultUnit` is what a unit-less number
 * means; it is the caller's to choose per attribute, so the unit-less rule lives with the attribute that has it. The
 * result is always finite. A negative number is returned as written (the caption `reserve` of `-1` is a sentinel the
 * caller tests for, not a length). `attribute` only names the source in the error message.
 */
export function parseMeasure(text: string, defaultUnit: LengthUnit, attribute = 'measurement'): number {
  if (text.length > MAX_MEASURE_CHARS) throw fail('INVALID_ARGUMENT', attribute, text, `longer than ${MAX_MEASURE_CHARS} characters`);
  const trimmed = text.replace(PADDING, '');
  const match = NUMBER_PREFIX.exec(trimmed);
  if (match === null) throw fail('INVALID_ARGUMENT', attribute, text, 'no number');
  const unit = trimmed.slice(match[0].length).replace(PADDING, '');
  const chosen = unit === '' ? defaultUnit : unit;
  if (!isLengthUnit(chosen)) throw fail('LAYOUT_UNSUPPORTED', attribute, text, 'unit not supported');
  const points = Number(match[0]) * POINTS_PER[chosen];
  if (!Number.isFinite(points)) throw fail('INVALID_ARGUMENT', attribute, text, 'not a finite length');
  return points;
}

/** Converts a whitespace-separated list of measurements (`columnWidths`) to points. At least one entry. */
export function parseMeasureList(text: string, defaultUnit: LengthUnit, attribute = 'measurement list'): readonly number[] {
  if (text.length > MAX_MEASURE_LIST_CHARS) throw fail('INVALID_ARGUMENT', attribute, text, `longer than ${MAX_MEASURE_LIST_CHARS} characters`);
  const parts = text.split(/[ \t\r\n]+/).filter((part) => part !== '');
  if (parts.length === 0) throw fail('INVALID_ARGUMENT', attribute, text, 'empty list');
  if (parts.length > MAX_MEASURE_LIST_ITEMS) throw fail('INVALID_ARGUMENT', attribute, text, `more than ${MAX_MEASURE_LIST_ITEMS} entries`);
  return parts.map((part) => parseMeasure(part, defaultUnit, attribute));
}
