# Review: C5.5 firm release gates (Opus re-review of #568, M1 and M2), commit 5bef555d

Reviewer: a fresh context that did not build this. I read `git diff origin/main...5bef555d` (9 files), concept v2 BR-3 and §6b, P-240, P-279, EXPERIENCE, QUALITY, and the G3 review. I ran isolated copies on :4441 only, with live AI off and no priced button.

- Suites: `check_g2_answer_key_gate_firm.ts` **21/21**, `check_g2_answer_key_gate.ts` (demo) **74/74** and `check_g1_sources_api.ts` (restarts as firm) **55/55**.
- Browser walk in a firm copy: the Visitor visa was loaded in demo, the copy was switched to firm, and `setup_visitor_visa.ts` was run. That script's own release step is now refused in firm, as intended (7/13).
- Graph: `graph.mjs --check` shows 0 hard gaps.
- Journey score: **7/10** (`journey-test-reviewer-2026-11-03.md`).

## Verdict: Ship after fixes. Journey 7/10

**Verdict: Block** on 5bef555d. One Major is open (MJ1). It is a one-line fix plus one check.

## What holds
- **M1 is fixed.** In firm, `POST /demo/load` (with no body and with `six`) and `reset-to-six` answer 409 "This demo control works only in the demo workspace." They write nothing: program_def/combination/config_release/pack_version counts stay 51/6/1/1. The UI shows the same words after Demo › Reset to the six. The guard runs after `need(author)` (`demo.ts:77`, `:119`). If either guard is removed, the M1 fail step fails.
- **M2 server side is fixed.** In firm, Submit returns 400 and Approve returns 409 with the shared refusal and the count sentence "3 items are Sample content…". Each item is named in errors[] and on Review and release (screenshot 09). Once the content is replaced, the release goes through and `/releases` and the combination page say `demo:false`. `realBaseline` treats every firm release as real.
- **Refusal order is right.** At approve and in `releaseRows`, the draft's own problems (now including Sample content) are refused first, then review and self-approval, then the tests run (`studio.ts:1024-1046`, `:1085-1095`). This matches concept §2 and reviewer m2. The fail step proves that the Sample line, not the stale submission, refuses the release.
- **Dropping `label` from errors[] breaks nothing.** `problemWords` keeps the label inside `message` (`refusal.ts:33`). No page reads `errors[].label` from submit or approve (`review.tsx:37-39` shows `detail`). In demo the new gate never fires, so the demo refusals are unchanged. G1's firm step filters by `gate`, still passes 55/55, and only gains a second count sentence.
- **Gating the Sample combination is right.** P-240 says "Sample content", and BR-3 defines Demo as "a Sample combination or a Sample check". `isDemoSnapshot` reads `source_basis ILLUSTRATIVE`. Without this gate, a firm release could freeze a snapshot that BR-3 calls Demo, which is the contradiction M2 was about. Sample sources are not listed twice: they stay the G1 line, as the comment at `validate.ts:276` says.

## Issues

**MJ1, Major (Must): the Review and release page still says "Demo release" outside the demo workspace.**
`web/src/pages/review.tsx:110` shows the `data-demo-release` "Demo release" pill beside Approve and release whenever `combination.source_basis === "ILLUSTRATIVE"`. It ignores the workspace (and Sample checks). In firm (screenshots 02 and 09), the same page lists "'Visitor visa' is a Sample combination … A real release needs a source-backed combination", the answer-key block says "A real release needs…", and the pill beside Approve says "Demo release".
- This breaks BR-3 ("Demo = the demo workspace **and** isDemoSnapshot(draft), the same derivation as the page's flag (m9)").
- It also contradicts the build note `qa/built/C5.5.md` ("never 'Demo release' outside the demo workspace").
- It is the M2 label defect again, on the page every refusal sends the user to.
- **Fix:** use `v.draft.answer_keys.demo`, which is `demoRelease(snapshot)` and already workspace-aware.
- **Fail test to add:** in `check_g2_answer_key_gate_firm.ts` (or a browser step), open `/c/<vv>/review` in firm and assert there is no `[data-demo-release]`. In demo, the Visitor visa still shows it.

