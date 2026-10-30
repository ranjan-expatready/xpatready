# Devin D4 — capability gap check before the M2 gate

Devin (outside reviewer, report only — P-146) ran the D4 prompt from `inbox/DEVIN-PROMPTS.md` on `main` `bcd482d3` (PR #102 merged), read-only, US$0: every Works/Partial row of `qa/CAPABILITIES.md` mapped to its naming test via `product/tools/graph.mjs` (`graph.json`), and every decision P-149–P-177 checked for a citing capability row. Findings only; verify each before acting.

**Baseline:** 47 built rows (26 Works, 21 Partial). `graph.mjs` reports G1 0 · G2 0 · G4 0 · G5 0 · G6 0 — every Works row is named by at least one check file. `qa/BUGS.md` was read first: QA-92/93/94/95 (C4.10) and QA-93 (C11.9) are already open and are cited below, not re-issued.

## Findings

**D-1 · Conflict · Major · lane: Lead → screens**
C11.10's row was amended to claim the P-157/P-161/P-176 checklist card — "one derived setup checklist drives the bar, one button, 'Next: …' and Overview", five derived steps, author/expert confirm tiers — but that is board v4, not yet built on `main` (screens lane `claude/screens-board-v4` only just got Go; P-157: steps "agreed by the founder before build"). Every test naming C11.10 checks the older 4-step card (`tests/check_w1_programs_s2.cjs`, `check_qa_am_s3_1029.cjs` 39/39, `check_qa_am_r3_1028.cjs`). Expected: a Works status means the current row text is proven; actual: the row bundles an unbuilt claim under a green status, which will read as done at the M2 gate. Suggested: split the row (cards today vs checklist-driven card) or mark Partial until slice A lands.

**D-2 · Gap · Minor · lane: qa**
C7.1 (Works: "fill an IRCC PDF from case facts; read back equal; signatures intact"). The fill-and-read-back proof lives in suites that never cite C7.1 (`tests/runtime/check_runtime_r1c.cjs`, `check_runtime_r1d.ts`, `check_studio_browser.cjs` contain the read-back/intact assertions); the only check naming C7.1 is one step in `tests/qa/check_qa_explore_1025.cjs` (an Online line is not offered as a PDF copy). The claim is tested but the id is untraceable — a gate reviewer cannot find the proving suite from the row. Suggested: name C7.1 in the fill read-back suite(s).

**D-3 · Gap · Minor · lane: qa**
C3.10 (Works: "every screen and message says form field, shared field and field map"). Its real proof is the 29 Oct wording sweep `tests/qa/check_qa_wording_1029.cjs` (38 pages × 2 widths) — which cites **no** C-id. The only naming test is `check_qa_explore_1025.cjs` QA-39 steps covering two pages. Same class as D-2: proof exists, id untraced.

**D-4 · Gap · Minor · lane: qa / forms**
C3.9 (Partial, parked): no test file names it at all (G5 only guards Works rows). Its evidence cites "the builders' fake-launcher suite" — `tests/check_ai_launch_paths.ts` — which names only C11.8. Lowest weight of the batch (parked with the extension, P-102), noted for completeness.

**D-5 · Gap · Minor · lane: qa / runtime**
C6.2 (Works: client answers on a family link, "one group at a time, save and resume; each fact asked once"). The replayable coverage is API-level only (`tests/qa/check_qa_r1a_probe.ts`: answers, duplicates, stale versions). The person-facing half — grouped sections, keyboard-only at 390 px, 200% zoom — was a manual explore walk (25 Oct) with no committed browser check naming C6.2. Suggested: one `check_qa_*_browser.cjs` for the client answering journey.

**D-6 · Gap · Minor · lane: qa**
C1.1 (Works): the claims proven were "every combination by workspace, five-part trail, alphabetical order" (design D walk; QA-49). The checks naming C1.1 (`tests/check_screen01_smallfix.cjs`, `tests/qa/check_qa22_author_flash.cjs`) cover only QA-22's session flash, not the trail/ordering claim.

**D-7 · Gap · Minor · lane: Lead → forms**
P-150's six Wave-1 masters (edition attributes, form-line country variant, shared code lists, per-field length limits, signature value per line, one shared condition record) have no capability row citing P-150 — `BACKLOG.md` B38–B46 cite it only for the W4 "rest" half. Pieces exist scattered (signature value inside C1.6 via P-143; length limits via C3.1/P-162) but no row owns the Wave-1 six, so the M2 gate cannot see them as a unit. Suggested: one capability row for W1-16's masters, or explicit P-150 cites added to the rows that carry the pieces.

**D-8 · Ambiguity · Minor · lane: Lead**
Decisions P-178–P-182 are cited on `main` (`inbox/DEVIN-PROMPTS.md` cites P-182; `STATE.md` log cites P-178–P-181) but are absent from `main`'s `DECISIONS.md` (top row is P-176). Presumably recorded on the open Lead branch (`lead/2026-10-30-l10`). Flagging so the records PR lands them — a reader of `main` today hits dangling references.

**D-9 · Gap · Minor · lane: Lead (tooling)**
`graph.mjs` under-reports coverage: it counts only `api(...)` calls in pages and `call("METHOD", …)` in tests, so G3 flagged `POST /combinations/:id/attachments` and `GET /attachments/:id/file` as "no test, no page" while both are exercised — the POST by raw `fetch` in `tests/check_forms_demo.ts:37,57,100`; the file route by `fetch` in `tests/qa/check_qa_am_r69_1028.cjs:53` and by `<a href="/api/attachments/…">` in `web/src/pages/sources.tsx:68,84`. False orphans will keep appearing in gate output until fetch() and href calls are counted.

**D-10 · Ambiguity · Minor · lane: qa**
C4.1 and C4.3 are marked Partial with "Tested on: —" (no commit) — Partial implies something was verified, but no run is recorded (evidence: "Section selection only" / "Coverage preview, not the renderer"). Suggested: record the proving commit, or mark Not tested until walked.

**D-11 · Ambiguity · Minor · lane: Lead → runtime**
P-155 (1)'s representative-review hard block (a P-168 blocker, M3 scope) has no dedicated capability row: P-155 is cited only by C4.10 (answer sources), and the block itself appears inside C7.6's text only via P-168's enumeration. At the M3 gate it could be invisible as its own deliverable. Suggested: a row (or explicit C7.6 cite of P-155) for the review step.

## Checked, no finding

- **Decisions with capability rows:** P-149→C11.14 · P-152→C11.11 · P-154→C4.10 · P-155→C4.10 (see D-11) · P-156→C11.11 · P-157/P-161/P-176→C11.10 (see D-1) · P-158→C3.6, C11.14 · P-162→C3.1 · P-164→C6.9, C6.11, C7.5 · P-168→C7.6 · P-171→C6.4, C6.12, C7.2, C7.7, C11.6 · P-172→C6.4, C7.6 · P-174→C4.10 · P-175→C11.8.
- **Decisions with backlog cover instead (P-74 satisfied):** P-159→B47 · P-160→B48 · P-165→B49 (and `tests/check_stand_ins.ts` exists for the chip↔row check) · P-151→B38–B40 plus C7.6 via P-168 · P-150→B38–B46 (Wave-1 half is D-7).
- **Workflow decisions, no capability expected (artifacts verified):** P-163 (merge-guard tool), P-166/P-167/P-169 (scope rules; `STAND-INS.md` exists with SI rows), P-170 (sourcing method; `screens/W1-baseline/immigration-facts-2026-10-29.md` exists), P-173 (parallel build), P-153 (guard tool `tools/decision-impact.sh` exists and runs).
- **P-177** lives inside the P-176 line by the Lead's recorded choice (commit `de4611e3`); the graph reads only row-start ids — noted, not a finding.
- **Already on BUGS.md:** QA-92 (C4.10 case-fact drawer 404), QA-93 (section Remove without confirm/Undo), QA-94/95; QA-100/99 (live spend) — evidence here adds nothing new.

Method note: run in a worktree on `origin/main` `bcd482d3` (`devin/2026-10-30-capability-gaps`); `graph.json` regenerated there, untracked as designed. No app run needed for D4 — all evidence is file:line.
