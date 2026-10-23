# P2 results brief: AI-drafted configuration for combination 1

20 October 2026 · maker: Claude Code (the Lead) · **first draft, at the P2 response; updated at later milestones, finalised at P8.** For the team, the delivery lead and an implementation partner. Detail lives in [experiments.md](experiments.md) (E15–E19, discoveries D11–D28), the [implementation design](implementation-design-2026-10-19.md) and the evidence files named below. Label on all drafted output: *AI-drafted under a prototype-only exception to the AI-processing rule; not the product's provider route.* Answer keys: *Lead-verified from official sources (prototype only); not specialist-confirmed.* Legal: Unconfirmed: no counsel (AIW-D94).

## Bottom line

**Model:** one model (`claude-opus-5-5`, effort high, structured output) drafted the whole combination-1 configuration from the official forms and guides alone. It mapped 461 of 461 form boxes, proposed forms, documents, rules, sections and checks, and named what it could not settle.

**On the checked slice** (91 key entries over 49 distinct boxes: IMM 5707 seen from two people, plus the IMM 1295 marital block): in five independent trials it never put one person's fact in another person's box and never invented a value.

**What is not proven:** a corrected scorer shows the earlier "fully correct" reading was too strong. The scorer could not tell a swapped name or a swapped day and month. Assembling the draft also introduced a defect of our own (below).

**For the prototype:** fit to continue, with a person reviewing every item (P3).

**For production:** not qualified. Only 49 of the 461 boxes have an answer key, and no load, privacy, provider or user testing has been done.

## What was measured, layer by layer

Every number below comes from the same preserved model outputs. Nothing was re-run against the model. Layer D includes repairs we made, so **it is never presented as the model's own result.**

| Layer | What changed | Acceptance examples | IMM 5707, Client A / partner (42 boxes each) | IMM 1295 marital block |
|---|---|---|---|---|
| **A. Original result** | none (reproduced byte for byte) | 20 / 22 pass; RQ-02 and RQ-03 fail | 42 / 42 and 42 / 42 under the old scorer | 3 / 6 |
| **B. Evaluation corrections only** | corrected scorer and answer keys, on the *same* configuration | 20 / 22; FM-08 and RQ-02 fail | **37 / 42 each.** The 5 present-occupation boxes point at a field defined as "occupation during a period". The model's own IMM 5707 definition was right (42 / 42 by its own words); our assembler kept the other run's definition | 6 / 7. The 7th is the shared marriage date, a named dependency (below) |
| **C. Assembler v2, detection only** | conflicts listed for a person; model output unchanged | 20 / 22 | 37 / 42 each; 28 items listed for a person to decide | 6 / 7 |
| **D. Reviewed repairs** | 11 field merges, 2 splits, 4 flags; IMM 1295 for each applicant | 22 / 22 | 42 / 42 each | 6 / 7 |

**What the old scorer missed.** It learned which draft field matched which key fact from the very boxes it was scoring. It also checked only the kind of transformation, not the details. A global swap of family and given names, or dates in day-month order, still scored 42 / 42. The new scorer aligns fields by their definitions, using a reviewed table, and checks the exact date format, every code and every inversion. The reviewer's swap and day-month cases now fail, as they should (`tests/check_score_p2.ts`, 44 / 44).

**Two of the original failures were key errors, not model errors:**
- **RQ-03.** The model wrote "aged 18 or older, or a minor travelling alone", which matches the official passage. The key had only the age rule.
- **IMM 1295 3 / 6.** The model mapped the visible marriage date and called the three hidden date boxes form helpers, which is correct. The key had keyed the helpers.

Both keys are corrected in versioned files, with official citations.

## Results by capability

| Capability | Question | Executed (sample) | Result | Not shown |
|---|---|---|---|---|
| **Field maps** | Does the AI map each form box to whose fact, which fact, and how? | 6 form editions, 461 boxes; IMM 5707 and IMM 1295 drafted 5 times each, fresh process each time | 461 / 461 boxes have exactly one entry; every quote found in the form's own text. Slice (scorer v2, no repairs): trials 1–2 42 / 42, trials 3–5 41 / 42 per IMM 5707 perspective (the "no children" tick box left unmapped). IMM 1295 6 / 7 in four trials, 5 / 7 in trial 4 (a code list with no labels). **0 wrong person, 0 invented, every trial** | Accuracy of the 412 boxes outside the slice (structure and quotes checked only) |
| **Requirements** | Which forms, documents and conditions apply to whom? | 1 draft | Six expected forms present; conditions valid in the team's 11-operator language; the D19 cases right. **Miss:** IMM 1295 for the principal only (D20). Its inputs lacked the IMM 1295 form page that says "each person who needs a work permit" | A second trial |
| **Sections and placements** | Where is each fact asked, and by whom? | 1 draft | Every used fact placed; the representative's licence number never asked of the client | A second trial |
| **Checks** | Which warnings and blocks? | 1 draft, plus rule-made checks | Expiry and history-gap checks warn, never block. An inconsistency in the official guide was held for the specialist. 16 checks cited a draft instead of the official file (D21, open) | A second trial |
| **One fact, many forms** | Is a fact asked once and reused? | Assembler v2 on the live draft | After the reviewed merge, one country-of-birth value fills IMM 1295 (code list) and IMM 5707 (country name), asked once (`tests/check_assemble_p2.ts`, 21 / 21) | Shown on screens at P4 regeneration |
| **Launch control** | Can text reach the paid caller unscreened? | Stub caller only | Fixed (R4-M1). The drafting process screens what it sends and checks the live gate itself; the reviewer's bypass is refused (32 / 32). **Awaiting recheck; no paid call until it passes** | Not an operating-system sandbox |

