#!/usr/bin/env python3
"""Unit tests for tools/cockpit-data.py (P-596, spec §6.3). Standard library unittest; jsonschema for the contract.
Every expected number below is worked by hand from the fixture snapshot tools/fixtures/cockpit/snapshot/ (taken
2026-11-20 12:00 IST = 06:30 UTC); the working is written next to each assertion.
Run: python3 -m unittest product/tools/test_cockpit_data.py   (or: python3 product/tools/test_cockpit_data.py)"""
import importlib.util, json, os, shutil, subprocess, sys, tempfile, unittest
from datetime import date, datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("cockpit_data", os.path.join(HERE, "cockpit-data.py"))
cd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cd)
FIX = os.path.join(HERE, "fixtures", "cockpit", "snapshot")
NOW = datetime(2026, 11, 20, 6, 30, tzinfo=timezone.utc)          # = meta.taken_at, 12:00 IST
CKP = "files/" + cd.REL + "/MVP-CHECKLIST.md"


def jread(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def snap_with(changes=None, drop=()):
    """A temporary copy of the fixture snapshot with some files replaced (text or JSON object) or removed."""
    d = tempfile.mkdtemp(prefix="cockpit-fix-")
    shutil.copytree(FIX, d, dirs_exist_ok=True)
    for rel, v in (changes or {}).items():
        p = os.path.join(d, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(v if isinstance(v, str) else json.dumps(v))
    for rel in drop:
        os.remove(os.path.join(d, rel))
    return d


def fixture_history():
    s = cd.Snap(FIX)
    return cd.read_history(s.file("cockpit/history.jsonl"))


def run(snapdir=FIX, now=NOW, history=None, rec=None, note="not checked: test"):
    s = cd.Snap(snapdir)
    comp = cd.compute_board(s, now, fixture_history() if history is None else history, rec, note)
    return s, comp


class Parsers(unittest.TestCase):
    def test_cell_ids_ranges_and_boundaries(self):
        self.assertEqual(cd.cell_ids("C7.1 Works; BK-10, BK-16, BK-22 to BK-24"), ["BK-10", "BK-16", "BK-22", "BK-23", "BK-24"])
        self.assertEqual(cd.cell_ids("PF-4 (In PR #1744), PF-4b, PF-4s"), ["PF-4", "PF-4b", "PF-4s"])
        self.assertEqual(cd.cell_ids("PF-L (libraries); **none yet**"), ["PF-L"])
        self.assertEqual(cd.cell_ids("C8.2 Partial; BK-17, B5-filings"), ["BK-17", "B5-filings"])   # B5-filings is a BACKLOG row
        self.assertEqual(cd.cell_ids("FO-6v (held, P-561); QA-449"), ["FO-6v"])                   # decision and bug ids are not rows

    def test_title_id(self):
        self.assertEqual(cd.title_id("runtime: PF-3 — platform tables"), "PF-3")
        self.assertEqual(cd.title_id("PF-3: platform tables"), "PF-3")
        self.assertIsNone(cd.title_id("screens: C7.6 — BK-18 (QA-448)"))       # N2: the id must start the title
        self.assertEqual(cd.loose_title_id("screens: C7.6 — BK-18 (QA-448)"), "BK-18")
        self.assertEqual(cd.title_id("runtime: PF-4b — x"), "PF-4b")
        self.assertIsNone(cd.title_id("lead: PF-3 records"))                     # records titles never count
        self.assertIsNone(cd.title_id("merge queue: merged #1: runtime: PF-3 — x"))

    def test_brief_id_never_matches_a_longer_id(self):
        self.assertEqual(cd.brief_id("FO-1a.md"), "FO-1a")
        self.assertEqual(cd.brief_id("FO-2-sales.md"), "FO-2")
        self.assertEqual(cd.brief_id("FO-55.md"), "FO-55")       # the glob FO-5*.md would have counted it for FO-5
        self.assertIsNone(cd.brief_id("README.md"))

    def test_git_blob_sha_equals_git(self):
        self.assertEqual(cd.git_blob_sha("hello\n"), "ce013625030ba8dba906f756967f9e9ca394464a")

    def test_needs_you_drops_decided_asks(self):
        asks, _, _ = cd.state_needs(cd.Snap(FIX).file("STATE.md"))
        self.assertEqual([a["id"] for a in asks], ["A2"])   # A1 decided, A3 done

    def test_works_counts_m4(self):
        caps = cd.parse_caps(cd.Snap(FIX).text("files_main/qa/CAPABILITIES.md"))
        self.assertEqual(cd.works_count(caps), (2, 4))       # C6.2, C7.1 Works; C7.2 Partial; C9.1 M4; Parked row left out


class Pace(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s, cls.c = run()

    def test_changes_per_day(self):
        # Change dates (IST): PF-1 14, PF-2 16 (15 Nov 20:00 UTC), PF-4 16, PF-3 19 (#111; #103 does not start with PF-3),
        # BK-1 10, BK-2 13, BK-3 20, BK-4 19 (Flags BK row); BK-5's PR has no app code; FO-5's merge is after taken_at.
        # days since 13 Nov = 7, window 14..20 Nov: 1+0+2+0+0+2+1 = 6 → 6/7 = 0.857 → 0.86
        y = self.c["pace"]["changes_per_day"]
        self.assertEqual((y["value"], y["window_days"], y["merged_in_window"]), (0.86, 7, 6))
        self.assertEqual(self.c["pace"]["merged_changes"]["value"], 8)

    def test_remaining_scope(self):
        # shaped rows 1,2,4,6,7,8: unmerged parts FO-1, FO-4 = 2; not shaped: row 3 (PF-4 merged) 3-1 = 2, row 5: 3 → 5; total 7
        r = self.c["pace"]["remaining"]
        self.assertEqual((r["value"], r["shaped_unmerged"], r["unshaped_rows"], r["unshaped_estimate"]), (7, 2, 2, 5))
        self.assertEqual(r["flags_bk_unmerged"]["ids"], ["BK-5", "BK-6"])
        self.assertEqual(r["label"], "estimate: 2 unshaped capabilities × 3 (P-586 (4), settled 19 Nov)")

    def test_built_and_proven(self):
        built = {r["map"]: r["built"] for r in self.c["rows"] if r["built"]}
        self.assertEqual(built, {1: "2026-11-14", 2: "2026-11-19", 7: "2026-11-20"})
        self.assertEqual(self.c["pace"]["built"]["value"], 3)
        self.assertEqual(self.c["pace"]["built"]["built_before"]["maps"], [6])
        self.assertIsNone(self.c["pace"]["proven"]["value"])
        self.assertIn("no qa id column", self.c["pace"]["proven"]["reason"])

    def test_burnup(self):
        b = self.c["burnup"]
        self.assertEqual(b["days"][0], "2026-11-13")
        self.assertEqual(b["built"], [0, 1, 1, 1, 1, 1, 2, 3])
        self.assertEqual(b["scope"], [None, None, None, None, None, 8, 8, 8])   # history lines 18, 19 Nov; today 8
        self.assertEqual(b["x_end"], "2026-12-07")                               # later of H1 to (3 Dec) and the 85% date

    def test_forecast_inputs_and_pinned_dates(self):
        f = self.c["forecast"]
        self.assertEqual(f["counts"], [0, 0, 0, 1, 0, 0, 1, 1, 0, 2, 0, 0, 2, 1])   # 7..20 Nov
        self.assertEqual(f["sample"], "Release 1 changes merged per IST day, last 14 days")
        # pinned under seed 596 (regression; the deterministic cases below are worked by hand)
        self.assertEqual((f["p50"]["value"], f["p85"]["value"]), ("2026-12-02", "2026-12-07"))

    def test_no_committed_date_line_and_grey_light(self):
        p = self.c["pace"]
        self.assertIsNone(p["changes_needed_per_day"]["value"])
        self.assertEqual(p["changes_needed_per_day"]["reason"], "not measured: no committed date yet (set 2026-11-19)")
        self.assertEqual(p["light"]["state"], "grey")

    def test_committed_date_light_and_x(self):
        base = json.loads(cd.Snap(FIX).file("cockpit/plan.json"))

        def with_h1(**kw):
            pl = json.loads(json.dumps(base))
            pl["dates"][0].update(kw)
            return run(snap_with({"files/" + cd.REL + "/cockpit/plan.json": pl}))[1]["pace"]
        p = with_h1(kind="committed", date="2026-12-08", date_to="2026-12-10", tolerance_days=0)
        self.assertEqual(p["changes_needed_per_day"]["value"], 0.35)       # 7 ÷ 20 days (20 Nov → 10 Dec)
        self.assertEqual(p["light"]["state"], "green")                     # 7 Dec ≤ 10 Dec
        self.assertEqual(with_h1(kind="committed", date="2026-12-01", date_to=None, tolerance_days=0)["light"]["state"], "amber")  # 7 Dec ≤ 1 Dec + 7
        self.assertEqual(with_h1(kind="committed", date="2026-11-25", date_to=None, tolerance_days=0)["light"]["state"], "red")
        self.assertEqual(with_h1(kind="committed", date="2026-12-10", date_to=None)["light"]["state"], "grey")   # no tolerance yet

    def test_under_five_days_uses_reference_class(self):
        _, c = run(now=datetime(2026, 11, 16, 6, 30, tzinfo=timezone.utc))
        self.assertIsNone(c["pace"]["changes_per_day"]["value"])
        self.assertIn("3 of 5 days", c["pace"]["changes_per_day"]["reason"])
        self.assertEqual(c["forecast"]["sample"], "reference class: all app rows, not only Release 1")
        # app PRs (not records) merged by 16 Nov 12:00 IST, per IST day 3..16 Nov: 10:#107 12:#114 13:#108 14:#101 16:#102,#104
        self.assertEqual(c["forecast"]["counts"], [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 2])

    def test_all_zero_window(self):
        pulls = [p for p in jread((os.path.join(FIX, "github/pulls.json"))) if not p.get("merged_at")
                 or p["merged_at"] < "2026-11-06T00:00:00Z"]
        _, c = run(snap_with({"github/pulls.json": pulls}))
        self.assertEqual(c["forecast"]["counts"], [0] * 14)
        self.assertIsNone(c["forecast"]["p85"]["value"])
        self.assertEqual(c["forecast"]["p85"]["reason"], "not measured: no merges in 14 days")
        self.assertEqual(c["pace"]["light"]["state"], "red")

    def test_zero_history(self):
        _, c = run(history=[])
        self.assertEqual(c["burnup"]["scope"], [None] * 7 + [8])
        self.assertTrue(all(i["ok"] for i in c["trust"]["invariants"]))
        self.assertIsNone(c["history_prev"])


class MonteCarlo(unittest.TestCase):
    def test_constant_throughput_is_exact(self):
        # 2 a day, 8 to do: every run needs exactly 4 days → 20 Nov + 4 = 24 Nov for both
        self.assertEqual(cd.monte_carlo([2] * 14, 8, date(2026, 11, 20)), {"p50": "2026-11-24", "p85": "2026-11-24", "reason": None})

    def test_nothing_remaining(self):
        self.assertEqual(cd.monte_carlo([1] * 14, 0, date(2026, 11, 20))["p85"], "2026-11-20")

    def test_cap_beyond_a_year(self):
        self.assertEqual(cd.monte_carlo([0] * 13 + [1], 1000, date(2026, 11, 20), runs=200)["p85"], "beyond 1 year")

    def test_same_seed_same_dates(self):
        a = cd.monte_carlo([0, 1, 2, 0, 3] + [1] * 9, 30, date(2026, 11, 20))
        self.assertEqual(a, cd.monte_carlo([0, 1, 2, 0, 3] + [1] * 9, 30, date(2026, 11, 20)))


class Capacity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s, cls.c = run()
        cls.k = cls.c["capacity"]

    def test_lanes_ready_room(self):
        # pushed since 05:00 UTC, not main or queue: claude/bk-6 (06:00), lead/fixture (06:10) → 2
        self.assertEqual(self.k["lanes_working"]["value"], 2)
        # ready: FO-2, FO-4, FO-5, BK-6 (BK-5 is done by #112, a non-app PR); with a brief: FO-2, FO-4, BK-6 (FO-55's brief is not FO-5's)
        self.assertEqual(self.k["ready_rows"]["rows"], ["FO-2", "FO-4", "BK-6"])
        self.assertEqual(self.k["ready_rows"]["ready_without_brief"], ["FO-5"])
        self.assertEqual(self.k["room"]["value"], 2)         # max_lanes 4 − 2

    def test_queues_and_constraint(self):
        st = self.k["stages"]
        self.assertEqual((st["review"]["count"]["value"], st["review"]["wait_h"]["value"]), (1, 3.5))   # #105, head 03:00 UTC
        self.assertEqual((st["merge"]["count"]["value"], st["merge"]["wait_h"]["value"]), (1, 0.5))     # #116, labelled 06:00
        self.assertEqual(st["qa"]["count"]["value"], 3)       # built rows 1, 2, 7, none qa Works
        self.assertEqual(self.k["constraint"]["stage"], "unknown")
        self.assertEqual(self.k["constraint"]["line"], "Constraint unknown: qa wait not measured.")

    def test_age(self):
        # cycle days (14 days, app, not records): 1,0.5,1,2,1,1,1,1,0.333,1,1 → sorted, nearest rank 85% = 10th = 1.0
        self.assertEqual(self.k["age"]["p85_days"]["value"], 1.0)
        self.assertEqual(self.k["cycle_median_days"]["value"], 1.0)
        ages = {i["pr"]: (i["age_d"], i["older"], i["amber"]) for i in self.k["age"]["items"]}
        self.assertEqual(ages, {105: (1.92, True, False), 115: (19.27, True, True), 116: (1.02, True, False)})
        self.assertEqual(self.k["age"]["older"]["value"], 3)
        self.assertEqual(self.k["wip"]["value"], 3)
        self.assertEqual(self.k["light"]["state"], "amber")
        self.assertEqual([i["pr"] for i in self.k["idle"]], [105, 115, 116])

    def test_constraint_rules(self):
        lim = {"review": (1.0, 1), "merge": (None, 0), "qa": (None, 0)}
        self.assertEqual(cd.constraint(2, 3, 1, lim, False, 0)["line"], "2 lanes working · 3 rows ready with nobody on them → could add 1 lanes.")
        self.assertEqual(cd.constraint(2, 3, None, lim, False, 0)["add"], None)
        self.assertEqual(cd.constraint(2, 3, 5, {"review": (2.5, 1), "merge": (0.2, 1), "qa": (None, 0)}, False, 0)["line"],
                         "More lanes won't help now: the constraint is review (wait 2.5 h).")
        self.assertEqual(cd.constraint(2, 0, 5, {"review": (None, 0), "merge": (None, 0), "qa": (None, 0)}, False, 0)["stage"], "none")
        self.assertEqual(cd.constraint(2, 3, 5, lim, True, 2)["stage"], "unknown")

    def test_qa_column_makes_proven_and_qa_wait(self):
        ck = cd.Snap(FIX).file("MVP-CHECKLIST.md").replace("| Map | Capability | Module | BACKLOG rows | Status |",
                                                           "| Map | Capability | Module | BACKLOG rows | Status | qa id |")
        ck = ck.replace("| 1 | Cap one | Platform | PF-1 | Merged |", "| 1 | Cap one | Platform | PF-1 | Merged | C7.1 |")
        ck = ck.replace("| 6 | Cap six | Case side | C6.2 Works | qa Works\\* |", "| 6 | Cap six | Case side | C6.2 Works | qa Works\\* | C6.2 |")
        _, c = run(snap_with({CKP: ck}))
        proven = {r["map"]: r["proven"] for r in c["rows"] if r["proven"]}
        self.assertEqual(proven, {1: "2026-11-18", 6: "2026-11-15"})   # C7.1 Works from bbb222 (18 Nov), C6.2 from aaa111
        self.assertEqual(c["pace"]["proven"]["value"], 2)
        # qa waits: rows 2 (built 19 Nov → 36 h) and 7 (12 h); 36/24 = 1.5 < review 3.5/2 = 1.75 → review
        self.assertEqual(c["capacity"]["stages"]["qa"]["wait_h"]["value"], 36.0)
        self.assertEqual(c["capacity"]["constraint"]["line"], "More lanes won't help now: the constraint is review (wait 3.5 h).")


class Top3OrgToday(unittest.TestCase):
    def test_top3_ok(self):
        _, c = run()
        self.assertEqual(c["top3"]["cards"]["today"]["state"], "ok")
        self.assertEqual(c["top3"]["cards"]["month"]["needs_you"], "A2")

    def test_top3_missing_stale_example(self):
        _, c = run(snap_with(drop=["lead-input.json"]))
        self.assertEqual({k: v["state"] for k, v in c["top3"]["cards"].items()}, {"today": "missing", "week": "missing", "month": "missing"})
        self.assertEqual(c["top3"]["cards"]["today"]["text"], "Lead has not updated this")
        li = jread((os.path.join(FIX, "lead-input.json")))
        li["as_of"] = "2026-11-20T09:00:00+05:30"          # 3 h old
        _, c2 = run(snap_with({"lead-input.json": li}))
        self.assertEqual(c2["top3"]["cards"]["week"]["why"], "Lead input 3.0 h old (limit 2 h)")
        li["as_of"], li["example"] = "2026-11-20T11:30:00+05:30", True
        _, c3 = run(snap_with({"lead-input.json": li}))
        self.assertTrue(c3["top3"]["example"])

    def test_org_cross_check(self):
        _, c = run()
        seen = {l["name"]: l["seen"] for l in c["org"]["lanes"]}
        self.assertEqual(seen, {"FO-1 lane": "both", "BK-6 lane": "both", "FO-4 lane": "reported only", "qa lane": "reported only",
                                "claude/fo-7": "measured only"})   # the done lane is left out
        self.assertEqual([l["name"] for l in c["org"]["leads"]], ["Lead 50", "Lead B"])

    def test_working_today(self):
        _, c = run()
        w = c["working_today"]
        self.assertEqual(w["groups"], ["B", "C"])
        self.assertEqual(w["rows"]["4"], {"kind": "pr", "prs": [105], "class": "measured"})
        self.assertEqual(w["rows"]["8"]["kind"], "reported")
        self.assertEqual(w["line"], "Working today on: B. The firm as our customer, C. Enquiries")


class TrustAndInvariants(unittest.TestCase):
    def test_invariants_hold_on_fixture(self):
        _, c = run()
        self.assertEqual([i["name"] for i in c["trust"]["invariants"] if not i["ok"]], [])

    def test_mapping_correction(self):
        h = fixture_history()
        h[-1]["audit"]["built"] = 5                               # yesterday 5, today 3, same checklist → broken
        _, c = run(history=h)
        bad = [i["name"] for i in c["trust"]["invariants"] if not i["ok"]]
        self.assertEqual(bad, ["Cumulative built falls only with a scope or mapping change"])
        h[-1]["audit"]["checklist_sha"] = "0" * 40                 # the checklist changed: a mapping change line, no break
        _, c2 = run(history=h)
        self.assertTrue(all(i["ok"] for i in c2["trust"]["invariants"]))
        self.assertTrue(any(n.startswith("Mapping or scope change: built 5") for n in c2["trust"]["notes"]))

    def test_duplicate_row_and_two_states(self):
        ck = cd.Snap(FIX).file("MVP-CHECKLIST.md").replace("| 3 | Cap three |", "| 2 | Cap two again | Platform | PF-2 | Merged |\n| 3 | Cap three |")
        _, c = run(snap_with({CKP: ck}))
        inv = {i["name"]: i for i in c["trust"]["invariants"]}
        self.assertFalse(inv["Build rows unique"]["ok"])
        self.assertIn("2 (Shaped / Merged)", inv["Build rows unique"]["detail"])
        self.assertEqual(c["pace"]["rows_total"]["value"], 8)          # counted once
        _, c0 = run()
        self.assertEqual(c0["trust"]["status_disagreements"], [{"map": 2, "checklist": "Shaped", "computed": "built"}])

    def test_missing_backlog_id_and_works_row(self):
        ck = cd.Snap(FIX).file("MVP-CHECKLIST.md").replace("| 8 | Cap eight | Front office | FO-4 | Shaped |", "| 8 | Cap eight | Front office | FO-4, ZZ-1, FO-99 | Shaped |")
        ck = ck.replace("C6.2 Works | qa Works", "C7.2 Partial | qa Works")
        _, c = run(snap_with({CKP: ck}))
        inv = {i["name"]: i for i in c["trust"]["invariants"]}
        self.assertEqual(inv["Every cited BACKLOG id exists"]["detail"], "missing in BACKLOG.md: FO-99, ZZ-1")
        self.assertFalse(inv["Every qa Works row names a qa capability that reads Works on main"]["ok"])

    def test_reconcile_compare(self):
        _, c = run()
        k = c["keys"]
        theirs = {"numbers": {n: {"value": v} for n, v in k.items() if not n.startswith("mc_")},
                  "mc_inputs": {"daily_counts": k["mc_daily_counts"], "remaining_scope": k["mc_remaining_scope"]}}
        self.assertEqual(cd.reconcile_compare(k, theirs, None)["state"], "agree")
        t2 = json.loads(json.dumps(theirs))
        t2["numbers"]["forecast_p85_date"]["value"] = "2026-12-08"           # +1 day: agrees
        self.assertEqual(cd.reconcile_compare(k, t2, None)["state"], "agree")
        t2["numbers"]["forecast_p85_date"]["value"] = "2026-12-09"           # +2 days: disagrees
        t2["numbers"]["built_rows"]["value"] = 4
        r = cd.reconcile_compare(k, t2, None)
        self.assertEqual((r["state"], r["banner"]), ("disagree", "Numbers disagree: built_rows, forecast_p85_date"))
        r0 = cd.reconcile_compare(k, None, "not checked: tools/cockpit-reconcile.py is absent")
        self.assertEqual((r0["state"], r0["banner"]), ("not checked", "Numbers not checked"))

    def test_reconcile_absent_or_failing(self):
        self.assertEqual(cd.run_reconcile(FIX, "/nonexistent/cockpit-reconcile.py"), (None, "not checked: tools/cockpit-reconcile.py is absent"))
        bad = os.path.join(tempfile.mkdtemp(), "r.py")
        with open(bad, "w") as f:
            f.write("import sys; sys.exit(4)\n")
        out, note = cd.run_reconcile(FIX, bad)
        self.assertIsNone(out)
        self.assertTrue(note.startswith("not checked: the reconciliation exited 4"))


class Health(unittest.TestCase):
    def states(self, snapdir=FIX, rec=None, note="not checked: test"):
        s, c = run(snapdir, rec=rec, note=note)
        h = cd.health(s, NOW, c, s.j("lead-input.json"))
        return h, {i["id"]: i["state"] for i in h["items"]}

    def test_fixture_health(self):
        h, st = self.states()
        # 1 green (checks and nightly green) · 2 page · 3 green (oldest unmerged 10 h) · 4 green · 5 green (1.5 %/h, 0.5 h old)
        # 6 red (QA-9 Major on C6.2, Works, first seen 17 Nov 10:00 IST = 74 h) · 7 amber (not checked, #115 age, org "?")
        self.assertEqual(st, {1: "green", 2: "page", 3: "green", 4: "green", 5: "green", 6: "red", 7: "amber"})
        self.assertEqual(h["light"], "red")
        six = h["items"][5]
        self.assertEqual((six["detail"], six["owner"]), ("older than 48 h: QA-9", "qa lane via the current Lead"))

    def test_lead_input_missing_stale_hot(self):
        _, st = self.states(snap_with(drop=["lead-input.json"]))
        self.assertEqual(st[5], "amber")
        li = jread((os.path.join(FIX, "lead-input.json")))
        li["as_of"] = "2026-11-20T09:00:00+05:30"
        self.assertEqual(self.states(snap_with({"lead-input.json": li}))[1][5], "amber")
        li["as_of"], li["burn_pct_per_h"] = "2026-11-20T11:30:00+05:30", 3.5
        self.assertEqual(self.states(snap_with({"lead-input.json": li}))[1][5], "red")

    def test_disagreement_turns_item_7_red(self):
        _, c = run()
        theirs = {"numbers": {"built_rows": {"value": 99}}}
        _, st = self.states(rec=theirs, note=None)
        self.assertEqual(st[7], "red")

    def test_records_lag_and_failed_guard(self):
        meta = jread((os.path.join(FIX, "meta.json")))
        meta["extra"]["state_branch_oldest_unmerged_at"] = "2026-11-18T12:00:00+05:30"   # 48 h
        gr = jread((os.path.join(FIX, "github/guard_runs.json")))
        gr[1]["conclusion"] = "failure"
        _, st = self.states(snap_with({"meta.json": meta, "github/guard_runs.json": gr}))
        self.assertEqual((st[3], st[4]), ("red", "red"))


class Contract(unittest.TestCase):
    def test_cli_on_fixture_valid_and_amber_banner_without_reconcile(self):
        out = tempfile.mkdtemp()
        r = subprocess.run([sys.executable, os.path.join(HERE, "cockpit-data.py"), "--out", os.path.join(out, "data.json"),
                            "--from-snapshot", FIX, "--offline", "--no-history-write", "--reconcile", "/nonexistent/r.py"],
                           capture_output=True, text=True, timeout=300)
        self.assertEqual(r.returncode, 0, r.stderr)
        d = jread((os.path.join(out, "data.json")))
        self.assertEqual(cd.validate(d, os.path.join(cd.P, "cockpit", "data.schema.json")), [])
        self.assertEqual((d["trust"]["state"], d["trust"]["banner"]), ("not checked", "Numbers not checked"))   # amber, never green (R2-6)
        self.assertEqual(d["summary"]["works"]["v"], [2, 4])
        self.assertEqual([a["id"] for a in d["needs_you"]["asks"]], ["A2"])

    def test_schema_refuses_missing_lineage_and_null_without_reason(self):
        out = tempfile.mkdtemp()
        subprocess.run([sys.executable, os.path.join(HERE, "cockpit-data.py"), "--out", os.path.join(out, "data.json"),
                        "--from-snapshot", FIX, "--offline", "--no-history-write", "--reconcile", "/nonexistent/r.py"],
                       capture_output=True, text=True, timeout=300)
        d = jread((os.path.join(out, "data.json")))
        sch = os.path.join(cd.P, "cockpit", "data.schema.json")
        d1 = json.loads(json.dumps(d))
        del d1["pace"]["built"]["sha"]
        self.assertTrue(cd.validate(d1, sch))
        d2 = json.loads(json.dumps(d))
        del d2["pace"]["proven"]["reason"]
        self.assertTrue(cd.validate(d2, sch))
        d3 = json.loads(json.dumps(d))
        del d3["quality"]["review_rounds"]["reason"]                # a legacy number (v/src) is walked too
        self.assertTrue(cd.validate(d3, sch))

    def test_history_one_line_per_day(self):
        p = os.path.join(tempfile.mkdtemp(), "history.jsonl")
        h = fixture_history()
        cd.write_history(p, h, {"day": "2026-11-20", "rows": 8, "n": 1})
        cd.write_history(p, h, {"day": "2026-11-20", "rows": 8, "n": 2})       # the day's last refresh replaces the earlier line
        with open(p) as f:
            lines = [json.loads(x) for x in f]
        self.assertEqual([x["day"] for x in lines], ["2026-11-18", "2026-11-19", "2026-11-20"])
        self.assertEqual(lines[-1]["n"], 2)

    def test_lineage_on_every_new_number(self):
        _, c = run()
        for k in ("changes_needed_per_day", "changes_per_day", "built", "proven", "rows_total", "remaining", "merged_changes"):
            n = c["pace"][k]
            self.assertTrue(all(n.get(x) for x in ("src", "sha", "as_of", "class")), k)


if __name__ == "__main__":
    unittest.main()
