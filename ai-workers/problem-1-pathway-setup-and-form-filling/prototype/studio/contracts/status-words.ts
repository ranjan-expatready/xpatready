// UX-A part 3 (P-273; UX baseline 2 Nov, finding 7): one word per combination state, on every card, chip, banner, filter
// and page. Before, one state read "In progress" (Programs chips, P-180 Q2), "In setup" (the page header, Structure) and
// "Setup draft" (Structure's Used by). P-180's chip words are the decided ones; "Not ready" (released, failing the
// startable check) stays its own word and folds into In progress on the Programs chips, as P-180 says. Pure.
export const STATE_WORDS = { NOT_STARTED: "Not started", IN_SETUP: "In progress", NOT_READY: "Not ready", READY: "Live", RETIRED: "Retired" } as const;
/** The catalogue status (engine/programs.ts statusOf) in words. */
export const STATUS_WORDS = { IN_SETUP: STATE_WORDS.IN_SETUP, NOT_READY: STATE_WORDS.NOT_READY, READY: STATE_WORDS.READY } as const;
/** Structure's "Used by" for a combination nothing uses yet (no release, no open case): never "Setup draft". */
export const USED_BY_NOTHING_YET = "Nothing yet: not released";
/** A Live combination's open setup items are for its next release: firms keep using the released one meanwhile. */
export const LIVE_NEXT = "for the next release";
