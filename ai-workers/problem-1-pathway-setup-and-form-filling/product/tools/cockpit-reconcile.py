#!/usr/bin/env python3
"""Independent reconciliation of the founder's progress board (P-596, N-version check).

Written from `cockpit/spec-a61-a62-2026-11-14.md` (draft 3 plus §11 rulings R1-R7,
R1b, R3b, R5b)
and the raw record files only; it never reads `tools/cockpit-data.py` or the page
(spec §6 item 5). Python 3 standard library only. Reads only the frozen snapshot
folder (spec §6 1a).

Usage:
  cockpit-reconcile.py <snapshot dir>     prints one JSON object to stdout
  cockpit-reconcile.py --self-test        runs the in-memory self-test

Output (key names are the contract, §11 R7):
  {"version":1,
   "numbers":{<name>:{"value":...,"reason":...[,"detail":...]}},
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
* Title match (§11 R1, amends N2): row id X matches a PR when X appears in the
  title as a whole token: not preceded by a letter, digit or "-", and not
  followed by a letter or digit ("PF-4" never matches "PF-4t"; "BK-1" never
  "BK-18"). Anywhere in the title, not only at its start.
* Records PR (§11 R1): title contains "(records only)" or a label named
  "records". Records PRs never count, anywhere in this script.
* Counted PR = not a records PR. App PR = counted PR with files_app true (the
  app-code rule of tools/app-code-prs.sh, applied when the snapshot was taken).
* Merge date of id X for changes, built and scope (N2, R1, R1b) = IST day of
  the earliest merged_at among merged non-records app-code PRs matching X.
* Merged for ready rows (R1b) = any merged non-records PR matching X (app code
  or not). A title that only mentions an id still matches (R1b, accepted).
* Build rows: the table rows of MVP-CHECKLIST.md section "## A." (up to "## B.")
  whose first cell is a map number (P-586 baseline: 101).
* Parts of a Build row (§1 B1): ids parsed from its "BACKLOG rows" cell:
  tokens shaped like PF-4, FO-12b, BK-17, B5-filings, PF-L, AUD-1, DB-SPLIT;
  decision ids P-n and bug ids QA-n are dropped; "BK-22 to BK-24" expands to
  BK-22, BK-23, BK-24. qa capability ids such as C6.2 are not BACKLOG ids.
* BACKLOG ids: lines of BACKLOG.md starting with "|" whose first cell is an id,
  header or not (BACKLOG continues tables after bullet lines); first occurrence
  wins on duplicates.
* Cited id not in BACKLOG (§11 R4): in a row whose Status is not "Shaped" it
  is an unshaped part (the row is not built; it is not a BACKLOG row for C1);
  in a row whose Status starts with "Shaped" it is an invariant failure,
  listed in remaining_scope_changes.detail.invariant_failures (and still
  never counted as a BACKLOG row, and the row is not built).
* Shaped Build row (C1 and built): Status does not start with "Not shaped".

Numbers and formulas
--------------------
works_on_main (spec §6 4 and 5; §6 10 "93/98"): count of capability rows (id
  C<n>.<n>) in files_main/qa/CAPABILITIES.md whose M column is M2, M3, M4 or T
  and whose Status starts with "Works". Bake (BK-) verdict rows are not counted.
works_total: count of those capability rows with M in {M2, M3, M4, T}.
changes_per_day_window (§1 Pace line Y, N2, M2, principle 4, §11 R5, R5b):
  R8: history_days = today - 13 Nov + 1 (13 Nov is day 1); the window is the
  IST days from max(13 Nov, today - 13) to today (at most 14, never before
  13 Nov); the same days feed the Monte Carlo.
  Release 1 changes = distinct ids cited in the Build rows' "BACKLOG rows"
  cells; BK- rows exactly those cited there (today BK-10, BK-14, BK-16, BK-17,
  BK-22, BK-23, BK-24), no others. Each change counts on its merge
  date. Window w = the R8 days above (no longer min(14, days_since)) IST
  days ending today; Y = changes merged in the window / w, rounded to 2
  decimals. Under 5 days of history -> null ("a rate needs at least 5 days").
remaining_scope_changes (§1 C1, R4): distinct unmerged BACKLOG ids among the
  parts of shaped Build rows + sum over not-shaped Build rows of
  max(0, 3 - merged parts of that row).
built_rows (§1 B1, R4): shaped Build rows with at least one part, every part a
  BACKLOG id, and every part with a merge date (built date = latest of them).
proven_rows (§1 B1, §9): needs a machine-readable qa id column in the
  checklist's Build tables (a header cell containing "qa"); absent -> null. When
  present: a row is proven when its qa ids (C<n>.<n>) all read Works in some
  main commit of qa/CAPABILITIES.md (git/capabilities_main history, then
  files_main); proven date = the first such commit.
open_app_prs (§2 WIP): open app PRs (state "open", files_app true, not
  records; drafts included).
lanes_working (§2 L, P-326): branches in github/branches_recent.json with
  pushed_at within 90 minutes before taken_at, excluding main, lead/* and
  lead-b-* (R8) and merge-queue bot branches (mergify/*, gh-readonly-queue/*).
ready_rows (§2 Q, R2-3, §11 R3, R3b, R3c): a BACKLOG row is ready when
  (a) briefs.json lists its exact id, (b) it is not merged, (c) no open
  non-records PR matches it, (d) every dependency id is merged, (e) no "waits
  on" clause names a non-id dependency.
  Row text: every cell except the table's Done-when column (R3c), "**"
  removed, then cut into segments at "|" and "·";
  inside a segment, text from a labelled field ("decisions:", "Done when",
  "Source:", case-insensitive) up to the next labelled "Waits on:" field (colon
  required) or the segment end is dropped (R3b: never a dependency).
  Clauses (R3b): after each "waits on" (case-insensitive; "*", "_" and an
  optional ":" allowed) or whole word "after", up to the first ".", ";", "|",
  "·" or line end.
  Row id token: dashed id shape (PF-4, B5-filings, DB-SPLIT; P-n and QA-n are
  decisions and bugs, not rows) or a BACKLOG id that contains a digit (B129).
  "waits on" clause: every row id is a dependency (ids inside brackets or
  backticks included); leftover = clause minus backticked text, bracketed
  text (nested; a bracket the clause end left open runs to the end), row ids,
  "#<number>", punctuation and the filler words merged, and, or, both, the,
  its, first, PR, PRs, row, rows, nothing, none, nobody, no (R3b, R3c;
  case-insensitive), then "map" followed by numbers (R3d); a non-id dependency
  when a word of 3+ letters remains (the leftover is reported).
  "after" clause: counts only when a row id is among its first 3 tokens; then
  all its row ids are dependencies; its leftover never blocks.
  value = Q; detail = ready [{row, brief}]; not_ready_non_id = [{row, items}].
forecast_p50_date / forecast_p85_date (§1 Forecast, M2, R2-B1 (b), §11 R2):
  daily_counts = Release 1 changes per IST day for the 14 IST days ending today
  (oldest first; R8: only the window days, at most 14). Under 5 days of
  Release 1 history (history_days < 5, so first measured on 17 Nov) both are
  null: "not measured: fewer than 5 days of Release 1 history (from 18 Nov)"
  (no reference class, R2). Otherwise Monte Carlo: 10,000 runs, seed 59614
  (this script's own), each simulated day draws one of the 14 counts
  (random.choice) and subtracts it from remaining scope until it is <= 0; a run
  is capped at 365 days. Run length d -> date today + d. p50 / p85 = run
  lengths at sorted index ceil(0.50 N) - 1 and ceil(0.85 N) - 1. Zero guard:
  counts sum to 0 -> null "not measured: no merges in 14 days". A percentile
  run at the cap -> value "beyond 1 year". Remaining scope 0 -> today.

Ambiguities (most literal reading taken; listed in the report)
-------------------------------------------------------------
Settled by §11: A1 (title match, R1), A2 (BK- rows, R5), A7 (reference class
withdrawn, R2), A10 (ready rows, R1 + R3).
A3 Built for a row with no parsed BACKLOG part (e.g. map 74, 76, 84, 101 whose
   cells cite only qa ids or "built (map)"): no part, no built date -> not built.
A4 Shaped (for C1 and built) is read from the Status cell: anything not starting
   "Not shaped" (Shaped, In PR, Merged, qa Works). R4's "Shaped" vs "not
   Shaped" test uses Status starting with "Shaped".
A5 C1 "minus parts of those rows already merged (floor 0)": applied per
   not-shaped row; unmerged parts of shaped rows counted once across rows.
A6 (superseded by R8) Window and days: days_since = today - 13 Nov (so 5 days on 18 Nov,
   "~18 Nov"); the window and the 14 MC days end today, today included.
A8 Y under 5 days is null (principle 4) even though the window is defined.
A9 Lanes: bot merge-queue branches and main excluded; open PRs add nothing
   (pulls.json has no push time).
A11 Snapshot "files/<repo path>": the file is found by its path suffix.
A12 briefs.json format not given: accepts {"ROW": "path"}, {"ROW": ["path"]}
   or a list of {"row"|"id": ..., "path": ...}.
A13 Percentile: nearest-rank (index ceil(pN) - 1); forecast dates agree with
   the board only within ±1 day by design (§6 5).
Settled after §11: B1 (R1b), B2 (R3b), B4 (R5b); B3 and B5 accepted as built
(whole-word "after"; a title that only mentions an id matches).
C1-C3 settled by R3c; D1 and D2 kept as ruling R3d.
F1 R8 counts 13 Nov as day 1, so 5 days of history first exist on 17 Nov;
   R2's quoted reason says "(from 18 Nov)". The reason now reads
   "(from 17 Nov)", computed (reasons are not compared, only values).
F2 R8 parked PRs (no push for 7 days): the snapshot has push times only for
   branches pushed in the last 24 h, and this script computes no stage wait,
   so parked PRs change none of its numbers; open_app_prs still counts them.
F3 Y is rounded half-to-even at 2 decimals (Python round), e.g. 3/8 -> 0.38.
F4 R8 lanes: "lead/*" and "lead-b-*" are matched as name prefixes.
E1 A labelled field ends at the next labelled "Waits on:" (with its colon): the
   What cell of PF-4t reads "*Done when:* ... *Waits on:* PF-4 merged", one
   segment with no "·"; prose "waits on" without a colon inside "decisions:"
   stays dropped.
Earlier notes, now R3d:
D1 R3c says Done-when is never scanned "(only the row's own clauses in the What
   column)", but the platform and front-office rows keep "waits on" in the
   last column ("Source · waits on · decisions"). Read as: leave out only the
   Done-when column; every other column is scanned.
D2 Ids inside brackets or backticks still count as dependencies (R3b "every
   row id"); R3c drops that text only for the leftover check.
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
    return [c.strip() for c in s.strip("|").split("|")]


def clean(cell):
    return cell.replace("**", "").replace("`", "").strip()


def is_sep(cs):
    return all(re.fullmatch(r":?-{2,}:?", c.replace(" ", "")) for c in cs if c != "")


def tables(text):
    """Yield (section, header cells, [row cells]) for each markdown table with a header."""
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
    """§11 R1: whole token anywhere in the title."""
    pat = r"(?<![A-Za-z0-9\-])" + re.escape(rid) + r"(?![A-Za-z0-9])"
    return re.search(pat, title or "") is not None


def is_records_pr(p):
    if "(records only)" in (p.get("title") or ""):
        return True
    for lb in p.get("labels") or []:
        name = lb.get("name") if isinstance(lb, dict) else lb
        if name == "records":
            return True
    return False


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
    sect_text = []
    for ln in text.splitlines():
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
    """{id: row text} for every table line whose first cell is an id; first occurrence wins.
    The row text leaves out the Done-when column (§11 R3c): the column whose header (the last
    header seen, as BACKLOG continues tables after bullet lines) contains "done when"."""
    out = {}
    lines = text.splitlines()
    done_col = None
    for i, ln in enumerate(lines):
        rc = cells(ln)
        if not rc:
            continue
        nxt = cells(lines[i + 1]) if i + 1 < len(lines) else None
        if nxt is not None and is_sep(nxt) and not is_sep(rc):
            low = [clean(c).lower() for c in rc]
            done_col = next((k for k, h in enumerate(low) if "done when" in h), None)
            continue
        rid = clean(rc[0])
        if rid == "Row" or re.fullmatch(r"\d+", rid):
            continue
        if not re.fullmatch(r"[A-Z][A-Za-z0-9]*(?:[-.][A-Za-z0-9]+)*", rid):
            continue
        if rid not in out:
            kept = [c for k, c in enumerate(rc) if k != done_col]
            out[rid] = "|".join(kept)
    return out


FILLER = {"merged", "and", "or", "both", "the", "its", "first", "pr", "prs", "row", "rows",
          "nothing", "none", "nobody", "no"}  # R3b + R3c
LABEL_CUT_RE = re.compile(r"(?i)\bdecisions\s*:|\bdone when\b|\bsource\s*:")
WAITS_RE = re.compile(r"(?i)waits[\s*_]*on[\s*_]*:?[\s*_]*")
AFTER_RE = re.compile(r"(?i)(?<![A-Za-z0-9\-])after(?![A-Za-z0-9\-])[\s*_]*:?[\s*_]*")
TOKEN_RE = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?")


def is_row_id(tok, backlog_ids=()):
    if re.fullmatch(r"(P|QA)-\d+", tok):
        return False
    if re.fullmatch(r"[A-Z][A-Z0-9]*-[A-Za-z0-9]+", tok):
        return True
    return tok in backlog_ids and re.search(r"\d", tok) is not None


WAITS_LABEL_RE = re.compile(r"(?i)waits[\s*_]*on[\s*_]*:")


def drop_labelled_fields(seg):
    """R3b: text after a labelled field ("decisions:", "Done when", "Source:") is never a
    dependency. The field runs to the next labelled "Waits on:" field (with its colon, as in
    `*Done when:* ... *Waits on:* PF-4 merged`) or to the segment end."""
    out = ""
    while True:
        lab = LABEL_CUT_RE.search(seg)
        if not lab:
            return out + seg
        out += seg[:lab.start()]
        nxt = WAITS_LABEL_RE.search(seg, lab.end())
        if not nxt:
            return out
        seg = seg[nxt.start():]


def drop_map_numbers(words):
    """§11 R3d: "map" followed by numbers is filler (after the filler words are gone,
    so "map rows 48 and 49" -> "map 48 49" -> nothing)."""
    out, i = [], 0
    while i < len(words):
        if words[i].lower() == "map" and i + 1 < len(words) and words[i + 1].isdigit():
            i += 1
            while i < len(words) and words[i].isdigit():
                i += 1
            continue
        out.append(words[i])
        i += 1
    return out


def dependencies(row_text, backlog_ids=()):
    """§11 R3 + R3b: (dependency ids, non-id leftovers) from the row's waits-on and after clauses."""
    ids, non_id = [], []

    def add(tok):
        if tok not in ids:
            ids.append(tok)

    text = row_text.replace("**", "")
    for seg in re.split(r"[|·]", text):
        seg = drop_labelled_fields(seg)
        for kind, rx in (("waits", WAITS_RE), ("after", AFTER_RE)):
            for m in rx.finditer(seg):
                clause = re.split(r"[.;\n]", seg[m.end():], maxsplit=1)[0]
                toks = TOKEN_RE.findall(clause)
                rids = [t for t in toks if is_row_id(t, backlog_ids)]
                if kind == "after":
                    if any(is_row_id(t, backlog_ids) for t in toks[:3]):
                        for t in rids:
                            add(t)
                    continue
                for t in rids:
                    add(t)
                left = re.sub(r"`[^`]*`?", " ", clause)          # R3c: backticked text
                while True:                                        # R3c: bracketed text, nested
                    nxt = re.sub(r"\([^()]*\)", " ", left)
                    if nxt == left:
                        break
                    left = nxt
                left = re.sub(r"\(.*", " ", left).replace(")", " ")  # a bracket the clause end cut open
                left = re.sub(r"#\d+", " ", left)
                left = " ".join(t for t in TOKEN_RE.findall(left)
                                if not is_row_id(t, backlog_ids))
                left = re.sub(r"[^A-Za-z0-9]+", " ", left)
                words = [w for w in left.split() if w.lower() not in FILLER]
                words = drop_map_numbers(words)
                if any(re.fullmatch(r"[A-Za-z]{3,}", w) for w in words):
                    non_id.append(" ".join(words))
    return ids, non_id


