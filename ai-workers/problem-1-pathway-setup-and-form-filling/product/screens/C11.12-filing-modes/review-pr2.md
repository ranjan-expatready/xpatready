# C11.12 filing modes, PR 2 of 3: independent review (reviewer, 2 Nov)

**Commit reviewed:** `1c47a293` on `local/c1112-pr2`. Only PR 2's own change, `git diff 92e25d3d 1c47a293`, was judged (92e25d3d is PR 1, #445).
**Copies:** :4441 (`xr_studio_revpr2`) and :4442 (`xr_studio_revpr2b`). Never :4400. Live AI off, US$0.
**Design read:** concept r2 §2, §3 (BR-4, BR-6, BR-10), §6, §6b; challenge B1, M1–M4, m1, m2; decision P-233.
**Journey report:** `journey-test-reviewer-pr2-2026-11-02.md`. **Journey score 7.5 / 10** (below the pass of 8; no criterion at 0).

## Verdict: Ship after fixes (two Majors, both small)

## What I re-ran
| Check | Result |
|---|---|
| `check_c1112_prepare_api.ts` (:4441, fresh copy) | 16/16 |
| `check_vv_filings.ts`, `check_vv_prepare.ts`, `check_c1112_modes.ts` | 46/46, 32/32, 39/39 |
| `acceptance/C6.12.test.ts` (:4442, after `setup_visitor_visa` and `setup_vv_m3`) | 24/24, including the amended C6.12-3 |
| `tsc -p api/tsconfig.json` | no error in any file PR 2 touches |
| Live probe on :4441: Visitor visa released with Child Declared only and Sponsor Files the sponsorship 1..1 | see below |
| Engine probe: 4 people, ages 40/40/10/15, children On the principal's | see M1 |

**Live probe:** a child added without `applies` starts not travelling (BR-6); 8 parallel first reads all 200 with the same filing ids (2 filing rows, 3 applicant rows, 1 group, 0 duplicate items); the sponsor's switch gives 422 "The sponsor's application is always sent with the principal's."; splitting either filing of the co-filed group gives 409 and the group count stays 1; a switch raced against 6 reads keeps the ids and 3 applicant rows, mode `declared_only`; a read takes 68–96 ms.

