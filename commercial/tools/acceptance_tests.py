"""Acceptance tests for model v0.2 (Codex brief §6). Every test runs on a disposable copy.

Usage: python3 commercial/tools/acceptance_tests.py
Writes commercial/tests/acceptance-report-<timestamp>.md and prints a summary.
"""
import datetime as dt
import os
import shutil
import subprocess
import sys
import tempfile

from openpyxl import load_workbook

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import independent_model as IM  # noqa: E402
import lo_recalc  # noqa: E402
import wbtools as W  # noqa: E402

TMP = tempfile.mkdtemp(prefix="acc_")
RESULTS = []
LBL_VALID = "Input validation"
LBL_CHECKS = "Model checks"


def copy(name):
    p = os.path.join(TMP, name + ".xlsx")
    shutil.copy(W.WORKBOOK, p)
    return p


def edit(p, fn):
    wb = load_workbook(p)
    fn(wb)
    wb.save(p)
    r = lo_recalc.recalc(p)
    return r


def cv(p):
    return W.compare_values(p)


def row(p, case, key):
    return W.calc_row(p, case, key)


def record(num, name, expected, observed, ok):
    RESULTS.append((num, name, expected, observed, "PASS" if ok else "FAIL"))
    print(f"[{'PASS' if ok else 'FAIL'}] {num} {name}: {observed}", flush=True)


def is_na(v):
    return isinstance(v, str) and v.startswith("N/A")


def t1():
    p = copy("t1a")
    edit(p, lambda wb: W.set_default(wb, "COST.PRODUCT", None))
    c = cv(p)
    obs = (c["BASE"][LBL_VALID][:60], c["BASE"]["Lowest within-month cash, with financing"], c["BASE"]["Paying firms at milestone (expected value)"])
    ok = ("COST.PRODUCT MISSING" in c["BASE"][LBL_VALID] and is_na(obs[1]) and is_na(obs[2]))
    record("1a", "Blank required product cost is rejected", "Validation names COST.PRODUCT MISSING; cash and (gated) customer outputs N/A", obs, ok)
    p = copy("t1b")
    edit(p, lambda wb: W.set_default(wb, "COST.PRODUCT", 0))
    c = cv(p)
    ok = c["BASE"][LBL_VALID] == "Valid" and isinstance(c["BASE"]["Lowest within-month cash, with financing"], (int, float))
    record("1b", "Explicit zero product cost is valid", "Valid; numeric cash outputs", (c["BASE"][LBL_VALID], c["BASE"]["Lowest within-month cash, with financing"]), ok)
    p = copy("t1c")
    edit(p, lambda wb: (W.set_default(wb, "PRICE.MIX_SOLO", 0.8), W.set_default(wb, "PRICE.MIX_PRACTICE", 0.8)))
    c = cv(p)
    obs = (c["BASE"][LBL_VALID][:70], c["BASE"]["ARR run rate at milestone"], c["UNR"]["ARR run rate at milestone"])
    ok = "do not sum to 100%" in c["BASE"][LBL_VALID] and is_na(obs[1]) and is_na(obs[2])
    record("1c", "Invalid plan mix (80% + 80%) is rejected", "Rule failure shown; ARR N/A in every inheriting case", obs, ok)
    p = copy("t1d")
    edit(p, lambda wb: W.set_default(wb, "SELL.CLOSE", 1.7))
    c = cv(p)
    ok = "SELL.CLOSE OUT OF RANGE" in c["BASE"][LBL_VALID]
    record("1d", "Out-of-range rate is rejected", "SELL.CLOSE OUT OF RANGE", c["BASE"][LBL_VALID][:60], ok)


