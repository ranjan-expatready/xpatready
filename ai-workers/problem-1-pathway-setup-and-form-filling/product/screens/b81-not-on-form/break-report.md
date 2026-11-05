# B81 — break report, commit 6e14568fd (PR #1057), 5 Nov 2026

**Result: 0 Blockers, 5 Majors, 10 Minors.** One copy on port 4414, stopped and its database dropped. Live AI off, US$0, no priced button. The load passed 16 at 10:56 IST, so I waited 10 minutes. Every Major was seen at least twice, at 1-minute load under about 17 and in the browser under 14; a Minor seen once says so or is a plain refusal read from the route. Paths are under `prototype/studio/`.

**Test setup:** the fixture's marital list and link, as in `tests/check_forms_b81_routes.ts`. IMM 5645 is not in the fixture, so two printed Married choices and groups of 50, 199 and 201 are SQL rows on IMM 5476 that read a `code_list` transform. List edits and a list set to RETIRED are also SQL, because no route edits a list (P-158). Each finding says when it rests on such a row. To walk a release to approval, `wp.family` was made a Demo release (`source_basis`, SQL) so the answer-key gate only warns.

## Majors

**M1. Two saves at once both succeed, and one is lost (BR-5).**
Steps: read a group's `revision`; send 4 `PATCH …/option-maps/group` at once with that revision, two that mark the value and two that do not.
Expected: one 200, the rest 409. Actual: 7 of 8 rounds gave two or more 200s (for example `200 200 200 200`, with 4 audit lines). The last writer wins, and each person is told "saved". `api/src/forms.ts:358-362` compares and writes in a read-committed transaction, so both pass the check. The one round on published rows gave one 200 and three 409s, through the unique version. The window is about 100 ms, wider under load.

**M2. The one-field route takes no revision, so it overwrites a stale save silently (BR-5, STANDARDS §4).**
Steps: person 1 marks a value through the group route; person 2, on an older read, sends `PATCH …/option-maps` with that field's path and `notOnForm: []`.
Expected: 409. Actual: 200. The mark is gone from that field and the group splits (5 fields became 2 + 1 + 2). Seen twice. `contracts/forms.ts:94` has no `baseRevision`; `api/src/forms.ts:329-337`. The dialog does not call this route; the concept's contract lists it.

**M3. A release problem from a list change cannot be seen or fixed where its link lands.**
Steps: mark a value and save; remove that value from the list (SQL; relinking another list gives the same state); on Review and release click the problem's link.
Expected: the step names the problem and lets the author clear it. Actual: Submit lists `it marks "sample_no_choice" not on this form, which the answer list does not have` (6 errors). The link opens the dialog with a red "Blocks release", no words about it, every row looking fine and **Save greyed**. The section on the panel says only "5 form fields read an answer list." Seen on two browser walks and through the API. `web/src/components/form-choices.tsx:68` (`dirty` ignores `g.problems`), `:84`. By reading, only changing some answer, saving and changing it back clears it; the same holds for "it maps … which the answer list does not have" and "neither mapped nor marked unused".

**M4. A mark on a value the form now prints still passes Submit (BR-2, BR-3).**
Steps: mark `sample_no_choice` on IMM 5707; `POST library/fields/person.marital_status/answer-list` with a list holding the same key labelled "Conjugal" (the 9-choice group prints Conjugal, code 9).
Expected: Submit blocks; BR-2 says a value is marked only if the form prints nothing that could be it. Actual: `problems: []`, and only the warning `"Conjugal" is marked not on this form on 5 form fields`, while the view itself returns `printed: ["Conjugal"], not_on_form: true`. Repeated by route and by SQL relabel. By the fill's own rule (`engine/form-values.ts:44`) such a case would be refused an answer the form prints; I did not run that fill. `engine/channels.ts:138` and `:143-145` never read the printed choices.

**M5. A code already saved on a two-Married field: the screen says it blocks and the expert decides, yet nothing blocks, and nothing can be saved.**
Steps (SQL row, a map as an earlier first-word draft would have left it): save `married → 5` on a form field printing "Married-physically present" and "Married-not physically present"; open the view; change any answer and save; run a new rules draft.
Expected: the pick is surfaced as a problem and can be cleared. Actual, twice: `asks_more: true`, `code: "5"`, `problems: []`. The row has no Select, so the code stays in `picked` (`form-choices.tsx:63,94`) and any save of that group gets 400 for Married. The redraft keeps the 5 (`engine/options.ts:27`). By reading, a fill writes code 5, because only the view and the save read `asksMore`: the silent pick the concept's finding 3 rules out. Applies only where such a map exists: `api/src/demo.ts:793` runs the draft, but I did not read the demo database (one copy only).

## Minors

