// P-162 (C3.1): each shared field's format comes from its source and is enforced by a fixed set of checks in code.
// The source is the official form itself: the PDF box's maximum length and picture clause, and the validation function
// the box's own script calls (val.validateUCI, val.validatePassportNum, …) with the form's own error message as the
// quote. prototype/p1/xfa_formats.py reads those, without AI (US$0), into <form>.formats.json beside the inventory.
// Nobody types a free rule: a format is one of FORMAT_CHECKS, and a validation function this file does not map is
// shown as "read from the form, not checked here" so nothing is silently claimed.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DependentList } from "../../p5/transforms.ts";

const SOLUTION = join(import.meta.dirname, "..", "..", "..");

/** A context a check may need: the address's country for a postal code, the other date for an order rule. */
export type FormatContext = { country?: string | null; otherDate?: string | null; today?: Date };
type Check = { words: (p: Params) => string; test: (v: string, p: Params, ctx: FormatContext) => string | null };
type Params = { n?: number; than?: "other_date" | "today"; orEqual?: boolean; max?: "this_year" | null };

/** The letters the forms' own checks accept (review M3): a to z and the French accented letters, nothing else (no ñ, ß,
 *  ø, and no curly apostrophe ’, which the form refuses). */
const LATIN = "A-Za-z\u00E9\u00E0\u00E8\u00F9\u00E2\u00EA\u00EE\u00F4\u00FB\u00EB\u00EF\u00F6\u00FC\u00E6\u00E7\u0153\u00C9\u00C0\u00C8\u00D9\u00C2\u00CA\u00CE\u00D4\u00DB\u00CB\u00CF\u00D6\u00DC\u00C6\u00C7\u0152";
const CURLY = /[\u2018\u2019]/;
const curlyHint = (v: string) => (CURLY.test(v) ? " Type the apostrophe as ' (the form refuses ’)." : "");
/** A date answer compared at its own precision (a month answer with today's month). */
const beforeOrSame = (v: string, other: string) => v <= other.slice(0, v.length);
const dateLike = (v: string) => (/^\d{4}-\d{2}(-\d{2})?$/.test(v) ? v : null);
const todayIso = (ctx: FormatContext) => (ctx.today ?? new Date()).toISOString().slice(0, 10);
/** The year, month and day parts of a date answer (a whole date, a month, or the part alone). */
const part = (v: string, which: "y" | "m" | "d") => {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(v);
  if (m) return which === "y" ? m[1] : which === "m" ? m[2] ?? null : m[3] ?? null;
  return v;
};
const isCanada = (c: string) => /^(ca|can|canada|511)$/i.test(c.trim());
const isUsa = (c: string) => /^(us|usa|united states( of america)?|461)$/i.test(c.trim());

