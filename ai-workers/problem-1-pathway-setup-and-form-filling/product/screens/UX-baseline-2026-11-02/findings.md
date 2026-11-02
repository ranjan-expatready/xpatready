# UX baseline, 2 Nov 2026 (read-only walk of the demo at :4400, independent reviewer)

Score **5.5 / 10**. Screenshots in this folder (numbers below). Facts observed unless marked inferred. Journey B (case screens) could not be walked: no case exists in the demo.

## Keep
* Setup checklist computed from what exists, one link per step, "After X" dependencies (05, 11).
* Preview: Sample family, per-person preview, questionnaire in a phone frame, a "because…" on every line (14).
* AI gating: "Draft questions and documents" lists 7 plain steps tagged rules / saved / none saved, "Draft with Saved (US$0)" (23); visible focus ring and tooltips (31).

## Findings (by user impact) and group
| # | Finding (screen, screenshot) | Best-in-class pattern | Change | Effort | Group |
|---|---|---|---|---|---|
| 1 | Counts disagree: Visitor visa Forms badge 4 (later 6), tab "2 forms on this combination", Overview "0 forms"; LMIA badge 4 vs Overview 8; one LMIA principal: 145 questions, "forms need 120 answers", "asked (83)", "98 facts" (05, 06, 11, 12, 14, 23) | Stripe Dashboard: one definition per metric, hover explains | one computation and one fixed label per count; a badge says what it counts ("4 to do") | M | A |
| 2 | To review says "Nothing waits for you" (15) while Visitor visa has 3 release-blocking errors (10) and LMIA "2 problems to fix" (11) | Linear Inbox; Docketwise task list | "Needs you" includes release blockers and each combination's next step | M | A |
| 3 | Always-on explanations: "Can't retire yet: …" under most structure rows (03); a 4-line "Remove from questionnaire: not here…" per section (13); a 2-line "Attached from the Form library…" per form row (06) | Linear / Stripe: disabled control + tooltip with the reason | reason in a tooltip or popover on the disabled control | S | A |
| 4 | Internal identifiers on the main path: field keys like `case.application_date` in Fields and the URL (17, 18); the Draft with AI dialog shows the model name, a run file name, a Job ID and "Wave 1" budget lines (22); EXPERIENCE §5 | Stripe "Developer details" collapsed | a "Details" drawer for admins; saved answers named by form and date | S | A |
| 7 | Contradictory statuses: LMIA "Live" with "3 of 5 done" and next step "Confirm the checklist page"; Visitor visa card "Resume setup" at "0 of 5 steps"; "In progress" / "In setup" / "Setup draft" for one state; banner "No unreleased changes" while Review lists 22 draft changes (02, 03, 10, 11) | Linear: one workflow status per item | one status vocabulary; the next step knows a combination is live | S–M | A |
| 5 | P-271/P-272 names not on screen: "Questionnaires", "Pre-qualification", "The case officer (case view)" (12, 13, 14, 18) | — | rename | S | B (row K13) |
| 9 | 400 px: left menu collapses to zero width with no menu button; "Acting as" zero width; combination tabs start ~620 px down; tables scroll sideways (28, 29, 30) | Linear mobile drawer | hamburger drawer; compact header and Sample banner | M | C |
| 10 | Persona trap: opening Cases switches "Acting as" to Case officer; back in the Studio a blank page with a banner and 403s; no Cases link in the Studio menu (inferred from routes); no seeded case (01, 24) | — | persona per area; Cases link; a seeded family case for the demo story | S | D |
| 6 | Questions have no wording: every row "No question written yet (the field's name is shown)"; a client would be asked "Subject is principal applicant" (13) | Typeform / Notion inline editing with suggestions | AI proposes the wording for review; "Needs wording" filter with a count | M | E |
| 8 | Review and release lists 22 ungrouped "Calculated answer" library rows on Visitor visa, Origin "—", Signed empty; the 3 errors have no Fix link (10) | GitHub grouped file list (EXPERIENCE "Change set") | group "Shared library (22)", before/after, Fix link per error | M | F |
| + | Libraries inconsistent: Fields dropdown filters and "0 of 0" while loading; Forms chips and skeletons; Document types no search; "Status" columns hold Edit/Retire buttons; field detail is a full page, not a drawer; 21 solid primary buttons on Home (02, 16–21) | one list pattern (EXPERIENCE §3) | one list, filter, loading and drawer pattern | M | F |

Groups: **A** trust fixes (founder: in M2, new lane, P-273) · **B** row K13 · **C–F** to the founder one at a time.
