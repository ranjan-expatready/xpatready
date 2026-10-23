# R1 build notes — runtime lane (backend path)

## R1a (23 Oct): visitor visa released in the lane copy; case, people, answers, Confirm section
Scope per the Lead's note of 23 Oct 18:00: plan §4 setup (B1), then case, people, answers with DECLARED/VERIFIED and "Confirm section" (P-72); S-1 granted. No screen in this slice (renderer R1c, fill R1d). No paid AI (US$0: IMM 5257 replayed from the saved 21 Oct run).

### How to run (own copy, never :4400)
```
zsh prototype/studio/tools/isolated.sh runtime_r1 4430 start
tsx prototype/studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1
tsx prototype/studio/tests/runtime/check_runtime_r1a.ts 4430 xr_studio_runtime_r1 [--reset]
```

### Results (23 Oct, commit after 38adc9d0)
| Suite | Result |
|---|---|
| Setup from a fresh copy (`setup_visitor_visa.ts`, port 4431) | 10/10; visitor visa v1 released in Release 2, 0 errors, 0 warnings, 0 "nobody is asked"; published 47 fields, 36 questions, 2 sections, 247 boxes |
| R1a checks (`check_runtime_r1a.ts --reset`, same fresh copy) | 60/60 (S-1, RT-1…RT-6, RT-8…RT-12, RT-17, S-7) |
| Regression: Screen 01 API (`check_screen01_api.ts`, own copy 4433) | 94 passed, 0 failed |
| Regression: engine and Screen 01 rules | 38/38; 54 passed, 0 failed |
| Regression: forms channels (`check_forms_channels.ts`, own copy 4432) | 106/106 with HTTP keep-alive off. With the suite's own `fetch` it stops at the same call every run (write EPIPE on the intake POST that follows a ~6 s loop of 14 Python reads: the server closed the idle socket). A test-harness flake, not a regression; finding F-R1-4 |

### What was built
| Element | Where | Rule (plan §8) |
|---|---|---|
| Setup through the product's endpoints | `tests/runtime/setup_visitor_visa.ts` (Scaffolding, P-33) | B1: replay, decisions as 21 Oct, IMM 5707 reuse, answer lists from the form's own lists (13), option maps, 2 new sections, 36 questions, section selection in library order, submit → SME sign-off → different approver |
| Records | `prisma/schema.prisma` runtime block; migration `20261023220000_runtime_r1` (expand only, rollback in its header) | `Case`, `PackWorkPin`, `Party`, `PartyProfile`, `PartyRelationship`, `AnswerSubject`, `CaseParticipant`, `ClientFactRecord`, `ClientCanonicalAnswer`; SQL: one current answer (partial unique), one current row version, deferred supersede links, no self-edge, status CHECK |
| Engine | `engine/runtime/case.ts` (pure) | confirmation (P-72 + founder Q1 default), field checks by type with precision read from the field maps, known facts for the common renderer, questionnaire view (SQR and agent modes) with fills per form |
| Contract | `contracts/runtime.ts` (zod) | request shapes; `MINOR` (Sample: date of birth, under 18) |
| API | `api/src/runtime.ts` (`/api/runtime/…`) | cases, people, questionnaire, answers, rows, confirm; deny by default; pinned release on every read; audit without values |

