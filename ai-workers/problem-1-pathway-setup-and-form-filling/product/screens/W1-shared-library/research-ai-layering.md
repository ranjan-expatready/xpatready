# AI layering across the product: is each AI step in the right place? (research, 29 Oct 2026)

**Asked (founder, 29 Oct, condensed):** is AI layered the right way end to end, and is it best in class? Is each AI step in the right place, is there too much AI where rules would do or too little where AI would save manual work, is the flow confusing, and what missing configuration would make an AI step fail in production?
**Trigger:** in the demo, Find forms with AI failed at "pick the application page". Its output schema used `maxItems`, which the provider's structured outputs refuse with a 400. The person was then shown up to 10 candidate pages to choose from.
**Status:** research only. It changes nothing until the founder answers §7. It builds on `research-authoring-model.md` (who makes each master) and `research-end-to-end-masters.md` (N1–N16), and does not repeat them.
**Read:** origin/main `170659bc`, plus the forms lane branch `origin/lead/2026-10-29-forms0` (the step runner `api/src/rounds.ts` and the W1-10 `plan.md`). Paths are under `prototype/`. Every immigration value is Sample.

## 1. Every AI step today
| # | AI step (code) | What it decides | Input → output | Rule step before · after | Person's checkpoint | Failure modes seen or likely | Verdict |
|---|---|---|---|---|---|---|---|
| A1 | **Pick the application page** (`find_guide`, `studio/api/src/finder.ts:279-300`) | Which of the 126 packages on IRCC's index is this combination | Combination trail + recorded index text (36 KB) → title, high/low, up to 5 others | Before: `sureMatch` word overlap (`finder.ts:436-446`). After: title matched back to the *live* index (`:295`) | When unsure, up to 10 candidates (`:297`, `:303`) | Schema refused (`p2/prompts/find-guide-output.v1.schema.json:9`); index names do not match our trail ("Work permit – inside Canada" covers many categories); runs again every time no page is remembered | **Remove from runtime. Make it rules-first configuration (§2)** |
| A2 | **Pick the guide on the page** (rules, `finder.ts:315-317`) | Which guide link to read when a page links several | Page links → one guide | n/a | None, chosen silently | Ties keep the first link; a wrong guide is read without anyone seeing | Make it configuration, set with A1 |
| A3 | **List the forms** (`find_forms` draft + blind checker, `finder.ts:349-368`) | Which forms the page and guide ask for, and under what condition | Page + guide inventories → forms with quote, applies, who | Before: `mentionsOf` lists every printed number (`engine/canada.ts:116`). After: quote and number must be on the page; `compareRounds`; download from index (`:399-415`) | None: attached automatically as "Picked by AI · Sample" (P-123, `:419-428`); disagreements go to Decide | It never reads the **document checklist**, IRCC's own list of what to send. The guide can be up to 160 K characters (`:176`) | **Keep, and change its input to the checklist + guide** |
| A4 | **Filing channel per form** (W1-10 slice 1, planned inside A3's rounds) | PDF, online or both, with IRCC's quote | Same pages | After: `channelsFrom` flags a contradiction | Second person confirms (P-140) | Values not decided yet (R-8) | Keep, merged into A3 (no extra call) |
| A5 | **Who can be in this application** (`studio/api/src/people-ai.ts:4-10`) | Roles and counts the guide names | Guide inventory → roles with min/max and quote | Before: `rulesReading` (`:56`). After: quote found; both rounds agree | Person accepts into the editor | Live is off (`:33`). Its schema uses `minimum`/`maximum` (`who-can-be-output.v1.schema.json:14-15`), the same kind of keyword that failed in the demo | Keep. Fix the schema before its first live run |
| A6 | **Field-map draft** (`studio/api/src/sources.ts:228`, `:290`; batch `ai.ts`) | Which library fact fills each form box, with transform | Form inventory, or the parts the library cannot fill → map | Before: reuse from the library and split into parts (`ai.ts:135-142`). After: normalise and compare to the library | Review queue, with bulk accept for High only (P-121) | **One round only, with no blind checker**, unlike P-121. Up to 3×2 = 6 paid attempts per form (`ai.ts:34` × `p2/runner.ts:57`). 64 K output tokens booked per attempt | Keep. Move it onto the step runner with a checker round (S6) |
| A7 | **Documents from the checklist** (`studio/api/src/checklist.ts:1-5`, `:24`) | Document lines per person, with conditions | Checklist → requirement proposals | n/a | Queue | Stub only: no live path, so documents are typed by hand today | **Merge with A3**: one read of the checklist gives forms *and* documents |
| A8 | **W1-10 steps 3, 4, 6, 7, 8** (plan only) | Documents, reader kind, conditions, pre-qualification picks, cross-answer checks | Checklist, guide, field maps → proposals | Rules R-1 to R-11 (plan §2); steps 2, 5 and 9 are rules | Queue | Not built yet | Keep the split (rules for 2, 5, 9 is right). Steps 3 and A3 read the same checklist: share one round |
| A9 | **Portal screen order** (`screen_map`, `sources.ts:90-93`) | The answer sheet's order | Portal twin → order | n/a | Second person | Parked since W1-02 | Keep parked (gap analysis Q1) |
| A10 | **Document reading** (p5 reader, P-133/P-134) | Facts from uploaded documents | Synthetic documents → values | Rules read a passport's coded lines first | Person checks names | Counsel question on processing outside Canada | Keep, as decided |

**Overall:** the pattern is sound (rules before, two rounds, quote check, person or second person after) and better than most prototypes. It is applied unevenly. **Too much AI** sits on A1, a lookup that should be configuration. **Too little** sits on A7: documents are the most manual work, and the checklist that lists them is never read. **One step is weaker than the rule says** (A6 has no checker round).
**Confusing for the person:** the checkpoints are inverted. The easy, checkable choice (which page) asks the person to pick from up to 10 names. The judgement call (which forms) attaches with no confirm. On top of that, each AI step can run three ways (Live, Saved, Rules only), and each run shows six steps to read.

## 2. The forms finder: use the master index for what it knows, and nothing else
**Where it sits:** IRCC's "Application forms and guides" page (`finder.ts:72`) is recorded at `official-sources/ircc/canada/pages/application-forms-guides.html` (fetched 27 Oct), with its text inventory `p1/inventory/application-forms-guides.text.inventory.json`. `parseFormsIndex` (`engine/canada.ts:63-81`) reads **230 table rows** and **126 package links** from it. `parseFormPage` (`:85-100`) reads each form's own page.
**What the master index can tell us (rules, US$0):**
* every IRCC form and document checklist that exists, with its number (`IndexRow.code`) and title, and whether it is a checklist (`kind`);
* the link to each form's own page, where `parseFormPage` finds its edition ("Last updated") and its English PDF. That page is the safe download source (M2);
* the page's "date modified" (the page date, not the edition);
* the names of the application packages and their links.

**What it cannot tell us:** which forms a given program, category, sub-category or applicant needs; under what condition ("if you have a spouse", "if outside Canada"); who fills each form; or the channel. Only the program's apply page, its instruction guide and above all its **document checklist** (for example IMM 5484 for a visitor visa) say that. The index also has blind spots: online-only forms (P-152), visa-office country instructions, and provincial or Quebec forms (`OFFICIAL_HOSTS` admits only canada.ca hosts, `engine/canada.ts:11`).

**Recommended flow (fewest decisions for the person):**
1. **Configuration, not a runtime AI call.** Each combination stores its *official pages*: apply page, guide and checklist number(s), with the date checked. Rules propose them once from the index (`sureMatch` plus an alias table, below). A person confirms once, as part of setup. Every later run reads the stored pages (US$0, no AI). Today the page is only "remembered" from the last run's plan JSON (`finder.ts:199-203`), and `Combination` has no column for it (`studio/prisma/schema.prisma:147`).
2. **The index gives identity, edition and download** for every number (already done in `finder.ts:401-411`).
3. **AI reads only the checklist and guide** in two rounds. It gives forms with condition, who and channel, *and* document lines, all with quotes (A3, A4 and A7 merged). Rules check every quote and every number against the index.
4. **The person confirms the list once** in the queue. High items are bulk-accepted (P-121); Decide items are shown one by one.

**What the person sees when rules are unsure:** one line, not ten. For example: "We think this is *Visitor visa (Temporary resident visa)* — Use this · Choose another". "Choose another" opens a search over the 126 index packages, with the 2–3 best matches first. A paste-a-canada.ca-link field stays (already allowed, `finder.ts:170`). AI is offered only as "Suggest with AI (about US$0.01)" behind that search, never run by default, and only once per combination, because the answer is stored.

## 3. Determinism and safety gaps
| # | Gap | Evidence | Fix |
|---|---|---|---|
| G1 | **Schemas use keywords the provider refuses** (`maxItems` proved it; `minimum`/`maximum` and `pattern` on other schemas need checking against the provider's list) | `find-guide-output.v1.schema.json:9`; `who-can-be-output.v1.schema.json:14-15`; `field-map-output.v2.schema.json:27` and `screen-map-output.v1.schema.json:22` (pattern) | Send the provider only keywords it supports; enforce limits such as "up to 5" or "0–9" in rules after the answer |
| G2 | **No offline schema check.** The free stub pass returns a saved file and never sends the schema anywhere, so a refused schema shows up only on a paid call | `p2/draft.ts:26-29`, `:73` | A schema lint in the launcher and in CI: refuse a disallowed keyword before any call |
| G3 | **A refused call is booked at its worst case.** A 400 is rejected before processing, yet it is settled at the full reservation | `p2/runner.ts:74` (break at `:79` is right) | Settle provider 4xx refusals at US$0, as the usage-limit refusal already is (`finder.ts:512`) |
| G4 | **Attempts multiply.** Batch retries × runner attempts (3 × 2), each reserved at worst case | `ai.ts:34`, `runner.ts:57` | One attempt budget per step in the runner. A rejected request is never retried |
| G5 | **Inputs have no size limit**, only bounds on cost. The guide is bounded at 160 K characters for cost, not refused | `finder.ts:176`; `p2/ledger.ts:12` | A maximum input per step, refused before launch with plain words; large guides split by section |
| G6 | **Rules and AI read different copies of the index.** Rules fetch the live index each run (`finder.ts:282`, `:401`); AI reads the 27 Oct recording (`inventoryFor`, `:287`) | as cited | One dated index snapshot used by both, refreshed with a diff (with N14) |
| G7 | **No golden test set per AI step.** The only "golden" check replays one combination's saved answers (`studio/tests/check_forms_s4_runs.ts:194-200`), and nothing is scored | STANDARDS §7 `[M] Golden expected-answer tests for AI, scored` (`STANDARDS.md:47`) | 10–20 labelled cases per step, scored for precision and recall on replay in CI; a live trial is scored against the same set |
| G8 | **Step settings are scattered constants** (prompt, schema, effort, output cap) | `finder.ts:84-87`, `people-ai.ts:31`, `sources.ts:228` | One step catalogue (§4 M4) read by the runner |
| G9 | **A6 has one AI round**, against P-121's two rounds | `sources.ts:228`, `:290` (no checker job) | Field maps on the step runner with a blind checker (S6) |

## 4. Missing masters, configuration and capabilities (not in the two earlier files)
| # | Missing | Why an AI step fails without it | Owner · level |
|---|---|---|---|
| M1 | **Official pages of a combination** (apply page, guide, checklist numbers, inside/outside Canada variant, date checked) | A1 runs again and again, or picks the wrong package; A2 reads the wrong guide | Rules propose → person confirms · combination |
| M2 | **Alias table**: our program names ↔ IRCC package names (now hard-coded stop-words, `finder.ts:90`) | Rules miss sure matches, so AI or the person must pick | Team → expert · library |
| M3 | **Dated index snapshot** as a versioned source (rows, packages, fingerprint) | G6 drift; a renamed package silently matches nothing (`finder.ts:295`) | System · library (with N14) |
| M4 | **AI step catalogue**: per step its prompt version, schema, model, effort, input and output caps, attempt budget, golden set, acceptance threshold (R-11's 70 %) | No single place to lint, version or measure a step; G1, G2, G4, G7 recur | Runtime lane · configuration |
| M5 | **Provider capability profile**: supported schema keywords, model and price (price exists, `p2/policy.ts:63-65`) | G1 recurs on every new schema or model | Runtime lane · configuration |
| M6 | **Non-canada.ca sources**: provincial nominee and Quebec sites, as allowed hosts with their own index readers | Provincial and Quebec combinations cannot be found or downloaded at all | Team decides hosts → forms lane |
| M7 | **Golden answers per step and combination** (expected forms, documents, people), Sample until the expert confirms | No way to say whether a prompt change is better or worse | QA lane + expert · test data |

## 5. Best-in-class comparison (general practice only)
Mature document-AI and form-automation products (cloud document-AI services, intelligent document processing suites, legal and immigration form tools) commonly share these traits:
* **Rules first:** templates, known identifiers and lookups classify the document, and the model only extracts or judges.
* **Constrained output:** schema-validated output, with business limits checked after.
* **Confidence per item:** a threshold routes low-confidence items to a review queue, and high-confidence ones flow straight through.
* **Measured on a fixed labelled set,** per field and per document type, with a regression gate before any prompt or model change, and acceptance rates tracked in production.
* **Configuration, not discovery:** "which forms for which case type" is curated reference data, kept current by change monitoring; it is not re-derived on every run.

**Where we match or lead:** quoted evidence checked by rules; a blind second round; cost shown first and capped; replay at US$0; plain errors; a person or second person before anything is published.
**Where we fall short:** A1 is discovery where peers use configuration; there are no scored golden sets (G7); no schema lint (G2); A6 has a single round; and the checklist, the richest source, is not read (A7).

## 6. Top 5 recommendations (ranked)
| # | Recommendation | Lane | Cost |
|---|---|---|---|
| 1 | **Make AI calls safe before they are paid:** schema lint against the provider profile (M5) in the launcher and CI; fix `find-guide` and `who-can-be` schemas, with limits moved to rules; book 4xx refusals at US$0; one attempt budget per step (G1–G4) | runtime | S |
| 2 | **Store each combination's official pages (M1, M2) and remove A1 from runtime.** Rules propose, a person confirms once; the unsure case shows one suggestion plus a search over the index (§2) | forms (data, finder) + screens (the one-line choice) | M |
| 3 | **One "read the checklist and guide" producer:** A3, A4 and A7 merged on the step runner; index rows give identity, edition and download; forms and documents arrive in one queue | forms | M |
| 4 | **Golden set per AI step (M7, G7)**, scored for precision and recall on replay in CI; each P-131 live trial scored against it; a step below its threshold is flagged | qa (cases) + runtime (scoring) | M |
| 5 | **One AI step catalogue (M4)** read by the runner; field maps moved onto it with a checker round (G9); input caps per step (G5); one dated index snapshot (M3, G6) | runtime (+ forms for the snapshot) | M |

## 7. Questions for the founder (one at a time, recommendation first)
1. **Should a combination's application page, guide and checklist be set once at setup and stored, so no AI picks a page at run time?**
   *Recommend:* yes. Rules propose, a person confirms once, and "Suggest with AI" stays an optional click.
2. **Should the finder read the document checklist and return forms and documents together?**
   *Recommend:* yes (recommendation 3). It replaces the stub-only checklist drafting.
3. **Should every AI step need a scored golden set before its live trial?**
   *Recommend:* yes, at 10–20 Sample cases per step, labelled by the Lead and confirmed later by the immigration expert.
