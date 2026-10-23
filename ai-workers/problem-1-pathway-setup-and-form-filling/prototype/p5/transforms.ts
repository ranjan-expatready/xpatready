// Executes a released field map's transformation text on a confirmed fact value (8.2 "Prepare the form from its
// mapped facts"; W1 3.7 r5 "Rules, not AI"). The drafted transformations are free text; this executor recognises a
// closed set of steps, each matched exactly. Anything it does not recognise, a dependent code list, or a value the
// box cannot hold goes to the hand-completion list (8.5) with its reason: never guessed, never truncated.
// Finding (P5, D34): transformations, like conditions before AIW-D264, need a closed vocabulary in the contract.

export type Address = { po_box?: string; apt_unit?: string; street_number?: string; street_name?: string; city?: string; district?: string; province?: string; postal_code?: string; country?: string };
export type Phone = { role?: string; type?: string; country_code?: string; number?: string; extension?: string };
export type Box = { ui?: string; max_chars?: number | null; options?: unknown; options_resolved?: [string, string][] | null };
export type Outcome = { ok: true; value: string; steps: string[] } | { ok: false; hand: true; reason: string; steps: string[] } | { ok: false; blank: true; reason: string; steps: string[] };

const PROVINCES: Record<string, string> = { AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador", NS: "Nova Scotia", NT: "Northwest Territories", NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan", YT: "Yukon" };
/** Country codes printed on travel documents (ICAO three-letter codes) for the countries in this demonstration. */
const ISO3: Record<string, string> = { IND: "India", CAN: "Canada", USA: "United States of America", GBR: "United Kingdom", INDIAN: "India" };
const SEX: Record<string, string> = { F: "Female", M: "Male", X: "Unspecified", U: "Unknown" };

