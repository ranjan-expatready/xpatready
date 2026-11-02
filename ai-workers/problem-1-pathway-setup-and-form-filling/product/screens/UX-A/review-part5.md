# UX-A part 5: review (always-on explanations become the greyed control's tooltip and description)

Reviewer agent (did not build). Exact commit **2eb854b9** (diff from 9cd221d9, part 4 approved), detached worktree, web build from that commit. Isolated copy `rev_uxa5` on :4446 (never :4400), demo Reset + Load as user-A; US$0, no AI call, nothing priced. Row UX-A (P-273), UX baseline finding 3. Bar: STANDARDS, EXPERIENCE, PRODUCT §3–§4, WCAG 2.2 AA, WAY-OF-WORKING "Every PR". Walk screenshots: `/tmp/claude-0/-home-user-xpatready/d1a19a26-d4f8-5a0b-9a61-250603ccb5cc/scratchpad/r5/walk/`. The breaker's `break-report-part5.md` was read only after my own probes, to remove duplicates; where we found the same thing, it is marked "(breaker mN)".

## Verdict: Block (one Major: the row's proof check fails without a product cause)

## What I ran
* `check_uxa5_tooltips_browser.cjs` (scratch copy: Linux psql path, absolute module paths, screenshots to scratch). Results: 24/24, 24/24, 24/24, **23/24**, 24/24, **23/24**, then 4 passes with an extra log line. **2 failures in 10 runs**, always on "the explanation is a tip reachable by keyboard" (Forms). The breaker saw 2 failures in 3 runs.
* `check_w1_structure_browser.cjs`: 141/141 on a fresh copy. It needs an empty database, so it fails if the sample is already loaded; that is not this PR's problem. `check_qa92_95_browser.cjs`: 23/23, including the rewritten QA-93 step, and the enabled Remove still asks first and offers Undo.
* `graph.mjs --check`: G1 0 · G2 0. It adds nothing new for these pages.
* My own Playwright walk, with Chromium's accessibility tree read through CDP: mouse, Tab, Enter/Space, touch at 400 px, 720 px (= 1440 px at 200 % zoom), and the reader role.

## What holds (claims checked)
* **Program structure.** No "Can't retire yet / Can't delete" line under any row at 1440, 1024 or 400 px. The 12 greyed actions are focusable, and the accessibility tree gives role button, name "Retire Temporary residence", disabled=true and the full reason as the description. The tip opens on hover and on Tab. Enter, Space and click open nothing (no impact panel, no dialog). Edit's details still show "Can't retire yet: …" as text, with Where used listing "Stops it (7)", also at 400 px. The 433-character tip stays inside the window at 1440 and at 720 px.
* **Questionnaires (LMIA).** 18 greyed Removes and 0 enabled ones on the principal applicant (every section asks something). aria-disabled is set, the tip opens on hover and on Tab, and Enter, Space and click (forced) open no dialog and do not toggle the section. It is not nested inside the section's expand button.
* **Forms (Visitor visa).** 2 rows read "Attached, not set up yet". The trigger is a focusable button whose description is the full explanation, and the tip opens on hover and on Tab.
* No sideways scroll at 1024 or 400 px on Questionnaires and Forms. axe (WCAG 2.2 A/AA) is clean on all three screens. No page or console errors.
* Is the reason less discoverable? On desktop, no. The greyed look, the not-allowed cursor, the tip on hover and focus, and the "Its details (Edit) list each use" pointer follow finding 3's recommended pattern (Linear/Stripe). Touch is weaker (m2).

## Issues
**M1 Major (Must): the row's acceptance check is flaky, and its waits swallow timeouts.** `tests/check_uxa5_tooltips_browser.cjs:34` (`tipOf`) focuses the previous tabbable element. On Forms that is the "Read and matched" header, which has its own tooltip. `tipOf` then reads `getByRole("tooltip").first()`, which can still be that closing tooltip. The result is about 1 failure in 5 runs here and 2 in 3 for the breaker, with no product cause, which turns merge-queue batches red. Two waits also end in `.catch(() => undefined)`: `tipOf` at :34 and the details wait at :51. WAY-OF-WORKING "Every PR" says a wait a test relies on must fail loudly. **Fix:**
1. Read the tooltip that belongs to the trigger: `p.getByRole("tooltip").filter({ hasText: <expected start> })`, or press Escape and wait for zero tooltips before the Tab.
2. Make both waits fail loudly.
3. Re-run the check 5 times and paste the counts in the PR.

**m1 Minor (Should): screen readers hear "7 question s are placed" (and "stay s asked" for one question).** In `questionnaires.tsx:524` the hidden description is built from separate JSX text pieces, and Chromium joins those with spaces when it reads a `hidden` element through aria-describedby. The tooltip at :520 reads correctly because it is a single template string. Fix: build one string once and use it for both the tip and the span. (breaker m1)

**m2 Minor (Should): on a phone, two of the three reasons cannot be reached, and the three screens act differently.** Touch, 400 px, tap:
* Forms "Attached, not set up yet" (`forms.tsx:162`): no tip, and the explanation is nowhere else on the page (`walk/t-f-tap-400.png`).
* A greyed Structure action (`components/lifecycle/index.tsx:31-32`): no tip. The reason is still reached through Edit, and P-128 makes Structure desktop-only.
* Questionnaires: the tip opens, but only because `onClick` calls `preventDefault`, which skips Radix's close on click (`walk/t-q-tap-400.png`).

