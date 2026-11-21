#!/usr/bin/env python3
"""Tests for founder-report.py (ENF-783c, founder A260, A262, A263). Runs the tool as `python3 -I` on a Sample plan and
GitHub answers (fixtures/founder-report/: cycle-timeline's Sample plus lanes, parts, AWS, reserve, outside and a dequeued
PR), cycle-timeline's Sample CAPABILITIES.md and a Sample "at 07:00" copy, with a fixed clock. US$0, no network.
  python3 -I product/tools/test_founder_report.py
"""
import os
import re
import json
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
CT = os.path.join(HERE, "fixtures", "cycle-timeline")
FR = os.path.join(HERE, "fixtures", "founder-report")
STAGES = ["--stage", "Building: 4 · 2.5 h · 3/1 · ⚠️ two drafts quiet 3 h",
          "--stage", "Merge queue + machines: 5 · 50 min · 4/2 · ❌ batch failed twice",
          "--stage", "qa proof: 3 · 1 h · 2/2 · ✅ keeping up"]
FULL = ["--needs", "nothing", "--constraint", "merge queue because 3 PRs wait 50 min → doing: requeue #14 → expect by 12:30",
        "--aws", "0", "--weekly", "71", "--rate", "2.5", "--context", "38"]


def run(*extra, plan=os.path.join(FR, "plan.json"), start=os.path.join(FR, "CAPABILITIES-at-0700.md"),
        now="2026-11-21T11:40+05:30"):
    r = subprocess.run([sys.executable, "-I", os.path.join(HERE, "founder-report.py"), "--plan", plan,
                        "--fixture", os.path.join(FR, "github.json"), "--capabilities", os.path.join(CT, "CAPABILITIES.md"),
                        "--capabilities-at-start", start, "--now", now] + list(extra), capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr


BLOCKS = [r"^🔴 Needs you: ", r"^━━ Cycle 07:00 → 07:00 IST ━━", r"^Stage\s+Items", r"^Constraint today: ",
          r"^Each capability: build → review", r"^By 19:00 \(8\):", r"^By 07:00 \(7\):", r"^Reserve / out of cycle",
          r"^Outside the 15", r"^Constraint: ",
          r"^Since last report:", r"^Money and resources: "]


def positions(out, patterns):
    lines = out.splitlines()
    return [next((i for i, l in enumerate(lines) if re.search(p, l)), None) for p in patterns]


class FounderReport(unittest.TestCase):
    def test_blocks_in_order(self):
        rc, out, err = run(*FULL, *STAGES, "--since", "✅ R1.27 proven", "--since", "🔀 #2618 merged")
        self.assertEqual(rc, 0, err)
        pos = positions(out, BLOCKS)
        self.assertNotIn(None, pos, out)
        self.assertEqual(pos, sorted(pos), out)
        self.assertTrue(out.startswith("🔴 Needs you: nothing\n"), out)
        lines = out.splitlines()
        self.assertTrue(lines[4].startswith("Proven this cycle"), lines[4])     # the figures sit right under the header
        self.assertEqual(lines[6], "```")
        self.assertTrue(lines[7].startswith("Stage "), lines[7])          # A262: the stage table before the board
        print(out)

    def test_header_numbers(self):
        _, out, _ = run(*FULL)
        # 2 rows at Works now, 0 at 07:00 -> 2 this cycle; 15 R1 rows in the Sample file; forecast 2 + R1.49 + R1.19
        # (the two on-time ETAs; R1.10's ETA passed and does not count) = 4 -> ❌
        self.assertIn("Proven this cycle  2 / 15   ·   Total  2 / 15   ·   Forecast by 07:00  4 / 15   ·   On track ❌",
                      out)

    def test_board_lines(self):
        _, out, _ = run(*FULL)
        self.assertIn("\n- done · R1.27 · Every lead carries a source · #11 (runtime) · ✅✅✅✅✅\n", out)
        self.assertIn("\n- ~13:02 · R1.49 · Consent gate before every send · #14 (runtime) · ✅✅🟡⬜⬜ · waits on Mergify batch"
                      " (merge ~12:02), then qa proof\n", out)
        self.assertIn("· R1.47 · One email layout · #16 part 1 + #17 part 2 (screens) · 🟡⬜⬜⬜⬜ · waits on builder", out)
        self.assertIn("· R1.108 · Conflict-of-interest check · #18 (runtime) · ✅🟡⬜⬜⬜ ·", out)
        self.assertRegex(out, r"R1\.32 · .* · ✅✅🟡⬜⬜ · .* no ETA\n")                    # approved, not queued
        self.assertIn("- ≤19:00 · R1.42 · Reschedule or cancel by link · #13 (screens) · ✅✅✅✅🟡 · waits on qa", out)
        self.assertIn("· R1.3 · Walls between firms · #24 (runtime) · ✅✅🔴⬜⬜ · waits on a fix: dequeued", out)
        self.assertIn("· R1.13 · Logs, metrics, error reports, alerts · #27 (runtime) · ✅✅✅🔴⬜ · waits on the founder's AWS",
                      out)
        self.assertIn("· R1.15 · Sample fifteen · no PR yet · ✅✅✅🔴⬜ · waits on the founder's AWS", out)   # step "prove"
        self.assertIn("· R1.4 · Each query runs inside its firm · no PR yet (runtime) · 🔴⬜⬜⬜⬜", out)  # waits, no PR
        self.assertRegex(out, r"- ~09:30 · R1\.10 · .* · on time \(ETA 09:30 passed: re-estimate\)")

    def test_reserve_and_outside_the_15(self):
        _, out, _ = run(*FULL)
        self.assertIn("Reserve / out of cycle (1):\n\n- — · R1.53 · (not in CAPABILITIES.md) · #31 (runtime) · ✅🟡⬜⬜⬜",
                      out)
        self.assertIn("Outside the 15 (supporting work):\n\n- pipeline · Sample parallel checks 6 to 12 · #41 🟡 queue\n"
                      "- tooling · Sample founder report · #42 ✅ merged · #43 🟡 building\n", out)
        _, out, _ = run(*FULL, plan=os.path.join(CT, "plan.json"))         # a plan without the board's keys
        self.assertIn("Reserve / out of cycle (0):\n\n- none", out)
        self.assertIn("- unknown (no \"outside\" list in cycle-plan.json)", out)

    def test_lists_render_on_a_phone(self):
        _, out, _ = run(*FULL, "--since", "✅ R1.27 proven")
        lines = out.splitlines()
        for i, l in enumerate(lines):                       # markdown joins lines: every list starts after a blank line
            if l.startswith("- ") and not lines[i - 1].startswith("- "):
                self.assertEqual(lines[i - 1], "", (i, l))
            if l.startswith("- ") and i + 1 < len(lines) and not lines[i + 1].startswith("- "):
                self.assertEqual(lines[i + 1], "", (i, l))
        for block in ("🔴 Needs you", "━━ Cycle", "Proven this cycle", "Constraint: ", "Since last report:"):            # a block line never runs into the next block
            i = next(i for i, l in enumerate(lines) if l.startswith(block))
            self.assertEqual(lines[i + 1], "", block)

    def test_rows_keep_the_plan_order(self):
        _, out, _ = run(*FULL)
        ids = re.findall(r"· (R1\.\d+) ·", out)
        self.assertEqual(ids[:8], ["R1.27", "R1.74", "R1.42", "R1.49", "R1.32", "R1.47", "R1.108", "R1.4"])

    def test_stage_table_and_constraint_today(self):
        _, out, _ = run(*FULL, *STAGES)
        rows = [l for l in out.splitlines() if re.match(r"^(Shaped-ready|Building|Review/Approve|Waiting on the Lead|"
                                                         r"Red after approval|Merge queue \+ machines|qa proof) ", l)]
        self.assertEqual([r.split("  ")[0].strip() for r in rows],
                         ["Shaped-ready", "Building", "Review/Approve", "Waiting on the Lead", "Red after approval",
                          "Merge queue + machines", "qa proof"])
        self.assertRegex(rows[0], r"^Shaped-ready\s+—\s+—\s+—\s+not measured yet$")     # no --stage for it
        self.assertRegex(rows[1], r"^Building\s+4\s+2\.5 h\s+3/1\s+⚠️ two drafts quiet 3 h$")
        # out below in: Building (2.5 h) and Merge queue (50 min); the older wins
        self.assertIn("Constraint today: Building because median age 2.5 h and 3 in / 1 out in 3 h", out)
        _, out, _ = run(*FULL)
        self.assertIn("Constraint today: unknown", out)

    def test_missing_inputs_print_unknown(self):
        _, out, _ = run(start=os.path.join(FR, "missing.md"))
        self.assertIn("🔴 Needs you: unknown", out)
        self.assertIn("Proven this cycle  unknown", out)
        self.assertIn("Forecast by 07:00  unknown   ·   On track unknown", out)
        self.assertIn("Constraint: unknown", out)
        self.assertIn("Since last report: unknown", out)
        self.assertIn("Money and resources: AWS unknown · weekly plan unknown (96% at unknown) · Lead context unknown", out)
        _, out, _ = run(plan=os.path.join(FR, "missing.json"))
        self.assertIn("Capability board: unknown (cycle plan unreadable)", out)
        self.assertIn("Forecast by 07:00  unknown", out)
        found = [x for x in positions(out, BLOCKS) if x is not None]
        self.assertEqual(found, sorted(found), out)                        # order holds with gaps too

    def test_short_prints_blocks_1_2_3_and_since(self):
        _, out, _ = run(*FULL, "--short", "--since", "⚠️ new risk")
        self.assertNotIn("Constraint:", out)
        self.assertNotIn("Money and resources:", out)
        self.assertNotIn("Constraint today:", out)                         # the stage table is the full report's
        pos = positions(out, [BLOCKS[i] for i in (0, 1, 4, 5, 6, 7, 8, 10)])
        self.assertEqual(pos, sorted(pos), out)

    def test_since_capped_at_four_and_96_time(self):
        _, out, _ = run(*FULL, *sum((["--since", "🔀 #%d merged" % n] for n in range(6)), []))
        self.assertIn("- 🔀 #3 merged\n- (+2 more in the Lead's check)", out)
        self.assertNotIn("#4 merged", out)
        self.assertIn("weekly plan 71% (+2.5%/h, 96% at 21:40)", out)              # 25 points at 2.5 %/h from 11:40
        _, out, _ = run("--weekly", "97")
        self.assertIn("weekly plan 97% (96% reached)", out)

    def test_cycle_count_uses_the_cycle_that_holds_now(self):
        _, out, _ = run(*FULL, now="2026-11-22T06:59+05:30")
        self.assertIn("now 22 Nov 06:59 IST", out)
        self.assertIn("Proven this cycle  2 / 15", out)

    def plan_with(self, change):
        with open(os.path.join(FR, "plan.json"), encoding="utf-8") as f:
            plan = json.load(f)
        change(plan)
        path = os.path.join(tempfile.mkdtemp(), "plan.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(plan, f)
        return path

    def test_forecast_counts_a_19_row_that_lands_before_07(self):
        def late_42(plan):
            next(r for r in plan["rows"] if r["r1"] == "R1.42")["eta"] = "20:00"
        _, out, _ = run(*FULL, plan=self.plan_with(late_42))
        self.assertRegex(out, r"- ~20:00 · R1\.42 · .* · late by")             # late for 19:00 on its own line
        self.assertIn("Forecast by 07:00  5 / 15", out)                    # ... and still counted for 07:00

    def test_forecast_counts_a_merged_row_a_qa_lane_owns(self):
        def own(plan):
            for r in plan["rows"]:
                if r["r1"] in ("R1.42", "R1.13"):                 # both merged; R1.13 waits on the founder's AWS
                    r["owner"] = "qa"
        _, out, _ = run(*FULL, plan=self.plan_with(own))
        self.assertIn("Forecast by 07:00  5 / 15", out)                    # 4 + R1.42; R1.13 (AWS) does not count
        _, out, _ = run(*FULL, plan=self.plan_with(lambda p: p["rows"][2].update(owner="qa", eta="23:00")))
        self.assertIn("Forecast by 07:00  5 / 15", out)                    # an ETA only adds lateness
        _, out, _ = run(*FULL, plan=self.plan_with(lambda p: p["rows"][6].update(owner="qa")))
        self.assertIn("Forecast by 07:00  4 / 15", out)                    # R1.108 is not merged: no count

    def test_odd_plan_shapes_print_unknown_not_a_traceback(self):
        shapes = [lambda p: p.update(reserve=None), lambda p: p.update(reserve=[{"prs": [31]}]),
                  lambda p: p["rows"][5].update(parts=None), lambda p: p.update(outside={"x": 1}),
                  lambda p: p["rows"].append("not a row")]
        for change in shapes:
            rc, out, err = run(*FULL, plan=self.plan_with(change))
            self.assertEqual(rc, 0, err)
            self.assertTrue(out.startswith("🔴 Needs you: nothing"), out)
        rc, out, err = run(*FULL, plan=self.plan_with(lambda p: p.update(reserve=[{"prs": [31]}])))
        self.assertIn("- unknown · no r1 · plan entry unreadable (KeyError)", out)
        path = os.path.join(tempfile.mkdtemp(), "plan.json")
        with open(path, "w", encoding="utf-8") as f:
            f.write("[1, 2]")
        rc, out, err = run(*FULL, plan=path)
        self.assertEqual(rc, 0, err)
        self.assertIn("Capability board: unknown (cycle plan unreadable)", out)
        rc, out, err = run(*FULL, "--stage", "Building: 4 · 1.2.3 h · 3/1 · x", "--stage", "Merge queue: 1 · 2 h · 3/1 · x")
        self.assertEqual(rc, 0, err)
        self.assertIn("(--stage name not recognised, so not shown: merge queue)", out)

    def test_needs_one_line_per_item(self):
        _, out, _ = run("--needs", "AWS keys · Settings · R1.13-15 cannot prove", "--needs", "US$40 run · card · R1.24 waits")
        self.assertTrue(out.startswith("🔴 Needs you:\n\n- AWS keys · Settings · R1.13-15 cannot prove\n"
                                       "- US$40 run · card · R1.24 waits\n\n━━ Cycle"), out)

    def test_dequeued_is_red_even_without_the_approval_label(self):
        gh = os.path.join(tempfile.mkdtemp(), "github.json")
        with open(os.path.join(FR, "github.json"), encoding="utf-8") as f:
            data = json.load(f)
        data["pulls"]["24"]["labels"] = ["dequeued"]          # Mergify dropped the approval label
        with open(gh, "w", encoding="utf-8") as f:
            json.dump(data, f)
        r = subprocess.run([sys.executable, "-I", os.path.join(HERE, "founder-report.py"), "--plan",
                            os.path.join(FR, "plan.json"), "--fixture", gh, "--capabilities",
                            os.path.join(CT, "CAPABILITIES.md"), "--capabilities-at-start",
                            os.path.join(FR, "CAPABILITIES-at-0700.md"), "--now", "2026-11-21T11:40+05:30"],
                           capture_output=True, text=True)
        self.assertIn("· R1.3 · Walls between firms · #24 (runtime) · ✅✅🔴⬜⬜ · waits on a fix: dequeued", r.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
