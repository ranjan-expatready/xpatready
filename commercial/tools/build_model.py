"""Build commercial/model.xlsx — the simple monthly money model (v1, 8 Oct 2026).

Run once to create the file:  python3 commercial/tools/build_model.py [output_path]
Everyday edits happen in Excel on the Inputs sheet; this script is NOT needed for them.
Re-running it overwrites the file with the default inputs below.
"""
import sys
from datetime import date

from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference
from openpyxl.comments import Comment
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName

OUT = sys.argv[1] if len(sys.argv) > 1 else "commercial/model.xlsx"
N = 36  # months shown: Oct 2026 – Sep 2029
FIRST_COL = 3  # column C holds month 1

BLUE = Font(name="Arial", size=10, color="0000FF")
BLACK = Font(name="Arial", size=10)
BOLD = Font(name="Arial", size=10, bold=True)
TITLE = Font(name="Arial", size=14, bold=True)
GREY = Font(name="Arial", size=9, color="666666", italic=True)
SECTION = Font(name="Arial", size=10, bold=True, color="FFFFFF")
SECTION_FILL = PatternFill("solid", fgColor="1F4E78")
INPUT_FILL = PatternFill("solid", fgColor="FFF2CC")
UNKNOWN_FILL = PatternFill("solid", fgColor="F8CBAD")
KEY_FILL = PatternFill("solid", fgColor="DDEBF7")
THIN = Border(bottom=Side(style="thin", color="BBBBBB"))
WRAP = Alignment(wrap_text=True, vertical="top")

CAD = '#,##0;(#,##0);"-"'
CAD1 = '#,##0.0;(#,##0.0);"-"'
PCT = '0.0%;(0.0%);"-"'
MON = 'mmm yyyy'

