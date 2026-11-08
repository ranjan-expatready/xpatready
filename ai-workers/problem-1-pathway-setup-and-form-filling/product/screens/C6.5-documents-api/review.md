# Review: C6.5 part 2a, documents API and migration (PR #1369)

Reviewer (fresh, did not build it). Commit reviewed: **`ab717fdbd550616e41bd17eb3d147bf26413b819`** (`git diff origin/main...ab717fdbd`). The branch has since moved to `521398bec` (92a3f7661 rewrites messages, 521398bec adds the drawer concept). Those commits are **not** reviewed here; neither one fixes the two Majors below.

Scope: the API and the migration only. **No new screen. The drawer is PR 2b and is not in this PR**, so screen elements are not scored as missing. Rules read: P-242, P-243, P-142, P-133, P-134, P-110, P-175, P-295; rows.md §C6.5; M3-CONTRACT row C6.5; concept-draft BR-4 to BR-7; STANDARDS §5. Journey test: `journey-test-reviewer-2026-11-08.md` (**8.5/10**).

## Re-run on my own copy (`rv_c65`, :4434, stopped after; US$0)
* Fixture (`setup_visitor_visa.ts` + `setup_vv_m3.ts`): pack C6.5 **30/32**, with only C6.5-19b and -20 red (no saved letter read, FQ-10, out of scope). `check_c65_documents_api` **33/33**.
* Configured checkpoint (reset + load `configured` as user-A): pack **30/32** (same two). The ab717fdbd copy of `check_c65_documents_api` is **33/33**.
* `check_c65_document_rules` **17/17**. `check_prisma_schema` 5/5: the migrations give the schema; the partial index lives in SQL only, as with `case_document_one_current`. `tsc`: no error in any changed file. `graph.mjs --check` exit 0, with no C6.5 route gap.
* The rollback in the migration header runs cleanly inside a transaction (ROLLBACK after). `answer_check_resolution_check` refuses a reason of spaces.
* My probes (scratchpad, not committed): 8 parallel Confirm & use on one document → one 200 and seven 409s, 1 audit line, 1 check, one current answer per fact. 8 parallel resolves → one 200 and seven 409s, with one reason. An answer save racing Confirm & use → the save gets 409, with no duplicate. The client and another firm's client → 403 on proposals, checks and resolve. 0 audit lines hold a value or a reason.

## What holds
* **What Confirm & use writes to `client_canonical_answer`:** new values and agreeing values are written as a new row, `status VERIFIED`, `verified_by/at`. `source_json` is `{channel: "document_read", actor, at, document, page, reader, read_value}`, plus `from` when it supersedes. The supersede uses the `superseded_by_id IS NULL` guard. A differing value is never written: one open check per person and fact, enforced by the partial unique index; the typed value is kept (BR-7, documents challenge B1). Country codes and values the question refuses stay proposals.
* **One Confirm & use per document:** the `confirmed_by IS NULL` update is the lock (`:329`). Resolve uses `state='open'` (`:395`) and an optional `answerId` stale guard.
* **P-134:** AI reads only the `CASE_KINDS` allowlist (letter of invitation), and only from a saved read matched by checksum. Live is refused (`live_refused`, `cost_first`). No identity document can reach AI.
* **Cost card (P-110, P-295):** `LETTER_READ_CARD` is priced by the ledger's own `costUsd` at Opus US$4/US$20 per MTok × `MAX_ATTEMPTS` 2. I checked the arithmetic: usual US$0.0236 → **0.03**, worst 2 × 0.098 → **0.20**. It is labelled "Estimate, not measured", with `live_allowed: false`.
* **Audit (STANDARDS §5):** lines carry the case short id, the type, the role, counts and fact keys only. No value, reason or file name.
* **Migration:** additive. Its CHECKs mirror the rules (collapsed ⇒ checked, which is P-243; confirmed and corrected fields set together or not at all; resolution needs a kept value, a reason, who and when). It cascades with its case.

## D1–D20 (1–5)
D1 Requirement fit 4: BR-4/5/7, P-242 and P-243 met by the API; the Major below breaks BR-7's "two documents" case · D2 Data integrity **2**: M1, M2 · D3 Reuse 4: reuses `readPassport`, `checkValue`, `identity-documents`, the ledger · D4 Rule integrity 4 · D5 Stability 4: races hold (probes) · D6 Governance 4: who and when on reads, confirms and resolves · D7 AI trust 4: replay only, cost first, provenance on every value · D8 Orientation N/A (no screen) · D9 Flow 3: the readiness line asks for a resolve with no screen yet (PR 2b) · D10 Language 3: m3 · D11 Feedback 4: problem+json with a code and "Nothing was written" · D12 Visual N/A · D13 Accessibility 4: the existing upload passes axe at 3 widths and works by keyboard · D14 Team look N/A · D15 Speed 5: fill 22 ms, no per-row request · D16 Testability 3: m2 · D17 simulated only · D18 Provenance 4: document, page and reader on every written row · D19 Closure 3: the screen half is PR 2b · D20 simulated only.

