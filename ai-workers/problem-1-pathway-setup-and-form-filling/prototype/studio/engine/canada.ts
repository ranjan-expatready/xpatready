// canada.ca reading rules for the form finder (S4 slice 1, challenge M2 and M4): pure functions, no I/O, US$0. What makes
// a canada.ca download safe without a person (M2): only https links on www.canada.ca or ircc.canada.ca are followed; the
// PDF link comes from the form's own page, which is found through canada.ca's forms-and-guides index (never from a
// guide, which can link an old edition); the code read from the file is compared with the code asked for elsewhere. A
// guide's edition is the page fetched on a date, identified by the checksum of its normalised text (M5), so a re-save of
// the same page with different scripts or tokens is the same edition. Every immigration value read here is Sample until
// the immigration expert confirms.
import { createHash } from "node:crypto";

/** Hosts the finder may read from: canada.ca's English and French pages and IRCC's visa-office and package pages. */
export const OFFICIAL_HOSTS = ["www.canada.ca", "ircc.canada.ca"] as const;
export const CANADA_BASE = "https://www.canada.ca/";
export type Official = { ok: true; url: string } | { ok: false; why: string };

/** Resolves a link (relative links against https://www.canada.ca, or against `base`) and admits it only when it is
 *  https, on exactly www.canada.ca or ircc.canada.ca, with no user name or password and no non-default port. The
 *  fragment is dropped (it never reaches the server). `why` says in plain words what was wrong. */
export function officialUrl(u: string, base?: string): Official {
  if (typeof u !== "string" || !u.trim()) return { ok: false, why: "The address is empty." };
  let p: URL;
  try { p = new URL(u.trim(), base ?? CANADA_BASE); } catch { return { ok: false, why: `"${String(u).slice(0, 120)}" is not a web address.` }; }
  if (p.protocol !== "https:") return { ok: false, why: `Only secure (https) canada.ca addresses are used; this one starts with ${p.protocol.replace(/:$/, "")}.` };
  if (p.username || p.password) return { ok: false, why: "The address carries a user name or password, which canada.ca links never do." };
  const host = p.hostname.toLowerCase();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[")) return { ok: false, why: `The address points at a numeric server address (${host}), not at canada.ca.` };
  if (!(OFFICIAL_HOSTS as readonly string[]).includes(host)) return { ok: false, why: `Only www.canada.ca and ircc.canada.ca are used; this address is on ${host}.` };
  if (p.port) return { ok: false, why: `The address names a special port (${p.port}); canada.ca pages use the standard one.` };
  p.hash = "";
  return { ok: true, url: p.href };
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", ecirc: "ê", ocirc: "ô", rsaquo: "›", laquo: "«", raquo: "»", copy: "©", reg: "®", shy: "­" };
/** Decodes HTML character references (named, decimal, hexadecimal), as the browser and Python's parser do. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/gi, (m, e: string) => {
    if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}
const strip = (html: string) => decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const attr = (tag: string, name: string) => { const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag); return m ? decodeEntities(m[1] ?? m[2] ?? m[3] ?? "") : null; };
/** Every <a href> of a piece of HTML with its visible text, in page order. */
function anchors(html: string): { href: string; text: string }[] {
  const out: { href: string; text: string }[] = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)) { const href = attr(` ${m[1]}`, "href"); if (href !== null) out.push({ href, text: strip(m[2]) }); }
  return out;
}

/** An IRCC form number written the canada.ca way: "IMM 5257", "IMM 5257 SCH1", "IMM 0008 DEP", "IMM 0008 SCH4A",
 *  "CIT 0002", "eIMM 5669"; null when the text is not a form number. */
export function normaliseCode(raw: string): string | null {
  const m = /^\s*(e)?(IMM|IRM|CIT|PPTC)\s*-?\s*(\d{4})([A-D])?(?:\s*(?:(SCH|Schedule)\s*(\d{1,2}[A-D]?)|(DEP)))?\s*$/i.exec(decodeEntities(raw).replace(/ /g, " "));
  if (!m) return null;
  return `${m[1] ? "e" : ""}${m[2].toUpperCase()} ${m[3]}${(m[4] ?? "").toUpperCase()}${m[6] ? ` SCH${m[6].toUpperCase()}` : m[7] ? " DEP" : ""}`;
}

export type IndexRow = { code: string; title: string; pageUrl: string; dateModified: string | null; kind: "form" | "checklist" };
export type Package = { title: string; url: string };
/** canada.ca's forms-and-guides index: the table rows (number · title linking the form's own page · date modified, which
 *  is the page's date, not the edition) and the "Select an application package" links. A row whose number cannot be read
 *  or whose link is not an official address is left out. Guides are not rows of this table; they are linked from the
 *  package pages (pageLinks, guideLinks). */
/** Review (dc93b60f) / break m22: a title the library can show: not blank once invisible characters (zero-width spaces, soft
 *  hyphens, byte-order marks, blank letters) are taken out, and at most 300 visible characters (not UTF-16 units). */
