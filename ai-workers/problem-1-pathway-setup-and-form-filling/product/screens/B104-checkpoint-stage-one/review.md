# B104 review: J7 Stage 1 on the configured checkpoint (PR #1084)

Reviewer: Opus, a separate session that did not build this. Commit **eab0f38da** (`git log -1 --format=%h`). Only this PR's own changes were reviewed: the merge of origin/main at 74aec1b58 touches none of its files. Sources: the BACKLOG row B104, P-351, J7 Stage 1, the tech lead's rulings on #1084, AGENTS, RULES, WAY-OF-WORKING "Every PR", STANDARDS. There is no `concept.md` (a loader step, not a screen), so concept fit is checked against the row's "Done when" line.

**Verdict: Block.** One Major is open (M1). Everything else holds up well, and the fix is small.

## What I checked, and what held
* **Services, duty, version.** Every write goes through a screen's own service as the author: `forms.setAccount`, `studio.saveForm` (`need(actor,"author")`), `EligibilityGates.put`. The account is saved over the account read (`from`); the gates at the version read (0); the signer saves send no `baseRevision` (m4). One audit line per step, by the Configuration author, read in the database: account "not set → APR Portal"; IMM 5257, 5707, 5476 changed; "2 gates, 4 officer's judgement lines".
* **Release 1 carries all three parts.** Snapshot read: `forms[].signed_by` set on the three lines, `combination.portal = APR_PORTAL`, `eligibility.gates` has 2. After the load the draft still matches the release ("In Release 1 · draft matches the release").
* **The other five are unchanged.** `stageOneOf` returns null for any key not in the file, so the loop over the six does nothing for them (B104-2). Packs (`runs/*/summary.txt`): no step goes pass → fail; C1.3 54/54 and C6.12 24/24 stay; C6.9 2/15 → 15/15, C8.2 11/12 → 12/12, C11.6 6 → 9, C8.1 0 → 2. I re-ran `check_c10_1_configured.ts` (38 PASS, exit 0) and `check_qa144_vv_release.ts` (30 PASS, exit 0) on my own copy (:4437).
* **Quotes checked against the local copies, each matches:** Guide 5256 (dcterms.modified 2026-03-31, the "less than 18 … parents or a legal guardian" sentence); IMM 5257 (09-2023) caption in `imm5257e.xfa-template.txt`; IMM 5707 Section C and its canada.ca page (modified 2024-06-21); IMM 5476 11-2025 and 11-2021 captions (pdftotext) and its page (2025-12-12); IMM 5257 SCH1 "must complete their own copy"; IMM 5409's three signers and its page (2024-08-23); IMM 5475's inventory boxes; IRM 0002 "both the applicant and their parent or legal guardian". VV-R01 and VV-R12 are canada.ca pages with no local copy; their quotes are word for word the `compliance-trace.md` rows already on main.
* **Signer choices.** Faithful: IMM 5257 → `parent_for_minor` (the resolver gives the principal for a child under 18, else the person); IMM 5707 → `person`. The four left unset are justified in the official words; no single signer value fits them. IMM 5476: m3.
* **Gates call within the ruling.** Through the service, not a new route; the route stays on its existing allow-list line, unchanged in this diff (`route-has-screen.mjs` exit 0). The PR claims Partial, not Works, for C6.9 and names B106. Gates are Sample ("(Sample)" labels); a Yes to convictions goes to review (C6.9-7 passes).
* **No data in code (P-319):** no combination key or form number in the new code; the values live in `samples/checkpoint-stage-one.json`.
* **Records and rules:** none of STATE, RULES, DECISIONS, BACKLOG, qa/CAPABILITIES, qa/BUGS changed. Explicit `any` 418, same as the base (`count-any.mjs`). `graph.mjs --check` exit 0; `tsc` reports no error in the new files. Live AI off, US$0, no model call.
* **The walk is honest about before and after.** `walk-main/walk.json` misses 1.2, 1.3a, 1.3b, 1.5, 2.3, 4.1a, 4.1b (account "Not set", "No eligibility rules yet"); the branch sees them. My own walk on a fresh copy (:4436) matched, plus axe, widths and keyboard (journey section below).