# ---------------------------------------------------------------- inputs
# (name, label, value, format, unit, status, note, required)
# status: FACT / STATEMENT / PROPOSAL / ASSUMPTION / PLACEHOLDER / OPTION
INPUTS = [
    ("sec", "Timing"),
    ("StartMonth", "First month of the forecast", date(2026, 10, 1), MON, "month", "FACT",
     "Today's month. The model shows 36 months: launch, about two and a half years of trading and two annual renewals.", True),
    ("LaunchMonth", "Launch month: paying firms start to go live", date(2027, 3, 1), MON, "month", "STATEMENT",
     "Charter v6 target 12 Mar 2027; the delivery team confirms dates. Founding firms signed before launch all go live in this month.", True),
    ("PresellStart", "Founder starts pre-launch conversations", date(2026, 11, 1), MON, "month", "PROPOSAL",
     "After counsel has reviewed the founding offer and the website claims are corrected.", True),
    ("sec", "Cash at the start"),
    ("OpeningINR", "Founder capital available (INR)", 20000000, '#,##0', "INR", "STATEMENT",
     "Ranjan, 7 Oct: INR 2 crore of capital reported as provided by Sanjay. Used as an unverified opening-cash assumption, not proven current cash. Replace with a dated bank balance.", True),
    ("FxINR", "Exchange rate", 0.01476, '0.00000', "CAD per INR", "FACT",
     "Bank of Canada, 6 Oct 2026.", True),
    ("OpeningCash", "Opening cash (CAD) — calculated", "=OpeningINR*FxINR", CAD, "CAD", "CALC", "Calculated; do not type here.", False),
    ("Reserve", "Minimum cash to keep in the bank", 50000, CAD, "CAD", "PROPOSAL",
     "About two months of non-product costs plus a cushion. The 'funding gap' is measured against this line.", True),
    ("sec", "Prices (CAD per firm per month, before tax)"),
    ("PriceSolo", "Solo plan (1 practitioner + 1 assistant)", 89, CAD, "CAD/month", "PROPOSAL",
     "Proposal, not approved. Per-firm pricing changes the per-seat unit in ratified FD-18 — needs Ranjan's yes. The model prices per firm; per-seat pricing would need a seat-count input added.", True),
    ("PricePractice", "Practice plan (up to 4 users)", 229, CAD, "CAD/month", "PROPOSAL", "As above.", True),
    ("PriceFirm", "Firm plan (up to 10 users)", 549, CAD, "CAD/month", "PROPOSAL", "As above.", True),
    ("MixSolo", "Share of new firms choosing Solo", 0.50, PCT, "%", "ASSUMPTION", "The three shares must add up to 100%.", True),
    ("MixPractice", "Share choosing Practice", 0.42, PCT, "%", "ASSUMPTION", "", True),
    ("MixFirm", "Share choosing Firm", 0.08, PCT, "%", "ASSUMPTION", "", True),
    ("ListAvg", "Average list price per firm — calculated", "=PriceSolo*MixSolo+PricePractice*MixPractice+PriceFirm*MixFirm", CAD1, "CAD/month", "CALC", "Calculated.", False),
    ("MonthsFree", "Annual prepayment: months free", 2, '0.0', "months", "PROPOSAL",
     "Annual plan = 12 months of service for the price of 10. Paid up front, renewed every 12 months.", True),
    ("AnnualShareStd", "Share of standard firms paying annually", 0.50, PCT, "%", "ASSUMPTION", "", True),
    ("sec", "Founding-firm offer"),
    ("FoundCap", "Founding places (first N firms)", 50, '0', "firms", "PROPOSAL",
     "The first N paying firms get the founding price. Set to 0 for no founding offer.", True),
    ("FoundDisc", "Founding discount off list", 0.30, PCT, "%", "PROPOSAL",
     "Applies for each founding firm's first 24 months (two annual terms), then list price. The 24 months is fixed in the formulas.", True),
    ("AnnualShareFound", "Share of founding firms paying annually", 0.60, PCT, "%", "ASSUMPTION", "", True),
    ("sec", "Winning customers"),
    ("PreConv", "Pre-launch: qualified conversations per month", 15, '0.0', "per month", "ASSUMPTION",
     "Planning experiment, not a forecast of demand. 15 a month = 3-4 calls a week by the founder-consultant with warm contacts. Replace with the real count after 4 weeks.", True),
    ("PreRate", "Pre-launch: share who sign a founding order", 0.20, PCT, "%", "ASSUMPTION",
     "1 in 5 conversations signs a founding order (no money until go-live): about 3 a month, about 12 by launch. No evidence supplied yet; the first test result replaces it.", True),
    ("PostConv", "After launch: qualified conversations per month", 20, '0.0', "per month", "ASSUMPTION",
     "About 5 a week: founder network, community, events and inbound. Needs roughly 15 selling hours a week (see Workload).", True),
    ("CloseRate", "After launch: share of conversations that buy", 0.22, PCT, "%", "ASSUMPTION",
     "About 1 in 4-5 buys: roughly 4-5 new firms a month. Closed in the same month (simplification). No evidence supplied yet.", True),
    ("RefStart", "Peer-referral test starts", date(2027, 9, 1), MON, "month", "PROPOSAL",
     "Only after counsel review and about 10 healthy live customers. Leave blank for no referral test.", False),
    ("RefRate", "Referral introductions per live firm per month", 0.03, '0.000', "per firm", "ASSUMPTION",
     "0.03 = about one introduction a month from every 33 live firms.", True),
    ("RefClose", "Share of referred introductions that buy", 0.45, PCT, "%", "ASSUMPTION", "", True),
    ("RefReward", "Reward to the referring firm per paying referral", 250, CAD, "CAD", "PROPOSAL",
     "Account credit. Counted cautiously as cash spent in the month it is earned.", True),
    ("RefLag", "Reward earned after the new firm has paid for", 2, '0', "months", "PROPOSAL", "", True),
    ("sec", "Keeping customers"),
    ("ChurnM", "Monthly-paying firms that cancel each month", 0.02, PCT, "% per month", "ASSUMPTION",
     "2% a month is roughly 22% a year. No evidence supplied yet.", True),
    ("NonRenew", "Annual firms that do not renew at each anniversary", 0.20, PCT, "% per renewal", "ASSUMPTION", "", True),
    ("sec", "Necessary costs (CAD per month unless stated) — kept because the plan cannot run safely without them"),
    ("ProductCost", "Product and engineering team (all-in)", 25000, CAD, "CAD/month", "PLACEHOLDER",
     "UNKNOWN. Placeholder until Ranjan/Sanjay give the actual monthly cost and commitments. This number moves the cash answer more than anything else.", True),
    ("ProductCut", "Product cost reduction (option, not decided)", 0, PCT, "%", "OPTION",
     "A separate, explicit choice. 0 = no cut.", True),
    ("ProductCutFrom", "Product cost reduction starts", None, MON, "month", "OPTION", "Blank = no cut.", False),
    ("FounderPay", "Founder pay from this money", 0, CAD, "CAD/month", "ASSUMPTION",
     "Assumed 0; not confirmed by the founders. Any pay to the founder-consultant goes here.", True),
    ("LegalSetup", "One-off: legal set-up", 18000, CAD, "CAD once", "ASSUMPTION",
     "Needed before any offer or outreach: order form and terms, privacy policy, referral rules, outreach basis, website claims. Replace with the lowest of 2-3 fixed-scope quotes.", True),
    ("LegalMonth", "Legal set-up paid in", date(2026, 11, 1), MON, "month", "PROPOSAL", "", False),
    ("Website", "One-off: remove website claims Release 1 does not deliver", 1000, CAD, "CAD once", "PLACEHOLDER",
     "UNKNOWN. Mostly deleting and rewording text; cost depends on who maintains the site. Ask the website owner.", True),
    ("WebsiteMonth", "Website correction paid in", date(2026, 11, 1), MON, "month", "PROPOSAL", "", False),
    ("Accounting", "Accountant and bookkeeping", 600, CAD, "CAD/month", "ASSUMPTION",
     "Bookkeeping, GST/HST filings once billing starts, year-end. Replace with a quote, or 0 if already paid elsewhere.", True),
    ("Insurance", "Cyber and professional insurance, per year", 4000, CAD, "CAD/year", "ASSUMPTION",
     "Needed before real client data is held in pilots. Replace with a quote.", True),
    ("InsuranceFrom", "First insurance payment", date(2027, 1, 1), MON, "month", "PROPOSAL", "Paid yearly from this month.", False),
    ("Tools", "Customer software: help desk and status page", 150, CAD, "CAD/month", "ASSUMPTION",
     "Low tiers for a small team. Email and documents already exist. No paid CRM until the contact list outgrows a spreadsheet.", True),
    ("ToolsFrom", "Customer software starts", date(2027, 1, 1), MON, "month", "PROPOSAL", "With the pilots.", False),
    ("PerFirmCost", "Hosting, e-signature and email per live firm", 15, CAD, "CAD/firm/month", "ASSUMPTION", "", True),
    ("CardPct", "Card and billing fees, % of payments", 0.036, PCT, "%", "FACT",
     "Stripe Canada 2.9% + Stripe Billing 0.7% (published, checked 7 Oct).", True),
    ("CardFixed", "Card fee per payment", 0.30, '0.00', "CAD", "FACT", "Stripe Canada.", True),
    ("sec", "Discretionary choices — 0 means not chosen; each is a decision, not a requirement"),
    ("Conference", "One-off: national consultants' conference (NCIC, 19-21 May 2027)", 2500, CAD, "CAD once", "PROPOSAL",
     "Attendance with travel (research R2 estimate). Main RCIC event two months after launch. Set 0 to skip.", True),
    ("ConferenceMonth", "Conference paid in", date(2027, 5, 1), MON, "month", "PROPOSAL", "", False),
    ("Events", "Memberships, events and community, per month", 0, CAD, "CAD/month", "OPTION", "", True),
    ("EventsFrom", "Events spending starts", None, MON, "month", "OPTION", "Blank = none.", False),
    ("Contractor", "Content and marketing contractor", 0, CAD, "CAD/month", "OPTION",
     "Not in the founder-led start; the founder-consultant writes their own posts.", True),
    ("ContractorFrom", "Contractor starts", None, MON, "month", "OPTION", "Blank = none.", False),
    ("Demo", "One-off: professional demo video and material", 0, CAD, "CAD once", "OPTION",
     "Not in the founder-led start; screen-recorded demos first.", True),
    ("DemoMonth", "Demo material paid in", None, MON, "month", "OPTION", "", False),
    ("Adviser", "Fundraising or finance adviser, fixed fee", 0, CAD, "CAD/month", "OPTION",
     "Optional. Counsel checks registration or exemption and compensation before engaging any adviser, introducer or dealer; a fixed fee does not by itself remove securities-law obligations.", True),
    ("sec", "People — the founder-consultant leads; help is a choice you type in (nothing hires automatically)"),
    ("FounderHours", "Founder-consultant hours per week for selling, onboarding and support", 20, '0', "hours/week", "ASSUMPTION",
     "Not yet confirmed by the founders. The Workload rows on the Monthly sheet show whether this is enough.", True),
    ("PartHours", "Part-time help: hours per week (onboarding, imports, support)", 15, '0', "hours/week", "OPTION",
     "Starting-plan choice to cover onboarding the founding firms. 0 = none. Revisit once pilots show real onboarding hours.", True),
    ("PartRate", "Part-time help: cost per hour, all-in", 40, CAD, "CAD/hour", "ASSUMPTION",
     "Contractor or part-time employee; replace with the actual offer. Around Toronto implementation and support pay (research R5).", True),
    ("PartFrom", "Part-time help starts", date(2027, 3, 1), MON, "month", "OPTION", "Blank = none.", False),
    ("FullFrom", "Full-time hire starts (specialist or generalist)", None, MON, "month", "OPTION",
     "Blank = no hire. For when the workload rows show a lasting shortfall.", False),
    ("FullCost", "Full-time hire cost, all-in", 6900, CAD, "CAD/month", "ASSUMPTION",
     "Toronto median pay for the role, with employer costs (research R5). Replace with the actual offer.", True),
    ("HireHours", "Productive hours per full-time hire per month", 130, '0', "hours/month", "ASSUMPTION", "", True),
    ("HrsConv", "Hours per qualified conversation (call, demo, proposal)", 3, '0.0', "hours", "ASSUMPTION", "", True),
    ("HrsOnboard", "Hours to onboard one new firm", 8, '0.0', "hours", "ASSUMPTION", "Kickoff, client-record import, set-up, two trainings.", True),
    ("HrsSupport", "Support hours per live firm per month", 0.75, '0.00', "hours", "ASSUMPTION", "", True),
    ("sec", "New money (set the amount to 0 to test 'no investment')"),
    ("InvestAmt", "Outside investment received (optional financing assumption)", 0, CAD, "CAD", "OPTION",
     "Default 0: nothing is committed. Type an amount and month only to test a financing option; it is not a decision or an offer.", True),
    ("InvestMonth", "Investment received in", None, MON, "month", "OPTION", "Counted at month end.", False),
    ("RoundCosts", "Legal and filing costs of the round", 20000, CAD, "CAD", "ASSUMPTION", "Paid in the month the money arrives.", True),
    ("Milestone", "First funding milestone", date(2028, 3, 1), MON, "month", "PROPOSAL",
     "12 months of trading after launch; the first annual renewals fall due. Move it if the launch month moves.", True),
    ("RaiseMonths", "Months of cash after the milestone to raise the next round", 6, '0', "months", "PROPOSAL",
     "Time to raise again or cut costs. Milestone plus these months must fall inside the forecast.", True),
    ("FounderTopUp", "Additional founder money (option)", 0, CAD, "CAD", "OPTION", "Not a commitment. 0 = none.", True),
    ("FounderTopUpMonth", "Founder money received in", None, MON, "month", "OPTION", "", False),
]

