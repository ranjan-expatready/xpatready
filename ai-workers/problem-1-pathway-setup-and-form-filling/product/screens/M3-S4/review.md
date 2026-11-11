# M3-S4: never-waivable blocking line, independent review (PR #1571)

Commit reviewed: `08768fc3cc43d7c3bb31f0db533414c52191673e` (branch `claude/cool-ritchie-ybny5d`), scope `git diff origin/main...08768fc3c`. I did not build it. I used copy `rv_m3s4` on :4437 (configured checkpoint, live AI off, US$0) and stopped it afterwards. Bar: BACKLOG row M3-S4 (there is no concept.md), bake plan row 20, P-172, P-315, P-380, P-425, B164, M3-S3's review, STANDARDS, EXPERIENCE §6. Journey report: `journey-test-reviewer-2026-11-11.md` (score 8.5/10).

**Verdict: Ship after fixes** on the screen-review scale. For the merge: **Block**, with 2 Majors (listed at the end).

## What I ran
* Pure checks: `check_m3s4_never_waivable` 18/18, `runtime/check_m3s3_waivable` 15/15, `check_vv_checklist` 76/76, `check_r2_fee_table` 86/86, `check_c614_providers` 27/27, `check_b164_no_engine_keys` 52/0.
* `check_m3s4_blocking_api.ts 4437 xr_studio_rv_m3s4`: 15/15 (2 min 42 s).
* A Playwright journey (headless Chromium, my scratchpad script, not committed): the author works by keyboard only on a **Spouse sponsorship** line (a combination the fee table never marked); release and case move through the API; the case officer checks the menu, Ready to file panel and figure on that case and a new Study permit case; refusal, upload by screen, Ready to file allowed; axe on 3 states, 1440/1024/400 px; database reads after each step.
* The recorded rollback, run under `ON_ERROR_STOP` in one transaction, then rolled back: no errors, 2 `never` rows go to NULL. `graph.mjs --check` exits 0; both new suites have `caps: []`.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Configure, release, refuse Waive and Not applicable, block, receive, then allowed: all work on two combinations. The guard is gone (B164 G3 entries removed) |
| D2 Data integrity | 4 | The migration only widens the check. The rollback works. Version lock and 422 change nothing (DB read) |
| D3 Reuse | 4 | Reuses M3-S3's `waiver` column, `BLOCK_CODES`, `cannotPass` and the dialog pattern |
| D4 Rule integrity | 2 | A never-waivable requirement that does **not** apply still turns the person's needed line into a block that cannot be passed (M2) |
| D5 Stability | 4 | Reloads keep the state. A second Ready to file press changes nothing. No page errors |
| D6 Governance | 4 | Release review names the change ("now never waivable: it blocks Ready to file until received"). The rollback is recorded. Two people release it |
| D7 AI trust | N/A | No AI |
| D8 Orientation | 4 | The line says "Never waived: Ready to file waits until it is received". The block is grouped under "The client" |
| D9 Flow | 4 | The menu offers only Request, Upload and History. Upload clears the block |
| D10 Language | 3 | Plain words. Kept lines and Not applicable lines get words that are not true (m1, m2) |
| D11 Feedback | 2 | The figure ticks the unreceived letter "Done" while the block on the same panel says it is not received (M1) |
| D12 Visual | 4 | Team Pill and radio group. "Blocks: fix it" in danger tone |
| D13 Accessibility | 5 | Radio group by keyboard (Space, arrow keys). axe 0 on dialog, checklist and readiness. No sideways scroll at 1024 or 400 px |
| D14 Team look | 4 | Same patterns as M3-S3 |
| D15 Speed | 4 | Ready to file 1.1 s. Case page to checklist 2.1 s on first load |
| D16 Testability | 3 | Engine, API and walk all hold. The figure and the merge rule with a condition that does not apply have no test. The suites name no capability |
| D17 | simulated only | — |
| D18 Provenance | 4 | The drawer shows "Never: …" to every role. The release snapshot carries `waiver: never` |
| D19 Closure | 4 | Configure → release → case → block → receive → Ready to file |
| D20 | simulated only | — |

