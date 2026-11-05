# Journey test (reviewer): B114, QA-262, commit 87385d60f, 5 Nov

Reviewer agent. This is the one journey score for this check. Copy `b114r` on :4452, fresh database. Setup by the same people's steps as the check (API; a condition from the Saved run, US$0, live AI off). Then a person's path in headless Chrome: clicks, typing and reading only. Headless so as not to take over the Mac; I read the screenshots afterwards. Screenshots stay in my scratch folder and are not committed; the builder's walk is `screens/B114/*.jpg`.

## Journeys
1. **Author, reviewer and approver, main path:** "Someone approved a condition on Visitor visa. I did nothing on Study permit. Release it."
   * The approver approves the condition on To review. Study permit's Review shows 0 problems and no Hiding.
   * Author submits, reviewer selects all and signs, approver presses Approve and release: **201 in 1,382 ms**, "Released version 1", Live, draft matches the release.
2. **Keyboard only, Express Entry:** Tab and Enter through all three people: 42 tabs to Submit, 39 and 1 to Select and Sign, 43 to Approve and release. **201.** It works, though the tab runs are long.
3. **Recovery, double press, Spouse:** answers 201 then 409. One release exists. The screen shows success, then "This already exists, or someone else saved the same thing…" (Minor 4). A reload shows the true state.
4. **Error, a combination that really asks the question, With an LMIA:** Hiding is shown, "1 to fix", and Submit is off with "Fix the problems first". The rule held. The sentence repeats itself (Minor 5).
5. **The step across the boundary:** the case area's Open a case lists the released rows, Study permit among them. Opening B114R-1 lands on the case, "Release 1".
6. **Alternate: a library edit moves a question out of the only chosen section holding it** (Library › Fields › Section, a real screen). Review shows 0 errors and two "removed" lines; signing works; then **409 on both presses**, with words that send the person round again (Minor 1). This is on main too.
7. **Wrong role:** at Approve and release, the author finds it off with "Only the approver duty can release". The server's refusal is not re-tested here; the walk covers the button.
8. **Empty state:** after release, "The draft is identical to the released version."

## Replay as checks
* `tests/check_forms_b114_condition_other_combination.ts`: **57/57, exit 0** on the reviewed commit, one run. I did not run it twice on the commit. Its sibling packs passed once each.
* Review tab, author and released states: **axe 0** (WCAG 2.2 A/AA tags) at 400, 512 (1024 at 200 %), 1024 and 1440 px, with no sideways scroll. 400 px is usable (screenshot read).
* Console and page errors: the walk stopped at its step 6 on a bad locator before printing its error count, so I have **no count**, including for 5xx answers. Step 6 was walked again by a separate script, without an error listener.
* Timings: Review loads 750–932 ms against the 1 s budget. The release is not budgeted.

## Data underneath
* After steps 1–3: Study permit, Express Entry and Spouse hold one release each, version 1, and 3 pack versions exist. So a double press left no duplicate.
* Draft and frozen fingerprints are equal after every 201, read by API in the old-release, shared and withdrawal runs (`review.md`). The study-permit walk's own release shows "draft matches the release".
* Roles: the check's own Submit, sign and approve use the three people; the walk confirms what each sees. Audit lines were not read one by one here.

## Break it
* Foreign condition, shared question, withdrawn condition, old release replayed on the fix, shuffled rows, four mutations: see `review.md`.
* Not tried, because no input field or file route changed: very long and non-English text, hostile files, two tabs.

## Score out of 10
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 2 |
| Next step obvious | 1 | The three step cards, then Open a case |
| Plain words | ½ | Journey 6's refusal misleads; journeys 3 and 4 |
| Feedback and state | 1 | Release message, Live, version table |
| Correct data | 1 | One release each; fingerprints equal; 57/57 |
| Error recovery | ½ | Journey 6 gives no way out; moving it back works but nothing says so |
| Accessibility and screen sizes | 1 | axe 0 at four widths, keyboard-only release |
| Speed | 1 | Under 1 s to read; release 1.4 s |
| Visual quality | 1 | Team look; screenshots read at 1440 and 400 |
| Trust and sources | 1 | Demo release, Sample and AI-proposed labels; second person on the condition |

**Score: 9/10, no criterion at 0. Pass.** Most valuable fix: journey 6's refusal should say what moved and what to do (Minor 1).

## Could not test
A real screen reader; a visible browser; an intended user's unaided walk (D17 and D20 stay with the founder); the console error count for the whole walk (above).
