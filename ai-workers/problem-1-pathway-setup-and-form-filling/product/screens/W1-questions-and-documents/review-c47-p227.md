# Review: C4.7 PQR picks, Live and Saved only (P-227), Track B: round 1 on 4f20b492 (Block), round 2 on 7cc07509 (Approve)

## Round 1 on 4f20b492 (record)

Reviewer: an independent session that did not build this. Diff `origin/main..4f20b492` (1f45ad1d + 4f20b492). Copies were isolated on forms ports 4455–4458; :4400 was never used. Live AI stayed off: the live switch ran only with the fake launcher, as the usage lines pair them. No priced button was clicked, and spend was US$0. No code was edited.

**Screen-review verdict: Ship after fixes.** At this commit, three Majors are open (M1–M3). The journey score is 7.5/10, which fails.

## What I ran (all at 4f20b492)
* `check_forms_c47_pqr_picks.ts`: **53/53**.
* `check_forms_c47_pqr_picks_browser.cjs`: **60/60**. axe is clean at 1440, 1024 and 400 px, with no sideways scroll. I saved the screenshots to my scratchpad and restored the committed ones.
* `acceptance/C4.7.test.ts` on a fresh copy (`wp.family`): **16/18**. The 2 failing lines are the Saved-result checks that wait for Track A, as stated. On the six it exits "setup missing", which is expected.
* `check_forms_c411_draft_qd.ts` (C4.11 step 6 calls `PqrDrafts`): **55/55** on a clean worktree of 4f20b492, and 55/55 on origin/main.
  * The suite first gave 52/55 twice in the shared tree. Cause: another session's break test wrote a stand-in saved run, `p2/runs/studio-pqr-picks-brk-test-live-…-d0x.json`, while my suite was running. The step-6 job record names that file. This was interference, not this commit.
* My own walk (`journey-test-reviewer-c47-p227-2026-11-02.md`): keyboard only; 1024 px at 200 % (512 CSS px); wrong roles, double Enter, reload in the middle of a run, Saved removed between plan and Draft; the database read after each journey.

## What held
* Exactly two ways, Live and Saved. Each is greyed with its reason in words when it is not open.
* "Nothing can start" appears and is tied to Draft (`aria-describedby="pqr-none"`). The approver gets 403 on draft.
* A failed Live run with a Saved result offers "Use Saved (US$0)", which reopens the Saved plan. With no Saved result it offers nothing, and a failed Saved run never offers it.
* A double Enter starts one job. A reload in the middle of a run leaves no duplicate picks (the advisory lock). An audit line is written per draft, with its way and its US$.
* The To review fix holds: no page-level sideways scroll at 400 or 512 px, and axe is clean.
* The Saved check (`saved()`) only reads files: a replay round sends nothing (`rounds.ts:101-113`).

## Majors (Must, each blocks)
1. **M1. A failed Live run can say "nothing was charged" after a paid round.**
   * Where: `api/src/pqr-drafts.ts:140-141`. When the first round succeeds (paid) and the checker round fails, the note is the checker's reason, "The AI step did not run, so nothing was charged" (`rounds.ts:147`). `out.usd` still holds the first round's cost.
   * The dialog shows only the note. The spend line is hidden when 0 picks are proposed (`web/src/components/pqr-draft.tsx:66-67`), so the person is told US$0 after a paid round.
   * This predates the commit (main line 127), but the commit rewrote this exact block for P-227's failed-Live state.
   * Standard: `STANDARDS.md:53` [M] (cost stated and capped) and D11.
   * *Fix:* when `out.usd > 0`, the note states what was spent and which round failed, and the result shows the spend even with 0 picks.
   * *Test:* the fake launcher's first round succeeds at a cost and its checker fails. The note names the US$ and never says "nothing was charged".
2. **M2. The Saved result is not one checked pair.**
   * Where: `saved()` (`pqr-drafts.ts:83-89`) and the replay take the newest usable first round and the newest usable checker round separately (`rounds.ts:106-109`). A "Saved result" can therefore join two different Live runs.
   * `p2/launch.ts:155` writes every Live round straight into `p2/runs`, so a Live run whose first round succeeds and whose checker fails leaves a fresh, unchecked first round. If an older checker round exists, the new "Use Saved (US$0)" then replays that mixed pair.
   * The screen calls this "The checked answers of both AI rounds" (`pqr-draft.tsx:17`). P-227 says a result becomes Saved only after the tech lead and qa have checked it.
   * I confirmed this by reading the code; the break tester reproduced it (B1).
   * *Fix:* Saved counts only when both rounds come from one run. Do not claim "checked" for anything the code does not ensure.
   * *Test:* two rounds from different runs give `available: false`.
