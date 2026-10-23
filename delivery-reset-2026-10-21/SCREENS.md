# Screen blueprint — Pathway Configurator, case officer and client

Status: **Proposal for build**, 21 Oct 2026. Masters are defined in `MASTERS.md`. Build on the team's frontend (React 19, Vite, Refine 5, shadcn/Radix, Tailwind 4, TanStack Table — `ERv2-frontend` package.json) and extend `src/features/admin/spine-authoring/*` rather than building new pages beside it.

## A. UX rules (every screen; the reviewer checks these)

1. **User words only.** No hashes, run IDs, decision codes, "replay", "guarded path", "composition", internal keys or model names in the main view. Provenance and IDs live in a "Details" drawer for admins.
2. **One navigation model:** left rail (areas) → tree or list → detail. **At most one row of tabs** on a page. Editing happens in a right-side drawer; the page underneath stays put.
3. **Every list** has search, facets, saved views, bulk select, a "where used" count and compact rows (36–40 px). Long source quotes show one line with hover/expand.
4. **Draft is always visible**: a slim bar "Editing draft · 6 changes · Submit for review". Published content is read-only until a draft is opened.
5. **Preview beside the editor**, not on another tab: change a line, see each person's questionnaire/checklist/forms update.
6. **AI output is a proposal in the same UI**: same table, an "AI" badge, Accept / Edit / Reject per item and in bulk. No separate "AI world" of screens.
7. **Reasons on everything resolved**: "Asked because Marital status = Married".
8. **Warn, don't block** — except the publish checks SA-01B names and the form's own Validate (D7).
9. **Empty states teach**: what goes here, one primary action, one example.
10. **Numbers that need an expert** (fees, points, deadlines, thresholds) show the official source beside the value and are confirmed one by one (D2).
11. Use the team's brand, components and i18n keys; keyboard reachable; works at 1280 px and degrades to a single column under 1024 px (the team's tree page already does this).

