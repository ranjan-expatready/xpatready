# FO-6 part 1 review: signing schema (PR #2038)

Commit `77883fca784f5a4239f6f624829f88b411bf6385`, diff against `origin/main` (merge base `50cb489bd`, which is the current main head). Independent reviewer; I did not build this. Scope: the schema step only. Not built here (P-26), so not findings: SigningPort, its fake, the API, the public door, the webhook route, MailPort, the jobs.

**Reviewer: Changes requested 77883fca784f5a4239f6f624829f88b411bf6385**
Skill verdict: Rework of four database rules (small, all in `migration.sql`). **Verdict: Block** on the four Majors below.

## What I ran
* `npx tsx tests/check_fo6_signing.ts`: **37 passed, 0 failed** (local Postgres 18, 127.0.0.1:54329; scratch databases only, all dropped afterwards).
* My own probe database (every migration plus `seedSampleFirms`; dropped afterwards). I ran SQL that an API bug, a replayed webhook or a second writer could send. Results are below as P1-P12.
* A two-session race: evidence insert against a cancel.
* Not run: `graph.mjs`, because it rewrites `qa/GRAPH.md` and I may write only this file. `graph.json` already lists the test. CI at this sha: `pr-rules` is red ("MISSING: no Done when" in the draft PR body). The other jobs were skipped or queued.

## Done-when lines that need data: does the schema hold them?
| Rule | Held? | Evidence |
|---|---|---|
| One live request per document | Yes | partial unique `fo_signature_request_one_live` (migration.sql:185); test checks pass and fail |
| A version is sent once | Yes | unique (firm, kind, version_id) (:118); fail test |
| Consent before signature | Yes | `fo_signer_signed_check` (:202): signed_at >= consented_at; fail test |
| The firm signs last | **No** | P1-P3: SIGNED is reachable with no firm signer or no signers at all, and a client can be added after the firm signed |
| Code tries and lock, hashes only | Mostly | sha256 shape and 0-6 tries hold; 6 tries without a lock is accepted (P9) |
| Never expires once a client signed | Yes | request trigger (:279); pass and fail tests. EXPIRED is accepted before `expires_at` (P5) |
| Decline ends it for all | Yes once DECLINED | a final request freezes its signers (:306); DECLINED needs no declining signer (P6) |
| Webhook stored once (doc id + event) | Within a firm only | P4: two firms can hold the same (provider, provider_document_id) |
| Evidence files and hashes | Yes, with a gap | key and sha shape checks; evidence can land on a request a concurrent cancel ended (race below); consent version is not matched to the signers' (P7) |
| Cross-firm walls by composite keys | Yes for staff and request | composite foreign keys (:148-160); person_id and document_id are plain uuids (see below) |
| Nothing deleted | Yes | row and TRUNCATE triggers on all four tables. P12: `session_replication_role=replica` bypasses them, but only a superuser can do that, as in FO-5. Not a finding |

## Issues, ranked
**Blockers:** none.

**Majors (Must)**
1. **The firm signing is not required for SIGNED** (migration.sql:271-278). P1: a request with **no signers** went SENT → CLIENT_SIGNED → evidence → SIGNED. P2: one client signed, **no FIRM signer row**, and the request still reached SIGNED. The `NOT EXISTS unsigned` checks are vacuous on an empty set. `fo_signer_one_firm_signer` (:208) gives "at most one", but front-office-signing.prisma:93 says "exactly one". *Fix:* in `fo_signing_request_write`, make CLIENT_SIGNED require at least one CLIENT signer, and SIGNED require exactly one FIRM signer with `signed_at`. Add a fail test for each.
2. **A signer can be added after signing has started** (migration.sql:295-300). The insert check looks only at the new row and at status = SENT. A request can stay SENT while signers sign (SENT → CLIENT_SIGNED is direct). P3: the client signed, the firm signed, then a new CLIENT was inserted and accepted. That breaks "the firm signs last". *Fix:* on INSERT, refuse when any signer of the request has `viewed_at`, `consented_at`, `signed_at`, `declined_at` or `code_verified_at` set (the row lock on the request is already taken at :294). Add a fail test.
3. **Evidence races a cancel, and a fully signed request can be cancelled** (migration.sql:329, :268). Race: T1 inserted evidence on a CLIENT_SIGNED request where every signer had signed, and slept. T2's `status='CANCELLED'` did not wait (the foreign key's KEY SHARE lock does not block a NO KEY UPDATE). Both committed, leaving **CANCELLED with 1 evidence row**. P8: the same CANCELLED move is accepted without the race. *Fix:* in `fo_signing_evidence_write`, read the request with `FOR UPDATE` (as `fo_signing_signer_write` does at :294). In `fo_signing_request_write`, refuse any move except SIGNED once evidence exists. Add a fail test.
4. **The webhook's provider document id is unique only per firm** (front-office-signing.prisma:84-85, migration.sql:121, :142). The route `/api/hooks/signing/:provider` has no firm in it. P4: firm B inserted firm A's `pd-3`, and a lookup by (provider, provider_document_id) returned **2** rows. The comment "it finds one request" is not guaranteed, so "firm A's webhook cannot touch firm B's request" rests on luck. *Fix (pick one, state it):* (a) add `UNIQUE (provider, provider_document_id)` and record it as the one exception to "firm_id first in every index" (test :79); or (b) write down now that the hook resolves the firm only from the verified payload's own metadata (our request id), and change the comment at :84. (a) is the database wall; I recommend it.

