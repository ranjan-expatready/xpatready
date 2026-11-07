# C6.12 breadth: fresh challenge of concept r1 (independent challenger, 5 Nov; skill screen-concept B, P-223 (4))

The challenger did not draft the concept. Read: `concept-draft.md`, `build-notes.md`; on this branch (main ffcfb45c8 + 3 runtime
commits) `api/src/case-prepare.ts`, `engine/runtime/{filings,prepare}.ts`, `engine/filing-modes.ts`,
`web/src/runtime/{cases,forms,submission,out-of-date}.tsx`, `web/src/components/ui/controls.tsx`, `samples/{fee-table,wave1}.json`,
the packs `C6.12-breadth.test.ts`, `C6.12.test.ts`, `M3-CONTRACT.md`; `M3-design-2026-11-04/prepare-tab/{concept-draft,challenge}.md`,
`rows.md` (C6.12, C7.7), `M3-agent-view/concept-draft.md` (BR-18); DECISIONS P-171, P-247, P-223, P-316, P-319, P-322; the
hot list; `domain/TAXONOMY.md`; `research_notes/Agent view and filing UX/ircc_filing_units.md`. Live (read only): `GET /prepare`
on SAMPLE-VV-FAMILY-1 at :4431, and the case page drawn headless at 1440 and 1024 px. Paths: `S/` = `prototype/studio/`,
`P/` = `product/`. Unconfirmed: no counsel.

## Verdict
**Build after these changes.** Part A is the right small step: read only, no AI, no hot file, and the sums match the live
API (CAD 400 + CAD 170 = CAD 570; the exempt child's reason quotes IRCC's page). But the concept starts from a wrong premise.
The case page already reads `/prepare`, and `SubmissionPanel` already lists every group and filing and owns the application
number. As drawn, the panel would be a second list of filings on the page and, once moved into the tab, a second version of
it. A waiting line would also show an amount. Part B's direction is sound, but its "shape" puts a filing rule in data that is
not in the release, and it leaves out what the extra filing is made of.

## Blockers
None.

## Majors
**M1. The case page already reads `/prepare`, and the filings it lists would be listed twice.** *Needed for the proof.* Confidence: high (code and live page).
* Concept §2 says "the case page never reads `/prepare`" (concept:27). It reads it twice: `S/web/src/runtime/submission.tsx:50`
  (key `["runtime","view",id,"prepare"]`) and `S/web/src/runtime/out-of-date.tsx:23` (the same key plus the actor). The live page
  sends two `GET …/prepare` per load (about 0.18 s and 80 KB each).
* "Submission to IRCC" already shows each group's `label` and each filing's `label` and status (`submission.tsx:72-85`), and,
  once recorded, its application number (`submission.tsx:107`; `number` is filled by `recordedOverlay`,
  `S/api/src/submission-record.ts:66`).
* BR-1 adds the same groups and filings again, with mode words and "Application number: not recorded yet". That makes two
  lists of filings and two homes for the number on one page. Moved into C7.7, the block's own group header and filing rows
  would repeat the tab's grouping by filing (`prepare-tab/concept-draft.md` §4). That is the "second version" the concept
  says it avoids. P-171 (4)'s "own application-number box" is written for spouse sponsorship, and C8.2 is where the number is recorded.
* **Fix:**
  * Make the shared component the tab's BR-7 fee block and nothing more: `FeeBlock({group, filings, fees})` gives the fee
    lines by filing, `totals[].why`, the group total and the `basis`. No filing list, no mode column, no number box.
  * Read it with the existing query key, so the page makes no third request.
  * Place it at the foot of each group. Either render it inside `SubmissionPanel`'s group section (`submission.tsx:77-86`, not
    hot), exactly where the tab will put it, or render a "Fees" panel that loops over the groups the same way. Recommend the
    first.
  * Correct §2 and §8 (add `submission.tsx` if chosen).

**M2. A line waiting for a date of birth would show "CAD 85".** *Needed.* Confidence: high.
* The API sends a waiting line with `amount_cents = perPersonCents` (`S/engine/runtime/filings.ts:264`), so its `amount_words`
  is "CAD 85" (`S/api/src/case-prepare.ts:186`).
* BR-2 shows `amount_words` on every line, and BR-5 keeps the line only out of the *total*. The officer would read CAD 85 next
  to "Not counted until it is answered".
