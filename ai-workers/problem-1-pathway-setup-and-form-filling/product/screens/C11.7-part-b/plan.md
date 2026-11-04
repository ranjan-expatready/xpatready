# C11.7 part B — Provincial nominee from its paper twins (forms lane, 4 Nov)

Row: `qa/CAPABILITIES.md` C11.7; verdict `qa/verdicts/2026-11-04-C11.7.md` (qa-2, #851). Pack: `prototype/studio/acceptance/C11.7.test.ts`, 18/21; part B red (3 cases).

## Why part B is red (found on main d4146dbd)
On Reset to the six, Provincial nominee › Express Entry stream gets its 8 official PDFs into the library, but its form
lines come only from the form finder's replay, and no saved finder answer matches its canada.ca page ("No saved AI
answer for these exact pages yet"), so the combination has **0 form lines**, no nomination certificate line and no
Online lines. Live AI is off (US$0): a new finder answer is not an option.

## Plan (the product's own steps; no form number in code, P-319)
1. `samples/wave1.json` (the sample file, data): the Provincial nominee setup gains `lines`: the forms a person puts on
   the combination from the library (IMM 0008, 5669, 5406, 0008 DEP, 5476: P-109), each with whose form it is and its
   channel (IMM 5669 and IMM 5406 Online, P-171 (3), Sample), and `documents`: the provincial nomination certificate,
   required (P-109), with its source cited from `official-sources/ircc/` (page, quote, date) or labelled Sample.
2. `api/src/demo.ts` `loadSix`: for a setup with `lines`, after the intake and the finder replay, the loader does what a
   person does on the Forms and Documents tabs, through the same services: add each library form to the combination
   (`addFormLine`, origin HUMAN, its quote), set its channel through the channel route (refused where IRCC does not
   accept it), and add the document line through the Documents service (a new document type waits as a proposal for a
   second person, so the load still writes no document type itself: part A stays green). Nothing near the LMIA lines.
3. Tests: C11.7 21/21 on the six (twice) and on its fixture (twice); the suites of the files touched; a failing test for
   a line naming a form the library does not hold (the load stops with the reason, never a silent miss).
4. A 1440 px walk of Provincial nominee › Forms and Documents in the PR.
