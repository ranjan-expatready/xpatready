# Slice 1: live IMM 5257 add-form (21 Oct 2026, maker session bbb2b79d)

Visitor visa › Single applicant, after Reset → Load sample inputs. Every step used the Studio screens or the endpoints those screens call, acting as the simulated personas.

| Step | Evidence |
|---|---|
| Gate 0 probe | Live call accepted and billed: `p2/runs/studio-fieldmap-imm5257e-live-20261021t055411020z.json`, 102,508 in / 32,000 out, US$1.05, status `invalid_output` (stopped at the job's 32,000-token output limit; nothing reached the library). Fix: `studio/api/src/sources.ts` job `max_output_tokens` 64,000, matching the 20 Oct IMM 1295 runs (53–63k output for the same 242-box size) |
| Live draft | `p2/runs/studio-fieldmap-imm5257e-live-20261021t060247723z.json`: 102,508 in / 56,886 out, US$1.55, 407 s, `completed_with_unresolved`. Job `f6d37ae5…` (job.json): 242 boxes, 161 mapped, 84 proposed fields → 34 reuse, 23 new, 27 ambiguous, 0 conflict against the c1-v3 library (164 fields). The model wrote edition "06-2018" (from the form's barcode captions); the run records it and the official edition label 09-2023 is kept |
| Decisions (configuration author, review duty) | 34 exact reuse and 22 clean new accepted as groups; 28 individually (see below). Applied to the draft: 134 draft changes, 0 errors, 91 warnings (new fields no question asks yet) |
| Review and release | Submitted (user-A), SME duty signed 134 changes (user-C), released v1 `3c5cd94f67fc…` by the approver (user-B). releases.json, activity.json |
| PDF | IMM 5257 for the applicant from the released configuration and Client A sample facts: 44 written, 44 read back equal, other data unchanged, original bytes kept, /DocMDP and /UR3 verified, 0 syntax errors (fill-report.json, IMM5257-principal-filled.pdf). 1 by hand (derived "residential same as mailing"), 7 blank (address parts absent), 123 no confirmed sample fact |
| Spend | Ledger committed US$26.72 of US$100 after both runs (ledger.json) |

## Individual decisions and why

- **Followed the shown recommendation (26 of 27 ambiguous),** including reuse where the meaning is the same (birth city/country, school name, disorder, employer, activity dates, overstay, refusal, US PR card expiry, violent organisation, union start date; `person.immigration_history_details`, whose "period differs" flag was a false alarm: the same question text as IMM 1295).
- **Kept distinct, deliberately:** current / previous / applying-from residence status and dates, and `person.telephone_type`. The c1 library models residence as one repeating period field whose boxes choose the period with "select current residence period" / "select status period in the country where applying", and phone type with "select primary phone". The decision screen cannot attach a selector when re-pointing, and the period selectors are outside the executable set (`p5/transforms.ts`). Re-pointing would lose which period a box means; separate definitions keep it. Cost: these facts are asked twice across IMM 1295 and IMM 5257 until period selectors are decidable and executable (open gap).
- **Kept new:** occupation and education city/province/country (the library holds one combined location field; no location-part step exists), `us_green_card_number` (different from the expiry date), `applying_from_country` (its derived Y/N box names the proposed key).
- **Changed:** `person.occupation_title` → `person.employment_activity`, so the occupation block reuses one set of period fields (dates and employer were already reuse).

## Executor change found by this slice

The live draft spells two executable steps differently (`date_part:MM` for `date:MM`; `address_part:province_state`) and chains steps with `->`. `p5/transforms.ts` now accepts those spellings and separator (aliases only; no new behaviour). Before: 31 written, 16 by hand. After: 44 written, 1 by hand. `tests/check_p5_engine.ts` 29/29 after the change.
