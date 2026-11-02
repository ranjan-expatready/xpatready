// G1 (C5.4, P-240; concept screens/G1-source-register/concept.md v2 §5, §6): the source register's request and answer
// shapes. GET /combinations/:id/sources lists every number the draft publishes with its state; PUT
// /combinations/:id/sources/:kind/:key writes one number's answer: the official source, or "None published – set by
// ExpatReady" with its reason. A Sample answer is never written here: only the sample load writes one (the demo seed),
// and it passes only in the demo workspace as a Demo release (tech lead, #558; reviewer MJ-1 on #569). The shape only:
// which number exists and whether its value moved are the engine's (engine/source-register.ts), checked by the API.
import { z } from "zod";

/** §5 field errors, word for word. */
export const SOURCE_WORDS = {
  url: "Use an https address.",
  quote: "Copy the words that state the number (up to 300 characters).",
  date: "The date read cannot be in the future.",
  dateShape: "Give the date read as a date (YYYY-MM-DD).",
  page: "Keep the page note to 200 characters.",
  reason: "Say why ExpatReady set this number (at least 10 characters).",
  reasonLong: "Keep the reason to 500 characters.",
  reasonWords: "Write the reason in words.",
  dateOld: "The date read cannot be before 1990.",
  oneAnswer: "Choose one answer: the official source, or 'None published – set by ExpatReady'.",
  address: "Name the number (its address).",
  value: "Say which number this source is for.",
  version: "Reload the page: the version you read is not a number.",
} as const;

/** The latest calendar day anywhere now (UTC+14), so an author east of UTC may give their own today (break m5 on PR 2b);
 *  a later date is in the future everywhere. */
const today = () => new Date(Date.now() + 14 * 3600_000).toISOString().slice(0, 10);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const realDate = (x: string) => ISO.test(x) && !Number.isNaN(Date.parse(`${x}T00:00:00Z`)) && new Date(`${x}T00:00:00Z`).toISOString().slice(0, 10) === x;

/** The official source: an https address, the words that state the number (≤ 300), the date read (today or earlier),
 *  an optional page note (≤ 200). */
export const Cited = z.object({
  // Break m4/m5 on #587: a real https address (it parses, its host has a name before and after a dot, no quotes or
  // angle brackets), at most 2,000 characters.
  url: z.string({ error: SOURCE_WORDS.url }).trim().refine((x) => x.length <= 2000 && /^https:\/\/[^\s"'<>]+$/.test(x) && (() => { try { const u = new URL(x); return u.protocol === "https:" && !u.username && !u.password && /^[^.]+(\.[^.]+)+$/.test(u.hostname) && !/^[\d.]+$/.test(u.hostname); } catch { return false; } })(), SOURCE_WORDS.url), // review r2-4 on #587: no user name, password or IP host (PR 2b shows it as a link)
  page: z.string({ error: SOURCE_WORDS.page }).trim().max(200, SOURCE_WORDS.page).nullish(),
  quote: z.string({ error: SOURCE_WORDS.quote }).trim().min(1, SOURCE_WORDS.quote).refine((x) => [...x].length <= 300 && /[\p{L}\p{N}]/u.test(x), SOURCE_WORDS.quote), // break m2: words, not only invisible marks
  date: z.string({ error: SOURCE_WORDS.dateShape }).trim().refine(realDate, SOURCE_WORDS.dateShape).refine((x) => !realDate(x) || x <= today(), SOURCE_WORDS.date).refine((x) => !realDate(x) || x >= "1990-01-01", SOURCE_WORDS.dateOld), // break m3: never year 1
});
/** "None published – set by ExpatReady" with why (Decision 3: at least 10 characters). */
// Break m1/m2/m5 on #587: ten characters as a person counts them (not UTF-16 units, as the database counts), at least
// one letter or digit (not only invisible marks), at most 500 characters.
export const NonePublished = z.object({ reason: z.string({ error: SOURCE_WORDS.reason }).trim().refine((x) => [...x].length >= 10, SOURCE_WORDS.reason).refine((x) => [...x].length < 10 || /[\p{L}\p{N}]/u.test(x), SOURCE_WORDS.reasonWords).refine((x) => [...x].length <= 500, SOURCE_WORDS.reasonLong) });

/** PUT /combinations/:id/sources/:kind/:key. `version`: the entry's version as read (0 when it has none yet). */
export const SourceEntryBody = z.object({
  address: z.string({ error: SOURCE_WORDS.address }).trim().min(1, SOURCE_WORDS.address),
  value: z.union([z.string(), z.number()], { error: SOURCE_WORDS.value }),
  cited: Cited.optional(),
  none_published: NonePublished.optional(),
  version: z.number({ error: SOURCE_WORDS.version }).int().min(0, SOURCE_WORDS.version),
}, { error: "Send the source as { address, value, cited | none_published, version }." }).superRefine((b, ctx) => {
  if (!!b.cited === !!b.none_published) ctx.addIssue({ code: "custom", path: ["answer"], message: SOURCE_WORDS.oneAnswer });
});
export type SourceEntryBody = z.infer<typeof SourceEntryBody>;

export const NUMBER_KINDS = ["rule", "check", "threshold", "fee"] as const;
export const NUMBER_STATES = ["missing", "cited", "none_published", "sample", "changed", "fee_table", "validity_cite"] as const;
export type NumberStateName = (typeof NUMBER_STATES)[number];

/** One stored answer as the screens read it. `from_sample_load`: last saved by the sample loader (review MJ-1 on PR 2b: a person's save makes it theirs) (chip "From the sample
 *  load"), never shown as a person's sourcing. */
export type SourceEntryView = {
  value: string; cited: { url: string; page: string | null; quote: string; date: string } | null; none_published: { reason: string } | null; sample: boolean;
  version: number; created_by: string; updated_by: string; updated_by_name: string; updated_at: string; from_sample_load: boolean;
};
/** One published number (§6). `passes`: it does not hold the release back in this workspace. */
export type SourceNumberView = {
  kind: (typeof NUMBER_KINDS)[number]; key: string; address: string; value: string; item: string; item_words: string; words: string; where: string;
  state: NumberStateName; passes: boolean; entry: SourceEntryView | null;
  /** G1 PR 2b: the item's own source quote, which the Source panel offers as the words that state the number. Absent on a
   *  PUT's answer. */
  item_quote?: string | null;
  /** A fee number only: its fee-table line's quote kind ("IRCC's words", …), for the count line's tooltip (§4). */
  quote_kind?: string | null;
};
/** GET /combinations/:id/sources. `unused`: entries whose number is gone ("No longer used"); `held_back`: the numbers
 *  that refuse Submit, Approve and release now. */
export type SourcesView = {
  combination: { id: string; key: string; label: string }; demo_workspace: boolean;
  numbers: SourceNumberView[]; unused: { kind: string; key: string; address: string; value: string }[];
  counts: Record<NumberStateName, number> & { total: number; held_back: number };
};