* **Fix:**
  * Send `amount_words: null` for a `waiting` line in `case-prepare.ts:186` (M3-only). Keep `amount` as it is: `C6.12.test.ts:14`
    already leaves waiting lines out.
  * Add an API check, and on the page show "Not counted yet".
  * Test, fail case: the waiting row contains no "CAD".

**M3. People with no fee line drop out of "Filings and fees" without a word.** *Needed.* Confidence: high.
* The API returns `not_filing[]` and `people[].why`, for example a person not travelling: "no filing and no fee"
  (`S/engine/filing-modes.ts` `filingPlan`; tested by `C6.12.test.ts:80`). It also returns declared-only applicants (`mode:
  "declared_only"`, no fee line; r5c BR-18 "none for declared only").
* BR-1 to BR-7 and §5 never show either case. The job is "which applications the case files … who pays" (concept:16), so an
  officer looking for Child A2 finds nothing and no reason.
* **Fix:** under the groups, list each `not_filing[]` person with the API's `why`. On a declared-only applicant, show "No fee
  while declared only", the studio's own words (`filingWords`, `S/engine/filing-modes.ts:72`). Add a pass and a fail test for
  each (shape as C6.12-18).

**M4. Words and a state the API never returns.** *Needed.* Confidence: high.
* **The sponsorship row.** "No fee of its own: …" (concept:54) is not a field. It would have to be cut out of the `basis`
  sentence (`filings.ts:290` joins in `co_filed_fees.why`, `S/samples/fee-table.json:239`).
* **The state cannot be reached.** `fs.spouse` is not released on the checkpoint or on the CI copy (`build-notes.md:11`;
  -22 red).
