# qa baseline walk: Visitor visa end to end on main 25cefb67

## How
- Copy: `isolated.sh qa_vv 4475` (database xr_studio_qa_vv), app code = main 25cefb67. :4400 not touched. Screenshots: `2026-11-01-vv-baseline/`.
- Actors: author user-A, content reviewer user-C, approver user-B, case officer user-O, client user-P. Playwright on Chrome, 1440 px (client at 390 px).
- Sample loaded through Demo › Load sample inputs as the author. Live AI off, US$0: IMM 5257 drafted from the saved answer; no priced button pressed.
- API used only where no screen exists. Each use is named below and is a gap in itself. Scripts are in /tmp/qa-vv (not in the repo).

## Verdict
A person gets as far as filled PDF copies for a family of three today. Setup cannot be finished on screens: answer lists, option maps, two new sections and the section checks exist only through the API or SQL (`setup_visitor_visa.ts` 4.5). After that, release, opening a case, the questionnaire, confirming answers and generating a copy work. The first hard stop is Step 5, Documents. The case has no document checklist, no upload and no AI read: there is no screen and no API for any of them. After that, filing stops at a per-form "Filed" lock. There is no filing record, no fees, no signed-PDF step and no case-level "ready to file". IMM 5257 cannot be filed on this machine because Adobe Validate is not available here.

## Step 1 — Setup (author)
Works
- Program structure shows Temporary residence › Visitors › Visitor visa, and the card opens the workspace (01).
- Who can be in this application › Fill from the guide (Rules only, US$0) proposes 4 people with IRCC's quotes. Use these lines, then Save: step 2 shows ✓ (02).
- IMM 5707 › Add from library: "added from the library; no AI drafting needed".
- IMM 5257 › Draft with AI › Use saved AI answer (US$0). 84 proposals: Accept exact reuse (34), Accept clean new (22), 28 decided one by one (one needed a reason), then Apply to draft: "242 form fields, 37 new fields".
- Placing a fact on the library field page (section, from, repeats, question) clears its "asked of nobody" error (06).
- Documents › Add a document: 3 lines added (passport supplies 10 facts) (07). Preview shows the sample families, questions, documents and forms (08).

Gaps
| # | Gap (what a person cannot do, specific) | Capability | Lane guess | Blocks the next step? |
|---|---|---|---|---|
| G1 | Official pages has no Confirm on screen. Only the API has it (`POST …/official-pages/confirm`). The step stays "● Next" even after the combination is Live (QA-129). | C11.10 | forms | No |
| G2 | Answer lists for 13 choice fields (country, marital status, sex, visit purpose, and others) cannot be made from the form's lists or linked to fields on any screen. The script seeds them by SQL and links them by API. | C3.4, C3.6 | forms | Yes (choice fields fill nothing) |
| G3 | Option maps (answer value → IMM 5257 code) are drafted and corrected only by API (`/editions/:id/option-maps`). | C3.8, C3.4 | forms | Yes (Step 6 values) |
| G4 | The new sections "Your visit" and "Previous countries of residence" cannot be added on any screen (P-158). The script seeds them by SQL. | C4.11, C4.1 | forms | Yes (release) |
| G5 | After the draft is applied, 94 errors (04): 38 facts × 3 people asked of nobody. The only fix is one field at a time on the library field page, with no "ask it here" from the error and no bulk fix. 22 conditions (optional, required after yes) are also one at a time. | C4.1, C4.11 | screens | Slows; not a stop |
| G6 | Section checks (visit ends after it starts, funds above 0) and their derived field cannot be written on screen. The script seeds them by SQL. | C3.14 | screens | No |
| G7 | Documents says "Draft them from IRCC's checklist", but there is no button. IMM 5484 and the New Delhi IMM 5881 are attached but never read into lines. | C2.6, C3.4 | forms | No (lines typed by hand) |
| G8 | On both forms, Signature and Signed by stay "Not set", and the release goes through. | C1.8, C8.1 | forms | Yes (Step 6 signing) |
| G9 | QA-138 (UX · Minor; the server refuses a live run while AI is off, `api/src/sources.ts:454`, so nothing is spent): the Draft-with-AI dialog for IMM 5257 offers "Live AI call … up to US$5" as a choosable option, while the Forms tab says "AI now is switched off on this copy" and Fill from the guide greys it out (03). | C11.8 | forms | No |
| G10 | The Questionnaires tab heads sections by system key ("relationship · 1 question", "application_details", "contact") for sections the combination does not use (05). This is QA-133's cause on a second screen. | C4.1 | runtime | No |

