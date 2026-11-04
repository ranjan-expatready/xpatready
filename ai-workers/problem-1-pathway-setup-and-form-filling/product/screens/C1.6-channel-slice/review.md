# C1.6 forms channel slice: independent review (reviewer, 4 Nov 2026)

PR #870, branch `claude/inspiring-cerf-xt6u6w`, reviewed at **c74dbcda** against origin/main 9caa043b. While I was reviewing,
the builder pushed **3557aa1a**. It changes only the usage comment of `tests/check_c16_portal_browser.cjs`, so this
review holds for both commits. Isolated copy `rev_c16` on :4458 (never :4400), web/dist from this commit, live AI off, US$0.
Basis: `qa/CAPABILITIES.md` row C1.6 and this folder's `plan.md` (this slice has no `concept.md`); `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`.
Not in scope (P-26): "the family form follows the channel" (P-318 (6)), which waits on #833.

## Builder's results, re-run by me
* `tests/check_c16_portal_browser.cjs 4458`: **19/19, twice** (the second run on a fresh copy).
* `acceptance/C1.6.test.ts 4458 xr_studio_rev_c16`: **26/26**.
* `tests/qa/check_qa_am_ch_1030.cjs` on a fresh copy (`/demo/load`): **47/47** (QA-134 now passes).
* `graph.mjs`: G1 0 · G2 0 · G4 0 · G5 0. The G3 and G6 items do not touch this slice's routes or modules.
* Not re-run: x1b, forms_channels_browser, screen01_channels, setup_card_browser, w1_programs_s2; "5 fail on main".

## What I walked (as the author, then as the approver; Visitor visa after Reset to the six)
Programs card at 1440 px: "PDF upload: IMM 5257, IMM 5409, …" with the PDF only tag. Opened the card, then Forms tab. Chose
"IRCC secure account" in the picker (toast: "Filed through the IRCC secure account"). Set IMM 5645 to Online (Not needed is
greyed with its reason). The line says "Typed into the IRCC secure account from the answer sheet, in portal order" and the
header says "Mixed: online and PDF". Back on Programs, the card shows "Online · IRCC secure account: IMM 5645 | PDF upload: …"
and the tag Mixed. The List row shows the same. List grid: arrow keys move between rows, Enter opens, and the new list adds no tab stop.
Paper account plus an Online line, and the approver's read-only view: see m2 and m3. 400 px, 1024 px and 512 px at 2× DPR (= 1024 px at 200 %):
no sideways scroll. axe clean on cards and List. No page or console error. Cards view loaded in 639 ms.

## Code checks
* **The catalogue leaf's account is the draft's:** yes. `account: c.portalKey` (`api/src/programs.ts:284`) comes from the same
  combination row that the draft snapshot's `combination.portal` is built from (`engine/snapshot.ts:194`). The Forms tab
  reads that snapshot (`api/src/workspace.ts:111`), so the row and the page agree.
* **Performance:** `combos` is already loaded with every scalar column, so there is no extra query and no per-row request.
  `channelGroups` is O(4·n) per row.
* **HTML and ARIA:** valid nesting. The card has `ul` in `article` in `li`. The List has `p` + `ul` in a `div` in a `div[role=gridcell]`,
  and a gridcell may hold flow content. `aria-label` on the `ul` is allowed. Nothing in the new markup can take focus.
* **Words for each account** (from running `channelWithPortal`): not set or "" gives "Online · IRCC account not set". PAPER gives
  "Online · no IRCC account (paper filing)". Each portal gives its canada.ca name. No enum spelling reaches the screen.
* **P-319:** no form number or combination in product code. The form numbers in the tests are test input only.
* **Server authorisation:** the approver's channel change is refused 403 and the row is unchanged (tested).
* **Rule tests fail when the rule is removed:** yes for the account on the row (strict `=== null` / `"account" in`) and for set
  and not-set portal words. No for the PAPER branch (m1).

## D1–D20 (out of 5)
D1 Requirement fit 4: every channel and the filing method on the row and on the page; the family-form part is deferred, as scoped · D2 Data integrity 5: no new writes; the stale `from` is still refused (qa 47/47) ·
D3 Reuse 5: one shared contract function for the card and the List · D4 Rule integrity 4: the paper branch is untested (m1) · D5 Stability 5: reload, Back and a fresh copy all give the same result ·
D6 Freshness n/a (unchanged) · D7 AI trust n/a (no AI) · D8 Orientation 5: trail unchanged · D9 Flow 5: card to Forms tab to card ·
D10 Language 3: "P-143" in a Forms tab tooltip (m4); the paper message appears twice (m2); the approver is told to "choose above" (m3) ·
D11 Feedback 5: toasts plus the line's words · D12 Visual 4: quiet and on tokens; the portal is cut in the List at 1024 px (m5) ·
D13 Accessibility 4: axe clean, keyboard fine, 200 % fine; the grid row's name leaves out the channels (m6) · D14 Team look 5 ·
D15 Speed 5: 639 ms, no per-row request · D16 Testability 4 (m1, m4) · D17 simulated only · D18 Provenance 4: the Forms tab says Sample ·
D19 Closure 4: the setting is made on one screen and shown on the other; the family form is deferred · D20 simulated only.