## Issues
**M1 (Major): the live step has no test that fails when it is removed, and its refusal rule has no test at all.**
* Rule: WAY-OF-WORKING "Every PR" (a pass and a fail test per business rule); screen-review check (5).
* `tests/check_b104_stage_one.ts` reads only the JSON and the guard. Untested: that the checkpoint sets signers, account and gates (`demo.ts:806`, `checkpoint-stage-one.ts:23-47`); that a refused step stays undone and is said; that "not a line of this combination" is said and nothing added (`:35`); that gates already saved are left alone (`:44`). The C6.9 and C8.2 packs are M3, so the merge queue's regression set (M2 Works only) does not run them: they are hand-run evidence.
* **Failing scenario:** delete `demo.ts:806`. Every CI suite stays green: `check_b104_stage_one.ts` passes; `check_c10_1_configured.ts` and `check_qa144_vv_release.ts` never read `signed_by`, `portal` or `eligibility`.
* **Fix.** Pass test: an isolated-copy check (or lines in an existing checkpoint suite) reading release 1's snapshot for the three `signed_by` values, `portal = APR_PORTAL`, 2 gates and 4 judgement lines. Fail test: `setStageOne` with a named form removed, or malformed gate content; that part refused in words, nothing else written for it, the rest unaffected.

**m1 (Minor, D10): engine keys in a person's dialog.** `checkpoint-stage-one.ts:27,37`. "What the loader did, step by step" reads "vv.single J7 Stage 1: filed through APR_PORTAL; IMM 5257 signed by parent_for_minor; … person_and_representative". Fix: `ACCOUNT_WORDS` and `signedByLabel` ("APR Portal", "A parent, for a minor").

**m2 (Minor): the guard's "a bad file sets nothing" does not hold for gate content.** The comment at `checkpoint-stage-one-data.ts:14-15` says it; `stageOneProblems` checks only the gates' cite, not their shape. Scenario: `"op": "eq"` → `"op": "equals"` at `samples/checkpoint-stage-one.json:68`. The guard passes; account and three signers are saved; `gates.put` refuses (400); release 1 is made without gates, the refusal only in the collapsed log ("refused: eligibility gates: …"). Not reported as done, so Minor. Fix: parse with `EligibilityGatesBody` and `checkGates` in the guard, or reword the claim.

**m3 (Minor, faithfulness): IMM 5476's signer value names a child under 18 as a signer.** `samples/checkpoint-stage-one.json:21-25`. `person_and_representative` makes the person sign: on the Sample family case, `GET /api/runtime/cases/<SAMPLE-VV-FAMILY-1>/prepare` gives "Child (Sample)" IMM 5476 with `signers: ["person","representative"]`. The cite itself quotes 11-2025's "Signature of applicant or Parent/Legal Guardian for a person under 18" and the page's "for yourself and your dependent children under 18". The value is what J7 1.2 asks, and IMM 5476's who and age are #1072's. Fix: say in the cite that the under-18 part waits for #1072's age 18, so the gap is recorded, not silent.

**m4 (Minor, D2): signer saves are not tied to the version read.** `checkpoint-stage-one.ts:37` sends no `baseRevision`; the Forms tab does (`forms.tsx:324`). "Over the version the person saw" holds for the account and gates only; a person's edit to the line during the load would be overwritten silently. Fix: send the newest row's `updatedAt` as `baseRevision`.

