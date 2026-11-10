// The finder's filing rule and Load sample's Sample fixtures (S4, P-122/P-123; Lead note 28 Oct): what IRCC accepts read
// from IRCC's own line, the same rule for AI answers and for the fixtures, and the fixtures checked before they are used.
// No framework, no database: the S4 canada check tests it directly.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, join, sep } from "node:path";
import { officialUrl, pageText } from "../../engine/canada.ts";
import { normaliseCode } from "../../contracts/form-library.ts";
import { CanadaError } from "./canada.ts";
import { CHANNELS as FILING_CHANNELS, IRCC_ACCOUNTS, type Channel } from "../../contracts/forms.ts";

const STUDIO = join(import.meta.dirname, "..", ".."), SOLUTION = join(STUDIO, "..", "..");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** What IRCC accepts, from IRCC's own line about how the form is filed (P-122/P-123): the one rule AI answers and the
 *  Sample fixtures both pass. A PDF upload needs a line that says the form is uploaded; Online needs a line about filing
 *  online or in a portal. Lead check 28 Oct: a paper or mail line ("Paper applications … send this form") is paper filing,
 *  never a PDF upload, and a line about filling the form in on a computer says how to fill it, not how it is filed: both
 *  give null, "Not set yet", with filingWhy's reason. */
export function channelsFrom(note: string | null | undefined): "PDF" | "ONLINE" | "PDF_OR_ONLINE" | null {
  const { pdf, online } = readLine(note);
  return online && pdf ? "PDF_OR_ONLINE" : online ? "ONLINE" : pdf ? "PDF" : null;
}
/** C-6 (W1-10 slice 1, P-143): the same rule in the four channels, adding an affirmative paper instruction ("mail it to",
 *  "apply on paper", "print, sign and mail"); conditions and negations are read as for the others. Used only to flag a
 *  contradiction with the finder's two rounds (C-5), never to set a value. */
export function channelsRead(note: string | null | undefined): Channel[] | null {
  const { pdf, online, paper } = readLine(note);
  const out: Channel[] = [...(online ? ["ONLINE" as const] : []), ...(pdf ? ["PDF_UPLOAD" as const] : []), ...(paper ? ["PAPER" as const] : [])];
  return out.length ? out : null;
}
function readLine(note: string | null | undefined) {
  let pdf = false, online = false, paper = false;
  // QA-61 and the #73 review, by rule: each sentence is read clause by clause; a condition ("if", "even if", "unless" …)
  // is never evidence of a channel, and a negated clause ("Do not upload this form") says nothing. What is left must be
  // an affirmative instruction: "upload" for a PDF upload; filing online ("apply/submit/fill/complete … online", "an
  // online form", "through the portal") for Online. "Your online application" is where an upload goes, not filing online.
  for (const sentence of sentencesOf(note)) for (const clause of clausesOf(sentence)) {
    const c = clause.replace(CONDITION, "").trim();
    if (!c || NEGATED.test(c)) continue;
    if (/\bupload(?:s|ed|ing)?\b/i.test(c)) pdf = true;
    if (FILE_ONLINE.test(c.replace(/\bonline applications?\b/gi, " "))) online = true;
    // C-6: paper is read only from a sentence that is not a condition as a whole ("If you cannot apply online, you may apply on paper" is an accommodation, not the rule).
    if (FILE_PAPER.test(c) && !CONDITION_FIRST.test(sentence)) paper = true;
  }
  return { pdf, online, paper };
}
/** A sentence that opens with a condition. */
const CONDITION_FIRST = /^\s*(?:even if|even when|if|when|unless|whether|except|in case)\b/i;
/** C-6: an affirmative instruction to file on paper. */
const FILE_PAPER = /\b(?:apply|applies|applying|submit\w*|file)\s+(?:\w+\s+){0,3}?on paper\b|\bpaper applications? (?:must|should)\b|\bprint(?:ed)?,? sign(?:ed)?,? and (?:mail|send)\b|\bmail (?:it|this form|the form|your (?:application|form|completed application))\b|\bsend (?:it|this form|the form|your (?:application|form|completed application)) by mail\b/i;

