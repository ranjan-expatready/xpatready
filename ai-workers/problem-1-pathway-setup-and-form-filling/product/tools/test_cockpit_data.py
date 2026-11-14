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

    def test_r1_title_token_match(self):
        self.assertTrue(cd.title_has("runtime: PF-3 — platform tables", "PF-3"))
        self.assertTrue(cd.title_has("screens: C7.6 — BK-18 (QA-448)", "BK-18"))   # anywhere in the title (R1)
        self.assertFalse(cd.title_has("runtime: PF-4t — x", "PF-4"))
        self.assertFalse(cd.title_has("runtime: PF-4b — x", "PF-4"))
        self.assertFalse(cd.title_has("forms: BK-18 — x", "BK-1"))
        self.assertFalse(cd.title_has("runtime: XPF-4 — x", "PF-4"))
        self.assertTrue(cd.title_has("runtime: PF-4. done", "PF-4"))
        self.assertTrue(cd.is_records({"title": "lead: STATE trim (records only)", "labels": []}))
        self.assertTrue(cd.is_records({"title": "qa: retests", "labels": [{"name": "records"}]}))
        self.assertFalse(cd.is_records({"title": "lead: tool", "labels": []}))

    def test_r1_records_pr_never_counts(self):
        pulls = jread(os.path.join(FIX, "github/pulls.json"))
        pulls[0]["title"] = "runtime: PF-1 — first platform part (records only)"
        _, c = run(snap_with({"github/pulls.json": pulls}))
        self.assertNotIn(1, {r["map"] for r in c["rows"] if r["built"]})     # PF-1 has no other PR: row 1 is not built
        self.assertEqual(c["pace"]["merged_changes"]["value"], 7)

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
        # Change dates (IST): PF-1 14, PF-2 16 (15 Nov 20:00 UTC), PF-4 16, PF-3 18 (#103, the id anywhere, R1), FO-4 18 (#118),
        # BK-1 10, BK-2 13, BK-3 20; BK-4 is not cited (R5); FO-5's merge is after taken_at.
        # days since 13 Nov = 7, window 14..20 Nov: 1+0+2+0+2+0+1 = 6 → 6/7 = 0.857 → 0.86
        y = self.c["pace"]["changes_per_day"]
        self.assertEqual((y["value"], y["window_days"], y["merged_in_window"]), (0.86, 7, 6))
        self.assertEqual(self.c["pace"]["merged_changes"]["value"], 8)

    def test_remaining_scope(self):
        # shaped rows 1,2,4,6,7,8: unmerged part FO-1 = 1; not shaped: row 3 (PF-4 merged) 3-1 = 2, row 5: 3 → 5; total 6
        r = self.c["pace"]["remaining"]
        self.assertEqual((r["value"], r["shaped_unmerged"], r["unshaped_rows"], r["unshaped_estimate"]), (6, 1, 2, 5))
        self.assertNotIn("flags_bk_unmerged", r)
        self.assertEqual(r["label"], "estimate: 2 unshaped capabilities × 3 (P-586 (4), settled 19 Nov)")

    def test_built_and_proven(self):
        built = {r["map"]: r["built"] for r in self.c["rows"] if r["built"]}
        self.assertEqual(built, {1: "2026-11-14", 2: "2026-11-18", 7: "2026-11-20", 8: "2026-11-18"})
        self.assertEqual(self.c["pace"]["built"]["value"], 4)
        self.assertEqual(self.c["pace"]["built"]["built_before"]["maps"], [6])
        self.assertIsNone(self.c["pace"]["proven"]["value"])
        self.assertIn("no qa id column", self.c["pace"]["proven"]["reason"])

    def test_burnup(self):
        b = self.c["burnup"]
        self.assertEqual(b["days"][0], "2026-11-13")
        self.assertEqual(b["built"], [0, 1, 1, 1, 1, 3, 3, 4])
        self.assertEqual(b["scope"], [None, None, None, None, None, 8, 8, 8])   # history lines 18, 19 Nov; today 8
        self.assertEqual(b["x_end"], "2026-12-05")                               # later of H1 to (3 Dec) and the 85% date

    def test_forecast_inputs_and_pinned_dates(self):
        f = self.c["forecast"]
        self.assertEqual(f["counts"], [0, 0, 0, 1, 0, 0, 1, 1, 0, 2, 0, 2, 0, 1])   # 7..20 Nov
        self.assertEqual(f["sample"], "Release 1 changes merged per IST day, last 14 days")
        # pinned under seed 596 (regression; the deterministic cases below are worked by hand)
        self.assertEqual((f["p50"]["value"], f["p85"]["value"]), ("2026-11-30", "2026-12-05"))

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
        self.assertEqual(p["changes_needed_per_day"]["value"], 0.3)        # 6 ÷ 20 days (20 Nov → 10 Dec)
        self.assertEqual(p["light"]["state"], "green")                     # 5 Dec ≤ 10 Dec
        self.assertEqual(with_h1(kind="committed", date="2026-12-01", date_to=None, tolerance_days=0)["light"]["state"], "amber")  # 5 Dec ≤ 1 Dec + 7
        self.assertEqual(with_h1(kind="committed", date="2026-11-25", date_to=None, tolerance_days=0)["light"]["state"], "red")
        self.assertEqual(with_h1(kind="committed", date="2026-12-10", date_to=None)["light"]["state"], "grey")   # no tolerance yet

    def test_r2_under_five_days_not_measured(self):
        _, c = run(now=datetime(2026, 11, 16, 6, 30, tzinfo=timezone.utc))
        self.assertIsNone(c["pace"]["changes_per_day"]["value"])
        self.assertIn("3 of 5 days", c["pace"]["changes_per_day"]["reason"])
        for k in ("p50", "p85"):    # R2: no reference class
            self.assertIsNone(c["forecast"][k]["value"])
            self.assertEqual(c["forecast"][k]["reason"], "not measured: fewer than 5 days of Release 1 history (from 18 Nov)")
        self.assertEqual(c["forecast"]["sample"], "Release 1 changes merged per IST day, last 14 days")
        # Release 1 changes by 16 Nov 12:00 IST, per IST day 3..16 Nov: 10 BK-1, 13 BK-2, 14 PF-1, 16 PF-2 and PF-4
        self.assertEqual(c["forecast"]["counts"], [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 2])
        self.assertEqual(c["pace"]["light"]["state"], "grey")

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
        # briefs: FO-2, FO-4, FO-55, BK-6. FO-4 is merged (#118); FO-55 has no BACKLOG row (and is never FO-5's brief);
        # FO-2 and BK-6 wait on nothing → ready
        self.assertEqual(self.k["ready_rows"]["rows"], ["FO-2", "BK-6"])
        self.assertEqual(self.k["ready_rows"]["not_ready"], [])
        self.assertEqual(self.k["room"]["value"], 2)         # max_lanes 4 − 2

    def test_queues_and_constraint(self):
        st = self.k["stages"]
        self.assertEqual((st["review"]["count"]["value"], st["review"]["wait_h"]["value"]), (1, 3.5))   # #105, head 03:00 UTC
        self.assertEqual((st["merge"]["count"]["value"], st["merge"]["wait_h"]["value"]), (1, 0.5))     # #116, labelled 06:00
        self.assertEqual(st["qa"]["count"]["value"], 4)       # built rows 1, 2, 7, 8, none qa Works
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
        # qa waits: rows 2 and 8 (built 18 Nov 00:00 IST → 60 h), 7 (12 h); 60/24 = 2.5 > review 3.5/2 = 1.75 → qa
        self.assertEqual(c["capacity"]["stages"]["qa"]["wait_h"]["value"], 60.0)
        self.assertEqual(c["capacity"]["constraint"]["line"], "More lanes won't help now: the constraint is qa (wait 60.0 h).")


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
        self.assertEqual(c0["trust"]["status_disagreements"], [{"map": 2, "checklist": "Shaped", "computed": "built"},
                                                               {"map": 8, "checklist": "Shaped", "computed": "built"}])

    def test_missing_backlog_id_and_works_row(self):
        ck = cd.Snap(FIX).file("MVP-CHECKLIST.md").replace("| 8 | Cap eight | Front office | FO-4 | Shaped |", "| 8 | Cap eight | Front office | FO-4, ZZ-1, FO-99 | Shaped |")
        ck = ck.replace("C6.2 Works | qa Works", "C7.2 Partial | qa Works")
        _, c = run(snap_with({CKP: ck}))
        inv = {i["name"]: i for i in c["trust"]["invariants"]}
        self.assertEqual(inv["Every id a Shaped row cites exists in BACKLOG (R4)"]["detail"], "missing in BACKLOG.md: FO-99 (row 8), ZZ-1 (row 8)")
        self.assertFalse(inv["Every qa Works row names a qa capability that reads Works on main"]["ok"])

    def test_reconcile_compare(self):
        _, c = run()
        k = c["keys"]
        theirs = {"numbers": {n: {"value": v} for n, v in k.items() if not n.startswith("mc_")},
                  "mc_inputs": {"daily_counts": k["mc_daily_counts"], "remaining_scope": k["mc_remaining_scope"]}}
        self.assertEqual(cd.reconcile_compare(k, theirs, None)["state"], "agree")
        t2 = json.loads(json.dumps(theirs))
        plus = lambda n: (date.fromisoformat(k["forecast_p85_date"]) + timedelta(days=n)).isoformat()
        r7 = cd.reconcile_compare(k, theirs, None)
        self.assertEqual(r7["compared"], 13)                                  # R7: the contract's 11 numbers + mc_inputs' two
        t2["numbers"]["forecast_p85_date"]["value"] = plus(1)                 # +1 day: agrees
        self.assertEqual(cd.reconcile_compare(k, t2, None)["state"], "agree")
        t2["numbers"]["forecast_p85_date"]["value"] = plus(2)                 # +2 days: disagrees
        t2["numbers"]["built_rows"]["value"] = 5
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


