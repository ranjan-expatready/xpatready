# Review: C3.6 "Add the fact this rule needs" (P-158 (5)), commit 576c1f31

Reviewer agent (independent; did not build it). Branch `claude/sleepy-ramanujan-hv8wap`, diff `origin/main...576c1f31`. Bar: `plan-p158.md` §5–§6, `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`. Isolated copy `rev_c36` on :17461 (stopped after); :4400 not touched; no model calls (US$0).
Journey test: `journey-test-reviewer-c36-2026-11-01.md`. **Journey score 6.5/10 (fails: "task completed" is 0).**

## Re-run on the exact commit
* `tests/check_forms_c36_rule_facts.ts` 31/31; `tests/check_forms_c36_rule_facts_browser.cjs` 10/10 (my copy, my run).
* Reviewer journeys (Playwright, scripts outside the repo): main path, keyboard path, double click, three parallel adds, approver role, accept on To review, 1024 / 1440 / 640 px (200 % zoom) / 400 px, long and non-English text.
* Graph: `rule-facts` routes and the component are reached by tests (not in G3/G4).

## What holds
* One door: one `field` proposal through `insertProposals`, origin rules, Check, Sample, `source.rule {key, sentence}` (contract v2.1 `ProposalSource.rule`). Accepting lands the field under the key the rule reads (never typed), DRAFT, with the ADD waiting for a second person. Library sources show `kind: "rule"`, "Needed by rule …" (plan §6).
* Refusals are right and write nothing: no rule (400), unknown rule (400), a rule that does not read the fact (400), a typed key (400, `.strict()`), a fact already in the library (409), a library name (identity rule, 409), a non-author (403), a stale proposal at accept time (409 in `LANDERS.field`).
* Derived facts are excluded. axe clean (closed and open) at 1440 px. No sideways scroll at 1024 px or 640 px. Propose answers in 264 ms. Team look kept (screenshot j2).
* Each rule's test would fail without its rule: the 400/409/403 assertions match the message for each guard; the source test needs the `library-sources.ts` change.

## Issues
**M1 (Major, P-33 scaffolding / concept fit): the product cannot reach this capability from its own screens.** The product never lets a person create a rule, check or condition that reads a fact the library lacks:
* Every save runs `checkCondition` (`api/src/studio.ts:646` rules, `:623` checks, `:493` forms, `:682` requirements). It refuses with "reads X, which is not in the library" (verified: POST `/combinations/:id/rules` reading `person.rev_new_fact` → 400).
* The condition builder only offers library facts (`web/src/pages/configuration.tsx:130`, `ConditionBuilder fields={fields.list}`).
* Merges move conditions to the kept key (`forms.ts` approveMerge). Retiring a published field leaves its published version, so the fact is still in the library (verified: the list stays empty).
* So "Facts a rule needs that no form asks" is always empty in real use. On all 6 sample combinations GET returns `facts: []`. Both builder checks and my journeys get there only by inserting a `predicate` row with SQL.
* Plan §5 offers the add "on a condition, check or PQR pick that reads a fact no form asks". As built, that moment is a hard refusal with no way forward. It is a deadlock: the rule cannot be saved until the fact exists, and the fact can only be added for a saved rule.
* **Fix:** connect it to the product's own path. For example, a draft rule, check or condition that reads a fact with no library entry is saved, and that fact is flagged and blocks release (`validate` already reports it at release: warn, don't block, EXPERIENCE 9). Or the condition editor's refusal offers "Add the fact this rule needs". Then replace the SQL inserts in both checks with the rules API or the rule dialog.

