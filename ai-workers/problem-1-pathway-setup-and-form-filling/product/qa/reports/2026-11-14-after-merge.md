# qa after-merge, 14 Nov 2026: BK-13 (#1695), B170c (#1692), BK-18 (#1691)

Run: `/qa after-merge` on **main 785759598** (tree 3918479c), from 07:0x to 07:4x IST 14 Nov. Cloud qa lane, independent of the
builders. Fake launcher, live AI off, no priced button, **US$0** (P-175). Isolated copies only (:4470 to :4473), each stopped
after its run; :4400 is not served in this cloud copy, so the read-only walk on the shared demo was not possible.
Scope (P-556): only the three rows and their tests. Evidence: `2026-11-14-after-merge/` (logs `.txt`, screenshots, my probe
scripts as `.txt`, kept there so this stays a records PR).

## Verdicts

| Row | Verdict | Counted evidence |
|---|---|---|
| **BK-13** (#1695) Study permit by data, Bake exit (b) | **Works**: **45/45, exit 0, 0 GAP, 0 FAIL** | My run on a fresh copy of main 785759598; CI run 43529755382, job 132245363558, on main's exact tree: `check_bk13_zero_code_run.ts PASS 95 s 45/45` |
| **B170c** (#1692) one adapter to the XFA engine, switches off | **Works**: every Done-when line met | Adapter suite 39/39 exit 0, guard 63/63 exit 0 (mine); CI run 43529755382, job 132245363645: `check_b170c_xfa_adapter.ts PASS 39/39`; job 132245363558: `check_b164_no_engine_keys.ts PASS 63/63` |
| **BK-18** (#1691) the review record says who acted | **Works**: walk 1 S8 reproduced, contrast B passes | Row check 6/6 exit 0, twice; my four variants by screens and underneath; CI run 43529755382: C7.6 pack green on the checkpoint (job 132245583567), `check_c76_readiness_api.ts` 34/34 |

Bugs: **0 Blocker · 0 Critical · 0 Major · 0 Minor new.** Evidence added to two open rows: QA-407 (BK-18's record line) and
QA-413 (People and filings at 400 px). No "Question for the tech lead" comment is needed (no Blocker or Major).

## 1. BK-13: the counted run for exit (b)

**Command** (fresh isolated copy, main 785759598, `git rev-parse HEAD` recorded before the start):
`zsh studio/tools/isolated.sh qa_bk13 4470 start --ttl 60 && tsx studio/tests/check_bk13_zero_code_run.ts 4470 xr_studio_qa_bk13`
**Exit code 0.** Output, last lines word for word: `45/45 passed` · `Exit (b): 45/45 checks pass; 0 GAP (BK-22: 0, BK-23: 0); 0 FAIL. Met: every check passes.`
Counted from the log, not from the PR: **45 PASS lines, 0 FAIL, 0 GAP**, 7 WAIT lines (below). Log: `bk13-counted-run.txt`.

What the 45 cover (by the script, read before running): no code names the Study permit (454 files read); the configured
checkpoint loads and row 10 releases the Study permit through submit, the SME's ticks and a different person's approval; its
seeded rows match their data files (7 form rules with who files, 8 field maps, 6 cited document lines with the files' own
quotes); the family Sample case SAMPLE-SP-FAMILY-1 (3 people) opens, every answer taken; the 4 parents answered on the
officer's routes; **8 copies** (IMM 1294; IMM 1295; IMM 5257; IMM 5476 x3; IMM 5707 x2) generated, the filler's read-back
equal, read back again from the PDF with every written field filled and every list value an export value; nothing by
hand and no "needs a fix" on any copy; fees from the table, **CAD 675** with each line's source; one filing per person.

**No code changed for the pathway (P-449, P-452), checked myself:**
* #1695's own diff (`git diff 29ee6a090 5ed2f1b97`) touches nothing under `engine/`, `api/src/`, `web/src/` or `prototype/p5/`.
* The run's step 1 scans `engine/`, `api/src/`, `web/src/` and the p5 files the studio runs: 454 files, 0 lines naming
  `sp.outside`, "Study permit", IMM 1294 or IMM 1295 in code.
* Fact for the record: the two code gaps #1695 found were closed by **general** code rows, as the tech lead ruled on #1695
  (Lead 36): BK-22 (#1698: `p5/transforms.ts`, `engine/field-map-rounds.ts`, `engine/form-values.ts`, `api/src/proposals.ts`,
  `web/src/pages/job.tsx`) and BK-23 (#1702: `engine/runtime/*`, `engine/render.ts`, `api/src/runtime.ts`). I grepped their
  added lines: the pathway's key, name or forms appear **only in comments**, 0 in code. So the counted run ran on data and
  release changes only; the engine learnt general steps along the way. Whether that meets P-449's words is the tech lead's
  ruling already made, not a new finding.

**WAIT, not judged (the Mac's evidence, BK-20, dry-run D1):** no fill trial is recorded for IMM 1294 (06-2026) or IMM 5476
(11-2021), so those 4 copies say "for checking only, not for filing" (the script prints the IMM 5476 lines twice: 7 lines,
4 copies). IMM 1295, IMM 5257 and IMM 5707 have passed fill trials.

**Walk by screens** (fresh copy :4473; `bk13-walk-run.txt`, 11 PASS, exit 0): Start › "Pathways released, ready to walk" ›
Empty and start, as the author (`bk13-start-confirm-1440.png`); the Study permit then openable. The Sample case opens only
through `POST /api/demo/sample-case` (BK-12's route): **no screen offers it** (Suggestion 1). As the Case officer, at 1440
and 400 px: the three Sample people, one filing each (Study permit, Work permit, Visitor visa), all five form numbers, the
fee table "One submission for 3 people", lines with "Why", total CAD 675; no page error; no sideways page scroll
(`bk13-case-1440-top.png`, `bk13-case-400-top.png`). At 400 px the People and filings table breaks names mid-word
("Stude nt A (Sam ple)") and clips the Status column inside its box: evidence added to QA-413 (not BK-13's code).

## 2. B170c: against its Done when (`design/xfa-reuse-analysis-2026-11-11.md` §4.1 "B170c")

`tsx --tsconfig api/tsconfig.json tests/check_b170c_xfa_adapter.ts`: **exit 0, 39 passed, 0 failed** (built the engine first:
`npm ci`, `tsc`). `tests/check_b164_no_engine_keys.ts`: **exit 0, 63 passed, 0 failed**.

| Done-when line | Result | Evidence |
|---|---|---|
| Made-up form from the engine's fixtures → "not complete" with the form's own first missing box and message | Met | suite: `stops_at …Details[0].Name[0]`, "Name is required" |
| Fetched blank IMM 5257 → the same | Met | suite (1,577 ms) and my probe: `stops_at …PersonalDetails[0].ServiceIn[0].ServiceIn[0]`, "The following field must contain a value: 2. I want service in", 5 pages |
| A form the engine refuses → `not available` with the reason, exit 0 | Met | IMM 1294: `not_available`, `UNSUPPORTED_FEATURE`, "picture category "zero"…"; the child exits 0 |
| No form number or box name in the adapter or the engine (guard extended to `packages/xfa-engine/src`) | Met | guard 63/63 (225 engine files, 2 adapter files, 559 box paths and runs of names). **My seeded probes:** `"Page1.PersonalDetails.ServiceIn"` added to `packages/xfa-engine/src/runtime/options.ts` → guard exit 1; `"imm5257e"` added to `engine/xfa/index.ts` → exit 1 (two lines fail); both files restored, tree clean |
| Every switch off → the app behaves as today | Met | suite: 5 switches, all off, frozen; 486 app files read, none imports the adapter; only `engine/xfa/` reaches the engine |
| On CI | Met | run 43529755382 on main's tree, job 132245363645: 39/39 |

The review's two Musts (Major 1 non-strict engine, Major 2 five-string guard) were fixed in 9095a6c1b before merge: the child
runs `strict: true` and maps a skipped member to `not_available`; the guard reads 559 box paths. Both have failing cases in
the suites (they pass).

**My own probes** (`probe-b170c-adapter.mts.txt`, exit 0): blank IMM 1295 → `stops_at` its ServiceIn box (the second recorded
form); an empty file, a truncated IMM 5257 (40 kB) and a text file → `not_available`, `MALFORMED`, with the reason; a file
name with spaces and "ünï" → answered as normal; 6 calls at once → 6 identical answers in 5.4 s; a 1 ms limit →
`TIME_LIMIT`. Never a pass on bad input. One wording point: a limit under a second reads "took longer than 0 s"
(Suggestion 2; no caller sees it yet).

## 3. BK-18: who acted, walk 1 S8 through the product's routes

**Row check** `node tests/qa/check_qa447_self_review_record.cjs 4471` on a fresh copy, **twice: 6 PASS, 0 FAIL, exit 0 each**
(`qa447-check-two-runs.txt`). A (walk 1's set-up: default team, an idle Case officer; the Representative sends and approves
by screens): the dialog asks "I prepared and reviewed this filing myself"; Ready to file reads
`Prepared by · Reviewed by: Self-reviewed by Representative (Sample) (licence R000000), Nov 14, 2026, 01:53 a.m.`; the Case
officer is not named. **Contrast B** (the Representative as the case's only officer): the same, **passes**. Both W5 lines
that failed in qa's 13 Nov retests (4 of 4 runs on main 494b45060, `reports/2026-11-13-retests-w2.md` §5) now pass. I did not
re-run the old commit.

**My variants** (`probe-bk18-variants.cjs.txt`, fresh copy :4472): the work is a typed answer (`person.family_name`) on the
route the questionnaire uses; send and approve by screens as the Representative; then the case page, `GET …/prepare` and the
`audit_event` rows.

| Variant | What a person sees | Underneath |
|---|---|---|
| V1: the Case officer typed, the Representative reviews | no self-review statement asked; `Case officer (Sample) · reviewed by Representative (Sample) (licence R000000), Nov 14, 2026, 02:04 a.m.` | `prepared_by ["user-O"]`, kind `reviewed`, audit `reviewed:user-R` |
| V2 (= S8 with real work): the Representative typed, sent and approved, idle officer on the team | statement asked; `Self-reviewed by Representative (Sample) (licence R000000), Nov 14, 2026, 02:04 a.m.` | `prepared_by ["user-R"]`, kind `self_reviewed`, audit `self_reviewed:user-R` |
| V3: both typed | the review page shows **"Nothing was recorded"**: "You worked on this filing and so did somebody else at the firm: a review by you would read as a second person's. Hand the review to a representative who did not work on it (change the representative of record), or pass the review warning with a reason." (`bk18-V3-after-approve-1440.png`) | no review, no audit line, `prepared_by ["user-O","user-R"]` |
| V4: V2 at 400 px | the Self-reviewed line in full; no page error | as V2 |

`bk18-variants-run.txt` shows 1 FAIL: my own probe looked for V3's message inside the dialog, and the product shows it as
the page's banner (screenshot above). The product is right there; the probe line was wrong.
Also run: `tsx tests/runtime/check_bk18_preparers.ts` **33/33, exit 0**. CI on main's tree: C7.6 and C7.6-screen packs
green on the checkpoint (job 132245583567); C8.3's regression job green (job 132245583711); `check_c76_readiness_api.ts` 34/34.

**Time zones (added to QA-407):** the record line formats in the **browser's** zone with no label (`readiness.tsx:52`), while
the Representative's review formats in Toronto time (`representative-review.tsx:31`). The same approval read "Nov 13, 2026,
09:04 p.m." on the review and "Nov 14, 2026, 02:04 a.m." on Ready to file (headless browser in UTC). In India the
professional record's date and the review's date differ for any evening approval.

## Re-scored, and `qa/built/`
`qa/built/BK-18.md` deleted (re-scored here). `BK-22.md` and `BK-23.md` stay for their own round: outside this run's three
rows (P-556), although BK-13's 45/45 exercises their code. C7.6 stays Works (BK-18 is its row).

## What I could not test
* The shared demo (:4400): not served in this cloud copy.
* A headed browser: no display here; every walk was headless Playwright on the pre-installed Chromium, like a person by
  role and label, with screenshots read by me.
* BK-13's fill trials for IMM 1294 and IMM 5476 (the Mac's, BK-20).
* c8 coverage: not run in this narrow round.

## Questions for the Lead
1. **Exit (b) and the 4 WAIT copies.** The counted run is 45/45, but IMM 1294 and IMM 5476 (x3) still say "for checking
   only, not for filing" until BK-20's fill trials on the Mac. Is exit (b) met now (filled and checked forms), or met only
   when those trials are recorded? Recommendation: exit (b) met now, as the script's own ruling says; BK-20 carries the trials.

## Suggestions
1. A "Open the Sample case" button where the pathway is released, calling BK-12's route (today only the API opens it; a
   person walking the demo cannot). *Later* · *Scaffolding*.
2. B170c: write a sub-second time limit in ms ("took longer than 0 s" for 1 ms). *Later* · *Scaffolding*.
3. The BK-18 variants (V1 two-person, V3 refusal) as a `tests/qa/` check in a product PR, beside the row's check.
   *Needed for the proof* · *Capability*.