class Rulings(unittest.TestCase):
    def test_r3_dependency_clauses(self):
        self.assertEqual(cd.row_deps("| X | a | b · *Waits on:* PF-4 merged · c |"), (["PF-4"], []))
        self.assertEqual(cd.row_deps("| X | text, waits on FO-1a; the rest |"), (["FO-1a"], []))
        self.assertEqual(cd.row_deps("| X | **waits on:** contract v0 · decisions: none |"), ([], ["contract v0"]))
        self.assertEqual(cd.row_deps("| X | **waits on:** nothing · decisions: none (licences: no counsel) |"), ([], []))
        self.assertEqual(cd.row_deps("| X | Waits on `ClientMergePort` for the client part only |"),
                         ([], ["for client part only"]))

    def test_r3b_tighter_clause(self):
        # filler words, punctuation and #numbers never block
        self.assertEqual(cd.row_deps("| X | **waits on:** PF-4 and PF-4b, both merged (PR #1744) · decisions: none |"), (["PF-4", "PF-4b"], []))
        self.assertEqual(cd.row_deps("| X | **waits on:** FO-9b (merged rows) · y |"), (["FO-9b"], []))
        self.assertEqual(cd.row_deps("| X | **waits on:** PF-4 (the guard sets the firm), FO-1a · z |"), (["PF-4", "FO-1a"], []))
        # a labelled field ends the clause
        self.assertEqual(cd.row_deps("| X | **waits on:** PF-3 decisions: the founder's account |"), (["PF-3"], []))
        # "after": ids only when a row id is within its next 3 tokens; leftover text never blocks
        self.assertEqual(cd.row_deps("| X | runs right after FO-7a merged. More |"), (["FO-7a"], []))
        self.assertEqual(cd.row_deps("| X | **(after the Bake; from #1612)** text |"), ([], []))
        self.assertEqual(cd.row_deps("| X | schema baton after it moves on to the end, FO-5 |"), ([], []))   # FO-5 is 7 tokens on

    def test_r3c_brackets_backticks_filler_and_done_when(self):
        self.assertEqual(cd.row_deps("| X | **waits on:** FO-5 (`FilesPort`), PF-14 (the day-15 job) · d |"), (["FO-5", "PF-14"], []))
        self.assertEqual(cd.row_deps("| X | waits on: nobody; no |"), ([], []))
        self.assertEqual(cd.row_deps("| X | waits on PF-3 (contract v0 first) |"), (["PF-3"], []))         # ids in brackets still count
        hdr = ["", "#", "Area", "Item", "Done when (beyond the standard)", "Source · waits on · decisions", ""]
        line = "| FO-2 | lane | **Row** | a pack check; waits on the demo | src · **waits on:** PF-1 · decisions: none |"
        self.assertEqual(cd.row_deps(cd.dep_text(line, hdr)), (["PF-1"], []))   # the Done-when "waits on the demo" is not read
        self.assertEqual(cd.row_deps(line), (["PF-1"], ["demo"]))
        bl = cd.parse_backlog("## Rows\n| # | Area | Item | Done when | Source |\n|---|---|---|---|---|\n" + line + "\n")
        self.assertEqual(cd.row_deps(bl["deps"]["FO-2"]), (["PF-1"], []))

    def test_r3d_ids_in_brackets_and_map_numbers(self):
        self.assertEqual(cd.row_deps("| X | **waits on:** the port (`PF-24`) and (FO-9b) · d |"), (["PF-24", "FO-9b"], ["port"]))
        self.assertEqual(cd.row_deps("| X | **waits on:** map rows 48 and 49, FO-2 · d |"), (["FO-2"], []))
        self.assertEqual(cd.row_deps("| X | waits on map 62; z |"), ([], []))
        self.assertEqual(cd.row_deps("| X | waits on the map of fees; z |"), ([], ["map of fees"]))   # "map" without numbers still blocks
        hdr = ["", "#", "Area", "Item", "Done when", "Source · waits on · decisions", ""]
        self.assertEqual(cd.row_deps(cd.dep_text("| PF-9 | a | b | c | src · **waits on:** PF-4 · decisions: none |", hdr)), (["PF-4"], []))   # last column read

    def test_r3_non_id_dependency_blocks_ready(self):
        bl = cd.Snap(FIX).file("BACKLOG.md")
        bl = bl.replace("| FO-2 | lane | **Row FO-2:** a fixture row · **waits on:** nothing ·",
                        "| FO-2 | lane | **Row FO-2:** a fixture row · **waits on:** contract v0 ·")
        bl = bl.replace("**Row BK-6:** a fixture row; brief: briefs/BK-6 · **waits on:** nothing",
                        "**Row BK-6:** a fixture row; brief: briefs/BK-6 · *Waits on:* FO-1 merged")
        self.assertIn("contract v0", bl)
        self.assertIn("FO-1 merged", bl)
        _, c = run(snap_with({"files/" + cd.REL + "/BACKLOG.md": bl}))
        q = c["capacity"]["ready_rows"]
        self.assertEqual(q["rows"], [])
        self.assertEqual(q["not_ready"], [{"id": "FO-2", "waits_on": [], "non_id": ["contract v0"]},
                                          {"id": "BK-6", "waits_on": ["FO-1"], "non_id": []}])

    def test_r1b_ready_counts_any_merged_pr(self):
        # BK-5's only PR (#112) is not app code: not a change (R1b), but merged for readiness, so a row waiting on it is ready
        bl = cd.Snap(FIX).file("BACKLOG.md").replace("**Row BK-6:** a fixture row; brief: briefs/BK-6 · **waits on:** nothing",
                                                    "**Row BK-6:** a fixture row; brief: briefs/BK-6 · **waits on:** BK-5")
        self.assertIn("waits on:** BK-5", bl)
        ck = cd.Snap(FIX).file("MVP-CHECKLIST.md").replace("| BK-1 to BK-3 |", "| BK-1 to BK-3, BK-5 |")
        _, c = run(snap_with({"files/" + cd.REL + "/BACKLOG.md": bl, CKP: ck}))
        self.assertEqual(c["capacity"]["ready_rows"]["rows"], ["FO-2", "BK-6"])
        self.assertEqual(c["pace"]["merged_changes"]["value"], 8)              # BK-5 is cited but has no app-code merge
        self.assertNotIn(7, {r["map"] for r in c["rows"] if r["built"]})       # so row 7 is not built

    def test_r4_missing_id_in_unshaped_row_is_a_part(self):
        ck = cd.Snap(FIX).file("MVP-CHECKLIST.md").replace("| FO-2, FO-3 named only | Not shaped |", "| FO-2, FO-3 named only; FO-77 | Not shaped |")
        _, c = run(snap_with({CKP: ck}))
        self.assertTrue(all(i["ok"] for i in c["trust"]["invariants"]))
        self.assertEqual(c["pace"]["remaining"]["value"], 6)                  # row 5: still 3 - 0 merged parts

    def test_r5b_counts_exactly_the_cited_bk_ids(self):
        # the cited BK ids are BK-1, BK-2, BK-3 (row 7's range); BK-4 (#110), BK-5 and BK-6 are in BACKLOG but not cited
        _, c = run()
        r1 = {x for r in c["rows"] for x in r["ids"] if x.startswith("BK-")}
        self.assertEqual(r1, {"BK-1", "BK-2", "BK-3"})
        self.assertEqual(c["forecast"]["counts"][3], 1)                       # 10 Nov: BK-1 only

    def test_r5_bake_rows_count_only_when_cited(self):
        _, c = run()
        self.assertEqual(c["pace"]["merged_changes"]["value"], 8)             # BK-4 (#110) is merged but not cited
        ck = cd.Snap(FIX).file("MVP-CHECKLIST.md").replace("| BK-1 to BK-3 |", "| BK-1 to BK-4 |")
        _, c2 = run(snap_with({CKP: ck}))
        self.assertEqual(c2["pace"]["merged_changes"]["value"], 9)

    def test_r6_health_exception(self):
        ex = [{"bug": "QA-9", "decision": "P-358", "reason": "the ruling: does not hold C6.2"}]
        s = cd.Snap(snap_with({"files/" + cd.REL + "/cockpit/health-exceptions.json": ex}))
        comp = cd.compute_board(s, NOW, fixture_history(), None, "not checked: test")
        h = cd.health(s, NOW, comp, s.j("lead-input.json"))
        six = h["items"][5]
        self.assertEqual(six["state"], "green")
        self.assertIn("QA-9 excluded by P-358", six["detail"])
        self.assertEqual(six["excluded"], ["QA-9 excluded by P-358"])


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