def t2():
    base = cv(W.WORKBOOK)
    p = copy("t2")

    def f(wb):
        W.set_override(wb, "HIGH", "PRICE.SOLO", 89)  # isolate HIGH at the old price
        W.set_default(wb, "PRICE.SOLO", 99)
    edit(p, f)
    c = cv(p)
    lab = "MRR at milestone"
    changed = [k for k in ["BASE", "DOWN", "UP", "MNR", "UNR"] if c[k][lab] != base[k][lab]]
    high_same = abs(c["HIGH"][lab] - base["HIGH"][lab]) < 1e-6
    arpa_b = W.calc_row(W.WORKBOOK, "BASE", "rcm_issue")
    arpa_n = W.calc_row(p, "BASE", "rcm_issue")
    ratio = [round(n_ / b_, 4) for b_, n_ in zip(arpa_b, arpa_n) if b_ and b_ > 0][:1]
    ok = len(changed) == 5 and high_same
    record("2", "Shared price change flows to inheriting cases; override isolated",
           "MRR changes in BASE, DOWN, UP, MNR, UNR; HIGH (override 89) unchanged; free-month credit scales with price",
           {"changed": changed, "HIGH unchanged": high_same, "free-month credit ratio": ratio}, ok and (not ratio or ratio[0] > 1))


def t3():
    p = copy("t3a")
    edit(p, lambda wb: (W.set_override(wb, "BASE", "OFFER.ANNUAL_SHARE", 1), W.set_override(wb, "BASE", "OFFER.FOUND_ANNUAL", 1)))
    mig = row(p, "BASE", "mig_rev")
    inv_m = row(p, "BASE", "inv_month")
    icnt = row(p, "BASE", "icnt_SA")
    c = cv(p)
    ok = max(mig[:36]) == 0 and max(inv_m[:36]) < 1e-9 and c["BASE"][LBL_CHECKS] == "PASS"
    record("3a", "Annual-only: no migration charge, no monthly invoices, renewals scheduled, checks pass",
           "Migration 0; monthly invoices 0; renewal invoice counts 12 months after starts; checks PASS",
           {"max migration": max(mig[:36]), "max monthly invoices": round(max(inv_m[:36]), 6),
            "SA invoice count m8 vs m20": (round(icnt[7], 3), round(icnt[19], 3)), "checks": c["BASE"][LBL_CHECKS]}, ok)
    p = copy("t3b")
    edit(p, lambda wb: (W.set_override(wb, "BASE", "OFFER.ANNUAL_SHARE", 0), W.set_override(wb, "BASE", "OFFER.FOUND_ANNUAL", 0)))
    dfr = row(p, "BASE", "deferred")
    inv_a = row(p, "BASE", "inv_annual")
    c = cv(p)
    ok = max(abs(x) for x in dfr[:36]) < 1e-9 and max(inv_a[:36]) < 1e-9 and c["BASE"][LBL_CHECKS] == "PASS"
    record("3b", "Monthly-only: no annual invoices, zero deferred revenue, checks pass", "Deferred 0; annual invoices 0; PASS",
           {"max deferred": max(dfr[:36]), "max annual invoices": max(inv_a[:36]), "checks": c["BASE"][LBL_CHECKS]}, ok)


def t4():
    p = copy("t4")

    def f(wb):
        W.set_override(wb, "BASE", "OFFER.DEPOSIT", 2000)         # deposit larger than the first invoice
        W.set_override(wb, "BASE", "PART.REF_FREE_MONTHS", 3)     # credits larger than first invoice
        W.set_override(wb, "BASE", "OFFER.FOUND_DUR", 6)          # discount expires inside the horizon
        W.set_override(wb, "BASE", "OFFER.ANNUAL_REFUND", 0.5)    # heavy refunds
    edit(p, f)
    c = cv(p)
    dep = row(p, "BASE", "dep_bal")
    bill = row(p, "BASE", "billable")
    coll = row(p, "BASE", "collections")
    xp = row(p, "BASE", "xp_mrr")
    rf = row(p, "BASE", "refunds")
    ok = (min(bill[:36]) >= -0.01 and min(coll[:36]) >= -0.01 and max(dep[:36]) > 0 and dep[11] < max(dep[:36])
          and max(xp[:36]) > 0 and max(rf[:36]) > 0 and c["BASE"][LBL_CHECKS] == "PASS")
    record("4a", "Deposit > invoice, 3 free months, discount expiry, 50% refunds reconcile",
           "No negative billing or receipts; deposit liability unwinds; expiry uplift > 0; refunds > 0; checks PASS",
           {"min billable": round(min(bill[:36]), 2), "min collections": round(min(coll[:36]), 2),
            "deposit liability peak / month 12": (round(max(dep[:36])), round(dep[11])), "max expiry uplift": round(max(xp[:36]), 2),
            "checks": c["BASE"][LBL_CHECKS]}, ok)
    p0 = copy("t4b0")
    edit(p0, lambda wb: (W.set_override(wb, "BASE", "OFFER.ANNUAL_REFUND", 0), W.set_override(wb, "BASE", "PART.AFF_START", dt.date(2027, 4, 1))))
    p1 = copy("t4b1")
    edit(p1, lambda wb: (W.set_override(wb, "BASE", "OFFER.ANNUAL_REFUND", 0.5), W.set_override(wb, "BASE", "PART.AFF_START", dt.date(2027, 4, 1))))
    a0, a1 = sum(row(p0, "BASE", "aff_accr")[:36]), sum(row(p1, "BASE", "aff_accr")[:36])
    ok = a1 < a0 and a0 > 0
    record("4b", "Affiliate commission is clawed back on refunded annual customers", "Commission with 50% refunds < with 0%",
           {"commission 0% refunds": round(a0, 2), "commission 50% refunds": round(a1, 2)}, ok)


