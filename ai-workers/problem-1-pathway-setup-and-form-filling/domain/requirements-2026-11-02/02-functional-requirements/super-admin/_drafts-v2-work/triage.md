# SA-01B v2.0 — cross-chapter review and open-question triage (24 Oct 2026)

Scope: `v2/chapter-01.md` … `chapter-11.md` and `v2/part-a.md`, checked against `SA-01B-REDESIGN-DECISIONS_2026-10-18.md`, the SA1B-D54 – D99 table in `TEMPLATE-MAP-working_2026-10-10.md` (G-rows win) and `REVIEW-METHOD_2026-10-22.md`. Backup taken before any edit: `scratchpad/backup-pre-triage-2026-10-24/` (all 11 chapters + Part A). `v2/part-c.md` appeared during the review (written from the pre-fix chapters); it was not edited — see conflict C9.

**Counts.** 110 open questions: CLOSED 38 · DEVELOPER 35 · EXPERT 18 · COUNSEL 2 · the product owner 17, merged into **5 ready-to-ask questions** (section 4). 42 mechanical fixes applied (section 1); 10 substantive conflicts listed (section 2), 4 of which need the product owner.

---

## 1. Mechanical fixes made

No rule's substance was changed. "Single home" = one card owns the rule; the other becomes a pointer. Unique, non-conflicting rules of a removed duplicate were moved into the owner so nothing was lost.

