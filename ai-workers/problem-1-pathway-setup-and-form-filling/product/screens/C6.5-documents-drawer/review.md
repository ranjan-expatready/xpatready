# Review: C6.5 part 2b, the "Fill this from documents" drawer (PR #1374)

Reviewer session (did not build it), 8 Nov 2026 (IST). Commit **c5415ebff6b6234ed8ab4fdce121bfce49f713db**, scope `git diff origin/claude/affectionate-darwin-hhhzii...c5415ebff` (6 files). Isolated copy `rv_c65d` on :4434, fixture `setup_visitor_visa.ts` + `setup_vv_m3.ts`, Playwright Chromium headless, 1440 / 1024 / 720 (1440 at 200 %) / 400 px. US$0: no `*_LIVE`, `ai_batch` unchanged. Judged against `concept-draft.md` (BR-1 to BR-14, §6), `design/draft-documents-drawer.html`, `challenge.md`, Lead 35 on #1369, `EXPERIENCE.md`, `STANDARDS.md`, `QUALITY.md`. Journey score: **8.5 / 10** (`journey-test-case-officer-2026-11-08.md`).

**Overall: Ship after fixes**: 2 Major, 10 Minor. The server check of the ticks (L-SA9) is correct and well placed. The drawer is clean and accessible. The gaps are one half-built rule (BR-12) and missing concept §6 test pairs.

## Runs on my copy
* `acceptance/C6.5-screen.test.ts`: 21/21. `acceptance/C6.5.test.ts`: 30/32 (only C6.5-19b and -20, no saved letter read: out of scope). `tests/check_c65_documents_api.ts`: 61/61, including the three L-SA9 lines.
* `graph.mjs` exits 0 (G1 0 · G2 0 · G3 21 · G4 0 · G5 0 · G6 9). For this screen: `GET /runtime/documents/:id/file` is listed with no test and no page (m9). `documents-drawer.tsx` is imported. C6.5 is named by tests.
* Server (`case-documents.ts`): `needsLook` uses the same filter as the Confirm & use write loop (placement, not per_row, not a declaration, scope, `notWritable`, agrees or no answer). So no value can be written VERIFIED without a tick or check digits. The 422 is raised inside the transaction after the `confirmedBy` lock, so it rolls back. Walked: the stale tab got 422 "family name is not ticked", `confirmed_by` stayed empty, and the drawer reloaded with the new tick. Foreign id: 422 `not_this_document`. Client: 403 before the body is read. A double click confirmed once. Audit lines exist for read, confirm, resolve and mark-checked (`audit_event`).

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | BR-1–11, 13, 14 built. BR-12 half built (M1). BR-9 `closed[]` not listed (m2). |
| D2 Data integrity | 5 | 422 writes nothing (stale tab, `confirmed_by` empty). Double click: one confirmation. Used = VERIFIED `document_read`. Corrected = DECLARED `agent_view`. |
| D3 Reuse | 5 | Reuses `QuestionField`, `putAnswer`, `refusal`, `Panel`, `Field`, `Textarea`, `Notice`. No new technology. |
| D4 Rule integrity | 4 | The server decides `differs`, `left_why`, `needs_look`. Only mark-checked visibility is decided in the browser (m7). |
| D5 Stability | 4 | 409 and 422 show the server's words, then reload. Reload drops ticks (client state; the server re-asks). |
| D6 Governance | 4 | Audit for read, Confirm & use, resolve and mark-checked. The reason is kept in any script. |
| D7 AI trust | 4 | The letter's cost card comes before any read; no live read offered; confidence marked Sample. Replay not walkable (no saved read). |
| D8 Orientation | 4 | Header "Fill from documents · Sample Client A · Personal details". A value that fills another section shows no section (m4). |
| D9 Flow | 4 | "Tick or correct each value first: 2 left". One click. Resolve and Answer it happen in place. |
| D10 Language | 3 | Fact words in the resolve heading and the 422 ("given names:", "family name is not ticked") (m1). Tooltips missing (m5). "Open" (m3). |
| D11 Feedback | 4 | Busy buttons, skeleton, inline errors. The result is only a toast (m2). Brief stale row after Correct it (m10). |
| D12 Visual | 4 | Team panel, 560 px, quiet. Two filled Save buttons in one block after confirm (m6). |
| D13 Accessibility | 5 | axe A/AA/2.1/2.2 clean at 1024, 720, 400 (pack: 1440). Tab stays in the panel. Escape returns focus to the opener. No sideways scroll. |
| D14 Team look | 4 | Panel, Pill, Notice and Field as on the Agent view. 13 px is existing practice (119 uses in 18 files). |
| D15 Speed | 4 | Open + read 264 ms. Confirm & use 1.36 s with a busy state. No request per row; one shared open-checks query. |
| D16 Testability | 3 | 21 screen checks and the L-SA9 pair. Six concept §6 pairs are missing (M2). |
| D17 | — | Simulated only. |
| D18 Provenance | 4 | Page, reader, check digit and the file on each value. The Agent view shows "read from a document". |
| D19 Closure | 4 | Used values fill the forms at once ("fills IMM 5257 …" on the Agent view row). |
| D20 | — | Simulated only. |