## B. Information architecture — Super Admin

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ExpatReady · Pathway Configurator   [Canada ▾] [Pack: Draft 13 ▾]   ⌕   (me) │
│ ▸ Editing draft 13 · 6 changes · last saved 2 min ago        [Submit for review]│
├──────────────┬────────────────────────────────────────────────────────────────┤
│ Programs     │                                                                │
│ Library      │                    (area content)                              │
│   Fields     │                                                                │
│   Answer lists│                                                               │
│   Sections   │                                                                │
│   Documents  │                                                                │
│   Forms      │                                                                │
│   Conditions │                                                                │
│ Rules & scoring│                                                              │
│ Reference data│                                                               │
│ Steps & dates│                                                                │
│ Roles & regulator│                                                            │
│ Review & publish (3)│                                                         │
│ Content health│                                                               │
└──────────────┴────────────────────────────────────────────────────────────────┘
```

## C. Screens

### S1 Programs workspace — tree · detail (the home screen)

```
┌─ Tree (320px) ─────────────────┬─ Detail ─────────────────────────────────────────┐
│ ⌕ Search programs or forms     │ Individual › Work permits                         │
│ Filter: [All] [Not startable]  │ Program · 6 rows · 4 startable · 2 need work      │
│ ▾ Individual                   │                                                   │
│   ▾ Work permits         ●4 ○2 │ Readiness by row                                  │
│     ▾ Employer-specific    ●   │ Row                     Forms Docs Sections Steps Fresh│
│     ▾ Open work permit         │ Employer-specific        ✓    ✓    ✓       ✓    ✓  │
│        Spousal OWP        ○    │ Spousal OWP              ✓    !2   ✓       –    ✓  │
│        PGWP               ●    │ PGWP                     ✓    ✓    ✓       ✓    !  │
│   ▸ Study permits        ●3    │ …                                                 │
│   ▸ Visitors             ●2    │ [Add item to many rows]  [Copy a row]  [+ Category]│
│ ▸ Corporate                    │                                                   │
│ [+ Add pathway]                │                                                   │
└────────────────────────────────┴───────────────────────────────────────────────────┘
● startable  ○ not startable (hover: what is missing)  ! needs attention
```
* Tree: inline add child, rename, disable, drag to reorder siblings (saved as a set). Leaf rows carry a status dot.
* Non-leaf selected → readiness matrix of its rows + bulk tools [SA-1B-61, 90, 91].
* Leaf selected → opens S2 in the detail pane (tree stays visible).

### S2 Row editor — the heart of the product

```
┌ Individual › Work permits › Employer-specific work permit        ○ Not startable (2) ┐
│ Locations: Outside Canada  Inside Canada │ Filed: Online + PDF · Representative Portal│
│ Fees: Work permit $155 (each applicant) · Biometrics $85  │ Stages: 1  │ [Row settings]│
├──────────────────────────────────────────────┬───────────────────────────────────────┤
│ View: [By type]  By person                    │ PREVIEW  Sample: [Couple + child 3 ▾] │
│ ▾ Forms (6)                          [+ Form] │ Principal · Spouse · Child            │
│   ⋮ IMM 1295 Work permit outside Canada       │ ─────────────────────────────────────│
│       Each: Principal, Spouse   always        │ Questionnaire  11 sections · ~35 min │
│   ⋮ IMM 5645 Family information               │ Checklist      14 documents          │
│       Each: Principal, Spouse   if outside Canada│ Forms         IMM 1295, 5645, 5476  │
│   ⋮ IMM 5476 Use of a representative          │                                       │
│       Once   if a representative is used      │ ▸ Checklist for Spouse                │
│ ▾ Documents (14)                  [+ Document]│   Passport                 always     │
│   ⋮ Passport                Each · always     │   Marriage certificate     because    │
│   ⋮ Marriage certificate    Once per couple · │     Marital status = Married          │
│        if Marital status is Married           │   …                                   │
│   ⋮ LMIA copy  Principal · if job has LMIA  ⚠ │                                       │
│ ▸ Questionnaire sections (11)     [+ Section] │                                       │
│ ▸ Government steps (3)                        │ What blocks startable                 │
│ ▸ Standard steps (5)                          │  • Role "Child" has no sections       │
│                                               │  • Form IMM 5476: no current edition  │
└──────────────────────────────────────────────┴───────────────────────────────────────┘
```
* One list of lines, grouped by kind, each line one compact row: item · who chips · only-if sentence · source icon · drag handle. Click → right drawer with the line fields [SA-1B-57, 60, 102].
* "By person" view: columns Principal / Spouse / Child — what each person gets (makes per-role errors obvious) [SA-1B-73].
* Preview panel: pick a sample family; each person's questionnaire, checklist and forms with reasons [SA-1B-59, 62].
* Startable checks as a live list, each item links to the fix [SA-1B-63, 90].
* Row tools: copy from another row; add/remove an item across many rows with the affected-rows list before it goes to review [SA-1B-61].
* "Add a form with AI" lives here (see S12), not on a separate page.

### S3 Fields library

```
⌕ Search 1,240 fields          Group[▾] Type[▾] Tier[▾] Filled by[▾] Privacy[▾] Used in[▾]   [+ Field]
Field                         Type   Group        Tier      Filled by     Used in
Date of birth                 Date   Identity     Lead      Client 🔒     38 rows · 21 boxes
Marital status                List   Civil status Prospect  Client        52 rows · 30 boxes
Current residential address   Group  Address      Case      Client        60 rows · 44 boxes
```
Drawer tabs (one row only): Definition · Validation · Answer list · Form boxes · Where used · History. While typing a new key or label, a **"Similar fields"** box lists likely duplicates (the guard AI normalization needs) [SA-1B-1, 17].

### S4 Section builder

Three panes: section list · canvas (placements as cards; field groups render as one block; rule badges "Show if Married") · properties. Rules are written as sentences: Show [Marriage date] when [Marital status] is [Married, Common-law]. Toggle "Client view" renders the section at phone width. Publishing blocks hiding a field that a form box or rule reads [SA-1B-9, 14].

### S5 Document types

Catalogue grouped by category with facets (provided by, expires, translation, handling). Drawer: Basics · Validity & expiry · Substitutes · Country notes · Where used.

### S6 Form workspace (split view)

```
┌ IMM 1295 · Edition 09-2023 (current) · XFA · Map 92% (14 need review)  [New edition] ┐
├──────────── PDF page 3 (rendered) ───────────┬── Boxes on this page ─────────────────┤
│  [ Family name ▓▓▓▓ ]  ← highlighted box     │ Box               Maps to       Status │
│  [ Given name  ░░░░ ]                        │ Family name       Name·Family   ✓      │
│  [ Date of birth YYYY-MM-DD ]                │ Given name        Name·Given    ✓      │
│  …                                           │ Date of birth     DOB (Y-M-D)   ✓      │
│                                              │ Other names used  —             ? AI   │
│                                              │   AI proposes: Name history (all)      │
│                                              │   [Accept] [Choose field] [Never fill] │
└──────────────────────────────────────────────┴───────────────────────────────────────┘
```
Click a box ↔ highlight its row. New edition → diff (added / removed / moved boxes) [SA-1B-26..33]. Answer-sheet preview tab shows the copy-button view staff get at launch (AG07-D17).

### S7 Rules & scoring

Conditions library (sentence builder, where used, test with a sample person). Gates per program. Scoring grid as a spreadsheet of factors × brackets; test bench runs sample profiles and shows score breakdown next to the expected answer key (D8b).

### S8 Reference data

Table → version → spreadsheet grid with dated values; bulk upload → preview (create / update / error rows) → commit all-or-nothing [SA-1-41]. Source and review dates on the version.

### S9 Steps & dates

Three lists: Government steps (with has-deadline and usual timeline), Standard-step starters per program, Key-date types.

### S10 Review & publish (works like a pull request)

```
Change set: Draft 13 → for review          Author: content publisher · 6 changes · affects 14 rows
▾ Forms (1)        IMM 5476 added to 6 rows                 [view diff]
▾ Documents (2)    Marriage certificate: who Once → Once per couple   AI-drafted, edited by person
▾ Fees (1)  ⚠ expert   Work permit fee 155 → 155  source: IRCC fee page, checked 21 Oct  [Confirm]
▾ Fields (2)       New: Name history (list) · Changed: Marital status values
Checks: ✓ references resolve  ✓ no hidden field read by a form  ⚠ 2 items past review date
                                      [Reject with reason]   [Approve & publish]  (different person)
