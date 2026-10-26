# F3 slices 1–4: second review after the FIX · independent reviewer · 26 Oct 2026

Commit reviewed: `e220fbc`, branch `claude/forms-apr-552f9d`. I did not build this and had not reviewed it before. It covers plan slices 1–4: F3a-0, F3a-1c, F3c-1 without X4, and F3c-2. Slices 5–8 are not built yet and are not findings. The evidence is the code, the five suites re-run on the exact files, six mutation runs, and my own walks in Chromium with the unpacked development extension on the Sample APR screens (fixture server on :4429). Every copy ran on ports 4420–4427, one at a time, each with its own `xr_studio_lead_rv2_*` database. All copies are stopped and all databases dropped. US$0: plans, stub passes and replays only, no live call. The f3a1c suite wrote one untracked `p2/jobs/studio-fieldmap-imm5707e.json`, which I removed. `git status` was clean before this file was written. Every count, label and screen here is **Sample**.

## Verdict: **Ship after fixes** (0 Must, 1 Major, 4 Minor)
Five of the six earlier Majors are gone, both as a person sees them and in the data underneath. The sixth (break M4, the second-draft guard) is fixed for failed, cancelled, interrupted and stub steps. It is still open for a newer **BLOCKED** step. The fix is one line plus one fail-case test, and it should land before the merge (Major 1). Nothing else stops the merge.

## Checks re-run on the exact files (independent reviewer, script)
| Check | Result |
|---|---|
| `check_forms_f3a0` (pure) · `f3a1c` (:4420, queue held) · `f3c` (:4421) · `f3c2` (:4422) · `f2c_fill` | 17/17 · 27/27 · 31/31 · 20/20 · 20/20 (the f3c and f3c2 copies only change the fixture port, 4453 → 4429) |
| Mutations, each restored afterwards | Each one is caught. (1) `screenCoverage` lists sections that are fully matched → f3a0 has 5 FAIL. (2) HELD taken out of the D6 key → f3c FAIL "M2". (3) The element-id check taken out → f3c FAIL "m8". (4) The guard's status filter taken out → f3a1c FAIL "newer failed draft". (5) `sameScreen` taken out of undo → f3c2 stops at the M1 step. (6) Raw `differences` on the token route → f3c2 FAIL "m6" |
| Graph (P-86) | G1 0 · G2 0. G3 has 2, G5 has 1. All three gaps predate F3 (`/capture-template.csv` is F2) |

## Are the Majors really gone? (what a person sees, then the data underneath)
| Earlier Major | Result | Evidence |
|---|---|---|
| Review Major 1 + break M5: honest finish summary | **Gone** | After capturing s01–s06, the summary reads "6 screens captured · 33 questions … Personal details: 29 of 37 form fields · Marital status and spouse: 12 of 13 … Contact information: none of its 45". It then says "24 questions on the captured screens are not matched yet: a person maps them on the screen map", which explains the captured spouse screen. axe clean. One new wording slip on re-capture: see Minor 1 |
| Break M1: Undo checks the screen first | **Gone** | Swapping the screen in place (new heading, same ids) gives "The portal shows another screen now: nothing was cleared". The value stays SAMPLE and Undo goes away. A follow-up question revealed on the same screen still undoes all 6. With one value changed by the person, Undo clears 5 and keeps 1 (`content.ts:38`) |
| Break M2: a held capture counts as open | **Gone** | A start while the capture is held gets 200 `reused` with the same id, status HELD. The panel and the Studio both say "held for a second person". A HELD capture can still be abandoned (`forms.ts:360`) |
| Break M3: the combination is kept or filled | **Gone** | Studio start in Visitor visa, then in Super visa: the second says "Already started in the extension for Visitor visa (0 screens so far): one capture per form and portal serves every combination once approved". The database holds 1 open capture with combination Visitor visa. A panel capture with no combination takes the Studio's (f3c) |
| Break M4: the guard ignores newer failed or stub steps, takes its locks in one order, and is batched | **Partly**: see Major 1 | Failed, cancelled, interrupted, stub and failed reuse steps are handled (f3a1c). Locks are taken in one sorted order: 3 rounds of opposite-order launches give 201 + 409, never a 500. The plan uses 3 queries per plan (`mappingIndex`). A newer **BLOCKED** step still hides the waiting draft. The launch re-check still runs 2 queries per target (Minor 2) |
| Break m8: ids and formats are checked | **Gone on the server** | A passport-like id gets 422 and an email inside a pattern gets 422, in words, and nothing is kept. The panel does not check them before sending (Minor 3) |
| Break m6: no element ids reach a capture token | **Gone** | Each entry on `/extension/capture/recapture-tasks` is `{question, change}`. A screen the version lacks is counted, not listed. There is no `affected` field, and a fill token gets 403 (f3c2; the mutation is caught) |

