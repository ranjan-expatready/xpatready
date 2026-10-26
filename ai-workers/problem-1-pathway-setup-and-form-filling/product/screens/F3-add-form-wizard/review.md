# F3 — review of BUILD slices 1–4 (F3a-0, F3a-1c, F3c-1 without X4, F3c-2) · independent reviewer · 26 Oct 2026

Commit reviewed: `f9e748d` (code), head `401c3d5` (lane file only), branch `claude/forms-apr-552f9d`. The reviewer did not build it. Evidence comes from the code, the four checks re-run by the reviewer on isolated copies (ports 4420–4422, fixture server on 4429), the reviewer's own browser walks and one mutation run. US$0: no live AI call, the shared demo on :4400 was not touched. All copies were stopped and dropped afterwards, and `git status` was clean before this file was written.

## Verdict: **Ship after fixes**
The four slices do what the plan's D1, D4, D6 and D8 and the concept's X1, X3, X5, X6, X8, X9, X10 and X12 say. Server rules hold under a race and by role, and every new panel state passes axe. One Major (the finish summary's "not seen" list) should be fixed before F3d and the founder's real APR capture (G3), because that is where it would mislead. No Blocker.

## Checks re-run on the exact commit (independent reviewer, script)
| Check | Result |
|---|---|
| `check_forms_f3a0.ts` (pure) | 15/15 |
| `check_forms_f3a1c.ts` (copy on 4420, queue held) | 20/20 |
| `check_forms_f3c.ts` (copy on 4421; temporary copy of the check with the fixture server on 4429 and its files in the reviewer's scratchpad) | 26/26 |
| `check_forms_f3c2.ts` (copy on 4422; same arrangement) | 17/17 |
| Mutation: the advisory lock in `createCapture` (forms.ts:128) commented out | 10 of 10 double clicks made 2 captures, so the check's race test fails as it should. Restored: 0 of 10 |
| Graph (P-86) | No F3 gap. The new `GET /api/extension/capture/recapture-tasks` is reached by a check. The G3/G5/G6 gaps were there before F3 |

## Journeys (reviewer role; headless Chromium with the dev extension, Sample APR over https at apr-portal.sample.test; screenshots in the reviewer's scratchpad)
1. **Author, main path:** Visitor visa › Add an online form › "Start the capture in the extension". The panel lists "Started in the Studio · Visitor visa" first. Each page gets "New screen: …" (about 110 ms, nothing sent). Check before sending lists each question. Finish shows the summary and "a second person approves". Result: done.
2. **Author, already captured / hostile page:** "Already captured: … It is screen 1. Nothing was sent" (revision unchanged). A passport-like choice is refused, naming the question and the fix. Result: done.
3. **Second draft across combinations:** with IMM 5707 queued in Super visa, Visitor visa's Draft setup shows "Skip · Being mapped in Super visa: the AI draft is queued…" (plan in 110 ms). The per-form Draft button gets 409 in words. Result: done.
4. **Same person, two combinations:** a start in Super visa, then in Visitor visa, gives one capture (the Super visa one). Visitor visa says "Already started in the extension (0 screens so far)" and its Online forms list does not show it (Minor 1).
5. **Wrong role and bad input:** reviewer → 403, case officer → 403 (both in words; neither sees the button). Title under 3 characters → 400 on the field. Combination from another workspace → 404. Title over 200 characters → 400.
6. **Case officer fill:** results grouped as Filled (6, each "From the case (Client A, confirmed)") · Confirm in the case first (with a link to the case) · You answer on screen (UCI). Filled inputs are outlined. Undo cleared 5 and kept the 1 the person had changed. Undo is gone after navigation. "Connected until 12:22 AM" is shown.
7. **Across the boundary (capturer → second person):** "Screens to capture again" › "Capture Personal details again · IMM 5257". A double click still made one capture. Reloading the panel offered the capture again. Capture, Send and Finish worked by keyboard only. The second person's approval closed the task (DONE), and the capturer's own approval got 409.

## Journey score: **8.5 / 10 — pass** (no criterion at 0)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–7 completed |
| Next step obvious | ½ | Prompts and "listed first" work. Journey 4 does not say whose capture it is, and "Already captured … go on" (panel.tsx:310) is wrong when the person came from a re-capture task (Minor 2) |
| Plain words | ½ | Major 1: partly seen sections are listed as "not seen", with an unlabelled count |
| Feedback and state | 1 | New screen / already captured, refusal with the fix, the Undo result, "Connected until" |
| Correct data | 1 | Database read: one open capture under a race; the combination kept; the task DONE after approval; no live job; no `affected` on the token route |
| Error recovery | 1 | Reload resumes; a returned capture is reused; 409s and 403s are worded |
| Accessibility and screen sizes | ½ | axe clean on 9 panel states and the Studio panel; keyboard path works; 1024 px fine. At 200 % zoom (512 css px) the Studio panel footer is 536 px wide and clips "Add and send for approval" (Minor 3) |
| Speed | 1 | Plan 110 ms; screen prompt about 110 ms; capture start under 300 ms |
| Visual quality | 1 | Panel and Studio screenshots are clean and use team components |
| Trust and sources | 1 | Every filled value shows its source; the guard says where and how far; "Nothing was sent" is stated and true |
Raising the halves, most valuable first: Major 1, then Minor 2 and Minor 1, then Minor 3.

## Issues
**Major 1: finish summary (X6, BR-12) lists partly seen sections as "not seen", with a count that says nothing.** `forms.ts:277-279`, `twin.ts:180-191` (a group is listed when any mapped form field in it is unseen), `panel.tsx:326`.
- What happened: after capturing the "Personal details" and "Marital status" screens, the summary says "PDF sections not seen on any captured screen yet: Personal details (29), Marital status and spouse (12) …", listing 12 sections. In the database, Personal details has 37 mapped form fields and 8 of them were seen.
- Why it matters: "(29)" counts PDF form fields, while the line above counts "25 questions" (EXPERIENCE §2.7 [M]: counts say what they count). The person cannot see which shared fields are missing (the summary drops `sharedFields`). The advice "a screen that appears only after some answers" is wrong for a screen they have just captured. On the real APR (G3) almost every section will be partly seen.
- Fix: word partly seen groups differently ("Personal details: 29 of 37 form fields not asked on a captured screen"), or list only groups with nothing seen and show the partly seen ones with their fields.

**Minor 1:** `channels.tsx:171`. When the reused capture was started for another combination (or in the panel with none), the Studio says "Already started in the extension" without naming it, and this combination's Online forms list does not show it. D6 "keeps its combination" is agreed. Fix: say "already started for Super visa" (the panel already says this).

**Minor 2:** `panel.tsx:310`. If the person comes from "Capture <screen> again" into an open capture that already holds that screen, the prompt says "go on to the next screen". The right step is to remove screen N first (as the server's own duplicate message says).

**Minor 3:** `channels.tsx:207`. The new third footer button makes the panel scroll sideways at 1024 px / 200 % zoom (EXPERIENCE §2.12 [M]). Fix: let the footer wrap.

**Minor 4:** `panel.tsx:323` with `forms.ts:279`. A one-screen re-capture finishes with "5 screens · 25 questions" (the merged record) while the status says "Compared 1 screen seen". Fix: "1 screen captured · 5 in this version".

**Minor 5:** `ai.ts:98`, `ai.ts:141`. `mappedElsewhere` runs 2–3 queries per attachment inside the plan loop, so a catalogue-scope plan grows per row (STANDARDS §5 [M]). Fix: one query per plan for the workspace's checksums.

**Minor 6:** `ai.ts:99`. `elsewhere.job_href` is not shown anywhere yet: Draft setup shows only the words (BR-7 "a link to that job"). Acceptable until F3b's rail uses it. The plan's D4 words promise the link.

Not findings (plan §9 or concept "Not built"): X4 live coverage, slices 5–8, the rail and "link back to the rail" (X6 links to the capture instead), the case-section anchor for X9 (runtime gap, stated in the build notes).

## D1–D20 (1–5; evidence: independent reviewer, script and walk)
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | Every in-stage D and X item behaves as planned; Major 1 is a BR-12 wording gap |
| D2 | 5 | Two advisory locks with re-checks; both races tested; the lock mutation is caught |
| D3 | 4 | "Analysed once" enforced across combinations; coverage keyed by (shared field, person) |
| D4 | 4 | `isScreenInput` is defined and tested; no reader depends on it yet (slice 6) |
| D5 | 4 | Double click, panel reload, returned capture, Undo gone on navigation |
| D6 | 4 | Start audited; second person closes the task; self-approval refused |
| D7 | 4 | Guard works in all modes, US$0; coverage uses no AI |
| D8 | 4 | "Started in the Studio · Visitor visa"; Minor 1 |
| D9 | 4 | Studio start to panel to finish in a few steps; re-capture in one click |
| D10 | 3 | Major 1; otherwise plain and front-loaded |
| D11 | 4 | Prompts, refusals and the Undo result are clear; Minor 4 |
| D12 | 4 | Clean and dense; the 360 px panel is readable |
| D13 | 4 | axe clean, keyboard path; Minor 3 |
| D14 | 4 | Team Panel, Notice and Button; product words |
| D15 | 4 | Sub-second throughout; Minor 5 |
| D16 | 4 | 78/78 re-run on the exact commit; pass and fail case per rule; mutation caught. c8 coverage not measured |
| D17 | — | Simulated only |
| D18 | 4 | Source on each fill result; the guard names the combination and its state |
| D19 | 3 | Capture → approve → fill → reword → re-capture → approve walked; C2.12 not closed until slices 5–8 (by plan) |
| D20 | — | Simulated only |

## What could not be checked
- A visible (headed) browser walk: the reviewer used headless Chromium and looked at screenshots.
- A real screen reader.
- The real APR Portal (Sample fixtures only).
- c8 coverage.
- D17 and D20 need the founder or an intended user.
- The retrofit mapping is recorded in plan §8 (the `asked_differently` entry, no new team table). Slices 1–4 add no model change.
