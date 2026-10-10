# A — The four AI Doers: Reader, Sorter, Drafter, Checker

> Reference index. The source documents remain the only source of truth.

**What this is, in plain words.** Four of the product's Doers use an AI model. The Reader reads uploaded documents and proposes values (name, dates, deadlines). The Sorter reads incoming email and WhatsApp and proposes which client file they belong to. The Drafter writes draft messages. The Checker compares values across documents, profile and forms and raises warnings. In every source, each of them only proposes; a person decides. This file carves out what each source says about them, word for word.

**Scope of this file.** AG-11 v1.11 (owner of the four AI Doers), AG-08, AG-09, AG-10, AG-07, AG-18, the agent Overview and Phasing, SA-01B, Doc 3 and other AI-adjacent mentions. Approving and verifying a Reader value, and who may approve AI text, are in `A-approval-and-autonomy.md`. The AI switch, provider, Canada-only processing and injection safeguards are in `A-ai-switch-provider-residency.md`. Model-call logging is in `A-ai-logging-and-audit.md`.

**How to read the table.** The exact-words column is copied from the source; `…` marks words left out; bold, italics and code marks are dropped. L-numbers are lines in the snapshot file.

**Release labels used below (exact words of the label source).**
- **R1-gate** = AG-11 v1.11 §13 Phasing L1303: "AI Doers (AG11-D4): Reader (…), Sorter, Drafter, Checker — with a manual fallback. Release gate (AG11-D13): they ship built but switched off until SA-08 / SA-11 record a provider, region (Canada only, AG11-D15) and no-training/no-retention agreement; then one firm switch the Owner turns on."
- **R1-gate-PHA** = Agent Phasing v1.4 L23: "The AI Doers (Reader, Sorter, Drafter, Checker) and WhatsApp (inbound and proactive outbound) ship in Release 1 built but switched off for every firm".
- **Text** = the requirement states its own release. **None stated** = no release given.
- **Standing conflicts for every Release 1 row:** Charter V2 pptx slide 1 "NOT IN RELEASE 1 AI-assisted features"; SCOPE-TRIAGE L149 proposes moving "The 4 AI Doers and their release gate (ship switched off anyway)" to Release 2 (a proposal, not scope).

