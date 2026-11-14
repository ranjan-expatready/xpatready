#!/usr/bin/env python3
"""Independent reconciliation of the founder's progress board (P-596, N-version check).

Written from `cockpit/spec-a61-a62-2026-11-14.md` (draft 3) and the raw record
files only; it never reads `tools/cockpit-data.py` or the page (spec §6 item 5).
Python 3 standard library only. Reads only the frozen snapshot folder (spec §6 1a).

Usage:
  cockpit-reconcile.py <snapshot dir>     prints one JSON object to stdout
  cockpit-reconcile.py --self-test        runs the in-memory self-test

Output: {"version":1,
         "numbers":{<name>:{"value":...,"reason":...}},
         "mc_inputs":{"daily_counts":[14 ints],"remaining_scope":N}}
A number that cannot be computed has value null and a reason. Exit 0 when it
ran; 2 when the snapshot is unreadable (no folder or no meta.json); 1 on a crash.

Snapshot files read (spec §6 1a): meta.json (taken_at, the "now" of every
number), github/pulls.json, github/branches_recent.json, briefs.json,
files/<repo path>/MVP-CHECKLIST.md, files/<repo path>/BACKLOG.md,
files_main/qa/CAPABILITIES.md, git/capabilities_main.jsonl and
git/capabilities_main/<sha>.md (proven only).

Common definitions
------------------
* IST day: a timestamp converted to UTC+05:30, then its calendar date.
  "today" = the IST day of meta.taken_at. Anything merged after taken_at is ignored.
* Title match (spec §1 N2 "title starts with that id"): a PR title matches id X
  when it starts with X, or with "<area>: " then X (area = lower-case word, as
  in "runtime: PF-3 — ..."), and the character after X is not a letter, digit,
  "-" or "." (so "PF-4b" never matches "PF-4").
* App PR: pulls.json entry with files_app true (the app-code rule of
  tools/app-code-prs.sh, applied when the snapshot was taken). "Non-records app
  PR" = app PR.
* Merge date of id X (N2) = IST day of the earliest merged_at among merged app
  PRs whose title matches X. "Merged" for built / scope uses this.
* Build rows: the table rows of MVP-CHECKLIST.md section "## A." (up to "## B.")
  whose first cell is a map number (P-586 baseline: 101).
* Parts of a Build row (§1 B1): ids parsed from its "BACKLOG rows" cell:
  tokens shaped like PF-4, FO-12b, BK-17, B5-filings, PF-L, AUD-1, DB-SPLIT;
  decision ids P-n and bug ids QA-n are dropped; "BK-22 to BK-24" expands to
  BK-22, BK-23, BK-24. qa capability ids such as C6.2 are not BACKLOG ids.
* Shaped Build row: its Status cell does not start with "Not shaped".
* BACKLOG rows: lines of BACKLOG.md starting with "|" whose first cell is an id,
  header or not (first occurrence wins on duplicates).

Numbers and formulas
--------------------
works_on_main (spec §6 4 and 5; §6 10 "93/98"): count of capability rows (id
  C<n>.<n>) in files_main/qa/CAPABILITIES.md whose M column is M2, M3, M4 or T
  and whose Status starts with "Works". Bake (BK-) verdict rows are not counted.
works_total: count of those capability rows with M in {M2, M3, M4, T}.
changes_per_day_window (§1 Pace line Y, N2, M2, principle 4): Release 1
  changes = distinct ids cited in the Build rows' "BACKLOG rows" cells, plus
  every BK- row of BACKLOG.md (the Flags' case-side BK- rows of map rows 77, 80,
  99). Each change counts on its merge date. days_since = today - 13 Nov 2026;
  window w = min(14, days_since) IST days ending today; Y = changes merged in
  the window / w, rounded to 2 decimals. Under 5 days of history -> null
  ("a rate needs at least 5 days").
remaining_scope_changes (§1 C1): distinct unmerged parts over all shaped Build
  rows + sum over not-shaped Build rows of max(0, 3 - merged parts of that row).
built_rows (§1 B1): Build rows that are shaped, have at least one part, and
  whose every part has a merge date (built date = latest of them).
proven_rows (§1 B1, §9): needs a machine-readable qa id column in the
  checklist's Build tables (a header cell containing "qa"); absent -> null. When
  present: a row is proven when its qa ids (C<n>.<n>) all read Works in some
  main commit of qa/CAPABILITIES.md (git/capabilities_main history, then
  files_main); proven date = the first such commit.
open_app_prs (§2 WIP): pulls with state "open" and files_app true (drafts included).
lanes_working (§2 L, P-326): branches in github/branches_recent.json with
  pushed_at within 90 minutes before taken_at, excluding main and merge-queue
  bot branches (mergify/*, gh-readonly-queue/*).
ready_rows (§2 Q, R2-3): BACKLOG rows that have a brief in briefs.json, are
  not merged (no merged PR of any kind whose title matches the id), are not in
  a PR (no open PR whose title matches, drafts included), and wait on nothing
  unmerged (every id in the row's "waits on:" list up to "·" or "decisions" is
  merged). value = Q; detail = [{row, brief}].
forecast_p50_date / forecast_p85_date (§1 Forecast, M2, R2-B1 (b)):
  daily_counts = 14 counts for the 14 IST days ending today (oldest first).
  From 5 days of Release 1 history (days_since >= 5) they are Release 1
  changes per day; before that, the reference class: distinct row ids first
  merged that day across all app PRs (leading id of the title; a title with no
  id counts as itself). Monte Carlo: 10,000 runs, seed 59614 (this script's own),
  each simulated day draws one of the 14 counts (random.choice) and subtracts it
  from remaining scope until it is <= 0; a run is capped at 365 days. Run
  length d -> date today + d. p50 / p85 = the run lengths at sorted index
  ceil(0.50 N) - 1 and ceil(0.85 N) - 1. Zero guard: counts sum to 0 -> null
  "not measured: no merges in 14 days". A percentile run at the cap -> value
  "beyond 1 year". Remaining scope 0 -> today.

Ambiguities (most literal reading taken; listed in the report)
-------------------------------------------------------------
A1 "title starts with that id": real titles start with "<area>: "; the area
   prefix is allowed, nothing else. Base branch is not checked.
A2 "plus the BK- rows its Flags tie to map rows 77, 80, 99": the Flags line
   names no ids, so every BK- row of BACKLOG.md counts as a change; only the
   ids in the "BACKLOG rows" cells count as parts for built and scope.
A3 Built for a row with no parsed BACKLOG part (e.g. map 74, 76, 84, 101 whose
   cells cite only qa ids or "built (map)"): no part, no built date -> not built.
A4 Shaped is read from the checklist's Status cell (parsed, hand-kept), not
   recomputed from BACKLOG Done-when cells.
A5 C1 "minus parts of those rows already merged (floor 0)": applied per
   not-shaped row; unmerged parts of shaped rows counted once across rows.
A6 Window and days: days_since = today - 13 Nov (so 5 days on 18 Nov,
   "~18 Nov"); the window and the 14 MC days end today, today included.
A7 "all app-code row merges" (reference class): distinct leading title ids per
   IST day, first merge only; titles without an id count one each.
A8 Y under 5 days is null (principle 4) even though the window is defined.
A9 Lanes: bot merge-queue branches and main excluded; open PRs add nothing
   (pulls.json has no push time).
A10 Ready rows: "merged" counts any merged PR (records rows such as PF-2 merge
   without app code); "in a PR" includes drafts; ready is not limited to
   Release 1 rows.
A11 Snapshot "files/<repo path>": the file is found by its path suffix
   (MVP-CHECKLIST.md, BACKLOG.md), whatever prefix the repo path has.
A12 briefs.json format not given: accepts {"ROW": "path"}, {"ROW": ["path"]}
   or a list of {"row"|"id": ..., "path": ...}.
A13 Percentile: nearest-rank (index ceil(pN) - 1); forecast dates agree with
   the board only within ±1 day by design (§6 5).
"""

