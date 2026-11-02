# G1 Release refused: no source entry (C5.4): challenge

A fresh challenger checked `concept-draft.md` and the two boards in `design/` on 2 Nov 2026. I did not draft them.

**What I read:**
* The tech lead's agreed design on PR #469 (07:26 and 07:34 UTC comments).
* DECISIONS P-240, P-251, P-252, P-170, P-228, P-26 and P-33 (`decisions/P-01-P-36-foundation.md`).
* `PRODUCT.md`, `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`, BACKLOG G1 and R2, and CAPABILITIES C5.4 and C5.6.
* SA-01B v2.1 in the name-free copy `domain/requirements-2026-11-02/`: SA-1B-290, -39, -193 and -294.
* The app at this copy's HEAD. Its `engine/` and `api/src/studio.ts` match origin/main for everything cited here, and G3 (#471) is merged.
  * `engine/validate.ts`, `engine/snapshot.ts`, `engine/eligibility-gates.ts`, `engine/runtime/case-checklist.ts`, `engine/import.ts` and `engine/setup-checklist.ts`.
  * `api/src/studio.ts`: problems() at :379, submit at :847, approve at :889, releaseRows at :941, publishRow and saveCheck.
  * `api/src/programs.ts` (the catalogue and setup checklist), `api/src/demo.ts` (Reset and the import) and `api/src/lines-bulk.ts`.
  * `web/src/pages/configuration.tsx` (RuleDialog and Checks), `web/src/pages/workspace/forms.tsx` ("From age") and `prisma/schema.prisma`.
  * `samples/fee-table.json`, and the imported release `prototype/p3/releases/c1-v3/configuration.json`. I counted every number in it with a script.

**Not checked:**
* `code/` and `sources/` are not in this cloud copy. `ai-workers/tools/freshness.sh` fails because `code/README-copies.md` is missing. Everything said here about the team's code is **Unverified**.
* I did not start the app or a database. I read the boards as text and did not render them.
* Any count of affected test suites below comes from grep and is an estimate.

## Verdict

**Build after these changes.** The job, the refusal on all three routes, the frozen copy in the snapshot and the scaffolding split are sound. One Blocker and four Majors need fixing first.
* The walk misses the conditions that actually decide what a client files.
* The gate's place in the catalogue would re-judge past releases.
* The agreed table can't refuse a concurrent save.
* A number's address breaks on any edit to a condition.
* The test and Reset plumbing would turn CI red.

## Objections

### Blocker

**B1 · The walk leaves out the numbers that decide filings: form-line and document-line conditions.** *Needed for the proof.*
* **Fact (confidence high; my script over `c1-v3/configuration.json`):**
  * The concept walks `predicate` (rules) and `check_def` (checks). It finds 15 numbers: 18×3, 5×1, 90×5, 30×4, 1×1 and 5×1.
  * The same release also holds:
    * **18 ×2 in the IMM 5707 form line's own condition**: `or[gte person.age_years 18, and[lt … 18, travelling_alone]]`.
    * **5 years ×2 in two Venezuelan-passport document lines**: `passport_years_since_expiry gte 5`, and `lt 5`.
  * At runtime the form line's condition decides whether IMM 5707 applies to a person. `engine/render.ts:257` evaluates `f.condition` per person. Rules only render as plain effects (`render.ts:292`).
  * PRODUCT.md §4 calls "Ask when…" and "Required when…" a **Rule**.
  * SA-1B-39 rule 1 lists "document requirements" and "form editions" among the items that carry a source.
* **What breaks:** the row says a release with an unsourced number "is refused, naming each item". With the walk as drafted, the author cites the 18 of the advisory rule "Add form IMM 5707", while the 18 that decides who files IMM 5707 releases with no source. The demo would prove the gate on the wrong copy of the number.
* **Example:** With an LMIA. The author sources all 15 numbers listed and releases. The IMM 5707 line's two 18s and the Venezuelan lines' 5s go out unsourced.
* **Fix:**
  * `publishedNumbers()` walks every condition the snapshot carries:
    * `forms[].condition` and `forms[].min_age`;
    * `document_requirements[].condition`;
    * `placements[].condition` (none in the sample today);
    * `rules[].when` and `checks[].condition`;
    * `eligibility.gates[].condition`.
  * Use the agreed kinds:
    * a form-line or document-line condition is kind `rule`, with item_key `<combination>/form:<form number>` or `<combination>/doc:<lineage>`;
    * "From age" is `threshold`.
  * On the full c1-v3 release this gives **19 numbers on 17 items**. Update the counts on board 1, in the journey and in BR-1.
  * X2b's copy of a line (`lines-bulk.ts`, forms and documents) then arrives on the target without its sources. SA-1B-39 rule 6 says copies keep them. Label this **Not built**: the target's Review lists them, and that is enough for the proof.