/** C-5 (P-140): one round's reading of how a form is filed: the channel, the IRCC account, IRCC's sentence. */
export type ChannelReading = { value: Channel; account: string; quote: string } | null;
export type ChannelProposal =
  | { outcome: "ready" | "check"; channels: Channel[]; account: string; quote: string; why: string | null; readings: { draft: ChannelReading; check: ChannelReading; keyword: Channel[] | null } }
  | { outcome: "listed"; why: string; readings: { draft: ChannelReading; check: ChannelReading; keyword: Channel[] | null } };
const ch = (cs: Channel[] | null) => (cs ?? []).map((c) => ({ ONLINE: "Online", PDF_UPLOAD: "PDF upload", PAPER: "Paper", NOT_NEEDED: "Not needed" }[c])).join(" or ");
/** C-5 (P-140): the finder proposes, a person confirms. Both rounds name the same channel and account with a sentence found
 *  on the page and the keyword rule does not read it otherwise → Ready. The rounds differ, only one names it, or the
 *  keyword rule reads the line otherwise → Check, both readings kept. No sentence found on the page → listed, no change.
 *  An answer saved before channels (`earlier`) has no reading: the keyword rule reads its IRCC line, as Check. */
export function channelProposal(draft: ChannelReading | undefined, check: ChannelReading | undefined, note: string | null, onPage: (quote: string) => boolean, earlier?: string): ChannelProposal {
  const keyword = channelsRead(note);
  if (earlier || (draft === undefined && check === undefined)) {
    const readings = { draft: null, check: null, keyword };
    if (!keyword || !note || !onPage(note)) return { outcome: "listed", why: `${earlier ?? "Saved before channels"}: channel not proposed, and no line on the page says how it is filed.`, readings };
    return { outcome: "check", channels: keyword, account: "ANY", quote: note, why: `${earlier ?? "Saved before channels"}: channel not proposed. The keyword rule reads IRCC's line as ${ch(keyword)}: check it.`, readings };
  }
  const d = draft && onPage(draft.quote) ? draft : null, c = check && onPage(check.quote) ? check : null;
  const readings = { draft: draft ?? null, check: check ?? null, keyword };
  const first = d ?? c;
  if (!first) return { outcome: "listed", why: draft || check ? "The sentence AI quoted for how it is filed is not on the page, so nothing was proposed." : "Neither round found a sentence on the page saying how it is filed.", readings };
  // Review M1 / break M4 (29 Oct): Not needed is said for one IRCC account (C-4; the database refuses it for every
  // account), so a reading without one is listed for a person, never proposed as a change no one could approve.
  if (first.value === "NOT_NEEDED" && first.account === "ANY") return { outcome: "listed", why: "AI read it as Not needed but named no IRCC account; Not needed is said for one account, so nothing was proposed.", readings };
  const agree = !!d && !!c && d.value === c.value && d.account === c.account;
  const read = channelsRead(first.quote);
  const contradicts = first.value !== "NOT_NEEDED" && !!read && !read.includes(first.value);
  const why = !agree ? (d && c ? `The two rounds differ: ${ch([d.value])} (${d.account}) and ${ch([c.value])} (${c.account}).` : "Only one round said how it is filed.")
    : contradicts ? `The keyword rule reads IRCC's line as ${ch(read)}, not ${ch([first.value])}.` : null;
  return { outcome: why ? "check" : "ready", channels: [first.value], account: first.account, quote: first.quote, why, readings };
}
/** A clause: split on ";", ",", ":", " but " and " instead" (a heading ends at its colon). */
const clausesOf = (s: string) => s.split(/[;,:]|\s+but\s+|\s+instead\b/i).map((x) => x.trim()).filter(Boolean);
/** A condition, from its first word to the end of its clause: never evidence of a channel. */
const CONDITION = /\b(?:even if|even when|if|when|unless|whether|except|in case)\b.*$/i;
/** An affirmative instruction to file online. */
const FILE_ONLINE = /\b(?:apply|applies|applying|submit\w*|fill\w*|complet\w*|file)\b[^.;]*\bonline\b|\bonline form\b|\b(?:through|in|on|via|using)\s+(?:the|your|an?)\b[^.;]{0,40}?\bportal\b/i;
/** QA-61: the rule reads each sentence, not single words. */
const NEGATED = /\b(?:do not|don't|does not|doesn't|did not|didn't|no need to|not need to|need not|never|without)\b/i;
function sentencesOf(note: string | null | undefined): string[] {
  if (!note) return [];
  // Review round 7: a download link's size label ("(PDF, 0.5 MB)") says what the file is, not how the form is filed.
  return note.replace(/\((?:pdf|html)[^)]*\)/gi, " ").split(/(?<=[.;!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
}
/** Why a line gives no value (null when it gives one): shown with a fixture that is left out. */
export function filingWhy(note: string | null | undefined): string | null {
  if (channelsFrom(note)) return null;
  const line = note ?? "";
  if (sentencesOf(note).some((x) => NEGATED.test(x) && /\bupload/i.test(x))) return "IRCC's line says not to upload it";
  if (/\bpaper\b|\bmail(?:ed)?\b|\bsend (?:this|the|it|us)\b/i.test(line)) return "IRCC's page speaks of paper filing, not a PDF upload";
  if (/\bcomputer\b|\bvalidat\w*\b|\bdownload\b/i.test(line)) return "IRCC's line says how to fill the form in, not how it is filed";
  return "IRCC's line does not say how the form is filed";
}

/** Text compared as a person reads it: case, curly quotes, dashes and spacing do not matter. */
export const sameText = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
export type AccountAccept = { form: string; account: string; channels: Channel[]; quote: string; url: string; read: string };
/** M3-S5 (P-113, P-170): the sample's records of what an IRCC account accepts (samples/form-library-sample.json
 *  account_accepts), each kept only with a known account and channels, IRCC's line (at most 400 characters), a canada.ca
 *  address, the date it was read, and the line on that page's recorded copy (`pageOf`: the page's HTML, or null when no
 *  copy is recorded). Nothing invented: a record that fails is left out with its reason. */
export async function accountAccepts(records: unknown, pageOf: (url: string) => Promise<string | null>): Promise<{ ok: AccountAccept[]; problems: string[] }> {
  const out: { ok: AccountAccept[]; problems: string[] } = { ok: [], problems: [] };
  for (const v of Array.isArray(records) ? records : []) {
    const r = (v ?? {}) as Partial<Record<keyof AccountAccept, unknown>>, form = typeof r.form === "string" ? r.form : "?";
    const why = (w: string) => out.problems.push(`${form}: what ${typeof r.account === "string" ? r.account : "an account"} accepts was not used: ${w}`);
    if (typeof r.account !== "string" || !(IRCC_ACCOUNTS as readonly string[]).includes(r.account)) { why("not a known IRCC account"); continue; }
    if (!Array.isArray(r.channels) || !r.channels.length || !r.channels.every((c) => (FILING_CHANNELS as readonly string[]).includes(c))) { why("not a known channel"); continue; }
    if (typeof r.quote !== "string" || !r.quote.trim() || r.quote.length > 400) { why("no line from IRCC (at most 400 characters)"); continue; }
    if (typeof r.url !== "string" || !officialUrl(r.url).ok) { why("its page is not a canada.ca address"); continue; }
    if (typeof r.read !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.read) || Number.isNaN(Date.parse(r.read))) { why("no date it was read (YYYY-MM-DD)"); continue; }
    const html = await pageOf(r.url);
    if (html === null || !sameText(pageText(html)).includes(sameText(r.quote))) { why("its line is not on its recorded canada.ca page"); continue; }
    out.ok.push({ form, account: r.account, channels: r.channels as Channel[], quote: r.quote, url: r.url, read: r.read });
  }
  return out;
}

/** Load sample's Sample fixtures (samples/form-library-sample.json): what IRCC accepts per form, a page for a form canada.ca's
 *  list does not carry, and each sample combination's guide by its key. Each entry is checked before it is used, and one
 *  that fails is left out with the reason (break R5-3, R5-4, review round 7 Major 1): a value must be what the finder's own
 *  rule reads in its line (channelsFrom, as for AI answers), every address must be canada.ca's, and a recorded copy must be
 *  the manifest's file for that address with the manifest's checksum. */
type SampleFixtures = { accepts: Record<string, { channels: "PDF" | "ONLINE" | "PDF_OR_ONLINE"; quote: string }>; pages: Record<string, { url: string; why?: string }>; guides: Record<string, { url: string | null; recorded?: string; why?: string }>; problems: string[] };
const CHANNELS = new Set(["PDF", "ONLINE", "PDF_OR_ONLINE"]);
export function sampleFixtures(file = join(STUDIO, "samples", "form-library-sample.json")): SampleFixtures {
  const out: SampleFixtures = { accepts: {}, pages: {}, guides: {}, problems: [] };
  let f: { accepts?: Record<string, unknown>; pages?: Record<string, unknown>; guides?: Record<string, unknown> };
  try { f = JSON.parse(readFileSync(file, "utf8")); if (!f || typeof f !== "object") throw new Error("not an object"); }
  catch (e) { out.problems.push(`the Sample fixtures could not be read (${(e as Error).message.slice(0, 120)}): nothing was loaded from them`); return out; }
  const str = (x: unknown, max: number) => typeof x === "string" && x.trim().length > 0 && x.length <= max;
  for (const [code, v] of Object.entries(f.accepts ?? {})) {
    const x = v as { channels?: unknown; quote?: unknown } | null;
    if (!x || !CHANNELS.has(String(x.channels)) || !str(x.quote, 400)) { out.problems.push(`${code}: what IRCC accepts is not a known value with its line`); continue; }
    if (channelsFrom(String(x.quote)) !== x.channels) { out.problems.push(`${code}: its line does not say ${x.channels}: ${filingWhy(String(x.quote)) ?? `it says ${channelsFrom(String(x.quote))}`} ("${String(x.quote).slice(0, 60)}")`); continue; }
    out.accepts[normaliseCode(code)] = { channels: x.channels as "PDF", quote: String(x.quote) };
  }
  for (const [code, v] of Object.entries(f.pages ?? {})) {
    const x = v as { url?: unknown; why?: unknown } | null, u = x && str(x.url, 300) ? officialUrl(String(x.url)) : null;
    if (!u?.ok) { out.problems.push(`${code}: its page is not a canada.ca address`); continue; }
    out.pages[normaliseCode(code)] = { url: u.url, why: typeof x!.why === "string" ? x!.why : undefined };
  }
  for (const [key, v] of Object.entries(f.guides ?? {})) {
    const x = v as { url?: unknown; recorded?: unknown; why?: unknown } | null;
    if (!x) { out.problems.push(`${key}: no guide entry`); continue; }
    const why = typeof x.why === "string" ? x.why.slice(0, 200) : undefined;
    if (x.url === null) { out.guides[key] = { url: null, why }; continue; }
    const u = str(x.url, 300) ? officialUrl(String(x.url)) : null;
    if (!u?.ok || !/\/guide-\d{3,5}[^/]*\.html$/.test(u.url)) { out.problems.push(`${key}: its guide is not a canada.ca guide page`); continue; }
    if (x.recorded !== undefined && !(typeof x.recorded === "string" && /^[a-z0-9-]+\/[a-z0-9._-]+\.html$/i.test(x.recorded))) { out.problems.push(`${key}: its recorded copy is not a file of the official sources`); continue; }
    out.guides[key] = { url: u.url, recorded: x.recorded as string | undefined, why };
  }
  return out;
}
/** A recorded official copy (official-sources/ircc/<folder>/<file>): only the manifest's file for that address, inside the
 *  official sources (no link out of them), with the manifest's checksum. */
export function recordedCopy(url: string, path: string, base = join(SOLUTION, "official-sources", "ircc")): Buffer {
  const items = (JSON.parse(readFileSync(join(base, "manifest.json"), "utf8")).items ?? []) as { file?: string; url?: string; sha256?: string }[];
  const it = items.find((x) => x.url === url && x.file === basename(path));
  if (!it?.sha256) throw new CanadaError("not_in_fixtures", `${path} is not the manifest's copy of ${url}`);
  const file = join(base, path);
  if (!existsSync(file) || !realpathSync(file).startsWith(realpathSync(base) + sep)) throw new CanadaError("not_in_fixtures", `the recorded copy ${path} is missing`);
  const bytes = readFileSync(file);
  if (sha(bytes) !== it.sha256) throw new CanadaError("not_in_fixtures", `the recorded copy ${path} no longer matches the manifest's checksum`);
  return bytes;
}