import datetime as dt
import json
import math
import os
import random
import re
import sys

IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
R1_START = dt.date(2026, 11, 13)
MC_RUNS = 10000
MC_SEED = 59614
MC_CAP = 365
MIN_HISTORY_DAYS = 5
WINDOW_DAYS = 14
LANE_MINUTES = 90
UNSHAPED_FACTOR = 3
TRACKED_M = ("M2", "M3", "M4", "T")

ID_RE = re.compile(r"(?<![A-Za-z0-9.\-])([A-Z][A-Z0-9]*-[A-Za-z0-9]+)(?![A-Za-z0-9\-])")
RANGE_RE = re.compile(r"\b([A-Z][A-Z0-9]*)-(\d+)\s+to\s+\1-(\d+)\b")
CAP_ID_RE = re.compile(r"\bC\d+\.\d+\b")
AREA_RE = re.compile(r"^[a-z][a-z0-9_-]*:\s*")
LEAD_ID_RE = re.compile(r"^([A-Z][A-Za-z0-9]*(?:[-.][A-Za-z0-9]+)+)")


class SnapshotError(Exception):
    pass


# ---------------------------------------------------------------- snapshot access
class Snapshot:
    """Read-only view of a snapshot folder, or of an in-memory {path: text} dict."""

    def __init__(self, root=None, mem=None):
        self.root = root
        self.mem = mem

    def paths(self):
        if self.mem is not None:
            return sorted(self.mem)
        out = []
        for d, _, files in os.walk(self.root):
            for f in files:
                out.append(os.path.relpath(os.path.join(d, f), self.root).replace(os.sep, "/"))
        return sorted(out)

    def text(self, rel):
        if self.mem is not None:
            return self.mem.get(rel)
        p = os.path.join(self.root, rel)
        if not os.path.isfile(p):
            return None
        with open(p, encoding="utf-8") as fh:
            return fh.read()

    def json(self, rel):
        t = self.text(rel)
        return None if t is None else json.loads(t)

    def find(self, prefix, suffix):
        """First (shortest) path under prefix ending with /suffix (A11)."""
        cands = [p for p in self.paths()
                 if p.startswith(prefix) and (p == prefix + suffix or p.endswith("/" + suffix))]
        cands.sort(key=lambda p: (len(p), p))
        return cands[0] if cands else None


