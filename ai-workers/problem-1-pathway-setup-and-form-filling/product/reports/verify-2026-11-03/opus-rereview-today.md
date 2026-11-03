# Opus re-review of today's PRs reviewed on Sonnet before P-303 (3 Nov) — batch 1

**Asked by:** the tech lead (Lead 3 · 3 Nov), after #723 (`opus-rereview-trial.md`, the trial window itself). This file covers PRs that merge today with reviews run on Sonnet before P-303 reached their lane. It is updated as more of them merge.

**PRs in this batch:** the Lead's list, #686, #693, #698, #699, #691, #689, #703, #709, #700, #715 and #720.
* At 11:00 UTC only #686 and #693 had merged. The other nine were open in or near the merge queue.
* Their **heads** were reviewed (SHAs below), so a defect reaches the tech lead before the merge.
* When each merges, the merged diff is compared with the reviewed head.

**How:**
* Three Opus reviewers in fresh contexts, never "sonnet". This session coordinated them and re-reviewed #686 and #693 itself.
* Each reviewer read the diff, whole files at the head, and the decisions and requirements each PR cites, against `.claude/skills/screen-review/SKILL.md`.
* Pure functions were run on scratch copies (no database, no AI).
* This session confirmed every Critical and Major again by reading the code at the reviewed head.
* Every Critical and Major was sent to the tech lead when it was confirmed.

**Cost:** US$0: live AI off, no paid run, no code changed.

## Table: PR → verdict → defects

Paths are relative to `ai-workers/problem-1-pathway-setup-and-form-filling/` (`studio/` = `prototype/studio/`).

| PR | Reviewed head | State at 11:00 UTC | Verdict | Defects (severity · where · row) |
|---|---|---|---|---|
| #686 qa-tooling: C6.9 usage line; C6.12 breadth pack | merged | merged | Sound | none. Test-only: the new pack runs in no suite, and C6.12 stays Partial while it is red |
| #693 forms: C11.14 live round completed_with_unresolved (money path) | merged | merged | Sound | none (see `opus-rereview-trial.md`) |
| #699 forms: C3.2/C11.14 no AI-proposed new field accepted in bulk | 19e52a8451 | open, queued | Sound | Minors: the code and `qa/built/C3.2.md` cite P-294 where the rule is P-296 (1); P-299 is not in DECISIONS.md (only in the tech lead's comment on #699); the 409 still opens with "Only Ready items are accepted together"; new AI answer lists can still be accepted in bulk (a question for the tech lead). Once merged, QA-193 no longer applies to fields accepted in bulk; QA-191 stays open |
| #700 forms: C11.14 QA-159 near rule (one word inside a longer name, singular and plural) | 9e272bb7fd | open | Sound | Minors: new false positives of the same kind (Date / Date of birth, Country / Country of birth, Status / Status in Canada; they go to Check and need a reason, nothing is refused); misses left (E-mail / Email, Alias / Aliases, Child / Children). On the 305 real field keys, only `email`/`email_address` and `uci`/`uci_number` become near, both genuine |
| #720 qa: after-merge and explore M2 on 762dbae6 (records) | 8d13cdef9c | open, conflicting with main | **Defect found (records)** | **Major** · `product/qa/CAPABILITIES.md` row C3.2 · see R-1 below. **Major** · the C11.13, C5.4 and C3.2 rows · see R-2 below. Its QA-180 Critical is **confirmed**: `check_qa180_two_gates.ts` gives 4/6 on the engine, failing exactly the two holes it names |
| #689 forms: C11.11 checklist forms are not filed lines; online-only shown | fcd2aa4a30 | open, queued | Sound | Minors: a paper application mails the checklist with its package (the PR asks this; Unconfirmed: no counsel); checklist lines saved before the change are not migrated; "online only" is inferred from the editions held, not recorded. Only IMM 5488 and IMM 5905 stop being filed lines; every form in releases c1-v1 to c1-v3 was checked |
| #698 screens: C2.4 older editions never shown as current | e822cc49aa | open, queued | Sound as a change | Its own diff is sound: intake uses the same newest-edition rule as the library, the Forms tab and the finder, and a case pinned to an older release keeps its own snapshot. Checking it found **QA-200 (Critical)**, already on main and outside this diff |
| #691 screens: C3.8 a non-fact Background question refused; clear IMM 5707 error | 5f2e5b51ee | open, queued | **Defect found** | **Critical** · `studio/engine/form-completeness.ts:17` · **QA-199**. Minors: every edition is checked, but an old edition's error cannot be cleared from the current Decide panel; the IMM 5707 error clears only by adding the form, because no route removes a source attachment |
| #709 runtime: C7.7 paper lines with the barcode page in the deliverables list | b03423e222 | open, queued | Sound | Minors: SA-1B-31 is quoted in its older wording (the newest snapshot rewords it); a message staff see says "Ask the Lead", a project role, not a firm role |
| #715 forms: C7.2 IMM 5257 fills 43 of 46 mandatory fields (QA-165) | b41fae1813 | open | Sound | "N" is written only from the person's own visible, answered and confirmed No, never as a default. "N" and "Y" are the values the form allows, and the questions are labelled Sample. Minor, unconfirmed: only a fact's first placement is read |
| #703 infra: type check in CI (`tsc --noEmit`) | bcfecf8915 | open, queued | **Defect found** | **Major** · `product/tools/typecheck.mjs:24-25` · **QA-201**. Minor: "only ever remove lines" from `typecheck-known.txt` is not enforced (`--write` can add lines; any addition shows in the diff). It cannot be bypassed with `continue-on-error` or `\|\| true`; permissions are read-only and there are no secrets; about 84 s per run |

