# C4.5 · Facts this document supplies — independent review (PR #1005 at ec43f2a89)

Reviewer agent, Opus, did not build it; 5 Nov 2026 (IST). Scope is the tech lead's ruling: the API person's step, the Preview `missing:` key, the release line by name, the read-only block on the change page, two copy fixes, the sample, the pack and helpers, the release check and the walk. The editable panel (concept §4) waits for approval and is **not** scored as missing.
**How it was run:** this worktree had another session's uncommitted edits (`supplies-panel.tsx`, `preview.tsx`, `documents.tsx`, `library.tsx`, `document-supplies.ts`) while the check ran, so everything ran on a clean `git archive` of **ec43f2a89** (and of merge base ee65f3cf4 for regressions) in the reviewer's scratch folder, port 4453 only, a fresh database each run, live AI off, US$0.

## Verdict: Ship after fixes (Rework not needed): two Majors, both small
Journey score **8/10** (pass), report: `journey-test-reviewer-2026-11-05.md`.

## Builder's results, re-run
| Claim | Re-run on ec43f2a89 |
|---|---|
| Pack C4.5 26/26, exit 0 | 26/26, exit 0, **twice** on fresh copies (30 s) |
| Release check 7/7 | 7/7, exit 0 |
| Walk 10/10 | 10/10, exit 0, **twice** |
| C4.x / C10.1 fail the same on main and branch | REGRESSION_ROW |
| Rule tests fail when the rule is removed | Mutations in the scratch copy: removing the Preview `missing` filter fails C4.5-16; removing "Nothing changes" fails C4.5-23 (24/26, exit 1) |
| Types | `tsc --noEmit` web clean; api errors only in older `tests/` files, none in this PR's files |

**Official words (AGENTS rule 4, P-170):** all 6 distinct quotes appear word for word in `expected/source-text/imm5484e.xfa-template.txt` (5) and `imm5257e.xfa-template.txt` (names). Edition marks "05-2026" and "IMM 5257 (09-2023)" are in the text. `pdftotext` page 1 of `imm5484e.pdf` holds the passport and legal-status lines. The SHA-256 of both PDFs matches the sample's `about`. Each fact has a date read; Sample, Unconfirmed: expert. Citizenship's source names the legal-status line (challenge m1). Place of birth → city and country stays an expert question (concept Q3).

## D1–D20 (1–5)
| # | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | BR-1…BR-8 behave as written at the API, Preview and release; the returned change page does not (M1) |
| D2 Data integrity | 5 | 3 concurrent proposals → one WAITING row; double Approve → one 201 and one 409; Changed since 409; merged, twice, unknown and future-date refused |
| D3 Reuse | 5 | the one `library_change` door, shared fields only, the document type master; no copies |
| D4 Rule integrity | 4 | the fallback question stays placed (C4.5-14); the `warnings` path is never exercised (m2) |
| D5 Stability, recovery | 3 | reload is fine and the server stays safe on races, but a returned change is a dead end in the UI (M1) |
| D6 Governance | 5 | dated cites; author ≠ approver on the server; audit "proposed" and "approved" lines; release only when published with the facts |
| D7 AI trust | n/a | no AI in this row (US$0) |
| D8 Orientation | 4 | trail "To review › …" on the change page |
| D9 Flow | 3 | approver: one next action; author after a return: "Correct or withdraw" leads to a form that cannot be sent (M1) |
| D10 Language | 3 | otherwise plain, by name; but "Withdraw the new field", "undefined form fields" and a pointer to a missing control (M1, M2) |
| D11 Feedback | 4 | chips and toasts; the "undefined" toast (M1) |
| D12 Visual | 4 | the existing change-page look; shots `03-change-page`, reviewer `j1-change-1440` |
| D13 Accessibility | 4 | axe WCAG 2.2 AA 0 on To review and the change page; keyboard-only path with a visible focus ring; no sideways scroll at 400, 720 (200 %) and 1024 px; no screen reader used |
| D14 Team look | 4 | team components, nothing new |
| D15 Speed | 4 | To review first view 930 ms; change page 113 ms; one request per view |
| D16 Testability | 4 | the packs re-run and the mutations are caught; gaps m1–m4 |
| D17 First use | simulated only | |
| D18 Provenance | 5 | every fact shows form, edition, page, date read, quote and Sample; quotes checked against the committed text |
| D19 End to end | 3 | released on the fixture only (the six cannot release yet, B70); the six end at the draft and Preview |
| D20 Pain, wow | simulated only | |

