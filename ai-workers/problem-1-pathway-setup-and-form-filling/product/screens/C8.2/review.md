# Review: C8.2 filing record, slice 1 (runtime lane, M3-F), branch `claude/admiring-galileo-i2ece1`

**Reviewed commit 22f3f2ab** (the head moved during the review). Delta from 3de54f44: Devin's #553 fixes (CASE_ENTITIES, the transaction, the contract moved to `contracts/`). 3de54f44 was code c8dfef53 plus a records-only SH3 append. Diff: `git diff origin/main...22f3f2ab`. The reviewer did not build this. 2 Nov. No UI, so code and tests are scored. Summary: **Block, 2 Major** (see the end).

**What the row claims:** AG-7-95 (AG-07 v3.12). The application number on each filing (`Filing.applicationNumber`, no migration); the UCI read from the person's own `person.uci` answer; one case = one filing for now.
**Out of scope, on purpose:** pack 4's `acceptance/C8.2.test.ts` (AG-7-31 submission per group; waits for L-SA3, held); UCI format (an open question).

## Runs (own copy `runtime_c82r` on :4439, fresh database each time; never :4400 or 4433; US$0)
* `check_c82_filing_numbers.ts`: **7/7**.
* `check_c82_filing_record_api.ts`: **18/18** on the first copy, **20/20** at 22f3f2ab on a fresh copy. The step count matches the committed check, not the uncommitted 21-step version (see "Could not check").
* `graph.mjs`: G1 0 · G2 0. Both new routes are tested by `check_c82_filing_record_api.ts` (it names C8.2 and C6.11); no pages (no UI, by design).

**Reviewer probes on 22f3f2ab (curl and psql):**
* Access: GET by another firm (`user-S`) 404 · configuration author 403 · no person header 401 · representative 200 · PUT with a non-uuid or unknown id 404.
* Bad input: missing `before` 400 · a number as `value` 400 · 50 characters 400 · en dash inside the number 422 · a tab or newline inside it is normalised and saved.
* Race: 8 parallel PUTs with the same `before` gave one 200 and seven 409s, one stored value, one audit line.
* Inactive filing (set by SQL): PUT 409 (even with a bad body); the filing is left out of GET.
* Firm isolation: a case moved to `sample-solo` was not named in `sample-firm`'s duplicate warning, and the reverse held. Activity feed: `user-S` sees 0 application-number lines, `user-R` sees 6.
* `api.log`: 0 matches for any `W\d{8,9}` number or the UCI. Speed: GET 17–28 ms, 4 queries, no per-row request.

## Judged against the ask
1. **AG-7-95 rules.** Each claimed rule has a passing and a failing test.
   * **r1 holds:** upper-case, spaces and hyphens removed; refused (422) with the shape and an example; nothing saved (`engine/runtime/filing-record.ts:12-16`). The pattern is anchored `^…$` (the card has `\b…\b`): right for one normalised value; `\b` is the AG-10 matcher's.
   * **r4 holds:** the warning names the case and the number is saved; the query is limited to the firm (`api/src/filing-record.ts:51`). The cross-firm case is untested (**M2**).
   * **r7 holds:** set, change and clear; audit `detail` keeps before and after; number and audit line in one transaction (`:56-64`); the stale `before` gives 409 before the write and as the `updateMany` lock (race probe).
   * **Safety holds in part:** no number in summary words, error words or `api.log`; no notifications in this slice. But a typed name decides which firm's feed shows the audit line (**M1**).
2. **Permissions:** officer only (`reach(…,"officer")`). Client: 403 on PUT and GET (tested). Another firm: 404 on PUT (tested) and GET (probed). Stale `before`: 409 (tested). Inactive filing: 409 and left out of the record; the probes hold, but **untested (m1)**.
3. **UCI:** read from the applicant's current `person.uci` answer (`supersededById` null, `rowKey` null, keyed by the filing's applicant subjects) and never written here. The checks show it on the spouse only, with one current answer row.
4. **AGENTS rule 4:** `samples/filing-numbers.json` is labelled "Sample: the team's requirement … not an IRCC source; the immigration expert confirms", and the unit check pins that label. The same sentence is returned in the API (**m3**).
5. **Silently wrong against AG-7-95:** mainly **M1**, plus m2 (wording) and m4 (a country key in code). Rules 2, 3, 5 and 6, and the UCI half of rule 4, are not in this slice, and the commit message names only the UCI read. The PR should list them as not built (**m6**).

