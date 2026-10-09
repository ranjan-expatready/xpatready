"""Independent re-implementation of the v0.2 monthly model in plain Python (explicit per-cohort loops).

Acceptance test 11: agree with the spreadsheet on selected cash and revenue outputs through a different
computation path (each cohort tracked explicitly, instead of the sheet's closed-form SUMPRODUCT survival).
Reads only the effective assumption values (Effective sheet) of a recalculated workbook.
Usage: python3 independent_model.py WORKBOOK.xlsx [CASE]
"""
import datetime as dt
import sys

from openpyxl import load_workbook


def effective(path, case):
    ws = load_workbook(path, data_only=True)["Effective"]
    col = next(c for c in range(1, ws.max_column + 1) if ws.cell(row=4, column=c).value == f"{case} value")
    v = {}
    for r in range(5, ws.max_row + 1):
        aid = ws.cell(row=r, column=1).value
        if aid and "." in str(aid) and not str(aid).startswith(("RULE", "ERR", "VALID")):
            v[aid] = ws.cell(row=r, column=col).value
    return v


def run(e, months=60):
    start = e["CAL.START"]

    def mi(d, blank=999):
        if d in (None, ""):
            return blank
        return (d.year - start.year) * 12 + d.month - start.month + 1

    def n(k):
        return float(e[k] or 0)

    launch, fund_m, bridge_m, gov_m = mi(e["CAL.LAUNCH"]), mi(e["FUND.DATE"]), mi(e["FUND.BRIDGE_DATE"]), mi(e["FUND.GOV_DATE"])
    open_cad = n("CASH.OPEN_INR") * n("CAL.FX_INR")
    arpa = sum(n(f"PRICE.MIX_{p}") * (n(f"PRICE.{p}") + n(f"PRICE.X_{p}") * n("PRICE.EXTRA")) for p in ["SOLO", "PRACTICE", "FIRM"])
    ad, as_, fd, fdur, fa = (n("OFFER.ANNUAL_DISC"), n("OFFER.ANNUAL_SHARE"), n("OFFER.FOUND_DISC"), n("OFFER.FOUND_DUR"),
                             n("OFFER.FOUND_ANNUAL"))
    fa_found = (1 - fd) * (1 - ad) if n("OFFER.STACK") == 1 else 1 - max(fd, ad)
    r_ref, nr, churn = n("OFFER.ANNUAL_REFUND"), n("RET.ANNUAL_NONRENEW"), n("RET.MONTHLY_CHURN")
    enet = n("RET.EXPANSION") - n("RET.CONTRACTION")
    close_eff = n("SELL.CLOSE")  # tested cases use zero elasticity
    lag, hrs_opp = int(n("SELL.LAG")), n("SELL.HRS_PER_OPP")
    roles = ["CS1", "CS2", "REP1", "REP2", "MKT"]
    req = {r: mi(e[f"ROLE.{r}.REQ"]) for r in roles}
    rcost = {r: n(f"ROLE.{r}.COST") for r in roles}
    rep_payback = ((rcost["REP1"] / (n("SELL.REP_OPPS") * close_eff)) / (arpa * n("HIRE.REP_GM"))
                   if n("SELL.REP_OPPS") * close_eff * arpa * n("HIRE.REP_GM") > 0 else 999)

    def S(t, a):
        return (1 - churn) ** a if t in ("FM", "SM") else (1 - r_ref) * (1 - nr) ** (a // 12)

    def X(t, a):
        return (1 + enet) ** a if t in ("FM", "SM") else (1 + enet) ** (12 * (a // 12))

    def F(t, a):
        if t == "FM":
            return 1 - fd * (a < fdur)
        if t == "FA":
            return fa_found if 12 * (a // 12) < fdur else 1 - ad
        return (1 - ad) if t == "SA" else 1.0

    hired = {r: 0 for r in roles}
    months_in = {r: 0 for r in roles}
    fcum = fback = sback = 0.0
    pool_open = n("MKT.RCIC_CANADA") / n("MKT.RCIC_PER_FIRM") * n("MKT.REACH_SHARE") * n("MKT.ADDRESSABLE")
    fpool_open = n("SELL.FOUNDER_POOL")
    cohorts = []  # dicts: s, t, N, refN, affN
    w_nonref, w_ref, w_aff = {}, {}, {}
    hist = {"firms": [0.0], "cash": [open_cad], "onb_over": [0, 0], "of": [0, 0], "ot": [0, 0]}
    st = dict(dep=0.0, rcm=0.0, rr=0.0, rca_issue={}, aff_accr={}, bill_prev=0.0)
    cash = open_cad
    out = []
    for m in range(1, months + 1):
        launched = 1 if m >= launch else 0
        pf, pc = hist["firms"][-1], hist["cash"][-1]
        new_h = {}
        for r in roles:
            if req[r] >= 999:
                new_h[r] = 0
                continue
            if n("HIRE.MODE") == 1:
                new_h[r] = 1 if m >= req[r] else 0
                continue
            prq = {"CS1": (fcum >= n("HIRE.CS1_FOUND") or fback + sback >= n("HIRE.CS1_QUEUE") or m >= launch),
                   "CS2": (hired["CS1"] == 1 and ((hist["onb_over"][-1] == 1 and hist["onb_over"][-2] == 1) or pf >= n("HIRE.CS2_FIRMS"))),
                   "REP1": (hist["of"][-1] == 1 and hist["of"][-2] == 1 and close_eff >= n("HIRE.REP_MIN_CLOSE") and rep_payback <= n("HIRE.REP_MAX_PAYBACK")),
                   "REP2": (months_in["REP1"] >= 6 and hist["ot"][-1] == 1 and hist["ot"][-2] == 1 and close_eff >= n("HIRE.REP_MIN_CLOSE") and rep_payback <= n("HIRE.REP_MAX_PAYBACK")),
                   "MKT": m >= mi(e["HIRE.MKT_EARLIEST"])}[r]
            cashok = pc - n("CASH.FLOOR") >= n("HIRE.CASH_COVER_M") * rcost[r]
            new_h[r] = 1 if (hired[r] == 1 or (m >= req[r] and (n(f"ROLE.{r}.OVERRIDE") == 1 or (prq and cashok)))) else 0
        hired = new_h
        for r in roles:
            months_in[r] += hired[r]
        rep_eff = sum(hired[r] * min(1, months_in[r] / n("SELL.REP_RAMP")) for r in ("REP1", "REP2"))
        cs_eff = sum(hired[r] * (n("ONB.CS_RAMP_FIRST") if months_in[r] == 1 else 1) for r in ("CS1", "CS2"))
        heads = 1 + sum(hired.values())
        # pre-launch founding commitments
        pre_dem = n("SELL.PRE_CONV") if mi(e["SELL.PRESALE_START"]) <= m < launch else 0
        pre_w = max(0, min(pre_dem, n("SELL.FOUNDER_HRS_PRE") * 52 / 12 / hrs_opp, fpool_open, pool_open))
        fsign = max(0, min(pre_w * n("SELL.FOUND_RATE"), n("OFFER.FOUND_CAP") - fcum))
        fcum += fsign
        dl = mi(e["OFFER.REFUND_DEADLINE"])
        fdrop = (1 if (m == dl and launch > dl) else 0) * (fback + fsign) * n("OFFER.LATE_REFUND_SHARE")
        # pipeline
        d_f = launched * max(0, min(n("SELL.FOUNDER_OPPS"), fpool_open - pre_w))
        d_c = launched * n("SELL.COMM_OPPS")
        d_r = launched * rep_eff * n("SELL.REP_OPPS")
        d_a = (n("PART.AFF_OPPS") if m >= mi(e["PART.AFF_START"]) else 0) * launched
        d_ref = launched * pf * n("PART.REF_RATE")
        d_t = d_f + d_c + d_r + d_a + d_ref
        cap = launched * (n("SELL.FOUNDER_HRS_POST") * 52 / 12 + rep_eff * n("SELL.REP_HRS"))
        worked = max(0, min(d_t, cap / hrs_opp, pool_open - pre_w))
        wf = worked / d_t if d_t > 0 else 0
        w_nonref[m], w_ref[m], w_aff[m] = (d_f + d_c + d_r + d_a) * wf, d_ref * wf, d_a * wf
        pool_open -= pre_w + worked
        fpool_open -= pre_w + d_f * wf
        of = 1 if launched * (d_t - d_r) * hrs_opp > n("SELL.FOUNDER_HRS_POST") * 52 / 12 else 0
        ot = 1 if launched * d_t * hrs_opp > cap + 1e-9 else 0
        k = m - lag
        c_ref = w_ref.get(k, 0) * n("PART.REF_CLOSE") if k >= 1 else 0
        c_aff = w_aff.get(k, 0) * close_eff if k >= 1 else 0
        closes = (w_nonref.get(k, 0) * close_eff if k >= 1 else 0) + c_ref
        rshare = c_ref / closes if closes > 0 else 0
        ashare = c_aff / closes if closes > 0 else 0
        # onboarding
        hrs = max(0, launched * (n("ONB.FOUNDER_HRS") * 52 / 12 + cs_eff * n("ONB.CS_HRS")) - pf * n("ONB.SUP_HRS"))
        ocap = hrs / n("ONB.HRS_PER_FIRM")
        f_av = fback + fsign - fdrop
        fonb = launched * min(f_av, ocap)
        fback = f_av - fonb
        s_av = sback + closes
        sonb = launched * max(0, min(s_av, ocap - fonb))
        sback = s_av - sonb
        onb_over = 1 if (launched == 1 and f_av + s_av > ocap + 1e-9) else 0
        act_ = n("ONB.ACTIVATION")
        N = {"FM": fonb * act_ * (1 - fa), "FA": fonb * act_ * fa, "SM": sonb * act_ * (1 - as_), "SA": sonb * act_ * as_}
        for t, v in N.items():
            cohorts.append(dict(s=m, t=t, N=v, refN=v * rshare if t in ("SM", "SA") else 0.0,
                                affN=v * ashare if t in ("SM", "SA") else 0.0))
        # explicit cohort loop
        firms = mrr = inv_m = inv_a = refunds = inv_found = inv_sm = mrr_found_m = 0.0
        cnt_m = cnt_a = 0.0
        for co in cohorts:
            a, t, v = m - co["s"], co["t"], co["N"]
            sv = S(t, a)
            mr = arpa * v * sv * F(t, a) * X(t, a)
            firms += v * sv
            mrr += mr
            if t in ("FM", "SM"):
                inv_m += mr
                cnt_m += v * sv
                if t == "FM":
                    inv_found += mr
                else:
                    inv_sm += mr
            else:
                inv = 0.0
                if a == 0:
                    inv = 12 * arpa * v * F(t, 0)
                    refunds += inv * r_ref
                    cnt_a += v
                elif a % 12 == 0:
                    inv = 12 * arpa * v * sv * F(t, a) * X(t, a)
                    cnt_a += v * sv
                inv_a += inv
                if t == "FA":
                    inv_found += inv
        mig = N["SM"] * n("OFFER.MIG_ATTACH") * n("OFFER.MIG_FEE")
        # deposits and credits
        dep_recv, dep_ref = fsign * n("OFFER.DEPOSIT"), fdrop * n("OFFER.DEPOSIT")
        dep_apply = max(0, min(st["dep"] + dep_recv - dep_ref, inv_found))
        st["dep"] += dep_recv - dep_ref - dep_apply
        refN_SM = sum(co["refN"] for co in cohorts if co["s"] == m and co["t"] == "SM")
        refN_SA = sum(co["refN"] for co in cohorts if co["s"] == m and co["t"] == "SA")
        rcm_issue = refN_SM * arpa * n("PART.REF_FREE_MONTHS")
        rcm_apply = max(0, min(st["rcm"] + rcm_issue, inv_sm))
        st["rcm"] += rcm_issue - rcm_apply
        st["rca_issue"][m] = refN_SA * (1 - r_ref) * arpa * (1 - ad) * n("PART.REF_FREE_MONTHS")
        rca_apply = st["rca_issue"].get(m - 12, 0) * (1 - nr) if m > 12 else 0
        L_ = int(n("PART.REF_RELEASE_LAG"))
        if m - L_ >= 1:
            rsm = sum(co["refN"] for co in cohorts if co["s"] == m - L_ and co["t"] == "SM")
            rsa = sum(co["refN"] for co in cohorts if co["s"] == m - L_ and co["t"] == "SA")
            rr_release = (rsm * (1 - churn) ** L_ + rsa * (1 - r_ref)) * n("PART.REF_CREDIT")
        else:
            rr_release = 0.0
        oth = dep_apply + rcm_apply + rca_apply
        rr_apply = max(0, min(st["rr"] + rr_release, inv_m + inv_a - oth))
        st["rr"] += rr_release - rr_apply
        billable = inv_m + inv_a + mig - oth - rr_apply
        d, ls = n("RET.DEFAULT"), n("RET.COLLECT_LAG")
        coll = billable * (1 - d) * (1 - ls) + st["bill_prev"] * (1 - d) * ls
        bad = billable * d
        st["bill_prev"] = billable
        revenue = mrr - rcm_apply - rca_apply + mig
        # affiliate commission: first-period collections of affiliate cohorts
        acc_m = sum(arpa * co["affN"] * S("SM", m - co["s"]) * X("SM", m - co["s"])
                    for co in cohorts if co["t"] == "SM" and (m - co["s"]) < n("PART.AFF_MONTHS")) * (1 - d)
        acc_a = sum(co["affN"] for co in cohorts if co["t"] == "SA" and co["s"] == m) * (1 - r_ref) * 12 * arpa * (1 - ad) * min(12, n("PART.AFF_MONTHS")) / 12
        st["aff_accr"][m] = n("PART.AFF_PCT") * (acc_m + acc_a)
        aff_paid = st["aff_accr"].get(m - int(n("PART.AFF_PAY_LAG")), 0) if m - int(n("PART.AFF_PAY_LAG")) >= 1 else 0
        # costs (cash basis as in the model's policy)
        prod = n("COST.PRODUCT") * (1 - (n("COST.PROD_CUT_PCT") if m >= mi(e["COST.PROD_CUT_DATE"]) else 0))
        staff = sum(hired[r] * rcost[r] for r in roles)
        disc_ok = 1
        if n("HIRE.DISC_GATED") == 1:
            disc_ok = 1 if pc - n("CASH.FLOOR") >= n("HIRE.DISC_COVER_M") * (n("COST.CONTENT") + n("COST.EVENTS") + n("COST.PAID")) else 0
        content = n("COST.CONTENT") * (mi(e["COST.CONTENT_START"]) <= m <= mi(e["COST.CONTENT_END"])) * disc_ok
        cfo = n("COST.CFO") * (mi(e["COST.CFO_START"]) <= m <= mi(e["COST.CFO_END"]))
        tools = n("COST.TOOLS_BASE") + n("COST.TOOLS_HEAD") * heads
        events = n("COST.EVENTS") * (m >= mi(e["COST.EVENTS_START"])) * disc_ok
        paid = n("COST.PAID") * (m >= mi(e["COST.PAID_START"])) * disc_ok
        one = (n("COST.LEGAL_SETUP") * (m == mi(e["COST.LEGAL_DATE"])) + n("COST.WEBSITE") * (m == mi(e["COST.WEBSITE_DATE"]))
               + n("COST.DEMO") * (m == mi(e["COST.DEMO_DATE"])) * disc_ok)
        ins_m = mi(e["COST.INSURANCE_START"])
        ins = n("COST.INSURANCE") * (m >= ins_m and (m - ins_m) % 12 == 0)
        raise_legal = n("FUND.LEGAL") * (m == fund_m and n("FUND.AMT") > 0)
        acct = n("COST.ACCT")
        var = firms * n("COST.VAR_FIRM")
        card = coll * n("COST.CARD_PCT") + (cnt_m + cnt_a) * n("COST.CARD_FIXED")
        cont = n("COST.CONTINGENCY") * (staff + content + cfo + tools + events + paid + one + ins + raise_legal + acct)
        cash_costs = (prod + n("COST.FOUNDER_PAY") + staff + content + cfo + tools + events + paid + one + ins + raise_legal
                      + acct + var + card + cont + aff_paid)
        ocf = coll + dep_recv - dep_ref - refunds - cash_costs
        fin = ((n("FUND.AMT") * (1 - n("FUND.FEE_PCT")) - (n("FUND.FEE_FIXED") if n("FUND.AMT") > 0 else 0)) * (m == fund_m)
               + n("FUND.BRIDGE_AMT") * (m == bridge_m) + n("FUND.GOV_AMT") * (m == gov_m))
        cash = cash + ocf + fin
        out.append(dict(m=m, firms=firms, mrr=mrr, revenue=revenue, collections=coll, ocf=ocf, cash=cash))
        hist["firms"].append(firms)
        hist["cash"].append(cash)
        hist["onb_over"].append(onb_over)
        hist["of"].append(of)
        hist["ot"].append(ot)
    return out


if __name__ == "__main__":
    path, case = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "BASE")
    for r in run(effective(path, case)):
        if r["m"] in (6, 12, 18, 24, 36):
            print(r["m"], {k: round(v, 2) for k, v in r.items() if k != "m"})
