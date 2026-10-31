# Research: how proven teams run AI coding agents and ship fast (31 Oct)

Written by a research agent for the tech lead; sources linked in each line. [Evidence] = published number or practice; [Opinion] = judgement; [Secondary] = only a summary was reachable.

## What the evidence says, in short
1. **Merge to main at least daily; branches live hours, not days** (DORA trunk-based development, https://dora.dev/capabilities/trunk-based-development/) [Evidence]. Small batches matter more with AI, which writes big hard-to-review blocks (DORA 2025, https://www.dora.dev/research/ai) [Evidence]. Unfinished work merges switched off behind a flag (Fowler, https://martinfowler.com/articles/feature-toggles.html).
2. **Two CI gates:** a fast gate on each PR (affected tests; Meta runs about a third of the tests and catches 99.9% of faulty changes, https://engineering.fb.com/2018/11/21/developer-tools/predictive-test-selection/) and the full set in a merge queue or nightly (GitHub merge queue, https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue; Uber −53% CI cost, −37% wait, https://www.uber.com/us/en/blog/slashing-ci-costs-at-uber/) [Evidence]. Flaky tests quarantined, not blocking (Google: 84% of pass→fail transitions involved a flaky test, https://testing.googleblog.com/2016/05/) [Evidence]; Playwright shards across jobs (https://playwright.dev/docs/test-sharding).
3. **No integrator in the middle:** Cursor found a dedicated integrator "created more bottlenecks than it solved"; planners plus independent workers plus a judge worked (https://cursor.com/blog/scaling-agents) [Evidence, vendor]. Cognition: single-threaded writers plus a fresh-context review agent (about 2 bugs per PR, 58% severe) (https://cognition.com/blog/multi-agents-working) [Evidence, vendor]. OpenAI Codex team: about 3.5 merged PRs per engineer per day, "waiting is more expensive than correcting errors" (https://openai.com/index/harness-engineering/) [Secondary].
4. **Small, decision-first PRs; review within a business day** (Google, https://google.github.io/eng-practices/review/reviewer/speed.html; median change about 24 lines [Secondary]). Keep the fresh-context reviewer (Anthropic, https://code.claude.com/docs/en/best-practices).
5. **Small instruction files:** CLAUDE.md under 200 lines; imports cost the same context (https://code.claude.com/docs/en/memory); skills under 500 lines with detail in reference files (https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices). Long instruction files lowered task success and raised cost over 20% (ETH Zurich, ICLR 2026, https://arxiv.org/html/2602.11988v1); models followed 68% of 500 instructions (https://arxiv.org/abs/2507.11538) [Evidence].

## Our numbers against them
Lead commits 41% (integrator bottleneck) · 713 of 1,044 commits only notes and rules · two branches of about 3,500 finished lines each unmerged for 36 hours (target: hours) · one CI job at a time, 40–65 min full set on every PR (target: fast gate under 10 min) · about 20,000 words of rules and skills read by every session.

## Ranked changes (the ranking is [Opinion] on the evidence above)
1. Merge daily; small items; unfinished work behind a flag.
2. Two CI gates; flaky timing checks quarantined.
3. Merges happen automatically on green checks + reviewer approval; the tech lead plans, judges, demos.
4. One decision = one thin PR; review within hours.
5. Short instruction files and skills, as in the simplify plan.

Caveats: the DORA elite figures, Google review numbers and OpenAI figures came from summaries; vendor numbers are self-reported.
