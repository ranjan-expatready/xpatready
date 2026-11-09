// C6.4 storage slice (M3-C; M3-CONTRACT C6.4; SI-14): the states of a checklist line and the requests that move them.
// Owned by the runtime lane. Uploads are multipart (one file, field "file"); the rest are JSON.
import { z } from "zod";

export const LINE_STATES = ["not_requested", "requested", "received", "being_checked", "approved", "rejected", "not_applicable"] as const;
export type LineState = (typeof LINE_STATES)[number];
/** The team's words for each state (M3-CONTRACT C6.4). */
export const STATE_WORDS: Record<LineState, string> = {
  not_requested: "Not requested", requested: "Requested", received: "Received", being_checked: "Being checked",
  approved: "Approved", rejected: "Rejected", not_applicable: "Not applicable",
};
/** From which states each action may move a line. Uploading on a Not applicable line is refused: request it first. */
export const REQUEST_FROM: readonly LineState[] = ["not_requested", "rejected", "not_applicable"];
export const UPLOAD_FROM: readonly LineState[] = ["not_requested", "requested", "received", "being_checked", "approved", "rejected"];
export const NOT_APPLICABLE_FROM: readonly LineState[] = ["not_requested", "requested", "received", "being_checked", "approved", "rejected"];

export const MAX_REASON = 500;
/** Characters a person cannot see: zero-width spaces and joiners, the byte-order mark and bidirectional controls (a
 *  right-to-left override can make "gpj.exe" read as "exe.jpg"). Removed from reasons and file names (break m7, m8). */
export const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;
/** The line's version the person saw (optional): sent, a line changed since is refused, not overwritten (break M3). */
// Empty or null is "not sent" (review m-R2-1: it was read as 0, a false conflict); anything else is a whole number from 0
// in plain words (m-R2-2).
const VERSION_WORDS = "Send the version of the line you saw, a whole number from 0, or leave it out.";
export const SeenVersion = z.object({ version: z.preprocess((v) => (v === "" || v === null ? undefined : typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v) : v),
  z.number({ message: VERSION_WORDS }).int(VERSION_WORDS).min(0, VERSION_WORDS).optional()) });
export const NotApplicable = SeenVersion.extend({
  reason: z.string({ message: "Give a reason why this document is not applicable." }).transform((x) => x.replace(INVISIBLE, "").trim())
    .pipe(z.string().min(1, "Give a reason why this document is not applicable.").max(MAX_REASON, `A reason is at most ${MAX_REASON} characters.`)),
});
/** C6.14 (SA-1B-214 rule 2; concept product/screens/B136/concept.md BR-6): the case officer's choice of providers for a
 *  shared line (people on the case, by their subject id), or null to use the document type's defaults again; always with
 *  a reason (3 characters or more) and, when sent, the line's version as seen. */
const PROVIDERS_REASON = "Give a reason for changing who provides this document (3 characters or more).";
export const ChangeProviders = SeenVersion.extend({
  providers: z.array(z.string({ message: "Name each provider by the person's id." }).uuid("Name each provider by the person's id."), { message: "Choose who provides it, or send null to use the defaults." })
    .min(1, "Choose at least one person, or use the defaults.").max(12, "At most 12 providers.").nullable(),
  reason: z.string({ message: PROVIDERS_REASON }).transform((x) => x.replace(INVISIBLE, "").trim())
    .pipe(z.string().min(3, PROVIDERS_REASON).max(MAX_REASON, `A reason is at most ${MAX_REASON} characters.`)),
}).strict();

/** Uploads: one file up to 20 MB, a PDF, JPEG or PNG judged by its own bytes (never by its name or the browser's type). */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024, MAX_DOCUMENT_MB = MAX_DOCUMENT_BYTES / 1024 / 1024;
export const MEDIA = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" } as const;
export type Media = keyof typeof MEDIA;
export function mediaOf(b: Uint8Array): Media | null {
  if (b.length >= 5 && String.fromCharCode(...b.subarray(0, 5)) === "%PDF-") return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return "image/png";
  return null;
}
/** A file name as shown back: its last path part, control and markup characters removed, at most 200 characters. */
export function cleanName(name: string | undefined): string {
  const n = String(name ?? "").split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f<>"]/g, "").replace(INVISIBLE, "").trim().slice(0, 200);
  return n && !/^\.+$/.test(n) ? n : "document";
}
export type StoredDocument = { id: string; current: boolean; file_name: string; media_type: string; size_bytes: number; sha256: string; uploaded_by: string; uploaded_at: string; superseded_at: string | null;
  /** C6.15: on a line with a substitute set, the member of the set this file is. */
  member?: { key: string; name: string } };