# ---------------------------------------------------------------- helpers
def parse_ts(s):
    if not s:
        return None
    s = s.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    t = dt.datetime.fromisoformat(s)
    if t.tzinfo is None:
        t = t.replace(tzinfo=dt.timezone.utc)
    return t


def ist_day(t):
    return t.astimezone(IST).date()


def num(value, reason, **extra):
    d = {"value": value, "reason": reason}
    d.update(extra)
    return d


def cells(line):
    s = line.strip()
    if not s.startswith("|"):
        return None
    parts = [c.strip() for c in s.strip("|").split("|")]
    return parts


def clean(cell):
    return cell.replace("**", "").replace("`", "").strip()


def is_sep(cs):
    return all(re.fullmatch(r":?-{2,}:?", c.replace(" ", "")) for c in cs if c != "")


def tables(text):
    """Yield (header cells, [row cells]) for each markdown table, with the line's section."""
    lines = text.splitlines()
    i = 0
    section = ""
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("## "):
            section = ln
        cs = cells(ln)
        if cs is not None and i + 1 < len(lines):
            sep = cells(lines[i + 1])
            if sep is not None and is_sep(sep):
                header = [clean(c) for c in cs]
                rows = []
                j = i + 2
                while j < len(lines):
                    rc = cells(lines[j])
                    if rc is None:
                        break
                    rows.append(rc)
                    j += 1
                yield section, header, rows
                i = j
                continue
        i += 1


def title_matches(title, rid):
    t = (title or "").strip()
    for cand in (t, AREA_RE.sub("", t, count=1)):
        if cand.startswith(rid):
            nxt = cand[len(rid):len(rid) + 1]
            if nxt == "" or not (nxt.isalnum() or nxt in "-."):
                return True
    return False


def leading_id(title):
    t = AREA_RE.sub("", (title or "").strip(), count=1)
    m = LEAD_ID_RE.match(t)
    return m.group(1) if m else None


def parse_part_ids(cell):
    txt = clean(cell)
    ids = []
    for m in RANGE_RE.finditer(txt):
        pre, a, b = m.group(1), int(m.group(2)), int(m.group(3))
        if a <= b and b - a < 100:
            ids.extend("%s-%d" % (pre, k) for k in range(a, b + 1))
    for m in ID_RE.finditer(txt):
        ids.append(m.group(1))
    out = []
    for x in ids:
        if re.fullmatch(r"(P|QA)-\d+", x):
            continue
        if x not in out:
            out.append(x)
    return out


# ---------------------------------------------------------------- parsers
def parse_checklist(text):
    """Build rows of section A: list of dicts {map, parts, status, qa_ids}; plus has_qa_col."""
    rows = []
    has_qa = False
    in_a = False
    lines = text.splitlines()
    sect_text = []
    for ln in lines:
        if ln.startswith("## "):
            in_a = ln.startswith("## A.")
        if in_a:
            sect_text.append(ln)
    for _, header, body in tables("\n".join(sect_text)):
        low = [h.lower() for h in header]
        if "backlog rows" not in low or "status" not in low:
            continue
        bi, si = low.index("backlog rows"), low.index("status")
        qi = next((k for k, h in enumerate(low) if "qa" in h), None)
        if qi is not None:
            has_qa = True
        for rc in body:
            if not rc or not re.fullmatch(r"\d+", clean(rc[0])):
                continue
            rows.append({
                "map": clean(rc[0]),
                "parts": parse_part_ids(rc[bi]) if bi < len(rc) else [],
                "status": clean(rc[si]) if si < len(rc) else "",
                "qa_ids": CAP_ID_RE.findall(rc[qi]) if qi is not None and qi < len(rc) else [],
            })
    return rows, has_qa


def parse_backlog(text):
    """{id: row text} for every table line whose first cell is an id (with or without a header
    right above it: BACKLOG continues tables after bullet lines); first occurrence wins."""
    out = {}
    for ln in text.splitlines():
        rc = cells(ln)
        if rc:
            rid = clean(rc[0])
            if not re.fullmatch(r"[A-Z][A-Za-z0-9]*(?:[-.][A-Za-z0-9]+)*", rid) or rid in ("Row",):
                continue
            if re.fullmatch(r"\d+", rid):
                continue
            if rid not in out:
                out[rid] = "|".join(rc)
    return out


def waits_on(row_text):
    m = re.search(r"waits on:?\**\s*(.*)", row_text, flags=re.I)
    if not m:
        return []
    seg = re.split(r"·|decisions", m.group(1), maxsplit=1)[0]
    return parse_part_ids(seg)


