# B132 review: Paper print and sign-in-pen steps recorded (server, engine, one migration; no screen)

Reviewer: Opus, a fresh session that did not build this change. Branch `claude/screens-b132-paper-pen` at **56459093c74bddd2bb1c0f94b67b6d05e5d8839d** (PR #1278). Only B132's own diff was reviewed: `e31e8a56e..56459093c` (B129 is underneath and was not reviewed here). Scope as briefed: code, tests and migration against the row, STANDARDS §3–§6 (migrations §5) and WAY-OF-WORKING "Every PR". There is no screen, so the journey-test score, D1–D20 (UI) and the BIC table are N/A. Own copy `rev_b132` on :4444 (`tools/isolated.sh`, TTL 60, now stopped: database and files removed). Live AI off, US$0, Sample data only. No tracked file was changed (`git status` clean). The probe scripts were scratch files and were deleted.

## Verdict: Block (two Majors)

## What I ran
- `tests/check_c81_signing_api.ts 4444 xr_studio_rev_b132`: **30/30, exit 0**. `tests/check_vv_prepare_store.ts`: **28/28, exit 0**.
- `node P/tools/graph.mjs --check`: exit 0, the same G3 12 / G6 6 as the base commit. `tools/count-any.mjs`: 418 on both the base and this commit, so no rise.
- Live probes on the copy, described under the issues below.

## Issues, ranked

**M1 (Major, Must). A Paper barcode form can be recorded as "Printed" from a copy that is not its validated copy. On a re-print after a change, the Validate check is skipped entirely. Once that happens, the validated copy can never be recorded as printed, and readiness passes.**
- `api/src/sign-steps.ts:88,102`: when `restart` is true the code sets `refusal = null`, so `penRefusal`'s "Printed comes after the validated copy … is read back" never runs on a re-print.
- `:105-116`: on any print, the copy only has to be GENERATED and current. Nothing checks that it is the copy that was validated and read back. paperLine's own words are "Print the validated copy with its barcode page" (P-144: IRCC returns it unprocessed without that page).
- Repro on :4444, IMM 5257 moved to Paper (PEN):
  1. Validate round trip, then print it: 200. Signed in pen: 200.
  2. Change `person.family_name` and confirm. The line reads `out_of_date`, `validate:false, print:true, sign_in_pen:true`.
  3. Print a **plain generated copy** (never validated): **200**, recorded as a restart. Signed in pen: **200**. The line now reads `validate:false, print:true, sign_in_pen:true`, which is exactly the order B132 says it refuses.
  4. Validate a new copy and print it: **409 "Printed is already done for IMM 5257."** Meanwhile the line reads `validate:true, print:true, sign_in_pen:true`, readiness has **no block and no warning** for the item, and the recorded printed copy is still the copy without the barcode page.
- Second case: on a fresh case, with a current validated copy, a first print naming a different plain copy is **200**, and that plain copy's id is recorded as printed.
- Fix: for a PEN barcode form, `print` must name the validated copy that is read back and current (the view's `validated.copy` with `validated.current`), refused in words otherwise. Apply the same check on the restart path. Fail-then-pass lines for both cases go in section (6).

**M2 (Major, Must). The new lock in `save()` deadlocks a double-submitted signed scan, which turns a 409 into a 500.**
- `scan()` (`:172-175`) inserts `signed_scan` first. Its foreign key to `runtime_case` takes FOR KEY SHARE on the case row. `save()` then asks for `SELECT … FOR UPDATE` on that same row (`:142`). When two uploads of the same item overlap, both hold KEY SHARE and both wait to upgrade, so Postgres aborts one with 40P01.
- Repro (`Promise.all` of two uploads per item, 6 cases): **6 × 201 and 6 × 500** "Something went wrong on the server…". The api.log shows `Raw query failed. Code: 40P01 … deadlock detected`.
- The same sequence in two psql sessions (INSERT signed_scan, then FOR UPDATE runtime_case) deadlocks every time.
- Before this diff, `save(tx)` took no case lock. The second upload then hit `sign_step_one_current` (P2002), and `:145` answered 409 in words ("… was just done … by someone else"). That was the designed answer, and it is lost now.
- No file leaks: 14 files for 14 rows, because `rmSync` in the catch runs.
- The restart transaction (`:118-121`) also takes its locks in the opposite order to `case-prepare.ts` `channel()` (`:588-596`): sign_step rows first, then the case row, where `channel()` takes the case row first, then sign_step. A re-print racing a channel change on the same item can deadlock the same way.
- Fix: take the case row lock as the **first** statement of the scan and restart transactions, as `case-prepare.ts` does, and let `save(tx)` skip re-locking (or keep it, since it is harmless once held). Add a failing-then-passing concurrency line: two uploads of the same scan at once give one 200 or 201 and one 409 in words, and no 500.

**m1 (Minor, Should). The Validate check on a pen print fails open.** `:99-100` decides `barcode` from whether the view's item has a `validate` step. When the line waits (`cannot_start`), the view gives no Paper steps, so `barcode` is false and a barcode form passes `penRefusal`. Use `isBarcodeForm(item.itemKey)` for `barcode` and the view only for `validated`. With M1's fix this case is covered too.

**m2 (Minor, Should). One direction of the rule "each signing way refuses the other's keys" has no committed failing test.** `:80` (a HAND_SCANNED item refuses `sign_in_pen`) is the only guard. `stepRefusal("sign_in_pen", {}, …)` returns `null` (checked), so removing `:80` would record a pen step on a hand-signed form and every suite would stay green. The breaker tried this by hand. It needs a line in section (6), as STANDARDS §3.10 and §7 ("fails when removed") require.

**m3 (Minor, Should; may belong in its own row, C9.2 on Paper). A pen signature on a form with no barcode page never goes out of date.** Repro: IMM 5476 moved to Paper, printed and signed in pen, then `person.family_name` (a fact it reads) changed and confirmed. The line reads `to_do, print:true, sign_in_pen:true`, with no out-of-date mark and no readiness warning, so readiness counts the stale pen signature as signed. A barcode form is caught by its Validate block, and a hand-signed form by C9.2's `signed_scan` record. The comment at `:87` ("the same for a form signed in pen") is true only for the re-print path. The row names barcode forms, so I leave whether this is B132's job or a new row to the tech lead. It is not a blocker here.

## Checked and held
- **The row's Done-when:**
  - A PEN item takes `print` then `sign_in_pen`. Out of order → 409 in words (`Signed in pen comes after "Printed": print IMM 5257 first.`), nothing recorded.
  - A repeat → 409 "already done".
  - Hand-signed keys on a PEN item → 409 naming its own steps.
  - A scan on a PEN item → 409, nothing stored.
  - paperLine reads `print` and `sign_in_pen` from `signStepsOf`; Mail stays null.
  - The item read lists Printed and Signed in pen.
  - Readiness `signed` for PEN (`readiness-inputs.ts:82`, unchanged) now becomes true once Signed in pen is done, and the "missing signature" warning goes.
  - The builder's stash run (22/30 → 30/30) is fail-then-pass.
  - sign-steps.ts has had one owner along B3 → B129 → B132.
- **Extra `prepare.view` call:** one full view, only on a PEN `print`, the same pattern `uploaded_to_ircc` already uses. That cost is acceptable for a single button press. `x.id === item.id && !x.record` is correct: the `record: "signed_scan"` entry that can reuse the item id exists only on the HAND_SCANNED branch (`case-prepare.ts:337`), and the filter excludes it anyway. The view is read outside the transaction (a narrow race), as the existing copy check is.
- **Restart for pen items:** `!done.uploaded_to_ircc` is always true for pen, so a print after a fact change supersedes `print` and `sign_in_pen` and records the new print. That is correct apart from M1. A channel change supersedes every current step (`case-prepare.ts:596`), so steps recorded under one way of signing never count for the other (the breaker confirmed this).
- **B129 Minor (the read-only check under the lock):** `refuseIfRecorded` now runs again under the case row lock in every save path, and section (5) still passes. The lock order problem is M2.
- **C7.7-24's new wording is fair.** It still asserts "never Ready before printed and signed in pen", and it now states the new fact correctly: Printed and Signed in pen read `false` (recorded, not yet done) instead of `null`, and Mail stays `null`. It is a negative ("fail") line, and the behaviour change is in the same PR, as WAY-OF-WORKING requires ("its pack changes in the same PR").
- **Migration (STANDARDS §5):** it is expand-only (a wider CHECK), it changes no rows, and its timestamp sorts after every migration on main.
  - Prisma runs the multi-statement script as one implicit transaction, so DROP plus ADD cannot leave the table half-changed. The breaker proved apply and re-apply on a copy with existing rows, byte-identical.
  - The rollback is now recorded in the header, and it is correct: deploy the old code first, then one transaction. It states what is lost (pen steps, including superseded ones) and what is kept (audit lines). It also explains why `NOT VALID` is not used.
  - Whether deleting rows on a rollback is acceptable under P-188 is the founder's call, as the breaker noted. The header states the loss plainly.
  - The tech lead approved the migration (own stamp) on #1278.
- **Server authorisation:** both routes go through `r.reach(actor, …, "officer")`. The breaker showed another firm's user gets 404 and the client gets 403. Errors are Problem Details in words.
- **Tests:** the new section (6) and the prepare-store lines fail when the pen branch, the pen order rule or the paperLine read is removed. The exception is m2.

## What I could not check
- A live reproduction of the restart-versus-channel-change deadlock. That finding rests on lock-order reading. The scan deadlock was reproduced live.
- Whether production configurations have forms with no barcode page that are filed on Paper (affects m3's reach).
- A full typecheck. I relied on the builder's "no new errors" plus the any-ratchet count.

## To fix before Approve
1. M1: a PEN barcode form's `print` must name its current validated copy, and the restart path must apply the same check. Add fail-then-pass lines for the first print and for a re-print.
2. M2: take the case row lock first in the scan and restart transactions. Add a concurrency line: two uploads of the same scan at once give one success and one 409 in words, never a 500.
(Should: m1 and m2 in the same PR. m3 is for the tech lead to rule on.)

Verdict: Block — commit 56459093c74bddd2bb1c0f94b67b6d05e5d8839d

## Round 2 — diff `56459093c..17484897c` only

Own copy `rev_b132` on :4444 (stopped after: database and files removed). Live AI off, US$0, no tracked file changed by the runs. `check_c81_signing_api.ts`: **36/36, exit 0**. `check_vv_prepare_store.ts`: **28/28**. I also re-ran my round-1 probes on this code (scratch files, deleted).

- **M1: fixed.** A barcode form on Paper is now judged with `isBarcodeForm`. It is refused when no current validated copy exists (`notValidated`, checked before the restart shortcut), and the copy printed must be `validated.copy` itself (`sign-steps.ts`, the print checks in `step()`).
  - The round-1 repro now goes:
    1. Print the validated copy (200), then Signed in pen (200).
    2. Change a fact the form reads.
    3. Re-print a plain copy: **409** "Printed comes after the validated copy … is read back".
    4. Re-print the old validated copy: **409**, the same words.
    5. Validate again, then print a plain copy: **409** "Print the validated copy of IMM 5257 … not another copy. Nothing was recorded."
    6. Print the new validated copy: 200, and the steps restart. Signed in pen: 200.
  - The line ends `validate:true, print:true, sign_in_pen:true, mail:null`, and the recorded printed copy is the new validated copy.
  - A line waiting for an answer has no `validated`, so the check now fails closed (this also covers m1).
- **M2: fixed.** `lockCase` (FOR UPDATE on the case row) is taken first in the scan transaction, before the `signed_scan` insert, and first in the restart transaction. That matches `case-prepare.ts` `channel()`'s order: case row, then sign_step. The extra lock inside `save()` is harmless, since the same transaction already holds it.
  - Three uploads of the same scan at once, on 6 cases: **6 × 201, 12 × 409** in words, exactly one scan stored per item.
  - No `40P01` in the API log (round 1 gave 6 × 500 with 40P01).
- **m2: fixed.** Section (7) checks that a hand-signed IMM 5476 refuses `sign_in_pen` (409, naming its own steps, nothing recorded).
- **Tests:** section (7) has fail and pass lines for:
  - the first print (plain copy refused, validated copy printed)
  - the re-print (a copy never validated refused with the signed print kept; the new validated copy printed with the steps restarted)
  - m2 and the concurrent upload
  
  The builder reports them red before the code fix (31/36) and 36/36 three times after. My run agrees on the after state.
- **m3** (a pen signature on a form with no barcode page never goes out of date) has been put to the tech lead on #1278 as a follow-up row. That is accepted here: it is outside this row's barcode-form scope.
- Nothing new found in this diff. No Blocker or Major is open.

Verdict: Approve — commit 17484897c695f5bf7c43b38f7c168cd193d403a5
