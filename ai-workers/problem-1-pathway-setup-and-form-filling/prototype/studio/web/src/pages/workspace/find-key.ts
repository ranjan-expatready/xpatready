// The Find dialog's launch key and its words (founder's test 5 Nov: "Too big: expected string to have <=120 characters").
// The key guards against a double start of one run (the server answers the same key with the same run, api/src/finder.ts
// launch), so it must differ for each page and mode a person tries in one dialog, and stay short whatever the page:
// contracts/form-library.ts allows 8 to 120 characters. Before, the address itself was in the key, so every canada.ca
// page over about 73 characters (all four Super visa offers, 103 to 148) was refused before anything started.
// No server, no model call; used by web/src/pages/workspace/finder.tsx and tests/check_finder_long_page_key.ts.

/** The longest key a find launch may carry (contracts/form-library.ts FinderLaunchBody). */
export const FIND_KEY_MAX = 120;

/** SHA-256 of the text, as 64 hex characters (Web Crypto: browsers on https or localhost, and Node). */
async function sha256Hex(text: string): Promise<string> {
  const d = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** `s5-<dialog key>-<mode>-<first 32 hex of SHA-256 of the page address>`: the same dialog, mode and address give the
 *  same key (one run however often Start is pressed); another address or mode gives another key. 32 hex characters
 *  (128 bits) keep it at most 3 + 36 + 1 + 6 + 1 + 32 = 79 characters with a UUID dialog key. */
export async function findRunKey(dialogKey: string, mode: string, pageUrl: string | undefined): Promise<string> {
  return `s5-${dialogKey}-${mode}-${(await sha256Hex(pageUrl ?? "")).slice(0, 32)}`;
}

type Refusal = { message?: string; status?: number; problem?: { errors?: { field: string; message: string }[] } };
/** Fields a person sets in this dialog, whose refusals are written in our own words (contracts/form-library.ts). */
const PERSON_FIELD = /^(mode|stage|pageUrl|planSha256|only(\.\d+)?)$/;
/** A validator's own message (zod's defaults), never shown to a person. */
const RAW = /^(Too (big|small)|Invalid|Expected|Required|Unrecognized|String must|Number must|Array must)\b|expected .* to have|received (undefined|null|string|number|object)/i;

export const FIND_WORDS = {
  refused: "This find could not start. Close this window, open it again and press Start; nothing was started and nothing was spent.",
  // Break M2: with no answer (or a server error) the dialog cannot know whether the find started, so it never says it did
  // not; pressing Start again is safe, because the same key answers the same run (findRunKey).
  unreachable: "The studio did not answer. Check your connection and press Start again: if this find had already started, you get that same find, never a second one.",
  server: "Something went wrong on the studio's side. Press Start again in a minute: if this find had already started, you get that same find, never a second one.",
};

/** What the dialog says when a plan or a Start is refused: the server's own words for what a person chose (the page,
 *  the mode, the plan), the server's words for any other refusal it wrote (409 and the like), and fixed words that say
 *  what to do instead of a validator's message, a server error or a network error. */
export function findErrorWords(e: unknown): string {
  const r = (e ?? {}) as Refusal;
  // fetch's own failure (no answer at all) is a TypeError; any other error without a status is ours, not the network's.
  if (typeof r.status !== "number") return e instanceof TypeError && /fetch|network|load failed/i.test(r.message ?? "") ? FIND_WORDS.unreachable : FIND_WORDS.refused;
  if (r.status >= 500) return FIND_WORDS.server;
  // Every refused field must be one a person set, in our words; a key, override or unknown field's refusal → fixed words.
  // When all are ours, the answer's detail is shown: it holds those words and, for a page, what to paste instead.
  const errs = r.problem?.errors ?? [];
  if (errs.some((x) => !PERSON_FIELD.test(x.field) || RAW.test(x.message))) return FIND_WORDS.refused;
  const m = (r.message ?? "").trim();
  // "404 Not Found" is what web/src/lib/api.ts says when the answer had no words of its own.
  return m && !RAW.test(m) && !/^\d{3}\b/.test(m) ? m : FIND_WORDS.refused;
}
