# UX-A part 3 review: one status vocabulary; a Live combination's next step; the bar agrees with Review (commit 4ee92384)

Reviewer agent (did not build it), 2 Nov 2026.

**Scope.** `git diff de7ee3b0 4ee92384` (base: UX-A part 2, approved). The row is BACKLOG UX-A (P-273), finding 7 of `screens/UX-baseline-2026-11-02/findings.md`:
* one word per state across cards, banners and pages;
* a Live combination's next step knows it is live;
* "No unreleased changes" agrees with the Review tab;
* proved on the named screens at 1440, 1024 and 400 px, axe clean.

**How it was run.**
* The exact commit, in the detached worktree `/home/user/uxa2-rev`. Its web build (17:13, `index-Cwrqg5oJ.js`) contains the new strings.
* `isolated.sh rev_uxa3`, fresh database, `demo/load` as user-A.
* **Port note:** I started on :4446 as asked, but another agent's script (`w115.cjs`, database `rev_uxa1b`) was also pointed at :4446. My start stopped their listener, and their script then wrote into my database. That made one run of the Structure check fail on data it did not create. I stopped :4446 and reran everything on **:4448**, a fresh copy for each suite.
* US$0: no live switch, no priced button. :4400 was never used.
* The checks overwrite committed screenshots under `screens/*/screenshots/`. I restored them with `git checkout`; the only file I changed is this one.

## Verdict: Approve
No Blocker or Major. Four Minors (n1–n4) go in the PR body or a later row.

## What holds (evidence on 4ee92384)
* **Builder's checks, on clean copies:**
  * `check_uxa3_status_words_browser.cjs`: 21/21, run twice.
  * `check_w1_structure_browser.cjs`: 141/141.
  * `check_setup_card_browser.cjs`: 44/44.
  * `check_screen01_rules.ts`: 67/67.
* **One word set:** `contracts/status-words.ts` is the single source:
  * `engine/programs.ts` `STATUS_TEXT`, Programs `STATUS_WORD` and the filters, and Structure's filter and leaves read it.
  * No user-facing "In setup" or "Setup draft" is left in `web/src`, `api/src`, `engine` or `contracts`. Only comments remain, plus the lowercase lifecycle reasons in n2.
  * `api/src/programs.ts:177` hard-codes "Retired" and "Not started", which are the same words.
* **The same words on every screen:**
  * Programs chips: Not started 16 · In progress 4 · Live 1.
  * Visitor visa's header chip and its Structure row both say "In progress". Structure's Used by says "Nothing yet: not released".
  * The Structure status filter reads All / In progress / Not ready / Live / Not started / Waiting for approval.
* **Live next step:**
  * LMIA's header reads "Next step for the next release · Official pages", with the button "Confirm the checklist page".
  * The strip reads "Live · setup steps for the next release: 3 of 5 done".
  * The approver (user-B) sees "Next step for the next release · … Waiting for the configuration author: Confirm the checklist page".
  * Visitor visa, which is not Live, never says "for the next release".
  * Keyboard only: 22 Tabs reach the header action, and Enter opens `/forms`.
* **The bar agrees with the Review tab.** The client gate `changesCount === 0 ? []` (`review.tsx:45`) mirrors the server's `hasContent ? diff : 0` (`api/src/programs.ts:191`). Where content exists, both sides are the same `diff` (`studio.ts:362`).