## BIC scorecard (case Documents and Ready to file panels; EXPERIENCE §6)
| BIC | Score | Evidence |
|---|---|---|
| 01–03, 05–10, 15–17 | N/A | No facts, AI values, people changes, tasks, channels or signing in this change |
| 04 Incomplete normal | Met | Not requested is still a state. An empty reason is refused (400) |
| 11 One primary | Met | One filled "Ready to file" per filing. The dialog has one primary, "Save to draft" |
| 12 Check before it leaves | Partly | The block cannot be passed (409). The text now allows any line to block, which is wider than BIC-12 and P-315's "one named exception" (m5) |
| 13 Errors where they happen | Met | The refusal names the letter on the filing (j2-refused). The line error shows the server's words |
| 14 Tooltips | Met | No new chip or icon-only control |
| 18 States drawn | Partly | The figure contradicts the block (M1) |
| 19 Layout | Met | Grouped by person. No internal ids |
| 20 Accessible | Met | Keyboard path through the dialog and the ⋯ menu. 1024 and 400 px. axe 0 |

## [M] lines not met (all others met or N/A)
* STANDARDS §Tests "a rule's test fails when the rule is removed": not met for the figure, which has no rule for the new code (M1), or for the merge with a requirement that does not apply (M2).

## What the guard's removal changes (checked)
Spouse sponsorship cases now get their 3 cited Sample lines. Prepare adds 3 document items. Ready to file gains 3 "not received" warnings. The Provincial nominee (Express Entry) case gets its nomination-certificate line. "Start next stage" says "2 documents on the checklist". All of this is intended (P-425). No checkpoint pathway's release marks P-172's police certificate or medical exam "never" yet; setting them is configuration work (cited, P-170), not this row.

## Issues, ranked
**Must (Major)**
* **M1. The readiness figure counts an unreceived never-waivable document as Done.**
  * Where: `engine/runtime/readiness-figure.ts:80` maps only `missing_document` to its document item. `document_never_waivable` falls through and becomes a separate "check" item.
  * Scenario: a Study permit case with every warning passed and the letter not received. "How this is worked out" lists "✓ Letter of acceptance for Sample Student R · Done", plus an open check, and the count reads "8 of 9 done" (it should be 7 of 8). The builder's own walk-5 shows the same 8 of 9.
  * Also: a line that was Not applicable before its release said never is left out at `:72` (`filter(d.required)`), so it is not listed as a document at all.
  * Fix: map `document_never_waivable` like `missing_document`, and keep never-waivable documents in `docs`. Add a pass test and a fail test.
* **M2. The merge rule makes a needed line block on a requirement that does not apply.**
  * Where: `engine/runtime/case-checklist.ts:231` sets `keep.never_waivable ||= drop.never_waivable` whatever `drop.need` is.
  * Scenario (my pure probe, `caseChecklist`): a base "Police certificate · principal" line with no waiver, plus a conditional "Police certificate · principal · never" line whose condition is false (`not_needed`). They merge into one needed line with `never_waivable: true`, and `filingReadiness` returns `document_never_waivable`.
  * Effect: Ready to file is blocked with no pass, no waiver and no Not applicable, because of a rule the person does not meet. Example: P-172's "dependent children 18+" line merged with a plain per-applicant line for a 16-year-old.
  * Fix: carry `never_waivable` only when `ORDER[drop.need] <= ORDER[keep.need]` (the C6.14 guard two lines below). Add a pass test and a fail test.

**Should (Minor)**
* **m1.** A kept line that is no longer needed still carries `never_waivable`. That line is built at `api/src/case-checklist.ts:147` from `out(l, true)` with `...l`.
  * Its row says "Never waived: Ready to file waits until it is received" (`web/src/runtime/checklist.tsx:152`).
  * Not applicable is refused with the same words, yet Prepare raises no block (it reads needed lines only).
* **m2.** A line marked Not applicable before its release said never shows "Not applicable" next to "Never waived: …" (j4). The block is right. Nothing tells the officer to request it again, which is the only way out.
* **m3.** Order of checks: `notApplicable` and `waive` parse the body before the role check (`api/src/case-checklist.ts:207,216`). A client with an empty body gets 400 "Give a reason…" instead of 403. This is the same order as M3-S3.
* **m4.** Stale text and dead branches:
  * Two file headers still say "other combinations answer 'not derived yet'": `api/src/case-checklist.ts:4` and `api/src/case-prepare.ts:6`.
  * Two branches can no longer run: `web/src/runtime/checklist.tsx:72` (`!d.derived`) and the "release" wording at `web/src/runtime/stages.tsx:180`.
