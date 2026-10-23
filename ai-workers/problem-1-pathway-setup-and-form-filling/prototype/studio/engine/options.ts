// Answer lists and option maps (F1 challenge point 3; the team's EnumSet and ENUM transform). One answer list per
// choice field; each form field, PDF or online, maps the list's values to its own codes:
//   optionMap = { map: { value key: form code }, unused: [form codes no value fills], codes: [every form code] }
// `map` is the team's ENUM transform map (onMissing REFUSE). Drafting is by code, without AI: the code or label equals
// the value's key or label, the label's first word, or the executor's alias tables (P5 codeFor: sex letters, ICAO
// country codes, province letters). What stays unmatched goes to a person.
import { codeFor } from "../../p5/transforms.ts";

export type ListValue = { key: string; label: string };
export type FormOption = { code: string; label: string };
export type OptionMap = { map: Record<string, string>; unused: string[]; codes: string[] };

const n = (s: string) => s.toLowerCase().replace(/^\*/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

export function draftOptionMap(values: ListValue[], options: FormOption[]): { optionMap: OptionMap; unmatched: string[] } {
  const opts = options.filter((o) => o.code !== "" || o.label !== "");
  const map: Record<string, string> = {};
  const taken = new Set<string>();
  for (const v of values) {
    const hit = opts.find((o) => !taken.has(o.code) && (n(o.code) === n(v.key) || n(o.label) === n(v.label) || n(o.code) === n(v.label) || n(o.label) === n(v.key)))
      ?? opts.find((o) => !taken.has(o.code) && n(o.label).split(" ")[0] === n(v.label).split(" ")[0] && n(v.label).split(" ")[0].length > 2);
    const code = hit?.code ?? codeFor(v.label, { options_resolved: opts.map((o) => [o.label, o.code]) as [string, string][] });
    if (code !== null && code !== undefined && !taken.has(code)) { map[v.key] = code; taken.add(code); }
  }
  const codes = opts.map((o) => o.code);
  return { optionMap: { map, unused: codes.filter((c) => !taken.has(c)), codes }, unmatched: values.filter((v) => !(v.key in map)).map((v) => v.key) };
}

/** Problems of one form field's option map against its answer list: every value needs a code (else filling refuses
 *  it); every code of the form field is filled by a value or listed as unused (nothing silently dropped). */
export function optionMapProblems(values: string[], m: OptionMap | null | undefined): string[] {
  if (!m) return ["it has no option map yet"];
  const out: string[] = [];
  const missing = values.filter((v) => !(v in m.map));
  if (missing.length) out.push(`no code for ${missing.map((v) => `"${v}"`).join(", ")} (filling would refuse ${missing.length > 1 ? "them" : "it"})`);
  const covered = new Set([...Object.values(m.map), ...m.unused]);
  const loose = m.codes.filter((c) => !covered.has(c));
  if (loose.length) out.push(`the form's code${loose.length > 1 ? "s" : ""} ${loose.map((c) => `"${c}"`).join(", ")} ${loose.length > 1 ? "are" : "is"} neither mapped nor marked unused`);
  const unknown = Object.keys(m.map).filter((k) => !values.includes(k));
  if (unknown.length) out.push(`it maps ${unknown.map((v) => `"${v}"`).join(", ")}, which the answer list does not have`);
  return out;
}

/** The form field's code for a shared value (a value key, or its label). null → the filler refuses (onMissing REFUSE). */
export function codeForValue(value: unknown, m: OptionMap, values: ListValue[]): string | null {
  const v = String(value ?? "").trim();
  const key = values.find((x) => x.key === v || n(x.label) === n(v))?.key ?? v;
  return m.map[key] ?? null;
}