## Issues (ranked)
**Major M1. A fee line for someone on the principal's filing does not say whose line it is.** Must fix.
- `engine/runtime/filings.ts:369` (inside the hunk at `:363–369`): a line covered by the family maximum gets `payer: lead.who.subject`. `FeeLine` (`contracts/runtime.ts:233`) has no field for the person, so that applicant's line is lost.
- Engine probe: the 15-year-old's biometrics line reads `filing-s-0 · payer s-0 · 0 · "Covered by the family maximum on principal 0's filing"`. It cannot be told apart from a second line for the principal.
- `api/src/case-prepare.ts:166`: the stored view's `fees[].subject` now comes from the filing's owner. Before this PR, the filing's person was also the payer. Live: both Visitor visa lines on the principal's filing carry `subject` = the principal.
- Existing readers filter fee lines by `f.subject === <person>`: `acceptance/C6.12.test.ts:77`, `tests/check_vv_prepare_store_api.ts:74`, `tests/check_vv_prepare_api.ts:74`. For a person on the principal's filing these checks now pass vacuously. "No fee for a person not travelling" can no longer catch a regression there.
- Concept BR-10 asks for "one line per applicant" and "age exemptions per person".
- **Fix:**
  1. Add `person` (the applicant's subject) to `FeeLine` and set it on every line.
  2. Map the stored view's `subject` from `person`, never from the filing owner.
  3. Keep `payer` as the person who pays.
  4. Add a capped case with on-principal children (ages 40/40/10/15) asserting that every line names its own person.

**Major M2. A combination with no fee rule still returns a money total of 0.** Must fix.
- `filings.ts:381`: `total_cents: totals.reduce(...)` gives `total_cents: 0` with `totals: []`. Probe: `fs.outside` gives `{"label":"One submission for 3 people", …, "totals":[], "total_cents":0}`.
- BR-10 and the contract note at `contracts/runtime.ts:223` both say "never CAD 0", but any reader that formats the group total shows "CAD 0".
- The test at `check_vv_prepare_store_api.ts:600` only searches strings for "CAD 0", so it misses the number.
- **Fix:** when `fees_worked_out` is false, set `total_cents: null` (type `number | null`), or leave the field out, and give the group the `fees_why` words. Extend the test to the numbers.

**Major M3. Four new server rules have no test, so removing any of them breaks nothing** (STANDARDS line 46 [M]; D16). Must fix. All four behave correctly in my live probe; only the tests are missing.
1. The split refused for a co-filed group (`case-prepare.ts:234`).
2. The sponsor's travelling switch refused with 422 (`runtime.ts:196–198`). This is concept BR-6's own fail example.
3. Declared only starting as not travelling in `addPerson` (`runtime.ts:187–188`).
4. A new sponsorship placed in the principal's stored group (`case-prepare.ts:104–105`).
- **Fix:** a pass and a fail case for each in `check_c1112_prepare_api.ts`. The probe on :4441 shows the setup works: Sponsor 1..1 `co_files` on the Visitor visa as Sample, or `fs.outside`.

**Minor m1.** The C6.12-3 amendment (`C6.12.test.ts:22`) is right. The old check (`applicants[0].mode === "files_own"`) contradicted `FilingApplicant.mode`. The amendment is still not recorded in `acceptance/PACK-4-visitor-visa.md`; record it there once the Lead agrees (#445).

**Minor m2.** The fee property in `check_vv_filings.ts:120–134` generates only default modes (STANDARDS line 47 makes a property test [M] when the engine changes). Add random `on_principal` and `declared_only` modes, asserting:
- the people counted equal the applying people;
- each person has exactly one line per fee rule;
- the lines add up to the group total.

This property would have caught M1.

**Minor m3. Words.**
- `filings.ts:377`: "One submission for 4 people" counts the declared-only child and the sponsor (live probe).
- `filing-modes.ts:96`: "No principal applicant on this case yet" is shown when the principal exists but is not travelling. The API cannot set a principal to not travelling, so this is unreachable today.
- With the principal not travelling, a sponsorship would be "One submission" on its own. Also unreachable today.

**Minor m4.** `versionOf` (`case-prepare.ts:369`) does not include the applicant rows. An applicant-only change does not move the version a split is checked against. Today the forms come and go with the mode, so the items move the version anyway.

**What holds:** on-principal and declared-only people are applicants on the principal's filing, never their own; fees per paying person with each person's age; no fee line for declared only; a sponsorship sits in the principal's group, which cannot be split. `releaseModes` is the one reading for `…/prepare` and `…/filings` (m2); B1's stored Representative `files_own` is dropped. The sync upserts and compares applicant rows, writes nothing on an unchanged re-read, keys ids by owner, and old rows compare equal (no write on the first read after deploy). The migration is the two check widenings only, after `20261102140000_c64_document_storage` on main, with a sound rollback in its header; pre-C11.12 code writes only values both checks accept. Sponsor `co_files` in `programs.json fs.outside` follows concept §6.

## D1–D20 (PR 2's change)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | BR-4, BR-6, BR-10 behave live; M1 and M2 leave gaps in BR-10 |
| D2 Data integrity | 4 | No duplicates under parallel reads or a raced switch; checks refuse other modes; fee `subject` is misattributed (M1) |
| D3 Reuse | 5 | One plan (`filingPlan`) for the preview and the case; one `releaseModes` |
| D4 Rule integrity | 4 | Modes that cannot hold are dropped; unreachable "sponsorship alone" (m3) |
| D5 Stability | 5 | Same filing ids across the travelling switch and re-reads |
| D6 Governance | 4 | Audit line on the travelling switch unchanged; Sample labelled |
| D7 AI trust | n/a | No AI in this PR |
| D8–D14 | n/a | No screen in this PR (PR 3) |
| D15 Speed | 5 | 68–96 ms a read; writes only on change |
| D16 Testability | 3 | Four server rules untested (M3); the property misses modes (m2) |
| D17 First use | simulated only | No screen |
| D18 Provenance | 4 | `basis` and `fees_why` say Sample and "not worked out"; a capped child's line names no person |
| D19 Closure | 4 | Release → case → Prepare holds for on-principal and declared-only people |
| D20 Pain and wow | simulated only | |

**Retrofit mapping:** none needed (no screen). **Graph:** `graph.mjs` was run; C11.12 is named by 12 tests. PR 2 adds no page or route, so nothing new is untested there.

**Not checked:** an upgrade of a database already holding pre-C11.12 rows (code path read only; copies started fresh); pack 4 in full (builder's run matching main relied on; my `setup_vv_m3` re-run failed 4 lines not about filings: signer check, gates version, `PUT /library/fees`, approval); `C11.12.test.ts`; a real screen reader and an intended user's walk.

**Verdict: Block.** Fix M1, M2 and M3 (Minors optional), then re-review on the new commit.

## Round 2 (re-review on `61f168b7`; code identical at `5c922635`, which adds only `break-report-pr2.md`)
Fix delta read: `53604e3c` (engine, api, contracts, tests, migration header). The merge of PR 1's head and main was not judged. Copy :4443 (`xr_studio_revpr2r2`, fresh). US$0.

**Re-run:**
- Pure suites: `check_vv_filings` 52/52 (both properties included), `check_vv_prepare` 32/32, `check_c1112_modes` 39/39.
- `check_c1112_prepare_api` 26/26. The 27th line, "setup: released by setup_visitor_visa", runs only on a copy with no release.
- `tsc`: no error in any touched file.
- `total_cents` has no reader outside the engine and the tests.
- One environment note: my first two runs on :4443 hit ECONNREFUSED because the copy I had started had stopped. After `isolated.sh … restart`, the run was clean.

| Round 1 | Round 2 | Evidence |
|---|---|---|
| M1 fee line names no person | **Closed** | `FeeLine.person` set on every line. The stored `fees[].subject` is the person: live, 6 lines with 6 distinct (line, subject) pairs, and the child's line names the child. The covered line reads "paid by <payer> on <owner>'s filing". Tests: "review M1 pass/fail" and the random-modes property, keyed by person. |
| M2 a 0 total where fees are not worked out | **Closed** | `total_cents: number \| null`, null when there is no fee rule. "review M2 pass/fail". A sponsorship on a combination with fees says `fees_worked_out: false` with words, and keeps its numbers for the other lines. |
| M3 four server rules untested | **Closed** | Each rule now has a pass and a fail: the Declared only start, the sponsor stored not travelling, `co_filed` in the principal's group, the 422, the 409 for both the sponsorship and the principal's filing. The spouse's own filing still splits (200). |
| m1 C6.12-3 edit not recorded | Closed | `PACK-4-visitor-visa.md` "Edits to the tests" |
| m2 property without modes | Closed | 300 households with random spouse and child modes |
| m3 words | Closed | "One submission for N people applying" counts only people applying. The no-filing reason is in words. |
| m4 version without applicant rows | Open, Minor | Accepted in the PR. Items still move the version today. |

**New, Minor:**
- **n1.** A group holding a sponsorship says `splittable: false` (`filings.ts:116`). The server now lets the spouse's own filing split out of it (`case-prepare.ts:240`; live 200, break m5). The flag and the server disagree. No web reader exists yet. Fix before PR 3 reads it, either with a per-filing `splittable` or by making the group's flag true when another own filing exists.
- The breaker's 8 and 9 stay as Minors, as stated in the PR: a channel choice from PR 1 dropped on the move, and a principal marked not travelling, which no API can set.

**Journey score round 2: 9 / 10.**
- Correct data rises to 1 (M1, M2).
- Plain words rises to 1 (the covered-line words and the group count).
- Trust and sources rises to 1 (no 0 total, the sponsorship's fees said).
- Next step obvious stays at ½ and visual quality stays at ½: no screen until PR 3.

**Verdict: Approve** for `61f168b7` (code identical at `5c922635`). No open Blocker or Major. Minors m4 and n1 and the breaker's 8 and 9 stay open.
