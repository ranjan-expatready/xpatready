// Answer lists and option maps (F1 challenge point 3; the team's EnumSet and ENUM transform). One answer list per
// choice field; each form field, PDF or online, maps the list's values to its own codes:
//   optionMap = { map: { value key: form code }, unused: [form codes no value fills], codes: [every form code],
//                 notOnForm: [value keys a person marked: the form prints no choice for them, so filling refuses them (B81)] }
// `map` is the team's ENUM transform map (onMissing REFUSE). Drafting is by code, without AI: the code or label equals
// the value's key or label, the label's first word, or the executor's alias tables (P5 codeFor: sex letters, ICAO
// country codes, province letters), then a label the value's own ends with. What stays unmatched goes to a person.
import { codeFor } from "../../p5/transforms.ts";
import { printedChoices } from "./printed-choices.ts";

export type ListValue = { key: string; label: string };
export type FormOption = { code: string; label: string };
export type OptionMap = { map: Record<string, string>; unused: string[]; codes: string[]; notOnForm?: string[] };

const n = (s: string) => s.toLowerCase().replace(/^\*/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
const firstWord = (s: string) => n(s).split(" ")[0];

/** `notOnForm` (B81): values a person marked stay marked and are never drafted a code. */
export function draftOptionMap(values: ListValue[], options: FormOption[], notOnForm: string[] = []): { optionMap: OptionMap; unmatched: string[] } {
  const opts = options.filter((o) => o.code !== "" || o.label !== "");
  const map: Record<string, string> = {};
  const taken = new Set<string>();
  const marked = values.filter((v) => notOnForm.includes(v.key)).map((v) => v.key);
  const open0 = values.filter((v) => !marked.includes(v.key));
  for (const v of open0) {
    // B81: a first word two printed choices share decides nothing ("Married" against "Married-physically present" and
    // "Married-not physically present"): which one holds is a fact the value does not say, so it stays with a person.
    const sameWord = opts.filter((o) => firstWord(o.label) === firstWord(v.label));
    const hit = opts.find((o) => !taken.has(o.code) && (n(o.code) === n(v.key) || n(o.label) === n(v.label) || n(o.code) === n(v.label) || n(o.label) === n(v.key)))
      ?? (sameWord.length === 1 && !taken.has(sameWord[0].code) && firstWord(v.label).length > 2 ? sameWord[0] : undefined);
    const code = hit?.code ?? codeFor(v.label, { options_resolved: opts.map((o) => [o.label, o.code]) as [string, string][] });
    if (code !== null && code !== undefined && !taken.has(code)) { map[v.key] = code; taken.add(code); }
  }
  // QA-144 slice 2: a form that prints a shorter label ends the value's own (IMM 5710 "Separated" for the list's "Legally
  // Separated"). Only after every exact match is taken, and only one to one: the value has exactly one free option that
  // is its ending, and no other unmatched value ends with that option (review R1-M1: "Simplified Chinese" and
  // "Traditional Chinese" against one "Chinese" stay with a person).
  const ends = (v: ListValue, o: FormOption) => !taken.has(o.code) && n(o.label).length > 3 && n(v.label).endsWith(` ${n(o.label)}`);
  const open = open0.filter((v) => !(v.key in map));
  const pairs = open.map((v) => [v, opts.filter((o) => ends(v, o))] as const).filter(([, t]) => t.length === 1);
  for (const [v, [o]] of pairs) if (open.filter((w) => ends(w, o)).length === 1) { map[v.key] = o.code; taken.add(o.code); }
  const codes = opts.map((o) => o.code);
  return { optionMap: { map, unused: codes.filter((c) => !taken.has(c)), codes, ...(marked.length ? { notOnForm: marked } : {}) }, unmatched: open0.filter((v) => !(v.key in map)).map((v) => v.key) };
}

/** Problems of one form field's option map against its answer list: every value needs a code or a person's "not on this
 *  form" (else filling refuses it unexplained); every code of the form field is filled by a value or listed as unused
 *  (nothing silently dropped). */
export function optionMapProblems(values: string[], m: OptionMap | null | undefined): string[] {
  if (!m) return ["it has no option map yet"];
  const out: string[] = [];
  const marked = m.notOnForm ?? [];
  const missing = values.filter((v) => !(v in m.map) && !marked.includes(v));
  if (missing.length) out.push(`no code for ${missing.map((v) => `"${v}"`).join(", ")} (filling would refuse ${missing.length > 1 ? "them" : "it"})`);
  const covered = new Set([...Object.values(m.map), ...m.unused]);
  const loose = m.codes.filter((c) => !covered.has(c));
  if (loose.length) out.push(`the form's code${loose.length > 1 ? "s" : ""} ${loose.map((c) => `"${c}"`).join(", ")} ${loose.length > 1 ? "are" : "is"} neither mapped nor marked unused`);
  const unknown = Object.keys(m.map).filter((k) => !values.includes(k));
  if (unknown.length) out.push(`it maps ${unknown.map((v) => `"${v}"`).join(", ")}, which the answer list does not have`);
  const stale = marked.filter((v) => !values.includes(v));
  if (stale.length) out.push(`it marks ${stale.map((v) => `"${v}"`).join(", ")} not on this form, which the answer list does not have`);
  const both = marked.filter((v) => v in m.map);
  if (both.length) out.push(`${both.map((v) => `"${v}"`).join(", ")} ${both.length > 1 ? "have" : "has"} a code and ${both.length > 1 ? "are" : "is"} marked not on this form`);
  return out;
}

/** True when a form field chooses among codes of its own (a code list, an option map, a yes/no code), judged by the
 *  last step of its transform ("select primary phone; code_list:…" → code_list). A derived field ("derive:Y if …") or
 *  a text field (as_is, country_name_text, date …) has no codes, so it needs no option map (runtime lane defect, 23 Oct). */
export function hasCodes(transform: string | null | undefined): boolean {
  return (transform ?? "").split(";").some((s) => /^(code_list\b|option_map$|yes_no_code\b)/.test(s.trim()));
}

/** A text form field fed by a field on an answer list writes the value's label, never its key ("india" → "India"). */
export function labelForText(value: unknown, values: ListValue[]): unknown {
  return typeof value === "string" ? values.find((v) => v.key === value)?.label ?? value : value;
}

/** The form field's code for a shared value (a value key, or its label). null → the filler refuses (onMissing REFUSE). */
export function codeForValue(value: unknown, m: OptionMap, values: ListValue[]): string | null {
  const v = String(value ?? "").trim();
  const key = values.find((x) => x.key === v || n(x.label) === n(v))?.key ?? v;
  return Object.hasOwn(m.map, key) ? m.map[key] : null; // "toString" is not a code (break m11)
}

/** The printed choice a value's own words are, when the form prints them: such a value is on the form, so it can never
 *  be marked "not on this form" (B81; AGENTS.md rule 4: the form's own words decide). */
export function printedAs(v: ListValue, options: FormOption[]): FormOption | null {
  return options.find((o) => n(o.label) === n(v.label)) ?? null;
}

/** The value a person marked not on this form, when `value` is one: filling refuses it in the value's own words (B81). */
export function notOnFormValue(value: unknown, m: OptionMap, values: ListValue[]): ListValue | null {
  const v = String(value ?? "").trim();
  const hit = values.find((x) => x.key === v || n(x.label) === n(v)) ?? { key: v, label: v };
  return (m.notOnForm ?? []).includes(hit.key) ? hit : null;
}

/** A PDF form field's own choices (label, code): its inventory's resolved options, else the drop-down it prints (two
 *  columns: words, then codes; B81: the form's own words come before anything an earlier reading wrote about it), else
 *  the inline code list of its field map ("code_list:imm5707.marital_status (Common-law=1, Single=2, …; note)"), as the
 *  filler reads them. */
export function pdfOptions(box: { options_resolved?: [string, string][] | null; options?: unknown; ui?: string | null }, transform: string | null | undefined): FormOption[] {
  if (Array.isArray(box.options_resolved) && box.options_resolved.length) return box.options_resolved.filter((o) => o[0] !== "" || o[1] !== "").map((o) => ({ code: String(o[1]), label: String(o[0]) }));
  const printed = box.ui === "choiceList" ? printedChoices(box) : [];
  if (Array.isArray(printed) && printed.length) return printed.map(([label, code]) => ({ code, label }));
  const m = /^code_list:[\w.]+ \(([^;)]*)/.exec((transform ?? "").trim());
  if (!m) return [];
  return m[1].split(",").map((pair) => /^\s*([^=|]+?)\s*=\s*(\w+)\s*$/.exec(pair)).filter((q): q is RegExpExecArray => !!q).map((q) => ({ code: q[2], label: q[1] }));
}
