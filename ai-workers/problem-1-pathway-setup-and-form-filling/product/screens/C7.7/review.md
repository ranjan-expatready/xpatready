# Review: C7.7 part 1, last two fixes (PR #357, branch claude/runtime-deliverables)

**Round 2: commit 7a07e52b. Verdict: Approve.** Round 1 was commit 26964195, verdict Changes needed (summary below; full text in git history).

I did not build this. In round 2 I reviewed `git show 7a07e52b` on my own isolated copy on :4438 (`xr_studio_review_c77`, fresh start, now stopped). The builder's :4440 and the demo :4400 were not touched. Live AI stayed off (US$0). Journey test: `journey-test-reviewer-2026-11-01.md`, round 2 **8/10, Pass**.

## Round 2 re-run (fresh copy, 7a07e52b)
* `check_vv_prepare_api.ts 4438`: **30/30**. C7.7 18/18, plus the new lines for m1, M1, and B1+M2 (both lines).
* `check_case_engine.ts`: 57/57.
* `check_p5_engine.ts`: 33/33.
* `check_c611_team.ts`: not re-run here; the builder reports 59/59. The m5 change in `state()` is exercised by the 30/30 above.

## Round 1 findings, re-checked
**B1 · closed.** `inStoredOrder` (`engine/runtime/team.ts`) sorts keys the way jsonb does: shorter keys first, then bytewise.
* A new IMM 5476 copy on a fully confirmed case is `out_of_date: false, changed: []`.
* Lock as filed is now refused only by the "filling is not proven yet" gate, which existed before; there is no "out of date" loop.
* The new API line fails without the fix (I saw that failure myself in round 1).
* `changedFacts` and `inputHash` still depend on key order. That is safe today because every other value is read back from jsonb. A future non-stored source must also use `inStoredOrder` (see n4).

**M1 · closed.** Firm-record values now show "From the firm record", with tooltip "Filled from the representative of record's firm record (Sample)…". The line reads "firm record · Representative · time", and "Change it in the firm record" replaces Edit.
* The three Confirm section buttons on the representative tab are disabled. The firm ids are never sent as seen.
* The client's questionnaire has no representative block, in both the API (`sqr` subjects) and the browser (screenshot `r2-client-1024.png`).
* axe found 0 violations. There is no sideways scroll at 1024 or 400 px.

**M2 · closed.** The PDF read back holds the firm-record values in Section B:
* phone `1` / `4165550100`, e-mail
* address 200 / 100 / Example Street / Toronto / ON / M5V 1A1
* `by_hand` now lists only the form action and the kind of representative. Those are not in this commit's scope; the licence fields are listed under "Not built".
* The country is written as `canada` (n1).

**m1 · closed.** An API pass/fail line checks that the question is asked before a child is added and not asked once one is.

**m5 · closed.** `state()` uses `c.firmKey` and maps the team rows to `Member` without the cast.

**m2, m3, m4, m6 · open, Minor.** They go to the PR's Questions for the Lead, as agreed:
* m2: `derive_inverse` reads its codes by position.
* m3: overriding a client's No is silent.
* m4: the spouse's Yes for step-children; the immigration expert should confirm.
* m6: older IMM 5476 copies now show as out of date.

## New in round 2 (all Minor, none blocking)
* **n1 · Minor. The country is written in lower case on IRCC's form.**
  * The PDF shows `question7.country = "canada"`.
  * `samples/firms.json` gives `"country": "canada"`, but `person.mailing_address_country` has no answer list. The filler therefore cannot map a key to a label, and `country_name_text` passes the value through (`ISO3` knows only codes).
  * A person picking from the country list would enter "Canada".
  * Fix: use "Canada" in `firms.json` (both firms), and make the B1/M2 line assert the written value, not only `result = written`.
* **n2 · Minor. The representative's fax can still be "added", and it fails.**
  * The fax is the only representative line without a firm value. It still has an "Add" button, and Save fails with "That person is not on this case." (404, screenshot `r2-fax-add-1024.png`).
  * The tab's intro still says "Click Edit on any answer to change it…".
  * This existed before the commit.
  * Fix: for subject `representative`, show "Not in the firm record" with no Add, and drop or adapt the intro on that tab.
* **n3 · Minor. Wrong tooltip on the disabled Confirm buttons.** The disabled Confirm section buttons on the representative tab keep the title "Nothing answered yet in this section", although every line is answered. Fix: say that these come from the firm record and are not confirmed on the case.
* **n4 · Minor, note for the Lead.** `country_name_text (max 30 chars)` (IMM 5257) is now executable too, through the new regex. That is a behaviour change beyond IMM 5476: those boxes are now written instead of going by hand. It is covered only by the "(max 255 characters)" and "(max 3 characters)" unit lines. Key-order dependence in `changedFacts` stays a trap for any future non-stored value (see B1).

## Consumers of `state().answers` (re-checked)
* Case view, readiness, prepare stage 1 and the filler read the firm values; the copy holds them.
* `case-filings`, `case-checklist` and `case-prepare` filter by participant.
* Answer and confirm routes: the UI no longer offers Edit or Confirm on firm values, except n2's Add on the empty fax.
* Audit: nothing is stored, so there is no line.
* Change detection: correct after B1. A change of representative names the e-mail and given names.

## D1–D20 (1–5, round 2)
| Dimension | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | n1 |
| D2 Data integrity | 4 | B1 fixed; key-order trap noted |
| D3 Reuse | 4 | |
| D4 Rule integrity | 4 | |
| D5 Stability and recovery | 4 | no lock loop |
| D6 Freshness and governance | 4 | |
| D7 AI trust | n/a | |
| D8 Orientation | 3 | the lower-case "representative" tab opens first (existed before) |
| D9 Flow of information | 4 | n2 |
| D10 Language and guidance | 3 | n1, n2 intro, n3 |
| D11 Feedback and state | 4 | |
| D12 Visual quality | 4 | |
| D13 Accessibility and responsive | 4 | axe 0, 400/1024 px fine, keyboard reaches the panel, no dead controls except n2 |
| D14 Looks like the team's product | 4 | |
| D15 Speed | 5 | |
| D16 Testability | 4 | pass/fail lines for B1, M1, M2 and m1 |
| D17 First-use intuitiveness | simulated only | |
| D18 Information provenance | 4 | "From the firm record" |
| D19 End-to-end capability closure | 4 | |
| D20 User pain solved | simulated only | |

## Round 1 (commit 26964195), in short
Verdict: Changes needed.
* B1: IMM 5476 copies were out of date from birth and could not be locked.
* M1: firm values looked like editable answers "Confirmed by the officer"; Edit and Confirm failed with 400s; the client saw them.
* M2: the phone and country were still by hand, although the record said they were filled.
* Minors m1–m6.

## Not checked
* A real screen reader, and 200 % zoom.
* `check_c611_team.ts` on my copy.
* IMM 5707's instructions on step-children (m4).
* Coverage.
* The demo database.

**Verdict: Approve** for commit 7a07e52b.
* No Blocker or Major is open.
* Minors: n1, n2, n3, n4 (new), and m2, m3, m4, m6 (to the PR's Questions for the Lead).
