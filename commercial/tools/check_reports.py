"""Check generated report blocks for staleness (Codex brief §5).

Usage: python3 commercial/tools/check_reports.py
Exit 0 = every generated block matches the workbook's current inputs, actuals and model logic; 1 = stale.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wbtools as W  # noqa: E402
from refresh_reports import DOCS  # noqa: E402


def main():
    fp = W.fingerprint(W.WORKBOOK)
    stale, missing, ok = [], [], []
    for doc, ids in DOCS.items():
        p = os.path.join(W.COMMERCIAL, doc)
        t = open(p).read() if os.path.exists(p) else ""
        for bid in ids:
            m = re.search(rf"<!-- GENERATED:{bid} BEGIN fingerprint=(\w+) -->", t)
            if not m:
                missing.append(f"{doc}:{bid}")
            elif m.group(1) != fp:
                stale.append(f"{doc}:{bid} (block {m.group(1)}, workbook {fp})")
            else:
                ok.append(f"{doc}:{bid}")
    print(f"workbook fingerprint {fp}")
    print("current:", len(ok), "| stale:", len(stale), "| missing:", len(missing))
    for s in stale:
        print("STALE", s)
    for s in missing:
        print("MISSING", s)
    sys.exit(1 if stale or missing else 0)


if __name__ == "__main__":
    main()
