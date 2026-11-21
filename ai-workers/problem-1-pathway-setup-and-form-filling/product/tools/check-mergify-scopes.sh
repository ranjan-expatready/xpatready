#!/usr/bin/env bash
# Mergify scopes (P-715, design/mergify-parallel-scopes-2026-11-19.md): .mergify.yml's file scopes and barrier files
# stay true to the code. Each fenced module's scope holds its module card's own `paths:` (the cards are the one map of
# the modules, P-615), every scope and barrier pattern matches a tracked file, and the product and pipeline queues use
# one and the same "pipeline paths" pattern (P-717 (a)). Run by check-guards.sh, and by ci.yml on every pull request and
# batch (P-756 (2): job "fast", and job "ci" for notes; checked below). US$0, no network.
#   bash product/tools/check-mergify-scopes.sh
set -u
TOOLS="$(cd "$(dirname "$0")" && pwd)"; ROOTD="$(cd "$TOOLS/../../../.." && pwd)"
python3 -I - "$ROOTD" <<'PY'
import os, re, subprocess, sys, yaml
root = sys.argv[1]; bad = []; n = 0
def braces(p):
    m = re.search(r"\{([^{}]*)\}", p)
    return [p] if not m else [x for a in m.group(1).split(",") for x in braces(p[:m.start()] + a + p[m.end():])]
def rx(g):
    o, i = "", 0
    while i < len(g):
        if g.startswith("**/", i): o += "(?:.*/)?"; i += 3
        elif g.startswith("**", i): o += ".*"; i += 2
        elif g[i] == "*": o += "[^/]*"; i += 1
        else: o += re.escape(g[i]); i += 1
    return re.compile(o + r"\Z")
cfg = yaml.safe_load(open(os.path.join(root, ".mergify.yml")))
files = subprocess.run(["git", "-C", root, "ls-files"], capture_output=True, text=True, check=True).stdout.split()
sc = (cfg.get("scopes") or {}); src = ((sc.get("source") or {}).get("files") or {})
CARDS = {"platform": "api-platform", "front-office": "api-front-office", "money": "api-client-money",
         "case-side": "api-cases", "forms-engine": "api-forms"}
for scope, card in CARDS.items():
    n += 1
    text = open(os.path.join(root, ".claude/rules/modules", card + ".md"), encoding="utf-8").read()
    want = {x for p in re.findall(r'^\s*-\s*"([^"]+)"\s*$', text.split("---")[1], re.M) for x in braces(p)}
    have = set((src.get(scope) or {}).get("include") or [])
    miss = sorted(want - have)
    if miss: bad.append(f"scope {scope}: lacks its card {card}'s paths {miss[:3]}{' …' if len(miss) > 3 else ''}")
for name, pats in [(k, (v or {}).get("include") or []) for k, v in src.items()] + [("barrier_files", (sc.get("barrier_files") or {}).get("include") or [])]:
    for g in pats:
        n += 1
        p = rx(g)   # once per pattern, not per file (about 14k files: 22 s became 0.3 s)
        if not any(p.match(f) for f in files):
            bad.append(f"{name}: {g} matches no tracked file")
conds = {q["name"]: [c for c in q.get("queue_conditions") or [] if isinstance(c, str)] for q in cfg.get("queue_rules") or []}
pp = [c.split("~=", 1)[1].strip() for c in conds.get("product", []) if c.replace(" ", "").startswith("files~=^(?!")]
pl = [c.split("~=", 1)[1].strip() for c in conds.get("pipeline", []) if c.replace(" ", "").startswith("-files~=^(?!")]
n += 1
if not (pp and pl and pp == pl): bad.append(f"the product and pipeline queues do not share one pipeline pattern: {pp} / {pl}")
else:
    r = re.compile(pp[0])
    for f, pipe in ((".github/workflows/ci.yml", True), ("ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/x.sh", True),
                    ("ai-workers/problem-1-pathway-setup-and-form-filling/product/STATE.md", False),
                    ("ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/api/src/core.ts", False)):
        n += 1
        if (r.search(f) is None) != pipe: bad.append(f"pipeline pattern: {f} is{'' if pipe else ' not'} pipeline work, read the other way")
# The pipeline scope and the pipeline pattern name the same paths (review, round 1).
    pinc = [rx(g) for g in (src.get("pipeline") or {}).get("include") or []]
    for f in (".github/workflows/ci.yml", ".githooks/pre-push", ".mergify.yml", ".claude/skills/next/SKILL.md", "AGENTS.md",
              "CLAUDE.md", "ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/x.sh"):
        n += 1
        if not any(p.match(f) for p in pinc): bad.append(f"pipeline scope: {f} is pipeline work by the queue pattern, not by the scope")
        if r.search(f) is not None: bad.append(f"pipeline pattern: {f} is in the pipeline scope, not pipeline work by the pattern")
# P-756 (2): ci.yml runs this script on every pull request and batch, not behind a paths filter: in job "fast" (code and
# records) with no condition of its own, and in job "ci" on the notes path, so the PR that adds a module folder fails itself.
# A self-test first proves each way of losing that is caught (check-guards' --mutate copy has no module cards, so this
# script cannot be mutation-tested there; the self-test stands in, as in check-queue-run-scope.sh).
NOTES_IF = "env.MODE != 'same' && (env.KIND == 'notes')"
def ci_bad(text):
    ci = yaml.safe_load(text); on = ci.get("on", ci.get(True)) or {}; jobs = ci.get("jobs") or {}; out = []
    runs = lambda job, cond: [s for s in (jobs.get(job) or {}).get("steps") or [] if "check-mergify-scopes.sh" in (s.get("run") or "") and s.get("if") == cond]
    pr = on.get("pull_request", False) if isinstance(on, dict) else False
    if pr is False or (pr or {}).get("paths") or (pr or {}).get("paths-ignore"):
        out.append("ci.yml: no pull_request trigger without a paths filter, so this check cannot run on every PR")
    if not runs("fast", None): out.append("ci.yml: job fast does not run check-mergify-scopes.sh with no condition of its own (P-756 (2))")
    if not runs("ci", NOTES_IF): out.append("ci.yml: job ci does not run check-mergify-scopes.sh on the notes path (P-756 (2))")
    return out
citext = open(os.path.join(root, ".github/workflows/ci.yml"), encoding="utf-8").read()
for why, edit in (("the fast step gone", lambda t: re.sub(r"(every PR and batch, seconds\)\n(?:        #.*\n)*        run: bash \"\$P/tools/)check-mergify-scopes", r"\1check-off", t, count=1)),
                  ("the notes step gone", lambda t: re.sub(r"(as job \"fast\"\)\n        if: .*\n        run: bash \"\$P/tools/)check-mergify-scopes", r"\1check-off", t, count=1)),
                  ("a paths filter on pull_request", lambda t: re.sub(r"(?m)^  pull_request:$", "  pull_request:\n    paths: [\".mergify.yml\"]", t, count=1))):
    n += 1; t = edit(citext)
    if t == citext: bad.append(f"self-test: the edit '{why}' changed nothing in ci.yml, so it proves nothing")
    elif not ci_bad(t): bad.append(f"self-test: ci.yml with {why} still passes this check")
n += 1; bad += ci_bad(citext)
for b in bad: print(f"FAIL  {b}")
print(f"{'PASS' if not bad else 'FAIL'}  mergify scopes: {n} checks")
sys.exit(1 if bad else 0)
PY
