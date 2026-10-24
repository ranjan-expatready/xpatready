# R1 thin slice — slice R1a review (backend path, CHECK) · independent reviewer, 23 Oct 2026

Commit `3a1eb930` on `claude/runtime-r1-8f1db8`. Reviewer did not build it. Read: concept, plan (§3, §8 RT-1…RT-17, Lead response), challenge, build-notes; STANDARDS, QUALITY, WORKFLOW; P-47, P-65, P-71, P-72. Code: `api/src/runtime.ts`, `engine/runtime/case.ts`, `contracts/runtime.ts`, schema runtime block, migration `20261023220000_runtime_r1`, shared-file diffs (core, main, demo, studio), `tests/runtime/*`. Scope per the Lead: setup (B1), case, people, answers DECLARED/VERIFIED, Confirm section, S-1. RT-7, RT-13…RT-16 and the renderer are later slices, not findings.

## Verdict: Ship after fixes (go to FIX)
The case core is sound. The pin is frozen, answers are append-only with a partial unique index, a stale save gets 409 with the newer value, another client gets 404, configuration people get 403 and audit lines hold no values. Two Must fixes are on the server (one leaks case activity, one lets "Confirm section" verify values the officer never saw). Three Majors are in the released visitor-visa questionnaire the case runs on. "Facts once" and "rules as data" are not met in content, and the tests cannot see this.

## What I ran (own copy, port 4434, `xr_studio_runtime_rev`; US$0)
| Run | Result |
|---|---|
| `setup_visitor_visa.ts` from a fresh copy | 10/10, about 3 min; released v1 sha `50832d79…`; 0 errors, 0 warnings, 0 "nobody is asked"; published **46** fields, 36 placements, 2 sections, 247 boxes (build-notes say 47 fields) |
| `check_runtime_r1a.ts` | 59/59; rerun with `--reset` 60/60 (S-7). No flake across the two runs |
| Own API journey (curl, user-O / P / Q / A) | see `journey-test-reviewer-2026-10-23.md`; journey score **7.5 / 10** |
| `tsc -p api/tsconfig.json` | no errors in runtime or core files (43 older errors in `tests/check_screen01_api.ts`, `check_ai_orchestration.ts`) |

## Findings (ranked)
**Must 1. Case activity can be read without a login and by any client.** `GET /api/activity` (`api/src/main.ts:53`) calls no `actorOf`. It returned 200 with no header, and to Client B (user-Q). It shows every runtime audit line the slice writes (`runtime.ts:66, 95, 161, 179, 217`), for example "Client A answered person.applying_from_country on case REV-J1". So any caller sees other cases' references, which facts each client answered, and when. This breaks RT-12 ("client only own case and questionnaire") and STANDARDS §6 [M] deny by default. The build-notes S-1 line "unknown or missing actor → 401" holds only for routes that call `actorOf`: 27 GET routes in `main.ts` do not, including the catalogue, library and config, which user-P also reads (200). *Fix:* keep case events out of the open feed, or require a configuration or officer duty to read `/activity`. Add a fail test: no header, and client → refused. The wider pre-existing open GETs go to the Lead.

**Must 2. "Confirm section" verifies values the officer never saw** (`runtime.ts:200-216`, `ConfirmSection` in `contracts/runtime.ts:41`). Confirm takes only `subjectId` and promotes whatever is current at that moment. Walked: the officer confirmed the spouse's marital status "married". The client then changed it to "single". The officer's next Confirm made "single" VERIFIED by the officer, with no 409 and no sign of the change. P-72's "officer confirms" means the officer vouches for what they reviewed, and STANDARDS §4 [M] requires optimistic concurrency. *Fix:* send the answer ids shown (or a section version) and return 409 with what changed. Add a pass test and a fail test.

**Major 3. The case asks the same fact twice, and asks 34 of 93 client questions that fill nothing** (concept "Facts once"; STANDARDS §3.3; plan RT-4). This is the principal's SQR from release 2:
- `person.email_address` (Contact, 0 boxes) and `person.email` (under "Representative and authorizations", fills IMM 5257)
- `person.phone_number` and `person.phone_type` (0 boxes), alongside `person.telephone_number` (8 boxes) and `person.phone_country_code`
- `person.mailing_address` (9 boxes), alongside 7 `person.mailing_address_*` parts (0 boxes)
- `person.previous_marriage_or_common_law` (0) and `relationship.previously_married_or_common_law` (1)
- the residence_history row group (0 boxes), alongside `current_residence_*` (filled)

The client is also asked, and required to answer, the representative's licensing province, the supervising lawyer's membership ID and common-law tax questions (`case.*`/`representative.*`, 0 boxes). All of these come in through section selection. The setup acceptance (`setup_visitor_visa.ts:197-198`) checks only "nobody is asked" and "unused section", and the RT-4 test (`check_runtime_r1a.ts:71`) checks only key uniqueness, so neither can fail for this. *Fix (setup 4.5, scaffolding standing in for Screen 03):* leave out questions no visitor-visa form or rule reads, or list them with a reason. Propose merges (P-65) for the meaning duplicates. Add a fail test for "asked but read by nothing / same meaning".

**Major 4. Detail and not-applicable questions are always required** (plan §5 and RT-8: "details after yes", show/hide). The release has 4 REQUIRE rules, all "Other" or "exists" (`snapshot.placements`). `criminal_history_details`, `military_service_details`, `immigration_history_details`, `medical_details`, the national ID set and the US PR card set are required for everyone. After "criminal history: no", the details question is still missing, so a truthful household can never reach 0 missing. Under P-71 that will block "ready to file" in R1d. The RT-8 test (`check_runtime_r1a.ts:127-132`) covers the "Other" follow-up only. *Fix:* add the conditions as data in the setup, plus one pass test and one fail test for "details after yes".

