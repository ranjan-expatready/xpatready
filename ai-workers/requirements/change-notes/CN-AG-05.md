# CN-AG-05: change note to AG-05 Retainer and Agreements

| Field | Value |
|---|---|
| Module changed | AG-05 Retainer & Agreements |
| Version and file | v1.9 of 7 Oct 2026, `02-functional-requirements/agent/AG-05-retainer-and-agreements_v1.9_2026-10-07.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`, unchanged since 9 Oct; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (fix round after review S3c) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-5-54 to AG-5-56 (highest AG-5-53, L453) |
| Companion files | CN-AG-04 (the consult record's scope field); CN-AG-07 item 8 (the one onboarding list); CN-AG-11 (`retainer.ended` trigger); CN-SA-06 change 3 (the same key split); CN-CP-portal (the passcode step in the signing room); AW-01 v0.1 (Intake and Case assistants) |

**In plain words.** The founder kept FD-21 on 11 Oct: before every retainer signature the signer confirms a one-time passcode sent to their email (the passcode by text message can wait). The retainer may contain no AI-written text: scope and fee come only from what a person typed. Onboarding messages are no longer tied to the signature but to the opening of the case. The module gets an "ended" event so the AI assistants know when to stop. And the one permission key that covers both "generate a draft" and "approve it for sending" is split in two, as the roles document's change note does.

**Terms used.** *Drafter* here is the template engine that builds the retainer (unchanged). *Writer*: the AI Doer that drafts text for a person to approve (AIW-D53); it never writes into a retainer. *AI assistant*: an assistant working for one named person under that person's delegation (AW-01; FD-16). *Idempotent*: delivering the same event twice has the effect of delivering it once.

---

## 1. Email passcode before every retainer signature, in Release 1 (FD-21 kept)

1. **Where.** §13 named deferral (L757); §3.5 (L239–L251); BR-8 (L466); §6 transition SENT/VIEWED → CLIENT_SIGNED (L514); new requirement **AG-5-54**.
2. **Current words.**
   > L757: "**Knowledge-based / strong identity verification** (KBA, gov-ID, OTP-to-phone) before signing (Release 2 or later) — token + consent + IP/UA capture ships now; stronger identity is a pack/plan add."
   >
   > L466: "**BR-8 (Consent + identity are hard gates).** No signature image or field value is persisted without **affirmative, versioned, locale-correct consent** captured with timestamp + IP + UA; per-recipient tokens are single-use (rotated on sign/decline)."
3. **Proposed words.**
   > **AG-5-54 (one-time passcode before signing).** Before a signature is applied, the Signer SHALL send a one-time passcode to the signer's on-file email address and SHALL accept the signature only after the signer enters it; this SHALL apply to every signatory of the instrument. The Signer SHALL produce the sealed evidence bundle FD-21 lists (identity claim, passcode challenge and response, timestamp, IP and user-agent, document hash, exact rendered version), retained with the case and exportable as one file. This is the platform minimum (FD-22 A22-5); a Practice Pack MAY require more, never less. A passcode by text message is deferred after Release 1 (AIW-D42).

   BR-8 adds "and, before the signature, a one-time passcode confirmed by the signer (AG-5-54)". The §6 guard for SENT/VIEWED → CLIENT_SIGNED adds "passcode confirmed". The deferral at L757 becomes: "**Stronger identity beyond the email passcode** (KBA, gov-ID, passcode by text message) before signing (deferred after Release 1) — the email passcode of AG-5-54 ships in Release 1 (FD-21)."
4. **Why.** AIW-D42 (the founder, 11 Oct: "Keep the email passcode … FD-21 stands for the email passcode before every retainer signature; only the phone passcode is deferred. The team adds the email passcode to Release 1 (change note to AG-05 §13 in Step 3)"); FD-21 (Founder Decisions Log v1.5 L57: "requires **one-time-passcode verification to the signer's on-file channel** (email by default, SMS where captured) before the signature is applied … Applies per-signatory on multi-party instruments"); A22-5 (L106: "OTP + sealed evidence bundle is the platform minimum"); README §0 rule 11; `proposals.md` row of 9 Oct (carve-out B, e-signature identity). Behaviour: `intake-assistant.md` §9 GI-23 (the passcode email is counted among client-facing sends). **Counsel** confirms the evidence wording (AIW-D68).
5. **Knock-ons.** The client portal signing room (CN-CP-portal change 1, CP-6-25); AG-5-29 audit list adds "passcode sent / confirmed"; AG-5-30 certificate may cite it; every worked example counts the passcode email (README §0 rule 11, second part).

## 2. No AI text in a retainer: scope and fee bind only from what a person entered

1. **Where.** §3.2 (L199); AG-5-8 (L380); new requirement **AG-5-55**.
2. **Current words.**
   > L199: "At generation the Drafter **binds** these from the **live source record** — the prospect/contact profile, the firm/office profile, the assigned RCIC's regulator registration, and the **fee + scope snapshot** carried from the consult/proposal (AG-4)."
3. **Proposed words.**
   > **AG-5-55 (no AI-written text in a retainer).** `{{scope.summary}}`, `{{fees.total}}`, `{{fees.currency}}` and `{{fees.schedule}}` SHALL bind only from fields a person entered on the consult record (AG-4-56, as proposed in CN-AG-04) or from the consultant's own edit of a permitted free-text region (§3.4). No merge token and no permitted free-text region of a retainer SHALL be filled from consult notes, from any internal note, or from text an AI model wrote.
4. **Why.** AIW-D54 (the founder confirmed: "no AI text in the retainer"); `proposals.md` row of 10 Oct (Intake assistant, item (1), the binding rule: "`{{scope.summary}}` and `{{fees.total}}` render only from fields a person entered on the consult record … never from internal notes or model-written text"); `intake-assistant.md` §9 GI-19.
5. **Knock-ons.** AG-04 `ConsultRecord` (CN-AG-04 item 1); item 5 below.

## 3. Onboarding is not a consumer of `envelope.signed`

1. **Where.** §3.11 world-class behaviour (L328).
2. **Current words.**
   > L328: "so a redelivered event moves the prospect to WON **once**, raises one invoice, and never re-fires onboarding."
3. **Proposed words.** "so a redelivered event moves the prospect to WON **once** and raises one invoice. Onboarding is not a consumer of `envelope.signed`: it runs on `case.created`, after a person has opened the case, as the one onboarding list of AG-07 §3.2 says (CN-AG-07 item 8; AG-11 §3.5 as proposed in CN-AG-11 item 10)."
4. **Why.** `proposals.md` rows of 10 Oct (Case assistant, "Two sources start onboarding on different events … the two files must say the same thing") and 11 Oct ("One list of onboarding messages"); `00-step3-plan.md` "Onboarding (S3c M-4)"; `case-assistant.md` §9 G-30. AG-07 BR-1 makes case creation deliberate, so no case or checklist exists at `envelope.signed`. This note points to the list rather than stating it (review S3c m-9).
5. **Knock-ons.** AG-11 seed (CN-AG-11 item 10); AG-5-38 unchanged (WON and the Biller still consume `envelope.signed`).

## 4. An executed retainer can be marked ended, which emits `retainer.ended`

1. **Where.** §6 retainer lifecycle (L484–L522); new requirement **AG-5-56**.
2. **Current words.**
   > L522: "| EXECUTED | (downstream) | — | AG-2 WON + `retainerStatus=SIGNED`; AG-6 Biller; portal copy (opt-in); case engagement on file |"
3. **Proposed words.**
   > **AG-5-56 (retainer ended).** A person SHALL be able to mark an EXECUTED retainer as ended (the engagement finished or was terminated), with a date and a reason, audited. Marking it SHALL emit `retainer.ended` in the standard Conductor envelope, idempotent per agreement. Marking it SHALL NOT void, change or delete the executed document or its certificate (BR-5, BR-7).

   Open for the team: the permission key, the state name, and whether closing the last case of the retainer marks it ended.
4. **Why.** `case-assistant.md` §9 G-22 (the Lead's call of 10 Oct: "Until Step 3 adds a change note to AG-05 proposing a `retainer.ended` event, the run relies on case close or withdraw … and client pause"); IMP-35 (a run stops when "the retainer ends"); `billing-assistant.md` §9 G-20. Proposal.
5. **Knock-ons.** AG-11-110(i) (CN-AG-11 item 4); AW-01 stop rules (AW-1-19).

## 5. Split `agent/retainer:draft`: generate and edit, versus approve for sending

1. **Where.** §10 (L651); AG-5-17 (L393); §3.4 (L227, L233).
2. **Current words.**
   > L651: "| `agent/retainer:draft` | **NEW** | Generate/edit a retainer draft (Drafter); approve-for-send |"
   >
   > L393: "Each edit/re-render SHALL **bump the agreement version** and retain the prior render (audited); **approval-for-send SHALL record the approver + timestamp**."
3. **Proposed words.** §10:
   > | `agent/retainer:draft` | **NEW** | Generate/edit a retainer draft (Drafter) *(changed — split by act)* |
   > | `agent/retainer:approve-for-send` *(new; name for the team)* | **NEW** | Approve a retainer draft for sending: the consultant takes professional responsibility for its content (§3.4, AG-5-17) |

   AG-5-17 adds: "Approval-for-send SHALL require `agent/retainer:approve-for-send`; generating or editing a draft under `agent/retainer:draft` SHALL NOT approve it." Which starter roles hold the new key is set in the published starter roles (SA-06; SA6-D12).
4. **Why.** `proposals.md` row of 10 Oct (Intake assistant, item (2): "`agent/retainer:draft` is one key for two acts of different weight … an intake copy of the Case Officer role should not carry approve-for-send"); `00-step3-plan.md` "Keys (S3c M-3)" ("retainer *generate* and *approve for send* are split (CN-AG-05 carries it, matching CN-SA-06)"); CN-SA-06 change 3 uses the same names (review S3c M-3). `intake-assistant.md` §9 GI-8.
5. **Knock-ons.** SA-06 §10b (CN-SA-06 change 3); AG-4-50 (the host's "Create proposal from consult" stays under `agent/retainer:draft`); no AI assistant acts inside a retainer or its approval (AW-1-42).

---

## Not changed here (pointers only)

- Approve-for-send (AG-5-17) and countersignature (AG-5-27) stay people's acts; no AI assistant generates, edits or sends a retainer (AIW-D54; the hard limits of AW-01, AW-1-42, provisional until counsel reads them, AIW-D55).
- Whether the Biller's action on `envelope.signed` emails the client an invoice is Unknown (`intake-assistant.md` §9 GI-25); no change proposed.
