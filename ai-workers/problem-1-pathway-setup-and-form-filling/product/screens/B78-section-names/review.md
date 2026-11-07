# Review: B78 C10.1 row 7, name the unheaded sections (PR #1062)

**Commit reviewed: b17da354b** (merge of d2e0d82dd, #1009, into 91a53ae75). My load ran on 91a53ae75; the merge changes no placement or proposal code. **Verdict: Block** (skill scale: Ship after fixes). One Major, no Blocker. Journey score 6.5/10, below the bar: `journey-test-reviewer-2026-11-05.md`.

There is no concept file for this row. The bar used is the row, the tech lead's brief, P-334 (1), P-343 (10), AGENTS rule 4 and P-319.

## Blockers
None.

## Majors
**M1. A person's name does not change where a question is asked, yet row 7 says it does.** `api/src/form-part-placements.ts:49` reads only `accepted`, `waiting` and `rejected` proposals, so a named section (`edited`) is never read. A rejected twin keeps its placeholder label, so `byTitle` misses it at `:51`. The boxes of all 29 parts therefore give no section, and their facts fall to the nearest-box fallback.
Measured on my fresh load:
- All 15 newly named sections hold **0 questions**.
- 26 facts read only in those 29 parts sit in another section:
  - six "Coming into Canada" facts, and six employment-history facts, under "Details of intended work in Canada"
  - `person.primary_phone_number` under "National identity document"
  - `person.alt_phone_number` under "Details of intended study in Canada"
  - `case.subject_is_principal_applicant` under "Previous travel"
- All are `client_visible`, from `client_questionnaire`.

By reading the code, main places them the same way, so B78 does not make this worse. But row 7 now reads **done** with "named by a person" and "N facts asked in the section of their form field". The twin reason says "reused, not added again", and the comment at `demo.ts` says "the placement step reads its boxes into it". For these 29 parts those claims are false. The same gap applies to a real person naming a section on To review.
Fix: add `edited` to the status list (its payload carries the given name). Give a held twin's rejection the section it reuses, and read that. Add a check that a named section holds its boxes' facts: `check_qa144_vv_release.ts:82` "asked in the sections of their form boxes" only proves `placed > 100` and no orphans. If the tech lead prefers its own row, that is a ruling for them; until then row 7 must not claim this.

## Minors
- **m1. Wrong page on two entries.** `samples/section-names.json:8` and `:16` (IMM 1294) cite "CONTACT INFORMATION", page 3. The form prints that banner once, in its Page2 subform; only the boxes are on page 3. The audit reason repeats page 3. Fix: page 2. The PR's "29 of 29 found" checked the words, not the page.
- **m2. Row 7 wording.** "from the form's own words (Sample)" covers 4 entries that are a person's wording, Sample, Unconfirmed: expert (the brief's mark). "29 of them" follows "56 … (14 more …)": it is 15 of the 56 plus all 14 reused. Fix: say both counts and both marks.
- **m3. 14 of the 29 record no name.** A rejected twin stays "Unnamed section N of …" with no given name, basis or page; only its reason names the reused key. Row 7 still counts it as named by a person. Line 3 skips it.
- **m4. Two new lines claim more than they prove** (`check_qa144_vv_release.ts`).
  - Line 2's "or reused the library's section of that name" passes on any rejected row, and it checks the decider on edited rows only.
  - Line 3's title says "the form's words and page", but its regex finds only the Sample mark. A NULL reason passes too (`!~` on NULL). `check_b78_section_names.ts` covers the wording on a made-up entry only.
- **m5. `namedByPerson++` runs before `decide`** (`demo.ts:681`), so a refused edit is still counted on the row. The row would be partial then, but the count is wrong. Count after landing.
- **m6. `about`/`basis` in the names file** says the words come from `official-sources/ircc/forms`; IMM 5476 (11-2021) is in `previous-editions`. Its "I am:" is there, as cited.

Noted, not B78's: the Sections page says "New: waiting for a second person" on items the database holds as APPROVED, and "AI-proposed" on sections from the rules pass (US$0).

## The 29 names
Read against each form's XFA template (the 11-2021 edition for IMM 5476) and each part's inventory captions. **All 29 are honest names for their fields, and no `basis` is wrong.** The quotes are the form's words; only the two pages in m1 are wrong. "Indicate whether you are" is a printed fragment and weak as a title, but honest and marked. "Ill treatment of prisoners or civilians" shortens a printed question, and the name reflects its quote. The 4 sample entries are correctly marked in their reason.

## demo.ts flow and the merge
- **Flow:** a held section takes an entry only by exact edition and first field; with no entry it stays waiting and listed. Named sections go through the same `decide` as the route, as the author; plain accept stays refused; the Approver approves. Nothing was waiting after my load. P-319 holds: no form number in code. P-334 (1) kept these sections waiting; this row's brief changes that for a section with an entry, and one with no entry still waits.
- **Twin path:** all 14 twins join a section of the same meaning, so a client sees no wrong name. What is wrong is the placement, M1.
- **Merge:** `git diff d2e0d82dd b17da354b` is exactly B78's five files, with the same `demo.ts` lines as before. `git show --cc` shows no hand-resolved hunk in `demo.ts` or the test. #1009's rows 9, 11 and 12 are untouched, and row 7's lines are not in its hunks.
- **Idiom:** usage line, `ok()` helper, `samples/` data and glob discovery match their neighbours.
- **Tests:** only 5 lines added to the release check; nothing changed or weakened.
- **Other suites:** by reading, `check_c10_1_configured.ts:75`, `check_qa144_lmia_release.ts:54`, `check_qa144_sp_release.ts:57`, `check_c10_1_browser.cjs:48` and `check_b52_own_yes_no.ts:47` all tie row 7 to `heldNow` or accept done, and none pins a section count. CI at b17da354b agrees where I could read it: configured 38/38, LMIA 23/23, browser 12/12, `check_b78_section_names.ts` 9/9. I did not find the study permit and B52 suites in the finished shards.

