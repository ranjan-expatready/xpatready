"""Refresh reports: recalculate the workbook, run sensitivity variants, rewrite generated blocks in the
Markdown artifacts and record the refresh fingerprint (Codex brief §5).

Usage:  python3 commercial/tools/refresh_reports.py [--no-sensitivity]
Edits made in Excel are preserved: this script never changes Inputs, Scenarios, Actuals or trackers.
"""
import argparse
import datetime as dt
import os
import re
import shutil
import sys
import tempfile

from openpyxl import load_workbook

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lo_recalc  # noqa: E402
import model_spec as S  # noqa: E402
import wbtools as W  # noqa: E402

DOCS = {
    "00-decision-summary.md": ["SUMMARY_KEY"],
    "01-market-revenue-strategy.md": ["A1_MARKET", "A1_SCEN"],
    "02-sales-affiliate-cs-playbook.md": ["A2_REFERRAL"],
    "03-funding-investor-plan.md": ["A3_FUND"],
    "04-execution-team-financial-workbook.md": ["A4_SCEN", "A4_BUDGET", "A4_HIRING", "A4_STRESS"],
}
ORDER = ["BASE", "MNR", "UNR", "DOWN", "UP", "HIGH"]
ROLE_LABELS = [f"Start month used: {name}" for _, name, *_ in S.ROLES]

VARIANTS = [
    ("Base (as entered)", {}),
    ("Prices +30%, conversion unchanged (hypothesis)", {"PRICE.SOLO": 115.7, "PRICE.PRACTICE": 297.7, "PRICE.FIRM": 713.7, "PRICE.EXTRA": 63.7}),
    ("Prices +30%, close rate -15% per +10% price", {"PRICE.SOLO": 115.7, "PRICE.PRACTICE": 297.7, "PRICE.FIRM": 713.7, "PRICE.EXTRA": 63.7,
                                                      "SELL.ELASTICITY": -0.15}),
    ("Close rate halved", {"SELL.CLOSE": 0.11}),
    ("Churn doubled (monthly 4%, annual non-renewal 42%)", {"RET.MONTHLY_CHURN": 0.04, "RET.ANNUAL_NONRENEW": 0.42}),
    ("Launch 3 months later (Jun 2027)", {"CAL.LAUNCH": dt.date(2027, 6, 1)}),
    ("Onboarding and support hours doubled", {"ONB.HRS_PER_FIRM": 16, "ONB.SUP_HRS": 1.5}),
    ("Funding received 3 months later (May 2027)", {"FUND.DATE": dt.date(2027, 5, 1)}),
    ("Funding Jun 2027 with founder bridge CAD 150,000 in Feb 2027 (option, not commitment)",
     {"FUND.DATE": dt.date(2027, 6, 1), "FUND.BRIDGE_AMT": 150000, "FUND.BRIDGE_DATE": dt.date(2027, 2, 1)}),
    ("Founder selling hours +50% (18 a week)", {"SELL.FOUNDER_HRS_PRE": 18, "SELL.FOUNDER_HRS_POST": 18}),
    ("Product team CAD 15,000 a month", {"COST.PRODUCT": 15000}),
    ("Product team CAD 35,000 a month", {"COST.PRODUCT": 35000}),
    ("Combined: launch +3, close x0.75, churn x1.5, funding +3 months", {"CAL.LAUNCH": dt.date(2027, 6, 1), "SELL.CLOSE": 0.165,
                                                                  "RET.MONTHLY_CHURN": 0.03, "RET.ANNUAL_NONRENEW": 0.30,
                                                                  "FUND.DATE": dt.date(2027, 5, 1)}),
]
SENS_METRICS = [
    ("First month below floor, with this case's financing", "Floor breach (with financing)", "t"),
    ("Lowest within-month cash, with financing", "Lowest cash", "cad"),
    ("Funding needed to milestone plus forward reserve", "Funding needed", "cad"),
    ("Paying firms at milestone (expected value)", "Paying firms (Mar 2028)", "num1"),
    ("ARR run rate at milestone", "ARR run rate (Mar 2028)", "cad"),
    ("Revenue earned, 12 months to milestone", "Revenue earned (12 m)", "cad"),
    ("Limiting step at milestone", "Limiting step", "t"),
    ("Start month used: Sales representative #1", "Rep #1 starts", "t"),
]


