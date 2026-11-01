# F2 C2.12 slice 2: one form's guided path on a combination · independent reviewer · 31 Oct 2026

Commit reviewed: **`514f0d8d`** on `claude/forms-c212b-hfb2om`. It is stacked on #179 (approved head 41b97b46), and I read only `git diff 41b97b46 514f0d8d`, leaving out its three review records. I did not build it. This is a backend slice: `GET /api/combinations/:id/forms/:code/progress`, `engine/form-progress.ts`, `contracts/form-progress.ts`, and `ReviewQueueService.items` made public. I read it against the F3 plan §3 D3 and D5, §5, §6 and §7, concept BR-1 to BR-5 (PDF only, P-102), and the [M] lines of `STANDARDS.md`. Ports: 4450–4453 only. Cost: US$0 (replay, fixture canada.ca, SQL test input, no `*_LIVE`).

## Verdict: **Rework** (0 Blocker, 4 Major, 7 Minor). For the PR: **Block**, fix list at the end
The engine is pure, the read writes nothing, and the refusals are right. In the main states, the path and To review name the same next step for A, B and C. But on the loaded sample the path is wrong for most forms of a released combination (Major 1) and for a form the combination does not have (Major 2). Six rules can be removed with the suite still green (Major 3). Each read costs about 308 database statements (Major 4).

