# Lane: evidence — proof that filled forms pass, and an AI scoring set

## From the Lead
2026-10-23 (Lead): IMM 5257 checked and merged (186/186 slots, 0 problems, 67/67 unchanged, reproduced by the Lead): the P-65 fill trial passes for R1, so the runtime lane may fill IMM 5257 directly. Next: the team's trial list, IMM 1295 → 5707 → 5409 → 5476, one commit and one report each.

Command: `/next evidence` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: E1-form-acceptance
current_slice: E1b
stage: EARLY-LOOK
owner: Lead
next_action: Lead: check IMM 1295 (`prototype/evidence-lane/E1/imm1295/STATUS.md`); then /next evidence for IMM 5707 (trial list 2/4), then 5409, 5476.
blocked_by: none
updated: 2026-10-23

## Log (last 10 lines)
- 2026-10-23 · E1b · BUILD → EARLY-LOOK · IMM 1295 (09-2023, trial list 1/4): P1's 91 values through today's writer; "Validation completed successfully" on the first press, zero person steps; 5/5 barcodes, 186/186 slots; every count and slot row equals P1's 19 Oct result (only the validated day differs); compare exit 0; signatures verify.
- 2026-10-23 · E1b · applied Lead note 2026-10-23 (after IMM 5257 merge): EARLY-LOOK → BUILD for the team's trial list, IMM 1295 first.
- 2026-10-23 · E1b · BUILD → EARLY-LOOK · IMM 5257 (09-2023) in Adobe: "Validation completed successfully" on the first press, zero person steps (46/46 mandatory written); 5/5 barcodes, 186/186 slots agree, 67/67 written values unchanged, compare exit 0; signatures verify. P-65 fill trial passes for R1 (one Sample case; Canada/US phone would need F1's tick). Sample birth-date mismatch flagged.
- 2026-10-23 · E1b · applied Lead note 2026-10-23 17:20: EARLY-LOOK → BUILD for IMM 5257 (then 1295, 5707, 5409, 5476).
- 2026-10-23 · E1b · BUILD → EARLY-LOOK · IMM 0008 (05-2026) in Adobe: "Validation completed successfully" after one person step (Remove the empty dependant block); no signature needed to validate; 10/10 barcodes, 462/462 slots agree, 55/55 written values unchanged, compare exit 0; signatures verify. Finding F4; compare tool generalised (self-test PASS, IMM 1344 report identical).
- 2026-10-23 · E1b · applied Lead note 2026-10-23: EARLY-LOOK → BUILD for IMM 0008 (same method as IMM 1344).
- 2026-10-23 · E1b · BUILD → EARLY-LOOK · IMM 1344 in Adobe by computer use: "Validation completed successfully" after two person steps (tick Canada/US; type the Sample signers' names); 5/5 barcodes decoded, 149/149 slots agree with the saved data; 55/56 written values unchanged (postal code gets its space); signatures verify. Findings F1 phone boxes, F2 typed signatures, F3 form formats.
- 2026-10-23 · Lead: E1b IMM 1344 fill merged to main (ca7fc03d). Founder turned on Computer use for this lane (23 Oct): Adobe Reader by computer use; ask the founder to allow Adobe Reader the first time and let them watch IMM 1344. Fresh session started by the Lead.
- 2026-10-23 · E1b · BUILD (paused) · IMM 1344: 56 Sample values filled, writer check PASS (56/56, signatures verify, poppler 0); barcode map 5 barcodes / 149 slots, all bound; compare tool generalised, self-test reproduces P1's IMM 1295 counts exactly. Adobe step blocked: no computer use in this session.
- 2026-10-23 · Lead: E1a checked and merged (self-check 16/16 byte-identical; scoring set US$0). IMM 5669 finding accepted (expert question: which Schedule A for paper spousal sponsorship; writer gap for forms without a data part goes to the forms lane). Founder chose computer use for Adobe → E1b.
