# V4 follow-up: capability texts for the top 5 gaps (draft for the tech lead, 3 Nov 2026)

This draft is under P-291 (1). Source: `V4-best-in-class.md` §3. I have not edited `BACKLOG.md` or `qa/CAPABILITIES.md`. The tech lead decides what becomes a row, where it goes and in what order.

Each gap below gives:
* what a firm can do;
* the competitor bar, with its source in V4 §5;
* what already exists in our records, so nothing is duplicated;
* a testable "Done when";
* cost and open points.

Immigration values in tests stay Sample until the immigration expert confirms them (AGENTS rule 4). Legal points are marked "Unconfirmed: no counsel".

---

## G1. One application from start to finish on the demo, and setup time measured

**What a firm can do.** After one Reset, someone opens Visitor visa and sees it released. They open a family case on it and see the client questionnaire. They get IMM 5257 filled with the family's Sample answers. Separately, the firm (or ExpatReady) can see how long a combination took to go from "Not started" to "Live".

**Competitor bar.** Every product in V4 sells this loop: answers in, filled forms out. Ready catalogues mean the firm does no setup at all: Officio "over 400 forms", Migrawise "234 forms, auto-suggested by case sub-type", eImmigration "120+ pre-built case templates".

**What exists.**
* Row UX-D seeds a family case and links Cases. It cannot work while no combination is released.
* The configured checkpoint (C10.1, Partial) stops at row 10 "No combination can be released yet": Visitor visa has 386 problems.
* IMM 5257's field map waits for a paid run (checkpoint row 12).

**Capability text (proposed).** "Demo › Reset to the six leaves Visitor visa released (release 1) from saved answers at US$0, with one family case (principal, spouse, one child, Sample) opened on it. The firm sees each combination's time from first setup step to release."

**Done when.**
1. After one Reset to the six on a fresh copy, with no paid run:
   * Visitor visa's header reads Live, release 1;
   * Cases lists one family case on release 1;
   * the client link shows that family's questions;
   * a filled IMM 5257 for the principal reads back equal to the case's Sample facts.
   Each is a scripted check with a pass test and a fail test. The fail test: the same check on a copy whose Visitor visa has one open release blocker must show "Nothing is released yet" and no case.
2. Every release is still made by a person other than the author and the content reviewer. The seeding uses the same services and duties as the screens; a test proves the server refuses a seeded release with the same actor as the author.
3. Each combination's overview shows "Set up in N h of work over D days" (or "Not released yet"), computed from the activity record. Pass test: known timestamps give the expected figures. Fail test: a combination with no release shows no figure.
4. qa walks configure → case → filled form at 1440 px and 400 px, axe clean.

**Cost and open points.**
* US$0 if Visitor visa's remaining field maps can come from saved answers. If IMM 5257 needs the paid field-map run (checkpoint row 12), state the usual and worst cost first and wait for the founder's Go.
* **Question for the tech lead:** is "time to first release" the right firm-facing measure? I recommend yes. It is our real competitor metric if ExpatReady configures centrally (V4 §7).

---

## G2. Read the client's documents into answers, showing where each value came from

**What a firm can do.** The client uploads a passport (later a study permit, a marriage certificate and others). The case shows each value read from it as a proposal, and names the document it came from. A value that disagrees with the client's answer is flagged before anyone files.

**Competitor bar.**
* Migrawise: "Field-level provenance: see which doc each value came from"; a "Needs review" flag when a document and the questionnaire disagree.
* CampLegal: document processing across 50+ categories.
* Imagility: OCR on passports and I-94s.
* Docketwise: IQ Data Capture, in closed beta.
* Filevine: OCR in any language.

**What exists.**
* C6.5 (M3, Not built) and rows L-SA7 ("Confirm & use" per document) and L-SA9 (passport check digits) already define the reading and confirming.
* Missing from them: (a) **provenance shown on the filled form and the agent view**; (b) a **conflict flag between a document value and a client answer**.

**Capability text (proposed, as an addition to C6.5).** "Every fact filled from a document shows that document's name and page on the agent view and on the form's review. A document value that differs from the client's answer for the same fact is shown as a conflict on To review and blocks 'ready to file' until a person picks one, with a reason."

**Done when.**
1. With a Sample passport whose check digits pass, the agent view shows each value read with "From: passport, page 1". Pass test: provenance present on all values read. Fail test: a value typed by the case officer shows no document source.
2. With a Sample passport whose birth date differs from the client's answer, To review shows one conflict naming both values and both sources. "Ready to file" is refused in words until a person chooses, and the choice records who, when and the reason. Pass and fail tests.
3. No value read from a document reaches a filled form before "Confirm & use" (L-SA7). The existing test stays green.
4. US$0 on Saved, using the stand-in reader. A live reader is used only on the founder's Go with the cost first. Sample documents only until counsel (P-133).
5. Legal point (keeping documents, privacy): Unconfirmed: no counsel.

**Cost and open points.** Document kinds after the passport are the founder's order to choose. I recommend passport, then the IMM 5257 supporting set the expert names.

---

## G3. Fill IRCC's online portals from the case

**What a firm can do.** For an application IRCC takes only online, the representative opens the portal screen. One click fills that screen from the case, and they check it before moving on.

**Competitor bar.**
* Visto: "1-click IRCC web form autofill", PR Portal and Express Entry.
* Migrawise: a Chrome extension "talks directly to the IRCC New Portal", visitor and super visa today (version 3.8.4, 3 Sep 2026).

**What exists.**
* C7.4 (M4, Not built) defines the extension: it never clicks Next or Submit and never fills declarations.
* C2.8 and C2.9 (portal capture) are not built; the extension is parked (P-102, W6).
* C7.3, the portal sheet with copy buttons, is Partial. It is the stop-gap.
* The demo labels online forms "Online (typed in by hand for now)".