## Step 2 — Release
Works
- The author submits. Approve and release is greyed for the author.
- The content reviewer selects all and signs: "70 of 70 … signed" (09).
- The approver's first try is refused: "it uses 'Proof of financial support (Sample)', a new document type that is waiting for a second person". The reviewer approves it on To review (10), then the approver releases. Visitor visa is Live (11).

Gaps
| # | Gap | Capability | Lane guess | Blocks? |
|---|---|---|---|---|
| G11 | QA-141: Validation says "0 errors" while a library item waits on To review. The approver learns about it only when the release is refused. | C5.1, C5.3 | screens | No |
| G12 | QA-142: The To review row for a document type says "Approve or return the new field". | C5.3 | screens | No |
| G13 | QA-140: The studio says "Released as Release 2" / "In Release 2" (pack number). The case dialog and the case say "release 1" (`config_release.version` = 1). | C5.1, C6.1 | screens | No |
| G14 | After the release, Review and release still says "Forms AI picked (1): confirm they apply before release" (IMM 5257). It was never confirmed, and the release did not wait for it. | C11.15 | forms | No |

## Step 3 — Open a case (case officer)
Works
- Cases › Open a case lists "Visitor visa · release 1" (12). The case opens frozen on Release 1.
- Add spouse or partner and Add child work. A second spouse is refused: "The release allows at most 1 spouse or partner on a case" (14). There is a form per person: IMM 5257 and IMM 5707 × 3 (13).

Gaps
| # | Gap | Capability | Lane guess | Blocks? |
|---|---|---|---|---|
| G15 | Adding a person asks only for a name: no date of birth, no travelling or not. Age and minor rules wait for the questionnaire. | C6.1, C11.12 | runtime | No |
| G16 | The release allows a Representative (0–1), but the case has no Add representative, no firm, no representative of record and no case team. The client is still asked "Representative and authorizations". | C6.11 | runtime | No (for IMM 5476 cases, yes) |

## Step 4 — Questionnaire and facts
Works
- The client sees "0 of 41 parts", one part per screen. An empty Save lists what is missing (15).
- The Sample check fires: "The visit ends before it starts" (16). Entries take an address in parts.
- The officer's Confirm section says "Application details … 2 answers confirmed" (17). A wrong list value shows "needs a fix" under "What blocks filing".
- API fallback: 175 answers and 41 section confirms by script (no screen fills them faster). After that, all 6 forms say Ready / Validate before filing.

Gaps
| # | Gap | Capability | Lane guess | Blocks? |
|---|---|---|---|---|
| G17 | 10 passport facts are "from the document". The client is not asked for them ("Travel and identity documents · Optional") and has no upload. They fall silently to the officer to type ("the officer enters this from a document or record"). | C4.5, C6.5 | evidence | Yes (officer workaround) |
| G18 | No "Confirm all": 42 sections for a family of three, one click each. | C6.6 | runtime | No |
| G19 | Questions still read as field definitions ("Official language … in which the person wants to receive service"): QA-82. | C11.12 | forms | No |

## Step 5 — Documents  (first hard stop)
Works
- Nothing on the case. The released combination carries 3 document lines per person (Preview, 08).

Gaps
| # | Gap | Capability | Lane guess | Blocks? |
|---|---|---|---|---|
| G20 | The case page has no document checklist for any person: passport, photographs, proof of funds. No screen, and no runtime API (`api/src/runtime.ts` has no document route). | C6.4 | runtime | Yes |
| G21 | Neither the client (18) nor the officer can upload a document. | C6.4, C8.1 | runtime | Yes |
| G22 | Nothing reads a document: no passport machine-readable lines by rules, no proposed facts to confirm, no "please check". | C6.5 | evidence | Yes |
| G23 | No conditional lines (for example a marriage certificate when a spouse is added) and no waiver with a reason. | C6.4 | runtime | No (Visitor visa) |

