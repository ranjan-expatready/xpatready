# UX-A part 3 re-review, round 2 (commit 91d53c66)

Reviewer agent (did not build it), 2 Nov 2026.

**Scope.** `git diff 4ee92384 91d53c66`, checked against my round 1 (`review-part3.md`) and the breaker's round 1 (`break-report-part3.md`: B1, M1–M3, m1–m5).

**How it was run.**
* The exact commit, in the detached worktree `/home/user/uxa2-rev`. Its web build (17:45, `index-BVw8ygbD.js`) contains "Counting the draft changes".
* `isolated.sh rev_uxa3 4448` (nobody else on it), with a fresh database and `demo/load` for each walk and each suite.
* The release path ran through the UI: Super visa got one form; user-A submitted and user-C signed via the API; user-B clicked **Approve and release** on the Review tab, with no reload.
* The retire path ran through the API: retire, approve, `pack/release`.
* US$0; :4400 never used.
* The checks overwrite tracked screenshots: I restored them. The only file I changed is this one.
* The breaker's round 2 (`break-report-part3-r2.md`, untracked) appeared while I worked. I read it after my own walk.

## Verdict: Block
One Major is open: **R2-M1**, the second half of the breaker's M3, which the round-2 notes call fixed. Everything else from round 1 is fixed or listed as a Minor.

## Round 1 findings
| Item | Status | Evidence (91d53c66, :4448) |
|---|---|---|
| **B1**: Not ready in the header, Live on the strip and card | **Fixed** | See below. |
| **M1**: retired header said Live with a next step | **Fixed** | See below. |
| **M2**: header stale after Approve on the Review tab | **Fixed** | See below. |
| **M3**: bar vs combination with a library change | **Half fixed** | Library-only reads "Draft · 1 change in the shared library, released with the next release"; LMIA's header and Review say 0. The mixed case is still open (R2-M1). |
| my n1 / break m2: 22-change flash while the summary loads | **Fixed** | With `/summary` delayed 3 s: "Counting draft changes; 1 problem to fix", "Counting the draft changes…", no library rows, Submit disabled, axe 0. Two new Minors on this state (r2-n1, r2-n2). |
| break m3: Documents remove leaves the header stale | Fixed by code | `documents.tsx:61` now invalidates `["combination-summary", id]`, the key `combination.tsx:62` reads. Not walked: the demo has no draft documents to remove. |
| my n2 = break m1 ("setup draft" reasons), n3 (P-180 card), n4; break m4, m5 | Listed in the PR, as the builder says | Unchanged. Not re-scored. |

**B1 evidence.**
* Super visa, released with IMM 5257 SCH1 (`/summary`: row NOT_READY, chip NOT_READY, bar "0 of 5 steps").
* The header says **Not ready**, and the strip says "Setup steps · 0 of 5 done", with no "Live" and no "for the next release".
* The card shows "0 of 5 steps", and the chips read Live 1, In progress 4. Catalogue counts: live 1, not_ready 1.
* The Structure row says Not ready.
* The engine fail case is in `check_setup_checklist.ts`, and the browser case is in the UX-A3 check.

**M1 evidence.**
* LMIA retired at Release 3: the header says **Retired**, with no next-step box, no strip and no tab badges (Overview and Review).
* "for the next release" appears nowhere on the page.
* axe 0 at 1440, 1024 and 400 px, with no sideways scroll.

**M2 evidence.** 2.5 s after the click, with no reload:
* The chip moves from In progress to Not ready.
* The facts read "In Release 2 · draft matches the release".
* The bar reads "No unreleased changes. Firms use Release 2."
* The tab reads "0 draft changes" and "identical".

**Checks on clean copies:**
* `check_uxa3_status_words_browser.cjs`: 23/23, run twice.
* `check_setup_checklist.ts`: 66/66.
* `check_x1_overview_strip_browser.cjs`: 28/28.
* No page or console errors on any walk.

## Blockers
None.

