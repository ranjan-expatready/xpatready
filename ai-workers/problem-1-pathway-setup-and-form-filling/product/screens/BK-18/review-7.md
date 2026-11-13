# BK-18 (QA-448) — re-review, round 7 (diff only: #1691's merge-queue failure)

**Commit reviewed:** `471f34fc259b2fbd6222ae406783ba3a4afec33f` · branch `claude/screens-true-record` · PR #1691 · reviewer agent (did not build it), 13 Nov 2026.
**Scope:** `git diff cd2cce6a..471f34fc` only (5 files: `api/src/case-work.ts`, `api/src/review-rounds.ts`, `engine/runtime/preparers.ts`, `tests/runtime/check_bk18_preparers.ts`, `acceptance/C8.3.test.ts`). Round 6 (`review-6.md`) approved `cd2cce6a`. No journey-test score (the brief: diff-only re-review).
**Evidence:** my own isolated copies `rv6_c83` on **:4461** (configured checkpoint) and `rv6_c76` on **:4462** (fresh), psql on the copy, scratch mutants of the new function. Both copies stopped at the end; `product/screens/` restored with `git checkout`.

## Runs
| Run | Exit | Result |
|---|---|---|
| `acceptance/C8.3.test.ts 4461 xr_studio_rv6_c83` on the configured checkpoint (reset + load `configured`) | **0** | **25/25** (C8.3-13, -13b, -14, -14b, -14c, -18 all PASS) |
| `tests/runtime/check_bk18_preparers.ts` | **0** | 33/33 |
| `tests/runtime/check_review_rounds.ts` | **0** | 52/52 |
| `tests/check_c76_readiness_api.ts 4462 xr_studio_rv6_c76` (fresh copy; the one-step route reads the same `caseWork`) | **0** | 34/34 |
| `tsc --noEmit -p api/tsconfig.json` | 2 | 15 errors, all in unrelated test files (`check_c18_age_case`, `check_c69_runs`, `check_cost_check`, `check_vv_checklist`, `check_x2b_bulk_apply`); none in the five changed files |

## 1. The root cause holds, from the data
On my C8.3 copy, case `9a01822f-…`, the representative (`user-R`) has exactly two work rows: `person.birth_city` on the principal, typed at 17:26:23.417 (step 13) and 17:26:31.145 (step 13b). Everything else they did is review steps or administration, all on the `NOT_WORK` list (`review_opened`, `reviewed`, `review_sent_back`, `representative_changed`). They verified nothing, opened no checks and made no form copies. The spouse's filing `771cb251` was approved in round 1 at 17:26:19.413. That is `row.decidedAt`, the re-approve's base. Round 3 (`reapprove`, 17:26:29.94) is the step-18 click.

At `cd2cce6a`, `approve()` read the case-wide record, so the 17:26:23 typing on the **principal's** filing made the representative an author with the case officer. `selfReviewOf` then refused the spouse's re-approval: 409, `authors.size > 1`, not solo. That is a real product regression against `main`'s P-412 F1, not wording. The knock-on failures follow from the code. C8.3-14c reads round `r3`, and C8.3-14's `repWords` comes from `read(r3)`; with no `r3`, both read a missing round (the 404 the builder quotes).

C8.3-14b at `cd2cce6a` failed for a different reason, BK-18's intended rule (see §3).

## 2. The fix is right and no wider than needed
**What it leaves out.** `ownTypingLeftToForms` drops one kind of row only:
* rows marked `fact` (only `client_canonical_answer.source_json->>'actor'` carries `TRUE`),
* belonging to the reviewer,
* whose time is strictly after the base.

Everything else stays case-wide. That covers the reviewer's `verified_by`, `restored.by` (Undo), group answers, fact rows, documents, checks, forms and audit lines; their typing before the base; and everyone else's typing. The four new unit cases and my mutants confirm each boundary (§4).

**MIN(at) grouping.** The UNION reads every version of `client_canonical_answer`: there is no `superseded_by_id` filter. The `fact` row of a person is therefore the earliest answer version they ever wrote on the case. Dropping it when it is after the base is exactly "this person typed nothing on this case at or before the base". If they typed anything earlier, even something later overwritten, they stay an author case-wide. The separate `(actor, weak, fact)` groups are harmless for `preparersOf`/`behindOf`, whose `earliestFirst` keeps one entry per person at their earliest time. The C7.6 suite (34/34) and the C8.2 cases in `check_bk18_preparers` show the record is unchanged.

**Same base in both paths.** In both `decision` and `reapprove`, one `base` variable feeds both `typedBy(…, base)` and `ownSince: base`:
* `decision`: base is `prev?.round.sentAt ?? round.sentAt`. `changedBy` compares with `baseOf(s)`, the previous round's snapshot or this round's, frozen at those same sends.
* `reapprove`: base is `row.decidedAt ?? round.sentAt`. `changedBy` compares with the stamp snapshot taken at that approval.

So the window the case-wide record gives up, (base, now], is exactly the window the per-form judgement covers.

