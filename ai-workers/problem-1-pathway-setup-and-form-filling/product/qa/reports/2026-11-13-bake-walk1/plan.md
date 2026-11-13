# Walk 1 (BK-6), qa's fresh reader: the plan (prepared, not walked)

**Row:** BK-6, the Bake's walk 1, exit **E1** (P-447 (1)); its findings feed **E3** (0 open Majors on the journey). **Mode:** `/qa milestone`, qa lane (cloud). Prepared 12 Nov 21:5x IST on `origin/main` 92507436d; **the walk runs only on the commit the tech lead names** ("go <main sha>"), once #1632 (BK-16 PR 2), #1643 (QA-439), #1652 (QA-427) and QA-441 have merged.
**Read for it:** `design/bake-plan-2026-11-10.md` §2 and §4; `RULES.md`; `qa/BUGS.md` on main (journey rows) and the A25 sweep's rows on #1637 (QA-421 to QA-444); walk 0 (`qa/walk-0-2026-11-12.md`) and the walk 1 rehearsal (`qa/reports/2026-11-12-walk-1-rehearsal.md`); `web/src/pages/start.tsx` and `sign-in.tsx` for the door and person names.

## 1. E1, word for word
"On `main` at the tag, from a fresh demo database, in a visible browser at 1440 px: sign in once by role; as the content publisher set up and release a pathway (second person by the hand-off button); open the family case; as Client A answer the questions; as the representative review; reach filled forms. Record every typed login after the first, every screen with no way back or onward, every point where the reader needed help. **Pass:** 0 extra logins, 0 dead ends, 0 help, journey complete; findings logged in `qa/BUGS.md`."

## 2. Ground rules for the walk
* **Commit:** exactly the tech lead's `<main sha>`; `git checkout --detach <sha>` in this copy, `git rev-parse HEAD` recorded at the top of the report and in every finding's "found on". No other branch merged in.
* **Fresh demo database:** one isolated copy, `isolated.sh qa_w1 4471 start --ttl 240` (fresh database; its own files); stopped with `isolated.sh qa_w1 4471 stop` at the end. **Never :4400.** No data loaded by API or script: the start page's doors only.
* **Visible browser at 1440 px:** Chromium headed on a virtual display (Xvfb), window 1440 × 1000, driven one step at a time through the screens (the walk-0 driver `drive.mjs`, which prints only what a person sees: headings, buttons, links, alerts, text). A screenshot at every screen and every decision point, `shots/NN-<what>.png`.
* **Live AI off, US$0:** the copy never sets `STUDIO_AI_LIVE`; no button that names a price or a live AI run is pressed (P-175). A "Saved (US$0)" AI path is allowed.
* **Fresh reader:** each step is chosen only from the words and controls on the screen. No URL typed after the first `/sign-in`, no browser Back, no reading code, docs or earlier reports during the walk. If I catch myself acting from what I know rather than what I see, that is a **help** point and is logged as one.
* **Client answers:** typed through the client's own screens. A filler may type Sample values into the visible fields (as walk 0 and the rehearsal did, scaffolding, P-33) but every deciding answer (role, marital status, who travels, "indicate whether you are", the kind of application) is answered by hand from the screen's own words; every part the filler cannot answer is done by hand and noted.
* **Push after every step** of this list (plan, each walk half, findings, verdict) on `claude/friendly-feynman-dyii7z`.

