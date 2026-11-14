#!/usr/bin/env python3
"""Unit tests for trace-requirements.py (TR-1, P-595). Standard library only; made-up fixtures in a temp folder, plus
one check on the real newest requirements copy when it is present. Run: python3 -I product/tools/test_trace_requirements.py"""
import contextlib, importlib.util, io, pathlib, sys, tempfile, unittest

HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("trace", HERE / "trace-requirements.py")
t = importlib.util.module_from_spec(spec)
spec.loader.exec_module(t)

AG02_OLD = """# AG-02 Leads
## Chapter 1
#### AG-2-1 — One person record   Decision: S1   Status: Not built
Rules: one person, many leads.

#### AG-2-2 — A lead always has a source   Decision: S2   Status: Not built
Rules: the source is required.
##### Tests
A lead with no source is refused.

#### AG-2-3 — Old card that moves   Decision: S3   Status: Not built
Rules: the receipt is written first.

### 4. Detailed
- **AG-2-9** *(changed v1.2)* The list shows owner and stage.
  It is sorted by the newest first.
- **AG-2-10** Withdrawn.

| ID | What |
|---|---|
| AG-2-11 | Index entry only. |
| AG-2-1 | an index row that must not win over the card |
"""

AG02_NEW = (AG02_OLD
            .replace("Rules: the source is required.", "Rules: the source is required, and it is never edited.")
            .replace("#### AG-2-3 — Old card", "#### AG-2-30 — Old card")
            .replace("- **AG-2-10** Withdrawn.\n", "")
            + "\n#### AG-2-40, AG-2-41 — A group card   Decision: S4   Status: Not built\nRules: both.\n")

DECISIONS = """| # | Date | Decision |
|---|---|---|
| P-600 | 15 Nov | The first build departs from AG-2-9 (owner column dropped). Other text. |
| P-601 | 15 Nov | (amended by P-602) AG-2-1 stays out of the first build. |
| P-602 | 15 Nov | Leads keep a source. |
"""

CHECKLIST = """# Checklist
## A. Scope to build (from the map)
### A. Foundations
| Map | Capability | Module | BACKLOG rows | Status |
|---|---|---|---|---|
| 26 | Public enquiry form | Front office | FO-2, FO-4 | Shaped |
| 34 | One person's data as an export | Front office | **none yet** | Not shaped (**gap**) |
| 63 | Per-person checklist | Case side | C6.4 Works | qa Works |

### Flags
Text.

---

## B. Done for one row
"""

CAPS = """| # | Step | Capability | M | Status | Tested on | Evidence |
|---|---|---|---|---|---|---|
| C6.4 | 6 Runtime | Checklist per person | M3 | Works | x | y |
"""

CAPS_R1 = """| # | Map row: capability | Module | Status | Tested on | Case side | Done when | Evidence |
|---|---|---|---|---|---|---|---|
| R1.26 | 26 Public enquiry form | Front office | Not built | x | — | y | z |
"""


def backlog(rows):
    head = ("## Full MVP\n\n| # | Area | Item | Done when (beyond the standard) | Source · waits on · decisions |\n"
            "|---|---|---|---|---|\n")
    return head + "\n".join(rows) + "\n\n## Later\n| Row | What |\n|---|---|\n| X-1 | not Release 1 |\n"


class Fixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = pathlib.Path(self.tmp.name)
        self.old, self.new = d / "requirements-2026-10-19", d / "requirements-2026-11-02"
        for snap, text, ver in ((self.old, AG02_OLD, "v1.0_2026-10-18"), (self.new, AG02_NEW, "v2.0_2026-10-28")):
            (snap / "agent").mkdir(parents=True)
            (snap / "agent" / f"AG-02-prospect-lead_{ver}.md").write_text(text)
            (snap / "agent" / "AG-02-decisions_2026-10-11.md").write_text("#### AG-2-1 — not a module file\n")
        self.files = {}
        for name, text in (("decisions", DECISIONS), ("checklist", CHECKLIST), ("capabilities", CAPS + "\n" + CAPS_R1), ("trace", "| FEE-R01 | x |\n")):
            self.files[name] = d / f"{name}.md"
            self.files[name].write_text(text)
        self.d = d

    def tearDown(self):
        self.tmp.cleanup()

    def run_tool(self, *args, backlog_text=None):
        b = self.d / "BACKLOG.md"
        if backlog_text is not None:
            b.write_text(backlog_text)
        argv = list(args) + ["--backlog", str(b), "--requirements", str(self.new)]
        for k, p in self.files.items():
            argv += [f"--{k}", str(p)]
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
            code = t.main(argv)
        return code, out.getvalue()

    def cite(self, *ids):
        reqs = t.load_snapshot(self.new)[0]
        return ", ".join(f"{i}@{reqs[i].hash}" for i in ids)

    # ---- the hash
    def test_hash_is_8_hex_and_ignores_spacing(self):
        a = t.Req("AG-2-1", pathlib.Path("x"), 1, "heading", ["#### AG-2-1 — One", "Rules:  a   b"], ["AG-2-1"])
        b = t.Req("AG-2-1", pathlib.Path("x"), 1, "heading", ["#### AG-2-1 —   One", "Rules: a b  "], ["AG-2-1"])
        self.assertRegex(a.hash, r"^[0-9a-f]{8}$")
        self.assertEqual(a.hash, b.hash)

    def test_hash_changes_with_the_words(self):
        a = t.Req("AG-2-1", pathlib.Path("x"), 1, "bullet", ["- **AG-2-1** a lead"], ["AG-2-1"])
        b = t.Req("AG-2-1", pathlib.Path("x"), 1, "bullet", ["- **AG-2-1** a person"], ["AG-2-1"])
        self.assertNotEqual(a.hash, b.hash)

    def test_hash_ignores_its_own_id(self):
        a = t.Req("AG-2-3", pathlib.Path("x"), 1, "heading", ["#### AG-2-3 — Card", "Rules."], ["AG-2-3"])
        b = t.Req("AG-2-30", pathlib.Path("x"), 1, "heading", ["#### AG-2-30 — Card", "Rules."], ["AG-2-30"])
        self.assertEqual(a.hash, b.hash)

    # ---- parsing the module files
    def test_definitions_heading_bullet_table_and_priority(self):
        reqs, files = t.load_snapshot(self.old)
        self.assertEqual(set(files), {"AG-2"})  # the decisions file is not a module file
        self.assertEqual(reqs["AG-2-1"].kind, "heading")  # the card wins over the index row
        self.assertIn("##### Tests", reqs["AG-2-2"].text)  # a lower heading stays inside the card
        self.assertNotIn("AG-2-3", reqs["AG-2-2"].text)  # the next card is not
        self.assertEqual(reqs["AG-2-9"].kind, "bullet")
        self.assertIn("newest first", reqs["AG-2-9"].text)  # its indented line belongs to it
        self.assertEqual(reqs["AG-2-11"].kind, "table")

    def test_group_heading_and_range(self):
        reqs = t.load_snapshot(self.new)[0]
        self.assertEqual(reqs["AG-2-40"].text, reqs["AG-2-41"].text)
        self.assertEqual(t._expand("AG-6-1 – AG-6-4"), ["AG-6-1", "AG-6-4", "AG-6-2", "AG-6-3"])
        self.assertEqual(t._expand(t._lead("AG-6-44 (with AG-6-5)")), ["AG-6-44"])

    # ---- refresh: changed, renumbered, added, removed
    def test_refresh_diff(self):
        old, new = t.load_snapshot(self.old)[0], t.load_snapshot(self.new)[0]
        added, removed, renum, changed = t.diff_snapshots(old, new)
        self.assertEqual(changed, ["AG-2-2"])
        self.assertEqual(renum, [("AG-2-3", "AG-2-30")])
        self.assertEqual(removed, ["AG-2-10"])
        self.assertEqual(added, ["AG-2-40", "AG-2-41"])

    def test_refresh_names_the_rows_hit(self):
        b = backlog([f"| FO-2 | runtime | Leads | a pass and a fail | Source: AG-2-2@{'0' * 8}, AG-2-3@{'1' * 8} |"])
        code, out = self.run_tool("--refresh", str(self.old), str(self.new), backlog_text=b)
        self.assertEqual(code, 0)
        self.assertIn("* AG-2-2 (changed): FO-2", out)
        self.assertIn("* AG-2-3 (renumbered to AG-2-30): FO-2", out)

    # ---- brief
    def test_brief_prints_only_the_rows_text(self):
        b = backlog([f"| FO-2 | runtime | Leads | a pass and a fail | Source: {self.cite('AG-2-2')}, P-602 · waits on: x |",
                     f"| FO-3 | runtime | Book | a test | Source: {self.cite('AG-2-9')} |"])
        code, out = self.run_tool("--brief", "FO-2", backlog_text=b)
        self.assertEqual(code, 0)
        self.assertIn("never edited", out)
        self.assertIn("Leads keep a source", out)
        self.assertNotIn("One person record", out)
        self.assertNotIn("newest first", out)  # FO-3's text
        self.assertNotIn("WARNING", out)

    def test_brief_warns_on_a_stale_hash(self):
        b = backlog(["| FO-2 | runtime | Leads | a test | Source: AG-2-2@00000000 |"])
        self.assertIn("is stale", self.run_tool("--brief", "FO-2", backlog_text=b)[1])

    # ---- check (CI)
    def test_check_fails_a_new_row_with_no_source_and_passes_one_with_it(self):
        base = backlog(["| FO-1 | runtime | Old | a test | waits on: none |"])
        old = self.d / "old.md"
        old.write_text(base)
        bad = backlog(["| FO-1 | runtime | Old | a test | waits on: none |", "| FO-9 | runtime | New | a test | waits on: none |"])
        self.assertEqual(self.run_tool("--check", str(old), backlog_text=bad)[0], 1)
        good = bad.replace("| FO-9 | runtime | New | a test | waits on: none |",
                           f"| FO-9 | runtime | New | a test | Source: {self.cite('AG-2-1')}, P-602, FEE-R01, "
                           "official(IRCC IMM 5257 guide, p. 4, 2026-10-19) · waits on: none |")
        code, out = self.run_tool("--check", str(old), backlog_text=good)
        self.assertEqual(code, 0, out)

    def test_check_fails_unresolved_items_and_ignores_unshaped_rows(self):
        old = self.d / "old.md"
        old.write_text(backlog([]))
        for item in ("AG-2-1", "AG-2-1@00000000", "AG-2-99@00000000", "P-999", "official(IRCC guide)", "a web page"):
            b = backlog([f"| FO-9 | runtime | New | a test | Source: {item} |"])
            self.assertEqual(self.run_tool("--check", str(old), backlog_text=b)[0], 1, item)
        b = backlog(["| FO-9 | runtime | New | — | waits on: none |", "| X-9 | later | Not Release 1 | a test | none |"])
        self.assertEqual(self.run_tool("--check", str(old), backlog_text=b)[0], 0)

    # ---- gaps
    def test_gaps_unmapped_uncovered_and_conflicts(self):
        b = backlog([f"| FO-2 | runtime | Leads | a test | Source: {self.cite('AG-2-9')}, {self.cite('AG-2-1')} |",
                     "| FO-4 | runtime | Lists | a test | waits on: none |",
                     f"| FO-5 | runtime | Old rule | a test | Source: P-601 |"])
        code, out = self.run_tool("--gaps", backlog_text=b)
        self.assertEqual(code, 0)
        self.assertIn("1 checklist §A rows not shaped, 1 shaped Release 1 rows with no Source", out)
        self.assertIn("* map 34: One person's data as an export", out)
        self.assertIn("* rows with no Source: FO-4", out)
        self.assertIn("AG-2 (", out)
        self.assertNotIn("AG-2-9,", out.split("no row covers")[1].split("##")[0])
        self.assertIn("FO-2 cites AG-2-9; P-600 says", out)  # a live decision departs from it
        self.assertNotIn("P-601 says", out)  # an amended decision is not used as a conflict source
        self.assertIn("FO-5: P-601 is amended by P-602", out)

    # ---- render
    def test_render_twice_gives_no_diff_and_keeps_hand_text(self):
        b = backlog([f"| FO-2 | runtime | Leads | a test | Source: {self.cite('AG-2-2')} |"])
        self.run_tool("--render", backlog_text=b)
        once = self.files["checklist"].read_text()
        self.run_tool("--render")
        self.assertEqual(once, self.files["checklist"].read_text())
        self.assertTrue(once.startswith(CHECKLIST.split("### Flags")[0]))
        self.assertLess(once.index(t.END), once.index("### Flags"))
        self.assertIn(f"| 26 | Public enquiry form | FO-2, FO-4 (no row) | {self.cite('AG-2-2')} | R1.26 Not built |", once)
        self.assertIn("| 63 | Per-person checklist | C6.4 | unmapped | C6.4 Works |", once)

    def test_cells_split_outside_code(self):
        self.assertEqual(t.split_cells("| a | `x | y` | b \\| c |"), ["a", "`x | y`", "b | c"])
        self.assertEqual(t.split_items("A@1, official(x, p. 2, 2026-01-01); P-1"), ["A@1", "official(x, p. 2, 2026-01-01)", "P-1"])


class RealSnapshot(unittest.TestCase):
    """On the real newest copy: one card is a small slice of its module file."""
    def test_one_card_is_a_small_slice(self):
        try:
            d = t.newest_requirements()
        except SystemExit:
            self.skipTest("no requirements copy")
        reqs, files = t.load_snapshot(d)
        self.assertGreater(len(reqs), 1000)
        q = reqs.get("AG-2-84")
        if q is None:
            self.skipTest("AG-2-84 not in this copy")
        self.assertTrue(q.text.startswith("#### AG-2-84 — "))
        self.assertLess(len(q.text), files["AG-2"].stat().st_size * 0.05)


if __name__ == "__main__":
    sys.exit(0 if unittest.main(exit=False, verbosity=1).result.wasSuccessful() else 1)
