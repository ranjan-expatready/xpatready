# C6.12 breadth: fees on the case page (-25) and the child study question (-23): concept r2 (runtime lane, 5 Nov)

**For:** the tech lead's approval after an independent challenge (P-223 (4), P-316 (3)). **Status:** r2 takes in every Major
and Minor of `challenge.md` (verdict on r1: "Build after these changes", no Blocker); the response is at the end.
**Rows:** C6.12-25 (a screen part), C6.12-23 (options only). **Base:** main ffcfb45c8. Every amount is from
`samples/fee-table.json` (cited: page, quote, date) or Sample; nothing new is priced here. Unconfirmed: no counsel.

**Reuses, does not redesign:** the fee block BR-7 of the Prepare application tab addendum
(`../M3-design-2026-11-04/prepare-tab/concept-draft.md` r2, its `challenge.md` M3) and r5c BR-18 (`../M3-agent-view/`).
**Deviation from the row plan, stated (m9):** `rows.md` puts -25 inside the C7.7 tab, a later row in the founder's order
(C6.4, C6.12, then C7.7). The case page as built already reads `/prepare` in "Submission to IRCC" (`web/src/runtime/
submission.tsx:50`), which lists every submission group and filing, and its header says the C7.7 tab will host that panel. So
the fee block goes **inside that panel, at the foot of each group** (challenge M1, Q1), where the tab will put it: it moves
into the tab with the panel. One component, never a second list of filings.

## Part A. C6.12-25: the fee block in "Submission to IRCC"

### 1. Job and journey
* **Job:** the case officer sees what each submission costs, line by line, why, and on whose filing it is paid, before
  preparing and recording it.
* **Persona:** the case officer (the case page is officer-only; the client never sees it).
* **Journey:** J7, a new step after the people are on the case (J7 has no fee step today, m8): Cases › open the case ›
  "Submission to IRCC" › each group's "Fees".

### 2. Layers
| Layer | Exists (main ffcfb45c8) | New here |
|---|---|---|
| Engine, data | filings, groups, fee lines, totals, basis (`engine/runtime/filings.ts`, `samples/fee-table.json`) | none |
| API | `GET /runtime/cases/:id/prepare` (`api/src/case-prepare.ts`): `fees[]`, `groups[].totals[]`, `total_cents`, `basis`, `fees_worked_out`, `fees_why`, `not_filing[]` | two additive fields in `case-prepare.ts` (M3-only): `amount_words: null` on a waiting line (M2), `groups[].total_words` (m2) |
| UI | "Submission to IRCC" lists groups and filings, never fees | **the fee block** `web/src/runtime/fees.tsx`, rendered at the foot of each group in `submission.tsx` |
| Rules, AI, governance | none | none (read-only, US$0, no AI) |

