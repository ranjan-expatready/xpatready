# B5 Fees on the case page (C6.12 step -25): concept (screens lane, 7 Nov 2026)

**For:** the tech lead's approval after an independent challenge (P-223 (4), P-392). **Row:** M3 sprint plan "Row C5", B5 inside it,
ruling R11. **Base:** main 9dc77d1ac. **Builds on, does not redesign:** the fee block that Lead 12 approved on #1074 (ruling 1, 5 Nov),
`screens/C6.12-breadth/concept-draft.md` r2 Part A on branch `claude/fervent-ptolemy-w5c6vr` (challenged once: 0 Blockers, 8
Majors, 10 Minors, all taken in). This page records what changed since r2, and adds the best-in-class study r2 lacked. Every
amount comes from `samples/fee-table.json` through `GET /runtime/cases/:id/prepare`; nothing new is priced. Unconfirmed: no counsel.

## 1. Job and journey
* **Job:** before preparing and recording a submission, the case officer sees what each submission costs: every fee on the
  filing it is paid on, its basis, why it is that amount, and the submission's total with any family maximum applied.
* **Persona:** the case officer (the case page is officer-only). **Journey:** J7 after the people are on the case: Cases ›
  the case › "Submission to IRCC" › each submission's "Fees", then C8.2's "Record the submission" (its fee receipt box).

