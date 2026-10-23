# Bounded comparison: baseline A versus challenger C on one slice

19 October 2026 · Claude Code (the Lead) · answers the reviewer's architecture findings M2 and M3, **revised for P1R2-M4** (revision 3). **Status: planned; not run.** *Revision 4 (20 Oct 2026): trials per form edition, not per instance (W1 3.2.r1); Part 1 does not wait for the Part 2 infrastructure (PostgreSQL, challenger packages).* The route is decided: the prototype-only exception (AIW-D260) through the Anthropic API with the founder's key (AIW-D261), enforced by the runner (`p2/guard.ts`, `p2/ledger.ts`). It runs when the key file exists, the challenger's packages and the shared database are approved (asked at that point, AIW-D258), and the reviewer has rechecked this revision. Design context: `implementation-design-2026-10-19.md` §6–§7.

**What changed in revision 3, and why.** Revision 2 compared JSON files (A) with a Postgres checkpointer (C) and attributed every difference to the framework, and it ran each arm's own live model calls, so two independent calls with identical settings could differ for reasons that have nothing to do with orchestration. Revision 3 separates the two questions: **(1) model quality** is measured once, with repeated live trials of the one drafting function both arms share; **(2) orchestration** is compared by replaying the identical recorded model responses into both arms on **equivalent durable storage**. Model choice is a third, separate question and is not tested here.

## 1. What is compared

| Arm | What it is | Owns state in |
|---|---|---|
| **A, baseline** | TypeScript async functions; the shared drafting function (one `@anthropic-ai/sdk` 0.131.0 call per form edition, structured output to `contracts/field-map-entry`; revision 4: per edition, not per instance, as W1 3.2.r1 requires); our idempotency key, run record and release record | Tables shaped like the product's draft, release and outbox rows (`CountryPackDraft` pattern), in the shared local PostgreSQL database |
| **C, challenger** | The same steps as a LangGraph TypeScript graph; `interrupt` before release; `PostgresSaver` checkpointer; the same drafting function inside the drafting node | LangGraph checkpoint tables plus the same release table, in the same PostgreSQL database |

