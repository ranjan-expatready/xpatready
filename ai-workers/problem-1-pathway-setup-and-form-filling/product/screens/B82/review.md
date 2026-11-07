# Review: B82 (QA-233), PR #1058

**Head reviewed: `81f0f6dfdd4d37a9a9ba82c63396f58a53c7d677`.** It differs from c161117873 only by removing the `ASSUMPTIONS.md` row. c161117873's change against main is line for line the change I ran at c85b9e1fc (compared `git diff origin/main...HEAD` with the earlier diff).
**Runs were on c85b9e1fc.** Reruns on the newer head were cut off by the tech lead's one-copy order. That is not a finding. main's merge changed `api/src/demo.ts` (C10.1 rows 9, 11, 12), but not `checklistDocumentLines`, `web/src/pages/proposals.tsx`, `checklist.ts`, `proposals.ts` or `rule-facts.ts`.
Reviewer: independent, did not build it. One row with no new screen, so judged against the row's text; D1–D20 are not scored. US$0: saved readings only, no `*_LIVE` switch, no priced button.

## Verdict summary
The row's main path works: on a fresh six the facts are proposed, reviewed, approved by a second person, and the draft submits and releases. The block is for what it does around that path: it most likely turns a green C10.1 step red on the checkpoint, tells a person to do something the screen cannot do, and leaves two rules untested.

## Blockers
None.

## Majors
**M1. The configured checkpoint now leaves 5 facts waiting, which should turn a green C10.1 step red.**
- `api/src/demo.ts:227 checklistDocumentLines` rejects the replay's leftover document types ("no accepted line uses it", :249) but knows nothing of the new `field` items.
- Seen on my configured load at c85b9e1fc: 5 `field` items still `waiting` on the checklist job (biometrics, holds US visa, is minor, residence differs, travel companions), and that job still has waiting items. The job's mode is `REPLAY` (`checklist.ts` replay).
- `acceptance/C10.1.test.ts:36` (rows 3–4) requires `j.mode='REPLAY' and p.status='waiting'` to count 0. On main that step is green: #1009 reports 21/24 (run 41960867471) with only R9, R12b and "every row done" red, as ruled.
- **Not run on the head: derived from that query and my observed rows.** The PR's checks table does not list C10.1. `tests/check_c10_1_configured.ts:65` counts only `kind='field_map'`, so it will not catch this.
- Same cause, two more effects: each card says "so a release would be refused" although the loader already rejected its line, and the open job makes a second draft return the old job until the facts are decided.
- Fix: reject in that loader the facts no accepted line reads, as it does for types. Run C10.1 on the checkpoint and show 21/24 unchanged.

