# Review: A24-3 "Client: <name>" and each filing's principal applicant (P-492), PR #1666 at `aef100e45`

Independent reviewer, 12 Nov 2026. **Commit reviewed: `aef100e456fa14186c2477a239af7df8bade1882` only.** There is no concept.md. The concept is the tech lead's brief (done-when 1-5) plus the design `case-structure-a24-2026-11-12.md` §5.1, §5.2 (CS-4, CS-8, CS-10), §6 and §7 row A24-3, read from `origin/lead/2026-11-07-lead31`. I used my own isolated copy on :4448 (`rev_a243`, configured checkpoint), built from this head's web. I stopped it afterwards. Live AI was off; cost US$0.

## What I ran
* `tests/check_a24_3_client_principal_browser.ts 4448`: **20/20**. I did not rebuild main's web to see the fail-before; the builder reports 11/20 there. By reading the check, it must fail on main: `[data-case-client-name]` and `[data-filing-principal]` do not exist there.
* `check_bk3_client_browser.cjs` (the header link was rewritten): **75/75**. `qa/check_qa412_cofiled_sponsor_name.cjs`: QA-413 (no sideways scroll at 400 px) now **passes**. QA-412a/b fail as on main; those are known open bugs and not in this PR.
* `web` `tsc --noEmit`: exit 0. B164 guard: 52/52. count-any: 417, baseline 433. graph.mjs: nothing for this screen.
* Overlap with #1660 (A24-2, `17d4cd0fb`): #1660 changes cases.tsx lines 12, 31, 99-246, 288 and 303 (the h1). This PR changes lines 24 and 305-306 only, and neither PR's questionnaire.tsx changes are touched by the other. `git merge-tree aef100e45 17d4cd0fb` merges cleanly, and so does the merge with `origin/main`.
* CI on `aef100e45`: only `guard` ran (success), because the PR is a draft. The full check has not run yet, so done-when (5) is still open.
* I walked three more configured-checkpoint cases the check does not open: Express Entry family, Spouse sponsorship plus Add sponsor, and LMIA work permit. On Express Entry I did Make principal by keyboard: Tab to the row menu, then Enter. I checked widths 1024, 720 (200 % zoom) and 400, and ran axe (WCAG 2.2 A/AA) on the header line and the table.

