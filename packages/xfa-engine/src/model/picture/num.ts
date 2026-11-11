import { safeText } from '../../pdf/safe-text.js';
import { incrementDigits, isDigit, stripLeadingZeros, stripTrailingZeros } from './digits.js';
import { unsupportedPicture } from './errors.js';
import { MAX_NUM_DIGIT_SLOTS } from './limits.js';
import type { PictureClause } from './types.js';

const DIGIT = '9';
const SUPPRESS = 'z';
const CURRENCY = '$';
const GROUP = ',';
const POINT = '.';
const CHAR_COMMA = 44;
const CHAR_POINT = 46;
const CHAR_CURRENCY = 36;
/** Digit code of '5': a first dropped fraction digit at or above it rounds up (half up). */
const ROUND_UP_FROM = 53;

type IntItem = typeof DIGIT | typeof SUPPRESS | typeof GROUP;

interface NumLayout {
  readonly currency: boolean;
  readonly grouping: boolean;
  readonly point: boolean;
  /** Integer-part items in order: digit slots and the grouping commas between them. */
  readonly integer: readonly IntItem[];
  readonly integerSlots: number;
  /** Fraction-part digit slots in order (`9` or `z`). */
  readonly fraction: readonly IntItem[];
  readonly fractionSlots: number;
}

const isSlot = (char: string): boolean => char === DIGIT || char === SUPPRESS;

/**
 * Reads a `num{..}` pattern. Beyond the grammar in the brief, these are refused so that every pattern round-trips
 * (what it formats, it parses): a grouping comma must sit between two digit slots of the integer part; a decimal
 * point needs an integer slot before it and a fraction slot after it; the last integer slot must be `9`, so zero
 * always shows a digit.
 */
function compileLayout(pattern: string): NumLayout {
  const integer: IntItem[] = [];
  let integerSlots = 0;
  const fraction: IntItem[] = [];
  let point = false;
  let grouping = false;
  const refuse = (why: string): never => {
    throw unsupportedPicture(`num pattern ${why}: "${safeText(pattern)}"`);
  };
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern.charAt(i);
    if (char === DIGIT || char === SUPPRESS) {
      if (point) fraction.push(char);
      else {
        integer.push(char);
        integerSlots += 1;
      }
    } else if (char === CURRENCY) {
      if (i !== 0) refuse('has a currency symbol that is not first');
    } else if (char === GROUP) {
      if (point || !isSlot(pattern.charAt(i - 1)) || !isSlot(pattern.charAt(i + 1))) refuse('has a grouping comma not between two integer digit slots');
      integer.push(GROUP);
      grouping = true;
    } else if (char === POINT) {
      if (point || integerSlots === 0 || !isSlot(pattern.charAt(i + 1))) refuse('has a misplaced or repeated decimal point');
      point = true;
    } else refuse(`has an unsupported symbol "${safeText(char)}"`);
  }
  const fractionSlots = fraction.length;
  if (integerSlots + fractionSlots > MAX_NUM_DIGIT_SLOTS) refuse(`has more than ${MAX_NUM_DIGIT_SLOTS} digit slots`);
  if (integerSlots === 0) refuse('has no integer digit slot');
  if (integer.filter((item) => item !== GROUP).pop() !== DIGIT) refuse('must end its integer part with 9 so zero shows a digit');
  return { currency: pattern.startsWith(CURRENCY), grouping, point, integer, integerSlots, fraction, fractionSlots };
}

interface Decimal {
  readonly integer: string;
  readonly fraction: string;
}

/** A canonical non-negative decimal (`digits` or `digits.digits`) split into parts, else undefined. */
function splitDecimal(value: string): Decimal | undefined {
  let i = 0;
  while (i < value.length && isDigit(value.charCodeAt(i))) i += 1;
  if (i === 0) return undefined;
  const integer = stripLeadingZeros(value.slice(0, i));
  if (i === value.length) return { integer, fraction: '' };
  if (value.charCodeAt(i) !== CHAR_POINT) return undefined;
  const start = i + 1;
  i = start;
  while (i < value.length && isDigit(value.charCodeAt(i))) i += 1;
  if (i === start || i !== value.length) return undefined;
  return { integer, fraction: value.slice(start) };
}

