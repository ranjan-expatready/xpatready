# F2 C3.12 "Field map in the Forms list": independent CHECK, 1 Nov 2026

Reviewer: I did not build this. I checked it against C3.12, P-123, P-32, PRODUCT §3–§4, STANDARDS, EXPERIENCE and QUALITY D1–D20.

## Round 2: commit 3a77f6d1 (current verdict)

**Verdict: Approve** (Ship). There is no open Blocker or Major. Two Minors remain; they are recommended, not required.

### How I tested
* **Change reviewed.** `git diff b6d8b50b 3a77f6d1`: 4 code and test files, plus round 1's two review files added by the builder.
* **Copies.** `rev_c312` on :4456 and `rev_s4l` on :4457, fresh databases, US$0, no `*_LIVE`. I ran nothing in `/home/user/wl`. Both copies are now stopped, their databases dropped and their var folders removed.
* **Suites.**
  * `check_forms_c312_field_map.ts`: 26/26, on 3 runs in a row, each on a fresh copy.
    * Before those, 2 runs stopped early in the test's unchanged setup code: once at line 74 (the attachments response was not a list), once on "fetch failed: other side closed". The server log showed nothing.
    * I could not reproduce either. I read them as the shared machine, not the diff, but I note them.
  * `check_forms_s4_library_browser.cjs`: 101/101. As in round 1, I ran a copy whose screenshot folder points to `/tmp`.
* **My walk.** At 1440, 1024 and 200 % zoom: keyboard, axe, the drawer, and following the new tip to the combination's Forms tab.
* **Break-it.** I set one IMM 5475 carried row back to DRAFT in the database:
  * The list tip then said "1 form field waits for a decision on To review. 2 form fields come from an earlier release…".
  * To review, as user-B, listed "IMM 5475 (05-2021) · Decide 1 form field".
  * The two places now agree.

### Round 1 issues: closed
* **M1, closed.**
  * `fieldMapState` (`contracts/form-library.ts:90-95`) counts draft-unresolved rows (on To review) apart from carried published rows (decided when the edition is drafted again, as in `job.tsx`).
  * All 6 carried sample forms now give the earlier-release wording, with no "To review".
  * Three rule tests cover carried only, To review only, and a mix. Removing the split fails "carried … not on To review".
  * The browser check asserts there is no "on To review" in the IMM 1295 drawer.
* **m1, closed.** Below xl the short line has the same Tip and takes focus (`library-forms.tsx:153`). At 1024, Tab from "IMM 1295" lands on it and the tip shows. At xl it is `display:none`, so not focusable. axe found 0 issues at 1024 and 1440 and in the drawer. No sideways scroll at 1024 or 200 %.
* **m2, closed.** The browser check's SQL now takes the draft row first and drops RETIRED rows (`check_forms_s4_library_browser.cjs:58`), which matches `effective`.

### Open (Minor, Should; neither blocks)
* **n1. The tip names a button that is not offered for these forms.**
  * The carried tip ends "(Draft with AI on the combination's Forms tab)".
  * On With an LMIA's Forms tab, IMM 1295 and the other carried forms show "In the library · Read today", with no Draft with AI button. The code hides it once a form is in the library: `workspace/forms.tsx:143-146`, "only the next step, which would be AI, goes".
  * The only real ways to draft again are "Redo with AI (find, read, match)" in that row's ⋯ menu (`forms.tsx:192`), or "Re-read with AI" in this list's ⋯ menu (`library-forms.tsx:322`).
  * The main instruction ("decide them when this edition is drafted again") is right and points to no empty place, so I rate this Minor. Fix: name the real control, for example "(Re-read with AI in this row's ⋯ menu)".
* **n2. The opening sentence reads as if every field is decided.**
  * The "undecided" tip opens "Each form field is mapped, marked not a fact or filled by hand." It reads as a fact, just before saying 16 are not decided.
  * Fix: "Each form field needs a decision: mapped, not a fact, or filled by hand."

**Observation, not a finding:** the IMM 5257 cell says "AI draft · 84 to review" for its current edition. The Super visa item on To review says "Review 168 AI proposals", because it covers both IMM 5257 editions. Both are right for their scope.

**Not from this diff, for the record:** "Re-read with AI (fields and boxes)" (`library-forms.tsx:322`) clashes with C3.10 / P-63. The builder will list it in the PR.

### D1–D20 (round 2; only the changed dimensions)

| Dimension | Round 1 → 2 | Evidence |
|---|---|---|
| D4 Rule integrity | 4 → 5 | The tip follows the row status, as To review does |
| D9 Flow of information | 3 → 4 | The tip no longer points to an empty To review. n1 names the wrong control |
| D10 Language and guidance | 4 → 4 | The short line now has a tip. n2's wording remains |
| D13 Accessibility and responsive | 4 → 5 | The short line is focusable with its tip. axe 0, no sideways scroll |
| D16 Testability | 4 → 5 | The tip's words are tested in 3 cases, plus the browser drawer check |
| D19 End-to-end closure | 3 → 4 | List and To review agree (break-it). n1 still names the wrong control |

* **Unchanged from round 1.** D1 4 · D2 5 · D3 5 · D5 5 · D6 4 · D7 5 · D8 5 · D11 4 · D12 4 · D14 4 · D15 5 · D18 4.
* **D17 and D20** are simulated only.
* **Retrofit:** unchanged (the `field_map` field on the existing list row).

### Journey score (round 2): **8.5/10, no criterion at 0 (pass)**

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every form's state is readable in the list, the short line and the drawer |
| Next step obvious | ½ | Right place for each kind; the carried tip names a control that is not shown (n1) |
| Plain words | ½ | Plain terms; n2's opening sentence misleads |
| Feedback and state | 1 | Seven states, shape plus text |
| Correct data | 1 | Counts exact. The draft vs carried split matches To review (break-it) |
| Error recovery | 1 | Reload and switching person keep the values |
| Accessibility and screen sizes | 1 | Focusable tips at every width, axe 0, no sideways scroll at 1024 or 200 % |
| Speed | 1 | Two queries for the whole list. The list was warm in round 1 (360 ms) |
| Visual quality | 1 | Team Pill and Tip, aligned column |
| Trust and sources | 1 | AI proposals marked and kept apart from decisions |

**Fixes that would raise the score:** n1, then n2.

**Could not check:** a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); "Not mapped yet" on a real form (the sample has none; the unit test covers it); live AI (off).

## Round 1: commit b6d8b50b (record)

* **Verdict: Block.** One Major: M1, the "undecided" tip said every open form field "waits on To review". To review lists only DRAFT unresolved rows (`review-queue.ts:168,173`); all of the sample's open rows were carried (PUBLISHED).
* **Minors.** m1: no tip on the short line below xl. m2: the browser check's SQL was not the rule.
* **Suites.** c312 23/23, s4 browser 101/101.
* **Journey score.** 7.5/10. Report: `journey-test-reviewer-2026-11-01-c312-b6d8b50b.md`.

**Verdict: Approve** (commit 3a77f6d1). Optional Minors: n1, n2.
