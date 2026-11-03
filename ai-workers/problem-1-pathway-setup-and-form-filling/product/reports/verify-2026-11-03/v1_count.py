#!/usr/bin/env python3
"""V1 completeness check (P-290, P-291 (1)): every requirement and product decision -> capability -> test -> status.

Re-run from the repository root (read-only on everything except the three outputs beside this file):

    python3 ai-workers/problem-1-pathway-setup-and-form-filling/product/reports/verify-2026-11-03/v1_count.py

What it does, in order:
 1. Lists every item to check, straight from the files (nothing typed by hand):
    * SA-01B v2.1 build cards (`#### SA-1...` headings), business rules BR-n and journey tests J1-J8;
    * SA-01 v2.8's own requirements (the `- **SA-1-n**` list in section 4; the ones moved to SA-01B are cards above);
    * every product decision P-n in DECISIONS.md and in the decisions/ files it points to.
 2. Reads V1-mapping.tsv (the readers' mapping, checked by the V1 tester): item -> capability ids, backlog ids,
    class and milestone. Refuses to count if an item has no mapping line, or names a capability that does not exist.
 3. Reads qa/CAPABILITIES.md for each capability's milestone and qa status.
 4. Finds tests: a test file "names" a capability when the capability id appears in a test label (the first string
    of ok(...), test(...), it(...), describe(...)), in the file's opening comment, or in an acceptance file's name.
    Suites: prototype/studio/acceptance/*.test.ts and prototype/studio/tests/**/*.ts|cjs|mjs.
 5. Status per item: covered (a capability and a test naming it) / capability but no test / no capability /
    held (P-251) / later (M4 or after, by a decision) / out of scope (by a decision) / not a requirement
    (withdrawn or pointer cards; process decisions) / superseded (a later decision replaced it).
 6. Writes V1-table.csv and V1-table.html beside this file and prints the counts used in V1-completeness.md.

Live AI is never called; nothing in the app is run.
"""
import csv, html, os, re, sys, glob, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, *[".."] * 5))
P = os.path.join(ROOT, "ai-workers/problem-1-pathway-setup-and-form-filling/product")
REQ = os.path.join(ROOT, "ai-workers/problem-1-pathway-setup-and-form-filling/domain/requirements-2026-11-02/02-functional-requirements/super-admin")
S = os.path.join(ROOT, "ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio")
SA01B = os.path.join(REQ, "SA-01B-content-pack-configurator_v2.1_2026-10-27.md")
SA01 = os.path.join(REQ, "SA-01-country-and-immigration-pack-management_v2.8_2026-10-20.md")


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


# ---------- 1. the items to check ----------
def requirement_items():
    items = []
    seen = set()
    for line in read(SA01B).splitlines():
        m = re.match(r"^#### (SA-1B?-\d+[a-z]?) — (.*?)(?:\s{2,}Decision:.*?)?(?:\s+Status:\s*([A-Za-z ]+?))?(?:\s{2,}\*|\s*\*|$)", line)
        if m and m.group(1) not in seen:
            st = re.search(r"Status:\s*([A-Za-z ]+?)(?:\s{2,}|\s*\*|$)", line)
            items.append(dict(id=m.group(1), kind="SA-01B card", title=m.group(2).strip(), spec_status=(st.group(1).strip() if st else "")))
            seen.add(m.group(1))
        m = re.match(r"^### (BR-\d+) (.*?)(?:\s*\*\(.*)?$", line)
        if m and m.group(1) not in seen:
            items.append(dict(id=m.group(1), kind="SA-01B business rule", title=m.group(2).strip(), spec_status=""))
            seen.add(m.group(1))
        m = re.match(r"^### (J\d) (.*)$", line)
        if m and ("SA-01B " + m.group(1)) not in seen:
            items.append(dict(id="SA-01B " + m.group(1), kind="SA-01B journey test", title=m.group(2).strip(), spec_status=""))
            seen.add("SA-01B " + m.group(1))
    for line in read(SA01).splitlines():
        m = re.match(r"^- \*\*(SA-1-\d+)\*\*\s*(?:\*\([^)]*\)\*)?\s*(.*)$", line)
        if m and m.group(1) not in seen:
            title = re.sub(r"\*\*|\*\([^)]*\)\*|`", "", m.group(2)).strip()
            items.append(dict(id=m.group(1), kind="SA-01 requirement", title=title[:160], spec_status=""))
            seen.add(m.group(1))
    return items


