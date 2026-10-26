"""Reads the structure of portal screens for a capture record (P-66 §1, ways B and C; F1 slice 1), without AI and without
ever keeping an answer. Two inputs:
  page <file.html>       one saved blank portal screen ("Save page as"): its title, and per input the label, the page's own
                         element id or name, type, required flag, length/pattern rules, help text and choices (code + label).
  template <file.csv>    the spreadsheet template (studio/samples/portal-capture-template.csv): one row per input.
A screen that holds an answer is refused, never cleaned: a typed value, a ticked box or radio, a chosen dropdown option,
text in a text area or an editable area, a ticked custom control, or text that looks like a client's details (an email
address, a long number, a passport-like code, a label with text after its colon) (the Lead's response to challenge
point 1; CHECK fixes, 23 Oct). A page with custom controls the reader cannot read (role="radio" and the like), the same
element id twice, or text in another encoding than it declares is not read rather than half read. Scripts, styles and
hidden inputs (session tokens) are skipped and never stored; the file itself is not kept by the Studio, only this
structure and the file's checksum.
Prints one JSON line: {ok, way, sha256, screens: [...]} or {ok: false, refused: [...] | error}.
The file is read as data only; nothing in it is executed.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/read_portal_capture.py page|template <file>
"""
import csv
import hashlib
import html
import io
import json
import os
import re
import sys
from html.parser import HTMLParser

# The rules both readers follow (F2a, BR-2): this reader of saved pages and the browser extension's reader of the live
# page (extension/src/reader.ts) read the same file, so they cannot drift; tests/check_forms_f2a.ts reads every fixture
# with both. Patterns use ASCII classes only and compile with re.ASCII, as JavaScript reads them.
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "contracts", "portal-reader-rules.json"), encoding="utf-8") as _f:
    RULES = json.load(_f)
SKIP_TYPES = set(RULES["skip_types"])
PARTS = RULES["parts"]
TYPES = set(RULES["types"])
# Custom controls the reader does not read: a page using them is not read (its question would go missing silently).
ARIA_CONTROLS = set(RULES["aria_controls"])
SKIP_CONTAINERS = tuple(RULES["skip_containers"])
MAX_INPUTS = RULES["max_inputs"]  # per screen; a portal screen has tens
# Text that looks like a client's details rather than a question (P-66: a capture holds structure only).
CLIENT_DATA = [(re.compile(c["pattern"], re.ASCII), c["what"]) for c in RULES["client_data"]]
LABEL_ANSWER = re.compile(RULES["label_answer"]["pattern"])
PLACEHOLDER = re.compile(RULES["placeholder"]["pattern"], re.I | re.ASCII)
REQUIRED_MARKS = re.compile(RULES["required_marks"]["prefix"] + "|" + RULES["required_marks"]["suffix"], re.I)


def client_data(text):
    for rx, what in CLIENT_DATA:
        if rx.search(text or ""):
            return what
    return None


def template_text_problem(text):
    """A template cell that is a spreadsheet formula, or marks a choice as made."""
    t = (text or "").strip()
    if re.match(r"^[=+@]|^-\s*\w+\(", t) or "\t" in t or "\r" in t:
        return "a spreadsheet formula"
    if re.search(r"[\[(]\s*(selected|chosen|checked|ticked|x|✓|✔)\s*[\])]|[✓✔☑]", t, re.I):
        return "a choice marked as made"
    return None


def search_form(a):
    words = re.split(r"[\s_-]+", (a.get("class", "") + " " + a.get("id", "") + " " + a.get("name", "")).lower())
    return a.get("role") == "search" or "search" in words


def placeholder(code, label):
    """"Please select…", "-- Choose --" or an empty first option; a first option with a real label is a choice."""
    return not (label or "").strip(" -") or bool(PLACEHOLDER.match(label or ""))


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(s or "")).strip()