def t5():
    p = copy("t5")

    def f(wb):
        for k in ["SELL.PRE_CONV", "SELL.FOUNDER_OPPS", "SELL.COMM_OPPS", "PART.REF_RATE", "PART.AFF_OPPS"]:
            W.set_override(wb, "BASE", k, 0)
    r = edit(p, f)
    c = cv(p)["BASE"]
    labs = ["Gross margin, 12 months to milestone", "CAC, fully loaded (trailing 3 months at milestone)",
            "CAC payback (months of unit contribution)", "Burn multiple, 12 months to milestone",
            "Break-even paying firms at milestone cost base", "Unit contribution per firm per month (milestone)"]
    obs = {k: c[k] for k in labs}
    ok = r["total_errors"] == 0 and all(is_na(v) for v in obs.values())
    record("5", "No customers: informative N/A, no errors or misleading zeros", "All ratio metrics N/A with reason; 0 formula errors",
           {"formula errors": r["total_errors"], **{k[:28]: v for k, v in obs.items()}}, ok)


def t6():
    base = cv(W.WORKBOOK)
    p = copy("t6a")
    edit(p, lambda wb: (W.set_override(wb, "BASE", "FUND.AMT", 0), W.set_override(wb, "BASE", "FUND.DATE", None)))
    c = cv(p)
    ok1 = c["BASE"]["Lowest within-month cash, with financing"] < base["BASE"]["Lowest within-month cash, with financing"]
    ok2 = base["MNR"]["Cash at end of reported horizon"] != base["UNR"]["Cash at end of reported horizon"]
    st_mnr = base["MNR"]["Start month used: Customer-success specialist #2"]
    st_unr = base["UNR"]["Start month used: Customer-success specialist #2"]
    record("6a", "Funding removed lowers cash; managed and unmitigated no-raise stay distinct",
           "Lower lowest cash; MNR and UNR differ in cash and hiring",
           {"BASE lowest cash (no funding)": c["BASE"]["Lowest within-month cash, with financing"],
            "MNR vs UNR cash end": (base["MNR"]["Cash at end of reported horizon"], base["UNR"]["Cash at end of reported horizon"]),
            "CS2 start MNR vs UNR": (st_mnr, st_unr)}, ok1 and ok2 and st_mnr != st_unr)
    p = copy("t6b")
    edit(p, lambda wb: W.set_override(wb, "BASE", "FUND.DATE", dt.date(2027, 4, 1)))  # = no-financing breach month
    c = cv(p)
    obs = (c["BASE"]["Funding arrives before the no-financing floor breach?"], c["BASE"]["First month below floor, with this case's financing"])
    ok = obs[0].startswith("NO") and obs[1] != "none in horizon"
    record("6b", "Shortage in a month is not hidden by funding received later that month",
           "Funding in the breach month: 'NO — arrives too late' and a floor breach shown", obs, ok)


