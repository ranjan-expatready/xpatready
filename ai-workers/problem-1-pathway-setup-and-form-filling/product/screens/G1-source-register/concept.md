# G1 Release refused: no source entry (C5.4): concept v2 (2 Nov 2026)

Status: **v2, waiting for the tech lead's approval** (P-223 (4): an independent challenge, then his OK; posted on #544, part 1 on #558). `concept-draft.md` is the drafter's copy as handed over.
- v2 fixes every Blocker and Major in `challenge.md` (B1, M1–M4) and takes the cheap Minors (m2–m8).
- It is built on the design the tech lead agreed on PR #469. **⚑ PR 1** marks the three changes to his agreed table (M2, M3, the reason column); the migration needs his OK on them first. **Rec.** = recommendation.
- Row (BACKLOG): "a release with a number lacking a source entry or 'None published – set by ExpatReady' is refused, naming each item; API and screen tests" (P-240; SA-1B-290, -193). Boards: `design/draft-g1-review-refusal.html`, `design/draft-g1-source-panel.html`.

## 1. Job and journey
**Job:** before a release, the configuration author gives every published number its official source, or states that the government publishes nothing and ExpatReady set it. Until each number has an answer, Submit and release are refused, naming each one.
**Who and where:** the author (author duty) writes, the immigration expert signs, and a second person releases. Journey J5, step "Review and release", Change set pattern.
**Sources:** SA-01B v2.1 SA-1B-290; SA-1B-39 rules 1, 6, 7; SA-1B-193 rule 1; SA-1B-294 rules 1, 4, 6. Decisions P-240 (both gates; Sample is demo only), P-170, P-26, P-33.

## 2. Ten layers
- **Masters:** new `source_entry` (PR 1). Already cited in the app: fee lines in `samples/fee-table.json` (CI enforces page, URL, quote and date: `tests/check_r2_fee_table.ts:31`), and usable document validity rules, which need `source_quote` + `cite {page,url,read}` (`case-checklist.ts:58-64`). Rules and checks hold one quote per item, with no URL or date. `check_def.illustrative` (Sample) is set once, at creation (`studio.ts:758`).
- **Team code:** `code/` is not in this copy (**Unverified**); SA-1B-290 §2 says the team has no source list. Mapping for later (Not built): each distinct `citation_url` → a `ContentSource` (FORM, GUIDE or WEB_PAGE) · `citation_page` → `note` · `citation_quote` → `quote` · `citation_date` → `dateChecked` · `none_published` → the "None published – set by ExpatReady" label · `nextReview` Not built.
- **Links:** (kind, item_key, value_path), no foreign key (items are versioned rows); checked on the draft. **Configuration:** none. **Rules:** BR-1 to BR-11.
- **Engine:** a new pure `engine/source-register.ts`: `publishedNumbers(snapshot, feeLines)` → `{kind, key, address, value, item_words, words}` and `sourceProblems(numbers, entries)`, both **outside `validate()`** (M1).
- **Contract:** `contracts/sources.ts` (zod). **Screen:** Review block, Source panel, RuleDialog section, Checks "Sources" action, "From age" link, Release page held reason.
- **AI assist:** none (SA-1B-291, Not built). **Governance:** frozen in the snapshot, the expert signs changes, audit "source entry added / changed".

## 3. Business rules
- **BR-1 Which numbers (B1).** `publishedNumbers()` walks every condition the snapshot carries: `forms[].condition`, `document_requirements[].condition`, `placements[].condition`, `rules[].when`, `checks[].condition`, `eligibility.gates[].condition`. It also reads `forms[].min_age` (kind `threshold`) and the combination's fee lines.
  - Keys carry the combination, because keys like `R-01` repeat (`import.ts:104`): a form-line condition is kind `rule`, key `<combination>/form:<number>`; a document line is `<combination>/doc:<lineage>`; a gate is `<combination>/gate:<key>`; a rule or check is `<combination>/<key>`.
  - Out: `0` in a comparison ("already passed"), form box limits, UI numbers, versions, positions, copies.
  - Count on the work-permit release: **19 numbers on 17 items**: 18 ×5 (two on the IMM 5707 form line), 90 ×5, 30 ×4, 5 ×4, 1 ×1. Dates add 8 if the founder question is answered yes. The import cites 8 of the 19 (18 ×5 and 5 ×3, where its quote states the number), so **11 remain after Reset**: 90 ×5, 30 ×4, 1 ×1, and the 5 on the "exceptional situation" letter.
