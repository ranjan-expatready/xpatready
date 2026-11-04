// UX-A part 3 (P-273; UX baseline 2 Nov, finding 7): one word per combination state, on every card, chip, banner, filter
// and page. Before, one state read "In progress" (Programs chips, P-180 Q2), "In setup" (the page header, Structure) and
// "Setup draft" (Structure's Used by). P-180's chip words are the decided ones; "Not ready" (released, failing the
// startable check) stays its own word and folds into In progress on the Programs chips, as P-180 says. Pure.
export const STATE_WORDS = { NOT_STARTED: "Not started", IN_SETUP: "In progress", NOT_READY: "Not ready", READY: "Live", RETIRED: "Retired" } as const;
/** The catalogue status (engine/programs.ts statusOf) in words. */
export const STATUS_WORDS = { IN_SETUP: STATE_WORDS.IN_SETUP, NOT_READY: STATE_WORDS.NOT_READY, READY: STATE_WORDS.READY } as const;
/** Structure's "Used by" for a combination nothing uses yet (no release, no open case): never "Setup draft". */
export const USED_BY_NOTHING_YET = "Nothing yet: not released";
/** UX-A part 3 (review r2 M1): the shared draft bar's words. Combinations' changes are counted apart from the shared
 *  library's, so the number beside "across N combinations" is what those combinations' headers and Review tabs say.
 *  `total` is the draft's whole count (combinations' + library's). */
export function draftBarWords(total: number, combinations: number, library: number): string {
  const own = Math.max(0, total - library), s = (n: number) => (n === 1 ? "" : "s");
  if (!combinations) return `${library} change${s(library)} in the shared library, released with the next release`;
  return `${own} change${s(own)} across ${combinations} combination${s(combinations)}${library ? ` · ${library} in the shared library` : ""}`;
}
/** A Live combination's open setup items are for its next release: firms keep using the released one meanwhile. */
export const LIVE_NEXT = "for the next release";
/** QA-184 (P-273, EXPERIENCE "one clear state"): a Live combination says Live first, then what its next release still
 *  needs, in one count of the same five steps, with these words on the header strip, the Programs card and list, and
 *  GET /catalogue's progress. Null when nothing is open for the next release. */
export const nextReleaseWords = (open: number) => (open > 0 ? `Next release: ${open} of 5 step${open === 1 ? "" : "s"} to do` : null);