/** The fixed set of format checks (P-153: closed; a format names one of these, never a typed rule). */
export const FORMAT_CHECKS = {
  max_length: { words: (p) => `At most ${p.n} characters`, test: (v, p) => ([...v].length > p.n! ? `Keep it to ${p.n} characters (it is ${[...v].length}); the form has no room for more.` : null) },
  min_length: { words: (p) => `At least ${p.n} characters`, test: (v, p) => ([...v.trim()].length < p.n! ? `Write at least ${p.n} characters.` : null) },
  digits_only: { words: () => "Digits only", test: (v) => (/^\d+$/.test(v) ? null : "Use digits only (0 to 9), no letters, spaces or signs.") },
  digits_and_spaces: { words: () => "Digits and spaces only", test: (v) => (/^[\d ]+$/.test(v) ? null : "Use digits and spaces only.") },
  digits_exact: { words: (p) => `Exactly ${p.n} digits`, test: (v, p) => (new RegExp(`^\\d{${p.n}}$`).test(v) ? null : `Use exactly ${p.n} digits.`) },
  area_code: { words: () => "3 digits, not starting with 0 or 1", test: (v) => (/^[2-9]\d{2}$/.test(v) ? null : "Use 3 digits that do not start with 0 or 1.") },
  letters_digits: { words: () => "Letters and digits only, no special characters", test: (v) => (/^[A-Za-z0-9 ]+$/.test(v) ? null : "Use letters and digits only, with no special characters.") },
  letters_digits_no_space: { words: () => "Letters and digits only, no spaces or hyphens", test: (v) => (/^[A-Za-z0-9]+$/.test(v) ? null : "Use letters and digits only, with no spaces, hyphens or other characters.") },
  english_french: { words: () => "English or French characters only", test: (v) => (new RegExp(`^[${LATIN}0-9\\s!-/:-@\\[-\`{-~]*$`).test(v) && !/[|]/.test(v) ? null : `Use English or French letters (a to z, é, à, ç and the other French accents), digits and common signs only.${curlyHint(v)}`) },
  name_characters: { words: () => "English or French letters, hyphen, apostrophe and space", test: (v) => (new RegExp(`^[${LATIN}' -]+$`).test(v) ? null : `Use English or French letters (a to z, é, à, ç and the other French accents), hyphens, apostrophes and spaces only.${curlyHint(v)}`) },
  place_characters: { words: () => "English or French letters and / - \" . & ' ,", test: (v) => (new RegExp(`^[${LATIN}/\\-".&', ]+$`).test(v) ? null : `Use English or French letters and only these signs: / - \" . & ' ,${curlyHint(v)}`) },
  email: { words: () => "An email address (one @, 2 to 6 letters after the last dot)", test: (v) => (/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,6}$/.test(v) && new RegExp(`^[${LATIN}0-9@._-]+$`).test(v) ? null : "Enter an email address like name@example.com, with English or French letters, digits and . _ - only.") },
  postal_code: {
    words: () => "Canada X9X 9X9 · USA 99999 or 99999-9999",
    test: (v, _p, ctx) => {
      const c = ctx.country ?? "";
      if (isCanada(c)) return /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(v) ? null : "A Canadian postal code looks like A1A 1A1.";
      if (isUsa(c)) return /^\d{5}(-\d{4})?$/.test(v) ? null : "A US ZIP code is 5 digits, or 5 digits, a hyphen and 4 digits.";
      return null;
    },
  },
  month: { words: () => "Month 01 to 12", test: (v) => { const m = part(v, "m"); return m === null || (/^\d{2}$/.test(m) && +m >= 1 && +m <= 12) ? null : "The month is 01 to 12."; } },
  day: { words: () => "Day 01 to 31", test: (v) => { const d = part(v, "d"); return d === null || (/^\d{2}$/.test(d) && +d >= 1 && +d <= 31) ? null : "The day is 01 to 31."; } },
  year_from_1900: {
    words: (p) => (p.max === "this_year" ? "Year 1900 to this year" : "Year 1900 or later"),
    test: (v, p, ctx) => { const y = part(v, "y"); const top = (ctx.today ?? new Date()).getUTCFullYear(); return y && /^\d{4}$/.test(y) && +y >= 1900 && (p.max !== "this_year" || +y <= top) ? null : p.max === "this_year" ? `The year is 1900 to ${top}.` : "The year is 1900 or later."; },
  },
  not_future: { words: () => "Today or earlier", test: (v, _p, ctx) => { const d = dateLike(v); return !d || beforeOrSame(d, todayIso(ctx)) ? null : "This date cannot be after today."; } },
  date_after: {
    words: (p) => `${p.orEqual ? "On or after" : "After"} ${p.than === "today" ? "today" : "the start date beside it on the form"}`,
    test: (v, p, ctx) => {
      const d = dateLike(v); const other = p.than === "today" ? todayIso(ctx) : ctx.otherDate ? dateLike(ctx.otherDate) : null;
      if (!d || !other) return null;
      const o = other.slice(0, d.length);
      return (p.orEqual ? d >= o : d > o) ? null : p.than === "today" ? "This date must be after today." : `This date must be ${p.orEqual ? "on or after" : "after"} ${other}.`;
    },
  },
  whole_number: { words: () => "Whole number, 0 or more", test: (v) => (/^\d+$/.test(v) ? null : "Enter a whole number, without cents or signs.") },
  date_pattern: { words: () => "Date as YYYY-MM-DD", test: (v) => (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(v) ? null : "Enter the date as year-month-day, for example 2019-06-30.") },
} satisfies Record<string, Check>;
export type FormatCheckId = keyof typeof FORMAT_CHECKS;
export const FORMAT_CHECK_IDS = Object.keys(FORMAT_CHECKS) as FormatCheckId[];

