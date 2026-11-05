# C1.3 + C11.5 part 2 — "Relies on an employer case": pick one, the employer's facts are copied in · concept r1, runtime lane, 5 Nov

Status: **concept for the tech lead's approval** (no board; P-223 (4): independent Opus challenge in `challenge.md`, then the tech lead). Founder 5 Nov: M3 runs alongside M2's last rows (lifts P-332). P-316 (2): C1.3 and C11.5 are the same employer pre-fill, one capability (qa merges the rows).

## 1. Job and journey
**Job.** On a worker's employer-specific work-permit case, the case officer picks the employer case it relies on, and the employer's facts the worker's forms read (employer name, address, LMIA or offer number; P-106) are filled in once, marked where they came from, so nobody types them again. **Persona:** case officer or representative of the case's firm (staff). **Journey:** activity 7.x Open a case → Get the information; SA-1B-283 (linked files), SA-1B-284 (privacy barrier, Not built), AG-7-55; stand-in **SI-10**.

## 2. What exists, what is new (ten layers, short)
| Layer | Built on main | New here |
|---|---|---|
| Rule | `engine/runtime/employer.ts`: offered only on a Retail release whose forms read `organisation.` facts; Corporate never (C11.5 part 1) | `carriedFacts(release, employerCase)`: which employer facts move; **fix**: a box read for the *representative's* firm (IMM 5475 `organisation.name`, person `representative`) is not an employer fact (today the work permit says "3 employer facts"; it reads 2 plus the LMIA number) |
| Employer case | none (the LMIA combination has no forms and no release on the six or the checkpoint; P-239: no Corporate configuration in the POC) | **One Sample employer case per firm**, `samples/employer-cases.json` (stand-in SI-10): firm, Sample employer name, Sample address, Sample LMIA number, keyed by library fact keys. Read-only. No real IRCC/ESDC number |
| Case data | `client_canonical_answer` append-only; `firm_record` pill for representative facts (C6.11) | copied facts are **ordinary stored answers** (DECLARED) on the worker's case, `source_json {channel: "linked_file", employer_case, employer_name, at, actor}`; the link itself = those answers + one audit event "relied on employer case". **No migration** (Q3) |
| API | `GET /runtime/combinations/:id/employer-link`, `employer_link` on `GET /runtime/cases/:id` | `GET /runtime/cases/:id/employer-cases` (the firm's employer cases + per fact: new · same · different) · `POST /runtime/cases/:id/employer-link {employerCase, replace[], version}`; `employer_link` gains `linked{employer_case, name, at, by, facts[]}` |
| Screen | the line "Relies on an employer case" + reason on Open a case and the case header (`web/src/runtime/employer.tsx`) | on the case header: **Choose employer case…** → drawer (§4); after: "Relies on: <employer case> · facts copied <date>, not updated later"; in the questionnaire each copied fact shows the pill **"Employer case"** (tooltip names the case and date), editable like any answer |

## 3. Business rules
* **BR-1 Offer** (P-106; C11.5 part 1, kept): only on a Retail case whose pinned release reads employer facts; never on a Corporate case; staff of the case's firm only (client, configuration 403).
* **BR-2 What moves** (SA-1B-283 r1, r5; P-106): the employer case's facts that the worker's **pinned release reads** (`organisation.` facts on the worker's forms, not the representative's firm; plus the filing facts the employer case holds, e.g. `case.lmia_or_offer_number`). Nothing else: no business facts (SA-1B-284's barrier; shareable marks are L-SA4, Not built). A fact the release does not read stays on the employer case.
* **BR-3 Copies, not live links** (SA-1B-283 r4, SI-10 as updated by P-239; P-106 "pre-fills"): values are copied at link time with source "Employer case" and the date; a later change on the employer case never reaches the worker's case. The officer corrects a copied value on the worker's case like any answer (r12); C9.2's out-of-date rules then apply as for any change.
* **BR-4 Nothing overwritten silently** ("duplicate beats a miss", r10): per fact the drawer shows **New** (no answer yet: copied), **Same** (no write), **Different** ("On this case: X · Employer case: Y", unticked: kept unless the officer ticks *Use the employer case's value*). Blank stays blank (r5).
* **BR-5 One review** (r6, P-72): copied values are DECLARED; they are confirmed in the usual Confirm section, never auto-confirmed.
* **BR-6 Once per case** (r6 "created, then read-only"): a second link is refused (409, naming the case and date); two officers at once → one link (row lock on the case); stale `version` → 409 Reload. Unlink: Not built (Q1).
* **BR-7 Firms apart** (C6.11, SI-9): a firm sees only its own employer cases; another firm's key → 404, never its name.

## 4. Layout and states (Workspace pattern; drawer, never a modal; team tokens)
Case header line (today) gains a secondary button. Drawer "Rely on an employer case", width 480:
```
Rely on an employer case                                   [Stand-in SI-10 ⓘ]
Employer case  (•) Sample employer case — Sample Employer Ltd (Sample)
What will be copied to Client A's case (the forms read these 3)
  Employer name      Sample Employer Ltd (Sample)        New
  Employer address   1 Example Street, Hamilton ON (Sample)           New
  LMIA or offer no.  Sample-0000000                                    Different: on this case "A123"  [ ] Use the employer case's value
Copied once, today. Later changes on the employer case are not copied.   [Cancel] [Copy 2 facts]
```
States: loading (skeleton) · no employer case in this firm ("Your firm has no employer case yet. Today the demo has one Sample employer case per firm.") · nothing to copy (all Same) · saving · 409 already linked / someone else saved (Reload) · error words · linked (read-only line) · keyboard only; axe clean at 1440, 1024, 390.

## 5. Copy
Tooltip (BR-13 board words): "Today: one Sample employer case, linked read-only. Later: the team's AG-17 Corporate cases and LMIA." · Pill tooltip: "Copied from <employer case> on <date>. Changes there are not copied; edit it here if it is wrong." · 409: "This case already relies on <employer case> (linked <date>)."

## 6. Contract and tests (pass + fail per rule) — acceptance `acceptance/C1.3.test.ts` (new, written first, red on main), moved into `tests/runtime/` when green
Setup: the configured checkpoint (P-322), a case on "With an LMIA – inside Canada" release 1. BR-1 offer on WP · not on VV, not for the client (403) or author (403). BR-2 exactly name, address, LMIA number move · `organisation.name` (representative's firm) and a fact the release does not read do not; the offer says "2 employer facts". BR-3 a changed Sample employer value after link leaves the worker's answer as copied · the copied value's source is linked_file with the date. BR-4 New written, Same not written, Different kept unless ticked · ticked replaces, old kept in history. BR-5 status DECLARED; Confirm section confirms it · not VERIFIED by the copy. BR-6 second POST 409 · two at once → one set of answers; stale version 409. BR-7 the solo firm sees its own case only · the Sample firm's key from the solo firm → 404. Browser `check_c13_employer_link_browser.cjs`: the walk at 1440 px, keyboard, axe, pill in the questionnaire. Graph: both routes named in checks. US$0, no AI.

## 6b. Capability or scaffolding (P-33)
Capability: the rule, the copy, the drawer, the pill, the refusals. **Scaffolding, labelled:** the Sample employer case file (SI-10 chip) until AG-17 Corporate cases exist. **Not built:** unlink; shareable marks (L-SA4/SA-1B-284); job title, NOC, wage, work location, documents (SA-1B-283 r5's longer list); "Create work permit case" from an approved position (AG-17-45); worker milestones on the employer side.

## 7. Questions for the tech lead (recommendation first)
1. **Copy at link time (Recommended: SA-1B-283 r4, P-239's SI-10 "copied, not live-linked", P-106 "pre-fills")** — or the M3 concept's BR-13 "read-only, a change there marks the worker's items out of date". The two conflict; the team's requirement is newer and is the first source (AGENTS.md rule 2). Consequence: no live update, no unlink needed (values are ordinary answers); C9.2's "employer-case change" breadth line becomes "a correction on the worker's case", and BR-13's text in `M3-agent-view/concept-draft.md` needs a line from the tech lead.
2. **The employer case is a Sample stand-in record (Recommended)**, `samples/employer-cases.json`, one per firm, chip SI-10 — or a real case on the Corporate LMIA combination, which needs that combination's forms and a release (P-239: no Corporate configuration; would touch `demo.ts`, shared with M2).
3. **No migration (Recommended):** the link is the copied answers' source plus an audit event — or a new table `case_employer_link` (additive, needs the tech lead's migration read and the breaker). Consequence of no table: "linked" is derived from answers; if every copied value is later edited, the header still shows the link from the audit event.

## 8. Definition of ready
Acceptance test named (`acceptance/C1.3.test.ts`, §6) · row text: CAPABILITIES C1.3 + C11.5 ("Still: the link's pre-fill of employer facts") · decisions: P-106, P-239, P-316 (2), founder 5 Nov (M3 alongside) · open: Q1–Q3 above, for the tech lead.