### 3. Business rules (each shown from the API, never computed by the page)
* **BR-1 Fee lines per filing** (tab BR-7): under a "Fees" sub-heading at the group's foot, the group's `fees[]` lines grouped
  by their filing (the filing's `label` once, m5): the line's `line` ("Visitor visa fee"), the person when not the filing's
  owner, `amount_words`, and `reason` as the API says it ("Family maximum CAD 170 for the 3 people applying together, paid on
  this filing"; "Covered by the family maximum …"; "Under 14: no biometrics (…)"). An exempt line shows its CAD 0 and reason,
  never hidden. A filing with no fee line (a sponsorship whose fees the table places on the principal's filing) shows no fee
  row: the `basis` sentence says why (M4). No mode words of its own (M4).
* **BR-2 Totals:** each `totals[]` line with its `why` ("4 × CAD 100 = CAD 400; the family maximum CAD 500 starts at 5 people
  applying together"), then "Total for this submission: {total_words}". The page adds nothing up and formats no amount.
* **BR-3 No amount where none is known:** `fees_worked_out: false` → `fees_why` and no amount, never CAD 0 (`total_cents:
  null`). Not derived is SubmissionPanel's own message today (m6): the block adds nothing there.
* **BR-4 A line waiting for a fact** (G15): the API's reason ("Waits for Child's date of birth: … Not counted until it is
  answered.") and no amount (`amount_words: null`, M2); the total leaves it out (API).
* **BR-5 No fee, with the reason:** each `not_filing[]` person of the case (not travelling, no filing set, no application to
  be on) is listed once under the case's first group with the API's `why` ("Not travelling (not applying on this case): no
  filing and no fee."), so nobody vanishes (M3). A declared-only person is on their filing's applicants and has no fee line;
  the block names them "Declared only: no fee" from the filing's `applicants[].mode` (M3).
* **BR-6 Sources and Sample:** the `basis` sentence once per case at the foot of the first group ("… Sample until the
  immigration expert confirms (P-171) … Paying is not built."); each distinct source once per group (m3): its page name as a
  link, and its `read` value as given (a page date stays labelled as the API gives it). No pill of the page's own (m1).
* **BR-7 Read-only:** no button. Paying is not built; the number and receipt stay with "Record the submission" (C8.2).

### 4. Layout (1440 px; 1024 px the same, stacked)
Inside each group section of "Submission to IRCC", after the filing list: a sub-heading `h4` "Fees" (id `fees-{group}`, m4),
then a table with a `caption` (visually hidden: "Fees for {group label}"), columns Fee · Amount · Why (three columns, m5);
rows grouped by filing with a row header per filing. Then the totals' why lines and "Total for this submission". Long names
wrap (`overflow-wrap:anywhere`); no sideways scroll at 1024 px.

### 5. States
loading and error: SubmissionPanel's own · fees not worked out (`fees_why`) · nobody applying (`why`) · a waiting line · an
exempt line · a declared-only person · a person with no filing · a split group (two blocks, each its own lines and total) · a
sponsorship (no line on its filing; the basis says where) · long names.

### 6. Copy
"Fees" · "Total for this submission: CAD 570" · "Declared only: no fee" · the API's `reason`, `why`, `basis`, `fees_why`,
`total_words` as they are.

### 7. Contract and tests
**Contract:** the existing read plus the two additive fields (BR-2, BR-4); types in `fees.tsx`, never in `studio/contracts/`
(hot). The two query keys for one read (`submission.tsx:50` and `out-of-date.tsx:23`) are left as they are (m7; C7.7's).
**Tests:**
* `acceptance/C6.12-breadth.test.ts` -25 as written: it opens its own Visitor visa family case on `/cases/:id` and reads the
  page's text, so the block passes it without a tab (the tab row later amends it to click the tab).
* `tests/check_vv_prepare_api.ts` gains: a waiting line has `amount_words: null`; each group's `total_words` is the words of its
  `total_cents` (null when null).
* New `tests/runtime/check_c612_fees_browser.cjs` (one pass and one fail per rule, at 1440 and 1024 px, axe clean, no sideways
  scroll, keyboard reaches every link, no duplicate ids; data checked against the API in the same test). On the real copy
  (setup_visitor_visa + setup_vv_m3, as -25 runs): BR-1 "Visitor visa fee" CAD 100 under each filing, "Biometrics fee" CAD
  170 on the principal's / the under-14 child shows CAD 0 and IRCC's reason; BR-2 the page's total equals the API's
  `total_words` / no total the API does not give; BR-4 a child with no date of birth shows the waiting words and no "CAD" in
  its row; BR-5 a person taken off the trip is listed with the API's why; BR-6 the basis once and each source once per group;
  BR-7 the block has no button. The states the copy cannot reach (fees not worked out, a sponsorship, a split group) are
  checked by stubbing `/prepare` in the browser with the API's own shapes (M5), each with its fail.
* **The walk:** Cases › the checkpoint's Sample family case (SAMPLE-VV-FAMILY-1) › "Submission to IRCC" › Fees, by clicks, at
  1440 px, on a fresh configured checkpoint.

### 8. Files (all M3-only; none on `product/tools/m2-hot-files.txt`)
New `web/src/runtime/fees.tsx`, `tests/runtime/check_c612_fees_browser.cjs`; modified `web/src/runtime/submission.tsx` (types
and one render line per group), `api/src/case-prepare.ts` (two fields), `tests/check_vv_prepare_api.ts`.

## Part B. C6.12-23: the child study question (options for the tech lead)
**What -23 asks:** a released student or worker combination with an accompanying child asks the case officer "Will this child
study 6 months or more?" (P-171 (5), the founder's rule where IRCC is silent: Sample, no age rule); Yes adds a study permit
filing (CAD 150 per person, no family maximum, cited) at the same time; No adds none.

**Why it cannot pass on the checkpoint today:** the released student and worker combinations of the six have no child line
(`samples/wave1.json`: `sp.outside` principal and representative; `wp.lmia_inside` principal, spouse, representative); adding
one changes the six that M2's setup capabilities count on (P-343 (3)); the checkpoint's release steps are in `api/src/demo.ts`
(hot). `wave1.json` is not hot, but it is M2's six (m10: `rows.md` lists it as M3-only; it is not, in effect).

**Shape of the build (any option), after the challenge:**
* **The rule is released configuration (M6):** the child line of the combination says "adds a filing when {library fact} is
  Yes", set through the studio's steps, so it is frozen in the release snapshot. The fee table only prices it
  (`study_permit`). Saving a new key on a participant line goes through `api/src/studio.ts` `checkParticipants` (hot): it
  needs the tech lead's hot-file line.
* **Scope (M7):** a study permit is its own application, and a case holds one release pin (`api/src/runtime.ts:57`). So -23
  here is the question, the filing and its fee line; the filing's items (forms, documents) are shown Not built, and C6.12 stays
  Partial saying so. A linked combination (a second pin) is its own row with a design first. -23 is amended to check: Yes gives a
  study permit filing with its CAD 150 line; No gives none; unanswered, it waits (as G15). The API has no "waiting filing" yet:
  that state is new (m10).
* **Example (M8):** `sp.outside` with an accompanying child (the student from outside Canada, as `rows.md` and the research plan
  it), not the worker inside Canada, whose child's need for a study permit nobody has checked. The question's words stay
  Sample.

* **Option 1 (recommended): after M2 reaches 60**, an accompanying child line on `sp.outside` in `samples/wave1.json`, the
  question placed on the checkpoint's steps (`demo.ts`, by its owner or with the tech lead's hot-file line), the release rule
  (`studio.ts`, hot-file line), then the engine, API and amended pack in one PR. Works on the checkpoint (P-322).
* **Option 2: now, on a fixture:** a new `acceptance/lib/setup_sp_m3.ts` (the name `rows.md` uses) releases a study permit
  combination with a child through the configuration routes; engine and API built and tested; -23 stays red on the checkpoint
  until option 1's data lands (Partial only). Still needs the `studio.ts` line for the release rule.
* **Option 3: ask the immigration expert first.** P-171 (5) is already the founder's answer where IRCC is silent (m10), so this
  only delays; not recommended.

## Questions (for the tech lead)
1. Approve Part A: the fee block at the foot of each group in "Submission to IRCC", which the C7.7 tab hosts later, with the two
   additive fields in `case-prepare.ts`?
2. Part B: option 1, 2 or 3? Recommend 1 (on `sp.outside`, rule on the release, -23 as question, filing and fee).

## Response to the challenge (r1 → r2)
* **M1** accepted: the block goes inside SubmissionPanel's groups; BR-1 of r1 (filings and the number box) dropped. **M2**
  accepted: `amount_words: null` on a waiting line, and a fail test. **M3** accepted: BR-5 lists `not_filing[]` and
  declared-only people with the API's words. **M4** accepted: no "no fee of its own" row and no mode words; the sponsorship
  state is reached only by a stub until `fs.spouse` is released (B79b, #1052). **M5** accepted: stubs for unreachable states;
  layout, keyboard, axe and duplicate-id checks; the walk on SAMPLE-VV-FAMILY-1, while -25 keeps its own case. **M6, M7, M8**
  accepted in Part B's shape and options.
* **m1** pill and header line dropped · **m2** `total_words` from the API · **m3** each source once per group, `read` as given ·
  **m4** caption and prefixed ids · **m5** three columns · **m6** not derived left to SubmissionPanel · **m7** left (C7.7's) ·
  **m8** a new J7 step, named · **m9** deviation stated above · **m10** taken in Part B.
