# Review: QA-82, unwritten questions show the field's short name (PR #469, branch claude/screens-qa82-question-words)

Reviewed commit: **f995d29d** (`git diff origin/main...f995d29d`, base 21d988b7). Reviewer, fresh context. US$0, no `*_LIVE`.

**Verdict: Block (Rework).** The Questions tab part is good. The engine change, though, also reaches the client's questionnaire. There it takes away the only text that said what a yes/no background question covers, and it breaks an existing runtime suite that the builder did not run.

## How I ran it
- The shared clone at /home/user/xpatready was switched to another branch (`claude/screens-g3-demo-release`, 07:27) while I worked. My first r1c run used that tree, so I discarded its result (125/125 on the base, which still counts as base evidence). Every result below comes from a detached worktree at f995d29d (scratchpad `wt/`) with its own `vite build`. Copies ran on 4442 and 4449. The builder's copy took 4441 during my run.
- f995d29d: check_c41_questionnaire_roles **9/9**. With main's `render.ts` and `questionnaires.ts` swapped in it gives **6/9**: all three QA-82 steps fail, so they really test the rule. check_engine **43/43** · check_case_engine **61/61** · setup_visitor_visa 13/13 · **check_runtime_r1c 14/15, stopped at step 15** (base: 125/125).
- My own Playwright walk (journey-test-reviewer-qa82-2026-11-02.md): Questions tab, Details, keyboard, approver, Preview, axe, 400/1024/1440 px.
- I read the client's questionnaire API (`/runtime/cases/:id/questionnaire`, Visitor visa, client mode) for all 188 questions.

## Every consumer of the render question `label` (asked for)
| Consumer | Uses label for | Effect of the change |
|---|---|---|
| `engine/runtime/case.ts:292` → client questionnaire `web/src/runtime/questionnaire.tsx:138` (input label / legend) | what the client reads | **B1 below** |
| `case.ts:319` missing list, `:338/:340` error summary | names in "Check these answers" | short names; fine for the officer, terse for the client |
| `case.ts:277` `from_documents` facts (dedupe by label) | "Passport fills …" list | no collisions: every factName in the c1 draft (186 keys) and in the VV client view is unique per person |
| `runtime/preview.ts:129` (dedupe), `:140` (agent set) | Preview sets | same as above, no collisions found |
| `render.ts:347` sort | tie-break only, after placement order | order is unchanged wherever placement order exists |
| `runtime/questionnaires.ts:53` | `wording` fallback, `meaning` fallback | Questions tab is correct; `asked` is passed |
| `web/src/pages/preview.tsx:91,98` | Preview "Question" column | short names, with the mono key underneath; no "No question written yet" shown (correct) |
| AI prompts, PDF fill, answer sheets | none read `render().questions[].label` (grep of api/src, engine, p2) | no effect |
`render.ts:322-323` still quote `question_text || meaning` inside "whether … is asked" reasons. On the wp.family sample none of these fire, so it is noted only.

## Findings, ranked

**B1 (Blocker, Must). The client now answers background and admissibility questions from a 2–3 word key name, and the definition is shown nowhere to the client.**
- `engine/render.ts:327` replaces the label for every consumer, the client runtime included (`case.ts:292`).
- `questionnaire.tsx` shows `meaning` only for declarations (line 161).
- On the Visitor visa case the client now sees these as the whole question, with no hint text:
  - "Disorder requiring services"
  - "Status violation canada"
  - "Violent organisation association"
  - "Criminal history"
  - "Refused visa or entry"
  - "Accompanies subject to canada"
  - "Has children"
  - "Military service"
- Before, the client read "Whether the person ever committed, was arrested for, charged with or convicted of a criminal offence …".
- The new labels drop the legal scope of the question (arrested / charged / convicted, social or health services, without authorization). A wrong answer here becomes a misrepresentation on the filed form. They also break PRODUCT §4 plain words: lower-case "canada", the internal word "subject", and noun phrases asked as yes/no.
- QA-82 asked for the definition to move "under Details only", not to disappear.

