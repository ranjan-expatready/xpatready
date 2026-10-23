# P5 maker checkpoint, 21 October 2026 (prior maker; read before continuing)

Claude Code (the prior maker session) stopped here at the founder's instruction so the replacement maker (AIW-D277) can continue without collision. Nothing is committed. This is maker self-verification, not independent review. Plain status; details are in the files named.

## Done

| Piece | Where | Evidence |
|---|---|---|
| D30 bookkeeping | `p2/scores/v2/rescore-summary.json` now names configuration `9b5089ef…b010`; layers A–D 20/22, 20/22, 20/22, 22/22 unchanged; spread rerun unchanged | experiments E22, discovery D32, trace `P5-D30` |
| Made-up synthetic documents (8) with the Lead's independent key | `p5/reader/docs/` + `manifest.json` (the reader's allowlist); key `expected/reader-c1.json` (readers never read it); generator `p5/reader/make_docs.ts` | passports (scan, phone photo, unreadable, MRZ-conflict), two job offers (born-digital PDF with a watermark that garbles the text layer; office scan), revised offer (later batch), birth certificate. Do not re-render: PDF hashes change |
| Local reader | `p5/reader/local.ts`, `mrz.ts` | Tesseract 5.5.0 + MRZ check digits at small rotations + label rules + PDF text layer with OCR fallback. Score vs key: exact 63/67, wrong 0, unsupported confident 0, wrong person/meaning 0, kind 10/10, failure cases (unreadable, MRZ conflict, wrong type) 3/3; misses: partner photo place of birth and issue date, two offer numbers (`p5/reader/evidence/comparison-score.json`) |
| AI-vision reader, guarded path (AIW-D271) | `p5/reader/{policy,guard,isolation,request,pathcode,read,launch}.ts`, prompt `prompts/reader.v1.md`, schema `reader-output.v1.schema.json`, profiles `doc-types.json`, job `jobs/reader-c1-comparison.json` | own synthetic allowlist; P2 controls untouched; salted single-use ticket; isolated process (stub run shows no forbidden reads); shared ledger and caps; stub pass before every live run; stops at an account-level refusal |
| **AI comparison: blocked** | runs `p5/reader/runs/*-live-*` | every live call refused by Anthropic: "You have reached your specified API usage limits … 2026-11-01" (AIW-D273; founder chose to raise the Console limit). Refusals unbilled; ledger corrected append-only (`correct_unbilled.py`); committed still US$24.13, US$15.87 left |
| Case engine | `p5/engine.ts`, `p5/transforms.ts` | release-driven checklist, forms, remaining questions, condition inputs; association (name never merges alone), reconciliation (new / agrees / conflict / changed version / unresolved / internal conflict / relationship evidence), staff decisions, history, approval withdrawal; transformation executor with hand route |
| PDF filling | `p5/fill.py` (E5 append-only writer) | read-back, other data unchanged, both IRCC signatures verify, original bytes kept |
| Product shell (first pass) | `p5/server.ts`, `p5/ui/`, reader adapter `p5/reader/adapter.ts` | persona switch (Super Admin read-only release view, agent, consultant, client), lead/duplicate check, mixed uploads, case update review, working view, checklist, questionnaire, inline form review, fill/download, approval, sample-input buttons |
| Browser run in an rsync copy | `p5/check_p5_browser.cjs`; evidence `p5/evidence/browser-run-1/` (screenshots, step log, case, filled PDFs) | **25/25**, 97 clicks, 43 s, local reader (no cached AI reads): duplicate by hash, unreadable return, DOB typo → ambiguous → assign → conflict resolved, wrong person flagged, section confirmation, changed answer (married → common-law changes checklist and IMM 5409), IMM 1295 principal 76/76 and partner 68/68 read back intact with **distinct job/employer values**, IMM 5707 30/30, consultant approval, later batch: unchanged file not re-read, revised offer proposes a change, only the partner's approval withdrawn, new start date reaches the partner's refilled PDF |
| Offline checks | `tests/check_p5_engine.ts` | 29/29; `tsc` passes for p5 and the prototype |

## Not done (carry forward under D274–D277)

1. Rerun the AI-vision comparison once access works: `node p5/reader/launch.ts --job reader-c1-comparison --stub` then `--live` (3 runs for consistency; worst case US$3.54 each), then `node p5/reader/score.ts <run files>`; choose local / ai / hybrid by evidence and record E23. Paid reads only in the real tree (`P5_PAID_READS=1`), never in a copy.
2. D275 configuration MVP (database-backed authoring, add-form AI normalisation, renderer), D274 five sample programs and Reset demo, D276 stack decision (the shell above is plain Node/JSON, demonstration-only; reuse its engine/contracts, not its storage).
3. P6 reuse, P7 updates; experiments/coverage/trace rows for E23–E24 and D33–D39 are recorded in `experiments.md`; coverage statuses not yet promoted.

## Findings to carry (discovery log D33–D39 in experiments.md)

D33 employer/LMIA facts and the job-offer requirement stay principal/case-level after D30 (engine selects the form subject's employer; needs field review). D34 transformations are free text; recommend a closed vocabulary. D35 no question-level follow-up conditions in c1-v3; some condition inputs have no placement. D36 the release does not record which facts a document type supplies. D37 intake must capture family names, else documents stay unassigned. D38 watermarks garble PDF text layers. D39 the ledger counted unbilled refusals at worst case (corrected, D273).

## How to run (from the project root, in a copy for browser checks)

```
export PATH=$PWD/.tools/node-v24.21.0/bin:$PATH
node ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p5/server.ts --port 4319 --reader hybrid   # opens on http://localhost:4319
node ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p5/check_p5_browser.cjs                   # server running, empty p5/case
node ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tests/check_p5_engine.ts
```
