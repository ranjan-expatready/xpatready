# S4 Form library (W1-06, W1-07 run card): independent review, round 2, 27 Oct 2026

Reviewer: not the builder. Commit e58136e (`forms/2026-10-27-s4-form-library`), judged as it is now against P-123 (with M1/M2 annotations and C11.18), P-116, P-121, P-110, P-125, challenge.md M1–M7 and m1–m6, STANDARDS, EXPERIENCE and PRODUCT §3–4. Build-notes' claims were checked in the app, not taken on trust.

**How.** Isolated copy `rev_s4` on :4461 with the stand-in launcher; a stub probe reached `fake-launch.log` before any live step; nothing went to a model or canada.ca (US$0). Walked in a visible Chrome as user-A (author) and user-B (second person), plus an API break pass. Journey test: `journey-test-reviewer-2026-10-27.md`. Screenshots: `review-shots/v3-*` (the `r*` files are round 1).

## Verdict: **Ship after fixes**
Round 1's Must is fixed (a used or approved official form can no longer be deleted), and 5 of its 8 Majors are fixed. Still blocking: one carried Major (1024 px), four new Majors (guide actions, Used by for checklists, Type of two visa-office files, invisible focus). Load sample is partly fixed and lowered to a Should. None loses data. **Journey score 7/10: not a pass** (8 needed); no criterion at 0.

## Round 1 findings now
| Round 1 | Now | Evidence |
|---|---|---|
| Must 1: delete a used, approved form | **Fixed** | IMM 5257 and IMM 5484 delete → 409 "retire it instead"; uses count source attachments (`form-uses.ts:45-53`) |
| M2: Load sample thin | **Partly → Should S1** | 2 guides added; source uses shown. No guide for 3 combinations; no finder replay attaches anything |
| M3: drawer stale | **Fixed** | After Send: "Change waiting", no second Set (v3-j6) |
| M4: To review wording | **Fixed** | "Not set yet → PDF upload · Online"; the change page links canada.ca and the library (v3-j7-change-IMM1295) |
| M5: 1024 px | **Not fixed → Major 1** | below |
| M6: held/failed next step | **Fixed** | Held → "Record the IRCC page it came from" at `/review/held/:id`; a failed card has no false link |
| M7: job files in `p2/jobs` | **Fixed** | Stop after a hanging live call: `p2/jobs`, `runs` and `ledger` unchanged; no pid file left |
| M8: focus and chip | **Fixed** | Focus returns to the number and to ⋯; file input `tabIndex=-1`; the chip shows at 390 px. New gap: Major 5 |
| M9: IMM 5802 typed Checklist | **Fixed, with a regression** | Major 4 |

## Major (each blocks the pass)
1. **(carried) At 1024 px, Used by, Status and ⋯ are off-screen inside the table** with the Load sample data (v3-size-list-1024).
   * The table is 1065 px wide in a 735 px area; ⋯ sits at x≈1254. Cause: `whitespace-nowrap` on Edition ("Read from canada.ca on 2026-10-27") and IRCC accepts (`library-forms.tsx:105-106`). The builder's "review M5" test passes only in its own data state.
   * Fix: wrap Edition and IRCC accepts below 1280 px, or pin Status and ⋯; test on the Load sample state.
2. **(new) Every per-guide route answers 404: a guide cannot be retired or deleted, and its drawer silently shows no uses and no history.**
   * Cause: `normaliseCode` upper-cases anything it does not recognise (`contracts/form-library.ts:14`), so "Guide 5256" → "GUIDE 5256"; the routes apply it to `:code` (`form-library.ts:263-268`).
   * Evidence: `GET /library/forms/Guide%205256/uses` → 404 "GUIDE 5256 is not in the library."; Retire in the UI says the same (v3-g-guide-retire, v3-g-guide-drawer). Breaks P-116 (retire on every master). No test opens a guide's drawer or retires one.
   * Fix: keep unrecognised codes as they are (or match case-insensitively); a pass and a fail test for a guide.
3. **(new) The list's "Used by" ignores checklists and other non-Form sources; the drawer counts them.**
   * IMM 5484: "Not used", "See where it is used (0)", missing from the Visitor visa filter, yet its drawer lists Visitor visa and Super visa and Delete is refused (v3-r-IMM5484-drawer); IMM 5881 the same.
   * Cause: `form-library.ts:59` reads only `kind: "Form"` attachments; `formUses` reads every kind. Breaks m6 and EXPERIENCE §2.7. Fix: one source-use query for both.
