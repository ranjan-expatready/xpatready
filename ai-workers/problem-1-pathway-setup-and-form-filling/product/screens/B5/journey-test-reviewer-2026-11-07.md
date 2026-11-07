# B5 Fees on the case page: journey test (reviewer, 7 Nov 2026)

**Commit:** 163bd3338 (branch `claude/hopeful-faraday-hqhzg9`, PR #1233). The PR head moved to 54d19e1ea during the run, but that
commit adds only `screens/B5/break-report.md`, so the code that ran is the reviewed code. **Copy:** isolated `rev_b5` on :4445,
with the configured checkpoint loaded (reset, then load: 93 s). Live AI off, US$0, no priced button. Stopped at the end.
**Method:** headless Chromium, driven by clicks and typing only (Playwright script in the scratchpad, not in the repo). Every
amount on the page was compared with `GET /runtime/cases/:id/prepare` in the same run, and the whole script ran twice with the
same result (21/24 both times; the 3 fails are page-wide, see F3). Screenshots are scratch files, not in the repo.

## Journeys (persona: the case officer, `user-O`, unless named)
1. **Main path, 1440 px.** Goal: "What does this family's submission cost?" Steps: home › "Open your cases" › SAMPLE-VV-FAMILY-1 ›
   Submission to IRCC › Fees. Expected and seen: 8 rows on 4 named filings; the visitor visa fee is CAD 100 × 4 and biometrics is
   CAD 170 on the principal's filing, with the others "Covered by the family maximum" and the child of 10 "Under 14" with IRCC's
   quote. Each fee's basis is named once, on its totals line. "Total for this submission: CAD 570". Sources show once (a read
   date, and a page date for the exemption page). The basis sentence ends "Sample until the immigration expert confirms".
   The page equals `/prepare` and the rows add up to the total.
2. **Sizes.** 1024 px: no sideways scroll and no clipped fee cell. 400 px, and 200 % zoom of 1024 and 1440 (512 and 720 css px):
   the page scrolls sideways to 900 px because of elements outside the fee block (F3).
3. **Keyboard only.** Tab from the top of the page reaches the fee source links after 198 stops. The focus ring is a 2 px
   solid outline. The block has no other focusable element, which is right for a read-only block.
4. **Alternate: six people.** Visitor visa CAD 500 (the family maximum applies instead of 6 × CAD 100). One of the six is 80, so
   no biometrics; another is 8, also exempt. Biometrics CAD 170 for 3. Total CAD 670, equal to `/prepare`, and the rows add up.
