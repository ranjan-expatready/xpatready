# QA-345 review: an approval stamps the file it approved (PR #1440 at 7456e5347)

Reviewer (screens lane check, fresh context), 9 Nov 2026. Diff: `git diff origin/main...7456e5347` (merge base d8fddc328). Row B144, concept `screens/B144/concept.md` "Beaten", B2, BR-7, BR-10. The tech lead's ruling (a), 9 Nov 18:35 IST. Skill verdict: **Ship after fixes**. Journey score: **8/10** (`journey-test-reviewer-2026-11-09.md`).

## What I re-ran (isolated copy rv_qa345 on :4466, configured checkpoint; never :4400; US$0)
* `acceptance/C8.3.test.ts`: **25/25** (C8.3-22 and -23 pass). `tests/qa/check_qa345_…`: **2/2**. The file is byte-identical to qa's branch `claude/qa-2026-11-09-c83`. I did not re-run its 1/2 on main.
* `check_review_rounds` 52/52 · `check_c76_readiness` 91/91 · `check_c83_review_browser` 23/23 · `graph.mjs --check` exit 0 · `tsc -p api` shows no error in the touched files.
* `check_c76_readiness_api`: **22/23 on two fresh branch copies, not the builder's 23/23.** The failure is "B1 fail: … with the barcode block named" (`blocks: []`). That run kept no `validated` audit line, so `readyToFile` read nothing back. The failing assertion is about `blocks`, which no line of this diff touches. I could not start a main baseline (the sandbox refuses the database folder through a scratch worktree). So this is unconfirmed. The builder should re-run it on a fresh copy or state its setup.
* Mutations of the pure rules: `fileStampCurrent` made always true, and `readBackStamps` without its kind, facts or approved/latest test. Each makes the unit check fail (51/52).
* Trigger, probed directly in a throwaway database with the new function. T1–T12 and T6b–f are below.

## Trigger change (migration 20261109190000)
* **Correct.** Allowed: `none` → `validated_copy` and `generated_copy` → `validated_copy`, once, on an approved row. Refused with "written once": a second move, `validated_copy` → another sha, `validated_copy` → `none`, a move together with a change to `stamp_hash`, `stamped_by` or `stamped_at`, a move with a null sha, a move on a row under review, and a no-op update. A move that also changes a frozen column is refused with "froze".
* Judgment call 4 (the reorder) opens no new way in. For an unstamped row both orders refuse the same cases; only the message can differ. For a stamped row the old function refused everything, and the new one allows only the move above. The first stamp still needs the row under review or written in the same transaction (T9 passes, T10 is refused).
* It stays looser than the code in two ways (m3): it allows the move on a **superseded** approved row, and to **any sha** (T6f: `'not-a-real-copy'` was accepted).

## Every place that judges an approval
Review page (`formStateOf`), change-only list (`withdrawnForms` in compose), re-approve's `changed` and `carry`, and C7.6 (`readiness-inputs.ts` `fileStamped`). C8.2 "Reviewed by" and the recorded `reviewedBy` read C7.6's `reviewed`. All of these now pass the stamp's `file`. All read "validated now" from the same `paperValidated(..).current` (case-prepare.ts:305/595/600), so they agree. The C7.6 direct route also writes a one-step round, so `!row` only covers reviews from before C8.3. The walk confirmed it: J3 shows the Review page withdrawn, C7.6 not reviewed, and re-approve listing exactly that form.

## Judgment calls
1. **Moving a generated-copy stamp: accepted.** The concept's B2 makes the generated copy a fallback, and "Beaten" names the validated copy as the barcode form's file. But see M2: the old sha is lost.
2. **Withdrawal with why "file": accepted.** It fires only when the facts are equal and a validated copy is current but not stamped. That means legacy rows or the approve/read-back race (m2), so it is the ruling's "ask for re-approval". Tested (C8.3-23; walk J3).
3. **Second read-back not judged: not accepted as a known gap. It is M1.**
4. Reorder: see above.

## Issues, ranked
**M1 (Major, Must): the QA-345 symptom is still reachable.** Reproduced on :4466. An approval stamped validated copy `ddd…`. Then a second validated copy of the same facts was read back (`cf62ae…`). That copy is the one filed, because `readBackOf` takes the newest (`engine/runtime/prepare.ts:58`). Yet the page reads "Approved, still current · Stamped with the validated copy read back", its fingerprint is `ddd…`, and C7.6 counts the review. That is the bug's own words ("the validated copy read back afterwards is filed under that approval without ever being stamped") and against "Beaten" and the ruling's "an approval must stamp the file it approved". Fix:
* Make `fileStampCurrent` compare the stamp's sha with the sha of the validated copy that counts now (pass it through `validated`/`validatedCurrent`). A different sha then gives why "file", which asks for re-approval as the ruling says.
* Add a fail case to `check_review_rounds` and a C8.3 pack step (read back a second copy after C8.3-22).