## Issues (no Blocker, no Major)
* **m1 Should: the paper branch has no test.** `contracts/forms.ts:48` ("Online · no IRCC account (paper filing)") and
  `web/src/pages/workspace/forms.tsx:156` ("Paper filing has no IRCC account to type it into…") are not asserted anywhere. If
  the branch is removed, the line would read "Typed into the No account (paper filing) from the answer sheet" (the Break m6
  sentence) and nothing would fail. Fix: add a pass and a fail step with account PAPER to AT-12 and to the browser check.
* **m2 Should: the paper case says the same thing twice on the Forms tab.** The existing red note (`components/channels.tsx:74`:
  "IMM 5645 is filed as Online, but this combination has no IRCC account (paper filing)… Choose Paper, or set the IRCC account
  it files through.") is followed by the new grey line saying the same thing. Fix: show no new line when the red note is shown.
* **m3 Should: the approver gets instructions they cannot act on.** "IRCC account not set: choose above the account it is typed
  into" and "…choose Paper, or set the account above" appear for an approver, who has no picker (`forms.tsx:156`). Fix: when
  `!canAuthor`, state only the fact ("IRCC account not set").
* **m4 Should: a decision id is still on the Forms tab, and the check claims otherwise.** The Signature column tooltip reads
  "…is offered (P-143; Sample until the immigration expert confirms)." (`forms.tsx:51`; seen on hover). The check step "the
  Forms tab shows no decision ids" (`check_c16_portal_browser.cjs:77`) reads only `innerText`, so it cannot see tooltips.
  This is older than the PR, but it is on this capability's page under the rule this PR enforces. Fix: drop "(P-143; …)" and include tooltip text in the check.
* **m5 Should: the portal itself is cut off in narrow List rows.** At 1024 px the List shows "Online · no IRCC acco…"; at 400 px,
  "Online · IRCC secure acco…". Cards at 1440 px show 3 of 6 PDF forms. Truncating with the full text on hover is allowed
  (EXPERIENCE §1), but here the portal, the very thing this slice adds, is what gets cut. Fix: keep the group label whole
  (`shrink-0` on the label) and truncate only the form list (`programs.tsx:552`).
* **m6 Should: the List row's name leaves out the filing method and the channels.** In grid focus mode a screen reader reads
  the row's `aria-label` (`programs.tsx:641`: trail, steps, needs you), so the new cell content is heard only in browse mode.
  The X1b tag has the same pattern. Fix: add `aria-describedby` pointing to the filing and channels cell.
* **n1 (nit):** AT-12 runs Reset to the six in the middle of the pack, so the pack leaves the demo data in the database it was given.
  The header documents this. It matters only if a runner shares one copy between suites.

## What I could not check
A real screen reader (m6 is from the ARIA model, not heard). An intended user's unaided walk (D17, D20 stay with the founder).
Keyboard-only use of the native account and channel pickers on the Forms tab (selected with the mouse and the API only).
The builder's other green checks (listed above). The builder's "5 fail on main" (that would need a web build from main).

**Verdict: Approve.** No open Blocker or Major. Minors to fix (Should): m1 untested paper branch · m2 paper message twice ·
m3 instructions shown to the approver · m4 "P-143" in the Signature tooltip and the check's overclaim · m5 portal cut in narrow
List rows · m6 the grid row's name leaves out the channels. Journey score 9/10 (`journey-test-reviewer-2026-11-04.md`).

## Round 2 (34defe0f)
Diff-only (P-277): `git diff 3557aa1a..34defe0f`. Isolated copy `rev_c16` on :4458 (web/dist built 08:01 from 34defe0f, after
the 07:52 commit), live AI off, US$0, copy stopped at the end. Suites' rewritten screenshots (W1-qa-1029, W1-questions-and-documents,
W1-visual-system) restored with `git checkout --`.

