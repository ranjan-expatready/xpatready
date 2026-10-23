# Lane: evidence — proof that filled forms pass, and an AI scoring set

Command: `/next evidence` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: E1-form-acceptance
current_slice: E1b
stage: BUILD
owner: Builder
next_action: IMM 1344: open `prototype/evidence-lane/E1/imm1344/imm1344e.complete-v1.adobe.pdf` in Adobe by computer use → Validate → iterate the values → save → capture and decode the barcodes → `E1/tools/barcode_compare.py` with `E1/imm1344/barcode-rules.json`; then stop and report. Fill, barcode map and compare tool are ready (`E1/imm1344/STATUS.md`).
blocked_by: founder — computer use is not connected in this session: turn it on in the Claude desktop app (Settings → This computer → Computer use), then start the evidence session again so its tools load
updated: 2026-10-23

## Log (last 10 lines)
- 2026-10-23 · E1b · BUILD (paused) · IMM 1344: 56 Sample values filled, writer check PASS (56/56, signatures verify, poppler 0); barcode map 5 barcodes / 149 slots, all bound; compare tool generalised, self-test reproduces P1's IMM 1295 counts exactly. Adobe step blocked: no computer use in this session.
- 2026-10-23 · Lead: E1a checked and merged (self-check 16/16 byte-identical; scoring set US$0). IMM 5669 finding accepted (expert question: which Schedule A for paper spousal sponsorship; writer gap for forms without a data part goes to the forms lane). Founder chose computer use for Adobe → E1b.
- 2026-10-23 · E1a · BUILD → EARLY-LOOK · Free scoring set: 35 saved live runs rescored at US$0; fences 8/8 refused; saved P2 scores regenerated 16/16 byte-identical; keyed scores equal the saved spread 15/15; findings: edition right 0/25, IMM 5257 3/4 runs unusable, transforms unstable. IMM 5669: IRCC's eIMM 5669 is a different form (05-2026, refugee claims in Canada); ours has no data part.
- 2026-10-23 · E1 · Lead: plan agreed; order 1344 → 0008 → 5257, then B/C, then 1295/5707 regression; check eIMM 5669 edition before E1b; start BUILD E1a.
- 2026-10-23 · E1 · DESIGN · Plan written: 9 forms in 3 groups (only IMM 5257, 1344, 0008, 1295 make barcodes), Sample household, pass criteria, founder needs, US$0 scoring set from 35 saved live runs; to Lead.
- 2026-10-23 · E1 · DESIGN · Lane created (P-64).