## Done-when
| Item | Result | Evidence |
|---|---|---|
| Row 7 done on a fresh checkpoint | **Yes, on GitHub** | Run 41969573179, b17da354b: C10.1's non-done list is `2 out, 9 waiting, 10 partial, 12 partial`, with no row 7. #1009's own run listed "7 partial" |
| No section waits for a name | Yes | My load: 0 waiting of 70 (41 accepted, 15 edited, 14 rejected) |
| `check_qa144_vv_release.ts` passes | **Yes, on GitHub** | CI run 41969838547, b17da354b: 33/33, log read. My own run did not complete: 13 PASS, 2 FAIL, then ECONNRESET at the database's PANIC; both FAILs were row 7 partial, see below |
| C9.1, C4.8 no worse | Yes | Same run, logs read: 17/17, 11/11; C4.1 25/25 |
| CI green | **Pending** | PR #1062, at b17da354b: types and 5 of 6 shards passed; shard 6 still running when this was written |

**Why my row 7 was partial:** the shared database returned `could not open file … Interrupted system call` on my copy at 10:01:53 IST, during a `section_question` read. That was the only such error on my database. One placement (`person.uscis_number`) was missing and the study permit was not released. Asking the same step again placed it with nothing refused. The total then matches the builder's saved load on 9c673317e (229 facts, row 7 done; my 228 plus this one). So this was the host, not B78, and the row reported it honestly. The shared database also hit a PANIC on the same system error at 09:09 IST (before my copies) and at 10:11 IST (while my copy ran), restarting it for every copy on the Mac.

C10.1's 21/24 fails R9, R12b and "every row done" (rows 9, 10, 12); P-343 (10) expects them outside this row.

## D1–D20 (1–5; a loader and data change, so the screen D's are mostly unchanged)
D1 3: row completes, M1 stays open · D2 4: one record each, exact keys; m1 · D3 4: 14 twins reused · D4 3: M1's facts resolve, in the wrong section · D5 4: reports the host error honestly; file is refused if malformed · D6 4: read date, audit line · D7 3: rules, not AI, yet marked AI-proposed (pre-existing) · D8 4 · D9 3: 15 sections show 0 questions, no next step · D10 3: m2 · D11 3: "waiting" words on approved items (pre-existing) · D12 4: team look unchanged · D13 4: axe clean, no sideways scroll at 400, 1024, 1440; keyboard not walked · D14 4 · D15 not judged: load 21–35 · D16 3: M1 and m4 · D17 simulated only · D18 3: reason has quote and page, but the row says "No source recorded" · D19 3: a name does not reach the questionnaire · D20 simulated only.

## Graph (P-86)
`graph.mjs`: G1 0, G2 0, G4 0, G5 0; G3 12 and G6 5, none naming `section-names`. No new page or route.

## Could not check
- A complete local run of `check_qa144_vv_release.ts`: its pass is GitHub's. The study permit and B52 suites' results: not in the finished shards.
- Row 7's full text on b17da354b; GitHub's log gives its status only.
- Placement on main by measurement: reading only.
- SCH1's rendered pages: its XFA is one flowing `page1` subform, so "page 1" on Military service and Ill treatment is unconfirmed.
- A client's own screen: read from `section_question`, no case walked.
- Keyboard walk and 200 % zoom. The naming box itself is not re-walked; `check_forms_qa206_name_browser.cjs` covers it.

**Verdict: Block** (changes needed). Fix M1, or get a tech lead ruling that moves it to its own row and changes row 7's words. Minors m1 and m2 are one-line fixes worth making in the same pass. Reviewed: b17da354b.

---

# Round 2: 28483c59a (diff b17da354b..28483c59a only)

**Method:** code read, plus GitHub run 41973026639 at this commit, logs read. No server or load, on the tech lead's load rule. I also ran read-only queries on a kept database, `xr_studio_screens_runtime_c101` (pre-B78: 29 waiting, 41 accepted), and replayed the placement rule from it. The old rule reproduced 223 of 223 of its placements. The new rule predicted CI's four counts and its list of 7 empty sections exactly. "Replay" below means this, not a load.

## Blockers
None.

## Majors
**M1: fixed.** `form-part-placements.ts:50-52` reads `edited` by `decidedKey`, and `proposals.ts:850` lands a held section named what the library holds on that section. The route and the loader share `decide`, so a person's naming on To review takes the same path. Evidence:
- CI: "Coming into Canada" 6 questions (0 in round 1), "Employment" 13 (7 by replay of the old rule); all 29 `edited`, each on a section of its name.
- Replay: 40 facts move, including all of round 1's examples: phones to "Contact information", `case.subject_is_principal_applicant` to "Indicate whether you are".

**M2 (new): CI is red on the new guard; two of its four titles are wrong.** `tests/check_qa144_vv_release.ts:75` FAIL: `{"Coming into Canada":6,"Language(s)":0,"Passport":0,"Employment":13}`. The code is right and the check is wrong: those facts are first read on the Visitor visa's IMM 5257, and a fact has one placement, so they sit in "Personal details". Shards 1, 3 and 6 were cancelled, so their suites have no result at this commit.
- The guard is also weak: "Employment" passes on the old rule too, and "> 0" does not show that a section holds its own fields. The comment at `:71` claims it does.
- Fix: check named facts in named sections, for example `person.original_entry_date` in "Coming into Canada", `person.employment_employer` in "Employment", `person.primary_phone_number` in "Contact information", `case.subject_is_principal_applicant` in "Indicate whether you are". These come from the replay; confirm them on the run.