**M2. The fact card tells a person to add answer values, and no control for that exists.**
- `checklist.ts:213` writes "Add its answer values before accepting." and "Its answer values are only the ones the condition tests: add the others." `checklist.ts:210` says fewer than two "is for the person to complete on To review".
- `SidePanel` (`web/src/pages/proposals.tsx:159`) has one input on a fact's card, the reject reason. Walked in a browser: Accept on Marital status answers "A choice needs its answer values: write two or more, one per line", with nowhere to write them. I found no answer-list editor elsewhere in `web/src`.
- Reach:
  - "add the others" shows on Travel companions on every fresh six. It can only be accepted with 2 values, while its own meaning names 4 (alone, one_parent, both_parents, other).
  - The refusal needed a constructed state on the six (the forms' Marital status proposals marked rejected by SQL on my copy).
  - It is the plain outcome for any fact tested against one value, for example `case.visa_category` (10 lines of IMM 5484, seen by running `conditionFacts` over the saved reading; no such combination in the six).
- A recovery exists, but nothing points to it: Reject, accept the line, then Smart questionnaire › "Add the fact this rule needs" with values (walked to "Proposed: waits on To review").
- Fix: make the words true (name that route) or give the card a values control; correct the comment. Add a fail test.

**M3. Two business rules have no passing and failing test (WAY-OF-WORKING).**
- `proposals.ts:602`: a checklist fact that is a choice without values is refused at accept. No test reaches it with `step='checklist_draft'`; C2.6 accepts one yes/no fact, and the `check_forms_c36_*` suites use `rule_fact`.
- `rule-facts.ts`: the widened waiting query and the add's 409 now apply across combinations, by fact key. `check_forms_c36_rule_facts.ts:85` is one combination; `:152` is by name through the other route. The PR calls this its first shared change. I saw the panel behave correctly on a second combination, but nothing guards it.
- Fix: one pass and one fail case for each.

## Minors (fix or list on the PR)
- **m1.** A fact sharing a retired field's name passes as proposable, then Accept answers only "This already exists, or someone else saved the same thing at the same moment" (reproduced). `factsKnown` (`checklist.ts:162`) reads usable names only; C3.6's add by rule refuses this in words (MA1). Say it in `held`.
- **m2.** Two or more tested values that are not lower-case codes (`["QC","ON"]`) fail the payload contract, so per `insertProposals` the whole replay is refused. That contradicts "one bad item never stops a draft". I confirmed the contract failure only, not a replay; no saved reading has this today. A single "QC" (IMM 5488) is held by name on the fixture today; by reading, if proposed it could never pass, because codes are rebuilt lower-case (reading only).
- **m3.** `typeFromTests` calls a date compared with `lt` a number when the reading does not define the fact (pure run). The person cannot change the type on the card.
- **m4.** After a fact is rejected and its line kept, a re-draft does not propose it again and says nothing, because kept lines are filtered out first. Not a dead end: the C3.6 panel lists it, and add, accept and approve clears the refusal (reproduced).
- **m5.** A second combination's job message does not say its facts wait elsewhere. Its panel does say so, but the link opens the general To review page.
- **m6.** `held` reaches only the job's message; `draft-qd.ts` counts `facts`, not `factsHeld`. It also says "its N document requirements wait" when only facts wait.
- **m7.** Reading only: `rule-facts.ts` add checks for a waiting item under its own lock, not the door's. A replay at that moment could make a second item; the second is refused at accept, so this is harmless.
- **m8.** The Sample assumptions row is now only proposed on the PR. The tech lead must record it (AGENTS rule 4: Sample, Unconfirmed: expert) or the facts' wording has no row.

## What held
- **Row's text:** each fact proposed through `insertProposals`, landing under the condition's key with a waiting library change. The author's own approve gets 403; the second person's clears the refusal.
- **Release refusal:** no diff in `engine/validate.ts` or the Submit path, and C2.6 shows the refusal words before the fact lands. Unapproved items stay gated by `unapprovedAdds` (reading).
- **Name collisions:** a library name or alias is held in words. The IMM 5488 fixture run gave 2 such facts held.
- **Re-replay:** a second click while open returns the open job (5 facts stay 5); decided lines are not repeated.
- **Second combination, drafted at the same moment:** one item per fact, panel shows waiting.
- **Undo:** plain and choice facts both leave no field, change or list row, and the item waits again. Undo after approval gets 409.
- **Older readings:** IMM 5488 and IMM 5905 parse; `check_forms_c26_checklist.ts` 52/52 on a fresh fixture copy.
- **Paid pairs:** question list file stayed only `vv.single-ae2133b8a398` before and after lines and facts landed (via `pqr-picks/plan`); facts add 0 questions.
- **P-319:** no form or combination number in the new live logic. **P-175, P-295:** spent 0. **P-149, P-121:** one door; one-round facts read Check, visa-office-only facts Decide.
- **P-170, rule 4:** basis SAMPLE, "Sample until the immigration expert confirms" on the card, the quote is IRCC's line, meanings are the saved reading's.
- **Graph:** `graph.mjs --check` gave G1 0, G2 0, G4 0, G5 0 (G3 12, G6 5 not read for this row); no tracked file changed.

## Runs (mine, at c85b9e1fc, exit codes)
| Check | Data | Result |
|---|---|---|
| C2.6 | six | exit 0, 43/43 |
| C4.8 | six | exit 0, 12/12 on a fresh copy. An earlier run gave exit 1, 10/12: release hit the 30 s transaction limit (P2028) at load about 30; retrying that release answered 201 in 22 s. Tied to load, not treated as a finding |
| C4.1 | six | exit 0, 25/25 |
| C4.5 | six | exit 0, 26/26 |
| `check_forms_c26_checklist.ts` | fixture | exit 0, 52/52 (a first run on an already loaded copy failed 2, including setup; not a valid run) |

## Not run
- **On the head:** nothing; GitHub's shards were still pending when I wrote this, so CI gives no result yet.
- **C5.1:** cut off by the stop, twice; the builder reports 49/49.
- **C10.1 on the checkpoint:** see M1.
- **C4.8 by gate B, C4.11, the C3.6 suites and browser check, `check_screen02_*`:** builder's or CI's only.
- **Main:** no pack run on main; main's figures come from qa's and #1009's records.
- **Mutation:** I did not remove rules to confirm tests fail (no code edits allowed); M3 comes from reading the tests.
- **Concurrency:** drafts at one moment only, once; no race of accept against replay.
- **Sign-in as second person in the browser:** approve and release were by API, or from the builder's screenshots.

## Journey test (reviewer's one score for this check): 7/10, below the pass of 8
Persona: configuration author, then a second person. Walked with Playwright **headless, not a visible browser**, on fresh six copies at c85b9e1fc: To review › Visitor visa group › fact cards › Accept, Reject, Undo › Smart questionnaire panel. The report is here because this review was asked to be the only file.
Journeys: (1) main: draft, accept facts and lines, approve, submit, release (API, plus C4.8); (2) a choice with 2 values; (3) a choice with too few values, with recovery; (4) reject then re-draft; (5) undo; (6) a second combination; (7) wrong role (author approving own fact: 403); (8) the checkpoint.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Main path releases; a too-few-values fact cannot be accepted on its card |
| Next step obvious | ½ | M2; the recovery sits on another tab and nothing names it |
| Plain words | ½ | Mostly plain; "add the others" cannot be done; names such as "Is minor" |
| Feedback and state | ½ | Clear landing and refusal messages; false "release would be refused" on the checkpoint |
| Correct data | 1 | One item per fact, the condition's key, undo clean, no question added |
| Error recovery | ½ | Panel route works; generic 409 on a retired name; re-draft silent |
| Accessibility and sizes | 1 | axe none on group and card; no sideways scroll at 400, 1024, 1440; Enter opens the card, Tab reaches Accept. 200 % zoom not tried |
| Speed | ½ | Group opens in 4.9–11.6 s at load 20–37: over budget, but not a fair measure on this Mac |
| Visual quality | 1 | Existing card and table, nothing new out of place |
| Trust and sources | 1 | AI tag, Sample, IRCC's words, one reading said plainly |

Most valuable fixes: M2's words or control (raises three criteria), then M1, then m1. A real screen reader and an intended user's unaided walk were not tried; D17 and D20 stay with the founder.
**For the tech lead, not findings:** the builder's two questions stand (a residence fact a person answers; facts not asked until placed, so a client sees the document when the answer is "cannot tell"). QA-233's line that the C3.6 panel does not serve document conditions is out of date: `rulesOf` includes them, and I used that route.

**Verdict: Block** (`81f0f6dfdd4d37a9a9ba82c63396f58a53c7d677`). Fix M1, M2 and M3, each with a fail test, then list or fix m1–m8.
