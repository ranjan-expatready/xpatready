# G1 (C5.4) PR 2a: review of #587 at **c841b8c9**

Reviewer (did not build it), 2 Nov 2026. Branch `claude/funny-curie-mbttn2`, base `0d129be5` (#569 merged).
Measured against: concept v2 (BR-1 to BR-11, §5, §6); challenge M1 and M4; the tech lead's conditions on #558 (approval at 16:23 UTC; dates at 16:43, P-279); his #569 comment at 17:30 (`changes > 0 || !rel`; the refusal and workspace key shared with G2); STANDARDS and EXPERIENCE [M]. US$0. Isolated copy on :4471 (never :4400), stopped and its database dropped afterwards. Nothing committed.
This PR has no screen, so D8–D14, D17 and D20 and the browser, axe and screen-size parts of the journey test wait for PR 2b. I judged the API journeys as the author, the approver, the SME, a case person and an unknown caller. The journey report is in this file: I was asked to write only this file.

## Verdict: **APPROVE**. No Blocker, no Major; six Minors (fix or list in the PR). Journey score **9.4/10** (7.5 of 8 applicable).

## What I ran
* `check_g1_source_register.ts` **40/40**; `check_g1_sources_api.ts 4471 xr_studio_rev587` **44/44** (exit 0).
* 6 of the 17 changed suites, each on a fresh copy: c48_sqr_release 25/25, who_fills 28/28, s5_slice1 57/57, vv_checklist_api 29/29, w115_slice1 47/47, and c69_gates 87/87 (it runs `setup_vv_m3`).
* `count-any --against origin/main`: **422** (423 at the base). `graph.mjs --check`: exit 0, G1 0.
* api `tsc`: 15 errors, all in five test files the PR does not touch; the same files fail on a `git archive` of the base.
* Taking out both `as never` casts at `validate.ts:252` (on a scratch copy) adds **no** type error.
* Hand probes with curl and psql, listed below.

## Focus points
1. **Draft only (challenge M1): held.**
   * `studio.problems()` runs the gate only on a draft that differs from its last release (`studio.ts:393`). The catalogue adds it only to `draftProblems` when `changes > 0 || !rel` (`programs.ts:178`). `relProblems` never has it, and `validate()` never calls it (engine M1 fail test).
   * Probe and suite: a Live row with no draft changes reads `Live · Release 1` with Fix 0. With a change it stays Live and its draft lists 17.
2. **Refusals: held; no bypass found.**
   * Only two code paths create a `config_release`: `publishRow` (from approve and releaseRows, each calling `refuseBlocking` first) and the sample import (scaffolding, entries written before Release 1).
   * X2b `lines-bulk.ts` writes drafts only, and those drafts then meet the gate.
   * Submit gave 400 `…/no-source` with all 15 in `errors[]` (probe; the suite does the same with 17). Approve gave 409 with all of them.
   * `POST /pack/release` holds the row ("15 numbers have no source entry: fix on Review and release.") and answers 409 when every row is held.
3. **Sample condition: held.**
   * Entries are Sample only through the seed. The seed writes only for an ILLUSTRATIVE combination, and the route also refuses outside the demo workspace (probe 409 on the work permit).
   * A PUT body carrying `sample:true` is ignored and stored as `sample=false` (probe).
   * With `STUDIO_WORKSPACE_KEY=firm`, Submit is refused and the item is named in words that say Sample. Back in the demo workspace, the release is a Demo release with its frozen source `sample:true`.
   * `sourceBasis` is set only at creation, so marking stays correct.
4. **Permissions and errors: held.**
   * GET: none or unknown → 401; case officer or client → 403; approver and SME → 200.
   * PUT: none → 401; officer → 403 (not-configuration); approver and SME → 403 "Only the configuration author adds sources."
   * POST sample: none → 401; approver or officer → 403.
   * Six parallel PUTs at version 0 gave one 200 and five 409. Six more at version 1 gave one 200 and five 409. One row and two audit lines.
   * 404 for an unknown kind, key, combination or non-UUID id. A fee number gets 409 ("already cited by its own record").
   * Field errors: tomorrow (UTC) → "The date read cannot be in the future."; 2026-02-30 → date shape; `javascript:` and `https://localhost` → https error; blank quote → 400.
5. **Import citations: honest.** I read all 10 rows.
   * Each item's own quote states the value in digits: 18 ×5; 5 ×3; "November 1, 2024" ×2.
   * Each carries the manifest's canada.ca URL and edition, the date 2026-10-19 and `sample-inputs`.
   * Release 1 froze them, so after Reset there are no changes. Reset leaves 0 entries (suite).
   * *For the immigration expert, not this PR:* `RW_VENEZUELA_PASSPORT_EXPIRED_5_YEARS` tests "at least 5", but its quote says "more than 5 years".
6. **The 17 suites: no check weakened.**
   * Diffed each one: **45 added lines, 0 removed**. Each addition is an import plus one `sourceEveryNumber()` call (PUT through the API, never SQL), or a call to the demo seed for the Sample Visitor visa (with its own `ok`).
   * x1_tabs answers the numbers first, so the problems it checks are its own.
7. **Frozen and diff: held.**
   * `snapshot.sources` holds only the entries that answer a published number. It is sorted and canonical (key order from jsonb does not matter).
   * One entry gives one "Source" change with `needs_sme`. The Visitor visa (no entries) keeps its fingerprint.
8. **Code quality.**
   * No new explicit `any`. The Nest routes are registered as a feature.
   * Two Minors here: the casts (m1) and the contract's file name (m2).

## Minors
* **m1 · Casts that do nothing.** `as never` ×2 at `engine/validate.ts:252` switches off type checking for no reason; without them the code compiles. Remove both.
* **m2 · Contract file name.** `contracts/sources.ts` is the source register's contract, while `api/src/sources.ts` and `engine/sources.ts` mean other things (library and fact sources). Its siblings are `source-register.ts`. Rename it to `contracts/source-register.ts`, and `SourceBody` to `SourceEntryBody`, before PR 2b imports it.
* **m3 · A check that passes for the wrong reason.**
  * `check_g1_sources_api.ts:188` ("the demo seed never answers a source-backed combination") uses the `wp` id read before a Reset, so the 404 means "no such combination".
  * Re-read the id and require 409 with the words "is source-backed" (my probe gets exactly that).
* **m4 · Untested belt-and-braces code, and an overclaim in the PR body.** No test fails if any of these three is removed:
  * `refuseBlocking` in `releaseRows` (`studio.ts:960`). It is reachable only by a race after `/draft`; the plain 409 behind it still refuses.
  * `isDemoSnapshot`'s Sample-source clause (`validate.ts:272`). The Visitor visa is ILLUSTRATIVE anyway.
  * `sampleSourced` (`programs.ts:407`).
  * Add an engine check: a SOURCE_BACKED snapshot with a Sample source is a Demo release.
  * Correct the PR body: `POST /pack/release` answers `every-change-is-held-back` with the row's count sentence (`programs.ts:430`), not `…/no-source` with `errors[]`. The concept's §4/§5 words are met.
* **m5 · Page and catalogue can disagree.**
  * The page compares fingerprints (`studio.ts:393`); the catalogue counts `diff()` lines (`programs.ts:178`).
  * When the fingerprint moved but `diff()` is empty (the W1-02 "older release's keys" case), the page and Submit list source problems while the catalogue shows none. Submit then refuses on sources before saying "Nothing has changed".
  * Use one test in both, for example `diff().length > 0 || !rel`.
* **m6 · Smaller points, for PR 2b or the tech lead.**
  * Dates read in ISO inside sentences ("Passport issue date: before 2019-06-07"). Say them as IRCC writes them.
  * "Today" for the date read is UTC (`contracts/sources.ts:23`). An author east of UTC is refused their local today until UTC midnight.
  * Entries outlive a deleted never-released combination (`lifecycle.ts:493`; by design, BR-11). A new combination on the same node (key = node key) picks them up. It shows as "Source added" lines for the expert, not silently, but tell the tech lead.

## D1–D20 (API PR; screen dimensions wait for PR 2b)
D1 5: every BR in §3 and both #558/#569 conditions have behaviour and a test · D2 5: race-safe version, unique address, CHECKs, server duty checks · D4 4: draft gate, but m5 · D5 4: Reset clears, 409 recovery; m3 · D6 5: version, who and when, audit added/changed · D15 5: page 0.12–0.15 s, sources 0.03–0.04 s, one entry query per workspace · D16 4: pass and fail per rule, rerun on the exact head; m4 · D18 5: honest import citations, "From the sample load", Sample never shown as a source · D19 n/a until 2b · D3, D7 n/a (no fields, no AI) · D8–D14 wait for 2b · D17, D20: simulated only, the founder's.

## Journey test (reviewer role; API journeys)
Journeys:
* J1 the author sources every number and releases with a second person;
* J2 a refusal on each route;
* J3 a changed number;
* J4 two authors on one entry;
* J5 the approver, the SME, a case person and an unknown caller writing;
* J6 the Sample answer in the demo and in a non-demo workspace;
* J7 Reset.

Break pass: races, hostile URL, impossible and future dates, `sample:true` smuggled into a PUT, a fee number, unknown ids.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1: 17 answered by PUT, submit, sign, approve → Release 2, 27 frozen |
| Next step obvious | 1 | Every sentence ends with the action; the count names where they are listed |
| Plain words | ½ | m6 ISO dates; a check's ~200-character message as its name (build note 2, for 2b) |
| Feedback and state | 1 | 7 states, `passes`, `held_back`, Release page reason |
| Correct data | 1 | 1 row and 1 audit line per race winner; smuggled Sample ignored; citations honest |
| Error recovery | 1 | 409 says who and when; a moved value 409 gives the current number; errors per field |
| Accessibility and sizes | n/a | no screen (2b) |
| Speed | 1 | Probe timings above |
| Visual quality | n/a | no screen (2b) |
| Trust and sources | 1 | Sample only in the demo, as a Demo release; the expert signs Source lines |

**7.5 of 8 = 9.4/10. Pass**, no 0.

## Could not check
* The screens, axe, keyboard and the 400/1024/1440 px widths: PR 2b.
* The other 11 changed suites, the browser ones included. I rely on the builder's run and CI.
* CI on this head. `code/` (team mapping). D17 and D20.

**Verdict: Approve** (c841b8c9). No Blocker or Major is open. Fix m1–m5 or list them in the PR; m6 is for PR 2b and the tech lead.

## Round 2: head **86816a18** (Devin rounds 1–3, my m1–m4, breaker B1, M1, m1–m5, m8)
I reviewed `git diff c841b8c9 86816a18`.
* **Suites:** engine **46/46**; API **48/48** on a fresh isolated copy (:4471), stopped and dropped afterwards.
* **Probes:** a scratch script calling `statesValue`, `publishedNumbers` and `SourceEntryBody` directly, kept outside the repo.
* **Fixed:**
  * m1: no `as never`.
  * m2: `contracts/source-register.ts` and `SourceEntryBody`, with no old name left.
  * m3: line 201 uses the re-imported id and requires 409 "source-backed".
  * m4: engine checks 182–183 on `isDemoSnapshot`.
  * B1: a date with a time or a trailing space is the same published date.
  * The Sample seed refuses a retired combination (409, writes nothing) and writes nothing outside the demo workspace (m8).

### Verdict (86816a18): **Block**. One Major, no Blocker. Journey score **8.8/10** (7 of 8 applicable: correct data drops to ½).

### Major
**MJ-R2 · `statesValue` refuses every true citation that groups its thousands, which pushes the author toward a false "None published".** *Must.*
* **Where:** `engine/source-register.ts:261`, used by `statesValue` (`:275`) on every cited PUT. The lookbehind `(?<![\d.,])` and the plain digit match need the canonical digits unbroken.
* **Probe:**
  * `"Proof of funds of $14,690 …"` does not state 14690;
  * `"CAN$1,085 per person"` does not state 1085;
  * `"1 000 dollars"` does not state 1000.
* **Why it matters:**
  * IRCC writes money with a comma. Concept BR-5 itself names 13757 as a value.
  * For any funds or income threshold in a condition, the author can never cite IRCC's own words, and the only other answer, "None published – set by ExpatReady", would be untrue (D18, P-170).
  * The demo's 27 numbers are all below 1000, so no suite sees it.
* **Fix:** accept the canonical digits written with thousands groups (`,`, space, NBSP or thin space between groups of three), with or without a currency sign.
* **Tests:**
  * a pass for "$14,690" and 14690;
  * a fail for "$14,690" and 1469;
  * a fail for "14,6900".

### Answers to the three questions
1. **The "in"-list address `<field>|in|<k>.<place>` is safe, but it does not stay put.**
   * It fails closed. Inserting 17 at the front of [18,19,20] lists 17, 18 and 19 as changed and 20 as missing. Removing 18 lists 19 and 20 as changed. Reordering lists every value. An entry can only pass again when its place holds the same value on the same field.
   * Text codes, booleans and 0 stay out, which matches runtime `in`, a strict `includes` (`contracts/rules.ts:131`).
   * It is **not stable**: one insertion asks again for every source after it. That contradicts the spirit of BR-2 ("address by meaning; the JSON path is only a hint").
   * The list is a set at runtime, so the address could carry the value instead (`<field>|in|<k>=<value>`). Then an added or removed value moves only itself.
   * **Minor r2-1:** the tech lead chooses. Either way, add the address to concept BR-2. Also, the words "Age years: exactly 18" would read better as "one of 18, 19, 20".
2. **`statesValue`: it refuses true citations too often in one class (MJ-R2) and now and then in others (Minor r2-2, for the tech lead):**
   * **Unit conversions:** "valid for at least one year" can never state a rule stored as 12 months. There is no honest way to cite it.
   * **Numbers over 99 in words:** "one hundred and eighty days".
   * **Date forms:** "June 07, 2019", "Jun. 7, 2019", "November 1st, 2024".
   * **The other way, it is permissive:** "section 90 of the Act" states 90; "one of the following" states 1. It is a guard, not a proof; the expert's sign-off of the Source lines remains the check.
   * Everything else I tried behaved as written:
     * 21, written "twenty-one" or "twenty one", in any case;
     * "21-year-old", "18th", "18+", "under 18.";
     * "six (6) months";
     * "between two and five" (states both 2 and 5);
     * "twenty-one" never states 20; "five hundred" and "fifty-five" never state 5.
3. **The new limits do not all speak §5's words (Minor r2-3).**
   * The https, quote and future-date messages are §5's own words. The quote refusal "These words do not state 90. Copy the words that state the number." extends §5's sentence.
   * **But** a reason over 500 characters, or one with no letter or digit (ten NBSPs, ten emoji), answers "Say why ExpatReady set this number (at least 10 characters)." That is wrong for the 600-character case.
   * A date read of 1989-05-01 answers "Give the date read as a date (YYYY-MM-DD)." although it is one.
   * **Fix:** give each new limit its own words in `SOURCE_WORDS`, and add them to concept §5. For example: "Keep the reason to 500 characters." and "The date read cannot be before 1990."
   * The database has no maximum on the reason, which is consistent (the API is stricter).
* **Minor r2-4:** the URL check still accepts `https://user:pw@evil.example.com/x` and `https://10.0.0.1/x`. PR 2b will show this address as a link, so refuse a user name, a password or an IP host there.

### To fix for Approve
* MJ-R2, with its tests.
* r2-1 to r2-4: fix, or list them in the PR for the tech lead.