**Minors (Should)**
5. EXPIRED is accepted before the expiry (P5: day 0). *Fix:* `CHECK (status <> 'EXPIRED' OR ended_at >= expires_at)`. The caller's clock sets `ended_at`, so the injected clock still works.
6. Six wrong codes with no lock are accepted (P9) (migration.sql:194-197). *Fix:* add `AND (code_failures < 6 OR locked_until IS NOT NULL)`.
7. Evidence `consent_text_version` can differ from the signers' (P7: v9 against v1) (:329-331). *Fix:* the evidence trigger refuses when any signer's `consent_text_version` differs.
8. DECLINED needs no signer with `declined_at` (P6) (:268). *Fix:* require one, or record that DECLINED is also the firm's own move.
9. Some test lines pass for the wrong reason, so removing the rule would not turn them red. tests/check_fo6_signing.ts:145 changes `expires_at` on SIGNED `e1`, which is refused as "final", so immutability is never exercised. Use a live request (I checked that the rule itself holds). :131 is caught by `signed_check`, not by the "signed signer does not change" branch (:309); change `code_failures` on a signed signer of a live request instead. The viewed-written-once rule and "signer added to a VIEWED or CLIENT_SIGNED request" have no fail test. :121 matches either the trigger or the foreign key, so it proves the wall only through the trigger.
10. Deadlock note for part 2: a signer UPDATE locks the signer, then the request (:294); a request UPDATE followed by a signer UPDATE takes them in the opposite order. *Fix in the API:* always `SELECT … FOR UPDATE` the request first.
11. MODULE.md:33 says an email address is stored "only as its sha256", but there is no email column at all. *Fix:* "no email address, code or link token is stored in clear (codes and link tokens only as sha256; the address is read from fo_person)".
12. The PR title still says "SigningPort and its fake", and the body has no "Done when" (`pr-rules` red). Update both before asking for the label.

## Plain uuids for document_id, document_version_id and person_id
Reasonable. A foreign key into `fo_retainer` or `fo_person` would need a back-relation line in another area's file, which P-600 (b) rules out. Prisma would also report a foreign key that exists only in SQL as drift. And one column naming different tables per kind (FO-6d's OTHER) cannot carry one foreign key. The cost is that the firm wall for those three columns lives in the API. Part 2 needs fail tests for: firm A's request naming firm B's retainer, version or person → refused; and a version id that does not belong to the document id → refused. Optionally, a trigger could check `fo_retainer (firm_id, id)` and `fo_retainer_version (firm_id, id, retainer_id)` for RETAINER and CONSULTATION. That reads another area's table without editing its file.

## P-600 conditions
(a) Own file and own folder: met. (b) Adds only: met. The platform.prisma change is two new back-relation lines under a new "signing (FO-6)" slot comment, the same pattern FO-5 and FO-13 used. The test checks that there is no ALTER, DROP or UPDATE outside its own tables. (c) Every function and trigger is prefixed `fo_signing_` (tested). (d) Stamp `20261116190000` is later than main's newest, `20261116030000_fo7mv_move_list`, and unique. The test measures right after its own migration and never assumes it is newest (rows rev 16.7). (e) The Lead's read of the diff before the label is not mine to check. The data-kept test (demo copy, cases, audit, firms and staff) and `migrate diff` (empty on both copies) pass.

## Screen-review frame (schema step, no screen)
D1-D20 and BIC-01-20: N/A (no page, no route). The D5 equivalent (code correctness, concurrency, duplicates under race, whether a test fails when its rule is removed) is covered by Majors 1-4 and Minor 9. D17 and D20: simulated only. Retrofit mapping: N/A.

