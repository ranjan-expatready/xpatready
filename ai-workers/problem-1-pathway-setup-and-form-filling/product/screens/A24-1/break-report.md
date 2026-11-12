# A24-1 break report (schema + API; case number, optional reference, one principal)

**Build:** PR #1633, branch `claude/magical-euler-5y7ruz`, commit `a02fcfaf4`. **Copy:** `isolated.sh brk_a24 4494` (database `xr_studio_brk_a24`), configured checkpoint, actors `user-O`, `user-R`, `user-S`, `user-P`, `user-A`. Copy stopped and dropped. US$0: no model call, nothing priced pressed.
**Scope:** build-notes "What gets built" only. Screens (A24-2, A24-3: list column, heading, search, "Client:", optional reference field) are not findings.
Paths: `studio/` = `prototype/studio/`.

## Findings

**M1 (Major): a reference can be another case's number, so two cases go by the same name.**
* Did: opened a case with no reference (it got `C-2026-00002`), then a second case of the same firm with `reference: "C-2026-00002"` (it got `C-2026-00004`). Also accepted: `C-2026-00040` (before 00040 was given out), `c-2026-00031`, and `C-2026-00002` in the solo firm.
* Expected (CS-7: the number is unique in the firm, and words name a case by `caseName()`): a reference shaped like a case number is refused, or `caseName()` cannot give two cases the same name.
* Actual: 201 every time. `GET /runtime/cases/:id/earlier-facts` on a third case of the same client offers **two different cases, both called "C-2026-00002"** (ids `6be88ab7…` and `8571ebf6…`). The officer has to pick between them to copy facts. The same name also appears in the reconfirm audit line ("from the earlier case C-2026-00002"), in duplicate-number warnings ("Already on case C-2026-00002") and in form copy names. This is a real risk: firms that move over from the team's system may already use `C-YYYY-NNNNN` references (AG-7-3).
* Where: `studio/contracts/runtime.ts:41` (no check on the reference's shape), `:32` (`caseName`); used at `studio/api/src/earlier-facts.ts:82,86`, `filing-record.ts`, `submission.ts`, `fill-case.ts`.

**M2 (Major): a case with no reference still gives `reference: null` where the API names the case, and that null ends up in a submission record.**
* Did: opened a Study permit case with no reference through the API (`C-2026-00043`), prepared it, then read `GET …/prepare` and `GET …/filing-record`.
* Expected: words that name a case use `caseName()`, as the build notes claim, so these give `C-2026-00043`.
* Actual: `"reference":null` and `"our_reference":null`. The Record submission dialog builds its pre-filled "Our reference" from this: `${view.reference}-${i + 1}` for more than one filing, which gives **"null-1", "null-2"**, and `null` for one filing. The record contract accepts any non-empty text, so "null-1" can be stored as our reference on an IRCC submission record. A24-2's list does not include this dialog.
* Today only a case opened through the API has no reference: the Open a case dialog still requires one.
* Where: `studio/api/src/case-prepare.ts:691` (`reference: c.reference`), `studio/api/src/filing-record.ts:34` (`our_reference: c.reference`), used at `studio/web/src/runtime/submission.tsx:196`. Also `person-link.ts:382` (`case_reference`, not shown on any screen today).

**m1 (Minor): if the counter falls behind the case numbers, the firm can no longer open cases, and the error blames the reference.**
* Did: moved `firm_case_counter.next_value` back by one (as a raw import would, or a raw `UPDATE runtime_case SET firm_key=…`, which no trigger stops). Then opened twice with no reference.
* Actual: 409 "A case with this reference already exists" both times, though no reference was sent. Each refused opening also hands its increment back, so the counter never moves past the taken number: every later opening in that firm and year is refused.
* Not reachable through the product: a reset racing openings fails as a whole (see Held).
* Where: `studio/api/src/runtime.ts:315-318` (every unique violation is reported as a duplicate reference).

**m2 (Minor): the database's case-number shape check is looser than the counter and the format.**
* `C-0000-00099` and `C-2026-000031` pass `runtime_case_number_check`. Year 0000 is outside the counter's own 2000–9999 check.
* `C-2026-000031` and `C-2026-00031` count as different text, so the same running number can be stored twice.
* Raw SQL only. Where: `studio/prisma/migrations/20261112150000_a24_case_number/migration.sql:57` (`[0-9]{5,}` allows a leading zero past 5 digits).

**m3 (Minor): a case that had no principal before the migration fails with a 500 on its next change of people.**
* Did: on a case with no principal (set up with replica mode, standing in for legacy data), added a child through `POST …/people`.
* Actual: 500 "Something went wrong" (the deferred `case_one_principal`). The list row then shows `client_name: null`.
* The migration never checks existing cases for exactly one principal (it would fail on two, but not on none).
* Where: `migration.sql:74-89`.

**m4 (Minor): the API turns `reference: null` away with words that say a reference is needed.**
* A JSON client that sends `null` for an optional field gets 400 "Give the case a reference of at least 3 characters." Only leaving the key out works.
* Where: `studio/contracts/runtime.ts:41` (`.optional()`, not `.nullish()`).

**m5 (Minor): `client_name` means two different things in the contracts.**
* In a list row it is the client person's name. In `CaseStageView` and `StartNextPreview` (`contracts/runtime.ts:393,400`) the same key is the stage's name as the client sees it.
* The new list-row fields (`case_number`, `client_name`, `filings`) have no shared type in `contracts/`: the web keeps its own `CaseRow` (`web/src/runtime/cases.tsx:99`). STANDARDS §6: contract first.

**m6 (Minor, existed before A24-1): reference uniqueness ignores letter case.**
* `Dup-x` and `DUP-x` both open in one firm (spaces around a reference are trimmed and caught, 409). The rules are unchanged by A24-1; recorded here only because the next screens make the reference searchable.

## Held
* **48 openings at once, mixed:** 6 good, 6 without a reference, 6 with the same reference, 6 bad bodies, 6 with one key and one body, 6 with that key and other bodies, 6 from the solo firm, 6 from the client.
  * Firm numbers 00001–00015 and solo numbers 00001–00006, with no gap and no duplicate.
  * Exactly one winner for the shared reference and one for the shared key. 400 / 409 / 403 as expected. Counters at 16 and 7.
* **Idempotent openings at once:** 12 identical keyed openings, with and without a reference, give one case and one number (the others `created:false`). The same key with 12 different bodies: one 201 and 11 × 409. 12 unkeyed openings with no reference at once: 12 numbers in a row.
* **360 more openings** (10 at a time): 403 cases in the firm, 00001–00403, no gap (checked by `row_number`), every case with exactly 1 principal.
* **List speed:** `GET /runtime/cases?take=100` took 8–25 ms with 403 cases and 7–22 ms with 1,609 cases (4 queries per page). Paging with take=7 went through all 42 rows, none twice.
* **Two firms at once:** each counts on its own; the solo firm cannot see firm cases (list: none; `GET` of a firm case: 404).
  * `after=<the other firm's id>` returns only the caller's own rows. `client=user-S` returns 0 rows.
  * The client and the author get 403 on the list; no actor, 401.
* **Make principal:** preview, then 4 applies raced. One 200; the rest 409 stale or 422 in words. Never two principals.
  * Swapping back and forth works. `client_name` in the list stays the opening client, matching the case page's `client: true`.
  * A second principal through `POST …/people`: 400 in words.
* **Raw SQL, refused:** a second principal (at once and with `SET CONSTRAINTS ALL IMMEDIATE`), deleting the principal, moving the principal to another case, deleting the principal's subject (cascade), changing a case number, a case with no number, a case number that is not in the format, a role written `Principal` or `principal `.
  * Not caught: `TRUNCATE case_participant` gets past the triggers (needs owner rights).
* **Filings:** 0 before Prepare; 4 for the family; 1 for Study permit. After Start next stage, 0 until the work stage is prepared, then 1. The number stays the same across stages.
* **Year boundary:**
  * `runtime_next_case_number` at `2027-01-01 03:00Z` gives C-2026 (Toronto) and at `05:00Z` gives C-2027-00001, whatever the session's time zone (set to Asia/Kolkata and to UTC).
  * `2026-01-01 04:59:59Z` gives C-2025. Past 99999 comes C-2026-100000.
* **Demo reset:** counters cleared. After reloading the configured checkpoint, the seeded case is C-2026-00001 again.
  * A reset racing ~1,200 openings failed whole (500 from a foreign key, the same before A24-1) and left the counters consistent.
* **References:**
  * Refused with 400 on the field: spaces, 2 characters, `"  ab  "`, 81 characters, the number 0, U+202E, a tab.
  * Accepted: 80 characters, Arabic, CJK and emoji.
  * The Open a case dialog's empty field: still 400 on `reference`.
* **Schema:** no drift on `runtime_case` or `firm_case_counter` (`prisma migrate diff`). The builder's `check_a24_case_number_api.ts` passes 19/19 on this copy.
