# C6.5 part 2b: the "Fill this from documents" drawer (drafter, 8 Nov; revised after `challenge.md`; the tech lead approves, P-316 (3))

Board: `design/draft-documents-drawer.html` (every state at 1440 px). API: PR #1369, branch `claude/affectionate-darwin-hhhzii`, `api/src/case-documents.ts`, as amended after the challenge (proposals carry `current`, `differs`, `left_why`; the staff file route; `not_read` about this person only; `closed[]` on Confirm & use). It redraws frames 2–3 of `../M3-design-2026-11-04/documents/` and frame 3 of `../M3-agent-view/` for P-242, P-243 and P-411, and for the API as built (no `read`/`edits`, `keep: answer|document`, no counts route). All names, values and amounts are **Sample**; documents are synthetic (P-133). Unconfirmed: no counsel.

## 1. Job and journey
* **Job:** the case officer turns one received document into the person's answers in one review, sees where each value came from, never overwrites an answer silently, and types only what the document cannot give, without leaving the drawer.
* **Persona:** case officer (staff only; C6.5-8, -9c refuse the client). **Journey:** J7 3.3–3.8. **IDs:** SA-1B-34, SA-1B-260…264, SA-1B-263; team AG11-D4, AG-8-41, AG-8-23 (all Unverified: the freshness check could not run in the cloud copy); one-pager 7.3.

