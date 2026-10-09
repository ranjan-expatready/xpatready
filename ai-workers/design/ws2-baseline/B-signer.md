# B-signer: the Signer (in-house e-signature)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Signer sends a document (above all the retainer) for electronic signature, checks each signer's consent, enforces the signing order (client first, then the firm countersigns), seals the signed PDF with a fingerprint (hash), produces a certificate of completion, and announces "envelope signed", which moves the lead to Won and starts invoicing. **Who uses it:** the consultant and countersigning staff; the client signs through the portal or an emailed link (AG-05, AG-09, CP-6). **What it replaces (founders' spec):** "DocuSign" ("e-signature"). **Status in one line:** Release 1 in every source ("Passcode e-signing" in the Charter journey); but AG-05 v1.9 defers one-time-passcode identity checks to Release 2, while ratified founder decision FD-21 requires a one-time passcode before every signature.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- Agent 00-Overview v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/00-Overview_v1.11_2026-10-07.md`
- Charter V1 (md dump): `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md`
- FDL v1.5: `sources/drive-snapshot-2026-10-09/01-techno-functional/07-Founder-Decisions-Log.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-05 v1.9: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-05-retainer-and-agreements_v1.9_2026-10-07.md`
- AG-09 v1.8: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-09-document-management_v1.8_2026-10-07.md`
- AG-07 v2.7: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-07-case-core-and-delivery_v2.7_2026-10-07.md`
- AG-15 v1.6: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-15-client-portal-management_v1.6_2026-10-08.md`
- SA-08 v2.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-08-platform-integrations-and-infrastructure-rails_v2.2_2026-10-02.md`
- Shared 99-Phasing v2.14: `sources/drive-snapshot-2026-10-09/02-functional-requirements/shared/99-Phasing-and-Glossary_v2.14_2026-10-08.md`
- SA-06 v3.1: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-06-rbac_v3.1_2026-10-08.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Doc 1 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/03-Doc-1-Platform-Foundation.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`
- Doc 4 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/06-Doc-4-Client-Portal.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Signer \| e-signature \| DocuSign" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 1, L60 | Tier 1 — Live now (shipped), per SPEC-N L57 (June repo status, not re-checked) | — |
| SPEC-IA My Day | "Awaiting signature \| Signer" | Founders IA Doers model v1 (2026-06-14), Home = "My Day", L46 | None stated | — |
| AOVW scope | "AG-5 \| Retainer & Agreements (Signer) \| Generate from templates · in-house e-sign · versioned · signing audit trail · regulator clauses \| Release 1" | Agent 00-Overview v1.11, Detailed Scope Index, L84 | "Release 1" | — |
| CH1 journey | "Passcode e-signing" | Charter V1 (md dump), Release 1 overview, Step 3 - Engage, L45 | Release 1 journey step (CH1 §1) | AG-05 L757 defers OTP identity checks to Release 2. |
| FD-21 | "Signing a retainer or any legally-operative instrument requires one-time-passcode verification to the signer's … before the signature is applied, and produces a sealed evidence …" | FDL v1.5, Blueprint batch, resolved 2026-08-02 (architect-decided), L57 | None stated (ratified decision) | Conflicts with AG-05 v1.9 L757 (OTP deferred to Release 2) and AG-5-19/20 (token + consent only). Legal value: confirm with counsel. |
| A22-5 | "OTP + sealed evidence bundle is the platform minimum, applied everywhere; a Practice Pack may require a higher level … No pack may lower it." | FDL v1.5, FD-22 ruling A22-5, L106 | None stated | Same conflict as above. |
| DOC2 capability | "cap.signer \| agreements \| DOER (INFRA rail) \| cap.drafter, cap.mailer \| feature.esign \| growth" | Doc 2 v1.4, SA-CT capability registry seed table, L78 | "growth" (illustrative tier) | FD-18 meters e-sign envelopes as an add-on (FDL L54). |
| AG-05 §3.0 model | "ESignEnvelope = the signing instrument for that agreement — recipients, placed fields, signing order, audit trail, hashes, certificate. One agreement ↔ one active envelope." | AG-05 v1.9, §3.0 The retainer as the revenue gate, L178 | None stated | — |
| AG-05 §3.0 today | "the retainer becomes a first-class RetainerAgreement produced by the Drafter and signed through the Signer (the existing e-sign engine, generalized), retiring the thin click-to-accept path." | AG-05 v1.9, §3.0 Reference-note callout, L182 | None stated | — |
| AG-05 §3.1 refuse | "the Signer refuses to send an agreement missing a required clause for the firm's country (BR-3)." | AG-05 v1.9, §3.1, L189 | None stated | — |
| AG-5-18 | "a retainer SHALL include at minimum the client and (per policy/default) the firm countersignatory." | AG-05 v1.9, §4 Signer — recipients, L396 | None stated | — |
| AG-5-19 | "Each recipient SHALL receive a unique single-use access token in a private link; opening it SHALL record a VIEWED audit event with IP + …" | AG-05 v1.9, §4 Signer — recipients, L397 | None stated | No OTP step (FD-21). |
| AG-5-20 | "Before any signature is accepted, the recipient SHALL give affirmative electronic-signing consent tied to a versioned, country/locale-appropriate recital" | AG-05 v1.9, §4 Signer — consent, L398 | None stated | Recital wording: confirm with counsel (FDL B-3). |
| AG-5-24 | "required fields assigned to a recipient SHALL be enforced complete, and a required signature field SHALL require an actual signature image." | AG-05 v1.9, §4 Signer — field placement, L404 | None stated | — |
| AG-5-25 | "the retainer default SHALL be sequential client → firm countersignatory." | AG-05 v1.9, §4 Signer — order, L407 | None stated | — |
| AG-5-27 | "A retainer awaiting countersignature SHALL be shown at once in the Needs you / notifications of every active, non-suspended holder of agent/retainer:countersign" | AG-05 v1.9, §4 Signer — countersign, L409 | None stated | Countersign is a human step; "Needs you" is carve-out A. SA6-D2: no licence check. |
| AG-5-27 Owner fallback | "if no active user holds the permission, the request SHALL be shown to the Owner, who MAY countersign, recorded as "countersigned by Owner — …" | AG-05 v1.9, §4 Signer — countersign, L409 | None stated | Licensed sign-off not enforced (review W1 B-3). |
| AG-5-28 | "compute and store SHA-256 of both original and executed PDFs." | AG-05 v1.9, §4 Signer — tamper-evidence, L412 | None stated | — |
| AG-5-29 | "The Signer SHALL write an append-only, tenant-scoped audit trail: created, sent, … consent-given … signed … countersigned, completed, declined, voided, expired, reminder-sent, completion-notice-sent. Audit writes SHALL be …" | AG-05 v1.9, §4 Signer — audit, L413 | None stated | FD-21 evidence bundle adds "OTP challenge/response record", absent here. |
| AG-5-30 | "the Signer SHALL generate a Certificate of Completion PDF: title/id, both SHA-256 hashes, signer table (name/email/role/signed-at/IP), chronological audit trail, and a country/locale-appropriate e-signature legal recital." | AG-05 v1.9, §4 Signer — certificate, L416 | None stated | — |
| AG-5-32 | "A sent envelope SHALL carry an expiresAt (firm-default TTL); past it with no completion, the envelope SHALL move to EXPIRED." | AG-05 v1.9, §4 Lifecycle, L420 | None stated | 14-day default proposed (AG-05 §13 Q3). |
| AG-5-33 | "The Signer SHALL remind outstanding signers (SENT/VIEWED only; current signer only in sequential mode), best-effort and audited per send." | AG-05 v1.9, §4 Lifecycle, L421 | None stated | Charter V1 L121 keeps an "unsigned document chase" notice. |
| AG-5-34 | "Void SHALL require a mandatory reason, SHALL be blocked on terminal states" | AG-05 v1.9, §4 Lifecycle, L422 | None stated | — |
| AG-5-37 | "On EXECUTED, the Signer SHALL emit envelope.signed with a complete payload … and SHALL not import prospect/accounting code." | AG-05 v1.9, §4 Driving event, L427 | None stated | Today the engine emits esign.envelope.completed (AG-05 L331; AG-09-23 still uses that name). |
| AG-5-38 | "The Conductor SHALL consume envelope.signed to drive prospect → WON + retainerStatus = SIGNED (AG-2) and to notify the Biller (AG-6)" | AG-05 v1.9, §4 Driving event, L428 | None stated | Trigger for the Release 1 seed "e-sign → onboarding" (AG-11 L371). |
| AG-5-39 | "Staff SHALL never sign on a client's behalf — no electronic signature, typed name or drawn mark is ever entered for a client by …" | AG-05 v1.9, §4 Driving event, L429 | None stated | A hard human-only rule relevant to any AI Worker. Inferred. |
| AG-5-41 | "The rendered original, executed PDF, certificate, and signature images SHALL be stored in the firm's own configured cloud storage (tenant-keyed)" | AG-05 v1.9, §4 Storage, L433 | None stated | — |
| AG-5-46 | "Every action (generate, edit, send, sign, countersign, void, re-issue, configure, download, offline-sign, export) SHALL be audited" | AG-05 v1.9, §4 Configuration & security, L440 | None stated | — |
| AG-5-53 | "The portal SHALL NOT render its own signing step: consent, fields and the certificate of completion stay on the AG-5 signing page" | AG-05 v1.9, §4 Return to the portal (CP1-D4), L453 | None stated | Doc 4 v1.3 CP-6 (July) is an "in-portal signing room" (DOC4 L1880). |
| AG-05 BR-11 | "no third-party e-sign vendor ever holds the document. (Founder constraint, non-negotiable.)" | AG-05 v1.9, §5 Business rules, L469 | None stated | — |
| AG-05 §13 deferral | "Knowledge-based / strong identity verification (KBA, gov-ID, OTP-to-phone) before signing (Release 2 or later) — token + consent + IP/UA capture ships now" | AG-05 v1.9, §13 Named deferrals, L757 | "Release 2 or later" | Conflicts with FD-21 / A22-5 (OTP is the platform minimum) and Charter "Passcode e-signing". |
| AG-05 §13 Q6 | "Rename esign.envelope.completed → envelope.signed everywhere … or emit both during a transition?" | AG-05 v1.9, §13 Still genuinely open, L750 | Open founder question | — |
| AG-09-23 | "Send-for-signature (Signer); on esign.envelope.completed (DOCUMENT-sourced) a distinct [Signed] copy is filed (original never mutated)" | AG-09 v1.8, §4 Drafter/Signer (3.7), L504 | None stated (status "E" = exists) | Event name differs from AG-5-37. |
| AG7-D17 | "pack flag requiresClientSignature; envelope.signed advances the form to SIGNED; FILED is set at submission." | AG-07 v2.7, §13 decided v2.5, L1170 | "proposed default" | — |
| AG-15-24 | "Send agreement for e-sign (AG-5/Signer) + watch sent → viewed → signed." | AG-15 v1.6, §4, L362 | None stated (NEW) | — |
| SA-08 §3.7 | "it configures the Signer's platform-level legal settings that make an in-house signature hold up in court — per country" | SA-08 v2.2, §3.7 Signer Platform Settings, L259 | None stated | — |
| SA-8-20 | "Super Admin SHALL configure the Signer's per-country settings: default legal/consent text, certificate-of-completion template, signature-evidence/audit settings, and signing-link expiry defaults." | SA-08 v2.2, §4 Signer platform settings, L388 | None stated | Who authors the legal text is open (SA-08 §13 Q4, L632): confirm with counsel. |
| SA-8-22 | "Editing Signer settings SHALL affect new envelopes only; already-signed artifacts SHALL retain the settings version they were signed under." | SA-08 v2.2, §4, L390 | None stated | — |
| SPHG SA-8 | "Storage / email-relay / payment-processor rails; in-house Signer settings" | Shared 99-Phasing v2.14, §16 Phasing, SA-8 row, Phase 1 — Must column, L34 | Phase 1 — Must (column heading, SPHG L24) | — |
| SA-06 permissions | "agent/retainer:send \| Send a retainer for signature (Signer); remind" | SA-06 v3.1, Permission catalogue, L756 | None stated | — |
| TRI AG-05 stays | "recipients, consent, signing evidence · default signature fields · client-then-firm order + countersign · seal, hash, audit · signature moves lead to Won and …" | SCOPE-TRIAGE 2026-10-05, AG-05 Stays, L69 | Stays in Release 1 (list heading, TRI L6) | — |
| TRI AG-05 moved | "Parallel signing, drag-and-drop field editor, "no countersign" toggle, stuck-agreement SLA, pack-driven certificate wording" | SCOPE-TRIAGE 2026-10-05, AG-05 Proposed to move, L72 | Proposed to move to Release 2 (list meaning, TRI L7) | — |
| DOC1 rail | "ObjectStoragePort \| Signer, Documents, all file-bearing modules \| AWS S3" | Doc 1 v1.3, §6.3 Rails as ports, L1796 | None stated | — |
| DOC3 methods (July) | "The default for a retainer is [DRAWN, TYPED] [FOUNDER-CONFIRM]. … Stronger identity verification (KBA, gov-ID, OTP-to-phone) is a later pack/plan add" | Doc 3 v1.4, AG-5 §3, L2237 | "later pack/plan add" | Predates FD-21 (2 Aug 2026), which makes OTP mandatory. |
| DOC4 CP-6 (July) | "the client-facing signing room: the immigrant reviews and signs the firm's retainer/agreement inside their own white-labelled portal" | Doc 4 v1.3, CP-6 Module Index, L1866 | None stated | October CP1-D4 / AG-5-53: the portal never renders its own signing step. |
| DOC4 CP-9-9 (July) | "A seat holding portal/corporate:sign SHALL execute the organisation's e-signature in-portal via CP-6 / the Signer" | Doc 4 v1.3, CP-9 §4, L3065 | None stated | October AG-5-50: the employer's authorised signatory signs; AG-15 v1.6 keeps one primary contact in Release 1 (review W1 Task 7 item 9). |

Requirement rows: **46**.

## Gaps noticed

- Ratified decision vs October module: FD-21 and A22-5 (Founder Decisions Log v1.5) require a one-time passcode and a sealed evidence bundle before any signature; AG-05 v1.9 never mentions FD-21 and defers "OTP-to-phone" to Release 2. The Charter journey says "Passcode e-signing". Changing FD-21 needs Ranjan's yes; legal adequacy: confirm with counsel.
- Event name is not settled: envelope.signed (AG-5-37) vs esign.envelope.completed (existing code, AG-09-23); AG-05 §13 Q6 is open.
- Portal signing: July Doc 4 CP-6 signs inside the portal; October (CP1-D4, AG-5-53) hands the client to the AG-05 signing page. Corporate seat signing (Doc 4 CP-9-9) is not in the October Release 1 (one primary contact).
- Deterministic: order, consent gate, required fields, hashing, certificate, expiry, reminders. Human steps that may never be automated: the client's own signature (AG-5-39: staff never sign for a client), the consultant's "approve for send" (AG-5-17), and the firm countersignature (AG-5-27).
- Licensed sign-off is not enforced: countersign is a permission held by Owner and Case Manager by default, and the Owner may countersign when no holder exists (SA6-D2, SA6-D9; review W1 B-3).
- Audit is strong and specified (AG-5-29, AG-5-46). It does not include an OTP record because OTP is absent.
