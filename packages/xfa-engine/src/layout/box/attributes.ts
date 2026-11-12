import { z } from 'zod';
import type { FormNode } from '../../model/form/index.js';
import { safeText } from '../../pdf/safe-text.js';
import { XfaLayoutError } from '../errors.js';
import { parseMeasure, TEMPLATE_LENGTH_UNIT } from '../units.js';
import type { IssueSink } from './issues.js';

/**
 * A length attribute of `node` in points, read from the form DOM (script-set, else template, else the XFA default), so a
 * script that wrote `h` is what the layout sees. Absent or blank is `undefined`. A unit the engine does not convert or a
 * malformed number is a typed `XfaLayoutError` naming the attribute. A unit-less number means `TEMPLATE_LENGTH_UNIT`.
 */
export function lengthAttr(node: FormNode, name: string): number | undefined {
  const text = node.attr(name);
  if (text === undefined || text.trim() === '') return undefined;
  return parseMeasure(text, TEMPLATE_LENGTH_UNIT, name);
}

/**
 * As `lengthAttr` for a size, inset, thickness or radius, which cannot be negative: a negative value is reported against
 * `node` in `sink` and read as 0, never used and never silent.
 */
export function sizeAttr(node: FormNode, name: string, sink: IssueSink): number | undefined {
  const value = lengthAttr(node, name);
  if (value === undefined || value >= 0) return value;
  sink.add(node, `${name} is negative (read as 0)`);
  return 0;
}

/**
 * An attribute that must be one of `schema`'s values. Absent or blank answers `fallback`; any other text is
 * `LAYOUT_UNSUPPORTED` naming the attribute (a value the engine does not model is never read as the default).
 */
export function enumAttr<const T extends string>(node: FormNode, name: string, schema: z.ZodType<T>, fallback: T): T {
  const text = node.attr(name)?.trim();
  if (text === undefined || text === '') return fallback;
  const parsed = schema.safeParse(text);
  if (!parsed.success) throw new XfaLayoutError('LAYOUT_UNSUPPORTED', `${name}: value not supported (${safeText(text)})`);
  return parsed.data;
}
