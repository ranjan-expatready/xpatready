# C6.12 breadth: fees on the case page (-25) and the child study question (-23): concept r1 (runtime lane, 5 Nov)

**For:** the tech lead's approval after an independent challenge (P-223 (4), P-316 (3)). **Rows:** C6.12-25 (a screen part),
C6.12-23 (options only). **Base:** main ffcfb45c8. Every amount is from `samples/fee-table.json` (cited, page, quote, date) or
Sample; nothing new is priced here. Unconfirmed: no counsel.

**Reuses, does not redesign:** the fee block BR-7 of the Prepare application tab addendum
(`../M3-design-2026-11-04/prepare-tab/concept-draft.md` r2, challenged in its `challenge.md` M3) and r5c BR-18
(`../M3-agent-view/`). The tab itself (C7.7) is a later row in the founder's order (C6.4, C6.12, then C7.7); this part ships
the fee block now, on the case page as built (stacked panels, `web/src/runtime/cases.tsx`), and the tab moves the same
component to the foot of each group when it is built. One component, never two versions.

## Part A. C6.12-25: Filings and fees on the case page

### 1. Job and journey
* **Job:** the case officer sees which applications the case files, in which submission, what each costs, why, and who
  pays, before preparing the forms.
* **Persona:** the case officer (the case page is officer-only today; the client never sees it).
* **Journey:** J7 steps 2.3 and 5.1 (`acceptance/journeys/J7-visitor-visa-end-to-end.md`): Cases › open the case › read
  "Filings and fees".

### 2. Layers: what exists, what is new
| Layer | Exists (main ffcfb45c8) | New here |
|---|---|---|
| Engine, data | filings, groups, fee lines, totals, basis (`engine/runtime/filings.ts`, `samples/fee-table.json`) | none |
| API | `GET /api/runtime/cases/:id/prepare` (`api/src/case-prepare.ts`): `filings[]`, `groups[].totals[]`, `fees[]` (`amount_words`, `reason`, `exempt`, `waiting`, `source_detail`), `basis`, `fees_worked_out`, `fees_why`, `derived`, `why` | none |
| UI | the case page never reads `/prepare` | **the panel** `web/src/runtime/fees.tsx`, one line in `cases.tsx` |
| Rules, AI, governance | none | none (read-only, US$0, no AI) |

### 3. Business rules (each read from the API, never computed by the page)
* **BR-1 Filings per submission group.** One block per `groups[]` entry: its `label` ("One submission for 4 people
  applying") and its `why`. Under it each filing of the group: its `label`, its mode in words ("Files own application",
  "On the principal's application", "Sponsorship: sent with the principal's application") and its application-number box
  read-only: "Application number: not recorded yet" until C8.2 records it (P-171 (4): each filing its own box).
