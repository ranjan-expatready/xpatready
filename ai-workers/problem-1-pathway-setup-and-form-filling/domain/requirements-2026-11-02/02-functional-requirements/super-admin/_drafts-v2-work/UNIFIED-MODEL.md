# ExpatReady SA-01B unified model (proposed 24 Oct 2026, for adversarial review)

Full decision record: /Users/team-member/Documents/team-workspace/FINAL-SuperAdmin-FR/SA-01B-REDESIGN-DECISIONS_2026-10-18.md (Decisions 1–20, aligned rows, R1–R7, G1–G7). Current SA-01B: FINAL-SuperAdmin-FR/SA-01B-content-pack-configurator_v1.9_2026-10-23.md.

## Core idea: one fact, used everywhere
Every piece of information about a person (or organisation) is ONE canonical field, defined once in the library. Everything else is a view of those facts.

LIBRARY (ExpatReady-authored; AI drafts from government papers and pages; people review; expert confirms numbers one by one; second person publishes; every item sourced and versioned; change watch re-reads sources):
- Canonical fields: key, type, answer list, field group, about person/organisation, tier (prospect/case), main source + fallback (client / document / officer), "still true?" re-confirmation rule, privacy mark, immigration-significant flag, client-locked for nothing (background answers: client's or staff on behalf, never defaulted).
- Sections: placements of field groups for the client questionnaire (client wording, help, required, order).
- Document types: category (fixed list), client name and help, who provides, formats, translation, handling, validity rule (expires? how date known; what it must outlive; issued within N months), "status document" mark, dates captured (these dates ARE canonical fields), fields it supplies (canonical fields read by OCR), standard + ordered alternatives (each with "when acceptable"; any-one / all-together sets; a programme row picks a named set).
- Form editions AND portal screens (a portal screen = a form edition): field inventory; box map entries = canonical field + purpose + WHOSE fact (self / partner / child n / representative profile) + row + transform + answer-list value map; who signs and how; trial status per edition (viewer vs answer sheet); accuracy record; box notices; hand-fix signals.
- Conditions ("only if"): one language over canonical fields, purposes and reference tables, with equals / in / exists / and / or / not / at least / at most / between / age on a date.
- Reference tables: content-defined types and columns; dated versions (in force from/to); sourced; versioned codes (NOC 2021→2026 mapping); "where used"; change watch.
- Scoring grids: table-driven over canonical fields and tables; ranked per-programme results; reason and gap; rules-as-at date.
- Government steps: staff name + client name; has-a-deadline; deadline rule (calendar days; from letter or rule); usual timeline.
- Starter to-dos: per programme, default business days; firm copies and edits in AG-13.
- Key dates = canonical date fields with a reminder class (status / document / none); status reminders fixed (X-3: staff 30/15/7/2, client 30/7); document warnings fire only when the IRCC validity rule will fail by the filing's target date; passport-caps-permit check.

PROGRAMME ROWS (Pathway › Program › Category › Sub-category): allowed locations (inside/outside Canada; separate sub-categories only where IRCC treats them as different applications); filing method (online / online+PDF / PDF) and portal; stages (ordered, allowed next stages, repeatable, start at any stage); LINES of one shape: what (section / document / form / government step / starter to-do) · for whom (once for the application with default provider roles, or each person in roles) · only if (condition) · order.

RESOLVER (one engine, re-runs live as facts change): for each person on each filing → their questions (only fields not known, not supplied by a requested document when AI is on, not officer-sourced), checklist (layer 1 row base + layer 2 answer-triggered + layer 3 officer requests + client's own extras), forms (incl. answer-triggered forms and officer-added library forms on one filing), steps and deadlines, each with its reason.

FACTS PER PERSON (per firm; X-2 one set of answers per person across cases): one current value per field with source (client / document / officer / earlier case / import), status, history; conflicts shown side by side, the officer picks (never silently); document-read values are proposals until staff "Confirm & use" (one review per document, exceptions highlighted); client answers fill forms directly; a fix on a form is an override on that form only, "push back" separate; blanks never defaulted; declarations and signatures only by the person.

VERSIONS: each filing pins the pack version current when it opens (Start next stage = current version; side-by-side filing = principal's version); an IRCC change in force by the filing's target date shows a CRITICAL warning with a one-click move (reason pre-filled); values frozen at submission; fees follow the date IRCC receives the application.

CLIENT SIDE: one family link with a tab per person; "Send to [name]" (email code, privacy on); upload first, type less; plain wording; "still true?" for returning clients; no assessment shown (sales tool; reviewed PDF report may be shared from the prospect module).

OFFICER/FIRM SIDE: zero setup; case data screen with every fact and its source badge; checklist; forms (viewer for trial-passed editions, answer sheet otherwise, Chrome extension for portals with guardrails); only firm changes: hide items without deadlines, rename client names, edit to-do starters, add a form or document to one filing.

LEARNING LOOP (moat): change watch on sources; hand-fix signals across firms (counts only); box notices; accuracy record per form; content team fixes once for all firms.

PROGRAMME FLOW: prospect (firm's lead form → optional PQR → optional Assess, staff only) → client + case (personal details carried; programme pre-selected) → per person per filing resolution → collect (client / documents / officer) → forms → approve → sign → submit → government steps → next stage.
