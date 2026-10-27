# S4 Form library (W1-06, W1-07 run card): independent review, round 3, 27 Oct 2026

Reviewer: did not build this screen. Commit 26a360e (`forms/2026-10-27-s4-form-library`), judged as it is now against P-116, P-121, P-123 (with its M1/M2 annotations and C11.18), P-124, P-125, challenge.md M1–M7 and m1–m6, STANDARDS, EXPERIENCE and PRODUCT §3–4. I checked the build notes' "Round 2" claims in the app and the code; I did not take them on trust.

**How.** Isolated copy `rev3_s4` on :4461 with the stand-in launcher. A stub probe reached `fake-launch.log` before every live step (twice). No model call and no canada.ca call (recorded copies only): **US$0**. Walked in a visible Chrome (Playwright, clicking and typing) as user-A (author) and user-B (second person), then an API break pass. Journey test: `journey-test-reviewer-2026-10-27.md`. Screenshots: `review-shots/v4-*`. `p2/jobs`, `runs` and `ledger` are unchanged (checksums before and after). Copy stopped, database dropped.

## Verdict: **Ship after fixes**
Every round 2 Major I re-checked is fixed: 1024 px, guide routes, Used by for checklists, the type of 5881/5905, and the focus ring on chips and form numbers. So are the breaker's N7 (guides) and N2 for attach, and the empty file in a multi-file upload; I did not re-run the breaker's N1, N3–N6 and N8 (the breaker is re-running them). One **new Major** remains: Undo reopens N2, so a form can be retired while a combination's draft still lists it. **Journey score 8.5/10** (pass on the journey bar). But D4 = 3 because of this Major, so the check passes only after it is fixed and re-tested.

## Round 2 findings now
| Round 2 | Now | Evidence |
|---|---|---|
| M1 1024 px | **Fixed** | Table 735 px in a 737 px area; ⋯ at x=972 (v4-j1-list-1024). No page scroll at 400 px or 200 % |
| M2 guide routes 404 | **Fixed** | Guide 5256 drawer lists Visitor visa; Retire refused "Still used: Visitors › Visitor visa"; Guide 5269 delete refused in words (v4-j1-guide-*) |
| M3 Used by misses checklists | **Fixed** | IMM 5484 "2 combinations", in the Visitor visa filter |
| M4 5881/5905 typed Form | **Fixed** | Both "Checklist · Not filed" |
| M5 focus on chips and numbers | **Fixed, partly** | Ring on chips and numbers (v4-k-focus-row). Other tab stops: Should S3 |
| S2 empty file sinks the batch | **Fixed** | 6 files: empty named in an alert, other 5 each got a card (v4-j3) |
| S3 "(P-51)" and hash | **Fixed** | Fingerprint only under Details |
| S4 approved retire wording | **Fixed** | Row "Retire approved" (v4-j7) |
| Breaker N2 attach during retire | **Fixed for attach, open through Undo** | Major 1 |

## Major
1. **(new; N2 reopened by another route) Undo brings a form back onto a draft while its retire is open, and the release then retires it.** This breaks P-116 ("retire is refused while a current draft … uses it").
   * Steps (API):
     1. Attach IMM 5645 to Super visa, then Remove it.
     2. Ask to retire IMM 5645 (allowed: approved file, no uses). user-B approves it, so it is APPROVED and waits for the release.
     3. Attach again → 409 "Being retired" (correct). **Undo of the Remove → 201**: the line is back as DRAFT v1.
     4. user-B `POST /pack/release` → IMM 5645 is retired.
   * Result: `retired_at` is set while Super visa's draft still lists the form. The list shows "Retired · Used by Visitors › Super visa".
   * Cause:
     * `api/src/form-library.ts:213-242` (`undoNow`) never checks `closingChange` or `retiredAt` before putting lines back.
     * `api/src/lifecycle.ts:215-221` (`publishLifecycle`, called at `library-changes.ts:174`) retires without checking uses again.
     * The only N2 test covers attach (`check_forms_s4_finder.ts:291-295`).
   * Fix:
     * Undo refuses (409, in words) to put back a line whose form is retired or has an open retire/delete.
     * At release, re-check `formUses` and return the change if a draft or the latest release still uses the form.
     * One pass and one fail test for each.

