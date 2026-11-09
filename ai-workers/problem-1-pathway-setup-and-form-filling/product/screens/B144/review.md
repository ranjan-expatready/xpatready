# B144 · C8.3 Representative review: independent review

Reviewer: a fresh context that did not build the screen, 9 Nov 2026. Code reviewed at `09e660220`. Head `f72e706a5` adds only records: 7 B144 screenshots and 2 lines of `build-notes.md` (regression exit codes). Read: concept r2, challenge, board, build notes, the decisions on #1247 (Q1, P-412 F1/F2), `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`, `PRODUCT.md` §3–§4. Ran an isolated copy on :4446 (fresh DB, VV checkpoint; S7a known fail). Pack `C8.3.test.ts` **18/18**. Unit `check_review_rounds.ts` **38/38**. Builder's walk **19/19**, with the setup step skipped because the combination already existed. I added my own API break probe and Playwright walk (scratch only). Journey score: `journey-test-reviewer-2026-11-09.md` (**7.5/10**).

## Verdict
**Block (Ship after fixes).** Server authorisation, the state machine, races and the migration are solid. Four Majors remain open: three are correctness gaps on the screen's own path, and one is a scope breach in the records.

## Focus checks (what held)
* **Permissions (BR-9, F2).** Each case below was checked by the pack C8.3-14/14b/17 or my probe:
  * officer tick, approve, send back and re-approve: 403;
  * configuration and client: 403 on read, send and list;
  * another firm: 404 on all 7 routes;
  * former representative: 403, and the stamps read "the representative of record changed";
  * solo self-review without the statement: 400; with it: 200 Self-reviewed;
  * prepared with another officer: 409;
  * removed filing: 409.
  `mayDecide` is the only check on every decide route (`review-rounds.ts:269`), and `open` refuses before it reads the row.
* **Concurrency (M4).** All results come from my probe:
  * two sends of one filing: 201 + 409, one row;
  * approve, approve and send back at once: 200 + 409 + 409, one `filing_review`, one audit line;
  * tick after a decision: 409;
  * double-click on Re-approve: 200 + 409, one `reapprove` round.
  The row is locked `FOR UPDATE`, `nextStatus` runs inside the transaction and the trigger repeats the guard. The partial unique index `review_round_filing_one_open` is a real second check.
* **Migration.** It adds new tables only. The triggers refuse:
  * approved → sent;
  * DELETE of a round while its case exists;
  * a second stamp write.
  A case delete still cascades. I dry-ran the header's rollback in a transaction that I rolled back: `filing_review` rows were kept (12). The C7.6 route still writes `filing_review` first, then `oneStep`. `readiness-inputs.ts:137` swapped the inline test for `stampCurrent`, and the two are equivalent for every input. C7.6, C8.1, C8.2 and C9.5 read the table unchanged (builder's exit codes; C8.3-15 `readyToFile` ok).
* **F1, one function.** `stampCurrent` (`engine/runtime/review.ts:44`) is used by the page (`formStateOf`, `withdrawnForms`), by re-approve (`review-rounds.ts:400,407`) and by C7.6 (`readiness-inputs.ts:137`). Removing its representative half fails C8.3-14; removing the hash half fails C8.3-10.
* **P-412.** The change-only view and one-click Re-approve work (C8.3-17/18, walk 9–11). Unchanged forms keep their stamped snapshot, and only the changed form is stamped anew.
* **Stamps.**
  * Online: `none`, with its own snapshot (20 rows).
  * Barcode: `validated_copy`, whose sha equals the read-back copy's (C8.3-9).
  * Generated copy: only when its facts match (1 row).

## D1–D20 (1–5)
D1 4 every BR present; BR-8 gap (Major 2) · D2 4 races held, triggers; but Major 2 records "Reviewed" wrongly · D3 4 one `formHash`, one `stampCurrent` · D4 4 page/C7.6 can disagree when the form set changes (m1) · D5 4 Reload on conflict, double click safe · D6 4 audit line per send/open/decision · D7 N/A no AI · D8 4 Back to the case, round selector · D9 3 solo dead end (Major 1); Re-approve hidden behind filing selection (m7) · D10 3 "(self: true)", "annulled_marriage" on the main path · D11 4 toasts, Nothing was recorded notice · D12 4 Change set layout, clean · D13 4 axe clean at 400/1024 (rep and officer), 0 px sideways at 400, 1024 and 200 % zoom, keyboard reaches Approve in 24 Tabs, focus into dialog · D14 4 team components · D15 4 first view 546 ms; whole prepare pass per GET · D16 4 each BR pass+fail; no race test, no between-rounds BR-8 test · D17 simulated only · D18 3 relatives' facts named as the client (Major 3) · D19 4 old route, C7.6, C8.2 intact · D20 simulated only.