## BIC (case side; this PR has no case screen, so most checks are scored at the API)
| Check | Score | Evidence |
|---|---|---|
| BIC-05 source and confirm action | Partly (API Met) | proposals carry document, page and reader, and nothing is an answer before Confirm & use (C6.5-7, -10). The action on screen is PR 2b |
| BIC-06 honest confidence | Met (API) | collapsed only with passed check digits (C6.5-9, -18b), enforced by a DB CHECK |
| BIC-07 conflicts never overwritten | **Partly** | a conflict is never overwritten (C6.5-12), but M1 keeps a replaced document's value as "the document's" |
| BIC-03 no stale answers | **Partly** | M1: the check is stale against the current file |
| BIC-13 errors say what and how | Met (API) | every refusal names the fix (`not_read` → run Fill first, etc.) |
| BIC-20 keyboard-complete | Met (existing upload) | journey J2, J3 |
| BIC-01, 02, 04, 08–12, 14–19 | N/A | no case screen in this PR |

## Issues
1. **M1 Major (Must): a replaced document's value is written VERIFIED on "keep the document".** After a newer passport is confirmed, the open check still names the old file and its value, and resolve `keep: document` writes that old value (probe: `SAMPLEP12` current while the current passport reads `SAMPLEP13`). Cause: `case-documents.ts:342-346` reuses the open check unchanged, and `:397-404` never asks whether the check's document is still current. **Fix:** when a current document's Confirm & use meets an open check from a non-current document, repoint the check to this read value (document, `document_value_json`, `read_value_id`). Resolve also refuses `keep: document` with a 409 while the check's document is not current. **Fail test:** old passport → check → newer passport confirmed → the check shows the newer value, and keep-document writes the newer value.
2. **M2 Major (Must): the case-level upload bypasses a checklist line.** `POST /runtime/cases/:id/documents` accepts any release type (`:165`), including one a line of that person holds. It then supersedes that line's file (`:180-183`) without the line's version lock, its Not-applicable refusal or its state change. Probe: the client uploaded a passport onto a **Not applicable** line → 201. The line's file became `current=false`, while the line stayed `not_applicable|3`. **Fix:** accept only `CASE_KINDS`, or types no checklist line of that person covers (`lineKeys`, sets included); otherwise answer 409 "upload it on its checklist line", with nothing stored. **Fail test:** that request is refused, and the line and its file are unchanged.
3. m1 Minor (Should): the open-check guards run outside the write transaction: Confirm section (`runtime.ts:593`) and checked-against (`case-documents.ts:420`). A check opened in between is missed. Fix: read them inside the transaction.
4. m2 Minor (Should): no test runs Confirm & use or resolve in parallel. If the in-transaction guards at `:329` and `:395` are removed, every suite stays green, because the sequential repeats are caught earlier at `:322` and `:388`. Add a parallel pass/fail pair, as my probe did.
5. m3 Minor (Should): plain words. Fact keys and decision codes appear in texts a screen will show (`:201`, `:218`, `:236-239`, `:362`). The readiness label comes from the key (`readiness-inputs.ts:125`), not `labelOf`. 92a3f7661 rewrites some of these; that commit is not reviewed here.
6. m4 Minor: for a passport-only section, the plan returns a US$0 estimate with the letter's "basis" text (`:212-215`). Say "no AI read in this section".
7. Not a finding, for the tech lead: the extra Confirm-section block ("the check's document also gives a fact of this section") is stricter than BR-6/BR-7 as written. It is put to the tech lead in the PR, as are the two pack lines (P-400 questions 1 and 2). This review does not settle them.
8. Noted: two documents opening a check on the same fact at the same moment hit the partial unique index. The P2002 answers 409 "Already exists" (`main.ts:208`), the whole Confirm & use rolls back, and a retry joins the check. Acceptable.

**Could not check:** a real screen reader; an unaided user (D17 and D20); the letter replay (FQ-10). Breaker report: not read, to keep this review independent.

**Verdict: Block** on `ab717fdbd550616e41bd17eb3d147bf26413b819`. Fix M1 and M2, each with a fail test. Fix m1–m4 or list them in the PR. Re-review covers the diff since `ab717fdbd`.

## Re-review on f7ce78bc9 (diff only, P-293: `git diff ab717fdbd..f7ce78bc94dc8b48217adc681b5bdb23c2dc2923`)
Re-run on my copy `rv_c65` (:4434), stopped after, US$0. Results:
* **Fixture:** pack C6.5 **30/32** (red only 19b and 20, FQ-10). `check_c65_documents_api` **55/55**.
* **Configured checkpoint:** reset and load ran with the new triggers in place. Pack **30/32**; API check **55/55**.
* **No database or server needed:** `check_c65_document_rules` 17/17; `check_c76_readiness` 83/83; `check_prisma_schema` 5/5.
* **Typecheck:** `tsc`, no error in a changed file.
* **Rollback:** the header's rollback, now with the three `DROP FUNCTION`s, ran cleanly inside a transaction (ROLLBACK after).
* **Triggers:** they refuse undoing a Confirm & use and rewriting a resolved reason. The database stores a Hindi reason.