### Decisions taken while building (small, technical; disagree in the Lead check)
1. **Module file is `api/src/runtime.ts`, not `api/src/runtime/`**: `tsx` enables decorators only for files the API tsconfig includes (`src/*.ts`); a sub-folder would need a shared tsconfig change.
2. **Rows**: `ClientFactRecord` is the row head (stable `rowKey`, order, tombstone versions); cell values are `ClientCanonicalAnswer` rows with `rowKey`, superseded per cell. The team keeps cells in immutable `ClientFactValue` per record version (D-5b: same history, finer grain).
3. **Question precision from the forms**: no new value types. A date the forms only write as month and year is asked as month and year; a text's limit is the smallest "max N characters" of its boxes; phone shape when a box splits phone parts; whole dollars when written as CAD. Data-driven, so another form changes it without code.
4. **"Other" follow-ups are required-when, not shown-when**: the release validator refuses a hidden question a form reads unconditionally (STANDARDS §3.6), so "Describe that status" is always asked and becomes required when the status is Other (REQUIRE effect, evaluated by the runtime engine; the shared renderer treats every question as required).
5. **Case-level facts** (visit purpose, stay, funds, contacts, union date) are answered once on the case subject (team D-4, Unverified) and fill every applicant's IMM 5257, as the release maps them. Whether they are per applicant is the immigration expert's open question (Lead list).
6. **Confirm section** promotes each answered fact of one person in one section to VERIFIED as a new version (history kept), including client answers that already counted as confirmed.
7. **Client logins** are simulated (`user-P` Client A, `user-Q` Client B); a case names its client; another client gets 404, as the team's cross-tenant rule.

### Shared files changed (for the Lead's check)
| # | File | Change | Status |
|---|---|---|---|
| S-1 | `api/src/core.ts` | unknown or missing actor → 401; runtime actors added (studio persona list unchanged) | granted; tested |
| S-2 | `api/src/main.ts` | register `RuntimeController` and `Runtime` (2 lines) | plan §10; needed for any endpoint |
| S-6 | `api/src/studio.ts` | release transaction timeout 60 s (separate commit c5f92d49) | **for Lead review**: a whole new form published 339 draft rows; Prisma's 5 s default refused it every time (500); the release then took 9.3 s |
| S-7 | `api/src/demo.ts` | reset deletes people first (cases go with their combination by cascade) | for Lead review; tested (`--reset`) |
| — | `prisma/schema.prisma` | back-relations on `Combination`, `ConfigRelease`, `CanonicalField` (one line each) and the runtime block | needed by Prisma |

### Findings for other lanes (not fixed here)
| # | Finding | Evidence | Owner |
|---|---|---|---|
| F-R1-1 | The option-map validator asks for a map on every box whose field has an answer list, including boxes with no choices of their own (IMM 5707 country-of-birth text boxes; IMM 5257 derived yes/no boxes "PCRIndicator", "SameAsCORIndicator"). A text box cannot take one (`setOptionMap` refuses codes it does not have), so release is blocked | `engine/channels.ts:59-62`; setup run 23 Oct | forms lane. Workaround: `NO_LIST_YET` in the setup (3 fields keep no list, fill by label as before) |
| F-R1-2 | Release of a large draft times out (5 s interactive transaction) | `api/src/studio.ts:517`; S-6 | screens/Lead |
| F-R1-3 | The shared renderer treats every placed question as required; a REQUIRE condition never makes one optional | `engine/render.ts` pushQ | screens (Screen 03 preview); runtime handles it in its own engine |
| F-R1-4 | `check_forms_channels.ts` uses `fetch` with keep-alive; after the slow intake loop the next POST fails with EPIPE | runs 23 Oct (twice); 106/106 with keep-alive off | forms lane / qa |
| F-R1-5 | IMM 5707's country-of-birth and marital-status boxes are text: a case fill must write the value's label there, not its key | `fill.ts` writes the stored value when there is no option map | for R1d (runtime) with the forms lane's fill |

### From the Lead during R1a (23 Oct)
* F-R1-1 workaround accepted; the validator defect is scheduled in forms slice 2 (then relink the 3 fields in `NO_LIST_YET`).
* IMM 5257's fill trial passed in Adobe (186/186 barcode slots, reproduced by the Lead): R1d fills IMM 5257 directly; the "Checked copy, not for filing" label (RT-14) is no longer needed for it; "ready to file" stays blocked only by missing or conflicting facts (P-71).

### Not in R1a (next slices)
RT-7 section checks (the visitor-visa release has no cross-field checks yet: add as data in R1c), RT-13…RT-16 (fill, out of date, lock, trigger: R1d), the renderer (R1c), "Report a mapping problem" (P-73, M3/M4).

## Fixes
(none yet)