## Issues
**Major (must fix before Approve)**
* **M1 · The returned change of a document's facts dead-ends on the change page.**
  * The author follows To review's "Correct or withdraw" to the new-field form "Correct it and send it again", with **Name** and **Meaning** fields.
  * Its **Send again** is always refused with 409 "…is not sent again…", the refusal this PR adds at `api/src/library-changes.ts` (resubmitChange).
  * The button reads **"Withdraw the new field"**, and the toast reads **"Withdrawn: undefined form fields back to "no decision""**.
  * Cause: `web/src/pages/review-items.tsx:116` routes every returned kind that is neither a rename nor a lifecycle kind to `<Correct>`. Line 207 reads `form_fields_reopened`, which the withdraw answer for this kind (the renaming branch) does not return.
  * Fix: for `document_supplies`, show a returned view like the RENAME branch: the Notice "Propose it again: withdraw it, then propose the facts again on its document type" plus a withdraw control worded "Withdraw it". Make the toast skip the field count when it is absent. Add one browser or pack step for the returned path. Shots: reviewer `j2-returned-author-1440`, `j2-send-again-1440`.
* **M2 · The Documents tab names a control that does not exist at this commit.** `web/src/pages/workspace/documents.tsx:139` says ""Try it missing" there shows them asked instead", but Preview has no such control at ec43f2a89. The try-out works only by editing the URL, and the walk does just that. Fix: drop the clause until the toggle ships (keep "Preview shows it … until then a case asks them"), or change the sentence in the PR that adds the toggle.

**Minor (should)**
* m1 · Graph (P-86): G3 lists `POST /library/document-types/:key/supplies` as "no test reaches", because the pack and the check call it through a variable. Write the literal path in one call.
* m2 · The API `warnings` (challenge m6, marked done) has no test. On the six every supplied fact is placed, so it never fires. Add a step with an unplaced fact.
* m3 · Nothing fails if `releaseSupplies`' "only when the published type carries the facts" guard (challenge m3, m4) is removed: the release check passes either way (reasoned, not mutated). Also, propose accepts a type whose ADD still waits (m4 was "refuse"). If that ADD is withdrawn, the APPROVED facts change stays open and blocks new proposals for the key. Medium confidence.
* m4 · BR-4 "not retired" (a retired shared field) is not tested in this row's pack.
* m5 · The same facts have two names: Library › Document types (`library.tsx` `fieldName`: "Passport number", "Birth city") and To review ("Number of the passport or travel document", "City or town of birth").
* m6 · Details on the change page says "Key: … (generated from the group and the name)", which is wrong for this kind (`review-items.tsx:114`). It shows only in the admin Details.
* m7 · `engine/validate.ts` `factName` adds `as any` (STANDARDS §7), in that file's existing style.
* m8 · No retrofit mapping (to the team's code or SA-01B) is recorded in the concept or build notes (skill check 6). The challenge also found no SA-01B cite.
* Not this PR: a double press of Approve shows an error toast beside the success toast (the shared Decide button); the server is right.

## [M] lines (STANDARDS, EXPERIENCE), only those this row touches
Met:
* Content is data: no form number in code; samples are read only by packs (BR-8, P-319).
* Pick, don't type: shared fields only, enforced at the API.
* Links checked: the server re-checks at approval.
* Released means frozen.
* Author ≠ approver on the server, deny by default (401 with no actor).
* Problem Details with field errors.
* zod contract shared with the web.
* No N+1.
* axe on each state; 1024 px and 200 % zoom; keyboard path.
* Plain words on the main path, with the exceptions in M1 and M2.

Not met:
* "Errors say what happened and how to fix it": M1 offers the refused action.
* "Every business rule has a passing and a failing test": m2–m4.
* "A rule's test fails when the rule is removed": met for the two mutated rules; not for m3.

## Concept consistency (approval pending; no defect for the missing panel)
What is built matches the concept's API, Preview key, change-page block and copy rows.
* §6 says 20 pack steps; 26 are built.
* §8 marks m3/m4 "Done", but m4 is only partly met (see m3 above).
* The waiting-state Withdraw and the "Try it missing" toggle belong to the unbuilt panel and Preview UI. M2 is about the sentence that already points to the toggle.

## Could not check
* A real screen reader.
* An intended user's unaided walk (D17, D20).
* The author's UI step (the panel is not in this PR).
* A release on the six (B70).
* GitHub CI on this commit (local runs only).

**Verdict: Block**: fix M1 and M2 (minors at the builder's judgment), then a diff-only re-review.