## Minors
| Round 1 | Result |
|---|---|
| m1 pages | Fixed: both entries say page 2 |
| m2 wording | Fixed: "29 sections … (Sample; 4 in a person's wording, Unconfirmed: expert)", apart from the 56 and the 14 |
| m3 no name | Fixed: all 29 are `edited` with their name and reason |
| m4 lines claim more | **Part open:** line 2 and the NULL are fixed. Line 3's title (`:69`) still says "the form's words and page", but its regex finds only the Sample mark |
| m5 count | Fixed: counted after `decide` |
| m6 source | Fixed: names `previous-editions` for IMM 5476 |

New:
- **m7. Held sections with a printed heading are miscounted.** `namedTwin` also takes a held row with `work.heading`, but `demo.ts:683` works out `twin` only for `given`. Such a row is counted as "drafted", not "reused". There are none on today's three combinations (CI still says 56 and 14); #1052's forms may have some, since IMM 0008 prints PASSPORT over two parts. Fix: work out `twin` for every held row.
- **m8. A person is not told the section joined another.** Before, this name got a 409 in words. Now the box says "It is accepted under this name" and the message is "Decided. It landed as <key>", the same as a new section (`web/src/pages/proposals.tsx:162`). No browser check covers it.
- **m9. Stale comments.** `proposals.ts:822` and `:874` say an edit always lands a new item; a held section named as a library section does not.

## The new risks asked about
- **Undo guard:** holds. `resolved` stores `reuse`, so the `users` check at `:975` refuses Undo of the section's first copy while a named section uses it. Undo of the named one removes nothing: it is not in `added`, and it has no `LibraryChange` or stamp. Only the second is tested.
- **BR-7:** holds. It writes no `LibraryChange`, and a section still waiting stays waiting; the test lands on a DRAFT and counts. Return or withdrawal of that section afterwards is the same exposure as any accepted reuse; not traced further.
- **Near-duplicate:** unchanged; the check finds matches for fields only.
- **Batch:** cannot happen. An edit is one item (`:782`), and `namedTwin` needs an edit.
- **Queue views:** fine, apart from m8. The Undo line puts the row back as "New library item" with the naming box; without it the row would read "Reuses …". Of 29 held rows in the kept database, none carries `twinOf`, so its override of the twin line does not arise there.
- **Non-held:** does not slip through. `unnamed === true` is required, and a printed section still gets the 409 (tested, passes). Legacy sections are still refused, as before.

## The new test lines
- `check_forms_qa206_section_headings.ts`, 47/47: all three lines prove what they say. The comment's "its boxes are asked there" is proved only by the vv check.
- Row 7 regex: **right**, passes on CI. Line 2 (29 on a section of their name): right, passes.
- Four titles: **wrong**, M2.
- Other suites at this commit: LMIA 23/23, configured 38/38, browser 12/12, `check_b78_section_names.ts` 9/9.

## Noted, no change asked
- 7 named sections hold no question; the check's log line lists them. By replay: Full name, Date of birth and UCI, Language(s) and Passport have facts first read on IMM 5257; Custodian information and Ill treatment have no mapped field. Signature was not traced beyond holding none.
- The placement step places only unplaced facts, so a person naming a section after a placement run does not move facts already placed.

## Journey
Not re-walked (no server). **Score stays 6.5/10, on b17da354b**, below the bar of 8. Steps 4 and 5 now look fixed by CI and the replay, but no one has walked them on this commit.

**Verdict: Block** (changes needed). Fix M2 and rerun all shards; m4, m7, m8 and m9 are worth the same pass. Reviewed: 28483c59a.

---

# Round 3: 9590c86fa (diff 28483c59a..9590c86fa only)

**Commit reviewed: 9590c86fa.** The code is at e7a027164; 9590c86fa adds only 6 images under `walk/`. **Method:** code read, the walk's images, and GitHub run 41976726207 at this commit with its logs. No server, no other copy's database. **Verdict: Block** (changes needed). One new Major, M3.

## Blockers
None.

## Majors
**M3 (new): CI is red, and a case cannot be opened on the Study permit.** Run 41976726207, shard 6: `tests/check_b52_own_yes_no.ts` fails at `:152`, inside `caseFor` (`:138`), with `TypeError: Cannot read properties of undefined (reading 'find')`. The line before it passed for `wp.lmia_inside`, so the case that fails is `sp.outside`. `POST /runtime/cases` gave no case, so `GET /runtime/cases/undefined` had no `people`.
- **It comes from this PR, not from main or chance.** The suite passes 52/52 on this branch at b17da354b (run 41969838547), on the merge queue at 0dc8feac0 and ee9213109 (41975378111, 41975164242), and on three other PRs in the same hours (41976562578, 41976135410, 41973499207). At 28483c59a the same shard was cancelled, so this is the first result since the M1 fix. Attempt 1 only; no rerun.
- **Likely cause, by reading:** `createCase` refuses a release that fails `startableMissing` (`api/src/runtime.ts:92`). `personQuestions` (`engine/programs.ts`) counts only placements in chosen sections, and none gives "No questions yet for <role>". The M1 fix moved the Student's facts into named sections that are not chosen. The log does not print the refusal's words, so this is not measured.
- **Why nothing else saw it:** this is the only suite that opens a case on the Study permit (`grep` of `tests/` and `acceptance/`). `check_qa144_sp_release.ts` passes 24/24 at this commit because it proves the release, not that a case opens. The walk covers With an LMIA only.
- **Fix:** make the Study permit startable and rerun all shards. Keep a line that a case opens on it.
- **Seen while I wrote this, not reviewed:** uncommitted edits appeared in this copy (`engine/programs.ts`, `tests/check_screen01_rules.ts`) changing `personQuestions` so a form-read fact counts. They agree with this cause. They change the startable check for every combination, so they need their own look once pushed.

