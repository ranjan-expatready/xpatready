# B83 diff-only read: head e2a485ba11, diff since dd7ede2127 (independent reviewer, 5 Nov 2026, 17:57 IST)

**Verdict: Approve** (head e2a485ba110d08021596b8c2ed8263a450330bdf). The diff adds no Blocker or Major. **Journey score: 9 / 10, provisional, carried from the read below: this diff was read, not walked.** No copy started, no new journey report, US$0, nothing committed. Run on this worktree: `tests/check_case_feed.ts` 25/25, and `tsc -p api/tsconfig.json --noEmit` shows no error in `library-changes.ts`, `own-question.ts`, `case-feed.ts` or `check_b83_undo_withdraw.ts`. **Not run:** `check_b83_undo_withdraw.ts` and `check_forms_b81_browser.cjs` (they need a running app); the new fail test and the `.first()` steps are judged by reading. **Delta touched money, schema or a new screen: No. Permissions: no duty changed; one audit line now reaches firm staff (question 2).**

| | Answer | Evidence |
|---|---|---|
| 1. Will `conditionRule` compare correctly once B86 is in? | **Yes** | B86 adds `conditionRule Json?` to `FormFieldMap` (`prisma/schema.prisma` on `origin/claude/b86-conditions-box`, line 620), jsonb, the same kind as `optionMap` and `listPurpose`, which this function already compares the same way. A new draft copies it: `core.ts:148,152` (`strip` removes bookkeeping columns only). `?? null` makes an absent value and a stored null the same. If the two values ever serialised differently, the draft is kept, not deleted: the safe direction |
| 1. Do both callers pass rows with both columns? | **Yes** | Undo: `own-question.ts:197`, `findMany` with no `select`, and `under` from those rows (`:207`). Withdraw: `library-changes.ts:310` and `:314`, `findMany` and `findUnique` with no `select`. So `condition` is real on this head, and `conditionRule` arrives by itself with B86's column |
| 1. Does the merge keep the fix? | **Yes, by reading** | B86's diff from `dd7ede2127` does not touch `onlyThisAsk` or `AskedRow` (grep: 0), so B86 takes this line as written |
| 1. Is the test a real fail test? | **Yes, by reading** | Without the compare, the draft would be deleted, and `wordsLeft` and `newest` would both fail. It covers `condition` through Undo; the withdraw door shares the function. The rule half has no test (Minor 2) |
| 2. Is a configuration entity right? | **Yes** | The one writer, `library-changes.ts:326`, records a withdrawn library field, on no case. It sits with `field` and `library field`. Off both lists, the sweep fails it (`tests/check_case_feed.ts:81`), so the addition is needed |
| 2. Does it change what firm staff read? | **Yes, by one line, and that is correct** | Until now the line was read by no firm's staff (`case-feed.ts:53`, fail closed); now they read it. Its words: the person's name, the field's label, the reason, the counts, and the "still read by" names. `lifecycle.ts:541`'s line on a `field` already gives firm staff the name, label and reason. New to them: the counts and the reader names, all configuration items (`where-used.ts:112`; no case table read in `where-used.ts:111-175`). A typed reason naming a case goes only to that case's firm (`caseOf`, `case-feed.ts:50-52`). The firm rule itself is unchanged |
| 3. Does `.first()` keep the test's meaning? | **Yes, with a wrong comment (Minor 1)** | With both problems' and changes' buttons, it opens the problems', which holds the link (`review.tsx:90-91`), where the bare locator would throw. With only the changes' button, the click is harmless, as before. See Minor 1 for the third button |

## Minors, one line each
1. **A third "Show all" comes first, so the comment is not always true.** `web/src/components/unsourced-numbers.tsx:97` ("Show all N items", over 6 groups) renders above the problems (`review.tsx:85`), and `.first()` then opens that list instead. No false pass: a link past the eighth problem fails the author's step loudly, in the same run, before the Approver's step. Fix: `tests/check_forms_b81_browser.cjs:109,124`, match `/^Show all \d+$/`, which only the problems' button says, and drop `.first()`.
2. **Nothing tests a difference in the rule alone, and the optional type can hide a mistake later.** `api/src/library-changes.ts:211`: a future `select` that drops `conditionRule` would compare null with null and delete a draft that holds a rule, with no compile error. Fix in B86, once the column exists: make the field required, and add a rule-only case beside the test at `tests/check_b83_undo_withdraw.ts:95-101`.
3. **Not from this diff: the Approver's step can pass without expanding the list.** `check_forms_b81_browser.cjs:124` counts the button right after the tablist appears, before the problems load, so `moreB.count()` can be 0 and the "no link" step then reads only the first eight. Fix: wait for `[data-problem]` first.

---

# B83 last narrow read: head 5887d5837, diff since 3773ef7e9 (independent reviewer, 5 Nov 2026, 14:42 IST)