## BIC (EXPERIENCE §6, case-side)
| BIC | Score | Evidence |
|---|---|---|
| 01, 02, 04, 05, 06, 07, 08, 09, 10, 12, 15, 16 | N/A | not this screen's job |
| 03 No stale answers | Met | a fact change withdraws the stamp (walk 9) |
| 11 One primary action | Met | footer: Approve or Re-approve only (shot 04, 09) |
| 13 Errors say what and how | Partly (Should) | solo re-approve toast "(self: true)" (my shot r4) |
| 14 Tooltips | Met | chip tooltip on keyboard focus (walk 10) |
| 17 Review returns only what needs work | Partly (**Must**, STANDARDS §6 author ≠ approver) | Major 2 |
| 18 States drawn | Met | empty, loading, read-only, conflict (shots 12, 13, 03, 07) |
| 19 Low cognitive load | Partly (Should) | long left column at 1024 (my shot r2-1024-rep) |
| 20 Accessible | Met | axe, 200 % zoom, keyboard (above) |

## Issues
**Major 1 · Must: a solo firm cannot re-approve from the page (P-412 dead end).**
* Where: `web/src/runtime/representative-review.tsx:94-101,214`.
* What breaks: `reapprove()` never sends `self`, and a 400 is only toasted. On a solo firm, Re-approve answers 400 "confirm … (self: true)", and the page offers no way to confirm (probe B; my shot `r4-solo-reapprove.png`). The same applies to a representative who is the case's only officer.
* Fix: when `v.solo` (or on a 400 on field `self`), ask the self-review statement as `ApproveDialog` does, then resend with `self: true`. Add a walk or pack step.

**Major 2 · Must (STANDARDS §6 [M] author ≠ approver; BIC-17; P-155 (1)): a fact the representative typed between rounds is approved as "Reviewed".**
* Where: `api/src/review-rounds.ts:345-349`.
* What breaks: `since` compares only against this round's frozen snapshot. In probe A6, the representative changed the family name after the send back and before round 2. Round 2's page itself lists "Typed by user-R" on 3 forms, yet approve returns 200 `reviewed`.
* Fix: compute `since` from the previous round's frozen snapshot when one exists, the same base as `compose` line 233. Add a fail test.

**Major 3 · Must (correct data, D18): relatives' facts are labelled as the client's.**
* Where: `api/src/review-rounds.ts:236-237`.
* What breaks: `words.person(x.about.split("/")[0])` drops the relation and row. On IMM 5707 the parents' "Date of birth 1956-11-09" reads "· Sample Client A", three times (my shot `r2-1024-rep.png`; API read). The representative checks facts under the wrong person.
* Fix: use `factChanges`' person words (`out-of-date.ts:43`, relation and row), and look up typist and confirmer by the full key.

**Major 4 · Must (scope, AGENTS 8): the PR rewrites 25 screenshots of other screens.**
* Which: `screens/QA-165/screenshots/forms-mandatory-open-{1440,390}.png` and 23 files in `screens/R1-thin-slice/screenshots/r1c/` (for example 11-case-view-confirmed-1024, 3319 → 15128 px tall). Commits 925bce904 and 60c550082.
* Fix: `git checkout origin/main -- <those paths>` and commit.

**Minors (Should)**
* m1 · Page and C7.6 can disagree when the form set changes.
  * Cases: a form that waited starts, a form is added, a Not-needed form sits in the filing hash, or a C9.5 move happens.
  * Cause: waits come from the frozen `fileKind` (`review-rounds.ts:228`); `withdrawn` covers stored rows only (`:246`); Not needed is excluded (`:81`), while the filing hash in `readiness-inputs.ts:104` covers them all.
  * Effect: C7.6 reopens with no Re-approve offered.
  * Fix: use live waits and include unstamped live forms.
  * Not reproducible on the sample (no waiting form).
* m2 · "Review now" is accepted on a firm that is not solo (probe A8: 201 `review_now`; `review-rounds.ts:165`). Fix: require `firm.solo` (concept m3).
* m3 · The hashes and the representative are checked before the case lock (`review-rounds.ts:314,324` vs `:371`). This is benign: a stamp that goes stale shows withdrawn at once. Fix: re-check under the lock, or note it.
* m4 · The pack has no race tests (challenge M4: double approve, approve against send back). My probe shows they hold; add them.
* m5 · Re-approve after a representative change carries the former representative's ticks and `confirmed_unticked` into the new representative's round (`review-rounds.ts:407,415-416`). Fix: do not carry ticks when `why = representative`.
* m6 · Words:
  * raw code "annulled_marriage" (`representative-review.tsx:31`);
  * "Stamped with …" on forms never stamped (`review-rounds.ts:242`);
  * "the other forms keep their approval" when every form changed;
  * two date formats ("Nov 8, 2026" vs "8 Nov 2026").
* m7 · "Open the review" does not select its filing (`readiness.tsx` link). On a round where another filing comes first, the Re-approve footer is hidden. Fix: pass the filing and preselect it.
* m8 · No FK on `review_round_form.round_id`, `review_round_form.filing_id` or `review_round_filing.filing_review_id` (`migration.sql:62,83-112`). Fix: add them.
* m9 · Graph: G3 lists all 7 routes as untested and G6 lists `features/review-rounds.ts` as unimported. Both are false positives: the pack and the walk reach the routes, and features load dynamically. This is for the graph tool, not this PR.

