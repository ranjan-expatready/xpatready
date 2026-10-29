# Shared library authoring model — summary (research, 29 Oct 2026)

**Full report (evidence, scores, all sources):** `reports/Shared library authoring model.md`. Research and recommendation; changes nothing until the founder decides the questions below.
**Asked (founder, 29 Oct, condensed):** which master types the shared library should have and how to show them; whether AI only creates, people may add by hand, or AI creates and a person edits; how it works at combination level; how a manual Add works for fields with technical names, duplicates and speed; whether the same rules apply to sections, document types and forms.

## Recommended model
**"AI drafts from the official source, a person edits and accepts, a second person approves; a manual Add is allowed for every master except forms, and runs the same checks as AI's proposals"** — the founder's third option plus a governed manual way in (what mature tools do: Collibra, Purview, Informatica, Reltio, Ironclad).

1. One library of definitions; combinations only point at them — never copies.
2. The first maker differs by master type (table below).
3. Manual Add = "describe it in words": rules check as you type, AI proposes the full definition **and where it applies**; the system builds the technical name, read-only.
4. Duplicate control in three layers, cheapest first: rules block exact duplicates (US$0) → meaning shortlist (< 1 s, no AI call) → AI "did you mean" on the shortlist only. A near duplicate needs a reason; a "Not the same as X" answer is remembered.
5. Same rules for AI and people: same checks, same Ready / Check / Decide words, same second person.
6. Local changes visible, never silent: a combination may change wording, help text or a check's message for its own use — marked "Changed for this combination", shown at release beside the library text. A meaning change must be a library change with "Used by" first.
7. One lean list per master, plain names first; Used by · status · made-by on every row; menu order = setup order.

## First maker per master
| Master | First maker (main path) | Manual Add? |
|---|---|---|
| Forms (incl. checklists, guides) | System from canada.ca, or a person uploads a PDF — **never a typed form record** | No: the file is the only way in |
| Person roles | The team; the immigration expert confirms | Team only, through the one Add |
| Fields | AI, from each form field on a library form (reuse / new) | Yes: describe in words → AI proposes definition + where it applies |
| Answer lists | Rules read the form's own choices (US$0) | Yes, "use an existing list" first |
| Sections | Rules group fields by the form's parts; AI names them | Yes, from existing fields only |
| Document types | AI, from checklists, with the quoted line | Yes, describe in words |
| Conditions (shared sentences) | AI, from form instructions and guides, with the quote | Yes, write the sentence; AI turns it into the rule |
| Checks | Tier 1 from form limits by rules; tier 2 by AI from guides | Yes, describe in words; values Sample |

A form is the one exception everywhere: it is an official document, not a definition people invent; its duplicate key is number + edition + fingerprint.

## Library vs combination
The library says **what a thing is**; the combination says **whether, where, in what order and for whom it is used** (which forms it files in filing order; which fields for which role, Comes from and PQR tick; checklist lines per person; "Only if" on each line; checks switched on). Live reference, picked up at the combination's next release; the "Changed for this combination" marker (A5) is the only local layer.

## Amendments recommended (detail and evidence in report §7)
- **A1** (P-120): the Add also proposes *where it applies* — matching form fields and checklist lines, async proposals that travel into the same queue; never blocks Send.
- **A2** (P-95/P-120): rules and the meaning shortlist always on (US$0); AI "did you mean" only on a close match or on "Check with AI" (about US$0.01 shown, P-138 style).
- **A3** (P-53/P-120): "Not the same as X" stored with the reason; the pair is not raised again.
- **A4** (P-120/P-123): written down — forms enter only as official files; person roles team-only with expert confirmation; all other masters AI-first plus the one Add.
- **A5** (new row): local override of question wording, help text and check messages only, marked and reviewed at release; no local meaning changes.
- **A6** (P-34): duplicate layer 2 = a meaning index (pgvector or similar) before any AI call — must pass the STANDARDS §1 technology gate.
- **A7** (P-116): display only — "Used by" count as a list column.

## Founder questions (report §8; recommendation first)
1. Should the manual Add also propose where the item applies? → *recommended yes (A1)*
2. When does AI "did you mean" run on a manual Add? → *recommended: only on a close shortlist match or on click (A2)*
3. May a combination change a library item's wording for its own use? → *recommended yes, marked and reviewed (A5)*
4. May we add a meaning index (vectors in PostgreSQL)? → *recommended yes, through the STANDARDS §1 gate (A6)*

## For the build
- **S6 slice 1 (fields):** the Add's steps are already agreed; "Where this applies" and "Not the same as" land only if the founder says yes to Q1; the meaning shortlist waits on Q4 (until then, AI on the rules shortlist).
- **Queue item contract:** add `origin` (AI · Rules · Person), `reason`, `notSameAs[]`, `placements[]`, so a manual Add and an AI draft are the same kind of item.
- **Q&D tabs (runtime):** show a "Changed for this combination" marker once A5 is decided.