## Majors
* **R2-M1: in a mixed draft, the bar gives the combination a change it does not have.**
  * **Steps:**
    1. Retire LMIA (user-A) and approve the retirement (user-B), so one library change waits.
    2. Add IMM 5476 to Visitor visa.
    3. Open Visitor visa's Review tab.
  * **Result:** on one page, the bar reads "**Draft · 73 changes across 1 combination**", the header facts read "**72 draft changes**", and step 1 reads "**72 draft changes**". Scratch screenshot: `r2-m3-mixed.png`.
  * The extra 1 is the library change. `App.tsx:145` still puts `x.changes` (rows plus `library.length`) in front of "across N combinations". The Release page already says it correctly ("… across 1 combination and 1 library change").
  * **Why Major:**
    * It is a misleading message (`qa/BUGS.md` severity), on the row's own named surfaces ("the banner agrees with the Review tab"; finding 1's one count per label).
    * It is the half of round 1's M3 that the round-2 notes report as fixed.
    * An approved library change waiting beside a combination's edits is the ordinary shared-draft flow.
  * **Fix:** count the rows' changes before "across N" and name the library part separately, e.g. "Draft · 72 changes across 1 combination · 1 in the shared library". "Review and release (73)" can keep the total. Add the mixed case as a fail case in `check_uxa3_status_words_browser.cjs`.
  * The breaker files this as Minor (their n1). I disagree, for the reasons above.

## Minors (fix, or list in the PR)
* **r2-n1: while counting, the list heading still says "(0)".** It reads "Changes in the draft compared with nothing released (0)" directly above "Counting the draft changes…" (`review.tsx:80`, `changes.length`). Drop the number while `counting`.
* **r2-n2: a failed summary leaves the Review tab counting for good.**
  * With `/summary` answering 500, the tab still says "Counting draft changes" after 6 s. It gives no error and no Try again, and Submit is disabled with no reason.
  * EXPERIENCE §4 says errors show with the fix. This is the same as the breaker's n3.
  * Fix: pass `sum.isError` and show the Overview's retry.
* **Breaker round 2 n2 and n4 (lifecycle, Show retired filters):**
  * A retired combination keeps a submittable draft.
  * Structure's Live and Not ready filters list retired rows.
  * Both are real, and neither is a status-word conflict on the named screens. List them.

## D1–D20 (1–5; only those this diff moves)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | One state per combination on the header, strip, card, chips and Structure, across all four paths; R2-M1. |
| D4 Rule integrity | 4 | One startable verdict now drives both chips (`notStartable`); the bar's "across N" rule is still wrong in the mixed case. |
| D11 Feedback and state | 4 | Refresh after release, and the counting state; r2-n1, r2-n2. |
| D13 Accessibility | 5 | axe 0 on the counting, Not ready and Retired states at 1440, 1024 and 400; no sideways scroll. |
| D16 Testability | 4 | B1 has engine and browser fail cases; there is no mixed-draft case (R2-M1). |
| D17 / D20 | Simulated only | — |

## Journey test (reviewer, round 2)
| Journey | Result |
|---|---|
| J1 approver releases Super visa from the Review tab, no reload | Holds. Header, bar and tab update together (M2). |
| J2 author reads Super visa after release | Holds. Not ready on the header, strip, Structure and chips; never Live (B1). |
| J3 author opens retired LMIA | Holds. Retired, no next step, no badges (M1). |
| J4 author edits Visitor visa while a library retirement waits | **Breaks.** 73 vs 72 (R2-M1). |
| J5 slow / failing summary on the Review tab | Counting holds. The failure has no way out (r2-n2). |
| J6 widths 1024 / 400 on the new states | Holds. axe 0, no sideways scroll. |

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Release, retire and edit all complete. |
| Next step obvious | 1 | Retired shows no next step; Live says "for the next release". |
| Plain words | ½ | Round 1 n2/n3 are still listed. |
| Feedback and state | ½ | r2-n2: the failure state has no recovery. |
| Correct data | ½ | R2-M1: 73 vs 72 on one page. |
| Error recovery | ½ | r2-n2. |
| Accessibility and sizes | 1 | axe 0 on 9 new states. |
| Speed | 1 | Header refresh within 2.5 s of the release. |
| Visual quality | 1 | Retired pill and counting text use existing components. |
| Trust and sources | 1 | No state contradicts another; only the bar's count does. |
| **Total** | **8 / 10** | **Pass** (8 or more, no 0). The verdict is still Block, because a Major is open. |

**Could not test:**
* break m3 live (the demo has no draft documents).
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* 100 combinations.
* CI for the checks, which use the Mac's psql path.

**To fix before Approve:** R2-M1, with its fail case. r2-n1 and r2-n2 can go in the PR.
