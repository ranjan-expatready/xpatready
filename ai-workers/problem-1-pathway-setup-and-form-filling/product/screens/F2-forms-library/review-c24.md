# Review: forms F2 C2.4 (same file again / newer edition held), commit 6c940174

Reviewer, fresh context, 1 Nov 2026. Branch `claude/forms-c24-editions` from main 751cbc42; the diff is one file,
`prototype/studio/tests/check_forms_c24_same_and_new.ts` (+82). Isolated copy `forms_rv4` on :4457 (forms range), never
:4400; no model call (US$0); copy stopped afterwards; `intake.ts` restored after every mutation (`git status` clean).

**Verdict: Block**

## What I ran
* The test as given: **11/11 PASS, three runs** (9.6 s each). A wrong database name fails loudly (psql: database does not exist).
* Mutations of `api/src/intake.ts` (server restarted on each, then `git checkout -- intake.ts`):

| Mutation | Test result |
|---|---|
| M1 skip the same-checksum branch (`if (false && same)`, l.~259) | red, 2 FAIL (BR-1 pass, BR-1 on a combination) |
| M2 invert "newer" (`!editionMonth…`, l.~341) | red, 3 FAIL |
| M3 skip the "already waiting" branch (l.~275) | red, 1 FAIL (held file sent again) |
| M4 a held newer edition is still attached to the combination (`return newer ? attach(r) : r`, l.~347) | **green, 11/11** |
| M5 skip the edition comparison (always add, l.~339) | red, 6 FAIL |

* Browser walk (Playwright, Chrome headless, Forms library "Upload PDF", To review, edition review page): see
  `journey-test-reviewer-2026-11-01.md` in this folder (score 7.5/10).

## Findings

### Major
1. **"Not attached" for a newer edition is claimed but not proven (M4 survives).** The header (l.6) and the BR-2
   promise say "not added, not attached"; the newer edition is only ever uploaded without a combination (Part 1, l.56–61),
   and Part 2's sample already holds 11-2025, so no case uploads a newer edition on a combination. Mutation M4 (attach the
   held newer edition) stays 11/11. The path is producible with official files and the product's own API: after reset,
   `POST /structure/nodes` pathway → program → category, `POST /combinations {nodeKey}`, intake 2021 on it (added, attached),
   then 11-2025 on it → I got `new_edition_held`, no `attachmentId`, `source_attachment` holds only the 2021 row. Fix: add
   that as Part 1's combination (or a Part 3) and assert `attached(combo)` is unchanged and `attachmentId` absent; re-run M4.
2. **C2.4's own upload path tells the person the wrong next step (pre-existing, product words; C2.4 cannot be called
   Done while it stands).** Forms library › Upload PDF of the approved 11-2025 IMM 5476 over the library's 11-2021: the run
   card's step 4 correctly says "New edition: impact review needed…", but its callout says "Held: record the IRCC page it came
   from on To review; then a second person compares and approves it." with the link "Record the IRCC page it came from",
   which opens `/review/held/<id>` headed "Not on the approved source list" — false (the file is on the approved list; step 3
   even says "no second person is needed"). To review itself offers the right step, "Review impact" → `/review/edition/<id>`.
   Cause: `api/src/upload-run.ts:162` (any `*held` outcome gets the source-verification words) and `api/src/runs.ts:87`
   (any held upload links to `/review/held/`). The same applies to `older_edition_held`. Fix: for `new_edition_held` say
   "New edition: impact review needed" and link "Review impact" → `/review/edition/<id>`; for `older_edition_held`, "Older
   edition: not used" with To review's "See the older edition"; add an assertion (API `GET /runs` next step, or the browser
   check) so a test goes red on it. If the lead prefers a separate item, record it on the C2.4 row and keep it "Partial".

### Minor
3. **Older editions are filed under "New edition" on To review** (`api/src/review-queue.ts:206` sets `kind: "new_edition"`
   for `older_edition_held`; the page shows the filter "New edition (1)" and the row badge "New edition" for IMM 5476
   (11-2021), whose text says "An older edition…"). The test works around it by matching the person-facing sentence
   (`/^A newer edition/`, l.37), which couples the test to wording. Fix: a kind (or label) for older editions, then filter on
   kind in the test.
4. **Part 2's reset is not checked** (l.64; Part 1's is, l.42). A failed reset would surface later as a confusing count.
   Fix: the same `status >= 300 → throw`.
5. **No "this database is the server's" guard.** Sibling checks stop when the DB argument is not the served workspace
   (`check_w1_structure.ts:30–32`); here a stale database of the default name would be read silently. Fix: copy that guard.
6. **BR-1's "fail case" is weak**: a different form (IMM 5257) is not "in library". A stronger negative for the rule
   "identity is the checksum" is the same code and edition from a different file (held "already in the library from a
   different file", `intake.ts` l.~331); it needs a non-official file, so leave it if the official-files-only rule wins —
   note it in the test header.

## What held
* Labels are by capability and rule ("C2.4 BR-1 pass", "C2.4 BR-2 fail case"), one passing and one failing case per rule.
* Errors are loud: setup outcomes, sample load, missing combination and empty intake results throw; SQL failures throw;
  no fixed sleeps; each FAIL prints its evidence. Data checked underneath (editions, attachments, held items, drafting jobs).
* Official IMM 5476 PDFs only; checksums on the approved list; US$0 (drafting_job count unchanged).
* Behaviour is right on the screens: "Already in the library: IMM 5476 (11-2021). Nothing duplicated." on the run card;
  To review "Review impact" opens the edition comparison (30 unchanged, 7 reworded, 16 new, 6 removed form fields).
* axe 0 violations and 0 px sideways scroll at 400/1024/1440 on Forms, To review and the edition review; no console errors.

## Graph and standards
* `qa/GRAPH.md` l.54 shows C2.4 named by 2 tests on main; this commit adds the third. I did not re-run `graph.mjs`
  (it rewrites GRAPH.md, which I may not edit).
* No new screen, route, migration or technology; STANDARDS/EXPERIENCE [M] lines touched only by finding 2 (next step
  and words must be right; EXPERIENCE "next step obvious").

## Could not check
* Keyboard-only and 200 % zoom on the run card (checked keyboard Enter on "Review impact" only). A real screen reader.
* D17/D20: no intended user walked it. The canada.ca step ("The very file canada.ca's form page links") read a stored
  fingerprint; I did not check it live.

## To fix before Approve
1. Add a newer-edition-on-a-combination case asserting not attached (finding 1); M4 must go red.
2. Fix (or formally split out and keep C2.4 "Partial" for) the upload card's wrong next step for new and older editions (finding 2).