## 2. Ten layers
| Layer | Exists | New in 2b |
|---|---|---|
| Job, masters, links | document types, checklist lines (C6.4), `readerOf`, MRZ facts | — |
| Rules, engine | `mrz.ts` reader and collapse (P-243), `notWritable`, `sameValue`, R11 | — |
| Contract | all C6.5 routes, `current`/`differs`/`left_why` per proposal, `GET /runtime/documents/:id/file` (#1369) | none; the drawer also sends `checked: [read_value ids]` on Confirm & use, ignored until the server takes it (Q2) |
| Screen | Agent view (C4.4 renderer) with `QuestionField` and its answer save, `Panel` (560 px), `Field`/`Textarea` | `web/src/runtime/documents-drawer.tsx`; one header hook in `questionnaire.tsx`; two `CHANNEL` words there: "read from a document", "checked against a document" (BIC-05) |
| AI assist | letters by AI vision, replay only, cost card first | the cost card on screen |
| Governance | audit lines per read, file view, Confirm & use, resolve | — |
Team code: no matching screen (the reader is ours, P-169). Team look: right panel, pinned header and footer, no stacked overlays (`design/TEAM-PATTERNS.md`).

## 3. Business rules
* **BR-1 Where it opens** (P-134 D4, P-256): "Fill this from documents", a small secondary button in every Agent view section header, staff mode only (one hook). It shows "n to resolve" when that person has open checks (one `GET …/checks?state=open` per case view, one shared query key, never per section). Never on upload (C6.5-2). No entry from a checklist line (cut: extra scope).
* **BR-2 Read first, cost first** (P-110, P-175, P-295): on open and on reopen, `…/plan` then `POST …/fill-from-documents` (idempotent: the stored read, with `not_read`). Rules readers read at once ("Reading the passport's coded lines: rules, no AI, US$0"). A letter: the cost card first (`waiting_for_cost` when it sits beside a passport), then "Replay the saved read · US$0" sends `mode: replay`; live is never offered (`live_allowed` false). No saved read: "No saved read yet", no read button.
* **BR-3 One block per document, one Confirm & use** (P-242): the block names the document, file, page, reader in words, "Check digits: passed / one failed", and **Open the passport**, which opens the stored file in a new tab (staff route; the client gets 403). One primary per block; none across documents (SA1B-D77 held).
* **BR-4 Collapsed vs expanded** (P-243; `review`): collapsed values form one disclosure line, "3 values checked by the passport's check digits: passport number, date of birth, expiry". Expanded values are rows: label, section (from the Agent view), value, page, reader. Rules values say "check digit passed" or "no check digit of its own" (from `checked`); AI values show their figure marked Sample (no thresholds are set). Names carry "The name may be cut short: check it against the printed name."
* **BR-5 A look at each name, not a blanket click** (P-243, P-134 D2): a tick "Matches the document" or "Correct it" only on expanded values that will be written and do not differ (`left_why` null, `differs` false). On the Sample passport: given names, and sex in the release's answer. Confirm & use waits for those ticks ("Tick or correct each value first: 2 left"); it is **never** held by a difference (documents challenge B1). The drawer sends the ticked ids as `checked` (Q2).
* **BR-6 Differences before the click** (P-242, BR-7): `differs` true → the value beside the current answer and who gave it, from the Agent view's `channel` and `by` ("Client A typed…", "You entered…"), expanded even if the rule collapses it, sorted first, no tick: "Confirm & use opens a check for it and keeps SAMPLEDE until you choose." The browser never compares (STANDARDS §7).
* **BR-7 Order** (BIC-06): differs → could not read → left for you → to tick → collapsed line → not asked by this case → not on this document.
* **BR-8 Left for you** (`left_why`, before and after the click and on reopen): the server's reason, no tick, and **Answer it** in place (BR-11's input). An answer saved this way opens no check (Confirm & use skips left values).
* **BR-9 After Confirm & use**: "Confirmed and used by Case officer, 8 Nov, 14:05 IST" (from `confirmed {by, at}`), per row Used · Agreed · Check opened · Left for you · Not asked, the server's `message`, any `closed[]` checks with their reason, no button. 409 `already_confirmed`: built from `confirmed {by, at}` in IST, then reload.
* **BR-10 Resolve in place** (C6.5-14, P-142 D6; no stacked overlay; the app's `Field` and `Textarea`, not findings' dialog): "{Who} {typed/entered} SAMPLEDE; the passport reads SAMPLED. Which is right?" Keep the document's value · Keep the current answer; Reason required (the server's words on the field); Save sends `answerId`. 409 `changed` or `not_current` (file replaced: keep the answer, or read the new file) shows the server's words and reloads. Another value: keep the answer, then correct it in place (`keep: other` Not built).
* **BR-11 Correct it and Answer it, in place** (P-411 (2); HDSR effect, §4b): the question's own `QuestionField` (a country picker for citizenship) inside the row, saved through the Agent view's `PUT …/answers/:subject/:fact {value, expectedId}`. It fills at once, "Entered by staff · to confirm". A corrected written value then differs: Confirm & use opens its check and the resolve form opens with "Keep the current answer" chosen; the reason is still asked. Nothing the officer changed is written VERIFIED (SA1B-D107 held).
* **BR-12 Checked against the document** (P-142 D3, J7 3.6): "Mark checked against the passport" only where it adds evidence: a left value once answered, place of birth once typed, an answer kept by a resolved check. Refused 409 `open_checks` while open, 409 `not_current` or 422 `not_evidence` otherwise, in the server's words.
* **BR-13 Read by a person** (`not_read`, identity documents about this person only): "{Document}: read by a person. Check its values against it." with Open. No "type its values".
* **BR-14 Plain words** (EXPERIENCE §5): no decision numbers, file paths, fact keys or model names; the cost card's `basis` (plain words) sits under Details.

## 4. Layout (pattern: Side panel, EXPERIENCE §3; the team's `Panel`, 560 px; the file opens beside it in a new tab)
Header: "Fill from documents · Client A · Personal details". Body: one block per document. Footer: Close; the primary sits in each block. Frames: 0 entry · 1 reading · 2 review · 3 collapsed opened, ticks done, a correction and an answer in place · 4 failed check digit · 5 after Confirm & use · 6 resolve with an error · 7 reopened / confirmed by someone else · 8 letter cost card · 9 no saved read · 10 letter replayed · 11 other states.

