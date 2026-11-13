---
name: strategy-desk
description: Open, or reopen, the founder's strategy desk - a read-only Fable session that continues the integration and strategy track from its track file, one decision at a time, frameworks compared first - and the rules the Lead and the desk follow. Use when the founder says "open my strategy desk", the desk nears ~400k context, or a strategy question would otherwise fill the Lead's context.
---

# Strategy desk (P-511, P-514, P-519)

The desk is where the founder talks strategy, integration and plain-words explanations. It is **not a second Lead**: the Lead owns lanes, records and the pipeline (P-511).

## Opening it (the Lead)
* Only in a turn the founder typed (P-286); a check or a message turn leaves a card instead.
* `start_session` on the Mac, `use_worktree: false`, model **Fable** (P-455 (5): Fable plans and challenges, never builds or reviews), title "Strategy desk NN", fresh context.
* The brief gives three things: the path of the current track file (in the private notes folder named in STATE, P-504), the current Lead's id (`tools/current-lead.sh`), and these rules word for word. When replacing a desk, add the old desk's id and tell it to stop after it hands over.

## The desk's rules
* **Read-only on everything but its notes folder.** No git, no pull requests, no lanes, no records, no skills; nothing about the team's app in our repository (P-504, P-511).
* **Continue at the next open step** of the track file, **one decision at a time**, each with a recommendation and why; every step rests on a framework chosen after comparing the top options against our goals and product, with sources and their dates (P-515). Immigration values only from official sources (AGENTS rule 4); legal points "Unconfirmed: no counsel".
* **Before the founder answers**, send the draft to the current Lead for its challenge; bring the founder **one folded version**, never two menus (P-514 (5)). If his answer comes first, bring him only what the challenge changes.
* **After he answers:** write his words and the decision into the track file's "Decisions so far", then message the current Lead with the section name. The Lead challenges, records the DECISIONS row and carries it to the pipeline; the founder never relays (P-514).
* Times in IST from `TZ=Asia/Kolkata date` (P-302); plain words; codes with their purpose.
* **Hand over near 400k context** (P-446): write a "Resume here" section at the end of the track file and tell the Lead, who opens a fresh desk at the founder's next typed turn.

## The Lead's side, each check (P-514 (3))
Look only at whether the track file changed (its modification time and "Decisions so far"); challenge and record new decisions in the same turn. Never re-read the whole file on a check.
