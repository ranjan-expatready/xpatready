# UX-A part 3 re-review, round 3 (commit dec065a3)

Reviewer agent (did not build it), 2 Nov 2026.

**Scope.** `git diff 91d53c66 dec065a3`, checked against my round 2 (`review-part3-r2.md`: Block on R2-M1, with r2-n1 and r2-n2).

**How it was run.**
* The exact commit, in the detached worktree `/home/user/uxa2-rev`. Its web build (17:58, `index-EgGFKXw_.js`) contains "could not be counted".
* `isolated.sh rev_uxa3 4448`, fresh database plus `demo/load` for each walk and for the check.
* US$0; :4400 never used.
* The checks' screenshots were restored. The only file I changed is this one.

## Verdict: Approve
R2-M1, r2-n1 and r2-n2 are fixed. There is no open Blocker or Major. One new Minor (r3-n1) can go in the PR.

## Round 2 findings
| Item | Status | Evidence (dec065a3, :4448) |
|---|---|---|
| **R2-M1**: the bar counted a library change into "across 1 combination" | **Fixed** | See below. |
| r2-n1: "(0)" in the list heading while counting | Fixed | With `/summary` held, the heading reads "Changes in the draft compared with nothing released (…)" above "Counting the draft changes…". |
| r2-n2: a failed count waited for good | Fixed | See below. |

**R2-M1 evidence.**
* Setup: the approved LMIA retirement is waiting (`/draft?summary=1`: changes 73, library 1), and Visitor visa has IMM 5476 added.
* On Visitor visa's Review tab:
  * The bar reads "**Draft · 72 changes across 1 combination · 1 in the shared library**" and "Review and release (73)".
  * The header facts read "72 draft changes"; step 1 reads "72 draft changes"; the list heading reads "(72)".
* The same holds at 1440, 1024 and 400 px, with axe 0 and no sideways scroll.
* The words come from one pure function, `contracts/status-words.ts` `draftBarWords`. `check_uxa3_words_rules.ts` (5/5) has the mixed case as its fail case, which fails if the library count is added back into the combinations' number.
* Library only: the bar reads "1 change in the shared library, released with the next release" (rule check), as round 2 showed.

**r2-n2 evidence.**
* With `/summary` answering 500, after one retry the list reads "The draft changes could not be counted. Try again".
* Try again is a real button. Focus + Enter (with the route restored) brings back "0 draft changes" and "(0)".
* axe 0 on the failed state.

**Checks:**
* `check_uxa3_words_rules.ts`: 5/5.
* `check_uxa3_status_words_browser.cjs`: 23/23 on a clean copy.
* No page errors on any walk.

## Blockers
None.

## Majors
None.

## Minors (list in the PR)
* **r3-n1: in the failed state, step 1 still says it is counting.**
  * The step card reads "Counting draft changes; 1 problem to fix" while the list below says "could not be counted" (`review.tsx`, StepCard text uses `counting` only).
  * Fix: "Draft changes not counted" when `countFailed`.
* **Carried over, already listed:** my n2/n3/n4; the breaker's m4/m5 and round 2 n2/n4.
* **The breaker's wording note:** the retiring LMIA's own page says "0 draft changes" and does not mention that its retirement is the "1 in the shared library".

## D1–D20 (1–5; only those this diff moves)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | The bar, header and Review tab agree in every walked state: empty, real change, Live, Not ready, retired, library-only and mixed. |
| D4 Rule integrity | 5 | One function for the bar's words; the combinations' number excludes the library's. |
| D11 Feedback and state | 4 | Loading and failure each have their own state; r3-n1. |
| D13 Accessibility | 5 | axe 0 on the mixed state at 3 widths and on the failed state; Try again works by keyboard. |
| D16 Testability | 5 | A pure rules check with the mixed fail case, plus the browser check. |
| D17 / D20 | Simulated only | — |

## Journey test (reviewer, round 3)
| Journey | Result |
|---|---|
| J1 author edits Visitor visa while an approved library retirement waits | Holds. 72 / 72 / 72, with "1 in the shared library" named apart. |
| J2 author opens the retiring LMIA | Holds. The bar is the same; its own tab says 0 (wording note). |
| J3 the summary fails, then recovers by keyboard | Holds. A message and Try again; r3-n1. |
| J4 widths 1024 / 400 on the mixed bar | Holds. axe 0, no sideways scroll. |

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Edit, retire-approve and recover all complete. |
| Next step obvious | 1 | Try again on failure; "Review and release (73)". |
| Plain words | ½ | Earlier listed Minors (n2/n3). |
| Feedback and state | ½ | r3-n1. |
| Correct data | 1 | 72 beside 72; 73 only as the release total. |
| Error recovery | 1 | Try again restores the count. |
| Accessibility and sizes | 1 | axe 0; no sideways scroll. |
| Speed | 1 | The tab is ready within about 1.2 s of navigation. |
| Visual quality | 1 | Same bar and text styles. |
| Trust and sources | 1 | No count contradicts another on the named screens. |
| **Total** | **9 / 10** | **Pass** (8 or more, no 0). |

**Could not test:**
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* 100 combinations.
* CI for the checks, which use the Mac's psql path.