STATUS_FILL = {"PLACEHOLDER": UNKNOWN_FILL}

wb = Workbook()
ws_read = wb.active
ws_read.title = "Read me"
ws_in = wb.create_sheet("Inputs")
ws_sum = wb.create_sheet("Summary")
ws_m = wb.create_sheet("Monthly")
ws_chk = wb.create_sheet("Checks")


def add_name(name, ref):
    wb.defined_names[name] = DefinedName(name, attr_text=ref)


# ---------------------------------------------------------------- Inputs sheet
ws_in["A1"] = "Inputs — the only place to type numbers"
ws_in["A1"].font = TITLE
ws_in["A2"] = ("Type in the yellow cells (blue text). Orange = unknown placeholder. Status says what kind of number it is: "
               "FACT (checked source), STATEMENT (from Ranjan, not verified), PROPOSAL (Claude's recommendation, not approved), "
               "ASSUMPTION (a guess to replace with evidence), OPTION (a choice to test), CALC (calculated).")
ws_in["A2"].font = GREY
ws_in["A2"].alignment = WRAP
ws_in.merge_cells("A2:E2")
ws_in.row_dimensions[2].height = 42
for c, h in zip("ABCDEF", ["Input", "Value", "Unit", "Status", "Source and note", "What we have observed (date, count) — notes only, not used in calculations"]):
    ws_in[f"{c}4"] = h
    ws_in[f"{c}4"].font = BOLD
ws_in.column_dimensions["A"].width = 58
ws_in.column_dimensions["B"].width = 14
ws_in.column_dimensions["C"].width = 14
ws_in.column_dimensions["D"].width = 13
ws_in.column_dimensions["E"].width = 80
ws_in.column_dimensions["F"].width = 40

required = []
r = 5
for item in INPUTS:
    if item[0] == "sec":
        ws_in.cell(r, 1, item[1]).font = SECTION
        for c in range(1, 7):
            ws_in.cell(r, c).fill = SECTION_FILL
        r += 1
        continue
    name, label, value, fmt, unit, status, note, req = item
    ws_in.cell(r, 1, label).font = BLACK
    cell = ws_in.cell(r, 2, value)
    cell.number_format = fmt
    if status == "CALC":
        cell.font = BLACK
    else:
        cell.font = BLUE
        cell.fill = STATUS_FILL.get(status, INPUT_FILL)
    ws_in.cell(r, 3, unit).font = BLACK
    ws_in.cell(r, 4, status).font = BOLD if status == "PLACEHOLDER" else BLACK
    ws_in.cell(r, 5, note).font = BLACK
    ws_in.cell(r, 5).alignment = Alignment(wrap_text=True, vertical="top")
    if status not in ("CALC", "FACT"):
        ws_in.cell(r, 6).fill = INPUT_FILL
        ws_in.cell(r, 6).font = BLUE
    for c in range(1, 7):
        ws_in.cell(r, c).border = THIN
    add_name(name, f"Inputs!$B${r}")
    if req:
        required.append((name, label, r))
    r += 1
ws_in.freeze_panes = "A5"

# ---------------------------------------------------------------- Monthly sheet
ws_m["A1"] = "Monthly forecast — calculated from Inputs (do not type here)"
ws_m["A1"].font = TITLE
ws_m["A2"] = ("Expected values, so firm counts can show fractions. Month-end balances. Prices exclude GST/HST. "
              "MRR = recurring revenue run rate in the month; ARR = 12 x MRR; revenue = earned in the month; collections = cash received.")
ws_m["A2"].font = GREY
ws_m.column_dimensions["A"].width = 52
ws_m.column_dimensions["B"].width = 12
for i in range(N):
    ws_m.column_dimensions[get_column_letter(FIRST_COL + i)].width = 10.5

LASTCOL = get_column_letter(FIRST_COL + N - 1)
ROWS = {}  # key -> row number
row_specs = []  # filled below


def col(i):
    return get_column_letter(FIRST_COL + i)


def R(key, i, absolute_row=False):
    """Reference to row `key` at month index i (0-based)."""
    return f"{col(i)}{ROWS[key]}"


rowno = 4


def section(title):
    global rowno
    ws_m.cell(rowno, 1, title).font = SECTION
    for c in range(1, FIRST_COL + N):
        ws_m.cell(rowno, c).fill = SECTION_FILL
    rowno += 1


def line(key, label, unit, fn, fmt=CAD, bold=False, fill=None, note=None):
    """fn(i) -> formula string (without '=') for month index i."""
    global rowno
    ROWS[key] = rowno
    row_specs.append((key, label, unit, fn, fmt, bold, fill, note, rowno))
    rowno += 1


# rows are declared first (so references resolve), formulas written afterwards.
section("Calendar")
line("idx", "Month number (0 = first month)", "", lambda i: f"{i}", '0')
line("month", "Month", "", lambda i: f"EDATE(StartMonth,{R('idx', i)})", MON, bold=True)
line("pre", "Pre-launch selling month? (1 = yes)", "flag",
     lambda i: f"IF(AND({R('month', i)}>=PresellStart,{R('month', i)}<LaunchMonth),1,0)", '0')
line("post", "Launched? (1 = yes)", "flag", lambda i: f"IF({R('month', i)}>=LaunchMonth,1,0)", '0')
line("launch", "Launch month? (1 = yes)", "flag", lambda i: f"IF({R('month', i)}=LaunchMonth,1,0)", '0')

