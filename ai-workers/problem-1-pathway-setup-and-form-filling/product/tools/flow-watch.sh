#!/bin/bash
# Flow watch (founder, 2 Nov): every bottleneck as a number with an alarm, so nothing sits unseen.
# Read-only: lists what is stuck and who acts; changes nothing. The tech lead runs it on every 20-minute check
# and acts on each RED line in that check. Exit code = number of RED lines (0 = flowing).
# Usage: bash product/tools/flow-watch.sh
set -uo pipefail
REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
DIR="$(cd "$(dirname "$0")" && pwd)"
python3 -I - "$REPO" "$DIR" <<'EOF'
import json, subprocess, sys, shutil
from datetime import datetime, timezone
repo, tools = sys.argv[1], sys.argv[2]
now = datetime.now(timezone.utc)
def gh(*a):
    r = subprocess.run(["gh", *a], capture_output=True, text=True)
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
    elif age > 60:
        alarm(f"#{p['number']} approved {age} min ago and not merged (target under 60): find what holds it ({p['title'][:50]})")
ok(f"{len(approved)} approved PRs waiting; oldest {oldest} min since its label") if oldest <= 60 else None

# 2. Merge flow: last product merge, queued runs, wasted runs on records branches.
merged = json.loads(gh("pr", "list", "--state", "merged", "--limit", "30", "--json", "number,mergedAt,headRefName"))
prod = [m for m in merged if m["headRefName"].startswith("claude/")]
if prod:
    gap = mins(prod[0]["mergedAt"])
    (alarm if gap > 60 and approved else ok)(f"last product merge #{prod[0]['number']} {gap} min ago" + (" with approved PRs waiting" if gap > 60 and approved else ""))
runs = json.loads(gh("run", "list", "--limit", "100", "--json", "databaseId,status,headBranch,createdAt"))
queued = [r for r in runs if r["status"] == "queued"]
(alarm if len(queued) > 8 else ok)(f"{len(queued)} CI runs queued (GitHub free plan: 20 machines at once, 4 per run)")
open_heads = {p["headRefName"] for p in prs}
waste = [r for r in runs if r["status"] != "completed" and (r["headBranch"].startswith("lead/") or (r["headBranch"].startswith("mergify/") and r["headBranch"] not in open_heads))]
(alarm if waste else ok)(f"{len(waste)} CI runs on records branches or closed queue drafts" + (": cancel " + " ".join(str(r["databaseId"]) for r in waste) if waste else ""))

# 3. qa (P-250): approved PRs with no qa verdict comment.
for p in approved:
    body = gh("pr", "view", str(p["number"]), "--json", "comments", "--jq", "[.comments[].body|select(test(\"^\\\\**qa\";\"i\"))]|length").strip()
    if body in ("", "0"):
        print(f"wait  #{p['number']} has no qa verdict yet (P-250)")

# 4. Builders: open PRs without a push or comment for 90 minutes.
for p in real:
    if p["isDraft"]: continue
    a = mins(p["updatedAt"])
    if a > 90 and "review: approved" not in [l["name"] for l in p["labels"]]:
        alarm(f"#{p['number']} quiet for {a} min and not approved: its builder is stopped or blocked ({p['title'][:50]})")

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