## Findings
**Major**
* **M1. A person's name can move the audit line to another case in the activity feed** (security, C6.11; `api/src/filing-record.ts:63` with `api/src/studio.ts:1042`).
  * The summary puts `${person}` (a typed participant label) before `(case <8 of id>, …)`, and the feed's filter takes the first `/\bcase ([0-9a-f]{8})\b/` match.
  * A participant named "Sample case ffffffff" hides the line from the own firm. A name carrying another firm's case prefix shows that firm the line, with its `detail` before and after (both government numbers).
  * Found by reading the code. The builder's uncommitted change (15:48) puts the marker first ("On case <8> (<ref>): …") and adds a check with that name. That is the right fix: commit it, then re-review that delta.
* **M2. The firm filter in the duplicate warning has no failing test** (STANDARDS §3.10 and §7; `api/src/filing-record.ts:51`).
  * Remove `case: { firmKey: c.firmKey }` and all 20 checks still pass: the r4 cases use two cases of one firm (`tests/check_c82_filing_record_api.ts:59`).
  * Every demo firm shares one workspace, so that regression would name another firm's case reference to this firm.
  * Fix: give a `sample-solo` case the same number and assert `warning === null` for each firm. The probe shows the code holds today.

**Minor**
* **m1.** The inactive-filing guard (`:44` and the `active: true` read) is untested. Add the 409 and the left-out check (SQL `active=false`, as in the probe).
* **m2.** A duplicate on a sibling filing of the same case (inactive ones count, on purpose: rule 6, AG16-60) gives "Already on case <this case>.", which points the officer at the case they are in. For the same case, say "Already on another filing of this case (<person>)". The inactive count stays as the builder chose.
* **m3.** `basis` is returned in the GET response (`:32`). Its words name the regulator ("IRCC") and a PR process step ("an ASSUMPTIONS row is proposed … in the C8.2 PR"): product text under AG-7-95 Rule 7. Return a product label (for example "Sample pattern; the immigration expert confirms") and keep the full basis in the file.
* **m4.** The `person.uci` key is hard-coded (`:17`) and the response field is named `uci`: a country-specific key in code, while the pattern is data (STANDARDS §3.1; AG-7-95 §7 "pack-named"). Put the key in `samples/filing-numbers.json` next to the pattern.
* **m5.** A missing `before` gives zod's default "Invalid input: expected string, received undefined" (`contracts/filing-record.ts:9`). Give it plain words, as `value` has.
* **m6.** The PR body should list what this slice does not build (item 5 above).

## D1–D20 (only what this slice moves)
* **D1 4:** r1, r4 and r7 match the card; unbuilt rules not listed (m6) · **D2 4:** normalised; one race winner; one transaction with its audit line.
* **D3 4:** UCI read, not copied; shared contract · **D5 5:** stale save gives 409 with recovery words; nothing half-written.
* **D6 3:** audited before and after, but the feed placement can be spoofed (M1) · **D10 3:** m2, m3, m5 · **D15 5:** under 30 ms, fixed query count.
* **D16 3:** the claimed rules pass and fail, but the firm filter (M2) and the inactive guard (m1) can be removed with all checks passing · **D18 4:** Sample labelled.
* Not applicable (no UI, no AI): D7–D9, D11–D14, D19. D17 and D20: simulated only.

## Journey score (reviewer, code and API; no UI): 8 / 10, pass by score
Journeys: (1) the officer reads the record, then adds, changes and clears a number; (2) errors: a form code, a stale read; (3) wrong role: client, author, another firm; (4) recovery: re-read and save again, a double save race; (5) hand-off: the number ready for AG-10 and AG-7-31.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Set, change and clear, with the record re-read |
| Next step obvious | 1 | 409 and the empty record both say what to do next |
| Plain words | ½ | m3, m5 |
| Feedback and state | 1 | Warning returned; 422 shows the shape and an example |
| Correct data | 1 | One value; one audit line per change; race-safe |
| Error recovery | 1 | Stale save: nothing written, re-read works |
| Accessibility and screen sizes | ½ | Not applicable, no screen |
| Speed | 1 | 17–28 ms |
| Visual quality | ½ | Not applicable, no screen |
| Trust and sources | ½ | Sample labelled, but the audit line's firm can be spoofed (M1) |