section("Winning customers")
line("preconv", "Pre-launch qualified conversations", "count", lambda i: f"{R('pre', i)}*PreConv", CAD1)
line("orders", "Founding orders signed (waiting for launch)", "firms", lambda i: f"{R('preconv', i)}*PreRate", CAD1)
line("golive", "Founding orders going live at launch", "firms",
     lambda i: f"{R('launch', i)}*SUM($C${ROWS['orders']}:{R('orders', i)})", CAD1)
line("postconv", "Qualified conversations after launch", "count", lambda i: f"{R('post', i)}*PostConv", CAD1)
line("newsell", "New paying firms from selling", "firms", lambda i: f"{R('golive', i)}+{R('postconv', i)}*CloseRate", CAD1)
line("refintro", "Referral introductions", "count",
     lambda i: "0" if i == 0 else f"IF(AND(ISNUMBER(RefStart),{R('month', i)}>=RefStart),{R('live', i-1)}*RefRate,0)", CAD1)
line("newref", "New paying firms from referrals", "firms", lambda i: f"{R('refintro', i)}*RefClose", CAD1)
line("new", "New paying firms in total", "firms", lambda i: f"{R('newsell', i)}+{R('newref', i)}", CAD1, bold=True)
line("newF", "  of which founding firms", "firms",
     lambda i: (f"MIN({R('new', i)},MAX(0,FoundCap))" if i == 0 else
                f"MIN({R('new', i)},MAX(0,FoundCap-SUM($C${ROWS['newF']}:{R('newF', i-1)})))"), CAD1)
line("newS", "  of which standard-price firms", "firms", lambda i: f"{R('new', i)}-{R('newF', i)}", CAD1)

section("Customers (firms)")
line("grad", "Founding monthly firms moving to list price (after 24 months)", "firms",
     lambda i: "0" if i < 24 else f"{R('newF', i-24)}*(1-AnnualShareFound)*(1-ChurnM)^24", CAD1)
line("FM", "Founding firms paying monthly", "firms",
     lambda i: (f"{R('newF', i)}*(1-AnnualShareFound)" if i == 0 else
                f"{R('FM', i-1)}*(1-ChurnM)+{R('newF', i)}*(1-AnnualShareFound)-{R('grad', i)}"), CAD1)
line("SM", "Standard firms paying monthly", "firms",
     lambda i: (f"{R('newS', i)}*(1-AnnualShareStd)" if i == 0 else
                f"{R('SM', i-1)}*(1-ChurnM)+{R('newS', i)}*(1-AnnualShareStd)+{R('grad', i)}"), CAD1)
line("FA1", "Founding annual invoices: year 1 (founding price)", "invoices",
     lambda i: f"{R('newF', i)}*AnnualShareFound", CAD1)
line("FA2", "Founding annual invoices: year 2 renewals (founding price)", "invoices",
     lambda i: "0" if i < 12 else f"{R('FA1', i-12)}*(1-NonRenew)", CAD1)
line("SA", "List-price annual invoices (new, renewals, founding year 3+)", "invoices",
     lambda i: (f"{R('newS', i)}*AnnualShareStd" if i < 12 else
                f"{R('newS', i)}*AnnualShareStd+({R('SA', i-12)}+{R('FA2', i-12)})*(1-NonRenew)"), CAD1)


def last12(key, i):
    a = max(0, i - 11)
    return f"SUM({R(key, a)}:{R(key, i)})"


line("FAact", "Founding firms on annual plans (active)", "firms",
     lambda i: f"{last12('FA1', i)}+{last12('FA2', i)}", CAD1)
line("SAact", "List-price firms on annual plans (active)", "firms", lambda i: last12('SA', i), CAD1)
line("live", "Live paying firms (month end)", "firms",
     lambda i: f"{R('FM', i)}+{R('SM', i)}+{R('FAact', i)}+{R('SAact', i)}", CAD1, bold=True, fill=KEY_FILL)
line("lostM", "Firms lost: monthly cancellations", "firms",
     lambda i: "0" if i == 0 else f"({R('FM', i-1)}+{R('SM', i-1)})*ChurnM", CAD1)
line("lostA", "Firms lost: annual non-renewals", "firms",
     lambda i: "0" if i < 12 else f"({R('FA1', i-12)}+{R('FA2', i-12)}+{R('SA', i-12)})*NonRenew", CAD1)

section("Revenue and cash from customers (CAD)")
line("pF", "Founding price per firm per month", "CAD", lambda i: "ListAvg*(1-FoundDisc)", CAD1)
line("annf", "Annual price factor (months paid / 12)", "", lambda i: "(12-MonthsFree)/12", '0.000')
line("mrr", "MRR — recurring revenue run rate", "CAD",
     lambda i: (f"{R('FM', i)}*{R('pF', i)}+{R('SM', i)}*ListAvg+{R('FAact', i)}*{R('pF', i)}*{R('annf', i)}"
                f"+{R('SAact', i)}*ListAvg*{R('annf', i)}"), CAD, bold=True, fill=KEY_FILL)
line("arr", "ARR — 12 x MRR (a run rate, not money received)", "CAD", lambda i: f"12*{R('mrr', i)}", CAD)
line("rev", "Revenue earned in the month", "CAD", lambda i: R('mrr', i), CAD)
line("cashM", "Collections: monthly plans", "CAD",
     lambda i: f"{R('FM', i)}*{R('pF', i)}+{R('SM', i)}*ListAvg", CAD)
line("cashA", "Collections: annual plans (paid up front)", "CAD",
     lambda i: f"({R('FA1', i)}+{R('FA2', i)})*{R('pF', i)}*12*{R('annf', i)}+{R('SA', i)}*ListAvg*12*{R('annf', i)}", CAD)
line("cash_in", "Collections from customers", "CAD", lambda i: f"{R('cashM', i)}+{R('cashA', i)}", CAD, bold=True)
line("deferred", "Paid in advance, not yet earned (deferred revenue)", "CAD",
     lambda i: (f"{R('cash_in', i)}-{R('rev', i)}" if i == 0 else
                f"{R('deferred', i-1)}+{R('cash_in', i)}-{R('rev', i)}"), CAD)

section("Costs paid (CAD)")
line("c_prod", "Product and engineering team", "CAD",
     lambda i: f"ProductCost*(1-IF(AND(ISNUMBER(ProductCutFrom),{R('month', i)}>=ProductCutFrom),ProductCut,0))", CAD)


def from_(start, amount, i):
    return f"IF(AND(ISNUMBER({start}),{R('month', i)}>={start}),{amount},0)"


def once(when, amount, i):
    return f"IF(AND(ISNUMBER({when}),{R('month', i)}={when}),{amount},0)"


line("c_hire", "Help: part-time and full-time", "CAD",
     lambda i: f"{from_('PartFrom', 'PartHours*PartRate*52/12', i)}+{from_('FullFrom', 'FullCost', i)}", CAD)