## Should
* **S1 A stopped live AI call shows "US$0.00 spent" while its own step says it "stays counted at its reserved worst case".** The ledger keeps the reservation, but the card's total is the sum of the steps' `costUsd`, and `finder.ts:491` sets it to 0 (v4-j4-card-stopped). P-110 "states and logs its cost". Fix: show the reserved amount on the step and in the total ("US$x reserved, may be billed").
* **S2 "Needs your OK" is wrong both ways.**
  * IMM 5802 (no file, nothing on To review) shows "Needs your OK" with the tooltip "A file of this form waits for a second person on To review".
  * The held upload IMM 5562, which does wait on To review, is in neither the list nor the filter.
  * Cause: `form-library.ts:75-76` (no usable edition = needs_ok; held items only by `code` of an existing row).
  * Fix: give a form with no file its own state ("No file yet: upload it"), and list a held new form under Needs your OK. (The second half is round 2's Minor, raised here with the 5802 evidence.)
* **S3 Focus is still invisible on the run chip and on the table's tooltip stops.** The chip (`run-card.tsx:88`) and the Status, AI · Sample, "n combinations" and Change waiting spans (`library-forms.tsx:108-109, 136-137`) have no outline or shadow. Two or three such stops per row; only the tooltip shows where focus is (v4-k-focus-chip, v4-k-focus-status-pill). WCAG 2.4.7, EXPERIENCE §2.12. Fix: the same `focus-visible` ring the chips got.
* **S4 axe `label-content-name-mismatch` during multi-file uploads:** once, on the chip while five upload runs were active. The visible "+n" is not in its `aria-label` (`run-card.tsx:88-90`). Clean when no run is active.

## Minor
* An over-long quote gets Zod's "Too big: expected string to have <=400 characters". The textarea has no `maxLength` (`library-forms.tsx:266`).
* A guide's drawer says "PDF link" for an HTML page, and "Downloaded … by the form finder" with an empty History, although Load sample added it.
* Non-Latin file names become underscores ("____…script_x.pdf"): safe, but the person cannot tell which file a card is.
* The upload's step 2 label says "AI only when the rules cannot", but AI never runs there (D8, agreed): the label promises a path that does not exist.
* Search still sends one request per keystroke (round 2 Minor).
* Carried, the Lead's call: Load sample adds guides for 2 of 5 combinations (round 2 S1).

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | One list, filters, drawer, rules-first upload, C11.18, guide lifecycle and real Stop all work; Load sample partial (Lead) |
| D2 Data integrity | 4 | 5 parallel uploads of a new form: 1 added, 4 "Already in the library"; 10 parallel accepts: 1 created; records exact |
| D3 Reuse | 4 | Stored once; duplicates refused in words |
| D4 Rule integrity | **3** | Delete/retire rules and P-51 hold, but Undo + release break P-116 (Major 1) |
| D5 Stability and recovery | 4 | Stop 116 ms, launcher ended, no pid file; cards survive a reload; a bad file never sinks the others |
| D6 Freshness and governance | 4 | Checked dates; second person on accepts and retire; author 403 on their own change |
| D7 AI trust | 4 | "Rules read it … No AI call was made"; AI steps tagged; S1 cost display |
| D8 Orientation | 4 | Breadcrumb; trails with the combination's name first |
| D9 Flow | 4 | Upload → library 1.7 s; held card → its To review item; change page → Approve → row updated |
| D10 Language | 4 | Plain; Zod message and "PDF link" Minors |
| D11 Feedback and state | 4 | Live waiting tags; S1, S2 |
| D12 Visual quality | 4 | Calm, dense, aligned (v4-j1-list-1440) |
| D13 Accessibility and responsive | 4 | axe clean on 13 states; 1024, 400 and 200 % fine; S3, S4 |
| D14 Team look | 4 | Team components and shell |
| D15 Speed | 5 | First view 243 ms, filter 69 ms, Stop 116 ms |
| D16 Testability | 4 | N2 test fails if removed from attach; no test for Undo vs retire. Suites not rerun by me (instructed) |
| D17 First use | 4 | Simulated only |
| D18 Provenance | 4 | Origin, page, fingerprint in Details, who set what IRCC accepts |
| D19 End-to-end | 4 | Library ↔ To review ↔ combination links work; finder buttons come with S5 |
| D20 Pain and wow | 4 | Simulated only; rules-first upload and the real Stop |

## Standards [M]
**Met:** server authorisation (user-B, user-C and client user-P 403 on accepts, retire, delete, check-canada, attach, undo, upload; no actor 401) · Problem Details with field errors · expand-only migration with CHECKs · one request per view · uploads checked (type, damage, empty, size; name sanitised; stored under var) · cost stated before launch · every EXPERIENCE §4 state drawn. The finder plan is unauthenticated but read-only.
**Not met:** P-116 / STANDARDS §3.5 through Undo (Major 1) · EXPERIENCE §2.12 visible focus on the chip and tooltip stops (S3) · §2.7 "counts say what they count" for Needs your OK (S2).

**Graph (P-86):** G1–G6 clean for S4 (G3 1 = the older `/attachments/:id/file`). Retrofit mapping: build-notes "Round 2" lists each finding and its test.

## Could not check
* A paid run, and what the ledger and card show after a real stopped call.
* A real screen reader; Firefox or Safari; canada.ca live.
* The builder's finder and browser suites (they write into the builder's screenshot folders).
* D17 and D20 need an intended user's unaided walk.
