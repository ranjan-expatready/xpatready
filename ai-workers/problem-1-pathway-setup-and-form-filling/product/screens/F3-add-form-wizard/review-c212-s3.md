# F2 C2.12 slice 3: the guided path on the Forms tab (step chip and rail) · independent reviewer · 1 Nov 2026

Commit reviewed: **`28b3bba3`** on `claude/forms-c212c-hfb2om`. It is stacked on #186 (cd8a023d), and I read `git diff cd8a023d 28b3bba3`. I did not build it. I read it against the board `design/draft-wizard.html` (PDF views only, P-102), `concept.md` §3–§6 (BR-1, BR-4, BR-5, K1, M5, m5, m6, m9), `plan.md` D3 and D5, `STANDARDS.md` and `EXPERIENCE.md`.
Ports: 4450–4453 only, with every copy stopped and its database dropped. The web build was current (a rebuild gave the same hash). Cost: US$0 (replay only, no `*_LIVE`). Tracked screenshots that the suite rewrote were restored, and the tree is clean.

## Verdict: **Rework** (0 Blocker, 5 Major, 9 Minor). For the PR: **Block**, fix list at the end
What works: the rail reads and links only. It is addressable and resumes on reload and Back. Escape returns focus to the chip. The content reviewer is told who acts. The error and loading states are drawn, and the running state polls. The two rule changes behave as described.
What blocks it:
- The chip makes one progress request per form row. The board, the concept and STANDARDS §5/§9 all forbid this, and the cost grows with every row.
- The rail shows another combination's work as "Your step", and its next step leads to an action the product refuses.
- The chip stays stale after the person acts on that same row.
- One of the two new rules has no test.
- axe fails at 390 px in three states.

## What I checked
| Check | Result |
|---|---|
| Suites at 28b3bba3 (fresh copies) | `check_forms_c212_rail_browser` **15/15** (:4452). `check_forms_c212_progress` **39/39** (:4453). Same results on the /tmp `git archive` (:4451) |
| Mutations (/tmp archive, fresh :4451 copy each; web rebuilt for web mutations) | **7 of 11 caught.** Caught: attached counts as present (API) · attached-only "Add from library" branch · non-author wrapper · Escape focus return · What's left not drawn · rail not addressable · rail error branch. **Missed:** no-PDF form offered "Add it from the library" (`engine/form-progress.ts:62-63`, rule 2 of the slice) · step links removed from the rail's steps (BR-1) · "who acts" line removed · chip label frozen at "Step 2 of 6 · Your step" |
| BR-1 links land where the step is done | Step 3 → `/c/:id/jobs/:job` "AI-proposed field map" ✓. Step 6 → Review and release ✓. Upload → Form library ✓. Steps 1–2 and "Decide the form fields" → plain `/c/:id/forms`: the rail closes, focus goes to `<body>` and nothing points at the row's button (Minor 4). On Visitor visa the step-2 link leads to a refused action (Major 2) |
| BR-4 resume and who acts | Reload, and Back after following a link, reopen `?setup=` ✓. C on Visitor visa IMM 5707: "Nothing for you to do here now: The configuration author does this.", with no link ✓ |
| BR-5 what's left | It lists every step not yet done, including blocked future steps and step 6, with no who, no link and no count (Minor 1) |
| States | Loading: chip "Guided setup", rail spinner ✓. Error: rail notice with Try again ✓, chip silently hidden (Minor 6). All done (LMIA IMM 5409) ✓. Waiting (C) ✓. Running (SQL test input): the rail polls every 4 s and the chip follows the rail ✓, but the words are wrong (Minor 3) |
| Keyboard | Chip is a real button (45 Tabs from the top of the LMIA tab). Enter opens the rail, focus goes to the dialog, Tab reaches the links, Enter follows, Back reopens, Escape returns to the chip ✓ |
| axe WCAG 2.2 AA at 1440 / 1024 / 390, and 200 % (720 px) | Elsewhere, loading and error: 0/0/0. **Waiting, done and running: 0/0/`scrollable-region-focusable`** (Major 5). 200 % on the author rail: 0, no sideways scroll, rail covers the page |
| Speed, With an LMIA, IRCC's index filled (237 forms; 6 chips) | Rows at 272–395 ms, chips settled at 667–916 ms. **6 progress calls per view, 340–550 ms each when run together** (single call 86–118 ms). ≈59 transactions per progress call against ≈14 for the workspace call, ≈578 per tab view. Parallel calls scale linearly: 12 → 852 ms, 20 → 1385 ms, 40 → 2629 ms |
| Graph (P-86), tsc | G1 0 · G2 0 · G3 2 (the old routes) · G4–G6 0. tsc on the web: no error in the touched files |
| Break pass (UI and API) | `?setup=<img …>` is shown as text (no injection). Cyrillic and long values get a 404 in words. The user-O or user-Z rail and chips are absent (403/401). A 300-character value becomes a 300-character title (Minor 6) |