line("c_founder", "Founder pay", "CAD", lambda i: "FounderPay", CAD)
line("c_run", "Marketing, events, tools, accounting, adviser", "CAD",
     lambda i: f"{from_('ContractorFrom', 'Contractor', i)}+{from_('EventsFrom', 'Events', i)}+{from_('ToolsFrom', 'Tools', i)}+Accounting+Adviser", CAD)
line("c_once", "One-off costs (legal, website, conference, demo, insurance)", "CAD",
     lambda i: (f"{once('LegalMonth', 'LegalSetup', i)}+{once('WebsiteMonth', 'Website', i)}+{once('DemoMonth', 'Demo', i)}+{once('ConferenceMonth', 'Conference', i)}"
                f"+IF(AND(ISNUMBER(InsuranceFrom),{R('month', i)}>=InsuranceFrom),"
                f"IF(MOD((YEAR({R('month', i)})-YEAR(InsuranceFrom))*12+MONTH({R('month', i)})-MONTH(InsuranceFrom),12)=0,Insurance,0),0)"), CAD)
line("c_firm", "Hosting and service per live firm", "CAD", lambda i: f"{R('live', i)}*PerFirmCost", CAD)
line("c_card", "Card and billing fees", "CAD",
     lambda i: f"{R('cash_in', i)}*CardPct+({R('FM', i)}+{R('SM', i)}+{R('FA1', i)}+{R('FA2', i)}+{R('SA', i)})*CardFixed", CAD)
line("c_ref", "Referral rewards earned", "CAD",
     lambda i: "0" if True else "", CAD)  # replaced below (needs variable lag)
line("c_total", "Operating costs", "CAD",
     lambda i: f"SUM({R('c_prod', i)}:{R('c_ref', i)})", CAD, bold=True)
line("c_round", "Costs of raising the investment", "CAD",
     lambda i: f"IF(AND(InvestAmt>0,ISNUMBER(InvestMonth),{R('month', i)}=InvestMonth),RoundCosts,0)", CAD)

section("Cash (CAD, month end)")
line("opcf", "Operating cash flow (collections - operating costs)", "CAD",
     lambda i: f"{R('cash_in', i)}-{R('c_total', i)}", CAD, bold=True)
line("invest", "Outside investment received", "CAD",
     lambda i: once('InvestMonth', 'InvestAmt', i), CAD)
line("topup", "Additional founder money received", "CAD",
     lambda i: once('FounderTopUpMonth', 'FounderTopUp', i), CAD)
line("cash", "Cash remaining — with the investment entered", "CAD",
     lambda i: (f"OpeningCash+{R('opcf', i)}+{R('invest', i)}+{R('topup', i)}-{R('c_round', i)}" if i == 0 else
                f"{R('cash', i-1)}+{R('opcf', i)}+{R('invest', i)}+{R('topup', i)}-{R('c_round', i)}"),
     CAD, bold=True, fill=KEY_FILL)
line("cash0", "Cash remaining — without outside investment", "CAD",
     lambda i: (f"OpeningCash+{R('opcf', i)}+{R('topup', i)}" if i == 0 else
                f"{R('cash0', i-1)}+{R('opcf', i)}+{R('topup', i)}"), CAD, bold=True)
line("below", "Below the minimum cash line? (with investment)", "flag",
     lambda i: f"IF({R('cash', i)}<Reserve,1,0)", '0')
line("below0", "Below the minimum cash line? (without investment)", "flag",
     lambda i: f"IF({R('cash0', i)}<Reserve,1,0)", '0')

section("Workload (hours per month) — information for hiring decisions, not a rule")
line("h_sell", "Selling (conversations x hours)", "hours",
     lambda i: f"({R('preconv', i)}+{R('postconv', i)}+{R('refintro', i)})*HrsConv", CAD1)
line("h_onb", "Onboarding new firms", "hours", lambda i: f"{R('new', i)}*HrsOnboard", CAD1)
line("h_sup", "Supporting live firms", "hours", lambda i: f"{R('live', i)}*HrsSupport", CAD1)
line("h_need", "Hours needed", "hours", lambda i: f"{R('h_sell', i)}+{R('h_onb', i)}+{R('h_sup', i)}", CAD1, bold=True)
line("h_have", "Hours available (founder + help)", "hours",
     lambda i: (f"FounderHours*52/12+IF(AND(ISNUMBER(PartFrom),{R('month', i)}>=PartFrom),PartHours*52/12,0)"
                f"+IF(AND(ISNUMBER(FullFrom),{R('month', i)}>=FullFrom),HireHours,0)"), CAD1)
line("h_gap", "Hours short (positive = more work than people)", "hours",
     lambda i: f"{R('h_need', i)}-{R('h_have', i)}", CAD1)


def ref_formula(i):
    # reward earned RefLag months after a referred firm starts paying
    return (f"IF({R('idx', i)}>=RefLag,INDEX($C${ROWS['newref']}:${LASTCOL}${ROWS['newref']},1,{R('idx', i)}+1-RefLag),0)"
            f"*RefReward")


# write rows
for key, label, unit, fn, fmt, bold, fill, note, rn in row_specs:
    ws_m.cell(rn, 1, label).font = BOLD if bold else BLACK
    ws_m.cell(rn, 2, unit).font = GREY
    for i in range(N):
        f = ref_formula(i) if key == "c_ref" else fn(i)
        c = ws_m.cell(rn, FIRST_COL + i, f"={f}")
        c.number_format = fmt
        c.font = BOLD if bold else BLACK
        if fill:
            c.fill = fill
ws_m.freeze_panes = ws_m.cell(ROWS["month"] + 1, FIRST_COL)
# Keep the month header visible: put the month row near the top
for key in ("idx", "pre", "post", "launch"):
    ws_m.row_dimensions[ROWS[key]].hidden = False

M = lambda key: f"Monthly!$C${ROWS[key]}:${LASTCOL}${ROWS[key]}"
for key in ROWS:
    add_name(f"m_{key}", M(key))

# conditional formatting: cash below reserve in red
red = Font(name="Arial", size=10, bold=True, color="C00000")
for key in ("cash", "cash0"):
    rng = f"C{ROWS[key]}:{LASTCOL}{ROWS[key]}"
    ws_m.conditional_formatting.add(rng, FormulaRule(formula=[f"C{ROWS[key]}<Reserve"], font=red))
rng = f"C{ROWS['h_gap']}:{LASTCOL}{ROWS['h_gap']}"
ws_m.conditional_formatting.add(rng, FormulaRule(formula=[f"C{ROWS['h_gap']}>0"], font=red))

# ---------------------------------------------------------------- Checks sheet
ws_chk["A1"] = "Checks — the model checks itself (all should say OK)"
ws_chk["A1"].font = TITLE
ws_chk.column_dimensions["A"].width = 70
ws_chk.column_dimensions["B"].width = 16
ws_chk.column_dimensions["C"].width = 70
ws_chk["A3"], ws_chk["B3"], ws_chk["C3"] = "Check", "Result", "What it means"
for c in "ABC":
    ws_chk[f"{c}3"].font = BOLD