**m5 (Minor, evidence): one walk step is hard-coded as seen.** `walk-stage1-1440.cjs:78` records 1.8 as `true` without a check, so "14/14 seen" is 13 seen plus one note (4.1a and 4.1b do read the gates' result). Fix: mark 1.8 "not walkable (B106)", or count it with 4.1.

**m6 (Minor, D7, D18): IMM 5257 loses its "Picked by AI · Sample" chip on the checkpoint** (`walk-main/walk.json` 1.3b vs `walk/walk.json`). `saveForm` sets `origin: "HUMAN"`, as a person's Change does, so the behaviour is right. Fix: say it in the PR body; the demo loses a trust signal.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Signers, account and gates by product steps; form ages none, on purpose (ruling) |
| D2 Data integrity | 4 | Account and gates checked against the version read; signers not (m4) |
| D3 Reuse | 5 | Existing services and contracts (`SIGNED_BY`, `IRCC_ACCOUNTS`); nothing new defined |
| D4 Rule integrity | 4 | Gates resolve on the case (C6.9 15/15); IMM 5476 signer for a minor (m3) |
| D5 Stability and recovery | 3 | Refusals said, but half-set possible (m2); fresh load only |
| D6 Governance | 4 | One audit line per change, by the author |
| D7 AI trust | 4 | No AI; the 5257 AI chip is lost (m6) |
| D8 Orientation | 4 | Screens unchanged |
| D9 Flow | 4 | Case → Eligibility runs instead of refusing |
| D10 Language | 3 | Engine keys in the log (m1) |
| D11 Feedback | 4 | Step in the dialog log with done and refused; not a checkpoint row |
| D12 Visual | 4 | No new UI; Signed by column clipped in the table's own scroll at 1440 (pre-existing) |
| D13 Accessibility | 5 | axe clean on 4 states; 400/1024/1440 no page scroll; keyboard reaches account and Change |
| D14 Team look | 4 | Unchanged |
| D15 Speed | 5 | Step 0.1 s; eligibility run 115 ms |
| D16 Testability | 2 | M1 |
| D17 First-use | simulated only | |
| D18 Provenance | 3 | Cites in the JSON only; the screen says Sample, no source |
| D19 Closure | 4 | J7 Stage 1 → 2.1 → 4.1 by screens |
| D20 Wow | simulated only | |

## Journey test (reviewer role, skill `journey-test`; own Playwright script, isolated :4436)
* **J1 main, author:** Demo › Reset → Load the configured checkpoint (78 s). The dialog log lists the step. Forms tab: IMM 5257 "A parent, for a minor", IMM 5707 "The person the form is about", IMM 5476 "The person and the representative"; SCH1, 5409, 5475, IRM 0002 "Not set". The IMM 5476 editor shows the saved signer; the account picker shows APR Portal. Held.
* **J2 screen boundary, case officer:** open a case; "Filed through APR Portal: set by the combination"; Eligibility gives "Possibly eligible — needs 3 facts", four judgement lines, "(Sample)" gates. Held.
* **J3 wrong role:** case officer PATCH account → 403. Held.
* **J4 keyboard:** Tab reaches the account picker (36 Tabs) and Change IMM 5476 (36 more); Enter opens the editor. Held.
* **J5 sizes:** 400, 1024, 1440 px, no page scroll on Forms, case, eligibility; axe 0 violations on 4 states; one console error, my own 403 probe.
* **Data underneath:** one audit line per change; release snapshot correct (above).
* **Break-it:** malformed gate → half-set (m2); child under 18 named as IMM 5476 signer (m3); no duplicate writes (each step skips a value already set, `:26,36,44`).
* **Could not test:** a screen reader; 200% zoom (1024 px only); an intended user's unaided walk (D17, D20 are the founder's); a refused step live (needs a code edit).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2 |
| Next step obvious | 1 | Case → Eligibility runs |
| Plain words | ½ | m1 |
| Feedback and state | 1 | Dialog log, audit lines |
| Correct data | ½ | Snapshot right; m3 |
| Error recovery | ½ | m2; refusal path untested (M1) |
| Accessibility and screen sizes | 1 | J4, J5 |
| Speed | 1 | 0.1 s step, 115 ms run |
| Visual quality | ½ | Signed by column clipped at 1440 (pre-existing) |
| Trust and sources | ½ | m6; cites not visible on screen |

**Journey score: 7.5 / 10, below the pass mark of 8; no criterion at 0.** What would raise it, most valuable first: m1 (plain words), m2 (error recovery), m3 (correct data), m6 (trust).

**Verdict: Block.** To fix before Approve: **M1**. Fix if cheap: m1, m2, m4, m5. Record in the JSON or the PR: m3, m6.