## BIC scorecard (EXPERIENCE §6)
| Check | Score | Evidence |
|---|---|---|
| BIC-01 | Met | The used passport number fills IMM 5257/5476/5707 at once (walk 1, Agent view section). |
| BIC-02, 03 | N/A | Asks no new question; a used value changes like any answer. |
| BIC-04 | Met | "Not on these documents" lists the open questions with Answer it, in place. |
| BIC-05 | Partly | Document, page, reader and Open on each value. No per-value Reject (Not built, as the concept says). |
| BIC-06 | Met (as amended by P-243) | The server now refuses Confirm & use without the ticks (422). Number, DOB and expiry collapse only on passed digits. |
| BIC-07 | Met | Both values, who gave each ("you entered it"), reason required, audit "resolved". |
| BIC-08–10, 12, 15–17 | N/A | Out of this screen's scope. |
| BIC-11 | Partly | One Confirm & use per block. After it, two open checks give two filled Save buttons in the same block (walk 1, step 6). |
| BIC-13 | Met | "Give a reason for keeping this value." sits on the field and the typed text is kept. 422 and 409 use the server's words. |
| BIC-14 | Partly | The button's tooltip is there. The concept §4c tooltips on reader, check digits and "n to resolve" are not. The held Confirm & use tooltip is on a disabled, unfocusable button (its words are visible below). |
| BIC-18 | Met | Loading skeleton, empty ("Nothing to read here"), no saved read, failed digit, confirmed, 409 confirmed by someone else. |
| BIC-19 | Partly | One heading per block, red only for errors. The two-primaries case as in BIC-11. |
| BIC-20 | Met | Keyboard path to tick (Space) and Confirm & use (Enter). Focus stays in the panel. 1024 px, 200 % and 400 px fit. |

## Issues (Must = Major, Should = Minor)
* **M1 Must (BR-12, board frame 5):** "Mark checked against the passport" is never offered on **an answer kept by a resolved check**. The server accepts it (200 on walk 1's family name after "Keep the current answer"). This drawer is the only web caller of `checked-against-document`, so pack step C6.5-17's flow (resolve, then mark checked) has no screen path. Fix: show the button on that value's row once its check is resolved with the answer kept (`documents-drawer.tsx:218-219` / `:279`), and add the test pair. Note, not counted: "place of birth once typed" is refused by the server (422 `not_evidence`: the passport does not give that fact). The concept and #1369 disagree there; the drawer follows the server.
* **M2 Must (concept §6, DoR, D16):** `C6.5-screen.test.ts` lacks these concept §6 pairs, so removing any of these behaviours fails no test:
  * the second click's 409 shown in IST;
  * Answer it with a stale `expectedId` (409);
  * Correct it, then Confirm & use opens a check with "Keep the current answer" chosen;
  * mark checked gives `checked_against`, and is refused 409 `open_checks`;
  * BR-13: a national ID listed as read by a person, never proof of funds or the absent parent's passport;
  * the keyboard-only path.

  I walked the first three and they work by hand. BR-13 could not be walked: this fixture has no national ID line.
* m1 Should: the resolve heading uses the server's fact word ("given names: the answer is CLIENT ALPHA … the document reads CLIENT A") instead of the row's question label and the document's name (`:313`). The same applies to the 422 text (`case-documents.ts:409`, `labelOf`).
* m2 Should (BR-9, frame 5): the server's `message` is only a toast that disappears, and `closed[]` checks are never listed with their reason (`:168`, `:224`).
* m3 Should (BR-3): the button reads "Open", not "Open the passport" (`:141`; the aria-label is fine).
* m4 Should (BR-4): a row shows its section only when the value fills the opened section (`:241`). Use the section from the Agent view for every value.
* m5 Should (BIC-14, concept §4c): no tooltips on the reader, "Check digits" or the "n to resolve" pill (`:54`, `:181`).
* m6 Should (BIC-11): the resolve and in-place Save buttons are filled. Two show in one block after Confirm & use (`:285`, `:319`).
* m7 Should: "Mark checked against the document" is shown on a value whose check is open (photocopy block, given names), where the server refuses with 409 `open_checks`. Its visibility is decided in the browser (`:279`).
* m8 Should (BR-2): the loading text is "Reading the documents…", not the concept's rules / no AI / US$0 words (`:91`).
* m9 Should (P-86): the graph cannot see the file route, because the drawer (`:135`) and the test (`:98`) use a raw `fetch`.
* m10 Should: after Correct it → Save, the form closes before the reload, so the row briefly still shows its tick (`:264`).

## Outside this diff (for the tech lead; not counted)
* The #1369 route accepted "Mark checked" for citizenship answered "Afghanistan" against a passport reading IND, which made it VERIFIED. The country code could be compared.
* Agent view times are browser-local ("16:38") beside the drawer's IST ("22:08"), from the existing `when` in `questionnaire.tsx`.
* A passport-line file with no coded lines shows every value as "could not read" and still offers Confirm & use, which writes nothing.

## Not checked
* A letter replay (no saved read on the fixture; C6.5-19b and -20 wait for it).
* BR-13 with a national ID (no such line).
* A real screen reader.
* An intended user's unaided walk (D17, D20).
* The checkpoint run (in progress, per the builder).
* Typecheck and the `any` count (builder's figures, not re-run).

**Verdict: Block** at c5415ebff6b6234ed8ab4fdce121bfce49f713db. Fix before `review: approved`:
1. M1: offer "Mark checked against the passport" on an answer kept by a resolved check.
2. M2: add the six missing concept §6 test pairs to `C6.5-screen.test.ts`.

Minors m1–m10 are fixed or listed as a follow-up row.