cr = 4
checks = []


def check(label, formula, meaning):
    global cr
    ws_chk.cell(cr, 1, label).font = BLACK
    ws_chk.cell(cr, 2, f"={formula}").font = BOLD
    ws_chk.cell(cr, 3, meaning).font = BLACK
    ws_chk.cell(cr, 3).alignment = WRAP
    checks.append(f"B{cr}")
    cr += 1


# required inputs
missing_terms = "+".join(f"IF(ISBLANK({n}),1,0)" for n, _, _ in required)
check("Required inputs filled in", f'IF(({missing_terms})=0,"OK","MISSING "&({missing_terms}))',
      "Every input marked as required has a value (0 is a value; blank is not). The list below names any missing one.")
check("Plan shares add up to 100%", 'IF(ABS(MixSolo+MixPractice+MixFirm-1)<0.0001,"OK","FIX: shares add to "&TEXT(MixSolo+MixPractice+MixFirm,"0%"))',
      "Solo + Practice + Firm shares of new firms.")
pct_names = ["MixSolo", "MixPractice", "MixFirm", "AnnualShareStd", "AnnualShareFound", "FoundDisc", "PreRate",
             "CloseRate", "RefClose", "ChurnM", "NonRenew", "ProductCut", "CardPct"]
cond = ",".join(f"AND({n}>=0,{n}<=1)" for n in pct_names)
check("Percentages are between 0% and 100%", f'IF(AND({cond}),"OK","FIX: a percentage is outside 0-100%")',
      "Rates and shares on the Inputs sheet.")
neg_names = ["PriceSolo", "PricePractice", "PriceFirm", "PreConv", "PostConv", "RefRate", "RefReward", "ProductCost",
             "InvestAmt", "FounderTopUp", "FullCost", "PartHours", "PartRate", "Conference", "Website", "LegalSetup", "MonthsFree", "FoundCap", "RefLag"]
cond = ",".join(f"{n}>=0" for n in neg_names)
check("Prices, volumes, costs and amounts are not negative", f'IF(AND({cond},MonthsFree<12),"OK","FIX: a negative value, or 12+ months free")', "")
check("Investment has a month if an amount is entered",
      'IF(OR(InvestAmt=0,ISNUMBER(InvestMonth)),"OK","FIX: add the month the investment arrives")', "")
check("Founder money has a month if an amount is entered",
      'IF(OR(FounderTopUp=0,ISNUMBER(FounderTopUpMonth)),"OK","FIX: add the month")', "")
check("Product cost cut has a start month if a cut is entered",
      'IF(OR(ProductCut=0,ISNUMBER(ProductCutFrom)),"OK","FIX: add the month the cut starts")', "")
check("Milestone plus raising months falls inside the forecast",
      f'IF(AND(Milestone>=LaunchMonth,EDATE(Milestone,RaiseMonths)<=EDATE(StartMonth,{N-1})),"OK","FIX: move the milestone or shorten the raising months")', "")
check("Launch month falls inside the 36 months shown",
      f'IF(AND(LaunchMonth>=StartMonth,LaunchMonth<=EDATE(StartMonth,{N-1})),"OK","FIX: launch is outside the forecast")', "")

# independent recalculations on hidden helper rows of this sheet
hr = 40
ws_chk.cell(hr - 1, 1, "Helper rows for the checks above (calculated independently of the Monthly sheet's own balance rows)").font = GREY
helper = {}


def hrow(key, label, fn):
    global hr
    helper[key] = hr
    ws_chk.cell(hr, 1, label).font = GREY
    for i in range(N):
        ws_chk.cell(hr, FIRST_COL + i, f"={fn(i)}").number_format = CAD1
    hr += 1


def H(key, i):
    return f"{col(i)}{helper[key]}"


hrow("custroll", "Firms: last month + new - lost (should equal live firms)",
     lambda i: (f"Monthly!{R('new', i)}" if i == 0 else
                f"{H('custroll', i-1)}+Monthly!{R('new', i)}-Monthly!{R('lostM', i)}-Monthly!{R('lostA', i)}"))
hrow("custdiff", "Difference in firms", lambda i: f"ABS({H('custroll', i)}-Monthly!{R('live', i)})")
hrow("cashroll", "Cash: opening + all money in - all money out (with investment)",
     lambda i: (f"OpeningCash+SUM(Monthly!$C${ROWS['cash_in']}:{R('cash_in', i)})"
                f"-SUM(Monthly!$C${ROWS['c_total']}:{R('c_total', i)})-SUM(Monthly!$C${ROWS['c_round']}:{R('c_round', i)})"
                f"+SUM(Monthly!$C${ROWS['invest']}:{R('invest', i)})+SUM(Monthly!$C${ROWS['topup']}:{R('topup', i)})"))
hrow("cashdiff", "Difference in cash", lambda i: f"ABS({H('cashroll', i)}-Monthly!{R('cash', i)})")


def defer_indep(i):
    # unexpired months of each annual invoice issued in the last 12 months
    terms = []
    for k in range(0, min(12, i + 1)):
        j = i - k
        remaining = (11 - k) / 12
        terms.append(f"((Monthly!{R('FA1', j)}+Monthly!{R('FA2', j)})*Monthly!{R('pF', j)}+Monthly!{R('SA', j)}*ListAvg)"
                     f"*12*Monthly!{R('annf', j)}*{remaining:.10f}")
    return "+".join(terms)


hrow("defindep", "Deferred revenue: unexpired months of annual invoices", defer_indep)
hrow("defdiff", "Difference in deferred revenue", lambda i: f"ABS({H('defindep', i)}-Monthly!{R('deferred', i)})")
hrow("nonneg", "Negative firm counts or collections (count)",
     lambda i: (f"COUNTIF(Monthly!{col(i)}{ROWS['FM']}:{col(i)}{ROWS['lostA']},\"<-0.000001\")"
                f"+IF(Monthly!{R('cash_in', i)}<-0.000001,1,0)"))


def hrange(key):
    return f"$C${helper[key]}:${LASTCOL}${helper[key]}"


check("Customer balance: last month + new - lost = live firms", f'IF(MAX({hrange("custdiff")})<0.001,"OK","FAIL")',
      "Recomputed from new and lost firms only.")
check("Cash balance: opening + money in - money out = cash remaining", f'IF(MAX({hrange("cashdiff")})<0.5,"OK","FAIL")',
      "Recomputed from cumulative totals.")
check("Deferred revenue equals the unexpired part of annual invoices", f'IF(MAX({hrange("defdiff")})<0.5,"OK","FAIL")',
      "Recomputed invoice by invoice for the last 12 months.")
check("No negative customer counts or collections", f'IF(SUM({hrange("nonneg")})=0,"OK","FAIL")', "")

cr += 1
ws_chk.cell(cr, 1, "Missing required inputs (blank = none missing):").font = BOLD
cr += 1
for n, label, rr in required:
    ws_chk.cell(cr, 1, f'=IF(ISBLANK({n}),"MISSING: {label} (Inputs row {rr})","")').font = Font(name="Arial", size=10, color="C00000")
    cr += 1
