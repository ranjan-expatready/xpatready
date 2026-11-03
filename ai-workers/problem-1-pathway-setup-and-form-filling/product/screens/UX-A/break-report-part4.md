# UX-A part 4: break report (commit 513e0533)

Breaker, 2 Nov 2026. Claim (P-273; UX baseline 2 Nov finding 4; EXPERIENCE §5): on the Fields list, a field's page and the Draft with AI dialog, no field key, model name, run file name, job id or budget line is on the main path. They sit in a collapsed "Details (for admins)" disclosure that opens by keyboard. Saved AI answers are named by form and date.
Isolated copy `brk_uxa4` on :4471, demo sample loaded (`/api/demo/reset` then `/api/demo/load`, user-A), web build of 513e0533. No draft started, no priced button clicked, no `*_LIVE` set, US$0. The only non-GET calls my walks made were `POST /ai/plan` (the dialog makes it when it opens) and `POST /conditions/check`, plus three refused API calls (rename to a duplicate, rename to blanks, empty meaning), which changed nothing. The builder's own test (`tests/check_uxa4_details_browser.cjs`) passes 18/18 on my copy, with screenshots redirected to scratch.

## Breaks

**M1 (Major): every field page shows a release hash and AI run file names on its main path.**
Steps: open any field from Fields, for example Application date, and scroll to "Where it comes from".
Expected: the source in words, with no hash and no run file. Fields list rows already say "From a reviewed release".
Actual: "From the reviewed work-permit release 2c66472f3758 · proposed by AI runs c1-requirements-live-20261020t053544388z". Person › Citizenship shows "… c1-fieldmap-imm1295-live-20261020t051558106z". I checked 164 of 164 field pages through `/library/fields/:key/sources` and in the browser, and every one has this line.
Where: `web/src/pages/library.tsx:172` prints `l.quote` as is; `api/src/library-sources.ts:43` builds "proposed by AI runs <run ids>".
Why the test missed it: `check_uxa4_details_browser.cjs` tests the field page against `KEY` only, not `INTERNAL`. It also reads the page as soon as `h1` appears, before "Where it comes from" has loaded.

**M2 (Major): the Draft with AI dialog names the wrong limit for the money left.**
Steps: open Visitor visa › Forms › Draft with AI on IMM 5707 or IMM 5257. Do not start anything.
Expected: the figure says which limit it is measured against. The dialog's cost words and the cost warning should agree.
Actual: "US$60.00 left before the AI spending cap." The ledger shows US$0.00 spent of the US$120.00 cap. The US$60.00 is Wave 1's room: the server sends `remaining_usd = min(cap − spent, wave cap − wave spent)` (`api/src/sources.ts:245`). The 'Spending' line that would explain it ("US$0.00 of the US$120.00 experiment cap · Wave 1: US$0.00 of US$60.00") is now only under Details. If the warning opens, it says "AI spending cap: Spent so far US$0.00 of US$120.00 · Wave 1 …", which contradicts the dialog.
Before this commit the line said "left before a cap" and named both limits. Hiding them left the money words untrue.
Where: `web/src/pages/sources.tsx:172`.

**M3 (Major): the field page's condition editor asks the person to type field keys.**
Steps: on a field's page, open Where it is asked › Condition on the question › "Show only when…".
Expected: no field key on the field page's main path. Fields are chosen by name.
Actual: the Field box is monospaced, with the placeholder "field, e.g. person.marital_status". Its suggestions are keys: the datalist value is `case.application_date`, with the meaning as its label. An unknown entry answers "person.nope is not a library field yet …". "Edit as JSON" shows raw keys. Since part 4 hides keys everywhere else, the only way to learn one is to open Details on another field's page.
Where: `web/src/components/conditions.tsx:78`, `:84` and the warning after it.

**m4 (Minor): other internal codes on the field page.**
- The Transformation column prints raw codes: `code_list:imm1295.citizenship`, `code_list:imm5476.form_action(1=appointing;2=…)`, `date:…`, `derive:…`. Answer-list keys appear on 28 field pages (`library.tsx:179`).
- "Conditions that read it" lists checks by id, for example `OR_PGWP_EMPLOYER_TEXT` on Applying for PGWP and Organisation name (`library.tsx:186`).

**m5 (Minor, introduced by this commit): a form field with no label leaks its PDF path in a tooltip.**
The label "A form field with no label on the form" carries `title={b.data_path}`. Hovering shows, and assistive technology may read as the description, paths like `IMM_5475[0].Page1[0].Choice[0].RadioButtonList[0]`. This affects 17 form fields, for example on Release authorization action, Representative form action and Subject is principal applicant (`library.tsx:179`).

