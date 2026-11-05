# QA-272 review — IMM 5257 immigration-status choices

Reviewer: independent session; did not build the change. Exact commit: **a46fa2a301a38561d802907b7a38fea521f0351c**. Scope: `git diff 1872eeed6897d5a5274c140cddaedafff7ade72d..a46fa2a30` (10 files, +120/-4). No separate concept exists; I tested only the QA-272 fix, not new screen scope. Live AI off, US$0; no priced control used.

**Verdict: Approve.** No Blocker, Major or Minor product finding. **Journey score: 8.5/10 (pass, no criterion at 0)**; see `journey-test-reviewer-2026-11-06.md`.

## Evidence verified

- `engine/options.ts:153-168` turns a numeric range into `Label=code` pairs from the PDF's resolved options, and refuses ambiguous punctuation; `engine/runtime/case.ts:77-79` never exposes a legacy bare range as one choice. `api/src/sources.ts:913-921` applies this when the field map is saved.
- Independent engine/property pack: **76/76, exit 0**, run twice on the exact commit. It covers all nine labels, Citizen acceptance, legacy-range rejection, punctuation and missing-option fallbacks, lowercase answer-list keys, and 100 generated code cases.
- Rule-removal spot-check in a temporary copy: replacing `isCodeRange` with `false` produced **72/76, exit 1**; four QA-272 checks failed and the literal `01..09` choice returned. The tests therefore detect the rule's removal.
- Fresh isolated acceptance log supplied for code commit `17e5f4f72`: **45/45, exit 0**. Lines 38-42 prove the exact nine choices, `01..09` validation, Citizen saved without a problem, ten answers confirmed, and generated request field `CurrentCOR.Row2.Status = 01`; line 43 proves no live AI or ledger change.
- The final commit changes only `build-notes.md` and four screenshots. Its 1440 px walk shows Citizen selected, the confirmed answer, 10 answered/10 confirmed, and a newly Generated IMM 5257 copy with 12 fields written/read back. The request JSON, not the screenshot, proves code `01`.
- `graph.mjs --check`: exit 0 (G1/G2 0); no new page, API or capability needs a graph/retrofit entry. `count-any.mjs --against origin/main`: 418 before/after. `typecheck.mjs`: PASS, no new errors (15 known API; web 0). `git diff --check`: clean.

## Standards and experience [M] check

- Technology and architecture: **met / unchanged**. Existing TypeScript/NestJS/React stack; pure deterministic engine helper; no new technology, schema, migration, worker, endpoint or contract.
- Content and rule integrity: **met**. Labels/codes come from the PDF inventory rather than new production constants; the existing field and map are reused. New and legacy behavior each have passing and failing tests.
- Release/governance and AI: **met / unchanged**. Existing releases stay pinned; a legacy bare range becomes open text rather than a false option. Saved replay still requires review/apply; no live AI.
- Data, concurrency and recovery: **met / unchanged**. No migration or create path changed; existing optimistic answer save, confirmation, idempotent generation and duplicate-load checks remain. Acceptance confirms one updated answer and one new copy, preserving earlier copies.
- API/security: **met / unchanged**. No route or authorization code changed; the integration uses case officer `user-O`, and invalid choice feedback is on the answer. No upload, secrets, personal-data logging or new AI prompt.
- Performance: **not independently measured** for this interaction; no per-row request or web data path changed. Checkpoint load took 48.0 s in the acceptance log, which is setup time, not the status-control response budget.
- Experience: **met for this fix**. The existing case path and dialog use a labelled native select, plain form words, Save/Cancel, confirmed state and the next Generate action. The screenshots retain the team shell and separate simulated-role chrome; no new tabs, statuses, tooltips or demo capability.
- Accessibility/states: **partly evidenced**. Native select, visible focus and the nine-option accessibility reading are recorded; keyboard-only, 1024 px/200% zoom, 400 px, axe and reduced-motion checks were not independently rerun. Empty/long/running/conflict states are unchanged by this engine fix.
- Solution traceability: **met**. QA-272, IMM 5257 (09-2023) field inventory, Sample and “Unconfirmed: no counsel” are named in `build-notes.md`; no new immigration value is guessed in production code.

## D1–D20 (1–5; independent unless maker evidence is named)

- **D1 5:** exact requested list and Citizen→01 behavior are proved by unit and configured integration checks.
- **D2 4:** only listed values validate; no schema/duplicate-risk change. Concurrent status edits were not retested.
- **D3 4:** existing field/map/options are reused; no copied master or duplicate UI logic.
- **D4 4:** range notes no longer resolve as a choice; answer-list keys and existing rule semantics remain intact.
- **D5 4:** reopen/cancel preserves Citizen (maker walk); duplicate checkpoint load is refused. Reload/double-click of this answer were not rerun.
- **D6 4:** release pinning and author/approver flow unchanged; acceptance confirms governance still holds.
- **D7 5:** replay only, human apply retained, no live AI and no spend.
- **D8 4:** Cases context and Client A ownership are visible in the walk.
- **D9 5:** Add/Edit → Save → Confirm section → Generate a new copy is clear in the screenshots.
- **D10 5:** Citizen through Foreign National replace the opaque range; validation names the valid choices.
- **D11 5:** answer problems, Confirmed, section counts and Generated state are visible and tested.
- **D12 4:** existing team dialog, table, chips and actions remain coherent at 1440 px.
- **D13 3:** native labelled control and focus shown; full keyboard/zoom/small-screen/axe evidence is absent here.
- **D14 4:** no visual fork or new terminology; existing team component path retained.
- **D15 3:** no interaction timing against §9; no new request or expensive per-row work.
- **D16 5:** independent repeat packs, fresh acceptance log, property test and mutation spot-check on the reviewed code.
- **D17 simulated only:** maker role walk, not an intended user's unaided walk.
- **D18 4:** the dialog says the answer fills IMM 5257; values derive from the form inventory and remain Sample/legal-unconfirmed.
- **D19 5 for this slice:** configured release → case answer → officer confirmation → generated IMM 5257 request code 01. Adobe Validate remains outside this fix.
- **D20 simulated only:** it removes a demonstrated impossible choice, but no intended-user benefit observation.

## Findings

None. No open Blocker, Major or Minor within QA-272 scope.

## What I could not check

A fresh visible-browser walk (the isolated server was stopped and this sandbox could not reach PostgreSQL port 54329), keyboard-only use, 400/1024 px, 200% zoom, axe, a real screen reader, interaction timing, PDF/Adobe visual inspection, and intended-user D17/D20. I directly read the fresh 45/45 log and maker screenshots rather than claiming those as independent browser observations.

**Verdict: Approve — commit a46fa2a301a38561d802907b7a38fea521f0351c.**
