# Lane: evidence — proof that filled forms pass, and an AI scoring set

Command: `/next evidence` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: E1-form-acceptance
current_slice: E1b
stage: EARLY-LOOK
owner: Lead
next_action: Lead: check E1b IMM 1344 (`prototype/evidence-lane/E1/imm1344/STATUS.md`) and send findings F1–F3 to the forms lane; decide whether E1 continues with IMM 0008 → 5257 by the same route (person steps recorded) or waits for a writer fix to F1.
blocked_by: none
updated: 2026-10-23

## Log (last 10 lines)
- 2026-10-23 · E1b · BUILD → EARLY-LOOK · IMM 1344 in Adobe by computer use: "Validation completed successfully" after two person steps (tick Canada/US; type the Sample signers' names); 5/5 barcodes decoded, 149/149 slots agree with the saved data; 55/56 written values unchanged (postal code gets its space); signatures verify. Findings F1 phone boxes, F2 typed signatures, F3 form formats.
- 2026-10-23 · Lead: E1b IMM 1344 fill merged to main (ca7fc03d). Founder turned on Computer use for this lane (23 Oct): Adobe Reader by computer use; ask the founder to allow Adobe Reader the first time and let them watch IMM 1344. Fresh session started by the Lead.
- 2026-10-23 · E1b · BUILD (paused) · IMM 1344: 56 Sample values filled, writer check PASS (56/56, signatures verify, poppler 0); barcode map 5 barcodes / 149 slots, all bound; compare tool generalised, self-test reproduces P1's IMM 1295 counts exactly. Adobe step blocked: no computer use in this session.
- 2026-10-23 · Lead: E1a checked and merged (self-check 16/16 byte-identical; scoring set US$0). IMM 5669 finding accepted (expert question: which Schedule A for paper spousal sponsorship; writer gap for forms without a data part goes to the forms lane). Founder chose computer use for Adobe → E1b.
- 2026-10-23 · E1a · BUILD → EARLY-LOOK · Free scoring set: 35 saved live runs rescored at US$0; fences 8/8 refused; saved P2 scores regenerated 16/16 byte-identical; keyed scores equal the saved spread 15/15; findings: edition right 0/25, IMM 5257 3/4 runs unusable, transforms unstable. IMM 5669: IRCC's eIMM 5669 is a different form (05-2026, refugee claims in Canada); ours has no data part.
- 2026-10-23 · E1 · Lead: plan agreed; order 1344 → 0008 → 5257, then B/C, then 1295/5707 regression; check eIMM 5669 edition before E1b; start BUILD E1a.
- 2026-10-23 · E1 · DESIGN · Plan written: 9 forms in 3 groups (only IMM 5257, 1344, 0008, 1295 make barcodes), Sample household, pass criteria, founder needs, US$0 scoring set from 35 saved live runs; to Lead.
- 2026-10-23 · E1 · DESIGN · Lane created (P-64).
