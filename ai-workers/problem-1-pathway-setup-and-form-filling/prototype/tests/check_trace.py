"""trace.csv shape check (P1 revision 4, answers R3-m2): every row has exactly the header's columns, no
row parses with an extra or missing column, task ids are unique, and the required cells are filled.
  python3 -I ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tests/check_trace.py
"""
import csv
import sys
from pathlib import Path

F = Path(__file__).resolve().parents[1] / "trace.csv"
raw = list(csv.reader(F.open(newline="")))
header, rows = raw[0], raw[1:]
results = []
t = lambda n, ok: results.append((n, bool(ok)))  # noqa: E731
t("header has the nine agreed columns", header == ["task_id", "activity_or_rule_ids", "acceptance_scenarios", "status", "writer", "evidence", "spec_revision", "last_updated", "summary"])
bad = [(i + 2, len(r)) for i, r in enumerate(rows) if len(r) != len(header)]
t(f"every row has {len(header)} cells (bad rows: {bad})", not bad)
dict_rows = list(csv.DictReader(F.open(newline="")))
t("DictReader gives no extra (None-key) column", all(None not in d for d in dict_rows))
ids = [r[0] for r in rows]
t("task ids are unique", len(ids) == len(set(ids)))
t("task_id, status, last_updated and summary are filled on every row", all(r[0] and r[3] and r[7] and r[8] for r in rows))
for n, ok in results:
    print(("PASS  " if ok else "FAIL  ") + n)
failed = sum(not ok for _, ok in results)
print(f"{len(results) - failed}/{len(results)} passed ({len(rows)} rows)")
sys.exit(1 if failed else 0)
