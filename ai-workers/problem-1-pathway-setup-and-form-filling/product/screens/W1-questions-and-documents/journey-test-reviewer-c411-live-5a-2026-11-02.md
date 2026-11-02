# Journey test (reviewer): C4.11 live wiring 5a on c154cd6c, 2 Nov

Persona: the content publisher (author) on Work permit › With an LMIA (wp.family), Questionnaires tab, "Draft questions and documents".
Setup:
* Isolated copies on :4455 and :4456, with the fake launcher only (US$0).
* Headless Chromium through the suite's own browser and my walk scripts. My screenshots are in my scratchpad `shots/rv-*.png`.
* After each run I read the database (`ai_batch`, `drafting_job`) and the fake launcher's call log.

## Journeys
1. **Main, Saved.** Goal: "draft with what is saved, at no cost". Open the dialog, Saved is chosen, 7 steps, US$0, then Draft with Saved, then Open To review. **Held.** The note says "1 item for To review … Saved, US$0", and Open To review lands on this combination's group (browser suite).
2. **Main, Live.** Goal: "run it for real, knowing the cost first". Choose Live: "At most US$2.06, inside the AI spending cap (US$60.00 left)". Steps 5 and 6 are Live and step 2 is Saved, then Draft Live. **Held.** It is one LIVE batch with 8 launcher calls (stub + live × 4 rounds). The note ends "Live, US$x".
3. **Error, failed Live with a Saved result.** **Held.** Step 6 says "…use Saved (US$0)". "Use Saved (US$0)" goes back to the plan on Saved, with focus on the Saved choice. The Saved run proposes the pick.
4. **Error, failed Live with no Saved result.** **Held.** Nothing is offered.
5. **Error, a paid first round then a failed checker round.** **Held.** "The first AI round ran, but the checker round did not … This step cost US$0.42 (counted); nothing of it is used."
6. **Recovery, Stop during step 5's first Live round.** **Held.** The checker round is never sent. Step 5 ends Cancelled at US$0.30, and steps 6 and 7 are "Not run: the run was stopped."
7. **Recovery, Stop during step 6's first Live round.** **Failed (Major M1).**
   * The step-6 checker round was still sent (launcher log: `studio-pqr-picks-check` stub + live), at US$0.60 for step 6.
   * Its picks were proposed, and the run then said "Stopped by a person".
8. **Over the cap.** **Partly held (m2).**
   * With US$1.50 left, the plan said "At most US$2.06, inside the AI spending cap (US$1.50 left)", and Draft Live was enabled.
   * The click was refused in words: "Not started: … Nothing was started."
9. **Live closed, nothing saved.** **Held.** Live is greyed "(not open)" with "each paid run is approved first, with its cost stated". "Nothing can start…" is shown, and Draft is off with `aria-describedby="qd-none"`.
10. **Keyboard and zoom.** **Held.**
    * Keyboard: Tab reaches the button, Enter opens the dialog with focus in it, and ArrowUp switches Saved to Live.
    * 1024 px at 200 % (a 512 px viewport): no sideways scroll, and Draft Live is visible. The cost line is in the dialog's scroll area.

## Data underneath
* One batch per run, with exactly 7 jobs. Each Live step carries its cost (`drafting_job.cost_usd`). The run card header shows "at most US$2.06 · US$x spent".
* There is an audit line per run with "Live" or "Saved" and the US$.
* Wrong role: the run needs the author (`need(actor, "author")`, unchanged), and the plan stays readable by readers (unchanged).

## Break pass (short)
* Lone checker round: a newer checker round with no first round of its own makes step 5 not Saved. Held (LV fail).
* Stated worst versus ledger (m1): wp.family is stated at US$2.06 but can reserve US$2.18; Guide 5256 is stated at US$2.53 but can reserve US$2.66.
* Run note (m3): "…nothing was charged Pre-qualification picks…" has no full stop between the reasons.
* Saved plan (m4): a "Saved" pill sits next to "(none saved: proposes nothing)".
* By code (m5): a standalone C4.7 Live draft and this run's step 6 can both send paid rounds at once.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Saved and Live runs complete; items reach To review (journeys 1–2) |
| Next step obvious | 1 | "Use Saved (US$0)", Open To review, and "Nothing can start" tied to Draft |
| Plain words | ½ | m3 (no full stop between reasons), m4 (Saved pill with none saved) |
| Feedback and state | ½ | "Stopped" while step 6 kept spending (M1); "inside the cap" when over it (m2) |
| Correct data | ½ | Picks proposed after Stop (M1); otherwise one batch, 7 jobs, costs per step |
| Error recovery | 1 | Failed Live → Saved; over-cap refused in words; a paid round's cost stated |
| Accessibility and screen sizes | 1 | axe clean at 1440, 1024 and 400 px on 6 states; keyboard path; 512 px |
| Speed | 1 | Plan shown in 201 ms |
| Visual quality | 1 | Same dialog pattern as C4.7; pills and the run card aligned |
| Trust and sources | ½ | The "At most" figure is below the ledger's reservation (m1); AI and Saved are marked |

**7.5/10, which fails (below 8, no criterion at 0).** Fixes, most valuable first:
1. M1: Stop checked before step 6's calls, and a running call ended. This raises feedback and correct data.
2. m1 and m2: a true worst case, and Draft Live greyed when over the cap. This raises trust.
3. m3 and m4: the wording. This raises plain words.

Not tested: a real model call, a screen reader, and an intended user's unaided walk (D17, D20 stay with the founder).
