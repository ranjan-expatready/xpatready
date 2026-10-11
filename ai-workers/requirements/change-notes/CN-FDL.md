# Change note CN-FDL: Founder Decisions Log

| | |
|---|---|
| **Document changed** | ExpatReady — Founder Decisions Log (consolidated sign-off), document version 1.5, last updated 2026-08-02 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/01-techno-functional/07-Founder-Decisions-Log.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 8 (2 amendments, 5 reaffirmations, 1 new section) |

**What this note is.** The Founder Decisions Log is the founder's own record; only the founder changes it. On 11 Oct 2026 the founder answered the Workstream 2 decisions one by one (`ai-workers/decisions.md`, AIW-D36 to AIW-D70). Two of his answers amend a ratified decision (FD-4, FD-8). Five keep a ratified decision against newer team documents that had drifted from it (FD-5, FD-11, FD-15, FD-17, FD-21), so those team documents come back to the log. And nine of his answers are decisions the team should be able to read in the log rather than in a Workstream 2 file. This note gives the exact words for all of it in the log's own style. The founder's words are quoted from `ai-workers/decisions.md`.

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words; (4) why: the founder's decision; (5) which team documents follow (each has its own change note in this folder: CN-SA-*n* and CN-CP-portal by this note's author, CN-AG-*n* by the Agent-plane author).

**How amendments are shown.** The log already has one pattern for changing a resolved decision: FD-10 keeps its old words struck through and adds "**SUPERSEDED 2026-08-02 by FD-17**" (L35). Changes 1 and 2 use the same pattern with "**AMENDED 2026-10-11**". Reaffirmations add one italic line to the row and change nothing else.

**Checked and not changed.** FD-16 ("AI assists, humans decide", L52) is unchanged: the founder kept it (AIW-D13, "Keep FD-16, delegate") and confirmed that a delegation record is consistent with it (AIW-D33). FD-7's "CP-9 employer sees read-only summary" (L32) is the recruitment summary tile (Doc 4 v1.3 §13 item 8, L3207), not the employer portal, so the founder's AIW-D67 ("Full employer actions at launch") does not touch FD-7.

---

## 1. FD-4 amended: reference data in a published country pack needs two people

**(1) What it changes.** FD-4, Wave-0 table (L29).

**(2) Current words.**

L29:
> | FD-4 | Pack review gate | **Dual-control for rule/scoring/eligibility artifacts; platform-config toggle for reference data** |

**(3) Proposed words.**

> | FD-4 | Pack review gate | **Dual-control for rule/scoring/eligibility artifacts**; ~~**platform-config toggle for reference data**~~ **AMENDED 2026-10-11:** reference data in a published country pack (fees, wage tables) also needs two people, matching SA-01 v2.2 §3.12 (AIW-D48) |

