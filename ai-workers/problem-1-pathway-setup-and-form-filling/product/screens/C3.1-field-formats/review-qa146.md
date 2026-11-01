# Review: C3.1 QA-146 follow-up (commit baf42aa2)

Reviewer (fresh context, did not build it), 1 Nov 2026. Branch `claude/elegant-pascal-6s6r7y`, diff `origin/main...baf42aa2` (7 files). Isolated copy `rev` on :4458, fresh web build, US$0, no live switch; copy stopped and `xr_studio_rev` dropped afterwards. Working tree clean afterwards. The ignored `p2/jobs/*of5*` files are older than this review (15:43 and 15:54; my build was at 16:01), so they were left in place.

**Verdict: Approve.** No Blocker or Major is open. Journey score **8 / 10** (`journey-test-reviewer-2026-11-01-qa146.md`).

## What was run
| Check | Result |
|---|---|
| `tests/check_forms_c31_formats.ts 4458 xr_studio_rev` | 107/107 |
| `tests/check_forms_c31_acceptance.ts` (copy with the fake launcher) | 17/17 (AT-8, AT-9, AT-9b and AT-10 pass) |
| Runtime suites | case engine 55/55 · setup_visitor_visa 13/13 · r1a 98/98 · r1d 86/86 · qa122 7/7 · qa76 7/7 · c18 age 12/12 · preview sets 29/29 |
| Configured checkpoint (`/demo/load {sample:"configured"}`) | IMM 1344 (09-2024) and IMM 5257 (09-2023) link `imm1344e` and `imm5257e.inventory.json`. 0 editions point to an inventory other than the one their read file has. Only checklists and instructions remain NULL, which is correct. |
| Browser (Playwright + axe WCAG 2.2 A/AA), job page for the IMM 5257 replay draft | axe 0 violations at 390, 1024 and 1440 px. The format lines never overflow. Keyboard-only path: Resume setup → Draft with AI → Use saved AI answer → Review AI proposals → job page works. No console errors. |
| `GET /jobs/:id` with formats | 12–27 ms, 338 KB. Client 403, no person 401, reviewer 200. |
| Graph | No gap from this delta. The only G3 is `GET /attachments/:id/file`, which predates it. |

## The questions asked
* **Can the new `shapeOf` limit refuse answers that were accepted before? No.** In the Visitor visa release, 22 fields get a tighter limit (family name 500→100, UCI 500→10, passport 500→20, …). For each one I checked `checkValue` at the limit (accepted) and at limit+1 (refused). The limit+1 answer was already refused before this change, by `checkFormat`'s `max_length` rule. That rule is the same one `shapeOf` now reads (`!r.part`), and it counts the same way (`[...v].length`) with the same message. So the set of refused answers is unchanged. Two things a user can see do change:
  * the questionnaire's "N of 100 characters" counter (`questionnaire.tsx:178`);
  * a field of 200 or fewer characters whose name contains detail/explain/describe/reason now gets a long text box (`questionnaire.tsx:52`).
  * The filler (`p5`) does not read `shapeOf`. The runtime suites above all pass.
* **Can `updateMany` link the wrong edition? Not on any path that exists today.**
  * The filter is the same workspace + the exact file checksum + `inventoryFile: null`.
  * `read()` only reads a file recognised by checksum (the manifest) or approved by checksum.
  * `read_form.py` reads that very file. A changed inventory comes back as `ok:false` and throws before `updateMany`.
  * Guides have their own checksums and are never read.
  * The rule against overwriting has a failing case (`check_forms_c31_formats.ts`, "never overwrites").
  * One theoretical case: the schema says an ONLINE edition keeps the PDF's `sha256`. Nothing creates an ONLINE edition with a NULL inventory today (see m4).
* **Long choice lists.** The IMM 5257 country box has 243 entries in the data. The line says "The form's own choices (242): Afghanistan (252), Albania (081), Algeria (131), Andorra (082), and 238 more". The blank entry is left out on purpose (`job.tsx:110`). It wraps cleanly at 390 px.

