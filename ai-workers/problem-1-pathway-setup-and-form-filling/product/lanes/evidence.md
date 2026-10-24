# Lane: evidence — proof that filled forms pass, and an AI scoring set

## From the Lead
2026-10-24 20:40 (Lead, cloud): forms slice 2b (on main after PR #9) draws static forms' page fields (F5). Set stage BUILD, owner Builder, Mac only: (1) **Adobe re-check of one F5 file**: IMM 5409 written by the slice 2b writer through the studio fill (page fields set): open in Adobe Reader, values shown and unchanged, Validate as before (oath block a person step, F6), save, read back, UR3 verifies; one STATUS note. (2) Then **IMM 5476** (trial list 4/4, static, F5 applies): record page fields before and after Adobe's save. One commit and one EARLY-LOOK report each. Sync main first.

Command: `/next evidence` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: E1-form-acceptance
current_slice: E1b
stage: EARLY-LOOK
owner: Lead
next_action: Lead: check IMM 5409 (`prototype/evidence-lane/E1/imm5409/STATUS.md`); send F5 (static forms: page fields stay empty outside Adobe) and F6 (oath details in Validate) to the forms lane; then /next evidence for IMM 5476 (trial list 4/4).
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-24 · E1b · BUILD → EARLY-LOOK · IMM 5409 (01-2023, trial list 3/4; static, no barcodes): 18 Sample values in their boxes; Validate needs the oath block (person step: place, administrator, title, date), then silent pass; 18/18 unchanged after save; UR3 verifies. Findings F5 (static form page fields empty outside Adobe until saved there) and F6 (oath details in Validate).
- 2026-10-24 · E1b · applied Lead note 2026-10-24 12:30: EARLY-LOOK → BUILD for IMM 5409 (trial list 3/4); keep P1's Sample birth dates for regressions.
- 2026-10-24 · E1b · BUILD → EARLY-LOOK · IMM 5707 (01-2023, trial list 2/4; no barcodes): P1's 39 family values through today's writer; all in their boxes incl. the added child row; the form's Validate silent (pass: no partly filled row); zero person steps; 39/39 unchanged after Adobe's save; UR3 verifies (signed bytes kept), poppler 0.
- 2026-10-24 · E1b · applied Lead note 2026-10-24: EARLY-LOOK → BUILD for IMM 5707 (trial list 2/4).
- 2026-10-23 · E1b · BUILD → EARLY-LOOK · IMM 1295 (09-2023, trial list 1/4): P1's 91 values through today's writer; "Validation completed successfully" on the first press, zero person steps; 5/5 barcodes, 186/186 slots; every count and slot row equals P1's 19 Oct result (only the validated day differs); compare exit 0; signatures verify.
- 2026-10-23 · E1b · applied Lead note 2026-10-23 (after IMM 5257 merge): EARLY-LOOK → BUILD for the team's trial list, IMM 1295 first.
- 2026-10-23 · E1b · BUILD → EARLY-LOOK · IMM 5257 (09-2023) in Adobe: "Validation completed successfully" on the first press, zero person steps (46/46 mandatory written); 5/5 barcodes, 186/186 slots agree, 67/67 written values unchanged, compare exit 0; signatures verify. P-65 fill trial passes for R1 (one Sample case; Canada/US phone would need F1's tick). Sample birth-date mismatch flagged.
- 2026-10-23 · E1b · applied Lead note 2026-10-23 17:20: EARLY-LOOK → BUILD for IMM 5257 (then 1295, 5707, 5409, 5476).
- 2026-10-23 · E1b · BUILD → EARLY-LOOK · IMM 0008 (05-2026) in Adobe: "Validation completed successfully" after one person step (Remove the empty dependant block); no signature needed to validate; 10/10 barcodes, 462/462 slots agree, 55/55 written values unchanged, compare exit 0; signatures verify. Finding F4; compare tool generalised (self-test PASS, IMM 1344 report identical).
- 2026-10-23 · E1b · applied Lead note 2026-10-23: EARLY-LOOK → BUILD for IMM 0008 (same method as IMM 1344).