| # | File | Card / place | What |
|---|---|---|---|
| 1 | chapter-01 | SA-1B-33 | Full duplicate of chapter 4's SA-1B-33 → pointer card. Owner: chapter 4 (form-specific; its carry-forward key "SOM path, label and kind" is the precise form of ch 1's "field id and caption"). |
| 2 | chapter-04 | SA-1B-33 | Merged from ch 1: decisions D16, D56, D92(16); "guide text it relied on"; data `carriedFromEditionId`, `proposalSource`; "duplicate beats a miss" for removed / unmapped boxes; test "unknown canonical field cannot be saved"; edge "page move, same SOM path → carried forward"; non-goals (no AI at fill time, no past-filing comparison, no auto-publish). Engine "content AI (Reader)" → "Setup AI (SA-1B-111)" (Reader is the firm's plan-gated Doer). |
| 3 | chapter-01 | coverage row SA-1B-33, knock-on line, Q1-10 | Point to chapter 4 as owner. |
| 4 | chapter-01 | SA-1B-63 field 3 | States it is the single home of every publishing check, row-shape included. |
| 5 | chapter-06 | SA-1B-90 header, field 3, rule 1, coverage row SA-1B-63 | Row-shape checks (duplicated from SA-1B-63) → pointer to chapter 1 SA-1B-63. |
| 6 | chapter-01 | SA-1B-117 rule 1 | Box notice removed from the "correction" list (corrections go through the second person, SA-1B-38); added: a notice reaches open filings at once but is posted in the overlay by one Content publisher, no second person — aligns with R1(3) (SA1B-D75), SA1B-D92(9), ch 4 SA-1B-179 rule 2, ch 8 SA-1B-256 rule 2. |
| 7 | chapter-08 | SA-1B-255 field 1 | Same alignment: "a notice" removed from the correction kinds. |
| 8 | chapter-01 | SA-1B-115 fields 3, 6, 7 | Made the single home of large-table confirmation (SA1B-D98); pointer fixed (SA-1B-41–44 → SA-1B-190, -191); state "Sample checked" and data `rowCount`, `sampleSize` merged from ch 5. |
| 9 | chapter-05 | SA-1B-191 rules 3–5, field 7 | Duplicate Lane A / Lane B confirmation rules → pointers to SA-1B-115 / SA-1B-114; added the missing `lane` (FILE / HAND_BUILT) field that ch 1 SA-1B-115 says chapter 5 holds. |
| 10 | chapter-05 | SA-1B-192 field 2 | Code citation `country-pack-rules.prisma:365-366` → `:367-368` (opened the file: `effectiveFrom`/`effectiveTo` are lines 367–368; the brief's 365-366 was wrong). |
| 11 | chapter-05 | SA-1B-192 field 12 | "A change dated in the past is allowed only as a correction" contradicted ch 1 SA-1B-117/118 (a number change is always a rule change) → aligned to SA-1B-118 rule 4. |
| 12 | chapter-05 | SA-1B-194 rule 7, SA-1B-195 rule 6 | "where used (SA-1B-37)" → SA-1B-193 / SA-1B-17 (SA-1B-37 now means gates and scoring). |
| 13 | chapter-05 | SA-1B-195 knock-on; chapter knock-ons (Chapter 2 line) | "each canonical field says whose fact it is" contradicted SA1B-D92(3) ("box maps and conditions name whose fact relative to the form's person") → aligned. |
| 14 | chapter-05 | SA-1B-201 fields 3, 5(2), 12; knock-on | "field flagged 'prospect'" contradicted ch 2 (SA-1B-2 tier flag withdrawn; PQR blocks decide) → "canonical field placed in a PQR block". |
| 15 | chapter-05 | SA-1B-204 rule 2 | Hedge "facts that count decided in open question 6" → decided answer from SA1B-D89 (recorded client / officer values and confirmed document values count; proposals listed). |
| 16 | chapter-05 | coverage row SA-1B-38; SA-1B-199 field 3 | SA-1B-38 owned by chapter 1; ch 5 "adds to" it. |
| 17 | chapter-02 | SA-1B-7 fields 4, 11 | "Doer: Writer (AI, plan-gated …)" contradicted ch 1 SA-1B-111 (pack drafting is ExpatReady's Setup AI, not plan-gated, public documents only) → aligned. |
| 18 | chapter-02 | SA-1B-1 rule 1 | Added the missing pointer line for the field `shareable` mark (home ch 11 SA-1B-284), which ch 11 says chapter 2 carries. |
| 19 | chapter-03 | SA-1B-18 field 10 | "the firm changes nothing here except the client name" contradicted W-17 ("renaming a step's client name") and ch 10 card 272 → "document names are not renamable". |
| 20 | chapter-10 | card 270 rule 1(b) | "rename a client name" → "rename a step's client name" (W-17). |
| 21 | chapter-03 | SA-1B-156 fields 3, 5(2), 12 | Made the single home of passport-outlasts-permit; merged from ch 7 SA-1B-234: re-check when either date changes, CRITICAL at submission, the visitor-record edge case. |
| 22 | chapter-07 | SA-1B-234 | Duplicate → pointer to SA-1B-156. Removes the need for a new date-versus-date operator (closes ch 7 Q8; the check runs on SA-1B-22 / SA-1B-155). |
| 23 | chapter-07 | SA-1B-104 rule 6; SA-1B-233 rule 4 | References to SA-1B-234 → SA-1B-156 / SA-1B-155. |
| 24 | chapter-03 | SA-1B-157 header, rules 3–5 | Duplicate of the status-document feed (ch 7 SA-1B-104) and of the X-3 timings (ch 7 SA-1B-233 rule 4, which also has the 90-day closed-case point ch 3 lacked) → pointers. The card keeps the mark itself (SA1B-D92(15)). |
| 25 | chapter-07 | SA-1B-104 fields 3, 5(3) | Made the single home of the feed; merged from ch 3: "if the new date is earlier, the officer sees both and picks (SA1B-D89(4))". |
| 26 | chapter-07 | coverage row SA-1-38 | Owner = chapter 10 (cards 271, 272); ch 7 keeps only "never hidden when it carries a deadline". |
| 27 | chapter-07 | SA-1B-231 rule 4 | "Per-person starters are not part of Release 1" read as a Release 2 deferral not in SA1B-D99(h) → "covers everyone on the filing; there are no per-person starters" (same behaviour). |
| 28 | chapter-03 | SA-1B-158 rules 3–4 | Added the missing list of Release 1 shareable document types (job offer, decision letter, employment contract — AG17-D19), which ch 11 says chapter 3 holds. |
| 29 | chapter-04 | SA-1B-26 example | "a filing not yet submitted uses the 2026 edition" (automatic) contradicted SA-1-28 in the same chapter, ch 8 SA-1B-251 rule 1 and AG-07 BR-5 (edition stays bound; officer re-binds) → aligned. |
| 30 | chapter-04 | SA-1B-28 rule 1 | Source-badge list lacked "Linked file" and "Check" (ch 3 SA-1B-158, ch 6 SA-1B-53, ch 11 SA-1B-283, -285) → added; list owner = ch 9. |
| 31 | chapter-09 | SA-1B-260 rule 2, field 7 | Same: source kinds and badges + `linkedFilingId`, `checkDate` in `source_json`. |
| 32 | chapter-04 | SA-1B-174 header, rule 3, field 8 | Hedge "who confirms: open question Q1" → decided: overlay (SA1B-D92(9)) with the second person of AG07-D28(28) kept, as SA1B-D99(d) defines; switch-off by one person. |
| 33 | chapter-08 | SA-1B-256 rule 1, fields 6, 7, 8 | Overlay duplicated ch 4 with other names and a stored `AccuracyRecord` (ch 4 SA-1B-180: computed) → aligned to `FormEditionTrial`, `FormBoxNotice`, computed record, ch 4 states, second-person switch-on. |
| 34 | chapter-04 | SA-1B-176 fields 3, rules 1, 5, 7, 12 | Made the single home of the application fix; merged from ch 9: read order (fix → fact → blank), "belongs to the filing", "Declared" on write-back, "client changes the fact after the fix → fix still wins". |
| 35 | chapter-09 | SA-1B-265 | Duplicate with a different access key (`agent/case:edit` vs ch 4 / AG-7-23 `agent/form:create`) and a different data shape → pointer to SA-1B-176. |
| 36 | chapter-06 | SA-1B-57 rule 2, field 7 | "For whom" lacked the employer value ch 11 SA-1B-280 rule 6 needs → added `SUBJECT`. |
| 37 | chapter-06 | SA-1B-220 rule 3 | "A correction publish queues a run per affected filing" contradicted ch 10 SA-1B-275 rule 2 and SA1B-D94(5) → corrections are read live (ch 8 SA-1B-255); the reach count is a background job. |
| 38 | chapter-10 | card 276 rule 1 | Jobs list lacked "count the open filings a correction reaches" (ch 8 SA-1B-255 rule 6) → added (f). |
| 39 | chapter-06 | SA-1B-66 field 12 | Hedge "landing: open question 4" → closed answer (Part A A2: a stage creates a filing; SA-1B-68 rule 5: post-approval work is after-decision steps). |
| 40 | chapter-06 | SA-1B-213 rule 3 | `CHILD_n` order: ch 4 Q4 (oldest first) and ch 6 Q5 (officer's order) disagreed → one default for both: officer's order, a new child placed oldest first, reorderable. |
| 41 | part-a | A4 step 6 | "Client A's passport expires before the 3-year permit" contradicted the owner card's example (ch 3: Client B's passport 20 Nov 2027 vs permit to 14 Jan 2029; Client A's passport to 2031) → Client B. |
| 42 | all 11 chapters | open-questions sections | Each of the 110 questions tagged **→ Closed — <ID>** / **Developer decides (default: …)** / **Expert** / **Counsel** / **the product owner — triage question Sn**. |

Scripts used (run once each, renamed `APPLIED-once_…`): `scratchpad/scripts/APPLIED-once_apply_card_fixes.py` (78 string replacements, 0 misses), `scratchpad/scripts/APPLIED-once_tag_open_questions.py` (110 tags).

---

## 2. Substantive conflicts (not changed in the cards)

| # | Conflict | Where | Proposed resolution | Needs |
|---|---|---|---|---|
| C1 | A corrected box map reaching a form that is already filled: automatic (ch 4 Q2; SA1B-D92(8), 24 Oct) vs notice + one click (ch 8 SA-1B-255 rule 4; R1(4), 23 Oct; G15(b) "Corrected: update this form" = CRITICAL). Neither handles a form already approved or signed. | chapter-08.md:148, chapter-04.md:594, :688 | Automatic for forms not yet approved; CRITICAL notice + one click for approved or signed forms (S1). | **The product owner — S1** |
| C2 | An item with no answer-key test: warning (ch 1 SA-1B-116, SA-1B-63 rule 2) vs block for trial-list forms (ch 4 Q11) vs block until 3 signed families (ch 5 Q9). SA1B-D99(c) covers only a *failed* test. | chapter-01.md:243, :343; chapter-04.md:540; chapter-05.md:493 | Block for every testable item (S2). | **The product owner — S2** |
| C3 | Release 2 items outside SA1B-D99(h): other employer services rows (ch 11 SA-1B-281) and the full employer qualifier (ch 5 SA-1B-205) are Release 2 in **AG17-D51** (`FINAL-Agent-FR/AG-17-corporate-cases-and-lmia_v0.11_2026-10-21.md:219`); translation tooling stays deferred from v1.9 §0.1 (ch 7 SA-1-42). | chapter-11.md:46, chapter-05.md:413, chapter-07.md:273 | Per-item answer (S3); then add the Release 2 ones to the ch 10 Release 2 table with their decision. | **The product owner — S3** |
| C4 | Standard steps on individual rows: SA1B-D67 ("two kinds of steps, not three") vs SA1B-D92(13) (standard steps restored for the corporate workspace) vs G10(1) (EE profile-vs-application "checklist step"). Ch 7 SA-1B-97 puts "Book your biometrics" (client side) on Client A's row; ch 6 SA-1B-66 rule 6 uses a firm standard step for the G10(1) comparison. Ch 7 Q4's cited support (AG17-D15 "Extension 2") is the "action" line kind, not individual standard steps. | chapter-07.md:81-102, chapter-06.md:280 | One mechanism for both workspaces (S4). | **The product owner — S4** |
| C5 | LMIA advertising clock anchor: ch 7 SA-1B-230 rule 2 counts back from the planned submission ("latest start 21 Dec 2026"); ch 11 SA-1B-286 rule 1 counts forward from the first advertisement ("minimum met 30 Nov"). Same LMIA row bound twice (ch 11 Q7). | chapter-07.md:112, chapter-11.md:181 | SA-1B-286 owns both clocks and shows both dates: before ads start, "latest start" from the target filing date; once started, "minimum met on <date>"; the slot's "window before submission" column caps ad age. Ch 7 SA-1B-230 rules 2–3 then become a pointer. | Expert (window rule) + developer |
| C6 | Warning levels for validity and passport checks are consistent across ch 3 (SA-1B-155 rule 5) and ch 7 Q9, but G7 only says "CRITICAL where it matters". | chapter-03.md:343 | Advisory before submission, CRITICAL at submission (S5(a)). | The product owner — S5(a) (confirmation) |
| C7 | Trial switch-on: AG07-D28(28) (switch-on by a pack publish, so a second person) vs SA1B-D92(9) (overlay outside versions). Treated as closed: the overlay removes the publish, not the second person (applied, fix 32–33). Confidence 90%; flag to the product owner only if he wants the backend lead alone to switch it on. | chapter-04.md SA-1B-174 | As applied. | No (FYI) |
| C8 | Notices in SA1B-D92(8) are listed among "corrections", while R1(3) / D92(9) put them in the overlay with no second approver. Reconciled in fix 6–7: a notice reaches open filings at once like a correction but is not a publish. | chapter-01.md SA-1B-117 | As applied. | No |
| C9 | `v2/part-c.md` (written in parallel from the pre-fix chapters) still has: passport check data under SA-1B-234 (part-c.md:491); "card conflict" on the application-fix key (:567, :581 — now resolved: `agent/form:create`); trial "key open, Q1" (:261); two overlay data shapes (:508-511); two `ApplicationFix` shapes (:522); status-date row naming SA-1B-157 as the setter (:284 — now SA-1B-104). | part-c.md | Part C writer re-reads the fixed chapters. | No |
| C10 | Example values differ across chapters: Client B's work-permit expiry 14 Jan 2027 (ch 3 SA-1B-157, intro) vs 15 Mar 2027 (ch 7 SA-1B-233, SA-1B-104). Both sets of reminder dates are arithmetically right. | chapter-03.md, chapter-07.md | At assembly, use 15 Mar 2027 in ch 3 (ch 7's dates show the closed-day shift) and recompute ch 3's four reminder dates. | No |

Code changes surfaced (for DEV-TASKS, no question needed): author may never approve any content family (`pack-draft-review.service.ts:208-217`, SA1-D6); a new Assess run takes the current version without an adoption prompt (`pack-assessment-input.service.ts:555-572`, SA1B-D62b); "Request a document" on a withdrawn pin warns instead of refusing (`pack-tenant-extension.service.ts:311`, SA1B-D60); retire `WORKFLOW_OVERRIDE` (W-16).

---

## 3. Open-question triage (110)

Primary class per question; split notes are in the Note column. "As written" = the chapter's own recommended default stands.

| Ch | Question | Class | Note |
|---|---|---|---|
| 1 | Q1-1 — SA1-D6 and SA-1-61 say the author and the submitter can never approve; the code checks … | CLOSED | SA1-D6 / SA-1-61 (neither author nor submitter approves); the code change is a DEV-TASK. |
| 1 | Q1-2 — An item with no source record: warning or block at publish? | The product owner | triage question S5(c). |
| 1 | Q1-3 — Sample size of the spot-check for a large file-based table (SA1B-D98 says "a sample"). | EXPERT | (default: 25 rows drawn at random, or all if fewer; same as chapter 5 Q8). |
| 1 | Q1-4 — May any Content publisher confirm a number, or only the immigration expert's account? | CLOSED | AG16-54 #24 (the expert holds the Content publisher role; no seventh role). |
| 1 | Q1-5 — How often is the newsroom feed read? | DEVELOPER | (default: once a day). |
| 1 | Q1-6 — Does the explicit "Checked" click apply to AI-drafted items only, with hand-made items … | CLOSED | SA1B-D77 ("every new or changed item is checked by a person"); a hand-made item is checked by the second person (SA-1B-38). |
| 1 | Q1-7 — SA1B-D92(16) (carry maps forward, classify change-watch items, sample families for the … | EXPERT | (default: the content team's preview families, SA-1B-61). |
| 1 | Q1-8 — Is the closed list of correction kinds in SA-1B-117 right? | CLOSED | SA1B-D92(8) ("corrections (maps, wording, notices)"); box notices are posted in the overlay (SA-1B-179), applied in SA-1B-117 rule 1. |
| 1 | Q1-9 — When is AI drafting "proven" enough to switch on (SA1B-D94(6))? | CLOSED | SA1B-D94(6) ("AI drafting switched on once proven (still Release 1)"); the go / no-go is the product owner's after the proof of concept, not a spec question. |
| 1 | Q1-10 (coordination) — SA-1B-33, SA-1B-38, SA-1B-39 and SA-1B-40 appear in the v1.9 ranges given to chapters 4 … | CLOSED | single home fixed: SA-1B-33 is chapter 4's (pointer here); SA-1B-38, -39, -40 are this chapter's (chapter 5 points here). |
| 2 | Q1 — Privacy mark default | DEVELOPER | (default: "never", matching v1.9 §14 "privacy = private"). |
| 2 | Q2 — Does a field need a PQR flag? | CLOSED | SA1B-D74, SA1B-D87 (no tier chain); the PQR blocks decide (SA-1B-201 rule 3); chapter 5 wording aligned. |
| 2 | Q3 — Defaults for new fields | DEVELOPER | (default: as written). |
| 2 | Q4 — Home address: Household field or Person list with a live link? | CLOSED | SA1B-D65 ("'Same as [main client]' is live for the current home address"): addresses are a person list with the live link. |
| 2 | Q5 — Using a crosswalk | CLOSED | SA1B-D86 ("the change is shown, one click applies it") and the rule "ExpatReady suggests, the firm decides". |
| 2 | Q6 — Identity fields per list group | EXPERT | — |
| 2 | Q7 — Background blocks | EXPERT | — |
| 2 | Q8 — A "background or declaration" mark on the field itself? | CLOSED | SA1B-D90 (one rule replaces "locked to the client"); declaration boxes are marked on the box map (SA-1B-27). |
| 3 | Q3-1 Is v1.9's "a period before an event" the same calculation as "a fixed period from issue"? | DEVELOPER | (default: one way, "counted from a date"). |
| 3 | Q3-2 Which validity warnings are CRITICAL? | The product owner | triage question S5(a). |
| 3 | Q3-3 What is the "requested end of stay" fact: key, scope and who enters it? | EXPERT | (which field each row uses); the structure is decided: a filing-scope field (SA1B-D92(1)) with sources set by ExpatReady (SA1B-D89). |
| 3 | Q3-4 Does any type need "valid at decision"? | CLOSED | SA1B-D92(5) ("document validity: submission"). |
| 3 | Q3-5 Does the "issued within N months" number sit on the type, the line, or both? | DEVELOPER | (default: as written). |
| 3 | Q3-6 Which country selects a country-specific entry, and what fields does an entry hold (SA1B-Q13)? | EXPERT | — |
| 3 | Q3-7 Are default provider roles set on the type with a line override, or on the line only? | CLOSED | chapter 6 SA-1B-57 rule 6 (default from the library item; a row may change it). |
| 3 | Q3-8 What happens to requirement-level `categoryKey`, `instructionsKey` and `notesKey` (built)? | DEVELOPER | (default: as written). |
| 3 | Q3-9 Which date fills `{date}`, and what is written when a piece is empty (SA1B-Q17)? | DEVELOPER | (default: as written). |
| 3 | Q3-10 Is an alternative still offered when its "when acceptable" condition is false or unknown? | CLOSED | SA1B-D92(15) ("the officer sees 'Alternative used' (warning only)"). |
| 3 | Q3-11 Does the type carry a "notarisation expected" flag (AG-09 describes one)? | The product owner | triage question S5(f). |
| 3 | Q3-12 What is the default accepted-formats list on a new type? | DEVELOPER | (default: all upload types of AG-9-2). |
| 3 | Q3-13 May a client pick alternatives in an all-together set, or may a member own its own set? | DEVELOPER | (default: no to both; sets stay flat). |
| 4 | Q1 — Where the trial result lives and who confirms it | CLOSED | SA1B-D92(9) (overlay) with the second person of AG07-D28(28) kept, as SA1B-D99(d) defines it; applied in SA-1B-174. The permission key is SA-06's (developer). |
| 4 | Q2 — How a corrected map reaches open forms | The product owner | triage question S1. |
| 4 | Q3 — Which transforms count as reversible for "Also update <client>'s record" | DEVELOPER | (default: as written). |
| 4 | Q4 — Order of `child n`, `parent n`, `sibling n` | DEVELOPER | (default: the officer's order on the case; a new child is placed oldest first by date of birth; the officer can reorder; same as chapter 6 Q5). |
| 4 | Q5 — Is a signature-date box of kind `SIGNATURE`? | EXPERT | — |
| 4 | Q6 — Does the authority allow two editions on the same day (grace period)? | EXPERT | — |
| 4 | Q7 — How the extension recognises a screen | DEVELOPER | (default: as written). |
| 4 | Q8 — Permission to fetch a screen's answers for the extension | DEVELOPER | (default: `agent/form:create`, as AG-7-23; SA-06 confirms). |
| 4 | Q9 — Permission to add a library form to a filing | DEVELOPER | (default: `agent/form:create`; SA-06 confirms). |
| 4 | Q10 — The firm-terms line for de-identified counting of hand-fixes across firms | COUNSEL | — |
| 4 | Q11 — Does a map with no answer-key test block publishing? | The product owner | triage question S2. |
| 4 | Q12 — Family-information form for the trial list: IMM 5645 or IMM 5707 | EXPERT | (SA1B-D56: "expert decides"). |
| 4 | Q13 — Close SA1B-Q12 and SA1B-Q14 | CLOSED | SA1B-Q12 by SA1B-D54, SA1B-D56 (SA-1B-172, SA-1B-33); SA1B-Q14 by SA1B-D92(9) (SA-1B-174). |
| 4 | Q14 — IRCC acceptance of barcodes made outside Adobe | EXPERT | (ask IRCC; AG07-D28(18) records it as a suggestion, not a condition). |
| 5 | Q1 — Ranking across programmes (SA-1B-203) | The product owner | triage question S5(b). |
| 5 | Q2 — The "close" outcome of v1.9 SA-1B-85 has no rule behind it | The product owner | triage question S5(b). |
| 5 | Q3 — Age on a date (SA-1B-194) | EXPERT | ((a) the named dates, (b) the 29 Feb rule; the developer builds the list). |
| 5 | Q4 — The short list of "reads about another person" (SA-1B-195) | EXPERT | (the list content; the mechanism is decided, SA1B-D94(4)). |
| 5 | Q5 — How many levers show and who authors them (SA-1B-203) | The product owner | triage question S5(b). |
| 5 | Q6 — Case score (SA-1B-204) | CLOSED | SA1B-D89 (recorded client, officer and confirmed document values count; applied in SA-1B-204 rule 2). Developer decides (b) compute on demand, (c) `agent/assessment:create` with SA-06. |
| 5 | Q7 — Conversions and grids (SA-1B-197) | DEVELOPER | (default: as written). |
| 5 | Q8 — Large-table spot-check sample size (SA-1B-191) | EXPERT | (default: 25 rows or all; same as chapter 1 Q1-3). |
| 5 | Q9 — A gate set or scoring definition with no answer key (SA-1B-199) | The product owner | triage question S2. |
| 5 | Q10 — The logic reference is out of date (SA-1B-200) | CLOSED | SA1B-D61b ("the product owner's practice engine is the logic source and test answer key"). Action for the product owner: refresh `Release-1-Configuration/scoring-reference/` from the engine before the content session. |
| 5 | Q11 — Full employer qualifier (SA-1B-205) | The product owner | triage question S3. |
| 5 | Q12 — Which prospect fields carry to the case, and where the list lives (SA-1B-202) | DEVELOPER | (default: a carry mark on the canonical field, starting with the six of SA1B-D62). |
| 6 | Q1 — Pre-fill of a person's location | DEVELOPER | (default: as written). |
| 6 | Q2 — Does a stage carry its own filing method and portal, or take its row's? | CLOSED | SA1B-D69b with SA-1B-66 rule 2: each stage has its own row, so it carries that row's method and portal. |
| 6 | Q3 — What counts as a row "having its forms and documents" for every allowed location (SA1B-D66)? | CLOSED | SA1B-D66 ("a programme goes live only when every allowed location has its forms and documents"); SA-1B-90 rule 2 is that reading. |
| 6 | Q4 — May a stage involve no application to an authority (for example landing)? | CLOSED | Part A A2 (a stage "creates a filing") and SA-1B-68 rule 5: landing and other post-approval work are after-decision steps on the filing; applied in SA-1B-66 field 12. |
| 6 | Q5 — Order of "child n" | DEVELOPER | (default: the officer's order on the case; a new child is placed oldest first by date of birth; the officer can reorder; applied in SA-1B-213 rule 3; same as chapter 4 Q4). |
| 6 | Q6 — Size of the cross-person input list (SA1B-D94(4)) | DEVELOPER | (default: warn above 20). |
| 6 | Q7 — Roles that others depend on (SA-1B-219) | EXPERT | — |
| 6 | Q8 — SA-1B-63 appears in the lists of chapters 1 and 6 | CLOSED | single home fixed: chapter 1 SA-1B-63 holds every publishing check; SA-1B-90 rule 1 points to it. |
| 7 | Q1 — "Gate" on a government step (v1.9 SA-1B-45) | DEVELOPER | (default: drop the word). |
| 7 | Q2 — Adding months to a date | DEVELOPER | (default: as written). |
| 7 | Q3 — The built stage pipeline authored in the pack versus platform-standard delivery steps (SA-1B-46) | DEVELOPER | (default: as written). |
| 7 | Q4 — May individual rows use standard steps, with `CLIENT_SIDE` reading "Client"? | The product owner | triage question S4. |
| 7 | Q5 — Per-person starter to-dos | DEVELOPER | (default: one starter set per filing, no per-person mechanism; SA-1B-231 rule 4 reworded so it no longer reads as a Release 2 deferral). |
| 7 | Q6 — A new or removed starter | CLOSED | SA1B-D67 ("nothing changes by itself") and SA1B-D99(g). |
| 7 | Q7 — Biometrics validity as a key-date type | EXPERT | — |
| 7 | Q8 — Date-versus-date comparison in conditions | CLOSED | chapter 3 SA-1B-22, SA-1B-155, SA-1B-156: the passport check runs on the document-validity rule, so no new operator is needed; SA-1B-234 is now a pointer. |
| 7 | Q9 — Severity of the passport checks | The product owner | triage question S5(a). |
| 7 | Q10 — `recordKeepingNoticeKey` in the built regulator body | DEVELOPER | (default: as written; SA1B-D33). |
| 7 | Q11 — Translation tooling stays deferred (v1.9 §0.1) | The product owner | triage question S3. |
| 7 | Q12 — Which steps are `orderFixed` | EXPERT | — |
| 8 | Q8-1 — How does a corrected form-box entry reach a form that is already filled and not … | The product owner | triage question S1. |
| 8 | Q8-2 — The built move stops on a type mismatch, a required field that cannot be re-read, and a … | The product owner | triage question S5(e). |
| 8 | Q8-3 — Who may switch a form edition's trial result on, and does it need a second person? | CLOSED | as chapter 4 Q1: SA1B-D92(9) overlay, second person per AG07-D28(28) / SA1B-D99(d); applied in SA-1B-174 and SA-1B-256. |
| 8 | Q8-4 — A prospect's new "Assess" run after a newer version exists: the built rule asks for … | CLOSED | SA1B-D62b ("each run replaces the last"); the built adoption prompt is a DEV-TASK. |
| 8 | Q8-5 — The built "Request a document" is refused on a pin of a withdrawn version … | CLOSED | SA1B-D60 ("Everything else warns"); the built refusal is a DEV-TASK. |
| 8 | Q8-6 — For a filing sent by post or courier, which date is "the date the authority receives the … | EXPERT | — |
| 8 | Q8-7 — After a rule-change publish, the background job finds affected filings through their … | CLOSED | SA1B-D94(5) (no global "where used" recompute index until volume needs it). |
| 9 | Q1 — Storage of household and filing facts | DEVELOPER | (default: as written). |
| 9 | Q2 — Confidence threshold | DEVELOPER | (default: under 90%, set from the proof of concept). |
| 9 | Q3 — Migrated forms and family members | DEVELOPER | (default: as written; matching per SA1B-D79). |
| 9 | Q4 — A matching client answer when a document is confirmed | CLOSED | SA-1B-263 rule 5 (a matching proposal promotes the existing fact; no new row). |
| 9 | Q5 — Consent wording | COUNSEL | — |
| 9 | Q6 — Canadian-region document reading | DEVELOPER | (proof-of-concept test, SA1B-D80 gap). |
| 9 | Q7 — Retention of unused or dismissed proposals | DEVELOPER | (default: as written). |
| 9 | Q8 — Returning-client recognition and merging | CLOSED | AG16-44 (no merge by guess); the intake-flow clash belongs to AG-02 / AG-07 / AG-18. |
| 10 | Q1 — Gate profile numbers | The product owner | triage question S5(d). |
| 10 | Q2 — Does a document's validity rule count as a "deadline" for hiding? | CLOSED | W-15 ("firms may hide ExpatReady's standard checklist items ... without a deadline"); a validity rule is not a deadline. |
| 10 | Q3 — Does a hide apply to filings or to cases? | CLOSED | chapter 8 SA-1B-258 rule 1 (a hide applies to filings opened after it). |
| 10 | Q4 — May a firm rename a document's client name? | CLOSED | W-17 ("renaming a step's client name"); chapter 3 SA-1B-18 and card 270 aligned. |
| 10 | Q5 — Which changes raise the "updated" note (card 273)? | DEVELOPER | (default: as written). |
| 10 | Q6 — Where does a single-filing resolve run on a save? | DEVELOPER | (default: as written). |
| 10 | Q7 — How long may the IRCC-change job take per firm after a publish? | DEVELOPER | (default: 4 hours). |
| 10 | Q8 — Does a rename apply to open filings? | DEVELOPER | (default: yes, at display time). |
| 10 | Q9 — Existing `WORKFLOW_OVERRIDE` rows | DEVELOPER | (default: as written). |
| 10 | Q10 — Fair-queue limit K and job-cursor retention | DEVELOPER | (default: K = 2; 90 days). |
| 11 | Q1 — SA-1B-71 services: Release 1 or Release 2? | The product owner | triage question S3. |
| 11 | Q2 — Does the employer see individual position rows? | CLOSED | AG-17-90 / CP1-D10 (counts only), consistent with SA1B-D97 ("shown, not pushed"). |
| 11 | Q3 — Who lists the `shareable` mark on fields? | CLOSED | single home fixed: card 284 owns the field mark, chapter 3 the document mark; chapter 2 SA-1B-1 now carries the pointer. |
| 11 | Q4 — What starts the validity clock? | EXPERT | — |
| 11 | Q5 — Editing the occupation or work location on a started file | CLOSED | SA1B-D60 / Rule 7 and AG17-D83 (warn, never block). |
| 11 | Q6 — Do linked-file facts need their own confirmation? | CLOSED | SA1B-D89 (one review, practical) and SA1B-D92(13) (badge only). |
| 11 | Q7 — Overlap with chapter 7 | CLOSED | chapter 7 the generic rule, chapter 11 the LMIA binding; the advertising-clock anchor difference is listed in triage §2. |
| 11 | Q8 — Maximum positions per file | CLOSED | SA-1B-280 rule 3 (no pack maximum) and AG-17's cap checks. |

---

## 4. The product owner questions, ready to ask (ranked by impact)

Five questions. They cover the 17 open questions classed the product owner. Ask one per message, in this order.

### Question 1 of 5: When ExpatReady corrects a form's box map, what happens to forms already filled on open cases?

**Today.** Two later decisions pull opposite ways. G8(8) (24 Oct): "corrections … reach open filings automatically, audited". R1(4) (23 Oct): "one-click move to the corrected version per case", and G15(b) makes "Corrected: update this form" a CRITICAL notice. Chapter 8 rewrites nothing and shows a notice with "Press Autofill" on every filled form (`v2/chapter-08.md:148`, SA-1B-255 rule 4). Chapter 4 updates every unsubmitted form automatically (`v2/chapter-04.md:688`). AG-7-67 already sends a re-rendered draft back to review (`FINAL-Agent-FR/AG-07-case-core-and-delivery_v3.7_2026-10-24.md:2857`). Nobody says what happens to a form that Client F has already approved or that a client has already signed.

**Example.** On 16 Nov the content team fixes the IMM 1295 box "Spouse date of birth", which was reading Client B's date instead of Client A's. Client A's IMM 1295 has been filled by Client C and is still a draft. Client D's form was approved by Client F on 14 Nov and signed in ink by Client A and Client B.

**Options.**
- **a) Drafts update by themselves; approved or signed forms get the CRITICAL notice and one click (recommended).** A form not yet approved is re-filled the next time it opens. Hand-fixed boxes are kept and the form goes back to review (AG-7-67). An approved or signed form shows "Corrected: update this form" on the box. Client C clicks once to re-fill it, and it then needs approval and a signature again.
  - Pro: nobody re-clicks on drafts, and a signed document never changes without a person.
  - Con: two behaviours to explain, though staff only ever see one per form.
- **b) Every unsubmitted form updates by itself, approved and signed ones too.** Approvals and signatures reset automatically.
  - Pro: simplest rule, and the wrong value never stays.
  - Con: a form the client has already signed changes under them. Client F's approval disappears without her action.
- **c) A notice and one click on every filled form (chapter 8 today).**
  - Pro: the officer is always in control.
  - Con: a click on every filled draft in every firm, and it goes against G8(8).

**Now vs recommended.** Drafts no longer need a click. Approved or signed forms keep the notice and one click.

**Recommendation.** I recommend a. It follows your G8(8) "reach open filings automatically" where nothing has been approved yet. It keeps "a person confirms" where Client F approved or a client signed (confirm before commit; never quietly change a signed document). It uses the CRITICAL notice you already set in G15(b).

**Confidence.** 90%. b becomes the better choice only if signing in Release 1 always happens after the final approval and never before a correction can land. AG-07 does not guarantee that.

**Effort.** Drafts: 0 clicks. Approved or signed forms: 1 click, then the usual re-approval and signature. The officer still decides when to re-fill a signed form.

Reply a, b or c.

### Question 2 of 5: Can ExpatReady publish a form map, a points table or eligibility rules that have no answer-key test at all?

**Today.** A *failed* test blocks publishing (SA1B-D99(c)). For an item with *no* test, the chapters disagree:
- chapter 1 warns only (`v2/chapter-01.md:243`, `:343`);
- chapter 4 blocks only the five trial-list forms (`v2/chapter-04.md:540`, `:697`);
- chapter 5 blocks until the expert signs 3 made-up families (`v2/chapter-05.md:493`).

Your R2 and R3 (23 Oct) say maps are proven with expert-signed made-up families, and that relaxing strict review needs evidence and your yes.

**Example.** The content team maps IMM 5476 and the CRS spouse-factor grid on 20 Nov. Nobody has yet signed expected values for the Client E family.

**Options.**
- **a) Block (recommended).** A form map, gate set or scoring definition with no signed answer key cannot publish. The same made-up families (Client E, no-spouse, 6 addresses, accented names) are reused across forms.
  - Pro: this is strict review exactly as you decided, and an untested map is as risky as a failed one.
  - Con: expert signing time can delay a form at launch.
- **b) Block for scoring, rules and the five trial forms; warn for answer-sheet-only forms.** Those forms show "Not yet answer-key tested" on their accuracy record.
  - Pro: launch is faster.
  - Con: it relaxes strict review without measured evidence.
- **c) Warn everywhere (chapter 1 today).**
  - Con: tests become optional.

**Now vs recommended.** Chapter 1's warning becomes a block. Chapters 4 and 5 align to it.

**Recommendation.** I recommend a. Your rule is that relaxing review needs measured evidence and your yes (SA1B-D77), and R2 says maps are proven by answer-key tests.

**Confidence.** 90%. b becomes the better choice if the proof of concept shows that expert signing per edition is the launch bottleneck. You could then switch to b with that evidence.

**Effort.** 0 clicks for firms. The content team needs one signed family set per edition before its first publish. The expert still signs every expected value.

Reply a, b or c.

### Question 3 of 5: Three items are marked "later" but are not on the Release 2 list. Which release is each in?

**Today.** The Release 2 list for SA-01B is SA1B-D99(h) (`v2/chapter-10.md`, "Release 2 wish-list"). Three items sit outside it:
- **(i) Other employer services** (an offer of employment for an exempt worker, an employer designation or endorsement, a compliance response). They are rows with no code (`v2/chapter-11.md:46`). AG17-D51 lists them as Release 2.
- **(ii) The full employer qualifier**, an employer block in the prospect questionnaire. AG17-D51 and AG17-D52 put it in Release 2 (`FINAL-Agent-FR/AG-17-corporate-cases-and-lmia_v0.11_2026-10-21.md:219-220`). The quick LMIA Check stays in Release 1.
- **(iii) Translation tooling**: export and import for translators, machine translation and stale-text detection. It was deferred in v1.9 §0.1 (`v2/chapter-07.md:273`). English is required and French optional (SA1-D2).

**Example.** Acme asks Client F's firm to submit an offer of employment for an intra-company transferee next week. Separately, Client F wants a fuller employer questionnaire before Acme signs.

**Options.**
- **a) Accept the per-item recommendation (recommended):**
  - (i) Release 1, as pack content on the shared engine with no AG-17-specific screens. Firms that serve employers file these offers routinely, and card 281 needs no code.
  - (ii) Release 2, keeping AG17-D51 and adding it to the list. The quick Check covers the daily need.
  - (iii) Release 2, added to the list. It is a content-team tool, not firm work, and English-first is decided.
