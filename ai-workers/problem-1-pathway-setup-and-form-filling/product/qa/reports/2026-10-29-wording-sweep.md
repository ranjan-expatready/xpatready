# /qa explore wording: words and layout on every screen, main f7cb40d9 (29 Oct)

**Scope:** the founder's Go, through the Lead. This pass covered:
* every studio screen;
* the Demo menu and its Reset dialog;
* the case pages, as the officer and as the client.

It was judged against PRODUCT §4 (words on screen) and the Lead's list: jargon and system names, internal references, grammar, stale placeholders, header and title problems, inconsistent words.

**Where it ran:** isolated copy `qa_wd` on :4478, sample loaded. The shared demo :4400 was not touched. US$0. No app code was changed.

**How:**
* `tests/qa/check_qa_wording_1029.cjs` walks 38 screens at 1440 and 1024 px, as the author and as the officer and client on case pages. It saves each page's text and labels to `2026-10-29-wording-sweep/<page>-<width>.txt` and flags candidate words. It only flags; it does not judge.
* I then read every page's text, and its screenshots for layout. Viewport evidence for each finding is in `ev-*.png`.
* Full-page screenshots were not kept: 26 MB, and the check remakes them.

## Verdict
**Not ready for a reader outside the team.**
* The main path (Program structure, Immigration programs, Start setup, the combination's Forms, Questionnaires and Preview tabs, To review, the held file, the change page and the client questionnaire) mostly reads in plain words.
* The system names cluster in five places:
  * the shared library (Fields, Document types, Sections, Checks);
  * the Review and release tab's changes and warnings;
  * Releases and Activity;
  * the AI field-map job page;
  * the case officer page.
* That gives 10 rows in BUGS.md: QA-39 raised to Major and updated, and QA-71 to QA-80 new. 6 are Major and 4 Minor; none is Blocker or Critical. Each row has the exact text, the fix in plain words and the lane.
* No text was cut off by its box and no page threw an error at either width. Two pages had layout problems: the AI work detail page's card starts out of line with every other page, and the Fields table's last column is cut off at 1024 px.

## Findings by screen
| Screen | Bug | Severity | Lane | In short (exact text in BUGS.md) |
|---|---|---|---|---|
| Shared library › Fields and a field's page | QA-39 (updated) | Major | screens | "Canonical fields"; the key `case.application_date` leads each row; Type `yes_no`; "1 form fields"; "staff working view"; "Versions: v1 published (user-A)"; last column cut off at 1024 |
| Shared library › Document types, Sections | QA-71 | Major | screens | Facts as keys (`person.family_name …`); categories `client` / `other`; "reader profiles"; "client-side person"; "v1" and "Imported release" on every row |
| Shared library › Checks | QA-72 | Major | screens | "Checks are set up on a later screen … (Screen 04)" |
| Combination › Review and release | QA-73 | Major | screens | Items by key; "Derived definition"; "Calculation other has no tested helper"; `count_people_in_role`, `subject_spouse_or_partner`; "IMM 1295: IMM 1295:"; "SME duty" |
| Releases, Activity | QA-74 | Major | screens | `user-A / user-A / user-B`; Fingerprint hash; "configuration row"; "51 program nodes"; case id and hash in Activity; three date formats |
| AI work › a field-map job | QA-75 | Major | forms | `NEEDS_PERSON`; "Form: AI-proposed field map" with no form named; "not the product's provider route"; "the comparison … below" with nothing below; trail "Sources and forms" |
| Case page (officer), client questionnaire | QA-76 | Major | runtime | Tooltip "The evidence lane's fill trial … (P-65)"; "(forms slice 2)"; "representative" in lower case |
| Combination header, Overview, Questionnaires | QA-77 | Minor | runtime | "Applicant, Spouse or partner (travelling)" against "Principal applicant, Spouse or partner" on the same combination |
| Combination › Forms, Documents | QA-78 | Minor | runtime | "Online (later wave)"; "No form find yet … Nothing was spent yet" on a Live combination; file names; capitals in IRCC titles; "provided by other", "Base" |
| Combination › Overview | QA-79 | Minor | screens | "Release 1 on today 7:53 a.m."; "39 · 64" unlabelled; tiles with words and no number; "Forms" linked twice |
| Shell; AI work detail; Held file | QA-80 | Minor | screens | One browser-tab title for every page; "Acting as … Super A…" cut at 1024; one role with three names; a page with no heading, out of line; held badge "Waiting for a second person" while the uploader must act |

**Read and found clean:**
* Program structure (both types), apart from one word: "release or discard them first". "Discard" is not a §4 word; Delete is. I'm noting it here rather than as a row.
* Immigration programs: cards, list and Corporate.
* Start setup and the Forms tab offer (S3).
* Preview.
* To review, all filters.
* The library change page, as the second person.
* The client questionnaire, apart from "About representative".
* Cases list (officer); the client's "Cases are for the case officer".
* `/new`: Page not found.

**Checked and left alone:**
* "Global Talent Stream" is an IRCC program name, not the §4 word "stream".
* "R204(c)" and "LMIA" are IRCC's own terms.

## The Demo menu and Reset dialog (scaffolding, P-35)
They show:
* a server folder path;
* "Fingerprint (SHA-256)" with hashes;
* "AI run records (P2 drafting and P5 reader)" and "(P3/P4)";
* "Open the case area (runtime preview)".

The sidebar note says "guarded prototype route" and "PostgreSQL". These are demo-only controls, so I raised no row. Evidence: `demo-reset-1440.png`.
* *Later · Scaffolding:* plain words there too if the founder demos the reset to anyone outside the team.

## Not walked
* The merge review page (`/review/merge`) and new-edition pages (`/review/edition`, `/review/form-fields`). The sample has no merge or new edition, and making one needs AI or a changed canada.ca file.
* Mobile widths: wave 1 is desktop only.

## Questions for the Lead
1. **QA-39, QA-71 and QA-73: should keys disappear from the screens entirely, or only stop leading?** The field's label exists in the data (`canonical_field.label`), so the screens lane can lead with words. My recommendation is that keys stop leading and stay as small grey text under Details, since authors still need them for the team's adapter.
2. **QA-80: should every page get its own browser-tab title?** The shell sets one for all pages, which makes history and tabs useless. This is small, but it touches every page.

## Suggestions
* *Needed for the proof · Scaffolding:* run `check_qa_wording_1029.cjs` in CI with a short allow-list, and fail on decision numbers, "Screen NN", "slice", "lane" and raw `a.b_c` keys on the main path. Today the words drift back after each round.
* *Later · Capability:* one date and time format across the studio ("29 Oct 2026, 7:53 a.m.", or "today at 7:53 a.m.").
