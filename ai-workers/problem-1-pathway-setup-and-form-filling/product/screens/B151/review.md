# B151 ("B5b") the unpriced fee state names the people: independent review (reviewer, 7 Nov 2026)

**Reviewed commit:** d32eeaddfb39ae792d82e018e03cfa255e4c541c on local `b151-local`, diff `git diff ef3677ea7..d32eeaddf` (built on
#1274's head). Code: `web/src/runtime/fees.tsx` (`NoFee`, `RecordedNote`, the unpriced branch) and `tests/check_b151_unpriced_browser.ts`.
**Read:** BACKLOG row B151; `screens/B5/concept.md` (BR-4, BR-6, §5 copy); the B5 review; B152's `fees_recorded: { at }` on
`origin/claude/screens-b152-frozen` (`case-filings.ts:53`, `submission.ts:74`: `at` is the recording time); `case-prepare.ts:455-458`.
**Ran:** isolated `rev_b151` on :4445 (`web-fresh.sh ensure`; started with `--ttl 60`; I ran the checks and my walk as separate
calls and stopped the copy myself at the end, not with a single-call `trap`). `check_b151_unpriced_browser.ts`: **19/19**.
`check_c612_fees_browser.ts`: **58/58** (B5 has not regressed). The screenshots it rewrote under `screens/C6.12/screenshots/` were restored
with `git checkout --`. My walk script (scratch) ran in the UTC and America/Toronto time zones. The c612 check reloads the checkpoint,
so I walked my own equivalent real cases: fs.spouse (spouse, sponsor, adult child not travelling), fs.spouse (spouse, sponsor, a child
travelling, a child at home) and wp.lmia_inside (a partner not applying). Graph tool: no gap on `fees.tsx` or `/prepare`'s screen use.
Live AI off, US$0.

**Verdict (skill scale): Ship after fixes.** The code does what the row asks. With `fees_worked_out: false` the block shows the
server's `fees_why` once. It names each declared-only person ("P2 Adult child: Declared only: no fee") and each `not_filing[]` person with
the server's why ("… Partner home: no fee. Not travelling (not applying on this case): no filing and no fee.", on real wp.lmia_inside).
It shows no CAD, no total and no basis. The words are the same at 1440, 1024, 512 and 400 px, with no line overflow and no sideways scroll.
axe found nothing. A recorded Visitor visa group reads "Fees as worked out today, not the amount recorded", and with B152's field it
reads "Fees as recorded on November 5, 2026". The priced branch is unchanged, and declared-only people stay in their filing's table rows.
One gap blocks: half of the rule has no test that can fail.

## Issues (ranked)
1. **Must (Major), STANDARDS §7 [M] "A rule's test fails when the rule is removed": the `not_filing[]` half of the unpriced
   state is tested vacuously.** On fs.spouse, `/prepare` sends `not_filing: []` (my two fs.spouse cases, and the B151 check's case
   with the same people). So the check's assertion `nf.length === v.not_filing.length && v.not_filing.every(…)`
   (`check_b151_unpriced_browser.ts:73`) is `0 === 0 && true`. It passes even if `notFiling` is dropped from the unpriced branch
   (`fees.tsx:78`). The Visitor visa case has nobody without a filing either. The row names `not_filing[]` first. The state can be
   reached on real data from the checkpoint: wp.lmia_inside with a `spouse_or_partner` `applies: false` gives one `not_filing` entry
   and `fees_worked_out: false`, and the page shows it correctly (my walk, screenshot `walk-wp-lmia-partner-home-1024.png`).
   **Fix:** add that real case, or the fs.spouse view served with one `not_filing` entry as the check already does for `fees_recorded`.
   Assert `v.not_filing.length > 0` before the naming check, so the check can fail.
2. **Should (Minor): the unpriced list does not de-duplicate a person declared only on two filings.** `fees.tsx:78` flattens every
   filing's declared-only applicants, so such a person shows twice with no filing to tell the lines apart. Both lines get the same
   React key `declared-${subject}` (`fees.tsx:56`). I saw it only on a served view (`break-long-dup-1024.png`). No real case
   produced it. **Fix:** de-duplicate by `subject`.
3. **Should (Minor): the recorded day is shown in the browser's time zone** (`fees.tsx:64`, no `timeZone`). This matches
   `cases.tsx:108` ("Opened"). The record's own "Submitted on" uses UTC (`submission.tsx:27`), so near midnight the two days can differ. It
   cannot be reached until B152 lands. Name the choice in the PR, or pin `America/Toronto` as `employer.tsx:22` does.
**Outside B151, for qa (not counted):** the readiness line names the sponsor "A person (Not started)" (submission panel). In the
unpriced state, a child applying on the principal's filing is named nowhere in "Submission to IRCC". The heading says "for 2 people
applying" but names one person. BR-6 covers only no-fee people.

## D1–D20 (1–5; reviewer evidence)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Both parts of the row are built (unpriced names; recorded note, both wordings). BR-4 and BR-6 are held |
| D2 Data integrity | 5 | Read-only, no write, no new route; the same `/prepare` read |
| D3 Reuse | 5 | One `NoFee` for both states; the priced branch's not-filing list now goes through it (58/58) |
| D4 Rule integrity | 4 | In 3 real cases, each no-fee person equals `/prepare`. Duplicate declared case (issue 2) |
| D5 Stability and recovery | 4 | Reload gives the same words; B5's failed-read state unchanged (58/58) |
| D6 Freshness and governance | 4 | A recorded group says whether its fees are today's or as recorded |
| D7 AI trust | n/a | No AI |
| D8 Orientation | 4 | Under "Fees" of the first submission; heading outline H2 › H3 › H4 |
| D9 Flow | 4 | Read-only; nothing to act on, and the block says why there is no amount |
| D10 Language and guidance | 4 | The server's words; §5 copy "Declared only: no fee"; no codes in this state |
| D11 Feedback and state | 4 | Unpriced, recorded-today and recorded-as-recorded each have their own words |
| D12 Visual quality | 4 | The B5 type scale; bold name, muted reason; wraps cleanly at 400 px |
| D13 Accessibility and responsive | 5 | axe 0 at 1440 (5 states with the builder's); 1024/512/400 px no overflow; nothing focusable in a read-only block |
| D14 Looks like the team's product | 4 | Same tokens and list style as B5's not-filing list |
| D15 Speed | 4 | Click to Fees 1.0–1.1 s on fs.spouse (whole case page), 0.3 s on wp.lmia; no request per row |
| D16 Testability | 3 | Pass and fail for declared-only, the recorded note (both wordings) and no CAD; `not_filing` vacuous (issue 1) |
| D17 First-use intuitiveness | simulated only | No intended user walked it |
| D18 Information provenance | 4 | Each no-fee line carries the server's why; recorded fees say where they come from |
| D19 End-to-end closure | 4 | J7's fee part on a sponsorship; recording an fs.spouse case cannot be reached on the checkpoint |
| D20 User pain and "wow" | simulated only | No intended user walked it |

## BIC scorecard (EXPERIENCE §6; evidence: `B151-unpriced-fs-spouse-1440/1024.png`, `B151-recorded-worked-out-today-1440/1024.png`, my walk)
| Check | Score | Evidence |
|---|---|---|
| BIC-01 to 07, 09, 10, 12, 13, 15, 17 | N/A | Read-only fee block: no question, document value, AI, principal change, task list, check view, error, channel or review |
| BIC-08 Case structure at a glance | Partly | No-fee people named in the block; an applying child is not named in the unpriced panel (outside, see above) |
| BIC-11 One primary action | Met | The block has no button; the panel keeps "Record the submission…" |
| BIC-14 Help in place | Met | Nothing in the block needs a tooltip; every reason is visible text |
| BIC-16 Recorded events | Met | A recorded group says its fees are today's or as recorded on its day (1024 screenshot) |
| BIC-18 States drawn | Met | Unpriced, priced, recorded-today and recorded-frozen each drawn; nothing shows "CAD 0" |
| BIC-19 Low cognitive load | Met | One heading, 13 px text, no colour for state, no ids |
| BIC-20 Accessible and keyboard | Met | axe 0; 512 px (200 % of 1024) and 400 px clean; headings in order |

**Journey score (my one score for this check): 9 / 10, pass.** See `journey-test-reviewer-2026-11-07.md`.
**Could not check:** a real screen reader; the "as recorded" wording on real data (B152 not merged: checked on the real view with
the field added); an fs.spouse group recorded (none is Ready to file on the checkpoint); an intended user's walk (D17, D20).

**Verdict: Block** (commit d32eeaddfb39ae792d82e018e03cfa255e4c541c). To fix: (1) make the unpriced `not_filing[]` check able to fail
(a real wp.lmia_inside case with a partner not applying, or a served view, plus `not_filing.length > 0`). Issues 2 and 3 are Minor and
left to the builder's judgement.