4. **(new, regression of round 1's M9) IMM 5881 and IMM 5905 show Type "Form", IRCC accepts "Not set yet" and a "Set what IRCC accepts" button.**
   * They are a New Delhi visa-office document checklist and visa-office instructions; the library's own History says "(document checklist)".
   * Cause: `TYPE_OF` maps any `document` whose title lacks "checklist" to form (`form-library.ts:35`); their titles are "Temporary Resident Visa" and "Work Permit".
   * Fix: take the type from the kind the intake recorded (checklist or instructions), not title words; a test with 5881.
5. **(new) Keyboard focus is invisible on the Type and Status chips and on the row-number buttons** (the main way into the drawer).
   * Computed outline `none`, no shadow (v3-k-focus-chip, v3-k-focus-row): WCAG 2.4.7, EXPERIENCE §2.12. axe does not catch it.
   * Code: `library-forms.tsx:65` and `:102` have no `focus-visible` style. Fix: the team's focus ring, as `Button` has.

## Should
* **S1 Load sample** (P-123 "must pick up every PDF, checklist and guide"): 2 of 5 combinations get a guide; the finder is not replayed. The Lead records whether the rest belongs to S5 Start setup or a logged live pass (P-110).
* **S2 One empty file in a multi-file upload sinks the batch.** Files before it run with no card shown; files after it are never uploaded; only "empty.pdf is empty" is said (ai_batch rows 20:34:33). Cause: `form-library.ts:249` with `upload-run.ts:55`. Fix: check every file first, or give the empty file its own failed card.
* **S3 Decision number and hash on the main path:** "never deleted (P-51)" (`form-uses.ts:65`) and "fingerprint recorded (d6ba4cab0363…)" on the run card (PRODUCT §4, EXPERIENCE §5). Move them to Details.
* **S4 After approval the row still says "Retire waiting"**, tooltip "waits for a second person". It is approved and waits for the next release: say so, and where to release it.

## Minor
An approved delete is not re-checked against "approved official file" (`lifecycle.ts:138-141`) · a held upload of a new form is in neither the list nor "Needs your OK" · search sends one request per keystroke · the chip appears about 5 s after a launch made outside the page (S5 should invalidate `runs-active`) · an edit refused after Undo says "removed by a reset" (shared `saveForm`).

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | Library, drawer, Upload rules first, C11.18 and Stop work. Guide lifecycle broken (M2); Load sample partial (S1) |
| D2 Data integrity | 4 | Delete guarded (P-51); 10-way races on accepts and retire give 1; Undo vs edit, 8 rounds, no lost edit; CHECK constraints |
| D3 Reuse | 4 | Stored once; a duplicate upload: "Already in the library … nothing duplicated" |
| D4 Rule integrity | 4 | Where-used on the server is complete; delete and retire refusals are right |
| D5 Stability and recovery | 4 | Stop 104 ms, launcher ended, no pid or job file; cards survive a reload; S2 |
| D6 Freshness and governance | 4 | Checked dates, history, second person on every change; the author cannot approve (403) |
| D7 AI trust | 4 | "Rules read it: No AI call was made"; AI · Sample; IRCC's words; AI steps tagged |
| D8 Orientation | 4 | Breadcrumb; the combination's name first, then its trail |
| D9 Flow | 4 | Upload → library in 1 s; held → its To review item; change page → Approve |
| D10 Language | 3 | Mostly plain; Type wrong for 5881/5905 (M4); "(P-51)" and hash (S3) |
| D11 Feedback and state | 3 | Live drawer, Change and Retire waiting; guide drawer silently empty (M2); "Not used" vs 2 uses (M3); S4 |
| D12 Visual quality | 4 | Calm, aligned, team tokens (v3-j1-list, v3-j4-card-running) |
| D13 Accessibility and responsive | 3 | axe clean on 16 states; 390 px and 200 % with no page scroll. 1024 px (M1); focus visibility (M5) |
| D14 Team look | 4 | Team components and the Studio shell |
| D15 Speed | 4 | First view 118–166 ms; filter 125–131 ms; list API 86 ms |
| D16 Testability | 3 | Rerun by me twice: runs 61/61, canada 49/49. The 1024 test passes on a state Load sample does not give; no guide-route or checklist-use test |
| D17 First use | 3 | Simulated only |
| D18 Provenance | 4 | Origin, page, PDF link, fingerprint in Details, who said what IRCC accepts |
| D19 End-to-end | 3 | Load sample partial (S1); the finder's buttons come with S5 |
| D20 Pain and wow | 3 | Simulated only; the run card with a real Stop and rules-first upload is the wow |

## Standards [M]
**Met:** server authorisation (user-B 403 on upload, accepts, retire, delete, check-canada; 401 without an actor) · Problem Details with field errors · expand-only migration with CHECKs and rollback · one request per view · uploads checked (HTML, truncated and empty refused; name sanitised) · cost stated first · empty, no-match, read-only and running states drawn. **Not met:** EXPERIENCE §2.12 at 1024 px and visible focus (M1, M5) · §2.7 counts (M3) · STANDARDS §3.5 retire for guides (M2) · §5 copy (S3). **Graph (P-86):** G1–G6 clean for S4 (G3 only the older `/attachments/:id/file`). Spot check: the P-51 delete rule has a failing test (`check_forms_s4_finder.ts:239-241`).

## Could not check
A paid run, and whether a stopped real call is charged at its reserved cost (the stand-in writes no ledger; the card shows US$0.00) · a real screen reader, Firefox, Safari, canada.ca live · the finder and browser suites (they write into the builder's screenshot folders) · D17 and D20 need an intended user's walk.

**Housekeeping:** `p2/jobs/studio-finder-forms-…-super-visa-d107409f.json` (20:45) came from the breaker copy `brk_s4` (:4462, same worktree), not from this review; left in place. My copy, its database and var folders are removed.