class Screen(HTMLParser):
    """One pass over the page in document order. Inputs inside a search form or the page header are not questions."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""; self.h1 = ""; self.inputs = []; self.refused = []
        self.labels_for = {}; self.text_by_id = {}
        self.skip = 0          # inside <script>, <style>, <noscript>, <template>
        self.search = 0        # inside a search form
        self.cap = None        # what text is being collected: ("title"|"h1"|"label"|"legend"|"option"|"textarea"|"id", ref)
        self.buf = []
        self.label_stack = []  # open <label> elements: {for, text, inputs}
        self.legends = []      # open fieldsets: [legend text]
        self.select = None; self.option = None; self.textarea = None
        self.id_stack = []     # elements with an id whose text may be help (aria-describedby)
        self.editable = []     # open contenteditable elements: [tag, text]
        self.dom_ids = {}      # element id → times seen (a page using an id twice is not read)
        self.problems = []     # reasons the page cannot be read reliably

    # -- helpers
    def _flush(self):
        t = clean("".join(self.buf)); self.buf = []; return t

    def _add(self, el, labelled_by=None):
        el["order"] = len(self.inputs) + 1
        if self.legends and self.legends[-1]:
            el["group"] = self.legends[-1]
        if self.label_stack:
            # A radio's own label names its option; the question is the group's legend.
            self.label_stack[-1]["inputs"].append(labelled_by or el)
        self.inputs.append(el)

    def _refuse(self, el, why):
        self.refused.append({"id": el.get("id"), "label": el.get("label") or el.get("id"), "why": why})

    # -- parser events
    def handle_starttag(self, tag, attrs):
        a = {k: (v if v is not None else "") for k, v in attrs}
        if tag in SKIP_CONTAINERS:
            self.skip += 1; return
        if self.skip:
            return
        if tag == "form" and search_form(a):
            self.search += 1; return
        role = (a.get("role") or "").lower()
        if role in ARIA_CONTROLS and tag not in ("input", "select", "textarea", "option"):
            if (a.get("aria-checked") or a.get("aria-selected") or a.get("aria-pressed") or "").lower() in ("true", "mixed") or (a.get("aria-valuenow") or a.get("aria-valuetext") or "").strip():
                self._refuse({"id": a.get("id"), "label": clean(a.get("aria-label")) or a.get("id") or role}, f"a custom control (role={role}) is ticked or holds a value")
            elif not self.search:
                self.problems.append(f"it uses a custom control (role=\"{role}\") the reader cannot read; record this screen with the spreadsheet template")
        if "contenteditable" in a and (a.get("contenteditable") or "true").lower() != "false":
            self.editable.append([tag, []])
        if a.get("id") and tag not in ("option",):
            self.dom_ids[a["id"]] = self.dom_ids.get(a["id"], 0) + 1
        if a.get("id") and tag not in ("input", "select", "textarea", "option"):
            self.id_stack.append([tag, a["id"], []])
        if tag == "title":
            self.cap = ("title", None); self.buf = []
        elif tag == "h1" and not self.h1:
            self.cap = ("h1", None); self.buf = []
        elif tag == "fieldset":
            self.legends.append("")
        elif tag == "legend":
            self.cap = ("legend", None); self.buf = []
        elif tag == "label":
            self.label_stack.append({"for": a.get("for"), "text": [], "inputs": []}); self.cap = ("label", None); self.buf = []
        elif tag in ("input", "select", "textarea") and not self.search:
            typ = (a.get("type") or "text").lower() if tag == "input" else tag
            if typ in SKIP_TYPES:
                return
            ident = a.get("id") or a.get("name")
            if not ident:
                # No id or name: not a question the extension could find; still, an answer in it refuses the screen.
                if tag == "input" and (("checked" in a and typ in ("radio", "checkbox")) or (a.get("value", "").strip() and typ not in ("radio", "checkbox", "file"))):
                    self._refuse({"id": None, "label": clean(a.get("aria-label")) or typ}, "an input with no id holds an answer")
                return
            el = {"id": ident, "name": a.get("name") or None, "type": typ if typ in TYPES else "text",
                  "required": "required" in a or a.get("aria-required") == "true",
                  "label": clean(a.get("aria-label")) or None, "help": None, "_described": a.get("aria-describedby"),
                  "_labelled": a.get("aria-labelledby"), "_dom_id": a.get("id")}
            for k, key in (("maxlength", "max_length"), ("minlength", "min_length")):
                if a.get(k, "").isdigit():
                    el[key] = int(a[k])
            if a.get("pattern"):
                el["pattern"] = a["pattern"]
            if tag == "input":
                if typ in ("radio", "checkbox"):
                    if "checked" in a:
                        self._refuse(el, "an option is ticked")
                    if typ == "radio":
                        # One question per radio group: its options are the group's radios.
                        grp = next((x for x in self.inputs if x["type"] == "radio" and x.get("name") and x["name"] == a.get("name")), None)
                        opt = {"code": a.get("value", ""), "label": None, "_dom_id": a.get("id")}
                        if grp:
                            grp["options"].append(opt)
                            if self.label_stack:
                                self.label_stack[-1]["inputs"].append(opt)
                            return
                        el["id"] = a.get("name") or ident
                        el["options"] = [opt]; el["label"] = clean(a.get("aria-label")) or None; el["_dom_id"] = None
                        self._add(el, labelled_by=opt)
                        return
                elif a.get("value", "").strip() and typ != "file":
                    self._refuse(el, "it holds a typed value")
                self._add(el)
            elif tag == "select":
                el["options"] = []; el["_placeholder"] = None; self.select = el; self._add(el)
            else:
                self.textarea = el; self.cap = ("textarea", None); self.buf = []; self._add(el)
        elif tag == "option" and self.select is not None:
            self.option = {"code": a.get("value"), "label": None, "selected": "selected" in a}
            self.cap = ("option", None); self.buf = []

    def handle_endtag(self, tag):
        if tag in SKIP_CONTAINERS:
            self.skip = max(0, self.skip - 1); return
        if self.skip:
            return
        if tag == "form" and self.search:
            self.search -= 1; return
        if self.editable and self.editable[-1][0] == tag:
            _t, text = self.editable.pop()
            if clean(" ".join(text)):
                self._refuse({"id": None, "label": "an editable area"}, "an editable area holds text")
        if self.id_stack and self.id_stack[-1][0] == tag:
            _t, ident, text = self.id_stack.pop()
            self.text_by_id[ident] = clean(" ".join(text))
        if tag == "title" and self.cap and self.cap[0] == "title":
            self.title = self._flush(); self.cap = None
        elif tag == "h1" and self.cap and self.cap[0] == "h1":
            self.h1 = self._flush(); self.cap = None
        elif tag == "legend" and self.cap and self.cap[0] == "legend":
            t = self._flush(); self.cap = None
            if self.legends:
                self.legends[-1] = t
        elif tag == "fieldset" and self.legends:
            self.legends.pop()
        elif tag == "label" and self.label_stack:
            lab = self.label_stack.pop(); t = clean(" ".join(lab["text"]) + " " + self._flush()); self.cap = ("label", None) if self.label_stack else None
            if lab["for"]:
                self.labels_for[lab["for"]] = t
            for el in lab["inputs"]:
                if el.get("label") is None:
                    el["label"] = t
        elif tag == "option" and self.option is not None:
            o = self.option; o["label"] = self._flush(); self.cap = None
            if o["code"] is None:
                o["code"] = o["label"]
            sel = self.select
            if not sel["options"] and sel["_placeholder"] is None and placeholder(o["code"], o["label"]):
                sel["_placeholder"] = o["label"]  # "Please select…", selected or not, is not an answer
            else:
                if o["selected"]:
                    self._refuse(sel, f"the option \"{o['label']}\" is chosen")
                sel["options"].append({"code": o["code"], "label": o["label"]})
            self.option = None
        elif tag == "select":
            self.select = None
        elif tag == "textarea" and self.textarea is not None:
            if self._flush():
                self._refuse(self.textarea, "the text area holds text")
            self.textarea = None; self.cap = None

    def handle_data(self, data):
        if self.skip:
            return
        for entry in self.id_stack:
            entry[2].append(data)
        for entry in self.editable:
            entry[1].append(data)
        if self.cap:
            if self.cap[0] == "label" and self.label_stack:
                self.label_stack[-1]["text"].append(data)
            else:
                self.buf.append(data)

    def finish(self):
        for el in self.inputs:
            # aria-labelledby names the question first (as a browser does), from the text of the elements it points to.
            if el.get("_labelled"):
                named = " ".join(self.text_by_id.get(i, "") for i in el["_labelled"].split()).strip()
                if named:
                    el["label"] = named
            if el.get("label") is None and el.get("_dom_id") in self.labels_for:
                el["label"] = self.labels_for[el["_dom_id"]]
            for o in el.get("options") or []:
                if o.get("label") is None and o.get("_dom_id") in self.labels_for:
                    o["label"] = self.labels_for[o["_dom_id"]]
                if not o.get("label"):
                    o["label"] = o["code"]
                o.pop("_dom_id", None)
            if el.get("_described"):
                help_text = " ".join(self.text_by_id.get(i, "") for i in el["_described"].split()).strip()
                el["help"] = help_text or None
            if not el.get("label"):
                el["label"] = el.get("group") or el["id"]
            if el["label"].startswith("*") or "(required)" in el["label"].lower():
                el["required"] = True
            el["label"] = REQUIRED_MARKS.sub("", el["label"]).strip()
            part = PARTS.get(el["label"].lower().strip(" :"))
            if part and el.get("group"):
                el["part"] = part
            for k in ("_described", "_labelled", "_dom_id", "_placeholder", "name"):
                el.pop(k, None)
            if el.get("help") is None:
                el.pop("help", None)
        names = {el["id"]: el["label"] for el in self.inputs}
        for r in self.refused:
            r["label"] = names.get(r["id"], r["label"])
        title = self.h1 or self.title
        # Text that looks like a client's details: refused like an answer (a label "Family name: SMITH" shows one).
        for where, text, el in [("the screen title", title, None)] + [(f"\"{el['label']}\"", t, el) for el in self.inputs for t in [el.get("label"), el.get("group"), el.get("help")] + [o.get("label") for o in el.get("options") or []]]:
            what = client_data(text)
            if what:
                self._refuse({"id": el["id"] if el else None, "label": el["label"] if el else "screen title"}, f"{where} shows {what}")
        for el in self.inputs:
            if el["type"] not in ("radio", "checkbox", "select") and LABEL_ANSWER.search(el.get("label") or ""):
                self._refuse(el, RULES["label_answer"]["what"])
        dup = sorted({el["id"] for el in self.inputs if sum(1 for x in self.inputs if x["id"] == el["id"]) > 1} | {i for i, n in self.dom_ids.items() if n > 1 and i in {el["id"] for el in self.inputs}})
        if dup:
            self.problems.append(f"the page uses the element id {', '.join(dup[:3])} more than once, so its questions cannot be told apart")
        if len(self.inputs) > MAX_INPUTS:
            self.problems.append(f"it has {len(self.inputs)} questions; a portal screen has at most {MAX_INPUTS}")
        return {"title": title, "inputs": self.inputs}


def decode(raw, declared=None):
    """Text in the encoding the file declares (a BOM or <meta charset>), else UTF-8; never silently garbled."""
    if raw.startswith(b"\xef\xbb\xbf"):
        return raw[3:].decode("utf-8", errors="strict")
    enc = declared
    if enc is None:
        m = re.search(rb"<meta[^>]+charset\s*=\s*[\"']?([A-Za-z0-9_-]+)", raw[:4096], re.I)
        enc = m.group(1).decode("ascii") if m else "utf-8"
    return raw.decode(enc, errors="strict")


def read_page(raw):
    try:
        text = decode(raw)
    except (UnicodeDecodeError, LookupError):
        return {"ok": False, "error": "the page's text is not in the encoding it declares (save the page again, as a web page, complete)"}
    if not re.match(r"\s*(<!doctype html|<html)", text[:512], re.I):
        return {"ok": False, "error": "not a saved web page (HTML)"}
    p = Screen(); p.feed(text); p.close()
    screen = p.finish()
    if p.refused:
        return {"ok": False, "refused": p.refused, "title": screen["title"]}
    if p.problems:
        return {"ok": False, "error": "; ".join(list(dict.fromkeys(p.problems))[:3])}
    if not screen["inputs"]:
        return {"ok": False, "error": "no questions found on this page (a portal screen has inputs; a guide page belongs on the combination's sources)"}
    return {"ok": True, "screens": [screen]}


COLUMNS = ["screen_order", "screen_title", "input_order", "input_id", "label", "type", "required", "options", "help", "max_length", "pattern", "group", "part"]


def read_template(raw):
    try:
        text = raw.decode("utf-8-sig", errors="strict")
    except UnicodeDecodeError:
        return {"ok": False, "error": "the template is not UTF-8 text (save it as \"CSV UTF-8\")"}
    rows = list(csv.DictReader(io.StringIO(text)))
    head = [h.strip().lower() for h in (rows[0].keys() if rows else []) if h]
    answers = [h for h in head if h not in COLUMNS and re.search(r"value|answer|respon|default|entered|client|selected|chosen|filled", h)]
    if answers:
        return {"ok": False, "refused": [{"id": None, "label": answers[0], "why": "the template has an answer column; it holds structure only"}]}
    missing = [c for c in ("screen_order", "screen_title", "input_id", "label", "type") if c not in head]
    if missing:
        return {"ok": False, "error": f"the template is missing the column{'s' if len(missing) > 1 else ''} {', '.join(missing)} (use studio/samples/portal-capture-template.csv)"}
    screens, problems = {}, []
    for n, r in enumerate(rows, start=2):
        r = {k.strip().lower(): (v or "").strip() for k, v in r.items() if k}
        if not any(r.values()) or r.get("screen_order", "").startswith("#"):
            continue  # blank rows and "#" notes (the template's instructions) are not inputs
        typ = r["type"].lower()
        if typ not in TYPES:
            problems.append(f"row {n}: type \"{r['type']}\" is not one of {', '.join(sorted(TYPES))}")
            continue
        if not r["screen_order"].isdigit() or int(r["screen_order"]) < 1:
            problems.append(f"row {n}: screen_order must be a number from 1"); continue
        if r.get("max_length") and (not r["max_length"].isdigit() or not 0 < int(r["max_length"]) <= 100000):
            problems.append(f"row {n}: max_length must be a number from 1 to 100000"); continue
        if not r["input_id"]:
            problems.append(f"row {n}: input_id is empty"); continue
        if r.get("part") and r["part"] not in ("YYYY", "MM", "DD"):
            problems.append(f"row {n}: part must be YYYY, MM or DD"); continue
        s = screens.setdefault(int(r["screen_order"]), {"title": r["screen_title"], "inputs": []})
        if r["screen_title"] != s["title"]:
            problems.append(f"row {n}: screen {int(r['screen_order'])} is titled \"{s['title']}\" on an earlier row"); continue
        el = {"id": r["input_id"], "label": r["label"], "type": typ, "required": r.get("required", "").lower() in ("yes", "y", "true", "1", "required")}
        if r.get("options"):
            opts = []
            for pair in r["options"].split(";"):
                if not pair.strip():
                    continue
                code, _, label = pair.partition("=")
                opts.append({"code": code.strip(), "label": (label or code).strip()})
            codes = [o["code"] for o in opts]
            if len(set(codes)) != len(codes):
                problems.append(f"row {n}: an option code appears twice"); continue
            el["options"] = opts
        for k in ("help", "pattern", "group", "part"):
            if r.get(k):
                el[k] = r[k]
        if r.get("max_length", "").isdigit():
            el["max_length"] = int(r["max_length"])
        el["order"] = int(r["input_order"]) if r.get("input_order", "").isdigit() else len(s["inputs"]) + 1
        s["inputs"].append(el)
    ids = [el["id"] for s in screens.values() for el in s["inputs"]]
    dup = sorted({i for i in ids if ids.count(i) > 1})
    if dup:
        problems.append(f"the input_id {', '.join(dup[:3])} appears more than once")
    if problems:
        return {"ok": False, "error": "; ".join(problems[:5])}
    if not screens:
        return {"ok": False, "error": "the template has no rows"}
    refused = []
    for k in sorted(screens):
        s = screens[k]
        s["inputs"].sort(key=lambda el: el["order"])  # the rows' own input_order, not the file's row order
        for el in s["inputs"]:
            for text in [s["title"], el.get("label"), el.get("group"), el.get("help")] + [o["label"] for o in el.get("options") or []] + [o["code"] for o in el.get("options") or []]:
                what = client_data(text) or template_text_problem(text)
                if what:
                    refused.append({"id": el["id"], "label": el["label"], "why": f"its text shows {what}"}); break
    if refused:
        return {"ok": False, "refused": refused}
    if any(len(s["inputs"]) > MAX_INPUTS for s in screens.values()):
        return {"ok": False, "error": f"a screen has more than {MAX_INPUTS} questions"}
    return {"ok": True, "screens": [dict(screens[k], order=k) for k in sorted(screens)]}


def main():
    mode, path = sys.argv[1], sys.argv[2]
    with open(path, "rb") as f:
        raw = f.read()
    out = read_page(raw) if mode == "page" else read_template(raw) if mode == "template" else {"ok": False, "error": "mode must be page or template"}
    out["way"] = "saved_page" if mode == "page" else "template"
    out["sha256"] = hashlib.sha256(raw).hexdigest()
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # a broken file is a plain refusal, never a crash
        print(json.dumps({"ok": False, "error": f"the file could not be read ({type(e).__name__})"}))