- **b) Keep AG17-D51 as it is.** (i) and (ii) go to Release 2 and (iii) goes to Release 2. All three are added to the list.
  - Pro: no reversal of AG17-D51.
  - Con: firms cannot file exempt-worker offers in ExpatReady at launch.

**Now vs recommended.** (i) moves from Release 2 to Release 1. (ii) and (iii) are written onto the Release 2 list.

**Recommendation.** I recommend a. Release 1 covers everything a firm does day to day (your 11 Oct principle), and (i) costs content work only.

**Confidence.** 80% for (i). This is below 90% because a firm may need AG-17-style screens for these offers (positions, compliance fee), which card 281 does not provide. If so, b is right for (i). 95% for (ii) and (iii).

**Effort.** 0 clicks for firms. (i) adds three rows of content work for ExpatReady.

Reply a or b.

### Question 4 of 5: Can individual (non-employer) programmes carry ExpatReady's fixed "standard steps"?

**Today.** Your rules pull different ways:
- Decision 14 (SA1B-D67) says "two kinds of steps, not three" for every case: government steps, and the firm's own starter to-dos.
- G8(13) (SA1B-D92(13)) brings back pack standard steps with "done by" for the employer workspace.
- G10(1) needs "one checklist step" where the officer compares the Express Entry profile with the PR application.