## Done-when
| # | Result |
|---|---|
| 1 | Met. The header shows "Client: Sample Client A (signs in as Client A)". `clientOf` (filing-changes.tsx:37) gives the same person as the server's `clientSubjectOf` (runtime.ts:188) and the list's `client_name`. After Make principal on Visitor visa and on Express Entry, the header still names Client A. |
| 2 | Partly met. Visitor visa, Study permit (the spouse's Work permit names the spouse), Express Entry (spouse and children "On Sample Client A's application" → Sample Client A; after Make principal → Sample Spouse A) and LMIA are all right. **The sponsor row is wrong in IRCC's words (M1).** |
| 3 | Partly met. API, database and browser are compared with a fail-before. But no case in the check has a row whose principal applicant differs from the row's person (m1). |
| 4 | Met. The change is web only, with no program or combination key; B164 passes. |
| 5 | Open: the full CI run and this review. |

## Findings (ranked)
**M1. Major (Must): a sponsor is labelled "Principal applicant" of their sponsorship.**
* Where: filing-changes.tsx:86, using `ownerOf` (:32) and `applicantOf` (:50).
* Failure scenario (configured checkpoint, product screens only):
  1. Open a "Spouse or common-law partner" case, then use Add sponsor.
  2. The sponsor's row now reads: `Sample Sponsor S | Sponsor | Sent with the principal's application | Principal applicant: Sample Sponsor S`.
* Why it is wrong:
  * The server's own data says the sponsor is not an applicant: that co-filed filing has `applicants: []` (see also QA-412's header).
  * In IRCC's terms, the sponsor and the principal applicant are different parties.
  * The cell contradicts the Filing cell in the same row.
  * The column's tooltip says "the person it is filed for", which does not fit a sponsor either.
  * A24 exists to end the confusion around "principal" (design §Overall verdict, row "Words"), so this column must not bring it back.
* Fix: for a filing with no applicants (co-filed, `p.co_files`), name the principal applicant of the application it is sent with, or show a muted "Not an applicant (sponsor)". Add this case to the check. If the tech lead reads the brief's "from Filing.subjectId" literally, put that in `challenge.md`; do not leave it silent.

**m1. Minor (Should): the check cannot tell this column apart from the Person column.**
* Where: tests/check_a24_3_client_principal_browser.ts:75, :81, :88.
* In all three scenarios (Visitor visa, Study permit, Visitor visa after Make principal), every filing is `files_own`, so each person is the principal applicant of their own filing.
* Failure scenario: replace the cell's words and `data-filing-principal` with the row's own `p.label` / `p.subject_id`. All 20 checks still pass, yet Express Entry would show the spouse and children as their own principal applicants.
* Fix: add the Express Entry family on the configured checkpoint (spouse and children on the principal's application, before and after Make principal), and add the sponsor case from M1.

**m2. Minor (Should): the link words promise a sign-in.**
* Where: cases.tsx:308.
* "(signs in as **Client A**)" makes the link look like it signs you in as the client. It actually opens the client's page (`/cases/clients/user-P`) and the officer stays the actor, which I verified.
* Fix: give the link words that say where it goes, e.g. "Client A's page", or put "signs in as Client A" outside the link and link "Client page".

**m3. Minor (Should): the new info icon's text is not visible on keyboard focus.**
* Where: filing-changes.tsx:73.
* It uses `title` plus `aria-label`, so screen readers hear the text, but a sighted keyboard user sees nothing on focus. BIC-14 asks for help that opens on hover **and** focus.
* This copies the existing Role icon's pattern, so it is not new debt in kind. Fix it with the app's tooltip component if one exists.

## D1–D20 (1–5)
D1 requirement fit 3: header right; column wrong for sponsors (M1) · D2 data integrity 4: read-only, values match API and DB · D3 reuse 5: same `prepare` query, no new request · D4 rule integrity 3: CS-10 wording broken for co-filed sponsor · D5 stability 5: skeleton while loading, no page errors · D6 governance 4: comments cite P-492, CS-8, CS-10 · D7 AI trust n/a · D8 orientation 4: client named under heading · D9 flow 4: link to client page kept · D10 language 3: M1, m2 · D11 feedback 4: change line and Undo unchanged, header stable after swap · D12 visual 4: one more column, aligned, team look (ee-after-mp 1440) · D13 accessibility 4: axe 0, keyboard reachable, m3 · D14 team look 4: table, muted words, no new chrome · D15 speed 4: case page with table 1.4–1.8 s on copy · D16 testability 3: mutation-blind column check (m1) · D17 first use simulated only · D18 provenance 4: names from server people/owner · D19 closure 4: list → case → client page round trip passes · D20 pain solved simulated only.

## BIC scorecard (EXPERIENCE §6; case page, this change only)
| BIC | Score | Evidence |
|---|---|---|
| 01–07, 10, 12, 13, 15–17 | N/A | No questions, documents, signing or review touched |
| 08 Case structure at a glance | Partly | Every person names their application and its principal (EE before/after swap, 1440); sponsor row wrong (M1). Table per team style guide (design §6) |
| 09 Principal change explicit | Met | Keyboard Make principal on EE: dialog, reason, history line; client stays Client A |
| 11 One primary action | Met | No buttons added |
| 14 Help in place | Partly | New icon tooltip on hover only (m3) |
| 18 States | Met | Skeleton while prepare loads; header falls back to "not named yet" |
| 19 Cognitive load | Met | 1440 and 1024 screenshots: no ids, one heading per panel |
| 20 Accessible | Met | Keyboard reachable; 1024 and 720 px (200 %): 0 px sideways; 400 px table scrolls in its box (113 px), page 0; axe 0 |

## Journey test (reviewer, 12 Nov; case officer; my copy :4448, headless Chromium)
Journeys:
1. Main: open a Study permit family case; read who the client is and whose application each is. Pass.
2. Alternate: Express Entry family; spouse and children are on the client's application. Pass.
3. Make principal by keyboard, then read the header and column. Pass: the client stays Client A, and the column moves to the spouse.
4. Sponsor case via Add sponsor. **Fail (M1).**
5. Wrong turn: the header link reads like a sign-in. Partly (m2).
6. Reload after the swap: same values. Pass.
7. Widths 1024, 200 % and 400. Pass.
8. Across the screen boundary: the client link goes to the client's page and back to the case. Pass (BK-3 suite).

Data underneath: the cells equal `GET …/prepare` owner, which equals `filing.subject_id`; the header equals `client_name`; nothing was written except the swap.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Client and per-application principal readable without opening anything |
| Next step obvious | 1 | Unchanged |
| Plain words | ½ | m2, M1 |
| Feedback and state | 1 | Change line and Undo; header stable |
| Correct data | ½ | Sponsor named principal applicant (M1) |
| Error recovery | 1 | Reload and Undo fine |
| Accessibility and sizes | ½ | axe 0 and widths fine; tooltip not shown on focus (m3) |
| Speed | 1 | Under 2 s on the copy |
| Visual quality | 1 | Column fits at 1440 and 1024 |
| Trust and sources | 1 | Every name comes from the server's people and owner |

**Score 8.5/10**, which is a pass with no 0, but it does not outweigh M1. To raise it: M1 (correct data, plain words), then m2 and m3.

## Not checked
Main's web fail-before (taken from the builder's report and from reading the check); the full CI run; a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); the six alone (per the brief, no case opens there).

**Verdict: Block.** To fix: M1, with its case added to the check (this covers m1). m2 and m3 are for the builder to fix or record. A re-review is needed on the new head.

## Round 2: `1abf9bdbe` (diff `aef100e45..1abf9bdbe` only, P-293 (3))
Reviewed `1abf9bdbe3d76f4622befbb6000799fc17481058`, the same independent reviewer, 13 Nov. I used my own copy on :4448 (`rev_a243`, configured checkpoint, this head's web), then stopped it. `review.md` is unchanged in the fix commit.

**What I ran:**
* `check_a24_3_client_principal_browser.ts 4448`: **41/41**.
* `check_bk3_client_browser.cjs`: **75/75**, after the m2 text change at lines 75 and 104.
* `web` `tsc --noEmit`: exit 0.
* `git merge-tree` against #1660's head `17d4cd0fb` and against `origin/main`: both clean. #1660 changes the BK-3 check at line 118, not at lines 75 or 104.
* Own walk (headless Chromium, officer):
  1. Opened a spouse sponsorship and added the sponsor **and** a child, so a co-filed group carries more than the principal.
  2. Tabbed to the tip by keyboard.
  3. Ran axe (WCAG 2.2 A/AA) on the header and the table.
  4. Checked widths 1024, 720 and 400.
  5. Followed the header link by keyboard.

**The earlier findings:**
* **M1, fixed.** The sponsor's row now reads "Sample Principal S" with "Sample Sponsor R is not an applicant" under it. The child's row reads "On Sample Principal S's application | Sample Principal S".
  * `principalOf` (filing-changes.tsx:55) applies only to a filing with no applicants. It reads `group`, a string id in prepare (case-prepare.ts:308), so the comparison is sound.
  * There is no program or combination key in it.
  * `challenge.md` records the departure from the brief's literal "from Filing.subjectId". It is marked Unconfirmed: no counsel. It is the tech lead's call whether to accept it, and the code reverts in one line.
* **m1, fixed.** The check now covers:
  * Express Entry before and after Make principal: every other row names the principal, never themselves.
  * The sponsorship: the API shows the sponsor as owner with no applicants; the screen shows the principal plus "not an applicant", and never names the sponsor.

  By reading, both mutations now go red: rendering the row's own name, or reverting to the literal owner.
* **m2, fixed.** The header reads "Client: Sample Principal S · Client A's cases".
  * The link's name says where it goes. Pressing Enter on it opens `/cases/clients/user-P`, and the actor stays `user-O`.
  * The middle dot is `aria-hidden`.
* **m3, fixed.** On keyboard focus the Radix tooltip opens, shows the full text and closes with Esc (screenshot taken at 1440). axe found 0 violations.

At 1024, 720 (200 %) and 400 px the page scrolls 0 px sideways. No page errors.

**Remaining (Minor; neither blocks):**
* **r1.** `principalOf` takes the **first** filing with applicants in the group (filing-changes.tsx:56). Today the only co-filed combination, spouse sponsorship, has exactly one such filing: the child joins the principal's. A future group holding two applicant filings plus a co-filed one could name the wrong person. Fix when such a combination exists: prefer the filing whose owner's role is `principal`.
* **r2.** The tip's trigger keeps `aria-label={APPLICANT_TIP}`, and the Radix tooltip adds the same text as its description, so a screen reader may read it twice. Fix: give the trigger a short label such as "About principal applicant".

**Scores changed:**
* D1 4 · D4 4 · D10 4 · D13 4 (r2) · D16 5.
* BIC-08 Met · BIC-14 Met.
* Journey: plain words 1 · correct data 1 · accessibility 1, giving **10/10**, a pass with no 0.

**Not checked:** the full CI run on this head (the guard only, while it is a draft); a real screen reader (r2); D17 and D20 (stay with the founder).

**Verdict: Approve** `1abf9bdbe3d76f4622befbb6000799fc17481058`. There is no open Blocker or Major. r1 and r2 are for the builder to fix or record. The label applies to this commit only.

## Round 3 (CI fix): `ba0f77c0e` (diff `d325ba13a..ba0f77c0e` only)
Reviewed `ba0f77c0e465ba0ce6f5cb56fc711e00c8ba44d6`. The only file changed is `tests/runtime/check_runtime_r1c.cjs` (+6 −1); the web is the same as the approved `1abf9bdbe`. I ran on my own copy on :4448 (`rev_a243`), then stopped it. Screenshots the runs rewrote under R1-thin-slice and QA-165 are restored, and my probe script is deleted.

**Ran:** the R1 group exactly as run-suites does: setup exit 0, r1c **140/140**, r1d **97/97**, r1a `--reset` **99/99** (load about 1.0 on 4 cores). The builder's logs agree: the old step gives 139/140 and fails on this step (`r1g-before-r1c.txt`); `r1g-head2-*` shows 140, 97 and 99.

**(a) Root cause: right, and not a product bug.**
* In a Visitor visa family each person files their own application. CS-10's Principal applicant column therefore repeats that person's name in their own row. This is by design: approved in round 2 and the same as in the Express Entry and sponsorship rows.
* The old step's `section(People and filings).getByText("Sample Child C")` now matches two cells.
* I reproduced it on a Visitor visa family. With …/prepare loaded, the old locator raises `strict mode violation`, and `shows()` turns that into `false`. If …/prepare has not loaded yet, there is one match and the step passes. So the CI red is a race in the check, not a regression.

**(b) The new locator is sound** (probe on the same case). `section` matches 1 element.

| What the probe did | Result |
|---|---|
| `tbody tr td:first-child` + `getByText(name, { exact: true })`, child present | true, one match |
| An absent name | false |
| Child's row removed, and the child's name put in another row's Principal applicant cell | false (mutation) |

So the step still fails when the child is missing, and the column cannot mask a missing child. The step also logs each part now (`tabsShown`, `tabsRight`, `childRow`). The Person cell is the row's first `td`, filing-changes.tsx:87.

**(c) The budget miss is noise.**
* Case page first view (best of 3) on this PR's web across runs: 589 ms (`rel-scr_r1`, the round-1 web) · 971 · 801 · **1026** (the miss, load 1.3) · 665 (mine).
* The spread on the same build is about 360 ms. The budget's own fail-guard still works: 1.1 s answers measure 1430 ms.
* What A24-3 adds to the first view:
  * No request: the header reads the case's `people` the page already has, and the column reads the …/prepare the table already loaded.
  * One more `td` per row.
  * One Radix tooltip in the header, rendered closed.

  None of this is on the path the timer waits for at a cost near 400 ms.
* Not measured: main's web side by side on this machine.

**Findings:** none new. r1 and r2 from round 2 stand (Minor).

**Verdict: Approve** `ba0f77c0e465ba0ce6f5cb56fc711e00c8ba44d6`, for this commit only. CI must still go green on this head.
