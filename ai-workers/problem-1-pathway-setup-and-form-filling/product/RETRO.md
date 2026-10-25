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