**Verdict: Approve** (head 5887d583769ecc3959bf2950da11495914272f01). The delta adds no Major, and F1-a is closed. **Delta touched money, schema, permissions or a new screen: No.** **Journey score: 9 / 10, provisional: scored by reading, not walked.** No copy started (P-348 (5)), no new journey report, US$0, nothing committed. By reading only, except `tsc -p api/tsconfig.json --noEmit`, which shows no error in `document-supplies.ts`, `library-changes.ts` or `validate.ts`. This read covers the code; your route suite and walk on this head were still running, and step 3 still asks for them to pass.

## The questions asked
| | Answer | Evidence |
|---|---|---|
| 1. An exact revert? | **Yes** | `git diff 6701498dd 5887d5837 -- api/src/library-changes.ts` is empty. The test's `newWaitingField` and F1 block are gone, with nothing left over (grep for its names: 0). The other two changed test lines since 6701498dd are the V1 regex, which should stay, and the new words at `:166` |
| F1-a closed? | **Yes** | `publishLibraryChanges` no longer skips the type, so `programs.ts:456`'s "will release" is true of it again. The other `continue`, at `library-changes.ts:344`, is not from this diff |
| 2. Real label? | **Yes** | The same bytes, "…" included, at `engine/validate.ts:75`, `web/src/pages/workspace/documents.tsx:210` and `web/src/pages/library.tsx:385` |
| 2. Real place? | **Yes, one click on (Minor 3)** | The hold exists only for a type a document line lists (`engine/snapshot.ts:210`). Documents tab › the line's name, or its menu's "Open details" › "Facts it supplies" › the button, authors only. An automatic line's drawer has no button, but such a line alone never puts a type in the snapshot. Library › Document types has the same button |
| 3. Name in the panel's list? | **Yes** | A withdrawn field has no row left (`library-changes.ts:323` deletes its drafts). `document-supplies.ts` puts `gone`'s name in `named`, so it reaches `fields`, and the chip reads it through `label` (`supplies-panel.tsx:43`). The name is the change's `label`, the same source as the hold (`studio.ts:476`), so the words match |
| 3. Can a person take it out? | **Yes** | The chip's × (`Remove "<name>"`), then a reason, then "Send for approval". With no fact left, `used` is empty, the API takes `facts: []` and `same()` sees a change. With words left on a line, the panel refuses in words and offers "Remove this line". Other facts with no recorded words need source and quote, refused in words (C4.5's own rule, not this diff) |
| 3. And after that? | **Clears, by reading** | `applySupplies` checks only `after` for live fields, so a withdrawn key in `before` does not refuse. The new draft has no such fact, so the line goes. Your run says the same; I did not see it |
| 3. Second person | **Name, not key** | `names` gets it, and `suppliesView` puts it in `before` and `removed`; `suppliesWords` says "removes <name>" |
| 4. BR-11's limit | **True to the code** | `withdrawnFieldLines` reads only the listed types; `gone` is draft mode only. "Run on both" is your run, not seen, and agrees with reading: the hold is B83's own code |
| Money, schema, permissions, new screen | **No** | Five files: concept, `document-supplies.ts`, `library-changes.ts`, `validate.ts`, the check. No Prisma or migration file, no duty or price line, no route or page |

**Your F1 run, weighed:** Submit 400 by name here, against silent 201 on main, fits `studio.ts:477`. So this head leaves the ruled limit better than main.

**Also read:** the default `wayOut` keeps every other reader's words. No other test or screen reads the old sentence for a type. `:166`'s regex matches `said`'s `label: message`, so it reads the new way out. The fallback "A field no longer in the library" shows only for a key with no row and no withdrawal, and replaces showing the key.

## Minors, one line each
1. **The refusal still shows the key (this delta makes it visible: the chip now reads a name).** `api/src/document-supplies.ts:103`: pressing Send with the withdrawn chip still there says "This is not in the shared library: person.x". The same comes from picking the name again by search after removing it (`:81` offers it; `supplies-panel.tsx:104`). Fix: name it with `goneNames` at `:103`, and leave withdrawn keys out of what `hits` offers.
2. **The line's drawer and the row's tooltip show the key.** `engine/sources.ts:266`, `meaning.get(fact) ?? fact`, one click before the panel: `person.x` where the hold said the name. Not this diff; main: not run. The panel's name is one click on, so nobody is stuck.
3. **"On its document line" is one click short.** The button is in the line's details, not on the row. Fix: `Open its document line and use "Change the facts it supplies…"`. Also, a line whose `who` matches nobody shows on no role's list (`engine/sources.ts:259-260`); the Library door still works, and the words do not say so. Rare.
4. **`goneNames` has no fail test.** No B83 check opens the panel with a withdrawn fact or reads `names`. Fix: in `tests/check_b83_undo_withdraw.ts`, GET the panel and POST without the field, with `noKey` on both answers.
5. **The panel does not mark the fact as withdrawn.** Its chip looks like any other; the person finds it by the name the hold gave. Words only.