| Earlier finding | Now | Evidence (my probes and the builder's tests) |
|---|---|---|
| **M1** replaced file's value kept | **Fixed** | Before the new file is confirmed, `keep: document` on the old check gives 409 `not_current`; the check stays open and the answer is unchanged. Confirming the new file closes the old check ("Its file was replaced…", typed answer kept) and opens its own check with `SAMPLEP13`. Keeping that check's document value writes `SAMPLEP13`, VERIFIED, with the new file as source (`case-documents.ts:384-391`, `:468`; test "C6.5 B1"). |
| **M2** case-level upload around the line | **Fixed** | Only `CASE_KINDS` are accepted (`:178`). The client's passport upload gets 422 "has its own line on the person's checklist: upload it there", with 0 rows stored (test "C6.5 B-M5"). |
| m1 guards outside the transaction | Fixed | Confirm section (`runtime.ts:601-605`) and checked-against (`:497`) now read open checks inside their transaction. |
| m2 no parallel test | Fixed | 5 parallel Confirm & use calls and 5 parallel resolves each give one 200 (tests "R-m2"). |
| m3 keys and codes in texts | Fixed (server words) | Messages use labels ("citizenship, passport country of issue"); no "P-134" or "FQ-10" in `why`. Audit lines keep fact keys (internal). |
| m4 plan basis | Fixed | With no letter in scope: "No document here is read by AI…", US$0 (`:231-232`). |

Also checked in the diff:
* **New file route `GET /runtime/documents/:id/file`:**
  * Answers: officer 200; client 403; author 403; another firm 404 with the same words as an unknown id.
  * Headers: `nosniff`, CSP `default-src 'none'; sandbox`, `no-store`.
  * Each view is audited as "viewed", with no file name.
* **Proposals now carry `current`, `differs` and `left_why`.** The sex value is written as `f_female`.
* **Two documents that differ on one fact now open two checks.** After one is resolved, the other gives 409 `changed` until the current answer is sent. No 500.
* **A check on the application's own facts now warns on every filing** (test "B-M4").

New, all Minor (fix or list in the PR):
* **n1 (Should, the tech lead's condition on BR-6):** when a check in another section blocks a section, the 409 still says "An answer in this section differs from a document". It names neither the check's section nor the check in words.
  * Probe: confirming `personal_details` was blocked by the passport-number check in `travel_document`.
  * The tech lead kept both halves of the rule "on one condition: the 409 and the screen name the open check and the section it sits in" (`runtime.ts:604`).
  * Fix: name the check's question and its section in `detail`, and add `section` to `checks[]`.
* **n2 (Should):** the closure of a replaced file's check is returned only as `closed: [ids]`. The officer's `message` and the "confirmed and used" audit line do not mention it (`case-documents.ts:426-428`). Add "1 earlier check closed (its file was replaced)" to both.
* **n3 (note for the concept, not a defect):** BR-7 reads "one check per person and fact". The index is now per person, fact **and** document (break M2's fail test allowed either form). Record it in the concept or the PR as a decision.

Journey re-score on f7ce78bc9: correct data ½ → 1 and plain words ½ → 1. Next step stays ½, because the resolve screen comes with the drawer, PR 2b. **9.5/10.**

**Verdict: Approve** on `f7ce78bc94dc8b48217adc681b5bdb23c2dc2923`. No Blocker or Major is open; n1 to n3 are fixed or listed in the PR.

## Re-review on f346af947 (diff only: `git diff f7ce78bc9..f346af947b05f46720af9f70be0131bbb2ade8fa`)
The diff changes the 409 of `runtime.ts` confirmSection, two lines of `case-documents.ts` (the officer's message and the audit line), two new tests (R-n1, R-n2) and these review files. I ran one probe on my copy `rv_c65` (:4434, fixture), then stopped the copy. I did not re-run the pack: nothing in the diff touches a step it tests.
* **n1 fixed.** The 409 now names each blocking check and where it sits.
  * Blocked from another section: confirming `personal_details` with the passport-number check open answers 409: `"passport number" in "Travel and identity documents" differs from a document (an open check): resolve it first…`. `checks[]` holds `{id, fact, label, section: travel_document, section_title}`.
  * Blocked in its own section: confirming `travel_document` itself says `… in this section …`.
  * Section titles come from the snapshot's `sections[{id, title}]` (`engine/snapshot.ts:221`).
  * Gap: test R-n1 covers only the same-section case. The other-section words (the half the tech lead's condition is about) rest on my probe. **Should:** add that fail line. It is a Minor, so fix it or list it in the PR.
* **n2 fixed.** After a newer file replaces an older one, the officer's message ends "1 check from the file this one replaced was closed, keeping the answer." The audit line ends "1 check of a replaced file closed", with no value and no reason.
* **n3:** recorded in the PR as a decision, as agreed.

**Verdict: Approve** on `f346af947b05f46720af9f70be0131bbb2ade8fa`. No Blocker or Major is open. The one Minor (the other-section test line) is to be fixed or listed in the PR.