5. **Empty: a child with no date of birth.** The row reads "Not counted yet" with the reason and no CAD. The total reads "Total
   so far: CAD 470 · 1 fee not counted yet". **Across the boundary:** I answered the child's date of birth (15) in the Agent
   view (child's tab › Personal details › "The person's date of birth" › Add › Day, Month, Year › Save). The fee block re-priced
   with no reload: "Total for this submission: CAD 470". That amount is right, because 3 people now reach the CAD 170 biometrics
   maximum that 2 already reached. One read is shared, so the block and the panel never disagree.
6. **Fees not worked out (real case, not a stub).** On a released spouse or partner sponsorship case, "Fees" shows the API's
   `fees_why` once, with no amount and no total.
7. **Break: everyone split apart (six submissions).** Each submission shows its own total (5 × CAD 185 + CAD 100 for the
   under-14 child). "Total for the case: CAD 1025 · 6 submissions, each priced on its own", equal to the sum of the API's totals.
8. **Error and recovery.** When `/prepare` answers 500, the panel says "The submission could not be loaded" and shows no stale
   amounts. A reload brings the fees back, equal to `/prepare`.
9. **Wrong role by URL.** The client (`user-P`) opening `/cases/:id` sees no fee block and no CAD on the page. The server
   answers 403 on `/prepare`.
10. **Long names in Latin, Greek and Chinese script, at 1024 px.** The names wrap, nothing scrolls sideways, and the page equals `/prepare`.

**Rule test:** with the fee block removed from the page, step -25's own check finds neither "visitor visa fee" nor "CAD 170"
anywhere else, so the step fails when the rule is removed. **Packs on the checkpoint:** `C6.12.test.ts` 24/24.
`C6.12-breadth.test.ts`: -24 and -25 PASS; -22 and -23 FAIL (held). The builder's `tests/check_c612_fees_browser.ts`: 50/50.
**Timings:** `/prepare` takes 0.36 to 0.39 s. From the click on the case to the fees showing: 1.4 to 2.3 s, with the whole
case page loading.

## Findings
* **F1 (Major): "Not counted yet" covers the Why text at 1024 px and 200 % zoom (512 css px).** The amount text ends at x=283
  and the Why cell starts at x=256 (`fees.tsx:84`: the cell is `whitespace-nowrap` inside a 16 % column). It fits at 720 and
  1024 css px. Screenshot `nw-waiting-512.png`. WCAG 2.2 1.4.4 (failure F69, text obscured at 200 %); EXPERIENCE §2.12 [M].
* **F2 (Minor): decision codes on the officer's main path.** The basis sentence reads "(P-171)" and "(FQ-7)" (EXPERIENCE §5).
  These are the server's words, left by the approved concept for B133.
* **F3 (outside B5, for qa):** below 1024 css px the case page scrolls sideways to 900 px because of buttons in other panels
  (`inline-flex … whitespace-nowrap`, right edge at 900). Removing the fee block does not change it.
* **F4 (Minor): the words.** "CAD 1025" has no thousands separator (concept m7, kept on purpose). The basis and the why say the
  maximum twice ("… CAD 500 from 5 people applying together · … starts at 5 people applying together"). Split submissions are all
  named "One submission", so their captions repeat.
* **F5 (Minor): an open page does not refresh when a second tab changes the case.** Seen by the breaker too; the next read or a
  reload fixes it, and the block is read-only.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J4–J7: each submission's cost, line by line, in every state tried |
| Next step obvious | ½ | "Record the submission" is disabled with its reason. A waiting row names the date of birth but does not link to the question (Not built, concept m8c); finding it took me 3 wrong turns |
| Plain words | ½ | F2, F4 |
| Feedback and state | 1 | "Not counted yet", "Total so far", and a live re-price after the date of birth is saved (J5) |
| Correct data | 1 | The page equals `/prepare` in 10 states, and the rows add up to every total |
| Error recovery | 1 | J8 |
| Accessibility and screen sizes | ½ | axe clean, keyboard path, 1024 and 1440 px fine; F1 at 200 % |
| Speed | 1 | `/prepare` under 0.4 s; no extra request (one shared read) |
| Visual quality | 1 | Aligned table, team tokens, a quiet muted reason column (`r1-j1-fees-1440.png`) |
| Trust and sources | 1 | Linked sources with read date or page date, the Sample label, and IRCC's quote on the exempt row |

**Score: 8.5 / 10. Pass (8 or more, no 0).** To raise it: fix F1 (wrap or widen the amount cell), then F2 and F4 through B133.
**Not tested:** a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); recording a submission
(no checkpoint filing is Ready to file, so the receipt box was not opened).

## Round 2 (diff only, 1ea633935, reviewer)
**Copy:** `rev_b5` on :4445, configured checkpoint, stopped after. A scratch Playwright script, run twice, 19/19 both times.
**Journeys re-walked:** J2 (sizes) and J5 (a child with no date of birth). I reached the case by clicking it on the Cases list,
read it at 1024, 720, 512 and 400 css px, answered the date of birth, then reloaded. J6 (fees not worked out) on real
`sp.outside` and `fs.spouse` cases. J7 (split) with 3 submissions.
**Held:** "Not counted yet" wraps inside its cell at every width, and never meets the Why text (512 px: text ends x=235, Why
starts x=256). With nowrap put back in the browser the overlap returns (x=283), so the check can catch a regression. axe at
512 px finds 0 violations. The waiting line's total says "so far · 1 not counted yet", and drops it once the date of birth
is answered. The 3 tables have 3 distinct accessible names that list their filings. The page totals equal `/prepare`
(CAD 470 so far; case CAD 655).
**Findings:** Minor: at 400 css px the word breaks as "count|ed". Minor: "so far" also shows on a line already at its family
maximum.

| Criterion | R1 | R2 | Evidence |
|---|---|---|---|
| Accessibility and screen sizes | ½ | 1 | F1 closed at 512 px; axe clean; distinct table names |
| All others | as R1 | as R1 | Unchanged by the diff (next step ½, plain words ½) |

**Score: 9 / 10. Pass.** Not tested: a real screen reader; an intended user's unaided walk.
