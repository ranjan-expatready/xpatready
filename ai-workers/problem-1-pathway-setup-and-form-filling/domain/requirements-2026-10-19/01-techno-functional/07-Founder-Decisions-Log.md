# ExpatReady — Founder Decisions Log (consolidated sign-off)

> **Document version 1.5** · Last updated 2026-08-02 · All changes are logged in [CHANGELOG.md](CHANGELOG.md) (no duplicate version files).


> Distilled from 420+ [FOUNDER-CONFIRM] markers across Doc 1–4 + the ADR's founder decisions, into the distinct calls only the founder (or, where noted, the human architect) can make. Produced 2026-06-22. This is the single sign-off artifact to work through.

---

# ExpatReady — Consolidated FOUNDER-DECISIONS LOG

> **Author:** Chief Architect (acting). **Date:** 2026-06-22. **Status:** the single sign-off artifact for the founder.
> **What this is:** the 420+ inline [FOUNDER-CONFIRM] / [ARCHITECT-CONFIRM] markers across Doc-1 (Platform Foundation), Doc-2 (Super-Admin), Doc-3 (Agent), Doc-4 (Client Portal), plus the ADR's 8 consolidated founderDecisions, DISTILLED into ONE deduplicated, thematic register. Most of the 420 markers are the SAME ~22 decisions repeated per-module; this is the decision, not the line-item dump.
> **The spine rule for all of these:** the MACHINERY is architect-decided and fully in-scope regardless of the founder's answer. The founder confirms VALUES (content, legal floors, commercial caps, policy posture). Nothing here re-opens the locked ADR architecture (Postgres+RLS, canonical spine, in-house identity, rails-as-ports).
> **Categories:** (A) Immigration Domain & Content · (B) Legal / Compliance · (C) Commercial / Budget · (D) Product / Business · (E) Architect-Confirm (human architect, not founder).
> **Waves** (per ADR build-sequencing): A = Foundation · B = Revenue spine · C = Case delivery · D = Cross-cutting/portal · E = Hardening.

---

## ✅ RESOLVED 2026-07-03 — Wave-0 batch (FD-1…FD-15)

> **Founder sign-off:** on 2026-07-03 the founder accepted the architect's recommendation on ALL fifteen items of the Wave-0 decision batch (full context per item: `_worklog/2026-07-03-FOUNDER-DECISION-BATCH.md`). These are now BINDING for spec authoring and the vendor quote. Cross-references: FD-6 resolves C-3's authoring-seed, FD-9 ratifies D-4, FD-12 resolves E-3's fallback, FD-15 derives from B-1.

| # | Decision | RESOLVED as |
|---|----------|-------------|
| FD-1 | Pack versioning granularity | **Per-artifact versions + pack manifest**, atomic publish |
| FD-2 | Pack timezone | **Per-pack `authorityTimezone` attribute** (Canada pack declares America/Toronto as content); UTC storage |
| FD-3 | Pack pin point | **Pin at case open + explicit audited re-pin/migrate** |
| FD-4 | Pack review gate | **Dual-control for rule/scoring/eligibility artifacts; platform-config toggle for reference data** |
| FD-5 | XFA/flattened IRCC forms | **Flattened-overlay support in v1** (coordinate-mapped fill + FormFieldMap visual editor), unit-priced per form edition; XFA runtime = named later-wave stub |
| FD-6 | Entitlement-tier matrix | **Adopt SA-3 illustrative catalog as authoring seed** (+C-3 cap defaults); founder revises cell values before Wave-D seeding |
| FD-7 | AG-17 Recruiter | **Light-evidence** (LMIA recruitment-effort evidencing, not ATS-grade) · **no candidate identity plane** (records-only) · **CP-9 employer sees read-only summary**. ATS-grade = plan-gated growth path |
| FD-8 | Doer naming | **Clocker** (time-tracking; not "Timer") · **Reminder folds into Minder** (one nudge identity; AG-13 §3.2 retitled; naming spec amended) |
| FD-9 | CP-7 messaging | **Per-case threads + client-may-start** (ratifies D-4; firm sees client-read-state only; no edit/recall) |
| FD-10 | Trust accounting | ~~**OUT of v1** — named explicitly as a deliberate exit; cancel/record + accounting export cover the seam~~ **SUPERSEDED 2026-08-02 by FD-17** (trust-aware light: designation + ledger + reconciliation report; platform still never holds funds) |
| FD-11 | Credit notes | **OUT for v1** — cancel-and-reissue; AG-6 mentions scrubbed; revisit with enterprise offline invoicing |
| FD-12 | Payment fallback | **Offline-instructions fallback** (firm-authored instructions on invoice + manual payment record); platform never intermediates funds |
| FD-13 | Consult refunds + video | **Firm-configurable refunds with platform defaults** (firm-cancel→full; client ≥24h→full, <24h→configurable forfeit; no-show→forfeit) · **in-house WebRTC room = v1 adapter** (Zoom adapter = later escape hatch behind the same port) |
| FD-14 | AG-13 PII granularity | **Reference-only tasks** — entity deep-links, Restricted values never in task free-text (guidance + lint) |
| FD-15 | AG-9 doc-metadata encryption | **B-1-derived rule** — metadata fields whose canonical class is in the B-1 Restricted list get envelope-encryption + masked audited reveal; binaries SSE + signed-URL |

---

## RESOLVED 2026-08-02 — Blueprint batch (FD-16…FD-22)

> **Origin:** the six items left open by the 2026-07-30 completeness audit of the V2 Master Blueprint. FD-16…FD-19 were put to the founder as a batch on 2026-08-02 and he accepted the architect's recommendation on all four. FD-20 and FD-21 are architect calls taken under the standing technical delegation and are recorded here for ratification only.
> **FD-22 was raised by the founder in the same session** and is the structurally most significant item in this batch: it splits the single geography axis into a destination **Country Pack** and a firm-regulator **Practice Pack**, and it must land before the ERD freeze.
> **Note:** FD-17 **supersedes FD-10**. It is the only scope-increasing item in this batch (FD-22 changes shape, not v1 content volume).

