# B139 · C6.17 review of the QA-375 fix (P-444): the study and work permits' per-person checklists

Reviewer (fresh context, did not build it), 10 Nov 2026. PR #1477, branch `claude/nifty-tesla-878uy6`, **commit 17538072eeb1673f9f068e76f4f53961781571ec**. The PR's own change is `git diff $(git merge-base origin/main 17538072e) 17538072e`: 7 code files, +134/−20, plus screenshots. A two-dot diff against today's `origin/main` also shows main's newer work as reverted; that is a stale base, not this PR's change. Forms ports only: :4451 and :4452 (isolated copies, stopped), never :4400. Live AI off, US$0. The earlier review (`review.md`) is left as it is.

**Verdict (skill scale): Ship.** P-444 is met as ruled. The row's "Start next stage … adds documents", BR-6 and pack items 5 and 9 now hold on the checkpoint: an upload through C6.4 on the study stage, and the work permit's own lines with "On file from Study permit … check it for this application". Every line's quote names an official checklist with page and date, or is labelled Sample with where it came from. Money, schema and permissions are untouched, so no breaker is needed. Three Minors are listed below.

## What I verified (evidence)
1. **Money is unchanged.** `rulesFrom` (engine/runtime/filings.ts:84-89) returns undefined when `lines` is empty, exactly as when the entry is absent. So `RULES.get`, `defaultModeOf`, `hasFeeRules`, `feeRule`, `deriveFilings` and case-prepare.ts:687 behave as before. `feeLinesOf` (api/src/source-register.ts:19-22) gives `[]` either way. The other readers (case-stages.ts, engine/source-register.ts, contracts) take fee lines only through these two. The only other reader of `checklist` is `DERIVED_FOR` (engine/runtime/case-checklist.ts:23). check_c614_providers still picks `vv.single` first. The "not derived" tests use `ee.pnp` and `wp.family`. check_r2_fee_table: 85/85 on my run.
2. **IMM 5556 quotes, page and date.** I read the XFA template (pypdf `xfa['template']`) of `official-sources/ircc/checklists/imm5556e.pdf` (sha256 52eea575…, as the code says).
   * Items 1, 2 and 5 sit in subform `IMM_5556/page1` (rows 5, 6 and 9), before the only `breakBefore` into `page2`. So "p. 1" holds. It is structural: the PDF's only static page is the XFA "Please wait" page, and the code comment says so.
   * Manifest `server_last_modified` is "Wed, 10 Apr 2024 14:38:10 GMT", which matches "modified 2024-04-10". `downloaded_utc` 2026-10-27 matches "saved 27 Oct 2026".
   * Items 2 and 5 are verbatim (item 2 drops only the bullet marks). Item 1 is not quite: see m1.
3. **No line claims a source it lacks.** Five LMIA lines land (read from `document_requirement` on the checkpoint).
   * Fee, passport and marriage cite IMM 5556.
   * The dependant child's birth certificate (from IMM 5905) and the common-law proof (from Guide 5487) are "Sample: not on IMM 5556 …", each naming its real `source_file`. IMM 5556 names a birth certificate only as an identity document for someone without a passport (row 7), and names the IMM 5409 form, not the proof (row 4). So "not on" is fair. The immigration expert confirms, as labelled.
   * The study permit's three lines cite IMM 5483 with page and date (SP_DOCUMENT_LINES, already on main).