**M2 (Major, Must): the move erases the stamped file's fingerprint.** `api/src/review-stamp.ts:18,29` does not select `stampFileSha256`, and the audit `detail` keeps only `was` (the kind). So a `generated_copy` stamp loses the sha the representative approved. This weakens BR-10's write-once record and AGENTS rule 8. It also makes the migration's rollback note wrong ("the audit line names what each held before"). Fix: select it and write `was_sha256` in `detail`. Add one assertion in C8.3-22, or in a generated-copy case.

**m1 (Minor, Should): two read-backs of two copies of the same form at once.** The second one fails with a raw trigger error (a 500, and nothing kept). Several `GENERATED` copies can coexist, and the lock is per copy (`fill-case.ts:457`). Both transactions select the same `none` row. After the first commits, the second update re-checks against the new row, and the guard raises "a stamp is written once". I reproduced this with two SQL sessions. Fix: put the kind in the update's WHERE (`updateMany` with `stampFileKind in [none, generated_copy]`, count 0 means skip). I tested that this makes it a no-op.

**m2 (Minor, note):** approve and read-back share no lock. An approval decided while a read-back commits stamps `none`, and right away reads "Approval withdrawn … Re-approve". This fails safe, and re-approve recovers. Optional fix: lock `runtime_case` in the read-back too, and recompute `fileOf` under the lock at approve.

**m3 (Minor, Should):** the guard does not check that the row is the newest round of its filing, or that the sha is a kept validated copy of that case, form and subject. Add both as `EXISTS` checks; they are cheap and match the guard's purpose.

**m4 (Minor, Should): the "none" file words make a promise that cannot hold** (`review-rounds.ts:42`). "A validated copy read back later for these facts is stamped to this approval" shows on IMM 5476, a form with no Validate. It also shows on a form still under review ("Frozen when sent with … stamped to this approval"). Show the sentence only for an approved barcode form on Paper or PDF upload.

**m5 (Minor, Should): Ready to file gives the wrong reason after a "file" withdrawal.** It reads "The filing changed after it was reviewed on … (or the representative of record changed)", and neither happened (`engine/runtime/readiness.ts:230`). The Review page names the real reason. Pass the reason into the C7.6 line.

**m6 (Minor):** there is no automated test of the guard's refusals beyond "move twice" (C8.3-22's last clause), and no API-level generated → validated move. My probes T2–T8 cover the refusals by hand.