## The round 2 list
| Item | Result | Evidence |
|---|---|---|
| M2 guard red and weak | **Fixed** | `check_qa144_vv_release.ts` 34/34 at this commit (shard 1). The titles became four named facts in named sections |
| m4 line 3 claims more | **Fixed** | Its regex now needs `page N) (Sample…)`, and NULL fails. The form's name comes from the one reason template in `section-names.ts`; the regex does not read it |
| m7 miscount | **Fixed** | `demo.ts` counts from `landed.joined`, so every held row counts the same. By reading: no test takes a printed-heading twin |
| m8 not told | **Fixed** | `proposals.tsx:162`, walk image 6, `check_forms_qa206_name_browser.cjs` 14/14 on GitHub too (shard 3), `joined === true` in `check_forms_qa206_section_headings.ts` 47/47. See m10, m11 |
| m9 stale comments | **Fixed** | Both reworded. `proposals.ts:321` still says "always", but that function returns false for anything but a field, so it is true there |

## `joined`, the message, the loader
No defect in the field or the loader. `joined` is set only where `namedTwin` lands the row, it is sent only when true, and it stays inside each row's loop, so plain accepts and new sections are unchanged. No other reader of `landedAs` is affected. The loader's count now comes from the same `decide` result, not a second lookup.

New minors, both on the message:
- **m10. "so its form fields are asked there" promises more than the rule gives.** A fact sits in the section of the first form that reads it, and the placement step places only unplaced facts. So facts already placed do not move, and 7 named sections hold none. Fix: "so this part joins it; nothing new was added."
- **m11. The Notice beside it stays generic.** Walk image 6 shows "New library items wait for a second person on To review" after a join that added nothing and queued nothing (`proposals.tsx:144`). The toast goes away; this line stays for the Undo window. Fix: leave the line out when `joined`.

Pre-existing, on the same screen: a new section's toast shows a raw key, "It landed as applicant_and_application_details".

## Do the pinned facts tell fixed from old?
**Yes, by reading; I did not run the old code against them.** Under the old rule an `edited` row is not read (`form-part-placements.ts:50-52`), and a named part's placeholder label misses `byTitle`. So a fact can never land in a section that only a naming edit brought in.
| Pinned fact | Its box | Section | Old rule |
|---|---|---|---|
| `person.original_entry_date` | IMM 5710 `ComingIntoCda` | Coming into Canada | Round 1 measured 0 questions there. Walk image 3 shows it now |
| `case.subject_is_principal_applicant` | IMM 5257 SCH1 `PrincipalApplicant` | Indicate whether you are | Round 1 measured it under "Previous travel" |
| `relationship.other_documentary_evidence` | IMM 5409 `Section4` | Other documentary evidence | The name comes only from the names file, so it cannot be reached |
| `case.representative_form_action` | IMM 5476 `appoint`, `cancel` | Appointing or cancelling a representative | Same |

`string_agg` also fails on a fact placed twice or not at all, and CI proves the fixed side. One limit: all four are newly named sections, so a fact landing in a section the part joined is not pinned. Line 2 proves the row lands there, and placement reads that same key.

## The builder's two findings
- **(a) "New: waiting for a second person" on APPROVED: follow-up, not a Major for this PR.** Confirmed: `OPEN` includes APPROVED (`library-items.ts:20`), and `ItemStatusNote` tests only `action === "ADD"` (`library-item-actions.tsx:112`), so it says waiting whatever the status. A RETURNED ADD gets the same words. This dates from C11.9 (1 Nov), and B78 touches neither file. On its own it is a real state error on a main list and should have its own row; I found none in `BACKLOG.md` or `STATE.md`.
- **(b) A Worker sees "Details of intended study in Canada · 1": follow-up, not a Major for this PR, but the stated cause is half right.** IMM 5710 is why a Worker is asked. The section comes from IMM 1294: `case.caq_number` is in `Page3.Contacts_Row1`, one of B78's 29 parts. IMM 5710's own box is in `DetailsOfWork`. So B78 now gives the reason, an exact box, but by reading not a new result: on main the part is unnamed and the nearest-box rule ties on `form1[0].Page3[0].`, which is the tie round 1 measured sending `person.alt_phone_number` to this section. Not measured on main. It needs a tech lead ruling, because one placement per fact in a shared section puts a study heading in front of a Worker.

## Merge and other CI
- **Merge:** clean with origin/main at d236e3e28, 26 commits ahead (`git merge-tree`, no conflict). Main's studio changes since the merge base are C11.6 and one acceptance test, in no file B78 touches. PR #1062 has no label.
- **Passing at this commit:** types, shards 1 to 5; `check_qa144_lmia_release.ts` 23/23, `check_qa144_sp_release.ts` 24/24, `check_c10_1_configured.ts` 38/38, `check_c10_1_browser.cjs` 12/12, `check_b78_section_names.ts` 9/9.
- **Nightly at this commit (41976732979, 41976735799):** C4.8, C9.1, C4.1, C4.7, C3.4 pass. C10.1 is 21/24 on the same three lines as before; its non-done list is `2 out, 9 waiting, 10 partial, 12 partial`, so row 7 is done.
- **C4.8's 7/12 at 28483c59a is not B78's:** main fails on the same lines (41975737148), and it passes in another run of the same commit.

## Journey
**6.5/10 at this commit, re-judged from the images and CI, not walked by me;** below the bar of 8. The total matches round 1, for different reasons: the placement faults are gone, and task completed stays ½ because of M3. It reads 7 once M3 is fixed. Still unproved: keyboard, 200 % zoom, speed, a client's own questionnaire screen, and anything on the Study permit in a browser. Report: `journey-test-reviewer-2026-11-05.md`, Round 3.