add_name("AllChecks", "Checks!$B$4:$B$" + str(4 + len(checks) - 1))
for i in range(N):
    ws_chk.column_dimensions[get_column_letter(FIRST_COL + i)].width = 9

# ---------------------------------------------------------------- Summary sheet
s = ws_sum
s.column_dimensions["A"].width = 64
s.column_dimensions["B"].width = 18
s.column_dimensions["C"].width = 18
s.column_dimensions["D"].width = 60
s["A1"] = "Summary — what the current inputs mean"
s["A1"].font = TITLE
s["A2"] = ('=IF(COUNTIF(AllChecks,"OK")=ROWS(AllChecks),"All checks OK. These are forecasts from assumptions, not results.",'
           '"WARNING: "&(ROWS(AllChecks)-COUNTIF(AllChecks,"OK"))&" check(s) not OK — see the Checks sheet. Do not use these numbers until fixed.")')
s["A2"].font = Font(name="Arial", size=11, bold=True, color="C00000")
s["A3"] = '=IF(Inputs!D' + str([rr for n, _, rr in required if n == "ProductCost"][0]) + '="PLACEHOLDER","Product team cost is still a placeholder (CAD "&TEXT(ProductCost,"#,##0")&" a month). Cash answers are illustrative until it is replaced.","")'
s["A3"].font = Font(name="Arial", size=10, bold=True, color="C55A11")

sr = 5


def shead(t):
    global sr
    s.cell(sr, 1, t).font = SECTION
    for c in range(1, 5):
        s.cell(sr, c).fill = SECTION_FILL
    sr += 1


def srow(label, formula, fmt=CAD, note="", formula2=None, key=None):
    global sr
    s.cell(sr, 1, label).font = BLACK
    c = s.cell(sr, 2, f"={formula}")
    c.number_format = fmt
    c.font = BOLD
    if formula2:
        c2 = s.cell(sr, 3, f"={formula2}")
        c2.number_format = fmt
        c2.font = BOLD
    s.cell(sr, 4, note).font = GREY
    s.cell(sr, 4).alignment = WRAP
    if key:
        add_name(key, f"Summary!$B${sr}")
    sr += 1


def month_at(row_name, i_formula):
    return f"INDEX(m_month,1,{i_formula})"


shead("Funding the first milestone")
srow("First milestone (from Inputs)", "Milestone", MON,
     "Default: 12 months of trading after launch, when the first annual renewals fall due. Evidence of sales, onboarding and renewals for the next decision.")
srow("Cash should last until (milestone + months to raise the next round)", "EDATE(Milestone,RaiseMonths)", MON, "")
srow("Outside money needed for that, keeping the minimum cash line (no investment)",
     'MAX(0,Reserve-_xlfn.MINIFS(m_cash0,m_month,"<="&EDATE(Milestone,RaiseMonths)))', CAD,
     "Before round costs. Uses the forecast costs for those months, so it changes with every cost and sales input.", key="NeedMilestone")
srow("Money must be in the bank by (month before cash first falls below the line)",
     'IFERROR(EDATE(INDEX(m_month,1,MATCH(1,m_below0,0)),-1),"not needed")', MON,
     "A raise usually takes 3-6 months, so conversations start well before this.")
srow("Still missing after the investment entered on Inputs",
     'MAX(0,Reserve-_xlfn.MINIFS(m_cash,m_month,"<="&EDATE(Milestone,RaiseMonths)))', CAD, "Includes round costs. 0 = covered.")
srow("Live paying firms at the milestone", "IFERROR(INDEX(m_live,1,MATCH(Milestone,m_month,0)),0)", CAD1, "")
srow("MRR at the milestone", "IFERROR(INDEX(m_mrr,1,MATCH(Milestone,m_month,0)),0)", CAD, "Recurring run rate.")
srow("Revenue earned as a share of operating costs at the milestone",
     "IFERROR(INDEX(m_rev,1,MATCH(Milestone,m_month,0))/INDEX(m_c_total,1,MATCH(Milestone,m_month,0)),0)", PCT,
     "Uses revenue, not collections, so annual renewal payments in that month do not flatter it.")

shead("Cash over the whole forecast")
s.cell(sr, 2, "With investment").font = BOLD
s.cell(sr, 3, "Without investment").font = BOLD
sr += 1
srow("Opening cash", "OpeningCash", CAD, "Founder capital x exchange rate.", "OpeningCash")
srow("Lowest month-end cash", "MIN(m_cash)", CAD, "", "MIN(m_cash0)")
srow("First month below the minimum cash line", 'IFERROR(INDEX(m_month,1,MATCH(1,m_below,0)),"never")', MON,
     "If 'never', cash stays above the line for all 36 months.",
     'IFERROR(INDEX(m_month,1,MATCH(1,m_below0,0)),"never")')
srow("Cash at the end of the forecast", f"INDEX(m_cash,1,{N})", CAD, "", f"INDEX(m_cash0,1,{N})")
srow("For reference: money to stay above the line for all 36 months", "MAX(0,Reserve-MIN(m_cash))", CAD,
     "Not a raise target. A 36-month survival figure, shown so the milestone figure can be compared with it.",
     "MAX(0,Reserve-MIN(m_cash0))", key="Gap")

shead("Customers and income")
srow("Founding orders signed before launch", "SUM(m_orders)", CAD1, "Go live in the launch month.")
srow("Live paying firms at the end of the forecast", f"INDEX(m_live,1,{N})", CAD1, "")
srow("MRR at the end of the forecast", f"INDEX(m_mrr,1,{N})", CAD, "")
srow("ARR at the end of the forecast (12 x MRR)", f"INDEX(m_arr,1,{N})", CAD, "A run rate, not money received.")
srow("Revenue earned, all 36 months", "SUM(m_rev)", CAD, "")
srow("Collections, all 36 months", "SUM(m_cash_in)", CAD, "Higher than revenue when firms prepay annually.")
srow("First month collections cover operating costs", 'IFERROR(INDEX(m_month,1,MATCH(1,INDEX(--(m_opcf>=0)*(m_post=1),0),0)),"not within 36 months")', MON,
     "Operating cash flow positive after launch.")
srow("Operating costs in the last month of the forecast", f"INDEX(m_c_total,1,{N})", CAD, "")
srow("Approximate live firms needed for collections to cover costs",
     f"IFERROR((INDEX(m_c_total,1,{N})-INDEX(m_c_firm,1,{N})-INDEX(m_c_card,1,{N})-INDEX(m_c_ref,1,{N}))"
     f"/(INDEX(m_mrr,1,{N})/INDEX(m_live,1,{N})*(1-CardPct)-PerFirmCost),\"n/a\")", '#,##0',
     "At the last month's fixed costs and average revenue per firm. A rule of thumb, not a target.", key="BreakEvenFirms")