**m1, Minor (Should; separate row, outside this Done-when): two demo controls still write in firm.**
- **Plain Reset.** `demo.ts:513` `reset()` and `wipe()` empty a firm workspace, including its real releases and its activity log. Nothing is released, so this is not M1's bypass, but it is destructive outside the demo.
- **forms-story.** `POST /demo/forms-story` (`forms.ts:407`, `forms-demo.ts:33`) writes Sample intake files. It also records the held-copy decision as the reviewer (`decideHeld(REVIEWER…)`), so a second-person approval is recorded in firm with no person acting (P-80). This content cannot reach a real release today, because a firm Visitor visa is a Sample combination and this PR's gate refuses it.
- **Fix:** add the same `DEMO_ONLY` 409 to both, and add one fail step each in the firm suite (409 and no rows changed).

**m2, Minor (Should; tech lead to decide, not new scope here): in firm, Sample content is a dead end on the product's own screens.**
- Every node made on Structure is created `ILLUSTRATIVE` (`structure.ts:123`, `:184`), and a combination inherits it (`studio.ts:237`).
- No screen changes a combination's basis or a check's source quote. The only check form is the API.
- So, from this PR on, nothing configured in a firm workspace can ever be released. The new lines carry no Fix link (EXPERIENCE §4 "needs work … linked"), and the suite's "replaced" path is SQL scaffolding (`check_g2_answer_key_gate_firm.ts:103-104`, labelled P-33).
- This is not blocking, because concept §6b lists "the non-demo isolated copy" as scaffolding. **Record it** in `challenge.md` or a backlog row: a source-backed Add, or a basis change with a source (P-252 step 3).

**m3, Minor (Should): firm wiring that no test proves.**
- `programs.ts:204` (the catalogue and Release page hold the row on Sample content).
- `programs.ts:446` (`demoIds` empty in firm).
- `releaseRows` in firm.
- `POST /demo/release-with-sources` in firm (graph G3: "no test reaches"). The build note says all demo controls refuse.
- If the `programs.ts` line is removed, no suite fails.
- **Fail tests to add (firm):**
  - `GET` the shared draft: the Visitor visa row is `held`, its `why` is set, and `demo:false`.
  - `POST /pack/release`: the row is not released and `config_release` is unchanged.
  - `POST /demo/release-with-sources`: 409 with the demo-only words.

**m4, Minor (Should): firm chrome still says "demo".**
- `App.tsx:71` header: "Prototype · demo workspace".
- `App.tsx:217-221`: the Demo menu offers Load sample, Reset to the six and Start With an LMIA, which all answer 409 in firm.
- No page reads `session.workspace.demo`. Disable the demo-only items, saying why, when it is false.

**m5, Minor (Should): jargon in the new line.** "A real release needs a source-backed combination" (`validate.ts:282`). The page itself keeps "source-backed" out of the subtitle (`combination.tsx:92`, SC-5). Say instead: "…needs a combination checked against its official sources".

## D1–D20 (1–5)
D1 4: BR-3 and P-240 are enforced on the server; MJ1 is the page flag. · D2 5: the 409s write nothing (counts checked); refusals are named and atomic. · D3 4: one engine function shared by `problems()` and `draftProblems`. · D4 4: Sample lines only on a draft that will be submitted (`open`, `changes>0||!rel`). · D5 4: the copy switches and restarts cleanly; the 409s keep the load claim free. · D6 4: audit unchanged; the refusal names each item. · D7 n/a: no AI. · D8 4: path and tab unchanged. · D9 3: the next step is clear in words but has no link and no screen (m2). · D10 3: plain count sentence; "source-backed" (m5); "demo workspace" header in firm (m4). · D11 3: Submit is disabled with "Fix the problems first", but the pill contradicts the refusal (MJ1). · D12 4: team components; the lines sit in the existing list. · D13 5: axe 0 violations; no sideways scroll at 400 and 1024 px. · D14 4: no new look. · D15 4: Review in 0.78 s; one extra pure pass per snapshot, no extra query. · D16 4: fail and pass for M1 and M2 at Submit and approve; `programs.ts`, `releaseRows` and release-with-sources are untested (m3). · D17 simulated only. · D18 4: Sample is marked and named per item. · D19 3: a firm release is reachable only through SQL scaffolding (m2). · D20 simulated only.