### Major

**M1 · Where the gate runs: the catalogue judges the released snapshot, so a gate inside `validate()` re-judges past releases.** *Needed for the proof.*
* **Fact (high):**
  * `api/src/programs.ts:167-170` runs `validate()` twice, on the draft (`draftProblems`) and on the **released** snapshot (`relProblems`).
  * `relProblems` feeds `missingItems`, `statusOf` and the setup checklist's `release.problems` (`:181-182`, `:210`).
  * C11.12 keeps filing modes out of `relProblems` on purpose: "a released snapshot is never re-judged … (pinned releases are kept, BR-7)" (`:166`).
  * The concept says "`validate()` takes the entries as an argument" and names only `studio.ts` routes. It does not mention `programs.ts` or `buildSnapshots`.
* **What breaks, either way:**
  * **Inside `validate()`:** every imported Release 1 holds 15 or more unsourced numbers, and the snapshot carries no `sources`. Every work-permit row in the catalogue then flips from live to "needs work" on content firms already use.
  * **Only in `studio.problems()`:** the catalogue and the setup checklist say "ready to submit" while Submit refuses. That gives two answers to one status (EXPERIENCE §2.5).
  * **Either way:** if `buildSnapshots()` (the catalogue path) does not read the entries, the catalogue's fingerprint differs from the combination page's as soon as one entry exists. "Changes since release" then disagrees between the two pages.
  * `validate()` has 13 test callers (`validate(x, lib, [])`). Making entries a required argument edits all of them. Making it optional with no entries meaning "none" turns their snapshots with numbers red.
* **Fix:**
  * Keep the gate out of `validate()`.
  * Write `sourceProblems(numbers, entries)` as its own pure function. Compose it beside `filingProblems` in `studio.problems()` and in `programs.ts` `draftProblems`, never in `relProblems`.
  * Read the entries once per workspace inside `buildSnapshots()` (one query), so both pages attach the same `sources`.
  * Tests:
    * pass: a released row with unsourced numbers keeps its catalogue status;
    * fail: its draft lists the numbers and the setup checklist routes them.

**M2 · The agreed table can't refuse a concurrent save or record who changed an entry, and the concept's conflict state needs both.** *Needed for the proof.*
* **Fact (high):**
  * The agreed columns end at `created_by` and `created_at`, with one row per (workspace, kind, item_key, value_path). So a PUT overwrites in place.
  * The concept's PUT takes `baseRevision` and returns "409 … someone else saved". Board 2's conflict state says "saved by Author C at 10:42".
  * No column holds a revision, a last editor or a last-change time.
  * Every other versioned table has `version`, `updatedBy` and `updatedAt`, for example `check_def`, `schema.prisma:955-960`.
  * STANDARDS §4 [M]: "Optimistic concurrency (version column; stale save → 409)". QUALITY D2: "concurrent saves refused by the server".
* **What breaks:** a second author's save silently replaces the first. "Saved by Author C" can't be shown. The audit line "source entry changed" has no who on the row itself.
* **Fix:**
  * In PR 1, add `version int not null default 1`, `updated_by` and `updated_at` to the migration. `baseRevision` is `version`.
  * If the tech lead keeps the reason (m1), it goes into the same migration, and the CHECK becomes: citation (url, quote and date not null; url `https://…`) XOR (`none_published` with a reason).
  * Tests:
    * fail: two PUTs with the same version, and the second gets 409;
    * pass: a PUT with the current version gives 200 with version+1.

**M3 · A positional `value_path` (`predicate_json.args[1].value`) breaks on any edit to the condition.** *Needed for the proof.*
* **Fact (high for the shape, medium for how often):**
  * Rules are edited in `RuleDialog` through `ConditionBuilder` (`configuration.tsx:121-133`), which saves the whole tree again. IMM 5707's 18s sit at `args[0].value` and `args[1].args[0].value`.
  * Adding a clause in front of them, or wrapping the tree in `and`, moves both paths. Under BR-10 both entries become "No longer used", and both numbers are listed again as "No source".
  * Where a different number lands on an old path with the same value, the old entry silently attaches to it. BR-5's value comparison can't see this.
