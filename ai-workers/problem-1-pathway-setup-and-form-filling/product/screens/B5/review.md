# B5 Fees on the case page (C6.12 step -25): independent review (reviewer, 7 Nov 2026)

**Reviewed commit:** 163bd3338 on `claude/hopeful-faraday-hqhzg9` (PR #1233). Code: `web/src/runtime/fees.tsx` (new),
`web/src/runtime/submission.tsx` (+3 mount lines), `tests/check_c612_fees_browser.ts` (new). The PR head moved to 54d19e1ea while
I worked; that commit adds only `screens/B5/break-report.md`, so the code that ran is this commit's.
**Read:** the B5 `concept.md`, `challenge.md`, `build-notes.md`; sprint plan "Row C5" and R11; P-247, P-171, P-319; the tech lead's answer
on #1233 (09:55 UTC); `api/src/case-prepare.ts:174-187, 385-400`; `engine/runtime/filings.ts`; `samples/fee-table.json`.
**Ran:** an isolated copy on :4445 with the configured checkpoint loaded. `C6.12.test.ts`: 24/24. `C6.12-breadth.test.ts`: -24 and -25
PASS, -22 and -23 FAIL (held). `check_c612_fees_browser.ts`: 50/50. My own journeys ran twice (`journey-test-reviewer-2026-11-07.md`).
The graph tool shows no gap for C6.12, `fees.tsx` or `/prepare`. Live AI off, US$0. The copy was stopped at the end.

**Verdict (skill scale): Ship after fixes.** The money is right everywhere I looked. In 10 states (1, 2, 3, 4 and 6 people; an
exempt child and a person over 79; a capped line; a child with no date of birth; split into 2 and into 6 submissions; long
names; fees not worked out on a real sponsorship case) every row, every totals line, each submission's total and the case total
equal `/prepare`. The shown rows add up to each total. Nothing is priced on the page: there is no fee amount, form number or age
in the code (P-319), and every amount comes from the fee table through the API, with its canada.ca cite or Sample label.
Two things are open: one standard line not met on the new block, and gate B, which cannot be green on this commit.

## Issues (ranked)
1. **Must (Major), EXPERIENCE §2.12 [M] and WCAG 2.2 1.4.4 (F69): "Not counted yet" covers its reason at 1024 px and 200 % zoom.**
   At 512 css px the waiting row's amount text runs to x=283 while the Why cell starts at x=256. The cell is `whitespace-nowrap`
   inside a 16 % column (`fees.tsx:84`, `:66`). It is fine at 720 css px and wider. This is the one state that tells the officer a
   fee is not counted yet, so the words must stay legible. **Fix:** let that cell wrap (drop `whitespace-nowrap` for the waiting
   span, or give the amount column a minimum width that fits it). Add a check at 512 px on the waiting state (amount text right
   ≤ Why cell left) beside the existing 1024 px check.
2. **Must (Major), R11 as ruled for Q3: gate B cannot be green on this commit.** On 163bd3338 the breadth pack prints FAIL for -22
   and -23, so gate B over the whole pack is red and the PR cannot merge. The tech lead ruled after this commit (09:55 UTC): add the
   HELD lines "here as its own commit". -22 is held only while the fee table has no `fs.spouse` entry, and -23 only while no release
   asks the question. Use C11.3's self-releasing guard (P-284) and cite P-380 Q1 and rows S1 and S2. A HELD line is never green.
   **Fix:** that commit, and "fixture only" said plainly in the PR body. A pack change needs its own review on the new head.
3. **Should, EXPERIENCE §5 [M]: decision codes on the main path.** The basis sentence shows "(P-171)" and "(FQ-7)"
   (`filings.ts:166, 263`, rendered at `fees.tsx:122`). These are the server's words, and the approved concept left them for
   B133. Not this PR's to change; recorded so B133 includes it.
4. **Should, STANDARDS §7 [M] (no duplicated logic): `cadWords` and `basisOf` copy the engine.** `fees.tsx:23` copies `cad()`,
   and `fees.tsx:29-35` reads the basis from the engine's English. The tech lead accepted both as the stopgap until B133, and they
   are tested both ways (BR-2 pass and fail; every amount compared with `cad()`).
5. **Should (Minor): the words.** There is no thousands separator ("Total for the case: CAD 1025"; concept m7, kept on purpose).
   The basis repeats the why ("… CAD 500 from 5 people applying together · … starts at 5 people applying together"). Split
   submissions are all named "One submission", so the hidden table captions repeat. A single applicant's totals line still names
   the family maximum. All are B133 or Minor; none is a wrong amount.
6. **Should (Minor): BR-4 is tested only on a stub, although the checkpoint reaches it.** I opened a real spouse or partner
   sponsorship case. "Fees" shows `fees_why` once, with no amount and no total, which is right. The browser check still serves
   a stub (`check_c612_fees_browser.ts:172`), against the challenge's m4 and the concept's §6 wording. **Fix:** test on the real
   `fs.spouse` case.

## D1–D20 (1–5; evidence from the browser and scripts, independent reviewer)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | BR-1 to BR-8 present and as written. P-247: the basis once per fee, the case total after a split. -22 and -23 named as held |
| D2 Data integrity | 5 | Read-only, no write path, no new route. The block reads the panel's own `/prepare` (one query key) |
| D3 Reuse | 4 | One shared read. `cad` and the basis are copied in the web (issue 4, B133) |
| D4 Rule integrity | 5 | The rows add up to every total in 10 states. Cap, exemption, waiting and split all as the engine says |
| D5 Stability and recovery | 4 | A failed read shows "could not be loaded" with no stale amounts, and a reload recovers. A second tab's change appears only on the next read |
| D6 Freshness and governance | 4 | Each source once with its read date. The exemption page shows its page date, never as a read date. The Sample sentence is shown |
| D7 AI trust | n/a | No AI on this screen |
| D8 Orientation | 4 | Inside "Submission to IRCC" under each submission, each filing named. Split submissions share one name |
| D9 Flow | 4 | Read-only; "Record the submission" is disabled with its reason. A waiting row does not link to its question (Not built) |
| D10 Language and guidance | 3 | Plain fee words, but decision codes and repeated maximum words (issues 3 and 5) |
| D11 Feedback and state | 4 | "Not counted yet", "Total so far · n fees not counted yet", and a live re-price after the questionnaire saves the date of birth |
| D12 Visual quality | 4 | Aligned three-column table, muted reasons, a bold total, team tokens |
| D13 Accessibility and responsive | 3 | axe clean in 5 states, keyboard path, visible focus, 1024 and 1440 px fine. Issue 1 at 200 % |
| D14 Looks like the team's product | 4 | The panel's own type scale, borders and link style |
| D15 Speed | 4 | `/prepare` takes 0.36 to 0.39 s. No request per row |
| D16 Testability | 4 | 50/50 re-run by me. Each BR has a pass and a fail. Step -25 fails when the block is removed (checked). BR-4 is stub-only (issue 6) |
| D17 First-use intuitiveness | simulated only | No intended user walked it |
| D18 Information provenance | 4 | Every amount has its reason, the IRCC link and the quote on exempt rows. Basis and Sample are stated |
| D19 End-to-end closure | 4 | The fee part of J7 closes. The receipt box (C8.2) cannot be reached on the checkpoint (no filing is Ready to file) |
| D20 User pain and "wow" | simulated only | No intended user walked it |

**Journey score (my one score for this check): 8.5 / 10, pass.** Breakdown in `journey-test-reviewer-2026-11-07.md`.

## Checklist (skill)
* **Concept fit:** every element, state and BR of §3 to §5 is present. Copy matches §5. No button (BR-8). The challenge's M1 and
  M2 are built, with tests.
* **Words and look:** fits `PRODUCT.md` §4 (case officer, filing, submission). No demo chrome in the block.
* **Code:** correct joins (`fees[].filing` and `group.filings` both go through `fid`). Row keys are unique per filing. The case
  total sums the API's totals only when there are 2 or more submissions, and is null-safe. "So far" counts the API's `waiting`.
  The server checks the role (client 403, pack C6.12-2 and my J9). No migration. No per-row request.
* **P-33:** no step depends on scaffolding. The split is API-only today (Not built on the case page; listed in the concept).
* **Retrofit mapping:** not recorded (none of the recent build notes records one). The block adds no model; it reads the existing `/prepare`.
* **Could not check:** a real screen reader; an intended user's walk; the C8.2 receipt box; gate B in CI on the six (fixture only).
* **Outside B5, for qa:** below 1024 css px the case page scrolls sideways to 900 px because of other panels' buttons. Removing
  the fee block does not change it.

**Verdict: Block** (commit 163bd3338). To fix: (1) "Not counted yet" must not cover its reason at 1024 px and 200 % zoom, with a
test at 512 px. (2) Add the tech lead's ruled HELD lines for -22 and -23 (own commit, guarded, never green), so gate B can be
green; that pack commit needs its own review on the new head.

## Round 2 (diff only, 1ea633935)
**Reviewed:** `git diff 163bd3338..1ea633935` under `prototype/studio/` on head 1ea633935473830cc73468bf8834d634cd05d0b5 (PR head
checked): `acceptance/C6.12-breadth.test.ts` (6939e5646), `web/src/runtime/fees.tsx` and `tests/check_c612_fees_browser.ts`
(1ea633935). **Ran:** isolated `rev_b5` on :4445, configured checkpoint (reset, load as `user-A`, 90 to 101 s), stopped after.
`C6.12-breadth.test.ts`: -24 and -25 PASS, -22 and -23 HELD, "2/2 passed", exit 0. `C6.12.test.ts`: 24/24, exit 0.
`check_c612_fees_browser.ts`: 56/56; the screenshots it rewrote under `screens/C6.12/screenshots/` were restored with
`git checkout --`. My own browser script (scratch, run twice, 19/19 both times). Live AI off, US$0.

**M1 (200 % zoom): closed.** Case: principal, a child with no date of birth, spouse. At 512 css px "Not counted yet" wraps to
2 lines inside its cell (text ends x=235, Why starts x=256, no cell overflow). Same at 1024, 720 and 400 css px. No "CAD n"
breaks inside a word. axe at 512 px in this state: 0 violations. Removing the fix in the browser (`white-space: nowrap` put
back) makes the same measure show the overlap (text ends x=283 > 256), so the builder's new 512 px check (`check_c612_fees_browser.ts:154-159`)
fails when the fix is removed.
**M2 (gate B): closed.** `held()` (`C6.12-breadth.test.ts:20-24`) is the C11.3 AT-5 guard: PASS when green; HELD only
while `still`; otherwise an ordinary FAIL; never counted green. -22's `still` is `!fsTable` (no `fs.spouse` entry in the fee
table; the release exists, `released: 1`); -23's is `studyQ === 0` (no release asks the question). These are the tech lead's
two conditions on #1233 (09:55 UTC). Each HELD line and the summary cite the founder's answer to Q1 (6 Nov, P-380) and rows S1
and S2. No id or step is dropped (P-330 (7)). Gate B (C6.12 whole plus breadth -25) is green on this head.
**Break m2: fixed.** The waiting line's total reads "Biometrics fee: CAD 170 so far · 1 not counted yet"; the other line has
no "so far"; once the date of birth is answered no line says it (`fees.tsx:103`, counted on the group's own lines).
**Break m4 and round-1 issue 5 (captions): fixed.** After two splits, three tables have three different accessible names, each
listing its filings ("Fees for One submission: Visitor visa: Sample Child A1"). The table is now named by its caption
(`aria-labelledby` dropped, `fees.tsx:66-67`); the aria snapshot confirms it. The visible headings still all read "One submission" (B133).
**Break m5 and round-1 issue 6 (BR-4 on real data): fixed.** The new check uses a real `sp.outside` case. I also opened real
`sp.outside` and `fs.spouse` cases: each shows the server's `fees_why` once and no CAD.
**Money:** the page equals `/prepare` in every state I tried: CAD 470 "so far", whose line totals add up to 47000 cents, and a
case total of CAD 655 over 3 submissions. No page or console error.

**New, Minor (Should, not blocking):**
* a. At 400 css px (below the 512 px bar) the 41 px amount column breaks "count|ed" inside the word (`[overflow-wrap:anywhere]`,
  `fees.tsx:86`). It is still legible and does not overlap. Screenshot (scratch): `r2-waiting-400.png`.
* b. "CAD 170 so far · 1 not counted yet" also shows when the line is already at its family maximum, so it cannot rise. The
  words are true, but they suggest the total may grow (`fees.tsx:103`).
* c. PR body: the tech lead asked for "fixture only" to be said plainly. The body does not say it yet, and its "Checks and
  results" still reads "To come". This is PR text, not code; fix it before the label.

**Scores changed:** D13 3→4 (200 % fixed, axe clean at 512 px). D16 4→5 (BR-4 on real data; the M1 check can fail when its
fix is removed). The rest are unchanged. **Journey score (my one score for this check): 9 / 10, pass.** Accessibility and
screen sizes ½→1. Breakdown in `journey-test-reviewer-2026-11-07.md`, Round 2.
**Could not check:** a real screen reader reading the new captions; gate B in CI on the six (fixture only).

**Verdict: Approve** (commit 1ea633935473830cc73468bf8834d634cd05d0b5). No Blocker or Major is open. The three Minors above
are for the builder's judgement or B133 (c is the PR body).
