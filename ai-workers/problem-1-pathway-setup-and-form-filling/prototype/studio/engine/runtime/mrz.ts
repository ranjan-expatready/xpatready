// C6.5 part 1 (M3-C; P-133, P-134 D2, P-142 D5 as amended by P-242 and P-243): the passport reader by rules. A
// passport's machine-readable zone (TD3, two coded lines of 44 characters) is read from a PDF's own text layer and
// its values become proposals about the document's holder, each with its document, page, reader "mrz" and a
// confidence. No AI, no OCR, no network, no database (US$0; P-249 lift-ready). The check digits and the line layout
// are prototype/p5/reader/mrz.ts (ICAO Doc 9303 Part 3 §4.9 and Part 4), reused, not rewritten.
// Rules (tests/check_c65_mrz_reader.ts, each with a passing and a failing check):
//  M1  Only a PDF text layer is read (r5c §8b: printed-text OCR waits for the STANDARDS §1 gate). No text layer, or no
//      coded lines in it → nothing is proposed and every passport fact is unreadable, with the reason.
//  M2  A value whose own check digit fails is never proposed: it is listed unreadable (never guessed, never
//      "corrected"). Names, sex, nationality and issuing state have no check digit of their own and are proposed as
//      read from the coded line.
//  M3  P-243 ("collapsed when the passport's machine-readable check digits passed"): passport number, date of birth and
//      expiry are collapsed only when every check digit of the zone passed (their own, the personal number's and the
//      composite); names, and every value of a zone with a failed check, stay expanded for review field by field.
//  M4  P-242: one "Confirm & use" per document (the read's `review.confirm`); until then every value is a proposal,
//      never an answer. A client's own typed answer is Declared and fills at once: a proposal that differs from it
//      is a conflict for a person to resolve, never settled silently (`compareWithAnswers`).
//  M5  Two people on one document (two different coded zones, for example two passports scanned on one page): a
//      passport's facts are about its holder only (resolver rule R11, contracts/resolver.ts), and the reader cannot
//      tell which zone is the holder's, so it proposes nothing and lists every fact unreadable with that reason.
//      The same zone printed twice is one person; the same person's zone printed twice but differing is read by hand.
//      Coded-looking lines that form no zone (one character short, or outside the MRZ alphabet) may be another person's:
//      every fact is then unreadable too, so a second person is never missed. A printed 44-letter line just above the
//      zone is not taken for line 1, and a pair of lines with fewer than two passed check digits is no zone.
// The confidence numbers are Sample (no measured error rate yet; P-243 counts corrections to measure it).
import { inflateSync } from "node:zlib";
import { parseTd3, type Td3 } from "../../../p5/reader/mrz.ts";
import type { DocumentAbout } from "../../contracts/resolver.ts";

export const READER = "mrz" as const;
/** The facts a passport's coded lines give, in reading order (field ids of the shared library). */
export const MRZ_FACTS = ["person.family_name", "person.given_names", "person.sex", "person.date_of_birth", "person.citizenship", "person.passport_country_of_issue", "person.passport_number", "person.passport_expiry_date"] as const;
export type MrzFact = (typeof MRZ_FACTS)[number];
/** M3 (P-243): the values a passed check digit can back, and the check digit that backs each. */
export const CHECKED_BY: Partial<Record<MrzFact, keyof Td3["checks"]>> = { "person.passport_number": "number", "person.date_of_birth": "dob", "person.passport_expiry_date": "expiry" };
/** Sample confidences (M3): backed by a passed check digit, or read from the coded line with no check of its own. */
export const CONFIDENCE = { checked: 0.98, unchecked: 0.9 } as const;

