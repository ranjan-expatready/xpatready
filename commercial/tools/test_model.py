"""Scenario tests for commercial/model.xlsx (author's checks; not needed for everyday edits).

For each scenario: copy the workbook, change Inputs, recalculate in LibreOffice (checking the exit code
and that every formula has a value), then compare the spreadsheet with an independent cohort-by-cohort
calculation written here in Python. Also checks that inputs and formulas survive a save.

Usage: python3 commercial/tools/test_model.py [workbook]
"""
import json
import shutil
import subprocess
import sys
import tempfile
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "commercial/model.xlsx").resolve()
N = 36
SOFFICE = shutil.which("soffice") or "/Applications/LibreOffice.app/Contents/MacOS/soffice"


def input_rows(wb):
    rows = {}
    for name, dn in wb.defined_names.items():
        if dn.attr_text.startswith("Inputs!"):
            rows[name] = int(dn.attr_text.split("$")[-1])
    return rows


def recalc(path):
    """Recalculate by converting with LibreOffice; fail loudly on a bad exit or empty results."""
    out = Path(tempfile.mkdtemp())
    prof = Path(tempfile.mkdtemp()).as_uri()
    p = subprocess.run([SOFFICE, f"-env:UserInstallation={prof}", "--headless", "--calc", "--convert-to", "xlsx",
                        "--outdir", str(out), str(path)], capture_output=True, timeout=180)
    res = out / path.name
    if p.returncode != 0 or not res.exists():
        raise RuntimeError(f"LibreOffice failed ({p.returncode}): {p.stderr.decode()[:300]}")
    if res.stat().st_mtime < path.stat().st_mtime - 1:
        raise RuntimeError("recalculated file is older than the source")
    return res


def m(d):
    return date(d.year, d.month, 1) if d else None


def months_between(a, b):
    return (b.year - a.year) * 12 + b.month - a.month


