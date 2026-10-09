"""Recalculate an .xlsx in place with LibreOffice (headless) and report formula errors.

Usage: python3 lo_recalc.py WORKBOOK.xlsx [timeout_seconds]
Prints JSON: {"status": "success"|"errors_found", "total_formulas": n, "total_errors": n, "errors": {...}}
Needs LibreOffice ('soffice' on PATH). No other dependencies beyond openpyxl.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from openpyxl import load_workbook

MACRO = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE script:module PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "module.dtd">
<script:module xmlns:script="http://openoffice.org/2000/script" script:name="Module1" script:language="StarBasic">
    Sub RecalculateAndSave()
      ThisComponent.calculateAll()
      ThisComponent.store()
      ThisComponent.close(True)
    End Sub
</script:module>"""
ERRS = ("#VALUE!", "#DIV/0!", "#REF!", "#NAME?", "#N/A", "#NUM!", "#NULL!", "Err:")


def soffice():
    for c in ("soffice", "/opt/homebrew/bin/soffice", "/Applications/LibreOffice.app/Contents/MacOS/soffice"):
        if shutil.which(c) or os.path.exists(c):
            return shutil.which(c) or c
    raise FileNotFoundError("LibreOffice 'soffice' not found")


def recalc(path, timeout=240):
    path = str(Path(path).resolve())
    with tempfile.TemporaryDirectory(prefix="lo_prof_") as prof:
        url = Path(prof).as_uri()
        exe = soffice()
        subprocess.run([exe, f"-env:UserInstallation={url}", "--headless", "--terminate_after_init"],
                       capture_output=True, timeout=120)
        mdir = Path(prof) / "user" / "basic" / "Standard"
        mdir.mkdir(parents=True, exist_ok=True)
        (mdir / "Module1.xba").write_text(MACRO)
        script = mdir / "script.xlb"
        if not script.exists() or "Module1" not in script.read_text():
            script.write_text('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE library:library PUBLIC '
                              '"-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "library.dtd">\n<library:library '
                              'xmlns:library="http://openoffice.org/2000/library" library:name="Standard" '
                              'library:readonly="false" library:passwordprotected="false">\n <library:element '
                              'library:name="Module1"/>\n</library:library>')
        subprocess.run([exe, f"-env:UserInstallation={url}", "--headless", "--norestore",
                        "vnd.sun.star.script:Standard.Module1.RecalculateAndSave?language=Basic&location=application",
                        path], capture_output=True, timeout=timeout)
    return scan(path)


def scan(path):
    wb = load_workbook(path, data_only=True)
    wf = load_workbook(path, data_only=False)
    total, errs = 0, {}
    for ws in wf.worksheets:
        wv = wb[ws.title]
        for row in ws.iter_rows():
            for c in row:
                if isinstance(c.value, str) and c.value.startswith("="):
                    total += 1
                    v = wv[c.coordinate].value
                    if isinstance(v, str) and v.startswith(ERRS):
                        errs.setdefault(v, []).append(f"{ws.title}!{c.coordinate}")
    n = sum(len(v) for v in errs.values())
    return {"status": "success" if n == 0 else "errors_found", "total_formulas": total, "total_errors": n,
            "errors": {k: v[:25] for k, v in errs.items()}}


if __name__ == "__main__":
    print(json.dumps(recalc(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 240), indent=1))