## Could not check
- The words of the refusal behind M3, and whether a rerun repeats it: no server, and I did not rerun CI.
- D1 to D20 were not re-scored and the graph tool was not run (it writes `qa/GRAPH.md`). No new page or route in this diff.

**Verdict: Block** (changes needed). Fix M3 and rerun all shards. m10 and m11 are worth the same pass; (a) and (b) go to the tech lead as follow-ups. Reviewed: 9590c86fa. Any later push needs a new look.

---

# Round 4: af40bed8a (diff 9590c86fa..af40bed8a only)

**Commit reviewed: af40bed8a.** **Method:** code read, the walk's images, GitHub runs 41987692692 (CI) and 41987757985 (nightly) with their logs. No server, no other copy's database. An earlier look at fc92a021b was stopped at the builder's request and gave no verdict. **Verdict: Block** (changes needed). M3 is still open.

## Blockers
None.

## Majors
**M3: not fixed. A case still cannot be opened on the Study permit on GitHub.** Run 41987692692, shard 6: `tests/check_b52_own_yes_no.ts` fails at `:152` inside `caseFor` (`:138`), with the same `TypeError` as round 3. The line before it passed for `wp.lmia_inside`, so the failing case is again `sp.outside`. The new lines in `check_qa144_sp_release.ts` have no result: shard 5 was cancelled when shard 6 failed, and your local run stopped before them.

**Likely cause, by reading; the log cannot separate these two:**
1. **A later run unchooses the section.** Load order is `vv.single`, `sp.outside`, `wp.lmia_inside` (`samples/wave1.json`), and all releases come after all placements (`demo.ts:818`). So With an LMIA's run can place a fact in the Study permit's new section. `keepChosenEveryones` then unchooses it there, and the new step does not run for that combination: `if (id !== combinationId) continue` comes before it. The release then has no chosen section asking the Student anything.
2. **No section qualifies.** `qualifies` needs every question in the section to be read for the Student by a form that surely applies. If none does, nothing is chosen, with no word.

**To tell them apart on your copy:** after a load, read `sqr_section_selection` for `sp.outside` and its `removed the section` audit lines.

**Fix:** give the Study permit a chosen section that survives to its release, and rerun all shards. If cause 1, run the step for every combination that just lost a section, or after the last combination's placement.

## Your questions on the placement step
- **Can it wrongly choose?** Not by asking more: `qualifies` holds it to sections everyone answers anyway, for every applying role, and only `combinationId` gets it. `check_qa144_vv_release.ts` 34/34, `check_qa144_lmia_release.ts` 23/23, `check_qa144_place_step.ts` 23/23 and the C4.1 order suites pass. The faults are m12 and m13.
- **A later run unchooses it:** that combination is left with no such section and is not chosen for again (cause 1). A person pressing the step on another combination does the same. Its current release keeps working; its next release turns Not ready. The words name it, "no longer chosen", and a person can add a section by hand.
- **Is the fixed order enough?** For repeatability, yes: `.sort()` on keys gives one answer for a given library, and the choice then stays. It picks by alphabet, not meaning, which does no harm since everyone answers that section anyway. Order does not help with cause 1 or 2.

## Round 3 list and the rest
| Item | Result | Evidence |
|---|---|---|
| `engine/programs.ts`, `check_screen01_rules.ts` as on main | **Yes** | `git diff --stat origin/main af40bed8a` is empty for both. BR-8's pins pass: `check_w1_s1s2_fix.cjs` 30/30, `check_screen01_browser.cjs` 116, `check_s4_startable.ts` 10/10, `check_setup_checklist.ts` 71/71 |
| m10 message | **Fixed** | "so this part joins it; nothing new was added"; `check_forms_qa206_name_browser.cjs` 15/15 on GitHub; image 6 |
| m11 Notice | **Fixed** | "Any new library item waits…" is true after a join, though not what I suggested |
| Keyboard step | **Part** | Type, Tab, Enter inside the panel, on GitHub. The panel is still opened by a click |

## New minors
- **m12. The step does not say it chose a section.** `place-from-form-parts.tsx` never shows `selected`. A press that places nothing but chooses one reads "Nothing was placed" and "Every answer… is already asked", while the draft has changed. It can also choose again a section the author removed. Fix: say which section was chosen and why.
- **m13. A retired section can stop it.** `live` filters on the question's status, and a retire changes the section's (`library-items.ts:178`). If the first key is retired, `selectSection` refuses, the refusal is listed, and no other section is tried. By reading. Fix: leave retired sections out of the choice.
- **m14. The new line claims more than it proves.** Its title in `check_qa144_sp_release.ts` says "and everyone answers it anyway"; the SQL shows only that a chosen section holds a person's question. There is also no fail line: "already has one, nothing extra chosen" and "none qualifies, nothing chosen".

## Walk images
- **7 and 9 are stale:** taken at fc92a021b. Their "Live" and the opened case came from the reverted rule, so they prove nothing at this commit. Retake them once M3 is fixed.
- **1 to 6 and 8 still hold.** `proposals.tsx` is the same at both commits. 8 could differ only in one section's "Used by combinations".
- **"Details of visit to Canada" on image 9: pre-existing, by reading, not measured on main.** It is the Visitor visa's printed section, placed first in the load. The M1 fix only adds sections a fact can land in, so it cannot bring a new fact into this one. Same one-placement effect as round 3 finding (b), and the same follow-up.

## Merge and other CI
- **Merge:** clean with origin/main at fca4451f9 (`git merge-tree`, no conflict).
- **Nightly at this commit (41987757985):** C4.8, C9.1, C4.1, C4.7 pass. C10.1 is 21/24 on the same three lines; non-done `2 out, 9 waiting, 10 partial, 12 partial`, so row 7 is done.

