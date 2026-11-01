# Visitor visa setup re-walk — main 6d5d751c (1 Nov 2026, qa-2)

**Why:** the tech lead asked for Visitor visa setup to be walked again end to end on main between merges, with the gap list updated (P-220). qa-1's baseline (`2026-11-01-vv-baseline.md`, G1–G34, on 25cefb67) used the older "Load sample inputs". Since #113, the Demo menu loads the six (`samples/wave1.json`) or the configured checkpoint, so this walk starts from what a person gets today.
**Copies (isolated, US$0, no STUDIO_*_LIVE):** qa_vv :4473 (Demo › Load sample, i.e. `{"sample":"six"}`) and qa_g :4474 (Demo › Load the configured checkpoint). Screenshots: `2026-11-01-vv-setup-rewalk/`.

## Where a person stops
* **After Load sample (six), before any draft is accepted:** Visitor visa has 6 errors, all "Turn '…' into a rule" (conditions in words only).
* **After the drafts are accepted and applied (the configured checkpoint):** **177 problems to fix**, so it can't be submitted.
  * 120 facts are asked of nobody: Applicant 53, Spouse or partner (travelling) 46, Child (travelling) 47, Representative 20 (shown per role on Questionnaires as "· 0 questions").
  * 48 fields have no decision.
  * 6 conditions are still in words.
* **The root cause is new compared with the baseline: the library has 0 sections** (`logical_section` is empty). "Add a library section…" has 0 options, and no screen creates a section. In the baseline, `setup_visitor_visa.ts` seeded "Your visit" and "Previous countries of residence" by SQL (G4). **New QA-144 (Gap · Major).**

## The setup gaps on main (G1–G14 from the baseline)
| Gap | On 6d5d751c | Evidence |
|---|---|---|
| G1 Official pages has no Confirm on screen | **Open**: the header says "Waiting for the immigration expert: Choose the checklist page (No page matches)"; no Confirm button | `vv--1440.png` |
| G2 Answer lists from the form's lists, linked on screen | **Open**: no answer-list screen in `web/src` (the only hit is the runtime questionnaire) | code |
| G3 Option maps only by API | **Open**: no option-map screen in `web/src` | code |
| G4 New sections can't be added on screen | **Open, and wider**: 0 library sections, so nothing to add (QA-144) | `vv-questionnaires-1440.png` |
| G5 Facts asked of nobody, one at a time | **Open, and wider**: 120 facts across 4 roles, every role at 0 questions (QA-144) | `vv-questionnaires-1440.png` |
| G6 Section checks can't be written on screen | **Open**: C3.14 (Works today) lists checks read-only and says they "change on their combination's Questionnaires tab", but that tab has no Add check | code, `c314-checks-*.png` (after-merge 9) |
| G7 Documents: "Draft them from IRCC's checklist" with no button | **Open**: the words are still there (`documents.tsx:64`) and the only button is "Add a document". The C2.6 replay is in PR #277, not merged | `vv-documents-1440.png` |
| G8 Signature "Not set" releases anyway | **Open**: 9 "Not set" on the Forms tab | `vv-forms-1440.png` |
| G9 QA-138 Draft with AI offers "Live AI call … up to US$5" while AI is off | **Open**: the dialog still offers it (the server refuses it; nothing spent) | — |
| G10 Section headers by system key | Not seen: there are no sections to head | — |
| G11–G13 Validation, To review words, release numbers | Not reachable: nothing can be released from the Demo menu | — |
| G14 "Forms AI picked: confirm" after release | Not reachable (no release) | — |

**Closed since the baseline, on the runtime side:** G16 (firm, representative of record and case team, C6.11 Works in after-merge 9). Partly closed: G28, where #283 (fees) is still open.

## For builders B1–B5 and M3-A/M3-B
The order that unblocks Visitor visa from the Demo menu: sections (QA-144: C4.11/C3.4 drafting from sources, or a Sample section path for the checkpoint) → facts per role (G5) → the 48 field decisions → conditions to rules → IMM 5257's saved field-map answer (a founder-approved paid run, row 12) → release. Until then, M3 builds run on `setup_visitor_visa.ts` (pack 4 J7 starts there too).

## Question for the tech lead
Should the configured checkpoint carry Sample sections for Visitor visa (the two the script seeds), so that the P-220 path can be walked from the Demo menu before C4.11 lands? My recommendation: yes, marked Sample, through the same services.
