# Review: C6.5 QA-352, every Visitor visa checklist document that offers reading is read (PR #1444)

Reviewer session (did not build it), 9 Nov 2026. Commit **43a29fc4bc178931a5886c052f63c4a95489259e**, diff `git diff origin/main...43a29fc4b` (13 files). The PR head has since moved to `a49b30b8b`, a notes-only commit (drops ASSUMPTIONS row C11, rewords the `basis` text in `document-supplies-read.json`). This verdict covers 43a29fc4b only.

Copies used: my own `rv352` on :4433, configured checkpoint loaded fresh from this commit, reading reviewer stand-in reads from a scratch folder (hand-made, never committed, US$0); and the builder's `r352` on :4431, restarted **without** `STUDIO_SAVED_READS_DIR` to show the true state (still running that way, TTL 120). Playwright Chromium headless at 1440, 1024, 720 (1440 at 200 %) and 400 px. No `*_LIVE` variable set; `ai_batch` 7 before, 7 after. Judged against the concept, P-437, P-134, P-242/P-243, STANDARDS, EXPERIENCE and the journey test (`journey-test-reviewer-2026-11-09-qa352.md`, **7.5/10**).

**Overall: Ship after fixes.** 1 Major, 5 Minor. The library-driven reader and the read-for-the-application rule are sound and generic. One new path, the application's drawer holding two applicants' statements, leaves no way forward when AI is off.

## Runs (mine, not the builder's)
* `acceptance/C6.5.test.ts`: **44/49** on r352 with no saved read (red: exactly C6.5-21b, -22, -23, -24b, -25); **49/49** on rv352 with stand-in reads. `tests/check_c65_document_rules.ts` 33/33. `graph.mjs --check` exit 0 (G1 0 · G2 0 · G4 0 · G5 0).
* Library route: `library_change` holds SET_SUPPLIES for both types, proposed by user-A, approved by user-B, RELEASED in 1. The IMM 5484 quotes are verbatim in `p1/inventory/imm5484e.text.inventory.json`.
* Side effects (doubt 2), engine outputs on the checkpoint's Visitor visa release v2 with and without the two sets: `factSourceProblems`, `coverageGaps`, `conditionFactsNobodyAsked`, `formGapFacts`, `askedInOrder` unchanged. `factSources` changes one row (the spouse's union start date now comes from Document, the marriage certificate copy), as the library data intends. Preview changes one item (m5).