def decision_items():
    rows = {}
    def add(pid, text, where):
        n = int(re.sub(r"\D", "", pid))
        key = "P-%02d" % n if n < 100 else "P-%d" % n
        if key not in rows:
            rows[key] = dict(id=key, kind="product decision", title=re.sub(r"\s+", " ", text)[:200], spec_status=where)
    for line in read(os.path.join(P, "DECISIONS.md")).splitlines():
        m = re.match(r"^\| (P-\d+) \| [^|]* \| (.*)", line)
        if m:
            t = re.sub(r"\*\*", "", m.group(2))
            add(m.group(1), t, "DECISIONS.md")
            for n in re.finditer(r"\*\*(P-\d+) \(([^*]*)\*\*(.{0,200})", m.group(2)):  # a decision kept inside another's line
                add(n.group(1), n.group(2) + n.group(3).replace("**", ""), "DECISIONS.md (inside %s)" % m.group(1))
    for f in sorted(glob.glob(os.path.join(P, "decisions", "*.md"))):
        for line in read(f).splitlines():
            g = re.match(r"^\| (P-\d+(?:, P-\d+)+) \| [^|]* \| (.*)", line)
            if g:  # one line holding several decisions: "(P-17) text (P-15) text …"
                parts = re.split(r"\((P-\d+(?:, P-\d+)*)\)", g.group(2))
                for i in range(1, len(parts) - 1, 2):
                    for pid in re.findall(r"P-\d+", parts[i]):
                        add(pid, parts[i + 1], "decisions/" + os.path.basename(f) + " (shared line)")
                for pid in re.findall(r"P-\d+", g.group(1)):
                    add(pid, g.group(2), "decisions/" + os.path.basename(f) + " (shared line)")
                continue
            m = re.match(r"^(?:\| |#+ |- \*\*)(P-\d+)\b[^|]*?(?:\|[^|]*\|)?\s*(.*)", line)
            if m:
                add(m.group(1), re.sub(r"\*\*|\|", " ", m.group(2)), "decisions/" + os.path.basename(f))
    return [rows[k] for k in sorted(rows, key=lambda k: int(k[2:]))]


# ---------- 3. capabilities and backlog ----------
def capabilities():
    caps = {}
    for line in read(os.path.join(P, "qa", "CAPABILITIES.md")).splitlines():
        m = re.match(r"^\| (C\d+\.\d+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|", line)
        if m:
            rest = line[m.end():]
            caps[m.group(1)] = dict(step=m.group(2).strip(), text=m.group(3).strip(), m=m.group(4).strip(), status=m.group(5).strip(),
                                    cited=sorted(set(re.findall(r"(check_[A-Za-z0-9_]+\.(?:ts|cjs)|C\d+\.\d+(?:-[a-z]+)?\.test\.ts)", rest))))
    return caps


def backlog_ids():
    """The text of the three backlog files; a backlog id is valid when it appears there as a word (a row id, or a named
    part such as M3-A or E1 inside a row)."""
    return "\n".join(read(os.path.join(P, n)) for n in ("BACKLOG.md", "BACKLOG-requirements.md", "BACKLOG-requirements-qa.md"))


# ---------- 4. tests ----------
LABEL_RE = re.compile(r"""\b(?:ok|test|it|describe|check|step|expect)\s*\(\s*(["'`])((?:\\.|(?!\1).)*)\1""")


def cap_pattern(cid):
    return re.compile(r"(?<![\w.])" + re.escape(cid) + r"(?![\d])")


