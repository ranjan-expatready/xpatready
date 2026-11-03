# Break report: C5.5, firm releases never skip the gates or carry Sample content

Commit 5bef555d (branch `claude/screens-c5-5-firm-release-gates`), 3 Nov 2026. I tested two isolated copies, `brk_c55a` on :4447 and `brk_c55b` on :4448. Each loaded in demo, then I renamed the workspace demo→firm with SQL and restarted it with `STUDIO_WORKSPACE_KEY=firm`, as `tests/check_g2_answer_key_gate_firm.ts` does. Live AI stayed off (US$0). Both copies are stopped.

## Findings

**F1 (Blocker): a combination made on the screens in a firm workspace can never be released.**
- Steps (firm): `POST /structure/path` with a new pathway, program and category (`decision:"add_anyway"`), then `POST /combinations {nodeKey}`, then `POST /combinations/:id/submit`.
- Expected: a combination made on the screens can reach a real release once its content is sourced.
- Actual: every new node is saved with `source_basis = ILLUSTRATIVE`. This is hard-coded at `api/src/structure.ts:123` and `:184`. `programs.ts:536` passes no basis, so `studio.ts:237` copies the node's ILLUSTRATIVE onto the combination.
- Submit then answers 400 `sample-content`: `"Narwhal firm category" is a Sample combination … A real release needs a source-backed combination.`
- No route sets a combination's basis to source-backed. The only writer is the demo-only `demo.ts:165`. The C5.5 suite itself uses SQL for this ("no screen edits a check or a combination's basis yet").
- Result: outside the demo workspace, nothing set up through the screens can ever release. The refusal tells the person to do something the product does not let them do.

**F2 (Major): the Review and release page shows a "Demo release" pill in a firm workspace, and the header says "demo workspace".**
- Steps: firm copy, open `/c/<Narwhal>/review`.
- Expected: no Demo release label outside demo (BR-3; GET /releases and GET /combinations/:id already say `demo:false`).
- Actual:
  - A `[data-demo-release]` "Demo release" pill sits next to "Approve and release" (`web/src/pages/review.tsx:110`). It is shown for any ILLUSTRATIVE combination, in any workspace.
  - The same page lists the error "Sample content releases only in the demo workspace".
  - The header pill "Prototype · demo workspace" is hard-coded (`web/src/App.tsx:71`).
  - The Demo menu still offers Load sample and Reset to the six. Both then answer 409.