* **What breaks:** after an unrelated edit to a rule, the author loses the sources of every number in it, and the expert re-signs them.
* **Fix (it fits the agreed `value_path text` column):**
  * Store a semantic address: `<field>|<op>|<k>`, the k-th leaf with that field and operator in the item's condition. For a validity rule use `months`; for "From age" use `min_age`.
  * Keep the JSON path only as a display or debug hint.
  * Test: insert a clause before IMM 5707's first 18, and its entry is still found (pass). Change `gte` to `gt`, and the number is listed as having no source (fail).
  * This must be decided before PR 1's data is written, because a later change means migrating the stored paths.

**M4 · CI blast radius and the order of the import scaffolding.** *Needed for the proof.*
* **Fact:**
  * Medium confidence (grep): 74 files in `tests/` call submit, approve or release, and about 50 of them name the work-permit combinations. Every suite that submits a draft holding a number goes red when G1 lands. The concept covers this in one line.
  * High confidence: the import writes Release 1 straight from `buildSnapshot(…, "published")` inside `demo.ts` `setUp` (`:141-147`), right after `importConfiguration()`.
  * If the scaffolding writes its cited entries after that snapshot, the draft gains `sources` and Release 1 lacks them. Every imported row then shows "changed since Release 1" straight after Reset, which breaks every "no changes" assertion.
* **Fix:**
  * Write the scaffolding entries inside `importConfiguration()`, before the snapshot. Release 1 then freezes them.
  * Add one shared test helper (`tests/` only), for example `sourceEveryNumber(api, combinationId, {cite | none})`. It reads `GET /combinations/:id/sources` and PUTs each entry through the API (never SQL). The affected suites call it before they submit.
  * Name the suites in the build plan.
  * Split PR 2 into:
    * 2a: engine, API, helper and the suite updates;
    * 2b: the screens.

### Minor

**m1 · The three drafted questions don't need the founder.** *Needed for the proof (they set the design).*
* **Q1 (does the demo workspace refuse too?):** P-240 already answers it. A number publishes only with a source entry or "None published". Only *Sample* content is let through as a Demo release. A missing source is not Sample. The concept's answer, refuse everywhere, is P-240's own text.
* **Q2 (a number changed after its source):** SA-1B-294 rule 4 sets the pattern: "Editing a confirmed number clears its Confirmed mark". So refuse it, as the concept recommends.
* **Q3 (a reason for "None published"):**
  * The premise is wrong. P-252 is a **proposal held under P-251**, and its step 3 governs the guarded Add of library items, not number sources.
  * No adopted rule requires a reason: P-240, SA-1B-39 rule 2 and SA-1B-294 rule 6 don't.
  * The tech lead decides. If kept, justify it by SA-1B-294 rule 6 ("records that ExpatReady set it") and D18 (provenance). It must never be presented as P-252.
  * My judgement (medium): keep it required. It costs one column in M2's migration, and it makes the expert's sign-off of nine "None published" values meaningful.

**m2 · "A Sample value blocks a real release" was in both of the tech lead's G1 notes (07:26, 07:34). The concept drops it without a word.** *Not built.*
* It belongs to C5.6 (G3), where "refused elsewhere" waits for a second workspace (tech lead, 07:26). The POC has one workspace, and `Workspace` has no demo flag (`schema.prisma:102`).
* **Fix:** one line in the concept: Not built in G1; it stays with G3's deferred part. Never deviate silently.

**m3 · How G1 and G3 interact, for a user.** *Needed for the proof (copy only).*
* `check_def.illustrative` is set once, at creation (`studio.ts:758`, `illustrative: !quote`), and never worked out again. A check saved without a quote stays Sample, and its release stays a Demo release, after the author gives its number an Official source. The concept's BR-8 is right: the check's logic is still unsourced.
* The panel should say so: "This check stays Sample: its rule has no source quote. A number's source does not change that."
* "From age" carries the hint "Leave empty for any age. Sample." (`forms.tsx:334`). Once G1 gives it a source, that hint is wrong. Change it.

**m4 · The fee branch can never refuse in this app, and its card has no way in.** *Needed: the count only. Not built: the fee card.*
* **Facts:**
  * CI refuses a fee line with no source (`check_r2_fee_table`).
  * Fees are not in the release snapshot until R2 S7a.
  * Only `vv.single` uses fee lines.