def stamp(fp, ver):
    return (f"*Generated {dt.datetime.now().strftime('%Y-%m-%d %H:%M')} by `tools/refresh_reports.py` from "
            f"`04-execution-team-financial-workbook.xlsx` (model {ver}; inputs-and-logic fingerprint `{fp}`; "
            f"actuals: none entered; CAD). Forecasts are expected values from assumptions, not results. "
            f"Do not edit inside this block.*")


def table(header, rows):
    out = ["| " + " | ".join(header) + " |", "|" + "---|" * len(header)]
    for r in rows:
        out.append("| " + " | ".join(str(x) for x in r) + " |")
    return "\n".join(out)


def kind_of(label):
    l_ = label.lower()
    if "margin" in l_:
        return "pct"
    if "firms" in l_ and "per firm" not in l_ and "cost per firm" not in l_:
        return "num1"
    if "burn multiple" in l_:
        return "x"
    if "payback" in l_:
        return "num1"
    return "cad"


def case_table(cv, labels, cases=ORDER):
    head = ["Metric"] + [f"{c}" for c in cases]
    rows = []
    for lab in labels:
        rows.append([lab] + [W.fmt(cv[c].get(lab), kind_of(lab)) for c in cases])
    return table(head, rows)


def gen_blocks(path, sens, fp, ver):
    cv = W.compare_values(path)
    mk, dil = W.market_and_dilution(path)
    B = {}
    st = stamp(fp, ver)
    names = {c[0]: c[1] for c in S.CASES}
    legend = "Cases: " + "; ".join(f"**{c}** = {names[c]}" for c in ORDER) + "."
    B["SUMMARY_KEY"] = "\n\n".join([st, legend, case_table(cv, [
        "Input validation", "Model checks", "Funding received in this case",
        "First month below floor, same plan with no financing", "Funding arrives before the no-financing floor breach?",
        "Latest month to start raising (breach - lead time - 1)", "Funding needed to milestone plus forward reserve",
        "Lowest within-month cash, with financing", "Paying firms at milestone (expected value)", "MRR at milestone",
        "ARR run rate at milestone", "Revenue earned, 12 months to milestone", "Limiting step at milestone"])])
    B["A1_MARKET"] = "\n\n".join([st, table(["RCICs per practice (assumption)", "Practices in Canada", "In ON/BC/AB",
                                             "Annual revenue pool at BASE list MRR per firm (CAD)"],
                                            [[x[0], W.fmt(x[1]), W.fmt(x[2]), W.fmt(x[3])] for x in mk]),
                                  "RCIC counts are people (CICC, 30 Jun 2025), not firms; the number of practices is not published. "
                                  "Excludes RISIAs, lawyers and other provinces. A sensitivity, not a measured ceiling."])
    B["A1_SCEN"] = "\n\n".join([st, legend, case_table(cv, [
        "Paying firms at milestone (expected value)", "Whole-firm operating target at milestone", "MRR at milestone",
        "ARR run rate at milestone", "Revenue earned, 12 months to milestone",
        "Cash collected from customers, 12 months to milestone", "Limiting step at milestone"])])
    # referral economics derived from BASE
    arpa = None
    wbv = load_workbook(path, data_only=True)
    ws = wbv["C_BASE"]
    for r in range(4, 300):
        if ws.cell(row=r, column=2).value == "arpa":
            arpa = ws.cell(row=r, column=3).value
            break
    wi = load_workbook(path)
    rows_ = W.input_rows(wi)
    credit = wi["Inputs"].cell(row=rows_["PART.REF_CREDIT"], column=4).value
    freem = wi["Inputs"].cell(row=rows_["PART.REF_FREE_MONTHS"], column=4).value
    ucm = cv["BASE"].get("Unit contribution per firm per month (milestone)")
    reward = (credit or 0) + (arpa or 0) * (freem or 0)
    months = (reward / ucm) if isinstance(ucm, (int, float)) and ucm > 0 else "N/A"
    B["A2_REFERRAL"] = "\n\n".join([st, table(["Item (BASE)", "Value (CAD)"], [
        ["List MRR per new firm (plan-mix weighted)", W.fmt(arpa)],
        ["Referrer credit (PART.REF_CREDIT)", W.fmt(credit)],
        ["Referee free month(s) at list MRR (derived)", W.fmt((arpa or 0) * (freem or 0))],
        ["Total reward per referred paying firm", W.fmt(reward)],
        ["Unit contribution per firm per month (milestone)", W.fmt(ucm)],
        ["Months of contribution to recover the reward", W.fmt(months, "num1") if not isinstance(months, str) else months]])])
    fund_labels = ["Funding received in this case", "First month below floor, same plan with no financing",
                   "First month below floor, with this case's financing", "First month cash below zero, with financing",
                   "Funding arrives before the no-financing floor breach?", "Latest month to start raising (breach - lead time - 1)",
                   "Funding needed to milestone plus forward reserve", "Lowest within-month cash, with financing",
                   "Cash at end of reported horizon"]
    use_labels = ["Use of funds, receipt to milestone: product team", "Use of funds, receipt to milestone: all other costs paid",
                  "Use of funds, receipt to milestone: customer collections offset"]
    B["A3_FUND"] = "\n\n".join([st, legend, case_table(cv, fund_labels), "**Use of funds (funded cases)**",
                                case_table(cv, use_labels, ["BASE", "DOWN", "UP", "HIGH"]),
                                "**Ownership illustration** (BASE funding amount; not a valuation; existing holdings unknown)",
                                table(["Post-money cap (illustrative)", "Funding amount", "Dilution"],
                                      [[W.fmt(d[0]), W.fmt(d[1]), W.fmt(d[2], "pct")] for d in dil])])
    B["A4_SCEN"] = "\n\n".join([st, legend, case_table(cv, [
        "Input validation", "Model checks", "Opening cash", "Opening cash status", "Funding received in this case",
        "First month below floor, same plan with no financing", "First month below floor, with this case's financing",
        "Lowest within-month cash, with financing", "Funding needed to milestone plus forward reserve",
        "Paying firms at milestone (expected value)", "MRR at milestone", "ARR run rate at milestone",
        "Revenue earned, 12 months to milestone", "Cash collected from customers, 12 months to milestone",
        "Gross margin, 12 months to milestone", "Contribution after sales and marketing, 12 months",
        "Operating result, 12 months to milestone", "Unit contribution per firm per month (milestone)",
        "CAC, fully loaded (trailing 3 months at milestone)", "CAC payback (months of unit contribution)",
        "Burn multiple, 12 months to milestone", "Commercial cost per firm gone live (descriptive, not CAC)",
        "Break-even paying firms at milestone cost base", "Limiting step at milestone", "Cash at end of reported horizon"])])
    B["A4_BUDGET"] = "\n\n".join([st, legend, case_table(cv, [
        "COGS, start to milestone", "Sales and marketing, start to milestone", "Product development (R&D), start to milestone",
        "Administration and fundraising, start to milestone", "Total costs, start to milestone",
        "Discretionary commercial spend, start to milestone"])])
    B["A4_HIRING"] = "\n\n".join([st, legend, case_table(cv, ROLE_LABELS)])
    if sens:
        head = ["Variant (applied to BASE only)"] + [m[1] for m in SENS_METRICS]
        rows = [[name] + [W.fmt(vals.get(m[0]), m[2] if m[2] != "t" else "cad") for m in SENS_METRICS] for name, vals in sens]
        B["A4_STRESS"] = "\n\n".join([st, table(head, rows),
                                      "Each row changes only the stated assumptions in BASE; price rows do not prove willingness to pay."])
    return B