## Open, for the PR's list
BR-11's "qa holds the QA number": no number is in this diff, and `product/qa/BUGS.md` has no line for this limit that I could find, so the PR body should carry it until qa adds one. n13, the second half of Minor 5 and the left-open table below stand, with their "main: not run" marks.

## Journey (by reading; provisional)
As last read, with feedback and state's ½ back, since F1-a is gone. **9.** Speed still not measured; sizes and accessibility are the builder's.

## Could not check
Any behaviour by running: the panel with a withdrawn fact was not seen on screen, and no B83 check walks it. Your F1 runs and the suite on this head are your report, not seen.

**Verdict: Approve** (head 5887d583769ecc3959bf2950da11495914272f01). No open Blocker or Major. Any later push needs a new read and the label again (step 5).

---
Below: the previous verdict, unchanged. Its F1-a is closed above by the revert.

# B83 final read: head 3773ef7e9, diff since 6701498dd4 (independent reviewer, 5 Nov 2026, 14:35 IST)

**Verdict: Block** (head 3773ef7e9be2cfd354ef34ac1d064a0ef98ab976). V2 and the four minors are closed, and the type no longer goes out. But F1's fix causes one new Major: the Release page promises the change, and the press publishes a release without it. **Delta touched money, schema, permissions or a new screen: No.** **Journey score: 8.5 / 10, provisional: scored by reading, not walked.** No copy started (P-348 (5)), no new journey report, US$0, nothing committed. The head moved twice during this read, from 989dc6420: 7f43dd453 changes one line, the browser check's own `api` helper; 3773ef7e9 changes only two walk pictures.

## Major
**F1-a. When F1's skip fires, the Release page says "Will be released", and pressing it publishes a release without the change, possibly an empty one (this diff; a new state).** `api/src/library-changes.ts:346` skips, and `api/src/programs.ts:456` still says `will_release: c.status === "APPROVED"`. By reading; not run.
* **Reach, from the product's own screens:** a new document type's ADD is approved and its row stays DRAFT. "Change the facts it supplies…" shows for any type not retired (`web/src/pages/library.tsx:385`), the panel offers a field still waiting (`document-supplies.ts:64`), and `propose` accepts a draft type (`:90`). Approving writes the fact into the DRAFT row (`core.ts:147`). This is not only SQL state: every time the skip fires, this follows.
* **What the releaser sees before:** "Will be released" on the row (`web/src/pages/release.tsx:68`), counted in `changes` (`programs.ts:467`), and the button "Release 1 library change as Release N".
* **What the press does:** the guard at `programs.ts:493` passes because `releasing` is not empty. `studio.ts:1164` creates the new release first, then the skip leaves `library` empty. With no combination ready the reply is 2xx: toast "Release N published: 0 combinations", a Notice titled "Release N published" whose body is only ".", an audit line "released Release N: " with nothing after it, and "Last release: Release N". The row still says "Will be released", so each further press makes another empty release. With combinations ready, the type is missing from what went out and no word says so or why.
* **Why Major:** a false statement at the release step, which `programs.ts:425` says the page must never make ("never says 'Will be released' for a row the server will refuse"), and a numbered release that holds nothing. No client data is wrong and no type goes out, so this is not a Blocker.
* **Main:** the type goes out there, so main does not reach this state. `studio.ts:1164`'s order is on main, and `library-changes.ts:350`'s existing `continue` might produce an empty release there. main: not run.
* **Fix (small; no new screen, so no breaker by the ruling):** one shared check, used by `draft()` and by `publishLibraryChanges`. Such a change gets `will_release: false`, is not counted in `changes`, and its row says what it waits for, by the field's name; "Waiting for a second person" (`release.tsx:77`) would be false for an approved change. A press with nothing to publish makes no release. Check the refusal words at `programs.ts:493` too: with no rows, the "Every change is held back" text is empty.
* **Fail test:** extend `tests/check_b83_undo_withdraw.ts:541-543`: `/draft` shows `will_release` false, and `pack_version` does not grow when nothing else goes out.

