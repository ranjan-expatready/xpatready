# B144 · C8.3 Representative review: fresh challenge

Challenger: a fresh context that did not draft the concept (screen-concept part B), 7 Nov 2026. Read: `concept.md`, `design/draft-representative-review.html`, `best-in-class-sources-2026-11-07.md`; BACKLOG B144, P-406 and the C8.3 row in `qa/CAPABILITIES.md` on `origin/lead/2026-11-07-lead30`; P-155, P-168, P-237, P-238, P-380, P-122, P-164 in `DECISIONS.md`; row B6 in `BACKLOG-requirements.md`; `PRODUCT.md`, `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`; AG-07 v3.12 (AG-7-28, AG-7-29, AG-7-31) and SA-01B v2.1 (SA-1B-221) in `domain/requirements-2026-11-02/`; the founder's boards (agent view, prepare application v2); the app code on this branch (main `1e1ca443e`). `ai-workers/tools/freshness.sh` cannot run in this copy (`code/README-copies.md` is missing in the cloud), so the team's code names the concept quotes (`CaseReview`, `DEFAULT_REVIEW_CHECKLIST`) are **Unverified**: they come from the requirement text, not from code. The requirement cards are the newest snapshot here (2 Nov).

## Verdict
**Build after these changes.** The idea is right and mostly already supported by the app: a per-form facts fingerprint, answer snapshots with before and after, append-only answer history, and a `filing_review` row that C7.6 and C8.2 already read. Two Blockers are in the records. (1) They cannot hold what the board shows: per-filing decisions inside one round, and the "before" values of round 2 after a send back. (2) The stamp has no snapshot or file for an Online form, and the stamp is ambiguous for a barcode form. Both can be fixed in the concept without a rethink. Fix them, and the seven Majors, before the migration is drafted.

## Objections

### Blockers