**Same typist.** `typedSince` names a current answer's typist as `origin?.actor ?? actor`:
* `origin` is the `from` version's own `source_json.actor` (`runtime.ts:489`), and case-work reads that version too, because it reads all versions. Every answer `typedBy` would attribute to the reviewer therefore has a matching case-work row with the same actor.
* Case-work's `fact` rows also include `confirm_section` versions, where the actor is the confirmer. Dropping those is harmless: the confirmer's `verified_by` row (`fact = FALSE`) still counts.
* C6.19 copies keep the earlier giver as `source_json.actor` on both sides.
* Undo's restored version keeps the earlier author, whose earlier version sets the MIN, and the undoer's `restored.by` row stays case-wide.

**Can a reviewer who really prepared THIS filing now self-approve as a second person?** Not by their own standing work:
* **Typing before the base** stays case-wide. See unit case 3 and C8.3-13b, whose step-13 typing happened before round 4's base in the sense that matters: it is still current and `typedBy` sees it.
* **Typing after the base** that stands in an answer a non-waiting form of this filing reads sets `changedByReviewer`:
  * In `decision`, `typedBy` reads all the filing's forms.
  * In `reapprove`, `typedBy` reads the changed forms. Any changed value changes that form's hash, so the form is in `changed`.
  * The result is a 409 or the self statement (C8.3-13, -13b pass, with "second person" in the 409).
* **What is left out:** post-base typing that no longer stands (overwritten by another person, or undone by another person, whose act then counts), or that only a still-waiting form reads (never stamped by this approval). In those cases the approved forms carry none of the reviewer's work. This is `main`'s per-form rule (review M3/M2), not a new hole.

**Earlier rounds' findings.** None is reopened by this diff:
* Round 1 B1 (opening is `weak`) and review 2 B1/M1 are untouched.
* Round 1 B2 (record frozen at review time) is untouched: `ownTypingLeftToForms` is used only in the `approve()` gate. The record path (`preparersOfCase`, `readiness-inputs`, `submission`) is unchanged.
* M2 and review 3 M1 (others' work with no answer row; item-keyed audit lines) are untouched: those rows are `fact = FALSE`, and only the reviewer's own typing is ever dropped.
* Review 2 M3 (administration) is untouched.
* Review 3 B1 (findings are not work) is untouched.
* Review 4 M1 (Undo counted) holds: `restored.by` is `fact = FALSE`.
* Review 4 M2 (refusal words) is unchanged: same `selfReviewOf` texts.

## 3. C8.3-14b is a fair update, not a weakening
At `cd2cce6a` the third case expected 409 from "prepared with another officer", but nobody typed anything on case `pc`. Only the team list (`caseOfficers: [officer, rep]`) made the representative an author. That is the rule P-525 (1) and BK-18 removed, and the same update C7.6's N4 received.

The new version has the officer and the representative each type a fact before the send (`worked` must both be < 300). The 409 then stands on real work by two people. That work is before the base, so it is case-wide, not `changedByReviewer`. The test also now demands `/second person/` in the refusal, which is stricter than before. The solo-firm half of the case is unchanged.

## 4. The new unit cases bite
I ran a scratch copy of the suite against four replacements of `ownTypingLeftToForms`:

| Variant | Cases that fail |
|---|---|
| Old behaviour (identity) | Case 1 (32/33). Case 1 is the C8.3-18 pass case: it fails on the old code as it claims to. |
| "Drop the reviewer's typing at any time" | Cases 2 and 3 (31/33) |
| "Drop all the reviewer's work after the base" | Case 4 (32/33) |
| "Drop everyone's typing after the base" | Case 4 (32/33) |
| "Drop from 10 minutes before the base" | Case 3 (32/33) |

Cases 2 to 4 are guards: they pass on the old code by design and catch over-wide fixes.

## Findings
No Blocker, no Major, no Minor.
* **Nit (optional): time source.** The `fact` row uses `effective_at` (DB `now()`), while `typedSince` uses `source_json.at` (set in JS). On my copy they are 2 to 3 ms apart for typed answers, and up to about 50 ms apart for `confirm_section` versions. A typing whose two stamps fall either side of the base would be dropped case-wide but missed by `typedBy`. It is not reachable in practice: it needs a fact typed within milliseconds of the send or approval. If wanted, select `COALESCE((a.source_json->>'at')::timestamptz, a.effective_at)` for the `fact` row so both sides read one clock.
* **Nit (optional):** C8.3-14b's `/second person/` matches all three 409 texts. Here the branch can only be "You worked on this filing…" (the typing is before the send), and pinning that phrase would prove which branch fired.
* **Observation (carried, not this diff's scope):** the gate now judges the reviewer's post-base typing per filing, while the record keeps the case grain (QA-295). On C8.3's case the spouse's re-approved filing would read "Prepared by Case officer (Sample), Representative (Sample) · reviewed by Representative …": the reviewer is named as co-preparer for typing done on the principal's filing. `reviewRecordOf` intends this ("the reviewer among them when they also did the work"). The record names everyone, so it is honest, but a reader cannot tell which filing the work was on. Also, C7.6's one-step route has no base, so the same typing still refuses there (unit case 2). That route is stricter, never looser.

**Verdict: Approve** — for head `471f34fc259b2fbd6222ae406783ba3a4afec33f`.
