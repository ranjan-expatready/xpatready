# Fee table: concept (drafter, 4 Nov, r2 after the fresh challenge; tech lead's approval, P-223 (4))

**Status:** r2. It takes in every Blocker, Major and Minor of `challenge.md`; the drafter's response is at the end. Board: `design/draft-fee-table.html` (r2).
**Row:** C6.12, setup step S7a (`acceptance/lib/setup_vv_m3.ts`, `PUT /library/fees`).
**New screen:** no concept covered it before. W1-shared-library lists "fee table" as Not built; STATE "Next" 4 says "fees … library tables + S7a screens (M3, design first)". P-319 is cited there; the tech lead records it in DECISIONS.
**Values:** amounts are those already cited in the repo, with page and date (`../rows.md` C6.12). Anything else is **Sample**. Paying and invoicing stay the team's (B40, P-151 (2)).

## 1. Job and journey
* **Job:** the Super Admin keeps one dated, cited table of IRCC fees: which lines apply to which combination and role, on what basis, from which IRCC page. Each submission group is priced from the version in force when its filings were first worked out, and never from code (P-230 (7), P-319).
* **Persona:** the Super Admin, with a second person approving (P-253).
* **Journey:** reference tables (W4); the case side is C6.12.

## 2. Ten layers
| Layer | Exists (main 9caa043b) | New here |
|---|---|---|
| Data | `samples/fee-table.json`, read by **seven** readers: `engine/runtime/filings.ts`, `api/src/case-prepare.ts` (biometrics ages; the split's words), `case-checklist.ts` (`checklist: true`), `workspace.ts` (`hasFeeRules`, `defaultModeOf`), `source-register.ts` (G1, called from `studio.ts`, which is M2-hot), and `C6.12-breadth.test.ts` | the JSON becomes **version 0**; table `fee_table` (id, `as_of`, lines JSON, status, created_by, reason); `submission_group.fee_table_id` |
| Loader | — | one loader in the new `api/src/fee-table.ts` returns today's `FeeTable` shape (modes, checklist and group_why carried from the previous version). Readers that are synchronous today (`feeLinesOf`, the checklist, G1) read a cache the loader refreshes when a version is approved, so `studio.ts` is never touched |
| Guarded change | `library_change` + `POST /library/changes/:id/approve`; `decideChange` refuses the proposer (`library-changes.ts`) | kind `fee_table`, written from the new file, as `finder.ts` already does for `form_accepts`. If approval needs a new handler in `library-changes.ts` (hot), the builder asks the tech lead first |
| API | none (S7a gets 404) | `GET /library/fees` (version 0 while nothing is stored); `PUT /library/fees` returns 202 and waits for a second person |
| UI | none | a minimal read-only list, **in a second PR** |
| Team | SA-1B-52, SA-1B-190, SA-1B-192 (reference tables with in-force dates; Unverified against the newest team copy) | mapping: our `lines[].basis/roles` = their `feeLines[].basis/roles`; our `combinations{}` = their `ProgramRow.feeLines[]` |

## 3. Business rules
* **BR-1** **One table, versioned.**
  * The JSON is version 0, used while nothing is stored, so Reset to the six works without setup.
  * A new version is the previous one with the given lines upserted by key. A combination entry replaces only its own list of lines. Nothing is deleted in M3 (Retire is Not built).
* **BR-2** **A second person** (P-253 step 6, "anything used by a released combination: a second person"; SA-1B-190 rule 6).
  * PUT stores the version as Waiting and writes a `library_change` (EDIT, reason required, proposed by the author).
  * It prices nothing until a **different** person approves it through the existing approve route.
  * The PUT answers 202 with its impact: the combinations using each changed line, and the open groups on older versions.
  * The search and AI steps of the guarded change do not apply to a table of amounts. They are Not built here.
* **BR-3** **`as_of`** is the date a version takes effect (the team's "in force from"). In M3 it is never after today; a future-dated version is Not built. Each line keeps its own page date and read date.
* **BR-4** **Every line carries a basis** (P-247): per application · per person by role · per position (refused, as today) · family maximum. A family maximum names its threshold and its scope: within one submission group, IRCC's "at the same time and place".
* **BR-5** **Every amount has a source:** `source {url, quote, quoteKind, pageDate, read}`, required unless the line is `sample: true`.
  * A summary is not a quote. Version 0's biometrics quote ("summary of the Lead-checked record") is replaced with IRCC's words: "Maximum fee for a family of 2 or more people applying at the same time" (fees.asp, page date 2026-09-21; VV-R14).
  * The biometrics exemption page is cited on `exempt.source`, not as the amount's source.
  * `spouse_dependent_child` and `pr_adult` are Sample until quoted.
* **BR-6** **The stamp is on the submission group** (the family maximum is per group).
  * A group keeps its version after a newer one is approved.
  * A group split out inherits its parent's version.
  * A person who joins a group is priced on the group's version.
  * Which version prices a filing differs from the team's SA-1B-52 rule 2 (founder Q1).
* **BR-7** **No fee rule for a combination** keeps today's words and check: "Fees not worked out yet for …; nothing is guessed." (`filing-modes.ts`; `check_r2_fee_table.ts`).

Moved out (Not built here):
* "Adopt update until accepted-until" belongs to C7.6, which reads the stamp (P-237 (3)).
* The bundled sponsorship basis belongs to C6.12-22's PR.

## 4. Layout (PR 2: a minimal read-only list)
* **Place:** Library › Reference tables › Fee table (the team's name, SA-1B-190 §3).
* **Page:** one page card; search plus a combination filter; a table, not in a card; 44 px rows.
* **Header:** "Fee table · in force from {as_of}" · "{n} lines · {k} Sample", where the k Sample lines are part of the n.
* **Columns:** Fee · Basis · CAD · Family maximum · Exempt · Source (page date, read date) · Sample badge · Used by (from the version's combination entries).
* **Each version's status:** In force · Waiting for a second person (with a link to the waiting change).
* **States:** loading; could not load (Retry). There is no empty state: version 0 always exists.
* **Dropped as gold-plating:** a history panel, and a warning for old page dates.

## 5. Copy
* Basis words: "per person" · "per application" · "family maximum: CAD {amount} for {n} or more applying at the same time and place".
* Source: "IRCC fee list, page date {date}, read {date}".
* Sample: "Sample: not from IRCC. Do not use for a real filing."
* PUT refusal: "Line {key}: give IRCC's page, quote, page date and read date, or mark it Sample."
* Waiting: "Waiting for a second person. Cases are priced on the version in force until it is approved."

## 6. Contract and tests
**Contract:**
* `PUT /library/fees {asOf, reason, lines[{key, label, amountCad, basis, roles?, familyMaximum?{amountCad, fromPeople, within}, exempt?{underAge?, overAge?, source}, source{url, quote, quoteKind, pageDate, read} | sample: true}], combinations{key: lineKey[]}}` returns 202 `{id, as_of, status: "waiting", change, impact}`.
* `GET /library/fees` returns the version in force, the waiting one if any, and version 0's marker.
* **Types are exported from `api/src/fee-table.ts`**, not from a new `studio/contracts/` file. That folder is M2-hot, so every later edit there would need approval.

**Amend S7a in the same PR** (first line says so, `acceptance/README.md`):
* add a reason;
* cite fees.asp with the VV-R13 and VV-R14 words;
* the biometrics page on `exempt.source`.

S8's loop already approves Waiting changes.

**Tests** in a new `tests/check_fee_table.ts`, one pass and one fail per rule:
* **BR-1:**
  * GET after Reset to the six gives version 0, and `C6.12.test.ts` is 24/24 with no S7a;
  * S7a's upsert keeps C6.12-24's lines.
* **BR-2:**
  * the author approving gets 403;
  * until it is approved, `/prepare` stays on the old version;
  * the client and the case officer get 403 on PUT.
* **BR-3:** an `as_of` after today is refused.
* **BR-4:** a family maximum without `fromPeople` is refused (400, on the field).
* **BR-5:** a line with neither a source nor Sample is refused, and a Sample line shows as Sample on the case.
* **BR-6:**
  * a group keeps its version after a newer approval;
  * a split inherits it;
  * a person added joins the group's version.
* **Readers:** a changed amount reaches `/prepare`, the split's words and the G1 count.
* **The breadth test** reads `GET /library/fees`, not the file.
* **PR 2:** the browser shows all 10 lines with sources, Sample badges and In force or Waiting; axe clean at 1440 and 1024 px.

**Back-end plan:** the challenge's table, unchanged.

## 6b. Capability or scaffolding
* **Capability:** the dated, approved, versioned table, pricing from it, and the read-only list.
* **Scaffolding:** none. Version 0 is the shipped table, labelled as such.

## 7. Questions
1. **(Founder) Which version prices a filing?** *Recommend:* keep P-151 (1) as decided. The version is stamped on the submission group when its filings are first worked out, a newer version never reprices them, and C7.6 warns later. The team is told this differs from SA-1B-52 rule 2. The alternative is the team's rule: the version in force on the filing date until submission, then frozen.
2. **(Founder) A second person on the fee route?** *Recommend:* yes, as P-253 step 6 asks. It is M3-only and adds no setup step. The alternative is a one-person route with a reason, recorded as a P-253 exception.
3. **(Immigration expert, via the tech lead) The dependent child of a sponsored spouse.** It is CAD 180 in the sample, but the quote it carries ("$270.00") is the economic class's line. *Recommend:* Sample until confirmed.

## Definition of ready
* **Tests:** `tests/check_fee_table.ts`, `setup_vv_m3.ts` S7a (amended), `C6.12-breadth.test.ts` (reading the route).
* **Row:** C6.12.
* **Decisions:** P-151, P-171, P-230 (7), P-237 (3), P-247, P-253, P-319 (to be recorded).
* **Approval:** by the tech lead after `challenge.md`.

## Drafter's response to the challenge (4 Nov)
* **B1** (version 0 and one loader; the cache keeps `studio.ts` untouched) and **B2** (the change waits for a second person) are accepted.
* **M1–M5** are accepted, and M5 is founder Q1.
* **M6** is accepted: the page is minimal, in PR 2, with no history panel and no 12-month warning.
* **m1–m7** are accepted:
  * Adopt moves to C7.6;
  * BR-5's bundle moves to C6.12-22;
  * the existing "not worked out" words are reused;
  * the types stay out of `studio/contracts/`;
  * the board was corrected;
  * the team mapping is written;
  * P-319 goes to the tech lead.