* **Consequences:**
  * The fail test exists only at engine level, with fixture fee lines passed to `publishedNumbers()`. Say so.
  * A fee is never listed as missing, so the Source panel's fee card on board 2 has no path that opens it. Drop it (P-26). Keep the line "Fees from the fee table: n lines, each with its source" on Review and on Release.
  * Board 2 cites "maximum fee for a family of 5 or more…" as the source of **CAD 100**, but that quote does not state 100. The biometrics line's `quote_kind` is "summary of the Lead-checked record".
* **Fix:**
  * Show `quote_kind` in that count's tooltip, never as "Official source" words.
  * Drop "Fees" as a `where` (it is not in `WHERE_STEP`).
  * Say in the migration comment that the agreed `fee` kind is unused until S7a.

**m5 · Fact correction: a document validity check does carry a quote.** *Needed for the proof.*
* `validityProblems()` (`case-checklist.ts:58-64`) requires the check's `source_quote` plus `cite {page, url, read}`. Without them the rule is "not used".
* So a usable validity rule is a second record of its months, as a fee line is.
* **Fix:** count a usable validity rule's own cite as its source (the same reasoning as BR-4), or prefill from it and accept two records. Pick one and say it. No validity check is in the demo data today, so the impact is small.

**m6 · The board's words have no producer.** *Needed for the proof.*
* The board shows phrases such as "passport expires within 90 days" and "under 18 and travelling alone". No function produces them.
* `conditionWords()` (`eligibility-gates.ts:167`) prints field codes (`person.age_years ≥ 18`), which PRODUCT §4 forbids on the main path. A derived field's `plain` text is a whole sentence.
* **Fix:**
  * Item words come from the rule's `then`, the check's message, or the form number and document name.
  * The number's qualifier is the field's short name (as in QA-82) plus the operator in words plus the value, for example "Age in whole years: at least 18".
  * Redraw the board with what the engine can produce.

**m7 · Reset and labelling.** *Needed for the proof.*
* Reset deletes table by table (`demo.ts:474-489`), and `source_entry` has no foreign key. Without a line there, entries survive a Reset and attach again to the re-imported keys. The second demo run then shows no gate, and suites depend on the order they run in.
* The entries the import writes are scaffolding (P-33). Give them `created_by` = the sample loader, shown as "From the sample load", never as a person's sourcing.

**m8 · `value` as text needs one canonical form.** *Needed for the proof.*
* Define it as `String(Number(x))` for numbers, or the ISO date if Q1 below goes "in". Otherwise 13757 and "13757.0" read as stale.

**m9 · Retrofit mapping is partial.** *Not built.*
* SA-1B-39 §7 stores `source {sourceId → ContentSource, note, quote, dateChecked, nextReview}` on the item, with the register as a shared list (SA-1B-290). G1 stores a URL per number.
* Write the mapping line in the concept:

  | G1 | Team (SA-1B-39, SA-1B-290) |
  |---|---|
  | each distinct `citation_url` | a `ContentSource` (`kind` `FORM`, `GUIDE` or `WEB_PAGE`) |
  | `citation_page` | `note` |
  | `citation_quote` | `quote` |
  | `citation_date` | `dateChecked` |
  | `none_published` | the label "None published – set by ExpatReady" |
  | (none) | `nextReview`, Not built |

* The team's code is Unverified here.

## What is sound

* **Job, persona and duties:** the author writes, the expert signs and a second person releases. The author duty is checked on the server, and the content is staff only (SA-1B-39 rule 5).
* **Refusal on all three routes:**
  * Submit, approve and `releaseRows` each run `problems()` today (`:853`, `:895`, `:948`). Covering all three closes the shared Release page path.
  * Replacing "first problem only" with a 409 listing every number is right.
* **Frozen with the release (BR-7):**
  * It follows the `fact_sources` pattern: present only when there are entries, so other fingerprints stay as they are.
  * `publishRow`'s rebuild at release (`:1018`) reads the same live entries, so the two hashes still agree.
  * An entry changed after submit makes the submission stale through the existing `gateOf()` (`:59`).