* **Mode words disagree.** "Sponsorship: sent with the principal's application" is not the studio's "Files the sponsorship
  (sent with the principal's application)" (`S/engine/filing-modes.ts:70`), so the same thing is worded two ways across screens.
* **Fix:**
  * Drop the mode column (M1).
  * A filing with no fee line shows a fixed "No fee line on this filing (see the basis below)".
  * Draw the sponsorship case as *Not built* until -22 lands; no test claims it.
  * Any mode words that stay use `filingWords`.

**M5. The test list cannot reach half its states on the copy it runs on, and misses the layout checks.** *Needed.* Confidence: high.
* **Only Visitor visa is released there.** The pack's copy releases only Visitor visa (`C6.12-breadth.test.ts:8`), so "fees
  not worked out" (BR-4), "not derived", "nobody applying", "could not load", loading and the sponsorship have no case to test.
* **-25 reads a different case from the walk.** -25 opens its own new FAMILY case ("Sample Client A", `:17`, `:42`), not
  SAMPLE-VV-FAMILY-1, whose people are "Client A (Sample)" and others.
* **Fix:**
  * **Real data** for BR-1 to BR-3 and BR-5: the FAMILY case; a split made through `POST /runtime/groups/:gid/split`, as in
    C6.12-13; a child with no date of birth, as in C6.12-21.
  * **Stubbed reads** for what the copy cannot make: Playwright `page.route` with recorded `/prepare` bodies (`derived:false`
    with its `why`; `fees_worked_out:false` with `fees_why`; no filings with `why`), and a 500 for "could not load" and Retry.
  * **Add these checks:**
    * no sideways scroll at 1024 px (page width, and the table region's `scrollWidth <= clientWidth`);
    * long names at 1024 px;
    * every Source link reached by keyboard;
    * axe clean at both widths;
    * no duplicate `id` or heading text next to `SubmissionPanel`.

**M6. Part B: the rule "a Yes adds a filing" is placed in data that is not released.** *Needed.* Confidence: high.
* Concept:96-97: "the fee table's combination says, as data, that a Yes on that fact adds a filing … so it is in the release
  snapshot".
* Filings come from the release's "Who can be in this application" modes (`filings.ts:10`, `:214`; `case-prepare.ts:91`). The
  fee table is `samples/fee-table.json`, not frozen with a release until S7a (`filings.ts:21-23`; `rows.md` C6.12 "S7a").
* An edit to the fee table would then change the filings of open cases, and the "release snapshot" claim is false for the
  rule.
* **Fix:** put the condition on the combination's child line in the release ("adds a filing when {library fact} is Yes"), set
  through the studio's steps. The fee table only prices it: `study_permit` CAD 150, per person by role, no family maximum,
  cited (`fee-table.json:131-144`).

**M7. Part B: the added study-permit filing has no forms, documents or pin, and no option costs that.** *Needed.* Confidence: high on the code, medium on the size.
* **A study permit is its own application.** TAXONOMY row 2 says a student's family is "three combinations in one case"
  (`P/domain/TAXONOMY.md:33`). The research says each role's linked combination is "released with its own forms, fees and pin
  (AG-7-45 rule 4)" (`ircc_filing_units.md:52`).
* **A case holds one pin, and items come only from it.** `S/api/src/runtime.ts:57` refuses any pin count but one, and items
  come only from that release (`case-prepare.ts:97-110`).
* **So the filing would be empty.** Under the concept's shape, a Yes gives a CAD 150 filing with nothing to prepare.
* **The -23 check is weak.** It only looks for the question's words in any release (`C6.12-breadth.test.ts:28`), so it can go
  green while the filing is empty.
* **Fix:**
  * Say the scope in the options. Either (a) -23 is the question, the filing and its fee line, with the filing's items *Not
    built* and C6.12 Partial saying so, or (b) a linked combination (a second pin) as its own row with a design first.
  * Amend -23 to check: Yes gives a filing of the study-permit combination with its CAD 150 line; No gives none; unanswered,
    it waits (as G15).

**M8. Part B: the example combination may encode an immigration rule nobody has checked.** *Needed.* Confidence: medium.
* **Option 1 puts the child on the worker's case inside Canada.** It adds the child to `wp.lmia_inside`, the worker applying
  inside Canada (`S/samples/wave1.json:34`).
* **The written plans describe the student from outside.** `rows.md` (C6.12 tests) plans `acceptance/lib/setup_sp_m3.ts`. The
  research row 2 and TAXONOMY row 2 describe the student's family from outside Canada.
* **That question is still open.** The research's Q2 (`ircc_filing_units.md:72`), "from what age a study permit is needed", is
  open.
* *Unverified* (no IRCC page read in this challenge): whether a worker's minor child already in Canada needs a study permit at all.
* **Fix:** use `sp.outside` with an accompanying child (it matches rows.md and the research), or put the inside-Canada case to
  the immigration expert first. Either way the question words stay Sample (P-171 (5)).

## Minors
* **m1. The "Sample amounts" pill and the header line are the page's own words.** Confidence: high.
  * The pill is wrong when `fees_worked_out:false`, because then no amount is shown. It also never goes away once the expert
    confirms the amounts; the API says "Sample" only inside `basis`.
  * "…paying is not built" repeats the `basis` sentence.
  * **Fix:** show the pill only when `fees_worked_out` is true, or drop it and let `basis` say it. Drop the header sentence.
* **m2. The page writes the group total in words itself.** Confidence: high.
  * The API gives `total_cents` only (`filings.ts:284`). `cad()` cannot be imported into the web bundle, because `filings.ts`
    imports `node:crypto` (`:13`). A second formatter can drift: `cad` writes "CAD 1260", while the fee table quotes "$1,260.00".
  * **Fix:** add `total_words` to `groups[]` (and to `totals[]`) in `case-prepare.ts:184`, with an API check. "The page adds
    nothing up" then holds for the words too.
* **m3. Sources repeat, and one date is mislabelled.** Confidence: high.
  * The live case has the same "Source" link 8 times.
  * The exemption source's `read` is "2026-03-30 (page date)", which would print as "(read 2026-03-30 (page date))". That is a
    page date, not a read date.
  * **Fix:** list each distinct source once per group: page, its date as given, and a link (`rel="noopener"`, "opens in a new
    tab").
* **m4. Captions, ids and headings.** Confidence: high.
  * `Table` has no `<caption>` (`S/web/src/components/ui/controls.tsx:162-171`). Use its `label` prop.
  * `SubmissionPanel` already uses `sub-${g.id}` and the h3 "One submission for 4 people applying".
  * **Fix:** use ids `fee-${g.id}` and a distinct heading or region name, such as "Fees: One submission for 4 people applying".
* **m5. The Filing and Person columns repeat the same name.** Confidence: high.
  * On every Visitor visa line the filing's owner is the person (live API). Five columns with long reasons are tight at 1024 px.
  * **Fix:** one sub-heading row per filing, then Fee · Person (only when it differs from the owner) · Amount · Why, with Why
    wrapping.
* **m6. The `why` of `derived:false` would show twice.** `SubmissionPanel` already shows it (`submission.tsx:67`). Confidence: high.
  * **Fix:** with `derived:false` the fee block renders nothing. In the tab, the not-derived state shows the forms panel
    (prepare-tab BR-2).
* **m7. The case page as built: what to fix while here.** Confidence: high.
  * **Two keys for one read.** The two readers of `/prepare` use different query keys (`out-of-date.tsx:23` includes the
    actor; `submission.tsx:50` does not), so each load reads it twice. Align `SubmissionPanel`'s key to the actor key in the
    same PR (one line, named in it), and use that key for the fees.
  * **A read that can write.** `/prepare` can write (it stores filings; it moves Ready to file back to Not started with an
    audit line, `case-prepare.ts:169-172`, `:368-373`). Sharing the query adds no new write.
  * **The forms heading.** `FormsPanel`'s h2 "Prepare application" (`S/web/src/runtime/forms.tsx:29`) is not broken, but it is
    the C7.7 tab's name. Leave it to C7.7.
  * The page has no sideways scroll today at 1440 or 1024 px.
* **m8. The journey cited has no fee step.** J7 2.3 and 5.1 are the tab header and the item list (`S/acceptance/journeys/J7-visitor-visa-end-to-end.md:33`, `:62`). Confidence: high.
  * **Fix:** cite C6.12-25 and the `rows.md` C6.12 "Done when". C7.7 adds a fee step to J7.
* **m9. Record the deviation from rows.md.** Confidence: high.
  * `rows.md` "Done when" puts -25 "inside the C7.7 tab", tested by clicking the tab (`rows.md:512`, `:518`). The concept says
    it ships outside first (concept:69), which is fine, but it must not be silent.
  * **Fix:** say it in the PR's first line, and put "-25 amended to click the tab" on the C7.7 row.
* **m10. Part B: loose ends.** Confidence: high.
  * **Fixture name.** Option 2 names `setup_wp_m3.ts`; `rows.md` plans `setup_sp_m3.ts`.
  * **rows.md is out of date.** It lists `samples/wave1.json` as an M3-only change, while the concept rightly says that
    changing the six touches M2's counts (P-343 (3)). The tech lead corrects `rows.md`.
  * **Option 3 is against P-171.** Waiting for the expert runs against P-171 (5), which already rules "Sample until the expert
    confirms". Keep it only as "not recommended".
  * **No "waiting filing" in the API.** "An unanswered question makes the child's filing wait" has no state in the API:
    filings have only a status, and fees have `waiting`. Say where it shows: a `not_filing[]` entry with its why, or a fee line
    waiting as G15.

## What is sound
* Read only, no button, US$0, no AI. No file on `P/tools/m2-hot-files.txt` is changed, types stay out of `studio/contracts/`,
  and `case-prepare.ts`, `cases.tsx` and `submission.tsx` are not hot.
* BR-2, BR-3 and BR-4 quote the API's words exactly, as checked live: "Family maximum CAD 170 for the 3 people applying
  together, paid on this filing"; "4 × CAD 100 = CAD 400; the family maximum CAD 500 starts at 5 …"; "Under 14: no biometrics
  (When to give biometrics …)". "No amount, never CAD 0" matches `total_cents: null` (`filings.ts:284`).
* One component carried into the tab is the right rule, once it is scoped as in M1.
* Part B's diagnosis is right. The six have no child on a student or worker line (`wave1.json:23`, `:34`). The checkpoint's
  steps are in the hot `demo.ts`. Works counts on the checkpoint (P-322). Option 1's order (after M2 reaches 60) and no form or
  combination number in code (P-319) are sound.

## Back-end plan (element → record → API → rule → test)
* Fee line → computed per read from `fee-table.json` → `fees[]`, with `amount_words` null when waiting (M2) → BR-2, BR-5 →
  API check plus browser fail test.
* Group total → computed → `groups[].total_cents` plus a new `total_words` (m2) → BR-3 → page total equals the API's.
* No filing → `not_filing[]` → as is → M3 → C6.12-18 shape in the browser.
* Part B question → library fact placed on the child line (release) → `/prepare` filing → the release condition (M6) →
  -23 amended (M7).

## Questions for the tech lead (recommendation first)
1. **Where the fee block goes on the case page.** *Recommend:* inside `SubmissionPanel`'s group section, at the group's foot,
   where the tab will put it. The alternative is a separate panel looping over the same groups.
2. **Part B scope.** *Recommend:* option 1 on `sp.outside` (M8), with the rule on the release (M6), and -23 as question,
   filing and fee, with the filing's items *Not built* (M7 (a)). A second pin becomes its own row.

## Lead response

## Agreement

## Build discoveries