## The questions asked
| | State | Evidence |
|---|---|---|
| V2 | **Closed** | `check_b83_own_question_screen_browser.cjs:238` asks `/changed after it was proposed/`; `web/src/pages/review-items.tsx:114` says those words, same case, inside `[data-came-back]`. Your 56/56 stands for it, on 853b742d0 |
| F1, the type going out | **Closed** | Skip at `library-changes.ts:344-347`, both doors. A combination listing the type is refused earlier by `unapprovedOf` (`studio.ts:1144`). `releaseSupplies` marks nothing released while the draft stands (`document-supplies.ts:234`), so no false "released" on the facts change |
| F1, a release saying something false | **Yes: F1-a above** | |
| F1's fail test exercises it? | **Yes, by reading; one hole** | After `:533` `vv.single` has changed since its submission, so it is held, and the press reaches `publishLibraryChanges` through `releaseRows`. Take the skip out and the type is PUBLISHED and the change RELEASED, so `:543` fails. **Hole:** `u.status` is never asserted, so any refusal (a 409 before the publish) also passes. Its state is seeded by SQL, and its own press is probably F1-a's empty release, which it does not look at |
| `screen02.ts:140` words | **Closed** | `c.action === "DELETE" ? "deleted" : "applied"`. `check_w1_structure_r3.ts:112`, a delete, still expects "Nothing was deleted" |
| `document-supplies.ts:160` words | **Closed** | Now covers the change as well as the field |
| Clipping, `document-supplies.ts` | **Closed** | `clip` at `:203` marks with "…" and stays within its limit. `said` is at most 180, `earlier` at most 298 minus `said`, so the two `.slice(0, 300)` at `:212-213` never cut. The space before "The new field" is there, and the false comment is gone |
| V1 test's regex | **Closed** | `:377` `/A proposal to add "/` matches only the restored name check in this route's path (`rule-facts.ts:188`; the one at `:253` is in `addForRule`, another route). The two other refusals, `:191` and `:199`, do not quote the label, so the test now fails if V1 comes back |
| Merge, `questionnaires.tsx` | **Kept both sides** | `git show --cc 853b742d0`: `<OwnQuestionsLine>` stays, and `<PlaceFromFormParts>` has main's `conditionFacts` offer. `git diff` against each parent shows only the other side's lines |
| Money, schema, permissions, new screen | **No** | B83's own commits change `document-supplies.ts`, `library-changes.ts`, `screen02.ts` and the two checks (`git diff --name-only 6701498dd4 92b3133b2`; the two commits after the merge change only the browser check). No Prisma or migration file anywhere in the range, main's side included |

**Also read:**
* **The browser check's two retries (`:94-98`, `:140`):** test only; one press again on a 500, so a repeated 500 still fails. `save`'s error clears on the press (`own-questions.tsx:106`), so the wait does not read the old message.
* **R1 step's type:** made by SQL for that step and removed after it; it does not stand in for a product step.
* **G5:** the B83 commits touch neither coverage nor placement, so its going green is not this PR's code. It came from main's side, or from a copy that was not fresh (`acceptance/C4.11.test.ts:19` warns of that). Not traced.
* **Ran, no database:** `tsc -p api/tsconfig.json --noEmit`, no error in the four API files named here, filtered by name. `graph.mjs` without `--write`: G1 0, G2 0, G4 0, G5 0; G3 13, G6 5, as before.

## Minors, one line each
1. **F1's test does not assert `u.status`.** `check_b83_undo_withdraw.ts:543`. Fix with F1-a's test.
2. **The clip has no test.** No line of `check_b83_undo_withdraw.ts` reads the mark. Long text only.

## Open, not in this delta
n13, Minor 5's second half (no browser check reads `data-withdraw-taken-out`) and the left-open table below stand. The PR body must list the unfixed Minors, with their "main: not run" marks (step 4).

## Journey (by reading; provisional)
As last read, except feedback and state ½ (F1-a). **8.5.** Speed still not measured; sizes and accessibility are the builder's.

## Could not check
Any behaviour by running: F1-a is from reading, not seen. Your figures (172/172, 25/25, 26/26, 33/33, 66/66, 56/56, 24/24) are on 853b742d0 and not re-run. 989dc6420 and 7f43dd453 change only the browser check. 3773ef7e9's commit message says that check went 56/56 on a fresh copy of 7f43dd453; I read that message and saw no run.

**Verdict: Block** (head 3773ef7e9). Open Major F1-a: `api/src/library-changes.ts:346` with `api/src/programs.ts:456`. Any push needs a new read of that fix and the label (step 5); no breaker by the ruling.

---
Below: the previous verdict, unchanged. Its V2 and Minors 1, 2, 3 and 4 are closed above, and its F1 is settled above.

# B83 last pass: head 6701498dd4, diff since 4bcf2ae14b (independent reviewer, 5 Nov 2026, 13:20 IST)

**Verdict: Block** (head 6701498dd4). V1 and M11 are closed and the product code added no Major. The one Major is a check this diff breaks: one regex, in a test. **Journey score: 9 / 10, provisional: scored by reading, not walked.** No copy started (P-348 (5)), no new journey report, US$0, nothing committed.