* **`item_key` carries the combination.** The import numbers rules by position after a role and form filter (`import.ts:104`), so `R-01` names different rules in different combinations.
* **Refuse everywhere; "None published" is not Sample; `isDemoSnapshot` unchanged.** This matches P-240 and keeps G3's mark honest.
* **Stale counts as no source**, with "Still correct for 60" after a look.
* **Leaving out `0`** in comparisons ("already passed").
* **Scope edges the drafter asked about:**
  * "From age" belongs in G1. The agreed `threshold` kind exists for exactly such a field, and the tech lead's definition names "age thresholds" and "threshold fields".
  * Eligibility gates belong too. They are released rules and the natural home of money thresholds. None are in the sample, and no gate editor exists, so the Review list is their only entry point. That is enough.
* **Numbers verified:** 15 numbers on 14 items in rules and checks, by my count. The 90s and 30s are ExpatReady's warning lead times (`RW_*` checks), so "None published" is the honest answer. The scaffolding rule "cite only where the quote states the number in digits" leaves "one year" (OR_COMMON_LAW) for the author to cite, which shows the capability's own path.
* **Labels:** capability or scaffolding and Needed or Not built are labelled throughout. There is no AI and no live run. Next review and "overdue" are named Not built.

## Back-end plan (element → record → API → rule → test)

| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| Source entry | `source_entry` (PR 1): the agreed columns + `version`, `updated_by`, `updated_at` (M2) [+ `none_published_reason` if kept, m1]; CHECK citation XOR none_published; `citation_url` https; unique (workspace, kind, item_key, value_path); added to Reset (m7) | — | BR-2, BR-3 | SQL insert with both or neither refused / one of them accepted |
| Published numbers | none (derived) | — | B1: every condition + `min_age` + gates + fee lines; skip `0` in comparisons; semantic `value_path` (M3); canonical `value` (m8) | engine `check_g1_source_register.ts`: IMM 5707 form line's 18 listed / `lt 0` not listed; address survives an inserted clause / `gte`→`gt` re-lists |
| Problems | none | via `problems()` | `sourceProblems()` beside `filingProblems`, in `studio.problems()` and `programs.ts` draftProblems, never relProblems (M1) | the released row keeps its catalogue status / its draft lists 19 and routes them by `WHERE_STEP` |
| Snapshot | `snapshot.sources` (only when there are entries); entries read once in `buildSnapshots()` | `/combinations/:id`, catalogue | BR-7; `diff()` covers `sources` → "Source" lines, needs_sme | no entries → fingerprint unchanged / an entry added → one Source change, expert signs |
| Refusal | — | submit 400, approve and `releaseRows` 409 Problem Details `…/no-source`, `errors[]` | BR-6 | API `check_g1_sources_api.ts` on all three routes / all sourced → release |
| Read and write | `source_entry` | `GET /combinations/:id/sources`, `GET …/:kind/:key`, `PUT …/:kind/:key` {path, value, cited \| none_published, version} | BR-3, BR-5, BR-9, BR-10; audit added/changed | 200 / 400 per field, 403 approver, 404 path, 409 version or value moved |
| Scaffolding | entries written inside `importConfiguration()` before Release 1, `created_by` sample loader (M4, m7) | — | P-33 | after Reset: no "changed since Release 1" / 18 and 5 cited, 90, 30 and one year listed |
| Suites | test helper `sourceEveryNumber()` via the API (M4) | — | — | the named suites green on PR 2a |
| Screens (PR 2b) | — | the above | Review block, Source panel, RuleDialog section, Checks "Sources" action, "From age" link, Release held reason; words per m6; no fee card (m4) | browser `check_g1_source_register_browser.cjs` + axe at 1440, 1024 and 400 px |

## Questions for the founder (at most 3, recommendation first)

1. **Do cut-off and in-force dates in conditions count as "published numbers"?**
   * **Recommendation: yes.** P-240 adopted SA-1B-39 rule 7, which points at SA-1B-294's kinds. SA-1B-294 lists "in-force dates" in rule 1 and "cut-off date" in its outcome.
   * The work-permit release holds 8 such dates in rules, checks and document lines:
     * "passport issued before 7 June 2019" ×6;
     * "applications from 1 November 2024" ×2.
   * The tech lead's definition (fees, money and age thresholds, durations, counts) leaves them out, and the concept is silent.
   * Alternative: leave them out. A rule then needs a source for its 5 years but not for the 7 June 2019 beside it.
   * The tech lead may settle this alone if they read P-240 the same way.

## Lead response

## Agreement

## Build discoveries