The team's own `components/ui/tooltip.tsx:24-27` says tooltips never open on touch, and that touch surfaces carry visible text instead. The same root cause hides the reason when a keyboard user presses Enter on a greyed Structure action or the Forms trigger: the tip closes and nothing is said. Minor because the Forms text is extra help (the row's step chip and the summary line carry the next step), and Structure has the Edit route. Fix: one behaviour for all three. A click, tap or Enter on the trigger opens the tip (or keeps it open), for example a controlled `open` toggled in onClick in `RowAction` and on the Forms trigger. Add a touch step at 400 px to the check. (breaker m2, m3)

**m3 Minor (Should; this predates part 5, but the line part 5 rewrote is the fix): readers get no description.** As user-B or user-C on /structure, all 36 greyed actions have `aria-describedby="why-<key>"`, but no element with that id exists. `structure.tsx:416` renders the span only when `canAuthor && a.why`, while `:375` makes `why` the author-only reason for readers. 9cd221d9 had the same gate. Part 5's "description for screen readers" claim is therefore false for the approver. Fix: render `<span id={reasonId} hidden>` whenever `why` is set. (breaker m4)

**m4 Minor (records, for the tech lead, not the builder): the amendment covers two decisions, and one more screen uses the old pattern.** The PR's Question names P-116 only. Part 5 also reverses P-147 (1) "every greyed action with its reason written under it" for the Questionnaires tab. The Form library still shows 8 visible "Still used: … See where used" lines (`library-forms.tsx:183`), on the same shared lifecycle pattern (P-116 amended, "one shared pattern"). This is not a finding against the row, because finding 3 names only the three screens. It needs a follow-up row, or a note in the amendment. `qa/built/UX-A.md` should say that the tooltip change applies to those three screens only. (breaker m6)

**m5 Minor (Could): the greyed Remove says "not available" three times.** The screen reader hears the name "Remove from questionnaire (not available here): …", then "unavailable" from aria-disabled, then the description "Not here: …" (`questionnaires.tsx:521`). Drop "(not available here)" from the aria-label, which also keeps the name equal to the visible label (WCAG 2.5.3). (breaker m5)

Not counted: Move up/down keep a native `title` reason (`questionnaires.tsx:569`). That predates part 5 and is not in finding 3.

## D1–D20 (part 5 only; independent reviewer, browser/script evidence)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Finding 3's three screens meet "reason in a tooltip on the disabled control"; the P-147 amendment is not named (m4) |
| D2 Data integrity | 5 | No data path changed; greyed controls send nothing; QA-93 Remove + Undo still works |
| D3 Reuse | 4 | Uses the shared `Tip` and `RowAction`; Forms adds a one-off trigger button (m2) |
| D4 Rule integrity | 5 | Not touched |
| D5 Stability and recovery | 5 | Click, Enter and Space on greyed controls do nothing; reload is clean |
| D6 Freshness and governance | 4 | No change; the record of the amendment is still owed (m4) |
| D7 AI trust | n/a | Not touched |
| D8 Orientation | 5 | Not touched |
| D9 Flow of information | 4 | The tip points to Edit; phone users get no pointer (m2) |
| D10 Language and guidance | 4 | Visible words are calmer and plain; screen readers hear "question s" (m1) |
| D11 Feedback and state | 4 | The greyed state is clear; Enter on a greyed Structure action hides its reason silently (m2) |
| D12 Visual quality | 5 | Rows are calmer (`walk/s-hover-1440.png`, `q-hover`, `f-hover`); tips fit at 200 % |
| D13 Accessibility and responsive | 3 | axe clean and keyboard fine; touch reach on 2 of 3 (m2), reader description (m3), "question s" (m1) |
| D14 Looks like the team's | 4 | Team tooltip; its own touch note is not followed (m2) |
| D15 Speed | 5 | No new requests; tips open in 250 ms |
| D16 Testability | 2 | The proof check is flaky and its waits are silent (M1); no touch or reader step |
| D17 / D20 | simulated only | No intended user walked it |
| D18 Provenance | n/a | Not touched |
| D19 End-to-end | n/a | Not touched |

## Journey test (reviewer, 2 Nov): 8.5 / 10, pass
Journeys (content publisher unless named):
1. Main path: on Structure, find out why "Temporary residence" can't be retired, then reach each use. Holds on desktop by mouse and keyboard.
2. Alternate: on LMIA › Questionnaires, try to remove a section that asks something. Greyed, reason given, nothing happens. Holds.
3. On Visitor visa › Forms, understand "Attached, not set up yet". Holds on desktop.
4. Error and recovery: Enter or Space on a greyed action does nothing; Edit shows each use. Holds, but the reason vanishes on Enter (m2).
5. Wrong role: the approver on Structure gets a tip but no screen-reader description (m3).
6. Phone at 400 px, touch: Questionnaires works; Forms and Structure do not on the row (m2).
7. Step across screens: from the details (Edit) to Where used. Holds.
8. Break attempts: a 433-character reason at 200 % zoom, duplicate ids (none), Enter, Space and click (nothing happens). Covered with the breaker.

Data underneath: nothing is written by any greyed control; QA-93's Remove + Undo leaves the same sections in the same order (the suite's step).

Scores (1 / ½ / 0):
* task completed 1
* next step obvious ½ (no pointer on touch)
* plain words 1
* feedback and state ½ (Enter hides the reason)
* correct data 1
* error recovery 1
* accessibility and screen sizes ½ (m1–m3)
* speed 1
* visual quality 1
* trust and sources 1

To raise the half scores: m2 first, then m1 and m3.

## Could not check
A real screen reader (NVDA or VoiceOver). Only Chromium's accessibility tree was read. iOS Safari's tap and focus behaviour. Retired rows (the demo has none). An intended user's unaided walk (D17 and D20 stay with the founder).

## To get Approve
Fix **M1** and run the check 5 times green. m1 and m3 are one line each; fix them in the same push, or list them in the PR. m2, m4 and m5: fix, or list in the PR as follow-ups.