## Journeys (reviewer role; headless Chromium with the dev build; panel at 360 px; one screenshot per decision point, kept in my scratchpad)
1. **Author, main path:** Visitor visa › Add an online form › "Start the capture in the extension" (67 ms). The notice names the extension and says "Started in the Studio · Visitor visa". The panel lists it first. Each page gets "New screen: …" in under 75 ms, and nothing is sent. Screen 2 was captured and sent by keyboard only. "Check before sending: 9 questions go to ExpatReady, as structure only" lists each question. Finish takes 104 ms and gives the honest summary above. Done.
2. **Second combination, same file:** Visitor visa's IMM 5707 replay draft is queued. In Super visa › Draft setup (98 ms), IMM 5707 shows "Skip · Being mapped in Visitor visa: the AI draft is queued … no second AI draft" in both Live and Replay modes. The database has one job. There is no link to that job (BR-7, carried as the earlier Minor 6 until F3b).
3. **Across the boundary:** the reviewer opens To review › the capture ("Held for a second person … Not used until approved") and approves it. The capturer approving their own gets 403, and the reviewer starting a capture gets 403. Done.
4. **Case officer fill:** "Connected until 12:55 AM". "Filled 6 of 9 · 3 need you": Filled (6), each "From the case (Client A, confirmed)" · Confirm in the case first (2, each with "Open the case to confirm it") · You answer on screen (UCI). Six inputs are outlined on the page. Undo, swap and reveal behave as in the table. axe clean. Done.
5. **Re-capture in capture mode:** a reworded screen gives "Nothing was filled. Re-capture needed is open". In capture mode: "Screens to capture again › Capture Personal details again · IMM 5257 · 2 questions changed" › capture › Finish: "1 screen captured · 9 questions (the version holds 6 screens)". The second person approves and the task is DONE. axe clean. Done.
6. **1024 px at 200 % zoom (512 css px):** the Studio panel's three buttons wrap, the rightmost ends at 488 px, and nothing scrolls sideways.

## Journey score: **8.5 / 10 — pass** (no criterion at 0)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–6 completed |
| Next step obvious | ½ | "Being mapped in Visitor visa" has no link to that job (BR-7). After a one-screen re-capture the panel still says "go to the next screen in the portal" |
| Plain words | ½ | Minor 1: on re-capture, "23 questions on the captured screens are not matched yet" sits under "1 screen · 9 questions" |
| Feedback and state | 1 | New screen / already captured, held, the Undo result, "Connected until" |
| Correct data | ½ | Data is right in every journey (1 capture, combination kept, task DONE, no live job). Major 1 still lets a second competing draft in |
| Error recovery | 1 | 403, 409 and 422 errors are in words; reload and resume, Undo refused safely |
| Accessibility and screen sizes | 1 | axe clean on summary, fill, tasks and Studio states; a keyboard path works; 512 px fine |
| Speed | 1 | 38–109 ms for every step measured |
| Visual quality | 1 | Team Panel, Notice, Button; dense and readable |
| Trust and sources | 1 | Each fill shows its source; the guard names the combination and its state; "Nothing was sent" is true |
To raise the score, most valuable first: Major 1, Minor 1, then the BR-7 job link when F3b builds the rail.