/** The form's validation functions, each to one fixed check (or to the type check that already covers it). */
const BY_FUNCTION: Record<string, ((args: string[]) => { check: FormatCheckId; params?: Params } | null) | "type"> = {
  validateUCI: () => ({ check: "digits_only" }),
  validatePassportNum: () => ({ check: "letters_digits" }),
  validateUSCIS: () => ({ check: "letters_digits_no_space" }),
  validatePostalCodeBasedOnCountry: () => ({ check: "postal_code" }),
  validateEmail: () => ({ check: "email" }),
  validateEmailField: () => ({ check: "email" }),
  validateOpenText: () => ({ check: "english_french" }),
  validateName: () => ({ check: "name_characters" }),
  validatePOBText: () => ({ check: "place_characters" }),
  validateDigits: () => ({ check: "digits_only" }),
  validateIntlNum: () => ({ check: "digits_and_spaces" }),
  validateAreaCode: () => ({ check: "area_code" }),
  validatePhoneNAN: () => ({ check: "digits_exact", params: { n: 4 } }),
  validateDOBMM: () => ({ check: "month" }),
  validateEduMonth: () => ({ check: "month" }),
  validateDOBDD: () => ({ check: "day" }),
  validateDOBYYYY: () => ({ check: "year_from_1900", params: { max: "this_year" } }),
  validateEduFromYear: () => ({ check: "year_from_1900", params: { max: "this_year" } }),
  validateEduToYear: () => ({ check: "year_from_1900", params: { max: null } }),
  validateEduDateInPresentOrPast: () => ({ check: "not_future" }),
  validateFunds: () => ({ check: "whole_number" }),
  validateJobDescription: () => ({ check: "min_length", params: { n: 5 } }),
  validateDate: (a) => dateOrder(a),
  validateDateWithHiddenFields: (a) => dateOrder(a),
  validateDropDown: "type",
  validateYesNo: "type",
};
/** The fixed check a form validation function maps to ("type" when the answer's type check already covers it, null when
 *  no check in code matches it). */
export const checkForFunction = (fn: string, args: string[] = []) => { const m = BY_FUNCTION[fn]; return m === "type" ? "type" as const : m ? m(args) : null; };
function dateOrder(args: string[]): { check: FormatCheckId; params: Params } | null {
  const [op, than] = args;
  if (op !== ">" && op !== ">=") return null;
  return { check: "date_after", params: { than: /getToday/.test(than ?? "") ? "today" : "other_date", orEqual: op === ">=" } };
}

export type FormatSource = { form: string; box: string; quote: string | null; from: "pdf_box" | "form_script" | "field_map" };
export type FormatRule = { check: FormatCheckId; params: Params; words: string; part: string | null; part_words: string | null; sources: FormatSource[] };
/** A rule read from a form but not checked on answers here, with why (review M2: nothing shown as checked is skipped). */
export type NotChecked = { function: string; form: string; quote: string | null; why: string };
export type FieldFormat = { rules: FormatRule[]; not_checked: NotChecked[]; read: boolean };
type BoxFormat = { caption?: string | null; max_chars?: number; checks?: { function: string; args: string[]; quote: { key: string; text: string }[] }[]; ui_picture?: string; format_picture?: string };
type FormatsFile = { file: string; sha256: string; boxes: Record<string, BoxFormat> };

const files = new Map<string, FormatsFile | null>();
const lists = new Map<string, Record<string, DependentList> | null>();
/** BK-26: the dependent lists file beside an inventory ("…/imm1294e.inventory.json" → "…/imm1294e.lists.json",
 *  prototype/p1/xfa_inventory.py lists), by the box each list fills; null when the form has none. Read once. */
