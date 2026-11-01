# F2 C2.12 slice 1 — forms on To review items, `?form=` · independent reviewer · 31 Oct 2026

Commit reviewed: **`9f2132bd`** on `claude/forms-c212-hfb2om` (based on `origin/main` 4fb3d59a). I did not build it. This is a backend slice with no screen change. I read it against plan D2, §6, §7 and §9 slice 5, BR-5, P-102 and the [M] lines of `STANDARDS.md`. Ports used: 4450–4453 only. Cost: US$0 (replay, stub and SQL test input, no `*_LIVE` variable set).

## Verdict: **Ship after fixes** (0 Blocker, 1 Major, 5 Minor). For the PR: **Block** until Major 1 is fixed (end of file)
The code is correct for every kind I checked. Nothing else in the items changed. The extra reads are batched. The one Major is proof: 9 of the 12 per-kind rules can be removed and the new suite stays green.

## What I checked, and the result
| Check | Result |
|---|---|
| **Golden comparison, main vs this commit, same database** | I started from `check_screen02_fix` (61/61 on this commit), but it closes every item and leaves the queue empty. So I wrote my own fill (reset, load, then product routes plus SQL test input). It leaves **all 9 kinds open**: ai_proposals 2, proposals 2 (one by form edition, one by combination), release 1, merge 1, form_fields 1, held_file 2 (one unreadable, one off the list), new_edition 2, library_change 43 (a batch, ADDs, one RETURNED, library_form, form_accepts, placement_fills, combination), running 1. I ran main (`git archive origin/main`, `isolated.sh rvgold 4451 restart`) and this commit (:4450) on that database. That is 4 people (A, B, C, O) × 17 queries (each filter, each kind, `q=`, a bad filter, an extra key) = **136 responses and 526 items. With `forms` removed, there are 0 differences** in items, order, counts, kinds and status codes. My first pass showed 22 differences. They came from the job runner finishing my inserted STUB jobs between the two snapshots, not from the code: a re-run of branch, main, branch gave 0 and 0. |
| Forms per kind, against the database | ai_proposals: [IMM 5257] from the file read, and [IMM 5707] on an IMM 5707 file, even though Super visa's lines hold only IMM 5257 ✓. proposals: [IMM 5707] by edition; by combination it falls back to Super visa's lines [IMM 5257] ✓. release: the combination's lines ✓. merge: [IMM 5476], the only form whose map reads either `representative.supervising_lawyer_*` key ✓. library_form [IMM 0100] ✓ · form_accepts [IMM 1295] ✓. combination: "With an LMIA" retire → its 8 non-retired lines ✓; a combination with no lines → [] ✓. held unreadable: [] ✓. held off the list: [IMM 5476] ✓. new_edition: [IMM 5476] and [IMM 5257] ✓. form_fields: [IMM 5409] ✓. running: [IMM 1295, IMM 5476] and [IMM 5257, IMM 5707] from its jobs' files ✓. change batch: [] (its two keys are in no field map) ✓. placement_fills: [] (see Minor 1). |
| `?form=` | `IMM 5409`, `imm5409` and `%20imm%20%205409%20` all give the same 2 items, with counts {needs 1, waiting 1, all 2} and kinds {form_fields 1, library_change 1}. `imm 5257 sch 1` = `IMM5257SCH1`. `IMM 1295` with nothing waiting → empty list, zero counts. `<script>`, Cyrillic text and `';--` → 200 with an empty list. Empty, a space or 41 characters → 400 Problem Details with `errors[{field:"form"}]`. Client A and the case officer get 403. With `kind=` added, `kinds` still counts every kind of the form's set (the existing behaviour, as BR-5 asks). |
| Performance | One `combinationForm.findMany` and one conditional `formFieldMap.findMany` per request. Running jobs' files go into the existing attachments query. Nothing runs per item. Average of 10 calls on the 54-item database: main 41–43 ms, this commit 46–50 ms. |
| New suite `check_forms_c212_queue_forms` | 10/10 (:4452) |
| Mutations (on a /tmp `git archive` of 9f2132bd, fresh copy on :4453 for each) | **8 caught, 9 missed.** Caught: ai_proposals → [], library_form/form_accepts → [], unreadable held file given a form, the `?form=` filter removed, the number not normalised, kinds from the unfiltered list, counts.all from the unfiltered list, `max(40)` removed. **Missed:** release → [], merge → [], running → [], proposals by edition → combination lines, new_edition → [], field change → [], combination change → [], form_fields → [], change batch → []. |
| Neighbouring suites (fresh copies, 4450–4453) | screen02_fix 61/61 · screen02_slice2 53/53 · s6_p149 73/73 (`tsx --tsconfig api/tsconfig.json`) · w1_structure 81/81 · w1_structure_r3 41/41 · who_fills 26/26 · forms_qa53 20/20 · forms_proposal_contract 22/22 · screen02_slice1 (browser, axe) 63/63 · s6_queue_browser 28/28. I restored the evidence files the suites rewrote (`git checkout --`). I did not run `forms_s4_finder` or `s4_runs`: both need `STUDIO_AI_LIVE`, which I am not allowed to set. |
| Graph (P-86) | G1 0 · G2 0 · G3 2 (`POST /combinations/:id/attachments`, `GET /attachments/:id/file`; both were there before this commit) · G4–G6 0. C2.12 is named by 1 test. |

