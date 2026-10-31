# Cutover runbook (P-185, P-186) — for the next Lead chat

Nothing stops until step 4. Lanes keep building and the queue keeps merging on today's setup throughout steps 1–3.

## 1. Start of the fresh Lead chat (Mac)
1. `/lead` guard and start-of-chat steps; merge records PR #106 on green.
2. Read the cloud trial report (inbox file `2026-10-30-cloud-trial.md` on its `claude/*` branch): setup time, suite time, every failure and which limit hit.
3. Keep the queue moving: #96 → forms line (closes #103) → screens card → runtime lines. Each: Lead check, green check, merge, :4400 restart, `/qa after-merge`.

## 2. Build the new setup (Lead track, on a `lead/*` branch, by PRs; lanes untouched)
Order matters: each item is small, tested and merged before the next.
1. **Test machinery:** run-suites groups with a unique name and port per suite and a resume; fix the shared names and ports the review found (screens_s2, runtime_pqr/pv/fills; ports 4434–4454 reused); isolated.sh stops its own server by pidfile and checks the database it reached.
2. **Check split (P-186):** ci.yml runs heavy groups on the Mac runner and light groups on GitHub's free minutes, with an input that sends everything to the Mac when minutes run out.
3. **Guard checks:** file overlap with other open lanes, migration order, branch up to date with main, no `*_LIVE=approved`, push guard.
4. **Merge only from the Mac:** merge-guard needs a Mac-only marker (not in git) and green checks; `whoami` never answers `lead` in a cloud machine; lead skill says "merge by PR".
5. **Cloud setup:** install jq, lsof, gh; pin the Playwright browser; stop-check fails closed; Mac-only paths replaced.
6. **Skills and rules:** requirement trace + acceptance checks first (screen-concept, plan); pre-review in `next`; reviewer and breaker started by the Lead on a fixed version; fix-commit cause tags; platform lane in LANES and lane.sh; weekly scorecard script; CHARTER merged.
7. **Dry run:** one cloud builder takes one small slice through the whole new path.

## 3. Ready check → founder
All five true: trial passed (or fixed and rerun), new check green, queue merged or parked at pushed checkpoints, skills and charter merged, dry run passed. Lead tells the founder "ready for cutover" with the numbers; founder says Go.

## 4. Cutover (about one hour)
1. Message each running Mac lane session: finish the current step, commit, push, write the Handover in its lane file. Wait for each to go idle.
2. Verify every lane branch: pushed, clean, nothing unpushed (`lane.sh status`).
3. With the founder's OK, archive the old Mac lane sessions and remove their copies (frees disk; branches stay on GitHub).
4. Start one cloud session per builder lane (screens, forms, runtime, platform) and qa: source = its branch, prompt `/next <lane>` or `/qa <mode>`. Evidence stays on the Mac.
5. Lead watches through GitHub (PRs, lane files, checks), since cloud sessions cannot message back; `/loop` while the Mac is awake.

## 5. First days after
* Measure the first Mac checks: target 15–20 min; above 25 min → ask the founder about paid machines.
* First weekly scorecard on Monday; one workflow change at most.
* Founder hears: daily brief, early looks, product choices, money and risk; nothing technical.
