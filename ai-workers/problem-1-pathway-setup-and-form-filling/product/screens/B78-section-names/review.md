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