## Could not read
- Shard 5 at this commit: cancelled, no results, including `check_qa144_sp_release.ts`, `check_b78_section_names.ts` and `check_c10_1_browser.cjs`.
- The words of the refusal behind `caseFor`: the log does not print them.
- Row 7's text, so whether it reports a section unchosen on the Study permit.
- `check_screen01_api.ts`: quarantined on PR CI, nightly only.

## Journey
**6.5/10 at this commit, re-judged from images and CI, not walked by me;** below the bar of 8, no criterion at 0. Task completed stays ½ because of M3. It reads 7 once M3 is fixed. Still unproved at this commit: the Study permit in a browser, a client's own questionnaire screen, the whole path by keyboard, and speed. Report: `journey-test-reviewer-2026-11-05.md`, Round 4.

**Verdict: Block** (changes needed). Fix M3 and get all shards to finish, with `check_b52_own_yes_no.ts` and `check_qa144_sp_release.ts` both read as passing. m12, m13 and m14 are worth the same pass. Retake images 7 and 9. Reviewed: af40bed8a. Any later push needs a new look.

---

# Round 4, finished: 77af3c360 (diff 9590c86fa..77af3c360; new since af40bed8a: `form-part-placements.ts`, `check_b52_own_yes_no.ts`)

**Commit reviewed: 77af3c360.** **Method:** code read, GitHub runs 41991481778 (CI) and 41991501370 (nightly) with their logs. No server, no other copy's database. Everything in the af40bed8a section above still applies unless changed here. **Verdict: Block** (changes needed): M3 is open and the branch no longer merges.

## Blockers
None.

## Majors
**M3: not fixed, and its cause is now measured.** Run 41991481778, shard 6, in the words the check now prints: `case sp.outside-yes did not open (409): [{"code":"role_without_questions","text":"No questions yet for Student. …"}]`. This confirms round 3's reading: BR-8 refuses because no chosen section in the release asks the Student anything.

**The unchoose guess does not explain it alone.** The guard now runs for each combination the loop visits, and the case is still refused. What is left, none of it measured:
1. **No section qualifies for the Student (the most likely).** `qualifies` needs every question in the section read for the Student by a form that surely applies. In a shared library, a section holding one fact the Study permit's forms do not read fails. If so, nothing is chosen and no word is given.
2. **The guard and BR-8 disagree on rule-only questions.** `personQuestions` leaves out `rule_only`; `asksEachPerson` does not, and `live` does not read that column. A chosen section whose only person question is rule-only satisfies the guard and fails BR-8.
3. **A section is lost in a way the loop does not visit.** I found none by reading.

**Measure before the next change; this is the third fix on a reading.** On your copy after a load, list `sqr_section_selection` for `sp.outside`. Then, for each section holding a person question, list which questions fail `qualifies`. If cause 1 holds, BR-8 and "everyone answers it anyway" cannot both be met on this data, which is a tech lead's ruling, not another guard.

**M4 (new): the branch has a conflict with main.** `git merge-tree` against origin/main at 53515caef reports `api/src/form-part-placements.ts`. B82 on main changed the same import lines. It also changes this step: `formGapFacts` chooses what to place, and `conditionFactsToAsk` puts new person facts in the section of `person.sex`, `person.gender` or `person.date_of_birth`. A fact placed there can stop that section qualifying. Fix: merge main before measuring; CI on the merged code is the only result that counts.

## The new diff
- **The guard on other combinations:** by reading it does what it says. It can choose a section on a combination nobody pressed the step on. `qualifies` still holds that to what everyone answers anyway, and `selectSection` writes that combination's history line. This makes m12 larger: the person who pressed sees nothing about it. A refusal pushed from that path does not name the combination.
- **`check_b52_own_yes_no.ts`:** right. It stops as before, now with the refusal's words. Nothing weakened.
- **No test proves the guard's new path.** The passing suites never show a section chosen on another combination; m14 covers this path too.
- **Still open:** m12, m13, m14.
- **Walk images:** 7 and 9 stay stale; 1 to 6 and 8 still hold.

## Other CI
- **Passing at this commit:** types, shards 1 to 4; `check_qa144_vv_release.ts` 34/34, `check_qa144_lmia_release.ts` 23/23, `check_qa144_place_step.ts` 23/23, `check_c10_1_configured.ts` 38/38, `check_w1_s1s2_fix.cjs` 30/30, `check_screen01_browser.cjs` 116, `check_forms_qa206_name_browser.cjs` 15/15, `check_forms_qa206_section_headings.ts` 47/47, C4.1 order suites.
- **Nightly (41991501370):** C4.8, C9.1, C4.1, C4.7 pass. C10.1 is 21/24 on the same three lines; non-done `2 out, 9 waiting, 10 partial, 12 partial`, so row 7 is done.

## Could not read
- Shard 5 at this commit: cancelled, no results, including `check_qa144_sp_release.ts`, `check_b78_section_names.ts` and `check_c10_1_browser.cjs`. So the new Study permit lines have never had a GitHub result on this placement fix.
- Which section, if any, the Study permit has chosen: the logs print no selection.
- `check_screen01_api.ts`: quarantined on PR CI, nightly only.
- Any result on the code merged with main.

## Journey
**6.5/10 at 77af3c360, re-judged from images and CI, not walked by me;** below the bar of 8, no criterion at 0. Unchanged from af40bed8a: task completed stays ½ because of M3. Still unproved: the Study permit in a browser, a client's own questionnaire screen, the whole path by keyboard, and speed.

**Verdict: Block** (changes needed). Merge main (M4), measure and fix M3, and get all shards to finish with `check_b52_own_yes_no.ts` and `check_qa144_sp_release.ts` both read as passing. Reviewed: 77af3c360. Any later push needs a new look.

---

# Round 5: 3c2c72115 (diff 77af3c360..3c2c72115; B78's part read against the merge base eba213457)

