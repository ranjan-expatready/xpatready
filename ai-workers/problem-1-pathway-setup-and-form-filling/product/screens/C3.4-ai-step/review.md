# Review: C3.4 AI step in the app (forms lane), commit 0700958f

Reviewer: fresh agent, did not build it. Diff `origin/main..0700958f`. Isolated copy on :4458, nothing paid, no live switch, no model call. This is an API and AI step, not a screen: the screen-review checks that apply are code, money, contract and decisions (P-120, P-134, P-138, P-149, P-158, P-175, P-227).

## What held (evidence)
- `tests/check_forms_c34_ai.ts`: 40/40 on a clean isolated copy. (A first run failed 1 of 25 and then crashed because another session was using the same worktree's `p2/runs` at the same time; rerun alone it passes. See Minor 6.)
- Live off: `POST draft-masters {mode:"live"}` and the live plan both 409 at US$0 before anything is read, no job written (`form-masters.ts:178,253`). `need(actor,"author")` first; a viewer gets 403.
- Once per edition: 5 parallel rules clicks on IMM 5710 gave 5 x 201 and 1 job (advisory lock, `form-masters.ts:201-212`). AI draft: lookup, running check and RUNNING insert under one lock (`:266-274`); a second click returns the one draft, a click while one runs gets 409.
- Replay pairing: checker round first, draft chosen by `pairOf` of the same run (`:160-166`); `isSameSavedRun` checks prompt hash, input sha and context key, so another edition's or combination's run is not used (test: recorded under "IMM 5257:01-2020" is refused).
- Contract: every item goes through `ProposalItem.safeParse` in `insertProposals`; I checked each AI-supplied string and array against the zod limits (reads 1-20 and 120 chars, examples sliced to 3, name 120, proves 3-200, reasons and quotes sliced, identity key under 300). No unguarded limit found.
- Job files: four committed, byte-equal to what the app writes (test J); worst per round US$2.18/2.17 (form), 0.72/0.71 (guide), all inside the round budget and the US$5 run cap; plan worst (budget based) is higher, US$6.60 for the form, and is what the click is gated on. Rules pass: 13 sections, 13 answer lists, "Marital status" with 8 choices, all quotes found, all Sample.
- Not found: any path to spend with the switch off. The launcher's own live_off check is a second layer.

## Blockers
None.

## Major (2)

**M1. A throw after a paid Live run loses the cost and demotes a finished job.** `form-masters.ts:324-330`. Everything after the two rounds sits in one `try`: the proposals transaction (`:304-323`), then `audit.log` (`:324`). If any of them throws (the queue transaction times out, `insertProposals` refuses a batch with its 409, `libraryFacts` or the audit write fails) the `catch` only sets `status:"FAILED"` and a message. It writes no `costUsd`, no `run_files`, and does not offer Saved, although both rounds were paid and their run files are on disk. Case: Live run, US$2.5 spent, `audit.log` throws after the transaction committed: the job shows FAILED, cost empty, "nothing of it is proposed", while 28 proposals are on To review; the person clicks Live again with the same plan hash (the plan does not change) and pays a second run. The rounds-failed branch (`:288-298`) does record cost and offers Saved correctly; this branch does not. Fix: in the catch, set `costUsd: usd`, `run_files`, keep a COMPLETED job COMPLETED (move `audit.log` out of the try or `.catch` it), and offer Saved when the run files replay.

**M2. P-134 rests on one boolean the model sets, and rounds that disagree keep the unsafe one.** `engine/masters-ai.ts:176` `aiRead = d.identity_document && …`. Run on `formMastersFromRounds` with a Passport (category "identity", reader "letter_or_record"): both rounds `identity_document:false` gives `ready, readerKind letter_or_record, identityDocument false` (bulk-acceptable AI-read passport); draft false and checker true gives `check` but the payload is still the draft's (`merge`: `x = a ?? b`), so accepting it lands an AI-read identity document. The M5 test only covers the case where the model sets the flag and a wrong reader together. P-134 is "AI never reads identity documents", and P-153 says code is the guard, not the prompt. Fix: treat a document as identity when either round says so or its category is `identity`, then force the reader to coded_lines, printed_layout or person_only; add the two cases above to the check.

## Minor
1. `RUNNING_FOR_MS` is 15 min (`:119`) but one round can run (300 s x 2 attempts + 60 s) = 11 min, two rounds 22 min. A slow provider lets a second Live click pass the "already drafting" check while the first still runs (the ledger reserves both, so spend is capped, but it is the double paid run the lock is for). Same constant as C4.7; set it above 25 min.
2. No paid-attempt budget per edition across failed Live runs (`paidRunAllowed` exists for field maps, rounds.ts:65-66). Two wrong-shape answers in a row each cost US$2+ and nothing stops a third click except the global ledger cap.
3. `form_check` and `cross_check` can be queued but not accepted: `LANDERS` has none, so Accept gives "accepted with its own step, not yet on this queue" (proposals.ts:443). The acceptance accepts only a section, so it does not see this. Say it in the PR; the follow-up row needs a home for checks.
4. The acceptance pack (`C3.4.test.ts`) passes 2 of 16 here, because its first call is `replay` and a refused replay stops the rules sections, lists and the marital list (which are green by a rules call: 13 sections, 13 lists, marital 8). Done-when says the steps that need no real saved result pass; today none meaningfully does. Tech lead: have the pack call `rules` first (assertions unchanged) or accept that it stays red until the saved run exists, as its header says.
5. Smaller: `String(body.mode)` turns `["live"]` into "live" (`:176,193`); the plan route has no role check (a viewer can read a plan, no spend); the Live plan states a cost even when a draft already exists and the click would return it free; a second form check on the same boxes in one round is dropped silently without an entry in `dropped` (`masters-ai.ts:159`); a quote can match across two boxes' captions joined in the printed text (`:~140`).
6. `check_forms_c34_ai.ts` writes simulated runs and rewrites committed `p2/runs/stub-pass` and `p2/screening/canary-digest.json` in the shared `p2/`, then restores by bytes. Two sessions at once corrupt each other (I saw it; `git status` was dirty after my run and I restored with `git checkout -- p2`). Give it a scratch `p2` copy or a lock.
7. No screen entry exists for Live or Saved (the panel in `ai-launch.tsx` still says the AI step waits). This is outside this row as written (API and AI step), but P-227 and Track B need it before qa can reach Works; a follow-up row.

## Decisions check
P-138 once per edition and click only: yes. P-149 one door, origin and second person: yes (all via `insertProposals`, no lander shortcut). P-158 lists and sections by rules only, items rest on a source: yes. P-175 switch: yes. P-227 Live or Saved, failed Live offers Saved: yes on the rounds-failed path, not on M1's path. P-120 reuse over new: document types by name reuse a live type. P-134: see M2.

## Not checked
No real Saved result exists, so the quality of a real model answer is untested. No screen exists to walk. The journey score is in `journey-test-reviewer-2026-11-02.md`.

**Verdict: Block** (M1, M2). Fix list: M1 catch records cost, run files, keeps COMPLETED, offers Saved; M2 identity guard by either round or category plus tests. Minors 1 and 4 would be good to take in the same pass.
