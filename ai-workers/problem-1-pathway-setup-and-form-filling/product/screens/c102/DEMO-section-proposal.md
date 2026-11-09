# Proposed DEMO.md section (C10.2, for the tech lead to paste; DEMO.md is the tech lead's file)

Insert before "## Rules for every lane" in `product/DEMO.md`:

## The finished story, phase 1 (C10.2; Demo › Load the finished story)
* **How it runs.** One job: `POST /api/demo/checkpoints/finished-story` answers 202, and its progress and result are on `GET /api/demo/status` (`checkpoint` and `story`). It empties the demo first (RESET typed when the demo has content), loads the configured checkpoint, then drives the **product's own routes as the person who acts**. There is no SQL write and no faked state, so the load is itself a walk of J7.
* **Values.** All from `prototype/studio/samples/finished-story.json`, all Sample. US$0.
* **Repeatable.** Loading twice gives the same story, because each load starts from empty. Reset and Reset to the six work after it.

**What it shows** (Visitor visa, the family of four, `SAMPLE-VV-FAMILY-1`):
1. The configured checkpoint (rows 1–12, 17). A thin second case, `SAMPLE-VV-THIN-1`, is opened on release 1 before release 2 goes out, and stays there (row 16).
2. The case officer moves the family case to release 2 with a reason (C9.5).
3. What release 2 asks is answered by its person:
   * the client answers for themselves and for the minor;
   * the case officer answers for another adult; the background answers among those are marked for the client to re-confirm, and the client re-confirms them (C6.18);
   * the case officer confirms each section (C6.1–C6.3).
4. One adult's IMM 5257 is filed on Paper with a written reason (P-380 Q3), and its copy is made, ready for a person to validate in Adobe (C11.6, C7.7).
5. The other IMM 5257s are Online, with every answer-sheet section ticked "Entered in the portal" (C7.3). IMM 5257 SCH1 and IMM 5645 are filled as PDFs (C7.1).
6. IMM 5476 is printed, signed by hand and a synthetic scan uploaded for each adult (C8.1).
7. Each person's checklist: the passport page is requested and received, as synthetic specimens (C6.4).
8. The representative of record reviews each filing, and the case officer passes the remaining warnings with a reason. Three filings reach Ready to file (C7.6, C7.7). The Paper filing cannot: a barcode form without its validated copy blocks it (P-315).
9. The Paper filing is split out of the family's group with a reason (its fee changes from the family maximum to its own, shown on the case). The other three are recorded together in one action (BR-11), with APR Portal, our reference, Sample application numbers and Sample UCIs (C8.2).

**What it does not show yet** (each named on the result, never faked):
* The Paper IMM 5257's validated copy, and so that filing's Ready to file and recording. 16 of the form's 46 mandatory boxes are empty today, so Adobe's Validate would refuse it (QA-165, #1318). Validate is a person's step on the Mac, never simulated (P-46, P-171, QA-285).
* The Online IMM 5257s read To do, not Done. Their sheets wait on the Yes/No gates (QA-165 (1)), on facts held as rows or "none apply", and on the contact in Canada, which release 2 never asks (qa's own row).
* The follow-up questions of a No (national identity document, US PR card) stay required, so they carry Sample values. These are removed once #1318 lands.
* IMM 5645's parents and brothers and sisters are not asked, so their boxes stay empty (QA-153).
* Row 13, online auto-fill, stays parked (W6). Row 18 (combination B reusing the family's facts) and one seeded case per other combination are phase 2.
* The remaining documents (fee receipt, proof of financial support, marriage certificate) are not collected. Their warnings are passed with a Sample reason.
