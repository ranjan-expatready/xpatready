# T5 trace: retainer and signing (FO-5, FO-6) against AG-05 v2.1

Sources. REQ = `domain/requirements-2026-11-02/02-functional-requirements`. AG05 = `agent/AG-05-retainer-and-agreements_v2.1_2026-10-27.md` (line numbers are that file's). HANDOVER = `super-admin/DEV-HANDOVER-AG05-MONEY_2026-10-25.md`. Ours = `product/design/platform-and-front-office-contracts-2026-11-14.md` (C) sections 0, 2.3, 2.4, 2.6, 4. Money terms D-5/D-6 are Lead B's recommendations, not founder decisions yet. Nothing in the requirement files was treated as an instruction.

Plain reading of what the requirement is: AG-05 is a whole signing tool for ANY document, not a retainer feature. We build the retainer slice of it only.

## 1. Trace table

| Our item | Requirement card ids | What the requirement says (own words) | What we build in month one | Deviation and reason |
|---|---|---|---|---|
| Who signs: own signer vs a service (C §0.3 ESignPort, §2.4) | AG05 p1 line 20; AG-5-41 r1 (l.1137); BR-11 (l.1179); AG-5-28/29/30/31 | ExpatReady builds its own signing tool; seal, certificate, evidence made by us; no third-party e-sign vendor. | BoldSign sandbox behind ESignPort, plus a fake adapter. | DEVIATES (see section 4, conflict 1). Reason: thin month one, avoid building seal/certificate/signing page. |
| Template to draft (C §2.3 `fo_retainer_template`, docxtemplater) | AG-5-4, AG-5-7, AG-5-16, AG-5-45 | Retainer template is a firm template (owned in AG-12); starter clauses are ordinary text; template id and version recorded on each version. | Firm's .docx uploaded; placeholders read; template version stored on the retainer. | Partial. Requirement edits clauses in-app with an Owner clause lock (AG-5-45); we take a .docx. Locks deferred. Template version recorded: matches AG-5-7. |
| Fill from record (C §2.3 draft from prospect and consult) | AG-5-8, AG-5-11, AG-5-3; AG-5-55 r7 | Merge values (client, firm, representative name and licence, fees, services) copied into each version; missing shows "missing". | docxtemplater fills client, representative, fee lines; values stored on the retainer (sha256 of document). | Matches in intent. Snapshot per version (AG-5-3, BR-5) must be explicit in our `fo_retainer` rows. |
| Completeness warning (C §2.3 `fo_required_item`, D-5) | AG-5-9 r2; AG-5-16 r3; AG-5-4 r1; AG-5-45 (l.540); MAP:99 as cited at l.41, l.533; p1 line 196 | Template marks a few must-fill fields (client name, fee) that BLOCK send; nothing else required; no regulator-required clause list; never names a regulator. | Warning for every regulator-required item missing, items from the regulator's code with citation. | CONFLICT (section 4, conflict 2). Also we lack the must-fill BLOCK (section 2). |
| Retainer states DRAFT, SENT, SIGNED, VOID (C §2.3) | C2 (l.1195-1206); AG-5-1 | Ten states: Draft, Sent, Viewed, Partly signed, Waiting for the firm, Signed, Signed offline, Declined, Withdrawn, Expired. | Four retainer states; signature-request has SENT, VIEWED, SIGNED, DECLINED, EXPIRED. | Reduced set for thin month one. Add PARTLY_SIGNED, CLIENT_SIGNED (our "client signs then representative countersigns") and SIGNED_OFFLINE; keep VOID = Withdrawn. See section 2. |
| Fee lines (C §2.3 `fee lines`) | AG-5-64 r1-r3, r9, r13; BR-14 | Fees panel: services, fixed or hourly, schedule rows with "When" (first row "Deposit on signing"), disbursement estimate, tax; adds-up warning never a block; currency locked at send. | Fee lines: amount, currency CAD, tax, trust or operating tag. | Thinner than the requirement. The trust tag is ours; the requirement tracks trust in AG-06 (HANDOVER l.63). Deposit row and "When" are needed so AG-06 can read them; see section 2. |
| Fee schedule and deposits link to AG-06 (C §2.5, §2.6) | AG-5-40 r1-r3, r7 (l.1052-1058); AG-5-37 r6; BR-14 | AG-05 raises no invoice. On signing, AG-06 prepares a deposit request from the deposit row ("Ask me first"); invoices only by "Bill this". | FO-7 makes an invoice from the retainer's fee lines (C §2.5 `POST .../retainers/:id/invoice`). | DEVIATES in mechanism, matches in intent: a person clicks. No automatic invoice at signing: matches. Our "deposit request" step is missing; flagged to the FO-7 trace, not decided here. |
| Send for signature (C §2.3 `.../send`, §2.4) | AG-5-15 r2-r3; AG-5-61; AG-5-60 r1 (l.1100-1109) | Send is a person's click; approve and send may be one button; Send applies stored signature, opens request, emails each client signer through the firm's send path, locks currency. | `retainers/:id/send` creates the BoldSign request; BoldSign emails the link. | Email comes from the vendor, not from the firm's send path (AG-10). Accept for month one; note the From line and timeline logging differ (AG-5-60 r2-r3). |
| Client signs, then representative countersigns (C §2.4) | AG-5-62 r3-r5 (l.420-422); AG-5-26; AG-5-63 r4 (l.705); AG-5-27 | Clients sign in any order; firm signs last, server-checked. Normal path is the representative's STORED signature applied at send; countersign only when none stored. | Client signs, then representative countersigns, always. | Subset: we implement only the "no stored signature" branch. Matches the countersign card AG-5-27. Stored signature deferred (section 3). |
| Signing order, several signers (C §2.4 `signers`) | AG-5-62 r2, r5; AG-5-25 | Several client signers, any order; firm last; completion in one transaction. | `signers (role, email, signed_at)` list; no rule stated. | Add rule: firm signer opens only after every client has signed (BoldSign sequential order). See section 2. |
| Identity check (C §2.4, D-6) | AG-5-61 r13 (l.353); AG-5-54 r13 (l.408); AG-5-19 | No identity check beyond the single-use link and the consent tick; no SMS code. | Single-use link and a one-time code by email. | EXTRA: we add a check the requirement lists as a non-goal for "identity" (only SMS is named as excluded at l.408; email code is not named). Reason: counsel unconfirmed. Treat as an add-on, not a conflict; founder decision D-6 stands. |
| Consent before signing | AG-5-20 r4 (l.394); AG-5-18; BR-8 | Signer ticks "I agree to sign electronically" before any field is accepted; consent text version stored per request. | Not in our design (vendor shows its own consent). | Gap, see section 2. |
| Evidence stored (C §2.4 sealed file, evidence file, sha256) | AG-5-28 r1, AG-5-30, AG-5-29; R32 as cited l.395 | Evidence fixed in code: time, IP, device, consent at view, consent, sign, decline; certificate with both hashes; original hashed when version made. | Sealed copy and vendor evidence file stored with us, sha256 of each. | Matches in intent if BoldSign's audit trail carries time, IP, device, consent; hash of the ORIGINAL at draft time is also required (AG-5-28 r1). Add. |
| What the client receives | AG-5-31 r4 (l.449); AG-5-60 r1 | "Your signed agreement" (signed PDF plus certificate) emailed to each client signer automatically; cannot be switched off; filed in Documents. | Not stated in C §2.4. | Gap, see section 2. |
| Versions (C §2.3 `version`, `supersedes_id`) | AG-5-65 (l.765-791); AG-5-2; BR-7 | Edit while Sent/Viewed makes version n+1; old request ends; old link says updated; one "Updated agreement" email; once any client signed, edit refused. | `version`, `supersedes_id` on the retainer. Rules not stated. | Add the three rules to FO-5: edit only before any signature; old request cancelled at once; refuse after first signature. Section 2. |
| Amendment ("addendum") (C §2.3 Job: "versions and addenda") | AG-5-66; MS-D5 | Short amendment linked to a SIGNED retainer showing only changes; same signing flow; original never changes. | "versions and addenda" is named in the §2.3 Job; no table, API or event for it. | Gap or deferral: see sections 2 and 3. |
| Void (C §2.3 `.../void`) | AG-5-34 r2-r4; AG-5-35 | Withdraw from Sent through Client-signed with a required reason; clients told by email (firm may switch off); Re-issue copies last version into a new linked agreement. | `POST .../void`; status VOID. | Add required reason and cancel-at-vendor; re-issue is a "new retainer from template", acceptable for month one. |
| `retainer.executed` makes prospect WON (C §2.4, §2.6) | AG-5-37 r1, r5 (l.1026, l.1033); BR-2 (l.1170); AG-5-38; C6 (l.1306) | `envelope.signed` at Executed; AG-02 makes the client once, for kind RETAINER only; an amendment makes no client; signature causes the client step, never the reverse. | `retainer.executed` event; prospect WON with `won_via E_SIGNED`. | Matches (name differs, see section 5). Event also needs `kind`, `version`, agreed total and currency (l.1306). |
| Signed offline (C §2.6 "Signed offline") | AG-5-39 (l.925-946); AG-5-37 r1 | Staff upload the signed paper PDF plus a reason; counts as signed; no certificate, no fake seal; own event with no file; AG-02 makes client. | A person's "Signed offline" with a reason makes WON (§2.6); no upload step stated in §2.3 or §2.4. | Partial: add the upload and "Signed on paper" filing, no seal. Section 2. |
| Sealed copy stored, hashed | AG-5-28 r1, AG-5-41 r1-r2 | Both hashes stored; downloads only by short-lived checked links; firm-prefixed Canadian storage. | Files stored with us, sha256 of each. | Matches in intent; short-lived links to be stated. |
| Signing webhook | AG-5-37 r4; BR-13 | Events at-least-once and safe to repeat (key: envelope id + event name). | `/api/hooks/boldsign`, stored once by event id (C §0.4). | Matches in intent. |
| Representative must be licensed; "Convert to client" if retainer unsigned (C §2.3, §2.6) | AG-5-49 / BR-4 (l.508, l.1172); AG-5-57 | The one kept block: no active licensed person means no new retainer. Representative picked in a fixed order. | "representative staff_id" only. | Gap on the block; see section 2. |
| WON without payment (C §2.6 last bullet) | BR-14 (l.1182); AG-5-40 r2; HANDOVER l.68 | Unsigned or unpaid is a warning, never a block. | Same. | Matches. |

## 2. Mandatory in the requirement for the parts we keep, missing from our design

- **AG-5-9 r2 (must-fill block):** client name and fee must be non-empty before Send. Fix: FO-5 blocks send on those two items; everything else only shows "missing".
- **AG-5-49 / BR-4:** no active licensed person means no draft. Fix: FO-5 refuses a draft when the firm has no active licensed representative ("No active licensed consultant").
- **AG-5-65 r2, r3, r7 (versions):** edit before first signature makes version n+1, old request cancelled, old link dead; edit after first signature refused. Fix: state all three in §2.3 and add a test per rule.
- **AG-5-26 / AG-5-62 r5 (order):** firm signer opens only after every client has signed, checked on the server. Fix: put the order in the BoldSign request and re-check in the webhook handler; test one forced out-of-order call.
- **AG-5-20 r4 / BR-8 (consent):** no signature without the consent tick, consent version stored. Fix: confirm BoldSign's consent step; store the consent text version and the vendor's record in our evidence file; if the vendor's consent differs, say so on screen.
- **AG-5-28 r1, BR-10 (hash of the original at draft time):** the original is hashed when the version is made, the signed file at completion, both stored. Fix: add `original_sha256` per version to `fo_retainer`; check it before send.
- **AG-5-3 / BR-5 (snapshot):** merge values and fees copied into each version; later record changes never alter a sent version. Fix: store the bound values on the version.
- **AG-5-31 r4:** each client signer receives the signed copy plus certificate automatically. Fix: FO-6 sends it through MailPort when the sealed file lands, not only on request.
- **AG-5-39 (Signed offline):** upload of the signed paper plus reason; no certificate; own event; filed as "Signed on paper". Fix: add the upload to FO-6 and the event (`retainer.signed_offline`, no file).
- **AG-5-34 r2:** Withdraw needs a required reason and is refused after Signed or Signed offline. Fix: void takes a reason; cancel the vendor document.
- **AG-5-64 r2-r3, AG-5-40 r1 (deposit row):** the first fee row is "Deposit on signing" with a "When"; AG-06 reads it. Fix: add `when` to our fee lines (On signing, On a date, When submitted, When decided, When done) so FO-7 can read it.
- **AG-5-37 r3 and C6 (l.1306):** executed event carries kind, version, signer person ids, executed document key, certificate key, agreed total, currency. Fix: add to the `retainer.executed` payload; carry `kind` as RETAINER (an amendment must not make a client).
- **BR-21 / AG-5-32 r3:** never expire once any client has signed. Fix: our `EXPIRED` status applies only before the first client signature.
- **AG-5-68 (decline):** one decline declines all; shown on prospect and case; one task for the owner. Fix: map vendor "declined" to `DECLINED`, show on the prospect timeline, one item for the owner.

## 3. Requirement says, we defer past month one

- **Own signing engine** (AG-5-61 and chapter 1 of AG05): no third-party vendor; our own no-login page, seal, certificate. Deferred by using BoldSign (needs founder decision, section 4).
- **Send any document for signature** (AG-5-61 r1-r7): letters, job offers, any PDF. We sign retainers only.
- **Stored signature applied at send** (AG-5-63 r2, r9, r10; AG-5-27 deviation): needs a profile signature with consent (AG-1-72 as cited at AG-5-63).
- **Countersign by another key holder or the Owner** (AG-5-63 r5, r8).
- **Organisation signatory** (AG-5-50) and several client signers in one retainer (AG-5-62): month one supports one client signer plus the representative, unless BoldSign order makes more free.
- **Reminders, expiry, Send again** (AG-5-33, AG-5-32): automatic reminders every 4 days up to 3, 14-day expiry. We have `remind` and `EXPIRED` in the design only; the firm timings screen (C3) is deferred.
- **Amendment** (AG-5-66): prepare after signing; "versions and addenda" in §2.3 Job has no table or API yet.
- **Marked signed by mistake** (AG-5-67).
- **Signing list** (AG-5-69), **second open retainer prompt** (AG-5-55 r8), **language versions** (AG-5-12, AG-5-14), **clause locks** (AG-5-45), **Save as default** (AG-5-64 r10), **keep-period warning** (AG-5-43), **personal-data export** (AG-5-44).
- **Currency USD** and **currency lock at send** (AG-5-55 r5): month one is CAD only (C §2.3).
- **"Retainer not signed" case warning** (AG-5-51): case side, Lead 37.

## 4. Conflicts

**Conflict 1: own signer vs BoldSign. Founder needed.**
Evidence. AG05 line 20: "No third-party e-sign vendor is used." AG05 line 1137 repeats: no third-party e-sign vendor holds any of the files. BR-11 (line 1179) states it as a business rule. AG05 lines 28-31 and the HANDOVER section 3 ("One signing tool for every document") describe an in-house tool: no-login link, consent, seal, certificate, events. The phrase "ExpatReady Signer" does not occur in the file; "Signer" is only a named doer (line 248, among Drafter, Mailer, Reminder) and "ExpatReady's own signing tool" is line 20. Our design (C §0.3, §2.4) uses BoldSign sandbox, which contradicts BR-11 and the stated vendor-free storage. Facts apart from judgment. Judgment: for a thin month one the vendor is faster and the port keeps a later swap possible, but it is a first-source conflict, not ours to settle silently (AGENTS rule 2).
Suggested question for the founder: "The team's requirement says ExpatReady builds its own e-signature and uses no outside vendor. We propose BoldSign test mode behind our own port for month one. Is that acceptable as a temporary step?" Also ask: is it acceptable that the vendor holds a copy of the document while we store ours (BR-11 says the vendor holds none).

**Conflict 2: regulator-required items. Founder needed.**
Evidence. AG05 line 41 and line 540: starter clauses are ordinary editable text, "only the firm's Owner may lock" its own; line 539 "Nothing is required; send is never refused for a missing clause"; test at line 550: deleting a clause means the draft sends "no warning is shown"; line 196 and line 536-554 "ExpatReady never says a clause is required or correct" and "never names a regulator" (AG-5-4 field 10 and non-goal 13 "No 'required' badges"). Ours C §2.3: `fo_required_item` catalogue "the items the regulator requires", completeness warning per missing item, citations (P-170).
This is direct. The requirement itself routes legal wording to counsel as an immigration-expert item (D3 l.1460 "the immigration-expert routing note for clauses ... dropped"). Our rule 4 of AGENTS requires official citations for immigration values, which is why Lead B designed it; the team has deliberately removed it. Not a decision for us. Smallest honest build: ship the must-fill block (AG-5-9) only, label the catalogue "optional checklist, Sample, warning only", and ask.
Suggested question: "The team removed 'required clauses' and never names a regulator. We planned a regulator-cited completeness warning. Keep it as an optional checklist for firms, or drop it and follow the team?"

**Conflict 3: stored signature vs always countersign. Founder not needed (minor).** AG-5-63 r2 makes the stored signature the default; countersign only when none stored. Our month one always countersigns. This is a subset of the requirement (the no-stored-signature branch), consistent; note it in the row.

**Conflict 4: email code. Founder decision D-6 already open.** Requirement says no identity check beyond link and consent (l.353), no SMS code (l.408). An email one-time code is not named. Not a conflict, but an extra step the team did not ask for; D-6 recommendation stands as an add-on.

**Conflict 5: where retainer emails come from. Not blocking.** Requirement sends every signing email through the firm's own send path (AG-10 BR-1, AG-5-60 r2-r3), system emails with no copy. BoldSign sends its own mail. For month one the founder need not decide; mark on screen.

## 5. Term mapping

| Ours | Requirement |
|---|---|
| retainer (`fo_retainer`) | Agreement (`RetainerAgreement`, kind RETAINER); AG05 uses "Retainer" for the firm's service agreement (l.210) |
| addendum | Amendment (kind AMENDMENT), AG-5-66 |
| void | Withdraw (status `VOIDED`, screen "Withdrawn"), AG-5-34 |
| `fo_signature_request` | Signing request (`ESignEnvelope`) |
| signers (role) | Signer (`ESignRecipient`): CLIENT, ORGANISATION_SIGNATORY, FIRM_SIGNER |
| representative (staff_id) | Representative (`representativeUserId`): licensed person whose licence is on the retainer |
| representative countersigns | Countersign (AG-5-27) |
| SIGNED | `EXECUTED`, screen "Signed" |
| (not in ours) | `SIGNED_OFFLINE` "Signed offline" |
| `retainer.executed` | `envelope.signed` (kind RETAINER) |
| `retainer.sent` | `envelope.sent` |
| `retainer.voided` | `envelope.voided` |
| `retainer.drafted` | audit `CREATED` only; no domain event (AG-5-55 rule 9) |
| `won_via E_SIGNED` | `wonVia` = signed; AG-5-39 cites `wonVia = SIGNED_OFFLINE` (l.935) |
| fee lines | Fees panel: service lines plus `ScheduleRow`s |
| trust or operating tag | Not in AG-05; AG-06's "received into" (HANDOVER l.66) |
| sealed file, evidence file | signed PDF (`signedDocKey`), certificate (`certificateKey`) |
| completeness warning, `fo_required_item` | no equivalent; closest is must-fill fields (AG-5-9) and clause locks (AG-5-45) |
| `DocumentRenderPort` docxtemplater | Drafter doer (A2 l.248) |
| MailPort | Mailer through AG-10 |
