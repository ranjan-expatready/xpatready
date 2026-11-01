# Review: one way to say each person (QA-77 / C11.12, #113, P-209) · commit 6eab6bc7

I did not build this. I reviewed branch `claude/screens-people-names` at 6eab6bc7 (one commit on origin/main 751cbc42) in the worktree /home/user/wt-names, with the web already built there. I used a fresh isolated copy, `isolated.sh rvwnames 4446 start` (database xr_studio_rvwnames), and never touched :4400. I ran the builder's check from a copy in /tmp, so no tracked screenshot was rewritten. My own walk is in /tmp/rvwn-scripts and its screenshots in /tmp/rvwn-shots. Nothing was stashed or committed, and `git status` is clean apart from the node_modules symlink. Cost: US$0.

## Verdict on the ask
- **Correct for the three surfaces it names.** `web/src/lib/people.ts:5-7` takes the card's own formatter (`plainWords`, P-161 (2)) unchanged and uses it in three places: the header (`combination.tsx:87`), the folded card (`questionnaires.tsx:98`) and the Questionnaires note (`questionnaires.tsx:35`). The data agrees too. The header reads `c.participants[].label` and the note reads `people.lines[].label`. Both are the stored label, which `checkPeople` sets to the typed label or else the library label (`engine/people.ts:30`). The card's `nameOf` falls back the same way, so the three cannot disagree on a name. The `max > 0` filter (#139) now lives in one place.
- **On all six sample combinations, the header, the card and the note give each person in identical words, on every tab.** Examples: vv.single `Applicant (always); Spouse or partner (travelling) (optional); Child (travelling), 0–4 (optional)`, sv.super_visa `Parent or grandparent (always); Spouse or partner (also visiting) (optional)`, lm.high_wage `Employer (applicant) (always); Representative (optional)`.
- **"; " is right for the header.** " · " already separates the header's facts ("… · people: … · Sample"), and "," sits inside a person's own words ("Child, 0–4"). So ";" is the only common separator that keeps each person readable as one unit. At 400 px, 1024 px and 1024 px at 200 % (512 CSS px) the line wraps with no sideways scroll. Nit, not a finding: "Spouse or partner (travelling) (optional)" reads as two brackets in a row. It is the card's agreed wording (P-161 (2)) and the typed label (P-209 keeps "(travelling)"), so it stays.

## Other pages that list people (grep of web/src: `participants`, `people.lines`, `(optional)`, min/max formatting)
| Place | Words today | Same way? |
|---|---|---|
| Header, every tab (`combination.tsx:87`) | `Child (travelling), 0–4 (optional)` | yes |
| Forms › Who can be, folded (`questionnaires.tsx:98`) | same | yes |
| Questionnaires note (`questionnaires.tsx:35`) | same | yes |
| **Overview › "Who can be in this application"** (`workspace/overview.tsx:50`) | `Child (travelling) · 0 to 4 · applicant`, `Applicant · 1 · applicant`, `Representative · 0 to 1` | **no** |
| Studio preview, `?view=studio` (`pages/preview.tsx:15,35`) | count labels "Children travelling" / "Spouses or partners travelling" / "`<label>` count" | names differ (pre-existing) |
| Preview by person (sample family chips) | `Principal applicant · 146 questions …`, `Child 1 …` | per-person instances, names agree; not a who-can-be list |
| Runtime pages (`web/src/runtime/*`) | no who-can-be list; out of scope (not configuration pages) | n/a |

## Findings, ranked
1. **Major: Overview still says each person a second way, on the same page as the header.** `workspace/overview.tsx:50` writes `{label} · {n or "a to b"}{" · applicant"}`. On /c/<vv.single>/overview the header reads `Child (travelling), 0–4 (optional)` and, a few lines below under the same heading as the Forms card, the chip reads `Child (travelling) · 0 to 4 · applicant`. The principal shows as `Applicant · 1 · applicant` against `Applicant (always)`. QA-77's own text names "header and Overview" (`qa/BUGS.md:34`), and the commit title claims "every page of a combination", so this is inside the ask and is not new scope.
   **Fix:** have the chip use `personWords(p.label, p)` and keep the applicant fact as a suffix, giving e.g. `Child (travelling), 0–4 (optional) · applicant`. Also add a step to `check_qa77_names_browser.cjs` that compares the `[data-overview-people] li` text, minus " · applicant", with the folded card's words. No test reads the Overview chips today (grep `data-overview-people` in tests: none).
2. **Should: the last "fail guard" step is a tautology** (`tests/check_qa77_names_browser.cjs:66-67`). It builds `oldHeader` from `folded` and asserts that the result differs from `folded`. That holds for any app output that has a principal, because it strips "(always)", so the step can never fail. The real discrimination already sits in the #113 pass steps. I checked offline that main's old header (`Applicant, Spouse or partner (travelling) (optional), Child (travelling) (0–4)`) fails the pass predicate, and the old names-only note fails the `includes("(" + folded + ")")` step.
   **Real guard, proposed:** read the stored participants by SQL, format them with the old header formatter (copied into the test as `oldPeopleWords`), and run the same header-equals-card predicate on that string. Assert that it returns false, which proves the check would catch a header in the old form. Also add a live negative on the page itself: the header's people segment must not match `/ \(\d+–\d+\)/` and must be split by "; " into exactly `names.length` parts.
3. **Minor (pre-existing, not this commit; record with QA):** `pages/preview.tsx:15` hard-codes "Children travelling" / "Spouses or partners travelling" by role. That ignores the typed label, so for sv.super_visa it says "travelling" where the person is "Spouse or partner (also visiting)". The screen is the secondary studio view (`?view=studio`). C11.12's one-name rule applies.
4. **Minor (carried, `check_qa77_names_browser.cjs:13`):** psql is still hard-coded to `/opt/homebrew/...`, and the `#139` comment in the middle of line 32 still comments out the tablist wait and `settle()`. Both were noted in review-qa77.md and are still open.

## Standards ([M] lines touched by this change)
Words per PRODUCT §4: person roles unchanged, typed labels kept (L7), Sample label kept in the header. Met. One wording rule for the folded line (P-161 (2)): met on Forms, header and Questionnaires; **not met on Overview** (finding 1). WCAG 2.2 A/AA (axe) on Forms, Questionnaires and Overview for wp.family: 0 violations. Keyboard: the note's "Change on Forms" link can be reached by Tab, and Enter lands with focus on the card's focus wrapper. Sizes: no sideways scroll at 400 / 1024 / 200 %. No page errors. Display only: no migration, route, authorisation or concurrency surface changed. Graph (`graph.mjs`): G1–G6 clean for this change (the one G3 item is the unrelated `GET /attachments/:id/file`).

## Tests
- `check_qa77_names_browser.cjs` on 4446: **15/15**, then **14/14** on a rerun (the sample-load step is skipped once loaded). Not flaky.
- The new pass steps fail on main's formats (shown above), so the rule's test fails when the rule is removed. The exception is the fail-guard step (finding 2), and there is no Overview coverage (finding 1).
- I did not rerun the builder's other suites (c16 11/11, w1 23/23, screen01 116/116, w115 55/55, x1 29/29). I accept them as reported, because the change is display-only and the header format they read was checked above.

## Journey score (reviewer, the one score for this check): 8.5 / 10. Detail in `journey-test-reviewer-2026-11-01-people-names.md`.

## Not checked
A real screen reader. Any intended user's unaided walk (D17/D20 stay with the founder). The approver role's view (same component; code read only). The studio preview's count labels live (they render only with `?view=studio`; code read).

Open: 1 Major (finding 1).

**Verdict: Block** on 6eab6bc7. To fix: (1) the Overview chips in the same words as the card, with an Overview step in the check; and (2), recommended in the same PR, replace the tautological fail guard with the real one above.