## Issues, ranked
**Major 1 (Must): 9 of the 12 per-kind rules have no failing test.** Repro: the 9 "missed" mutations above, for example `forms: formsOfCombination(s.combinationId)` → `forms: []` at `api/src/review-queue.ts:125`; `check_forms_c212_queue_forms` still prints 10/10. The suite makes only ai_proposals, one library_form change and one unreadable held file (`tests/check_forms_c212_queue_forms.ts:39-48`). Plan §7 names a check that is not there: "a two-form combination's release listed under both; a third form's filter excludes it". WAY-OF-WORKING says "Every business rule has a passing and a failing test", and STANDARDS §5 [M] says "A rule's test fails when the rule is removed". **Fix:** in the same suite, add a pass and a fail for release (a two-form combination: listed under both forms, not under a third), merge and field change (a key read by one form, a key read by none), combination change, proposals (edition first, then the combination's lines), held file with a code, new_edition, form_fields, running and the change batch. "With an LMIA" (8 lines) and the fill steps above make each of these with routes that already exist.

**Minor 1 (Should): a "who fills it" change (placement_fills) belongs to no form.** Repro: `POST /library/fields/case.service_language/fills {to: CASE_OFFICER}`. Its item has `forms: []`, yet the IMM 1295 and IMM 5257 field maps read `case.service_language`, so it is missing under `?form=IMM 5257`. `formsOfChange` (`review-queue.ts:80`) only maps `kind === "field"`. D2 lists fields (their forms) and sections and document types ([]). placement_fills came later (C4.9) and the commit does not say why it gets []. **Fix:** give it `formsOfFields([c.key])`, or record the choice in the contract comment and the PR.

**Minor 2 (Should): a form taken off a released combination still counts as one of its forms.** Repro: on "With an LMIA", `DELETE /combinations/:id/forms/IMM 5409`. That writes v2 RETIRED and keeps v1 PUBLISHED. The combination's retire change still lists IMM 5409, while IMM 5802, removed before any release (v1 RETIRED), is left out. So the answer depends on history. Cause: `status: { not: "RETIRED" }` plus `distinct` over all versions (`review-queue.ts:72`), not the newest version per line. The `formFieldMap` read at :76 also counts retired and superseded mappings. **Fix:** take the newest version per (combination, line) and per (edition, path), as `effective()` does, or state that a removed form stays listed on purpose.

**Minor 3 (Should): the AI and running forms are parsed from a display label.** `codeOf` (`review-queue.ts:70`) splits `source_attachment.edition` at " (". Today's data already has labels that do not parse to the form's number: "IMM 5881 E (05-2026), New Delhi visa additional document checklist (edition read from the file)" gives `IMM 5881 E` (the library key is `IMM 5881`), and "Guide 5487 page" stays as it is. Field-map batches only take Form attachments today, so nothing shows this yet. D2 says the path is attachment → edition → form. **Fix:** look up `form_edition.editionLabel` (or `sha256`) → `form.formKey` in the same batched read, and keep the label parse only as a fallback.

**Minor 4 (Should): the `form` errors are zod's default English.** Repro: `?form=` gives "Too small: expected string to have >=1 characters", and 41 characters give "Too big: …". The check at `tests/check_forms_c212_queue_forms.ts:65` is named "refused in words" but only tests the status. **Fix:** a message such as "A form number looks like IMM 5257 (40 characters at most)" (see `contracts/form-library.ts:11`), and assert it.

**Minor 5 (Should): a change from plan §9 slice 5 is not recorded.** The slice ships `forms` without the `engine/queue.ts` move (the Lead deferred the move, 26 Oct). The D2 (m1) golden test, "on the loaded demo and the F2 setup", was run by hand on 3 items and is not in the suite. This review's 9-kind comparison stands in for it this time. **Fix:** record both in the PR and build notes, and add the golden test when the move happens.

## D1–D20 (backend slice; screens unchanged, so the UI dimensions rest on the green browser suites)
D1 4 (D2 met; placement_fills not decided) · D2 4 (read only, normalised codes; Minor 2) · D3 n/a · D4 n/a · D5 5 (stable across reloads and actors) · D6 n/a · D7 4 (an AI item names the file's form; nothing is guessed for an unreadable file) · D8 n/a · D9 4 (`next` unchanged, golden) · D10 3 (Minor 4) · D11 n/a · D12 n/a (unchanged, slice1 screenshots) · D13 n/a (axe passes in slice1 and s6_queue) · D14 n/a · D15 5 (+5 ms, batched) · D16 2 (Major 1) · D17 simulated only · D18 4 · D19 n/a (the rail is a later slice) · D20 simulated only.

## Could not check
The two live-AI suites (they need `STUDIO_AI_LIVE`). A real AI batch with mixed attachments: I used inserted rows. An intended user walk: there is no screen for `?form=` yet (F3b).

Journey test: `journey-test-reviewer-2026-10-31-c212-9f2132bd.md`. **Score 8.5/10 (pass).**

**Verdict: Block.** To fix: Major 1 (a failing test for each per-kind rule, including release under two forms). Minors 1–5 are Should items.

# Round at 531ff8da
Commit reviewed: **`531ff8da`** (fixes 51e0c0db and 531ff8da on 9f2132bd; base `origin/main` 4fb3d59a). I did not build it. Code changes: `api/src/review-queue.ts` (edition lookup, `effective()` for lines and field maps, `FIELD_KINDS`) and `contracts/review-queue.ts` (the 400 words). Tests: `fill_queue_kinds.ts` (helper) and `check_forms_c212_queue_forms.ts` (40 checks). I ran everything on /tmp `git archive` copies, on ports 4450–4453. Every database was dropped afterwards. No `*_LIVE` variable was set. Cost: US$0.

## Verdict: **Ship after fixes** (0 Blocker, 2 Major, 1 Minor). For the PR: **Block**
m1, m2 and m4 are closed, live and by mutation. The previous Major is mostly closed: 21 of 24 mutations are caught. The m3 fix brings a new problem. It matches a file to its form by the file's label, but the product links a file to its edition by checksum. So the demo's own IMM 5475 file now has no form.

## Checks
| Check | Result |
|---|---|
| New suite | 40/40 (:4450, 97 s) |
| Mutations, one copy per run on :4452 and :4453, each with a fresh database | **21 caught, 3 missed.** Caught: all 17 from the last round, plus each fix removed: m1 (`FIELD_KINDS` = field only), m2 lines (any version), m3 (label parse back), m4 (zod words back). **Missed:** (a) proposals by combination → `[]`; (b) a held file with a code (off the list) → `[]` (`review-queue.ts:191`); (c) m2 for field maps (`effective()` removed at :87). |
| m1, live | The `case.service_language` "who fills it" change → [IMM 1295, IMM 5257] ✓ |
| m2, live | The suite removes a released line and the combination change drops it ✓. Field maps: I added a v2 DRAFT of the IMM 1295 mapping with no key, and the item became [IMM 5257] ✓. No test covers this (missed c). |
| m3, live | IMM 5881 E → IMM 5881 ✓, but only on the suite's own inserted edition. See Major 1. |
| m4, live | Empty or blank → "Give a form number, such as IMM 5257."; 41 characters → "A form number has at most 40 characters."; both with `errors[{field:"form"}]` ✓ |
| Golden comparison, main vs 531ff8da | One `fillAllKinds` database, all 9 kinds, 54 items. Run order: branch, main (`isolated.sh rvgold 4451 restart`), branch. 4 people × 17 queries = 136 responses. **0 differences with `forms` removed** once the job runner had finished the inserted STUB jobs: 508 items. Before that, every difference was the `running` item, which the runner was finishing between snapshots. With that item left out, the comparison also gives 0 differences on the 517-item snapshots. |
| Speed | 10 calls on 54 items: branch 64 ms, main 68 ms (this container) |
| Neighbouring suites (fresh copies) | screen02_fix 61/61 · screen02_slice2 53/53 · s6_p149 73/73 (`tsx --tsconfig api/tsconfig.json`) · who_fills 26/26 · forms_qa53 20/20 · w1_structure 81/81. `check_who_fills.json` was rewritten and I restored it with `git checkout --`. |
| Graph (P-86) | G1 0 · G2 0 · G3 2 (the same two routes as before) · G4–G6 0 |

## Issues, ranked
**Major 1 (Must): the m3 fix finds a file's form by its label, but the product finds a file's edition by checksum.** `review-queue.ts:72-74` looks up `source_attachment.edition` in `form_edition.editionLabel`. Everywhere else, the product links a file to its edition by `sha256` (`ai.ts:313`, `screen02.ts:85`, `sources.ts:132`). The loaded demo has 3 Form files labelled "IMM 5475 (12-2022)". The library has "IMM 5475 (05-2021)" with the same checksum. The IMM 5881 checklist and the IMM 5905 instructions do not match by label either, only by checksum. **Repro** (test input, the same way the suite adds rows): copy job `7aab959f` (field_map, REPLAY, COMPLETED) onto attachment `d861408e` (IMM 5475). Its item reads "IMM 5475: 242 form fields…", yet it has `forms: []`, and `?form=IMM 5475` does not list it. A QUEUED read_form step for that file in a running batch is also left out of the batch's forms. 9f2132bd's label parse gave IMM 5475 in both cases. The product reaches this through a batch read, or a draft of IMM 5475. The m3 check (`tests/check_forms_c212_queue_forms.ts:132-138`) passes only because it first adds a `form_edition` with the file's exact label "IMM 5881 E (05-2026)", which the product never creates. **Fix:** select `sha256` with the attachments. Find the form through `form_edition.sha256` in the same batched read, falling back to the label (keep the label lookup for `proposal_item.formEdition`, which is an edition label). Then point the m3 test at a real file whose label differs from its edition's (IMM 5475 or the IMM 5881 checklist), without inserting an edition.

**Major 2 (Must): the last round's Major is only partly closed.** Two rules it named still fail no test, which breaks STANDARDS §5 [M] "A rule's test fails when the rule is removed":
- (a) proposals fall back to the combination's lines. Change `forms: fe ? [fe] : formsOfCombination(r.combinationId)` (:117) to `fe ? [fe] : []` and the suite is still 40/40. The oracle (test :92-93) returns `null` for combination groups, so they are never checked.
- (b) a held file with a code. Make :191 give `[]` and the suite is still 40/40, because `held_file` is not in the per-kind loop (test :104).

**Fix:** add `held_file` to the loop (the oracle at :86 already handles it). Make the proposals oracle check combination groups against `lineForms`.

**Minor 1 (Should): m2's field-map half has no failing test (missed c).** The code is right live (see above). **Fix:** in the same suite, add a newer version of one mapping that drops the key, and check that its form leaves the change's list.

**m5:** recording both deviations in the PR body is **enough for this PR**. The PR body is the record of what was checked, and the deferral was the Lead's call (26 Oct). The golden comparison of this round and the last stands in for the golden test until the move. But today the obligation lives only in plan §9 slice 5, "golden test written first on today's code". The PR body should say the golden suite lands with the `engine/queue.ts` move, so it is not lost. There is no PR yet, so I could not read its body.

## D1–D20 (changes from the last round)
D1 4 (D2 per kind, except the checksum link) · D2 4 (newest versions now; Major 1) · D7 3 (an AI item on the demo's IMM 5475 file names no form) · D10 5 (m4 fixed) · D15 5 · D16 3 (21/24 mutations caught; Major 2, Minor 1) · D17 and D20 simulated only. The rest are unchanged from the last round (no UI file changed since 9f2132bd).

## Could not check
Live-AI suites and a product-made AI draft of IMM 5475. The replay route refused it: "already in this combination's configuration" or "not the newest valid run". So that repro uses a copied job row. I could not read the PR body. There is no screen yet (F3b).

Journey test: `journey-test-reviewer-2026-10-31-c212-531ff8da.md`. **Score 8.5/10 (pass).**

**Verdict: Block.** To fix: Major 1 (match files by checksum, and make the m3 test use real data) and Major 2 (failing tests for proposals by combination and held files with a code). Minor 1 is a Should.

# Round at 41b97b46
Commit reviewed: **`41b97b46`** (one fix commit on 531ff8da). I did not build it. Changes: `api/src/review-queue.ts` (`formOfFile`: checksum first, then label) and `tests/check_forms_c212_queue_forms.ts` (45 checks). I ran everything on /tmp `git archive` copies, on ports 4450–4453. Every database was dropped afterwards. No `*_LIVE` variable was set. Cost: US$0.

## Verdict: **Ship** (0 Blocker, 0 Major, 1 Minor). For the PR: **Approve**
Major 1, Major 2 and Minor 1 from the last round are closed, live and by mutation.

## Checks
| Check | Result |
|---|---|
| New suite | 45/45 (:4450, 109 s) |
| Mutations (fresh copy and database per run, :4452 and :4453) | **26 caught, 3 missed of 29.** Caught: the 21 from the last round, plus the 3 it missed (proposals by combination → [], a held file with a code → [], field maps from any version), plus checksum removed for all files, for AI drafts only, and for running steps only. Missed: see Minor 1 and the note below. |
| Major 1, live | Same repro as the last round, on the golden database: a field_map job copied onto attachment `30921539` (Form "IMM 5475 (12-2022)") → `forms: ["IMM 5475"]`, and listed under `?form=IMM 5475` ✓. The suite's check now picks a real demo file whose label differs from its checksum's edition (IMM 5475). It inserts no edition ✓. On the demo, the 7 files whose label differs from their edition's (3 IMM 5475, IMM 5881 checklist, IMM 5905 instructions, Guide 5256, Guide 5487) all resolve by checksum. No checksum belongs to two forms (15 editions, 15 checksums). The lookup is workspace-scoped and replaces the label read with one batched `OR` read. |
| Label fallback, live | A file with a checksum no edition has, labelled "IMM 5257 (09-2023)" → [IMM 5257] ✓ |
| Major 2 and Minor 1, live | The suite's loop now includes `held_file` and `proposals:combination`. A newer DRAFT mapping without the key takes its form off the who-fills change. Each of these mutations is caught ✓ |
| Golden comparison, main vs 41b97b46 | One `fillAllKinds` database, 54 items. Order: branch, main (`isolated.sh rv41gold 4451 restart`), branch, main, branch. 4 people × 17 queries = 136 responses. Settled pass (the running batch finished): **0 differences with `forms` removed, 508 items**. The first pass was taken while the batch was still running: 0 differences with the `running` item left out (`cmp_norun`). Every raw difference in that pass was that batch finishing between snapshots. Branch vs branch gave the same pattern. |
| Neighbouring suites (fresh copies, :4450 and :4451) | screen02_fix 61/61 · screen02_slice2 53/53 · s6_p149 73/73 (`tsx --tsconfig api/tsconfig.json`) · who_fills 26/26 · forms_qa53 20/20. `check_who_fills.json` was rewritten (through the `product/` link) and I restored it with `git checkout --`. |
| Graph (P-86) | G1 0 · G2 0 · G3 2 (the same two routes as before) · G4–G6 0 |

## Issues, ranked
**Minor 1 (Should): the label fallback in `formOfFile` has no failing test.** Repro: delete ` ?? (a.edition ? formOfLabel.get(a.edition) : undefined)` at `review-queue.ts:80` and the suite is still 45/45. The code is right live (see above). The suite's oracle already encodes the fallback, but no file in the filled data reaches it: every demo file with an edition matches by checksum. **Fix:** in the same suite, give one file a checksum that no edition has and a label equal to an edition's, then check that its item names that form.

**Note (not a finding):** two other mutations change nothing on any data the product makes today. (a) Label checked before checksum: no demo file's label is another form's edition label. (b) `codeOf` parsing the label back: it now reads only `proposal_item.formEdition`, which is an edition label and parses to the same number. Both are equivalent mutants here.

**m5** stands as recorded in the last round: the PR body should say that the golden suite lands with the `engine/queue.ts` move.

## D1–D20 (changes from the last round)
D1 5 (D2 per kind, files by checksum) · D2 5 · D7 4 (an AI item on the demo's IMM 5475 file names IMM 5475) · D16 4 (26/29 mutations caught; Minor 1) · D17 and D20 simulated only. The rest are unchanged. No UI file changed since 9f2132bd.

## Could not check
Live-AI suites. A product-made AI draft of IMM 5475: the replay route refuses it ("IMM 5475 is already in this combination's configuration."), so the repro uses a copied job row, as the suite does. The PR body (no PR yet). There is no screen yet (F3b).

Journey test: `journey-test-reviewer-2026-10-31-c212-41b97b46.md`. **Score 9.5/10 (pass).**

**Verdict: Approve.** No open Blocker or Major. Minor 1 is a Should.
