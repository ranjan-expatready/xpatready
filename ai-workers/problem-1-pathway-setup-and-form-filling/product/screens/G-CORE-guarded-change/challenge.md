# G-CORE: independent challenge (screen-concept B, 2 Nov 2026)

Challenger: a fresh agent that did not draft the concept. Read: `concept.md`, `decisions/P-253-guarded-change.md`, P-96/P-97 page, DECISIONS rows P-249, P-251, P-252, P-253, P-255, P-258, P-121, P-116, P-158, BACKLOG G-CORE and SH2, STANDARDS §4–§7, EXPERIENCE §46, and the code named below at HEAD `12647032`. The SH2 files `api/src/where-used.ts` and `engine/where-used.ts` are new, uncommitted files in this copy (B0 in progress), so they are read as a draft. The `library-sources.ts` line numbers are from this copy, where SH2 has modified the file. `ai-workers/tools/freshness.sh` fails in this cloud copy (no `code/`), so the team's sources it cites (SA-1B-292) are **Unverified**.

## Verdict
**Build after these changes.** The "one door" can be built without breaking the existing suites. Three things have to change for that: (1) the duplicate rule keeps each flow's own scope; (2) the stale-preview guard is optional on the existing URLs; (3) the expert step stays at release review. The risk table does not follow P-253 faithfully. R5–R8 are partly new code, not reuse. Roll-back is out of P-253's "Now", and it cannot be built as described for merges. No Blocker.

## Objections
### Major
**M1. The risk table is not a faithful reading of P-253, and its expert tier rests on a rule that does not exist.** *Needed for the proof* (Done when: "review tier follows the risk table").
- *Facts (high confidence):*
  - P-253 says "anything used by a released combination: a second person". The concept leaves that out of BR-4 and moves it to Q1, recommending "direct" and asking the tech lead.
  - P-96 says a rename is direct (decisions/P-96-P-97.md:6). P-253 is newer and says otherwise. That conflict between two founder decisions is the founder's to settle.
  - P-96 says nothing about the immigration expert (P-96-P-97.md:5-6). The concept's expert criterion, "a condition or document rule on a released combination", is invented.
  - The expert's sign-off already exists at release review: `engine/validate.ts:188` marks rules, document requirements, checks and AI-made items `needs_sme`, and `api/src/studio.ts:877-880` requires the `sme` duty for them.
  - An expert gate at approval breaks an existing suite. In `tests/check_forms_c411_draft_qd.ts:207` the approver (user-B, no `sme` duty, `api/src/core.ts:36`) approves a placement condition.
- *Fix:*
  - The tier "expert" means the existing release-review SME sign-off. The panel says it in words ("Waits for a second person; the immigration expert signs it at release"). No new gate at approval.
  - Put Q1 and the missing P-96 reference to the founder (Questions 1 and 3).

**M2. R3 as one duplicate rule contradicts two existing scopes, so "same result for person and AI" and "suites unchanged" cannot both hold.** *Needed for the proof.*
- *Facts (high confidence):*
  - A field rename checks only its own group (`api/src/library-sources.ts:178-179`). `tests/check_s6_library_sources.ts:138-139` asserts that the same name in another group is allowed.
  - `sameInLibrary` checks fields across the whole workspace (`api/src/proposals.ts:71-74`).
  - A section rename is checked against retired titles too (`library-sources.ts:197-201`). `sameInLibrary` checks DRAFT and PUBLISHED only.
- *Example:* an AI proposes a new field "Last name" in the case group. It is refused because person.family_name is called "Last name". A person can rename case.application_date to "Last name", and that is allowed.
- *Fix:*
  - R3 becomes one engine table keyed by action and kind: rename checks within the group, a new item checks the whole library, sections keep today's set. Each row gets a pass and a fail test.
  - "Same result" then means same action and same items.
  - Keep the wording the suites match ("already the name of", "already in the library as").

