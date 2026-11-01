# Review: C6.4 Visitor visa (`vv.single`) document checklist per person (M3-B, runtime lane, backend only)

Reviewer: fresh agent, did not build it · 1 Nov 2026.

**Commit reviewed: 9cf262bd**, judged as `git diff 9a03fa6c 9cf262bd` (C6.4 only).
* First pass at fa2fab91: unit 48/48, API 26/26, any 429.
* The branch then moved: 96d60011, da982b89, and the merge 9cf262bd. Every check below was redone at 9cf262bd.
* d70d86a4, pushed later, only merges main and touches no C6.4 file.

**Bar:**
* `screens/M3-agent-view/concept-draft.md` BR-3 ("release requirements × role × mode × conditions on that person's facts; recomputed when answers change; reason").
* `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`, `DECISIONS.md` P-169, P-170, P-171, P-129.
* The breaker's `break-report.md`, and the lost first review's findings as relayed by the coordinator.

**Setup:** isolated `rev64` on :4466 (`xr_studio_rev64`), fresh database, stopped after use; never :4400. US$0, no AI calls.

**Journey test** (the one score for this check): `journey-test-reviewer-2026-11-01.md`, **8.5 / 10, pass**.

## Verdict: Approve (for commit 9cf262bd)
No Blocker or Major is open. One Lead action and one clean-up are listed below; neither blocks this commit.

## Runs at 9cf262bd
* `tsx --tsconfig studio/api/tsconfig.json studio/tests/check_vv_checklist.ts`: **60/60**.
* `check_vv_checklist_api.ts 4466 xr_studio_rev64` on a fresh copy: **28/28**. The suite released the Visitor visa itself.
* `node studio/tools/count-any.mjs --against origin/main`: **429 = base**.
* `select-suites.mjs` picks both `check_vv_*` suites for a change to either `case-checklist.ts`. The API suite's usage line matches run-suites' isolated-copy pattern.
* My full `run-suites --changed` run was stopped and is **not evidence**: the working tree moved from fa2fab91 to 9cf262bd mid-run, and the builder stopped `tests/check_` processes. I rely on the builder's 14 touched suites for the knock-on effects of render.ts, validate.ts and case.ts.

## Earlier findings: re-checked at 9cf262bd
| Finding | Status | Evidence |
|---|---|---|
| R1 explicit `any` | **Fixed** | 429 = base; local types `Req`, `CheckRow`, `Cond` |
| R2 CI ran neither suite | **Fixed, another way** | `run-suites.sh` is back to main's version (the Lead's tool). The suites moved to `tests/check_vv_checklist*.ts`, which the runner and the selector already discover; the API suite runs `setup_visitor_visa.ts` itself on a fresh copy (I saw this work) |
| R3 / B-M1 wrong person's list | **Fixed** | Holders come from `subjectsFor(persons, r.who)`; only `case` goes to the principal; the condition is decided on its own subject (`conditionFor`). Mutation (holders from subjectKind) → 4 tests fail |
| R4 police 6 months as constants | **Fixed** | A `document_validity` row matched on `applies_to` = document type key, with cite and quote. `validityProblems()` is one test shared by `validate.ts` and the engine; duplicates are not used; months 1–120; https only; marked Sample. Renaming the type does not lose the rule, and a release without the row gets no rule. Mutations of the months cap, duplicates and citation → tests fail |
| B-M2 rejected answers used | **Fixed** | `api/src/case-checklist.ts:26` filters through `checkValue`. API check: 2200 → waiting, no age 191; 2026-11-01 → needed again |
| B-M3 calculated field named; 1900 accepted | **Fixed** | Inputs are named in question words. `case.application_date` has a ±5-year bound by date (`case.ts`, Sample). Mutation → 2 tests fail |
| Breaker M1 (padded date) and M2 (unused rule used) | **Fixed** | Trimmed read; shared `validityProblems`. Mutations fail |
| Minors: DOCUMENT line dropped, duplicates, empty release, two age dates, Sample on the rule, check both, merged Always | **Fixed** | Each has a passing and a failing check (`check_vv_checklist.ts`) |
| `today` is UTC; freshness helper unused | **Accepted** | Said in `ages_on_why`; `issuedWithin` waits for C6.5 by plan |
| Breaker m3, m4, m5, m9, m11 | **Open, Minor** | See below |

## Preview against runtime (asked)
**Runtime is right.** Configuration's line shape is "document × who × only if" (W1 concept), and BR-3 says "conditions on that person's facts". So `who` decides whose list a line is on, and the condition only decides whether it is needed.

Configuration's preview places lines by the condition's subject for PRINCIPAL, SPOUSE and DEPENDENT conditions, and it drops DOCUMENT-condition lines:
* `engine/render.ts:204-206`
* `engine/sources.ts:52`
* `engine/sources.ts:271`

As a result, a principal's line with a spouse condition previews on the spouse's list, while the officer sees it on the principal's.

**This need not be fixed in this PR:**
* It is configuration's code, with its own suites and screen.
* No released line today has a `who` that differs from its condition's subject (the Visitor visa police line is each_applicant with EACH_APPLICANT).