## 4b. Best in class (repo sources only: the session's network refused docketwise.com and mitpress.mit.edu, 8 Nov; P primary, X extract)
* **Docketwise IQ Smart Docs** (X, `reports/Document first intake and OCR choice.md`): per-section request, "Review & Edit", written only on "Confirm & Import". *Copy:* per section, one confirm per document. *Beat:* a difference opens a check, never imports over an answer.
* **IRS Direct File data import** (P, study [4][5]): one "Yes, this is correct" per preview; imported data "needs to be validated by the user". *Copy:* one button per document; *add:* a tick per name (P-243).
* **AWS Textract / A2I** (P, study [12][13][83]): review routed by low confidence or a missing key; a polygon per value. *Copy:* "could not read" is its own state, first. *Later:* the region beside the value; today the file opens in a new tab.
* **Onfido** (as quoted in the same report): a name mismatch is "Caution", not fraud. *Copy:* a difference is a check with a reason, worded calmly.
* **"Bias in the Loop"** (HDSR 2026, 2,784 people, as cited there): when correcting costs more than accepting, people accept more wrong values. *So:* Correct it and Answer it are in place, one click, beside the value.
* **Effort saved:** a Sample passport fills 5 values with 2 ticks and one button; the 3 it cannot give are answered in the drawer; nothing typed twice.

## 4c. Scorecard (EXPERIENCE §6)
BIC-01 values fill every form that uses them (P-242). · 02 N/A: asks no new question. · 03 N/A: a used value changes like any answer. · 04 "Not on this document" is a state, answered in place. · 05 **Partly:** document, page, reader and the file on every value; but no per-value Reject (the API cannot leave one out), and a correction is the officer's answer before Confirm & use. · 06 **Met as amended by P-243** (date of birth and number collapse on passed digits, which BIC-06's test forbids); **Partly** until the server checks the ticks (Q2). · 07 Met: both values, who gave each, a reason recorded. · 08–10 N/A. · 11 one primary per document block. · 12 N/A. · 13 errors on the field, server words, input kept. · 14 tooltips on reader, check digits, "Replayed", the held Confirm & use, "n to resolve". · 15–17 N/A. · 18 every state drawn. · 19 one heading per block, 12/14/16 px, red only for errors. · 20 focus trapped in the panel, Escape returns it, ticks are checkboxes, the collapsed line is a disclosure; 1024 px and 200 %.

## 5. Copy
* Button tooltip: "Reads this person's uploaded documents and proposes values. Nothing changes until you Confirm & use. Typing always works."
* Block footer: "The document's values are used only on Confirm & use. A correction or answer you save is your answer at once."
* Held Confirm & use: "Tick or correct each value first: {n} left." · Empty: "No uploaded document of Client A gives a value in this section. Type the answers."
* Read by a person: "{Document}: read by a person. Check its values against it." · No saved read: "No saved read yet. The first read of this letter is a paid run that needs approval first. Nothing was sent. Type the values for now."
* Resolve error: the server's "Give a reason for keeping this value." · 409s: the server's sentence, then the drawer reloads.