## Major
**V2. The row's own browser check cannot pass on this head (this diff; not a product defect).** `tests/check_b83_own_question_screen_browser.cjs:230`. By reading; not run.
* **Cause:** 29ed06089 changed the Notice title to "This changed after it was proposed: decide what it does now" (`web/src/pages/review-items.tsx:114`). Line 230 still asks for `/Decide this again/`, case-sensitive, inside `[data-came-back]`. Nothing else in that box holds those words. The working tree has no fix.
* **Effect:** `ok` counts a fail and `:334` exits 1. So `run-suites.sh --changed` exits non-zero (WAY-OF-WORKING step 3), and the PR's check goes red if it picks this suite, which globs `tests/check_*.cjs`. The commit at this head fixed an earlier stop in the same script (`:215-216`), so the last run I can see evidence of may never have reached line 230. That is inference: the walk's two changed pictures are dated 12:54 IST, before this head's 13:04.
* **Why Major:** it is R1's screen-level fail test, a named test this diff turns red, and the PR cannot merge on it. The product words are right; only the test is stale.
* **Fix:** `/changed after it was proposed/` at `:230`. Then run this browser check and the packs, which I have no result for on this head. Any push needs a new review and the label (step 5); a test-only regex is a seconds-long read.

## The questions asked
| | State | Evidence |
|---|---|---|
| V1 (M10) | **Closed** | `git diff origin/main 6701498dd4 -- api/src/rule-facts.ts`: only the import and `refuseTakingOverReaders` at `:181`. All five refusals are back, word for word and in main's order. Nothing lost. Breaker ran derived 409, non-key 400, retired 409, same name 409 on 29ed06089. Your `check_forms_c36_rule_facts` 42/42 on 778c8ec47 stands: no API or web file changed since (`git diff --stat`) |
| M11 | **Closed** | `library-changes.ts:316` restores origin, confidence, words and reason through `whatAskReplaced` (`:217`), the same function undo uses (`own-question.ts:212`). `whatAskReplaced` reads what the ask recorded, by edition and form field. A released row reading K cannot reach here: K must still be a draft (`:298`). A fail test sits at `check_b83_undo_withdraw.ts:335`, and it fails if the spread goes. Your 171/171 on 4bcbc3256 stands for the API: only the browser check changed since |
| New Major in the API or web | **None found** | Read the whole delta and the code around it. Below |

**Looked for and not found:**
* **Lost approval (`document-supplies.ts:160`):** `applySupplies` has one caller, `afterApprove`, whose change has just gone APPROVED, so null means only a lost race. The throw reaches `screen02.ts:137`'s catch; `where status APPROVED` then touches nothing, so the withdrawal's words stay. No false "approved" line. The sample loader's approvals are in `try`.
* **`before?.decisionNote` (`screen02.ts:138`):** `before` is read before the decision, so a failed re-approve puts back the note it came with and drops the approver's. Other kinds keep what they already showed. Supplies changes are never sent again (`library-changes.ts:190`), so "Changed since it was proposed" cannot show a return note on a WAITING change.
* **Undo guard (`own-question.ts:212`):** Minor 2's case is right where the row under still reads the ask's key. The merge case stays n13, below.
* **Stale history line:** `whatAskReplaced` takes the newest ask on that form field, even if a person's decision (`screen02.ts:65`, no `edition`) put the row on K later. Needs an ask, its undo, then a person mapping the row to a waiting field, and it errs toward a sign-off. Not a finding worth holding; same reading as undo's.
* **Ran, no database:** `tsc -p api/tsconfig.json --noEmit`, no error in the six API files, filtered by name. `graph.mjs` without `--write`: G1 0, G2 0, G4 0, G5 0; G3 13, G6 5, as before.
* **Earlier findings closed in this delta:** Minor 1 (words, both doors), Minor 3 (409, no audit line), `screen02.ts:138`, Minor 5's first half (own rule's re-add lands, `check_b83_undo_withdraw.ts:384`).

## Minors, one line each
1. **V1's fail test does not fail on V1.** `check_b83_undo_withdraw.ts:376`. The same fact twice is refused by the check inside the lock, which V1 did not remove (breaker's M10 ran this), and its words also match `/already waiting/`. Use `/A proposal to add "/`: only the restored name check quotes the label. `check_forms_c36_rule_facts.ts:143` is the real guard for V1, so this does not hold the PR. That suite has no route test of the derived or non-key refusals; I think that is on main. main: not run.
2. **n14, words.** `screen02.ts:140`: "Nothing was deleted" on a change that deletes nothing. `c.action === "DELETE" ? "deleted" : "applied"`. Line unchanged by this PR. main: not run for the line.
3. **n15, half closed.** `document-supplies.ts:203`: the clip keeps both sets of words, but cuts a long reason mid-word with no mark, and `:214`'s History line now gets the cut text too (the full reason stays on the shared-field line and the field's change, so no fact is lost). `:210`'s comment "never the part clipped" is no longer true. A clipped `earlier` still runs into "The new field" with no space. Long text only.
4. **Words on a lost race.** `document-supplies.ts:160` says a field was withdrawn; if the proposer withdrew the whole change it is false. "This change, or a field it named, was withdrawn at the same moment." Race only.

