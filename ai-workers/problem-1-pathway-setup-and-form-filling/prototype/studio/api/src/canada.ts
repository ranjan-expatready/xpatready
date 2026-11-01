// The canada.ca port (S4 slice 1, challenge M2): the one place the studio reads canada.ca. Two adapters behind one
// interface: LiveCanada (this Mac, STUDIO_CANADA=live) and FixtureCanada (default: tests, CI, isolated copies and Load
// sample replay the recorded copies in official-sources/ircc/canada/index.json and never call canada.ca). The live
// adapter admits only official https addresses (engine/canada.ts officialUrl) before every request and every redirect,
// follows at most 3 redirects, gives up after 20 s for a page and 60 s for a PDF, refuses more than 25 MB and checks the
// body is what was asked for (a PDF starts with %PDF-, a page is text/html). Built-in Node only, no new package.
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { officialUrl } from "../../engine/canada.ts";

export type CanadaCode = "host" | "status" | "redirect" | "size" | "type" | "timeout" | "network" | "not_in_fixtures";
/** A refusal or failure of the port, with a message a person can act on (shown as is). */
export class CanadaError extends Error {
  readonly code: CanadaCode;
  constructor(code: CanadaCode, message: string) { super(message); this.code = code; this.name = "CanadaError"; }
}
/** One page or PDF as read: the address asked for, the address that answered (after redirects), its checksum and when.
 *  `lastModified` is canada.ca's Last-Modified header when it sent one (recorded in the manifest as server_last_modified). */
export type Fetched = { url: string; finalUrl: string; status: number; contentType: string; bytes: Buffer; sha256: string; fetchedAt: Date; from: "live" | "fixture"; lastModified?: string | null };
export interface CanadaSource { get(url: string, want: "html" | "pdf"): Promise<Fetched> }

export const MAX_BYTES = 25 * 1024 * 1024;
export const USER_AGENT = "ExpatReady-ProductStudio/0.1";
const SOLUTION = join(import.meta.dirname, "..", "..", "..", "..");
export const OFFICIAL_ROOT = join(SOLUTION, "official-sources", "ircc");
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
const secs = (ms: number) => ms >= 1000 ? `${Math.round(ms / 1000)} s` : `${ms} ms`;
const FALLBACK = "Try again, or download the PDF in your browser and upload it here.";
const isPdf = (b: Buffer) => b.subarray(0, 5).toString("latin1") === "%PDF-";
/** The address checked as official, or a "host" refusal saying why. */
function admit(url: string, base?: string): string {
  const u = officialUrl(url, base);
  if (!u.ok) throw new CanadaError("host", `This address is not used: ${u.why} The form finder reads only www.canada.ca and ircc.canada.ca.`);
  return u.url;
}

type LiveOptions = { fetchImpl?: typeof fetch; timeoutMs?: { html: number; pdf: number } };
/** Reads canada.ca for real. Each request: official address, redirect "manual" (each hop checked, at most 3), timeout
 *  by AbortController (the whole read, body included), size limit on Content-Length and on the bytes actually received,
 *  status 200 only, body type checked. */
export class LiveCanada implements CanadaSource {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: { html: number; pdf: number };
  constructor(opts: LiveOptions = {}) { this.fetchImpl = opts.fetchImpl ?? fetch; this.timeoutMs = opts.timeoutMs ?? { html: 20_000, pdf: 60_000 }; }

