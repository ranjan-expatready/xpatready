# J4 — Questionnaires to release (P-220 pack 2)

**Who:** the configuration author (`user-A`), the content reviewer with the immigration expert duty (`user-C`), the approver (`user-B`). **Combination:** Visitor visa (`vv.single`) once J3 has filled it; Work permit (family) (`wp.family`) meanwhile, because it already has questions.
**Capabilities:** C11.12, C4.1, C4.2, C4.7, C4.6, C4.8, C11.10, X1a. **API checks:** `acceptance/C11.12.test.ts`, `C4.1.test.ts`, `C4.2.test.ts`, `C4.7.test.ts`, `C4.6.test.ts`, `C4.8.test.ts`, `C11.10.test.ts`, `X1a.test.ts`. **IRCC rules:** `product/compliance-trace.md`, Pack 2.
**Money:** US$0 (Rules and Saved only). **Start:** a fresh isolated copy, Reset, Load sample.

Each step: what the person does → what they must see (and what the data must hold). A builder turns these into browser checks at 1440 and 1024 px (and 400 px for steps 1, 6 and 15), axe clean, keyboard only for steps 3, 7 and 11.

## A. Empty combinations never go out (X1a)
1. **Open Visitor visa before J3 (no form, no document).** → Review and release says "Nothing to release yet: this combination has no forms and no documents…", naming Find forms; **Send for review** is disabled with that reason.
2. **Add IMM 5257, then remove it.** → The message disappears, then comes back. As the approver, the Release page holds Visitor visa back with the same words (or does not list it); Release never releases it.

## B. Who can be in this application (C11.12)
3. **Questionnaires › Who can be: list Principal applicant (1), Spouse or partner (0–1), Child (0–4), Representative (0–1).** → Each line has *How they file*: Own application · On the principal's filing, applying · Declared only. Defaults: the principal *Own application*; the representative *Declared only* and nothing else offered.
4. **Set Child to On the principal's filing, applying.** → A line under the list says "2 filings: Principal applicant (with Child) · Spouse or partner". Tooltip: applicants get their own forms, questions and documents (IRCC-P2-02, P2-03).
5. **Try to set the principal to Declared only.** → Refused in words. **Save, reload.** → The choices are kept; the sample's label reads *Principal applicant*, never *Applicant* (P-209).

## C. The questionnaire per person (C4.1)
6. **Open Questionnaires on Work permit (family).** → One chip per person role with its count of questions; no role shows a gap. A fact the passport supplies (e.g. family name as on the passport) is not asked: it shows *From the passport*.
7. **On the second section's header click Move up.** → It becomes first; Move up is disabled on the first section and Move down on the last, each with a tooltip saying why. The section title is the library's one title.
8. **Open Review.** → "Section order changed: … moved up" is a change line, in words. The released questionnaire still has the old order.

## D. PQR picks (C4.2, C4.7)
9. **Open the PQR tab.** → Every question the SQR asks of a Client or from a Document can be ticked; a case-officer fact has no tick box and says why on hover.
10. **Click Draft PQR picks (Rules only).** → Picks wait in the queue, each with its reason and *From the rules* (never AI until a saved AI run exists). Nothing is ticked yet.
11. **Accept one pick, remove another with a reason.** → The accepted pick is ticked on the PQR tab with its reason; the removed one is not. The country PQR view does not show the tick yet.
12. **Tick the same question in two tabs at once.** → One wins; the other says in plain words that the question changed and to reload (QA-125: never "not found", never "the database").

## E. Preview by person (C4.6)
13. **Set Visitor visa's IMM 5257 to PDF upload, signed by hand and scanned; IMM 5707 from age 18; IMM 5476 for the principal, signed by the person and the representative.**
14. **Open Preview, Principal applicant.** → Under *PDFs to upload*: IMM 5257, IMM 5707; under *PDFs to sign*: IMM 5257 (signed by hand and scanned, by the principal), IMM 5476 (by the principal and the representative).
15. **Switch to Child (under 18).** → IMM 5257 under *PDFs to sign*, signed by a parent or legal guardian (IRCC-P2-06); no IMM 5707 (IRCC-P2-04).
16. **Switch to Representative.** → No IMM 5257; IMM 5476 under *PDFs to sign* (IRCC-P2-09).

## F. One review and release (C4.8)
17. **As the author, Send for review.** → Review lists every change in words: the PQR tick ("…: pre-qualification"), the section order, the people's filing modes, alongside forms and documents. There is no separate *Approve PQR* or *Release questionnaire* button anywhere.
18. **As the content reviewer (expert duty), sign every line; as the approver, Release.** → One release; the country PQR now shows the tick under this combination.

## G. Back on Immigration programs (C11.10)
19. **Open Immigration programs.** → The released combination's card says ✓ Live, Open, and no setup step as its next (QA-129); each card in setup says "n of 5 steps", one button (Start setup · Resume setup) and the same next step as its own header.
20. **Switch to List, sign in as the approver.** → The approver still sees Cards, and Open on every card; back as the author, List is kept.

**Done when:** every step's expected result holds on `main`, the API checks named above are green and moved into `tests/`, and qa has walked J4 like a person.
