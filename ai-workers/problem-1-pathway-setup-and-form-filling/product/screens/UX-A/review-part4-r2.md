# UX-A part 4 review, round 2: the fixes for review M1, n1–n3, n6 and n7, and break M2 and M3 (commit 35f7349e)

Reviewer agent (did not build it), 2 Nov 2026.

**Scope.** `git diff cb85bd7e 35f7349e`. cb85bd7e is the reviewed 513e0533, rebased. Checked against my round-1 findings (`review-part4.md`), the breaker's M2 and M3 as the builder describes them, and the row's done-when (BACKLOG UX-A, finding 4, EXPERIENCE §5).

**How it was run.**
* The exact commit, in the detached worktree `/home/user/uxa2-rev`. Its web build (`index-Bi2ft96D.js`, 18:28) contains "AI model (Live)".
* `isolated.sh rev_uxa4 4448`, a fresh database for each suite, `demo/load` as user-A. :4400 was never used.
* US$0: no live switch. No draft or Use Saved was started, no priced button was clicked, and nothing was saved. The condition editor was used in local state only; the field's version count stayed at 1. `drafting_job` counts were unchanged.
* The checks overwrite committed screenshots. I copied the `uxa4-*` shots to my scratch folder and restored every screenshot with `git checkout`. The only file I changed is this one.

## Verdict: Block
One Major (R2-M1). It is a one-line test fix: the PR as it stands turns an existing selected suite red. Everything I found in round 1 that was meant to be fixed is fixed.

## Round-1 findings: status on 35f7349e
| Finding | Status | Evidence |
|---|---|---|
| M1 hash and run files in "Where it comes from" | **Fixed** | See the first bullet below the table. |
| n1 model removed, not moved | **Fixed** | Dialog Details shows "AI model (Live): claude-opus-5-5" from `options.model` (`DRAFT_MODEL`, `api/src/sources.ts:110`). It is hidden when Live is closed. The job's progress words no longer name the model (`sources.ts:528`). |
| n2 `title` carrying the data path | **Fixed** | No data-path `title` on any field page. Each of the 17 unlabeled form fields has its own closed row Details ("Form field path …"), and the keyboard reaches it (header, then sources, then row). |
| n3 `form field ""` | **Fixed** | `boxLine` reads "form field with no label on the form", with the path in `ref`. It also covers the null-caption case that used to print the path. |
| n4 check codes, transformation codes, rule text | Open, as agreed (PR Minor) | The only main-path matches left on the 164 pages are authored rule and check sentences naming keys, on 5 pages, e.g. "…in case.lmia_or_offer_number for entry on IMM 1295" (`case.offer_lmia_exempt`). |
| n5 key in the URL | Open, as agreed (PR Question) | — |
| n6 select cut off; "U / S$" split | **Fixed** | "IMM 5257 · saved Oct 21, 2026, 6:09 a.m. · cost US$1.55" fits at 1440, 1024 and 400 px (`scrollWidth ≤ clientWidth`). Details uses `overflow-wrap:anywhere`. |
| n7 check coverage | **Fixed** | `check_uxa4_details_browser.cjs` passed **37/37, twice**. It waits for sources, covers the field page at three widths, and uses a wider `INTERNAL` pattern (`fieldmap-`, `user-X`, `form field ""`). |

* **M1 evidence:**
  * I walked all 164 field pages, waiting until sources had loaded.
  * No release hash, run file, `user-X`, data path or `""` appears on any main path, and no page has a data-path `title`.
  * Each page shows "From the reviewed work-permit release · proposed by AI". The hash and the runs sit under the sources section's "Details (for admins)" (`library.tsx:169-173`, `library-sources.ts:44-58`).
  * axe is clean at 1440, 1024 and 400 px, with Details closed and open. No sideways scroll.
  * Slowest page: 700 ms.

## Breaker M2 and M3 (as fixed)
* **M2:** the dialog says "US$60.00 left in this round's AI budget (US$120.00 before the AI spending cap)."
  * `spendLeftWords` names the wave only when its room is the smaller one. That matches the server's `remaining_usd`, which is the smaller of the two.
  * The Details spending line names both limits.
* **M3:** the condition editor's placeholder is "field, e.g. Marital status". The datalist offers names ("Application date", …).
  * Typing "Marital status" resolves to the field: the hint shows "Current marital status · code".
  * A key typed in (`person.date_of_birth`) shows "Date of birth".
  * "age" warns `"age" is not a library field yet …`, as before.
  * axe is clean. The demo has no two fields with the same name, so the "(prefix)" tie-break did not show.

## Blockers
None.

