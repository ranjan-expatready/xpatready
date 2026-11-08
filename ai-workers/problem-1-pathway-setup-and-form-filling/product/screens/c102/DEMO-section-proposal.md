# Proposed DEMO.md section (C10.2, for the tech lead to paste; DEMO.md is the tech lead's file)

Insert before "## Rules for every lane" in `product/DEMO.md`:

## The finished story, phase 1 (C10.2; Demo › Load the finished story)
One job (`POST /api/demo/checkpoints/finished-story`, 202; progress and result on `GET /api/demo/status`, `checkpoint` and `story`). It empties the demo (RESET typed when it has content), loads the configured checkpoint, then drives the **product's own routes as the person who acts**: no SQL write, no faked state, so the load is itself a walk of J7. Values: `prototype/studio/samples/finished-story.json`, all Sample. US$0. Loading twice gives the same story (each load starts from empty); Reset and Reset to the six work after it.

**What it shows** (Visitor visa, the family of four, `SAMPLE-VV-FAMILY-1`):
1. The configured checkpoint (rows 1–12, 17), plus a thin second case `SAMPLE-VV-THIN-1` opened on release 1 before release 2 goes out (row 16).
2. The case officer moves the family case to release 2 with a reason (C9.5); the thin case stays on release 1.
3. What release 2 asks is answered by its person: the client for themselves and the minor, the case officer on another adult's behalf with a reason, then re-confirmed by the client; the case officer confirms each section (C6.1–C6.3, C6.18).
4. IMM 5257 Online: every answer-sheet section ticked "Entered in the portal" (C7.3); IMM 5257 SCH1 and IMM 5645 filled as PDFs (C7.1).
5. IMM 5476 printed, signed by hand and a synthetic scan uploaded for each adult (C8.1).
6. Each person's checklist, the passport page requested and received (synthetic specimens; C6.4).
7. The representative of record reviews each filing; the case officer passes the rest with a reason; all four filings Ready to file (C7.6, C7.7).
8. The submission recorded for the family's group in one action (BR-11): APR Portal, our reference, Sample application numbers and Sample UCIs (C8.2).

**What it does not show yet** (each named on the result, never faked):
* The Online IMM 5257 reads To do, not Done: its sheet waits on the Yes/No gates and on facts held as rows or "none apply" (QA-165 (1)), and on the visit contact, which release 2 never asks.
* IMM 5645's parents and brothers and sisters are not asked, so their boxes stay empty (QA-153).
* Release 1's four IMM 5257 copies validated in Adobe are read back only on the Mac, where the validated files are kept (QA-285); Validate is never simulated (P-46, P-171).
* Row 13 (online auto-fill) stays parked (W6); row 18 (combination B reusing the family's facts) and one seeded case per other combination are phase 2.
* The remaining documents (fee receipt, proof of financial support, marriage certificate) are not collected: their warnings are passed with a Sample reason.

