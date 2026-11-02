# Break report: K13 Smart questionnaire names (commit cedb021e, branch k13-sqr-names; diff 3dc373af..cedb021e)

Isolated copy `break_k13` on :4445 (`xr_studio_break_k13`), web rebuilt, `tests/runtime/setup_visitor_visa.ts` (13/13). Live AI off, US$0
(one rules-only PQR draft). Scope: the BACKLOG K13 row (P-271, P-272; there is no concept.md). Labels only, so duplicates, hierarchy,
uploads, concurrency and the 100-program budgets were not attacked: no K13 code path touches them. API paths are under `/api`.

## Blocker

None. No behaviour, key or route changed (see Held).

## Major

**M1. The longer tab name clips the combination's tab bar at 1024 px and at 200 % zoom; the old name fitted.**
Steps: as user-A open `/c/<Super visa>/overview` at 1024 px (badges "Forms 4", "Review and release 1"), and `/c/<Visitor visa>/overview`
at 720 px (1440 at 200 %). Expected: every tab and its badge visible, as with "Questionnaires". Actual: the tablist scrolls inside
itself with no cue. 1024: 766/752 px, so the red problem badge on "Review and release" is cut in half. 200 % of 1440: 745/688 px, cut
to "Review and r". Put back "Questionnaires" in the same DOM: 752/752 and 688/688, both fit. At 400 px and 200 % of 1024 the bar
already overflowed; it now hides one more tab, and the selected tab is not scrolled into view (on Review, left edge at 607 px in a 384 px bar).
Code: `contracts/workspace.ts:12`, `web/src/pages/combination.tsx:105` (`overflow-x-auto`). The builder's check measures only the page's
own sideways scroll, so this passes.

**M2. The Activity log still says "pre-qualification" after every PQR draft.**
Steps: `POST /combinations/<vv>/pqr-picks/plan {mode:"rules"}` then `.../draft {mode:"rules", planSha256}`, then open `/activity`.
Expected: only P-271 names. Actual: the row's Item pill reads **pre-qualification**. The entity is written at `api/src/pqr-drafts.ts:202`
and shown raw by `web/src/pages/history.tsx:32` (`ITEM_WORD` has no entry for it). The builder's own check fails on this copy once the
draft has run: `113 passed, 1 failed — "pre-qualification" … [Activity]`. It passes on a fresh copy only because no draft has run.
The static scan also misses it: it skips literals with no space that start lower case.

**M3. The condition builder sends authors to "Questionnaires › Facts a rule needs".**
Steps: Forms tab › Change IMM 5257 › Only if… › Field `person.not_a_field_k13`. Actual warning: "…release waits until the fact is
added from **Questionnaires** › Facts a rule needs." That tab no longer exists by that name. The same builder is used on Library
(`library.tsx:153`) and Configuration (`configuration.tsx:95,132`). Code: `web/src/components/conditions.tsx:90`. The static scan misses
it because the JSX text is split by `{r.field}`, so `>…<` never matches.

## Minor

**m1. The bulk-bar select cuts the new name to "Prospect questionnaire (P".** It is `w-52` (208 px); the text alone measures 208 px at
1440 and 400. The aria-label is complete. Code: `web/src/pages/workspace/sources.tsx:319-320`.

**m2. The client is shown the staff view's name.** The officer answers `person.other_family_name` (`PUT /runtime/cases/<c>/answers/…`
as user-O). Then Client A, at 400 px, opens Part 3 "Personal details" and reads: "Waits for the officer's "Confirm section" (entered in
the **Agent view**)." Before, this read "case view". P-271 defines Agent view as staff's. Code: `engine/runtime/case.ts:56`, shown at
`web/src/runtime/questionnaire.tsx:532`.

**m3. Two old forms remain on the case pages.** A client opening the staff page reads "As a client, open **your questionnaire**."
(`web/src/runtime/cases.tsx:147`). Staff opening the client page get the title "This is **the client's questionnaire**"
(`cases.tsx:211`), although `:162` was renamed to "Client questionnaire". The builder's check allows "your questionnaire" by design,
but the brief lists it as an old name.