## Open, not in this delta
* **F1 is still not settled, and I said it should be before the label.** New document type's approved ADD naming a waiting field, through `pack/release`. The fourth breaker pass did not try a route (`break-report.md` carries F1 only from the third). My reading has not changed: `propose` accepts a draft type (`document-supplies.ts:26`), and `unapprovedOf` reads a snapshot's types, which a type no combination lists is not in. It could be a Major; not run. Files unchanged against main, so **main: not run**; the withdraw step that makes it matter is this PR's. Your call and the tech lead's: I do not hold the verdict on it, because you asked me to judge this delta.
* **n13 open** (undo after a merge over a released ask goes back to the state before the release; `own-question.ts:212`). Errs toward a sign-off; the same stale line reaches `library-changes.ts:316` if the merge target is itself withdrawn (read, not run). Minor 4, Minor 5's second half (no browser check reads `data-withdraw-taken-out`) and the left-open table below stand.
* **PR body:** the text I read (body and comments) names none of n13, n14, n15, or follow-ups F1 to F5, and step 4 wants unfixed Minors listed. Add them with their "main: not run" marks.

## Journey (by reading; provisional)
Task completed 1 · next step obvious 1 · plain words ½ (n9) · feedback and state 1 · correct data 1 (V1 closed) · error recovery 1 · accessibility and sizes 1 (builder's on an earlier head; to re-run) · speed ½ (not measured) · visual 1 · trust and sources 1 (R5, M11). **9.0.**

## Could not check
Any behaviour here by running. The browser check, packs and `check_forms_c36_answer_values.ts` on this head: no figures given to me. `gh pr checks 1036` shows every job skipping, so CI has not tested this head. The route suite and C3.6 figures are yours, not re-run. Nothing on main run.

## Fix list
1. V2: the regex at `check_b83_own_question_screen_browser.cjs:230`, then the browser check and packs on the new head.
2. Minors 1, 2 and 4 if you are pushing anyway; list 3, n13 and F1 to F5 in the PR.

**Verdict: Block** (head 6701498dd4): open Major V2, `tests/check_b83_own_question_screen_browser.cjs:230`, test only. V1 and M11 closed.

---
Below: the previous verdict, unchanged. Its V1 is closed above.

# B83 review: "Ask as its own question" (independent reviewer, 5 Nov 2026, head 4bcf2ae14b, diff since 0509b0910c)

**Verdict: Block.** Skill verdict: Ship after fixes. R1 to R5, M8 and M9 are closed. One new Major, V1, which this diff causes: moving M6's check into a shared function also deleted five other refusals from the rule-fact route. It is one small fix. **Journey score: 8 / 10, provisional: scored by reading, not walked.** No copy started (P-348 (5)), no new journey report, as asked.

**Severity rule:** the tech lead's later ruling on PR #1036 replaces the brief's. A Major this diff causes or reaches is a Major and holds the PR. Nothing here is called old on reading alone: what I think is on main is marked "main: not run", with why.

**Ran, no database, US$0:** `graph.mjs` without `--write` (G1 0, G2 0, G4 0, G5 0; G3 13, G6 5, as last time); `tsc -p api/tsconfig.json --noEmit` (no error in the six API files this diff touches, filtered by name). **On main (`origin/main` d236e3e28), git only, nothing run:** `rule-facts.ts:181-189` still holds the five refusals; `library-items.ts`, `forms.ts` and `engine/snapshot.ts` are unchanged against this PR. **Read:** the whole diff, and the propose, approve, withdraw, undo, release and suite code around it. **Taken from the builder, not re-run:** route suite 168/168. The browser check and packs have not run on this head.

## Major
**V1. The rule-fact route lost five refusals (this diff; not on main).** `api/src/rule-facts.ts:181`. By reading; not run.
* **Cause:** the M6 block became `refuseTakingOverReaders`, but the edit also removed the seven lines after it (`git show 0509b0910c:…/rule-facts.ts`, or main `:181-189`). `missing`, `waitingFor` and `FACT_KEY` are now unused in `add`, the sign of it.
* **What is gone from `POST /combinations/:id/rule-facts`:**
  * MA3, retired field: `library` holds only DRAFT and PUBLISHED (`:147`), so the add answers 201 with a proposal the lander always refuses (`proposals.ts:588`). Reachable from the screen: the fact is still listed as missing.
  * m7, one waiting item per name across the workspace: a second waiting item under one name, from the screen.
  * Derived fact: a worked-out key can be proposed, and landing makes a library field of it (`taken` reads only `canonical_field`). Route only.
  * `FACT_KEY`: a key that is not group.name can be proposed and land. Route only.
  * `waitingFor`: covered by the check in the transaction, so no effect.
* **A named test fails:** `tests/check_forms_c36_rule_facts.ts:142-143` expects 409 with "retired" and "restore"; by reading it now gets 201. That suite is in `run-suites.sh` and not quarantined, so CI should go red. The B83 suite cannot see this; 168/168 is true and does not cover it.
* **Fix:** put the seven lines back under the call at `:181`, unchanged. Run `check_forms_c36_rule_facts.ts` and `check_forms_c36_answer_values.ts` on the final head.

## Closure, checked for myself
| | State | Evidence |
|---|---|---|
| R1 approver told | **Closed**, one false word (Minor 1) | Queue `review-queue.ts:275`, page `review-items.tsx:114`. `what` reaches both the second person and the proposer. Tests: route `check_b83_undo_withdraw.ts:259`, browser `check_b83_own_question_screen_browser.cjs:228`. Note is words, no key; ".." cannot occur (`said` drops the stop) |
| R2 tests run | **Closed: setup cannot skip them** | Both `if (startFacts.length)` are now bare blocks. Setup seeds two facts by SQL and `ok` at `:232` fails unless there are exactly two. `holder.spouse` is valid. `ok` only counts, nothing exits. **168 adds up by hand:** the 159 I counted last time (swap and whom-about included) + R1 1 + R3 1 + R5 2 + M8 1 + M9 1 + the who-fills reader's 3 |
| R3 race | **Closed**, one record (Minor 3) | `applySupplies` re-reads under the withdrawal's lock (`document-supplies.ts:144-146`), not APPROVED writes nothing, `:153-154` refuses a fact with no row. No lock cycle: withdrawal takes field then supplies locks, approval only supplies. Test `:313` fails if `live` goes (`refuseUnusable` and `refuseRetired` pass a key with no rows). The status branch has no test: race only |
| R4 who-fills | **Closed** | `where-used.ts:148-156`. Key is the placement's lineage (`who-fills.ts`, `question-condition.ts`); the set takes the field's key and the lineages asking it. Test: new reader row, route suite |
| R5 undo | **Closed for the case asked**; BR-9 edge (Minor 2) | Ask records `{ edition, undo }` in the same step's audit line (`own-question.ts:178`); undo's own line and `screen02.ts:65` carry no `edition`, so the newest match is the ask. Older asks fall back to a person's change. Test `:327` fails if restoring goes. `needs_sme` counts origin, so the sign-off stays owed |
| M8 check | **Closed on any route that exists** (Minor 4) | `library-changes.ts:235` reads `checks[].condition`, `fact_sources[].fact`: both are real snapshot names (`snapshot.ts:213-214`), so the optional types hide no mismatch. All four `unapprovedOf` sites pass a whole snapshot. Test `:349` |
| M9 lander | **Closed** | `proposals.ts:592`, same function as the route. `field` is not in `READING_DRAFTS`, so a proposal never reads as its own reader and the own-rule re-add still lands (by reading; Minor 5). Test `:371` |
| q4 loading, n10 words, note clip, lock order, M6 no-key test, q8 concept | **Closed** | `library-item-actions.tsx:98`; `where-used.ts:153`, `library-changes.ts:320`, "goes back to a second person" at both doors; `document-supplies.ts:209`; `:194` `orderBy`, `peek` gone; test `:363`; BR-8, BR-11 updated |

## Left open: which, and is it right to leave
None is a Major by my reading. "main: not run": for you to run on main; I ran nothing there.

| Item | Which | Why, and why I think it is on main |
|---|---|---|
| F11 near names | Minor, this PR | The ask form; the limit of C3.6's check. Right to list |
| False "was retired" on a dead merge | Minor, words. **main: not run** | `forms.ts:348`, file unchanged against main. Right outcome, 409, "reject" is the right step |
| n6 own Delete | Minor, route only. **main: not run** | `library-items.ts:248,255`, file unchanged. The outcome is bad (false Submit block), but no screen offers it: the row offers Withdraw. Right to list; it would be Major if a screen reached it |
| n9 approve 409 with a key | Minor, words. **main: not run** | `document-supplies.ts:49`, for any waiting change with a merged fact. Key in words to a second person (STANDARDS §3) |
| n11 preview and audit key | Minor, this PR | `freeKey` causes the mismatch, so it is not old. Words only, hold kept |
| n12 own condition refused | Minor, this PR | The false "unseen" is gone in the new words; BR-11 now records it. Right to list |
| Tests for q1, n8 | Minor, this PR | STANDARDS §7 unmet for two rules, both run by the breaker by hand. Cheap; I would add them, and I do not hold on them |
| `screen02.ts:138` | Minor. **main: not run** for the line | Line unchanged, but **this diff makes it matter**: it now wipes R1's Notice after a failed re-approve. The approver still gets the 409's words. `before.decisionNote` is in scope, so keeping it is one expression. I would fix it now |

**Breaker's follow-ups from the third pass, which the PR list leaves out; add them:**
* **F1, new document type's approved ADD naming a waiting field: not settled, and it could be a Major.** `publishLibraryChanges` (`library-changes.ts:329-347`) publishes the type's draft with no look at what it supplies. Withdraw then answers 201 and a published type names a gone field: M7's result, through the release page. The breaker built it by SQL and tried no route. By reading one looks possible: accept a new type (draft, facts `[]`), propose and approve its facts naming K, approve the ADD, release through `pack/release`. Not run. **The running breaker should try that route before the label: if it holds, it is a Major.** main: not run (I think so because the release path has no such check on main, but this PR's field is what makes the withdraw step reachable).
* F2, approved field supplied only (`snapshot.ts:179-194`, unchanged): stays DRAFT. Withdraw 409, so off the path. **main: not run.**
* F3, raw key in the Release page's why; F4, a merge moves facts, not `supplies_about` (`forms.ts:391`, unchanged). **main: not run.**

