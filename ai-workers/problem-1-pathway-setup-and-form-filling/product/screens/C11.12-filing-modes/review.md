# C11.12 filing modes, PR 1 of 3: review (independent reviewer, 2 Nov)

**Commit reviewed:** `92e25d3d` on `claude/fervent-fermat-mvm1kg` (branch head).
- The fixes are in `9dbf504b`.
- After that comes a merge of origin/main, which adds no file to this PR's diff.
- Then the earlier review files.

**Round 1** was on `e4cc6008` and gave Block: Majors M1 and M2, Minors m1–m4. This round re-checks only what changed since then.

**Against:** concept r2 §3, §6 and §6b (PR 1 scope), `challenge.md`, and P-233, all read from `origin/lead/2026-11-02-c1112-board`; also STANDARDS, EXPERIENCE and QUALITY.

**Run:** my own copy on :4441, never :4400. US$0, live AI off.
- `check_c1112_modes.ts` 39/39.
- `tsc` for the web build is clean.
- `tsc` for the api build reports errors only in `check_x2b_bulk_apply.ts`, `check_c18_age_case.ts` and `check_vv_checklist.ts`. They are not in this PR's diff; they came from main.
- My round-1 probes, re-run on a fresh copy: release 1, `setup_vv_m3`, then child Declared only and release 3.

## Verdict: Approve
Both Majors are fixed, each with a passing and a failing test. No Blocker or Major is open.

## Round-1 issues
- **M1, fixed.** `releaseModes()` (`engine/filing-modes.ts`) lets only `files_own` and `on_principal` reach the case engine. Both `case-prepare.ts:74` and `case-filings.ts:30` use it.
  - Probe: child `declared_only` saved (200, with the Guide 5256 warning) and released as version 3. The case's Prepare answered **200**. `/filings` answered 200 with every filing `files_own`/`applying`.
  - Tests: `check_c1112_modes.ts` has M1 pass and fail cases, plus `deriveFilings` keeping every mode the database accepts. Removing the filter turns the fail case red.
  - The release fingerprint is untouched: only the runtime reads the modes differently.
- **M2, fixed.** `previewFilings(…, fallback)` uses `defaultModeOf()`, the same built-in table `deriveFilings` falls back to; `workspace.ts:141` wires it in.
  - Probe: untick Child, then tick it again → the view says "3 filings in one submission", the same as the case.
  - Tests: a pass for Visitor visa and a fail for a combination with no default.
- **m1, fixed.** When `filingMode` and `filing` disagree, the save answers 400 "Filing: send one choice (filingMode and filing disagree)" (`engine/people.ts`). Probe: 400. Tests: pass (they agree) and fail (they disagree).
- **m2, fixed.**
  - The release warning now says a case uses the combination's built-in default until the Filing column ships.
  - Ticking Applicant on a Declared only line clears the mode in the editor, so the strict 400 can no longer be reached from the screen (`questionnaires.tsx:139`).
- **m3 and m4, listed in the PR body.** The editor's browser check comes with PR 3. The Sponsor lines in `wave1.json` and `programs.json` come with PR 2. Accepted as recorded. My round-1 browser journey (22/22) covers the editor paths for now.

## New Minors (Should; list in the PR, no new scope)
- **n1: until PR 2, the preview can disagree with the case for lines with a mode.** For a Visitor visa line set by API to On the principal's or Declared only:
  - The preview shows PR 2's plan: the person is on the principal's filing, and a declared-only person has no fee.
  - The case still gives a travelling person their own filing, with fees (probe: preview "2 filings", case 4 filings).
  - It is reachable only through the API (no screen control until PR 3), and Visitor visa warns on both modes.
  - Fix: one line in the PR body saying so; PR 2's tests close it (`check_vv_filings` "VV child On the principal's → 4 people counted").
- **n2: the warning's wording.** "A case uses the combination's built-in default (Sample)" is true for Visitor visa only. For other combinations the case's filings are "not derived yet". Fine while those combinations show that sentence on the case; reword with PR 3 when the warning becomes a blocker.

## The PR's questions (unchanged from round 1)
1. **The `filing` alias:** acceptable as a stopgap; the disagreement is now refused.
2. **The release line as a warning until PR 3:** agreed; it flips in PR 3, and the test already covers both states.
3. **No Sponsor line in the samples:** acceptable, tracked with PR 2.

## Concept fit (PR 1 scope, §6b): met
- Contract enum.
- BR-1 to BR-5 and BR-8, each with a pass and a fail.
- BR-7 warns.
- The release check, as a warning.
- The preview from the same plan, with the case's fallback.
- `setup_vv_m3` (B1).
- The samples' family modes.
- `C11.12.test.ts`: only line 57 changed. 18/19 per the builder; line 90 fails the same on main. I ran 18/19 myself in round 1.
- Fees never read CAD 0, and Sample is labelled.

## D1–D20 (1–5)
- D1 Requirement fit: 4.
- D2 Data integrity: 4. A release can no longer break a case; versioned saves give a 409.
- D3 Reuse: 4. One mode list, one fallback table.
- D4 Rule integrity: 4.
- D5 Stability: 4.
- D6 Governance: 4.
- D7 AI trust: 4.
- D8 Orientation: 4.
- D9 Flow: 4. The warning is honest now.
- D10 Language: 4.
- D11 Feedback: 4.
- D12 Visual: 4. The screen is unchanged.
- D13 Accessibility: 4. axe is clean at 400, 1024 and 1440 px (round 1).
- D14 Team look: 4.
- D15 Speed: 4.
- D16 Testability: 4. The editor test comes in PR 3.
- D17: simulated only.
- D18 Provenance: 4.
- D19 Capability closure: 4. Setup, release and case Prepare hold.
- D20: simulated only.

## Journey score: 9 / 10 (pass)
Re-scored in `journey-test-reviewer-2026-11-02.md` (round 2).

## Not checked
- I did not run `graph.mjs` (it rewrites the tracked `qa/GRAPH.md`); the builder ran it (exit 0).
- Pack 4, the S5 suites and the browser suites after the fix: I take the builder's counts.
- 200 % zoom, a full keyboard-only walk, and a screen reader.

**Verdict: Approve** on `92e25d3d`. No Blocker or Major is open. Put n1 and n2 in the PR body with m3 and m4.
