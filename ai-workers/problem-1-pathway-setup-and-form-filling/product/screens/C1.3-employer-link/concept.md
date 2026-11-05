# C1.3 + C11.5 part 2 — "Relies on an employer case": pick one, the employer's facts are copied in · concept r2, runtime lane, 5 Nov

Status: **concept for the tech lead's approval** (no board; P-223 (4)). r1 → independent Opus challenge (`challenge.md`: Build after these changes, 0 Blockers, 4 Majors) → **r2 folds in M1–M4 and m1–m8** (marked [Mn]/[mn]). Founder 5 Nov: M3 runs alongside M2's last rows (lifts P-332; no DECISIONS row yet [m7]). P-316 (2): C1.3 and C11.5 are one capability (qa merges the rows).

## 1. Job and journey
**Job.** On a worker's employer-specific work-permit case, the case officer picks the employer case it relies on; the employer's facts the worker's forms read (employer name, address, LMIA or offer number; P-106) are copied in once, marked where they came from, so nobody types them again. **Persona:** case officer or representative of the case's firm. **Sources:** SA-1B-283 (linked files: r4 "copies, not live links", r6 one review, r12, §13 "No live sync"), AG-07 v3.12 AG-7-55 r5 (facts carried "into the worker's answers") [m5], SA-1B-284 (barrier, Not built); stand-in **SI-10**.