Chapter 7 lets any row use standard steps, for example "Book your biometrics" done by the client on Client A's row (`v2/chapter-07.md:81-102`). Chapter 6 uses one standard step for the G10(1) comparison (`v2/chapter-06.md:280`).

**Example.** Client B's PR application filing. With a, it shows a fixed step "Compare the profile with this application" that the firm cannot delete, and Client A sees "Book your biometrics" in her portal. With b, the comparison is a starter to-do the firm may edit or delete, and biometrics stays a government step only.

**Options.**
- **a) One standard-step mechanism for both workspaces, used on individual rows only where ExpatReady must own the step (recommended).** The G10(1) comparison is one example. Client-side items like "Book your biometrics" are another.
  - Pro: one thing to build. The G10(1) safeguard cannot be deleted by a firm.
  - Con: a third kind of item on individual timelines.
- **b) Standard steps on employer rows only.** Individual rows keep Decision 14's two kinds, and the G10(1) comparison becomes a starter to-do.
  - Pro: Decision 14 exactly.
  - Con: a firm can delete the profile-comparison safeguard, and the code needs two rules.

**Now vs recommended.** No change to chapter 7 as written. Decision 14's "two kinds" becomes "two kinds for internal work, plus ExpatReady's fixed steps where needed".

**Recommendation.** I recommend a. It applies "one fact, one mechanism" (G8) and keeps the G10(1) check, which you made a person's step, from being removed.