## Minors (worth fixing with V1)
1. **"Decided" is false on a change nobody decided.** `review-items.tsx:114`, `review-queue.ts:275`. `dropFactFromChanges` also writes the note on a WAITING change, narrowed before any approval. It then reads "Decide this again: it changed after it was decided" and "Back for a second look". Right outcome, false words. Say "it changed after it was proposed", true in both cases. The browser check's `/Decide this again/` needs the same edit if that part changes.
2. **BR-9: a draft over a released ask is restored as if unreleased.** `own-question.ts:212` tests only `cur.status === "DRAFT"`. Ask released, then a draft over it (merge `forms.ts:377`, options `:264`, list purpose `:280`), then undo: `onlyThisAsk` is false, so the row goes back to the pre-release AI origin and words, where BR-9 and your brief say a person's change. By reading, not run. Minor because it errs toward a sign-off and the words do describe the mapping. Fix: also require `under?.canonicalFieldKey !== key`.
3. **A lost approval says approved.** `document-supplies.ts:146` returns null, then `screen02.ts:145` writes "approved" in History and answers 201 with WAITING. Forced race only; the state is right, the line false. Fix: on approve with `now.status === "WAITING"`, 409 in words and no audit line.
4. **M8's reading is narrower than the hold's.** `library-changes.ts:235` reads `"field"` only; `validate.ts:71` scans the whole condition, because a validity rule names its date in `before`. No API route writes one (`issued_within_months` is not in `api/src`), so no way round today. The fact source half has no test. A field map's `transform` and `condition` (`validate.ts:73`) are in neither: I found only the draft flow writing them, not settled. main: not run.
5. **Tests:** no pass test that an own rule's re-add lands (BR-11's exception); M6's pass stops at the proposal, and M9's new check sits on the landing, so this is the regression to guard. No browser check reads the taken-out words (`data-withdraw-taken-out`).