## Could not check
* The uncommitted working-tree changes (another session, 15:48) are not reviewed.
* `run-suites.sh` for the whole set: only the 2 C8.2 suites were run. The `studio.ts` CASE_ENTITIES change is additive, but the other activity checks were not rerun.
* Pre-existing, not this PR's (for the tech lead to note): people with the configuration `review` duty read every case line, including number details (`main.ts:94`).

**Verdict: Block** (commit 22f3f2ab). Fix: **M1** (commit the marker-first summary and its check); **M2** (add the cross-firm duplicate-warning check). Recommended in the same push: m1–m6. Re-review only the delta.

## Round 2 (64f39903), 2 Nov
**Scope:** `git diff 22f3f2ab 64f39903`: `api/src/filing-record.ts`, `api/src/studio.ts` (feed `detail`), `contracts/filing-record.ts`, `engine/runtime/filing-record.ts`, both C8.2 checks. The breaker's `break-report.md` was read alongside.
**Runs (own copy `runtime_c82r` on :4439, fresh database; US$0):** `check_c82_filing_numbers.ts` **9/9** · `check_c82_filing_record_api.ts` **24/24**. Copy stopped afterwards.

**Fixes**
* **M1, closed.**
  * The summary now starts with the marker: "On case <8> (<ref>): …" (`filing-record.ts:66`). The feed's first-match regex therefore always takes the case's own marker, even when a typed person name or case reference reads "case ffffffff".
  * The new check (principal "Sample case ffffffff") fails with the old order.
* **M2, closed.**
  * A `sample-solo` case saves a number firm A already uses: warning null, and none of firm A's references in the body.
  * Removing `case: { firmKey }` makes that check fail. Confirmed by reading the code: the solo firm would get "Already on case <A's ref>".
* **Breaker M1, closed.** The feed returns `detail: null` for "application number" lines (`studio.ts:1047`).
  * Probe: user-A, user-B, user-O and user-S get 6, 6, 5 and 1 lines; 0 with detail; 0 with a number in the summary.
  * The audit row still keeps before and after (the check reads it in SQL).
* **m1, closed:** the inactive filing gives 409 with nothing saved (tested, then restored).
* **m2, closed:** a sibling on the same case gives "Already on another filing of this case." (probed). When the number is also on another case, that case's reference follows.
* **m5, closed:** a missing `before` gives "Send "before": the number you read, or null when there was none."
* **Breaker minors, closed:**
  * `before` is normalised: `""` counts as none, and " w22-3456789 " matches W223456789 (probed, 200).
  * The 200-character cap applies first; the 20-character limit is checked after spaces are removed, so a padded valid number saves (probed).
  * "ſ123456789" is refused with 422 before upper-casing. The unit check covers ſ, ı, ﬀ and fullwidth letters.
* `api.log`: 0 numbers.

**Still open (Minor, listed in the PR, accepted as follow-ups):**
* m3: the `basis` words in GET name IRCC and a PR step.
* m4: the `person.uci` key is hard-coded.
* Breaker m6: the id-existence oracle. Another firm gets "No such case." for a real filing and "No such filing." for an absent one (probed); low risk with uuids.
* Breaker m1 (inactive filings count as duplicates) is kept on purpose (rule 6, AG16-60). It is now worded clearly for the same case.

**Scores moved:** D6 4 (feed placement no longer spoofable; numbers never in the feed) · D10 4 (m3 left) · D16 4 (firm filter and inactive guard now fail when removed). **Journey score: 9 / 10, pass.** Trust and sources rises to 1 (M1 fixed); plain words stays ½ (m3).

**Verdict: Approve** (commit 64f39903). No open Blocker or Major. Minors m3, m4 and breaker m6 stay listed in the PR as follow-ups.