## What I checked
| Check | Result |
|---|---|
| Steps vs BR-3/BR-4 | Main path on Super visa IMM 5257, for A, B and C. Before the draft: step 1 done, then step 2: author A gets "Draft with AI or add from the library", and B and C get "The configuration author does this." After a replayed draft, step 3 is "Review 84 AI proposals", the same as To review. After every proposal is decided: A gets "Add the decisions to the draft", while B and C get their own "Decide 1 form field". Failed draft: "stopped before it finished". Running draft: running, with no next step. Held new edition: A gets "Review impact" (step 5), B gets "The configuration author reviews it." ✓ |
| Steps 1–2 belong to the author | Every route steps 1–2 link to holds `need(actor,"author")`: attach, remove and replace (`form-library.ts:236,269,288`), Find (`finder.ts:227`), intake upload (`intake.ts:54`), AI draft and launch (`ai.ts:255,307`). The engine's `author()` wrapper matches them ✓ |
| D3 in more states (A, B, C; O and P get 403) | Holds item by item when the person has one open item per step. It breaks when they have two (Minor 1), or when no item exists at all (Major 1) |
| Permissions and refusals | Nobody or user-Z → 401 · user-O, P, Q → 403 (the global `readerOf` guard) · unknown or malformed combination → 404 · `<script>` or Cyrillic → 404 in words · space → 400 · 41 characters → 400 · ` imm  5257 ` → IMM 5257 · POST → 404. An **upper-case UUID gives 500** (Minor 5) |
| Read only, D5 | Three reads gave the same body (md5). Five parallel reads left audit, field maps, jobs, lines and intake unchanged ✓ |
| BR-1 hrefs | Every `next.href` emitted matches a web route (`App.tsx:100-109`) ✓ |
| Speed (20 warm calls; loaded sample, then with IRCC's index filled to 237 forms) | Super visa: median 114 → 134 ms, p95 143 → 151. With an LMIA: median 178 → 169, **p95 193 → 237 ms, max 264**. Parts: `FormLibrary.list?q=` 74–82 ms, `Studio.combination` 27–89 ms, the queue 12–14 ms. Statements per call (pg_stat, 10 calls, settled): **≈308**, of which ≈235 come from `list` (it builds every row, with `formUses` per row, then filters to one), ≈44 from `combination`, ≈22 from the queue and ≈7 of its own |
| New suite | 26/26 (:4453, and on the /tmp archive :4452) |
| Mutations (/tmp `git archive 514f0d8d`, a fresh copy on :4452 for each) | **15 of 21 caught.** Missed: API `canAuthor: true` · retired lines count as present · STUB jobs count as a draft · `form_fields` dropped from step 3 · per-form item filter removed · per-form problem filter removed · (the unknown-combination guard removed is harmless: a later read also returns 404) |
| Neighbours (fresh copies) | `check_forms_c212_queue_forms` **45/45** (:4450; the brief's "10" is older) · `check_screen02_fix` **61/61** (:4451). Neither rewrote a tracked file |
| Graph (P-86), any count, tsc | G1 0 · G2 0 · G3 2 (the old routes) · G4–G6 0 · any 432 (baseline 433) · no tsc error in the new files |

## Issues, ranked
**Major 1 (Must): undecided form fields carried from an earlier release become a step-3 "needs you" that To review does not have.** Repro: load the sample, then read With an LMIA IMM 5409 as A, B or C. Step 3 says "13 form fields with no decision yet" with "Decide the form fields → /c/:id/forms", and `current=review`. Meanwhile `?form=IMM 5409` on To review is empty, and the validator calls the same fields a *warning*: "Decide them when this edition is drafted again". 6 of the 8 forms on that combination stop at step 3 (IMM 1295, 5257 SCH1, 5409, 5475, 5476, 5707). For B, it hides the step-4 "Approve or return" link behind it. Cause: `unresolved` counts every status (`api/src/form-progress.ts:37,45`), and `extra` (`engine/form-progress.ts:72`) invents a step with no queue item. The comment "an item exists for them" is wrong for PUBLISHED rows. It breaks D3/BR-2 (one source), BR-1 (the Forms tab cannot take this decision; To review uses `/review/form-fields/:id`) and BR-4. **Fix:** count only DRAFT undecided fields (each one already has a `form_fields` item), drop the `extra` branch or give it To review's words and link, and leave the carried fields to step 6's warning.

**Major 2 (Must): steps 1–5 do not follow whether the combination has the form.** (a) Repro: `DELETE /combinations/<With an LMIA>/forms/IMM 5409`. The Forms tab now lists IMM 5409 under `removed`, but step 1 says "IMM 5409 (01-2023) is in the library and on this combination." That is because an attached PDF counts as "present" whatever the line history (`api/src/form-progress.ts:31-32`). (b) Repro: Super visa IMM 5476, which is not on Super visa. Step 1 is not started ("Add it from the library"), yet step 2 is done (the library's 53 mapped fields), step 3 needs you, and `next_for_you` is step 3. Plan §7 says "held off-list → steps after 1 not started", and BR-14 says mapping starts when a combination first uses the form. **Fix:** an attachment counts only while the form has no removed line on this combination (the Forms tab's rule). Steps 2–5 stay `not_started` until step 1 is done.

**Major 3 (Must): six rules have no failing test** (STANDARDS §5 [M] "A rule's test fails when the rule is removed"). See the missed mutations above. The most serious is the server-side duty: `canAuthor: true` at `api/src/form-progress.ts:45` stays green, because every API check reads a form whose steps 1–2 are already done. The per-form item filter (`:42`) and problem filter (`:44`) are the core of D3 and step 6, and their removal also stays green. **Fix:** add API checks as C or B on a form that is not drafted yet (no step 1–2 link), plus a removed line, a stub pass, a `form_fields` item, and another form's open item and problem on the same combination (LMIA has them).

**Major 4 (Must): one form's path costs about 308 statements, and p95 is 237 ms at 237 library forms.** That breaks STANDARDS §5 [M] "no N+1" and §9 [M] < 200 ms. Plan §7 asks for "one batched query set per request (counted)", and no test counts them. Cause: `this.lib.list({ q: code })` (`api/src/form-progress.ts:34`) builds every library row before it filters. **Fix:** read the one form's current edition with the same `printedApproved`/`newestEdition` rule (a one-form reader in `FormLibrary`), and add the query-count check.

**Minor 1 (Should): step 3 picks the first item in build order, not To review's order.** Repro: Super visa IMM 5257 with an AI job and a DRAFT undecided field. The path says "Review 84 AI proposals"; To review for the same person and form puts "Decide 1 form field" first (oldest first). The suite's own D3 API check would fail in this state. **Fix:** sort as `list()` does (`review-queue.ts:39`) inside `fromItems`.

**Minor 2 (Should): step 4 "New shared fields are approved" holds changes that are not shared fields.** Repro: `POST /library/forms/IMM 1295/accepts`. Step 4 then reads "What IRCC accepts for IMM 1295…" (`library_form` changes do the same). D2 says step 4 counts fields only. **Fix:** route `form_accepts` and `library_form` changes elsewhere, or record the choice.

**Minor 3 (Should): every warning keeps step 6 from completing.** The filter at `engine/form-progress.ts:79` removes nothing. So list-purpose warnings, which the validator says "do not stop a release", block "complete", but BR-10 makes them warnings. **Fix:** errors and undecided form fields block; other warnings show without blocking (or record the rule).

**Minor 4 (Should): words.** "1 form field of IMM 5257 (09-2023) have a field map" (`engine/form-progress.ts:63`). An undecided row counts as "a field map", because `mapped` counts any outcome. C, a non-author, still reads "draft again, or add…" (`:65`).

**Minor 5 (Should): an upper-case combination id gives 500.** The `/i` check at `api/src/form-progress.ts:26` passes, then the raw id goes to `Studio.combination` (`studio.ts:309`). **Fix:** use `combo.id` after the lookup.

**Minor 6 (Should): a held first PDF of a form not in the library gives 404.** Repro: intake of an off-list IMM 5645 copy on With an LMIA. The path answers 404 "Not in the library", so step 1's "held: waits for a second person" cannot show for a new form.

**Minor 7 (Should): changes from plan §6/§7 are not recorded** (the build notes have no C2.12 entry). The route differs from plan §7's `GET /api/forms/:code/progress?combination=`. The `not_needed` and `held` states are dropped: step 5 reads "done · Nothing waits here" while step 1 is not started. `whats_left` has no link, though BR-5 says "and a link". The response has no zod schema (§5 [M] contract first).

## D1–D20 (backend slice; no screen yet, F3b)
D1 2 (Majors 1–2) · D2 3 (read only and stable, but wrong step states) · D3 n/a · D4 n/a · D5 4 (stable across reads and parallel calls; 500 on upper case) · D6 n/a · D7 4 (a stub pass is not a draft; AI words plain) · D8 n/a · D9 2 (Major 1 sends A, B and C to a step To review does not have) · D10 3 (Minor 4) · D11 3 (removed form "done") · D12–D14 n/a (no UI) · D15 2 (Major 4) · D16 2 (Major 3) · D17 simulated only · D18 3 (step 1 says "on this combination" for a removed form) · D19 n/a (one slice) · D20 simulated only

## Could not check
A browser walk, axe and widths (there is no screen). A real screen reader. An intended user's walk (D17, D20). Live AI. Release-gate cost with an open submission (none was open in my data). The held and new-edition rows and the failed and running jobs were SQL test input; the off-list held copies went through the product's intake.

Journey test: `journey-test-reviewer-2026-10-31-c212-514f0d8d.md`. **Score 6/10 (fail).**

## Fix list for 514f0d8d
**Verdict: Block** (4 Major open). Fix before `review: approved`:
1. Major 1: count DRAFT undecided fields only; no step without a To review item.
2. Major 2: a removed line is not "on this combination"; steps 2–5 wait for step 1.
3. Major 3: failing tests for the six missed rules, including API checks as a non-author.
4. Major 4: a one-form library read; a query-count check under 200 ms with IRCC's index loaded.

# Round at cd8a023d
Independent reviewer, 1 Nov 2026. I read `git diff 514f0d8d cd8a023d` (code: `api/src/form-progress.ts`, `form-library.ts` `currentOf`, `engine/form-progress.ts`, `contracts/form-progress.ts`, the suite). Ports 4452–4453 and 4450–4451, every copy stopped and its database dropped. US$0 (replay, fixture canada.ca, no `*_LIVE`). Tree clean after every suite (no `prototype/p2/` rewrite).

## Verdict: **Ship after fixes** (0 Blocker, 0 Major, 6 Minor). For the PR: **Approve**
All four Majors are closed live, and each one's test fails when its fix is removed. Minors 1–5 of the last round are closed. Minors 6 and 7 are still open, and the commit does not mention them.

| Previous | Live at cd8a023d (sample, then IRCC's index filled, 237 forms) | Fix removed (/tmp `git archive`, fresh :4452) |
|---|---|---|
| M1 | With an LMIA, all 8 forms, as A and B: step 3 is "Nothing waits here" and To review `?form=` is empty. The carried fields are said on step 6: "Not decided yet (from an earlier release): 16 form fields … Decide them when this edition is drafted again" | DRAFT filter removed → caught |
| M2a | After `DELETE` of IMM 5409 on LMIA: step 1 says "not on this combination" and steps 2–6 are not started. Adding it back makes step 1 done | history ignored → caught |
| M2b | Super visa IMM 5476: steps 2–6 are "Comes after the form is on this combination", next is step 1. After `POST …/forms` the whole path is done | gate removed → caught |
| M3 | 13 of 18 mutations caught (list below). Caught: API `canAuthor:true`, stub counted, form_fields dropped, item filter, problem filter | — |
| M4 | LMIA, 20 warm calls: median 88–118 ms, p95 100–126, max 137. Super visa IMM 5257: median 45–59 ms. **≈73 statements per read** (xact count, stats settled), down from ≈308. Of these, about 66 come from the shared `Studio.combination` and queue reads | old `list({q})` back: 292 statements, p95 216–251 ms, **suite still green** (Minor C) |
| m1–m5 | m2: an accepts change on IMM 1295 is not step 4 (B still gets it on To review). m3: a warning is said, and step 6 completes. m4: C reads "The last AI draft stopped before it finished." and "has/have" is right. m5: an upper-case id gives 200 | m1, m3, m5 caught; **m2 and the two m4 word rules missed** (Minor B) |
| m6, m7 | Not addressed. By the code, a form with no library row still gives 404 (`form-progress.ts:32`). `build-notes.md` still has no C2.12 entry. The contract has no zod schema, and the route still differs from plan §7 | — |

**The "retired line as present" mutation is equivalent: confirmed.** `effective()` (`engine/snapshot.ts:26`) never returns a RETIRED pick. `heldRetires` is off and the mode is "draft", so `.some(l => l.status !== "RETIRED")` at `form-progress.ts:38` always holds when there is a line.

**`next_for_you` and a not-started step: correct, with one gap.** Only step 1 can be not started with a link. The `author()` wrapper strips that link for B and C, and the gate strips steps 2–6. A gets "Add it from the library" on a removed form, and C gets null with "The configuration author does this." The gap is Minor A.

## Issues (all Should)
**Minor A: a library form with no file is offered "Add it from the library", which the product refuses.**
- Repro: on LMIA, read IMM 5802, an index-listed form with no file. A gets `next_for_you` "Add it from the library" → `/c/:id/forms`.
- `POST /combinations/:id/forms {"formKey":"IMM 5802"}` then answers 409: "listed by IRCC but has no file in the library yet: upload its PDF in the Form library, or let the form finder download it."
- This breaks BR-4 ("never a step they cannot take") for 221 of the 237 library forms once the index is filled.
- Cause: `engine/form-progress.ts:60` does not look at `edition`.
- Fix: when the line is none and the edition is null, the next step is "Upload its PDF in the Form library" (`/library/forms`), with a unit check.

**Minor B: three rules still have no failing test (STANDARDS §5 [M]).**
- The step-4 filter for field changes only (`api/src/form-progress.ts:48-50`).
- The non-author words (`engine/form-progress.ts:67`).
- "has/have" (`:65`).
- Fix: add an API check with a `form_accepts` change on a form (step 4 stays done for B), and two unit checks for the words.

**Minor C: no query-count check (plan §7 "one batched query set per request (counted)", last fix list item 4).**
- Today's speed meets §9. But going back to the 292-statement read leaves the suite green.
- Fix: assert the statements per read (for example `pg_stat_database` xact delta ≤ 90) with the index filled.

**Minor D: dead step-3 fallback.**
- `engine/form-progress.ts:83-85` still makes a "needs you" step that links to the Forms tab, and its unit check ("no item yet: step 3 needs you") encodes the opposite of M1.
- K1 (`review-queue.ts:168-178`) lists a form_fields item for every person whenever a DRAFT undecided field exists, and channels are PDF/ONLINE only. So the branch cannot fire live.
- Fix: drop the branch and its check, or give it To review's link.

**Minor E (carried m6):** a held first PDF of a form that is not in the library gives 404.

**Minor F (carried m7):** record the departures from the plan (route, the `not_needed`/`held` states, no zod schema) in `build-notes.md`.

## Mutations (18)
- **Caught (13):** canAuthor, STUB, form_fields, item filter, problem filter, M1 DRAFT, M2a, M2b, m1 order, m3, m5, not_started next, whats_left href.
- **Missed (5):**
  - retired line (equivalent)
  - m2 filter
  - non-author words
  - has/have
  - M4 slow read

## Suites (fresh copies)
- `check_forms_c212_progress` **38/38** (:4453, and the archive baseline on :4452)
- `check_forms_c212_queue_forms` **45/45** (:4450)
- `check_forms_qa53` **20/20** (:4450)
- `check_screen02_fix` **61/61** (:4451)
- tsc 0 errors
- Graph: G1 0 · G2 0 · G3 2 (the old routes) · G4–G6 0

None rewrote a tracked file.

D1 4 · D2 4 · D5 4 · D7 4 · D9 4 (Minor A) · D10 4 · D11 4 · D15 4 · D16 3 (Minors B, C) · D18 4 · D17 and D20 simulated only. Not checkable: a browser walk, axe and widths (no screen until F3b), a real screen reader, live AI, an intended user's walk.

Journey test: `journey-test-reviewer-2026-11-01-c212-cd8a023d.md`. **Score 9.5/10 (pass).**

**Verdict: Approve** for cd8a023d (no open Blocker or Major). Minors A–F go to the next slice.
