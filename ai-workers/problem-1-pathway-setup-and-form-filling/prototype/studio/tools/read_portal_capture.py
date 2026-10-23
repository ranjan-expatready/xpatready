"""Reads the structure of portal screens for a capture record (P-66 §1, ways B and C; F1 slice 1), without AI and without
ever keeping an answer. Two inputs:
  page <file.html>       one saved blank portal screen ("Save page as"): its title, and per input the label, the page's own
                         element id or name, type, required flag, length/pattern rules, help text and choices (code + label).
  template <file.csv>    the spreadsheet template (studio/samples/portal-capture-template.csv): one row per input.
A screen that holds an answer is refused, never cleaned: a typed value, a ticked box or radio, a chosen dropdown option
or text in a text area (the Lead's response to challenge point 1). Scripts, styles and hidden inputs (session tokens) are
skipped and never stored; the file itself is not kept by the Studio, only this structure and the file's checksum.
Prints one JSON line: {ok, way, sha256, screens: [...]} or {ok: false, refused: [...] | error}.
The file is read as data only; nothing in it is executed.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/read_portal_capture.py page|template <file>
"""
import csv
import hashlib
import html
import io
import json
import re
import sys
from html.parser import HTMLParser

SKIP_TYPES = {"hidden", "submit", "button", "reset", "image", "search"}
PARTS = {"year": "YYYY", "yyyy": "YYYY", "month": "MM", "mm": "MM", "day": "DD", "dd": "DD"}
TYPES = {"text", "date", "select", "radio", "checkbox", "textarea", "number", "email", "tel", "file"}


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
        if tag in ("script", "style", "noscript", "template"):
            self.skip += 1; return
        if self.skip:
            return
        if tag == "form" and (a.get("role") == "search" or "search" in (a.get("class", "") + a.get("id", "")).lower()):
            self.search += 1; return
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
                return
            el = {"id": ident, "name": a.get("name") or None, "type": typ if typ in TYPES else "text",
                  "required": "required" in a or a.get("aria-required") == "true",
                  "label": clean(a.get("aria-label")) or None, "help": None, "_described": a.get("aria-describedby"), "_dom_id": a.get("id")}
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
        if tag in ("script", "style", "noscript", "template"):
            self.skip = max(0, self.skip - 1); return
        if self.skip:
            return
        if tag == "form" and self.search:
            self.search -= 1; return
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
            if not sel["options"] and sel["_placeholder"] is None and (o["code"] == "" or re.match(r"^(--|select|choose)", o["label"], re.I)):
                sel["_placeholder"] = o["label"]
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
        if self.cap:
            if self.cap[0] == "label" and self.label_stack:
                self.label_stack[-1]["text"].append(data)
            else:
                self.buf.append(data)

    def finish(self):
        for el in self.inputs:
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
            el["label"] = re.sub(r"^\*\s*|\s*\(required\)\s*$", "", el["label"], flags=re.I).strip()
            part = PARTS.get(el["label"].lower().strip(" :"))
            if part and el.get("group"):
                el["part"] = part
            for k in ("_described", "_dom_id", "_placeholder", "name"):
                el.pop(k, None)
            if el.get("help") is None:
                el.pop("help", None)
        names = {el["id"]: el["label"] for el in self.inputs}
        for r in self.refused:
            r["label"] = names.get(r["id"], r["label"])
        return {"title": self.h1 or self.title, "inputs": self.inputs}


def read_page(raw):
    text = raw.decode("utf-8", errors="replace")
    if not re.match(r"\s*(<!doctype html|<html)", text[:512], re.I):
        return {"ok": False, "error": "not a saved web page (HTML)"}
    p = Screen(); p.feed(text); p.close()
    screen = p.finish()
    if p.refused:
        return {"ok": False, "refused": p.refused, "title": screen["title"]}
    if not screen["inputs"]:
        return {"ok": False, "error": "no questions found on this page (a portal screen has inputs; a guide page belongs on the combination's sources)"}
    return {"ok": True, "screens": [screen]}


COLUMNS = ["screen_order", "screen_title", "input_order", "input_id", "label", "type", "required", "options", "help", "max_length", "pattern", "group", "part"]


def read_template(raw):
    text = raw.decode("utf-8-sig", errors="replace")
    rows = list(csv.DictReader(io.StringIO(text)))
    head = [h.strip().lower() for h in (rows[0].keys() if rows else [])]
    answers = [h for h in head if h in ("value", "answer", "response", "values", "answers")]
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
        if not r["screen_order"].isdigit():
            problems.append(f"row {n}: screen_order must be a number"); continue
        s = screens.setdefault(int(r["screen_order"]), {"title": r["screen_title"], "inputs": []})
        el = {"id": r["input_id"], "label": r["label"], "type": typ, "required": r.get("required", "").lower() in ("yes", "y", "true", "1", "required")}
        if r.get("options"):
            opts = []
            for pair in r["options"].split(";"):
                if not pair.strip():
                    continue
                code, _, label = pair.partition("=")
                opts.append({"code": code.strip(), "label": (label or code).strip()})
            el["options"] = opts
        for k in ("help", "pattern", "group", "part"):
            if r.get(k):
                el[k] = r[k]
        if r.get("max_length", "").isdigit():
            el["max_length"] = int(r["max_length"])
        el["order"] = int(r["input_order"]) if r.get("input_order", "").isdigit() else len(s["inputs"]) + 1
        s["inputs"].append(el)
    if problems:
        return {"ok": False, "error": "; ".join(problems[:5])}
    if not screens:
        return {"ok": False, "error": "the template has no rows"}
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
