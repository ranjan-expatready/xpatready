# Fee table (studio, Super Admin): concept (drafter, 4 Nov; tech lead's approval after a fresh challenge, P-223 (4))

**Status:** draft. Board: `design/draft-fee-table.html`. **Row:** C6.12, setup step S7a (`acceptance/lib/setup_vv_m3.ts`, `PUT /library/fees`).
**New screen:** no concept covered it before. W1-shared-library lists "fee table" as Not built; STATE "Next" 4 says "fees … library tables + S7a screens (M3, design first)".
**Values:** amounts on the board are those already cited in the repo, with page and date (see `../rows.md` C6.12). Anything else is **Sample**. Paying and invoicing stay the team's (B40, P-151 (2)).

## 1. Job and journey
* **Job:** the Super Admin sees, for each combination, which IRCC fees apply, on whose filing, on what basis, from what IRCC page, as of which date. The case side then prices filings from that dated table and never from code (P-319, no hard-coding).
* **Persona:** the Super Admin (configuration), with the approver's second look.
* **Journey:** activity 1.x, reference data (W4). The case side is C6.12.

## 2. Ten layers
| Layer | Exists (main 9caa043b) | New here |
|---|---|---|
| Data | `samples/fee-table.json` (lines, bases, family maxima, exemptions, quotes, page dates; read by `engine/runtime/filings.ts`) | table `fee_table` (`as_of`, lines JSON, `created_by`), and `fee_table_id` on `filing` |
| API | none (S7a gets 404) | `GET /library/fees`, `PUT /library/fees` (author; dated; every line cited or Sample) in a new `api/src/fee-table.ts` (**not** `library-fees.ts`: the `library-` prefix is M2-hot) |
| UI | none | **Fee table** page in the studio's reference area, read-only in M3 |
| Team | AG fee lines per role; "Family Rate" words | the fourth basis "family maximum" (P-247; the team is asked) |

## 3. Business rules
* **BR-1** **A dated table** (P-151 (2)). Each saved table has an "as of" date. A filing is priced on the table in force when it is derived, and stores that table's id. A newer table never reprices a filing already made. A filing priced on an older table warns "Adopt update" until IRCC's accepted-until date (P-151 (1), C7.6).
* **BR-2** **Every line carries a basis** (P-247): per application · per person by role · per position · family maximum.
  * A family maximum names its threshold and scope: within one submission group, IRCC's "at the same time and place".
  * An exemption names its rule (Sample words: "under 14", "over 79" for biometrics, cited).
* **BR-3** **Every amount has a source:** the canada.ca URL, IRCC's quote, the page date and the read date. Otherwise it is marked **Sample**, and a Sample line is shown as Sample on every case.
* **BR-4** **Combination entries** say which lines apply to which combination and person role. A combination with no entry shows "No fees set" on its cases, never CAD 0.
* **BR-5** **A co-filed sponsorship charges its bundled fee once**, on the sponsored person's filing (r5c BR-18). It is never also charged the economic-class right of permanent residence fee.
* **BR-6** **Editing in M3 is by route only** (setup and demo, author role, a reason). The page is read-only. Editing on screen goes through the one guarded change (P-253) once its files leave the M2-hot list. Until then the page says "Changed through setup. Editing here comes with the library's guarded change."

## 4. Layout
* **Pattern:** a list page (TEAM-PATTERNS: page card, search plus one filter (combination), table not in a card, 44 px rows).
* **Header:** "Fee table · as of 1 Nov 2026" · source count · "Sample lines: n".
* **Columns:** Fee · Basis · Amount (CAD) · Family maximum · Exempt · Source (link + date) · Used by (combinations).
* **Row click** opens a right panel with IRCC's quote, the page date, the read date and the history of tables.
* **States:**
  * empty ("No fee table yet: setup loads one");
  * loading;
  * could not load;
  * a Sample line (badge);
  * a line whose page date is older than 12 months (warning "Check IRCC's page again", a Sample threshold).

## 5. Copy
* Basis words: "per person" · "per application" · "per position" · "family maximum: CAD {amount} for {n} or more applying at the same time and place".
* Source: "IRCC fee list, page date {date}, read {date}".
* Sample: "Sample: not from IRCC. Do not use for a real filing."
* PUT refusal: "Line {key}: give IRCC's page and quote, or mark it Sample."

## 6. Contract and tests
**Contract:** `PUT /library/fees {asOf, lines[{key, label, amountCad, per, familyMaximum?{amountCad, fromPeople, within}, exempt?, source|sample:true, quote?, pageDate?}], combinations{key: lineKey[]}, reason}` returns `{id, as_of}`. `GET /library/fees` returns the newest table and its history. Types go in a **new** `studio/contracts/fees.ts`.

**Tests**, in a new `tests/check_fee_table.ts` plus `setup_vv_m3.ts` S7a. One pass and one fail per rule:
* **BR-1:** a filing keeps its table id after a newer PUT / a new filing takes the newer one.
* **BR-2:** a family maximum without `fromPeople` refused (400, on the field).
* **BR-3:** a line with neither source nor Sample refused / Sample shown as Sample on the case.
* **BR-4:** a combination with no entry reads "No fees set".
* **BR-5:** `fs.spouse` charges CAD 1,260 once (C6.12-22).
* **BR-6:** the client and the case officer get 403 on PUT.
* **Browser:** the page lists the four Visitor visa lines with their sources; axe clean at 1440 and 1024 px.

## 6b. Capability or scaffolding
* **Capability:** the dated table, the route, the read-only page and pricing from the table.
* **Scaffolding:** editing by route (BR-6) until the guarded change.

## 7. Questions
1. **(Founder) Freeze fees into the release, or stamp the table on each filing?** Freezing is M2-hot (`engine/snapshot.ts`, `api/src/studio.ts`). *Recommend:* the stamp now; the freeze after M2 at 55.
2. **(Founder) Editing on screen now, outside the guarded change?** *Recommend:* no. Read-only page plus route in M3; the guarded change after M2 at 55 (P-253: "one uniform" pattern).
3. **(Immigration expert, via the tech lead) The dependent child of a sponsored spouse.** It is CAD 180 in the sample, but the quote it carries ("$270.00") is the economic class's line. *Recommend:* Sample until the expert confirms.

## Definition of ready
* Tests: `tests/check_fee_table.ts`, `setup_vv_m3.ts` S7a, `C6.12-breadth.test.ts` -22.
* Row: C6.12.
* Decisions: P-151, P-171, P-247, P-253, P-319.
* Approval by the tech lead after `challenge.md`.
