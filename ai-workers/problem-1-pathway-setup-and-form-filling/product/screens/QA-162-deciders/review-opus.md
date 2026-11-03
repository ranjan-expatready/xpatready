# QA-162 deciders (PR #744): Opus review at b2e4adc0c

Reviewer: an Opus session that did not build this PR and had not seen it before (P-303). I read `git diff origin/main...b2e4adc0c`. The working copy was already at b2e4adc0c on the PR branch, so I checked nothing out. I ran on port 4457 only: no :4400, no STUDIO_*_LIVE, US$0.

This is an engine-only change (`engine/qd-conditions.ts` and two tests). It has no screen, schema, money or permission part. That is why the screen-review steps on concept elements, keyboard, 1024 px and 200 % zoom do not apply. The journey score is in `journey-test-reviewer-opus-2026-11-03.md`: **8.5/10, pass**.

## What I ran
- `check_forms_qa162_fact_words.ts`: **58/58**.
- `check_forms_qa162_saved_matching.ts 4457 xr_studio_rvo`: **27/27**. C4.7 lands 10/23; C4.11 step 5 lands **8/22** (6 items: **0 Ready**, 2 Check, 4 Decide).
- The landed trees from saved run #531:
  - other family names and other given names: `person.used_other_name = true` (Decide, first reading only)
  - other purpose details: `case.visit_purpose = "other"`, role case (Check: hiding warn and loose words)
  - military service details: `person.military_service = true` (Check)
  - national ID number: `person.has_national_id = true` (Decide)
  - green card number: `person.us_lawful_permanent_resident = true` (Decide)
- **Mutation checks** (temporary edit, restored, `git diff` clean afterwards):
  - Filter removed (`pool.filter(canTake)` changed to `pool`): pure 57/58 ("D pass" fails), integration 23/27 (4 fail; landed count falls to 3).
  - Filter run first (exact-first order removed): pure 57/58 (the "Marital status" check fails).
  - `askedOnly` taken out of the pool: integration 24/27 (other-name, national ID and green card checks fail; landed count falls to 4).
  - Each rule fails a test when it is removed.
- `askedOnly` on the Visitor visa draft lists 143 extra (role, fact) entries:
  - case: 11 `case.*`, 6 `relationship.*` (once per case), 7 `representative.*` (once per case);
  - each of principal, spouse_or_partner and child: 39 `person.*`;
  - principal and spouse_or_partner: 1 `relationship.*` each.
  - None of them is a target: the target lookup still uses `factSources` with `isAsked` (`qd-conditions.ts:88`).
