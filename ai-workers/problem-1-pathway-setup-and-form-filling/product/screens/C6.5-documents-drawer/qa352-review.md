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
