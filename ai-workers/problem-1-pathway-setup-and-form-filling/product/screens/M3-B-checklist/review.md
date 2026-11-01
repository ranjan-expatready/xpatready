# Review: C6.4 Visitor visa (`vv.single`) document checklist per person (M3-B, runtime, backend only)

Reviewer: fresh agent, did not build it · 1 Nov 2026.

**Commit reviewed: 9cf262bd**, judged as `git diff 9a03fa6c 9cf262bd` (C6.4 only). A first pass at fa2fab91 (unit 48/48, API 26/26, any 429) was redone at 9cf262bd. d70d86a4 (later) only merges main and touches no C6.4 file.

**Bar:** `M3-agent-view/concept-draft.md` BR-3; `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`, P-169, P-170, P-171; `break-report.md` and the lost first review's findings.

**Setup:** copy `rev64` on :4466, fresh database, stopped after use. Never :4400. US$0.

**Journey test:** `journey-test-reviewer-2026-11-01.md`, **8.5 / 10, pass**.

## Verdict: Approve (for commit 9cf262bd)
No Blocker or Major is open. Items 1 and 2 below are a Lead action and a clean-up; neither blocks.

## Runs at 9cf262bd
* `check_vv_checklist.ts`: **60/60**.
* `check_vv_checklist_api.ts 4466 xr_studio_rev64`, fresh copy, the suite released the Visitor visa itself: **28/28**.
* `count-any --against origin/main`: **429 = base**.
* `select-suites.mjs` picks both suites for either `case-checklist.ts`; the API suite's usage line matches run-suites' isolated pattern.
* My full `run-suites --changed` run is **not evidence**: the tree moved fa2fab91 → 9cf262bd mid-run, and the builder stopped `tests/check_` processes. For the knock-on effects of render.ts, validate.ts and case.ts I rely on the builder's 14 touched suites.

## Earlier findings at 9cf262bd
| Finding | Status | Evidence |
|---|---|---|
| R1 `any` | **Fixed** | 429 = base; local types |
| R2 CI ran neither suite | **Fixed** | `run-suites.sh` is as on main. The suites are in `tests/check_vv_checklist*.ts`, which the runner discovers; the API suite runs `setup_visitor_visa.ts` itself (seen working) |
| R3 / B-M1 wrong list | **Fixed** | Holders from `subjectsFor(persons, r.who)`; `case` → principal; condition decided on its own subject. Mutation → 4 fails |
| R4 police rule as constants | **Fixed** | `document_validity` row on the type key. One shared `validityProblems()` for validate and engine; duplicates not used; months 1–120; https; Sample. Mutations → fails |
| B-M2 rejected answers used | **Fixed** | `api/src/case-checklist.ts:26` `checkValue` filter; API: 2200 → waiting, then needed again |
| B-M3 calculated field; 1900 | **Fixed** | Inputs in question words; ±5-year bound by date (`case.ts`, Sample). Mutation → 2 fails |
| Breaker M1 padding, M2 unused rule used | **Fixed** | Trimmed read; shared test. Mutations fail |
| Minors (DOCUMENT dropped, duplicates, empty release, ages, Sample, check both, merged Always) | **Fixed** | Each has a pass and a fail check |
| UTC `today`; `issuedWithin` unused | **Accepted** | Stated in `ages_on_why`; C6.5 by plan |
| Breaker m3, m4, m5, m9, m11 | **Open, Minor** | Items 5, 9, 11 |

## Preview against runtime (asked)
**Runtime is right.** The configured line is "document × who × only if" (W1 concept), and BR-3 says "conditions on that person's facts": `who` decides the list, the condition decides the need.

Preview (`render.ts:204-206`, `sources.ts:52`, `:271`) puts PRINCIPAL, SPOUSE and DEPENDENT-condition lines on the subject's list, and drops DOCUMENT lines. So a principal's line with a spouse condition previews on the spouse's list.

**Not required in this PR:**
* It is configuration's code, with its own suites and screen.
* No released line today has a `who` that differs from its condition's subject.

