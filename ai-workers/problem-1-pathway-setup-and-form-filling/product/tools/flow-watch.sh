#!/bin/bash
# Flow watch (founder, 2 Nov): every bottleneck as a number with an alarm, so nothing sits unseen.
# Read-only: lists what is stuck and who acts; changes nothing. The tech lead runs it on every 20-minute check
# and acts on each RED line in that check. Exit code = number of RED lines (0 = flowing).
# Usage: bash product/tools/flow-watch.sh
set -uo pipefail
TOOLS="$(cd "$(dirname "$0")" && pwd)"; gh() { bash "$TOOLS/gh.sh" "$@"; }   # TLS fallback through curl (P-363)
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
DIR="$(cd "$(dirname "$0")" && pwd)"
python3 -I - "$REPO" "$DIR" <<'EOF'
import json, subprocess, sys, shutil
from datetime import datetime, timezone
repo, tools = sys.argv[1], sys.argv[2]
now = datetime.now(timezone.utc)
def gh(*a):
    r = subprocess.run(["bash", tools + "/gh.sh", *a], capture_output=True, text=True)   # TLS fallback (P-363)
    return r.stdout
def mins(t): return int((now - datetime.strptime(t, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)).total_seconds() // 60)
red = []
def alarm(msg): red.append(msg); print("RED   " + msg)
def ok(msg): print("ok    " + msg)

prs = json.loads(gh("pr", "list", "--limit", "60", "--json", "number,title,labels,headRefName,updatedAt,isDraft,author"))
real = [p for p in prs if not p["headRefName"].startswith("mergify/")]
approved = [p for p in real if "review: approved" in [l["name"] for l in p["labels"]]]

# 1. Approved PRs: age since the label, and whether each is in the queue.
oldest = 0
for p in approved:
    ev = json.loads(gh("api", f"repos/{repo}/issues/{p['number']}/events", "--paginate", "--jq", "[.[]|select(.event==\"labeled\" and .label.name==\"review: approved\")|.created_at]"))
    age = mins(ev[-1]) if ev else 0
    oldest = max(oldest, age)
    labels = [l["name"] for l in p["labels"]]
    if "dequeued" in labels:
        alarm(f"#{p['number']} was dequeued (conflict or failed batch) {age} min after approval: Lead fixes now ({p['title'][:50]})")
    elif "queued" in labels and age <= 120:
        print(f"wait  #{p['number']} queued {age} min (alarm after 120 while the queue moves)")
    elif age > 60:
        alarm(f"#{p['number']} approved {age} min ago and not merged (target under 60): find what holds it ({p['title'][:50]})")
ok(f"{len(approved)} approved PRs waiting; oldest {oldest} min since its label") if oldest <= 60 else None

# 2. Merge flow: last product merge, queued runs, wasted runs on records branches.
merged = json.loads(gh("pr", "list", "--state", "merged", "--limit", "30", "--json", "number,mergedAt,headRefName"))
# P-500: "product" is judged by files changed (app code), never by branch name; newest merge first.
merged.sort(key=lambda m: m["mergedAt"] or "", reverse=True)
_app = tools + "/app-code-prs.sh"
prod = []
for m in merged[:12]:
    out = subprocess.run(["bash", _app], input=str(m["number"]) + "\n", capture_output=True, text=True).stdout.strip()
    if out and not out.startswith("?"): prod.append(m); break
if prod:
    gap = mins(prod[0]["mergedAt"])
    (alarm if gap > 60 and approved else ok)(f"last product merge #{prod[0]['number']} {gap} min ago" + (" with approved PRs waiting" if gap > 60 and approved else ""))
runs = json.loads(gh("run", "list", "--limit", "100", "--json", "databaseId,status,headBranch,createdAt"))
queued = [r for r in runs if r["status"] == "queued"]
(alarm if len(queued) > 8 else ok)(f"{len(queued)} CI runs queued (GitHub free plan: 20 machines at once, 4 per run)")
open_heads = {p["headRefName"] for p in prs}
# P-371: a records PR's own run is its check now (records merge by themselves after it), so only branches with no open PR.
waste = [r for r in runs if r["status"] != "completed" and r["headBranch"] != "main" and r["headBranch"] not in open_heads]
(alarm if waste else ok)(f"{len(waste)} CI runs on branches with no open PR" + (": cancel " + " ".join(str(r["databaseId"]) for r in waste) if waste else ""))

# 2b. Records PRs (qa:, lead:) must never sit in the Mergify queue: a push to them throws out the batch (2 Nov 07:35).
# P-371 (4), B119: a records-only PR carries "records" (set by CI from tools/records-only.sh); Mergify's "records" queue
# takes it and the product queue skips it. Never merge it by hand while a batch is checking (P-306 (3)).
for p in approved:
    names = [l["name"] for l in p["labels"]]
    if p["title"].startswith(("qa:", "lead:")) and "records" not in names:
        alarm(f"#{p['number']} is a qa/lead PR with review: approved but no records label, so it joins a product batch: it is not records-only (records-only.sh is-records), or its CI has not run; split the code out or let it batch")
    elif "records" in names and mins(p["updatedAt"]) > 60:
        alarm(f"#{p['number']} is a labelled records PR idle over an hour: read Mergify's summary on it (the records queue, B119)")

# 3. qa (P-250, narrowed by P-277): approved PRs touching money, schema or permissions with no qa verdict comment.
RISKY = ("prisma/", "ledger", "paid", "permission", "launcher")
for p in approved:
    files = gh("pr", "view", str(p["number"]), "--json", "files", "--jq", ".files[].path")
    if not any(k in files for k in RISKY):
        continue
    body = gh("pr", "view", str(p["number"]), "--json", "comments", "--jq", "[.comments[].body|select(test(\"^\\\\**qa\";\"i\"))]|length").strip()
    if body in ("", "0"):
        print(f"wait  #{p['number']} has no qa verdict yet (P-250)")

# 4. Builders: open PRs without a push or comment for 90 minutes.
for p in real:
    if p["isDraft"]: continue
    a = mins(p["updatedAt"])
    if a > 90 and "review: approved" not in [l["name"] for l in p["labels"]]:
        alarm(f"#{p['number']} quiet for {a} min and not approved: its builder is stopped or blocked ({p['title'][:50]})")

# 4b. Labelled PRs whose own check is red: the builder ended at the label and nobody fixes it (2 Nov: #563, #573 sat 70–110 min).
for p in approved:
    v = json.loads(gh("pr", "view", str(p["number"]), "--json", "statusCheckRollup,mergeable"))
    ci = ([c.get("conclusion") for c in v["statusCheckRollup"] if c.get("name") == "ci"] or [""])[-1]
    if ci == "FAILURE":
        alarm(f"#{p['number']} is labelled but its own ci is red: its builder has ended; start a fixer ({p['title'][:50]})")
    if v["mergeable"] == "CONFLICTING" and "dequeued" not in [l["name"] for l in p["labels"]]:
        alarm(f"#{p['number']} is labelled but conflicts with main, so it can't queue: its builder merges main in (P-270) ({p['title'][:50]})")

# 4c. Unfinished M2 rows with no one on them (2 Nov: G-CORE B2 had no builder for ~3 h after B1 merged, while STATE said
# "still pushing"). A row is covered by an open product PR naming it, or a branch push naming it in the last 90 minutes.
# Works = Works on main or in an open qa records PR. HELD and WAITS are the tech lead's to keep current.
import re
HELD = {"C5.1": "held for the SA-01B product owner (P-251, P-265)"}
WAITS = {"C10.1": 563}  # row: the open PR it waits on (C10.1 needs a released Visitor visa, after QA-163)
def git(*a): return subprocess.run(["git", "-C", tools, *a], capture_output=True, text=True).stdout
git("fetch", "-q", "origin")
caps = git("rev-parse", "--show-prefix").strip().replace("tools/", "qa/CAPABILITIES.md")
def rows(ref):
    out = {}
    for line in git("show", f"{ref}:{caps}").splitlines():
        c = [x.strip() for x in line.split("|")]
        if len(c) > 6 and re.fullmatch(r"C\d+\.\d+", c[1]) and c[4] in ("M2", "M3", "M4", "T"): out[c[1]] = c[5]  # P-500: every active milestone
    return out
status = rows("origin/main")
recs = [p for p in real if p["title"].startswith(("qa:", "lead:"))]
for p in recs:
    for k, v in rows("origin/" + p["headRefName"]).items():
        if v == "Works": status[k] = "Works"
bodies = json.loads(gh("pr", "list", "--limit", "60", "--json", "number,title,body,headRefName"))
work = " ".join(b["title"] + " " + (b["body"] or "") for b in bodies if not b["headRefName"].startswith("mergify/") and not b["title"].startswith(("qa:", "lead:")))
cut = int(now.timestamp()) - 90 * 60
for line in git("for-each-ref", "--format=%(committerdate:unix) %(subject)", "refs/remotes/origin").splitlines():
    t, _, s = line.partition(" ")
    if int(t) >= cut and not s.startswith(("qa:", "lead:", "Merge")): work += " " + s
open_nums = {p["number"] for p in real}
idle = []
for row, st in sorted(status.items()):
    if st == "Works" or row in HELD: continue
    if WAITS.get(row) in open_nums: continue
    if not re.search(rf"\b{re.escape(row)}\b", work): idle.append(row)
(alarm if idle else ok)(f"{len([r for r in status.values() if r != 'Works'])} rows not Works (M2, M3, M4, T); with no PR or push in 90 min: " + (", ".join(idle) + " — start or shape a row for each" if idle else "none"))

# 5. main: the newest full run and demo update.
for wf in ("nightly.yml", "demo-update.yml"):
    r = json.loads(gh("run", "list", "--workflow", wf, "--limit", "1", "--json", "conclusion,status,createdAt") or "[]")
    if r:
        r = r[0]
        (alarm if r["conclusion"] == "failure" else ok)(f"{wf}: {r['status']} {r['conclusion'] or ''} ({mins(r['createdAt'])} min ago)")

# 6. Disk on the Mac.
free = shutil.disk_usage("/System/Volumes/Data").free / 1e9
(alarm if free < 10 else ok)(f"disk {free:.1f} GB free (alarm under 10)")

print(f"\n{len(red)} RED")
sys.exit(min(len(red), 100))
EOF
