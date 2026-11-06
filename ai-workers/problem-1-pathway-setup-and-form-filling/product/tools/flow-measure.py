#!/usr/bin/env python3
# Flow measure (P-371, 6 Nov): the three numbers the flow fix should move, read from GitHub's runs API, never estimated.
#   1. PR-check machine hours thrown away: hours of jobs in pull-request runs of ci.yml (not merge-queue batches) whose
#      run ended cancelled or failed, over all PR-check hours. P-371's baseline used this definition (59%); target under
#      20%. Split: cancelled, failed, and earlier attempts' failed jobs (a "Re-run failed jobs" keeps the rest).
#      Also: merge-queue batch runs and their failures; the draft "guard" runs on their own (P-371 (1)).
#   2. Records share of merges: merged PRs with no code (tools/change-kind.sh on the PR's files says notes or records:
#      no suite would run); notes only (every file a *.md record or under product/reports/) shown beside it.
#      Target under 20% of merges (the compass).
#   3. Approved-to-merged: from the last "review: approved" label to the merge, per merged PR; target under 1 hour.
# Read-only (GET only). Usage:
#   python3 -I product/tools/flow-measure.py --since 2026-11-04T00:00:00Z [--until <time>] [--max-runs 1000] [--json]
# Auth: GITHUB_TOKEN in GitHub Actions; elsewhere FLOW_TOKEN if set, else none (a cloud session's proxy signs requests).
import argparse, json, os, re, subprocess, sys, statistics, time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

def _repo():
    # owner/name from GITHUB_REPOSITORY (Actions) or this clone's origin URL (no names written in project files).
    r = os.environ.get("GITHUB_REPOSITORY")
    if r:
        return r
    u = subprocess.run(["git", "remote", "get-url", "origin"], capture_output=True, text=True).stdout.strip()
    m = re.search(r"github\.com[:/]([^/]+/[^/]+?)(\.git)?$", u)
    return m.group(1) if m else sys.exit("flow-measure: no GITHUB_REPOSITORY and origin is not a github.com URL")


REPO = _repo()
API = f"https://api.github.com/repos/{REPO}"
P = "ai-workers/problem-1-pathway-setup-and-form-filling"
TOKEN = os.environ.get("FLOW_TOKEN") or (os.environ.get("GITHUB_TOKEN") if os.environ.get("GITHUB_ACTIONS") == "true" else "")


def get(url):
    cmd = ["curl", "-sS", "--fail-with-body", "-H", "Accept: application/vnd.github+json"]
    if TOKEN:
        cmd += ["-H", f"Authorization: Bearer {TOKEN}"]
    err = ""
    for wait in (0, 2, 5, 10):   # our own retries: curl's --retry concatenates the bodies of its attempts
        time.sleep(wait)
        r = subprocess.run(cmd + [url], capture_output=True, text=True)
        if r.returncode == 0:
            try:
                return json.loads(r.stdout)
            except json.JSONDecodeError:
                pass
        err = f"{r.stdout[:300]} {r.stderr[:300]}"
    raise SystemExit(f"GET {url} failed: {err}")


def t(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc) if s else None


def runs_since(since, until, max_runs):
    out, page = [], 1
    q = f"created=%3E%3D{since.strftime('%Y-%m-%dT%H:%M:%SZ')}"
    if until:
        q = f"created={since.strftime('%Y-%m-%dT%H:%M:%SZ')}..{until.strftime('%Y-%m-%dT%H:%M:%SZ')}"
    while len(out) < max_runs:
        d = get(f"{API}/actions/workflows/ci.yml/runs?per_page=100&page={page}&{q}")
        rs = d.get("workflow_runs", [])
        out += rs
        if len(rs) < 100:
            break
        page += 1
    return out[:max_runs]


def jobs(run):
    js, page = [], 1
    while True:
        d = get(f"{API}/actions/runs/{run['id']}/jobs?filter=all&per_page=100&page={page}")
        js += d.get("jobs", [])
        if len(d.get("jobs", [])) < 100:
            return js
        page += 1