export function indexTitleOk(title: string): boolean {
  // Break (e466adb1) m22: every invisible character counts as none: format and control characters, private use, separators,
  // and the blank letters (Hangul fillers, the braille blank, the combining grapheme joiner).
  // Break (89cccd71) m22: also lone marks and variation selectors, unpaired surrogates and the Khmer inherent vowels; the
  // 300 limit counts what is seen (a letter with its accents is one).
  const shown = title.replace(/[\p{Cf}\p{Cc}\p{Co}\p{Cs}\u034F\u115F\u1160\u17B4\u17B5\u2800\u3164\uFE00-\uFE0F\uFFA0]/gu, "");
  const letters = shown.replace(/\p{M}/gu, "");
  return letters.replace(/\p{Z}/gu, "").length > 0 && [...letters].length <= 300;
}

/** A date canada.ca writes (YYYY-MM or YYYY-MM-DD) that is a real calendar date: month 01-12, the day within the month. */
export function realDate(d: string): boolean {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(d);
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), day = m[3] ? Number(m[3]) : 1;
  // Break (dc93b60f) m25: a year IRCC could have written (1990 to next year): 0000 or 9999 would mark a form no edition answers.
  if (y < 1990 || y > new Date().getUTCFullYear() + 1) return false;
  return mo >= 1 && mo <= 12 && day >= 1 && day <= new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

