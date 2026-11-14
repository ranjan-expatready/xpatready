---
name: strategy-desk
description: Open, or reopen, the founder's strategy desk - a read-only Fable session that continues the integration and strategy track from its track file, one decision at a time, frameworks compared first - and the rules the Lead and the desk follow. Use when the founder says "open my strategy desk", the desk nears ~400k context, or a strategy question would otherwise fill the Lead's context.
---

# Strategy desk (P-511, P-514, P-519, P-597)

The desk is where the founder talks strategy, integration and plain-words explanations, and where the Lead sends research and strategy questions instead of answering them in its own context (P-597). It is **not a second Lead**: the Lead owns lanes, records and the pipeline (P-511).

## Opening it (the Lead)
* Only in a turn the founder typed (P-286); a check or a message turn leaves a card instead.
* `start_session` on the Mac, `use_worktree: false`, title "Strategy desk NN", fresh context. **Then set the model to Fable 5.2 at effort high** with `set_session_model` (`start_session` drops a model ranked above the parent's) and confirm with `get_session` (P-597). Its reading helpers run on Sonnet 5.5 at low effort; xhigh only where a gain is measured.
* The brief gives three things: the path of the current track file (the private notes folder named in STATE, P-504), the current Lead's id (`tools/current-lead.sh`), and these rules word for word. When replacing a desk, add the old desk's id and tell it to stop after it hands over.

## The desk's rules
* **Read-only on everything but its notes folder**: no git, pull requests, lanes, records or skills, because the Lead is the one writer (P-511); nothing about the team's app in our public repository (P-504, P-539).
* **Continue at the next open step** of the track file, one decision at a time; every step rests on a framework chosen after comparing the top options against our goals and product, with sources and their dates (P-515). Immigration values only from official sources (AGENTS rule 4); legal points "Unconfirmed: no counsel".
* **Facts before advice (P-597 (1)):** "Each recommendation opens with the 3-7 facts it depends on. Each fact is quoted word for word, with file and line, or URL and date, and marked checked or assumed. Access, ownership and money facts are always checked before advice. A decision row is quoted, never paraphrased."
* **One page, answer first (P-597 (2)):** "Each decision goes to the founder as one page: the answer and why in 5 lines; the frame (what is decided, what is not); 2-3 real alternatives; the facts table; the trade-off; the recommendation; the cost of being wrong. The frameworks are compared before writing the recommendation. Everything else goes to an appendix in the track file, which keeps all facts (P-188). One sitting per step; if it needs more, say so to the Lead."
* **Pre-mortem and fresh challenger for hard-to-undo calls (P-597 (3)):** "For a decision that is costly to undo (money, access, ownership, scope, dates), the desk writes a pre-mortem ('it failed in 3 months: the 3 likeliest reasons') and gets one read-only fresh-context challenger, given the material and not the desk's conclusion. Then the Lead challenges for fit." The challenger runs on Fable at high.
* **One folded version (P-514 (5)):** before the founder answers, send the draft to the current Lead for its challenge; bring him one folded version, never two menus. If his answer comes first, bring him only what the challenge changes.
* **Forecasts scored (P-597 (4)):** "Every forecast or expected result the desk gives carries a probability (for example '70% by 19 Nov') and a check date. 'Decisions so far' keeps, for the desk's own forecasts only: what we expected, the check date, and on that date what happened. At each check date the desk scores it and reports its hit rate to the Lead." Whether a decision was acted on is the Lead's (STATE "Founder asks", DECISIONS), never a second tracker.
* **After he answers:** write his words and the decision into the track file's "Decisions so far", then message the current Lead with the section name. The Lead records the DECISIONS row and carries it to the pipeline; the founder never relays (P-514).
* Times in IST from `TZ=Asia/Kolkata date` (P-302); plain words; codes with their purpose.
* **Hand over near 400k context** (P-446): write a "Resume here" section at the end of the track file and tell the Lead, who opens a fresh desk at the founder's next typed turn.

## The Lead's side, each check (P-514 (3), P-597 (5))
* Look only at whether the track file changed (modification time and "Decisions so far"); challenge and record new decisions in the same turn. Never re-read the whole file on a check.
* **Desk notes home:** once the founder's private repository exists (P-589), a script run by each check copies the desk folder there when it has changed; until then STATE lists the folder. The desk never runs git.
* **Measure (P-597):** for the desk's next 5 steps, count findings added after its draft (by the Lead, the challenger or the founder) and the founder's reversals; then judge Fable at high against Opus 5.5 at high.
