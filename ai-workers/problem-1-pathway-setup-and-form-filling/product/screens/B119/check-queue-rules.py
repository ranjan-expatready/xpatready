#!/usr/bin/env python3
"""Which Mergify queue a pull request joins, read from .mergify.yml itself (B119, P-376 (1), 6 Nov).

Records never block code, by one route (Lead 21's ruling on #1147, 6 Nov): CI labels a records-only PR "records"
(tools/records-only.sh, from #1139: the one definition of a record), the queue "records", listed after
"product" so it has the lowest priority, takes the label, and product skips it (D1, P-416, 8 Nov: the m2 and m3 queues
became the one "product" queue). This script evaluates the
queue_conditions the way Mergify does (the first queue, in file order, whose conditions all hold; on a list such as
label, "attr=x" holds when any item equals x and "-attr=x" when none does) on fixed PRs, and checks the rules every
queue keeps (base main, the review label, green ci, refusing drafts, records last). Each fixed PR lists its files;
its label comes from records-only.sh is-records and must agree with the case's expected label (so the definition and
the cases cannot drift apart), and the label name the queues use must be the one records-only.sh prints. A missing
records-only.sh fails the check. Then it breaks the configuration on purpose and expects each
break to be caught, so the check is shown to fail, not only to pass. Runs no suite, US$0. It does not replace Mergify's
own validation (the "Configuration changed" check on the PR).
  python3 -I product/screens/B119/check-queue-rules.py [path/to/.mergify.yml]
It lives in B119's row folder because product/tools/ is the tech lead's; the PR proposes running it in CI.
"""
import copy, os, re, subprocess, sys

try:
    import yaml
except ImportError:
    print("PyYAML is missing; nothing was checked"); sys.exit(2)

P = "ai-workers/problem-1-pathway-setup-and-form-filling"
R = f"{P}/product"
COND = re.compile(r"^(-)?([a-z][a-z-]*)\s*(?:(~=|=)\s*(.*))?$")
LISTS = {"files", "label", "check-success"}
LABEL = "records"   # read from records-only.sh label in main()
ROOT = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip() or "."
IS_RECORDS = os.path.join(ROOT, R, "tools", "records-only.sh")


def holds(cond, pr):
    """One Mergify condition on one PR. Fails loudly on any form this script does not model."""
    if isinstance(cond, dict):
        (op, subs), = cond.items()
        if op == "and": return all(holds(c, pr) for c in subs)
        if op == "or": return any(holds(c, pr) for c in subs)
        if op == "not": return not holds(subs, pr)
        raise ValueError(f"unmodelled condition {cond!r}")
    m = COND.match(cond.strip())
    if not m: raise ValueError(f"unmodelled condition {cond!r}")
    neg, attr, op, val = m.groups()
    if attr not in pr: raise ValueError(f"unmodelled attribute {attr!r} in {cond!r}")
    v = pr[attr]
    if op is None:
        r = bool(v)
    else:
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'": val = val[1:-1]
        items = v if attr in LISTS else [v]
        r = any((re.search(val, i) is not None) if op == "~=" else (i == val) for i in items)
    return not r if neg else r


def queue_of(cfg, pr):
    for q in cfg["queue_rules"]:
        if all(holds(c, pr) for c in q.get("queue_conditions", [])):
            return q["name"]
    return None


_SEEN = {}


def is_records(files):
    """The one definition (#1139, tools/records-only.sh); each file list asked once (the breaks re-ask the same ones)."""
    key = tuple(files)
    if key not in _SEEN: _SEEN[key] = _is_records(files)
    return _SEEN[key]


def _is_records(files):
    r = subprocess.run(["bash", IS_RECORDS, "is-records", "--files"], input="\n".join(files) + "\n",
                       capture_output=True, text=True, cwd=ROOT)
    if r.returncode != 0 or r.stdout.strip() not in ("yes", "no"):
        raise ValueError(f"records-only.sh is-records failed: {r.stdout.strip()} {r.stderr.strip()}")
    return r.stdout.strip() == "yes"


def case(what, files, record, want, title="evidence: something", labels=("review: approved",), checks=("ci",),
         draft=False, base="main"):
    return {"what": what, "record": record, "want": want,
            "pr": {"files": list(files), "title": title, "label": list(labels), "check-success": list(checks),
                   "draft": draft, "base": base}}