## Round 2: diff-only, eab0f38da → c28c68923
I verified each fix myself rather than taking the builder's word. Isolated copy :4436, live AI off, US$0.
* **M1: closed.** Two new layers of tests, both checked by me:
  * **Live:** `tests/check_b104_checkpoint.ts` B104-L1…L9 reads release 1 for the three signers, the four unset forms, the gates (2 gates, 4 judgement lines, saved by the author) and APR Portal. It also checks that no other combination gets gates, and that a case opened on the release reads the portal and runs a check. My run on a fresh copy: 9/9 PASS. On main (`runs/live/live-main.txt`) it is 7 FAIL, exit 1, so removing the step fails it. Its usage line fits `run-suites.sh`, so CI runs it.
  * **Refusal paths:** the rules moved to `applyStageOne` behind `StageOnePort` (`checkpoint-stage-one-data.ts:36-78`), and B104-10…16 test them on fakes. I removed each rule in a scratch copy. Each removal turns exactly one test red:
    * the gates check run first → B104-11;
    * the retired-line check → B104-12;
    * the revision sent with each signer → B104-10;
    * skipping a value already set → B104-14;
    * leaving saved gates alone → B104-14;
    * saying a refused save → B104-13;
    * plain-word labels → B104-10.
* **m2: closed.** `gatesProblems` runs `checkGates` on the workspace's fields before any write (`checkpoint-stage-one.ts:34-41`). `"op": "equals"` now gives "The rule not a node of the closed 11-operator vocabulary", and nothing is set (B104-11). The step's own check skips the body schema's limits (at most 30 gates, 20 judgement lines), but `put` still applies them. The file holds 2 gates and 4 lines, so this is not a finding.
* **m1: closed.** The log now reads "filed through the APR Portal" and "signed by a parent, for a minor" (`throughAccount`, `signedByLabel`); B104-L2 asserts no engine keys.
* **m3: closed.** IMM 5476's cite (`samples/checkpoint-stage-one.json:23`) now says a child under 18 is listed as a signer until #1072's who and age land.
* **m4: closed.** Each signer is saved with `baseRevision` set to the newest row's `updatedAt` (`checkpoint-stage-one.ts:26-31`), as `forms.tsx` does. That is the token `sameRevision` compares, and L1 shows nothing was refused live.
* **m5: closed.** Step 1.8 is now recorded with `aside`, as a note, and the exit code no longer counts it. `walk/walk.json`: 13/13 seen, 1 note, no errors. `walk/walk.log` is git-ignored and not on the PR.
* **m6: still open (Minor, PR body only).** The PR body at c28c68923 still does not say that IMM 5257 loses its "Picked by AI · Sample" chip. No code change is needed.
* **Unchanged:** explicit `any` 418, same as the base; `graph.mjs --check` exit 0; `tsc` shows no error in the changed files; no records file or allow-list line changed.

**Round 2 journey score:** 8.5 / 10, now a pass with no criterion at 0. Plain words, correct data and error recovery each rise to 1; visual quality (pre-existing clipping) and trust (m6) stay at ½.

**Verdict on c28c68923: Approve.** No Blocker or Major is open. Still open: m6 (Minor), a line for the PR body.

## Round 3 (diff-only, merge 4003adfbc)
Scope: only what the merge of origin/main (bf12209f1; old base 74aec1b58) changes for B104. I ran my own isolated copy, `rv_b104` on :4446, with live AI off (US$0), and stopped it afterwards.

**1. Conflict resolution: clean.**
* `git show 4003adfbc -- api/src/demo.ts` keeps both sides' imports (`setStageOne`, `section-names.ts`) and main's `SET_UP_FROM_FORMS = new Set(Object.keys(FORM_SETUP))`. The old three-key constant is dropped.
* `git diff origin/main 4003adfbc -- prototype/studio/` lists exactly B104's five files plus demo.ts, and demo.ts differs by +3 lines: the import (demo.ts:42) and the comment plus the call (demo.ts:836-837).
* B104's five files are byte-identical to c28c68923, the commit approved in round 2.
* Outside the studio, only B104's own `screens/B104-checkpoint-stage-one/` evidence differs.