shead("Workload")
srow("Most hours short in any month", "MAX(0,MAX(m_h_gap))", CAD1, "Positive = more commercial work than the founder and hires can do.")
srow("Month with the most hours short", 'IF(MAX(m_h_gap)>0,INDEX(m_month,1,MATCH(MAX(m_h_gap),m_h_gap,0)),"none")', MON, "")
srow("Months with more work than people", "COUNTIF(m_h_gap,\">0\")", '0', "")

shead("By calendar year (follows the first month on Inputs)")
for j, h in enumerate(["Year", "Revenue earned", "Collections", "Operating costs", "Operating cash flow", "Live firms at year end", "Months of the year in the forecast"]):
    s.cell(sr, 1 + j, h).font = BOLD
for cl in "EFG":
    s.column_dimensions[cl].width = 18
sr += 1
for k in range(4):
    yc = s.cell(sr, 1, f"=YEAR(StartMonth)+{k}")
    yc.number_format = '0'
    yc.alignment = Alignment(horizontal="left")
    for j, key in enumerate(["rev", "cash_in", "c_total", "opcf"]):
        c = s.cell(sr, 2 + j, f"=SUMPRODUCT((YEAR(m_month)=$A{sr})*m_{key})")
        c.number_format = CAD
    c = s.cell(sr, 6, f"=IFERROR(LOOKUP(2,1/(YEAR(m_month)=$A{sr}),m_live),0)")
    c.number_format = CAD1
    s.cell(sr, 7, f"=SUMPRODUCT(--(YEAR(m_month)=$A{sr}))").number_format = '0'
    sr += 1
# note year table spans columns B-F
sr += 1
s.cell(sr, 1, "Chart: cash remaining with and without the investment").font = BOLD
chart_anchor = f"A{sr+1}"

chart = LineChart()
chart.title = "Cash remaining (CAD, month end)"
chart.height = 8
chart.width = 22
data = Reference(ws_m, min_col=2, max_col=FIRST_COL + N - 1, min_row=ROWS["cash"], max_row=ROWS["cash"])
chart.add_data(Reference(ws_m, min_col=FIRST_COL, max_col=FIRST_COL + N - 1, min_row=ROWS["cash"]), from_rows=True, titles_from_data=False)
chart.add_data(Reference(ws_m, min_col=FIRST_COL, max_col=FIRST_COL + N - 1, min_row=ROWS["cash0"]), from_rows=True, titles_from_data=False)
chart.series[0].tx = None
from openpyxl.chart.series import SeriesLabel
chart.series[0].tx = SeriesLabel(v="With investment")
chart.series[1].tx = SeriesLabel(v="Without investment")
chart.set_categories(Reference(ws_m, min_col=FIRST_COL, max_col=FIRST_COL + N - 1, min_row=ROWS["month"]))
chart.y_axis.title = "CAD"
chart.y_axis.numFmt = '#,##0'
chart.x_axis.number_format = 'mmm yy'
s.add_chart(chart, chart_anchor)

# ---------------------------------------------------------------- Read me
rm = ws_read
rm.column_dimensions["A"].width = 120
lines = [
    ("Expat Ready — money model (v1.1, 8 October 2026)", TITLE),
    ("One monthly forecast for 36 months from the first month on Inputs: customers, recurring revenue, cash collected, costs, cash remaining, and the outside money needed for a first milestone.", BLACK),
    ("", BLACK),
    ("How to use it", BOLD),
    ("1. Change numbers only on the Inputs sheet (yellow cells, blue text). Everything else recalculates. No scripts are needed.", BLACK),
    ("2. Read the answers on the Summary sheet. The month-by-month detail is on the Monthly sheet.", BLACK),
    ("3. If the top line of the Summary shows a warning, open the Checks sheet and fix the named input first.", BLACK),
    ("4. Outside investment is 0 by default: nothing is committed. Enter an amount and month only to test a financing option.", BLACK),
    ("5. Discretionary spending and help are separate inputs. 0 means not chosen. A product cost cut is also separate; nothing is cut unless you enter it.", BLACK),
    ("6. The Workload rows show whether the founder-consultant and any help have enough hours. They inform a hiring choice; they do not hire anyone.", BLACK),
    ("", BLACK),
    ("Learning from real results (there is no actuals history in this file)", BOLD),
    ("• Every month shown is a forecast. Write what you actually observe (conversations held, orders signed, onboarding hours, cancellations) in the 'observed' column next to the matching input.", BLACK),
    ("• The observed column is notes, not actuals: the model does not use it. Changing an assumption recalculates the whole forecast from the first month, not only future months. Save a dated copy first if you want to compare old and new forecasts.", BLACK),
    ("• Before launch you can roll the forecast forward: set the first month to the current month and the opening cash to the real bank balance. "
     "After launch this is not yet supported, because the model has no input for customers already paying. Add one only when there are real customers.", BLACK),
    ("", BLACK),
    ("What the numbers are", BOLD),
    ("• Opening cash uses the INR 2 crore of capital Ranjan reported as provided by Sanjay, an unverified assumption, not a bank balance. The product-team cost is a placeholder. Until both are replaced, the cash answers are illustrative.", BLACK),
    ("• Every customer number is a planning experiment, not a growth promise. No records of customer conversations, pilots or commitments were found in the project files.", BLACK),
    ("• Prices are a proposal, per firm. Ratified decision FD-18 says per seat; Ranjan decides. Per-seat pricing would need a seat-count input added to the model.", BLACK),
    ("", BLACK),
    ("How it works (in brief)", BOLD),
    ("• Founding orders signed before launch go live in the launch month. After launch, new firms = conversations x close rate, plus referrals from live firms. Deals close in the month of the conversation.", BLACK),
    ("• The first N firms pay the founding price for 24 months, then list price. Monthly firms pay each month. Annual firms pay 10 months' price up front for 12 months and renew each year.", BLACK),
    ("• Revenue is earned month by month. Annual payments arrive up front, so cash runs ahead of revenue (shown as 'paid in advance, not yet earned').", BLACK),
    ("• Referral rewards are account credits. The model counts them as cash spent in the month they are earned, which is cautious.", BLACK),
    ("", BLACK),
    ("Not included (by design)", BOLD),
    ("• GST/HST (collected and passed on), income tax, SR&ED or other government money (not confirmed), failed card payments (treated as cancellations), "
     "refunds under the 30-day money-back (enter new firms net of refunds), timing within a month, extra users and add-ons. "
     "Add any of these only when a real decision needs it.", BLACK),
    ("", BLACK),
    ("Checked 8 Oct 2026 in LibreOffice 26.2. An earlier version with the same calculation structure gave identical results in Microsoft Excel for Mac 16.113. Not tested in Google Sheets or Excel for Windows.", GREY),
]
for k, (t, f) in enumerate(lines, start=1):
    rm.cell(k, 1, t).font = f
    rm.cell(k, 1).alignment = Alignment(wrap_text=True, vertical="top")

for wsx in (ws_in, ws_sum, ws_m, ws_chk, ws_read):
    wsx.sheet_view.showGridLines = wsx is ws_m or wsx is ws_chk

wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print("wrote", OUT, "rows", ROWS["h_gap"], "required inputs", len(required))
