# Retros — one per screen, five lines, newest first

Owner: the Lead, at DEMO. At most one workflow change per retro, recorded in `DECISIONS.md`.


## 25 Oct 2026 · Screen 01 Programs (DONE after the founder's walk)
* **Worked:** layered checks caught real defects before the founder (qa found QA-14, QA-19–22; reviewer and breaker found the release race); CI on every push (P-85) caught a red suite the lanes missed.
* **Did not work:** from READY to DONE took four days of FIX rounds and Lead admin; founder gates waited on one person, so lanes sat idle; two merges went in with a journey score of 7 and no re-score.
* **Root cause:** every gate needed the founder's presence, and the after-FIX re-score was not written into the `next` skill.
* **Change:** P-89 — full development mode: the Lead runs EARLY-LOOK and DEMO, the founder walks the milestone end to end once.
* **Watch next screen:** a FIX must end with a fresh journey score of 8+ before the Lead merges.
## 21 Oct 2026 · Screen 01 Programs (data layer done, screen rebuilt)
* **Worked:** the builder's challenge found real gaps (release unit, status model, speed); the data layer is solid (API 58/58, rules 32/32, no paid AI).
* **Did not work:** the founder first saw the screen after it was coded and found it cluttered; scope grew through accepted objections ("the team's screen has it"); "production-grade" was read as scale testing; scaffolding (downloads) was mistaken for capability.
* **Root cause:** we agreed text, not a clickable picture; nobody looked at the screen until it was finished.
* **Change:** P-42 — design first in the clickable journey, Definition of Ready, show early after slice 1, change control through the board, demo + retro per screen.
* **Watch next screen:** time from READY to EARLY-LOOK should be under 2 hours.

## 2026-10-27 — Lead: missed hand-backs (screens FIX 3 h, runtime S5 slice 1 early look 4 h)
* **Worked:** parallel lanes kept building; build-ahead (P-126) and one-question founder picks cleared S4, S5 and Program structure decisions in minutes.
* **Did not work:** two lanes finished and waited hours; their "Paste to Lead" stayed in their own chats, and the Lead watched messages, not branches.
* **Root cause:** hand-back depended on the founder copying text across chats; the Lead had no routine check of lane branches.
* **Change:** lanes send their Paste to the Lead session with SendMessage; the Lead reads every lane's newest commit (`lane.sh status`) on every pass, not only when a message arrives.
* **Watch next:** no lane waits more than 30 minutes at a Lead or founder stage.

## 29 Oct, ninth Lead chat: a shared contract change broke two lane PRs
* **What happened:** PR #98 changed contract v2 (`addReason` dropped, `source.rule` added) and merged first; runtime's #94 and screens' #96, built on the old shape, then failed CI (check_pqr; six replay suites).
* **Root cause:** the Lead merged a shared contract change before the lanes that use it had synced and rerun their checks on it.
* **Change:** a change to a shared contract (`contracts/`) merges together with, or after, each dependent lane's fix; the Lead names the dependent lanes in the contract PR.
* **Also:** disk fell to 5.2 GB unnoticed (R-142: `tools/disk.sh` at every Lead check).