def test_kind(rel):
    """suite = run by product/tools/run-suites.sh on CI (tests/check_*, tests/runtime/check_*); acceptance = written before
    the build and red until a builder moves it into the suites (acceptance/README.md); qa walk = qa's or the scout's own
    checks (tests/qa, tests/scout), run by hand. Fixtures, setup and helper files are not tests and are skipped."""
    b = os.path.basename(rel)
    if rel.startswith("acceptance/") and b.endswith(".test.ts"):
        return "acceptance"
    if rel.startswith(("tests/qa/", "tests/scout/")):
        return "qa walk"
    if b.startswith("check_") and rel.count("/") == 1 or rel.startswith("tests/runtime/check_"):
        return "suite"
    return None


def test_index(cap_ids):
    files = sorted(glob.glob(os.path.join(S, "acceptance", "*.test.ts")))
    for ext in ("ts", "cjs", "mjs"):
        files += sorted(glob.glob(os.path.join(S, "tests", "**", "*." + ext), recursive=True))
    files = [f for f in files if test_kind(os.path.relpath(f, S))]
    found = collections.defaultdict(list)  # cap -> [(file, how, label)]
    pats = {c: cap_pattern(c) for c in cap_ids}
    for f in files:
        rel = os.path.relpath(f, S)
        src = read(f)
        head = "\n".join(src.splitlines()[:15])
        labels = [m.group(2) for m in LABEL_RE.finditer(src)]
        for c, pat in pats.items():
            lab = next((l for l in labels if pat.search(l)), None)
            if lab is not None:
                found[c].append((rel, "label", lab[:140]))
            elif os.path.basename(f).startswith(c + ".") or os.path.basename(f).startswith(c + "-"):
                found[c].append((rel, "file name", ""))
            elif pat.search(head):
                found[c].append((rel, "opening comment", ""))
    return found, len(files)


def add_cited(found, caps):
    """A test file qa's evidence for the capability cites by name, that exists, and that does not name the capability itself."""
    paths = {}
    for f in glob.glob(os.path.join(S, "acceptance", "*.test.ts")) + glob.glob(os.path.join(S, "tests", "**", "*.*"), recursive=True):
        rel = os.path.relpath(f, S)
        if test_kind(rel):
            paths.setdefault(os.path.basename(f), rel)
    for c, v in caps.items():
        have = {t[0] for t in found.get(c, [])}
        for name in v.get("cited", []):
            rel = paths.get(name)
            if rel and rel not in have:
                found[c].append((rel, "cited in qa evidence", ""))
                have.add(rel)