**m4. Preview keeps the old set name as a sub-line.** Under "Client questionnaire · 68" it reads "**What Principal applicant is asked**"
(`web/src/pages/workspace/preview.tsx:99`, `data-sqr-sub`), which is the old "What the client is asked" title. The PQR set's text says
"later in the **full questionnaire**" rather than the Client questionnaire (`preview.tsx:91`).

**m5. A PQR pick has a third name on To review.** Its kind reads "**Program question pick**" (`contracts/review-proposals.ts:19`), while its
title reads "Ask in the Prospect questionnaire (PQR): …" (`api/src/review-proposals.ts:28`). This is a static finding: rules mode
proposed 0 picks, so no pick could be shown on screen.

**m6. Suites outside CI still look for the old words** (the row includes "test labels"):
- `tests/qa/check_qa_r1c_walk.cjs:104` and `check_qa_r1d_walk.cjs:111,136` wait for heading "Your questionnaire" (they time out).
- `tests/qa/check_qa_qn_1029.cjs:101` clicks "Ask in pre-qualification".
- `tests/qa/check_qa_am_1101b_walk.cjs:117` expects `/Pre-qualification/` in the toast. The toast is now "Prospect questionnaire (PQR) on for 2 questions".
- `acceptance/journeys/J4-questionnaires-to-release.md:38` expects "…: pre-qualification".

**m7. The new "Agent view" heading has no target and holds nothing.** It is an `h2` with no id (`web/src/runtime/cases.tsx:181`), and
the Agent view's own sections are sibling `h2`s (Application details, Your visit, Entries). Eligibility's "→ Answer in the Agent view"
(`eligibility.tsx:212`) lands on the top of `/cases/<id>`, three panels above it. The link target is unchanged; the new words name a
place it does not reach.

## What the builder's check misses (`tests/check_k13_names_browser.cjs`)
- It visits `/preview?view=pqr|client|agent`, but the switch is `?set=`. At 1024 and 400 px the PQR and Agent sets stay hidden and are
  never read; `?view=` only matters for `studio`.
- It takes no actions: no PQR tick, bulk change, PQR draft, toast, error dialog or condition editor. That is why M2, M3 and m2 pass.
- Its OLD list has no "what … is asked", "client's questionnaire" or "case officer's view", and it allows "your questionnaire".
- It does not measure the tab bar's own overflow or 200 % zoom (M1).

## Held
- Keys and addresses: `/c/:id/questionnaires`; `/configuration?area=rules|questions` lands on that tab; `GET …/workspace?tab=questionnaires`
  still answers with that tab (unknown keys give `overview`). `data-tab`, `?set=`, `?focus=people:card` (Forms) and the problem key
  `where:"Questionnaires"` are unchanged. Review shows that key as "Smart questionnaire (SQR)". Library rules give 39 × `tab_word`
  "Smart questionnaire (SQR) tab".
- API words, as triggered:
  - 400 bad `prequalification` type gives "Say whether this fact is asked in the Prospect questionnaire (PQR)."
  - 422 PQR on a case-officer fact.
  - 403 `?mode=agent` as the client gives "The Agent view is for the case officer."
  - The PQR result line names the SQR tab.
  - The bulk toast, the drawer save toast and the audit summaries use the new names.
  - Review change lines read "…: Prospect questionnaire (PQR)".
- The chip filter "Prospect questionnaire (PQR) 5" shows 5 rows. The drawer heading and tick label do not overflow at 1440 or 400.
- No page scrolls sideways at 720 or 512 px (200 % of 1440 and 1024) on SQR, Preview (all three sets), Review, case (staff), client and
  library pages.
- Axe is clean on Preview, the bulk bar, the drawer and the case as staff.
- Keyboard: the SQR tab is reached in 26 Tabs, opens with Enter, is read as "Smart questionnaire (SQR)" and has a visible focus ring.
  The PQR tick is reachable inside the drawer and saves.
- Clean at 1440: Programs, To review, Fields, Sections, Checks, Rules, AI work, Releases, the release page, and the PQR run page.
- No page errors. `draft-qd.ts:74` still sorts PQR problems into `pqr_subset` (static).