## D1–D20 (only what this change touches; the rest is unchanged since the B144 review)
D1 Partial (M1) · D2 Partial (M2, m1) · D4 Met (one rule in four places, the same input) · D5 Partial (m1; reload and re-approve recover) · D10 Partial (m4, m5) · D11 Met (withdrawn words, chip, toast) · D13 Met (axe clean, 400/1024/1440, keyboard Approve and Re-approve) · D15 Met (review loads in 528 ms, approve in 297 ms) · D16 Partial (rules mutation-tested; M1 and the guard's refusals untested) · D18 Met (audit line, fingerprint under Details) · D17/D20 simulated only · D3, D6–D9, D12, D14, D19 not affected.

## BIC (case-side; only the changed checks)
BIC-12 Partly: the check before filing misses M1 · BIC-13 Partly: m1 gives a raw 500 · BIC-14 Met · BIC-17 Met: re-approve lists only the "file" form · BIC-20 Met · the others are unchanged since the B144 review.

## Could not check
A main baseline for `check_c76_readiness_api`. A real Adobe Validate: the read-back is simulated by `validateRoundTrip`, as in the pack. A screen reader. An intended user's own walk.

Round 1 verdict (7456e5347): Changes requested
* Blockers: none.
* Majors: M1 (a second validated copy of the same facts is filed under an approval stamped with another file), M2 (the move erases the stamped generated copy's sha; the audit keeps only its kind).
* Minors: m1 (concurrent read-backs give a 500), m2 (approve/read-back race, fails safe), m3 (the guard allows a superseded row and any sha), m4 (the "none" words promise a stamp for forms that never get one), m5 (the C7.6 line gives the wrong reason), m6 (guard refusals untested).

## Round 2: 7a5c38e5c3913af6a2ff1cffc91582609d12eda1 (`git diff 7456e5347..7a5c38e5c`)
Re-run on a fresh isolated copy (rv_qa345 on :4466; stopped and dropped afterwards):
* Pack `C8.3.test.ts` **25/25** (configured checkpoint), with the new C8.3-23 going through the routes. QA-345 check **2/2**.
* `check_review_rounds` 52/52 · `check_c76_readiness` 91/91 · `check_c83_review_browser` 23/23 · `graph.mjs --check` exit 0 · `tsc -p api` shows no error in api/, engine/, contracts/, acceptance/ or the touched tests.
* **`check_c76_readiness_api` 23/23** on a fresh copy started as its usage line says, with no checkpoint load. My round-1 22/23 came from loading the configured checkpoint first, not from this PR. That question is closed.
* The journey walk (J1–J4) re-run, the guard probed again (R1–R6), and M1 probed again.

**Each round-1 finding:**
* **M1: fixed.**
  * `fileStampCurrent({kind, sha256}, validatedSha)` compares fingerprints. `validatedSha` (case-prepare.ts) is the read-back that `paperValidated` counts, and only while current.
  * `framesOf` stamps that same fingerprint at approve, so the approve-time stamp and the judgment cannot drift. The old query took the newest read-back per copy without `formPassed`; the new one uses the filtered one. Same result except for rows from before QA-165.
  * The page, change-only list, re-approve `changed` and `carry`, and C7.6 all pass it.
  * My probe: approval stamped `ddd…`, then a further copy `2b0e75…` read back. The page reads "Approval withdrawn: the validated copy read back since is not the file this approval stamped. Re-approve…", re-approve is offered, C7.6 does not count the review, and nothing was moved (0 audit lines).
  * C8.3-23 covers it through the routes. The unit "file fail" case fails if the sha comparison is removed: it has `!fileStampCurrent({validated_copy, V1}, V2)`.
* **M2: fixed.** The audit detail has `was_sha256` (null for a `none` stamp, as observed). The migration's rollback note now matches.
* **m1: fixed.** The kind is now in the update's WHERE (`updateMany`, count 0 means skip). This is the exact change I tested in round 1 at SQL level.
* **m3: fixed.** The guard needs the newest round of the filing and a kept `validated_copy` with that sha. Probed: a move on a superseded approved row is refused (R1), an unkept sha is refused (R2), a kept sha on the newest row passes once (R3, R4), generated → validated passes (R5), and the first stamp under review still works (R6).
* **m4: fixed.** `FILE_WORDS.none` is restored. The promise shows only on a stamped barcode form not filed Online. Walked: IMM 5257 shows it, IMM 5476 does not, and the frozen row does not.
* **m5: fixed.** Ready to file reads "A validated copy was read back after this filing was reviewed on 2026-11-09, and the review did not stamp it. The representative of record re-approves it (one click on the review)."
* **m6: fixed.** C8.3-22 checks three more refusals.
* **m2: left as is, accepted.** It fails safe.

**Round 2 minors (none blocks):**
* n1 (Should): the user-facing words end with a tracker id: "…is stamped to this approval (QA-345)" (`api/src/review-rounds.ts:261`). Drop "(QA-345)"; PRODUCT §4 words carry no internal ids.
* n2 (Could): the guard's `validated_copy` check is not tied to the row's case, form and subject. Any kept file with that sha passes. A sha256 of uploaded bytes makes a cross-form match practically impossible; joining `form_instance` on `case_id`, `form_number` and `subject_id` would close it.
* n3 (note): the migration was edited in place. That is fine because it is not on main. A copy that applied the earlier version needs a fresh start, which `isolated.sh start` does.
* n4 (note): C8.3-23 no longer covers the case "validated copy current, stamp `none`, never moved" (data from before the fix) through the API. The unit `fileGone` case and the shared rule cover it.

**Journey (round 2): 9.5/10, pass.** All J1–J4 held. Axe found nothing in four states, there is no sideways scroll at 400, 1024 or 1440 px, and no console errors. The review loads in 496 ms and approve takes 306 ms. Plain words is ½ for n1. Feedback, correct data and recovery go up to 1 (M1, M2, m1 fixed).

Verdict: Approve (for 7a5c38e5c3913af6a2ff1cffc91582609d12eda1)
* Blockers: none. Majors: none (M1, M2 fixed).
* Minors: n1 (tracker id in the words), n2 (guard's sha check not scoped to case and form), n3 and n4 notes; m2 accepted.
