# PF-12b part 3 review: the three firm-less bypass uses write a platform line; re-encrypt leaves the list

Reviewed commit `f817c153bb5274ceb4e6de88f10d0b40d715dcbc` (branch `claude/runtime-pf12b3`). I read only the stacked diff, `git diff 4f7009ead1a391aa307799530d71e62d15528116 f817c153`.
I checked it against the tech lead's ruling (Lead 15, option 1 on #2752; Lead 70 on #1999: every bypass use writes an audit_event row, no log-only) and its Done-when.
I am a fresh session that did not build this row. Postgres was on :54329; the isolated copy used runtime port 4433, never :4400. Backend row with no screen: screen-only parts of the skill are N/A.

## What I ran (shared tree, clean, at f817c153)
- `tests/check_pf12b_bypass_audit.ts` **58/0**.
- Related suites, all green: `check_pf12_walls` 100/0, `check_pf12b_doors` 31/0, `check_pf19p_platform_mail` 68/0, `check_pf5_signup_billing` 54/0, `check_pf5v_signup_mail` 13/0, `check_case_feed` 42/42, `check_aud1b_adapter` 39/0, `check_aud1m_case_writes` 17/0, `check_pf24_secrets` 84/0, `check_pf14_jobs` 95/0, `check_pf19r_every_sender` 21/0, `check_pf19b_mail` 29/0.
- `check_aud1a_insert_only` 31/1: its part B needs an API copy on :4606 that I did not start (fetch failed). The failure comes from the setup, not from this diff.
- `tsc -p api/tsconfig.json`: no error in any touched file.
- Two mutation runs on a scratch worktree (see m2).
- A journey walk over real HTTP and a browser on the isolated copy `rv_pf12b3` (see the journey report).

## Focus questions, answered
**Every database touch on the three uses sits in a transaction that wrote the line.** This holds, with one exception (m1).
- The purge is one transaction: line first, then delete (`firms/signup.ts:233`). Its only caller is the job handler (`:86`).
- account.mail: the line and the outbox row are in one transaction (`send/mail.ts:40`). Both sign-up callers (`signup.ts:147`, `signup-identity.ts:42`) go through `send`, and no platform mail uses `sendIn`.
- `dispatch` after the commit only enqueues a pg-boss job (no walled table).
- job:messages.send: `sendPlatformRow` writes the line before its `FOR UPDATE` read (`send/messages.ts:260`). The try-count path has its own transaction (`:242-249`).

**mayRunInside** now keys on `"platform"` (`firm-scope.ts:150`). The nested-use test asserts both directions, and also the per-firm stand-in.
- The sign-up flow still works. In the suite, real mail inside `platform.firms.signup` passes.
- My browser walk: verification email, confirm, sign-in, and "already have an account". Each account.mail run added exactly one null-firm line.

**Re-encrypt off the list.** `asJob` now runs a firm-less re-encrypt job with no bypass, and two refusals still stop it:
- the runner refuses a firm-less job that is neither recurring nor on a platform queue before its handler (`check_pf14_jobs` "never reaches its handler");
- the handler refuses one before any read (`reencrypt.ts`, first lines of the handler).
- With no bypass, a stray read would also see no firm's rows.

**Can recordCase refuse or misattribute the line?** Not on today's callers.
- Public sign-up routes skip the guard (`identity/guard.ts:99`), so `req.platform` is unset. The request scope then has no firm and no actor (`observability/hook.ts:40,58`).
- Platform jobs have a null job firm.
- So `firmId = caseFirm ?? scope ?? named ?? null` gives null (`audit-event.ts:87`). The actor `system:<use>` passes CaseActor and gets type SYSTEM.
- A signed-in request would be refused by the actor check, not misattributed, and fail-closed.
- On the copy, the line read: firm null, `system:platform.account.mail`, SYSTEM, entity `bypass use`, key = the use, workspace `platform-audit`, correlation id a uuid, detail `{use, method: POST, correlationId}`.

