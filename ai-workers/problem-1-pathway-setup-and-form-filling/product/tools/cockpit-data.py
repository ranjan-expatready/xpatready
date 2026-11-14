#!/usr/bin/env python3
# Cockpit data (P-591, founder ask A54): one JSON for the Founder's Progress Board (product/cockpit/index.html).
# A thin aggregator: it reads the records and calls the tools that already exist, and adds only what none of them gives.
#   Works ............ tools/progress.sh's own parse (run on main's qa/CAPABILITIES.md, fetched through the API)
#   Pipeline ......... tools/flow-measure.py --json (7 days; its answer is cached, default 6 h, because it reads every run's jobs)
#   App-code merges .. tools/app-code-prs.sh (P-500; its verdict per merged PR is cached, merged PRs never change)
#   Stations ......... tools/factory-board.sh's rules; questions: lead-watch.sh's "Question for the tech lead" text
#   Records .......... STATE.md, MVP-CHECKLIST.md, BACKLOG.md, DECISIONS.md, qa/BUGS*.md, tools/flaky-ledger.tsv (this copy)
#   Hand-kept ........ cockpit/plan.json, risks.json, architecture.json, learnings.json; Lead input (--lead-input)
# Added here because no tool gives them (each marked "added" in data.json): PR opened to merged, main line red share and
# red-to-green time (nightly on main), daily series for the 14-day trends, PRs healed after a red run.
# Read-only: GitHub API GETs (and one GraphQL read) through curl with `gh auth token`; never runs the app, suites or anything paid.
# Usage: python3 product/tools/cockpit-data.py --out "$TMPDIR/cockpit/data.json" [--lead-input lead-input.json]
#        [--flow-max-age-h 6] [--appcode-max 900] [--offline]
import argparse, json, os, re, shutil, statistics, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

T0 = time.time()
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(HERE)
ROOT = subprocess.run(["git", "-C", P, "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip() or P
REL = os.path.relpath(P, ROOT)             # product folder inside the repository
IST = ZoneInfo("Asia/Kolkata")
NOW = datetime.now(timezone.utc)
ERRORS = []



def library_base(repo):
    """Web address of the product folder on the branch this copy is on, for the board's Library links (P-593).
    Built at run time from the git remote, so no account name is written into a committed file."""
    if not repo:
        return None
    try:
        br = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__))).stdout.strip() or "main"
    except Exception:
        br = "main"
    return f"https://github.com/{repo}/blob/{br}/ai-workers/problem-1-pathway-setup-and-form-filling/product/"

def V(v, src, **kw):
    d = {"v": v, "src": src}
    d.update(kw)
    return d


def ist(dt):
    return dt.astimezone(IST).strftime("%d %b %H:%M IST") if dt else None


def ts(s):
    if not s:
        return None
    return datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)


def hours(a, b):
    return round((b - a).total_seconds() / 3600, 1)


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs), 1) if xs else None


def read(rel):
    p = os.path.join(P, rel)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else None