export function dependentListsFor(inventoryFile: string | null | undefined): Record<string, DependentList> | null {
  if (!inventoryFile || !/\.inventory\.json$/.test(inventoryFile)) return null;
  const f = inventoryFile.replace(/\.inventory\.json$/, ".lists.json");
  if (!lists.has(f)) { try { lists.set(f, (JSON.parse(readFileSync(join(SOLUTION, f), "utf8")) as { boxes?: Record<string, DependentList> }).boxes ?? null); } catch { lists.set(f, null); } }
  return lists.get(f) ?? null;
}
/** The formats file beside an inventory ("…/imm1295e.inventory.json" → "…/imm1295e.formats.json"), read once. */
export function formatsFor(inventoryFile: string | null | undefined): FormatsFile | null {
  if (!inventoryFile || !/\.inventory\.json$/.test(inventoryFile)) return null;
  const f = inventoryFile.replace(/\.inventory\.json$/, ".formats.json");
  if (!files.has(f)) { try { files.set(f, JSON.parse(readFileSync(join(SOLUTION, f), "utf8"))); } catch { files.set(f, null); } }
  return files.get(f) ?? null;
}

/** What the PDF box itself says, shown beside a proposal's form field (C3.1 AT-8/9/9b, IRCC-F07, P-162): its maximum
 *  length, its own list of choices (label and code, as the form lists them) and its date pattern. Null where the box
 *  says none; read from the inventory and the formats file beside it, never from the AI. */
export type PdfBoxFormat = { maxLength: number | null; choices: { label: string; code: string }[] | null; datePattern: string | null };
type InvBox = { data_path?: string; ui?: string | null; max_chars?: number | null; options_resolved?: [string, string][] | null; caption?: string | null };
const inventories = new Map<string, Map<string, InvBox> | null>();
export function pdfBoxFormats(inventoryFile: string | null | undefined): (dataPath: string) => PdfBoxFormat | null {
  if (!inventoryFile) return () => null;
  if (!inventories.has(inventoryFile)) {
    try { inventories.set(inventoryFile, new Map((JSON.parse(readFileSync(join(SOLUTION, inventoryFile), "utf8")).fields as InvBox[]).filter((f) => f.data_path).map((f) => [f.data_path!, f]))); } catch { inventories.set(inventoryFile, null); }
  }
  const inv = inventories.get(inventoryFile), fmt = formatsFor(inventoryFile);
  return (dataPath) => {
    const b = inv?.get(dataPath);
    if (!b) return null;
    const f = fmt?.boxes[dataPath];
    const picture = (f?.format_picture ?? f?.ui_picture ?? "").split("|")[0];
    const datePattern = /^date\{([^}]+)\}$/.exec(picture)?.[1] ?? (b.ui === "dateTimeEdit" ? /\b(YYYY[-/]?MM(?:[-/]?DD)?)\b/.exec(b.caption ?? "")?.[1] ?? null : null);
    const list = b.options_resolved ?? null;
    return { maxLength: b.max_chars ?? f?.max_chars ?? null, choices: list && list.length > 1 ? list.map(([label, code]) => ({ label, code })) : null, datePattern };
  };
}

/** One mapped form field of a shared field: the edition's label, its inventory, the box and the map's transform. */
export type MappedBox = { form: string; inventoryFile: string | null; dataPath: string; caption?: string | null; transform?: string | null };

/** A map's transform without its "select primary phone;" style choice of which value (review M1): the part that says
 *  how the value is written. */
const core = (transform: string | null | undefined) => (transform ?? "").split(";").map((x) => x.trim()).filter((x) => x && !/^select\b/i.test(x)).join("; ");
/** Whether a map's transform writes the value part by part (an address or a phone), after any "select …;" choice:
 *  the answer is then stored as parts (G4 family editor, GET /answer-keys/fields). */
export const writesParts = (transform: string | null | undefined) => /^(?:address_part|phone_part|phone):/.test(core(transform));
/** The answer part a form field writes (an address or phone part), from the map's transform; the phone's national
 *  number is the stored answer's `number`. */