3. **M3. A second Live draft is not refused while one is running.**
   * Where: `draft()` creates a RUNNING job without checking for one already running (`pqr-drafts.ts:122-124`).
   * Effect: after a reload, a person can start a second paid run on the same combination while the first is still going. The dialog does not say a run is going.
   * Standard: `STANDARDS.md:27` [M] "Idempotent creates and job launches" is not met. Field maps already refuse a second launch.
   * *Fix:* answer 409 in words while a `pqr_picks` job for the combination is RUNNING (with a stale cut-off), and show it in the dialog.
   * *Test:* two overlapping Live drafts lead to 1 launcher call.

## Minors (Should; none blocks)
* m1. Decision numbers and process words reach the person: "(P-225)", "(P-225, P-227)", "on this copy", "the tech lead's Go" (`pqr-drafts.ts:38,43`). This misses EXPERIENCE.md:46 [M]; it was carried from main ("(P-110, P-131)"). Live's reason says "Use Saved meanwhile" even when no Saved result exists, and so does the over-cap refusal (`:43`, `:119`).
* m2. The plan checksum leaves out the Saved state and its run files (`pqr-drafts.ts:109`). If the Saved files vanish or change after the person looks, the run goes ahead (201, audit "0 to review") instead of answering 409 "Look at the plan again".
* m3. Saved stays greyed "(none yet)" until the dialog is reopened. Nothing fetches the plan again (`pqr-draft.tsx:34`).
* m4. Focus and announcements:
  * after Draft, focus falls back to the dialog container;
  * the failed-Live note is not in a live region (`pqr-draft.tsx:59-66`);
  * Esc drops focus to `body` (open from the last review).
* m5. Any persona can read the plan: Client A and the case officer get 200, which now includes `saved`. This is open from the last review (`readerOf`).
* m6. `mode: "rules"` stays callable by any author through the API. It is documented as API-only and costs US$0. In a Live run where the guide is not on the official list, the note says "so only rules can draft these" (`pqr-drafts.ts:131`), which names a way no person is offered.
* m7. At 400 px the proposals table scrolls inside its box. This is allowed for data tables, and there is no page scroll.

## [M] lines touched by this change
* Plain words / no decision numbers: **not met** (m1).
* Idempotent job launches: **not met** (M3).
* Cost estimated before launch and capped: met before the run; the failure note **misstates spend** (M1).
* Server authorisation: draft is enforced (403); reading the plan is not (m5).
* Keyboard, zoom and axe: met.
* No request per row: met. The plan reads the PQR run files twice; this is quick (the failed Live run took 327 ms).

## D1–D20 at 4f20b492 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | Live and Saved exactly, each greyed with its reason; "verified Saved" not ensured (M2) |
| D2 | 3 | No duplicate picks; overlapping paid runs (M3); a mixed Saved pair |
| D3 | 4 | Shared StepRunner and the one queue |
| D4 | 4 | Same refusals as a hand tick (acceptance) |
| D5 | 3 | Reload and double Enter hold; second Live run not refused |
| D6 | 4 | Audit line with way and US$ |
| D7 | 3 | AI marked, reason and quote shown; "checked" claim and money note wrong |
| D8 | 4 | Orientation unchanged |
| D9 | 4 | Use Saved and Open To review are clear next steps |
| D10 | 3 | Decision numbers in the reasons (m1) |
| D11 | 3 | Spend misstated (M1); failure not announced (m4) |
| D12 | 4 | Reads cleanly |
| D13 | 4 | axe clean at 3 widths and 512 px; keyboard path completes; focus after Esc lost |
| D14 | 4 | Follows the D2 Draft dialog pattern |
| D15 | 4 | Failed Live 327 ms; plan quick |
| D16 | 4 | S and F checks fail if their rules go; no test for a paired Saved, a paid-then-failed run or overlapping Live runs |
| D17 | — | Simulated only |
| D18 | 4 | Guide sentence, file and run files named |
| D19 | 3 | Saved path waits for Track A's result (16/18) |
| D20 | — | Simulated only |

**Graph (P-86):** `graph.mjs` reports G1 0 · G2 0 · G3 7 · G4 0 · G5 0 · G6 3 across the app. C4.7 is named by 4 tests, and both `/pqr-picks` routes are exercised by the two suites. I saw no element of this change without a capability.

## What I could not check
* A real screen reader; a headed browser (I used headless Chrome); a real Live run (never made); Track A's real Saved result.
* Rule-removal runs (I could not edit code); D17 and D20, which stay with the founder.
* B1 and B3 behaviour I confirmed by reading the code; I did not reproduce it myself.

## Note on the branch
While I reviewed, another session pushed 5f2c19cc and b7e3f4d0 onto this branch. b7e3f4d0 says it fixes break B1–B4, B6, B7 and B10. **I did not review those commits.** This verdict is for 4f20b492 only. b7e3f4d0 needs its own review before the `review: approved` label.

**Verdict: Block** (4f20b492). Fix M1, M2 and M3. Minors m1–m7 can be done in the PR. Journey 7.5/10.

---