/** A Canadian or simple international one-line address into parts ("100 Example Street, Toronto, ON M5V 1A1"). */
export function parseAddress(v: unknown): Address | null {
  if (v && typeof v === "object") return v as Address;
  if (typeof v !== "string" || !v.trim()) return null;
  const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
  const a: Address = {};
  const first = /^(\d+[A-Z]?)\s+(.+)$/i.exec(parts[0] ?? "");
  if (first && parts.length > 1) { a.street_number = first[1]; a.street_name = first[2]; parts.shift(); }
  const last = parts.at(-1) ?? "";
  const ca = /^(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\s*([A-Z]\d[A-Z]\s?\d[A-Z]\d)?$/i.exec(last);
  if (ca) { a.province = ca[1].toUpperCase(); if (ca[2]) a.postal_code = ca[2].toUpperCase(); a.country = "Canada"; parts.pop(); }
  else if (parts.length > 1 && /^[A-Za-z .'-]+$/.test(last)) { a.country = last; parts.pop(); }
  if (parts.length) a.city = parts.pop();
  if (parts.length) a.district = parts.join(", ");
  return a;
}

const oneLine = (a: Address) => [[a.apt_unit, a.street_number, a.street_name].filter(Boolean).join(" "), a.city, [a.province, a.postal_code].filter(Boolean).join(" "), a.country].filter(Boolean).join(", ");

function choices(box: Box): [string, string][] {
  if (box.options_resolved) return box.options_resolved;
  const o = box.options as any;
  if (Array.isArray(o) && Array.isArray(o[0]) && Array.isArray(o[1]) && typeof o[0][0] !== "object" && o.length === 2 && o[0].length === o[1].length && !Array.isArray(o[0][0])) {
    if (o[0].every((x: unknown) => typeof x === "string") && o[1].every((x: unknown) => typeof x === "string") && o[0].length > 2) return o[0].map((l: string, i: number) => [l, o[1][i]]);
  }
  return Array.isArray(o) ? o.filter((p: unknown) => Array.isArray(p) && p.length === 2).map((p: any) => [String(p[0]), String(p[1])]) : [];
}

/** A value's code in the box's own option list: by code, by label, by the label's first word, or via the small
 *  alias tables above (sex letters, ICAO country codes, province letters). No fuzzy match. */
export function codeFor(value: string, box: Box, inline?: Record<string, string>): string | null {
  const v = value.trim();
  if (inline) { for (const [l, c] of Object.entries(inline)) if (l.toLowerCase() === v.toLowerCase() || c === v) return c; }
  const opts = choices(box).filter(([l, c]) => l !== "" || c !== "");
  const norm = (s: string) => s.replace(/^\*/, "").trim().toLowerCase();
  const cands = [v, SEX[v.toUpperCase()], ISO3[v.toUpperCase()], PROVINCES[v.toUpperCase()]].filter(Boolean) as string[];
  for (const c of cands) {
    const hit = opts.find(([l, code]) => code === c || norm(l) === norm(c) || norm(l).split(/\s+/)[0] === norm(c) || norm(l).replace(/-/g, " ") === norm(c).replace(/[_-]/g, " "));
    if (hit) return hit[1];
  }
  return null;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Runs one transformation text on one value for one box. `rows` lets "select …" pick among a person's rows. */
export function runTransform(transform: string | undefined, value: unknown, box: Box): Outcome {
  // Steps are separated by ";" (P1/P2 maps) or "->" (the 21 Oct live IMM 5257 draft). Two spelling aliases from that
  // draft name existing executable steps: date_part:X = date:X, address_part:province_state = address_part:province.
  const steps = String(transform ?? "as_is").split(/;|->/).map((s) => s.trim().replace(/^date_part:/, "date:").replace(/^address_part:province_state\b/, "address_part:province")).filter(Boolean);
  const hand = (reason: string): Outcome => ({ ok: false, hand: true, reason, steps });
  const blank = (reason: string): Outcome => ({ ok: false, blank: true, reason, steps });
  let v: any = value;
  if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) {
    // A derive-to-N/0 on a missing fact is still a value ("no other name recorded"); everything else stays blank.
    const d = steps.find((s) => s.startsWith("derive:"));
    if (d && /^derive:Y if any .+ (is|are) recorded, else N$/.test(d)) return { ok: true, value: "N", steps };
    return blank("no confirmed value");
  }
  for (const s of steps) {
    let m: RegExpExecArray | null;
    if ((m = /^select (primary|alternate) phone$/.exec(s))) { const rows = Array.isArray(v) ? v : [v]; v = rows.find((r: Phone) => (r.role ?? "primary") === m![1]); if (!v) return blank(`no ${m[1]} phone`); continue; }
    if (/^select prospective employer organisation$/.test(s)) { const rows = Array.isArray(v) ? v : [v]; v = rows.find((r: any) => (r?.role ?? "prospective employer") === "prospective employer"); if (v && typeof v === "object" && "value" in v) v = v.value; if (!v) return blank("no prospective employer"); continue; }
    if (s.startsWith("select ")) return hand(`record selection "${s}" is not in the executable set`);
    if ((m = /^as_is(?: \(max (\d+) char(?:s|acters)\))?$/.exec(s))) {
      v = typeof v === "boolean" ? (v ? "Yes" : "No") : String(v);
      const max = Number(m[1] ?? box.max_chars ?? 0);
      if (max && v.length > max) return hand(`value is ${v.length} characters; the box holds ${max} (never truncated)`);
      continue;
    }
    if ((m = /^date:(YYYY-MM-DD|YYYY|MM|DD)$/.exec(s))) { const d = DATE.exec(String(v)); if (!d) return hand(`not a full date: ${v}`); v = m[1] === "YYYY-MM-DD" ? d[0] : m[1] === "YYYY" ? d[1] : m[1] === "MM" ? d[2] : d[3]; continue; }
    if ((m = /^yes_no_code:([^/]+)\/(.+)$/.exec(s))) { if (typeof v !== "boolean") return hand(`not a yes/no value: ${v}`); v = v ? m[1] : m[2]; continue; }
    if ((m = /^derive:Y if any .+ (?:is|are) recorded, else N$/.exec(s))) { v = (Array.isArray(v) ? v.length > 0 : v !== false && v !== "") ? "Y" : "N"; continue; }
    if ((m = /^derive:1 if (?:fax )?country calling code is (not )?1(?: \([^)]*\))?, else 0$/.exec(s))) { const cc = String((v as Phone).country_code ?? ""); if (!cc) return hand("phone has no country calling code"); v = (cc === "1") !== !!m[1] ? "1" : "0"; continue; }
    if ((m = /^phone_part:(extension|country_calling_code|national_number)\b/.exec(s))) {
      const p = v as Phone; const part = m[1] === "extension" ? p.extension : m[1] === "country_calling_code" ? p.country_code : p.number;
      if (!part) return blank(`no ${m[1]}`);
      if (m[1] !== "country_calling_code" && p.country_code === "1" && m[1] === "national_number") return blank("North American number goes in the area-code boxes");
      v = String(part).replace(/\D/g, ""); continue;
    }
    if (/^phone_part:nanp_/.test(s)) { const p = v as Phone; if (p.country_code !== "1") return blank("not a North American number"); return hand("North American number parts are not in the executable set yet"); }
    if ((m = /^address_part:(city|province|country|postal_code|street_number|street_name|apt_unit|district|po_box)\b/.exec(s))) { const a = parseAddress(v); const part = a?.[m[1] as keyof Address]; if (!part) return blank(`address has no ${m[1]}`); v = part; const max = /max (\d+) char/.exec(s); if (max && String(v).length > Number(max[1])) return hand(`${m[1]} longer than ${max[1]} characters`); continue; }
    if ((m = /^address_single_line(?: \(max (\d+) chars\))?$/.exec(s))) { const a = parseAddress(v); if (!a) return hand("not an address"); v = typeof value === "string" ? value : oneLine(a); if (m[1] && v.length > Number(m[1])) return hand(`address longer than ${m[1]} characters`); continue; }
    if (/^country_name_text$/.test(s)) { const c = ISO3[String(v).toUpperCase()] ?? String(v); v = c; continue; }
    if ((m = /^code_list:[\w.]+(?: \((.*)\))?$/.exec(s))) {
      const inline: Record<string, string> = {};
      for (const pair of (m[1] ?? "").split(",")) { const q = /^\s*([^=|]+?)\s*=\s*(\w+)\s*$/.exec(pair); if (q) inline[q[1]] = q[2]; }
      if (!choices(box).length && !Object.keys(inline).length) return hand("code list depends on another answer (dependent list); the form's own rules fill it");
      const code = codeFor(String(v), box, Object.keys(inline).length ? inline : undefined) ?? (Object.keys(inline).length ? codeFor(String(v), box) : null);
      if (code === null) return hand(`"${v}" is not in the box's option list`);
      v = code; continue;
    }
    return hand(`step "${s}" is not in the executable set`);
  }
  return { ok: true, value: String(v), steps };
}
