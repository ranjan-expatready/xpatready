# Journey test (reviewer): C4.7 PQR picks, Live and Saved (P-227), commit 4f20b492, 2 Nov

**Setup.**
* Isolated copies on :4455 and :4456, plus clean worktrees of 4f20b492 and origin/main on :4457 and :4458 (forms ports; never :4400).
* The live switch ran only with the fake launcher, whose Live rounds fail (no model call, US$0).
* Two stand-in saved rounds for `wp.family` were written to `p2/runs` and removed afterwards; 0 were left.
* Browser: headless Chrome through Playwright, at 1024, 512 (1024 at 200 %), 400 and 1440 px.
* Script: `/tmp/claude-0/-home-user-xpatready/3ee89504-25b7-5a91-be6b-51bc34e108c1/scratchpad/walk/walk.cjs`, plus the builder's two suites.

## Journeys (persona: content publisher, "Configuration author", unless noted)
1. **Main path (keyboard only, 1024 px).** "Get pre-qualification picks drafted for With an LMIA and decide them."
   * Steps: Questionnaires, then the Pre-qualification chip, then Draft pre-qualification picks. ArrowUp to Live, then Draft Live (it fails). Use Saved (US$0), then Draft with Saved, then Open To review. Accept one pick; reject the other with a reason.
   * Result: 2 picks Ready. One tick (origin AI). One rejected pick with its reason. Pre-qualification counts 1.
2. **Alternate.** With a Saved result, the dialog opens on Saved at US$0, naming Guide 5487 and 4 steps. It held.
3. **Empty.** Live closed and nothing Saved: both ways are greyed with their reasons, "Nothing can start…" shows, and Draft is off and points to it. It held (screenshot 08 at 400 px).
4. **Error: failed Live, nothing Saved.** The note "The AI step did not run, so nothing was charged" appears, and only Done is offered. It held.
5. **Error: Saved vanishes between plan and Draft.** The note says there is no Saved answer and no offer is made. But it is a 201 with a FAILED job, not a 409 "look at the plan again" (m2).
6. **Wrong role.**
   * The approver's draft is refused: 403.
   * Client A and the case officer *read* the plan: 200 (m5).
   * An unknown mode gets 400 "Choose Live or Saved."
7. **Recovery.**
   * A double Enter on Draft with Saved starts 1 job.
   * A reload just after Draft gives 1 more completed job, with still 2 waiting picks (no duplicates).
   * Esc puts focus on `body` (m4).
8. **Across the boundary.** Open To review lands on the combination's group. Accept ticks the question on the Questionnaires tab. It held.
9. **Zoom 200 % (512 CSS px).** The dialog has no sideways scroll and Draft is reachable. To review has no sideways scroll, and axe is clean.

## Data underneath (after each journey)
* Jobs `LIVE:FAILED (US$0)`, then `REPLAY:COMPLETED`.
* `proposal_item` holds 2 waiting `pqr_pick`, each with `origin='ai'`.
* After accept: `fact_source` has 1 prequalification row, DRAFT, `AI_PROPOSAL`. After reject: 1 rejected pick and no tick.
* Audit: "Configuration author drafted pre-qualification picks for "With an LMIA" (Saved, US$0.00): 2 to review".
* Roles are enforced on the server for draft, accept and reject.

## Break-it (and a parallel break report)
These held:
* duplicates under a double Enter and a reload;
* a mode in the wrong case, or an extra field (400);
* a plan checksum that was never looked at (409);
* a retired combination;
* a combination with no guide.

From code reading, also reproduced by the break tester (`break-report-c47-p227.md`):
* **M1:** a paid first round followed by a failed checker round is reported as "nothing was charged" (`pqr-drafts.ts:140-141`, `pqr-draft.tsx:66-67`).
* **M2:** "Saved" can pair rounds from two Live runs, including a fresh unchecked one (`pqr-drafts.ts:83-89`, `rounds.ts:106-109`).
* **M3:** two overlapping Live drafts both run (`pqr-drafts.ts:122-124`).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1 end to end; 60/60 browser suite |
| Next step obvious | 1 | "Use Saved (US$0)", "Open To review", "Nothing can start" ties to Draft |
| Plain words | ½ | "(P-225)", "(P-225, P-227)", "on this copy", "tech lead's Go"; "Use Saved meanwhile" with none saved |
| Feedback and state | ½ | Failure note not announced; Saved stays greyed until reopen; spend hidden at 0 picks |
| Correct data | ½ | Picks, ticks and audit exact; money note can be wrong (M1); mixed Saved pair (M2) |
| Error recovery | 1 | Failed Live leads to Use Saved; vanished Saved handled in words; reload safe |
| Accessibility and screen sizes | ½ | axe clean at 1440, 1024, 512 and 400 px; keyboard path completes; focus after Esc lost |
| Speed | 1 | Failed Live 327 ms; plan and Saved run well under 1 s |
| Visual quality | 1 | Team dialog pattern; clean at all widths (screenshots 01–08) |
| Trust and sources | ½ | AI marked, reason and IRCC sentence shown; "checked answers" not ensured (M2) |
| **Total** | **7.5/10** | **Fail** (below 8; no criterion at 0) |

**Fixes that would raise it, most valuable first:**
1. State the spend truthfully after a failed Live run (M1).
2. Make Saved one pair from one run and drop "checked" unless it is ensured (M2).
3. Refuse a second Live run while one is running (M3).
4. Plain words without decision numbers (m1).
5. Announce the result in a live region and keep focus after Esc (m4).

## Could not test
* A real screen reader.
* A visible (headed) browser pane.
* A real Live call.
* Track A's real Saved result.
* An intended user's unaided walk (D17 and D20 stay with the founder).