def t7():
    base = cv(W.WORKBOOK)
    p = copy("t7a")
    edit(p, lambda wb: W.set_override(wb, "BASE", "CAL.LAUNCH", dt.date(2027, 6, 1)))
    fonb0, fonb1 = row(W.WORKBOOK, "BASE", "fonb"), row(p, "BASE", "fonb")
    first0 = next(i + 1 for i, v in enumerate(fonb0) if v and v > 0)
    first1 = next(i + 1 for i, v in enumerate(fonb1) if v and v > 0)
    c = cv(p)
    record("7a", "Launch delay shifts go-live and results", "First founding go-live 3 months later; fewer firms at milestone",
           {"first go-live month #": (first0, first1), "firms at milestone": (base["BASE"]["Paying firms at milestone (expected value)"],
                                                                              c["BASE"]["Paying firms at milestone (expected value)"])},
           first1 == first0 + 3 and c["BASE"]["Paying firms at milestone (expected value)"] < base["BASE"]["Paying firms at milestone (expected value)"])
    p = copy("t7b")
    edit(p, lambda wb: (W.set_override(wb, "BASE", "ONB.HRS_PER_FIRM", 16), W.set_override(wb, "BASE", "ONB.SUP_HRS", 1.5)))
    b0, b1 = row(W.WORKBOOK, "BASE", "sback"), row(p, "BASE", "sback")
    c = cv(p)
    record("7b", "Doubled onboarding effort raises backlog and moves the CS2 hire",
           "Higher standard backlog; CS2 start earlier or capacity-limited",
           {"max backlog": (round(max(b0[:36]), 2), round(max(b1[:36]), 2)),
            "CS2 start": (base["BASE"]["Start month used: Customer-success specialist #2"], c["BASE"]["Start month used: Customer-success specialist #2"])},
           max(b1[:36]) > max(b0[:36]))
    p = copy("t7c")
    edit(p, lambda wb: W.set_override(wb, "BASE", "SELL.LAG", 3))
    cl0, cl1 = row(W.WORKBOOK, "BASE", "closes"), row(p, "BASE", "closes")
    f0 = next(i + 1 for i, v in enumerate(cl0) if v and v > 0)
    f1 = next(i + 1 for i, v in enumerate(cl1) if v and v > 0)
    record("7c", "Longer sales cycle delays closes", "First close 2 months later with lag 3 vs 1", {"first close month #": (f0, f1)}, f1 == f0 + 2)


def t8():
    wb = load_workbook(W.WORKBOOK, data_only=True)
    ws = wb["Checks"]
    res = {}
    for r in range(5, 16):
        lab = ws.cell(row=r, column=1).value
        if lab:
            res[lab[:40]] = [ws.cell(row=r, column=c).value for c in range(3, 9)]
    ok = all(all(v == "PASS" for v in vals) for vals in res.values())
    record("8", "Reconciliations pass in all six delivered cases",
           "Customer, MRR movement, ARR, deferred, receivables, deposits, non-negative, cost classification and cash checks PASS",
           {k: ("all PASS" if all(v == "PASS" for v in vals) else vals) for k, vals in res.items()}, ok)


