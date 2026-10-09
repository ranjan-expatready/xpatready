"""Regenerate commercial/plan.docx from commercial/plan.md (the canonical source).

Usage: python3 commercial/tools/make_plan_docx.py
Needs pandoc. Uses tools/plan-reference.docx for styles, then marks every table row
"do not split across pages" so a row never breaks between pages.
"""
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "plan.md"
OUT = HERE.parent / "plan.docx"
REF = HERE / "plan-reference.docx"

tmp = Path(tempfile.mkdtemp()) / "plan.docx"
subprocess.run(["pandoc", str(SRC), "-o", str(tmp), f"--reference-doc={REF}"], check=True)

with zipfile.ZipFile(tmp) as zin:
    items = {n: zin.read(n) for n in zin.namelist()}
doc = items["word/document.xml"].decode("utf-8")
doc = re.sub(r"<w:trPr>", "<w:trPr><w:cantSplit/>", doc)                 # rows that already have properties
doc = re.sub(r"<w:tr>(?!<w:trPr>)", "<w:tr><w:trPr><w:cantSplit/></w:trPr>", doc)  # rows without
items["word/document.xml"] = doc.encode("utf-8")
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zout:
    for n, data in items.items():
        zout.writestr(n, data)
shutil.rmtree(tmp.parent)
print("wrote", OUT, "rows kept whole:", doc.count("<w:cantSplit/>"))
