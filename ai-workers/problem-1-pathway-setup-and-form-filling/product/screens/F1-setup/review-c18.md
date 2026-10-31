# Review: F1 slice C1.8, copies per form line (commit 727ea2a7)

Reviewer: independent reviewer agent, fresh context (did not build it). Date: 31 Oct 2026.
Branch `claude/youthful-pascal-ecazqy`, commit **727ea2a7**, diff `origin/main...727ea2a7` (12 files, +180/−12).
Copy: isolated `screens_rev` on :4442 (`xr_studio_screens_rev`), web/dist as shipped. No live AI, US$0.
Agreed design: Screen 03 `concept.md` (Form line "who, copies, minimum age, only if, channel, signed by"; table column "Who and copies"; `PATCH …/forms/:line {who, copies, …}`), its `lead-check.md` (the message "Copies is a whole number from 1 to 9."; point 2, a field error clears when the field is edited), `qa/CAPABILITIES.md` C1.8 ("Not built: number of copies per line").
Scope: the setup side only. Runtime filling N copies belongs to runtime and is not a finding (P-26).

## Verdict: Ship (no Must issue)

## What I ran
* `tests/check_c18_copies.ts 4442 xr_studio_screens_rev`: **20/20** on my copy.
* `tests/check_c18_copies_browser.cjs`: **11/11**. I ran a copy with the screenshot folder pointed at /tmp, so the committed screenshots stayed as they were. axe WCAG 2.2 A/AA found no violations.
* My own Playwright journeys (journey report `journey-test-reviewer-2026-10-31-c18.md`) covered these: keyboard only at 1024 px; 720 px (1440 at 200 %) and 400 px; the approver's view; two tabs saving the same line; emptying the field; a document line; Submit then Approve and release.
* Data check: draft row v2 `copies=3` sits beside published v1 `copies=1`. The audit line `detail` carries `"copies": 3`. Release v2's snapshot has `{"form_number":"IMM 1295","copies":3}` and release v1's snapshot is untouched.
* Graph: `graph.mjs` reports G1 0 · G2 0 · G3 2 (attachments routes, not this slice) · G4 0 · G5 0 · G6 0. C1.8 is now named by both new checks.

## Check by check
1. **Concept fit.** The line panel has Copies, and the table column "Who fills it" now reads "Each applicant · 3 copies each" (the concept's "Who and copies"). The PATCH accepts `copies`. The message matches the lead-check text word for word. The error clears when the field is edited (lead-check point 2 holds). Document lines get no Copies field.
2. **Use as publisher and approver.** Keyboard only: Tab reaches Copies, typing 3 and pressing Enter on "Save to draft" saves it. At 1024 px, 720 px and 400 px the page never scrolls sideways. The approver sees "· 3 copies each" read-only and gets no Change button. The server refuses an approver PATCH with 403.
3. **Words.** "Copies", "Copies of this form for each person it names, 1 to 9. Sample." and "N copies each" are plain and match PRODUCT §4 style. One conflict is listed as m1 below.
4. **[M] lines.** Field errors are Problem Details on the field (400, `field: copies`). Stale saves get a 409 naming who changed it, shown in the panel (screenshot j5). Undo is exact. The migration only adds a column (`NOT NULL DEFAULT 1` plus `CHECK 1..9`), so existing data is kept. The server enforces the author duty (`need(actor,"author")`). The value is marked Sample. No per-row requests (the value rides on the existing workspace read).
5. **Code.**
   * `copies` is saved through the existing `revise`, the revision guard and the audit, next to minAge and signedBy (`api/src/studio.ts:570-572`).
   * The snapshot writes `copies` only when it is above 1 (`engine/snapshot.ts:164`), so released fingerprints do not move. The test checks the config sha is the same before and after Undo.
   * `lineSig` adds copies only when above 1 (`api/src/form-uses.ts:106`), so steps recorded before this change keep their signature. Undo restores the whole row, `copies` included.
   * Rule removal: dropping the `>1` guard, the DB check, the author check or the lineSig term each makes a named case fail.
6. **Retrofit mapping.** The team's model has no copies field to map to. The schema comment marks it "Sample until the immigration expert confirms". No mapping record is needed for an expand-only column, so this is not a finding.

## Scores (this slice only; evidence from my run)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | Concept line and column, PATCH field and lead-check message all present |
| D2 Data integrity | 5 | zod 1..9 integers, DB CHECK refuses 12, 409 on a stale save, two-tab race keeps the first save (4) |
| D3 Reuse | 5 | One column on the existing line; no new table or near-duplicate |
| D4 Rule integrity | 4 | No rule depends on it yet. A document line can still be given copies by direct API call (m2) |
| D5 Stability and recovery | 5 | Undo exact, a refused value keeps the saved 2, an emptied field means 1 |
| D6 Freshness and governance | 4 | Audit line carries copies. The Review change set only says "changed", as for every line edit (existing behaviour) |
| D7 AI trust | n/a | No AI in this slice |
| D8 Orientation | 5 | Same panel and tab, crumbs unchanged |
| D9 Flow | 5 | Change, type, Save to draft (3 actions); the draft bar and Review and release update |
| D10 Language | 4 | Plain words, Sample marked; the hint conflict in m1 |
| D11 Feedback | 5 | Error on the field, toast "IMM 1295 saved to the draft", row updates, draft bar counts |
| D12 Visual quality | 5 | Field sits in the existing two-column grid; the row suffix is muted like "· 30+" |
| D13 Accessibility and responsive | 4 | axe clean, keyboard path works, no sideways scroll at 1024/720/400. Focus goes to `<body>` when the panel closes, as before this commit |
| D14 Team look | 5 | Existing Field, Input and tokens |
| D15 Speed | 5 | Saves and redraws well under 1 s locally; no extra request |
| D16 Testability | 5 | A passing and a failing case per rule, API and browser, rerun green here |
| D17 First use | simulated only | No intended user walked it |
| D18 Provenance | 4 | Sample marked; the immigration expert's confirmation is pending (as the schema comment says) |
| D19 End-to-end | 3 | It reaches the released snapshot. Cases do not yet fill N copies (runtime's area, outside this PR) |
| D20 Pain and wow | simulated only | Not walked by an intended user |

Journey score (reviewer, the one score for this check): **9.5/10, pass**. Details are in the journey report.

## Issues
No Blocker. No Major.
* **m1 (Should, Minor): conflicting hint.** `web/src/pages/workspace/forms.tsx:290` "Who fills it" still says "One copy for each person it names." Directly below it, Copies can say 5 (screenshot j5 / j3). Fix: change the Who hint to something like "Whose form it is: one form for each person it names." or drop the copy count from it.
* **m2 (Should, Minor): server accepts copies on a document line.** `api/src/studio.ts:570-572` accepts `copies` for a document line, which the UI never offers. A direct PATCH sets `copies: 3` on a checklist line and the snapshot would carry it. Fix: refuse it on the field (400 "Copies apply to filed forms only.") when the line's form is a document. Add a failing case.

Noted but not counted against this commit (existing behaviour, same for min_age, signed_by and channel):
* `engine/import.ts:83` does not carry `copies` from an imported release.
* At 400 px the panel footer cuts off "Save to draft".
* Focus is not returned to the row's Change button when the panel closes.

## Could not check
* A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder).
* Runtime use of copies (not in this PR).
* The full run-suites (running elsewhere on 15400-15499; not touched).

**Verdict: Approve** — commit 727ea2a7. Blockers: none. Majors: none. Minors: m1 (Who-fills-it hint contradicts Copies), m2 (server accepts copies on a document line).
