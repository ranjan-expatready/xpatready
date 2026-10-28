// The finder's filing rule and Load sample's Sample fixtures (S4, P-122/P-123; Lead note 28 Oct): what IRCC accepts read
// from IRCC's own line, the same rule for AI answers and for the fixtures, and the fixtures checked before they are used.
// No framework, no database: the S4 canada check tests it directly.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, join, sep } from "node:path";
import { officialUrl } from "../../engine/canada.ts";
import { normaliseCode } from "../../contracts/form-library.ts";
import { CanadaError } from "./canada.ts";

const STUDIO = join(import.meta.dirname, "..", ".."), SOLUTION = join(STUDIO, "..", "..");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** What IRCC accepts, from IRCC's own line about how the form is filed (P-122/P-123): the one rule AI answers and the
 *  Sample fixtures both pass. A PDF upload needs a line that says the form is uploaded; Online needs a line about filing
 *  online or in a portal. Lead check 28 Oct: a paper or mail line ("Paper applications … send this form") is paper filing,
 *  never a PDF upload, and a line about filling the form in on a computer says how to fill it, not how it is filed: both
 *  give null, "Not set yet", with filingWhy's reason. */
export function channelsFrom(note: string | null | undefined): "PDF" | "ONLINE" | "PDF_OR_ONLINE" | null {
  if (!note) return null;
  // Review round 7: a download link's size label ("(PDF, 0.5 MB)") says what the file is, not how the form is filed.
  const line = note.replace(/\((?:pdf|html)[^)]*\)/gi, " ");
  const pdf = /\bupload(?:s|ed|ing)?\b/i.test(line);
  // "Online applications … Upload this form along with your online application": the PDF goes into an online
  // application (a PDF upload); only filing online itself (an online form, the portal) is Online.
  const online = /\bonline\b|\bportal\b/i.test(pdf ? line.replace(/\bonline applications?\b/gi, " ") : line);
  return online && pdf ? "PDF_OR_ONLINE" : online ? "ONLINE" : pdf ? "PDF" : null;
}
/** Why a line gives no value (null when it gives one): shown with a fixture that is left out. */
export function filingWhy(note: string | null | undefined): string | null {
  if (channelsFrom(note)) return null;
  const line = note ?? "";
  if (/\bpaper\b|\bmail(?:ed)?\b|\bsend (?:this|the|it|us)\b/i.test(line)) return "IRCC's page speaks of paper filing, not a PDF upload";
  if (/\bcomputer\b|\bvalidat\w*\b|\bdownload\b/i.test(line)) return "IRCC's line says how to fill the form in, not how it is filed";
  return "IRCC's line does not say how the form is filed";
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