export type MrzProposal = {
  fact: MrzFact; value: string; about: DocumentAbout;
  source: { document: string; page: number; reader: typeof READER };
  confidence: number;
  /** M3: true only for number, date of birth and expiry when every check digit of the zone passed. */
  checked: boolean;
  /** P-243: collapsed (check-digit backed identity value) or expanded (reviewed field by field). */
  review: "collapsed" | "expanded";
  state: "proposed";
  /** Why a person should look closer (m3: a name that may be cut short). */
  note?: string;
};
export type MrzRead = {
  reader: typeof READER; document: string;
  proposals: MrzProposal[];
  unreadable: { fact: MrzFact; reason: string }[];
  /** Coded zones found, and the people they name (M5). */
  zones: number; people: number;
  /** M4 (P-242): one "Confirm & use" for the whole document; the collapsed and expanded facts for that review (P-243). */
  review: { confirm: "one_per_document"; collapsed: MrzFact[]; expanded: MrzFact[] };
};

/** M1: the text lines of each page of a PDF's own text layer (page 1 first). A minimal reader for what a text-layer
 *  PDF holds: content streams, plain or Flate-compressed; a page's streams are its /Contents, in the page tree's order
 *  (file order when there is no page tree); form streams are left out; string operators Tj, TJ, ' and "; a new line at
 *  T*, Td, TD, Tm, ' and ". Fonts with a standard encoding only (an MRZ is plain ASCII). Anything it cannot read gives
 *  no lines, so the passport is unreadable (M1), never misread. */
export function pdfTextPages(pdf: Buffer): string[][] {
  const raw = pdf.toString("latin1");
  if (!raw.startsWith("%PDF-")) return [];
  const objs = new Map<number, { dict: string; text?: string[] }>();
  const head = /(\d+)\s+\d+\s+obj\b/g;
  for (let m: RegExpExecArray | null; (m = head.exec(raw)); ) {
    const at = m.index + m[0].length, st = /\bstream\r?\n|\bendobj\b/.exec(raw.slice(at));
    if (!st || st[0] === "endobj") { const e = raw.indexOf("endobj", at); objs.set(Number(m[1]), { dict: raw.slice(at, e < 0 ? undefined : e) }); continue; }
    const dict = raw.slice(at, at + st.index), from = at + st.index + st[0].length;
    const len = Number(/\/Length\s+(\d+)(?!\d|\s+\d+\s+R)/.exec(dict)?.[1] ?? NaN); // an indirect length: up to "endstream"
    const to = Number.isFinite(len) ? from + len : raw.indexOf("endstream", from);
    if (to < from) continue;
    head.lastIndex = to;
    let body = raw.slice(from, to), text: string[] | undefined;
    if (/\/FlateDecode/.test(dict)) { try { body = inflateSync(Buffer.from(body, "latin1")).toString("latin1"); } catch { body = ""; } }
    else if (/\/Filter/.test(dict)) body = ""; // another filter (an image, a font): not a text layer this reader knows
    if (!/\/Subtype\s*\/Form\b/.test(dict) && /\bBT\b/.test(body)) text = textLines(body);
    objs.set(Number(m[1]), { dict, text });
  }
  const refs = (d: string, key: string) => { const v = new RegExp(`/${key}\\s*(\\[[^\\]]*\\]|\\d+\\s+\\d+\\s+R)`).exec(d)?.[1] ?? ""; return [...v.matchAll(/(\d+)\s+\d+\s+R/g)].map((x) => Number(x[1])); };
  const isPage = (d: string) => /\/Type\s*\/Page(?![a-z])/.test(d);
  const tree = (n: number, seen = new Set<number>()): number[] => {
    const o = objs.get(n); if (!o || seen.has(n)) return []; seen.add(n);
    return isPage(o.dict) ? [n] : /\/Type\s*\/Pages\b/.test(o.dict) ? refs(o.dict, "Kids").flatMap((k) => tree(k, seen)) : [];
  };
  const root = [...objs.values()].map((o) => /\/Type\s*\/Catalog\b/.test(o.dict) ? refs(o.dict, "Pages")[0] : undefined).find((x) => x !== undefined);
  let pages = root !== undefined ? tree(root) : [];
  if (!pages.length) pages = [...objs].filter(([, o]) => isPage(o.dict)).map(([n]) => n);
  if (pages.length) return pages.map((n) => refs(objs.get(n)!.dict, "Contents").flatMap((c) => objs.get(c)?.text ?? []));
  return [...objs.values()].flatMap((o) => (o.text ? [o.text] : [])); // bare content streams, no page objects
}