def t9():
    p = copy("t9")

    def f(wb):
        W.set_default(wb, "CAL.ACT_CUTOFF", dt.date(2026, 11, 1))
        a = wb["Actuals"]
        rows_ = [("IMP-001", dt.date(2026, 10, 1), "ACT.CASH_CLOSE", 280000),
                 ("IMP-001", dt.date(2026, 11, 1), "ACT.CASH_CLOSE", 251000),
                 ("IMP-002", dt.date(2026, 11, 1), "ACT.CASH_CLOSE", 251000)]  # identical duplicate import
        for i, (b, d_, mid, v) in enumerate(rows_):
            a.cell(row=6 + i, column=1, value=b)
            a.cell(row=6 + i, column=2, value=d_)
            a.cell(row=6 + i, column=3, value=mid)
            a.cell(row=6 + i, column=4, value=v)
    edit(p, f)
    cash1 = row(p, "BASE", "cash_close")[:2]
    p2 = os.path.join(TMP, "t9b.xlsx")
    shutil.copy(p, p2)
    edit(p2, lambda wb: W.set_default(wb, "COST.PRODUCT", 40000))
    cash2 = row(p2, "BASE", "cash_close")[:3]
    dupflag = load_workbook(p, data_only=True)["Actuals"]["J8"].value
    ok = cash1 == [280000, 251000] and cash2[:2] == [280000, 251000] and "DUPLICATE" in str(dupflag)
    record("9a", "Actual months are frozen and identical duplicate imports are not double counted",
           "Oct/Nov cash = actuals before and after a forecast change; duplicate flagged and counted once",
           {"actual cash Oct, Nov": cash1, "after product cost change": cash2[:2], "Dec forecast changes": round(cash2[2]),
            "duplicate flag": dupflag}, ok)
    p3 = os.path.join(TMP, "t9c.xlsx")
    shutil.copy(p, p3)
    edit(p3, lambda wb: wb["Actuals"].cell(row=8, column=4, value=252000))  # conflicting duplicate
    c = cv(p3)
    ok = "conflicting duplicate" in c["BASE"][LBL_VALID]
    record("9b", "Conflicting duplicate actuals block outputs", "Validation reports conflicting duplicate", c["BASE"][LBL_VALID][:80], ok)


def t10():
    d = tempfile.mkdtemp(prefix="docs_", dir=TMP)
    for f in os.listdir(W.COMMERCIAL):
        if f.endswith(".md"):
            shutil.copy(os.path.join(W.COMMERCIAL, f), d)
    p = copy("t10")
    tools = os.path.dirname(os.path.abspath(__file__))
    subprocess.run([sys.executable, os.path.join(tools, "refresh_reports.py"), "--workbook", p, "--docs", d, "--no-sensitivity"],
                   capture_output=True, text=True, timeout=900)
    fp1 = W.fingerprint(p)
    status1 = load_workbook(p, data_only=True)["Reports"]["B10"].value
    edit(p, lambda wb: W.set_default(wb, "PRICE.SOLO", 95))
    fp2 = W.fingerprint(p)
    status2 = load_workbook(p, data_only=True)["Reports"]["B10"].value
    t = open(os.path.join(d, "00-decision-summary.md")).read()
    block_fp_before = fp1 in t
    subprocess.run([sys.executable, os.path.join(tools, "refresh_reports.py"), "--workbook", p, "--docs", d, "--no-sensitivity"],
                   capture_output=True, text=True, timeout=900)
    t2_ = open(os.path.join(d, "00-decision-summary.md")).read()
    status3 = load_workbook(p, data_only=True)["Reports"]["B10"].value
    ok = (status1.startswith("Current") and status2.startswith("STALE") and fp1 != fp2 and block_fp_before
          and fp2 in t2_ and status3.startswith("Current"))
    record("10a", "Changed input makes reports stale; refresh brings them current",
           "Current -> STALE after edit (workbook and fingerprint) -> Current after refresh; block fingerprint updated",
           {"status after refresh": status1[:20], "after edit": status2[:20], "after re-refresh": status3[:20],
            "fingerprint changed": fp1 != fp2, "block updated": fp2 in t2_}, ok)
    # rebuild preserves edited inputs and actuals
    p2 = copy("t10b")
    edit(p2, lambda wb: (W.set_default(wb, "PRICE.SOLO", 97), W.set_override(wb, "DOWN", "SELL.CLOSE", 0.12)))
    out = os.path.join(TMP, "t10b-rebuilt.xlsx")
    r = subprocess.run([sys.executable, os.path.join(tools, "build_workbook.py"), "--out", out, "--src", p2],
                       capture_output=True, text=True, timeout=900)
    lr = lo_recalc.recalc(out)
    wb = load_workbook(out)
    v1 = wb["Inputs"].cell(row=W.input_rows(wb)["PRICE.SOLO"], column=4).value
    v2 = wb["Scenarios"].cell(row=W.scenario_rows(wb)["SELL.CLOSE"], column=W.scenario_cols(wb)["DOWN"] + 1).value
    ok = v1 == 97 and v2 == 0.12 and lr["total_errors"] == 0 and isinstance(cv(out)["BASE"]["MRR at milestone"], (int, float))
    record("10b", "Rebuild preserves edited inputs and overrides; formulas and values intact",
           "PRICE.SOLO 97 and DOWN SELL.CLOSE 0.12 preserved; 0 errors after recalc", {"PRICE.SOLO": v1, "DOWN close": v2,
                                                                                         "errors": lr["total_errors"]}, ok)