**Capability text (proposed, a first slice that moves part of C7.4 earlier).** "For one portal and one application (recommended: the IRCC Portal's visitor visa, where the Canadian competitors started), the representative fills each captured screen from the case in one click. Each filled value matches the portal sheet (C7.3). The extension never clicks Next or Submit and never fills a declaration or signature."

**Done when.**
1. On a recorded copy of each captured screen (structure only, never a live login), one click fills every mapped field with the case's value. The filled values equal the portal sheet's values for the same case: one pass test per screen.
2. A screen whose structure changed since capture fills nothing and says "This screen changed: re-capture it". Fail test with a changed copy.
3. A test on the recorded screens proves the extension never clicks Next or Submit and leaves declaration and signature fields empty.
4. US$0 on Saved. AI-vision matching is used only on the founder's Go with the cost first.
5. Terms of use and automation of IRCC's portals: Unconfirmed: no counsel. This must be answered before any use on a live portal.

**Cost and open points.** **Question for the tech lead:** this is M4 and parked today. I recommend asking the founder whether a one-application slice moves into M3, because it is where the Canadian competitors win on daily typing. Capturing the real blank screens needs the founder (C2.9).

---

## G4. A client questionnaire written for clients, in their language

**What a firm can do.** The client opens their link and reads questions in plain words, not field names, in the language they choose (English or French first, then others the firm turns on). Their answers are kept in English for the forms.

**Competitor bar.** Docketwise offers 12 languages, eImmigration 13, CampLegal 17–18, LollyLaw 20+ and Filevine up to 170. Visto has one-click translation. CampLegal also lets staff "review, flag questions, hide sections" before answers enter the profile.

**What exists.** Row UX-E (AI drafts each question's wording from the official form text, with a "Needs wording" filter) covers the wording. Nothing in our records covers the client's language.

**Capability text (proposed, wording by UX-E plus a new language part).** "Every Smart questionnaire question has accepted client wording (UX-E). The client picks the language of their link from those the firm turns on. Each translated question is a proposal a person accepts, quoting the English it came from. The answers fill the forms the same way whatever the language."

**Done when.**
1. Once wording is accepted, no client-facing question shows a field name. A scripted scan of the client link for the Sample family finds none (UX-E's Done-when, kept).
2. Switching the link to French shows every question in French, each one accepted by a person. A question with no accepted translation shows in English with "Not yet in French". Pass and fail tests.
3. The same Sample family answering in English and in French produces identical filled forms: a read-back test on IMM 5257.
4. Translation runs on Saved at US$0. A live run happens only on the founder's Go, with the usual and worst cost first.
5. Whether translated questions need the immigration expert's sign-off: a question for the founder (a P-240-style rule).

**Cost and open points.** IRCC itself publishes English and French. I recommend French first and other languages only on firm demand.

---

## G5. A firm-visible promise on new form editions

**What a firm can do.**
* When IRCC publishes a new edition of a form, the firm is told within a stated time.
* The firm sees which combinations and which open cases use the old edition.
* Signed or uploaded work on the old edition is marked "check it" and is never changed silently.

**Competitor bar.**
* Docketwise updates "within 5 business days", migrates prepared forms automatically and offers "Switch to the previous version".
* Filevine promises 72 hours.
* LollyLaw adds new editions "within an hour" and marks outdated forms "sunsetting" or "expired".
* Visto's "IRCC Form Monitor" notifies firms.

**What exists.**
* C9.1 (M2, Partial): a new edition is held and compared field by field; the impact is computed by rules.
* C9.2 (M3, Not built): a changed fact marks items stale.
* C2.x reads editions and checksums.
* Missing: a **watch** on IRCC's form pages, a **stated time** to a released new edition, and the **edition view on open cases**.

**Capability text (proposed).** "A scheduled check reads each library form's IRCC page and records any new edition as held, with the date found. To review shows it with 'Found N days after IRCC published it'. The combinations and open cases on the old edition are listed. Signed, uploaded or filed items on the old edition get a 'New edition: check it' mark and are never changed. The firm can see each form's edition and when it was checked."

**Done when.**
1. Against a recorded copy of an IRCC form page whose edition date changed, the scheduled check creates one held edition with the found date. The unchanged copy creates none. Pass and fail tests, US$0, no live fetch in tests.
2. The impact list names every combination and every open case on the old edition. A test seeds two cases, one on each edition, and expects only one listed.
3. A signed item on the old edition shows the mark and is byte-identical before and after (C9.2's rule). Test included.
4. Each form in the Form library shows "Edition MM-YYYY · checked <date>". A form never checked shows "Not checked yet".
5. The time to a released new edition is a number the tech lead can quote. The target, for example 5 business days, is the founder's to set.

**Cost and open points.** How often the check runs is cost-free but polite to IRCC. I recommend daily. **Question for the tech lead:** should an old edition stay usable after IRCC stops accepting it? Docketwise allows the previous edition only "if USCIS still accepts" it. I recommend the same rule, with IRCC's accepted-until date quoted.

---

**Overlap summary for the tech lead.**

| Gap | Overlaps | Kind of change |
|---|---|---|
| G1 | UX-D and C10.1 | Extends them to "released", adds one new measure |
| G2 | C6.5 | Adds provenance and conflicts |
| G3 | C7.4 | Asks to move a first slice earlier |
| G4 | UX-E | Adds the client's language |
| G5 | C9.1 and C9.2 | Adds the watch, the stated time and the case view |

None needs spend except the live runs named, each on the founder's Go with the cost first.
