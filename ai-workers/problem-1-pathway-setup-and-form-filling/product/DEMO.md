# Demo story — one family, every mechanism (P-93)

Owner: the Lead. Decided by the founder on 25 Oct: the demo data is **one story** (two combinations at most, plus a third only after the immigration expert answers) that shows **every mechanism** of the product, can be **reset and replayed** from blank, and can be **loaded finished** to show the outputs. Corporate stays separate: its screens exist, and its seed is optional. This file replaces the six-combination list in `SCREENS.md` as the demo plan. Every value here is **Sample** until the immigration expert confirms it (channels per form: expert question 3, P-61).

## The story
**Combination A — Individual › Visitors › Visitor visa, a family of four** (the hero; most of it is already proven: R1, E1, F1, F2).
People: Applicant · Spouse (travelling) · Child under 18 (the principal answers for them, P-78) · Child 18 or over (answers for themselves).
**Combination B — Individual › Work permits › Employer-specific › With an LMIA** (the reuse proof). The same family facts and the same shared library: IMM 5707 and IMM 5476 are reused with no new mapping, and only IMM 1295 is new. It is "Supported by" Corporate › LMIA (link only; the corporate seed is optional).
Every online line in A and B is filed through the **APR Portal** (P-98: the one portal the proof of concept proves; the expert confirms per combination).
**Combination C — Family sponsorship › Spouse or partner (sponsor + applicant)** comes later, only after the expert answers the sponsor and Schedule A questions.

## Scenario matrix (every row must be visible in the demo; status = capability rows in `qa/CAPABILITIES.md`)
| # | Mechanism | Where in the story | Capability | Owner lane |
|---|---|---|---|---|
| 1 | Ingest a PDF form: code, edition, checksum read without AI; an off-list file held, then approved by a second person | A: attach IMM 5257, IMM 5707, IMM 5476; one off-list file held | C2.1, C2.2, C2.3 | forms, screens |
| 2 | **Parked (P-102, W6).** Ingest an online form: portal screens captured with the extension, checked before sending, a second person approves | A: IMM 5257 online, Sample APR Portal screens, then the real blank APR screens the founder captures (P-98) | C2.5, C2.8, C2.9 | forms |
| 3 | AI maps form fields to shared fields (reuse, new, ambiguous), saved answers replayed at US$0; one live run when the founder approves | A: the three forms; B: only IMM 1295 | C3.1, C3.3 | screens, forms |
| 4 | A person reviews: accept with a reason, edit, reject; form-field decisions (not a fact, filled by hand) | A | C3.2, C3.8 | screens |
| 5 | Master data: new shared fields approved by a second person; duplicates found; "Describe it"; aliases and a merge | A creates, B reuses | C3.5, C3.6, C3.13, C5.3 | screens |
| 6 | Master data recreated: Reset → blank workspace with sources only → AI drafts the library again from the replayed answers | Reset checkpoint | demo | runtime + screens |
| 7 | AI drafts setup beyond fields: sections, document requirements from the checklist (IMM 5484, IMM 5881) | A | C2.6, C3.4 | forms, screens |
| 8 | Questionnaires: SQR per person from what the forms need; PQR picks; preview by person with the Sample family | A, B | C4.1–C4.3, C4.7 | runtime |
| 9 | Channels: PDF upload · Online · Signed PDF upload; filing method Mixed | A release 2: IMM 5257 Online, IMM 5707 PDF upload, IMM 5476 Signed PDF upload | C1.6, C1.7, C3.11 | screens, runtime |
| 10 | Review and release: submit, expert ticks, a different person releases; library changes go out with it | A release 1, release 2; B | C5.1, C5.2 | runtime, screens |
| 11 | A case on a release: answers once, each person; the minor answered by the principal; confirm by section | A family case on release 1 | C6.1–C6.3, C6.6, C6.10 | runtime |
| 12 | PDF auto-fill with barcodes, read back equal, Adobe Validate | A release 1: IMM 5257 PDF (5/5 barcodes); B: IMM 1295 | C7.1, C7.2 | runtime, evidence |
| 13 | **Parked (P-102, W6).** Online auto-fill: the extension fills one portal screen from confirmed facts; a changed screen fills nothing and opens "Re-capture needed" | A release 2: IMM 5257 Online | C7.4, C9.3 | forms |
| 14 | Online plus PDF in one filing: portal sheet, filled PDFs, signed scans | A release 2 case | C7.7, C8.1 | runtime (M3) |
| 15 | Document checklist per person | A case | C6.4 | runtime (M3) |
| 16 | The case stays on its release while a new release goes out | A: case on release 1, release 2 published | C6.1 (P-67) | runtime |
| 17 | New edition: field-by-field comparison and impact on both combinations | IMM 5476 2021 → 11-2025 (`previous-editions/`) | C9.1 | screens |
| 18 | One fact entered once fills every form of every combination | B reuses A's family facts | C6.3 | runtime |

## Checkpoints (Demo menu)
1. **Reset to blank:** sources only (the official files committed under `official-sources/`). Replays rows 1–10 from nothing.
2. **Configured (the M2 gate, C10.1):** A and B released (A release 1 all PDF; A release 2 mixed), with the library they built, and the thin family case on release 1 with IMM 5257 filled (rows 1–12, 17).
3. **Finished story (the M3 gate, C10.2):** the family case on both releases, online fill, the filing with portal sheet, filled PDFs and signed copies, documents listed (rows 13–16, 18).
AI in every checkpoint is the saved answers (US$0, labelled "replay"); a live run happens only with the founder's go (a session on the Mac).
**Start With an LMIA from its reviewed release** (after Reset to the six; C5.4): loads c1-v3, a reviewed release for a work permit applied for from **outside** Canada, into B's inside-Canada combination as a **Sample** draft (QA-214: never labelled as that combination's source-backed setup; the six have no outside-Canada With an LMIA). One shortcut, said in its dialog: the shared library items come in as the reviewed release's, already in the library, so no paid AI drafting runs again. Review and release lists its numbers without a source (17) and Submit waits. Release 1 needs its sources: a person answers the 17, the author submits, the SME signs and a different person approves; it is a Demo release, because its field maps have no answer-key test the immigration expert signed (C5.5; P-322: later steps count only on data the product's own steps built; their evidence is on the configured checkpoint).

## Rules for every lane
* A feature is not DONE until its row above shows in the demo story (seeded or replayable), with a check in the demo suite.
* The seed calls the same services as the screens; it never fakes AI or approvals (as `api/src/demo.ts` already does).
* `api/src/demo.ts` and the sample files are the runtime lane's; another lane adds its part through a function in its own file that the runtime lane calls.
* Everything stays Sample-labelled; real immigration values come only from the expert.
