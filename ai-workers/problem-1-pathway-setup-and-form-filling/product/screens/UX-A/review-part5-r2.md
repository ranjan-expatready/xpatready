# UX-A part 5: review round 2

Reviewer agent (did not build). Exact commit **d658e76a**. Part 5's own diff is `2a43062d..d658e76a`; 2a43062d is 2eb854b9 rebased onto part 4's later fixes. The web build was checked against this commit: it was built at the commit time, and the old "(not available here)" label is not in the bundle. Isolated copy `rev_uxa5` on :4446 (never :4400), stopped at the end. US$0: no AI call, nothing priced. My scratch copies of the suites change only the Linux psql path, module paths and the screenshot folder. The committed screenshots are untouched. Walk screenshots: `/tmp/claude-0/-home-user-xpatready/d1a19a26-d4f8-5a0b-9a61-250603ccb5cc/scratchpad/r5b/walk/`.

## Verdict: Approve (no open Blocker or Major)

## Round 1 findings, re-checked
| # | Round 1 | Now | Evidence |
|---|---|---|---|
| M1 | The check was flaky and its waits failed silently | **Closed** | `tipOf` presses Escape and waits for no tip, then reads the tip by its words, and both waits now fail loudly (`check_uxa5_tooltips_browser.cjs:35-44`, `:63-64`). **8 runs: 33/33 every time** (round 1: 2 failures in 10). |
| m1 | Screen readers heard "question s" / "stay s" | **Closed** | `removeWhy()` is one string for the tip and the description (`questionnaires.tsx:44`). Accessibility tree: "Not here: its 7 questions are placed … and stay asked", and for a 1-question section ("Submitted documents") "its 1 question is placed … and stays asked". There is a fail step for it. |
| m2 | A phone could not reach the reason on Forms and Structure | **Closed** | `Tip explain` is a controlled Radix tooltip that also opens on a click or tap, and a tap elsewhere or Escape closes it (`components/status.tsx:15-32`). At 400 px with touch, a tap shows the reason on all three screens, and opens no panel on Structure (`walk/t-s-400.png`). Tap elsewhere closes it; a second and third tap keep it shown. The check has a tap step per screen. |
| m2/m3 (keyboard) | Enter hid the reason | **Closed** | Structure (my probe): Tab opens the tip; Enter and then Space keep it open, open no impact panel and no details, and focus stays on the action; Escape closes it and focus stays. Questionnaires and Forms: the check's Enter steps pass. |
| m3 | Readers (approver) had no description | **Closed** | The span renders whenever the action is greyed (`structure.tsx:417`). As user-B: description "Only a configuration author deletes, retires or restores names. You can read everything." There is a fail step: 0 missing references. |
| m4 | Records | **Builder's part closed** | `qa/built/UX-A.md` now limits the change to the three named screens and says the Form library's "Still used" lines are not part of it. Still for the tech lead: record the amendment of P-116 **and P-147 (1)** under P-273, and decide on a follow-up row for the Form library (`library-forms.tsx:183`). |
| m5 | "Not available" said three times | **Closed** | The name is now "Remove from questionnaire: Application details" (same as the visible label, WCAG 2.5.3), plus disabled, plus the reason. |

## Regression checks (the shared `Tip` and `RowAction` changed, so every lifecycle row is touched)
* `check_uxa5_tooltips_browser.cjs`: 33/33 × 8.
* `check_w1_structure_browser.cjs`: 141/141 on a fresh copy.
* `check_qa92_95_browser.cjs`: 23/23; the enabled Remove still asks first and offers Undo.
* `check_c119_library_items_browser.cjs`: 29/29.
* `check_forms_s4_library_browser.cjs`: **113/113 on a fresh copy**. A first run gave 112/113 on "an empty library teaches the first action", only because my database already held the sample. That step needs an empty database, as the structure suite does.
* `graph.mjs --check`: G1 0 · G2 0. The new G3 entry is `GET /library/derived` from part 4's derived-files work, not part 5.
* My own walk:
  * Mouse hover still opens the tip on all three screens (fresh page, real pointer path).
  * An enabled action keeps its normal tip, and clicking it still opens the impact panel (structure suite).
  * In the Form library, a click on a greyed action opens its reason and no dialog, and a click outside closes it. The visible line under the row is unchanged.
  * No page or console errors.
* Seen and not counted (it is Radix's behaviour, and it happens between ordinary tips too, for example Edit → enabled Delete): gliding the pointer quickly from one control's tip onto a neighbour sometimes shows no tip, or keeps the first one, until the pointer moves again.
* Side effect, acceptable: pressing Delete on a greyed row's Edit now opens the greyed action's reason, where before it did nothing visible.

## Minors (do not block; list them in the PR or fix later)
* **n1 (Could), test gap:** the check tests Enter on Questionnaires and Forms but not on a greyed Structure action, and never tests Space. My probe shows both hold on Structure. Adding one Enter and one Space step on `[data-row] [data-action][aria-disabled]` would keep them held.
* **n2 (Could), pre-existing wording:** the Questionnaires reason ends "change the placement there", with no link to where "there" is (the shared library section). The wording is unchanged from before part 5.

## D1–D20 (part 5 at d658e76a; independent reviewer, browser/script evidence)
Changes from round 1:
* D9 → 4 (the tap and Enter pointer now reach phone and keyboard users; n2 remains)
* D10 → 5
* D11 → 5
* D13 → 4 (axe clean; keyboard, touch, reader and description all held; no real screen reader)
* D14 → 5 (the team tooltip's touch gap is covered with an explicit toggletip)
* D16 → 4 (the check is reliable, 8/8, with fail steps per finding; n1)

Unchanged: D1 4 (the records note is the tech lead's) · D2 5 · D3 4 · D4 5 · D5 5 · D6 4 · D8 5 · D12 5 · D15 5. D7, D18 and D19 are n/a. D17 and D20 are simulated only.

## Journey test (reviewer, 2 Nov, round 2): 9.5 / 10, pass
Same journeys as round 1: main path on Structure, alternate on Questionnaires, the Forms explanation, error and recovery (Enter or Space on a greyed control), wrong role (approver), phone at 400 px with touch, the step across to Edit's Where used, and break attempts. All held. Nothing is written by any greyed control.

Scores (1 / ½ / 0):
* task completed 1
* next step obvious ½ (n2: "there" has no link)
* plain words 1
* feedback and state 1
* correct data 1
* error recovery 1
* accessibility and screen sizes 1
* speed 1
* visual quality 1
* trust and sources 1

## Could not check
A real screen reader (NVDA or VoiceOver); I only read Chromium's accessibility tree. iOS Safari's tap handling. Retired rows (the demo has none). An intended user's unaided walk (D17 and D20 stay with the founder).

**Verdict: Approve** for commit d658e76a.