## Issues, ranked
**Major 1 (Must): one progress request per form row.**
- Where: `setup-rail.tsx:238` `StepChip` → `useApi(progressPath)`, mounted per row at `forms.tsx:192,201`.
- What the bar says:
  - STANDARDS §5 [M]: "one request per screen view, not per row".
  - STANDARDS §9 [M]: "no request per row".
  - Concept §4: "One request per tab view [F] M5".
  - Concept §6: "Workspace forms tab: one more field `progress{n,label,state}` per line".
  - Board: "One request for the tab: the step is one more field in the workspace response (STANDARDS §5, m9)".
- Each call rebuilds the whole To review queue and the combination validator (`api/src/form-progress.ts:45,51`). See the numbers above.
- Fix: return `progress{n,label,state}` per line from the workspace forms read, computed once for the tab view. Keep the per-form endpoint for the rail only.

**Major 2 (Must): the rail shows another combination's work, and its next step is refused.**
- Repro: load the sample. On Super visa, use the saved AI answer for IMM 5257. Then open Visitor visa `/c/<vv>/forms?setup=IMM 5257` as A.
- What the rail shows:
  - "Your next step: Draft with AI or add from the library".
  - Step 2 "Your step · No field map yet".
  - **Step 3 "Your step · Review 84 AI proposals"**, which links to **Super visa's** job.
- Following the next step: the row's "Draft with AI" → "Use saved AI answer" is refused: "Being mapped in Super visa: 84 proposals left…" (screenshot `s-elsewhere-draft.png` in my run).
- Cause: `api/src/form-progress.ts:45` filters To review items by form only, never by combination. Concept K1 keys progress by (form, combination). BR-4 says never offer a step the person cannot take. BR-7's "Being mapped in Super visa", with no Draft link, is the agreed wording.
- Fix: keep only this combination's job items, using the job's combination. Show another combination's waiting draft as "Being mapped in <combination>", with its link and no Draft link, as the AI plan already words it. Add a two-combination test.

**Major 3 (Must): the chip stays stale after the person acts on its row.**
- Repro: Super visa, use the saved AI answer on the IMM 5257 row. The chip still read "Step 2 of 6 · Your step" for the 12 s I watched. "Add from library" on IMM 5707 left "Step 2 · Your step" for 8 s; a reload showed "all 6 steps done". The rail also opens on the stale step until its refetch lands.
- Cause: the row actions invalidate `["combination", id]` (`sources.tsx:48-49`, `:137`), never `["form-progress", id, *]`. Concept m6 says "refetched on focus and on return", but `refetchOnWindowFocus` is off.
- Fix: invalidate the form-progress keys with the combination. Major 1's fix gives this for free.

**Major 4 (Must): rule 2 of this slice ("a form with no PDF points to uploading it") has no test.**
- The mutation `engine/form-progress.ts:62` `f.edition ?` → `true ?` leaves both suites green.
- STANDARDS §3.10 [M] and §7 [M] require a passing and a failing test for every rule.
- Fix: one unit check and one API check on an index-listed form with no file (for example IMM 5802 after `fill-from-index`).

**Major 5 (Must): axe fails at 390 px on the waiting, done and running rails** (`scrollable-region-focusable`).
- The rail body (`controls.tsx:112`, `overflow-y-auto`) has no focusable child in those states.
- The suite's header claims "axe … at 1440, 1024 and 390 px", but it runs axe only at 1440 (`check_forms_c212_rail_browser.cjs:122,137`).
- EXPERIENCE §2.12 [M] and STANDARDS §7 [M] require axe on every state.
- Fix: make the scroll region focusable and labelled (`tabIndex={0}`, an accessible name), and run axe at all three widths.

