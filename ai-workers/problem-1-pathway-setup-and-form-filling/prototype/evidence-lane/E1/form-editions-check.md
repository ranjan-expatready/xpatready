# Form editions check before E1b (23 Oct 2026, evidence lane)

Asked by the Lead: IRCC Help Centre q138 names IMM 0008, IMM 1344 and **eIMM 5669** as validated forms with 2D barcodes, but our IMM 5669 has none. Is IRCC's validated Schedule A a different file? Read only: the public pages and HTTP headers. **Nothing was downloaded.** Page summaries come from a reading tool, so take the wording as paraphrase and check it on the page.

## Answer: yes, it is a different form and file
| | Ours: IMM 5669 | IRCC's eIMM 5669 |
|---|---|---|
| Form page | `…/application-forms-guides/imm5669.html` (page details 2025-06-26) | `…/application-forms-guides/eimm5669.html` (page details 2026-07-21) |
| Edition | "Last updated: May 2021", path `imm5669/01-05-2021/imm5669e.pdf` | "Last updated: May 2026", path `eimm5669/01-05-2026/eimm5669e.pdf` |
| Size | 186,009 bytes (manifest; page says 0.2 MB) | page says 2 MB; Help Centre link says 776.4 KB (older link) |
| Barcodes | 0 (scan of our file; made with Designer 6.2, March 2024; **no data part in the form**) | Help Centre: a form with 2D barcodes to validate |
| Scope stated on page | Digital version in the Permanent Residence Portal; this PDF for paper applications | Title says it is for use only when **claiming refugee protection from inside Canada** (paraphrase; Guide 5746). Same questions as Schedule A; open in Adobe Reader 10+ on a computer |

The Help Centre's three links point to old "migration" paths: the eIMM 5669 link redirects to the eIMM 5669 form page; the IMM 1344 link redirects to the IMM 1344 page; the IMM 0008 link is a separate file `imm0008enu_2d.pdf` (last modified 23 Feb 2026).

## What it means for E1
* **Spousal sponsorship (demo 3) most likely uses our IMM 5669** (a paper PR application; no barcodes). eIMM 5669 looks like the refugee-claim version. **Question for the immigration expert:** which Schedule A does a paper spousal sponsorship use? If eIMM 5669, the founder or the Lead adds `eimm5669e.pdf` (05-2026) to `official-sources/ircc/` and it moves to group A.
* **Writer gap for E1c:** our IMM 5669 ships no data part (`datasets`), and `p5/fill.py` expects one. Filling it means adding a new part to the form's XFA list, not just replacing one stream. Whether the usage-rights signature and Adobe accept that is unproven; this goes to the forms lane via the Lead. IMM 5406 and 5707 have the data part after `form`; the rest have it after `localeSet`.
* IMM 1344 (09-2024) and IMM 0008 (05-2026) on their form pages match our copies (form pages read 23 Oct). E1b can start with them.
