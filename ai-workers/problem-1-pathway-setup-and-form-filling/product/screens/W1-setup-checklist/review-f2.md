# N8 (forms lane): F2 official-pages record and confirm, DV-d1-1, DV-d1-2: independent review (CHECK)

Reviewer agent, 31 Oct. Commit **0810c25e** on `claude/forms-n8-devin-06zafk`, compared with `origin/main` 48c8fbef. Isolated copies `rvn8` and `rvn8b` on :4457, each with its own empty ledger. US$0: the ledger stayed empty, no live switch was set and no priced button was clicked. Sources used: BACKLOG row N8, `inbox/2026-10-30-devin-d1-walk.md`, `plan.md` (F2), `concept-draft.md` §4, §5, §8 and §11, and DECISIONS P-156 (2), P-161 (3) and P-176. Journey test: `journey-test-reviewer-2026-10-31-f2.md`, the one score for this check.

Verdict: Ship after fixes

**Journey score 8 / 10.** It passes, and no criterion scored 0. The endpoint, the tier rule, the audit line and the two Devin fixes are right. Two Majors remain. The first: this change turns on a "Needs you · Confirm the checklist page" item, but no screen offers that action. The second: the configuration author can overwrite the immigration expert's choice of page.

## Checks run
* `check_official_pages.ts`: **25/25**. `check_forms_s4_library_browser.cjs` on a fresh copy, with the web built from the commit: **73/73**, including the four N8 DV-d1 steps. This run rewrote the slice3 screenshots. They were left as they were.
* Graph (`graph.mjs --check`): G1 0 · G2 0 · G3 2 · G4–G6 0. The two G3 routes are the old attachments routes, not this item's. Both new routes are reached by `check_official_pages.ts`, and neither is used by any page (`webUse: false`).
* Server probes on wp.family ("With an LMIA"):
  * 8 parallel author confirms → 8 × 201, **one row** (the upsert on unique `combination_id` holds) and **8 audit lines**.
  * A PDF instructions id → 400. A random UUID as the approver → 400. `[]` as the body → 400 with zod's own words.
  * GET as the case officer or the client → 403.
  * `GET /catalogue` → 195 ms.
* Browser walk:
  * Forms library: "2 combinations" is a link-style button, Tab reaches it, and Enter opens the drawer. axe at 1024 px is clean. No page errors.
  * As the configuration author, **Resume setup** on Visitor visa lands on `/c/…/forms?focus=pages%3Arecord`. That page has no Official pages block and no Confirm control. The header's "Next step" reads "Add 1 form from the library".

## Judgement on the deviation: proposal worked out on read, only confirmations stored. **Accepted.**
The plan said to back-fill each combination as *proposed*. Without the back-fill, every reader sees the same states: no record, proposed (n matches), confirmed. There are fewer ways to go wrong. No proposal row can go stale when a source is attached or detached, and no back-fill migration has to be kept in step with later attachments. The concept's "Not built: step 1 reopened by a rules refresh" also holds: once confirmed, step 1 stays done while that page is attached, and it reopens only when the confirmed page goes (tested).

The cost: there is no stored "date checked / proposed by rules" (concept §1 Links). `confirmedAt` and `matches` (stored at confirmation time) cover the audit side. **For the Lead:** record this as an agreed deviation in `plan.md`, which still says "back-fill".