## Build-notes questions
1. BR-8 on a firm that is not solo: **agree, keep the 409.** It is C7.6's rule, and P-155 (1) and BIC-17 say never a second person.
2. Keep the inline form with a follow-up row: **agree.** It goes through `oneStep` (every form stamped) and is hidden during an open round.

## Not checked
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). Full CI suite set (`select-suites` ALL). A waiting form on real data (m1).

**Verdict: Block** — fix Majors 1–4, then re-review.

## Re-review (diff 09e660220..e2c98f994)
This is P-293's second and last round, diff only, by the same reviewer on 9 Nov. Head `ae65c4b6a` follows `e2c98f994`. It only adds 4 lines to `build-notes.md` (final regression exit codes), so the extra diff is records only.

**How I checked.** I ran a fresh copy on :4446 using the builder's `copy.sh`. The web stamp and the Prisma client were already current, so nothing was rebuilt. Results:
* unit checks 46/46;
* pack C8.3 23/23;
* walk 23/23 (its setup step was skipped on a loaded copy);
* my probe and walks, re-run;
* regression summaries in `logs-b144/reg2`: every pack and browser suite exits 0; only `setupA2` exits 1 (the known S2w/S7a).

The copy is stopped and the worktree is clean.

| Finding | Status | Evidence |
|---|---|---|
| Review M1, solo re-approve | **Fixed** | `ReapproveDialog`; my walk at 1024 px: keyboard Enter opens it, axe is clean, and Escape returns focus to Re-approve. Without the statement the server's words show, with no field names; with it the round is `reapprove` / `self_reviewed`; walk 11d |
| Review M2, BR-8 between rounds | **Fixed** | Base is now the previous round's frozen snapshot (`review-rounds.ts` `baseOf`). Probe A6 now returns 409, not "reviewed"; pack C8.3-13b |
| Review M3, relatives' names | **Fixed** | `factPerson` (`out-of-date.ts`). The API reads "Probe Spouse A's parent 1 · Date of birth 1956-11-09", and values read in words ("Annulled Marriage"); C8.3-20 |
| Review M4, other screens' PNGs | **Fixed** | `git diff origin/main...ae65c4b6a` touches no `.png` outside B144 |
| Break B1, send back leaves approval | **Fixed** | `stampCurrent.superseded`. `readiness-inputs.ts` reads the newest row per filing in one query, so C7.6 reopens and `reviewed` is empty for C8.2; C8.3-19. The Send dialog no longer ticks an approved filing |
| Break M1, representative change breaks re-approve | **Fixed** | Firm-record facts have no typist; C8.3-14c: the new representative gets 200 "reviewed", and the former representative's ticks are not carried |
| Break M2, tick on wrong filing | **Fixed** | `tick(f.filing, …)`; boxes are enabled only under review; walk 11c |
| Break M3, send vs old route race | **Fixed** | `oneStep` re-checks for an open round under the case lock, so the route's transaction (and its `filing_review`) rolls back; C8.3-21. A route that wins and is followed by a send is superseded by B1 |

**Minors listed as fixed:** checked in code and by test.
* "Review now" on a firm that is not solo now returns 400 (probe A8).
* Dates and "Frozen when sent" vs "Stamped" fixed; the "other forms" sentence shows only when there are other forms.
* `?filing=` preselects the filing.
* Only the deciding representative's ticks count.
* Ticks only while under review.
* Focus returns on close.
* A removed filing can be sent back.
* The form-set check applies to Approve only.

**Migration.** I probed it in rolled-back transactions:
* a stamp on a sent-back row is refused;
* an `approved` insert into a `send` round is refused;
* deleting the `filing_review` behind an approval is refused (FK NO ACTION);
* a case delete still cascades;
* the updated rollback is clean, and `filing_review` rows are kept.

The `xmin = pg_current_xact_id()::xid` exemption works for decisions, `one_step` and `reapprove` (pack green). It assumes Prisma's interactive transactions use no savepoints, which they do not here. The migration was edited in place, which is acceptable because it is not on `main` yet.

**"Left after round 1" is acceptable as Should items, with a follow-up row:**
* m1: form-set changes; not reproducible on the sample.
* m3: hash check before the lock; benign.
* m4: no pack line for decision races; my probe holds: 200 + 409 + 409, one `filing_review`.
* m9: graph tool false positives.
* The C7.6 line's words after a send back.
* `check_b128_parents` not run.

**New minor (Should, no block).** BR-8 looks back one round only. A fact the representative typed before round n-1 was sent stays unseen at round n if n-1 was sent back. This matches concept BR-8's "after the round was sent", so it goes to a follow-up row with m1.

**Journey score after fixes: 9.5/10.** "Plain words" is ½ for the C7.6 line wording after a send back; every other criterion is 1.

Verdict: Approve ae65c4b6a9ca2a3eb8ac1401ec1fd89d5b587849