It must be recorded, though (item 1).

## Issues (none blocks)
1. **Lead action (Should).** A configuration item: one shared holders function for `render.ts`, `sources.ts` and `case-checklist.ts`, so preview equals the officer's list (STANDARDS §7, no duplicated logic). Name it in the PR.
2. **Clean-up (Should; my run caused it).**
   * 9cf262bd committed `studio/evidence/grounding-db/check_grounding_db.json` as rewritten by my stopped run (port 32402, `xr_studio_rev64_grounding`). Restore main's version.
   * da982b89 holds my fa2fab91 journey draft; commit the current file.
3. **Should.** Two field sets for one test:
   * `validate.ts` checks `before` against the library.
   * `validityRules` checks the snapshot's used `canonical_fields`; checks are not in `snapshot.ts:144` `conds`.
   * So a release that otherwise never uses `case.application_date` passes the release check, while its rule is silently dropped on cases.
   * Fix: one field set, or add `before` to the snapshot's used fields.
4. **Minor.** `duplicateValidity` also counts malformed rows (its comment says "usable"), so a bad second row disables a good one (`case-checklist.ts:82-84`).
5. **Minor (breaker m4).** A `who: "case"` line with an EACH_APPLICANT condition is decided on the principal only (`conditionFor`). It should be "any applicant".
6. **Minor (STANDARDS §7).** Three removed rules fail no test: the `render.ts` `document_validity` skip, the `toAsk` derived-to-inputs mapping, and https-only (`http://` passes). Add a fail case for each, or drop the branch.
7. **Minor.** `age < 18` is a literal; use `MINOR.underAge` (`case-checklist.ts:154`).
8. **Minor.** `(not executable: …)` entries in `missing` would show as questions; `render.ts` addDecider skips them.
9. **Minor: words.**
   * Double negative at `:158`.
   * The application-date question uses the library meaning ("…reference date for calculated values").
   * A dropped answer reads "answer X first".
   * 2200 → "Enter a real date" (m9).
10. **Minor.** `validate.ts` imports from `engine/runtime/`; a shared module under `engine/` would keep the layering.
11. **Expert question (m5).** People not applying still decide others' conditions, as in `render.ts`. Unconfirmed: the immigration expert decides.

## [M] standards (backend item)
* **Met:** §3.1 content as data; §3.9 each line explains itself; §3.10 pass and fail per rule (except item 6); pure engine; server authorisation, deny by default (client and author 403, other firm 404); Problem Details (409); one state read, no N+1, about 40 ms; no new `any`; Sample and P-170 citation carried.
* **Partly met:** no duplicated logic (item 1). **Not applicable:** migrations, write concurrency, axe and Playwright, uploads.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | BR-3 person × role × mode (applies) × conditions, per read; SI-14 states |
| D2 Data integrity | 4 | Rejected and padded answers handled; read only; bad or duplicate rules unused |
| D3 Reuse | 3 | Shared `subjectsFor`, `evalCondition`, `ageInYears`; holder logic differs from preview |
| D4 Rule integrity | 4 | `validate` warns on bad or duplicate rules; gap in item 3 |
| D5 Stability | 4 | 409 then recovery; repeat reads identical |
| D6 Freshness and governance | 4 | Date read, Sample status, release version |
| D7 AI trust | n/a | No AI |
| D8–D14 | n/a | No screen (words, for D10: 3, item 9) |
| D15 Speed | 5 | 38–43 ms per read; 400 × 6 in 39 ms (breaker) |
| D16 Testability | 4 | 60 + 28 checks; 14 of 17 mutations caught |
| D17, D20 | simulated only | No intended user walked it |
| D18 Provenance | 4 | Lineage, also_from, quote, citation, basis |
| D19 Closure | 3 | Officer read only; screen and uploads come later by plan |

## Could not check
* A browser walk (there is no screen).
* Representative and sponsor holders (the release refuses them).
* A full suite run at 9cf262bd.
* Untracked outputs from my stopped run remain in `prototype/p1/inventory/` and `prototype/p2/jobs/`; deleting them was refused.
