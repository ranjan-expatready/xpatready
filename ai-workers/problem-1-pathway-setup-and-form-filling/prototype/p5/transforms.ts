// Executes a released field map's transformation text on a confirmed fact value (8.2 "Prepare the form from its
// mapped facts"; W1 3.7 r5 "Rules, not AI"). The drafted transformations are free text; this executor recognises a
// closed set of steps, each matched exactly. Anything it does not recognise, a dependent code list, or a value the
// box cannot hold goes to the hand-completion list (8.5) with its reason: never guessed, never truncated.
// Finding (P5, D34): transformations, like conditions before AIW-D264, need a closed vocabulary in the contract.

export type Address = { po_box?: string; apt_unit?: string; street_number?: string; street_name?: string; city?: string; district?: string; province?: string; postal_code?: string; country?: string };
export type Phone = { role?: string; type?: string; country_code?: string; number?: string; extension?: string };
/** `options_scope` (BK-26): the box's choices are one list of a dependent list (dependentChoices below), named in words;
 *  a value not in it is refused, never left to a guess. */
export type Box = { ui?: string; max_chars?: number | null; options?: unknown; options_resolved?: [string, string][] | null; options_scope?: string };
export type Outcome = { ok: true; value: string; steps: string[] } | { ok: false; hand: true; reason: string; steps: string[] } | { ok: false; blank: true; reason: string; steps: string[] } | { ok: false; refused: true; reason: string; steps: string[] };

/** BK-26: a list the form's own script fills from another box's answer (IMM 1294's city from its province:
 *  `setDDLFromLOV(CityTown.CityTown, "CityList." + this.formattedValue+".City[*]")`), every list read from the official
 *  file's own datasets by prototype/p1/xfa_inventory.py (`<form>.lists.json`). `key` says which of the other box's values
 *  picks the list: the label it shows (the script's formattedValue) or its code (rawValue). */
export type DependentList = { caption?: string | null; depends_on: string; depends_on_caption?: string | null; key: "label" | "code"; list: string; quote?: string; lists: Record<string, [string, string][]> };

/** BK-26: the choices of a dependent list for the value the copy writes in the box it depends on (its code, as written),
 *  or why a person picks it. Only the form's own lists; never a guess. Pure. */
export function dependentChoices(dep: DependentList, source: Box | undefined, written: string | undefined): { options: [string, string][]; scope: string } | { why: string } {
  const other = (dep.depends_on_caption ?? "").replace(/^\s*\*\s*/, "").trim() || "the box it depends on";
  if (written === undefined || written === "") return { why: `its choices are the form's own list for the answer to "${other}", which this copy does not write: a person picks it once "${other}" is filled` };
  const own = choices(source ?? {}).filter(([l, c]) => l !== "" || c !== "");
  const key = dep.key === "code" || !own.length ? written : own.find(([, c]) => c === written)?.[0];
  const options = key === undefined ? undefined : (dep.lists[key] ?? []).filter(([l, c]) => l !== "" || c !== "");
  const where = dep.list.replace("{}", key ?? written);
  if (key === undefined || !options?.length) return { why: `the form's own datasets have no list ${where} for "${other}" ${key ?? written}: a person picks it` };
  return { options, scope: `the form's own list of choices for "${other}" ${key} (its datasets, ${where}: ${options.length} entries)` };
}

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
/** C7.2 cause 2: a fact asked to the month (job and education rows, YYYY-MM) still gives its year and month boxes. */
const MONTH = /^(\d{4})-(\d{2})$/;

/** C7.2 cause 3: a Yes/No box derived from whether something is recorded (the 21 Oct IMM 5257 draft's wording). With
 *  nothing recorded it is still a value ("N"), but only once a person confirmed that nothing applies: the caller marks
 *  such a box (engine/runtime/forms.ts markNothingRecorded) and passes Context.nothingRecorded (api/src/fill.ts); with
 *  an empty value and no such flag the box stays blank. */
const RECORDED = /^derived:(?:any\(([\w.,\s]+)\) recorded|([\w.]+) recorded|valid ([\w.]+) recorded \(not expired\)|any post-secondary education record exists|any previous residence in past 5 years\b.*)$/;
/** QA-318 (C7.2): a drafted map's prose spelling of the same kind of Yes/No, "derive: true if any <what> is recorded for the
 *  subject, else false" (IMM 5257 SCH1 (09-2023) Questions 4 and 7), or with the form's own limits on what counts ("true if
 *  any recorded trip, starting after …, went to …, else false", Question 8). Group 1 is what is recorded; group 2 is set
 *  when the form counts only some of them. */