**2. Semantic interactions.**
* **Placement:** the call is still after row 8 and before `applySampleFormRoles` and release 1 (demo.ts:837-839).
* **Other combinations:** main's larger `FORM_SETUP` (B79) does not widen the step. `stageOneOf` reads only the JSON's `vv.single`, and live L7 passes.
* **Services the step calls:** `forms.setAccount` is unchanged, and so are `saveForm`'s `signedBy`/`baseRevision` path, the `SIGNED_BY`/`IRCC_ACCOUNTS` contracts and `checkGates`.
* **Main's new release checks** (`conditionFactProblems`, withdrawn-field lines) read document lines and fields, not gates, so they do not touch B104's step.
* **Main's new C10.1 row 9** now makes Visitor visa's release 2 (demo.ts:868-916). On the merged loader it succeeds with B104's APR Portal account, so the two do not clash.
* **Release 1 in the database:** IMM 5257 `parent_for_minor`, IMM 5707 `person`, IMM 5476 `person_and_representative`, 2 gates. The four unset forms stay unset.
* **Release 2:** it carries the IMM 5257 and IMM 5476 signers and the gates, retires IMM 5707 (demo.ts:881) and adds IMM 5645 with no signer. I found no duplicated or contradicting signer or account write.

**3. Tests on the merged code.**
* Offline `tests/check_b104_stage_one.ts`: 16/16 PASS.
* Live `tests/check_b104_checkpoint.ts 4446 xr_studio_rv_b104`: **2 FAIL** (L3, L5); the other 7 pass.

### Findings
* **Major M1: B104's live test fails on the merged loader.**
  * `tests/check_b104_checkpoint.ts:27` reads `config?mode=published` as if it were release 1. Since main's row 9, published is **release 2**.
  * L3 (line 29) fails because IMM 5707 is retired in release 2. Observed: `{"IMM 5257":"parent_for_minor",…,"IMM 5476":"person_and_representative","IMM 5645":null,…}`, with no IMM 5707.
  * L5 (line 35) fails on `released.release === 1`. Observed: `{"released":2,"gates":2,"judgement":4,"savedBy":"Configuration author"}`.
  * The step itself is right; the test's reading of "release 1" is stale. CI runs this suite (round 2: `run-suites.sh`), so this commit would go red.
  * Fix: read release 1 itself (for example the `config_release` row with version 1 through `sql`, or a route that serves it). For L5, either assert that the released gates are carried (release ≥ 1) or read release 1's gates.
* **Minor m7: IMM 5645 has no signer and is not in the data's unset list.** Release 2 adds IMM 5645 with no signer, and `samples/checkpoint-stage-one.json` neither sets it nor lists it under `signers_not_set` (the readiness check reads that as "a signature is needed"). The data describes release 1 only. Record it in the JSON or the PR; this is not a new item.
* **m6** (from round 2: the PR body does not say IMM 5257 loses its "Picked by AI · Sample" chip) is still open.

**Round 3 journey score:** 8.5 / 10, unchanged. The merge leaves the product behaviour as it was; only the test evidence is broken (M1).

Verdict: Changes requested on 4003adfbc

## Round 3b (e36ade7fd)
Scope: e36ade7fd only. `git diff --stat 4003adfbc e36ade7fd` shows two files changed, `tests/check_b104_checkpoint.ts` and this review. No product code changed. I ran my own isolated copy on :4446 and stopped it afterwards.

* **M1: closed.**
  * **What changed:** L3 and L4 now read release 1 from its own `config_release` row (version 1). Two checks were added:
    * L3b: the newest release keeps the signer of each listed form it still files, and there must be at least 2 such forms.
    * L5b: release 1 itself has `2|4` (gates and judgement lines).
  * **L5:** it now accepts the newest release (release ≥ 1).
  * **My live run on a fresh copy of the merged head:** 11/11 PASS, exit 0.
* **The test still fails when the step is not called.** I reasoned this through main's loader and the round 2 `runs/live/live-main.txt`:
  * L1 fails: no "J7 Stage 1" log line.
  * L3 fails: release 1 has no signer on IMM 5257, IMM 5707 or IMM 5476. The `r1.size > 0` guard also stops an empty or missing row from passing.
  * L3b fails: the signers are null.
  * L5b fails: with no gates it reads `0|0` (the `coalesce`), and with no release 1 row it reads null.
  * L6 fails: there is no APR Portal account.
* **m6: closed.** I read the PR body through the REST API at head e36ade7fd. Line 41 reads: "IMM 5257 loses its "Picked by AI · Sample" chip on the Forms tab (review m6)".
* **m7: still open (Minor).** IMM 5645 has no signer on release 2. The builder is taking it to the tech lead as a question, because the fix sits in the row-9 block. It does not block.

**Journey score:** 8.5 / 10, unchanged.

Verdict: Approve on e36ade7fd
