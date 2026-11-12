/** Linear, float-free helpers on decimal digit strings. */

export const isDigit = (code: number): boolean => code >= 48 && code <= 57;

/** `digits` without leading zeros, but never empty: an all-zero string becomes "0". */
export function stripLeadingZeros(digits: string): string {
  let i = 0;
  while (i < digits.length - 1 && digits.charCodeAt(i) === 48) i += 1;
  return digits.slice(i);
}

/** `digits` without trailing zeros (may become empty). */
export function stripTrailingZeros(digits: string): string {
  let end = digits.length;
  while (end > 0 && digits.charCodeAt(end - 1) === 48) end -= 1;
  return digits.slice(0, end);
}

/** `digits` plus one, by string arithmetic. A carry out of the top digit makes the result one digit longer. */
export function incrementDigits(digits: string): string {
  let i = digits.length - 1;
  while (i >= 0 && digits.charCodeAt(i) === 57) i -= 1;
  if (i < 0) return `1${'0'.repeat(digits.length)}`;
  return `${digits.slice(0, i)}${String.fromCharCode(digits.charCodeAt(i) + 1)}${'0'.repeat(digits.length - 1 - i)}`;
}