## Issues
**Major 1 (Should, fix before merge): the second-draft guard is bypassed by a newer BLOCKED step.** `api/src/ai.ts:148` leaves out only FAILED, CANCELLED and INTERRUPTED. BLOCKED is a real end state: it is set when the provider's usage limit refuses the call (`sources.ts:358,442,455`).
- Reproduced on :4420: Visitor visa's IMM 5257 draft is COMPLETED with 12 proposals PENDING, and Super visa's plan says "Skip · Being mapped in Visitor visa: 12 proposals left".
- Then a newer LIVE field-map step on Visitor visa's IMM 5257 ends BLOCKED (Draft setup's "draft again" can make one).
- Result: Super visa's plan becomes `reuse_saved_output`, a second AI draft. On a form with no saved answer it would be a paid live draft once the limit lifts. Removing the BLOCKED step restores "Skip".
- Fix: count only QUEUED, RUNNING, COMPLETED and APPLIED steps (an allow list), and add a BLOCKED fail case to f3a1c.

**Minor 1 (Should): the re-capture summary's "not matched" count is over the whole version and includes decided questions.**
- The count comes from `forms.ts:466`. Previous versions lend only *mapped* rows (`forms.ts:450`), so inputs a person decided "not a fact" or "You answer this on screen" count as "not matched yet: a person maps them".
- Seen: "1 screen captured · 9 questions" above "23 questions on the captured screens are not matched yet". The released map has exactly 23 "not a fact" decisions.
- This breaks EXPERIENCE §2.7 [M], counts say what they count.
- Fix: count only this capture's own screens and leave out inputs a previous version decided, or say "in this version".

**Minor 2 (Should): the launch re-check still runs 2 queries per target** (`ai.ts:227-228`) inside the transaction. STANDARDS §5 says no query per row. Fix: read `same` and `busy` once for every guarded checksum.

**Minor 3 (Should): ids and formats are refused only after sending.** `screens.ts:81-82` refuses them on the server and nothing is kept. The panel's reader (`reader.ts:153`) checks texts only, so a client-like element id still leaves the computer before it is refused. That falls short of X5's "nothing sent". Fix: run the same id and format check in the reader.

**Minor 4 (Should): the f3a1c suite leaves `prototype/p2/jobs/studio-fieldmap-imm5707e.json` in the repository folder.** Fix: have the suite delete it at the end.

Kept by the builder with reasons, and accepted: the job link (earlier Minor 6, F3b) and the stale "New screen" prompt (m4).

## D1–D20 (1–5; independent reviewer, script and walk)
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | Every in-stage D and X item behaves as planned; Major 1 is a gap in D4's own words |
| D2 | 4 | D6 key and locks hold under mutation; Major 1 lets a duplicate draft in |
| D3 | 4 | "Analysed once" across combinations; coverage keyed by (shared field, person) |
| D4 | 4 | `isScreenInput` tested; no reader uses it yet (slice 6) |
| D5 | 5 | Double start, held start, swap in place, reveal and reload all handled safely |
| D6 | 4 | Start audited; second person closes the task; self-approval 403 |
| D7 | 4 | Guard in all modes at US$0, apart from Major 1 |
| D8 | 4 | "Started in the Studio · Visitor visa"; the second combination is named |
| D9 | 4 | Studio start → panel → finish; re-capture in one click; no job link yet |
| D10 | 4 | Summary honest on the main path; Minor 1 on re-capture |
| D11 | 4 | Clear prompts, refusals and Undo results |
| D12 | 4 | Clean 360 px panel and Studio panel |
| D13 | 4 | axe clean, keyboard path, 512 px without sideways scroll; no screen reader |
| D14 | 4 | Team components and product words |
| D15 | 4 | Under 110 ms throughout; Minor 2 |
| D16 | 4 | 115/115 re-run; 6 of 6 mutations caught; no BLOCKED case; c8 not measured |
| D17 | — | Simulated only |
| D18 | 4 | Source on each fill; the guard says where and how far |
| D19 | 3 | Capture → approve → fill → reword → re-capture → approve walked; C2.12 closes with slices 5–8 |
| D20 | — | Simulated only |

## What I could not check
- A headed browser walk: I used headless Chromium and screenshots so as not to take over the founder's screen.
- A real screen reader.
- The real APR Portal (G3).
- c8 coverage.
- D17 and D20, which need the founder or an intended user.
- Retrofit mapping: plan §8 records it, and the FIX adds no model change.
