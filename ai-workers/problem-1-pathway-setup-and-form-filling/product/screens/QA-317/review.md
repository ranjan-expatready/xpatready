# QA-317 review: the Online line opens its answer sheet (PR #1393, commit 32b96f6ae, base main fc49dc5a4)

Independent reviewer (did not build it), skill screen-review plus journey-test (reviewer role, the one score:
`journey-test-reviewer-2026-11-09.md`, **8/10, pass**). Copy `rv_q317` on :4438, web rebuilt from this commit; the
builder's `tests/check_qa317_sheet_browser.ts` ran twice on it: 28/28, exit 0. `tsc -p web` clean. Graph (P-86): no G1–G6
gap names the new page or route. Live AI off, US$0. Skill scale: **Ship after fixes** (two Majors, both small).
Scope: QA-317's done-when and concept C7.3 r2, read-and-copy part; the per-section tick (B4) is not counted.

## Concept and done-when
* Done-when met by screens: Cases › case › Prepare application › Online line › "Open answer sheet: IMM 5257 for
  <person>" › the sheet, mouse and keyboard (J1, J2); pass and fail tests exist; "above" now matches the page (the PDF
  copy rows sit above the line, checked on the 1440 screenshot).
* Item lookup: same query key as `item-channels.tsx:38`, filtered by form and `channel === "ONLINE"` (`forms.tsx:60`).
  Four people → four links, each to its own item; a person switched to PDF upload loses the link and the sheet URL says
  why (J6). A client never reaches the case page (`cases.tsx:181`) and gets the page's notice plus a 403 on the sheet.
* State words cover every state an Online item gets from the server (`to_do`, `done`, `cannot_start`,
  `out_of_date`: `case-prepare.ts:359,412,415`); an unknown state falls back to its raw value.
* Every value shown is the server's (`copy_text`, `source`, `to_confirm`, `waiting`, state and reason). Nothing invented.

## Findings
**Major 1: answers show the release's option keys, and Copy gives the key.** On a filled one-person case the sheet
shows "Current marital status: `annulled_marriage`" and "Kind of temporary resident visa requested: `VisitorVisa`"
(J3; `rv/shots/j5-top.png`). The Agent view shows the same facts as "Annulled Marriage" and "Visitor visa". The page's
own line says "Copy gives each answer as the portal takes it" (`answer-sheet.tsx:78`). Breaks EXPERIENCE §5 [M] "no
hashes, IDs … on the main path" (BIC-19 Not met → Must). Cause: `engine/runtime/answer-sheet.ts:50` `copyText`
returns `String(v)` for an option. Fix on the server, not in the browser: `copy_text` (and the shown value) is the
release's option label for an option answer; a fail test asserting a listed option shows and copies its label.

**Major 2: with the clipboard refused, a part's Copy selects the whole address.** `CopyButton`'s fallback selects
`closest("tr").querySelector("[data-copy-text]")` (`answer-sheet.tsx:158`), the row's one-line copy, also for the
part buttons (`:139`). Scenario (J4): clipboard refused, "Copy city of Current mailing address" → selection "Sample
Road, Sample City, Canada", live region "Selected: press Ctrl+C to copy"; the officer pastes the whole address into
the portal's City box. Concept §4: "No clipboard: the value is selected instead". Fix: select the button's own value
(e.g. a `data-part-text` span beside it, or pass a ref); fail tests for the row and a part with `writeText` rejected.

**Minor (fix or list in the PR)**
* m1 Link order is the Prepare view's (Spouse first) while the sentence lists Client A first (`forms.tsx:67`): order
  links by `f.people` or principal first.
* m2 The sheet page never checks the item belongs to `:id`, and is silent when Prepare fails: another case's item under
  this case's URL shows the other case's sheet under this case's trail, h1 "IMM 5257 answer sheet · " with no person or
  state (J9; `answer-sheet.tsx:65,77`); a failed Prepare read hides the state and the read-only notice (BR-7) with no
  word. Show a notice when the item is not in this case's Prepare view or Prepare errors; drop the "·" without a person.
* m3 The concept puts the link in "How each form is filed", per person, beside the item's state (concept §4, m3/M3);
  the PR puts it on Prepare application's Online line (QA-317's ask) with no state beside it, and the PR body does not
  record the deviation. B4's last step ("back to the case: the form reads Done") needs the state where the link is:
  record the choice in the PR (or `challenge.md`) and name where B4 shows it.
