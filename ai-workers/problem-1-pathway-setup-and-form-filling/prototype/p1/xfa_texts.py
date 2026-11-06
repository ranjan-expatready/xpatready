"""B79b (review round 2, Major 1; AGENTS rule 4): every text a form prints, read from the official XFA template itself
(read only, no AI, US$0), so a section name marked "printed" in studio/samples/section-names.json can be checked
against the form's own words, never the PDF's internal part names ("forCICUseOnly"). Writes <form>.texts.json beside
the inventory: the form's edition, file and checksum from the manifest (so a check can see it is today's file) and its
printed texts, each once, in the template's order (master pages too; pictures are not text).

    python3 prototype/p1/xfa_texts.py imm5532e.pdf imm5604e.pdf ...
    python3 prototype/p1/xfa_texts.py --names     (every form edition a "printed" name in section-names.json cites)
"""
import hashlib
import importlib.util
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("xfa_headings", HERE / "xfa_headings.py")
hd = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hd)
inv = hd.inv
NAMES = HERE.parent / "studio" / "samples" / "section-names.json"
MANIFEST = {i["file"]: i for i in json.loads((inv.SOURCES / "manifest.json").read_text())["items"]}


def read(fname):
    path = inv.official(fname)
    parts, _ = inv.xfa_parts(path)
    tpl = ET.fromstring(parts["template"])
    ns = tpl.tag.split("}")[0] + "}"
    texts = list(dict.fromkeys(t for t, _, _ in hd.texts_all(tpl, ns)))
    item = MANIFEST[fname]
    return {"edition": item["edition"], "file": fname, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "read_by": "prototype/p1/xfa_texts.py (XFA template, no AI)", "texts": texts}


def main():
    args = sys.argv[1:]
    if args == ["--names"]:
        editions = {s["form"] for s in json.loads(NAMES.read_text())["sections"] if s["basis"] == "printed"}
        args = sorted(f for f, i in MANIFEST.items() if i.get("is_pdf") and i["edition"] in editions)
        missing = editions - {MANIFEST[f]["edition"] for f in args}
        if missing:
            sys.exit(f"no official file in the manifest for: {', '.join(sorted(missing))}")
    for fname in args:
        r = read(fname)
        out = inv.OUT / fname.replace(".pdf", ".texts.json")
        out.write_text(json.dumps(r, indent=1, ensure_ascii=False) + "\n")
        print(f"{fname}: {len(r['texts'])} printed texts -> {out.name}")


if __name__ == "__main__":
    main()