It must not stay silent, though (see Lead action).

## Issues (none blocks)
1. **Lead action (Should).** Record the preview/runtime difference as a configuration item: one shared "holders" function used by `render.ts`, `sources.ts` and `case-checklist.ts`, so an author's preview equals the officer's list (STANDARDS §7, no duplicated logic). Name it in the PR.
2. **Clean-up (Should, caused by me).** My stopped run rewrote `prototype/studio/evidence/grounding-db/check_grounding_db.json` (port 32402, `xr_studio_rev64_grounding`). Merge 9cf262bd committed it. It is unrelated to C6.4: restore it to main's version. Also commit the updated journey file: the copy in da982b89 is my fa2fab91 draft.
3. **Should.** The field sets differ between the two halves of the validity test:
   * `validate.ts` asks `types.has(before)`, which uses the library.
   * `validityRules` asks the snapshot's `canonical_fields`, which holds used fields only (`snapshot.ts:142-152`; checks are not in `conds`).
   * So a release that otherwise never uses `case.application_date` passes the release check, yet its rule is silently not used on cases.
   * Fix: one field set, or add `before` to the snapshot's used fields.
4. **Minor.** `duplicateValidity` counts malformed rows too, but its comment says "usable": a malformed second row disables a good one (`case-checklist.ts:82-84`). Either align the comment or count usable rows only.
5. **Minor (breaker m4, open).** A `who: "case"` line with an EACH_APPLICANT condition is decided on the principal only (`conditionFor`, `[holder]`). It should be "any applicant".
6. **Minor: three removed rules fail no test.**
   * The `render.ts` skip of `document_validity`. Harmless today: `evalCondition` returns cannot_tell.
   * The `toAsk` calculated-field-to-inputs mapping (`evaluate` already reports the inputs when the field is executable).
   * https-only (an `http://` URL passes the suite).
   * Add a failing case for each, or drop the dead branch (STANDARDS §7).
7. **Minor.** `age < 18` is a literal while `MINOR.underAge` exists (`case-checklist.ts:154`; "defined once").
8. **Minor.** `(not executable: …)` entries in `missing` would be shown as questions. `render.ts` addDecider skips them; `toAsk` does not.
9. **Minor: words.**
   * Double negative in "Not needed: the answers show it is not the case that…" (`:158`).
   * The application-date question shows the library meaning ("…reference date for calculated values").
   * A dropped answer reads "answer X first".
   * 2200 still gets "Enter a real date" (m9).
10. **Minor.** `validate.ts` (configuration engine) now imports from `engine/runtime/`. A shared rule module under `engine/` would keep the layering.
11. **Expert question (breaker m5).** People not applying still decide other people's conditions (consent letter for a non-travelling minor). Same as `render.ts`. Unconfirmed: the immigration expert decides.

## [M] standards, where they apply (backend item)
* **Met:**
  * Content is data (§3.1: rule as a release row).
  * Every output explains itself (§3.9).
  * A passing and a failing test per rule (§3.10), except item 6.
  * Pure engine, no I/O (ports and adapters).
  * Server authorisation, deny by default: client and author 403, other firm 404.
  * Problem Details (409 with detail).
  * No N+1: one state read per request; about 40 ms.
  * No `any` added.
  * Sample and P-170 citations carried.
* **Not applicable:** migrations (none), concurrency on writes (read only), axe and Playwright (no screen), uploads (C6.5).
* **Partly met:** "no duplicated logic" (item 1).

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | BR-3 per person × role × mode (applies) × conditions, recomputed per read; team states via SI-14 |
| D2 Data integrity | 4 | Rejected and padded answers handled; read only; malformed or duplicate rules not used |
| D3 Reuse | 3 | Reuses `subjectsFor`, `evalCondition`, `ageInYears`; holder logic still differs from preview (item 1) |
| D4 Rule integrity | 4 | `validate` warns on malformed or duplicate validity rules; gap in item 3 |
| D5 Stability | 4 | 409 then recovery; identical repeated reads |
| D6 Freshness and governance | 4 | Rule carries date read and Sample status; release pin version returned |
| D7 AI trust | n/a | No AI in this item |
| D8–D13 | n/a | No screen (D10 words: 3, item 9) |
| D14 Team look | n/a | No screen; contract follows pack 4's M3-CONTRACT shape |
| D15 Speed | 5 | 38–43 ms per read; breaker: 400 requirements × 6 people in 39 ms |
| D16 Testability | 4 | 60 + 28 checks; 14 of 17 mutations caught |
| D17, D20 | simulated only | No intended user walked it (founder) |
| D18 Provenance | 4 | Lineage, also_from, quote, rule citation, basis text |
| D19 Closure | 3 | Officer read only; the screen and uploads come later by plan |

## Could not check
* A browser or screen walk (none exists).
* Representative and sponsor holders (the release refuses them).
* The full suite run at 9cf262bd: my run was invalidated by the moving tree. Leftover untracked suite outputs in `prototype/p1/inventory/` and `prototype/p2/jobs/` came from that run; deleting them was refused by permissions.