**Confidence.** 85%. This is below 90% because it reverses the wording of Decision 14 for individual rows. If you want individual timelines to show only government steps and the firm's own to-dos, b is right.

**Effort.** 0 added clicks for staff. The firm cannot hide such a step when it carries a deadline (W-15), and still marks it done or not applicable.

Reply a or b.

### Question 5 of 5: Six small confirmations (reply "a) accept all", or name the ones to change)

- **(a) Warning levels for document checks.** "Police certificate too old" and "passport ends before the permit" show as Advisory before submission. At submission they are CRITICAL, passable with a reason. "Can't check" follows the same rule.
  - Today: `v2/chapter-03.md:343` (SA-1B-155 rule 5); chapter 7 Q9.
  - Why: quiet until it matters, and re-checked at submission (G7).
  - Effort: 1 pass-with-reason only at submission.
- **(b) Assessment results.** Order: Qualifies, then Can't tell yet, then Does not qualify, then the pack's programme order. Scores are shown but never compared across programmes. v1.9's "close" outcome is dropped, because "What would change it" carries that message. The best 3 levers show, with "Show more" for the rest.
  - Today: `v2/chapter-05.md:359` (SA-1B-203 rule 3).
  - Example: Client B sees CEC "Qualifies, 478" first, then Alberta "Can't tell yet".
