#!/usr/bin/env python3
"""Tests that the working edition cannot overwrite the frozen originals and that the ledger catches unrecorded changes.
Run: python3 tools/s3-working/test_working_guard.py   (writes only to a temporary folder; prints PASS/FAIL per case)."""
import os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
AW = os.path.abspath(os.path.join(HERE, "..", ".."))
PROJECT = os.path.dirname(AW)
P1 = os.path.join(AW, "problem-1-pathway-setup-and-form-filling")
sys.path.insert(0, HERE)
import frozen_guard as G
import s3_terms

R = []
def case(name, ok):
    R.append(ok); print(("PASS  " if ok else "FAIL  ") + name)

def refused(path):
    try:
        G.check(path); return False
    except G.FrozenWriteError:
        return True

case("guard refuses the accepted draft 4.3 page", refused(os.path.join(P1, "solution-1-one-pager.html")))
case("guard refuses an original authoring file (tools/s3/s3_data.py)", refused(os.path.join(AW, "tools", "s3", "s3_data.py")))
case("guard refuses a new file inside tools/s3/", refused(os.path.join(AW, "tools", "s3", "new.py")))
case("guard refuses a B0 file", refused(os.path.join(PROJECT, "archive", "ai-workers", "solution-1-v3-draft4.3-prototype-baseline-2026-10-19", "manifest.sha256")))
case("guard refuses a draft 4.x record in checks/", refused(os.path.join(AW, "checks", "one-pager-draft-4-3-content-ledger-2026-10-19.md")))
case("guard refuses a path outside the allowed outputs", refused(os.path.join(AW, "NEXT.md")))
case("guard refuses a '..' path that resolves to the original page", refused(os.path.join(AW, "checks", "working-edition", "..", "..", "problem-1-pathway-setup-and-form-filling", "solution-1-one-pager.html")))
link = os.path.join(AW, "checks", "working-edition", "_test_link.html")
try:
    if os.path.lexists(link): os.remove(link)
    os.symlink(os.path.join(P1, "solution-1-one-pager.html"), link)
    case("guard refuses a symlink in an allowed folder that points to the original page", refused(link))
finally:
    if os.path.lexists(link): os.remove(link)
case("guard allows the working page", not refused(os.path.join(P1, "solution-1-one-pager-working.html")))
case("guard allows checks/working-edition/", not refused(os.path.join(AW, "checks", "working-edition", "x.md")))
for rel in ["problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html", "tools/s3/s3_data.py", "tools/s3/build_one_pager.py", "tools/s3/publish/solution-1-one-pager.html"]:
    case(f"original is read-only on disk: {rel}", not os.access(os.path.join(AW, rel), os.W_OK))
try:
    s3_terms.rewrite_file(os.path.join(AW, "tools", "s3", "s3_data.py")); case("terms rewriter refuses tools/s3/ sources", False)
except RuntimeError:
    case("terms rewriter refuses tools/s3/ sources", True)

# The ledger catches a change that apply_w1.py did not record
with tempfile.TemporaryDirectory() as T:
    w = os.path.join(T, "ai-workers", "tools", "s3-working"); os.makedirs(w)
    for f in os.listdir(HERE):
        if f.endswith((".py", ".json")): shutil.copy(os.path.join(HERE, f), w)
    os.symlink(os.path.join(PROJECT, "archive"), os.path.join(T, "archive"))
    os.symlink(os.path.join(AW, "tools", "s3"), os.path.join(T, "ai-workers", "tools", "s3"))
    os.makedirs(os.path.join(T, "ai-workers", "problem-1-pathway-setup-and-form-filling"))
    os.symlink(os.path.join(P1, "solution-1-one-pager.html"), os.path.join(T, "ai-workers", "problem-1-pathway-setup-and-form-filling", "solution-1-one-pager.html"))
    r = subprocess.run([sys.executable, os.path.join(w, "working_ledger.py")], capture_output=True, text=True)
    case("ledger passes on an untouched copy", r.returncode == 0)
    p = os.path.join(w, "s3_data.py"); s = open(p).read()
    s = s.replace("Document expiry warns at 90 and 30 days by default", "Document expiry warns at 60 days by default", 1); open(p, "w").write(s)
    r = subprocess.run([sys.executable, os.path.join(w, "working_ledger.py")], capture_output=True, text=True)
    case("ledger fails on an unrecorded wording change", r.returncode == 1 and "no recorded edit" in r.stdout)

print(f"RESULT: {sum(R)} passed, {len(R) - sum(R)} failed")
sys.exit(0 if all(R) else 1)