# ---------- 2. the mapping ----------
def mapping():
    rows = {}
    with open(os.path.join(HERE, "V1-mapping.tsv"), encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            if r["id"] in rows:
                sys.exit("mapping: %s is listed twice" % r["id"])
            rows[r["id"]] = r
    return rows


CLASSES = {"product", "held", "later", "out of scope", "not a requirement", "superseded", "process"}
ORDER = {"M2": 0, "M3": 1, "M4": 2, "later": 3, "team": 4, "-": 5}


def main():
    import io, contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        out = run()
    sys.stdout.write(buf.getvalue())
    write_md(out, buf.getvalue())


def run():
    items = requirement_items() + decision_items()
    caps = capabilities()
    blog = backlog_ids()
    maps = mapping()
    tests, nfiles = test_index(list(caps))
    add_cited(tests, caps)
    errors = []
    out = []
    for it in items:
        mp = maps.get(it["id"])
        if not mp:
            errors.append("no mapping line for " + it["id"])
            continue
        cls = mp["class"].strip()
        if cls not in CLASSES:
            errors.append("%s: unknown class %r" % (it["id"], cls))
        cids = [c.strip() for c in mp["capabilities"].split(",") if c.strip() and c.strip() != "-"]
        for c in cids:
            if c not in caps:
                errors.append("%s: capability %s is not in qa/CAPABILITIES.md" % (it["id"], c))
        bids = [b.strip() for b in mp["backlog"].split(",") if b.strip() and b.strip() != "-"]
        for b in bids:
            if not re.search(r"(?<![\w-])" + re.escape(b) + r"(?![\w])", blog):
                errors.append("%s: backlog item %s is not in the backlog files" % (it["id"], b))
        tested = [(c, t) for c in cids for t in tests.get(c, [])]
        if cls == "product":
            if not cids:
                # the V1 tester's code check: built and tested, but missing from the capability list (a records gap)
                status = "no capability (built, records gap)" if mp["note"].startswith("Built, not on the capability list") else "no capability"
            elif tested:
                status = "covered"
            else:
                status = "capability but no test"
        else:
            status = {"held": "held", "later": "later", "out of scope": "out of scope", "not a requirement": "not a requirement",
                      "superseded": "superseded", "process": "process (no capability expected)"}[cls]
        m = mp["milestone"].strip() or "-"
        if cids and m in ("", "-"):
            m = caps[cids[0]]["m"] if cids[0] in caps else "-"
        best = {}
        for c, t in tested:  # one test per capability: prefer a CI suite, then a label, then the file name, then the opening comment
            rank = ({"suite": 0, "acceptance": 1, "qa walk": 2}[test_kind(t[0])], {"label": 0, "file name": 1, "opening comment": 2, "cited in qa evidence": 3}[t[1]])
            if c not in best or rank < best[c][0]:
                best[c] = (rank, t)
        test_txt = "; ".join("%s: %s%s" % (c, b[1][0], (' — "' + b[1][2] + '"') if b[1][2] else " (" + b[1][1] + ")") for c, b in best.items())
        kinds = sorted({test_kind(t[0]) for _, t in tested})
        out.append(dict(id=it["id"], kind=it["kind"], title=it["title"], spec_status=it["spec_status"], milestone=m,
                        capabilities=", ".join(cids) or "-", cap_status=", ".join("%s %s" % (c, caps[c]["status"]) for c in cids if c in caps) or "-",
                        fit=mp["fit"].strip() or "-", backlog=", ".join(bids) or "-", test=test_txt or "-",
                        test_files=sum(len(tests.get(c, [])) for c in cids), test_kinds=", ".join(kinds) or "-",
                        status=status, note=mp["note"].strip()))
    extra = set(maps) - {i["id"] for i in items}
    for e in sorted(extra):
        errors.append("mapping line %s matches no item in the files" % e)
    if errors:
        sys.stderr.write("\n".join(errors) + "\n")
        sys.exit(1)
    out.sort(key=lambda r: (ORDER.get(r["milestone"], 5), r["kind"], r["id"]))
    # counts
    print("items: %d (requirements %d, decisions %d); test files read: %d; capabilities: %d"
          % (len(out), sum(1 for r in out if r["kind"] != "product decision"), sum(1 for r in out if r["kind"] == "product decision"), nfiles, len(caps)))
    by = collections.Counter((r["kind"], r["status"]) for r in out)
    for k in sorted(by):
        print("  %-22s %-34s %d" % (k[0], k[1], by[k]))
    print("by milestone (product items only):")
    bm = collections.Counter((r["milestone"], r["status"]) for r in out if r["status"] in ("covered", "capability but no test", "no capability", "no capability (built, records gap)"))
    for k in sorted(bm, key=lambda k: (ORDER.get(k[0], 5), k[1])):
        print("  %-6s %-24s %d" % (k[0], k[1], bm[k]))
    print("part fit among covered or capability-but-no-test: %d" % sum(1 for r in out if r["fit"] == "part" and r["status"] in ("covered", "capability but no test")))
    print("how deep is 'covered' (by milestone):")
    def depth(r):
        sts = [x.rsplit(" ", 1)[-1] if not x.endswith("built") else x.split(" ", 1)[1] for x in r["cap_status"].split(", ")]
        if any(s in ("Not built",) for s in sts) and not any(s == "Works" for s in sts):
            return "capability not built yet"
        if r["fit"] != "full":
            return "part of the requirement only"
        if all(s == "Works" for s in sts):
            return "full fit, every capability Works"
        return "full fit, a capability Partial or not yet scored"
    dc = collections.Counter((r["milestone"], depth(r)) for r in out if r["status"] == "covered")
    for k in sorted(dc, key=lambda k: (ORDER.get(k[0], 5), k[1])):
        print("  %-6s %-50s %d" % (k[0], k[1], dc[k]))
    for r in out:
        r["depth"] = depth(r) if r["status"] == "covered" else "-"
    cols = ["id", "kind", "title", "spec_status", "milestone", "status", "depth", "capabilities", "cap_status", "fit", "backlog", "test", "test_files", "test_kinds", "note"]
    with open(os.path.join(HERE, "V1-table.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(out)
    write_html(out, cols)
    hows = collections.Counter(t[1] for c in caps for t in tests.get(c, []))
    print("test evidence kinds (capability x file):", dict(hows), dict(collections.Counter(test_kind(t[0]) for c in caps for t in tests.get(c, []))))
    nosuite = [r["id"] for r in out if r["status"] == "covered" and "suite" not in r["test_kinds"]]
    print("covered items with no CI suite test (only an acceptance test or a qa walk): %d — %s" % (len(nosuite), ", ".join(nosuite)))
    capnosuite = sorted(c for c in caps if tests.get(c) and not any(test_kind(t[0]) == "suite" for t in tests[c]))
    print("capabilities named only by acceptance tests or qa walks (no CI suite): %s" % ", ".join("%s (%s)" % (c, caps[c]["m"]) for c in capnosuite))
    untested = sorted([c for c in caps if not tests.get(c)], key=lambda c: (caps[c]["m"], c))
    print("capabilities with no test naming them: %d — %s" % (len(untested), ", ".join("%s (%s, %s)" % (c, caps[c]["m"], caps[c]["status"]) for c in untested)))
    used = {c for r in out for c in r["capabilities"].split(", ") if c != "-"}
    print("capabilities no requirement or decision maps to: %s" % (", ".join(sorted(set(caps) - used, key=lambda c: [int(x) for x in c[1:].split(".")])) or "none"))
    return out


def md_cell(t, n=220):
    t = re.sub(r"\s+", " ", str(t)).replace("|", "/").strip()
    return t if len(t) <= n else t[: n - 1] + "…"


def write_md(out, counts_text):
    """Rewrites the generated part of V1-completeness.md (between the two markers); the text above it is the tester's."""
    path = os.path.join(HERE, "V1-completeness.md")
    if not os.path.exists(path):
        return
    doc = read(path)
    a, b = "<!-- generated by v1_count.py: start -->", "<!-- generated by v1_count.py: end -->"
    if a not in doc or b not in doc:
        return
    L = [a, "", "## Counts (printed by the script)", "", "```", counts_text.rstrip(), "```", ""]
    def table(title, rows, cols, heads):
        L.append(title)
        L.append("")
        if not rows:
            L.append("None.")
            L.append("")
            return
        L.append("| " + " | ".join(heads) + " |")
        L.append("|" + "---|" * len(heads))
        for r in rows:
            L.append("| " + " | ".join(md_cell(r[c]) for c in cols) + " |")
        L.append("")
    ms = ["M2", "M3", "M4", "team"]
    n = 1
    for m in ms:
        rows = [r for r in out if r["milestone"] == m and r["status"].startswith("no capability")]
        table("### G%d. %s: no capability (%d)" % (n, m, len(rows)), rows, ["id", "kind", "title", "backlog", "note"],
              ["Item", "Kind", "What it asks", "Backlog", "What is missing (reader, checked by the V1 tester)"])
        n += 1
    rows = [r for r in out if r["status"] == "capability but no test"]
    table("### G%d. Capability but no test (%d)" % (n, len(rows)), rows, ["id", "milestone", "capabilities", "note"], ["Item", "M", "Capability", "Note"])
    n += 1
    for m in ["M2", "M3", "T", "M4", "team"]:
        rows = [r for r in out if r["milestone"] == m and r["status"] == "covered" and r["depth"] == "part of the requirement only"]
        table("### G%d. %s: a capability covers only part (%d)" % (n, m, len(rows)), rows, ["id", "capabilities", "cap_status", "note"],
              ["Item", "Capabilities", "qa status", "The part not covered"])
        n += 1
    for m in ["M2", "M3", "M4"]:
        rows = [r for r in out if r["milestone"] == m and r["status"] == "covered" and r["depth"] in ("capability not built yet", "full fit, a capability Partial or not yet scored")]
        table("### G%d. %s: mapped to a capability that is not built or only Partial (%d)" % (n, m, len(rows)), rows, ["id", "capabilities", "cap_status", "note"],
              ["Item", "Capabilities", "qa status", "Note"])
        n += 1
    L.append("## Not gaps, listed so nothing is hidden")
    L.append("")
    for st, title in [("held", "Held for the SA-01B product owner (P-251)"), ("later", "Later, by a decision"),
                      ("out of scope", "Out of scope, by a decision"), ("superseded", "Decisions superseded by a later one"),
                      ("not a requirement", "Not a requirement (withdrawn or pointer cards, scope lists)")]:
        rows = [r for r in out if r["status"] == st]
        table("### %s (%d)" % (title, len(rows)), rows, ["id", "milestone", "capabilities", "note"], ["Item", "M", "Capabilities", "Why"])
    rows = [r for r in out if r["status"] == "covered" and r["depth"] == "full fit, every capability Works"]
    table("### Covered in full by capabilities qa scores Works (%d)" % len(rows), rows, ["id", "milestone", "capabilities", "test"],
          ["Item", "M", "Capabilities", "One test per capability (file — label)"])
    L.append(b)
    head, rest = doc.split(a, 1)
    tail = rest.split(b, 1)[1]
    with open(path, "w", encoding="utf-8") as f:
        f.write(head + "\n".join(L) + tail)


def write_html(out, cols):
    colour = {"covered": "#1a7f37", "capability but no test": "#9a6700", "no capability": "#cf222e", "held": "#8250df", "later": "#57606a"}
    rows = []
    for r in out:
        rows.append("<tr>" + "".join(
            '<td%s>%s</td>' % ((' style="color:%s;font-weight:600"' % colour[r[c]]) if c == "status" and r[c] in colour else "", html.escape(str(r[c])))
            for c in cols) + "</tr>")
    page = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>V1 completeness table</title><style>
:root{--bg:#fff;--fg:#1f2328;--line:#d0d7de;--head:#f6f8fa}
@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--line:#30363d;--head:#161b22}}
body{background:var(--bg);color:var(--fg);font:13px/1.4 system-ui,sans-serif;margin:16px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--line);padding:4px 6px;vertical-align:top;text-align:left}
th{background:var(--head);position:sticky;top:0}input{margin:8px 0;padding:4px;width:min(400px,100%)}
.wrap{overflow-x:auto}</style></head><body>
<h1>V1 completeness table (3 Nov 2026)</h1>
<p>Made by <code>v1_count.py</code> from <code>V1-mapping.tsv</code>, <code>qa/CAPABILITIES.md</code> and the test files. Read the report <code>V1-completeness.md</code> first.</p>
<input id="q" placeholder="Filter (any text)" oninput="f()"><div class="wrap"><table><thead><tr>""" + "".join("<th>%s</th>" % c for c in cols) + "</tr></thead><tbody id=b>" + "\n".join(rows) + """</tbody></table></div>
<script>function f(){var q=document.getElementById('q').value.toLowerCase();for(const r of document.getElementById('b').rows){r.style.display=r.textContent.toLowerCase().includes(q)?'':'none'}}</script>
</body></html>"""
    with open(os.path.join(HERE, "V1-table.html"), "w", encoding="utf-8") as f:
        f.write(page)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--list":
        for it in requirement_items() + decision_items():
            print("\t".join([it["id"], it["kind"], it["spec_status"], it["title"]]))
        sys.exit(0)
    if len(sys.argv) > 1 and sys.argv[1] == "--caps":
        for c, v in capabilities().items():
            print("\t".join([c, v["m"], v["status"], v["text"]]))
        sys.exit(0)
    main()