* **m5.** For the tech lead: EXPERIENCE BIC-12 and P-315 (2) still name one exception (Express Entry). After this row, any line its release marks never waivable blocks. Record that in the PR's Questions so the bar is updated; it is not a code fix. The PR body is also still the step-1 plan.
* **m6.** Tests:
  * Neither new suite names a capability (G3).
  * The rule that the stored line stays required when it is Not applicable and never (`api/src/case-checklist.ts:135`) has no test.
  * `tests/runtime/check_m3s3_waivable.ts`, changed here, is not run by CI. The builder raised this; I ran it, 15/15.

## Retrofit mapping
The team's `Document.status` has `Waived`; it has no "never waivable" field. Ours is `document_requirement.waiver = 'never'`, plus the readiness block `document_never_waivable`. Record this in the PR.

## Not checked
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* CI on the PR (only the guard has run; the PR is a draft).
* The full suite run (`run-suites.sh` was not mine to run).
* The client's own pages for a never-waivable line.

**Verdict: Block.** To fix, each with a test that fails before the fix, then a diff-only re-review of the new commit:
1. Major M1: `engine/runtime/readiness-figure.ts:72,80`. The figure counts the unreceived never-waivable document as Done.
2. Major M2: `engine/runtime/case-checklist.ts:231`. A never-waivable requirement that does not apply makes a needed line block.
3. Minors m1–m6: fix them, or list them in the PR.

## Re-review at d38208185 (diff only: `08768fc3c..d38208185`)
Commit `d38208185af93dde7e45037d4dac3500fc94ebd5`. Copy `rv_m3s4b` on :4437 (configured checkpoint, live AI off, US$0), stopped after.
* **Suites run:** `check_m3s4_never_waivable` 29/29; `check_m3s4_blocking_api` 19/19; `check_c95_release_update` 34/34; `check_c710_figure` 37/37; `check_c76_readiness` 91/91; `check_readiness_pass_codes` 4/4; `check_m3s3_waivable` 15/15; `check_vv_checklist` 76/76; `check_c614_providers` 27/27; B164 52/0.
* **My browser journey again:** author by keyboard on Spouse sponsorship; release; move; Not applicable before never. Then a new Study permit case whose letter line now waits for marital status (the API suite leaves it conditional). axe 0, no page errors.
* **Pure probe:** `caseChecklist` with a plain base line plus a conditional never line, the condition unanswered, false and true.

**Fixed**
* **M1 fixed.** The block lands on its own document item (`readiness-figure.ts:81`), and a never line in any state is counted (`:73`).
  * On screen: "Letter of acceptance for Sample Student W · Not done", and no separate check item.
  * FS case (Not applicable before never): the passport is counted Not done.
  * Pure fail tests cover both.
* **M2 fixed.** `engine/runtime/case-checklist.ts:234` carries never only from a requirement that applies as strongly as the line it joins. Probe "false, base+never": `needed, never_waivable: false`. Pass and fail tests are present.
* **m1 fixed.** A kept line sets `never_waivable: false`.
* **m2 fixed.** The line reads "Never waived now: it still blocks Ready to file; request it again", and the menu offers Request again (seen).
* **m3 fixed.** The role is checked before the body: a client gets 403 on both actions (API test).
* **m4 fixed.** The stale comments and dead text are gone.
* **m6 partly fixed.** Check labels name C6.4 and C7.6; the stored `required` rule now has the API "legacy" test.
* **m5 goes to the tech lead** as a PR question. I accept that.
* **Breaker M1 fixed for a lone line.** A never line that waits for an answer blocks and names the question (seen: "…may be needed: answer "Current marital status" first…").
* **Breaker M3 fixed.** "What changes" lists "Passport information page copy · Never waivable now" for Client F, and the filing is touched with words (seen before the move).
* **Rollback note fixed.** It now says released snapshots keep "never".