def replace_block(text, bid, content, fp):
    pat = re.compile(rf"<!-- GENERATED:{bid} BEGIN[^>]*-->.*?<!-- GENERATED:{bid} END -->", re.S)
    new = f"<!-- GENERATED:{bid} BEGIN fingerprint={fp} -->\n{content}\n<!-- GENERATED:{bid} END -->"
    if not pat.search(text):
        return text, False
    return pat.sub(lambda _m: new, text), True


def run_sensitivity(path):
    out = []
    tmpd = tempfile.mkdtemp(prefix="sens_")
    for name, ch in VARIANTS:
        p = os.path.join(tmpd, "v.xlsx")
        shutil.copy(path, p)
        wb = load_workbook(p)
        for aid, v in ch.items():
            W.set_override(wb, "BASE", aid, v)
        wb.save(p)
        res = lo_recalc.recalc(p)
        cv = W.compare_values(p)["BASE"]
        cv["_errors"] = res["total_errors"]
        out.append((name, cv))
        print(f"  sensitivity: {name} -> errors {res['total_errors']}", flush=True)
    shutil.rmtree(tmpd, ignore_errors=True)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workbook", default=W.WORKBOOK)
    ap.add_argument("--no-sensitivity", action="store_true")
    ap.add_argument("--docs", default=W.COMMERCIAL)
    a = ap.parse_args()
    path = a.workbook
    print("recalculating...", flush=True)
    res = lo_recalc.recalc(path)
    print(res)
    if res["total_errors"]:
        print("Formula errors present; reports not refreshed.")
        sys.exit(2)
    sens = None if a.no_sensitivity else run_sensitivity(path)
    fp = W.fingerprint(path)
    wb = load_workbook(path)
    ver = wb["Reports"]["B4"].value
    # Sensitivity sheet (values) + report metadata
    sv = wb["Sensitivity"]
    for row in sv.iter_rows(min_row=2, max_row=sv.max_row):
        for c in row:
            c.value = None
    if sens:
        sv["A2"] = f"Generated {dt.datetime.now():%Y-%m-%d %H:%M}; fingerprint {fp}. Each variant overrides BASE only."
        sv.cell(row=4, column=1, value="Variant")
        for j, m in enumerate(SENS_METRICS, 2):
            sv.cell(row=4, column=j, value=m[1])
        for i, (name, vals) in enumerate(sens):
            sv.cell(row=5 + i, column=1, value=name)
            for j, m in enumerate(SENS_METRICS, 2):
                sv.cell(row=5 + i, column=j, value=vals.get(m[0]))
        sv.column_dimensions["A"].width = 58
    live = load_workbook(path, data_only=True)["Reports"]["B7"].value
    wb["Reports"]["B8"] = live
    wb["Reports"]["B9"] = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    wb["Reports"]["A11"] = "Report fingerprint at last refresh"
    wb["Reports"]["B11"] = fp
    blocks = gen_blocks(path, sens, fp, ver)
    wb.save(path)
    res2 = lo_recalc.recalc(path)
    print("after metadata write:", res2["status"], res2["total_errors"])
    changed = []
    for doc, ids in DOCS.items():
        p = os.path.join(a.docs, doc)
        if not os.path.exists(p):
            continue
        t = open(p).read()
        for bid in ids:
            if bid not in blocks:
                continue
            t, ok = replace_block(t, bid, blocks[bid], fp)
            if ok:
                changed.append(f"{doc}:{bid}")
        open(p, "w").write(t)
    print("refreshed blocks:", ", ".join(changed) or "none (no markers found)")
    print("fingerprint:", fp)


if __name__ == "__main__":
    main()