## 1. AG-11: the four AI Doers defined

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG11-D4 (Reader) | Four AI Doers join the catalogue: Reader (extracts document data into proposed profile values with provenance and confidence; Release 1 = identity documents incl. passport … | AG-11 v1.11 §0 AG11-D4, L33 | Text: "Release 1" | SA-01B v1.2 §0.3 L112 "AI reading of uploaded documents" = Defer. Doc 3 v1.4 L4452 OCR "OUT of base scope". |
| AG11-D4 (Sorter) | Sorter (classifies inbound email / portal / WhatsApp messages, matches them to the right file, files attachments to AG-9 with a document type; low confidence … | AG-11 v1.11 §0 AG11-D4, L33 | R1-gate | AG-10 v1.9 §13 Q12 L814: "the Reader — not the Sorter — classifies documents". |
| AG11-D4 (Drafter, Checker) | Drafter (AG-10's AI-assist drafter, callable by any recipe; never promises an outcome), Checker (cross-checks name, date of birth, document numbers, dates across documents, profile and … | AG-11 v1.11 §0 AG11-D4, L33 | R1-gate | SCOPE-TRIAGE L94, L110 propose moving the Checker to Release 2. |
| AG11-D4 (all four) | All four: output is a proposal with provenance + confidence; never fabricate (AG-07 BR-7) … every model call logged with model and prompt version; client data … | AG-11 v1.11 §0 AG11-D4, L33 | R1-gate | FD-16 (FDL v1.5 L52) agrees that every AI output is human-approved before it has effect. |
| AG11-D18(e) | The Reader reads more document types in Release 1: identity documents (passport MRZ), IRCC/government letters … language test results (IELTS, CELPIP, TEF and others) and ECA … | AG-11 v1.11 §0 AG11-D18, L47 | Text: "Release 1" | SCOPE-TRIAGE L119 proposes moving Reader letter deadlines to Release 2 [F]. |
| AG11-D18(e) (cont.) | A deadline date read from a letter is proposed to staff, approved, then registered with the Minder. | AG-11 v1.11 §0 AG11-D18, L47 | Text: Release 1 | — |
| AG11-D6 | WhatsApp inbound in Release 1. Inbound WhatsApp messages and attachments land on the client's file (via the Sorter) and the firm can reply within the … | AG-11 v1.11 §0 AG11-D6, L35 | Text: "Release 1"; L1304 "ships built but switched off until SA-08 records a provider" | Charter V2 slide 4: SMS and WhatsApp already out. SCOPE-TRIAGE L133 proposes Release 2. |
| AG11-D16 | A firm connects its own Gmail or Microsoft 365 mailbox (OAuth) or, for any other provider, a plain IMAP mailbox, and the Sorter files the … | AG-11 v1.11 §0 AG11-D16, L45 | Text: "all Release 1" | SCOPE-TRIAGE L129 proposes moving mailbox connection to Release 2 [F]. |
| AG11-D18(b) | an inbound message from an unknown number lands in the Unmatched inbox with a "Create lead" action … Never automatic — a person clicks it | AG-11 v1.11 §0 AG11-D18, L47 | Text: Release 1 | — |
| AG-11 §3.0 Reader | Reader — reads an uploaded document and proposes profile values (with where each value came from and how confident it is) plus the document's type. | AG-11 v1.11 §3.0, L247 | R1-gate | — |
| AG-11 §3.0 Reader list | The Immigration-SME [name withheld] confirms the final list as pack content; the Reader is not hardcoded to any list. | AG-11 v1.11 §3.0, L247 | None stated | — |
| AG-11 §3.0 Sorter | A low-confidence match goes to AG-10's Unmatched inbox and to Needs you; it is never filed on a guess. | AG-11 v1.11 §3.0, L248 | R1-gate | — |
| AG-11 §3.0 Drafter | Drafter — AG-10's AI-assist drafter, now a Doer any recipe can call to prepare a message. It never promises an immigration outcome (BR-9). | AG-11 v1.11 §3.0, L249 | R1-gate | RNA spec §16 L348 lists "AI-generated message content" as out of scope (v1). |
| AG-11 §3.0 Checker | Checker — cross-checks name, date of birth, document numbers and dates across documents, the profile and forms. Its findings feed AG-07's Deficiency Library as warnings … | AG-11 v1.11 §3.0, L250 | R1-gate | — |
| AG-11 §3.0 rules for all four | Rules for all four: output is always a proposal with provenance and confidence; they never fabricate — unreadable or missing is flagged, not guessed (AG-07 … | AG-11 v1.11 §3.0, L251 | R1-gate | — |
| AG-11 §3.0 provider | every AI path has a manual fallback … Which provider runs them, and where, is a Super Admin decision (pending SA-08 / SA-11). | AG-11 v1.11 §3.0, L251 | None stated | See A-ai-switch-provider-residency.md. |
| AG-11 §3.3 AI actions | draft_message (Drafter — prepare a message; always followed by a send action whose autonomy is at least APPROVE) | AG-11 v1.11 §3.3, L301 | R1-gate | — |
| AG-11 §3.3 proposals | Each returns a proposal; anything it proposes that would write to the verified profile, reach a client or file a form goes through Needs you. | AG-11 v1.11 §3.3, L301 | R1-gate | AG-09 AG-9-11 lets a high-confidence document type apply at AUTO (see AG-09 rows). |
| AG-11 §3.10 never fabricate | Never fabricate. An AI Doer proposes only what it actually found. A value it cannot read, or that is missing, is flagged for a person, … | AG-11 v1.11 §3.10, L463 | None stated | — |
| AG-11 §3.10 provenance | Provenance and confidence on everything. Every proposed value or classification carries where it came from (document, page/region, message) and a confidence. | AG-11 v1.11 §3.10, L464 | None stated | — |
| AG-11 §3.10 thresholds | (Until a firm sets confidence thresholds, every Reader value and Sorter match goes to review / Needs you — defaulted same day, §13 Q11.) | AG-11 v1.11 §3.10, L464 | None stated | AG-09 AG-9-11 applies a "high-confidence type" at AUTO without a set threshold. |
| AG-11 §3.10 no promises | No outcome promises. Drafter output is bound by BR-9 like every other message. | AG-11 v1.11 §3.10, L469 | None stated | — |
| AG-11-66 | The Reader SHALL extract data from an uploaded document into proposed profile values, each with provenance (document, page/region) and confidence, and SHALL classify the document's … | AG-11 v1.11 §4, L653 | R1-gate | — |
| AG-11-66 (list) | The final list SHALL be confirmed by the Immigration-SME [name withheld] as pack content; further document types SHALL be added as pack content, not code. | AG-11 v1.11 §4, L653 | None stated | — |
| AG-11-66 (imports) | Its values on an imported document SHALL stay PROPOSED on the document and be reviewed one document at a time in the document view … never … | AG-11 v1.11 §4, L653 | None stated | Same rule AG-18-78, AG-9-49. |
| AG-11-67 | The Sorter SHALL classify inbound email, portal and WhatsApp messages, match each to the right file beyond header/reply-token matching, and file attachments to AG-9 with … | AG-11 v1.11 §4, L654 | R1-gate | AG-10 §13 Q12 L814 moves document classification to the Reader. |
| AG-11-67 (cont.) | A match below the confidence threshold SHALL go to AG-10's Unmatched inbox and to Needs you, never filed on a guess. … It SHALL NOT process … | AG-11 v1.11 §4, L654 | R1-gate | — |
| AG-11-68 | The Drafter (AG-10's AI-assist drafter) SHALL be callable by any recipe to prepare a message. It SHALL NOT promise an immigration outcome (BR-9), and any … | AG-11 v1.11 §4, L655 | R1-gate | — |
| AG-11-69 | The Checker SHALL cross-check name, date of birth, document numbers and dates across documents, the profile and forms, and SHALL raise each mismatch as a … | AG-11 v1.11 §4, L656 | R1-gate | — |
| AG-11-70 | Every AI Doer output SHALL be a proposal with provenance and confidence. An AI Doer SHALL NOT fabricate: a value it cannot read or that … | AG-11 v1.11 §4, L657 | R1-gate | — |
| AG-11-108 | A deadline date the Reader reads from an IRCC/government letter … SHALL be proposed to staff as a value with its source region, SHALL become a … | AG-11 v1.11 §4, L724 | Text via AG11-D18(e): Release 1 | — |
| AG-11-108 (cont.) | The Reader SHALL NOT register a deadline on its own. | AG-11 v1.11 §4, L724 | — | — |
| AG-11 BR-23 | Every AI Doer output is a proposal with provenance and confidence. Nothing unreadable or missing is guessed or defaulted (AG-07 BR-7). | AG-11 v1.11 §5, L752 | None stated | — |
| AG-11 §11 scale | each AI call runs as its own queued, retryable Doer job off the request path, with per-firm concurrency caps so one firm's bulk upload or … | AG-11 v1.11 §11, L1170 | None stated | — |
| AG-11 §11 untrusted output | AI output is untrusted input — schema-validated, never executed, never written to the verified profile without approval; prompts are versioned and logged so a change … | AG-11 v1.11 §11, L1180 | None stated | — |
| AG-11 §11 performance | a slow or failed model call never blocks the user or the triggering transaction; per-call timeouts with fall-back to the manual path. | AG-11 v1.11 §11, L1190 | None stated | — |
| AG-11 §11 budgets | AI Doer latency budgets are set once the provider is chosen (SA-08). | AG-11 v1.11 §11, L1191 | Open | — |
| AG-11 §9 provider down | AI provider down or timing out → treated as unavailable for that call: logged in AiRunLog as PROVIDER_ERROR, the manual path applies, and the work … | AG-11 v1.11 §9, L1082 | None stated | — |
| AG-11 §9 disagreement | Reader and an existing verified value disagree → the Reader's value is a proposal only; the verified value stays until a person approves the change, … | AG-11 v1.11 §9, L1084 | None stated | AG-08 L595 same rule. |
| AG-11 §13 Q11 | Reader confidence thresholds — what confidence counts as "low" for the Reader's values and the Sorter's matches (below it → Needs you / Unmatched inbox). … | AG-11 v1.11 §13, L1267 | Open (default: everything to review) | — |
| AG-11 §13 Q13 | Still open: the final list, the fields extracted from each and the order. Immigration-SME [name withheld]; founder final. | AG-11 v1.11 §13, L1269 | Open | — |
| AG-11 §13 SME note | which cross-checks the Checker runs beyond name, date of birth, document numbers and dates. | AG-11 v1.11 §13, L1320 | Open (Immigration-SME) | — |

## 2. Reader in AG-08 (questionnaire) and AG-09 (documents)

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG-08 §3.6 Reader | Where the firm has AI on, an identity document uploaded here (e.g. the passport) is read by the Reader … it proposes values with provenance and … | AG-08 v1.7 §3.6, L257 | None stated | — |
| AG-08 §3.6 AI off | With AI off, nothing changes — the consultant types or checks the values by hand. | AG-08 v1.7 §3.6, L257 | None stated | — |
| AG-8-41 | A proposal SHALL reach the profile only when a person approves (or edits then approves) it, and SHALL NOT overwrite a document-verified value (AG-8-23). The … | AG-08 v1.7 §4, L415 | Text: L730 "moved to Release 1 in v1.4" | — |
| AG-8-42 | Where AI is enabled, the Checker SHALL compare answers (typed by the client, entered by staff, or imported) against the values read from the client's … | AG-08 v1.7 §4, L416 | Text: L730 "moved to Release 1 in v1.4" | SCOPE-TRIAGE L110 proposes moving Checker mismatch warnings to Release 2. |
| AG-8-42 (cont.) | A mismatch SHALL NOT lock the questionnaire, the profile or filing. | AG-08 v1.7 §4, L416 | — | — |
| AG-8-45 | Every Reader and Checker path SHALL have a manual equivalent; with AI off or unavailable, the consultant types, checks and verifies by hand and nothing … | AG-08 v1.7 §4, L419 | None stated | — |
| AG-08 BR-23 | A mismatch between a typed or imported answer and a document is a warning for staff to resolve. It never blocks saving, mapping or filing … | AG-08 v1.7 §5, L449 | None stated | — |
| AG-08 deferral closed | moved to Release 1 in v1.4 for identity documents (Reader proposes, Checker flags, a human approving in the review view verifies; AG11-D4, D10) | AG-08 v1.7 §13, L730 | Text: Release 1 | Doc 3 v1.4 AG-8 §13 Q5 L3951 called it "a named later deferral (out of base build)". |
| AG-08 §13 Q11 | The confidence thresholds (when a proposal or mismatch is flagged vs offered), which document types are read … and the AI/OCR provider and hosting region (Super … | AG-08 v1.7 §13, L727 | Open | — |
| AG-09 §3.1 classify | Once a file is scanned clean, the Reader proposes its document type (§3.14) so the bulk-upload mapper and the type picker start from a suggestion … | AG-09 v1.8 §3.1, L204 | None stated | Says the officer confirms; AG-9-11 applies a high-confidence type automatically. |
| AG-9-11 | The type may be set by the Reader (AG-9-42): classification is an internal filing action, so by default (AUTO, AG11-D1) a high-confidence type is applied … | AG-09 v1.8 §4, L484 | None stated | Inferred conflict with AG-11 §3.10 L464 (everything to review until thresholds are set) and AG-09 L204 ("the officer confirms"). |
| AG-9-11 (cont.) | a low-confidence type goes to Needs you instead. A firm may raise classification to APPROVE. Setting a type never verifies or accepts the document — … | AG-09 v1.8 §4, L484 | None stated | — |
| AG-9-42 | AG-9 SHALL hand it to the Reader, passing the content as delimited data and never as instructions, and giving the model no tool access; the … | AG-09 v1.8 §4, L539 | Text: L865 "→ Release 1 for identity documents" | — |
| AG-9-42 (cont.) | A file the Reader cannot classify SHALL stay untyped and be flagged; it SHALL NOT be given a guessed type. The Reader SHALL NOT run … | AG-09 v1.8 §4, L539 | — | — |
| AG-9-43 | Which document types are read, which fields are read per document type, and any further document types, SHALL be pack content confirmed by the Immigration-SME … | AG-09 v1.8 §4, L540 | None stated | — |
| AG-9-44 | When the Reader finishes a version, AG-9 SHALL emit document.extracted in the standard trigger envelope, idempotent per document version, so redelivery never creates duplicate proposals. | AG-09 v1.8 §4, L541 | None stated | — |
| AG-9-45 | The Reader SHALL NOT write to the verified profile; only a person's approve (or edit then approve) writes a value, and that requires the same … | AG-09 v1.8 §4, L542 | None stated | Verification part: A-approval-and-autonomy.md. |
| AG-9-45 (cont.) | A proposal SHALL NOT auto-approve on timeout. Reject (reason optional) is recorded so recipes and thresholds can be tuned. | AG-09 v1.8 §4, L542 | — | — |
| AG-9-46 | A field the Reader cannot read with enough confidence SHALL be recorded as unreadable / flagged and SHALL NOT be filled with a best guess. … | AG-09 v1.8 §4, L543 | None stated | — |
| AG-9-47 | Documents arriving from an import (bulk upload / zip) SHALL be classified and filed to their record by the Reader; files it cannot match to … | AG-09 v1.8 §4, L544 | None stated | SCOPE-TRIAGE L238 proposes moving Reader filing of imports to Release 2 [F]. |
| AG-9-49 | Reader results from imported documents SHALL be reviewed one document at a time in the document view, with the proposed values beside their document regions … | AG-09 v1.8 §4, L546 | None stated | — |
| AG-9-50 | When a person approves (or approves all shown) Reader values on a document, AG-9 SHALL complete that document's "Review document" task … without a second action. | AG-09 v1.8 §4, L547 | None stated | — |
| AG-9-51 | A proposed date SHALL be registered with the Minder (as a key date on the file, AG-11-47) only after a person approves it (or edits … | AG-09 v1.8 §4, L550 | Text: "NEW 5 Oct — AG11-D18(e)" (Release 1) | — |
| AG-9-51 (cont.) | a date SHALL NOT be inferred or completed, and the Reader SHALL NOT register anything on its own. | AG-09 v1.8 §4, L550 | — | — |
| AG-9-52 | the Reader SHALL propose only dates and values that are printed on the document and SHALL NOT compute a validity period itself. | AG-09 v1.8 §4, L551 | Text via AG11-D18(e) | — |
| AG-09 BR-19 | Anything the Reader produces — a document type, an extracted value — is a proposal with provenance and confidence. It never writes the verified profile … | AG-09 v1.8 §5, L577 | None stated | AG-9-11 applies a type at AUTO (a type is called a proposal here). |
| AG-09 BR-20 | AI is optional per firm and off until Super Admin has recorded the provider terms (AG11-D13). Every Reader step has a manual equivalent (pick the … | AG-09 v1.8 §5, L578 | None stated | — |
| AG-09 BR-21 | A deadline the Reader reads from a government letter is a proposal. It is registered with the Minder only after a person approves it in … | AG-09 v1.8 §5, L579 | None stated | — |
| AG-09 §9 kill-switched | Reader provider unavailable or kill-switched … → no proposals are produced; the document is usable as normal and manual capture proceeds (AG-9-46, BR-20); proposals already created … | AG-09 v1.8 §9, L737 | None stated | — |
| AG-09 deferral closed | OCR / auto-extraction: named deferral (Phase-2/3) → Release 1 for identity documents via the Reader, proposals only | AG-09 v1.8 §12, L865 | Text: Release 1 | Doc 3 v1.4 L4452 "OUT of base scope (a separately-priced content/automation option)". |
| AG-09 §13 Q10 | Reader confidence thresholds (NEW v1.4). What confidence counts as "low" for a type suggestion or an extracted value (flag vs offer)? Not decided. | AG-09 v1.8 §13, L883 | Open | — |

## 3. Sorter and Drafter in AG-10 (communication hub)

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG-10 §3.2 Sorter | The Sorter first applies the deterministic signals below (reply token, header chain, address, alias) and then goes beyond header and reply-token matching | AG-10 v1.9 §3.2, L222 | None stated | — |
| AG-10 §3.2 proposal | Its output is always a proposal with provenance and a confidence; it never guesses a file. | AG-10 v1.9 §3.2, L222 | None stated | — |
| AG-10 §3.2 filing | Filing a message or document to a record is an internal action (AUTO, AG11-D1) only when a deterministic signal backs the match. | AG-10 v1.9 §3.2, L222 | None stated | — |
| AG-10-37 | after the deterministic matching of AG-10-10 the Sorter SHALL (a) propose the file by reading the message beyond header/reply-token matching, (b) classify the message, (c) … | AG-10 v1.9 §4, L419 | None stated | (c) conflicts with AG-10 §13 Q12 L814 (Reader, not Sorter, classifies documents). |
| AG-10-37 (cont.) | The classification and document-type values SHALL be pack/firm content, not hard-coded; the values are routed to the Immigration-SME [name withheld], founder final. | AG-10 v1.9 §4, L419 | None stated | — |
| AG-10-38 | Every Sorter output SHALL be a proposal with provenance and confidence. … the Sorter SHALL NOT attach such an item to any file. Until a threshold … | AG-10 v1.9 §4, L420 | None stated | — |
| AG-10-38 (cont.) | no threshold can make an AI-only match file automatically (§13 Q10). | AG-10 v1.9 §4, L420 | — | — |
| AG-10-39 | inbound SHALL continue on the deterministic matching of AG-10-10; anything not matched by it SHALL go to the Unmatched inbox for manual linking, with no … | AG-10 v1.9 §4, L421 | None stated | — |
| AG-10 BR-22 | The Sorter proposes; below the confidence threshold, with no match, or with a match made only by the AI (no deterministic signal), the item goes … | AG-10 v1.9 §5, L476 | None stated | — |
| AG-10 BR-28 | a Sorter-filed attachment is acknowledged only after the filing is approved, and acknowledgement templates never list document names from inferred filings. | AG-10 v1.9 §5, L482 | None stated | Same as AG-11-96. |
| AG-10 §13 Q10 | Still open: what the threshold ranks or flags for review items, and whether any signal beyond reply token, header chain and known sender address counts … | AG-10 v1.9 §13, L812 | Open | — |
| AG-10 §13 Q12 | Decided (AG11-D18(e), 5 Oct): the Reader — not the Sorter — classifies documents. | AG-10 v1.9 §13, L814 | Decided | Conflicts with AG-10-37 (c), AG11-D4 and AG-11-67, which still give the Sorter the document type. |
| AG-10 §3.3 safe drafts | Safe AI drafts. AI drafts carry the no-guarantee constraint in the system prompt and are clearly labelled as drafts the human owns before send. | AG-10 v1.9 §3.3, L243 | None stated | — |
| AG-10-15 | The AI-assist drafter is the Drafter Doer, callable by the rep in the composer and by any recipe (AG11-D4). It MAY propose subject + body … | AG-10 v1.9 §4, L376 | None stated | Who approves: A-approval-and-autonomy.md. |
| AG-10-15 (cont.) | while it is off, or not configured, the composer shows a clear "AI is not switched on" message and the rep writes the message by … | AG-10 v1.9 §4, L376 | — | — |
| AG-10 BR-10 | AI-drafted and template copy never promise an immigration outcome; the firm-protecting constraint applies to every client-facing message origin. | AG-10 v1.9 §5, L464 | None stated | — |
| AG-10 §12 today's code | AI draft (Anthropic, with a no-over-promise system prompt and a graceful "not configured" path) | AG-10 v1.9 §12, L761 | n/a (fact about code) | See Gaps: the founders' code copy calls a US endpoint with no region setting. |
| AG-10 §12 changed | the Drafter as a Doer callable by recipes (CHANGED: today's AI draft is a single endpoint in mail invoked by the user; there is no … | AG-10 v1.9 §12, L765 | n/a | — |

## 4. Checker and Reader in AG-07 (cases) and AG-18 (import)

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG-07 §3.5 Checker | A Checker finding is never a lock — it is shown and fixed, acknowledged, or resolved like any deficiency; it becomes a CRITICAL warning only … | AG-07 v2.7 §3.5, L496 | None stated | SCOPE-TRIAGE L94 proposes moving "Deficiency library, auto-detect rules, readiness score, Checker" to Release 2. |
| AG-07 §3.5 optional | The Checker is optional per firm; without it, every check can still be raised by hand (AG-7-26). | AG-07 v2.7 §3.5, L496 | None stated | — |
| AG-7-61 | Each finding SHALL be a Deficiency (source = Checker) carrying provenance (the values compared and where each came from) and a confidence. A finding SHALL … | AG-07 v2.7 §4, L689 | None stated | — |
| AG-7-61 (cont.) | Which fields and document types are cross-checked, their default severities, and any confidence threshold are pack values owned by the Immigration-SME [name withheld], founder final. | AG-07 v2.7 §4, L689 | Open (pack values) | — |
| AG-7-62 | When the Checker or the Reviewer raises a new Deficiency (AG-7-30, AG-7-61), the case SHALL emit a deficiency.detected event in the standard Conductor envelope, idempotent … | AG-07 v2.7 §4, L690 | None stated | — |
| AG-7-62 (cont.) | Emitting the event SHALL NOT itself send anything to a client | AG-07 v2.7 §4, L690 | — | — |
| AG-07 §3.4 Filler input | The Filler pre-populates only from verified values … BR-7 is the rule every AI Doer follows: unreadable or missing is flagged, not guessed (BR-23). | AG-07 v2.7 §3.4, L464 | None stated | Filler is carve-out B. |
| AG-18-33 | The Reader SHALL classify each imported document's type and propose the record it belongs to; where a manifest names the record, the manifest SHALL be … | AG-18 v1.2 §4, L379 | None stated | — |
| AG-18-35 | A document the Reader cannot place with enough confidence SHALL go to the document review list with the reason, never to a guessed record. | AG-18 v1.2 §4, L381 | None stated | — |
| AG-18-36 | While AI is off — which is every firm's state until the provider terms are recorded and the Owner has switched AI on — every … | AG-18 v1.2 §4, L382 | None stated | — |
| AG-18-36 (cont.) | Imported content SHALL reach a model only as delimited data. | AG-18 v1.2 §4, L382 | — | — |
| AG-18-78 | Reader results on imported documents SHALL NOT create one Needs you item per value; they SHALL be reviewed per document in the document view (AG-18-34). | AG-18 v1.2 §4, L440 | None stated | — |
| AG-18 BR-9 | Imported documents are classified by the Reader and filed to a record only with enough confidence or a manifest reference; otherwise they go to the … | AG-18 v1.2 §5, L471 | None stated | — |
| AG-18 §13 Q8 | Reader confidence thresholds for filing an imported document without review (AG11-D4; not decided). | AG-18 v1.2 §13, L834 | Open | — |

## 5. Glossaries and overviews

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| Agent Phasing glossary Doer | AI Doers — Reader, Sorter, Drafter, Checker — produce proposals with provenance that a person approves; they run only when the firm has switched AI … | Agent Phasing v1.4 Glossary, L52 | None stated | Same row lists Reminder as a separate Doer; FD-8 folds Reminder into Minder (carve-out B). |
| Agent Phasing glossary Reader | Never fabricates: unreadable or missing is flagged. | Agent Phasing v1.4 Glossary, L53 | Text: "Release 1: identity documents …" | — |
| Agent Phasing glossary Sorter | AI Doer that classifies inbound email, portal and WhatsApp messages, matches them to the right file beyond header/reply-token matching, and files attachments to the client's … | Agent Phasing v1.4 Glossary, L54 | None stated | Still gives the Sorter document typing (see AG-10 Q12). |
| Agent Phasing glossary Drafter | AI Doer that writes a draft message or document for a person to review; the AI-assist drafter of AG-10, callable by any recipe. | Agent Phasing v1.4 Glossary, L55 | None stated | Says message or document; AG-11-68 says a message only. AG-09 §3.7 and SA-06 L752 use the name Drafter for template-based document generation (carve-out B). |
| Agent Phasing glossary Checker | AI Doer that cross-checks names, dates of birth, document numbers and dates across documents, profile and forms; findings appear as warnings in the Deficiency Library … | Agent Phasing v1.4 Glossary, L56 | None stated | — |
| Agent Phasing glossary Reviewer | It follows fixed rules and is not an AI Doer; the Checker is the AI cross-check (AG-07, AG-11). | Agent Phasing v1.4 Glossary, L70 | None stated | — |
| Agent Phasing release gate | The AI Doers (Reader, Sorter, Drafter, Checker) and WhatsApp (inbound and proactive outbound) ship in Release 1 built but switched off for every firm | Agent Phasing v1.4 Release gate, L23 | R1-gate-PHA | Charter V2 slide 1 and slide 4 "Deferred: AI-assisted features". |
| Agent Overview never fabricate | Never fabricate. Every Doer output is a proposal with provenance and confidence. Unreadable or missing is flagged, never guessed (AG-07 BR-7 applies to all Doers). | Agent Overview v1.11 Agent-native principles, L129 | None stated | — |
| Agent Overview Doer list | and the four AI Doers — Reader, Sorter, Drafter, Checker (AG11-D4; off until the provider terms are recorded, AG11-D13) | Agent Overview v1.11 In-House by Design, L177 | None stated | — |

## 6. Super Admin, Doc 3 and other AI-adjacent statements

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SA1B-D16 | Form filling is deterministic; AI stays out of the fill path. … AI may draft and diff box maps and extract answers from uploaded documents with … | SA-01B v1.2 §0 SA1B-D16, L40 | None stated | Agrees with AG-11 floor on government forms. |
| SA-1B-28 | Every value placed on a form is traceable to an answer. Nothing on a form is generated. | SA-01B v1.2 §4, L184 | None stated | — |
| SA-1B-33 | AI may draft a box map for a new form or edition and diff a new edition against the existing map; a person approves before … | SA-01B v1.2 §4, L189 | Defer (§0.3 L110) | Not in any AG module; a Super Admin-side AI use. |
| SA-1B-34 | AI may extract answers from an uploaded document (passport, educational credential assessment, language test) with a confidence score and a human confirmation step. | SA-01B v1.2 §4, L190 | Defer (§0.3 L112) | Conflicts on release with AG-11 AG11-D4/D18(e) (Reader in Release 1, gated). |
| SA-1B-35 | AI never sets a value on a form at fill time. | SA-01B v1.2 §4, L191 | None stated | — |
| SA1B-D28 reason | AI reads scanned documents into answers and drafts box maps for approval, but never sets a value at fill time | SA-01B v1.2 §0 SA1B-D28, L53 | Form autofill "parked for Release 1" | — |
| SA1B-D28 reason (cont.) | an agent does not solve the XFA blocker (a file-format problem), and a generated value on a signed form cannot be traced by a reviewer. | SA-01B v1.2 §0 SA1B-D28, L53 | — | — |
| SA-01B §0.1 deferral | AI reading of uploaded documents into answers … Needs an extraction service, confidence handling and a review screen; the fill path works without it … The box … | SA-01B v1.2 §0.1, L69 | Deferred (reopen trigger stated) | Conflicts with AG-11/AG-09 Release 1 Reader. |
| SA-01B §0.3 | AI reading of uploaded documents … Defer | SA-01B v1.2 §0.3, L112 | Defer | Same conflict. |
| Doc 3 AG-10-15 (Jul) | An AI-assist drafter MAY propose subject+body; it SHALL be a draft the human owns before send, constrained to never promise an immigration outcome, and SHALL … | Doc 3 v1.4 AG-10 §4, L4670 | None stated | Superseded in detail by AG-10 v1.9 AG-10-15. |
| Doc 3 AG-10 data flow | AI draft calls the configured model and returns subject+body to the composer (never auto-sends). | Doc 3 v1.4 AG-10 §3.3, L4538 | None stated | — |
| Doc 3 AG-8 Q5 | Document verification depth. Human "I checked it" flag now; OCR/assisted typed-value-vs-scan cross-check is a named later deferral (out of base build). | Doc 3 v1.4 AG-8 §13, L3951 | Later deferral | Superseded by AG-08 v1.7 L730 (moved to Release 1). |
| Doc 3 AG-9 deferral | OCR / auto-extraction (e.g. passport MRZ prefill) — OUT of base scope (a separately-priced content/automation option) | Doc 3 v1.4 AG-9 §13, L4452 | OUT of base scope | Superseded by AG-09 v1.8 L865; the "separately-priced" note has no successor in the Oct files. |
| Doc 3 AG-12-24 | Consent/legal copy SHALL be authored per locale, never machine-translated | Doc 3 v1.4 AG-12 §4, L5851 | None stated | Constrains any Drafter use on legal text. |
| AG-12 deferral | Auto-translation assist (Phase-3, and never for legal/consent copy) — bilingual is human-authored now. | AG-12 v1.2 §13, L604 | Phase-3 | — |
| SA-5-15 | consent/legal copy SHALL be authored per locale, never machine-translated (a suggestion helper MAY exist but output SHALL be human-reviewed). | SA-05 v2.2 §4, L316 | None stated | A machine-translation helper is an AI-adjacent feature on the Super Admin side. |
| SA-10-7 | Auto-triage suggests category and priority from keywords; the agent confirms — suggestions never silently set values. | SA-10 v2.5 §4, L356 | Text: "(NEW, optional)" | Keyword rules, not AI as written. |
| AG-14 deferral | Anomaly detection / alerting on metrics (e.g. "conversion dropped 20% WoW") — manual review ships now. | AG-14 v1.10 §13, L666 | Deferred | — |
| Charter V2 slide 4 | Deferred: AI-assisted features · AG-11 automation engine and its Doers · advanced engagement scoring. | Charter V2 pptx slide 4 | Deferred | Conflicts with every Release 1 row above. |

## Gaps noticed

- **Who classifies documents.** AG-10 §13 Q12 (L814) says the Reader, not the Sorter, classifies documents. AG11-D4 (L33), AG-11-67 (L654), AG-10-37 (c) (L419) and the Agent Phasing glossary (L54) still say the Sorter files attachments "with a document type".
- **Automatic document typing.** AG-9-11 (L484) applies a "high-confidence type" automatically and labels it "set by Reader"; AG-11 §3.10 (L464) says every Reader value goes to review until thresholds are set, and AG-09 L204 says "the officer confirms". No source sets a threshold (AG-11 Q11, AG-09 Q10, AG-10 Q10, AG-18 Q8 are all open).
- **Release status of the Reader.** Release 1 gated (AG-11, AG-08, AG-09, Agent Phasing) vs Defer (SA-01B §0.3 L112) vs not in Release 1 (Charter V2) vs out of base scope (Doc 3 L4452, July, older).
- **"Drafter" means two things.** AG-11/AG-10 use it for the AI drafting Doer; AG-09 §3.7 and SA-06 permission rows (for example L752) use it for template-based generation of retainers and documents. Owner of the non-AI meaning: carve-out B.
- **Today's code.** AG-10 §12 (L761) records an "AI draft (Anthropic …)". Fact from the founders' personal code copy (`code/expat-ready-api@c4117a3-2026-10-09/src/mail/mail.service.ts`, L1721–1753): it reads `ANTHROPIC_API_KEY`, defaults the model from `ANTHROPIC_MODEL`, and posts to `https://api.anthropic.com/v1/messages`; no region setting appears in those lines. This is a code fact, not a requirement; it sits against AG11-D15 (Canada only). The team's ERv2 copies were not found to contain this call (search for "anthropic" found only docs and tooling files).
- **No accuracy or quality measure for AI output** is specified in any source, beyond approve / edit / reject counts per recipe (AG-11-63) and rejection reasons (AG-9-45). Inferred: nothing defines when a Doer is good enough to lower review.
- **Checker scope beyond identity fields** and Reader field lists are open pack content for the Immigration-SME (AG-11 L1320, AG-7-61); the Canada pack content does not exist yet (W1 inventory sa-frs §D, Inferred there).