**New in this diff**
* **Major N1. The breaker-M1 hole is still open when a plain line for the same document exists.**
  * Where: the M2 guard at `engine/runtime/case-checklist.ts:234` drops `never_waivable` from an `answer_first` requirement merged into a needed plain line, so `p.waiting` no longer holds it. `waitingNever` (`api/src/case-prepare.ts:637`) reads only `p.waiting`, so nothing blocks.
  * Scenario (pure probe): a plain "Police certificate · principal" line, plus a conditional never line whose question is unanswered. The result is one line, `needed, never_waivable: false`, with no waiting line.
  * Effect: Ready to file is reached by passing the missing-document and missing-facts warnings, before the answer that would make it never. Without the plain line the same case blocks. P-172's own shape (a plain per-applicant police line, plus a never line for "children 18+" with the date of birth unanswered) falls into this hole.
  * My M2 fix wording ("the C6.14 guard") caused this; I should have excluded `answer_first`.
  * Fix, either of:
    * (a) carry `never_waivable` from any requirement that is not `not_needed` (blocks until received, or until the answer says it does not apply);
    * (b) keep the waiting never requirement's questions on the merged line, and feed them to Prepare as a `waiting` never item.
  * Either way, add a pass test and a fail test for "base + never, condition unanswered".
* **m7 (Minor).** The release-move rule is per document type, not per person's line (`engine/runtime/release-update.ts:78,112`).
  * Scenario: a type that is never only on a principal line names "Never waivable now" for every person who has that type, a spouse included.
  * It also touches their filings, so a review made before the move stops counting (BR-6).
  * It errs towards asking again. Fix it, or list it in the PR.
* **m8 (Minor).** The checklist's "May be needed" card does not say the line is never waivable; only the Ready to file block does.

**Verdict: Block** (commit d38208185af93dde7e45037d4dac3500fc94ebd5). To fix, then a diff-only re-review:
1. Major N1: `engine/runtime/case-checklist.ts:234` with `api/src/case-prepare.ts:637`. A never-waivable requirement waiting for an answer, merged into a plain needed line, raises no block.
2. Minors m7 and m8: fix them, or list them in the PR.

## Re-review at c9cd0b9bb (diff only: `d38208185..c9cd0b9bb`, N1 and m8)
Commit `c9cd0b9bb30afc4b79c4fd74c09f816ccb404ecf`. Copy `rv_m3s4c` on :4437 (configured checkpoint, live AI off, US$0), stopped after.
* **Suites run:** `check_m3s4_never_waivable` 32/32; `check_m3s4_blocking_api` 20/20; `check_c710_figure` 37/37; `check_c76_readiness` 91/91; `check_c95_release_update` 34/34; `check_vv_checklist` 76/76; `check_c614_providers` 27/27; `check_m3s3_waivable` 15/15; B164 52/0.
* **N1 fixed.** `engine/runtime/case-checklist.ts:239-242`.
  * My earlier probe: "base + never, condition unanswered" now gives `needed, never_waivable: true`; the other five cells are unchanged ("false" stays plain; "true" is never outright).
  * Merge order, traced by hand: plain+waiting-never, waiting-never+plain, and a needed never with a waiting never, in either order. Each gives the same result, and a needed never requirement drops `never_if`. A kept line drops `never_if` too.
  * On screen, on the API suite's case:
    * the line reads "Never waived if "Current marital status" calls for it: Ready to file waits until it is received or that answer rules it out";
    * the menu has no Waive… and no Not applicable…;
    * the block is the same words with no pass, and the figure shows "Letter of acceptance … Not done";
    * axe 0; no sideways scroll at 1024 or 400 px; no page errors.
  * Tests: pure pass and fail tests, plus the API "waiting pass (re-review N1)" check.
* **m8 fixed.** The "May be needed" card shows "Never waived: Ready to file waits until this is answered and, if it is needed, received" (`web/src/runtime/checklist.tsx:101`). I read this in the code only: no waiting card was on my cases.
* **m7 stays as a listed Minor** in the PR. I accept that.
* **New, Minor m9.** On a line that is never waivable only through `never_if`, the 422 for Waive or Not applicable (`api/src/case-checklist.ts` `neverWords`) says "…never waivable, so Ready to file waits until it is received". It leaves out "or that answer rules it out". The refusal is right; only the words are less exact. Fix it, or list it in the PR.

**Verdict: Approve.** No open Blocker or Major. This Approve covers exactly the head `c9cd0b9bb30afc4b79c4fd74c09f816ccb404ecf`; it does not cover any later commit. Open Minors, listed or to be listed in the PR: m7 and m9.