| State | Bar | Header | Step 1 card | List |
|---|---|---|---|---|
| Visitor visa as loaded | No unreleased changes | — | 0 draft changes | (0), "Nothing configured yet" |
| After adding IMM 5476 | 72 | 72 | 72 | 72 |
| After Undo on the Forms tab | 0 | 0 | 0 | 0 |
| LMIA after a removal (builder's check) | 2 | 2 | — | 2 |

  * After Undo the Review tab updated with no reload.
  * Submit is disabled for Visitor visa with the reason "Fix the problems first". The server also refuses that submit on its "Nothing to release yet" error, so the UI-only gate is not the only guard.
* **Accessibility and sizes:**
  * axe (full page, WCAG 2.2 A/AA): 0 violations on 12 states (Programs, LMIA Overview, Visitor visa Review and Structure, at 1440, 1024 and 400 px).
  * No sideways page scroll at 1440 or 1024, at 400 except Structure (note below), or at 200 % zoom (512 CSS px) on all four screens.
  * No page or console errors.
* **Rules fail when removed (reasoned from the asserts, not mutated):**
  * Without the Review gate, Visitor visa lists 22, and the check's `listed === 0` fails.
  * Without `LIVE_NEXT`, the header and strip regexes fail.
  * With the old `STATUS_TEXT`, both the `check_screen01_rules` P-49 line and the header-chip step fail.
* **Graph (P-86):** none of G1–G6 touches this diff.

## Blockers
None.

## Majors
None.

## Minors (fix, or list in the PR)
* **n1: while the summary loads, the Review tab shows the pre-fix 22-change list.**
  * `review.tsx:45` falls back to `v.draft.changes` when `changesCount` is `undefined`.
  * With `/summary` held back 4 s (Playwright route), Visitor visa showed "22 draft changes; 1 problem to fix" and "Changes in the draft compared with nothing released (22)" with its 22 rows beside "No unreleased changes". It then flipped to 0. Scratch screenshot: `j6-vv-review-slow-summary.png`.
  * This is not seen on ordinary loads: in 6 loads, frame sampling saw only "0", because summary answered 170–390 ms in and review 40–100 ms later. Summary builds every row, so at 100 combinations it can come last.
  * EXPERIENCE §4 says loading draws a skeleton. The fix: draw a skeleton while the count is undefined. The more robust fix: one computation, with `/combinations/:id/review` returning no draft changes when the combination has no content (finding 1's principle).
* **n2: lowercase "setup draft" is still on Structure.**
  * Where: `contracts/lifecycle.ts:25,26,41` ("Can't delete: its setup draft uses it.", "… have setup drafts: release or discard them first") and `api/src/lifecycle.ts:172`.
  * The check's `OLD` regex is case-sensitive, so it does not see them.
  * My judgement: these are lifecycle reason sentences (P-116 word set; "Draft" is a §4 governance word), not a status label, so "one word per state" holds. Finding 3 (this row) moves these always-on reasons into tooltips anyway.
  * Say so in the PR. Optionally reword to "its setup is in progress (not released)".
* **n3: finding 7's "Resume setup" at "0 of 5 steps" is unchanged and unrecorded.**
  * The Visitor visa card still reads "0 of 5 steps · Resume setup".
  * Keeping it is right: it is P-180's decided card (Start setup · Resume setup · Open), and "Resume" with In progress is consistent, because setup has begun and the combination exists.
  * But finding 7 lists it, and the commit message does not say it stays. Record "kept by P-180" in the PR body, or in `challenge.md` for the founder, so the finding's line is closed explicitly, not silently.
* **n4: the bar can read as if Visitor visa were released.**
  * The bar reads "No unreleased changes. Firms use Release 1." over Visitor visa, whose header says "Not released yet" and whose Review says "compared with nothing released".
  * The bar is workspace-wide (`App.tsx:146`). This predates the diff and is not a count conflict. Note only.

## For the Lead (not findings of this diff)
* **Overlap with K10 / QA-129.** QA-129 asks "Should a Live combination show steps 1 and 2 as open work?". This diff answers it under P-273: yes, labelled "for the next release", and the header and strip now agree. Name QA-129 in the PR so qa retests it and K10 drops it. Both rows sit in the screens lane, so there is no file conflict.
* **Structure at 400 px.** It scrolls sideways by 73 px through its Actions column. That is finding 9 (group C, for the founder), not this row. The check labels this carve-out honestly instead of passing it as "no sideways scroll".
* **Live at 5 of 5, not observed.** For a Live combination with all steps done, `setup-strip.tsx:44` would still say "setup steps for the next release: 5 of 5 done". The demo has no such combination.
* **Port and side effects.** The parallel use of :4446 by two agents should be prevented by port assignment. The checks write tracked screenshots: run them, then restore.

## D1–D20 (1–5; only those this diff moves; others as in parts 1 and 2)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | All three parts of finding 7 are met on the named screens; n3 is unrecorded. |
| D4 Rule integrity | 5 | The client gate equals the server's `hasContent` rule; 0/72/2 agree across bar, header and list. |
| D9 Flow | 5 | The Live next step says what it is for; the keyboard reaches it. |
| D10 Language | 4 | One word per state; n2's lowercase reasons. |
| D11 Feedback and state | 4 | Undo updates every count; n1's loading fallback. |
| D13 Accessibility | 5 | axe 0 on 12 states; 200 % zoom has no page scroll (Structure at 400 is finding 9). |
| D16 Testability | 4 | Pass and fail cases for each part; no case-insensitive old-word check and no slow-summary case (n1, n2). |
| D17 First-use / D20 Pain and wow | Simulated only | — |

## Journey test (reviewer, 2 Nov 2026)
Walked headless with Playwright on :4448 / :4446 (fresh copies). Scratch screenshots: `/tmp/claude-0/-home-user-xpatready/d1a19a26-d4f8-5a0b-9a61-250603ccb5cc/scratchpad/shots/`.

| Journey (persona: goal) | Result |
|---|---|
| J1 author: "where is Visitor visa?" Programs card → header → Review | Holds. In progress everywhere; 0 draft changes beside "No unreleased changes"; Submit disabled with its reason. |
| J2 author: "LMIA is live, so what is left?" | Holds. "Next step for the next release"; strip "Live · … 3 of 5 done". |
| J3 author: Structure filter, row, Used by, detail | Holds. The lifecycle reasons say "setup draft" (n2). |
| J4 approver (wrong role): the LMIA next step, Visitor visa Review | Holds. Waiting for the author; 0 draft changes. |
| J5 author: a real change, then Undo (data underneath) | Holds. Summary, bar and list all 72, then all 0; one form row. |
| J6 recovery: direct Review URL, slow summary | 22-change flash (n1). |
| J7 keyboard only, LMIA header action | Holds. 22 Tabs, Enter opens Forms. |
| J8 1440 / 1024 / 400 / 200 % | Holds. Structure at 400 is finding 9. |
| J9 cross-screen: To review for author and approver | No contradiction. LMIA has no listed step there; the empty state is unchanged from part 2. |

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every part of finding 7 can be done and seen. |
| Next step obvious | 1 | The Live header and strip say what the step is for. |
| Plain words | ½ | n2 and n3. |
| Feedback and state | ½ | n1: the loading state shows the wrong list instead of a skeleton. |
| Correct data | 1 | 0/72/0 and 2/2/2 across bar, header and list. |
| Error recovery | 1 | Undo restores 0 everywhere without a reload. |
| Accessibility and sizes | 1 | axe 0; no page scroll except finding 9's Structure row. |
| Speed | 1 | Programs 458 ms; Review tab 139 ms. |
| Visual quality | 1 | Unchanged components; the header wraps cleanly at 400 px. |
| Trust and sources | 1 | No status contradicts another on the named screens. |
| **Total** | **9 / 10** | **Pass** (8 or more, no 0). Raise it with n1's skeleton or a server count, then n2/n3 recorded. |

**Could not test:**
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* A Not ready or Retired combination live (the demo has none; their words come from the shared contract).
* A Live combination at 5 of 5.
* 100 combinations.
* `acceptance/C11.16.test.ts` (only its label string changed; it plants files in `p2/runs`).
* CI for the check, which uses the Mac's psql path.
* Rule removal by mutation (reasoned from the asserts instead).
