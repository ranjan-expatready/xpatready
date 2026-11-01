# Review 2: X1b, filing tag on the Programs card (P-208)

Commit reviewed: **cdd2704c** (branch `claude/screens-x1b-filing-tag`). It is the fix 473fc716 plus a plain merge of origin/main. Earlier review: `review-x1b.md` on 7037ae00 (Block, M1). Reviewer: fresh context; did not build it.
App: isolated copy on http://localhost:4449 (database xr_studio_rvwx1b, fresh), web dist built from cdd2704c (has `Filing: `, no `Filed: `). US$0.
Bar: P-208 (`DECISIONS.md:12`), BACKLOG X1b (`BACKLOG.md:49`), card concept `W1-setup-checklist/concept-draft.md` §7, `STANDARDS.md`, `EXPERIENCE.md`.

## Verdict: Approve (Ship). No open Blocker or Major.

## The blocking point and the minors, checked with a fail case
| Point | Fixed? | Pass on cdd2704c | Fail case (my mutation, built and run on :4449, then restored) |
|---|---|---|---|
| **M1** "Filed:" broke the card suite | **Yes**. `programs.tsx:518` says `Filing: {filing}` in the title and the sr-only text, the same word as the Forms tab. `check_setup_card_browser.cjs:84` is unchanged (not loosened). | `check_setup_card_browser.cjs` **42 passed, 0 failed**; `check_x1b_filing_tag_browser.cjs` **11/11** (fresh DB), then **10/10** (sample already loaded) | sr-only set back to `Filed:` → card suite **41/1** (`FAIL C11.10 (fail case) … With an LMIA`) and X1b suite **9/1** (the Mixed screen-reader step). Both suites catch it. |
| m1 comments | Yes: `programs.tsx:7` and `:489` name the filing tag. | n/a | n/a |
| m2 "Checklists only" tag | Yes: `programs.tsx:503` shows a tag only for `FILING_KINDS` (`:515`: PDF only, Online only, Paper only, Mixed). | My probe fakes `/api/catalogue` in the browser: "Checklists only" → **no tag**; "Online only", "Paper only" and "Mixed: online, PDF and paper" → tags "Online only", "Paper only" and "Mixed", with "Filing: …" full words in title and sr-only. axe clean in that state. | With the gate removed, the card shows "Checklists only" (probe), **but the X1b suite still passes 10/10**. See m5. |
| m3 test names | Yes: the variable is `back`. The step names still list "Online only" (`:38`), but only the first step uses it, and that step covers the words in general. Not a finding. | n/a | n/a |
| m4 native title for "Mixed" | Not changed (it was optional). It still stands as Minor. | n/a | n/a |

## Findings (open)
**Minor m5: the m2 rule has no test that fails when it is removed** (STANDARDS: each rule has a pass case and a fail case). The sample cannot reach "Checklists only". Also, `check_x1b…cjs:35` copies the kinds list instead of importing it, so the test follows whatever the page does. Fix (optional): in the X1b suite, use `page.route("**/api/catalogue*")` to set one row's filing to "Checklists only" and assert there is no `[data-filing-tag]` on that card. My probe (`/tmp/rvw-x1b/probe.cjs`) shows that this works.
**Minor m4 (carried):** the full "Mixed" words are only in a native `title` on a span that cannot be focused. Screen readers get the sr-only text. Optional: use `Tip`.
**Nit:** `programs.tsx:511–514` has two JSDoc blocks one after the other. The first block lists three words, but the gate allows four ("Paper only" is a C1.6 word; it is not a finding, as review 1 said).

## Concept fit (BACKLOG X1b, P-208, F1 card)
The tag shows only on the card. It reads the catalogue's `filing` from the one `GET /catalogue`, so the value is not counted again and there is no request per row. The words are PDF only · Online only · Mixed. There is no tag without form lines. The List view has no tag (0 `[data-filing-tag]` in List). The change stays inside `programs.tsx` and the X1b test. The merge from origin/main only touches this lane's files through `contracts/programs.ts:219` (`problemWords`, F8), which the card does not use. No API or data change. Nothing outside P-208 was added.

## Use (author, keyboard only, sizes)
Keyboard only at 1024 px: Tab to Search, type "LMIA", then Tab to "Open: With an LMIA" and press Enter. The combination page opens (`/c/…`). The tag is never a Tab stop, which is correct because it is read-only. Accessibility tree: article → heading → trail → "✓ Live" → paragraph "Filing: PDF only" → button "Open: With an LMIA". No sideways scroll at 375, 400, 1024 or 1440 px, or at 512 px with deviceScaleFactor 2 (200 % zoom). Screenshots: `/tmp/rvw-x1b/cards-{375,1024,1440}.png`, `zoom200.png`, `card-lmia-zoom200.png`, `search-lmia-1024.png`. No page or console errors. List load: 592–837 ms.

## [M] lines touched by this change
STANDARDS: words per PRODUCT §3–§4 met ("Filing:" is the same word as the Forms tab). Rule tests are met for M1, and partly met for m2 (m5). No per-row request: met. axe WCAG 2.2 A/AA: met (real state and faked states). EXPERIENCE [M] 10 tooltips: met through the native title, with the m4 caveat. All other [M] lines are unchanged from review 1.

## D-scores (only what this change touches)
D1 5 (P-208 words, card only) · D2/D4/D6/D7 n/a (read only, no AI) · D5 5 (reload follows the server) · D8 5 · D9 5 (button unchanged) · D10 5 ("Filing:" matches the Forms tab) · D11 5 · D12 5 (quiet 12 px outlined tag) · D13 4 (m4) · D14 5 · D15 5 (no extra request) · D16 4 (m5) · D18 4 (no Sample mark on the card tag; the Forms tab carries it) · D17, D20 simulated only · others n/a.

## Graph
`graph.mjs --check`: G1 0 · G2 0 · G3 1 · G4–G6 0 (review 1 had G3 2). Nothing here concerns X1b.

## Journey score (reviewer): 9.5 / 10
Pass (no 0). Details: `journey-test-reviewer-2026-11-01-x1b-2.md`.

## Files and data after my run
Mutations A (`Filed:`) and B (no gate) were made in `programs.tsx`, built and run. I then restored the file with `git checkout` and put back the web dist built from cdd2704c from a copy (checked: "Checklists only" gives no tag again, and the X1b suite passes 10/10). I restored the screenshots that the suites rewrite (`F1-setup/screenshots/x1b/01…png`, `W1-setup-checklist/screenshots/card/*.png`) with `git checkout`. The LMIA lines are back on PDF_UPLOAD (the suite resets them). `git status` shows only the untracked `node_modules` symlink, plus these two reports.

## Could not check
A real screen reader (I used the accessibility tree only). A real "Online only" or "Checklists only" combination (faked in the browser only, because the sample refuses them). D17 and D20 need an intended user's walk.

**Verdict: Approve** on cdd2704c. Optional follow-ups: m5, m4, nit.