4. **`stage_ended`** (api/src/case-checklist.ts:164) sits in `line()`, so upload, Request, Not applicable and approve all get it. A racing upload passes this check before the start commits. It is still refused by the database trigger `runtime_stage_row_current` (FOR KEY SHARE on the case, migration 20261109130000:152-170), because the upload updates the line before it stores the file. main.ts:216 turns that into a plain 409. Nothing is stored.
5. **Tests fail when the rule is removed, and never skip.** In a scratch worktree I made two changes: `wp.lmia_inside` `"checklist": false`, and the guard disabled. The pack then gave 44/47: C6.17-9 (BR-6), C6.17-9 (P-170) and C6.17-9 (BR-10) FAIL; the stage-1 steps still pass, as expected. Every new step asserts a non-empty group. The only early return follows a FAILed C6.17-1.
6. **What changes for cases on these combinations.** Prepare's document items (case-prepare.ts:177) now come from the derived checklist. A study case gets 3 document items (to do), an LMIA case 2. Readiness and review rounds now count those documents, as they already do for the Visitor visa. I re-ran the suites that open cases on these combinations:

| Suite (my run) | Result |
|---|---|
| C6.17 pack, fresh copy | 47/47 |
| walk `check_c617_stages_browser` | 42/42 |
| `check_c617_stages` (engine) | 32/32 |
| `check_qa144_lmia_release` | 23/23 |
| `check_c10_1_configured` | 48/48 |
| `check_b52_own_yes_no` (LMIA and study cases) | 67/67 |
| C1.3 | 56/56 |

C3.16 gave 37/59 because I ran it on the configured checkpoint, but it is written for a fresh copy of "the six". It fails at its own setup on published field scope, its case part is a Visitor visa, and nothing in it reads checklist lines. Not this PR's; not re-run on its own data.

## D1–D20 (this change only; the rest as `review.md` round 3)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | P-444 as worded: C6.17-5 upload by C6.4; C6.17-9 new-stage lines and "On file …" (pack 47/47) |
| D2 Data integrity | 5 | lines on the new stage only (`lineStages === S2`); ended line 409, nothing stored; trigger backs the race |
| D3 Reuse | 4 | the release's lines and the library's types; IMM 5556 words replace quotes by document type, no new types |
| D4 Rule integrity | 4 | conditional lines whose facts are not asked wait and are named in the load log |
| D5 Stability | 5 | reload keeps "On file" (J5); 409 on a stale line; a racing upload refused whole |
| D6 Governance | 4 | quotes carry edition, page and date; "Unconfirmed: expert" |
| D7 AI trust | N/A | no AI |
| D8 Orientation | 4 | Documents panel under the strip; person heading, "0 of 2 received" |
| D9 Flow | 4 | dialog: "2 documents on the checklist: …"; the toast says the same |
| D10 Language | 4 | plain words; the Sample label is long (a staff Source disclosure) |
| D11 Feedback | 4 | Received at once (325 ms); m2 adds noise after the line's own upload |
| D12 Visual | 4 | team line rows; P444a/P444b at 1440 and 1024 |
| D13 Accessibility | 5 | keyboard upload through the line's menu (J1); axe 0 on 3 states; no sideways scroll at 1440, 1024 and 400 |
| D14 Team look | 4 | existing C6.4 components only |
| D15 Speed | 5 | upload 325 ms, start 605 ms, no per-row requests |
| D16 Testability | 5 | the new steps fail on the rule (point 5); m3 is a weak spot |
| D17 First use | simulated only | |
| D18 Provenance | 4 | every line sourced or Sample; m1 |
| D19 Closure | 5 | study upload → start → work-permit line offers the file, end to end on the product's own screens |
| D20 Pain/wow | simulated only | |

## BIC (EXPERIENCE §6, the Documents part this PR turns on)
| Check | Result | Evidence |
|---|---|---|
| 01 Ask once | Met | the study passport is offered on the work permit, not asked blind (P444b; J1) |
| 04 Incomplete/invalid | Met | "Not requested" and "No file yet"; a text file named .pdf is refused in words, nothing stored (J4) |
| 05 Value from a document | N/A | no reading here |
| 08 Case structure | Met | each person's lines with a count (P444a, P444b) |
| 11 One primary | Met | line actions in a menu; one Start |
| 13 Errors | Met | "Send a PDF, JPEG or PNG file … Nothing was stored." on the line (J4) |
| 14 Help in place | Met | "Source" disclosure per line, keyboard-openable |
| 18 States | Met | ended panel read only with "Its own documents" (J7) |
| 19 Low load | Partly (Should) | m2: Received plus "On file … check it" on the same line |
| 20 Accessible | Met | keyboard menu upload; axe 0; 1024 and 400 px |
| 02, 03, 06, 07, 09, 10, 12, 15, 16, 17 | N/A or as `review.md` | not changed by this PR |

