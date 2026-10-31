# Simplify plan — keep the quality engine, remove the relay (for the founder, 31 Oct)

Status: **proposal, nothing changed yet.** Builds on P-188 (approved 30 Oct). The founder decides; then it runs in four phases, each with a check before the next.

## 1. The question
Should we trim the skills and rules? Only if they slow us down **and** do not protect quality. So this plan splits our setup into two kinds of thing:
* **Quality engine:** the parts that catch real bugs.
* **Relay:** the parts that only move information between chats.

## 2. What the evidence says (git and GitHub, 21–31 Oct)
| Measure | Number | What it means |
|---|---|---|
| Changes made by the Lead (housekeeping, not app code) | 411 of ≈1,000 (41%) | The coordinator is the busiest worker. At a good product company the tech lead makes perhaps 10–15%. |
| Changes that were fixes of earlier work | 297 (≈30%) | High rework. Part of it is real review findings (good). Part of it is redoing handovers and state files. |
| Forms slice 1, from first PR to merge | PR #103 (29 Oct), replaced by #109, replaced by #112, still open 31 Oct | One item took three PRs and over two days. Each relay hop waited for a person or a chat. |
| Words of rules, skills and per-lane notes | ≈20,000 (rules 5.7k, skills 5.9k, lane notes 8.3k) | That's about one novella that every session re-reads before it works. |
| Lists of "what to do next" | 5 (WAVE-1, BACKLOG, SCREENS, REQUESTS, LEAD held items) plus 6 lane files | Nobody can see the whole queue in one place. |
| Incidents caused by the setup itself | two Leads at once (30 Oct); disk full from parallel copies; lanes idle overnight waiting for a relay | The setup's own failure modes. |

**What clearly works (bugs found before you saw them):**
* **Money.** QA-90, QA-99 and QA-100 (live AI spending without approval) were found by qa and the reviewer.
* **Permissions.** DV-bb-9 (anyone could withdraw a proposal) was found by Devin.
* **Reviews.** The reviewer blocked forms P-179 at 6/10 with three real Majors.
* **Guards in code.** The push guard, the merge guard and the live-AI-off guard have stopped wrong actions every day.

**Verdict:** the quality engine is strong, and better than most real teams. The coordination around it is not best in class. It is the main reason we are slow, and it has caused incidents of its own.

## 3. How a large tech company would do it (and what we copy)
1. **One backlog, small changes.** One ordered list. Each item states its acceptance checks and takes under a day.
2. **Process lives in tools, not documents.** The gate is CI plus code review (branch protection). Nobody writes a handover; the pull request describes the change.
3. **Playbooks are short and repeatable.** A skill is "how we do X", reused unchanged. It is not a record of every past decision.
4. **Design docs only for big or new things.** Fixes and backend work go straight to a PR.
5. **Independent review on every change: approve or block.** Formal scoring only at milestones and launches.
6. **Measure a few numbers weekly; change one thing at a time.**