def parse_capabilities(text):
    """{cap id: (M, status)} for capability rows C<n>.<n> of the table with M and Status columns."""
    out = {}
    if text is None:
        return out
    for _, header, body in tables(text):
        low = [h.lower() for h in header]
        if "m" not in low or "status" not in low:
            continue
        mi, si = low.index("m"), low.index("status")
        for rc in body:
            cid = clean(rc[0]) if rc else ""
            if not re.fullmatch(r"C\d+\.\d+", cid) or cid in out:
                continue
            out[cid] = (clean(rc[mi]) if mi < len(rc) else "", clean(rc[si]) if si < len(rc) else "")
    return out


def reads_works(status):
    return bool(re.match(r"Works(?![A-Za-z])", status or ""))


def load_briefs(obj):
    out = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, list):
                v = v[0] if v else None
            elif isinstance(v, dict):
                v = v.get("path")
            if v:
                out[str(k)] = str(v)
    elif isinstance(obj, list):
        for e in obj:
            if isinstance(e, dict):
                rid = e.get("row") or e.get("id")
                if rid and e.get("path"):
                    out.setdefault(str(rid), str(e["path"]))
    return out


# ---------------------------------------------------------------- Monte Carlo
def monte_carlo(counts, remaining, today, seed=MC_SEED, runs=MC_RUNS, cap=MC_CAP):
    """Returns (p50, p85) as values: ISO date strings, "beyond 1 year", or None with reason."""
    if remaining is None or counts is None:
        return None, None, "not measured: Monte Carlo inputs missing"
    if remaining <= 0:
        d = today.isoformat()
        return d, d, "remaining scope is 0"
    if sum(counts) == 0:
        return None, None, "not measured: no merges in 14 days"
    rng = random.Random(seed)
    lengths = []
    for _ in range(runs):
        left = remaining
        days = 0
        while left > 0 and days < cap:
            days += 1
            left -= rng.choice(counts)
        lengths.append(days if left <= 0 else cap + 1)
    lengths.sort()

    def pick(p):
        d = lengths[math.ceil(p * runs) - 1]
        return "beyond 1 year" if d > cap else (today + dt.timedelta(days=d)).isoformat()

    return pick(0.50), pick(0.85), "Monte Carlo %d runs, seed %d, cap %d days" % (runs, seed, cap)