**(4) Why.** AIW-D48, 11 Oct 2026, the founder chose "Two people for all": "**Amends FD-4's second clause:** reference data in a published country pack (fees, wage tables) also needs two people, matching SA-01 v2.2 §3.12. The founder places the amendment in the Founder Decisions Log on Drive." The conflict was raised in the proposals row of 10 Oct (Pack author's assistant, test gate, part 2) and in `ai-workers/design/behaviours/pack-authors-assistant.md` §9 G-25: SA-01 v2.2 §3.12 put the whole production pack under two people, while SA-01B v1.2 SA-1B-44 named no second person for reference rows.

**(5) Knock-ons.** SA-01B SA-1B-44 and SA1B-D17 (CN-SA-01B change 3). FD-22 applies FD-4 to the Practice Pack ("dual control on rule-bearing artifacts (FD-4)", A22-6.6, L142); AIW-D48 speaks of "a published country pack", so whether the amended clause also covers Practice Pack reference data is for the founder to say (listed as an open point, not proposed here).

---

## 2. FD-8 amended: Minder and Reminder stay two tools; Clocker; the AI writer is Writer

**(1) What it changes.** FD-8, Wave-0 table (L33).

**(2) Current words.**

L33:
> | FD-8 | Doer naming | **Clocker** (time-tracking; not "Timer") · **Reminder folds into Minder** (one nudge identity; AG-13 §3.2 retitled; naming spec amended) |

**(3) Proposed words.**

> | FD-8 | Doer naming | **Clocker** (time-tracking; not "Timer") · ~~**Reminder folds into Minder** (one nudge identity; AG-13 §3.2 retitled; naming spec amended)~~ **AMENDED 2026-10-11:** **Minder** (watches dates) and **Reminder** (sends nudges) are two Doers, as the October module files assume (AIW-D51) · the AI Doer that drafts messages and letters for a person to approve is **Writer**; the four AI Doers are Reader, Sorter, Writer, Checker; **Drafter** is the template engine only (AIW-D53) |

**(4) Why.** AIW-D51, 11 Oct 2026, the founder chose "Amend FD-8 to match the team": "**Amends FD-8:** Minder (watches dates) and Reminder (sends nudges) stay two tools, as every October document assumes; the time tool keeps the name *Clocker*; the AI message-writer gets its own name (AIW-D53) so *Drafter* stays the template tool. The founder places the amendment on Drive." AIW-D53, the founder chose "Writer": "The AI Doer that drafts messages and letters for a person to approve is named **Writer**; the four AI Doers are Reader, Sorter, Writer, Checker. *Drafter* stays the template engine." Raised in the proposals rows of 9 Oct (carve-out B, "One canonical Doer roster"; W2b improvements, "Amend FD-8") and IMP-24.

**(5) Knock-ons.** AG-13 uses "Timer" where FD-8 says Clocker (CN-AG-13). AG-11's AI run log value `DRAFTER` becomes `WRITER` (proposals row of 11 Oct, from AIW-D53; CN-AG-11). The agent glossary (99-Phasing-and-Glossary v1.4) follows. Doc 4 already uses Minder and Reminder as two Doers (for example L1240) and needs no change. The Program Charter's mention of FD-8 is in `ai-workers/charter-edits.md` §5.

---

## 3. FD-5 reaffirmed: government form filling in version 1

**(1) What it changes.** FD-5, Wave-0 table (L30): one line added.

**(2) Current words.**

L30:
> | FD-5 | XFA/flattened IRCC forms | **Flattened-overlay support in v1** (coordinate-mapped fill + FormFieldMap visual editor), unit-priced per form edition; XFA runtime = named later-wave stub |

**(3) Proposed words.** The row is unchanged; the decision cell ends with:
> *Reaffirmed 2026-10-11 (AIW-D43) against SA-01B v1.2 SA1B-D28 ("Form autofill is parked for Release 1"): the team states the overlay route for IRCC's forms and a date; until it exists the pilot runs without form filling and says so.*

**(4) Why.** AIW-D43, the founder chose "Keep FD-5, ask the team": "FD-5 (form filling in version 1) stands; Step 3 asks the team for the overlay route and a date. Until it exists the pilot runs without form filling and says so; the Form Preparer duty (W-05) stays specified." The newer SA-01B v1.2 (L53) parked filling; a module file never overrides a founder decision by date (README §0 rule 11).

**(5) Knock-ons.** SA-01B SA1B-D28 and P1 (CN-SA-01B change 1). AG-07 (CN-AG-07).

---

## 4. FD-11 reaffirmed: no credit notes in version 1

**(1) What it changes.** FD-11, Wave-0 table (L36): one line added.

**(2) Current words.**

L36:
> | FD-11 | Credit notes | **OUT for v1** — cancel-and-reissue; AG-6 mentions scrubbed; revisit with enterprise offline invoicing |

**(3) Proposed words.** The row is unchanged; the decision cell ends with:
> *Reaffirmed 2026-10-11 (AIW-D46) against AG-06 v1.7, which still names credit notes (AG-6-6: "corrections occur via credit note / new invoice / refund"); AG-06 removes them.*

**(4) Why.** AIW-D46, the founder chose "Keep FD-11": "FD-11 stands: no credit notes in version 1; the team removes the mentions from AG-06 (change note in Step 3)." AG-06 v1.7 AG-6-6 (L354): "corrections occur via credit note / new invoice / refund". Proposals row of 9 Oct (carve-out B, "Settle trust accounting … Also FD-11 (no credit notes) vs AG-6-6").

**(5) Knock-ons.** AG-06 (CN-AG-06). FD-11 names AG-6; whether it also reaches the platform's own SaaS billing (SA-04 v2.14 §10 lists "credit notes" under `system/billing:view`, L686) is not decided and is listed as an open point, not changed.

---

## 5. FD-15 reaffirmed: Restricted fields encrypted and masked, with an audited reveal

**(1) What it changes.** FD-15, Wave-0 table (L40): one line added.

**(2) Current words.**

L40:
> | FD-15 | AG-9 doc-metadata encryption | **B-1-derived rule** — metadata fields whose canonical class is in the B-1 Restricted list get envelope-encryption + masked audited reveal; binaries SSE + signed-URL |

**(3) Proposed words.** The row is unchanged; the decision cell ends with:
> *Reaffirmed 2026-10-11 (AIW-D58) against AG-07 v2.7 AG7-D10 and AG-7-88 ("Personal data SHALL NOT be masked on the client screen, list, search or export; no reveal step exists") and SA-11 v2.7, which applied AG7-D10: AG-07 and SA-11 come back to FD-15 for Restricted fields. Counsel confirms the Restricted list (B-1) before any Restricted field is stored. AI assistants see a Restricted field's status only, either way.*

**(4) Why.** AIW-D58, the founder chose "Keep FD-15": "FD-15 stands: Restricted fields (passport and financial numbers) encrypted and masked with an audited reveal; the team brings AG-07 (AG7-D10) back to it (change note in Step 3); counsel confirms the Restricted list (B-1) before any is stored. The AI sees status only, either way." AG-07 v2.7 L718 and SA-11 v2.7 L1 carry the drifted wording. Proposals row of 10 Oct (Practice expert, two Restricted-field models).

**(5) Knock-ons.** AG-07 (CN-AG-07); SA-11 (CN-SA-11 change 5); SA-06 (CN-SA-06 change 2). B-1 stays in "Still open after this batch" (L149).

---

## 6. FD-17 reaffirmed: trust-aware from day one, light

**(1) What it changes.** FD-17, Blueprint table (L53): one line added at the end of the decision cell.

**(2) Current words.**

L53 (extract, opening and part (a)):
> | FD-17 | Trust accounting (**supersedes FD-10**) | B/C | **Trust-aware from day one, LIGHT.** In scope for v1: (a) a mandatory `fundsDesignation` (TRUST \| OPERATING) on every client-money record — quote, retainer, deposit, invoice line, payment, refund;

**(3) Proposed words.** The row is unchanged; the decision cell ends with:
> *Reaffirmed 2026-10-11 (AIW-D45) against AG-06 v1.7 AG-6-24 (an optional `fundsNature` tag, trust accounting deferred as an "explicit deferral, §13"): AG-06 comes back to FD-17; counsel reads it before any pilot on real client money.*

**(4) Why.** AIW-D45, the founder chose "Keep FD-17": "FD-17 stands (mandatory trust-or-operating tag on every client-money record, trust-aware light from day one). The team brings AG-06 back to FD-17 (change note in Step 3); counsel reads it before any pilot on real client money." AG-06 v1.7 AG-6-24 (L380): "The platform SHALL record transactions and MAY tag a payment's **`fundsNature`** … in Phase-1 (explicit deferral, §13)." Proposals row of 9 Oct (carve-out B, "Settle trust accounting for Release 1").

**(5) Knock-ons.** AG-06 (CN-AG-06). The Billing assistant never creates a money record of any kind (AIW-D44; AIW-D54 item 3); a person saves every client-money record, with its designation, in the product's own screen.

---

## 7. FD-21 reaffirmed: an email passcode before every signature

**(1) What it changes.** FD-21, Blueprint table (L57): one line added.

**(2) Current words.**

L57 (extract, first sentence):
> | FD-21 | Retainer signer assurance | B | **ARCHITECT-DECIDED.** Signing a retainer or any legally-operative instrument requires **one-time-passcode verification to the signer's on-file channel** (email by default, SMS where captured) before the signature is applied, and produces a sealed **evidence bundle**:

**(3) Proposed words.** The row is unchanged; the decision cell ends with:
> *Reaffirmed 2026-10-11 (AIW-D42) for the email passcode before every signature, against AG-05 v1.9, which ships "token + consent + IP/UA capture" only; the passcode by text message ("SMS where captured") is deferred after Release 1.*

**(4) Why.** AIW-D42, the founder chose "Keep the email passcode": "FD-21 stands for the email passcode before every retainer signature; only the phone passcode is deferred. The team adds the email passcode to Release 1 (change note to AG-05 §13 in Step 3)." AG-05 v1.9 L757: "Knowledge-based / strong identity verification (KBA, gov-ID, OTP-to-phone) before signing (Release 2 or later) — token + consent + IP/UA capture ships now". A22-5 (L106) already makes "OTP + sealed evidence bundle … the platform minimum". Proposals row of 9 Oct (carve-out B, "Settle e-signature identity for Release 1").

**(5) Knock-ons.** AG-05 (CN-AG-05); Doc 4 CP-6 (CN-CP-portal change 1).

---

## 8. A new section: the Workstream 2 (AI) decisions of 11 Oct 2026

**(1) What it changes.** A new section after the Blueprint batch and its FD-22 amendments (after L144, before "Still open after this batch", L148).

**(2) Current words.** None. The log's last entry is the Blueprint batch of 2026-08-02 (L44–L58) with the FD-22 amendments; the AI layer's decisions live only in `ai-workers/decisions.md` and, for the co-founder's AG11-D rows, in AG-11 v1.11 §0.

**(3) Proposed words.**

> ## RESOLVED 2026-10-11 — Workstream 2 (AI assistants) batch
>
> > **Origin:** the founder's answers of 11 Oct 2026 to the Workstream 2 decision list, one by one, recorded with his words in Workstream 2's decision record (AIW-D36 to AIW-D70). FD-16 is unchanged. Rows marked *provisional* stay provisional until counsel has read them; no pilot runs on real client files before that (AIW-D64; counsel engaged by 31 Oct 2026, AIW-D68). Numbers FD-23 onward are proposed; the founder assigns them.
>
> | # | Decision | Category | RESOLVED as |
> |---|----------|----------|-------------|
> | FD-23 *(to assign)* | Whose AI assistant | D | **Any named staff member may have an AI assistant**, licensed or not; the licence sits with the person who approves its work (whoever the firm's settings allow for that role, licensed by default). FD-16 is read with AIW-D13 ("Keep FD-16, delegate") and AIW-D33: the assistant works under a **delegation record** for one named person, with a subset of that person's permissions; it is not an identity and holds no permission of its own; the named person counts as the preparer for four-eyes. (AIW-D36, AIW-D26, AIW-D33) |
> | FD-24 *(to assign)* | The deadline watch | D | **The deadline watch is the product's own Minder**, on every plan, with no AI; it is sold as the product's own deadline watching, never as AI. The managers' at-risk list is the product's own two views. (AIW-D37) |
> | FD-25 *(to assign)* | Practice expert, version 1 | D | **Four fixed questions from a menu, answers built by rule** from four sources, plus one optional AI summary line; free questions are version 2. The rule-built answers are a reporting feature (AG-14) and work with AI off; only the summary line needs the AI switch. (AIW-D39, AIW-D54) |
> | FD-26 *(to assign)* | Where AI processing happens | B | **Only in Canada**, for firms' data and for Expat Ready's own support tickets (AG11-D15 wording). The provider is chosen from Canada-region options and confirmed by one test call; if no capable option passes, the question returns to the founder, and AI stays off meanwhile (AG11-D13). *Wording provisional until counsel.* (AIW-D52, AIW-D69) |
> | FD-27 *(to assign)* | Ten standing calls on the AI layer | D | (1) seeded automations and the product's own Reader, Sorter and Checker runs stay the firm's automations, unmetered; (2) the readiness report is built by rule, a model adds one labelled paragraph, and the case officer's acceptance is the submission for internal review, the reviewer's sign-off staying separate; (3) money: an assistant proposes, a person saves in the product's own screen; (4) the Practice expert's explanation line is display-only; (5) no assistant task can close a deadline; (6) no AI text in the retainer; (7) the Pack author's assistant only reads the pack; (8) platform runs are stamped with the one firm they serve, with no cross-firm sweep in version 1; (9) a team document never overrides a founder decision by date; (10) the Practice expert's answers work with AI off. (AIW-D54) |
> | FD-28 *(to assign)* | Hard limits and the blocked list | B | **Adopted, provisional until counsel reads them**: the list of what no AI assistant may ever do, with one exception — the Lifecycle Keeper may draft a consented message to a past client for a person to approve after the file closes. (AIW-D55) |
> | FD-29 *(to assign)* | No active licensed user in the firm | B | Client-facing preparation by AI assistants **pauses while the firm has no active licensed user**; on by default; the Owner may switch it off with a recorded reason. *Provisional until counsel.* (AIW-D56) |
> | FD-30 *(to assign)* | Approving many items at once | B | Every "approve all" carries three safeguards: low-confidence values opened first; a few values hidden for the approver to fill, with the match rate recorded; an alarm when a person's agreement rate climbs suddenly. *Provisional until counsel.* (AIW-D57) |
> | FD-31 *(to assign)* | Release scope | C/D | **Release 1 does not launch without the AI assistants.** Counsel, the Canada-region provider test, the immigration specialist's pack content and the pilot are on the launch path. (AIW-D66, reaffirming AIW-D14 and AIW-D21) |

The log's version line moves from 1.5 to 1.6 when the founder places it.

**(4) Why.** Each row carries the founder's choice of 11 Oct 2026 as recorded in `ai-workers/decisions.md`: AIW-D36 "Yes, a named person"; AIW-D37 "Product feature, sold honestly"; AIW-D39 "Accept; answers go to the team"; AIW-D52 "Only in Canada"; AIW-D54 "Confirm all ten"; AIW-D55 "Adopt, with the one exception"; AIW-D56 "Yes, pause by default"; AIW-D57 "Adopt all three"; AIW-D66 "Launch waits for AI". AIW-D26 and AIW-D33 are quoted inside FD-23 because AIW-D36 rests on them. The log is "the single sign-off artifact" (L12); the team builds from the module files and this log, not from Workstream 2's own folder, so a decision the team must follow belongs here. (IMP-32 made the same point for the co-founder's AG11-D rows; this note does not ratify those.)

**(5) Knock-ons.** AG-11 §0: the AG11-D rows sit below these founder decisions where they touch them (CN-AG-11). The Program Charter's release-scope text is in `ai-workers/charter-edits.md` §1. The counsel pack (`ai-workers/requirements/counsel-pack.md`, written by the Lead) covers the provisional rows. The founder tells the co-founder of FD-31 (AIW-D66; we write to no one).