## 3. What counts (my counting rules, stated before the walk)
| Count | Counts when | Does not count |
|---|---|---|
| **Extra login** | After the first sign-in, any change of person made from the sign-in page or the frame's person picker, or any typed URL to reach a person's screen | A hand-off or named button on the screen that carries the work to the next person ("Hand to the Content reviewer →", "Hand to Client A (simulated)", "Open a case on Release N (as Case officer) →", "Open the review" when it changes the person) |
| **Dead end** | A journey screen where the next journey step (or a way back to the case or pathway) is not reachable by a visible control; a step that only works after a reload; an instruction the person cannot follow on that screen (Lead 16's ruling on QA-391) | A way that exists but is far (logged as UX, not dead end) |
| **Help** | The reader needs anything not on the screen: a word it does not explain, a hidden control, a guess between two equal buttons, a wait with no sign of who acts, knowledge from earlier runs | Reading a screen's own help text or tooltip |
| **Journey complete** | Every family member's filing has its forms filled and "read back and checked", the representative approved every filing, and the next capability's first step (Ready to file / Record the submission) is on screen (Gate A, P-348 (3)) | Copies made with by-hand boxes or wrong values: complete, but each is a finding |

## 4. The walk script (Visitor visa, counted)
| # | Person | Step, as a person does it | Screen | Watch for (open rows) |
|---|---|---|---|---|
| 1 | — | Open `http://localhost:4471/sign-in` (the only typed URL) | Sign in | Four cards + "More people" |
| 2 | Configuration author | Choose "Configuration author" (the **one** sign-in) | Start page | Lands on the starting points |
| 3 | author | Door 2 "Pathways released, ready to walk" › **Start here**; confirm | Start page (progress) | ~2 min; plain end message; where it lands |
| 4 | author | Open Visitor visa from the programs list | Program / combination overview | "Where am I" line, way back (BK-3) |
| 5 | author | **Set up one change:** Documents › Add a document: "Marriage certificate copy", Spouse or partner, Base; Save to draft | Documents tab | QA-424 (save says nothing), QA-425 (near-twin types), draft banner QA-423 |
| 6 | author | Review and release › **Submit for review** | Review and release | QA-421 (banner next action), QA-422 (every duty's button shown) |
| 7 | → Content reviewer | **"Hand to the Content reviewer →"** | Review and release (reviewer) | No login typed |
| 8 | Content reviewer | Select what I can sign › **Sign** | same | Warnings explained in plain words |
| 9 | → Approver | **"Hand to the Approver →"** (the second person) | same (approver) | |
| 10 | Approver | **Approve and release** | Release done | "In Release N+1"; QA-408 (release numbers) |
| 11 | → Case officer | **"Open a case on Release N+1 (as Case officer) →"** | Cases › Open a case | The picker names the new release |
| 12 | Case officer | Open the family case: file W1-FAM-1, Client A; Add spouse (travelling), Add child (travelling) | Case page | The new document reaches the spouse's list (the release reached the case); QA-427 client card; QA-433, QA-434, QA-437 |
| 13 | → Client A | **"Hand to Client A (simulated)"** | Client questionnaire | QA-400 (role asked?), QA-403 (internal words), QA-439 (deciding answers first), QA-440, QA-442, QA-443 |
| 14 | Client A | Answer every part; finish ("Every part is answered") | Client questionnaire, overview | QA-441 (second pass), QA-388 (totals jump) |
| 15 | → Case officer | The client's own way back to the firm (button or link it offers) | Case page | QA-411 (wrong person named); count a picker change as an extra login |
| 16 | Case officer | Agent view: answer the firm's facts; Confirm section for every person | Agent view | QA-415 (kind of application), QA-417 (two counts disagree), QA-432 |
| 17 | Case officer | Prepare application › Generate the copies, every form, every person | Prepare application / forms | All "read back and checked"; by-hand boxes; QA-400 SCH1 role per person; QA-415 IMM 5476/IMM 5645 boxes |
| 18 | Case officer | **Send for review** › send every filing | Readiness / Send for review | Who it goes to, named |
| 19 | → Representative | The button the screen offers ("Open the review" / a hand-off) | Representative's review | QA-401 (approve shows without reload) |
| 20 | Representative | Read each filing; Approve every filing | Representative's review | QA-436 (no next step after the last), QA-407 (times) |
| 21 | Representative | Back to the case: Ready to file / Record the submission is on screen | Case page › Ready to file | **End: journey complete** (Gate A); QA-391 (instruction one cannot follow), QA-431 (statuses agree) |

Underneath, after the walk (API, read-only on the copy): the release N+1 snapshot holds the new document line and the case is pinned to it; each filled copy's values read back from the PDF for the facts the open rows name (SCH1 role per person, IMM 5476 type of application, IMM 5645 boxes, the spouse's documents).

## 5. The second family (Study permit, counted for E3, counts reported separately)
On the same copy, from where step 21 leaves me, by screens only: Cases › Open a case on Study permit (Outside Canada): principal, spouse, child (accompanying) → Hand to Client A → answer → back to the firm → Agent view, confirm → Generate copies → Send for review → Representative approves. **Retests:** QA-416 (spouse's fee, filing and forms agree: BK-16 PR 2, #1632), QA-418 (the child's study question is the client's, the fee no longer waits on the officer), QA-415 (a), QA-438 (Start next stage on day 0), QA-444. This half's extra logins, dead ends and help are reported beside the Visitor visa counts; the verdict says which E1 counts.

## 6. The journey screens (each gets a screenshot and a "way back / way on" check)
1. Sign in (four people, More people) · 2. Start page (three doors, reset) · 3. Immigration programs list · 4. A pathway's overview (Visitor visa) · 5. Documents tab and its Add a document dialog · 6. Draft banner · 7. Review and release (author, content reviewer, approver views; hand-off line) · 8. Release done (Release N+1) and its "Open a case" button · 9. Cases list · 10. Open a case dialog · 11. Case page (header, where-am-I line, client card, People and filings, Add spouse / Add child, Documents, Fees, Stages) · 12. Client questionnaire (overview, a part, "Every part is answered") · 13. The client's way back to the firm · 14. Agent view (household line, sections, Confirm section, the firm's facts) · 15. Prepare application / forms (Generate a copy, copy list, read-back) · 16. Readiness / Ready to file · 17. Send for review dialog · 18. Representative's review (each filing, Approve, after the last) · 19. Case page after approval (Ready to file, Record the submission offered) · 20. The client page (BK-3's small client page, links both ways).

## 7. Open journey findings to retest inside the walk
**On `main` today (Major or Critical, journey):** QA-400 (Critical, SCH1 role), QA-415 (Critical, kind of application), QA-401, QA-403, QA-416, QA-417, QA-418, QA-391 (Major by Lead 16's ruling). **From the A25 sweep (#1637):** QA-421, QA-427 (#1652), QA-439 (#1643) Majors; the Minors QA-422 to QA-444 are watched, not each re-walked. **Near the journey, checked underneath only:** QA-397 (a draft account reaching an open case: does the documents change reach the case before release? step 12 checks the case only after release), QA-165 and QA-315 (C7.2 paper copies: Adobe Validate is the Mac's; I record what the screen claims). **Off the walk:** QA-278 (many case opens at once), QA-383 (IMM 5710, not on these two pathways), tooling rows QA-181, QA-201.
Each one is marked in the report as **closed by the walk**, **still open (seen again, evidence)** or **not reached**. Replayable checks that exist are rerun on a fresh copy of the same commit: `tests/qa/check_qa400_principal_flag_per_person.ts`, `check_qa391_not_applying_out_of_date.cjs`, `check_qa397_draft_account_reaches_case.ts`.

## 8. Verdict and records
* **Verdict:** Pass only if 0 extra logins, 0 dead ends, 0 help and the journey complete (E1); separately, the E3 list: every open Major, Critical or Blocker on the journey after the walk, by ID. The severity and the three counts are re-read by a fresh Opus reader that ran nothing (RULES, P-303, P-432) from `walk.md` and the shots before I post them.
* **Files:** `qa/reports/2026-11-13-bake-walk1/` (`walk.md` step log, `shots/`, `scripts/`, read-back values); `qa/reports/2026-11-13-bake-walk1.md` (verdict, counts, findings, questions, under 150 lines); new rows and status changes in `qa/BUGS.md`; replayable checks for new bugs in `prototype/studio/tests/qa/`.
* **Hand back:** one PR comment with the verdict (Pass or Fail, the three counts, the E3 list); the records PR waits for the tech lead's `Reviewer: Approve <head sha>` (P-385). Context guard: at ~300k with the walk unfinished, findings so far are written and pushed and the rest handed over (P-446 (6)).

## 9. Questions for the tech lead (I proceed on my recommendation unless you say otherwise in the "go")
1. **"Set up a pathway" = one named change on a released pathway, through both gates** (door 2's own words, P-484 (1)), not a pathway built from "Nothing set up". *Recommended*, as the door was built for E1. The other reading needs the AI drafting steps (Saved, US$0) and roughly doubles the walk.
2. **"Open the family case" = a new family case on Release N+1** by the release page's button, not the case the door opened on the earlier release. *Recommended*: it is the one that proves the release reaches a case; the door's case is looked at, read-only.
3. **Which family counts for E1:** the Visitor visa walk (§4) counts for E1; the Study permit family (§5) counts for E3 and its numbers are reported beside it. *Recommended*; the alternative (both must be 0/0/0) is stricter and I will apply it if you say so.
4. **A person change by the frame's picker where no button is offered counts as an extra login** (§3). *Recommended*, as E1 is about not going back to the sign-in in mid-journey and the picker is the same act.