## 2. What exists, what is new
| Layer | Built on main | New here |
|---|---|---|
| Rule | `engine/runtime/employer.ts`: offered on a Retail release whose forms read `organisation.` facts; Corporate never | `carriedFacts(snapshot, employerCase)` (BR-2). **Fix [m1]:** a box read for the *representative's* firm (IMM 5475 `organisation.name`, person `representative`) is not an employer fact, excluded by its person, not its key. Measured on the checkpoint: today the Visitor visa and Study permit are *offered* ("1 employer fact") and the work permit says "3"; after: VV and SP not offered, WP "2 employer facts". qa re-scores C11.5 part 1 on the checkpoint |
| Employer case | none (LMIA combination: 0 forms, 0 releases; P-239 no Corporate configuration) | **one Sample employer case per firm**, `samples/employer-cases.json` {firmKey, key, label, facts by library key; the address in the library's address parts [M3]}. All values Sample, no real ESDC/IRCC number. **L-SA5 (M4) replaces this file** with its Sample employer combination and shareable marks; this row builds only the case side [m6] |
| Case data | `client_canonical_answer` append-only | copied facts are ordinary stored answers, status DECLARED, `source_json {channel: "linked_file", employer_case, employer_label, at, actor}`. **Written on the subject `aboutOf` gives [M4]:** `organisation.` facts on the principal (the form subject of IMM 5710; never a spouse), `case.` facts on the case subject ("The application"). The link = one `audit_event` (entity `case`, "relied on employer case", detail {employer_case, facts}). **No migration** (Q3) |
| API (`api/src/employer-link.ts`, new; types in `engine/runtime/employer.ts`, not `contracts/` [m8]) | offer route; `employer_link` on `GET /runtime/cases/:id` | `GET /runtime/cases/:id/employer-cases` → firm's cases, per fact {fact, label, value, state new·same·different, current{answer_id, value}\|null}. `POST /runtime/cases/:id/employer-link {employerCase, seen{fact: answerId\|null}, replace[]}` [M2]. `employer_link.linked{from_case, to_case: employer key, kind: "worker_permit", status: "ACTIVE", created_by, created_at, facts[]}` (team `CaseLink` names, AG-7-53 §7 [m4]). Both routes added to `acceptance/M3-CONTRACT.md` [m8] |
| Screen | line + reason on Open a case and the case header (`web/src/runtime/employer.tsx`) | case header: **Choose employer case…** → drawer (§4); after: "Relies on <employer case> · facts copied <date>; later changes there are not copied". Questionnaire: source **"Employer case"** shown *beside* the status (still "To confirm"), never instead of it [m2]; `linked_file` added to the channel words |

## 3. Business rules
* **BR-1 Offer** (P-106; C11.5): only on a Retail case whose pinned release reads employer facts (not the representative's firm [m1]); never on a Corporate case; staff of the case's firm (client, configuration 403).
* **BR-2 What moves** (SA-1B-283 r1, r5): the employer case's facts that the worker's **pinned release reads**; nothing else. A fact the release does not read stays on the employer case. No business facts (SA-1B-284; marks are L-SA4/L-SA5, Not built).
* **BR-3 Copies, not live links** (SA-1B-283 r4, §13; AG-7-55 r5; SI-10 per P-239; P-106 "pre-fills"): copied at link time with source and date; a later change on the employer case never reaches the worker's case. The officer corrects a copied value like any answer (r12); C9.2's out-of-date rules then apply as to any change.
* **BR-4 Nothing overwritten silently** (r10): per fact **New** (copied), **Same** (no write; composite values compared in stored key order, `inStoredOrder` [M3]), **Different** ("On this case: X · Employer case: Y", unticked: kept unless *Use the employer case's value* is ticked; the old value stays in history). Blank stays blank (r5).
* **BR-5 One review** (r6, P-72): copied values are DECLARED and confirmed in the usual Confirm section. *Departs from r4* ("keeps the status it had at its source"): the Sample file has no status; status is carried once AG-17 cases exist [m3].
* **BR-6 Once, and fresh** (r6 "created, then read-only"): under `SELECT … FROM runtime_case … FOR UPDATE`, a second link → 409 naming the case and date; any fact whose current answer id differs from `seen` → 409 "Changed since you looked: <label>", nothing written [M2]. Ending a link: Not built.
* **BR-7 Firms apart** (C6.11, SI-9): a firm sees only its own employer cases; another firm's key → 404, never its name.

## 4. Layout and states (Side panel pattern, EXPERIENCE §3; drawer 480 px, never a modal; team tokens)
```
Rely on an employer case                                         [Stand-in SI-10 ⓘ]
Employer case  (•) Sample employer case — Sample Employer Ltd (Sample)
Copied to Client A's case once, now (the forms read these 3):
  Employer name      Sample Employer Ltd (Sample)                        New
  Employer address   1 Example Street, Hamilton ON L8P 0A1 (Sample)      Same as on this case
  LMIA or offer no.  SAMPLE-0000000                                      Different — on this case: "A123"  [ ] Use the employer case's value
Later changes on the employer case are not copied; edit a copied value on this case.   [Cancel] [Copy 1 fact]
```
States: loading (skeleton) · no employer case in this firm ("Your firm has no employer case yet. Today the demo has one Sample employer case per firm.") · nothing to copy (all Same: button "Link without copying") · saving · 409 already linked · 409 changed since you looked (Reload) · error words · linked (read-only line) · keyboard only · axe clean at 1440, 1024, 390.

## 5. Copy [M1]
* Offer line (engine): "Offered: the <label> forms read N employer fact(s); you can copy them from an employer case." (was "…from a Corporate case, read-only.") · Not offered: unchanged.
* Line tooltip: "Only for employer-specific work permits. Picks the employer case this worker's case relies on and copies the employer's name, address and LMIA or offer number into it once." (was "…read-only.")
* Stand-in chip: "Today: one Sample employer case per firm; its facts are copied once. Later: the team's AG-17 Corporate cases and LMIA." · Source tooltip: "Copied from <employer case> on <date>. Changes there are not copied; edit it here if it is wrong." · 409s as in BR-6.
* `tests/runtime/check_c115_employer.ts`'s expected words change in this PR. SI-10's row text in `STAND-INS.md` ("a read-only link") is the tech lead's file: proposed "one Sample employer case per firm; its facts copied once into the worker's case".
* Team names, mapped: screen "Employer case" (PRODUCT.md, founder's word) = team badge "Linked file: <employer>, <date>"; audit "relied on employer case" = team "opened from linked file"; `linked{}` = team `CaseLink` [m4].

## 6. Contract and tests — acceptance `acceptance/C1.3.test.ts` (new, written first, red on main; moved into `tests/runtime/` when green)
Setup: the configured checkpoint (P-322), a case on "With an LMIA – inside Canada" release 1 with Client A. **BR-1** WP offered "2 employer facts" · VV and SP not offered on the checkpoint; client 403, author 403. **BR-2** exactly name, address, LMIA number listed · `organisation.name` and an unread fact not. **BR-3** editing the Sample file after the link leaves the copies · copies carry `linked_file` and the date. **BR-4** New written, Same not, Different kept unless ticked · ticked replaces, old in history; an equal composite address → Same, no write [M3]. **BR-5** DECLARED, Confirm section confirms · never VERIFIED by the copy. **BR-6** second POST 409 · two at once → one set · an answer arriving after the GET → 409, nothing copied [M2]. **BR-7** solo firm sees its own · the Sample firm's key from the solo firm → 404. **[M4]** organisation facts on the principal, LMIA number on the case subject; the IMM 5710 fill preview shows the three copied values. Browser `tests/runtime/check_c13_employer_link_browser.cjs`: the walk at 1440 px, keyboard, axe, source beside status. Graph: both routes named in checks. US$0, no AI.

## 6b. Capability or scaffolding (P-33)
Capability: rule, copy, drawer, source label, refusals. **Scaffolding, labelled:** the Sample employer case file (chip SI-10), replaced by L-SA5/AG-17. **Not built:** ending a link and the Linked cases panel; shareable marks (SA-1B-284); job title, NOC, wage, work location and documents (r5's longer list); "Create work permit case" (AG-17-45); worker milestones on the employer side.

## 7. Questions for the tech lead (recommendation first; the challenger found none for the founder, P-294)
1. **Copy at link time (Recommended):** SA-1B-283 r4 and AG-7-55 r5 (team, newest), P-239's SI-10 and P-106 "pre-fills" agree; the M3 concept's BR-13 ("read-only, a change there marks the worker's items out of date") is a draft concept, not a decision. Consequence: no live update, no unlink; C9.2's "employer-case change" breadth line becomes "a correction on the worker's case"; BR-13's text and SI-10 need the tech lead's line.
2. **Sample stand-in file (Recommended)**, one per firm, chip SI-10, replaced by L-SA5 — or a real case on the Corporate LMIA combination (needs its forms and a release; P-239; `demo.ts`, M2-hot).
3. **No migration (Recommended)**, freshness by the answer ids seen (M2) under the case row lock — or a new table `case_employer_link` (additive; migration read and breaker).

## 8. Definition of ready
Acceptance test named (§6) · row text: CAPABILITIES C1.3 + C11.5 ("Still: the link's pre-fill of employer facts") · decisions: P-106, P-239, P-316 (2), founder 5 Nov · open: Q1–Q3 for the tech lead; the 5 Nov lift of P-332 to be recorded [m7].
