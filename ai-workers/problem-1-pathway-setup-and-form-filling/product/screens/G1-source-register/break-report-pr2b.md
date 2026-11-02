# G1 (C5.4) PR 2b: break report on local commit b9743d5a (2 Nov 2026)

Scope: `git diff e1f9c2d0..b9743d5a`, the "Numbers without a source (n)" block and the Source panel (concept §4–§5,
build-notes "PR 2b"). PR 2c entry points and the concept's "Not built" line are out of scope.
- Copy: isolated `brk_g1b` on :4474 from a clean tree at b9743d5a, with a fresh `vite build`. Chromium
  `/opt/pw-browsers/chromium`. No AI, no `*_LIVE`, US$0. The copy is stopped and its database dropped.
- Data: the sample, With an LMIA (`wp.family`), R-01 "at least 18" → 19. For the twin tests R-01's `lt 18` also went to
  19, 21 and 22. Scripts are in the session scratchpad (`b1`–`b8.cjs`, `probe1`–`2.mjs`).
- While I worked, uncommitted edits appeared in this checkout (`api/src/source-register.ts`, `contracts/…`; review MJ-1
  on PR 2b). One of them touches M2. Nothing here was tested against those edits.

## Blockers
None found.

## Majors
**M1. Closing the panel always drops focus to `<body>`.**
- Repro A (keyboard only): Tab to "Add source: Passport years since expiry: at least 5", press Enter, then Escape.
  `activeElement` is BODY. Close and the X do the same.
- Repro B: answer all held numbers but one, then save the last one in the panel. The panel vanishes at once, because
  `<SourcePanel>` (`unsourced-numbers.tsx:60`) sits only in the held branch and `:31` returns the all-set line. Focus
  goes to BODY, and a toast is the only feedback.
- Expected: EXPERIENCE §2.12 [M], WCAG 2.4.3; the suite checks only that Escape closes (`…_browser.cjs:90`). Cause:
  `Panel` (`ui/controls.tsx:111`) has no `Dialog.Trigger`, so Radix's `onCloseAutoFocus` focuses a null `triggerRef`.
- Fix: keep a ref to the opener and focus it in `onCloseAutoFocus`, falling back to `#unsourced-h` or the all-set line.
  Render `SourcePanel` outside the `held.length` branch.

**M2. Answers the author wrote read "From the sample load" / "written by the sample load".**
- Repro: on R-01 choose Write a new source, cite 19 and save as the author. The card keeps the chip and reads "IMM 5488
  (10-2024) · checked Nov 2, 2026 · written by the sample load".
