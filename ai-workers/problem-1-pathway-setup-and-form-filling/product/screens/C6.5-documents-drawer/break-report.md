# Break report: C6.5 part 2b, the "Fill this from documents" drawer (PR #1374, `c5415ebff`)

Breaker, 8 Nov. Scope: `git diff origin/claude/affectionate-darwin-hhhzii...c5415ebff` (the drawer, the `questionnaire.tsx` hook, `needsLook` and `checked` on Confirm & use) against `concept-draft.md` BR-1 to BR-14. "Not built" items (per-value Reject, `keep: other`, the region beside a value, letters live, the counts) are not findings. Own copy `br_c65d` on :4435 (visitor-visa fixture plus `setup_vv_m3`), now stopped. Before the attack, the screen pack `C6.5-screen.test.ts` passed 21/21 on this copy. US$0: no live read and no `*_LIVE`. Scripts and screenshots are in the breaker's scratchpad (`br/*.mts`, `shots/`).

**Result: no Blocker, 2 Major, 8 Minor.** The server rule held against every attack on it.

## Findings

**M1 (Major). A stale Confirm & use against a file the client replaced: the screen says nothing and quietly shows a different document.**
- Steps: officer opens the drawer for Client A's passport and ticks the names. Client A (`user-P`) uploads a new passport file to the same checklist line (201; given name "CLIENT AX"). Officer clicks Confirm & use.
- What happened: the server answered 409 `not_current` and wrote nothing (correct). The drawer reloaded. The old block, with its `error` state and the officer's ticks, was unmounted. The new file's block took its place with no alert and no toast (`[role=alert]` = [], toasts = []). The server's words ("A newer file of this document was uploaded…") never reach the officer, who now sees a different file's values with nothing to say why.
- Where: `documents-drawer.tsx:169-173`: `setError` lives in the `DocumentBlock` that `refresh()` removes, so the message goes with it. The `key` at line 97 is the review id. BR-9 and BR-10 require the server's 409 words to be shown before the reload.
- Fail test: C6.5-28b. With the drawer open, upload a replacement as `CLIENT`, click Confirm & use. Expect the drawer text to match `/newer file/` and `document_review.confirmed_by` for the old document to be null.

**M2 (Major). BR-12 is mostly missing: "Mark checked against the document" never appears in 2 of the 3 places the concept names, and the pack does not test it.**
- Steps, case 1: in the Personal details drawer, answer "City or town of birth" under "Not on these documents" and Save. The row disappears (the list filters on `!q.answer`, `documents-drawer.tsx:328`). No `[data-mark-checked]` appears anywhere.
- Steps, case 2: Confirm & use with a differing family name, then resolve the check with "Keep the current answer" and a reason. Still no `[data-mark-checked]` for `person.family_name`. The row now reads "Family name …: SAMPLED · Check opened".
- What happened: the button is only wired on "could not read" and "left for you" rows (`documents-drawer.tsx:195, 201`, rendered at 279). BR-12 also lists "place of birth once typed" and "an answer kept by a resolved check". The concept's test list includes "mark checked → `checked_against` / refused 409 `open_checks`", but `C6.5-screen.test.ts` has no such step.
- Fail test: C6.5-30b. Type place of birth in the drawer, then expect `[data-mark-checked="person.place_of_birth_city"]`. Resolve keeping the answer, then expect `[data-mark-checked="person.family_name"]`. Click it and expect `checked_against` on the answer.

**m1 (Minor). After a check is resolved, its row still says "Check opened" and shows the document's value.** After resolving and keeping SAMPLEDE, the row reads "Family name …: SAMPLED · Check opened" (`documents-drawer.tsx:218-219`, `STATE_WORDS` line 38, read_value state `conflict`). This breaks BR-9's per-row truth. Test: after resolve, expect the row not to match `/Check opened/`.

**m2 (Minor). A 409 `already_confirmed` is never shown.** `user-R` confirms the same document first, then the officer clicks. The footer switches to "Confirmed and used by Representative on … IST", but the officer's own refusal (line 171) sits in the branch that is no longer rendered (`documents-drawer.tsx:224-227`). Nothing tells the officer the click did nothing. BR-9 says the drawer shows the 409. Test: expect a `[role=alert]` or toast matching `/Already confirmed/`.

**m3 (Minor). Focus is lost after each action.**
- Confirm & use: focus goes to the dialog body (`DIV "Documents and their values"`).
- A 422 `not_checked`: focus goes to the dialog header, because the button becomes disabled.
- Saving "Correct it" and Save in the resolve form: focus goes to the dialog body.

Lines: `documents-drawer.tsx:228, 264, 304`. A keyboard user has to Tab from the top again. Test: after each action, `document.activeElement` is inside the same block (the confirmed line, the alert, or the row).