| # | Decision | Category | RESOLVED as |
|---|----------|----------|-------------|
| FD-16 | AI posture (blocker: gates the identity spine) | D | **"AI assists, humans decide."** The eligibility/scoring/workflow engine stays fully deterministic, versioned and explainable — no model output is ever a decision. AI is a bounded, declared capability layer over the machinery (drafting, summarisation, document extraction, suggestion) whose every output is human-approved before it has effect. **Consequence:** AI is NOT a first-class actor — no AI principal in the identity spine, no autonomous permissions, no new plane. AI features are ordinary capabilities in the Capability Registry (`cap.ai.*`), plan-gated, per-tenant opt-in, with provenance recorded on any AI-assisted artifact. Marketing may say "AI-assisted"; it may not say the AI decides. |
| FD-17 | Trust accounting (**supersedes FD-10**) | B/C | **Trust-aware from day one, LIGHT.** In scope for v1: (a) a mandatory `fundsDesignation` (TRUST \| OPERATING) on every client-money record — quote, retainer, deposit, invoice line, payment, refund; (b) **no automatic sweep** of client funds into operating — moving trust to operating requires an explicit, audited, reason-coded event tied to a delivered milestone or issued invoice; (c) a per-client **trust ledger** with running balance; (d) a **trust reconciliation report** (ledger vs recorded bank position) exportable for the firm's accountant and for a CICC file review. **The trust MACHINERY is jurisdiction-neutral and its rules resolve from the firm's Practice Pack (FD-22)** — designation vocabulary, permitted movement triggers, sweep prohibition, ledger granularity, reconciliation cadence and retention horizon are all pack-supplied values, never hardcoded CICC. Out of scope for v1 (unchanged): the platform holding or moving funds (FD-12 stands — the platform never intermediates funds), bank-feed integration, three-way automated reconciliation. Out of scope as *content only*: every Practice Pack except Canada (Australia/UK/others are pack-authoring work, not code work). **Why reversed:** the audit rated retainers landing undesignated in an operating account a live CICC breach risk for the customer, which the "cancel/record + accounting export" seam does not mitigate; the light posture removes the risk for a small build and is a differentiator with compliance-minded RCICs. |
| FD-18 | Pricing & packaging shape | C | **Per-seat tiers by firm size** (Solo / Small 2–5 / Firm 6+), capabilities switching on progressively by plan through the Capability Registry, plus metered add-ons for consumption rails (e-sign envelopes, SMS, storage overage). Buy-up is always allowed — size *suggests* a plan, it does not enforce one. **This resolves the SHAPE only.** The cell values (which capability at which tier) and the numbers remain **C-2 / C-3 / FD-6** and are still open. |
| FD-19 | Beachhead ICP | D | **Solo and small RCIC practices, 1–5 people, Canada, Express Entry + PNP volume.** Design partners to be recruited from this segment. **Consequence for sequencing:** the Solo tier must be genuinely complete on its own (a solo RCIC still needs review/QC, coverage while away, and a defensible audit trail — those are not "Firm-tier" features); corporate/LMIA and the mid-market routing depth stay in the plan but are not the first-release proving ground. |
| FD-20 | Automated-decision-making rights on the assessment scorer (blocker) | B | **ARCHITECT-DECIDED.** Implement regardless of jurisdiction, because it is cheap and strictly safer: every assessment result carries an `isAutomatedDecision` flag, an immutable **factor snapshot** (inputs, rule/pack version, weights, and the reason each program passed or failed), a client-facing plain-language explanation, and a **`REVIEW_OF_AUTOMATED_DECISION`** request type in the DSR machinery routing to a named human reviewer with a recorded outcome. Quebec Law-25 s.12.1 exposure is the trigger; the mechanism is jurisdiction-neutral. **Counsel confirms wording, not mechanism.** |
| FD-21 | Retainer signer assurance | B | **ARCHITECT-DECIDED.** Signing a retainer or any legally-operative instrument requires **one-time-passcode verification to the signer's on-file channel** (email by default, SMS where captured) before the signature is applied, and produces a sealed **evidence bundle**: signer identity claim, OTP challenge/response record, timestamp, IP and user-agent, document hash, and the exact rendered document version. Bundle is retained under the case retention floor and is exportable as a single file for a regulator or a court. Applies per-signatory on multi-party instruments. |
| FD-22 | **Two pack axes: Country Pack (destination) vs Practice Pack (the firm's regulator)** | E | **ARCHITECT-DECIDED, standing rule — see the full entry below.** The ADR carries one geography axis and models the regulator as an attribute of the destination country; that is false whenever a firm practises in one country and files into another. Splits into two independently versioned pack axes: `Case.destinationCountry` → Country Pack (immigration content) and **`Firm.practiceJurisdiction` → Practice Pack** (regulator/representative model, trust-money rules, retention floors, privacy regime, e-signature law, tax regime, fee-disclosure, complaints). **No money, legal, privacy, retention or tax rule may be hardcoded.** v1 still ships Canada content only. **Blocks the ERD freeze.** |

### FD-22 — Two pack axes: **Country Pack** (destination) vs **Practice Pack** (the firm's regulator) — ARCHITECT, standing rule

> **Raised by the founder 2026-08-02:** *"this product is being built for Canada but needs to be country-agnostic with country packages… Canada has different trust accounting requirements, Australia may have something else and UK something else."* Correct, and it exposes a structural conflation in the locked ADR that this decision closes.

**The problem.** The ADR and the Master Blueprint carry exactly ONE configurable geography axis — the **Country Pack** — and the regulator is modelled as an attribute *of it* (`er-global-multicountry-vision`: "Regulator differs per country: Canada=CICC/RCIC, Australia=MARA, UK=OISC"). The word "jurisdiction" does not appear in the ADR at all. That is only correct while the firm and the destination are the same country. They are not the same thing:

- A **Dubai-based** or **UK-based** consultancy selling **Canadian** immigration is an ordinary, common customer.
- Its **immigration content** (programs, IMM forms, CRS grids, checklists, stages) follows **where the client is going**.
- Its **trust-money rules, retention floors, privacy regime, e-signature law, tax treatment, who may lawfully represent, fee-disclosure and complaints obligations** follow **where the firm practises** — and its regulator has no opinion about Canadian immigration law.

Collapsing these into one axis silently hardcodes "firm country = destination country", which is false for a large share of the addressable market and is expensive to unpick after the ERD freezes.

**The decision — two independent, separately-versioned pack axes:**

| | **Country Pack** (existing, unchanged) | **Practice Pack** (NEW) |
|---|---|---|
| Answers | Where is the client **going**? | Where does the **firm practise**? |
| Keyed on | `Case.destinationCountry` | `Firm.practiceJurisdiction` (a firm may hold several — e.g. offices in two countries) |
| Carries | Programs/streams, eligibility + scoring rules, government forms + field maps, document checklists, case stages, occupation/language/fee/wage reference data, destination languages | Regulator + representative model (who may lawfully advise, licence classes, rep-of-record cardinality, supervision rules for unlicensed staff), **trust-money rules** (designation vocabulary, permitted movement triggers, sweep prohibition, ledger granularity, reconciliation cadence), client-file **retention floors**, **privacy regime** (PIPEDA/Law-25 vs UK-GDPR vs Australian Privacy Principles: consent form, DSR catalogue incl. FD-20's automated-decision right, breach clock, cross-border transfer rules, privacy-officer disclosure), **e-signature law** + the assurance level FD-21 must meet, **tax regime** (GST/HST vs VAT vs GST; invoice mandatory fields), fee-disclosure/advertising rules, complaints + regulator-audit obligations, practice currency |
| Owned by | Founder/SME (the moat) | Founder + counsel, per jurisdiction |
| v1 content | Canada | Canada (CICC/RCIC) only — Australia/UK/others are **authoring** work later, not code work |

**Binding consequences:**
1. **`Firm.practiceJurisdiction` is a first-class, required attribute**, resolved at firm onboarding (AG-1 / SA-2), not inferred from the destination country and not defaulted to Canada in code.
2. **No money, legal-instrument, privacy, retention or tax rule may be hardcoded.** Every such rule reads from the resolved Practice Pack. A Canadian value appearing in machinery code is a defect, not a shortcut.
3. **Both axes are versioned, effective-dated, draft→publish and pinned per case** — the Practice Pack pins with the same FD-1…FD-4 mechanics already agreed for the Country Pack (per-artifact versions + manifest, pin-at-open, audited re-pin, dual-control review gate for rule artifacts). No new machinery is invented; the existing pack runtime carries a second pack type.
4. **Capability gating composes across three dimensions:** plan entitlement AND Country-Pack entitlement AND Practice-Pack applicability. A capability whose Practice Pack has no rules for it is unavailable, not silently permissive.
5. **Cross-jurisdiction conflict resolution:** where both packs speak (e.g. document retention — destination authority vs practice regulator), the **stricter floor wins** and both sources are recorded on the resolved value for audit.
6. **Decisions already taken are re-scoped as pack-driven, not Canada-driven:** FD-17 (trust), FD-20 (automated-decision right), FD-21 (signer assurance), B-1 (Restricted-PII set), B-2 (retention floors), D-1 (regulator/representative model — currently framed Canada-only as "RCIC-only vs +law societies +Quebec MIFI"; it must become the Canada *instance* of a general model), AG-6 tax handling.
7. **v1 ships one Practice Pack (Canada) and one Country Pack (Canada).** The cost of this decision is the parameterisation and the second pack type — not multi-country content. Shipping Canada-only content against jurisdiction-neutral machinery is the whole point.

**Blocks build?** Yes — it must land **before the ERD freeze**, because it adds a required attribute to `Firm`, a second pack type to the pack runtime, and a resolution dimension to every money/legal/privacy rule. It is far cheaper now than after.
**Gates:** ADR (needs an amendment introducing the jurisdiction axis), Doc-1 (F-5 spine, F-7 privacy/audit), Doc-2 (SA-1 pack engine, SA-2 tenant, SA-3 entitlements, SA-11 governance), Doc-3 (AG-1, AG-5, AG-6, AG-16), Doc-4 (CP-5, CP-6, CP-8), Master Blueprint (Configuration & Country-Pack plane).

#### FD-22 amendments (same day, from the verification sweep)

The jurisdiction sweep was run specifically to verify this ruling and found five defects **in the ruling itself**. They are corrected here rather than left to be discovered during the build.

**A22-1 — The representative model is two-sided, not Practice-Pack-only.** Consequence 6 above moved the whole representative model to the Practice Pack. That over-corrects. Two authorities speak and both must be satisfied: the **practice jurisdiction licenses the human** (who may lawfully advise, licence class, supervision, insurance), while the **destination authority decides which credentials it recognises for filing** (a given authority may accept only its own licensees, or accept foreign counsel, or accept an unpaid representative). The model therefore needs *both* a Practice-Pack licensing side and a Country-Pack **recognition** side, plus a resolver that answers "may this person be representative of record on this case" from the pair. **D-1 is re-scoped accordingly** — it is neither Canada-only (its current form) nor purely Practice-Pack (this ruling's first form).

**A22-2 — There is a third axis: the recipient's jurisdiction.** AG-10 already makes recipient-jurisdiction rules normative for communications, and that is correct — anti-spam and marketing-consent law follows the person receiving the message, not the firm and not the destination. Consequence 6's "privacy is Practice-Pack" is therefore too broad. **Split it:** the firm's *record-keeping and data-handling* obligations resolve from the Practice Pack; *consent to contact a specific person* resolves from that recipient's jurisdiction. Where the two disagree, the stricter obligation applies and both sources are recorded.

**A22-3 — The jurisdiction key must be sub-national-capable from day one.** `SA-1-1`/`SA-1-2` model the country key as `char(2)`. That cannot express Quebec, a provincial law society, or a US state bar — so Canada, the launch jurisdiction and D-1's own worked example, does not fit its own key type. The jurisdiction identifier must be **ISO 3166-2-capable** (`CA`, `CA-QC`, `AU`, `GB`) with defined fallback from sub-national to national when a pack is silent. This is a column-type decision and is materially cheaper before the freeze.

**A22-4 — `TRUST | OPERATING` is the Canada instance, not the universal vocabulary.** FD-17 declares the designation vocabulary pack-supplied and then hardcodes the two values in the same sentence. The **entity carries a pack-resolved designation code**; `TRUST` and `OPERATING` are the values the Canada Practice Pack supplies. (Note also that no entity carries `fundsDesignation` today — the existing `fundsNature` is optional and explicitly non-authoritative, so this is a new required field, not a rename.)

**A22-5 — FD-21's assurance mechanism is a floor, not a universal.** FD-21 fixes OTP-plus-evidence-bundle as *the* signer assurance while this ruling makes the required assurance level pack-supplied. Reconciled: **OTP + sealed evidence bundle is the platform minimum, applied everywhere**; a Practice Pack may require a *higher* level (for example a government-ID or knowledge-based check) and the signing flow must accept a pack-declared level above the floor. No pack may lower it.

**Cost, stated honestly.** The verification sweep put this at **medium build effort, large documentation rework**: one additional Wave-A sub-gate (the jurisdiction axis, the Practice-Pack runtime and the conflict resolver), a single-digit-percentage uplift across the revenue and case-delivery waves, and a new module-sized line item for Practice-Pack authoring. It is a named line in the quote, not a rounding error. Deferring it past the freeze is materially worse than that, because the affected identifiers are load-bearing in encryption: `RegulatorCredential.licenceNumber` is encrypted and blind-indexed, and `retentionClass` values such as `financial-7yr` are persisted key-material identifiers — renaming them later means re-wrapping encryption sub-keys.

---

#### FD-22 amendment A22-6 — jurisdiction resolution and conflict rules (closes the six open stress-test items)

The verification sweep stress-tested the two-axis model against nine scenarios and found six it could not resolve. Five of those six trace to one root cause: FD-22 named the axes but never defined the **resolution unit**, the **pin moment**, or what "stricter" means for a non-ordinal value. This amendment closes all six. It introduces no new machinery — every mechanism below is the SA-1 pack runtime already agreed in FD-1 through FD-4, applied to the second pack type.

**A22-6.1 — The resolution unit is the responsible practice unit, not the firm.**
A firm with a Toronto office and a London office practises under two regimes simultaneously, so `Firm.practiceJurisdiction` cannot be the resolution key. A `Firm` has one or more **`PracticeUnit`s** (office-grain), each carrying exactly one `practiceJurisdiction`. Every case, retainer, invoice, payment and client record binds to exactly **one** responsible practice unit at creation, and all Practice-Pack resolution goes through that binding — never through the firm. `Firm.practiceJurisdiction` is demoted to a default, used only to seed the binding and to resolve firm-level records that precede any practice unit. This also gives `Office` the jurisdiction attribute that AG-6's place-of-supply rule already assumes but cannot currently read (it carries only free-text `location`).

**A22-6.2 — Pin at the moment a record becomes legally operative, not at case open.**
FD-3 pins the Country Pack at case open. That is insufficient for the Practice Pack, because money and legal instruments routinely precede the case — paid consultations, prospect-billed invoices, and the retainer itself. Rule: **every record capable of carrying a jurisdictional obligation pins its own Practice-Pack version at the moment it becomes legally operative** — invoice issue for an invoice, signature for a retainer, case open for a case, consent capture for a consent record. The pin lives on the record, not inherited from a case that may not exist. Where a case is opened from an already-pinned retainer, it inherits that retainer's Practice-Pack pin rather than re-resolving, so a matter cannot silently change regime between signature and file open.

**A22-6.3 — A jurisdiction change is an explicit audited re-binding, never retroactive.**
Firms move, open offices, and reassign matters between offices. Existing pinned records keep their pin permanently. Changing a record's responsible practice unit is an explicit **re-binding event** requiring a stated reason, recording both old and new unit, re-resolving **forward-looking obligations only**, and raising a review task that enumerates every obligation whose resolved value changed — retention horizon, mandated wording, tax treatment, assurance level. Silent re-resolution is prohibited. This is FD-3's audited re-pin/migrate mechanism applied to the second axis; no new machinery.

**A22-6.4 — "Stricter floor wins" is replaced by a typed conflict policy per parameter.**
The original rule works only for ordinal values. It is meaningless for two differently-worded mandated disclosures, where neither is stricter — they are merely different. Every Practice-Pack and Country-Pack parameter therefore declares a `conflictPolicy` from a closed set:

| Policy | Meaning | Typical parameters |
|---|---|---|
| `MAX` | Ordinal; take the greater | Retention horizons, notice periods, signer assurance level |
| `MIN` | Ordinal; take the lesser | Permitted maxima — fee caps, deadline ceilings |
| `UNION` | Set-valued; apply all sources | Mandated disclosures, required invoice fields, consent purposes — compliance means showing both |
| `EXCLUSIVE` | Single-valued and genuinely conflicting; exactly one axis is authoritative and the parameter names which | Funds designation vocabulary, tax regime, currency of account, licence-number format |
| `ESCALATE` | No automatic resolution is safe; block and raise a named human decision showing both sources | Anything not classified below |

Two defaults, both fail-safe: a pack **silent** on a capability resolves to unavailable, not permissive (restating FD-22 consequence 4); a parameter with **no declared policy** resolves to `ESCALATE`, so an unclassified conflict stops the action rather than guessing. Every resolved value records both contributing sources and the policy applied, so an auditor can reconstruct why a given obligation took the value it did.

**A22-6.5 — Funds designation is `EXCLUSIVE`, owned by the practice jurisdiction.**
Closing the FD-17 reconciliation left open by A22-4: the trust obligation is the firm's own professional duty, so the **Practice Pack is authoritative** for the funds-designation vocabulary and the permitted movement triggers; the destination authority has no standing on it. `fundsDesignation` becomes a **required field** on the client-money records named in FD-17 — it does not exist today, and the present `fundsNature` is optional and explicitly non-authoritative, so this is a new field and not a rename.

**A22-6.6 — The Practice Pack uses the Country Pack's lifecycle, and fails closed.**
Draft to review to publish, with dual control on rule-bearing artifacts (FD-4), per-artifact versions under a pack manifest (FD-1), effective-dating, pin-at-operative-moment (A22-6.2) and audited re-pin (A22-6.3). Two additional rules: a jurisdiction with **no published Practice Pack cannot have a firm onboarded against it** — onboarding fails closed rather than defaulting to Canada; and a pack version may be superseded but **never deleted while any record pins it**, since deleting it would orphan the provenance of every obligation resolved from it.

**Still open after this amendment.** Three of the sweep's nine stress-test items were already resolved by A22-1 through A22-3. This amendment closes the remaining six. What it does **not** decide is the *content* question of which jurisdictions ship a Practice Pack beyond Canada, and in what order — that is a commercial call for the founder, tied to FD-19's beachhead and not a blocker for the freeze.

---

### Still open after this batch
- **C-1** engagement shape · **A-1** case-type/PNP depth list · **A-2** Canada Country-Pack seed · **B-1** Restricted-PII field set · **B-2** retention floors (counsel) · **D-1** regulator/representative model · **C-2/C-3** plan-tier cell values and prices (shape now fixed by FD-18).

---

## TOP DECISIONS THAT GATE THE BUILD

These few block pricing or a build wave. Everything else has a safe architect default and can be deferred without stalling.

| # | Decision | Category | Blocks | Why it gates |
|---|----------|----------|--------|--------------|
| **C-1** | Budget / contract shape: ONE frozen scope + frozen ERD, fixed-price-per-wave; fund Postgres substrate + Client Portal + field-encryption | C | **YES — the vendor quote itself** | Nothing can be priced or kicked off until the founder accepts the engagement shape and magnitude. |
| **A-1** | Case-type & PNP depth list (which programs ship FULL vs INFORMATIONAL) | A | **YES — Wave C content + content unit-pricing** | The dominant variable-cost line. Engine is fixed-price; content is unit-priced and cannot be quoted without the binary list. |
| **A-2** | Canada Country-Pack seed (CanonicalField catalogue, CRS grids, real IMM form maps, proof-of-funds, reference data) | A | **YES — Waves C & E** | The catalogue/masters are empty shells until the founder/SME supplies the versioned pack; the full product cannot be built or tested without it. |
| **D-1** | Regulator / representative model: RCIC-only vs +law societies +Quebec MIFI; paid/unpaid + rep-of-record cardinality | A | **Partially — fills enums before Wave B Party spine** | The generic `PartyRelationship` slots build regardless, but the rep-type enum + cardinality constraint must be set before the Party/CRM spine locks. |
| **B-1** | Restricted-PII field set (exact list under field-level encryption) | B | **YES — must precede storing any Restricted field (Wave A/B)** | Per-subject key hierarchy and the encrypt codec are designed around this list; retrofitting later is expensive. Mechanism fixed; list needs counsel. |
| **B-2** | Retention floors + breach/RROSH/72h-clock + RFC-3161 | B | **No to build, YES to go-live compliance gate (Wave E)** | Floors are code-enforced; the orchestrator + breach machinery build regardless, but counsel must set the numeric values before the PIPEDA/Law-25 acceptance gate. |
| **C-2** | Plan-tier feature matrix + usage caps (the SA-3 keystone) | C | **Partially — Wave D entitlement seeding + commercial scoping** | Every module builds a gate; the feature-to-tier cell values are the one place they all resolve. Machinery is fixed; values seed deterministically once confirmed. |

All other decisions below are NON-blocking: the architect default ships if the founder is silent, and the value is a config/seed change later.

---

## (A) IMMIGRATION DOMAIN & CONTENT
*(Founder is final domain authority; routed via the Immigration-SME. Content is the founder's deferred deliverable — never authored by the architect from memory.)*

### A-1. Case types & PNP depth that ship FULL vs INFORMATIONAL
- **Question:** Mark each case type and PNP stream as FULL (versioned rules + scoring + checklist + lifecycle + form-set) or INFORMATIONAL (machinery present, content shallow).
- **Why founder:** Go-to-market + regulated-content scope; the dominant variable-cost line for the vendor quote.
- **Recommendation / default-if-deferred:** FULL for the EE economic spine the engine proves (FSW / CEC / FST + category draws) + Study Permit + the founder-named PNP set; SHAPE-only (in-scope machinery) for all others.
- **Blocks build?** YES — gates the Wave C content build and the content unit-pricing. The machinery is fixed-price IN regardless.
- **Gates:** ADR 6.2a / C3; SA-1 BR-15; AG-3 engine content; AG-7 milestones; Doc-2 Country-Pack.

### A-2. Canada Country-Pack seed (the authoritative dataset)
- **Question:** Supply the versioned Canada pack: CanonicalField catalogue (with effective dates + verification stamp), CRS/scoring grids + cutoffs, eligibility rules, real IMM form editions + parsed field inventories + field→canonicalFieldKey maps, proof-of-funds + NOC-TEER + CLB-conversion + wage reference datasets, the accepted-PDF-format (AcroForm/XFA/flattened).
- **Why founder:** This is the founder's own C3 deliverable; it IS the immigration knowledge the content-neutral engine holds.
- **Recommendation / default-if-deferred:** Build the engine against a SAMPLE edition; isolate the real pack as a named founder deliverable in Wave W3. No architect default substitutes for the real content.
- **Blocks build?** YES — the full Canada pack cannot be built/tested/priced without it (Waves C & E).
- **Gates:** SA-1 (all builders), AG-3 (scoring), AG-7/AG-9 (checklists/forms), C2-D2/D5/D6.

### A-3. Admissibility / validity-window rules as engine gates
- **Question:** Confirm that inadmissibility/criminality (rehab/TRP) and validity windows (biometrics, IME, ECA, language, police-certificate recency) are authored as `EligibilityRule` (HARD/ADVISORY) / `FreshnessRule` content.
- **Why founder:** Regulated domain content; the SME authors the rules, founder signs off.
- **Recommendation / default-if-deferred:** Engine evaluates whatever is authored; ship the EE-spine set first, expand by pack version.
- **Blocks build?** No — content dependency, not machinery. (Wave C)
- **Gates:** AG-3 (Qualifier runtime), SA-1 §5.13.

### A-4. Tax jurisdictions & taxability per line-kind
- **Question:** Which jurisdictions ship seeded (Canada GST/HST/QST by province?), the exact rate/label per jurisdiction, and which line kinds are taxable (esp. government-fee non-taxability, disbursement tax).
- **Why founder/SME:** Domain + finance content; wrong taxability is a compliance error.
- **Recommendation / default-if-deferred:** Seed Canada GST/HST/QST by province with government-fees non-taxable; versioned `TaxProfile`, frozen-at-issue on invoices.
- **Blocks build?** No — engine is built; values are pack content. (Wave B/C)
- **Gates:** AG-6 (Biller), AG-16 invoice settings, SA-1 pack.

### A-5. Milestone / decision / submission-reference vocabulary per country
- **Question:** The `StageTemplate`/`CaseMilestone` set (AOR, biometrics, medical, ADR, PPR, COPR, PAL or equivalents), the decision outcomes, and the per-authority submission-reference keys (file number / UCI / equivalent) that fill `Submission.submissionRefsJson`.
- **Why founder/SME:** Pack content; varies by country/program.
- **Recommendation / default-if-deferred:** Author the Canada IRCC set in W3; schema is pack-named JSON, no code fork.
- **Blocks build?** No — schema is content-neutral. (Wave C)
- **Gates:** AG-7 (Case + Submission + milestones).

---

## (B) LEGAL / COMPLIANCE
*(Set with privacy/regulatory counsel + Immigration-SME. The system makes each configurable-with-an-enforced-floor; counsel sets the values.)*

### B-1. Restricted-PII field set (exact list)
- **Question:** The exact field list classified "Restricted" for field-level envelope encryption + mask-by-default + audited reveal — including which document-metadata fields (passport/SIN captured off a doc) count.
- **Why founder:** A privacy/compliance commitment that sizes key-management cost and affects what firms collect; must be counsel-confirmed, not architect-invented.
- **Recommendation / default-if-deferred:** passport/travel-doc numbers, SIN + foreign equivalents, gov-ID numbers, financial-account/bank details, biometric references, licence/designated-person credential fields.
- **Blocks build?** YES — must be fixed before any Restricted field is stored (per-subject key hierarchy depends on it). Wave A/B.
- **Gates:** NFR5-05/06, C1-3; AG-9 doc metadata; SA-2 export masking.

### B-2. Retention floors, breach posture & audit evidentiary bar
- **Question:** Numeric retention floors (financial ≥7yr proposed, case-file floor per CICC, breach ≥2yr, other ≥2yr); RROSH threshold criteria; the precise 72h breach-clock interpretation; whether RFC-3161 trusted timestamping is required beyond WORM anchoring; the CICC client-file/retainer retention horizon (sets `retainUntil`).
- **Why founder/counsel:** Legal/regulatory determinations; effective floor = max of applicable per-country minimums.
- **Recommendation / default-if-deferred:** financial 7yr / breach 2yr / other 2yr; WORM anchoring sufficient (RFC-3161 deferred unless counsel requires); RROSH gate + 72h clock machinery ships regardless.
- **Blocks build?** No to build; YES to the Wave E PIPEDA/Law-25 go-live acceptance gate.
- **Gates:** NFR5-08/09; SA-11; AG-13 audit; AG-5/AG-9 retention horizons.

### B-3. Mandated legal / regulator wording (retainer, disclaimers, e-sign recital, consent)
- **Question:** The CICC-required service-agreement clause set + exact wording; the no-guarantee / indicative-eligibility disclaimer per locale; the e-signature legal recital (UECA / provincial e-commerce law + PIPEDA, FR-CA translation); CASL/Law-25 consent, unsubscribe & disclaimer copy; the mandatory merge-field list for a valid retainer.
- **Why founder/counsel:** Out of the architect's lane entirely — SME-confirmed, founder final authority, counsel for legal instruments.
- **Recommendation / default-if-deferred:** Author in SA-5 with `governanceClass = LEGAL`; legal types hard-require REVIEW before publish; never hardcode jurisdiction. No machine-translation of legal copy.
- **Blocks build?** No — SA-5/AG-12/AG-5 build the mechanism; a legal-type template cannot PUBLISH until signed off. (Wave B/C content)
- **Gates:** SA-5, AG-5 (retainer), AG-12 (templates), AG-3 (disclaimer), AG-10 (CASL).

### B-4. Consent & DSR policy posture
- **Question:** Whether Quebec (Law-25) firms must be pre-CONSENTED (not merely NOTIFIED) for impersonation; the Law-25 per-purpose consent taxonomy; CASL TRANSACTIONAL-vs-MARKETING classification incl. implied-consent/existing-business-relationship windows; whether portal DSR erasure/portability is fully self-serve or firm-confirmed; the statutory-clock interpretation.
- **Why founder/counsel:** Privacy-law determinations + duty-of-care posture.
- **Recommendation / default-if-deferred:** Impersonation = NOTIFIED default with a per-firm CONSENTED toggle for Quebec; DSR self-request with firm-confirm step before SA-11 runs; SA-11 owns the purpose taxonomy.
- **Blocks build?** No — registers + clocks build regardless. (Wave D/E)
- **Gates:** SA-2 (impersonation), SA-11 (consent/DSR), CP-8 (portal consent/DSR), AG-10 (CASL).

### B-5. Restricted-PII inter-subject masking (spouse / dependant privacy)
- **Question:** Default whether a spouse's/dependant's Restricted-PII answers are masked from the principal's portal session (firm-configurable).
- **Why founder:** Privacy posture between family members on one engagement.
- **Recommendation / default-if-deferred:** Default PRIVATE (a principal's CP-3 session cannot read another subject's restricted values); firm may relax.
- **Blocks build?** No — fail-safe default ships. (Wave C/D)
- **Gates:** AG-8 (SQR), CP-3 (portal questionnaire).

---

## (C) COMMERCIAL / BUDGET
*(Treasury / business-model decisions. The architecture — port-behind-Doer, one adapter per rail, frozen ERD — is decided; engineering defaults stand unless objected to.)*

### C-1. Budget, timeline tolerance & contract shape
- **Question:** Accept ONE frozen full scope + frozen ERD priced as fixed-price-per-delivery-wave (Waves A–E) with per-wave acceptance gates + milestone payments; confirm willingness to fund the Postgres re-platform substrate, the Client Portal build, and field-level encryption; accept that the first sellable journey lands end of Wave B/C, not at a truncated MVP.
- **Why founder:** Budget magnitude, runway, time-to-first-revenue, fixed-price-premium vs capped-T&M risk appetite.
- **Recommendation / default-if-deferred:** Fixed-price-per-wave against the frozen scope (phasing of payment, not scope); commit deferred schema decisions up-front so mid-build migrations are not change orders.
- **Blocks build?** YES — gates the engagement/quote itself.
- **Gates:** ADR 6.2/6.2b/6.3 (procurement shell); every wave.

### C-2. Fixed-price-vs-unit-price posture for content
- **Question:** Ratify the commercial split: fixed-price for the ENGINE/machinery; unit-price (per case-type / form-edition / pack) for CONTENT, with the case-type/PNP-depth list (A-1) as the hard gate before any content wave is fix-priced.
- **Why founder:** Pricing model where content volume is unknowable up-front.
- **Recommendation / default-if-deferred:** Adopt the split as written (ADR FINAL §12). Engine cost is knowable; content scales with A-1.
- **Blocks build?** YES (jointly with A-1) for content-wave pricing; engine quote proceeds.
- **Gates:** ADR 6.2a, procurement shell.

### C-3. Plan-tier feature matrix + usage caps (the SA-3 keystone)
- **Question:** The exact launch tier set, the feature→tier cell values (`feature.*` keys × tiers), the usage-meter caps grid, block-vs-grace per metric + grace windows, grandfathering default, and the per-module entitlement-tier assignments (e-sign volume, multi-currency, accounting export, custom domain, advanced channels, Filler/deficiency-library/corporate-cases, own-account rails, Developer API, additional packs).
- **Why founder:** The dominant commercial decision; every module's gate resolves here.
- **Recommendation / default-if-deferred:** Adopt the illustrative SA-3 catalog; seats/cases = BLOCK, storage/messages/tasks = GRACE at 110% for 14 days; grandfather on entitlement change; freeze the all-lowercase-dotted `feature.*` grammar.
- **Blocks build?** Partially — machinery + seeding fixed; cell values gate Wave D entitlement seeding + commercial scoping.
- **Gates:** SA-3 (keystone), and the per-module entitlement OQs in SA-5/AG-5/AG-6/AG-7/AG-9/AG-15/AG-16/CP it resolves.

### C-4. Rail vendor selection + Stripe Connect terms
- **Question:** Confirm the v1 vendor per rail (Stripe / AWS SES+SMTP / AWS S3 / AWS SNS+WhatsApp BSP / in-house IdP / AWS ACM domain rail) and the Stripe Connect onboarding model (Standard / Express / Custom) + whether the platform takes an application fee on client→firm payments; which calendar OAuth adapters ship in v1.
- **Why founder:** Commercial/procurement choices with cost, residency, business-model implications.
- **Recommendation / default-if-deferred:** Accept the engineering defaults (the v1 adapters above); Stripe Express for firm onboarding; no application fee at launch (revisit). Ship Google + Microsoft calendar adapters.
- **Blocks build?** No — one adapter per port builds either way; the vendor is the adapter, not the schema. (Wave B/D)
- **Gates:** C4-D1, SA-8 (rail config), AG-4 (scheduler), AG-6 (Biller), AG-16 (own-account rails), CP-5.

### C-5. Reporting currency + FX provider + multi-currency catalog
- **Question:** Platform + per-firm default reporting currency (CAD assumed); manual FX adapter vs paid FX provider for production; multi-currency plan catalog now vs CAD-only with future-proofing; multi-country revenue-attribution policy.
- **Why founder:** Currency defaults + a cost/precision trade-off.
- **Recommendation / default-if-deferred:** CAD default; v1 MANUAL FxRateService adapter (seeded static for demo), provider deferred behind `FxRateSourcePort`; CAD-only catalog future-proofed; primary-country MRR attribution.
- **Blocks build?** No — FX mechanism + single-writer snapshot fixed. (Wave B)
- **Gates:** C4-D3, SA-4/SA-9 (MRR), AG-2/AG-6/AG-16 (reporting), Doc-1 §6.5.

### C-6. SaaS billing policy: trial, dunning, refunds, downgrade
- **Question:** Trial offered? length? card-required vs cardless? per-firm trial-extension cap + the N-days-before warning; dunning retry count/intervals + grace length; refund/chargeback depth for v1 (record-only vs MRR-adjust vs flag-for-review; is `charge.dispute.*` in the first wave); downgrade timing (period-end vs immediate-with-credit); MRR treatment of trials/past-due.
- **Why founder:** SaaS commercial policy.
- **Recommendation / default-if-deferred:** 14-day cardless trial → SUSPENDED if unconverted; 3 retries / 14-day grace; refund record-only + flag-for-review at launch (`charge.dispute.*` designed, handled in a later wave); downgrade at period-end; trials excluded from MRR until first paid invoice, past-due counted during grace.
- **Blocks build?** No — designed in §9 regardless; seeds `PlatformBillingConfig`. (Wave B/D)
- **Gates:** SA-2 (trial), SA-4 (dunning/refund/MRR), SA-9 (definitions), AG-16 §Plan&Billing.

### C-7. Enterprise physical DB-per-tenant at launch
- **Question:** Does any target/enterprise firm contractually require a physical database-per-tenant from day one (the hybrid dedicated-DB tier in initial scope)?
- **Why founder:** A sales/contract reality.
- **Recommendation / default-if-deferred:** None at launch — pooled-plus-RLS default holds; the tenant resolver already abstracts placement, so a dedicated tenant is a config/deployment add, not a re-architecture.
- **Blocks build?** No. (deployment decision)
- **Gates:** C1-3, Doc-1 §2.9/§3.8 (placement seam).

### C-8. Secret store + storage-credential mode + infra adapter
- **Question:** Confirm AWS Secrets Manager specifically (vs KMS-encrypted columns / Vault); mandate IAM-role in prod vs allow access-key fallback; observability backend (CloudWatch vs Managed Prometheus first); webhook dual-accept rotation window length.
- **Why founder:** Cost/tooling trade-offs with a commercial dimension.
- **Recommendation / default-if-deferred:** AWS Secrets Manager; IAM-role mandated in prod (access-key flagged lower-security for dev only); CloudWatch first; conservative dual-accept window.
- **Blocks build?** No — mechanism fixed; this is adapter/config selection. (Wave A/E)
- **Gates:** Doc-1 §7.1, SA-8 (rail secrets), SA-9 (observability).

---

## (D) PRODUCT / BUSINESS
*(Operating-model + policy posture. Each has a safe fail-closed default that ships if the founder is silent.)*

### D-1. Regulator / representative model (which professional markets)
- **Question:** Which representative types & licensing bodies ship per country — RCIC-only vs +law societies (lawyers/paralegals) +Quebec MIFI/CAQ/CSQ; whether Use-of-Representative / paid-vs-unpaid-rep is day-one; whether a case carries ONE rep-of-record or a history; correct labels (CICC vs historical RCIC/ICCRC; MARA; OISC) + the `licenceNumberRegex` per regulator.
- **Why founder:** A business/domain scoping call — which professional markets the product serves. One-regulator-one-regex-per-country is too coarse for a product sold to both consultant and law firms.
- **Recommendation / default-if-deferred:** Build generic `PartyRelationship` rep-slots + `RegulatorConfig.repTypeSlots` (architect-decided); fill RCIC + paid/unpaid + ONE rep-of-record for Canada launch; add law societies / MIFI by filling the enum later (no new schema).
- **Blocks build?** Partially — the enum + cardinality must be set before the Wave B Party/CRM spine locks; the schema builds regardless.
- **Gates:** C2-D1, SA-1 (RegulatorConfig), AG-1 (RegulatorCredential), AG-16 (credential settings).

### D-2. MFA / SSO / SMS posture per persona
- **Question:** Firm-staff MFA required for ALL staff vs privileged-only; portal MFA mandatory or optional; SMS-OTP fallback appetite per pool; whether enterprise inbound SSO is v1 fast-follow vs later; whether the platform team is ever SSO-federated; invite/reset/session TTLs per pool; email-domain pinning + cross-pool email-collision policy; password min-length + breached-password corpus (in-region vs external k-anonymity); the step-up-reauth action list.
- **Why founder:** Friction-vs-security commercial/UX knobs + a deal-size/timing call for SSO + a residency sub-processor call for the password corpus.
- **Recommendation / default-if-deferred:** Platform = MFA mandatory-locked (fixed); firm = required-for-admins; portal = optional-encouraged (never blocks a client from their own case); SMS off-by-default for platform, fallback-only elsewhere; SSO = future port-bound adapter, NOT v1; invite 72h / reset 1h; 12-char min + breached-screening; ship the proposed step-up list.
- **Blocks build?** No — in-house identity + 3 pools + MFA mechanism are fixed; these are policy values. (Wave A/B)
- **Gates:** C3-D1, Doc-1 §3; SA-7 (platform users); AG-16 (firm MFA/IP); CP-3/CP-8 (portal MFA/sessions).

### D-3. Platform-staff segmentation + firm/portal role boundaries
- **Question:** The exact ≈6 platform sub-roles and which `system/*` keys each holds; the least-privilege boundaries of the ≈6 firm templates (Case Officer vs Case Manager, `view.own` vs `view.all` lines); the ≈3 portal role boundaries (incl. corporate seat scope); country-scoping beyond Content Publisher; MFA-reset dual-control; reactivation retention window; whether per-user permission exceptions are ever needed.
- **Why founder:** Operating-model choice; the RBAC mechanism + scope-aware guard + CI-validated catalog are fixed.
- **Recommendation / default-if-deferred:** Adopt the Doc-1 §4.4 default matrix (Platform Owner / Admin / Support / Billing-Ops / Content-Pack Publisher / Auditor; Firm Owner / Admin / Case Manager / Case Officer / Billing / Read-only; 3 portal roles); country-scope = Publisher-only at launch; dual-control on force-MFA-reset; one-sub-role-per-user (no per-user patching).
- **Blocks build?** No — catalog + matrix seed with defaults; founder edits values. (Wave A)
- **Gates:** C3-D3, SA-6 (catalog/matrix), SA-7, AG-1/AG-15 (firm templates), CP-3 (portal roles).

### D-4. Portal exposure & client-experience posture
- **Question:** Default `PortalVisibilityConfig` for a fresh case (what's exposed by default); client-friendly stage/milestone labels + "what this means" copy; whether a REFUSED decision is ever auto-surfaced before human firm contact; firm-staff identity exposure (officer name/contact vs brand-only); stall threshold (no-login N days); nudge channels at launch (in-portal+email vs +SMS/WhatsApp); offline-cache TTL; switcher ranking; Viewer-role next-actions; messaging thread granularity + client-initiated-vs-reply + read-receipts + edit/recall; refusal/decline UX copy.
- **Why founder:** Client-experience + duty-of-care + relabelling content (SME for labels).
- **Recommendation / default-if-deferred:** Leak-OFF allow-list default (progress + documents + SQR on; invoices/agreements/messaging per policy); refusal HELD for firm release (never auto-surfaced); firm brand + officer first name only; stall = 7 days; in-portal+email nudges (SMS/WhatsApp off at launch); per-case messaging thread, client-may-start, firm-sees-client-read-state only, no edit/recall.
- **Blocks build?** No — fail-safe defaults ship; labels are pack content. (Wave D)
- **Gates:** AG-15 (control plane), CP-2/CP-4/CP-5/CP-6/CP-7/CP-8 (portal screens).

### D-5. Corporate engagement & seat policy
- **Question:** Default seat roles/scope presets (Sponsor primary vs HR coordinator); org/employee data-sharing default (sponsor sees progress-only vs identity/documents; which employee fields are ever org-visible); `PartyRelationship` cardinality for sponsor/employer (one corporate Party per credential vs multi-org seat — isolation-relevant); self-serve seat governance + cap model; org signing authority (any `:sign` seat vs named authorised rep); org billing visibility grain; corporate filing atomicity (all-employees-ready vs per-employee) and how the org dashboard surfaces it.
- **Why founder:** Corporate-product policy with isolation implications.
- **Recommendation / default-if-deferred:** Corporate seats IN (committed up-front); progress-only sharing default; ONE active corporate Party per `clientCustomerId` (so the subject GUC alone DB-confines each context); firm-governed self-serve seats; default block-matter readiness aggregation. (The seat-capability schema backing is an architect item — see E-1.)
- **Blocks build?** No — generic edge + corporate seats build regardless. (Wave D)
- **Gates:** AG-15 (corporate access), CP-9 (corporate portal), AG-7 (filing atomicity), C2-D1.

### D-6. Operational policy knobs (low-risk defaults)
- **Question:** Does an INVITED-not-yet-active user consume a seat; payment-hold expiry window for unpaid consult bookings; retainer countersignature default + who may countersign (assigned RCIC vs any holder); `allowedSignatureMethods` default; envelope expiry TTL + stuck-retainer SLA; bilingual posture per template; review-gate-before-client-share default (assessments); at-risk auto-clear vs manual-acknowledge; reopen semantics (continue vs follow-on case); e-sign coupling (which forms require an envelope before FILED + auto-advance); propagation/notification cadence; reminder-for-past-time policy; run-history retention; launch locales beyond EN/FR; refusal/cancelled-invoice display nuances.
- **Why founder:** Many small business/UX policy values; each has a safe default.
- **Recommendation / default-if-deferred:** INVITED does not consume a seat; countersign = sequential client→firm, restricted to assigned RCIC; methods `[DRAWN, TYPED]`; 14-day expiry; review-before-share configurable (default on); at-risk = manual-acknowledge; reopen = follow-on matter; EN/FR only at launch; batched/digest propagation notices.
- **Blocks build?** No — all default-shipped. (Various waves)
- **Gates:** AG-1/AG-3/AG-4/AG-5/AG-6/AG-7/AG-11/AG-13, CP-5/CP-6.

---

## (E) ARCHITECT-CONFIRM (human architect, NOT the founder)
*(Technical items needing the human architect's sign-off before build — not business/domain/budget.)*

### E-1. Corporate seat capability model backing (`seatRole`)
- **Question:** AG-15's `CorporatePortalSeat` has NO `seatRole` field and SA-6 does not yet catalog `portal/corporate:*` keys or portal-corporate role templates. Confirm the mechanism: extend the existing `scopeJson` to carry capability grants, OR add a typed `seatRole`/capabilities field on `CorporatePortalSeat` AND catalog the keys + portal-corporate role templates in SA-6.
- **Why architect:** Cross-module schema change (AG-15 + SA-6) that CP-9 cannot make unilaterally; affects the role-to-capability matrix for view/pay/sign/seat-manage.
- **Recommendation:** Add a typed capability field + SA-6 portal-corporate templates (cleaner, CI-validatable) over overloading `scopeJson`.
- **Blocks build?** Yes — gates capability-gated corporate seat behaviour (Wave D, before CP-9/AG-15 corporate build).
- **Gates:** AG-15, SA-6, CP-9.

### E-2. Pre-account portal subject binding (second RLS dimension)
- **Question:** On the pre-account capability-token path (PQR for a fresh prospect, SQR to a not-yet-activated client) a `ClientCustomer` may not exist, so the `app.current_client_subject` GUC that the §2.5 RLS policy binds to must be defined: (a) resolve the token to a provisional `ClientCustomer` (`PENDING_ACTIVATION`) whose id is the subject GUC, OR (b) carry a portal policy on the SqrAssignment/answer-store keyed on the token-resolved `AnswerSubject`/assignment.
- **Why architect:** A DB-isolation-correctness decision on the highest-PII surface; jointly owned by CP-1 §3 + Doc-1 §2.5. CP-3 must not assert the second RLS dimension as the pre-account backstop until this is defined.
- **Recommendation:** Option (a) — provisional `ClientCustomer (PENDING_ACTIVATION)` as the subject — keeps ONE subject-GUC contract across pre- and post-account paths; add the pre-account path to the §2.8 cross-tenant denial suite.
- **Blocks build?** Yes — gates the portal pre-account path (Wave A substrate + Wave D portal).
- **Gates:** Doc-1 §2.5/§2.8, CP-1, CP-3.

### E-3. `offlinePaymentInstructions` field ownership (cross-doc)
- **Question:** CP-5 needs to display firm-authored offline-payment instructions when the connected account is not ACTIVE. Confirm AG-16 firm-settings exposes a localized `offlinePaymentInstructions` field (CP-5 cannot add it unilaterally), or designate the owning field.
- **Why architect:** A cross-module field-ownership call (AG-16 must carry it; CP-5 only displays).
- **Recommendation:** Add `offlinePaymentInstructions` (localized) to AG-16 firm-settings; CP-5 reads read-only.
- **Blocks build?** Minor — gates the CP-5 connect-state fallback; trivial AG-16 addition. (Wave B/D)
- **Gates:** AG-16, CP-5, AG-6 (offline payment path).

---

## NON-BLOCKING ENGINEERING DEFAULTS (architect-decided; founder sign-off optional, ratification only)
*Listed so the founder knows these are settled and need no action unless they object.*
- Node.js LTS major + NestJS minor pin (kickoff engineering default).
- Region seam: per-tenant dimension + region-scoped KMS now; launch ca-central-1 only; CI region allow-list (default `ca-central-1`).
- Auth-pool walling, distinct signing keys + `aud` verification — fixed (NET-NEW platform pool sized).
- `feature.*` all-lowercase-dotted grammar freeze; SA-3 entitlement AND-composed entitlement-first with SA-12 flags.
- Degraded-rail thresholds (5 hard failures/10min OR 20% error rate/24h, ≥20-call min); webhook dual-accept window.
- Counter-signature of Doc-1 + FINALs as the binding source; RFP demoted to lineage.
- Custom-domain: subdomain IN; full custom-domain DNS/TLS recommended IN as additive behind a plan gate.
- Import feature IN (self-serve); vendor-run bespoke per-firm cutover OUT (separate T&M).
- `DomainRailPort` (AWS ACM) sixth rail IN v1.
- Alert delivery: in-app + email at launch; pager/Slack/PagerDuty channel Phase-2.
- The canonical `feature.used` / module-activity event set (single-emitter SA-12, consumer SA-9) — confirm the verb set so producers exist.

---

## SUMMARY: WHAT THE FOUNDER MUST ACTUALLY ANSWER FIRST
1. **C-1 / C-2** — accept the engagement shape (frozen scope, fixed-price-per-wave, engine-fixed + content-unit). *Without this, nothing is quoted.*
2. **A-1** — the binary case-type/PNP-depth list. *The hard gate before any content is fix-priced.*
3. **A-2** — commit to delivering the Canada Country-Pack seed as a named W3 deliverable. *The product is shells without it.*
4. **B-1** — sign off the Restricted-PII field set with counsel. *Must precede storing any Restricted field.*
5. **D-1** — RCIC-only vs +lawyers +Quebec, and rep-of-record cardinality. *Fills the Party-spine enum before Wave B.*
6. **C-3** — the plan-tier feature matrix + caps. *The one artifact that resolves every module's entitlement gate.*
7. **B-2 / B-3 / B-4** — retention floors, mandated legal wording, consent/DSR posture (with counsel) — needed before the Wave E compliance gate, not before build start.

Everything else ships on the architect default and is a later config/seed change. The two true ARCHITECT items (E-1 `seatRole`, E-2 pre-account subject binding) go to the human architect, not the founder.