**M3. "Preview before confirm" is not enforced through the existing doors, and the check is not re-run at the second person's approval.** *Needed for the proof.*
- *Facts (high confidence):*
  - The C3.15 suite sends `PATCH …/name` with `{name}` only (`check_s6_library_sources.ts:132`). Making the fingerprint required changes that suite. Making it optional lets a caller skip the guard. The concept says neither.
  - The second person's approval happens later, and the library may have changed by then. Today `approveMerge` re-checks (`api/src/forms.ts:325`) and so does `applyCondition` (`question-condition.ts:61`). BR-2 and BR-3 do not say that the change set's R1–R8 run again at approval.
- *Fix:*
  - Add an optional `expected` fingerprint on the existing URLs, answering 409 when it is present and stale.
  - The three web hosts always send it, and a test proves they do.
  - Run R1–R8 again at approval and refuse with words.

**M4. A merge carries no condition, but it rewrites conditions, so "R5–R8 only for items that carry a condition" misses the anomalies a merge creates.** *Needed for the proof* (merge is a first user; the founder's "doesn't … create any anomaly in the rule engine").
- *Facts (high confidence):*
  - `approveMerge` swaps `"field":from` for `to` in question placements, form and document conditions, rules and checks (`forms.ts:339-352`).
  - `proposeMerge` checks only that the value types match (`forms.ts:296`), not the answer lists.
- *Example:* a check `from = "A" and to = "B"` becomes `to = "A" and to = "B"`, which can never be true. Merging two choice fields leaves conditions comparing the kept field with codes that are not on its list.
- *Fix:* for a merge, run R5, R7 and R8 on every condition the swap would rewrite, before and after, and report only the new problems. This stays pure: the API passes the trees in.

**M5. R5–R8 are partly new code presented as reuse, and R7's "gap" is not what a decision-table verifier means by a gap.** *Needed for the proof* (the row text names conflict, redundancy, gap and loop).
- *Facts (high confidence):*
  - `engine/eligibility-gates.ts:63-66` says `valueProblems` does **not** catch: a contradiction across or/not, ranges that cannot meet, or "an answer-list code that is not on the fact's list (… checked by nobody yet)". So R7 is new code. R6's "sub-tree repeated" is new code too.
  - `askedInOrder` needs one combination's `Snapshot` (`validate.ts:135`). A library question's condition applies to every combination that picks its section (`question-condition.ts:42`). The concept does not say which snapshots R8 reads.
- *Fix:* say what each rule really is.
  - R5 exists (`valueProblems`).
  - R6 is new but small: a `canonical()` twin on the same target, or a repeated sibling.
  - R7 is new: a value not on the fact's answer list, reusing the list match in `qd-conditions.ts:35-40`. Name it in words: "a condition that can never be true".
  - R8 exists. Use the before/after diff from `qd-conditions.ts:64-67`, run on the draft snapshot of each combination that uses the section.
  - State what is not checked: coverage gaps, ranges, and or/not contradictions.

**M6. Over-scoped against P-253 "Now" and the BACKLOG Done-when, and roll-back of a merge cannot work as described.** *Not built.*
- *Scope (high confidence):*
  - P-253's "Now" is the pipeline, the rules check, the where-used preview and review by risk.
  - The Done-when names no roll-back, history or counts. §6b's claim that roll-back is in "Done when" is false.
  - P-255 budgets about 4–5 builder-days for G1–G4 and G-CORE together.
- *Feasibility (high confidence):*
  - `revise()` updates a DRAFT row in place (`api/src/core.ts:132`), so a draft has no "version before".
  - A merge also moves sample facts with `updateMany` (`forms.ts:354`), edits derived fields in place (`forms.ts:353`) and joins the aliases (`forms.ts:328`).
  - BR-6 would need before-images, not row versions.
- *Fix:*
  - Cut roll-back (founder Q2), `GET /api/change-sets?item=`, `/counts` (D1 can read the stored `made_by` later) and the public `POST /api/change-sets`.
  - The existing URLs are the confirm doors. A second public door would bypass the guard M3 adds.
  - Keep `POST /api/change-sets/check` for the preview.

### Minor
- **m1 Open cases.** The draft `openCases` counts cases per combination (`api/src/where-used.ts:88-89`), not per pinned release. A case pinned to an older release that lacks the item is still counted. The claim "stays on release N" is true: every case pins at open (`runtime.ts:104`, one pin per case and combination) and there is no ADOPT. Fix: group `PackWorkPin.configReleaseId` and intersect it with `itemReleases`. *Needed for the proof.*
- **m2 Preview groups.** The preview has no "Rules" group, though P-253 step 4 lists rules and a merge rewrites them. Fix: add it from SH2 `fieldUses`. *Needed for the proof.*
- **m3 To review.** "Direct … listed on To review": To review lists no renames today (`api/src/review-queue.ts`). The release review's diff already lists field changes (`validate.ts:200`). Fix: name that diff as the listing, or add `review-queue.ts` to B2's files. *Needed for the proof.*
- **m4 P-251 holds.** Bulk accept is held (P-251, SA1B-D77). Say it stays as built: one change set per item, as P-121's "one approval per item", with no new bulk behaviour. Drop the engine tests for a person's create (P-252 (3) is held). A by-hand create stays the existing 410 `noFreeAdd` (`library-sources.ts:22`), not a new 409. *Not built.*
- **m5 C11.9.** BACKLOG:61 says C11.9 retire and restore "goes through G-CORE". Q2 keeps retire out, so C11.9 stays not-ready until M3. Say so and update that line. *Needed for the proof (records).*
- **m6 Copy.** The copy shows a field code ("field person.family_name") and a decision number ("(P-251)"). EXPERIENCE.md:46 and PRODUCT.md:48 forbid both. Fix: use the field's name, and "waits for the product owner's ruling". *Needed for the proof.*
- **m7 Engine purity.** `change-set.ts` would import `askedInOrder` from `validate.ts`, which reads files at load (`validate.ts:5-6, 23`). The scan of two files passes, but the import chain has I/O (STANDARDS §4, P-249). Fix: the scan follows imports, or the API passes R8's inputs in. STANDARDS §7 also makes property-based tests [M] when the engine changes, and the concept has none. *Needed for the proof.*
- **m8 BR-1 scan and Undo.**
  - BR-1's scan "no `revise()` … for these flows" cannot be done per flow, because `revise()` has many proper callers. Fix: assert that the three entry functions call `ChangeSets.submit`, and keep `check_s6_p149.ts`'s list of allowed exceptions.
  - The 10-second Undo (`proposals.ts:444ff`) must also remove its change set rows.
  - The "rule conflict through decide" test needs a planted proposal, because today's AI producer makes only single `eq` trees (`qd-conditions.ts:59`). That is fine as a fixture; say so.
  - *Needed for the proof.*
- **m9 Made-by.** Rows already carry `Origin` (`schema.prisma:61-69`), and older rows have no change set. Fix: derive the chip from `Origin` plus the change set's "edited" flag, so there is one source of truth. *Needed for the proof.*

## What is sound
- It reuses the existing second-person shapes (WAITING `LibraryChange`, PROPOSED `FieldMerge`) with no new queue.
- The engine is split from the API reader (P-249), and the migration adds a new table only.
- SH2 comes first. It is already being drafted in this copy.
- An AI change is never direct, which matches today: every lander writes WAITING (`proposals.ts:191-192`).
- The duplicate acceptance test builds on refusals that already exist (`proposals.ts:142`, `:399`).
- `valueProblems` catches "Married and Single" (`eligibility-gates.ts:82-88`).
- The "open cases keep their release" wording holds, and it respects the held SA1B-D100 (no correction reaches open filings).
- Q3 is sound. The 4-PR order is sound once M6's cuts are made: B3 becomes "AI proposals through the door" only.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Rules check | none (pure `engine/change-set.ts`) | `POST /api/change-sets/check` (`ConfigRead`) | R1–R8, as named in M5; R3 table (M2) | pass and fail per rule; property test (m7) |
| Tier | `change_set.tier` | in the check result | `riskOf()`; expert = release SME sign-off (M1) | table-driven, one row each |
| Store | `change_set` (made_by, items, tier, fingerprint, status, links to library_change / field_merge / proposal batch) | written in the flow's own transaction | one change set per item for bulk (m4) | Undo removes it (m8) |
| Rename | draft version via `revise()` | `PATCH …/name`, `PATCH /library/sections/:key` + optional `expected` | R1, R3 (group) | C3.15 suite unchanged; stale gives 409 |
| Merge | `FieldMerge` + change set | `POST /api/library/merges`, `…/approve` | R3, R4; R5/R7/R8 on rewritten conditions (M4); re-check at approval (M3) | fail: merge making a check never true |
| AI proposal | lander + WAITING change | `POST /review/proposals/decide` | R1–R8 before the lander | acceptance: duplicate, conflict refused, nothing written |
| Preview | SH2 reader | in the check result | sections, forms, combinations, rules, releases, open cases by pinned release (m1, m2) | six-combination sample |
| Made-by | `Origin` + change set | library lists | person · AI · AI, edited by person (m9) | one per kind |

## Questions for the founder (recommendation first)
1. **Renaming a field that a released combination uses.** *Recommend direct* (P-96): the release is frozen, the next release review lists the rename, and the panel says so. The alternative, P-253's literal wording, sends almost every rename to a second person.
2. **Roll-back now or in M3?** *Recommend M3*, with "each library adopts the core". It is not in P-253's "Now". A merge needs stored before-images. Today the 10-second Undo and frozen releases stay as they are.
3. **Where the immigration expert signs.** P-253 cites P-96 for this, but P-96 has no expert clause. *Recommend at release review, as today* (rules, document rules, checks and AI-made items), with no extra gate at library approval.

## Lead response

## Agreement

## Build discoveries

B1 (forms builder, 2 Nov, after the reviewer's and the breaker's rounds on b5f5180d: `review-b1.md`, `break-b1.md`):
* **R1 matches today's rename door, not the concept's "1–120 characters, 3 letters".** A rename or an alias takes 2–80 characters, as `library-sources.ts` NameBody does, so a rename to "12" still passes. A new item's name takes 2–120 characters and needs at least one letter. Every name is refused with control, invisible or direction characters in it. Reason: the suites stay unchanged, and a person and the AI give the same answer.
* **Only a question's condition goes through the check in B1.** That is the AI's condition proposal (C4.11). A form line, document line, rule or check condition is refused with R1 "changed on its own page" until those pages adopt the core (M3, "each library adopts the core").
* **One change per item in a change set** (R4, breaker M3). This refuses cycles, chains and a merge plus a rename of the same field within one set, so the hop limit (SH3 #509 Q1, four merges) cannot be got round.
* **P-266's raise covers every rename and alias of an item a release carries** (fields, sections, aliases), reading the founder's "P-253 as written" ("anything used by a released combination"). The founder's words name a field. If sections or aliases should stay direct, it is one row in `RISK_TABLE`/`RAISES`. In the sample every field and section is released, so today no rename is direct. That is the consequence the concept's Q1 named.
* **The expert step follows today's release diff** (`validate.ts` needs_sme): rule, document line, check and form-line conditions, plus anything the AI made. It does not cover a person's question condition (review M5).
* **"One change per item" also refuses two merges into the same surviving field in one set** (break round 2 n5), and a merge together with a condition that reads either field. Each can be sent as its own change set; it keeps every set's rewrite check about one swap.
* **The contract refuses a condition over 40 levels or 2000 parts with a 400** (break round 2 M1), measured without recursion. Nothing past it (the check, the fingerprint, any verifier) recurses over a hostile tree. The engine's own limit stays 12 levels and 200 parts (R1).
* **A condition is read only up to 12 levels and 200 parts**, and only in the closed predicate vocabulary (`validatePredicate` with `isNode`, passed in). Anything else is refused with R1 before any verifier runs, so no tree can crash the check (breaker M1, M2).