**m4 (Minor). Pressing Escape inside "Correct it" or "Answer it" closes the whole drawer and drops the half-typed value without a word.** Typed "HALF TYPED", pressed Escape: drawer count 0 (`Panel`, line 89). Test: Escape in an open in-place form closes only the form, or keeps the draft.

**m5 (Minor). Every tick and every "Correct it" has the same accessible name.** Each checkbox is "Matches the document" (`documents-drawer.tsx:207-208`), and no name says which value it is for. A screen reader user hears 2 to 6 identical checkboxes. Test: each `[data-tick]` has an accessible name that contains its row label.

**m6 (Minor). Plain words: the resolve form and the 422 use a different, lower-case label.** The form reads "given names: the answer is CLIENT AA…" and "family name: …" (`documents-drawer.tsx:313`, `check.label` from `labelOf`, `case-documents.ts:148`). The row above says "Given name(s) as shown on passport or travel document". Test: the resolve heading starts with `questionOf(fact).label`.

**m7 (Minor). A long unbroken name overflows the drawer at 400 px and at 200 % zoom (512 px).** Principal name of 120 characters, the API maximum, in one word. The dialog's `scrollWidth` is 695 against `clientWidth` 399 and 511, and the header description is cut off (`documents-drawer.tsx:89`, description; screenshot `shots/s5-long-400.png`). A 200-character file name wraps correctly. Test: C6.5-35 with this person keeps `scrollWidth <= clientWidth + 1`.

**m8 (Minor). Opening the file drops the server's protections.**
- The file route sends `CSP: default-src 'none'; sandbox` and `nosniff`. "Open" re-serves the bytes from a same-origin `blob:` URL (`blob:http://127.0.0.1:4435/…`), so neither header applies.
- The tab keeps `window.opener` (true).
- The object URL is never revoked (`documents-drawer.tsx:133-138`).
- Risk is low today: uploads are limited to PDF, JPEG and PNG by magic bytes.
- Test: the popup has `opener === null`, and the URL is revoked after load.

Also noted, not ranked: the header's "Check digits: one failed / passed" is worked out in the browser from a regex on the reason text (`documents-drawer.tsx:163, 181`), against STANDARDS §7. The `closed[]` checks of a replaced file appear only as a count in the toast, without their reason (line 167; BR-9).

## What held (attempted, expected = actual)
- **`checked` shape:**
  - a string, `null`, objects, `"nope"`: all 400 "checked lists read value ids.";
  - 201 ids, or 201 copies of one good id: 400 "<=200 items";
  - omitted or `[]`: 422 `not_checked`, naming "family name, given names" with `missing[]`;
  - upper-case plus duplicate good ids: 200.
- **Foreign ids:** a spouse's value id, a random UUID, and P's ids on the spouse's document all gave 422 `not_this_document`. `confirmed_by` stayed null each time (the lock was rolled back).
- **Actors on Confirm & use:**
  - `user-P` and `user-Q`: 403;
  - `user-A`: 403 (configuration only);
  - `user-S`: 404;
  - unknown or none: 401.
- **Actors on the file route:**
  - `user-O` and `user-R`: 200 with `application/pdf` and the sandbox CSP;
  - `user-P`, `user-Q`, `user-A`: 403;
  - `user-S`: 404;
  - none: 401.

  The client's questionnaire has no button (pack C6.5-24).
- **Race, 10 runs:** Confirm & use (ticks sent) against an officer PUT that makes the ticked given name differ. Every run ended in one of two states: a check opened with the typed answer kept (DECLARED "OTHER NAME"), or one side got 409 and nothing was overwritten.
- **Stale drawer, answer changed to agree in another tab:** 422 shown in the server's words, the new tick appeared, Confirm & use held until ticked.
- **Tick, then correct to a different value:** the tick row moved to "Differs…", the count of ticks left updated, Confirm & use opened a check, and the resolve form opened with "Keep the current answer" chosen (BR-11).
- **Double clicks:** Confirm & use, "Correct it" Save and resolve Save each sent exactly one request.
- **Resolve:** with no reason or a whitespace-only reason, the server's "Give a reason for keeping this value." shows on the field and the check stays open. After the answer changed elsewhere: 409 "The answer changed after you opened this check…", the form reloaded with the new value, and the check stayed open.
- **Keyboard and layout:** with keyboard only, Tab reaches Open, Answer it, the tick, Correct it, the disclosure and Confirm & use in BR-7 order. Space ticks and Enter confirms. Escape returns focus to the opener (pack).
- **Accessibility:** axe is clean on the post-confirm state with the resolve form and an in-place form open.
- **The Agent view at 400 px:** the header wraps with no page scroll.
- **Plain words:** no fact keys, codes or underscores in the drawer text.
- **A letter uploaded for Client A beside the passport:** one passport block and no stray cost card.
- **A replaced file's check:** still shown and resolvable in the drawer (1 badge, 1 form).
- **Page errors:** none.