## Step 6 — Filing
Works
- "Generate a copy" per person and form: "70 form fields written, 19 by hand · read back and checked", with Download (19, 20).
- Sending the unchanged copy back as "validated" is refused in plain words, and nothing is recorded (21).
- IMM 5707 › Filed › Lock: "Copy locked: Filed". A later change to the family name shows "Stale · Filed" and names the fact (22).

Gaps
| # | Gap | Capability | Lane guess | Blocks? |
|---|---|---|---|---|
| G24 | QA-139: "To write by hand" shows engine words: (step "derived:any(person.other_family_name, …)" is not in the executable set), "phone_part:country_code", "derive_inverse:…" (20). | C7.1 | forms | No |
| G25 | The IMM 5707 copy for the principal asks "has any children" to be written by hand, although the case has a child (the derive step is not executable). | C7.1 | forms | No |
| G26 | IMM 5257 cannot be validated or filed without Adobe Reader (not on this machine). | C7.2 | evidence | Yes (here) |
| G27 | "Filed" is a lock on one form copy. There is no filing record: no portal or account, our reference, application number, UCI or date, and nothing at application level. | C8.2 | runtime | Yes |
| G28 | No fees: no CAD 100 per person, no family maximum, no biometrics, no fee receipt line. | C6.12 | runtime | Yes |
| G29 | No signed-PDF states: the copy says "each signer signs … by hand" but there is no print-sign-upload step or signed scan. | C8.1, C3.11 | evidence | Yes |
| G30 | No deliverables list (Prepare application): no per-channel items and no portal sheet. IMM 5257's Online channel is "later wave". | C7.7, C7.3 | screens | Yes |
| G31 | Stale works for form copies only. Uploaded or signed items do not exist, so nothing else can go stale. | C9.2 | runtime | No |

## Step 7 — Ready to file
Works
- Per form: "Ready to file" or "Validate before filing", and "What blocks filing (n)" with each fact and person.

Gaps
| # | Gap | Capability | Lane guess | Blocks? |
|---|---|---|---|---|
| G32 | No case-level "ready to file" covering every person, form, document, signature and fee. The case status stays "Open" (23). | C7.6 | runtime | Yes (end of story) |
| G33 | No independent AI review of a filled form, and no acknowledge-with-reason. | C7.5, C7.6 | evidence | No |
| G34 | No staff eligibility page (gates met or not met, "rules as at"). | C6.9 | runtime | No |

Count: Step 1 10 · Step 2 4 · Step 3 2 · Step 4 3 · Step 5 4 · Step 6 8 · Step 7 3 = 34.

## Order for M3-A and M3-B
1. G20 document checklist per person on the case (C6.4).
2. G21 upload for client and officer (C6.4, C8.1).
3. G22 + G17 passport read by rules, proposed facts confirmed; the client is asked only when the passport is missing (C6.5, C4.5).
4. G29 + G8 signer set on the form line, then the print-sign-upload signed PDF (C8.1, C1.8).
5. G28 fees for the filing (C6.12).
6. G27 filing record: portal, reference, application number, UCI (C8.2).
7. G32 case-level ready to file (C7.6).
8. G30 deliverables list per filing (C7.7).
9. G2–G4 answer lists, option maps and sections on screens, so setup needs no script (C3.4, C3.8, C4.11).
10. G16 + G34 firm, representative and case team, and staff eligibility (C6.11, C6.9).

## Not walked and why
- The 14 IMM 5257 form-field decisions (To review › Form fields, K1) and the approval of new shared fields: done by the setup script (API), not walked in the browser.
- 36 of 38 placements, the 22 conditions, answer lists, option maps, sections and checks: script (G2–G6).
- Adobe Validate round trip and barcode check (C7.2): no Adobe Reader on this cloud machine.
- Live AI anywhere (US$0 rule). Online fill and portal (parked, P-102). Employer case link (C1.3): not part of Visitor visa.
- Officer editing an answer on the case page in the browser: fixed by API this time (already covered by `check_runtime_r1c.cjs`).