**Minor 1 (Should): BR-5. What's left repeats the step list.**
- The not-started steps 3–4 and step 6 show with no who, link or count.
- "· N open" does not say what it counts, and step 3's 84 proposals counts as 1 (EXPERIENCE §2.7).
- The board lists only open items, each with who and a link.

**Minor 2 (Should): board fit.**
- The chip is "Step 2 of 6 · Your step". The board has the step's name, a count and Continue.
- The rail header has no form title, combination, channel or "Updated just now".
- The footer has no primary for the current step.
- Step 5 reads "Done · Nothing waits here" while steps 2–4 have not started; the board uses "Not needed".

**Minor 3 (Should): running words.** "Nothing for you to do here now: someone else acts next" is shown while the AI draft runs (`setup-rail.tsx:259`). Say that the AI draft is running.

**Minor 4 (Should): steps 1–2 link to the bare Forms tab.** Focus goes to `<body>` and nothing points at the form's row or button. With 8 rows the person must hunt. Concept m5: Draft setup should open scoped to this form.

**Minor 5 (Should): the chip has no tooltip.** EXPERIENCE §2.10 [M] asks for one; the concept's text is "Worked out from what has been done. You never tick a step."

**Minor 6 (Should): edge words.**
- An error makes the chip vanish silently (`setup-rail.tsx:239`).
- "Try again" is offered on a 404 that cannot change.
- The title echoes the raw `?setup=` value, so a 300-character value becomes the title.
- `imm5257` opens a rail whose Escape cannot find the chip.

**Minor 7 (Should): three web rules can be removed with the suite green:**
- the step links (BR-1);
- the "who acts" line;
- a frozen chip label.

**Minor 8 (Should): at 1440 px on With an LMIA, the chip sits in the last column and is cut off** ("Set up · all"). The table scrolls sideways inside its card (`l1-lmia-forms.png` in my run).

**Minor 9 (Should): the API offers "Draft with AI or add from the library" for the checklists IMM 5488 and IMM 5905.** The UI hides it because it shows no chip on document lines.

Carried from cd8a023d: Minors B–F were not re-checked in this round, except that `build-notes.md` still has no C2.12 entry.

## D1–D20
- D1 3: BR-1 and resume met; K1/BR-4 broken across combinations (Major 2).
- D2 3: read only; wrong combination's items.
- D3 n/a.
- D4 n/a.
- D5 4: refusals in words; no injection.
- D6 n/a.
- D7 4: replay US$0 only.
- D8 n/a.
- D9 3: "Your next step" is clear, but on Visitor visa it leads to a refusal.
- D10 3: Minors 1, 3, 5.
- D11 2: stale chip (Major 3), silent chip error.
- D12 3: Minor 8; header thinner than the board.
- D13 3: keyboard path good; axe at 390 (Major 5).
- D14 4: team Panel, Pill and Button.
- D15 2: per-row requests (Major 1).
- D16 2: 4 of 11 mutations survive (Major 4, Minor 7).
- D17 simulated only.
- D18 3: a link to another combination's job carries no label.
- D19 3: hands off to the job and to Review and release.
- D20 simulated only.

## Could not check
- A real screen reader.
- An intended user's unaided walk (D17, D20).
- Live AI.
- The running and held states came from SQL test input, not from a real long job.
- The return strip and `?form=` on To review are not in this slice.

Journey test: `journey-test-reviewer-2026-11-01-c212-28b3bba3.md`. **Score 6/10 (fail).**

## Fix list for 28b3bba3
**Verdict: Block** (5 Major open). Fix before `review: approved`:
1. Major 1: progress per line in the workspace forms response; one request per tab view.
2. Major 2: progress items scoped to this combination; another combination's draft shown as "Being mapped in …", with no Draft link; a two-combination test.
3. Major 3: the chip refreshes after row actions.
4. Major 4: a passing and a failing test for "no PDF → upload it".
5. Major 5: rail body focusable and labelled; axe at 1440, 1024 and 390 in the suite.