## [M] lines (met unless named)
EXPERIENCE: §2.5 met, second person now told. §2.8 undo met, Minor 2. §2.10 met. §2.12 to re-run on the final head. §4 states met. §5 words: Minor 1, n9. STANDARDS: §2 governance met, except F1 if it holds. §3 no typed key, second person: n9, n11. §5 no new per-row class. §6 met. **§7 "a rule's test fails when removed": met for R1 to R5, M8, M9; not for q1, n8, Minor 5. The C3.6 suite's test exists and would catch V1, if run.** §10 met.

## Scores and journey (1–5 and out of 10; by reading)
D1 4 V1 · D2 4 V1 · D3 4 F11 · D4 4 Minor 1 · D5 5 · D6 4 V1 retired dead end · D7 4 Minor 2 · D8 4 · D9 5 · D10 4 Minor 1 · D11 5 · D12 4 · D13 4 not re-run · D14 5 · D15 5 · D16 4 B83 suite strong, other suite not run · D17 simulated only · D18 5 · D19 4 · D20 simulated only.
**Journey (provisional, by reading):** task completed 1 · next step obvious 1 · plain words ½ (Minor 1, n9) · feedback and state 1 (R1) · correct data ½ (V1) · error recovery ½ (V1's proposal that can never land) · accessibility and sizes 1 (builder's on an earlier head; to re-run) · speed ½ (not measured) · visual 1 · trust and sources 1 (R5). **8.0.** With V1 fixed, 9.

## Could not check
V1 by running, and any behaviour here by running: read-only (P-348 (5)). No walk, keyboard pass or 200 % zoom of my own at this head; no real screen reader or intended user. Nothing on main run. The new browser lines have not run. Retrofit mapping: none needed (no migration).

## Fix list
V1, then `check_forms_c36_rule_facts.ts`, the route suite and the browser check and packs on the final head. The breaker tries F1's route. Minors 1 to 3 and `screen02.ts:138` are one line each. In the PR: the items above with their "main: not run" marks, plus F1 to F4.

**Verdict: Block** (head 4bcf2ae14b): open Major V1, `api/src/rule-facts.ts:181`; F1 to be settled by the breaker before the label.