## Journey test (reviewer role, data layer; the only journey score for this check)
There are no UI journeys yet, so I walked the API's future writes as SQL: (1) send: 2 clients + firm → each signs → evidence → SIGNED: holds. (2) expire with no client signature: holds; early expiry also accepted (P5). (3) decline: holds. (4) Send updated version: cancel UPDATED, then a new live request: holds. (5) wrong firm, by staff and by request key: refused. (6) break it: zero signers, no firm signer, late signer, duplicate provider id across firms, evidence/cancel race: all accepted (Majors).
| Criterion | Score | Evidence |
|---|---|---|
| task completed | ½ | the main path holds; SIGNED reachable without the firm (M1) |
| next step obvious | N/A | no UI |
| plain words | 1 | errors are plain ("the firm signs last, after every client") |
| feedback and state | 1 | named errors and codes per rule |
| correct data | ½ | CANCELLED with evidence (M3); a late signer (M2) |
| error recovery | 1 | refusals leave state unchanged (test :125) |
| accessibility and screen sizes | N/A | no UI |
| speed | 1 | suite in about a minute; indexes are firm-first |
| visual quality | N/A | no UI |
| trust and sources | 1 | Sample and "Unconfirmed: no counsel" labelled in the file header |
**Score: 6/7 applicable = 8.6/10 scaled; no 0.** Applicable-criteria pass, but the Majors above block. What I could not test: anything behind the API (part 2), a real screen reader, an intended user's walk.

## Round 2 (diff only, P-277): `77883fca7..fb8a5706566330e221a45870360c553e35600afa`
**Reviewer: Changes requested fb8a5706566330e221a45870360c553e35600afa.** **Verdict: Block** on one new Major, which the M3 fix introduced.
* Suite: **46 passed, 0 failed**. I re-ran the round-1 probes on a fresh copy (every migration plus the Sample firms; dropped afterwards). P1, P3, P4, P5, P6, P7 and P9 are now refused. P4's lookup returns 1 row. P10 and P11 still refused. P8: a fully signed request with no evidence can still be cancelled; that is the intended design.
* **M3 race checked with two sessions, both orders.** (A) T1 inserts evidence and holds for 3 s; T2's cancel **waits** (2.0 s), then is refused with "the evidence is stored; only SIGNED follows". Final: CLIENT_SIGNED with 1 evidence row. (B) T1 cancels and holds; T2's evidence insert waits, then is refused. Final: CANCELLED with 0 evidence. M2 under a race: T1 signs a client and holds; T2 inserts a late client, waits, then is refused. M1, M2, M3, M4 closed. m5 to m11 closed. m12 is reported done on the PR (I did not re-check CI).

**Major (Must), new**
R2-1. **A clients-only request with evidence is stuck forever and blocks its document.** `migration.sql:349-352` (the evidence gate) does not require the firm signer, but SIGNED does (M1), and since M3 only SIGNED may follow evidence (:270). Probe P2: one client signed → CLIENT_SIGNED → evidence **accepted** → SIGNED refused. Then cancel was refused ("only SIGNED follows"), adding the firm signer was refused (the request is not SENT), and a new request for the same document was refused (`fo_signature_request_one_live`). The document can never be signed, sent again or ended, and nothing may be deleted. `tests/check_fo6_signing.ts:159` builds exactly this state and counts it as a pass. *Fix:* in `fo_signing_evidence_write`, refuse unless a FIRM signer with `signed_at` exists (the same condition SIGNED uses at :285). Change test :159 to expect the evidence insert on the clients-only request to be refused.

**Minor (Should)**
R2-2. `tests/check_fo6_signing.ts:176` "proves" the M3 lock by matching the migration's text against a regex. It would not catch a wrong lock mode or a lock taken after the checks. *Fix:* replace it with a two-connection check (as above: hold the evidence insert in one transaction, run the cancel from another, assert it is refused after waiting), or record it as a known limit.

Journey re-score (data layer): correct data is still ½ (R2-1), the rest is unchanged. **8.6/10 scaled, no 0; blocked on R2-1.**

