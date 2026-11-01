# Review: QA-119, the combination header's Next step follows the setup checklist (commit 11485f0d)

**Reviewer.** I did not build this. **Scope:** `git show 11485f0d` only. Its parents (#206, #210, X1 C2, X1 C3) are approved already.
**Changed files:** `contracts/setup-checklist.ts` (`LANDED_FOCUS`, `nextStepHref`), `web/src/pages/combination.tsx` (`NextStep`), `pages/workspace/overview.tsx`, `components/setup-strip.tsx`, new `tests/check_qa119_next_step_browser.cjs`, `tests/fixtures/steps-before-forms.cjs`, four older checks.
**Sources:** the tech lead's order in the item; concept v4 `W1-setup-checklist/concept-draft.md` §5, §6, §7 "Copy"; EXPERIENCE #5, #12.
**Environment:** web app rebuilt from 11485f0d, and `tsc --noEmit` is clean. Own copies: `rv_q119` on :4449 (walk and new check), `rv_q119b` on :4448, `rv_q119c` on :4447, `rv_q119d` on :4446. No live AI (US$0).

**Verdict: Approve on 11485f0d.** No Blocker or Major. Three Minors to fix or record. One note for the tech lead.

## Suites rerun on 11485f0d
* `check_qa119_next_step_browser`: 25/25 on a fresh copy (:4449).
* `check_w1_start_setup_browser`: 43/43 (:4448, fake launcher, US$0).
* `check_x1_overview_strip_browser`: 28/28 (:4447), unchanged.
* `check_screen01_browser`: not reproduced. It stopped at its first setup step, "sample inputs load through the form intake", because my fresh copy reported the sample already loaded. That is my environment, as in the C3 review; the builder reports 116/116.
* Not rerun: cost warning, screen02 slice 2.
* Graph: G1 0 · G2 0 · G3 2 · G4–G6 0, as on C3. This commit adds no page and no route.

## Concept and order fit
* **One next step per page (P-157, P-161 (1), EXPERIENCE #5): met.** I compared the header, the strip's ● Next / ⧗ row, that row's first item and the tab badge.
  * They agree on all 6 sample combinations, for the author (user-A) and the expert (user-C). The check covers this, and I walked Super visa, Study permit, Visitor visa and With an LMIA by hand.
  * The approver (user-B) gets the waiting line and no button.
  * With an LMIA is Live with pages back-filled. It shows step 1 to the author, as concept §6 asks.
* **No landing place: met.** A forms item with no landing place links to `/c/<id>/forms` with no `?focus=`. Items that do have a place keep their focus: the expert's button on Study permit lands focused on `pages:record`.
* **Load error: met.** The strip shows "The setup steps could not be loaded · Retry" (`overview.tsx:27`), and Retry shows the loading line and then the strip.
* **Sure/not-sure tooltip: met.** It uses the concept §7 copy verbatim (`setup-strip.tsx:33`), on the tier words, is reachable by keyboard and is linked with `aria-describedby`. The pages row carries no tier words (C3 behaviour, unchanged), so the tooltip appears on the people row only.
* **Concept §7 versus the order.** Concept §7 says the strip replaces the header "Next step" box. The tech lead's order keeps the box and feeds it from the checklist. I judged against the order. The C3 review left this question open for the founder.

## Design point: paired steps (`combination.tsx:138,148`)
**Sound.** The header acts only when three things hold:
* the checklist's next item and the catalogue's step are the same kind (Map forms = `draft_ai`, Add forms found = `add_from_library`, Find forms = `add_forms`, View AI progress = `view_progress`);
* the words come from the checklist;
* the button is shown only when `viewer.filled` (the server's duty and tier table), or for View AI progress.

In every other case the header links to where the item is done. Nothing is worked out in the browser.

Visitor visa, walked:
* "Add 1 form found" added the form from the library and the header moved on to "Map 1 form".
* "Map 1 form" opened the cost-checked launch dialog, and nothing ran before Start.

Putting the combination-wide launch behind steps 1–2 follows the concept's step order. Per-line Draft with AI is unchanged.

## Code
* **No new write path.** The server checks are the existing ones: the approver's `POST /official-pages/confirm` returned 403, and the expert's `PATCH /people` returned 403.
* **No per-row requests.** The header reads the summary the page already loads, and the session request was removed.
* **No migration.**
* **Rule tests.** `nextStepHref` is tested both ways (with and without a landing place). The header/strip/badge equality fails if the header goes back to `row.nextAction` (the Super visa step).

## D1–D20 (this change only)
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | Order met; concept §7 "no header box" superseded by the order (noted) |
| D2 | 5 | No new writes; 403s hold |
| D3 | 5 | One `itemHref`; header, strip and badges read one checklist |
| D4 | n/a | — |
| D5 | 4 | Reload and back keep the state; Retry recovers; Retry drops focus to `<body>` (m2) |
| D6 | n/a | — |
| D7 | 5 | AI mark on Map forms and View AI progress; launch dialog before any run |
| D8 | 5 | "Next step · <step name>" names the step |
| D9 | 4 | One next step per page; steps 1–2 land on read-only places until F2 (note) |
| D10 | 5 | Waiting line in the concept's words; tier tooltip present |
| D11 | 4 | Error, loading and waiting states present |
| D12 | 5 | Builder screenshots qa119/01–03; my 400 px and 1440 px shots |
| D13 | 3 | axe clean; no sideways scroll at 400, 1024 and 200 %; "See it on …" and Retry show no focus (m1) |
| D14 | 5 | Team Button, Tip and tokens |
| D15 | 5 | Card to the header in 339 ms; one summary request |
| D16 | 4 | New rules pass and fail; paired Find forms and View AI progress untested (m3) |
| D17 | — | Simulated only |
| D18 | 4 | Who it waits for, and why ("No page matches") |
| D19 | n/a | — |
| D20 | — | Simulated only |

## Issues
1. **m1, Minor, Must: no visible focus on two new controls** (EXPERIENCE #12 [M], WCAG 2.4.7).
   * `combination.tsx:159` "See it on …" link: when focused, computed `outline-style: none` and `box-shadow: none`.
   * `overview.tsx:27` Retry button: same.
   * Cause: the app-wide `:focus-visible { outline: none }` (C3 m1).
   * Fix: give both the strip's `LINK_FOCUS` classes.
2. **m2, Minor, Should: Retry loses focus.** The button unmounts, so focus falls to `<body>` (`overview.tsx:27`).
   * Fix: move focus to the strip heading, or to the loading line, when the strip returns.
3. **m3, Minor, Should: the paired Find forms and View AI progress have no check** (D16).
   * The S3 fix 2 step ("Find forms focuses the finder's button") was replaced in `check_w1_start_setup_browser.cjs:91-96`. Removing `find_forms` or `view_ai` from `PAIRED` now fails no check.
   * Fix: in `check_qa119`, finish steps 1–2 on High-wage position with the fixture (its catalogue step is `add_forms`), click the header and assert focus on `[data-find-forms]`.
4. **Note, Should, record only: `LANDED_FOCUS` lives only on the client** (`contracts/setup-checklist.ts:130`). The server's `next.href` and the strip's links (`setup-strip.tsx:64`) still carry `?focus=forms:lines` (and similar) that nothing answers. The header and the strip therefore link to one item by two URLs. The result is harmless, but the list must be kept by hand.

**Note for the tech lead (not counted against this commit).** The header now leads to steps 1–2 before forms F2, so its primary button can land on a read-only place:
* With an LMIA, author: "Confirm the checklist page" lands on "Proposed by the rules, not confirmed", with no button.
* High-wage position, expert: "Confirm who can apply" lands on a people card whose only button is "Show", and `PATCH /people` answers 403 for the expert.

So no sample combination can reach the header's Map forms (the combination-wide AI launch) through the product until F2. This was ordered, and it is declared in the item.

## Could not check
* A real screen reader.
* D17 and D20: no intended user walked it.
* The paired Find forms / View AI progress buttons in the browser: no product path reaches them before F2. On High-wage position the expert's people save was refused (403), so I could not set that state up.
* Double-click on the paired Add forms found: the sample state that offers it was used up by the check.

## Housekeeping
* My runs of `check_x1_overview_strip_browser` and `check_w1_start_setup_browser` rewrote 14 tracked screenshots under `screens/F1-setup/screenshots/x1-strip/` and `screens/W1-start-setup/screenshots/`.
* My attempt to restore them with `git checkout --` was refused by the permission system, so they are still modified in this working copy.
* They are not part of this review. Restore them with `git checkout -- <path>` before committing.

Journey score (reviewer): **9/10, pass.** See `journey-test-reviewer-2026-11-01-qa119.md`.

**Verdict: Approve on 11485f0d.** Blockers: none. Majors: none. Minors: m1 (Must), m2, m3; one note.