A = f"{P}/prototype/studio"
CASES = [  # what, files, a record by #1139's definition?, the queue it must join
    case("the daily records PR: STATE, DECISIONS, BACKLOG, RULES", [f"{R}/STATE.md", f"{R}/DECISIONS.md", f"{R}/BACKLOG.md", f"{R}/RULES.md"], True, "records", "lead: records 6 Nov"),
    case("qa notes with screenshots, a run's text and a built note", [f"{R}/qa/BUGS.md", f"{R}/qa/walks/x/shot.png", f"{R}/qa/runs/out.txt", f"{R}/qa/built/C1.3.md"], True, "records", "qa: after-merge"),
    case("a screen's notes and its HTML board", [f"{R}/screens/12/build-notes.md", f"{R}/screens/12/board.html"], True, "records"),
    case("the history folder", [f"{R}/history/lead20-handover.md", f"{R}/history/old/STATE-2026-11-05.txt"], True, "records"),
    case("the way of working (a record under product/)", [f"{R}/WAY-OF-WORKING.md"], True, "records"),
    case("an M3 title on records only still goes to records", [f"{R}/qa/CAPABILITIES.md"], True, "records", "M3 qa: C7.3 scored"),
    case("records plus one app file: product", [f"{R}/STATE.md", f"{A}/api/src/core.ts"], False, "product"),
    case("records plus one app file, M3 title: product (no title routing)", [f"{R}/qa/built/C7.3.md", f"{A}/web/src/App.tsx"], False, "product", "forms: C7.3 — x"),
    case("an M3 title on code: product", [f"{A}/web/src/App.tsx"], False, "product", "M3 runtime: C7.5 — x"),
    case("app code alone: product", [f"{A}/api/src/demo.ts"], False, "product", "runtime: C4.11 — x"),
    case("a qa script (.cjs) is not a record", [f"{R}/qa/walks/x/walk.cjs"], False, "product"),
    case("a tool under product/tools/, even a .md", [f"{R}/tools/README.md"], False, "product"),
    case("this row's checker (.py under screens/)", [f"{R}/screens/B119/check-queue-rules.py"], False, "product"),
    case("a JSON file under screens/", [f"{R}/screens/12/fixture.json"], False, "product"),
    case("the merge queue file itself", [".mergify.yml"], False, "product"),
    case("a workflow", [".github/workflows/ci.yml"], False, "product"),
    case("a skill", [".claude/skills/next/SKILL.md"], False, "product"),
    case("a look-alike name: STATE.md.bak", [f"{R}/STATE.md.bak"], False, "product"),
    case("a look-alike place: STATE.md outside product/", [f"{A}/STATE.md"], False, "product"),
    case("records without the review label: no queue", [f"{R}/STATE.md"], True, None, labels=()),
    case("records with ci not green: no queue", [f"{R}/STATE.md"], True, None, checks=()),
    case("records against another base: no queue", [f"{R}/STATE.md"], True, None, base="lead/x"),
    case("a draft records PR: no queue (a draft runs no check, #875)", [f"{R}/STATE.md"], True, None, draft=True),
    case("code without the review label: no queue", [f"{A}/api/src/core.ts"], False, None, labels=()),
    # The label alone routes: a hand-added "records" on code joins records (lowest priority; its batch still runs ci,
    # and change-kind.sh calls it code, so every suite runs), never a product batch.
    case("a hand-added records label on code: records, behind every product PR", [f"{A}/api/src/core.ts"], None, "records",
         labels=("review: approved", "records")),
]


def labelled(c, have_script):
    """The PR as Mergify sees it: with "records" when the definition calls its files records."""
    pr = copy.deepcopy(c["pr"])
    if c["record"] is None: return pr, None
    got = is_records(pr["files"]) if have_script else c["record"]
    note = None if got == c["record"] else f"records-only.sh is-records says {got}, the case expects {c['record']}"
    if got and LABEL not in pr["label"]: pr["label"].append(LABEL)
    return pr, note