export function parseFormsIndex(html: string): { rows: IndexRow[]; packages: Package[]; noPage: string[]; unreadable: string[] } {
  const rows: IndexRow[] = [], noPage: string[] = [], unreadable: string[] = [];
  const body = /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i.exec(html)?.[1] ?? "";
  for (const tr of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const tds = [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((t) => t[1]);
    if (tds.length < 2) continue;
    const code = normaliseCode(strip(tds[0])), a = anchors(tds[1])[0];
    // X5 break m7: a number that cannot be read is counted too (shown to the person), never silently dropped.
    if (!code) { if (strip(tds[0])) unreadable.push(strip(tds[0]).slice(0, 40)); continue; }
    // X5 (P156-1): a row whose number reads but whose link is missing or not an official address is counted, never guessed.
    if (!a) { noPage.push(code); continue; }
    const u = officialUrl(a.href);
    if (!u.ok) { noPage.push(code); continue; }
    const title = a.text.trim(), date = tds[2] ? strip(tds[2]) : "";
    // X5 break m15 / Devin on #145: a date that is not a real calendar date (2024-02-30) is kept as no date. (Titles are
    // judged by the library fill only, indexTitleOk: the finder and the check still find a row by its number.)
    rows.push({ code, title, pageUrl: u.url, dateModified: realDate(date) ? date : null, kind: /^document checklist/i.test(title) ? "checklist" : "form" });
  }
  const packages: Package[] = [], seen = new Set<string>();
  const ff = /<form\b[^>]*id\s*=\s*["']applications-ff["'][^>]*>([\s\S]*?)<\/form>/i.exec(html)?.[1] ?? "";
  for (const a of anchors(ff)) { const u = officialUrl(a.href); if (u.ok && a.text && !seen.has(u.url)) { seen.add(u.url); packages.push({ title: a.text, url: u.url }); } }
  return { rows, packages, noPage, unreadable };
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/** A form's own page: its title (the h1, without the "(IMM 5475)" suffix), the edition IRCC shows ("Last updated: May
 *  2021" → "2021-05") and the English PDF links under /content/dam/ircc/ (official addresses only). */
export function parseFormPage(html: string): { title: string | null; lastUpdated: string | null; pdfUrls: string[] } {
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const title = h1 ? strip(h1[1]).replace(/\s*\((?:e?IMM|IRM|CIT|PPTC)[^)]*\)\s*$/i, "").trim() || null : null;
  const lu = /Last\s+updated\s*:\s*([A-Za-z]+)\s+(\d{4})/i.exec(strip(html));
  const mi = lu ? MONTHS.indexOf(lu[1].toLowerCase()) : -1;
  const pdfUrls: string[] = [];
  for (const a of anchors(html)) {
    const u = officialUrl(a.href);
    if (!u.ok) continue;
    const path = new URL(u.url).pathname;
    if (!/\.pdf$/i.test(path) || !path.startsWith("/content/dam/ircc/")) continue;
    if (!(/\/english\//i.test(path) || /e\.pdf$/i.test(path)) || /\/french\//i.test(path)) continue;
    if (!pdfUrls.includes(u.url)) pdfUrls.push(u.url);
  }
  return { title, lastUpdated: lu && mi >= 0 ? `${lu[2]}-${String(mi + 1).padStart(2, "0")}` : null, pdfUrls };
}

/** Every link of a page that resolves (against `base`) to an official address, with its text; repeats kept once. */
export function pageLinks(html: string, base: string = CANADA_BASE): { text: string; url: string }[] {
  const out: { text: string; url: string }[] = [], seen = new Set<string>();
  for (const a of anchors(html)) { const u = officialUrl(a.href, base); if (u.ok && !seen.has(u.url)) { seen.add(u.url); out.push({ text: a.text, url: u.url }); } }
  return out;
}
/** The guide links of a package or apply page: an address whose path names guide-<number>, or a link whose text starts
 *  with "Guide ". */
export function guideLinks(html: string, base: string = CANADA_BASE): { title: string; url: string }[] {
  return pageLinks(html, base).filter((l) => /\/guide-\d+/i.test(new URL(l.url).pathname) || /^Guide\s/i.test(l.text)).map((l) => ({ title: l.text, url: l.url }));
}

/** Every IRCC form number printed in a page's text ("IMM 5257", "IMM5257", "IMM 0008 Schedule 4" → "IMM 0008 SCH4"),
 *  with the sentence around its first mention (at most 300 characters), one entry per number in reading order. */
export function mentionsOf(text: string): { code: string; sentence: string }[] {
  const out: { code: string; sentence: string }[] = [], seen = new Set<string>();
  const t = text.replace(/ /g, " ");
  const re = /(?<![A-Za-z0-9])(e?(?:IMM|IRM|CIT|PPTC))[ -]?(\d{4})(?!\d)([A-D](?![A-Za-z]))?(?:[ ]?(?:(SCH|Schedule)[ ]?(\d{1,2}[A-D]?)(?![0-9])|(DEP)(?![A-Za-z])))?/g;
  for (const m of t.matchAll(re)) {
    const code = normaliseCode(`${m[1]} ${m[2]}${m[3] ?? ""}${m[5] ? ` SCH${m[5]}` : m[6] ? " DEP" : ""}`);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const at = m.index ?? 0, end = at + m[0].length;
    // A sentence ends at . ! ? followed by a space (not "0.35 MB"), or at a line end before a capital or a digit (a heading
    // or a list item); a line that goes on in lower case is the same sentence (a link wrapped onto its own line).
    const endsAt = (k: number) => (/[.!?]/.test(t[k]) && (k + 1 >= t.length || /\s/.test(t[k + 1]))) || (t[k] === "\n" && !/[a-z(\[]/.test(t[k + 1] ?? ""));
    let s = at; while (s > 0 && !endsAt(s - 1)) s--;
    let e = end; while (e < t.length && !endsAt(e)) e++;
    if (e < t.length && t[e] !== "\n") e++;
    let sentence = t.slice(s, e).replace(/\s+/g, " ").trim();
    if (sentence.length > 300) { const mid = at - s, from = Math.max(0, Math.min(sentence.length - 300, mid - 150)); let w = sentence.slice(from, from + 300); if (from > 0) w = w.replace(/^\S*\s/, ""); if (from + 300 < sentence.length) w = w.replace(/\s\S*$/, ""); sentence = w.trim(); }
    out.push({ code, sentence });
  }
  return out;
}

const SKIP = new Set(["script", "style", "nav", "header", "footer", "noscript", "svg", "form"]);
const BREAK = new Set(["p", "li", "h1", "h2", "h3", "h4", "tr", "br", "div", "section", "dt", "dd"]);
/** The visible text of a page without scripts, styles, navigation, header, footer, inline images and forms, one line per
 *  block, spaces collapsed: the same rule as prototype/p1/source_text.py (html_text), so a page's text here and in its
 *  P1 text inventory agree. */
export function pageText(html: string): string {
  const out: string[] = [];
  let depth = 0, i = 0;
  const tag = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  const text = (s: string) => { if (!depth && s) out.push(decodeEntities(s)); };
  for (let m = tag.exec(html); m; m = tag.exec(html)) {
    text(html.slice(i, m.index)); i = tag.lastIndex;
    if (!m[2]) continue;
    const name = m[2].toLowerCase(), closing = m[1] === "/", selfClosing = m[4] === "/";
    if (!closing && !selfClosing && (name === "script" || name === "style")) {
      // raw text, always skipped: the content ends only at the matching end tag
      const endRe = new RegExp(`</${name}\\s*>`, "ig"); endRe.lastIndex = i; const e = endRe.exec(html);
      i = e ? endRe.lastIndex : html.length; tag.lastIndex = i; continue;
    }
    if (closing) { if (SKIP.has(name) && depth) depth--; continue; }
    if (SKIP.has(name)) { if (!selfClosing) depth++; }
    else if (BREAK.has(name)) out.push("\n");
  }
  text(html.slice(i));
  return out.join("").replace(/[ \t\r\f\v]+/g, " ").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}
/** A guide's edition: the SHA-256 of its normalised text, so two saves of the same page are the same edition. */
export const textFingerprint = (html: string) => createHash("sha256").update(pageText(html), "utf8").digest("hex");