- So does the twin saved as None published (the sample load never writes one), and the context line ("10 more have a
  source 'From the sample load'") counts them.
- Cause: `from_sample_load = createdBy === SAMPLE` (`api/src/source-register.ts:47`), used at `source-panel.tsx:105`,
  `:183` and `unsourced-numbers.tsx:28`.
- Impact: the expert signs a release crediting a person's citation to the sample loader. Fix: decide on `updated_by`
  (the uncommitted edit does this; re-test it).

**M3. A conflict shows who and when, but never what "theirs" is.**
- Repro: open R-01 `lt`'s editor, and let another tab save None published "Theirs, first time". Save, and the notice
  appears. Another tab saves "Theirs, second time". Keep mine → 409 again → Keep mine, and theirs is replaced.
- Neither of their answers was ever shown: the card kept its pre-conflict state.
- Expected: STANDARDS §4 [M] "stale save → 409 with what changed". It also says "Someone else saved…" when it was the
  same author in another tab (`source-panel.tsx:91`, `:117`).
- Fix: on 409, fetch the item and render their `Answer` in the notice. Say "saved in another window" when it was you.

**M4. Typed sources are discarded without a question.**
- Repro: fill the address and the words, then press Escape (or the overlay, the X, Close, reload or Back). The panel
  closes, and on reopening the words are back to the item's quote.
- `Dialog` has a `guard` ("Discard your unsaved changes?", `ui/controls.tsx:77`); `Panel` has none. Expected:
  EXPERIENCE §2.8 [M]. Fix: give `Panel` the same guard and turn it on at `source-panel.tsx:45`.

## Minors
- **m1. Long unbroken content scrolls the panel sideways.** A 200-character page note and a 300-character quote
  without spaces give a body `scrollWidth` of 1696 px vs 559 px (1440) and 399 px (400). `Answer`
  (`source-panel.tsx:184`) lacks `[overflow-wrap:anywhere]`; add it to the link, the quote and the reason.
- **m2. A failed twin gets advice it cannot follow.** Tick "Use the same source for the other 21…" after the twin was
  saved elsewhere: the toasts say "…Reload theirs, or keep yours and save again." and "Source saved: Age years: at
  least 21", but the twin has neither control and its card shows no conflict (`:86-87`). Fix: show it on the card.
- **m3. Every 409 is titled "Saved by someone else".** That includes "the number is now 20, not 19" (`:92`, `:117`) and
  the retired and fee-table refusals. Fix: use the problem's `title`.
- **m4. Screen-reader names.** Three buttons share "Add source: Passport issue date: before 2019-06-07" (no item in
  the name, `unsourced-numbers.tsx:51`), and a non-author is offered "Add source" for a read-only panel. Fix: add the
  item to `aria-label`; say "View source" to a non-author.
- **m5. "Date read" uses the UTC day.** In `Pacific/Kiritimati` (local 3 Nov) it pre-fills 2 Nov and `max` refuses the
  local today; west of UTC in the evening it pre-fills tomorrow (`:31`, `:144`). Fix: use the local date.
- **m6. The page note's limit disagrees:** `maxLength={400}` (`:143`), but the label and the server say 200. Fix: 200.
- **m7. The link hides its host.** Its text is the page note when one exists (`:184`), so "IMM 5488 (10-2024)" can
  point at `https://evil.example/x` (accepted), and URLs with U+202E, U+200B or Cyrillic look-alikes are stored as
  typed. Fix: always show `new URL(url).hostname` beside the page note.
- **m8. The all-set wording is wrong.** "Every published number has its source (27)" appears while 16 are "None
  published – set by ExpatReady" (`unsourced-numbers.tsx:33`). Fix: "has its answer: n cited, m None published".
- **m9. The first open focuses the dialog container, not "Official source":** `openOnFirstField` runs while the item
  query is still loading. Fix: focus the first field when `q.data` arrives.

Outside PR 2b (PR 2a's server rules), noted only: French "au moins cinq ans", Arabic-Indic "٥" and full-width "５" are
refused as not stating 5; a quote "U+200B 5 U+200B" is accepted; number words show ISO dates while items say "7 June 2019".

## What held
- **Roles:** the approver and the expert get 403 "Only the configuration author adds sources."; no actor or an unknown
  actor gets 401. The read-only panel has no editor, Change or Still-correct.
- **URLs refused** with 400 on `cited.url`: `javascript:`, `JAVASCRIPT://`, credentialed, `user@host`, IP, `[::1]`,
  `#<script>`, 2,000+ characters.
- **Hostile text:** script and `<img onerror>` in the quote, the page note and the reason render as text (0 injected
  nodes, no dialogs). The link has `target=_blank rel="noreferrer noopener"`.
- **Saving:** a double-click on Save sends 1 PUT.
- **Conflicts:** a stale version → 409; a moved value → 409, then Reload theirs shows "written for 19; the number is
  now 20" and "Still correct for 20". The Keep-mine loop survives two rounds.
- **Counts:** the block heading equals the API's `held_back` after every save, the twin save and the moved number.
  After the last save, Submit is enabled.
- **Words:** no field codes on the block or the panel. The item words of all 21 items read as sentences.
- **Layout:** the page fits at 400, 720 (1440 at 200 %) and 512 px (1024 at 200 %), and the panel fills the width at
  400 px.
- **Accessibility:** axe on the twin editor finds 0 violations. Toasts stay announced while the panel is open.
- **Speed:** GET sources takes 93 ms and review 110 ms. The block and the URL list share one cached query.
- **Actor switching:** the identity is per tab (`lib/api.ts:7-10`), and the header is inert while the panel is open.
  The server checks every PUT, so switching mid-panel is not reachable.
- **Not on this screen:** uploads and PDFs, duplicates, hierarchy, and 100 programs (scale is the team's, P-26).