**Fix (in scope, no new feature):** keep `asked` on the case view too. For an unwritten question in the client's questionnaire, either keep showing the meaning (as on main) or show the short name with the meaning as the hint under it (the existing help/note slot). The officer view and the Questions tab may keep the short name. Add a fail test: a client-mode question with `asked:false` carries its meaning to the page.

**M1 (Major, Must). An existing runtime browser suite fails on this commit; the builder ran r1a and r1d from the same runtime group but not r1c.**
- `tests/runtime/check_runtime_r1c.cjs:103` waits for the group "Official language", which is now "Service language". It times out, and 110 steps never run.
- `:204` (`/ever committed, was arrested/`) would fail next.
- `tests/qa/check_qa_r1c_walk.cjs:111` has the same selector.
- `select-suites.mjs:29` puts r1c in RUNTIME_GROUP, so CI on this PR runs it (`run-suites.sh:210`).

**Fix:** with B1's fix, the client keeps the definition and these selectors pass. Otherwise update both suites to the new words and say why in the PR. Then run r1c, r1d and r1a on the head.

**S1 (Should). On the Questions tab the author loses the definition entirely.** Details (`sources.tsx:159`) titles the panel with `wording` and never shows `meaning`. On the tab, an author reading "Subject is principal applicant" cannot see what it means without going to the Shared library. QA-82's fix put the definition under Details. **Fix:** one line with `meaning` in the Details panel, or the mark's tooltip.

**S2 (Should). The "No question written yet" explanation is only in a `title`** (`questionnaires.tsx:393`), so keyboard and touch users never get it. The visible text is enough to pass axe (0 violations). **Fix:** move the sentence into the visible mark or the Details panel. A `title` is not a tooltip by the team's pattern.

**S3 (Should). `factName` is a second copy of `fieldName`** (`web/src/pages/library.tsx:23-24` = `engine/render.ts:166-167`), and both miss "US", "TRV", "TB", "USCIS" and the place-name "Canada" ("Us PR card expiry date", "Requires trv", "Tb history or contact"). **Fix:** one shared helper (`contracts/`), with these abbreviations and proper nouns added.

## D1–D20 (this change only)
D1 Requirement fit 2/4: tab fixed; client loses meaning (B1) · D2 Data 4: contract additive, no writes · D3 Reuse 3: duplicated helper (S3) · D4 Rules 4: conditions untouched, case_engine 61/61 · D5 Stability 4 · D6 Governance n/a · D7 AI n/a · D8 Orientation 4 · D9 Flow 3: author sees what to write, no definition (S1) · D10 Language 2: client-facing key names (B1, S3) · D11 Feedback 4: mark visible to author and approver · D12 Visual 4 · D13 A11y 3: axe 0, keyboard reaches Details, tooltip by hover only (S2) · D14 Team look 4 · D15 Speed 4: tab first view 1.36 s under a busy machine, no new requests · D16 Testability 3: QA-82 steps fail on main (6/9), but no test covers the client view and r1c is red (M1) · D17 simulated only · D18 Provenance 4: "No question written yet" says where the words come from · D19 Closure 2: author → client path regressed · D20 simulated only.

## Retrofit mapping
QA-82 is in BUGS.md (C11.12, C6.x). Wording per placement stays with forms (W1-10). This PR is the screens part (showing it).

## Could not check
A real screen reader; an intended user's unaided walk (D17/D20); the full batch (only the suites above); the client page's look at 200 % zoom (B1 is visible from the API).

## Journey score (reviewer, the one score for this check)
**7/10, fail** (pass needs 8 and no 0). Details: `journey-test-reviewer-qa82-2026-11-02.md`.

**Verdict: Block** on f995d29d. To fix:
1. B1: the client's questionnaire must not lose the field's meaning for an unwritten question (`engine/render.ts:327` → `case.ts:292` → `questionnaire.tsx:138`), plus a fail test on the client view.
2. M1: `check_runtime_r1c.cjs:103,204` and `qa/check_qa_r1c_walk.cjs:111` pass on the head (with 1 they should pass unchanged); run the whole runtime group.
