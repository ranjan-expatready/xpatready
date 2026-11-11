# BK-9 review: shared-filing changes on any pathway (independent reviewer, 11 Nov)

Commit `c920937f1` (branch `claude/runtime-bk9`, PR #1602). Scope: `git diff origin/main...c920937f1`. Row: bake plan row 23; P-448, P-319, P-425.
Own copy `rv_bk9` on :4437, configured checkpoint loaded (POST /api/demo/load as user-A), live AI off, US$0. The copy was stopped and its database dropped.
Journey test: `journey-test-reviewer-2026-11-11.md` (score **8.5/10**).

## What holds (evidence)
* **The refusal is gone, with no key.** origin/main's `applyChange` gives 422 "not worked out yet for Outside Canada…" for Remove filing and for Make principal on a shared release. I ran its own copy of the file on the same data in my scratchpad. This commit gives 200.
  * `everyoneFilesOwn` is removed. B164's guard passes 52/52, and its allow-list is unchanged (it did not grow).
  * `CO_FILED` is a mode name read from the release (`releaseModes`), not a combination key.
* **Suites on the configured checkpoint:**
  * `check_bk9_shared_filing.ts` 17/17 and `check_bk9_shared_filing_api.ts` 13/13.
  * `runtime/check_filing_changes.ts` 26/26, C6.13 32/32, C6.12 24/24, C6.17 47/47, C11.12-runtime 4/4.
  * `check_qa329_filing_change_order.ts` 7/7, `runtime/check_vv_filings.ts` 61/61, `runtime/check_added_filings.ts` 56/56.
  * `check_c613_filing_changes_browser.cjs` 13/13: the Visitor visa dialog words are unchanged.
* **The re-key in case-prepare (`case-prepare.ts:229-236`), checked on Express Entry:**
  * Make principal, then Undo, then Remove spouse, then Add back, then Remove child, then Make principal, then Add child back: always 1 filing row, the same filing id, the owner is the principal, and the child's items keep their ids.
  * The `(case, stage, subject)` constraint is safe: the re-key is skipped when any row (active or not) already has the new owner.
  * A recorded filing cannot reach the re-key: BR-7 refuses the change first.
  * Race: 6 rounds, each with 2 identical applies and 6 prepare reads at once. Result: 42×200 and 6×409, one row, items 12/12 distinct, owner = principal.
* **Ready to file (BR-6)** is reset on Make principal for the shared filing, and the preview says so.
* **Server-side role check:** a client actor (user-P) gets 403 on the preview.

## Issues (ranked)
**Major 1. A minor's hand-signed form is not warned about on a shared application.**
* Where: `api/src/filing-changes.ts:106-108`. It looks for the child's *own* filing (`filings.find(x => x.subjectId === child.subjectId)`). On a shared application the child has none, so the count is 0.
* Failing scenario: Express Entry, principal + spouse + child aged 8, with a signed scan on one of the child's form items. The Make principal preview shows only "Signed for as their parent by …". The same state on the Visitor visa also shows "1 form already signed by hand by …: to be signed again (warning)" (probe A2 against control B).
* Scope: this is BR-4 (M6) and BIC-09. The PR fixed the same own-filing assumption for the item count (line 93) but not here.
* Fix: count by `item: { subjectId: child, filing: { caseId, stageId, active: true } }`, as line 93 does.
* Test: add a failing/passing pair (shared vs own) to `check_bk9_shared_filing_api.ts`.
* Note: I inserted the scan row with SQL on my test copy. The signed-scan route needs every sign step done first.

**Major 2. The co-filed rule does not hold on the product's data.**
* Where: `engine/runtime/filing-changes.ts:55-56`. The `co_files` check comes after `if (!me.applies)`. A co-filing sponsor is stored with `applies = false` (Family sponsorship, `case_participant` on the checkpoint).
* What happens:
  * Remove filing on the sponsor answers 422 "Sample FS has no filing: they are not travelling." That is wrong: they file the sponsorship.
  * Add filing back (line 59 has no `co_files` check) is **accepted**: 200, `changes: []`, the words "Sample GS files their own application again". It writes a `filing_change` row, sets the sponsor's `applies` to true, and the audit says "filing added back".
  * Before BK-9 both were refused for the combination.
* Reach: API only. The screen hides the menu for `p.co_files`.
* The test misses it: `tests/check_bk9_shared_filing.ts:252` builds the sponsor with `applies: true`, a state the product never stores, so it passes while the product fails.
* Fix: check `modeOf(me.role) === CO_FILED` before the `applies` checks, for both Remove filing and Add filing back. Test it with `applies: false`, and add the Family sponsorship case to the API suite.

**Minor 3. The Ready to file reset can miss a shared filing.**
* Where: `api/src/filing-changes.ts:114` and `:146-147`. The reset and its words are keyed by `filing.subjectId`, but the re-key to the new owner happens only on the next prepare read (`case-prepare.ts:229-236`).
* Failing scenario (API): Make principal, then, with no prepare read in between, Remove child on a Ready to file filing. No "Marked Ready to file → Not started" line, and the status stays READY_TO_FILE (probe A'3/A'4).
* The screen masks it, because `apply` awaits the prepare refetch.
* Fix: match `applicants: { some: { subjectId: { in: changed } } }` (the same as today for own filings), or re-key inside the change's transaction.

**Minor 4. Words.**
* The done banner still says "Sample Kid J's filing removed." / "…filing added back" for a person on a shared application (`api/src/filing-changes.ts:151`; the builder's own `walk-2-sp-remove-done.png`). That contradicts the walk's fix ("never said to have their filing").
* In the same dialog the owner's line reads "Sample Student J's filing" under "This changes 1 other person's application too".

**Minor 5. The Add filing back title contradicts its own lines.**
* Where: `api/src/filing-changes.ts:75-77`. For a Study permit child whose line adds their own study permit filing (M3-S2, `studies_six_months_or_more`), the title and intro say "Add … back as travelling on Sample ST3's application? … applies on Sample ST3's application again". The lines below say "Their own filing starts again" and "leaves this filing" (probe D3).
* The fallback at line 75 reads the before-state declared-only place, not where the person goes. Remove's lines also say "joins this filing" for someone joining declared only.

**Minor 6. A stale header comment.** `api/src/filing-changes.ts:5-6` still lists "a case with people on the principal's application (BR-0)" as refused.

## Scorecard
D1–D20 (1–5; evidence is reviewer, script and browser):
* D1 3 (rule removed; Majors 1–2) · D2 3 (co-filer Add back accepted; Minor 3) · D3 4 (one derivation) · D4 4 · D5 4 (race, Undo, reload, stale 409 hold) · D6, D7 not applicable (no AI).
* D8 4 · D9 4 · D10 3 (Minors 4–5) · D11 4 (banner, Undo, reason on the row) · D12 4 · D13 4 (axe clean; keyboard; 400/720/1024/1440 px, no sideways scroll) · D14 4.
* D15 4 (preview 76 ms, apply with refetch 1.36 s) · D16 3 (co-filed test not on the product's state; no test of the signed warning on a shared filing) · D17 simulated only · D18 4 (fees cited, Sample) · D19 4 · D20 simulated only.

BIC (`EXPERIENCE.md` §6). Screenshots are in my scratchpad, not committed (`/tmp/claude-0/-home-user-xpatready/1948601d-b747-55a3-a3f8-561a91efceee/scratchpad/bk9/jshots/`), plus the builder's walk PNGs.

| Check | Result | Evidence |
|---|---|---|
| BIC-08 | Met | Rows say "On X's application" or "Declared only on X's application (not travelling)", with status (j1-ee-done-1440) |
| BIC-09 | Partly | Named action and a preview of what moves. The hand-signed warning is missing on shared applications (Major 1) |
| BIC-11 | Met | One primary button per dialog (j2-sp-remove-1024) |
| BIC-13 | Met | Empty reason gives "Write a reason" at the field; stale gives 409 words in the dialog |
| BIC-18 | Met | Skeleton while the preview loads |
| BIC-19 | Met | One heading and one primary at 1440 and 1024 px |
| BIC-20 | Met | Keyboard-only Make principal path; visible focus returns to the row; 720 px (200 %) and 400 px with no sideways scroll |
| BIC-01–07, 10, 12, 14–17 | N/A | Not touched by this row |

Graph: `graph.mjs` reports G1 0 and G2 0. The route POST /runtime/cases/:id/filing-changes is tested. Retrofit mapping: none needed (no new screen).

## What I could not check
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* Family sponsorship Make principal: the release has no spouse role.
* Approvals and readiness passes carried on a moved filing were reasoned about from the schema, not walked.

**Verdict: Block.** Fix before approval:
1. Major 1: `api/src/filing-changes.ts:106-108`, with a test.
2. Major 2: `engine/runtime/filing-changes.ts:55-59`, with tests using `applies: false`.

Minors 3–6 should go in the same PR (each is one or two lines).
