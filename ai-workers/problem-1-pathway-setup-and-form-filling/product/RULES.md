# Rules in force — one page (the tech lead keeps it; as of **P-337**, 4 Nov 20:15 IST; the section "Added 4 Nov" below wins over older lines here)

Each rule once, with the decision that set it. A decision newer than "as of" above wins over this page: read those rows in `DECISIONS.md` word for word. Older rows are history; read one only when a rule here cites it and you need its detail.

## Goal and order
* **M2 end to end first; its AI capabilities are the critical path** (P-301, P-309). Target 58–59/60 confirmed, 60 after the SA-01B ruling (P-309). M3 runs alongside only on files the M2 lanes do not touch (P-301, P-313).
* **Quality first, never cut** (P-303, P-309): no lower bar to reach a number.
* **Order (P-317):** QA-144 first, then the other M2 partials; no new M3 rows until M2 reaches 55 confirmed; approved M3 PRs still merge. A qa lane runs every day.

## When a capability counts as Works
* Its acceptance pack is green on `main` **and** an independent re-run confirms it (P-290), on the demo data (Reset to the six), not only the test fixture (P-304 (2)).
* An open Major or Critical in `qa/BUGS.md` on it keeps it Partial (P-305 (3)).
* qa re-scores after every merged batch (P-277, P-311 (1)); qa's verdict decides.
* Held parts (P-251, P-265, P-284) are listed in STATE; nobody builds them. L-SA3 is no longer held (P-315); the founder acts as the SA-01B product owner and lifted every hold decided in P-235–P-248, including G5, L-SA6–L-SA11 and C11 (P-316); Express Entry's police and medical block is the one hard stop besides Validate (P-172, P-315).

## Builders
* One row per session and per PR, on a fresh branch from `origin/main` (P-278, P-312, P-314). A standby Mac builder gets its next row by message.
* **Before the label:** the row's acceptance pack passes on a fresh isolated copy built from the branch, plus a walk like a person at 1440 px; exit codes and screenshots in the PR; no open Major on that capability (P-312).
* **Two gates (P-317):** CI fails a product PR that names a capability with an open Major or Critical, unless it names that bug as the one it fixes, and runs that capability's pack on the demo data (gate B). A PR that claims to make a capability Works is labelled only after the qa lane's PASS on its isolated copy (gate A).
* A PR whose CI ran before a fix to the checks merges `origin/main` once; no new review if the merge touches none of its files, else a diff-only Opus check of the merge (P-318 (1)).
* Reviewer agent, breaker, qa scoring and every judgment on **Opus**; Sonnet only for mechanical work (P-303). Breaker only for money, schema, permissions or a new screen (P-278).
* Diff-only re-review; at most two review rounds, then the tech lead decides (P-293 (3)). After the label, push only a real fix (P-293 (1)).
* Merge `main` in only on a conflict (P-270). Label `review: approved` after the reviewer's Approve of the current head; Mergify merges (P-189).
* Questions: a PR comment headed "Question for the tech lead" (P-293 (2)).
* **Builders never edit the shared notes files** `STATE.md`, `RULES.md`, `DECISIONS.md`, `BACKLOG.md`, `tools/decision-impact.sh`; qa alone edits `qa/CAPABILITIES.md` and `qa/BUGS.md`. Build notes go in the row's own folder under `screens/` (P-314).
* Live AI off and US$0 unless the brief carries the tech lead's paid Go with costs (P-175, P-295). Never click a priced button in a check.

## How many sessions
* Five cloud builders on M2, the qa lane, one infra lane, the Mac paid runner, up to three Mac builders for M3 and AI work, two standby Leads (P-286, P-312, P-313).
* Add a builder only while batch failures stay under 10% and approval-to-merge under 1 hour (P-291 (2)); remove one when either breaks.

## Merging and records
* CI and merge-flow fixes may merge ahead of the queue on green (P-214).
* Notes PRs go through the queue with the label, never merged by hand while a batch is checking (P-306 (3)).
* The tech lead writes records at most twice a day (about 08:00 and 20:00 IST) and at a hand-over, in one PR (P-314).