## Could not check
- A real screen reader, 200 % browser zoom (1024 and 400 px widths stood in), and an intended user's unaided walk (D17, D20).
- Plain Reset in firm was read in code, not run.
- Other sessions' suites run in this worktree on :4446 and :4449: the tracked screenshots and stub-run files they rewrite are not mine and I left them as they were.

**Verdict: Block** on 5bef555d. Fix to approve: MJ1 (`review.tsx:110` reads `v.draft.answer_keys.demo`, plus the firm fail step). The Minors m1–m5 can follow as rows.

## Round 2: 9e76fc44, diff only (`git diff 5bef555d..9e76fc44`)

**What I ran.** I rebuilt the web bundle and used fresh copies on :4441 only, with live AI off.
- `check_g2_answer_key_gate_firm.ts`: **27/27**. This includes the browser step, which shows the Demo release mark in demo and no mark in firm.
- `check_g2_answer_key_gate.ts` (demo): **74/74**.
- I did not re-run G1 in this round. Its firm step filters by `gate` and is not affected by the removed line.

**Closed:**
- **MJ1 is closed.** `review.tsx:110` now reads `v.draft.answer_keys.demo`, the server's `demoRelease(draft)`, which is BR-3 m9's single derivation. In demo the pill now also shows for a Sample check or a Sample source, which fixes G3's live-row gap. There is a browser fail and pass test for it.
- **m1 is closed.** Plain Reset (`demo.ts:515`) and the forms story (`forms-demo.ts:36`) answer 409 outside demo, and the guard comes after `need(author)`. The test proves that counts and audit rows are unchanged.
- **m3 is closed.** Start With an LMIA in firm answers 409 and is tested. The Release page now holds the Visitor visa, `held:true` and `demo:false`, with the Sample-check reason, and releases nothing of it. With only that row left, `POST /pack/release` answers 409, and its errors[] keep `gate: "sample-content"` (`programs.ts:493`). If the `programs.ts` hold line is removed, the M2 Release page step fails.
- **m5 is gone** with the combination line.

**The combination basis is no longer gated (breaker F1, Question 1 to the tech lead). I accept this for this PR.**
- In round 1, I judged gating it right on P-240's wording, and I flagged the cost as m2: every name the Structure screens save is ILLUSTRATIVE and nothing changes it, so every firm combination was blocked. The breaker's evidence shows that cost is total.
- The brief's scope was "illustrative checks and Sample sources". The basis is a "not source-verified" default, not a published value, and each value it could carry is gated: numbers by G1, checks here.
- BR-3 still holds: every firm release is real and labelled real.
- The change is raised in the PR, not made silently. It stays an open product question for the tech lead (P-240's "Sample content" against Structure's default basis), not a defect here.
- **Minor:** a released firm combination still says "Sample" in its subtitle and basis note (`combination.tsx:92`, `:108`). This existed before and goes with Question 1.

**Still open, Minor only:**
- m4: the header says "Prototype · demo workspace" and the Demo menu items are offered in firm (`App.tsx:71`, `:217-221`); each now answers 409 with plain words.
- m2 reduced: a Sample check still has no screen to add its source quote (the check form exists only in the API). That needs a row, not a fix here.

**Verdict: Approve** on 9e76fc44. No Blocker or Major is open. Journey score 8/10 on re-score: feedback and state, and trust and sources, now score 1 each (no contradicting pill in firm; every page uses the server's flag); the m2 and m4 criteria stay at ½.
