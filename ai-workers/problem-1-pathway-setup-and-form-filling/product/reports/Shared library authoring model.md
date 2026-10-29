# Shared library: who creates masters, how they are shown, library vs combination (research, 29 Oct 2026)

**For:** the founder and the Lead. **Status:** research and recommendation; changes nothing until the founder decides (§8).
**Asked (founder, 29 Oct, condensed):** which master types the shared library should have and how to show them, to industry standard; whether AI only creates (a person always approves), people may add by hand, or AI creates and a person edits; how this works at combination level; how a manual Add works for fields with technical names, whether a person can describe a field in words and AI finds where it applies, how to stop duplicates and keep it fast, and whether the same rules apply to sections, document types and forms.
**Read first (internal):** DECISIONS P-120, P-121, P-116, P-123, P-62, P-138, P-147, P-53, P-95; foundation P-12, P-14, P-15; `decisions/P-34-library-authoring.md`; this folder's `concept-draft.md`, `challenge.md`, `recheck-2026-10-28.md`; PRODUCT §3–§4; `../W1-questions-and-documents/concept-draft.md`; STANDARDS §1, §9.
**Web sources:** all read 29 Oct 2026, listed in §10 with links. Where a vendor's own help pages were not reachable, it says so. Every immigration value here (forms per combination, answer choices, checks) is **Sample**. Legal points: **Unconfirmed: no counsel**.

---

## 1. Summary on one screen

**Recommended model: "AI drafts from the official source, a person edits and accepts, a second person approves; a manual Add is allowed for every master except forms, and runs the same checks as AI's proposals."** It is the hybrid in the founder's third option ("AI creates, person edits"), plus a governed manual way in. It is what the mature tools do: master data and glossary tools let people propose and let software find matches, but a steward approves (Collibra, Purview, Informatica, Reltio). Contract tools keep an approved library and send anything off-library to an approver (Ironclad).

1. **One library of definitions; combinations only point at them.** A combination picks which forms, fields, sections, documents, conditions and checks it uses, in what order and for whom. It never copies a definition. This is the "define once, use in many places" pattern (Salesforce global value sets, Jira field contexts, FHIR `definition`, Qualtrics "reference" blocks).
2. **The first maker differs by master type:** forms only from an official PDF; person roles only by the team, with the immigration expert confirming; everything else AI-first from the source with a manual Add (table §2.3).
3. **Manual Add = "describe it in words".** The person writes what they need. The rules check it as they type. AI then proposes the full definition **and where it applies**: which form fields on library forms it would fill, which combinations use those forms. The person edits and sends it. Nobody types a technical name; the system builds it.
4. **Duplicate control in three layers, cheapest first:** (a) rules block exact duplicates instantly (US$0); (b) a meaning search shortlists look-alikes in under a second, with no AI call when there is no close match; (c) AI's "did you mean" runs only on a shortlist. A near duplicate needs a reason. A "not the same as X" answer is remembered, so the same pair is not raised again (Reltio's "Not a match").
5. **Same rules for AI and people.** An AI proposal and a manual Add go through the same checks, the same Ready / Check / Decide words and the same second person (P-15, P-121). Only the producer differs.
6. **Local changes are visible, never silent.** A combination may change wording or help text for its own use. That is marked "changed for this combination" and shown at release review. A meaning change goes back to the library as a new version, with "Used by" impact first (SurveyMonkey drops the "certified" badge when a question is edited; INSZoom makes you copy its standard questionnaire before you edit it).
7. **Show the library as one list per master, plain names first.** The technical name sits in the details, read-only. Every row shows Used by, status and who made it. The menu order is the setup order. This keeps P-123 and adds three things: a "Used by" count on every row, a "made by" chip, and saved filters.

**Changes to agreed decisions (details in §7):** four small amendments to P-120 / P-95 / P-53 and one new row (local overrides). Nothing reverses P-120's shape.

---

## 2. The three models the founder named, plus the hybrid

### 2.1 The models
| Model | In plain words | Industry example |
|---|---|---|
| **A. AI only, human approves** | Only AI creates items; people accept or reject them | AI suggestion features in data catalogues (Atlan, DataHub) work this way *for descriptions*, but every one of them also lets people create terms by hand |
| **B. Manual allowed** | People type new items freely (perhaps with a warning) | Docketwise custom questions, Clio custom fields, Purview glossary terms (a duplicate name only warns) |
| **C. AI creates, person edits** | AI drafts from the source; a person corrects it before it counts | Atlan AI ("accept, reject, or edit"); Ironclad redline suggestions with explanations |
| **D. Hybrid (recommended)** | C as the main path; B allowed but run through the *same* checks as AI's output, with a second person before release | MDM create flows: search before create, steward approves (Informatica, Reltio, Profisee); Collibra "Propose new business term" starts as *Candidate* |