  async get(url: string, want: "html" | "pdf"): Promise<Fetched> {
    const asked = admit(url), ms = this.timeoutMs[want], ac = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ac.abort(); }, ms);
    // Rejects when the timer fires even if a fetch ignores the signal, so a stuck server can never hold the run.
    const stopped = new Promise<never>((_, rej) => ac.signal.addEventListener("abort", () => rej(new CanadaError("timeout", `canada.ca did not answer within ${secs(ms)}. ${FALLBACK}`)), { once: true }));
    stopped.catch(() => { /* handled where raced */ });
    const race = <T>(p: Promise<T>) => Promise.race([p, stopped]);
    try {
      let current = asked, hops = 0, res: Response;
      for (;;) {
        try {
          res = await race(this.fetchImpl(current, { redirect: "manual", signal: ac.signal, headers: { "user-agent": USER_AGENT, accept: want === "pdf" ? "application/pdf" : "text/html" } }));
        } catch (e) { throw this.wrap(e, timedOut, ms); }
        if (![301, 302, 303, 307, 308].includes(res.status)) break;
        const loc = res.headers.get("location");
        void res.body?.cancel().catch(() => undefined);
        if (!loc) throw new CanadaError("redirect", `canada.ca sent this address elsewhere without saying where. ${FALLBACK}`);
        const next = officialUrl(loc, current);
        if (!next.ok) throw new CanadaError("redirect", `canada.ca redirected this address away from canada.ca (${next.why}), so nothing was downloaded. ${FALLBACK}`);
        if (++hops > 3) throw new CanadaError("redirect", `canada.ca redirected this address more than 3 times, so nothing was downloaded. ${FALLBACK}`);
        current = next.url;
      }
      if (res.status !== 200) { void res.body?.cancel().catch(() => undefined); throw new CanadaError("status", `canada.ca answered "${res.status}${res.statusText ? ` ${res.statusText}` : ""}" for this address instead of the page. Check the address on canada.ca, or download the PDF in your browser and upload it here.`); }
      const declared = Number(res.headers.get("content-length") ?? NaN);
      if (Number.isFinite(declared) && declared > MAX_BYTES) { void res.body?.cancel().catch(() => undefined); throw new CanadaError("size", `This file is ${mb(declared)}; files over 25 MB are not downloaded. Download it in your browser and upload it here if it is really needed.`); }
      const contentType = res.headers.get("content-type") ?? "";
      if (want === "html" && !/^\s*text\/html\b/i.test(contentType)) { void res.body?.cancel().catch(() => undefined); throw new CanadaError("type", `canada.ca sent ${contentType || "an unnamed kind of file"} instead of a web page for this address. Check the address on canada.ca.`); }
      const bytes = await race(this.readCapped(res)).catch((e) => { throw this.wrap(e, timedOut, ms); });
      if (want === "pdf" && !isPdf(bytes)) throw new CanadaError("type", `The file behind this link is not a PDF (canada.ca sent ${contentType || "something else"}), so it was not stored. Download it in your browser and upload it here.`);
      return { url: asked, finalUrl: current, status: res.status, contentType, bytes, sha256: sha(bytes), fetchedAt: new Date(), from: "live", lastModified: res.headers.get("last-modified") };
    } finally { clearTimeout(timer); }
  }

  /** The body, refused as soon as it passes 25 MB (a server can send more than its Content-Length says, or none). */
  private async readCapped(res: Response): Promise<Buffer> {
    if (!res.body) return Buffer.alloc(0);
    const reader = res.body.getReader(), parts: Uint8Array[] = [];
    let n = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.byteLength;
      if (n > MAX_BYTES) { await reader.cancel().catch(() => undefined); throw new CanadaError("size", `This file is larger than 25 MB, so it was not downloaded. Download it in your browser and upload it here if it is really needed.`); }
      parts.push(value);
    }
    return Buffer.concat(parts);
  }
  private wrap(e: unknown, timedOut: boolean, ms: number): CanadaError {
    if (e instanceof CanadaError) return e;
    if (timedOut || (e instanceof Error && e.name === "AbortError")) return new CanadaError("timeout", `canada.ca did not answer within ${secs(ms)}. ${FALLBACK}`);
    return new CanadaError("network", `canada.ca could not be reached (${e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e)}). Check the connection and try again, or download the PDF in your browser and upload it here.`);
  }
}