## 6. Contract and tests
**Routes (#1369):** `…/fill-from-documents/plan`, `…/fill-from-documents {subjectId, mode?}` (also on reopen), `…/documents/:doc/confirm-and-use {subjectId, checked}`, `GET …/checks?state=open`, `POST /runtime/checks/:id/resolve {keep, reason, answerId}`, `…/answers/:subject/:fact/checked-against-document {document}`, `GET /runtime/documents/:id/file`, the Agent view's `PUT …/answers/:subject/:fact`.
**`acceptance/C6.5-screen.test.ts`** (`lib/browser.ts`; C6.5-24 on; 21–23 are the counts, part 2c), pass / fail per rule: button for staff / none for the client · passport read, no `ai_batch` row / letter: cost card before any read, no saved read → no button · 3 collapsed on passed digits / failed digit: nothing collapsed, number "Could not read" · ticks only on writable, agreeing expanded values / none on a differing or left value · Confirm & use held until ticked / never held by a difference · one click writes, who and when / second click 409 shown in IST · `differs` shown before the click / an agreeing name not marked · "UTO" left with its reason, no tick, still there on reopen / a valid value has none · Answer it in place fills, no check / stale `expectedId` 409 · Correct it, then Confirm & use opens a check with "Keep the current answer" chosen · resolve with a reason closes it / without one the field shows the error · mark checked → `checked_against` / refused 409 `open_checks` · Open the passport: staff 200, same bytes / client 403 · not_read lists a national ID / never proof of funds or the absent parent's passport · no fact keys, decision numbers or paths in the drawer · axe at 1440, 1024, 400 px; keyboard only; Escape returns focus.

## 6b. Capability or scaffolding
Capability, *Needed for the proof:* BR-1 to BR-14. *Not built:* the region beside a value; per-value Reject; `keep: other`; letters live (part 3); the counts (2c). Scaffolding: Sample synthetic documents; AI confidence figures Sample; storage SI-14.

## 7. Questions (tech lead; none for the founder)
1. **Record one ruling under P-294 (1):** P-411 (2) answers rows.md Q2 (a corrected value is the officer's answer, "entered by staff", on the Confirm list), and "one value that differs opens a check and the rest still fill" follows P-242 (built, C6.5-10, -12). *Recommend:* record both; SA1B-D107 stays held; the founder sees it in the morning review (P-316 (3)).
2. **Server check of the ticks (`checked` on Confirm & use, 422 naming a missing one; L-SA9 "no one-click confirm").** It changes pack step C6.5-10, a P-400 question. *Recommend:* take it in 2c with the counts; the drawer already sends `checked`.

## Definition of ready
* Acceptance test: `acceptance/C6.5-screen.test.ts` above; pack `C6.5.test.ts` 1–18b green on #1369's merge.
* Row: "C6.5 part 2b: the Fill this from documents drawer. Done when the case officer, from a section, reads a Sample passport, opens it, ticks or corrects each name, answers what it cannot give in the drawer, uses it with one Confirm & use, resolves a difference with a reason in the drawer, and a letter shows its cost before any read; 1440/1024/400 px, axe clean."
* **2b does not claim C6.5 Works or L-SA9:** no "Claims Works: C6.5" line. Still open: the counts (C6.5-21 to -23), the server check of the ticks until the tech lead rules (Q2), letters live (part 3).
* Decisions: P-242, P-243, P-411 (2), P-134 D2/D4, P-142 D3/D6, P-110, P-175, P-295, P-133, P-256. Held: SA1B-D77, D107.

## Drafter's response to the challenge (8 Nov)
* **M1:** "Open the passport" is live (the staff file route on #1369); the disabled link is gone (BR-3, frames 2–5).
* **M2:** ticks only on writable values that do not differ (BR-5); `differs` and `left_why` from the server, before, after and on reopen (BR-6, BR-8); `current` is used for the side-by-side value.
* **M3:** `not_read` is about this person only; the words are "read by a person, check its values against it" (BR-13, frame 11).
* **M4:** Answer it and Correct it use `QuestionField` and the Agent view's save in the row (BR-8, BR-11, frame 3).
* **M5:** taken as the alternative: the drawer sends `checked`; 2b claims neither L-SA9 nor Works; BIC-06 Partly (Q2, DoR).
* **Minors m1–m13:** all taken (m1 line entry cut; m2 BR-9, BR-14 and frame notes; m3 "a document"; m4 footer; m5 who typed; m6 BR-12; m7 tests; m8 empty; m9 no thresholds; m10 reopen by POST fill; m11 US$0.03/US$0.20 and `Field`/`Textarea`; m12 scorecard; m13 DoR).