def parse_capabilities(text):
    """{cap id: (M, status)} for capability rows C<n>.<n> of tables with M and Status columns."""
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
    """Returns (p50, p85, reason); values are ISO dates, "beyond 1 year" or None."""
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

    return pick(0.50), pick(0.85), "Monte Carlo %d runs, seed %d, cap %d days, Release 1 changes per IST day" % (
        runs, seed, cap)


# ---------------------------------------------------------------- main computation
def compute(snap):
    meta = snap.json("meta.json")
    if not isinstance(meta, dict) or not meta.get("taken_at"):
        raise SnapshotError("meta.json missing or has no taken_at")
    now = parse_ts(meta["taken_at"])
    today = ist_day(now)
    N = {}

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
    briefs_raw, _ = safe_json("briefs.json")

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

    # --- PR indexes (records PRs never count, R1)
    merged_app, merged_counted, open_counted = [], [], []
    if pulls is not None:
        for p in pulls:
            if is_records_pr(p):
                continue
            mt = parse_ts(p.get("merged_at"))
            if mt is not None and mt <= now:
                merged_counted.append((mt, p))
                if p.get("files_app") is True:
                    merged_app.append((mt, p))
            elif (p.get("state") or "").lower() == "open":
                open_counted.append(p)
        merged_app.sort(key=lambda x: (x[0], x[1].get("number", 0)))
        merged_counted.sort(key=lambda x: (x[0], x[1].get("number", 0)))

    def first_merge(rid, pool):
        for mt, p in pool:
            if title_matches(p.get("title"), rid):
                return ist_day(mt)
        return None

    # --- open app PRs
    if pulls is None:
        N["open_app_prs"] = num(None, "not measured: " + pulls_err)
    else:
        N["open_app_prs"] = num(sum(1 for p in open_counted if p.get("files_app") is True),
                                "pulls with state open and files_app true, records PRs excluded (drafts included; "
                                "R8 parked PRs are not split out: the snapshot has no push time older than 24 h)")

    # --- lanes working
    if not isinstance(branches, list):
        N["lanes_working"] = num(None, "not measured: " + (br_err or "branches_recent.json is not a list"))
    else:
        cut = now - dt.timedelta(minutes=LANE_MINUTES)
        names = sorted({b.get("name") for b in branches
                        if b.get("name") and b.get("name") != "main"
                        and not b["name"].startswith(("mergify/", "gh-readonly-queue/", "lead/", "lead-b-"))
                        and parse_ts(b.get("pushed_at")) is not None
                        and cut <= parse_ts(b["pushed_at"]) <= now})
        N["lanes_working"] = num(len(names), "branches (not main, lead/*, lead-b-*, merge-queue bots) pushed in "
                                 "the last %d min"
                                 % LANE_MINUTES, detail=names)

    # --- checklist-based numbers
    # R8: history and window never reach before 13 Nov; 13 Nov counts as day 1.
    history_days = max(0, (today - R1_START).days + 1)
    first = max(R1_START, today - dt.timedelta(days=WINDOW_DAYS - 1))
    window = [first + dt.timedelta(days=k) for k in range((today - first).days + 1)] if today >= R1_START else []
    rows, has_qa = (parse_checklist(ck_text) if ck_text is not None else ([], False))
    backlog = parse_backlog(bl_text) if bl_text is not None else None
    missing = [n for n, ok in (("MVP-CHECKLIST.md", ck_text is not None), ("BACKLOG.md", backlog is not None),
                               ("github/pulls.json", pulls is not None)) if not ok]

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
        invariant_failures = [{"map": r["map"], "id": x} for r in rows if r["status"].startswith("Shaped")
                              for x in r["parts"] if x not in backlog]

        built = []
        for r in shaped:
            if r["parts"] and all(x in backlog and md(x) for x in r["parts"]):
                built.append((r["map"], max(md(x) for x in r["parts"]).isoformat()))
        N["built_rows"] = num(len(built), "shaped Build rows whose every part is a BACKLOG row merged by an app PR "
                              "(%d Build rows)" % len(rows), detail=[{"map": m, "built": d} for m, d in built])

        unmerged_shaped = sorted({x for r in shaped for x in r["parts"] if x in backlog and md(x) is None})
        unshaped_sum = sum(max(0, UNSHAPED_FACTOR - sum(1 for x in r["parts"] if md(x))) for r in unshaped)
        remaining = len(unmerged_shaped) + unshaped_sum
        N["remaining_scope_changes"] = num(
            remaining, "%d unmerged BACKLOG parts of %d shaped rows + estimate: %d unshaped capabilities x 3 less "
            "merged parts (%d)" % (len(unmerged_shaped), len(shaped), len(unshaped), unshaped_sum),
            detail={"invariant_failures": invariant_failures})

        r1_ids = {x for r in rows for x in r["parts"]}
        per_day = {}
        for rid in r1_ids:
            d = md(rid)
            if d is not None:
                per_day[d] = per_day.get(d, 0) + 1
        r1_counts = [per_day.get(d, 0) for d in window]
        w = len(window)
        in_window = sum(r1_counts)
        wdetail = {"days": [d.isoformat() for d in window], "counts": r1_counts}
        if history_days < MIN_HISTORY_DAYS or w == 0:
            N["changes_per_day_window"] = num(
                None, "not measured: %d day(s) of Release 1 history, a rate needs 5 (%d changes merged in the window)"
                % (history_days, in_window), detail=wdetail)
        else:
            N["changes_per_day_window"] = num(round(in_window / w, 2), "%d Release 1 changes merged in the %d IST "
                                              "days from %s / %d" % (in_window, w, window[0].isoformat(), w),
                                              detail=wdetail)

    # --- proven
    if ck_text is None:
        N["proven_rows"] = num(None, "not measured: MVP-CHECKLIST.md missing from the snapshot")
    elif not has_qa:
        N["proven_rows"] = num(None, "not measured: the checklist has no machine-readable qa id column yet "
                                     "(spec §1 B1, §9)")
    else:
        history = []
        for ln in (snap.text("git/capabilities_main.jsonl") or "").splitlines():
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
        N["proven_rows"] = num(len(proven), "Build rows whose qa ids all read Works in a main commit of "
                                            "qa/CAPABILITIES.md", detail=proven)

    # --- ready rows (R3)
    if backlog is None or pulls is None or briefs_raw is None:
        why = [m for m, ok in (("BACKLOG.md", backlog is not None), ("github/pulls.json", pulls is not None),
                               ("briefs.json", briefs_raw is not None)) if not ok]
        N["ready_rows"] = num(None, "not measured: %s missing or unreadable" % ", ".join(why))
    else:
        briefs = load_briefs(briefs_raw)

        def merged(rid):
            return first_merge(rid, merged_counted) is not None

        ready, blocked_non_id = [], []
        for rid in sorted(briefs):
            if rid not in backlog or merged(rid):
                continue
            if any(title_matches(p.get("title"), rid) for p in open_counted):
                continue
            dep_ids, non_id = dependencies(backlog[rid], backlog)
            if non_id:
                blocked_non_id.append({"row": rid, "items": non_id})
                continue
            if all(merged(x) for x in dep_ids):
                ready.append({"row": rid, "brief": briefs[rid]})
        N["ready_rows"] = num(len(ready), "BACKLOG rows with a brief, not merged, no open PR, every dependency id "
                                          "merged, no non-id dependency (§11 R3, R3b)",
                              detail=ready, not_ready_non_id=blocked_non_id)

    # --- forecast (R2: no reference class)
    if history_days < MIN_HISTORY_DAYS:
        why = "not measured: fewer than 5 days of Release 1 history (from %s)" % (
            (R1_START + dt.timedelta(days=MIN_HISTORY_DAYS - 1)).strftime("%d %b").lstrip("0"))
        p50 = p85 = None
    else:
        p50, p85, why = monte_carlo(r1_counts, remaining, today)
    N["forecast_p50_date"] = num(p50, why)
    N["forecast_p85_date"] = num(p85, why)

    order = ["works_on_main", "works_total", "changes_per_day_window", "remaining_scope_changes", "built_rows",
             "proven_rows", "open_app_prs", "lanes_working", "ready_rows", "forecast_p50_date", "forecast_p85_date"]
    return {"version": 1,
            "numbers": {k: N[k] for k in order},
            "mc_inputs": {"daily_counts": r1_counts, "remaining_scope": remaining}}


