"""Text inventories of the official checklist, instructions and guide for combination 1 (P2 input).

The P2 requirements step drafts the forms, documents and conditions from these official files. A drafting
process may receive only official files and their inventories (AIW-D260), and it receives text, not PDF
bytes, so this script derives one read-only text inventory per file, headed by the file's manifest hash:
  * XFA checklist: every visible text and caption in the template, in document order, scripts removed;
  * plain PDF: `pdftotext -layout` (poppler, already installed);
  * HTML page: the page text without scripts, styles, navigation, header or footer.
Each output is p1/inventory/<stem>.text.inventory.json: {"summary": {file, sha256, kind, method}, "text"}.
The guard admits it only while its source hash matches the official manifest.

  .tools/solution-1-prototype/.venv/bin/python -I \
    ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/source_text.py [<path under official-sources/ircc> xfa|pdf|html]
With a path and a kind, only that one file is derived (D3: checklists/imm5484e.pdf xfa, the Visitor visa checklist).
"""
import hashlib
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import e5_roundtrip as E  # noqa: E402

HERE = Path(__file__).resolve().parent
OFFICIAL = HERE.parents[1] / "official-sources" / "ircc"
OUT = HERE / "inventory"
FILES = [
    ("checklists/imm5488e.pdf", "xfa"),            # IMM 5488 document checklist, work permit outside Canada
    ("instructions/IMM5905E.pdf", "pdf"),          # New Delhi visa office instructions, work permit
    ("instructions/guide-5487.html", "html"),      # Guide 5487, work permit outside Canada
    ("web-pages/work-permit-outside-forms-documents.html", "html"),
]


def local(tag):
    return tag.rsplit("}", 1)[-1]


def xfa_text(path):
    tpl = E.xfa_streams(E.open_reader(path.read_bytes()))["template"].get_object().get_data()
    root = ET.fromstring(tpl)
    lines = []

    def walk(el):
        if local(el.tag) in ("script", "event", "calculate", "validate", "bind", "items"):
            return
        if local(el.tag) in ("text", "exData", "speak", "toolTip"):
            t = re.sub(r"\s+", " ", "".join(el.itertext())).strip()
            if t and (not lines or lines[-1] != t):
                lines.append(t)
            return
        for c in el:
            walk(c)
    walk(root)
    return "\n".join(lines)


def pdf_text(path):
    return subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True, check=True).stdout


class _Text(HTMLParser):
    SKIP = {"script", "style", "nav", "header", "footer", "noscript", "svg", "form"}

    def __init__(self):
        super().__init__()
        self.depth, self.out = 0, []

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.depth += 1
        elif tag in ("p", "li", "h1", "h2", "h3", "h4", "tr", "br", "div", "section", "dt", "dd"):
            self.out.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if not self.depth:
            self.out.append(data)


def html_text(path):
    p = _Text()
    p.feed(path.read_text(encoding="utf-8", errors="replace"))
    text = re.sub(r"[ \t\r\f\v]+", " ", "".join(p.out))
    return "\n".join(line.strip() for line in text.split("\n") if line.strip())


def main():
    manifest = {i["path"]: i for i in json.loads((OFFICIAL / "manifest.json").read_text())["items"]}
    if len(sys.argv) not in (1, 3) or (len(sys.argv) == 3 and sys.argv[2] not in ("xfa", "pdf", "html")):
        sys.exit("usage: source_text.py [<path under official-sources/ircc> xfa|pdf|html]")
    if len(sys.argv) == 3 and sys.argv[1] not in manifest:
        sys.exit(f"{sys.argv[1]}: not in the official manifest")
    files = [(sys.argv[1], sys.argv[2])] if len(sys.argv) == 3 else FILES
    for rel, kind in files:
        src = OFFICIAL / rel
        h = hashlib.sha256(src.read_bytes()).hexdigest()
        if manifest[rel]["sha256"] != h:
            sys.exit(f"{rel}: hash differs from the official manifest")
        text = {"xfa": xfa_text, "pdf": pdf_text, "html": html_text}[kind](src)
        method = {"xfa": "visible text and captions of the XFA template, document order, scripts removed",
                  "pdf": "pdftotext -layout (poppler)", "html": "page text without scripts, styles, navigation, header, footer"}[kind]
        out = {"summary": {"file": f"official-sources/ircc/{rel}", "sha256": h, "edition": manifest[rel].get("edition"),
                           "url": manifest[rel].get("url"), "kind": "text", "method": method, "derived_by": "prototype/p1/source_text.py"},
               "text": text}
        dest = OUT / (Path(rel).stem.lower() + ".text.inventory.json")
        dest.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
        print(f"{dest.name}: {len(text)} characters from {rel}")


if __name__ == "__main__":
    main()
