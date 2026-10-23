# Lead check of AI drafting (23 Oct, founder request R-71)

**Question from the founder:** why does AI not work here, why is no useful message shown, why does a simple form take so long, and what is missing or unclear around it.
**How checked:** the shared demo database read-only (`drafting_job`), the four saved live runs in `prototype/p2/runs/`, the spend ledger, `studio/api/src/ai.ts`, `studio/api/src/sources.ts`, `p2/launch.ts`, `p2/prompts/field-map.v1.md`, `p2/prompts/field-map-output.v1.schema.json`, `prototype/contracts/field-map-entry.v0.schema.json`. No model call; US$0.

## What happened (evidence)
Four live "Draft field map" runs for IMM 1344 on :4400 (22 Oct 03:35 and 03:49 UTC; 23 Oct 04:42 and 04:52 UTC). Each one:
* **The AI worked.** Claude Opus 5.5 answered all 233 boxes (attempt outcome "ok"), 59–64 thousand output tokens, **424–469 seconds**, **US$1.48–1.57**; US$6.10 in total.
* **Then the whole answer was thrown away.** One of 233 entries (entry 114) named its fact `person.became_pr_as_sponsored_partner_within_5_years`. The entry contract allows only `^[a-z_]+\.[a-z_]+$` (no digits), so `contract_valid` = false and nothing was applied. Same entry, same digit, all four times: the failure is deterministic, so retrying can never succeed.
* **The screen said nothing useful.** `p2/launch.ts` exits 1 with a run file but no `error`; `sources.ts` then marks the step **BLOCKED** (the word used for a provider block) with the message "The AI step did not complete: " followed by an empty reason.
* Spend ledger: US$39.28 settled of the US$100 cap.

## Findings (fix owner: builder; ranked)
| # | Severity | Finding | Fix |
|---|---|---|---|
| A1 | **Blocker** | The rule the checker enforces (lowercase letters and underscores, one dot) is in neither the prompt ("the canonical field id") nor the structured-output schema (`fact`: any string). One bad name rejects 232 good answers. | Put the same pattern in the output schema and the prompt (one source for both); check entry by entry: a bad entry becomes "needs a person" with the reason, the rest are kept. Add a test that replays the four saved outputs. |
| A2 | **Major** | Failure message blank and mislabelled as BLOCKED. | Read the run file and say what happened in plain words: "AI answered 233 boxes. 1 name broke the naming rule (box 114). Nothing was applied. Cost US$1.51." Status FAILED, not BLOCKED; keep BLOCKED for provider limits. |
| A3 | **Major** | The four paid runs (US$6.10) are recoverable at no cost: `p2/reconvert.ts` re-applies conversion to a saved output whose hash matches. | After A1, reconvert the four runs and offer "Use the saved AI answer (no cost)". Refuse a new paid launch whose inputs match a run that failed on our own check; offer the re-check instead. |
| A4 | **Major** | ~7.5 minutes per form with one static line ("This usually takes a few minutes"): one call, Opus 5.5 at high effort, up to 64 thousand output tokens, all 233 boxes at once, no progress. | Screen 02 concept: reuse first (boxes already in the library are matched without AI, AI sees only new boxes); split by form part and run parts in parallel (the bounded queue exists); show progress per part ("Part 3 of 6 · 120 of 233 boxes"); cache the shared instructions. Model or effort changes only after a measured comparison on saved inputs, with a cost estimate first (P-27). |
| A5 | **Major (scope)** | AI drafts **field maps only**. Questions, sections, document requirements and rules are not AI-drafted (`ai.ts` capability note), although the proof loop in `PRODUCT.md` §1 says "AI creates reusable fields, sections, documents and rules". | Screen 02 concept must cover them (P-11, P-14, P-15, P-53). Until then no screen may promise them (the builder already removed "AI proposes the questions" on 23 Oct). |
| A6 | Minor | The AI guessed the edition "IMM 1344 (07-2014)" from barcode captions; the intake had already read the printed edition 09-2024 from the file (P-51). | Pass the intake's printed edition into the AI input so it never guesses. |

## Testing approach (founder asked: headless or headed)
Both, for different jobs. **Headless Playwright** (the existing suites) is the repeatable gate: every state, axe accessibility, 1024/1440 px, timings. **Headed** walk in a real browser is for judging flow, words and feel; the Lead did it on 23 Oct in the built-in browser and it does not replace the founder's own unaided walk (D17/D20). For AI, the best practice is a fixed evaluation set: the saved real outputs re-checked by script at no cost, plus a small scored set of forms with known answers before any new paid run.