## Round 3 (diff only, P-277): `fb8a57065..cc5e2ea14a4be7debc81b9e43694bde364738693`
**Reviewer: Approve cc5e2ea14a4be7debc81b9e43694bde364738693.** **Verdict: Approve.** No open Blocker or Major. (7938d7d4c in between is this file only.)
* Suite, run twice: **46 passed, 0 failed** both times. The two-connection race line passed both runs.
* **R2-1 closed.** `fo_signing_evidence_write` now also needs a FIRM signer with `signed_at` (migration.sql:351-353). I re-probed P2 on a fresh copy (every migration plus the Sample firms; dropped afterwards). The evidence on a clients-only CLIENT_SIGNED request is refused, and that request then cancels (it is not stuck). Every state that has evidence can now reach SIGNED, because the evidence gate holds the same conditions SIGNED needs. Round-1 probes P1, P3, P4, P10 and P11 are still refused.
* **R2-2 closed.** `tests/check_fo6_signing.ts:179-189` now uses two connections. It would go red if the lock were removed: in round 1 the cancel did not wait and succeeded. It would also go red if the "only SIGNED follows" check were removed: the cancel would wait, then succeed. My own two-session race, both orders, agrees: evidence then cancel ends CLIENT_SIGNED with 1 evidence row; cancel then evidence ends CANCELLED with 0.
* Note, not blocking: the race test gives the holder 700 ms to insert. On a very slow runner the cancel could run first and the line goes red. That would be a false red, never a false green, so I am not asking for a change.

Journey score (data layer): correct data back to 1. **7/7 applicable = 10/10 scaled, no 0.** Not checked: CI at this sha, the API (part 2), and the fail tests part 2 owes for the plain uuids (firm A naming firm B's retainer, version or person).

## Round 5 (diff only, P-277): `ad09eb2da..c78e84f70a7e90fb40ce224c7edb337014cae8e8` (Devin's review)
**Reviewer: Approve c78e84f70a7e90fb40ce224c7edb337014cae8e8.** **Verdict: Approve.** No open Blocker or Major.
* Suites at this head: `check_fo6_signing.ts` **47 passed, 0 failed**. `check_pf12_walls.ts` (`tsx --tsconfig api/tsconfig.json`) **100 passed, 0 failed**. I read the blank-line change with `git diff -w`: whitespace only, and `migrate diff` stays empty in the suite.
* **The no-op update fires `fo_signing_request_write`. That is safe, and it is not recursive.** The status is unchanged, so on a live request the trigger returns at the same-status branch, before the evidence and move checks. On a final request it raises "is final" first, which gives the same refusal as before. Only the error text changed, and test :144 allows it. `fo_signing_request_write` writes nothing, so no recursion. `updated_at` is not touched.
* **The REPEATABLE READ fix works, and the new test fails when the fix is removed.** I ran it on a scratch copy. At head, the RR cancel holding a snapshot older than the evidence got "could not serialize access due to concurrent update"; the request ended CLIENT_SIGNED with 1 evidence row. I then swapped in round 3's `FOR UPDATE`-only evidence trigger (on the scratch copy only): the same RR cancel succeeded and left **CANCELLED with 1 evidence row**. Devin's finding was real. Every signer write now updates the request row too, so a stale RR request move (expire, CLIENT_SIGNED) also fails to serialise instead of acting on old reads.
* **The walls do not break the triggers' reads across rows.** As `xr_app` (not BYPASSRLS) with `app.firm_id` set to firm A, I ran the whole flow. That included a 3-row signer INSERT in one statement (the shape Prisma's createMany sends) and a 2-row signing UPDATE in one statement. Send, both clients sign, CLIENT_SIGNED, the firm signs, evidence, SIGNED and a receipt all passed. Firm B then saw 0 requests and 0 signers. Firm B writing a signer naming firm A was refused by the RLS gate. Firm B naming A's request id under its own firm id was refused by the trigger: the definer's update matches (B, id), finds 0 rows, and refuses. The definer functions run as `xr_wall_reader` (BYPASSRLS, table rights through `xr_data`, as PF-12 set for its 65 functions). Their update is keyed by `NEW.firm_id`, which `0_pf12_firm_first` has already checked: it fires first by name order. `xr_app` cannot delete, cannot set `session_replication_role`, and cannot call the functions directly.
* Deadlock: no new cycle. The no-op update takes the same request-row lock the earlier `FOR UPDATE` took, in the same order (signer row, then request). The opposite order is still possible from an API that updates the request first and then a signer; round 1's note 10 still applies to part 2.

**Notes for part 2 (not findings here)**
* Under REPEATABLE READ, two signers of one request writing at the same time now fail to serialise, by design. Keep the signing door at READ COMMITTED or retry on 40001.
* The P-600 (3) prefix check does not match quoted trigger names, so it skips PF-12's per-table `"0_pf12_firm_first"`. That name is PF-12's own (as in fo7mv) and cannot clash, so it is acceptable.

Journey score (data layer): unchanged, **10/10 scaled, no 0.**