/** Rounds half up to `places` fraction digits by string arithmetic (a float would turn 1.005 into 1.00). */
function roundTo(value: Decimal, places: number): Decimal {
  if (value.fraction.length <= places) return { integer: value.integer, fraction: value.fraction.padEnd(places, '0') };
  const kept = `${value.integer}${value.fraction.slice(0, places)}`;
  const all = value.fraction.charCodeAt(places) >= ROUND_UP_FROM ? incrementDigits(kept) : kept;
  const split = all.length - places;
  return { integer: stripLeadingZeros(all.slice(0, split)), fraction: all.slice(split) };
}

function render(layout: NumLayout, value: Decimal): string {
  const padded = value.integer.padStart(layout.integerSlots, '0');
  let out = layout.currency ? CURRENCY : '';
  let emitted = false;
  let next = 0;
  for (const item of layout.integer) {
    if (item === GROUP) {
      if (emitted) out += GROUP;
      continue;
    }
    const digit = padded.charAt(next);
    next += 1;
    if (item === SUPPRESS && !emitted && digit === '0') continue;
    out += digit;
    emitted = true;
  }
  // Trailing `z` positions that hold a zero are suppressed, from the right, up to the first digit that shows; the point
  // goes with them when no fraction digit is left ($1,234 rather than $1,234.).
  let shown = layout.fractionSlots;
  while (shown > 0 && layout.fraction[shown - 1] === SUPPRESS && value.fraction.charAt(shown - 1) === '0') shown -= 1;
  return layout.point && shown > 0 ? `${out}${POINT}${value.fraction.slice(0, shown)}` : out;
}

/**
 * Compiles a `num{pattern}` clause: `9` shows a digit (zero-padded), `z` suppresses a leading zero of the integer
 * part, `$` is an optional-on-entry prefix, `,` groups digits and shows only after a digit, `.` is the decimal point.
 * In the fraction part `z` suppresses a trailing zero: positions are checked from the right and dropped while they are
 * `z` and hold `0`, and the decimal point is dropped with the last of them, so `$zz9.zz` shows 1234.5 as `$1,234.5` and
 * 1234 as `$1,234`; a `9` in the fraction always shows its digit. The XFA text is ambiguous about the point when every
 * fraction digit is suppressed; omitting it is a choice.
 * The canonical form is a plain decimal with no sign, grouping, leading zeros or trailing fraction zeros.
 */
export function compileNum(pattern: string): PictureClause {
  const layout = compileLayout(pattern);
  return {
    category: 'num',
    parse(input) {
      let pos = layout.currency && input.charCodeAt(0) === CHAR_CURRENCY ? 1 : 0;
      let integer = '';
      while (pos < input.length) {
        const code = input.charCodeAt(pos);
        if (isDigit(code)) {
          if (integer.length === layout.integerSlots) return undefined;
          integer += input.charAt(pos);
        } else if (!(code === CHAR_COMMA && layout.grouping && pos > 0 && isDigit(input.charCodeAt(pos - 1)) && isDigit(input.charCodeAt(pos + 1)))) break;
        pos += 1;
      }
      if (integer === '') return undefined;
      const whole = stripLeadingZeros(integer);
      if (pos === input.length) return whole;
      if (!layout.point || input.charCodeAt(pos) !== CHAR_POINT) return undefined;
      const start = pos + 1;
      pos = start;
      while (pos < input.length && isDigit(input.charCodeAt(pos))) pos += 1;
      if (pos !== input.length || pos === start || pos - start > layout.fractionSlots) return undefined;
      const fraction = stripTrailingZeros(input.slice(start));
      return fraction === '' ? whole : `${whole}.${fraction}`;
    },
    format(canonical) {
      const parts = splitDecimal(canonical);
      // A carry can add one digit but never remove one, so an integer already too wide cannot be saved by rounding.
      if (parts === undefined || parts.integer.length > layout.integerSlots) return undefined;
      const rounded = roundTo(parts, layout.fractionSlots);
      return rounded.integer.length > layout.integerSlots ? undefined : render(layout, rounded);
    },
  };
}