**m6 (Minor): the field key is still in the URL.**
Finding 4 named the URL ("in Fields and the URL"). It is still `/library/fields/case.application_date`, and every link on the Fields list points there. A mistyped address answers "No field case.does_not_exist." (`api/src/studio.ts:489`).

**m7 (Minor): a field with no checked name shows its key's spelling as its name.**
All 164 sample fields have no checked label, so every heading is `fieldName(key)`: "Offer submitted via imm5802", "In english or french", "Translator is canadian certified".

**m8 (Minor): search matches the hidden key.**
Searching "case.app" returns 4 rows, and nothing shown on them says why they match (`library.tsx:83`).

**m9 (Minor): saved AI answer names in edge cases (from the code; the sample has none of these runs).**
- A run without a date reads "IMM 5257 · saved date not recorded".
- Two runs saved in the same minute at the same cost get the same name. The run file that tells them apart shows under Details only for the one that is selected.
- The time has no zone and follows the browser's zone, so the same answer has a different name for different admins.
- An attachment with no edition falls back to its file name (`formOf`, `sources.tsx:114`), and the dialog title then reads "Draft the field map of null" (older code).

**m10 (Minor): the dialog's cost-warning and refusal paths still use budget wording.**
Read from the code; I clicked nothing priced.
- Over a limit, the warning shows "Wave 1: US$x of US$60.00" and the limit name "Wave limit" (`components/cost-warning.tsx:24`, `contracts/cost-check.ts:47,57`).
- Refusals reach the dialog's toast as "… what is left of the experiment cap (US$x of US$120)" (`api/src/ai.ts:279`, `:488-489`).
- The dialog itself now says "AI spending cap", so the same thing has two names on one path.
- P-179 requires the warning to show spend against the cap, so the fix is the words, not hiding the lines.

**m11 (Minor): neighbouring screens a person reaches in one step.**
These are outside the claim's three screens, listed for the lead.
- Questionnaires › "Rules used here" and "Checks on these answers" are collapsed but on the page, not under Details. They show rule ids (R-01), check ids (CR_COMMON_LAW_EVIDENCE) and keys inside the rule text (`case.lmia_or_offer_number`).
- The AI work list prints the raw scope kind under each row (`pages/ai.tsx:31`).
- Review AI proposals is the page Draft with AI leads to. Each proposal card headlines `item.proposedKey`, its aria-label is "<outcome>: person.x", the candidates are keys, and there is a "Library field key" box (`pages/job.tsx:154-195`). I read this in the code only: the sample has no AI job, and making one needs a start.
- Forms tab: the side panel says "File imm5257e.pdf", and the Sources line's link title carries the file name (`pages/sources.tsx:77,92`).

## What held
- Fields list: no key on any row at 1440, 1024 and 400 px. Also none on the empty-search, Retired, Not asked anywhere and combination-filtered views, and none in titles or aria-labels.
- Retire panel: "Where used" names things by name; the "can't retire yet" path is clean.
- Refusal toasts for rename (duplicate name, blank name) and for an empty meaning carry no key.
- Details on the field page:
  - closed by default, and nothing under it is in the accessibility tree while closed;
  - Enter and Space toggle it, with a visible focus ring;
  - Chromium exposes it as a disclosure with expanded=false/true (CDP accessibility tree).
- Draft with AI dialog main path, on both Saved and Live, has no model name, run file, job id, "Wave 1" or "experiment cap".
- IMM 5707's five saved answers have five distinct names ("IMM 5707 · saved Oct 20, 2026, 6:20 a.m. · paid US$0.33 then", …, "· re-checked").
- The "Saved run file" row follows the chosen option and disappears on Live.
- Tab order: radio → choice → Details → Cancel → Use Saved → Close.
- At 1440, 1024, 400 px and at 200 % zoom (1440 and 1024): no sideways scroll on the Fields list, a field's page or the dialog, and the open Details and the Start button stay reachable.
- The Questionnaires field drawer (6 rows), Sections, Document types, To review and the AI work list (empty) show no key, run file, hash or budget line in their text.

## Verdict
Not ready. M1 makes the claim false on every field page, M2 states money wrongly next to a paid start, and M3 leaves a key-typing task on the field page. The Fields list and the dialog's key, model and job hiding hold. Fix M1–M3, each with a fail test; extend the test's field-page check to `INTERNAL` and wait for the sources to load. List m4–m11 in the PR.