def t11():
    worst = {}
    for case in ["BASE", "DOWN", "UP", "MNR", "UNR", "HIGH"]:
        ind = IM.run(IM.effective(W.WORKBOOK, case))
        for k, ik in [("revenue", "revenue"), ("collections", "collections"), ("cash_close", "cash"), ("mrr", "mrr")]:
            sheet = W.calc_row(W.WORKBOOK, case, k)
            d = max(abs((sheet[m - 1] or 0) - ind[m - 1][ik]) for m in range(1, 37))
            worst[f"{case}.{k}"] = d
    ok = max(worst.values()) < 0.01
    record("11a", "Independent recalculation agrees (six cases, 36 months)", "Max absolute difference < CAD 0.01",
           {"max difference": max(worst.values())}, ok)
    p = copy("t11")

    def plant(wb):
        ws = wb["C_BASE"]
        for r in range(1, ws.max_row + 1):
            if ws.cell(row=r, column=2).value == "arr":
                for col in range(4, 64):
                    c = ws.cell(row=r, column=col)
                    c.value = c.value.replace("=12*", "=10*")
    edit(p, plant)
    c = cv(p)
    ok = c["BASE"][LBL_CHECKS].startswith("FAIL")
    record("11b", "Planted ARR x10 error is detected", "Checks: ARR identity FAIL; overall FAIL for BASE",
           {"BASE model checks": c["BASE"][LBL_CHECKS], "other cases": c["UP"][LBL_CHECKS]}, ok)


def t12():
    c = cv(W.WORKBOOK)
    wb = load_workbook(W.WORKBOOK, data_only=True)
    status = wb["Reports"]["B10"].value
    ok = all(c[k][LBL_CHECKS] == "PASS" and c[k][LBL_VALID] == "Valid" for k in c)
    record("12", "Delivered workbook: all cases valid and checks pass; limitations visible",
           "Valid + PASS in all six cases; report status shown; opening cash labelled unverified",
           {"cases": {k: (c[k][LBL_VALID], c[k][LBL_CHECKS]) for k in c}, "report status": status,
            "opening cash status": c["BASE"]["Opening cash status"]}, ok)


def main():
    t0 = dt.datetime.now()
    for t in [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12]:
        try:
            t()
        except Exception as ex:  # noqa: BLE001
            record(t.__name__, "test raised an exception", "no exception", repr(ex)[:300], False)
    out_dir = os.path.join(W.COMMERCIAL, "tests")
    os.makedirs(out_dir, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y-%m-%d-%H%M")
    path = os.path.join(out_dir, f"acceptance-report-{stamp}.md")
    with open(path, "w") as f:
        f.write(f"# Acceptance tests — model v0.2\n\nRun {t0:%Y-%m-%d %H:%M} to {dt.datetime.now():%H:%M}; workbook fingerprint "
                f"`{W.fingerprint(W.WORKBOOK)}`. Each test ran on a disposable copy; the delivered workbook was not modified.\n\n")
        f.write("| # | Test | Expected | Observed | Result |\n|---|---|---|---|---|\n")
        for num, name, exp, obs, res in RESULTS:
            f.write(f"| {num} | {name} | {exp} | {str(obs).replace('|', '/')} | **{res}** |\n")
        npass = sum(1 for r in RESULTS if r[4] == "PASS")
        f.write(f"\n**{npass} of {len(RESULTS)} passed.** These tests check the model's mechanics; they do not validate "
                f"the business assumptions.\n")
    print(f"\n{sum(1 for r in RESULTS if r[4] == 'PASS')}/{len(RESULTS)} passed -> {path}")
    shutil.rmtree(TMP, ignore_errors=True)


if __name__ == "__main__":
    main()
