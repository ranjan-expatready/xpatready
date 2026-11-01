# X2 review: concept v3 and X2b board (PR #167, commit 014b19cc)

Reviewer (fresh context, did not write it), 31 Oct 2026. Documents only, so this uses screen-review only where it applies to a concept. There is no app, code, graph or D1–D20 run. I read the diff `origin/main...014b19cc`, `challenge.md`, `concept-draft.md` v3, DECISIONS P-106 and P-108, and `samples/programs.json`. I opened `design/draft-x2b-board.html` in Playwright Chromium at 390, 1024 and 1440 px, all 7 states, and ran the add → toast → Undo flow.

## (a) The four records against P-106 and the founder's answers
* **They agree.** CAPABILITIES C1.3 is now the case link in M3, with "Follows" as a suggestion only. C1.5 says forms and documents come first. PRODUCT §4 line 47 reads "Relies on employer case … (on a case)". BACKLOG F1 drops C1.3 and keeps "X2 (X2b only)". BACKLOG X2 is now X2b only, with C1.3 as M3's case link. All four cite PR #167.
* **Minor m1:** C1.3 says the link pre-fills "facts **and documents**". P-106 names facts only (name, address, LMIA number). C1.3 now also overlaps C11.5 (M3, "case link to an employer case pre-fills employer facts"). Point one at the other.
* **Leftovers that still say links between combinations are configuration.** I am listing these, not fixing them:
  * `domain/TAXONOMY.md:62`: "'Supported by' link carries named facts and documents".
  * `DEMO.md:8`: Combination B is "Supported by" Corporate › LMIA (link only…).
  * `lanes/screens.md:26,34`: "(4) linking combinations and copying a line (C1.3, C1.5)".
  * `screens/03-combination-workspace/concept.md`: BR-12, BR-13 and the Links card. This is the agreed concept X2 adapts, and it was never marked as amended by P-106.
  * History or records only, which can stay: `decisions/P-01-P-36-foundation.md` (P-13 text), `design/journey-v2.dc.html`, the 01 and W1 concepts. `research_notes/…/ircc_filing_units.md:54` is research.

## (b) concept-draft.md v3
* **What holds:**
  * The status line and the "Founder's answers" paragraph record all three answers correctly.
  * §3b BR-C1 covers M4's missing outcomes: person not in the application, an "only if" fact that is not asked, a retired form or an open retire, and "waits: submitted for review", left unticked. It also gives remove its own outcomes.
  * §3b BR-C2 covers M5: one batch id, one transaction, an idempotency key, batch Undo refused while naming the target that changed (the `fact-sources.ts` pattern), and the copy-from endpoint.
* **Major M1: the rest of the document still describes the pre-answer design and contradicts §3b.** A builder reading it top to bottom gets two BR-C1s and two BR-C2s. The stale parts:
  * The challenge callout says "X2a below is parked … until the founder answers Q1" and "the board is redrawn once Q1 is answered".
  * The "Slices" line still lists X2a.
  * §1 X2a and §2 still cite P-59, which is superseded. §2 also keeps "a fact carried by a link counts as asked", which challenge M2 rejected.
  * §3 still holds the old BR-C1 ("four outcomes") and the old BR-C2 ("Undo is per combination until it is submitted"). M5 showed that BR-C2 promise is false.
  * §4 points to `draft-x2-board.html` and says "Add to 3 combinations". The board says 2.
  * The §6 tests are written against the old rules: "C1: each of the four outcomes", "C2: Undo per combination". There are no tests for M4's outcomes, the idempotent replay, or the batch-Undo refusal.
  * §6b lists "the sample's two links … loaded with the sample" as scaffolding. That conflicts with P-106 and P-108.
  * *Fix:* mark §1 X2a, §2's link rows, BR-L1..L5 and §5's link copy as "Dropped (P-106)", or move them to a history note. Replace §3's BR-C1 and BR-C2 with §3b. Point §4 at `draft-x2b-board.html` and say "Add to 2". Rewrite the §6 C1 and C2 tests as a pass and a fail per §3b outcome, plus a replayed key that does nothing, plus batch Undo succeeding and refused. Drop the §6b sample links.
* **Should S1: M4's copy rule is not written.** M4 asked for it: who fills it, copies, age and signer are copied; the channel is kept only if the target's account accepts it; the only-if is copied only when every fact it uses is asked in the target. BR-C1 implies this but does not state it. Add one line.
* **Major M2: the Definition of Ready is not honest on one box.** "[x] BACKLOG X2 row says X2b (built after F8)" is ticked, but the X2 row does not say "after F8". BACKLOG line 37 orders screens as F1 → F8 → F5, and X2b sits in F1, so it comes *before* F8. The status line repeats "after F8". *Fix:* either untick the box and correct the status line to F1's order, or ask the tech lead to change the order. Do not claim it. The unticked "board clicked through by the founder" box is honest.