/** The text of one content stream, line by line. */
function textLines(body: string): string[] {
  const lines: string[] = []; let cur = "";
  const brk = () => { if (cur.trim()) lines.push(cur); cur = ""; };
  const tok = /\((?:\\[\s\S]|[^\\)])*\)|\[[^\]]*\]|T\*|Td|TD|Tm|Tj|TJ|'|"|BT|ET/g;
  let pending: string[] = [];
  for (let m: RegExpExecArray | null; (m = tok.exec(body)); ) {
    const t = m[0];
    if (t.startsWith("(")) pending.push(unescape(t.slice(1, -1)));
    else if (t.startsWith("[")) pending = [...t.matchAll(/\((?:\\[\s\S]|[^\\)])*\)/g)].map((x) => unescape(x[0].slice(1, -1)));
    else if (t === "Tj" || t === "TJ") { cur += pending.join(""); pending = []; }
    else if (t === "'" || t === '"') { brk(); cur += pending.join(""); pending = []; }
    else if (t === "T*" || t === "Td" || t === "TD" || t === "Tm" || t === "ET") { brk(); pending = []; }
  }
  brk();
  return lines;
}
const unescape = (s: string) => s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, c: string) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" } as Record<string, string>)[c] ?? String.fromCharCode(parseInt(c, 8)));

const isLine1 = (s: string) => /^P[A-Z<][A-Z<]{3}[A-Z<]{39}$/.test(s);
/** A line that looks like a coded line (long, holds the "<" filler, almost all in the MRZ alphabet), read or not (M5). */
const looksCoded = (s: string) => s.length >= 30 && s.includes("<") && [...s].filter((c) => !/[A-Z0-9<]/.test(c)).length <= 3;
/** At least two of the zone's four main check digits passed: a pair of lines that is not a zone almost never does. */
const isZone = (t: Td3) => [t.checks.number, t.checks.dob, t.checks.expiry, t.checks.composite].filter(Boolean).length >= 2;
const clean = (l: string) => l.replace(/\s+/g, "").replace(/[«‹]/g, "<").toUpperCase();

/** Every TD3 zone in a page's lines (p5 findTd3 returns the first only): spaces removed and the MRZ filler's look-alikes
 *  (« ‹) read as "<"; nothing else is changed (M2). A line followed by a line 1 that starts a zone is not line 1 (a
 *  printed 44-letter sentence above the zone); a pair with fewer than two passed check digits is no zone. `left` counts
 *  the coded-looking lines no zone used (M5). */
export function findZones(lines: string[]): { zones: { l1: string; l2: string; parsed: Td3 }[]; left: number } {
  const c = lines.map(clean), used = new Set<number>();
  const zones: { l1: string; l2: string; parsed: Td3 }[] = [];
  const pair = (i: number) => (c[i]?.length === 44 && c[i + 1]?.length === 44 ? parseTd3(c[i], c[i + 1]) : null);
  for (let i = 0; i + 1 < c.length; i++) {
    if (isLine1(c[i + 1]) && pair(i + 1)) continue;
    const parsed = pair(i);
    if (parsed && isZone(parsed)) { zones.push({ l1: c[i], l2: c[i + 1], parsed }); used.add(i).add(i + 1); i++; }
  }
  return { zones, left: c.filter((l, i) => !used.has(i) && looksCoded(l)).length };
}

const all = (reason: string) => MRZ_FACTS.map((fact) => ({ fact, reason }));
const empty = (document: string, zones: number, people: number, reason: string): MrzRead =>
  ({ reader: READER, document, proposals: [], unreadable: all(reason), zones, people, review: { confirm: "one_per_document", collapsed: [], expanded: [] } });

