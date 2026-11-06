#!/usr/bin/env python3
"""Which Mergify queue a pull request joins, read from .mergify.yml itself (B119, P-376 (1), 6 Nov).

Records never block code: a PR whose files are all records (STATE, DECISIONS, BACKLOG, RULES, qa/, screens/**/*.md,
history/) joins the queue "records", listed after "m2" and "m3" so it has the lowest priority; a PR with any other
file joins "m2" or "m3" as before. This script evaluates the queue_conditions the way Mergify does (the first queue,
in file order, whose conditions all hold; on a list such as files or label, "attr~=re" holds when any item matches and
"-attr~=re" when none does) on fixed PRs, and checks the rules every queue keeps (base main, the review label, green
ci, records listed last, one records pattern for all queues). Then it breaks the configuration on purpose and expects
each break to be caught, so the check is shown to fail, not only to pass. Runs no suite, US$0. It does not replace
Mergify's own validation (the "Configuration changed" check on the PR).
  python3 -I product/tools/check-queue-rules.py [path/to/.mergify.yml]
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


def pr(files, title="evidence: something", labels=("review: approved",), checks=("ci",), draft=False, base="main"):
    return {"files": list(files), "title": title, "label": list(labels), "check-success": list(checks),
            "draft": draft, "base": base}


CASES = [  # (what, the PR, the queue it must join)
    ("the daily records PR: STATE, DECISIONS, BACKLOG, RULES", pr([f"{R}/STATE.md", f"{R}/DECISIONS.md", f"{R}/BACKLOG.md", f"{R}/RULES.md"], "lead: records 6 Nov"), "records"),
    ("qa notes with screenshots, scripts and a built note", pr([f"{R}/qa/BUGS.md", f"{R}/qa/walks/x/shot.png", f"{R}/qa/walks/x/walk.cjs", f"{R}/qa/built/C1.3.md"], "qa: after-merge"), "records"),
    ("a screen's notes", pr([f"{R}/screens/12/build-notes.md", f"{R}/screens/B114/challenge.md"]), "records"),
    ("the history folder", pr([f"{R}/history/lead20-handover.md", f"{R}/history/old/STATE-2026-11-05.txt"]), "records"),
    ("an M3 title on records only still goes to records", pr([f"{R}/qa/CAPABILITIES.md"], "M3 qa: C7.3 scored"), "records"),
    ("records plus one app file: m2", pr([f"{R}/STATE.md", f"{P}/prototype/studio/api/src/core.ts"]), "m2"),
    ("records plus one app file, M3 title: m3", pr([f"{R}/qa/built/C7.3.md", f"{P}/prototype/studio/web/src/App.tsx"], "forms: C7.3 — x"), "m3"),
    ("app code alone: m2", pr([f"{P}/prototype/studio/api/src/demo.ts"], "runtime: C4.11 — x"), "m2"),
    ("a screen's HTML board is not a records file (only screens/**/*.md)", pr([f"{R}/screens/12/board.html"]), "m2"),
    ("a tool under product/tools/, even a .md", pr([f"{R}/tools/README.md"]), "m2"),
    ("the way of working is not in the records list", pr([f"{R}/WAY-OF-WORKING.md"]), "m2"),
    ("the merge queue file itself", pr([".mergify.yml"]), "m2"),
    ("a workflow", pr([".github/workflows/ci.yml"]), "m2"),
    ("a skill", pr([".claude/skills/next/SKILL.md"]), "m2"),
    ("a look-alike name: STATE.md.bak", pr([f"{R}/STATE.md.bak"]), "m2"),
    ("a look-alike folder: qa-tools/", pr([f"{R}/qa-tools/run.mjs"]), "m2"),
    ("a look-alike place: STATE.md outside product/", pr([f"{P}/prototype/studio/STATE.md"]), "m2"),
    ("a records name inside screens/ but not .md", pr([f"{R}/screens/12/fixture.json"]), "m2"),
    ("records without the review label: no queue", pr([f"{R}/STATE.md"], labels=()), None),
    ("records with ci not green: no queue", pr([f"{R}/STATE.md"], checks=()), None),
    ("records against another base: no queue", pr([f"{R}/STATE.md"], base="lead/x"), None),
    ("code without the review label: no queue", pr([f"{P}/prototype/studio/api/src/core.ts"], labels=()), None),
]


def problems(cfg):
    """Every way this configuration breaks B119; an empty list means it holds."""
    out = []
    qs = cfg.get("queue_rules", [])
    names = [q.get("name") for q in qs]
    if names[:3] != ["m2", "m3", "records"] or len(names) != 3:
        out.append(f"queue order is {names}: want m2, m3, records (the first listed has the highest priority; records last)")
    for q in qs:
        conds = [c for c in q.get("queue_conditions", []) if isinstance(c, str)]
        for need in ("base = main", "label = review: approved", "check-success = ci"):
            if need.replace(" ", "") not in [c.replace(" ", "") for c in conds]:
                out.append(f"queue {q.get('name')}: queue_conditions lack {need!r} (no gate removed)")
        if "check-success = ci" not in [c.strip() for c in q.get("merge_conditions", []) if isinstance(c, str)]:
            out.append(f"queue {q.get('name')}: merge_conditions lack 'check-success = ci' (the batch is tested)")
    pats = set()
    for q in qs:
        signs = set()
        for c in q.get("queue_conditions", []):
            m = isinstance(c, str) and re.match(r"^(-?)files\s*~=\s*\^\(\?!(.*)\$\)$", c.strip())
            if m: pats.add(m.group(2)); signs.add(m.group(1))
        # Each queue carries its own files guard, not only by being listed after the others (defence in depth).
        want = {"-"} if q.get("name") == "records" else {""}
        if signs != want:
            out.append(f"queue {q.get('name')}: want exactly one {'-' if want == {'-'} else ''}files~=^(?!records$) condition")
    if len(pats) != 1:
        out.append(f"want one records pattern shared by every queue, found {len(pats)}")
    for what, p, want in CASES:
        try:
            got = queue_of(cfg, p)
        except (ValueError, re.error) as e:
            out.append(f"{what}: {e}"); continue
        if got != want:
            out.append(f"{what}: joins {got!r}, want {want!r}")
    return out


def mutations(cfg):
    """Broken copies of the configuration, each of which the check must refuse."""
    def drop(qname, test):
        c = copy.deepcopy(cfg)
        for q in c["queue_rules"]:
            if q["name"] == qname:
                q["queue_conditions"] = [x for x in q["queue_conditions"] if not (isinstance(x, str) and test(x))]
        return c
    def widen(c):
        c = copy.deepcopy(c)
        for q in c["queue_rules"]:
            q["queue_conditions"] = [re.sub(r"\^\(\?!.*\$\)$", "^(?!.+$)", x) if isinstance(x, str) and "files" in x else x
                                     for x in q["queue_conditions"]]
        return c
    def reorder(c):
        c = copy.deepcopy(c); c["queue_rules"] = c["queue_rules"][-1:] + c["queue_rules"][:-1]; return c
    def no_records(c):
        c = copy.deepcopy(c); c["queue_rules"] = [q for q in c["queue_rules"] if q["name"] != "records"]; return c
    def unanchored(c):
        c = copy.deepcopy(c)
        for q in c["queue_rules"]:
            q["queue_conditions"] = [x.replace("$)", ")") if isinstance(x, str) and "files" in x else x for x in q["queue_conditions"]]
        return c
    return [
        ("m2 lets records in (its files condition removed)", drop("m2", lambda x: "files" in x)),
        ("m3 lets records in (its files condition removed)", drop("m3", lambda x: "files" in x)),
        ("records lets code in (its files condition removed)", drop("records", lambda x: "files" in x)),
        ("records skips green ci", drop("records", lambda x: x.startswith("check-success"))),
        ("records skips the review label", drop("records", lambda x: x.startswith("label"))),
        ("the records pattern matches every file", widen(cfg)),
        ("the records pattern loses its end anchor (STATE.md.bak passes)", unanchored(cfg)),
        ("records listed first (higher priority than product)", reorder(cfg)),
        ("no records queue", no_records(cfg)),
    ]


def main():
    root = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip() or "."
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, ".mergify.yml")
    with open(path) as f:
        cfg = yaml.safe_load(f)
    passed = failed = 0
    found = problems(cfg)
    for what, p, want in CASES:
        bad = [x for x in found if x.startswith(what + ":")]
        if bad: failed += 1; print(f"FAIL  {bad[0]}")
        else: passed += 1; print(f"PASS  {what} → {want or 'no queue'}")
    for x in found:
        if not any(x.startswith(w + ":") for w, _, _ in CASES):
            failed += 1; print(f"FAIL  {x}")
    if not any(not any(x.startswith(w + ":") for w, _, _ in CASES) for x in found):
        passed += 1; print("PASS  order m2, m3, records; every queue keeps base main, the review label and green ci; one records pattern")
    for what, broken in mutations(cfg):   # caught = the break adds a problem the real configuration does not have
        if set(problems(broken)) - set(found): passed += 1; print(f"PASS  caught: {what}")
        else: failed += 1; print(f"FAIL  not caught: {what}")
    print(f"{passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