* **BR-2 Fee lines per filing** (BR-7 of the tab): each `fees[]` line under its filing: the line's `line` label ("Visitor
  visa fee"), the person, `amount_words`, and `reason` as the API says it ("Family maximum CAD 170 for the 3 people applying
  together, paid on this filing"; "Covered by the family maximum …"; "Under 14: no biometrics (…)"). An exempt line shows
  "CAD 0" and its reason, never hidden (an exempt child's reason is in the block, challenge M3).
* **BR-3 Totals per group:** each `totals[]` line with its `why` ("4 × CAD 100 = CAD 400; the family maximum CAD 500 starts at 5
  people applying together"), and "Total for this submission: {total_cents in words}". The page adds nothing up itself.
* **BR-4 No amount where none is known:** `fees_worked_out: false` shows `fees_why` and no amount at all (never CAD 0);
  `derived: false` shows its `why` only; a case nobody applies on shows `why`.
* **BR-5 A line waiting for a fact** (`waiting`, G15): "Waits for {person}'s date of birth: not counted until it is answered"
  (the API's reason), with no amount in the total.
* **BR-6 Sources and Sample:** the `basis` sentence at the foot as the API gives it ("… Sample until the immigration expert
  confirms (P-171) … Paying is not built."), and per line a "Source" link to `source_detail.url` naming its page and read
  date. A pill "Sample amounts" in the header.
* **BR-7 Read-only:** no button. Paying is not built; the number is recorded at C8.2.

### 4. Layout (1440 px; 1024 px stacks the same blocks)
A card like the others on the case page, after "People on this case" and the eligibility card, before the forms panel:
header "Filings and fees" · pill "Sample amounts" · one line "Derived from the people on this case and the release; paying
is not built." Per group: group label and why; a table per group (caption = group label) with columns Filing · Fee ·
Person · Amount · Why; filings with no fee line (the sponsorship) still have a row ("No fee of its own: …" from the basis).
Then the totals lines and the group total; then the basis sentence. Long names wrap (`overflow-wrap:anywhere`).

### 5. States
loading (skeleton, `sr-only` "Loading filings and fees") · could not load (Notice with Retry) · not derived (`why`) · fees
not worked out (`fees_why`, no amounts) · nobody applying (`why`) · a waiting line · a split group (two blocks, each with
its own `why` and total) · long names.

### 6. Copy (key strings)
"Filings and fees" · "Sample amounts" · "Application number: not recorded yet" · "Total for this submission: CAD 570" ·
"Source: IRCC fee list (read 2026-11-02)" · the API's own `reason`, `why`, `basis`, `fees_why` as they are.

### 7. Contract and tests
**Contract:** the existing read only; no new route, no type in `studio/contracts/` (hot): types live in `fees.tsx`.
**Tests:**
* `acceptance/C6.12-breadth.test.ts` -25 as written (it reads `/cases/:id`, so the panel passes it without a tab; the tab
  row later amends it to click the tab, BR-7 of the tab).
* New `tests/runtime/check_c612_fees_browser.cjs`, one pass and one fail per rule, at 1440 and 1024 px, axe clean:
  BR-1 four filings in one group, each "not recorded yet" / a split person is in a second block with its own total;
  BR-2 "Visitor visa fee" CAD 100 on each filing, "Biometrics fee" CAD 170 on the principal's / the exempt child shows CAD 0
  and its IRCC reason; BR-3 the page's group total equals the API's `total_cents` / no total the API does not give;
  BR-4 a case on a combination with no fee rules shows `fees_why` and no "CAD" / never "CAD 0" as a total;
  BR-5 a child with no date of birth shows the waiting words and the total leaves it out; BR-6 the basis and each source
  link are shown; BR-7 the panel has no button. Data checked against the API in the same test.
* The walk: Cases › the checkpoint's Sample family case (SAMPLE-VV-FAMILY-1) › "Filings and fees", by clicks, at 1440 px.

### 8. Files (all M3-only; none on `product/tools/m2-hot-files.txt`)
New `web/src/runtime/fees.tsx`, `tests/runtime/check_c612_fees_browser.cjs`; modified `web/src/runtime/cases.tsx` (import and
one line). `cases.tsx` is M3-only but M2's K13 touched it on 2–3 Nov: the change stays one line.

## Part B. C6.12-23: the child study question (options for the tech lead)
**What -23 asks:** a released student or worker combination with an accompanying child asks the case officer "Will this child
study 6 months or more?" (P-171 (5), the founder's rule where IRCC is silent: Sample, no age rule); Yes adds a study permit
filing (CAD 150 per person, no family maximum, cited in the fee table) at the same time; No adds none.

**Why it cannot pass on the checkpoint today:** the released student and worker combinations of the six have no child line
(`samples/wave1.json`: `sp.outside` principal and representative; `wp.lmia_inside` principal, spouse, representative). Adding a
child changes the six that M2's setup capabilities count on (question counts, people's-steps lists, P-343 (3)), and the
checkpoint's release steps live in `api/src/demo.ts` (hot, off-limits to this lane).

**Shape of the build (any option):** the question is a library fact asked of the case officer per child (Sample words),
placed on the combination through the studio's own steps, so it is in the release snapshot (released configuration, not
code); the fee table's combination says, as data, that a Yes on that fact adds a filing priced by `study_permit`, in the same
submission group; an unanswered question makes the child's filing wait, never guessed. Engine: `engine/runtime/filings.ts`
(pure tests), `api/src/case-prepare.ts` passes the answer. No form or combination number in code (P-319).

* **Option 1 (recommended): after M2 reaches 60**, add an accompanying child line to `wp.lmia_inside` in `samples/wave1.json`
  and the question to the checkpoint's steps (`demo.ts`, by its owner or with the tech lead's hot-file line), then the
  engine and the pack in one PR. Works on the checkpoint (P-322).
* **Option 2: now, on a fixture**: a new `acceptance/lib/setup_wp_m3.ts` releases a worker combination with a child through
  the configuration routes; the engine and API are built and tested; -23 stays red on the checkpoint until option 1's data
  lands (Partial only).
* **Option 3:** wait for the immigration expert before any build (P-171 (5) is Sample).

## Questions (for the tech lead)
1. Approve Part A (the fee block on the case page now, moved into the tab by C7.7)?
2. Part B: option 1, 2 or 3? Recommend 1, with 2's engine built now only if the lane is otherwise idle.