**Totals:**
* Blocker 0 · **Critical 2** (QA-199, QA-200) · **Major 3**:
  * QA-201;
  * two scorecard-accuracy Majors on #720 (R-1, R-2), fixed by #720's rebase, not BUGS rows.
* Minors: the 15 in the table.
* **Sound:** #686, #693, #699, #700, #689, #709, #715, and #698 as a change.

## The Criticals and Majors

### QA-199 (#691, C3.8): half of IMM 5257's Background questions can still be "not a fact" — Critical
* **Where:** `studio/engine/form-completeness.ts:17`. `isBackgroundQuestion` needs a `BackgroundInfo…[n]` part in the field path. The validator (`studio/api/src/studio.ts:223`) and the refusal (`studio/api/src/screen02.ts:54`) use the same test.
* **What it misses:**
  * IMM 5257, 1295 and 1294 put questions 4–6 at `…PageWrapper[0].Military[0].Choice[0]`, `…Occupation[0].Choice[0]` and `…GovPosition[0].Choice[0]`, with no BackgroundInfo part. IMM 1295's field list in `prototype/evidence-lane/E1/imm1295/evidence/` shows these paths.
  * IMM 5710's Background questions are `qANY`, `qBNY`, `qGovtNY` and `qWitnessNY`, so all of them are missed.
* **Scenario:** Visitor visa › IMM 5257 › Decide "Not a fact" on "Did you serve in any military…". The server accepts it (200), Review and release shows no error, and every case's IMM 5257 leaves that question blank.
* **Breaks:** IRCC-F08 (IMM 5257 page and Guide 5256: "All questions in this section must be answered or the application will be considered incomplete and will be returned"), and the PR's own claim for IMM 5257 and IMM 1295.
* **Why the pack passes:** it picks its test question with the same path pattern (`studio/acceptance/C3.8.test.ts:89`).
* **Not a regression:** nothing was protected before #691. It is Critical because the validator reports a map as complete when it is not.

### QA-200 (main, found reviewing #698, C2.4 and C7.2): after a newer edition is released, case fill uses the oldest edition — Critical
* **Where:**
  * `studio/engine/snapshot.ts:157` puts every mapped PDF edition into the snapshot, oldest first (`compareEditions`).
  * `studio/api/src/fill.ts:42` (`writeForm`) takes the first match.
  * `studio/api/src/fill-case.ts:95`, `:110` and `studio/engine/render.ts:108` read it the same way.
  * The combination's Forms tab (`studio/api/src/workspace.ts:71`) and the library pick the newest.
  * `studio/engine/answer-keys.ts:151` already warns that "the first one" is the older edition.
* **Scenario:**
  1. IMM 5476 11-2025 is accepted through impact review. Its map is copied as a draft, and the 11-2021 map stays published.
  2. The combination is released. `studio.ts:1149` publishes the drafts and retires no older map.
  3. The Forms tab shows 11-2025, but a case on that release gets the 11-2021 PDF filled.
* **Breaks:** P-32 (the newest printed edition is the one in use).
* **Unconfirmed:** whether a release gate refuses a combination that holds two mapped editions (not run).

### QA-201 (#703, infra): the CI type check reports PASS when tsc cannot load a project — Major
* **Where:** `product/tools/typecheck.mjs:24-25`.
  * When tsc exits non-zero, any output containing `error TS…` is accepted.
  * Only errors shaped `file(line,col): error TS…` are then counted.
  * Errors about the project itself name no file, so they count 0. The script prints "PASS no new type errors" and exits 0. Examples: TS5058 (the tsconfig path does not exist), TS18003 (no inputs found), TS2688 (a type library is missing).
  * The reviewer reproduced all three with the studio's tsc 6.0.3 on scratch projects.
* **Scenario:** a PR moves `web/tsconfig.json` or `web/src`, or widens the include patterns to ones that match nothing. The type-check job is green and `ci` passes, with no file checked.
* **Breaks:** P-291 (the outsider audit's "no type check in CI", which this PR answers). A false PASS is a misleading message.

### R-1 (#720, records): C3.2 marked "Works, confirmed on 762dbae6", though its ruled bulk rule is not built there — Major
* **Where:** `product/qa/CAPABILITIES.md`, row C3.2, at 8d13cdef9c.
* **The code on 762dbae6:** `bulkWhy` (`studio/api/src/proposals.ts:492-509`) returns null for a Ready AI-proposed new field. That covers an edition-draft item (field, lands on the library, match "new", Ready and agreed) and a Ready field-map new item.
* **Scenario:** two Ready new fields → To review › Choose all › Accept 2 → both accepted in one batch. #699's new fail case asserts that this batch must get a 409.
* **Breaks:** P-296 (1), on main since 3 Nov: "AI-proposed new field definitions are never accepted in bulk, on either the form's field-map page or To review". Also the row's own words, "bulk accept only for clean reuse".
* **Fix on rebase:** C3.2 is Partial until #699 merges and the pack is re-run.

### R-2 (#720, records): three "Works" rows stand against Majors logged since — Major
* **The rows:**
  * C11.13 vs QA-192 (a near duplicate accepted with no reason; the row's own text requires one);
  * C5.4 vs QA-197 (Load sample writes a RELEASED release in a firm workspace, skipping the source-register gate);
  * C3.2 vs QA-193 (bulk-accepted items are not marked for the approver).
* **Cause:** timing, not the tester's fault: #723 logged these after #720's run. But #720 must be rebased anyway (it conflicts with main), and as written the M2 count would include three Works rows that main's own BUGS.md disputes.
* **Fix on rebase:** mark each row Partial with its QA id, or say why the Major falls outside the row.

## Still to do

* Pick up PRs that merge later today with a Sonnet review file, in the next ~2-hourly batch.
* Compare each merged diff with the head reviewed here.
