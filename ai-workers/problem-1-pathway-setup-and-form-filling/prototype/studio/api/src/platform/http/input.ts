// PF-28 part 1 (R1.10; AG-18-57 "every input … validated by schema at the edge", AG-16-28, STANDARDS §6): the one input
// rule for platform and front-office doors. A body, query or path value reaches a service only through a zod schema:
// `parseInput(schema, value)` with `strict({...})` at the top, so an unknown field is refused; strings and arrays are
// bounded; a refusal is Problem Details with `code: "INVALID"` and `fields: { <name>: "<plain words>" }`; a path id that is
// not a uuid is the one not-found (404). Status of a field error: FIELD_ERROR_STATUS (Lead B rev 17.21: 422; open
// question on #2619). Services that already parse inside keep doing so; tests/check_pf28_inputs.ts makes it checkable.
import express from "express";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { z } from "zod";
import { problem } from "../identity/keys.ts";

/** A parsed body whose field breaks a rule (Lead B's ruling, rev 17.21, RFC 9110 §15.5.21). 400 stays for a body that
 *  cannot be parsed at all (PF-0bp) and for a bad webhook signature. */
export const FIELD_ERROR_STATUS = 422;
/** The JSON body limit of the platform and front-office doors (Sample: a technical limit, not a business value). */
export const INPUT_BODY_LIMIT = "256kb";
/** The paths whose JSON bodies take INPUT_BODY_LIMIT. /api/hooks/* is left out on purpose: a webhook keeps its raw-body
 *  parser and its own limit, and its schema runs after the signature check (PF-28 amendment 1). FO-2's web form keeps its
 *  32 KB (mounted first, so this parser never sees it). */
export const INPUT_PATHS = ["/api/platform", "/api/front-office", "/api/system", "/api/public"];

/** A strict object: an unknown field is refused, named in `fields`. */
export const strict = <S extends z.ZodRawShape>(shape: S) => z.strictObject(shape);
/** Bounded text: trimmed, at most `max` characters (a required value needs one). */
export const text = (max: number) => z.string().trim().max(max);
/** A bounded list. */
export const list = <T extends z.ZodType>(item: T, max: number) => z.array(item).max(max);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A field's name as the answer gives it: at most 64 characters (an unknown key is the caller's text, break m3). */
const name = (path: readonly PropertyKey[]) => (path.map(String).join(".") || "body").slice(0, 64);

/** One plain sentence per issue; never the value itself (it may be personal, or 1 MB long). */
function words(i: z.core.$ZodIssue): string {
  switch (i.code) {
    // zod 4 keeps no input on an issue unless asked, so a missing field is told by its message (break m1).
    case "invalid_type": return /received undefined$/.test(i.message) ? "This is required." : `This must be ${i.expected === "string" ? "text" : i.expected === "array" ? "a list" : `a ${i.expected}`}.`;
    case "too_big": return i.origin === "string" ? `This is too long: at most ${i.maximum} characters.` : i.origin === "array" ? `Too many items: at most ${i.maximum}.` : `This is too large: at most ${i.maximum}.`;
    case "too_small": return i.origin === "string" ? (Number(i.minimum) <= 1 ? "This is required." : `This is too short: at least ${i.minimum} characters.`) : i.origin === "array" ? `Add at least ${i.minimum}.` : `This is too small: at least ${i.minimum}.`;
    case "invalid_value": return "This is not one of the allowed choices.";
    case "invalid_format": return i.format === "uuid" ? "This is not a valid id." : i.format === "email" ? "This is not an email address." : "This is not in the expected format.";
    default: return i.message || "This value is not accepted.";
  }
}

/** The fields of a failed parse, each with its plain words; an unknown field gets "This field is not allowed here." */
export function fieldsOf(error: z.ZodError): Record<string, string> {
  // Own keys only, so "constructor" or "toString" is named like any other field (break m2); at most 20 fields.
  const out: Record<string, string> = {}, put = (k: string, v: string) => { if (!Object.hasOwn(out, k) && Object.keys(out).length < 20) Object.defineProperty(out, k, { value: v, enumerable: true, writable: true, configurable: true }); };
  for (const i of error.issues) {
    if (i.code === "unrecognized_keys") for (const k of i.keys) put(name([...i.path, k]), "This field is not allowed here.");
    else put(name(i.path), words(i));
  }
  return out;
}

/** The value as the schema reads it, or a refusal (FIELD_ERROR_STATUS, the fields named, nothing stored). */
export function parseInput<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  // A "__proto__" key that JSON.parse made an own key is never a field of ours: refused before the schema (break m2).
  if (value !== null && typeof value === "object" && Object.hasOwn(value, "__proto__")) return problem(FIELD_ERROR_STATUS, "Check the details", "One field needs a change: __proto__: This field is not allowed here. Nothing was saved.", { code: "INVALID", fields: { ["__proto__"]: "This field is not allowed here." } });
  const r = schema.safeParse(value);
  if (r.success) return r.data;
  const fields = fieldsOf(r.error), n = Object.keys(fields).length;
  return problem(FIELD_ERROR_STATUS, "Check the details", `${n === 1 ? "One field needs" : `${n} fields need`} a change: ${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join(" ").slice(0, 600)} Nothing was saved.`, { code: "INVALID", fields });
}

/** A path id: a uuid, or the one not-found (a malformed id is simply not found, never a field error or a 500). */
export function idParam(v: unknown, what = "record"): string {
  if (typeof v === "string" && UUID.test(v)) return v.toLowerCase();
  return problem(404, "Not found", `No such ${what} in your firm.`, { code: "NOT_FOUND" });
}

/** main.ts, before the app-wide parser: the JSON limit of INPUT_PATHS. A larger body is refused 413 by ProblemErrors. */
export function inputBodyLimit(app: Pick<NestExpressApplication, "use">) {
  const json = express.json({ limit: INPUT_BODY_LIMIT });
  // The SNS notice door keeps its own 300 KB limit (PF-19b part 2; break m4): AWS sets it, not us.
  (app as unknown as Pick<express.Express, "use">).use(INPUT_PATHS, (req, res, next) => (/^\/api\/public\/messages\/ses-notices\/?$/i.test(req.originalUrl.split("?")[0]) ? next() : json(req, res, next)));
}