- **(c) An item with no source blocks publishing.** One pick fixes it: a register entry, or "None published – proposed by ExpatReady". Today it only warns (`v2/chapter-01.md:56`).
  - Why: your Decision 17 shows source and date to staff wherever a number appears.
  - Effort: content team only.
- **(d) Load-test gate profile.** 300 firms, 3,000 open filings each (900,000 in total), 20 staff per firm, 20% active at once, 5-minute ramp, then a 20-minute steady run.
  - Today: `v2/chapter-10.md:233`.
  - Why: this is your "hundreds of firms, thousands of applications each" in numbers.
- **(e) A version move that cannot carry an answer is refused, with the reason named.** This happens when an answer's type no longer fits the field, or when the programme was removed from the new version. The filing keeps working on its own version, and the CRITICAL warning can be passed. A new required question is only a new question.
  - Today: `v2/chapter-08.md:217`, already built (`pack-pin-adoption.service.ts:518-560`).
  - Why: built stays, and nothing the officer is doing stops.
- **(f) Add a "notarised copy expected" yes/no to the document type, default no**, like "certified translation".
  - Today: `v2/chapter-03.md:53`; chapter 3 Q3-11 leaves it out. AG-09 already takes notarisation defaults from the type (`FINAL-Agent-FR/AG-09-document-management_v1.18_2026-10-23.md:371`).
  - Effort: 0 for firms.

**Recommendation.** a) accept all. Each item follows a rule you already set: warn, never block; quiet by default; built stays; use what exists.

**Confidence.** 90%. Change (c) to "warn" only if the content team regularly publishes hand-made items before a source exists.

Reply a, or name the item to change.
