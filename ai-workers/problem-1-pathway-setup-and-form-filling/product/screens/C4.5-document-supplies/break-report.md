# C4.5 · Facts this document supplies — break report

Breaker: an independent agent that did not build it, 5 Nov 2026 (IST). Target: PR #1005 at **ec43f2a89** (API, contracts, Preview key, change-page block). The editable panel was out of scope (concept awaiting approval). Copy: `isolated.sh c45br 4454` and the six through `acceptance/C4.5.test.ts` (26/26 green), then the suites' fixture (`demo/load {}`) for published fields and releases. Live AI was off; US$0.
Note: the builder committed **4f6ab2f48** (panel, GET view) in the same worktree during this run. That commit leaves `propose`, `applySupplies` and `releaseSupplies` unchanged, so every finding below still applies to it.

## Findings

### Major
**M1 · A field merged through the real merge is accepted as a fact and approved.**
* Steps (fixture): `POST /library/merges {keep:"person.citizenship", merge:"person.country_of_birth", …}` (user-A), then approve it as user-B. The field now has v1 PUBLISHED (merged_into_key null) and v2 RETIRED (merged_into_key person.citizenship). Then `POST /library/document-types/passport_or_travel_document_information_page_photocopy/supplies` with `person.country_of_birth` (user-A) and approve as user-B.
* Expected: 409 "Merged" (BR-4), at proposal and again at approval.
* Actual: 201 WAITING. After approval the draft v2 supplies `person.family_name, person.country_of_birth`: a redirect key that no question asks any more, since the merge moved the placements away from it.
* Cause:
  * `api/src/document-supplies.ts:58` counts a field as merged only when *every* version carries `mergedIntoKey`. The real merge (`api/src/forms.ts:368–369`) sets it only on the new RETIRED version.
  * `refuseRetired` (`library-items.ts:137`, `stateOf`) sees the older version still PUBLISHED, so it says "not retired".
  * `applySupplies` (`:102`) has no merged check at all.
* The pack and the release check miss it because `tests/check_c45_supplies_release.ts` marks *all* rows merged with SQL, which is not the product's path.

**M2 · An approved change can get stuck for good: it is never released, and nobody can withdraw, return or replace it.**
* Steps (the six): `marriage_certificate_copy` is used by 0 combinations. Propose 1 fact (user-A) and approve it (user-B). It becomes APPROVED.
  * `withdraw` returns 409 "Cannot withdraw".
  * `return` returns 409 "Already decided".
  * A new proposal, even `{facts:[]}` to undo it, returns 409 "Already waiting".
* Why it never ends:
  * Only a combination release whose snapshot names the type publishes its draft (`studio.ts:1189`).
  * `releaseSupplies` (`:110–121`) releases the change only when the published facts equal `after`.
  * `OPEN` includes APPROVED (`:19`), and withdraw covers WAITING and RETURNED only (`library-changes.ts:216`).
* Other paths to the same dead end (from reading the code, not run):
  * Approve a change, then merge one of its facts. The merge rewrites the draft (`forms.ts:388–390`), so the published facts never equal `after`.
  * Approve a change on a type whose ADD is later withdrawn (challenge m4).
* The concept's BR-5 and BR-6 have no way out for the author. A wrong approved set cannot be corrected until some combination that names the type is released.

**M3 · The second person sees field keys, not names, for the facts the type supplies now and the facts a change removes.**
* Steps (fixture): propose new passport facts that drop 8 of its 10 current facts, then open `GET /library/changes/:id` or `/review/change/:id`.
* Expected: names, as for added facts (EXPERIENCE §5: no IDs; challenge m2).
* Actual: `before` and `removed` read `person.given_names, person.sex, person.date_of_birth, …`. The same keys appear in the To review `what` line ("removes person.given_names, …").
* Cause: `suppliesView` names a fact only from the new `cites` (`document-supplies.ts:85`), so a fact that is only in `before` falls back to its key.
* On the six the "before" set is always empty, so the pack never shows this. It matters most when the approver is deciding a *removal*.

### Minor
* **m1 · Impossible dates are accepted.**
  * `readOn: "2026-02-30"` → 201, stored as is.
  * `"0001-01-01"` → 201.
  * `"2026-13-01"` → 400 with the wrong words: "cannot be in the future".
  * Cause: `contracts/document-supplies.ts:148–150` uses `Date.parse` (V8 rolls Feb 30 over to Mar 2).
