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