**Re-run:** `tests/check_c16_portal_browser.cjs 4458 xr_studio_rev_c16` **31/31**. `acceptance/C1.6.test.ts` **31/31** (AT-13
both steps, AT-12's new paper and "never next release on the six" steps). Not re-run: "9 fail on c74dbcda" (needs the old web build).

**My own walk** (fixture, With an LMIA = Live · Release 1, PDF only; set to IRCC secure account and IMM 5409 Online, the
breaker's state): card and List read "Mixed | In the draft for the next release: | Online · IRCC secure account: IMM 5409 |
PDF upload: IMM 1295, IMM 5257 SCH1, IMM 5475, IMM 5476, IMM 5707". Nothing cut (`scrollWidth = clientWidth` on every `li`), no
sideways scroll and axe clean at 1440, 1024, 640 CSS px at 2× DPR (= 1280 at 200 %), 639 and 400 px. No page or console error.

### The fixes, checked
* **M1, the new full-width gridcell:** right. Placement measured in the row: mobile (400, 639 px) it is `row-start-4`, `col-span-2`,
  at y 94, under the step bar (y 53 + 37) and the Open button, full row width; sm and up (640×2, 1024, 1440) it is
  `sm:row-start-2 sm:col-span-5`, at y 43 under all five cells, 574 / 718 / 1134 px wide. DOM order equals visual order. Keyboard:
  ArrowDown moves row to row (8 presses, 8 rows, no stop inside), and the cell holds 0 focusable elements, so no tab stop is added.
  axe clean at every width. See n1 for the header count.
* **M2:** right. Retired rows: `rowChannels` gives none on card, List and in the row's name (tested, browser steps 29–30). Live
  row: `account` now comes from `snapshot.combination.portal` (`engine/snapshot.ts:194`), the same draft snapshot as `forms`, so
  the row no longer mixes the two. `channelsChanged` is additive and optional on `CatalogueLeaf`.
* **`channelKey` ignoring signatures and checklist lines: right.** It describes exactly what the row shows: `channelGroups` drops
  `document` lines and the row never shows a signature, so a signature-only change must not label the row. It does include the
  set of data-form lines, so an added or removed line labels it. The defaults match the snapshot's own rule: `channel` is omitted
  when PDF_UPLOAD (`snapshot.ts:200`) and `portal` when unset (`:194`), and the key fills both the same way on each side. By hand:
  a line-only change (IMM 5409 to Paper, account untouched) gives `channelsChanged: true`, and putting it back gives false. AT-13
  covers only the account change (r2-m2).
* **The Live label's words:** "In the draft for the next release:" is plain, matches the row's own "Live · Next release: 4 of 5
  steps to do", and the list's name becomes "Each form's channel in the draft for the next release". Good. The tag is outside it (r2-m1).
* **Cost of the extra key:** two `JSON.stringify` and one sort of at most n short strings per combination, on snapshots already in
  memory (`relSnap` is already read for `diff` and `relProblems`). No query, no per-row request. `/catalogue` took 26 ms after a change on the fixture.
  The real cost is height: a List row with channels is now 96 px instead of 43 at 1440. This is the price of "never cut" (M1) and is not a finding.
* **Breaker m3, m4 and my m1–m6:** all fixed, and each has a step that fails if the fix is removed. m1: AT-12 has paper pass and fail steps, browser
  steps 21–22. m2: the grey line is gone under PAPER (`forms.tsx:156`, `accountKey !== "PAPER"`), step 23. m3: the approver reads
  "IRCC account not set: no portal to type it into yet", step 20. m4: "(P-143; …)" removed, and the check now reads the tooltip, step 27.
  m5 and breaker m3: the label has `whitespace-nowrap`, the forms wrap and nothing is truncated, steps 12–14. m6: the row's `aria-label` adds filing and channels, step 11.

### Issues (no Blocker, no Major)
* **r2-m1 Should: on a Live row whose draft files differently, the filing tag is outside the "next release" label.** The tag
  "Mixed" sits left of "In the draft for the next release:" (screenshot at 1024 and 400 px). The row's new screen-reader name says
  "…, filing: Mixed: online and PDF, next release: Online · IRCC secure account: IMM 5409; …". Both present "Mixed" as what
  Release 1 files, but Release 1 is PDF only. The tag already read the draft before this PR. This PR's label, and the `aria-label` added by m6,
  now set the two claims side by side. Fix: when `channelsChanged`, put the tag after the label inside the box, and put "next release:" before
  "filing:" in the `aria-label` (`programs.tsx:646`, `:658`).
* **r2-m2 Should: the visible label has no test.** AT-13 checks only the API flag, and only for an account change. No browser step
  asserts `[data-channels-next]`, so removing the `<p>` at `programs.tsx:557` fails nothing. Fix: add a browser pass step (With an LMIA after
  the change shows the label and the list name "…in the draft for the next release") and a fail step (put back, no label). Also add an AT-13 step for a line-only change.
* **n1 (nit):** the List has 5 `columnheader`s, and a row with channels has 6 `gridcell`s. A screen reader in table mode may read the
  new cell as a sixth column with no header. axe does not flag it. `aria-colspan={5}` on the new cell would say what it is.

**Verdict: Approve.** Both Majors (M1, M2) and every Minor from round 1 are fixed and proved by steps that fail without them;
no open Blocker or Major. Should, for a follow-up: r2-m1 (filing tag outside the next-release label) · r2-m2 (the label is untested).
Journey score 9.5/10 (round 2 in `journey-test-reviewer-2026-11-04.md`).