**Commit reviewed: 3c2c72115.** **Method:** code read, the walk's images, GitHub runs 41996774643 (CI), 41996767037 and 41996762812 (nightly) with their logs. No server, no other copy's database. **Verdict: Block** (changes needed). The product fix holds on GitHub; the block is two tests the rule change breaks, one measured and one by reading. Both look like one-line fixes. This goes to the tech lead under the ruling.

## Blockers
None.

## Majors
- **M3: fixed, on GitHub.** `check_b52_own_yes_no.ts` 52/52 at this commit. `check_b78_sp_case_browser.cjs` 8/8: a case officer opens the Student's case through the screens, and the client's questionnaire loads.
- **M4: fixed.** Main is merged; `git merge-tree` against origin/main at 91a62168e, 2 commits ahead, reports no conflict.
- **M5 (new): CI is red on `check_c1112_modes.ts`.** Run 41996774643, shard 6: `TypeError: Cannot read properties of undefined (reading 'participants')`. `personQuestions` now always calls `previewRender`, which reads `s.combination.participants` (`engine/coverage.ts`), and that suite's snapshots (`:68`, `:70`) have no `combination`. Real snapshots carry it, so this is the test's data meeting the new call, not a product fault. Fix: `s.combination?.participants` in `previewRender`, which changes no test. Shards 1, 2 and 5 were cancelled by this failure.
- **M6 (new, by reading; its shard was cancelled): `check_w1_programs_s2.cjs:86` will fail.** Its setup is the one `check_w1_s1s2_fix.cjs` had: IMM 1295 on Spouse of a student, released, and a line that needs `ssRow?.status === "NOT_READY"`. Under the new rule that row is Live, which is why `check_w1_s1s2_fix.cjs` needed its SQL line. Fix: the same setup line.

## The five conditions
1. **One calculation: met, with a difference to say.** `personQuestions` reads `previewRender(s).r.questions`, with no second list. The calculation is one (`render`), but the inputs are not. BR-8 uses the largest household with no answers, Preview a chosen Sample family, and a case its real people and answers. So Preview and a case can differ by family and answers. On the checkpoint they do not: the browser check requires none only on Preview and none only on the case, and passes on GitHub; your 90 and 90 are from the Mac. The check compares Preview with the case; it does not compare either with BR-8's own read.
2. **A person with no questions is refused: met for a row where nobody has any, not for one role.** The three lines in `check_screen01_rules.ts` are real pass and fail lines; they have no GitHub result at this commit (Mac 70/70). See "any person" below.
3. **Suites keep their assertions: met as worded, and incomplete.** `check_screen01_api.ts` and `check_w1_s1s2_fix.cjs` change only setups, and the one moved line keeps its words; I compared the diff.
   - **Plainly:** the setups reach Not ready by rewriting a release's `snapshot` in SQL, and in `check_screen01_api.ts` also by changing an audit line's time so the catalogue reads it again. A person cannot make that state through a screen. It proves the Not ready words and refusals, not that a real release gets there.
   - **Other suites:** `check_w1_programs_s2.cjs` was missed (M6). `check_screen01_browser.cjs:86` and `:100` and `check_w1_visual_system.cjs` still call this row Not ready, while it is now Live. They pass because they never read the status, so those titles are false (m15).
   - `check_screen01_api.ts` runs on no PR; your 135/135 is the Mac's and I could not read it. The next scheduled nightly is its first GitHub result.
4. **A case opens by screens after main is merged: met.** GitHub 8/8, shard 4, walk images 7 and 9.
5. **Guard dropped, QA-144 review M2 holds: met by reading; no GitHub result at this commit.** `form-part-placements.ts` differs from main only in the `edited` lines, so `keepChosenEveryones` is main's. The new line is a true test: `why` reads "a section this row selects" only when no form asked first (`render.ts`). It covers the Student only. `check_qa144_sp_release.ts` was in a cancelled shard. m12, m13 and m14 closed with the guard, apart from their general lesson.

## Your other questions
- **Import cycle: no break.** `render` uses `pdfMapInUse` (a function declaration) only inside functions, and neither `coverage` nor `programs` calls into the cycle at load. `programs`-first entry reached run time on GitHub (`check_qa180_one_rule.ts` 27/27; `check_c1112_modes.ts` loaded, then hit M5). The web does not import these files.
- **Catalogue cost: no measured harm, one new cost.** `previewRender` caches per snapshot object, and `validate` already renders mapped snapshots, so those cost nothing more. A row with nothing mapped used to skip the render (`anyMapped`, STANDARDS §9) and now does one per rebuild. `check_screen01_browser.cjs` reads cold 1010 ms, first view 135 ms (217 ms at 77af3c360). `check_catalogue_scale.cjs` has no result at this commit, so scale is unproved. m16.
- **Person's questions only behind a condition: a false refusal, in a narrow case.** With no answers, a `SHOW` condition reads hidden. So a role whose every person question is conditional is refused "No questions yet", though a case could ask them. The old rule let a chosen one through. It errs towards refusing, and no row on today's checkpoint is shown doing it. m17.
- **"Any person" against BR-8's words: yes, a gap, and this change widens it.** BR-8 says "every person role has questions"; the code tests one list for all roles (`engine/programs.ts:75`). Before, a chosen person question went to every applicant, so the words mostly held. Now a row with Principal and Spouse, whose forms read only the Principal, is Ready with the Spouse asked nothing. By reading; no row today. `r.questions` has each person's `about`, so it can now be asked per role, though that may turn real rows Not ready and needs measuring. For the tech lead to rule on; I would not hold this PR for it alone. m18.
- **Stale images: replaced.** `walk/7-study-permit-open-a-case` and `walk/9-study-permit-client-questionnaire` are from the new check; the old two are gone. Image 9 still shows "Details of visit to Canada", the same follow-up as (b).

