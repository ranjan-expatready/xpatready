# Immigration expert's review pack — first edition (November 2026)

**For:** the immigration expert (a licensed consultant, RCIC, in good standing with the College of Immigration and Citizenship Consultants). **From:** the evidence lane, for the tech lead (P-455 (2)). **Status: Sample until the expert confirms (P-240). Legal points: Unconfirmed: no counsel. Not legal advice.**

The founder asked for the pack to be prepared "as per the best in class practices and the industry standard and the government rules and the Canadian RCICI ... and then we will fine tune as required" (10 Nov 2026, P-455 (2)). This is that first edition: every immigration value comes from an official page we hold a dated copy of, or is labelled Sample. The expert's marks turn Sample into confirmed content; the session with the expert is not booked yet.

## What the expert is asked to do

About 3–4 hours in total; the files can be done in any order.

| File | What it holds | What to do | Time (estimate) |
|---|---|---|---|
| [`visitor-visa-answer-key.md`](visitor-visa-answer-key.md) | Every box the app fills on IMM 5257, IMM 5257 Schedule 1, IMM 5645 and IMM 5476 for a made-up family of four, with the client answer or rule behind it and IRCC's instruction | Read the 8 ranked findings first; then mark each row | 2 h |
| [`study-permit-content.md`](study-permit-content.md) | The Study permit (outside Canada) content the next build will enter as data: fees, documents with their conditions, which forms and who fills each, the field map basis | Mark each row; answer the questions in §6 | 45 min |
| [`professional-practice-checklist.md`](professional-practice-checklist.md) | The steps the CICC Code of Professional Conduct and IRCC's representative rules ask of a licensee, and where the app supports each today | Mark each row; say which gaps matter most | 45 min |

Out of scope for this edition: other pathways, the team's business requirements (retainer screens, billing), and any real client's file. Only sample and test data are used (P-455 (3)).

## How to mark each row

Every reviewable row ends with a **Mark** column (☐). Write one of three marks, with your initials as a role (for example "expert") and the date:

| Mark | Meaning | What you add |
|---|---|---|
| **Confirmed** | The value, rule or mapping is right for this situation | nothing else |
| **Corrected** | It is wrong or incomplete | the right value **and its source**: an IRCC or CICC page (link, the words, the date you read it), a regulation section, or "professional judgment" with one line of reason |
| **Unsure** | You cannot confirm it without more facts, or practice differs by visa office | what you would need, or which office or case type it depends on |

Rules for marking:
* **⚑ rows** in the answer key carry a placeholder the demo writes where the Sample record has no answer. Mark the mapping (right fact, right format), not the value.
* A row may be confirmed "for this family only" (say so); the app then needs a rule for other families.
* A finding you disagree with: mark it Corrected with your reason; the tech lead decides what changes (AGENTS rule 2).
* Mark directly in the file (a pull request comment, a copy of the file, or a printed copy). The tech lead copies the marks into the records.

## How the answers flow back (Sample → confirmed, P-240)

1. **Recorded as given.** The tech lead copies each mark, the expert's source and the date into the content's own source entry (fee table line, form rule's citation, document line, field map entry) in one records pull request. Nothing is changed without its mark.
2. **Corrections become work.** Each Corrected row becomes a backlog row (data edit, map fix or rule fix) with a fail-then-pass test, built through the usual pull request and reviewer.
3. **Answer keys are signed.** The family's expected values, once confirmed, become a signed answer-key test (C5.7). The release gate (C5.5) lets a form map out of the demo only when its answer-key test passes and is signed by the expert; a combination without a test only warns.
4. **Sample stays Sample until then.** The release gate on sources (C5.4) and the demo-only rule (C5.6) keep any value still marked Sample in the demo workspace as a "Demo release", never a real publish.
5. **Unsure rows** go to the tech lead's open questions and come back to the expert with the missing facts; they stay Sample meanwhile.
6. **Legal points** ("Unconfirmed: no counsel") are not settled by the expert's mark: they wait for counsel, as the founder decided (AIW-D64: no pilot on real client files until counsel has read the counsel pack).

## How this pack was made (so it can be checked)

* **Existing research first, then validated:** `official-sources/ircc/` (official forms, checklists, guides and pages saved 19–27 Oct 2026 with checksums in `manifest.json` and `canada/index.json`), `product/compliance-trace.md` (IRCC rules with quotes), `prototype/studio/samples/*.json` (the app's data and their citations), `prototype/studio/api/src/form-setup.ts` (form rules with quotes), the requirement snapshot `domain/requirements-2026-11-02/` (read-only), and the project's earlier reads of the CICC Code (`commercial/research/R3-legal-and-regulatory-constraints-2026-10-07.md`, read 7 Oct 2026; `ai-workers/research/rules-and-ai-positioning-2026-10.md`, 12 Oct; `product/screens/M3-agent-view/research-roles-and-solo.md`, 29 Oct).
* **The app's own output, not our reading of it:** the answer key's values were read from a fresh isolated copy of the app built from `main` at `8fc65d0b9`, after loading the finished demo story (US$0, live AI off).
* **No live re-read on 10 Nov 2026.** canada.ca, ircc.canada.ca and laws-lois.justice.gc.ca are not reachable from the cloud session (the network proxy refused them). Every quote therefore names the date of our saved copy. A value IRCC changes often (fees, financial-support amounts) is marked for re-reading on the Mac before it is relied on.
* **No personal names** (roles only, AGENTS rule 5). Sample people are "Client A (Sample)", "Partner (Sample)" and so on.

## For the tech lead

The pack also surfaced product corrections (answer key, "Corrections found"; Study permit §7; checklist "Gaps"). They are listed for the tech lead to shape into backlog rows; this pack changes no product code and no record file.