def sh(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def clean(s, n=None):
    s = re.sub(r"\*\*|`", "", s or "")
    s = re.sub(r"[\U0001F300-\U0001FAFF☀-➿]️?", "", s).strip()
    return (s[: n - 1] + "…") if n and len(s) > n else s


def cells(line):
    return [x.strip() for x in line.rstrip("\n").split("|")]


# ---------------------------------------------------------------- GitHub (read-only)
class GH:
    def __init__(self, offline):
        self.offline = offline
        self.calls = 0
        self.token = "" if offline else sh(["gh", "auth", "token"]).stdout.strip()
        u = sh(["git", "-C", ROOT, "remote", "get-url", "origin"]).stdout.strip()
        m = re.search(r"github\.com[:/]([^/]+/[^/]+?)(\.git)?$", u)
        self.repo = m.group(1) if m else None
        self.api = f"https://api.github.com/repos/{self.repo}"
        if not self.token and not offline:
            ERRORS.append("gh auth token gave nothing: GitHub sections empty")
            self.offline = True

    def get(self, url, raw=False):
        if self.offline:
            raise RuntimeError("offline")
        url = url if url.startswith("http") else self.api + url
        acc = "application/vnd.github.raw" if raw else "application/vnd.github+json"
        cmd = ["curl", "-sS", "--fail-with-body", "-H", f"Accept: {acc}", "-H", f"Authorization: token {self.token}", url]
        err = ""
        for wait in (0, 2, 5):
            time.sleep(wait)
            self.calls += 1
            r = subprocess.run(cmd, capture_output=True, text=True)
            if r.returncode == 0:
                if raw:
                    return r.stdout
                try:
                    return json.loads(r.stdout)
                except json.JSONDecodeError:
                    err = "bad JSON"
                    continue
            err = (r.stdout[:200] + " " + r.stderr[:200]).strip()
            if "rate limit" in err.lower():
                break
        raise RuntimeError(f"GET {url.replace(self.api, '')} failed: {err}")

    def graphql(self, query, variables):
        if self.offline:
            raise RuntimeError("offline")
        self.calls += 1
        body = json.dumps({"query": query, "variables": variables})
        r = subprocess.run(["curl", "-sS", "--fail-with-body", "-X", "POST", "-H", f"Authorization: token {self.token}",
                            "-d", "@-", "https://api.github.com/graphql"], input=body, capture_output=True, text=True)
        if r.returncode:
            raise RuntimeError(f"GraphQL failed: {r.stdout[:200]} {r.stderr[:200]}")
        d = json.loads(r.stdout)
        if d.get("errors"):
            raise RuntimeError(f"GraphQL: {str(d['errors'])[:200]}")
        return d["data"]


def safe(name, fn, default=None):
    try:
        return fn()
    except Exception as e:  # one failed read empties one block, never the page
        ERRORS.append(f"{name}: {str(e)[:240]}")
        return default


# ---------------------------------------------------------------- records in this copy
def state_needs():
    t = read("STATE.md") or ""
    asks, sec = [], None
    for line in t.splitlines():
        if line.startswith("## "):
            sec = line[3:]
            continue
        if sec and sec.startswith("Founder asks") and line.startswith("| ") and not line.startswith("| #") and not line.startswith("|---"):
            c = cells(line)
            if len(c) < 4:
                continue
            status = clean(c[3])
            if status.lower().startswith("done") or clean(c[2]).lower().startswith("done"):
                continue
            asks.append({"id": clean(c[1], 60), "ask": clean(c[2], 150), "status": clean(status, 170),
                         "src": "STATE.md › Founder asks"})
    m = re.search(r"^## For the founder[^\n]*\n+(.+)$", t, re.M)
    forf = clean(m.group(1), 220) if m else None
    w = re.search(r"\*\*Waiting on the founder[^*]*\*\*:?(.+)$", t, re.M)
    wait = clean(w.group(1), 220) if w else None
    return asks, forf, wait


def checklist():
    t = read("MVP-CHECKLIST.md") or ""
    groups, g, gname, rows = [], None, None, []
    for line in t.splitlines():
        m = re.match(r"^### ([A-L])\. (.*)", line)
        if m:
            g, gname = m.group(1), m.group(2).strip()
            groups.append({"id": g, "name": gname})
            continue
        if line.startswith("## ") and not line.startswith("## A."):
            g = None
        if g and re.match(r"^\| \d+ \|", line):
            c = cells(line)
            st = re.split(r" \(|;", c[5].replace("\\*", "").replace("*", ""))[0].strip()
            rows.append({"map": int(c[1]), "cap": clean(c[2], 90), "module": clean(c[3]), "backlog": clean(c[4], 120),
                         "status": st, "detail": clean(c[5], 120), "group": g})
    readiness = []
    for line in t.splitlines():
        if re.match(r"^\| C\d+ \|", line):
            c = cells(line)
            readiness.append({"id": c[1], "item": clean(c[2], 140), "status": clean(c[3], 90), "decision": clean(c[4], 60)})
    return groups, rows, readiness


ORDER = ["qa Works", "Merged", "In PR", "Shaped", "Not shaped"]


def decisions_last(n=5):
    out = []
    for line in (read("DECISIONS.md") or "").splitlines():
        m = re.match(r"^\| (P-\d+) \| ([^|]+) \|(.*)", line)
        if m:
            b = re.search(r"\*\*(.+?)\*\*", m.group(3))
            out.append({"id": m.group(1), "date": m.group(2).strip(), "title": clean(b.group(1) if b else m.group(3), 100),
                        "src": f"DECISIONS.md {m.group(1)}"})
            if len(out) == n:
                break
    return out


def backlog(merged_ids, inpr_ids):
    t = read("BACKLOG.md") or ""
    owners, sec, rows, xrows = [], None, [], 0
    for line in t.splitlines():
        if line.startswith("## "):
            sec = line[3:]
            continue
        if sec and sec.startswith("Owners") and line.startswith("| ") and not line.startswith("| Owner") and not line.startswith("|---"):
            c = cells(line)
            owners.append({"owner": clean(c[1], 40), "journey": clean(c[2], 40), "rows": clean(c[3], 120)})
        if re.match(r"^\| X-\d+ \|", line):
            xrows += 1
        m = re.match(r"^\| ((?:PF|FO|BK|CS|AUD|SEC|AS)-[0-9A-Za-z]+) \|", line)
        if m and "moved to" not in line.split("|")[1]:
            c = cells(line)
            rid, area = m.group(1), c[2]
            lane = re.split(r"[ (/+]", area.strip())[0].lower() or "other"
            w = re.search(r"waits on:\*?\*?\s*([^·]+)", line)
            waits = re.findall(r"\b((?:PF|FO|BK|CS|AUD|SEC|AS)-[0-9A-Za-z]+)\b", w.group(1)) if w else []
            if rid in merged_ids:
                st = "merged"
            elif rid in inpr_ids:
                st = "in PR"
            elif not w or w.group(1).strip().lower().startswith("nothing") or (waits and all(x in merged_ids for x in waits)):
                st = "ready"
            else:
                st = "blocked"
            rows.append({"id": rid, "lane": lane, "status": st, "waits_on": [x for x in waits if x not in merged_ids][:6]})
    by = {}
    for r in rows:
        by.setdefault(r["lane"], {"ready": 0, "blocked": 0, "in PR": 0, "merged": 0})[r["status"]] += 1
    return owners, rows, by, xrows


def flaky():
    t = read("tools/flaky-ledger.tsv")
    if t is None:
        return None
    lines = [l.split("\t") for l in t.splitlines() if l.strip() and not l.startswith("#")]
    rules = [l for l in lines if l[0] in ("window", "needs", "owner")]
    other = [l for l in lines if l[0] not in ("window", "needs", "owner")]
    return {"rule_lines": len(rules), "release_or_hand_lines": len(other),
            "note": "Quarantine itself is worked out by tools/flaky.mjs from check runs; not recomputed here."}


def jload(rel):
    t = read(rel)
    try:
        return json.loads(t) if t else None
    except json.JSONDecodeError as e:
        ERRORS.append(f"{rel}: {e}")
        return None


# ---------------------------------------------------------------- progress.sh's parse, reused
def progress_parse_code():
    t = open(os.path.join(HERE, "progress.sh"), encoding="utf-8").read()
    m = re.search(r"<<'EOF'\n(.*?)\nEOF", t, re.S)
    return m.group(1)


def run_progress(cap_text, built_names):
    d = tempfile.mkdtemp(prefix="cockpit-cap-")
    try:
        open(os.path.join(d, "CAPABILITIES.md"), "w", encoding="utf-8").write(cap_text)
        if built_names is not None:
            os.mkdir(os.path.join(d, "built"))
            for n in built_names:
                open(os.path.join(d, "built", n), "w").close()
        r = sh(["python3", "-I", "-", os.path.join(d, "CAPABILITIES.md")], input=progress_parse_code())
        out = []
        for line in r.stdout.splitlines():
            m = re.match(r"^(.*?): (\d+) of (\d+) work \((\d+)%\) · (.*)$", line)
            if m:
                rest = dict((k.strip(), int(v)) for v, k in re.findall(r"(\d+) ([a-z ,]+)", m.group(5)))
                out.append({"milestone": m.group(1), "works": int(m.group(2)), "total": int(m.group(3)), "other": rest})
        return out
    finally:
        shutil.rmtree(d, ignore_errors=True)


def cap_rows(cap_text, built_names):
    # The same row rule as progress.sh (| C… rows; cells 1 id, 4 milestone, 5 status; qa/built/<ID>.md marks "Built, awaiting qa").
    # progress.sh prints totals only; a --json flag there would make this copy unnecessary.
    built = {n[:-3] for n in (built_names or []) if n.endswith(".md")}
    out = []
    for line in cap_text.splitlines():
        if re.match(r"^\| C\d", line):
            c = cells(line)
            if c[4] not in ("M2", "T", "M3"):   # progress.sh counts these three milestones only
                continue
            st = c[5].replace("*", "")
            if c[1] in built and st != "Works":
                st = "Built, awaiting qa"
            out.append({"id": c[1], "name": clean(c[3], 90), "m": c[4], "status": st})
    return out


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--lead-input")
    ap.add_argument("--flow-max-age-h", type=float, default=6)
    ap.add_argument("--appcode-max", type=int, default=900)
    ap.add_argument("--offline", action="store_true")
    a = ap.parse_args()
    out_dir = os.path.dirname(os.path.abspath(a.out))
    cache = os.path.join(out_dir, "cache")
    os.makedirs(cache, exist_ok=True)
    gh = GH(a.offline)
    branch = sh(["git", "-C", ROOT, "rev-parse", "--abbrev-ref", "HEAD"]).stdout.strip()
    here_sha = sh(["git", "-C", ROOT, "rev-parse", "--short=9", "HEAD"]).stdout.strip()
    copy = f"this copy ({branch} {here_sha})"

    rate0 = safe("rate limit", lambda: gh.get("https://api.github.com/rate_limit")["resources"]["core"], {})
    remaining = rate0.get("remaining", 0)

    # ---- main's head and the qa files on main
    main_c = safe("main head", lambda: gh.get("/commits/main"))
    main_sha = main_c["sha"][:9] if main_c else None
    main_at = ts(main_c["commit"]["committer"]["date"]) if main_c else None

    def main_file(rel):
        return gh.get(f"/contents/{REL}/{rel}?ref=main", raw=True)
    cap_text = safe("qa/CAPABILITIES.md on main", lambda: main_file("qa/CAPABILITIES.md"))
    cap_src = f"qa/CAPABILITIES.md on main {main_sha} via tools/progress.sh's parse"
    if cap_text is None:
        cap_text, cap_src = read("qa/CAPABILITIES.md") or "", f"qa/CAPABILITIES.md in {copy} via tools/progress.sh's parse (main not read)"
    built_names = safe("qa/built on main", lambda: [x["name"] for x in gh.get(f"/contents/{REL}/qa/built?ref=main")], None)
    if built_names is None and os.path.isdir(os.path.join(P, "qa/built")):
        built_names = os.listdir(os.path.join(P, "qa/built"))
    prog = run_progress(cap_text, built_names)
    caps = cap_rows(cap_text, built_names)
    works = sum(x["works"] for x in prog)
    works_total = sum(x["total"] for x in prog)
    if works_total and works_total != len(caps):
        ERRORS.append(f"capability grid has {len(caps)} rows but progress.sh counts {works_total}")
    bugs_text = safe("qa/BUGS.md on main", lambda: main_file("qa/BUGS.md"))
    bugs_src = f"qa/BUGS.md on main {main_sha}"
    if bugs_text is None:
        bugs_text, bugs_src = read("qa/BUGS.md") or "", f"qa/BUGS.md in {copy}"
    closed_text = safe("qa/BUGS-CLOSED.md on main", lambda: main_file("qa/BUGS-CLOSED.md")) or read("qa/BUGS-CLOSED.md") or ""

    # ---- open PRs (factory-board.sh's query shape and station rules)
    q = """query($o:String!,$r:String!){repository(owner:$o,name:$r){pullRequests(states:OPEN,first:60,orderBy:{field:UPDATED_AT,direction:DESC}){nodes{
      number title isDraft createdAt body headRefName headRefOid labels(first:20){nodes{name}}
      commits(last:1){nodes{commit{committedDate statusCheckRollup{state contexts(first:100){nodes{__typename ... on CheckRun{status conclusion} ... on StatusContext{state}}}}}}}
      comments(last:50){nodes{body createdAt}}}}}}"""
    o, r = (gh.repo or "/").split("/")
    prs_raw = safe("open PRs", lambda: gh.graphql(q, {"o": o, "r": r})["repository"]["pullRequests"]["nodes"], [])
    prs, questions = [], []
    for p in prs_raw:
        labels = [x["name"] for x in p["labels"]["nodes"]]
        cm = (p["commits"]["nodes"] or [{}])[0].get("commit", {})
        roll = cm.get("statusCheckRollup") or {}
        ctx = (roll.get("contexts") or {}).get("nodes", [])
        red = sum(1 for c in ctx if c.get("conclusion") == "FAILURE" or c.get("state") in ("FAILURE", "ERROR"))
        running = sum(1 for c in ctx if c.get("status") in ("IN_PROGRESS", "QUEUED"))
        qs = [c for c in p["comments"]["nodes"] if "Question for the tech lead" in c["body"]]
        ans = [c for c in p["comments"]["nodes"] if re.search(r"^## Tech lead|^\*\*Tech lead|Tech lead.s (ruling|answer)", c["body"], re.M)]
        qopen = bool(qs) and (not ans or qs[-1]["createdAt"] > ans[-1]["createdAt"])
        design = bool(re.search(r"Design only|Design stage|Concept stage|concept for the tech lead", p.get("body") or ""))
        approved = "review: approved" in labels
        reviewer_ok = any(re.search(r"Reviewer: Approve " + p["headRefOid"][:7], c["body"]) for c in p["comments"]["nodes"])
        if approved:
            st = "Merge queue"
        elif qopen:
            st = "Question to Lead"
        elif design:
            st = "Concept"
        elif p["isDraft"]:
            st = "Building"
        elif running:
            st = "CI running"
        elif red:
            st = "CI red"
        else:
            st = "Ready for label"
        pushed = ts(cm.get("committedDate"))
        area = p["title"].split(":")[0].strip() if ":" in p["title"][:24] else "-"
        prs.append({"n": p["number"], "title": clean(p["title"], 80), "area": area, "draft": p["isDraft"], "labels": labels,
                    "sha": p["headRefOid"][:9], "push_age_h": hours(pushed, NOW) if pushed else None,
                    "open_h": hours(ts(p["createdAt"]), NOW), "ci": (roll.get("state") or "NONE").lower(), "red": red,
                    "running": running, "station": st, "reviewer_approve_on_head": reviewer_ok,
                    "records": bool(re.match(r"^(lead|qa):", p["title"]))})
        if qopen:
            questions.append({"n": p["number"], "title": clean(p["title"], 70), "age_h": hours(ts(qs[-1]["createdAt"]), NOW),
                              "src": f"PR #{p['number']} comment 'Question for the tech lead' with no later tech-lead answer (factory-board.sh rule)"})
    prs_src = "GitHub GraphQL: open PRs (up to 60, newest updated first); stations by tools/factory-board.sh's rules"

    # ---- merged PRs, last 14 days
    since14 = NOW - timedelta(days=14)

    def merged_list():
        out, page = [], 1
        while page < 30:
            d = gh.get(f"/pulls?state=closed&sort=updated&direction=desc&per_page=100&page={page}")
            for x in d:
                m = ts(x.get("merged_at"))
                if m and m >= since14 and not x["head"]["ref"].startswith("mergify/"):
                    out.append({"n": x["number"], "title": x["title"], "created": x["created_at"], "merged": x["merged_at"]})
            if len(d) < 100 or ts(d[-1]["updated_at"]) < since14:
                return out
            page += 1
        return out
    merged = safe("merged PRs", merged_list, [])

    # ---- app-code verdicts through tools/app-code-prs.sh (cached per PR)
    ac_path = os.path.join(cache, "appcode.json")
    ac = json.load(open(ac_path)) if os.path.exists(ac_path) else {}
    todo = [m["n"] for m in merged if str(m["n"]) not in ac]
    budget = max(0, min(a.appcode_max, remaining - 1200)) if not gh.offline else 0
    todo = todo[:budget]
    if todo:
        chunks = [todo[i::8] for i in range(8) if todo[i::8]]

        def run_chunk(ns):
            r = subprocess.run(["bash", os.path.join(HERE, "app-code-prs.sh")], input="\n".join(map(str, ns)) + "\n",
                               capture_output=True, text=True, timeout=900)
            got = {}
            unknown = set()
            for line in r.stdout.splitlines():
                if line.startswith("?"):
                    unknown.add(int(re.findall(r"\d+", line)[0]))
                elif re.match(r"^\d+", line):
                    got[int(re.findall(r"\d+", line)[0])] = True
            return {n: got.get(n, False) for n in ns if n not in unknown}
        with ThreadPoolExecutor(8) as ex:
            for res in ex.map(run_chunk, chunks):
                ac.update({str(k): v for k, v in res.items()})
        gh.calls += len(todo)
        json.dump(ac, open(ac_path, "w"))
    unclassified = sum(1 for m in merged if str(m["n"]) not in ac)

    # ---- CI runs per IST day (14 days; finished days cached)
    def runs_day(day):
        f = os.path.join(cache, f"runs-{day.isoformat()}.json")
        start = datetime(day.year, day.month, day.day, tzinfo=IST).astimezone(timezone.utc)
        end = start + timedelta(days=1)
        if os.path.exists(f) and end < NOW - timedelta(hours=2):
            return json.load(open(f))
        rng = f"{start.strftime('%Y-%m-%dT%H:%M:%SZ')}..{end.strftime('%Y-%m-%dT%H:%M:%SZ')}"
        out, page = [], 1
        while page <= 10:
            d = gh.get(f"/actions/workflows/ci.yml/runs?per_page=100&page={page}&created={rng}")
            for x in d.get("workflow_runs", []):
                out.append({k: x.get(k) for k in ("head_branch", "event", "status", "conclusion", "created_at", "run_started_at", "updated_at")}
                           | {"actor": (x.get("actor") or {}).get("login", "")})
            if len(d.get("workflow_runs", [])) < 100:
                break
            page += 1
        if end < NOW - timedelta(hours=2):
            json.dump(out, open(f, "w"))
        return out
    today = NOW.astimezone(IST).date()
    days = [today - timedelta(days=i) for i in range(13, -1, -1)]
    runs_by_day = {}
    if not gh.offline:
        with ThreadPoolExecutor(6) as ex:
            for d, rs in zip(days, ex.map(lambda d: safe(f"runs {d}", lambda: runs_day(d), None), days)):
                runs_by_day[d] = rs

    def is_queue(x):
        return (x["head_branch"] or "").startswith("mergify/")

    # ---- nightly on main (main line red share and red to green)
    nightly = safe("nightly runs", lambda: gh.get("/actions/workflows/nightly.yml/runs?branch=main&per_page=60")["workflow_runs"], [])

    # ---- flow-measure.py (cached)
    fm_path = os.path.join(cache, "flow-measure.json")
    fm = json.load(open(fm_path)) if os.path.exists(fm_path) else None
    fm_age = hours(ts(fm["_as_of"]), NOW) if fm else None
    if not gh.offline and (fm is None or fm_age > a.flow_max_age_h):
        if remaining >= 3500:
            since7 = (NOW - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
            env = dict(os.environ, FLOW_TOKEN=gh.token)
            r = subprocess.run(["python3", "-I", os.path.join(HERE, "flow-measure.py"), "--since", since7, "--json"],
                               capture_output=True, text=True, env=env, cwd=ROOT, timeout=1500)
            if r.returncode == 0:
                fm = json.loads(r.stdout)
                fm["_as_of"] = NOW.strftime("%Y-%m-%dT%H:%M:%SZ")
                json.dump(fm, open(fm_path, "w"))
                fm_age = 0.0
            else:
                ERRORS.append(f"flow-measure.py exit {r.returncode}: {r.stderr[-200:]}")
        else:
            ERRORS.append(f"flow-measure.py skipped: {remaining} API calls left this hour (needs ~3,500); last answer kept")
    fm_src = (f"tools/flow-measure.py --json, 7 days, run {ist(ts(fm['_as_of']))}" if fm else "tools/flow-measure.py not run yet")
    if fm and (fm.get("runs_read") or 0) >= 1000:
        fm_src += " (its run figures cover only the newest 1,000 runs: the runs API cap; PR figures cover all 7 days)"

    # ---- lead input
    li, li_src = None, "Lead input missing"
    if a.lead_input and os.path.exists(a.lead_input):
        li = json.load(open(a.lead_input))
        li_src = f"Lead input ({os.path.basename(a.lead_input)}, as of {li.get('as_of')})" + (" EXAMPLE" if li.get("example") else "")
    li_age = None
    if li and li.get("as_of"):
        try:
            li_age = hours(datetime.fromisoformat(li["as_of"]).astimezone(timezone.utc), NOW)
        except ValueError:
            pass
    sessions = (li or {}).get("sessions", [])

    # ================================================================ sections
    asks, forf, waitline = state_needs()
    st_src = f"STATE.md in {copy}"
    groups, rows, readiness = checklist()
    ck_src = f"MVP-CHECKLIST.md §A in {copy} (Status column)"
    counts = {s: sum(1 for x in rows if x["status"] == s) for s in ORDER}
    other = len(rows) - sum(counts.values())
    if other:
        counts["Other"] = other
    nrows = len(rows)
    plan = jload("cockpit/plan.json") or {"dates": []}
    for d in plan["dates"]:
        if d.get("date"):
            dd = datetime.fromisoformat(d["date"]).date()
            d["days_left"] = (dd - today).days
    upcoming = sorted([d for d in plan["dates"] if d.get("date") and d["days_left"] >= 0], key=lambda d: d["date"])
    next_any = upcoming[0] if upcoming else None
    next_committed = next((d for d in upcoming if d["kind"] == "committed"), None)
    build_fc = next((d for d in plan["dates"] if d["id"] == "H1"), None)

    # needs you
    needs = {"asks": asks, "for_founder": V(forf, f"{st_src} › For the founder"),
             "waiting_line": V(waitline, f"{st_src} › Start here › Waiting on the founder"),
             "pr_questions": questions, "pr_src": prs_src,
             "count": V(len(asks) + len(questions), f"open founder asks ({st_src}) + PRs with an unanswered Question for the tech lead")}

    # status line
    status_line = {
        "works": V([works, works_total], cap_src),
        "rows_done": V([counts["qa Works"], nrows], ck_src + ": rows at qa Works"),
        "rows_merged_or_better": V(counts["qa Works"] + counts["Merged"], ck_src),
        "next_committed": V(next_committed, "cockpit/plan.json (kind committed)"),
        "build_forecast": V(build_fc, "cockpit/plan.json H1"),
    }

    # value stream (the slowest measured stage is flagged)
    stale = [p for p in prs if not p["records"] and (p["push_age_h"] or 0) > 168]
    eng = [p for p in prs if not p["records"] and p not in stale]
    stn = lambda s: [p for p in eng if p["station"] == s]
    ci_walls = []
    for d in days[-2:]:
        for x in runs_by_day.get(d) or []:
            if x["status"] == "completed" and not is_queue(x) and x["run_started_at"]:
                ci_walls.append((ts(x["updated_at"]) - ts(x["run_started_at"])).total_seconds() / 3600)
    waits_q = (fm or {}).get("approved_to_merged_min", {}).get("median")
    built_wait = sum(x["other"].get("built, awaiting qa", 0) for x in prog)
    merged24 = [m for m in merged if ts(m["merged"]) >= NOW - timedelta(hours=24)]
    stages = [
        {"id": "shaped", "name": "Shaped rows", "count": V(counts["Shaped"], ck_src), "wait_h": V(None, "not measured: shaped dates are not recorded")},
        {"id": "building", "name": "Building (lanes)", "count": V(len(stn("Building")) + len(stn("Concept")), prs_src + ": Building + Concept"),
         "wait_h": V(med([p["open_h"] for p in stn("Building") + stn("Concept")]), "median hours since those PRs opened (still open)")},
        {"id": "review", "name": "Review (Opus)", "count": V(len(stn("Ready for label")) + len(stn("Question to Lead")), prs_src + ": Ready for label + Question to Lead"),
         "wait_h": V(med([p["push_age_h"] for p in stn("Ready for label") + stn("Question to Lead")]), "median hours since their last push")},
        {"id": "ci", "name": "CI", "count": V(len(stn("CI running")) + len(stn("CI red")), prs_src + ": CI running + CI red"),
         "wait_h": V(round(statistics.median(ci_walls), 2) if ci_walls else None, "added: median wall time of PR check runs (ci.yml, draft guard runs included), last 2 days")},
        {"id": "queue", "name": "Merge queue", "count": V(len(stn("Merge queue")), prs_src + ": labelled review: approved"),
         "wait_h": V(round(waits_q / 60, 1) if waits_q is not None else None, fm_src + ": approved_to_merged_min.median")},
        {"id": "main", "name": "main (last 24 h)", "count": V(len(merged24), "GitHub: PRs merged in the last 24 h"), "wait_h": V(None, "not a waiting stage")},
        {"id": "works", "name": "qa Works", "count": V(built_wait, cap_src + ": Built, awaiting qa"), "wait_h": V(None, "not measured: merge-to-Works time needs qa verdict dates")},
        {"id": "done", "name": "Release 1 rows done", "count": V(counts["qa Works"], ck_src), "wait_h": V(None, "end of the line")},
    ]
    measured = [s for s in stages if s["wait_h"]["v"] is not None]
    bottleneck = max(measured, key=lambda s: s["wait_h"]["v"])["id"] if measured else None

    # team
    def chip(s):
        st = (s.get("state") or "").lower()
        pr = next((p for p in prs if p["n"] == s.get("pr")), None)
        if st == "blocked" or (pr and pr["station"] in ("Question to Lead",)):
            return "blocked"
        recent = (pr and pr["push_age_h"] is not None and pr["push_age_h"] < 1.5) or (s.get("idle_min") is not None and s["idle_min"] < 90 and st in ("running", "pushing", "working"))
        return "pushing" if recent else "quiet"
    team = []
    for s in sessions:
        team.append(dict(s, chip=chip(s)))
    team_counts = {
        "cloud_running": sum(1 for s in team if s.get("kind") == "cloud" and s["chip"] == "pushing"),
        "cloud_idle": sum(1 for s in team if s.get("kind") == "cloud" and s["chip"] != "pushing"),
        "mac": sum(1 for s in team if s.get("kind") == "mac"),
    }

    # architecture
    arch = jload("cockpit/architecture.json") or {"modules": []}
    amods = []
    for m in arch["modules"]:
        names = [x.lower() for x in m.get("match", [])]

        def hit(r):
            parts = [re.sub(r"\s*\(.*\)", "", x).strip().lower() for x in r["module"].split("+")]
            if m.get("rule") == "multi":
                return len(parts) > 1 or parts == ["all"]
            return any(x in names for x in parts)
        mine = [r for r in rows if hit(r)]
        c = {s: sum(1 for r in mine if r["status"] == s) for s in ORDER}
        amods.append({"id": m["id"], "name": m["name"], "kind": m.get("kind", "module"), "what": m.get("what"),
                      "total": len(mine), "counts": c,
                      "done_share": round(c["qa Works"] / len(mine), 3) if mine else None,
                      "merged_share": round((c["qa Works"] + c["Merged"]) / len(mine), 3) if mine else None,
                      "rows": [{"map": r["map"], "cap": r["cap"], "status": r["status"]} for r in mine],
                      "src": f"{ck_src}, Module column; mapping cockpit/architecture.json ({m.get('source', '')})"})

    # building
    merged_ids, inpr_ids = set(), set()
    idre = r"\b((?:PF|FO|BK|CS|AUD|SEC|AS)-[0-9A-Za-z]+)\b"
    for m in merged:
        merged_ids.update(re.findall(idre, m["title"]))
    for r in rows:
        if r["status"] in ("Merged", "qa Works"):
            merged_ids.update(re.findall(idre, r["backlog"]))
    for x in re.findall(r"\b((?:PF|FO|BK)-[0-9A-Za-z]+) merged", read("MVP-CHECKLIST.md") or ""):
        merged_ids.add(x)
    for p in prs:
        inpr_ids.update(re.findall(idre, p["title"]))
    owners, brows, bylane, xrows = backlog(merged_ids, inpr_ids)

    # quality
    bugs = []
    for line in bugs_text.splitlines():
        if line.startswith("| QA-"):
            c = cells(line)
            sev = re.search(r"(Critical|Major|Minor|Trivial)", c[2])
            b = re.search(r"\*\*(.+?)\*\*", c[5])
            bugs.append({"id": c[1], "sev": sev.group(1) if sev else "?", "cap": clean(c[3].split("·")[0], 40),
                         "what": clean(b.group(1) if b else c[5], 120), "status": clean(c[-2], 60)})
    open_bugs = [b for b in bugs if b["status"].lower().startswith("open")]
    sev_counts = {s: sum(1 for b in open_bugs if b["sev"] == s) for s in ("Critical", "Major", "Minor")}
    closed_rows = [cells(l) for l in closed_text.splitlines() if l.startswith("| QA-")]
    mon = {"Oct": 10, "Nov": 11, "Dec": 12, "Jan": 1, "Feb": 2}
    closed7 = 0
    for c in closed_rows:
        m = re.search(r"\b(\d{1,2}) (Oct|Nov|Dec|Jan|Feb)\b", c[5] if len(c) > 5 else "")
        if m:
            y = today.year if mon[m.group(2)] <= today.month else today.year - 1
            try:
                if (today - datetime(y, mon[m.group(2)], int(m.group(1))).date()).days < 7:
                    closed7 += 1
            except ValueError:
                pass

    # Works per day from main's CAPABILITIES.md history (progress.sh's parse on each day's last version)
    def works_history():
        cm, page = [], 1
        while page <= 10:
            got = gh.get(f"/commits?sha=main&path={REL}/qa/CAPABILITIES.md&since={(NOW - timedelta(days=15)).strftime('%Y-%m-%dT%H:%M:%SZ')}&per_page=100&page={page}")
            cm += got
            if len(got) < 100:
                break
            page += 1
        w0 = (NOW - timedelta(days=15)).strftime('%Y-%m-%dT%H:%M:%SZ')
        cm += gh.get(f"/commits?sha=main&path={REL}/qa/CAPABILITIES.md&until={w0}&per_page=1")   # the version in force when the window opens
        cm = sorted(((ts(c["commit"]["committer"]["date"]), c["sha"]) for c in cm))
        out = {}
        for d in days:
            end = datetime(d.year, d.month, d.day, tzinfo=IST).astimezone(timezone.utc) + timedelta(days=1)
            before = [s for t_, s in cm if t_ < end]
            if not before:
                out[d] = None
                continue
            sha = before[-1]
            f = os.path.join(cache, f"works-{sha[:12]}.json")
            if os.path.exists(f):
                out[d] = json.load(open(f))
                continue
            txt = gh.get(f"/contents/{REL}/qa/CAPABILITIES.md?ref={sha}", raw=True)
            w = sum(x["works"] for x in run_progress(txt, None))
            json.dump(w, open(f, "w"))
            out[d] = w
        return out
    wh = safe("Works history", works_history, {}) if not gh.offline else {}
    # earliest day before the first change in the window: carry back nothing (shown as a gap)
    demotions = []
    prev = None
    for d in days:
        w = wh.get(d)
        if w is not None and prev is not None and w < prev:
            demotions.append({"day": d.isoformat(), "from": prev, "to": w})
        prev = w if w is not None else prev

    # pipeline (DORA labels from the cto-review skill; bands per its rule)
    m7 = [m for m in merged if ts(m["merged"]) >= NOW - timedelta(days=7)]
    lead7 = [hours(ts(m["created"]), ts(m["merged"])) for m in m7]
    ac7 = [m for m in m7 if ac.get(str(m["n"]))]
    reverts7 = [m for m in m7 if m["title"].lower().startswith("revert")]
    nl = sorted([x for x in nightly if x["status"] == "completed" and x["conclusion"] in ("success", "failure")], key=lambda x: x["created_at"])
    nl7 = [x for x in nl if ts(x["created_at"]) >= NOW - timedelta(days=7)]
    red_share = round(100 * sum(x["conclusion"] == "failure" for x in nl7) / len(nl7), 1) if nl7 else None
    restores, red_since = [], None
    for x in nl:
        if x["conclusion"] == "failure" and red_since is None:
            red_since = ts(x["updated_at"])
        elif x["conclusion"] == "success" and red_since is not None:
            restores.append(hours(red_since, ts(x["updated_at"])))
            red_since = None
    fmv = fm or {}
    series_ci7 = []
    for d in days[-8:-1]:
        rs = runs_by_day.get(d)
        if rs is not None:
            series_ci7.append(sum((ts(x["updated_at"]) - ts(x["run_started_at"])).total_seconds() for x in rs
                                  if x["status"] == "completed" and x["run_started_at"]) / 60)
    ci_hours = (fmv.get("pr_check_hours") or 0) + (fmv.get("queue_hours") or 0) if fm else None
    pipeline = {
        "band_note": "DORA bands: band not checked (cto-review skill: bands only from the newest DORA report, cited with page and date)",
        "deploy_freq": V(round(len(m7) / 7, 1), "GitHub: PRs merged to main in the last 7 days ÷ 7 (merge-queue branches left out)",
                         label="Changes reaching the main line, a day", app_code=V(round(len(ac7) / 7, 1), "same, only PRs tools/app-code-prs.sh counts as app code (P-500)")),
        "lead_time_h": V(med(lead7), "added: median hours from PR opened to merged, PRs merged in the last 7 days", label="PR opened to merged (proxy for lead time)", n=len(lead7)),
        "change_fail": V(red_share, f"added: share of finished nightly runs on main that failed, last 7 days (n={len(nl7)})", label="Share turning the main line red (proxy)",
                         reverts=V(len(reverts7), "merged PRs titled Revert…, last 7 days"),
                         batch_fail=V(round(100 * fmv["queue_failed"] / fmv["queue_runs"], 1) if fm and fmv.get("queue_runs") else None, fm_src + ": queue_failed ÷ queue_runs")),
        "restore_h": V(med(restores), "added: median hours from a failed nightly on main to the next green one, last 60 nightly runs", label="Time from red to green",
                       open_red=V(ist(red_since) if red_since else None, "nightly on main red since (none = green)")),
        "queue_wait_min": V((fmv.get("approved_to_merged_min") or {}).get("median"), fm_src + ": approved_to_merged_min.median",
                            p90=(fmv.get("approved_to_merged_min") or {}).get("p90"), n=(fmv.get("approved_to_merged_min") or {}).get("n")),
        "batches": V([fmv.get("queue_runs"), fmv.get("queue_failed"), fmv.get("queue_cancelled")], fm_src + ": queue_runs, queue_failed, queue_cancelled"),
        "ci_min_per_day": V(round(sum(x for x in series_ci7) / len(series_ci7)) if series_ci7 else None,
                            "added (approx): ci.yml run wall time, run_started_at to updated_at, summed per IST day, average of the last 7 full days",
                            job_hours=V(ci_hours, fm_src + ": pr_check_hours + queue_hours (job time over the runs it read)")),
        "thrown_share": V(fmv.get("thrown_share"), fm_src + ": thrown_share (P-371 target under 20%)"),
        "records_share": V(fmv.get("records_share"), fm_src + ": records_share (target under 20%)"),
        "runs_read": V(fmv.get("runs_read"), fm_src + ": runs_read (the runs API returns at most 1,000 per created filter)"),
    }

    # merges per day and the trend series
    series = {"days": [d.isoformat() for d in days], "merges": [], "app_merges": [], "app_partial": [], "works": [], "lead_h": [], "batch_fail": [], "ci_min": []}
    for d in days:
        md_ = [m for m in merged if ts(m["merged"]).astimezone(IST).date() == d]
        series["merges"].append(len(md_))
        series["app_merges"].append(sum(1 for m in md_ if ac.get(str(m["n"]))))
        series["app_partial"].append(any(str(m["n"]) not in ac for m in md_))
        series["works"].append(wh.get(d))
        series["lead_h"].append(med([hours(ts(m["created"]), ts(m["merged"])) for m in md_]))
        rs = runs_by_day.get(d)
        if rs is None:
            series["batch_fail"].append(None)
            series["ci_min"].append(None)
        else:
            qr = [x for x in rs if is_queue(x) and x["status"] == "completed" and x["conclusion"] in ("success", "failure", "timed_out")]
            series["batch_fail"].append(round(100 * sum(x["conclusion"] != "success" for x in qr) / len(qr), 1) if qr else None)
            series["ci_min"].append(round(sum((ts(x["updated_at"]) - ts(x["run_started_at"])).total_seconds() for x in rs
                                              if x["status"] == "completed" and x["run_started_at"]) / 60))

    def trend(key, better):
        xs = series[key]
        a_ = [x for x in xs[-7:] if x is not None]
        b_ = [x for x in xs[:7] if x is not None]
        latest = next((x for x in reversed(xs) if x is not None), None)
        if not a_ or not b_:
            return {"latest": latest, "dir": None, "this_week": None, "week_before": None}
        ma, mb = sum(a_) / len(a_), sum(b_) / len(b_)
        dirn = "flat" if abs(ma - mb) <= 0.05 * max(abs(mb), 1e-9) else ("up" if ma > mb else "down")
        good = None if dirn == "flat" else ((dirn == "up") == (better == "up"))
        return {"latest": latest, "dir": dirn, "better": good, "this_week": round(ma, 1), "week_before": round(mb, 1)}
    improving = {
        "app_merges": dict(trend("app_merges", "up"), label="App-code merges a day", src="GitHub merged PRs filtered by tools/app-code-prs.sh (P-500), per IST day"),
        "works": dict(trend("works", "up"), label="qa Works", src="tools/progress.sh's parse on main's qa/CAPABILITIES.md as of each day's end (IST)"),
        "lead_h": dict(trend("lead_h", "down"), label="Median hours, PR opened to merged", src="added: GitHub merged PRs, per IST day"),
        "batch_fail": dict(trend("batch_fail", "down"), label="Merge-queue batch failure %", src="added: ci.yml runs on merge-queue branches, per IST day"),
    }

    # healing: PR branches whose check run went red and later green (no Lead-comment check; best effort)
    by_branch = {}
    for d in days[-7:]:
        for x in runs_by_day.get(d) or []:
            if not is_queue(x) and x["status"] == "completed" and x["conclusion"] in ("success", "failure"):
                by_branch.setdefault(x["head_branch"], []).append(x)
    healed = []
    for b, xs in by_branch.items():
        xs.sort(key=lambda x: x["created_at"])
        red_at = None
        for x in xs:
            if x["conclusion"] == "failure" and red_at is None:
                red_at = ts(x["updated_at"])
            elif x["conclusion"] == "success" and red_at is not None:
                healed.append(hours(red_at, ts(x["updated_at"])))
                red_at = None
    healing = {
        "restarts": V(sum(int(s.get("restarts") or 0) for s in sessions) if li else None, li_src + ": sessions[].restarts"),
        "nudges": V(sum(int(s.get("nudges") or 0) for s in sessions) if li else None, li_src + ": sessions[].nudges"),
        "healed_prs": V(len(healed), "added: PR branches whose ci.yml run went red, then green, last 7 days (Lead comments not checked)",
                        median_h=med(healed)),
        "blocked": V([{"name": s.get("name"), "row": s.get("row"), "pr": s.get("pr")} for s in team if s["chip"] == "blocked"], li_src + " + open PR stations"),
        "ci_red_prs": V([{"n": p["n"], "push_age_h": p["push_age_h"]} for p in prs if not p["records"] and p["station"] == "CI red"], prs_src + ": station CI red"),
        "questions": V([{"n": q_["n"], "age_h": q_["age_h"]} for q_ in questions], "open PRs with an unanswered Question for the tech lead"),
    }

    # risks
    rk = jload("cockpit/risks.json") or {"risks": []}
    listed = {x["id"] for x in rk["risks"]}
    unlisted = [x for x in readiness if x["status"].startswith("Not started") and x["id"] not in listed]

    # resources
    df = sh(["df", "-g", ROOT]).stdout.splitlines()
    free_gb = int(df[1].split()[3]) if len(df) > 1 else None

    def lv(k):
        return V(li.get(k) if li else None, li_src + f": {k}" if li else "Lead input missing")
    resources = {"disk_free_gb": V(free_gb, "df -g on the repository's volume (tools/disk.sh's first line; disk.sh itself not run: it fetches)",
                                   floor_gb=10),
                 "weekly_pct": lv("weekly_pct"), "weekly_resets": lv("weekly_resets"), "burn_pct_per_h": lv("burn_pct_per_h"),
                 "paid_usd_today": lv("paid_usd_today"),
                 "api_left": V(None, "GitHub API calls left this hour after the run")}

    learn = jload("cockpit/learnings.json") or {"learnings": []}

    data = {
        "schema": 1,
        "freshness": {
            "generated_at": NOW.strftime("%Y-%m-%dT%H:%M:%SZ"), "generated_ist": ist(NOW),
            "main_sha": V(main_sha, "GitHub API commits/main"), "main_at_ist": ist(main_at),
            "records_copy": V(copy, "git in the folder the script ran from"),
            "library_base": library_base(gh.repo),
            "lead_input_age_h": V(li_age, li_src), "lead_input_example": bool(li and li.get("example")),
            "flow_measure_age_h": V(fm_age, fm_src),
        },
        "summary": {
            "needs_you": needs["count"],
            "burnup_pct": V(round(100 * counts["qa Works"] / nrows, 1) if nrows else None, ck_src + ": qa Works rows ÷ all rows"),
            "works": status_line["works"], "next_date": V(next_any, "cockpit/plan.json: the next dated row"),
        },
        "needs_you": needs,
        "status_line": status_line,
        "value_stream": {"stages": stages, "bottleneck": bottleneck,
                         "stale": V([p["n"] for p in stale], prs_src + ": open engineering PRs with no push in 7 days"),
                         "note": f"Counts of open engineering PRs by factory-board station; records PRs (lead:, qa:) and {len(stale)} stale PRs (no push in 7 days) left out."},
        "team": {"sessions": team, "counts": V(team_counts, li_src), "demo": V(None, "not read: the demo's state is not in any record")},
        "plan": {"dates": plan["dates"], "src": "cockpit/plan.json (hand-kept; each row names its decision)", "as_of": plan.get("as_of")},
        "architecture": {"modules": amods, "src": "cockpit/architecture.json"},
        "capabilities": {"groups": groups, "rows": rows, "counts": V(counts, ck_src), "total": nrows,
                         "qa": V(caps, cap_src), "qa_by_milestone": V(prog, cap_src)},
        "building": {"prs": prs, "src": prs_src, "owners": V(owners, "BACKLOG.md › Owners (as of 1 Nov; the tech lead keeps it current)")},
        "quality": {"open_major": [b for b in open_bugs if b["sev"] in ("Critical", "Major")], "sev_counts": V(sev_counts, bugs_src + ": open rows by severity"),
                    "src": bugs_src, "closed_total": V(len(closed_rows), "qa/BUGS-CLOSED.md rows (older rows are in history/)"),
                    "closed_7d": V(closed7, "qa/BUGS-CLOSED.md: Closed on date within 7 days (best effort)"),
                    "demotions": V(demotions, "Works fell from one day's end to the next (main's qa/CAPABILITIES.md, 14 days)"),
                    "flaky": V(flaky(), f"tools/flaky-ledger.tsv in {copy}"),
                    "review_rounds": V(None, "not measured: needs every PR's review comments (costly)")},
        "pipeline": pipeline,
        "merges_per_day": V({"days": series["days"], "all": series["merges"], "app": series["app_merges"], "partial": series["app_partial"]},
                            "GitHub merged PRs per IST day; app = tools/app-code-prs.sh" + (f"; {unclassified} PRs not yet classified" if unclassified else "")),
        "resources": resources,
        "risks": {"items": rk["risks"], "src": "cockpit/risks.json (hand-kept)", "unlisted": V(unlisted, "MVP-CHECKLIST.md §C items Not started that risks.json lacks")},
        "healing": healing,
        "improving": {"series": series, "trends": improving},
        "learnings": {"decisions": decisions_last(5), "kept": learn.get("learnings", []), "src": "DECISIONS.md (newest five) + cockpit/learnings.json"},
        "backlog": {"by_lane": V(bylane, "BACKLOG.md PF/FO/BK rows: merged or in PR by PR titles; ready when every 'waits on' row is merged (best effort)"),
                    "x_rows": V(xrows, "BACKLOG.md X- rows (after the first build, P-582)"), "rows": brows},
    }
    rate1 = safe("rate limit", lambda: gh.get("https://api.github.com/rate_limit")["resources"]["core"], {})
    resources["api_left"]["v"] = rate1.get("remaining")
    data["run"] = {"seconds": round(time.time() - T0, 1), "api_calls": gh.calls, "errors": ERRORS}
    os.makedirs(out_dir, exist_ok=True)
    tmp = a.out + ".tmp"
    json.dump(data, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=str)
    os.replace(tmp, a.out)
    print(f"cockpit-data: wrote {a.out} in {data['run']['seconds']} s, {gh.calls} API calls, {len(ERRORS)} notes")
    for e in ERRORS:
        print("  note:", e)


if __name__ == "__main__":
    main()