## (c) X2b board
* **Checked in Playwright:**
  * Every state renders with no console or page errors.
  * Opening a dialog focuses its first control. Esc closes all four dialogs.
  * `scrollWidth` equals `clientWidth` at 390, 1024 and 1440 px in every state, so there is no sideways scroll.
  * The state bar sits above the backdrop, which fixes challenge m6.
  * Add → toast → Undo → refusal works, and the refusal names Super visa and what changed.
  * The trails match `samples/programs.json` (Visitors, Study permits, Work permits › Open work permit › Post-graduation, Family sponsorship › Dependent child, Citizenship › Grant of citizenship).
  * The title, the h1 pill, the footer note and the channel "Cannot" row all carry the Sample label.
* **Major M3: one BR-C1 outcome is missing.** "Cannot: the form is retired, or its retire is open" appears in no state. The other seven add outcomes and the three remove outcomes are all drawn. *Fix:* add one row to the add preview.
* **Minor m2:** only the refusal is drawn for batch Undo. Add one success state ("Undone in 2 combinations").
* **Minor m3:** at 390 px the outcome table (min-width 520) scrolls inside the dialog, so "What happens", the deciding column, is cut off. The 260 px sticky state bar also covers the dialog's heading (board chrome). Stack the outcome under the trail below about 600 px.
* **Minor m4:** the "Letter of invitation" checkbox has aria-label "Parent: cannot", but the row says "child or grandchild in Canada". The dialogs have no `aria-modal` or focus trap. These are board-only issues; the build's dialog component covers them.

## (d) Names and immigration claims
* No personal names; only roles appear.
* Immigration content is either labelled Sample (the board's note covers every form, trail and outcome) or comes from the sample structure. The IRCC-channel "Cannot" row is labelled Sample, which fixes challenge m7.

## Journey score (reviewer; on the board only, simulated): 8/10, pass
Task completed 1 · next step obvious 1 · plain words 1 · feedback and state ½ (Undo success not drawn) · correct data ½ (the concept contradicts itself; no data to check) · error recovery 1 · accessibility and screen sizes ½ (m3, m4) · speed ½ (cannot be measured on a board) · visual quality 1 · trust and sources 1. D17 and D20 stay with the founder. Details: `journey-test-reviewer-2026-10-31.md`.

## Could not check
The team's code and `sources/` are not in this copy. There is no running app, test, graph or axe run (documents only). A real screen reader was not used.

**Verdict: Block** (commit 014b19cc). Fix: M1 (concept v3 still carries the superseded X2a design and the old BR-C1, BR-C2 and tests beside §3b), M2 (the DoR's "after F8" box is false against BACKLOG's order), M3 (the board lacks the "form retired, or retire open" outcome). S1 and the Minors can ride along. The leftovers in (a) go to the tech lead.

## Re-review at c720529f (31 Oct 2026)

I read the diff `014b19cc..c720529f` and the new `concept-draft.md`. I re-ran the board in Playwright Chromium at 390, 1024 and 1440 px, across all 8 states, the add → toast → Undo flow, and the dialog geometry.

### Fixed
* **M1 fixed.** The concept is now X2b only and consistent from top to bottom:
  * no X2a, no P-59, and no "carried fact counts as asked";
  * BR-C1 lists every add and remove outcome, and BR-C2 says what is copied (S1 fixed);
  * BR-C3 covers one batch, one transaction and idempotency; BR-C4 covers batch Undo, its refusal, and that a released target is never undone;
  * the §6 tests cover every outcome plus the retry and both Undo paths;
  * §6b has no scaffolding;
  * the board pointer is right, and §7 has no open questions.
* **M2 fixed.** BACKLOG X2 says "Built after F8 (tech lead, 31 Oct)", so the DoR tick is now true.
* **M3 fixed.** The copy-from dialog shows "Cannot: the form's retirement is open (IMM 5257 SCH1)", and the add preview has a retired row.
* **The Minors are fixed:**
  * there is an "Undo done" toast, and add → Undo → done works;
  * every dialog has `aria-modal`;
  * the "Letter of invitation" label matches its row;
  * dialogs now open below the state bar (bar bottom 263 px, dialog top 275 px at 390);
  * the dialog tables wrap at 390 px (`scrollWidth` 324 = `clientWidth` 324), so no column is hidden;
  * C1.3 now says facts only;
  * there is still no page sideways scroll in any state at 390, 1024 or 1440, Esc closes all four dialogs, and there are no page errors.

### Still open (Minor, not blocking)
* **n1:** the add preview's row "IMM 5476 is retired in the Form library" cannot happen per target. Retiring a form applies to the whole library, so every target would be "cannot", or the copy would not be offered at all. Drop that row, or make it a refusal for the whole dialog. The copy-from row already shows the outcome correctly.
* **n2:** BACKLOG F1 still folds in "X2 (X2b only)" and C1.5, while line 37 orders screens F1 → F8 and the X2 row says "after F8". The records disagree slightly. The tech lead should say in F1 that X2b follows F8.
* **The leftovers from (a)** (TAXONOMY:62, DEMO:8, lanes/screens.md:26,34, Screen 03 concept BR-12/13) go to the tech lead in the PR, as agreed.

**Journey score (re-run, board only, simulated): 9/10, pass.**
* Feedback and state is now 1 (Undo done is drawn).
* Accessibility and screen sizes is now 1 (wrapping, `aria-modal`, labels fixed).
* Correct data stays ½ because of n1. Speed stays ½ because a static board cannot show it.

**Verdict: Approve** (commit c720529f). There are no open Blocker or Major findings.