- **BR-2 Address by meaning (M3) ⚑ PR 1.** `value_path` holds `<field>|<op>|<k>`, the k-th leaf with that field and operator in the item's condition (e.g. `person.age_years|gte|1`). Other addresses: `min_age`, `months` (validity), and the fee field name. The JSON path is kept only as a hint. Inserting a clause on another field or operator keeps the address; one on the same field and operator before it shifts k, and the shift shows as a number listed again (never lost in silence). Changing `gte` to `gt` lists the number again.
- **BR-3 Cited or None published (the agreed CHECK).** Cited: https URL ("Use an https address."), a quote of at most 300 characters, a date read of today or earlier, an optional page note of at most 200 characters. None published: a reason of at least 10 characters (Decision 3). **⚑ PR 1: `none_published_reason`**. The CHECK (PR 1, review MJ-1 on #569) holds exactly one answer: a citation, None published with its reason, or **Sample** with no source claimed (BR-10); https only, words ≤ 300 and page ≤ 200 characters, nothing blank.
- **BR-4 Records that already cite count; no rows are written for them.**
  - A fee line counts. CI refuses one without a source, so the branch never refuses in the app; its fail test is engine-level only, with fixture lines. The `fee` kind stays unused until R2 S7a (the migration comment says so); "Fees" is not a `where`.
  - A usable validity rule counts through its own `cite` + `source_quote` (m5). None are in the demo data.
- **BR-5 One canonical value (m8):** `String(Number(x))`, or an ISO date, so 13757 and "13757.0" are equal.
- **BR-6 A changed number has no source (Decision 2).** When the value ≠ the entry's value, it is refused: "written for 90; now 60". "Still correct for 60" saves the entry again after a look.
- **BR-7 Where the gate runs (M1).** `sourceProblems()` runs on the **draft only**: beside `filingProblems` in `studio.problems()` (`:379`) and in `programs.ts` `draftProblems` (`:163`), **never in `relProblems`** (`:166`). A released row keeps its catalogue status. Entries are read once per workspace in `buildSnapshots()`, so both pages get the same `sources` and fingerprint. `where` is the item's own place (Forms, Documents, Rules, Checks, Eligibility), so `WHERE_STEP` routes it.
- **BR-8 Refused, naming each.** Submit (`:847`, 400), Approve (`:889`, 409) and `releaseRows` (`:941`, 409) all refuse. The Problem Details `…/no-source` lists every number in `errors[]`; today's messages name only the first problem (`:896`, `:949`).
- **BR-9 Frozen.** `snapshot.sources` is present only when there are entries (the `fact_sources` pattern), so other fingerprints stay as they are. `diff()` lists "Source" lines, and the expert signs them. A change after submit makes the submission stale (`gateOf()`).
- **BR-10 Fit with G3 (Decision 1; the tech lead's condition on #558).** An entry may be marked **Sample** (no source claimed): it passes only in the demo workspace and only as a Demo release; anywhere else it is refused as Sample. A number with no entry is refused everywhere.
  - G1 refuses in every workspace, the demo included. A missing source is not Sample; "None published" is not Sample.
  - `isDemoSnapshot` is unchanged. A check saved without a quote stays Sample after its number gets a source, and the panel says so (m3).
  - **Not built in G1 (m2):** "a Sample value blocks a real release". It stays with G3's deferred part ("refused elsewhere" waits for a second workspace; tech lead 07:26).
- **BR-11 Who and history.** Only the author duty writes, checked on the server; staff only. **⚑ PR 1 (M2): `version`, `updated_by`, `updated_at`**; a PUT with an old `version` gets 409. The product never deletes an entry; one whose address is gone shows "No longer used". **Reset deletes `source_entry`** (`demo.ts:474-489`, m7). An X2b line copy (`lines-bulk.ts`) does not carry its sources (SA-1B-39 rule 6): **Not built**, and the target's Review lists them.

## 4. Layout (EXPERIENCE §3)
- **Review and release** (Change set; board 1): a "Numbers without a source (n)" block grouped by item; each line's **Add source** opens the Source panel in place. Submit stays greyed: "Fix the problems first". A count line reads "Fees from the fee table: n lines, each with its source"; its tooltip shows each line's `quote_kind`, never "Official source".
- **Release page:** "Held back: 11 numbers have no source" · "Fix on Review and release".
- **Source panel** (Side panel, 480–560 px; board 2): one card per number, **Official source** (URL, page, quote, date) or **None published – set by ExpatReady** (reason). The URL can be picked from the combination's approved sources (STANDARDS §3.2); the quote is filled in from the item's own quote. No fee card (m4, P-26).
- **The panel also opens from:** the RuleDialog section "Sources of its numbers"; a "Sources" action on each check row that holds a number; a "Source" link under "From age", whose hint changes from "Sample." to "Needs a source before release." (m3).
- **Words (m6), never field codes:** item = the rule's `then`, the check's message, "Form IMM 5707", or the document's name. Number = the field's short name (`engine/render.ts:164`, QA-82) + the operator in words + the value, e.g. "Age years: at least 18".
- **States:** missing, cited, none published, changed, field errors, read-only, conflict (409, with who and when from M2), empty, loading. The import's entries show "From the sample load". Full width at 400 px.

## 5. Copy
- **Refusal:** "<item>: <value> has no source entry. Add the official source, or mark 'None published – set by ExpatReady'." E.g. "Form IMM 5707: Age years: at least 18 has no source entry. …"
- **409:** "Release refused: 11 numbers have no source entry. Each is listed on Review and release."
- **Changed:** "<item>: the source was written for 90; the number is now 60. Check the source again, or mark 'None published – set by ExpatReady'."
- **Chips:** No source · Official source · None published – set by ExpatReady · Changed since its source · From the sample load.
- **Sample note:** "This check stays Sample: it has no source quote of its own. A number's source does not change that."
- **Field errors:** "Use an https address." · "Copy the words that state the number (up to 300 characters)." · "The date read cannot be in the future." · "Say why ExpatReady set this number (at least 10 characters)."
- **Conflict:** "Someone else saved this source while you had it open (<role>, <time>). Reload theirs, or keep yours and save again." **Read-only:** "Only the configuration author adds sources." **Empty:** "This item has no published numbers."

## 6. Contract and tests
- **Endpoints:**
  - `GET /combinations/:id/sources` → `{numbers:[{kind, key, address, value, item_words, words, where, state: missing|cited|none_published|changed|fee_table|validity_cite, entry?}], counts}` (one query); `GET …/sources/:kind/:key`.
  - `PUT …/sources/:kind/:key {address, value, cited?:{url,page?,quote,date} | none_published?:{reason}, version}` → 200 (version+1) · 400 per field · 403 approver · 404 no such address · 409 old version or the value moved.
- **Engine suite `check_g1_source_register.ts`** (pass + fail per business rule): the IMM 5707 form line's 18 is listed and `lt 0` is not; an inserted clause keeps the address and `gte`→`gt` lists it again; "13757.0" is not stale; a fixture fee line without a source is refused.
- **API suite `check_g1_sources_api.ts`:** all three routes refuse and a fully sourced draft releases; of two PUTs with the same version, the second gets 409; the released row keeps its catalogue status while its draft lists 11; with no entries the fingerprint is unchanged, and one entry adds one Source change.
- **Browser `check_g1_source_register_browser.cjs`** on With an LMIA, axe and keyboard at 1440, 1024 and 400 px: edit a rule → Submit refused, 11 listed, the 18s showing "From the sample load" → cite the letter's 5 and the 1 year from guide 5487's words → None published on each 90 and 30 → change 90 to 60, refused again → all sourced → sign → release.
- **Scale:** the walk over 406 checks and 39 rules adds ≤ 50 ms to `/review`; no N+1.
- **Scaffolding (M4):** `importConfiguration()` writes its entries **before** Release 1's snapshot: cited only where the quote states the number in digits, with the manifest's URL and download date (19 Oct 2026), `created_by` = the sample loader. After Reset, no row shows "changed since Release 1". One test helper, `sourceEveryNumber(api, id, {cite|none})`, works through the API, never SQL; the build plan names every suite that submits a draft holding numbers.
- **PRs:** PR 1 the table · **PR 2a** engine, API, helper and suite updates · **PR 2b** the screens.

## 6b. Capability or scaffolding (P-33) · Needed or Not built (P-26)
- **Capability, Needed:** the table (with the ⚑ columns) · the walk over every condition · `sourceProblems()` on the draft · the three refusals and the 409 list · the Review block with Fix · the Source panel (cited, none published, changed, conflict) · the RuleDialog section · the Checks action · "From age" · the fee and validity adapters and the fee count line · `snapshot.sources` and the expert's sign-off · the Release page held reason · Reset clearing entries.
- **Capability, Not built:** the register screen · next review and "overdue" · per-number expert Confirm (SA-1B-294) · AI filling the source · staff source markers · a check editor · the fee card · X2b copies carrying sources · "a Sample value blocks a real release" (G3's deferred part).
- **Scaffolding, Needed:** the import's entries · the test helper.

## 7. Decisions and question
**Decisions for the tech lead** (the challenger's answers; I recommend all three):
1. **Refuse in every workspace.** Under P-240 only Sample content goes through as a Demo release, and a missing source is not Sample.
2. **A changed number is refused** (SA-1B-294 rule 4: an edit clears the confirmation).
3. **A reason is required for None published** ⚑ PR 1. The grounds are SA-1B-294 rule 6 and D18, not P-252 (a held proposal).

**Founder question.** Do cut-off and in-force dates in conditions count as published numbers? **Rec.: yes.** SA-1B-294 lists in-force dates (rule 1) and cut-off dates (its outcome). The release holds 8: "passport issued before 7 June 2019" ×6 and "applications from 1 November 2024" ×2. If no, a rule needs a source for its 5 years but not for the 7 June 2019 beside it. The tech lead may settle this alone if he reads P-240 the same way.

## Definition of ready
Acceptance tests named (`check_g1_source_register_browser.cjs` plus the engine and API suites) · row text as BACKLOG G1 · the tech lead's OK on the three ⚑ PR 1 changes and Decisions 1–3 · the founder question answered · the Lead response written in `challenge.md` · boards clicked through, or the tech lead approves after the challenge (P-223 (4)).