# ---------------------------------------------------------------- main computation
def compute(snap):
    meta = snap.json("meta.json")
    if not isinstance(meta, dict) or not meta.get("taken_at"):
        raise SnapshotError("meta.json missing or has no taken_at")
    now = parse_ts(meta["taken_at"])
    today = ist_day(now)
    N = {}

    # --- inputs
    def safe_json(rel):
        try:
            return snap.json(rel), None
        except (ValueError, OSError) as e:
            return None, "%s unreadable: %s" % (rel, e)

    pulls, pulls_err = safe_json("github/pulls.json")
    if pulls is not None and not isinstance(pulls, list):
        pulls, pulls_err = None, "github/pulls.json is not a list"
    if pulls is None and not pulls_err:
        pulls_err = "github/pulls.json missing"
    branches, br_err = safe_json("github/branches_recent.json")
    if branches is None and not br_err:
        br_err = "github/branches_recent.json missing"
    briefs_raw, briefs_err = safe_json("briefs.json")
    if briefs_raw is None and not briefs_err:
        briefs_err = "briefs.json missing"

    ck_path = snap.find("files/", "MVP-CHECKLIST.md")
    bl_path = snap.find("files/", "BACKLOG.md")
    cap_path = "files_main/qa/CAPABILITIES.md" if snap.text("files_main/qa/CAPABILITIES.md") is not None \
        else snap.find("files_main/", "qa/CAPABILITIES.md")
    ck_text = snap.text(ck_path) if ck_path else None
    bl_text = snap.text(bl_path) if bl_path else None
    cap_text = snap.text(cap_path) if cap_path else None

    # --- Works on main
    if cap_text is None:
        for k in ("works_on_main", "works_total"):
            N[k] = num(None, "not measured: files_main/qa/CAPABILITIES.md missing from the snapshot")
    else:
        caps = parse_capabilities(cap_text)
        tracked = {k: v for k, v in caps.items() if v[0] in TRACKED_M}
        works = sum(1 for v in tracked.values() if reads_works(v[1]))
        by_m = {m: (sum(1 for v in tracked.values() if v[0] == m and reads_works(v[1])),
                    sum(1 for v in tracked.values() if v[0] == m)) for m in TRACKED_M}
        detail = ", ".join("%s %d/%d" % (m, a, b) for m, (a, b) in by_m.items())
        N["works_on_main"] = num(works, "C rows with M in M2/M3/M4/T reading Works on main (%s)" % detail)
        N["works_total"] = num(len(tracked), "C rows with M in M2/M3/M4/T on main")

    # --- PR indexes
    merged_app, merged_any, open_prs = [], [], []
    if pulls is not None:
        for p in pulls:
            mt = parse_ts(p.get("merged_at"))
            if mt is not None and mt <= now:
                merged_any.append((mt, p))
                if p.get("files_app") is True:
                    merged_app.append((mt, p))
            elif (p.get("state") or "").lower() == "open":
                open_prs.append(p)
        merged_app.sort(key=lambda x: (x[0], x[1].get("number", 0)))
        merged_any.sort(key=lambda x: (x[0], x[1].get("number", 0)))

    def first_merge(rid, pool):
        for mt, p in pool:
            if title_matches(p.get("title"), rid):
                return ist_day(mt)
        return None

    def in_open_pr(rid):
        return any(title_matches(p.get("title"), rid) for p in open_prs)

    # --- open app PRs
    if pulls is None:
        N["open_app_prs"] = num(None, "not measured: " + pulls_err)
    else:
        N["open_app_prs"] = num(sum(1 for p in open_prs if p.get("files_app") is True),
                                "pulls with state open and files_app true (drafts included)")

    # --- lanes working
    if not isinstance(branches, list):
        N["lanes_working"] = num(None, "not measured: " + (br_err or "branches_recent.json is not a list"))
    else:
        cut = now - dt.timedelta(minutes=LANE_MINUTES)
        names = sorted({b.get("name") for b in branches
                        if b.get("name") and b.get("name") != "main"
                        and not b["name"].startswith(("mergify/", "gh-readonly-queue/"))
                        and parse_ts(b.get("pushed_at")) is not None
                        and cut <= parse_ts(b["pushed_at"]) <= now})
        N["lanes_working"] = num(len(names), "branches (not main, not merge-queue bots) pushed in the last %d min"
                                 % LANE_MINUTES, detail=names)

    # --- checklist-based numbers
    days_since = (today - R1_START).days
    rows, has_qa = (parse_checklist(ck_text) if ck_text is not None else ([], False))
    backlog = parse_backlog(bl_text) if bl_text is not None else None
    missing = []
    if ck_text is None:
        missing.append("MVP-CHECKLIST.md")
    if pulls is None:
        missing.append("github/pulls.json")

    remaining = None
    r1_counts = None
    if missing:
        why = "not measured: %s missing from the snapshot" % ", ".join(missing)
        for k in ("built_rows", "remaining_scope_changes", "changes_per_day_window"):
            N[k] = num(None, why)
    else:
        merge_date = {}

        def md(rid):
            if rid not in merge_date:
                merge_date[rid] = first_merge(rid, merged_app)
            return merge_date[rid]

        shaped = [r for r in rows if not r["status"].lower().startswith("not shaped")]
        unshaped = [r for r in rows if r["status"].lower().startswith("not shaped")]

        built = []
        for r in shaped:
            if r["parts"] and all(md(x) for x in r["parts"]):
                built.append((r["map"], max(md(x) for x in r["parts"]).isoformat()))
        N["built_rows"] = num(len(built), "shaped Build rows with every BACKLOG part merged by an app PR (%d Build rows)"
                              % len(rows), detail=[{"map": m, "built": d} for m, d in built])

        unmerged_shaped = sorted({x for r in shaped for x in r["parts"] if md(x) is None})
        unshaped_sum = sum(max(0, UNSHAPED_FACTOR - sum(1 for x in r["parts"] if md(x))) for r in unshaped)
        remaining = len(unmerged_shaped) + unshaped_sum
        N["remaining_scope_changes"] = num(
            remaining, "%d unmerged parts of %d shaped rows + estimate: %d unshaped capabilities x 3 less merged parts (%d)"
            % (len(unmerged_shaped), len(shaped), len(unshaped), unshaped_sum))

        r1_ids = {x for r in rows for x in r["parts"]}
        if backlog is not None:
            r1_ids |= {k for k in backlog if k.startswith("BK-")}
        per_day = {}
        for rid in r1_ids:
            d = md(rid)
            if d is not None:
                per_day[d] = per_day.get(d, 0) + 1
        days14 = [today - dt.timedelta(days=WINDOW_DAYS - 1 - k) for k in range(WINDOW_DAYS)]
        r1_counts = [per_day.get(d, 0) for d in days14]
        w = min(WINDOW_DAYS, days_since)
        in_window = sum(r1_counts[WINDOW_DAYS - w:]) if w > 0 else 0
        if days_since < MIN_HISTORY_DAYS or w <= 0:
            N["changes_per_day_window"] = num(
                None, "not measured: %d day(s) of Release 1 history, a rate needs 5 (%d changes merged in the window)"
                % (max(days_since, 0), in_window))
        else:
            N["changes_per_day_window"] = num(round(in_window / w, 2), "%d Release 1 changes merged in the last %d IST days / %d"
                                              % (in_window, w, w))
        if backlog is None:
            N["changes_per_day_window"]["reason"] += "; BACKLOG.md missing, BK- rows not added"

    # --- proven
    if ck_text is None:
        N["proven_rows"] = num(None, "not measured: MVP-CHECKLIST.md missing from the snapshot")
    elif not has_qa:
        N["proven_rows"] = num(None, "not measured: the checklist has no machine-readable qa id column yet (spec §1 B1, §9)")
    else:
        history = []
        hist_text = snap.text("git/capabilities_main.jsonl") or ""
        for ln in hist_text.splitlines():
            if ln.strip():
                e = json.loads(ln)
                t = snap.text("git/capabilities_main/%s.md" % e.get("sha"))
                if t is not None and parse_ts(e.get("date")):
                    history.append((parse_ts(e["date"]), parse_capabilities(t)))
        if cap_text is not None:
            history.append((now, parse_capabilities(cap_text)))
        history.sort(key=lambda x: x[0])
        proven = []
        for r in rows:
            if not r["qa_ids"]:
                continue
            for when, caps in history:
                if all(reads_works(caps.get(c, ("", ""))[1]) for c in r["qa_ids"]):
                    proven.append({"map": r["map"], "proven": ist_day(when).isoformat()})
                    break
        N["proven_rows"] = num(len(proven), "Build rows whose qa ids all read Works in a main commit of qa/CAPABILITIES.md",
                               detail=proven)

    # --- ready rows
    if backlog is None or pulls is None or briefs_raw is None:
        why = [m for m, ok in (("BACKLOG.md", backlog is not None), ("github/pulls.json", pulls is not None),
                               ("briefs.json", briefs_raw is not None)) if not ok]
        N["ready_rows"] = num(None, "not measured: %s missing or unreadable" % ", ".join(why))
    else:
        briefs = load_briefs(briefs_raw)

        def merged_any_id(rid):
            return first_merge(rid, merged_any) is not None

        ready = []
        for rid in sorted(briefs):
            if rid not in backlog or merged_any_id(rid) or in_open_pr(rid):
                continue
            if all(merged_any_id(x) for x in waits_on(backlog[rid])):
                ready.append({"row": rid, "brief": briefs[rid]})
        N["ready_rows"] = num(len(ready), "BACKLOG rows with a brief, not merged, not in a PR, waiting on nothing unmerged",
                              detail=ready)

    # --- Monte Carlo inputs
    if pulls is None:
        counts, label = None, "pulls missing"
    elif days_since >= MIN_HISTORY_DAYS and r1_counts is not None:
        counts, label = r1_counts, "Release 1 changes per IST day"
    else:
        seen = set()
        per_day = {}
        for mt, p in merged_app:
            lid = leading_id(p.get("title")) or ("#%s" % p.get("number"))
            if lid in seen:
                continue
            seen.add(lid)
            d = ist_day(mt)
            per_day[d] = per_day.get(d, 0) + 1
        days14 = [today - dt.timedelta(days=WINDOW_DAYS - 1 - k) for k in range(WINDOW_DAYS)]
        counts = [per_day.get(d, 0) for d in days14]
        label = "reference class: all app rows, not only Release 1"
    p50, p85, why = monte_carlo(counts, remaining, today)
    N["forecast_p50_date"] = num(p50, "%s; %s" % (why, label))
    N["forecast_p85_date"] = num(p85, "%s; %s" % (why, label))

    order = ["works_on_main", "works_total", "changes_per_day_window", "remaining_scope_changes", "built_rows",
             "proven_rows", "open_app_prs", "lanes_working", "ready_rows", "forecast_p50_date", "forecast_p85_date"]
    return {"version": 1,
            "numbers": {k: N[k] for k in order},
            "mc_inputs": {"daily_counts": counts, "remaining_scope": remaining, "sample": label}}