```
Every behavior-bearing change is listed, including roles, document-type facts and derived fields (grounding audit finding 2). Author ≠ approver [SA-1B-38; D1, D2].

### S11 Content health

Startable vs not (and why) per program; items past next-review date (sortable) [SA-1B-40]; language completeness [SA-1B-92].

### S12 Add a form with AI (a drawer launched from S2 or S6)

Step 1 upload form PDF + the official checklist/guide → Step 2 AI reads boxes and proposes: reuse existing field / new field / ambiguous (person decides) → Step 3 review in the normal S6/S3 tables with AI badges → accepted items land in the current draft change set (S10). No separate job/replay pages in the main path; job history sits in Activity.

## D. Case officer screens (consume the published pack)

* **A1 Filing workspace**: person tabs (Principal · Spouse · Child) → one row of tabs: Facts · Documents · Forms · Steps. Header: row path, stage, pinned rules version, location per person.
* **A2 Facts sheet ("all data on one screen", D5)**: grouped by section; each fact shows source (client / officer / document) and conflicts; count of empty required facts; **[Autofill forms]**.
* **A3 Document review**: viewer left, extracted facts right with confidence; conflicts with existing facts highlighted; Accept / Fix / Reject; nothing reaches facts without a person.
* **A4 Form review**: rendered form with values; click a box to fix → updates the case fact (D5b) with "Also update the client's profile"; Validate (D4); answer sheet with copy buttons as fallback.

## E. Client portal

* **C1 Family link**: a tab per person, progress per section, "Send to [name]" for another adult (D12); questions with plain reasons; upload checklist with "why we need this"; estimated time per section [SA-1B-16].

## F. Build order of screens (matches the slice plan)

S1 → S2 (lines + startable checks) → S2 preview (resolver) → S3/S5 library polish → S10 review & publish → S6 + S12 forms and AI → A2/A4 officer → A3 documents → C1 client.