* m4 Both 409s get "Change how it is filed under 'How each form is filed'" (`answer-sheet.tsx:59`), also the "parts are
  not set up in this case's release" 409, where that advice is wrong. Both carry problem type `item`
  (`case-prepare.ts` `onlineItem`); branch on a distinct type or show the advice only for the channel refusal.
* m5 "press Ctrl+C to copy" (`answer-sheet.tsx:168`): ⌘C on a Mac, where the founder walks.
* m6 Tooltips (EXPERIENCE §2.10, BIC-14 Partly): "To confirm" has a hover-only `title` (not on keyboard focus,
  `:136`); the section and item state pills have none (`:95-97`, `:80`).
* m7 Progress is recomputed in the browser (`:67`, entered and current and waiting for nothing), copying the server's
  Done rule (BR-8 "Done is the server's"). B4 will lean on it: prefer a server count, or pin it with a test.
* m8 Words: "IRCC account" and "portal" in one header line (`:78`, one name for one thing). Server words now shown here
  (pre-existing, follow-up rows, not this diff): "(W6)" in the order note; the out-of-date reason dates a 9 Nov 04:20
  UTC tick "8 Nov 2026" (server time zone) while the pill shows 9 Nov.
* m9 Tests that pass with a rule removed: the `channel === "ONLINE"` filter (the checkpoint files every IMM 5257 Online;
  J6 shows it works by hand), the part fallback, states other than To do, the read-only notice, the second 409, link
  order. Add at least the Major tests and the channel-switch case.

## D1–D20 (where this moves them; 1–5)
D1 4 (done-when met; Major 1 breaks "as the portal takes it") · D5 4 (reload, back, forward hold; m2) · D8 4 (trail
and title; m2) · D9 4 (one link per person; m3) · D10 3 (option keys, "(W6)") · D11 4 (Copied + live region, states) ·
D12 4 · D13 4 (axe clean 1440/390, keyboard, 1024 px, 200 %; m6) · D14 4 (team Pill, Button, Notice) · D15 5 (466 ms,
no per-row request) · D16 3 (m9) · D18 4 (Source, To confirm, server reason) · D19 4 (gate A step by screens; tick is
B4) · D17, D20 simulated only. Others unchanged (no data, rules or AI change).

## BIC-01–BIC-20 (case-side; evidence: builder's `screenshots/01–03` at 1440 and 390, my J1–J9)
| Check | Score | Evidence |
|---|---|---|
| 01, 02, 04, 06, 07, 09, 13, 17 | N/A | read-only page: asks nothing, no AI proposals, no roles, no review step |
| 03 No stale answers | Met | J7: changed date of birth → section and item Out of date |
| 05 Document source | N/A | sources shown (Document · Client · Case officer); confirming is on the Agent view |
| 08 Case structure | N/A | one form, one person |
| 10 Task list | Met | sections with Not entered / Entered / Out of date; progress counts complete sections |
| 11 One primary action | Met | no primary button; Copy is secondary |
| 12 Check before it leaves | N/A | not a signing or filing step |
| 14 Tooltips | Partly | m6 |
| 15 Filing channel per form | Met | the Online line names the channel and opens its sheet; PDF rows do not |
| 16 Recorded events | Partly | read-only notice from `read_only` in code; not walked to Submitted |
| 18 States | Partly | skeleton, empty, 403/404/409 worded; Prepare error and cross-case silent (m2) |
| 19 Low load, no internal ids | Not met | Major 1 (option keys); "(W6)" |
| 20 Keyboard, zoom | Met | J2 Tab ×47 → Enter → Copy; 200 % and 1024 px no sideways scroll; headings h1 → h2 in order |

## Could not check
A real screen reader (Safari drops table roles on `display:block` cells; Chromium keeps them), a recorded filing
walked to Submitted, a Prepare view not derived with an Online line, an intended user's unaided walk (D17, D20).
Note for the tech lead: while I reviewed, something else in this worktree rewrote tracked screenshots under
`screens/C6.1-open-case/`, `F3-add-form-wizard/` and `W1-questions-and-documents/`; not mine, left as found. The QA-317
check rewrites its own screenshots on each run; I restored them after my runs.

To fix: Major 1 (option labels in `copy_text`, server, with a fail test); Major 2 (part fallback selects the part,
with fail tests); Minors fixed or listed in the PR.

Verdict: Block