def secs(j):
    a, b = t(j.get("started_at")), t(j.get("completed_at"))
    if not a or not b or j.get("conclusion") == "skipped":
        return 0.0
    return max(0.0, (b - a).total_seconds())


HERE = os.path.dirname(os.path.abspath(__file__))


def kind(files):
    # tools/change-kind.sh --files on this checkout: notes, records or code (the same rule CI uses).
    r = subprocess.run(["bash", os.path.join(HERE, "change-kind.sh"), "--files"], input="\n".join(files) + "\n", capture_output=True, text=True)
    return r.stdout.strip() or "code"


def pr_facts(n):
    files, page = [], 1
    while True:
        d = get(f"{API}/pulls/{n}/files?per_page=100&page={page}")
        files += [f["filename"] for f in d]
        if len(d) < 100:
            break
        page += 1
    ev, page = [], 1
    while True:
        d = get(f"{API}/issues/{n}/events?per_page=100&page={page}")
        ev += d
        if len(d) < 100:
            break
        page += 1
    labels = [t(e["created_at"]) for e in ev if e.get("event") == "labeled" and (e.get("label") or {}).get("name") == "review: approved"]
    return files, labels


def merged_prs(since, until):
    out, page = [], 1
    while True:
        d = get(f"{API}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page={page}")
        for p in d:
            m = t(p.get("merged_at"))
            if m and m >= since and (not until or m < until) and not p["head"]["ref"].startswith("mergify/"):
                out.append(p)
        if len(d) < 100 or (d and t(d[-1]["updated_at"]) < since):
            return out
        page += 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", required=True)
    ap.add_argument("--until")
    ap.add_argument("--max-runs", type=int, default=1000)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    since, until = t(a.since), (t(a.until) if a.until else None)

    runs = runs_since(since, until, a.max_runs)
    with ThreadPoolExecutor(16) as ex:
        js = list(ex.map(jobs, runs))
    h = {"pr_total": 0.0, "pr_cancelled": 0.0, "pr_failed": 0.0, "pr_earlier_failed": 0.0, "pr_guard": 0.0, "queue_total": 0.0, "queue_thrown": 0.0, "pr_wall": 0.0, "pr_wall_thrown": 0.0}
    n = {"pr_runs": 0, "pr_cancelled": 0, "pr_failed": 0, "pr_guard_runs": 0, "queue_runs": 0, "queue_failed": 0, "queue_cancelled": 0, "pr_rerun_failed_jobs": 0}
    for r, jl in zip(runs, js):
        if r["status"] != "completed":
            continue
        queue = r["head_branch"].startswith("mergify/") and r["actor"]["login"].startswith("mergify")
        concl = r["conclusion"]
        tot = sum(secs(j) for j in jl) / 3600
        wall = max(0.0, (t(r["updated_at"]) - t(r["run_started_at"])).total_seconds() / 3600) if tot else 0.0
        if tot == 0:
            continue   # a run whose jobs were all skipped (a draft before the fix) used no machine
        if queue:
            n["queue_runs"] += 1; h["queue_total"] += tot
            if concl in ("failure", "cancelled", "timed_out"):
                h["queue_thrown"] += tot; n["queue_failed" if concl != "cancelled" else "queue_cancelled"] += 1
            continue
        n["pr_runs"] += 1; h["pr_total"] += tot; h["pr_wall"] += wall
        if concl in ("cancelled", "failure", "timed_out"):
            h["pr_wall_thrown"] += wall
        # The draft guard (P-371 (1)): a run whose only machine time is the "guard" job.
        if all(secs(j) == 0 or j["name"].startswith("guard") for j in jl):
            n["pr_guard_runs"] += 1; h["pr_guard"] += tot
        if concl == "cancelled":
            n["pr_cancelled"] += 1; h["pr_cancelled"] += tot
        elif concl in ("failure", "timed_out"):
            n["pr_failed"] += 1; h["pr_failed"] += tot
        else:
            # A green (or still-useful) run: only earlier attempts' failed jobs are thrown away.
            last = r.get("run_attempt", 1)
            early = [j for j in jl if j.get("run_attempt", 1) < last and j.get("conclusion") in ("failure", "cancelled")]
            h["pr_earlier_failed"] += sum(secs(j) for j in early) / 3600
            n["pr_rerun_failed_jobs"] += len(early)

    prs = merged_prs(since, until)
    with ThreadPoolExecutor(16) as ex:
        facts = list(ex.map(lambda p: pr_facts(p["number"]), prs))
    rec = notes = 0; waits = []
    for p, (files, labels) in zip(prs, facts):
        k = kind(files)
        rec += k != "code"; notes += k == "notes"
        m = t(p["merged_at"])
        before = [x for x in labels if x <= m]
        if before:
            waits.append((m - before[-1]).total_seconds() / 60)

    thrown = h["pr_cancelled"] + h["pr_failed"] + h["pr_earlier_failed"]
    res = {
        "window": f"{a.since} .. {a.until or 'now'}", "runs_read": len(runs),
        "pr_check_hours": round(h["pr_total"], 1), "thrown_hours": round(thrown, 1),
        "thrown_share": round(100 * thrown / h["pr_total"], 1) if h["pr_total"] else None,
        "cancelled": [n["pr_cancelled"], round(h["pr_cancelled"], 1)], "failed": [n["pr_failed"], round(h["pr_failed"], 1)],
        "earlier_attempt_failed_jobs": [n["pr_rerun_failed_jobs"], round(h["pr_earlier_failed"], 1)],
        "pr_runs": n["pr_runs"], "draft_guard_runs": [n["pr_guard_runs"], round(h["pr_guard"], 2)],
        "queue_runs": n["queue_runs"], "queue_failed": n["queue_failed"], "queue_cancelled": n["queue_cancelled"],
        "queue_hours": round(h["queue_total"], 1), "queue_thrown_hours": round(h["queue_thrown"], 1),
        "merged": len(prs), "records_merged": rec, "notes_merged": notes,
        "pr_run_wall_hours": round(h["pr_wall"], 1), "pr_run_wall_thrown_share": round(100 * h["pr_wall_thrown"] / h["pr_wall"], 1) if h["pr_wall"] else None, "records_share": round(100 * rec / len(prs), 1) if prs else None,
        "approved_to_merged_min": {"n": len(waits), "median": round(statistics.median(waits)) if waits else None,
                                   "p90": round(sorted(waits)[int(0.9 * (len(waits) - 1))]) if waits else None,
                                   "under_1h_share": round(100 * sum(w < 60 for w in waits) / len(waits), 1) if waits else None},
    }
    if a.json:
        print(json.dumps(res, indent=1)); return
    w = res["approved_to_merged_min"]
    print(f"Flow measure {res['window']} ({res['runs_read']} ci.yml runs read)")
    print(f"| Number | Value | P-371 target |\n|---|---|---|")
    print(f"| PR-check hours thrown away | {res['thrown_hours']} of {res['pr_check_hours']} h ({res['thrown_share']}%): cancelled {res['cancelled'][0]} runs {res['cancelled'][1]} h, failed {res['failed'][0]} runs {res['failed'][1]} h, earlier attempts' failed jobs {res['earlier_attempt_failed_jobs'][0]} ({res['earlier_attempt_failed_jobs'][1]} h) | under 20% |")
    print(f"| Same, by run wall time (start to end of each run, parts counted once) | {res['pr_run_wall_thrown_share']}% of {res['pr_run_wall_hours']} h | under 20% |")
    print(f"| Draft guard runs | {res['draft_guard_runs'][0]} runs, {res['draft_guard_runs'][1]} h | (P-371 (1)) |")
    print(f"| Merge-queue batches | {res['queue_runs']} runs, {res['queue_failed']} failed, {res['queue_cancelled']} cancelled; {res['queue_thrown_hours']} of {res['queue_hours']} h | (compass: 15% or less thrown) |")
    print(f"| Records share of merges | {res['records_merged']} of {res['merged']} ({res['records_share']}%) no code (change-kind.sh notes or records); notes only {res['notes_merged']} | under 20% |")
    print(f"| Approved to merged | median {w['median']} min, p90 {w['p90']} min, {w['under_1h_share']}% under 1 h (n={w['n']}) | under 1 hour |")


if __name__ == "__main__":
    main()