## Issues (none Blocker, none Major)
* **m1 · Should · not strictly verbatim** (api/src/form-setup.ts:119). IMM 5556 row 5 is two paragraphs: "Proof of Payment, if applicable" and "Note: If you are applying …". The quote joins them with a "." the form does not print. Fix: quote the two paragraphs as two quoted strings (or join them with " / "), with no added punctuation.
* **m2 · Should · "On file" stays after the line's own file** (engine/runtime/stages.ts:149-153; case-checklist.ts:134). After the officer uploads the work permit's own passport, the line reads "Received · File: sample-passport-work.pdf" and still "On file from Study permit … check it for this application" (J2). This is the approved engine's behaviour, but this PR makes it reachable on the checkpoint. Fix: show `on_file` only while the line has no current file of its own.
* **m3 · Should · the source test is weak for Sample** (acceptance/C6.17.test.ts:29). Any quote starting "Sample" passes, even one naming no source. Fix: a Sample quote must also name where it came from (as LMIA_DOCUMENT_SOURCES's "took it from …" does).

## Could not check
A real screen reader. True 200 % browser zoom (a 400 px viewport stood in). An intended user's walk (D17, D20). C6.19, check_c612_fees_browser and check_b151_unpriced_browser are the builder's runs; I did not re-run them. The graph (P-86) lists `POST /runtime/checklist-lines/:id/documents` under G3 "no test reaches". That is the tool missing multipart `fetch` uploads (the pack, C6.5 and the walk use the route; `viaBrowser: true`), and GRAPH.md predates this PR. Not a finding here. The walk writes into `screens/B139/screenshots/`; I restored the committed images after my run.

Journey score **9.5/10** (pass): `journey-test-reviewer-2026-11-10.md`.

**Verdict: Approve** at **17538072eeb1673f9f068e76f4f53961781571ec**. No open Blocker or Major. Fix m1–m3, or list them in the PR.

## Round 2 (diff only): ef564b3c8
Scope: only `git diff 17538072e ef564b3c8 -- …/prototype` (`api/src/form-setup.ts`, `acceptance/C6.17.test.ts`). The other two files in the commit are this review and the journey report, committed unchanged.
* **m1 fixed.** Item 1 now reads `"Proof of Payment, if applicable" / "Note: If you are applying for an open work permit, provide proof of payment for the open work permit holder fee."` (form-setup.ts:119). These are exactly the two `<p>` paragraphs of IMM 5556 row 5 in the XFA template, and no punctuation is added.
* **m3 fixed.** `sourced()` (C6.17.test.ts:30) now accepts a Sample quote only with `from (IMM|Guide) NNNN`. I ran it on the strings the code produces at ef564b3c8.
  * Accepted: the 3 IMM 5556 citations, the 3 IMM 5483 lines, and Sample quotes from IMM 5905, Guide 5487 and IMM 5488.
  * Refused: a Sample quote whose source is unknown ("from work-permit-outside-…") or missing ("from a source it does not name"), a bare "Sample", and a Sample quote with only a date.
  * So the step still passes on the checkpoint's real lines, and it fails on an unsourced Sample line.
* **m2 open as agreed.** It is listed in the PR as a follow-up row. It was a Should against the approved engine's behaviour, so it does not hold the verdict.
* I did not re-run the pack at this head. The builder reports 47/47 on a fresh copy, and the change only tightens the predicate, which I checked as above.

**Verdict: Approve** at **ef564b3c8d47a96751bb47fb6a755f3f9ea3f474**. No open Blocker or Major.
