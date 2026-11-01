# J1 — Forms in (pack 1: C11.16, C11.15, C11.3, C11.11, C3.12, C2.4, C1.6)

Numbered steps with the expected result at each step; the builder turns them into a browser check (`tests/check_*_browser.cjs`) in the PR that makes them pass. The data underneath each step is checked by the API tests in `acceptance/<capability>.test.ts`. Written 1 Nov 2026 against main 25cefb67; "fails today" marks what is missing.

**Every run:** an isolated copy (`zsh tools/isolated.sh j1 4580 start`), Reset then Load sample, **no live switch** (US$0; the AI ledger must not move). People: Configuration author (user-A) unless a step says otherwise; Approver (user-B); Content reviewer (user-C); Case officer (user-O); Client A (user-P). Widths 400, 1024 and 1440 px: no sideways scroll, axe clean on every page, every action by keyboard with a visible focus ring.

**Order:** Visitor visa (`vv.single`) end to end first; then the other five sample combinations (P-112), whose differences are listed at the end.

## Part A — structure, setup and the form finder (Visitor visa)

1. Open the app after Load sample. **Expect:** the menu reads, in this order, Program structure · Immigration programs · To review (P-125 (6)); no "New combination" anywhere; `/new` shows Page not found.
2. Open Program structure, Retail tab. **Expect:** tabs Retail and Corporate and employers; numbered outline 1 / 1.1 / 1.1.1 with the tooltip "Not an IRCC code"; Visitor visa sits under Temporary residence › Visitors with no sub-category (P-112).
3. Switch to List view. **Expect:** one line per combination, each with the full trail Retail › Temporary residence › Visitors › Visitor visa › No sub-category; the view is remembered after a reload.
4. Press Add, type Category "Visiter visa" under Visitors. **Expect:** under the field "Close to Visitor visa (1 letter apart)" with its trail; Add asks first; "Add anyway" adds it; Activity shows who added it anyway. Then delete the typo (unused: Delete, asks why).
5. Type "visitor  VISA" as a new category. **Expect:** refused at once "already exists … choose it instead"; nothing saved.
6. Look for the AI "did you mean". **Expect:** on this copy, words that AI is switched off on this copy (no cost, nothing sent); the spelling check still runs. Never a dead button.
7. As Approver (user-B), open Program structure. **Expect:** no Add, Edit or Delete controls; the page still reads.
8. Open Immigration programs, Retail. **Expect:** Visitor visa is a card with its full trail; one "Add combination" opening the same Add pop-up in place, and the "Program structure" button (P-128 (5)) (P-128 (5) replaced the C11.16 row's one link "Add a program or combination in Program structure"; question for the tech lead in the PR). Start setup on a Not started card has an "i" tooltip saying what it does, with an example and how cases use it once Live (P-125 (3)).
9. Click the Visitor visa card. **Expect:** its workspace opens (never Program structure); the header shows the place Retail › Temporary residence › Visitors › Visitor visa as read-only text with a hint "Change it on Program structure"; no field there edits the name or level.
10. Forms tab of Visitor visa. **Expect (today fails, C11.15 AT-1):** the saved finder answer was loaded by Load sample: its run card says saved answer, US$0, and the lines IMM 5257, IMM 5645, IMM 5707, IMM 5409, IMM 5476, IMM 5475, IRM 0002 show "Picked by AI · Sample" with no confirm step; IMM 5484 shows "AI's two rounds disagree · you decide"; IMM 5782 "Not for this application"; Guide 5256 is read, never a line. **Sample:** which of these forms Visitor visa needs is Sample until the immigration expert confirms; IMM 5476 is conditional ("only if you are appointing a representative", IRCC-F05a) and the Family Information form is the one the country package lists (IMM 5707 for New Delhi, IRCC-F09), so the line for IMM 5476 says "Only when a representative is appointed" and only one of IMM 5645 / IMM 5707 is expected once the expert confirms the package.
11. On IMM 5257, open ⋯. **Expect:** Redo with AI (Find, Read, Match, each with its cost first and Stop), Replace edition, Remove; one Undo for the tab.
12. Replace on IMM 5257. **Expect:** "IMM 5257 (09-2023) is canada.ca's current file", nothing changes, US$0.
13. Remove IMM 5409 (asks first), then Find again with the saved answer. **Expect:** IMM 5409 stays under "Removed in this draft" with Add back; Find again does not bring it back; Undo restores the last step only.
14. Make one form missing (test aid) and Find again. **Expect:** the form shows "not found" with Upload PDF and Find again; uploading a PDF with no printed number shows "Waiting for a person · no AI call was made · US$0" and nothing is attached.
15. "Who can be in this application" at the top of Questionnaires (or Before forms). **Expect:** set Spouse fewest 2, most 1 → Save refused in plain words under the field, nothing saved; a valid change saves with "Saved by … at …" and Undo; a second tab saving the old version gets the reload message.
16. Shared library › Forms, IMM 5257. **Expect:** Delete greyed with its reason; Retire on an unused-by-release checklist (IMM 5881) waits for a second person; the author cannot approve it; Approver approves on To review; then it is not offered to attach.
17. Check Activity and the AI work list. **Expect:** no live run, ledger unchanged (US$0).

## Part B — the Form library, editions and channels (Visitor visa)

18. As the author, open Shared library › Forms. **Expected:** one list (no groups) with the columns Number, Title, Type,
   Edition as printed (e.g. "IMM 5257 (09-2023)"), Published, Field map, Used by, Status; filters Type, Used by, Status and
   a search box. (C3.12; Published is missing today, AT-3.)
19. Filter Type = Checklist. **Expected:** only checklists (IMM 5484, IMM 5488, IMM 5881, IMM 5905); each shows "Read by AI"
   and Field map "No field map", with the tip "Guides and checklists are read by AI, never filled". (C11.11 AT-1, IRCC-F06.)
20. Open IMM 5484 and try "What IRCC accepts". **Expected:** not offered for a checklist; if reached, the words say it is
   read by AI and never filed. (C11.11 AT-2.)
21. Open Visitor visa › Forms tab. **Expected:** no "Add form", "Choose file", "Attach official form / checklist / sample
   file"; the only ways in are "Find forms with AI (about US$…)" / Find again (opens the finder) and "Add a form from the
   library" (the picker). Overview shows status, next step, counts and "Missing before firms can use it" only. (P-118.)
22. Run the finder on saved answers. **Expected:** the run card's steps say "Rules found a sure match … No AI call was made",
   "saved answer, US$0" for both AI rounds; 7 forms attached or already there; the cost line stays US$0.
23. Look at the attached lines. **Expected:** no checklist or guide appears as a form line (IMM 5484 stays a source read by
   AI). (QA-101; C11.11 AT-5/AT-6 fail today.)
24. Open "Add a form from the library" (picker). **Expected:** only IRCC forms that are ready; checklists and guides are not
   offered as form lines (today the picker lists them; question for the tech lead in the PR).
25. Pick IMM 5257 again. **Expected:** "IMM 5257 is already one of this combination's forms." in words, nothing added.
26. Pick IMM 5802 (listed by IRCC, no file). **Expected:** "listed by IRCC but has no file in the library yet: upload its
   PDF in the Form library, or let the form finder download it", with a link to the Form library.
27. Each form line shows its channel chip (Online · PDF upload · Paper · Not needed) and signature; the header names the
    filing method. **Expected:** each AI-found line says the channel is proposed with IRCC's line and waits for a second
    person, or is already recorded (fails today: saved answers predate channels, C1.6 AT-10). Open IMM 5257's channel
    menu: only the channels IRCC accepts for the combination's IRCC account are offered; a misfit signature is said in
    words before saving. (IRCC-F04.)
28. Switch to the Approver; open To review › the "What IRCC accepts" change. Approve. **Expected:** the line shows "Set by a
    person · Sample"; the proposer sees no Approve on their own change.
29. Programs list: the Visitor visa card shows one small tag: PDF only, Online only or Mixed. **Expected:** never
    "Checklists only". (P-208.)
30. As the author, Form library › Upload PDF with two official files (imm1294e.pdf, imm5645e.pdf). **Expected:** one card
    per file, steps "Rules check the file …", "Read what this file is: rules first", each ends added with its printed
    edition; no combination touched; US$0. A .txt file: "This is not a PDF file. Only IRCC PDFs can be uploaded here."
31. Upload the same IMM 5257 file again. **Expected:** "Already in the library: IMM 5257 (09-2023). Nothing duplicated."
32. Edition change (C2.4, on an empty library: Reset, upload imm5476e-2021.pdf, then imm5476e.pdf). **Expected:** the second
    card says "Held as a new edition: nothing changes until a person reviews its impact" with "Review impact". Open it:
    counts unchanged / reworded / new / removed, the combinations it touches, "Compared … without AI". Accept.
    **Expected:** the Forms list shows IMM 5476 (11-2025), its older edition 11-2021 "Kept for the record"; the combination
    using it shows the change in its draft only; the published configuration is unchanged until release.
33. Upload imm5476e-2021.pdf after that. **Expected:** "Older edition: not used" (today "Already in the library", C2.4 AT-9).
34. Refusals: as Approver press Accept on an impact review — no button (403 behind it); two tabs accept at once — the
    second says "Someone decided this edition at the same moment. Refresh to see it."; as Case officer and Client the
    Form library is not in the menu and its address says Page not found.

## The other five sample combinations

Part A uses P-112's names; Part B's notes use today's sample keys (`sv.super_visa`, `sp.student`, `wp.family`, `lm.high_wage`, `fs.outside`): With an LMIA = Employer-specific work permit › With an LMIA – inside Canada; High-wage position = Corporate LMIA › High-wage position; Applicant outside Canada = Spouse or common-law partner sponsorship. Super visa is not one of P-112's six; its notes apply only while today's sample is loaded. The tests find combinations by their structure trail (`acceptance/lib/pack1.ts`).

### Setup and finder (Part A)
* Study permit › Outside Canada: same steps 9–17, but no saved finder answer: the Forms tab offers one "Find forms with AI (about US$… · at most US$…)" and, on this copy, says AI is switched off with "Find form numbers by rules (free)"; nothing runs before a click. Today the sample has Study permit › No sub-category (C11.3 AT-9.2 fails).
* Employer-specific work permit › With an LMIA – inside Canada: released (Live) in the sample; its card opens the workspace with Release 1; Remove/Replace work in a new draft; Undo refuses "Released since". Today named "With an LMIA" (AT-9.3).
* Provincial nominees › Express Entry stream: Not started card; Start setup → workspace with the offer, no run (C11.16 AT-7). Missing from today's sample (AT-9.4).
* Family sponsorship › Spouse or common-law partner (no sub-category): Not started → Start setup as above. Today split into Applicant outside / in Canada (AT-9.5).
* Corporate and employers › Temporary residence › Labour market impact assessment › High-wage position: on the Corporate tab only; same Start setup steps. Today the Program is named "LMIA" (AT-9.6).

### Library, editions and channels (Part B)
* **Super visa (sv.super_visa):** shares IMM 5257 with Visitor visa; step 32's impact review lists both combinations; the
  saved IMM 5257 field-map draft lives here (J2 starts here for IMM 5257).
* **Study permit (sp.student):** the QA-101 case: after Find, IMM 5483 (Document Checklist) must not be a form line; Guide
  5269 shows as a source read by AI.
* **With an LMIA (wp.family):** released sample; today it carries IMM 5488 and IMM 5905 (checklists) as PDF upload lines
  (C11.11 AT-6): expected none; its card tag reads "PDF only"; set IMM 5409 to Paper → tag "Mixed".
* **High-wage position (lm.high_wage):** LMIA Online (ESDC) is an online-only form with no PDF (P-152): the finder flags
  "Online only · no official PDF"; the line is Online; the tag is Online only or Mixed, never PDF only.
* **Applicant outside Canada (fs.outside):** spouse sponsorship through the PR Portal: IMM 5476 appears only "when a
  representative is appointed" (IRCC-F05) and the Family Information form (IMM 5707 or IMM 5645) is listed (IRCC-F09).