# ---------------------------------------------------------------- self-test
def _fixture(taken_at, checklist=None, extra=None):
    ck = checklist or (
        "# MVP checklist\n\n## A. Scope to build\n\n### A. Foundations\n"
        "| Map | Capability | Module | BACKLOG rows | Status |\n|---|---|---|---|---|\n"
        "| 1 | One | Platform | PF-1, PF-2 | Merged |\n"
        "| 2 | Two | Platform | PF-3 (In PR #10) | Shaped |\n"
        "| 3 | Three | Platform | PF-4 named only (P-561) | Not shaped |\n"
        "| 4 | Four | Case side | C6.2 Works; BK-1 to BK-2 | Merged |\n"
        "| 5 | Five | Not named | **none yet** | Not shaped (**gap**) |\n\n"
        "## B. Done for one row\n| Map | x | y | BACKLOG rows | Status |\n|---|---|---|---|---|\n"
        "| 9 | Not a Build row | z | PF-9 | Shaped |\n")
    bl = ("# Backlog\n\n| Row | Area | What | Done when | Decisions |\n|---|---|---|---|---|\n"
          "| BK-1 | forms | a | b | c |\n| BK-2 | forms | a | b | c |\n| BK-3 | forms | a | b | c |\n\n"
          "| # | Area | Item | Done when | Source · waits on · decisions |\n|---|---|---|---|---|\n"
          "| PF-1 | screens | a | b | **waits on:** nothing · decisions: none |\n"
          "| PF-2 | records | a | b | x |\n"
          "| PF-3 | schema | a | b | **waits on:** PF-1 · decisions: none |\n"
          "| PF-4 | api | a | b | **waits on:** nothing |\n"
          "| PF-5 | api | a | b | **waits on:** PF-3 · decisions: none |\n"
          "| PF-6 | api | a | b | **waits on:** PF-3, PF-1 · decisions: none |\n"
          "| PF-7 | api | a | b | **waits on:** PF-2 (P-500) · decisions: PF-3 later |\n"
          "| PF-1 | dup | a | b | **waits on:** PF-9 |\n")
    cap = ("# Capabilities\n\n| # | Step | Capability | M | Status | Tested on | Evidence |\n|---|---|---|---|---|---|---|\n"
           "| C1.1 | 1 | a | M2 | Works | x | y |\n| C1.2 | 1 | a | M2 | Partial | x | y |\n"
           "| C2.1 | 2 | a | M3 | Works | x | y |\n| C3.1 | 3 | a | M4 | Not built | x | y |\n"
           "| C4.1 | 4 | a | T | Works | x | y |\n| C5.1 | 5 | a | Parked | Works | x | y |\n\n"
           "| Row | Bake | What | Status | Tested on | Evidence |\n|---|---|---|---|---|---|\n"
           "| BK-13 | b | w | Works | x | y |\n")

    def pr(n, title, state, merged=None, app=True, draft=False, ref="b"):
        return {"number": n, "title": title, "state": state, "draft": draft, "created_at": "2026-11-01T00:00:00Z",
                "merged_at": merged, "closed_at": merged, "labels": [], "head": {"ref": ref, "sha": "x"},
                "base": {"ref": "main"}, "files_app": app}

    pulls = [
        pr(1, "screens: PF-1 — x", "closed", "2026-11-14T10:00:00Z"),
        pr(2, "runtime: PF-2 — y", "closed", "2026-11-19T20:00:00Z"),
        pr(3, "PF-2 — again", "closed", "2026-11-19T21:00:00Z"),
        pr(4, "runtime: PF-3 — z", "open", ref="b-pf3"),
        pr(5, "lead: records", "closed", "2026-11-18T05:00:00Z", app=False),
        pr(6, "forms: BK-1 step 1", "closed", "2026-11-10T05:00:00Z"),
        pr(7, "forms: BK-2 — a", "closed", "2026-11-16T04:00:00Z"),
        pr(8, "forms: BK-3 — b", "closed", "2026-11-16T19:00:00Z"),
        pr(9, "runtime: PF-4b — c", "closed", "2026-11-17T04:00:00Z"),
        pr(10, "runtime: PF-5 — draft", "open", draft=True),
        pr(11, "runtime: PF-3 — old attempt", "closed", None),
    ]
    branches = [{"name": "b-pf3", "sha": "1", "pushed_at": "2026-11-20T06:00:00Z"},
                {"name": "b-old", "sha": "2", "pushed_at": "2026-11-20T04:00:00Z"},
                {"name": "main", "sha": "3", "pushed_at": "2026-11-20T06:20:00Z"},
                {"name": "mergify/merge-queue/x", "sha": "4", "pushed_at": "2026-11-20T06:25:00Z"},
                {"name": "b-lead", "sha": "5", "pushed_at": "2026-11-20T05:01:00Z"}]
    briefs = {"PF-1": "design/briefs/PF-1.md", "PF-3": "design/briefs/PF-3.md", "PF-4": "lead-b-briefs/PF-4-a.md",
              "PF-5": "design/briefs/PF-5.md", "PF-6": "design/briefs/PF-6.md", "PF-7": "design/briefs/PF-7.md",
              "ZZ-1": "design/briefs/ZZ-1.md"}
    P = "files/ai-workers/problem-1-pathway-setup-and-form-filling/product/"
    mem = {"meta.json": json.dumps({"taken_at": taken_at, "repo": "o/r", "main_sha": "m", "records_branch": "lead/x",
                                    "records_sha": "r"}),
           "github/pulls.json": json.dumps(pulls), "github/branches_recent.json": json.dumps(branches),
           "briefs.json": json.dumps(briefs), P + "MVP-CHECKLIST.md": ck, P + "BACKLOG.md": bl,
           "files_main/qa/CAPABILITIES.md": cap}
    mem.update(extra or {})
    return mem