def independent(I):
    """Cohort-by-cohort simulation, written separately from the spreadsheet's running balances."""
    start = m(I["StartMonth"])
    months = [date(start.year + (start.month - 1 + i) // 12, (start.month - 1 + i) % 12 + 1, 1) for i in range(N)]
    lst = I["PriceSolo"] * I["MixSolo"] + I["PricePractice"] * I["MixPractice"] + I["PriceFirm"] * I["MixFirm"]
    fpr = lst * (1 - I["FoundDisc"])
    af = (12 - I["MonthsFree"]) / 12
    c, nr = I["ChurnM"], I["NonRenew"]
    cohorts = []  # (start_index, count, founding, annual)
    out = {k: [] for k in ("live", "mrr", "cash_in", "costs", "cash", "cash0", "new", "deferred")}
    orders = 0.0
    used_found = 0.0
    cash = cash0 = I["OpeningINR"] * I["FxINR"]
    newref_hist = []
    launch, pres = m(I["LaunchMonth"]), m(I["PresellStart"])
    cum_cash_ann = cum_rev_ann = 0.0

    def active(cohort, t):
        s, n, f, a = cohort
        k = t - s
        if k < 0:
            return 0.0
        return n * (1 - nr) ** (k // 12) if a else n * (1 - c) ** k

    def price(cohort, t):
        s, n, f, a = cohort
        return fpr if (f and t - s < 24) else lst

    for t, mo in enumerate(months):
        pre = 1 if (pres <= mo < launch) else 0
        post = 1 if mo >= launch else 0
        orders += pre * I["PreConv"] * I["PreRate"]
        new = (orders if mo == launch else 0) + post * I["PostConv"] * I["CloseRate"]
        prev_live = out["live"][-1] if t else 0
        rs = m(I["RefStart"]) if I["RefStart"] else None
        intro = prev_live * I["RefRate"] if (t and rs and mo >= rs) else 0
        nref = intro * I["RefClose"]
        newref_hist.append(nref)
        new += nref
        nf = min(new, max(0, I["FoundCap"] - used_found))
        used_found += nf
        ns = new - nf
        for n, f, share in ((nf, True, I["AnnualShareFound"]), (ns, False, I["AnnualShareStd"])):
            cohorts.append((t, n * (1 - share), f, False))
            cohorts.append((t, n * share, f, True))
        live = sum(active(co, t) for co in cohorts)
        mrr = 0.0
        cash_in = 0.0
        payments = 0.0
        rev_ann = 0.0
        for co in cohorts:
            a_ = active(co, t)
            if a_ == 0:
                continue
            p = price(co, t)
            if co[3]:
                mrr += a_ * p * af
                rev_ann += a_ * p * af
                if (t - co[0]) % 12 == 0:
                    cash_in += a_ * p * af * 12
                    cum_cash_ann += a_ * p * af * 12
                    payments += a_
            else:
                mrr += a_ * p
                cash_in += a_ * p
                payments += a_
        cum_rev_ann += rev_ann

        def on(d):
            return d is not None and mo >= m(d)

        def at(d):
            return d is not None and mo == m(d)

        cost = I["ProductCost"] * (1 - (I["ProductCut"] if on(I["ProductCutFrom"]) else 0))
        cost += (I["PartHours"] * I["PartRate"] * 52 / 12 if on(I["PartFrom"]) else 0) + (I["FullCost"] if on(I["FullFrom"]) else 0)
        cost += I["FounderPay"] + (I["Contractor"] if on(I["ContractorFrom"]) else 0) + (I["Events"] if on(I["EventsFrom"]) else 0)
        cost += (I["Tools"] if on(I["ToolsFrom"]) else 0) + I["Accounting"] + I["Adviser"]
        cost += sum(I[a] for a, w in (("LegalSetup", "LegalMonth"), ("Website", "WebsiteMonth"), ("Demo", "DemoMonth"),
                                      ("Conference", "ConferenceMonth")) if at(I[w]))
        if on(I["InsuranceFrom"]) and months_between(m(I["InsuranceFrom"]), mo) % 12 == 0:
            cost += I["Insurance"]
        cost += live * I["PerFirmCost"] + cash_in * I["CardPct"] + payments * I["CardFixed"]
        lag = int(I["RefLag"])
        cost += (newref_hist[t - lag] if t >= lag else 0) * I["RefReward"]
        inv = I["InvestAmt"] if at(I["InvestMonth"]) else 0
        roundc = I["RoundCosts"] if (inv and I["InvestAmt"] > 0) else 0
        top = I["FounderTopUp"] if at(I["FounderTopUpMonth"]) else 0
        cash += cash_in - cost + inv + top - roundc
        cash0 += cash_in - cost + top
        for k, v in (("live", live), ("mrr", mrr), ("cash_in", cash_in), ("costs", cost), ("cash", cash),
                     ("cash0", cash0), ("new", new), ("deferred", cum_cash_ann - cum_rev_ann)):
            out[k].append(v)
    reserve = I["Reserve"]
    out["gap0"] = max(0, reserve - min(out["cash0"]))
    out["gap"] = max(0, reserve - min(out["cash"]))
    ms = m(I["Milestone"])
    end = date(ms.year + (ms.month - 1 + int(I["RaiseMonths"])) // 12, (ms.month - 1 + int(I["RaiseMonths"])) % 12 + 1, 1)
    upto = [i for i, mo in enumerate(months) if mo <= end]
    out["need_ms"] = max(0, reserve - min(out["cash0"][i] for i in upto))
    out["years"] = {}
    for i, mo in enumerate(months):
        y = out["years"].setdefault(mo.year, [0.0, 0.0])
        y[0] += out["cash_in"][i]
        y[1] = out["live"][i]
    return out


SCENARIOS = {
    "base (defaults)": {},
    "zero customers": {"PreConv": 0, "PostConv": 0},
    "all monthly billing": {"AnnualShareStd": 0, "AnnualShareFound": 0},
    "all annual billing": {"AnnualShareStd": 1, "AnnualShareFound": 1},
    "prices +30%": {"PriceSolo": 89 * 1.3, "PricePractice": 229 * 1.3, "PriceFirm": 549 * 1.3},
    "product cost 50k": {"ProductCost": 50000},
    "product cost cut 40% from Jul 2027": {"ProductCut": 0.4, "ProductCutFrom": datetime(2027, 7, 1)},
    "investment 900k in Apr 2027": {"InvestAmt": 900000, "InvestMonth": datetime(2027, 4, 1)},
    "investment 900k delayed to Oct 2027": {"InvestAmt": 900000, "InvestMonth": datetime(2027, 10, 1)},
    "plentiful opening cash (INR 20 crore)": {"OpeningINR": 200000000},
    "launch delayed to Jun 2027": {"LaunchMonth": datetime(2027, 6, 1)},
    "no founding offer, no referrals": {"FoundCap": 0, "RefStart": None},
    "full-time hire Jan 2028, no part-time help, founder top-up": {"FullFrom": datetime(2028, 1, 1), "PartHours": 0,
                                               "FounderTopUp": 100000, "FounderTopUpMonth": datetime(2027, 6, 1)},
    "discretionary spending chosen (contractor, events, demo)": {"Contractor": 2500, "ContractorFrom": datetime(2026, 11, 1),
                                               "Events": 1200, "EventsFrom": datetime(2026, 12, 1), "Demo": 5000, "DemoMonth": datetime(2027, 2, 1)},
    "start month moved to Jan 2027 (year view follows)": {"StartMonth": datetime(2027, 1, 1), "PresellStart": datetime(2027, 1, 1)},
    "investment entered covers the milestone": {"InvestAmt": 600000, "InvestMonth": datetime(2027, 3, 1)},
    "invalid: milestone + raise months beyond forecast": {"Milestone": datetime(2029, 6, 1)},
    "missing required input (product cost blank)": {"ProductCost": None},
    "invalid: investment with no month": {"InvestAmt": 500000, "InvestMonth": None},
}


def run():
    base_wb = load_workbook(SRC)
    rows = input_rows(base_wb)
    results = []
    tmp = Path(tempfile.mkdtemp())
    for name, changes in SCENARIOS.items():
        wb = load_workbook(SRC)
        ws = wb["Inputs"]
        for k, v in changes.items():
            ws.cell(rows[k], 2).value = v
        path = tmp / (name.split(" (")[0].replace(" ", "_").replace("%", "pct").replace("+", "plus") + ".xlsx")
        wb.save(path)
        res = recalc(path)
        v = load_workbook(res, data_only=True)
        f = load_workbook(res)
        # every formula has a value, no error strings
        empty = errs = 0
        for wsn in ("Monthly", "Summary", "Checks"):
            for row_f, row_v in zip(f[wsn].iter_rows(), v[wsn].iter_rows()):
                for cf, cv in zip(row_f, row_v):
                    if isinstance(cf.value, str) and cf.value.startswith("="):
                        if cv.value is None and wsn != "Checks" and cf.column > 2:
                            empty += 1
                        if isinstance(cv.value, str) and cv.value.startswith(("#", "Err:")):
                            errs += 1
        # read inputs back (preserved on save?) and evaluate
        Iv = {}
        preserved = True
        for k, r in rows.items():
            Iv[k] = v["Inputs"].cell(r, 2).value
            if k in changes and changes[k] is not None and not isinstance(changes[k], datetime):
                preserved &= abs((Iv[k] or 0) - changes[k]) < 1e-9
        formulas_kept = str(f["Monthly"]["C20"].value).startswith("=")
        status_line = v["Summary"]["A2"].value
        mrows = {n[2:]: int(dn.attr_text.split("$")[2].rstrip(":")) for n, dn in f.defined_names.items() if n.startswith("m_")}
        sheet = v["Monthly"]
        got = {k: [sheet.cell(mrows[k2], 3 + i).value or 0 for i in range(N)]
               for k, k2 in (("live", "live"), ("mrr", "mrr"), ("cash_in", "cash_in"), ("costs", "c_total"),
                             ("cash", "cash"), ("cash0", "cash0"), ("new", "new"), ("deferred", "deferred"))}
        # costs on Monthly exclude round costs; independent "costs" too
        Ic = {k: (0 if (val is None and k not in ("RefStart", "ProductCutFrom", "FounderTopUpMonth",
                                                   "InvestMonth", "PartFrom", "FullFrom", "ContractorFrom", "EventsFrom",
                                                   "DemoMonth", "ToolsFrom", "ConferenceMonth")) else val)
              for k, val in Iv.items()}
        ind = independent(Ic)
        maxdiff = {k: max(abs(a - b) for a, b in zip(got[k], ind[k])) for k in got}
        tol = {"live": 1e-6, "new": 1e-6}
        match = all(maxdiff[k] < tol.get(k, 0.01) for k in maxdiff)
        gap0 = None
        for r in v["Summary"].iter_rows(min_row=5, max_row=40):
            if r[0].value and str(r[0].value).startswith("For reference: money to stay above"):
                gap_with, gap0 = r[1].value, r[2].value
        gap_ok = abs(gap0 - ind["gap0"]) < 0.01 and abs(gap_with - ind["gap"]) < 0.01
        need_ms = None
        yr_ok = True
        srows = list(v["Summary"].iter_rows(min_row=5, max_row=60))
        for r in srows:
            if r[0].value and str(r[0].value).startswith("Outside money needed for that"):
                need_ms = r[1].value
            if isinstance(r[0].value, (int, float)) and 2000 < r[0].value < 2100:
                y = int(r[0].value)
                exp = ind["years"].get(y, [0.0, 0.0])
                yr_ok &= abs((r[2].value or 0) - exp[0]) < 0.01 and abs((r[5].value or 0) - exp[1]) < 1e-6
        gap_ok &= need_ms is not None and abs(need_ms - ind["need_ms"]) < 0.01 and yr_ok
        results.append({
            "scenario": name, "status": status_line, "formula_errors": errs, "empty_results": empty,
            "inputs_preserved": preserved, "formulas_kept": formulas_kept, "matches_independent": match and gap_ok,
            "max_diff": {k: round(x, 4) for k, x in maxdiff.items()},
            "live_end": round(got["live"][-1], 1), "mrr_end": round(got["mrr"][-1]), "cash_in_36m": round(sum(got["cash_in"])),
            "lowest_cash_no_invest": round(min(got["cash0"])), "gap_no_invest": round(gap0), "gap_with_invest": round(gap_with), "need_milestone": round(need_ms or 0),
            "years": {y: round(c) for y, (c, _) in ind["years"].items()},
        })
    return results


if __name__ == "__main__":
    res = run()
    for r in res:
        print(json.dumps(r))
    bad = [r for r in res if r["formula_errors"] or r["empty_results"] or not r["inputs_preserved"]
           or not r["formulas_kept"] or (not r["matches_independent"] and "missing" not in r["scenario"] and "invalid" not in r["scenario"])]
    warn_ok = all(("WARNING" in r["status"]) == ("missing" in r["scenario"] or "invalid" in r["scenario"]) for r in res)
    print("RESULT:", "PASS" if not bad and warn_ok else "FAIL", f"{len(res)} scenarios; warnings shown only for bad inputs: {warn_ok}")