**B1 · The round record cannot hold what the board shows: per-filing decisions, and the "before" of a sent-back round.** *Needed for the proof.* Fact, high confidence.
* What breaks: §2 puts `status, decided by/at, reasons json, confirmed_unticked` on `review_round` (one value per round). But AG-7-29 r9 says "Each filing has its own review status and its own rounds", and the board's frame 2 shows one review where Client A's filing is in Round 2, Under review, while Client B's filing reads Round 1, Approved 7 Nov. BR-5 also asks for reasons "one per filing at least". There is also no stamp to compare against after a send back: `form_approval` is written on Approve only (BR-4). So round 2, after a round 1 that was sent back, has no stored "before". Yet that is exactly the board's centrepiece: "Date of birth 1986-04-12 → 1986-04-21" after "Round 1 sent back: Date of birth does not match the passport". BR-9 says each round "compares round n with n-1", but nothing per form is frozen when a round is sent.
* Example: the officer sends Client A's and Client B's filings together. The representative approves B and sends back A. One `review_round.status` cannot say both. When A comes back as round 2, there is no snapshot of A's forms from round 1 to show what changed.
* Fix:
  * Two child tables, still "new tables only":
    * `review_round_filing` (round, filing, round number per filing, status, decided by/at, kind reviewed / self_reviewed, reasons, confirmed_unticked).
    * `review_round_form` (round, filing item, answer snapshot id, facts hash, file sha256 as frozen at send).
  * Approve marks a filing's form rows as stamped (or copies them into `form_approval`).
  * "Changed since review" and "compare n with n-1" both read these rows.
  * The footer Approve / Send back act on the selected filing (the board's dialog already says "Send back Sample Client A's filing").
  * Round numbers count per filing (AG-7-29 r9).

**B2 · The stamp has no answer snapshot or file for an Online form, and it is ambiguous for a barcode form.** *Needed for the proof.* Fact, high confidence.
* What breaks:
  * BR-4 stamps "file sha256 of the filled copy when one exists, the answer snapshot it was filled from". But an `answer_snapshot` row is written only when a copy is generated (`api/src/fill-case.ts:247`) or a portal section is ticked (`EnteredSection.snapshotId`, `prisma/schema.prisma:1318-1336`).
  * In the M3 sample, IMM 5707 is `ONLINE` (`acceptance/lib/setup_vv_m3.ts:40`). So it has no filled copy and, until sections are entered, no snapshot. Its stamp would have neither half of "fingerprint, answer snapshot", and BR-6 would have no "before" for it. The board shows it as "Approved round 1, still current".
  * `form_approval` is keyed by "form instance", which does not exist for that form.
  * For a barcode form, the file that goes to IRCC is the validated copy (`validated_copy.sha256`, `fill-case.ts:422`), not the product's copy (`form_instance.sha256`, `fill-case.ts:291`). The founder's board puts the review after "validated copies read back, signatures in" (`M3-agent-view/design/draft-agent-view.html`, "Representative's review · 3 filings … Cannot start yet").
  * The latest generated copy can also be stale: its `snapshot.inputHash` no longer equals today's facts.
  * Nothing says whether a later Validate upload, a signed scan or a regeneration with the same facts withdraws the approval.
* Example: the representative approves Client A's filing. IMM 5707 gets a stamp with `snapshot_id = null` and no file. A changed date of birth then withdraws it, but "Changed since review" cannot show 1986-04-12 → 1986-04-21 for that form.
* Fix: key the stamp by filing item (`filing_item.id`), not by form instance. At send (B1) and at approval, write an `answer_snapshot` of the form's coverage facts for every form. This is the same `formCoverage` + `inputHash` that `fill-case.ts:247` uses. The table already allows a snapshot with no copy (`form FormInstance?`, `schema.prisma:1541`), and the new table references it, so `answer_snapshot` itself does not change. Record the file as follows:
  * The current validated copy's sha256, if one is read back.
  * Otherwise, the newest generated copy whose `snapshot.inputHash` equals the stamped facts hash.
  * Otherwise, "no file yet" (Online).

  A stamp is current while the form's facts hash equals the stamped one (`readiness-inputs.ts:70` already computes it per form with `x.factsHash`). A validated upload or a signed scan of the stamped copy never withdraws it. A regeneration with the same facts shows "Regenerated since review, same facts" and keeps the approval. Add a test for each of the three file cases.

### Majors

**M1 · The fate of today's review route and inline review form is unstated: either a bypass, or a broken shared helper.** *Needed for the proof.* Fact, high confidence.
* What breaks: `POST /runtime/filings/:id/review` (`api/src/readiness.ts:46-80`) and the readiness panel's inline review (`web/src/runtime/readiness.tsx:120, 216-227`) stay unmentioned.
  * If they are kept as they are, the representative approves with no round, no checklist and no form stamps. Row B6's "each approved form stamped" is then false for those approvals.
  * If they are removed, `readyToFile` in `acceptance/lib/m3.ts:384` breaks. C8.1 and C8.2 use it (`acceptance/C8.1.test.ts:45`, `C8.2.test.ts:23,54`), and P-380 R1 keeps the importers of `m3.ts` unchanged.
* Fix: keep the route, and make it the one-step form of the same engine call: a one-filing round, sent and approved by the representative, which writes the same form stamps and `filing_review`. Have the inline button open the Review page. Add a test that the old route also stamps every form.

**M2 · Stamp currency disagrees with C7.6 when the representative of record changes.** *Needed for the proof.* Fact, high confidence.
* What breaks: C7.6 counts a review only when it was made by the representative of record now (`api/src/readiness-inputs.ts:97-99`). BR-7 makes a stamp current "while its facts and file match", with no condition on who made it.
* Example: a firm admin reassigns the case to a new representative. The Review page still says "Approved round 1, still current" on every form except IMM 5476, whose representative facts change. Meanwhile C7.6 shows "The representative of record has not reviewed this filing" (`engine/runtime/readiness.ts:164-166`). The numbers no longer agree across screens.
* Fix: one pure function in `engine/runtime/review.ts` decides currency (same approver as the representative of record now, and the same facts hash), and both the page and the derivation use it. Add a test where the representative changes in the middle of a round: the former representative's decision gets 403, and the stamps read "Approval withdrawn: the representative of record changed".

**M3 · The representative can change a fact and then approve it as a second person ("approver ≠ author").** *Needed for the proof; breaker.* Fact (the gap) high confidence; judgment (the rule) medium.
* What breaks:
  * Any staff member of the firm may save or correct an answer (`api/src/runtime.ts:63-73`, reach "officer"; P-155 (3)), and the representative is staff.
  * Self-review is decided only by membership of the case's `OFFICER` rows (`api/src/readiness.ts:63-71`).
  * The concept chose the Change set pattern, whose rule is "approver ≠ author" (`EXPERIENCE.md` §3), and `STANDARDS.md` §6 requires "author ≠ approver enforced server-side".
* Example: in round 2 the representative fixes the date of birth themself, then approves. The form is stamped "Reviewed" as if a second person had checked the change. P-155 (1) says such a review is "never a second person".
* Fix: when approving, if the approver wrote any fact a form reads since that form's baseline (from the answer history: `sourceJson.actor`, or the `origin` of a confirmation row, `runtime.ts:276-279`), that form's stamp is `self_reviewed` with the logged statement. On a non-solo firm, apply the same rule as `readiness.ts:68`. Add one pass test and one fail test.

**M4 · Decisions under concurrency and "what was read" are unspecified.** *Needed for the proof; breaker.* Fact, high confidence.
* What breaks: the concept gives no request body for `POST /runtime/reviews/:id/decision`, no guard on the state change, and no test for a second decision. The C7.6 breaker found exactly this class of bug: the screen sent the live `facts_hash`, not the one on screen, so a second Confirm reviewed facts nobody reloaded (`screens/C7.6/B2-break-report.md`, F2). AG-7-29 §10 (Safety) also expects "Two approvals of one round leave one approved round and two audit entries".
* Example: the representative presses Approve in two tabs, or Approve while the officer sends round n+1. Both writes land.
* Fix:
  * The decision carries, per filing, the per-form facts hashes the page loaded. The page keeps those from when it opened, never the live values.
  * The server changes state in one transaction with `SELECT … FOR UPDATE` on the `review_round_filing` row, and only from Sent or Under review. Anything else gets 409 "decided meanwhile, Reload". A hash mismatch gets 409 "changed after you read it", and nothing is stamped.
  * Tests: a double approve, approve against send back, and a stale hash.

**M5 · Three divergences from AG-7-29, but only one is named, and its sources are mis-cited.** *Needed for the proof.* Fact, high confidence. AGENTS rule 2 sends conflicts to the founder; the concept leaves Q2 to the tech lead "if the tech lead wants it confirmed".
* (a) **Who decides.** The team has holders of `agent/case:review-approve` (Owner and Case Manager, with the Owner as fallback) and the case's `REVIEWER` role decide (AG-7-29 r3, r8, §8). We have the representative of record only (P-155 (1); `readiness.ts:50-51`). Our choice is grounded, but the concept does not name it as a divergence, and it carries no mapping to the team's names.
* (b) **Withdraw versus keep.** The concept says "our P-155 / break B2 and row B6 withdraw it". In fact, P-155 says nothing about withdrawal. "Break B2" is C7.6's build behaviour, from a break report (`readiness.ts:72`), not a founder decision. The source for withdrawal is row B6 (the one-page solution 9.3, through the 23 Oct trace) and P-406's row text. AG-07 v3.12 (28 Oct) is newer and says "It does not undo the approval". The practical gap is small: under P-237 both only warn. Ours reopens C7.6's passable `representative_review` line; the team's asks one confirmation at submission (AG-7-31 r3).
* (c) **What counts as a change.** AG-7-29 r10 also counts "a document on that filing's checklist replaced or its status changed". BR-6 drops this without saying so.
* Fix: add a "Differs from the team" line with (a), (b) and (c). Put (a) and (b) to the founder (questions below). For (c), follow the team. It is read only and cheap: `checklist_line.stateAt/stateBy` and a document uploaded after the approval time (`schema.prisma`, `ChecklistLine`), listed under "Changed since review" without withdrawing a form stamp.

**M6 · "Values checked against the document, by <who>" has no record in the app.** *Needed for the proof (wording); the mark itself is Not built.* Fact, medium-high confidence (a search of `api/`, `engine/`, `contracts/` and `prisma/` found no such mark).
* What breaks: BR-2 and the board ("Values checked against documents: 4, by the case officer"; "Passport, checked against document by the case officer") show P-155 (2)'s mark. The only staff mark the app stores is `VERIFIED` from Confirm section (`runtime.ts:497`), which is P-72's confirmation, not P-142 D3's "checked against the document". A builder would have to invent a record.
* Fix: show "Confirmed by <who>, <date>" from `VERIFIED` rows now, and say it in those words. Mark "checked against the document" *Not built* (it belongs with C6.5 and C6.6). Change the board's copy to match.

**M7 · The permissions matrix is stated but only partly tested, and this screen gets a permissions breaker.** *Needed for the proof.* Fact, high confidence.
* What breaks: test 12 covers an officer approving (403), a client (403) and another firm (404). There is no test for:
  * the officer ticking or sending back (403);
  * a configuration person (403);
  * a former representative (403, see M2);
  * a self-review on a solo firm without the statement (400) and with it (200, Self-reviewed);
  * a representative who prepared the filing with another officer on a non-solo firm (409, `readiness.ts:68`);
  * a send of a recorded or removed filing (409 or 404);
  * a review id from another firm on every route (404, never 403).

  Also, BR-8 says self-review is allowed "only as P-155 (1) (solo firm…)". Today's rule is wider: a solo firm, or the representative was the case's only officer ever (`readiness.ts:65-69`). Narrowing it silently would break C7.6.
* Fix: add these as C8.3 tests, and state that BR-8's self-review rule is `readiness.ts:63-71` unchanged.

### Minors

* **m1 · A GET that changes state.** `GET /runtime/reviews/:id (opens it)` moves the round to Under review. A prefetch, a qa read or a refresh by the representative can mark it opened. Fix: the GET stays safe; the page calls `POST /runtime/reviews/:id/open` once. *Needed for the proof.* Judgment, high.
* **m2 · Program items in a samples file are scaffolding (P-33), but 6b says "All capability".** SA-1B-221 r3 reads the items "of the filing's row in its pinned version". Fix: label it scaffolding, read it through one port (`reviewItemsOf(release, combination)`) so that the `REVIEW_ITEM` line kind replaces the file without touching `review.ts`, and open a follow-up row. *Needed for the proof (the label).* Fact, high.
* **m3 · A solo firm sends a review to itself.** The one person presses "Send for review" and then opens their own review: one step with no purpose. The board also does not draw the solo-firm decision state ("I prepared and reviewed this filing myself", P-155 (1); `EXPERIENCE.md` §4 read-only and needs-work states). Fix: on a solo firm, "Review now" opens the page directly (the round is sent and opened in one step), and draw the statement in the Approve dialog. *Needed for the proof.* Judgment, medium.
* **m4 · "Changed by <who>" must name the person who typed the value, not the person who confirmed it.** A confirmation row's actor is the confirmer; the typist is its `origin` (`runtime.ts:276-279`). *Needed for the proof.* Fact, high.
* **m5 · Two names for nearby states.** "Changed since review" (round n+1 after a send back) and "Approval withdrawn" (after an approval) both appear on the board. Add a tooltip that says which is which. *Needed for the proof.* Judgment, medium.
* **m6 · Speed.** Deriving before → after for each form on every read must use one batched history query, not one per form. The view's pool limits already bit C6.12 (`readiness-inputs.ts:53-54`). *Needed for the proof.* Judgment, medium.
* **m7 · 6b omits AG-7-29 r4's stage move and r3/r7's Needs-you and notifications.** The stage move is AG-07's case stage. Add it to *Not built* by name. *Not built.* Fact, high.
* **m8 · A form that cannot start yet** (`state === "cannot_start"`, hashed as "waits", `readiness-inputs.ts:70`) needs a stated stamp: "Not stamped: waits for an answer". The filing hash already reopens the review once the form starts. *Needed for the proof.* Fact, high.

## What is sound
* Approval still writes `filing_review` with kind, licence and the filing `facts_hash` (`readiness.ts:75`), so C7.6's line and C8.2's "Prepared by · Reviewed by" (`submission.ts:114-130`) read it unchanged.
* The per-form facts fingerprint already exists and is the same function the snapshots use: `x.factsHash(form, subject)` (`readiness-inputs.ts:39-40,70`) and `answer_snapshot.input_hash` (`fill-case.ts:247`). So "withdrawn by a later fact change" is derived, not stored, as P-65 and C9.2 already work.
* Before → after comes from `factChanges` (`engine/runtime/out-of-date.ts`), and who and when from the append-only answer chain (`client_canonical_answer.source_json`). Nothing is typed twice.
* Checklist items are copied into the round when sent, and an unticked item asks one confirmation with no reason (AG17-D78). Open CRITICAL warnings stay C7.6's to pass with a reason (P-237). "Self-reviewed" is kept, never a fake second person.
* Q3's order is right: the readiness and fill-case files are being changed by the C4 lane (P-404). New code goes in new files (`engine/runtime/review.ts`, a new API file), and `readiness.tsx` is touched only for the "Send for review" button after those PRs merge.
* **The concept's Q1–Q3:**
  * Q1, a data file now, is accepted with m2's label and port.
  * Q2, withdraw, is accepted as the recommendation, but it goes to the founder (M5, question 1).
  * Q3, build after the C3/C4 PRs merge, is accepted.
* The best-in-class evidence is from primary sources with quotes and dates. The lesson that is beaten (per-form stamps, so a change withdraws only the forms that read that fact) is real and cheap here. There is no AI, so it is identical with AI off.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Send for review | `review_round` (case, sent by/at) + `review_round_filing` (round no. per filing, status Sent) + `review_round_form` (item, snapshot, facts hash, file sha) | `POST /runtime/cases/:id/reviews` {filings[]} | BR-1; staff of the firm; open round → 409; recorded → 409 | 1, 2, 3; recorded filing 409 |
| Open | `review_round_filing.opened_by/at` | `POST /runtime/reviews/:id/open` (GET stays safe) | BR-3: representative of record only moves it | 4 |
| Checklist | items copied into the round (default + samples port, m2) | `GET /runtime/reviews/:id`; `POST …/checks` {filing, item, ticked} | BR-2; representative only; 409 after decision | 5; officer tick 403 |
| Approve | `review_round_filing` Approved + `form_approval` per item (snapshot written, file by B2's order, kind per M3) + `filing_review` | `POST …/decision` {filing, verdict, form_hashes, confirm_unticked?, self?} | BR-4, M2, M3, M4; licence needed (`readiness.ts:70`) | 8, 9; stale hash 409; double approve 409; self-review cases |
| Send back | `review_round_filing` Sent back + reasons (optional pin to item or check) | same | BR-5; reasons required | 6, 7 |
| Changed since review / withdrawn | derived: stamps against `x.factsHash` now + answer history + checklist line state | in the GET view | BR-6, BR-7, M5 (c), m4 | 10, 11; document replaced listed; rep changed |
| Old route | same engine (one-step round) | `POST /runtime/filings/:id/review` kept | M1 | old route stamps forms; `readyToFile` unchanged |

Contract shapes go in `contracts/runtime.ts` (additive). The migration (new tables only) is read by the tech lead (Q3).

## Questions for the founder (≤3, recommendation first)
1. **After a form is approved, a fact on it changes. What happens to its approval?** **Recommended: the approval is withdrawn** (row B6, one-page 9.3). It stays a passable CRITICAL line in Ready to file (P-237), so nothing is blocked. The other option is the team's AG-7-29 r10: keep the approval, flag "Changed since review", and ask one confirmation at submission. Example: the date of birth is corrected on 8 Nov. Withdrawn means the representative sees only IMM 5257 again; kept means the filing still reads Approved.
2. **Who approves or sends back?** **Recommended: the representative of record only** (P-155 (1); today's C7.6). The other option is the team's: any holder of "review-approve" (Owner, Case Manager), with the Owner as fallback. Example: a firm's Case Manager without a licence opens the review. With ours, they can read it but not decide.

## Lead response

## Agreement

## Build discoveries