## 2. Changes from r2 (and why)
| r2 | B5 | Why |
|---|---|---|
| two additive fields in `api/src/case-prepare.ts` (`amount_words: null` on a waiting line, `total_words` per group) | **no server change** | the brief scopes B5 to `web/src/runtime/` plus the browser check; `case-prepare.ts` is in two open PRs (#1223, #1225); `studio/contracts/` is M2-hot |
| a waiting line shows `amount_words: null` | the page shows "Not counted yet" whenever the API's line has `waiting` | same result from a field the API already sends; the browser check fails if a waiting row shows "CAD" |
| `total_words` from the API | the page writes the API's `total_cents` as words with the engine's own rule (`CAD n`, cents only when there are any) | the check compares each shown total with the engine's `cad()` of the API's number |
| no case total | **"Total for the case"** at the panel's foot when the case has more than one submission (the sum of the API's submission totals); with one submission its total is the case's | P-247 "the case total applying the cap stays in C6.12"; a split group loses the family maximum and the officer must see the new total |
| basis not shown by name | **each fee names its basis once, on its totals line** (P-247: "Every fee line carries a basis"): "Per person, with a family maximum of CAD 500 from 5 people applying together" · "Per person by role" · "Per application" (challenge M1: never on a person's row) | read from the line's API totals: `family_max_cents > 0` is the family maximum basis; otherwise the API's own `why` words "(per person; …)" or "(per application; …)". Question 2 asks for a `basis` field later |

## 3. Business rules (each shown from the API, never priced by the page)
* **BR-1 Each fee on a named filing:** under "Fees" at the foot of each submission, one table; rows grouped by filing (a row
  header with the filing's `label` and owner); each row: fee `line`, its basis, the person when not the filing's owner, the
  amount (`amount_words`), and `reason` as the API says it. An exempt line shows CAD 0 with its reason, never hidden.
* **BR-2 Basis, P-247:** once per fee on its totals line, as in section 2; no person's row carries one (an uncapped CAD 100 row
  or an under-14 CAD 0 row never reads "family maximum"). A fee whose basis cannot be read shows the API's `why` only.
* **BR-3 Totals with the cap:** each `totals[]` line with its `why` ("3 people applying together: the family maximum CAD 170
  applies instead of 3 × CAD 85 = CAD 255."), then "Total for this submission: CAD 570". More than one submission: "Total
  for the case: CAD n · n submissions, each priced on its own".
* **BR-4 No amount where none is known:** `fees_worked_out: false` → `fees_why`, no amount and no total (never CAD 0).
* **BR-5 A line waiting for a fact (G15):** "Not counted yet" and the API's reason; no CAD in that row; the total leaves it out (API)
  and reads "Total so far: CAD n · 1 fee not counted yet" (challenge M2), "so far" on the case total too.
* **BR-6 Nobody vanishes:** each `not_filing[]` person once, under the first submission, with the API's `why`; a declared-only
  applicant reads "Declared only: no fee".
* **BR-7 Sources and Sample:** each distinct source once per submission (page name as a link, its `read` as given); the case's
  `basis` sentence once ("… Sample until the immigration expert confirms (P-171) … Paying is not built.").
* **BR-8 Read-only:** no button. The receipt number stays with "Record the submission" (C8.2).

## 4. Layout (1440 px; 1024 px the same, no sideways scroll)
Inside each submission of "Submission to IRCC", after its filings: `h4` "Fees" (id `fees-{group}`), a table (caption "Fees for
{submission}", visually hidden), columns **Fee · Amount · Why**; the basis is a muted line under the fee's name. Then the
totals' why lines and the bold total. Long names wrap (`overflow-wrap:anywhere`).
```
Fees
Fee                                  Amount   Why
— Sample Client A's application —
Visitor visa fee · Family maximum    CAD 100  CAD 100 for Sample Client A.
Biometrics fee · Family maximum      CAD 170  Family maximum CAD 170 for the 3 people applying together, paid on this filing.
— Sample Child A1's application —
Biometrics fee · Family maximum      CAD 0    Under 14: no biometrics (…)
Visitor visa fee: 4 × CAD 100 = CAD 400; the family maximum CAD 500 starts at 5 people applying together.
Biometrics fee: 3 people applying together: the family maximum CAD 170 applies instead of 3 × CAD 85 = CAD 255.
Total for this submission: CAD 570
Sources: IRCC fee list (read 2026-11-02) · When to give biometrics (read 2026-03-30 (page date))
```

## 4b. Best in class (study, 7 Nov; P = primary page, X = search extract, T = our fee table's cite)
| Who | What they do best | B5 |
|---|---|---|
| IRCC fee list (T, read 2 Nov; X 7 Nov) | per person and "per family" lines side by side; "maximum fee for a family of 5 or more people applying at the same time and place" (IRCC's words); biometrics CAD 170 for a family of 2 or more (our table's summary) | **copied:** the same lines, IRCC's wording of the maximum, its link and read date on every line |
| USCIS online fee calculator (X) | asks only what changes the fee, adds biometrics only when needed, shows "the total fee amount … to be filed with the application"; **but** one form at a time, "does not calculate fees for multiple individuals" | **beaten:** nothing is typed (people and ages come from the case), every person and form of the family at once, the cap applied across them |
| Immigration case tools (Docketwise, Visto, Migrawise, Officio; V4 3 Nov, X 7 Nov) | public pages show fee tracking or invoicing at most (MyCase "Smart Spend" tracks fee payments); none describes a per-person government fee with a family maximum | **beaten:** each fee on its filing with its basis, source and the reason a person pays nothing |
| UK CMA price transparency (P, gov.uk CMA209 summary, X) | the total price up front, no hidden or "drip" charges | **copied:** the total on the same screen as its lines; an exempt or covered person shows CAD 0 and why, never hidden |
| IRS Direct File fact graph (P, via `reports/best-in-class-C6.9-A4-2026-11-07.md`) | an incomplete fact is a state of its own, never a silent zero | **copied:** "Not counted yet" until the date of birth is answered (BR-5) |
**Effort and errors:** no typing; one read shared with the panel (same query key), so the filings and their fees never disagree;
a date of birth corrected on the questionnaire re-prices the block on the next read; after a split (API only today: no split
button on the case page) the new totals and the case total show the lost maximum.
**Not built (named, not added):** paying (the e-app takes the card), the firm's own fees, a fee receipt per line.

## 5. Copy
"Fees" · "Not counted yet" · "Declared only: no fee" · "Total for this submission: CAD n" · "Total for the case: CAD n · n
submissions, each priced on its own" · "Sources:" · the API's `reason`, `why`, `basis`, `fees_why` as they are.

## 6. Contract and tests
**Contract:** the existing `/prepare` read, unchanged; its types live in `fees.tsx` (never in `studio/contracts/`, M2-hot).
**Tests:** `acceptance/C6.12-breadth.test.ts` -25 as written. New `tests/check_c612_fees_browser.ts` on the configured checkpoint,
one pass and one fail per BR, at 1440 and 1024 px, axe (WCAG 2.2 A/AA) clean, no sideways scroll, no duplicate ids, every
amount checked against `/prepare` in the same run: BR-1 lines under each filing; BR-2 each basis equals the fee table's
`basis` for that line; BR-3 the shown total is `cad(total_cents)`, and after a split each submission's own total plus the
case total; BR-5 a child with no date of birth: "Not counted yet", no CAD in the row; BR-6 a person taken off the trip is
listed with the API's why; BR-7 each source once; BR-8 no button in the block. BR-4 and the per-person and per-application
bases cannot be reached on the checkpoint: checked by serving `/prepare` in the browser with the engine's own output for a
test table (`deriveFilings` with injected rules), each with its fail. **Walk:** Cases › the case › Submission to IRCC › Fees
› Record the submission (the receipt box), by clicks, at 1440 and 1024 px.
**Gate B (R11):** `C6.12.test.ts` whole and breadth step -25 (gate B in a PR's CI runs on the six, so these packs run "fixture only"; the
row's checkpoint run is the builder's, on an isolated copy). The breadth pack's -24 runs and passes too. **Held, never dropped (P-330 (7)):** steps -22
(sponsorship) and -23 (the child study question) are outside the Visitor visa journey under the founder's answer to Q1 (6 Nov):
rows S1 and S2. **Gates:** Opus review; a breaker run on money (fee lines and the case total), P-278; qa's gate A.

## 6b. Capability or scaffolding
Every element is the capability (C6.12's screen part), read from the engine; nothing is scaffolding. Paying is Not built.

## 7. Questions for the tech lead (recommendation first)
1. Approve B5 as this delta on the approved r2 (no server change, the case total, the basis named per line)? Recommend: yes.
2. A `basis` field on `/prepare`'s totals, so the page reads the basis rather than the engine's words: recommend a small runtime
   row after #1223 and #1225 land (one field in `engine/runtime/filings.ts` and the contract, once `studio/contracts/` is free).
3. **Gate B cannot run R11 as written today.** `tools/gate-b.mjs` applies one step list to every pack of a capability (B103
   is not built): "C6.12" runs both packs whole, so -22 and -23 hold the PR red; "C6.12 (steps …, 25)" refuses both packs.
   Recommend: the breadth pack prints **HELD** for -22 and -23 (P-284's mechanism, as `C11.3.test.ts` does for AT-5) with the
   reason "outside the Visitor visa journey: founder's answer to Q1, 6 Nov; rows S1, S2", so gate B runs both packs whole and
   its report lists them as held. A pack change is the tech lead's (acceptance/README): make it, or say "yes" and I make it
   in this PR as its own commit. Until then the PR names `Capabilities: C6.12` and gate B is red on -22 and -23 only.

## Definition of ready
Acceptance test: `acceptance/C6.12-breadth.test.ts` step -25 and `C6.12.test.ts` whole, on the checkpoint. Row text: sprint plan
"Row C5" and R11. Decisions: P-247, P-171, the founder's Q1 answer (6 Nov), Lead 12's ruling 1 on #1074.

## Response to the challenge (`challenge.md`: Build after these changes; 0 Blockers, 3 Majors, 10 Minors)
* **M1** accepted: the basis is named once per fee on its totals line in P-247's words, never on a person's row; a fail test.
* **M2** accepted: "Total so far … n fees not counted yet" on the submission and the case while a line waits; pass and fail tests.
* **M3** to the tech lead (question 3): gate B cannot express R11 today; recommend HELD, printed only while the part is absent
  (-22 while the fee table has no `fs.spouse` entry, -23 while no release asks the question), the guard C11.3's helper uses.
* **Minors taken:** "Per person by role"; a page date shows as "page date 2026-03-30", never as a read date; fees not worked
  out shown once, under the first submission; best-in-class wording corrected (the biometrics line is our summary; split is
  API only). **Minors left, listed in the PR:** decision codes inside the server's words (P-171, FQ-7: Q2's runtime row); no
  thousands separator (the engine's own `cad`, kept so the page and the server agree); nobody applying (no group: the
  panel's own message, Not built here); the walk ends at a disabled "Record the submission" on the checkpoint (no filing is
  Ready to file there; C7.6's); total-first layout (left for the founder's look, P-392). The stubs use the real view with
  `familyFee`'s own totals (`line` is the totals' own field), not the engine's raw fee lines.