def problems(cfg, have_script):
    """Every way this configuration breaks B119; an empty list means it holds."""
    out = []
    qs = cfg.get("queue_rules", [])
    names = [q.get("name") for q in qs]
    if names != ["product", "records"]:
        out.append(f"queue order is {names}: want product, records (the first listed has the highest priority; records last)")
    for q in qs:
        conds = [c.replace(" ", "") for c in q.get("queue_conditions", []) if isinstance(c, str)]
        for need in ("base = main", "label = review: approved", "check-success = ci"):
            if need.replace(" ", "") not in conds:
                out.append(f"queue {q.get('name')}: queue_conditions lack {need!r} (no gate removed)")
        if "check-success = ci" not in [c.strip() for c in q.get("merge_conditions", []) if isinstance(c, str)]:
            out.append(f"queue {q.get('name')}: merge_conditions lack 'check-success = ci' (the batch is tested)")
        # Each queue carries its own label guard, not only by being listed after the others (defence in depth).
        want = "label=records" if q.get("name") == "records" else "-label=records"
        if want not in conds:
            out.append(f"queue {q.get('name')}: queue_conditions lack {want!r}")
        if "-draft" not in conds:   # every queue refuses drafts (P-371 (1)); records alone before D1
            out.append(f"queue {q.get('name')}: queue_conditions lack '-draft'")
    for c in CASES:
        try:
            pr, note = labelled(c, have_script)
            got = queue_of(cfg, pr)
        except (ValueError, re.error) as e:
            out.append(f"{c['what']}: {e}"); continue
        if note: out.append(f"{c['what']}: {note}")
        elif got != c["want"]: out.append(f"{c['what']}: joins {got!r}, want {c['want']!r}")
    return out


def mutations(cfg):
    """Broken copies of the configuration, each of which the check must refuse."""
    def drop(qname, test):
        c = copy.deepcopy(cfg)
        for q in c["queue_rules"]:
            if q["name"] == qname:
                q["queue_conditions"] = [x for x in q["queue_conditions"] if not (isinstance(x, str) and test(x.replace(" ", "")))]
        return c
    def reorder(c):
        c = copy.deepcopy(c); c["queue_rules"] = c["queue_rules"][-1:] + c["queue_rules"][:-1]; return c
    def no_records(c):
        c = copy.deepcopy(c); c["queue_rules"] = [q for q in c["queue_rules"] if q["name"] != "records"]; return c
    def flip(c):   # records takes the unlabelled PRs and the product queues the labelled ones
        c = copy.deepcopy(c)
        for q in c["queue_rules"]:
            q["queue_conditions"] = [("-label=records" if x.replace(" ", "") == "label=records" else "label = records")
                                     if isinstance(x, str) and x.replace(" ", "") in ("label=records", "-label=records") else x
                                     for x in q["queue_conditions"]]
        return c
    return [
        ("product lets records in (-label=records removed)", drop("product", lambda x: x == "-label=records")),
        ("records lets unlabelled PRs in (label = records removed)", drop("records", lambda x: x == "label=records")),
        ("records skips green ci", drop("records", lambda x: x.startswith("check-success"))),
        ("records skips the review label", drop("records", lambda x: x.startswith("label=review"))),
        ("records accepts drafts", drop("records", lambda x: x == "-draft")),
        ("product accepts drafts", drop("product", lambda x: x == "-draft")),
        ("product drops base = main", drop("product", lambda x: x == "base=main")),
        ("product skips green ci", drop("product", lambda x: x.startswith("check-success"))),
        ("product skips the review label", drop("product", lambda x: x.startswith("label=review"))),
        ("records drops base = main", drop("records", lambda x: x == "base=main")),
        ("the label conditions are flipped", flip(cfg)),
        ("records listed first (higher priority than product)", reorder(cfg)),
        ("no records queue", no_records(cfg)),
    ]


def main():
    global LABEL
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, ".mergify.yml")
    with open(path) as f:
        cfg = yaml.safe_load(f)
    have = True
    if not os.path.exists(IS_RECORDS):
        print(f"FAIL  {R}/tools/records-only.sh is missing: there is no definition of a record"); sys.exit(1)
    LABEL = subprocess.run(["bash", IS_RECORDS, "label"], capture_output=True, text=True, cwd=ROOT).stdout.strip()
    if LABEL != "records":
        print(f"FAIL  records-only.sh label prints {LABEL!r}; the queues select 'records'"); sys.exit(1)
    passed = failed = 0
    found = problems(cfg, have)
    for c in CASES:
        bad = [x for x in found if x.startswith(c["what"] + ":")]
        if bad: failed += 1; print(f"FAIL  {bad[0]}")
        else: passed += 1; print(f"PASS  {c['what']} → {c['want'] or 'no queue'}")
    rest = [x for x in found if not any(x.startswith(c["what"] + ":") for c in CASES)]
    for x in rest: failed += 1; print(f"FAIL  {x}")
    if not rest:
        passed += 1; print("PASS  order product, records; every queue keeps base main, the review label and green ci; the label guards; every queue refuses drafts")
    for what, broken in mutations(cfg):   # caught = the break adds a problem the real configuration does not have
        if set(problems(broken, have)) - set(found): passed += 1; print(f"PASS  caught: {what}")
        else: failed += 1; print(f"FAIL  not caught: {what}")
    print(f"{passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