## New minors
- **m15.** False "Not ready" titles and comments, as in condition 3.
- **m16.** A row with nothing placed could skip the render.
- **m17.** A conditional-only role gets "No questions yet".
- **m18.** BR-8 per role, for a ruling.

Follow-ups (a) and (b) stand, for the tech lead. m10 and m11 stay fixed. The keyboard step is still part: the panel opens by a click.

## Other CI
- **Passing at this commit:** types, shard 3 (`check_s4_startable.ts` 10/10), shard 4 (`check_w1_s1s2_fix.cjs` 30/30, `check_setup_card_browser.cjs` 44, `check_qa144_place_step.ts` 23/23), and in shard 6 `check_c10_1_configured.ts` 38/38, `check_screen01_browser.cjs` 116, `check_forms_qa206_name_browser.cjs` 15/15, `check_w1_visual_system.cjs` 24.
- **Nightly:** 41996767037 passes (C4.1, C3.4, C4.7). 41996762812: C4.8, C4.1, C9.1, C4.7 pass; C10.1 is 21/24 on the same three lines, non-done `2 out, 9 waiting, 10 partial, 12 partial`, so row 7 is done.

## Could not read
- Shards 1, 2, 5 (cancelled): the suites with no result include `check_qa144_sp_release.ts`, `check_qa144_vv_release.ts`, `check_qa144_lmia_release.ts`, `check_forms_qa206_section_headings.ts`, `check_b78_section_names.ts`, `check_c10_1_browser.cjs`, `check_w1_programs_s2.cjs`, `check_screen01_rules.ts`, `check_catalogue_scale.cjs`. They may hold more failures from the rule change.
- `check_screen01_api.ts`: quarantined on PR CI.
- `evidence/screen01/api-checks.json` is changed and uncommitted in this copy; not reviewed.

## Journey
**7/10 at 3c2c72115, re-judged from images and CI, not walked by me;** below the bar of 8, no criterion at 0. Task completed rises to 1: a case opens on the Study permit by screens and the client's screen loads. The rest is unchanged. Still unproved: the whole path by keyboard, and speed on these pages. Report: `journey-test-reviewer-2026-11-05.md`, Round 5.

**Verdict: Block** (changes needed). Fix M5 and M6, then let all shards finish and read the suites listed above. Reviewed: 3c2c72115. Any later push needs a new look.

---

# Round 5, finished: 529806b38 (diff 77af3c360..529806b38; new since 3c2c72115: one line in `engine/programs.ts`)

**Commit reviewed: 529806b38** (`git rev-parse HEAD`). **Method:** as Round 5, plus GitHub run 42000262713. Everything in the 3c2c72115 section above applies unless changed here. **Verdict: Block** (changes needed): M6 is now measured.

## Majors
- **M5: fixed, by reading.** `if (!s.placements.length) return []` is right: `render` asks only a placed fact (`pushQ`, `if (!p) return`), so the answer is the same and the render is not needed. `check_c1112_modes.ts`'s two snapshots have empty placements. Its shard was cancelled, so it has no GitHub result at this commit. A snapshot with placements and no `combination` would still throw; real snapshots carry it.
- **M6: open, now measured.** Run 42000262713, shard 2, `check_w1_programs_s2.cjs`: `FAIL setup: … Spouse of a student is released but Not ready — 84 proposals; READY`. Also `FAIL C11.10 (fail case): the counts are per person, not one number for everyone — user-A 1,0,0 · user-B 1,0,0 · user-C 1,0,0`. By reading, the second follows from the first: the Not ready row is what made the counts differ by person. Fix: the same setup line as `check_w1_s1s2_fix.cjs`, keeping the assertions word for word, under the same ruling. Shards 1, 3, 4, 5 and 6 were cancelled.

## The conditions at this commit
Unchanged from the 3c2c72115 section, with this correction to condition 3: `check_w1_programs_s2.cjs` is a third suite that needs its setup changed, so "only two suites" did not hold. The third fail line in `check_screen01_rules.ts` still goes through the render; the "nothing placed" line now stops at the new line, and it still proves the refusal.

## Minors
**m16: fixed** by the new line: a row with nothing placed skips the render. m15, m17, m18 stay open. Follow-ups (a) and (b) stand.

## Merge and CI
- **Merge:** clean with origin/main at 64b67d056 (`git merge-tree`, no conflict).
- **Passing at this commit:** types; `check_qa144_vv_release.ts` 34/34 in shard 2.
- **From 3c2c72115, one engine line earlier, by run conclusion and by log where I noted counts:** see that section. Your pack counts I read only as job conclusions, apart from C10.1 21/24.

## Could not read
- Shards 1, 3, 4, 5, 6 at this commit: cancelled, no results. No nightly on this commit was listed when I looked.
- **Since the rule changed, no finished GitHub result yet for:** `check_qa144_sp_release.ts`, `check_qa144_lmia_release.ts`, `check_forms_qa206_section_headings.ts`, `check_b78_section_names.ts`, `check_c10_1_browser.cjs`, `check_screen01_rules.ts`, `check_catalogue_scale.cjs`. Each red so far has cancelled the others, so more may be waiting.
- `check_screen01_api.ts`: quarantined on PR CI.

## Journey
**7/10 at 529806b38,** unchanged from 3c2c72115, re-judged from images and CI, not walked by me; below the bar of 8, no criterion at 0. Its product evidence comes from 3c2c72115, one line earlier: `check_b78_sp_case_browser.cjs` and `check_b52_own_yes_no.ts` have no result at this commit.

**Verdict: Block** (changes needed). Fix M6, then get every shard to finish and read the suites listed above. Reviewed: 529806b38. Any later push needs a new look.
