# F2 C2.12 slice 3: the guided path on the Forms tab (step chip and rail) · independent reviewer · round 3 · 1 Nov 2026

Commit reviewed: **`075ffcdf`** on `claude/forms-c212c-hfb2om`. This round is a delta: I read `git diff ed2516cf 075ffcdf` against the round-2 fix list below. I did not build it.
- Ports: 4454–4459 only. Every copy was stopped and its database dropped.
- Web build: current (a rebuild gave the same hash, `index-BO23YPzN.js`).
- Cost: US$0, replay only. SQL was used only as test input for the running state.
- Tree: the tracked screenshots the suite rewrote were restored, and the tree is clean apart from this file and the journey-test file.

## Verdict: **Ship** (0 Blocker, 0 Major open). For the PR: **Approve**
Major A is fixed and holds in the running app. N1–N3 are fixed. One N1 item, the rail key, still has no isolated test; I judge that acceptable (below).

## Round-2 fix list, item by item
| Item | Result | Evidence |
|---|---|---|
| **Major A**: the chip stays "Running" after the run | **Fixed** | Fix: `web/src/pages/combination.tsx:118-120`, a 4 s `refetchInterval` only while some chip is `running`. My walk on Visitor visa IMM 5257 with the rail closed: as A, the chip went from Running to "Step 3 of 6 · Review · Your step" **567 ms** after the job was set to COMPLETED, with no reload. As C: 560 ms, ending on "Waiting on someone else". 2 reads in 10 s while running, **0 when idle and 0 after the run ends** (the poll stops). Mutation (poll off): suite **30/31**, and the Major A step fails |
| N1: frozen chip label (m11) | Fixed, tested | Mutation (label fixed at "Your step"): 30/31 |
| N1: running words (m10) | Fixed, tested | Mutation (running branch off): 30/31 |
| N1: rail focus refetch (m9) | Fixed, tested | Mutation (`refetchOnWindowFocus: false`): 30/31 |
| N1: rail key under `["combination", id]` (m6) | **Untested, accepted** | Mutation (`["form-progress", id, code]`): 31/31. Accepted because the behaviour this key serves is covered another way. The rail is a modal that only reads and links, so no row action can run while it is open. On remount, the rail fetches again (staleTime 2 s, `lib/api.ts:29`). Its focus refetch and its running poll are now tested. The key is an implementation detail, not a rule with its own outcome |
| N2: the elsewhere words repeat | Fixed | API on Visitor visa after a Super visa replay: "Being mapped in Super visa…" appears once (in the words). Who: "The people working on it there finish it; nothing to do here until then." Link: "Open it in Super visa". Mutation (old who line): 53/54 |
| N3: the ORed API checks | Fixed | `check_forms_c212_progress.ts:127` and `:130` are now strict. With m1 (engine combination filter off), `:127` fails as well (51/54; at ed2516cf it passed) |

## What I checked
| Check | Result |
|---|---|
| Suites at 075ffcdf (fresh copies) | `check_forms_c212_rail_browser` **31/31** (:4455). `check_forms_c212_progress` **54/54** (:4454) |
| Mutations (`git archive` of 075ffcdf, fresh copy each) | **6 of 7 caught**: forms poll, chip label, running words, rail focus, who line, combination filter. Survived: m6 rail key (accepted, above) |
| axe, running state with the rail closed | 0 violations at 1024 and 390 px, as A and as C. The suite adds the running rail at 3 widths |
| Graph (P-86), tsc | G1 0 · G2 0 · G3 2 (old attachment routes, not this slice) · G4–G6 0. Web tsc: no error in `combination.tsx` or `setup-rail.tsx` |
| Not run | `run-suites.sh --changed`: its ports (164xx) are outside my range |

## Issues
None new. Carried from round 2 and declared for the PR, not re-scored: Minor 2 (board fit), Minor 4, Minor 8, Minor 9, and #186 Minors C–F.

## D1–D20 (changes from round 2 only)
- D10 4: N2 fixed.
- D11 4: Major A fixed; the chip and the rail agree.
- D16 4: 6 of 7 mutations caught; the one left is accepted.
- Every other score is unchanged from round 2. D17 and D20 are simulated only.

## Could not check
- A real screen reader.
- A visible browser: headless Chrome only.
- Live AI.
- An intended user's unaided walk (D17, D20).
- `run-suites.sh`.

Journey test: `journey-test-reviewer-2026-11-01-c212-075ffcdf.md`. **Score 9.5/10 (pass).**

**Verdict: Approve** (075ffcdf). No open Blocker or Major.

---

# F2 C2.12 slice 3: the guided path on the Forms tab (step chip and rail) · independent reviewer · round 2 · 1 Nov 2026

