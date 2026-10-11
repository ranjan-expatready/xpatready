# Change note CN-CP-portal: Client Portal (Doc 4), CP modules

| | |
|---|---|
| **Document changed** | Doc 4 Client Portal, document version 1.3, last updated 2026-07-03 (CP-1 to CP-9) |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/01-techno-functional/06-Doc-4-Client-Portal.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 2 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, in Doc 4's own style; (4) why, pointing to the founder's decision (Founder Decisions Log FD-*n*; `ai-workers/decisions.md`, AIW-D*n*); (5) what else must change.

**Why this matters to Workstream 2.** The client portal has no AI of its own, and no AI assistant ever writes into a retainer (AIW-D54 item 6, "no AI text in the retainer"). But the Intake and Case assistants' worked examples count every message a client receives, including the product's own automatic ones such as passcodes (README §0 rule 11); the passcode below is one of those sends.

**Checked and not changed: the employer portal (AIW-D67).** The founder chose "Full employer actions at launch": the Charter's "CP-9 Employer view (read-only)" becomes the employer actions the client portal document specifies. Doc 4 already specifies them: upload (CP-9-6, L3062), pay (CP-9-7, L3063), sign (CP-9-9, L3065) and seat management (CP-9-10, L3066); CP-9-12 (L3068) only makes a *new seat* view-only until it is elevated. The one "read-only" employer surface in Doc 4 is the **recruitment summary tile** (§3.9, L3043: "a corporate seat **MAY** see a **read-only summary tile**"), which is FD-7's recruitment rule (§13 item 8, L3207), not the employer portal as a whole. No portal requirement says the employer portal is read-only, so AIW-D67 needs no change here; the Charter edit is in `ai-workers/charter-edits.md` §3.

---

## 1. The signing room asks for an email passcode before the signature is applied

**(1) What it changes.** Doc 4 v1.3 CP-6 §3.2 "The ceremony" (L1954–L1962); a new requirement after CP-6-24 (the module's last, L2079); CP-9-9 (L3065) by reference.

**(2) Current words.**

L1956:
> Opening the to-do enters the **signing room**: a calm, single-purpose, mobile-first, full-bleed flow with the firm's brand and the client's locale. The ceremony is a strict, guided sequence:

L1962 (extract, first sentence):
> 5. **Submit.** On submit, CP-6 validates all required fields complete and consent present, then writes the field values + signature image(s) and a **`SIGNED`** event (per recipient, IP/UA, `signatureMethodUsed`) into AG-5's envelope; the recipient's capability token (if used) goes dead, and the recipient sub-state advances to `SIGNED`.

L3065:
> - **CP-9-9.** A seat holding `portal/corporate:sign` SHALL execute the organisation's e-signature in-portal via CP-6 / the Signer for envelopes routed to the org seat; a non-signer seat SHALL NOT be able to bind the company. CP-9 causes the AG-5-emitted `envelope.signed`; it emits no portal-side signing event.

**(3) Proposed words.**

§3.2 gains a step between 4 and 5:
> 4a. **Passcode (hard).** *(new — FD-21; AIW-D42)* Before the signature is applied, the signer receives a **one-time passcode by email** to their on-file address and enters it in the room. A wrong or expired passcode applies nothing; the signer may ask for a new one. The challenge and the response are recorded in AG-5's evidence bundle.

New requirement:
> - **CP-6-25.** *(new — FD-21; AIW-D42)* Before CP-6 accepts a signature on a retainer or any legally operative instrument, it SHALL require the signer to enter a **one-time passcode sent by email** to the signer's on-file address (the platform minimum, FD-21 / A22-5). A signature submitted without a passing passcode SHALL be rejected server-side and nothing persisted. Each passcode challenge and response SHALL be recorded as an `ESignAuditEvent` and form part of AG-5's sealed evidence bundle. The rule applies to every signatory on a multi-party instrument, including an organisation's signing seat (CP-9-9), and to the capability-token path (CP-6-20). A passcode by text message is not required in Release 1.

CP-9-9 gains: "The passcode of CP-6-25 applies to the signing seat."

**(4) Why.** FD-21 (Founder Decisions Log v1.5, L57): "Signing a retainer or any legally-operative instrument requires **one-time-passcode verification to the signer's on-file channel** (email by default, SMS where captured) before the signature is applied, and produces a sealed **evidence bundle** … Applies per-signatory on multi-party instruments." FD-22 amendment A22-5 (L106): "**OTP + sealed evidence bundle is the platform minimum, applied everywhere**". The newer AG-05 v1.9 defers stronger identity: "Knowledge-based / strong identity verification (KBA, gov-ID, OTP-to-phone) before signing (Release 2 or later) — token + consent + IP/UA capture ships now" (AG-05 L757). A module file never overrides a founder decision by date (README §0 rule 11); the founder chose "Keep the email passcode" (AIW-D42: "FD-21 stands for the email passcode before every retainer signature; only the phone passcode is deferred."). Proposals row of 9 Oct (carve-out B, "Settle e-signature identity for Release 1").

**(5) Knock-ons.** AG-05 §13 and its named deferrals (CN-AG-05): the email passcode moves into Release 1. The worked examples of the Intake and Case assistants count the passcode email as a client-facing send (`ai-workers/design/behaviours/intake-assistant.md` §8; `case-assistant.md` §8). Counsel confirms the e-signature legal recital (Doc 4 §13, L2256).

---

## 2. CP-6 open questions: the email passcode is decided; only stronger methods stay open

**(1) What it changes.** Doc 4 v1.3 CP-6 §13 (L2251–L2252).

**(2) Current words.**

L2251:
> - **MFA-on-sign.** Whether signing the retainer requires a step-up (the client pool's in-house TOTP/passkey, Doc 1 §3.6) above session auth, balancing friction vs. evidentiary strength. The structural slot exists behind the recipient/method model; the appetite is the founder's. **[FOUNDER-CONFIRM]**

L2252:
> - **Stronger identity-verification methods** (KBA, gov-ID check, OTP-to-phone) behind the `allowedSignatureMethods`/recipient model — IN scope as a slot; the **methods themselves deferred** (§13 of AG-5 mirrors this). Which, if any, ship in the first pack. **[FOUNDER-CONFIRM]**

**(3) Proposed words.**

A closed item is added before L2251:
> - ~~**Passcode before signing.**~~ **Decided (FD-21; AIW-D42, 11 Oct 2026):** a one-time passcode by email before every signature, every signatory (CP-6-25).

L2251 keeps its question and adds: "(Beyond the email passcode of CP-6-25, which is required.)"

L2252: "OTP-to-phone" stays in the deferred list, with "*(the email passcode is not deferred: CP-6-25)*" added after it.

**(4) Why.** AIW-D42 ("Keep the email passcode … only the phone passcode is deferred"). Keeps the open-question list from re-opening a decided point.

**(5) Knock-ons.** AG-05 §13 mirror (CN-AG-05).