## What was repaired or corrected, and by whom

| Kind | Count | Made by | Where |
|---|---|---|---|
| Branch keys renamed in conditions (`conditions` → `args`) | 83 | assembler rule (D18) | `structure.condition_keys_renamed` |
| Weak-evidence entries demoted to unresolved | 2 | converter rule | `unresolved` |
| Field merges (same meaning, two ids) | 11, 32 references rewritten | maker review | `p2/field-review.c1.json` |
| Field splits (one id, two meanings) | 2 (occupation; country of residence) | maker review | same |
| Uncertain matches flagged, not merged | 4 | maker review | same |
| Content repair: IMM 1295 for each applicant | 1 (R-D20) | maker review, cited | `p2/repairs.c1.json` |
| Answer-key corrections | D11, D19, D20 accepted by the reviewer; D12 kept as metadata | maker, from official files | `expected/*.v2.json` |
| Scorer defects fixed on stored output | 3 (a note after a code; a reference date overwriting a missing birth date; a selection step before a date) | maker | `tests/score_p2.ts` |

**Still open.** The marriage date is one fact about the couple, but the mapping format can only name a person (a named dependency). The e-mail and telephone of the representative and of the client are placed differently, because placements are per fact, not per person (a contract gap). 16 checks cite a draft (D21). 100 items remain for a person to review in the repaired configuration (99 before assembler v2.1, which also lists four residence-country references that no box or source run ties to one meaning; P2-R2-M2).

## Cost, time and effort (measured)

| | Value |
|---|---|
| Paid usage reported by the provider | US$16.21 over 27 attempts. The ledger also counts US$24.13 committed, including failures held at their worst case (reviewer-recalculated 08:23Z) |
| One trial pair (IMM 5707 + IMM 1295) | US$1.81–2.01; trial 5 US$4.14 (a cut-off stream counted at worst case, then a retry) |
| Time | IMM 5707 about 100 s; IMM 1295 384–449 s per draft |
| Human review effort | not yet measured (P3 records it per item) |
| After the reviewer's first R4-M1 finding (05:23:05Z) | 19 paid reservations, 05:24:01Z to 06:24:13Z (the live P2 runs and trials, made before the finding was reproduced at 08:23:05Z). After the 08:23:05Z verdict: none; only 18 zero-cost stub lines. *Corrected 20 Oct (P2-R2-m1): this row first said "US$0: stub runs only", which was wrong for the 05:23Z–08:23Z window. The ledger is unchanged: 215 lines, `e7430baf…011d`* |

## Selection

- **Selected for the prototype:** direct provider SDK in TypeScript. That means one drafting function per step, the guarded launch path, structured output, every trial kept, and a person reviewing before release. The P2 drafting chain works from official inputs to an assembled draft configuration, and its controls are tested; the team runs Node 24. The full journey (questionnaire, collection, form population) is not yet demonstrated end to end: that is P3–P8. *Wording corrected 20 Oct (P2-R2-m1).*
- **Documented, not executed:** a LangGraph TypeScript challenger ([comparison plan](comparison-plan-2026-10-19.md), Part 2 on replayed responses). It is not run, so no claim is made either way.
- **For developers to reuse:** the contracts (`contracts/`), the guard and launch path (`p2/`), the meaning-based alias and field-review method, the exact-transform scorer and the four-layer rescoring.
- **Remaining qualification:**
  - answer keys for the other 412 boxes and the other combinations;
  - the production provider route (D147) and the processing region;
  - privacy review;
  - load and scale;
  - more forms and platforms;
  - users' acceptance.

## Exact versions and evidence

- **Model and settings:** `claude-opus-5-5`, effort high, adaptive thinking, structured output, at most 2 attempts, US$5 per run and US$40 overall.
- **Prompts:** the hashes are in each run record. Five runs used earlier prompt bytes; they are linked, hash-verified, in `p2/prompts/history/INDEX.json`, and the changed v1 files are not presented as the prompts those runs used.
- **Keys:**
  - v1, unchanged: `expected/slice-1-field-map.json`, `expected/combination-1.json`;
  - v2: `expected/slice-1-field-map.v2.json`, `expected/combination-1.v2.json`, `expected/fact-aliases-c1.json`;
  - acceptance: `tests/p2-acceptance.json` (v1) and `tests/p2-acceptance.v2.json`.
- **Configurations:** `p2/config/c1-draft-1-live.json` (original, SHA-256 `5075783c…96a7`), `c1-draft-1-live-r2-detect.json` (layer C) and `c1-draft-1-live-r2.json` (layer D).
- **Scores:** `p2/scores/*.score.json` (original, kept); `p2/scores/v2/` (rescored); `p2/scores/v2/rescore-summary.json` (all layers and trials).
- **Reproduce offline:** `node tests/rescore_p2.ts`, `node tests/spread_p2.ts`, `node tests/spread_p2.v1.ts`.
