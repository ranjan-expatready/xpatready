# J4 — Questionnaires to release (P-220 pack 2)

**Who:** the configuration author (`user-A`), the content reviewer with the immigration expert duty (`user-C`), the approver (`user-B`). **Combination:** the six from the Demo menu (Reset, Load sample). Part A on an empty one of the six (Work permit with an LMIA inside Canada, `wp.lmia_inside`); parts B, E and G on Visitor visa (`vv.single`); parts C, D and F on Visitor visa once J3 has given it questions (**needs first**: J3 / C4.11). Part B's PR family modes on Spouse sponsorship (`fs.spouse`). Until J3 is green, the API checks of C, D and F run on the suites' older fixture (`wp.family`, 4th argument) — a stand-in no person sees.
**Capabilities:** C11.12, C4.1, C4.2, C4.7, C4.6, C4.8, C11.10, X1a. **API checks:** `acceptance/C11.12.test.ts`, `C4.1.test.ts`, `C4.2.test.ts`, `C4.7.test.ts`, `C4.6.test.ts`, `C4.8.test.ts`, `C11.10.test.ts`, `X1a.test.ts`. **IRCC rules:** `product/compliance-trace.md`, Pack 2.
**Money:** US$0 (Rules and Saved only). **Start:** a fresh isolated copy; Demo menu › Reset, then Load sample (the six).

Each step: what the person does → what they must see (and what the data must hold). A builder turns these into browser checks at 1440 and 1024 px (and 400 px for steps 1, 6 and 15), axe clean, keyboard only for steps 3, 7 and 11.

## A. Empty combinations never go out (X1a)
1. **Open Work permit with an LMIA inside Canada (no form, no document after the load).** → Review and release says "Nothing to release yet: no form is set up on this combination and it has no documents…" (UX-A part 1 words), naming Find forms; **Send for review** is disabled with that reason.
2. **Add IMM 5710, then remove it.** → The message disappears, then comes back. As the approver, the Release page holds Visitor visa back with the same words (or does not list it); Release never releases it.
2a. **The bug's real case:** with a combination that can be sent for review, send it, then remove its last form and document lines. → As the content reviewer, signing the waiting submission is refused in words; as the approver, Release is refused (`acceptance/X1a-submitted.test.ts`).

## B. Who can be in this application (C11.12)
3. **Questionnaires › Who can be: list Principal applicant (1), Spouse or partner (0–1), Child (0–4), Representative (0–1).** → Each family line has *How they file*. On Visitor visa (temporary residence) the only choice is *Own application* (P-135; IRCC-P2-02). The representative has no *How they file* (not family).
4. **Save.** → A line under the list says "3 filings, one per person applying; they can be submitted together" (IRCC-P2-28). Tooltip: applicants get their own forms, questions and documents (IRCC-P2-02, P2-03). On Applicant outside Canada (PR family), Child offers *On the principal's filing, applying* (then "1 filing: Principal applicant with Child") and *Declared only* for a child who does not come (Sample, P-135).
5. **Try to set the principal to Declared only.** → Refused in words. **Save, reload.** → The choices are kept; the sample's label reads *Principal applicant*, never *Applicant* (P-209).

## C. The questionnaire per person (C4.1)
6. **Open Questionnaires on Visitor visa.** → One chip per person role with its count of questions; no role shows a gap. A fact the passport supplies (e.g. family name as on the passport) is not asked: it shows *From the passport*. The sections include *Your visit* and *Previous countries of residence*; every header is a title in words, never a system key (qa-1 G4, G10 / QA-133); no line says a fact is "asked of nobody" (G5).
7. **On the second section's header click Move up.** → It becomes first; Move up is disabled on the first section and Move down on the last, each with a tooltip saying why. The section title is the library's one title.
8. **Open Review.** → "Section order changed: … moved up" is a change line, in words. The released questionnaire still has the old order.

## D. PQR picks (C4.2, C4.7)
9. **Open the PQR tab.** → Every question the SQR asks of a Client or from a Document can be ticked; a case-officer fact has no tick box and says why on hover.
10. **Click Draft PQR picks (Rules only).** → Picks wait in the queue, each with its reason and *From the rules* (never AI until a saved AI run exists). Nothing is ticked yet.
11. **Accept one pick, remove another with a reason.** → The accepted pick is ticked on the PQR tab with its reason; the removed one is not. The country PQR view does not show the tick yet.
12. **Tick the same question in two tabs at once.** → One wins; the other says in plain words that the question changed and to reload (QA-125: never "not found", never "the database").

## E. Preview by person (C4.6)
13. **Set Visitor visa's IMM 5257 to PDF upload, signed by hand and scanned; IMM 5707 from age 18; IMM 5476 for each applicant 18 or older, only if a representative is used, signed by the person and the representative; IMM 5409 once for the couple; IMM 5475 once for the application.**
14. **Open Preview, Principal applicant.** → Under *Filled PDF to upload*: IMM 5257; each PDF the principal signs says so and how (IMM 5257 signed by hand and scanned; IMM 5476 with the representative). IMM 5409 under *Filed once for the couple*, IMM 5475 under *Filed once for the application*, each once across the family.
15. **Switch to Child (under 18).** → IMM 5257 is the child's own, signed for them (by whom — the principal, the Sample rule, or a parent or legal guardian, G5256 — is the founder's open question); no IMM 5707 (IRCC-P2-04) and no IMM 5476 of their own.
16. **Switch to Spouse or partner, then Representative.** → The spouse has their own IMM 5476 to sign (a separate form, IRCC-P2-09); the representative has no IMM 5257 and signs the IMM 5476s.
16a. **Set IMM 5707 to Online.** → It moves under *Filled on the portal (Online)* with a note that portal filling comes in a later wave (P-102).

## F. One review and release (C4.8)
17. **As the author, Send for review.** → Review lists every change in words: the PQR tick ("…: pre-qualification"), the section order, alongside forms and documents. There is no separate *Approve PQR* or *Release questionnaire* button anywhere.
18. **As the content reviewer (expert duty), sign every line; as the approver, Release.** → One release; the country PQR now shows the tick under this combination.

## G. Back on Immigration programs (C11.10)
19. **Open Immigration programs.** → The released combination's card says ✓ Live and Open (whether a Live combination may still show steps 1–2 as open is QA-129, the founder's open question: not checked); each card in setup says "n of 5 steps", one button (Start setup · Resume setup) and the same next step as its own header.
20. **Switch to List, sign in as the approver.** → The approver still sees Cards, and Open on every card; back as the author, List is kept.

## H. Wrong person, same pages
21. **As the approver (`user-B`):** Who can be's Save, Move up / Move down, Draft PQR picks and the PQR ticks are not offered (or disabled with the reason); each API call answers 403.
22. **As the content reviewer (`user-C`):** the same, and Send for review is not offered; signing is.
23. **As the author (`user-A`):** Release is not offered for a draft they changed ("a different person releases it").

**Done when:** every step's expected result holds on `main`, the API checks named above are green and moved into `tests/`, and qa has walked J4 like a person.