## Money (paid AI)
* Cap **US$150 in total for the night of 3–4 Nov** (P-313; was US$100, P-300). The tech lead approves each run without asking (P-309).
* Rules for every run (P-295): usual and worst cost in the ledger (`prototype/p2/ledger.ts`) and the PR first; cheapest and most certain first; start only if spend so far plus its worst stays inside the cap; one attempt, retries only for temporary errors; every AI draft gets an independent checker round; one PR per result with qa's verdict; qa labels paid-result PRs (P-275).
* Job cap US$5 per two attempts (P-232), except a worst case the records state in advance (P-295). Runs only on the Mac paid runner's own copy with the live switch on for that run only.

## The tech lead
* Checks every 30 minutes (P-276). Hands over once a day, at about 400k tokens, or sooner if it loses track (P-314); two idle standby Leads, named in sequence (P-286, P-313).
* Sessions start only in a turn the founder typed. All times to the founder in IST (P-302). Talk in capabilities and plain words (P-291).
* Product questions that decisions, canada.ca or best practice settle are ruled by the tech lead and recorded (P-294); real preference questions go to the founder one at a time with a recommendation.
* Immigration values only from official sources with page, quote and date (AGENTS.md rule 4, P-170).

## Added 4 Nov (P-319–P-337): these win over older lines above
* **Order now (P-336, P-337):** finish M2 to 60, lean, before anything else; then the scale changes before M3 restarts (scorecard split, generated records, a GitHub App for agent approvals, packs for the 18 pack-less Works rows). **Trip-wire:** at 6 Nov 23:00 IST, if M2 is under 57 confirmed or the burn is over 2.5% of the weekly plan an hour, switch to scale-first.
* **No new M3 work until M2 = 60** (P-332); M3 PRs in flight finish. M3 stays on main against the M3 contract on M3-only files when it restarts (P-323, P-325).
* **Works is frozen at P-322 until M2 = 60** (P-337): setup capabilities count on the six; later steps on the configured checkpoint only if product steps built it. qa re-scores only the rows a merged PR names or a closed blocker frees; no whole-table re-proofs.
* **Lean crew** (P-337): about 7–8 working sessions; a lane ends when its PR is labelled; no side-builds (#945, #951, #858 paused to 6 Nov). Files many PRs touch (demo.ts, form-part-placements.ts) merge one PR at a time.
* **Budget (P-331, replaces P-327):** no extra usage. Measure the burn per hour at every check. At 85% weekly, no new rows (P-308); at 90%, every lane stops at a clean pushed point and the tech lead writes "Resume on the new account".
* **Paid AI today:** cap US$30 a day (founder, 4 Nov); the tech lead approves each run inside it with the worst case first (P-295, P-309). A paid run happens where Works is counted (the six or the checkpoint), never fixture-only.
* **No hard-coding (P-319):** no combination or form number in code; the chain is the guard, family forms, IRCC checklist coverage, then M3 tables.
* **Cloud lanes (P-326):** each check reads claude.ai/code as text; a lane counts as running only after its first push or draft PR; type into an idle lane only after confirming its URL; a platform decision needs one live canary; run the connection checklist after any account, plan or visibility change.
* **Reports (P-324):** separate blocks M2, M3, M2 workflow and sessions, M3 workflow and sessions, interdependencies, pre-mortem; only qa's numbers; times from the clock in IST. No wasted work or tokens: a hard rule.
* **Labels (P-324):** the tech lead labels on the founder's behalf; auto mode refuses the Lead's own records PRs unless the founder names them in that Lead's chat.
* **Gate B:** never drop a capability id to pass it; name its steps or hold (P-330 (7)). A WAIT or HELD line is never green (P-334 (6)).
* **Immigration wording:** each form's own official words decide who fills it and what it asks (AGENTS.md rule 4; QA-221 ruling, 4 Nov).
* **No multi-tenant work in the reference app** (P-335): the team's platform owns tenant isolation (P-249); our two-firm checks stay as the spec.
* **Records once a day, plus each hand-over** (P-336, amends P-314); rulings live as PR comments and are summed up in that day's row.

## Process freeze (P-312)
No change to the workflow, tools or these rules until **10 Nov 22:30 IST**, except one that a measured number justifies, with the number it should move, checked after a fixed period, kept or undone.

## The compass (P-312): judged daily from tools, never from prose
| Number | Healthy |
|---|---|
| Capabilities confirmed per day | 10 or more |
| Works on qa's first re-score after merge | 80% or more |
| Major or Critical bugs found after merge | about 0 |
| Works → Partial demotions per day | at most 1 |
| Capabilities in progress | no more than builders |
| Notes PRs as a share of merges | 20% or less |
| Merge batches thrown away | 15% or less (conflicts at most 5 a day) |
