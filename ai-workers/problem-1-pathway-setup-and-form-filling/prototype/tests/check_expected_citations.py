#!/usr/bin/env python3
"""Checks the answer key (prototype/expected/*.json) against the official files it cites.
For every expected form, document and rule: the cited file's SHA-256 equals the download manifest, the label is exact,
and every part of the quoted passage (parts separated by ' ... ') occurs in that file's text, with whitespace and curly
quotes normalised. Reads the official files directly (XFA template via pypdf, other PDFs via pdftotext, HTML pages as text).
Run with the prototype environment: .tools/solution-1-prototype/.venv/bin/python <this file>"""
import glob, hashlib, html, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
P1 = os.path.abspath(os.path.join(HERE, "..", ".."))
LABEL = "Lead-verified from official sources (prototype only); not specialist-confirmed"
MAN = {i["file"]: i["sha256"] for i in json.load(open(os.path.join(P1, "official-sources", "ircc", "manifest.json")))["items"]}
_cache = {}


def norm(s):
    s = s.replace("“", '"').replace("”", '"').replace("’", "'").replace("☐", " ").replace("–", "-")
    s = re.sub(r"[\ue000-\uf8ff\u2022]", " ", s)          # PDF bullet glyphs (private-use) and bullets
    s = re.sub(r"\s+", " ", s).strip()
    return re.sub(r"\(\s+", "(", re.sub(r"\s+\)", ")", s))  # spaces just inside parentheses (HTML markup)


def text_of(path):
    if path in _cache:
        return _cache[path]
    if path.endswith(".html"):
        t = open(path, encoding="utf-8", errors="replace").read()
        t = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>", " ", t, flags=re.S)))
    else:
        import pypdf
        r = pypdf.PdfReader(path)
        if r.is_encrypted:
            r.decrypt("")
        x = r.xfa if "/AcroForm" in r.trailer["/Root"] else None
        if x and "template" in x:
            t = html.unescape(re.sub(r"<[^>]+>", " ", x["template"].decode("utf-8", "replace")))
        else:
            t = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True).stdout
    _cache[path] = norm(t)
    return _cache[path]


fails, n = [], 0
for f in sorted(glob.glob(os.path.join(P1, "prototype", "expected", "*.json"))):
    d = json.load(open(f))
    if d.get("label") != LABEL:
        fails.append(f"{os.path.basename(f)}: label is not exact")
    if d.get("schema") == "fact-aliases/v1":
        continue  # no citations: decided from draft definitions (tests/make_fact_aliases.py)
    if d.get("schema") in ("expected-field-map/v0", "expected-field-map/v2"):  # v2: D11 quotes checked by tests/make_keys_v2.py --check
        # Field-level key (P1): boxes are checked against the inventory by tests/check_contracts.ts;
        # here each instance's cited form must match its hash and the forms manifest.
        for inst in d["instances"]:
            n += 1
            s = inst["source"]; path = os.path.join(P1, s["file"]); name = os.path.basename(path)
            sha = hashlib.sha256(open(path, "rb").read()).hexdigest()
            if sha != s["sha256"] or MAN.get(name) != sha:
                fails.append(f"{os.path.basename(f)}: {name}: hash differs from citation or manifest")
        continue
    items = [x for k in ("expected_forms", "expected_documents", "rules") for x in d.get(k, [])]
    for x in items:
        for s in [x["source"]] + ([x["also"]] if "also" in x else []):
            n += 1
            path = os.path.join(P1, s["file"]); name = os.path.basename(path)
            sha = hashlib.sha256(open(path, "rb").read()).hexdigest()
            if sha != s["sha256"] or MAN.get(name) != sha:
                fails.append(f"{os.path.basename(f)}: {name}: hash differs from citation or manifest")
            body = text_of(path)
            for part in [p for p in s["passage"].split(" ... ") if p.strip()]:
                if norm(part) not in body:
                    fails.append(f"{os.path.basename(f)}: passage not found in {name}: {part[:80]!r}")
print(f"citations checked: {n}; failures: {len(fails)}")
for e in fails:
    print("  FAIL " + e)
sys.exit(1 if fails else 0)