- Not re-run (builder's results, not re-verified): repo typecheck, C4.11 pack, `c411_draft_qd`, `pa_track_a`, `qa163`, `uxa1_counts_browser`.

## Points asked
- **Fallback and regex.** In the usual case the fallback is correct. The fallback search runs on a subset of the pool, so a first result of "none" or "not asked" stays the same (I traced W1 and W2). When the words fit several questions by W2, the fallback picks only among those same candidates. Two gaps remain, m1 and m2 below.
- **Role expansion.** It cannot name a question for a role it is not asked of.
  - Placements carry no per-role scope (`snapshot.ts:198`).
  - The runtime asks a decider of the subject the condition is evaluated on (`render.ts:142-143`, `runtime/case.ts:289`).
  - `findFact` lets a principal reach only "principal" and "case", and any other role only itself (`fact-words.ts:55`).
  - So a child condition is decided only by the child's own answer. The case/person split restates `resolver.scopeOf` except for `organisation.*`: see m3.
- **Ready.** Nothing new is Ready on the saved run. A decider found by its words through the fallback has `how = "words"`, so it is loose and never Ready (`qd-conditions.ts:151`). The test checks this at line 113. One corner can reach Ready (m1).
- **Tests would fail without the filter, the exact-first order or `askedOnly`.** Yes, as shown above.

## Findings

### Blocker
None.

### Major
None.

### Minor
- **m1 (fix if cheap)** `qd-conditions.ts:64`. The fallback searches the filtered pool again from the start, instead of choosing among the questions the first search tied.
  - When the tie was **exact** (W1: two of the person's own questions with the same label, key part or question text), the new search can return a question outside that tie:
    - an exact case-level question that the person's own questions had shadowed, with `loose = null`, so it can be **Ready** if both readings agree;
    - or a W2 word match.
  - Probe with three questions labelled "Purpose" (two person ones that cannot take the answer, one case one that can): the result is the case one, `loose: null`.
  - Its loose text is also wrong in this path. A W2 fallback says "no other question of this person has them all" (`pqr-picks.ts takenAs`), but two others did; they were ruled out by type. On #531 this text is hidden because the target's loose text wins (`qd-conditions.ts:100`, `t.loose ?? d.loose`).
  - The current data does not reach this corner.
  - Fix:
    - choose from the tied questions that can take the answer (`found.several.filter(canTake)`), and only when exactly one is left;
    - always mark that choice as needing a person's check, with a reason such as "the only one of N that can be answered <when>";
    - add a pure check with exact twins and a case-level exact question.
- **m2** `qd-conditions.ts:63`. The fallback decides by matching the words of the reason (`/could be \d+ questions/`), and those words contain the AI's `depends_on` text and the target label.
  - Today a false match is harmless: the subset search gives the same "none" or "not asked".
  - But a change to the wording silently turns the filter off. Only the pure "D pass" check would notice.
  - Fix: have `named` return `found.why === "several"` (and `found.several`) as a field, not as text. This is the same change as m1.
- **m3** `qd-conditions.ts:77`. `askedOnly` restates the case/person rule instead of calling `isFilingFact(fact, placement)` (`resolver.ts:69`).
  - It already differs on `organisation.*`: the resolver treats these as their own scope, `askedOnly` lists them for each person.
  - No Visitor visa placement hits this today.
  - Fix: use `isFilingFact`, and skip what the runtime never asks (`isClientField` kinds, value type "document").
- **m4** `tests/check_forms_qa162_saved_matching.ts:106` and `:108`. Two near-identical "Other names used" checks remain (the earlier fresh review's m3).
- **m5** `askedOnly` builds a `FactSourceView` with `as unknown as`, leaving `source`, `document` and similar fields undefined (the earlier review's m3). This is safe while only `role`, `fact`, `label` and `placed` are read. A one-line comment would do.

## D1–D20 (engine change; scored on what it touches)
- D1 4: C1 holds: one question each, never guessed. Accepted ruling: the answer type rules a candidate out. Corner in m1.
- D2 4: no writes. The `have` set never adds the same role and fact twice.
- D3 5: reuses `findFact` and `answerOf`; no new matcher.
- D4 4: C5 `askedInOrder` and the hiding warn run on the new deciders (military and purpose items get Check).
- D5 n/a (pure, no state).
- D6 n/a.
- D7 4: each item keeps origin "ai", basis SAMPLE, quote and run file. A decider chosen by type is not explained (m1).
- D8–D9 n/a.
- D10 4: plain sentences. The latent false "no other question" text is m1.
- D11 4: Decide and Check reasons are in words. Each condition left out keeps its reason (test line 110).
- D12–D14 n/a (no UI change).
- D15 5: pure, built once per round. No request per row.
- D16 4: a pass and a fail test for each rule, and each mutation fails a test. No test for an exact tie (m1).
- D17 simulated only.
- D18 4: tree, quote and readings traced to #531.
- D19 n/a for this row.
- D20 simulated only.

## Could not check
- The To review screen showing these items: it needs a Live or fake launcher run, which this session must not start.
- `tools/graph.mjs`: it rewrites `qa/GRAPH.md`, and I write only this review and the journey report.
- The suites I did not re-run (listed above).

**Verdict: Approve** (no open Blocker or Major), for commit b2e4adc0c. Fix m1 and m2 together if cheap; otherwise list m1–m5 in the PR.
