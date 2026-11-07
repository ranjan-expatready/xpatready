# qa milestone M3: one re-score on the configured checkpoint (cloud, 5 Nov 2026)

**Verdict: M3 is 0/17 Works on the configured checkpoint (the table says 1/17).** C6.9, the one Works row, is red there (2/15): its Works was the fixture.

**Most rows are first red at J7 Stage 1, not at their own step.** The configured Visitor visa release lacks Stage 1's setup. It has no signers, no form ages, no Online line, no IRCC account, no conditional document lines and no eligibility gates. So 10 of the 14 packs fail on that data before they reach the step they own.

**Next in the order:** give the checkpoint J7 Stage 1 (1.2 to 1.8) through the product's own steps.

* **Commits:** (branch merged up to main 1db03f66b; #1064 since then changes only the M2 C4.1 pack)
  * main ffcfb45c8: all packs, twice (`cp-r1`, `cp-r2`), and the walk.
  * main 344e08699, after #1056 (C11.6's screen and `fill-case.ts`): C11.6 and C7.7 twice (`cp-h1`, `cp-h2`), every other pack once (`cp-h3`), and the channel walk (`walk-h/`).
  * The numbers are the same on both commits. This branch has main 344e08699 merged in and changes no app code.
* **Tester:** the independent cloud qa (`/qa milestone`, this cloud machine, to spare the Mac). It built none of this and fixed nothing.
* **Records:** the Mac qa lane stays the one writer of `qa/CAPABILITIES.md` and `qa/BUGS.md`. This PR only proposes: new bugs N1–N7 and the status moves are listed below for it to copy.
* **Cost:** live AI off (every `*_LIVE` switch and AI key removed from each copy's environment), US$0. No priced button was pressed and no live switch was turned, the fake launcher included.

## How
1. **Packs on the checkpoint, twice.** `run-checkpoint.mjs` ran each M3 pack alone, without the fixture setup its run line names (gate B would run that setup). Each run got a fresh isolated copy: Demo › Reset demo, then Demo › Load the configured checkpoint as the author (`/api/demo/reset`, `/api/demo/load {sample:"configured"}`, 81–100 s), then the pack, then the copy was stopped and dropped. Rounds `cp-r1` (3 at a time) and `cp-r2` (2 at a time). Full outputs are in `runs/cp-r1/*.out.txt` and `runs/cp-r2/`.
2. **For context only (fixture results do not count, P-322):** gate B on its fixture for C6.5, C6.11, C7.5, C9.2, C10.2 and C11.6 (`runs-fixture.md`). Earlier fixture numbers for the other packs are in the 4 Nov verdicts.
3. **The walk at 1440 px.** A fresh copy, with the checkpoint loaded through the Demo menu on screen (89 s). Then the case officer, using screens only:
   * Open a case on Visitor visa with the representative of record.
   * Add a spouse and two children.
   * Read every panel against J7.
   * Then read a principal-only case. Its answers were entered by the packs' own helper (`fillEverything`, API, labelled), as the case officer and as the representative.

   Playwright ran headless, because this cloud machine has no display for a headed browser. There was no page error and no console error. Scripts: `walk-1440.cjs`, `walk-filled.mts`, `walk-solo.cjs`. Screenshots are in `walk/`.

## The table (one verdict file per row: `qa/verdicts/2026-11-05-M3-<row>.md`)
| Row | Status (table → proposed) | Steps passed on the checkpoint (both rounds) | Fixture (context, does not count) | First red J7 step | Waits on |
|---|---|---|---|---|---|
| C1.3 | Not built → **Not built** | — | — | outside J7 (breadth); nearest 2.1 | #1051 (C1.3 + C11.5, building) |
| C3.16 | Not built → **Not built** | — | — | no J7 step tests it directly; nearest 3.9 (facts asked per person and per case) | #1054 (r4 approved, building) |
| C6.12 | Partial → **Partial** | 24/24; breadth 1/4 | 24/24 (4 Nov) | 2.1 ("Will be created as" and a date of birth when adding a person are not on screen); 2.3–2.4 (filings chip, fees panel) | the case page's filings and fees (C6.12-25); breadth: sponsorship, the child study question |
| C6.5 | Partial → **Partial** | 9/32 | engine 7/7 (today; gate B runs it --engine) | 3.3 (C6.5-2: the upload check) then 3.4 ("Fill this from documents") | part 2 of #784: `POST …/sections/:s/fill-from-documents`, `…/documents/:id/confirm` answer 404 "Cannot POST"; the letter replay needs FQ-10 (a paid run, founder's Go) |
| C6.4 | Partial → **Partial** | 18/30 | 30/30 (4 Nov) | 1.7 (the release's document lines: proof of financial support on everyone, no minor lines); on screen 3.1 | the checkpoint loader's Visitor visa document lines (QA-226, now in part); the checklist on the case page |
| C6.9 | Works → **Partial (held: red on the checkpoint)** | 2/15 | 15/15 (2 Nov) | 1.8 (the configured release has no eligibility gates); on screen 4.1 | the checkpoint loader setting Visitor visa's gates and the four officer's-judgement lines (J7 1.8) |
| C6.11 | Partial → **Partial** | 22/25 | 22/22 (today) | 1.2 (IMM 5476's line: each applicant 18 or older); 5.1 the representative's facts typed per case | IMM 5476's rules on the configured release (N2); QA-152 |
| C7.5 | Partial → **Partial** | 9/16 | 9/16 (today) | 6.2 (the run card: `POST …/review-runs/plan` 404) | part 2 (run card, replay); FQ-10: one recorded run needs a paid trial with the founder's Go (not done: US$0) |
| C7.6 | Partial → **Partial** | 19/25 | 25/25 (4 Nov) | 1.2 (no signer set on the form lines: every form warns "missing signature"); on screen 6.4 | signer rules on the configured release (QA-228); IMM 5476 on a represented case (N2); the readiness screen (QA-229) |
| C7.7 | Partial → **Partial** | 13/26 | 26/26 (4 Nov) | 1.2–1.3 (form lines' ages: children get IMM 5409, 5475, 5476, IRM 0002); 1.4 (no Online IMM 5707) | the configured release's form rules and channels (N2, N3, DEMO.md row 9 waits for B81); QA-153, QA-235, QA-229 |
| C7.3 | Partial → **Partial** | 2/13 | 13/13 (4 Nov) | 1.4 (no Online line in release 1: IMM 5707 is PDF upload) | release 2's channels (DEMO.md row 9, waiting for B81); QA-153 |
| C8.1 | Partial → **Partial** | 0/14 | 14/14 (4 Nov) | 1.2 (signer rules absent; IMM 5476 not on the case) | QA-228 (signer rules on the checkpoint); N2 (IMM 5476); the sign-steps screen |
| C8.2 | Partial → **Partial** | 11/12 | 12/12 (run 41850993463) | 1.5 (the combination's IRCC account: `portal` is null on the checkpoint) | the checkpoint setting "Filed through APR Portal" (J7 1.5); with it, its pack has no other red step |
| C9.2 | Not built → **Partial (green on its fixture; 5/11 on the checkpoint)** | 5/11 | 11/11 (today) | 1.2 / 1.4 (needs IMM 5476 signed and an Online IMM 5707 on the checkpoint) | N2, QA-228, release 2's channels; the row's own remaining steps |
| C10.2 | Not built → **Not built** | 0/11 | 0/11 (today) | 7.6 (last step; every earlier stage is red on the checkpoint) | everything above; `POST /api/demo/checkpoints/finished-story` is not built (404) |
| C11.5 | Partial → **Partial** | — | — | 2.1 (Open a case and the case header offer the employer link on a Visitor visa case) | #1051 (C1.3 + C11.5); the pre-fill (BR-13, SI-10) |
| C11.6 | Partial → **Partial** | 6/14 | 14/14 (today) | 1.4 (every line PDF upload, signature No signature; no Online IMM 5707); 1.5 (no portal); the screen itself works (#1056) | the checkpoint's channels and signature per line (DEMO.md row 9, B81); N6 |

**By the person's journey (for the tech lead's order; first red step in J7 order):**
* **Stage 1 on the checkpoint.** One gap, the configured Visitor visa's setup, holds ten rows:
  * 1.2–1.3, signers and ages: C6.11, C7.6, C7.7, C8.1, C9.2
  * 1.4, channels: C7.3, C11.6
  * 1.5, the IRCC account: C8.2 (then 12/12)
  * 1.7, document conditions: C6.4
  * 1.8, eligibility gates: C6.9

  These come from C10.1's loader and DEMO.md rows (row 9 waits for B81), and they need P-322's "through the product's steps". So this is the first item to do. It is not a row of M3's own.
* **Stage 2 on screen:** C6.12 (Will be created as, date of birth, filings and fees on the case page), C11.5 and C1.3 (employer link; #1051).
* **Stage 3:** C6.4's checklist on the case page; C6.5 part 2 (fill-from-documents, Confirm & use).
* **Stages 5–6 on screen:** the readiness panel, pass, Ready to file, review, sign steps and answer sheet (QA-229). None of these has a screen; see the routes below. Channel change (5.2) has one since #1056 and works on the checkpoint. C7.5 part 2 (run card; replay needs FQ-10's paid run, the founder's Go).
* **Stage 7, then the rest:** C8.2, C9.2, C10.2 (last).
* **No J7 step:** C3.16 (#1054) is a foundation under 3.9 and 5.1.

## Five mutating routes: is there a caller in `web/src`? (by hand, 5 Nov)
I read every `api(…)` and `fetch(…)` in `web/src`, including each dynamic path: `findings/${id}/${move.to}`, `library/${list}/${key}/${kind}`, `sourcesPath`, `redoPath`, `/runtime/form-copies/${id}/…`. None of them can build these paths.
* `POST /api/editions/:id/form-fields/own-question` (`api/src/own-question.ts:137`): **no caller.** QA-234 already names it.
* `POST /api/runtime/filings/:id/ready` (`api/src/readiness.ts:163`): **no caller.**
* `POST /api/runtime/filings/:id/warnings/:code/pass` (`api/src/readiness.ts:162`): **no caller.**
* `POST /api/runtime/items/:id/sign-steps/print`. It is `sign-steps/:key` with key `print` (`api/src/sign-steps.ts:159`; keys `engine/runtime/signing.ts:19`): **no caller.** No `sign-steps` string exists in `web/src`.
* `POST /api/runtime/items/:id/sign-steps/signed` (the same route, key `signed`): **no caller.** Its sibling `POST /api/runtime/items/:id/signed-scan` (`sign-steps.ts:161`) has none either.

## New bugs for the qa lane to copy (proposed; found on ffcfb45c8)
| # | Type · severity | Row · source | Steps → actual (expected) | Owner (guess) |
|---|---|---|---|---|
| N1 | Gap · Major | C6.9 · J7 1.8, P-236 | Checkpoint, open a case, run the case check → 409 "This application's release has no eligibility rules yet…" (the Visitor visa's travel-document and convictions gates and the four officer's-judgement lines, set through the screens) | checkpoint loader (C10.1) |
| N2 | Bug · Major | C6.11, C7.7, C8.1, C7.6, C9.2 · VV-R10, BR-20 | A represented case lists IMM 5476 for every person, children too, while its rule's fact (`case.representative_form_action`) is unanswered. No question asks that fact, and once the case is answered IMM 5476 drops out (filled solo case: only IMM 5257, SCH1, 5707). Expected: a case with a representative of record has IMM 5476 for each applicant 18 or older. This is 4 Nov's finding 2 (`verdicts/2026-11-04-M3-on-the-checkpoint-after-891.md`), never given a QA number. | runtime (QA-144 rules) / checkpoint |
| N3 | Bug · Major | C7.7 · VV-R07, VV-R09, VV-R10 | Checkpoint family case: adults list 7 forms (IMM 5257, 5257 SCH1, 5409, 5475, 5476, 5707, IRM 0002) and children with dates of birth list 5 (5257, 5409, 5475, 5476, IRM 0002), each "N facts to answer" (C7.7-1/-2). Expected: adults 3, children 1, or the others shown as not yet known rather than as forms to fill. | runtime / checkpoint |
| N4 | UX · Minor | C6.12, C6.11 · J7 2.1 (C6.12-21) | Add spouse or partner and Add child ask only a name. Expected: a date of birth, or the line "biometrics waits for the date of birth". | screens (runtime) |
| N5 | UX · Minor | C6.11, C7.7 · PRODUCT §4 (no codes) | Agent view, "Section B: appointment of representative": labels read "Regulatory body … (values: cicc, law_society, chambre_notaires_quebec)" and "(values: friend_or_f…". Expected: plain words, with the choices as options. | runtime |
| N6 | Gap · Major | C8.2, C11.6 · J7 1.5, P-137 (FQ-1) | Checkpoint `/prepare` has `portal: null`; no "Filed through APR Portal" on the case; C8.2-7 and C11.6-1 red. Expected: the combination's IRCC account set through the screens, shown read-only on every case. | checkpoint loader |
| N7 | Ambiguity · Minor | C11.5, C1.3 · P-106 | A Visitor visa case offers "Relies on an employer case — Offered: the Visitor visa forms read 1 employer fact from a Corporate case". The 1 Nov evidence said "Not offered: the Visitor visa has no employer facts". Should a Visitor visa offer it, or is this QA-152's organisation question showing again? | the tech lead |

**Retests for the qa lane:**
* **QA-226:** fixed in part. Document lines now exist (C6.4 18/30, was 6/30). Narrow the row to proof of financial support on the principal only and the R3 minor lines and their questions.
* **QA-228** and **QA-229:** still open, seen again.
* **QA-153:** still in C7.3's way, but C7.3 now stops earlier, at 1.4.
* **C6.9:** red on its own data. Hold it in `REGRESSION-HELD.md` and re-score (P-322).
* **C9.2:** the table's "Not built" is stale. It is 5/11 on the checkpoint, so Partial.

## Not done in this round (say so, not hide it)
* **Not run:** `run-suites.sh`, c8 coverage, `graph.mjs` and `decision-impact.sh`. They were outside this re-score, and the Mac qa lane's milestone gate owns them.
* **The six:** packs were not run on the six (no M3 row counts on the six).
* **Headed browser:** the walk is not a headed browser, because there is no display here. It ran headless at 1440 px only (not 400 or 1024), once.
* **Keyboard and axe:** not done.
* **Shared demo (:4400):** not walked. It is not on this machine.

## Questions for the Lead
1. **Owner of Stage 1:** J7 Stage 1 on the checkpoint (N1, N2, N3, N6, QA-226's rest, QA-228) is one piece of loader work under C10.1 and DEMO.md. Is it one backlog row, ahead of the M3 builders?
2. **N7:** should a Visitor visa ever offer the employer link?

## Suggestions
* **One item, "the checkpoint holds J7 Stage 1", before more M3 screens.** *Needed for the proof* · *Capability.* The ten packs first red at Stage 1 hold 87 red steps on the checkpoint (round 1). Most of them wait on Stage 1 data, not on the row's own code. The same packs are green on their fixture: C6.4 30/30, C6.9 15/15, C7.3 13/13, C7.6 25/25, C7.7 26/26, C8.1 14/14, C8.2 12/12 (4 Nov verdicts; fixture results do not count).
* **A small `GATE_B_DATA=checkpoint-alone` mode in gate B.** *Later* · *Scaffolding.* It would run a pack without its setup lines on the checkpoint, as this round did, so builders see the counted number.