## Round 2 on 7cc07509 (2 Nov): **Verdict: Approve**
Scope: diff `4f20b492..7cc07509` (5f2c19cc, b7e3f4d0, 7cc07509) for M1–M3 and the Minors, then the whole change against origin/main.
* Setup: copies on forms ports 4455–4458; :4400 was never used. The live switch ran only with the fake launcher, so spend was US$0.
* Before each run I checked that no other session was writing stand-in runs into `p2/runs`; a watcher found none.
* Afterwards I restored the screenshots and `tests/check_pqr.json` my runs rewrote. Nothing is left in `p2/runs`, and my copies and databases are removed.

No Blocker or Major is open. Screen-review terms: **Ship**. The journey score is **9/10, a pass** (round 2 in `journey-test-reviewer-c47-p227-2026-11-02.md`).

### Suites at 7cc07509 (each on its own fresh copy)
* `check_forms_c47_pqr_picks.ts`: **60/60**, including the new B1–B4 checks, each with a pass and a fail case.
* `check_forms_c47_pqr_picks_browser.cjs`: **62/62**. axe is clean at 1440, 1024 and 400 px, with no sideways scroll.
* `check_forms_c411_draft_qd.ts` **55/55** · `check_pqr.ts` **38/38** · `check_c48_sqr_release.ts` **25/25**.
* `acceptance/C4.7.test.ts` (`wp.family`): **15/15, plus 2 WAIT, exit 2**.
  * The two Saved checks print WAIT only when the plan answers 200 with `saved.available: false`. Any other answer still fails them.
  * "setup: the Saved draft ran" moved inside the Saved branch; it was not dropped. A WAIT is never counted as a pass (`acceptance/lib/pack2.ts`).

### Round-1 findings
* **M1, fixed.** The note drops "nothing was charged" and adds "This run cost US$0.37 (counted); nothing of it is used." The dialog shows "Live, US$0.37 counted." even with 0 picks (`pqr-drafts.ts:167`, `pqr-draft.tsx`).
  * I walked it with the keyboard: the result is a `role=status` region and takes focus, and axe is clean.
  * The job row (FAILED, 0.37) and the audit line ("Live, US$0.37") agree.
* **M2, fixed for what the code can ensure.** `savedRounds()` takes the newest usable checker round, then only the first round with the same job stem (`rounds.ts` `pairOf` and `replayPair`, additive).
  * Pairing holds for product Live runs: both rounds use `jobIdFor(base, …, batchId = job.id)`, and `launch.ts:92` names the run `<jobId>-live-…`.
  * The words no longer say "checked".
  * Making Saved mean only results the tech lead and qa have checked is raised to the tech lead as a shared question (P-227 applies to every AI step), so it is not a finding for this row.
* **M3, fixed.** The RUNNING check and the job create sit under one advisory lock per combination, and a second start answers 409 "Already drafting" (`pqr-drafts.ts:140-145`).
  * Two tabs: the second tab's Draft Live showed "…already being drafted for this combination…", and the launcher was asked once.
  * Once the first run ended, the second tab's Draft started normally.
* **m1, fixed.** No P- numbers or process words on the main path ("Live is not open yet: each paid run is approved first, with its cost stated."). The over-cap refusal no longer points to Saved.
* **m2, fixed (B4).** The Saved run files are in the plan checksum, and a changed Saved result gives 409.
* **m4, partly fixed.** The result is announced and focused. After Use Saved, focus moves to the Saved choice, so a second Enter does not start a run. Esc still drops focus to `body`, which predates this change.
* **m6, fixed.** The not-official note no longer names rules. The `rules` API path stays documented as API-only.
* **Still open, Minors:**
  * m3: Saved stays greyed until the dialog is reopened.
  * m5: Client A and the case officer can read the plan (`readerOf`).
  * m7: the To review table scrolls inside its box at 400 px, which is allowed for data tables.

### New Minors (Should; none blocks)
* n1. The paid-then-failed note contradicts itself: "The AI step did not run. This run cost US$0.37…". Stripping the clause leaves "did not run", although the first round ran (`pqr-drafts.ts:167`). *Fix:* say the checker round did not finish.
* n2. A throw after the job is created leaves it RUNNING, and "Already drafting" then blocks the combination for 15 minutes. This can happen at `guide()` (`pqr-drafts.ts:152`) or in the insert transaction (`:184`); round throws are already caught. *Fix:* end the job as FAILED in a `finally`.

### D1–D20 changes from round 1
* D2 4 (one run at a time, Saved from one run) · D5 4 · D7 4 · D10 4 · D11 4 · D16 5 (pass and fail tests for B1–B4).
* All others are as in round 1. D17 and D20 are simulated only.

### Could not check
* A real screen reader; a headed browser; a real Live call.
* Track A's real Saved result: the 2 WAIT lines stay with qa.
* Rule-removal runs (I could not edit code).

**Verdict: Approve** (commit 7cc07509). Minors n1, n2, m3, m4 (Esc), m5 and m7 are for the PR or a follow-up.