## Issues
**Blocker:** none. **Major:** none.

**m1 (Minor, words): a date-part form field is called "Text".** The date of birth's MM and DD boxes, and every MM/YYYY box of occupation and education, read "Text, at most 2 characters (from the form)" (or 4) under a proposal of type `date`.
* Repro: Load sample → Visitor visa → IMM 5257 → Draft with AI → Use saved AI answer → Review AI proposals → card `person.date_of_birth`.
* Fix: in `boxFormatWords`, when there is no date pattern, drop "Text," ("At most 2 characters (from the form)"), or name the part from the caption (MM → "Month, 2 digits").

**m2 (Minor, visual and words): the format line looks like the end of the quote.** It has the same muted 12 px style as the quote above it, with no label. At 390 and 1440 px it reads "…where you ar… The form's own choices (242)…" (screenshot `/tmp/rev146/shots/job-390.png`, not committed).
* Fix: a short lead-in such as "The form says:", or a separate style, in `job.tsx:142`.

**m3 (Minor, tests): no browser check covers the new line.** AT-8, AT-9 and AT-9b only assert the API's `boxes[].format`. Nothing loads the job page, looks for `[data-box-format]`, or runs axe on that state (STANDARDS §45–46).
* Fix: add one step to `tests/check_forms_c31_formats_browser.cjs`: open the replay job and check that the family name line says "at most 100" and the country line says "choices (242)". Run axe there.

**m4 (Minor, hardening, optional): limit the update to PDF editions.** Adding `channel: "PDF"` to the `where` in `sources.ts:191` would keep a future ONLINE edition, which shares the PDF's checksum, from getting the PDF's inventory instead of its twin.

## Not caused by this item (for the lead, no action here)
* **Sideways scroll on the job page:** at 390 px and at 200 % zoom on 1024 px it is 732 px wide. The cause is the `whitespace-nowrap` buttons "Create person.… unless it means the same as …" in the job page's action row, which this diff does not touch. This is a gap against the EXPERIENCE [M] line for 200 % zoom.
* **IMM 5257 in the configured checkpoint:** the row shows "Read: ready for AI drafting · Draft with AI". Starting the draft is refused with 400 "IMM 5257 is already in this combination's configuration." (`ai.ts:117`). The person sees an offer that cannot be done.

## Could not check
* Mutation runs on `main`: the official PDFs are not in git, so I did not export a separate tree. The proof that the checks fail without the change is the builder's recorded main run (4 fail) plus my reading of the code.
* A real screen reader.
* An unaided walk by an intended user (D17 and D20 stay with the founder).

## Re-check on 14257c2c (merge of origin/main 4ffb5e80; read only, no copy started)
**Verdict: Approve stands for 14257c2c.** The merge adds nothing to this PR's own code beyond what main brought.
* `git diff baf42aa2 14257c2c` on the six files of this PR: only `web/src/pages/job.tsx` changes. Its changed lines are identical to main's own change, be8c79fe..4ffb5e80: `roleKeysInWords` and the checklist job's applied section. `ItemCard`'s format line (`boxFormatWords`, `data-box-format`) is intact.
* `sources.ts`, `field-format.ts`, `runtime/case.ts` and both tests are byte-identical to baf42aa2. The other parent, 7594a070, is baf42aa2 plus the two record files only.
* **Main's changes do not conflict in meaning:**
  * main did not change `api/src/sources.ts`, so `read()`'s edition link and `job()`'s box formats are as reviewed;
  * `api/src/ai.ts` changes the capability note's words only;
  * `api/src/proposals.ts` adds the pqr_pick lander and puts `checklist_draft` on its own page. `field_map` stays decided on the job page, so `job()` and `decide` are not affected;
  * `engine/sources.ts` changes a comment only;
  * main did not change `field-format.ts`, `snapshot.ts`, `prisma/`, `p1/` inventories or formats, or `contracts/runtime.ts`;
  * main's change to `questionnaire.tsx` (employer link type) does not touch `shape.maxLength`.
* Not re-run here: the builder is running the 32 touched suites on this commit.
