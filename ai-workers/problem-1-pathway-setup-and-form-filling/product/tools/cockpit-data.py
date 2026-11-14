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
import argparse, json, math, os, random, re, shutil, statistics, subprocess, sys, tempfile, time
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


def slurp(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def read(rel):
    p = os.path.join(P, rel)
    return slurp(p) if os.path.exists(p) else None


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
DECIDED = re.compile(r"^(done|decided|answered|ruled)\b|\bdecided\b", re.I)


def state_needs(text=None):
    """Open founder asks from STATE.md. Known fix (spec §6 10): an ask whose status says it is decided (or done,
    answered, ruled) is not listed in Needs you."""
    t = text if text is not None else (read("STATE.md") or "")
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
            if DECIDED.search(status) or clean(c[2]).lower().startswith("done"):
                continue
            asks.append({"id": clean(c[1], 60), "ask": clean(c[2], 150), "status": clean(status, 170),
                         "src": "STATE.md › Founder asks"})
    m = re.search(r"^## For the founder[^\n]*\n+(.+)$", t, re.M)
    forf = clean(m.group(1), 220) if m else None
    w = re.search(r"\*\*Waiting on the founder[^*]*\*\*:?(.+)$", t, re.M)
    wait = clean(w.group(1), 220) if w else None
    return asks, forf, wait


def checklist(text=None):
    """Legacy view of the checklist (groups, rows, readiness); rows come from parse_checklist, the one parser."""
    t = text if text is not None else (read("MVP-CHECKLIST.md") or "")
    ck = parse_checklist(t)
    rows = [{"map": r["map"], "cap": clean(r["cap"], 90), "module": clean(r["module"]), "backlog": clean(r["cell"], 120),
             "status": r["status"], "detail": clean(r["status_cell"], 120), "group": r["group"]} for r in ck["rows"]]
    readiness = []
    for line in t.splitlines():
        if re.match(r"^\| C\d+ \|", line):
            c = cells(line)
            readiness.append({"id": c[1], "item": clean(c[2], 140), "status": clean(c[3], 90), "decision": clean(c[4], 60)})
    return ck["groups"], rows, readiness


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


def backlog(merged_ids, inpr_ids, text=None):
    t = text if text is not None else (read("BACKLOG.md") or "")
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
        if m and any(r["id"] == m.group(1) for r in rows):
            continue   # a duplicate row: the first occurrence wins (spec §6.3 edge case)
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
    t = slurp(os.path.join(HERE, "progress.sh"))
    m = re.search(r"<<'EOF'\n(.*?)\nEOF", t, re.S)
    return m.group(1)


def run_progress(cap_text, built_names):
    d = tempfile.mkdtemp(prefix="cockpit-cap-")
    try:
        with open(os.path.join(d, "CAPABILITIES.md"), "w", encoding="utf-8") as f:
            f.write(cap_text)
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
            if c[4] not in WORKS_MS:   # progress.sh's three milestones plus M4 (known fix 93/98)
                continue
            st = c[5].replace("*", "")
            if c[1] in built and st != "Works":
                st = "Built, awaiting qa"
            out.append({"id": c[1], "name": clean(c[3], 90), "m": c[4], "status": st})
    return out


# ================================================================ A61 / A62 / A63 (P-596; cockpit/spec-a61-a62-2026-11-14.md)
# Everything below computes the spec's §1-§5 and §7 numbers from the frozen snapshot only (§6 1a); formulas, sources and
# thresholds are written once in cockpit/FORMULAS.md. Pure functions take the snapshot and "now" so the unit tests
# (tools/test_cockpit_data.py) run them on the hand-made fixture snapshot.
R1_START = datetime(2026, 11, 13).date()      # P-586 baseline day; "days since 13 Nov" (§1)
BASELINE_ROWS = 101                            # P-586: Release 1 Build rows (plan.json baseline_rows overrides)
MC_RUNS, MC_SEED, MC_CAP = 10000, 596, 365     # §1 forecast: 10,000 runs, fixed seed (P-596), 1-year cap per run
UNSHAPED_FACTOR = 3                            # P-586 (4): 3 changes per unshaped capability, settled 19 Nov
LIMITS_H = {"review": 2.0, "merge": 1.0, "qa": 24.0}          # §2 constraint limits (N3)
FRESH_LIMIT_H = {"GitHub data": 1.0, "Lead input": 2.0, "flow-measure": 6.0}   # §6.8
LANE_WINDOW_MIN = 90                           # P-326: a lane works when it pushed in the last 90 min
BURN_LIMIT = 3.0                               # P-440: burn at most 3% of the weekly plan per hour
BUG_AGE_H = 48                                 # §5 item 6
LEAD_B_BRANCH = "lead-b-front-office"          # Lead B's branch holding design/lead-b-briefs/ (Lead input lead_b_branch overrides)
IDRE = r"[A-Z][A-Za-z0-9]*-[0-9A-Za-z]+(?:-[0-9A-Za-z]+)*"   # BACKLOG row ids: PF-4b, BK-17, B5-filings, DB-SPLIT, PF-L
NOT_ROW = re.compile(r"^(?:P|QA)-\d+$")      # decision and bug ids are not BACKLOG rows
NARROW = r"(?:PF|FO|BK|CS|AUD|SEC|AS)-[0-9A-Za-z]+"
_END = r"(?![0-9A-Za-z\-]|\.[0-9A-Za-z])"     # "PF-4" never matches inside "PF-4b" or "PF-4.1"
ID_TOKEN = re.compile(r"(?<![0-9A-Za-z\-])(" + IDRE + r")" + _END)
ID_RANGE = re.compile(r"(?<![0-9A-Za-z\-])(PF|FO|BK|CS|AUD|SEC|AS)-(\d+) to (?:(?:PF|FO|BK|CS|AUD|SEC|AS)-)?(\d+)" + _END)
TITLE_ID = re.compile(r"^(?:[a-z][a-z-]*: )?(" + IDRE + r")" + _END)
CAP_ID = re.compile(r"\b([CR]\d+\.\d+)\b")
RECORDS_TITLE = re.compile(r"^(lead|qa):")
WORKS_MS = ("M2", "T", "M3", "M4")             # milestones counted in Works (known fix 93/97 -> 93/98: M4 was left out)


def ist_day(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(IST).date() if iso else None


def parse_iso(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")) if iso else None


def git_blob_sha(text):
    import hashlib
    b = text.encode("utf-8")
    return hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest()


def cell_ids(cell):
    """BACKLOG ids cited in a checklist cell, in order, distinct; "BK-22 to BK-24" expands to three ids."""
    txt = re.sub(r"\*\*|`", "", cell or "")
    txt = ID_RANGE.sub(lambda m: ", ".join(f"{m.group(1)}-{i}" for i in range(int(m.group(2)), int(m.group(3)) + 1)), txt)
    out = []
    for x in ID_TOKEN.findall(txt):
        if x not in out and not NOT_ROW.match(x):
            out.append(x)
    return out


def title_id(title):
    """N2: the row id a PR title starts with, after an optional lower-case lane prefix ("runtime: PF-3 — …")."""
    if not title or RECORDS_TITLE.match(title):
        return None
    m = TITLE_ID.match(title)
    return m.group(1) if m and not NOT_ROW.match(m.group(1)) else None


def loose_title_id(title):
    """Trust note only: the first row id anywhere in a non-records title ("screens: C7.6 — BK-18 …")."""
    if not title or RECORDS_TITLE.match(title) or title.startswith("merge queue:"):
        return None
    m = next((x for x in ID_TOKEN.findall(title) if not NOT_ROW.match(x)), None)
    return m


def parse_checklist(text):
    """MVP-CHECKLIST.md section A: the Build rows, by the header of each table (a qa id column is found by name)."""
    groups, rows, dupes, seen = [], [], [], {}
    g, inA, hdr, has_qa = None, False, None, False
    for line in (text or "").splitlines():
        if line.startswith("## "):
            inA = line.startswith("## A.")
            g = None
            continue
        if not inA:
            continue
        if line.startswith("### "):
            m = re.match(r"^### ([A-L])\. (.*)", line)
            g = m.group(1) if m else None
            if m:
                groups.append({"id": g, "name": m.group(2).strip()})
            continue
        if line.startswith("| Map |"):
            hdr = [x.lower() for x in cells(line)]
            continue
        if g and hdr and re.match(r"^\| \d+ \|", line):
            c = cells(line)
            col = lambda name: next((i for i, h in enumerate(hdr) if h.startswith(name)), None)
            iq = next((i for i, h in enumerate(hdr) if h.startswith("qa")), None)
            has_qa = has_qa or iq is not None
            cell = c[col("backlog")] if col("backlog") is not None else ""
            stc = c[col("status")] if col("status") is not None else ""
            st = re.split(r" \(|;", stc.replace("\\*", "").replace("*", ""))[0].strip()
            unshaped_ids = []
            for seg in cell.split(";"):
                if "named only" in seg:
                    unshaped_ids += [x for x in cell_ids(seg) if x not in unshaped_ids]
            r = {"map": int(c[1]), "cap": re.sub(r"\*\*|`", "", c[col("capability") or 2]).strip(),
                 "module": c[col("module") or 3], "cell": cell, "status": st, "status_cell": stc, "group": g,
                 "ids": cell_ids(cell), "unshaped_ids": unshaped_ids, "gap": "none yet" in cell.lower(),
                 "qa_ids": CAP_ID.findall(c[iq]) if iq is not None and iq < len(c) else None,
                 "cap_ids": CAP_ID.findall(cell), "milestones": re.findall(r"\b(M\d|T) \d+/\d+", cell)}
            if r["map"] in seen:
                dupes.append({"map": r["map"], "statuses": [seen[r["map"]]["status"], st]})
                continue
            seen[r["map"]] = r
            rows.append(r)
    return {"groups": groups, "rows": rows, "dupes": dupes, "has_qa_col": has_qa}


def parse_backlog(text):
    """BACKLOG.md: every row id (first cell), duplicates, BK ids, and each row's line (for 'waits on' and briefs/)."""
    ids, dupes, lines = [], [], {}
    for line in (text or "").splitlines():
        m = re.match(r"^\| (" + IDRE + r")" + _END, line)
        if not m:
            continue
        rid = m.group(1)
        if re.match(r"^\| " + re.escape(rid) + r" \|", line):
            if rid in lines:
                dupes.append(rid)
                continue
            lines[rid] = line
        if rid not in ids:
            ids.append(rid)
    return {"ids": ids, "dupes": dupes, "lines": lines, "bk": [x for x in ids if x.startswith("BK-")]}


def parse_caps(text):
    """qa/CAPABILITIES.md rows: id, milestone, status (progress.sh's row rule, all four milestones)."""
    out = {}
    for line in (text or "").splitlines():
        if re.match(r"^\| C\d", line):
            c = cells(line)
            if len(c) > 5:
                out[c[1]] = {"m": c[4], "status": c[5].replace("*", "").strip()}
    return out


def works_count(caps):
    rows = [v for v in caps.values() if v["m"] in WORKS_MS]
    return sum(1 for v in rows if v["status"].startswith("Works")), len(rows)


# ---------------------------------------------------------------- snapshot (§6 1a): the one interface both scripts read
SNAP_FILES = ["MVP-CHECKLIST.md", "BACKLOG.md", "STATE.md", "cockpit/plan.json", "cockpit/history.jsonl", "qa/BUGS.md"]


def git_out(*args):
    r = sh(["git", "-C", ROOT] + list(args))
    return r.stdout if r.returncode == 0 else None


def records_lag(branch_ref, main_ref):
    """Commits on a records branch that main lacks, and the oldest one's time (git, read-only)."""
    if not branch_ref or not main_ref:
        return None, None
    n = git_out("rev-list", "--count", f"{main_ref}..{branch_ref}")
    old = git_out("log", "--reverse", "--format=%cI", f"{main_ref}..{branch_ref}")
    return (int(n.strip()) if n else None), ((old or "").splitlines() or [None])[0]


def take_snapshot(snap, gh, cache, lead_input, appcode_max):
    """Download one snapshot of every raw input into <out>/snapshot/ (spec §6 1a). Read-only everywhere."""
    if os.path.isdir(snap):
        shutil.rmtree(snap)
    for d in ("github", "files", "files_main/qa", "git/capabilities_main"):
        os.makedirs(os.path.join(snap, d), exist_ok=True)

    def wj(rel, obj):
        with open(os.path.join(snap, rel), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)

    def wt(rel, text):
        p = os.path.join(snap, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(text)
    taken = NOW.astimezone(IST).isoformat(timespec="seconds")
    branch = (git_out("rev-parse", "--abbrev-ref", "HEAD") or "").strip()
    rsha = (git_out("rev-parse", "HEAD") or "").strip()
    main_c = gh.get("/commits/main")
    msha = main_c["sha"]
    meta = {"taken_at": taken, "repo": gh.repo, "main_sha": msha, "records_branch": branch, "records_sha": rsha}
    # records files at records_sha (files/<repo path>)
    for rel in SNAP_FILES:
        t = git_out("show", f"{rsha}:{REL}/{rel}")
        if t is not None:
            wt(f"files/{REL}/{rel}", t)
    # extra (not in the shared layout; read only by cockpit-data.py): records lag for the strip and Health item 3
    main_local = msha if sh(["git", "-C", ROOT, "cat-file", "-e", msha + "^{commit}"]).returncode == 0 else None
    main_ref = main_local or (git_out("rev-parse", "origin/main") or "").strip() or None
    st = git_out("show", f"{rsha}:{REL}/STATE.md") or ""
    m = re.search(r"this branch: `([^`]+)`", st)
    state_branch = m.group(1) if m else None
    sref = rsha if state_branch == branch else ((git_out("rev-parse", "--verify", "-q", state_branch) or "").strip() or None) if state_branch else None
    n1, o1 = records_lag(rsha, main_ref)
    n2, o2 = records_lag(sref, main_ref)
    meta["extra"] = {"main_ref_used": main_ref, "main_ref_is_head": bool(main_local), "records_ahead": n1, "records_oldest_unmerged_at": o1,
                     "state_branch": state_branch, "state_branch_sha": sref, "state_branch_ahead": n2, "state_branch_oldest_unmerged_at": o2}
    wj("meta.json", meta)
    # every PR (state all)
    raw, page = [], 1
    while page <= 40:
        d = gh.get(f"/pulls?state=all&sort=created&direction=desc&per_page=100&page={page}")
        raw += d
        if len(d) < 100:
            break
        page += 1
    ac_path = os.path.join(cache, "appcode.json")
    ac = json.load(open(ac_path)) if os.path.exists(ac_path) else {}
    since = NOW - timedelta(days=21)
    need = [x["number"] for x in raw if not x["head"]["ref"].startswith("mergify/") and str(x["number"]) not in ac and (
        x["state"] == "open" or (x.get("merged_at") and parse_iso(x["merged_at"]) >= since) or title_id(x["title"]))]
    need = need[:appcode_max]
    if need:
        def run_chunk(ns):
            r = subprocess.run(["bash", os.path.join(HERE, "app-code-prs.sh")], input="\n".join(map(str, ns)) + "\n",
                               capture_output=True, text=True, timeout=900)
            got, unknown = set(), set()
            for line in r.stdout.splitlines():
                if line.startswith("?"):
                    unknown.add(int(re.findall(r"\d+", line)[0]))
                elif re.match(r"^\d+", line):
                    got.add(int(re.findall(r"\d+", line)[0]))
            return {n: (n in got) for n in ns if n not in unknown}
        with ThreadPoolExecutor(8) as ex:
            for res in ex.map(run_chunk, [need[i::8] for i in range(8) if need[i::8]]):
                ac.update({str(k): v for k, v in res.items()})
        gh.calls += len(need)
        json.dump(ac, open(ac_path, "w"))
    pulls = [{"number": x["number"], "title": x["title"], "state": x["state"], "draft": bool(x.get("draft")),
              "created_at": x["created_at"], "merged_at": x.get("merged_at"), "closed_at": x.get("closed_at"),
              "labels": [{"name": l["name"]} for l in x.get("labels", [])],
              "head": {"ref": x["head"]["ref"], "sha": x["head"]["sha"]}, "base": {"ref": x["base"]["ref"]},
              "files_app": ac.get(str(x["number"]))} for x in raw]
    wj("github/pulls.json", pulls)
    # check runs on main's head
    cr = gh.get(f"/commits/{msha}/check-runs?per_page=100")
    wj("github/main_checks.json", [{"name": c["name"], "status": c["status"], "conclusion": c["conclusion"]} for c in cr.get("check_runs", [])])
    # guards: label guard workflow on main, and the push guard (ci.yml job "guard") on the newest finished queue run
    gr = []
    lg = gh.get("/actions/workflows/label-guard.yml/runs?branch=main&status=completed&per_page=1").get("workflow_runs", [])
    gr.append({"name": "label guard (label-guard.yml on main)", "conclusion": lg[0]["conclusion"] if lg else None, "created_at": lg[0]["created_at"] if lg else None})
    # the push guard is a step: job "guard" on a draft push, step "push guard (part 1 only …)" of shard 1 on a full or queue run
    ci = gh.get("/actions/workflows/ci.yml/runs?status=completed&per_page=30").get("workflow_runs", [])
    step, at = None, None
    for q in [x for x in ci if (x.get("head_branch") or "").startswith("mergify/")][:5]:
        for j in gh.get(f"/actions/runs/{q['id']}/jobs?per_page=100").get("jobs", []):
            for st in j.get("steps") or []:
                if st["name"].startswith("push guard") and st.get("conclusion") in ("success", "failure"):
                    step, at = st, st.get("started_at") or q["created_at"]
                    break
            if step:
                break
        if step:
            break
    gr.append({"name": "push guard (ci.yml step push guard, newest finished merge-queue run that ran it)", "conclusion": step["conclusion"] if step else None,
               "created_at": at})
    wj("github/guard_runs.json", gr)
    # extra: the newest finished nightly run on main (Health item 1 also reads it: main's head has no ci.yml run of its own)
    nl = gh.get("/actions/workflows/nightly.yml/runs?branch=main&status=completed&per_page=1").get("workflow_runs", [])
    wj("github/main_nightly.json", {"conclusion": nl[0]["conclusion"], "created_at": nl[0]["created_at"]} if nl else {})
    # branches with a push in the last 24 h (GitHub keeps no push time per branch: the head commit's committed date stands in)
    o, r_ = (gh.repo or "/").split("/")
    # every branch is read (GitHub's ref ordering by commit date proved unreliable for branches: 14 Nov, today's lane branches missing)
    qb = """query($o:String!,$r:String!,$c:String){repository(owner:$o,name:$r){refs(refPrefix:"refs/heads/",first:100,after:$c){
      pageInfo{hasNextPage endCursor} nodes{name target{... on Commit{oid committedDate}}}}}}"""
    refs, cur = [], None
    for _ in range(40):
        got = gh.graphql(qb, {"o": o, "r": r_, "c": cur})["repository"]["refs"]
        refs += got["nodes"]
        if not got["pageInfo"]["hasNextPage"]:
            break
        cur = got["pageInfo"]["endCursor"]
    day_ago = NOW - timedelta(hours=24)
    wj("github/branches_recent.json", [{"name": x["name"], "sha": x["target"]["oid"], "pushed_at": x["target"]["committedDate"]}
                                        for x in refs if x.get("target") and parse_iso(x["target"]["committedDate"]) >= day_ago])
    # extra: open PRs' head commit time, CI rollup and the time `review: approved` was put on (§2 waits)
    qo = """query($o:String!,$r:String!){repository(owner:$o,name:$r){pullRequests(states:OPEN,first:100){nodes{number
      commits(last:1){nodes{commit{committedDate statusCheckRollup{state}}}}
      timelineItems(itemTypes:[LABELED_EVENT],last:30){nodes{... on LabeledEvent{createdAt label{name}}}}}}}}"""
    od = []
    for x in gh.graphql(qo, {"o": o, "r": r_})["repository"]["pullRequests"]["nodes"]:
        cm = ((x["commits"]["nodes"] or [{}])[0]).get("commit") or {}
        lab = [e["createdAt"] for e in x["timelineItems"]["nodes"] if e and (e.get("label") or {}).get("name") == "review: approved"]
        od.append({"number": x["number"], "head_committed_at": cm.get("committedDate"),
                   "ci": ((cm.get("statusCheckRollup") or {}).get("state") or "NONE").lower(), "approved_labelled_at": lab[-1] if lab else None})
    wj("github/open_prs_detail.json", od)
    # qa/CAPABILITIES.md on main, and every main commit touching it in the last 30 days
    wt("files_main/qa/CAPABILITIES.md", gh.get(f"/contents/{REL}/qa/CAPABILITIES.md?ref={msha}", raw=True))
    cms, page = [], 1
    since30 = (NOW - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
    while page <= 10:
        got = gh.get(f"/commits?sha={msha}&path={REL}/qa/CAPABILITIES.md&since={since30}&per_page=100&page={page}")
        cms += got
        if len(got) < 100:
            break
        page += 1
    lines = []
    for c in sorted(cms, key=lambda c: c["commit"]["committer"]["date"]):
        sha = c["sha"]
        f = os.path.join(cache, f"cap-{sha}.md")
        if os.path.exists(f):
            txt = open(f, encoding="utf-8").read()
        else:
            txt = gh.get(f"/contents/{REL}/qa/CAPABILITIES.md?ref={sha}", raw=True)
            open(f, "w", encoding="utf-8").write(txt)
        wt(f"git/capabilities_main/{sha}.md", txt)
        lines.append(json.dumps({"sha": sha, "date": c["commit"]["committer"]["date"]}))
    wt("git/capabilities_main.jsonl", "\n".join(lines) + ("\n" if lines else ""))
    # first main commit adding each open Critical/Major bug (git log -S on the table cell, so QA-44 never matches QA-449)
    bugs = parse_bugs(git_out("show", f"{rsha}:{REL}/qa/BUGS.md") or "")
    first = {}
    for b in bugs:
        if b["sev"] in ("Critical", "Major") and b["open"] and main_ref:
            out = git_out("log", "--reverse", "--format=%cI", f"-S| {b['id']} |", main_ref, "--", f"{REL}/qa/BUGS.md", f"{REL}/qa/BUGS-CLOSED.md")
            if out and out.strip():
                first[b["id"]] = out.splitlines()[0]
    wj("git/bug_first_seen.json", first)
    # briefs: Lead B's branch, design/briefs/ at records_sha, and briefs/<ROW> lines in BACKLOG rows
    br = {}
    lbb = ((json.load(open(lead_input)) if lead_input and os.path.exists(lead_input) else {}) or {}).get("lead_b_branch") or LEAD_B_BRANCH
    for x in safe("Lead B briefs", lambda: gh.get(f"/contents/{REL}/design/lead-b-briefs?ref={lbb}"), []) or []:
        rid = brief_id(x["name"])
        if rid:
            br.setdefault(rid, f"design/lead-b-briefs/{x['name']} on {lbb}")
    for name in (git_out("ls-tree", "--name-only", rsha, f"{REL}/design/briefs/") or "").split():
        rid = brief_id(os.path.basename(name))
        if rid:
            br.setdefault(rid, f"design/briefs/{os.path.basename(name)} @{rsha[:9]}")
    for rid, line in parse_backlog(git_out("show", f"{rsha}:{REL}/BACKLOG.md") or "")["lines"].items():
        if re.search(r"briefs/" + re.escape(rid) + _END, line):
            br.setdefault(rid, f"BACKLOG.md row {rid} names briefs/{rid}")
    wj("briefs.json", br)
    if lead_input and os.path.exists(lead_input):
        shutil.copy(lead_input, os.path.join(snap, "lead-input.json"))
    return meta


def brief_id(filename):
    """A brief file's row id: the file name is the id, then a dot or a dash and more (FO-1a.md, FO-2-sales.md).
    The spec's glob <ROW>*.md would also let FO-13.md count for FO-1; the id must end where the name's id ends."""
    m = re.match(r"^(" + NARROW + r")(?=\.|-[a-z])", filename)
    return m.group(1) if m else None


def parse_bugs(text):
    out = []
    for line in (text or "").splitlines():
        if line.startswith("| QA-"):
            c = cells(line)
            if len(c) < 8:
                continue
            sev = re.search(r"(Critical|Major|Minor|Trivial)", c[2])
            # the capability ids the bug names: before any "(" note and before the "·" requirement part
            out.append({"id": c[1], "sev": sev.group(1) if sev else "?", "caps": CAP_ID.findall(c[3].split("·")[0].split("(")[0]),
                        "open": clean(c[-2]).lower().startswith("open")})
    return out


class Snap:
    """The frozen snapshot folder, read only through here."""
    def __init__(self, root):
        self.root = root
        self.meta = self.j("meta.json") or {}

    def path(self, rel):
        return os.path.join(self.root, rel)

    def text(self, rel):
        p = self.path(rel)
        return slurp(p) if os.path.exists(p) else None

    def j(self, rel, default=None):
        t = self.text(rel)
        return json.loads(t) if t else default

    def file(self, prel):
        """A record file at records_sha: files/<repo path>; found by its path suffix."""
        t = self.text(f"files/{REL}/{prel}")
        if t is not None:
            return t
        for dp, _, fs in os.walk(self.path("files")):
            for f in fs:
                full = os.path.join(dp, f)
                if full.replace(os.sep, "/").endswith("/" + prel):
                    return slurp(full)
        return None

    def cap_history(self):
        out = []
        for line in (self.text("git/capabilities_main.jsonl") or "").splitlines():
            if line.strip():
                d = json.loads(line)
                d["text"] = self.text(f"git/capabilities_main/{d['sha']}.md") or ""
                out.append(d)
        return sorted(out, key=lambda d: d["date"])


def num(value, src, cls, L, reason=None, **kw):
    """One number with its lineage (§0.3): source, commit sha, as-of time, provenance class; null needs a reason."""
    sha, as_of = L.get(cls, (None, None))
    d = {"value": value, "src": src, "sha": sha, "as_of": as_of, "class": "parsed" if cls == "mixed" else cls}
    if value is None:
        d["reason"] = reason or "not measured"
    d.update(kw)
    return d


def nearest_rank(xs, p):
    xs = sorted(xs)
    return xs[max(0, math.ceil(p * len(xs)) - 1)] if xs else None


def monte_carlo(counts, remaining, today, runs=MC_RUNS, seed=MC_SEED, cap=MC_CAP):
    """§1 forecast: each run draws one day's throughput at a time from the 14 daily counts until the remaining
    changes are done (day 1 = tomorrow); 50% and 85% dates by nearest rank. A run still short at 365 days is "beyond 1 year"."""
    if remaining <= 0:
        return {"p50": today.isoformat(), "p85": today.isoformat(), "reason": None}
    if not counts or sum(counts) == 0:
        return {"p50": None, "p85": None, "reason": "not measured: no merges in 14 days"}
    rng = random.Random(seed)
    res = []
    for _ in range(runs):
        left, d = remaining, 0
        while left > 0 and d < cap:
            d += 1
            left -= rng.choice(counts)
        res.append(d if left <= 0 else cap + 1)
    res.sort()
    out = {"reason": None}
    for k, p in (("p50", 0.5), ("p85", 0.85)):
        d = res[math.ceil(p * runs) - 1]
        out[k] = "beyond 1 year" if d > cap else (today + timedelta(days=d)).isoformat()
    return out


def constraint(L, Q, room, waits, qa_unknown, qa_count):
    """§2 Theory of Constraints line. waits: {stage: (oldest wait h or None, items)}; limits in LIMITS_H."""
    over = {k: w for k, (w, n) in waits.items() if w is not None and w > LIMITS_H[k]}
    if qa_unknown and qa_count > 0:
        return {"stage": "unknown", "wait_h": None, "line": "Constraint unknown: qa wait not measured.", "add": None}
    if Q >= 1 and not over:
        add = min(Q, room) if room is not None else None
        return {"stage": "building", "wait_h": None, "add": add,
                "line": f"{L} lanes working · {Q} rows ready with nobody on them → could add "
                        + (f"{add} lanes." if add is not None else f"up to {Q} lanes (room not measured).")}
    cand = {k: w for k, (w, n) in waits.items() if w is not None}
    if not cand:
        return {"stage": "none", "wait_h": None, "add": None,
                "line": "More lanes won't help now: no row is ready with a brief (Q = 0) and no queue is waiting."}
    k = max(cand, key=lambda s: (cand[s] / LIMITS_H[s], cand[s]))
    return {"stage": k, "wait_h": round(cand[k], 1), "add": None,
            "line": f"More lanes won't help now: the constraint is {k} (wait {round(cand[k], 1)} h)."}


def compute_board(snap, now, history, reconcile_out=None, reconcile_note=None):
    """Every §1-§5 and §7 number from the snapshot. history: committed history.jsonl lines (dicts)."""
    meta = snap.meta
    today = now.astimezone(IST).date()
    taken = meta.get("taken_at")
    msha, rsha = (meta.get("main_sha") or "")[:9], (meta.get("records_sha") or "")[:9]
    li = snap.j("lead-input.json")
    li_sha = git_blob_sha(snap.text("lead-input.json"))[:9] if li else None
    L = {"measured": (msha or None, taken), "parsed": (rsha or None, taken), "mixed": (f"records {rsha} + main {msha}", taken),
         "reported": (f"lead-input {li_sha}" if li else "no Lead input", (li or {}).get("as_of") or taken)}
    rb = meta.get("records_branch")
    ck_src = f"MVP-CHECKLIST.md @{rsha} ({rb})"
    bl_src = f"BACKLOG.md @{rsha} ({rb})"
    gh_src = f"GitHub snapshot {taken}"
    notes, invariants = [], []

    ck_text, bl_text, plan_text = snap.file("MVP-CHECKLIST.md"), snap.file("BACKLOG.md"), snap.file("cockpit/plan.json")
    ck = parse_checklist(ck_text)
    bl = parse_backlog(bl_text)
    plan = json.loads(plan_text) if plan_text else {"dates": []}
    caps_main = parse_caps(snap.text("files_main/qa/CAPABILITIES.md"))
    pulls = [p for p in (snap.j("github/pulls.json") or []) if not p["head"]["ref"].startswith("mergify/")]
    cutoff = now.astimezone(timezone.utc)
    merged = [p for p in pulls if p.get("merged_at") and parse_iso(p["merged_at"]) <= cutoff]
    open_prs = [p for p in pulls if p["state"] == "open"]
    detail = {d["number"]: d for d in (snap.j("github/open_prs_detail.json") or [])}
    branches = snap.j("github/branches_recent.json") or []
    briefs = snap.j("briefs.json") or {}
    rows = ck["rows"]
    nrows = len(rows)
    baseline = plan.get("baseline_rows") or BASELINE_ROWS

    # ---- N2: Release 1 changes and their merge dates
    r1 = []
    for r in rows:
        r1 += [x for x in r["ids"] if x not in r1]
    flag_bk = [x for x in bl["bk"] if x not in r1]     # Flags: the case-side BK- rows serve map rows 77, 80, 99
    r1 += flag_bk
    change_at, unclassified = {}, set()
    for p in sorted(merged, key=lambda p: p["merged_at"]):
        rid = title_id(p["title"])
        if rid in r1 and rid not in change_at:
            if p.get("files_app") is True:
                change_at[rid] = p["merged_at"]
            elif p.get("files_app") is None:
                unclassified.add(rid)
    loose = []
    for p in merged:
        lid = loose_title_id(p["title"])
        if lid and lid in r1 and title_id(p["title"]) != lid and lid not in change_at and p.get("files_app"):
            loose.append({"id": lid, "pr": p["number"]})
    if loose:
        notes.append("Not counted by N2 (the row id is not at the start of the title): " + ", ".join(f"{x['id']} #{x['pr']}" for x in loose[:12]))
    if unclassified:
        notes.append("App-code check missing for the PRs of " + ", ".join(sorted(unclassified)) + " (not counted)")
    change_day = {k: ist_day(v) for k, v in change_at.items()}
    per_day = {}
    for d in change_day.values():
        per_day[d] = per_day.get(d, 0) + 1
    days_since = (today - R1_START).days
    w = min(14, days_since)
    win = [today - timedelta(days=w - 1 - i) for i in range(w)] if w > 0 else []
    in_win = sum(per_day.get(d, 0) for d in win)
    if days_since < 5:
        Y = num(None, f"Release 1 changes merged per IST day ({gh_src}; checklist {ck_src})", "mixed",
                L, f"not measured: {days_since} of 5 days of Release 1 history (a rate needs 5, principle 4)", window_days=w, merged_in_window=in_win)
    else:
        Y = num(round(in_win / w, 2), f"{in_win} Release 1 changes merged in the last {w} IST days ÷ {w} ({gh_src}; {ck_src})", "mixed", L,
                window_days=w, merged_in_window=in_win)

    # ---- §1 C1: remaining scope in changes
    shaped = [r for r in rows if r["status"] != "Not shaped"]
    unshaped = [r for r in rows if r["status"] == "Not shaped"]
    shaped_ids = []
    for r in shaped:
        shaped_ids += [x for x in r["ids"] if x not in shaped_ids]
    rem_shaped = sum(1 for x in shaped_ids if x not in change_at)
    flag_unmerged = [x for x in flag_bk if x not in change_at]   # pace counts them (N2); C1's scope names only Build rows' parts
    rem_unshaped = sum(max(0, UNSHAPED_FACTOR - sum(1 for x in r["ids"] if x in change_at)) for r in unshaped)
    remaining = rem_shaped + rem_unshaped
    R = num(remaining, f"unmerged ids of shaped Build rows and the Flags' BK rows ({rem_shaped}) + {UNSHAPED_FACTOR} × each Build row not shaped, "
            f"less its merged parts ({rem_unshaped}); {ck_src}, {bl_src}, {gh_src}", "mixed", L,
            label=f"estimate: {len(unshaped)} unshaped capabilities × {UNSHAPED_FACTOR} (P-586 (4), settled 19 Nov)",
            shaped_unmerged=rem_shaped, unshaped_rows=len(unshaped), unshaped_estimate=rem_unshaped,
            flags_bk_unmerged=num(len(flag_unmerged), "BK- rows tied by the Flags to map rows 77, 80, 99 (not cited in a row) still unmerged: "
                                  "counted in pace (N2), not in C1's scope", "mixed", L, ids=flag_unmerged))

    # ---- §1 B1: built and proven per Build row
    for r in rows:
        r["built"] = None
        if r["status"] == "Not shaped" or r["gap"] or r["unshaped_ids"]:
            continue
        if not r["ids"]:
            # B1 dates a row by its BACKLOG parts; a row with none has no built date. Rows the checklist marks Merged or
            # qa Works with no part (proven in the proof of concept) are shown apart as "built before 13 Nov".
            r["pre_baseline"] = r["status"] in ("Merged", "qa Works")
            continue
        if all(x in change_at for x in r["ids"]):
            r["built"] = max(change_day[x] for x in r["ids"]).isoformat()
    built_rows = [r for r in rows if r["built"]]
    pre = [r["map"] for r in rows if r.get("pre_baseline")]
    B = num(len(built_rows), f"shaped Build rows whose BACKLOG parts all merged through app PRs (built date = the latest part's merge date); "
            f"{ck_src}, {gh_src}", "mixed", L,
            built_before=num(len(pre), "Build rows with no BACKLOG part that the checklist marks Merged or qa Works (built in the proof of concept, "
                             "before 13 Nov; no date)", "parsed", L, maps=pre))
    hist_caps = snap.cap_history()
    proven_reason = None
    if not ck["has_qa_col"]:
        proven_reason = "not measured: the checklist has no qa id column yet (qa's R1 capabilities, #1748)"
    for r in rows:
        r["proven"] = None
        if proven_reason or not r.get("qa_ids"):
            continue
        for h in hist_caps:
            cm = parse_caps(h["text"])
            if all(cm.get(q, {}).get("status", "").startswith("Works") for q in r["qa_ids"]):
                r["proven"] = ist_day(h["date"]).isoformat()
                break
    P_ = num(None if proven_reason else sum(1 for r in rows if r["proven"]),
             f"first main commit of qa/CAPABILITIES.md (last 30 days) in which every qa id of the row reads Works; {ck_src}", "mixed", L, proven_reason)
    dated = built_rows
    ratio = None
    if len(dated) >= 5:
        parts = len({x for r in dated for x in r["ids"]})
        ratio = num(round(parts / len(dated), 2), f"distinct parts of the {len(dated)} built rows with dated parts ÷ those rows", "mixed", L)
    disagree = [{"map": r["map"], "checklist": r["status"], "computed": "built" if r["built"] else "not built"}
                for r in rows if bool(r["built"]) != (r["status"] in ("Merged", "qa Works")) and not r.get("pre_baseline")]

    # ---- §1 committed date, X, light
    h1 = next((d for d in plan.get("dates", []) if d.get("id") == "H1"), None)
    m1 = next((d for d in plan.get("dates", []) if d.get("id") == "M1"), None)
    committed = (h1.get("date_to") or h1.get("date")) if h1 and h1.get("kind") == "committed" else None
    tol = h1.get("tolerance_days") if h1 else None
    set_on = (m1 or {}).get("date")
    if committed:
        days_left = (datetime.fromisoformat(committed).date() - today).days
        X = num(round(remaining / days_left, 2) if days_left > 0 else None, f"remaining scope in changes ÷ calendar days to the committed date {committed}",
                "mixed", L, "not measured: the committed date is today or past")
    else:
        X = num(None, "cockpit/plan.json H1 (kind committed)", "parsed", L, f"not measured: no committed date yet (set {set_on or 'not dated'})")

    # ---- §1 forecast (Monte Carlo on 14 daily counts)
    days14 = [today - timedelta(days=13 - i) for i in range(14)]
    if days_since >= 5:
        counts = [per_day.get(d, 0) for d in days14]
        sample = "Release 1 changes merged per IST day, last 14 days"
    else:
        app_per = {}
        for p in merged:
            if p.get("files_app") is True and not RECORDS_TITLE.match(p["title"]):
                d = ist_day(p["merged_at"])
                app_per[d] = app_per.get(d, 0) + 1
        counts = [app_per.get(d, 0) for d in days14]
        sample = "reference class: all app rows, not only Release 1"
    mc = monte_carlo(counts, remaining, today)
    fsrc = f"Monte Carlo, {MC_RUNS:,} runs, seed {MC_SEED}, cap {MC_CAP} days; {sample}; remaining {remaining}"
    F50 = num(mc["p50"], fsrc, "mixed", L, mc["reason"])
    F85 = num(mc["p85"], fsrc, "mixed", L, mc["reason"])
    if mc["reason"]:
        light = {"state": "red", "why": mc["reason"].replace("not measured: ", "") + " (zero guard)"}
    elif not committed:
        light = {"state": "grey", "why": f"no committed date (set {set_on or 'not dated'})"}
    elif tol is None:
        light = {"state": "grey", "why": "no tolerance yet (the founder's, asked once after 19 Nov)"}
    elif mc["p85"] == "beyond 1 year":
        light = {"state": "red", "why": "85% date beyond 1 year"}
    else:
        lim = datetime.fromisoformat(committed).date() + timedelta(days=tol)
        d85 = datetime.fromisoformat(mc["p85"]).date()
        light = ({"state": "green", "why": f"85% date {mc['p85']} on or before {lim}"} if d85 <= lim else
                 {"state": "amber", "why": f"85% date {mc['p85']} within 7 days past {lim}"} if d85 <= lim + timedelta(days=7) else
                 {"state": "red", "why": f"85% date {mc['p85']} beyond {lim} + 7 days"})

    # ---- history (N1): one line per IST day; today's line replaces earlier lines of today
    hist = [h for h in history if h.get("day") != today.isoformat()]
    file_shas = {rel: git_blob_sha(t) for rel in SNAP_FILES if rel != "cockpit/history.jsonl" for t in [snap.file(rel)] if t is not None}
    merged_r1 = len(change_at)
    today_line = {"day": today.isoformat(), "taken_at": taken, "rows": nrows, "shaped_maps": [r["map"] for r in shaped],
                  "unshaped": len(unshaped), "scope_changes": merged_r1 + remaining, "file_shas": file_shas,
                  "audit": {"built": len(built_rows), "proven": P_["value"], "checklist_sha": file_shas.get("MVP-CHECKLIST.md")}}
    prev = hist[-1] if hist else None

    # ---- §1 burn-up (capabilities: scope steps from history, built and proven recomputed)
    bdays = [R1_START + timedelta(days=i) for i in range((today - R1_START).days + 1)]
    by_day = {h["day"]: h for h in hist}
    burn = {"days": [d.isoformat() for d in bdays],
            "scope": [(nrows if d == today else (by_day.get(d.isoformat()) or {}).get("rows")) for d in bdays],
            "built": [sum(1 for r in rows if r["built"] and r["built"] <= d.isoformat()) for d in bdays],
            "proven": [None if proven_reason else sum(1 for r in rows if r["proven"] and r["proven"] <= d.isoformat()) for d in bdays],
            "h1": {"from": (h1 or {}).get("date"), "to": (h1 or {}).get("date_to"), "kind": (h1 or {}).get("kind")},
            "src": f"scope: cockpit/history.jsonl (one line per IST day) and today's {ck_src}; built and proven recomputed today"}
    ends = [x for x in [burn["h1"]["to"] or burn["h1"]["from"], mc["p85"] if mc["p85"] and mc["p85"][0].isdigit() else None] if x]
    burn["x_end"] = max(ends) if ends else today.isoformat()

    # ---- §2 capacity
    def is_session_branch(n):
        return not (n == "main" or n.startswith(("mergify/", "gh-readonly-queue/", "dependabot/")))

    def is_lane_branch(n):   # org chart lanes: the Leads' own branches are the Leads' nodes
        return is_session_branch(n) and not n.startswith(("lead/", "lead-"))
    lanes = [b for b in branches if is_session_branch(b["name"]) and parse_iso(b["pushed_at"]) >= cutoff - timedelta(minutes=LANE_WINDOW_MIN)]
    Lw = num(len(lanes), f"sessions = branches (not main or the merge queue) with a push in the last {LANE_WINDOW_MIN} min; {gh_src} branches_recent.json "
             "(push time = head commit time)", "measured", L, names=[b["name"] for b in lanes])
    merged_any = {title_id(p["title"]) for p in merged} - {None}    # readiness: done by any non-records PR (app or not)
    inpr = {}
    for p in open_prs:
        rid = title_id(p["title"])
        if rid:
            inpr.setdefault(rid, []).append(p["number"])
    _, brows, _, _ = backlog(merged_any, set(inpr), text=bl_text or "")
    ready = [r["id"] for r in brows if r["status"] == "ready"]
    q_rows = [x for x in ready if x in briefs]
    Q = num(len(q_rows), f"BACKLOG rows ready (not merged, not in a PR, waits on nothing unmerged) that have a brief file (briefs.json); {bl_src}, {gh_src}",
            "mixed", L, rows=q_rows, ready_without_brief=[x for x in ready if x not in briefs])
    room_v = (li or {}).get("max_lanes")
    room = num(max(0, int(room_v) - len(lanes)) if room_v is not None else None, "Lead input max_lanes − lanes working", "reported", L,
               "not measured: Lead input has no max_lanes")
    eng = [p for p in open_prs if not RECORDS_TITLE.match(p["title"])]
    lab = lambda p: [x["name"] for x in p.get("labels", [])]
    hrs = lambda iso: (cutoff - parse_iso(iso)).total_seconds() / 3600 if iso else None
    review_q = [p for p in eng if not p["draft"] and "review: approved" not in lab(p) and (detail.get(p["number"]) or {}).get("ci") == "success"]
    merge_q = [p for p in eng if "review: approved" in lab(p)]
    rw = [hrs((detail.get(p["number"]) or {}).get("head_committed_at")) for p in review_q]
    mw = [hrs((detail.get(p["number"]) or {}).get("approved_labelled_at")) for p in merge_q]
    built_wait = [r for r in built_rows if r["status"] != "qa Works" and not r.get("proven")]
    qa_unknown = bool(proven_reason)
    qa_w = None if qa_unknown else max([hrs(r["built"] + "T00:00:00+05:30") for r in built_wait], default=None)
    waits = {"review": (max([x for x in rw if x is not None], default=None), len(review_q)),
             "merge": (max([x for x in mw if x is not None], default=None), len(merge_q)),
             "qa": (qa_w, len(built_wait))}
    cons = constraint(len(lanes), len(q_rows), room["value"], waits, qa_unknown, len(built_wait))
    stages = {k: {"count": num(n, {"review": "open non-draft PRs, CI green, no `review: approved` (Ready for label)",
                                   "merge": "open PRs labelled `review: approved`",
                                   "qa": "built Build rows not yet proven"}[k] + f"; {gh_src}", "measured" if k != "qa" else "mixed", L),
                  "wait_h": num(round(wv, 1) if wv is not None else None,
                                {"review": "oldest: hours since the head commit", "merge": "oldest: hours since the label went on",
                                 "qa": "oldest: hours since the row was built"}[k], "measured" if k != "qa" else "mixed", L,
                                "not measured: qa wait needs the checklist's qa id column" if k == "qa" and qa_unknown else "nothing waiting"),
                  "limit_h": LIMITS_H[k]} for k, (wv, n) in waits.items()}
    # work item age (R2-1)
    app_merged14 = [p for p in merged if p.get("files_app") is True and not RECORDS_TITLE.match(p["title"])
                    and parse_iso(p["merged_at"]) >= cutoff - timedelta(days=14)]
    cyc = [(parse_iso(p["merged_at"]) - parse_iso(p["created_at"])).total_seconds() / 86400 for p in app_merged14]
    p85 = nearest_rank(cyc, 0.85) if len(cyc) >= 5 else None
    items = []
    for p in eng:
        if p.get("files_app") is not True:
            continue
        age = (cutoff - parse_iso(p["created_at"])).total_seconds() / 86400
        push = hrs((detail.get(p["number"]) or {}).get("head_committed_at"))
        items.append({"pr": p["number"], "title": clean(p["title"], 80), "age_d": round(age, 2), "push_h": round(push, 1) if push is not None else None,
                      "older": p85 is not None and age > p85,
                      "amber": (p85 is not None and age > 2 * p85) or (push is not None and push > 24)})
    older = [x for x in items if x["older"]]
    amber_items = [x for x in items if x["amber"]]
    age_reason = None if p85 is not None else f"not measured: {len(cyc)} cycle times in 14 days (needs 5)"
    idle = [{"pr": p["number"], "branch": p["head"]["ref"], "push_h": round(hrs((detail.get(p["number"]) or {})["head_committed_at"]), 1)}
            for p in eng if (detail.get(p["number"]) or {}).get("head_committed_at")
            and hrs(detail[p["number"]]["head_committed_at"]) * 60 > LANE_WINDOW_MIN]
    cap_light = "green" if not amber_items and (cons["stage"] != "building" or len(q_rows) == 0) else "amber"
    capacity = {
        "lanes_working": Lw, "ready_rows": Q, "room": room, "stages": stages, "constraint": cons,
        "age": {"p85_days": num(round(p85, 2) if p85 is not None else None, "85th percentile (nearest rank) of cycle times: app PRs merged in the last 14 days, "
                                "opened to merged, days", "measured", L, age_reason),
                "older": num(len(older) if p85 is not None else None, "open app PRs older than the 85th percentile", "measured", L, age_reason),
                "items": items, "amber_items": [x["pr"] for x in amber_items]},
        "cycle_median_days": num(round(statistics.median(cyc), 2) if len(cyc) >= 5 else None,
                                 "median days, PR opened to merged (stand-in for a row's first commit: the snapshot has no commit list), app PRs, 14 days",
                                 "measured", L, age_reason),
        "wip": num(len(items), "open app PRs (non-records)", "measured", L),
        "idle": idle,
        "baton_held": num(None, "BACKLOG touches: field", "parsed", L, "not measured: BACKLOG rows carry no touches: field yet"),
        "light": {"state": cap_light, "why": ("an item is older than 2 × the 85th percentile or has no push in 24 h" if amber_items else
                                              "rows are ready and nobody is on them" if cap_light == "amber" else "no item past the rule")},
    }

    # ---- §3 Top 3
    li_age = hrs(li["as_of"]) if li and li.get("as_of") else None
    top = (li or {}).get("top3") or {}
    cards = {}
    for k in ("today", "week", "month"):
        c = top.get(k)
        if not c or li_age is None or li_age > 2:
            cards[k] = {"state": "missing", "text": "Lead has not updated this",
                        "why": "no Lead input" if not li else f"Lead input {round(li_age, 1)} h old (limit 2 h)" if li_age is not None and li_age > 2 else "no top3." + k}
        else:
            cards[k] = dict({x: c.get(x) for x in ("what", "why", "rec", "owner", "needs_you")}, state="ok")
    top3 = {"cards": cards, "class": "reported", "src": "Lead input top3", "sha": L["reported"][0], "as_of": L["reported"][1],
            "example": bool(li and li.get("example")), "age_h": round(li_age, 1) if li_age is not None else None}

    # ---- §4 org chart: Lead input sessions, cross-checked with branches and open PRs pushed in 24 h
    st_text = snap.file("STATE.md") or ""
    cm_ = re.search(r"^current_lead:.*?\b(Lead \d+)", st_text, re.M)
    cur_lead = cm_.group(1) if cm_ else None
    sessions = (li or {}).get("sessions") or []
    pr_by_n = {p["number"]: p for p in open_prs}
    measured = {}
    for b in branches:
        if is_lane_branch(b["name"]):
            prn = next((p["number"] for p in open_prs if p["head"]["ref"] == b["name"]), None)
            if prn is None and any(p["head"]["ref"] == b["name"] for p in pulls):
                continue   # a branch whose PR is merged or closed is not a lane at work
            measured[b["name"]] = {"branch": b["name"], "pr": prn, "push_h": round(hrs(b["pushed_at"]), 1)}
    used, lanes_out = set(), []
    for s in sessions:
        if s.get("role") not in ("builder", "qa"):
            continue
        br_ = s.get("branch") or (pr_by_n.get(s.get("pr")) or {}).get("head", {}).get("ref")
        hit = measured.get(br_) if br_ else None
        if (s.get("state") or "").lower() == "done":
            continue
        if hit:
            used.add(br_)
        lanes_out.append({"name": s.get("name"), "role": s.get("role"), "row": s.get("row"), "pr": s.get("pr") or (hit or {}).get("pr"),
                          "reports_to": s.get("reports_to"), "state": s.get("state"), "push_h": (hit or {}).get("push_h"),
                          "seen": "both" if hit else "reported only"})
    for k, m in measured.items():
        if k not in used:
            lanes_out.append({"name": k, "role": "unknown", "row": None, "pr": m["pr"], "reports_to": None, "state": None,
                              "push_h": m["push_h"], "seen": "measured only"})
    leads = [{"name": cur_lead or "current Lead (STATE current_lead: unreadable)", "role": "release holder: release, Bake, case side; the pipeline",
              "src": f"STATE.md current_lead @{rsha}"}]
    for s in sessions:
        if s.get("role") in ("lead-b",) or (s.get("role") == "lead" and "lead b" in (s.get("name") or "").lower()):
            leads.append({"name": s.get("name"), "role": "platform + front office", "src": "Lead input sessions (reported)"})
    org = {"founder": {"name": "Founder", "role": "product direction"}, "leads": leads, "lanes": lanes_out,
           "standbys": [s.get("name") for s in sessions if s.get("role") == "standby"],
           "desk": [s.get("name") for s in sessions if s.get("role") in ("desk", "strategy desk")],
           "reviewers": "fresh Opus reviewer per PR (not standing sessions)",
           "how": "Lead shapes rows → lane builds one row → reviewer approves → Mergify merges → qa proves → board",
           "mismatches": [x for x in lanes_out if x["seen"] != "both"], "class": "reported + measured",
           "src": "Lead input sessions (reported, with reports_to) cross-checked with branches_recent.json and open PRs (measured, 24 h)",
           "sha": L["mixed"][0], "as_of": taken}

    # ---- §7 working today
    wt_rows = {}
    for r in rows:
        prs = sorted({n for x in r["ids"] for n in inpr.get(x, [])})
        if prs:
            wt_rows[r["map"]] = {"kind": "pr", "prs": prs, "class": "measured"}
            continue
        rep = [s.get("name") for s in sessions if (s.get("state") or "").lower() in ("running", "pushing", "working")
               and set(cell_ids(s.get("row") or "")) & set(r["ids"])]
        if rep:
            wt_rows[r["map"]] = {"kind": "reported", "sessions": rep, "class": "reported"}
    gids = [g["id"] for g in ck["groups"] if any(r["group"] == g["id"] and r["map"] in wt_rows for r in rows)]
    working = {"groups": gids, "rows": {str(k): v for k, v in wt_rows.items()},
               "line": "Working today on: " + (", ".join(f"{g['id']}. {g['name']}" for g in ck["groups"] if g["id"] in gids) or "nothing"),
               "src": f"open PRs whose title starts with a row's BACKLOG id ({gh_src}); else a running Lead-reported lane naming it", "sha": L["mixed"][0], "as_of": taken}

    # ---- invariants (M6)
    def inv(name, ok, detail):
        invariants.append({"name": name, "ok": bool(ok), "detail": detail})
    inv("Build rows equal the baseline", nrows == baseline,
        f"{nrows} rows (baseline {baseline})" + ("" if nrows == baseline else ": scope changed, the scope line says so"))
    inv("Build rows unique", not ck["dupes"], "duplicates: " + ", ".join(f"{d['map']} ({' / '.join(d['statuses'])})" for d in ck["dupes"]) if ck["dupes"] else "no duplicate map numbers")
    missing = sorted({x for r in rows for x in r["ids"] if x not in bl["ids"] and x not in r["unshaped_ids"]})
    inv("Every cited BACKLOG id exists", not missing, "missing in BACKLOG.md: " + ", ".join(missing) if missing else "all cited ids found")
    bad = []
    for r in rows:
        if r["status"] != "qa Works":
            continue
        named = r["cap_ids"] + [c for c, v in caps_main.items() for m_ in r["milestones"] if v["m"] == m_]
        if not named or not all(caps_main.get(c, {}).get("status", "").startswith("Works") for c in named):
            bad.append(r["map"])
    inv("Every qa Works row names a qa capability that reads Works on main", not bad, "rows: " + ", ".join(map(str, bad)) if bad else "all hold")
    w_a, t_a = works_count(caps_main)
    # second parser: progress.sh's own code (M2, T, M3) plus M4 rows counted apart
    prog = run_progress(snap.text("files_main/qa/CAPABILITIES.md") or "", None)
    m4 = [v for v in caps_main.values() if v["m"] == "M4"]
    w_b = sum(x["works"] for x in prog) + sum(1 for v in m4 if v["status"].startswith("Works"))
    t_b = sum(x["total"] for x in prog) + len(m4)
    inv("Works count equals qa/CAPABILITIES.md on main (progress.sh + M4)", (w_a, t_a) == (w_b, t_b), f"{w_a}/{t_a} here, {w_b}/{t_b} by progress.sh + M4")
    mono = all(burn["built"][i] <= burn["built"][i + 1] for i in range(len(bdays) - 1))
    fall = None
    if prev and (prev.get("audit") or {}).get("built") is not None and len(built_rows) < prev["audit"]["built"]:
        changed = prev.get("rows") != nrows or (prev.get("audit") or {}).get("checklist_sha") != file_shas.get("MVP-CHECKLIST.md")
        fall = {"from": prev["audit"]["built"], "to": len(built_rows), "day": prev["day"], "explained": changed}
    inv("Cumulative built falls only with a scope or mapping change", mono and (fall is None or fall["explained"]),
        ("built fell from %d (%s) to %d: %s" % (fall["from"], fall["day"], fall["to"], "mapping or scope change line shown" if fall["explained"] else "no scope or mapping change")) if fall else
        "no fall")
    if fall and fall["explained"]:
        notes.append(f"Mapping or scope change: built {fall['from']} on {fall['day']} → {fall['to']} today (the checklist changed)")
    if bl["dupes"]:
        notes.append("Duplicate BACKLOG rows (first kept): " + ", ".join(bl["dupes"]))
    if disagree:
        notes.append("Checklist status and computed built differ on rows " + ", ".join(str(d["map"]) for d in disagree[:20]))

    # ---- reconciliation (§6.5-6.6)
    keys = {"works_on_main": w_a, "works_total": t_a, "changes_per_day_window": Y["value"], "remaining_scope_changes": remaining,
            "built_rows": len(built_rows), "proven_rows": P_["value"], "open_app_prs": len(items), "lanes_working": len(lanes),
            "ready_rows": len(q_rows), "forecast_p50_date": mc["p50"], "forecast_p85_date": mc["p85"],
            "mc_daily_counts": counts, "mc_remaining_scope": remaining}
    trust = reconcile_compare(keys, reconcile_out, reconcile_note)
    trust["invariants"] = invariants
    trust["notes"] = notes
    trust["status_disagreements"] = disagree

    # ---- freshness (§6.8)
    fresh = [{"source": "GitHub data", "age_h": 0.0, "limit_h": FRESH_LIMIT_H["GitHub data"], "note": "snapshot age at publish; the page adds the time since"},
             {"source": "Lead input", "age_h": round(li_age, 1) if li_age is not None else None, "limit_h": FRESH_LIMIT_H["Lead input"]}]

    return {"keys": keys, "trust": trust, "fresh": fresh, "history_line": today_line, "history_prev": prev,
            "pace": {"changes_needed_per_day": X, "changes_per_day": Y, "built": B, "proven": P_,
                     "rows_total": num(nrows, ck_src + ": Build rows", "parsed", L), "remaining": R, "ratio": ratio,
                     "committed_date": committed, "committed_set_on": set_on, "tolerance_days": tol, "light": light,
                     "merged_changes": num(merged_r1, f"Release 1 changes merged so far ({gh_src})", "mixed", L),
                     "scope_note": None if nrows == baseline else f"Scope changed: {nrows} Build rows (baseline {baseline})"},
            "forecast": {"p50": F50, "p85": F85, "sample": sample, "counts": counts, "days": [d.isoformat() for d in days14],
                         "runs": MC_RUNS, "seed": MC_SEED, "cap_days": MC_CAP},
            "burnup": burn, "capacity": capacity, "top3": top3, "org": org, "working_today": working,
            "rows": [{"map": r["map"], "built": r["built"], "proven": r["proven"], "ids": r["ids"]} for r in rows]}


RECON_TOLERANCE_DAYS = {"forecast_p50_date": 1, "forecast_p85_date": 1}


def reconcile_compare(mine, theirs, note):
    """§6.5-6.6: exact agreement on every measured or parsed number; the two forecast dates within ±1 day."""
    if theirs is None:
        return {"state": "not checked", "banner": "Numbers not checked", "reason": note or "the reconciliation did not run", "diffs": [], "compared": 0}
    tn = dict(theirs.get("numbers") or {})
    mi = theirs.get("mc_inputs") or {}
    flat = {k: (v.get("value") if isinstance(v, dict) else v) for k, v in tn.items()}
    if "daily_counts" in mi:
        flat["mc_daily_counts"] = mi["daily_counts"]
    if "remaining_scope" in mi:
        flat["mc_remaining_scope"] = mi["remaining_scope"]
    diffs, n = [], 0
    for k, v in mine.items():
        if k not in flat:
            continue
        n += 1
        o = flat[k]
        if k in RECON_TOLERANCE_DAYS and isinstance(v, str) and isinstance(o, str) and v[:1].isdigit() and o[:1].isdigit():
            if abs((datetime.fromisoformat(v) - datetime.fromisoformat(o)).days) > RECON_TOLERANCE_DAYS[k]:
                diffs.append({"name": k, "board": v, "reconcile": o})
        elif v != o:
            diffs.append({"name": k, "board": v, "reconcile": o})
    if n == 0:
        return {"state": "not checked", "banner": "Numbers not checked", "reason": "the reconciliation gave no number this board knows", "diffs": [], "compared": 0}
    if diffs:
        return {"state": "disagree", "banner": "Numbers disagree: " + ", ".join(d["name"] for d in diffs), "reason": None, "diffs": diffs, "compared": n}
    return {"state": "agree", "banner": None, "reason": None, "diffs": [], "compared": n}


def run_reconcile(snap_dir, script=None):
    """Run tools/cockpit-reconcile.py on the snapshot (a separate process). Returns (output or None, note)."""
    script = script or os.path.join(HERE, "cockpit-reconcile.py")
    if not os.path.exists(script):
        return None, "not checked: tools/cockpit-reconcile.py is absent"
    try:
        r = subprocess.run([sys.executable, "-I", script, snap_dir], capture_output=True, text=True, timeout=600)
    except Exception as e:
        return None, f"not checked: the reconciliation failed to start ({str(e)[:120]})"
    if r.returncode != 0:
        return None, f"not checked: the reconciliation exited {r.returncode} ({(r.stderr or '').strip()[-160:]})"
    try:
        return json.loads(r.stdout), None
    except json.JSONDecodeError:
        return None, "not checked: the reconciliation printed no JSON"


def health(snap, now, comp, li):
    """§5: one light, items 1-7 (item 2, data age, is computed by the page)."""
    meta, ex = snap.meta, snap.meta.get("extra") or {}
    cutoff = now.astimezone(timezone.utc)
    items = []

    def item(i, name, state, detail, action=None, owner=None, cls="measured"):
        items.append({"id": i, "name": name, "state": state, "detail": detail, "action": action if state == "red" else None,
                      "owner": owner if state == "red" else None, "class": cls})
    mc = snap.j("github/main_checks.json")
    ni = snap.j("github/main_nightly.json") or {}
    if mc is None:
        item(1, "main CI", "amber", "not measured: no check runs read for main's head")
    else:
        badc = [c["name"] for c in mc if c.get("conclusion") in ("failure", "timed_out", "action_required", "startup_failure")]
        running = [c["name"] for c in mc if c.get("status") != "completed"]
        if badc or ni.get("conclusion") in ("failure", "timed_out"):
            item(1, "main CI", "red", "failed on main's head: " + ", ".join(badc + (["nightly"] if ni.get("conclusion") in ("failure", "timed_out") else [])),
                 "fix main before anything else merges", "current Lead")
        elif not mc and not ni:
            item(1, "main CI", "amber", "not measured: main's head has no check runs and no nightly run was read")
        elif running:
            item(1, "main CI", "amber", "running on main's head: " + ", ".join(running[:5]))
        else:
            item(1, "main CI", "green", f"{len(mc)} check runs on main's head finished green; newest nightly on main: {ni.get('conclusion') or 'not read'}")
    items.append({"id": 2, "name": "Board data age", "state": "page", "detail": "computed by the page from generated_at: amber at 45 min, red at 2 h",
                  "action": "refresh the board at the next check", "owner": "current Lead", "class": "measured"})
    old = ex.get("state_branch_oldest_unmerged_at")
    n_ahead = ex.get("state_branch_ahead")
    if not ex.get("state_branch") or n_ahead is None:
        item(3, "Records on main", "amber", "not measured: STATE's this branch: line or the git refs could not be read")
    elif n_ahead == 0 or not old:
        item(3, "Records on main", "green", f"{ex['state_branch']} has nothing main lacks")
    else:
        age = (cutoff - parse_iso(old)).total_seconds() / 3600
        item(3, "Records on main", "red" if age > 24 else "green",
             f"{n_ahead} commits on {ex['state_branch']} not on main; oldest {round(age, 1)} h" +
             ("" if ex.get("main_ref_is_head") else " (compared with the local origin/main, older than main's head)"),
             "open the records PR to main", "current Lead")
    gr = snap.j("github/guard_runs.json")
    if not gr:
        item(4, "Guards", "amber", "not measured: no guard runs read")
    else:
        bad_g = [g["name"] for g in gr if g.get("conclusion") not in ("success", None)]
        none_g = [g["name"] for g in gr if g.get("conclusion") is None]
        item(4, "Guards", "red" if bad_g else "amber" if none_g else "green",
             ("failed: " + ", ".join(bad_g)) if bad_g else ("not measured: " + ", ".join(none_g)) if none_g else "label guard and push guard last runs green",
             "restore the guard and re-run it", "current Lead")
    burn = (li or {}).get("burn_pct_per_h")
    li_age = (cutoff - parse_iso(li["as_of"])).total_seconds() / 3600 if li and li.get("as_of") else None
    if burn is None:
        item(5, "Burn", "amber", "not measured: Lead input has no burn_pct_per_h", cls="reported")
    elif li_age is not None and li_age > 2:
        item(5, "Burn", "amber", f"Lead-reported {burn}%/h is {round(li_age, 1)} h old (limit 2 h)", cls="reported")
    else:
        item(5, "Burn", "red" if burn > BURN_LIMIT else "green", f"Lead-reported {burn}% of the weekly plan per hour (limit {BURN_LIMIT})",
             "slow the lanes or stop paid work until burn is under 3%/h", "current Lead", cls="reported")
    caps = parse_caps(snap.text("files_main/qa/CAPABILITIES.md"))
    first = snap.j("git/bug_first_seen.json") or {}
    bugs = [b for b in parse_bugs(snap.file("qa/BUGS.md") or "") if b["open"] and b["sev"] in ("Critical", "Major")
            and any(caps.get(c, {}).get("status", "").startswith("Works") for c in b["caps"])]
    old_b, unk = [], []
    for b in bugs:
        if b["id"] not in first:
            unk.append(b["id"])
        elif (cutoff - parse_iso(first[b["id"]])).total_seconds() / 3600 > BUG_AGE_H:
            old_b.append(b["id"])
    item(6, "Major bugs on Works capabilities", "red" if old_b else "amber" if unk else "green",
         ("older than 48 h: " + ", ".join(old_b)) if old_b else ("age not measured: " + ", ".join(unk)) if unk else
         f"{len(bugs)} open Critical/Major on Works capabilities, none older than 48 h", "fix or re-rate the bug; a Major keeps its capability Partial", "qa lane via the current Lead", cls="parsed")
    tr, cap, org = comp["trust"], comp["capacity"], comp["org"]
    reasons, st7 = [], "green"
    bad_inv = [i["name"] for i in tr["invariants"] if not i["ok"]]
    if tr["state"] == "disagree" or bad_inv:
        st7 = "red"
        reasons += ([tr["banner"]] if tr["state"] == "disagree" else []) + ["invariant broken: " + x for x in bad_inv]
    if tr["state"] == "not checked":
        st7 = "amber" if st7 != "red" else st7
        reasons.append("Numbers not checked: " + re.sub(r"^not checked: ", "", tr.get("reason") or ""))
    if cap["age"]["amber_items"]:
        st7 = "amber" if st7 != "red" else st7
        reasons.append("work items past the age rule: " + ", ".join("#%d" % x for x in cap["age"]["amber_items"]))
    if org["mismatches"]:
        st7 = "amber" if st7 != "red" else st7
        reasons.append("org chart: " + ", ".join(f"{x['name']} ({x['seen']})" for x in org["mismatches"]))
    for f in comp["fresh"]:
        if f["age_h"] is None or f["age_h"] > f["limit_h"]:
            st7 = "amber" if st7 != "red" else st7
            reasons.append(f"{f['source']} " + ("missing" if f["age_h"] is None else f"{f['age_h']} h old (limit {f['limit_h']} h)"))
    item(7, "Data trust, work item age, org chart, freshness", st7, "; ".join(reasons) or "reconciliation agrees, invariants hold, nothing past its limit",
         "read the trust detail; fix the script, the record or the input it names", "current Lead", cls="measured")
    states = [i["state"] for i in items if i["state"] != "page"]
    light = "red" if "red" in states else "amber" if "amber" in states else "green"
    return {"light": light, "items": items, "note": "The page combines this light with item 2 (data age)."}


def lineage_fill(o, L):
    """Legacy blocks (v/src): add sha, as_of and class by their source words, and a reason to every null (§0.3, §6.2)."""
    if isinstance(o, dict):
        if "v" in o and "src" in o:
            s = o["src"] or ""
            cls = ("reported" if "Lead input" in s else "measured" if " on main" in s or "GitHub" in s or "git " in s
                   else "parsed" if re.search(r"\.md|\.json|\.tsv|STATE|BACKLOG|DECISIONS", s) else "measured")
            o.setdefault("class", cls)
            o.setdefault("sha", L[cls][0] or "none")
            o.setdefault("as_of", L[cls][1])
            if o["v"] is None:
                o.setdefault("reason", s or "not measured")
        for v in list(o.values()):
            lineage_fill(v, L)
    elif isinstance(o, list):
        for v in o:
            lineage_fill(v, L)


def validate(data, schema_path):
    import jsonschema
    schema = json.load(open(schema_path, encoding="utf-8"))
    v = jsonschema.Draft202012Validator(schema)
    return [f"{'/'.join(map(str, e.absolute_path)) or '(root)'}: {e.message[:200]}" for e in v.iter_errors(data)][:20]


def read_history(text):
    out = []
    for line in (text or "").splitlines():
        if line.strip():
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                ERRORS.append("history.jsonl: a line is not JSON (kept out)")
    return out


def write_history(path, hist, line):
    """One line per IST day (N1): today's line replaces earlier lines of today; the working copy's other days are kept."""
    cur = read_history(slurp(path)) if os.path.exists(path) else []
    days = {h["day"]: h for h in hist}
    days.update({h["day"]: h for h in cur})
    days[line["day"]] = line
    with open(path + ".tmp", "w", encoding="utf-8") as f:
        for d in sorted(days):
            f.write(json.dumps(days[d], ensure_ascii=False, sort_keys=True) + "\n")
    os.replace(path + ".tmp", path)


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--lead-input")
    ap.add_argument("--flow-max-age-h", type=float, default=6)
    ap.add_argument("--appcode-max", type=int, default=900)
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--snapshot-only", action="store_true", help="take the snapshot (spec §6 1a) into <out folder>/snapshot/ and stop")
    ap.add_argument("--from-snapshot", help="compute from this snapshot folder instead of taking one (fixtures, audits)")
    ap.add_argument("--now", help="ISO time to compute at (tests); default: the snapshot's taken_at when --from-snapshot, else the clock")
    ap.add_argument("--history-file", default=os.path.join(P, "cockpit", "history.jsonl"))
    ap.add_argument("--no-history-write", action="store_true")
    ap.add_argument("--reconcile", help="path of the reconciliation script (default tools/cockpit-reconcile.py)")
    a = ap.parse_args()
    global NOW
    out_dir = os.path.dirname(os.path.abspath(a.out))
    cache = os.path.join(out_dir, "cache")
    os.makedirs(cache, exist_ok=True)
    gh = GH(a.offline)
    # ---- §6 1a: the frozen snapshot first; every §1-§5 and §7 number is computed from it only
    if a.from_snapshot:
        snap_dir = os.path.abspath(a.from_snapshot)
    else:
        snap_dir = os.path.join(out_dir, "snapshot")
        if gh.offline:
            print("cockpit-data: offline and no --from-snapshot: cannot take a snapshot", file=sys.stderr)
            sys.exit(3)
        try:
            take_snapshot(snap_dir, gh, cache, a.lead_input, a.appcode_max)
        except Exception as e:
            print(f"cockpit-data: snapshot failed: {e}", file=sys.stderr)
            sys.exit(3)
        if a.snapshot_only:
            print(f"cockpit-data: snapshot written to {snap_dir} ({gh.calls} API calls, {round(time.time() - T0, 1)} s)")
            return
    snap = Snap(snap_dir)
    if not snap.meta:
        print(f"cockpit-data: {snap_dir} has no meta.json", file=sys.stderr)
        sys.exit(3)
    NOW = parse_iso(a.now).astimezone(timezone.utc) if a.now else (parse_iso(snap.meta["taken_at"]).astimezone(timezone.utc) if a.from_snapshot else NOW)
    if a.lead_input is None and snap.text("lead-input.json") is not None:
        a.lead_input = snap.path("lead-input.json")
    history = read_history(snap.file("cockpit/history.jsonl"))
    rec_out, rec_note = run_reconcile(snap_dir, a.reconcile)
    comp = compute_board(snap, NOW, history, rec_out, rec_note)
    li_snap = snap.j("lead-input.json")
    hl = health(snap, NOW, comp, li_snap)
    branch = sh(["git", "-C", ROOT, "rev-parse", "--abbrev-ref", "HEAD"]).stdout.strip()
    here_sha = sh(["git", "-C", ROOT, "rev-parse", "--short=9", "HEAD"]).stdout.strip()
    copy = f"this copy ({branch} {here_sha})"

    rate0 = safe("rate limit", lambda: gh.get("https://api.github.com/rate_limit")["resources"]["core"], {})
    remaining = rate0.get("remaining", 0)

    # ---- main's head and the qa files on main
    main_sha = (snap.meta.get("main_sha") or "")[:9] or None
    main_c = safe("main head", lambda: gh.get(f"/commits/{snap.meta['main_sha']}")) if not gh.offline else None
    main_at = ts(main_c["commit"]["committer"]["date"]) if main_c else None

    def main_file(rel):
        return gh.get(f"/contents/{REL}/{rel}?ref=main", raw=True)
    cap_text = snap.text("files_main/qa/CAPABILITIES.md")
    cap_src = f"qa/CAPABILITIES.md on main {main_sha} (snapshot) via tools/progress.sh's parse, plus M4 (progress.sh omits it)"
    if cap_text is None:
        cap_text, cap_src = read("qa/CAPABILITIES.md") or "", f"qa/CAPABILITIES.md in {copy} via tools/progress.sh's parse (main not read)"
    built_names = safe("qa/built on main", lambda: [x["name"] for x in gh.get(f"/contents/{REL}/qa/built?ref=main")], None)
    if built_names is None and os.path.isdir(os.path.join(P, "qa/built")):
        built_names = os.listdir(os.path.join(P, "qa/built"))
    prog = run_progress(cap_text, built_names)
    caps = cap_rows(cap_text, built_names)
    m4 = [c for c in caps if c["m"] == "M4"]
    if m4:   # known fix (spec §6 10): progress.sh counts M2, T and M3 only; M4 joins here so Works reads 93/98, not 93/97
        prog.append({"milestone": "M4", "works": sum(1 for c in m4 if c["status"] == "Works"), "total": len(m4),
                     "other": {}})
    works = sum(x["works"] for x in prog)
    works_total = sum(x["total"] for x in prog)
    if works_total and works_total != len(caps):
        ERRORS.append(f"capability grid has {len(caps)} rows but progress.sh + M4 counts {works_total}")
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
    rsha9 = (snap.meta.get("records_sha") or "")[:9]
    copy = f"snapshot of {snap.meta.get('records_branch')} @{rsha9}"
    asks, forf, waitline = state_needs(snap.file("STATE.md") or "")
    st_src = f"STATE.md in {copy}"
    groups, rows, readiness = checklist(snap.file("MVP-CHECKLIST.md") or "")
    ck_src = f"MVP-CHECKLIST.md §A in {copy} (Status column)"
    counts = {s: sum(1 for x in rows if x["status"] == s) for s in ORDER}
    other = len(rows) - sum(counts.values())
    if other:
        counts["Other"] = other
    nrows = len(rows)
    plan = json.loads(snap.file("cockpit/plan.json") or '{"dates": []}')
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
    for x in re.findall(r"\b((?:PF|FO|BK)-[0-9A-Za-z]+) merged", snap.file("MVP-CHECKLIST.md") or ""):
        merged_ids.add(x)
    for p in prs:
        inpr_ids.update(re.findall(idre, p["title"]))
    owners, brows, bylane, xrows = backlog(merged_ids, inpr_ids, text=snap.file("BACKLOG.md") or "")

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
        "schema": 2,
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
    rate1 = safe("rate limit", lambda: gh.get("https://api.github.com/rate_limit")["resources"]["core"], {}) if not gh.offline else {}
    resources["api_left"]["v"] = rate1.get("remaining")
    # ---- A61-A63 blocks (spec §1-§5, §7), all from the snapshot; lineage of every number; trust (§6)
    meta, ex = snap.meta, snap.meta.get("extra") or {}
    fm_fresh = {"source": "flow-measure", "age_h": fm_age, "limit_h": FRESH_LIMIT_H["flow-measure"]}
    if fm_age is None or fm_age > FRESH_LIMIT_H["flow-measure"]:
        it7 = next(i for i in hl["items"] if i["id"] == 7)
        it7["state"] = "amber" if it7["state"] == "green" else it7["state"]
        it7["detail"] += ("; " if it7["detail"] else "") + ("flow-measure not run yet" if fm_age is None else f"flow-measure {fm_age} h old (limit 6 h)")
        hl["light"] = "red" if any(i["state"] == "red" for i in hl["items"]) else "amber" if hl["light"] == "green" else hl["light"]
    L = {"measured": ((meta.get("main_sha") or "")[:9], meta.get("taken_at")), "parsed": ((meta.get("records_sha") or "")[:9], meta.get("taken_at")),
         "reported": ("lead-input " + git_blob_sha(snap.text("lead-input.json"))[:9] if snap.text("lead-input.json") else "no Lead input",
                      (li_snap or {}).get("as_of") or meta.get("taken_at"))}
    data.update({
        "lineage": {"records_branch": meta.get("records_branch"), "records_sha": meta.get("records_sha"), "main_sha": meta.get("main_sha"),
                    "taken_at": meta.get("taken_at"), "snapshot": snap_dir, "repo_path": REL,
                    "ahead_of_main": num(ex.get("records_ahead"), "git rev-list --count main..records (read-only, at snapshot)", "measured", L,
                                         "not measured: main's commit is not in this copy and origin/main could not be read"),
                    "main_ref_is_head": ex.get("main_ref_is_head"), "current_lead": (comp["org"]["leads"] or [{}])[0].get("name")},
        "pace": comp["pace"], "forecast": comp["forecast"], "burnup": comp["burnup"], "capacity": comp["capacity"],
        "top3": comp["top3"], "org": comp["org"], "working_today": comp["working_today"], "health": hl,
        "trust": dict(comp["trust"], freshness=comp["fresh"] + [fm_fresh]),
        "reconcile_keys": comp["keys"], "build_rows": comp["rows"],
        "history": {"file": "cockpit/history.jsonl", "today": comp["history_line"], "previous_day": (comp["history_prev"] or {}).get("day"),
                    "written": not a.no_history_write},
    })
    data["summary"]["health"] = {"light": hl["light"]}
    data["freshness"]["page_age_rule"] = {"amber_min": 45, "red_min": 120, "note": "Health item 2: the page computes the data age (spec §0.5)"}
    lineage_fill(data, L)
    data["run"] = {"seconds": round(time.time() - T0, 1), "api_calls": gh.calls, "errors": ERRORS}
    os.makedirs(out_dir, exist_ok=True)
    errs = validate(data, os.path.join(P, "cockpit", "data.schema.json"))
    if errs:
        bad = a.out + ".invalid.json"
        json.dump(data, open(bad, "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=str)
        print(f"cockpit-data: schema violation, data.json NOT written (see {bad}):", file=sys.stderr)
        for e in errs:
            print("  ", e, file=sys.stderr)
        sys.exit(2)
    tmp = a.out + ".tmp"
    json.dump(data, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=str)
    os.replace(tmp, a.out)
    if not a.no_history_write:
        write_history(a.history_file, read_history(snap.file("cockpit/history.jsonl")), comp["history_line"])
    print(f"cockpit-data: wrote {a.out} in {data['run']['seconds']} s, {gh.calls} API calls, {len(ERRORS)} notes; "
          f"health {hl['light']}; trust {comp['trust']['state']}")
    for e in ERRORS:
        print("  note:", e)


if __name__ == "__main__":
    main()