## Judgement on the matching rule. **Accepted, with one watch point.**
* **"Web page" counts as the one apply page.** This attachment kind is set only for recognised files from the official manifest's `web-pages/` folder (`api/src/sources.ts:36,116`). Any other upload becomes "Unrecognised file". So a match is in practice "a canada.ca page" (P-176).
* **"Instructions" HTML can be chosen.** Guide pages are canada.ca guide editions linked from the library (`api/src/guide-sources.ts:24`). Choosing one is always on the expert's tier (`engine/official-pages.ts:31`), which is P-176's "Choose another".
* **PDFs are not pages.** That is right: an office's instructions PDF is not a page.
* **Watch point:** the rule trusts the kind and not the page's role. A future `web-pages/` capture that is not an apply page (for example a processing-times page) would become a second "match" and send the item to the expert. That is the safe direction, so this is not a finding.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | F2 as asked: record, tier, `mayAct` imported, 403 in words. DV-d1-1 and DV-d1-2 fixed. Step 1 becomes actionable with no screen to act on (M1). The concept's done rule asks for "an apply page and at least one checklist", but the record holds one page (s1) |
| D2 Data integrity | 3 | One row per combination under a race. 400 for a page of another combination. The author can overwrite the expert's record (M2). No foreign key to the combination (m1) |
| D3 Reuse | 5 | Uses the checklist's own `mayAct` and `OfficialPages` type. One reader, `officialPagesOf`, for the catalogue, the summary and GET |
| D4 Rule integrity | 3 | Tier per P-176 (one match → author, anything else → expert). The tier is not kept against later overwrites (M2) |
| D5 Stability | 4 | Double and parallel confirms are safe. Detaching the page reopens step 1. A demo reset clears the table. Re-confirming is not idempotent: it writes a new audit line and moves `confirmedAt` (m2) |
| D6 Freshness and governance | 4 | Who, which tier, which page, how many matches and when are stored and audited. The audit line says "sure / not sure" |
| D7 AI trust | 5 | No AI on this path (P-156 (2): rules propose, a person confirms) |
| D8 Orientation | 4 | Unchanged. The landing URL carries `focus=pages:record`, but nothing on the page answers it (M1) |
| D9 Flow | 2 | Needs you and Resume setup point to "Confirm the checklist page", which cannot be done on screen. The header's Next step names something else (M1) |
| D10 Language | 4 | The 403 and 400 messages say who confirms and why (P-176). A `[]` body gets "Invalid input: expected object, received array" (m3) |
| D11 Feedback | 3 | The checklist shows step 1 done after a confirmation. There is no on-screen feedback, because there is no on-screen action (M1) |
| D12 Visual | 4 | The Used-by count reads as a link, the same as Number, with no strike-through look (`02-list-1440.png`) |
| D13 Accessibility | 4 | axe clean, including the loading state (`role="status"`, `aria-busy`). Keyboard reaches the count and Enter opens the drawer |
| D14 Team look | 4 | `text-text-link` and the existing focus ring. No new component |
| D15 Speed | 4 | Two batched queries for all combinations (`official-pages.ts:23-26`). Catalogue 195 ms on the sample |
| D16 Testability | 4 | Each rule has a pass and a fail case (tier, duty, foreign page, missing page, reset). No test covers an overwrite of a stored expert choice (M2) |
| D17 First use | – | Simulated only |
| D18 Provenance | 4 | The audit says the rules found the page, or the expert chose it over n matches |
| D19 Capability closure | 2 | Step 1 can be completed only through the API (P-33). No screen closes it (M1) |
| D20 Wow | – | Simulated only |

## Issues, ranked
1. **Must · Major (M1): Needs you and Resume setup point to an action no screen offers.**
   * **What happens:** on main without this change, step 1 was "no record" and showed no item. With it, Visitor visa shows the author **Needs you · Confirm the checklist page**. Super visa and Study permit show the expert **Needs you · Choose the checklist page**. **Resume setup** lands on Forms `?focus=pages:record`, where there is no pages block and no Confirm or Choose control, and the header's Next step says "Add 1 form from the library". The cause is in `engine/setup-checklist.ts`: `confirm_pages` and `choose_pages` are in `REVIEWS` (line 49), and step 1 opens on Forms (`contracts/setup-checklist.ts:12`).
   * **Precedent:** this is the class of the card CHECK's M2, which the Lead fixed by holding `confirm_people` out of `REVIEWS` until a screen offers it.
   * **Fix:** do the same for `confirm_pages` and `choose_pages`, keeping step 1 open, until the "Before forms" block lands (slice B/C). Add a pass/fail step: no Needs you for a pages item while no screen offers it. Alternatively, the Lead records the gap as accepted until slice C.
2. **Must · Major (M2): the author can overwrite the immigration expert's choice.**
   * **Repro:** the expert chooses the Guide 5487 page over the rules' one match (201, `expert`). The author then confirms the match: 201, and the row becomes `user-A|author`. The expert's decision is silently replaced on a lower tier.
   * **Cause:** `confirmationOf` (`engine/official-pages.ts:31`) ignores the stored record, and `confirm` upserts over it (`api/src/official-pages.ts:60-67`).
   * **Why it matters:** P-176 makes "the rules' match passed over" the expert's call, and P-156 (2) says "a person confirms once".
   * **Fix:** when a confirmed record stands on the expert tier (or names a different page), any new confirmation is the expert's (`choose_pages`, expert tier). Add a pass case and a fail case.
3. **Should (s1): the done rule is narrower than the concept.** Concept §4, step 1: "the record has an apply page and at least one checklist". The record holds one page, and attached "Document checklist" files are not read. Either state in `challenge.md` that the confirmed IRCC page is the checklist page (the words already say "Confirm the checklist page"), or check for a checklist as well.
4. **Should (m1): no foreign key.** `OfficialPagesRecord` has no relation to `Combination` with `onDelete: Cascade` (`prisma/schema.prisma:383`). When an approved delete removes a never-released combination (`api/src/lifecycle.ts:421`), its row is orphaned. Other tables use the cascade relation. Because the migration only adds a table, adding the foreign key now is free.
5. **Should (m2): re-confirmation is not idempotent.** Confirming the same page again by the same tier writes a new audit line and moves `confirmedAt`: 8 lines for 8 identical clicks. Return the stored record unchanged when nothing differs.
6. **Should (m3): one 400 is not in plain words.** A non-object body gets zod's default text. Give `ConfirmPages` a root error ("Choose the page to confirm.").

## Could not check
* An intended user's unaided walk (D17, D20).
* A real screen reader.
* 200 % zoom and keyboard-only on the step 1 action, because no screen offers it.
* The Overview strip, which is slice B.
* `check_setup_checklist`, `check_screen01_*`: the builder's counts are in the commit message; I did not re-run them.
