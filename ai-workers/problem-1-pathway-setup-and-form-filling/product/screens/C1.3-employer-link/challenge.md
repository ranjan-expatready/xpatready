# C1.3 + C11.5 part 2 — independent challenge of concept r1 (5 Nov)

Challenger: a fresh Opus session that did not draft the concept (skill screen-concept, part B). Read: concept r1; CAPABILITIES C1.3, C11.5; DECISIONS P-106, P-239, P-316, P-332; RULES.md; STAND-INS SI-10; M3 concept BR-13; SA-1B-283, SA-1B-284; the team's AG-07 v3.12 AG-7-53 and AG-7-55; the SA-01B v2.0 knock-ons (open ruling 3); the built code named below. Measured read-only on the isolated copy (port 4431, database `xr_studio_rt_c13`, configured checkpoint): GET calls and SELECTs only, US$0, no AI.

## Verdict: **Build after these changes**
No Blocker. Four Majors, all cheap to fix in the concept before the acceptance test is written. The core choice (copy at link time, a Sample stand-in employer case, no migration) is sound and the sources support it.

## Objections

### Major
**M1. The words say "read-only from a Corporate case", but the rule copies once and lets the officer edit.** *Needed for the proof.*
* What breaks: an officer who reads "read-only" will not fix a wrong copied value, and "linked" suggests a later change on the employer case will reach the worker's case. BR-3 says the opposite.
* Example: the officer opens the WP case and reads "Offered: the With an LMIA – inside Canada forms read 3 employer facts from a Corporate case, read-only." (measured, GET `/runtime/combinations/930e…/employer-link`). There is no Corporate case: the employer case is a Sample file.
* Evidence (fact): `engine/runtime/employer.ts` reason "…from a Corporate case, read-only."; `web/src/runtime/employer.tsx` TIP "…from a Corporate case, read-only."; concept §5 tooltip "linked read-only"; STAND-INS SI-10 "a read-only link"; `tests/runtime/check_c115_employer.ts:25` asserts the old reason.
* Fix: list the word changes in §5: the offer reason ("…read N employer facts; you can copy them from an employer case"), the TIP, the chip tooltip ("Today: one Sample employer case per firm; its facts are copied once. Later: the team's AG-17 Corporate cases and LMIA."), and the SI-10 row text (the tech lead's file). Update the C11.5 check's expected text in the same PR.

**M2. The stale guard has nothing to compare: `version` is not a column, and New/Same/Different can go stale between GET and POST.** *Needed for the proof.*
* What breaks: BR-4's "nothing overwritten silently". The drawer shows LMIA number **New**; meanwhile the client types "A123" in the questionnaire; POST writes the Sample number over it, unseen.
* Evidence (fact): `prisma/schema.prisma` model `Case` has no `version`; Q3 recommends no migration. The built pattern for answers is the list of answer ids seen (`confirmSection`, `api/src/runtime.ts:408-440`, 409 listing what changed). The case row lock exists (`api/src/case-prepare.ts:471`, `api/src/fill-case.ts:204`: `SELECT id FROM runtime_case … FOR UPDATE`).
* Fix: GET returns, per fact, the current answer id (null for New); POST sends `seen{fact: answerId|null}`; under the case row lock, any fact whose current answer differs → 409 "Changed since you looked: <fact>", nothing written. Replace `version` in §2 and BR-6 with this. Add the test "an answer arriving after the GET → 409, nothing copied".

**M3. The employer address is a composite value; "Same" must compare it the way it is stored.** *Needed for the proof.*
* What breaks: the address shows **Different** when it is the same (or is written again), because jsonb returns object keys in its own order. This bug already happened once with the firm record's phone (review B1).
* Evidence (fact): `canonical_field` `organisation.employer_address` data_type COMPOSITE, value_type `address` (SELECT); `engine/runtime/team.ts` `inStoredOrder` and its comment "review B1: the phone object". The concept's mock shows the address as one string.
* Fix: the Sample file holds the address in the library's address parts; compare with `inStoredOrder`; show it formatted in the drawer. Add the test "a stored address equal to the employer case's → Same, no write".

**M4. Where the copied facts are written is not stated, and the resolver decides it.** *Needed for the proof.*
* What breaks: if the builder writes all copied facts on the case's "The application" subject, IMM 5710 will not read the employer name and address; if on the principal, the LMIA number is not read.
* Evidence (fact): `engine/resolver.ts` `scopeOf`/`aboutOf`: `case.` facts are about the filing (the case subject); `organisation.` facts are about the form's subject ("held (P-251)"). Placements on the WP release: `organisation.employer_*` per_person, `case.lmia_or_offer_number` once_per_case (SELECT).
* Fix: §2 Case data: write each fact on the subject `aboutOf` gives for IMM 5710's subject (the principal for `organisation.`, the case subject for `case.`); only the principal, never a spouse on the case. Test: the filled IMM 5710 preview shows the three copied values.

### Minor
* **m1. The defect is wider than "3 facts on the work permit".** Fact (measured): the Visitor visa and the Study permit ("Outside Canada") are also offered today ("read 1 employer fact": `organisation.name`, IMM 5475 "Name of firm or organization (if applicable)", person `representative`). C11.5's record says "Not offered: the Visitor visa has no employer facts"; its check passed on a fixture without IMM 5475. Fix: say so in §2 and the PR, so qa re-scores C11.5 part 1 on the checkpoint. Exclude by `person === "representative"`, not by the key: the C11.5 pure test treats `organisation.name` with no person as an employer fact (`check_c115_employer.ts:24`). *Needed for the proof.*
* **m2. The pill hides the status.** `ConfirmPill` (`web/src/runtime/questionnaire.tsx:617`) shows a source pill *instead of* the status for the firm record. A copied DECLARED value must still read "To confirm" (BR-5). Fix: the "Employer case" source and the status side by side; add `linked_file` to `CHANNEL`. *Needed for the proof.*
* **m3. BR-5 departs from SA-1B-283 r4 without saying so.** r4: a copied value "keeps the status it had at its source (Declared or Verified)". DECLARED is right for a Sample file with no status; write that down, with "status carried once AG-17 cases exist". *Needed for the proof (one line).*
* **m4. Team names have no mapping (retrofit).** The team's badge is "Linked file: <employer>, <date>" (SA-1B-283 r5, AG-7-55 via the knock-ons), the audit event "opened from linked file", the record `CaseLink {fromCaseId, toCaseId, kind: worker permit, status ACTIVE|ENDED, createdBy, createdAt}` (AG-7-53 §7). Keep the founder's word "Employer case" on screen (PRODUCT.md §4), but give `linked{}` the CaseLink field names and add a mapping line, so the AG-07 record replaces the audit-derived link. The Linked cases panel and ending a link: *Not built*.
* **m5. Cite the team text that settles Q1.** Besides SA-1B-283 r4, AG-07 v3.12 AG-7-55 r5 ("carries … into the case and into the worker's answers") is newer and agrees. The team's own knock-ons list copy-versus-reference as open ruling 3 (26 Oct, older than both). The M3 BR-13 text is a draft concept, not a decision. So the tech lead can rule Q1 under P-294 and record it; no founder question is needed. *Needed for the proof (records).*
* **m6. L-SA5 overlap.** P-239 and BACKLOG L-SA5 (M4) add "one Sample employer combination with the employer–employee link and a shareable mark, updating SI-10". §6b should say L-SA5 replaces `samples/employer-cases.json` and adds the marks, and that this row builds only the case side. Otherwise L-SA5 builds the link a second time (P-324 (1)). *Needed for the proof (one line).*
* **m7. Records.** "Founder 5 Nov: M3 runs alongside (lifts P-332)" has no DECISIONS row yet (newest P-343). P-332 and RULES.md still say no new M3 work. Record it before a builder starts. Unverified by me.
* **m8. Files.** `studio/contracts/` is M2-hot (`product/tools/m2-hot-files.txt`); keep the new types in `engine/runtime/employer.ts` and the API, or get the tech lead's line. Add the two routes to `acceptance/M3-CONTRACT.md` (P-325).

## What is sound
* Copy at link time is what the newest team text says (SA-1B-283 r4, r12, §13 "No live sync"; AG-7-55 r5), and it removes unlink, live sync and out-of-date fan-out from the proof.
* A Sample employer case is forced by the data: the Corporate "High-wage position" has 0 forms and 0 releases (SELECT); P-239 builds no Corporate configuration. Not touching `demo.ts` (M2-hot) is right.
* No migration holds once M2 is fixed: answers are append-only with `source_json`; `audit_event` keys a case by `entity='case'`, `entity_key`=case id (SELECT).
* The facts are right: IMM 5710 reads `organisation.employer_name`, `organisation.employer_address` (person none) and `case.lmia_or_offer_number` (form subject). IMM 5475's `organisation.name` is not the employer (SELECT).
* BR-4 (show Different, never overwrite silently), BR-6 (row lock, 409), BR-7 (404, no name) follow built patterns. The drawer is the Side panel pattern (EXPERIENCE §3, 480 px). Values are labelled Sample with no real IRCC or ESDC number (AGENTS.md rule 4). The scope is held to name, address and LMIA number; SA-1B-284 is honestly marked Not built (the stand-in carries only shareable-type facts, so nothing leaks).

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Offer line | release snapshot `field_maps` | `GET /runtime/combinations/:id/employer-link`; `employer_link` on `GET /runtime/cases/:id` | `employerFacts` without person `representative`; words per M1 | WP offered, 2 employer facts + LMIA number; VV and SP not offered (checkpoint); client and author 403 |
| Employer cases | `samples/employer-cases.json` {firmKey, key, label, facts by library key; address in parts} | `GET /runtime/cases/:id/employer-cases` → per fact new·same·different + current answer id | carried = file keys ∩ facts the pinned release reads (BR-2); firm filter (BR-7) | another firm's key 404; `organisation.name` and an unread fact not listed; composite Same (M3) |
| Link (copy) | `client_canonical_answer` insert, status DECLARED, `source_json {channel:"linked_file", employer_case, at, actor}`; a ticked Different supersedes; subject from `aboutOf` (M4); `audit_event` entity `case`, action "relied on employer case", detail {employer_case, facts} | `POST /runtime/cases/:id/employer-link {employerCase, seen{fact:id\|null}, replace[]}` in one transaction with `runtime_case … FOR UPDATE` | BR-3–BR-6; a changed seen id → 409, nothing written | New written, Same not, Different kept unless ticked; second POST 409; two at once → one set; stale seen 409; later edit of the Sample file leaves the copies |
| Linked line | derived from the audit event (CaseLink names, m4) | `employer_link.linked{employer_case, name, at, by, facts[]}` | read-only after creation (SA-1B-283 §6) | header line after link; still shown after every copy was edited |
| Pill | the answers' `channel` | questionnaire `?mode=agent` | source and status both shown (m2) | browser check at 1440 px, keyboard, axe |

## Questions for the founder
None. Q1 to Q3 are settled by the sources or are the tech lead's to rule (P-294; m5, m6). Recommended rulings: Q1 copy at link time; Q2 Sample stand-in file; Q3 no migration, with M2's seen ids.

## Lead response

## Agreement

## Build discoveries