**Is the case-side entry shape acceptable?** Yes, as an interim, with the caveat in m3.
- No current reader mistakes the line for a case line:
  - the firm Activity log filters on `firm_id` (`audit/firm-read/service.ts:134,160`);
  - the studio views filter on the demo workspace;
  - the action and entity name it plainly.
- Avoiding a port change without asking (P-423) is the right call.

**Tests are meaningful pass/fail pairs for each use's main path:**
- the purge's pass (one null-firm line) and fail (nothing deleted);
- account.mail's pass (1 line, row written) and fail (no row);
- send's pass (1 line, SENT) and fail (QUEUED, no try);
- the registry is 8 + 3 with re-encrypt absent;
- `unaudited` now refuses any `none:` text.
- Removing `touchPlatform` from any of the three main paths turns a test red (checked by reading). The catch path is not covered (m2).
- Size: +96/-44 in total, about 50 lines of app code. Under 150.

## Issues (no Blocker, no Major)
1. **m1, Minor (Should): the try-count path reads before it writes the line.** At `send/messages.ts:243-244`, `findFirst` runs and `if (!row) return null` commits a bypass read with no line. By then `sendPlatformRow`'s line has rolled back, so this job run leaves no row.
   - It is reachable only in a race: another worker finishes the row between the rollback and this read. The job then fails and its retry writes a line ("skipped").
   - Part 1's sweep sets the precedent: a read with nothing acted on writes no line.
   - Fix (one line): move `await touchPlatform(tx)` above the `findFirst`, as `sendPlatformRow` does.
2. **m2, Minor (Should): the catch path is untested.** Two mutations survived, and both suites stayed green (58/0 and 68/0):
   - (a) deleting `touchPlatform` from the try-count transaction (`:245`);
   - (b) deleting the `BypassNotRecorded` rethrow (`:240`).
   - Add one pass/fail pair:
     - a provider refusal counts one try and writes one null-firm line;
     - a port that fails only on the first write counts no try (this proves the rethrow).