**Major 5. Ten choice and country questions have no answer list and accept any text.** `case.visa_type_requested` (fills IMM 5257) took "I want a golden visa" with no problem flagged. `person.applying_from_country` (2 boxes) took `true` (flagged, but the client has no list to pick from). The cause is `case.ts:79-81`: with an empty list, any non-empty string passes. `NO_LIST_YET` (`setup_visitor_visa.ts:43`) removes three lists on purpose (F-R1-1). This breaks STANDARDS §3.2 "pick, don't type" and plan §4.5/RT-6 "value from the field's answer list". *Fix:* give these fields lists (the country master exists), or flag "no answer list in the release" instead of accepting the value.

**Major 6. Answer size is unbounded** (`contracts/runtime.ts:35`, `z.unknown()`; body limit 5 MB). A 2 MB string was saved, and every later view returned 2.6 MB (it was 0.4 to 0.5 MB before). STANDARDS §8 [M] input validation. *Fix:* cap the value in the contract (400 above the cap; flag format problems as now).

**Major 7. The new pure engine has no unit or property tests.** `engine/runtime/case.ts` (`confirmation`, `checkValue`, `shapeOf`, `knownOf`) is exercised only through the API suite. STANDARDS §7 makes property tests [M] when the engine changes, and plan §8 promised them. *Fix:* unit tests per function, and a property test for `knownOf` row indexing and `confirmation`.

**Minor**
- The people limit is guarded only by the accident of the `(case_id, order)` unique index (`runtime.ts:84-92`). Two lawful concurrent child adds gave 201 and 409 "Already exists", which misleads. No race test.
- Concurrent `addRow` gives duplicate `order` values: three parallel adds produced orders 0, 0, 1 (`runtime.ts:176-178`). Row-to-box order is then nondeterministic.
- `addRow` accepts a person group on the case subject (201 on "The application"/education_history), which creates an orphan row (`runtime.ts:170-175`).
- An idempotent create under a race returns 409 to the retries instead of the existing case (`runtime.ts:50`; 4×409, 1×201, one case).
- Missing body fields get zod's default text, "Invalid input: expected string, received undefined" (`contracts/runtime.ts:26, 36`).
- `Address` and `Phone` are exported and unused (`contracts/runtime.ts:43-44`). There are no response schemas.
- The pin → release FK is `ON DELETE CASCADE` (`migration.sql:169`), which a frozen pin should not allow. `pack_work_pin.party_id` has no FK.
- The RT-17 log guard (`check_runtime_r1a.ts:197`) passes trivially: the API log has one line.
- The build-notes field count (47) differs from a fresh run (46).

## Spot-check: would a test fail if its rule were removed? (read in code)
| Rule | Code | Test that fails | Holds? |
|---|---|---|---|
| RT-5 stale version | `runtime.ts:153` | `check…:83` expects 409, would get 200 | yes |
| RT-3 release limit | `runtime.ts:85` | `check…:52` expects 422; sequential orders differ, so it would get 201 | yes |
| RT-2 pin | `runtime.ts:41` (`pins[0].release`) | `check…:190`: the label would follow v2 | yes |
| RT-4 asked once | engine | `check…:71` cannot see meaning duplicates (Major 3) | partly |

## D1–D20 (backend slice; maker evidence plus independent rerun)
| D | Score | Evidence |
|---|---|---|
| D1 | 3 | RT-1…6, 8…12, 17 built and passing; "facts once" and "details after yes" not met (Majors 3 and 4) |
| D2 | 3 | Partial unique, 409, CHECKs and idempotency hold; confirm has no version (Must 2); no size cap; row order duplicates |
| D3 | 2 | The same fact asked under 2 or 3 keys (email, phone, mailing address, previous marriage, residence) |
| D4 | 2 | 4 rules only; detail questions required unconditionally |
| D5 | 4 | Reruns stable; reset 60/60; idempotent create; races refused, though some messages mislead |
| D6 | 4 | Every answer keeps channel, actor and time, with history; pin carries the release sha; audit per change |
| D7 | n/a | No AI; the replay is labelled scaffolding |
| D8, D9, D12, D13 | Not yet evidenced | No page (R1c) |
| D10 | 3 | API messages mostly plain; zod defaults; field keys in audit text |
| D11 | 4 | "Saved. It fills IMM 5257 for … (n boxes)"; a 409 returns the newer value; confirmation "why" on every answer |
| D14 | 4 | Team names (Party, AnswerSubject, ClientCanonicalAnswer, PackWorkPin); adapter notes D-1…D-9 |
| D15 | 4 | Views 73–165 ms at 0.4–0.5 MB; unbounded after large answers (Major 6) |
| D16 | 3 | A pass and a fail test per RT, rerun by the reviewer; no engine unit tests; RT-4 and RT-8 tests cannot fail for Majors 3 and 4; coverage not measured |
| D17, D20 | simulated only | No intended user; no page |
| D18 | 4 | Each fact shows source, actor, confirmation reason and the form boxes it fills |
| D19 | Not yet evidenced | Fill and renderer are R1c and R1d |

## Shared files (for the Lead)
S-1 (`core.ts:43-48`): correct where it is called, but see Must 1. S-2: two lines, fine. S-6 (60 s release timeout): fine for the prototype, though a release still runs inside a web request (STANDARDS §4); that is the Lead's call. S-7 (reset deletes parties first): tested.

## Not checked
No browser, axe or screen sizes (no page). The fill, the PDF and never-overwrite (R1d). The team's models against live `dev` (the capture is Unverified). Coverage floor (c8). Other lanes' suites after S-1 (I relied on the build notes).