1. **An unsaved pick vanishes without a word.** Change a row in group B; another person saves group B; save group A. B reloads, my pick is gone and no notice or question appears (Escape asks nothing). Three times. `form-choices.tsx:63-65`.
2. **"Look again" leaves "Not saved … changed these choices" on screen** after it has reloaded them. Once. `form-choices.tsx:67,88`.
3. **The 409 names who and when, not the change** (BR-5 "the change named"): no value is named. It also says "Configuration author changed these choices … (at 10:52 IST)" on any wrong `baseRevision` when nobody has saved, giving the fixture's load time (API only). `api/src/forms.ts:360`.
4. **Near-printed values can be marked (BR-2).** Each gave 200: "Separated" and "Married spouse" against "Legally separated" and the two Married choices (SQL row); "Widow" against "Widowed"; "Legal separation" against "Separated". The first-word clause of BR-2 is not what `engine/options.ts:92-96` does (the review's Minor 1, still open). No list on the fixture holds such a value.
5. **Duplicate marks are stored and miscounted.** `notOnForm: [x, x, x]` on 3 form fields gives 200, and Submit says "on 9 form fields". API only. `contracts/forms.ts:96`, `engine/channels.ts:143-145`.
6. **Prototype words as list keys** (no real list holds them). A value keyed `constructor` or `__proto__` with no code is refused a mark with "cannot have a code" (`api/src/forms.ts:319`), and no "no code" problem appears, so Submit would not block it (`engine/options.ts:56`, `in`; read from the view's problems). `map: {"__proto__": "1"}` returns 200 with the key silently dropped, while `constructor` and `toString` get a 400.
7. **A retired list:** the view shows nothing, but a one-field save still returns 200 and writes (`api/src/forms.ts:303` takes the newest row of any status). No screen path.
8. **A group over 200 cannot be saved:** the view shows 201, Save answers "Too big: expected array to have <=200 items" (SQL rows; the largest real group I know of is 13). `contracts/forms.ts:96`.
9. **Closing the dialog drops focus on the page's body**, not "Set choices": Escape, the X and footer Close, read at 100, 600 and 1500 ms, also after opening by keyboard. WCAG 2.4.3.
10. **Words and very long text.** With a value gone from the list, the warning quotes the raw key (`"sample_no_choice" is marked…`) and promises a refusal for a value that no longer exists (`engine/channels.ts:145`). A 300-letter label with no spaces makes the dialog scroll sideways at every width (table 2441 px), squeezes that group's Selects to a bare arrow and pushes the other rows' answers out of view; a 120-letter list name runs past the group's edge. A long label with spaces holds.

## What held
* **Printed and near values:** all 8 printed values, by case and spacing ("MARRIED", "  single  "), and "Common-law partner", "Annulled" refused with the form's words. Two printed Married choices: mark and pick each 400 with "the immigration expert decides"; other values still save; a redraft leaves `married` unmatched (SQL row).
* **Codes and input:** out of range, spaced and empty codes; two values on one code; non-strings in every position; empty, array and missing bodies; 200,000-character and HTML keys (refused, not run in a page). Prototype keys as marks, and `constructor`, `toString` as map keys, all 400.
* **Paths:** 201 refused in words; 200 duplicates and spaced paths reduced to the real ones; an unknown path, another edition's, an unmapped one and one with no list refused; fields with other printed choices 409 "save them apart". A refused save writes nothing.
* **Actors:** user-B, user-C, user-O get 403 on both PATCH routes, on the draft and on Submit; an unknown or missing actor 401, also on GET. The author cannot approve. Stale save through the dialog: 409 and a Notice in words.
* **Editions:** an ONLINE edition gets 404 in words on GET and both PATCH routes (SQL). A form field with no list: 409 in words. Unlinking a list in use: the section goes, no error. An unknown edition: 404 in words.
* **Release, walked to approval:** a mark on a published row makes a new draft version (published 42, draft 1); release 1's fingerprint and snapshot do not move; a release-mode fill still writes the code while a draft-mode fill refuses. Submit lists no option-map error and one warning per form and value. Release 2 holds the mark, and a release-mode fill then refuses in BR-4's words, with its own count. A later save makes version 3 and release 2 stays. A save after Submit that leaves a problem: approve refused (409).
* **Lists and redraft:** a new value blocks in words. A redraft keeps marks. A value gone from the list blocks.
* **Scale:** 50 and 199 published rows saved in 336 ms and 1470 ms, inside one transaction; view 27 and 61 ms.
* **Dialog:** guard asks after a real change on footer Close and Escape, and not after a save or a change undone. Double-click Save sends one request. A reload saves nothing and leaves no address behind, though it asks no question.
* **Keyboard (Chrome headless, macOS):** to Set choices, Enter, focus in the first Select, Tab stays inside the dialog, type-ahead changes a Select, Tab to Save, Enter saves.
* **Widths:** 1024 px and 200 % of 1440 and 1024 (720 and 512 px wide): no sideways scroll, footer visible, Save reachable. No page errors. Of the non-English text I saw only the list name draw (French and Chinese); the Chinese and Arabic row labels sat in the group the 300-letter label pushed aside, so they are not confirmed by eye.

## Not run
100 programs / 400 combinations: no suites on this Mac, and the fixture is what the budget in STANDARDS §9 names. Uploads and a PDF with planted instructions: this step takes no file (P-26). A real screen reader. Two-Married on the real IMM 5645 box. Save on the screen as another actor: the panel does not open for them (`tests/check_forms_b81_browser.cjs`), and the routes refuse.
