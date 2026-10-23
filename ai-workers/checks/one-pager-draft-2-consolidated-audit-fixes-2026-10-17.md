# One-pager draft 2: fixes after the consolidated audit

17 October 2026 · The Lead's record of the nine-step correction plan in `illustrations/actor-handoff-demo/draft-2-audit/claude-audit-validation-response-2026-10-17.md`. The founder said to go ahead. This is not the checker's verdict.

- **Before:** the one-pager is `8cb68027…9774`, archived whole as `../archive/ai-workers/*-v3-draft2-revised-2026-10-17.*`. That is eight files (page, data, views, builder, ledger, browser checks, and the ledger and check outputs); all hashes match the audit's `input-manifest.json`.
- **After:** the one-pager is `d6d07e4f…432a`. It has 41 activities and 209 rules (197 before). Diagram sizes are unchanged and every diagram is still at most 1,240px wide.
- **Not changed:** no new step, service or approval, and no founder decision. No slides, pack or prototype. Nothing committed.

## What changed, by finding

| Finding | Change | Where |
|---|---|---|
| A1 | An answer supplies the fact, never the document. An unreadable or wrong-person upload returns its facts' questions **and** shows "re-upload needed" on its document line. Submission needs every required document line accepted, or a reason the agent records. Whether a substitute document is allowed is the specialist's value. | 7.2, 7.3, 9.5; view 4 gateway "Required facts available?" |
| A2 | Each applicant's filing groups their copies, approvals, signatures, fee, receipt and decision. "Every copy approved" counts the filing's current required copies at current versions. A confirmed fact can add or remove a copy. A decision closes only that filing, and the case ends when every filing is decided. Before submission, the form edition is checked as still accepted on that date. | 7.1, 8.1, 9.3, 9.4, 9.5, 9.6; view 6 "Every copy of the filing approved", "Every filing decided"; overview end; diagram note |
| A3 | 9.2 routes each failure by its cause, and a correct fact is never changed to satisfy a format. The diagram's "Fact or mapping problem?" goes to 8.4, which already routes a wrong fact to 8.1. Red is split into *blocked* (resolve and re-check; it cannot be acknowledged away) and *flagged* (decide, with a reason). 9.3 cannot approve with a blocked item. | 8.4, 9.2, 9.3; view 5 |
| A4 | 9.3 approves the final file or portal screen, and its stamp adds the file's fingerprint. On upload, the 9.1 read-back runs again on the final file; unreadable and hand-entered fields are listed for the representative. Any change to the file withdraws the approval. | 8.5, 9.2, 9.3 |
| A5 | There are now two finding classes. *Blocking* findings return to drafting through 4.4. *For review* findings (near-duplicate, uncertain, AI disagreement) reach 5.1 marked "decide": the reviewer's recorded decision closes them, and they cannot be released undecided. | 3.1, 4.1, 4.2, 4.4, 5.1, control strip; view 3 "Any blocking failure?" |
| A6 | Below the docking width, the card opens on the side the selected shape is not on. | page script, styles |
| A7 | On phones, the page behind the sheet is inert while the sheet is open, and a press there cannot pull focus out of the sheet. | page script |
| B1, B2 | One "Family name" definition (the mapping says whose name it is). A form's limits come from its mapping. | 3.1, 3.7 |
| B3 | The hover preview stays while the pointer is on it, and Escape closes it. | page script, styles |
| B4 | Read-back compares with the value expected after the mapping's approved transform. | 3.8, 9.1, 9.2, check kinds |
| B5 | A form edition's run is shared across rows. Two proposals of one new field meet as a near-duplicate. | 1.3 |
| B6 | Checker unavailable: its fields stay grey ("not checked"), people review them as important fields, and the approval records that the check did not run. This is a Lead ruling the founder may overrule. | 8.3 |
| B7 | Proof question and fallback added for the XFA and portal gaps. New gap: re-reading the uploaded final file. | build gaps |
| B8 | The ledger's 1.1 reason and its measures count are corrected. Four reworded draft 1 rules now have dispositions. | `s3_ledger.py` |
| B9 | The previous target is archived whole (see the "Before" line above). | archive |
| B10 | Footer now reads "Legal points: 'Unconfirmed: no counsel'". TC-177 stays with its owner in NEXT. | footer |

## Verification

- **Build:** `python3 tools/s3/build_one_pager.py` passes its structural checks with no errors, and the ledger is written.
- **Browser:** `node tools/s3/check_one_pager.cjs` passes **91 of 91**: the 84 earlier checks plus 7 new ones.
  - At 1280px and at 1440px, the selected shape stays visible for 3.8, 9.3 and the rightmost shape of views 3, 5 and 6 (one check per width).
  - At both widths, another shape can be selected without closing the card (one check per width).
  - The hover preview stays while the pointer is on it, and Escape closes it.
  - On a phone, clicking the page behind the sheet does nothing and focus stays in the sheet.
  - On a phone, closing the sheet makes the page usable again.
- **The audit's own probes, re-run:**
  - At 1280px and 1440px, the eye controls of 3.8, 9.3, 5.3 and 9.6 are no longer covered; the card opens on the left.
  - At 375px, a click on "Jump to" is refused and focus stays on the card heading.
  - No diagram label is clipped.
- **Scenario walks: 19 of 19 pass.** They are asserted against the rendered cards and the diagram flows:
  - A1: unreadable passport; an answer is not a document; submission waits.
  - A2: two copies with one approved; becoming common-law adds a copy; the principal decided while the partner is pending; past a cut-off.
  - A3: a correct date with a format error; a wrong date; a blocked item not acknowledgeable.
  - A4: a mistyped date seen in 9.3; a file change withdraws the approval.
  - A5: a near-duplicate merged in 5.1; an AI disagreement closed with a reason; a missing mapping re-drafted.
  - Diagrams: views 3, 4, 5 and 6.
- **Leftover wording:** a sweep of the page finds none of the replaced phrases. The one "selected value" left is 8.3's example, where it is correct: read-back passes because the wrongly selected value was copied exactly.
- **Visual check:** views 4, 5 and 6 were checked by screenshot. View 4's gateway label was shortened after it collided with 7.3's eye control.

## Still open (unchanged)

- Real government forms not yet read; AI accuracy not measured; specialist values pending; which filings must go together (specialist).
- No screen reader, Safari, Firefox or real-device testing.
- The separate checker gives the formal verdict, then the founder reads.
