# Change note CN-FDL: Founder Decisions Log

| | |
|---|---|
| **Document changed** | ExpatReady — Founder Decisions Log (consolidated sign-off), document version 1.5, last updated 2026-08-02 |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/01-techno-functional/07-Founder-Decisions-Log.md` |
| **Date of this note** | **12 Oct 2026 (eighth round: change 15, the founder's decisions of 12 Oct, AIW-D92 to D105)**; earlier 11 Oct 2026 (seventh round: the founder's Step 3 batch, AIW-D73 to AIW-D77, applied to open points 1 and 3 to 6; changes 10 to 14 added) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 15 (change 15 added 12 Oct 2026):  3 amendments (FD-4, FD-8, FD-7), 5 reaffirmations, 1 new section, 1 reading of FD-16, and 4 further lines from the founder's Step 3 batch (AIW-D52's reach, FD-4 for Practice Pack reference data, FD-11's reach, money returned from trust). The 6 open points (below, not changes) are all settled: five decided by the founder on 11 Oct (AIW-D73 to AIW-D77), one recorded as applied. |

**What this note is.** The Founder Decisions Log is the founder's own record; only the founder changes it. On 11 Oct 2026 the founder answered the Workstream 2 decisions one by one (`ai-workers/decisions.md`, AIW-D36 to AIW-D72, with the appended rows *AIW-D72 correction* and *AIW-D72 correction 2*). This note does four things:
- **Two amendments.** Two of his answers amend a ratified decision (FD-4, FD-8).
- **Five reaffirmations.** Five answers keep a log decision against newer team documents that had drifted from it (FD-5, FD-11, FD-15, FD-17, FD-21), so those team documents come back to the log. FD-17 is kept in full (AIW-D72).
- **One new section.** Nine answers are decisions the team should be able to read in the log rather than in a Workstream 2 file.
- **One reading.** The founder's reading of FD-16 on document typing (AIW-D71) is added to FD-16's row.

The founder's words are quoted from `ai-workers/decisions.md`.

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words.
4. Why: the founder's decision.
5. Which team documents follow. Each has its own change note in this folder: CN-SA-*n* by this note's author, CN-AG-*n* by the Agent-plane author.

**How amendments are shown.** The log already has one pattern for changing a resolved decision: FD-10 keeps its old words struck through and adds "**SUPERSEDED 2026-08-02 by FD-17**" (L35). Changes 1 and 2 use the same pattern with "**AMENDED 2026-10-11**". Reaffirmations and the reading add one italic line to the row and change nothing else.

**Log rows applied in the Super Admin notes without a new answer.** Rule 11 says a team file never overrides a row of this log (an FD-*n*). Two older rows are therefore applied directly:
- **FD-3**, a founder decision ("**Pin at case open + explicit audited re-pin/migrate**", L28), settles the pin grain in SA-01. See CN-SA-01 change 3.
- **FD-20**'s "**`REVIEW_OF_AUTOMATED_DECISION`** request type in the DSR machinery" (L56) is added to SA-11's request types. See CN-SA-11 change 6. FD-20 is an **architect call**, not the founder's own: the log says "FD-20 and FD-21 are architect calls taken under the standing technical delegation and are recorded here for ratification only" (L46), and no AIW-D row has ratified FD-20. Rule 11 still applies, because it covers every FD-*n* row.

**FD-16** ("AI assists, humans decide", L52) keeps its words. The founder kept it (AIW-D13, "Keep FD-16, delegate") and confirmed that a delegation record is consistent with it (AIW-D33). On 11 Oct he also gave one reading of it, on document typing (AIW-D71); change 9 adds that reading to the row without changing the decision.

---

## Open points (recorded, not changed)

These are conflicts or gaps the fix rounds found. Points 1, 3, 4, 5 and 6 were put to the founder and **decided on 11 Oct 2026** (AIW-D73 to AIW-D77); each question is kept as asked, with the decision beneath it, and the proposed log words are changes 10 to 14. Point 2 is recorded as applied and asks nothing.

1. **FD-7 against the team's CP1-D7.**
   - FD-7 (L32) resolves "**CP-9 employer sees read-only summary**". That is the recruitment summary tile of Doc 4 §3.9 (L3043) and §13 item 8 (L3207).
   - FD-7's "read-only" concerns that recruitment summary only. It does not limit the employer actions of AIW-D67 (upload, pay, sign, seat management); see point 2.
   - The team's newer decision CP1-D7 removes the tile for Release 1: "In Release 1 the employer portal shows nothing about recruitment candidates (no list, no counts, no notes)" (AG-15 v1.7, L43). The same rule is in AG-17 v0.6 (L211, AG-17-30 at L746).
   - A team file overriding a founder decision goes to the founder (README §0 rule 11; review S3a M-1).
   - **Question:** keep FD-7's tile in Release 1, or amend FD-7?
   - **The Lead recommends amending FD-7:** defer the read-only recruitment tile to a later release, as the team's CP1-D7 does. It is not AI; the launch already carries AIW-D66 (AI in Release 1) and AIW-D67 (full employer actions), which give employers the acts that matter; the tile adds build and a candidate-data question for little launch value. *(Recommendation added by the Lead, 11 Oct 2026.)*
   - **Decided 11 Oct 2026 (AIW-D73, "Defer the tile"):** FD-7 is amended: the employer's read-only recruitment summary tile is deferred to a later release, as the team's CP1-D7 plans; AIW-D67's full employer actions stand. Proposed log words: change 10.
2. **The employer portal and AIW-D67: recorded; applied, no question.**
   - The founder chose "Full employer actions at launch" (AIW-D67).
   - The newer AG-15 v1.7 limits Release 1 to "only the employer's primary contact has portal access" (AG-15-12, L355). No seats means no seat management.
   - Rule 11 keeps the founder's decision. The change notes that apply it are the Agent-plane CN-AG-15, with AG17-D38, and CN-SA-03 change 3 for the extra employer seats.
   - *Correction:* the first version of this note said AIW-D67 "does not touch" anything. That was wrong (review S3a B-2).
3. **Whether AIW-D52 covers Expat Ready's own non-client AI calls.**
   - AIW-D52 reads "AI processing of client data happens only in Canada (AG11-D15 wording, for firms' data and Expat Ready's own support tickets)".
   - The Pack author's assistant drafts pack content that holds no client data (synthetic samples only).
   - **Question:** do such calls also use only the Canada provider record?
   - **The Lead recommends yes:** one provider record, one contract and one test for every AI call Expat Ready makes, so no exception has to be policed; pack drafting holds no client data, so the only cost is using the Canada route the firms' calls already need. Until the founder answers, the Pack author's assistant makes no model call. *(Recommendation added by the Lead, 11 Oct 2026.)*
   - *(Before the answer)* The Super Admin notes kept D52's literal scope and did not state the wider reach as a requirement (CN-SA-08 change 2, CN-SA-11 change 1; review S3a M-2; re-check S3a-b R-2), and the Pack author's assistant made no model call (`00-step3-plan.md`, "Pack calls before the founder answers", now superseded).
   - **Decided 11 Oct 2026 (AIW-D74, "Yes, Canada for all AI"):** AI processing for every AI call Expat Ready makes, including pack drafting that holds no client data, happens only in Canada under the one published provider record (SA-8-49); the Pack author's assistant may make model calls once that record is published. Proposed log words: change 11.
4. **FD-4 as amended, and Practice Pack reference data.**
   - FD-22 applies FD-4 to the Practice Pack ("dual control on rule-bearing artifacts (FD-4)", A22-6.6, L142).
   - AIW-D48 speaks of "a published country pack".
   - **Question:** does the amended clause also cover Practice Pack reference data?
   - **The Lead recommends yes:** FD-22 already applies FD-4's dual control to the Practice Pack's rule-bearing artifacts (A22-6.6), and AIW-D48 chose "Two people for all" reference data in country packs; the same two-person publish for Practice Pack reference data keeps one rule for every pack. *(Recommendation added by the Lead, 11 Oct 2026.)*
   - **Decided 11 Oct 2026 (AIW-D75, "Yes, two people for all packs"):** reference data in a published Practice Pack also needs two people before publishing, as for country packs (AIW-D48; FD-22 A22-6.6). Proposed log words: change 12.
5. **FD-11 and the platform's own SaaS billing.**
   - FD-11 names AG-6 ("AG-6 mentions scrubbed", L36).
   - SA-04 v2.17 §10 lists "credit notes" under `system/billing:view` (L752), and SA-08 v2.4 keeps "invoice and credit-note copies" (SA-8-44, L301).
   - **Question:** does FD-11 reach Expat Ready's own billing to firms?
   - **The Lead recommends no:** FD-11's words name AG-6 (the firms' billing of their clients); Expat Ready's own subscription billing (SA-04, SA-08) is a different system that keeps the copies the team specified. Not AI. *(Recommendation added by the Lead, 11 Oct 2026.)*
   - **Decided 11 Oct 2026 (AIW-D76, "No, FD-11 is about firms' billing only"):** FD-11 applies to the firms' billing of their clients (AG-06) only; Expat Ready's own subscription billing (SA-04, SA-08) keeps the team's design, including processor credit notes. Proposed log words: change 13.
6. **Refunds in Release 1: money returned to a client from trust.**
   - FD-17 (L53) names refund among the version 1 client-money records: "on every client-money record — quote, retainer, deposit, invoice line, payment, refund".
   - AG-06 v1.7 holds general refunds to Phase 2: "**Refunds (Phase-2)** SHALL be a **reversing fact** with a **mandatory reason** …" (AG-6-23, L377).
   - FD-13 (L38) already decides consultation refunds: "**Firm-configurable refunds with platform defaults**", and AG-04 v1.5 refunds a cancelled paid consultation in Release 1 ("**AG-4-46** Refund-on-cancel per policy via Biller", L515).
   - **Question:** must Release 1 also record money returned to a client from trust (for example an unused retainer)?
   - **The Lead recommends yes**, with the mechanics designed by the team under FD-17 (`00-step3-plan.md`, "Refunds and FD-13"; "Trust accounting belongs to the team"). This note proposes no refund rule.
   - **Decided 11 Oct 2026 (AIW-D77, "Yes, team designs how"):** Release 1 records money returned to a client from trust (for example an unused retainer), so the trust ledger stays right; the team designs the mechanics under FD-17 (AG-06 §13 item 11); the platform never moves money (FD-12); consultation refunds stay as FD-13 and AG-4-46 have them; no assistant records a refund. Proposed log words: change 14 (a decision line only; still no refund mechanics).

---

## 1. FD-4 amended: reference data in a published country pack needs two people

**(1) What it changes.** FD-4, Wave-0 table (L29).

**(2) Current words.**

L29:
> | FD-4 | Pack review gate | **Dual-control for rule/scoring/eligibility artifacts; platform-config toggle for reference data** |

**(3) Proposed words.**

> | FD-4 | Pack review gate | **Dual-control for rule/scoring/eligibility artifacts**; ~~**platform-config toggle for reference data**~~ **AMENDED 2026-10-11:** reference data in a published country pack (fees, wage tables) also needs two people, matching SA-01 v2.2 §3.12 (AIW-D48) |

**(4) Why.** AIW-D48, 11 Oct 2026. The founder chose "Two people for all": "**Amends FD-4's second clause:** reference data in a published country pack (fees, wage tables) also needs two people, matching SA-01 v2.2 §3.12. The founder places the amendment in the Founder Decisions Log on Drive." The conflict was raised in two places:
- the proposals row of 10 Oct (Pack author's assistant, test gate, part 2);
- `ai-workers/design/behaviours/pack-authors-assistant.md` §9 G-25. SA-01 v2.2 §3.12 put the whole production pack under two people, while SA-01B v1.2 SA-1B-44 named no second person for reference rows.

**(5) Knock-ons.** SA-01B SA-1B-44 and SA1B-D17 (CN-SA-01B change 3). Practice Pack reference data: decided by AIW-D75 (change 12).

---

## 2. FD-8 amended: Minder and Reminder stay two tools; Clocker; the AI writer is Writer

**(1) What it changes.** FD-8, Wave-0 table (L33).

**(2) Current words.**

L33:
> | FD-8 | Doer naming | **Clocker** (time-tracking; not "Timer") · **Reminder folds into Minder** (one nudge identity; AG-13 §3.2 retitled; naming spec amended) |

**(3) Proposed words.**

> | FD-8 | Doer naming | **Clocker** (time-tracking; not "Timer") · ~~**Reminder folds into Minder** (one nudge identity; AG-13 §3.2 retitled; naming spec amended)~~ **AMENDED 2026-10-11:** **Minder** (watches dates) and **Reminder** (sends nudges) stay two tools (AIW-D51) · the AI Doer that drafts messages and letters for a person to approve is **Writer**; the four AI Doers are Reader, Sorter, Writer, Checker; **Drafter** stays the template engine (AIW-D53) |

**(4) Why.**
- **AIW-D51**, 11 Oct 2026. The founder chose "Amend FD-8 to match the team": "**Amends FD-8:** Minder (watches dates) and Reminder (sends nudges) stay two tools, as every October document assumes; the time tool keeps the name *Clocker*; the AI message-writer gets its own name (AIW-D53) so *Drafter* stays the template tool. The founder places the amendment on Drive."
- **AIW-D53**. The founder chose "Writer": "The AI Doer that drafts messages and letters for a person to approve is named **Writer**; the four AI Doers are Reader, Sorter, Writer, Checker. *Drafter* stays the template engine."
- Raised in the proposals rows of 9 Oct (carve-out B, "One canonical Doer roster"; W2b improvements, "Amend FD-8") and in IMP-24.

**(5) Knock-ons.**
- AG-13 uses "Timer" where FD-8 says Clocker (CN-AG-13).
- AG-11's AI run log value `DRAFTER` becomes `WRITER` (CN-AG-11).
- SA-03 v2.17's feature catalogue row 30 names the four AI Doers "Reader, Sorter, Drafter, Checker" (CN-SA-03 change 1).
- The agent glossary (99-Phasing-and-Glossary v1.4) follows.
- Doc 4 already uses Minder and Reminder as two Doers (for example L1240).
- The Program Charter's mention of FD-8 is in `ai-workers/charter-edits.md` §5.

---

## 3. FD-5 reaffirmed: government form filling in version 1

**(1) What it changes.** FD-5, Wave-0 table (L30): one line added.

**(2) Current words.**

L30:
> | FD-5 | XFA/flattened IRCC forms | **Flattened-overlay support in v1** (coordinate-mapped fill + FormFieldMap visual editor), unit-priced per form edition; XFA runtime = named later-wave stub |

**(3) Proposed words.** The row is unchanged; the decision cell ends with:
> *Reaffirmed 2026-10-11 (AIW-D43) against SA-01B v1.2 SA1B-D28 ("Form autofill is parked for Release 1"): the team states the overlay route for IRCC's forms and a date; as recorded in AIW-D43, until it exists the pilot runs without form filling and says so.*

**(4) Why.** AIW-D43. The founder chose "Keep FD-5, ask the team". As recorded in AIW-D43: "FD-5 (form filling in version 1) stands; Step 3 asks the team for the overlay route and a date. Until it exists the pilot runs without form filling and says so; the Form Preparer duty (W-05) stays specified." SA-01B v1.2 (L53) parked filling. A module file never overrides a founder decision by date (README §0 rule 11). The product rule that applies this in SA-01B names a state the product can check (CN-SA-01B change 1).

**(5) Knock-ons.** SA-01B SA1B-D28 and P1 (CN-SA-01B change 1). AG-07 (CN-AG-07).

---

## 4. FD-11 reaffirmed: no credit notes in version 1

**(1) What it changes.** FD-11, Wave-0 table (L36): one line added.

**(2) Current words.**

L36:
> | FD-11 | Credit notes | **OUT for v1** — cancel-and-reissue; AG-6 mentions scrubbed; revisit with enterprise offline invoicing |

**(3) Proposed words.** The row is unchanged; the decision cell ends with:
> *Reaffirmed 2026-10-11 (AIW-D46) against AG-06 v1.7, which still names credit notes (AG-6-6: "corrections occur via credit note / new invoice / refund"); AG-06 removes them.*

**(4) Why.** AIW-D46. The founder chose "Keep FD-11": "FD-11 stands: no credit notes in version 1; the team removes the mentions from AG-06 (change note in Step 3)." The quoted text is AG-06 v1.7 AG-6-6 (L354), unchanged in the 11 Oct snapshot. Proposals row of 9 Oct (carve-out B, "Settle trust accounting … Also FD-11 (no credit notes) vs AG-6-6").

**(5) Knock-ons.** AG-06 (CN-AG-06). The platform's own billing: decided by AIW-D76 (change 13).

---

## 5. FD-15 reaffirmed: Restricted fields encrypted and masked, with an audited reveal

**(1) What it changes.** FD-15, Wave-0 table (L40): one line added.

**(2) Current words.**

L40:
> | FD-15 | AG-9 doc-metadata encryption | **B-1-derived rule** — metadata fields whose canonical class is in the B-1 Restricted list get envelope-encryption + masked audited reveal; binaries SSE + signed-URL |

**(3) Proposed words.** The row is unchanged; the decision cell ends with:
> *Reaffirmed 2026-10-11 (AIW-D58) against AG-07 v2.7 AG7-D10 and AG-7-88 ("Personal data SHALL NOT be masked on the client screen, list, search or export; no reveal step exists") and SA-11 v2.7 and SA-06, which applied AG7-D10: they come back to FD-15 for Restricted fields. Counsel confirms the Restricted list (B-1) before any Restricted field is stored. The AI sees status only, either way.*

**(4) Why.** AIW-D58. The founder chose "Keep FD-15": "FD-15 stands: Restricted fields (passport and financial numbers) encrypted and masked with an audited reveal; the team brings AG-07 (AG7-D10) back to it (change note in Step 3); counsel confirms the Restricted list (B-1) before any is stored. The AI sees status only, either way." The drifted wording is in:
- AG-07 v2.7 L718;
- SA-11 v2.7 L1;
- SA-06 v3.3 L55.

Proposals row of 10 Oct (Practice expert, two Restricted-field models).

**(5) Knock-ons.** AG-07 (CN-AG-07); SA-11 (CN-SA-11 change 5); SA-06 (CN-SA-06 change 2). B-1 stays in "Still open after this batch" (L149).

---

## 6. FD-17 reaffirmed in full: trust-aware from day one, light, all four parts

**(1) What it changes.** FD-17, Blueprint table (L53): one line added at the end of the decision cell.

**(2) Current words.**

L53 (extract, opening and part (a)):
> | FD-17 | Trust accounting (**supersedes FD-10**) | B/C | **Trust-aware from day one, LIGHT.** In scope for v1: (a) a mandatory `fundsDesignation` (TRUST \| OPERATING) on every client-money record — quote, retainer, deposit, invoice line, payment, refund;

**(3) Proposed words.** The row is unchanged; the decision cell ends with:
> *Reaffirmed in full 2026-10-11 (AIW-D45, AIW-D72) against AG-06 v1.7 AG-6-24 (an optional `fundsNature` tag, trust accounting deferred as an "explicit deferral, §13"): Release 1 carries all four parts (a) to (d) as worded above, with rules resolved from the Practice Pack (FD-22); AG-06 comes back to FD-17. The Billing assistant never posts a trust entry, moves a designation or computes a balance; it keeps no list and quotes no figure, and only reminds the person who holds the reconciliation, at the reconciliation cadence the Practice Pack sets, that the product's report is due (AIW-D72 as corrected 11 Oct 2026). Counsel reads it before any pilot on real client money.*

**(4) Why.**
- **AIW-D72**, 11 Oct 2026, asked again in full after the Lead's correction ("the 11 Oct question for AIW-D45 described FD-17 only as a mandatory tag"). The founder chose "Keep FD-17 in full": "Release 1 carries all four parts of FD-17 as the Founder Decisions Log words them: (a) a mandatory `fundsDesignation` (TRUST \| OPERATING) on every client-money record; (b) no automatic sweep of client funds into operating, only an audited, reason-coded move tied to a delivered milestone or issued invoice; (c) a per-client trust ledger with running balance; (d) a trust reconciliation report; rules resolved from the Practice Pack (FD-22). … The Billing assistant never posts a trust entry, moves a designation or computes a balance …"
- **The two correction rows** (`decisions.md`, appended). *AIW-D72 correction* supersedes the rest of that last sentence: the Billing assistant keeps no list of its own; it only reminds the person who holds the reconciliation (`agent/trust:reconcile`) that the product's trust reconciliation report is due, with a link, and quotes no figure. *AIW-D72 correction 2* sets the timing: the reminder goes out at the reconciliation cadence the Practice Pack sets, not monthly, because FD-17 makes the cadence a pack-supplied value ("reconciliation cadence … are all pack-supplied values", L53); Canada's value is set with counsel (counsel question 9). The founder's choice ("Keep FD-17 in full") is unchanged by either row.
- **AIW-D45.** The founder chose "Keep FD-17": "FD-17 stands (mandatory trust-or-operating tag on every client-money record, trust-aware light from day one). The team brings AG-06 back to FD-17 (change note in Step 3); counsel reads it before any pilot on real client money."
- **The drift.** AG-06 v1.7 AG-6-24 (L380): "The platform SHALL record transactions and MAY tag a payment's **`fundsNature`** … in Phase-1 (explicit deferral, §13)."
- **The mechanics are the team's.** How the trust ledger, the move and the reconciliation work is the team's billing design under FD-17 (`00-step3-plan.md`, "Trust accounting belongs to the team"); this line only reaffirms the decision.
- Proposals row of 9 Oct (carve-out B, "Settle trust accounting for Release 1").
- The first version of this change quoted AIW-D45 only, which described FD-17 as a mandatory tag. AIW-D72 corrects that (re-check S3a-b R-4). A later version quoted AIW-D72's last sentence before its correction rows existed (re-check S3a-d M-1).

**(5) Knock-ons.**
- AG-06 (CN-AG-06 changes 1 and 6), to FD-17's words only, with the accounting questions in AG-06 §13.
- The Billing assistant's limits (AW-01).
- Refunds: decided by AIW-D77 (change 14).
- Counsel pack question 9.

---

## 7. FD-21 reaffirmed: an email passcode before every signature

**(1) What it changes.** FD-21, Blueprint table (L57): one line added.

**(2) Current words.**

L57 (extract, first sentence):
> | FD-21 | Retainer signer assurance | B | **ARCHITECT-DECIDED.** Signing a retainer or any legally-operative instrument requires **one-time-passcode verification to the signer's on-file channel** (email by default, SMS where captured) before the signature is applied, and produces a sealed **evidence bundle**:

**(3) Proposed words.** The row is unchanged; the decision cell ends with:
> *Confirmed by the founder 2026-10-11 (AIW-D42) for the email passcode before every retainer signature, against AG-05 v1.9, which ships "token + consent + IP/UA capture" only; only the phone passcode is deferred.*

**(4) Why.**
- FD-21 is an architect call recorded for ratification (L46). AIW-D42 is the founder's confirmation of its email-passcode part, so that part is now his decision.
- AIW-D42. The founder chose "Keep the email passcode": "FD-21 stands for the email passcode before every retainer signature; only the phone passcode is deferred. The team adds the email passcode to Release 1 (change note to AG-05 §13 in Step 3)."
- AG-05 v1.9 L757: "Knowledge-based / strong identity verification (KBA, gov-ID, OTP-to-phone) before signing (Release 2 or later) — token + consent + IP/UA capture ships now". A22-5 (L106) already makes "OTP + sealed evidence bundle … the platform minimum".
- Proposals row of 9 Oct (carve-out B, "Settle e-signature identity for Release 1").

**(5) Knock-ons.** AG-05 signing page (CN-AG-05). The portal renders no signing step of its own (AG-05 CP1-D4, AG-5-53), so Doc 4 is not changed (CN-CP-portal).

---

## 8. A new section: the Workstream 2 (AI) decisions of 11 Oct 2026

**(1) What it changes.** A new section after the Blueprint batch and its FD-22 amendments (after L144, before "Still open after this batch", L148).

**(2) Current words.** None. The log's last entry is the Blueprint batch of 2026-08-02 (L44–L58) with the FD-22 amendments.

**(3) Proposed words.** Each row keeps to the founder's decision; where a word comes from a source rather than the decision, the source is in brackets.

> ## RESOLVED 2026-10-11 — Workstream 2 (AI assistants) batch
>
> > **Origin:** the founder's answers of 11 Oct 2026 to the Workstream 2 decision list, one by one, recorded with his words in Workstream 2's decision record (AIW-D36 to AIW-D72). FD-16 keeps its words; its reading on document typing is on its own row. Rows marked *provisional* stay provisional until counsel has read them (AIW-D64; counsel engaged by 31 Oct 2026, AIW-D68). Numbers FD-23 onward are proposed; the founder assigns them.
>
> | # | Decision | Category | RESOLVED as |
> |---|----------|----------|-------------|
> | FD-23 *(to assign)* | Whose AI assistant | D | AIW-D13 is read as **a named person**: any named staff member may have an AI assistant; the licence sits with the approver (AIW-D36, AIW-D26). The **delegation record** (which assistant works for which named person, with a subset of that person's permissions, on which files, from when until when; no identity and no permissions of its own) is consistent with FD-16, and the named person counts as the preparer for four-eyes; the delegation record stays a proposal until written into the requirement documents and read by counsel (AIW-D33). |
> | FD-24 *(to assign)* | The deadline watch | D | **The deadline watch is the product's own Minder**, sold as the free hook, described as the product's deadline watching, never as AI. The managers' at-risk list is the product's own two views. (AIW-D37) |
> | FD-25 *(to assign)* | Practice expert, version 1 | D | **Four fixed questions from a menu, answers built by rule from four sources, one optional AI summary line**; free questions are version 2. The rule-built answers go to the team as a change to AG-14. (AIW-D39) The expert's answers work with AI off (AIW-D54). |
> | FD-26 *(to assign)* | Where AI processing happens | B | **AI processing of client data happens only in Canada** (AG11-D15 wording, for firms' data and Expat Ready's own support tickets). The provider is chosen from Canada-region options, confirmed by one test call; if no capable option passes, the question returns to the founder. *Wording provisional until counsel.* (AIW-D52, AIW-D69) |
> | FD-27 *(to assign)* | Ten standing calls on the AI layer | D | (1) seeds and the product's own AI reading stay firm automations, unmetered; (2) the readiness report is built by rule, and the officer's acceptance is the submission for review; (3) money: the assistant proposes, a person saves in the product's screen; (4) the expert's line is display-only; (5) no assistant task can close a deadline; (6) no AI text in the retainer; (7) the pack assistant is read-only; (8) platform runs are stamped with one firm, with no cross-firm sweep in version 1; (9) team documents never override founder decisions by date; (10) the expert's answers work with AI off. (AIW-D54) |
> | FD-28 *(to assign)* | Hard limits and the blocked list | B | **Adopted, provisional until counsel reads them**, with one exception: the Lifecycle Keeper may draft a consented message to a past client for a person to approve after the file closes. (AIW-D55) |
> | FD-29 *(to assign)* | No active licensed user in the firm | B | Client-facing preparation **pauses while a firm has no active licensed user**; on by default; the Owner may switch it off with a recorded reason. *Provisional until counsel.* (AIW-D56) |
> | FD-30 *(to assign)* | Approving many items at once | B | Anti-rubber-stamp safeguards on every *approve all*: low-confidence values opened first; a few values hidden for the approver to fill, match rate recorded; an alarm when a person's agreement rate climbs suddenly. *Provisional until counsel.* (AIW-D57) |
> | FD-31 *(to assign)* | Release scope | C/D | **Release 1 does not launch without the AI assistants** (reaffirms AIW-D14 and AIW-D21). (AIW-D66) |

The log's version line moves from 1.5 to 1.6 when the founder places it.

**(4) Why.** Each row carries the founder's choice of 11 Oct 2026 as recorded in `ai-workers/decisions.md`:
- AIW-D36 "Yes, a named person";
- AIW-D37 "Product feature, sold honestly";
- AIW-D39 "Accept; answers go to the team";
- AIW-D52 "Only in Canada";
- AIW-D54 "Confirm all ten";
- AIW-D55 "Adopt, with the one exception";
- AIW-D56 "Yes, pause by default";
- AIW-D57 "Adopt all three";
- AIW-D66 "Launch waits for AI".

The wording of each row follows the "Effect" column of its decision. Review S3a fixes applied:
- FD-23 keeps AIW-D33's condition that the record is read by counsel (m-3).
- FD-24 drops "on every plan", which came from SA-3-35, not D37 (m-3).
- FD-26 drops a team-decision clause (m-3).
- FD-31 keeps only AIW-D66's decision, not the consequences the Lead recorded beside it (M-7).

AIW-D71 and AIW-D72 are not rows here: AIW-D72 is FD-17 kept in full (change 6), and AIW-D71 is a reading of FD-16 (change 9).

The log is "the single sign-off artifact" (L12), so a decision the team must follow belongs here. IMP-32 made the same point for the co-founder's AG11-D rows; this note does not ratify those.

**(5) Knock-ons.** AG-11 §0: where they touch these founder decisions, the AG11-D rows sit below them (CN-AG-11). The Program Charter's release-scope text is in `ai-workers/charter-edits.md` §1. The counsel pack (`ai-workers/requirements/counsel-pack.md`, written by the Lead) covers the provisional rows. The platform values of the approve-all safeguards (FD-30) are platform settings in SA-12-33, held on by the approve-all part of the *founder safeguards* setting until a recorded founder decision ends that part (CN-SA-12 change 3).

---

## 9. FD-16 read: a document's filing type is not an "effect"

**(1) What it changes.** FD-16, Blueprint table (L52): one line added at the end of the decision cell.

**(2) Current words.**

L52 (extract, third and fourth sentences):
> AI is a bounded, declared capability layer over the machinery (drafting, summarisation, document extraction, suggestion) whose every output is human-approved before it has effect. **Consequence:** AI is NOT a first-class actor — no AI principal in the identity spine, no autonomous permissions, no new plane.

**(3) Proposed words.** The row is unchanged; the decision cell ends with:
> *Read 2026-10-11 (AIW-D71): an internal, reversible, audited filing label (the Reader's proposed document type) is not an "effect" under this decision, so high-confidence types may later be applied without a person's click; in the pilot every type still goes to a person, and the pilot's accuracy figures set the threshold. Values read from documents always need a person (AG11-D10).*

**(4) Why.**
- **AIW-D71**, 11 Oct 2026. The founder chose "Not an effect, but after the pilot": "An internal, reversible, audited filing label (the Reader's proposed document type) is not an "effect" under FD-16, so high-confidence types may later be applied without a person's click; **in the pilot every type still goes to a person**, and the pilot's accuracy figures set the threshold (IMP-30). Values read from documents always need a person (AG11-D10)."
- The reading closes `case-assistant.md` §11 decision 8 and assumption AIW-A10 (AIW-D71).
- FD-16's "human-approved before it has effect" is what the reading interprets, so the reading belongs on FD-16's row, where the team will look for it.

**(5) Knock-ons.**
- AG-09 (CN-AG-09 change 1). The product rule there names a state the product can check (no published threshold) instead of "the pilot".
- AW-01 cites AIW-D71.
- No change to FD-16's own words, to AIW-D13 or to AIW-D33.
- AIW-D80 (11 Oct 2026, "Same as labels") reads AIW-D71 the same way for an AI-drafted internal note that is never sent; during the pilot every one still goes to a person (CN-AG-11 change 3). It is recorded in Workstream 2's decision record and needs no further line in the log.

---

## 10. FD-7 amended: the employer's read-only recruitment summary tile is deferred

**(1) What it changes.** FD-7, Wave-0 table (L32).

**(2) Current words.**

L32:
> | FD-7 | AG-17 Recruiter | **Light-evidence** (LMIA recruitment-effort evidencing, not ATS-grade) · **no candidate identity plane** (records-only) · **CP-9 employer sees read-only summary**. ATS-grade = plan-gated growth path |

**(3) Proposed words.**

> | FD-7 | AG-17 Recruiter | **Light-evidence** (LMIA recruitment-effort evidencing, not ATS-grade) · **no candidate identity plane** (records-only) · ~~**CP-9 employer sees read-only summary**~~ **AMENDED 2026-10-11:** the employer's read-only recruitment summary tile is deferred to a later release, as the team's CP1-D7 plans; AIW-D67's full employer actions (upload, pay, sign, seat management) stand (AIW-D73). ATS-grade = plan-gated growth path |

**(4) Why.** AIW-D73, 11 Oct 2026 (open point 1). The founder chose "Defer the tile": "**Amends FD-7:** the employer's read-only recruitment summary tile is deferred to a later release, as the team's CP1-D7 plans. AIW-D67's full employer actions (upload, pay, sign, seat management) stand. Not AI. The founder places the amendment in the Founder Decisions Log on Drive."

**(5) Knock-ons.** AG-15 CP1-D7 and AG-17 (AG-17-30) already match; Doc 4 §3.9 and §13 item 8 follow (the team's own change). Not AI.

---

## 11. The reach of AIW-D52: Canada for every Expat Ready AI call

**(1) What it changes.** The proposed row FD-26 of change 8 ("Where AI processing happens").

**(2) Current words.** Change 8's proposed FD-26 row: "**AI processing of client data happens only in Canada** (AG11-D15 wording, for firms' data and Expat Ready's own support tickets)."

**(3) Proposed words.** FD-26's row gains, after its first sentence:
> **Every AI call Expat Ready makes**, including pack drafting that holds no client data, happens only in Canada under the one published provider record (SA-8-49) (AIW-D74).

**(4) Why.** AIW-D74, 11 Oct 2026 (open point 3). The founder chose "Yes, Canada for all AI": "AI processing for **every** AI call Expat Ready makes, including pack drafting that holds no client data, happens only in Canada under the one published provider record (SA-8-49). The Pack author's assistant may make model calls once that record is published."

**(5) Knock-ons.** SA-08 SA-8-51 (CN-SA-08 change 2); SA-01 and SA-01B drafting steps (CN-SA-01, CN-SA-01B); AW-02 (the Pack author's assistant).

---

## 12. FD-4 as amended: Practice Pack reference data also needs two people

**(1) What it changes.** FD-4, Wave-0 table (L29), the amendment of change 1.

**(2) Current words.** Change 1's proposed amendment: "reference data in a published country pack (fees, wage tables) also needs two people, matching SA-01 v2.2 §3.12 (AIW-D48)".

**(3) Proposed words.** The amendment of change 1 ends with:
> ; **and in a published Practice Pack**, as for country packs (FD-22 A22-6.6) (AIW-D75)

**(4) Why.** AIW-D75, 11 Oct 2026 (open point 4). The founder chose "Yes, two people for all packs": "Reference data in a published **Practice Pack** also needs two people before publishing, as for country packs (AIW-D48; FD-22 A22-6.6). The founder places the amendment with AIW-D48's on Drive."

**(5) Knock-ons.** FD-22 A22-6.6 already applies FD-4's dual control to the Practice Pack's rule-bearing artifacts; the team's Practice Pack publishing follows (the team's own change).

---

## 13. FD-11's reach: the firms' billing only

**(1) What it changes.** FD-11, Wave-0 table (L36): one more line added, after change 4's line.

**(2) Current words.** As change 4.

**(3) Proposed words.** The decision cell also ends with:
> *Read 2026-10-11 (AIW-D76): FD-11 applies to the firms' billing of their clients (AG-06) only; Expat Ready's own subscription billing (SA-04, SA-08) keeps the team's design, including processor credit notes.*

**(4) Why.** AIW-D76, 11 Oct 2026 (open point 5). The founder chose "No, FD-11 is about firms' billing only": "FD-11 (no credit notes in version 1) applies to the firms' billing of their clients (AG-06) only; Expat Ready's own subscription billing (SA-04, SA-08) keeps the team's design, including processor credit notes. Not AI."

**(5) Knock-ons.** None: SA-04 and SA-08 keep their words.

---

## 14. FD-17: money returned to a client from trust is recorded in Release 1

**(1) What it changes.** FD-17, Blueprint table (L53): one more line added, after change 6's line.

**(2) Current words.** As change 6.

**(3) Proposed words.** The decision cell also ends with:
> *Decided 2026-10-11 (AIW-D77): Release 1 records money returned to a client from trust (for example an unused retainer), so the trust ledger stays right; the team designs the mechanics under FD-17; the platform never moves money (FD-12); consultation refunds stay as FD-13 and AG-4-46 have them. No assistant records a refund.*

**(4) Why.** AIW-D77, 11 Oct 2026 (open point 6). The founder chose "Yes, team designs how": "Release 1 records **money returned to a client from trust** (for example an unused retainer), so the trust ledger stays right; the team designs the mechanics under FD-17 (AG-06 §13 item 11); the platform never moves money (FD-12); consultation refunds stay as FD-13 and AG-4-46 have them. No assistant records a refund."

**(5) Knock-ons.** AG-06 §13 item 11 (h) (CN-AG-06 change 6): refunds of trust money are decided for Release 1; the mechanics stay the team's. AW-01 AW-1-39 (no assistant records a refund).

## 15. The Workstream 2 (AI) decisions of 12 Oct 2026, and what they change in this note's earlier rows

**(1) What it changes.** (a) FD-16's row (L52): one more line. (b) Change 8's proposed section: the rows FD-27 (call 3) and FD-28, and the words "provisional until counsel" throughout. (c) Change 14's last sentence. (d) A new block of rows after change 8's block.

**(2) Current words.** FD-16 (L52) as change 9 leaves it. Change 8, FD-27 call (3): "money: the assistant proposes, a person saves in the product's screen"; FD-28: "**Adopted, provisional until counsel reads them**, with one exception …"; the block's origin line: "Rows marked *provisional* stay provisional until counsel has read them (AIW-D64; counsel engaged by 31 Oct 2026, AIW-D68)." Change 14: "No assistant records a refund."

**(3) Proposed words.**
- (a) FD-16 adds: *Narrowed 2026-10-12 (AIW-D92): every capability and output belongs to one of four classes (rules only, AI explains rule results, AI language, person only); the phrase "AI-assisted" is not used for assessments, scoring or any rules-only capability. Read 2026-10-12 (AIW-D93, D103): AI teammates may call read tools and action tools under the delegated person's permission and may prepare consequential acts, but every act with an effect is approved by an authorised person before it takes effect, bound to the exact preview; "no model output is ever a decision" stands.*
- (b) FD-27 call (3) becomes: "money: the assistant prepares invoices and proposed trust entries; an authorised person approves the exact preview before the product executes; a payment is still recorded by a person; the platform never moves money (AIW-D103; FD-12)". FD-28 becomes: "**Adopted** (AIW-D55), with one exception …; **for invoices, proposed trust entries, exports, deletion requests, settings changes and signature workflows, replaced by action-specific controls** (AIW-D103): the AI prepares, an authorised person approves the exact preview before execution, signatures stay with the signer, and the AI never grants itself permissions or bypasses product controls." The origin line becomes: "No counsel is engaged (AIW-D94, 12 Oct 2026); rows once marked *provisional* are the Lead's guidance, unconfirmed: no counsel."
- (c) Change 14's last sentence becomes: "An assistant may prepare the return of trust money for an authorised person's approval; it never executes it (AIW-D103)."
- (d) New rows (numbers to assign by the founder):

> | # | Decision | Category | RESOLVED as |
> |---|----------|----------|-------------|
> | FD-32 *(to assign)* | AI tools | D | AI teammates may call read tools and write or action tools, always under the delegated person's own permission; every action with an effect waits for a person's approval, then the platform performs it; text inside client documents never chooses a tool. (AIW-D93) |
> | FD-33 *(to assign)* | No external validation | C | No counsel and no consultant conversations; building never waits on validation; legal points are the Lead's guidance, unconfirmed. (AIW-D94; supersedes AIW-D64's counsel gate and AIW-D68) |
> | FD-34 *(to assign)* | Who runs the assessment | D | An AI teammate may run the eligibility assessment under the delegated person's permission; the rules engine calculates every result; telling a lead or client stays with a licensed person. (AIW-D96; reopens AIW-D40) |
> | FD-35 *(to assign)* | Rules under the AI | D | Workstream 2 assumes the rules engine and packs are complete and tested (Workstream 1's); the AI uses only approved engine results, explains them with sources and the pack version, stops on missing, stale or conflicting evidence; explanations are reviewed by a licensed person; no claim that the AI detects incorrect rules. (AIW-D98) |
> | FD-36 *(to assign)* | Autonomy | D | Values from uploads reviewed in one sitting, provisional until approved, explicit checks where it matters (AIW-D100); two presets, "Review each step" (default) and "Review at checkpoints", and a grid that never grants access (AIW-D101); earned Auto for routine internal work only (AIW-D104); published templates' automatic use counts as approval inside AI jobs, AI-written text still approved (AIW-D105). |
> | FD-37 *(to assign)* | Leads at launch | D | Approved templates and guided intake questions automatically; AI-written replies approved; **a conversational AI for leads in Release 1** (administrative intake, FAQs, booking): the AI only sorts the question into an approved topic, a rule picks the firm's published answer, the Scheduler books, anything else, eligibility included, goes to a person; nothing AI-written reaches a lead unapproved. (AIW-D102 as amended by AIW-D107) |
> | FD-38 *(to assign)* | AI-prepared consequential acts | B | As FD-28 as changed above. (AIW-D103; supersedes AIW-D44; amends AIW-D55, D72, D77) |

**(4) Why.** The founder's answers of 12 Oct 2026, recorded with his words in `ai-workers/decisions.md` AIW-D92 to AIW-D105. AIW-D92 says "The founder places the FD-16 amendment on Drive".

**(5) Knock-ons.** AW-01 v0.7 (AW1-D40 to AW1-D50; AW-1-127 to AW-1-145); AW-02 v0.9; CN-AG-03 change 5; CN-AG-06 changes 6 (amended) and 7; CN-AG-09 change 1 (amended); CN-AG-11 changes 14 to 17; CN-AG-12 change 3. Team conflicts stated, not settled: AG-11-94 (AIW-D93), AG-11-60 (AIW-D100), SA1B-D18 (AIW-D98).