/** Reads a passport document (M1–M5). `document` is the stored document's id, carried on every proposal. */
export function readPassport(document: string, pdf: Buffer): MrzRead {
  const pages = pdfTextPages(pdf);
  if (!pages.some((lines) => lines.length)) return empty(document, 0, 0, "No text layer: this reader reads a PDF's own text only (a scan needs printed-text reading, not built).");
  const read = pages.map((lines) => findZones(lines));
  const found = read.flatMap((r, i) => r.zones.map((z) => ({ ...z, page: i + 1 }))), left = read.reduce((n, r) => n + r.left, 0);
  if (left) return empty(document, found.length, found.length, "This document holds coded lines that cannot be read as a passport zone (they may be another person's): every value is read by hand from the passport page.");
  if (!found.length) return empty(document, 0, 0, "No passport coded lines (machine-readable zone) were found in the text.");
  const people = new Set(found.map((z) => [z.parsed.surname, z.parsed.given, z.parsed.number, z.l2.slice(13, 19)].join("|"))).size;
  if (people > 1) return empty(document, found.length, people, `This document holds ${people} people's passport coded lines. A passport's details are about its holder only, and the reader cannot tell which is the holder's: upload each person's passport on their own line.`);
  if (new Set(found.map((z) => z.l1 + z.l2)).size > 1) return empty(document, found.length, 1, "The passport's coded lines appear more than once and differ: every value is read by hand from the passport page.");
  return fromZone(document, found[0].parsed, found[0].page, found.length, found[0].l1[43] !== "<");
}

/** The name note (m3): a full name field on line 1 may hold a name cut short (Doc 9303 truncates long names). */
export const NAME_FULL = "The coded line's name field is full, so the name may be cut short: check it against the printed name.";

function fromZone(document: string, z: Td3, page: number, zones: number, nameFull: boolean): MrzRead {
  const value: Record<MrzFact, string> = {
    "person.family_name": z.surname, "person.given_names": z.given, "person.sex": z.sex, "person.date_of_birth": z.dob,
    "person.citizenship": z.nationality, "person.passport_country_of_issue": z.issuing_state, "person.passport_number": z.number, "person.passport_expiry_date": z.expiry,
  };
  const proposals: MrzProposal[] = [], unreadable: MrzRead["unreadable"] = [];
  for (const fact of MRZ_FACTS) {
    const by = CHECKED_BY[fact], v = value[fact];
    if (by && !z.checks[by]) { unreadable.push({ fact, reason: "Its check digit on the coded line does not match: read by hand from the passport page." }); continue; }
    if (!v) { unreadable.push({ fact, reason: by ? "The coded line holds no valid date here." : "The coded line holds no value here." }); continue; }
    const checked = !!by && z.all_checks_pass;
    const note = nameFull && (fact === "person.family_name" || fact === "person.given_names") ? NAME_FULL : undefined;
    proposals.push({ fact, value: v, about: "holder", source: { document, page, reader: READER }, confidence: checked ? CONFIDENCE.checked : CONFIDENCE.unchecked, checked, review: checked ? "collapsed" : "expanded", state: "proposed", ...(note ? { note } : {}) });
  }
  return {
    reader: READER, document, proposals, unreadable, zones, people: 1,
    review: { confirm: "one_per_document", collapsed: proposals.filter((p) => p.review === "collapsed").map((p) => p.fact), expanded: proposals.filter((p) => p.review === "expanded").map((p) => p.fact) },
  };
}

/** M4 (P-242): each proposal against the holder's current answers. A client's typed answer is Declared and already
 *  fills; a proposal that differs is a conflict (never settled here); one with no answer is new; an equal one agrees.
 *  Names compare without case and repeated spaces (the coded line is upper case); every other value as written. */
export function compareWithAnswers(read: MrzRead, answers: Partial<Record<string, unknown>>): { fact: MrzFact; outcome: "new" | "agrees" | "conflict"; answer?: unknown; read: string }[] {
  const norm = (f: string, v: unknown) => { const s = String(v ?? "").trim(); return f.endsWith("_name") || f.endsWith("_names") ? s.toUpperCase().replace(/\s+/g, " ") : s; };
  return read.proposals.map((p) => {
    const a = answers[p.fact];
    if (a === undefined || a === null || a === "") return { fact: p.fact, outcome: "new" as const, read: p.value };
    return { fact: p.fact, outcome: norm(p.fact, a) === norm(p.fact, p.value) ? "agrees" as const : "conflict" as const, answer: a, read: p.value };
  });
}