# ---------------------------------------------------------------- self-test
def _fixture(taken_at, checklist=None, extra=None):
    ck = checklist or (
        "# MVP checklist\n\n## A. Scope to build\n\n### A. Foundations\n"
        "| Map | Capability | Module | BACKLOG rows | Status |\n|---|---|---|---|---|\n"
        "| 1 | One | Platform | PF-1, PF-2 | Merged |\n"
        "| 2 | Two | Platform | PF-3 (In PR #10) | Shaped |\n"
        "| 3 | Three | Platform | PF-4 named only (P-561); PF-8 named only | Not shaped |\n"
        "| 4 | Four | Case side | C6.2 Works; BK-1 to BK-2 | Merged |\n"
        "| 5 | Five | Not named | **none yet** | Not shaped (**gap**) |\n"
        "| 6 | Six | Platform | PF-9, PF-6 | Shaped |\n\n"
        "## B. Done for one row\n| Map | x | y | BACKLOG rows | Status |\n|---|---|---|---|---|\n"
        "| 9 | Not a Build row | z | PF-7 | Shaped |\n")
    bl = ("# Backlog\n\n| Row | Area | What | Done when | Decisions |\n|---|---|---|---|---|\n"
          "| BK-1 | forms | a | b | c |\n| BK-2 | forms | a | b | c |\n| BK-3 | forms | a | b | c |\n"
          "| BK-18 | forms | a | b | c |\n\n"
          "| # | Area | Item | Done when | Source · waits on · decisions |\n|---|---|---|---|---|\n"
          "| PF-1 | screens | a | b | **waits on:** nothing · decisions: none |\n"
          "| PF-2 | records | a | b | x |\n"
          "| PF-3 | schema | a | b | **waits on:** PF-1 · decisions: none |\n"
          "| PF-4 | api | a | b | **waits on:** nothing |\n"
          "| PF-4t | api | a | b | x |\n"
          "| PF-5 | api | a | b | **waits on:** PF-3 · decisions: none |\n"
          "| PF-6 | api | a | b | **waits on:** PF-3, PF-1 · decisions: none |\n"
          "* a bullet line between rows\n"
          "| PF-7 | api | a | b | _Waits on_: PF-2 (P-500) · decisions: PF-3 later |\n"
          "| PF-10 | api | a | b | **WAITS ON** PF-2 merged · decisions: none · **size:** 1 PR |\n"
          "| PF-11 | api | a | b | waits on contract v0.1 and PF-1 |\n"
          "| PF-12 | api | a | b | **waits on:** PF-1 (its schema baton) · x |\n"
          "| PF-13 | api | a | b | **waits on:** PF-4t and #1741 (first PR) |\n"
          "| PF-14 | api | a | b | after-merge check; waits on BK-18 |\n"
          "| PF-15 | api | a | waits on the founder's sign-off | no clause here |\n"
          "| PF-16 | api | a | b | Built after the Bake and PF-3 lands |\n"
          "| PF-17 | api | a | b | Built after the PF-3 schema |\n"
          "| PF-18 | api | a | b | **waits on:** PF-2 · decisions: the deploy waits on the founder's account |\n"
          "| PF-19 | api | a | b | **waits on:** PF-2 and `FilesPort` port |\n"
          "| PF-20 | api | a | b | **waits on:** none (see `PF-9` notes) |\n"
          "| PF-1 | dup | a | b | **waits on:** PF-9 |\n")
    cap = ("# Capabilities\n\n| # | Step | Capability | M | Status | Tested on | Evidence |\n"
           "|---|---|---|---|---|---|---|\n"
           "| C1.1 | 1 | a | M2 | Works | x | y |\n| C1.2 | 1 | a | M2 | Partial | x | y |\n"
           "| C2.1 | 2 | a | M3 | Works | x | y |\n| C3.1 | 3 | a | M4 | Not built | x | y |\n"
           "| C4.1 | 4 | a | T | Works | x | y |\n| C5.1 | 5 | a | Parked | Works | x | y |\n\n"
           "| Row | Bake | What | Status | Tested on | Evidence |\n|---|---|---|---|---|---|\n"
           "| BK-13 | b | w | Works | x | y |\n")

    def pr(n, title, state, merged=None, app=True, draft=False, ref="b", labels=()):
        return {"number": n, "title": title, "state": state, "draft": draft, "created_at": "2026-11-01T00:00:00Z",
                "merged_at": merged, "closed_at": merged, "labels": [{"name": x} for x in labels],
                "head": {"ref": ref, "sha": "x"}, "base": {"ref": "main"}, "files_app": app}

    pulls = [
        pr(1, "screens: PF-1 — x", "closed", "2026-11-14T10:00:00Z"),
        pr(2, "runtime: PF-2 — y", "closed", "2026-11-19T20:00:00Z"),
        pr(3, "PF-2 — again", "closed", "2026-11-19T21:00:00Z"),
        pr(4, "runtime: PF-3 — z", "open", ref="b-pf3"),
        pr(5, "lead: records", "closed", "2026-11-18T05:00:00Z", app=False),
        pr(6, "forms: BK-1 step 1", "closed", "2026-11-10T05:00:00Z"),
        pr(7, "forms: BK-2 — a", "closed", "2026-11-16T04:00:00Z"),
        pr(8, "forms: BK-3 — b", "closed", "2026-11-16T19:00:00Z"),
        pr(9, "runtime: PF-4t — c", "closed", "2026-11-17T04:00:00Z"),
        pr(10, "runtime: PF-5 — draft", "open", draft=True),
        pr(11, "runtime: PF-3 — old attempt", "closed", None),
        pr(12, "qa: after-merge — BK-18 Works", "closed", "2026-11-18T04:00:00Z", app=False),
        pr(13, "lead: PF-14 notes (records only)", "open", app=False),
        pr(14, "runtime: PF-6 — x", "closed", "2026-11-15T04:00:00Z", labels=("records",)),
        pr(15, "qa: BK-2 notes", "closed", "2026-11-12T04:00:00Z", app=False),
    ]
    branches = [{"name": "b-pf3", "sha": "1", "pushed_at": "2026-11-20T06:00:00Z"},
                {"name": "b-old", "sha": "2", "pushed_at": "2026-11-20T04:00:00Z"},
                {"name": "main", "sha": "3", "pushed_at": "2026-11-20T06:20:00Z"},
                {"name": "mergify/merge-queue/x", "sha": "4", "pushed_at": "2026-11-20T06:25:00Z"},
                {"name": "b-lead", "sha": "5", "pushed_at": "2026-11-20T05:01:00Z"},
                {"name": "lead/2026-11-07-lead31", "sha": "6", "pushed_at": "2026-11-20T06:10:00Z"},
                {"name": "lead-b-front-office", "sha": "7", "pushed_at": "2026-11-20T06:11:00Z"}]
    briefs = {r: "design/briefs/%s.md" % r for r in
              ("PF-1", "PF-3", "PF-4", "PF-5", "PF-6", "PF-7", "PF-10", "PF-11", "PF-12", "PF-13", "PF-14", "PF-15",
               "PF-16", "PF-17", "PF-18", "PF-19", "PF-20", "ZZ-1")}
    briefs["PF-4"] = "lead-b-briefs/PF-4-a.md"
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
    eq("R7 keys", list(n) + list(out["mc_inputs"]),
       ["works_on_main", "works_total", "changes_per_day_window", "remaining_scope_changes", "built_rows",
        "proven_rows", "open_app_prs", "lanes_working", "ready_rows", "forecast_p50_date", "forecast_p85_date",
        "daily_counts", "remaining_scope"])
    eq("works_on_main", v["works_on_main"], 3)            # C1.1, C2.1, C4.1 (C5.1 Parked, BK-13 not a C row)
    eq("works_total", v["works_total"], 5)                # C1.1 C1.2 C2.1 C3.1 C4.1
    # R1/R5: changes = cited ids PF-1 PF-2 PF-3 PF-4 PF-8 BK-1 BK-2 PF-9 PF-6. First app non-records merges (IST):
    # BK-1 10 Nov, PF-1 14 Nov, BK-2 16 Nov, PF-2 20 Nov (01:30 IST). PF-4t is not PF-4 (R1); PF-6 only by a
    # records-labelled PR (R1); BK-3 merged 17 Nov but not cited (R5).
    # R8: window 13-20 Nov (8 days; BK-1's 10 Nov merge is before 13 Nov and left out). R1b: #15 (non-app,
    # 12 Nov) does not move BK-2's date from 16 Nov. R5b: only cited BK ids count (BK-3 on 17 Nov is not).
    eq("daily_counts", out["mc_inputs"]["daily_counts"], [0, 1, 0, 1, 0, 0, 0, 1])
    eq("window days", n["changes_per_day_window"]["detail"]["days"][0], "2026-11-13")
    eq("changes_per_day_window", v["changes_per_day_window"], 0.38)  # 3 / 8 = 0.375 -> 0.38
    eq("built_rows", v["built_rows"], 2)                  # map 1 and map 4; map 6 has PF-9 not in BACKLOG (R4)
    # C1: shaped rows' unmerged BACKLOG parts PF-3, PF-6 (2) + map 3 (3 - 0) + map 5 (3) = 8; PF-9 left out (R4).
    eq("remaining_scope_changes", v["remaining_scope_changes"], 8)
    eq("R4 invariant failures", n["remaining_scope_changes"]["detail"]["invariant_failures"],
       [{"map": "6", "id": "PF-9"}])                     # PF-8 in a Not shaped row is an unshaped part, no failure
    eq("proven_rows", v["proven_rows"], None)             # no qa id column
    eq("open_app_prs", v["open_app_prs"], 2)              # #4 and draft #10; #13 records only
    eq("lanes_working", v["lanes_working"], 2)            # b-pf3 (30 min), b-lead (89 min); lead/*, lead-b-* out (R8)
    eq("lanes detail", n["lanes_working"]["detail"], ["b-lead", "b-pf3"])
    # R3/R3b/R3c ready: PF-4 ("nothing" is filler, R3c), PF-7 (clause ends at "·": PF-2 merged, "P-500" leaves
    # no word, "decisions: PF-3" is past the cut), PF-10 ("merged" is filler), PF-12 (bracketed "its schema
    # baton" dropped, R3c; PF-1 merged), PF-13 (PF-4t merged; "and", "#1741", "first PR" dropped), PF-14 (BK-18
    # merged by a mid-title non-app PR, R1b; records-only open PR #13 ignored; "after-merge" is not "after"),
    # PF-15 (its Done-when cell's "waits on the founder" is never scanned, R3c), PF-16 ("after the Bake and":
    # no row id in 3 tokens), PF-18 (nested "waits on" after "decisions:").
    # Not ready: PF-1 merged, PF-3 open PR, PF-5 open draft, PF-6 and PF-17 wait on PF-3, PF-20 waits on PF-9
    # (an id in brackets and backticks still counts, D2), PF-11 "contract v0", PF-19 "port" (backticked
    # `FilesPort` dropped, "port" stays), ZZ-1 not in BACKLOG.
    eq("ready_rows", v["ready_rows"], 9)
    eq("ready detail", [r["row"] for r in n["ready_rows"]["detail"]],
       ["PF-10", "PF-12", "PF-13", "PF-14", "PF-15", "PF-16", "PF-18", "PF-4", "PF-7"])
    eq("ready brief", n["ready_rows"]["detail"][7]["brief"], "lead-b-briefs/PF-4-a.md")
    eq("R3c non-id", n["ready_rows"]["not_ready_non_id"],
       [{"row": "PF-11", "items": ["contract v0"]}, {"row": "PF-19", "items": ["port"]}])
    eq("mc remaining", out["mc_inputs"]["remaining_scope"], 8)
    p50, p85 = v["forecast_p50_date"], v["forecast_p85_date"]
    if not (isinstance(p50, str) and isinstance(p85, str) and "2026-11-20" < p50 <= p85):
        fails.append("forecast ordering: %r %r" % (p50, p85))
    eq("forecast repeatable", compute(Snapshot(mem=_fixture("2026-11-20T12:00:00+05:30")))["numbers"]
       ["forecast_p50_date"]["value"], p50)

    # Case 2 (R2): 15 Nov 12:00 IST, 2 days of history -> no rate, no forecast, no reference class.
    out2 = compute(Snapshot(mem=_fixture("2026-11-15T12:00:00+05:30")))
    n2 = out2["numbers"]
    eq("R8 counts 15 Nov", out2["mc_inputs"]["daily_counts"], [0, 1, 0])     # 13, 14, 15 Nov
    eq("R2 p50", n2["forecast_p50_date"], {"value": None, "reason":
       "not measured: fewer than 5 days of Release 1 history (from 17 Nov)"})
    eq("R2 p85", n2["forecast_p85_date"]["value"], None)
    eq("Y under 5 days", n2["changes_per_day_window"]["value"], None)
    eq("remaining on 15 Nov", out2["mc_inputs"]["remaining_scope"], 10)  # PF-2 PF-3 BK-2 PF-6 + 3 + 3

    # Case 2b (R8): 17 Nov is day 5 -> rate and forecast measured; 12 Nov is before the start -> no days.
    out2b = compute(Snapshot(mem=_fixture("2026-11-17T12:00:00+05:30")))
    eq("R8 counts 17 Nov", out2b["mc_inputs"]["daily_counts"], [0, 1, 0, 1, 0])
    eq("R8 Y 17 Nov", out2b["numbers"]["changes_per_day_window"]["value"], 0.4)  # 2 / 5
    if not isinstance(out2b["numbers"]["forecast_p50_date"]["value"], str):
        fails.append("R8 17 Nov forecast not measured")
    out2c = compute(Snapshot(mem=_fixture("2026-11-12T12:00:00+05:30")))
    eq("R8 before start", (out2c["mc_inputs"]["daily_counts"], out2c["numbers"]["forecast_p50_date"]["value"]),
       ([], None))

    # Case 3: Monte Carlo by hand.
    today = dt.date(2026, 11, 20)
    eq("mc constant", monte_carlo([2] * 14, 7, today)[:2], ("2026-11-24", "2026-11-24"))  # 2/day, 7 -> 4 days
    eq("mc zero guard", monte_carlo([0] * 14, 7, today), (None, None, "not measured: no merges in 14 days"))
    eq("mc cap", monte_carlo([0] * 13 + [1], 10000, today)[:2], ("beyond 1 year", "beyond 1 year"))
    eq("mc done", monte_carlo([1] * 14, 0, today)[:2], ("2026-11-20", "2026-11-20"))

    # Case 4 (R1 unit): whole-token title match.
    eq("R1 PF-4 vs PF-4t", title_matches("runtime: PF-4t — c", "PF-4"), False)
    eq("R1 BK-1 vs BK-18", title_matches("qa: BK-18 Works", "BK-1"), False)
    eq("R1 mid-title", title_matches("forms: BK-13 — waits on BK-22 and BK-23", "BK-22"), True)
    eq("R1 dash before", title_matches("x XPF-4 y", "PF-4"), False)
    eq("R1 records title", is_records_pr({"title": "lead: PF-1 (records only)", "labels": []}), True)

    # Case 5 (R3b unit): clause parsing.
    eq("R3c deps", dependencies("**waits on:** PF-5, PF-4b, PF-6 (frame), PF-1 · decisions: none open"),
       (["PF-5", "PF-4b", "PF-6", "PF-1"], []))
    eq("R3c nothing", dependencies("**waits on:** nothing"), ([], []))
    eq("R3c nobody/no", dependencies("waits on nobody, no PR"), ([], []))
    eq("R3c nested + backticks", dependencies("waits on PF-8 (P-558 (5)) and `FilesPort`"), (["PF-8"], []))
    eq("R3c open bracket", dependencies("waits on PF-2 (see v0.1 notes)"), (["PF-2"], []))
    eq("PF-4t literal", dependencies("*Waits on:* PF-4 merged"), (["PF-4"], []))
    eq("PF-4t after Done when", dependencies("a. *Done when:* the job passes. *Waits on:* PF-4 merged. *Size:* S."),
       (["PF-4"], []))
    eq("R3d map numbers", dependencies("waits on:** map rows 48 and 49 (the case side's gate), FO-2"),
       (["FO-2"], []))
    eq("R3d map then words", dependencies("waits on map 62 and the client portal")[1], ["client portal"])
    eq("R3c still blocks", dependencies("waits on PF-8 and the founder's cloud account"),
       (["PF-8"], ["founder s cloud account"]))
    bl = parse_backlog("| # | Item | Done when | Source |\n|---|---|---|---|\n| PF-1 | a | waits on X-9 | y |\n"
                       "* bullet\n| PF-2 | waits on PF-1 | waits on X-9 | z |\n")
    eq("R3c Done-when column dropped", (dependencies(bl["PF-1"]), dependencies(bl["PF-2"])),
       (([], []), (["PF-1"], [])))
    eq("R3b cut at dot", dependencies("waits on PF-2. Then the cloud account"), (["PF-2"], []))
    eq("R3b label", dependencies("x · Done when: waits on the founder; after PF-9"), ([], []))
    eq("R3b after 3 tokens", dependencies("only after a long wait for PF-9 ends"), ([], []))
    eq("R3b after id", dependencies("after the B129 merge (Lead 30)", {"B129": "x"}), (["B129"], []))

    # Case 6: qa id column -> proven from main history.
    ck = ("## A. Scope\n| Map | Capability | Module | BACKLOG rows | qa id | Status |\n|---|---|---|---|---|---|\n"
          "| 1 | One | P | PF-1 | C1.2 | Merged |\n| 2 | Two | P | PF-3 | C1.1 | Shaped |\n"
          "| 3 | Three | P | PF-2 | | Merged |\n## B. x\n")
    hist = {"git/capabilities_main.jsonl": json.dumps({"sha": "aaa", "date": "2026-11-15T03:00:00Z"}) + "\n",
            "git/capabilities_main/aaa.md": "| # | M | Status |\n|---|---|---|\n| C1.1 | M2 | Works |\n"
                                            "| C1.2 | M2 | Works |\n"}
    out6 = compute(Snapshot(mem=_fixture("2026-11-20T12:00:00+05:30", checklist=ck, extra=hist)))
    eq("proven_rows", out6["numbers"]["proven_rows"]["value"], 2)  # both Works on 15 Nov (C1.2 Partial later)
    eq("proven dates", [d["proven"] for d in out6["numbers"]["proven_rows"]["detail"]], ["2026-11-15", "2026-11-15"])

    # Case 7: unreadable snapshot.
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
