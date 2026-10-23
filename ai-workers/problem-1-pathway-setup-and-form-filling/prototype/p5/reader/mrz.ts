// Machine-readable zone (MRZ) of a passport data page, TD3 layout: two lines of 44 characters. Deterministic,
// no AI. Character values and the 7-3-1 check digit follow ICAO Doc 9303 Part 3 §4.9 (digits keep their value,
// A=10 … Z=35, filler '<' = 0; weights 7, 3, 1 repeating; sum modulo 10). Line layout per Doc 9303 Part 4.
// Source access: the ICAO PDF is behind a bot check (21 Oct 2026, not bypassed), so the rule is cross-checked
// against the specimen the standard publishes (document number L898902C3 → check digit 6; tests/check_reader.ts).
// A valid check digit shows the zone was read consistently; it never shows the document is genuine.

export function charValue(c: string): number {
  if (c === "<") return 0;
  if (/^[0-9]$/.test(c)) return Number(c);
  if (/^[A-Z]$/.test(c)) return c.charCodeAt(0) - 55;
  return NaN;
}

export function checkDigit(s: string): number {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const v = charValue(s[i]);
    if (Number.isNaN(v)) return NaN;
    sum += v * w[i % 3];
  }
  return sum % 10;
}

const pad = (s: string, n: number) => (s + "<".repeat(n)).slice(0, n);
const yymmdd = (iso: string) => iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);

/** Builds the two TD3 lines (used by the synthetic-document generator). */
export function makeTd3(p: { type?: string; state: string; surname: string; given: string; number: string; nationality: string; dob: string; sex: string; expiry: string; personal?: string }): [string, string] {
  const name = pad(`${p.surname.replace(/ /g, "<")}<<${p.given.replace(/ /g, "<")}`, 39);
  const l1 = pad(`${p.type ?? "P"}<${p.state}${name}`, 44);
  const num = pad(p.number, 9), dob = yymmdd(p.dob), exp = yymmdd(p.expiry), pers = pad(p.personal ?? "", 14);
  const c = (s: string) => String(checkDigit(s));
  const body = `${num}${c(num)}${p.nationality}${dob}${c(dob)}${p.sex}${exp}${c(exp)}${pers}${c(pers)}`;
  const composite = `${num}${c(num)}${dob}${c(dob)}${exp}${c(exp)}${pers}${c(pers)}`;
  return [l1, pad(body + c(composite), 44)];
}

export type Td3 = {
  surname: string; given: string; number: string; nationality: string; issuing_state: string; dob: string; sex: string; expiry: string;
  checks: { number: boolean; dob: boolean; expiry: boolean; personal: boolean; composite: boolean };
  all_checks_pass: boolean;
};

/** Century for a two-digit year: dates of birth are never in the future of the reference date; expiry dates
 *  are taken in the 2000s (TD3 passports are valid ten years at most). */
function isoDate(yymmddS: string, kind: "dob" | "expiry", ref = new Date()): string | null {
  if (!/^\d{6}$/.test(yymmddS)) return null;
  const yy = Number(yymmddS.slice(0, 2)), mm = yymmddS.slice(2, 4), dd = yymmddS.slice(4, 6);
  let y = 2000 + yy;
  if (kind === "dob" && y > ref.getUTCFullYear()) y -= 100;
  const s = `${y}-${mm}-${dd}`;
  const t = Date.parse(s + "T00:00:00Z");
  return Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== s ? null : s;
}

/** Parses two TD3 lines. Returns null when they are not 44-character MRZ lines. OCR confusions are NOT
 *  corrected silently: a line that fails its check digits is reported as failing. */
export function parseTd3(l1: string, l2: string): Td3 | null {
  if (!/^P[A-Z<][A-Z<]{3}[A-Z<]{39}$/.test(l1) || !/^[A-Z0-9<]{44}$/.test(l2)) return null;
  const [sur, ...rest] = l1.slice(5).split("<<");
  const given = rest.join(" ").replace(/</g, " ").trim().replace(/\s+/g, " ");
  const num = l2.slice(0, 9), dob = l2.slice(13, 19), exp = l2.slice(21, 27), pers = l2.slice(28, 42);
  const ok = (s: string, d: string) => String(checkDigit(s)) === d;
  const checks = {
    number: ok(num, l2[9]), dob: ok(dob, l2[19]), expiry: ok(exp, l2[27]),
    personal: pers.replace(/</g, "") === "" ? l2[42] === "<" || l2[42] === "0" : ok(pers, l2[42]),
    composite: ok(l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43), l2[43]),
  };
  return {
    surname: sur.replace(/</g, " ").trim(), given, number: num.replace(/</g, ""), nationality: l2.slice(10, 13).replace(/</g, ""),
    issuing_state: l1.slice(2, 5).replace(/</g, ""), dob: isoDate(dob, "dob") ?? "", sex: l2[20] === "<" ? "X" : l2[20], expiry: isoDate(exp, "expiry") ?? "",
    checks, all_checks_pass: Object.values(checks).every(Boolean),
  };
}

/** Finds a TD3 pair in OCR text lines: spaces removed, common OCR substitutions only where the MRZ alphabet
 *  forbids the read character (« → <, lowercase → uppercase). Returns the raw lines too. */
export function findTd3(lines: string[]): { l1: string; l2: string; parsed: Td3 } | null {
  const clean = lines.map((l) => l.replace(/\s+/g, "").replace(/[«‹]/g, "<").toUpperCase()).filter((l) => l.length >= 40);
  for (let i = 0; i + 1 < clean.length; i++) {
    const a = clean[i].slice(0, 44).padEnd(44, "<"), b = clean[i + 1].slice(0, 44).padEnd(44, "<");
    if (!a.startsWith("P")) continue;
    const parsed = parseTd3(a, b);
    if (parsed) return { l1: a, l2: b, parsed };
  }
  return null;
}