Commit reviewed: **`ed2516cf`** on `claude/forms-c212c-hfb2om` (stacked on #186, cd8a023d). I read `git diff 9a8aac8e ed2516cf` (this round's fix) and `git diff cd8a023d ed2516cf` (the slice). I did not build it. Read against the board `design/draft-wizard.html` (PDF views only, P-102), `concept.md` §3–§6 (BR-1, BR-4, BR-5, BR-7, K1, M5, m6, m9), STANDARDS and EXPERIENCE, and round 1 below.
Ports 4454–4457 only; every copy stopped and its database dropped. Web build current (a rebuild gave the same hash, `index-DdGWOg-h.js`). US$0: replay only, no `*_LIVE`. Tracked screenshots the suite rewrote were restored; the tree is clean.

## Verdict: **Ship after fixes** (0 Blocker, 1 Major, 3 Minor new; carried Minors as declared). For the PR: **Block**, fix list at the end
The five round-1 Majors are fixed and hold in the running app. One new Major comes from Major 1's fix: the chip now comes from the workspace response, and nothing reads that response again when an AI draft finishes, so the chip keeps saying "Running" after the run has ended.

## Round-1 fix list, item by item
| Item | Result | Evidence |
|---|---|---|
| Major 1: one request per tab view | **Fixed** | Super visa Forms tab as A: one `workspace?tab=forms` read, 0 `/progress` reads. With an LMIA after `fill-from-index` (221 more forms): `tab=forms` 138–180 ms over 5 runs, chips included. Round 1 measured 6 progress calls at 340–550 ms each |
| Major 2: other combination's work | **Fixed** | Saved AI answer on Super visa IMM 5257, then Visitor visa as A and C: chip "Step 2 of 6 · Field map · Waiting on someone else". Step 2: "Being mapped in Super visa: 84 proposals left · a content publisher…". Its only link is "Open it in Super visa" → Super visa's job. Step 3 not started, no Draft offered. Mutations m1, m3, m4 caught |
| Major 3: chip after row actions, focus | **Fixed for actions and focus**; new Major below | Use saved AI answer on the row: chip "Step 3 of 6 · Review · Your step" after 1.0 s, no reload. Add from library: suite step 24. Focus re-read: m7 caught. The rail key move (m6) and the rail's focus refetch (m9) survive mutation (Minor N1) |
| Major 4: "no PDF → upload it" | **Fixed** | m2 (`f.edition ?` → `true ?`) fails 2 checks (unit and API, CIT 0001). In the UI, `?setup=CIT 0001` → "Upload its PDF in the Form library" → `/library/forms` |
| Major 5: axe at 390 | **Fixed** | My run, 0 violations at 1440/1024/390 on: author step 2 and step 3, elsewhere (A), running (A and C). Suite: reviewer, error, waiting, done. m8 (bodyLabel off) caught at 390 |
| Minor 1 what's left | Fixed | Only open steps, with who and link ("· Being mapped in Super visa."). m5 caught |
| Minor 3 running words | Fixed, untested | "Nothing for you to do here now: The AI draft of the field map is running; this page follows it." m10 survives (N1) |
| Minor 5 tooltip | Fixed | Shown on hover and on keyboard focus |
| Minor 6 edge words | Fixed | IMM 9999: words, no Try again. `?setup=imm5257` titled "IMM 5257"; Escape finds the chip |
| Minor 7 tests | **Partly** | Step links (m12) and the who line (m13) are now caught. **A frozen chip label (m11) still passes 26/26** (N1) |
| #186 Minor B | Fixed | API check of a "what IRCC accepts" change |
| Declared not done | Accepted as PR items | Minors 2, 4, 8, 9; #186 Minors C–F |

## What I checked
| Check | Result |
|---|---|
| Suites at ed2516cf (fresh copies) | `check_forms_c212_progress` **54/54** (:4454). `check_forms_c212_rail_browser` **26/26** (:4455). The /tmp `git archive` gave the same results (:4456) |
| Mutations (/tmp archive, fresh copy each; web rebuilt for web mutations) | **9 of 13 caught.** Caught: m1 engine combination filter · m2 no-PDF branch · m3 elsewhere null · m4 queue job combination null · m5 what's left unfiltered · m7 workspace focus refetch · m8 bodyLabel · m12 step links · m13 who line. **Missed:** m6 rail key back to `["form-progress",…]` · m9 rail focus refetch off · m10 running words off · m11 chip label frozen |
| Keyboard, 200 % (720 px at 2×) | 29 Tabs to the first chip. Tooltip on focus. Enter opens the rail. Tab: Close → named region "Where IMM 5257 stands" → links. Step 3 link → the job "AI-proposed field map"; Back reopens `?setup=`. No sideways scroll with the rail open or closed |
| Roles | Workspace forms read as O: 403; as Z: 401; no actor: 401. C sees "who acts", with no Draft |
| Graph (P-86), tsc | G1 0 · G2 0 · G3 2 (old attachment routes, not this slice) · G4–G6 0. tsc (web, api): no error in the touched files |
| Not run | `run-suites.sh --changed`: it uses ports 164xx, outside my 4454–4459. I rely on the builder's 100 PASS for it |

## Issues, ranked
**Major A (Must): after an AI draft ends, the chip keeps saying "Running" until a reload or a focus change.**
- Repro (my run, :4457): on Visitor visa IMM 5257, set the job to RUNNING (SQL test input, as round 1 did). The Forms tab chip reads "Step 2 of 6 · Field map · Running".
- Set the job to COMPLETED. **12 s later the chip still reads "Running"**; a reload shows "Step 3 of 6 · Review · Your step".
- With the rail open, the rail moved on 4 s after the change (its 4 s poll, `setup-rail.tsx:33`). After Escape, the chip under it still read "Running" 3 s later. The same page shows two answers.
- Cause: the chip now comes only from `["combination", id, "workspace", qs]` (`combination.tsx:118`). That query has no poll. The draft dialog invalidates it once, at launch (`sources.tsx:142`). The overview's 3 s poll while a job runs (`combination.tsx:57`) refreshes only its own key.
- A live draft takes minutes, so the author who launches one from the row is left with a stale "Running" chip. Round 1 found this state working: the chip shared the rail's poll. It is the same stale-chip defect as Major 3, in the running state.
- The bar: concept m6 says the chip follows the step. EXPERIENCE §2 [M] says running shows real progress.
- The closed-rail case is the main one: the person sees the run end only by reopening the rail or by leaving the page and coming back.
- Fix: poll the forms workspace read while any chip is `running`, the way the overview polls. Or invalidate it when the rail's or the overview's poll sees a run end. Add a browser check: running → done moves the chip without a reload.

**Minor N1 (Should): four claimed fixes have no failing test.**
- Frozen chip label (m11; the Minor 7 item still open). The label check at `check_forms_c212_rail_browser.cjs` step 1 matches the frozen text, and step 24 checks only `data-current`.
- Running words (m10, Minor 3).
- The rail's focus refetch (m9).
- The rail key under `["combination", id]` (m6).
- STANDARDS §3.10 and §7 [M] ask for a failing test for each.

**Minor N2 (Should): elsewhere words repeat.**
- Step 2 says "Being mapped in Super visa" three times: in its words, in its who line and in its link.
- The next-step line reads "Nothing for you to do here now: Being mapped in Super visa.". That names a place, not who acts; the words already say "a content publisher".
- Source: `engine/form-progress.ts:80`, where `who` is the place.

**Minor N3 (Should): two API checks are ORed and cannot fail on the rule they name.**
- `check_forms_c212_progress.ts:130` passes whenever Super visa's step 3 has started.
- `:127` passes whenever step 2 waits.
- Lines 128–129 carry the rule, so this is a test-quality point only.

Carried and declared for the PR, not re-scored: Minor 2 (board fit; step 5 "Done · Nothing waits here" before step 2), Minor 4 (steps 1–2 land on the bare tab), Minor 8, Minor 9, #186 Minors C–F.

## D1–D20
- D1 4: K1, BR-1, BR-4, BR-5 and BR-7 met.
- D2 4: read only; scoped to the combination.
- D3, D4, D6, D8 n/a.
- D5 4: 403/401/404 in words.
- D7 4: US$0, replay only.
- D9 4: the next step can always be taken.
- D10 3: N2.
- D11 3: Major A.
- D12 3: Minors 2 and 8 carried.
- D13 4: axe 0 at 3 widths, keyboard, 200 %.
- D14 4: team Panel, Tip, Button.
- D15 4: one request, 138–180 ms.
- D16 3: 4 of 13 mutations survive.
- D17 simulated only.
- D18 4: the elsewhere link is labelled with its combination.
- D19 4: hands off to the job, the library and Review and release.
- D20 simulated only.

## Could not check
- A real screen reader.
- An intended user's unaided walk (D17, D20).
- A visible browser (headless Chrome only).
- Live AI. The running state came from SQL test input.
- `run-suites.sh` (ports outside my range).

Journey test: `journey-test-reviewer-2026-11-01-c212-ed2516cf.md`. **Score 8.5/10 (pass by score; the open Major blocks).**

## Fix list for ed2516cf
**Verdict: Block** (1 Major open). Fix before `review: approved`:
1. Major A: the chip follows a run to its end without a reload (poll the forms read while a chip is running, or invalidate it when a run ends), with a browser check.
Should, in this PR or listed in it: N1 (tests for the frozen label, running words, rail focus and rail key), N2, N3.

---

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
