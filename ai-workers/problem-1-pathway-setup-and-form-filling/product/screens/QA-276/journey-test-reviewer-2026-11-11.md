# Journey test (reviewer): QA-276, a moved question releases (C5.1, C4.11)

Reviewer agent, did not build it, 11 Nov. PR #1531 at `db2bf9cfe1e972c768d1c6bc39006634a4362a8e`. Isolated copy `rev_qa276` on :4458 only, one copy at a time, stopped after each run; never :4400. Live AI off, US$0. Headless Chromium (Playwright); setup by route plus one labelled SQL insert of a Sample field (as the builder's check does). The walk script and screenshots stay in my scratch folder and are not committed; the builder's screenshots in this folder show the same states at 1440 px.

## Journeys
| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| 1 | Author, then approver · "move this question out of Study permit's section and release it" | Library › Fields › the field › Section "Applicant" › Save placement as draft; Review and release › Submit for review; content reviewer: Select all I can sign › Sign; approver at 1024 px: Tab to Approve and release › Enter | "Released version 2", no 409 | **Held.** "Released version 2" 809 ms after Enter; after a reload: "The draft is identical to the released version" |
| 2 | Same, data underneath | read `section_question`, `config_release`, audit | the move published, the old row superseded, one new release, its author named | **Held.** `1:SUPERSEDED:details_of_intended_study_in_canada \| 2:PUBLISHED:applicant`; release 2 `user-A/user-A/user-B`; audit: updated placement, submitted, signed, released |
| 3 | Error: someone edits during the release | builder's check, trigger on `config_release` | 409 in words, nothing released, the draft stays a draft | **Held** (20/20, ran) |
| 4 | Recovery: move it back | builder's and qa's checks | releases, draft equals release | **Held** (20/20 and 13/13, ran) |
| 5 | Alternate: a question dropped because a rule stopped reading it, while its words have an unrelated draft edit | API walk, see below | the release publishes the rule's removal only | **Failed: the unrelated edit is published (review Major 1)** |
| 6 | Alternate: a move into a section Visitor visa chose | API walk | Study permit releases; Visitor visa's frozen releases do not change | **Held.** 201; Visitor visa still 0 releases; its published view now places the question (as any shared row published by another combination) |
| 7 | Wrong role | not re-walked: only the author holds the author duty and only the approver approves (`api/src/core.ts:39-43`); BR-14 refusals unchanged in code | — | Read only |

## Automated replay (journey 1)
* axe WCAG 2.2 A/AA: **0 violations** on Review and release before the release (1024 px), after it (1024 and 1440 px).
* No sideways scroll at 1440, 1024 and 720 px (720 px stands in for 1440 at 200 % zoom).
* Keyboard only: Approve and release reached by Tab and pressed with Enter.
* 0 console or page errors across the walk.
* Run once headless; journeys 3 and 4 ran in the builder's and qa's checks, twice each in total across my runs (20/20, 13/13).

## Break it
* **Journey 5 (Major 1 in the review).** Sample field `rev276.rule_read` placed in "applicant" (not chosen), read only by a Study permit rule; released. Then its words edited ("EDITED words nobody reviewed?") and the rule retired. The submission shows the reviewer only: Field removed, Question placement removed, Rule removed. Approve and release: 201, and the rows are `1:SUPERSEDED:Original words? | 2:PUBLISHED:EDITED words nobody reviewed?`. On main the edit would stay a draft (read: main publishes only the snapshot's lineages).
* Double press, reload, two tabs: not changed by this PR; reload holds (journey 1).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1: Released version 2, no 409 |
| Next step obvious | ½ | After the move nothing says the question leaves Study permit; the approver sees "removed", not "moved to Applicant for every combination that chooses it" (`3-submitted-1440.jpg`) |
| Plain words | ½ | The placement row shows the raw key `rev276.walk_question` as the item; "removed" for a move |
| Feedback and state | 1 | Toast "Released version 2"; "draft matches the release"; v2 current in Released versions (`5-released-1440.jpg`) |
| Correct data | ½ | Journey 2 exact; journey 5 publishes an edit nobody reviewed |
| Error recovery | 1 | Journeys 3 and 4 |
| Accessibility and screen sizes | 1 | axe 0; no sideways scroll at 1440/1024/720; keyboard release |
| Speed | 1 | Release 809 ms on screen; API release 335–416 ms; published snapshot read 16–17 ms |
| Visual quality | 1 | Team look unchanged (no screen code in the diff) |
| Trust and sources | 1 | Demo release and Sample labels; release names author, submitter, approver |
| **Total** | **8.5 / 10** | Pass (8 or more, no 0) |

Raise first: correct data (fix Major 1), then words (say "moved to …" for a placement whose section changed).

## Not tested
A real screen reader; a headed browser; an intended user's unaided walk (D17, D20 stay with the founder); the full suite set; the demo database.