## Doubts checked
1. **Subject assumptions (doubt 1)**, probed on rv352 case 99a1897a, all held except M1. Checks, the client's "please check" note and the counts follow the review's subject: the client sees "Please check this answer. It did not match the proof of financial support on file." on the application's section; counts show expanded read 2. Readiness and section confirm read open checks by subject and fact. A replaced file gives 409 `not_current` and its review is hidden. Two applicants' differing statements: 14,200 used, then 9,000 opens one check on the application (BR-7). Double Confirm & use: 200 then 409. Client: 403. Confirm on Client A: 422. Checked-against on Client A: 404.
2. **Gating on reader kind (doubt 3):** a real but small hole (m3).
3. **Per-program branch in disguise (doubt 4):** none. The data is keyed by the library's document type and applied only where a combination uses it; the reader comes from `reader_profile.readerKind`, whom it is read for from resolver R5 (`isFilingFact`). No form, program or combination is named in code.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | P-437 met for proof of funds and the marriage certificate; the minor's birth certificate is left (flagged to the tech lead, not settled silently). M1 breaks BR-2 ("on reopen … the stored read") and BR-10 (resolve in place) for families. |
| D2 Data integrity | 4 | VERIFIED `document_read` on the application. Only the library's facts are kept (the stand-in's extra `person.family_name` was dropped). One check per document; no duplicate on a race. |
| D3 Reuse | 5 | The library's own supplies route and the existing reader path; saved-read replay by checksum; no new technology. |
| D4 Rule integrity | 4 | Reader and facts from library data; `readFor` is one server rule used by scope, shown, Confirm & use and checked-against. |
| D5 Stability | 2 | M1: one statement read and one without a saved read hides every read block; the section stays unconfirmable. |
| D6 Governance | 5 | Author proposes, a second person approves; cited, Sample, "Unconfirmed: expert". |
| D7 AI trust | 4 | Cost card before any read; live never offered; "A saved AI read, replayed: US$0" and confidence (Sample) shown. |
| D8 Orientation | 3 | A block read for the application does not say whose statement it is (m1). |
| D9 Flow | 4 | Replay, tick, Confirm & use, Used, all in one drawer (stand-in). |
| D10 Language | 4 | "of this document" and "letter or record" read well; "Proof of financial support, Proof of financial support: read by AI" does not (m1). |
| D11 Feedback | 3 | M1: "No saved read yet … Type the values for now" while a read, confirmed statement is hidden; the price counts the already-read file (m2). |
| D12 Visual | 4 | Unchanged panel; clean at every width. |
| D13 Accessibility | 5 | axe A/AA/2.1/2.2: no violations before and after replay and after confirm, at 1440/1024/720/400 px; no sideways scroll; Tab reaches Replay, Space ticks, Enter confirms; Escape returns focus to the button. |
| D14 Team look | 5 | No new component. |
| D15 Speed | 4 | Drawer 125–185 ms; replay 1.33 s with a busy state; no request per row. |
| D16 Testability | 3 | R8–R12 and C6.5-21 to -25 each have a pass and a fail. Gaps: the M1 path, the m3 gate, m4. |
| D17 | — | Simulated only. |
| D18 Provenance | 4 | File, page, reader, confidence shown; holder not named (m1). |
| D19 Closure | 4 | The used funds fill the application at once; the answer sheet carries 14200 (builder's walk 04, not re-walked). |
| D20 | — | Simulated only. |

## BIC scorecard (EXPERIENCE §6)
| Check | Score | Evidence |
|---|---|---|
| BIC-01 | Met | Once used from the statement, the funds are the application's answer; Client A's sections never offer them (C6.5-21d). |
| BIC-02, 03 | N/A | No new question. |
| BIC-04 | Met | "Not on these documents" lists the rest with "Answer it" (stand-in walk). |
| BIC-05 | Partly | Document, page, reader, Open, one Confirm & use; whose document it is is not named (m1). Per-value Reject is "Not built". |
| BIC-06 | Met | The AI value is expanded with a "Matches the document" tick; Confirm & use stays disabled until ticked ("1 left"). |
| BIC-07 | Partly | A differing second statement opens a check with both values; under M1 that check cannot be reached on screen. |
| BIC-08–10, 12, 15–17 | N/A | Outside this change. |
| BIC-11 | Met | One primary per block. |
| BIC-13 | Not met | M1: section confirm says "resolve it first" (409 `open_checks`); the drawer offers no way to do it. |
| BIC-14 | Met | Unchanged; the reader subtitle's title text is present. |
| BIC-18 | Partly | No-saved-read and used states drawn; the mixed state draws the wrong state (M1, m2). |
| BIC-19 | Met | One heading and one primary per panel at 1440 and 1024 px. |
| BIC-20 | Met | Keyboard path complete; works at 1024 px and 200 %. |

## Issues, ranked
**M1 Must (Major): one applicant's statement without a saved read hides every read statement and its open check, and the application's section can then never be confirmed.** New with this PR: before it, a scope held at most one AI-read document (the case-level letter), because a newer file of the same type for the same person replaces the old one. Now every applicant's "Proof of financial support · each applicant" lands in the application's scope.
* Steps (rv352, case `a1b515ee-362e-442e-8933-31636472e527`): (1) the officer types the funds as 15,000; (2) Client A's statement is replayed and used, opening a check (15,000 against 14,200); (3) Spouse A uploads another statement with no saved read; (4) reopen the application's drawer.
* Result: only "Proof of financial support, Proof of financial support: read by AI … No saved read yet … Type the values for now." Client A's block, its Confirm & use state and its check are gone. Section confirm refuses: 409 "funds available cad … differs from a document (an open check): resolve it first". Screenshot (not committed): `/tmp/claude-0/-home-user-xpatready/0faa7bad-453b-5011-ba89-1ba7ef14f26f/scratchpad/rv/shots/mixed-01-check-hidden-1440.png`.
* Cause: `case-documents.ts:430` puts AI documents in `waiting` only when a rules document sits beside them; otherwise `readOnce` throws 409 `cost_first` (no mode) or 409 `no_saved_read` (replay, line 327) for the whole set, so `documents-drawer.tsx:75` gets `fill = null` and draws no review block. Breaks STANDARDS §3 [M] "Works by hand with AI off or failing", concept BR-2 and BR-10, BIC-13.
* Fix: without a mode, return the stored reviews and list every unread AI document in `waiting_for_cost` (not only beside a rules document); in replay, read each document that has a saved read and report the others one by one instead of failing the set. Add a pack pair: two applicants' statements, one saved and one not; the saved one's block, Confirm & use and check stay reachable, the other shows its cost card.

**m1 Should:** a block or cost card read for the application does not name the holder; two statements show as two "Proof of financial support" blocks, told apart only by file name. Fix: the server adds the holder's label to a document read for someone else.

**m2 Should:** the cost card prices documents already read (US$0.05, at most US$0.40, for two files when one is read); `…/plan` should count unread documents only. Likely goes away with M1.

**m3 Should (doubt 3):** C6.5-21 to -25 print a NOTE and pass when the release's library does not read proof of funds as a record, so a change in the checkpoint's reading of the type, or a refused step 335 (listed only in `formSetup.refused`), would hide behind it. Fix: one generic release check that fails, not notes: every checklist type with `supplies_facts` has a reader or is an identity document named "read by a person".

**m4 Should:** untested new paths. The new subject filter in `shown()`: removing it would surface the application's review under `GET /proposals?subject=<Client A>` and turn no test red (STANDARDS §5 [M]). Also checked-against-document on the application with a member's statement (the pass case).

**m5 Should (follow-up row, Preview/C4.5):** Preview's questionnaire now offers "missing: Proof of financial support" for the principal (`engine/runtime/preview.ts:188`); marking it changes nothing, because the funds are the application's fact and `fromDocument` never skips them.

**For the tech lead:** the minor's birth certificate is still read by a person. P-437 names "MRZ rules, AI vision"; P-134 says AI never reads identity documents. The builder flagged the conflict and did not settle it, so QA-352's third named document is not closed by this PR.

**Seen, not caused here:** the open-checks refusal says "funds available cad" (`labelOf` falls back to the key when `question_text` is null; the drawer relabels, the refusal does not); the success toast reads "1 value now fill the forms".

## What I could not check
A real saved read (none exists until the tech lead's paid run; post-read steps were walked with stand-ins); the answer sheet (not re-walked); a real screen reader; D17 and D20 stay with the founder.

**Verdict: Block** (commit 43a29fc4bc178931a5886c052f63c4a95489259e). To fix: **M1**. Should: m1–m4. m5 goes in a follow-up row.

## Round 2 (diff only, P-293): `git diff 43a29fc4b..1f6774cef`, 9 Nov 2026
Commit **1f6774cef3c93cc55f616ccc7afc1087cb69cfc2**. I restarted r352 (:4431) on this code in the true state (no saved read). My own `rv352b` (:4434, checkpoint loaded fresh, reviewer stand-ins) and `rvapi` (:4435, a fresh copy) are both stopped now. US$0; `ai_batch` 7 throughout.
* **M1: fixed.** I re-ran my scenario on rv352b (case `d61dae35-…`): typed 15,000, used Client A's statement, then added Spouse A's statement with no saved read.
  * The drawer now shows Spouse A's cost card ("Proof of financial support · Sample Spouse A: read by AI … No saved read yet") above Client A's block, and the check is in it: "the answer is CAD 15,000 (you entered it); the document reads CAD 14,200. Which is right?"
  * I resolved the check in the drawer ("Keep the current answer" plus a reason, then "Check resolved · kept over the document"). Section confirm then answered 201.
  * Both files unread, only one with a saved read: the drawer offers Replay, saying "No saved read yet for one file (Proof of financial support · Sample Spouse A)". After Replay, Client A's block shows and Spouse A's card stays.
  * Server: in `fill()`, a refusal only for lack of a saved read (`no_saved_read`) or because it is an identity document (`identity_document`) now waits on its own; any other refusal, including live, still fails the request. The single-document 409 is kept (D10, 74/74).
  * No page errors. axe clean in the drawer at 1024 and 400 px, no sideways scroll.
* **m1: fixed.** A document read for someone else is named "· Sample Client A" or "· Sample Spouse A" in reviews, plan and `waiting_for_cost`. Its own holder's view is unchanged.
* **m2: fixed.** The price covers unread files only: US$0.05/0.40 for two, US$0.03/0.20 once one is read. C6.5-21g checks it.
* **m3: fixed.** C6.5-21e fails, rather than notes, on the checkpoint when either type lacks its reader kind or its facts.
* **m4: fixed.** C6.5-21h fails if `shown()`'s subject filter is removed: the letter's review would then show under Client A. C6.5-21i gives 404 where the old code gave 422. C6.5-23c covers checked-against-document on the application.
* **m5:** not changed. It is a follow-up row for the Preview owner, listed in the PR, as I asked.
* Runs on 1f6774cef:
  * `C6.5.test.ts`: **49/56** on r352 (true state), **56/56** on rv352b (stand-ins).
  * `C6.5-screen.test.ts`: 33/33.
  * `check_c65_documents_api.ts`: 74/74 (fresh copy).
* **n1 Should (record only):** the true state has **seven** expected reds, not six. They are -21b, -22, -23, -23c, **-23d**, -24b and -25. C6.5-23d needs Client A's statement read, so it waits on the same saved read. M1 is still guarded in the true state by C6.5-21f and -21c (the letter's stored read stays shown beside an unread proof of funds, without a mode and on replay). Fix: name -23d among the reds in the PR body.
* Still with the tech lead: the minor's birth certificate (P-134 against P-437).
* Journey re-score: **9.5/10**, a pass. Task completed, next step, feedback and recovery are now 1. Plain words stays at ½ because of the earlier "funds available cad" refusal, which was already there before this PR.

**Verdict: Approve** (commit 1f6774cef3c93cc55f616ccc7afc1087cb69cfc2). No Blocker or Major is open. Should: n1 (PR body). m5 is a follow-up row.

## Round 3 (diff only, 9d56a3538)
Scope: `git diff 976442e0e..9d56a3538` only (P-277, P-303). It covers `api/src/case-documents.ts`, `tests/check_c65_document_rules.ts` and `acceptance/C6.5.test.ts`, and implements the tech lead's P-294 ruling: a reader's value is stored and used in its fact's own type. Commit **9d56a35385de1e324a6786b5dff9f4b7f27c0c12**. My own copy `rv352c` ran on :4465, configured checkpoint loaded fresh each time (`/api/demo/reset`, `/api/demo/load {sample:"configured"}`) and stopped in the same command. Live AI off. `ai_batch` 7 before and after, US$0. Scripts and screenshots are in my session scratchpad (`/tmp/claude-0/-home-user-xpatready/8ab19aa1-41e0-57d3-a215-c76b426a9a15/scratchpad/r3/`) and are not committed.

**Runs (mine)**
* Unit check `check_c65_document_rules.ts`: **41/41**, exit 0.
* Each rule's test fails when its rule is removed. I took out, one at a time, the whole-number rule, the money rule (`shapeOf(...).money`) and the currency list. Each gave 40/41, failing R13 fail, R15 fail and R15 fail. I reverted each with `git checkout`, and the tree is clean.
* `C6.5.test.ts` on a fresh copy: **57/57**, exit 0.
  * C6.5-23e reads the real `p2/runs/studio-document-read-fca97932….json` by the uploaded file's sha256 and asserts `saved === "14200.00"`, so an edited or replaced read fails it.
  * Underneath: `read_value` holds `14200|used|…The document reads "14200.00".` and the application's answer is `14200|VERIFIED`.
  * C6.5-23e fails if the store step in `readOnce` is removed: `value_json::text` would be `"14200.00"`, quotes included. C6.5-23 fails if `typedOf` is removed from confirm: the value would be left, not used.
* Browser walk, Playwright Chromium headless, case officer, with the real saved read.
  * The drawer opens in 181 ms. Replay shows "Funds available for the stay, in Canadian dollars (Details of visit to Canada): **CAD 14,200** · page 1 · confidence 97% (Sample) · Stated as 'Funds available: CAD 14,200.00', … The document reads "14200.00"."
  * Confirm & use stays disabled until the one tick ("1 left"). I ticked with Space and confirmed with Enter. Underneath: `14200|VERIFIED|document_read`.
  * axe on the drawer: 0 violations. At 400 px: no sideways scroll. No page errors.
* `inFactType` probe, 26 inputs against both real transforms: IMM 5257 `number_as_text (CAD, max 12 characters)`, where money is true, and IMM 1294 `number:whole_dollars`, where money is false. Nothing is rounded and nothing is converted:
  * "14200.000", "C$ 14,200.00", "CAD14200" and "14200CAD" become 14200.
  * "1,000,000,000,000" and "99999999999999999999" are refused by checkType: 12 characters at most, and n > 1e12. So JavaScript's loss of precision on very large numbers is never written.
  * "14 200", "14.200,00", "14200.", "14200 cad", "-14,200" and "14,200.00$" stay proposals, each with its reason.
* Old read stored as text, simulated on my throwaway copy. I turned off the `read_value` guard for one statement and set the value to `"14200.00"`.
  * The drawer list gives value 14200, `left_why` null, `needs_look` true, and `differs` false against an equal answer.
  * Confirm & use answers **agreed**, with no check. checked-against-document answers 200.

**Paths checked against the diff:** `readOnce` (stored typed, with a note); confirm-and-use (`notWritable` on the raw value, then compared, written and put in the check's `documentValueJson` as typed); the drawer list (`value`, `differs`, `kept_over`, `left_why`, `needs_look`); and `checkedAgainst`. All use one rule: `notWritable` → `inFactType` → `checkValue`. A value the type cannot hold stays raw and is refused with its reason. No combination key and no form number appear in the code (P-319, P-425). Saved reads and earlier pack expectations are unchanged.

**Issues (none Blocker or Major)**
* **m1 Should, the counts miss old text reads.** `api/src/document-review-counts.ts:35`, with `document-review-rule.ts:30`, compares the raw `v.valueJson`.
  * Scenario, reproduced on rv352c: a read stored as `"14200.00"` before this commit, then the officer types 14200 by hand. The counts go from `corrected 0` to **`corrected 1, rate 1`**, while the drawer says `differs: false` for the same pair. Before this commit that read counted as `left`.
  * Real exposure is near nil: the funds' saved read arrived in 976442e0e on this unmerged PR, so no demo database holds it as text. But `typedOf`'s comment promises older reads are handled.
  * Fix: export `typedOf` and pass `valueJson: typedOf(s, v.fact, v.valueJson)` into `countCorrections`.
* **m2 Should, wrong reasons for common Canadian amounts.** In `case-documents.ts:229-233`, every case below stays a proposal, so nothing wrong is written, but the reason a person reads is wrong:
  * "$14,200 CAD" is refused as "naming two currencies".
  * "CAD$14,200" says "in CAD, not Canadian dollars".
  * "CAD $14,200" is refused as "not a number this question can take".
  * Fix: treat `$` beside CAD/C$/CA$ as Canadian dollars, or word these refusals truthfully.
* **m3 Should, decimal numbers skip the whole-number rule.** `case-documents.ts:226` returns any non-text value as it is. So a reader's JSON number 14200.5, on a fact whose forms do not say CAD (money false, checkType allows decimals), is written as 14200.5, while the text "14200.5" is refused as "not a whole number". The ruling's whole-number rule is about values the type cannot hold. No saved read gives such a value today.
  * Fix: apply the same whole-number test to numbers, or record why decimals are allowed there.
* **n1 Nit, the note's wording.** The note "The document reads "14200.00"" (`:236`) is what the reader gave. In the drawer it sits right after the reader's own "Stated as 'Funds available: CAD 14,200.00'". "The reader gave "14200.00"" would be exact.
* **n2 Nit, a leading-zero group.** "00,200" is accepted as 200 (`\d{1,3}` allows a leading-zero group).
* Observation, not a finding: money is decided by `shapeOf(...).money`, as the ruling says. On a release where only IMM 1294 maps the funds (no "CAD" in its transform), "CAD 14,200.00" is left as "takes a plain number", while "14200.00" still becomes 14200.

* Journey re-score: **10/10**, a pass. Plain words rises to 1: the earlier "funds available cad" refusal is gone for the real read, which now shows "CAD 14,200" and confirms in one step. m2 and n1 are minor wording, not a criterion's fail. The report is `journey-test-reviewer-2026-11-09-qa352.md`, Round 3.

**Verdict: Approve** (commit 9d56a35385de1e324a6786b5dff9f4b7f27c0c12). No Blocker or Major is open. Should: m1, m2 and m3, here or in a follow-up row. Nits: n1 and n2.
