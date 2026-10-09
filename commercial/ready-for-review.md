# Ready for review — commercial plan v1.1, final delivery fixes (8 Oct 2026)

**Author:** Claude. **Reviewer:** Codex. The author has paused edits to `commercial/` while Codex runs independent checks.

## Delivered

- `commercial/plan.docx`: the founder-facing plan. It renders to 6 pages in LibreOffice, the last one half full: 8 sections, at 10.5 pt Arial with 1-inch margins.
- `commercial/plan.md`: the plan's source.
- `commercial/model.xlsx`: one monthly forecast with these sheets: Read me, Inputs, Summary, Monthly and Checks.
- `commercial/tools/build_model.py` builds the model. Running it **overwrites** the model with the default inputs.
- `commercial/tools/test_model.py` runs the scenario tests.
- `commercial/tools/make_plan_docx.py` builds `plan.docx` from `plan.md`.
- The old v0.2 files are unchanged apart from their "SUPERSEDED" banners. The previous handoff is in `ready-for-review-v0.2-2026-10-07.md`.

## Final delivery fixes (after Codex's independent check: 7 recalculated cases PASS)

No workbook calculation changed. `model.xlsx` is untouched since that check.

- **README:**
    - now says v1.1;
    - points to the offer table in plan §3 and the cash table in plan §5;
    - names `plan.md` as the canonical source; Word edits must be copied back into `plan.md` before regenerating.
- **Word build:** a new `tools/make_plan_docx.py` with `tools/plan-reference.docx`.
    - Every table row is marked "do not split across pages": 43 rows. Funding option B now stays whole.
    - Section headings and the title are black. Theme-colour references were removed so Word shows black too.
- **Plan §5:** one compact block, "If the founders choose to raise":
    - an 8–10 slide pitch derived from the plan;
    - the workbook plus a private folder (cap table, incorporation, IP, contracts);
    - a record of each investor contact and next step;
    - brief monthly updates to interested investors, if they agree to receive them;
    - no deck or tracker is created now.
- **Rendering:** regenerated and rendered with LibreOffice. Still 6 pages; pages 1–6 inspected. Not opened in Microsoft Word.

## Changes in v1.1 (Codex review of v1)

1. **Plan length:** cut from 11 pages and 13 sections to 6 pages and 8 sections.
   - It opens with the choice and the route to the first customers.
   - It has one offer table, one small cash table and one action table, and the contact routes sit under the actions.
   - Research is linked rather than repeated.
   - Authorship and process history, repeated snapshots and the sensitivity table are gone.
2. **Spending defaults:**
   - The start is now founder-led: 20 founder hours a week plus an optional 15 hours a week of part-time help from launch at CAD 40 an hour (about CAD 2,600 a month).
   - The full-time hire now defaults to blank.
   - The contractor, monthly events and demo video now default to 0. Each sits under "Discretionary choices".
   - Kept, with a reason on each Inputs row: the legal set-up (pending quotes), accounting, insurance before real client data, the help desk and status page from the pilots (CAD 150 a month), and the NCIC conference (CAD 2,500, one-off).
   - The website correction cost is now an UNKNOWN placeholder (CAD 1,000).
   - Product-team commitments and safeguards are unchanged.
3. **Evidence wording:**
   - The plan now says "no customer evidence supplied (none in the project files)".
   - "Small practices decide quickly" and "peers trusted over a sales team" are labelled as hypotheses.
   - The 25,000 figure is described as an uncertain estimate (perhaps 10,000).
   - Founder pay is marked ASSUMPTION.
   - INR 2 crore is described as reported capital, used as an unverified opening-cash assumption.
4. **Configuration:**
   - The calendar-year table now follows the first month on Inputs: the year is a formula, with a months-in-forecast column.
   - Inputs has a new "observed" column. It holds notes only and is not used in any calculation. The Read me and the plan say that changing an assumption recalculates the whole forecast.
   - The Read me states that the forecast cannot roll forward after launch, because there is no input for existing customers.
5. **Funding:**
   - There is a new first milestone (input, default March 2028: 12 months of trading and the first annual renewals) plus 6 months to raise the next round.
   - The Summary shows the outside money needed to reach that point while keeping the reserve line: `MINIFS` of cash without investment up to the milestone plus the raising months.
   - The 36-month figure is labelled "for reference, not a raise target".
   - The hiring and funding wording is now conditional on evidence.
   - A new check flags a milestone that runs past the forecast.
6. **Codex's final cleanup:**
   - The plan no longer says annual prepayments are excluded; they are in collections, and only grants are excluded.
   - Fundraising help is described as founder-led or fixed-fee for now. Counsel verifies registration, exemption and pay before any introducer or dealer is engaged.
   - The plan says per-seat pricing would need a seat-count input; the model prices per firm.
   - The Summary ratio at the milestone now uses revenue rather than collections, so an annual-renewal month does not inflate it.

**Default results** (placeholder product cost, no investment):
- Cash falls below CAD 50,000 in July 2027, so money is needed by June 2027.
- About CAD 293,800 is needed to reach September 2028 above the line, before round costs.
- About 68 firms are live at the milestone, with revenue at about 30% of costs.

## Checks run (affected cases only)

- **19 scenarios pass** against the independent cohort calculation. Firms, MRR, collections, costs, both cash lines, deferred revenue, the milestone need, the 36-month figure and calendar-year collections and firms are all checked.
- The scenarios cover:
  - **the original 15:** defaults; zero customers; all monthly billing; all annual billing; prices +30%; product cost 50k; a 40% product-cost cut; 900k invested in April 2027; the same 900k delayed to October 2027; INR 20 crore of opening cash; launch moved to June 2027; no founding offer or referrals; a blank product cost; an investment with no month;
  - **4 new:** discretionary spending chosen; start month moved to January 2027, with the year view following; a full-time hire with no part-time help plus a founder top-up; a milestone past the forecast, which shows a warning.
- Each scenario also confirms that the edited inputs survive a LibreOffice save, that the formulas are kept, and that no formula is empty or in error.
- A separate check: entering a 600k investment in March 2027 brings "still missing" for the milestone to 0.
- **Excel:** not re-run for v1.1. An earlier version with the same structure matched Excel for Mac on every cell. The new pieces (`MINIFS`, year formulas) were evaluated in LibreOffice only. Google Sheets and Excel for Windows are untested.
- **Word:** rendered to PDF with LibreOffice and inspected page by page. It has not been opened in Microsoft Word.

## Limitations (unchanged in substance)

- **Not modelled:**
  - GST/HST, income tax, grants;
  - failed payments, and refunds under the 30-day money-back;
  - timing within a month;
  - extra users, add-ons and per-seat pricing;
  - any lag between a sales conversation and the close.
- **Fixed in the formulas:** founding orders go live in the launch month; the founding period is 24 months; the annual term is 12 months.
- **Rolling forward:** the forecast cannot be rolled forward after launch, because there is no input for existing customers.
- **Unverified inputs:**
  - opening cash is the INR 2 crore Ranjan reported, not a bank balance;
  - the product-team cost is a placeholder;
  - the customer, conversion, churn and workload figures have no supplied evidence.

## Remaining disagreement

None. Codex accepted six pages.

## Questions for the founders

1. The actual product-team cost and commitments, and a dated bank balance.
2. Which founder is the licensed consultant who sells, their hours and any pay.
3. Per-firm or per-seat pricing.
4. How the India team is engaged, including IP assignment.