**M2 (Major, STANDARDS §4 [M] "Idempotent creates", D2): parallel adds create duplicate proposals.** Three parallel POSTs for `person.rev_us_refusal` (different names) → `201, 201, 201` and 3 waiting `rule_fact` rows. The "already waiting" check (`rule-facts.ts`, `waitingFor.has`) is a read before the write with no lock or constraint. Landing still refuses the 2nd and 3rd (409), so the library stays clean, but the queue holds duplicates and the BR "a second add while one waits → 409" does not hold under a race. **Fix:** guard inside the write. Options: a partial unique index on (combination, `work->>'ruleFact'`) where status = waiting and step = rule_fact, mapped to 409; or a transaction-scoped advisory lock on (combination, fact) around check + insert. Add a parallel-POST test.

**m1 (Minor, EXPERIENCE §4 [M] read-only state): the approver gets a form they cannot use.** `rule-facts.tsx` ignores `canAuthor` (used next door in `questionnaires.tsx:54`). user-B can open and fill the form and is then refused with "Approver (simulated) does not hold the author duty" (screenshot j4). **Fix:** hide or disable the button with the read-only reason, as the other Questionnaires controls do.

**m2 (Minor, EXPERIENCE §5 [M] copy): internal codes on the main path.** The panel text and two server messages say "(P-158)" (a decision number). The Library source reads "Needed by rule R-91: Rule R-91: the person overstayed…": the rule key appears twice because `rule.sentence` already starts with the kind and key (`proposals.ts` LANDERS.field). **Fix:** drop "(P-158)", and build the source as "Needed by rule R-91: <sentence without its prefix>".

**m3 (Minor, EXPERIENCE 12 [M] keyboard): focus is lost after Propose.** The button and the form unmount, and focus falls to `<body>`. **Fix:** move focus to the row's new "Proposed: waits on To review › Proposals" link.

**m4 (Minor, 400 px): a long fact key overflows the row.** "reads person.…" does not wrap: 162 px of sideways scroll with a 75-character key (screenshot w-400). **Fix:** `break-words` / `break-all` on the key line.

**m5 (Minor, STANDARDS §5 [M] contract first): the request schema `AddRuleFact` is defined in `api/src/rule-facts.ts`.** The web repeats it as a hand-written type. **Fix:** move it to `studio/contracts/`.

**m6 (Minor, concept §5 bullet, declared):** "When the rule retires, Where used flags it" is not built. It is stated in `qa/built/C3.6.md` and should stay on C3.6 as Partial.

## D1–D20 (this item)
D1 3: refusals and the source match §5, but the entry point §5 names is not reachable (M1) · D2 3: the server refuses the bad cases; duplicates appear under a race (M2) · D3 4: lands under the rule's key; identity rule enforced · D4 4: derived facts excluded; only facts that rules really read · D5 4: double click gives 1 row; a stale proposal is refused at accept · D6 4: audit line, DraftingJob US$0, second person approves the ADD · D7 4: no AI; origin rules, Sample, source shown · D8 4: under Rules and checks on the combination's tab · D9 3: next step is a link to To review; approver dead end (m1) · D10 3: "(P-158)", keys and the doubled rule key (m2) · D11 3: the row turns into a "Proposed" link; focus lost (m3) · D12 4: team tokens, clean form · D13 3: axe clean, 1024 px and 200 % fine; focus loss; 400 px overflow with long keys · D14 4: team components · D15 5: one request per tab view; 264 ms propose · D16 4: a passing and a failing test per guard; no race test · D17 simulated only · D18 4: "Needed by rule …" in Library sources · D19 2: not reachable end to end without SQL (M1) · D20 simulated only.

## Could not check
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder). Retirement "Where used" (not built). I did not run a mutation test that removes each guard; I matched each guard to its assertion instead.

Note: during the review, PNGs under `screens/04-shared-library/screenshots/c314/` and `screens/W1-questions-and-documents/screenshots/slice2/` changed in this working tree (16:03–16:04). That was another process, not this review; I left them alone.

**Verdict: Block.** Fix M1 (reach the add from the product's own rule/condition path; checks without SQL inserts) and M2 (no duplicate proposals under parallel adds, with a test). m1–m5 are small and best done in the same pass.