def self_test():
    fails = []

    def eq(label, got, want):
        if got != want:
            fails.append("%s: got %r, want %r" % (label, got, want))

    # Case 1: 20 Nov 12:00 IST (06:30Z), 7 days of Release 1 history.
    out = compute(Snapshot(mem=_fixture("2026-11-20T12:00:00+05:30")))
    n = out["numbers"]
    v = {k: n[k]["value"] for k in n}
    eq("works_on_main", v["works_on_main"], 3)            # C1.1, C2.1, C4.1 (C5.1 Parked, BK-13 not a C row)
    eq("works_total", v["works_total"], 5)                # C1.1 C1.2 C2.1 C3.1 C4.1
    # R1 ids: PF-1 PF-2 PF-3 PF-4 BK-1 BK-2 (+BK-3 from BACKLOG). First app merges, IST days:
    # BK-1 10 Nov, PF-1 14 Nov, BK-2 16 Nov, BK-3 17 Nov (00:30 IST), PF-2 20 Nov (01:30 IST). PF-4b is not PF-4.
    eq("daily_counts", out["mc_inputs"]["daily_counts"], [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1])
    eq("changes_per_day_window", v["changes_per_day_window"], 0.57)  # 4 in 14-20 Nov / 7
    eq("built_rows", v["built_rows"], 2)                  # map 1 (PF-1, PF-2) and map 4 (BK-1, BK-2)
    eq("remaining_scope_changes", v["remaining_scope_changes"], 7)  # PF-3 + 3 (map 3) + 3 (map 5)
    eq("proven_rows", v["proven_rows"], None)             # no qa id column
    eq("open_app_prs", v["open_app_prs"], 2)              # #4 and draft #10
    eq("lanes_working", v["lanes_working"], 2)            # b-pf3 (30 min), b-lead (89 min)
    eq("ready_rows", v["ready_rows"], 2)                  # PF-4 (nothing), PF-7 (PF-2 merged)
    eq("ready detail", [r["row"] for r in n["ready_rows"]["detail"]], ["PF-4", "PF-7"])
    eq("mc remaining", out["mc_inputs"]["remaining_scope"], 7)
    p50, p85 = v["forecast_p50_date"], v["forecast_p85_date"]
    if not (isinstance(p50, str) and isinstance(p85, str) and "2026-11-20" < p50 <= p85):
        fails.append("forecast ordering: %r %r" % (p50, p85))
    eq("forecast repeatable", compute(Snapshot(mem=_fixture("2026-11-20T12:00:00+05:30")))["numbers"]
       ["forecast_p50_date"]["value"], p50)

    # Case 2: 15 Nov 12:00 IST, 2 days of history -> reference class, no rate.
    out2 = compute(Snapshot(mem=_fixture("2026-11-15T12:00:00+05:30")))
    eq("ref class counts", out2["mc_inputs"]["daily_counts"], [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0])
    eq("ref class label", out2["mc_inputs"]["sample"], "reference class: all app rows, not only Release 1")
    eq("Y under 5 days", out2["numbers"]["changes_per_day_window"]["value"], None)
    eq("remaining on 15 Nov", out2["mc_inputs"]["remaining_scope"], 9)  # PF-2, PF-3, BK-2 unmerged (3) + 3 + 3

    # Case 3: Monte Carlo by hand.
    today = dt.date(2026, 11, 20)
    eq("mc constant", monte_carlo([2] * 14, 7, today)[:2], ("2026-11-24", "2026-11-24"))  # 2/day, 7 -> 4 days
    eq("mc zero guard", monte_carlo([0] * 14, 7, today)[:2], (None, None))
    eq("mc cap", monte_carlo([0] * 13 + [1], 10000, today)[:2], ("beyond 1 year", "beyond 1 year"))
    eq("mc done", monte_carlo([1] * 14, 0, today)[:2], ("2026-11-20", "2026-11-20"))

    # Case 4: qa id column -> proven from main history.
    ck = ("## A. Scope\n| Map | Capability | Module | BACKLOG rows | qa id | Status |\n|---|---|---|---|---|---|\n"
          "| 1 | One | P | PF-1 | C1.2 | Merged |\n| 2 | Two | P | PF-3 | C1.1 | Shaped |\n"
          "| 3 | Three | P | PF-2 | | Merged |\n## B. x\n")
    hist = {"git/capabilities_main.jsonl": json.dumps({"sha": "aaa", "date": "2026-11-15T03:00:00Z"}) + "\n",
            "git/capabilities_main/aaa.md": "| # | M | Status |\n|---|---|---|\n| C1.1 | M2 | Works |\n| C1.2 | M2 | Works |\n"}
    out4 = compute(Snapshot(mem=_fixture("2026-11-20T12:00:00+05:30", checklist=ck, extra=hist)))
    eq("proven_rows", out4["numbers"]["proven_rows"]["value"], 2)   # both read Works on 15 Nov (C1.2 later Partial)
    eq("proven dates", [d["proven"] for d in out4["numbers"]["proven_rows"]["detail"]], ["2026-11-15", "2026-11-15"])

    # Case 5: unreadable snapshot.
    try:
        compute(Snapshot(mem={}))
        fails.append("empty snapshot did not raise")
    except SnapshotError:
        pass

    for f in fails:
        print("FAIL " + f, file=sys.stderr)
    print("self-test: %d failure(s)" % len(fails), file=sys.stderr)
    return 1 if fails else 0


def main(argv):
    if len(argv) == 2 and argv[1] == "--self-test":
        return self_test()
    if len(argv) != 2:
        print("usage: cockpit-reconcile.py <snapshot dir> | --self-test", file=sys.stderr)
        return 2
    root = argv[1]
    if not os.path.isdir(root):
        print("snapshot folder not found: %s" % root, file=sys.stderr)
        return 2
    try:
        out = compute(Snapshot(root=root))
    except SnapshotError as e:
        print("unreadable snapshot: %s" % e, file=sys.stderr)
        return 2
    json.dump(out, sys.stdout, indent=1, sort_keys=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
