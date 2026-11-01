# Review: C4.1 questionnaire per person role, PR #348 (replaces #195) at 83aa42b9

Reviewer: independent screen reviewer (did not build this). Date 1 Nov. Live AI off, cost US$0. Copies: `rev348` (PR head) and `rev348m` (origin/main 3f22f26f + this PR, clean merge), both on :4437 only.

**Verdict: Ship after fixes**: one Major, open against the C4.1 row this PR declares built. The PR's own diff (tests + built note) is correct.

## What the PR changes (3 files, tests and records only)
* `acceptance/C4.1.test.ts`: sends `seen` (the order read) on every move, adds the stale-order 409 check, matches the real Review line ("Sections reordered: "X" now 1st").
* New `tests/check_c41_questionnaire_roles.ts` (6 checks): roles have questions, no gaps, nothing asked of nobody, titles in words = library title, passport facts not asked.
* `qa/built/C4.1.md` re-added (qa cleared it in 04d27c51 after scoring C4.1 Partial).
* No conflict or duplication with #284: no app code touched; `git merge-tree` origin/main vs HEAD is clean; none of the 3 files changed on main since the merge base.

## Suites run (by their usage lines, port 4437)
| Suite | PR head | main + PR |
|---|---|---|
| `tests/check_c41_questionnaire_roles.ts 4437 xr_studio_rev348[m]` | 6/6 | 6/6, twice |
| `acceptance/C4.1.test.ts … wp.family` | 16/16 | 16/16, twice |
| `acceptance/C4.1.test.ts` (Visitor visa) | exit 2 "setup missing" | exit 2 (needs C4.11, as the PR says) |
| `tests/check_c41_section_order.ts` (main's, regression) | 32/32 | 32/32 |
| CI on 83aa42b9 (`ci`, shards 1–4: every suite, since the selector picks ALL) | green | — |

Rule removed, test fails: removing the `seen` check (`api/src/studio.ts` "reordered since you opened") makes the new stale check fail (11/16). Rule-sensitive.

## D1–D20 (C4.1 screen as it stands on main + this PR)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Per-role SQR, move, release, one title all behave as the CAPABILITIES row says on wp.family; Visitor visa G4 unproven (C4.11) |
| D2 Data integrity | 5 | Stale move 409 in words; double click moves once (walk); approver 403 |
| D3 Reuse | 4 | Titles from `logical_section`, checked equal |
| D4 Rule integrity | 4 | "Every fact has one source", 0 gaps for all 4 roles |
| D5 Stability | 4 | Reload keeps order; two tabs: second refused in words and refreshed |
| D6 Freshness/governance | 4 | Audit line per move (studio.ts moveSection); Review line names it |
| D7 AI trust | n/a | No AI on this path |
| D8 Orientation | 4 | Breadcrumb + tabs |
| D9 Flow | 4 | Move on the header, Review line follows |
| D10 Language | 4 | Reasons in words on greyed buttons and refusals |
| D11 Feedback and state | 2 | Draft bar and header stay "No unreleased changes… draft matches the release" after a move (Major 1) |
| D12 Visual | 4 | Team tokens; header row dense but readable |
| D13 Accessibility | 4 | axe 0 on tab, preview, review, approver; keyboard reaches Move down (49 Tabs), focus ring visible; no sideways scroll at 400/1024/200 % |
| D14 Team look | 4 | Same shell/components |
| D15 Speed | 4 | Tab ~1.05 s first view; move 90–108 ms |
| D16 Testability | 4 | Pass + fail per rule; mutation spot-check fails as it should; built note names the suites |
| D17 | simulated only | |
| D18 Provenance | 4 | "Sample until the immigration expert confirms" on the counts |
| D19 Closure | 3 | Release path proven on fixture only; Visitor visa waits for C4.11 |
| D20 | simulated only | |

## Issues
**Major 1 (Must), D11 / EXPERIENCE §4 "normal" state, pre-existing from #284, inside the C4.1 row this PR declares built.**
`web/src/pages/workspace/questionnaires.tsx:300` (main :305): after a move, `reload()` invalidates `combination`, `config`, `preview`, `fact-sources`, `section-order`, but not `["draft"]`, `["combination-summary", id]`, `["catalogue"]` (the set `refresh()` uses at :74). Scenario: Reset + Load sample, open With an LMIA › Questionnaires as the author, press Move down on "Application details". The toast confirms the move and the Review tab has "Sections reordered…", but the top bar still says "No unreleased changes. Firms use Release 1." and the header "draft matches the release" (checked at 0, 1, 3, 6 s; only a reload shows "Draft · 1 change"). The author is told there is nothing to release right after making a change. Fix: invalidate those three keys in `reload()` (and in `sel`'s list at :297, which has the same gap). Add a fail-guard to `check_c41_section_order_browser.cjs`: after the move, the draft bar shows "1 change". If the tech lead rules the fix out of this PR, record it in `qa/BUGS.md` with this scenario; the tests-only diff would then be Approve as it stands.

**Minors (Should)**
* `qa/built/C4.1.md:1` starts with "#284:"; README asks for the PR that finishes the capability: name #348 (and #284).
* PR body says the new suite is "7/7"; it has 6 checks (6/6).
* `tests/check_c41_questionnaire_roles.ts:6`: port 4480 is in no lane's range (runtime 4430–4439, `WAY-OF-WORKING.md`:18).
* `acceptance/C4.1.test.ts:11` usage line uses 4440 (screens range) for a runtime test.
* `acceptance/C4.1.test.ts:56` builds the URL without `encodeURIComponent`, unlike the lines around it.
* `acceptance/C4.1.test.ts:55–58`: the approver call is made at :55 but asserted at :58, after the stale check; keep each call next to its check.
* `acceptance/C4.1.test.ts:67`: the change line is found by kind only (`/section/i`); any other section-kind line listed first gives a false failure.
* The role suite duplicates acceptance lines 22–39; the two copies can drift. Accepted reason (the batch does not run acceptance), so note only.
* `select-suites.mjs` has no rule for `acceptance/*` ("no rule covers it" → ALL). This is a tech-lead tooling item, not this PR's. CI ran every suite green on 83aa42b9, which closes handover item (1).

## Concept and standards
* Concept fit (C4.1 row, P-216 (1)(2), P-130): met on wp.family; G4 on Visitor visa unproven (C4.11), as the PR says.
* STANDARDS §45–46 [M]: pass and fail test per rule, rule-removal spot-check passes, axe on each state. Met.
* Graph (main + PR): C4.1 named by 3 suites, the new one included; G3's 2 untested routes are attachments, not this screen.
* Scaffolding (P-33): the tests use `/demo/reset` + `/demo/load` for setup only; every C4.1 step a person takes is on the product's own tab. Not a finding.

## Could not check
A real screen reader; an intended user's unaided walk (D17, D20); Visitor visa end to end (needs C4.11); a headed visible browser (headless Chrome with screenshots used instead).

**Verdict: Block** (commit 83aa42b9). To fix: Major 1. The draft bar and the combination header must refresh after a section move (questionnaires.tsx:300, plus the same list at :297), with a fail-guard in the browser suite. Minors are optional.