* **m2 · Invisible or meaningless text passes as the official words and the reason.**
  * Source, quote and reason made only of U+200B (zero-width spaces) → 201.
  * `source:"abc", quote:"xyz"` → 201.
  * The min lengths count characters, not letters (compare the merge's letters-or-digits rule, `forms.ts:305`).
  * BR-3 ("form, edition, page") is not checked even for shape.
* **m3 · Hostile text on the change page.**
  * At 1024 px, a 400-character quote with no spaces makes the page 3,655 px wide; at 200 % zoom it is 3,423 px wide on a 512 px viewport. The `<li>` has no `break-words` (`web/src/pages/review-items.tsx:91`).
  * A U+202E (right-to-left override) in a quote reverses the rest of its line ("txet edirrevo LTR", the closing quote mark flipped). The approver reads spoofed words.
  * Script and HTML are escaped (held).
  * Screenshot: `/private/tmp/claude-501/-Users-ranjansingh-Desktop-Xpatready--claude-worktrees-qa2-2026-11-04-e3ae2d/6271d9b3-d4c0-46cf-9d0f-38427010f3e6/scratchpad/br/shots/change-1024-z1.png` (scratch, not committed).
* **m4 · The "no question asks it" warning checks the whole library, not the combinations that use the type.**
  * `warnings` is empty when any section anywhere places the fact (`document-supplies.ts:75`).
  * On the fixture's `wp.family`, Preview › Try it missing on the principal's passport empties "From documents", but *asked* stays 83 and the questionnaire's 305 facts are identical. None of the 9 facts is a client question there, so nothing is "asked instead", and nothing says so.
* **m5 · `holder.parent` facts are accepted and shown, but Preview's skip never treats a parent's fact as supplied.**
  * `preview.ts:97` builds the holders from `holder` and `holder.spouse` only.
  * A parent fact therefore always stays asked in Preview, while the Smart questionnaire tab (engine `documentFacts`) counts it from documents. Read in code; not run on data that has parents.

## What held
* **Roles:** propose as user-B, user-C, user-O, user-R or user-T → 403; no header or an unknown person → 401.
* **Self-approval:** the proposer cannot approve (403). `appliedBy` is null, so applying is not approving.
* **Wrong values:** an unknown, upper-case or unknown-type key → 400 or 404. Spaces around a key are trimmed and then caught by "Listed twice". An extra property, a bad `about`, or `facts` that is not a list → 400 in words.
* **Concurrent proposals:** 10 at once on one type → exactly 1 × 201 and 9 × 409.
* **Concurrent decisions:** B approve, C approve and B return at once → one APPROVED, two 409, one draft, one apply.
* **A change racing a release** (fixture `wp.family`, delays 60, 120, 160 and 300 ms):
  * Either the release is refused ("changed while it was being released") or it goes out first and the change stays APPROVED with its draft.
  * The released snapshot never carries facts the expert did not sign, and no change was marked RELEASED with nothing applied.
* **No draft leak:** after approval, `config?mode=published` and Preview `release=1` keep the released facts; only the draft changes.
* **Preview tweaks:**
  * Only the boolean `true` marks a document missing (`"true"`, `1` and arrays are ignored), and bad JSON → 400 in words.
  * A key for a person not in the family changes nothing. In `wp.family`, the spouse's key changes only the spouse.
  * A `missing:` key never becomes an answer.
* **Sizes and scripts:** 100 facts with 400-character unicode quotes (126 KB) → 201 in 393 ms; 101 → 400. A path key carrying SQL or `../` → 404.
* **Keyboard:** on the change page, Tab reaches the reason box and Approve; Return stays disabled until a reason is written.

## Round 2 (462fda78e)
Same breaker, 5 Nov 2026 (IST). Scope `git diff ec43f2a89..462fda78e`: the panel, the round-1 fixes, the returned path. Copy `isolated.sh c45br 4454` + `setup_c45_walk.ts` (Visitor visa), then `demo/load {}` for the release race; Playwright (chrome) at 1440, 1024 and 512 px; live AI off, US$0; copy stopped. Round 1: **M1 fixed** (merged field refused at proposal and at approval, PUBLISHED v1 + RETIRED v2 case), **M3 fixed** (before, removed and the To review line read names), **M2 only partly fixed** (R2-M1), m1 fixed, m2 partly (below), m3 fixed (change page 1024 px wide; U+202E stripped); m4, m5 not re-tested (not in this diff).
### Major
* **R2-M1 · An approved change is still stuck for good once one of its facts is merged** (round-1 M2, second path). Steps: propose `marriage_certificate_copy` = family name + `person.birth_country` (about the spouse), user-B approves; merge `person.birth_country` into `person.citizenship` (user-A, user-B approves). Then withdraw → 409 "facts changed after this was approved … Refresh"; new proposal → 409 "its proposer withdraws it"; return → 409 "already approved"; a release never marks it (published ≠ `after`). The panel still says "To change it again first, withdraw it". Cause: `withdrawApprovedSupplies` compares the draft with `after` (`api/src/document-supplies.ts:157–158`), and the merge rewrites the draft (`forms.ts:391`). The merge also drops whom it is about: the spouse's birth country became the holder's citizenship (`supplies_about` keeps the old key).
* **R2-M2 · After withdrawing an approved change, the panel shows the withdrawn facts as the current ones.** Steps: approve 1 passport fact (399-char quote); user-A opens the panel from Library › Document types, writes why, Withdraw. The API now has no facts, but the panel shows the withdrawn chip and quote as "Official line 1", Send is enabled, and Escape asks "Discard the facts and words you changed?" although nothing was typed. Sending would propose the set just withdrawn. Cause: `setCards(null)` and then the cards are rebuilt from the stale `v.data` before the refetch lands (`web/src/pages/supplies-panel.tsx:41`, `:59`). Screenshot: scratch, not committed: `/private/tmp/claude-501/-Users-ranjansingh-Desktop-Xpatready--claude-worktrees-qa2-2026-11-04-e3ae2d/6271d9b3-d4c0-46cf-9d0f-38427010f3e6/scratchpad/r2/shots/after-withdraw-1024.png`.
* **R2-M3 · Withdrawing an approved change leaves no trail and erases the approval on the change.** It reverts the library draft of every combination that names the type, but writes no audit event (count of `withdrawn` events 0 after it; `withdrawLifecycle`, `lifecycle.ts:541`, does write one). It also overwrites `decided_by` and `decision_note`: the change page reads "decided by Configuration author", and the approver's note is gone (`document-supplies.ts:160`).
### Minor
* **Panel:** Cancel discards edits without asking (Escape and X do ask; `supplies-panel.tsx:70`). A line with words but no fact is dropped at Send without a word (`:48`). Merged and retired fields are offered, because the filter runs before the newest version is taken (`document-supplies.ts:61`, e.g. `person.applying_from_status_to` v1 PUBLISHED, v2 merged); the refusal comes only after Send.
* **Focus and layout:** picking a field with Enter moves focus to the dialog; closing moves it to `<body>` (no `returnFocus`). A long name without spaces runs under the close X and off the panel (dialog scrollWidth 1253 vs 559 at 1024 and 512 px; scratch, not committed: `/private/tmp/claude-501/-Users-ranjansingh-Desktop-Xpatready--claude-worktrees-qa2-2026-11-04-e3ae2d/6271d9b3-d4c0-46cf-9d0f-38427010f3e6/scratchpad/r2/shots/longname-512.png`).
* **The cleaning (m2) has gaps:** four U+3164 (invisible) pass as a quote; `abc`/`xyz` still passes (BR-3 shape). NFKC rewrites the official words: "ﬁrst m² １２" is stored as "first m2 12" (`contracts/document-supplies.ts:14`; P-170 wants them verbatim).
* **Wrong words:** of 5 withdraws at once, one loser reads "facts changed after this was approved". A second withdraw reads "Only … waiting or returned is withdrawn" (`library-changes.ts:224`), no longer true. `?combination=` with 36 hex digits and no dashes → 404 "Not found (it may have been removed by a reset)".
### Held
* **Roles:** user-B and user-C see no button in the drawer or the Library. Withdraw as user-B or user-C → 403; the author approving → 403; GET as a case person → 403, as nobody → 401.
* **Repeats and races:** 5 withdraws at once → one 201; a later withdraw → 409. Withdraw racing a release (0, 150, 400, 1500 ms) always ends consistent: either the release is refused and the change is WITHDRAWN, or the change is RELEASED with a 9-fact snapshot and the withdraw gets 409. Send or a suggestion double-clicked → one POST or one chip.
* **Keyboard and returned path:** Approve by keyboard on the change page; Preview's toggle with Space, kept in the URL after a reload. Returned: user-C reads "Only Configuration author can … withdraw it"; user-A gets "Propose it again" and Withdraw, then lands on /review.
* **Long text and parameters:** a 399-character quote wraps in the panel and on the change page at 1024 and 512 px. `combination` with SQL, upper case, a zero UUID or an array is ignored or gives no prefill.