const partOf = (transform: string | null | undefined) => {
  const p = /^(?:address_part|phone_part):(\w+)/.exec(core(transform))?.[1] ?? null;
  return p === "national_number_without_country_code" || p === "national_number" ? "number" : p;
};
const PHONE_PARTS = new Set(["number", "extension", "country_code"]);
/** The parts a stored answer has (contracts/runtime.ts Address and Phone): only these can be checked. */
const ANSWER_PARTS = new Set(["po_box", "apt_unit", "street_number", "street_name", "city", "district", "province", "postal_code", "country", "country_code", "number", "extension"]);

/** A shared field's format: every rule its boxes carry, merged (the tightest maximum length; each check once, with
 *  every form box that says so as its sources). `read` is false when no box of the field has a formats file. */
export function fieldFormat(boxes: MappedBox[], valueType?: string | null): FieldFormat {
  // Review m9: a field is a whole address or phone by its type, or when its form fields write its parts.
  const whole = valueType === "address" || valueType === "phone" || boxes.some((b) => partOf(b.transform) !== null);
  const rules = new Map<string, FormatRule>();
  const notChecked = new Map<string, NotChecked>();
  let read = false;
  const add = (check: FormatCheckId, params: Params, part: string | null, src: FormatSource) => {
    // Review M2: a rule on a piece the stored answer does not have (the phone's area code, exchange and line, which the
    // form splits out), on a whole address or phone, or on another date of the form is shown as not checked here.
    const why = part && !ANSWER_PARTS.has(part) ? `it applies to the ${partWords(part)}, a piece the form splits out of the answer`
      : !part && whole ? `it applies to the whole ${valueType} as one line on the form`
      : check === "date_after" && params.than === "other_date" ? "it compares two dates of the form, which is checked by the form's own rules" : null;
    if (why) { notChecked.set(`${check}|${part}|${src.form}`, { function: FORMAT_CHECKS[check].words(params), form: src.form, quote: src.quote, why }); return; }
    const id = `${check}|${part ?? ""}|${check === "max_length" || check === "min_length" ? "" : JSON.stringify(params)}`;
    const r = rules.get(id);
    if (!r) { rules.set(id, { check, params, words: FORMAT_CHECKS[check].words(params), part, part_words: part ? partWords(part) : null, sources: [src] }); return; }
    if (check === "max_length" && params.n! < r.params.n!) { r.params = params; r.words = FORMAT_CHECKS[check].words(params); r.sources = [src, ...r.sources]; return; }
    if (!r.sources.some((s) => s.form === src.form && s.box === src.box)) r.sources.push(src);
  };
  for (const b of boxes) {
    const box = (b.caption ?? "").replace(/^\*/, "").trim() || b.dataPath.split(".").slice(-2).join(".");
    const part = partOf(b.transform), t = core(b.transform);
    const file = formatsFor(b.inventoryFile);
    const f = file?.boxes[b.dataPath];
    if (file) read = true;
    // Date parts (date_part:MM …) are pieces of one date: the whole-date checks cover them.
    const datePart = /^date(_part)?:(YYYY|MM|DD)\b/.test(t);
    if (f?.max_chars && !datePart && !/^(yes_no|code_list|date|country)/.test(t)) add("max_length", { n: f.max_chars }, part, { form: b.form, box, quote: `The form field holds at most ${f.max_chars} characters`, from: "pdf_box" });
    else if (!f?.max_chars && !datePart) { const m = /max (\d+) char/.exec(t); if (m) add("max_length", { n: +m[1] }, part, { form: b.form, box, quote: b.transform ?? null, from: "field_map" }); }
    if (f?.format_picture && /^date\{YYYY-MM-DD\}/.test(f.format_picture)) add("date_pattern", {}, part, { form: b.form, box, quote: f.format_picture, from: "pdf_box" });
    for (const c of f?.checks ?? []) {
      const map = BY_FUNCTION[c.function];
      const quote = c.quote.map((q) => q.text).join(" ") || null;
      if (map === "type") continue;
      const r = map?.(c.args);
      if (!r) { notChecked.set(`${c.function}|${b.form}`, { function: c.function, form: b.form, quote, why: "no fixed check in code matches it yet" }); continue; }
      if (datePart && !["month", "day", "year_from_1900", "not_future"].includes(r.check)) continue;
      add(r.check, r.params ?? {}, part, { form: b.form, box, quote, from: "form_script" });
    }
  }
  // Review m3: "Year 1900 to this year" already says "1900 or later".
  for (const [k, r] of rules) if (r.check === "year_from_1900" && r.params.max !== "this_year" && [...rules.values()].some((x) => x.check === "year_from_1900" && x.params.max === "this_year" && x.part === r.part)) rules.delete(k);
  const order = (r: FormatRule) => FORMAT_CHECK_IDS.indexOf(r.check);
  return { rules: [...rules.values()].sort((a, b) => order(a) - order(b) || (a.part ?? "").localeCompare(b.part ?? "")), not_checked: [...notChecked.values()], read };
}