/** One recorded copy: the address, the file (relative to official-sources/ircc/), its checksum, type and status. */
export type FixtureItem = { url: string; path: string; sha256: string; content_type: string; status: number; final_url?: string; note?: string };
export type FixtureIndex = { note: string; recorded_utc: string; items: FixtureItem[] };
/** Replays the recorded canada.ca copies (tools/record_canada_fixtures.ts) and never touches the network. Every read
 *  checks the file's checksum against the index, so a changed copy is refused rather than used; a file outside the
 *  official folder is refused too. `root` is the official folder (tests point it at a copy). */
export class FixtureCanada implements CanadaSource {
  private readonly root: string;
  private index: FixtureIndex | null = null;
  private indexMtime = 0;
  constructor(opts: { root?: string } = {}) { this.root = resolve(opts.root ?? OFFICIAL_ROOT); }
  /** Read again when the index file changes (a test copy re-records one file, #261 m1), else the one read is kept. */
  private items(): FixtureItem[] {
    const file = join(this.root, "canada", "index.json"), m = statSync(file).mtimeMs;
    if (!this.index || m !== this.indexMtime) { this.index = JSON.parse(readFileSync(file, "utf8")) as FixtureIndex; this.indexMtime = m; }
    return this.index.items;
  }
  async get(url: string, want: "html" | "pdf"): Promise<Fetched> {
    const asked = admit(url);
    const item = this.items().find((i) => i.url === asked);
    if (!item) throw new CanadaError("not_in_fixtures", "This page is not in the recorded canada.ca copies used for tests and the demo.");
    const abs = resolve(this.root, item.path), rel = relative(this.root, abs);
    if (rel.startsWith("..") || rel.split(sep).includes("..")) throw new CanadaError("not_in_fixtures", "The recorded copy for this page points outside the official sources folder, so it is not used.");
    let bytes: Buffer;
    try { bytes = readFileSync(abs); } catch { throw new CanadaError("not_in_fixtures", "The recorded copy of this page is missing from the official sources folder. Run the recorder again on the Mac."); }
    const h = sha(bytes);
    if (h !== item.sha256) throw new CanadaError("not_in_fixtures", "The recorded copy of this page has changed since it was recorded (its checksum differs), so it is not used. Run the recorder again on the Mac.");
    if (want === "pdf" && !isPdf(bytes)) throw new CanadaError("type", "The recorded file behind this link is not a PDF, so it is not used.");
    if (want === "html" && !/^\s*text\/html\b/i.test(item.content_type)) throw new CanadaError("type", `The recorded copy is ${item.content_type}, not a web page.`);
    if (item.status !== 200) throw new CanadaError("status", `canada.ca answered "${item.status}" for this address when it was recorded.`);
    return { url: asked, finalUrl: item.final_url ?? asked, status: item.status, contentType: item.content_type, bytes, sha256: h, fetchedAt: new Date(), from: "fixture", lastModified: null };
  }
}

/** The port the studio uses: live canada.ca only when STUDIO_CANADA=live (the Mac), the recorded copies otherwise, so CI
 *  and test copies never call canada.ca. */
export function canadaSource(): CanadaSource {
  if (process.env.STUDIO_CANADA === "live") return new LiveCanada();
  // Scaffolding (S4 checks): an isolated test copy may replay another folder of recorded copies (a test-made file equal to
  // "canada.ca's", Q-L1). Honoured only inside an isolated copy's own working folder; the demo always uses the real ones.
  const alt = process.env.STUDIO_CANADA_FIXTURES, varRoot = process.env.STUDIO_VAR ?? "";
  const root = alt ? resolve(varRoot, alt) : "";
  if (alt && /[/\\]isolated-[a-z0-9_]+$/.test(varRoot) && root.startsWith(`${resolve(varRoot)}${sep}`)) return new FixtureCanada({ root });
  return new FixtureCanada();
}
