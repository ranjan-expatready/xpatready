"""Build (or rebuild) commercial/04-execution-team-financial-workbook.xlsx — model v0.2.

Canonical source of numbers = the workbook's own Inputs, Scenarios and Actuals sheets.
On rebuild this script READS those sheets (and Experiments and tracker tabs) from the
existing workbook and writes them back unchanged; spec defaults in model_spec.py are used
only for assumption IDs that do not yet exist (Codex brief §1, §5; CR-07).

Usage:  python3 commercial/tools/build_workbook.py [--out PATH]
Then:   python3 commercial/tools/refresh_reports.py   (recalculates and refreshes reports)
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import sys

from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Font, PatternFill, Protection
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.datavalidation import DataValidation

sys.path.insert(0, os.path.dirname(__file__))
import model_spec as S  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = os.path.normpath(os.path.join(HERE, "..", "04-execution-team-financial-workbook.xlsx"))

FONT = "Arial"
F_IN = Font(name=FONT, color="0000FF", size=10)
F_TXT = Font(name=FONT, color="000000", size=10)
F_LINK = Font(name=FONT, color="008000", size=10)
F_B = Font(name=FONT, bold=True, size=10)
F_T = Font(name=FONT, bold=True, size=13)
F_RED = Font(name=FONT, bold=True, color="C00000", size=10)
FILL_H = PatternFill("solid", fgColor="DDE4EE")
FILL_SEC = PatternFill("solid", fgColor="F2F2F2")
FILL_KEY = PatternFill("solid", fgColor="FFFF00")
FILL_IN = PatternFill("solid", fgColor="EAF2FF")
WRAP = Alignment(wrap_text=True, vertical="top")

FMT = {"num": '#,##0.00', "int": '#,##0', "cad": '#,##0;(#,##0);0', "cad2": '#,##0.00;(#,##0.00);0',
       "pct": '0.0%', "date": 'yyyy-mm-dd', "fx": '0.00000'}
CUR = '#,##0;(#,##0);"-"'
CUR2 = '#,##0.00;(#,##0.00);"-"'
NUM1 = '#,##0.0;(#,##0.0);"-"'
PCT = '0.0%;(0.0%);"-"'
MONTHFMT = 'mmm yyyy'

NCASE = len(S.CASES)
CASE_IDS = [c[0] for c in S.CASES]
FIRST_MCOL = 4                      # column D = month 1
MCOLS = [L(FIRST_MCOL + k) for k in range(S.MAX_MONTHS)]
LASTM = MCOLS[-1]
IN_ROW0 = 5                         # first data row on Inputs / Effective
SC_ROW0 = 6                         # first data row on Scenarios
ACT_ROW0, ACT_ROWS = 6, 1000


# --------------------------------------------------------------------------- preservation
def read_existing(path):
    """Return dict with preserved inputs/overrides/actuals/experiments/trackers, or None."""
    if not os.path.exists(path):
        return None
    wb = load_workbook(path)  # formulas, not values
    keep = {"inputs": {}, "overrides": {}, "actuals": [], "experiments": [], "trackers": {}, "history": None,
            "version": None}
    if "Inputs" in wb.sheetnames and wb["Inputs"]["A4"].value == "ID":
        ws = wb["Inputs"]
        for r in range(IN_ROW0, ws.max_row + 1):
            aid = ws.cell(row=r, column=1).value
            if not aid:
                continue
            keep["inputs"][aid] = {k: ws.cell(row=r, column=c).value for k, c in
                                   [("value", 4), ("req", 6), ("lo", 7), ("hi", 8), ("status", 9), ("source", 10),
                                    ("owner", 11), ("eff", 12), ("note", 13)]}
    if "Scenarios" in wb.sheetnames and wb["Scenarios"]["A5"].value == "ID":
        ws = wb["Scenarios"]
        heads = {}
        for k in range(NCASE):
            cid = ws.cell(row=4, column=4 + 2 * k).value
            if cid:
                heads[cid] = 4 + 2 * k
        for r in range(SC_ROW0, ws.max_row + 1):
            aid = ws.cell(row=r, column=1).value
            if not aid:
                continue
            for cid, c in heads.items():
                flag = ws.cell(row=r, column=c).value
                val = ws.cell(row=r, column=c + 1).value
                if flag or val is not None:
                    keep["overrides"].setdefault(cid, {})[aid] = (flag, val)
    if "Actuals" in wb.sheetnames:
        ws = wb["Actuals"]
        for r in range(ACT_ROW0, ACT_ROW0 + ACT_ROWS):  # data rows only (legend sits below)
            row = [ws.cell(row=r, column=c).value for c in range(1, 10)]
            if any(v is not None for v in row[:4]):
                keep["actuals"].append(row)
    if "Experiments" in wb.sheetnames:
        ws = wb["Experiments"]
        for r in range(5, ws.max_row + 1):
            row = [ws.cell(row=r, column=c).value for c in range(1, 13)]
            if any(v is not None for v in row):
                keep["experiments"].append(row)
    for name in wb.sheetnames:
        if name.startswith("T-"):
            ws = wb[name]
            keep["trackers"][name] = [[ws.cell(row=r, column=c).value for c in range(1, ws.max_column + 1)]
                                      for r in range(1, ws.max_row + 1)]
    if "History_v0.1" in wb.sheetnames:
        ws = wb["History_v0.1"]
        keep["history"] = [[ws.cell(row=r, column=c).value for c in range(1, ws.max_column + 1)]
                           for r in range(1, ws.max_row + 1)]
    elif "Summary" in wb.sheetnames:  # v0.1 workbook: capture its Summary values as dated history
        wv = load_workbook(path, data_only=True)["Summary"]
        keep["history"] = [[wv.cell(row=r, column=c).value for c in range(1, 6)] for r in range(1, 26)]
    if "Reports" in wb.sheetnames:
        keep["version"] = wb["Reports"]["B4"].value
    return keep


# --------------------------------------------------------------------------- helpers
def style_header(ws, row, ncol, fill=FILL_H):
    for c in range(1, ncol + 1):
        cell = ws.cell(row=row, column=c)
        cell.font = F_B
        cell.fill = fill
        cell.alignment = WRAP


def protect(ws, unlocked=()):
    for coord in unlocked:
        ws[coord].protection = Protection(locked=False)
    ws.protection.sheet = True
    ws.protection.formatCells = False
    ws.protection.formatColumns = False
    ws.protection.formatRows = False


def build(out_path, src_path=None):
    src_path = src_path or out_path
    keep = read_existing(src_path) or {"inputs": {}, "overrides": {}, "actuals": [], "experiments": [],
                                       "trackers": {}, "history": None, "version": None}
    log = {"new_ids": [], "preserved_ids": 0, "retired_ids": []}
    spec_ids = [d["id"] for d in S.INPUTS]
    for aid in keep["inputs"]:
        if aid not in spec_ids:
            log["retired_ids"].append(aid)

    wb = Workbook()
    wb.remove(wb.active)
    sheets = {}
    order = ["Guide", "Dashboard", "Compare", "Inputs", "Scenarios", "Effective", "Actuals", "Experiments",
             "Checks", "Cash13w", "Cohorts", "Sensitivity", "Reports", "History_v0.1"] + [f"C_{c}" for c in CASE_IDS]
    for n in order:
        sheets[n] = wb.create_sheet(n)

    # ------------------------------------------------------------------ Inputs
    wi = sheets["Inputs"]
    wi["A1"] = "Inputs — shared defaults (the single editable source of assumptions)"
    wi["A1"].font = F_T
    wi["A2"] = ("Edit column D only (blue). Blank means UNKNOWN; type 0 for an explicit zero. Ranges in G:H are "
                "enforced: invalid or missing required values make affected outputs show N/A with the reason. "
                "Per-case changes go on the Scenarios sheet, not here.")
    wi["A2"].alignment = WRAP
    wi.merge_cells("A2:M2")
    wi.row_dimensions[2].height = 42
    heads = ["ID", "Group", "Assumption", "Value", "Unit", "Required", "Min", "Max", "Status", "Source / date",
             "Owner", "Effective date", "Notes", "w"]
    for j, h in enumerate(heads, 1):
        wi.cell(row=4, column=j, value=h)
    style_header(wi, 4, len(heads))
    ROWID = {}
    for i, d in enumerate(S.INPUTS):
        r = IN_ROW0 + i
        ROWID[d["id"]] = r
        prev = keep["inputs"].get(d["id"])
        if prev is None:
            log["new_ids"].append(d["id"])
            vals = dict(value=d["default"], req=d["req"], lo=d["lo"], hi=d["hi"], status=d["status"],
                        source=d["source"], owner=d["owner"], eff=d["eff"], note=d["note"])
        else:
            log["preserved_ids"] += 1
            vals = prev
        wi.cell(row=r, column=1, value=d["id"]).font = F_TXT
        wi.cell(row=r, column=2, value=d["group"]).font = F_TXT
        wi.cell(row=r, column=3, value=d["name"]).font = F_TXT
        c = wi.cell(row=r, column=4, value=vals["value"])
        c.font = F_IN
        c.fill = FILL_IN
        c.number_format = FMT.get(d["fmt"], "General")
        if d["status"].startswith("Placeholder") or d["id"] in ("COST.PRODUCT", "CASH.OPEN_INR"):
            c.fill = FILL_KEY
        wi.cell(row=r, column=5, value=d["unit"]).font = F_TXT
        for col, key in [(6, "req"), (7, "lo"), (8, "hi"), (9, "status"), (10, "source"), (11, "owner"),
                         (12, "eff"), (13, "note")]:
            cc = wi.cell(row=r, column=col, value=vals[key])
            cc.font = F_IN if col >= 9 else F_TXT
            if col in (7, 8):
                cc.number_format = FMT.get(d["fmt"], "General")
            if col == 12:
                cc.number_format = "yyyy-mm-dd"
        wi.cell(row=r, column=14, value=round(1.0 + ((i * 7919) % 997) / 997.0 + i * 1e-3, 6))
    last_in = IN_ROW0 + len(S.INPUTS) - 1
    for col, w in zip("ABCDEFGHIJKLMN", [24, 9, 62, 14, 14, 8, 12, 12, 18, 52, 18, 12, 30, 4]):
        wi.column_dimensions[col].width = w
    wi.column_dimensions["N"].hidden = True
    wi.freeze_panes = "D5"
    dv = DataValidation(type="list", formula1='"Y,N"', allow_blank=False)
    wi.add_data_validation(dv)
    dv.add(f"F{IN_ROW0}:F{last_in}")

    # ------------------------------------------------------------------ Scenarios
    ws = sheets["Scenarios"]
    ws["A1"] = "Scenarios — deliberate overrides only"
    ws["A1"].font = F_T
    ws["A2"] = ("A case inherits every shared default from Inputs. To override, put Y in the case's Flag column and the "
                "value next to it (a blank value with Y means 'unknown' for that case; 0 is a real zero). Effective "
                "values appear on the Effective sheet.")
    ws["A2"].alignment = WRAP
    ws.merge_cells("A2:O2")
    ws.row_dimensions[2].height = 40
    ws.cell(row=5, column=1, value="ID")
    ws.cell(row=5, column=2, value="Assumption")
    ws.cell(row=5, column=3, value="Shared default")
    SCOL = {}
    for k, (cid, cname, cdesc, ov) in enumerate(S.CASES):
        fc = 4 + 2 * k
        SCOL[cid] = fc
        ws.cell(row=3, column=fc, value=cname).font = F_B
        ws.cell(row=3, column=fc).alignment = WRAP
        ws.cell(row=4, column=fc, value=cid).font = F_B
        ws.cell(row=5, column=fc, value="Flag")
        ws.cell(row=5, column=fc + 1, value="Override value")
    style_header(ws, 5, 3 + 2 * NCASE)
    for i, d in enumerate(S.INPUTS):
        r = SC_ROW0 + i
        ws.cell(row=r, column=1, value=d["id"]).font = F_TXT
        ws.cell(row=r, column=2, value=d["name"]).font = F_TXT
        c = ws.cell(row=r, column=3, value=f"=Inputs!D{ROWID[d['id']]}")
        c.font = F_LINK
        c.number_format = FMT.get(d["fmt"], "General")
        for cid, cname, cdesc, ov in S.CASES:
            fc = SCOL[cid]
            pres = keep["overrides"].get(cid, {}).get(d["id"]) if keep["inputs"] else None
            if keep["inputs"]:
                flag, val = pres if pres else (None, None)
            else:
                flag, val = ("Y", ov[d["id"]]) if d["id"] in ov else (None, None)
            fcl = ws.cell(row=r, column=fc, value=flag)
            fcl.font = F_IN
            vcl = ws.cell(row=r, column=fc + 1, value=val)
            vcl.font = F_IN
            vcl.number_format = FMT.get(d["fmt"], "General")
            if flag:
                fcl.fill = FILL_KEY
                vcl.fill = FILL_KEY
        ws.cell(row=r, column=4 + 2 * NCASE, value=round(2.0 + ((i * 104729) % 991) / 991.0, 6))
        terms = []
        for k in range(NCASE):
            fl, vl = L(4 + 2 * k), L(5 + 2 * k)
            terms.append(f'N({vl}{r})*{1 + 0.13 * k:.2f}+({fl}{r}="Y")*{2.1 + 0.07 * k:.2f}+({fl}{r}="Y")*({vl}{r}="")*{0.51 + 0.03 * k:.2f}')
        ws.cell(row=r, column=5 + 2 * NCASE, value="=" + "+".join(terms))
    ws.column_dimensions["A"].width = 24
    ws.column_dimensions["B"].width = 50
    ws.column_dimensions["C"].width = 13
    for k in range(NCASE):
        ws.column_dimensions[L(4 + 2 * k)].width = 6
        ws.column_dimensions[L(5 + 2 * k)].width = 13
    ws.column_dimensions[L(4 + 2 * NCASE)].hidden = True
    ws.column_dimensions[L(5 + 2 * NCASE)].hidden = True
    ws.freeze_panes = "D6"
    for k, (cid, cname, cdesc, ov) in enumerate(S.CASES):
        ws.cell(row=SC_ROW0 + len(S.INPUTS) + 2 + k, column=1, value=cid).font = F_B
        ws.cell(row=SC_ROW0 + len(S.INPUTS) + 2 + k, column=2, value=cname + ": " + cdesc).font = F_TXT
    dvf = DataValidation(type="list", formula1='"Y"', allow_blank=True)
    ws.add_data_validation(dvf)
    for k in range(NCASE):
        dvf.add(f"{L(4 + 2 * k)}{SC_ROW0}:{L(4 + 2 * k)}{SC_ROW0 + len(S.INPUTS) - 1}")

    # ------------------------------------------------------------------ Effective (values + validation)
    we = sheets["Effective"]
    we["A1"] = "Effective values by case and input validation (formulas only — do not edit)"
    we["A1"].font = F_T
    we["A2"] = ("Effective = override when flagged on Scenarios, otherwise the shared default. Status: OK, MISSING "
                "(required and blank), OUT OF RANGE, NOT A NUMBER. Rules below check sums and date order.")
    hdr = ["ID", "Group", "Assumption", "Default"]
    ECOL = {}
    for k, cid in enumerate(CASE_IDS):
        ECOL[cid] = (5 + 3 * k, 6 + 3 * k, 7 + 3 * k)  # value, status, error text
        hdr += [f"{cid} value", f"{cid} status", f"{cid} error"]
    for j, h in enumerate(hdr, 1):
        we.cell(row=4, column=j, value=h)
    style_header(we, 4, len(hdr))
    for i, d in enumerate(S.INPUTS):
        r = IN_ROW0 + i
        ri, rs = ROWID[d["id"]], SC_ROW0 + i
        we.cell(row=r, column=1, value=d["id"])
        we.cell(row=r, column=2, value=d["group"])
        we.cell(row=r, column=3, value=d["name"])
        dc = we.cell(row=r, column=4, value=f'=IF(ISBLANK(Inputs!D{ri}),"",Inputs!D{ri})')
        dc.number_format = FMT.get(d["fmt"], "General")
        for cid in CASE_IDS:
            vc, sc, xc = ECOL[cid]
            fl, ovc = L(SCOL[cid]), L(SCOL[cid] + 1)
            v = (f'=IF(UPPER(Scenarios!{fl}{rs})="Y",IF(ISBLANK(Scenarios!{ovc}{rs}),"",Scenarios!{ovc}{rs}),'
                 f'IF(ISBLANK(Inputs!D{ri}),"",Inputs!D{ri}))')
            cv = we.cell(row=r, column=vc, value=v)
            cv.number_format = FMT.get(d["fmt"], "General")
            V = f"{L(vc)}{r}"
            st = (f'=IF({V}="",IF(Inputs!F{ri}="Y","MISSING","OK"),IF(ISNUMBER({V}),'
                  f'IF(AND(OR(Inputs!G{ri}="",{V}>=Inputs!G{ri}),OR(Inputs!H{ri}="",{V}<=Inputs!H{ri})),"OK","OUT OF RANGE"),'
                  f'"NOT A NUMBER"))')
            we.cell(row=r, column=sc, value=st)
            we.cell(row=r, column=xc, value=f'=IF({L(sc)}{r}="OK","",A{r}&" "&{L(sc)}{r})')

    def E(aid, cid):
        return f"Effective!${L(ECOL[cid][0])}${ROWID[aid]}"

    # rules
    rr0 = IN_ROW0 + len(S.INPUTS) + 2
    we.cell(row=rr0, column=1, value="Cross-field rules").font = F_B
    RULES = []

    def rule(group, msg, cond):  # cond(cid) -> excel boolean that is TRUE when the rule FAILS
        RULES.append((group, msg, cond))

    rule("PRICE", "PRICE.MIX_* do not sum to 100%",
         lambda c: f"ABS(N({E('PRICE.MIX_SOLO', c)})+N({E('PRICE.MIX_PRACTICE', c)})+N({E('PRICE.MIX_FIRM', c)})-1)>0.001")
    for rid, *_ in S.ROLES:
        rule("ROLE", f"ROLE.{rid} allocation shares do not sum to 100%",
             lambda c, rid=rid: "ABS(" + "+".join(f"N({E(f'ROLE.{rid}.{k}', c)})" for k in ["COGS", "SM", "RD", "GA"]) + "-1)>0.001")
    rule("COST", "COST.TOOLS_* allocation shares do not sum to 100%",
         lambda c: f"ABS(N({E('COST.TOOLS_COGS', c)})+N({E('COST.TOOLS_SM', c)})+N({E('COST.TOOLS_GA', c)})-1)>0.001")
    for nm in ["PAYROLL", "PRODUCT", "OTHER", "RECEIPTS"]:
        rule("W13", f"W13.{nm}_W1..W4 do not sum to 100%",
             lambda c, nm=nm: "ABS(" + "+".join(f"N({E(f'W13.{nm}_W{b}', c)})" for b in range(1, 5)) + "-1)>0.001")
    rule("CAL", "CAL.LAUNCH is before CAL.START",
         lambda c: f"N({E('CAL.LAUNCH', c)})<N({E('CAL.START', c)})")
    rule("CAL", "CAL.MILESTONE is not after CAL.LAUNCH",
         lambda c: f"N({E('CAL.MILESTONE', c)})<=N({E('CAL.LAUNCH', c)})")
    rule("CAL", "CAL.MILESTONE is beyond the reported horizon",
         lambda c: f"N({E('CAL.MILESTONE', c)})>=EDATE(N({E('CAL.START', c)}),N({E('CAL.HORIZON', c)}))")
    rule("CAL", "CAL.ACT_CUTOFF is outside the forecast period",
         lambda c: f"AND({E('CAL.ACT_CUTOFF', c)}<>\"\",OR(N({E('CAL.ACT_CUTOFF', c)})<N({E('CAL.START', c)}),"
                   f"N({E('CAL.ACT_CUTOFF', c)})>=EDATE(N({E('CAL.START', c)}),N({E('CAL.HORIZON', c)}))))")
    rule("FUND", "FUND.AMT is above zero but FUND.DATE is blank",
         lambda c: f"AND(N({E('FUND.AMT', c)})>0,{E('FUND.DATE', c)}=\"\")")
    rule("FUND", "FUND.DATE is outside the forecast period",
         lambda c: f"AND({E('FUND.DATE', c)}<>\"\",OR(N({E('FUND.DATE', c)})<N({E('CAL.START', c)}),"
                   f"N({E('FUND.DATE', c)})>=EDATE(N({E('CAL.START', c)}),N({E('CAL.HORIZON', c)}))))")
    rule("FUND", "FUND.BRIDGE_AMT is above zero but FUND.BRIDGE_DATE is blank",
         lambda c: f"AND(N({E('FUND.BRIDGE_AMT', c)})>0,{E('FUND.BRIDGE_DATE', c)}=\"\")")
    rule("FUND", "FUND.GOV_AMT is above zero but FUND.GOV_DATE is blank",
         lambda c: f"AND(N({E('FUND.GOV_AMT', c)})>0,{E('FUND.GOV_DATE', c)}=\"\")")
    rule("ACT", "Actuals contain conflicting duplicate records (same month and metric)",
         lambda c: "COUNTIF(Actuals!$J$6:$J$1005,\"CONFLICT*\")>0")
    rule("ACT", "Actuals contain a period that is not the first day of a month",
         lambda c: "COUNTIF(Actuals!$K$6:$K$1005,\"CHECK*\")>0")
    RULEROW = {}
    for q, (grp, msg, cond) in enumerate(RULES):
        r = rr0 + 1 + q
        we.cell(row=r, column=1, value=f"RULE.{q + 1:02d}")
        we.cell(row=r, column=2, value=grp)
        we.cell(row=r, column=3, value=msg)
        for cid in CASE_IDS:
            vc, sc, xc = ECOL[cid]
            we.cell(row=r, column=sc, value=f'=IFERROR(IF({cond(cid)},"FAIL","OK"),"FAIL")')
            we.cell(row=r, column=xc, value=f'=IF({L(sc)}{r}="OK","",C{r})')
    rlast = rr0 + len(RULES)
    # validity flags per case
    vrow = rlast + 3
    we.cell(row=vrow - 1, column=1, value="Validity by output family").font = F_B
    groups_all = list(S.GROUPS.keys()) + ["ACT"]
    base_groups = ["CAL", "MKT", "PRICE", "OFFER", "PART", "SELL", "ONB", "RET", "ROLE", "HIRE"]
    gerr_row = {}
    for q, g in enumerate(groups_all):
        r = vrow + q
        gerr_row[g] = r
        we.cell(row=r, column=1, value=f"ERR.{g}")
        we.cell(row=r, column=3, value=f"Errors in group {g}")
        for cid in CASE_IDS:
            vc, sc, xc = ECOL[cid]
            scl = L(sc)
            we.cell(row=r, column=sc, value=(f'=COUNTIFS($B${IN_ROW0}:$B${rlast},"{g}",{scl}${IN_ROW0}:{scl}${rlast},"<>OK")'))
    VAL = {}
    vr2 = vrow + len(groups_all) + 1
    for q, (vk, label) in enumerate([("cust", "Customers and revenue valid"), ("cost", "Costs valid"),
                                     ("cash", "Cash and funding valid"), ("w13", "13-week view valid")]):
        r = vr2 + q
        VAL[vk] = r
        we.cell(row=r, column=1, value=f"VALID.{vk.upper()}")
        we.cell(row=r, column=3, value=label)
        for cid in CASE_IDS:
            vc, sc, xc = ECOL[cid]
            scl = L(sc)
            base = "+".join(f"{scl}{gerr_row[g]}" for g in base_groups)
            costg = "+".join(f"{scl}{gerr_row[g]}" for g in ["COST", "CASH", "FUND", "ACT"])
            if vk == "cust":
                f = f"=IF(({base})+IF({E('HIRE.MODE', cid)}=2,{costg},0)+IF(N({E('HIRE.DISC_GATED', cid)})=1,{costg},0)=0,TRUE,FALSE)"
            elif vk == "cost":
                f = f"=AND({scl}{vr2},{scl}{gerr_row['COST']}=0)"
            elif vk == "cash":
                allg = "+".join(f"{scl}{gerr_row[g]}" for g in groups_all if g != "W13")
                f = f"=IF({allg}=0,TRUE,FALSE)"
            else:
                f = f"=AND({scl}{vr2 + 2},{scl}{gerr_row['W13']}=0)"
            we.cell(row=r, column=sc, value=f)
    reason_row = vr2 + 5
    we.cell(row=reason_row, column=1, value="REASONS")
    we.cell(row=reason_row, column=3, value="Invalid inputs and failed rules (first items)")
    for cid in CASE_IDS:
        vc, sc, xc = ECOL[cid]
        xcl = L(xc)
        we.cell(row=reason_row, column=sc,
                value=f'=LEFT(_xlfn.TEXTJOIN("; ",TRUE,{xcl}{IN_ROW0}:{xcl}{rlast}),240)')
    we.column_dimensions["A"].width = 22
    we.column_dimensions["C"].width = 50
    we.freeze_panes = "D5"

    def VALID(kind, cid):
        return f"Effective!${L(ECOL[cid][1])}${VAL[kind]}"

    def REASON(cid):
        return f"Effective!${L(ECOL[cid][1])}${reason_row}"

    # ------------------------------------------------------------------ Actuals
    wa = sheets["Actuals"]
    wa["A1"] = "Actuals — entered or imported records (never forecasts)"
    wa["A1"].font = F_T
    wa["A2"] = ("One row per month and metric. Period = first day of the month. Months up to CAL.ACT_CUTOFF use these "
                "values in reporting; closing cash replaces the forecast. Identical duplicates are not double counted; "
                "conflicting duplicates block outputs. Record corrections in Note; never delete history silently.")
    wa["A2"].alignment = WRAP
    wa.merge_cells("A2:K2")
    wa.row_dimensions[2].height = 44
    ah = ["Import batch ID", "Period (first of month)", "Metric ID", "Value", "Unit", "Source", "Entered by",
          "Entered on", "Note / correction", "Duplicate check", "Period check"]
    for j, h in enumerate(ah, 1):
        wa.cell(row=5, column=j, value=h)
    style_header(wa, 5, len(ah))
    for q, row in enumerate(keep["actuals"]):
        for j, v in enumerate(row, 1):
            c = wa.cell(row=ACT_ROW0 + q, column=j, value=v)
            c.font = F_IN
            if j in (2, 8):
                c.number_format = "yyyy-mm-dd"
    for r in range(ACT_ROW0, ACT_ROW0 + ACT_ROWS):
        wa.cell(row=r, column=10, value=(
            f'=IF(OR(B{r}="",C{r}=""),"",IF(COUNTIFS($B$6:$B$1005,B{r},$C$6:$C$1005,C{r})>1,'
            f'IF(COUNTIFS($B$6:$B$1005,B{r},$C$6:$C$1005,C{r},$D$6:$D$1005,D{r})='
            f'COUNTIFS($B$6:$B$1005,B{r},$C$6:$C$1005,C{r}),"DUPLICATE (identical, counted once)","CONFLICT"),""))'))
        wa.cell(row=r, column=11, value=f'=IF(B{r}="","",IF(ISNUMBER(B{r}),IF(DAY(B{r})=1,"","CHECK: not first of month"),"CHECK: not a date"))')
    mr = ACT_ROW0 + ACT_ROWS + 1
    wa.cell(row=mr, column=1, value="Metric IDs").font = F_B
    for q, (mid, mname, munit) in enumerate(S.ACTUAL_METRICS):
        wa.cell(row=mr + 1 + q, column=1, value=mid)
        wa.cell(row=mr + 1 + q, column=2, value=mname)
        wa.cell(row=mr + 1 + q, column=3, value=munit)
    for col, w in zip("ABCDEFGHIJK", [16, 14, 18, 14, 8, 24, 14, 12, 30, 30, 24]):
        wa.column_dimensions[col].width = w
    wa.freeze_panes = "A6"

    # ------------------------------------------------------------------ Experiments
    wx = sheets["Experiments"]
    wx["A1"] = "Experiment log — model experiments and customer tests"
    wx["A1"].font = F_T
    wx["A2"] = ("A model experiment shows consequences of assumptions; it cannot prove willingness to pay. Record the "
                "customer test that would confirm it.")
    xh = ["ID", "Date", "Assumption IDs changed", "Case", "Original value(s)", "New value(s)", "Expected behaviour",
          "Model result (metric before -> after)", "Customer test", "Owner", "Evidence", "Decision"]
    for j, h in enumerate(xh, 1):
        wx.cell(row=4, column=j, value=h)
    style_header(wx, 4, len(xh))
    rows = keep["experiments"] or [["EXAMPLE (delete)", dt.date(2026, 10, 7), "PRICE.SOLO; PRICE.PRACTICE; PRICE.FIRM",
                                    "BASE", "89; 229; 549", "116; 298; 714",
                                    "Higher ARR if conversion holds; elasticity unknown",
                                    "See Sensitivity sheet (generated)", "Price reaction in 20 discovery interviews",
                                    "Founder-consultant", "", ""]]
    for q, row in enumerate(rows):
        for j, v in enumerate(row, 1):
            c = wx.cell(row=5 + q, column=j, value=v)
            c.font = F_IN
            if j == 2:
                c.number_format = "yyyy-mm-dd"
    for j in range(1, 13):
        wx.column_dimensions[L(j)].width = 20

    # ------------------------------------------------------------------ calc sheets
    calc_rows = {}
    formula_text = []
    for cid in CASE_IDS:
        rows = build_calc(sheets[f"C_{cid}"], cid, E, ROWID, ECOL)
        calc_rows[cid] = rows
    R = calc_rows[CASE_IDS[0]]  # identical layout in every case sheet

    # ------------------------------------------------------------------ Checks
    build_checks(sheets["Checks"], R, VALID, REASON, ECOL, reason_row, IN_ROW0)

    # ------------------------------------------------------------------ Compare
    kpi_rows = build_compare(sheets["Compare"], R, E, VALID, REASON)

    # ------------------------------------------------------------------ Dashboard / Cohorts / Cash13w
    build_dashboard(sheets["Dashboard"], R, kpi_rows, E)
    build_cohorts(sheets["Cohorts"], R, E)
    build_cash13(sheets["Cash13w"], R, E, VALID)

    # ------------------------------------------------------------------ Sensitivity / Reports / History / Guide
    sv = sheets["Sensitivity"]
    sv["A1"] = "Sensitivity — generated by refresh_reports.py (values, not live formulas)"
    sv["A1"].font = F_T
    sv["A2"] = "Not yet generated. Run: python3 commercial/tools/refresh_reports.py"
    build_reports(sheets["Reports"], last_in, NCASE)
    hh = sheets["History_v0.1"]
    hh["A1"] = "History — v0.1 model summary (7 Oct 2026), values only; not a live input source"
    hh["A1"].font = F_T
    hist = keep["history"]
    if hist:
        for q, row in enumerate(hist):
            for j, v in enumerate(row, 1):
                if v is not None and not (q == 0 and j == 1 and str(v).startswith("History")):
                    hh.cell(row=3 + q, column=j, value=v)
    hh.column_dimensions["A"].width = 70
    build_guide(sheets["Guide"])

    # ------------------------------------------------------------------ trackers (preserved)
    for name, data in keep["trackers"].items():
        t = wb.create_sheet(name)
        for r, row in enumerate(data, 1):
            for c, v in enumerate(row, 1):
                if v is not None:
                    cell = t.cell(row=r, column=c, value=v)
                    cell.font = F_B if r in (1, 4) else F_TXT
        for c in range(1, (len(data[0]) if data else 1) + 1):
            t.column_dimensions[L(c)].width = 22

    # protection: formula sheets locked (no password), selector unlocked
    for n in ["Effective", "Checks", "Compare", "Cohorts", "Reports", "History_v0.1", "Guide"] + [f"C_{c}" for c in CASE_IDS]:
        protect(sheets[n])
    protect(sheets["Dashboard"], unlocked=("C3",))
    protect(sheets["Cash13w"])

    # fingerprint of model logic (formulas of calc + derived sheets)
    h = hashlib.sha256()
    for n in ["Effective", "Checks", "Compare", "Dashboard", "Cohorts", "Cash13w"] + [f"C_{c}" for c in CASE_IDS]:
        wsx = sheets[n]
        for row in wsx.iter_rows():
            for cell in row:
                if isinstance(cell.value, str) and cell.value.startswith("="):
                    h.update(f"{n}!{cell.coordinate}{cell.value}".encode())
    logic_fp = h.hexdigest()
    sheets["Reports"]["B5"] = logic_fp
    sheets["Reports"]["B6"] = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    wb.save(out_path)
    log["logic_fingerprint"] = logic_fp
    return log


# =========================================================================== calc sheet
def build_calc(ws, cid, E, ROWID, ECOL):
    ws["A1"] = f"Calculation — case {cid} (formulas only; identical in every case sheet)"
    ws["A1"].font = F_T
    ws["A2"] = ("Parameters are read from the Effective sheet (column for this case). Monthly lines use only earlier "
                "months for gates (no circular references). Customer cohorts: start month x billing term x offer; "
                "plan and channel are carried as expected-value mixes (documented simplification).")
    ws["A2"].alignment = WRAP
    ws.merge_cells("A2:L2")
    ws.row_dimensions[2].height = 30
    P = {}
    prow = [4]

    def par(key, label, formula, fmt=CUR):
        r = prow[0]
        prow[0] += 1
        P[key] = f"$C${r}"
        ws.cell(row=r, column=1, value=label).font = F_TXT
        ws.cell(row=r, column=2, value=key).font = F_TXT
        c = ws.cell(row=r, column=3, value=formula if str(formula).startswith("=") else f"={formula}")
        c.font = F_LINK
        c.number_format = fmt

    e = lambda aid: E(aid, cid)  # noqa: E731
    st = e("CAL.START")

    def mi(aid, blank=999):
        x = e(aid)
        return f'IF({x}="",{blank},(YEAR({x})-YEAR({st}))*12+MONTH({x})-MONTH({st})+1)'

    ws.cell(row=3, column=1, value="Parameters").font = F_B
    par("start", "Forecast start", st, "yyyy-mm-dd")
    par("horizon", "Horizon (months)", e("CAL.HORIZON"), "0")
    par("launch_m", "Launch month #", mi("CAL.LAUNCH"), "0")
    par("cutoff_m", "Actuals cutoff month # (0 = none)", mi("CAL.ACT_CUTOFF", 0), "0")
    par("mile_m", "Milestone month #", mi("CAL.MILESTONE"), "0")
    par("fx", "CAD per INR", e("CAL.FX_INR"), "0.00000")
    par("open_cad", "Opening cash (CAD)", f"{e('CASH.OPEN_INR')}*{P['fx']}")
    par("verified", "Opening cash verified (1/0)", e("CASH.OPEN_VERIFIED"), "0")
    par("floor", "Cash floor", e("CASH.FLOOR"))
    par("reserve_m", "Forward reserve months", e("CASH.RESERVE_M"), "0.0")
    par("fund_amt", "Funding amount", e("FUND.AMT"))
    par("fund_m", "Funding month # (999 = none)", mi("FUND.DATE"), "0")
    par("fund_net", "Funding net of fees", f"{P['fund_amt']}*(1-{e('FUND.FEE_PCT')})-IF({P['fund_amt']}>0,{e('FUND.FEE_FIXED')},0)")
    par("fund_legal", "Legal cost of round", e("FUND.LEGAL"))
    par("lead_m", "Fundraising lead time (months)", e("FUND.LEAD_M"), "0")
    par("bridge_amt", "Bridge amount", e("FUND.BRIDGE_AMT"))
    par("bridge_m", "Bridge month #", mi("FUND.BRIDGE_DATE"), "0")
    par("gov_amt", "Government cash", e("FUND.GOV_AMT"))
    par("gov_m", "Government cash month #", mi("FUND.GOV_DATE"), "0")
    par("pool", "Reachable unique practices (pool)",
        f"{e('MKT.RCIC_CANADA')}/{e('MKT.RCIC_PER_FIRM')}*{e('MKT.REACH_SHARE')}*{e('MKT.ADDRESSABLE')}", NUM1)
    arpa = (f"{e('PRICE.MIX_SOLO')}*({e('PRICE.SOLO')}+{e('PRICE.X_SOLO')}*{e('PRICE.EXTRA')})"
            f"+{e('PRICE.MIX_PRACTICE')}*({e('PRICE.PRACTICE')}+{e('PRICE.X_PRACTICE')}*{e('PRICE.EXTRA')})"
            f"+{e('PRICE.MIX_FIRM')}*({e('PRICE.FIRM')}+{e('PRICE.X_FIRM')}*{e('PRICE.EXTRA')})")
    par("arpa", "List MRR per new firm (plan-mix weighted)", arpa, CUR2)
    ref = (f"Inputs!$D${ROWID['PRICE.MIX_SOLO']}*(Inputs!$D${ROWID['PRICE.SOLO']}+Inputs!$D${ROWID['PRICE.X_SOLO']}*Inputs!$D${ROWID['PRICE.EXTRA']})"
           f"+Inputs!$D${ROWID['PRICE.MIX_PRACTICE']}*(Inputs!$D${ROWID['PRICE.PRACTICE']}+Inputs!$D${ROWID['PRICE.X_PRACTICE']}*Inputs!$D${ROWID['PRICE.EXTRA']})"
           f"+Inputs!$D${ROWID['PRICE.MIX_FIRM']}*(Inputs!$D${ROWID['PRICE.FIRM']}+Inputs!$D${ROWID['PRICE.X_FIRM']}*Inputs!$D${ROWID['PRICE.EXTRA']})")
    par("ref_arpa", "Reference list MRR per firm (shared default prices)", ref, CUR2)
    par("users_pf", "Users per firm (reporting)",
        f"{e('PRICE.MIX_SOLO')}*{e('PRICE.USERS_SOLO')}+{e('PRICE.MIX_PRACTICE')}*{e('PRICE.USERS_PRACTICE')}+{e('PRICE.MIX_FIRM')}*{e('PRICE.USERS_FIRM')}", NUM1)
    for k, aid in [("ad", "OFFER.ANNUAL_DISC"), ("as", "OFFER.ANNUAL_SHARE"), ("fd", "OFFER.FOUND_DISC"),
                   ("fdur", "OFFER.FOUND_DUR"), ("fa", "OFFER.FOUND_ANNUAL"), ("stack", "OFFER.STACK"),
                   ("found_cap", "OFFER.FOUND_CAP"), ("deposit", "OFFER.DEPOSIT"), ("late_share", "OFFER.LATE_REFUND_SHARE"),
                   ("mig_fee", "OFFER.MIG_FEE"), ("mig_attach", "OFFER.MIG_ATTACH"), ("ann_refund", "OFFER.ANNUAL_REFUND")]:
        par(k, aid, e(aid), "0.000")
    par("fa_found", "Founding annual price factor (stacking rule)",
        f"IF({P['stack']}=1,(1-{P['fd']})*(1-{P['ad']}),1-MAX({P['fd']},{P['ad']}))", "0.000")
    par("refund_dl_m", "Deposit refund deadline month #", mi("OFFER.REFUND_DEADLINE"), "0")
    for k, aid in [("ref_rate", "PART.REF_RATE"), ("ref_close", "PART.REF_CLOSE"), ("ref_credit", "PART.REF_CREDIT"),
                   ("ref_free", "PART.REF_FREE_MONTHS"), ("ref_lag", "PART.REF_RELEASE_LAG"), ("aff_opps", "PART.AFF_OPPS"),
                   ("aff_pct", "PART.AFF_PCT"), ("aff_months", "PART.AFF_MONTHS"), ("aff_lag", "PART.AFF_PAY_LAG")]:
        par(k, aid, e(aid), "0.000")
    par("aff_start_m", "Affiliate start month #", mi("PART.AFF_START"), "0")
    par("presale_m", "Pre-sale start month #", mi("SELL.PRESALE_START"), "0")
    for k, aid in [("pre_conv", "SELL.PRE_CONV"), ("found_rate", "SELL.FOUND_RATE"), ("founder_pool", "SELL.FOUNDER_POOL"),
                   ("founder_opps", "SELL.FOUNDER_OPPS"), ("comm_opps", "SELL.COMM_OPPS"), ("rep_opps", "SELL.REP_OPPS"),
                   ("close", "SELL.CLOSE"), ("lag", "SELL.LAG"), ("elast", "SELL.ELASTICITY"), ("hrs_opp", "SELL.HRS_PER_OPP"),
                   ("rep_hrs", "SELL.REP_HRS"), ("rep_ramp", "SELL.REP_RAMP")]:
        par(k, aid, e(aid), "0.000")
    par("close_eff", "Close rate after price elasticity",
        f"{P['close']}*MAX(0,1+{P['elast']}*({P['arpa']}/{P['ref_arpa']}-1)/0.1)", "0.000")
    par("pre_cap", "Founder pre-launch opportunity capacity / month", f"{e('SELL.FOUNDER_HRS_PRE')}*52/12/{P['hrs_opp']}", NUM1)
    par("f_post_hrs", "Founder selling hours / month after launch", f"{e('SELL.FOUNDER_HRS_POST')}*52/12", NUM1)
    for k, aid in [("onb_hrs", "ONB.HRS_PER_FIRM"), ("sup_hrs", "ONB.SUP_HRS"), ("cs_hrs", "ONB.CS_HRS"),
                   ("cs_ramp1", "ONB.CS_RAMP_FIRST"), ("activation", "ONB.ACTIVATION")]:
        par(k, aid, e(aid), "0.000")
    par("f_onb_hrs", "Founder onboarding/support hours / month", f"{e('ONB.FOUNDER_HRS')}*52/12", NUM1)
    for k, aid in [("churn", "RET.MONTHLY_CHURN"), ("nonrenew", "RET.ANNUAL_NONRENEW"), ("default", "RET.DEFAULT"),
                   ("lagshare", "RET.COLLECT_LAG")]:
        par(k, aid, e(aid), "0.0000")
    par("enet", "Net monthly expansion (expansion - contraction)", f"{e('RET.EXPANSION')}-{e('RET.CONTRACTION')}", "0.0000")
    for k, aid in [("prod", "COST.PRODUCT"), ("prod_cogs", "COST.PRODUCT_COGS"), ("cut_pct", "COST.PROD_CUT_PCT"),
                   ("founder_pay", "COST.FOUNDER_PAY"), ("content", "COST.CONTENT"), ("cfo", "COST.CFO"),
                   ("tools_base", "COST.TOOLS_BASE"), ("tools_head", "COST.TOOLS_HEAD"), ("tools_cogs", "COST.TOOLS_COGS"),
                   ("tools_sm", "COST.TOOLS_SM"), ("tools_ga", "COST.TOOLS_GA"), ("events", "COST.EVENTS"),
                   ("paid", "COST.PAID"), ("acct", "COST.ACCT"), ("var", "COST.VAR_FIRM"), ("card_pct", "COST.CARD_PCT"),
                   ("card_fixed", "COST.CARD_FIXED"), ("cont_pct", "COST.CONTINGENCY"), ("legal", "COST.LEGAL_SETUP"),
                   ("website", "COST.WEBSITE"), ("demo", "COST.DEMO"), ("ins", "COST.INSURANCE")]:
        par(k, aid, e(aid), CUR2)
    for k, aid in [("cut_m", "COST.PROD_CUT_DATE"), ("content_start_m", "COST.CONTENT_START"), ("content_end_m", "COST.CONTENT_END"),
                   ("cfo_start_m", "COST.CFO_START"), ("cfo_end_m", "COST.CFO_END"), ("events_start_m", "COST.EVENTS_START"),
                   ("paid_start_m", "COST.PAID_START"), ("legal_m", "COST.LEGAL_DATE"), ("website_m", "COST.WEBSITE_DATE"),
                   ("demo_m", "COST.DEMO_DATE"), ("ins_m", "COST.INSURANCE_START")]:
        par(k, aid + " month #", mi(aid), "0")
    for rid, *_ in S.ROLES:
        par(f"req_{rid}", f"ROLE.{rid}.REQ month #", mi(f"ROLE.{rid}.REQ"), "0")
        par(f"cost_{rid}", f"ROLE.{rid}.COST", e(f"ROLE.{rid}.COST"), CUR)
        for cls in ["COGS", "SM", "RD", "GA"]:
            par(f"{cls.lower()}_{rid}", f"ROLE.{rid}.{cls}", e(f"ROLE.{rid}.{cls}"), "0.00")
        par(f"ovr_{rid}", f"ROLE.{rid}.OVERRIDE", e(f"ROLE.{rid}.OVERRIDE"), "0")
    for k, aid in [("hire_mode", "HIRE.MODE"), ("cover_m", "HIRE.CASH_COVER_M"), ("cs1_found", "HIRE.CS1_FOUND"),
                   ("cs1_queue", "HIRE.CS1_QUEUE"), ("cs2_firms", "HIRE.CS2_FIRMS"), ("rep_min_close", "HIRE.REP_MIN_CLOSE"),
                   ("rep_max_payback", "HIRE.REP_MAX_PAYBACK"), ("rep_gm", "HIRE.REP_GM"), ("disc_gated", "HIRE.DISC_GATED"),
                   ("disc_cover", "HIRE.DISC_COVER_M")]:
        par(k, aid, e(aid), "0.00")
    par("mkt_earliest_m", "HIRE.MKT_EARLIEST month #", mi("HIRE.MKT_EARLIEST"), "0")
    par("rep_payback", "Sales rep payback test (months of gross profit)",
        f"IF({P['rep_opps']}*{P['close_eff']}*{P['arpa']}*{P['rep_gm']}>0,"
        f"({P['cost_REP1']}/({P['rep_opps']}*{P['close_eff']}))/({P['arpa']}*{P['rep_gm']}),999)", NUM1)
    par("disc_monthly", "Discretionary monthly spend (content + events + paid)",
        f"{P['content']}+{P['events']}+{P['paid']}")

    # ---------------- monthly block
    R = {}
    r0 = prow[0] + 2
    ws.cell(row=r0, column=1, value="Monthly lines").font = F_B
    ws.cell(row=r0, column=2, value="line ID").font = F_B
    ws.cell(row=r0, column=3, value="unit").font = F_B
    LINES = monthly_lines(P)
    rr = r0 + 1
    for item in LINES:
        if item[0] == "SEC":
            c = ws.cell(row=rr, column=1, value=item[1])
            c.font = F_B
            for j in range(1, FIRST_MCOL + S.MAX_MONTHS):
                ws.cell(row=rr, column=j).fill = FILL_SEC
            rr += 1
            continue
        R[item[0]] = rr
        ws.cell(row=rr, column=1, value=item[1]).font = F_TXT
        ws.cell(row=rr, column=2, value=item[0]).font = F_TXT
        ws.cell(row=rr, column=3, value=item[2]).font = F_TXT
        rr += 1
    for k in range(S.MAX_MONTHS):
        m = k + 1
        col = MCOLS[k]
        pcol = MCOLS[k - 1] if k >= 1 else None
        ppcol = MCOLS[k - 2] if k >= 2 else None
        ctx = Ctx(R, m, col, pcol, ppcol, P)
        for item in LINES:
            if item[0] == "SEC":
                continue
            key, label, unit, fmt, fn = item
            v = fn(ctx)
            cell = ws[f"{col}{R[key]}"]
            cell.value = v
            cell.number_format = fmt
            cell.font = F_TXT
    ws.column_dimensions["A"].width = 46
    ws.column_dimensions["B"].width = 16
    ws.column_dimensions["C"].width = 14
    for col in MCOLS:
        ws.column_dimensions[col].width = 11
    ws.freeze_panes = ws[f"D{r0 + 1}"]
    R["_P"] = P
    return R


class Ctx:
    def __init__(self, R, m, col, pcol, ppcol, P):
        self.R, self.m, self.col, self.pcol, self.ppcol, self.P = R, m, col, pcol, ppcol, P

    def c(self, key):
        return f"{self.col}{self.R[key]}"

    def p(self, key, default="0"):
        return f"{self.pcol}{self.R[key]}" if self.pcol else default

    def pp(self, key, default="0"):
        return f"{self.ppcol}{self.R[key]}" if self.ppcol else default

    def rng(self, key):  # expanding range month 1..current (avoids circular references)
        return f"$D${self.R[key]}:{self.col}{self.R[key]}"

    def idx(self, key, k_expr):
        return f"INDEX({self.rng(key)},1,{k_expr})"


def monthly_lines(P):
    """Each line: (key, label, unit, number format, fn(ctx) -> formula)."""
    Lz = []
    add = Lz.append
    SEC = lambda t: add(("SEC", t))  # noqa: E731

    def mexpr(x):
        return x.c("m")

    def AGE(x):
        return f"({x.c('m')}-{x.rng('m')})"

    def A1(x):
        a = AGE(x)
        return f"(({a}-1)*({a}>=1))"

    # survival / price-factor / expansion functions per contract type; ax is an age expression
    def S_m(ax):
        return f"POWER(1-{P['churn']},{ax})"

    def S_a(ax):
        return f"(1-{P['ann_refund']})*POWER(1-{P['nonrenew']},INT({ax}/12))"

    def X_m(ax):
        return f"POWER(1+{P['enet']},{ax})"

    def X_a(ax):
        return f"POWER(1+{P['enet']},12*INT({ax}/12))"

    def F_FM(ax):
        return f"(1-{P['fd']}*(({ax})<{P['fdur']}))"

    def F_FA(ax):
        return (f"((12*INT({ax}/12)<{P['fdur']})*{P['fa_found']}+(12*INT({ax}/12)>={P['fdur']})*(1-{P['ad']}))")

    def F_one(ax):
        return "1"

    def F_SA(ax):
        return f"(1-{P['ad']})"

    TYPES = {"FM": (S_m, X_m, F_FM, False), "FA": (S_a, X_a, F_FA, True),
             "SM": (S_m, X_m, F_one, False), "SA": (S_a, X_a, F_SA, True)}

    SEC("Timeline")
    add(("m", "Month number (index, not an assumption)", "#", "0", lambda x: x.m))
    add(("date", "Month", "date", MONTHFMT, lambda x: f"=EDATE({P['start']},{x.c('m')}-1)"))
    add(("active", "Within reported horizon (1/0)", "flag", "0", lambda x: f"=IF({x.c('m')}<={P['horizon']},1,0)"))
    add(("launched", "Launched (1/0)", "flag", "0", lambda x: f"=IF({x.c('m')}>={P['launch_m']},1,0)"))
    add(("actual", "Actual (closed) month (1/0)", "flag", "0", lambda x: f"=IF({x.c('m')}<={P['cutoff_m']},1,0)"))
    SEC("Actuals lookup (blank unless entered)")
    for key, mid in [("act_cash", "ACT.CASH_CLOSE"), ("act_new", "ACT.NEW_FIRMS"), ("act_active", "ACT.ACTIVE_FIRMS"),
                     ("act_mrr", "ACT.MRR"), ("act_rev", "ACT.REVENUE"), ("act_coll", "ACT.COLLECTIONS"),
                     ("act_costs", "ACT.COSTS")]:
        add((key, f"Actual {mid}", "value", CUR,
             lambda x, mid=mid: (f'=IF({x.c("actual")}=1,IFERROR(SUMIFS(Actuals!$D$6:$D$1005,Actuals!$B$6:$B$1005,{x.c("date")},'
                                 f'Actuals!$C$6:$C$1005,"{mid}")/COUNTIFS(Actuals!$B$6:$B$1005,{x.c("date")},Actuals!$C$6:$C$1005,"{mid}"),""),"")')))

    SEC("Hiring gates (use previous-month values only)")
    prq = {
        "CS1": lambda x: (f"=IF(OR({x.p('fcum')}>={P['cs1_found']},{x.p('fback')}+{x.p('sback')}>={P['cs1_queue']},"
                          f"{x.c('m')}>={P['launch_m']}),1,0)"),
        "CS2": lambda x: (f"=IF(AND({x.p('hired_CS1')}=1,OR(AND({x.p('onb_over')}=1,{x.pp('onb_over')}=1),"
                          f"{x.p('firms')}>={P['cs2_firms']})),1,0)"),
        "REP1": lambda x: (f"=IF(AND({x.p('overflow_f')}=1,{x.pp('overflow_f')}=1,{P['close_eff']}>={P['rep_min_close']},"
                           f"{P['rep_payback']}<={P['rep_max_payback']}),1,0)"),
        "REP2": lambda x: (f"=IF(AND({x.p('months_REP1')}>=6,{x.p('overflow_t')}=1,{x.pp('overflow_t')}=1,"
                           f"{P['close_eff']}>={P['rep_min_close']},{P['rep_payback']}<={P['rep_max_payback']}),1,0)"),
        "MKT": lambda x: f"=IF({x.c('m')}>={P['mkt_earliest_m']},1,0)",
    }
    for rid, rname, *_ in S.ROLES:
        add((f"prq_{rid}", f"{rid}: prerequisites met (forecast)", "flag", "0", prq[rid]))
        add((f"cashok_{rid}", f"{rid}: cash above floor covers {''}required months", "flag", "0",
             lambda x, rid=rid: f"=IF({x.p('cash_close', P['open_cad'])}-{P['floor']}>={P['cover_m']}*{P[f'cost_{rid}']},1,0)"))
        add((f"hired_{rid}", f"{rid}: in seat", "flag", "0",
             lambda x, rid=rid: (f"=IF({P[f'req_{rid}']}>=999,0,IF({P['hire_mode']}=1,IF({x.c('m')}>={P[f'req_{rid}']},1,0),"
                                 f"IF({x.p(f'hired_{rid}')}=1,1,IF(AND({x.c('m')}>={P[f'req_{rid}']},OR({P[f'ovr_{rid}']}=1,"
                                 f"AND({x.c(f'prq_{rid}')}=1,{x.c(f'cashok_{rid}')}=1))),1,0))))")))
        add((f"months_{rid}", f"{rid}: months in seat", "#", "0",
             lambda x, rid=rid: f"={x.p(f'months_{rid}')}+{x.c(f'hired_{rid}')}"))
    add(("rep_eff", "Effective sales reps (ramp-adjusted)", "FTE", NUM1,
         lambda x: (f"={x.c('hired_REP1')}*MIN(1,{x.c('months_REP1')}/{P['rep_ramp']})"
                    f"+{x.c('hired_REP2')}*MIN(1,{x.c('months_REP2')}/{P['rep_ramp']})")))
    add(("cs_eff", "Effective CS specialists (first-month ramp)", "FTE", NUM1,
         lambda x: (f"={x.c('hired_CS1')}*IF({x.c('months_CS1')}=1,{P['cs_ramp1']},1)"
                    f"+{x.c('hired_CS2')}*IF({x.c('months_CS2')}=1,{P['cs_ramp1']},1)")))
    add(("heads", "Commercial headcount incl. founder", "#", "0",
         lambda x: "=1+" + "+".join(x.c(f"hired_{rid}") for rid, *_ in S.ROLES)))

    SEC("Reachable pool and pre-launch founding commitments")
    add(("pool_open", "Reachable unique practices not yet worked (start)", "firms", NUM1,
         lambda x: f"={P['pool']}" if x.m == 1 else f"={x.p('pool_close')}"))
    add(("fpool_open", "Founder-network practices not yet worked (start)", "firms", NUM1,
         lambda x: f"={P['founder_pool']}" if x.m == 1 else f"={x.p('fpool_close')}"))
    add(("pre_demand", "Pre-launch conversations wanted", "per month", NUM1,
         lambda x: f"=IF(AND({x.c('m')}>={P['presale_m']},{x.c('m')}<{P['launch_m']}),{P['pre_conv']},0)"))
    add(("pre_worked", "Pre-launch conversations held (capacity and pool limited)", "per month", NUM1,
         lambda x: f"=MAX(0,MIN({x.c('pre_demand')},{P['pre_cap']},{x.c('fpool_open')},{x.c('pool_open')}))"))
    add(("fsign", "Founding commitments signed", "firms", NUM1,
         lambda x: f"=MAX(0,MIN({x.c('pre_worked')}*{P['found_rate']},{P['found_cap']}-{x.p('fcum')}))"))
    add(("fcum", "Founding commitments signed (cumulative)", "firms", NUM1,
         lambda x: f"={x.p('fcum')}+{x.c('fsign')}"))
    add(("late_flag", "Deposit refund deadline passed before launch (1/0)", "flag", "0",
         lambda x: f"=IF(AND({x.c('m')}={P['refund_dl_m']},{P['launch_m']}>{P['refund_dl_m']}),1,0)"))
    add(("fdrop", "Founding commitments refunded and lost", "firms", NUM1,
         lambda x: f"={x.c('late_flag')}*({x.p('fback')}+{x.c('fsign')})*{P['late_share']}"))

    SEC("Pipeline after launch (demand, capacity, pool)")
    add(("dem_founder", "Founder-network opportunities wanted", "per month", NUM1,
         lambda x: f"={x.c('launched')}*MAX(0,MIN({P['founder_opps']},{x.c('fpool_open')}-{x.c('pre_worked')}))"))
    add(("dem_comm", "Community, inbound, events opportunities wanted", "per month", NUM1,
         lambda x: f"={x.c('launched')}*{P['comm_opps']}"))
    add(("dem_rep", "Sales-rep-sourced opportunities wanted", "per month", NUM1,
         lambda x: f"={x.c('launched')}*{x.c('rep_eff')}*{P['rep_opps']}"))
    add(("dem_aff", "Affiliate opportunities", "per month", NUM1,
         lambda x: f"=IF({x.c('m')}>={P['aff_start_m']},{P['aff_opps']},0)*{x.c('launched')}"))
    add(("dem_ref", "Referral opportunities", "per month", NUM1,
         lambda x: f"={x.c('launched')}*{x.p('firms')}*{P['ref_rate']}"))
    add(("dem_total", "Opportunities wanted (all channels)", "per month", NUM1,
         lambda x: "=" + "+".join(x.c(k) for k in ["dem_founder", "dem_comm", "dem_rep", "dem_aff", "dem_ref"])))
    add(("cap_hrs", "Selling hours available (founder + ramped reps)", "hours", NUM1,
         lambda x: f"={x.c('launched')}*({P['f_post_hrs']}+{x.c('rep_eff')}*{P['rep_hrs']})"))
    add(("worked", "Opportunities worked (limited by hours and pool)", "per month", NUM1,
         lambda x: f"=MAX(0,MIN({x.c('dem_total')},{x.c('cap_hrs')}/{P['hrs_opp']},{x.c('pool_open')}-{x.c('pre_worked')}))"))
    add(("wf", "Share of wanted opportunities worked", "%", PCT,
         lambda x: f"=IF({x.c('dem_total')}>0,{x.c('worked')}/{x.c('dem_total')},0)"))
    for k, src in [("w_founder", "dem_founder"), ("w_comm", "dem_comm"), ("w_rep", "dem_rep"), ("w_aff", "dem_aff"),
                   ("w_ref", "dem_ref")]:
        add((k, f"Worked: {src[4:]}", "per month", NUM1, lambda x, src=src: f"={x.c(src)}*{x.c('wf')}"))
    add(("w_nonref", "Worked: non-referral", "per month", NUM1,
         lambda x: f"={x.c('w_founder')}+{x.c('w_comm')}+{x.c('w_rep')}+{x.c('w_aff')}"))
    add(("pool_close", "Reachable practices not yet worked (end)", "firms", NUM1,
         lambda x: f"={x.c('pool_open')}-{x.c('pre_worked')}-{x.c('worked')}"))
    add(("fpool_close", "Founder-network practices not yet worked (end)", "firms", NUM1,
         lambda x: f"={x.c('fpool_open')}-{x.c('pre_worked')}-{x.c('w_founder')}"))
    add(("overflow_f", "Founder selling hours exceeded (1/0)", "flag", "0",
         lambda x: f"=IF({x.c('launched')}*({x.c('dem_total')}-{x.c('dem_rep')})*{P['hrs_opp']}>{P['f_post_hrs']},1,0)"))
    add(("overflow_t", "All selling hours exceeded (1/0)", "flag", "0",
         lambda x: f"=IF({x.c('launched')}*{x.c('dem_total')}*{P['hrs_opp']}>{x.c('cap_hrs')}+1E-9,1,0)"))
    add(("closes_ref", "Referral closes", "firms", NUM1,
         lambda x: f"=IF({x.c('m')}-{P['lag']}>=1,{x.idx('w_ref', x.c('m') + '-' + P['lag'])}*{P['ref_close']},0)"))
    add(("closes_aff", "Affiliate closes", "firms", NUM1,
         lambda x: f"=IF({x.c('m')}-{P['lag']}>=1,{x.idx('w_aff', x.c('m') + '-' + P['lag'])}*{P['close_eff']},0)"))
    add(("closes", "Standard firms closed (contracted)", "firms", NUM1,
         lambda x: (f"=IF({x.c('m')}-{P['lag']}>=1,{x.idx('w_nonref', x.c('m') + '-' + P['lag'])}*{P['close_eff']},0)"
                    f"+{x.c('closes_ref')}")))
    add(("ref_share", "Referral share of standard closes", "%", PCT,
         lambda x: f"=IF({x.c('closes')}>0,{x.c('closes_ref')}/{x.c('closes')},0)"))
    add(("aff_share", "Affiliate share of standard closes", "%", PCT,
         lambda x: f"=IF({x.c('closes')}>0,{x.c('closes_aff')}/{x.c('closes')},0)"))

    SEC("Onboarding and support capacity")
    add(("sup_load", "Support hours needed by active firms", "hours", NUM1,
         lambda x: f"={x.p('firms')}*{P['sup_hrs']}"))
    add(("onb_hrs_avail", "Onboarding hours available after support", "hours", NUM1,
         lambda x: f"=MAX(0,{x.c('launched')}*({P['f_onb_hrs']}+{x.c('cs_eff')}*{P['cs_hrs']})-{x.c('sup_load')})"))
    add(("onb_cap", "Onboarding capacity", "firms", NUM1, lambda x: f"={x.c('onb_hrs_avail')}/{P['onb_hrs']}"))
    add(("f_avail", "Founding firms waiting", "firms", NUM1,
         lambda x: f"={x.p('fback')}+{x.c('fsign')}-{x.c('fdrop')}"))
    add(("fonb", "Founding firms onboarded", "firms", NUM1,
         lambda x: f"={x.c('launched')}*MIN({x.c('f_avail')},{x.c('onb_cap')})"))
    add(("fback", "Founding backlog (end)", "firms", NUM1, lambda x: f"={x.c('f_avail')}-{x.c('fonb')}"))
    add(("s_avail", "Standard firms waiting", "firms", NUM1, lambda x: f"={x.p('sback')}+{x.c('closes')}"))
    add(("sonb", "Standard firms onboarded", "firms", NUM1,
         lambda x: f"={x.c('launched')}*MAX(0,MIN({x.c('s_avail')},{x.c('onb_cap')}-{x.c('fonb')}))"))
    add(("sback", "Standard backlog (end)", "firms", NUM1, lambda x: f"={x.c('s_avail')}-{x.c('sonb')}"))
    add(("onb_over", "Onboarding demand above capacity (1/0)", "flag", "0",
         lambda x: f"=IF(AND({x.c('launched')}=1,{x.c('f_avail')}+{x.c('s_avail')}>{x.c('onb_cap')}+1E-9),1,0)"))

    SEC("New paying contracts by type (cohort starts)")
    add(("nfc_FM", "Forecast new: founding, monthly", "firms", NUM1,
         lambda x: f"={x.c('fonb')}*{P['activation']}*(1-{P['fa']})"))
    add(("nfc_FA", "Forecast new: founding, annual", "firms", NUM1,
         lambda x: f"={x.c('fonb')}*{P['activation']}*{P['fa']}"))
    add(("nfc_SM", "Forecast new: standard, monthly", "firms", NUM1,
         lambda x: f"={x.c('sonb')}*{P['activation']}*(1-{P['as']})"))
    add(("nfc_SA", "Forecast new: standard, annual", "firms", NUM1,
         lambda x: f"={x.c('sonb')}*{P['activation']}*{P['as']}"))
    add(("nfc_total", "Forecast new contracts", "firms", NUM1,
         lambda x: "=" + "+".join(x.c(f"nfc_{t}") for t in TYPES)))
    dshare = {"FM": "0", "FA": "0", "SM": f"(1-{P['as']})", "SA": P["as"]}
    for t in TYPES:
        add((f"N_{t}", f"New contracts used: {t} (actual where entered)", "firms", NUM1,
             lambda x, t=t: (f"=IF(AND({x.c('actual')}=1,ISNUMBER({x.c('act_new')})),{x.c('act_new')}*"
                             f"IF({x.c('nfc_total')}>0,{x.c(f'nfc_{t}')}/{x.c('nfc_total')},{dshare[t]}),{x.c(f'nfc_{t}')})")))
    add(("N_total", "New contracts (all types)", "firms", NUM1, lambda x: "=" + "+".join(x.c(f"N_{t}") for t in TYPES)))
    for t in ["SM", "SA"]:
        add((f"refN_{t}", f"Referred new contracts: {t}", "firms", NUM1, lambda x, t=t: f"={x.c(f'N_{t}')}*{x.c('ref_share')}"))
        add((f"affN_{t}", f"Affiliate-sourced new contracts: {t}", "firms", NUM1, lambda x, t=t: f"={x.c(f'N_{t}')}*{x.c('aff_share')}"))

    SEC("Cohort engine: active contracts and recurring revenue by type")
    for t, (Sf, Xf, Ff, annual) in TYPES.items():
        N = lambda x, t=t: x.rng(f"N_{t}")  # noqa: E731
        add((f"act_{t}", f"Active contracts {t}", "firms", NUM1,
             lambda x, t=t, Sf=Sf: f"=SUMPRODUCT({x.rng(f'N_{t}')}*{Sf(AGE(x))})"))
        add((f"mrr_{t}", f"MRR {t} (normalised monthly)", "CAD", CUR,
             lambda x, t=t, Sf=Sf, Xf=Xf, Ff=Ff: f"={P['arpa']}*SUMPRODUCT({x.rng(f'N_{t}')}*{Sf(AGE(x))}*{Ff(AGE(x))}*{Xf(AGE(x))})"))
        add((f"newmrr_{t}", f"New MRR {t}", "CAD", CUR,
             lambda x, t=t, Sf=Sf, Ff=Ff: f"={P['arpa']}*{x.c(f'N_{t}')}*{Sf('0')}*{Ff('0')}"))
        add((f"chf_{t}", f"Churned contracts {t}", "firms", NUM1,
             lambda x, t=t, Sf=Sf: f"=SUMPRODUCT({x.rng(f'N_{t}')}*({AGE(x)}>=1)*({Sf(A1(x))}-{Sf(AGE(x))}))"))
        add((f"chm_{t}", f"Churned MRR {t}", "CAD", CUR,
             lambda x, t=t, Sf=Sf, Xf=Xf, Ff=Ff: (f"={P['arpa']}*SUMPRODUCT({x.rng(f'N_{t}')}*({AGE(x)}>=1)*"
                                                  f"({Sf(A1(x))}-{Sf(AGE(x))})*{Ff(A1(x))}*{Xf(A1(x))})")))
        add((f"exm_{t}", f"Net expansion MRR {t}", "CAD", CUR,
             lambda x, t=t, Sf=Sf, Xf=Xf, Ff=Ff: (f"={P['arpa']}*SUMPRODUCT({x.rng(f'N_{t}')}*({AGE(x)}>=1)*"
                                                  f"{Sf(AGE(x))}*{Ff(A1(x))}*({Xf(AGE(x))}-{Xf(A1(x))}))")))
        add((f"xpm_{t}", f"Offer-expiry MRR uplift {t}", "CAD", CUR,
             lambda x, t=t, Sf=Sf, Xf=Xf, Ff=Ff: (f"={P['arpa']}*SUMPRODUCT({x.rng(f'N_{t}')}*({AGE(x)}>=1)*"
                                                  f"{Sf(AGE(x))}*({Ff(AGE(x))}-{Ff(A1(x))})*{Xf(AGE(x))})")))
        if annual:
            add((f"inv_{t}", f"Annual invoices {t} (new + renewals, gross)", "CAD", CUR,
                 lambda x, t=t, Sf=Sf, Xf=Xf, Ff=Ff: (f"=12*{P['arpa']}*({x.c(f'N_{t}')}*{Ff('0')}+SUMPRODUCT({x.rng(f'N_{t}')}*"
                                                      f"({AGE(x)}>=12)*(MOD({AGE(x)},12)=0)*{Sf(AGE(x))}*{Ff(AGE(x))}*{Xf(AGE(x))}))")))
            add((f"icnt_{t}", f"Annual invoices {t} (count)", "#", NUM1,
                 lambda x, t=t, Sf=Sf: (f"={x.c(f'N_{t}')}+SUMPRODUCT({x.rng(f'N_{t}')}*({AGE(x)}>=12)*"
                                        f"(MOD({AGE(x)},12)=0)*{Sf(AGE(x))})")))
            add((f"rfd_{t}", f"Refunds under 30-day guarantee {t}", "CAD", CUR,
                 lambda x, t=t, Ff=Ff: f"=12*{P['arpa']}*{x.c(f'N_{t}')}*{P['ann_refund']}*{Ff('0')}"))
            add((f"defx_{t}", f"Deferred revenue {t} (independent closed form)", "CAD", CUR,
                 lambda x, t=t, Sf=Sf, Xf=Xf, Ff=Ff: (f"={P['arpa']}*SUMPRODUCT({x.rng(f'N_{t}')}*{Sf(AGE(x))}*{Ff(AGE(x))}*"
                                                      f"{Xf(AGE(x))}*(11-MOD({AGE(x)},12)))")))

    SEC("Customers and recurring revenue (totals)")
    add(("firms", "Active paying firms (expected value)", "firms", NUM1, lambda x: "=" + "+".join(x.c(f"act_{t}") for t in TYPES)))
    add(("new_act", "New activated contracts (after annual refunds)", "firms", NUM1,
         lambda x: f"={x.c('N_FM')}+{x.c('N_SM')}+({x.c('N_FA')}+{x.c('N_SA')})*(1-{P['ann_refund']})"))
    add(("churn_firms", "Contracts ended", "firms", NUM1, lambda x: "=" + "+".join(x.c(f"chf_{t}") for t in TYPES)))
    add(("users", "Active users (derived)", "users", NUM1, lambda x: f"={x.c('firms')}*{P['users_pf']}"))
    add(("mrr", "MRR — normalised recurring run rate", "CAD", CUR, lambda x: "=" + "+".join(x.c(f"mrr_{t}") for t in TYPES)))
    add(("arr", "ARR run rate = 12 x MRR (not revenue earned)", "CAD", CUR, lambda x: f"=12*{x.c('mrr')}"))
    add(("new_mrr", "MRR movement: new", "CAD", CUR, lambda x: "=" + "+".join(x.c(f"newmrr_{t}") for t in TYPES)))
    add(("exp_mrr", "MRR movement: net expansion (expansion - contraction)", "CAD", CUR,
         lambda x: "=" + "+".join(x.c(f"exm_{t}") for t in TYPES)))
    add(("xp_mrr", "MRR movement: founding-offer expiry uplift", "CAD", CUR,
         lambda x: "=" + "+".join(x.c(f"xpm_{t}") for t in TYPES)))
    add(("ch_mrr", "MRR movement: churn", "CAD", CUR, lambda x: "=" + "+".join(x.c(f"chm_{t}") for t in TYPES)))
    add(("mrr_annual", "MRR from annual contracts", "CAD", CUR, lambda x: f"={x.c('mrr_FA')}+{x.c('mrr_SA')}"))

    SEC("Invoices, credits, deposits and collections")
    add(("inv_month", "Monthly invoices (gross)", "CAD", CUR, lambda x: f"={x.c('mrr_FM')}+{x.c('mrr_SM')}"))
    add(("inv_annual", "Annual invoices (gross)", "CAD", CUR, lambda x: f"={x.c('inv_FA')}+{x.c('inv_SA')}"))
    add(("refunds", "Refunds paid (annual 30-day guarantee)", "CAD", CUR, lambda x: f"={x.c('rfd_FA')}+{x.c('rfd_SA')}"))
    add(("mig_rev", "Assisted migration fees (eligible: standard monthly only)", "CAD", CUR,
         lambda x: f"={x.c('N_SM')}*{P['mig_attach']}*{P['mig_fee']}"))
    add(("inv_total", "Invoices total", "CAD", CUR, lambda x: f"={x.c('inv_month')}+{x.c('inv_annual')}+{x.c('mig_rev')}"))
    add(("dep_recv", "Founding deposits received", "CAD", CUR, lambda x: f"={x.c('fsign')}*{P['deposit']}"))
    add(("dep_refund", "Founding deposits refunded (late launch)", "CAD", CUR, lambda x: f"={x.c('fdrop')}*{P['deposit']}"))
    add(("dep_apply", "Deposits applied to founding invoices", "CAD", CUR,
         lambda x: (f"=MAX(0,MIN({x.p('dep_bal')}+{x.c('dep_recv')}-{x.c('dep_refund')},"
                    f"{x.c('mrr_FM')}+{x.c('inv_FA')}))")))
    add(("dep_bal", "Deposit liability (end)", "CAD", CUR,
         lambda x: f"={x.p('dep_bal')}+{x.c('dep_recv')}-{x.c('dep_refund')}-{x.c('dep_apply')}"))
    add(("rcm_issue", "Referee free-month credit issued (monthly)", "CAD", CUR,
         lambda x: f"={x.c('refN_SM')}*{P['arpa']}*{P['ref_free']}"))
    add(("rcm_apply", "Referee credit applied (monthly)", "CAD", CUR,
         lambda x: f"=MAX(0,MIN({x.p('rcm_bal')}+{x.c('rcm_issue')},{x.c('mrr_SM')}))"))
    add(("rcm_bal", "Referee credit liability, monthly (end)", "CAD", CUR,
         lambda x: f"={x.p('rcm_bal')}+{x.c('rcm_issue')}-{x.c('rcm_apply')}"))
    add(("rca_issue", "Referee extra-month credit issued (annual)", "CAD", CUR,
         lambda x: f"={x.c('refN_SA')}*(1-{P['ann_refund']})*{P['arpa']}*(1-{P['ad']})*{P['ref_free']}"))
    add(("rca_apply", "Referee credit applied at first renewal (annual)", "CAD", CUR,
         lambda x: f"=IF({x.c('m')}>12,{x.idx('rca_issue', x.c('m') + '-12')}*(1-{P['nonrenew']}),0)"))
    add(("rca_expire", "Referee credit expired (annual non-renewal)", "CAD", CUR,
         lambda x: f"=IF({x.c('m')}>12,{x.idx('rca_issue', x.c('m') + '-12')}*{P['nonrenew']},0)"))
    add(("rca_bal", "Referee credit liability, annual (end)", "CAD", CUR,
         lambda x: f"={x.p('rca_bal')}+{x.c('rca_issue')}-{x.c('rca_apply')}-{x.c('rca_expire')}"))
    add(("rr_release", "Referrer credits earned (after referee paid the release period)", "CAD", CUR,
         lambda x: (f"=IF({x.c('m')}-{P['ref_lag']}>=1,({x.idx('refN_SM', x.c('m') + '-' + P['ref_lag'])}*POWER(1-{P['churn']},{P['ref_lag']})"
                    f"+{x.idx('refN_SA', x.c('m') + '-' + P['ref_lag'])}*(1-{P['ann_refund']}))*{P['ref_credit']},0)")))
    add(("oth_credit", "Deposits and referee credits applied", "CAD", CUR,
         lambda x: f"={x.c('dep_apply')}+{x.c('rcm_apply')}+{x.c('rca_apply')}"))
    add(("rr_apply", "Referrer credits applied to invoices", "CAD", CUR,
         lambda x: f"=MAX(0,MIN({x.p('rr_bal')}+{x.c('rr_release')},{x.c('inv_month')}+{x.c('inv_annual')}-{x.c('oth_credit')}))"))
    add(("rr_bal", "Referrer credit liability (end)", "CAD", CUR,
         lambda x: f"={x.p('rr_bal')}+{x.c('rr_release')}-{x.c('rr_apply')}"))
    add(("credits", "All credits applied to invoices", "CAD", CUR, lambda x: f"={x.c('oth_credit')}+{x.c('rr_apply')}"))
    add(("billable", "Net amount billed (invoices - credits)", "CAD", CUR, lambda x: f"={x.c('inv_total')}-{x.c('credits')}"))
    add(("collections", "Cash collected from customers", "CAD", CUR,
         lambda x: (f"={x.c('billable')}*(1-{P['default']})*(1-{P['lagshare']})"
                    f"+{x.p('billable')}*(1-{P['default']})*{P['lagshare']}")))
    add(("bad_debt", "Bad debt (never collected)", "CAD", CUR, lambda x: f"={x.c('billable')}*{P['default']}"))
    add(("ar", "Receivables (end)", "CAD", CUR,
         lambda x: f"={x.p('ar')}+{x.c('billable')}-{x.c('collections')}-{x.c('bad_debt')}"))
    add(("deferred", "Deferred revenue, annual contracts (roll-forward)", "CAD", CUR,
         lambda x: f"={x.p('deferred')}+{x.c('inv_annual')}-{x.c('refunds')}-{x.c('mrr_annual')}"))
    add(("aff_accr", "Affiliate commission earned (on first-period collections)", "CAD", CUR,
         lambda x: (f"={P['aff_pct']}*({P['arpa']}*SUMPRODUCT({x.rng('affN_SM')}*({AGE(x)}<{P['aff_months']})*{S_m(AGE(x))}*{X_m(AGE(x))})"
                    f"*(1-{P['default']})+{x.c('affN_SA')}*(1-{P['ann_refund']})*12*{P['arpa']}*(1-{P['ad']})*MIN(12,{P['aff_months']})/12)")))
    add(("aff_paid", "Affiliate commission paid", "CAD", CUR,
         lambda x: f"=IF({x.c('m')}-{P['aff_lag']}>=1,{x.idx('aff_accr', x.c('m') + '-' + P['aff_lag'])},0)"))
    add(("aff_bal", "Affiliate commission payable (end)", "CAD", CUR,
         lambda x: f"={x.p('aff_bal')}+{x.c('aff_accr')}-{x.c('aff_paid')}"))

    SEC("Revenue earned (accrual)")
    add(("contra", "Free-month credits applied (contra revenue)", "CAD", CUR,
         lambda x: f"={x.c('rcm_apply')}+{x.c('rca_apply')}"))
    add(("rev_sub", "Subscription revenue earned", "CAD", CUR, lambda x: f"={x.c('mrr')}-{x.c('contra')}"))
    add(("revenue", "Total revenue earned (subscription + migration)", "CAD", CUR,
         lambda x: f"={x.c('rev_sub')}+{x.c('mig_rev')}"))

    SEC("Costs")
    add(("disc_ok", "Discretionary spend allowed this month (1/0)", "flag", "0",
         lambda x: (f"=IF({P['disc_gated']}=0,1,IF({x.p('cash_close', P['open_cad'])}-{P['floor']}>="
                    f"{P['disc_cover']}*{P['disc_monthly']},1,0))")))
    add(("prod_cost", "Product and engineering team", "CAD", CUR,
         lambda x: f"={P['prod']}*(1-IF({x.c('m')}>={P['cut_m']},{P['cut_pct']},0))"))
    add(("founder_cost", "Founder pay", "CAD", CUR, lambda x: f"={P['founder_pay']}"))
    for rid, *_ in S.ROLES:
        add((f"cost_{rid}", f"Staff: {rid}", "CAD", CUR, lambda x, rid=rid: f"={x.c(f'hired_{rid}')}*{P[f'cost_{rid}']}"))
    add(("staff", "Commercial staff total", "CAD", CUR, lambda x: "=" + "+".join(x.c(f"cost_{rid}") for rid, *_ in S.ROLES)))
    add(("content_cost", "Content contractor", "CAD", CUR,
         lambda x: f"=IF(AND({x.c('m')}>={P['content_start_m']},{x.c('m')}<={P['content_end_m']}),{P['content']},0)*{x.c('disc_ok')}"))
    add(("cfo_cost", "Fractional CFO", "CAD", CUR,
         lambda x: f"=IF(AND({x.c('m')}>={P['cfo_start_m']},{x.c('m')}<={P['cfo_end_m']}),{P['cfo']},0)"))
    add(("tools_cost", "Tools", "CAD", CUR, lambda x: f"={P['tools_base']}+{P['tools_head']}*{x.c('heads')}"))
    add(("events_cost", "Events and community", "CAD", CUR,
         lambda x: f"=IF({x.c('m')}>={P['events_start_m']},{P['events']},0)*{x.c('disc_ok')}"))
    add(("paid_cost", "Paid acquisition tests", "CAD", CUR,
         lambda x: f"=IF({x.c('m')}>={P['paid_start_m']},{P['paid']},0)*{x.c('disc_ok')}"))
    add(("legal_cost", "Legal set-up (one-time)", "CAD", CUR, lambda x: f"=IF({x.c('m')}={P['legal_m']},{P['legal']},0)"))
    add(("website_cost", "Website correction (one-time)", "CAD", CUR, lambda x: f"=IF({x.c('m')}={P['website_m']},{P['website']},0)"))
    add(("demo_cost", "Demo assets (one-time)", "CAD", CUR,
         lambda x: f"=IF({x.c('m')}={P['demo_m']},{P['demo']},0)*{x.c('disc_ok')}"))
    add(("ins_cost", "Insurance premium (annual)", "CAD", CUR,
         lambda x: f"=IF(AND({x.c('m')}>={P['ins_m']},MOD({x.c('m')}-{P['ins_m']},12)=0),{P['ins']},0)"))
    add(("raise_legal", "Legal cost of funding round", "CAD", CUR,
         lambda x: f"=IF(AND({x.c('m')}={P['fund_m']},{P['fund_amt']}>0),{P['fund_legal']},0)"))
    add(("acct_cost", "Accountant and bookkeeping", "CAD", CUR, lambda x: f"={P['acct']}"))
    add(("var_cost", "Variable delivery cost (active firms)", "CAD", CUR, lambda x: f"={x.c('firms')}*{P['var']}"))
    add(("card_fees", "Card and billing fees", "CAD", CUR,
         lambda x: (f"={x.c('collections')}*{P['card_pct']}+({x.c('act_FM')}+{x.c('act_SM')}+{x.c('icnt_FA')}+{x.c('icnt_SA')})"
                    f"*{P['card_fixed']}")))
    add(("contingency", "Contingency", "CAD", CUR,
         lambda x: (f"={P['cont_pct']}*(" + "+".join(x.c(k) for k in ["staff", "content_cost", "cfo_cost", "tools_cost",
                                                                          "events_cost", "paid_cost", "legal_cost", "website_cost",
                                                                          "demo_cost", "ins_cost", "raise_legal", "acct_cost"]) + ")")))
    add(("items_total", "Total costs (sum of items, independent of classification)", "CAD", CUR,
         lambda x: "=" + "+".join(x.c(k) for k in ["prod_cost", "founder_cost", "staff", "content_cost", "cfo_cost", "tools_cost",
                                                   "events_cost", "paid_cost", "legal_cost", "website_cost", "demo_cost",
                                                   "ins_cost", "raise_legal", "acct_cost", "var_cost", "card_fees", "bad_debt",
                                                   "contingency", "rr_release", "aff_accr"])))
    rolesum = lambda x, cls: "+".join(f"{x.c(f'cost_{rid}')}*{P[f'{cls}_{rid}']}" for rid, *_ in S.ROLES)  # noqa: E731
    add(("cogs", "Cost of service delivery (COGS)", "CAD", CUR,
         lambda x: (f"={x.c('prod_cost')}*{P['prod_cogs']}+{x.c('var_cost')}+{x.c('card_fees')}+{rolesum(x, 'cogs')}"
                    f"+{x.c('tools_cost')}*{P['tools_cogs']}")))
    add(("sm", "Sales and marketing (acquisition)", "CAD", CUR,
         lambda x: (f"={rolesum(x, 'sm')}+{x.c('content_cost')}+{x.c('events_cost')}+{x.c('paid_cost')}+{x.c('website_cost')}"
                    f"+{x.c('demo_cost')}+{x.c('tools_cost')}*{P['tools_sm']}+{x.c('rr_release')}+{x.c('aff_accr')}")))
    add(("rd", "Product development (R&D)", "CAD", CUR,
         lambda x: f"={x.c('prod_cost')}*(1-{P['prod_cogs']})+{rolesum(x, 'rd')}"))
    add(("ga", "Administration and fundraising (G&A)", "CAD", CUR,
         lambda x: (f"={rolesum(x, 'ga')}+{x.c('founder_cost')}+{x.c('cfo_cost')}+{x.c('legal_cost')}+{x.c('ins_cost')}"
                    f"+{x.c('raise_legal')}+{x.c('acct_cost')}+{x.c('tools_cost')}*{P['tools_ga']}+{x.c('bad_debt')}"
                    f"+{x.c('contingency')}")))
    add(("total_costs", "Total costs (classified)", "CAD", CUR,
         lambda x: f"={x.c('cogs')}+{x.c('sm')}+{x.c('rd')}+{x.c('ga')}"))
    add(("gross_profit", "Gross profit (revenue - COGS)", "CAD", CUR, lambda x: f"={x.c('revenue')}-{x.c('cogs')}"))
    add(("contribution", "Contribution after sales and marketing", "CAD", CUR,
         lambda x: f"={x.c('gross_profit')}-{x.c('sm')}"))
    add(("op_result", "Operating result", "CAD", CUR, lambda x: f"={x.c('contribution')}-{x.c('rd')}-{x.c('ga')}"))

    SEC("Cash")
    add(("cash_costs", "Costs paid in cash this month", "CAD", CUR,
         lambda x: f"={x.c('total_costs')}-{x.c('rr_release')}-{x.c('aff_accr')}+{x.c('aff_paid')}-{x.c('bad_debt')}"))
    add(("ocf", "Operating cash flow", "CAD", CUR,
         lambda x: (f"={x.c('collections')}+{x.c('dep_recv')}-{x.c('dep_refund')}-{x.c('refunds')}-{x.c('cash_costs')}")))
    add(("financing", "Financing received (end of month)", "CAD", CUR,
         lambda x: (f"=IF({x.c('m')}={P['fund_m']},{P['fund_net']},0)+IF({x.c('m')}={P['bridge_m']},{P['bridge_amt']},0)"
                    f"+IF({x.c('m')}={P['gov_m']},{P['gov_amt']},0)")))
    add(("cash_open", "Cash at start of month", "CAD", CUR,
         lambda x: f"={P['open_cad']}" if x.m == 1 else f"={x.p('cash_close')}"))
    add(("cash_close_fc", "Cash at month end (forecast roll-forward)", "CAD", CUR,
         lambda x: f"={x.c('cash_open')}+{x.c('ocf')}+{x.c('financing')}"))
    add(("cash_close", "Cash at month end (actual where entered)", "CAD", CUR,
         lambda x: f"=IF(AND({x.c('actual')}=1,ISNUMBER({x.c('act_cash')})),{x.c('act_cash')},{x.c('cash_close_fc')})"))
    add(("intra_low", "Lowest cash within month (financing arrives at month end)", "CAD", CUR,
         lambda x: f"={x.c('cash_open')}+MIN(0,{x.c('ocf')})"))
    add(("below_floor", "Within-month cash below floor (1/0)", "flag", "0",
         lambda x: f"=IF({x.c('intra_low')}<{P['floor']},1,0)"))
    add(("below_zero", "Within-month cash below zero (1/0)", "flag", "0", lambda x: f"=IF({x.c('intra_low')}<0,1,0)"))
    add(("ocf_nf", "Operating cash flow excluding the round's legal cost", "CAD", CUR,
         lambda x: f"={x.c('ocf')}+{x.c('raise_legal')}"))
    add(("cash_nf", "Cash at month end, same plan with no financing", "CAD", CUR,
         lambda x: (f"={P['open_cad']}+{x.c('ocf_nf')}" if x.m == 1 else f"={x.p('cash_nf')}+{x.c('ocf_nf')}")))
    add(("intra_nf", "Lowest cash within month, no financing", "CAD", CUR,
         lambda x: (f"={P['open_cad']}+MIN(0,{x.c('ocf_nf')})" if x.m == 1 else f"={x.p('cash_nf')}+MIN(0,{x.c('ocf_nf')})")))
    add(("below_floor_nf", "No-financing cash below floor (1/0)", "flag", "0",
         lambda x: f"=IF({x.c('intra_nf')}<{P['floor']},1,0)"))

    SEC("Reporting (actual where entered, otherwise forecast)")
    add(("status", "Actual or forecast", "text", "General",
         lambda x: f'=IF({x.c("actual")}=1,"Actual","Forecast")'))
    for key, act, fc in [("rep_new", "act_new", "new_act"), ("rep_firms", "act_active", "firms"), ("rep_mrr", "act_mrr", "mrr"),
                         ("rep_rev", "act_rev", "revenue"), ("rep_coll", "act_coll", "collections"),
                         ("rep_costs", "act_costs", "total_costs")]:
        add((key, f"Reported {fc}", "value", CUR,
             lambda x, act=act, fc=fc: f"=IF(AND({x.c('actual')}=1,ISNUMBER({x.c(act)})),{x.c(act)},{x.c(fc)})"))
    add(("rep_arr", "Reported ARR run rate (12 x reported MRR)", "CAD", CUR, lambda x: f"=12*{x.c('rep_mrr')}"))

    SEC("Retention (forecast; assumption-driven, not observed)")
    add(("logo_ret", "Logo retention this month", "%", PCT,
         lambda x: f'=IF({x.p("firms")}>0,({x.p("firms")}-{x.c("churn_firms")})/{x.p("firms")},"")'))
    add(("grr", "Gross revenue retention this month", "%", PCT,
         lambda x: f'=IF({x.p("mrr")}>0,({x.p("mrr")}-{x.c("ch_mrr")})/{x.p("mrr")},"")'))
    add(("nrr", "Net revenue retention this month", "%", PCT,
         lambda x: (f'=IF({x.p("mrr")}>0,({x.p("mrr")}-{x.c("ch_mrr")}+{x.c("exp_mrr")}+{x.c("xp_mrr")})/{x.p("mrr")},"")')))
    add(("sales_util", "Selling hours wanted / available", "ratio", "0.00",
         lambda x: f'=IF({x.c("cap_hrs")}>0,{x.c("dem_total")}*{P["hrs_opp"]}/{x.c("cap_hrs")},"")'))
    add(("onb_util", "Onboarding demand / capacity", "ratio", "0.00",
         lambda x: f'=IF({x.c("onb_cap")}>0,({x.c("f_avail")}+{x.c("s_avail")})/{x.c("onb_cap")},"")'))
    return Lz


# =========================================================================== Checks
def build_checks(ws, R, VALID, REASON, ECOL, reason_row, IN_ROW0):
    ws["A1"] = "Model checks — independent invariants (one-way diagnostics; never feed business calculations)"
    ws["A1"].font = F_T
    ws["A2"] = ("Each check recomputes a quantity by a different path and compares within a tolerance over the reported "
                "horizon. FAIL means the numbers must not be used until fixed. Input validation is shown separately.")
    ws["A2"].alignment = WRAP
    ws.merge_cells("A2:I2")
    ws.row_dimensions[2].height = 30
    ws.cell(row=4, column=1, value="Check")
    ws.cell(row=4, column=2, value="Tolerance")
    for k, cid in enumerate(CASE_IDS):
        ws.cell(row=4, column=3 + k, value=cid)
    style_header(ws, 4, 2 + NCASE)
    rng = lambda cid, key: f"C_{cid}!$D${R[key]}:${LASTM}${R[key]}"  # noqa: E731
    cur2 = lambda cid, key: f"C_{cid}!$E${R[key]}:${LASTM}${R[key]}"  # noqa: E731  months 2..60
    prv2 = lambda cid, key: f"C_{cid}!$D${R[key]}:${L(FIRST_MCOL + S.MAX_MONTHS - 2)}${R[key]}"  # noqa: E731  months 1..59
    one = lambda cid, key: f"C_{cid}!$D${R[key]}"  # noqa: E731  month 1
    act = lambda cid: rng(cid, "active")  # noqa: E731
    act2 = lambda cid: cur2(cid, "active")  # noqa: E731
    fc = lambda cid: f"(1-{rng(cid, 'actual')})"  # noqa: E731
    P = R["_P"]
    checks = [
        ("Customers: active(m) = active(m-1) + new activated - ended", 1e-6,
         lambda c: (f"ABS({one(c, 'firms')}-{one(c, 'new_act')}+{one(c, 'churn_firms')})+"
                    f"SUMPRODUCT({act2(c)}*ABS({cur2(c, 'firms')}-{prv2(c, 'firms')}-{cur2(c, 'new_act')}+{cur2(c, 'churn_firms')}))")),
        ("MRR movement: closing = opening + new + net expansion + offer expiry - churn", 0.01,
         lambda c: (f"ABS({one(c, 'mrr')}-{one(c, 'new_mrr')}-{one(c, 'exp_mrr')}-{one(c, 'xp_mrr')}+{one(c, 'ch_mrr')})+"
                    f"SUMPRODUCT({act2(c)}*ABS({cur2(c, 'mrr')}-{prv2(c, 'mrr')}-{cur2(c, 'new_mrr')}-{cur2(c, 'exp_mrr')}"
                    f"-{cur2(c, 'xp_mrr')}+{cur2(c, 'ch_mrr')}))")),
        ("ARR identity: ARR = 12 x sum of MRR by contract type", 0.01,
         lambda c: (f"SUMPRODUCT({act(c)}*ABS({rng(c, 'arr')}-12*({rng(c, 'mrr_FM')}+{rng(c, 'mrr_FA')}+{rng(c, 'mrr_SM')}"
                    f"+{rng(c, 'mrr_SA')})))")),
        ("Deferred revenue: roll-forward = independent closed form", 0.05,
         lambda c: f"SUMPRODUCT({act(c)}*ABS({rng(c, 'deferred')}-{rng(c, 'defx_FA')}-{rng(c, 'defx_SA')}))"),
        ("Receivables: balance = uncollected share of this month's net billing", 0.01,
         lambda c: (f"SUMPRODUCT({act(c)}*ABS({rng(c, 'ar')}-{rng(c, 'billable')}*(1-C_{c}!{P['default']})*C_{c}!{P['lagshare']}))")),
        ("Deposits: received - refunded - applied = closing liability", 0.01,
         lambda c: (f"ABS(SUMPRODUCT({act(c)}*({rng(c, 'dep_recv')}-{rng(c, 'dep_refund')}-{rng(c, 'dep_apply')}))"
                    f"-INDEX({rng(c, 'dep_bal')},1,C_{c}!{P['horizon']}))")),
        ("No negative balances or receipts (deposits, credits, payables, billing, collections)", 0.01,
         lambda c: ("-MIN(0," + ",".join(f"MIN({rng(c, k)})" for k in ["dep_bal", "rcm_bal", "rca_bal", "rr_bal", "aff_bal",
                                                                         "billable", "collections", "deferred", "ar"]) + ")")),
        ("Costs: classified total (COGS + S&M + R&D + G&A) = sum of cost items", 0.01,
         lambda c: f"SUMPRODUCT({act(c)}*ABS({rng(c, 'total_costs')}-{rng(c, 'items_total')}))"),
        ("Cash: forecast closing = opening + operating cash flow + financing", 0.01,
         lambda c: (f"SUMPRODUCT({act(c)}*{fc(c)}*ABS({rng(c, 'cash_close')}-{rng(c, 'cash_open')}-{rng(c, 'ocf')}"
                    f"-{rng(c, 'financing')}))")),
        ("Cash (whole period, no actuals): end = opening + sum of flows", 0.05,
         lambda c: (f"IF(C_{c}!{P['cutoff_m']}>0,0,ABS(INDEX({rng(c, 'cash_close')},1,C_{c}!{P['horizon']})-C_{c}!{P['open_cad']}"
                    f"-SUMPRODUCT({act(c)}*({rng(c, 'ocf')}+{rng(c, 'financing')}))))")),
    ]
    CHK = {}
    for q, (label, tol, fn) in enumerate(checks):
        r = 5 + q
        ws.cell(row=r, column=1, value=label).alignment = WRAP
        ws.cell(row=r, column=2, value=tol)
        for k, cid in enumerate(CASE_IDS):
            ws.cell(row=r, column=3 + k, value=f'=IFERROR(IF({fn(cid)}<=$B{r},"PASS","FAIL"),"N/A (invalid inputs)")')
    rv = 5 + len(checks)
    ws.cell(row=rv, column=1, value="Inputs valid for cash outputs (validation and rules)")
    for k, cid in enumerate(CASE_IDS):
        ws.cell(row=rv, column=3 + k, value=f'=IF({VALID("cash", cid)},"PASS","FAIL")')
    ws.cell(row=rv + 1, column=1, value="First invalid inputs or failed rules")
    for k, cid in enumerate(CASE_IDS):
        ws.cell(row=rv + 1, column=3 + k, value=f"={REASON(cid)}")
        ws.cell(row=rv + 1, column=3 + k).alignment = WRAP
    ws.cell(row=rv + 3, column=1, value="Overall model status").font = F_B
    for k, cid in enumerate(CASE_IDS):
        col = L(3 + k)
        ws.cell(row=rv + 3, column=3 + k,
                value=(f'=IF(COUNTIF({col}5:{col}{rv},"FAIL")>0,"FAIL — do not use",IF(COUNTIF({col}5:{col}{rv},"N/A*")>0,'
                       f'"N/A — invalid inputs","PASS"))'))
        ws.cell(row=rv + 3, column=3 + k).font = F_B
    ws.column_dimensions["A"].width = 70
    for k in range(NCASE):
        ws.column_dimensions[L(3 + k)].width = 18
    ws.row_dimensions[rv + 1].height = 60
    R["_chk_overall_row"] = rv + 3


# =========================================================================== Compare (KPIs for all cases)
def build_compare(ws, R, E, VALID, REASON):
    ws["A1"] = "Compare — key results by case (live formulas; forecast unless marked actual)"
    ws["A1"].font = F_T
    ws["A2"] = ("All amounts CAD. 'Expected value' customers may be fractional; whole-firm targets are rounded down. "
                "N/A + reason appears when inputs for that output are invalid or the metric has no valid base.")
    ws["A2"].alignment = WRAP
    ws.merge_cells("A2:I2")
    ws.row_dimensions[2].height = 30
    ws.cell(row=4, column=1, value="Metric")
    ws.cell(row=4, column=2, value="Definition / period")
    for k, (cid, cname, *_rest) in enumerate(S.CASES):
        ws.cell(row=4, column=3 + k, value=f"{cid}: {cname}")
    style_header(ws, 4, 2 + NCASE)
    P = R["_P"]
    rng = lambda cid, key: f"C_{cid}!$D${R[key]}:${LASTM}${R[key]}"  # noqa: E731
    at = lambda cid, key, mexpr: f"INDEX({rng(cid, key)},1,{mexpr})"  # noqa: E731
    pm = lambda cid, key: f"C_{cid}!{P[key]}"  # noqa: E731
    ms = lambda cid: pm(cid, "mile_m")  # noqa: E731
    act = lambda cid: rng(cid, "active")  # noqa: E731
    win = lambda cid, key: (f"SUMPRODUCT(({C('m', cid)}>{ms(cid)}-12)*({C('m', cid)}<={ms(cid)})*{rng(cid, key)})")  # noqa: E731

    def C(key, cid):
        return rng(cid, key)

    def mlabel(cid, expr):
        return f'IF({expr}>=999,"none in horizon",TEXT(EDATE({pm(cid, "start")},{expr}-1),"mmm yyyy"))'

    def first(cid, key):  # first month where flag row = 1 within the reported horizon
        return f"IFERROR(IF(MATCH(1,{rng(cid, key)},0)>{pm(cid, 'horizon')},999,MATCH(1,{rng(cid, key)},0)),999)"

    rows = []

    def kpi(key, label, defin, kind, fn, fmt=CUR):
        rows.append((key, label, defin, kind, fn, fmt))

    kpi("valid", "Input validation", "Validation and rules for this case", "none",
        lambda c: f'=IF({VALID("cash", c)},"Valid","INVALID: "&{REASON(c)})', "General")
    kpi("checks", "Model checks", "Independent invariants (Checks sheet)", "none",
        lambda c: f"=INDEX(Checks!$C${R['_chk_overall_row']}:${L(2 + NCASE)}${R['_chk_overall_row']},1,{CASE_IDS.index(c) + 1})", "General")
    kpi("open_cash", "Opening cash", "INR capital x FX; founder statement unless verified", "cash",
        lambda c: f"={pm(c, 'open_cad')}")
    kpi("open_status", "Opening cash status", "Is the opening balance verified?", "none",
        lambda c: f'=IF({pm(c, "verified")}=1,"Verified bank balance","Founder statement — no actual runway claim")', "General")
    kpi("fund", "Funding received in this case", "Cash on receipt, end of month; not commitments", "cash",
        lambda c: f'=IF({pm(c, "fund_amt")}>0,TEXT({pm(c, "fund_amt")},"#,##0")&" in "&{mlabel(c, pm(c, "fund_m"))},"none")', "General")
    kpi("breach_nf", "First month below floor, same plan with no financing", "Within-month low < CASH.FLOOR", "cash",
        lambda c: f"={mlabel(c, first(c, 'below_floor_nf'))}", "General")
    kpi("breach", "First month below floor, with this case's financing", "Within-month low < CASH.FLOOR", "cash",
        lambda c: f"={mlabel(c, first(c, 'below_floor'))}", "General")
    kpi("zero", "First month cash below zero, with financing", "Within-month low < 0", "cash",
        lambda c: f"={mlabel(c, first(c, 'below_zero'))}", "General")
    kpi("low", "Lowest within-month cash, with financing", "Over the reported horizon", "cash",
        lambda c: f'=_xlfn.MINIFS({rng(c, "intra_low")},{act(c)},1)')
    kpi("fund_ok", "Funding arrives before the no-financing floor breach?", "Funding month < breach month", "cash",
        lambda c: (f'=IF({pm(c, "fund_amt")}<=0,"No funding in case",IF({first(c, "below_floor_nf")}>=999,"No breach in horizon",'
                   f'IF({pm(c, "fund_m")}<{first(c, "below_floor_nf")},"Yes","NO — arrives too late")))'), "General")
    kpi("latest_start", "Latest month to start raising (breach - lead time - 1)", "From the no-financing breach", "cash",
        lambda c: f'=IF({first(c, "below_floor_nf")}>=999,"no breach in horizon",{mlabel(c, f"MAX(1,{first(c, "below_floor_nf")}-{pm(c, "lead_m")}-1)")})',
        "General")
    kpi("need", "Funding needed to milestone plus forward reserve", "Floor gap to milestone + reserve months x average net burn of the 3 months to milestone", "cash",
        lambda c: (f'=MAX(0,{pm(c, "floor")}-_xlfn.MINIFS({rng(c, "intra_nf")},{C("m", c)},"<="&{ms(c)}))+{pm(c, "reserve_m")}*'
                   f"MAX(0,-SUMPRODUCT(({C('m', c)}>{ms(c)}-3)*({C('m', c)}<={ms(c)})*{rng(c, 'ocf_nf')})/3)"))
    kpi("firms", "Paying firms at milestone (expected value)", "Active paying contracts", "cust",
        lambda c: f"={at(c, 'rep_firms', ms(c))}", NUM1)
    kpi("firms_whole", "Whole-firm operating target at milestone", "Expected value rounded down", "cust",
        lambda c: f"=ROUNDDOWN({at(c, 'rep_firms', ms(c))},0)", "0")
    kpi("mrr", "MRR at milestone", "Normalised recurring run rate; excludes one-time fees", "cust",
        lambda c: f"={at(c, 'rep_mrr', ms(c))}")
    kpi("arr", "ARR run rate at milestone", "12 x MRR. Not revenue earned", "cust",
        lambda c: f"=12*{at(c, 'rep_mrr', ms(c))}")
    kpi("rev12", "Revenue earned, 12 months to milestone", "Subscription (net of free-month credits) + migration fees", "cust",
        lambda c: f"={win(c, 'rep_rev')}")
    kpi("coll12", "Cash collected from customers, 12 months to milestone", "Excludes deposits and financing", "cust",
        lambda c: f"={win(c, 'rep_coll')}")
    kpi("gm", "Gross margin, 12 months to milestone", "(Revenue - COGS) / revenue; COGS includes delivery staff share", "cust",
        lambda c: f'=IF({win(c, "revenue")}>0,({win(c, "revenue")}-{win(c, "cogs")})/{win(c, "revenue")},"N/A — no revenue")', PCT)
    kpi("contrib", "Contribution after sales and marketing, 12 months", "Gross profit - S&M", "cash",
        lambda c: f"={win(c, 'contribution')}")
    kpi("opres", "Operating result, 12 months to milestone", "All costs including product team", "cash",
        lambda c: f"={win(c, 'op_result')}")
    kpi("cac", "CAC, fully loaded (trailing 3 months at milestone)", "S&M lagged by SELL.LAG / new activated contracts", "cust",
        lambda c: (f'=IFERROR(IF(SUMPRODUCT(({C("m", c)}>{ms(c)}-3)*({C("m", c)}<={ms(c)})*{rng(c, "new_act")})>0,'
                   f'SUMPRODUCT(({C("m", c)}>{ms(c)}-3-{pm(c, "lag")})*({C("m", c)}<={ms(c)}-{pm(c, "lag")})*{rng(c, "sm")})/'
                   f'SUMPRODUCT(({C("m", c)}>{ms(c)}-3)*({C("m", c)}<={ms(c)})*{rng(c, "new_act")}),"N/A — no new customers"),"N/A")'))
    kpi("unitcm", "Unit contribution per firm per month (milestone)", "MRR per firm x (1 - card % - bad debt %) - variable cost - card fixed fee", "cust",
        lambda c: (f'=IFERROR(({at(c, "mrr", ms(c))}/{at(c, "firms", ms(c))})*(1-{pm(c, "card_pct")}-{pm(c, "default")})'
                   f'-{pm(c, "var")}-{pm(c, "card_fixed")},"N/A — no paying firms")'))
    kpi("payback", "CAC payback (months of unit contribution)", "CAC / unit contribution per new firm (variable delivery costs only)", "cust",
        lambda c: (f'=IFERROR(IF(AND(ISNUMBER({{cac}}),ISNUMBER({{unitcm}})),IF({{unitcm}}>0,{{cac}}/{{unitcm}},'
                   f'"N/A — unit contribution not positive"),"N/A — needs CAC and unit contribution"),"N/A")'), NUM1)
    kpi("burnmult", "Burn multiple, 12 months to milestone", "Net operating cash burn / net new ARR (N/A if ARR did not grow)", "cash",
        lambda c: (f'=IFERROR(IF(12*({at(c, "mrr", ms(c))}-{at(c, "mrr", f"MAX(1,{ms(c)}-12)")})<=0,"N/A — no net new ARR",'
                   f'IF(-{win(c, "ocf")}<=0,"N/A — not burning",-{win(c, "ocf")}/(12*({at(c, "mrr", ms(c))}-{at(c, "mrr", f"MAX(1,{ms(c)}-12)")})))),"N/A")'),
        "0.0")
    kpi("cpf", "Commercial cost per firm gone live (descriptive, not CAC)", "All non-product commercial and admin costs / firms onboarded, to milestone", "cust",
        lambda c: (f'=IFERROR(SUMPRODUCT(({C("m", c)}<={ms(c)})*({rng(c, "sm")}+{rng(c, "ga")}+{rng(c, "cogs")}-{rng(c, "prod_cost")}*{pm(c, "prod_cogs")}))/'
                   f'SUMPRODUCT(({C("m", c)}<={ms(c)})*({rng(c, "fonb")}+{rng(c, "sonb")})),"N/A — no firms")'))
    kpi("breakeven", "Break-even paying firms at milestone cost base", "Fixed costs (total less variable delivery, card fees, bad debt) / unit contribution", "cash",
        lambda c: (f'=IFERROR(IF({{unitcm}}>0,({at(c, "total_costs", ms(c))}-{at(c, "var_cost", ms(c))}-{at(c, "card_fees", ms(c))}'
                   f'-{at(c, "bad_debt", ms(c))})/{{unitcm}},"N/A — unit contribution not positive"),"N/A")'), NUM1)
    for rid, rname, *_ in S.ROLES:
        kpi(f"hire_{rid}", f"Start month used: {rname}", "Requested date subject to mode, gates and overrides", "cust",
            lambda c, rid=rid: f"={mlabel(c, first(c, f'hired_{rid}'))}", "General")
    kpi("limit", "Limiting step at milestone", "Cash, onboarding, selling hours, reachable pool, else demand", "cash",
        lambda c: (f'=IF({at(c, "below_floor", ms(c))}=1,"Cash below floor",IF(N({at(c, "onb_util", ms(c))})>1,"Onboarding capacity",'
                   f'IF(N({at(c, "sales_util", ms(c))})>1,"Selling hours",IF({at(c, "pool_close", ms(c))}<=0,"Reachable market",'
                   f'"Demand: channel activity and conversion"))))'), "General")
    kpi("cash_end", "Cash at end of reported horizon", "With this case's financing", "cash",
        lambda c: f"=INDEX({rng(c, 'cash_close')},1,{pm(c, 'horizon')})")
    kpi("cogs18", "COGS, start to milestone", "Classified costs from month 1 to milestone", "cost",
        lambda c: f"=SUMPRODUCT(({C('m', c)}<={ms(c)})*{rng(c, 'cogs')})")
    kpi("sm18", "Sales and marketing, start to milestone", "", "cost", lambda c: f"=SUMPRODUCT(({C('m', c)}<={ms(c)})*{rng(c, 'sm')})")
    kpi("rd18", "Product development (R&D), start to milestone", "", "cost", lambda c: f"=SUMPRODUCT(({C('m', c)}<={ms(c)})*{rng(c, 'rd')})")
    kpi("ga18", "Administration and fundraising, start to milestone", "", "cost", lambda c: f"=SUMPRODUCT(({C('m', c)}<={ms(c)})*{rng(c, 'ga')})")
    kpi("tot18", "Total costs, start to milestone", "", "cost", lambda c: f"=SUMPRODUCT(({C('m', c)}<={ms(c)})*{rng(c, 'total_costs')})")
    kpi("disc18", "Discretionary commercial spend, start to milestone", "Staff + contractors + tools + events + paid + one-time + contingency (excl. product)", "cost",
        lambda c: (f"=SUMPRODUCT(({C('m', c)}<={ms(c)})*(" + "+".join(rng(c, k) for k in ["staff", "content_cost", "cfo_cost",
                   "tools_cost", "events_cost", "paid_cost", "legal_cost", "website_cost", "demo_cost", "ins_cost", "raise_legal",
                   "acct_cost", "contingency"]) + "))"))
    kpi("useprod", "Use of funds, receipt to milestone: product team", "From funding month to milestone", "cash",
        lambda c: f"=IF({pm(c, 'fund_amt')}>0,SUMPRODUCT(({C('m', c)}>={pm(c, 'fund_m')})*({C('m', c)}<={ms(c)})*{rng(c, 'prod_cost')}),\"N/A — no funding\")")
    kpi("usecomm", "Use of funds, receipt to milestone: all other costs paid", "Cash costs less product team", "cash",
        lambda c: f"=IF({pm(c, 'fund_amt')}>0,SUMPRODUCT(({C('m', c)}>={pm(c, 'fund_m')})*({C('m', c)}<={ms(c)})*({rng(c, 'cash_costs')}-{rng(c, 'prod_cost')})),\"N/A — no funding\")")
    kpi("usecoll", "Use of funds, receipt to milestone: customer collections offset", "Collections + deposits - refunds", "cash",
        lambda c: f"=IF({pm(c, 'fund_amt')}>0,SUMPRODUCT(({C('m', c)}>={pm(c, 'fund_m')})*({C('m', c)}<={ms(c)})*({rng(c, 'collections')}+{rng(c, 'dep_recv')}-{rng(c, 'dep_refund')}-{rng(c, 'refunds')})),\"N/A — no funding\")")

    KROW = {}
    for q, (key, label, defin, kind, fn, fmt) in enumerate(rows):
        KROW[key] = 5 + q
    for q, (key, label, defin, kind, fn, fmt) in enumerate(rows):
        r = KROW[key]
        ws.cell(row=r, column=1, value=label).font = F_TXT
        ws.cell(row=r, column=2, value=defin).font = F_TXT
        ws.cell(row=r, column=2).alignment = WRAP
        for k, cid in enumerate(CASE_IDS):
            col = L(3 + k)
            f = fn(cid)
            f = (f.replace("{cac}", f"{col}{KROW['cac']}").replace("{gm}", f"{col}{KROW['gm']}")
                 .replace("{unitcm}", f"{col}{KROW['unitcm']}"))
            body = f[1:] if f.startswith("=") else f
            if kind == "none":
                full = "=" + body
            else:
                vk = {"cust": "cust", "cost": "cost", "cash": "cash"}[kind]
                full = f'=IF({VALID(vk, cid)},{body},"N/A — invalid inputs (see Checks)")'
            cell = ws.cell(row=r, column=3 + k, value=full)
            cell.number_format = fmt
            cell.font = F_TXT
            cell.alignment = Alignment(wrap_text=True, vertical="top")
    # array-style MIN(IF()) needs array formula in some engines: rewrite 'low' and 'need' as SUMPRODUCT-free forms
    # Market-size sensitivity (live)
    mr = 6 + len(rows)
    ws.cell(row=mr, column=1, value="Market-size sensitivity (estimate from stated assumptions; not a measured ceiling)").font = F_B
    hdr = ["RCICs per practice", "Practices in Canada", "In ON/BC/AB", "Annual revenue pool at BASE list MRR per firm (CAD)"]
    for j, h in enumerate(hdr, 1):
        ws.cell(row=mr + 1, column=j, value=h)
    style_header(ws, mr + 1, 4)
    for q, ratio in enumerate([1.5, 2.0, 3.0]):
        r = mr + 2 + q
        ws.cell(row=r, column=1, value=ratio)
        ws.cell(row=r, column=2, value=f"={E('MKT.RCIC_CANADA', 'BASE')}/A{r}").number_format = CUR
        ws.cell(row=r, column=3, value=f"=B{r}*{E('MKT.REACH_SHARE', 'BASE')}").number_format = CUR
        ws.cell(row=r, column=4, value=f"=C{r}*12*C_BASE!{P['arpa']}").number_format = CUR
    ws.cell(row=mr + 6, column=1, value=("Counts are RCIC people (CICC, 30 Jun 2025), not firms; practices per RCIC are not published. "
                                         "Excludes RISIAs, lawyers and firms outside the three provinces.")).alignment = WRAP
    # dilution illustration
    dr = mr + 8
    ws.cell(row=dr, column=1, value="Ownership illustration (BASE funding amount; not a valuation opinion; existing holdings unknown)").font = F_B
    for j, h in enumerate(["Post-money cap", "Funding amount", "Dilution"], 1):
        ws.cell(row=dr + 1, column=j, value=h)
    style_header(ws, dr + 1, 3)
    for q, cap in enumerate(["FUND.CAP1", "FUND.CAP2", "FUND.CAP3"]):
        r = dr + 2 + q
        ws.cell(row=r, column=1, value=f"={E(cap, 'BASE')}").number_format = CUR
        ws.cell(row=r, column=2, value=f"={E('FUND.AMT', 'BASE')}").number_format = CUR
        ws.cell(row=r, column=3, value=f"=IF(A{r}>0,B{r}/A{r},\"N/A\")").number_format = PCT
    ws.column_dimensions["A"].width = 52
    ws.column_dimensions["B"].width = 44
    for k in range(NCASE):
        ws.column_dimensions[L(3 + k)].width = 22
    ws.freeze_panes = "C5"
    KROW["_market_row"] = mr
    KROW["_dil_row"] = dr
    return KROW


# =========================================================================== Dashboard
def build_dashboard(ws, R, KROW, E):
    ws["A1"] = "Dashboard — selected case"
    ws["A1"].font = F_T
    ws["A3"] = "Selected case (choose):"
    ws["A3"].font = F_B
    ws["C3"] = "BASE"
    ws["C3"].font = F_IN
    ws["C3"].fill = FILL_KEY
    dv = DataValidation(type="list", formula1='"' + ",".join(CASE_IDS) + '"', allow_blank=False)
    ws.add_data_validation(dv)
    dv.add("C3")
    ws["D3"] = f'=MATCH(C3,{{{",".join(chr(34) + c + chr(34) for c in CASE_IDS)}}},0)'
    ws["E3"] = '=INDEX(Compare!$C$4:$' + L(2 + NCASE) + '$4,1,D3)'
    ws["A4"] = "Report status:"
    ws["C4"] = "=Reports!B10"
    ws["C4"].font = F_RED
    ws["A5"] = "Model checks:"
    ws["C5"] = f"=INDEX(Compare!$C${KROW['checks']}:${L(2 + NCASE)}${KROW['checks']},1,D3)"
    ws["C5"].font = F_RED
    ws["A6"] = "Opening cash status:"
    ws["C6"] = f"=INDEX(Compare!$C${KROW['open_status']}:${L(2 + NCASE)}${KROW['open_status']},1,D3)"
    ws["A8"] = "Key results (from Compare)"
    ws["A8"].font = F_B
    keys = ["valid", "fund", "breach_nf", "breach", "zero", "low", "fund_ok", "latest_start", "need", "firms", "firms_whole",
            "mrr", "arr", "rev12", "coll12", "gm", "contrib", "opres", "unitcm", "cac", "payback", "burnmult", "breakeven", "limit",
            "cash_end"] + [f"hire_{rid}" for rid, *_ in S.ROLES]
    for q, k in enumerate(keys):
        r = 9 + q
        ws.cell(row=r, column=1, value=f"=Compare!A{KROW[k]}")
        ws.cell(row=r, column=3, value=f"=INDEX(Compare!$C${KROW[k]}:${L(2 + NCASE)}${KROW[k]},1,$D$3)")
        ws.cell(row=r, column=3).alignment = Alignment(wrap_text=True, vertical="top")
        ws.cell(row=r, column=3).number_format = CUR if k not in ("gm",) else PCT
    tr = 9 + len(keys) + 2
    ws.cell(row=tr, column=1, value="Monthly view, selected case (first 36 months)").font = F_B
    lines = [("date", "Month", MONTHFMT), ("status", "Actual / forecast", "General"), ("rep_firms", "Paying firms", NUM1),
             ("rep_mrr", "MRR", CUR), ("rep_rev", "Revenue earned", CUR), ("rep_coll", "Collections", CUR),
             ("rep_costs", "Total costs", CUR), ("ocf", "Operating cash flow", CUR), ("financing", "Financing", CUR),
             ("cash_close", "Cash at month end", CUR), ("intra_low", "Lowest cash within month", CUR),
             ("below_floor", "Below floor (1/0)", "0"), ("onb_util", "Onboarding demand / capacity", "0.00"),
             ("sales_util", "Selling hours wanted / available", "0.00")]
    for q, (key, label, fmt) in enumerate(lines):
        r = tr + 1 + q
        ws.cell(row=r, column=1, value=label)
        for m in range(1, 37):
            col = L(2 + m)
            refs = ",".join(f"INDEX(C_{cid}!$D${R[key]}:${LASTM}${R[key]},1,{m})" for cid in CASE_IDS)
            c = ws.cell(row=r, column=2 + m, value=f"=CHOOSE($D$3,{refs})")
            c.number_format = fmt
    ws.column_dimensions["A"].width = 52
    ws.column_dimensions["B"].width = 2
    ws.column_dimensions["C"].width = 26
    for m in range(2, 37):
        ws.column_dimensions[L(2 + m)].width = 11


# =========================================================================== Cohorts view
def build_cohorts(ws, R, E):
    ws["A1"] = "Cohorts — active contracts by start month (selected case on Dashboard), expected values"
    ws["A1"].font = F_T
    ws["A2"] = ("Rows = month the contracts started; columns = calendar month. Monthly contracts survive by monthly "
                "cancellation; annual contracts by refund at start and non-renewal at each anniversary.")
    P = R["_P"]
    sel = "Dashboard!$D$3"
    pick = lambda key: "CHOOSE(" + sel + "," + ",".join(f"C_{cid}!{P[key]}" for cid in CASE_IDS) + ")"  # noqa: E731
    ws["AQ3"], ws["AR3"] = "Monthly cancellation", f"={pick('churn')}"
    ws["AQ4"], ws["AR4"] = "Annual non-renewal", f"={pick('nonrenew')}"
    ws["AQ5"], ws["AR5"] = "Annual refund at start", f"={pick('ann_refund')}"
    ws["A4"] = "Start month"
    ws["A4"].font = F_B
    ws.cell(row=4, column=40, value="New monthly contracts").font = F_B
    ws.cell(row=4, column=41, value="New annual contracts").font = F_B
    for m in range(1, 37):
        refs = ",".join(f"INDEX(C_{cid}!$D${R['date']}:${LASTM}${R['date']},1,{m})" for cid in CASE_IDS)
        c = ws.cell(row=4, column=2 + m, value=f"=CHOOSE({sel},{refs})")
        c.number_format = MONTHFMT
        c.font = F_B
    for s_ in range(1, 37):
        r = 4 + s_
        ws.cell(row=r, column=1, value=f"=INDEX($C$4:$AL$4,1,{s_})").number_format = MONTHFMT
        nm = lambda t: "CHOOSE(" + sel + "," + ",".join(f"INDEX(C_{cid}!$D${R['N_' + t]}:${LASTM}${R['N_' + t]},1,{s_})" for cid in CASE_IDS) + ")"  # noqa: E731
        ws.cell(row=r, column=40, value=f"={nm('FM')}+{nm('SM')}").number_format = NUM1
        ws.cell(row=r, column=41, value=f"={nm('FA')}+{nm('SA')}").number_format = NUM1
        for m in range(s_, 37):
            a_ = m - s_
            c = ws.cell(row=r, column=2 + m,
                        value=f"=$AN{r}*POWER(1-$AR$3,{a_})+$AO{r}*(1-$AR$5)*POWER(1-$AR$4,INT({a_}/12))")
            c.number_format = NUM1
    ws.cell(row=42, column=1, value="Total active").font = F_B
    for m in range(1, 37):
        col = L(2 + m)
        ws.cell(row=42, column=2 + m, value=f"=SUM({col}5:{col}40)").number_format = NUM1
    ws.column_dimensions["A"].width = 14


# =========================================================================== 13-week cash view
def build_cash13(ws, R, E, VALID):
    ws["A1"] = "13-week cash view — selected case (weekly timing assumptions from Inputs group W13)"
    ws["A1"].font = F_T
    ws["A2"] = ("Weeks start on Mondays; each week belongs to the month of its Monday. Monthly totals are spread by "
                "week-of-month shares; months fully inside the window reconcile exactly to the monthly model.")
    ws["A2"].alignment = WRAP
    ws.merge_cells("A2:N2")
    P = R["_P"]
    sel = "Dashboard!$D$3"
    pick = lambda key: "CHOOSE(" + sel + "," + ",".join(f"C_{cid}!{P[key]}" for cid in CASE_IDS) + ")"  # noqa: E731
    pickE = lambda aid: "CHOOSE(" + sel + "," + ",".join(E(aid, cid) for cid in CASE_IDS) + ")"  # noqa: E731
    ws["A4"] = "Start month (input W13.START, else month before first floor breach)"
    breach = "CHOOSE(" + sel + "," + ",".join(f"IFERROR(MATCH(1,C_{cid}!$D${R['below_floor']}:${LASTM}${R['below_floor']},0),999)" for cid in CASE_IDS) + ")"
    ws["C4"] = (f'=IF({pickE("W13.START")}="",IF({breach}>=999,{pick("start")},EDATE({pick("start")},MAX(0,{breach}-2))),'
                f'DATE(YEAR({pickE("W13.START")}),MONTH({pickE("W13.START")}),1))')
    ws["C4"].number_format = "yyyy-mm-dd"
    ws["A5"] = "First Monday on or after start"
    ws["C5"] = "=C4+MOD(7-WEEKDAY(C4,2)+1,7)"
    ws["C5"].number_format = "yyyy-mm-dd"
    labels = ["Week starting", "Month #", "Week-of-month bucket", "Weeks in this month with this bucket",
              "Receipts (collections + deposits - refunds)", "Payroll and contractors", "Product team",
              "Other costs", "Financing", "Net flow", "Cash at week end", "Below floor?"]
    for q, lab in enumerate(labels):
        ws.cell(row=7 + q, column=1, value=lab).font = F_TXT
    shares = {nm: [pickE(f"W13.{nm}_W{b}") for b in range(1, 5)] for nm in ["PAYROLL", "PRODUCT", "OTHER", "RECEIPTS"]}
    mval = lambda key, mexpr: "CHOOSE(" + sel + "," + ",".join(f"INDEX(C_{cid}!$D${R[key]}:${LASTM}${R[key]},1,{mexpr})" for cid in CASE_IDS) + ")"  # noqa: E731
    for w in range(13):
        col = L(3 + w)
        ws[f"{col}7"] = f"=$C$5+{7 * w}"
        ws[f"{col}7"].number_format = "yyyy-mm-dd"
        ws[f"{col}8"] = f"=(YEAR({col}7)-YEAR({pick('start')}))*12+MONTH({col}7)-MONTH({pick('start')})+1"
        ws[f"{col}9"] = f"=MIN(4,INT((DAY({col}7)-1)/7)+1)"
        fm = f"({col}7-DAY({col}7)+1+MOD(7-WEEKDAY({col}7-DAY({col}7)+1,2)+1,7))"  # first Monday of that month
        ks = "{0,1,2,3,4}"
        cnt = (f"SUMPRODUCT((MONTH({fm}+7*{ks})=MONTH({col}7))*"
               f"((INT((DAY({fm}+7*{ks})-1)/7)+1)-((INT((DAY({fm}+7*{ks})-1)/7)+1)>4)*((INT((DAY({fm}+7*{ks})-1)/7)+1)-4)={col}9))")
        ws[f"{col}10"] = f"={cnt}"
        sh = lambda nm: f"CHOOSE({col}9,{','.join(shares[nm])})"  # noqa: E731
        m = f"{col}8"
        ws[f"{col}11"] = f"=({mval('collections', m)}+{mval('dep_recv', m)}-{mval('dep_refund', m)}-{mval('refunds', m)})*{sh('RECEIPTS')}/{col}10"
        ws[f"{col}12"] = f"=({mval('staff', m)}+{mval('content_cost', m)}+{mval('cfo_cost', m)})*{sh('PAYROLL')}/{col}10"
        ws[f"{col}13"] = f"={mval('prod_cost', m)}*{sh('PRODUCT')}/{col}10"
        ws[f"{col}14"] = (f"=({mval('cash_costs', m)}-{mval('staff', m)}-{mval('content_cost', m)}-{mval('cfo_cost', m)}"
                          f"-{mval('prod_cost', m)})*{sh('OTHER')}/{col}10")
        ws[f"{col}15"] = f"=IF({col}9=4,{mval('financing', m)}/{col}10,0)"
        ws[f"{col}16"] = f"={col}11-{col}12-{col}13-{col}14+{col}15"
        prevc = f"{L(2 + w)}17" if w > 0 else f"{mval('cash_open', 'C8')}"
        ws[f"{col}17"] = f"={prevc}+{col}16"
        ws[f"{col}18"] = f'=IF({col}17<{pick("floor")},"BELOW FLOOR","")'
        for rr in range(11, 18):
            ws[f"{col}{rr}"].number_format = CUR
    ws["A20"] = "Reconciliation to the monthly model (months fully inside the window)"
    ws["A20"].font = F_B
    for q, lab in enumerate(["Month #", "Fully inside window?", "Weekly net flow total", "Monthly operating cash flow + financing",
                             "Difference"]):
        ws.cell(row=21 + q, column=1, value=lab)
    for j in range(4):
        col = L(3 + j)
        ws[f"{col}21"] = f"=$C$8+{j}"
        dmo = f"EDATE({pick('start')},{col}21-1)"
        fmo = f"({dmo}+MOD(7-WEEKDAY({dmo},2)+1,7))"
        ws[f"{col}22"] = (f'=IF(COUNTIF($C$8:$O$8,{col}21)=SUMPRODUCT((MONTH({fmo}+7*{{0,1,2,3,4}})=MONTH({dmo}))*1),"Yes","No")')
        ws[f"{col}23"] = f"=SUMPRODUCT(($C$8:$O$8={col}21)*$C$16:$O$16)"
        ws[f"{col}24"] = f"={mval('ocf', col + '21')}+{mval('financing', col + '21')}"
        ws[f"{col}25"] = f'=IF({col}22="Yes",{col}23-{col}24,"partial month")'
        for rr in (23, 24, 25):
            ws[f"{col}{rr}"].number_format = CUR2
    ws.column_dimensions["A"].width = 48
    for w in range(13):
        ws.column_dimensions[L(3 + w)].width = 12


# =========================================================================== Reports and Guide
def build_reports(ws, last_in, ncase):
    ws["A1"] = "Reports — refresh state and stale-output detection"
    ws["A1"].font = F_T
    rows = [("Model version", S.MODEL_VERSION),
            ("Model logic fingerprint (written by build)", ""),
            ("Built at", ""),
            ("Inputs + scenarios + actuals checksum (live)", None),
            ("Checksum at last report refresh", ""),
            ("Last report refresh (time, by refresh_reports.py)", "never"),
            ("Report status", None)]
    for q, (lab, val) in enumerate(rows):
        ws.cell(row=4 + q, column=1, value=lab).font = F_B if q == 6 else F_TXT
        if val is not None:
            ws.cell(row=4 + q, column=2, value=val)
    nin = len(S.INPUTS)
    ws["B7"] = (f'=ROUND(SUMPRODUCT(Inputs!$D$5:$D${4 + nin},Inputs!$N$5:$N${4 + nin})'
                f'+SUMPRODUCT((Inputs!$D$5:$D${4 + nin}="")*Inputs!$N$5:$N${4 + nin})*3.1'
                f'+SUMPRODUCT(Scenarios!${L(5 + 2 * ncase)}$6:${L(5 + 2 * ncase)}${5 + nin},Scenarios!${L(4 + 2 * ncase)}$6:${L(4 + 2 * ncase)}${5 + nin})'
                f'+SUMPRODUCT(Actuals!$D$6:$D$1005)*0.73+SUMPRODUCT(Actuals!$B$6:$B$1005)*0.11'
                f'+SUMPRODUCT(LEN(Actuals!$C$6:$C$1005))*0.013,4)')
    ws["B10"] = ('=IF(B8="","STALE — reports never refreshed: run refresh_reports.py",'
                 'IF(ROUND(B8,4)=ROUND(B7,4),"Current (inputs unchanged since last refresh)",'
                 '"STALE — inputs changed since last refresh: run refresh_reports.py"))')
    ws["A12"] = ("Generated report blocks in the Markdown artifacts carry the same checksum and the model logic "
                 "fingerprint; tools/check_reports.py flags any block whose fingerprint no longer matches.")
    ws["A12"].alignment = WRAP
    ws.merge_cells("A12:D12")
    ws.row_dimensions[12].height = 30
    ws.column_dimensions["A"].width = 52
    ws.column_dimensions["B"].width = 70


def build_guide(ws):
    lines = [
        ("Expat Ready — company model v0.2: founder's guide", F_T),
        ("What it answers: what we can sell, what it costs to acquire and serve firms, when cash runs short, which hires we can afford, and what a raise would achieve.", F_TXT),
        ("", F_TXT),
        ("1. Where to edit (only here)", F_B),
        ("• Inputs sheet, column D (blue): shared defaults for every case. Blank = UNKNOWN; type 0 for a real zero. Ranges (G:H) are enforced.", F_TXT),
        ("• Scenarios sheet: a case's deliberate overrides. Put Y in the Flag column and the value next to it. Without Y the case inherits the shared default.", F_TXT),
        ("• Actuals sheet: real results by month (first day of the month) and metric ID. Set CAL.ACT_CUTOFF to the last closed month. Actual months never change when assumptions change.", F_TXT),
        ("• Dashboard cell C3: choose the case to view. Compare shows all six cases side by side.", F_TXT),
        ("", F_TXT),
        ("2. What updates by itself and what needs a refresh", F_B),
        ("• In Excel, every formula, the Dashboard, Compare, Checks, Cohorts and the 13-week view update immediately.", F_TXT),
        ("• Report tables inside the Markdown plans and the Sensitivity sheet update only when you run:  python3 commercial/tools/refresh_reports.py", F_TXT),
        ("• Reports!B10 and Dashboard!C4 say STALE as soon as an input changes after the last refresh.", F_TXT),
        ("• Rebuilding the model (build_workbook.py) keeps your Inputs, Scenarios, Actuals, Experiments and tracker tabs.", F_TXT),
        ("", F_TXT),
        ("3. Warnings", F_B),
        ("• 'N/A — invalid inputs': an input that output depends on is missing, out of range or breaks a rule. Effective sheet and Checks list which.", F_TXT),
        ("• 'FAIL — do not use' (Checks): an internal identity broke (for example ARR is not 12 x MRR). Do not use the numbers.", F_TXT),
        ("• 'Founder statement — no actual runway claim': opening cash is not yet a verified bank balance (CASH.OPEN_VERIFIED = 0).", F_TXT),
        ("• 'NO — arrives too late': in that case, funding is received after the month cash first falls below the floor.", F_TXT),
        ("", F_TXT),
        ("4. Three worked changes", F_B),
        ("A. Price: Inputs!D for PRICE.SOLO from 89 to 99. Every case that has no PRICE.SOLO override changes; MRR, revenue, ARR, credits and the free-month value follow. Conversion does NOT change unless you also set SELL.ELASTICITY (a hypothesis).", F_TXT),
        ("B. Hire date: Scenarios, case HIGH, ROLE.REP1.REQ: flag Y and enter a new date. Only HIGH changes. In gated cases (HIRE.MODE = 2) a requested date is the earliest start; the hire waits for prerequisites and cash unless ROLE.REP1.OVERRIDE = 1.", F_TXT),
        ("C. Funding delay: Inputs FUND.DATE from 2027-02-01 to 2027-05-01. Compare shows whether funding now arrives after the floor breach ('NO — arrives too late') and the lowest cash. Managed no-raise (MNR) shows the cost-controlled path.", F_TXT),
        ("", F_TXT),
        ("5. Limits", F_B),
        ("• Forecasts are expected values from assumptions, not traction. No observed retention exists, so no lifetime value is shown.", F_TXT),
        ("• GST/HST, corporate tax, fixed assets and a full balance sheet are out of scope until opening balances are validated (accountant).", F_TXT),
        ("• Plan and channel are carried as mixes inside each start-month cohort; the four cohort types are founding/standard x monthly/annual.", F_TXT),
    ]
    for q, (t, f) in enumerate(lines):
        c = ws.cell(row=1 + q, column=1, value=t)
        c.font = f
        c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.column_dimensions["A"].width = 150


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--src", default=None, help="workbook to preserve inputs from (default: --out)")
    a = ap.parse_args()
    lg = build(a.out, a.src)
    print(json.dumps({k: (v if not isinstance(v, list) or len(v) < 12 else f"{len(v)} items") for k, v in lg.items()}, indent=1))