## 4. Part by part: keep, change or remove
| Part | What it does | Decision | Why |
|---|---|---|---|
| `immigration-structure`, `grilling`, `screen-concept`, `screen-challenge`, `screen-build`, `journey-test` skills | how to design, challenge, build and test a screen | **Keep unchanged** | Repeatable quality playbooks, exactly what good teams have. |
| Reviewer, breaker and designer agents | independent review and break-it testing | **Keep** | They find the bugs. |
| `screen-review` skill | 20-dimension score out of 10 on every change | **Change:** approve/block with findings on each change; full score at milestones | The same checks, without writing a 20-line score sheet on every fix. |
| `qa` skill | tests main like a person | **Keep the method; remove the lane-file plumbing** (≈30% of it) | The testing is the value; the relay steps are not. |
| Guards (push, merge, live AI off, spend ledger, no-`any` count) | stop wrong actions in code | **Keep all** | Cheap, automatic, proven. |
| `next` skill (981 words) and `lead` skill (1,140 words) | six stages, lane files, "Paste to Lead" relay | **Rewrite short (≈250 words each)** | They are the relay. Builder: take the next item, branch, build, test, open the PR. Lead: order the backlog, merge on green plus approval, update one status page. |
| WORKFLOW, LANES, CHARTER, RETRO, QUALITY | rules about the relay | **Replace with the one approved page** | Git keeps every word. |
| Lane files (`lanes/*.md`, 8.3k words) | each lane's handover and stage | **Stop; each open item moves into the backlog first** | The PR and the backlog row carry this instead. |
| WAVE-1, SCREENS, REQUESTS, LEAD held items | separate work lists | **Join into one `BACKLOG.md` (Now, Next, Later)** | One queue. Every open item copied over and checked off before the old lists go. |
| Stop hook | forces a state-file update on every reply | **Keep the code checks; drop the state-file demand** | That demand is why the Lead made 411 commits. |
| Word-for-word history moves, size limits on records | keep files small | **Stop (P-188)** | Git history is the archive. |
| `PRODUCT`, `STANDARDS`, `EXPERIENCE`, `DECISIONS`, `ASSUMPTIONS`, `qa/BUGS`, `qa/CAPABILITIES`, `screens/*`, `domain/`, `design/` | what we build, and the bar | **Keep** | This is the product knowledge. |

Result:
* Skills: about 5,900 → 4,300 words. Every quality playbook stays.
* Rules: 5,700 → about 1,000 words.
* Lane notes: 8,300 → 0.
* Work lists: 5 → 1.

## 5. Pros and cons
**Pros**
* Builders go from item to PR without waiting for a relay, so we should see days per item turn into hours.
* The Lead's share of changes falls from 41% to about 15%, so the coordinator stops being the bottleneck.
* Cloud builders become possible (P-82, P-188), and the Mac is no longer the only machine.
* Fewer setup incidents: no lane files to fall out of step, and one queue to read.
* You get fewer, clearer messages.

**Cons and risks, each with a guard**
| Risk | Guard |
|---|---|
| An open item or lesson held only in a lane file or a work list is lost | Phase 1 copies every open item into the backlog, with a check of old list against new. Nothing is removed until that check passes. |
| Review gets softer without the score | The same checks run, the reviewer must still approve, and the full score stays at every milestone. |
| A slimmed skill loses a hard-won rule (money, focus, citations) | Only `next` and `lead` are rewritten. Every rule in them that protects quality moves to the new page or to the playbook skills, never into the bin. |
| Disruption while work is in flight | Running lanes finish on the old way. New items start on the new way. |
| It does not actually get faster | Week-one numbers below. Any part that gets worse is restored from git. |

## 6. The plan (four phases, a check before each next one)
| Phase | What | Effort | Check before moving on |
|---|---|---|---|
| 1. One queue | Build `BACKLOG.md` Now/Next/Later from WAVE-1, SCREENS, REQUESTS, the LEAD held items and every lane's next step; each row with owner area and acceptance checks | half a day | Every open item in the old lists appears in the new one (a checked list in the PR); the founder glances at "Now" |
| 2. Relay off | Rewrite `next` and `lead` short; the stop hook keeps only its code checks; the approved page comes into force; old rules files and lane files leave the tree (git keeps them) | half a day | One small item (N2: an unused Continue must not block a retry) goes from backlog to merged on the new path, with review and qa |
| 3. Review and qa | Approve/block per change in `screen-review`; plumbing out of `qa` | 2 hours | The next reviewed PR shows the same findings depth |
| 4. Run and measure | Builders in cloud sessions from main; one week | 1 week | Numbers below |

**Week-one numbers (shown on demand):**
* Median time from start to merge (target under 1 day).
* The Lead's share of changes (target under 15%).
* Bugs found after merge (must not rise).
* AI spend (US$0 unless you approve).

If bugs after merge rise, the part responsible goes back.

## 7. What stays exactly as it is
* Design before build for new screens, including your early look.
* The independent reviewer and breaker on every change, and qa after every merge.
* Devin weekly.
* Official-source citations.
* Live AI off.
* No personal names.
* The push guard.
