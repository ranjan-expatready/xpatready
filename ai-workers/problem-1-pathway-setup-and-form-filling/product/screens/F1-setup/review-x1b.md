# Review: X1b, filing tag on the Programs card (P-208)

Commit reviewed: **7037ae00** (branch `claude/screens-x1b-filing-tag`, based on origin/main c582e8d8). Reviewer: fresh context; did not build it.
App: isolated copy on http://localhost:4444 (database xr_studio_screens_x1b), web dist built from this commit (contains `data-filing-tag`). US$0.
Bar: P-208 (DECISIONS row in origin/lead/2026-11-01-queue-fix, line 10), board v4 card (`W1-setup-checklist/concept-draft.md:64`, "five things only", P-208 adds the tag), `STANDARDS.md`, `EXPERIENCE.md`.

## Verdict: Block (Changes needed): one Major

## Findings

**Major M1: the existing card suite fails with this change. The builder's "42/42" claim does not reproduce.**
`tests/check_setup_card_browser.cjs:84` (the C11.10 fail case for the old facts line) bans `Filed:` in a card's text. The new tag's screen-reader text is `Filed: PDF only` (`web/src/pages/programs.tsx:516`), and innerText includes `.sr-only` text. Run twice on :4444: **41 passed, 1 failed**, `FAIL C11.10 (fail case): no status chip, Next line, facts line, rule code or release number on a card — With an LMIA … Filed: PDF only`. The merge-queue check would fail on this suite.
Fix (preferred): word the hidden text and the title **"Filing: PDF only"** / **"Filing: Mixed: online and PDF"**. "Filing:" is the label the Forms tab already uses for the same value (`web/src/components/channels.tsx:48`, `web/src/pages/workspace/forms.tsx:100`), so the card and the tab use the same word and the old facts-line ban at :84 stays as it is. Update `check_x1b_filing_tag_browser.cjs` (the `/Filed: Mixed: online and PDF/` assertion) to match. Do not loosen line 84.

**Minor m1: the comments still say five things.** `programs.tsx:7` ("A card shows five things only") and `programs.tsx:489` (SetupCard's doc comment) do not list the tag. Add "and its filing tag (P-208)".

**Minor m2: the card can show a word the decision does not list.** `filingKind` (`engine/channels.ts:103`) returns **"Checklists only"** when every line is a checklist or Not needed. `r.filing` is then non-null (`api/src/programs.ts:223`), so the card shows a "Checklists only" tag and screen readers hear "Filed: Checklists only". That is not a filing method and is not one of P-208's three words. I could not reach this state in the sample (Not needed is refused without an account record), so it stays Minor. Fix: show the tag only for "PDF only", "Online only", "Paper only" and "Mixed…". "Paper only" is a C1.6 word that P-208 does not name; keeping it is consistent with the catalogue and is not a finding.

**Minor m3: the test leaves out part of the rule.**
(a) "Online only" appears in the step names (`check_x1b…cjs:2,38,45`), but no step asserts it. The variable `online` (:57) holds the "PDF only" read-back. In the sample, 2 of the 6 LMIA form lines refuse ONLINE (HTTP 400), so a fully online combination cannot be set up through the API. Rename the variable and drop "Online only" from the step names, or assert `FILING_TAG("Online only") === "Online only"` directly.
(b) Each rule has a pass case and a fail case: tag equals filing / no tag when filing is null; "Mixed" is shortened / full words in title and sr-only. I checked by reasoning: removing the tag, not shortening, showing a tag for null, or dropping the sr-only text each turns a step red. The second fail step (:60) adds nothing beyond :59. The 11/11 count is 10/10 here because the sample was already loaded.

**Minor m4: sighted keyboard users cannot read the full "Mixed" words.** The full words ("Mixed: online and PDF") are only in a native `title` on a span that cannot be focused. The trail uses the same pattern, and screen readers get the sr-only text. `EXPERIENCE.md` [M] 10 asks for tooltips on statuses, and the card already wraps its progress line in `Tip`. Optional: use `Tip` for consistency.

## The questions asked
* **Words vs the decision:** "PDF only", "Online only" and "Mixed" match P-208 exactly. Every "Mixed: …" variant is shortened, including the 3-channel one; I saw "Mixed: online, PDF and paper" give "Mixed". Words beyond the three: see m2.
* **Screen-reader reading:** the accessibility tree reads `article "…With an LMIA, ✓ Live"` → heading → trail → "✓ Live" → paragraph "Filed: PDF only" → button "Open: With an LMIA". The article's aria-label summarises the card's name and state (progress, Needs you). Filing is a fact that is read in order inside the card. Leaving it out of the label is **fine**: it keeps the label short when people jump between articles. Only the prefix word needs to change (M1).
* **Visual weight, 375–1440 px:** 12 px muted text (rgb 89,89,89, about 7:1), a 1 px light border, 19 px high, 65 px wide ("PDF only") or 48 px ("Mixed"). It is quieter than "✓ Live" and the primary button. It adds about 25 px to the card (150 → 175), and its grid row stretches to match. Buttons stay aligned (`data-card-act` top equal across the row). No sideways scroll at 375, 400, 1024, 1440 or 200 % zoom (512 px). Screenshots: `/tmp/rev-x1b/card-{375,1024,1440,mixed,zoom200}.png`, `row-1440.png`.
* **List view:** it does not show the tag, which is correct. P-208 names the card only, and the concept fixes the List row's content (P-26). Not a finding.

## Standards and code
* No API or data change. The value comes from the one `GET /catalogue` (no per-row request) and is not counted again on the page. axe WCAG 2.2 A/AA is clean in the PDF and Mixed states. No page or console errors. List loads in 473 ms.
* Graph (`graph.mjs --check`): G1 0 · G2 0 · G3 2 · G4–G6 0. None of these concern X1b.
* D-scores: only the dimensions this change touches moved. D7 words, D9 accessibility and D12 tests are held back by M1, m3 and m4. D17 and D20 are simulated only.

## Data after my run
I set the LMIA lines to Online, Paper and Mixed, then put every line back to PDF_UPLOAD (API read-back: all 8 lines PDF_UPLOAD, card "PDF only"). The isolated database also holds "Scale card 022–150" categories added by `check_setup_card_browser.cjs:186`; that suite does not remove them. I restored the W1 card screenshots that the suite rewrote (`git checkout` on those PNGs). I changed no other file.

## Journey score (reviewer): 9 / 10
Pass (no 0). Details are in `journey-test-reviewer-2026-11-01-x1b.md`. The verdict is still Block because of M1.

## Could not check
A real screen reader (VoiceOver/NVDA): I used the accessibility tree only. An "Online only" or "Checklists only" combination in the browser (the sample does not allow either). D17 and D20 need an intended user's walk.

## To fix before Approve
1. M1: rename the "Filed:" prefix to "Filing:" in the sr-only text and title (`programs.tsx:516`), update `check_x1b_filing_tag_browser.cjs`, rerun `check_setup_card_browser.cjs` to 42/42.
2. Minors m1–m4 are optional in this PR.