3. **m3, Minor (Should): the line uses the case-side entry shape, against the port's written contract.**
   - `ports/audit.ts:111` says a platform line never names a workspace. The CaseEntry doc (`:86-91`) says the shape is for case and configuration lines.
   - `touchPlatform` (`firm-scope.ts:222-237`) does not say why it uses the case shape. It also does not check that no firm is in scope.
   - `platform.account.mail` is `outside: true`. If it ever ran inside a firm's job, `audit-event.ts:87` would stamp that firm on the "firm-less" line.
   - Fix:
     - say the departure and its reason in the comment and the PR body;
     - refuse in `touchPlatform` when the scope names a firm (`currentFirm()` or the job's firm);
     - raise the port question (an AuditEntry with an optional firm, or a platform entry) with the tech lead under P-423, as a later row.

Not findings for this row:
- Outside the diff: `platform.firms.signup`'s new-email path changes `platform_signup_pending` (`signup.ts:154-163`) with no line of its own. That is the same register the purge now lines. For the tech lead, if R1.4 is meant to cover it.
- The "Check your email" page says "We sent" even when the line failed. That is PF-5's background step (anti-enumeration), and "Send it again" recovers.

## Scores (D1–D20; backend row)
- **D1 9:** the ruling is met for all three uses, and re-encrypt is off the list.
- **D2 9:** the line and the work share one transaction. m1 is a race-only read.
- **D5 9:** a failed line gives BypassNotRecorded (500 in plain words, or a retried job), and no try is wrongly counted.
- **D15 9:** one insert per use run (plus the workspace lookup).
- **D16 8:** a pass/fail pair for each use, and mutation-checked. The catch path is untested (m2).
- **D18 8:** MODULE card and comments are updated. The port departure is not stated (m3).
- **N/A:** D3, D4, D6, D7, D19; D8 to D14 (no UI in the diff).
- **D17 and D20:** simulated only.
- **BIC-01 to BIC-20:** N/A (no case-side screen).
- **Graph (P-86):** `graph.mjs` maps no element or route to this row. The suite is named in `MODULE.rows/PF-12b3.md`.

## Journey score (reviewer, the one score for this check)
**9.5 / 10, pass.** Details: `journey-test-reviewer-2026-11-21.md`.

## Could not check
- The PR body and CI on GitHub.
- A real Cognito sign-in (local stand-in only).
- The purge job over the real scheduler (suite only).
- `check_aud1a_insert_only` part B (needs its :4606 copy).

**Verdict: Approve f817c153bb5274ceb4e6de88f10d0b40d715dcbc.** No Blocker or Major is open. m1 to m3 are recommended in the next push, or can be recorded for later.

---

## Re-review, 21 Nov: head `c21588eee16c5d50398112e0e98ac6b96f6fa5f6`
(Restored here on 21 Nov: this section and re-review 2 were first added as uncommitted text and were lost when the shared tree moved to a newer head. Their content is unchanged.)
I read the diff only: `git diff f817c153bb5274ceb4e6de88f10d0b40d715dcbc c21588eee16c5d50398112e0e98ac6b96f6fa5f6`.
- The app changes are three: `firm-scope.ts` +8/-2, `send/messages.ts` (one line moved) and the MODULE card wording.
- The tests add +20 lines in `check_pf12b_bypass_audit.ts`.
- I ran everything on a scratch worktree at c21588ee, with Postgres on :54329 and never :4400.

### Runs at c21588ee
- `check_pf12b_bypass_audit` **61/0**, `check_pf19p_platform_mail` **68/0**, `check_pf5_signup_billing` **54/0**, `check_pf12_walls` **100/0**, `check_pf12b_doors` **31/0**.
- The walls and doors suites start the real API. That proves the new `currentJobFirm` import from `jobs/pgboss-jobs.ts` loads with no import cycle at start-up.
- `tsc`: no error in any touched file.

### Mutations (each one alone, then reverted)
| Mutation | Result |
|---|---|
| (A) delete `touchPlatform` from the try-count transaction (`send/messages.ts:243`) | **red**: "PF-12b3 pass (job:messages.send, provider refusal)", 60/1 |
| (B) delete the `BypassNotRecorded` rethrow (`:240`) | **red**: "PF-12b3 fail (job:messages.send, review m2)", 60/1 |
| (C) delete the new firm-in-scope refusal in `touchPlatform` | **red**: "PF-12b3 fail (break m3)", 60/1. Without the refusal, the purge in firm A's scope succeeds and its line lands on A's trail. |

### My three Minors
- **m1: closed.** `touchPlatform(tx)` is now the first statement of the try-count transaction, as in `sendPlatformRow`.
- **m2: closed.** Two new tests turn mutations A and B red: a provider refusal counts try 1 of 5 with exactly one line with no firm; an audit port that fails only on the first write gives `calls === 1`, the row stays `QUEUED`, and no line is written.
- **m3: closed.** The comment records the departure from the case-entry shape, the reason (P-423) and the later port row. `touchPlatform` refuses with BypassNotRecorded when the request scope names a firm or `currentJobFirm()` is set; platform jobs and public sign-up requests still pass. Only the request branch is tested; the job-firm branch is the same one-line condition, which I accept.
- **The card wording** "no entry is classed none" is accepted. **The sign-up gap** goes to the tech lead as a question.

No new issue.

**Verdict: Approve c21588eee16c5d50398112e0e98ac6b96f6fa5f6**

---

## Re-review 2, 21 Nov: head `320ad5e2bd4d68790f440d0f4d6d0697e42eb345`
This covers Lead 15's ruling on #2814: sign-up's steps that touch no firm.
- I read the diff only: `git diff c21588eee16c5d50398112e0e98ac6b96f6fa5f6 320ad5e2bd4d68790f440d0f4d6d0697e42eb345` (+65/-28 across `firm-scope.ts`, `firms/signup.ts` and the suite).
- Shared tree at 320ad5e2. Postgres :54329. Isolated copies on runtime ports 4433 (new head) and 4434 (c21588ee, for comparison). Never :4400.

### Runs
- `check_pf12b_bypass_audit` **66/0**, `check_pf5_signup_billing` **54/0**.
- The new tests are real pass/fail pairs: new email (keyed by the pending id, no `@`; nothing stored when the line fails), unknown link (one line, no key, the same 404), wrong code (keyed by the pending id, 400), and both refusals answer 500 in plain words with no line when the audit write fails.

### Burst check: 30 new-email sign-ups at once (3 client addresses × the per-IP cap of 10), same script on both heads
| Head | Accepted (202) | Pending rows stored | Background steps failed | Public `GET /api/public/plans` during the burst |
|---|---|---|---|---|
| c21588ee (before) | 30 | **30** | 0 | first probe 403 ms, then 6 ms |
| 320ad5e2 (this head) | 30 | **5** | **25** (`PrismaClientKnownRequestError`) | first probe **4,090 ms**, then 6 ms |

### Findings
1. **Major (Must): the provider call sits inside the sign-up transaction, and under a burst most sign-ups are lost** (`firms/signup.ts:147-165`). Each new-email step holds a connection and the email's advisory lock across `identity.register`; the local provider's email opens a second, nested transaction. 25 of 30 real sign-ups failed in the background (each person saw "Check your email" and got nothing), and every other request waited about 4 s. With Cognito, a slow SignUp call would hold a connection for up to 15 s per sign-up. Fix: `register` outside any transaction, then one short transaction with the lock, the `knownAccount` re-check, the pending writes and the line; add a burst test larger than the pool.
2. **Accepted:** the verification email can go out before our line; a failed line leaves a link to no pending row (the same 404), the order review m1 of #2456 accepted.
3. **No sign-up read on our register is left unlined where the read leads to an action** (catalogues are unwalled; success is followed by the firm's line; the double submit acts on nothing; PLAN_GONE's extra line is accepted).
4. **Minor (Should):** `MODULE.md:13` should name a per-firm use's firm-less step lines.

**Verdict: Changes needed.** Fix before Approve: (1). Recommended in the same push: (4).

---

## Re-review 3, 21 Nov: head `8700d0bf4f4aef4d7c2ae0c5d70d4e6dd5b9397f`
I read the diff only: `git diff 320ad5e2bd4d68790f440d0f4d6d0697e42eb345 8700d0bf4f4aef4d7c2ae0c5d70d4e6dd5b9397f`. It is +33/-21 across `firms/signup.ts`, the suite and `MODULE.md`.
Shared tree at 8700d0bf. Postgres :54329. Isolated copy on :4433. Never :4400.

### Runs
- `check_pf12b_bypass_audit` **67/0**, `check_pf5_signup_billing` **54/0**, `check_pf5v_signup_mail` **13/0**.
- My burst script, unchanged from re-review 2 (30 new-email sign-ups at once, 3 client addresses × the per-IP cap):

| Head | Pending rows stored | Background steps failed | `signup.new-email` lines | Public read during the burst |
|---|---|---|---|---|
| c21588ee | 30 | 0 | (none then) | 403 ms |
| 320ad5e2 | 5 | 25 | 5 | 4,090 ms |
| **8700d0bf** | **30** | **0** | **30**, all with no firm, keyed by the pending id, no `@` | **183 ms** |

All 30 outbox rows were written, and they were sending at the time of the check (13 SENT, 17 QUEUED).

### Findings
1. **Major (1) of re-review 2: closed.**
   - `register` runs outside any transaction again, and SIGNUP_TX_MS is gone.
   - The pending row's transaction is short: advisory lock, `knownAccount(email, tx)` re-check, replace/delete/create, and the line last. So a failed line still leaves no pending row, which is fail-closed.
   - The new suite burst discriminates: 16 sign-ups at once through a provider that holds its own pooled transaction. The builder reports 6 of 16 stored with 320ad5e2's `signup.ts`; I did not re-run that mutation, and my own burst above confirms it independently.
   - Edge, accepted: if another sign-up makes the account between the pre-check and the re-check, the person gets the verification email from `register` and also the "already" email. Their pending row is not stored, so the link answers 404. This is rare and harmless, and no firm's data is shown.
2. **Minor (4): closed.** `MODULE.md:13` now names a per-firm use's firm-less step lines through `touchPlatform(tx, { step, key })`.

No new issue.

**Verdict: Approve 8700d0bf4f4aef4d7c2ae0c5d70d4e6dd5b9397f**

---

## Re-review 4, 21 Nov: head `0ed880066878dee17f8cd29c58c85f6415683b5b` (merge of main, and the branding door)
- I read the diff only: `git show 0ed880066878dee17f8cd29c58c85f6415683b5b` (+11/-5 across `branding/images.ts`, `firm-scope.ts` and `check_pf12b_doors.ts`), plus the shape of the merge.
- Shared tree at 0ed88006, clean. Postgres :54329. Never :4400.

### The merge `80dddd007` brings in main and nothing else
- Its parents are `46fb9970` (this branch) and `caee4edb1`, which is on `origin/main`.
- `git merge-tree --write-tree 46fb9970 caee4edb1` gives tree `a7f3cd4a…`. That is exactly `80dddd007^{tree}`, so this is a clean automatic merge with nothing edited by hand.
- `git diff caee4edb1 80dddd007 --stat` lists only this branch's ten files: the three PF-12b3 records, the MODULE card and row, `firm-scope.ts`, `signup.ts`, `send/mail.ts`, `send/messages.ts` and the suite.

### The branding door moves off the bypass (`0ed88006`)
- `publicFirm` (`branding/images.ts:80-87`) now calls `platform_firm_of_key(key)`, PF-12b2's definer lookup, which returns the firm id only. It then reads the firm row inside `withFirm(firmId)`.
  - The status check (ACTIVE or TRIAL), the one 404, and `enterFirm` are unchanged.
  - The header route and the image route both go through `publicFirm`.
  - A direct call from a suite or tool still works: that EXECUTE grant includes `xr_staff_bypass`.
- This is the same pattern as the booking page. It adds no new reach, and it needs no migration.
- `"platform.branding.public"` (an entry classed `none:`) leaves `BYPASS_USES`. The registry stays 8 per-firm plus 3 platform with no `none:`, which is Lead 15's rule and what the type enforces.
- `check_pf12b_doors` adds the door to `DOORS`, so it now covers:
  - the door is not on the list;
  - `asBypass` under its old name is refused;
  - DW7: no bypass line from a door call;
  - pass: branding answers 200 with the firm's name;
  - fail: an unknown key answers 404.

### Runs at 0ed88006
- `check_pf12b_doors` **33/0**, `check_pf12b_bypass_audit` **67/0**, `check_pf13b_images` **32/0**.
- `product/tools/typecheck.mjs`: **PASS**, no new type errors (15 known). This clears the CI `types` failure (TS2322 at `firm-scope.ts:108`).

### Findings
1. **Minor (Should): three comments still say the door uses the bypass.**
   - Where: `branding/images.ts:8` and `branding/routes.ts:4` ("through the named PF-12 bypass use `platform.branding.public`"), and `MODULE.rows/PF-13b.md`.
   - `MODULE.md:13` lists the doors that are "not bypass uses", and the branding door is not named there.
   - Fix: reword the three comments and add the door to the card's list in the next push. This is documentation only, so it does not block.

**Verdict: Approve 0ed880066878dee17f8cd29c58c85f6415683b5b**
