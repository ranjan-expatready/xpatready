# P-62 — End-to-end setup model for PDF, online and mixed filings (founder agreed 23 Oct after the spousal-sponsorship walkthrough)

Builds on P-61 (one form, two channels). Founder request R-76/R-77: which source is the default, how questionnaires and sections are built, which masters exist and who creates them, where AI belongs, how duplicates are stopped, and how the agent's view works for online, PDF and mixed filings. Existing decisions kept: P-11, P-12, P-14, P-15, P-32, P-34, P-39/P-45, P-47, P-52, P-53.

## 1. The root is the shared fact, not a form
Neither the PDF nor the online form is the master. **Facts** (fields in the shared library) are the root. A PDF box and an online question are both *outputs* mapped to facts. So "which channel is the default" is only a question about **where drafting reads from**, never about which form owns the data.
* **Default filing channel per form line = Online** wherever IRCC files it online (founder); PDF upload or Signed PDF upload where IRCC requires it.
* **Drafting reads the cheapest reliable source automatically:** the form's PDF twin first when one exists (its boxes, data types and dropdown options are machine-readable, no AI needed for identity), then the online screens only for what differs. Online-only forms draft from IRCC's instructions or saved screens. The Super Admin can override the source per form; the system shows which source each fact came from (D18).

## 2. Questionnaires are built from facts, not copied from forms
* PQR/SQR = **the facts a combination's form lines and document rules need, for each person role, grouped into library sections**, in our own order and wording (P-47 renderer). A fact needed by IMM 0008 online *and* IMM 5532 PDF is asked once.
* **Conditional questions come from rules** (P-12): "ask when…" on the fact or section; the form's own skip logic is evidence for the rule, not a second copy of it.
* Channel changes nothing in the questionnaire; it changes only the output and the order of the portal sheet.

## 3. Masters: what exists and who creates it
| Master | Created by | AI? |
|---|---|---|
| Form · PDF edition · box map | Intake reads code, edition, checksum, boxes (no AI); AI drafts box → fact; person accepts | Drafting only |
| **Online version** = a form edition with channel Online (portal, screens, question order, captured date; identity by content fingerprint; amended after the F1 challenge) | Person uploads saved screens/instructions; AI drafts questions → facts; person accepts | Drafting only |
| **Portal** (new, small fixed list): IRCC Portal, APR Portal, Representative PR Portal, LMIA Online | Person (expert confirms) | No |
| Field (fact) | Proposed by drafting or by a person ("describe what you need", P-34) | Advisory check |
| **Answer list + option map per channel** (extended): one list of values; each PDF and each online version maps its own codes to it | PDF options read from the file (no AI); online options from screens (AI drafts) | Drafting only |
| Section, placement | Person; AI may suggest grouping | Optional |
| Condition / rule / check | AI drafts from guides and checklists with the quote; person accepts (P-14) | Drafting + advisory |
| Document type (+ substitutes) | AI drafts from checklists; person accepts. A **Signed PDF upload** line also creates its signed-scan document requirement | Drafting |
| Reference tables, person roles, key-date types | Expert / person from official sources | No |

## 4. AI: required, optional, never
* **Required** (no simple alternative): reading unstructured sources (checklists, guides, saved screens) into proposals; matching by meaning for duplicates; explaining a new edition's impact.
* **Optional assist:** section grouping, question wording, help text. Off by default; never needed to finish.
* **Never:** form identity, exact-duplicate blocking, running rules and checks, filling forms, release. All deterministic.
* **Gate before any AI call:** reuse first (mapped edition, PDF twin, saved answer); state the cost; only then call (P-27, P-60 repair).

## 5. Duplicates: one path for AI and people, then a system validator
1. **Deterministic first, always:** same key or normalised name, same option set, same file checksum → blocked or reused (no AI).
2. **Meaning check, automatic and advisory:** every new item, whether AI-drafted or typed by a person, is compared with the library; verdict "use existing · probably not needed · new is justified". AI never blocks; the person reuses or justifies; a different person approves (P-15, P-53). With AI off, the person can still add with a reason.
3. **System validator at review and release (no AI):** no two active items with the same normalised meaning key; every PDF box and online question mapped or marked "not a fact"; every option mapped in every channel; every conditional question reachable; every required fact has a question or a document source; online versions within their re-check date. Release is blocked until it passes.

## 6. Agent's view (M3): one "Prepare application" per filing
* **Left: filing items** for the filing, grouped *Online forms · PDF forms · Signed PDFs · Documents*, each with a status (filled %, checked, signed, uploaded).
* **Online form** → **portal sheet**: the portal's screens in order, each answer with a copy button and its source; later "Fill this screen" (extension). No PDF is created or attached.
* **PDF form** → the filled PDF in the app with its own Validate (P-45), downloadable.
* **Signed PDF** → filled PDF → print, sign by hand, upload the signed scan (it closes the matching document line).
* **One data source:** answers come from PQR/SQR and the normalised agent view; each case fact carries source, owner, verification status and history. Editing a fact updates every **draft** item with a notice; anything signed, uploaded or submitted is **never changed**, only marked stale for a person to redo (P-65 corrects P-45 here).
* **PDF filled directly only after its edition passes the fill trial** (Adobe Validate, barcodes; evidence lane); otherwise its answer sheet. **Signed PDFs:** prepare → printed → sent for signature → signed copy received → uploaded.
* **Portal sheet:** a tick per screen, "entered in the portal", mirroring the portal's own Not started / In progress / Complete (APR user guide).
* The filing records its portal; in the APR portal the representative types **our filing reference as the client's "case ID"** (a firm reference IRCC does not use), linking the two before submission; then the application number and UCI once known (P-61, P-65).

## 7. What changes, by component
* Data: online version, portal, option maps per channel, form-line channel and signature method; derived filing method.
* Screen 01: intake accepts online sources; row shows channels. Screen 02: drafting from online sources, online impact review. Screen 03: Forms tab with channels; preview shows each person's outputs. Screen 04: forms with both channels and where used.
* Validator: §5.3 runs at review and release. M3: Prepare application view (§6), portal sheet, signed-PDF flow.
* Demo: combination 3 = mixed proof; combination 6 = online-only proof.

## 8. Concept agreed with the founder (23 Oct)
* **Words (P-63):** *form field* = one fillable spot on a PDF or one input on a portal screen (IRCC dates are often three form fields: YYYY, MM, DD); *shared field* = one meaning in the library, per person; *field map* = for every form field, which shared field fills it, for whom and how (date part, the form's code for a value). "Box" is retired.
* **One pipeline, two channels:** read (code, no AI) → map to shared fields (AI drafts; reuse first) → a person accepts and the validator checks → fill (code). PDF: the engine fills the file and the form's own scripts rebuild barcodes. Online: portal screens are read from saved web pages or the extension's capture, never from printed PDFs; the PDF twin's map seeds the screen map.
* **Online filling:** the portal sheet is always there; the **browser extension** fills one screen per click in the representative's own session (team builds it; guardrails of redesign decision 16). Rejected: a server robot logging in as the representative. Later at most: an AI driving the screen. No public IRCC filing API was found.
* **Four situations, one engine:** PDF only · online only · mixed · online with mandatory signed PDFs, each expressed by its form lines.
* **Prototype proof:** M2 builds channels, online versions and screen maps; M3 builds Prepare application, the portal sheet, and proves capture and fill on a saved copy of one portal screen.

Unconfirmed: no counsel. Program channels and portals are Sample until the immigration expert confirms.