/** An answer part in words (P-63: never "box"; the post office box is "post office number"). */
const PART_WORD: Record<string, string> = { po_box: "post office number", apt_unit: "apartment or unit", street_number: "street number", street_name: "street name", postal_code: "postal code", nanp_area_code: "area code", nanp_exchange: "exchange", nanp_subscriber: "line number", number: "number", country_code: "country code", extension: "extension" };
export const partWords = (part: string) => PART_WORD[part] ?? part.replace(/_/g, " ");

/** The format in one line for a list row ("Digits only · At most 10 characters"), or null when nothing was read. */
export const formatWords = (f: FieldFormat) => (f.rules.length ? [...new Set(f.rules.map((r) => (r.part ? `${partWords(r.part)}: ${r.words}` : r.words)))].join(" · ") : null);

/** Every format problem of a value, in plain words (empty when it is fine). A value that is an object (an address, a
 *  phone) is checked part by part; an empty value is left to the "required" check. */
export function checkFormat(format: FieldFormat, value: unknown, ctx: FormatContext = {}): string[] {
  const out: string[] = [];
  for (const r of format.rules) {
    let v: unknown = value, c = ctx;
    if (r.part) {
      if (!value || typeof value !== "object") continue;
      v = (value as Record<string, unknown>)[r.part];
      const country = (value as Record<string, unknown>).country;
      if (typeof country === "string" && !c.country) c = { ...c, country };
    } else if (value && typeof value === "object") continue;
    if (v === null || v === undefined || typeof v === "boolean") continue;
    let s = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : null;
    // Review M5: a phone piece is written as its digits (p5/transforms.ts drops spaces, hyphens, dots and brackets), as
    // the type check reads it; letters still fail.
    if (s && PHONE_PARTS.has(r.part ?? "")) s = s.replace(/[\s\-.()]/g, "");
    if (!s) continue;
    const m = FORMAT_CHECKS[r.check].test(s, r.params, c);
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}

type SnapshotMaps = { field_maps: { form_edition: string; inventory_file?: string | null; channel?: string; entries: { data_path: string; caption?: string | null; outcome?: string; fact?: string | null; transform?: string | null }[] }[] };
const perSnapshot = new WeakMap<object, Map<string, FieldFormat>>();
/** A field's format in a release (the PDF field maps the release carries; online versions have no formats file). */
export function snapshotFieldFormat(s: SnapshotMaps, field: string): FieldFormat {
  let m = perSnapshot.get(s);
  if (!m) { m = new Map(); perSnapshot.set(s, m); }
  if (!m.has(field)) {
    const boxes: MappedBox[] = s.field_maps.filter((f) => f.channel !== "ONLINE").flatMap((f) => f.entries.filter((e) => e.fact === field && (e.outcome ?? "mapped") === "mapped").map((e) => ({ form: f.form_edition, inventoryFile: f.inventory_file ?? null, dataPath: e.data_path, caption: e.caption, transform: e.transform })));
    const type = (s as unknown as { canonical_fields?: { id: string; value_type?: string }[] }).canonical_fields?.find((f) => f.id === field)?.value_type ?? null;
    m.set(field, fieldFormat(boxes, type));
  }
  return m.get(field)!;
}