## Majors
**R2-M1. `check_cost_warning_browser.cjs:147` still asserts the old Details spending words, which this round changed. The suite is selected for this PR, so it fails.**
* **What changed:** `sources.tsx:186` now renders "US$x of the US$120.00 AI spending cap (the experiment cap) · this round's budget (Wave 1): US$y of US$60.00".
* **What the test expects:** `/US\$\d+\.\d\d of the US\$120\.00 experiment cap · Wave 1: US\$\d+\.\d\d of US\$60\.00/`.
* **Proof:** that pattern returns `false` on the new text (checked with node), while the step's `figure` part still matches.
* **Why it matters:**
  * `git diff --name-only 86f88a9c...35f7349e | select-suites.mjs` chooses `check_cost_warning_browser.cjs`, because of the change to `api/src/sources.ts`.
  * The suite is not quarantined (`run-suites.sh:32-35`), so the PR check and the merge-queue batch go red.
* **Not run by me:** it clicks Start Live and Continue (on a copy with no live switch). This review's rules forbid priced clicks.
* **Fix:**
  * Update the regex at line 147 to the new words, e.g. `/US\$\d+\.\d\d of the US\$120\.00 AI spending cap \(the experiment cap\) · this round's budget \(Wave 1\): US\$\d+\.\d\d of US\$60\.00/`.
  * Make the main-path half accept either `spendLeftWords` form, or assert the form the test's ledger produces.
  * Run the suite once, on a held-queue copy as its header says.

## Minors (fix, or list in the PR)
* **r2-n1. Source references are hard to read at 400 px.** The sources Details lists them as one unbroken run of wrapped monospace lines, with no bullet or gap between references (see `field-400-open.png` in my scratch folder). Fix: add `space-y-1` or a list marker.
* **r2-n2. The tie-break comment does not match the code.** The comment at `conditions.tsx:69` says "Date of birth (spouse)", but the code appends the key's prefix ("person", "relationship"), not a role. Fix one or the other.
* **r2-n3. The cut-off fix is in name only.** It shortened "paid US$1.55 then" to "cost US$1.55". A saved run with "· re-checked first" may still be cut off at 1440 px. The demo has none, so I could not see it.

## Other suites this round touched (fresh copies, :4448)
`check_s6_library_sources.ts` 39/39 · `check_s6_library_pages_browser.cjs` 33/33 · `check_forms_c31_formats_browser.cjs` 15/15.

## D1–D20 (1–5; only those this round moves)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | The done-when holds on all three named screens at three widths, all 164 field pages included. |
| D10 Language | 4 | Origin in words; saved answers and the limit are named. n4's authored sentences remain (agreed Minor). |
| D11 Feedback and state | 5 | Every identifier sits in a closed Details. The model is back for admins. |
| D13 Accessibility | 5 | axe 0 on the field page (closed and open) and the dialog at three widths and on the condition editor. The keyboard reaches every summary. |
| D16 Testability | 3 | The new check is strong (37 steps), but an existing suite was left asserting old words (R2-M1). |
| D17 First-use / D20 Pain and wow | Simulated only | — |

## Journey test (reviewer, round 2)
| Journey | Result |
|---|---|
| J1 author: "where does this field come from?" | Holds. "From the reviewed work-permit release · proposed by AI". |
| J2 admin: release hash, AI runs, form field path | Holds. Under the sources Details and the row Details. |
| J3 author: unlabeled form fields | Holds. Plain words; no `title` and no `""`. |
| J4 author: Draft with AI (opened, not started) | Holds. The saved answer by form, date and cost; the limit named. |
| J5 admin: model, job, run and spending | Holds. |
| J6 author: a condition by field name | Holds. Name in, name shown; a derived value warns. |
| J7 recovery, keyboard, 1440 / 1024 / 400 | Holds. No sideways scroll; nothing created. |

| Criterion | Score | Criterion | Score |
|---|---|---|---|
| Task completed | 1 | Error recovery | 1 |
| Next step obvious | 1 | Accessibility and sizes | 1 |
| Plain words | 1 (n4's authored rule sentences are an agreed follow-up) | Speed | 1 (≤ 700 ms) |
| Feedback and state | 1 | Visual quality | ½ (r2-n1) |
| Correct data | 1 | Trust and sources | 1 (AI marked, origin in words, refs for admins) |

**Total: 9.5 / 10, Pass.** The verdict is still Block because of R2-M1, a CI failure rather than a user-facing one.

**Could not test:**
* `check_cost_warning_browser.cjs` (priced clicks).
* A field proposed by AI and accepted on To review (`proposalLine`; it needs a draft).
* Two fields with the same name.
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
