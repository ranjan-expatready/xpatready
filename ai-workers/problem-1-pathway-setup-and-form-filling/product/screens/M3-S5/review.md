# M3-S5 review: answer sheet for online-only forms (PR #1507)

Reviewer: independent session, did not build it. Live AI off, US$0, never :4400. Concept: the BACKLOG row (no `concept.md` for M3-S5). Journey test: `journey-test-reviewer-2026-11-10.md`.

## Round 2: commit e64a1d65a (diff 8648d869a..e64a1d65a)

**Verdict: Approve** for e64a1d65a. No open Blocker or Major. Two Minors remain (n1, m3), listed below; fix them in a later PR or give each a follow-up row.

Checked on a fresh isolated copy `rev_m3s5b` on :4457 with the configured checkpoint (load 137 s), stopped afterwards:
* API test: 28/28 (the builder reports 29/29; its load step was skipped here because I had already loaded the checkpoint).
* Pure test: 29/29.
* `tsc -p api`: no errors in the touched files. The 15 errors it reports are in unrelated tests and are already on the branch base.
* Browser: headless Chrome at 1440 and 1024 px. axe 0, no sideways scroll, no page errors.
* Not re-run, as asked: the suites and the C7.3/C7.7/C11.6/C11.7 packs.

| Round 1 item | Fix in e64a1d65a | Result |
|---|---|---|
| **M1** a copy made before the record disappeared | `fill-case.ts:208` lists `pdf` plus the forms this release would copy with no record read (`copyOnlyForms(s, new Map())`) that have copies. The Online line adds "A copy made before that record is kept with the forms above, not for filing." | **Closed.** The API test makes IMM 5406's copy, approves the record, and the copy is still listed (`copy_not_for_filing: true`, Download). The line says it is kept, and a new copy is refused (422). I saw the same on screen (`r2-online-lines-1024.png`). Removing the fix fails the test. Lists on other stages and releases do not change: the added set only holds forms that were copy-only before M3-S5. |
| **m1** the list and the action disagreed | `:262` `hasPdf` excludes a sheet-only form. `:223` gives no forms entry to an Online, sheet-only person with no copies. | **Closed.** In R4, IMM 0008 DEP moved Online shows no pill and no "Generate" entry, and `generate` refuses (422). |
| **m2** untested rules | `api/src/filing.ts` `accountAccepts`: account, channels, quote (at most 400 characters), canada.ca address, read date, and the quote on the recorded page. Each has a fail case in `check_m3s5_sheet_only.ts`. The finder calls it. | **Closed.** The channel gate is tested too: in R4, IMM 5562 filed as a PDF upload with an Online-only record is still made (202). |
| **m4** misleading words | `:318`: an item filed outside the record gets `notAcceptedWords`, 422. | **Closed.** R3 on a second case: "IMM 5406 is filed as PDF upload, but the Form library records that IRCC accepts it only as Online". |
| **m3** provenance in the reason | Not changed. The library row carries the basis tag. | **Open, Minor** (see below). |

**Still open (Minor, Should):**
* **n1, an action that is refused is still offered.** The kept-copy row of IMM 5406 (from `:208`) still shows "Generate a new copy", and pressing it returns the 422 "answer sheet only". The refusal is in words and nothing wrong is made, but the screen offers an action it refuses.
  * Steps: case ACC-mwb1uuox-zwv3, IMM 5406, after the record.
  * Fix: on a row listed only for its earlier copies, hide or disable "Generate a new copy" and give the reason.
  * Same family, edge case: on a case where one person has an earlier copy, a second person whose item was moved to PDF upload is now listed. Their Generate gets m4's worded 422, which is correct words for a person filed outside what IRCC accepts.
* **m3, the reason names no source.** `engine/channels.ts:72` quotes IRCC's line without its source or date, and the founder's record is not labelled Sample in the words (rule 4, P-170, BIC-15).

**B164:** this round adds no key, form number or program to `engine/` or `api/src/`; `filing.ts` and `finder.ts` hold only generic checks. The `M3-S5 … fill-case.ts` ALLOW entry is still stale. Whichever of #1501 and #1507 merges second drops it.
**Constraints:** `prisma/schema.prisma` and `api/src/case-prepare.ts` are still untouched.

**Journey score, round 2: 9/10.** Correct data goes to 1 (M1 closed). Error recovery stays at ½ (n1). Trust stays at ½ (m3). Plain words goes to 1 (the words now say what was kept and why).

**Scores that change from round 1:** D2 4 (copies kept) · D4 4 (n1) · D16 4 (each rule now has a fail case) · D18 3 (m3). BIC-15 stays **Partly** (m3, n1). That is a Should, not a Must: no [M] line in §1–§5 is broken.

## Round 1: commit 8648d869a (kept for the record)

Verdict was Block on M1. Also found then, and closed in round 2: m1, m2, m4. m3 remains open.
* **What held in round 1:**
  * The rule moved from code (`ANSWER_SHEET_ONLY`) into the library's per-account record. `engine/channels.ts:66` uses `allowedChannels`, the same rule as the Forms tab (C-3).
  * Visitor visa unchanged (APR_PORTAL, no Online lines, no such record). Express Entry unchanged on the checkpoint (its release has no account).
  * The four PR Portal records load as SAMPLE_FIXTURE, with Guide 5289's line on its recorded page.
  * The tests fail on the old code. axe 0 and no sideways scroll at 1440, 1024 and 400 px and at 200 %. The keyboard path works.
* **The deliberate choices, all accepted:**
  * (1) Portal order is C7.3's parts order; the sheet itself says so (W6).
  * (2) The generalisation is supported by P-113 ("the library records what IRCC accepts per portal") and P-171 (3). The record is account-wide while the quote comes from one guide, which is fine as Sample but should be noted.
  * (3) The ANY record applies when the release has no account, as in C-3.
  * (4) A person's reason shows as "Set by a person: …".
* **Refusing `generate` only on an Online channel is right.** For a PDF upload or Paper channel the PDF is the deliverable, and the frozen release decides.

**For the Lead (not this PR):** P-113 says Express Entry files in the APR Portal, while the founder's P-171 (3) records say IRCC_SECURE_ACCOUNT. The checkpoint's Express Entry release has no account, so P-171 (3) does not show on the demo case. That is fixed by data on the next release, not by code.

**Not checked:** the packs listed above (as asked); `check_forms_s4_runs.ts` (needs the Mac's paths); a real screen reader; an intended user's walk (D17, D20 simulated only). Screenshots (scratch, not committed): `/tmp/claude-0/-home-user-xpatready/03fe3e66-fb93-565c-af12-7e162f4de18e/scratchpad/shots/`.
