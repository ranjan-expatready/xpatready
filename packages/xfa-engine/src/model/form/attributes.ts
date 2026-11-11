import { z } from 'zod';
import { invalidArgument } from './errors.js';
import { MAX_ATTRIBUTE_CHARS } from './limits.js';

const presence = z.enum(['visible', 'hidden', 'invisible', 'inactive']);
const access = z.enum(['open', 'nonInteractive', 'protected', 'readOnly']);
const stroke = z.enum(['solid', 'dashed', 'dashDot', 'dashDotDot', 'dotted', 'embossed', 'etched', 'lowered', 'raised']);
const test = z.enum(['disabled', 'error', 'warning']);
const scrollPolicy = z.enum(['auto', 'off', 'on']);
const flag01 = z.enum(['0', '1']);
/** The `hand`, corner `join` and caption `placement` values; the layout reads the same sets (`layout/box`). */
export const borderHandSchema = z.enum(['even', 'left', 'right']);
export const cornerJoinSchema = z.enum(['square', 'round']);
export const captionPlacementSchema = z.enum(['left', 'right', 'top', 'bottom', 'inline']);
const free = z.string().max(MAX_ATTRIBUTE_CHARS);

type Schema = z.ZodType<string>;

/** Settable XFA attributes by class, each with the schema a written value must satisfy (enumerations are checked; measures and colours are free text, kept verbatim). */
const ATTRIBUTE_SCHEMAS: ReadonlyMap<string, ReadonlyMap<string, Schema>> = (() => {
  const table = (entries: Readonly<Record<string, Schema>>): ReadonlyMap<string, Schema> => new Map(Object.entries(entries));
  const layout = { x: free, y: free, w: free, h: free, minW: free, maxW: free, minH: free, maxH: free, colSpan: free, locale: free, relevant: free, rotate: free, anchorType: free };
  return new Map([
    ['field', table({ presence, access, ...layout })],
    ['exclGroup', table({ presence, access, ...layout })],
    ['subform', table({ presence, access, ...layout })],
    ['draw', table({ presence, ...layout })],
    ['border', table({ presence, hand: borderHandSchema, break: z.enum(['close', 'open']) })],
    ['edge', table({ presence, stroke, thickness: free, cap: z.enum(['square', 'round', 'butt']) })],
    ['corner', table({ presence, stroke, thickness: free, join: cornerJoinSchema, inverted: z.enum(['0', '1']), radius: free })],
    ['fill', table({ presence })],
    ['color', table({ value: free, cSpace: free })],
    ['caption', table({ presence, placement: captionPlacementSchema, reserve: free })],
    ['validate', table({ nullTest: test, formatTest: test, scriptTest: test })],
    ['assist', table({ role: free })],
    ['speak', table({ priority: z.enum(['custom', 'caption', 'name', 'toolTip']) })],
    ['textEdit', table({ vScrollPolicy: scrollPolicy, hScrollPolicy: scrollPolicy, multiLine: flag01 })],
    ['items', table({ presence, ref: free })],
    ['value', table({ override: free })],
  ]);
})();

/** The settable attribute names of a class, or undefined when the engine models none for it. */
export function attributesOfClass(className: string): ReadonlyMap<string, Schema> | undefined {
  return ATTRIBUTE_SCHEMAS.get(className);
}

const attributeInput = z.union([z.string(), z.number(), z.boolean()]);

/** Validates a value assigned to attribute `name` of `className`; numbers and booleans are written as their text (`inverted = 0`). Throws `INVALID_ARGUMENT`. */
export function parseAttributeValue(className: string, name: string, input: unknown): string {
  const schema = ATTRIBUTE_SCHEMAS.get(className)?.get(name);
  if (schema === undefined) throw invalidArgument(`${className}.${name} is not a settable attribute`);
  const given = attributeInput.safeParse(input);
  if (!given.success) throw invalidArgument(`${className}.${name} needs a string, number or boolean`);
  const parsed = schema.safeParse(typeof given.data === 'boolean' ? (given.data ? '1' : '0') : String(given.data));
  if (!parsed.success) throw invalidArgument(`${className}.${name} was given a value outside its allowed set`);
  return parsed.data;
}