- Screenshot: `firm-review-narwhal.png` (the breaker's scratchpad, not committed).

**F3 (Major): Demo › Reset to blank (`POST /demo/reset`) still runs outside the demo workspace and deletes real releases.**
- Steps (firm, 1 config_release and 1 pack_version present): `POST /demo/reset {"confirm":"RESET"}` as user-A.
- Expected: a demo control refuses (409) outside demo, as load, reset-to-six and release-with-sources now do. At the least, it never deletes a real release.
- Actual: 201, `removed_rows:1440`. The counts went from 54 programs / 7 combinations / 1 release / 1 pack to 0/0/0/0. The audit log reads "Configuration author reset the demo".
- One author, no second person (`api/src/demo.ts:513`, no `isDemoWorkspace()` check). The firm UI still offers it in the Demo menu.

**F4 (Major): `POST /demo/forms-story` runs in a firm workspace and records a second-person decision nobody made.**
- Steps (firm): `POST /demo/forms-story {"combinationId":<Visitor visa>}` as user-A.
- Expected: 409, demo only, like the other demo controls.
- Actual: 201. It held an "off-list copy" of IMM 5409 and recorded "Content reviewer rejected IMM 5409 (01-2023) … Sample: …" under actor **user-C**, who never acted.
- When the library lacks the edition, the same code approves the held file into the firm library as user-C (`api/src/forms-demo.ts:69-70`; no workspace check at `:33`). That is a forged four-eyes (P-80) decision in a real workspace. It also starts a checklist-drafting stub job.

**F5 (Minor, but it reverses reviewer m1 outside demo): a Demo release now counts as the answer-key baseline in firm, so maps that were never tested reach a real release.**
- Steps:
  - Copy B in demo: run `setup_visitor_visa.ts`. This gives a Demo release v1 whose summary has IMM 5257 and IMM 5707 as `no_test`.
  - Switch to firm.
  - Apply the C5.5 suite's own scaffolding SQL: combination set to SOURCE_BACKED, checks given quotes.
  - Add a quoted check, cite its number, submit, have user-C sign off, then `POST /approve` as user-B.
- Expected: a real release needs a signed, passing key for every map not carried by a *real* release. A Demo release proves nothing (reviewer m1).
- Actual:
  - Both maps read `result:"untested_released", gated:false`.
  - Approve answered 201 and wrote release v2 with `answer_keys: []`.
  - Cause: `realBaseline` (`api/src/answer-key-gate.ts:37`) now counts any release outside demo as real.
- Reachable today only with data carried over from demo (the documented test pattern), or with Sample releases a firm workspace made before C5.5.
- Related: that v1 release still reads `demo:false` on GET /releases and on the combination page, while its own basis text says "Illustrative combination: not source-verified". It is counted as a real release on History.

**F6 (Minor): on the Release page route, errors[] carries no `gate` field.**
- Steps (firm): a held row with a Sample check (and a G1 no-source number), then `POST /pack/release {"expectedChanges":1}` as user-B.
- Expected: per C5.5, each Sample item appears in errors[] with `gate:"sample-content"`.
- Actual: 409 `every-change-is-held-back`. All 18 errors[] entries have `gate` missing, for both `sample-content` and `no-source`, and there is no count sentence. Cause: `programs.ts:487-493` rebuilds the error objects without `gate`.
- The gate is only tagged when the internal `releaseRows` refuses. On this route `releaseRows` is called only for rows that are not held, so the Release page never shows the tag. Items are still named in `message`.

**F7 (Minor): the Sample combination's errors[] entry has `item: ""`.**
- It has `where:"Release"` and is named only inside `message` (`engine/validate.ts:283`). The checks are named by key.

**F8 (Minor): any non-empty `sourceQuote` makes a check "official", so the sample-content gate can be skipped with one keystroke.**
- `POST /combinations/:id/checks` with `sourceQuote` set to `"."`, to `"Sample"`, or to 5,000 characters saves `illustrative:false`, and the gate no longer lists the check.
- Cause: `studio.ts:883` sets `illustrative: !quote`, with no URL, page or date. G1 asks for all three for numbers.
- The SME sign-off is the only backstop.

## What held

- **Firm, demo controls:** `POST /demo/load` with no body, `{"sample":"six"}`, `"configured"`, `"x"` or `[]` answers 409 "This demo control works only in the demo workspace."
  - The same 409 comes from `reset-to-six` (`{"confirm":"RESET"}` or `{}`), `release-with-sources` and `POST /combinations/:id/sources/sample`.
  - Row counts (program_def, combination, config_release, pack_version and audit_event) were unchanged across every call.
- **Role order:** user-B and user-C get 403 before the 409, so nothing leaks. No actor or an unknown actor gets 401. A non-JSON reset-to-six gets 415 before the role check (this was already so). Approve, releaseRows and pack/release call `need(...)` first (`studio.ts:1017`, `:1078`, `programs.ts:470`).
- **Submit:** refused 400 with `gate:"sample-content"` for both the Sample combination and a Sample check. The draft problems on GET /combinations/:id list the same items, and `answer_keys.demo` is false.
- **Release page:** a Sample row in firm reads `demo:false` and is held, with the Sample check named in errors[] messages.
- **Labels:** in firm, GET /releases and GET /combinations/:id agree (`demo:false`). In demo, a Visitor visa Sample release still reads `demo:true` on both. The fixture's "With an LMIA" release reads `demo:false` in both workspaces.
- **Demo workspace unchanged:** `setup_visitor_visa.ts` passes 13/13 and still makes a Demo release. Load sample "six", Reset to the six and Start With an LMIA (release-with-sources, 201) all work.
- **Races (demo):**
  - Reset-to-six, Load six and plain Reset fired together: only reset-to-six ran (201); the other two got 409, ending with 6 combinations and 0 releases.
  - Two Load "six" at once: one 201, one 409, ending with 6 combinations.
- **Not attacked here:** I did not test Load or Reset during a release, or 100 programs / 400 combinations. C5.5 adds no query in firm, because `demoIds` is skipped there.
