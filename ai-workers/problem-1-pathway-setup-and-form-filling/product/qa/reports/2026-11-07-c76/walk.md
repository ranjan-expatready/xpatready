# qa re-score of C7.6 on the configured checkpoint, main f187f44f9, 7 Nov 2026, 17:19–17:26 IST: facts only (no verdict here)

**Asked by:** the tech lead (Lead 31): "re-score C7.6 on main's checkpoint … find what moved 19→15, then log it as a bug with its cause or as an expected change. Evidence is on #1261." **Commit:** `f187f44f9` (main's head at 17:19 IST). **Money:** live AI off, `STUDIO_*_LIVE` vars 0, US$0, no button pressed (route and pack only). **Copies:** qa_c76a and qa_c76b on :4472, each fresh (`/api/demo/reset` then `/api/demo/load {sample:"configured"}` as the author, 62 s, the way gate B loads), each started by its absolute path through the untracked `tools/isolated-sb.sh` and stopped in the same command ("stopped … database and files removed"; the script removed after).

## The pack today
`acceptance/C7.6.test.ts` alone on qa_c76a: **exit 1, 15/25** (the same as #1261's two gate B runs, on its branch and without B149). Step lines: `C7.6-pack-f187f44f9.txt`. Red: -3, -4, -5, -6, -10, -12, -19, -20a, -20, -22.

## 5 Nov, for comparison
`qa/verdicts/2026-11-05-M3-C7.6.md` (commit a0f6e0a67; main ffcfb45c8 and 344e08699; fresh checkpoint, twice): **19/25**; red -4, -5, -7, -11, -12, -19; "every form carries a CRITICAL missing signature (how it is signed is not set on the form line yet)", "C7.6-11 IMM 5476's sign steps 404". The same round's README: C7.3 "1.4 (no Online line in release 1: IMM 5707 is PDF upload) | release 2's channels (DEMO.md row 9, waiting for B81)"; C11.6 "every line PDF upload". So on 5 Nov cases ran on **release 1** of the checkpoint's Visitor visa, every form a PDF upload.

## Step by step, 5 Nov → today
| Step | 5 Nov | Today | What changed (evidence) |
|---|---|---|---|
| -7 IMM 5476 hand-signed, no scan, is a missing signature | red | **pass** | IMM 5476 now has its signers on a represented case (A2 #1072, C6.11; QA-228 closed by A3 #1198) |
| -11 IMM 5476 printed, signed, scan uploaded | red (sign steps 404) | **pass** | the same |
| -3 Ready to file refused, lists the blocks | pass | **red** (409, but no block listed) | release 2: no barcode form on the case (below) |
| -6 IMM 5257 on PDF upload with no validated copy blocks (P-144, VV-R18) | pass | **red** | release 2 files IMM 5257 **Online** (`api/src/features/checkpoint/130-release-two.ts:30` `setChannel(…, "IMM 5257", { channel: "ONLINE" })`, C10.1 row 9) |
| -10 IMM 5257 validated copy read back | pass | **red** | the same: no PDF IMM 5257 to validate |
| -20a, -20 IMM 5707's accepted-until date warns | pass | **red** (no line for IMM 5707) | release 2's family form is IMM 5645, not IMM 5707 (`130-release-two.ts:2`, FAMILY_FORM_BY_CHANNEL) |
| -22 only IMM 5257's Validate refuses Ready to file (P-315) | pass | **red** (`{"status":200,"blocks":[],"warns":[]}`) | the same: no barcode form, so nothing blocks |
| -4 an optional date 1990-13-45 is a "fact with a problem" on IMM 5257 (QA-122) | red | red | the pack looks for an optional, non-group date question that fills IMM 5257; on release 2 the adult has **no optional date question at all** (probe on qa_c76b: "optional dates for the adult: []"), so the step has nothing to test |
| -5 with every fact confirmed the fact warnings are gone | red (signatures) | red | after `fillEverything`, two `missing_facts` lines stay: IMM 5476's representative facts nobody can answer (QA-300: 5 owed by staff, 12 by the client) |
| -12 the barcode block and the signature warning are gone; only the review remains | red | red | the same two `missing_facts` lines (QA-300) |
| -19 Ready to file succeeds | red | red | "2 open warnings": the pack passes only `missing_document` (`C7.6.test.ts:73`), so QA-300's two lines stay open |

Arithmetic: 19 − 6 (−3, −6, −10, −20a, −20, −22) + 2 (−7, −11) = 15.

## Release 2 on the checkpoint, when
`130-release-two.ts` ("C10.1 row 9 (Lead 9, 5 Nov; P-143): release 2 of Visitor visa with mixed channels") existed on 5 Nov; its release then waited (README: "row 9 waits for B81"). Today the checkpoint releases it and new cases pin to it (the C6.9, C8.2 and C6.11 walks of today all read "Visitor visa · release 2"). The commit that let release 2 through was not bisected.

## The plan's ruling on this kind of red
`design/m3-sprint-plan-2026-11-06.md:133` (R1): "Six of the red packs (C7.3, C7.7, C7.6, C9.2, C11.6, C10.2) name the fixture's forms and channels. On the checkpoint the same journey exists with other form numbers, so the product is not wrong and neither is the checkpoint: the packs need to ask for "the Online form", "the barcode form", "the family form", "the hand-signed form" of the case in front of them." Row C4 (line 164): "One pack at a time onto the checkpoint: C8.1, C7.6, C9.2, C11.6, C7.7 … the other four wait on C3"; row C3: the channel decides "for filing" (founder Q3: Paper with a written reason), which makes a barcode IMM 5257 possible on release 2 by a person's channel change (J-C3). `acceptance/C7.6.test.ts` last changed 4 Nov (bb6d192d1). Owner of C7.6's pack lines: the C4 lane (P-400, Lead 31 on #1261).

## Added after the fresh reader's questions, 17:27 IST
* **Inferred, not proven:** that -5, -12 and -19's two `missing_facts` lines are IMM 5476's QA-300 lines. The pack prints the codes only. Two lines match QA-300's two owners (staff 5, client 12, as walked on 7 Nov), and IMM 5476's 17 facts are on every represented case.
* **Probably vacuous on release 2:** -6b's pass (a pass of the barcode block refused, 409) likely comes from the open warnings, with no barcode form present. So do -12's "barcode block gone" half and -2's IMM 5257 wording. Unproven, not counted green.
* -4 cites QA-122, which has no row in `qa/BUGS.md` or `qa/BUGS-CLOSED.md`.
* QA-251 and QA-229 were not re-tested this round; they are carried as open.
