# Why we chose what we chose (31 Oct) — for the founder's walkthrough

The tech lead walks the founder through this at the start of the next session. Every choice stays open: if the numbers show it is wrong, it changes. **Evidence** = measured by us, or a published primary source; **Judgement** = reasoned, not yet measured.

## 1. Simpler rules, the same checking (P-188)
* **Problem:** in 10 days, 41% of all changes were the Lead's record-keeping, and 713 of 1,044 commits touched only notes. Every session read about 20,000 words of rules. (Evidence: git history.)
* **Choice:** keep everything that catches bugs (reviewer, breaker, qa, Devin, the money guards, official sources); remove the handover relay.
* **Why not keep the old way:** the relay caught no bugs. The bugs were found by the reviewer, qa and Devin.

## 2. Pull requests merge by themselves (P-189)
* **Problem:** about 7,500 lines of finished code waited 36 hours for a person to merge them. (Evidence.)
* **Choice:** a PR merges when its checks are green and the reviewer agent has approved its exact current code.
* **Why:** Cursor found that a central integrator "created more bottlenecks than it solved". (Evidence, vendor-reported.)
* **Not proven yet:** no PR has auto-merged so far.

## 3. Builders in the cloud; the Mac for the Lead, the demo and evidence
* **Problem:** builders on the Mac filled the disk twice and made timing tests flaky. (Evidence.)
* **Choice:** each builder gets its own cloud machine. The Mac keeps the chat, the demo (:4400), the nightly tests and the evidence work (the official files are only there).

## 4. Fast PR checks on GitHub, the full set nightly on the Mac (P-190)
* **Evidence:** 46 runs on GitHub's 2-core machine averaged 25 min with no wait. 8 runs on the Mac averaged 44 min, plus a 15 min wait.
* **Choice:** each PR runs only the tests its change can affect, on GitHub's machines, at about US$0.02–0.05 a check, within your US$10 budget. The full set runs nightly on the Mac: free, and it has all night.
* **Why this method:** Meta runs about a third of the affected tests and catches over 99.9% of regressions. (Evidence: their engineering blog.) Ours is a simpler version, so the nightly run is the safety net.
* **Dropped, with reasons:**
  * parallel tests on the Mac: 8 GB of memory, and the 30 Oct trial broke 12 suites;
  * a merge queue: one more moving part;
  * the nightly run on GitHub: overnight speed doesn't matter;
  * a hosted demo: new technology, and you keep the Mac on.

## 5. Feature by feature, not part by part (P-191)
* **Problem:** builders were split by part of the system (screens, forms, runtime). One feature needed all three, so they waited on each other: "Before forms" waited on forms PR #112, and two builders edited the same files. (Evidence.)
* **What a "feature team" is:** one builder finishes a whole feature (screen, backend and tests) that a person can use. The Large-Scale Scrum guide warns that teams split by component create "many queues… high levels of WIP, many handoffs". (Evidence: less.works.)
* **Choice:** regroup the backlog into features in your users' order: Super Admin setup, then case officer, then client. Each feature is done when you can do it on the demo.
* **Judgement:** shared files (the database schema, the contracts) still need one owner at a time, so two features that both change the schema don't run at the same time.

## 6. The five steps for every ask (in the way of working)
* **Problem:** I answered a test-speed question from one run; all 54 runs reversed the answer. (Evidence.)
* **Choice:** restate the ask, choose the evidence before answering, challenge it, recommend, and act only on agreement.

## Still to prove, measured in the first week
* Auto-merge works end to end.
* A small PR's check takes about 5–10 minutes.
* The nightly run finds almost nothing the PR checks missed.
* Feature work cuts waiting between builders.