**Storage held equal.** Both arms write to one local PostgreSQL server (the team's major version, 18; default `fsync` and `synchronous_commit` on), each in its own schema, with a committed transaction as the durability point for every state change. Neither arm keeps state in files or memory across a stop. Storage code is counted and reported per arm, so a difference in effort caused by storage is visible rather than attributed to orchestration. If PostgreSQL is not approved, the comparison is reported explicitly as **whole implementation bundles** (orchestration plus its storage), never as a framework-only result.

Both arms share: the drafting function and its prompt file (version and hash), the input list of official files, the output contract, the budgets, the recorded model responses (§3) and the scoring script.

## 2. The slice

`expected/slice-1-field-map.json`: IMM 5707 (01-2023) for Client A **and** for the partner (same template, opposite perspective), plus IMM 1295's marital block for Client A. 90 expected entries. Why this slice:

- **Wrong person:** the spouse block means the partner on one form and Client A on the other; Parent 1 and Parent 2 are both headed "MOTHER OR FATHER"; IMM 1295 asks for the partner's name inside Client A's own form.
- **Repeated rows:** children are a repeating row that ships with no data rows.
- **Position traps:** date of birth sits in a different row position for applicant and spouse than for parents and children.
- **Codes that differ by form:** common-law is `1` on IMM 5707 and `03` on IMM 1295; country of birth is free text on one and coded on the other.
- **Uncertain output:** "name in native language" has no case fact; "present at the marriage ceremony" applies only in variant V1. Both must come back unresolved, never guessed.
- **Never filled:** three signature boxes.

## 3. Two experiments, held apart

| | Part 1: model quality (live) | Part 2: orchestration (replayed) |
|---|---|---|
| Question | How well does the drafting function map the slice? | Which orchestration recovers, de-duplicates and releases correctly with less custom code? |
| Calls | Live, through `p2/runner.ts` only | **None live.** A replay caller returns the Part 1 responses byte for byte, keyed by request hash; an unmatched request fails the trial |
| Arms | Not per arm: the drafting function is identical in A and C | A and C, same replayed responses, same database |
| Repeats | 5 independent live trials per form edition (IMM 5707 and IMM 1295), fresh process each, no shared context; each trial scored on every instance of the slice (Client A's and the partner's IMM 5707 come from one map) | Each scenario run 3 times per arm; any difference between repeats is itself a finding |
| Measures | S1–S4 (§4) per trial: the spread across trials, every failure, and not best-of-5 | S5–S10 (§4) per arm, plus custom code, dependencies, stores and moving processes |
| Model | `claude-opus-5-5`, effort `high`, adaptive thinking; fixed. Choosing a model is a separate experiment | Not applicable (responses replayed) |

**Every trial is kept**, including refusals, timeouts, invalid output and budget stops; nothing is re-run to replace a failure. A difference between arms in Part 2 is investigated and reported with the evidence found; no cause (framework, harness or storage) is presumed in advance.

## 4. Inputs, settings, budgets

| Item | Value |
|---|---|
| Official inputs | `official-sources/ircc/forms/imm5707e.pdf`, `imm1295e.pdf`, admitted by path and SHA-256 against `official-sources/ircc/manifest.json`, plus their P1 inventories (each checked to derive from that hash). **Never** `expected/`, the family values or test outputs: enforced on the one launch path: `p2/launch.ts` (allowlist and hash through `p2/guard.ts`; screening of the maker-written template and schema) starting `p2/draft.ts` under Node's permission model, which re-checks its own isolation and uses the one ledger (executed with a stub: `tests/check_p2_launch.ts`); the JSON Schema checks shape only |
| Route | `anthropic-api/aiw-d261-prototype-exception-aiw-d260` only: Anthropic API base URL fixed, the founder's key file, SDK retries off. Production stays on a commercial AIW-D147 route |
| Per attempt | `max_output_tokens` 32,000 (streamed), timeout 10 minutes |
| Per run | at most 2 attempts, US$5 cap (AIW-D261) |
| **Whole experiment** | **US$40 cap** (top of AIW-D261's US$15–40), in `p2/ledger/spend.jsonl`. Every attempt, first try or retry, reserves its worst case before the call; the reservation counts at worst case until settled from the provider's reported usage; an error without usage stays at worst case. Worst case per attempt (32,000 output tokens at $20 per million, input bounded at one token per byte at $4 per million): about US$0.8 for IMM 5707 (inventory about 42 KB) and US$2.1 for IMM 1295 (full inventory about 360 KB). Part 1 at its worst, every one of 10 runs failing and retrying (revision 4: per edition; IMM 1295 now sent whole, worst about US$2.2 per attempt at 64,000 output tokens): 5 × 2 × 0.8 + 5 × 2 × 2.2 ≈ US$30, inside the cap together with one full configuration pass (about US$13–14 worst case on first attempts); anything beyond is refused before the call |
| Drafting context | A separate process with only the admitted inputs. Not this Claude Code session, and no context inherited from the session that wrote the answer key |

## 5. Scenarios and measures

| # | Scenario | Part | Measure | Pass bar |
|---|---|---|---|---|
| S1 | Map the slice | 1 | Entry accuracy against the key: person, fact, row and transform each right; Parent 1/2 either order, block-consistent | Report the spread across trials; no fixed bar (first measurement) |
| S2 | Wrong person and repeated rows | 1 | Count of entries with the wrong person; child rows created and ordered | Zero wrong-person entries released |
| S3 | Uncertain output | 1 | Unresolved returned (with reason) where the key says unresolved; count of invented values | Zero invented values |
| S4 | Source evidence | 1 | Each mapped entry's quote found in the cited file's text (checker script) | All quotes found, or the entry is flagged |
| S5 | Review and release | 2 | Author or submitter approving or publishing refused (Platform Owner included, D254); approval of a different hash refused; release record written | All refused or written as specified |
| S6 | Interruption | 2 | Kill the process while waiting for review; restart; finish | Same release; no second drafting request issued to the replay caller |
| S7 | Duplicate action | 2 | Submit the same release twice; repeat a run with the same idempotency key | One release; one draft (the store lookup, not only the key computation) |
| S8 | Source change | 2 | Replace a source hash | Release marked stale; re-draft required |
| S9 | Configuration-driven screens | 2 | Change the released configuration; the review and collection views regenerate (P4 screens) | Views change with configuration only |
| S10 | Invalid model output | 2 | Replay a malformed response | Run ends `invalid_output`; nothing saved as draft |

Also recorded: Part 1 calls, tokens, cost and wall time per trial; Part 2 review effort (items a person must decide), lines of custom code split into orchestration and storage, dependencies, stores and moving processes per arm.

## 6. Decision rule

C replaces A only if, on the replayed responses and the shared database, it passes a scenario A fails (S6–S8 are the likely ones) **or** cuts custom orchestration code materially with the same Part 2 results, **and** its checkpoint tables do not conflict with the product's draft/outbox tables. Otherwise A stays the baseline. Part 1 results describe the drafting function and the model, not either arm. Everything is reported to the reviewer with every trial, never as "best in class" or as proof of production scale.

## 7. Not in this comparison

Arms B (Vercel AI SDK) and D (Claude Agent SDK), for the scope reasons in the design §6.3 (D is documented for production agents; it is left out as unnecessary breadth for one bounded mapping call, not as ineligible); model selection; the full ten combinations; production load; portal (web form) filling.