const PROSE_RECORDED = /^derive: true if any (?:(.+?) (?:is|are) recorded(?: for the subject)?|recorded (.+?))(?:, else false)$/i;
/** Whether a transformation's first step is that prose Yes/No (engine/runtime/forms.ts markNothingRecorded reads it). */
export const proseRecorded = (transform: string | null | undefined) => PROSE_RECORDED.test(stepsOf(transform)[0] ?? "");
/** A transformation's steps: separated by ";" (P1/P2 maps), "->" (the 21 Oct live IMM 5257 draft) or " then " before a
 *  step word (BK-22: IMM 1294 (06-2026)'s draft, "address_part:country then code_list:…"; before, the second step was
 *  ignored and "India" went into a list box, #1695 C1b). Spelling aliases name existing executable steps: date_part:X =
 *  date:X, address_part:province_state = address_part:province, and (BK-22, #1695 C1) address_part:unit =
 *  address_part:apt_unit, phone_part:national_number_without_country_code = phone_part:national_number, check:A/B =
 *  check_code:A/B, and a code list written with no space before its bracket ("code_list:imm1295.sex(…)"). */
const SPELLING: [RegExp, string][] = [[/^date_part:/, "date:"], [/^address_part:province_state\b/, "address_part:province"], [/^address_part:unit\b/, "address_part:apt_unit"],
  [/^phone_part:national_number_without_country_code\b/, "phone_part:national_number"], [/^check:(?=[^/]+\/)/, "check_code:"], [/^(code_list:[\w.]+)\(/, "$1 ("]];
const stepsOf = (transform: string | null | undefined) => String(transform ?? "as_is").split(/;|->|\s+then\s+(?=[a-z_]+:)/).map((s) => SPELLING.reduce((t, [re, to]) => t.replace(re, to), s.trim())).filter(Boolean);

/** BK-22 (#1695 C1): a drafted map names a fact in words ("applying-from country", "residential address") or by a key
 *  drafted under another group ("case.applying_from_country" for the box's own person.applying_from_country). Its key:
 *  the box's own fact when the name is the own fact's name; else a key as written, or the words' name in the own fact's
 *  group. null when the words are not a name (then the step stays not executable). */
function factNamed(words: string, ownFact?: string): string | null {
  const w = words.trim(), key = /^[a-z]+\.[a-z][\w]*$/.test(w);
  const name = key ? w.split(".").pop()! : /^[a-z][a-z -]*[a-z]$/i.test(w) ? w.toLowerCase().replace(/[ -]+/g, "_") : null;
  if (!name) return null;
  if (ownFact && ownFact.split(".").pop() === name) return ownFact;
  return key ? w : ownFact ? `${ownFact.split(".")[0]}.${name}` : null;
}
/** BK-22: a step that sets a code from a yes/no ("yes_no_code:Y/N", "check_code:1/0"). */
const CODE_STEP = /^(?:yes_no_code|check_code):[^/]+\/.+$/;
/** BK-22 (#1695 C1): the drafters' prose Yes/No steps, written as the executable ones. "derive: Y if <A> equals <B>, else
 *  N" (IMM 1294) and "derive:<A> equals <B>" (IMM 1295) are "derived:<A> equals <B>"; "derive: Y if <own fact> = 206 (ISR
 *  (Israel)), else N" is "derived:<own fact> is one of 206|ISR|Israel". A prose step that says its own letters ("Y if …,
 *  else N") with no code step after it gets that code step ("yes_no_code:Y/N"). Words that name no fact stay as written,
 *  so they stay not executable (never guessed). */
export function canonicalSteps(transform: string | null | undefined, ownFact?: string): string[] {
  const steps = stepsOf(transform), out: string[] = [];
  for (const [i, s] of steps.entries()) {
    const codeAfter = CODE_STEP.test(steps[i + 1] ?? "");
    let m = /^derive: ?(\w+) if (.+?) equals (.+?), else (\w+)$/.exec(s), a: string | null, b: string | null;
    if (m && (a = factNamed(m[2], ownFact)) && (b = factNamed(m[3], ownFact))) { out.push(`derived:${a} equals ${b}`, ...(codeAfter ? [] : [`yes_no_code:${m[1]}/${m[4]}`])); continue; }
    if ((m = /^derive: ?(?!\w+ if )([^,]+?) equals ([^,]+)$/.exec(s)) && (a = factNamed(m[1], ownFact)) && (b = factNamed(m[2], ownFact))) { out.push(`derived:${a} equals ${b}`); continue; }
    if ((m = /^derive: ?(\w+) if (.+?) = (\w+)(?: \(([A-Z]{2,3})(?: \(([A-Za-z .'-]+)\))?\))?, else (\w+)$/.exec(s)) && ownFact && factNamed(m[2], ownFact) === ownFact) {
      out.push(`derived:${ownFact} is one of ${[m[3], m[4], m[5]].filter(Boolean).join("|")}`, ...(codeAfter ? [] : [`yes_no_code:${m[1]}/${m[6]}`])); continue;
    }
    out.push(s);
  }
  return out;
}
/** BK-22 (#1695 C1): a "same as" Yes/No ("A equals B" then its yes/no code), in any of its spellings, for
 *  engine/form-values.ts sameAsLeavesRowEmpty: A's own form fields are left empty when the answer is the same. */
export function sameAsOf(transform: string | null | undefined, ownFact?: string): { a: string; b: string; yes: string } | null {
  const steps = canonicalSteps(transform, ownFact);
  const i = steps.findIndex((s) => /^derived:[\w.]+ equals [\w.]+$/.test(s));
  const code = i < 0 ? null : steps.slice(i + 1).map((s) => /^yes_no_code:([^/]+)\//.exec(s)).find(Boolean);
  if (i < 0 || !code) return null;
  const [, a, b] = /^derived:([\w.]+) equals ([\w.]+)$/.exec(steps[i])!;
  return { a, b, yes: code[1] };
}
/** Whether a transformation is a "recorded" Yes/No derivation, and the other facts it names (any(a, b)). */
export function recordedDerivation(transform: string | null | undefined): { facts: string[] } | null {
  const m = stepsOf(transform).map((s) => RECORDED.exec(s)).find(Boolean);
  return m ? { facts: (m[1] ?? m[2] ?? m[3] ?? "").split(",").map((f) => f.trim()).filter(Boolean) } : null;
}
const present = (x: unknown) => !(x === undefined || x === null || x === "" || x === false || (Array.isArray(x) && !x.length));
/** Two confirmed values are the same answer: addresses by their one-line form, anything else by its trimmed text. */
/** QA-403: a value as one lower-case word to compare with a map's word, or null when it is not one word or number. */
const wordOf = (x: unknown): string | null => (typeof x === "string" || typeof x === "number") && /^[\w-]+$/.test(String(x).trim()) ? String(x).trim().toLowerCase() : null;
/** QA-403: "derived: A if <fact> = <word>, else B (…)". */
const TICK_EQ = /^derived: ?(\S+) if ([a-z]+\.[\w.]+) = ([\w-]+), else (\S+?)(?: \([^()]*\))?$/;
/** Review m2 (#1588): words in a plain-language note that order a change, not describe the value. */
const NOTE_ORDERS = /\b(write|upper|lower|case|capital|format|code|digit|abbreviat|translat|first|last|only|without|remove|add)/i;
/** QA-403: "derived:checked_if_<name>_is_<word>:A/B" or "…_not_<w1>_<w2>_or_<w3>:A/B". With the box's own fact known, its
 *  name is that fact's last part (review m3: a name holding "is" or "not" is never split there); else the shortest name. */
function tickByName(s: string, ownFact?: string): { kind: "is" | "not"; words: string[]; on: string; off: string } | null {
  const name = ownFact?.split(".").pop();
  const m = name ? new RegExp(`^derived:checked_if_${name.replace(/[^\w]/g, "")}_(is|not)_([a-z0-9]+(?:_[a-z0-9]+)*):([^/]+)\\/(.+)$`).exec(s)
    : /^derived:checked_if_[a-z0-9_]+?_(is|not)_([a-z0-9]+(?:_[a-z0-9]+)*):([^/]+)\/(.+)$/.exec(s);
  if (!m || (!name && /^derived:checked_if_(true|false):/.test(s))) return null;
  const kind = m[1] as "is" | "not";
  return { kind, words: kind === "is" ? [m[2]] : m[2].replace(/_or_/g, "_").split("_"), on: m[3], off: m[4] };
}
/** QA-403: the words a map's steps name for a fact (TICK_EQ's word; the is/not words), so every box of a form knows
 *  which answers its fact can take (review M1 on #1588). */
export function wordsInSteps(transform: string | null | undefined, ownFact?: string): string[] {
  return stepsOf(transform ?? "").flatMap((s) => { const e = TICK_EQ.exec(s); if (e) return [e[3].toLowerCase()]; return tickByName(s, ownFact)?.words ?? []; });
}
const notAWord = (w: string, words?: readonly string[]) => `"${w}" is not one of the words this form takes${words?.length ? ` (${[...new Set(words)].join(", ")})` : ""}: write it by hand, or correct the answer`;
function same(a: unknown, b: unknown): boolean {
  if ((a && typeof a === "object") || (b && typeof b === "object")) { const x = parseAddress(a), y = parseAddress(b); return !!x && !!y && oneLine(x).toUpperCase() === oneLine(y).toUpperCase(); }
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/** Other confirmed facts about the same person, for the derivations that compare two facts ("A equals B", any(A, B)). */
export type Context = { fact?: (key: string) => unknown;
  /** C7.2 cause 3: the caller vouches that a person confirmed nothing applies (a group's "none apply"): only then does an
   *  empty value reach a "recorded" step and give "N". Without it an empty value stays blank, as for every other step. */
  nothingRecorded?: boolean;
  /** QA-395: the caller has worked out a "recorded" Yes/No whose form counts only some entries (engine/runtime/forms.ts
   *  countedOf): true or false is the answer; null means a person decides (`countedWhy` says why). */
  counted?: boolean | null; countedWhy?: string;
  /** QA-403: the box's own fact, and every word this form's steps name for it (wordsInSteps over the form's map). A step
   *  that ticks by a word writes its "else" code only for another of those words; any other word goes by hand. */
  ownFact?: string; words?: readonly string[] };

/** Runs one transformation text on one value for one box. `rows` lets "select …" pick among a person's rows. */
export function runTransform(transform: string | undefined, value: unknown, box: Box, ctx: Context = {}): Outcome {
  const steps = canonicalSteps(transform, ctx.ownFact);
  const hand = (reason: string): Outcome => ({ ok: false, hand: true, reason, steps });
  const blank = (reason: string): Outcome => ({ ok: false, blank: true, reason, steps });
  let v: any = value;
  if ((v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) && !(ctx.nothingRecorded && steps[0] && (RECORDED.test(steps[0]) || PROSE_RECORDED.test(steps[0])))) {
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
    // C7.2 cause 3: the "recorded" derivations give Yes or No (a missing value reaches here only when the caller passed it on purpose, see RECORDED).
    if ((m = RECORDED.exec(s))) {
      // QA-395: the form counts only some entries, and the caller has counted them by the form's own words.
      if (ctx.counted === null) return hand(ctx.countedWhy ?? "the form counts only some of the entries: a person checks them and decides Yes or No");
      if (typeof ctx.counted === "boolean") { v = ctx.counted; continue; }
      const named = (m[1] ?? "").split(",").map((f) => f.trim()).filter(Boolean);
      // B88 (review R2-M1): a box asked as its own Yes/No reads the person's answer; an explicit No while a detail it names is
      // still recorded contradicts itself, so it is never written as Y (or N) on any path: a person decides (QA-165's rule).
      if (v === false && named.some((f) => present(ctx.fact?.(f)))) return hand("answered No, but a detail it vouches for is recorded: a person checks which is right");
      const any = present(v) || named.some((f) => present(ctx.fact?.(f)));
      if (m[3] && any) return hand(`${m[3]} is recorded; whether it is still valid (not expired) is checked by a person`);
      v = any; continue;
    }
    // QA-318: the prose Yes/No. A box whose own fact is that Yes/No question (SCH1's "Did you serve in any military…?")
    // writes the person's answer; a confirmed "none apply" (the caller's nothingRecorded) writes No; an entry recorded makes
    // it Yes, unless the form counts only some entries (Question 8: trips since 18 or in the past five years, to other
    // countries): then a person decides, in the form's own words. Never a guess.
    if ((m = PROSE_RECORDED.exec(s))) {
      if (typeof v === "boolean") continue;
      if (!present(v)) { v = false; continue; }
      if (m[2]) return hand(`the form counts only some of them (any recorded ${m[2].replace(/\s+/g, " ")}): a person checks the entries and decides Yes or No`);
      v = true; continue;
    }
    // C7.2 cause 1: "A equals B" (applying from the country of residence; residential address same as mailing).
    // BK-22: the side named first is the box's own value, unless the box's own fact is known and the step names another one.
    if ((m = /^derived:([\w.]+) equals ([\w.]+)$/.exec(s))) {
      const own = !ctx.ownFact || m[1] === ctx.ownFact, mine = own ? v : ctx.fact?.(m[1]); if (!own && !present(mine)) return hand(`${m[1]} is not confirmed, so it cannot be compared`);
      const other = ctx.fact?.(m[2]); if (!present(other)) return hand(`${m[2]} is not confirmed, so it cannot be compared`); v = same(mine, other); continue;
    }
    // BK-22 (#1695 C1): "derive: Y if passport country of issue = 206 (ISR (Israel)), else N": No for another country (a
    // name or a code): the form's Yes cannot hold. The named country itself goes by hand (review M2 on #1698): the form asks
    // more than the country ("Is this a national Israeli passport?"; Lead 35 on #1363 makes it the person's own answer on
    // IMM 5257), so an Israeli travel document that is not a national passport is never a silent Yes. A list or a record
    // goes by hand.
    if ((m = /^derived:[\w.]+ is one of (.+)$/.exec(s))) {
      if (typeof v !== "string" && typeof v !== "number") return hand(`not a single answer: ${JSON.stringify(v)}`);
      const t = String(v).trim(), alts = m[1].split("|").map((x) => x.toLowerCase());
      if (!/^[A-Za-z0-9][A-Za-z0-9 .'()-]*$/.test(t)) return hand(`not a country: ${t}`);
      if (alts.includes(t.toLowerCase()) || alts.includes((ISO3[t.toUpperCase()] ?? "").toLowerCase())) return hand(`the value is ${t}: the form asks more than the country (for example whether it is a national passport), so a person answers it`);
      v = false; continue;
    }
    // BK-22 (#1695 C1, IMM 1295): "derive:country calling code is (not) 1" on the box's own phone.
    if ((m = /^derive: ?country calling code is (not )?1$/.exec(s))) { const cc = String((v as Phone)?.country_code ?? "").replace(/\D/g, ""); if (!cc) return hand("phone has no country calling code"); v = (cc === "1") !== !!m[1]; continue; }
    // C7.2 cause 1: the phone switches ("country code of … is (not) 1 -> check_code:1/0").
    if ((m = /^derived:country code of [\w.]+ is (not )?1$/.exec(s))) { const cc = String((v as Phone)?.country_code ?? "").replace(/\D/g, ""); if (!cc) return hand("phone has no country calling code"); v = (cc === "1") !== !!m[1]; continue; }
    if ((m = /^number_as_text(?: \((?:[A-Z]{3}, )?max (\d+) char(?:s|acters)\))?$/.exec(s))) {
      const t = typeof v === "number" ? String(v) : String(v).trim();
      if (!/^\d+(\.\d{1,2})?$/.test(t)) return hand(`not an amount: ${t}`);
      if (m[1] && t.length > Number(m[1])) return hand(`amount is ${t.length} characters; the box holds ${m[1]} (never truncated)`);
      v = t; continue;
    }
    // BK-22 (#1695 C1, IMM 1294's costs and funds): "number:whole_dollars (max N chars)": an amount with no cents (".00" is
    // dropped); cents, any other text or a longer amount go by hand: never rounded, never truncated.
    if ((m = /^number:whole_dollars(?: \(max (\d+) char(?:s|acters)\))?$/.exec(s))) {
      const t = typeof v === "number" ? String(v) : String(v).trim(), w = /^(\d+)(?:\.0{1,2})?$/.exec(t);
      if (!w) return hand(/^\d+\.\d{1,2}$/.test(t) ? `${t} has cents; the form takes whole dollars (never rounded)` : `not an amount: ${t}`);
      if (m[1] && w[1].length > Number(m[1])) return hand(`amount is ${w[1].length} characters; the box holds ${m[1]} (never truncated)`);
      v = w[1]; continue;
    }
    // QA-403: a drafted map may describe what the value is, "as_is (plain-language application type)": the note says what
    // the words are, not how to change them, so the value is written as it is. Only a note that starts "plain-language" or
    // "plain language" followed by words only (no comma, no order such as "write", "uppercase", "code": review m2 on #1588);
    // any other note stays not executable (by hand).
    if ((m = /^as_is(?: \((?:max (\d+) char(?:s|acters)|plain[- ]language [a-z ]+)\))?$/.exec(s)) && !(/\(plain/.test(s) && NOTE_ORDERS.test(s))) {
      v = typeof v === "boolean" ? (v ? "Yes" : "No") : String(v);
      const max = Number(m[1] ?? box.max_chars ?? 0);
      if (max && v.length > max) return hand(`value is ${v.length} characters; the box holds ${max} (never truncated)`);
      continue;
    }
    // B107 (QA-300): a length the map states as a step of its own ("as_is; max 30 characters", IMM 5476 (11-2021)'s question
    // 7): checked on the value as it is now, never truncated.
    if ((m = /^max (\d+) char(?:s|acters)$/.exec(s))) { const t = String(v); if (t.length > Number(m[1])) return hand(`value is ${t.length} characters; the box holds ${m[1]} (never truncated)`); continue; }
    // B107: a box that takes digits only (a country calling code): the value's digits; a value with none is written by hand.
    if (s === "digits_only") { const t = String(v).replace(/\D/g, ""); if (!t) return hand(`no digits in "${String(v)}"`); v = t; continue; }
    if ((m = /^date:(YYYY-MM-DD|YYYY|MM|DD)$/.exec(s))) {
      const d = DATE.exec(String(v)), mo = (m[1] === "YYYY" || m[1] === "MM") && !d ? MONTH.exec(String(v)) : null;
      if (mo) { v = m[1] === "YYYY" ? mo[1] : mo[2]; continue; }
      if (!d) return hand(`not a full date: ${v}`); v = m[1] === "YYYY-MM-DD" ? d[0] : m[1] === "YYYY" ? d[1] : m[1] === "MM" ? d[2] : d[3]; continue;
    }
    if ((m = /^(?:yes_no_code|check_code):([^/]+)\/(.+)$/.exec(s))) { if (typeof v !== "boolean") return hand(`not a yes/no value: ${v}`); v = v ? m[1] : m[2]; continue; }
    // B128 (QA-153): a drafted family-form map spells the Yes and No tick boxes "derived:checked_if_true:1/0" (check_code:1/0)
    // and "derived:checked_if_false:1/0" (the same, ticked on No). Only a yes/no value; anything else by hand.
    if ((m = /^derived:checked_if_(true|false):([^/]+)\/(.+)$/.exec(s))) { if (typeof v !== "boolean") return hand(`not a yes/no value: ${v}`); v = v === (m[1] === "true") ? m[2] : m[3]; continue; }
    // QA-403: tick boxes set by one answer's value. "derived: 1 if case.representative_form_action = appoint, else 0 (…)"
    // (IMM 5476) writes the first code when the named fact equals the word; "derived:checked_if_application_type_is_visitor:1/0"
    // the same for the box's own value; "derived:checked_if_application_type_not_visitor_worker_or_student:1/0" (IMM 5645)
    // the first code when the value is none of the words. Words compare without case. Review M1 (#1588): the "else" code
    // (and a "none of these" tick) is written only for another word this form's steps name for the fact (ctx.words), so a
    // misspelt or unknown answer ("apoint", "vistor") goes by hand, never into the wrong box; a list or a record too.
    if ((m = TICK_EQ.exec(s))) {
      // Review m1: only the named fact is compared: the box's own value when the box is that fact, else its confirmed answer.
      const named = ctx.ownFact === m[2] ? v : ctx.fact?.(m[2]);
      if (!present(named)) return hand(`${m[2]} is not answered, so it cannot be compared`);
      const w = wordOf(named); if (w === null) return hand(`not a single word: ${JSON.stringify(named)}`);
      if (w === m[3].toLowerCase()) { v = m[1]; continue; }
      if (!ctx.words?.includes(w)) return hand(notAWord(w, ctx.words));
      v = m[4]; continue;
    }
    const tick = tickByName(s, ctx.ownFact);
    if (tick) {
      const w = wordOf(v); if (w === null) return hand(`not a single word: ${JSON.stringify(v)}`);
      const listed = tick.words.includes(w);
      if (!listed && !ctx.words?.includes(w)) return hand(notAWord(w, ctx.words));
      v = (tick.kind === "is" ? listed : !listed) ? tick.on : tick.off; continue;
    }
    // C7.7 (G25, the tech lead's ruling on #1317): release 2's drafted IMM 5645 map spells the Yes and No tick boxes of each
    // child's "accompany to Canada" "check_if_yes:1/0" and "check_if_no:1/0": the first code when the answer is that one, the
    // second otherwise. Only a yes/no value (yes/no words too, as derive_inverse); anything else by hand.
    // Review m1 (#1328): a list or a record is never read as its one item: by hand.
    if ((m = /^check_if_(yes|no):([^/]+)\/(.+)$/.exec(s))) { const yn = typeof v === "boolean" ? v : typeof v === "object" ? null : /^(y|yes|true)$/i.test(String(v)) ? true : /^(n|no|false)$/i.test(String(v)) ? false : null; if (yn === null) return hand(`not a yes/no value: ${v}`); v = yn === (m[1] === "yes") ? m[2] : m[3]; continue; }
    if ((m = /^derive:Y if any .+ (?:is|are) recorded, else N$/.exec(s))) { v = (Array.isArray(v) ? v.length > 0 : v !== false && v !== "") ? "Y" : "N"; continue; }
    // C7.7 (G25): an inverted yes/no box, "derive_inverse:1 when the subject has no child records (…), 0 when any child
    // exists": the first code when the fact is No, the second when it is Yes. Only a yes/no value; anything else by hand.
    if ((m = /^derive_inverse:(\w+) when [^,]+?(?: \([^)]*\))?, (\w+) when .+$/.exec(s))) { const yn = typeof v === "boolean" ? v : /^(y|yes|true)$/i.test(String(v)) ? true : /^(n|no|false)$/i.test(String(v)) ? false : null; if (yn === null) return hand(`not a yes/no value: ${v}`); v = yn ? m[2] : m[1]; continue; }
    // BK-22 (#1695 C1, IMM 1294): also "derive: 1 if the number's (the fax number's) country calling code is 1 …, else 0".
    if ((m = /^derive: ?1 if (?:fax |the (?:fax )?number's )?country calling code is (not )?1(?: \([^)]*\))?, else 0$/.exec(s))) { const cc = String((v as Phone).country_code ?? ""); if (!cc) return hand("phone has no country calling code"); v = (cc === "1") !== !!m[1] ? "1" : "0"; continue; }
    // C7.2 cause 1: the 21 Oct draft's names: "country_code" is the calling code; "international_number_without_plus" is the
    // number after it, as E1 wrote it (23 Oct: IntlNumber "9800000001" beside NumberCountry "91"; Validate passed and the
    // form's own +919800000001 was in its barcode), so it is the national number.
    // BK-22 (#1695 C1b): the part's name is the whole step, with at most its length: nothing after it is ignored.
    if ((m = /^phone_part:(extension|country_calling_code|country_code|national_number|international_number_without_plus)(?: \(max (\d+) char(?:s|acters)\))?$/.exec(s))) {
      if (m[1] === "country_code") m[1] = "country_calling_code"; else if (m[1] === "international_number_without_plus") m[1] = "national_number";
      const p = v as Phone; const part = m[1] === "extension" ? p.extension : m[1] === "country_calling_code" ? p.country_code : p.number;
      if (!part) return blank(`no ${m[1]}`);
      if (m[1] !== "country_calling_code" && p.country_code === "1" && m[1] === "national_number") return blank("North American number goes in the area-code boxes");
      v = String(part).replace(/\D/g, ""); if (m[2] && v.length > Number(m[2])) return hand(`${m[1].replace(/_/g, " ")} is ${v.length} digits; the box holds ${m[2]} (never truncated)`); continue;
    }
    // C7.7 (IMM 5476's representative phone): the country calling code's digits, and the number's digits (area code included).
    if ((m = /^phone:(country_code_digits|area_code_and_number)$/.exec(s))) { const p = v as Phone; const part = m[1] === "country_code_digits" ? p?.country_code : p?.number; if (!part) return blank(`no ${m[1] === "country_code_digits" ? "country calling code" : "number"}`); v = String(part).replace(/\D/g, ""); continue; }
    if (/^phone_part:nanp_/.test(s)) { const p = v as Phone; if (p.country_code !== "1") return blank("not a North American number"); return hand("North American number parts are not in the executable set yet"); }
    // BK-22 (#1695 C1b): the part's name is the whole step, with at most its length: nothing after it is ignored (before,
    // "address_part:country then code_list:…" wrote the country's name into a list box). "street_line" (IMM 1294's school
    // address) is the unit, number and street together, as the one-line address starts.
    if ((m = /^address_part:(city|province|country|postal_code|street_number|street_name|street_line|apt_unit|district|po_box)(?: \(max (\d+) char(?:s|acters)\))?$/.exec(s))) {
      const a = parseAddress(v); const part = m[1] === "street_line" ? (a ? [a.apt_unit, a.street_number, a.street_name].filter(Boolean).join(" ") : "") : a?.[m[1] as keyof Address];
      if (!part) return blank(`address has no ${m[1].replace(/_/g, " ")}`); v = part; if (m[2] && String(v).length > Number(m[2])) return hand(`${m[1].replace(/_/g, " ")} longer than ${m[2]} characters`); continue;
    }
    // B128 (QA-153): "address_single_line_text" (a drafted map's spelling) is the same one-line address.
    if ((m = /^address_single_line(?:_text)?(?: \(max (\d+) char(?:s|acters)\))?$/.exec(s))) { const a = parseAddress(v); if (!a) return hand("not an address"); v = typeof value === "string" ? value : oneLine(a); if (m[1] && v.length > Number(m[1])) return hand(`address longer than ${m[1]} characters`); continue; }
    if ((m = /^country_name_text(?: \(max (\d+) char(?:s|acters)\))?$/.exec(s))) { const c = ISO3[String(v).toUpperCase()] ?? String(v); if (m[1] && c.length > Number(m[1])) return hand(`country name longer than ${m[1]} characters`); v = c; continue; }
    // BK-22 (#1695 C1): the bracket may hold one inner bracket ("e.g. CAN (Canada)=511"), and a sentence after it may only
    // say that a value the list does not have is flagged ("There is no option for …: such a value must be flagged for
    // review", IMM 5707): that is what this step does (by hand), so the sentence orders nothing more.
    if ((m = /^code_list:[\w.]+(?: \(([^()]*(?:\([^()]*\)[^()]*)*)\))?(?:\.\s+((?:There is no option|This list has no)\b[^()]*\b(?:flag(?:ged)?|review)\b[^()]*))?$/.exec(s))) {
      const inline: Record<string, string> = {};
      for (const pair of (m[1] ?? "").split(",")) { const q = /^\s*([^=|]+?)\s*=\s*(\w+)\s*$/.exec(pair); if (q) inline[q[1]] = q[2]; }
      if (!choices(box).length && !Object.keys(inline).length) return hand("code list depends on another answer (dependent list); the form's own rules fill it");
      const code = codeFor(String(v), box, Object.keys(inline).length ? inline : undefined) ?? (Object.keys(inline).length ? codeFor(String(v), box) : null);
      // BK-26: on a dependent list, a value not in the list for the other box's answer is refused in words, never written.
      if (code === null && box.options_scope) return { ok: false, refused: true, reason: `"${v}" is not in ${box.options_scope}`, steps };
      if (code === null) return hand(`"${v}" is not in the box's option list`);
      v = code; continue;
    }
    return hand(`step "${s}" is not in the executable set`);
  }
  return { ok: true, value: String(v), steps };
}

/** BK-22 (#1695 C1): the steps of a transformation the filler cannot run (each as written after its spelling aliases), so
 *  Field map review flags them before a map is accepted. Judged by the executor itself: a step is run alone on a sample
 *  value, and one that reaches "not in the executable set" is listed; any other outcome (a value, by hand for the value's
 *  sake, blank) means the step is understood. Pure. */
const PROBES: unknown[] = ["x", { country_code: "1", number: "4165550100" }]; // review m1 on #1698: a North American number reaches phone_part:nanp_*
export function stepsNotRun(transform: string | null | undefined, ownFact?: string): string[] {
  if (transform === null || transform === undefined || !transform.trim()) return [];
  return canonicalSteps(transform, ownFact).filter((s) => PROBES.some((v) => { const o = runTransform(s, v, {}, { ownFact, fact: () => "x" }); return "hand" in o && /not in the executable set/.test(o.reason); }));
}
