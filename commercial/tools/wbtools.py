"""Shared helpers: locate assumptions, set defaults/overrides, read results, fingerprints."""
import datetime as dt
import hashlib
import json
import os

from openpyxl import load_workbook

HERE = os.path.dirname(os.path.abspath(__file__))
COMMERCIAL = os.path.normpath(os.path.join(HERE, ".."))
WORKBOOK = os.path.join(COMMERCIAL, "04-execution-team-financial-workbook.xlsx")
LOGIC_SHEETS_PREFIX = ("C_",)
LOGIC_SHEETS = ["Effective", "Checks", "Compare", "Dashboard", "Cohorts", "Cash13w"]


def input_rows(wb):
    ws = wb["Inputs"]
    return {ws.cell(row=r, column=1).value: r for r in range(5, ws.max_row + 1) if ws.cell(row=r, column=1).value}


def scenario_cols(wb):
    ws = wb["Scenarios"]
    out, c = {}, 4
    while ws.cell(row=4, column=c).value:
        out[ws.cell(row=4, column=c).value] = c
        c += 2
    return out


def scenario_rows(wb):
    ws = wb["Scenarios"]
    return {ws.cell(row=r, column=1).value: r for r in range(6, ws.max_row + 1) if ws.cell(row=r, column=1).value}


def set_default(wb, aid, value):
    wb["Inputs"].cell(row=input_rows(wb)[aid], column=4).value = value


def set_override(wb, case, aid, value, flag="Y"):
    r = scenario_rows(wb)[aid]
    c = scenario_cols(wb)[case]
    wb["Scenarios"].cell(row=r, column=c).value = flag
    wb["Scenarios"].cell(row=r, column=c + 1).value = value


def clear_override(wb, case, aid):
    set_override(wb, case, aid, None, flag=None)


def _norm(v):
    if isinstance(v, (dt.datetime, dt.date)):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, float):
        return round(v, 10)
    return v


def canonical_inputs(path_or_wb):
    wb = load_workbook(path_or_wb) if isinstance(path_or_wb, str) else path_or_wb
    data = {"inputs": {}, "overrides": {}, "actuals": []}
    ws = wb["Inputs"]
    for aid, r in input_rows(wb).items():
        data["inputs"][aid] = _norm(ws.cell(row=r, column=4).value)
    sc = wb["Scenarios"]
    for case, c in scenario_cols(wb).items():
        for aid, r in scenario_rows(wb).items():
            f, v = sc.cell(row=r, column=c).value, sc.cell(row=r, column=c + 1).value
            if f or v is not None:
                data["overrides"].setdefault(case, {})[aid] = [f, _norm(v)]
    wa = wb["Actuals"]
    for r in range(6, wa.max_row + 1):
        row = [_norm(wa.cell(row=r, column=c).value) for c in range(1, 5)]
        if any(x is not None for x in row):
            data["actuals"].append(row)
    return json.dumps(data, sort_keys=True, default=str)


def logic_fingerprint(path_or_wb):
    wb = load_workbook(path_or_wb) if isinstance(path_or_wb, str) else path_or_wb
    h = hashlib.sha256()
    names = LOGIC_SHEETS + [n for n in wb.sheetnames if n.startswith(LOGIC_SHEETS_PREFIX)]
    for n in names:
        if n not in wb.sheetnames:
            continue
        for row in wb[n].iter_rows():
            for cell in row:
                if isinstance(cell.value, str) and cell.value.startswith("="):
                    h.update(f"{n}!{cell.coordinate}{cell.value}".encode())
    return h.hexdigest()


def fingerprint(path):
    wb = load_workbook(path)
    return hashlib.sha256((canonical_inputs(wb) + logic_fingerprint(wb)).encode()).hexdigest()[:16]


def compare_values(path):
    """{case_id: {metric label: value}} from the recalculated Compare sheet."""
    wb = load_workbook(path, data_only=True)
    ws = wb["Compare"]
    cases = []
    c = 3
    while ws.cell(row=4, column=c).value:
        cases.append(str(ws.cell(row=4, column=c).value).split(":")[0])
        c += 1
    out = {k: {} for k in cases}
    for r in range(5, ws.max_row + 1):
        lab = ws.cell(row=r, column=1).value
        if not lab or ws.cell(row=r, column=3).value is None and ws.cell(row=r, column=2).value is None:
            continue
        for j, k in enumerate(cases):
            out[k][lab] = ws.cell(row=r, column=3 + j).value
    return out


def market_and_dilution(path):
    wb = load_workbook(path, data_only=True)
    ws = wb["Compare"]
    mk, dil = [], []
    for r in range(5, ws.max_row + 1):
        a = ws.cell(row=r, column=1).value
        if isinstance(a, (int, float)) and ws.cell(row=r, column=4).value is not None:
            mk.append([a, ws.cell(row=r, column=2).value, ws.cell(row=r, column=3).value, ws.cell(row=r, column=4).value])
        elif isinstance(a, (int, float)) and ws.cell(row=r, column=3).value is not None:
            dil.append([a, ws.cell(row=r, column=2).value, ws.cell(row=r, column=3).value])
    return mk, dil


def calc_row(path, case, key, values=True):
    wb = load_workbook(path, data_only=values)
    ws = wb[f"C_{case}"]
    for r in range(1, ws.max_row + 1):
        if ws.cell(row=r, column=2).value == key:
            return [ws.cell(row=r, column=c).value for c in range(4, 64)]
    raise KeyError(key)


def fmt(v, kind="cad"):
    if v is None:
        return "—"
    if isinstance(v, str):
        return v
    if kind == "pct":
        return f"{v:.0%}"
    if kind == "num1":
        return f"{v:,.1f}"
    if kind == "x":
        return f"{v:.1f}x"
    return f"{v:,.0f}"
