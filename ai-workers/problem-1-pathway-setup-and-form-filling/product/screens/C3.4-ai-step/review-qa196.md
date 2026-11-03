# Review: QA-196, AI form and guide checks through the one door (forms lane), commit b8a00b8ef

Reviewer: a fresh agent that did not build it. Diff `origin/main...b8a00b8ef` (5 files). Isolated copy `rvqa196` on :4441 only, web bundle rebuilt, live AI off (no `*_LIVE` set, no priced route), US$0. `p2/` and the worktree were clean after every run. This review covers the queue part of C3.4 (To review side panel, `decide`/`undo`, the new lander). The journey score is in `journey-test-reviewer-qa196-2026-11-03.md`.

## What held (evidence)
- `tests/check_forms_c34_ai.ts`: **54/54** on a fresh copy, including the 4 new QA-196 lines. C3.4 pack: **7/16**, the same as main (the replay is refused until a founder-approved saved run exists). `graph.mjs --check`: G1 0, G2 0. No G3/G6 entry touches this change.
- Edition form checks: shown in Decide, never Ready, never ticked with others (`bulkWhy` returns `acceptWhy` first). The side panel shows "Not accepted here yet" and offers only Reject. API Accept answers 409 in the same words and writes nothing. The group counts use `bandOf`, so they match the bands.
- Guide check: an edit that reads a question the library does not have gets 409, and nothing lands. Accepted as it stands, it lands one DRAFT `check_def` row on Visitor visa with the guide quote and `origin AI_PROPOSAL`. Row locking in `decide` means two decisions on the same item run one after the other.
- Decide versus off the queue: keeping edition checks visible in Decide with a reason fits P-120 (AI drafts a form's checks as proposals). It is honest and not a dead end, because Reject remains. The pack line "it proposes sections, answer lists and form checks" still holds: they are proposed, they just cannot be accepted yet. I accept the split.
- #718: no clash in source files (`masters-ai.ts` and `form-masters.ts` are untouched here). **`git merge-tree` shows a content conflict in `tests/check_forms_c34_ai.ts`**: both PRs add imports near line 37 and lines in the S block. The second PR to merge has to rebase. #718's v2 guide prompt keeps the rule that the tree is "TRUE when the answers pass" (`masters-guide.v2.md:21`), so B1 below affects both PRs.

## Blocker (1)

**B1. A landed guide check does the opposite of what it says.** `api/src/proposals.ts:391`: `predicateJson: c.tree`. The AI's tree is the *pass* condition: the prompt says the tree is "TRUE when the answers pass", and `runExamples` (`engine/masters-ai.ts:107-108`) reads true as pass. A `check_def` condition is the opposite: it is the condition under which the check *fires*. `render.ts:265-272` fires a check when `applies === true` (see `check_c44_part2.ts:95`, "funds `lt` 1000"). On :4441, with the guide check landed on Visitor visa, `GET /combinations/:id/preview`:
- `answers={"principal|person.passport_number":"AB123456"}` → fired `AI-SC-01-wrg` warn section_check "The passport number is given as shown on the passport";
- `answers={}` → no check fired.

Because a `section_check` at warn blocks "ready to file" (`engine/runtime/forms.ts:130`), every correct case is blocked and every wrong case passes. **Fail test:** land the guide check, then preview with the passport number given: it must not fire and must not block IMM 5257. Preview with it missing: it must fire. The fix: store `{op:"not", args:[tree]}` (or the language's form of negation) and keep `subjectKind`. Then add this runtime assertion to the suite: today's suite checks only the stored row, so it passes with the bug in place.

## Major (3)

**M1. Undo leaves the landed check behind, and accepting again adds the same check again.** `LANDED`/`STAMP` (`proposals.ts:490-503`) have no entry for checks, and `undo` removes only requirement lines (`:708`). On :4441 (browser and API): Accept, then Undo shows "Undone: 1 proposal waiting again.", but `AI-SC-01-hh7` stays in the Visitor visa draft. Accepting again lands another row. I ended with 3 rows with the same condition and message (`count 3, distinct 1`). The author's own door refuses this: `studio.ts:904-907` "This check is already in the draft." (409, confirmed on :4441). **Fail tests:** (a) after Accept then Undo, `check_def` has no row with that key; (b) accepting the same check when an equal DRAFT check is already on the combination gives 409 and lands nothing. Fix: add `form_check`/`cross_check` to the undo removal and the change stamp (keyed by combination and check key), and add `saveCheck`'s same-check refusal to `landCheck`.

**M2. The lander throws away the group, the severity and the Sample label the reviewer saw.** `proposals.ts:387-392` sets the group from the number of answers read (`section_check`/`cross_check`), always uses `warn`, and sets `illustrative: !quote`. The AI's own `work.group` (`official_rule`, `cross_record`, `readiness_warning`) and `work.severity` (`block`/`warn`/`advise`/`sme_pending`) are dropped:
- An `official_rule`, `readiness_warning` or `advise` check becomes a `section_check` that blocks filing. `forms.ts:150-152` says that advice, readiness warnings and official rules only warn (P-168, P-136).
- `cross_check` is a group nothing else knows. The cross-answer group in the code base is `cross_record` ("Answers compared", `library-sources.ts:291,293`). A landed `cross_check` has no tier and no wording in Library › Checks.
- An `sme_pending` check ("needs an immigration value the guide does not state") lands as sourced (`illustrative` false). Its examples are dropped too. The side panel said "Sample until the immigration expert confirms" (screenshot 4), and the landed row is no longer Sample. That breaks AGENTS rule 4 and P-149 (5).

**Fail tests:** a guide check with `group: "readiness_warning"` or `severity: "advise"` must not land as a filing-blocking `section_check`. A two-answer check lands as `cross_record`. An `sme_pending` check lands with `illustrative` true (or is refused until the expert gives the value).

**M3. A person without the author duty can edit a combination draft through this lander.** `landCheck` has no `need(l.actor, "author")`. `landRequirementLine` (`:305`) and `acceptPqrPick` (`fact-sources.ts:232`) both require it, and so does the author's own door (`studio.ts:891`). On :4441, the Content reviewer (user-C: review and sme duties, no author) accepted the guide check in the browser and it landed. The same person on `POST /combinations/:id/checks` gets **403**. The suite itself accepts as user-C. **Fail test:** user-C Accept on a guide check gets 403 and lands nothing. user-A gets 201.

## Minor
1. A retired field can pass: `proposals.ts:383` drops RETIRED *rows*, but a retired field's older SUPERSEDED version stays in the map. Use `retiredFieldKeys` as `studio.libraryTypes` does (`studio.ts:755`), or take the newest version as `:337-340` does. Release only warns about a retired field (`validate.ts:94`).
2. The words in the Decide row contradict the reason. In `proposals.tsx:122-123` the edition form check row reads "New library item" and "Both readings agree" under "Why a person looks", because `reason` is null. The panel subtitle says "shared library" (`:164`). Show `accept_why` in the row (as `p.reason ?? p.accept_why ?? …`). The notice title also repeats its first words ("Not accepted here yet" / "Not accepted here yet: …").
3. `appliesTo` is set to `c.reads[0]` without checking it (`:391`). `saveCheck` requires a library field (`studio.ts:903`), and for a cross-answer check `reads[0]` is just whichever answer comes first alphabetically.
4. No browser test covers hiding Accept or showing `accept_why`. I checked both by hand (screenshot 2).
5. An edition check can never leave Decide except by Reject, so its group never clears. That is acceptable for now, but say so in the PR, along with the follow-up row that gives edition checks a home.

## Decisions check
P-149 (1) one door: edition checks yes, honestly kept in Decide. Guide checks: they go through the one door, but not with the same rules (M1, M3). P-158: lands on a combination, so no library add and no second person until release, which is correct. P-120: yes. P-153 code is the guard: the tests check the stored row, not what it does (B1). P-47 tiers: see M2.

## Not checked
A real saved AI answer (none exists). Retired combinations: `saveCheck` does not check that either, so parity holds. A real screen reader.

**Verdict: Block.** Fix list: B1 (store the fire condition, the negated tree, and add a runtime preview test), M1 (Undo removes the landed check; same-check refusal), M2 (keep the AI's group, severity and Sample label; `cross_record`, not `cross_check`), M3 (`need(author)` in `landCheck`). Minors 1-2 can go in the same pass. Rebase on #718's test changes, whichever PR merges first.

---

## Round 2: re-review of 799c92d8a (diff `b8a00b8ef..799c92d8a` only)

Same reviewer. Isolated copy `rvqa196` on :4441 with a fresh database. Web bundle rebuilt. Live AI off, US$0. The worktree and `p2/` were clean after every run, and the copy is stopped. I read the committed `break-report-qa196.md` beside the diff.

**The change.** The guide-check lander is withdrawn, and `form_check` and `cross_check` have no lander. `acceptWhy` (`api/src/proposals.ts:373-378`) gives a reason in words for both. A form's own check: "the library has no place". A guide check: "added only once this queue can add checks safely … the author can add a check by hand meanwhile". The refusal in `decide` with no lander now uses those words (`:603`). The Work queue counts these items in Decide (`review-queue.ts:161`). The queue row shows "No place yet" and the reason (`proposals.tsx:122-123`).

**Choice.** Keeping both kinds in Decide, never Ready, never accepted, is one of the two options the tech lead offered, and the safe one. Round 1 and the break report show that landing an AI check is its own capability. Today's lander would land inverted conditions, orphans and duplicates (B1/M1-M3; break B1-B8). Withdrawing it closes all of them at once: nothing writes `check_def` from the queue. The PR names the follow-up row ("AI checks land through the one door") with both reports as its spec. P-120 holds: AI still proposes the checks, a person sees them with the source and both readings, and can reject them. The pack line "it proposes sections, answer lists and form checks" still holds.

**Evidence (mine)**
- `check_forms_c34_ai.ts`: **53/53**. The 3 QA-196 lines pass. The form check and the guide check sit in Decide with `accept_why` equal to `bulk_why`. API Accept gives 409 in the same words, with 0 `check_def` rows from `AI_PROPOSAL`. The Work queue line reads "1 ready to accept, 26 to check, 1 to decide", and To review shows Ready 1.
- The rule's test fails when the rule is removed. With `review-queue.ts:161` set back to `r.confidence`, the suite gives 52/53. Only the B9 line fails ("2 ready to accept … 0 to decide"). Restored afterwards.
- Edit through the API also reaches the no-lander refusal (it takes the same branch as Accept), so no route lands a check. `sources.ts:808` bulk-accepts only a field-map job's High items, not checks.
- Screen (headless Chrome, as user-C): IMM 5257 Decide row: "Form check · AI · No place yet · Not accepted here yet: a form's own checks …". Visitor visa Decide row: the guide check with its reason. Both side panels offer **Reject only**, with the notice. Axe WCAG 2.2 A/AA found nothing on the group and both panels. No sideways scroll at 1024 or 400 px. No console or page errors. The group loads in 263 ms.
- I did not re-run the C3.4 pack (7/16) or the other suites on this commit. The builder reports exit 0, and nothing here changes their routes, apart from the refusal wording for kinds with no lander (`acceptWhy` returns null for every other kind, so their words are unchanged).

**Round 1 findings**
| Finding | Status |
|---|---|
| B1 inverted condition | Closed: nothing lands (no lander) |
| M1 Undo orphan, duplicates | Closed: nothing lands |
| M2 group, severity, Sample lost | Closed: nothing lands |
| M3 author duty | Closed: nothing lands. The follow-up must call `need(author)` |
| Minor 1 retired field | Closed with the lander |
| Minor 2 row words | Fixed: "No place yet" and the reason in the row |
| Minor 3 `appliesTo` | Closed with the lander |
| Minor 4 no browser test for hidden Accept | Open (checked by hand above) |
| Minor 5 never leaves Decide | Accepted. The reason now says so, and the follow-up row is named |

**New or remaining (none blocking)**
1. Minor: "No place yet" is exact for a form's own check. A guide check does have a place (its combination); what it lacks is a safe way in. Words like "Not yet" would fit both. `proposals.tsx:122`.
2. Minor (break B14, still open): a bulk Accept through the API that includes one of these items names it by its identity key (`decide`'s multi-accept message uses `nameOf`, and a check payload has no label). The screen never offers a box for them, so only API callers see it.
3. Minor: the side panel subtitle still says "shared library" for a form check with no place in the library (`proposals.tsx:164`), and the notice title repeats its first words.
4. The follow-up row's spec should hold, as its done-when list: round 1 B1/M1-M3 and Minors 1 and 3, and break B1-B8 and B10-B15 (fires on failing answers, never twice, goes with Undo, keeps its group, severity and Sample label, reads only released questions, author duty, a retired or missing combination refused in words).
5. #718: the content conflict in `tests/check_forms_c34_ai.ts` remains (both PRs edit the S block). The second to merge rebases. No source file collides.

**Journey score, round 2:** 8.5/10, a pass.
- Task completed 1: the reviewer learns what to do and nothing harmful can be accepted.
- Next step ½: "Keep" has no action, though the reason says what to do.
- Plain words ½: "No place yet" for a guide check, the subtitle.
- Feedback 1, Correct data 1, Error recovery 1 (409 in words, nothing written).
- Accessibility 1, Speed 1, Visual 1.
- Trust ½: the reading still shows the AI's "(block)" with no word on what it would become. Moot until it lands.

**Verdict: Approve** (commit 799c92d8a; no open Blocker or Major).