### 2.2 Scores (1 = poor, 5 = strong; the Lead's judgement from the evidence in §10)
| Criterion | A. AI only | B. Manual allowed | C. AI creates, person edits | **D. Hybrid** |
|---|---|---|---|---|
| Accuracy (matches the official form) | 4: tied to the source, but stuck when AI misreads | 2: depends on the typist | 4: source-tied, person fixes errors | **5**: source-tied, plus a governed fix-up path |
| Duplicate control | 4: one producer, but nothing catches what AI misses | 1: the classic cause of duplicates (Jira's own advice: "check whether a field with the same name already exists") | 4 | **5**: one set of checks on both ways in |
| Speed for the publisher | 2: waits on AI for every small gap | 4 | 4 | **4**: AI does the bulk; hand-adding takes seconds |
| Cost and waiting time | 2: every gap is a paid run | 5 | 3 | **4**: rules and the meaning search are free; AI runs only on a shortlist |
| Audit trail | 4 | 2 | 4 | **5**: every item records producer, source quote, editor, approver |
| Fit for a regulated field | 3: no way in for what is not printed on a form (office facts, representative facts) | 1 | 4 | **5**: matches maker-checker practice |
| **Total / 30** | 19 | 15 | 23 | **28** |

**Why not A:** some masters have no AI source. The representative's and office's own facts, the person roles and the internal checks are not printed on any IRCC form. A also makes the person wait on AI to close a one-line gap. **Why not B:** free typing is how libraries fill with "DOB", "Date of birth" and "Birth date". Jira's admin guidance and Salesforce's duplicate rules both exist because of it. **Why D over plain C:** C has no answer for "AI did not see it". D gives one, and keeps the same checks.

### 2.3 Recommended model per master type
| Master | First maker (main path) | Manual Add? | What makes it trustworthy | Wave 1 |
|---|---|---|---|---|
| **Forms** (incl. checklists, guides) | System from canada.ca, or a person uploads a PDF (P-123) | **No form without its official file.** "Add" = upload a PDF or Find with AI; never a typed form record | Rules read number, edition and title; the file's fingerprint is compared with the one behind canada.ca's page; a second person checks a hand upload whose fingerprint does not match (P-123 annotation) | Yes (S4) |
| **Person roles** | The team; the immigration expert confirms | Yes, team only, through the one Add | The list is short and fixed; AI only *flags* "this form mentions a person not in the roles list" | Yes (S5 record, S6 Add) |
| **Fields** | AI, from each form field on a library form (reuse / new) | Yes: describe in words → AI proposes the definition and where it applies (§4) | 3-layer duplicate check; system-made name; one meaning, one field (P-62); second person | Yes (S6 slice 1) |
| **Answer lists** | Rules read the form's own choices (US$0) | Yes, but "use an existing list" first (e.g. countries) | Shared lists, like Salesforce global value sets; a value map per channel (P-62) | Yes (S6 slice 2) |
| **Sections** | Rules group fields by the form's parts; AI names them | Yes, from existing fields only | Duplicate name check; second person | Yes (S6 slice 2) |
| **Document types** | AI, from checklists, with the quoted line | Yes, describe in words | "Supplies these facts" links to fields (Q&D concept §4) | Yes (W1-10 → S6 queue) |
| **Conditions** (shared sentences) | AI, from form instructions and guides, with the quote | Yes, write the sentence; AI turns it into the rule and shows matches | Shared record, combinations point at it (S6 M6); the sentence is shown, never logic codes | Yes (S6 slice 3) |
| **Checks** | Tier 1 from form limits by rules; tier 2 by AI from guides | Yes, describe in words | Values are Sample until the immigration expert confirms; AI review never blocks (P-14) | Partly (Checks list read-only, grouped) |

**The same rules apply to sections, document types and forms** (the founder's question), with one exception: **forms**. A form is an official document, not a definition people invent. So the only manual way in for a form is a file, and the duplicate key is form number + edition + fingerprint, not meaning.

---

## 3. Library level vs combination level

### 3.1 Where each thing lives
| Lives in the **library** (one definition, shared) | Lives on the **combination** (how this combination uses it) |
|---|---|
| Field: plain name, meaning, answer type, answer list, system name, versions | Which fields it asks, for which person role, **Comes from** (document, client, agent), the PQR tick (Q&D concept §2) |
| Form + edition + its field map (which shared field fills each form field) | Which forms it files, **in filing order** (P-116 reorder) |
| Section: name, the fields it groups, the default question wording | Which sections it uses, their order, who fills each |
| Document type: name, what it proves, which facts it supplies | Checklist lines per person: Always / Only if, alternatives ("passport **or** travel document") |
| Condition: the sentence and its rule | Which lines it applies to ("Only if" on this line) |
| Check: the rule and its message | Which checks are switched on here; a different threshold only through an override (§3.3) |
| Person role | "Who can be in this application" for this combination |

**In plain words:** the library says *what a thing is*. The combination says *whether, where, in what order and for whom it is used*. That is P-62's "shared fields are the root" and P-123's "library one lean list", stated as one rule.

### 3.2 Precedent: four ways tools share items, and which one fits
| Pattern | How it works | Who uses it | Fit for us |
|---|---|---|---|
| **Copy on import** | The template gets its own copy; later library edits do not flow | Qualtrics "Import from library"; Docketwise custom question library; INSZoom (copy a standard questionnaire, then edit) | **No** for definitions: copies drift apart and break "one meaning, one field" |
| **Live reference** | The template points at the library item; library edits flow to every user | Qualtrics "Reference survey" blocks; Salesforce global value sets ("changing the values … modifies … all the fields that reference" them); FHIR `definition` | **Yes**, combined with releases, so a change reaches a combination only at its next release |
| **One item, per-use context** | One field, with different options or defaults per project | Jira custom field contexts (instead of a duplicate field) | **Yes, for placements**: person role, Comes from, Only if, order |
| **Approved library + governed deviation** | Standard text is preferred; off-library text goes to an approver | Ironclad playbooks ("Needs approval"); SurveyMonkey certified questions lose the badge when edited | **Yes, for overrides** (§3.3) |

### 3.3 How changes flow
1. **A library edit** makes a draft change. A wording change is a direct edit with a version. A meaning change (type, answer list, subject, split, merge, retire) shows its "Used by" impact first (P-34 §4, P-116).
2. **Approval** by a second person makes it the library's current version.
3. **Combinations pick it up at their next release.** Earlier releases and open cases keep what they used (P-116 amended 28 Oct). The release review lists "library items changed since the last release" for that combination.
4. **A local override** (new; today no decision covers it): a combination may change only the **question wording, help text, or a check's message** for its own use. The row is marked **"Changed for this combination"** and shown to the second person at release, beside the library wording. A change of meaning cannot be made locally: the screen offers "Propose a library change" instead. **Why:** Qualtrics' own advice is to copy when you want edits kept apart and reference when you want one source. We need one meaning *and* some local wording (a spouse-sponsorship question is phrased differently from a visitor one), so we keep the reference and allow a small, visible wording layer.
5. **Where used** (P-116) lists every combination, form field, section, checklist line, condition and check that points at an item. It is the same panel before an edit, a retire or a delete.

---

## 4. The manual Add, step by step (fields; the others follow the same steps)

Built on the agreed one-Add pop-up pattern (P-128 (2)) and P-120's words. Each step gives its waiting-time target (§4.4).

| # | The person sees / does | The system does | Target |
|---|---|---|---|
| 1 | Opens **Add field** from the Fields list, or "Not in the list? Add new" in a field picker | Opens the pop-up; if a prerequisite is missing (no forms yet), says so with a link (P-123) | < 200 ms |
| 2 | Types **what you need, in words**: "the date the applicant's current passport expires" | **Rules, as they type:** normalised name match (case, spaces, punctuation), synonyms and aliases, words already used by existing fields. An exact match blocks at once: "Already in the library: *Passport expiry date*, used by 4 forms". **Meaning search** (no AI call): the 5 closest existing fields by meaning, shown under the box | rules < 200 ms; shortlist < 1 s |
| 3 | Picks **about whom** (Principal applicant, Spouse or partner, any person) and **kind of answer** (date, yes/no, choice, text) | "About whom" sets the subject on the form field, never the field's name (P-120 annotation, P-62) | instant |
| 4 | Presses **Check with AI** (or it runs by itself once the shortlist has a close match, see §7 A2) | **AI "did you mean"** on the shortlist only: *Use existing* / *Probably not needed* / *New is justified*, each with a one-line reason (P-53). **AI proposes the full definition:** plain name, help text, answer type, answer list (an existing one if it fits), section | 2–5 s, with a visible "Checking…" line; the person can keep typing |
| 5 | Sees **"Where this applies"** (new): the form fields on library forms that this field would fill, each with the form, page and printed label ("IMM 5257 · page 1 · *Passport expiry date*"), and the combinations that use those forms | **AI matching against the library's form fields that are not mapped yet or are marked unsure**, plus rules (same answer type, a date-shaped box); each match comes with its quote and a confidence word | async, up to ~20 s; shown when ready; never blocks Send |
| 6 | Ticks the matches to keep; edits any part of the draft | Nothing is written yet | — |
| 7 | **If a near duplicate was shown:** chooses *Use existing*, or *Add new* with a one-line reason ("expiry of the **previous** passport, a different fact"). Optionally ticks "Not the same as *Passport expiry date*" | The reason is stored and shown to the second person (P-120). A "Not the same as" pair is remembered, so it is not raised again | instant |
| 8 | Sees **Details** (folded): the system name, e.g. `person.passport.expiry_date`, read-only (challenge m3) | The system builds the name from the naming pattern (§4.2) and checks it is unique | instant |
| 9 | **Add** (or Add and add another) | One library change, *Waiting for approval*, holding the field **and** the chosen form-field matches as proposals. It lands in To review with the AI items, under the same Ready / Check / Decide words | < 500 ms |
| 10 | The **second person** approves on To review | Approval re-runs the rules on the server; the field and its field-map lines become current; combinations get them at their next release | — |

**When AI is off or down:** steps 4–5 show "not meaning-checked" and the person continues. The rules in step 2 still run, and approval is still required (P-34 "Without AI", P-95). The shortlist in step 2 still works, because it does not call AI.

**The same steps for the other masters:**
* **Section:** step 5 becomes "which forms have a part like this" and "which fields would it group" (existing fields only).
* **Document type:** step 5 becomes "which checklists mention it" and "which facts it supplies".
* **Condition:** the person writes the sentence. AI proposes the rule and shows conditions with the same meaning.
* **Check:** the person describes it. AI proposes the rule and its message; values stay Sample.
* **Answer list:** the shortlist step compares the choices themselves, not only the name.

### 4.1 Duplicate control, in order
| Layer | What it catches | Cost | Blocks? | Precedent |
|---|---|---|---|---|
| 1. **Rules** | Same normalised name within subject and group; known synonym or alias; the same form field already mapped; same type + same answer list + same form field | US$0 | **Exact duplicate blocks**; others warn | Salesforce duplicate rules: *Block* only for exact matches, *Alert* otherwise; one practitioner guide advises Block only where false alarms are under 2 % |
| 2. **Meaning search** | Different words, same meaning ("DOB" vs "Date of birth"), using a stored meaning index of every item | ~US$0 per check | No (shortlist only) | Informatica Customer 360 searches for duplicates as soon as you start adding a record; LOINC asks requesters to search the queue first |
| 3. **AI "did you mean"** | Subtle cases: same words, different fact (current vs previous passport) | about US$0.01 a check (P-95, Sample) | No; a reason is needed to go ahead | Reltio routes "potential matches" to a steward; Profisee shows match groups side by side |
| 4. **Second person** | Anything the first three missed; sees every near-duplicate reason | people's time | Yes (approval) | Collibra candidate status; Purview publish workflow with "a final review before publication" |
| 5. **Clean-up later** | Duplicates that got in anyway: "Find duplicates" in the library suggests merges | AI, on a click | No | P-34 merge suggestions; Reltio "Not a match" memory. Merge itself is not built in Wave 1 (P-116) |

### 4.2 Technical names
* **Pattern:** `subject.group.attribute` (P-34). This is the ISO/IEC 11179 idea: object, property, representation. The Missouri state data-naming standard applies it as "Object-Property-Representation". Examples: `person.passport.expiry_date`, `person.date_of_birth`, `case.application_number`.
* **The system writes it** from the subject, the group (the section's or document's short word) and the plain name. People never type it (P-120). It shows under Details and in exports. It is never on the main path (EXPERIENCE §5).
* **Fixed once released.** Renaming the plain name never changes the system name, because releases and cases point at it. A wrong system name is fixed by retire and replace, not by editing.
* **Limits:** lowercase letters, digits and underscores; no person role inside the name (P-62); unique across the library. REDCap's naming rules ("letters, numbers, underscores", unique within the project) are the same kind of guard.

### 4.3 What AI proposes "where it applies" from
Only from **form fields on library forms** and **lines on library checklists and guides**. That keeps every match tied to a quoted source (P-121's quote check). It never invents a placement on a combination. The combination receives the new field when its forms' field maps say so (P-62: fields are the root, forms are outputs).

### 4.4 Waiting-time targets
The usability limits used here: 0.1 s feels instant, 1 s keeps the flow of thought, 10 s is the limit of attention. Beyond that, show progress and a way to stop (NN/g).
| Step | Target | How |
|---|---|---|
| Rules check while typing | < 200 ms (STANDARDS §9 "filter, search < 200 ms") | Database lookups on normalised names and aliases; run 300 ms after typing stops |
| Meaning shortlist | < 1 s | A stored meaning index (one vector per item), refreshed on every approval; no AI call. Indicative: a pgvector index answers in milliseconds at our size (tens of thousands of items) |
| AI "did you mean" + draft | 2–5 s | One small model call on the shortlist only; streamed; the person keeps typing |
| "Where this applies" | up to ~20 s, async | Runs in the background (STANDARDS §1 already has a Redis-backed worker); the pop-up shows "Finding where it applies…" and can be sent without it; results join the proposal |
| Save | < 500 ms | One write; no AI on save |

**New technology:** a meaning index needs vectors in PostgreSQL (pgvector) or another store. That must pass the STANDARDS §1 technology gate before it is built. Until then, layer 2 can be "AI on the shortlist from rules", at a small cost per check.

---

## 5. Master types: what industry has that our list lacks

Our Wave 1 list: Forms, Person roles, Fields + Answer lists, Sections, Document types, Conditions, Checks. The "Later" list in `concept-draft.md` already holds: AI review objectives, field groups, key-date types, government steps, standard-step starters, reference tables, eligibility gates and scoring, country-specific requirements, deficiency checks, translations, fee table.

| Missing type or attribute | Who has it | Tag | Why |
|---|---|---|---|
| **Synonyms / aliases on every master** (not only fields) | Glossaries (Collibra, Purview), Salesforce matching rules | **Wave 1** | The rules layer of the duplicate check depends on them; fields already have aliases in code |
| **"Not the same as" pairs** (remembered non-duplicates) | Reltio "Not a match" | **Wave 1** | Without it, the same near-duplicate warning comes back on every run and people learn to ignore it |
| **Countries and other common lists as shared answer lists** | Salesforce global value sets; FHIR value sets | **Wave 1** (as answer lists, not a new type) | Every IRCC form asks for country; one list, many fields, one value map per channel |
| **Tags / categories on library items** | SurveyMonkey custom question bank (filter by tag) | **Wave 1, light** | One filter chip set (e.g. Identity, Family, Travel) on the one lean list; no new screen |
| **Owner / steward per item** | Purview (steward role), Collibra | **Wave 1, derived** | Show "Made by" and "Approved by" from the trail; a named owner role waits for the team's roles |
| **Field groups** (Full name, Address, Period from–to) | FHIR modular questionnaires; P-34 lists it | Later | Real value, but it adds nesting to the field map; Wave 1's 5 combinations work without it |
| **Question wording per channel and language** | Docketwise (translation of standard questions only), Cerenade (multilingual intake) | Later (translations already Later) | Wave 1 has English only; local wording is covered by §3.3 |
| **Document templates / letters** (merge fields) | Clio document templates; INSZoom letter management | Later | Output for case work (M3 or later), not setup |
| **Case-type template** = bundle of forms, questionnaire, checklist | INSZoom petition templates; Clio matter templates | **Already ours** | That is our *combination*; no new master |
| **Standard (vendor-certified) vs firm's own items** | SurveyMonkey certified badge; INSZoom "Zoom" questionnaires (copy to edit); Docketwise pre-made vs custom questions | **Wave 1, as a status** | Our equivalent is "Confirmed by the immigration expert" vs Sample (§6); it tells the publisher which items are safe to reuse |
| **Expiry / review date on an item** | Purview term status *Expired* | Later | Useful when IRCC changes a form; Replace edition covers Wave 1 |

---

## 6. How to show the library

### 6.1 What the tools do
* **Docketwise:** standard questions sorted into a few plain groups (General, Immigration, Family, Work & School), plus a "custom question library" that people import from.
* **SurveyMonkey:** one searchable question bank with tag filters; a "certified" badge.
* **INSZoom:** a "Knowledge Base" setup area with lists per kind (questionnaire templates, petition templates, document folders).
* **Clio:** custom fields grouped into field sets per practice area.
* **Purview:** status counts (Draft, Approved, Expired), split into terms with and without linked assets. This is the "Used by" idea.
* **Jira:** shows how many screens and projects use each field, so unused fields are easy to find.

### 6.2 Recommendation (keeps P-123; adds four things)
1. **Menu = setup order** (P-123: no separate page), numbered: 1 Forms · 2 Person roles · 3 Fields (Answer lists as a tab) · 4 Sections · 5 Document types · 6 Conditions · 7 Checks. One help diagram, "How it fits together". The PRODUCT §3 menu needs Person roles and Conditions added; Rules folds into Conditions and Checks (concept C2).
2. **Each list is one lean table** (P-123), five things per row (P-147's rule):
   * **plain name** first, with the help text under it;
   * **Used by**: "4 forms · 3 combinations" (opens Where used);
   * **status**: Draft · Waiting for approval · Current · Retired, plus *Sample* or *Confirmed by the expert*;
   * **made by** chip: AI (from IMM 5257) · Rules · Person;
   * the row's ⋯ menu.

   The system name is **not** a column. It is in the drawer's Details and in search.
3. **Search finds by plain name, synonym, system name and form field label** ("passport expiry" finds `person.passport.expiry_date` and IMM 5257's printed label). Filters: type, Used by (none / some), status, made by, tag. "Used by: none" is the clean-up view (Jira practice).
4. **An AI line under each list title** (concept §2): "AI drafts fields from the forms · 2 forms not drafted · Draft fields with AI (about US$x)". Live only on a click (P-138).
5. **The combination view shows the same items as placements.** The Questionnaires and Documents tabs list library items with their per-combination settings, and a marker on any local override (§3.3). It is never a second editor of the definition. The drawer's "Open in library" goes to the definition.
6. **Counts of what needs a person** sit on To review, grouped by source form (P-121), not on the lists. The lists stay calm.

---

## 7. Gaps against current decisions, and the amendments recommended

| # | Decision | Gap found | Recommended amendment | Evidence |
|---|---|---|---|---|
| **A1** | **P-120** (one Add) | The Add proposes the definition but not **where it applies**. The founder asked for that (describe in words → AI finds the forms and fields). | Add a step: after "did you mean", AI proposes the library form fields and checklist lines the new item would fill, each with a quote and a confidence word. The matches travel with the Add as proposals into the same queue; async, never blocking Send. | §4 step 5; FHIR `definition` links one data element to many questionnaire items; Atlan drafts for gaps it detects |
| **A2** | **P-95** (meaning check off by default) and **P-120** ("did you mean" on every Add) | They pull in opposite directions (challenge m5, recheck R1). | **Rules and the meaning shortlist always on (US$0). The AI "did you mean" runs only when the shortlist has a close match, or when the person presses Check with AI.** Shown as "about US$0.01" on the button, consistent with P-138's "cost first, on a click". With AI off, "not meaning-checked" as today. | Salesforce Alert vs Block; Informatica search on create; cost and waiting time in §4.4 |
| **A3** | **P-53 / P-120** (near duplicate needs a reason) | A reason is asked every time the same pair shows up again. | Add **"Not the same as *X*"**: stored with the reason, shown to the second person, and the pair is not raised again unless either item's meaning changes. | Reltio "Not a match" keeps the pair from coming back as a potential match |
| **A4** | **P-120 / P-123** (masters per type) | P-120 reads as one Add for every master, P-123 adds Person roles. Forms are the exception and that is not written down for the Add. | State it: **a form enters only as an official file** (canada.ca or upload); its duplicate key is number + edition + fingerprint. **Person roles**: team only, expert confirms; AI only flags missing roles. All other masters: AI-first plus the one Add, same checks. | §2.3; P-123 fingerprint rule; IRCC forms are official documents (Unconfirmed: no counsel on any legal effect) |
| **A5** | **New row** (local overrides) | No decision says what a combination may change about a library item. The Q&D concept has per-combination settings, but no rule for wording. | A combination may change **question wording, help text and a check's message** only; marked "Changed for this combination"; shown at release beside the library text. A meaning change must be a library change with Where used. | Qualtrics copy vs reference; Ironclad "Needs approval"; SurveyMonkey certified badge lost on edit; INSZoom copy-to-edit |
| A6 | **P-34 §Duplicate guard, layer 2** | "AI meaning match" is assumed to be an AI call each time; a meaning index makes the shortlist free and fast. | Layer 2 = meaning index first, AI on the shortlist only, **subject to the STANDARDS §1 technology gate** (pgvector or another store). | §4.4 |
| A7 | **P-116** (lifecycle) | No change. Where used already covers the impact before any action. Add the "Used by" count as a list column so people see it before they open anything. | Display only (no decision change). | Purview status with and without linked assets; Jira usage views |

**Not changed, confirmed by the research:** two AI rounds plus the rules, and bulk accept for High only (P-121; A2I and similar tools also send low-confidence items to people). Drafting live only on a click (P-138). One meaning, one field (P-62). Nobody types technical names (P-120). Retire, never delete, what was released (P-116).

---

## 8. Questions for the founder (one at a time; recommendation first)

1. **Should the manual Add also propose where the item applies (which form fields and checklist lines), as proposals in the same queue?**
   *Recommend yes (A1).* It turns "add a field" into "add a field and map it", which is the slow part today. It runs in the background and never blocks Add. *Else:* the Add makes the definition only, and mapping stays on the per-form field map screen.
2. **When does the AI "did you mean" run on a manual Add?**
   *Recommend: only when the free meaning shortlist finds a close match, or on "Check with AI" (A2).* Free and instant in most cases, AI where it matters. *Else:* always (about US$0.01 each, 2–5 s every time), or never by default (P-95 as is).
3. **May a combination change a library item's wording for its own use?**
   *Recommend yes, wording, help text and check messages only, marked and reviewed at release (A5).* *Else:* no local changes; every difference becomes a new library item, which brings back the duplicates we are trying to stop.
4. **May we add a meaning index (vectors in PostgreSQL) to make duplicate checks free and under a second?**
   *Recommend yes, through the STANDARDS §1 gate, with the exact version and source proposed before install.* *Else:* AI on a rules shortlist, at a small cost per check and 2–5 s each.

---

## 9. What this means for the build (for the Lead)
* **S6 slice 1** (fields): the Add's steps 1–4 and 7–10 are already agreed. Step 5 ("Where this applies") and "Not the same as" are new if the founder says yes to Q1. The meaning shortlist waits for Q4. Until then, AI on the rules shortlist.
* **Queue item contract** (recheck R3): add `origin` (AI · Rules · Person), `reason` (near duplicate), `notSameAs[]` and `placements[]` (proposed form-field matches), so a manual Add and an AI draft are the same kind of item.
* **Q&D tabs** (runtime): show a "Changed for this combination" marker once A5 is decided. No other change.

---

## 10. Sources (all read 29 Oct 2026)

**Immigration and legal practice software**
* Docketwise, Custom intakes (pre-made questions in General, Immigration, Family, Work & School; custom questions go into a custom question library to reuse): https://supportcenter.docketwise.com/en/articles/9372013-custom-intakes
* Docketwise, Templated smart form intakes: https://supportcenter.docketwise.com/en/articles/9573813-templated-smart-form-intakes
* Docketwise, Smart forms collection (questionnaire from a combination of forms): https://supportcenter.docketwise.com/en/collections/9474939-smart-forms
* INSZoom (Mitratech), Edit questionnaire templates (the vendor's own "Zoom" questionnaires cannot be edited in place): https://success.mitratech.com/INSZoom/Help_Articles/Knowledge_Base/INSZoom%3A-Edit_Questionnaire_Templates
* INSZoom, Add/Create petition template (bundle of forms, questionnaires, document checklist per case type): https://success.mitratech.com/INSZoom/Help_Articles/Knowledge_Base/Add_a_New_EAD_Type/INSZoom%3A-_Add_Appointment%2F%2FActivity_Categories/INSZoom%3A-_Add_Client_Type%2F%2FCategory/INSZoom%3A-Add_Firm_Customized_Expiration_Templates/INSZoom%3A-_Add%2F%2FCreate_a_New_Case_Status/INSZoom%3A-_Add%2F%2FCreate_Petition_Template
* eIMMIGRATION by Cerenade, directory listing (multilingual intake that fills cases and forms; admin-managed custom fields and dropdown lists; third-party description, no vendor help pages found): https://www.legaltechnologyhub.com/vendors/eimmigration-by-cerenade/
* Clio, Create custom fields (admins only; field sets per practice area): https://help.clio.com/hc/articles/9285496802331
* Clio, Matter templates best-practice guide (PDF): https://www.clio.com/wp-content/uploads/2025/06/Matter-Templates-Best-Practice-Guide.pdf
* Canada-focused tools: no public help pages on question-library design were found for Officio or Avalon. A competitor blog (Visaflo, marketing) and a G2 listing only describe form automation in general terms: https://vflo.inblog.ai/officio-alternative · https://www.g2.com/products/officio/discuss. **Gap:** a hands-on look at one Canadian tool would firm up this section.

**Master data, glossaries and catalogues**
* Collibra, Propose new business term workflow (new term starts as *Candidate*): https://developer.collibra.com/workflows/out-of-the-box-workflows-walk-throughs/propose-new-business-term
* Collibra, Business Glossary operating model: https://productresources.collibra.com/docs/collibra/latest/Content/BusinessGlossary/ref_business-glossary-om.htm
* Microsoft Purview, Create and manage glossary terms (steward role to create; a duplicate name warns but does not block; imported terms start as drafts): https://learn.microsoft.com/en-us/purview/unified-catalog-glossary-terms-create-manage
* Microsoft Purview, Glossary insights (Draft, Approved, Alert, Expired; with and without assets): https://learn.microsoft.com/en-US/purview/glossary-insights
* Informatica Customer 360, Search and compare (duplicate search when a user starts adding a record): https://docs.informatica.com/master-data-management/customer-360/10-4/user-guide/introduction-to-informatica-mdm---customer-360/key-concepts/search-and-compare.html
* Informatica Customer 360 for Salesforce, real-time duplicate settings (can block creation): https://docs.informatica.com/master-data-management/customer-360-for-salesforce/winter-2021/administrator-guide/managing-duplicate-records/configuring-settings-to-identify-duplicate-records-in-real-time.html
* Reltio, Review potential matches (steward merges or marks *Not a match*): https://docs.reltio.com/en/objectives/resolve-potential-matches/potential-matching-at-a-glance/potential-matching-operation/review-potential-matches-overview
* Reltio Community, Anatomy of a match rule (Not a match stops the pair coming back): https://community.reltio.com/blogs/terence-kirk/2021/06/08/anatomy-of-a-match-rule
* Profisee, Matching and survivorship (match groups side by side for stewards; audit trail): https://profisee.com/solutions/initiatives/matching-and-survivorship/
* Atlan, Use Atlan AI for glossary management ("accept, reject, or edit" AI suggestions): https://docs.atlan.com/product/capabilities/atlan-ai/how-tos/use-atlan-ai-for-glossary-management
* DataHub, AI term suggestion (proposals for owners to review): https://archive.docs.datahub.com/docs/1.0.0/automations/ai-term-suggestion
* Salesforce, Global value sets (one list, many fields; changes reach every field that references it): https://trailhead.salesforce.com/en/content/learn/modules/picklist_admin/picklist_admin_global
* Salesforce duplicate rules, Alert vs Block (practitioner guides, not Salesforce's own docs): https://www.datalane.com/post/salesforce-duplicate-rules · https://help.cognism.com/hc/en-gb/articles/6492362393234
* Atlassian, Adding custom fields ("check whether a custom field with the same name already exists"): https://confluence.atlassian.com/adminjiraserver/adding-a-custom-field-938847222.html
* Jira field contexts instead of duplicate fields (practitioner): https://blog.isostech.com/3-ways-to-reduce-your-number-of-custom-fields

**Questionnaire platforms, data standards and clause libraries**
* Qualtrics, Library surveys (copy vs keep separate): https://www.qualtrics.com/support/survey-platform/account-library/survey-library/
* Qualtrics, Reference surveys (library edits flow to every survey that references them): https://www.qualtrics.com/support/survey-platform/edit-survey/survey-flow/advanced-elements/reference-surveys/
* SurveyMonkey, Question bank (certified questions; editing the wording removes certification): https://help.surveymonkey.com/en/create/question-bank
* SurveyMonkey, Custom question bank (admins publish team questions; tags): https://help.surveymonkey.com/en/teams/custom-question-bank
* HL7 FHIR SDC, Modular forms (definition-based items, library item reference, sub-questionnaires): https://hl7.org/fhir/uv/sdc/en/modular.html
* LOINC, Procedure for submitting additions (search the queue first; local description matters more than the proposed name; committee review): https://loinc.org/kb/users-guide/procedure-for-submitting-additions-or-changes-to-loinc
* REDCap library coding guidelines (PDF): https://projectredcap.org/wp-content/resources/redcap_library_coding_guidelines.pdf
* ISO/IEC 11179 naming, applied in a state data-naming standard (PDF): https://oa.mo.gov/sites/default/files/CC-DMDataElementNamingStandards01122005.pdf
* ISO/IEC 11179 overview (DDI technical guide): https://ddi-lifecycle-technical-guide.readthedocs.io/en/latest/Other%20Standards/ISO11179.html
* Ironclad, Playbook recipe (preferred and fallback language; "Needs approval"; non-standard flagged): https://support.ironcladapp.com/hc/en-us/articles/34018339425303-Recipe-Build-a-Playbook-to-Help-Legal-Reduce-Negotiation-Time
* DocuSign Community, clause library limits (clauses duplicated across templates without the library): https://community.docusign.com/ideas/include-clause-library-in-agreement-builder-and-generation-conditional-clause-selection-26298. **Gap:** DocuSign's own CLM help pages on versions and where used were not reached.

**AI with people in the loop, and waiting times**
* Amazon Augmented AI GA announcement (human review below a confidence threshold): https://aws.amazon.com/blogs/machine-learning/amazon-a2i-is-now-generally-available
* Microsoft HAX Toolkit, Guidelines for human-AI interaction (G2 "make clear how well the system can do", G9 "efficient correction"): https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/ · https://www.microsoft.com/en-us/haxtoolkit/library/pattern/
* NN/g, The 3 response-time limits (0.1 s, 1 s, 10 s): https://www.nngroup.com/videos/3-response-time-limits-interaction-design/
* pgvector at small scale, indicative only (research paper; benchmark your own data): https://arxiv.org/pdf/2605.03275 · https://bigdataboutique.com/blog/pgvector-in-production

**Limits of this research:** vendor behaviour was read from public help pages and search summaries, not tried hands-on. Third-party and practitioner sources are marked as such. Scores in §2.2 are the Lead's judgement from this evidence.
